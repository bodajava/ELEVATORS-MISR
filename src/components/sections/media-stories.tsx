import { FilmSlider, type FilmSlide } from '@/components/media/film-slider';
import { Reveal } from '@/components/motion/reveal';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { mediaSection } from '@/content/home';
import { getProject } from '@/content/projects';
import { getDirection, type Locale } from '@/i18n/config';
import { productFilms } from '@/lib/media';

/**
 * Project films.
 *
 * ── The defect this replaces ────────────────────────────────────────────────
 * This section used to call `verticalWalkthroughs()` — `detail-video` **and** portrait — which
 * resolved to **two** clips. The site owns sixteen video originals and it looked as though the
 * pipeline were failing.
 *
 * It was not. Six rights-clear films had no destination, so the media build never generated
 * derivatives for them: `SHIPPABLE_ROLES` in scripts/build-media.mjs is a *destination*
 * whitelist, and `optional` / `hero-video-primary` / `hero-video-alt` were not on it. Giving
 * them a destination — this section — took the shipping set from 3 to 9.
 *
 * ── What is still not here, and why ─────────────────────────────────────────
 * Four originals remain excluded, on rights grounds rather than presentation grounds, and no
 * layout change can include them:
 *
 *   · two Arabic presenter advertisements — an identifiable person with no publication
 *     consent, and both cut to third-party-branded B-roll partway through;
 *   · one carrying `@solephiworks` / `@mohamedm` creator credits;
 *   · one at 360x640, below anything shippable.
 *
 * Those are Phase-0 decisions and they hold until the company supplies written rights and
 * consent. See `docs/media-usage-manifest.md`.
 */
export function MediaStories({ locale }: { locale: Locale }) {
  const films = productFilms();
  if (films.length === 0) return null;

  // Resolved here, on the server. The slider receives strings, never callbacks — a server
  // component cannot hand a function across the client boundary.
  const slides: FilmSlide[] = films.map((film, index) => {
    const project = getProject(film.projectSlug);
    return {
      video: film,
      label: project
        ? project.alt[locale]
        : locale === 'en'
          ? 'Walkthrough of a finished panorama elevator installation'
          : 'جولة داخل تركيب مصعد بانوراما منفَّذ',
      title: project ? project.title[locale] : locale === 'en' ? 'On site' : 'في الموقع',
      // Index and duration, in the annotation register. Both are facts about the file —
      // nothing is claimed about the project that is not already verified.
      meta: `${String(index + 1).padStart(2, '0')} · ${Math.round(film.durationSeconds)}s`,
      dotLabel:
        locale === 'en'
          ? `Show film ${index + 1} of ${films.length}`
          : `اعرض الفيلم ${index + 1} من ${films.length}`,
    };
  });

  // Plain strings only. Everything crossing into the client component must serialise —
  // a callback here is what took the homepage down with "Functions cannot be passed
  // directly to Client Components".
  const labels =
    locale === 'en'
      ? { carousel: 'carousel', slide: 'slide', group: 'Project films' }
      : { carousel: 'شريط عرض', slide: 'شريحة', group: 'أفلام المشروعات' };

  return (
    <section className="py-20 lg:py-28">
      <Container width="wide">
        <SectionHeading
          eyebrow={mediaSection.eyebrow[locale]}
          title={mediaSection.heading[locale]}
          lede={mediaSection.lede[locale]}
        />

        <Reveal>
          <FilmSlider
            className="mt-12"
            slides={slides}
            dir={getDirection(locale)}
            labels={labels}
          />
        </Reveal>
      </Container>
    </section>
  );
}
