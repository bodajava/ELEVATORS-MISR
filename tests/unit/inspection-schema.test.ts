import { describe, expect, it } from 'vitest';

import {
  fieldErrors,
  finishes,
  inspectionRequestSchema,
  messageFor,
  normalisePhone,
  settings,
} from '@/lib/inspection/schema';
import { locales } from '@/i18n/config';

/**
 * The schema is the only thing standing between a hostile POST and the database, so these
 * tests go after the rules rather than the happy path. Every case here is one a real
 * submission could produce or an attacker would try.
 */

const valid = {
  name: 'Ahmed Hassan',
  phone: '01012345678',
  area: 'New Cairo',
  setting: 'villa' as const,
  finish: 'brass-glass' as const,
  notes: 'Three floors.',
  consent: true as const,
  locale: 'en' as const,
};

describe('phone normalisation', () => {
  it('accepts every way an Egyptian mobile is written and yields one E.164 value', () => {
    const written = [
      '01012345678',
      '+201012345678',
      '00201012345678',
      '201012345678',
      '010 1234 5678',
      '010-1234-5678',
      '(010) 1234 5678',
      '  01012345678  ',
    ];
    for (const input of written) {
      expect(normalisePhone(input), input).toBe('+201012345678');
    }
  });

  it('accepts Eastern Arabic numerals, which is what an Arabic keyboard produces', () => {
    expect(normalisePhone('٠١٠١٢٣٤٥٦٧٨')).toBe('+201012345678');
    expect(normalisePhone('+٢٠١٠١٢٣٤٥٦٧٨')).toBe('+201012345678');
  });

  it('accepts all four Egyptian mobile prefixes and drops the trunk zero', () => {
    // E.164 for Egypt is +20 followed by the national number *without* its leading 0:
    // 010 1234 5678 → +201012345678, not +2001012345678.
    for (const prefix of ['010', '011', '012', '015']) {
      expect(normalisePhone(`${prefix}12345678`), prefix).toBe(`+20${prefix.slice(1)}12345678`);
    }
  });

  it('rejects landlines, wrong lengths, non-Egyptian numbers and junk', () => {
    const bad = [
      '0223456789', // Cairo landline
      '01312345678', // 013 is not an allocated mobile prefix
      '0101234567', // one digit short
      '010123456789', // one digit long
      '+441012345678', // wrong country
      'not a phone',
      '',
      '+20',
    ];
    for (const input of bad) {
      expect(normalisePhone(input), input).toBeNull();
    }
  });
});

describe('inspectionRequestSchema', () => {
  it('accepts a well-formed request and normalises it', () => {
    const parsed = inspectionRequestSchema.parse({ ...valid, name: '  Ahmed   Hassan  ' });
    expect(parsed.name).toBe('Ahmed Hassan');
    expect(parsed.phone).toBe('+201012345678');
    expect(parsed.area).toBe('New Cairo');
  });

  it('defaults setting, finish and notes when the fields are absent', () => {
    const parsed = inspectionRequestSchema.parse({
      name: valid.name,
      phone: valid.phone,
      area: valid.area,
      consent: true,
      locale: 'ar',
    });
    expect(parsed.setting).toBe('unsure');
    expect(parsed.finish).toBe('unsure');
    expect(parsed.notes).toBe('');
  });

  it('rejects a request with no consent — an unticked box is not consent', () => {
    for (const consent of [false, undefined, 'on', null]) {
      const result = inspectionRequestSchema.safeParse({ ...valid, consent });
      expect(result.success, String(consent)).toBe(false);
    }
  });

  it('rejects whitespace-only values that would otherwise pass a length check', () => {
    for (const field of ['name', 'area'] as const) {
      const result = inspectionRequestSchema.safeParse({ ...valid, [field]: '     ' });
      expect(result.success, field).toBe(false);
    }
  });

  it('rejects a locale outside the supported set', () => {
    expect(inspectionRequestSchema.safeParse({ ...valid, locale: 'fr' }).success).toBe(false);
    for (const locale of locales) {
      expect(inspectionRequestSchema.safeParse({ ...valid, locale }).success, locale).toBe(true);
    }
  });

  it('rejects a setting or finish outside the enum, however plausible it looks', () => {
    expect(inspectionRequestSchema.safeParse({ ...valid, setting: 'palace' }).success).toBe(false);
    expect(inspectionRequestSchema.safeParse({ ...valid, finish: 'gold' }).success).toBe(false);
  });

  it('caps every free-text field so a payload cannot be used as storage', () => {
    expect(inspectionRequestSchema.safeParse({ ...valid, name: 'a'.repeat(121) }).success).toBe(
      false
    );
    expect(inspectionRequestSchema.safeParse({ ...valid, area: 'a'.repeat(121) }).success).toBe(
      false
    );
    expect(inspectionRequestSchema.safeParse({ ...valid, notes: 'a'.repeat(2001) }).success).toBe(
      false
    );
    expect(inspectionRequestSchema.safeParse({ ...valid, notes: 'a'.repeat(2000) }).success).toBe(
      true
    );
  });

  it('keeps the enum vocabulary aligned with the database enums', () => {
    // If either list changes, the Drizzle pgEnum must change with it or inserts will fail at
    // runtime rather than here.
    expect([...settings]).toEqual(['villa', 'residence', 'commercial', 'unsure']);
    expect([...finishes]).toEqual(['brass-glass', 'smoked-glass', 'unsure']);
  });
});

describe('error messages', () => {
  it('produces a localised message for every field that failed, in both locales', () => {
    const result = inspectionRequestSchema.safeParse({
      name: '',
      phone: 'nope',
      area: '',
      consent: false,
      locale: 'en',
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    const en = fieldErrors(result.error, 'en');
    const ar = fieldErrors(result.error, 'ar');

    for (const field of ['name', 'phone', 'area', 'consent']) {
      expect(en[field], `en.${field}`).toBeTruthy();
      expect(ar[field], `ar.${field}`).toBeTruthy();
      // A missing translation would fall through to the raw issue key, which always
      // contains a dot and never a space. That is the tell to catch.
      expect(ar[field], `ar.${field} is untranslated`).not.toMatch(/^[a-z]+\.[a-zA-Z]+$/);
      expect(en[field]).not.toBe(ar[field]);
    }
  });

  it('reports one message per field, not every rule that failed', () => {
    const result = inspectionRequestSchema.safeParse({ ...valid, name: '' });
    if (result.success) throw new Error('expected failure');
    const errors = fieldErrors(result.error, 'en');
    expect(Object.keys(errors).filter((k) => k === 'name')).toHaveLength(1);
  });

  it('falls back to the key rather than an empty string for an unknown message', () => {
    expect(messageFor('en', 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('never leaks a price, a response-time promise or WhatsApp into form copy', async () => {
    const { inspectionForm, inspectionResult } = await import('@/content/inspection');
    const copy = JSON.stringify({ inspectionForm, inspectionResult });

    for (const forbidden of [
      /whatsapp/i,
      /wa\.me/i,
      /\bprice\b/i,
      /\bcost\b/i,
      /starting from/i,
      /within \d+ (hour|day|minute)/i,
      /same.day/i,
      /\bسعر\b/,
      /خلال \d+ (ساعة|يوم)/,
    ]) {
      expect(copy, String(forbidden)).not.toMatch(forbidden);
    }
  });
});
