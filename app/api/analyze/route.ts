import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { z } from 'zod';
import { checkRateLimit, getClientIP } from '../../lib/rateLimiter';
import { getAIModel, hasAIProvider } from '../../lib/ai';
import { sanitizePromptInput } from '../../lib/sanitizer';

// Input validation schemas
const nodeSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  data: z.object({
    label: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

const edgeSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  target: z.string(),
  data: z.object({
    protocol: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

const requestSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export async function POST(req: Request) {
  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimitResult = await checkRateLimit(clientIP, 'analyze');

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.', retryAfter: rateLimitResult.resetIn },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.resetIn) } }
    );
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    // Validate shape and enforce structure
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      const message = parseResult.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { nodes, edges } = parseResult.data;

    // Ensure AI service is configured
    if (!hasAIProvider()) {
      return NextResponse.json(
        { error: 'AI service is not configured' },
        { status: 503 }
      );
    }

    // Sanitize node labels to prevent prompt injection
    const sanitizedNodes = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        label: sanitizePromptInput(node.data?.label ?? ''),
      },
    }));

    const architectureSummary = sanitizedNodes
      .map((n) => `- ${n.data.label || 'Unknown'} (${n.type || 'unknown'})`)
      .join('\n');

    const connectionsSummary = edges
      .map((e) => {
        const source = sanitizedNodes.find((n) => n.id === e.source)?.data?.label || e.source;
        const target = sanitizedNodes.find((n) => n.id === e.target)?.data?.label || e.target;
        return `- ${source} -> [${e.data?.protocol || 'HTTP'}] -> ${target}`;
      })
      .join('\n');

    const prompt = `
    You are an expert Cloud Software Architect. Please audit the following cloud architecture diagram.

    Nodes:
    ${architectureSummary}

    Connections:
    ${connectionsSummary}

    Please provide a concise, professional audit report covering:
    1. Single Points of Failure (SPOFs)
    2. Security Vulnerabilities
    3. Performance Bottlenecks
    4. Cost Optimization suggestions

    Format the report with clear headings and bullet points. Be specific to the components provided.
    `;

    const { text } = await generateText({
      model: getAIModel(),
      prompt,
      abortSignal: AbortSignal.timeout(30000), // 30s timeout
    });

    return NextResponse.json(
      {
        suggestions: text,
        details: {}, // kept for backward compatibility with the frontend
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.resetIn),
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      JSON.stringify({ level: 'error', msg: 'Analyze error', error: message, ts: new Date().toISOString() }) + '\n'
    );
    if (/quota|rate limit|too many requests/i.test(message)) {
      return NextResponse.json(
        {
          error:
            'AI provider quota exceeded. Please try again later or configure a provider with available quota.',
        },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    return NextResponse.json(
      { error: `An error occurred while analyzing the architecture: ${message}` },
      { status: 500 }
    );
  }
}