'use client';

import Image from 'next/image';
import { useRef } from 'react';

import type { Locale } from '@/i18n/config';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import type { ImageAsset } from '@/lib/media';

type Floor = {
  /** Finish and setting, both verified from the photograph. Fills the caption column. */
  meta: { label: string; value: string }[];
  image: ImageAsset;
  alt: string;
  title: string;
  note: string;
  /** Widest honest render for this frame, in CSS px. See maxImageWidth(). */
  maxWidth: number;
};

/**
 * The ascent — the pinned scroll sequence.
 *
 * A fixed frame, and the visitor scrolls a stack of installations up through it one floor at
 * a time, with a counter ticking alongside. The product's own mechanic becomes the page's
 * navigation: content arrives the way a car arrives at a floor.
 *
 * **One DOM, two layouts.** Below `lg` every floor is an ordinary list item and nothing is
 * pinned or triggered. At `lg` the items share one grid cell (`grid-area: 1/1`) so they
 * stack, and the timeline moves them through it.
 *
 * ── Why the previous version showed overlapping headings ────────────────────
 * It set `yPercent: 100` on the inactive panels but never touched their opacity, so all five
 * captions stayed fully opaque — displaced, not hidden — and the browser painted them on top
 * of one another. The measurement harness caught six overlapping pairs at α1.
 *
 * The invariant this version holds, and `assertSingleActiveFloor` enforces in development:
 * **exactly one floor is visible at rest.** It is expressed three ways so no single mistake
 * can break it —
 *   1. `autoAlpha` (not `opacity`), so GSAP also writes `visibility: hidden` and inactive
 *      copy leaves the accessibility tree and the hit-test entirely;
 *   2. a deterministic `gsap.set()` baseline applied before the timeline is built, so the
 *      state at progress 0 never depends on what a previous refresh left behind;
 *   3. labelled, non-overlapping timeline segments — each floor owns its own slot, and the
 *      crossfade is a short window at the seam rather than a long dissolve.
 *
 * Skill rules this follows: ScrollTrigger lives on the timeline, never on a child tween;
 * `autoAlpha`/`yPercent` only, so a pinned stack of large images still holds frame; pinning
 * is desktop-only, because pinning on a phone fights the browser's own scrolling.
 */
export function Ascent({
  floors,
  eyebrow,
  heading,
  locale,
}: {
  floors: Floor[];
  eyebrow: string;
  heading: string;
  locale: Locale;
}) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          pinned: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
          plain: '(max-width: 1023px), (prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { pinned } = context.conditions as { pinned: boolean };
          const panels = gsap.utils.toArray<HTMLElement>('[data-floor]');
          if (panels.length === 0) return;

          if (!pinned) {
            // Static: every floor readable in document order. No pin, no triggers.
            // clearProps removes any inline state a previous desktop match left behind.
            gsap.set(panels, {
              clearProps: 'all',
            });
            panels.forEach((p) => p.setAttribute('data-floor-active', 'true'));
            return;
          }

          /* ---- 1. deterministic baseline ---------------------------------- */
          // Written before the timeline exists, so progress 0 is always this exact state.
          gsap.set(panels, { zIndex: (i) => i + 1 });
          gsap.set(panels[0], { yPercent: 0, autoAlpha: 1 });
          gsap.set(panels.slice(1), { yPercent: 100, autoAlpha: 0 });
          panels.forEach((p, i) => p.setAttribute('data-floor-active', i === 0 ? 'true' : 'false'));

          const counter = scope.current?.querySelector('[data-floor-counter]');
          const progressLine = scope.current?.querySelector<HTMLElement>('[data-floor-progress]');

          const setActive = (index: number) => {
            panels.forEach((p, i) =>
              p.setAttribute('data-floor-active', i === index ? 'true' : 'false')
            );
            if (counter) counter.textContent = String(index + 1).padStart(2, '0');
          };

          /* ---- 2. the timeline -------------------------------------------- */
          // One slot per transition. Each slot is a unit of timeline time, and the crossfade
          // occupies the whole slot — so at any moment at most two panels are mid-transition
          // and never two panels at rest.
          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: scope.current,
              start: 'top top',
              // 52vh of scroll per transition. Enough that each floor is legible, short
              // enough that the section does not become an endurance test — the whole
              // sequence is ~2.2 viewports for five floors.
              end: () => `+=${(panels.length - 1) * 52 + 15}%`,
              pin: '[data-ascent-stage]',
              pinSpacing: true,
              scrub: 0.6,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const index = Math.round(self.progress * (panels.length - 1));
                setActive(index);
                if (progressLine) {
                  progressLine.style.transform = `scaleX(${self.progress})`;
                }
              },
            },
          });

          panels.slice(1).forEach((panel, i) => {
            tl.addLabel(`floor-${i + 1}`, i)
              // Incoming floor rises into the frame and fades up over the first 70% of the
              // slot, so it is fully opaque well before the slot ends.
              .to(panel, { yPercent: 0, autoAlpha: 1, duration: 0.7 }, i)
              // Outgoing floor leaves at the same time and is *gone* — visibility:hidden via
              // autoAlpha — by the 70% mark. No two captions are ever both readable.
              .to(panels[i], { yPercent: -12, autoAlpha: 0, duration: 0.7 }, i);
          });

          /* ---- 3. refresh once layout has actually settled ----------------- */
          // Fonts change heading heights and images change frame heights; both land after
          // hydration. Refreshing before they settle pins at the wrong measurement, which is
          // what leaves stale spacers behind.
          let cancelled = false;
          const settle = async () => {
            await document.fonts?.ready;
            const imgs = Array.from(scope.current?.querySelectorAll('img') ?? []);
            await Promise.all(
              imgs.map((img) =>
                img.complete
                  ? Promise.resolve()
                  : new Promise((r) => {
                      img.addEventListener('load', r, { once: true });
                      img.addEventListener('error', r, { once: true });
                    })
              )
            );
            if (!cancelled) ScrollTrigger.refresh();
          };
          void settle();

          if (process.env.NODE_ENV !== 'production') {
            assertSingleActiveFloor(panels);
          }

          return () => {
            cancelled = true;
            tl.kill();
          };
        }
      );

      return () => mm.revert();
    },
    { scope, dependencies: [floors.length] }
  );

  if (floors.length === 0) return null;

  return (
    <section ref={scope} className="relative py-20 lg:py-0" aria-label={heading}>
      <div data-ascent-stage className="lg:flex lg:h-svh lg:flex-col lg:justify-center">
        <div className="mx-auto w-full max-w-page px-(--gutter)">
          <div className="flex items-baseline justify-between gap-4 pt-3 rule-t">
            <span className="annotation">{eyebrow}</span>
            <span className="numeric hidden annotation lg:inline" dir="ltr">
              {/* Written imperatively from ScrollTrigger.onUpdate — re-rendering React on every
                  scroll frame would cost far more than one textContent write. */}
              <span data-floor-counter className="text-accent-text">
                01
              </span>
              <span className="text-ink-3"> / {String(floors.length).padStart(2, '0')}</span>
            </span>
          </div>

          {/* Orange progress line. Scaled imperatively from the same onUpdate, so the
              visitor can see how much of the ascent is left. */}
          <div className="mt-3 hidden h-px w-full bg-rule lg:block" aria-hidden>
            <div
              data-floor-progress
              className="h-px origin-left scale-x-0 bg-accent will-change-transform"
            />
          </div>

          <h2 className="mt-6 max-w-[18ch] text-2xl text-ink sm:text-3xl lg:text-4xl">{heading}</h2>

          <ol className="mt-10 flex flex-col gap-16 lg:mt-8 lg:grid lg:gap-0">
            {floors.map((floor, index) => (
              <li
                key={floor.image.id}
                data-floor
                data-floor-active={index === 0 ? 'true' : 'false'}
                // On desktop every item occupies the same grid cell, so they stack.
                className="lg:col-start-1 lg:row-start-1 lg:will-change-transform"
              >
                <div className="grid items-center gap-7 lg:grid-cols-[1fr_auto] lg:gap-16">
                  <div className="order-2 lg:order-1">
                    <p className="numeric annotation text-accent-text" dir="ltr">
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <h3 className="mt-3 text-xl text-ink lg:text-3xl">{floor.title}</h3>
                    <p className="mt-4 max-w-[44ch] text-sm text-ink-2 sm:text-base">
                      {floor.note}
                    </p>

                    {/* The caption column was mostly empty below this point — roughly 500px
                        of nothing beside a full-height image. These are verified facts about
                        the photograph (finish, setting), not filler. */}
                    <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3 border-t border-rule pt-5">
                      {floor.meta.map((m) => (
                        <div key={m.label}>
                          <dt className="annotation">{m.label}</dt>
                          <dd className="mt-1 font-mono text-[0.6875rem] tracking-wide text-ink">
                            {m.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="order-1 lg:order-2">
                    {/* Capped to what the source file can actually carry. These are ~960px
                        phone captures; rendering one 700px wide on a retina screen is the
                        pixelation that was reported. */}
                    <div
                      className="aperture aspect-4/5 w-full aperture-mask"
                      // The honest cap for a ~960px source is ~550px, but the frame is held
                      // below that here: at full cap it dominated a column that is mostly
                      // type, and the review's note about images dominating the viewport
                      // applies to a frame that is technically sharp too.
                      style={{ maxWidth: `${Math.min(floor.maxWidth, 460)}px` }}
                    >
                      <Image
                        src={floor.image.src}
                        alt={floor.alt}
                        width={floor.image.width}
                        height={floor.image.height}
                        sizes={`(max-width: 1023px) 92vw, ${Math.min(floor.maxWidth, 460)}px`}
                        placeholder="blur"
                        blurDataURL={floor.image.blurDataURL}
                        priority={index === 0}
                        className="size-full object-cover object-center"
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-10 annotation lg:hidden">
            {locale === 'en' ? `${floors.length} installations` : `${floors.length} أعمال منفَّذة`}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Development guard for the section's one invariant.
 *
 * Runs a frame after the baseline is written and reports every floor the browser would
 * actually paint. This is the check that would have caught the original overlap bug at the
 * moment it was introduced, rather than in a screenshot review.
 */
function assertSingleActiveFloor(panels: HTMLElement[]) {
  requestAnimationFrame(() => {
    const visible = panels.filter((p) => {
      const cs = getComputedStyle(p);
      return cs.visibility !== 'hidden' && Number(cs.opacity) > 0.02;
    });
    if (visible.length > 1) {
      console.error(
        `[ascent] ${visible.length} floors are visible simultaneously; exactly 1 is allowed. ` +
          `Visible: ${visible.map((p) => p.querySelector('h3')?.textContent).join(' | ')}`
      );
    }
  });
}
