import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';

import { FilmSlider, type FilmSlide } from '@/components/media/film-slider';
import { Reveal } from '@/components/motion/reveal';
import { ProjectMatrix } from '@/components/projects/project-matrix';
import { InspectionCta } from '@/components/sections/inspection-cta';
import { MaterialSwitch, type MaterialOption } from '@/components/sections/material-switch';
import { JsonLd } from '@/components/seo/json-ld';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { panoramaPage } from '@/content/pages';
import { finishLabels, getProject, projects } from '@/content/projects';
import { getDirection, isLocale, type Locale } from '@/i18n/config';
import { allImages, bestImageFor, imagesFor, productFilms } from '@/lib/media';
import { buildAlternates } from '@/lib/seo/metadata';
import { breadcrumbSchema, serviceSchema } from '@/lib/seo/schema';
import { cn } from '@/lib/utils';

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
  };
}

/**
 * Panorama elevators.
 *
 * ── What this replaces ──────────────────────────────────────────────────────
 * A long single text column with **one** sticky photograph beside it. Across four viewport
 * heights the page rendered a single image, which is the "one narrow image, empty column"
 * defect in its purest form.
 *
 * ── The rebuild ─────────────────────────────────────────────────────────────
 * The same verified copy, re-composed so every section is paired with real media and the
 * side alternates down the page. Added: a materials switch, the product films, and the
 * completed installations — all drawn from the manifest rather than hard-coded, and all of
 * it material the site already owned but never showed here.
 *
 * No specification, load rating, speed, dimension or standard appears anywhere on this page,
 * because none has been supplied and inventing one would be fabricating engineering claims.
 */
export default async function PanoramaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // A single-segment path with a file extension (/sw.js, /favicon.png) skips the locale
  // proxy but still matches this dynamic segment, so the param is validated here as
  // well as in the layout — the page renders in parallel with it, not after it.
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l: Locale = locale;
  const t = await getTranslations('pageHeader');

  const sections = panoramaPage.sections[l];

  // One frame per section, alternating sides. Drawn from the galleries so the pairing
  // survives a media rebuild rather than pointing at fixed filenames.
  const frames = allImages.filter((i) => i.role === 'gallery' || i.role === 'hero-still');
  const lead = frames[0];
  const leadProject = lead ? getProject(lead.projectSlug) : undefined;

  const brass = projects.find((p) => p.finish === 'brass');
  const smoked = projects.find((p) => p.finish === 'smoked-glass');

  const materials: MaterialOption[] = [brass, smoked].flatMap((project) => {
    if (!project) return [];
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

  const films = productFilms();
  const slides: FilmSlide[] = films.map((film, index) => {
    const project = getProject(film.projectSlug);
    return {
      video: film,
      label: project
        ? project.alt[l]
        : l === 'en'
          ? 'Walkthrough of a finished panorama elevator installation'
          : 'جولة داخل تركيب مصعد بانوراما منفَّذ',
      title: project ? project.title[l] : l === 'en' ? 'On site' : 'في الموقع',
      meta: `${String(index + 1).padStart(2, '0')} · ${Math.round(film.durationSeconds)}s`,
      dotLabel:
        l === 'en'
          ? `Show film ${index + 1} of ${films.length}`
          : `اعرض الفيلم ${index + 1} من ${films.length}`,
    };
  });

  const showcase = projects.slice(0, 3);

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

      {/* ── Opening: heading beside a real installation frame ──────────────── */}
      <Container width="wide" className="pt-28 pb-16 lg:pt-36 lg:pb-20">
        <Breadcrumbs items={[{ label: t('home'), href: '/' }, { label: panoramaPage.title[l] }]} />

        <div className="mt-8 grid gap-[clamp(1.5rem,4vw,2.5rem)] lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-16">
          <Reveal className="order-1">
            <SectionHeading as="h1" title={panoramaPage.heading[l]} lede={panoramaPage.lede[l]} />
          </Reveal>

          {lead ? (
            <Reveal delay={0.1} className="order-2">
              <div className="aperture relative h-[clamp(200px,34vh,320px)] w-full overflow-hidden lg:aspect-4/5 lg:h-auto">
                <Image
                  src={lead.src}
                  alt={leadProject?.alt[l] ?? panoramaPage.heading[l]}
                  fill
                  priority
                  sizes="(min-width: 1024px) 42vw, 92vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
          ) : null}
        </div>
      </Container>

      {/* ── The explanation, alternating text and media ─────────────────────
          Each section is paired with a frame and the side alternates, so no section ever
          runs as a column of prose against an empty half of the viewport. */}
      {sections.map((section, index) => {
        const image = frames[(index + 1) % Math.max(1, frames.length)];
        const project = image ? getProject(image.projectSlug) : undefined;
        const mediaFirst = index % 2 === 1;

        return (
          <Container key={section.heading} width="wide" className="pb-16 lg:pb-24">
            <div className="grid items-center gap-[clamp(1.5rem,4vw,2.5rem)] lg:grid-cols-2 lg:gap-16">
              <Reveal className={cn(mediaFirst ? 'lg:order-2' : 'lg:order-1')}>
                <section>
                  <h2 className="font-display text-2xl text-ink sm:text-3xl">{section.heading}</h2>
                  <div className="mt-5 flex max-w-[56ch] flex-col gap-4">
                    {section.body.map((p) => (
                      <p key={p} className="text-base text-pretty text-ink-2">
                        {p}
                      </p>
                    ))}
                  </div>
                </section>
              </Reveal>

              {image ? (
                <Reveal delay={0.08} className={cn(mediaFirst ? 'lg:order-1' : 'lg:order-2')}>
                  <div className="aperture relative h-[clamp(190px,32vh,300px)] w-full overflow-hidden lg:aspect-4/3 lg:h-auto">
                    <Image
                      src={image.src}
                      alt={project?.alt[l] ?? section.heading}
                      fill
                      sizes="(min-width: 1024px) 46vw, 92vw"
                      className="object-cover"
                    />
                  </div>
                </Reveal>
              ) : null}
            </div>
          </Container>
        );
      })}

      {/* ── Finishes ───────────────────────────────────────────────────────── */}
      {materials.length > 0 ? (
        <Container width="wide" className="pb-20 lg:pb-28">
          <Reveal>
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              {l === 'en' ? 'Finishes' : 'التشطيبات'}
            </h2>
            <p className="mt-3 max-w-[56ch] text-base text-ink-2">
              {l === 'en'
                ? 'Two finishes, and the difference is what the car does to the light in the room.'
                : 'تشطيبان اثنان، والفارق بينهما هو ما تفعله الكابينة بالضوء داخل المكان.'}
            </p>
          </Reveal>
          <MaterialSwitch className="mt-12" options={materials} />
        </Container>
      ) : null}

      {/* ── Where it works / what has to be true ───────────────────────────── */}
      <Container width="wide" className="pb-20 lg:pb-28">
        <div className="grid gap-12 sm:grid-cols-2 lg:gap-20">
          <Reveal>
            <h2 className="font-display text-2xl text-ink">{panoramaPage.whereHeading[l]}</h2>
            <ul className="mt-6 flex flex-col">
              {panoramaPage.where[l].map((item) => (
                <li key={item} className="border-t border-rule py-3.5 text-sm text-ink-2">
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="font-display text-2xl text-ink">{panoramaPage.limitsHeading[l]}</h2>
            <ul className="mt-6 flex flex-col">
              {panoramaPage.limits[l].map((item) => (
                <li key={item} className="border-t border-rule py-3.5 text-sm text-ink-2">
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>

      {/* ── The films ──────────────────────────────────────────────────────── */}
      {slides.length > 0 ? (
        <Container width="wide" className="pb-20 lg:pb-28">
          <Reveal>
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              {l === 'en' ? 'On site' : 'في الموقع'}
            </h2>
          </Reveal>
          <FilmSlider
            className="mt-10"
            slides={slides}
            dir={getDirection(l)}
            labels={
              l === 'en'
                ? { carousel: 'carousel', slide: 'slide', group: 'Project films' }
                : { carousel: 'شريط عرض', slide: 'شريحة', group: 'أفلام المشروعات' }
            }
          />
        </Container>
      ) : null}

      {/* ── Completed installations ────────────────────────────────────────── */}
      <Container width="wide" className="pb-20 lg:pb-28">
        <Reveal>
          <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-5">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              {l === 'en' ? 'Completed installations' : 'أعمال منفَّذة'}
            </h2>
            <p className="numeric shrink-0 annotation" dir="ltr">
              {String(showcase.length).padStart(2, '0')}
            </p>
          </div>
        </Reveal>
        <div className="mt-12">
          <ProjectMatrix items={showcase} locale={l} />
        </div>
      </Container>

      <InspectionCta locale={l} />
    </>
  );
}
