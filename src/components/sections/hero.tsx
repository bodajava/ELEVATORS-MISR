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
 * ── The opening ─────────────────────────────────────────────────────────────
 * The composition is **complete at paint**. Both words, the eyebrow, the headline and both
 * calls to action are on screen and legible before a single pixel is scrolled — there is no
 * reveal to sit through and no empty cream screen. An earlier revision slid the type up from
 * `yPercent: 108` and faded the film in from zero; a visitor arriving at the page saw nothing
 * they could read. The scroll sequence now *changes* a finished composition rather than
 * assembling one.
 *
 * ── The scroll ──────────────────────────────────────────────────────────────
 * One timeline, scrubbed. The video starts tilted between the words, then travels down, scales
 * up continuously and rotates level, finishing as a wide anamorphic frame with cream margins
 * either side. The two words drift apart and recede — to 0.42, still legible, because they are
 * the page's headline and not a transition effect.
 *
 * The descent is deliberately larger than half the growth. Below that the frame's top edge
 * stays put while only its bottom extends, and the motion reads as "expanding downward"
 * rather than "travelling down".
 *
 * ── Why scale, not width ────────────────────────────────────────────────────
 * The element carries its **final** width in CSS; the opening size is a `scale` under 1.
 * Animating `width` would relayout on every scrubbed frame. This way the whole sequence is
 * transform-only, and the settled frame is exactly the specified
 * `clamp(760px, 78vw, 1240px)` with no arithmetic drift.
 *
 * `borderRadius` is counter-animated because a scaled box scales its corners too, so the
 * *visible* radius stays near `--radius-card` at both ends of the sequence.
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

      /**
       * Centring lives in GSAP, not in Tailwind.
       *
       * GSAP takes ownership of an element's transform and writes `translate: none`, which
       * silently destroyed the `-translate-x-1/2 -translate-y-1/2` utilities this element used
       * to carry. In the animated path that went unnoticed, because GSAP folds the computed
       * translate into its own matrix on first write. Under `prefers-reduced-motion` it did
       * not: `gsap.set(..., { y: 0 })` produced an identity matrix, the film sat at `left: 50%`
       * with no correction, and the page gained 173px of horizontal overflow.
       *
       * Owning both axes here means the two paths cannot disagree.
       */
      const CENTRE = { xPercent: -50, yPercent: -50 } as const;

      /** Opening width — large enough to read as the subject, not a thumbnail. */
      const openingWidth = () => gsap.utils.clamp(340, 620, window.innerWidth * 0.4);

      /** Resting corner radius. `--radius-card`, the architecture scale for editorial media. */
      const RADIUS = 24;

      const mm = gsap.matchMedia();

      /* ---------- reduced motion: the settled frame, immediately ---------- */
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(film, {
          ...CENTRE,
          scale: 1,
          rotate: 0,
          y: 0,
          borderRadius: RADIUS,
          autoAlpha: 1,
        });
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
            const openW = desktop ? openingWidth() : Math.min(window.innerWidth * 0.66, 280);
            // finalW is now the full page width, so the opening scale is derived from it
            // rather than from a clamp — the frame still opens at ~40vw between the lines.
            return gsap.utils.clamp(0.2, 1, openW / finalW);
          };

          // The film enters high — tucked up between the two words — and descends as it grows.
          // The resting position is measured against the bottom band (headline, CTAs, spec
          // rail), which must never be overlapped: an earlier pass ran 160px into it.
          // The film travels a long way down the viewport as it grows, and the type leaves
          // upward past it. That is the reference behaviour: the frame comes *with* the
          // visitor rather than settling into a slot near where it started.
          //
          // The descent must also exceed half the growth, or the frame's top edge stays put
          // and the motion reads as "expanding downward" rather than "travelling down".
          const fromY = () => -window.innerHeight * (desktop ? 0.15 : 0.09);
          const toY = () => window.innerHeight * (desktop ? 0.145 : 0.1);

          /* ---- the opening composition, fully visible ---------------------
             Everything a visitor needs in order to understand the page is on screen at
             paint: both words, the eyebrow, the headline and both calls to action. There is
             no reveal to wait through and no empty cream screen — the sequence below changes
             an already-complete composition rather than assembling one. */
          gsap.set(film, {
            ...CENTRE,
            scale: startScale,
            rotate: desktop ? -6 : -4,
            y: fromY,
            // Counter-scaled so the *visible* radius stays close to RADIUS at both ends
            // instead of being multiplied by the opening scale.
            borderRadius: () => RADIUS / startScale(),
            autoAlpha: 1,
            transformOrigin: 'center center',
            force3D: true,
          });
          gsap.set(words, { yPercent: 0, autoAlpha: 1 });
          if (copy) gsap.set(copy, { autoAlpha: 1, y: 0 });
          if (eyebrow) gsap.set(eyebrow, { autoAlpha: 1 });

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
              // It settles square. The lean belongs to the *journey* — the frame is tilted
              // while it is travelling and lands level, the way something set down comes to
              // rest flat.
              rotate: 0,
              borderRadius: RADIUS,
              duration: 1,
            },
            0
          );

          // The type leaves upward as the film comes down past it. Both words travel, the
          // top one further and sooner, so they part around the frame before clearing the
          // stage entirely — the film is moving *through* the headline, not covering it.
          //
          // They stay fully opaque while they are still on screen: this is the page's
          // headline leaving, not a fade-out effect.
          tl.to(wordTop, { yPercent: -190, duration: 1 }, 0).to(
            wordBottom,
            { yPercent: -120, duration: 1 },
            0.06
          );

          // The bottom band leaves with the type, and leaves *early* — it has to be gone
          // before the descending film reaches it, or the film crosses copy that is still
          // readable. Measured: a 0.34 fade still left it at 0.31 opacity under a 21px
          // overlap. The header keeps a permanent inspection CTA, so the conversion path is
          // never lost while this passage plays.
          if (copy)
            tl.to(copy, { y: () => -window.innerHeight * 0.28, autoAlpha: 0, duration: 0.18 }, 0);
          if (eyebrow) tl.to(eyebrow, { autoAlpha: 0, duration: 0.4 }, 0);

          // A held beat so the destination of the sequence is actually looked at before the
          // section unpins.
          tl.to({}, { duration: 0.18 }, 1);

          return () => {
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
            // No `-translate-x-1/2 -translate-y-1/2` here: GSAP owns this element's transform
            // and writes `translate: none`, so those utilities were being discarded. Centring
            // is applied as `xPercent/yPercent` in the timeline instead — see CENTRE above.
            className="absolute top-1/2 left-1/2 z-20 w-[calc(100vw-2rem)] overflow-hidden will-change-transform"
            // 2.6:1. Wider than anamorphic, and the ratio is doing a specific job: at the
            // full page width the frame has to stay short enough to travel a visible distance
            // down the viewport *and* still land inside it. At 2.35 the settled frame was
            // 599px tall at 1440x900 and the descent had nowhere to go — the motion collapsed
            // back into "grows in place", which is the thing being corrected.
            style={{ aspectRatio: '2.6 / 1' }}
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
