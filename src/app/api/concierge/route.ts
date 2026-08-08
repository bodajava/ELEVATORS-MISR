import { streamText } from 'ai';

import { MissingEnvError } from '@/lib/env';
import {
  MAX_OUTPUT_TOKENS,
  conciergeRequestSchema,
  fenceUserContent,
  redactPersonalData,
  systemPrompt,
} from '@/lib/concierge/policy';
import { conciergeAvailability, resolveModel } from '@/lib/concierge/provider';
import { clientAddressFrom, getRateLimiter, rateLimitKey } from '@/lib/inspection/rate-limit';

/**
 * The concierge endpoint.
 *
 * ── Order of checks ─────────────────────────────────────────────────────────
 *  1. **Availability** — no key, no endpoint. 503 with a machine-readable reason, so the UI
 *     can say "not available" rather than showing a broken chat.
 *  2. **Rate limit** — before parsing and long before the model, so a flood costs a hash.
 *     Keyed on a hash of the client address, never the address itself.
 *  3. **Validation** — Zod, with hard length and turn limits.
 *  4. **Redaction** — anything that looks like a phone number or an email is stripped from
 *     every message *before* it leaves this server. The form is where contact details belong.
 *  5. **Fencing** — visitor text is wrapped in a delimited block the system prompt names as
 *     untrusted data.
 *
 * ── What this route cannot do ───────────────────────────────────────────────
 * No tools are registered, so the model cannot call anything. It has no database handle, no
 * filesystem access and no ability to send mail. The response is a plain text stream, so
 * nothing it returns can be interpreted as markup by the client — the UI renders it into a
 * text node.
 *
 * Nothing is persisted. There is no conversation store, and the transcript exists only for the
 * duration of the request.
 */

export const runtime = 'nodejs';
/** Never cached — every request is a fresh conversation turn. */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  /* 1 ─ availability */
  const availability = conciergeAvailability();
  if (!availability.available) {
    return Response.json(
      { error: 'unavailable', reason: availability.reason },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  }

  /* 2 ─ rate limit */
  try {
    const decision = await getRateLimiter().check(
      rateLimitKey('concierge', clientAddressFrom(request.headers))
    );
    if (!decision.ok) {
      return Response.json(
        { error: 'rate-limited', retryAfterSeconds: decision.retryAfterSeconds },
        { status: 429, headers: { 'retry-after': String(decision.retryAfterSeconds) } }
      );
    }
  } catch (error) {
    // `RATE_LIMIT_SALT` is required in production. Fail closed: an unmetered AI endpoint is
    // a billing incident waiting to happen.
    if (error instanceof MissingEnvError) {
      console.error(`[concierge] refused: ${error.key} is not configured.`);
      return Response.json({ error: 'unavailable', reason: 'no-key' }, { status: 503 });
    }
    throw error;
  }

  /* 3 ─ validation */
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid' }, { status: 400 });
  }

  const parsed = conciergeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'invalid' }, { status: 400 });
  }

  const { messages, locale } = parsed.data;

  /* 4 + 5 ─ redact, then fence */
  const prepared = messages.map((message) => ({
    role: message.role,
    content:
      message.role === 'user'
        ? fenceUserContent(redactPersonalData(message.content))
        : redactPersonalData(message.content),
  }));

  const model = resolveModel();
  if (!model) {
    return Response.json({ error: 'unavailable', reason: 'no-key' }, { status: 503 });
  }

  try {
    const result = streamText({
      model,
      system: systemPrompt(locale),
      messages: prepared,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      // Low, not zero: this is a factual assistant with a narrow brief, and the failure mode
      // that matters is invention, not repetition.
      temperature: 0.3,
    });

    // A plain text stream. Deliberately not a structured protocol: the client renders the
    // result into a text node, so there is no path by which model output becomes markup.
    return result.toTextStreamResponse({
      headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
    });
  } catch (error) {
    // Never surface the provider's error text — it can carry request details.
    console.error('[concierge] provider call failed:', (error as Error)?.name);
    return Response.json({ error: 'provider' }, { status: 502 });
  }
}
