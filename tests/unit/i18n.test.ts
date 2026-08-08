import { describe, expect, it } from 'vitest';

import en from '@/i18n/dictionaries/en.json';
import ar from '@/i18n/dictionaries/ar.json';
import { defaultLocale, getDirection, isLocale, locales, localeTags } from '@/i18n/config';

/** Collect every leaf key path in a nested object. */
function keyPaths(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
}

describe('locale configuration', () => {
  it('has English as the default and LTR locale', () => {
    expect(defaultLocale).toBe('en');
    expect(getDirection('en')).toBe('ltr');
  });

  it('renders Arabic RTL', () => {
    expect(getDirection('ar')).toBe('rtl');
  });

  it('uses a region-qualified BCP-47 tag for Arabic', () => {
    expect(localeTags.ar).toBe('ar-EG');
  });

  it('narrows unknown strings', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
  });
});

describe('dictionary parity', () => {
  const enKeys = keyPaths(en).sort();
  const arKeys = keyPaths(ar).sort();

  it('defines every English key in Arabic', () => {
    expect(arKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
    expect(enKeys.filter((k) => !arKeys.includes(k))).toEqual([]);
  });

  it('has no empty strings in either locale', () => {
    for (const [name, dict] of [
      ['en', en],
      ['ar', ar],
    ] as const) {
      const empties = keyPaths(dict).filter((path) => {
        const value = path
          .split('.')
          .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], dict);
        return typeof value === 'string' && value.trim() === '';
      });
      expect(empties, `${name} has empty strings`).toEqual([]);
    }
  });

  it('covers every configured locale with a dictionary', () => {
    expect(locales).toHaveLength(2);
  });
});

describe('content prohibitions', () => {
  const allText = JSON.stringify(en) + JSON.stringify(ar);

  it('mentions WhatsApp nowhere', () => {
    expect(allText.toLowerCase()).not.toContain('whatsapp');
    expect(allText).not.toContain('wa.me');
  });

  it('quotes no price or currency', () => {
    expect(allText).not.toMatch(/\bEGP\b|\bجنيه\b|\$|starting from|يبدأ من/i);
  });

  it('promises no response time', () => {
    expect(allText).not.toMatch(/within \d+ ?(hours?|minutes?|days?)|خلال \d+ ?(ساعة|ساعات|يوم)/i);
  });
});
