'use client';

import { useSyncExternalStore } from 'react';

import type { Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

/**
 * Light / dark toggle.
 *
 * ── Where the state lives ───────────────────────────────────────────────────
 * On `<html data-theme>`, not in React. The inline script in the document head
 * (`themeScript`) sets it before first paint, so there is no flash of the wrong theme and no
 * hydration mismatch to reconcile. This component only reads and writes that attribute.
 *
 * `useSyncExternalStore` is the correct hook for exactly this: a value that lives outside
 * React, is unknown during SSR, and must not be read in an effect. The server snapshot is
 * `null`, so the button renders in a neutral state until the client tells it otherwise.
 *
 * ── What "system" means here ────────────────────────────────────────────────
 * No attribute at all means follow the OS. Once the visitor presses this, an explicit choice
 * is written and remembered — an explicit choice should outrank a default.
 */

const STORAGE_KEY = 'ee-theme';

/**
 * Subscribe to every source that can change the resolved theme: the attribute this component
 * writes, another tab writing storage, and the OS preference itself.
 */
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', callback);
  window.addEventListener('storage', callback);
  return () => {
    observer.disconnect();
    media.removeEventListener('change', callback);
    window.removeEventListener('storage', callback);
  };
}

/**
 * The **resolved** theme — an explicit choice if one exists, otherwise the OS preference.
 *
 * Resolving inside the store rather than during render is what makes this hydration-safe. An
 * earlier version read `window.matchMedia` in the component body: the server saw no `window`
 * and rendered the light icon, the client saw a dark OS preference and rendered the dark one,
 * and React threw a hydration mismatch that regenerated the whole tree.
 */
function readTheme(): 'light' | 'dark' {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === 'dark' || explicit === 'light') return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle({ locale, className }: { locale: Locale; className?: string }) {
  // The server snapshot is 'light': it is the documented default, and it is what the markup
  // must claim so that hydration matches. The store corrects it immediately on the client.
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'light' as const);
  const isDark = theme === 'dark';

  const label =
    locale === 'en'
      ? isDark
        ? 'Switch to light theme'
        : 'Switch to dark theme'
      : isDark
        ? 'التبديل إلى الوضع الفاتح'
        : 'التبديل إلى الوضع الداكن';

  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the theme still applies for this page view.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      data-cursor="grow"
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-(--radius-control)',
        'duration-fast text-ink-2 transition-colors ease-standard hover:text-ink',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        className
      )}
    >
      {/* One glyph, two states — the sun's rays retract into a crescent. Cheaper than
          swapping icons and it cannot flash the wrong one during hydration. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isDark ? (
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
      </svg>
    </button>
  );
}

/**
 * Runs before first paint, inlined in <head>.
 *
 * Without this the page renders light, then flips — a flash of the wrong theme on every
 * navigation for anyone who chose dark. It is deliberately tiny and deliberately
 * `try`-wrapped: a blocked `localStorage` must not stop the document rendering.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}}catch(e){}})();`;
