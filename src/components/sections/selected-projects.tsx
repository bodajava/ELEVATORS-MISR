import { getTranslations } from 'next-intl/server';

import { Magnetic } from '@/components/motion/magnetic';
import { ProjectMatrix } from '@/components/projects/project-matrix';
import { Button, CtaArrow } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { projectsSection } from '@/content/home';
import { featuredProjects } from '@/content/projects';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';

/**
 * Selected work — the same mosaic the index uses.
 *
 * ── What this replaces ──────────────────────────────────────────────────────
 * A feature pair with `lg:pt-28` on the second cell, then a three-up of cards. Measured, the
 * emptiest screen on the homepage sat inside it at **21% coverage**: one photograph occupying
 * a quarter of the width with three quarters of the viewport empty beside it. The step that
 * was meant to create a relationship just created a hole.
 *
 * It now shares `ProjectMatrix` with the projects index, so the homepage and the index read as
 * one system rather than two different ideas about the same photographs, and the row planner
 * guarantees every row is full.
 */
export async function SelectedProjects({ locale }: { locale: Locale }) {
  const t = await getTranslations('cta');

  if (featuredProjects.length === 0) return null;

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

        {/* One composition. The planner fills every row, so no cell is ever left with an
            empty neighbour — which is what the previous feature-pair step produced. */}
        <div className="mt-12 lg:mt-14">
          <ProjectMatrix items={featuredProjects} locale={locale} priorityFirst />
        </div>
      </Container>
    </section>
  );
}
