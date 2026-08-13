import type { Redis } from '@upstash/redis';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_FORM_AGE_MS, MIN_FILL_MS, inspectHoneypot } from '@/lib/inspection/honeypot';
import {
  clientAddressFrom,
  createMemoryRateLimiter,
  createRedisRateLimiter,
  getRateLimiter,
  rateLimitKey,
  resetRateLimiter,
  setRateLimiter,
  type RateLimiter,
} from '@/lib/inspection/rate-limit';
import {
  canonicaliseReference,
  generateReference,
  isReference,
  referenceAlphabet,
} from '@/lib/inspection/reference';

/* ─────────────────────────────── honeypot ────────────────────────────────── */

describe('honeypot', () => {
  const now = 1_800_000_000_000;
  const fresh = now - (MIN_FILL_MS + 1_000);

  it('passes a submission a person could plausibly have produced', () => {
    expect(inspectHoneypot({ decoy: '', renderedAt: fresh }, now)).toEqual({ tripped: false });
  });

  it('trips when the decoy field carries anything at all', () => {
    for (const value of ['x', 'https://example.com', '   spaces around   ', '0']) {
      expect(inspectHoneypot({ decoy: value, renderedAt: fresh }, now).tripped, value).toBe(true);
    }
  });

  it('treats a whitespace-only decoy as untouched — a stray space is not a bot', () => {
    expect(inspectHoneypot({ decoy: '   ', renderedAt: fresh }, now).tripped).toBe(false);
  });

  it('trips on a submission faster than anyone could read the form', () => {
    const verdict = inspectHoneypot({ decoy: '', renderedAt: now - 200 }, now);
    expect(verdict).toEqual({ tripped: true, reason: 'too-fast' });
  });

  it('accepts a slow, careful visitor right up to the age limit', () => {
    expect(inspectHoneypot({ decoy: '', renderedAt: now - MIN_FILL_MS }, now).tripped).toBe(false);
    expect(
      inspectHoneypot({ decoy: '', renderedAt: now - (MAX_FORM_AGE_MS - 1) }, now).tripped
    ).toBe(false);
  });

  it('trips on a replayed form older than the age limit', () => {
    const verdict = inspectHoneypot({ decoy: '', renderedAt: now - MAX_FORM_AGE_MS - 1 }, now);
    expect(verdict).toEqual({ tripped: true, reason: 'stale' });
  });

  it('trips when the timestamp is missing or not a number', () => {
    for (const renderedAt of [undefined, null, '', 'abc', '0', -1, NaN]) {
      const verdict = inspectHoneypot({ decoy: '', renderedAt }, now);
      expect(verdict.tripped, String(renderedAt)).toBe(true);
    }
  });

  it('tolerates a client clock running slightly fast, but not a fabricated future', () => {
    // 30s ahead — a real, common amount of skew on an unsynchronised phone.
    expect(inspectHoneypot({ decoy: '', renderedAt: now + 30_000 }, now).tripped).toBe(true);
    const verdict = inspectHoneypot({ decoy: '', renderedAt: now + 600_000 }, now);
    expect(verdict).toEqual({ tripped: true, reason: 'malformed-timestamp' });
  });
});

/* ────────────────────────────── references ───────────────────────────────── */

describe('public request references', () => {
  it('matches the documented shape', () => {
    for (let i = 0; i < 200; i++) {
      const reference = generateReference();
      expect(reference, reference).toMatch(/^EE-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(isReference(reference)).toBe(true);
    }
  });

  it('excludes every character that is ambiguous when read aloud', () => {
    for (const excluded of ['0', '1', 'I', 'L', 'O', 'U']) {
      expect(referenceAlphabet, excluded).not.toContain(excluded);
    }
    // 30 symbols across 8 positions ≈ 6.6e11 — enough that a reference is not enumerable.
    expect(referenceAlphabet.length).toBe(30);
  });

  it('is not sequential or time-derived: 5000 references collide zero times', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) seen.add(generateReference());
    expect(seen.size).toBe(5000);
  });

  it('spreads across the alphabet rather than clustering', () => {
    // A broken generator (constant seed, truncated range) shows up as missing symbols.
    const used = new Set<string>();
    for (let i = 0; i < 4000; i++) {
      for (const c of generateReference().replace(/[-]|^EE/g, '')) used.add(c);
    }
    expect(used.size).toBe(referenceAlphabet.length);
  });

  it('accepts a reference read back sloppily and returns the canonical form', () => {
    const reference = generateReference();
    const body = reference.slice(3).replace('-', '');
    for (const variant of [
      reference,
      reference.toLowerCase(),
      reference.replace(/-/g, ' '),
      reference.replace(/-/g, ''),
      body,
      body.toLowerCase(),
      ` ${reference} `,
    ]) {
      expect(canonicaliseReference(variant), variant).toBe(reference);
    }
  });

  it('rejects anything that is not a reference rather than guessing', () => {
    for (const input of ['', 'EE', 'EE-123', 'EE-IIII-OOOO', 'EE-0000-1111', 'x'.repeat(40)]) {
      expect(canonicaliseReference(input), input).toBeNull();
    }
  });
});

/* ───────────────────────────── rate limiting ─────────────────────────────── */

describe('rate limiter', () => {
  beforeEach(() => resetRateLimiter());
  afterEach(() => {
    vi.useRealTimers();
    resetRateLimiter();
  });

  it('allows exactly the configured budget, then refuses', async () => {
    const limiter = createMemoryRateLimiter({ limit: 3, windowMs: 60_000 });

    for (let i = 0; i < 3; i++) {
      const decision = await limiter.check('key');
      expect(decision.ok, `attempt ${i + 1}`).toBe(true);
      expect(decision.remaining).toBe(2 - i);
    }

    const refused = await limiter.check('key');
    expect(refused.ok).toBe(false);
    expect(refused.remaining).toBe(0);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('keeps separate budgets per key', async () => {
    const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 60_000 });
    expect((await limiter.check('a')).ok).toBe(true);
    expect((await limiter.check('b')).ok).toBe(true);
    expect((await limiter.check('a')).ok).toBe(false);
  });

  it('reopens the budget once the window elapses', async () => {
    vi.useFakeTimers();
    const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 60_000 });

    expect((await limiter.check('key')).ok).toBe(true);
    expect((await limiter.check('key')).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect((await limiter.check('key')).ok).toBe(true);
  });

  it('is replaceable without touching the call site', async () => {
    const calls: string[] = [];
    const stub: RateLimiter = {
      async check(key) {
        calls.push(key);
        return { ok: false, remaining: 0, retryAfterSeconds: 42 };
      },
    };

    setRateLimiter(stub);
    const decision = await getRateLimiter().check('inspection:abc');

    expect(calls).toEqual(['inspection:abc']);
    expect(decision.retryAfterSeconds).toBe(42);
  });
});

/**
 * A minimal fake reproducing just enough of Redis's INCR/PEXPIRE/PTTL semantics for
 * `createRedisRateLimiter` to exercise against — not a real client, and not meant to be one.
 * The point is to prove the *adapter's* logic (the window arithmetic, the ok/refuse boundary,
 * the retry-after calculation), which is exactly what a real Redis's atomicity guarantees sit
 * underneath; a live-Upstash test belongs in a manual/integration check, not this suite.
 */
function fakeRedis(): Redis {
  const store = new Map<string, { value: number; expiresAt: number | null }>();

  return {
    async incr(key: string) {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || (entry.expiresAt !== null && entry.expiresAt <= now)) {
        store.set(key, { value: 1, expiresAt: null });
        return 1;
      }
      entry.value += 1;
      return entry.value;
    },
    async pexpire(key: string, ms: number) {
      const entry = store.get(key);
      if (!entry) return 0;
      entry.expiresAt = now() + ms;
      return 1;
    },
    async pttl(key: string) {
      const entry = store.get(key);
      if (!entry) return -2;
      if (entry.expiresAt === null) return -1;
      return Math.max(0, entry.expiresAt - now());
    },
  } as unknown as Redis;

  function now() {
    return Date.now();
  }
}

describe('redis rate limiter', () => {
  afterEach(() => vi.useRealTimers());

  it('allows exactly the configured budget, then refuses', async () => {
    const limiter = createRedisRateLimiter(fakeRedis(), { limit: 3, windowMs: 60_000 });

    for (let i = 0; i < 3; i++) {
      const decision = await limiter.check('key');
      expect(decision.ok, `attempt ${i + 1}`).toBe(true);
      expect(decision.remaining).toBe(2 - i);
    }

    const refused = await limiter.check('key');
    expect(refused.ok).toBe(false);
    expect(refused.remaining).toBe(0);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('keeps separate budgets per key', async () => {
    const limiter = createRedisRateLimiter(fakeRedis(), { limit: 1, windowMs: 60_000 });
    expect((await limiter.check('a')).ok).toBe(true);
    expect((await limiter.check('b')).ok).toBe(true);
    expect((await limiter.check('a')).ok).toBe(false);
  });

  it('reopens the budget once the window elapses', async () => {
    vi.useFakeTimers();
    const limiter = createRedisRateLimiter(fakeRedis(), { limit: 1, windowMs: 60_000 });

    expect((await limiter.check('key')).ok).toBe(true);
    expect((await limiter.check('key')).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect((await limiter.check('key')).ok).toBe(true);
  });

  it('reports a retry-after bounded by the window even if PTTL is stale', async () => {
    // `pttl` returning -1/-2 is a documented edge case in the adapter's own comment — cover it
    // directly rather than trusting the fake's normal path to always avoid it.
    const redis = {
      async incr() {
        return 99;
      },
      async pexpire() {
        return 0;
      },
      async pttl() {
        return -1;
      },
    } as unknown as Redis;

    const limiter = createRedisRateLimiter(redis, { limit: 5, windowMs: 10_000 });
    const decision = await limiter.check('key');
    expect(decision.ok).toBe(false);
    expect(decision.retryAfterSeconds).toBe(10);
  });

  /**
   * The failure that made this necessary was not hypothetical: a wrong token in
   * `UPSTASH_REDIS_REST_TOKEN` passed every shape check, `incr` rejected on the first
   * submission, the rejection travelled out of `check()` into the server action — whose
   * `catch` re-throws anything that is not a `MissingEnvError` — and the visitor got an error
   * boundary instead of a confirmation. The limiter runs *before* the database write, so the
   * lead was not recorded either. One bad environment variable, no enquiries.
   */
  it('degrades to the in-memory limiter when Redis rejects, rather than throwing', async () => {
    const broken = {
      async incr(): Promise<number> {
        throw new Error('UpstashError: WRONGPASS');
      },
      async pexpire() {
        return 0;
      },
      async pttl() {
        return -1;
      },
    } as unknown as Redis;

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const limiter = createRedisRateLimiter(broken, { limit: 2, windowMs: 60_000 });

    // Never throws, and still enforces the window through the fallback.
    expect((await limiter.check('addr')).ok).toBe(true);
    expect((await limiter.check('addr')).ok).toBe(true);
    expect((await limiter.check('addr')).ok).toBe(false);

    // A different caller is still judged on its own budget — the fallback is a real limiter,
    // not a permanently-open door.
    expect((await limiter.check('other')).ok).toBe(true);

    // Logged once, not once per request, and never with the token in it.
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).not.toContain('WRONGPASS');
    spy.mockRestore();
  });
});

describe('rate-limit keys', () => {
  it('is stable for one address and different for another', () => {
    const a = rateLimitKey('inspection', '196.0.0.1');
    expect(rateLimitKey('inspection', '196.0.0.1')).toBe(a);
    expect(rateLimitKey('inspection', '196.0.0.2')).not.toBe(a);
  });

  it('never contains the address it was derived from', () => {
    const address = '196.219.44.7';
    expect(rateLimitKey('inspection', address)).not.toContain(address);
    expect(rateLimitKey('inspection', address)).not.toContain('196');
  });

  it('separates scopes so one form cannot exhaust another', () => {
    expect(rateLimitKey('inspection', '1.1.1.1')).not.toBe(rateLimitKey('concierge', '1.1.1.1'));
  });

  it('gives an unknown address a shared bucket rather than a free pass', () => {
    const unknown = rateLimitKey('inspection', null);
    expect(unknown).toBeTruthy();
    expect(rateLimitKey('inspection', null)).toBe(unknown);
    expect(unknown).not.toBe(rateLimitKey('inspection', '1.1.1.1'));
  });
});

describe('client address extraction', () => {
  const from = (init: Record<string, string>) => clientAddressFrom(new Headers(init));

  it('takes the first hop of x-forwarded-for', () => {
    expect(from({ 'x-forwarded-for': '196.0.0.1, 10.0.0.1, 10.0.0.2' })).toBe('196.0.0.1');
  });

  it('falls back through the other proxy headers in order', () => {
    expect(from({ 'x-real-ip': '196.0.0.9' })).toBe('196.0.0.9');
    expect(from({ 'cf-connecting-ip': '196.0.0.8' })).toBe('196.0.0.8');
  });

  it('returns null when no header carries an address', () => {
    expect(from({})).toBeNull();
    expect(from({ 'x-forwarded-for': '' })).toBeNull();
    expect(from({ 'x-forwarded-for': '   ' })).toBeNull();
  });
});
