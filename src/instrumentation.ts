/**
 * Runs once, before the first request is handled — Next.js's documented hook for exactly
 * this kind of "swap an implementation in for the whole app" setup. See
 * `src/lib/inspection/rate-limit.ts` for the interface this is installing an adapter for.
 *
 * Guarded to the Node runtime: Upstash's client works over `fetch` and would run on the Edge
 * runtime too, but this project's routes are Node already, and `register()` also fires for an
 * Edge runtime this app does not use — the check keeps this a no-op there rather than a
 * second, redundant install.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { isRedisConfigured } = await import('@/lib/env');
  // Local dev and any deployment without Upstash configured keep the in-process default from
  // `rate-limit.ts` — that is a supported, correct state, not a degraded one for a
  // single-instance deployment. See that file's own module comment.
  if (!isRedisConfigured()) return;

  const { getRedis } = await import('@/lib/redis/client');
  const { createRedisRateLimiter, inspectionWindow, setRateLimiter } =
    await import('@/lib/inspection/rate-limit');

  const redis = getRedis();
  // `isRedisConfigured()` above already confirmed the credentials exist, so `getRedis()`
  // constructing a client rather than returning null here would only fail if the two
  // functions disagreed with each other — worth a loud failure if it ever happens, not a
  // silent fallback to the memory limiter that would hide a real configuration bug.
  if (!redis) throw new Error('isRedisConfigured() was true but getRedis() returned null');

  setRateLimiter(createRedisRateLimiter(redis, inspectionWindow));
}
