'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import { conciergeCopy } from '@/components/concierge/copy';
import type { Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

/**
 * The concierge launcher.
 *
 * ── Why this file is nearly empty ───────────────────────────────────────────
 * Most visitors never open the assistant, and they should not pay for it. Everything they
 * would only need after clicking — the transcript, the streaming reader, the composer — lives
 * in `concierge-panel.tsx` and is fetched on the first open via `next/dynamic`. What ships
 * with every page is this button and a copy object.
 *
 * `ssr: false` because the panel is pure interaction: there is nothing to render on the
 * server, and rendering it there would put it back into the initial payload.
 *
 * ── Placement ───────────────────────────────────────────────────────────────
 * `--bottom-nav-space` is the mobile navigation's reserved height and 0 above `lg`, so a
 * single offset keeps the launcher above the bottom bar on a phone and clear of the page edge
 * on a desktop. It never covers the inspection CTA.
 */
const ConciergePanel = dynamic(
  () => import('@/components/concierge/concierge-panel').then((m) => m.ConciergePanel),
  { ssr: false }
);

export function Concierge({ locale, available }: { locale: Locale; available: boolean }) {
  const t = conciergeCopy[locale];
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-cursor="grow"
        className={cn(
          // z-50: above the page content *and* above the bottom navigation (z-40). At z-40 the
          // hero's own bottom band — also z-40, and later in DOM order — painted over the
          // launcher and made it unclickable on the homepage.
          'fixed end-4 z-50 inline-flex min-h-11 items-center gap-2 rounded-(--radius-control-lg) px-4 py-3',
          'glass font-body text-sm font-semibold text-ink shadow-float',
          'duration-fast transition-colors ease-standard hover:text-accent-text',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'
        )}
        style={{ bottom: 'calc(var(--bottom-nav-space) + 1rem)' }}
      >
        <span
          aria-hidden
          className={cn('block size-2 rounded-full', available ? 'bg-accent' : 'bg-ink-3')}
        />
        {open ? t.close : t.open}
      </button>

      {open ? (
        <ConciergePanel locale={locale} available={available} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
