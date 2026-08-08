'use client';

import {
  HoverSlider,
  HoverSliderImage,
  HoverSliderImageWrap,
  TextStaggerHover,
  useHoverSlide,
} from '@/components/ui/animated-slideshow';
import { Link } from '@/i18n/navigation';

export type IndexEntry = {
  slug: string;
  /** The installation's title, already resolved to the request locale. */
  title: string;
  /** Alt text, written per project from what is in frame. */
  alt: string;
  finish: string;
  /** Pre-built derivative, widest first in `srcSet`. */
  src: string;
  srcSet: string;
  width: number;
  height: number;
};

/**
 * The installations index — a typographic list that reveals the frame beside it.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * The projects index opened with a breadcrumb, a heading and a paragraph, and then nothing
 * until the first mosaic — a text-only screen at the top of the page whose whole subject is
 * photography. This band is that screen: every installation named in one place, with the
 * photograph appearing as you move down the list.
 *
 * It is not a second copy of the mosaic. The mosaic below is for browsing images; this is for
 * reading the list — the page's contents page, and the one place the ten titles are legible
 * as a set.
 *
 * ── Reachable three ways ────────────────────────────────────────────────────
 * Each title is a real `<button>` that responds to hover, focus and tap, so a pointer previews
 * on hover, a keyboard previews on Tab and a touch previews on tap. Selecting is not
 * navigating: the frame beside the list is the link, and it points at whichever installation
 * is selected. That keeps a single tap from launching a page the visitor only meant to peek at.
 *
 * ── Media ───────────────────────────────────────────────────────────────────
 * The frames are the manifest's own pre-built derivatives with a real `srcSet`, not
 * `next/image` — the reveal animates a `clip-path` on the element itself, and all ten are
 * mounted at once so the swap never waits on a download. Sizes are capped by the caller to
 * the widest each source can be drawn before it softens.
 */
export function ProjectIndex({
  entries,
  frameLabel,
  maxFrameWidth,
}: {
  entries: IndexEntry[];
  /** e.g. "Open this installation" — the accessible name of the frame link. */
  frameLabel: string;
  maxFrameWidth: number;
}) {
  if (entries.length === 0) return null;

  return (
    <HoverSlider
      data-project-index
      /* `auto` rather than a fraction: the frame is capped at the narrowest source's honest
         width (~357px), so a `1fr` column would reserve twice that and leave the difference
         as dead air beside it. The list absorbs whatever the frame does not need. */
      className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16"
    >
      {/* Sized so a title holds one line at `lg`, where the two columns are side by side.
          At display sizes the longest titles wrapped to three lines each and the list grew
          past 1500px, which left the frame stranded in the middle of an empty column. */}
      <ul className="flex flex-col divide-y divide-rule">
        {entries.map((entry, index) => (
          <li key={entry.slug} className="flex items-baseline gap-3 py-2 sm:gap-4 sm:py-2.5">
            <span className="numeric w-7 shrink-0 annotation tabular-nums" dir="ltr" aria-hidden>
              {String(index + 1).padStart(2, '0')}
            </span>
            <TextStaggerHover
              index={index}
              text={entry.title}
              /* A step down below `sm`. Arabic titles are longer than their English
                 counterparts and wrapped every row to two lines on a phone, which pushed the
                 frame so far down that only an 86px sliver of it was on screen — a preview
                 the visitor could not read. */
              className="font-display text-sm leading-snug text-ink sm:text-lg lg:text-xl"
            />
          </li>
        ))}
      </ul>

      <IndexFrame entries={entries} frameLabel={frameLabel} maxFrameWidth={maxFrameWidth} />
    </HoverSlider>
  );
}

/**
 * The revealed frame.
 *
 * Split out purely because it needs the active index from context, which is only readable
 * below the provider.
 */
function IndexFrame({
  entries,
  frameLabel,
  maxFrameWidth,
}: {
  entries: IndexEntry[];
  frameLabel: string;
  maxFrameWidth: number;
}) {
  const { activeSlide } = useHoverSlide();
  const active = entries[activeSlide] ?? entries[0];
  if (!active) return null;

  return (
    /* Sticky only from `lg`.
       Making it sticky on a phone as well was tried and reverted: at 390px the frame is
       446px tall, so pinned below the header it covered the list it exists to serve and the
       rows scrolled underneath an opaque photograph. Stacked normally the ten rows measure
       ~440px, which leaves the top of the frame on screen beneath them — a tap still changes
       something the visitor can see. */
    <div
      className="mx-auto w-full self-start lg:sticky lg:top-28"
      style={{ maxWidth: `${maxFrameWidth}px` }}
    >
      <Link
        href={`/projects/${active.slug}`}
        data-index-frame
        aria-label={`${frameLabel}: ${active.title}`}
        className="group block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
      >
        <HoverSliderImageWrap className="aperture aspect-4/5 w-full aperture-mask">
          {entries.map((entry, index) => (
            <HoverSliderImage
              key={entry.slug}
              index={index}
              imageUrl={entry.src}
              srcSet={entry.srcSet}
              sizes="(max-width: 1024px) 92vw, 380px"
              width={entry.width}
              height={entry.height}
              loading="lazy"
              decoding="async"
              /* Empty: the accessible name is on the link, and ten stacked frames each
                 announcing themselves would read as ten images to a screen reader. */
              alt=""
              aria-hidden
              /* `absolute` matters. Left in flow, the ten stacked images share one auto-sized
                 grid row, so the row grows to the tallest *intrinsic* height in the set — the
                 narrowest source, 621x1280, which at this width is 721px against a 438px
                 aperture. Every frame was then stretched to 721px and clipped from the bottom,
                 so `object-center` never centred anything. Out of flow, the aperture's aspect
                 ratio governs the box and the crop is the one that was asked for. */
              className="absolute inset-0 size-full object-cover object-center"
            />
          ))}

          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-sm ring-1 ring-rule-on-dark ring-inset"
          />
        </HoverSliderImageWrap>

        <p className="duration-fast mt-4 flex items-baseline justify-between gap-4 text-sm text-ink-2 transition-colors ease-standard group-hover:text-ink">
          {/* Clamped on a phone, where the longest alt text runs to four lines and pushes the
              caption's finish label away from the frame it describes. */}
          <span className="line-clamp-2 lg:line-clamp-none">{active.alt}</span>
          <span className="shrink-0 annotation">{active.finish}</span>
        </p>
      </Link>
    </div>
  );
}
