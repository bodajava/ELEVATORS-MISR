import type { Locale } from '@/i18n/config';

type Bilingual = Record<Locale, string>;

/**
 * Design studios and construction firms whose projects our panorama cars are installed in.
 *
 * ── Where this list comes from ──────────────────────────────────────────────
 * Supplied by the owner on 2026-09-06, as the firms the company's work reaches compound
 * projects through. It is an owner-asserted business fact, recorded here the same way the
 * marketing-film rights override was: stated, dated, and attributable — not inferred from an
 * asset, a watermark or a screenshot.
 *
 * This is a change of stance for the site and is deliberate. `src/components/sections/proof.tsx`
 * carries the line "No client logos, no certifications, no ratings — none of those are
 * verified." That remains true of logos, certifications and ratings. It is no longer true of
 * partner *names*, because the owner has now supplied them.
 *
 * ── What is deliberately NOT here ───────────────────────────────────────────
 *  · **No logos.** No logo file has been supplied for any firm on this list. A logo lifted
 *    from a profile page is a third-party brand mark, which is precisely the category
 *    `docs/asset-inventory.json` holds 14 assets back over. If the owner supplies logo files
 *    with permission to publish them, the rail takes an optional mark per row and nothing
 *    else changes.
 *  · **No photographs of people.** The source screenshots were Instagram profiles, and those
 *    profile pictures are photographs of identifiable individuals. The project already holds
 *    back 9 assets under `people-consent` for exactly this. A firm is named; a person is not
 *    pictured.
 *  · **No follower counts, no rankings, no "top 20".** Those are claims about the firms, not
 *    about us, and none of them are ours to publish.
 *  · **No project, owner, building or address** is attached to any name here.
 *
 * ── Names ───────────────────────────────────────────────────────────────────
 * Each firm is written the way it writes itself. The construction firms trade under Arabic
 * names and no confirmed English lockup exists for any of them, so the Arabic name renders in
 * both locales rather than a transliteration being invented — the same rule that keeps
 * `brand.logo.hasEnglishLockup` false. Supply an official English name and it goes in the
 * `en` field; until then, inventing "Modon" or "Menber" would be a guess published as fact.
 */
export type Partner = {
  /** Stable key. Never rendered. */
  id: string;
  /** The firm's own name. Identical in both locales where no confirmed alternate exists. */
  name: Bilingual;
};

/**
 * Interior and architectural design studios that specify the work.
 *
 * Latin names, as each studio presents itself. Held in one script across both locales for the
 * same reason as above: a studio's name is how it trades, not a string to be translated.
 */
export const designStudios: Partner[] = [
  { id: 'tarras', name: { en: 'TARRAS Design House', ar: 'TARRAS Design House' } },
  {
    id: 'elhussieni',
    name: { en: 'Mohamed Elhussieni Designs', ar: 'Mohamed Elhussieni Designs' },
  },
  { id: 'hany-saad', name: { en: 'Hany Saad Innovations', ar: 'Hany Saad Innovations' } },
  { id: 'ahmed-hussein', name: { en: 'Ahmed Hussein Designs', ar: 'Ahmed Hussein Designs' } },
  { id: 'darwish', name: { en: 'Ahmed Darwish Designs', ar: 'Ahmed Darwish Designs' } },
  {
    id: 'elsherif',
    name: { en: 'Ahmad Elsherif Design Studio', ar: 'Ahmad Elsherif Design Studio' },
  },
  { id: 'ahmed-ismail', name: { en: 'Ahmed Ismail Designs', ar: 'Ahmed Ismail Designs' } },
  { id: 'evento', name: { en: 'Evento Designs', ar: 'Evento Designs' } },
  { id: 'sherif-eltaher', name: { en: 'Sherif Eltaher', ar: 'Sherif Eltaher' } },
  { id: 'sherif-ali', name: { en: 'Sherif Ali Designs', ar: 'Sherif Ali Designs' } },
  { id: 'ahmed-saleh', name: { en: 'Ahmed Saleh Designs', ar: 'Ahmed Saleh Designs' } },
  { id: 'graffiti', name: { en: 'Graffiti Interior Design', ar: 'Graffiti Interior Design' } },
  { id: 'taj', name: { en: 'Taj Designs', ar: 'Taj Designs' } },
  { id: 'hussam', name: { en: 'Hussam Aboul Fotouh', ar: 'Hussam Aboul Fotouh' } },
];

/**
 * Construction, development and finishing contractors.
 *
 * Arabic names in both locales — see the note on names above.
 */
export const contractors: Partner[] = [
  { id: 'odex', name: { en: 'أودكس للمعمار', ar: 'أودكس للمعمار' } },
  { id: 'modon', name: { en: 'مدن للإنشاء والتعمير', ar: 'مدن للإنشاء والتعمير' } },
  { id: 'era', name: { en: 'إيرا مصر للإنشاءات', ar: 'إيرا مصر للإنشاءات' } },
  { id: 'reference', name: { en: 'رفرنس للعمارة', ar: 'رفرنس للعمارة' } },
  { id: 'khalifa', name: { en: 'خليفة', ar: 'خليفة' } },
  { id: 'sigma', name: { en: 'سيجما', ar: 'سيجما' } },
  { id: 'aura-home', name: { en: 'أورا هوم للتشطيبات', ar: 'أورا هوم للتشطيبات' } },
  { id: 'manbar', name: { en: 'منبر للإنشاءات', ar: 'منبر للإنشاءات' } },
];

/**
 * Section copy.
 *
 * The lede states the relationship and, in the same breath, the limit of what is published —
 * the firm, never the building. No count of projects, no "trusted by", no endorsement claim,
 * no response-time promise, no price.
 */
export const partnersSection: {
  eyebrow: Bilingual;
  heading: Bilingual;
  lede: Bilingual;
  studiosLabel: Bilingual;
  contractorsLabel: Bilingual;
  /** Accessible names for the two rails. */
  studiosRail: Bilingual;
  contractorsRail: Bilingual;
} = {
  eyebrow: { en: 'Who we build for', ar: 'لمن نعمل' },
  heading: {
    en: 'Specified by the studios and contractors behind the compounds',
    ar: 'مصاعدنا في مشروعات أبرز بيوت التصميم وشركات الإنشاء',
  },
  lede: {
    en: 'Design houses and construction firms whose projects our panorama cars are installed in. We name the firm and stop there — never the building, the owner, or the address.',
    ar: 'بيوت تصميم وشركات إنشاء نُفِّذت مصاعد البانوراما الخاصة بنا في مشروعاتها. نذكر اسم الشركة فقط — لا المبنى ولا المالك ولا العنوان.',
  },
  studiosLabel: { en: 'Design', ar: 'تصميم' },
  contractorsLabel: { en: 'Construction', ar: 'إنشاء' },
  studiosRail: { en: 'Design studios', ar: 'استوديوهات التصميم' },
  contractorsRail: { en: 'Construction and finishing firms', ar: 'شركات الإنشاء والتشطيب' },
};
