'use client';

import Image from 'next/image';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export type ExplorerStop = {
  /** The claim, as a heading. */
  title: string;
  /** One sentence of substantiation. */
  body: string;
  image: { src: string; width: number; height: number; blurDataURL: string };
  alt: string;
};

/**
 * The panorama explorer — the product story as a car moving between floors.
 *
 * ── Why this shape ──────────────────────────────────────────────────────────
 * The four claims used to be a two-by-two definition list beside one sticky photograph: true,
 * legible, and completely static. Nothing in it belonged to elevators rather than to any other
 * product page.
 *
 * The device here is the one instrument every visitor already knows how to read — a floor
 * indicator. The claims are stops on a shaft; selecting one moves the car marker to it and the
 * frame beside it changes to the installation that shows what the claim means. The gesture is
 * borrowed from the subject rather than from a component library, which is the whole point.
 *
 * ── Behaviour ───────────────────────────────────────────────────────────────
 * A real tablist: arrow keys move between stops, Home and End jump to the ends, and the panel
 * is associated with its tab. It advances on its own so the section is alive for a visitor who
 * never touches it, and it stops the moment anyone hovers it, focuses inside it, or the tab is
 * hidden — content that moves on its own has to be stoppable, and here interacting is the stop.
 *
 * Under `prefers-reduced-motion` nothing advances by itself and nothing travels: the marker
 * moves without transition and the frames cut rather than cross-fade. Every stop is still
 * reachable, which is the part that matters.
 *
 * ── Direction ───────────────────────────────────────────────────────────────
 * The shaft is vertical, so RTL needs nothing from the travel. The rail sits on the inline
 * start edge via logical properties, which is where it belongs in both directions.
 */
export function PanoramaExplorer({
  stops,
  labels,
  className,
}: {
  stops: ExplorerStop[];
  labels: {
    /** Accessible name of the tablist, e.g. "What a panorama car does". */
    group: string;
    /** Prefix for each stop's accessible name, e.g. "Point". */
    stop: string;
  };
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  /**
   * Where the car sits.
   *
   * Measured from the active stop rather than computed as a fraction of the list: the stops
   * are different heights, because only the open one shows its body text. A percentage would
   * put the marker beside the wrong stop the moment the copy changed length.
   */
  useLayoutEffect(() => {
    const measure = () => {
      const tab = tabRefs.current[active];
      const list = listRef.current;
      if (!tab || !list) return;
      setMarker({ top: tab.offsetTop, height: tab.offsetHeight });
    };
    measure();

    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const tab of tabRefs.current) if (tab) observer.observe(tab);
    return () => observer.disconnect();
  }, [active, stops.length]);

  /* Advance on its own, and stop the instant anyone engages. */
  useEffect(() => {
    if (held || reduced || stops.length < 2) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % stops.length), 6200);
    return () => window.clearInterval(timer);
  }, [held, reduced, stops.length]);

  useEffect(() => {
    const onVisibility = () => setHeld(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const move = useCallback(
    (next: number) => {
      const index = ((next % stops.length) + stops.length) % stops.length;
      setActive(index);
      tabRefs.current[index]?.focus();
    },
    [stops.length]
  );

  if (stops.length === 0) return null;

  return (
    <div
      // `items-stretch`, not `items-start`: the frame takes the row's height, which is the
      // height of the stops beside it. With a fixed aspect ratio the frame ran ~430px taller
      // than the list at 1440 and left exactly that much dead space under the stops — the
      // defect the emptiness harness exists to catch.
      className={cn('grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch lg:gap-16', className)}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setHeld(false);
      }}
      data-panorama-explorer
    >
      {/* ── The shaft ───────────────────────────────────────────────────────── */}
      <div className="relative ps-8 sm:ps-10">
        {/* The rail the car runs on. */}
        <span aria-hidden className="absolute inset-y-2 start-3 w-px bg-rule-strong sm:start-4" />
        {/* The car. Its travel is the section's one piece of choreography. */}
        <span
          aria-hidden
          className={cn(
            'absolute start-3 -ms-[3px] w-[7px] rounded-full bg-accent sm:start-4',
            reduced ? '' : 'transition-[top,height] duration-slow ease-travel'
          )}
          style={{
            top: marker ? `${marker.top + 10}px` : '0px',
            height: marker ? `${Math.max(marker.height - 20, 16)}px` : '0px',
            opacity: marker ? 1 : 0,
          }}
        />

        <div
          ref={listRef}
          role="tablist"
          aria-orientation="vertical"
          aria-label={labels.group}
          className="flex flex-col"
        >
          {stops.map((stop, index) => {
            const selected = index === active;
            return (
              <button
                key={stop.title}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`panorama-stop-${index}`}
                aria-selected={selected}
                aria-controls="panorama-frame"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    move(active + 1);
                  }
                  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                    event.preventDefault();
                    move(active - 1);
                  }
                  if (event.key === 'Home') {
                    event.preventDefault();
                    move(0);
                  }
                  if (event.key === 'End') {
                    event.preventDefault();
                    move(stops.length - 1);
                  }
                }}
                className={cn(
                  'duration-base group/stop border-t border-rule py-5 text-start transition-colors ease-standard',
                  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus',
                  selected ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
                )}
              >
                <span className="flex items-baseline gap-3">
                  <span
                    className={cn(
                      'numeric text-2xs transition-colors',
                      selected ? 'text-accent-text' : 'text-ink-3'
                    )}
                    dir="ltr"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-display text-lg text-current sm:text-xl">{stop.title}</span>
                </span>

                {/* The body belongs to the open stop only. Collapsed with a grid row rather
                    than a height animation, so nothing animates a layout property. */}
                <span
                  className={cn(
                    'grid text-sm text-ink-2',
                    reduced ? '' : 'duration-base transition-[grid-template-rows,opacity] ease-standard',
                    selected ? 'mt-2.5 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  )}
                >
                  <span className="overflow-hidden">
                    <span className="block max-w-[46ch] ps-8">{stop.body}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── The frame ───────────────────────────────────────────────────────── */}
      <div
        id="panorama-frame"
        role="tabpanel"
        aria-labelledby={`panorama-stop-${active}`}
        className="aperture relative aspect-4/5 w-full overflow-hidden sm:aspect-3/2 lg:aspect-auto lg:h-full lg:min-h-[26rem]"
      >
        {stops.map((stop, index) => (
          <Image
            key={stop.image.src}
            src={stop.image.src}
            alt={index === active ? stop.alt : ''}
            aria-hidden={index !== active}
            fill
            sizes="(min-width: 1024px) 48vw, 92vw"
            placeholder="blur"
            blurDataURL={stop.image.blurDataURL}
            className={cn(
              'object-cover',
              reduced ? '' : 'duration-slow transition-opacity ease-travel',
              index === active ? 'opacity-100' : 'opacity-0'
            )}
          />
        ))}

        {/* The floor readout. Small, monospaced, and the only ornament here — it is what the
            device in the lobby actually shows. */}
        <span
          aria-hidden
          className="numeric absolute end-4 top-4 z-10 rounded-(--radius-control) bg-carbon/70 px-2.5 py-1 text-2xs text-ink-on-dark"
          dir="ltr"
        >
          {String(active + 1).padStart(2, '0')} / {String(stops.length).padStart(2, '0')}
        </span>

        <span className="sr-only" aria-live="polite">
          {`${labels.stop} ${active + 1}: ${stops[active].title}`}
        </span>
      </div>
    </div>
  );
}
