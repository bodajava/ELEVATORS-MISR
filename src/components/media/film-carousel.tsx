'use client';

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AmbientVideo } from '@/components/media/ambient-video';
import { FilmLightbox, type LightboxFilm } from '@/components/media/film-lightbox';
import type { VideoAsset } from '@/lib/media';
import { cn } from '@/lib/utils';

export type CarouselFilm = {
  video: VideoAsset;
  /** Accessible name — describes the footage, not the control. */
  label: string;
  /** Overlaid on the frame. */
  title: string;
  /** Top-leading chip. */
  badge: string;
  /** Index and duration. */
  meta: string;
  /** Accessible name of the card's open button. Resolved server-side; never a formatter. */
  expandLabel: string;
};

/**
 * A paged film carousel that advances on its own.
 *
 * ── Why a scroll-snap rail rather than a transform carousel ─────────────────
 * The track is a real horizontally scrollable list with CSS scroll snapping, which supplies
 * touch momentum, drag, keyboard scrolling and correct RTL behaviour for free. A transform
 * carousel has to reimplement all four and usually gets RTL wrong — half this site's audience.
 *
 * The dots and arrows drive `scrollTo`; the active index is **read back** from scroll
 * position rather than being the source of truth, so dragging, swiping, tabbing to a card and
 * pressing a dot all converge instead of fighting.
 *
 * ── Direction ───────────────────────────────────────────────────────────────
 * Nothing here reads `scrollLeft`, whose sign flips between browsers under RTL. Positions come
 * from `getBoundingClientRect()` measured against the rail's own leading edge, and movement is
 * a relative `scrollBy` — both direction-agnostic. Previous and next are swapped by the
 * **document's** direction rather than the locale, since the two can disagree and the DOM is
 * the one that decides.
 *
 * ── Advancing on its own ────────────────────────────────────────────────────
 * It steps forward on a timer and wraps at the end. Anything that moves by itself for more
 * than five seconds needs a way to stop it (WCAG 2.2.2), so there is a real pause control, and
 * it also holds while the pointer is over the rail, while focus is inside it, while a film is
 * open full-screen, and entirely under `prefers-reduced-motion`.
 *
 * ── Playback ────────────────────────────────────────────────────────────────
 * Only the card at the active index is allowed to play. Two cards can sit fully inside the
 * viewport at once, and an intersection observer alone would start both.
 */
export function FilmCarousel({
  films,
  dir,
  labels,
  /** Milliseconds between steps. */
  interval = 4200,
  className,
}: {
  films: CarouselFilm[];
  dir: 'ltr' | 'rtl';
  labels: {
    group: string;
    slide: string;
    pause: string;
    play: string;
    previous: string;
    next: string;
    watch: string;
    goTo: string;
    close: string;
  };
  interval?: number;
  className?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  // Set by any deliberate move — a drag, a swipe, an arrow, a dot. Auto-advance stays off
  // until the visitor leaves it alone again, so the rail never takes the wheel back mid-read.
  const [touched, setTouched] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  const rtl = dir === 'rtl';
  const count = films.length;

  /* Read the active index back from scroll position. */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let raf = 0;
    const read = () => {
      raf = 0;
      const cards = [...track.children] as HTMLElement[];
      if (cards.length === 0) return;
      // Compare against the rail's own leading edge so this works identically in both
      // directions — `offsetLeft` is relative to the offset parent, not the track, which is
      // the bug that broke RTL navigation on the other rail.
      const railStart = track.getBoundingClientRect()[rtl ? 'right' : 'left'];
      let nearest = 0;
      let best = Infinity;
      cards.forEach((card, index) => {
        const edge = card.getBoundingClientRect()[rtl ? 'right' : 'left'];
        const distance = Math.abs(edge - railStart);
        if (distance < best) {
          best = distance;
          nearest = index;
        }
      });
      setActive(nearest);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(read);
    };

    read();
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rtl, count]);

  // A hidden tab should cost nothing: no timer, no decoding.
  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      const card = track?.children[index] as HTMLElement | undefined;
      if (!track || !card) return;
      // `scrollBy` on the measured delta rather than `scrollTo` on an absolute offset: the
      // absolute form needs sign handling per direction and gets it wrong under RTL.
      //
      // And no sign flip. The delta is already direction-correct, because the edge it is
      // measured from flips with the direction: in RTL the next card sits to the *left* of the
      // leading edge, so the delta is negative, and `scrollBy` wants a negative value there —
      // Chrome's RTL scrollLeft runs from -max at the end to 0 at the start. Multiplying by -1
      // sent every RTL step backwards into the wall, which is why only the first slide was ever
      // reachable in Arabic.
      const railStart = track.getBoundingClientRect()[rtl ? 'right' : 'left'];
      const cardStart = card.getBoundingClientRect()[rtl ? 'right' : 'left'];
      track.scrollBy({ left: cardStart - railStart, behavior: 'smooth' });
    },
    [rtl]
  );

  /** A deliberate move: navigate, and stop advancing on its own. */
  const navigate = useCallback(
    (index: number) => {
      setTouched(true);
      goTo(index);
    },
    [goTo]
  );

  const step = useCallback(
    (delta: number) => navigate((active + delta + count) % count),
    [active, count, navigate]
  );

  // Advance on its own. Held by the pause control, by the pointer, by focus inside the rail,
  // by an open film, and by the reduced-motion preference.
  const running = !paused && !hovering && !touched && tabVisible && expanded === null && count > 1;
  useEffect(() => {
    if (!running) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActive((current) => {
        const next = (current + 1) % count;
        goTo(next);
        return current; // the scroll listener is the source of truth
      });
    }, interval);
    return () => window.clearInterval(timer);
  }, [running, interval, count, goTo]);

  if (count === 0) return null;

  return (
    <div className={cn('relative', className)} data-film-carousel>
      <ul
        ref={trackRef}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={labels.group}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocusCapture={() => setHovering(true)}
        onPointerDown={() => setTouched(true)}
        onKeyDown={(event) => {
          // Arrow keys move by a slide rather than by the browser's scroll increment, which
          // on a snapping rail lands between two cards.
          const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
          const back = rtl ? 'ArrowRight' : 'ArrowLeft';
          if (event.key === forward) {
            event.preventDefault();
            step(1);
          }
          if (event.key === back) {
            event.preventDefault();
            step(-1);
          }
          if (event.key === 'Home') {
            event.preventDefault();
            navigate(0);
          }
          if (event.key === 'End') {
            event.preventDefault();
            navigate(count - 1);
          }
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setHovering(false);
        }}
        style={{
          // One shared frame height; each card takes the width its own ratio needs. With an
          // all-portrait set that is the only way to show two at once without either
          // letterboxing them into wide boxes or cropping — and cropping is not available
          // here, because the captions are burned into the bottom of every frame.
          ['--card-h' as string]: 'clamp(300px, 54vh, 560px)',
        }}
        className={[
          'flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 sm:gap-6',
          // Bleeds to the page edge below `lg` so the next card peeks past the gutter — the
          // affordance that says the rail continues, without a control to say it.
          '-mx-(--gutter) scroll-px-(--gutter) px-(--gutter)',
          // On a desktop the rail is deliberately narrower than the container and centred, so
          // two portrait films fill it with the third peeking. Left full width, four 9:16
          // cards fit at once and it stops reading as a rail at all.
          'lg:mx-auto lg:max-w-[48rem] lg:scroll-px-0 lg:px-0',
          'scrollbar-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus',
        ].join(' ')}
      >
        {films.map((film, index) => (
          <li
            key={film.video.id}
            role="group"
            aria-roledescription={labels.slide}
            aria-label={`${index + 1} / ${count}`}
            className="shrink-0 snap-start"
            // Width from the film's own ratio against the shared height, capped so a card can
            // never be wider than the viewport on a phone.
            style={{
              width: `min(calc(var(--card-h) * ${(film.video.width / film.video.height).toFixed(4)}), 78vw)`,
            }}
          >
            {/* A div, not a button.
                The active slide carries AmbientVideo's real controller — play/pause and, where
                the file has an audio track, mute/unmute — and those are buttons. Wrapping the
                whole card in a button put a button inside a button: invalid HTML, and it
                failed hydration outright with React #418. The frame is a plain element and the
                one control that opens the film is the Watch button in the caption. */}
            <div
              className={cn(
                'group/card aperture relative block w-full overflow-hidden',
                'duration-base transition-opacity ease-standard',
                // The active slide carries the emphasis; its neighbours recede rather than
                // compete. Opacity only — scaling a snapping card fights the scroll position
                // the active index is read from.
                index === active ? 'opacity-100 shadow-card' : 'opacity-60'
              )}
              // The footage's own shape, at the rail's shared height. Nothing is stretched
              // and nothing is cropped: `object-cover` on a box that already matches the
              // source ratio is a no-op, which is the point.
              style={{ height: 'var(--card-h)' }}
            >
              {/* The active slide carries the real controller. Inactive slides are decorative:
                  a control on a card the visitor has not selected is noise, and it would put
                  several tab stops between them and the card they are looking at. */}
              <AmbientVideo
                video={film.video}
                label={film.label}
                // Only the active card plays. Two cards can be fully on screen at once and
                // the viewport observer would happily start both.
                active={index === active && expanded === null}
                decorative={index !== active}
                className="size-full"
              />

              <span className="absolute start-3 top-3 z-10 rounded-(--radius-control) bg-carbon/70 px-2 py-1 annotation text-ink-on-dark">
                {film.badge}
              </span>

              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-carbon/90 via-carbon/45 to-transparent"
              />

              {/* Caption at the start edge; the video controller sits at the end edge, so the
                  two never overlap in either direction. */}
              <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm text-ink-on-dark drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)] sm:text-base">
                    {film.title}
                  </p>
                  <button
                    type="button"
                    data-carousel-expand
                    onClick={() => setExpanded(index)}
                    aria-label={film.expandLabel}
                    className="duration-fast mt-2 inline-flex min-h-10 items-center rounded-(--radius-control) bg-paper/90 px-3 text-2xs font-semibold text-ink transition-colors ease-standard hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    {labels.watch}
                  </button>
                </div>
                {/* Room for AmbientVideo's controller, which is absolutely placed at end-3. */}
                <span aria-hidden className="w-24 shrink-0" />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Same width as the rail above it. Left at container width the dots sat 200px to the
          side of the first card and the arrows hung off the right edge of the composition. */}
      <div className="mt-5 flex items-center justify-between gap-4 lg:mx-auto lg:max-w-[48rem]">
        <div className="flex items-center gap-1.5">
          {films.map((film, index) => (
            <button
              key={film.video.id}
              type="button"
              data-carousel-dot
              onClick={() => navigate(index)}
              aria-label={`${labels.goTo} ${index + 1}`}
              aria-current={index === active || undefined}
              // The visible mark is a 6px bar, but the button is 44px tall. A 6px-high
              // control is a real target failure — the indicator can look like an indicator
              // without being one to a finger.
              // 44px tall and at least 24px wide. The bar inside an inactive dot is only 8px
              // across, so padding alone left the target 16px wide — tall enough and too
              // narrow, which the viewport sweep caught at every size.
              className="group/dot inline-flex h-11 min-w-6 items-center justify-center px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span
                aria-hidden
                className={cn(
                  'duration-base block h-1.5 rounded-full transition-[width,background-color] ease-standard',
                  index === active ? 'w-8 bg-accent' : 'w-2 bg-rule-strong group-hover/dot:bg-ink-3'
                )}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-carousel-toggle
            onClick={() => setPaused((value) => !value)}
            className="duration-fast inline-flex min-h-11 items-center gap-2 rounded-(--radius-control) border border-rule px-3.5 text-sm text-ink-2 transition-colors ease-standard hover:border-ink-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {paused ? (
              <Play className="size-4" aria-hidden />
            ) : (
              <Pause className="size-4" aria-hidden />
            )}
            {paused ? labels.play : labels.pause}
          </button>

          <Arrow
            onClick={() => step(-1)}
            label={labels.previous}
            icon={rtl ? 'forward' : 'back'}
            hook="prev"
          />
          <Arrow
            onClick={() => step(1)}
            label={labels.next}
            icon={rtl ? 'back' : 'forward'}
            hook="next"
          />
        </div>
      </div>

      <FilmLightbox
        films={films as LightboxFilm[]}
        index={expanded}
        dir={dir}
        labels={{ close: labels.close, previous: labels.previous, next: labels.next }}
        onClose={() => setExpanded(null)}
        onIndexChange={setExpanded}
      />
    </div>
  );
}

function Arrow({
  onClick,
  label,
  icon,
  hook,
}: {
  onClick: () => void;
  label: string;
  icon: 'back' | 'forward';
  /** Stable handle for the verification harness — the visible icon flips with direction. */
  hook: 'prev' | 'next';
}) {
  const Icon = icon === 'back' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      data-carousel-arrow={hook}
      onClick={onClick}
      aria-label={label}
      className="duration-fast inline-flex size-11 items-center justify-center rounded-full border border-rule text-ink-2 transition-colors ease-standard hover:border-accent hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
