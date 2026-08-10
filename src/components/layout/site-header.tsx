import { getTranslations } from 'next-intl/server';

import { BrandMark } from '@/components/layout/brand-mark';
import { HeaderShell } from '@/components/layout/header-shell';
import { DesktopNav } from '@/components/navigation/desktop-nav';
import { LanguageSwitcher } from '@/components/navigation/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { MobileNav } from '@/components/navigation/mobile-nav';
import { Magnetic } from '@/components/motion/magnetic';
import { Button, CtaArrow } from '@/components/ui/button';
import { primaryCta } from '@/content/navigation';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';

/**
 * Site header — a Server Component.
 *
 * Only the pieces that genuinely need browser state are client components: the scroll-aware
 * shell, the nav (for the active route), the language switcher and the mobile dialog. The
 * header itself, the brand mark and the CTA stay on the server.
 */
export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations('nav');
  const tCta = await getTranslations('cta');

  return (
    <HeaderShell>
      <div className="flex w-full items-center justify-between gap-6">
        <Link
          href="/"
          aria-label={t('brandHome')}
          className="rounded-(--radius-control) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          <BrandMark locale={locale} />
        </Link>

        <DesktopNav />

        {/* Tighter gaps below `sm`: at 320px the row is a badge, three controls and a menu
            button, and a 12px gap between each of them overflowed the gutter. */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Both language controls ship; only one is ever visible. The full pair needs room
              the phone header does not have, and dropping it there entirely left changing
              language behind the hamburger — see the `compact` note in LanguageSwitcher. */}
          <LanguageSwitcher locale={locale} compact className="sm:hidden" />
          <LanguageSwitcher locale={locale} className="hidden sm:flex" />
          <ThemeToggle locale={locale} />
          <Magnetic className="hidden sm:inline-flex">
            <Button asChild variant="primary" size="sm">
              <Link href={primaryCta.href}>
                {tCta('requestInspectionShort')}
                <CtaArrow />
              </Link>
            </Button>
          </Magnetic>
          <MobileNav locale={locale} />
        </div>
      </div>
    </HeaderShell>
  );
}
