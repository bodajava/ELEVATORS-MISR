import { describe, expect, it } from 'vitest';

import { locales } from '@/i18n/config';
import { homePageSchema, organizationSchema, webSiteSchema } from '@/lib/seo/schema';

/**
 * Structured data is published to search engines and cannot be corrected quietly, so the
 * rules that keep it honest are tested rather than reviewed: no unconfirmed contact details,
 * no prices, and a locale-aware graph whose nodes actually reference each other.
 */

type Json = Record<string, unknown>;

describe('homepage JSON-LD', () => {
  it('emits Organization, WebSite and Service, in both locales', () => {
    for (const locale of locales) {
      const graph = homePageSchema(locale);
      expect(
        graph.map((n) => n['@type']),
        locale
      ).toEqual(['Organization', 'WebSite', 'Service']);
    }
  });

  it('declares the reading language, and it differs per locale', () => {
    expect(homePageSchema('en').every((n) => n.inLanguage === 'en')).toBe(true);
    expect(homePageSchema('ar').every((n) => n.inLanguage === 'ar-EG')).toBe(true);
  });

  it('points every node at the same Organization @id so they are one entity', () => {
    const graph = homePageSchema('en');
    const organizationId = graph[0]['@id'];

    expect(String(organizationId)).toMatch(/#organization$/);
    expect((graph[1].publisher as Json)['@id']).toBe(organizationId);
    expect((graph[2].provider as Json)['@id']).toBe(organizationId);
  });

  it('scopes the WebSite @id per locale, since the two homepages are separate documents', () => {
    expect(webSiteSchema('en')['@id']).not.toBe(webSiteSchema('ar')['@id']);
    expect(String(webSiteSchema('ar')['@id'])).toContain('/ar#website');
  });

  it('carries the locale in every URL it publishes', () => {
    for (const locale of locales) {
      for (const node of homePageSchema(locale)) {
        if (typeof node.url === 'string') {
          expect(node.url, `${locale} ${String(node['@type'])}`).toMatch(new RegExp(`/${locale}$`));
        }
      }
    }
  });

  it('publishes no price, offer, rating or review — all of which are prohibited', () => {
    for (const locale of locales) {
      const serialised = JSON.stringify(homePageSchema(locale));
      for (const forbidden of [
        'priceRange',
        '"offers"',
        'AggregateRating',
        '"review"',
        'PriceSpecification',
      ]) {
        expect(serialised, `${locale}/${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it('publishes no telephone, email or postal address, none of which are confirmed', () => {
    for (const locale of locales) {
      const serialised = JSON.stringify(homePageSchema(locale));
      for (const forbidden of [
        'telephone',
        '"email"',
        'PostalAddress',
        'contactPoint',
        'LocalBusiness',
      ]) {
        expect(serialised, `${locale}/${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it('never emits an empty sameAs, which would assert zero social presence', () => {
    for (const locale of locales) {
      const org = organizationSchema(locale);
      if ('sameAs' in org) expect((org.sameAs as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it('declares the two real alternate names rather than hiding the conflict', () => {
    const org = organizationSchema('en');
    expect(org.name).toBe('Egypt Elevators');
    expect(org.alternateName).toContain('مصر العربية للمصاعد');
    expect(org.alternateName).toContain('Arab Egypt Co. for Lifts');
  });

  it('is serialisable and free of the sequence that breaks out of a script tag', () => {
    for (const locale of locales) {
      const serialised = JSON.stringify(homePageSchema(locale));
      expect(() => JSON.parse(serialised)).not.toThrow();
      expect(serialised).not.toContain('</script');
    }
  });
});
