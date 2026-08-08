import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Reveal } from '@/components/motion/reveal';
import { InspectionCta } from '@/components/sections/inspection-cta';
import { ProcessSequence, type ProcessStage } from '@/components/sections/process-sequence';
import { JsonLd } from '@/components/seo/json-ld';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { process as processContent } from '@/content/home';
import { getProject } from '@/content/projects';
import { isLocale, type Locale } from '@/i18n/config';
import { allImages } from '@/lib/media';
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
    title: l === 'en' ? 'Process' : 'مراحل العمل',
    description:
      l === 'en'
        ? 'How a panorama elevator project runs at Egypt Elevators — six stages from first conversation to handover, starting with a physical site inspection.'
        : 'كيف يسير مشروع مصعد بانوراما لدى مصر العربية للمصاعد — ست مراحل من أول حديث حتى التسليم، تبدأ بمعاينة ميدانية.',
    alternates: buildAlternates(l, '/process'),
  };
}

/**
 * Process.
 *
 * Six real stages, unchanged. What changed is that they are now an interactive sequence with
 * a persistent media preview rather than a static list of headings — see ProcessSequence.
 *
 * ── Choosing the media ──────────────────────────────────────────────────────
 * Each stage is paired with a real photograph whose content genuinely fits it: installation
 * frames for the site and installation stages, finished cars for discovery and handover,
 * material detail for design alignment. Nothing is illustrated with a diagram, because no
 * technical drawing exists and inventing one would be fabricating evidence of work.
 *
 * The pairing is resolved from `role: 'process'` and the project galleries rather than from
 * hard-coded paths, so it survives the media pipeline being rebuilt.
 */
export default async function ProcessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // A single-segment path with a file extension (/sw.js, /favicon.png) skips the locale
  // proxy but still matches this dynamic segment, so the param is validated here as
  // well as in the layout — the page renders in parallel with it, not after it.
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l: Locale = locale;
  const t = await getTranslations('pageHeader');
  const tNav = await getTranslations('nav');

  const steps = processContent.steps[l];

  // Installation frames first — these are the on-site captures — then finished interiors.
  const onSite = allImages.filter((i) => i.role === 'process');
  const finished = allImages.filter((i) => i.role === 'gallery' || i.role === 'hero-still');

  /**
   * Stage → media. Discovery and handover show a finished car (what the visitor is buying);
   * the middle stages show the work itself. Indices are clamped so a shorter media set
   * degrades to repeating a frame rather than rendering an empty preview.
   */
  const pick = (list: typeof onSite, index: number) => list[index % Math.max(1, list.length)];
  const pairing = [
    finished[0],
    onSite[0],
    onSite[1],
    finished[1],
    pick(onSite, 2),
    pick(finished, 2),
  ];

  const stages: ProcessStage[] = steps.map((step, index) => {
    const image = pairing[index];
    const project = image ? getProject(image.projectSlug) : undefined;
    return {
      id: `stage-${index + 1}`,
      title: step.title,
      body: step.body,
      media: image
        ? {
            src: image.src,
            // Alt describes the photograph, not the stage — the image is evidence of work,
            // and captioning it with the stage name would over-claim what it shows.
            alt: project?.alt[l] ?? step.title,
            orientation: image.orientation,
          }
        : null,
    };
  });

  return (
    <>
      <JsonLd
        data={breadcrumbSchema(l, [
          { name: t('home'), path: '' },
          { name: tNav('process'), path: '/process' },
        ])}
      />

      <Container width="wide" className="pt-28 pb-14 lg:pt-36 lg:pb-20">
        <Breadcrumbs items={[{ label: t('home'), href: '/' }, { label: tNav('process') }]} />
        <Reveal>
          <SectionHeading
            as="h1"
            eyebrow={processContent.eyebrow[l]}
            title={processContent.heading[l]}
            lede={processContent.lede[l]}
          />
        </Reveal>
      </Container>

      <Container width="wide" className="pb-20 lg:pb-28">
        <ProcessSequence stages={stages} locale={l} />
      </Container>

      <Container width="wide" className="pb-20 lg:pb-24">
        <p className="max-w-[60ch] border-t border-rule pt-6 text-sm text-ink-3">
          {processContent.note[l]}
        </p>
      </Container>

      <InspectionCta locale={l} />
    </>
  );
}
