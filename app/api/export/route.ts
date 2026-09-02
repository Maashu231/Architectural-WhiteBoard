import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { checkRateLimit, getClientIP } from '../../lib/rateLimiter';
import { getAIModel, hasAIProvider } from '../../lib/ai';

export async function POST(req: Request) {
  // Rate limiting using Redis
  const clientIP = getClientIP(req);
  const rateLimitResult = await checkRateLimit(clientIP, 'export');

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.', retryAfter: rateLimitResult.resetIn },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.resetIn) } }
    );
  }

  try {
    const { nodes, edges, format } = await req.json();

    // Validate request body
    if (!nodes || !Array.isArray(nodes) || !edges || !Array.isArray(edges) || !format) {
      return NextResponse.json(
        { error: 'Invalid request: nodes, edges, and format are required' },
        { status: 400 }
      );
    }

    // Validate format
    if (!['terraform', 'docker', 'mermaid'].includes(format)) {
      return NextResponse.json(
        { error: 'Unsupported export format' },
        { status: 400 }
      );
    }

    // Ensure the key exists
    if (!hasAIProvider()) {
      return NextResponse.json(
        { error: 'AI service is not configured' },
        { status: 503 }
      );
    }

    const architectureSummary = nodes.map((n: any) => `- ${n.data?.label || 'Unknown'} (${n.type || 'unknown'})`).join('\n');
    const connectionsSummary = edges.map((e: any) => {
      const source = nodes.find((n: any) => n.id === e.source)?.data?.label || e.source;
      const target = nodes.find((n: any) => n.id === e.target)?.data?.label || e.target;
      return `- ${source} -> [${e.data?.protocol || 'HTTP'}] -> ${target}`;
    }).join('\n');

    let instructions = '';
    let ext = '';

    if (format === 'terraform') {
      instructions = 'Generate production-ready Terraform code (HCL) for this architecture. Do NOT use markdown code block backticks in your final output, just raw code. Include proper resource definitions, variables, and best practices.';
      ext = '.tf';
    } else if (format === 'docker') {
      instructions = 'Generate a production-ready docker-compose.yml file for this architecture. Do NOT use markdown code block backticks in your final output, just raw code. Include proper service definitions, networks, and volumes.';
      ext = '.yml';
    } else if (format === 'mermaid') {
      instructions = 'Generate a Mermaid.js flowchart (graph TD) for this architecture. Do NOT use markdown code block backticks in your final output, just raw code.';
      ext = '.mmd';
    }

    const prompt = `
    You are an expert DevOps engineer and Infrastructure Architect.
    Translate the following cloud architecture into code.

    Nodes:
    ${architectureSummary}

    Connections:
    ${connectionsSummary}

    Instructions:
    ${instructions}

    Important: Reply ONLY with the raw code. Do NOT wrap it in \`\`\` codeblocks.
    `;

    const { text } = await generateText({
      model: getAIModel(),
      prompt,
      abortSignal: AbortSignal.timeout(30000), // 30 s timeout — matches analyze/generate routes
    });

    let cleanedText = text.trim();
    if (cleanedText.startsWith('```')) {
      // attempt to clean up if the model ignored instructions
      cleanedText = cleanedText.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    }

    return NextResponse.json({ output: cleanedText, format: ext }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(rateLimitResult.resetIn),
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      JSON.stringify({ level: 'error', msg: 'Export error', error: message, ts: new Date().toISOString() }) + '\n'
    );
    if (/quota|rate limit|too many requests/i.test(message)) {
      return NextResponse.json(
        { error: 'AI provider quota exceeded. Please try again later or configure a provider with available quota.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    return NextResponse.json(
      { error: `An error occurred while exporting the architecture: ${message}` },
      { status: 500 }
    );
  }
}
