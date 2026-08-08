import type { Locale } from '@/i18n/config';

/**
 * Concierge interface copy.
 *
 * Its own module so the launcher can show a label without pulling in the panel — the panel is
 * loaded on demand and this is the only thing both halves share.
 *
 * Nothing here promises a reply, a time, a price or a contact channel.
 */
export const conciergeCopy = {
  en: {
    open: 'Ask a question',
    title: 'Ask about panorama elevators',
    subtitle: 'Questions about the work, the process, or booking an inspection.',
    placeholder: 'Type your question…',
    send: 'Send',
    close: 'Close',
    thinking: 'Thinking…',
    unavailable:
      'The assistant is not available right now. You can still request a site inspection and the team will follow up.',
    error: 'That did not go through. Please try again.',
    rateLimited: 'That is several questions in a short time. Please wait a moment and try again.',
    cta: 'Request a site inspection',
    disclaimer:
      'Answers are general guidance. Anything specific to your building is decided at the site inspection.',
    suggestions: [
      'What is a panorama elevator?',
      'What happens during a site inspection?',
      'Which finishes do you offer?',
      'How do I request an inspection?',
    ],
  },
  ar: {
    open: 'اسأل سؤالًا',
    title: 'اسأل عن مصاعد البانوراما',
    subtitle: 'أسئلة عن الأعمال أو المراحل أو حجز معاينة.',
    placeholder: 'اكتب سؤالك…',
    send: 'إرسال',
    close: 'إغلاق',
    thinking: 'جارٍ التفكير…',
    unavailable: 'المساعد غير متاح حاليًا. يمكنك طلب معاينة ميدانية وسيتابع الفريق معك.',
    error: 'لم يتم الإرسال. من فضلك حاول مرة أخرى.',
    rateLimited: 'وصلتنا عدة أسئلة في وقت قصير. انتظر لحظة ثم حاول مجددًا.',
    cta: 'اطلب معاينة الموقع',
    disclaimer: 'الإجابات إرشادية عامة. أي شيء يخص مبناك تحديدًا يُحسم في المعاينة الميدانية.',
    suggestions: [
      'ما هو مصعد البانوراما؟',
      'ماذا يحدث في المعاينة الميدانية؟',
      'ما التشطيبات المتاحة؟',
      'كيف أطلب معاينة؟',
    ],
  },
} as const satisfies Record<Locale, Record<string, unknown>>;
