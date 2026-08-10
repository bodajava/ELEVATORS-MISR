'use client';

import { useEffect, useRef } from 'react';

/**
 * The ambient field — one shared background and cursor system for the whole site.
 *
 * ── What it is ──────────────────────────────────────────────────────────────
 * Four very low-opacity blurred forms in cream, brass, smoked glass and a single restrained
 * orange, drifting slowly, leaning toward the pointer and parallaxing with scroll. It should
 * read as light moving across brass and glass. It is deliberately not a field of coloured
 * blobs, which is what this pattern becomes if the opacity or the saturation is allowed up.
 *
 * On a fine pointer it also draws a two-part cursor: a small precise dot at the true pointer
 * position, and a larger soft ring that follows with eased lag and grows over anything
 * interactive.
 *
 * ── Why it is one component and one loop ────────────────────────────────────
 * Background drift, pointer lean, scroll parallax and both cursor parts are driven by a
 * **single** `requestAnimationFrame` loop writing transforms to refs. There is no React state
 * anywhere on the pointer path — a `setState` per `mousemove` would re-render the tree at
 * pointer frequency, which is the standard way this effect ruins a site's performance.
 *
 * Everything it animates is `transform` and `opacity`, so nothing it does can trigger layout
 * or contribute to CLS. The whole thing is `pointer-events: none` and `aria-hidden`.
 *
 * ── When it does nothing ────────────────────────────────────────────────────
 *  · `prefers-reduced-motion: reduce` — the forms are painted once, statically. The page
 *    still gets an atmosphere; nothing moves and no loop runs.
 *  · Coarse pointer (touch) — no cursor at all, and the loop only handles scroll parallax,
 *    which is cheap. A pointer-follow background on a phone is spent battery.
 *  · Document hidden — the loop stops entirely and restarts on `visibilitychange`.
 */
/**
 * Where the four drifting forms sit and how hard they fall off.
 *
 * Position and shape only — the colour and opacity of each is `--ambient-N` / `--ambient-N-opacity`,
 * so the two themes tune the field without the component knowing which one is active.
 */
const FORMS = [
  { position: 'start-[8%] top-[12%] h-[52vmin] w-[52vmin]', origin: '35% 35%', falloff: '68%' },
  { position: 'start-[58%] top-[4%] h-[46vmin] w-[46vmin]', origin: '50% 50%', falloff: '70%' },
  { position: 'start-[24%] top-[58%] h-[62vmin] w-[62vmin]', origin: '45% 45%', falloff: '72%' },
  { position: 'start-[68%] top-[62%] h-[38vmin] w-[38vmin]', origin: '50% 50%', falloff: '70%' },
] as const;

export function AmbientField() {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const formRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const glowRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');

    // Reduced motion: paint the field once and stop. No loop, no listeners, no cursor.
    if (reduced.matches) {
      root.dataset.state = 'static';
      return;
    }

    const hasCursor = fine.matches;
    root.dataset.state = hasCursor ? 'live' : 'ambient';

    // Pointer position, in normalised -1..1 space. Refs, never state.
    const target = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    // Absolute pointer position for the light, in px, eased separately from the lean so the
    // glow trails the cursor rather than snapping to it.
    const light = { x: -9999, y: -9999 };
    const lightTarget = { x: -9999, y: -9999 };
    const pointer = { x: -100, y: -100 };
    const ring = { x: -100, y: -100 };
    let ringScale = 1;
    let ringTargetScale = 1;
    let scrollY = window.scrollY;
    let frame = 0;
    let running = true;

    const onPointerMove = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.y = (event.clientY / window.innerHeight) * 2 - 1;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      lightTarget.x = event.clientX;
      lightTarget.y = event.clientY;

      // The ring grows over anything the visitor can act on. `closest` on the live target is
      // cheaper than maintaining a registry of elements and cannot go stale.
      const el = event.target as Element | null;
      const interactive = el?.closest?.(
        'a, button, [role="button"], input, textarea, select, summary, [data-cursor="grow"]'
      );
      ringTargetScale = interactive ? 2.2 : 1;
    };

    const onScroll = () => {
      scrollY = window.scrollY;
    };

    const tick = (time: number) => {
      if (!running) return;

      // Ambient drift. Slow enough to read as light rather than motion.
      const drift = time * 0.00004;

      eased.x += (target.x - eased.x) * 0.045;
      eased.y += (target.y - eased.y) * 0.045;

      const parallax = scrollY * 0.02;

      formRefs.current.forEach((form, i) => {
        if (!form) return;
        const depth = 1 + i * 0.5;
        const phase = drift + i * 1.7;
        // The lean is what makes the background feel attached to the visitor. Deeper forms
        // move further, which reads as parallax between layers of light rather than a single
        // sheet sliding about.
        const x = Math.sin(phase) * 26 * depth + eased.x * 52 * depth;
        const y = Math.cos(phase * 0.8) * 20 * depth + eased.y * 38 * depth - parallax * depth;
        form.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      });

      // A soft light under the pointer. This is the thing that makes the page feel awake:
      // the ground brightens where the visitor is looking, and lags just enough to feel
      // physical. Position only — no blur or filter animation, which would cost a repaint of
      // the whole layer on every frame.
      if (hasCursor && glowRef.current) {
        light.x += (lightTarget.x - light.x) * 0.075;
        light.y += (lightTarget.y - light.y) * 0.075;
        glowRef.current.style.transform = `translate3d(${light.x.toFixed(1)}px, ${light.y.toFixed(1)}px, 0) translate(-50%, -50%)`;

        // The lit field. A ruled grid exists across the whole page but is painted nowhere
        // until the pointer arrives, so the visitor appears to be carrying a lamp over
        // graph paper. It is the light theme's answer to the dark theme's glow: on cream
        // there is no headroom for *more* light, but there is plenty for structure that
        // was not visible a moment ago.
        //
        // Two transforms, no repaint: the circular window moves to the pointer, and the
        // grid inside it moves by exactly the opposite amount, which pins the ruling to the
        // viewport. Repositioning a mask instead would repaint a full-screen layer every
        // frame, which is the version of this effect that ruins a page.
        if (gridRef.current && gridInnerRef.current) {
          // Negated as numbers, not by prefixing a minus to the string — the light starts
          // parked off-screen at a negative coordinate, and `-${'-9999'}` is not a length.
          gridRef.current.style.transform = `translate3d(${light.x.toFixed(1)}px, ${light.y.toFixed(1)}px, 0)`;
          gridInnerRef.current.style.transform = `translate3d(${(-light.x).toFixed(1)}px, ${(-light.y).toFixed(1)}px, 0)`;
        }
      }

      if (hasCursor) {
        // The dot is exact — it has to be, or it stops reading as a cursor.
        if (dotRef.current) {
          dotRef.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;
        }
        // The ring lags, which is the whole gesture.
        ring.x += (pointer.x - ring.x) * 0.16;
        ring.y += (pointer.y - ring.y) * 0.16;
        ringScale += (ringTargetScale - ringScale) * 0.12;
        if (ringRef.current) {
          ringRef.current.style.transform = `translate3d(${ring.x.toFixed(2)}px, ${ring.y.toFixed(2)}px, 0) translate(-50%, -50%) scale(${ringScale.toFixed(3)})`;
        }
      }

      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    // A hidden tab should cost nothing at all.
    const onVisibility = () => (document.hidden ? stop() : start());

    if (hasCursor) window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      stop();
      if (hasCursor) window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-ambient
      // Fixed and behind everything. `pointer-events: none` throughout, so it can never
      // intercept a click, a text selection or a form field.
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* The forms. Colour and opacity come from theme tokens, not from literals: the old
          fixed values were tuned for a dark ground, and on linen the pale one in particular
          was light-on-light and contributed nothing. Opacity stays low enough that body text
          over them is unaffected — the field yields to contrast, always. */}
      {FORMS.map((form, i) => (
        <span
          key={form.position}
          ref={(el) => {
            formRefs.current[i] = el;
          }}
          className={`absolute block rounded-full blur-[64px] will-change-transform ${form.position}`}
          style={{
            background: `radial-gradient(circle at ${form.origin}, var(--ambient-${i + 1}) 0%, transparent ${form.falloff})`,
            opacity: `var(--ambient-${i + 1}-opacity)`,
          }}
        />
      ))}

      {/* The pointer light. On a dark ground it is warm light falling on brass; on linen it is
          a soft warm shading instead, because light over light has no delta to show. Both come
          from `--ambient-glow`. Hidden with the cursor on touch and under reduced motion. */}
      <div
        ref={glowRef}
        data-cursor-glow
        className="absolute top-0 left-0 hidden size-[46vmin] rounded-full blur-[70px] will-change-transform"
        style={{
          background: 'var(--ambient-glow)',
          opacity: 'var(--ambient-glow-opacity)',
        }}
      />

      {/* The lit field. A ruled grid that covers the page and is painted only inside a soft
          circle under the pointer, so structure appears where the visitor is looking and
          nowhere else. Both themes carry it; the light one carries it strongest, because a
          cream page has no room for a brighter glow but plenty of room for a line that was
          not there a second ago.

          The centring is done with margins, not with a `-50%` in the transform, so the inner
          layer can cancel the outer one exactly: the window moves, the ruling stays pinned to
          the viewport, and neither one repaints. */}
      <div
        ref={gridRef}
        data-cursor-grid
        className="absolute top-0 left-0 hidden overflow-hidden rounded-full will-change-transform"
        style={{
          ['--lit-size' as string]: 'clamp(320px, 42vmin, 620px)',
          width: 'var(--lit-size)',
          height: 'var(--lit-size)',
          marginLeft: 'calc(var(--lit-size) / -2)',
          marginTop: 'calc(var(--lit-size) / -2)',
          maskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,0.55) 45%, transparent 72%)',
          opacity: 'var(--ambient-grid-opacity)',
        }}
      >
        <div
          ref={gridInnerRef}
          className="absolute top-0 left-0 h-screen w-screen will-change-transform"
          style={{
            marginLeft: 'calc(var(--lit-size) / 2)',
            marginTop: 'calc(var(--lit-size) / 2)',
            backgroundImage:
              'linear-gradient(to right, var(--ambient-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--ambient-grid) 1px, transparent 1px)',
            backgroundSize: '3.25rem 3.25rem',
          }}
        />
      </div>

      {/* Cursor. Rendered only where a fine pointer exists — the data-state attribute is set
          by the effect, and both parts stay hidden otherwise. */}
      <div
        ref={ringRef}
        data-cursor-ring
        className="absolute top-0 left-0 hidden size-9 rounded-full border border-ink/25 will-change-transform"
      />
      <div
        ref={dotRef}
        data-cursor-dot
        className="absolute top-0 left-0 hidden size-1.5 rounded-full bg-accent will-change-transform"
      />
    </div>
  );
}
