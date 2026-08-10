import 'server-only';
import { Redis } from '@upstash/redis';

import { isRedisConfigured, upstashRedisRestToken, upstashRedisRestUrl } from '@/lib/env';

/**
 * The shared Upstash Redis client — one instance, constructed lazily, reused everywhere a
 * server module needs distributed state: the rate limiter's counters (`rate-limit.ts`, wired
 * in from `instrumentation.ts`) and the lead-notification dedupe guard (`lead-notification.ts`).
 *
 * `null` when unconfigured, which every caller checks before touching this — the same
 * "blank is a supported state" rule the rest of this project's optional integrations follow.
 * Nothing here throws for a missing credential; the caller decides what "no Redis" degrades to.
 */

let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;

  if (!isRedisConfigured()) {
    client = null;
    return client;
  }

  client = new Redis({
    // Non-null: `isRedisConfigured()` above already confirmed both are set.
    url: upstashRedisRestUrl()!,
    token: upstashRedisRestToken()!,
  });
  return client;
}

/** Test helper: drop the cached client so the next call re-reads the environment. */
export function resetRedisClient(): void {
  client = undefined;
}
