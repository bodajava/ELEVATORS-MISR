import { getTranslations } from 'next-intl/server';

import { Magnetic } from '@/components/motion/magnetic';
import { Reveal } from '@/components/motion/reveal';
import { Button, CtaArrow } from '@/components/ui/button';
import { finalCta } from '@/content/home';
import { primaryCta } from '@/content/navigation';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';

/**
 * Closing call to action.
 *
 * A carbon block under a large curve, carrying the one orange button that this whole page
 * exists to produce. Emphasis comes from the ground inverting and the accent appearing — not
 * from a countdown, scarcity, or a promise about when someone will call back.
 *
 * Calm by construction: no timer, no "limited slots", no response-time promise, no price.
 */
export async function InspectionCta({ locale }: { locale: Locale }) {
  const t = await getTranslations('cta');

  return (
    <section className="px-(--gutter) pb-16 lg:pb-20">
      <Reveal variant="mask" className="mx-auto max-w-page">
        <div className="aperture rounded-(--radius-section-lg) px-6 py-16 sm:px-12 lg:px-20 lg:py-24">
          <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-24">
            <div>
              <h2 className="max-w-[14ch] text-3xl text-balance text-ink-on-dark sm:text-4xl lg:text-5xl">
                {finalCta.heading[locale]}
              </h2>
              <p className="mt-6 max-w-[46ch] text-base text-pretty text-ink-2-on-dark">
                {finalCta.body[locale]}
              </p>
              <p className="mt-4 max-w-[46ch] text-base text-pretty text-ink-2-on-dark">
                {finalCta.collaboration[locale]}
              </p>

              <div className="mt-10">
                <Magnetic>
                  <Button asChild variant="primaryOnDark" size="lg">
                    <Link href={primaryCta.href}>
                      {t('requestInspection')}
                      <CtaArrow />
                    </Link>
                  </Button>
                </Magnetic>
              </div>
            </div>

            <ul className="flex flex-col">
              {finalCta.reassurance[locale].map((line, index) => (
                <li
                  key={line}
                  className="flex gap-5 border-t border-rule-on-dark py-4 text-sm text-ink-2-on-dark"
                >
                  <span className="numeric shrink-0 annotation text-accent-on-dark" dir="ltr">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
