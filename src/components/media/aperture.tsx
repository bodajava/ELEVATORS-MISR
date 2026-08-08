import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type ApertureProps = {
  children: ReactNode;
  /** Aspect of the opening. Sources are portrait, so portrait ratios lead. */
  ratio?: '3/4' | '4/5' | '2/3' | '1/1' | '16/9' | '4/3';
  /** A hairline frame. Reserve it for the one or two apertures that carry a page. */
  framed?: boolean;
  className?: string;
};

const ratioClasses = {
  '3/4': 'aspect-3/4',
  '4/5': 'aspect-4/5',
  '2/3': 'aspect-2/3',
  '1/1': 'aspect-square',
  '16/9': 'aspect-video',
  '4/3': 'aspect-4/3',
} as const;

/**
 * The aperture — this redesign's signature element.
 *
 * A dark, square-cornered well cut into the plaster page. Media sits *inside* it rather than
 * on top of the page, which does two things: it gives the warm photography a dark surround so
 * it reads as light seen through an opening, and it gives every scroll sequence a fixed frame
 * for content to travel through — the same relationship a lift car has to a shaft opening.
 *
 * It also does real work on the assets: sources range from 3:4 to 1:2 at inconsistent widths,
 * and a dark well absorbs the mismatch where a light card would show every ragged edge. The
 * aspect wrapper reserves layout space, so media never shifts the page.
 */
export function Aperture({ children, ratio = '3/4', framed = false, className }: ApertureProps) {
  return (
    <div className={cn('aperture w-full aperture-mask', ratioClasses[ratio], className)}>
      {children}
      {framed ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-sm ring-1 ring-rule-on-dark ring-inset"
        />
      ) : null}
    </div>
  );
}
