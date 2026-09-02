import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { z } from 'zod';
import { checkRateLimit, getClientIP } from '../../lib/rateLimiter';
import { getAIModel, hasAIProvider } from '../../lib/ai';
import { createClient } from '../../lib/supabase/server';
import { MAX_NODES, MAX_EDGES } from '../../lib/schemas';

// ── Request body schema ───────────────────────────────────────────────────────
// We only need id, type, data.label, and source/target for the prompt — we don't
// re-persist the diagram, so a loose schema is acceptable here.
const nodeShape = z.object({
  id: z.string().max(100),
  type: z.string().max(50).optional(),
  data: z
    .object({
      label: z.string().max(200).optional(),
    })
    .passthrough()
    .optional(),
});

const edgeShape = z.object({
  id: z.string().max(100),
  source: z.string().max(100),
  target: z.string().max(100),
  data: z
    .object({
      protocol: z.string().max(50).optional(),
    })
    .passthrough()
    .optional(),
});

const requestSchema = z.object({
  nodes: z.array(nodeShape).max(MAX_NODES, `Cannot analyze more than ${MAX_NODES} nodes`),
  edges: z.array(edgeShape).max(MAX_EDGES, `Cannot analyze more than ${MAX_EDGES} edges`),
});

export async function POST(req: Request) {
  // ── Rate limiting ──
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id || 'anon';

  const clientIP = getClientIP(req);
  const rateLimitResult = await checkRateLimit(clientIP, `analyze:${userId}`, false);

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

    // Validate shape and enforce size limits in one step.
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      const message = parseResult.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { nodes, edges } = parseResult.data;

    // Ensure the key exists
    if (!hasAIProvider()) {
      return NextResponse.json(
        { error: 'AI service is not configured' },
        { status: 503 }
      );
    }

    const architectureSummary = nodes
      .map((n) => `- ${n.data?.label || 'Unknown'} (${n.type || 'unknown'})`)
      .join('\n');

    const connectionsSummary = edges
      .map((e) => {
        const source = nodes.find((n) => n.id === e.source)?.data?.label || e.source;
        const target = nodes.find((n) => n.id === e.target)?.data?.label || e.target;
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
      abortSignal: AbortSignal.timeout(30000), // 30 s timeout
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