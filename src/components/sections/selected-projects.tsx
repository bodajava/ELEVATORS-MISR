import { getTranslations } from 'next-intl/server';

import { Magnetic } from '@/components/motion/magnetic';
import { Reveal } from '@/components/motion/reveal';
import { ProjectCard } from '@/components/projects/project-card';
import { Button, CtaArrow } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { projectsSection } from '@/content/home';
import { featuredProjects } from '@/content/projects';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';

/**
 * Selected work — an editorial grid, not a tile wall.
 *
 * The previous version was three near-full-height portraits across the desktop, which is what
 * made this section read as unart-directed: every project was given identical weight, the
 * images dominated the viewport, and the gaps between them were the only structure.
 *
 * This one is composed. One project leads at feature size, a second sits beside it dropped
 * down a step so the two do not form a bar across the page, and the rest follow as smaller
 * supporting cards. The step is not decoration — it is what turns two images into a
 * relationship, and it is where the eye goes first.
 *
 * Nothing is stretched to fill: the empty quarter beside the supporting card carries the
 * section's own CTA, so there are no accidental blank areas.
 */
export async function SelectedProjects({ locale }: { locale: Locale }) {
  const t = await getTranslations('cta');

  const [lead, second, ...rest] = featuredProjects;
  if (!lead) return null;

  return (
    <section className="py-20 lg:py-24">
      <Container width="wide">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow={projectsSection.eyebrow[locale]}
            title={projectsSection.heading[locale]}
            lede={projectsSection.lede[locale]}
          />
          <Magnetic className="shrink-0 self-start sm:self-auto">
            <Button asChild variant="secondary">
              <Link href="/projects">
                {t('viewAllProjects')}
                <CtaArrow />
              </Link>
            </Button>
          </Magnetic>
        </div>

        {/* Feature pair. The second card is offset down a step on desktop only — on a phone
            the column order already provides the rhythm and an offset would just be a gap. */}
        <div className="mt-14 grid gap-x-10 gap-y-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <ProjectCard project={lead} locale={locale} index={1} priority size="feature" />
          </Reveal>

          {second ? (
            <Reveal delay={0.08} className="lg:col-span-5 lg:pt-28">
              <ProjectCard
                project={second}
                locale={locale}
                index={2}
                // 5 of 12 columns in the wide container, not the default three-up slot.
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 38vw"
              />
            </Reveal>
          ) : null}
        </div>

        {rest.length > 0 ? (
          <div className="mt-14 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((project, index) => (
              <Reveal key={project.slug} delay={0.05 * (index % 3)}>
                <ProjectCard project={project} locale={locale} index={index + 3} />
              </Reveal>
            ))}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
