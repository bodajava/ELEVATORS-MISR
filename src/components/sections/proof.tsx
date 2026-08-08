import { CountUp } from '@/components/motion/count-up';
import { Reveal } from '@/components/motion/reveal';
import { Container } from '@/components/ui/container';
import { verified } from '@/content/company';
import { proof } from '@/content/home';
import type { Locale } from '@/i18n/config';

/**
 * Trust and proof — the page's first carbon section.
 *
 * The hero curves down into this one. It is the deliberate dark anchor the review asked for:
 * after a cream hero full of warm photography, a carbon block gives the eye somewhere to
 * rest and stops the page reading as uniformly pale. The single orange element on it is the
 * ratio bar, because that is the number the section exists to communicate.
 *
 * The figures are shown as a ratio, not one headline number, because that is what the source
 * document supports: 51 of 213 records are classified panorama, and a record is not a unit.
 * The wording is fixed in src/content/home.ts and must not be paraphrased.
 *
 * No client logos, no certifications, no ratings — none of those are verified.
 */
export function Proof({ locale }: { locale: Locale }) {
  const pct = Math.round((verified.panoramaClassifiedRecords / verified.projectRecords) * 100);

  return (
    <section className="curve-t curve-b bg-carbon py-20 text-ink-on-dark lg:py-28">
      <Container width="wide">
        <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-24">
          <div>
            <p className="annotation text-accent">{proof.eyebrow[locale]}</p>
            <h2 className="mt-5 max-w-[18ch] text-3xl text-ink-on-dark lg:text-4xl">
              {proof.heading[locale]}
            </h2>
            <div className="mt-8 flex flex-col gap-4">
              {proof.body[locale].map((paragraph, i) => (
                <Reveal key={paragraph} delay={0.06 * i}>
                  <p className="max-w-[52ch] text-base text-ink-2-on-dark">{paragraph}</p>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={0.1}>
            <div className="border-t border-rule-on-dark pt-8">
              <p className="flex items-baseline gap-4">
                <CountUp
                  to={verified.panoramaClassifiedRecords}
                  dir="ltr"
                  className="numeric font-display text-7xl leading-none text-accent"
                />
                <span className="numeric annotation text-ink-2-on-dark" dir="ltr">
                  / {verified.projectRecords}
                </span>
              </p>

              <p className="mt-5 max-w-[30ch] text-base text-ink-on-dark">
                {locale === 'en'
                  ? 'records classified panorama'
                  : 'سجلًا مصنفًا ضمن مصاعد البانوراما'}
              </p>
              <p className="mt-2 max-w-[38ch] text-sm text-ink-2-on-dark">
                {locale === 'en'
                  ? `of ${verified.projectRecords} project records in the ${verified.recordYear} work log`
                  : `من ${verified.projectRecords} سجل مشروع في سجل أعمال ${verified.recordYear}`}
              </p>

              {/* The proportion drawn as a filled segment of a hairline. Not colour alone —
                  the figures above carry the same information. */}
              <div
                className="mt-8 h-0.5 w-full bg-rule-on-dark"
                role="img"
                aria-label={`${verified.panoramaClassifiedRecords} of ${verified.projectRecords}`}
              >
                <div className="h-0.5 bg-accent" style={{ width: `${pct}%` }} />
              </div>

              <div className="mt-12">
                <p className="annotation text-ink-2-on-dark">{proof.coverageLabel[locale]}</p>
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                  {verified.coverage.map((area) => (
                    <li key={area.en} className="text-sm text-ink-on-dark">
                      {area[locale]}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
