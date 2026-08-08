'use client';

import { useRef, type ElementType, type ReactNode } from 'react';

import { gsap, useGSAP } from '@/lib/gsap';
import { cn } from '@/lib/utils';

/**
 * Scroll reveal — GSAP, not Motion.
 *
 * The whole scroll layer of this site is GSAP/ScrollTrigger, so reveals are too. Nothing on
 * the page is animated by both libraries; Motion is reserved for React state transitions
 * (menus, chat) where it is genuinely the better tool.
 *
 * The reveal is a **rise into a mask**: content is clipped by its wrapper and travels upward
 * into place, so it arrives the way a car arrives at a floor rather than merely fading in.
 *
 * `gsap.matchMedia()` handles reduced motion rather than a hand-rolled check — when the query
 * matches, the tween is created with the element already at its final state, and if the
 * preference changes matchMedia reverts everything automatically.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
  /** `mask` clips and rises (headlines, media). `fade` only rises (body copy, list items). */
  variant = 'fade',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
  variant?: 'mask' | 'fade';
}) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const target = scope.current?.firstElementChild;
      if (!target) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          reduced: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduced } = context.conditions as { reduced: boolean };

          if (reduced) {
            gsap.set(target, { yPercent: 0, autoAlpha: 1 });
            return;
          }

          gsap.from(target, {
            yPercent: variant === 'mask' ? 105 : 22,
            autoAlpha: variant === 'mask' ? 1 : 0,
            duration: variant === 'mask' ? 1.05 : 0.85,
            delay,
            ease: 'travel',
            scrollTrigger: {
              trigger: scope.current,
              start: 'top 88%',
              once: true,
            },
          });
        }
      );

      return () => mm.revert();
    },
    { scope, dependencies: [delay, variant] }
  );

  return (
    <Tag ref={scope} data-reveal className={cn(variant === 'mask' && 'overflow-clip', className)}>
      {/* A single child wrapper is required: GSAP animates it while the parent does the
          clipping, which is what makes the masked variant read as a rise rather than a slide. */}
      <div className={variant === 'mask' ? undefined : 'contents-reveal'}>{children}</div>
    </Tag>
  );
}
