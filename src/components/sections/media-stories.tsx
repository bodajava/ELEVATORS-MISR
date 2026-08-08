import { AmbientVideo } from '@/components/media/ambient-video';
import { Reveal } from '@/components/motion/reveal';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { mediaSection } from '@/content/home';
import { getProject } from '@/content/projects';
import type { Locale } from '@/i18n/config';
import { maxVideoWidth, verticalWalkthroughs } from '@/lib/media';

/**
 * Walkthrough films.
 *
 * Each film plays itself, silently, once it is actually on screen, and stops when it scrolls
 * away. Nothing is downloaded until a clip is within 400px of the viewport, so arriving at
 * the top of the page costs no video bytes at all.
 *
 * The frames are deliberately modest. These clips are 624x832 — capping each card near half
 * that width is the difference between "shot on site" and "pixelated", and it is why this is
 * a two-up editorial row rather than the full-width panels it used to be.
 *
 * These are walkthroughs of finished installations rather than advertisements. The Arabic
 * presenter films originally planned for this slot are excluded in the media pipeline because
 * both cut to third-party-branded footage mid-film.
 */
export function MediaStories({ locale }: { locale: Locale }) {
  const films = verticalWalkthroughs();
  if (films.length === 0) return null;

  return (
    <section className="py-20 lg:py-28">
      <Container width="wide">
        <SectionHeading
          eyebrow={mediaSection.eyebrow[locale]}
          title={mediaSection.heading[locale]}
          lede={mediaSection.lede[locale]}
        />

        <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:max-w-3xl">
          {films.map((video, index) => {
            const project = getProject(video.projectSlug);
            const label = project
              ? project.title[locale]
              : locale === 'en'
                ? 'Walkthrough of a finished installation'
                : 'جولة داخل عمل منفَّذ';

            return (
              <Reveal as="li" key={video.id} delay={0.06 * index}>
                <div
                  className="aperture aspect-3/4 w-full"
                  style={{ maxWidth: `${maxVideoWidth(video)}px` }}
                >
                  <AmbientVideo video={video} label={label} />
                </div>

                <div className="mt-5 flex items-baseline justify-between gap-4 pt-3 rule-t">
                  <span className="annotation">{mediaSection.filmNote[locale]}</span>
                  <span className="numeric annotation" dir="ltr">
                    {Math.round(video.durationSeconds)}s
                  </span>
                </div>
                <p className="mt-3 text-lg text-ink">{label}</p>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
