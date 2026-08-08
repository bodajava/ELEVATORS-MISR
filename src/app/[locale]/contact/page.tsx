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

      {/* ── Opening: statement + real installation media above the fold ────
          The page previously rendered zero images across three and a half viewport
          heights. Two approved frames now sit in the first screen, and the form follows
          immediately — the visitor sees the work before being asked for their number. */}
      <Container width="wide" className="pt-28 pb-14 lg:pt-36 lg:pb-20">
        <Breadcrumbs items={[{ label: t('home'), href: '/' }, { label: contactPage.title[l] }]} />

        <div className="mt-8 grid gap-[clamp(1.5rem,4vw,2.5rem)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          <Reveal className="order-1">
            <p className="annotation text-accent-text">{contactIntro.eyebrow[l]}</p>
            <h1 className="mt-4 max-w-[15ch] font-display text-4xl text-balance text-ink sm:text-5xl lg:text-6xl">
              {contactIntro.heading[l]}
            </h1>
            <p className="mt-5 max-w-[46ch] text-base text-pretty text-ink-2 sm:text-lg">
              {contactIntro.lede[l]}
            </p>
            {contactIntro.body[l].map((paragraph) => (
              <p
                key={paragraph}
                className="mt-5 max-w-[54ch] border-t border-rule pt-5 text-base text-pretty text-ink-2"
              >
                {paragraph}
              </p>
            ))}
          </Reveal>

          <Reveal delay={0.1} className="order-2">
            <div className="grid grid-cols-3 gap-3">
              {contactMedia.map((entry, index) => (
                <div
                  key={entry.image.id}
                  className={`aperture relative h-[clamp(190px,32vh,300px)] overflow-hidden lg:h-auto ${
                    index === 0 ? 'col-span-2 lg:aspect-4/5' : 'col-span-1 lg:aspect-square'
                  }`}
                >
                  <Image
                    src={entry.image.src}
                    alt={entry.alt}
                    fill
                    priority={index === 0}
                    sizes="(min-width: 1024px) 30vw, 60vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 annotation text-ink-3">{contactIntro.mediaCaption[l]}</p>
          </Reveal>
        </div>
      </Container>

      {/* ── The form, with the reassurance column beside it ───────────────── */}
      <Container width="wide" className="pb-20 lg:pb-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_0.85fr] lg:items-start lg:gap-20">
          <div id="request-inspection" className="scroll-mt-32">
            <Reveal>
              <SectionHeading as="h2" title={contactPage.heading[l]} lede={contactPage.lede[l]} />
            </Reveal>

            <InspectionForm locale={l} />
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
                <h3 className="font-display text-lg text-ink">{contactPage.noContactHeading[l]}</h3>
                <p className="mt-3 max-w-[42ch] text-sm text-ink-3">
                  {contactPage.noContactBody[l]}
                </p>
              </div>

              {/* A third frame, so the column is not a wall of small type. */}
              {contactMedia[2] ? (
                <div className="aperture relative mt-10 aspect-4/3 w-full overflow-hidden">
                  <Image
                    src={contactMedia[2].image.src}
                    alt={contactMedia[2].alt}
                    fill
                    sizes="(min-width: 1024px) 34vw, 92vw"
                    className="object-cover"
                  />
                </div>
              ) : null}
            </div>
          </Reveal>
        </div>
      </Container>

      {/* ── What happens next ─────────────────────────────────────────────
          Order only. No timeframe appears anywhere in this sequence, because none has
          been supplied and promising one is prohibited. */}
      <Container width="wide" className="pb-20 lg:pb-28">
        <Reveal>
          <h2 className="font-display text-2xl text-ink sm:text-3xl">
            {contactIntro.nextHeading[l]}
          </h2>
        </Reveal>

        <ol className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-8 lg:grid-cols-4">
          {contactIntro.next[l].map((step, index) => (
            <Reveal as="li" key={step.title} delay={0.05 * index}>
              <div className="border-t border-rule pt-4">
                <p className="numeric annotation text-accent-text" dir="ltr">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 font-display text-base text-ink sm:text-lg">{step.title}</h3>
                <p className="mt-2 max-w-[36ch] text-sm text-ink-2">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </>
  );
}
