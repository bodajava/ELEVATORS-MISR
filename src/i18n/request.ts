import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { localeTags } from './config';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`./dictionaries/${locale}.json`)).default,
    // Numerals stay Latin in both locales: reference codes, floor counts and phone numbers
    // must remain readable to a bilingual audience and copy-pasteable into other systems.
    formats: {
      number: {
        plain: { useGrouping: false },
      },
    },
    now: new Date(),
    timeZone: 'Africa/Cairo',
    getMessageFallback({ key, namespace }) {
      const path = [namespace, key].filter(Boolean).join('.');
      // Loud in development, quiet in production — a missing string should never render
      // as a raw key to a visitor, but it must be impossible to miss while building.
      if (process.env.NODE_ENV === 'development') {
        throw new Error(`Missing translation: ${path} (${localeTags[locale]})`);
      }
      return '';
    },
  };
});
