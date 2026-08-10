import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

import { brand } from '@/content/company';
import {
  gmailAppPassword,
  gmailUser,
  isLeadNotificationConfigured,
  leadNotificationEmail,
} from '@/lib/env';
import { renderLeadEmailHtml, renderLeadEmailText } from '@/lib/email/lead-notification-template';
import type { InspectionRequest } from '@/lib/inspection/schema';
import { getRedis } from '@/lib/redis/client';
import { randomToken } from '@/lib/security/random';

/**
 * Lead notification — one email to the team's own inbox when a request lands.
 *
 * This is not the visitor-facing confirmation (that never promises a response time or leaves
 * this file at all) and it is not a reply channel to the visitor — the site collects no email
 * address, ever, and this module does not either. It is purely outbound, from the team's own
 * Gmail account to an inbox the business controls, telling them a lead exists.
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
 * see `isLeadNotificationConfigured()`. A fresh clone with no Gmail App Password still runs
 * the full submission path; it just does not send this one email.
 *
 * ── Why a reference can only ever send one email ──────────────────────────────
 * A server action can be invoked more than once for what a visitor experiences as a single
 * submit — a network retry, or (documented React behaviour) a double-invoke in some
 * conditions — and the database write already tolerates that shape: `reference` is unique, so
 * a genuine duplicate simply cannot occur there. This has no such constraint of its own, so
 * before sending it claims `notified:<reference>` in Redis with `SET ... NX`, which only one
 * concurrent caller can ever win. Best-effort: without Redis configured, this step is skipped
 * entirely and the function behaves exactly as it did before this guard existed — a real
 * duplicate here costs the team one extra email, never a lost lead or a visitor-facing error.
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const user = gmailUser();
  const pass = gmailAppPassword();
  // Guarded by `isLeadNotificationConfigured()` at the one call site — this assertion exists
  // so a future caller who skips that check fails loudly instead of authenticating with an
  // empty string.
  if (!user || !pass) {
    throw new Error(
      'gmailUser()/gmailAppPassword() were null — isLeadNotificationConfigured() guards this'
    );
  }

  transporter ??= nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return transporter;
}

/** Redis TTL for the dedupe claim — generous, since the cost of a false negative (letting a
    genuine duplicate through once in 24h) is one extra email, not a correctness failure. */
const DEDUPE_TTL_SECONDS = 24 * 60 * 60;

/** True if this call should proceed to send — false if another call already claimed it, or
    Redis is not configured and the guard is skipped entirely (fails open, not closed). */
async function claimNotification(reference: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;

  try {
    const claimed = await redis.set(`notified:${reference}`, randomToken(), {
      nx: true,
      ex: DEDUPE_TTL_SECONDS,
    });
    return claimed !== null;
  } catch (error) {
    // A Redis outage must not block a notification any more than it blocks the rate limiter's
    // own instrumentation-level fallback — fail open, and let a possible duplicate through
    // rather than silently dropping a lead notification because a cache was unreachable.
    console.error('[inspection] dedupe check failed, sending without it:', (error as Error)?.name);
    return true;
  }
}

export async function notifyLead(request: InspectionRequest, reference: string): Promise<void> {
  if (!isLeadNotificationConfigured()) return;
  if (!(await claimNotification(reference))) return;

  const submittedAt = new Date();

  try {
    await getTransporter().sendMail({
      from: `"${brand.name}" <${gmailUser()}>`,
      // Non-null: `isLeadNotificationConfigured()` above already confirmed this is set.
      to: leadNotificationEmail()!,
      subject: `New site inspection request — ${reference}`,
      text: renderLeadEmailText(request, reference, submittedAt),
      html: renderLeadEmailHtml(request, reference, submittedAt),
    });
  } catch (error) {
    console.error('[inspection] lead notification failed to send:', (error as Error)?.name);
  }
}
