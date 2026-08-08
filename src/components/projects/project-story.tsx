import { AmbientVideo } from '@/components/media/ambient-video';
import { Aperture } from '@/components/media/aperture';
import { ProjectImage } from '@/components/media/project-image';
import { Reveal } from '@/components/motion/reveal';
import type { Locale } from '@/i18n/config';
import type { ImageAsset, VideoAsset } from '@/lib/media';
import { maxImageWidth, maxVideoWidth } from '@/lib/media';
import { cn } from '@/lib/utils';

/**
 * A project's media, composed into complete rows.
 *
 * ── The defect this exists to prevent ───────────────────────────────────────
 * The old detail page put the lead photograph in a fixed `1fr 0.9fr` split beside the body
 * copy. When a project has three short paragraphs and one portrait still — which several do,
 * and one has a single image and nothing else — the result is a narrow strip of photograph
 * with 60% of the viewport empty next to it. That is the reported screenshot.
 *
 * ── How rows are chosen ─────────────────────────────────────────────────────
 * Media is consumed greedily into rows whose widths are decided by what is actually left,
 * never by a fixed template:
 *
 *   · two portraits remaining  → a 2-up, deliberately asymmetric (7/5) so it reads as
 *     composed rather than tiled;
 *   · three or more portraits  → a 3-up;
 *   · one portrait left over   → paired with the next film, or promoted to a wide landscape
 *     crop if it would otherwise stand alone;
 *   · a landscape item         → takes the full width, which is what it is for.
 *
 * The consequence is the invariant that matters: **no row ever ends with a lone portrait
 * frame and an empty remainder.**
 */

type Item = { kind: 'image'; asset: ImageAsset } | { kind: 'video'; asset: VideoAsset };

type Row = { items: Item[]; wide: boolean };

function isPortrait(item: Item) {
  return item.asset.orientation === 'portrait';
}

function planRows(items: Item[]): Row[] {
  const rows: Row[] = [];
  const queue = [...items];

  while (queue.length > 0) {
    const head = queue[0];

    // Landscape media earns the full width — that is the shape it was shot in.
    if (!isPortrait(head)) {
      rows.push({ items: [queue.shift()!], wide: true });
      continue;
    }

    const portraitRun = queue.filter(isPortrait).length;

    if (portraitRun >= 3) {
      rows.push({ items: queue.splice(0, 3), wide: false });
    } else if (portraitRun === 2) {
      rows.push({ items: queue.splice(0, 2), wide: false });
    } else {
      // Exactly one portrait left. Pair it with the next non-portrait rather than leaving it
      // beside an empty column; if there is nothing to pair with, give it the full width.
      const partnerIndex = queue.findIndex((i) => !isPortrait(i));
      if (partnerIndex > 0) {
        const portrait = queue.shift()!;
        const partner = queue.splice(partnerIndex - 1, 1)[0];
        rows.push({ items: [portrait, partner], wide: false });
      } else {
        rows.push({ items: [queue.shift()!], wide: true });
      }
    }
  }

  return rows;
}

export function ProjectStory({
  images,
  videos,
  alt,
  label,
  locale,
  className,
}: {
  images: ImageAsset[];
  videos: VideoAsset[];
  alt: string;
  label: string;
  locale: Locale;
  className?: string;
}) {
  const items: Item[] = [
    ...images.map((asset) => ({ kind: 'image' as const, asset })),
    ...videos.map((asset) => ({ kind: 'video' as const, asset })),
  ];
  if (items.length === 0) return null;

  const rows = planRows(items);

  return (
    <div className={cn('flex flex-col gap-12 lg:gap-16', className)}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            'grid gap-4 sm:gap-6',
            row.wide
              ? 'grid-cols-1'
              : row.items.length === 3
                ? 'grid-cols-2 lg:grid-cols-3'
                : // The 7/5 split is what stops a 2-up reading as two identical tiles.
                  'grid-cols-1 sm:grid-cols-12'
          )}
        >
          {row.items.map((item, i) => {
            const spanClass =
              row.wide || row.items.length === 3 ? '' : i === 0 ? 'sm:col-span-7' : 'sm:col-span-5';

            // A portrait still promoted to a full-width row takes a landscape crop, so the
            // row is filled by photograph rather than by empty space either side.
            const ratio = row.wide
              ? item.asset.orientation === 'portrait'
                ? ('16/9' as const)
                : ('16/9' as const)
              : ('3/4' as const);

            return (
              <Reveal key={item.asset.id} delay={0.05 * i} className={spanClass}>
                {item.kind === 'image' ? (
                  <Aperture ratio={ratio}>
                    <ProjectImage
                      image={item.asset}
                      alt={alt}
                      sizes={
                        row.wide
                          ? '(min-width: 1024px) 82vw, 92vw'
                          : row.items.length === 3
                            ? '(min-width: 1024px) 27vw, 46vw'
                            : '(min-width: 640px) 40vw, 92vw'
                      }
                    />
                  </Aperture>
                ) : (
                  <div
                    className={cn(
                      'aperture relative w-full aperture-mask bg-aperture',
                      item.asset.orientation === 'portrait' && !row.wide
                        ? 'aspect-3/4'
                        : 'aspect-video'
                    )}
                    style={{ maxWidth: `${maxVideoWidth(item.asset)}px` }}
                  >
                    <AmbientVideo video={item.asset} label={label} />
                  </div>
                )}

                {/* A quiet index so a long story stays navigable. */}
                <p className="mt-3 annotation text-ink-3" dir="ltr">
                  {String(
                    rows.slice(0, rowIndex).reduce((n, r) => n + r.items.length, 0) + i + 1
                  ).padStart(2, '0')}
                  {item.kind === 'video' ? (locale === 'en' ? ' · Film' : ' · فيلم') : ''}
                </p>
              </Reveal>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Exposed for tests: the row planner is the part with an invariant worth asserting. */
export const __planRows = planRows;

/** Item shape, exported so the planner can be exercised directly. */
export type ProjectStoryItem = Item;

/** `maxImageWidth` is re-exported so callers cap frames without a second media import. */
export { maxImageWidth };
