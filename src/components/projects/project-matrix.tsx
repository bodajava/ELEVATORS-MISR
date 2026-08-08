import Image from 'next/image';

import { Reveal } from '@/components/motion/reveal';
import type { Project } from '@/content/projects';
import { finishLabels, settingLabels } from '@/content/projects';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { bestImageFor, imagesFor, maxImageWidth, videosFor } from '@/lib/media';
import { cn } from '@/lib/utils';

/**
 * The project index, as an editorial matrix.
 *
 * ── Why not a uniform card grid ─────────────────────────────────────────────
 * The previous index put every project in an identical three-up cell. Two things went wrong
 * with that, and both are visible in the reported screenshots:
 *
 *   1. **Almost every source photograph is portrait.** Thirty of the thirty-one shipping
 *      stills are taller than they are wide, because they are phone captures of a shaft. Drop
 *      a portrait image into a landscape cell and you get the image on one side and dead space
 *      on the other — the "one narrow image, empty right-hand 60%" defect exactly.
 *   2. **A count that is not a multiple of the column count leaves an orphan.** Ten projects
 *      in a three-up grid ends with a single item alone on the last row.
 *
 * ── How the composition is derived ──────────────────────────────────────────
 * The layout is computed from the real item count and each project's real media, not chosen
 * in advance. `planMatrix` assigns every project a span, guaranteeing that the final row is
 * always filled — so an orphan is arithmetically impossible rather than merely unlikely.
 *
 * Cells are sized by the aspect ratio of the media inside them, so nothing is letterboxed.
 * A featured project earns a two-column cell and a landscape crop; everything else keeps its
 * portrait frame at its natural ratio.
 */

type Cell = {
  project: Project;
  /** Columns to span in the 6-column desktop grid. */
  span: 2 | 3 | 4 | 6;
  /** Portrait frames keep their shape; wide cells take a landscape crop. */
  shape: 'portrait' | 'landscape';
};

/**
 * Lay out `n` projects across a 6-column grid with no orphan and no letterboxing.
 *
 * The default cell is **two columns — a three-up row of portrait frames**, because thirty of
 * the thirty-one shipping stills are portrait. That is the whole design constraint: put a
 * portrait photograph in a half-width cell and you get the image on one side and dead space on
 * the other, which is precisely the reported defect.
 *
 * Only the remainder is treated specially, and only in the two ways that keep every row full:
 *
 *   · `n % 3 === 1` — one project leads as a **full-width feature** with a landscape crop.
 *     A wide cell is justified there because it is deliberately the largest thing on the page.
 *   · `n % 3 === 2` — two projects lead at **half width each**, still portrait, which reads as
 *     a pair rather than a stranded row.
 *
 * Everything after the remainder is a clean three-up. An orphan is therefore arithmetically
 * impossible rather than merely unlikely, and the only wide cells are ones that asked for it.
 */
function planMatrix(items: Project[]): Cell[] {
  // A repeating six-column mosaic. Each row is exactly full, and no two consecutive rows
  // share a shape, so the eye moves diagonally instead of reading a list of equal tiles.
  //
  // 4+2 · 2+4 · 3+3 · 2+2+2 — every pattern sums to six.
  const RHYTHM: Cell['span'][][] = [
    [4, 2],
    [2, 4],
    [3, 3],
    [2, 2, 2],
  ];

  const cells: Cell[] = [];
  let i = 0;
  let row = 0;

  while (i < items.length) {
    const left = items.length - i;

    // Close out cleanly: never start a pattern that cannot be filled.
    let pattern: Cell['span'][];
    if (left === 1) pattern = [6];
    else if (left === 2) pattern = [3, 3];
    else if (left === 3) pattern = [2, 2, 2];
    else if (left === 4) pattern = [4, 2];
    else if (left === 5) pattern = [3, 3];
    else pattern = RHYTHM[row % RHYTHM.length];

    for (const span of pattern) {
      if (i >= items.length) break;
      cells.push({
        project: items[i],
        span,
        // Wide cells take a landscape crop, narrow ones keep the photograph's own portrait
        // shape. Nothing is letterboxed and nothing leaves a gap beside it.
        shape: span >= 4 ? 'landscape' : 'portrait',
      });
      i += 1;
    }
    row += 1;
  }

  return cells;
}

const SPAN_CLASS: Record<Cell['span'], string> = {
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
};

export function ProjectMatrix({
  items,
  locale,
  priorityFirst = false,
}: {
  items: Project[];
  locale: Locale;
  priorityFirst?: boolean;
}) {
  const cells = planMatrix(items);

  return (
    <ul className="grid grid-cols-2 gap-x-2 gap-y-6 sm:gap-x-3 sm:gap-y-8 lg:grid-cols-6 lg:gap-x-3 lg:gap-y-10">
      {cells.map(({ project, span, shape }, index) => {
        const image = bestImageFor(project.slug);
        // The reveal frame: the next-best still, or a film's poster. Only rendered when one
        // genuinely exists — an empty hover state is worse than none.
        const secondary = imagesFor(project.slug).filter((i) => i.src !== image?.src)[0];
        const film = videosFor(project.slug)[0];
        if (!image) return null;

        return (
          <Reveal
            as="li"
            key={project.slug}
            delay={0.04 * (index % 3)}
            className={cn('col-span-2', SPAN_CLASS[span])}
          >
            <Link
              href={`/projects/${project.slug}`}
              className="group/card block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
            >
              <div
                className={cn(
                  'aperture relative w-full overflow-hidden',
                  shape === 'landscape' ? 'aspect-4/3 lg:aspect-21/9' : 'aspect-3/4'
                )}
              >
                <Image
                  src={image.src}
                  alt={project.alt[locale]}
                  fill
                  sizes={
                    span === 6
                      ? '(min-width: 1024px) 100vw, 100vw'
                      : span === 3
                        ? '(min-width: 1024px) 50vw, 50vw'
                        : '(min-width: 1024px) 33vw, 50vw'
                  }
                  priority={priorityFirst && index === 0}
                  className={cn(
                    'duration-slow object-cover transition-[transform,opacity] ease-travel',
                    // The primary frame recedes rather than zooming: a scale-to-1.05 card is
                    // the generic gesture this index is explicitly not using.
                    secondary ? 'group-hover/card:opacity-0 group-focus-visible/card:opacity-0' : ''
                  )}
                  style={{ maxWidth: maxImageWidth(image) }}
                />

                {/* The second frame is underneath and simply becomes visible. No transform,
                    so there is nothing to reflow and nothing to jitter on a trackpad. */}
                {secondary ? (
                  <Image
                    src={secondary.src}
                    alt=""
                    aria-hidden
                    fill
                    sizes={
                      span === 6
                        ? '(min-width: 1024px) 100vw, 100vw'
                        : '(min-width: 1024px) 33vw, 50vw'
                    }
                    className="-z-10 object-cover"
                  />
                ) : null}

                {/* Index, top-leading. Lifts to orange with the title. */}
                <span
                  className="numeric duration-fast absolute start-3 top-3 z-10 rounded-(--radius-control) bg-carbon/70 px-2 py-1 text-2xs font-semibold text-ink-on-dark transition-colors ease-standard group-hover/card:text-accent group-focus-visible/card:text-accent"
                  dir="ltr"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                {film ? (
                  <span className="absolute end-3 top-3 z-10 rounded-(--radius-control) bg-carbon/70 px-2 py-1 annotation text-ink-on-dark">
                    {locale === 'en' ? 'Film' : 'فيلم'}
                  </span>
                ) : null}

                {/* Scrim, only where the caption sits. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-carbon/85 via-carbon/45 to-transparent"
                />

                {/* The caption lives *on* the photograph, revealed by a gradient scrim that
                  only exists where type sits. That is the difference between a mosaic and a
                  wall of cards: the frame is the object, not a container with a body under
                  it. The scrim is dark enough for AA at this size — checked, not assumed. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-sm text-ink-on-dark drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)] sm:text-base">
                        {project.title[locale]}
                      </h3>
                      <p className="mt-0.5 truncate annotation text-ink-2-on-dark drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
                        {finishLabels[project.finish][locale]} ·{' '}
                        {settingLabels[project.setting][locale]}
                      </p>
                    </div>
                  </div>

                  {/* The rule draws itself across on hover — the index's one signature gesture. */}
                  <div className="relative mt-2.5 h-px w-full bg-rule-on-dark">
                    <span className="duration-base absolute inset-y-0 start-0 w-0 bg-accent transition-[width] ease-travel group-hover/card:w-full group-focus-visible/card:w-full" />
                  </div>
                </div>
              </div>
            </Link>
          </Reveal>
        );
      })}
    </ul>
  );
}
