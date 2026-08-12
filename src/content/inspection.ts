import type { Locale } from '@/i18n/config';
import type { Setting } from '@/lib/inspection/schema';

/**
 * Inspection form copy.
 *
 * Written to the same rules as the rest of the site and checked against them here rather
 * than trusted to review: **no price or estimate**, **no response-time promise** — the
 * confirmation says the request arrived and stops there — **no WhatsApp or any other
 * contact channel**, and **no invented company facts**. Arabic is written as Arabic, not
 * translated word-for-word from the English.
 */

type Bilingual = Record<Locale, string>;

export const inspectionForm: {
  legend: Bilingual;
  name: { label: Bilingual; placeholder: Bilingual };
  phone: { label: Bilingual; hint: Bilingual; placeholder: Bilingual };
  area: { label: Bilingual; hint: Bilingual; placeholder: Bilingual };
  setting: { label: Bilingual; options: Record<Setting, Bilingual> };
  notes: { label: Bilingual; hint: Bilingual; placeholder: Bilingual };
  consent: { label: Bilingual };
  submit: Bilingual;
  submitting: Bilingual;
  privacyNote: Bilingual;
  errorSummary: Bilingual;
} = {
  legend: { en: 'Your details', ar: 'بياناتك' },

  name: {
    label: { en: 'Name', ar: 'الاسم' },
    placeholder: { en: 'Who should we ask for?', ar: 'من نسأل عنه؟' },
  },

  phone: {
    label: { en: 'Phone', ar: 'رقم الهاتف' },
    hint: {
      en: 'An Egyptian mobile number. This is how we arrange the visit.',
      ar: 'رقم موبايل مصري. عن طريقه نرتّب موعد الزيارة.',
    },
    placeholder: { en: '01012345678', ar: '٠١٠١٢٣٤٥٦٧٨' },
  },

  area: {
    label: { en: 'Area', ar: 'المنطقة' },
    hint: {
      en: 'The district is enough — New Cairo, Sheikh Zayed, Alexandria. No address needed yet.',
      ar: 'يكفي اسم المنطقة — التجمع، الشيخ زايد، الإسكندرية. لا حاجة للعنوان الآن.',
    },
    placeholder: { en: 'New Cairo', ar: 'التجمع' },
  },

  // "Apartment building" was replaced by "Factories" on the owner's instruction, 2026-08-12 —
  // the company's own statement of what it works on names museums and factories, and no
  // apartment-building option is offered any more.
  setting: {
    label: { en: 'What is the space?', ar: 'ما نوع المكان؟' },
    options: {
      villa: { en: 'Villa', ar: 'فيلا' },
      factory: { en: 'Factory', ar: 'مصانع' },
      commercial: { en: 'Commercial', ar: 'مبنى تجاري' },
      unsure: { en: 'Something else', ar: 'شيء آخر' },
    },
  },

  notes: {
    label: { en: 'Anything else', ar: 'أي شيء آخر' },
    hint: {
      en: 'Number of floors, an opening you already have, a deadline — whatever is useful.',
      ar: 'عدد الأدوار، فتحة قائمة بالفعل، موعد نهائي — أي شيء مفيد.',
    },
    placeholder: { en: '', ar: '' },
  },

  consent: {
    label: {
      en: 'You may contact me on this number about the site inspection.',
      ar: 'أوافق على التواصل معي على هذا الرقم بخصوص معاينة الموقع.',
    },
  },

  submit: { en: 'Request the inspection', ar: 'اطلب المعاينة' },
  submitting: { en: 'Sending…', ar: 'جارٍ الإرسال…' },

  privacyNote: {
    en: 'We keep your name, number and area, and use them only to arrange the inspection. Nothing is shared with anyone else.',
    ar: 'نحتفظ باسمك ورقمك ومنطقتك، ونستخدمها فقط لترتيب المعاينة. ولا نشاركها مع أي جهة أخرى.',
  },

  errorSummary: {
    en: 'Please check the highlighted fields.',
    ar: 'من فضلك راجع الحقول المحدَّدة.',
  },
};

export const inspectionResult: {
  successHeading: Bilingual;
  successBody: Bilingual;
  referenceLabel: Bilingual;
  referenceNote: Bilingual;
  again: Bilingual;
  failureHeading: Bilingual;
  failureBody: Bilingual;
  rateLimited: Bilingual;
  unavailable: Bilingual;
} = {
  // Confirms arrival. Says nothing about when anyone replies — no SLA, no "shortly", no
  // implied urgency. That restriction is binding, and it is easy to violate by accident here.
  successHeading: { en: 'Request received', ar: 'تم استلام طلبك' },
  successBody: {
    en: 'Your inspection request is with the team. Keep the reference below — it identifies your request if you speak to us.',
    ar: 'طلب المعاينة وصل إلى الفريق. احتفظ بالرقم المرجعي أدناه، فهو يحدّد طلبك عند التحدث معنا.',
  },
  referenceLabel: { en: 'Your reference', ar: 'الرقم المرجعي' },
  referenceNote: {
    en: 'Written down or photographed is fine. We do not need it to find you — your number is enough.',
    ar: 'يكفي أن تدوّنه أو تصوّره. ولسنا بحاجة إليه للوصول إليك، فرقمك كافٍ.',
  },
  again: { en: 'Send another request', ar: 'إرسال طلب آخر' },

  failureHeading: { en: 'That did not send', ar: 'لم يتم الإرسال' },
  failureBody: {
    en: 'Something went wrong on our side and your request was not recorded. Please try again.',
    ar: 'حدث خطأ لدينا ولم يُسجَّل طلبك. من فضلك حاول مرة أخرى.',
  },
  rateLimited: {
    en: 'That is several requests from this connection already. Please wait a few minutes and try again.',
    ar: 'وصلتنا عدة طلبات من هذا الاتصال بالفعل. من فضلك انتظر بضع دقائق ثم حاول مجددًا.',
  },
  unavailable: {
    en: 'Requests cannot be recorded right now, so we have not taken yours. Please try again later.',
    ar: 'لا يمكن تسجيل الطلبات في الوقت الحالي، ولم نستلم طلبك. من فضلك حاول لاحقًا.',
  },
};

/**
 * Contact page framing.
 *
 * The page around the form was text-only: a heading, a lede and a reassurance list, with no
 * photography anywhere. It rendered zero images across three and a half viewport heights.
 *
 * Nothing here invents a contact detail. There is no phone number, no email address, no
 * address, no opening hours, no price and no response time — none has been supplied, and the
 * "what happens next" sequence is written so that it never implies one.
 */
export const contactIntro: {
  eyebrow: Bilingual;
  heading: Bilingual;
  lede: Bilingual;
  body: Record<Locale, string[]>;
  nextHeading: Bilingual;
  next: Record<Locale, { title: string; body: string }[]>;
  mediaCaption: Bilingual;
} = {
  eyebrow: { en: 'Site inspection', ar: 'معاينة الموقع' },
  heading: {
    en: 'It starts with someone standing in the space',
    ar: 'يبدأ الأمر بأن يقف أحدنا داخل المكان',
  },
  lede: {
    en: 'Tell us where the building is and how to reach you. Someone from the team comes out, measures it, and tells you what is actually possible.',
    ar: 'أخبرنا بمكان المبنى وكيف نصل إليك. يخرج أحد أفراد الفريق، يقيس المكان، ويخبرك بما هو ممكن فعلًا.',
  },
  body: {
    en: [
      'A panorama car is built into a shaft that was planned around it, so the building decides most of the answer. That is not something anyone can settle over the phone.',
    ],
    ar: [
      'كابينة البانوراما تُبنى داخل بئر صُمِّم من أجلها، فالمبنى هو ما يحدد معظم الإجابة. وهذا ليس ما يمكن حسمه عبر الهاتف.',
    ],
  },

  nextHeading: { en: 'What happens next', ar: 'ماذا يحدث بعد ذلك' },
  // Deliberately free of any timeframe. The order is fixed; the schedule is not ours to state.
  next: {
    en: [
      {
        title: 'We read the request',
        body: 'Your name, number and area are all we need to start.',
      },
      {
        title: 'We arrange the visit',
        body: 'Someone contacts you on the number you gave to agree a time that suits you.',
      },
      {
        title: 'We measure the space',
        body: 'Openings, floors, structure and how the shaft would meet each level.',
      },
      {
        title: 'We tell you what is possible',
        body: 'Including when the answer is that a panorama car is the wrong solution.',
      },
    ],
    ar: [
      { title: 'نقرأ الطلب', body: 'اسمك ورقمك ومنطقتك هي كل ما نحتاجه للبدء.' },
      {
        title: 'نرتّب الزيارة',
        body: 'يتواصل معك أحدنا على الرقم الذي تركته للاتفاق على وقت يناسبك.',
      },
      { title: 'نقيس المكان', body: 'الفتحات والأدوار والإنشاء وكيف يلتقي البئر بكل دور.' },
      {
        title: 'نخبرك بما هو ممكن',
        body: 'بما في ذلك أن تكون الإجابة أن كابينة البانوراما ليست الحل المناسب.',
      },
    ],
  },

  mediaCaption: {
    en: 'Completed panorama installations',
    ar: 'أعمال بانوراما منفَّذة',
  },
};
