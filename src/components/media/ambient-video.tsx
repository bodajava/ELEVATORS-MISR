'use client';

import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { useVideoAutoplay } from '@/lib/use-video-autoplay';
import type { VideoAsset } from '@/lib/media';
import { cn } from '@/lib/utils';

/**
 * A showcase film that behaves like part of the page rather than an embedded player.
 *
 * It plays itself, silently, when it is actually on screen, and stops when it is not — see
 * `useVideoAutoplay` for the two-stage observer and why nothing is downloaded until the clip
 * is near. Native controls are never rendered: a browser's default control bar is generic
 * chrome that belongs to the browser, not to this design.
 *
 * What replaces them is a small liquid-glass controller, and it only shows the controls that
 * are meaningful for the clip in hand — a sound toggle appears solely when the file actually
 * carries an audio track. Both controls are real buttons: keyboard reachable, labelled, and
 * with visible focus.
 *
 * Sound is off until the visitor asks. Nothing on this page ever starts audio on its own.
 */
export function AmbientVideo({
  video,
  className,
  label,
  /** Widest honest render in CSS px — see maxVideoWidth(). */
  maxWidth,
  /** Hide the controller entirely for purely decorative background footage. */
  decorative = false,
  /** Permission to autoplay. See useVideoAutoplay — the rail uses this to keep one film
      decoding at a time even when two slides are fully on screen. */
  active = true,
}: {
  video: VideoAsset;
  className?: string;
  /** Accessible name — describe the footage, not the control. */
  label: string;
  maxWidth?: number;
  decorative?: boolean;
  active?: boolean;
}) {
  const [muted, setMuted] = useState(true);
  const { ref, armed, playing } = useVideoAutoplay({ active, allowSound: !muted });
  const t = useTranslations('common');
  const controllerRef = useRef<HTMLDivElement>(null);

  const toggleSound = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = !el.muted;
    el.muted = next;
    setMuted(next);
  }, [ref]);

  const togglePlay = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  }, [ref]);

  /** Pointer-light position for the glass controller. */
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = controllerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  }, []);

  return (
    <div
      className={cn('relative isolate size-full', className)}
      style={maxWidth ? { maxWidth: `${maxWidth}px` } : undefined}
    >
      <video
        ref={ref}
        className="absolute inset-0 size-full object-cover"
        poster={video.poster}
        // No source until the arming observer fires, so a page with four films below the
        // fold downloads none of them on load.
        preload={armed ? 'metadata' : 'none'}
        muted
        loop
        playsInline
        // Never `controls`. The controller below replaces them.
        controls={false}
        aria-label={label}
        // Decorative footage is presentational; the caption beside it carries the meaning.
        aria-hidden={decorative || undefined}
        tabIndex={decorative ? -1 : undefined}
      >
        {armed ? (
          <>
            <source src={video.webm} type="video/webm" />
            <source src={video.mp4} type="video/mp4" />
          </>
        ) : null}
      </video>

      {!decorative ? (
        <div
          ref={controllerRef}
          onPointerMove={onPointerMove}
          className="glass-lit absolute end-3 bottom-3 z-10 flex items-center gap-1 rounded-(--radius-control-lg) glass-dark p-1"
        >
          <button
            type="button"
            onClick={togglePlay}
            // `size-11` (44px), not `size-9`: every other control in the codebase — the
            // carousel arrows, the lightbox close button, the dots — treats 44px as the tap
            // target floor, and this pair was the one place still built for a mouse pointer.
            // It stayed unnoticed because the controller is hover-gated everywhere except the
            // project pages, where it renders unconditionally and the gap actually mattered.
            className="duration-fast flex size-11 cursor-pointer items-center justify-center rounded-(--radius-control) text-ink-on-dark transition-colors hover:bg-accent hover:text-on-accent"
          >
            {playing ? (
              <Pause className="size-4" aria-hidden />
            ) : (
              <Play className="size-4" aria-hidden />
            )}
            <span className="sr-only">{playing ? t('pause') : t('play')}</span>
          </button>

          {/* Only offered when there is something to hear. */}
          {video.hasAudio ? (
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={!muted}
              className="duration-fast flex size-11 cursor-pointer items-center justify-center rounded-(--radius-control) text-ink-on-dark transition-colors hover:bg-accent hover:text-on-accent"
            >
              {muted ? (
                <VolumeX className="size-4" aria-hidden />
              ) : (
                <Volume2 className="size-4" aria-hidden />
              )}
              <span className="sr-only">{muted ? t('unmute') : t('mute')}</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
