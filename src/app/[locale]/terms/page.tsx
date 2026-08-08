import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { ProsePage, ProseSection } from '@/components/layout/prose-page';
import { terms } from '@/content/legal';
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
    title: terms.title[l],
    description: terms.description[l],
    alternates: buildAlternates(l, '/terms'),
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // A single-segment path with a file extension (/sw.js, /favicon.png) skips the locale
  // proxy but still matches this dynamic segment, so the param is validated here as
  // well as in the layout — the page renders in parallel with it, not after it.
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l: Locale = locale;
  const t = await getTranslations('pageHeader');

  return (
    <ProsePage
      crumbs={[{ label: t('home'), href: '/' }, { label: terms.title[l] }]}
      title={terms.title[l]}
      lede={terms.lede[l]}
    >
      {terms.sections.map((section) => (
        <ProseSection
          key={section.heading.en}
          heading={section.heading[l]}
          paragraphs={section.body[l]}
        />
      ))}
    </ProsePage>
  );
}
