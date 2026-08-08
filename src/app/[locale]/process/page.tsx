import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { ProcessSteps } from '@/components/sections/process-steps';
import { InspectionCta } from '@/components/sections/inspection-cta';
import { JsonLd } from '@/components/seo/json-ld';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Container } from '@/components/ui/container';
import { process as processContent } from '@/content/home';
import { isLocale, type Locale } from '@/i18n/config';
import { buildAlternates } from '@/lib/seo/metadata';
import { breadcrumbSchema } from '@/lib/seo/schema';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = locale as Locale;
  return {
    title: processContent.heading[l],
    description: processContent.lede[l],
    alternates: buildAlternates(l, '/process'),
  };
}

export default async function ProcessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // A single-segment path with a file extension (/sw.js, /favicon.png) skips the locale
  // proxy but still matches this dynamic segment, so the param is validated here as
  // well as in the layout — the page renders in parallel with it, not after it.
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l: Locale = locale;
  const t = await getTranslations('pageHeader');
  const tNav = await getTranslations('nav');

  return (
    <>
      <JsonLd
        data={breadcrumbSchema(l, [
          { name: t('home'), path: '' },
          { name: tNav('process'), path: '/process' },
        ])}
      />
      <Container width="wide" className="pt-32 pb-0 lg:pt-40">
        <Breadcrumbs items={[{ label: t('home'), href: '/' }, { label: tNav('process') }]} />
      </Container>
      <ProcessSteps locale={l} headingLevel="h1" />
      <InspectionCta locale={l} />
    </>
  );
}
