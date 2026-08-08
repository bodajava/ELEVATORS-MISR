import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Aperture } from '@/components/media/aperture';
import { ProjectImage } from '@/components/media/project-image';
import { Reveal } from '@/components/motion/reveal';
import { InspectionCta } from '@/components/sections/inspection-cta';
import { JsonLd } from '@/components/seo/json-ld';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { panoramaPage } from '@/content/pages';
import { getProject } from '@/content/projects';
import { isLocale, type Locale } from '@/i18n/config';
import { imageSizes, leadImageFor } from '@/lib/media';
import { buildAlternates } from '@/lib/seo/metadata';
import { breadcrumbSchema, serviceSchema } from '@/lib/seo/schema';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = locale as Locale;
  return {
    title: panoramaPage.title[l],
    description: panoramaPage.description[l],
    alternates: buildAlternates(l, '/panorama-elevators'),
    openGraph: {
      title: `${panoramaPage.title[l]} · Egypt Elevators`,
      description: panoramaPage.description[l],
    },
  };
}

export default async function PanoramaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // A single-segment path with a file extension (/sw.js, /favicon.png) skips the locale
  // proxy but still matches this dynamic segment, so the param is validated here as
  // well as in the layout — the page renders in parallel with it, not after it.
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l: Locale = locale;
  const t = await getTranslations('pageHeader');

  const brassProject = getProject('chandelier-hall-villa');
  const brassImage = brassProject ? leadImageFor(brassProject.slug) : undefined;

  return (
    <>
      <JsonLd
        data={[
          serviceSchema(l),
          breadcrumbSchema(l, [
            { name: t('home'), path: '' },
            { name: panoramaPage.title[l], path: '/panorama-elevators' },
          ]),
        ]}
      />

      <Container width="wide" className="pt-32 pb-6 lg:pt-40">
        <Breadcrumbs items={[{ label: t('home'), href: '/' }, { label: panoramaPage.title[l] }]} />
        <Reveal>
          <SectionHeading as="h1" title={panoramaPage.heading[l]} lede={panoramaPage.lede[l]} />
        </Reveal>
      </Container>

      <Container width="wide" className="py-16">
        <div className="grid gap-14 lg:grid-cols-[1fr_0.8fr] lg:items-start lg:gap-20">
          <div className="flex flex-col gap-14">
            {panoramaPage.sections[l].map((section, index) => (
              <Reveal key={section.heading} delay={0.05 * index}>
                <section>
                  <h2 className="font-display text-2xl text-ink sm:text-3xl">{section.heading}</h2>
                  <div className="mt-4 flex max-w-[56ch] flex-col gap-4">
                    {section.body.map((p) => (
                      <p key={p} className="text-base text-pretty text-ink-2">
                        {p}
                      </p>
                    ))}
                  </div>
                </section>
              </Reveal>
            ))}
          </div>

          {brassImage && brassProject ? (
            <Reveal delay={0.1} className="lg:sticky lg:top-28">
              <Aperture ratio="3/4" framed>
                <ProjectImage
                  image={brassImage}
                  alt={brassProject.alt[l]}
                  sizes={imageSizes.feature}
                  priority
                />
              </Aperture>
            </Reveal>
          ) : null}
        </div>
      </Container>

      <Container width="wide" className="py-16">
        <div className="grid gap-14 sm:grid-cols-2 lg:gap-20">
          <Reveal>
            <h2 className="font-display text-2xl text-ink">{panoramaPage.whereHeading[l]}</h2>
            <ul className="mt-5 flex flex-col gap-3">
              {panoramaPage.where[l].map((item) => (
                <li key={item} className="border-t border-rule pt-3 text-sm text-ink-2">
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="font-display text-2xl text-ink">{panoramaPage.limitsHeading[l]}</h2>
            <ul className="mt-5 flex flex-col gap-3">
              {panoramaPage.limits[l].map((item) => (
                <li key={item} className="border-t border-rule pt-3 text-sm text-ink-2">
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>

      <div className="mt-16">
        <InspectionCta locale={l} />
      </div>
    </>
  );
}
