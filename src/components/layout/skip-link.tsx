import { getTranslations } from 'next-intl/server';

/** Skip link. Hidden until focused, then the first thing a keyboard user reaches. */
export async function SkipLink() {
  const t = await getTranslations('nav');

  return (
    <a
      href="#main"
      className="skip-link m-3 inline-flex min-h-11 items-center rounded-sm border border-ink bg-paper px-5 text-sm font-medium text-ink"
    >
      {t('skipToContent')}
    </a>
  );
}
