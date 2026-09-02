import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { checkRateLimit, getClientIP } from '../../lib/rateLimiter';
import { getAIModel, hasAIProvider } from '../../lib/ai';
import { createClient } from '../../lib/supabase/server';

const nodeSchema = z.object({
  id: z.string().describe('A unique identifier for this node, e.g., "api-gateway-1"'),
  type: z.enum([
    'client-web', 'client-mobile', 'cdn', 'dns',
    'api-gateway', 'alb', 'waf',
    'microservice', 'serverless', 'kubernetes-pod',
    'postgresql', 'mongodb', 's3',
    'redis', 'kafka', 'rabbitmq',
    'vpc', 'subnet'
  ]).describe('The component type.'),
  label: z.string().describe('A short, human-readable label (e.g., "User Service").'),
  subtext: z.string().nullable().describe('A brief sub-description, or null when not applicable.'),
  tier: z.number().describe('0=client, 1=edge/cdn/dns, 2=gateway/lb/waf, 3=compute/app, 4=storage/db/cache/messaging, 5=network/infra'),
});

const edgeSchema = z.object({
  from: z.string().describe('The ID of the source node.'),
  to: z.string().describe('The ID of the target node.'),
  protocol: z.string().describe('The protocol or connection type (e.g., "HTTPS", "gRPC", "SQL").'),
});

// ─── Layout: tiered left-to-right ────────────────────────────────────────────
function layoutNodes(nodes: any[]): Record<string, { x: number; y: number }> {
  const TIER_X: Record<number, number> = {
    0: 80,   // clients
    1: 360,  // edge / DNS / CDN
    2: 640,  // gateway / WAF / ALB
    3: 960,  // compute
    4: 1280, // storage / messaging
    5: 1560, // observability / infra
  };

  const tiers: Record<number, any[]> = {};
  nodes.forEach((n) => {
    tiers[n.tier] = tiers[n.tier] || [];
    tiers[n.tier].push(n);
  });

  const positions: Record<string, { x: number; y: number }> = {};
  const NODE_H = 160;
  const CANVAS_CENTER_Y = 320;

  Object.entries(tiers).forEach(([tierStr, tierNodes]) => {
    const tier = Number(tierStr);
    const x = TIER_X[tier] ?? 80 + tier * 280;
    const totalH = tierNodes.length * NODE_H;
    const startY = CANVAS_CENTER_Y - totalH / 2;
    tierNodes.forEach((n, i) => {
      positions[n.id] = { x, y: startY + i * NODE_H };
    });
  });

  return positions;
}

// Input validation schema
const promptSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(2000, 'Prompt must be less than 2000 characters'),
});

export async function POST(req: Request) {
  // Rate limiting using Redis
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'anon';
  
  const clientIP = getClientIP(req);
  const rateLimitResult = await checkRateLimit(clientIP, `generate:${userId}`, false);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.', retryAfter: rateLimitResult.resetIn },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.resetIn) } }
    );
  }

  try {
    const { prompt } = await req.json();

    // Input validation
    const validationResult = promptSchema.safeParse({ prompt });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message ?? 'Invalid prompt' },
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

    const { object } = await generateObject({
      model: getAIModel(),
      schema: z.object({
        name: z.string().describe('A title for this architecture.'),
        nodes: z.array(nodeSchema).describe('The nodes representing components in the architecture.'),
        edges: z.array(edgeSchema).describe('The edges representing connections between components.'),
      }),
      prompt: `Design a detailed cloud architecture diagram for the following request: "${validationResult.data.prompt}".
      Provide all necessary nodes across different tiers (clients, edge, gateway, compute, storage, messaging, etc.)
      and realistic connections between them. Make sure edge "from" and "to" exactly match node "id"s.`,
      abortSignal: AbortSignal.timeout(30000), // 30s timeout
    });

    const positions = layoutNodes(object.nodes);

    const rfNodes = object.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: positions[n.id] || { x: 0, y: 0 },
      data: { label: n.label, subtext: n.subtext },
    }));

    // Output validation constraints
    if (rfNodes.length > 200 || object.edges.length > 500) {
       return NextResponse.json(
         { error: 'Generated architecture is too large. Please narrow your prompt.' },
         { status: 400 }
       );
    }
    
    // De-duplicate node IDs (just in case model hallucinates duplicates)
    const seenIds = new Set<string>();
    const uniqueNodes = rfNodes.filter(n => {
      if (seenIds.has(n.id)) return false;
      seenIds.add(n.id);
      return true;
    });

    let edgeCount = 1;
    const rfEdges = object.edges
      .filter((e) => uniqueNodes.find((n) => n.id === e.from) && uniqueNodes.find((n) => n.id === e.to))
      .map((e) => ({
        id: `gen-edge-${edgeCount++}`,
        source: e.from,
        target: e.to,
        type: 'animated',
        data: { protocol: e.protocol },
      }));

    return NextResponse.json({
      nodes: uniqueNodes,
      edges: rfEdges,
      message: `Generated: ${object.name}`,
      blueprintName: object.name,
      stats: { nodes: uniqueNodes.length, edges: rfEdges.length },
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(rateLimitResult.resetIn),
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      JSON.stringify({ level: 'error', msg: 'Generate error', error: message, ts: new Date().toISOString() }) + '\n'
    );
    if (/quota|rate limit|too many requests/i.test(message)) {
      return NextResponse.json(
        { error: 'AI provider quota exceeded. Please try again later or configure a provider with available quota.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    return NextResponse.json(
      { error: `An error occurred while generating the architecture: ${message}` },
      { status: 500 }
    );
  }
}
