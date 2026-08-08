import type { Locale } from '@/i18n/config';

/**
 * About page copy.
 *
 * ── Voice ───────────────────────────────────────────────────────────────────
 * Public-facing and confident. The previous copy read like an internal memo — "on this
 * website we show one part of the business", "they are not what this site is about" — which
 * narrates an editorial decision to a visitor who has no reason to care. A company page
 * states what the company does; it does not explain its own content strategy.
 *
 * ── Facts ───────────────────────────────────────────────────────────────────
 * Everything here is verified: the commercial registration, the two real alternate names, the
 * panorama specialism, and the record counts in the exact approved phrasing. There is no
 * founding year, no employee count, no certification, no award, no client and no testimonial,
 * because none of those has been supplied. See docs/content-guide.md.
 */

type Bilingual = Record<Locale, string>;

export const about: {
  eyebrow: Bilingual;
  heading: Bilingual;
  lede: Bilingual;
  intro: Record<Locale, string[]>;
  identityHeading: Bilingual;
  identity: Record<Locale, { label: string; value: string }[]>;
  fieldHeading: Bilingual;
  fieldLede: Bilingual;
  fieldCaptions: Record<Locale, string[]>;
  materialsHeading: Bilingual;
  materialsLede: Bilingual;
  approachHeading: Bilingual;
  approachLede: Bilingual;
  approachLink: Bilingual;
} = {
  eyebrow: { en: 'Egypt Elevators', ar: 'مصر العربية للمصاعد' },

  heading: {
    en: 'We build the elevator into the architecture',
    ar: 'نبني المصعد داخل العمارة نفسها',
  },

  lede: {
    en: 'A registered Egyptian elevator company specialising in panorama elevators — glass cars designed as part of the building rather than an addition to it.',
    ar: 'شركة مصاعد مصرية مسجّلة متخصصة في مصاعد البانوراما — كبائن زجاجية مصمَّمة لتكون جزءًا من المبنى لا إضافة إليه.',
  },

  intro: {
    en: [
      'We supply, install, repair and maintain lifts across Egypt. Panorama elevators are the work we are known for: a glass car in a shaft that was planned around it, where the ride is part of the room rather than a box cut into a wall.',
      'Backed by 213 documented project records, including 51 panorama-classified projects. Every photograph on this site is of our own installations — no stock imagery, no borrowed work.',
    ],
    ar: [
      'نقوم بتوريد وتركيب وإصلاح وصيانة المصاعد في أنحاء مصر. ومصاعد البانوراما هي العمل الذي نُعرف به: كابينة زجاجية داخل بئر صُمِّم من أجلها، بحيث تصبح الحركة جزءًا من المكان لا صندوقًا محفورًا في جدار.',
      'خبرة موثقة عبر 213 سجل مشروع، من بينها 51 مشروعًا مصنفًا ضمن مصاعد البانوراما. وكل صورة على هذا الموقع من أعمالنا نحن — بلا صور جاهزة ولا أعمال منقولة.',
    ],
  },

  identityHeading: { en: 'The company', ar: 'الشركة' },

  identity: {
    en: [
      { label: 'Arabic name', value: 'مصر العربية للمصاعد' },
      { label: 'On company documents', value: 'Arab Egypt Co. for Lifts' },
      { label: 'Commercial registration', value: '151595' },
      { label: 'Speciality', value: 'Panorama elevators' },
    ],
    ar: [
      { label: 'الاسم العربي', value: 'مصر العربية للمصاعد' },
      { label: 'على مستندات الشركة', value: 'Arab Egypt Co. for Lifts' },
      { label: 'السجل التجاري', value: '151595' },
      { label: 'التخصص', value: 'مصاعد البانوراما' },
    ],
  },

  fieldHeading: { en: 'On site', ar: 'في الموقع' },
  fieldLede: {
    en: 'Every installation is measured, fitted and finished by our own team. These are photographs from that work.',
    ar: 'كل عملية تركيب يقوم بها فريقنا: القياس والتركيب والتشطيب. وهذه صور من ذلك العمل.',
  },
  // Descriptive only — what is visibly in the frame. No names, no roles, no claims.
  fieldCaptions: {
    en: [
      'On site during installation',
      'Fitting the car',
      'Checking the finish',
      'Final alignment',
    ],
    ar: ['في الموقع أثناء التركيب', 'تركيب الكابينة', 'مراجعة التشطيب', 'الضبط النهائي'],
  },

  materialsHeading: { en: 'Materials and workmanship', ar: 'الخامات والصنعة' },
  materialsLede: {
    en: 'The finish decides how a panorama car sits in a room. These are the two the work genuinely divides on.',
    ar: 'التشطيب هو ما يحدد كيف تستقر كابينة البانوراما داخل المكان. وهذان هما التشطيبان اللذان تنقسم عليهما أعمالنا فعلًا.',
  },

  approachHeading: { en: 'How a project runs', ar: 'كيف يسير المشروع' },
  approachLede: {
    en: 'Six stages, in this order, every time. Nothing is quoted before the building has been measured.',
    ar: 'ست مراحل، بهذا الترتيب، في كل مرة. ولا يُقدَّر أي شيء قبل قياس المبنى.',
  },
  approachLink: { en: 'See the full process', ar: 'اطّلع على المراحل كاملة' },
};
