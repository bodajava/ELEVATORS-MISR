'use client';

import { useRef } from 'react';

import { HeroVideo } from '@/components/media/hero-video';
import { HeroInstruments, HeroSpecRail } from '@/components/sections/hero-instruments';
import { Magnetic } from '@/components/motion/magnetic';
import { Button, CtaArrow } from '@/components/ui/button';
import { hero } from '@/content/home';
import { primaryCta } from '@/content/navigation';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { gsap, useGSAP } from '@/lib/gsap';
import { releaseSequence, sequenceToggle } from '@/lib/sequence';
import type { HeroAsset } from '@/lib/media';

/**
 * The hero — one video, woven between two lines of type.
 *
 * ── The composition ─────────────────────────────────────────────────────────
 * "EGYPT" sits above the video, "ELEVATORS" sits below it, and the video is sandwiched
 * between them in the z-axis:
 *
 *     EGYPT      z-30   ← in front of the video
 *     [video]    z-20
 *     ELEVATORS  z-10   ← behind the video
 *
 * All three are siblings inside one `relative` container so they share a single stacking
 * context and the z-indices actually resolve against each other. Nothing between them
 * creates a new context (no transform, filter, opacity or isolation on the wrapper), and the
 * wrapper is **not** clipped — a parent `overflow: hidden` here would cut the video off as it
 * grows past the type.
 *
 * ── The scroll ──────────────────────────────────────────────────────────────
 * One timeline, scrubbed. The video starts small and tilted between the words, then travels
 * down, scales up continuously and rotates level, finishing as a wide landscape frame below
 * the heading with cream margins either side. The two words drift apart and recede so the
 * video is leaving a composition rather than covering one.
 *
 * ── Why scale, not width ────────────────────────────────────────────────────
 * The element carries its **final** width in CSS; the opening size is a `scale` under 1.
 * Animating `width` would relayout on every scrubbed frame. This way the whole sequence is
 * transform-only, and the settled frame is exactly the specified
 * `clamp(760px, 78vw, 1240px)` with no arithmetic drift.
 *
 * `borderRadius` is counter-animated because a scaled box scales its corners too: 64px at the
 * opening scale renders as ~28px, and 34px at rest renders as 34px. So the *visible* radius
 * moves 28→34 across the sequence while staying inside spec at both ends.
 *
 * ── Reduced motion ──────────────────────────────────────────────────────────
 * No pin, no ScrollTrigger, no scrub. The final composition is set immediately: video level
 * and full size, type in place. `HeroVideo` independently declines to load the file at all
 * under this preference and shows its poster, so nothing loops for a visitor who asked for
 * less movement.
 */
export function Hero({ locale, heroAsset }: { locale: Locale; heroAsset: HeroAsset | null }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      /**
       * Every target is resolved through the hero's own root, and every tween is guarded on
       * the element existing. An earlier revision animated `[data-nav-reveal]`, which lives
       * in the site header — outside this scope — so GSAP logged "target not found" on every
       * mount. Resolving explicitly makes that class of mistake a null check instead of a
       * console warning.
       */
      const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
      const film = q('[data-hero-film]');
      const wordTop = q('[data-hero-word-1]');
      const wordBottom = q('[data-hero-word-2]');
      const copy = q('[data-hero-copy]');
      const eyebrow = q('[data-hero-eyebrow]');
      const stage = q('[data-hero-stage]');
      const words = [wordTop, wordBottom].filter(Boolean) as HTMLElement[];

      if (!film || !stage || words.length !== 2) return;

      /** Opening width from the spec: clamp(300px, 34vw, 570px) desktop. */
      const openingWidth = () => Math.min(570, Math.max(300, window.innerWidth * 0.34));

      const mm = gsap.matchMedia();

      /* ---------- reduced motion: the settled frame, immediately ---------- */
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(film, { scale: 1, rotate: 0, y: 0, borderRadius: 34, autoAlpha: 1 });
        gsap.set(words, { yPercent: 0, autoAlpha: 1 });
        if (copy) gsap.set(copy, { autoAlpha: 1, y: 0 });
        if (eyebrow) gsap.set(eyebrow, { autoAlpha: 1 });
      });

      mm.add(
        {
          desktop: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
          mobile: '(max-width: 1023px) and (prefers-reduced-motion: no-preference)',
        },
        (context) => {
          const { desktop } = context.conditions as { desktop: boolean };

          // Function-based so a resize recomputes it via invalidateOnRefresh rather than
          // freezing the ratio measured at first paint.
          const startScale = () => {
            const finalW = film.offsetWidth || 1;
            const openW = desktop ? openingWidth() : Math.min(window.innerWidth * 0.6, 240);
            return gsap.utils.clamp(0.2, 1, openW / finalW);
          };

          // The film enters high — tucked up behind "EGYPT" — and settles slightly below the
          // optical centre. Measured, not guessed: the settled frame has to clear the bottom
          // band (headline, CTAs, spec rail), which an earlier pass overlapped by ~160px.
          const fromY = () => -window.innerHeight * (desktop ? 0.055 : 0.06);
          // Mobile settles a touch above centre: the bottom band is taller there (the two CTAs
          // stack), so a positive offset put the frame 17px into the headline — measured.
          const toY = () => window.innerHeight * (desktop ? 0.035 : -0.01);

          /* ---- deterministic baseline ------------------------------------ */
          gsap.set(film, {
            scale: startScale,
            rotate: desktop ? -6 : -4,
            y: fromY,
            // 64 × the opening scale renders as ~28px, inside the 24–32px spec.
            borderRadius: () => 34 / startScale(),
            autoAlpha: 1,
            transformOrigin: 'center center',
            force3D: true,
          });
          gsap.set(words, { yPercent: 0, autoAlpha: 1 });
          if (copy) gsap.set(copy, { autoAlpha: 0, y: 20 });

          /* ---- entrance (plays once, not scroll-linked) ------------------ */
          const intro = gsap.timeline({ defaults: { ease: 'travel' } });
          intro.from(words, { yPercent: 108, duration: 1.05, stagger: 0.09 });
          if (eyebrow) intro.from(eyebrow, { autoAlpha: 0, y: 12, duration: 0.7 }, 0.45);
          intro.from(film, { autoAlpha: 0, duration: 0.6 }, 0.35);

          /* ---- the scrubbed sequence ------------------------------------- */
          const travel = desktop ? 190 : 150;

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: root,
              start: 'top top',
              end: () => `+=${travel}%`,
              pin: stage,
              pinSpacing: true,
              // A little smoothing so the scrub reads as motion rather than a slideshow,
              // without lagging far enough behind the wheel to feel disconnected.
              scrub: 0.65,
              invalidateOnRefresh: true,
              // Keeps the floating nav from retracting while the visitor is still inside
              // this pinned passage — see src/lib/sequence.ts.
              onToggle: sequenceToggle('hero'),
            },
          });

          // The video: down, up in size, and level. One continuous move.
          tl.to(
            film,
            {
              // vh rather than px so the descent scales with the viewport.
              y: toY,
              scale: 1,
              rotate: 0,
              borderRadius: 34,
              duration: 1,
            },
            0
          );

          // The type opens out of the way — subtle, and only enough that the video is
          // clearly leaving the composition rather than sitting on top of it.
          tl.to(wordTop, { yPercent: -46, autoAlpha: 0.14, duration: 1 }, 0).to(
            wordBottom,
            { yPercent: 34, autoAlpha: 0.14, duration: 1 },
            0
          );

          // The statement lands only once the frame has settled.
          if (copy) tl.to(copy, { autoAlpha: 1, y: 0, duration: 0.28 }, 0.72);

          // A held beat so the destination of the sequence is actually looked at before the
          // section unpins.
          tl.to({}, { duration: 0.18 }, 1);

          return () => {
            intro.kill();
            tl.kill();
            releaseSequence('hero');
          };
        }
      );

      // useGSAP reverts this context on unmount and re-runs it cleanly on every Strict Mode
      // double-invoke, so no timeline or ScrollTrigger is ever created twice.
      return () => {
        mm.revert();
        releaseSequence('hero');
      };
    },
    { scope }
  );

  return (
    <section ref={scope} className="relative">
      <div
        data-hero-stage
        // Deliberately NOT `overflow-clip`: the video grows past the type and a clipped
        // stage would slice it. The instrument layer and words are inset enough that
        // nothing else needs clipping here.
        className="relative flex h-svh flex-col justify-between px-(--gutter) pt-24 pb-7 lg:pt-28 lg:pb-8"
      >
        <HeroInstruments locale={locale} />

        {/* ---- top annotation ------------------------------------------- */}
        <div
          data-hero-eyebrow
          className="relative z-40 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2"
        >
          <p className="annotation">{hero.mediaLabel[locale]}</p>
          <p className="hidden annotation sm:block">
            {locale === 'en' ? 'Cairo · Egypt' : 'القاهرة · مصر'}
          </p>
        </div>

        {/* ---- the woven composition ------------------------------------- */}
        {/* One stacking context, three siblings, explicit z-order. */}
        <div className="relative flex flex-1 flex-col items-center justify-center">
          {/* EGYPT — in front of the video */}
          <span aria-hidden className="relative z-30 block overflow-clip">
            <span
              data-hero-word-1
              lang="en"
              dir="ltr"
              className="block font-display text-[19vw] leading-[0.78] font-extrabold tracking-[-0.06em] text-ink uppercase lg:text-[17.5vw]"
            >
              Egypt
            </span>
          </span>

          {/* The video — between the words */}
          <div
            data-hero-film
            className="absolute top-1/2 left-1/2 z-20 w-[clamp(600px,62vw,1020px)] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden will-change-transform max-lg:w-[calc(100vw-2rem)]"
            // 2.05:1 — a cinematic band rather than a screen. It keeps the settled frame short
            // enough to clear the bottom band, stays close to the source's own 1.83:1 so
            // object-cover crops little, and reads as landscape, not full-bleed.
            style={{ aspectRatio: '2.05 / 1' }}
          >
            {heroAsset ? <HeroVideo hero={heroAsset} /> : null}
          </div>

          {/* ELEVATORS — behind the video */}
          <span aria-hidden className="relative z-10 block overflow-clip">
            <span
              data-hero-word-2
              lang="en"
              dir="ltr"
              className="block font-display text-[19vw] leading-[0.78] font-extrabold tracking-[-0.06em] text-ink uppercase lg:text-[17.5vw]"
            >
              Elevators
            </span>
          </span>
        </div>

        {/* ---- bottom band ------------------------------------------------ */}
        <div className="relative z-40 flex flex-col gap-5">
          <div data-hero-copy className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <h1 className="max-w-[18ch] text-2xl text-ink sm:text-3xl lg:text-4xl">
              {hero.headline[locale]}
            </h1>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Magnetic>
                <Button asChild variant="primary" size="lg">
                  <Link href={primaryCta.href}>
                    {hero.ctaPrimary[locale]}
                    <CtaArrow />
                  </Link>
                </Button>
              </Magnetic>
              <Button asChild variant="secondary" size="lg">
                <Link href="/projects">{hero.ctaSecondary[locale]}</Link>
              </Button>
            </div>
          </div>

          <div className="pt-4 rule-t">
            <HeroSpecRail locale={locale} />
          </div>
        </div>
      </div>

      {/* Cream breathing room after the settled frame, before the next section. */}
      <div className="mx-auto w-full max-w-page px-(--gutter) pt-16 pb-20 lg:pt-24">
        <div className="grid gap-6 pt-5 rule-t lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <p className="max-w-[52ch] text-base text-pretty text-ink sm:text-lg">
            {hero.lede[locale]}
          </p>
          <p className="max-w-[52ch] text-sm text-ink-2">{hero.note[locale]}</p>
        </div>
      </div>
    </section>
  );
}
