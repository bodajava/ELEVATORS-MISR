import { randomBytes, randomInt } from 'node:crypto';

/**
 * Secure random-code helpers — one audited place for "generate an unguessable string",
 * built on `node:crypto`'s CSPRNG rather than `Math.random`, which is not cryptographically
 * secure and must never back a public reference, a token, or a rate-limit or dedupe key.
 *
 * Two shapes, because "unguessable" means different things to a human and to a system:
 *
 *  - `randomCode` draws from a small, human-safe alphabet — sayable over the phone, writable
 *    on paper, typed back without ambiguity. This is what `reference.ts` uses for the public
 *    lead reference a visitor is shown and may repeat back.
 *  - `randomToken` is a full-entropy byte string, base64url-encoded — never shown to a
 *    visitor, never spoken aloud, used only inside the system (an idempotency key, a lock
 *    value, a nonce) where density matters and readability does not.
 */

/**
 * 30 symbols, none of them confusable when spoken or handwritten.
 *
 * Excluded and why: `O`/`0` and `I`/`L`/`1` are the classic misreadings, and `U` is dropped so
 * no code can accidentally spell something unfortunate. Shared here rather than duplicated
 * per call site, so every human-facing code in this codebase carries the same reasoning.
 */
export const UNAMBIGUOUS_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * `length` symbols drawn from `alphabet`, using `randomInt`'s own rejection sampling — never
 * `Math.random() * alphabet.length`, which is both a weak PRNG and modulo-biased toward the
 * start of the alphabet.
 */
export function randomCode(length: number, alphabet: string = UNAMBIGUOUS_ALPHABET): string {
  let code = '';
  for (let i = 0; i < length; i++) code += alphabet[randomInt(alphabet.length)];
  return code;
}

/**
 * A full-entropy, URL-safe token — for idempotency keys, lock values and nonces, never for
 * anything a person reads back. `byteLength` is raw entropy before encoding; base64url costs
 * roughly 4 characters per 3 bytes, so the default (24 bytes → 32 characters) is 192 bits,
 * far past the point where brute-forcing it is the attacker's problem.
 */
export function randomToken(byteLength = 24): string {
  return randomBytes(byteLength).toString('base64url');
}
