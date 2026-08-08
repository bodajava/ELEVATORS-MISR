import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Reveal } from '@/components/motion/reveal';
import { ProjectCard } from '@/components/projects/project-card';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { InspectionCta } from '@/components/sections/inspection-cta';
import { projectsPage } from '@/content/pages';
import { finishLabels, projects, type Finish } from '@/content/projects';
import { isLocale, type Locale } from '@/i18n/config';
import { buildAlternates } from '@/lib/seo/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = locale as Locale;
  return {
    title: projectsPage.title[l],
    description: projectsPage.description[l],
    alternates: buildAlternates(l, '/projects'),
    openGraph: {
      title: `${projectsPage.title[l]} · Egypt Elevators`,
      description: projectsPage.description[l],
    },
  };
}

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // A single-segment path with a file extension (/sw.js, /favicon.png) skips the locale
  // proxy but still matches this dynamic segment, so the param is validated here as
  // well as in the layout — the page renders in parallel with it, not after it.
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l: Locale = locale;
  const t = await getTranslations('pageHeader');

  // Grouped by finish — the axis the photography genuinely divides on, rather than an
  // invented taxonomy. Order is stable so the page does not reshuffle between builds.
  const byFinish = (['brass', 'smoked-glass'] as Finish[]).map((finish) => ({
    finish,
    items: projects.filter((p) => p.finish === finish).sort((a, b) => a.order - b.order),
  }));

  return (
    <>
      <Container width="wide" className="pt-32 pb-8 lg:pt-40">
        <Breadcrumbs items={[{ label: t('home'), href: '/' }, { label: projectsPage.title[l] }]} />
        <Reveal>
          <SectionHeading
            as="h1"
            eyebrow={projectsPage.countLabel[l](projects.length)}
            title={projectsPage.heading[l]}
            lede={projectsPage.lede[l]}
          />
        </Reveal>
      </Container>

      {byFinish.map(({ finish, items }, groupIndex) => (
        <section key={finish} className="py-14 lg:py-20" aria-labelledby={`finish-${finish}`}>
          <Container width="wide">
            <Reveal>
              <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-5">
                <h2 id={`finish-${finish}`} className="font-display text-2xl text-ink sm:text-3xl">
                  {finishLabels[finish][l]}
                </h2>
                <p className="numeric shrink-0 annotation" dir="ltr">
                  {String(items.length).padStart(2, '0')}
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((project, index) => (
                <Reveal key={project.slug} delay={0.05 * (index % 3)}>
                  <ProjectCard
                    project={project}
                    locale={l}
                    priority={groupIndex === 0 && index === 0}
                  />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      ))}

      <InspectionCta locale={l} />
    </>
  );
}
