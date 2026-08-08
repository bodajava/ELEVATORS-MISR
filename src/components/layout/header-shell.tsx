'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Header shell — a floating navigation, not a bar.
 *
 * Three states, and the transitions between them never touch layout:
 *
 *   · **at rest** (top of the hero) — no container at all. The nav sits directly on the hero
 *     with no plate behind it, so the opening composition is uninterrupted. This is the fix
 *     for "the navigation permanently occupies a large white strip".
 *   · **floating** (scrolled) — the contents collect into a liquid-glass capsule inset from
 *     the edges: blur, saturation, a fine inner border and a soft shadow.
 *   · **retracted** (scrolling down, past the hero) — the capsule lifts out of view. It comes
 *     straight back the moment the visitor scrolls up, which is when a nav is actually
 *     wanted.
 *
 * **No layout shift.** The header is fixed and the capsule's own padding/blur/opacity are the
 * only things that change; nothing in the document flow moves when it transitions, so the
 * page's CLS budget is untouched.
 *
 * The listener is passive and writes only two booleans. It deliberately does not read from
 * Lenis: the header must behave identically when Lenis is off for reduced motion.
 *
 * `data-tone` lets a section declare that the nav is currently over carbon, so the contents
 * can invert. Sections set it via the `NavTone` sentinel; the default is the cream page.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;

      setScrolled(y > 24);

      // Ignore sub-pixel jitter and rubber-banding at the top, otherwise the nav flickers.
      if (Math.abs(delta) > 6) {
        // Never retract while a pinned scroll sequence is running. The hero pins for well
        // over two viewports, so a plain "past 0.9 viewports" rule hid the navigation for
        // the entire hero — the visitor is scrolling down the whole time but has not left
        // the section. Sequences announce themselves on <html data-sequence>; see
        // useSequenceLock in src/lib/sequence.ts.
        const inSequence = document.documentElement.dataset.sequence !== undefined;
        setHidden(!inSequence && delta > 0 && y > window.innerHeight * 0.9);
        lastY.current = y;
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled || undefined}
      data-hidden={hidden || undefined}
      className={cn(
        'fixed inset-x-0 top-0 z-30',
        'duration-slow transition-transform ease-travel',
        hidden ? 'translate-y-[-130%]' : 'translate-y-0'
      )}
      style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}
    >
      <div className="mx-auto w-full max-w-page px-(--gutter)">
        <div
          className={cn(
            'duration-base transition-[background-color,border-color,box-shadow,padding,backdrop-filter] ease-standard',
            'rounded-(--radius-control-lg) border',
            scrolled
              ? 'glass px-4 py-2.5 sm:px-5'
              : 'border-transparent bg-transparent px-0 py-2 shadow-none'
          )}
        >
          {children}
        </div>
      </div>
    </header>
  );
}
