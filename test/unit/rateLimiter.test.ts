import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '@/app/lib/rateLimiter';

describe('rateLimiter - In-Memory Fallback', () => {
  const testIp = '127.0.0.1';
  const action = 'vitest-test-action';

  it('allows requests within the configured threshold', async () => {
    const result = await checkRateLimit(testIp, action, false);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it('blocks requests once the threshold is exceeded', async () => {
    // Exceed the rate limit window
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(testIp, action, false);
    }

    const blockedResult = await checkRateLimit(testIp, action, false);
    expect(blockedResult.allowed).toBe(false);
    expect(blockedResult.resetIn).toBeGreaterThan(0);
  });
});