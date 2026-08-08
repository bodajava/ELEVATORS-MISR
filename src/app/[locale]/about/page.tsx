import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';

import { Reveal } from '@/components/motion/reveal';
import { MaterialSwitch, type MaterialOption } from '@/components/sections/material-switch';
import { InspectionCta } from '@/components/sections/inspection-cta';
import { Proof } from '@/components/sections/proof';
import { JsonLd } from '@/components/seo/json-ld';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button, CtaArrow } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { about } from '@/content/about';
import { aboutPage } from '@/content/pages';
import { finishLabels, projects } from '@/content/projects';
import { process as processContent } from '@/content/home';
import { isLocale, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { bestImageFor, imagesFor, socialProofImages } from '@/lib/media';
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

/**
 * About.
 *
 * ── What this replaces ──────────────────────────────────────────────────────
 * A narrow centred text column with no photography above the fold, a three-up definition
 * list, and a dark band at the bottom doing all the visual work. It read as an article draft.
 *
 * The rebuild is an editorial composition: an asymmetric opening that carries real
 * installation photography in the first viewport, a company-identity band, the field-work
 * gallery (the people photography, which the page never used), an interactive materials
 * section, a compact process preview, and the inspection CTA.
 *
 * Every fact is verified and every photograph is the company's own. No founding year, no
 * employee count, no certification, no client, no testimonial — none has been supplied.
 */
export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // A single-segment path with a file extension (/sw.js, /favicon.png) skips the locale
  // proxy but still matches this dynamic segment, so the param is validated here as
  // well as in the layout — the page renders in parallel with it, not after it.
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l: Locale = locale;
  const t = await getTranslations('pageHeader');

  // Real media, chosen by role rather than hard-coded paths.
  const brass = projects.find((p) => p.finish === 'brass');
  const smoked = projects.find((p) => p.finish === 'smoked-glass');
  const lead = brass ? bestImageFor(brass.slug) : undefined;
  const support = smoked ? bestImageFor(smoked.slug) : undefined;
  const people = socialProofImages();

  const materials: MaterialOption[] = [brass, smoked].flatMap((project) => {
    if (!project) return [];
    // The second frame of the set, not the lead — the lead already appears in the opening
    // composition, and repeating it here would make the page look thinner than it is.
    const image = imagesFor(project.slug)[1] ?? bestImageFor(project.slug);
    if (!image) return [];
    return [
      {
        id: project.finish,
        label: finishLabels[project.finish][l],
        body: project.summary[l],
        image,
        alt: project.alt[l],
      } satisfies MaterialOption,
    ];
  });

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

      {/* ── A. Opening composition ─────────────────────────────────────────
          Desktop: statement and copy in the left column, a tall installation frame in the
          right, with a smaller supporting frame overlapping its lower edge.

          Mobile: the same three blocks, re-ordered by the grid rather than duplicated —
          label, heading, short lede, **then the media**, then the longer copy. The previous
          arrangement stacked the whole left column first, which pushed every photograph
          below the fold on a phone: the page opened as a wall of text.

          The media is a two-up on mobile (primary + supporting) at roughly a third of the
          viewport, never a full-screen card. Absolute positioning is `lg:` only, so nothing
          can escape its box at a narrow width. */}
      <Container width="wide" className="pt-28 pb-16 lg:pt-36 lg:pb-24">
        <Breadcrumbs items={[{ label: t('home'), href: '/' }, { label: aboutPage.title[l] }]} />

        <div className="mt-8 grid gap-[clamp(1.5rem,4vw,2.5rem)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          {/* 1 — label, heading, lede */}
          <Reveal className="order-1 lg:col-start-1 lg:row-start-1">
            <p className="annotation text-accent-text">{about.eyebrow[l]}</p>
            <h1 className="mt-4 max-w-[14ch] font-display text-4xl text-balance text-ink sm:text-5xl lg:text-6xl">
              {about.heading[l]}
            </h1>
            <p className="mt-5 max-w-[46ch] text-base text-pretty text-ink-2 sm:text-lg">
              {about.lede[l]}
            </p>
          </Reveal>

          {/* 2 — media. Second on mobile, right-hand column on desktop. */}
          <Reveal
            delay={0.1}
            className="order-2 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1"
          >
            <div className="grid grid-cols-3 gap-3 lg:relative lg:block">
              {lead ? (
                <div className="aperture relative col-span-2 h-[clamp(190px,32vh,300px)] overflow-hidden lg:col-span-1 lg:aspect-3/4 lg:h-auto lg:w-full">
                  <Image
                    src={lead.src}
                    alt={brass?.alt[l] ?? ''}
                    fill
                    priority
                    sizes="(min-width: 1024px) 46vw, 62vw"
                    className="object-cover"
                  />
                </div>
              ) : null}

              {support ? (
                <div className="aperture relative col-span-1 h-[clamp(190px,32vh,300px)] overflow-hidden lg:absolute lg:-inset-s-12 lg:-bottom-8 lg:aspect-square lg:h-auto lg:w-52 lg:shadow-card">
                  <Image
                    src={support.src}
                    alt={smoked?.alt[l] ?? ''}
                    fill
                    sizes="(min-width: 1024px) 13rem, 30vw"
                    className="object-cover"
                  />
                </div>
              ) : null}
            </div>
          </Reveal>

          {/* 3 — the longer company copy, after the media on mobile. */}
          <Reveal delay={0.05} className="order-3 lg:col-start-1 lg:row-start-2">
            <div className="flex flex-col gap-5 border-t border-rule pt-7">
              {about.intro[l].map((paragraph) => (
                <p key={paragraph} className="max-w-[54ch] text-base text-pretty text-ink-2">
                  {paragraph}
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </Container>

      {/* ── B. Company identity ────────────────────────────────────────────── */}
      <Container width="wide" className="pb-20 lg:pb-28">
        <Reveal>
          <h2 className="font-display text-2xl text-ink sm:text-3xl">{about.identityHeading[l]}</h2>
        </Reveal>
        <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {about.identity[l].map((row, index) => (
            <Reveal key={row.label} delay={0.05 * index}>
              <div className="border-t border-rule pt-4">
                <dt className="annotation text-ink-3">{row.label}</dt>
                <dd
                  className="mt-2 font-display text-lg text-ink"
                  // Latin and numeric values stay LTR inside Arabic copy.
                  dir={/^[A-Za-z0-9]/.test(row.value) ? 'ltr' : undefined}
                >
                  {row.value}
                </dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </Container>

      {/* The verified-figures band. Carbon, so it anchors the middle of the page. */}
      <Proof locale={l} />

      {/* ── C. Field work — the people photography ─────────────────────────
          Four frames, mixed orientation, laid out so the two landscape frames span wider
          cells and the portraits sit narrow. Captions describe what is in frame and nothing
          more: no names, no roles, no testimonials. */}
      {people.length > 0 ? (
        <Container width="wide" className="py-20 lg:py-28">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
              <div>
                <h2 className="font-display text-2xl text-ink sm:text-3xl">
                  {about.fieldHeading[l]}
                </h2>
                <p className="mt-3 max-w-[52ch] text-base text-ink-2">{about.fieldLede[l]}</p>
              </div>
              <p className="numeric shrink-0 annotation" dir="ltr">
                {String(people.length).padStart(2, '0')}
              </p>
            </div>
          </Reveal>

          <ul className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-6">
            {people.map((image, index) => (
              <Reveal
                as="li"
                key={image.id}
                delay={0.05 * index}
                // Landscape frames take three columns, portraits take two — the row stays
                // full and no frame is letterboxed into the wrong shape.
                className={
                  image.orientation === 'landscape' ? 'col-span-2 lg:col-span-3' : 'lg:col-span-3'
                }
              >
                <div
                  className={`aperture relative w-full overflow-hidden ${
                    image.orientation === 'landscape' ? 'aspect-4/3' : 'aspect-3/4'
                  }`}
                >
                  <Image
                    src={image.src}
                    alt={about.fieldCaptions[l][index] ?? about.fieldHeading[l]}
                    fill
                    sizes="(min-width: 1024px) 46vw, 46vw"
                    className="object-cover"
                  />
                </div>
                <p className="mt-3 annotation text-ink-3">{about.fieldCaptions[l][index] ?? ''}</p>
              </Reveal>
            ))}
          </ul>
        </Container>
      ) : null}

      {/* ── D. Materials and workmanship ───────────────────────────────────── */}
      {materials.length > 0 ? (
        <Container width="wide" className="pb-20 lg:pb-28">
          <Reveal>
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              {about.materialsHeading[l]}
            </h2>
            <p className="mt-3 max-w-[56ch] text-base text-ink-2">{about.materialsLede[l]}</p>
          </Reveal>
          <MaterialSwitch className="mt-12" options={materials} />
        </Container>
      ) : null}

      {/* ── E. How a project runs ──────────────────────────────────────────── */}
      <Container width="wide" className="pb-20 lg:pb-28">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
            <div>
              <h2 className="font-display text-2xl text-ink sm:text-3xl">
                {about.approachHeading[l]}
              </h2>
              <p className="mt-3 max-w-[52ch] text-base text-ink-2">{about.approachLede[l]}</p>
            </div>
            <Button asChild variant="secondary" size="md">
              <Link href="/process">
                {about.approachLink[l]}
                <CtaArrow />
              </Link>
            </Button>
          </div>
        </Reveal>

        <ol className="mt-10 grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8 lg:grid-cols-6">
          {processContent.steps[l].map((step, index) => (
            <Reveal as="li" key={step.title} delay={0.04 * index}>
              <div className="border-t border-rule pt-4">
                <p className="numeric annotation text-accent-text" dir="ltr">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 font-display text-base text-ink">{step.title}</h3>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>

      {/* ── F. Closing CTA ─────────────────────────────────────────────────── */}
      <InspectionCta locale={l} />
    </>
  );
}
