'use client';

import Image from 'next/image';
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
 * The Marketing Films rail — a compact, endlessly looping film strip.
 *
 * ── How the loop has no end ─────────────────────────────────────────────────
 * The set is rendered three times: a clone block, the real block, a clone block. The rail
 * parks on the real block, and whenever the scroll position drifts into a clone block it is
 * moved back by exactly one block width with scroll behaviour off. What is under the pointer
 * is identical either side of that correction, so there is nothing to see — no jump, no
 * flash, no blank frame. Forward past the last film lands on the first; back past the first
 * lands on the last.
 *
 * Only the middle block is real. The clones are `aria-hidden` and `inert`, hold no focusable
 * control, and render a **poster image rather than a video** — so they cannot play, are never
 * announced, and cost one small image instead of a second copy of the film. The unique slide
 * count is the number of files on disk, not three times it.
 *
 * ── Direction ───────────────────────────────────────────────────────────────
 * RTL inverts the sign of `scrollLeft`, and browsers have disagreed about it. Rather than
 * assume, the component writes `-1` once on mount and reads back what it gets, then routes
 * every read and write through `getPos`/`setPos`. Everything above that is direction-agnostic.
 *
 * ── What plays ──────────────────────────────────────────────────────────────
 * One film at a time, or none. `playing` holds a single real index: hovering sets it on a fine
 * pointer, focusing sets it from the keyboard, tapping toggles it on touch, leaving clears it.
 * Every other card is handed `active={false}`, which pauses it. There is no state in which two
 * can run.
 *
 * ── Advancing on its own ────────────────────────────────────────────────────
 * One timer, 4.2s. It holds while the pointer is over the rail, while focus is inside it,
 * while a film is playing, during a drag, while the tab is hidden, while a film is open
 * full-screen, and entirely under `prefers-reduced-motion`. The effect that owns it clears it
 * on teardown, so a Strict Mode double-invoke cannot leave two running.
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
  const [dragging, setDragging] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [playing, setPlaying] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const rtl = dir === 'rtl';
  const count = films.length;

  /** Sign of `scrollLeft` in this browser under this direction. Probed, not assumed. */
  const signRef = useRef(1);
  /** Width of one block of `count` slides, gaps included. */
  const blockRef = useRef(0);

  const getPos = useCallback(() => {
    const track = trackRef.current;
    return track ? track.scrollLeft * signRef.current : 0;
  }, []);

  const setPos = useCallback((value: number) => {
    const track = trackRef.current;
    if (track) track.scrollLeft = value * signRef.current;
  }, []);

  /* Probe the scroll sign, measure the block, park on the real block. */
  useEffect(() => {
    const track = trackRef.current;
    if (!track || count === 0) return;

    /**
     * Park at `value`, correcting the sign if the browser rejects it.
     *
     * A probe on mount is not reliable: before the cards have laid out the track has no
     * scrollable overflow, every write clamps to 0, and the probe concludes the wrong sign.
     * Under RTL that left every write clamped to 0 for the life of the component — the rail
     * never moved in Arabic at any viewport. Writing and reading back is self-correcting and
     * needs no assumption about ordering or about the browser.
     */
    const park = (value: number) => {
      track.scrollLeft = value * signRef.current;
      if (Math.abs(track.scrollLeft * signRef.current - value) > 2) {
        signRef.current = -signRef.current;
        track.scrollLeft = value * signRef.current;
      }
    };

    const measure = () => {
      const cards = [...track.children] as HTMLElement[];
      if (cards.length < count * 2 + 1) return;
      // First real card to first trailing-clone card. Derived by subtraction rather than read
      // from `columnGap`, so it stays correct if the gap becomes responsive.
      const first = cards[count].getBoundingClientRect().left;
      const after = cards[count * 2].getBoundingClientRect().left;
      const block = Math.abs(after - first);
      if (block <= 0) return;

      // Re-park only when the block width has genuinely changed. The observer fires for
      // reasons that are not resizes — a scrollbar appearing, a webfont landing — and parking
      // unconditionally on every callback dragged the rail back to slide 1 mid-step, which
      // read as "next does nothing".
      const previous = blockRef.current;
      blockRef.current = block;
      if (Math.abs(block - previous) > 1) park(block);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [count, setPos]);

  /* Read the active index back, and teleport out of the clone blocks. */
  useEffect(() => {
    const track = trackRef.current;
    if (!track || count === 0) return;

    let raf = 0;
    let settle = 0;

    /** Which real film is leading. Cheap, and safe to run mid-flight. */
    const read = () => {
      raf = 0;
      const block = blockRef.current;
      if (block <= 0) return;
      const stride = block / count;
      const index = Math.round((getPos() - block) / stride);
      setActive(((index % count) + count) % count);
    };

    /**
     * The loop correction — one whole block, written straight to `scrollLeft`.
     *
     * Only ever when the rail is at rest. Moving `scrollLeft` while a smooth scroll is in
     * flight does not cancel that scroll: the browser keeps animating toward the position it
     * was already heading for, which silently undoes the correction. With clicks and the
     * auto-advance overlapping, the rail then wedged against the end of its range and the
     * active slide stopped changing at all.
     */
    const recentre = () => {
      const block = blockRef.current;
      if (block <= 0) return;
      const pos = getPos();
      if (pos < block * 0.5) setPos(pos + block);
      else if (pos > block * 1.5) setPos(pos - block);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
      window.clearTimeout(settle);
      settle = window.setTimeout(recentre, 140);
    };

    read();
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [count, getPos, setPos]);

  /* A hidden tab costs nothing. */
  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /** Move by whole slides. Always available both ways — the clones see to that. */
  const step = useCallback(
    (delta: number) => {
      const track = trackRef.current;
      const block = blockRef.current;
      if (!track || block <= 0) return;
      track.scrollBy({ left: (block / count) * delta * signRef.current, behavior: 'smooth' });
    },
    [count]
  );

  /** Jump to one film in the real block. */
  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      const block = blockRef.current;
      if (!track || block <= 0) return;
      const target = block + (block / count) * index;
      track.scrollBy({ left: (target - getPos()) * signRef.current, behavior: 'smooth' });
    },
    [count, getPos]
  );

  // One timer. Everything that should hold it is gathered here, so there is a single place to
  // look, and the effect's teardown is the only thing that clears it.
  const running =
    !paused &&
    !hovering &&
    !dragging &&
    tabVisible &&
    playing === null &&
    expanded === null &&
    count > 1;

  useEffect(() => {
    if (!running) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => step(1), interval);
    return () => window.clearInterval(timer);
  }, [running, interval, step]);

  if (count === 0) return null;

  // Three blocks: clone, real, clone. All index arithmetic is modulo `count`.
  const rendered = Array.from({ length: count * 3 }, (_, i) => ({
    film: films[i % count],
    real: i >= count && i < count * 2,
    filmIndex: i % count,
    key: `${i < count ? 'lead' : i < count * 2 ? 'real' : 'tail'}-${i % count}`,
  }));

  return (
    <div className={cn('relative', className)} data-film-carousel>
      <ul
        ref={trackRef}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={labels.group}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => {
          setHovering(false);
          setPlaying(null);
        }}
        onFocusCapture={() => setHovering(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setHovering(false);
            setPlaying(null);
          }
        }}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(event) => {
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
        }}
        style={{
          // Compact by design. One shared frame height; each card is as wide as its own ratio
          // needs, which is the only way to mix portrait and landscape without letterboxing.
          ['--card-h' as string]: 'clamp(220px, 28vw, 340px)',
        }}
        className={[
          'flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 sm:gap-4',
          // Bleeds past the gutter so the next card peeks — the affordance that says the rail
          // continues, without a control to say it.
          '-mx-(--gutter) scroll-px-(--gutter) px-(--gutter)',
          // Constrained and centred from `lg`. Two reasons, and the second is not cosmetic:
          // these are small portrait films, so a full-width rail would show six at once and
          // stop reading as a rail at all — and the loop needs the rail to be no wider than
          // one block plus one slide. Wider than that and three blocks cannot supply enough
          // runway: the rail walks into the end of its own scroll range and stops dead, which
          // is exactly what happened at 1440 before this cap.
          'lg:mx-auto lg:max-w-[34rem] lg:scroll-px-0 lg:px-0',
          'scrollbar-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus',
          // The loop correction must land instantly, so no smooth behaviour from the sheet.
          'scroll-auto',
        ].join(' ')}
      >
        {rendered.map(({ film, real, filmIndex, key }) => {
          const ratio = film.video.width / film.video.height;
          const isPlaying = real && playing === filmIndex;
          const isActive = real && active === filmIndex;

          return (
            <li
              key={key}
              // Clones carry neither role nor label: a screen reader must count `count` slides,
              // not three times that.
              {...(real
                ? {
                    role: 'group',
                    'aria-roledescription': labels.slide,
                    'aria-label': `${filmIndex + 1} / ${count}`,
                  }
                : { 'aria-hidden': true, inert: true })}
              data-marketing-slide={real ? 'real' : 'clone'}
              data-film-index={real ? filmIndex : undefined}
              className="shrink-0 snap-start"
              style={{ width: `min(calc(var(--card-h) * ${ratio.toFixed(4)}), 74vw)` }}
              onMouseEnter={real ? () => setPlaying(filmIndex) : undefined}
              onMouseLeave={real ? () => setPlaying(null) : undefined}
            >
              <div
                className={cn(
                  'group/card relative block w-full overflow-hidden rounded-3xl',
                  'duration-base transition-[opacity,box-shadow,transform] ease-standard',
                  isActive
                    ? 'opacity-100 shadow-md ring-1 ring-accent/40'
                    : 'opacity-80 ring-1 ring-rule',
                  real && 'hover:-translate-y-0.5 hover:opacity-100 hover:shadow-lg'
                )}
                style={{ height: 'var(--card-h)' }}
              >
                {real ? (
                  <AmbientVideo
                    video={film.video}
                    label={film.label}
                    // Exactly one card is ever handed `true`; everything else pauses.
                    active={isPlaying && expanded === null}
                    decorative={!isPlaying}
                    className="size-full"
                  />
                ) : (
                  /* A clone is a poster, not a player. It cannot start, and it costs one
                     small image rather than a second copy of the film. */
                  <Image
                    src={film.video.poster}
                    alt=""
                    aria-hidden
                    fill
                    sizes="(min-width: 1024px) 340px, 74vw"
                    className="object-cover"
                  />
                )}

                {/* Hidden on the narrowest cards. These are 9:16 films, so a card is ~124px
                    wide on a phone and the badge wrapped to two lines across the frame. The
                    lede above already says the films are Arabic and carry sound, so nothing
                    is lost by dropping it there. */}
                <span className="absolute start-2.5 top-2.5 z-10 hidden rounded-(--radius-control) bg-carbon/70 px-2 py-0.5 text-2xs whitespace-nowrap text-ink-on-dark sm:inline-block">
                  {film.badge}
                </span>

                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-carbon/90 via-carbon/40 to-transparent"
                />

                <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 p-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-display text-2xs text-ink-on-dark drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)] sm:text-sm">
                      {film.title}
                    </p>
                    {real ? (
                      <button
                        type="button"
                        data-carousel-expand
                        onClick={() => setExpanded(filmIndex)}
                        onFocus={() => setPlaying(filmIndex)}
                        aria-label={film.expandLabel}
                        className="duration-fast mt-1.5 inline-flex min-h-11 items-center rounded-(--radius-control) bg-paper/90 px-3 text-2xs font-semibold text-ink transition-colors ease-standard hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        {labels.watch}
                      </button>
                    ) : null}
                  </div>
                  {/* Clearance for AmbientVideo's controller — only while it is actually
                      there. Reserved unconditionally it ate most of a 124px card and
                      truncated every title on a phone to a single letter. */}
                  {isPlaying ? <span aria-hidden className="w-20 shrink-0" /> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center">
          {films.map((film, index) => (
            <button
              key={film.video.id}
              type="button"
              data-carousel-dot
              onClick={() => goTo(index)}
              aria-label={`${labels.goTo} ${index + 1}`}
              aria-current={index === active || undefined}
              // The visible mark is a 6px bar; the target around it is 44x44. A 6px control is
              // a real target failure however tidy it looks.
              className="group/dot inline-flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span
                aria-hidden
                className={cn(
                  'duration-base block h-1.5 rounded-full transition-[width,background-color] ease-standard',
                  index === active
                    ? 'w-7 bg-accent'
                    : 'w-1.5 bg-rule-strong group-hover/dot:bg-ink-3'
                )}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            data-carousel-toggle
            onClick={() => setPaused((value) => !value)}
            className="duration-fast inline-flex min-h-11 items-center gap-2 rounded-(--radius-control) px-3 text-sm text-ink-2 transition-colors ease-standard hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
