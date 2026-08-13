'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { HeroAsset } from '@/lib/media';
import { cn } from '@/lib/utils';

/**
 * Which hero variant, if any, this device should load.
 *
 * Modelled as an external store because `matchMedia` and `navigator.connection` *are* external
 * systems — subscribing means the value is right on first client render and stays right if the
 * device rotates or Save-Data is switched on mid-session.
 *
 * The snapshot returns a string, not an object: `useSyncExternalStore` compares by identity and
 * a fresh object every call would loop forever.
 */
type HeroVariant = 'none' | 'mobile' | 'desktop';

function subscribe(onChange: () => void) {
  const queries = [
    window.matchMedia('(prefers-reduced-motion: reduce)'),
    window.matchMedia('(max-width: 767px)'),
  ];
  for (const q of queries) q.addEventListener('change', onChange);
  return () => {
    for (const q of queries) q.removeEventListener('change', onChange);
  };
}

function getSnapshot(): HeroVariant {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'none';

  const connection = (
    navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }
  ).connection;
  if (connection?.saveData) return 'none';
  if (connection?.effectiveType && /(^|-)2g$|3g/.test(connection.effectiveType)) return 'none';

  return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
}

/** The server never guesses: it renders the poster and the client upgrades from there. */
function getServerSnapshot(): HeroVariant {
  return 'none';
}

export function HeroVideo({ hero, className }: { hero: HeroAsset; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const variant = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [ready, setReady] = useState(false);

  /**
   * The poster below is the Largest Contentful Paint element, and the video used to race it.
   *
   * `getSnapshot` already declines the video on Save-Data and on a connection reporting 2g/3g,
   * but throttling at the transport — which is what a real slow connection and Lighthouse's
   * "Slow 4G" both look like — does not change `navigator.connection`, so none of those guards
   * fire and `preload="auto"` opened a 296 KB download in parallel with a 51 KB image on a
   * 1.6 Mbps link. Measured LCP was 5.9–6.4 s with the poster itself weighing 51 KB.
   *
   * So the video is not requested until the poster has finished loading. Nothing about the
   * result changes — the poster was always what painted first and the video always faded in
   * over it — it just stops the decoration competing with the content for the same pipe.
   *
   * `complete` is checked before subscribing because a cached poster finishes loading before
   * this effect runs, and `error` counts as done: a broken poster must not strand the video.
   */
  const [posterLoaded, setPosterLoaded] = useState(false);
  useEffect(() => {
    const img = posterRef.current;
    if (!img) return;
    if (img.complete) {
      setPosterLoaded(true);
      return;
    }
    const done = () => setPosterLoaded(true);
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
    return () => {
      img.removeEventListener('load', done);
      img.removeEventListener('error', done);
    };
  }, []);

  const src = variant === 'none' || !posterLoaded ? null : hero.variants[variant].mp4;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !src) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  return (
    <div className={cn('absolute inset-0 overflow-clip bg-aperture', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- must paint with the document,
          not be deferred behind the image optimiser. */}
      <img
        ref={posterRef}
        src={hero.poster}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover object-center"
        fetchPriority="high"
        decoding="async"
      />

      {src ? (
        <video
          key={src}
          ref={videoRef}
          className={cn(
            'duration-slow absolute inset-0 size-full object-cover object-center transition-opacity ease-standard',
            ready ? 'opacity-100' : 'opacity-0'
          )}
          poster={hero.poster}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          aria-hidden
          tabIndex={-1}
          onCanPlay={() => setReady(true)}
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : null}
    </div>
  );
}
