'use client';

import { useActionState, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useFormStatus } from 'react-dom';

import { submitInspectionRequest, type InspectionState } from '@/app/[locale]/contact/actions';
import { conciergeCopy } from '@/components/concierge/copy';
import type { Locale } from '@/i18n/config';
import { HONEYPOT_FIELD, RENDERED_AT_FIELD } from '@/lib/inspection/honeypot';

export type HandoffReason = 'question' | 'complaint' | 'inspection';

/**
 * The human follow-up form, inside the chat.
 *
 * ── Why it is here and not a link ───────────────────────────────────────────
 * When a visitor asks for a person, the handoff happens where the conversation is: no redirect
 * to another page, no phone number dump, no messaging app. That is a binding rule for this
 * site, and a link out of the panel is not a handoff — it is an instruction to start again.
 *
 * ── Why it submits through the inspection action ────────────────────────────
 * That action is the site's one intake path, and it is the one that has been reviewed: honeypot
 * pair, rate limit keyed on a hashed address, the shared Zod schema re-parsed on the server,
 * and a reference generated for the visitor. A second intake endpoint written for the chat
 * would be a second trust boundary with none of that, which is strictly worse than reusing
 * this one. The reason the visitor picked is written into the notes, so a complaint arrives
 * labelled as a complaint rather than filed as an inspection request.
 *
 * ── What it never does ──────────────────────────────────────────────────────
 * No email field — email is not on the site's permitted contact list. No promise about when
 * anyone replies: the confirmation states that the request was received and nothing more.
 */

/** The timestamp is fixed for the lifetime of a form instance, so the store never emits. */
const subscribeNever = () => () => {};

export function HandoffForm({
  locale,
  reason,
  /** What the visitor last asked, carried into the notes so the team has the context. */
  context,
  onCancel,
}: {
  locale: Locale;
  reason: HandoffReason;
  context?: string;
  onCancel: () => void;
}) {
  const t = conciergeCopy[locale];
  const [state, formAction] = useActionState<InspectionState, FormData>(submitInspectionRequest, {
    status: 'idle',
  });
  const [chosen, setChosen] = useState<HandoffReason>(reason);
  const uid = useId();

  const stamp = useRef<string>('');
  const renderedAt = useSyncExternalStore(
    subscribeNever,
    () => (stamp.current ||= String(Date.now())),
    () => ''
  );

  if (state.status === 'success') {
    return (
      <div className="rounded-(--radius-control) border border-rule bg-paper-raised p-4">
        <p className="font-display text-sm text-ink">{t.successTitle}</p>
        <p className="mt-1.5 text-sm text-ink-2">
          {t.successBody.replace('{reference}', state.reference)}
        </p>
      </div>
    );
  }

  const errors = state.status === 'invalid' ? state.errors : {};
  const values = 'values' in state ? state.values : null;
  const banner = state.status !== 'idle' && state.status !== 'invalid' ? t.failure : null;
  const summary = Object.keys(errors).length > 0 ? t.failure : banner;

  return (
    <form
      // The chosen reason is folded into the notes before the action sees them, so a complaint
      // arrives labelled as one. The action's field list is deliberately closed — adding a
      // `reason` column to it would mean changing the schema, the store and the migration for
      // a label the notes can carry today.
      action={(formData: FormData) => {
        const typed = String(formData.get('notes') ?? '').trim();
        formData.set('notes', `[${t.reasons[chosen]}] ${typed}`.trim());
        formAction(formData);
      }}
      className="rounded-(--radius-control) border border-rule bg-paper-raised p-4"
    >
      <p className="font-display text-sm text-ink">{t.handoffTitle}</p>
      <p className="mt-1.5 text-xs text-ink-3">{t.handoffBody}</p>

      {summary ? (
        <p role="alert" className="mt-3 text-xs text-danger">
          {summary}
        </p>
      ) : null}

      {/* The reason. Radios rather than a select: three options, and the visitor should see
          all three without opening anything. */}
      <fieldset className="mt-4">
        <legend className="annotation text-ink-3">{t.reasonLabel}</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(['question', 'complaint', 'inspection'] as const).map((option) => (
            <label
              key={option}
              className={`duration-fast cursor-pointer rounded-(--radius-control) border px-3 py-1.5 text-xs transition-colors ease-standard ${
                chosen === option
                  ? 'border-accent bg-accent text-on-accent'
                  : 'border-rule text-ink-2 hover:border-ink-3'
              }`}
            >
              <input
                type="radio"
                name="handoff-reason"
                value={option}
                checked={chosen === option}
                onChange={() => setChosen(option)}
                className="sr-only"
              />
              {t.reasons[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-3 flex flex-col gap-3">
        <TextField
          id={`${uid}-name`}
          name="name"
          label={t.fields.name}
          defaultValue={values?.name}
          error={errors.name}
          autoComplete="name"
        />
        <TextField
          id={`${uid}-phone`}
          name="phone"
          label={t.fields.phone}
          defaultValue={values?.phone}
          error={errors.phone}
          type="tel"
          autoComplete="tel"
          dir="ltr"
        />
        <TextField
          id={`${uid}-area`}
          name="area"
          label={t.fields.area}
          defaultValue={values?.area}
          error={errors.area}
        />

        <div>
          <label htmlFor={`${uid}-notes`} className="annotation text-ink-3">
            {t.fields.message}
          </label>
          <textarea
            id={`${uid}-notes`}
            name="notes"
            rows={3}
            defaultValue={values?.notes ?? context ?? ''}
            className="mt-1 w-full resize-none rounded-(--radius-control) border border-rule-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
          {errors.notes ? <p className="mt-1 text-xs text-danger">{errors.notes}</p> : null}
        </div>

        <label className="flex items-start gap-2.5 text-xs text-ink-2">
          <input
            type="checkbox"
            name="consent"
            defaultChecked={values?.consent}
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
          />
          <span>
            {t.fields.consent}
            {errors.consent ? <span className="block text-danger">{errors.consent}</span> : null}
          </span>
        </label>
      </div>

      {/* Carried for the action: the locale decides the language of every message it returns,
          and the reason is written into the notes so the record says what it is. */}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="setting" value="unsure" />
      <input type="hidden" name="finish" value="unsure" />
      {/* The honeypot pair. Both are read in the action; neither is ever shown. */}
      <input
        type="text"
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="sr-only"
        defaultValue=""
      />
      <input type="hidden" name={RENDERED_AT_FIELD} value={renderedAt} />

      <div className="mt-4 flex items-center gap-2">
        <Submit locale={locale} />
        <button
          type="button"
          onClick={onCancel}
          className="duration-fast min-h-11 rounded-(--radius-control) px-3 text-xs text-ink-3 transition-colors ease-standard hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t.handoffCancel}
        </button>
      </div>
    </form>
  );
}

function Submit({ locale }: { locale: Locale }) {
  const t = conciergeCopy[locale];
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="duration-fast min-h-11 rounded-(--radius-control) bg-accent px-4 text-sm font-semibold text-on-accent transition-colors ease-standard hover:bg-accent-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
    >
      {pending ? t.sending : t.submit}
    </button>
  );
}

function TextField({
  id,
  name,
  label,
  defaultValue,
  error,
  type = 'text',
  autoComplete,
  dir,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <div>
      <label htmlFor={id} className="annotation text-ink-3">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        dir={dir}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        className="mt-1 min-h-11 w-full rounded-(--radius-control) border border-rule-strong bg-paper px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
