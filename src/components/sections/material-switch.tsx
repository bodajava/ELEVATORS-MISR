'use client';

import Image from 'next/image';
import { useState } from 'react';

import type { ImageAsset } from '@/lib/media';
import { cn } from '@/lib/utils';

export type MaterialOption = {
  id: string;
  label: string;
  body: string;
  image: ImageAsset;
  alt: string;
};

/**
 * Materials, switched by hover, focus or tap.
 *
 * ── Why one component for all three inputs ──────────────────────────────────
 * A hover-only reveal is unusable on a phone and invisible to a keyboard. Rather than build a
 * desktop behaviour and a mobile fallback that drift apart, every option is a real `<button>`
 * and the active material is plain state. `onMouseEnter` and `onFocus` both set it, so a
 * pointer previews on hover, a keyboard previews on Tab, and a touch sets it on tap — the same
 * state, reached three ways.
 *
 * The preview frame is persistent: all images are rendered and cross-faded on opacity, so
 * switching never reflows and nothing has to load at the moment of interaction.
 *
 * ── What it will not claim ──────────────────────────────────────────────────
 * Labels and descriptions come from the project record's verified finish vocabulary. No
 * specification, supplier, grade or performance figure appears here, because none has been
 * supplied.
 */
export function MaterialSwitch({
  options,
  className,
}: {
  options: MaterialOption[];
  className?: string;
}) {
  const [active, setActive] = useState(0);

  if (options.length === 0) return null;

  return (
    <div
      className={cn('grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-14', className)}
    >
      {/* The list. Rules move and the index lifts to orange — the same gesture as the
          project index, so the two read as one system. */}
      <ul className="flex flex-col">
        {options.map((option, index) => {
          const isActive = index === active;
          return (
            <li key={option.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActive(index)}
                aria-pressed={isActive}
                className="group/mat w-full cursor-pointer border-t border-rule py-6 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <div className="flex items-baseline gap-4">
                  <span
                    dir="ltr"
                    className={cn(
                      'numeric duration-fast annotation transition-colors ease-standard',
                      isActive ? 'text-accent-text' : 'text-ink-3'
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={cn(
                      'duration-fast font-display text-xl transition-colors ease-standard sm:text-2xl',
                      isActive ? 'text-ink' : 'text-ink-3 group-hover/mat:text-ink'
                    )}
                  >
                    {option.label}
                  </span>
                </div>

                {/* The rule fills as the material becomes active. */}
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
                    'duration-base mt-4 max-w-[46ch] text-sm transition-opacity ease-standard',
                    isActive ? 'text-ink-2 opacity-100' : 'text-ink-3 opacity-70'
                  )}
                >
                  {option.body}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Persistent preview. Every frame is mounted; only opacity changes, so there is no
          layout shift and no load delay when switching. */}
      <div className="aperture relative aspect-4/5 w-full overflow-hidden sm:aspect-3/2 lg:aspect-4/5">
        {options.map((option, index) => (
          <Image
            key={option.id}
            src={option.image.src}
            alt={index === active ? option.alt : ''}
            aria-hidden={index !== active}
            fill
            sizes="(min-width: 1024px) 52vw, 92vw"
            className={cn(
              'duration-slow object-cover transition-opacity ease-travel',
              index === active ? 'opacity-100' : 'opacity-0'
            )}
          />
        ))}
      </div>
    </div>
  );
}
