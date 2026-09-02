/**
 * Environment validation — imported early to fail fast on missing config.
 *
 * This module uses Zod to validate required environment variables at import
 * time. If validation fails, the server will not start and will print a
 * clear error message listing which variables are missing or malformed.
 */
import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  // Socket.IO server URL (consumed by the browser client)
  NEXT_PUBLIC_SOCKET_URL: z
    .string()
    .url('NEXT_PUBLIC_SOCKET_URL must be a valid URL')
    .default('http://localhost:4002'),

  // AI — at least one provider key must be set
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_MODEL: z.string().optional(),

  // Redis (optional)
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_MAX_REQUESTS: z.string().optional(),
  RATE_LIMIT_WINDOW_SECONDS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    '\n❌ Environment validation failed:\n' +
    parsed.error.issues
      .map((issue) => `   • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n') +
    '\n\nCopy .env.example to .env.local and fill in the required values.\n'
  );
  // In production, crash hard. In dev, warn but continue.
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}
export const env = parsed.data ?? (process.env as unknown as z.infer<typeof envSchema>);

/**
 * Returns true if at least one AI provider is configured.
 */
export function hasAnyAIProvider(): boolean {
  return Boolean(env.GROQ_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY);
}
