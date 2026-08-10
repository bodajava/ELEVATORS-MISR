import { PanoramaExplorer, type ExplorerStop } from '@/components/sections/panorama-explorer';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { panoramaStory } from '@/content/home';
import { getProject } from '@/content/projects';
import type { Locale } from '@/i18n/config';
import { allImages, bestImageFor } from '@/lib/media';

/**
 * The product story.
 *
 * Four claims, each self-evidently true of glass or observable in the photographs. Nothing
 * about load, speed, drive type, standards or materials — none of that is verifiable here.
 *
 * ── What changed ────────────────────────────────────────────────────────────
 * The claims were a two-by-two definition list beside one sticky photograph. Correct and inert:
 * a visitor read four short paragraphs and looked at one image. They are now stops on a floor
 * indicator (`PanoramaExplorer`) — selecting a claim moves the car and brings up the
 * installation that shows it. Same four claims, same wording; the section now demonstrates
 * rather than asserts.
 *
 * Each stop is paired with a *different* frame, chosen from the gallery rather than a
 * hard-coded path, so the pairing survives a media rebuild.
 *
 * Set on the sunken plaster so the section reads as a recessed panel between the two lighter
 * ones either side of it.
 */
export function PanoramaStory({ locale }: { locale: Locale }) {
  const points = panoramaStory.points[locale];

  // One frame per claim, distinct, drawn from the shipping gallery. `bestImageFor` leads with
  // the sharpest angle of the project the section already referenced; the rest follow in
  // manifest order, skipping anything already used.
  const lead = bestImageFor('garden-view-residence');
  const gallery = allImages.filter((i) => i.role === 'gallery' || i.role === 'hero-still');
  const pool = [lead, ...gallery.filter((i) => i.src !== lead?.src)].filter(
    (i): i is NonNullable<typeof i> => i !== undefined
  );

  const stops: ExplorerStop[] = points.flatMap((point, index) => {
    const image = pool[index % Math.max(pool.length, 1)];
    if (!image) return [];
    const project = getProject(image.projectSlug);
    return [
      {
        title: point.title,
        body: point.body,
        image: {
          src: image.src,
          width: image.width,
          height: image.height,
          blurDataURL: image.blurDataURL,
        },
        alt: project?.alt[locale] ?? point.title,
      },
    ];
  });

  return (
    <section className="bg-paper-sunken py-20 lg:py-24">
      <Container width="wide">
        <SectionHeading
          eyebrow={panoramaStory.eyebrow[locale]}
          title={panoramaStory.heading[locale]}
          lede={panoramaStory.lede[locale]}
        />

        {stops.length > 0 ? (
          <PanoramaExplorer
            className="mt-14"
            stops={stops}
            labels={
              locale === 'en'
                ? { group: 'What a panorama car does', stop: 'Point' }
                : { group: 'ماذا تفعل كابينة البانوراما', stop: 'النقطة' }
            }
          />
        ) : null}
      </Container>
    </section>
  );
}
