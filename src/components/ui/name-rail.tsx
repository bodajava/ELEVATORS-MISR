import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

export type RailItem = {
  id: string;
  name: string;
};

/**
 * A continuously drifting rail of names.
 *
 * ── Why this is CSS and not a library ───────────────────────────────────────
 * The reference implementation for this pattern (motion-primitives' `InfiniteSlider`) drives
 * the loop from JavaScript: `framer-motion` animating a `MotionValue`, plus `react-use-measure`
 * to read the track width on every resize. Neither package is in this project — the animation
 * dependency here is `motion` v13, and `framer-motion` is its predecessor, so following that
 * import would have added a second animation runtime alongside the one already installed.
 *
 * The loop it produces is a linear translate that repeats. CSS expresses exactly that, and a
 * duplicated track makes the seam invisible without measuring anything: the track holds the
 * list twice, so travelling -50% lands on a pixel-identical copy of the starting frame. No
 * JavaScript runs, no width is read, nothing re-renders on resize, and this stays a **server
 * component** — the names never reach the client bundle as data.
 *
 * ── Motion policy ───────────────────────────────────────────────────────────
 * The site's scroll layer is GSAP and Motion is reserved for React state transitions. This is
 * neither: it is ambient, always-running decoration, which is the same category as the hero's
 * `ambient-drift`, and it follows that precedent — a keyframe in globals.css, declared inside
 * `@media (prefers-reduced-motion: no-preference)`. Under a reduced-motion preference the
 * declaration never applies at all, so the rail simply renders as a static line of names
 * rather than animating at 0.01ms and snapping to its end position.
 *
 * Pausing on hover is gated behind `@media (hover: hover)`: on a touch screen a tap registers
 * as a hover that never ends, which would stop the rail permanently on the first tap.
 *
 * ── The seam ───────────────────────────────────────────────────────────────
 * The track carries no `gap`. With 2n items a flex gap makes the track
 * `2*items + (2n-1)*gap` wide, so a -50% translate stops half a gap short of one whole
 * copy and the rail visibly jumps by that much once per cycle. The spacing lives on the
 * item instead (`pe-*`), which makes every item exactly one repeating unit wide and -50%
 * land precisely on the duplicate.
 *
 * ── Accessibility ───────────────────────────────────────────────────────────
 * The second copy of the list is `aria-hidden`, so assistive technology reads each name once
 * while the eye sees a seamless loop. The rail is labelled by the caller, since "Design" alone
 * is not a name a screen reader can act on out of context.
 */
export function NameRail({
  items,
  label,
  reverse = false,
  durationSeconds = 70,
  className,
}: {
  items: RailItem[];
  /** Accessible name for the list. */
  label: string;
  /** Send this rail the other way. Two rails in opposite directions read as two sets. */
  reverse?: boolean;
  /** One full pass. Long by default — this is ambient, not a ticker demanding attention. */
  durationSeconds?: number;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div
      data-rail
      className={cn(
        'relative overflow-hidden',
        // The names travel out through a soft edge rather than being guillotined by the
        // container. Symmetric, so it needs no direction logic in RTL.
        '[mask-image:linear-gradient(to_right,transparent,black_4rem,black_calc(100%-4rem),transparent)]',
        className
      )}
      style={{ '--rail-duration': `${durationSeconds}s` } as CSSProperties}
    >
      <ul
        data-rail-track
        data-reverse={reverse ? 'true' : undefined}
        aria-label={label}
        className="flex w-max items-center"
      >
        {[...items, ...items].map((item, index) => {
          const isDuplicate = index >= items.length;
          return (
            <li
              key={`${item.id}-${index}`}
              aria-hidden={isDuplicate || undefined}
              className="flex shrink-0 items-center gap-8 pe-8 sm:gap-12 sm:pe-12"
            >
              <span className="font-display text-xl whitespace-nowrap text-ink sm:text-2xl lg:text-3xl">
                {item.name}
              </span>
              {/* A fill, not text — full-strength orange is permitted for fills on cream.
                  It is decoration between names, so it carries no accessible text. */}
              <span aria-hidden className="size-1.5 shrink-0 rotate-45 bg-accent" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
