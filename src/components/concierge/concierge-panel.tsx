'use client';

import { useEffect, useRef, useState } from 'react';

import { conciergeCopy } from '@/components/concierge/copy';
import { HandoffForm, type HandoffReason } from '@/components/concierge/handoff-form';
import type { Locale } from '@/i18n/config';
import { MAX_MESSAGE_CHARS } from '@/lib/concierge/policy';
import { cn } from '@/lib/utils';

type Turn = { role: 'user' | 'assistant'; content: string };

/**
 * The concierge panel — everything a visitor only needs once they have opened it.
 *
 * Split out of the launcher and loaded with `next/dynamic`, so the transcript, the streaming
 * reader and the composer are not in the initial bundle for the majority of visitors who never
 * open the assistant.
 *
 * ── Rendering ───────────────────────────────────────────────────────────────
 * Replies arrive as a plain text stream and are written into React text nodes. There is no
 * markdown renderer and no `dangerouslySetInnerHTML` anywhere here, so nothing the model
 * produces can become markup, a link, or a script.
 *
 * ── Placement ───────────────────────────────────────────────────────────────
 * Anchored above `--bottom-nav-space`, which is the mobile navigation's reserved height and 0
 * above `lg` — so one rule keeps it clear of the bottom bar on a phone and off the page edge
 * on a desktop. On mobile it is a bottom sheet; on desktop a compact anchored panel.
 */
export function ConciergePanel({
  locale,
  available,
  onClose,
}: {
  locale: Locale;
  available: boolean;
  onClose: () => void;
}) {
  const t = conciergeCopy[locale];
  // The assistant speaks first. A visitor never opens this onto an empty box, and the opening
  // line is a constant rather than a generated turn: it costs nothing, it is identical every
  // time, and no model can reword it into a promise. It is not sent to the provider either —
  // `send` posts the visitor's turns, and this one has no bearing on the answer.
  const [turns, setTurns] = useState<Turn[]>([{ role: 'assistant', content: t.greeting }]);
  const [draft, setDraft] = useState('');
  /** Non-null while the in-chat human follow-up form is open, holding why it was opened. */
  const [handoff, setHandoff] = useState<HandoffReason | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'streaming' | 'error' | 'rate-limited' | 'unavailable'
  >(available ? 'idle' : 'unavailable');

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    // Opening the panel used to scroll straight to the bottom, which parked the greeting
    // mid-sentence: it is four lines long, the box shows three, and the first thing a visitor
    // read was "…would rather speak to a person". Before there is a conversation there is
    // nothing below to follow, so the log stays at the top and the greeting starts at its
    // first word. Following the latest turn only makes sense once turns are arriving.
    log.scrollTop = turns.length > 1 ? log.scrollHeight : 0;
  }, [turns, status]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(question: string) {
    const trimmed = question.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!trimmed || status === 'streaming' || !available) return;

    const next: Turn[] = [...turns, { role: 'user', content: trimmed }];
    setTurns(next);
    setDraft('');
    setStatus('streaming');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    // A stalled provider must not leave the panel spinning forever.
    const timeout = window.setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // The greeting is interface copy, not a turn the model produced, so it is not sent
        // back to it. Everything after it is the real conversation.
        body: JSON.stringify({ messages: next.slice(1), locale }),
        signal: controller.signal,
      });

      if (response.status === 429) return setStatus('rate-limited');
      if (response.status === 503) return setStatus('unavailable');
      if (!response.ok || !response.body) return setStatus('error');

      setTurns((current) => [...current, { role: 'assistant', content: '' }]);

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setTurns((current) => {
          const copy = [...current];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant')
            copy[copy.length - 1] = { ...last, content: last.content + value };
          return copy;
        });
      }
      setStatus('idle');
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      setStatus('error');
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const notice =
    status === 'unavailable'
      ? t.unavailable
      : status === 'rate-limited'
        ? t.rateLimited
        : status === 'error'
          ? t.error
          : null;

  return (
    <div
      role="dialog"
      aria-label={t.title}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
      // Lenis smooths the *page* by cancelling wheel events on the document, and it cancels
      // them for nested scrollers too unless it is told not to. Without this attribute the
      // transcript below had no wheel scroll at all: it was scrollable by every measure —
      // `overflow-y: auto`, content taller than the box — and the wheel simply scrolled the
      // page behind it instead. `data-lenis-prevent` hands wheel events inside this panel
      // back to the browser. Keyboard and drag scrolling were never affected, which is why
      // the fault only ever showed up with a mouse or trackpad.
      data-lenis-prevent
      className="fixed start-4 end-4 z-50 flex flex-col overflow-hidden rounded-(--radius-card) glass shadow-float sm:start-auto sm:w-[26rem]"
      style={{ bottom: 'calc(var(--bottom-nav-space) + 4.5rem)', maxHeight: '70vh' }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-rule px-5 py-4">
        <div className="min-w-0">
          <p className="font-display text-base text-ink">{t.title}</p>
          <p className="mt-1 text-xs text-ink-3">{t.subtitle}</p>
        </div>
        {/* The route to a person, always visible and always one tap away. It is not something
            the visitor has to know the right words for, and it does not depend on the model
            being available — the form below works whether or not the assistant answers. */}
        <button
          type="button"
          onClick={() => setHandoff('question')}
          className="duration-fast shrink-0 rounded-(--radius-control) border border-rule px-2.5 py-1.5 text-2xs font-semibold text-ink-2 transition-colors ease-standard hover:border-accent hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t.human}
        </button>
      </div>

      {/* Polite, so a screen reader hears the reply without the stream interrupting on every
          chunk that arrives. */}
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        className="flex-1 overflow-y-auto px-5 py-4"
      >
        <ul className="flex flex-col gap-4">
          {turns.map((turn, index) => (
            <li
              key={index}
              className={cn(
                'max-w-[92%] rounded-(--radius-control) px-3.5 py-2.5 text-sm',
                turn.role === 'user'
                  ? 'ms-auto self-end bg-ink text-paper'
                  : 'bg-paper-raised text-ink-2'
              )}
            >
              {/* Text node. Never markup. */}
              {turn.content}
              {turn.role === 'assistant' && turn.content === '' && status === 'streaming' ? (
                <span className="text-ink-3">{t.thinking}</span>
              ) : null}
            </li>
          ))}
        </ul>

        {/* Openers. Shown only while the greeting is the whole conversation, and they include
            the two things a visitor most often arrives with that are not questions about
            elevators: working hours, and a complaint. */}
        {turns.length === 1 && handoff === null ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {/* Openers exist only when there is something to answer them. With no provider key
                configured they rendered anyway at 50% opacity and did nothing when pressed —
                four dead grey chips above a notice explaining the assistant is offline. The
                handoff below is the path that works without a model, so it is the only one
                offered then. */}
            {available
              ? t.suggestions.map((question) => (
                  <li key={question}>
                    <button
                      type="button"
                      onClick={() => void send(question)}
                      className="duration-fast rounded-(--radius-control) border border-rule px-3 py-1.5 text-start text-xs text-ink-2 transition-colors ease-standard hover:border-ink-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      {question}
                    </button>
                  </li>
                ))
              : null}
            <li>
              <button
                type="button"
                onClick={() => setHandoff('complaint')}
                className="duration-fast rounded-(--radius-control) border border-accent/50 px-3 py-1.5 text-start text-xs font-semibold text-accent-text transition-colors ease-standard hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {t.complaint}
              </button>
            </li>
          </ul>
        ) : null}

        {/* The handoff, inline. Not a redirect, not a link, not a phone number — the form
            appears in the conversation where it was asked for. */}
        {handoff ? (
          <div className="mt-4">
            <HandoffForm
              locale={locale}
              reason={handoff}
              context={[...turns].reverse().find((turn) => turn.role === 'user')?.content}
              onCancel={() => setHandoff(null)}
            />
          </div>
        ) : null}

        {notice && handoff === null ? (
          <div className="mt-3 rounded-(--radius-control) border border-rule bg-paper-raised px-3.5 py-3 text-sm text-ink-2">
            <p>{notice}</p>
            <button
              type="button"
              onClick={() => setHandoff('question')}
              className="duration-fast mt-2 text-sm font-semibold text-accent-text underline underline-offset-4 transition-colors ease-standard hover:text-ink"
            >
              {t.human}
            </button>
          </div>
        ) : null}
      </div>

      {/* The composer stands down while the handoff form is open. Two inputs competing for the
          same Enter key, in a panel this size, is a way to lose what you typed. */}
      <form
        hidden={handoff !== null}
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
        className="border-t border-rule p-3"
      >
        <label htmlFor="concierge-input" className="sr-only">
          {t.placeholder}
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="concierge-input"
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
            rows={1}
            maxLength={MAX_MESSAGE_CHARS}
            disabled={!available}
            placeholder={t.placeholder}
            className="min-h-11 flex-1 resize-none rounded-(--radius-control) border border-rule-strong bg-paper-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!available || status === 'streaming' || draft.trim() === ''}
            className="duration-fast min-h-11 rounded-(--radius-control) bg-accent px-4 text-sm font-semibold text-on-accent transition-colors ease-standard hover:bg-accent-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-40"
          >
            {t.send}
          </button>
        </div>
        <p className="mt-2 text-2xs text-ink-3">{t.disclaimer}</p>
      </form>
    </div>
  );
}
