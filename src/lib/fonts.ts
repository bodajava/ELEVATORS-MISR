import { Alexandria, Bricolage_Grotesque, Geist_Mono, Schibsted_Grotesk } from 'next/font/google';

/**
 * Bilingual type system — "plan and annotation".
 *
 * The idea: a panorama elevator is an engineered object placed into architecture. The type
 * behaves like an architectural drawing — a strong grotesque for the object itself, and a
 * monospace for the annotations around it (floor numbers, counts, reference codes).
 *
 * Display — Bricolage Grotesque. Variable across optical size, width and weight, so headlines
 * can be set tight and narrow (echoing the vertical shaft) while small text stays open. It has
 * real character in its terminals; it is not a neutral system face and it is not the safe
 * luxury serif every elevator company reaches for.
 *
 * Body — Schibsted Grotesk. Quiet, warm, high x-height; recedes so the photography leads.
 *
 * Arabic — Alexandria. Named for the Egyptian city and drawn by Arabic type designers as a
 * contemporary geometric family covering both scripts. Choosing it over a generic Arabic
 * fallback is the difference between Arabic that was designed and Arabic that was enabled.
 *
 * Mono — Geist Mono, for the annotation layer only: floor markers, indices, counts.
 */

export const displayLatin = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display-latin',
  // No `weight`: this loads the variable font, which is required for `axes`. The width axis
  // is what lets headlines be condensed toward the vertical proportion of a shaft, and the
  // optical-size axis keeps small display text from inheriting those tight headline curves.
  axes: ['opsz', 'wdth'],
});

export const bodyLatin = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-body-latin',
});

/** Covers both display and body in Arabic — one family, deliberately. */
export const arabic = Alexandria({
  subsets: ['arabic', 'latin'],
  weight: ['200', '300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-arabic',
});

export const monoLatin = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono-latin',
});

/**
 * Font variables for `<html className>`.
 *
 * All four are declared in both locales so a bilingual string — a Latin reference code on an
 * Arabic page, the Arabic wordmark on an English page — renders in the right face rather than
 * dropping to a system fallback. The CSS stacks put the matching script first.
 */
export const fontVariables = [
  displayLatin.variable,
  bodyLatin.variable,
  arabic.variable,
  monoLatin.variable,
].join(' ');
