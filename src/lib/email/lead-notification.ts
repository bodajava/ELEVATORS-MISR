import 'server-only';
import { Resend } from 'resend';

import { inspectionForm } from '@/content/inspection';
import {
  isLeadNotificationConfigured,
  leadFromEmail,
  leadNotificationEmail,
  resendApiKey,
} from '@/lib/env';
import type { InspectionRequest } from '@/lib/inspection/schema';

/**
 * Lead notification — one email to the team's own inbox when a request lands.
 *
 * This is not the visitor-facing confirmation (that never promises a response time or leaves
 * this file at all) and it is not a reply channel to the visitor — the site collects no email
 * address, ever, and this module does not either. It is purely outbound, from a domain the
 * business controls to an inbox the business controls, telling them a lead exists.
 *
 * ── Why this can never fail a submission ─────────────────────────────────────
 * The lead is already durably written to the database by the time this runs — see
 * `actions.ts`, which calls this only after `getInspectionStore().create()` has succeeded.
 * A visitor whose request was recorded correctly must never see an error because the *email
 * about* that request could not be sent. Every failure here is caught, logged loudly, and
 * swallowed; it is never rethrown.
 *
 * ── Why it can be blank ───────────────────────────────────────────────────────
 * Unconfigured is a supported state, the same way `DATABASE_URL` being absent locally is —
 * see `isLeadNotificationConfigured()`. A fresh clone with no Resend account still runs the
 * full submission path; it just does not send this one email.
 */

let client: Resend | null = null;

function getClient(): Resend {
  const key = resendApiKey();
  // Guarded by `isLeadNotificationConfigured()` at the one call site — this assertion exists
  // so a future caller who skips that check fails loudly instead of constructing a client
  // with an empty string.
  if (!key) throw new Error('resendApiKey() was null — isLeadNotificationConfigured() guards this');
  client ??= new Resend(key);
  return client;
}

function renderText(request: InspectionRequest, reference: string): string {
  const setting = inspectionForm.setting.options[request.setting].en;
  const finish = inspectionForm.finish.options[request.finish].en;
  const language = request.locale === 'ar' ? 'Arabic' : 'English';

  return [
    `Reference: ${reference}`,
    `Name: ${request.name}`,
    `Phone: ${request.phone}`,
    `Area: ${request.area}`,
    `Setting: ${setting}`,
    `Finish: ${finish}`,
    `Language: ${language}`,
    request.notes ? `Notes: ${request.notes}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

export async function notifyLead(request: InspectionRequest, reference: string): Promise<void> {
  if (!isLeadNotificationConfigured()) return;

  try {
    const { error } = await getClient().emails.send({
      // `!` is safe: `isLeadNotificationConfigured()` above already confirmed both are set.
      from: leadFromEmail()!,
      to: leadNotificationEmail()!,
      subject: `New site inspection request — ${reference}`,
      text: renderText(request, reference),
    });
    // The SDK reports provider-side failures (bad domain, suspended key) in `error` rather
    // than throwing — a rejected promise only covers network-level failures.
    if (error) console.error('[inspection] lead notification rejected by Resend:', error.message);
  } catch (error) {
    console.error('[inspection] lead notification failed to send:', (error as Error)?.name);
  }
}
