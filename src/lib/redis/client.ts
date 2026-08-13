import 'server-only';
import { Redis } from '@upstash/redis';

import { redisConfigStatus } from '@/lib/env';

/**
 * The shared Upstash Redis client — one instance, constructed lazily, reused everywhere a
 * server module needs distributed state: the rate limiter's counters (`rate-limit.ts`, wired
 * in from `instrumentation.ts`) and the lead-notification dedupe guard (`lead-notification.ts`).
 *
 * `null` when unconfigured, which every caller checks before touching this — the same
 * "blank is a supported state" rule the rest of this project's optional integrations follow.
 * Nothing here throws for a missing credential; the caller decides what "no Redis" degrades to.
 *
 * ── Present but wrong is handled the same as absent ─────────────────────────
 * `isRedisConfigured()` only checks that both variables are non-empty strings — it has no way
 * to know the *value* is a working URL and token, and the Upstash client's own constructor
 * validates that eagerly and throws. That distinction mattered in practice: a value pasted
 * from the wrong tab of the Upstash console (the `redis-cli --tls -u redis://...` connect
 * command, not a REST URL) threw synchronously out of `new Redis()`, and because this used to
 * run unguarded inside `instrumentation.ts`'s `register()`, that one bad string crashed the
 * *entire* server at startup — `next start` never became ready. The same throw, reached from
 * `lead-notification.ts`'s dedupe guard instead, would have propagated out of `notifyLead` and
 * into the `catch` block in `actions.ts` that exists for database failures — misreporting a
 * lead that had already saved successfully as a failed submission. Both are exactly the
 * failure modes this integration is required never to cause. So construction failure is
 * handled here, once, the same way missing configuration already was: logged loudly, cached,
 * degrades to `null`.
 */

let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;

  const status = redisConfigStatus();

  if (status.state === 'absent') {
    client = null;
    return client;
  }

  // Shaped wrong — the common case being a `redis://` string from the wrong tab of the Upstash
  // console. Said once, plainly, with the fix in it, rather than left for `new Redis()` to
  // throw about. `scripts/preflight.mjs` fails a production deployment on the same condition.
  if (status.state === 'invalid') {
    console.error(`[redis] ${status.reason} — falling back as if unconfigured.`);
    client = null;
    return client;
  }

  try {
    client = new Redis({ url: status.url, token: status.token });
  } catch (error) {
    console.error(
      '[redis] UPSTASH_REDIS_REST_URL/TOKEN are set but invalid — falling back as if unconfigured:',
      (error as Error)?.message
    );
    client = null;
  }

  return client;
}

/** Test helper: drop the cached client so the next call re-reads the environment. */
export function resetRedisClient(): void {
  client = undefined;
}
