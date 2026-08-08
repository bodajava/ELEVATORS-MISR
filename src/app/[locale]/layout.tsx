import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';

import { SmoothScroll } from '@/components/motion/smooth-scroll';
import { MobileCtaBar } from '@/components/layout/mobile-cta-bar';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { brand, siteUrl } from '@/content/company';
import { getDirection, localeTags, locales, openGraphLocales, type Locale } from '@/i18n/config';
import { routing } from '@/i18n/routing';
import { fontVariables } from '@/lib/fonts';

import '../globals.css';

/** Both locales prerender statically. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: '#e9e7e2',
  colorScheme: 'light',
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
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <NextIntlClientProvider>
          <SmoothScroll>
            <SkipLink />
            <SiteHeader locale={typedLocale} />
            <main id="main" tabIndex={-1} className="focus:outline-none">
              {children}
            </main>
            <SiteFooter locale={typedLocale} />
            <MobileCtaBar />
          </SmoothScroll>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
