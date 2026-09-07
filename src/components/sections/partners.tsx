import { Reveal } from '@/components/motion/reveal';
import { Container } from '@/components/ui/container';
import { NameRail, type RailItem } from '@/components/ui/name-rail';
import { SectionHeading } from '@/components/ui/section-heading';
import { contractors, designStudios, partnersSection } from '@/content/partners';
import type { Locale } from '@/i18n/config';

/**
 * The firms our panorama cars are specified by.
 *
 * ── Why a rail of names and not a logo cloud ────────────────────────────────
 * A greyscale logo cloud is the reflex answer to this section, and it is unavailable twice
 * over: no firm on the list has supplied a logo file, and a mark lifted from a profile page is
 * a third-party brand mark — the exact category `docs/asset-inventory.json` holds 14 assets
 * back over. Setting the names as type instead needs no third-party asset at all, and it puts
 * the section in the site's own voice: the annotation-and-rule label above each rail is the
 * label-and-leader-line convention `SectionHeading` already uses, so this reads as a line from
 * a specification schedule rather than a badge wall. If logo files arrive with permission to
 * publish them, `NameRail` takes an optional mark per row and nothing else here changes.
 *
 * ── Two rails, two directions ───────────────────────────────────────────────
 * The split is not decoration: a design house specifies the car and a contractor installs it,
 * which are two different relationships. Opposite directions keep them reading as two sets
 * rather than one list that happened to wrap, and the contractors' rail runs slower because it
 * is the shorter list — matching the durations would make the short rail visibly faster.
 *
 * ── What this section does not claim ────────────────────────────────────────
 * No count, no "trusted by", no endorsement, no ranking, no follower figure, and no project,
 * building, owner or address against any name. The lede says what is published and where it
 * stops. No price and no response time, as everywhere else.
 */
export function Partners({ locale }: { locale: Locale }) {
  const studios: RailItem[] = designStudios.map((partner) => ({
    id: partner.id,
    name: partner.name[locale],
  }));
  const firms: RailItem[] = contractors.map((partner) => ({
    id: partner.id,
    name: partner.name[locale],
  }));

  if (studios.length === 0 && firms.length === 0) return null;

  const t = partnersSection;

  return (
    <section className="curve-t curve-b bg-paper-sunken py-20 lg:py-28">
      {/* The heading is held inside the container; the rails run past it to the viewport
          edge, because a list that continues off-screen is the point. */}
      <Container width="wide">
        <SectionHeading
          eyebrow={t.eyebrow[locale]}
          title={t.heading[locale]}
          lede={t.lede[locale]}
        />
      </Container>

      <div className="mt-14 flex flex-col gap-10 lg:mt-16 lg:gap-12">
        <Reveal>
          <div>
            <Container width="wide">
              <p className="pt-3 annotation rule-t">{t.studiosLabel[locale]}</p>
            </Container>
            <NameRail
              items={studios}
              label={t.studiosRail[locale]}
              durationSeconds={78}
              className="mt-6"
            />
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div>
            <Container width="wide">
              <p className="pt-3 annotation rule-t">{t.contractorsLabel[locale]}</p>
            </Container>
            <NameRail
              items={firms}
              label={t.contractorsRail[locale]}
              reverse
              durationSeconds={56}
              className="mt-6"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
