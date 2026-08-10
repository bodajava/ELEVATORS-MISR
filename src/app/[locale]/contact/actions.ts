'use server';

import { headers } from 'next/headers';

import { DatabaseNotConfiguredError } from '@/lib/db/client';
import { getInspectionStore } from '@/lib/db/inspection-repository';
import { notifyLead } from '@/lib/email/lead-notification';
import { MissingEnvError } from '@/lib/env';
import { HONEYPOT_FIELD, RENDERED_AT_FIELD, inspectHoneypot } from '@/lib/inspection/honeypot';
import { clientAddressFrom, getRateLimiter, rateLimitKey } from '@/lib/inspection/rate-limit';
import { fieldErrors, inspectionRequestSchema } from '@/lib/inspection/schema';
import { generateReference } from '@/lib/inspection/reference';
import { isLocale, defaultLocale, type Locale } from '@/i18n/config';

/**
 * The inspection request action.
 *
 * This is the trust boundary. Everything the browser sends is hostile input until this
 * function has finished with it, and the client-side validation in the form component is
 * treated as decoration — it is re-run here in full, from the same schema, against the raw
 * `FormData`.
 *
 * ── Order of checks, and why it is this order ───────────────────────────────
 *  1. **Locale** — decides the language of every message below, so it goes first.
 *  2. **Honeypot** — free, and returns a fake success. Doing it before the rate limiter means
 *     bot traffic never consumes a real visitor's budget on a shared NAT.
 *  3. **Rate limit** — before parsing, so a flood costs a hash rather than a Zod parse.
 *  4. **Validation** — the schema decides what the payload is.
 *  5. **Persistence** — last, and the only step that can fail after the visitor is committed.
 *
 * ── What is never returned ──────────────────────────────────────────────────
 * No internal row id, no stack trace, no database error text, no indication of which trap
 * fired. The visitor gets a reference or one of four states, and nothing that describes the
 * inside of the system.
 */

/**
 * What the visitor typed, echoed back so a rejected submission does not erase it.
 *
 * React re-renders the form when the action returns, which resets every uncontrolled input
 * to its `defaultValue` — so without this, correcting one bad field means retyping all of
 * them. Only the visitor's own input is echoed: never the honeypot fields, and never
 * anything derived on the server.
 */
export type SubmittedValues = {
  name: string;
  phone: string;
  area: string;
  setting: string;
  finish: string;
  notes: string;
  consent: boolean;
};

export type InspectionState =
  | { status: 'idle' }
  | { status: 'success'; reference: string }
  | { status: 'invalid'; errors: Record<string, string>; values: SubmittedValues }
  | { status: 'rate-limited'; values: SubmittedValues }
  | { status: 'unavailable'; values: SubmittedValues }
  | { status: 'error'; values: SubmittedValues };

const asString = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '');

function submittedValues(formData: FormData): SubmittedValues {
  return {
    name: asString(formData.get('name')),
    phone: asString(formData.get('phone')),
    area: asString(formData.get('area')),
    setting: asString(formData.get('setting')),
    finish: asString(formData.get('finish')),
    notes: asString(formData.get('notes')),
    consent: formData.get('consent') === 'on' || formData.get('consent') === 'true',
  };
}

export async function submitInspectionRequest(
  _previous: InspectionState,
  formData: FormData
): Promise<InspectionState> {
  const rawLocale = String(formData.get('locale') ?? '');
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const values = submittedValues(formData);

  /* 1 ─ honeypot. A trip returns success with a reference that was never stored. */
  const verdict = inspectHoneypot({
    decoy: formData.get(HONEYPOT_FIELD),
    renderedAt: formData.get(RENDERED_AT_FIELD),
  });
  if (verdict.tripped) {
    return { status: 'success', reference: generateReference() };
  }

  /* 2 ─ rate limit, keyed on a hash of the client address. */
  try {
    const requestHeaders = await headers();
    const decision = await getRateLimiter().check(
      rateLimitKey('inspection', clientAddressFrom(requestHeaders))
    );
    if (!decision.ok) return { status: 'rate-limited', values };
  } catch (error) {
    // `RATE_LIMIT_SALT` is required in production and its absence throws here. Letting that
    // propagate would surface the whole page's error boundary — a deployment mistake
    // rendered as a broken website. Fail closed instead: refuse the submission, tell the
    // visitor plainly that nothing was recorded, and make the cause loud in the logs.
    // Accepting submissions with the limiter disabled is not an option.
    if (error instanceof MissingEnvError) {
      console.error(`[inspection] refused a request: ${error.key} is not configured.`);
      return { status: 'unavailable', values };
    }
    throw error;
  }

  /* 3 ─ validation. The same schema the browser ran, re-run on raw form data. */
  const parsed = inspectionRequestSchema.safeParse({
    name: formData.get('name') ?? '',
    phone: formData.get('phone') ?? '',
    area: formData.get('area') ?? '',
    setting: formData.get('setting') ?? undefined,
    finish: formData.get('finish') ?? undefined,
    notes: formData.get('notes') ?? undefined,
    // An unchecked checkbox is absent from FormData entirely, which `z.literal(true)` must
    // see as `false` rather than `undefined` for the message to be the right one.
    consent: values.consent,
    locale,
  });

  if (!parsed.success) {
    return { status: 'invalid', errors: fieldErrors(parsed.error, locale), values };
  }

  /* 4 ─ persist. */
  try {
    const { reference } = await getInspectionStore().create(parsed.data);
    // Awaited, not fired-and-forgotten: a serverless runtime can freeze the function the
    // instant this action returns, and an unawaited promise in flight at that moment may
    // simply never run. `notifyLead` swallows every error of its own — see its own
    // documentation — so awaiting it here cannot turn a successful submission into a failed
    // one; it only guarantees the send is attempted before the visitor sees success.
    await notifyLead(parsed.data, reference);
    return { status: 'success', reference };
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      // Deployment fault, not visitor fault, and the visitor is told plainly that nothing was
      // recorded rather than being shown a confirmation for a lead that does not exist.
      console.error('[inspection] refused a request: DATABASE_URL is not configured.');
      return { status: 'unavailable', values };
    }
    // Never log the payload: every field on it is personal data.
    console.error('[inspection] failed to persist a request:', (error as Error)?.name);
    return { status: 'error', values };
  }
}
