/**
 * Locale configuration.
 *
 * English is the default and the LTR path. Arabic is the secondary locale and renders RTL.
 * Direction is a per-locale property, never a global assumption.
 */

export const locales = ['en', 'ar'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeDirections = {
  en: 'ltr',
  ar: 'rtl',
} as const satisfies Record<Locale, 'ltr' | 'rtl'>;

/** BCP-47 tags for `<html lang>`, `hreflang`, and `Intl` formatting. */
export const localeTags = {
  en: 'en',
  ar: 'ar-EG',
} as const satisfies Record<Locale, string>;

/** Open Graph locale identifiers. */
export const openGraphLocales = {
  en: 'en_US',
  ar: 'ar_EG',
} as const satisfies Record<Locale, string>;

/** Names shown in the language switcher — each written in its own language. */
export const localeNames = {
  en: 'English',
  ar: 'العربية',
} as const satisfies Record<Locale, string>;

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return localeDirections[locale];
}
