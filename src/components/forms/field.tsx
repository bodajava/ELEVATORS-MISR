'use client';

import { useId, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Form field primitives.
 *
 * The accessibility contract lives here rather than at each call site, so it cannot be got
 * right four times and wrong once:
 *
 *  • The label is a real `<label htmlFor>`, never a placeholder standing in for one.
 *  • Hint and error are wired through `aria-describedby`, both at once when both exist.
 *  • An invalid control carries `aria-invalid`, and the error text is `role="alert"` so it
 *    is announced when it appears rather than only when focus reaches it.
 *  • Errors are never colour-only: the message is text, and the border change accompanies it
 *    rather than carrying the meaning alone.
 *  • Every control clears 44px and inherits the page's focus ring.
 *
 * Direction is left to the document. Logical properties throughout (`ps-`, `text-start`),
 * so the Arabic RTL page mirrors without a single direction check in this file.
 */

const controlClasses = [
  'w-full min-h-11 rounded-(--radius-control) border bg-paper-raised',
  'px-4 py-3 font-body text-base text-ink',
  'placeholder:text-ink-3',
  'transition-[border-color,background-color] duration-fast ease-standard',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
  'disabled:opacity-50',
].join(' ');

export function fieldControlClasses(invalid: boolean): string {
  return cn(controlClasses, invalid ? 'border-danger' : 'border-rule-strong hover:border-ink-3');
}

export function Field({
  label,
  hint,
  error,
  optional,
  optionalLabel,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
  /** Receives the wiring it must spread onto the control. */
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean | undefined;
    invalid: boolean;
  }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const invalid = Boolean(error);

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="font-body text-sm font-semibold text-ink">
        {label}
        {optional && optionalLabel ? (
          <span className="ms-2 font-normal text-ink-3">({optionalLabel})</span>
        ) : null}
      </label>

      {hint ? (
        <p id={hintId} className="text-sm text-ink-3">
          {hint}
        </p>
      ) : null}

      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': invalid || undefined,
        invalid,
      })}

      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Radio group.
 *
 * A native `<input type="radio">` set inside a `<fieldset>` — not a listbox, not a custom
 * widget. Three or four short options are faster to hit than a select on a phone, and the
 * native control brings arrow-key navigation and screen-reader group semantics for free.
 */
export function RadioGroup<T extends string>({
  name,
  legend,
  hint,
  error,
  options,
  defaultValue,
}: {
  name: string;
  legend: string;
  hint?: string;
  error?: string;
  options: { value: T; label: string }[];
  defaultValue: T;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={describedBy}>
      <legend className="font-body text-sm font-semibold text-ink">{legend}</legend>

      {hint ? (
        <p id={hintId} className="text-sm text-ink-3">
          {hint}
        </p>
      ) : null}

      <div className="mt-1 flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'group/radio inline-flex min-h-11 cursor-pointer items-center gap-2.5',
              'rounded-(--radius-control) border border-rule-strong bg-paper-raised px-4 py-2.5',
              'duration-fast text-sm text-ink transition-colors ease-standard',
              'hover:border-ink-3',
              // The checked state is a real border/background change, not just the dot, so it
              // reads at a glance and survives a high-contrast mode that drops the accent.
              'has-checked:border-ink has-checked:bg-ink has-checked:text-paper',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              className="size-4 shrink-0 accent-accent"
            />
            {option.label}
          </label>
        ))}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
