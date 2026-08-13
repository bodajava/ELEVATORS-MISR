import type { Locale } from '@/i18n/config';

/**
 * The hero's instrument layer.
 *
 * The review's complaint was that the hero read as empty — a band of nothing above the
 * wordmark and another below it. The answer is not more padding or a bigger headline; it is
 * to put something true in those bands.
 *
 * Everything here is drawn from the subject: a floor indicator running down the side, a
 * measurement rail along the bottom, corner crosshairs, and a live status dot. It is the
 * instrumentation of a lift, used as page furniture — which is why it can fill space without
 * reading as decoration.
 *
 * All of it is `aria-hidden`: it is atmosphere, and none of it states a fact a screen-reader
 * user would otherwise miss. The specification labels deliberately carry no numbers, because
 * no load, speed or travel figures have been verified for any installation.
 */

const FLOORS = ['05', '04', '03', '02', '01'];

export function HeroInstruments({ locale }: { locale: Locale }) {
  const isRtl = locale === 'ar';

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 select-none">
      {/* ---- corner crosshairs: the frame's registration marks ------------- */}
      {(
        [
          ['top-0 start-0', 'origin-top-left'],
          ['top-0 end-0 rotate-90', 'origin-top-right'],
          ['bottom-0 start-0 -rotate-90', 'origin-bottom-left'],
          ['bottom-0 end-0 rotate-180', 'origin-bottom-right'],
        ] as const
      ).map(([pos], i) => (
        <span key={i} className={`absolute ${pos} size-5 lg:size-7`}>
          <span className="absolute start-0 top-0 h-px w-full bg-rule-strong" />
          <span className="absolute start-0 top-0 h-full w-px bg-rule-strong" />
        </span>
      ))}

      {/* ---- floor indicator: a lift's position display, run vertically ---- */}
      {/* Hidden below lg: on a phone this column would eat width the wordmark needs. */}
      <div
        className={`absolute top-1/2 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex ${
          isRtl ? 'end-2' : 'start-2'
        }`}
      >
        {FLOORS.map((floor, i) => {
          // Floor 03 is "current" — the one lit in orange. A single lit marker reads as a
          // position readout; several lit markers read as a colour scheme.
          const isCurrent = i === 2;
          return (
            <span key={floor} className="flex items-center gap-2">
              <span
                className={
                  isCurrent
                    ? 'size-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)]'
                    : 'size-1.5 rounded-full bg-ink/15'
                }
              />
              <span
                className={`font-mono text-[0.6rem] tabular-nums ${
                  isCurrent ? 'text-accent-text' : 'text-ink/25'
                }`}
                dir="ltr"
              >
                {floor}
              </span>
            </span>
          );
        })}
        {/* the shaft line the markers sit on */}
        <span className="absolute inset-y-[-1.5rem] start-[0.1875rem] -z-10 w-px bg-gradient-to-b from-transparent via-rule to-transparent" />
      </div>

      {/* ---- measurement rail along the bottom ----------------------------- */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto w-full max-w-page px-(--gutter)">
          <div className="relative h-6">
            {/* ticks: every 5th is long, like a rule */}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between">
              {Array.from({ length: 41 }).map((_, i) => (
                <span
                  key={i}
                  className={i % 5 === 0 ? 'w-px bg-rule-strong' : 'w-px bg-rule'}
                  style={{ height: i % 5 === 0 ? 10 : 5 }}
                />
              ))}
            </div>
            <span className="absolute inset-x-0 bottom-0 h-px bg-rule" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The specification rail — the labelled strip under the wordmark.
 *
 * Not `aria-hidden`: unlike the crosshairs these are real, verified statements (specialism,
 * coverage, and the pricing position), so they are worth reading aloud. They also stop the
 * bottom of the hero being a blank band before the copy animates in.
 */
export function HeroSpecRail({ locale }: { locale: Locale }) {
  const items =
    locale === 'en'
      ? [
          { k: 'Type', v: 'Panorama only' },
          // Widened from "Egypt-wide" on the owner's instruction, 2026-08-12.
          { k: 'Coverage', v: 'Across the Arab world' },
          { k: 'Quoting', v: 'After inspection' },
        ]
      : [
          { k: 'التخصص', v: 'بانوراما فقط' },
          { k: 'النطاق', v: 'على مستوى الوطن العربي' },
          { k: 'التسعير', v: 'بعد المعاينة' },
        ];

  return (
    <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
      <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        {items.map((item) => (
          <div key={item.k} className="flex items-baseline gap-2">
            <dt className="annotation">{item.k}</dt>
            <dd className="font-mono text-[0.6875rem] tracking-wide text-ink">{item.v}</dd>
          </div>
        ))}
      </dl>
      {/* Outside the list, and not by accident. "Booking inspections" is a status, not a term
          with a definition, and it was sitting in the <dl> as a fourth <div> holding two
          spans and no dt/dd pair. A definition list may only contain dt/dd groups (a <div>
          wrapper is allowed, but only around such a group), so this both misdescribed the
          content and broke the list for anything reading the accessibility tree — a screen
          reader announcing an item count, or an agent parsing the page. */}
      <p className="flex items-center gap-2">
        {/* The one animated element in the layer: a slow pulse, not a loop that demands
            attention. Suppressed entirely under reduced motion by the global rule. */}
        <span aria-hidden className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 [animation-duration:2.8s]" />
          <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
        </span>
        <span className="annotation text-accent-text">
          {locale === 'en' ? 'Booking inspections' : 'نستقبل طلبات المعاينة'}
        </span>
      </p>
    </div>
  );
}
