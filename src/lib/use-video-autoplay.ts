'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Viewport-aware playback for muted video.
 *
 * Two observers, because "should I download this?" and "should this be playing?" are
 * different questions with different answers:
 *
 *   · **arm** (rootMargin 400px, threshold 0) — the clip is approaching. Attach the `src` and
 *     switch to `preload="metadata"`. Before this fires the element has no source at all, so
 *     opening the page does not pull down every film below the fold. This is the rule the
 *     brief calls out and it is the reason for the two-stage design.
 *
 *   · **play** (threshold 0.45) — the clip is genuinely on screen. Play it. Below that
 *     threshold, pause. A video that is 20% visible at the edge of the viewport is not being
 *     watched, and leaving it decoding costs battery for nothing.
 *
 * `play()` returns a promise that browsers reject routinely — autoplay policy, a pause that
 * lands mid-play, a source swap. Every rejection here is expected and swallowed; an unhandled
 * one surfaces as a console error, which is one of the things the review flagged.
 *
 * Audio is never started by this hook. It only ever plays muted; unmuting is a deliberate act
 * by the visitor through a control, and that control is what sets `muted = false`.
 */
export function useVideoAutoplay({
  /** Skip entirely — used for the manual/testimonial presentation. */
  enabled = true,
}: { enabled?: boolean } = {}) {
  const ref = useRef<HTMLVideoElement>(null);
  /** True once the source has been attached, so the component can render <source>. */
  const [armed, setArmed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const arm = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setArmed(true);
          arm.disconnect();
        }
      },
      { rootMargin: '400px 0px' }
    );
    arm.observe(el);

    return () => arm.disconnect();
  }, [enabled]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || !armed) return;

    // Reduced motion: a looping background film is exactly the kind of continuous movement
    // this setting exists to stop. The poster stays, and the visitor can still start it.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !reduced.matches) {
          // Belt and braces: the element is muted in markup, but a stale `muted = false` from
          // a previous unmute must never survive into an autoplay.
          el.muted = true;
          void el.play().catch(() => {
            // Rejected autoplay is not an error condition — the poster is the fallback.
          });
        } else {
          el.pause();
        }
      },
      { threshold: 0.45 }
    );
    observer.observe(el);

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);

    return () => {
      observer.disconnect();
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [enabled, armed]);

  return { ref, armed, playing, setArmed };
}
