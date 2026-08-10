import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';

import { Concierge } from '@/components/concierge/concierge';
import { AmbientField } from '@/components/motion/ambient-field';
import { SmoothScroll } from '@/components/motion/smooth-scroll';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { themeScript } from '@/components/ui/theme-toggle';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { brand, siteUrl } from '@/content/company';
import { getDirection, localeTags, locales, openGraphLocales, type Locale } from '@/i18n/config';
import { routing } from '@/i18n/routing';
import { conciergeAvailability } from '@/lib/concierge/provider';
import { fontVariables } from '@/lib/fonts';

import '../globals.css';

/** Both locales prerender statically. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f5' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1b18' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  // Never disable zoom — pinch-zoom is an accessibility requirement.
  maximumScale: 5,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t('defaultTitle'),
      template: `%s · ${brand.name}`,
    },
    description: t('defaultDescription'),
    applicationName: brand.name,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [localeTags[l], `/${l}`])),
        'x-default': `/${routing.defaultLocale}`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: brand.name,
      title: t('defaultTitle'),
      description: t('defaultDescription'),
      url: `/${locale}`,
      locale: openGraphLocales[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => openGraphLocales[l]),
    },
    twitter: {
      card: 'summary_large_image',
      title: t('defaultTitle'),
      description: t('defaultDescription'),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const typedLocale = locale as Locale;
  const dir = getDirection(typedLocale);

  return (
    <html
      lang={localeTags[typedLocale]}
      dir={dir}
      className={fontVariables}
      // Ask Next to manage scroll position across route transitions.
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className="min-h-dvh bg-paper text-ink antialiased"
        // Browser extensions write their own attributes onto <body> before React hydrates —
        // ColorZilla adds `cz-shortcut-listen`, password managers and Grammarly add others —
        // and React reports every one of them as a hydration mismatch it "won't patch up".
        // Nothing here renders body attributes from client-only state, so the only source of
        // a mismatch on this element is outside the application. Suppressing it on <body>
        // matches what is already done on <html> for the theme script, and it is one level
        // deep: attribute differences on children are still reported normally.
        suppressHydrationWarning
      >
        {/* Applies a remembered theme before any content paints. It is the first thing in the
            body rather than a hand-rolled <head>, because the App Router owns the head and a
            <script> inside the React tree triggers a hydration warning in React 19. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* One shared background + cursor system for every page. Fixed, behind
            everything, pointer-events: none. See AmbientField. */}
        <AmbientField />

        <NextIntlClientProvider>
          <SmoothScroll>
            <SkipLink />
            <SiteHeader locale={typedLocale} />
            <main id="main" tabIndex={-1} className="focus:outline-none">
              {children}
            </main>
            <SiteFooter locale={typedLocale} />
            {/* The mobile bar replaces both the collapsed navigation and the old sticky
                CTA — two fixed elements competing for the same corner of the screen was
                the reason the CTA overlapped the spec rail. */}
            <BottomNav />

            {/* Availability is resolved on the server: the client is told only whether the
                assistant works, never which provider or whether a key exists. */}
            <Concierge locale={typedLocale} available={conciergeAvailability().available} />
          </SmoothScroll>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
