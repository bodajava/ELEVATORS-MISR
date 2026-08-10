import Image from 'next/image';

import { AmbientVideo } from '@/components/media/ambient-video';
import { Reveal } from '@/components/motion/reveal';
import type { Project } from '@/content/projects';
import { finishLabels, settingLabels } from '@/content/projects';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { bestImageFor, imagesFor, productFilms, type VideoAsset } from '@/lib/media';
import { cn } from '@/lib/utils';

/**
 * The project index, as a bento.
 *
 * ── What this replaces ──────────────────────────────────────────────────────
 * A mosaic of same-height rows: three-up, then two-up, every tile the same size, every caption
 * the same size. It was level and it was orderly, and it read as a contact sheet with nothing
 * to look at first. Reviewed against the reference the owner supplied, the missing thing was
 * hierarchy — one tile that is unmistakably the lead, and film mixed in with the stills rather
 * than parked in a separate rail.
 *
 * ── The composition ─────────────────────────────────────────────────────────
 * Four cell shapes on a six-column grid, sized so nothing is letterboxed:
 *
 *   · `feature`  6 × 2 — the lead. Wide, so it takes a film where one exists.
 *   · `large`    4 × 2 — the anchor of each group. Also takes a film.
 *   · `tall`     2 × 2 — portrait, which is the shape thirty of thirty-one stills actually are.
 *   · `small`    2 × 1 — squarish.
 *
 * `planBento` emits them in a sequence whose areas always sum to a whole number of rows, so
 * every row is full and an orphan is arithmetically impossible rather than merely unlikely —
 * the same guarantee the previous planner gave, kept.
 *
 * ── Why the row-levelling detector is waived here ───────────────────────────
 * `scripts/grid-check.mjs` groups tiles by top edge and flags any group whose heights differ,
 * because a short cell beside a tall one used to leave a real void. In a bento that model does
 * not hold: a `small` sitting beside a two-row `large` is not leaving a hole, it is sharing the
 * column with the `small` stacked underneath it. The grid carries `data-ragged` so this is a
 * declared exemption with a reason, not a hole the detector happens to miss.
 *
 * ── Films ───────────────────────────────────────────────────────────────────
 * Only `productFilms()` — the vetted walkthrough set that already ships in the homepage strip.
 * Never `videosFor()`, which would publish whatever the manifest's `rights` field claims, and
 * that field has been wrong three times. At most two tiles carry film, so no page ever asks
 * the browser to decode more clips than the strip already does.
 */

type Kind = 'feature' | 'large' | 'tall' | 'small';

type Cell = {
  project: Project;
  kind: Kind;
  /** Present only where the project owns a vetted walkthrough and the cell is big enough. */
  film?: VideoAsset;
};

/**
 * Lay out `n` projects with no orphan.
 *
 * Areas, in grid units of one column by one row: feature 12, large 8, tall 4, small 2. Every
 * arm below sums to a multiple of 6, which is what makes each row exactly full.
 *
 *   remainder 1 → feature                          12
 *   remainder 2 → large + tall                     12
 *   remainder 3 → large + small + small            12
 *   remainder 4 → large + tall + large + tall      24
 *   every five → large + tall + small × 3          18
 *
 * The remainder leads, so the largest cell is the first thing on the page rather than a
 * correction applied at the bottom of it.
 */
function planBento(count: number): Kind[] {
  const kinds: Kind[] = [];
  const rest = count % 5;

  if (rest === 1) kinds.push('feature');
  else if (rest === 2) kinds.push('large', 'tall');
  else if (rest === 3) kinds.push('large', 'small', 'small');
  // `large, tall, tall, large` rather than `large, tall, large, tall`: both tile a 6×4 block
  // on the desktop grid, but only this order also pairs cleanly in the two-column phone
  // layout. The other one stranded a half-width cell twice, which the coverage check in
  // scripts/grid-check.mjs measured as a 28% hole.
  else if (rest === 4) kinds.push('large', 'tall', 'tall', 'large');

  while (kinds.length < count) kinds.push('large', 'tall', 'small', 'small', 'small');

  return kinds.slice(0, count);
}

/** Six columns from `lg`. Below that the wide cells go full width and everything else halves. */
const SPAN: Record<Kind, string> = {
  feature: 'col-span-2 lg:col-span-6 lg:row-span-2',
  large: 'col-span-2 lg:col-span-4 lg:row-span-2',
  tall: 'col-span-1 lg:col-span-2 lg:row-span-2',
  small: 'col-span-1 lg:col-span-2 lg:row-span-1',
};

/** What the cell actually measures, so the browser fetches the right file and no more. */
const SIZES: Record<Kind, string> = {
  feature: '(min-width: 1024px) 100vw, 100vw',
  large: '(min-width: 1024px) 66vw, 100vw',
  tall: '(min-width: 1024px) 33vw, 50vw',
  small: '(min-width: 1024px) 33vw, 50vw',
};

/** The lead cells carry a display-size title and the project's own summary; the rest do not. */
const IS_WIDE: Record<Kind, boolean> = {
  feature: true,
  large: true,
  tall: false,
  small: false,
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
  const kinds = planBento(items.length);

  // One lookup, built once. `productFilms()` walks the whole manifest, and calling it inside
  // the map would do that per tile.
  const films = new Map<string, VideoAsset>();
  for (const film of productFilms()) {
    if (film.projectSlug && !films.has(film.projectSlug)) films.set(film.projectSlug, film);
  }

  // At most two tiles carry film. `reduce` rather than a counter mutated inside `map`: the
  // limit is part of the fold, not a side effect of rendering.
  const cells: Cell[] = items.reduce<Cell[]>((acc, project, index) => {
    const kind = kinds[index];
    const film = films.get(project.slug);
    const used = acc.filter((cell) => cell.film !== undefined).length;
    const takesFilm = IS_WIDE[kind] && film !== undefined && used < 2;
    return [...acc, { project, kind, film: takesFilm ? film : undefined }];
  }, []);

  return (
    <ul
      data-ragged="bento"
      style={{ gridAutoRows: 'var(--cell-h)' }}
      className={[
        'grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-6 lg:gap-3',
        // Below `lg` every cell is one row tall, so the height is the whole tile. From `lg` a
        // two-row cell is twice this plus the gap — which is why the desktop value looks small.
        '[--cell-h:56vw] sm:[--cell-h:38vw] lg:[--cell-h:clamp(180px,17vw,290px)]',
      ].join(' ')}
    >
      {cells.map(({ project, kind, film }, index) => {
        const image = bestImageFor(project.slug);
        // The reveal frame: the next-best still. Only rendered where one genuinely exists — an
        // empty hover state is worse than none. A film tile does not need one; it moves.
        const secondary = film
          ? undefined
          : imagesFor(project.slug).filter((i) => i.src !== image?.src)[0];
        if (!image) return null;

        const wide = IS_WIDE[kind];

        return (
          <Reveal
            as="li"
            key={project.slug}
            delay={0.04 * (index % 3)}
            stretch
            className={cn('h-full', SPAN[kind])}
          >
            <Link
              href={`/projects/${project.slug}`}
              className="group/card block h-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
            >
              {/* No aspect ratio here: the row supplies the height, so a cell can never be
                  taller than the space the planner gave it. */}
              <div className="aperture relative size-full overflow-hidden">
                {film ? (
                  <AmbientVideo
                    video={film}
                    label={project.alt[locale]}
                    // Decorative: the tile is a link, and a controller inside a link is a
                    // control the visitor cannot reach without following the link.
                    decorative
                    className="size-full"
                  />
                ) : (
                  <Image
                    src={image.src}
                    alt={project.alt[locale]}
                    fill
                    sizes={SIZES[kind]}
                    priority={priorityFirst && index === 0}
                    className={cn(
                      'duration-slow object-cover transition-[transform,opacity] ease-travel',
                      // The primary frame recedes rather than zooming: a scale-to-1.05 card is
                      // the generic gesture this index is explicitly not using.
                      secondary ? 'group-hover/card:opacity-0 group-focus-visible/card:opacity-0' : ''
                    )}
                  />
                )}

                {/* The second frame is underneath and simply becomes visible. No transform,
                    so there is nothing to reflow and nothing to jitter on a trackpad. */}
                {secondary ? (
                  <Image
                    src={secondary.src}
                    alt=""
                    aria-hidden
                    fill
                    sizes={SIZES[kind]}
                    className="-z-10 object-cover"
                  />
                ) : null}

                {/* Index, top-leading. Lifts to the accent with the title. */}
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

                {/* Scrim, only where the caption sits. Deeper under a wide cell, because a
                    display-size title needs more ground under it than a caption does. */}
                <span
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-carbon/90 via-carbon/50 to-transparent',
                    wide ? 'h-3/5' : 'h-2/5'
                  )}
                />

                {/* The caption lives *on* the photograph. That is the difference between a
                    mosaic and a wall of cards: the frame is the object, not a container with a
                    body under it. The scrim is dark enough for AA at these sizes. */}
                <div className={cn('pointer-events-none absolute inset-x-0 bottom-0', wide ? 'p-5 sm:p-7' : 'p-3 sm:p-4')}>
                  <h3
                    className={cn(
                      'font-display text-ink-on-dark drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]',
                      wide
                        ? 'max-w-[18ch] text-2xl text-balance sm:text-3xl lg:text-4xl'
                        : 'truncate text-sm sm:text-base'
                    )}
                  >
                    {project.title[locale]}
                  </h3>

                  {wide ? (
                    <p className="mt-3 max-w-[44ch] text-sm text-pretty text-ink-2-on-dark drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
                      {project.summary[locale]}
                    </p>
                  ) : null}

                  <p
                    className={cn(
                      'truncate annotation text-ink-2-on-dark drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]',
                      wide ? 'mt-4' : 'mt-0.5'
                    )}
                  >
                    {finishLabels[project.finish][locale]} ·{' '}
                    {settingLabels[project.setting][locale]}
                  </p>

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
