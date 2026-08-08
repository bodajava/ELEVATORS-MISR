import type { Locale } from '@/i18n/config';

/**
 * Company facts.
 *
 * Everything in `verified` traces to the company work-history record and is safe to publish.
 * Everything in `unconfirmed` is null until the company supplies it — see the rules below.
 * Nothing here may be invented. See docs/content-guide.md.
 */

export const brand = {
  /** English website brand name (decided). */
  name: 'Egypt Elevators',
  /** Arabic brand name as it appears in the logo wordmark. */
  nameAr: 'مصر العربية للمصاعد',
  /**
   * The company's own English name on its letterhead and in some video watermarks.
   * Surfaced honestly as `alternateName` in structured data rather than hidden.
   */
  legalNameEn: 'Arab Egypt Co. for Lifts',
  /** Commercial registration, printed on every page of the company record. */
  commercialRegistration: '151595',

  /**
   * Single source of truth for the logo.
   *
   * The supplied file is a 1024x1024 photographic render of the physical sign: a gold arch
   * with gears and the Arabic wordmark, modelled against marble. It is the company's real
   * logo and it is what the site uses — cropped to the mark's own edges by
   * `scripts/build-logo.mjs` and presented as the sign it is.
   *
   * It is deliberately *not* redrawn as a flat icon. Background removal would have to cut
   * semi-transparent gold away from marble and the result would look damaged, and inventing
   * a substitute is out of scope. If a vector or transparent original ever arrives, rebuild the
   * badge from it and nothing else changes.
   */
  logo: {
    /** The badge used in the header and footer. Aspect ratio 720:762. */
    badge: '/media/brand/logo-badge.webp',
    badgeWidth: 720,
    badgeHeight: 762,
    /** Square crop of the arch alone — favicon, PWA icon, structured data. */
    square: '/media/brand/logo-square.png',
    /** The read-only source. Never modified, never shipped. */
    sourceImage: 'assets/LOGO/2026-08-05 23.24.46.jpg',
    hasTransparentVariant: false,
    hasEnglishLockup: false,
  },
} as const;

/**
 * Figures verified against the company work-history record.
 *
 * IMPORTANT: these count *records*, not units. A record may cover more than one unit and some
 * records have blank type or quantity cells. Never convert these into elevator, unit, client
 * or active-project counts. See docs/content-guide.md §1.2.
 */
export const verified = {
  projectRecords: 213,
  panoramaClassifiedRecords: 51,
  typedRecords: 201,
  recordYear: 2025,
  /**
   * Areas named in the work record, at city/district level only — no addresses, no unit
   * numbers, nothing private. Given in both languages so the Arabic page never shows a
   * list of English place names.
   */
  coverage: [
    { en: 'New Cairo', ar: 'التجمع' },
    { en: '6th of October', ar: '٦ أكتوبر' },
    { en: 'Sheikh Zayed', ar: 'الشيخ زايد' },
    { en: 'New Administrative Capital', ar: 'العاصمة الإدارية' },
    { en: 'Madinaty', ar: 'مدينتي' },
    { en: 'Al Rehab', ar: 'الرحاب' },
    { en: 'Obour', ar: 'العبور' },
    { en: 'Shorouk', ar: 'الشروق' },
    { en: 'Katameya', ar: 'القطامية' },
    { en: 'Giza', ar: 'الجيزة' },
    { en: 'Nasr City', ar: 'مدينة نصر' },
    { en: 'Heliopolis', ar: 'مصر الجديدة' },
    { en: 'Mokattam', ar: 'المقطم' },
    { en: 'Helwan', ar: 'حلوان' },
    { en: 'North Coast', ar: 'الساحل الشمالي' },
    { en: 'Alexandria', ar: 'الإسكندرية' },
    { en: 'Asyut', ar: 'أسيوط' },
    { en: 'Suez', ar: 'السويس' },
  ],
} as const;

/**
 * Values the company has not yet supplied.
 *
 * These stay `null`. They are never filled with a guess, a placeholder, a "coming soon", or a
 * value scraped from an asset, a watermark, a screenshot or the work-history PDF.
 *
 * Read them through `requireContact()` / `hasContact()` — never directly — so that a missing
 * value fails loudly in development and is omitted silently in production.
 */
type UnconfirmedRegistry = {
  phone: string | null;
  /** Permanently null: WhatsApp is prohibited sitewide. Present only to make that explicit. */
  whatsapp: null;
  email: string | null;
  address: string | null;
  businessHours: string | null;
  foundedYear: string | null;
  warranty: string | null;
  emergencySupport: string | null;
  /** Permanently unused: promising a response time is prohibited. */
  responseTime: null;
  social: {
    facebook: string | null;
    instagram: string | null;
    tiktok: string | null;
    youtube: string | null;
    linkedin: string | null;
  };
};

export const unconfirmed: UnconfirmedRegistry = {
  phone: null,
  whatsapp: null,
  email: null,
  address: null,
  businessHours: null,
  foundedYear: null,
  warranty: null,
  emergencySupport: null,
  responseTime: null,
  social: {
    facebook: null,
    instagram: null,
    tiktok: null,
    youtube: null,
    linkedin: null,
  },
};

type ContactKey = keyof Omit<UnconfirmedRegistry, 'social'>;

/** True when a contact value has been confirmed and may be rendered. */
export function hasContact(key: ContactKey): boolean {
  return unconfirmed[key] !== null;
}

/**
 * Read a contact value.
 *
 * Development: throws, so a missing value is impossible to miss while building.
 * Production: returns null, so the calling component omits itself rather than rendering a hole.
 */
export function requireContact(key: ContactKey): string | null {
  const value = unconfirmed[key];
  if (value === null && process.env.NODE_ENV === 'development') {
    throw new Error(
      `Contact detail "${key}" is not confirmed. Render it conditionally with hasContact('${key}') ` +
        `instead of reading it directly. Never substitute a placeholder — see docs/content-guide.md.`
    );
  }
  return value;
}

export function hasAnySocial(): boolean {
  return Object.values(unconfirmed.social).some((url) => url !== null);
}

/**
 * The approved experience statement, in both locales.
 *
 * This exact wording is the only permitted phrasing. It counts records and says so.
 */
export const experienceStatement: Record<Locale, string> = {
  en: 'Backed by 213 documented project records, including 51 panorama-classified projects.',
  ar: 'خبرة موثقة عبر 213 سجل مشروع، من بينها 51 مشروعًا مصنفًا ضمن مصاعد البانوراما.',
};

/** Canonical site origin. Overridden per environment; no trailing slash. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  ''
);
