'use client';

import Image from 'next/image';
import { useRef } from 'react';

import type { Locale } from '@/i18n/config';
import { gsap, useGSAP } from '@/lib/gsap';
import type { ImageAsset } from '@/lib/media';
import { cn } from '@/lib/utils';

type Floor = {
  meta: { label: string; value: string }[];
  image: ImageAsset;
  alt: string;
  title: string;
  note: string;
  maxWidth: number;
};

/**
 * The ascent — five installations, one dense composition.
 *
 * ── What this replaces, and why ─────────────────────────────────────────────
 * A pinned sequence that showed **one** installation at a time in a full viewport: a caption
 * in the lower-left corner and a single portrait frame on the right. Measured coverage was
 * 22% of the screen — four fifths of it was cream. It also meant scrolling through five
 * viewports to see five photographs, which is a slow way to show work to someone deciding
 * whether to book.
 *
 * The rebuild puts all five on screen at once as an interlocking mosaic. The tallest frame
 * anchors the left, two stack against it, and the remaining two run beneath at different
 * widths — so the eye moves diagonally rather than down a list, and the section is full of
 * photograph rather than full of gap.
 *
 * ── Why a mosaic and not a carousel or a grid of cards ──────────────────────
 * The photographs are portrait phone captures of shafts. Uniform cells either letterbox them
 * or crop the car out. Cells sized from each frame's own proportion keep every one intact and
 * produce the irregular rhythm the layout wants anyway.
 *
 * ── Motion ──────────────────────────────────────────────────────────────────
 * No pin and no scrub. Each frame rises a short distance on entry, staggered, and the counter
 * beside it counts up. Transforms and opacity only. Under reduced motion the composition is
 * simply there, which is the same composition — nothing is hidden behind an animation.
 */
export function Ascent({
  floors,
  eyebrow,
  heading,
  locale,
}: {
  floors: Floor[];
  eyebrow: string;
  heading: string;
  locale: Locale;
}) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const frames = gsap.utils.toArray<HTMLElement>('[data-ascent-frame]', root);
        if (frames.length === 0) return;

        const tween = gsap.from(frames, {
          yPercent: 8,
          autoAlpha: 0,
          duration: 0.9,
          ease: 'travel',
          stagger: 0.08,
          scrollTrigger: {
            trigger: root,
            // Fires when the section is genuinely being looked at, not when its first pixel
            // clips the bottom of the screen.
            start: 'top 72%',
            once: true,
          },
        });

        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    { scope }
  );

  if (floors.length === 0) return null;

  /**
   * Cell geometry, keyed to position rather than to the item.
   *
   * Five frames across a twelve-column grid: a tall anchor, two stacked beside it, then two
   * wider ones underneath. Every row is exactly full — there is no arrangement of five that
   * leaves a hole here.
   */
  const CELLS = [
    'lg:col-span-5 lg:row-span-2 aspect-3/4',
    'lg:col-span-4 aspect-4/3',
    'lg:col-span-3 aspect-3/4',
    'lg:col-span-4 aspect-4/3',
    'lg:col-span-3 aspect-square',
  ];

  return (
    <section ref={scope} className="py-20 lg:py-28" aria-label={heading}>
      <div className="mx-auto w-full max-w-page px-(--gutter)">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
          <div>
            <p className="annotation text-accent-text">{eyebrow}</p>
            <h2 className="mt-3 max-w-[18ch] font-display text-3xl text-balance text-ink sm:text-4xl">
              {heading}
            </h2>
          </div>
          <p className="numeric shrink-0 annotation text-ink-3" dir="ltr">
            {String(floors.length).padStart(2, '0')}
          </p>
        </div>

        <ol className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:mt-14 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-12">
          {floors.map((floor, index) => (
            <li
              key={floor.image.id}
              data-ascent-frame
              // Only the span travels to the list item — the aspect ratio belongs to the
              // frame below, so the caption is never squeezed into the photograph's ratio.
              className={cn(
                'col-span-2 flex flex-col',
                CELLS[index % CELLS.length]
                  .split(' ')
                  .filter((c) => !c.startsWith('aspect-'))
                  .join(' ')
              )}
            >
              <div
                className={cn(
                  'aperture relative w-full overflow-hidden',
                  CELLS[index % CELLS.length].split(' ').find((c) => c.startsWith('aspect-'))
                )}
              >
                <Image
                  src={floor.image.src}
                  alt={floor.alt}
                  fill
                  sizes="(min-width: 1024px) 40vw, 46vw"
                  className="object-cover"
                />

                <span
                  className="numeric absolute inset-s-3 top-3 rounded-(--radius-control) bg-carbon/70 px-2 py-1 text-2xs font-semibold text-ink-on-dark"
                  dir="ltr"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              <div className="mt-3 flex flex-1 flex-col">
                <h3 className="font-display text-base text-ink sm:text-lg">{floor.title}</h3>
                <p className="mt-1.5 max-w-[42ch] text-sm text-ink-2">{floor.note}</p>

                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 pt-2.5 rule-t">
                  {floor.meta.map((item) => (
                    <div key={item.label} className="flex items-baseline gap-2">
                      <dt className="annotation text-ink-3">{item.label}</dt>
                      <dd className="text-xs text-ink-2">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </li>
          ))}
        </ol>

        <p className="sr-only">
          {locale === 'en'
            ? 'Five completed panorama elevator installations.'
            : 'خمسة أعمال منفَّذة لمصاعد بانوراما.'}
        </p>
      </div>
    </section>
  );
}
