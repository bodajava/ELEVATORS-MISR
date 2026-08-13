import { createHmac } from 'node:crypto';

import { rateLimitSalt } from '@/lib/env';
import type { Redis } from '@upstash/redis';

/**
 * Rate limiting — one interface, two implementations.
 *
 * The default is a fixed-window counter in process memory:
 *
 *  • It is correct, allocation-free and dependency-free for a single Node process — which is
 *    what `next start` on one machine is.
 *  • It does **not** hold across instances. On serverless or any multi-instance deployment,
 *    N instances means N × the limit, and a cold start resets the window.
 *
 * `createRedisRateLimiter` below is the distributed alternative, backed by Upstash Redis, and
 * `src/instrumentation.ts` installs it in place of the memory default whenever
 * `isRedisConfigured()` is true — see that file for exactly where the swap happens. Nothing
 * about the seam changed to support this: `RateLimiter` is three lines wide,
 * `setRateLimiter()` replaces the implementation for the whole app, and the call sites in the
 * server action and the concierge route never change.
 *
 * Keys are HMAC-SHA256 of the client IP under a server secret, truncated. The limiter needs
 * to tell requesters apart; it does not need to know who they are, and an IP is personal data
 * under Egypt's PDPL. Hashing means nothing here or in Redis ever holds an address.
 */

export type RateLimitDecision = {
  ok: boolean;
  /** Requests still available in the current window. */
  remaining: number;
  /** Seconds until the window resets. Meaningful when `ok` is false. */
  retryAfterSeconds: number;
};

export interface RateLimiter {
  /** Records one attempt against `key` and reports whether it is allowed. */
  check(key: string): Promise<RateLimitDecision>;
}

export type WindowOptions = {
  /** Attempts allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

/**
 * The submission budget: five requests per IP per ten minutes.
 *
 * Generous for a person — nobody books six inspections in ten minutes, and a visitor who
 * mistypes their phone four times is not blocked — and tight enough that a script has to
 * work at it. Kept small deliberately: the honeypot and the timing check are the cheap
 * filters, and this is the backstop, not the front line.
 */
export const inspectionWindow: WindowOptions = { limit: 5, windowMs: 10 * 60 * 1000 };

/* ───────────────────────────── in-memory default ─────────────────────────── */

type Bucket = { count: number; resetAt: number };

export function createMemoryRateLimiter(options: WindowOptions): RateLimiter {
  const buckets = new Map<string, Bucket>();

  // Bounded so a flood of distinct keys cannot grow the map without limit. Expired entries
  // are dropped opportunistically on write; this is the hard ceiling behind that.
  const MAX_KEYS = 10_000;

  return {
    async check(key: string): Promise<RateLimitDecision> {
      const now = Date.now();

      if (buckets.size >= MAX_KEYS) {
        for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
        // Still full of live entries: fail closed. Under that much pressure, refusing is
        // the safer error than admitting everyone.
        if (buckets.size >= MAX_KEYS) {
          return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil(options.windowMs / 1000) };
        }
      }

      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + options.windowMs });
        return { ok: true, remaining: options.limit - 1, retryAfterSeconds: 0 };
      }

      existing.count += 1;
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

      return existing.count > options.limit
        ? { ok: false, remaining: 0, retryAfterSeconds }
        : { ok: true, remaining: options.limit - existing.count, retryAfterSeconds: 0 };
    },
  };
}

/* ─────────────────────────────── redis (upstash) ─────────────────────────── */

/**
 * A fixed-window counter held in Redis instead of process memory, so every instance behind
 * the same deployment shares one budget per key.
 *
 * `INCR` + a conditional `PEXPIRE` on the first hit is the classic simple version of this
 * pattern, not the perfectly atomic one — a Lua script (`INCR`, then `PEXPIRE` only if the
 * resulting TTL is unset, in one round trip) closes the tiny race where two requests land on
 * the same fresh key in the same instant and the second sees no TTL yet. That race costs at
 * most one extra request slipping through on a brand-new window, once, which is a rounding
 * error against the limiter's actual job — stopping a script from making thousands of
 * attempts, not policing the exact five-per-ten-minutes boundary to the request. The simple
 * version is what `rate-limit.ts`'s own design comment already specified; this is that.
 */
export function createRedisRateLimiter(redis: Redis, options: WindowOptions): RateLimiter {
  /**
   * What happens when Redis is reachable-looking but not actually working.
   *
   * This used to be nothing, and the consequence was severe out of all proportion to the
   * cause. `redis.incr()` rejects on a bad token, a deleted database, or a network blip; the
   * rejection propagated out of `check()` into the server action, whose `catch` re-throws
   * anything that is not a `MissingEnvError`; the action crashed; the visitor got an error
   * boundary — and **the lead was never recorded**, because the limiter runs before the
   * database write. A wrong token in an environment variable was therefore enough to silently
   * stop the site taking any enquiries at all, while every shape check still passed.
   *
   * The failure now degrades to the in-memory limiter instead: still real protection, still
   * the documented behaviour of an unconfigured deployment, per-instance rather than shared.
   * Losing a lead is not an acceptable trade for a rate-limit counter, and a broken counter is
   * not a reason to stop serving. `scripts/preflight.mjs` is where a bad Redis is *meant* to be
   * caught — loudly, before deployment, rather than by a visitor.
   */
  const fallback = createMemoryRateLimiter(options);
  let degraded = false;

  return {
    async check(key: string): Promise<RateLimitDecision> {
      if (degraded) return fallback.check(key);

      try {
        const count = await redis.incr(key);
        if (count === 1) await redis.pexpire(key, options.windowMs);

        if (count <= options.limit) {
          return { ok: true, remaining: options.limit - count, retryAfterSeconds: 0 };
        }

        const ttlMs = await redis.pttl(key);
        // `pttl` returns -1 (no expiry) or -2 (key already gone) in edge cases rather than a
        // real millisecond count; falling back to the window length keeps the number honest —
        // "retry after the full window" — instead of reporting a negative or zero wait.
        const retryAfterSeconds = Math.ceil((ttlMs > 0 ? ttlMs : options.windowMs) / 1000);
        return { ok: false, remaining: 0, retryAfterSeconds };
      } catch (error) {
        // Latched, and logged once. A limiter that logs per request turns an outage into a
        // second outage in the log pipeline. The error's class only — an Upstash error can
        // carry the request URL, and the token travels in that URL.
        if (!degraded) {
          degraded = true;
          console.error(
            `[rate-limit] Redis is configured but failing (${(error as Error)?.name ?? 'Error'}) — ` +
              'falling back to the in-memory limiter for the life of this instance. ' +
              'Run `node scripts/preflight.mjs` to see why.'
          );
        }
        return fallback.check(key);
      }
    },
  };
}

/* ──────────────────────────────── the seam ───────────────────────────────── */

let limiter: RateLimiter | null = null;

/**
 * Install a different implementation. Call once, before the first request — from
 * `instrumentation.ts` in production, or from a test's `beforeEach`.
 */
export function setRateLimiter(next: RateLimiter): void {
  limiter = next;
}

export function getRateLimiter(): RateLimiter {
  limiter ??= createMemoryRateLimiter(inspectionWindow);
  return limiter;
}

/** Test helper: drop the installed limiter so the next call rebuilds the default. */
export function resetRateLimiter(): void {
  limiter = null;
}

/* ──────────────────────────────── keying ─────────────────────────────────── */

/**
 * Derive a stable, non-reversible key from a client address.
 *
 * `null` (no address available — a proxy stripped it, or a runtime that does not expose one)
 * collapses to a single shared bucket rather than bypassing the limiter. That is a blunt
 * instrument by design: it is better for anonymous traffic to share a budget than for
 * "unknown" to mean "unlimited".
 */
export function rateLimitKey(scope: string, clientAddress: string | null): string {
  const subject = clientAddress ?? 'unknown';
  return `${scope}:${createHmac('sha256', rateLimitSalt()).update(subject).digest('base64url').slice(0, 24)}`;
}

/**
 * Best-effort client address from request headers.
 *
 * These headers are trivially forged by the client, so the value is only meaningful when a
 * trusted proxy sets it — which is exactly why the result feeds a hashed rate-limit key and
 * nothing else. It is never stored, logged or shown.
 */
export function clientAddressFrom(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip') ?? headers.get('cf-connecting-ip') ?? null;
}
