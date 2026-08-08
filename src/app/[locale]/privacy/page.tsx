import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { ProsePage, ProseSection } from '@/components/layout/prose-page';
import { privacy } from '@/content/legal';
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
    title: privacy.title[l],
    description: privacy.description[l],
    alternates: buildAlternates(l, '/privacy'),
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
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
      crumbs={[{ label: t('home'), href: '/' }, { label: privacy.title[l] }]}
      title={privacy.title[l]}
      lede={privacy.lede[l]}
    >
      {privacy.sections.map((section) => (
        <ProseSection
          key={section.heading.en}
          heading={section.heading[l]}
          paragraphs={section.body[l]}
        />
      ))}

      {/* Gaps are stated on the page rather than filled with invented values. */}
      <section className="border-s-2 border-ink ps-5">
        <h2 className="font-display text-lg text-ink">
          {l === 'en' ? 'Still to be confirmed' : 'بنود قيد التأكيد'}
        </h2>
        <ul className="mt-3 flex list-disc flex-col gap-1.5 ps-5 text-sm text-ink-3">
          {privacy.outstanding[l].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </ProsePage>
  );
}
