import { getTranslations } from 'next-intl/server';

import { BrandMark } from '@/components/layout/brand-mark';
import { DrawnRule } from '@/components/motion/drawn-rule';
import { Magnetic } from '@/components/motion/magnetic';
import { LanguageSwitcher } from '@/components/navigation/language-switcher';
import { Button, CtaArrow } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { brand, hasContact, unconfirmed, verified } from '@/content/company';
import { legalNav, primaryCta, primaryNav } from '@/content/navigation';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';

/**
 * Site footer — the page's closing composition, not a link dump.
 *
 * It is a carbon block that the cream page curves down into, and it is built around one
 * sentence: an invitation to have someone come and look at the building. That invitation is
 * set at display size and the orange CTA sits directly under it, because this is the last
 * chance the page gets to produce the only conversion that matters.
 *
 * ── Contact policy, enforced here ──────────────────────────────────────────
 * The permitted contact paths are a closed list of four: the concierge, the in-site human
 * follow-up form, a site-inspection request, and — only once a number is confirmed — a phone
 * call. This component therefore renders **no email address**: a `mailto:` block was
 * previously here and it was outside the permitted list. There is no WhatsApp affordance, no
 * social DM, and no third-party chat widget. Social links appear only when confirmed
 * accounts exist, and none do, so nothing is rendered for them.
 *
 * Nothing falls back to a placeholder. An omitted block is correct; an empty `tel:` is not.
 * No response time is promised anywhere in this component.
 */
export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');
  const tCta = await getTranslations('cta');

  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-24 curve-t bg-carbon text-ink-on-dark">
      <Container width="full" className="py-20 lg:py-28">
        {/* ---- the invitation ------------------------------------------- */}
        <div className="grid gap-10 lg:grid-cols-[1.4fr_auto] lg:items-end">
          <div>
            <p className="annotation text-accent">{tCta('requestInspection')}</p>
            <h2 className="mt-6 max-w-[14ch] text-4xl text-ink-on-dark sm:text-5xl lg:text-6xl">
              {t('invitation')}
            </h2>
            <p className="mt-6 max-w-[48ch] text-base text-ink-2-on-dark">{t('invitationBody')}</p>
          </div>

          <Magnetic>
            <Button asChild variant="primaryOnDark" size="lg">
              <Link href={primaryCta.href}>
                {tCta('requestInspectionShort')}
                <CtaArrow />
              </Link>
            </Button>
          </Magnetic>
        </div>

        <DrawnRule className="mt-16" />

        {/* ---- the plate ------------------------------------------------- */}
        <div className="mt-16 grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          <div className="flex flex-col gap-7">
            <BrandMark tone="dark" size="large" />
            <p className="max-w-[32ch] text-sm text-ink-2-on-dark">{t('tagline')}</p>
            <p className="max-w-[40ch] text-xs text-ink-2-on-dark">{t('noPricingNote')}</p>
            <LanguageSwitcher locale={locale} tone="dark" />
          </div>

          <nav aria-labelledby="footer-explore">
            <h2 id="footer-explore" className="annotation text-ink-2-on-dark">
              {t('navHeading')}
            </h2>
            <ul className="mt-5 flex flex-col">
              {primaryNav.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="duration-fast inline-flex min-h-11 items-center text-sm text-ink-on-dark transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {tNav(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="annotation text-ink-2-on-dark">
              {t('legalHeading')}
            </h2>
            <ul className="mt-5 flex flex-col">
              {legalNav.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="duration-fast inline-flex min-h-11 items-center text-sm text-ink-on-dark transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {tNav(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-8">
            {/* Egypt-wide service statement, from the verified coverage list. */}
            <div>
              <h2 className="annotation text-ink-2-on-dark">{t('coverageHeading')}</h2>
              <p className="mt-5 text-sm text-ink-on-dark">
                {verified.coverage.map((a) => a[locale]).join(' · ')}
              </p>
            </div>

            {/* The phone path ships only once a real number exists. Until then this block
                does not render at all — no placeholder, no "coming soon". */}
            {hasContact('phone') ? (
              <div>
                <h2 className="annotation text-ink-2-on-dark">{t('contactHeading')}</h2>
                <a
                  href={`tel:${unconfirmed.phone}`}
                  className="duration-fast mt-4 inline-flex min-h-11 items-center text-base text-ink-on-dark transition-colors hover:text-accent"
                >
                  <span dir="ltr" className="numeric">
                    {unconfirmed.phone}
                  </span>
                </a>
              </div>
            ) : (
              <div>
                <h2 className="annotation text-ink-2-on-dark">{t('contactHeading')}</h2>
                <p className="mt-4 max-w-[34ch] text-sm text-ink-2-on-dark">
                  {t('contactUnavailable')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---- concierge entry point, on glass ---------------------------- */}
        <div className="mt-16 flex flex-col gap-5 rounded-(--radius-card) glass-dark p-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg text-ink-on-dark">{t('conciergeHeading')}</p>
            <p className="mt-2 max-w-[52ch] text-sm text-ink-2-on-dark">{t('conciergeBody')}</p>
          </div>
          <Button asChild variant="onDark" size="md">
            <Link href="/contact">{tCta('askConcierge')}</Link>
          </Button>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-rule-on-dark pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-2-on-dark">
            <span className="numeric">© {year}</span>{' '}
            <span lang="ar" dir="rtl">
              {brand.nameAr}
            </span>{' '}
            · {brand.name}. {t('rights')}
          </p>
          <p className="annotation text-ink-2-on-dark">
            <span className="numeric" dir="ltr" lang="en">
              C.R. {brand.commercialRegistration}
            </span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
