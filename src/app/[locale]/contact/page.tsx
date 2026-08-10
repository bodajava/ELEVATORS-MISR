import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { InspectionForm } from '@/components/forms/inspection-form';
import Image from 'next/image';

import { Reveal } from '@/components/motion/reveal';
import { JsonLd } from '@/components/seo/json-ld';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { finalCta } from '@/content/home';
import { contactIntro } from '@/content/inspection';
import { contactPage } from '@/content/pages';
import { isLocale, type Locale } from '@/i18n/config';
import { buildAlternates } from '@/lib/seo/metadata';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { projects } from '@/content/projects';
import { bestImageFor } from '@/lib/media';

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

  // Three approved frames, drawn from the project galleries rather than hard-coded paths, so
  // the pairing survives a media rebuild. Everything here is rights-clear and already ships
  // elsewhere on the site.
  const contactMedia = projects
    .slice(0, 3)
    .map((project) => {
      const image = bestImageFor(project.slug);
      return image ? { image, alt: project.alt[l] } : null;
    })
    .filter(
      (entry): entry is { image: NonNullable<ReturnType<typeof bestImageFor>>; alt: string } =>
        entry !== null
    );

  return (
    <>
      <JsonLd
        data={breadcrumbSchema(l, [
          { name: t('home'), path: '' },
          { name: contactPage.title[l], path: '/contact' },
        ])}
      />

      {/* ── Opening ────────────────────────────────────────────────────────
          Deliberately compact. This page was three loosely stacked blocks running to five
          viewport heights, with a display headline the size of the homepage's and a
          reassurance column that ran out of content halfway down the form beside it. It is
          now one composition: a short statement, the work, then the form — with everything
          that supports the form travelling alongside it instead of below it. */}
      <Container width="wide" className="pt-24 pb-10 lg:pt-28 lg:pb-12">
        <Breadcrumbs items={[{ label: t('home'), href: '/' }, { label: contactPage.title[l] }]} />

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-end lg:gap-14">
          <Reveal className="order-1">
            <p className="annotation text-accent-text">{contactIntro.eyebrow[l]}</p>
            {/* One step down from the homepage's display size. This is a task page: the
                headline sets the scene, the form is the subject. */}
            <h1 className="mt-3 max-w-[18ch] font-display text-3xl text-balance text-ink sm:text-4xl lg:text-5xl">
              {contactIntro.heading[l]}
            </h1>
            <p className="mt-4 max-w-[52ch] text-base text-pretty text-ink-2">
              {contactIntro.lede[l]}
            </p>
            {contactIntro.body[l].map((paragraph) => (
              <p key={paragraph} className="mt-4 max-w-[56ch] text-sm text-pretty text-ink-3">
                {paragraph}
              </p>
            ))}
          </Reveal>

          {/* Two frames, not three. The third used to sit alone at the bottom of the
              sidebar as filler; both of these earn their place in the first screen. */}
          <Reveal delay={0.1} className="order-2">
            <div className="grid grid-cols-3 gap-2.5">
              {contactMedia.slice(0, 2).map((entry, index) => (
                <div
                  key={entry.image.id}
                  className={`aperture relative h-[clamp(150px,24vh,230px)] overflow-hidden lg:h-auto ${
                    index === 0 ? 'col-span-2 lg:aspect-4/3' : 'col-span-1 lg:aspect-square'
                  }`}
                >
                  <Image
                    src={entry.image.src}
                    alt={entry.alt}
                    fill
                    priority={index === 0}
                    sizes="(min-width: 1024px) 28vw, 60vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2.5 annotation text-ink-3">{contactIntro.mediaCaption[l]}</p>
          </Reveal>
        </div>
      </Container>

      {/* ── The form, with everything that supports it beside it ──────────── */}
      <Container width="wide" className="pb-20 lg:pb-24">
        <div className="grid gap-10 border-t border-rule pt-10 lg:grid-cols-[1fr_0.72fr] lg:items-start lg:gap-16 lg:pt-12">
          <div id="request-inspection" className="scroll-mt-32">
            <Reveal>
              <SectionHeading as="h2" title={contactPage.heading[l]} lede={contactPage.lede[l]} />
            </Reveal>

            <InspectionForm locale={l} />
          </div>

          {/* Sticky, so it travels with the fields instead of ending three screens above
              the submit button and leaving the column empty from there down. */}
          <Reveal delay={0.08} className="lg:sticky lg:top-28">
            <div className="rounded-(--radius-card) bg-paper-raised p-6 ring-1 ring-rule sm:p-7">
              <ul className="flex flex-col gap-3">
                {finalCta.reassurance[l].map((line) => (
                  <li key={line} className="flex gap-2.5 text-sm text-ink-2">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                    {line}
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-rule pt-5">
                <h3 className="font-display text-base text-ink">
                  {contactPage.noContactHeading[l]}
                </h3>
                <p className="mt-2 text-sm text-ink-3">{contactPage.noContactBody[l]}</p>
              </div>
            </div>

            {/* ── What happens next ────────────────────────────────────────
                Beside the form rather than a whole section under it: it is context for
                the thing being filled in, not a separate chapter. Order only — no
                timeframe appears anywhere here, because none has been supplied. */}
            <div className="mt-8">
              <h2 className="font-display text-lg text-ink">{contactIntro.nextHeading[l]}</h2>
              <ol className="mt-4 flex flex-col">
                {contactIntro.next[l].map((step, index) => (
                  <li key={step.title} className="flex gap-4 border-t border-rule py-3.5">
                    <span className="numeric mt-0.5 shrink-0 annotation text-accent-text" dir="ltr">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">{step.title}</span>
                      <span className="mt-1 block max-w-[42ch] text-sm text-ink-2">
                        {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </Container>
    </>
  );
}
