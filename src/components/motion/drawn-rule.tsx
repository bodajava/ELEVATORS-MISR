'use client';

import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/gsap';
import { cn } from '@/lib/utils';

/**
 * An orange rule that draws itself once, when it first comes into view.
 *
 * Once — not on a loop. A rule that pulses forever is the kind of restlessness that makes a
 * page feel like a screensaver; drawing once rewards arriving at the section and then gets
 * out of the way.
 *
 * `scaleX` only, from a leading-edge origin that flips in RTL, so an Arabic reader sees it
 * drawn from the right like everything else on the page. Under reduced motion the rule is
 * simply present at full width — matchMedia never creates the tween.
 */
export function DrawnRule({ className }: { className?: string }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          scope.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.2,
            ease: 'travel',
            scrollTrigger: { trigger: scope.current, start: 'top 92%', once: true },
          }
        );
      });

      return () => mm.revert();
    },
    { scope }
  );

  return (
    <div
      ref={scope}
      aria-hidden
      className={cn('h-0.5 w-full origin-left bg-accent rtl:origin-right', className)}
    />
  );
}
