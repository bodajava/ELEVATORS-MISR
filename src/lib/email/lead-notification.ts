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
import { getInspectionStore } from '@/lib/db/inspection-repository';
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
    // Bounded, because this send is awaited inside the visitor's own submission — see the
    // call site in `actions.ts` and the deadline below. Nodemailer's defaults are two minutes
    // for the socket and no limit at all on the greeting, so a Gmail endpoint that accepts a
    // TCP connection and then says nothing would hold the visitor on a spinner until their
    // browser gave up, for a lead that was already safely in the database.
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 10_000,
  });
  return transporter;
}

/**
 * How long the whole notification may take, retries included, before the visitor is answered.
 *
 * The email is not what the visitor is waiting for — their request is already written. This is
 * the outer bound on how long they wait for something that does not concern them, and it is
 * deliberately shorter than the sum of the transport timeouts above: whichever fires first,
 * the submission resolves.
 */
const SEND_DEADLINE_MS = 12_000;

/** Attempts, and the pause before each retry. Bounded by `SEND_DEADLINE_MS` regardless. */
const SEND_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 600;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send, retrying once on a transient failure, and give up at the deadline either way.
 *
 * Retrying is worth doing because the failures this hits are overwhelmingly transient — a
 * refused connection, a socket reset, a 4xx greeting from a busy Gmail endpoint. Retrying
 * *twice* is not: a wrong App Password fails identically every time, and the second attempt
 * only spends the visitor's patience proving it.
 *
 * Returns what happened, so the caller can record it. Never throws.
 */
async function sendWithRetry(
  send: () => Promise<unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const deadline = Date.now() + SEND_DEADLINE_MS;
  let last = 'unknown';

  for (let attempt = 1; attempt <= SEND_ATTEMPTS; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return { ok: false, error: `${last} (deadline)` };

    try {
      // The transport's own timeouts should fire first; this is the backstop for the case
      // where they do not, so the promise cannot outlive the request that is awaiting it.
      await Promise.race([
        send(),
        sleep(remaining).then(() => {
          throw new Error('SendDeadlineExceeded');
        }),
      ]);
      return { ok: true };
    } catch (error) {
      // The class only. An SMTP error can quote the envelope back, and the envelope carries
      // the recipient address; a transport error can quote the connection URL.
      last = (error as Error)?.name || 'Error';
      const code = (error as { code?: string })?.code;
      if (code) last = `${last} (${code})`;

      if (attempt < SEND_ATTEMPTS && Date.now() + RETRY_BACKOFF_MS < deadline) {
        await sleep(RETRY_BACKOFF_MS);
      }
    }
  }

  return { ok: false, error: last };
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
  // Not configured is not a failure, and must not be recorded as one — a deployment that has
  // deliberately not set up email would otherwise fill the unsent report with every lead it
  // ever took.
  if (!isLeadNotificationConfigured()) return;
  if (!(await claimNotification(reference))) return;

  const submittedAt = new Date();

  const outcome = await sendWithRetry(() =>
    getTransporter().sendMail({
      from: `"${brand.name}" <${gmailUser()}>`,
      // Non-null: `isLeadNotificationConfigured()` above already confirmed this is set.
      to: leadNotificationEmail()!,
      subject: `New site inspection request — ${reference}`,
      text: renderLeadEmailText(request, reference, submittedAt),
      html: renderLeadEmailHtml(request, reference, submittedAt),
    })
  );

  if (!outcome.ok) {
    console.error(`[inspection] lead notification failed for ${reference}: ${outcome.error}`);
  }

  // Recorded against the row so an operator can find the leads nobody was told about — see
  // `scripts/unsent-notifications.mjs`. Best-effort in its own right: a failure to write the
  // *outcome* must not turn into a visitor-facing error either, so this swallows too. The
  // lead itself is already durable; this is bookkeeping about the email.
  try {
    await getInspectionStore().recordNotification(
      reference,
      outcome.ok ? { sentAt: new Date() } : { error: outcome.error }
    );
  } catch (error) {
    console.error(
      `[inspection] could not record the notification outcome for ${reference}:`,
      (error as Error)?.name
    );
  }
}
