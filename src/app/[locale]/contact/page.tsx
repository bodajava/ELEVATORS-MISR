import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Reveal } from '@/components/motion/reveal';
import { JsonLd } from '@/components/seo/json-ld';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { finalCta } from '@/content/home';
import { contactPage } from '@/content/pages';
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
    title: contactPage.title[l],
    description: contactPage.description[l],
    alternates: buildAlternates(l, '/contact'),
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
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
        data={breadcrumbSchema(l, [
          { name: t('home'), path: '' },
          { name: contactPage.title[l], path: '/contact' },
        ])}
      />

      <Container width="wide" className="pt-32 pb-24 lg:pt-40">
        <Breadcrumbs items={[{ label: t('home'), href: '/' }, { label: contactPage.title[l] }]} />

        <div className="grid gap-14 lg:grid-cols-[1fr_0.85fr] lg:items-start lg:gap-20">
          <div id="request-inspection" className="scroll-mt-32">
            <Reveal>
              <SectionHeading as="h1" title={contactPage.heading[l]} lede={contactPage.lede[l]} />
            </Reveal>

            {/* The inspection form is wired up in Phase 4. */}
            <div className="mt-10 rounded-sm border border-rule bg-paper-sunken p-8">
              <p className="text-sm text-ink-2">{contactPage.formHeading[l]}</p>
            </div>
          </div>

          <Reveal delay={0.08}>
            <div className="border-s border-rule ps-7">
              <ul className="flex flex-col gap-4">
                {finalCta.reassurance[l].map((line) => (
                  <li key={line} className="text-sm text-ink-2">
                    {line}
                  </li>
                ))}
              </ul>

              <div className="mt-10 border-t border-rule pt-8">
                <h2 className="font-display text-lg text-ink">{contactPage.noContactHeading[l]}</h2>
                <p className="mt-3 max-w-[42ch] text-sm text-ink-3">
                  {contactPage.noContactBody[l]}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </>
  );
}
