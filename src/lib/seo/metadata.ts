import type { Metadata } from 'next';

import { locales, localeTags, type Locale } from '@/i18n/config';
import { defaultLocale } from '@/i18n/config';

/**
 * Canonical URL and hreflang alternates for a page.
 *
 * `path` is the locale-independent route ('/projects', '/projects/foo'), with a leading slash
 * and no trailing slash. Every page must call this: a canonical that points at the wrong
 * locale, or a missing hreflang pair, is the most common way a bilingual site loses both
 * versions in search.
 */
export function buildAlternates(locale: Locale, path = ''): Metadata['alternates'] {
  const clean = path === '/' ? '' : path;
  return {
    canonical: `/${locale}${clean}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [localeTags[l], `/${l}${clean}`])),
      'x-default': `/${defaultLocale}${clean}`,
    },
  };
}
