'use client';

import Image from 'next/image';
import { useState } from 'react';

import { cn } from '@/lib/utils';

export type ProcessStage = {
  id: string;
  title: string;
  body: string;
  /** Real project media chosen for its contextual fit with this stage. */
  media: { src: string; alt: string; orientation: string } | null;
};

/**
 * The process, as an editorial sequence with a persistent preview.
 *
 * ── What this replaces ──────────────────────────────────────────────────────
 * A static list of six headings and paragraphs. Nothing responded to anything, no media
 * appeared, and the page read as unfinished.
 *
 * ── One state, three inputs ─────────────────────────────────────────────────
 * The active stage is plain state, and every stage is a real `<button>`. `onMouseEnter` and
 * `onFocus` both set it, `onClick` sets it too. So a pointer previews on hover, a keyboard
 * previews on Tab, and a touch sets it on tap — the same state reached three ways, rather
 * than a desktop behaviour with a separate mobile fallback that drifts out of sync.
 *
 * Because it is a button and not a hover-only affordance, the whole sequence is operable
 * with a keyboard and on a phone without a single extra branch.
 *
 * ── The preview ─────────────────────────────────────────────────────────────
 * Desktop: one sticky frame beside the list. Every image is mounted and cross-faded on
 * opacity — no layout shift when switching, and nothing to load at the moment of
 * interaction. Mobile: the same frame, rendered inline beneath the active stage, so there is
 * no hover dependency and the neighbouring stages stay on screen.
 */
export function ProcessSequence({
  stages,
  locale,
  headingLevel = 'h2',
}: {
  stages: ProcessStage[];
  locale: 'en' | 'ar';
  headingLevel?: 'h2' | 'h3';
}) {
  const [active, setActive] = useState(0);
  const Heading = headingLevel;

  if (stages.length === 0) return null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_0.92fr] lg:items-start lg:gap-16">
      {/* ── The stages ──────────────────────────────────────────────────── */}
      <ol className="flex flex-col">
        {stages.map((stage, index) => {
          const isActive = index === active;
          return (
            <li key={stage.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActive(index)}
                aria-expanded={isActive}
                aria-controls={`stage-panel-${stage.id}`}
                className="group/stage w-full cursor-pointer border-t border-rule py-6 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus lg:py-7"
              >
                <div className="flex items-baseline gap-4 sm:gap-6">
                  <span
                    dir="ltr"
                    className={cn(
                      'numeric duration-fast shrink-0 annotation transition-colors ease-standard',
                      isActive ? 'text-accent-text' : 'text-ink-3'
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <Heading
                    className={cn(
                      'duration-fast font-display text-xl transition-colors ease-standard sm:text-2xl',
                      isActive ? 'text-ink' : 'text-ink-3 group-hover/stage:text-ink'
                    )}
                  >
                    {stage.title}
                  </Heading>
                </div>

                {/* The rule fills across as the stage becomes active — the same gesture the
                    project index and the materials switch use, so the three read as one
                    system rather than three separate ideas. */}
                <span className="mt-4 block h-px w-full bg-rule">
                  <span
                    className={cn(
                      'duration-base block h-px bg-accent transition-[width] ease-travel',
                      isActive ? 'w-full' : 'w-0'
                    )}
                  />
                </span>

                <p
                  className={cn(
                    'duration-base mt-4 max-w-[52ch] text-sm transition-opacity ease-standard sm:text-base',
                    isActive ? 'text-ink-2 opacity-100' : 'text-ink-3 opacity-75'
                  )}
                >
                  {stage.body}
                </p>
              </button>

              {/* Mobile: the media sits inline under the stage it belongs to, so there is no
                  hover dependency and the next and previous stages stay in view. */}
              <div
                id={`stage-panel-${stage.id}`}
                hidden={!isActive}
                className="pb-6 lg:hidden"
                aria-live="polite"
              >
                {stage.media ? (
                  <div className="aperture relative h-[clamp(200px,34vh,320px)] w-full overflow-hidden">
                    <Image
                      src={stage.media.src}
                      alt={stage.media.alt}
                      fill
                      sizes="92vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
        <li aria-hidden className="border-t border-rule" />
      </ol>

      {/* ── Desktop preview ─────────────────────────────────────────────────
          Sticky, so it stays beside the stage being read. Every frame is mounted and only
          opacity changes: no reflow, no load pause, and the crossfade is a mask rather than
          a card swap. */}
      <div className="sticky top-28 hidden lg:block">
        <div className="aperture relative aspect-4/5 w-full overflow-hidden">
          {stages.map((stage, index) =>
            stage.media ? (
              <Image
                key={stage.id}
                src={stage.media.src}
                alt={index === active ? stage.media.alt : ''}
                aria-hidden={index !== active}
                fill
                sizes="(min-width: 1024px) 44vw, 92vw"
                className={cn(
                  'duration-slow object-cover transition-opacity ease-travel',
                  index === active ? 'opacity-100' : 'opacity-0'
                )}
              />
            ) : null
          )}
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-4">
          <p className="annotation text-ink-3">{stages[active]?.title}</p>
          <p className="numeric annotation text-ink-3" dir="ltr">
            {String(active + 1).padStart(2, '0')} / {String(stages.length).padStart(2, '0')}
          </p>
        </div>

        {/* A progress rail, so the reader can see where they are in the sequence. */}
        <div className="mt-3 flex gap-1" aria-hidden>
          {stages.map((stage, index) => (
            <span
              key={stage.id}
              className={cn(
                'duration-fast h-0.5 flex-1 transition-colors ease-standard',
                index <= active ? 'bg-accent' : 'bg-rule'
              )}
            />
          ))}
        </div>

        <p className="sr-only">
          {locale === 'en'
            ? 'Focus or select a stage to preview it.'
            : 'اختر مرحلة أو انتقل إليها بلوحة المفاتيح لعرضها.'}
        </p>
      </div>
    </div>
  );
}
