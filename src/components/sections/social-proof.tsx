import { PhotoFan, type FanPhoto } from '@/components/media/photo-fan';
import { Magnetic } from '@/components/motion/magnetic';
import { Reveal } from '@/components/motion/reveal';
import { Button, CtaArrow } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { socialProof } from '@/content/home';
import { getDirection, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { socialProofImages } from '@/lib/media';

/**
 * Social proof — the prints from handover day.
 *
 * Deliberately restrained about what it claims. The company has authorised this material, but:
 *  - nobody is named, because no names or approved wording were supplied;
 *  - no endorsement is claimed, stated or implied;
 *  - no quotes, roles or titles are invented;
 *  - frames with no elevator are excluded upstream in the media pipeline, since a photograph
 *    of people in a room is not evidence of our work.
 *
 * The alt text describes the setting and the elevator, not the individuals.
 *
 * ── What changed, and why ───────────────────────────────────────────────────
 * This was a heading, a lede and four tiles in a row: honest, and completely inert. The frames
 * are now a fanned pile of prints the visitor can pick up (`PhotoFan`), and the column beside
 * them says what the photographs are and — just as importantly — what they are not. The three
 * notes are the section's restraint made visible rather than left as a caveat nobody reads.
 *
 * The photographs keep their own aspect ratios inside the prints, so nothing is cropped to fit
 * a shared box. These four sources are 1280x960, 960x1280, 1280x960 and 1130x1198.
 */
export function SocialProof({ locale }: { locale: Locale }) {
  const images = socialProofImages();
  if (images.length === 0) return null;

  const photos: FanPhoto[] = images.map((image) => ({
    id: image.id,
    src: image.src,
    width: image.width,
    height: image.height,
    blurDataURL: image.blurDataURL,
    alt:
      locale === 'en'
        ? 'Visitors photographed at a completed panorama elevator installation.'
        : 'زائرون في صورة التُقطت عند مصعد بانوراما منفَّذ.',
  }));

  return (
    <section className="curve-t curve-b bg-paper-sunken py-20 lg:py-24">
      <Container width="wide">
        <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-28">
            <SectionHeading
              eyebrow={socialProof.eyebrow[locale]}
              title={socialProof.heading[locale]}
              lede={socialProof.lede[locale]}
            />

            {/* What the photographs are, and what they are not. A definition list, because
                that is exactly what this is — term and statement, not marketing lines. */}
            <dl className="mt-10 flex flex-col">
              {socialProof.notes[locale].map((note, index) => (
                <Reveal key={note.term} delay={0.05 * index}>
                  <div className="flex flex-col gap-1 border-t border-rule py-4 sm:flex-row sm:gap-6">
                    <dt className="shrink-0 annotation text-accent-text sm:w-28">{note.term}</dt>
                    <dd className="max-w-[46ch] text-sm text-ink-2">{note.detail}</dd>
                  </div>
                </Reveal>
              ))}
            </dl>

            <Magnetic className="mt-10 inline-block">
              <Button asChild variant="secondary">
                <Link href="/contact">
                  {locale === 'en' ? 'Request a site inspection' : 'اطلب معاينة الموقع'}
                  <CtaArrow />
                </Link>
              </Button>
            </Magnetic>
          </div>

          <Reveal delay={0.08}>
            <PhotoFan
              photos={photos}
              dir={getDirection(locale)}
              hint={socialProof.hint[locale]}
              className="lg:mt-6"
            />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
