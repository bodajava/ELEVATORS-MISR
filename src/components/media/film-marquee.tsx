'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AmbientVideo } from '@/components/media/ambient-video';
import type { VideoAsset } from '@/lib/media';
import { cn } from '@/lib/utils';

export type MarqueeFilm = {
  video: VideoAsset;
  /** Accessible name — describes the footage, not the control. */
  label: string;
  /** Overlaid on the frame. No card body; the frame carries its own caption. */
  title: string;
};

/**
 * The film strip — one continuous band of footage that never reaches an end.
 *
 * ── How the loop is seamless ────────────────────────────────────────────────
 * The set is rendered twice. The track translates by exactly the width of the first copy and
 * then restarts, so the frame that arrives at the seam is the same frame that just left it
 * and there is no visible jump. The distance is measured from the DOM rather than assumed:
 * every film is a different width (each is as wide as its own aspect ratio needs), so the
 * group's width is not something that can be computed from a count.
 *
 * It is a CSS animation on `transform`, not a rAF loop. Nothing in the track is read or
 * written per frame, the compositor owns the movement, and it costs no layout — the same
 * rule the rest of the site's motion follows.
 *
 * ── Direction ───────────────────────────────────────────────────────────────
 * In RTL the track lays out from the right edge and the second copy sits off-screen to the
 * *left*, so the travel has to reverse or the band would scroll away from its own content.
 * `--marquee-dir` is the only thing that changes; the measurement and the keyframes are
 * shared.
 *
 * ── Stopping it ─────────────────────────────────────────────────────────────
 * Content that moves on its own for more than five seconds needs a way to stop it — WCAG
 * 2.2.2, and it is not optional. The toggle stops the travel *and* the footage, so one
 * control halts every moving thing in the band. The strip also pauses on hover and on
 * keyboard focus, so a visitor reading a caption is not chasing it across the screen.
 *
 * Under `prefers-reduced-motion` the travel never starts and the band becomes an ordinary
 * horizontally scrollable strip instead, which is the same content reachable by hand.
 *
 * ── Playback cost ───────────────────────────────────────────────────────────
 * Tiles are `decorative`, so they carry no per-tile controller: a control on a moving target
 * is unusable, and the duplicate copy is `aria-hidden`, which may not contain focusable
 * elements. Playback stays viewport-gated by `useVideoAutoplay`, so only the two or three
 * tiles actually on screen decode — the copies off both edges stay paused.
 */
export function FilmMarquee({
  films,
  dir,
  labels,
  /** Travel speed in CSS pixels per second. Slow enough to read a caption in passing. */
  speed = 45,
  className,
}: {
  films: MarqueeFilm[];
  dir: 'ltr' | 'rtl';
  labels: { group: string; pause: string; play: string };
  speed?: number;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);

  // Measured into CSS custom properties on the node itself rather than into React state.
  // The track re-measures on every resize and on every font or media load; routing that
  // through `setState` would re-render the whole strip — and its videos — on each one.
  useEffect(() => {
    const track = trackRef.current;
    const group = groupRef.current;
    if (!track || !group) return;

    const measure = () => {
      // `scrollWidth` rather than the bounding rect: the group is a flex row inside an
      // overflow-hidden track, and its rect is clipped to the visible width.
      //
      // The track's own column gap has to be added. It sits *between* the two copies, so
      // travelling exactly one group's width leaves the second copy one gap further along
      // than the first one started — a small but perfectly visible stutter once per loop.
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      const distance = group.scrollWidth + gap;
      if (distance <= gap) return;
      track.style.setProperty('--marquee-distance', `${distance}px`);
      track.style.setProperty('--marquee-duration', `${(distance / speed).toFixed(2)}s`);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    return () => observer.disconnect();
  }, [speed, films.length]);

  if (films.length === 0) return null;

  // How many copies it takes to keep the band full.
  //
  // Two is only enough while one copy is at least as wide as the screen. The travel is one
  // copy's width, so at the far end of the loop the last copy has moved fully out of frame —
  // if the remaining copies do not span the viewport, a hole opens at the trailing edge. Nine
  // films span roughly 2400px and two copies are ample; a smaller set does not, and the
  // shipping set can shrink whenever a rights decision changes. It shrank from nine to four
  // on 2026-08-09, which is exactly the case that would have drained on a wide monitor.
  //
  // Estimated from the tiles' own aspect ratios at the largest `--film-h`, so it is decided
  // at render time and needs no measurement round-trip.
  const WIDEST_SCREEN = 2560;
  const MAX_TILE_HEIGHT = 280;
  const GAP = 24;
  const groupEstimate = films.reduce(
    (total, { video }) => total + MAX_TILE_HEIGHT * (video.width / video.height) + GAP,
    0
  );
  const copyCount = Math.max(2, Math.ceil((WIDEST_SCREEN * 2) / Math.max(groupEstimate, 1)));

  // Only the first copy is announced. The rest are the same footage, and a screen reader
  // reading every film several times over would be a bug rather than a feature.
  const copies = Array.from({ length: copyCount }, (_, index) => ({
    key: index === 0 ? 'lead' : `echo-${index}`,
    hidden: index > 0,
  }));

  return (
    <div className={cn('relative', className)} data-film-marquee>
      {/* The clip. Static, and deliberately a separate element from the thing that moves.
          With the animation on the overflow-hidden box itself, the clipping window travels
          with the content: the band drains from its trailing edge and leaves a growing empty
          strip until the loop restarts. Measured, that hole reached 188px before the seam. */}
      <div
        data-marquee-viewport
        role="group"
        aria-label={labels.group}
        style={{ ['--film-h' as string]: 'clamp(180px, 26vh, 280px)' }}
        className={[
          'group overflow-hidden',
          // The strip bleeds past the gutter so it reads as a band crossing the page rather
          // than a component sitting inside a column.
          '-mx-(--gutter) px-(--gutter)',
          // Reduced motion: no travel, and the band becomes a plain scrollable strip so the
          // same films are still reachable by hand.
          'motion-reduce:snap-x motion-reduce:scrollbar-none motion-reduce:overflow-x-auto',
        ].join(' ')}
      >
        <div
          ref={trackRef}
          data-marquee-track
          data-paused={paused ? 'true' : undefined}
          style={{ ['--marquee-dir' as string]: dir === 'rtl' ? '1' : '-1' }}
          className={[
            'flex w-max gap-4 sm:gap-6',
            'motion-safe:animate-film-marquee',
            // Hover and focus stop it, so a caption can be read and a frame reached.
            'group-hover:[animation-play-state:paused]',
            'group-focus-within:[animation-play-state:paused]',
            'data-paused:[animation-play-state:paused]',
          ].join(' ')}
        >
          {copies.map((copy) => (
            <ul
              key={copy.key}
              ref={copy.key === 'lead' ? groupRef : undefined}
              aria-hidden={copy.hidden || undefined}
              className="flex shrink-0 items-start gap-4 sm:gap-6"
            >
              {films.map(({ video: film, label, title }) => (
                <li
                  key={film.id}
                  className="relative shrink-0 motion-reduce:snap-start"
                  // Uniform height, width from the film's own ratio — the same film-strip rule
                  // the rail uses. Forcing one shared width would letterbox the six portrait
                  // clips inside wide boxes and crop the three landscape ones.
                  style={{
                    width: `calc(var(--film-h) * ${(film.width / film.height).toFixed(4)})`,
                    height: 'var(--film-h)',
                  }}
                >
                  <div className="aperture size-full overflow-hidden">
                    <AmbientVideo
                      video={film}
                      label={label}
                      // No per-tile controller: the tile is moving, and the echo copy is
                      // aria-hidden and so may hold nothing focusable. One control for the
                      // whole band replaces them.
                      decorative
                      active={!paused}
                      className="size-full"
                    />
                  </div>

                  {/* Caption on the frame, over a scrim — not a card body under it. */}
                  <p
                    className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-(--radius-media) bg-linear-to-t from-black/70 to-transparent px-3 pt-8 pb-3 text-sm font-semibold text-white"
                    aria-hidden={copy.hidden || undefined}
                  >
                    {title}
                  </p>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        className="duration-fast mt-4 inline-flex min-h-11 items-center gap-2 rounded-(--radius-control) border border-rule px-3.5 text-sm text-ink-2 transition-colors ease-standard hover:border-ink-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {paused ? (
          <Play className="size-4" aria-hidden />
        ) : (
          <Pause className="size-4" aria-hidden />
        )}
        {paused ? labels.play : labels.pause}
      </button>
    </div>
  );
}
