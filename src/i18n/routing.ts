import { defineRouting } from 'next-intl/routing';

import { defaultLocale, locales } from './config';

/**
 * Both locales are always prefixed (`/en/...`, `/ar/...`).
 *
 * `as-needed` would leave English unprefixed, which makes hreflang pairs and the language
 * switcher's "same page, other locale" guarantee harder to reason about. An explicit prefix
 * on both is worth the extra path segment.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true,
});
