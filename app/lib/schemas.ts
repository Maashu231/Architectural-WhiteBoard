import { z } from 'zod';

export const nodeSchema = z.object({
  id: z.string().max(100),
  type: z.string().max(50),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    label: z.string().max(200),
    subtext: z.string().max(500).nullable().optional(),
  }).passthrough(),
}).passthrough();

export const edgeSchema = z.object({
  id: z.string().max(100),
  source: z.string().max(100),
  target: z.string().max(100),
  type: z.string().max(50).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const cursorMoveSchema = z.object({
  roomId: z.string().max(50),
  x: z.number(),
  y: z.number(),
});

export const MAX_NODES = 500;
export const MAX_EDGES = 1000;
export const MAX_PAYLOAD_BYTES = 512 * 1024; // 512 KB
