import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/seo/json-ld';
import { Ascent } from '@/components/sections/ascent';
import { Hero } from '@/components/sections/hero';
import { InspectionCta } from '@/components/sections/inspection-cta';
import { MediaStories } from '@/components/sections/media-stories';
import { PanoramaStory } from '@/components/sections/panorama-story';
import { HomeProcess } from '@/components/sections/home-process';
import { Proof } from '@/components/sections/proof';
import { SelectedProjects } from '@/components/sections/selected-projects';
import { SocialProof } from '@/components/sections/social-proof';
import { ascent } from '@/content/home';
import { featuredProjects, finishLabels, settingLabels } from '@/content/projects';
import { isLocale, type Locale } from '@/i18n/config';
import { bestImageFor, heroAsset, maxImageWidth } from '@/lib/media';
import { homePageSchema } from '@/lib/seo/schema';

/**
 * Homepage — a guided vertical journey.
 *
 * Arrive → understand the specialism → ascend through the work → understand the product →
 * understand the process → see the films → see the people → book the inspection.
 *
 * Media is resolved on the server and passed down, so the client components never import the
 * manifest and it stays out of the client bundle.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // A single-segment path with a file extension (/sw.js, /favicon.png) skips the locale
  // proxy but still matches this dynamic segment, so the param is validated here as
  // well as in the layout — the page renders in parallel with it, not after it.
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l: Locale = locale;

  // The ascent shows the five strongest installations. `bestImageFor` picks the
  // highest-resolution frame per project rather than folder order, so the sharpest angle
  // leads; `maxImageWidth` caps how wide it may be drawn before it softens.
  const floors = featuredProjects
    .slice(0, 5)
    .map((project) => {
      const image = bestImageFor(project.slug);
      return image
        ? {
            image,
            alt: project.alt[l],
            title: project.title[l],
            note: project.summary[l],
            meta: [
              { label: l === 'en' ? 'Finish' : 'التشطيب', value: finishLabels[project.finish][l] },
              {
                label: l === 'en' ? 'Setting' : 'الموقع',
                value: settingLabels[project.setting][l],
              },
            ],
            maxWidth: maxImageWidth(image),
          }
        : null;
    })
    .filter((floor): floor is NonNullable<typeof floor> => floor !== null);

  // The hero carries one media object only — the film. The photographs that used to travel
  // through it are not gone from the site: they are the same images the ascent and the
  // projects grid below already draw from, via `bestImageFor`.

  return (
    <>
      {/* Organization + WebSite + Service, cross-linked by @id. See lib/seo/schema.ts. */}
      <JsonLd data={homePageSchema(l)} />

      <Hero locale={l} heroAsset={heroAsset} />
      <Proof locale={l} />
      <Ascent floors={floors} eyebrow={ascent.eyebrow[l]} heading={ascent.heading[l]} locale={l} />
      <PanoramaStory locale={l} />
      <SelectedProjects locale={l} />
      <HomeProcess locale={l} />
      <MediaStories locale={l} />
      <SocialProof locale={l} />
      <InspectionCta locale={l} />
    </>
  );
}
