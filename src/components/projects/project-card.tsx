import { getTranslations } from 'next-intl/server';

import { Aperture } from '@/components/media/aperture';
import { ProjectImage } from '@/components/media/project-image';
import { PointerParallax } from '@/components/motion/pointer-parallax';
import { finishLabels, type Project } from '@/content/projects';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { bestImageFor, maxImageWidth } from '@/lib/media';
import { cn } from '@/lib/utils';

/**
 * Project card.
 *
 * The whole card is one link — a nested "read more" would give screen-reader users two targets
 * for one destination and everyone a smaller hit area.
 *
 * Hover does not lift or shadow the card. The aperture stays exactly where it is and the
 * photograph inside it drifts against the pointer, which is the same relationship every other
 * opening on this page uses: the frame is fixed, the view through it moves.
 *
 * The index is set in signal orange. It is the one place a number is coloured, and it earns
 * it — these are a curated, ordered selection, so the number carries real information.
 *
 * `size` chooses the frame, not the content: `feature` is the one card that leads a row,
 * `standard` supports it. Both are capped at what their source file can actually resolve.
 */
export async function ProjectCard({
  project,
  locale,
  index,
  priority = false,
  className,
  size = 'standard',
  sizes,
}: {
  project: Project;
  locale: Locale;
  index?: number;
  priority?: boolean;
  className?: string;
  size?: 'feature' | 'standard';
  /**
   * The slot's real width, as a `sizes` string. Pass it whenever the card is not in the
   * default three-up grid — a card in a 5-of-12 column is ~500px wide, and letting it inherit
   * the three-up `28vw` makes the browser fetch a file too small for the box and upscale it.
   */
  sizes?: string;
}) {
  const t = await getTranslations('cta');
  const image = bestImageFor(project.slug);
  const feature = size === 'feature';

  return (
    <article className={cn('group', className)}>
      <Link
        href={`/projects/${project.slug}`}
        className="block rounded-(--radius-media) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
      >
        <PointerParallax strength={feature ? 14 : 10}>
          <div
            className="w-full"
            style={image ? { maxWidth: `${maxImageWidth(image)}px` } : undefined}
          >
            <Aperture ratio={feature ? '4/5' : '3/4'}>
              {image ? (
                // The parallax target is this wrapper, pre-scaled so the drift can never
                // expose an edge of the frame.
                <div data-parallax-target className="size-full scale-[1.06] will-change-transform">
                  <ProjectImage
                    image={image}
                    alt={project.alt[locale]}
                    sizes={
                      sizes ??
                      (feature
                        ? '(max-width: 640px) 92vw, (max-width: 1024px) 70vw, 46vw'
                        : '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 28vw')
                    }
                    priority={priority}
                  />
                </div>
              ) : null}
            </Aperture>
          </div>
        </PointerParallax>

        <div className="duration-fast mt-5 flex items-baseline justify-between gap-4 pt-3 transition-colors rule-t group-hover:border-accent">
          <span className="annotation">{finishLabels[project.finish][locale]}</span>
          {index !== undefined ? (
            <span className="numeric annotation text-accent-text" dir="ltr">
              {String(index).padStart(2, '0')}
            </span>
          ) : null}
        </div>

        <h3 className={cn('mt-4 text-ink', feature ? 'text-2xl lg:text-3xl' : 'text-xl')}>
          {project.title[locale]}
        </h3>
        <p className="mt-2 max-w-[40ch] text-sm text-ink-2">{project.summary[locale]}</p>

        <span className="sr-only">
          {t('viewProject')}: {project.title[locale]}
        </span>
      </Link>
    </article>
  );
}
