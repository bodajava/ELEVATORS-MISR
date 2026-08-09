import type { ReactNode } from 'react';

import { Reveal } from '@/components/motion/reveal';
import { cn } from '@/lib/utils';

type SectionHeadingProps = {
  /** Drawing-style label. Pass one only when it says something the heading does not. */
  eyebrow?: string;
  /** Two-digit index, shown as an annotation. Only where the order carries meaning. */
  index?: number;
  title: ReactNode;
  lede?: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  /** Put on the heading element, so a section can name itself with `aria-labelledby`. */
  id?: string;
};

/**
 * Section heading.
 *
 * The eyebrow sits in the annotation layer (mono, spaced, uppercase in Latin) against a
 * hairline rule that runs to the edge of the container — the label-and-leader-line convention
 * from an architectural drawing. In Arabic the tracking and uppercase are suppressed by the
 * base stylesheet, so the same component reads correctly in both scripts.
 */
export function SectionHeading({
  eyebrow,
  index,
  title,
  lede,
  as: Heading = 'h2',
  className,
  id,
}: SectionHeadingProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {eyebrow || index !== undefined ? (
        <div className="flex items-baseline gap-4 pt-3 rule-t">
          {index !== undefined ? (
            <span className="numeric shrink-0 annotation text-ink" dir="ltr">
              {String(index).padStart(2, '0')}
            </span>
          ) : null}
          {eyebrow ? <span className="annotation">{eyebrow}</span> : null}
        </div>
      ) : null}

      <Reveal variant="mask" className="mt-6">
        <Heading
          id={id}
          className={cn(
            'text-ink',
            Heading === 'h1'
              ? 'text-3xl sm:text-4xl lg:text-5xl'
              : 'text-2xl sm:text-3xl lg:text-4xl'
          )}
        >
          {title}
        </Heading>
      </Reveal>

      {lede ? (
        <Reveal delay={0.08} className="mt-6">
          <p className="max-w-[54ch] text-base text-pretty text-ink-2 sm:text-lg">{lede}</p>
        </Reveal>
      ) : null}
    </div>
  );
}
