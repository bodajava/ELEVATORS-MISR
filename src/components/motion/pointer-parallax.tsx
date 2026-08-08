'use client';

import { useRef, type ReactNode } from 'react';

import { gsap, useGSAP } from '@/lib/gsap';
import { cn } from '@/lib/utils';

/**
 * Cursor-aware parallax inside a media frame.
 *
 * The frame stays exactly where it is; the photograph *inside* it drifts a few pixels against
 * the pointer. That is the whole effect, and it is the right one for this system: everywhere
 * else on the page the opening is fixed and what is behind it moves, so a card that tilted or
 * lifted would be speaking a different language.
 *
 * The image is pre-scaled by `--parallax-scale` so drifting it never exposes an edge of the
 * frame. Only `x`/`y` are tweened, via `quickTo`, which reuses one tween instead of creating
 * a new one per pointer event — the difference between smooth and janky on a grid of cards.
 *
 * Disabled on touch, on narrow viewports, and under reduced motion. `matchMedia` reverts the
 * transform when any of those stops matching, so nothing is left displaced.
 */
export function PointerParallax({
  children,
  className,
  /** Maximum drift in px. */
  strength = 12,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        '(hover: hover) and (pointer: fine) and (min-width: 1024px) and (prefers-reduced-motion: no-preference)',
        () => {
          const frame = scope.current;
          const target = frame?.querySelector<HTMLElement>('[data-parallax-target]');
          if (!frame || !target) return;

          const setX = gsap.quickTo(target, 'x', { duration: 0.8, ease: 'travel' });
          const setY = gsap.quickTo(target, 'y', { duration: 0.8, ease: 'travel' });

          const onMove = (e: PointerEvent) => {
            const r = frame.getBoundingClientRect();
            const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
            const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
            // Negative: the image moves *against* the cursor, which reads as depth rather
            // than as the image being dragged.
            setX(gsap.utils.clamp(-1, 1, dx) * -strength);
            setY(gsap.utils.clamp(-1, 1, dy) * -strength);
          };

          const onLeave = () => {
            setX(0);
            setY(0);
          };

          frame.addEventListener('pointermove', onMove);
          frame.addEventListener('pointerleave', onLeave);

          return () => {
            frame.removeEventListener('pointermove', onMove);
            frame.removeEventListener('pointerleave', onLeave);
          };
        }
      );

      return () => mm.revert();
    },
    { scope }
  );

  return (
    <div ref={scope} className={cn('relative', className)}>
      {children}
    </div>
  );
}
