import { Reveal } from '@/components/motion/reveal';
import { ProcessSequence, type ProcessStage } from '@/components/sections/process-sequence';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { process as processContent } from '@/content/home';
import { getProject } from '@/content/projects';
import type { Locale } from '@/i18n/config';
import { allImages } from '@/lib/media';

/**
 * The process, on the homepage.
 *
 * ── What this replaces ──────────────────────────────────────────────────────
 * A two-column text list: six headings on the left, six sentences on the right, no media, and
 * a long empty tail beneath the last row. Measured, it was the emptiest screen on the page at
 * 21% coverage — a whole viewport of type on cream.
 *
 * It now uses the same `ProcessSequence` as the process page, so each stage carries a real
 * photograph and the section is half media instead of all text. Sharing the component also
 * means the homepage preview and the full page cannot drift apart.
 */
export function HomeProcess({ locale }: { locale: Locale }) {
  const steps = processContent.steps[locale];

  const onSite = allImages.filter((i) => i.role === 'process');
  const finished = allImages.filter((i) => i.role === 'gallery' || i.role === 'hero-still');
  const pick = (list: typeof onSite, index: number) => list[index % Math.max(1, list.length)];

  // Discovery and handover show a finished car; the middle stages show the work itself.
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
      id: `home-stage-${index + 1}`,
      title: step.title,
      body: step.body,
      media: image
        ? {
            src: image.src,
            alt: project?.alt[locale] ?? step.title,
            orientation: image.orientation,
          }
        : null,
    };
  });

  return (
    <section className="py-20 lg:py-28">
      <Container width="wide">
        <Reveal>
          <SectionHeading
            eyebrow={processContent.eyebrow[locale]}
            title={processContent.heading[locale]}
            lede={processContent.lede[locale]}
          />
        </Reveal>

        <div className="mt-12 lg:mt-16">
          <ProcessSequence stages={stages} locale={locale} headingLevel="h3" />
        </div>
      </Container>
    </section>
  );
}
