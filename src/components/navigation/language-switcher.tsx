'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useTransition } from 'react';

import { localeNames, locales, type Locale } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Language switcher.
 *
 * `usePathname` from `@/i18n/navigation` returns the path without its locale prefix, so the
 * visitor lands on the same page in the other language rather than being dumped on the home
 * page. Dynamic segments carry through via `params`.
 *
 * The choice persists in next-intl's NEXT_LOCALE cookie, read on the server in proxy.ts —
 * never in a client effect, which is what would cause a hydration mismatch on `<html dir>`.
 */
export function LanguageSwitcher({
  locale,
  className,
  tone = 'light',
  compact = false,
}: {
  locale: Locale;
  className?: string;
  /** `dark` inverts the resting colours for use on carbon. */
  tone?: 'light' | 'dark';
  /**
   * One button naming the language it switches *to*, instead of both languages with the
   * current one marked.
   *
   * This is the phone treatment. The full control needs about 110px, which is why it was
   * hidden below `sm` — and hiding it meant the only way to change language on a phone was
   * to open the hamburger first, so a visitor arriving on the wrong language had no visible
   * way out. Two locales make the "switch to the other one" reading unambiguous, and it is
   * a single 44px target rather than two small ones side by side.
   */
  compact?: boolean;
}) {
  const t = useTranslations('language');
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- pathname is a known route; params carries any dynamic segments.
        { pathname, params },
        { locale: next }
      );
    });
  }

  if (compact) {
    const other = locales.find((l) => l !== locale) ?? locale;
    return (
      <button
        type="button"
        lang={other}
        onClick={() => switchTo(other)}
        data-pending={isPending || undefined}
        // The visible label is the target language in its own script; the accessible name
        // says what pressing it does, because "العربية" alone is a noun, not an action.
        aria-label={`${t('label')}: ${localeNames[other]}`}
        className={cn(
          'duration-fast inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-(--radius-control) px-2 transition-colors',
          'annotation',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          tone === 'dark'
            ? 'text-ink-2-on-dark hover:text-ink-on-dark'
            : 'text-ink-3 hover:text-ink',
          className
        )}
      >
        {localeNames[other]}
      </button>
    );
  }

  return (
    <div
      className={cn('flex items-center gap-2 annotation', className)}
      role="group"
      aria-label={t('label')}
      data-pending={isPending || undefined}
    >
      {locales.map((option, index) => {
        const isActive = option === locale;
        return (
          <span key={option} className="flex items-center gap-2">
            {index > 0 ? (
              <span
                aria-hidden
                className={tone === 'dark' ? 'text-ink-2-on-dark/50' : 'text-ink-3/50'}
              >
                /
              </span>
            ) : null}
            <button
              type="button"
              lang={option}
              onClick={() => switchTo(option)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'duration-fast inline-flex min-h-11 cursor-pointer items-center transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                // The selected locale is an active state, so it takes the accent like every
                // other active state on the site. `aria-current` carries it non-visually.
                //
                // Two different oranges, because one does not work on both grounds: full
                // #FF6B00 is 6.8:1 on carbon but only 2.5:1 on cream, so the light ground
                // gets the darkened --color-accent-text at 5.3:1 instead.
                isActive
                  ? tone === 'dark'
                    ? 'text-accent'
                    : 'text-accent-text'
                  : tone === 'dark'
                    ? 'text-ink-2-on-dark hover:text-ink-on-dark'
                    : 'text-ink-3 hover:text-ink'
              )}
            >
              {localeNames[option]}
              {isActive ? <span className="sr-only"> — {t('current')}</span> : null}
            </button>
          </span>
        );
      })}
    </div>
  );
}
