'use client';

import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/gsap';
import { cn } from '@/lib/utils';

/**
 * A figure that counts up once, the first time it is seen.
 *
 * Once — `once: true` on the trigger — because a number that re-counts every time it scrolls
 * back into view stops being information and becomes an animation.
 *
 * The final value is what the server renders, so the correct figure is in the HTML, is what a
 * screen reader announces, and is what shows if JavaScript never runs. The tween only
 * overwrites `textContent` on the way up, and `aria-hidden` is not used precisely because the
 * text must stay readable throughout.
 *
 * `tabular-nums` is applied by the `numeric` utility at the call site, so the digits do not
 * jitter horizontally while they climb.
 */
export function CountUp({
  to,
  className,
  dir,
}: {
  to: number;
  className?: string;
  dir?: 'ltr' | 'rtl';
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const el = ref.current;
        if (!el) return;
        const counter = { value: 0 };

        gsap.to(counter, {
          value: to,
          duration: 1.4,
          ease: 'travel',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          onUpdate: () => {
            el.textContent = String(Math.round(counter.value));
          },
          onComplete: () => {
            el.textContent = String(to);
          },
        });
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [to] }
  );

  return (
    <span ref={ref} className={cn(className)} dir={dir}>
      {to}
    </span>
  );
}
