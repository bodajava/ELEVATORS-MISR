'use client';

import { useActionState, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useFormStatus } from 'react-dom';

import { submitInspectionRequest, type InspectionState } from '@/app/[locale]/contact/actions';
import { Field, RadioGroup, fieldControlClasses } from '@/components/forms/field';
import { Button, CtaArrow } from '@/components/ui/button';
import { inspectionForm, inspectionResult } from '@/content/inspection';
import type { Locale } from '@/i18n/config';
import { HONEYPOT_FIELD, RENDERED_AT_FIELD } from '@/lib/inspection/honeypot';
import { finishes, settings } from '@/lib/inspection/schema';

/**
 * The inspection request form.
 *
 * ── Progressive enhancement ─────────────────────────────────────────────────
 * A real `<form action={…}>` bound to a server action. It submits, validates and returns
 * errors with JavaScript disabled — `useActionState` upgrades that to an in-place update
 * rather than replacing it. Nothing here is a `fetch` in an `onSubmit` handler.
 *
 * ── Where validation happens ────────────────────────────────────────────────
 * On the server, in the action, from the shared schema. This component holds no validation
 * logic at all: duplicating the rules here would create two sources of truth that drift, and
 * the client copy could never be trusted anyway. Instead the action echoes back what was
 * submitted, and every control seeds its `defaultValue` from it — so correcting one bad field
 * never means retyping the other five.
 *
 * ── The honeypot pair ───────────────────────────────────────────────────────
 * Both hidden fields are rendered here and read in the action. The timestamp is a client
 * value, not a render-time one: this page is statically prerendered, so a build-time stamp
 * would be hours old before anyone saw it and every submission would look stale.
 */

/** The timestamp is fixed for the lifetime of a form instance, so the store never emits. */
const subscribeNever = () => () => {};

export function InspectionForm({ locale }: { locale: Locale }) {
  const [state, formAction] = useActionState<InspectionState, FormData>(submitInspectionRequest, {
    status: 'idle',
  });

  const [formKey, setFormKey] = useState(0);

  if (state.status === 'success') {
    return (
      <SuccessPanel
        locale={locale}
        reference={state.reference}
        onReset={() => setFormKey((k) => k + 1)}
      />
    );
  }

  return <FormBody key={formKey} locale={locale} state={state} action={formAction} />;
}

function FormBody({
  locale,
  state,
  action,
}: {
  locale: Locale;
  state: InspectionState;
  action: (payload: FormData) => void;
}) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const statusId = useId();

  /**
   * The honeypot's render timestamp.
   *
   * A **controlled** value, so React owns it. An earlier version set it imperatively on an
   * uncontrolled input, which worked exactly once: when a submission came back with
   * validation errors, React re-rendered the form and reset the input to its `defaultValue`.
   * The visitor's corrected second attempt then carried an empty timestamp, the honeypot read
   * that as malformed, and the request was silently discarded behind a confirmation panel —
   * so every visitor who mistyped anything lost their enquiry.
   *
   * It cannot be computed during render: `Date.now()` would differ between the prerendered
   * HTML and hydration. `useSyncExternalStore` is the sanctioned way to read a value that
   * only exists on the client — the server snapshot is empty, the client snapshot is memoised
   * per form instance so it stays stable, and the store never emits.
   */
  const stamp = useRef<string>('');
  const renderedAt = useSyncExternalStore(
    subscribeNever,
    () => (stamp.current ||= String(Date.now())),
    () => ''
  );

  const errors = state.status === 'invalid' ? state.errors : {};
  const hasFieldErrors = Object.keys(errors).length > 0;

  /**
   * What the visitor last submitted.
   *
   * React resets uncontrolled inputs to their `defaultValue` when the action's response
   * re-renders the form, so seeding these from the response is what keeps the typed values on
   * screen. Without it a single bad phone digit wiped the whole form.
   */
  const values = 'values' in state ? state.values : null;

  // Move the user to the summary when a submission comes back rejected. Focus, not just
  // scroll: a screen-reader user gets nothing from a scroll.
  useEffect(() => {
    if (state.status !== 'idle') summaryRef.current?.focus();
  }, [state]);

  const banner =
    state.status === 'rate-limited'
      ? inspectionResult.rateLimited[locale]
      : state.status === 'unavailable'
        ? inspectionResult.unavailable[locale]
        : state.status === 'error'
          ? inspectionResult.failureBody[locale]
          : hasFieldErrors
            ? inspectionForm.errorSummary[locale]
            : null;

  return (
    <form action={action} noValidate className="mt-10 flex flex-col gap-7">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name={RENDERED_AT_FIELD} value={renderedAt} readOnly />
      <HoneypotField />

      {/* Rendered only when there is something to say. An always-present `role="alert"`
          region is an assertive live region that exists on every idle page — it competes
          with the rest of the form for a screen reader's attention and, being 1px rather
          than truly absent, it is indistinguishable from a real message to anything
          querying the DOM. */}
      {banner ? (
        <div
          ref={summaryRef}
          id={statusId}
          tabIndex={-1}
          role="alert"
          className="rounded-(--radius-control) border border-danger/40 bg-danger/8 px-5 py-4 text-sm font-medium text-danger outline-none"
        >
          {banner}
        </div>
      ) : null}

      <fieldset className="flex flex-col gap-7 border-0 p-0">
        <legend className="sr-only">{inspectionForm.legend[locale]}</legend>

        <Field label={inspectionForm.name.label[locale]} error={errors.name}>
          {({ invalid, ...wiring }) => (
            <input
              {...wiring}
              name="name"
              type="text"
              required
              autoComplete="name"
              enterKeyHint="next"
              maxLength={120}
              defaultValue={values?.name ?? ''}
              placeholder={inspectionForm.name.placeholder[locale]}
              className={fieldControlClasses(invalid)}
            />
          )}
        </Field>

        <Field
          label={inspectionForm.phone.label[locale]}
          hint={inspectionForm.phone.hint[locale]}
          error={errors.phone}
        >
          {({ invalid, ...wiring }) => (
            <input
              {...wiring}
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              enterKeyHint="next"
              maxLength={24}
              defaultValue={values?.phone ?? ''}
              placeholder={inspectionForm.phone.placeholder[locale]}
              // The number itself is always LTR, even on the Arabic page — an RTL phone
              // number renders with the digit groups in the wrong order.
              dir="ltr"
              className={`${fieldControlClasses(invalid)} text-start`}
            />
          )}
        </Field>

        <Field
          label={inspectionForm.area.label[locale]}
          hint={inspectionForm.area.hint[locale]}
          error={errors.area}
        >
          {({ invalid, ...wiring }) => (
            <input
              {...wiring}
              name="area"
              type="text"
              required
              autoComplete="address-level2"
              enterKeyHint="next"
              maxLength={120}
              defaultValue={values?.area ?? ''}
              placeholder={inspectionForm.area.placeholder[locale]}
              className={fieldControlClasses(invalid)}
            />
          )}
        </Field>

        <RadioGroup
          name="setting"
          legend={inspectionForm.setting.label[locale]}
          error={errors.setting}
          defaultValue={(values?.setting as (typeof settings)[number]) || 'unsure'}
          options={settings.map((value) => ({
            value,
            label: inspectionForm.setting.options[value][locale],
          }))}
        />

        <RadioGroup
          name="finish"
          legend={inspectionForm.finish.label[locale]}
          hint={inspectionForm.finish.hint[locale]}
          error={errors.finish}
          defaultValue={(values?.finish as (typeof finishes)[number]) || 'unsure'}
          options={finishes.map((value) => ({
            value,
            label: inspectionForm.finish.options[value][locale],
          }))}
        />

        <Field
          label={inspectionForm.notes.label[locale]}
          hint={inspectionForm.notes.hint[locale]}
          error={errors.notes}
        >
          {({ invalid, ...wiring }) => (
            <textarea
              {...wiring}
              name="notes"
              defaultValue={values?.notes ?? ''}
              rows={4}
              maxLength={2000}
              className={`${fieldControlClasses(invalid)} resize-y`}
            />
          )}
        </Field>

        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              name="consent"
              defaultChecked={values?.consent ?? false}
              required
              aria-invalid={errors.consent ? true : undefined}
              className="mt-0.5 size-5 shrink-0 accent-accent"
            />
            <span className="max-w-[52ch]">{inspectionForm.consent.label[locale]}</span>
          </label>
          {errors.consent ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {errors.consent}
            </p>
          ) : null}
        </div>
      </fieldset>

      <div className="flex flex-col gap-4 pt-2 rule-t">
        <p className="max-w-[56ch] pt-5 text-sm text-ink-3">{inspectionForm.privacyNote[locale]}</p>
        <SubmitButton locale={locale} />
      </div>
    </form>
  );
}

function SubmitButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending} className="self-start">
      {pending ? inspectionForm.submitting[locale] : inspectionForm.submit[locale]}
      {pending ? null : <CtaArrow />}
    </Button>
  );
}

/**
 * The decoy.
 *
 * Deliberately not `display: none` and not `hidden` — those are the first attributes a bot
 * skips. It is taken out of the accessibility tree and pushed off-canvas instead, so it is a
 * present, laid-out input as far as naive automation can tell, and invisible and unreachable
 * to a person. `autoComplete="off"` keeps a password manager from filling it and failing a
 * genuine visitor.
 */
function HoneypotField() {
  return (
    <div
      aria-hidden
      // Hidden by CLIPPING, not by displacement.
      //
      // This was `absolute -left-[9999px]`, which is a *physical* offset. In LTR the browser
      // does not extend scrollWidth for overflow past the left edge, so it looked fine. In RTL
      // the inline direction flips and that same offset became 10,193px of real scrollable
      // width on every Arabic contact page — a horizontal scrollbar across the whole site's
      // primary conversion page.
      //
      // Clipping keeps every property the honeypot actually needs: the input is still laid
      // out, still `display: block`, still present and fillable by naive automation, and still
      // invisible and unreachable to a person. It just occupies 1px where it stands instead of
      // being thrown off-canvas.
      className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0 [clip-path:inset(50%)]"
    >
      <label htmlFor={HONEYPOT_FIELD}>Company website</label>
      <input
        id={HONEYPOT_FIELD}
        name={HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );
}

function SuccessPanel({
  locale,
  reference,
  onReset,
}: {
  locale: Locale;
  reference: string;
  onReset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      className="mt-10 rounded-(--radius-md) border border-rule bg-paper-raised p-8"
      role="status"
      aria-live="polite"
    >
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-2xl text-ink outline-none sm:text-3xl"
      >
        {inspectionResult.successHeading[locale]}
      </h2>

      <p className="mt-3 max-w-[52ch] text-base text-ink-2">
        {inspectionResult.successBody[locale]}
      </p>

      <div className="mt-8 pt-5 rule-t">
        <p className="annotation text-ink-3">{inspectionResult.referenceLabel[locale]}</p>
        {/* Always LTR and monospaced: this gets read aloud and typed back. */}
        <p
          dir="ltr"
          className="numeric mt-2 font-mono text-2xl font-semibold tracking-[0.08em] text-accent-text"
        >
          {reference}
        </p>
        <p className="mt-3 max-w-[52ch] text-sm text-ink-3">
          {inspectionResult.referenceNote[locale]}
        </p>
      </div>

      <Button type="button" variant="secondary" size="md" className="mt-8" onClick={onReset}>
        {inspectionResult.again[locale]}
      </Button>
    </div>
  );
}
