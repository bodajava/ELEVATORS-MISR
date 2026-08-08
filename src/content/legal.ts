import type { Locale } from '@/i18n/config';

/**
 * Privacy notice and terms.
 *
 * These describe **what this website actually does**, which is why they can be written now
 * even though the company's contact details are not confirmed: the data flows are a property
 * of the code, not of the business.
 *
 * Where a clause would need a fact we do not have — a registered address, a data-protection
 * contact, a retention period set by the company — it says so plainly and is marked as
 * outstanding, rather than inventing a value. Those gaps are listed in `outstanding` below so
 * they are visible on the page rather than buried.
 *
 * This is a plain-language notice written to describe real behaviour. It is not legal advice,
 * and the company should have it reviewed before launch.
 */

type Bilingual = Record<Locale, string>;
type Section = { heading: Bilingual; body: Record<Locale, string[]> };

export const privacy: {
  title: Bilingual;
  description: Bilingual;
  lede: Bilingual;
  sections: Section[];
  outstanding: Record<Locale, string[]>;
} = {
  title: { en: 'Privacy', ar: 'الخصوصية' },
  description: {
    en: 'What Egypt Elevators collects when you request a site inspection or use the assistant, why, and how long it is kept.',
    ar: 'ما تجمعه مصر العربية للمصاعد عند طلب معاينة أو استخدام المساعد، ولماذا، ومدة الاحتفاظ به.',
  },
  lede: {
    en: 'This page describes what this website does with your information. It is written to be read, not to be survived.',
    ar: 'تشرح هذه الصفحة ما يفعله هذا الموقع بمعلوماتك. كُتبت لتُقرأ، لا لتُحتمَل.',
  },
  sections: [
    {
      heading: { en: 'What we collect', ar: 'ما الذي نجمعه' },
      body: {
        en: [
          'When you submit a site-inspection request we collect the details you type: your name, phone number and the area you are in, plus anything optional you choose to add — email, customer type, building type, number of floors, project status, preferred contact time and notes.',
          'We also store the language you were using and the time the request arrived, in UTC. That is all. There is no file upload on this site, and we do not ask for identity documents, national numbers or payment details at any point.',
        ],
        ar: [
          'عند إرسال طلب معاينة نجمع البيانات التي تكتبها: الاسم ورقم الهاتف والمنطقة، إضافة إلى ما تختار إضافته اختياريًا — البريد الإلكتروني ونوع العميل ونوع المبنى وعدد الأدوار وحالة المشروع ووقت التواصل المفضل والملاحظات.',
          'كما نحتفظ باللغة التي كنت تستخدمها ووقت وصول الطلب بتوقيت UTC. هذا كل شيء. لا يوجد رفع ملفات في هذا الموقع، ولا نطلب مستندات هوية ولا رقمًا قوميًا ولا بيانات دفع في أي مرحلة.',
        ],
      },
    },
    {
      heading: { en: 'Why we collect it', ar: 'لماذا نجمعها' },
      body: {
        en: [
          'To contact you about the inspection you asked for, and to carry out that inspection. Nothing else.',
          'We do not sell your details, we do not share them with advertisers, and we do not add you to a mailing list because you asked for an inspection.',
        ],
        ar: [
          'للتواصل معك بشأن المعاينة التي طلبتها، ولتنفيذ تلك المعاينة. لا لشيء آخر.',
          'لا نبيع بياناتك، ولا نشاركها مع معلنين، ولا نضيفك إلى قائمة بريدية لمجرد أنك طلبت معاينة.',
        ],
      },
    },
    {
      heading: { en: 'The assistant', ar: 'المساعد' },
      body: {
        en: [
          'The assistant on this site is an AI, and it says so. Your messages are sent to an AI provider to generate a reply, and they are not stored as part of your record unless you explicitly submit a request or ask for a human to follow up.',
          'It only knows what this website publishes. It has no access to previous customers, project records, addresses or any internal document.',
        ],
        ar: [
          'المساعد في هذا الموقع ذكاء اصطناعي، وهو يقول ذلك عن نفسه. تُرسَل رسائلك إلى مزوّد الذكاء الاصطناعي لتوليد الرد، ولا تُحفَظ ضمن سجلك ما لم ترسل طلبًا صراحةً أو تطلب متابعة بشرية.',
          'لا يعرف إلا ما يَنشره هذا الموقع. لا وصول له إلى عملاء سابقين ولا سجلات مشروعات ولا عناوين ولا أي مستند داخلي.',
        ],
      },
    },
    {
      heading: { en: 'How long we keep it', ar: 'مدة الاحتفاظ' },
      body: {
        en: [
          'Inspection requests are kept for as long as needed to handle your enquiry and any work that follows from it.',
          'A specific retention period has not yet been set by the company. Until it is, this page will not state one — see the outstanding items below.',
        ],
        ar: [
          'تُحفَظ طلبات المعاينة طوال المدة اللازمة للتعامل مع طلبك وأي أعمال تترتب عليه.',
          'لم تحدد الشركة بعد مدة احتفاظ بعينها. وإلى أن تُحدَّد، لن تذكر هذه الصفحة مدة — راجع البنود المعلّقة أدناه.',
        ],
      },
    },
    {
      heading: { en: 'Your choices', ar: 'خياراتك' },
      body: {
        en: [
          'You can ask us to correct or delete your request at any time. Under Egypt’s Personal Data Protection Law (Law 151 of 2020) you have rights over your personal data, including access, correction and erasure.',
          'To exercise them, contact us — and note that the contact channel for data requests is one of the outstanding items below.',
        ],
        ar: [
          'يمكنك أن تطلب تصحيح بياناتك أو حذفها في أي وقت. وبموجب قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020 لك حقوق على بياناتك الشخصية، منها الاطلاع والتصحيح والمحو.',
          'ولممارستها تواصل معنا — مع ملاحظة أن قناة التواصل الخاصة بطلبات البيانات من البنود المعلّقة أدناه.',
        ],
      },
    },
    {
      heading: { en: 'Cookies and analytics', ar: 'ملفات تعريف الارتباط والتحليلات' },
      body: {
        en: [
          'This site sets one cookie, to remember whether you are reading in English or Arabic. It carries no identifier and is not used for tracking.',
          'No analytics or advertising provider is connected. If one is added later, this page will be updated before it goes live.',
        ],
        ar: [
          'يضع هذا الموقع ملف تعريف ارتباط واحدًا، لتذكّر ما إذا كنت تقرأ بالإنجليزية أم بالعربية. لا يحمل أي معرّف ولا يُستخدم للتتبع.',
          'لا يوجد أي مزوّد تحليلات أو إعلانات متصل بالموقع. وإن أُضيف لاحقًا، ستُحدَّث هذه الصفحة قبل تفعيله.',
        ],
      },
    },
  ],
  outstanding: {
    en: [
      'A registered business address',
      'A contact channel for data-protection requests',
      'A defined retention period for inspection requests',
    ],
    ar: [
      'عنوان مسجّل للشركة',
      'قناة تواصل لطلبات حماية البيانات',
      'مدة احتفاظ محددة بطلبات المعاينة',
    ],
  },
};

export const terms: {
  title: Bilingual;
  description: Bilingual;
  lede: Bilingual;
  sections: Section[];
} = {
  title: { en: 'Terms', ar: 'الشروط' },
  description: {
    en: 'The terms that apply to using the Egypt Elevators website, including what the site does and does not commit us to.',
    ar: 'الشروط المنطبقة على استخدام موقع مصر العربية للمصاعد، وما يلتزم به الموقع وما لا يلتزم به.',
  },
  lede: {
    en: 'What this website is, and what it is not.',
    ar: 'ما هو هذا الموقع، وما ليس هو.',
  },
  sections: [
    {
      heading: { en: 'This site is information, not an offer', ar: 'هذا الموقع معلومات لا عرضًا' },
      body: {
        en: [
          'Nothing on this website is a quotation, a contract, or a commitment to carry out work. We publish no prices, and no figure of any kind should be inferred from anything here.',
          'A site inspection request is a request for a visit. It does not create an agreement, and neither side is committed to anything by it.',
        ],
        ar: [
          'لا شيء في هذا الموقع يُعد عرض سعر أو عقدًا أو التزامًا بتنفيذ عمل. لا نَنشر أسعارًا، ولا ينبغي استنتاج أي رقم من أي محتوى هنا.',
          'طلب المعاينة هو طلب زيارة. لا ينشئ اتفاقًا، ولا يُلزم أي طرف بشيء.',
        ],
      },
    },
    {
      heading: { en: 'Feasibility is decided on site', ar: 'الجدوى تُحسم في الموقع' },
      body: {
        en: [
          'Whether a panorama elevator can be installed in a particular building, and what that would involve, is determined by physical inspection and technical assessment.',
          'Descriptions and photographs on this site show work we have completed elsewhere. They are not a statement about what is possible in your building.',
        ],
        ar: [
          'إمكانية تركيب مصعد بانوراما في مبنى بعينه، وما يستلزمه ذلك، تُحدَّد بالمعاينة على الطبيعة والتقييم الفني.',
          'الأوصاف والصور في هذا الموقع تعرض أعمالًا نفّذناها في مواقع أخرى، وليست تقريرًا عمّا هو ممكن في مبناك.',
        ],
      },
    },
    {
      heading: { en: 'The assistant', ar: 'المساعد' },
      body: {
        en: [
          'The assistant is an AI. It can be wrong, and it does not speak for the company. It does not give prices, engineering approval, feasibility decisions or timelines, and anything it says is superseded by what our team tells you after an inspection.',
        ],
        ar: [
          'المساعد ذكاء اصطناعي. قد يخطئ، ولا يتحدث باسم الشركة. لا يعطي أسعارًا ولا اعتمادات هندسية ولا قرارات جدوى ولا مواعيد، وكل ما يقوله يَسقط أمام ما يخبرك به فريقنا بعد المعاينة.',
        ],
      },
    },
    {
      heading: { en: 'Images and content', ar: 'الصور والمحتوى' },
      body: {
        en: [
          'The photographs and films on this site are of our own work and remain our property. Please do not reuse them without permission.',
          'Where a photograph carries another company’s mark, that mark belongs to them and is shown as it appears in the original.',
        ],
        ar: [
          'الصور والأفلام في هذا الموقع من أعمالنا وتظل ملكًا لنا. يُرجى عدم إعادة استخدامها دون إذن.',
          'وحين تحمل صورة علامة شركة أخرى، فتلك العلامة ملك لأصحابها وتُعرض كما هي في الأصل.',
        ],
      },
    },
  ],
};
