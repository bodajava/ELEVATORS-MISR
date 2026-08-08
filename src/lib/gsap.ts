'use client';

import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Central GSAP registration.
 *
 * Per the official gsap-react skill: register every plugin once, at module level, before any
 * component uses it — never inside a component that re-renders. `useGSAP` is itself a plugin
 * and must be registered too.
 *
 * All plugins are free from the public `gsap` package since the Webflow acquisition; there is
 * no auth token and no private registry involved.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);

/**
 * The travel curve — the motion system's signature easing.
 *
 * A lift leaves a floor quickly and settles into the next one slowly. This is the same curve
 * as `--ease-travel` in globals.css, so CSS transitions and GSAP tweens share one feel.
 */
CustomEase.create('travel', '0.22, 1, 0.36, 1');

/** Project-wide tween defaults, so individual tweens stay terse. */
gsap.defaults({ duration: 0.8, ease: 'travel' });

export { gsap, ScrollTrigger, useGSAP, CustomEase };

/**
 * True when the visitor has asked for reduced motion.
 *
 * Prefer `gsap.matchMedia()` with a `reduceMotion` condition inside components — it reverts
 * automatically when the query stops matching. This helper is for the few places that need a
 * one-off boolean (e.g. deciding whether to start Lenis at all).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
