'use client';

import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Mobile bottom navigation.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * Below `lg` the desktop navigation collapses to a hamburger, which puts every destination
 * two taps away behind a modal. The five things a visitor actually wants are now one tap
 * away, permanently, at the bottom of the screen where a thumb already is.
 *
 * ── Layout ──────────────────────────────────────────────────────────────────
 * A floating, fully-rounded bar rather than a full-width strip: it reads as an instrument
 * sitting on the page rather than a browser chrome, which is the distinction the design
 * system draws between architecture and controls.
 *
 * `env(safe-area-inset-bottom)` is honoured, and the document carries matching bottom padding
 * (see `globals.css`, `--bottom-nav-space`) so the bar never covers the end of a page.
 *
 * ── Direction ───────────────────────────────────────────────────────────────
 * Order is DOM order, so RTL mirrors it for free — Home ends up on the right in Arabic,
 * which is where "first" belongs when the page reads right-to-left. Nothing here needs a
 * direction check.
 *
 * ── Accessibility ───────────────────────────────────────────────────────────
 * A real `<nav>` with a label, real links, `aria-current="page"` on the active route, 44px
 * minimum targets in both axes, and a focus ring. Icons are `aria-hidden` because every item
 * also carries a visible text label — an icon-only bar is a guessing game.
 */

type Item = { key: string; href: string; icon: React.ReactNode };

/* Line icons at a common 24-grid, 1.6 stroke — the same weight as the rest of the UI. */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ITEMS: Item[] = [
  {
    key: 'home',
    href: '/',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M3 10.5 12 4l9 6.5" />
        <path d="M5.5 9.5V20h13V9.5" />
      </svg>
    ),
  },
  {
    key: 'panorama',
    href: '/panorama-elevators',
    icon: (
      // A panorama car: a glass box in a shaft.
      <svg viewBox="0 0 24 24" {...stroke}>
        <rect x="5" y="3" width="14" height="18" rx="1.5" />
        <path d="M12 3v18M5 9h14M5 15h14" />
      </svg>
    ),
  },
  {
    key: 'projects',
    href: '/projects',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: 'process',
    href: '/process',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M5 6h14M5 12h14M5 18h9" />
        <circle cx="19" cy="18" r="2" />
      </svg>
    ),
  },
  {
    key: 'contact',
    href: '/contact',
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M12 21s7-5.2 7-10.5A7 7 0 0 0 5 10.5C5 15.8 12 21 12 21Z" />
        <circle cx="12" cy="10.5" r="2.4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('menuLabel')}
      data-bottom-nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 lg:hidden',
        // The safe-area inset keeps the bar clear of the home indicator on iOS.
        'px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
      )}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between gap-0.5 rounded-(--radius-card) glass p-1.5 shadow-float">
        {ITEMS.map((item) => {
          // `usePathname` from next-intl is already locale-stripped, so this compares real
          // routes rather than "/en/projects" against "/projects".
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-(--radius-control) px-1 py-1.5',
                  'duration-fast transition-colors ease-standard',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                  active ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'
                )}
              >
                <span aria-hidden className="block size-5 shrink-0">
                  {item.icon}
                </span>
                <span className="text-[0.625rem] leading-none font-medium tracking-[-0.01em]">
                  {t(item.key)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
