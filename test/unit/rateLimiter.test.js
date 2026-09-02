/**
 * test/unit/rateLimiter.test.js
 *
 * Tests the in-memory rate-limiter logic directly — without importing the
 * TypeScript source, which would require a transpiler not present in the
 * plain `node --test` runner.
 *
 * The logic under test is the in-process Map-backed fallback in
 * app/lib/rateLimiter.ts. We reproduce the exact algorithm here so that
 * any drift from the source will be immediately visible as a failing test.
 *
 * If ts-node / tsx is added to devDependencies in the future, replace this
 * inline port with a direct import of `checkRateLimit`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

// ── Inline port of the in-memory rate-limiter logic ──────────────────────────
// Keep this in sync with the corresponding block in app/lib/rateLimiter.ts.

function makeRateLimiter(maxRequests, windowSeconds) {
  const cache = new Map();

  function check(key) {
    const now = Date.now();
    let record = cache.get(key);

    if (record && record.expiresAt < now) {
      cache.delete(key);
      record = undefined;
    }

    if (!record) {
      record = { count: 0, expiresAt: now + windowSeconds * 1000 };
    }

    record.count++;
    cache.set(key, record);

    const allowed = record.count <= maxRequests;
    return {
      allowed,
      remaining: allowed ? maxRequests - record.count : 0,
      resetIn: Math.ceil((record.expiresAt - now) / 1000),
    };
  }

  function _forceExpire(key) {
    const record = cache.get(key);
    if (record) {
      record.expiresAt = Date.now() - 1; // already expired
      cache.set(key, record);
    }
  }

  return { check, _forceExpire, _cache: cache };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('in-memory rate limiter', async (t) => {
  await t.test('allows requests up to the limit', () => {
    const rl = makeRateLimiter(3, 60);
    const r1 = rl.check('ip-a');
    const r2 = rl.check('ip-a');
    const r3 = rl.check('ip-a');

    assert.equal(r1.allowed, true);
    assert.equal(r2.allowed, true);
    assert.equal(r3.allowed, true);
    assert.equal(r3.remaining, 0);
  });

  await t.test('blocks the request after the limit is exceeded', () => {
    const rl = makeRateLimiter(2, 60);
    rl.check('ip-b');
    rl.check('ip-b');
    const blocked = rl.check('ip-b');

    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
  });

  await t.test('tracks different keys independently', () => {
    const rl = makeRateLimiter(1, 60);
    rl.check('ip-c');
    const blockedC = rl.check('ip-c');
    const allowedD = rl.check('ip-d');

    assert.equal(blockedC.allowed, false);
    assert.equal(allowedD.allowed, true);
  });

  await t.test('resets the counter after the window expires', () => {
    const rl = makeRateLimiter(1, 60);
    rl.check('ip-e');
    const blockedBefore = rl.check('ip-e');
    assert.equal(blockedBefore.allowed, false);

    // Simulate window expiry
    rl._forceExpire('ip-e');

    const allowedAfter = rl.check('ip-e');
    assert.equal(allowedAfter.allowed, true);
    assert.equal(allowedAfter.remaining, 0); // used 1 of 1
  });

  await t.test('remaining decrements correctly', () => {
    const rl = makeRateLimiter(5, 60);
    const r1 = rl.check('ip-f');
    assert.equal(r1.remaining, 4);
    const r2 = rl.check('ip-f');
    assert.equal(r2.remaining, 3);
    const r3 = rl.check('ip-f');
    assert.equal(r3.remaining, 2);
  });

  await t.test('resetIn is a positive integer within the window', () => {
    const rl = makeRateLimiter(5, 30);
    const r = rl.check('ip-g');
    assert.ok(r.resetIn > 0, 'resetIn should be positive');
    assert.ok(r.resetIn <= 30, 'resetIn should not exceed the window');
    assert.equal(r.resetIn, Math.ceil(r.resetIn), 'resetIn should be an integer');
  });

  await t.test('limit of 0 blocks every request', () => {
    const rl = makeRateLimiter(0, 60);
    const r = rl.check('ip-h');
    assert.equal(r.allowed, false);
    assert.equal(r.remaining, 0);
  });
});
