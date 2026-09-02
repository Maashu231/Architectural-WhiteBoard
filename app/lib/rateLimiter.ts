import Redis from 'ioredis';

// ── Structured logger ─────────────────────────────────────────────────────────
// Mirrors the pattern in server.js so all log lines are machine-parseable JSON.
const logger = {
  _write(level: string, msg: string, ctx: Record<string, unknown> = {}) {
    const entry = JSON.stringify({ level, msg, ts: new Date().toISOString(), ...ctx });
    if (level === 'error' || level === 'warn') {
      process.stderr.write(entry + '\n');
    } else {
      process.stdout.write(entry + '\n');
    }
  },
  info(msg: string, ctx?: Record<string, unknown>) { this._write('info', msg, ctx); },
  warn(msg: string, ctx?: Record<string, unknown>) { this._write('warn', msg, ctx); },
  error(msg: string, ctx?: Record<string, unknown>) { this._write('error', msg, ctx); },
};

const redisConfigured = Boolean(process.env.REDIS_HOST);
const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  tls: process.env.REDIS_TLS === 'true' ? { rejectUnauthorized: false } : undefined,
  lazyConnect: true,
});

let isReady = false;
// Track whether we have already logged the "Redis not ready" fallback message,
// so we don't emit it on every single rate-limit check (high frequency).
let _warnedAboutFallback = false;

redisClient.on('ready', () => {
  isReady = true;
  _warnedAboutFallback = false; // reset so a reconnect logs once
  logger.info('Redis client connected and ready');
});

redisClient.on('error', (err: Error) => {
  logger.error('Redis connection error', { error: err.message });
});

if (redisConfigured) {
  void redisClient.connect().catch((error: unknown) => {
    logger.error('Redis initial connection failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

// ── Simple in-memory fallback (useful for dev/single-instance) ────────────────
const memoryCache = new Map<string, { count: number; expiresAt: number }>();

/**
 * Check and increment the rate limit for a given IP + identifier pair.
 *
 * When Redis is unavailable the function falls back to an in-process Map.
 * The fallback is not shared across multiple server instances; it is only
 * suitable for single-process deployments or development.
 *
 * @param ip         - Client IP address (used as part of the cache key).
 * @param identifier - A namespace for the limiter, e.g. `generate:userId`.
 * @param failOpen   - When `true`, unknown Redis errors allow the request through.
 *                     When `false`, unknown errors block the request. Defaults to `true`.
 */
export async function checkRateLimit(
  ip: string,
  identifier: string = 'default',
  failOpen: boolean = true
): Promise<{
  allowed: boolean;
  remaining: number;
  resetIn: number;
}> {
  const key = `rate_limit:${identifier}:${ip}`;
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10);
  const windowSeconds = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10);

  if (!redisConfigured || !isReady) {
    if (!_warnedAboutFallback) {
      logger.warn('Redis not ready — using in-memory rate limiter (not suitable for multi-instance deployments)');
      _warnedAboutFallback = true;
    }

    const now = Date.now();
    let record = memoryCache.get(key);

    // Clear expired record
    if (record && record.expiresAt < now) {
      memoryCache.delete(key);
      record = undefined;
    }

    if (!record) {
      record = { count: 0, expiresAt: now + windowSeconds * 1000 };
    }

    record.count++;
    memoryCache.set(key, record);

    const allowed = record.count <= maxRequests;
    return {
      allowed,
      remaining: allowed ? maxRequests - record.count : 0,
      resetIn: Math.ceil((record.expiresAt - now) / 1000),
    };
  }

  try {
    // Use Redis MULTI for atomicity: INCR + EXPIRE in a single round-trip.
    const result = await redisClient
      .multi()
      .incr(key)
      .expire(key, windowSeconds)
      .exec();

    if (!result) {
      return {
        allowed: failOpen,
        remaining: failOpen ? maxRequests - 1 : 0,
        resetIn: windowSeconds,
      };
    }

    const incrementResult = result[0]?.[1];
    const tokens =
      typeof incrementResult === 'number'
        ? incrementResult
        : parseInt(String(incrementResult || '1'), 10);

    const allowed = tokens <= maxRequests;
    const remaining = allowed ? maxRequests - tokens : 0;

    return { allowed, remaining, resetIn: windowSeconds };
  } catch (error: unknown) {
    logger.error('Redis rate limiting error', {
      error: error instanceof Error ? error.message : String(error),
      key,
    });
    return {
      allowed: failOpen,
      remaining: failOpen ? maxRequests - 1 : 0,
      resetIn: windowSeconds,
    };
  }
}

/**
 * Extract the real client IP from a request object.
 *
 * Respects `X-Forwarded-For` (set by load balancers / proxies) and
 * `X-Real-IP` (set by nginx). Falls back to `'local'` for local requests
 * where no forwarding headers are present.
 *
 * Caution: `X-Forwarded-For` can be spoofed by clients unless your load
 * balancer strips and re-sets it. Ensure your infrastructure does so.
 */
export function getClientIP(request: { headers: Headers }): string {
  const headers = request.headers;

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // The leftmost IP is the originating client in a correctly configured proxy chain.
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) return realIP;

  return 'local';
}

// Export the Redis client for direct use in other modules (e.g. health checks).
export { redisClient, isReady };

/**
 * Cleanly disconnect the Redis client.
 * Should be called during server shutdown to avoid connection leaks.
 */
export async function cleanupRateLimiter(): Promise<void> {
  if (redisClient.status !== 'end') {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
}