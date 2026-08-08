import { randomInt } from 'node:crypto';

/**
 * Public request references.
 *
 * The visitor is shown one of these after submitting, and may read it back over the phone.
 * That makes it a public identifier, so it has to satisfy two things at once:
 *
 *  1. **Unguessable.** It must not be sequential or derived from time. A sequential
 *     reference tells anyone holding one roughly how many requests exist and lets them
 *     enumerate their neighbours — the row id stays internal for exactly this reason.
 *  2. **Sayable.** It gets read aloud, written on paper, and typed back. So: no lowercase,
 *     no `I/L/O/U`, no `0/1`, and a hyphen every four characters.
 *
 * Crockford's base32 alphabet minus `U`, `0` and `1` leaves 30 symbols that survive both
 * constraints. Eight of them is 30^8 ≈ 6.6 × 10^11 — at a realistic lead volume the chance
 * of any collision ever is negligible, and the repository retries on the unique constraint
 * anyway rather than trusting that arithmetic.
 *
 * `randomInt` is the CSPRNG, not `Math.random`. Modulo bias is avoided by `randomInt`'s own
 * rejection sampling.
 */

/**
 * 30 symbols, none of them confusable when spoken or handwritten.
 *
 * Excluded and why: `O`/`0` and `I`/`L`/`1` are the classic misreadings, and `U` is dropped
 * so no reference can accidentally spell something unfortunate.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

const PREFIX = 'EE';
const GROUPS = 2;
const GROUP_SIZE = 4;

/** e.g. `EE-4K7P-2QX9`. */
export function generateReference(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let group = '';
    for (let i = 0; i < GROUP_SIZE; i++) group += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(group);
  }
  return [PREFIX, ...groups].join('-');
}

const REFERENCE_PATTERN = new RegExp(
  `^${PREFIX}-[${ALPHABET}]{${GROUP_SIZE}}-[${ALPHABET}]{${GROUP_SIZE}}$`
);

export function isReference(value: string): boolean {
  return REFERENCE_PATTERN.test(value);
}

/**
 * Accept a reference the way a human actually offers it back: lowercase, spaces or no
 * separator instead of hyphens, prefix present or missing.
 *
 * Returns the canonical form, or null if the input cannot be one. Deliberately strict about
 * the symbols themselves — the excluded letters are excluded precisely so a reference
 * containing one is a typo rather than something to silently reinterpret.
 */
export function canonicaliseReference(input: string): string | null {
  const body = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(new RegExp(`^${PREFIX}`), '');

  if (body.length !== GROUPS * GROUP_SIZE) return null;
  if ([...body].some((c) => !ALPHABET.includes(c))) return null;

  return `${PREFIX}-${body.slice(0, GROUP_SIZE)}-${body.slice(GROUP_SIZE)}`;
}

/** Exposed for tests: the symbol set the reference draws from. */
export const referenceAlphabet = ALPHABET;
