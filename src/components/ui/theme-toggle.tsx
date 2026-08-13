'use client';

import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react';

import type { Locale } from '@/i18n/config';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { cn } from '@/lib/utils';

/**
 * Light / dark toggle.
 *
 * ── Where the state lives ───────────────────────────────────────────────────
 * On `<html data-theme>`, not in React. The inline script at the top of the document body
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

/**
 * `useLayoutEffect` on the client, `useEffect` on the server pass.
 *
 * This component is server-rendered, and React logs a warning for every `useLayoutEffect` it
 * encounters while producing HTML — correctly, since layout effects cannot run there.
 */
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Put the remembered theme back after a remount.
 *
 * React 19 treats `<html>` as a singleton. On remount it does not create a new element — it
 * *acquires* the real one, and acquiring it strips every attribute off it before re-applying
 * the props React itself rendered (`acquireSingletonInstance`). `data-theme` is written by the
 * pre-paint bootstrap and by `toggle()` below, never by React, so it is stripped and not
 * restored.
 *
 * That remount is a normal thing to do here: switching language is a soft navigation across
 * the `[locale]` segment, so the whole layout unmounts and mounts again. Without this, a
 * visitor who chose dark and then switched to Arabic was dropped back onto the OS preference.
 *
 * It reads storage rather than the last rendered value because the attribute is genuinely
 * gone at this point — there is nothing left in the DOM to read it from.
 */
function useThemeSurvivesRemount() {
  useBeforePaint(() => {
    if (document.documentElement.dataset.theme) return;
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        document.documentElement.dataset.theme = stored;
      }
    } catch {
      // Blocked storage: the OS preference is a reasonable answer, and the page still renders.
    }
  }, []);
}

export function ThemeToggle({ locale, className }: { locale: Locale; className?: string }) {
  useThemeSurvivesRemount();

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
      localStorage.setItem(THEME_STORAGE_KEY, next);
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
