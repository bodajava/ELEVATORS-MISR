import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getRedis, resetRedisClient } from '@/lib/redis/client';

/**
 * `getRedis()` degrading a malformed credential to `null` instead of throwing, verified
 * directly.
 *
 * This is not a hypothetical: `UPSTASH_REDIS_REST_URL` was once set to a `redis-cli --tls -u
 * redis://...` connect string pasted from the wrong tab of the Upstash console rather than a
 * REST URL, and the Upstash client's own constructor validates its `url` option eagerly and
 * throws for exactly that shape. Uncaught, that throw crashed the entire server at startup —
 * `next start` never became ready — because `getRedis()` used to run unguarded inside
 * `instrumentation.ts`. The same throw, reached instead from the lead-notification dedupe
 * guard, would have propagated out of `notifyLead` into `actions.ts`'s database-failure
 * `catch` block and misreported an already-saved lead as a failed submission.
 */
describe('getRedis', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    resetRedisClient();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });
  afterEach(() => {
    process.env = { ...saved };
    resetRedisClient();
  });

  it('returns null, not a thrown error, when unconfigured', () => {
    expect(() => getRedis()).not.toThrow();
    expect(getRedis()).toBeNull();
  });

  it('returns null, not a thrown error, for a malformed URL — the actual incident', () => {
    process.env.UPSTASH_REDIS_REST_URL =
      'redis-cli --tls -u redis://default:secret@example.upstash.io:6379';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    expect(() => getRedis()).not.toThrow();
    expect(getRedis()).toBeNull();
  });

  it('returns null for a URL missing the https scheme entirely', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    expect(getRedis()).toBeNull();
  });

  it('constructs a client for a well-formed URL and token', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    expect(getRedis()).not.toBeNull();
  });

  it('caches the result rather than reconstructing on every call', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    expect(getRedis()).toBe(getRedis());
  });
});
