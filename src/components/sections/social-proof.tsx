import { ProjectImage } from '@/components/media/project-image';
import { Reveal } from '@/components/motion/reveal';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { socialProof } from '@/content/home';
import type { Locale } from '@/i18n/config';
import { socialProofImages } from '@/lib/media';

/**
 * Social proof.
 *
 * Deliberately restrained. The company has authorised this material, but:
 *  - nobody is named, because no names or approved wording were supplied;
 *  - no endorsement is claimed, stated or implied;
 *  - no quotes, roles or titles are invented;
 *  - frames with no elevator are excluded upstream in the media pipeline, since a photograph
 *    of people in a room is not evidence of our work.
 *
 * The alt text describes the setting and the elevator, not the individuals.
 *
 * **Each frame keeps its own orientation.** These four sources are 1280x960, 960x1280,
 * 1280x960 and 1130x1198 — three different shapes. Forcing them all into one 4:5 box meant
 * cropping a third off both landscape frames, which is what made this row look
 * "unart-directed". A ragged bottom edge is the correct answer here: it is an editorial
 * contact sheet, not a tile grid.
 */
export function SocialProof({ locale }: { locale: Locale }) {
  const images = socialProofImages();
  if (images.length === 0) return null;

  return (
    <section className="curve-t curve-b bg-paper-sunken py-20 lg:py-24">
      <Container width="wide">
        <SectionHeading
          eyebrow={socialProof.eyebrow[locale]}
          title={socialProof.heading[locale]}
          lede={socialProof.lede[locale]}
        />

        {/* A contact sheet, not a matrix: each frame keeps its own aspect ratio and the row
            hangs from a shared top line, so the bottom edge is deliberately ragged. Marked so
            the grid-gap detector treats it as the exception it is rather than skipping it by
            accident — everything else on the site owes its rows a level bottom. */}
        <ul
          data-ragged="contact-sheet"
          className="mt-12 grid grid-cols-2 items-start gap-5 sm:gap-7 lg:grid-cols-4"
        >
          {images.map((image, index) => (
            <Reveal as="li" key={image.id} delay={0.05 * index}>
              <div
                className="aperture w-full aperture-mask"
                // The source's own ratio, so nothing is cropped to fit a grid.
                style={{ aspectRatio: `${image.width} / ${image.height}` }}
              >
                <ProjectImage
                  image={image}
                  alt={
                    locale === 'en'
                      ? 'Visitors photographed at a completed panorama elevator installation.'
                      : 'زائرون في صورة التُقطت عند مصعد بانوراما منفَّذ.'
                  }
                  // Matches the real slot: two-up on phones, four-up from lg in a wide
                  // container. The previous flat `200px` under-requested and the browser
                  // upscaled a 256px file into a 280px box.
                  sizes="(max-width: 640px) 44vw, (max-width: 1024px) 30vw, 300px"
                />
              </div>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
