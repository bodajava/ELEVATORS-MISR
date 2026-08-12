import type { Locale } from '@/i18n/config';

/**
 * Installation records.
 *
 * Every description here states either what is **visibly verifiable in the photograph** —
 * finish, setting, materials in frame, how the car sits in the architecture — or a fact the
 * owner supplied directly.
 *
 * Four records carry an owner-supplied compound name, stop count or car capacity, given on
 * 2026-08-12 and flagged with `ownerSupplied` below. Those are the only statements here that
 * cannot be read off the photograph, and each is printed as it was given.
 *
 * Still absent everywhere, because none of it has been supplied or can be verified: individual
 * client names, street addresses, travel heights, load ratings, speeds, glass specifications,
 * standards compliance, dates and durations. See docs/content-guide.md.
 */

export type Finish = 'brass' | 'smoked-glass';

export type ProjectSetting = 'villa' | 'residence' | 'in-progress';

export type Project = {
  slug: string;
  /** The gallery's organising axis — the two finishes the photography actually splits into. */
  finish: Finish;
  setting: ProjectSetting;
  /** Order on the index page. Lower first. */
  order: number;
  /** Show on the homepage's selected-work section. */
  featured: boolean;
  /**
   * Set where the title or summary carries a fact the owner supplied rather than one read off
   * the photograph — a compound name, a stop count, a car capacity. Provenance, so a later
   * reader can tell the two kinds of statement apart without reopening the images.
   */
  ownerSupplied?: true;
  title: Record<Locale, string>;
  /** One line for cards. */
  summary: Record<Locale, string>;
  /** Two or three sentences for the detail page. Visible facts only. */
  body: Record<Locale, string[]>;
  /** Alt text, written per project from what is actually in frame. */
  alt: Record<Locale, string>;
};

export const projects: readonly Project[] = [
  {
    slug: 'chandelier-hall-villa',
    finish: 'brass',
    setting: 'villa',
    order: 1,
    featured: true,
    title: {
      en: 'Brass and glass in a classical hall',
      ar: 'نحاس وزجاج في بهو كلاسيكي',
    },
    summary: {
      en: 'A brass-framed panorama car set against panelled walls and a dark marble stair.',
      ar: 'كابينة بانوراما بإطار نحاسي أمام جدران مكسوة بالكسوة الكلاسيكية ودرج من الرخام الداكن.',
    },
    body: {
      en: [
        'The car stands in the main hall of a private villa, its brass frame picking up the warmth of the chandelier above and the veining of the marble underfoot.',
        'Glass on every face keeps the hall readable through the shaft — the stair, the panelled wall and the planting behind it all stay visible rather than being closed off by a solid enclosure.',
      ],
      ar: [
        'تقف الكابينة في البهو الرئيسي لفيلا خاصة، ويلتقط إطارها النحاسي دفء الثريا المعلقة أعلاها وتعرّجات الرخام تحتها.',
        'الزجاج على كل الأوجه يُبقي البهو مقروءًا من خلال البئر، فيظل الدرج والجدار المكسو والنباتات خلفه ظاهرة بدلًا من أن يحجبها هيكل مصمت.',
      ],
    },
    alt: {
      en: 'Brass-framed glass panorama elevator in a villa hall, beside a dark marble staircase, with a chandelier overhead and a palm to one side.',
      ar: 'مصعد بانوراما زجاجي بإطار نحاسي في بهو فيلا، بجوار درج من الرخام الداكن، وثريا معلقة أعلاه ونخلة إلى جانبه.',
    },
  },
  {
    slug: 'garden-view-residence',
    finish: 'smoked-glass',
    setting: 'residence',
    order: 2,
    featured: true,
    ownerSupplied: true,
    title: {
      en: 'Katameya Heights compound',
      ar: 'كومباوند قطامية هايتس',
    },
    summary: {
      en: 'A fully panoramic elevator, three-person car — set where the garden glazing meets the stair.',
      ar: 'مصعد بانوراما بالكامل، ثلاثة راكب — حيث يلتقي زجاج الحديقة بالدرج.',
    },
    body: {
      en: [
        'Here the car reads as a dark volume rather than a bright one. Smoked glass keeps it quiet against pale walls and an oak floor, and lets the garden beyond the full-height glazing stay the brightest thing in the room.',
        'The shaft sits directly beside the stair, so the two ways up the house are read together instead of the lift being tucked out of sight.',
      ],
      ar: [
        'هنا تُقرأ الكابينة ككتلة داكنة لا كعنصر لامع. الزجاج المدخّن يجعلها هادئة أمام الجدران الفاتحة وأرضية البلوط، ويترك الحديقة خلف الزجاج الممتد لكامل الارتفاع أكثر ما يضيء المكان.',
        'يقع البئر بمحاذاة الدرج مباشرة، فتُقرأ وسيلتا الصعود معًا بدلًا من إخفاء المصعد بعيدًا عن العين.',
      ],
    },
    alt: {
      en: 'Smoked glass panorama elevator in a modern home, beside a glass balustrade and full-height windows looking onto a garden.',
      ar: 'مصعد بانوراما من الزجاج المدخّن في منزل حديث، بجوار درابزين زجاجي ونوافذ ممتدة تطل على حديقة.',
    },
  },
  {
    slug: 'parquet-salon-villa',
    finish: 'brass',
    setting: 'villa',
    order: 3,
    featured: true,
    ownerSupplied: true,
    title: {
      en: 'Al Mukhabarat compound — Al Diyar',
      ar: 'كومباوند المخابرات — الديار',
    },
    summary: {
      en: 'A fully panoramic elevator with four stops, in New Cairo — a multi-sided brass and glass car opening onto the main salon.',
      ar: 'مصعد بانوراما بالكامل، أربع وقفات — التجمع الخامس. كابينة نحاسية زجاجية متعددة الأضلاع تطل على الصالون الرئيسي.',
    },
    body: {
      en: [
        'The plan is not a plain rectangle. The car is faceted, which lets it turn the corner between the stair and the salon rather than blocking one to serve the other.',
        'Brass uprights and clear glass sit against parquet and a stone stair, so the lift belongs to the room it stands in.',
      ],
      ar: [
        'المسقط ليس مستطيلًا بسيطًا؛ فالكابينة متعددة الأوجه، ما يتيح لها أن تدور عند الركن بين الدرج والصالون بدلًا من أن تسدّ أحدهما لخدمة الآخر.',
        'القوائم النحاسية والزجاج الشفاف أمام الباركيه ودرج حجري، فيبدو المصعد جزءًا من الغرفة التي يقف فيها.',
      ],
    },
    alt: {
      en: 'Faceted brass and glass panorama elevator on a parquet floor, opening onto a villa salon with a stone staircase alongside.',
      ar: 'مصعد بانوراما نحاسي وزجاجي متعدد الأوجه فوق أرضية باركيه، يطل على صالون فيلا وبجانبه درج حجري.',
    },
  },
  {
    slug: 'dark-timber-stair-villa',
    finish: 'brass',
    setting: 'villa',
    order: 4,
    featured: true,
    ownerSupplied: true,
    title: {
      en: 'Atrio compound — Sheikh Zayed',
      ar: 'كومباوند أتريو — الشيخ زايد',
    },
    summary: {
      en: 'A fully transparent glass elevator with three stops, wrapped by a dark timber and black marble stair.',
      ar: 'مصعد زجاجي شفاف بالكامل، ثلاث وقفات، يحيط به درج من الخشب الداكن والرخام الأسود.',
    },
    body: {
      en: [
        'The stair here is heavy — dark timber treads on a black marble base — so the car is glazed in a warm champagne tone that keeps it light against all that mass.',
        'The two rise together in the same volume, the glass letting the stair remain the visible structure.',
      ],
      ar: [
        'الدرج هنا ثقيل الحضور، درجات من الخشب الداكن على قاعدة من الرخام الأسود، لذا جاء تزجيج الكابينة بلون شمبانيا دافئ يُبقيها خفيفة أمام هذه الكتلة.',
        'يصعد الاثنان معًا في الحيّز نفسه، ويترك الزجاج الدرج هو البنية الظاهرة.',
      ],
    },
    alt: {
      en: 'Brass-framed panorama elevator with champagne-tinted glass next to a dark timber staircase on a black marble base.',
      ar: 'مصعد بانوراما بإطار نحاسي وزجاج بلون الشمبانيا بجوار درج من الخشب الداكن على قاعدة من الرخام الأسود.',
    },
  },
  {
    slug: 'beige-marble-villa',
    finish: 'brass',
    setting: 'villa',
    order: 5,
    featured: true,
    ownerSupplied: true,
    title: {
      en: 'Villa SODIC compound — New Cairo',
      ar: 'كومباوند فيلا سوديك — التجمع الخامس',
    },
    summary: {
      en: 'A transparent gold hydraulic elevator, in a pale marble hall lit by wall sconces.',
      ar: 'مصعد ذهبي شفاف، هيدروليكي، في بهو من الرخام الفاتح تضيئه أباجورات جدارية.',
    },
    body: {
      en: [
        'Pale marble and warm glass, with the brass frame reading as a drawn line rather than a solid edge.',
        'The car sits at the turn of the stair, where it can be reached from the hall without crossing the room.',
      ],
      ar: [
        'رخام فاتح وزجاج دافئ، ويبدو الإطار النحاسي كخط مرسوم لا كحافة مصمتة.',
        'تقع الكابينة عند منعطف الدرج، حيث يمكن الوصول إليها من البهو دون عبور الغرفة.',
      ],
    },
    alt: {
      en: 'Faceted brass panorama elevator with warm-toned glass in a beige marble villa hall with wall sconces.',
      ar: 'مصعد بانوراما نحاسي متعدد الأوجه بزجاج دافئ اللون في بهو فيلا من الرخام البيج مع أباجورات جدارية.',
    },
  },
  {
    slug: 'grey-marble-stair-hall',
    finish: 'smoked-glass',
    setting: 'villa',
    order: 6,
    featured: true,
    title: {
      en: 'Dark glass in a grey marble hall',
      ar: 'زجاج داكن في بهو من الرخام الرمادي',
    },
    summary: {
      en: 'A near-black glass car standing against grey marble and a pale stair.',
      ar: 'كابينة زجاجية شبه سوداء أمام رخام رمادي ودرج فاتح.',
    },
    body: {
      en: [
        'A restrained pairing: near-black glass, a slim dark frame, and grey marble on the floor and stair.',
        'The car reads as a single dark plane in a light room — present, but not competing with the stair beside it.',
      ],
      ar: [
        'تركيبة متحفظة: زجاج شبه أسود، وإطار نحيل داكن، ورخام رمادي على الأرضية والدرج.',
        'تُقرأ الكابينة كمستوٍ داكن واحد داخل غرفة فاتحة، حاضرة دون أن تنافس الدرج المجاور.',
      ],
    },
    alt: {
      en: 'Near-black smoked glass panorama elevator in a grey marble hall beside a pale stone staircase.',
      ar: 'مصعد بانوراما من الزجاج المدخّن شبه الأسود في بهو من الرخام الرمادي بجوار درج حجري فاتح.',
    },
  },
  {
    slug: 'chevron-marble-villa',
    finish: 'smoked-glass',
    setting: 'residence',
    order: 7,
    featured: false,
    title: {
      en: 'Above a chevron marble floor',
      ar: 'فوق أرضية رخامية بنقش الشيفرون',
    },
    summary: {
      en: 'A bronze-toned car in a graphic black-and-white interior.',
      ar: 'كابينة بلون برونزي في مساحة داخلية بالأبيض والأسود.',
    },
    body: {
      en: [
        'The floor does the talking here — black and white marble laid in a chevron that runs the length of the hall.',
        'The car is glazed in bronze so it settles into that pattern rather than fighting it, under a timber ceiling with track lighting.',
      ],
      ar: [
        'الأرضية هي صاحبة الكلمة هنا: رخام أبيض وأسود مرصوف بنقش شيفرون يمتد على طول البهو.',
        'زُجّجت الكابينة باللون البرونزي لتستقر داخل هذا النقش لا لتنافسه، تحت سقف خشبي بإضاءة مسارية.',
      ],
    },
    alt: {
      en: 'Bronze-toned glass panorama elevator above a black and white chevron marble floor, under a timber ceiling.',
      ar: 'مصعد بانوراما زجاجي بلون برونزي فوق أرضية رخامية بنقش الشيفرون بالأبيض والأسود، تحت سقف خشبي.',
    },
  },
  {
    slug: 'warm-stone-stair',
    finish: 'smoked-glass',
    setting: 'villa',
    order: 8,
    featured: false,
    title: {
      en: 'Dark glass on warm stone',
      ar: 'زجاج داكن على حجر دافئ',
    },
    summary: {
      en: 'A smoked glass car against warm stone treads under cove lighting.',
      ar: 'كابينة زجاجية مدخّنة أمام درجات من الحجر الدافئ تحت إضاءة مخفية.',
    },
    body: {
      en: [
        'Warm cove lighting along the ceiling puts the stone stair in a soft light and leaves the glazed car reading darker still.',
      ],
      ar: [
        'إضاءة مخفية دافئة على امتداد السقف تضع الدرج الحجري في ضوء ناعم وتترك الكابينة المزجّجة أكثر عتمة.',
      ],
    },
    alt: {
      en: 'Smoked glass panorama elevator beside warm stone stair treads, lit by ceiling cove lighting.',
      ar: 'مصعد بانوراما من الزجاج المدخّن بجوار درجات من الحجر الدافئ، تضيئه إضاءة سقف مخفية.',
    },
  },
  {
    slug: 'timber-stair-install',
    finish: 'brass',
    setting: 'in-progress',
    order: 9,
    featured: false,
    title: {
      en: 'Installation: brass car, timber stair',
      ar: 'أثناء التركيب: كابينة نحاسية ودرج خشبي',
    },
    summary: {
      en: 'Photographed during installation, before the surrounding finishes went in.',
      ar: 'صُوّرت أثناء التركيب، قبل تنفيذ التشطيبات المحيطة.',
    },
    body: {
      en: [
        'A brass and glass car in place while the space around it is still bare — protected floors, unpainted walls, and the stair not yet finished.',
        'Work is documented at this stage as well as at handover, because most of what determines the result is settled before anything is dressed.',
      ],
      ar: [
        'كابينة نحاسية زجاجية في موضعها بينما المساحة حولها ما تزال خامًا: أرضيات محمية، وجدران دون دهان، ودرج لم يكتمل بعد.',
        'يُوثَّق العمل في هذه المرحلة كما يُوثَّق عند التسليم، لأن معظم ما يحدد النتيجة يُحسم قبل أي تشطيب.',
      ],
    },
    alt: {
      en: 'Brass and glass panorama elevator installed beside a timber staircase, photographed mid-installation with bare floors.',
      ar: 'مصعد بانوراما نحاسي وزجاجي مركّب بجوار درج خشبي، مصوَّر أثناء التركيب والأرضيات ما تزال خامًا.',
    },
  },
  {
    slug: 'gilded-hall-install',
    finish: 'brass',
    setting: 'in-progress',
    order: 10,
    featured: false,
    title: {
      en: 'Installation: a gilded hall',
      ar: 'أثناء التركيب: بهو مذهَّب',
    },
    summary: {
      en: 'A brass car going in beneath an ornate coffered ceiling, mid-construction.',
      ar: 'كابينة نحاسية أثناء التركيب تحت سقف مقبب مزخرف، والعمل ما يزال جاريًا.',
    },
    body: {
      en: [
        'A tall, ornate hall with a coffered and gilded ceiling, columns and a balustraded stair — photographed while the floor was still under protection.',
        'The car is glazed and framed in brass to sit with the existing decorative scheme rather than against it.',
      ],
      ar: [
        'بهو مرتفع مزخرف بسقف مقبب مذهَّب وأعمدة ودرج بدرابزين، صُوّر والأرضية ما تزال تحت الحماية.',
        'زُجّجت الكابينة وأُطّرت بالنحاس لتنسجم مع الطابع الزخرفي القائم لا لتصطدم به.',
      ],
    },
    alt: {
      en: 'Brass panorama elevator under installation in an ornate hall with a gilded coffered ceiling and balustraded staircase.',
      ar: 'مصعد بانوراما نحاسي أثناء التركيب في بهو مزخرف بسقف مقبب مذهَّب ودرج بدرابزين.',
    },
  },
] as const;

export const featuredProjects = projects.filter((p) => p.featured);

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function projectSlugs(): string[] {
  return projects.map((p) => p.slug);
}

/** Finish labels for the gallery filter — the axis the photography genuinely splits on. */
/** Setting labels. Describes what the photograph shows, nothing about the client. */
export const settingLabels: Record<ProjectSetting, Record<Locale, string>> = {
  villa: { en: 'Private villa', ar: 'فيلا خاصة' },
  residence: { en: 'Private residence', ar: 'مسكن خاص' },
  'in-progress': { en: 'Mid-installation', ar: 'أثناء التركيب' },
};

export const finishLabels: Record<Finish, Record<Locale, string>> = {
  brass: { en: 'Brass and glass', ar: 'نحاس وزجاج' },
  'smoked-glass': { en: 'Smoked glass', ar: 'زجاج مدخّن' },
};
