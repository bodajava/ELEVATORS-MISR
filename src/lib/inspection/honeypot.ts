/**
 * Honeypot.
 *
 * Two independent traps, both invisible to a person using the form normally:
 *
 *  1. **A decoy field.** Named `company-website` — plausible enough that a form-filling bot
 *     will populate it, and meaningless to a human, who never sees it. Any value at all is a
 *     rejection.
 *  2. **A time-of-render check.** The rendered form carries the moment it was issued. A
 *     submission arriving faster than a person could read the labels did not come from a
 *     person.
 *
 * ── Why the decoy is not `display: none` ────────────────────────────────────
 * `display: none` and `hidden` are the first things a competent bot filters on. The field is
 * instead removed from the accessibility tree (`aria-hidden`, `tabIndex={-1}`) and moved out
 * of the viewport, so it is present in the DOM and in the layout as far as naive automation
 * can tell. `autoComplete="off"` matters too: a password manager filling it would fail a real
 * visitor, which is the one failure mode a honeypot must not have.
 *
 * ── Failure behaviour ───────────────────────────────────────────────────────
 * A tripped honeypot returns the *success* state without writing anything. Telling a bot it
 * was detected is free feedback for tuning the next attempt. The cost of the lie is that a
 * false positive silently loses a lead — which is why the time threshold is deliberately
 * slack and why the decoy is not merely hidden.
 */

/** Field name of the decoy input. Must match between the form and the action. */
export const HONEYPOT_FIELD = 'company-website';

/** Field name carrying the render timestamp, in epoch milliseconds. */
export const RENDERED_AT_FIELD = 'form-rendered-at';

/**
 * Minimum plausible fill time.
 *
 * Three seconds. A person has to read a heading, four labels and a consent line before they
 * can have typed a name, a phone number and an area — nobody does that in under three
 * seconds, and a slow, careful visitor is nowhere near the threshold. Set low on purpose:
 * this trap should only ever catch something that did not read the page.
 */
export const MIN_FILL_MS = 3_000;

/**
 * Maximum age of a rendered form.
 *
 * Twelve hours. Past that the timestamp is more likely a replayed capture than a tab left
 * open over lunch. Generous, because a genuinely abandoned-then-resumed tab is a real
 * pattern and losing that lead would be worse than accepting a stale one.
 */
export const MAX_FORM_AGE_MS = 12 * 60 * 60 * 1000;

export type HoneypotVerdict =
  | { tripped: false }
  | { tripped: true; reason: 'decoy-filled' | 'too-fast' | 'stale' | 'malformed-timestamp' };

export function inspectHoneypot(
  fields: { decoy: unknown; renderedAt: unknown },
  now: number = Date.now()
): HoneypotVerdict {
  const decoy = typeof fields.decoy === 'string' ? fields.decoy.trim() : '';
  if (decoy !== '') return { tripped: true, reason: 'decoy-filled' };

  const renderedAt = Number(fields.renderedAt);
  if (!Number.isFinite(renderedAt) || renderedAt <= 0) {
    return { tripped: true, reason: 'malformed-timestamp' };
  }

  const elapsed = now - renderedAt;
  // A timestamp from the future is clock skew or tampering; treat generously up to a minute,
  // since a client clock running slightly fast is common and not the visitor's fault.
  if (elapsed < -60_000) return { tripped: true, reason: 'malformed-timestamp' };
  if (elapsed < MIN_FILL_MS) return { tripped: true, reason: 'too-fast' };
  if (elapsed > MAX_FORM_AGE_MS) return { tripped: true, reason: 'stale' };

  return { tripped: false };
}
