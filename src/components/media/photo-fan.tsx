'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export type FanPhoto = {
  id: string;
  src: string;
  width: number;
  height: number;
  blurDataURL?: string;
  alt: string;
};

/**
 * The contact sheet, as prints you can pick up.
 *
 * ── Why not a grid ──────────────────────────────────────────────────────────
 * These four frames were a row of four tiles under a heading: correct, and completely inert.
 * Nothing about them said "someone stood in this hall and took this photograph" — which is the
 * only thing the section is for. They are now laid out as physical prints, fanned from a single
 * point, overlapping, each at its own slight angle, and every one of them can be dragged out of
 * the pile and dropped back.
 *
 * The gesture is the point: the visitor handles the evidence rather than scrolling past it.
 *
 * ── What it costs ───────────────────────────────────────────────────────────
 * Transforms and opacity only. Dragging is `dragSnapToOrigin`, so a released print springs back
 * to where it belongs and the layout can never end up somewhere React does not know about —
 * nothing here writes to `top`/`left` and nothing can reflow the section.
 *
 * ── Direction ───────────────────────────────────────────────────────────────
 * The fan opens along the reading direction. In RTL the sign of every horizontal offset and of
 * every rotation flips, so the pile leans the other way — a fan that opens left-to-right in an
 * Arabic layout reads as a mistake, not as a mirror.
 *
 * ── Reduced motion ──────────────────────────────────────────────────────────
 * The prints are laid out in their final position with no entrance and no hover travel. They
 * are still draggable, because a drag is something the visitor asked for.
 */
export function PhotoFan({
  photos,
  dir,
  hint,
  className,
}: {
  photos: FanPhoto[];
  dir: 'ltr' | 'rtl';
  /** One line telling the visitor the prints move. Shown, not implied by a cursor alone. */
  hint: string;
  className?: string;
}) {
  const rtl = dir === 'rtl';
  const sign = rtl ? -1 : 1;

  /**
   * How far apart the prints sit, in pixels.
   *
   * Resolved in JS rather than in CSS because this number is *animated*: a spring interpolates
   * between two numbers, and it cannot interpolate toward a `calc()`. It is measured from the
   * **container**, not the viewport — the fan sits in a column, and a step derived from window
   * width pushed the outermost prints past that column's edges at every desktop size.
   */
  const [step, setStep] = useState(0);
  const railRef = useRef<HTMLUListElement>(null);

  /**
   * Reduced motion, read in an effect rather than with `useReducedMotion()`.
   *
   * Two reasons, and both are practical: the hook makes the first client render disagree with
   * the server for anyone who has the preference set, and Motion logs a development warning
   * about it on every page that uses it. Starting `false` and correcting in an effect renders
   * identically on both sides — the prints simply arrive without a spring instead of with one.
   */
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => {
      const available = rail.clientWidth;
      // Read off a real print rather than off `--print-w`: an unregistered custom property
      // computes to its own token stream, so parsing a `clamp()` out of it yields nothing.
      const print = (rail.firstElementChild as HTMLElement | null)?.offsetWidth || 200;
      const gaps = Math.max(photos.length - 1, 1);
      // The whole fan has to fit: the outermost print's far edge is (n-1)/2 steps from centre
      // plus half a print. Solving for the step, and never wider than a print's own width,
      // which is where the pile stops reading as a pile and becomes a row.
      // The 12px is breathing room, so the outermost print sits *inside* the column rather
      // than exactly on its edge, where it reads as clipped.
      const fit = (available - print - 12) / gaps;
      setStep(Math.max(46, Math.min(print * 0.78, fit)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [photos.length]);

  if (photos.length === 0) return null;

  const centre = (photos.length - 1) / 2;

  return (
    <div className={cn('relative', className)} data-photo-fan>
      {/* The pile's own light. A print lying on a surface has something under it; without this
          the fan floats on the section background and reads as a collage. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[8%] top-[18%] bottom-[6%] -z-10 rounded-[50%] blur-[60px]"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 50%, color-mix(in oklab, var(--color-accent) 18%, transparent), transparent 72%)',
        }}
      />

      <motion.ul
        ref={railRef}
        // Always `stacked`, never a reduced-motion branch. `useReducedMotion()` reads a media
        // query, which the server cannot know: branching the *initial* state on it renders one
        // transform on the server and another on the client, and React reports a hydration
        // mismatch on every reduced-motion visitor. Reduced motion is handled where it belongs
        // — in the transition below, which becomes instantaneous.
        initial="stacked"
        whileInView="fanned"
        viewport={{ once: true, amount: 0.35 }}
        className="relative mx-auto flex h-[clamp(260px,46vw,420px)] w-full items-start justify-center"
        style={{ ['--print-w' as string]: 'clamp(148px, 21vw, 248px)' }}
      >
        {photos.map((photo, index) => {
          const offset = index - centre;
          // Prints nearer the middle of the pile sit on top, which is how a fanned pile
          // actually behaves — the reference's strictly descending stack reads as a staircase.
          const depth = photos.length - Math.abs(offset);
          const tilt = offset * 3.2 * sign + (index % 2 === 0 ? -1.1 : 1.4);

          return (
            <motion.li
              key={photo.id}
              className="absolute top-0 will-change-transform"
              style={{ zIndex: Math.round(depth * 10), width: 'var(--print-w)' }}
              variants={{
                stacked: { x: 0, y: 0, rotate: 0, opacity: 0 },
                fanned: {
                  x: offset * sign * step,
                  y: Math.abs(offset) * 14 + (index % 2 === 0 ? 0 : 10),
                  rotate: tilt,
                  opacity: 1,
                },
              }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 72, damping: 14, delay: index * 0.09 }
              }
              drag
              dragSnapToOrigin
              dragElastic={0.55}
              dragMomentum={false}
              whileDrag={{ scale: 1.06, zIndex: 90, cursor: 'grabbing' }}
              whileHover={reduced ? undefined : { y: -16, scale: 1.03, zIndex: 80 }}
              data-cursor="grow"
            >
              {/* A print, not a card: a warm paper margin around the frame, and the frame
                  itself is the site's aperture. The margin is what makes it read as an object
                  lying on the page rather than a hole cut into it. */}
              <div className="cursor-grab rounded-[1.1rem] bg-paper-raised p-2 shadow-card active:cursor-grabbing">
                <div
                  className="aperture relative w-full"
                  style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    // The rendered box is the `--print-w` clamp above, and nothing wider is
                    // ever drawn — asking for more downloads a file the print cannot show.
                    sizes="(min-width: 1024px) 248px, 40vw"
                    placeholder={photo.blurDataURL ? 'blur' : undefined}
                    blurDataURL={photo.blurDataURL}
                    draggable={false}
                    className="object-cover select-none"
                  />
                </div>
                <p
                  aria-hidden
                  className="numeric mt-2 px-1 pb-0.5 text-2xs text-ink-3"
                  dir="ltr"
                >
                  {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
                </p>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>

      <p className="mt-6 text-center annotation text-ink-3">
        {hint}
      </p>
    </div>
  );
}
