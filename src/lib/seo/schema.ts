import { brand, siteUrl, unconfirmed, verified } from '@/content/company';
import { localeTags, type Locale } from '@/i18n/config';
import type { ImageAsset } from '@/lib/media';

/**
 * Structured data.
 *
 * Only verified facts appear here. Specifically absent, and deliberately so:
 *
 *  - **No `LocalBusiness`** — it requires an address, and no address has been confirmed.
 *    Emitting one with a guessed or omitted address is worse than emitting nothing.
 *  - **No `AggregateRating`, `Review`, `Offer` or `priceRange`** — no ratings exist, and
 *    publishing prices is prohibited.
 *  - **No `telephone` or `email`** until those values are confirmed.
 *  - **No `foundingDate`** — unknown.
 *
 * Everything that *is* emitted traces to docs/content-guide.md.
 */

type Json = Record<string, unknown>;

export function organizationSchema(locale: Locale): Json {
  const social = Object.values(unconfirmed.social).filter((v): v is string => Boolean(v));

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: brand.name,
    // The Arabic name and the letterhead English name are both real and both differ from the
    // website brand. Declaring them is the honest way to handle that, rather than hiding it.
    alternateName: [brand.nameAr, brand.legalNameEn],
    url: `${siteUrl}/${locale}`,
    inLanguage: localeTags[locale],
    identifier: {
      '@type': 'PropertyValue',
      name: 'Commercial Registration (Egypt)',
      value: brand.commercialRegistration,
    },
    areaServed: { '@type': 'Country', name: 'Egypt' },
    knowsAbout: ['Panorama elevators', 'Glass elevators', 'Elevator installation'],
    ...(social.length > 0 ? { sameAs: social } : {}),
  };
}

/**
 * The site itself.
 *
 * No `SearchAction`: there is no site search, and declaring a `potentialAction` that 404s is
 * how a sitelinks searchbox turns into a broken one. The `@id` is locale-scoped because the
 * English and Arabic homepages are separate documents with separate canonicals — collapsing
 * them onto one `@id` would make the two `inLanguage` values contradict each other.
 */
export function webSiteSchema(locale: Locale): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/${locale}#website`,
    name: brand.name,
    alternateName: brand.nameAr,
    url: `${siteUrl}/${locale}`,
    inLanguage: localeTags[locale],
    publisher: { '@id': `${siteUrl}/#organization` },
  };
}

/**
 * The homepage graph.
 *
 * One array, three nodes, cross-referenced by `@id` rather than nested — which is what lets
 * the Organization node declared here be the same entity the About and project pages point
 * at, instead of three separate companies that happen to share a name.
 *
 * Locale-aware throughout: language tags, the localised service description, and the URLs all
 * follow the locale, so the Arabic homepage does not describe itself as an English document.
 */
export function homePageSchema(locale: Locale): Json[] {
  return [organizationSchema(locale), webSiteSchema(locale), serviceSchema(locale)];
}

export function serviceSchema(locale: Locale): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${siteUrl}/#panorama-service`,
    name: locale === 'en' ? 'Panorama elevator installation' : 'تركيب مصاعد البانوراما',
    serviceType: locale === 'en' ? 'Panorama elevator installation' : 'تركيب مصاعد البانوراما',
    provider: { '@id': `${siteUrl}/#organization` },
    areaServed: { '@type': 'Country', name: 'Egypt' },
    inLanguage: localeTags[locale],
    description:
      locale === 'en'
        ? 'Design and installation of panorama (glass) elevators for villas, residences and commercial interiors in Egypt. Every project begins with a physical site inspection.'
        : 'تصميم وتركيب مصاعد البانوراما الزجاجية للفلل والمساكن والمساحات التجارية في مصر. كل مشروع يبدأ بمعاينة ميدانية على الطبيعة.',
    // No `offers` block: publishing a price, a range or even a currency is prohibited.
  };
}

export function breadcrumbSchema(locale: Locale, crumbs: { name: string; path: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}/${locale}${crumb.path}`,
    })),
  };
}

export function imageObjectSchema(image: ImageAsset, alt: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: `${siteUrl}${image.src}`,
    width: image.width,
    height: image.height,
    caption: alt,
    creator: { '@id': `${siteUrl}/#organization` },
    copyrightNotice: brand.name,
  };
}

/**
 * FAQPage is emitted **only** when the questions are visibly rendered on the same page.
 * Google requires the content to be present and visible; marking up hidden answers is
 * exactly the kind of thing that earns a manual action.
 */
export function faqSchema(items: { question: string; answer: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** Exposed for tests: the record counts must never be restated as unit counts. */
export const verifiedCounts = verified;
