import 'server-only';

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

/**
 * The concierge's model, behind an adapter.
 *
 * ── Why an adapter and not a direct import ──────────────────────────────────
 * The provider is a deployment decision, not a code decision. Whoever runs this site sets
 * `CONCIERGE_PROVIDER` and a key; nothing else in the codebase names Anthropic or OpenAI. That
 * also makes the whole feature testable without a network: `resolveModel` is pure with respect
 * to its environment, and the route takes the model as an argument.
 *
 * ── Unavailable is a real state, not an error ───────────────────────────────
 * With no key configured the site still builds, still renders, and the concierge shows a
 * plain "not available" message. It does **not** fall back to canned answers: a scripted reply
 * presented as an assistant is worse than no assistant, because a visitor cannot tell the
 * difference and will act on it.
 */

export type ConciergeAvailability =
  | { available: true; provider: 'anthropic' | 'openai'; modelId: string }
  | { available: false; reason: 'no-provider' | 'no-key' | 'unknown-provider' };

const DEFAULT_MODEL = {
  anthropic: 'claude-sonnet-4-5',
  openai: 'gpt-4.1-mini',
} as const;

function read(key: string): string | null {
  const value = process.env[key];
  return value === undefined || value.trim() === '' ? null : value.trim();
}

/** What the UI needs to know, without ever touching a key. */
export function conciergeAvailability(): ConciergeAvailability {
  const provider = (read('CONCIERGE_PROVIDER') ?? '').toLowerCase();

  if (provider === '') {
    // Infer from whichever key is present, so a single env var is enough to switch it on.
    if (read('ANTHROPIC_API_KEY')) {
      return {
        available: true,
        provider: 'anthropic',
        modelId: read('CONCIERGE_MODEL') ?? DEFAULT_MODEL.anthropic,
      };
    }
    if (read('OPENAI_API_KEY')) {
      return {
        available: true,
        provider: 'openai',
        modelId: read('CONCIERGE_MODEL') ?? DEFAULT_MODEL.openai,
      };
    }
    return { available: false, reason: 'no-provider' };
  }

  if (provider === 'anthropic') {
    if (!read('ANTHROPIC_API_KEY')) return { available: false, reason: 'no-key' };
    return {
      available: true,
      provider: 'anthropic',
      modelId: read('CONCIERGE_MODEL') ?? DEFAULT_MODEL.anthropic,
    };
  }

  if (provider === 'openai') {
    if (!read('OPENAI_API_KEY')) return { available: false, reason: 'no-key' };
    return {
      available: true,
      provider: 'openai',
      modelId: read('CONCIERGE_MODEL') ?? DEFAULT_MODEL.openai,
    };
  }

  return { available: false, reason: 'unknown-provider' };
}

/**
 * Build the model. Returns null when unavailable rather than throwing, so a missing key is a
 * 503 with a clear body instead of an unhandled exception in a route handler.
 *
 * The key is read here, on the server, and never leaves it. Nothing in this module is
 * importable from a client component — `server-only` makes that a build error.
 */
export function resolveModel(): LanguageModel | null {
  const state = conciergeAvailability();
  if (!state.available) return null;

  if (state.provider === 'anthropic') {
    const anthropic = createAnthropic({ apiKey: read('ANTHROPIC_API_KEY') as string });
    return anthropic(state.modelId);
  }

  const openai = createOpenAI({ apiKey: read('OPENAI_API_KEY') as string });
  return openai(state.modelId);
}
