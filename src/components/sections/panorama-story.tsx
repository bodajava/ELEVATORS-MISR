import { Aperture } from '@/components/media/aperture';
import { ProjectImage } from '@/components/media/project-image';
import { Reveal } from '@/components/motion/reveal';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { panoramaStory } from '@/content/home';
import { getProject } from '@/content/projects';
import type { Locale } from '@/i18n/config';
import { imageSizes, leadImageFor } from '@/lib/media';

/**
 * The product story.
 *
 * Four claims, each self-evidently true of glass or observable in the photographs. Nothing
 * about load, speed, drive type, standards or materials — none of that is verifiable here.
 *
 * Set on the sunken plaster so the section reads as a recessed panel between the two lighter
 * ones either side of it.
 */
export function PanoramaStory({ locale }: { locale: Locale }) {
  const project = getProject('garden-view-residence');
  const image = project ? leadImageFor(project.slug) : undefined;

  return (
    <section className="bg-paper-sunken py-20 lg:py-24">
      <Container width="wide">
        <div className="grid gap-16 lg:grid-cols-[1fr_0.8fr] lg:items-start lg:gap-24">
          <div>
            <SectionHeading
              eyebrow={panoramaStory.eyebrow[locale]}
              title={panoramaStory.heading[locale]}
              lede={panoramaStory.lede[locale]}
            />

            <dl className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {panoramaStory.points[locale].map((point, index) => (
                <Reveal key={point.title} delay={0.05 * index}>
                  <div className="pt-4 rule-t">
                    <dt className="font-display text-lg text-ink">{point.title}</dt>
                    <dd className="mt-2.5 text-sm text-ink-2">{point.body}</dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>

          {image && project ? (
            <Reveal variant="mask" delay={0.12} className="lg:sticky lg:top-28">
              <Aperture ratio="3/4" framed>
                <ProjectImage image={image} alt={project.alt[locale]} sizes={imageSizes.feature} />
              </Aperture>
            </Reveal>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
