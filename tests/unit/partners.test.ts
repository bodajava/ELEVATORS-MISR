import { describe, expect, it } from 'vitest';

import { contractors, designStudios, partnersSection } from '@/content/partners';
import { locales } from '@/i18n/config';

/**
 * Guards on the partners list.
 *
 * The list is an owner-asserted business fact, and the decisions taken around it are the kind
 * that erode quietly: a transliteration invented to "finish" the English column, a logo path
 * bolted onto an entry, a follower count added as a credential. Each one is a test here, so
 * changing the decision has to be deliberate rather than incidental.
 */
const all = [...designStudios, ...contractors];

describe('partners content', () => {
  it('has both lists populated', () => {
    expect(designStudios.length).toBeGreaterThan(0);
    expect(contractors.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    const ids = all.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names every partner in every locale', () => {
    for (const partner of all) {
      for (const locale of locales) {
        expect(partner.name[locale], `${partner.id}/${locale}`).toBeTruthy();
        expect(partner.name[locale].trim(), `${partner.id}/${locale}`).toBe(partner.name[locale]);
      }
    }
  });

  /**
   * No confirmed English lockup exists for any of the contractors, so the Arabic name is what
   * renders in both locales. If a real English name arrives it goes in `en` and this
   * expectation is updated on purpose — the failure exists to stop "Modon" or "Menber" being
   * guessed into the English page the way `hasEnglishLockup: false` stops an invented wordmark.
   */
  it('does not transliterate a contractor name that has not been confirmed', () => {
    for (const firm of contractors) {
      expect(firm.name.en, firm.id).toBe(firm.name.ar);
    }
  });

  /**
   * Names only. A logo lifted from a profile page is a third-party brand mark, which is the
   * category `docs/asset-inventory.json` holds 14 assets back over, and a profile picture is a
   * photograph of an identifiable person — 9 more. Neither ships without written rights.
   */
  it('carries no image, logo or link for any partner', () => {
    for (const partner of all) {
      expect(Object.keys(partner).sort()).toEqual(['id', 'name']);
      for (const locale of locales) {
        expect(partner.name[locale]).not.toMatch(/https?:|\.(png|jpe?g|svg|webp|avif)|@/i);
      }
    }
  });

  /** No count, no ranking, no endorsement wording, and none of the site's standing bans. */
  it('claims nothing beyond the relationship', () => {
    const copy = Object.values(partnersSection)
      .flatMap((entry) => locales.map((locale) => entry[locale]))
      .join(' ');
    expect(copy).not.toMatch(/whatsapp|wa\.me/i);
    expect(copy).not.toMatch(/\bprice|pricing|cost|EGP|جنيه|سعر|تكلفة/i);
    expect(copy).not.toMatch(/within \d|\d+ hours|24\/7|ساعة|فورا|فوراً/i);
    expect(copy).not.toMatch(/trusted by|top \d|award|best|رقم ١|الأفضل|الأول/i);
  });
});
