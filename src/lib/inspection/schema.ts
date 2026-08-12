import { z } from 'zod';

import { locales, type Locale } from '@/i18n/config';

/**
 * The inspection request — one schema, both sides.
 *
 * The browser uses it to validate as you type; the server action re-parses the same schema
 * before anything is written. Client validation is a courtesy and is assumed to be absent,
 * bypassed or hostile — the server parse is the one that decides.
 *
 * ── What this form does not collect ─────────────────────────────────────────
 * No email address. The site's permitted contact paths are a closed list (concierge, this
 * form, the inspection request, and a phone call once a number is confirmed) and email is
 * not on it; collecting one would imply a reply channel that does not exist. No budget or
 * price field either — pricing follows the inspection, off-site, and never appears here.
 *
 * ── Why the messages live with the schema ───────────────────────────────────
 * Zod errors are produced in whichever runtime parses. Rather than resolving translations
 * inside the schema (which would drag next-intl into a module the server action imports),
 * every issue carries a stable machine key and `messageFor(locale, key)` renders it. The
 * result is that the browser and the server produce identical text for identical input.
 */

/** Stable identifiers for every failure this schema can produce. */
export const issueKeys = [
  'name.required',
  'name.tooShort',
  'name.tooLong',
  'phone.required',
  'phone.invalid',
  'area.required',
  'area.tooLong',
  'setting.invalid',
  'notes.tooLong',
  'locale.invalid',
  'consent.required',
] as const;

export type IssueKey = (typeof issueKeys)[number];

const messages: Record<IssueKey, Record<Locale, string>> = {
  'name.required': { en: 'Please enter your name.', ar: 'من فضلك اكتب اسمك.' },
  'name.tooShort': {
    en: 'Please enter at least two characters.',
    ar: 'من فضلك اكتب حرفين على الأقل.',
  },
  'name.tooLong': { en: 'That name is too long.', ar: 'الاسم طويل أكثر من اللازم.' },
  'phone.required': { en: 'Please enter a phone number.', ar: 'من فضلك اكتب رقم هاتف.' },
  'phone.invalid': {
    en: 'Enter an Egyptian mobile number, for example 01012345678.',
    ar: 'اكتب رقم موبايل مصري، مثل ٠١٠١٢٣٤٥٦٧٨.',
  },
  'area.required': { en: 'Please tell us the area.', ar: 'من فضلك اذكر المنطقة.' },
  'area.tooLong': { en: 'That is longer than we need.', ar: 'النص أطول مما نحتاج.' },
  'setting.invalid': { en: 'Choose one of the options.', ar: 'اختر أحد الخيارات.' },
  'notes.tooLong': {
    en: 'Please keep this under 2000 characters.',
    ar: 'من فضلك اجعل النص أقل من ٢٠٠٠ حرف.',
  },
  'locale.invalid': { en: 'Unsupported language.', ar: 'لغة غير مدعومة.' },
  'consent.required': {
    en: 'Please confirm before sending.',
    ar: 'من فضلك أكِّد قبل الإرسال.',
  },
};

/** Render an issue key in a locale. Unknown keys fall back to the key itself, never to ''. */
export function messageFor(locale: Locale, key: string): string {
  return (messages as Record<string, Record<Locale, string>>)[key]?.[locale] ?? key;
}

/* ─────────────────────────────── field vocabulary ────────────────────────── */

/**
 * What kind of building the lift is going into. `unsure` exists because most visitors
 * genuinely are, and forcing a guess produces worse data than admitting it.
 *
 * `residence` ("Apartment building") was replaced by `factory` on the owner's instruction,
 * 2026-08-12. The database enum still carries `residence` — rows recorded before that date
 * hold it, and a Postgres enum value cannot be dropped without rewriting the column — but the
 * form no longer offers it and the server no longer accepts it. See `src/lib/db/schema.ts`.
 *
 * There is no `finish` question any more. It was removed from the form on the same
 * instruction; the column it used to write is documented in the database schema.
 */
export const settings = ['villa', 'factory', 'commercial', 'unsure'] as const;

export type Setting = (typeof settings)[number];

/* ──────────────────────────────── phone ──────────────────────────────────── */

/**
 * Egyptian mobile numbers.
 *
 * Accepted: `01012345678`, `+201012345678`, `00201012345678`, and any of those with spaces,
 * hyphens or parentheses. Also accepted: Eastern Arabic numerals (٠-٩), which is what an
 * Arabic keyboard produces and what an Egyptian visitor will type without thinking about it.
 * Rejecting those would fail the secondary locale for no reason.
 *
 * Everything normalises to E.164 (`+201XXXXXXXXX`) before storage, so one person is one row
 * however they typed it.
 */
const easternArabicDigits = /[٠-٩۰-۹]/g;

function toWesternDigits(value: string): string {
  return value.replace(easternArabicDigits, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/** Strips formatting and returns E.164, or null when the number is not a valid EG mobile. */
export function normalisePhone(raw: string): string | null {
  const digitsOnly = toWesternDigits(raw).replace(/[\s()\-.‎‏]/g, '');

  let national: string | null = null;
  if (/^\+20(1[0125]\d{8})$/.test(digitsOnly)) national = RegExp.$1;
  else if (/^0020(1[0125]\d{8})$/.test(digitsOnly)) national = RegExp.$1;
  else if (/^20(1[0125]\d{8})$/.test(digitsOnly)) national = RegExp.$1;
  else if (/^0(1[0125]\d{8})$/.test(digitsOnly)) national = RegExp.$1;

  return national ? `+20${national}` : null;
}

/* ──────────────────────────────── schema ─────────────────────────────────── */

const trimmed = z.string().transform((v) => v.trim());

export const inspectionRequestSchema = z.object({
  name: trimmed.pipe(
    z
      .string()
      .min(1, 'name.required')
      .min(2, 'name.tooShort')
      .max(120, 'name.tooLong')
      // Collapse runs of whitespace so "Ahmed    Hassan" and "Ahmed Hassan" are one person.
      .transform((v) => v.replace(/\s+/g, ' '))
  ),

  phone: trimmed.pipe(
    z
      .string()
      .min(1, 'phone.required')
      .refine((v) => normalisePhone(v) !== null, 'phone.invalid')
      .transform((v) => normalisePhone(v) as string)
  ),

  area: trimmed.pipe(z.string().min(1, 'area.required').max(120, 'area.tooLong')),

  setting: z.enum(settings, 'setting.invalid').default('unsure'),

  notes: trimmed.pipe(z.string().max(2000, 'notes.tooLong')).default(''),

  /**
   * Explicit consent to be contacted about this request. Required — Egypt's PDPL (Law
   * 151/2018) treats a phone number as personal data, and an unticked box is not consent.
   */
  consent: z.literal(true, 'consent.required'),

  /** Which language the visitor was reading. Determines the language of any follow-up. */
  locale: z.enum(locales, 'locale.invalid'),
});

/** Shape the form component works with, before Zod transforms it. */
export type InspectionRequestInput = z.input<typeof inspectionRequestSchema>;
/** Shape the server persists: phone in E.164, strings trimmed, defaults applied. */
export type InspectionRequest = z.output<typeof inspectionRequestSchema>;

/**
 * Flatten a Zod error into `{ field: localised message }`.
 *
 * Only the first issue per field survives, which is what a form should show — a list of four
 * complaints about one input is noise.
 */
export function fieldErrors(error: z.ZodError<unknown>, locale: Locale): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? '_');
    if (field in out) continue;
    out[field] = messageFor(locale, issue.message);
  }
  return out;
}
