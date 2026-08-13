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
 * ── Where a print ends up ───────────────────────────────────────────────────
 * Wherever it is put down. Released prints used to spring back to the fan (`dragSnapToOrigin`);
 * on the owner's instruction (2026-08-12) they now stay, so the pile can be dealt out and
 * rearranged. `dragConstraints` is the list itself, so a print can be moved anywhere inside the
 * fan's own box and nowhere outside it, and a print picked up stays on top of the ones it was
 * dropped over rather than sliding back under them.
 *
 * ── Why the drag is on a child ──────────────────────────────────────────────
 * The fan's entrance animates `x`/`y` on the `<li>`. If the drag wrote to the same element the
 * two would own one transform between them: any later re-render of the entrance variant — a
 * resize recomputes `step` — would yank every placed print back into the fan, and `whileHover`
 * would do the same on every pointer pass. The `<li>` keeps the layout, an inner element takes
 * the drag, and the two transforms simply compose.
 *
 * ── What it costs ───────────────────────────────────────────────────────────
 * Transforms and opacity only. Nothing here writes to `top`/`left`, so nothing can reflow the
 * section however the prints are arranged.
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

  /**
   * Which prints have been picked up, oldest first.
   *
   * A print that was moved has to stay above the ones it was dropped over — a pile where the
   * top card slides back underneath on release is not a pile anyone can sort. The array is the
   * order they were handled in, so the last one touched sits highest.
   */
  const [handled, setHandled] = useState<string[]>([]);

  /**
   * The fan's box and a print's size, measured together with `step`.
   *
   * Used to compute each print's drag boundary by hand. `dragConstraints={railRef}` is the
   * obvious way to say "stay inside this element" and it is wrong here: Motion measures the
   * draggable's own layout box but not the **ancestor** transform that the fan applies, so
   * every boundary came out displaced by exactly that print's fan offset. Measured at 1440,
   * a print released at the trailing edge kept 61px of itself outside the list in English and
   * stopped 48px short of it in Arabic — the same error, mirrored with the fan.
   */
  const [frame, setFrame] = useState({ w: 0, h: 0, pw: 0, ph: 0 });

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
      const first = rail.firstElementChild as HTMLElement | null;
      const print = first?.offsetWidth || 200;
      const gaps = Math.max(photos.length - 1, 1);
      // The whole fan has to fit: the outermost print's far edge is (n-1)/2 steps from centre
      // plus half a print. Solving for the step, and never wider than a print's own width,
      // which is where the pile stops reading as a pile and becomes a row.
      // The 12px is breathing room, so the outermost print sits *inside* the column rather
      // than exactly on its edge, where it reads as clipped.
      const fit = (available - print - 12) / gaps;
      setStep(Math.max(46, Math.min(print * 0.78, fit)));
      setFrame({
        w: available,
        h: rail.clientHeight,
        pw: print,
        ph: (first?.firstElementChild as HTMLElement | null)?.offsetHeight || print,
      });
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
          // A handled print sits above every print that has not been handled, and above every
          // print handled before it. 100 clears the fan's own range, which tops out at 40.
          const touched = handled.indexOf(photo.id);
          const layer = touched === -1 ? Math.round(depth * 10) : 100 + touched;

          /**
           * How far this print may travel from where the fan put it, in each direction.
           *
           * Derived rather than measured, because the geometry is already known: an absolutely
           * positioned child of this centred flex list starts at `(w - pw) / 2` across and 0
           * down, and the fan then moves it by `fanX` / `fanY`. What is left between the print
           * and each edge of the list is the boundary. `undefined` until the first measurement
           * lands, so the print drags freely for a frame rather than being pinned at zero.
           */
          const fanX = offset * sign * step;
          const fanY = Math.abs(offset) * 14 + (index % 2 === 0 ? 0 : 10);
          const halfSlack = (frame.w - frame.pw) / 2;
          // A print is tilted, and a rotated rectangle draws a wider box than it occupies:
          // half of `h · sin θ` sticks out past each vertical edge and half of `w · sin θ` past
          // each horizontal one. Without this the corner of a print pushed to the boundary hung
          // 8–14px outside the list — small, and exactly the kind of small that reads as a bug.
          const lean = Math.abs(Math.sin((tilt * Math.PI) / 180));
          const padX = (frame.ph * lean) / 2;
          const padY = (frame.pw * lean) / 2;
          const bounds =
            frame.w > 0
              ? {
                  left: -Math.max(0, halfSlack + fanX - padX),
                  right: Math.max(0, halfSlack - fanX - padX),
                  top: -Math.max(0, fanY - padY),
                  bottom: Math.max(0, frame.h - frame.ph - fanY - padY),
                }
              : undefined;

          return (
            <motion.li
              key={photo.id}
              className="absolute top-0 will-change-transform"
              style={{ zIndex: layer, width: 'var(--print-w)' }}
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
              data-cursor="grow"
            >
              {/* A print, not a card: a warm paper margin around the frame, and the frame
                  itself is the site's aperture. The margin is what makes it read as an object
                  lying on the page rather than a hole cut into it.

                  This is also the element that moves. It starts at the fan position its `<li>`
                  puts it in and keeps whatever offset the visitor gives it — see the note at
                  the top of the file for why the two transforms are on separate elements. */}
              <motion.div
                drag
                dragConstraints={bounds}
                // Hard stop, no give. Elastic slack looks better while the pointer is down, but
                // the overshoot does not spring back on release, and the boundary is the whole
                // point of the constraint.
                dragElastic={0}
                dragMomentum={false}
                onDragStart={() =>
                  setHandled((order) => [...order.filter((id) => id !== photo.id), photo.id])
                }
                whileDrag={{ scale: 1.06, cursor: 'grabbing' }}
                // Scale only. `y` here would fight the drag for the same transform and pull a
                // placed print back to the fan on every pointer pass.
                whileHover={reduced ? undefined : { scale: 1.04 }}
                className="cursor-grab rounded-[1.1rem] bg-paper-raised p-2 shadow-card active:cursor-grabbing"
              >
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
                <p aria-hidden className="numeric mt-2 px-1 pb-0.5 text-2xs text-ink-3" dir="ltr">
                  {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
                </p>
              </motion.div>
            </motion.li>
          );
        })}
      </motion.ul>

      <p className="mt-6 text-center annotation text-ink-3">{hint}</p>
    </div>
  );
}
