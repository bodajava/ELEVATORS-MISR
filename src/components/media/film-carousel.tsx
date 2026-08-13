'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AmbientVideo } from '@/components/media/ambient-video';
import { FilmLightbox, type LightboxFilm } from '@/components/media/film-lightbox';
import type { VideoAsset } from '@/lib/media';
import { cn } from '@/lib/utils';

/**
 * The default frame height — tuned for 9:16 pieces to camera.
 *
 * Two expressions, because a phone and a desktop size this from different constraints. `36vw`
 * alone was a desktop rule applied everywhere: on a 390px screen it fell to its 210px floor,
 * and a 9:16 film at a 210px frame is a **118px-wide card** — a matchbox, three and a half of
 * them across the screen. Below `sm` the height is driven from the viewport width instead, so
 * one film leads and the next one peeks.
 */
export const PORTRAIT_CARD_HEIGHT =
  '[--card-h:clamp(300px,103vw,440px)] sm:[--card-h:clamp(210px,36vw,480px)]';

/** 9:16, the shape of a piece to camera. */
export const PORTRAIT_ASPECT = 9 / 16;

/** 16:9, the shape of a walkthrough. */
export const LANDSCAPE_ASPECT = 16 / 9;

/**
 * The same rail, sized for 16:9 walkthroughs.
 *
 * A landscape card is 1.78 times its height rather than 0.56 of it, so the height that makes a
 * portrait card fill the screen makes a landscape one four times too wide.
 *
 * The phone figure is set against the **rail's** window rather than the viewport: the track is
 * 350px wide inside a 390px screen once the page gutter and the rail's own scroll padding are
 * taken out, so a card driven to 92vw was 359px — wider than the window it lives in, with no
 * position where it was ever fully on screen. 43vw puts a 16:9 card at 298px there, which
 * leaves a real peek of the next one.
 */
export const LANDSCAPE_CARD_HEIGHT =
  '[--card-h:clamp(130px,43vw,300px)] sm:[--card-h:clamp(200px,24vw,380px)]';

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
  name,
  cardHeight = PORTRAIT_CARD_HEIGHT,
  aspect,
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
  /**
   * Which rail this is, published as `data-film-carousel="<name>"`.
   *
   * Two rails now use this component on the homepage, so the verification harness needs to be
   * able to say which one it is driving — `document.querySelector('[data-film-carousel]')`
   * always found the first.
   */
  name: string;
  /**
   * The shared frame height, as utility classes.
   *
   * One height for the whole rail, with each card as wide as its own ratio needs — that is what
   * lets portrait and landscape sit in one strip without letterboxing either. The right height
   * depends on what the footage is, which is why it is a prop: 9:16 pieces to camera and 16:9
   * walkthroughs cannot share a number without one of them becoming a stamp.
   */
  cardHeight?: string;
  /**
   * The card's shape, as width ÷ height. **One shape for the whole rail.**
   *
   * Cards used to take their width from each film's own ratio, so a rail holding both 16:9 and
   * 3:4 footage had cards of two different widths. Everything that moves this rail — the step,
   * the jump-to-dot, the active-index read and the loop correction — divides one block by the
   * number of cards in it, which is only true while they are all the same width. With mixed
   * widths the index was wrong by most of a card: `next` reported the same slide twice and the
   * "active" card settled 631px away from the leading edge.
   *
   * A card that is not its film's shape crops rather than letterboxes (`object-cover`), and
   * the full frame is one tap away in the lightbox.
   */
  aspect: number;
  interval?: number;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
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

  /** Slides in one block. One pass of the set; the rail is capped to fit inside it. */
  const unit = count;

  /** Sign of `scrollLeft` in this browser under this direction. Probed, not assumed. */
  const signRef = useRef(1);
  /** Width of one block of `unit` slides, gaps included. */
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
      if (cards.length < unit * 2 + 1) return;
      // First real card to first trailing-clone card. Derived by subtraction rather than read
      // from `columnGap`, so it stays correct if the gap becomes responsive.
      const first = cards[unit].getBoundingClientRect().left;
      const after = cards[unit * 2].getBoundingClientRect().left;
      const block = Math.abs(after - first);
      if (block <= 0) return;

      // Re-park only when the block width has genuinely changed. The observer fires for
      // reasons that are not resizes — a scrollbar appearing, a webfont landing — and parking
      // unconditionally on every callback dragged the rail back to slide 1 mid-step, which
      // read as "next does nothing".
      const previous = blockRef.current;
      blockRef.current = block;

      // How wide the rail is allowed to be, published to CSS as one block's width.
      //
      // The brief asks for a rail at 80% of its container; the loop imposes a harder limit on
      // top of that. Three blocks have to supply runway either side of the real one, so the
      // rail may never be wider than a single block — past that it walks into the end of its
      // own scroll range and wedges, which is what "next does nothing" looked like at 768px.
      // The classes below combine the two: never wider than a block anywhere, and 80% of the
      // container from `lg`, whichever is smaller.
      //
      // Written on the root rather than the track, so the controls below can align to exactly
      // the same edges as the rail they drive.
      rootRef.current?.style.setProperty('--rail-max', `${Math.floor(block)}px`);

      if (Math.abs(block - previous) > 1) park(block);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [count, unit, setPos]);

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
      // One stride per card, which holds because every card in a rail is the same width —
      // see `aspect` on the component.
      const stride = block / unit;
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
      // The window is the real block itself — `[block, 2 × block)` — not the half-block either
      // side of its start. With the old bounds the rail recentred as soon as it passed the
      // block's midpoint, which is fine while a rail shows most of a block but wrong when it
      // shows a fraction of one: at 320px the fourth film sits at 1.75 blocks, past the old
      // 1.5 threshold, so stepping to it teleported straight back to the first and the last
      // film was unreachable. Correcting on the block's real edges keeps a full block of
      // runway on both sides, which is all the loop needs.
      if (pos < block - 1) setPos(pos + block);
      else if (pos > block * 2 - 1) setPos(pos - block);
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
  }, [count, unit, getPos, setPos]);

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
      track.scrollBy({ left: (block / unit) * delta * signRef.current, behavior: 'smooth' });
    },
    [unit]
  );

  /** Jump to one film in the real block. */
  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      const block = blockRef.current;
      if (!track || block <= 0) return;
      const target = block + (block / unit) * index;
      track.scrollBy({ left: (target - getPos()) * signRef.current, behavior: 'smooth' });
    },
    [unit, getPos]
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
  const rendered = Array.from({ length: unit * 3 }, (_, i) => ({
    film: films[i % count],
    real: i >= unit && i < unit * 2,
    filmIndex: i % count,
    key: `${i < unit ? 'lead' : i < unit * 2 ? 'real' : 'tail'}-${i}`,
  }));

  return (
    <div
      ref={rootRef}
      className={cn('relative', className)}
      data-film-carousel={name}
      style={{ ['--rail-max' as string]: '44rem' }}
    >
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
        className={[
          // One shared frame height; each card is as wide as its own ratio needs, which is the
          // only way to mix portrait and landscape without letterboxing. What that height is
          // depends on the footage — see the two constants at the top of this file.
          cardHeight,
          'flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 sm:gap-4',
          // Bleeds past the gutter so the next card peeks — the affordance that says the rail
          // continues, without a control to say it.
          '-mx-(--gutter) scroll-px-(--gutter) px-(--gutter)',
          // Never wider than one block, at any width — see the measurement above; that is the
          // loop's hard requirement, not a style choice. From `lg` it is also held to 90% of
          // the container, which is the width the owner asked for.
          'mx-auto max-w-(--rail-max)',
          'lg:max-w-[min(90%,var(--rail-max))] lg:scroll-px-0 lg:px-0',
          'scrollbar-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus',
          // The loop correction must land instantly, so no smooth behaviour from the sheet.
          'scroll-auto',
        ].join(' ')}
      >
        {rendered.map(({ film, real, filmIndex, key }) => {
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
              style={{ width: `min(calc(var(--card-h) * ${aspect.toFixed(4)}), 82vw)` }}
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
                    sizes="(min-width: 1024px) 620px, 82vw"
                    className="object-cover"
                  />
                )}

                {/* This used to be hidden below `sm`, because a phone card was ~124px wide and
                    the badge wrapped to two lines across the frame. The phone card is ~226px
                    now and the badge sits on one line inside it, so it shows everywhere. */}
                <span className="absolute start-2.5 top-2.5 z-10 inline-block rounded-(--radius-control) bg-carbon/70 px-2 py-0.5 text-2xs whitespace-nowrap text-ink-on-dark">
                  {film.badge}
                </span>

                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-carbon/90 via-carbon/40 to-transparent"
                />

                {/* `pointer-events-none` is load-bearing, not tidiness. This bar spans the
                    card's full width and is painted *after* the player, so it sat on top of
                    AmbientVideo's controller and swallowed every click aimed at play and
                    sound — the sound could not be turned on at all. The bar carries no
                    interaction of its own; the one control inside it takes its clicks back
                    explicitly. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 p-2.5">
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
                        className="duration-fast pointer-events-auto mt-1.5 inline-flex min-h-11 items-center rounded-(--radius-control) bg-paper/90 px-3 text-2xs font-semibold text-ink transition-colors ease-standard hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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

      {/* Aligned to the rail, not to the page. Controls sitting at the container's edges while
          the rail sits inside them read as belonging to something else. */}
      <div className="mx-auto mt-4 flex max-w-(--rail-max) items-center justify-between gap-4 lg:max-w-[min(90%,var(--rail-max))]">
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
