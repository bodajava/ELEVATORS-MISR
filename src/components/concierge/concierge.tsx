'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { conciergeCopy } from '@/components/concierge/copy';
import { OPEN_CONCIERGE_EVENT } from '@/components/concierge/open-concierge';
import type { Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

/**
 * Whether the launcher has cleared the corner the homepage's primary CTA also lives in.
 *
 * Modelled as an external store rather than `useEffect` + `setState`, the same choice
 * `hero-video.tsx` makes for its own client-only media query: scroll position and viewport
 * width are external systems, and subscribing means the value is correct on the very first
 * client render with no extra pass. `getServerSnapshot` returns the safe default — visible —
 * because the SSR markup has no scroll position to read; the desktop branch below never
 * disagrees with it, so only mobile ever has a first-paint value to correct.
 *
 * "Revealed" latches once true and does not re-hide on scrolling back up — a launcher that
 * blinks out again while the visitor scrolls past the hero a second time would be its own
 * kind of broken.
 */
let revealed = false;

function subscribeToScrollClearance(onChange: () => void) {
  const mobile = window.matchMedia('(max-width: 1023px)');
  mobile.addEventListener('change', onChange);
  if (!mobile.matches) return () => mobile.removeEventListener('change', onChange);

  // A quarter of the viewport height is where the hero's own GSAP timeline already fades its
  // CTA to `autoAlpha: 0` as the pinned sequence begins (see hero.tsx) — so the launcher never
  // actually appears over a CTA that is still legible, it appears once that CTA has already
  // left. `scrollY`, not a threshold tied to any one element's position, so this holds on
  // every page the launcher renders on, not only the homepage that motivated it.
  const threshold = window.innerHeight * 0.25;
  const onScroll = () => {
    if (window.scrollY > threshold) {
      revealed = true;
      onChange();
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    mobile.removeEventListener('change', onChange);
    window.removeEventListener('scroll', onScroll);
  };
}

function getScrollClearanceSnapshot() {
  return !window.matchMedia('(max-width: 1023px)').matches || revealed;
}

function getScrollClearanceServerSnapshot() {
  return true;
}

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
 * on a desktop.
 *
 * ── Why it waits, on a phone ─────────────────────────────────────────────────
 * The homepage's primary call to action sits in the same corner this launcher floats in, and
 * the hero is designed to put that CTA on screen at paint with nothing scrolled — which means
 * the two shared a corner from the first frame. On a 390px-wide phone the launcher's own pill
 * covered up to 153px of the CTA's width; on the shortest supported screen (320x568) it
 * covered the button vertically too. Measured, not estimated — see the overlap numbers this
 * replaces in git history.
 *
 * The primary CTA is the one thing on this site that must never be visually subordinate (see
 * CLAUDE.md's contact policy), so the launcher — a secondary path — is the one that gives way:
 * below `lg` it does not render until the visitor has scrolled a little. That threshold is not
 * arbitrary; it is timed to land at the same point the hero's own GSAP timeline already fades
 * the CTA to `autoAlpha: 0` as the pinned sequence begins (see hero.tsx), so the launcher never
 * actually appears over a CTA that is still legible — it appears once that CTA has already
 * left. Above `lg` the hero's CTA does not sit under this corner, so the launcher is immediate
 * there, as it always was.
 */
const ConciergePanel = dynamic(
  () => import('@/components/concierge/concierge-panel').then((m) => m.ConciergePanel),
  { ssr: false }
);

export function Concierge({ locale, available }: { locale: Locale; available: boolean }) {
  const t = conciergeCopy[locale];
  const [open, setOpen] = useState(false);
  const clearedTheCta = useSyncExternalStore(
    subscribeToScrollClearance,
    getScrollClearanceSnapshot,
    getScrollClearanceServerSnapshot
  );

  // Anything on the page can ask for the assistant — the footer's card does. One listener,
  // and the panel's open state stays owned here.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_CONCIERGE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CONCIERGE_EVENT, onOpen);
  }, []);

  // The panel being open overrides the deferral outright: this button is its only visible
  // close control on a touch device (the panel itself closes on Escape and nothing else), and
  // the footer's card can open the panel before the visitor has scrolled at all.
  const visible = clearedTheCta || open;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-hidden={!visible || undefined}
        tabIndex={visible ? undefined : -1}
        data-cursor="grow"
        className={cn(
          // z-50: above the page content *and* above the bottom navigation (z-40). At z-40 the
          // hero's own bottom band — also z-40, and later in DOM order — painted over the
          // launcher and made it unclickable on the homepage.
          'fixed end-4 z-50 inline-flex min-h-11 items-center gap-2 rounded-(--radius-control-lg) px-4 py-3',
          'glass font-body text-sm font-semibold text-ink shadow-float',
          'duration-fast transition-colors ease-standard hover:text-accent-text',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          // Fade, not unmount: unmounting would drop focus if a keyboard visitor had already
          // tabbed to it, and would fight the `open` state if the footer's card had just
          // triggered it via the window event. Invisible and inert covers the same case
          // `disabled:opacity-40` does elsewhere in this codebase for a control that exists
          // but should not currently be reached.
          !visible && 'pointer-events-none opacity-0'
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
