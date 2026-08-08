'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { AmbientVideo } from '@/components/media/ambient-video';
import type { VideoAsset } from '@/lib/media';
import { cn } from '@/lib/utils';

/**
 * One slide, fully resolved on the server.
 *
 * Labels and captions arrive as **strings**, not as functions. A server component cannot hand
 * a callback to a client component — React refuses to serialise it — and doing so took the
 * whole homepage down with "Functions cannot be passed directly to Client Components". It is
 * also the better boundary: translation and project lookup are server concerns, and this
 * component only arranges what it is given.
 */
export type FilmSlide = {
  video: VideoAsset;
  /** Accessible name — describes the footage, not the control. */
  label: string;
  title: string;
  meta: string;
  /** Accessible name for this slide's pagination control, e.g. "Show film 3 of 9". */
  dotLabel: string;
};

/**
 * The film slider.
 *
 * ── Why a scroll-snap rail rather than a transform carousel ─────────────────
 * The track is a real horizontally-scrollable list with CSS scroll snapping. That single
 * decision buys, for free and correctly: native touch and trackpad momentum, native drag,
 * native keyboard scrolling, correct RTL behaviour, and a scrollbar-free rail that still
 * works if JavaScript never runs. A transform-based carousel would have to reimplement all
 * of it, and would get RTL wrong — which on this site is half the audience.
 *
 * The buttons and pagination drive `scrollTo`; the active index is *read back* from scroll
 * position rather than being the source of truth, so dragging, swiping, tabbing to a card and
 * clicking a dot all converge on the same state instead of fighting each other.
 *
 * ── Playback ────────────────────────────────────────────────────────────────
 * Only the active slide is allowed to play. `AmbientVideo` already declines to attach a
 * source until a clip is near the viewport and plays only while it is actually visible; this
 * adds the horizontal axis, which an IntersectionObserver on a scroll container does not
 * cover on its own. The result is that no more than one content video is ever decoding.
 *
 * ── Direction ───────────────────────────────────────────────────────────────
 * `scrollLeft` is negative-going in RTL in every current browser, so all arithmetic is done on
 * `Math.abs(scrollLeft)` and the previous/next buttons are swapped by the document direction
 * rather than by the locale — the two can disagree and the DOM is the one that matters.
 */
export function FilmSlider({
  slides,
  dir,
  labels,
  className,
}: {
  slides: FilmSlide[];
  /**
   * Reading direction, resolved from the locale on the server.
   *
   * Read as a prop rather than sniffed from `document` in an effect: the value is known at
   * render time, and reading it in an effect would mean a first paint with the wrong
   * arithmetic plus a `setState` inside an effect, which is exactly the pattern
   * `react-hooks/set-state-in-effect` exists to prevent.
   */
  dir: 'ltr' | 'rtl';
  labels: { carousel: string; slide: string; group: string };
  className?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const rtl = dir === 'rtl';
  const groupId = useId();
  const t = useTranslations('common');

  /* Read the active index back from scroll position. */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const slides = [...track.children] as HTMLElement[];
      if (slides.length === 0) return;

      // Measured from live rectangles, not `offsetLeft` + `scrollLeft`.
      //
      // `offsetLeft` is relative to the nearest *positioned* ancestor, which is not this
      // track, so the arithmetic was silently offset by however far the rail sat inside the
      // page. In LTR scroll snapping hid it; in RTL it did not, and pressing Next moved the
      // rail to a position where no slide was active and playback stopped altogether.
      //
      // Viewport rectangles have neither problem: the distance from the track's leading edge
      // to a slide's leading edge is the same quantity in both directions, and it needs no
      // knowledge of how `scrollLeft` is signed in RTL.
      const tr = track.getBoundingClientRect();
      let best = 0;
      let bestDistance = Infinity;
      slides.forEach((slide, i) => {
        const r = slide.getBoundingClientRect();
        const d = Math.abs(rtl ? tr.right - r.right : r.left - tr.left);
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      });
      setActive(best);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [rtl]);

  // Held in a ref so the auto-advance interval is armed once rather than re-created on every
  // index change, which would reset its timing on each tick.
  const goToRef = useRef<((index: number) => void) | null>(null);

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const slides = [...track.children] as HTMLElement[];
      const clamped = Math.max(0, Math.min(slides.length - 1, index));
      const slide = slides[clamped];
      if (!slide) return;

      // Relative scroll from measured rectangles, for the same reason as `measure` above.
      // `scrollBy` also sidesteps the fact that `scrollLeft` is negative-going in RTL in
      // some engines and positive-going in others — the delta is a direction-free quantity
      // and only its sign needs flipping.
      const tr = track.getBoundingClientRect();
      const r = slide.getBoundingClientRect();
      const delta = rtl ? tr.right - r.right : r.left - tr.left;
      track.scrollBy({ left: rtl ? -delta : delta, behavior: 'smooth' });
    },
    [rtl]
  );

  // Assigned in an effect, not during render: writing a ref while rendering is the pattern
  // `react-hooks/refs` exists to stop, and it is genuinely unsafe under concurrent rendering.
  useEffect(() => {
    goToRef.current = goTo;
  }, [goTo]);

  /**
   * The rail moves on its own.
   *
   * A strip of film should run without being pushed. It advances one frame every few seconds
   * and wraps back to the start, and it stops the moment the visitor takes over — a pointer
   * over it, a focus inside it, a scroll of the rail, or a tab that is no longer visible.
   * Auto-motion that fights the person using it is worse than none.
   *
   * Disabled entirely under `prefers-reduced-motion`: an element that moves by itself is
   * exactly what that preference is about.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let timer = 0;
    let paused = false;

    const step = () => {
      if (paused || document.hidden) return;
      setActive((current) => {
        const next = current + 1 >= slides.length ? 0 : current + 1;
        goToRef.current?.(next);
        return current; // goTo drives scroll; `measure` reads the real index back.
      });
    };

    const start = () => {
      if (timer) return;
      timer = window.setInterval(step, 4200);
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = 0;
    };

    const hold = () => {
      paused = true;
    };
    const release = () => {
      paused = false;
    };

    track.addEventListener('pointerenter', hold);
    track.addEventListener('pointerleave', release);
    track.addEventListener('focusin', hold);
    track.addEventListener('focusout', release);
    // A deliberate scroll of the rail hands control over for a while.
    let settle = 0;
    const onUserScroll = () => {
      paused = true;
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        paused = false;
      }, 6000);
    };
    track.addEventListener('wheel', onUserScroll, { passive: true });
    track.addEventListener('touchstart', onUserScroll, { passive: true });

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    start();

    return () => {
      stop();
      window.clearTimeout(settle);
      track.removeEventListener('pointerenter', hold);
      track.removeEventListener('pointerleave', release);
      track.removeEventListener('focusin', hold);
      track.removeEventListener('focusout', release);
      track.removeEventListener('wheel', onUserScroll);
      track.removeEventListener('touchstart', onUserScroll);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [slides.length]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    // Arrow keys move by slide. Mapped through direction so "next" is always the reading
    // direction, which is what a visitor means by the right arrow on an Arabic page too.
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) {
      event.preventDefault();
      goTo(active + 1);
    } else if (event.key === back) {
      event.preventDefault();
      goTo(active - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      goTo(slides.length - 1);
    }
  };

  if (slides.length === 0) return null;

  const atStart = active === 0;
  const atEnd = active === slides.length - 1;

  return (
    <div className={cn('relative', className)}>
      <ul
        ref={trackRef}
        // A real list, scrolled natively. `tabIndex` because a scrollable region must be
        // reachable by keyboard — without it the rail is unusable without a pointer.
        tabIndex={0}
        role="group"
        aria-roledescription={labels.carousel}
        aria-label={labels.group}
        onKeyDown={onKeyDown}
        // `--film-h` is the shared frame height every slide is cut to. Content-driven at the
        // small end, capped at the large end so a landscape film never eats the viewport.
        style={{ ['--film-h' as string]: 'clamp(210px, 30vh, 320px)' }}
        className={[
          'flex snap-x snap-mandatory items-start gap-4 overflow-x-auto overscroll-x-contain pb-2 sm:gap-6',
          // The rail bleeds to the page edge so the next card peeks, which is the affordance
          // that tells a visitor there is more without needing a control.
          '-mx-(--gutter) scroll-px-(--gutter) px-(--gutter)',
          'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus',
          'scrollbar-none',
        ].join(' ')}
      >
        {slides.map(({ video: film, label, title, meta }, index) => {
          const isActive = index === active;
          return (
            <li
              key={film.id}
              id={`${groupId}-slide-${index}`}
              role="group"
              aria-roledescription={labels.slide}
              aria-label={`${index + 1} / ${slides.length}`}
              className="shrink-0 snap-start"
              // ── Uniform height, width from the film's own aspect ratio ──────────
              // The rail carries three landscape films and six portrait ones. Giving every
              // slide the same *width* and forcing each into `aspect-video` or `aspect-3/4`
              // produced the reported imbalance: portrait clips were letterboxed into wide
              // boxes with dead bands either side, landscape clips were cropped, and the
              // partial slide at the rail's edge looked accidental.
              //
              // A film strip solves this the way a real one does — every frame the same
              // height, each as wide as its own ratio needs. Gaps stay constant, the baseline
              // is shared, and a portrait clip simply occupies less of the rail than a
              // landscape one. Nothing is letterboxed and nothing is cropped.
              style={{
                width: `min(calc(var(--film-h) * ${(film.width / film.height).toFixed(4)}), 88%)`,
              }}
            >
              <div
                className={cn(
                  'duration-base aperture w-full overflow-hidden transition-opacity ease-standard',
                  // Inactive slides dim slightly rather than being hidden — the rail should
                  // read as a continuous strip of film, not a stack of cards.
                  isActive ? 'opacity-100' : 'opacity-70'
                )}
                style={{ height: 'var(--film-h)' }}
              >
                <AmbientVideo
                  video={film}
                  label={label}
                  // Only the active slide is permitted to play. Visibility is not sufficient
                  // here: two slides sit fully inside the viewport on desktop, and the
                  // intersection observer would start both. The controller is hidden on
                  // inactive slides too, so the rail reads as one film with neighbours.
                  active={isActive}
                  decorative={!isActive}
                  className="size-full"
                />
              </div>

              <div className="mt-4 flex items-baseline justify-between gap-4">
                <p className="font-body text-sm font-semibold text-ink">{title}</p>
                <p className="shrink-0 annotation text-ink-3">{meta}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* ---- controls ------------------------------------------------------ */}
      <div className="mt-6 flex items-center justify-between gap-6 pt-5 rule-t">
        {/* Pagination doubles as progress. Each dot is a real button at 44x44. */}
        <div className="flex flex-wrap items-center gap-1">
          {slides.map(({ video: film, dotLabel }, index) => (
            <button
              key={film.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={dotLabel}
              aria-current={index === active ? 'true' : undefined}
              className="group/dot grid size-11 place-items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span
                className={cn(
                  'duration-fast h-0.5 rounded-full transition-all ease-standard',
                  index === active ? 'w-6 bg-accent' : 'w-3 bg-rule-strong group-hover/dot:bg-ink-3'
                )}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <RailButton
            onClick={() => goTo(active - 1)}
            disabled={atStart}
            label={t('previous')}
            direction="back"
          />
          <RailButton
            onClick={() => goTo(active + 1)}
            disabled={atEnd}
            label={t('next')}
            direction="forward"
          />
        </div>
      </div>
    </div>
  );
}

function RailButton({
  onClick,
  disabled,
  label,
  direction,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  direction: 'back' | 'forward';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'grid size-11 place-items-center rounded-(--radius-control) border border-rule-strong',
        'duration-fast text-ink transition-colors ease-standard',
        'hover:border-ink hover:bg-ink hover:text-paper',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        'disabled:pointer-events-none disabled:opacity-30'
      )}
    >
      {/* `icon-directional` mirrors the glyph in RTL, so "next" always points the way the
          page reads. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={cn('size-4 icon-directional', direction === 'back' && 'rotate-180')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
