import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Aperture } from '@/components/media/aperture';
import { AmbientVideo } from '@/components/media/ambient-video';
import { ProjectImage } from '@/components/media/project-image';
import { Reveal } from '@/components/motion/reveal';
import { ProjectCard } from '@/components/projects/project-card';
import { InspectionCta } from '@/components/sections/inspection-cta';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Container } from '@/components/ui/container';
import { JsonLd } from '@/components/seo/json-ld';
import { projectsPage } from '@/content/pages';
import { finishLabels, getProject, projects } from '@/content/projects';
import { isLocale, locales, type Locale } from '@/i18n/config';
import { imageSizes, imagesFor, maxImageWidth, maxVideoWidth, videosFor } from '@/lib/media';
import { buildAlternates } from '@/lib/seo/metadata';
import { breadcrumbSchema, imageObjectSchema } from '@/lib/seo/schema';

/** Every project in every locale prerenders. There are ten of them; nothing needs to be lazy. */
export function generateStaticParams() {
  return locales.flatMap((locale) => projects.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = locale as Locale;
  const project = getProject(slug);
  if (!project) return {};

  const lead = imagesFor(slug)[0];

  return {
    title: project.title[l],
    description: project.summary[l],
    alternates: buildAlternates(l, `/projects/${slug}`),
    openGraph: {
      type: 'article',
      title: `${project.title[l]} · Egypt Elevators`,
      description: project.summary[l],
      images: lead
        ? [{ url: lead.src, width: lead.width, height: lead.height, alt: project.alt[l] }]
        : [],
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  // A single-segment path with a file extension (/sw.js, /favicon.png) skips the locale
  // proxy but still matches this dynamic segment, so the param is validated here as
  // well as in the layout — the page renders in parallel with it, not after it.
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l: Locale = locale;

  const project = getProject(slug);
  if (!project) notFound();

  const t = await getTranslations('pageHeader');
  const tCta = await getTranslations('cta');

  const images = imagesFor(slug);
  const videos = videosFor(slug);
  const [lead, ...rest] = images;

  const related = projects
    .filter((p) => p.slug !== slug && p.finish === project.finish)
    .slice(0, 3);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema(l, [
            { name: t('home'), path: '' },
            { name: projectsPage.title[l], path: '/projects' },
            { name: project.title[l], path: `/projects/${slug}` },
          ]),
          ...(lead ? [imageObjectSchema(lead, project.alt[l])] : []),
        ]}
      />

      <Container width="wide" className="pt-28 pb-6 lg:pt-32">
        <Breadcrumbs
          items={[
            { label: t('home'), href: '/' },
            { label: projectsPage.title[l], href: '/projects' },
            { label: project.title[l] },
          ]}
        />
      </Container>

      <article>
        <Container width="wide">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-start lg:gap-16">
            <div className="lg:pt-6">
              <p className="annotation">{finishLabels[project.finish][l]}</p>
              <h1 className="mt-4 font-display text-4xl text-balance text-ink sm:text-5xl">
                {project.title[l]}
              </h1>
              <div className="mt-8 flex flex-col gap-5">
                {project.body[l].map((paragraph) => (
                  <p key={paragraph} className="max-w-[54ch] text-base text-pretty text-ink-2">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* The lead frame is capped at what this file can actually resolve. These are
                ~960px phone captures; drawing one at 700px on a retina screen is the
                pixelation the review reported. */}
            {lead ? (
              <div style={{ maxWidth: `${maxImageWidth(lead)}px` }} className="w-full">
                <Aperture ratio="3/4" framed>
                  <ProjectImage
                    image={lead}
                    alt={project.alt[l]}
                    sizes={`(max-width: 1023px) 92vw, ${maxImageWidth(lead)}px`}
                    priority
                  />
                </Aperture>
              </div>
            ) : null}
          </div>
        </Container>

        {/* Remaining stills — the secondary angles. Deliberately smaller than the lead: they
            are supporting frames, and several are the weaker captures of their set. */}
        {rest.length > 0 ? (
          <Container width="wide" className="mt-16">
            <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((image, index) => (
                <Reveal as="li" key={image.id} delay={0.05 * (index % 3)}>
                  <Aperture ratio="3/4">
                    <ProjectImage image={image} alt={project.alt[l]} sizes={imageSizes.card} />
                  </Aperture>
                </Reveal>
              ))}
            </ul>
          </Container>
        ) : null}

        {videos.length > 0 ? (
          <Container width="wide" className="mt-16">
            <ul className="grid gap-8 sm:grid-cols-2 lg:max-w-3xl">
              {videos.map((video) => (
                <Reveal as="li" key={video.id}>
                  {/* Capped to the clip's own resolution — these are 624x832 and 960x540
                      captures, so the frame is a card, not a panel. */}
                  <div
                    className={`aperture relative w-full aperture-mask bg-aperture ${
                      video.orientation === 'portrait' ? 'aspect-3/4' : 'aspect-video'
                    }`}
                    style={{ maxWidth: `${maxVideoWidth(video)}px` }}
                  >
                    <AmbientVideo video={video} label={project.title[l]} />
                  </div>
                </Reveal>
              ))}
            </ul>
          </Container>
        ) : null}
      </article>

      {related.length > 0 ? (
        <Container width="wide" className="mt-20">
          <h2 className="border-b border-rule pb-5 font-display text-2xl text-ink">
            {finishLabels[project.finish][l]}
          </h2>
          <div className="mt-12 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item, index) => (
              <Reveal key={item.slug} delay={0.05 * index}>
                <ProjectCard project={item} locale={l} />
              </Reveal>
            ))}
          </div>
          <p className="mt-10">
            <a
              href={`/${l}/projects`}
              className="text-sm text-ink-2 underline underline-offset-4 transition-colors hover:text-ink"
            >
              {tCta('viewAllProjects')}
            </a>
          </p>
        </Container>
      ) : null}

      <div className="mt-20">
        <InspectionCta locale={l} />
      </div>
    </>
  );
}
