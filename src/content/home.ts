import type { Locale } from '@/i18n/config';

/**
 * Homepage copy.
 *
 * Arabic is written as Arabic, not translated from the English. Where the two differ in
 * phrasing that is deliberate — a calque of an English headline reads as a translation, and
 * the brief requires Arabic that does not feel like an afterthought.
 *
 * No prices, no response-time promises, no engineering claims, no invented testimonials.
 */

type Bilingual = Record<Locale, string>;
type BilingualList = Record<Locale, string[]>;

export const hero: {
  /**
   * The two display words the hero weaves the film between — the brand name, split in two.
   *
   * Locale-specific, and not a translation: the English lockup is "Egypt / Elevators" and the
   * Arabic one is the company's real registered name, «مصر العربية للمصاعد», split so the
   * short half sits above the film and the long half below it, exactly as the English does.
   * It was previously hard-coded English in both locales, which left the largest type on the
   * Arabic homepage in the wrong language and the wrong script.
   */
  wordmark: Record<Locale, readonly [string, string]>;
  headline: Bilingual;
  lede: Bilingual;
  ctaPrimary: Bilingual;
  ctaSecondary: Bilingual;
  /** Annotation printed over the hero footage. Describes what is on screen. */
  mediaLabel: Bilingual;
  /**
   * The positioning claim, supplied by the owner on 2026-08-12 and printed as given.
   *
   * It replaces the pricing note that used to sit in this slot — the owner asked for that note
   * removed and for this line to lead the homepage instead. The pricing position itself is not
   * lost: the process section and the inspection page both still say that measurement comes
   * before any figure, and no price appears anywhere on the site.
   */
  claim: Bilingual;
} = {
  wordmark: {
    en: ['Egypt', 'Elevators'],
    ar: ['مصر', 'العربية للمصاعد'],
  },
  headline: {
    en: 'Elevating architecture through glass',
    // Not a calque. "When the elevator becomes part of the architecture."
    ar: 'حين يصبح المصعد جزءًا من العمارة',
  },
  ctaPrimary: {
    en: 'Request a site inspection',
    ar: 'اطلب معاينة الموقع',
  },
  ctaSecondary: {
    en: 'Explore our work',
    ar: 'تصفَّح أعمالنا',
  },
  // Describes the hero footage that actually ships: the approved 1920x1080 villa walkthrough
  // (SHOW PRODUT/2026-08-05 23.20.17.mp4), which is the same installation as the
  // parquet-salon-villa stills.
  mediaLabel: {
    en: 'Brass and glass car — private villa',
    ar: 'كابينة نحاس وزجاج — فيلا خاصة',
  },
  // Owner's wording, 2026-08-12. Arabic is the source here and the English mirrors it, which
  // is why neither reads as a translation of the other.
  lede: {
    en: 'We build fully panoramic elevators — glass on every face of the car, and a complete view from inside it.',
    ar: 'نحن نبني مصاعد بانورامية بالكامل تسمح برؤية كاملة.',
  },
  claim: {
    en: 'The first and only company in Egypt manufacturing and installing full panoramic home lifts.',
    ar: 'الأولى والوحيدة في مصر لصناعة وتركيب الهوم ليفت الفول بانوراميك.',
  },
};

export const proof: {
  eyebrow: Bilingual;
  heading: Bilingual;
  /**
   * The company statement, supplied by the owner on 2026-08-12 and printed as given.
   *
   * It is the one place on the homepage that names the drive types and the buildings the
   * company works in, and it carries the owner's own experience figure. It leads this section
   * because this section is where the site states what is on the record.
   */
  lede: Bilingual;
  body: BilingualList;
  coverageLabel: Bilingual;
} = {
  eyebrow: { en: 'On record', ar: 'موثّق' },
  heading: {
    en: 'A documented record, counted honestly',
    ar: 'سجل موثّق، محسوب بأمانة',
  },
  lede: {
    en: 'Egypt Elevators supplies electro-hydraulic and electro-mechanical elevators — for villas, for companies, for museums and for factories — with more than twenty years of experience behind them.',
    ar: 'تقدّم لك شركة مصر العربية أفضل المصاعد الكهروهيدروليك والكهروميكانيك، سواء للفيلات أو الشركات والمتاحف والمصانع، بخبرة أكثر من عشرين عامًا.',
  },
  body: {
    en: [
      'Our 2025 work log lists 213 project records. 51 of them are classified as panorama.',
      'We quote that split rather than the headline number, because the two are not the same thing and it would be easy to imply otherwise.',
    ],
    ar: [
      'يضم سجل أعمالنا لعام 2025 عدد 213 سجل مشروع، منها 51 سجلًا مصنفًا ضمن مصاعد البانوراما.',
      'نذكر هذا التفصيل لا الرقم الإجمالي وحده، لأن الاثنين ليسا شيئًا واحدًا، ومن السهل الإيحاء بغير ذلك.',
    ],
  },
  coverageLabel: { en: 'Where we have worked', ar: 'أين عملنا' },
};

export const panoramaStory: {
  eyebrow: Bilingual;
  heading: Bilingual;
  lede: Bilingual;
  points: Record<Locale, { title: string; body: string }[]>;
} = {
  eyebrow: { en: 'The product', ar: 'المنتج' },
  heading: {
    en: 'An architectural element that happens to move',
    ar: 'عنصر معماري يتحرك',
  },
  lede: {
    en: 'A panorama elevator is not a machine hidden in a shaft. It is a glazed volume standing in a room, and it has to earn its place there.',
    ar: 'مصعد البانوراما ليس آلة مخبّأة داخل بئر مغلق، بل كتلة مزجّجة تقف داخل غرفة، وعليها أن تستحق موضعها فيها.',
  },
  points: {
    en: [
      {
        title: 'It keeps the light',
        body: 'A solid shaft takes daylight out of a stairwell. A glazed car lets it through, which is usually why the glass was wanted in the first place.',
      },
      {
        title: 'It keeps the view',
        body: 'The car is transparent in both directions. You see the hall from inside it, and the hall keeps its depth from outside it.',
      },
      {
        title: 'The frame is the finish',
        body: 'Brass or dark metal, glass clear or smoked. The frame is what people actually see, so it is chosen against the floor, the stair and the light in that specific room.',
      },
      {
        title: 'The plan is not always a rectangle',
        body: 'Where the stair turns, the car can be faceted to turn with it rather than forcing the room to give up a corner.',
      },
    ],
    ar: [
      {
        title: 'يحافظ على الضوء',
        body: 'البئر المصمت يسلب بئر الدرج ضوءه النهاري، أما الكابينة المزجّجة فتمرره، وهو غالبًا سبب اختيار الزجاج من البداية.',
      },
      {
        title: 'يحافظ على الامتداد',
        body: 'الكابينة شفافة في الاتجاهين؛ ترى البهو من داخلها، ويظل البهو محتفظًا بعمقه من خارجها.',
      },
      {
        title: 'الإطار هو التشطيب',
        body: 'نحاس أو معدن داكن، وزجاج شفاف أو مدخّن. الإطار هو ما تراه العين فعلًا، لذا يُختار في مواجهة الأرضية والدرج وضوء تلك الغرفة تحديدًا.',
      },
      {
        title: 'المسقط ليس مستطيلًا دائمًا',
        body: 'حيث يدور الدرج، يمكن أن تكون الكابينة متعددة الأوجه لتدور معه بدلًا من أن تُجبر الغرفة على التنازل عن ركن.',
      },
    ],
  },
};

export const ascent: {
  eyebrow: Bilingual;
  heading: Bilingual;
} = {
  eyebrow: { en: 'The ascent', ar: 'الصعود' },
  heading: {
    en: 'Five floors, five installations',
    ar: 'خمسة أدوار، خمسة أعمال',
  },
};

export const projectsSection: {
  eyebrow: Bilingual;
  heading: Bilingual;
  lede: Bilingual;
} = {
  eyebrow: { en: 'Selected work', ar: 'أعمال مختارة' },
  heading: { en: 'Installations, as photographed', ar: 'أعمال مُنفَّذة، كما صُوّرت' },
  // Reworded 2026-08-12. The compounds are now named — the owner supplied them and asked for
  // them on the cards — so the old promise that no location is published is no longer true and
  // is not printed. Individual clients are still never named, and no street address appears.
  lede: {
    en: 'Photographs of our own installations, named by the compound each one stands in. Descriptions cover what is visible in the frame.',
    ar: 'صور لأعمال نفّذناها بأنفسنا، منسوبة إلى الكومباوند الذي تقف فيه. تصف النصوص ما هو ظاهر في الصورة.',
  },
};

export const process: {
  eyebrow: Bilingual;
  heading: Bilingual;
  lede: Bilingual;
  steps: Record<Locale, { title: string; body: string }[]>;
  note: Bilingual;
} = {
  eyebrow: { en: 'How it runs', ar: 'كيف يسير العمل' },
  heading: { en: 'From first call to handover', ar: 'من أول اتصال إلى التسليم' },
  lede: {
    en: 'Six stages. The second one is the one that decides the rest.',
    ar: 'ست مراحل، والثانية منها هي التي تحدد ما بعدها.',
  },
  steps: {
    en: [
      {
        title: 'Discovery',
        body: 'You tell us where the lift should go and what the space is doing now. Photographs help; they are not enough on their own.',
      },
      {
        title: 'Site inspection',
        body: 'We come and measure. Openings, floor levels, structure, access, power. Nothing after this point is guesswork, which is why nothing before it is a quotation.',
      },
      {
        title: 'Technical assessment',
        body: 'What the building allows, what it would need, and whether a panorama car is the right answer at all. If it is not, we say so.',
      },
      {
        title: 'Design alignment',
        body: 'Frame finish, glass, car dimensions and how the shaft meets the floors — agreed against the room it is going into.',
      },
      {
        title: 'Installation',
        body: 'Fitting on site, coordinated with whatever else is happening in the building.',
      },
      {
        title: 'Handover and support',
        body: 'Commissioning, a walk-through of the controls, and ongoing support.',
      },
    ],
    ar: [
      {
        title: 'التعارف',
        body: 'تخبرنا أين تريد المصعد وما الذي يجري في المكان حاليًا. الصور تساعد، لكنها لا تكفي وحدها.',
      },
      {
        title: 'المعاينة الميدانية',
        body: 'نأتي ونقيس: الفتحات، ومناسيب الأدوار، والإنشاء، والوصول، والتغذية الكهربائية. لا شيء بعد هذه النقطة تخمين، ولهذا لا شيء قبلها عرض سعر.',
      },
      {
        title: 'التقييم الفني',
        body: 'ما الذي يسمح به المبنى، وما الذي سيحتاجه، وهل مصعد البانوراما هو الحل المناسب أصلًا. وإن لم يكن، نقول ذلك.',
      },
      {
        title: 'الاتفاق على التصميم',
        body: 'تشطيب الإطار، ونوع الزجاج، وأبعاد الكابينة، وكيفية التقاء البئر بالأدوار — يُتفق عليها في مواجهة الغرفة التي سيقف فيها.',
      },
      {
        title: 'التركيب',
        body: 'التنفيذ في الموقع، بالتنسيق مع بقية الأعمال الجارية في المبنى.',
      },
      {
        title: 'التسليم والدعم',
        body: 'التشغيل والاختبار، وشرح لوحة التحكم، ثم الدعم المستمر.',
      },
    ],
  },
  note: {
    en: 'We do not publish fixed durations. How long a job takes depends on the building, and we would rather say that than print a number we cannot hold to.',
    ar: 'لا نَنشر مددًا زمنية ثابتة. المدة تعتمد على المبنى نفسه، ونفضل قول ذلك على طباعة رقم لا نستطيع الالتزام به.',
  },
};

export const mediaSection: {
  eyebrow: Bilingual;
  heading: Bilingual;
  lede: Bilingual;
  /** Sits under each film. States what the footage is; promises nothing it does not deliver. */
  filmNote: Bilingual;
} = {
  eyebrow: { en: 'On film', ar: 'على الشاشة' },
  heading: { en: 'Walk through a finished job', ar: 'جولة داخل عمل منفَّذ' },
  lede: {
    en: 'Our own footage of completed installations. Nothing plays until you ask it to, and nothing plays with sound you did not turn on.',
    ar: 'لقطات من تصويرنا لأعمال مكتملة. لا يبدأ أي فيلم إلا بطلبك، ولا يعمل بصوت لم تختره.',
  },
  filmNote: {
    en: 'Filmed on site by our team.',
    ar: 'من تصوير فريقنا في الموقع.',
  },
};

export const socialProof: {
  eyebrow: Bilingual;
  heading: Bilingual;
  lede: Bilingual;
  /** Shown beside the prints. Each line is a statement about the photographs themselves. */
  notes: Record<Locale, { term: string; detail: string }[]>;
  /** Tells the visitor the prints can be picked up. A drag nobody knows about is not a feature. */
  hint: Bilingual;
} = {
  eyebrow: { en: 'On site', ar: 'في الموقع' },
  heading: { en: 'Visitors to finished work', ar: 'زائرون لأعمال منفَّذة' },
  lede: {
    en: 'Photographs taken at completed installations. We do not name the people in them, and we make no claim about endorsement — the elevator is the subject.',
    ar: 'صور التُقطت في أعمال مكتملة. لا نذكر أسماء الأشخاص فيها ولا ندّعي أي رعاية أو تزكية؛ المصعد هو الموضوع.',
  },
  // Every line here is verifiable from the photographs and from the site's own policy. Nothing
  // about numbers of clients, satisfaction, or who anybody is.
  notes: {
    en: [
      { term: 'Where', detail: 'Inside finished installations, on handover day.' },
      { term: 'Who', detail: 'Unnamed, by policy. No one is identified anywhere on this site.' },
      {
        term: 'Claim',
        detail: 'None. A photograph is not a testimonial, and is not shown as one.',
      },
    ],
    ar: [
      { term: 'المكان', detail: 'داخل أعمال مكتملة، يوم التسليم.' },
      { term: 'الأشخاص', detail: 'بلا أسماء، سياسةً. لا نعرّف بأحد في أي صفحة من الموقع.' },
      { term: 'الادّعاء', detail: 'لا شيء. الصورة ليست شهادة عميل ولا تُعرض على أنها كذلك.' },
    ],
  },
  hint: {
    en: 'Pick a photograph up and move it — it finds its way back.',
    ar: 'التقط أي صورة وحرّكها — ستعود إلى مكانها.',
  },
};

export const finalCta: {
  heading: Bilingual;
  body: Bilingual;
  /**
   * Who the company works with, in the owner's own words (supplied 2026-08-12). It sits with
   * the closing call to action because that is the point at which a visitor is deciding
   * whether this company takes on work like theirs.
   */
  collaboration: Bilingual;
  reassurance: BilingualList;
} = {
  heading: {
    en: 'Book the inspection',
    ar: 'احجز المعاينة',
  },
  body: {
    en: 'Tell us where the building is and how to reach you. Someone from the team will arrange a visit to measure the space.',
    ar: 'أخبرنا بموقع المبنى وكيفية الوصول إليك، وسيتولى أحد أفراد الفريق ترتيب زيارة لقياس المكان.',
  },
  collaboration: {
    en: 'We are glad to advise, and to work with museums, public bodies, companies and individuals alike.',
    ar: 'يسعدنا تقديم الاستشارات والتعاون المثمر، سواء مع المتاحف والهيئات العامة والشركات أو الأفراد.',
  },
  reassurance: {
    en: [
      'The inspection is how we understand the building.',
      'No pricing is discussed before we have measured.',
      'Three fields to start: name, phone, and the area you are in.',
    ],
    ar: [
      'المعاينة هي الطريقة التي نفهم بها المبنى.',
      'لا نناقش أي تكلفة قبل القياس على الطبيعة.',
      'ثلاثة حقول للبداية: الاسم، ورقم الهاتف، والمنطقة.',
    ],
  },
};
