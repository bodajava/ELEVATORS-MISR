'use client';

import Lenis from 'lenis';
import { useEffect, type ReactNode } from 'react';

import { ScrollTrigger, gsap } from '@/lib/gsap';

/**
 * Smooth scroll, synchronised with ScrollTrigger.
 *
 * The sync is the official three-line pattern from the Lenis README, and the order matters:
 *
 *   1. `lenis.on('scroll', ScrollTrigger.update)` — ScrollTrigger reads scroll position from
 *      the browser, but Lenis is the one moving it, so ScrollTrigger has to be told on every
 *      Lenis frame or every pin and scrub drifts.
 *   2. `gsap.ticker.add(...)` — drive Lenis from GSAP's ticker instead of its own rAF loop, so
 *      scroll and animation advance on the *same* frame. Two independent loops is what causes
 *      pinned sections to judder.
 *   3. `gsap.ticker.lagSmoothing(0)` — GSAP normally absorbs frame spikes by fudging time,
 *      which desynchronises it from the (unfudged) scroll position.
 *
 * Reduced motion: Lenis is never constructed at all. Smooth scrolling is itself motion, and
 * hijacking the scroll of someone who asked for less of it is the wrong call — the page falls
 * back to native scrolling and every ScrollTrigger still works.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches) return;

    const lenis = new Lenis({
      // Slightly longer than default: the site is about controlled vertical travel, and a
      // fast, snappy scroll fights that. Not so long that it feels laggy to a fast scroller.
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Touch devices keep native scrolling — smoothing touch reliably feels worse than the
      // platform default and breaks momentum expectations.
      smoothWheel: true,
      syncTouch: false,
      // We drive it from the GSAP ticker below.
      autoRaf: false,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Late-loading fonts and images change element positions; without a refresh every
    // trigger keeps the measurements it took before the layout settled.
    const refresh = () => ScrollTrigger.refresh();
    void document.fonts?.ready.then(refresh);

    return () => {
      lenis.off('scroll', ScrollTrigger.update);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
