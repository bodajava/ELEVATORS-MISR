/**
 * How much motion this device should be asked to run.
 *
 * One decision, made in one place, so the background field, the smooth-scroll layer and any
 * future ambient effect cannot disagree about what a device can afford. Everything here is
 * read from the browser at call time — it is client-only, and callers must not run it during
 * render on the server.
 *
 * ── Why a tier rather than a boolean ────────────────────────────────────────
 * The measured baseline (`.perf/baseline-before.json`) showed 85–187 animation-frame callbacks
 * a second on **every** route, including `/contact` and `/process`, which animate nothing at
 * all — two independent loops running for the life of the page whether or not there was
 * anything for them to move. A single on/off switch cannot fix that, because the right answer
 * differs by device: a desktop with a mouse genuinely wants the pointer-lit field, a phone
 * wants the drift without a loop driving it, and a device that has asked for less motion or is
 * on a metered connection wants neither.
 *
 *   full     fine pointer, no stated preference against motion, no constrained-device signal.
 *            The pointer-lit field and its two-part cursor, driven by one rAF loop.
 *   ambient  everything else that still wants atmosphere — touch, mostly. The same forms drift
 *            on a **CSS** animation the compositor owns, so the main thread runs no loop.
 *   static   `prefers-reduced-motion: reduce`, `Save-Data`, or a device that reports very
 *            little memory or very few cores. Painted once; nothing moves.
 *
 * ── What counts as constrained ──────────────────────────────────────────────
 * `deviceMemory` and `hardwareConcurrency` are advisory, coarse, and absent in Safari — which
 * is exactly why they are only ever used to step *down*. A device that reports nothing is
 * treated as capable, so the absence of a signal never degrades anyone's experience; a device
 * that reports 2GB or two cores is taken at its word.
 */

export type MotionTier = 'full' | 'ambient' | 'static';

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/** True when the visitor has asked the platform for less motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True when the pointer can hover precisely — a mouse or trackpad, not a finger. */
export function hasFinePointer(): boolean {
  return window.matchMedia('(pointer: fine)').matches;
}

/** True when the browser has asked sites to send less: Save-Data, or a very small device. */
export function isConstrainedDevice(): boolean {
  const nav = navigator as NavigatorWithHints;
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 2) {
    return true;
  }
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0) {
    return nav.hardwareConcurrency <= 2;
  }
  return false;
}

/** The tier this device should run at, right now. */
export function motionTier(): MotionTier {
  if (prefersReducedMotion() || isConstrainedDevice()) return 'static';
  return hasFinePointer() ? 'full' : 'ambient';
}

/**
 * Watch for the tier changing.
 *
 * Both inputs are live: a visitor can turn reduced motion on in system settings without
 * reloading, and a hybrid device switches between touch and trackpad. The callback fires with
 * the new tier; the returned function unsubscribes.
 */
export function watchMotionTier(onChange: (tier: MotionTier) => void): () => void {
  const queries = [
    window.matchMedia('(prefers-reduced-motion: reduce)'),
    window.matchMedia('(pointer: fine)'),
  ];
  const handler = () => onChange(motionTier());
  for (const query of queries) query.addEventListener('change', handler);
  return () => {
    for (const query of queries) query.removeEventListener('change', handler);
  };
}
