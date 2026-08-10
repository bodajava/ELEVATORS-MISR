import { describe, expect, it } from 'vitest';

import { UNAMBIGUOUS_ALPHABET, randomCode, randomToken } from '@/lib/security/random';

describe('randomCode', () => {
  it('draws the requested length from the given alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = randomCode(8, UNAMBIGUOUS_ALPHABET);
      expect(code, code).toHaveLength(8);
      for (const char of code) expect(UNAMBIGUOUS_ALPHABET, code).toContain(char);
    }
  });

  it('defaults to the unambiguous alphabet', () => {
    const code = randomCode(12);
    for (const char of code) expect(UNAMBIGUOUS_ALPHABET).toContain(char);
  });

  it('is not sequential or constant: 2000 draws collide zero times', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(randomCode(8));
    expect(seen.size).toBe(2000);
  });

  it('spreads across a small alphabet rather than favouring a subset (no modulo bias)', () => {
    // A 3-symbol alphabet makes modulo bias from a naive `Math.random() * n | 0` implementation
    // show up fast — the excluded end of the range is under-represented within a few hundred
    // draws. `randomInt`'s rejection sampling must not reproduce that.
    const alphabet = 'ABC';
    const counts = { A: 0, B: 0, C: 0 };
    const draws = 6000;
    for (let i = 0; i < draws; i++) {
      const [char] = randomCode(1, alphabet);
      counts[char as keyof typeof counts]++;
    }
    for (const count of Object.values(counts)) {
      expect(count / draws).toBeGreaterThan(0.28);
      expect(count / draws).toBeLessThan(0.38);
    }
  });

  it('returns an empty string for length 0 rather than throwing', () => {
    expect(randomCode(0)).toBe('');
  });
});

describe('randomToken', () => {
  it('is URL-safe: no +, / or = padding', () => {
    for (let i = 0; i < 200; i++) {
      const token = randomToken();
      expect(token, token).not.toMatch(/[+/=]/);
    }
  });

  it('scales length with the requested byte count', () => {
    // base64url: 4 characters per 3 bytes, rounded up, no padding.
    expect(randomToken(3)).toHaveLength(4);
    expect(randomToken(24)).toHaveLength(32);
  });

  it('is not constant or sequential: 2000 draws collide zero times', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(randomToken());
    expect(seen.size).toBe(2000);
  });
});
