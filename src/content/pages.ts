import type { Locale } from '@/i18n/config';

/**
 * Page-level copy for the inner routes.
 *
 * Same rules as everywhere: no prices, no response-time promises, no engineering claims, no
 * invented facts. Arabic is written as Arabic.
 */

type Bilingual = Record<Locale, string>;
type BilingualList = Record<Locale, string[]>;

export const projectsPage: {
  title: Bilingual;
  description: Bilingual;
  heading: Bilingual;
  lede: Bilingual;
  filterAll: Bilingual;
  filterLabel: Bilingual;
  countLabel: Record<Locale, (n: number) => string>;
} = {
  title: { en: 'Projects', ar: 'المشروعات' },
  description: {
    en: 'Panorama elevator installations by Egypt Elevators, photographed on site. Brass and glass, and smoked glass, in private villas and residences across Egypt.',
    ar: 'أعمال مصاعد بانوراما نفّذتها مصر العربية للمصاعد، مصوَّرة في مواقعها. نحاس وزجاج، وزجاج مدخّن، في فلل ومساكن خاصة في أنحاء مصر.',
  },
  heading: { en: 'Installations', ar: 'أعمال منفَّذة' },
  lede: {
    en: 'Our own photographs, grouped by finish — the axis the work actually divides on. Descriptions cover what is visible in the frame; we publish no client names or addresses.',
    ar: 'صورنا الخاصة، مرتّبة حسب التشطيب، وهو المحور الذي تنقسم عليه الأعمال فعلًا. تصف النصوص ما هو ظاهر في الصورة، ولا نَنشر أسماء العملاء ولا عناوينهم.',
  },
  filterAll: { en: 'All finishes', ar: 'كل التشطيبات' },
  filterLabel: { en: 'Filter by finish', ar: 'تصفية حسب التشطيب' },
  countLabel: {
    en: (n) => `${n} ${n === 1 ? 'installation' : 'installations'}`,
    ar: (n) => (n === 1 ? 'عمل واحد' : `${n} أعمال`),
  },
};

export const panoramaPage: {
  title: Bilingual;
  description: Bilingual;
  heading: Bilingual;
  lede: Bilingual;
  sections: Record<Locale, { heading: string; body: string[] }[]>;
  whereHeading: Bilingual;
  where: BilingualList;
  limitsHeading: Bilingual;
  limits: BilingualList;
} = {
  title: { en: 'Panorama elevators', ar: 'مصاعد البانوراما' },
  description: {
    en: 'What a panorama elevator is, where it works, and what has to be true of the building before one can go in. Egypt Elevators builds panorama elevators exclusively.',
    ar: 'ما هو مصعد البانوراما، وأين يصلح، وما الذي يجب توافره في المبنى قبل تركيبه. مصر العربية للمصاعد متخصصة في مصاعد البانوراما وحدها.',
  },
  heading: { en: 'Panorama elevators', ar: 'مصاعد البانوراما' },
  lede: {
    en: 'A glazed car in a glazed shaft, standing in the room rather than hidden beside it. This is the only kind of elevator we build.',
    ar: 'كابينة مزجّجة داخل بئر مزجّج، تقف داخل الغرفة بدلًا من أن تختبئ بجوارها. وهذا هو النوع الوحيد من المصاعد الذي ننفّذه.',
  },
  sections: {
    en: [
      {
        heading: 'What makes it a panorama elevator',
        body: [
          'The car and the shaft are both glazed, so the lift is transparent from inside and outside. That is the whole idea: you can see out of it, and the room can see through it.',
          'Everything else follows from that. The frame becomes a visible finish rather than hidden structure, the shaft becomes part of the room’s composition, and the position of the car in the plan matters as much as the fact that it works.',
        ],
      },
      {
        heading: 'Finishes',
        body: [
          'Our work divides into two: brass-framed with clear or warm-tinted glass, and dark metal with smoked glass.',
          'Brass suits warm rooms — marble, timber, classical panelling, warm lighting. Smoked glass suits cooler contemporary interiors, where the car should read as a quiet dark volume rather than a bright object.',
        ],
      },
      {
        heading: 'Shape',
        body: [
          'A rectangular plan is the common case, but not the only one. Where a stair turns or a hall narrows, a faceted plan lets the car follow the room instead of forcing the room to give up a corner.',
        ],
      },
    ],
    ar: [
      {
        heading: 'ما الذي يجعله مصعد بانوراما',
        body: [
          'الكابينة والبئر كلاهما مزجّج، فيصبح المصعد شفافًا من الداخل والخارج. هذه هي الفكرة كلها: ترى من داخله، وترى الغرفة من خلاله.',
          'وكل ما عدا ذلك يتبع هذه الفكرة: يصير الإطار تشطيبًا ظاهرًا لا هيكلًا مخفيًا، ويصير البئر جزءًا من تكوين الغرفة، ويصبح موضع الكابينة في المسقط لا يقل أهمية عن كونها تعمل.',
        ],
      },
      {
        heading: 'التشطيبات',
        body: [
          'تنقسم أعمالنا إلى اثنين: إطار نحاسي مع زجاج شفاف أو بلون دافئ، ومعدن داكن مع زجاج مدخّن.',
          'النحاس يناسب الغرف الدافئة: الرخام والخشب والكسوة الكلاسيكية والإضاءة الدافئة. والزجاج المدخّن يناسب المساحات المعاصرة الأكثر برودة، حيث يُفترض أن تُقرأ الكابينة ككتلة داكنة هادئة لا كعنصر لامع.',
        ],
      },
      {
        heading: 'الشكل',
        body: [
          'المسقط المستطيل هو الحالة الشائعة، لكنه ليس الوحيد. فحين يدور الدرج أو يضيق البهو، يتيح المسقط متعدد الأوجه للكابينة أن تتبع الغرفة بدلًا من أن تُجبر الغرفة على التنازل عن ركن.',
        ],
      },
    ],
  },
  whereHeading: { en: 'Where they go', ar: 'أين تُركَّب' },
  where: {
    en: [
      'Private villas, most often beside the main stair',
      'Houses and residences, where a stairwell would otherwise lose its daylight',
      'Buildings under construction, where the shaft can be planned rather than retrofitted',
      'Existing buildings, where the opening has to be worked out on site',
    ],
    ar: [
      'الفلل الخاصة، وغالبًا بجوار الدرج الرئيسي',
      'المنازل والمساكن، حيث يفقد بئر الدرج ضوءه النهاري بغير ذلك',
      'المباني تحت الإنشاء، حيث يمكن تخطيط البئر بدلًا من إضافته لاحقًا',
      'المباني القائمة، حيث تُدرس الفتحة على الطبيعة',
    ],
  },
  limitsHeading: { en: 'What we will not tell you online', ar: 'ما لا نقوله عبر الموقع' },
  limits: {
    en: [
      'Whether a panorama car fits your building. That needs measurements, not photographs.',
      'A price, a range, or an estimate. Pricing follows the inspection.',
      'How long it will take. That depends on the building.',
      'Load, speed, or specification figures. We would rather say nothing than publish a number we have not confirmed for your project.',
    ],
    ar: [
      'هل تصلح كابينة بانوراما لمبناك. هذا يحتاج قياسات لا صورًا.',
      'سعرًا أو نطاقًا سعريًا أو تقديرًا. تحديد التكلفة يأتي بعد المعاينة.',
      'كم سيستغرق التنفيذ. هذا يعتمد على المبنى نفسه.',
      'أرقام الحمولة أو السرعة أو المواصفات. نفضّل ألا نقول شيئًا على أن نَنشر رقمًا لم نتحقق منه لمشروعك.',
    ],
  },
};

export const aboutPage: {
  title: Bilingual;
  description: Bilingual;
  heading: Bilingual;
  lede: Bilingual;
  body: BilingualList;
  positionHeading: Bilingual;
  positions: Record<Locale, { title: string; body: string }[]>;
} = {
  title: { en: 'About', ar: 'عن الشركة' },
  description: {
    en: 'Egypt Elevators is the English name of مصر العربية للمصاعد, a registered Egyptian elevator company specialising in panorama elevators.',
    ar: 'مصر العربية للمصاعد، شركة مصرية مسجّلة متخصصة في مصاعد البانوراما.',
  },
  heading: { en: 'About Egypt Elevators', ar: 'عن مصر العربية للمصاعد' },
  lede: {
    en: 'A registered Egyptian elevator company. On this website we show one part of the business: panorama elevators.',
    ar: 'شركة مصاعد مصرية مسجّلة. نعرض على هذا الموقع جانبًا واحدًا من نشاطها: مصاعد البانوراما.',
  },
  body: {
    en: [
      'The company supplies, installs, repairs and maintains lifts, and is registered in Egypt under commercial registration 151595. Its Arabic name is مصر العربية للمصاعد; “Egypt Elevators” is the English name we use for this website, and “Arab Egypt Co. for Lifts” appears on company documents.',
      'This site covers panorama elevators only. Our 2025 work log lists 213 project records, of which 51 are classified as panorama — the rest are hydraulic, traction and dumbwaiter lifts, and they are not what this site is about.',
    ],
    ar: [
      'تقوم الشركة بتوريد وتركيب وإصلاح وصيانة المصاعد، وهي مسجّلة في مصر تحت السجل التجاري رقم 151595. اسمها العربي «مصر العربية للمصاعد»، ونستخدم «Egypt Elevators» اسمًا إنجليزيًا لهذا الموقع، بينما يظهر «Arab Egypt Co. for Lifts» على مستندات الشركة.',
      'يقتصر هذا الموقع على مصاعد البانوراما. يضم سجل أعمالنا لعام 2025 عدد 213 سجل مشروع، منها 51 مصنّفًا ضمن مصاعد البانوراما، والباقي مصاعد هيدروليك وكهربائية ومصاعد طعام، وهي ليست موضوع هذا الموقع.',
    ],
  },
  positionHeading: { en: 'How we work', ar: 'كيف نعمل' },
  positions: {
    en: [
      {
        title: 'We measure before we price',
        body: 'No figure is quoted before a physical inspection. A price given over the phone is a guess, and a guess that turns out wrong helps nobody.',
      },
      {
        title: 'We say no when the answer is no',
        body: 'If a panorama car is the wrong solution for a building, the inspection is where you find that out — and we will tell you.',
      },
      {
        title: 'We publish what we can show',
        body: 'Every photograph on this site is of our own work. We do not use stock imagery, and we do not name clients or publish addresses.',
      },
    ],
    ar: [
      {
        title: 'نقيس قبل أن نُسعّر',
        body: 'لا يُذكر أي رقم قبل معاينة على الطبيعة. السعر الذي يُعطى عبر الهاتف تخمين، والتخمين الذي يتبيّن خطؤه لا يفيد أحدًا.',
      },
      {
        title: 'نقول «لا» حين تكون الإجابة لا',
        body: 'إن كانت كابينة البانوراما حلًا غير مناسب لمبنى ما، فالمعاينة هي حيث تعرف ذلك، وسنقوله لك.',
      },
      {
        title: 'نَنشر ما نستطيع إثباته',
        body: 'كل صورة على هذا الموقع من أعمالنا نحن. لا نستخدم صورًا جاهزة، ولا نذكر أسماء عملاء، ولا نَنشر عناوين.',
      },
    ],
  },
};

export const contactPage: {
  title: Bilingual;
  description: Bilingual;
  heading: Bilingual;
  lede: Bilingual;
  formHeading: Bilingual;
  noContactHeading: Bilingual;
  noContactBody: Bilingual;
} = {
  title: { en: 'Request a site inspection', ar: 'اطلب معاينة الموقع' },
  description: {
    en: 'Request a physical site inspection for a panorama elevator. Name, phone and area are all we need to start.',
    ar: 'اطلب معاينة ميدانية لمصعد بانوراما. الاسم ورقم الهاتف والمنطقة هي كل ما نحتاجه للبدء.',
  },
  heading: { en: 'Request a site inspection', ar: 'اطلب معاينة الموقع' },
  lede: {
    en: 'Three fields to start. Everything else is optional, and everything else can wait until we speak.',
    ar: 'ثلاثة حقول للبداية. وما عداها اختياري، ويمكن أن ينتظر حتى نتحدث.',
  },
  formHeading: { en: 'Your details', ar: 'بياناتك' },
  noContactHeading: { en: 'Other ways to reach us', ar: 'طرق أخرى للتواصل' },
  noContactBody: {
    en: 'We are confirming our published phone number and email. Until that is done we are not printing one, because a number that turns out to be wrong is worse than no number. The form above reaches the team.',
    ar: 'نعمل على تأكيد رقم الهاتف والبريد الإلكتروني المنشورَين. وإلى أن يتم ذلك لن نَنشر رقمًا، لأن رقمًا يتبيّن خطؤه أسوأ من عدم وجود رقم. النموذج أعلاه يصل إلى الفريق.',
  },
};
