import { FilmCarousel, PORTRAIT_ASPECT, type CarouselFilm } from '@/components/media/film-carousel';
import { Reveal } from '@/components/motion/reveal';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { marketingFilmsSection } from '@/content/pages';
import { getDirection, type Locale } from '@/i18n/config';
import { marketingFilms } from '@/lib/media';

/**
 * Marketing Films — the company's own advertisements, as a dedicated carousel.
 *
 * ── Every file in the folder, and only those ────────────────────────────────
 * The source is `marketingFilms()`, which selects on the `marketing-film` role and nothing
 * else. There is no `.slice()`, no cap, no orientation filter, no resolution floor and no
 * rights filter in the path between the folder and the rail: whatever is on disk in
 * `assets/VIDOES/MARKTEING-video` is what renders, and
 * `tests/unit/marketing-films.test.ts` compares the two counts directly.
 *
 * ── Why it is separate from the project strip ───────────────────────────────
 * These are pieces to camera: a presenter, a voice track, burned-in Arabic captions and a
 * sales argument. The strip above shows silent walkthroughs of finished installations. One
 * rail carrying both would misrepresent both, and a visitor scrolling quiet architecture does
 * not expect an advertisement to start talking. The two share no file — `productFilms()`
 * excludes this role for exactly that reason.
 *
 * ── They are Arabic-only ────────────────────────────────────────────────────
 * Every one of the four is spoken and captioned in Arabic with no English track. That is said
 * plainly in the section's lede in both locales rather than left for an English visitor to
 * discover after pressing play.
 *
 * ── Rights ──────────────────────────────────────────────────────────────────
 * These were held back through Phase 0 — an identifiable presenter without documented consent,
 * third-party creator credits, third-party B-roll marks — and are published on the owner's
 * explicit instruction, recorded per file in `docs/asset-inventory.json` with the date and who
 * approved it. Nothing was removed from the footage: every watermark, credit and mark ships
 * exactly as it is in the original.
 */
export function MarketingFilms({ locale }: { locale: Locale }) {
  const films = marketingFilms();
  if (films.length === 0) return null;

  const t = marketingFilmsSection;

  // Resolved on the server, to strings. A formatter crossing into a client component is the
  // failure that took the homepage down once already.
  const slides: CarouselFilm[] = films.map((film, index) => ({
    video: film,
    label: t.filmAlt[locale],
    title: t.filmTitle[locale](index + 1),
    // A fact about the file, not a category invented to fill a chip.
    badge: t.badge[locale],
    meta: `${String(index + 1).padStart(2, '0')} · ${Math.round(film.durationSeconds)}s`,
    expandLabel: t.expand[locale](index + 1),
  }));

  return (
    <section className="py-20 lg:py-24" aria-labelledby="marketing-films">
      <Container width="wide">
        <Reveal>
          <SectionHeading
            id="marketing-films"
            as="h2"
            eyebrow={t.eyebrow[locale]}
            title={t.heading[locale]}
            lede={t.lede[locale]}
          />
        </Reveal>

        <Reveal>
          <FilmCarousel
            className="mt-12"
            name="marketing"
            aspect={PORTRAIT_ASPECT}
            films={slides}
            dir={getDirection(locale)}
            labels={t.controls[locale]}
          />
        </Reveal>
      </Container>
    </section>
  );
}
