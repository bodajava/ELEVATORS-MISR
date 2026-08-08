import { createHmac } from 'node:crypto';

import { rateLimitSalt } from '@/lib/env';

/**
 * Rate limiting — one interface, one swappable implementation.
 *
 * The default is a fixed-window counter in process memory. That is the right default and the
 * wrong production answer, and it is worth being precise about which:
 *
 *  • It is correct, allocation-free and dependency-free for a single Node process — which is
 *    what `next start` on one machine is, and what the current deployment story is.
 *  • It does **not** hold across instances. On serverless or any multi-instance deployment,
 *    N instances means N × the limit, and a cold start resets the window.
 *
 * So the seam is the point. `RateLimiter` is three lines wide, `setRateLimiter()` replaces
 * the implementation for the whole app, and the call site in the server action never changes.
 * Moving to Redis/Upstash is one adapter and one call in instrumentation — see the bottom of
 * this file for the exact shape.
 *
 * Keys are HMAC-SHA256 of the client IP under a server secret, truncated. The limiter needs
 * to tell requesters apart; it does not need to know who they are, and an IP is personal data
 * under Egypt's PDPL. Hashing means nothing here or in any future Redis holds an address.
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

/*
 * ── Replacing this with a shared store ──────────────────────────────────────
 *
 * Everything above is behind `RateLimiter`. A distributed version is an adapter:
 *
 *   // src/instrumentation.ts
 *   import { setRateLimiter, inspectionWindow } from '@/lib/inspection/rate-limit';
 *
 *   export async function register() {
 *     if (!process.env.REDIS_URL) return;             // keep the memory default locally
 *     const { Redis } = await import('@upstash/redis');
 *     const redis = Redis.fromEnv();
 *     setRateLimiter({
 *       async check(key) {
 *         const count = await redis.incr(key);
 *         if (count === 1) await redis.pexpire(key, inspectionWindow.windowMs);
 *         const ttl = await redis.pttl(key);
 *         return {
 *           ok: count <= inspectionWindow.limit,
 *           remaining: Math.max(0, inspectionWindow.limit - count),
 *           retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)),
 *         };
 *       },
 *     });
 *   }
 *
 * No call site changes.
 */
