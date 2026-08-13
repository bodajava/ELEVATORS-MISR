import {
  FilmCarousel,
  LANDSCAPE_ASPECT,
  LANDSCAPE_CARD_HEIGHT,
  type CarouselFilm,
} from '@/components/media/film-carousel';
import { Reveal } from '@/components/motion/reveal';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { mediaSection } from '@/content/home';
import { finishLabels, getProject } from '@/content/projects';
import { getDirection, type Locale } from '@/i18n/config';
import { productFilms } from '@/lib/media';

/**
 * Project films.
 *
 * ── One slider, not two ─────────────────────────────────────────────────────
 * This was a self-travelling marquee — a band of footage sliding past on a CSS animation —
 * while the Marketing Films section above it was a stepped carousel. Two rails, two gestures,
 * two sets of controls, on one page. On the owner's instruction (2026-08-12) both are now the
 * same `FilmCarousel`: same chrome, same dots, same pause control, same auto-advance, same
 * hover-to-play. The only thing that differs is the frame height, because these are 16:9
 * walkthroughs and those are 9:16 pieces to camera.
 *
 * `FilmMarquee` was deleted with this change — this section was its only caller.
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

  // Resolved here, on the server. The rail receives strings, never callbacks — a server
  // component cannot hand a function across the client boundary.
  const strip: CarouselFilm[] = films.map((film, index) => {
    const project = getProject(film.projectSlug);
    return {
      video: film,
      label: project
        ? project.alt[locale]
        : locale === 'en'
          ? 'Walkthrough of a finished panorama elevator installation'
          : 'جولة داخل تركيب مصعد بانوراما منفَّذ',
      title: project ? project.title[locale] : locale === 'en' ? 'On site' : 'في الموقع',
      // The finish, which is verified from the photograph. Where a clip is not tied to a
      // project there is no verified finish, so the badge states what the file is instead —
      // never an invented category.
      badge: project ? finishLabels[project.finish][locale] : locale === 'en' ? 'Film' : 'فيلم',
      // Facts about the file. Nothing is claimed about the project that is not already known.
      meta: `${String(index + 1).padStart(2, '0')} · ${Math.round(film.durationSeconds)}s`,
      expandLabel:
        locale === 'en'
          ? `Watch: ${project ? project.title.en : 'on site'}`
          : `شاهد: ${project ? project.title.ar : 'في الموقع'}`,
    };
  });

  // Plain strings only. Everything crossing into the client component must serialise —
  // a callback here is what took the homepage down with "Functions cannot be passed
  // directly to Client Components".
  const labels =
    locale === 'en'
      ? {
          group: 'Project films',
          slide: 'film',
          pause: 'Pause',
          play: 'Play',
          watch: 'Watch',
          close: 'Close the film',
          previous: 'Previous film',
          next: 'Next film',
          goTo: 'Show film',
        }
      : {
          group: 'أفلام المشروعات',
          slide: 'فيلم',
          pause: 'إيقاف',
          play: 'تشغيل',
          watch: 'شاهد',
          close: 'إغلاق الفيلم',
          previous: 'الفيلم السابق',
          next: 'الفيلم التالي',
          goTo: 'اعرض الفيلم',
        };

  return (
    <section className="py-20 lg:py-28">
      <Container width="wide">
        <SectionHeading
          eyebrow={mediaSection.eyebrow[locale]}
          title={mediaSection.heading[locale]}
          lede={mediaSection.lede[locale]}
        />

        <Reveal>
          {/* The same rail the Marketing Films section uses, on the owner's instruction
              (2026-08-12): one slider design on the homepage rather than two. It advances on
              its own, a card plays on hover where there is a pointer to hover with, and it
              holds at 90% of the container from `lg`.

              The frame height is the landscape one — these are 16:9 walkthroughs, and the
              portrait default would have made each card four times too wide. Everything else
              about the two rails is identical. */}
          <FilmCarousel
            className="mt-12"
            name="projects"
            cardHeight={LANDSCAPE_CARD_HEIGHT}
            aspect={LANDSCAPE_ASPECT}
            films={strip}
            dir={getDirection(locale)}
            labels={labels}
          />
        </Reveal>
      </Container>
    </section>
  );
}
