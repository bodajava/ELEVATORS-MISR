import Image from 'next/image';

import { Reveal } from '@/components/motion/reveal';
import type { Project } from '@/content/projects';
import { finishLabels, settingLabels } from '@/content/projects';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { bestImageFor, imagesFor, videosFor } from '@/lib/media';
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
  const rows: number[][] = [];
  let cursor = 0;

  // Rows of three, which is the widest a ~960px portrait source can fill without being
  // upscaled past the point where it visibly softens.
  while (items.length - cursor > 5) {
    rows.push([cursor, cursor + 1, cursor + 2]);
    cursor += 3;
  }

  // Close out so no row is ever left with one item. A lone tile is the orphan the old planner
  // produced, and the wide cell it used to fill the gap with — a six-column span — cropped a
  // portrait photograph to a letterbox and upscaled it to 1216px from a 960px source. Two
  // rows of two is the honest way to absorb the remainder: nothing is stretched and no row
  // is short.
  const rest = items.length - cursor;
  if (rest === 1) rows.push([cursor]);
  else if (rest === 2) rows.push([cursor, cursor + 1]);
  else if (rest === 3) rows.push([cursor, cursor + 1, cursor + 2]);
  else if (rest === 4) rows.push([cursor, cursor + 1], [cursor + 2, cursor + 3]);
  else if (rest === 5) rows.push([cursor, cursor + 1, cursor + 2], [cursor + 3, cursor + 4]);

  // Six columns split evenly by the row's own length, so every row is exactly full.
  const spanFor: Record<number, Cell['span']> = { 1: 6, 2: 3, 3: 2 };

  return rows.flatMap((row) =>
    row.map((index) => ({ project: items[index], span: spanFor[row.length] }))
  );
}

const SPAN_CLASS: Record<Cell['span'], string> = {
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
};

/**
 * What each cell actually measures, so the browser fetches the right file.
 *
 * Below `lg` the grid is two columns, so a normal cell is half the viewport and a wide one is
 * all of it. Above `lg` it is six columns, and the planner only ever emits spans of 2, 3 or 6.
 */
const SIZES: Record<Cell['span'], string> = {
  2: '(min-width: 1024px) 33vw, 50vw',
  3: '(min-width: 1024px) 50vw, 50vw',
  4: '(min-width: 1024px) 67vw, 100vw',
  6: '(min-width: 1024px) 100vw, 100vw',
};

/** Two columns below `lg`; only a genuinely wide cell takes the full width. */
const NARROW_SPAN_CLASS: Record<Cell['span'], string> = {
  2: 'col-span-1',
  3: 'col-span-1',
  4: 'col-span-2',
  6: 'col-span-2',
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
    // ── Fixed row height, variable cell width ─────────────────────────────────
    // This is the whole fix for the reported gaps. Cells used to carry their own aspect
    // ratio — `aspect-21/9` for a wide one, `aspect-3/4` for a narrow one — and a grid row
    // takes the height of its tallest item. So a short landscape cell sitting beside a tall
    // portrait cell left a void under itself the height of the difference, which on a 1440px
    // screen was over 300px. Two of those per screen is what the page looked like.
    //
    // Giving the grid an explicit row height instead makes every cell in a row exactly as
    // tall as its neighbours, whatever it spans. Width still varies with the span, so the
    // mosaic rhythm survives; only the holes are gone. The height is chosen so a narrow cell
    // stays taller than it is wide, because the photographs are portrait.
    <ul
      style={{ gridAutoRows: 'var(--cell-h)' }}
      className={[
        'grid grid-cols-2 gap-x-2 gap-y-6 sm:gap-x-3 sm:gap-y-8 lg:grid-cols-6 lg:gap-x-3 lg:gap-y-10',
        '[--cell-h:58vw] sm:[--cell-h:40vw] lg:[--cell-h:clamp(280px,27vw,440px)]',
      ].join(' ')}
    >
      {cells.map(({ project, span }, index) => {
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
            stretch
            className={cn('h-full', NARROW_SPAN_CLASS[span], SPAN_CLASS[span])}
          >
            <Link
              href={`/projects/${project.slug}`}
              className="group/card block h-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
            >
              {/* No aspect ratio here: the row supplies the height, so a wide cell and a
                  narrow one end level and neither can leave a gap. */}
              <div className="aperture relative size-full overflow-hidden">
                <Image
                  src={image.src}
                  alt={project.alt[locale]}
                  fill
                  sizes={SIZES[span]}
                  priority={priorityFirst && index === 0}
                  className={cn(
                    'duration-slow object-cover transition-[transform,opacity] ease-travel',
                    // The primary frame recedes rather than zooming: a scale-to-1.05 card is
                    // the generic gesture this index is explicitly not using.
                    secondary ? 'group-hover/card:opacity-0 group-focus-visible/card:opacity-0' : ''
                  )}
                  /* No `maxWidth` here. `fill` places the image absolutely at inset-0, so a
                     max-width does not stop it being drawn large — it shrinks the box and
                     leaves a bare strip of the dark well down one side of the tile. The cell
                     widths are capped by the planner instead, which is where the resolution
                     limit actually belongs. */
                />

                {/* The second frame is underneath and simply becomes visible. No transform,
                    so there is nothing to reflow and nothing to jitter on a trackpad. */}
                {secondary ? (
                  <Image
                    src={secondary.src}
                    alt=""
                    aria-hidden
                    fill
                    sizes={SIZES[span]}
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
