'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import { AmbientVideo } from '@/components/media/ambient-video';
import type { VideoAsset } from '@/lib/media';

export type LightboxFilm = {
  video: VideoAsset;
  label: string;
  title: string;
  meta: string;
};

/**
 * The expanded film — one clip, filling the screen, with the strip's own navigation.
 *
 * ── Why a dialog and not an overlay div ─────────────────────────────────────
 * `showModal()` on a real `<dialog>` gives the top layer, the backdrop, focus containment and
 * Escape-to-close from the platform. A hand-rolled overlay has to reimplement all four, and
 * the usual result is a modal a keyboard user can tab straight out of into the page behind it.
 *
 * ── Direction ───────────────────────────────────────────────────────────────
 * The arrows are labelled by what they do — previous and next film — not by which way they
 * point, and the icons swap in RTL so "next" always points the way the page reads.
 *
 * ── Playback ────────────────────────────────────────────────────────────────
 * Only the open film mounts, so opening the viewer never starts a second decode. The strip
 * behind it is paused by the caller for the same reason.
 */
export function FilmLightbox({
  films,
  index,
  dir,
  labels,
  onClose,
  onIndexChange,
}: {
  films: LightboxFilm[];
  /** `null` closes it. */
  index: number | null;
  dir: 'ltr' | 'rtl';
  labels: { close: string; previous: string; next: string };
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null;

  // `showModal()` is imperative by nature — there is no declarative equivalent that produces
  // the top layer — so the element is driven to match the prop rather than the other way round.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const step = useCallback(
    (delta: number) => {
      if (index === null) return;
      onIndexChange((index + delta + films.length) % films.length);
    },
    [index, films.length, onIndexChange]
  );

  // Narrowed once, so the render below never has to re-prove that the viewer is open.
  const current = index === null ? null : { at: index, film: films[index] };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        // Backdrop clicks land on the dialog itself; anything inside stops here.
        if (event.target === ref.current) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') step(dir === 'rtl' ? -1 : 1);
        if (event.key === 'ArrowLeft') step(dir === 'rtl' ? 1 : -1);
      }}
      className="max-h-none max-w-none bg-transparent backdrop:bg-carbon/90 backdrop:backdrop-blur-sm"
      style={{ width: '100vw', height: '100dvh', padding: 0, border: 0 }}
    >
      {current ? (
        <div className="flex size-full flex-col items-center justify-center gap-4 p-4 sm:p-8">
          <div className="flex w-full max-w-5xl items-center justify-between gap-3">
            {/* Digits only, forced LTR: an Arabic page still reads "2 / 4" left to right,
                the same rule the rest of the site applies to reference codes. */}
            <p className="numeric annotation text-ink-2-on-dark" dir="ltr">
              {current.at + 1} / {films.length}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label={labels.close}
              className="duration-fast inline-flex size-11 items-center justify-center rounded-(--radius-control) border border-rule-on-dark text-ink-on-dark transition-colors ease-standard hover:border-accent hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className="flex w-full max-w-5xl flex-1 items-center gap-3 sm:gap-5">
            <NavButton
              onClick={() => step(-1)}
              label={labels.previous}
              icon={dir === 'rtl' ? 'forward' : 'back'}
            />

            <figure className="flex min-w-0 flex-1 flex-col items-center gap-4">
              <div
                className="aperture w-full overflow-hidden"
                style={{
                  aspectRatio: `${current.film.video.width} / ${current.film.video.height}`,
                  maxHeight: '70dvh',
                }}
              >
                <AmbientVideo
                  key={current.film.video.id}
                  video={current.film.video}
                  label={current.film.label}
                  className="size-full"
                />
              </div>
              <figcaption className="flex w-full items-baseline justify-between gap-4">
                <p className="font-display text-base text-ink-on-dark sm:text-lg">
                  {current.film.title}
                </p>
                <p className="shrink-0 annotation text-ink-2-on-dark">{current.film.meta}</p>
              </figcaption>
            </figure>

            <NavButton
              onClick={() => step(1)}
              label={labels.next}
              icon={dir === 'rtl' ? 'back' : 'forward'}
            />
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

function NavButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: 'back' | 'forward';
}) {
  const Icon = icon === 'back' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="duration-fast inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-rule-on-dark text-ink-on-dark transition-colors ease-standard hover:border-accent hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
