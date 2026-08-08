'use client';

import { useRef, type ReactNode } from 'react';

import { gsap, useGSAP } from '@/lib/gsap';
import { cn } from '@/lib/utils';

/**
 * Magnetic pointer response for a primary CTA.
 *
 * The element leans a few pixels toward the cursor while it is nearby and springs back when
 * it leaves. The range is deliberately small — 8px at the edge of the element's own box. A
 * large range turns a button into a toy and, worse, makes it harder to click, because the
 * target moves away from where the visitor aimed.
 *
 * Guarded by `gsap.matchMedia()` on three conditions at once, all of which must hold:
 *   · a fine pointer — a finger has no hover, and on touch the effect is pure overhead;
 *   · a wide viewport — this is a desktop nicety;
 *   · no reduced-motion preference.
 * When any stops matching, matchMedia reverts the tween and the inline transform with it, so
 * the element returns to its resting position on its own.
 *
 * Only `x`/`y` are animated — never layout — so this cannot contribute to CLS.
 */
export function Magnetic({
  children,
  className,
  /** Maximum travel in px. Keep it small; see above. */
  strength = 8,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const scope = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        '(hover: hover) and (pointer: fine) and (min-width: 1024px) and (prefers-reduced-motion: no-preference)',
        () => {
          const el = scope.current;
          if (!el) return;

          const setX = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'travel' });
          const setY = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'travel' });

          const onMove = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            // Offset from the element's centre, normalised to -1..1, then clamped so a
            // cursor far outside the box cannot fling it.
            const dx = gsap.utils.clamp(-1, 1, (e.clientX - (r.left + r.width / 2)) / r.width);
            const dy = gsap.utils.clamp(-1, 1, (e.clientY - (r.top + r.height / 2)) / r.height);
            setX(dx * strength);
            setY(dy * strength);
          };

          const onLeave = () => {
            setX(0);
            setY(0);
          };

          el.addEventListener('pointermove', onMove);
          el.addEventListener('pointerleave', onLeave);

          return () => {
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerleave', onLeave);
          };
        }
      );

      return () => mm.revert();
    },
    { scope }
  );

  return (
    <span ref={scope} className={cn('inline-flex will-change-transform', className)}>
      {children}
    </span>
  );
}
