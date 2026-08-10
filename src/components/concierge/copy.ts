import type { Locale } from '@/i18n/config';

/**
 * Concierge interface copy.
 *
 * Its own module so the launcher can show a label without pulling in the panel — the panel is
 * loaded on demand and this is the only thing both halves share.
 *
 * Nothing here promises a reply, a time, a price or a contact channel. The greeting is written
 * here rather than generated: it must be identical on every visit, cost nothing, and be
 * impossible for a model to reword into a promise.
 */
export const conciergeCopy = {
  en: {
    open: 'Customer care',
    title: 'Egypt Elevators — customer care',
    subtitle: 'Panorama elevators, how a project runs, and getting a person to call you back.',
    /** The assistant speaks first. A visitor never faces an empty box waiting for them. */
    greeting:
      'Hello — you have reached Egypt Elevators. Ask me about panorama elevators, how a project runs, or what happens at a site inspection. If you would rather speak to a person, or you want to raise a complaint, say so and I will take your details for the team.',
    placeholder: 'Type your question…',
    send: 'Send',
    close: 'Close',
    thinking: 'Typing…',
    unavailable:
      'The assistant is offline right now. You can still leave your details below and someone from the team will follow up.',
    error: 'That did not go through. Please try again.',
    rateLimited: 'That is several questions in a short time. Please wait a moment and try again.',
    cta: 'Request a site inspection',
    disclaimer:
      'Answers are general guidance. Anything specific to your building is decided at the site inspection.',
    suggestions: [
      'What is a panorama elevator?',
      'What happens during a site inspection?',
      'What are your working hours?',
      'Which finishes do you offer?',
    ],

    /* ── The human handoff ─────────────────────────────────────────────────
       Always one tap away, in the panel itself. The site's permitted contact paths are a
       closed list, and this is the one that reaches a person. */
    human: 'Talk to a person',
    complaint: 'I have a complaint',
    handoffTitle: 'Leave your details',
    handoffBody:
      'Someone from the team will follow up on the number you give. Please do not put a number in the chat itself — this form is where it belongs.',
    handoffCancel: 'Back to the chat',
    /** Prepended to the message so the team can see what the request is, not just who sent it. */
    reasonLabel: 'What is this about?',
    reasons: {
      question: 'A question for the team',
      complaint: 'A complaint',
      inspection: 'A site inspection',
    },
    fields: {
      name: 'Your name',
      phone: 'Phone number',
      area: 'Area or district',
      message: 'What would you like to say?',
      consent: 'You may contact me on this number about my request.',
    },
    submit: 'Send to the team',
    sending: 'Sending…',
    successTitle: 'Received',
    successBody:
      'Your request is with the team, under reference {reference}. Keep it if you get in touch again.',
    failure: 'Nothing was sent. Please check the fields and try again.',
  },
  ar: {
    open: 'خدمة العملاء',
    title: 'مصر العربية للمصاعد — خدمة العملاء',
    subtitle: 'مصاعد البانوراما، ومراحل التنفيذ، وطلب التواصل مع أحد أفراد الفريق.',
    greeting:
      'أهلًا بك في مصر العربية للمصاعد. اسألني عن مصاعد البانوراما أو مراحل التنفيذ أو ما يحدث في المعاينة الميدانية. وإن أردت التحدث إلى أحد أفراد الفريق أو تقديم شكوى، أخبرني وسآخذ بياناتك لهم.',
    placeholder: 'اكتب سؤالك…',
    send: 'إرسال',
    close: 'إغلاق',
    thinking: 'جارٍ الكتابة…',
    unavailable:
      'المساعد غير متاح حاليًا. يمكنك ترك بياناتك بالأسفل وسيتابع معك أحد أفراد الفريق.',
    error: 'لم يتم الإرسال. من فضلك حاول مرة أخرى.',
    rateLimited: 'وصلتنا عدة أسئلة في وقت قصير. انتظر لحظة ثم حاول مجددًا.',
    cta: 'اطلب معاينة الموقع',
    disclaimer: 'الإجابات إرشادية عامة. أي شيء يخص مبناك تحديدًا يُحسم في المعاينة الميدانية.',
    suggestions: [
      'ما هو مصعد البانوراما؟',
      'ماذا يحدث في المعاينة الميدانية؟',
      'ما مواعيد العمل لديكم؟',
      'ما التشطيبات المتاحة؟',
    ],

    human: 'التحدث إلى أحد الأفراد',
    complaint: 'لديّ شكوى',
    handoffTitle: 'اترك بياناتك',
    handoffBody:
      'سيتابع معك أحد أفراد الفريق على الرقم الذي تكتبه هنا. من فضلك لا تكتب رقمك داخل المحادثة — هذا النموذج هو مكانه.',
    handoffCancel: 'العودة إلى المحادثة',
    reasonLabel: 'الموضوع',
    reasons: {
      question: 'سؤال للفريق',
      complaint: 'شكوى',
      inspection: 'معاينة ميدانية',
    },
    fields: {
      name: 'الاسم',
      phone: 'رقم الهاتف',
      area: 'المنطقة',
      message: 'ما الذي تود قوله؟',
      consent: 'أوافق على التواصل معي على هذا الرقم بخصوص طلبي.',
    },
    submit: 'إرسال إلى الفريق',
    sending: 'جارٍ الإرسال…',
    successTitle: 'وصلنا طلبك',
    successBody: 'طلبك الآن لدى الفريق برقم مرجعي {reference}. احتفظ به إن تواصلت معنا مجددًا.',
    failure: 'لم يُرسَل شيء. من فضلك راجع الحقول وحاول مرة أخرى.',
  },
} as const satisfies Record<Locale, Record<string, unknown>>;
