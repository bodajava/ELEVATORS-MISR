import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Reveal } from '@/components/motion/reveal';
import { InspectionCta } from '@/components/sections/inspection-cta';
import { Proof } from '@/components/sections/proof';
import { JsonLd } from '@/components/seo/json-ld';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { aboutPage } from '@/content/pages';
import { isLocale, type Locale } from '@/i18n/config';
import { buildAlternates } from '@/lib/seo/metadata';
import { breadcrumbSchema, organizationSchema } from '@/lib/seo/schema';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = locale as Locale;
  return {
    title: aboutPage.title[l],
    description: aboutPage.description[l],
    alternates: buildAlternates(l, '/about'),
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // A single-segment path with a file extension (/sw.js, /favicon.png) skips the locale
  // proxy but still matches this dynamic segment, so the param is validated here as
  // well as in the layout — the page renders in parallel with it, not after it.
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l: Locale = locale;
  const t = await getTranslations('pageHeader');

  return (
    <>
      <JsonLd
        data={[
          organizationSchema(l),
          breadcrumbSchema(l, [
            { name: t('home'), path: '' },
            { name: aboutPage.title[l], path: '/about' },
          ]),
        ]}
      />

      <Container width="text" className="pt-32 pb-8 lg:pt-40">
        <Breadcrumbs items={[{ label: t('home'), href: '/' }, { label: aboutPage.title[l] }]} />
        <Reveal>
          <SectionHeading as="h1" title={aboutPage.heading[l]} lede={aboutPage.lede[l]} />
        </Reveal>
        <div className="mt-10 flex flex-col gap-5">
          {aboutPage.body[l].map((p) => (
            <p key={p} className="text-base text-pretty text-ink-2">
              {p}
            </p>
          ))}
        </div>
      </Container>

      <Proof locale={l} />

      <Container width="wide" className="pb-8">
        <Reveal>
          <h2 className="font-display text-2xl text-ink sm:text-3xl">
            {aboutPage.positionHeading[l]}
          </h2>
        </Reveal>
        <dl className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-3">
          {aboutPage.positions[l].map((item, index) => (
            <Reveal key={item.title} delay={0.06 * index}>
              <div className="border-t border-rule pt-5">
                <dt className="font-display text-lg text-ink">{item.title}</dt>
                <dd className="mt-2.5 text-sm text-ink-2">{item.body}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </Container>

      <div className="mt-20">
        <InspectionCta locale={l} />
      </div>
    </>
  );
}
