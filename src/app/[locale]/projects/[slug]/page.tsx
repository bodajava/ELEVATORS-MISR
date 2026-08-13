import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { ProjectMatrix } from '@/components/projects/project-matrix';
import { ProjectStory } from '@/components/projects/project-story';
import { InspectionCta } from '@/components/sections/inspection-cta';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Container } from '@/components/ui/container';
import { JsonLd } from '@/components/seo/json-ld';
import { projectsPage } from '@/content/pages';
import { finishLabels, getProject, projects, settingLabels } from '@/content/projects';
import { isLocale, locales, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { imagesFor, videosFor } from '@/lib/media';
import { buildAlternates } from '@/lib/seo/metadata';
import { breadcrumbSchema, imageObjectSchema } from '@/lib/seo/schema';

/** Every project in every locale prerenders. There are ten of them; nothing needs to be lazy. */
export function generateStaticParams() {
  return locales.flatMap((locale) => projects.map((p) => ({ locale, slug: p.slug })));
}

/**
 * A slug that is not in the list above is a 404, not a page to render on demand.
 *
 * `dynamicParams` defaults to `true`, and the default was wrong here in a way that only shows
 * up in the response status. An unknown slug was rendered on request, `notFound()` below
 * produced the not-found UI, and Next then **cached that render and served it with HTTP 200** —
 * `.next/server/app/en/projects/a-project-that-does-not-exist.html` was a real file. A soft 404:
 * correct to a reader, an indexable page to a crawler, and an invitation to fill the site's
 * search results with URLs that do not exist.
 *
 * `false` is safe precisely because the list is closed — the projects come from a static array
 * in `src/content/projects.ts`, not a CMS, so there is no slug that could legitimately appear
 * after the build. Covered by `tests/e2e/journeys.spec.ts`.
 */
export const dynamicParams = false;

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
  const [lead] = images;

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
        {/* ── Identity ────────────────────────────────────────────────────────
            Full width, not squeezed beside the lead photograph. The old layout put the
            copy in a 1fr column next to a portrait still, which left most of the viewport
            empty on projects with short bodies. */}
        <Container width="wide">
          <p className="annotation text-accent-text">{finishLabels[project.finish][l]}</p>
          <h1 className="mt-4 max-w-[16ch] font-display text-4xl text-balance text-ink sm:text-5xl lg:text-6xl">
            {project.title[l]}
          </h1>

          <div className="mt-10 grid gap-10 border-t border-rule pt-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div className="flex flex-col gap-5">
              {project.body[l].map((paragraph) => (
                <p key={paragraph} className="max-w-[58ch] text-base text-pretty text-ink-2">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Verified metadata only. Every value here comes from the project record or is
                counted from the media that actually shipped — nothing is inferred, and
                there is no client, date, location or specification. */}
            <dl className="grid grid-cols-2 gap-x-8 gap-y-6 self-start">
              {[
                { k: l === 'en' ? 'Finish' : 'التشطيب', v: finishLabels[project.finish][l] },
                { k: l === 'en' ? 'Setting' : 'الموقع', v: settingLabels[project.setting][l] },
                {
                  k: l === 'en' ? 'Frames' : 'الصور',
                  v: String(images.length).padStart(2, '0'),
                },
                {
                  k: l === 'en' ? 'Film' : 'فيلم',
                  v: videos.length > 0 ? String(videos.length).padStart(2, '0') : '—',
                },
              ].map((row) => (
                <div key={row.k} className="border-t border-rule pt-3">
                  <dt className="annotation text-ink-3">{row.k}</dt>
                  <dd className="mt-1.5 font-body text-base text-ink">{row.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>

        {/* ── The media story ─────────────────────────────────────────────────
            Every still and film belonging to this project, composed into complete rows.
            See ProjectStory: a lone portrait is never left beside an empty column. */}
        <Container width="wide" className="mt-14 lg:mt-20">
          <ProjectStory
            images={images}
            videos={videos}
            alt={project.alt[l]}
            label={project.title[l]}
            locale={l}
          />
        </Container>
      </article>

      {related.length > 0 ? (
        <Container width="wide" className="mt-24 lg:mt-32">
          <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-5">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              {l === 'en' ? 'More in this finish' : 'أعمال أخرى بالتشطيب نفسه'}
            </h2>
            <p className="numeric shrink-0 annotation" dir="ltr">
              {String(related.length).padStart(2, '0')}
            </p>
          </div>

          {/* The same planner as the index, so the related row is balanced and can never
              strand a single project on its own line. The current project is excluded
              upstream, so it can never appear as related to itself. */}
          <div className="mt-12">
            <ProjectMatrix items={related} locale={l} />
          </div>

          <p className="mt-10">
            <Link
              href="/projects"
              className="text-sm text-ink-2 underline underline-offset-4 transition-colors hover:text-ink"
            >
              {tCta('viewAllProjects')}
            </Link>
          </p>
        </Container>
      ) : null}

      <div className="mt-20">
        <InspectionCta locale={l} />
      </div>
    </>
  );
}
