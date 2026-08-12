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

  /**
   * The wordmark, in the locale's own script.
   *
   * The two halves are not styled identically across locales, and cannot be. The Latin lockup
   * is set in Bricolage at 19vw with heavy tracking-in and a 0.78 leading, all of which are
   * wrong for Arabic: Alexandria is a connected script that breaks under negative tracking,
   * ships no weight above 600 here (see `src/lib/fonts.ts`), and needs real leading or its
   * ascenders are sliced by the `overflow-clip` wrapper. It is also a longer string — «العربية
   * للمصاعد» is fifteen characters against "Elevators"' nine — so it is set smaller to span
   * the same measure rather than run off both edges.
   */
  const [word1, word2] = hero.wordmark[locale];
  const arabic = locale === 'ar';
  const dir = arabic ? 'rtl' : 'ltr';
  const wordClass = arabic
    ? 'block font-display text-[12.5vw] leading-[1.12] font-semibold text-ink lg:text-[11.5vw]'
    : 'block font-display text-[19vw] leading-[0.78] font-extrabold tracking-[-0.06em] text-ink uppercase lg:text-[17.5vw]';

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
            // Computed, not measured.
            //
            // This read `film.offsetWidth || 1`, and the fallback was not harmless. When the
            // set below runs before the element has been laid out, `offsetWidth` is 0, the
            // divisor became 1, `openW / 1` was far above 1, and the clamp returned **1** —
            // an opening scale of exactly full size, with no growth left in the sequence.
            // Whether that happened was a race: the same viewport gave 0.937 on one locale
            // and 1 on the other, because one settled its layout before the set and the
            // other did not. `invalidateOnRefresh` could not recover it either, since the
            // timeline records its start value from whatever the element is showing.
            //
            // The final width is not something that has to be measured — the element is
            // `calc(100vw - 2rem)`, so it is `innerWidth - 32` by construction. Deriving it
            // removes the race entirely and reproduces the desktop scale exactly (0.409 at
            // 1440, the value the hero harness records).
            const GUTTER_PX = 32;
            const finalW = window.innerWidth - GUTTER_PX;
            // On a phone the opening frame was `min(66vw, 280px)` against a 2.6:1 ratio,
            // which produced a 257x99 stamp sitting in the middle of an otherwise empty
            // 844px screen — the first thing a visitor saw was mostly nothing. The phone
            // frame now opens near the full gutter width, and the ratio it opens at is
            // taller (see `aspect-3/2` on the element), so the opening composition has
            // something in it.
            //
            // Capped by height as well as width, because a phone is not only narrow. At
            // 320x568 an 86%-of-width frame is 275x183, and 183px of a 568px screen that
            // already owes space to a header, a wordmark, a headline, two buttons and a
            // bottom bar is more than there is. The second term keeps the opening frame
            // under 40% of the viewport's height; on a normal phone the width term is
            // smaller and this never binds.
            const openW = desktop
              ? openingWidth()
              : Math.min(window.innerWidth * 0.86, window.innerHeight * 0.3 * (3 / 2));
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
          // The resting offset is measured against the seam between the two words, not chosen
          // by eye. At -0.15vh the frame sat almost entirely above that seam, which put it
          // behind the first word (z-30) with only a sliver showing above the capitals — the
          // film was in the composition but you could not see it. Sitting across the seam is
          // what the weave is for: the first word crosses its top, the second passes behind
          // its bottom, and both stay readable.
          //
          // Arabic rests higher, and that is a property of the script rather than a taste
          // call. Latin capitals are vertical stems with open counters, so a frame crossing
          // their tops leaves them perfectly readable. Alexandria's letters are joined along a
          // horizontal spine, and an edge landing in the middle of «العربية للمصاعد» cuts the
          // joins and breaks the word in two. The Arabic lockup is also set smaller, so the
          // same offset eats a much larger share of it. It sits higher instead, where the
          // short first word — «مصر», a third the width of the frame — hides very little.
          const rest = arabic ? (desktop ? 0.085 : 0.06) : desktop ? 0.02 : 0.015;
          const fromY = () => -window.innerHeight * rest;
          // The descent still has to exceed half the frame's growth in height, or the top edge
          // stays put and the move reads as "expanding downward" rather than travelling. The
          // start is ~130px lower than it was, so the destination goes as far down as the
          // viewport still allows: at 1440x900 the settled frame is 542px tall, which leaves
          // room for it to land with its bottom edge just inside the fold and no further.
          const toY = () => window.innerHeight * (desktop ? 0.215 : 0.16);

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
    // `arabic` changes the resting offset below, so it is a real dependency of the timeline
    // rather than a value read once at mount.
    { scope, dependencies: [arabic] }
  );

  return (
    <section ref={scope} className="relative">
      <div
        data-hero-stage
        // Deliberately NOT `overflow-clip`: the video grows past the type and a clipped
        // stage would slice it. The instrument layer and words are inset enough that
        // nothing else needs clipping here.
        // `pb` on a phone clears the floating bottom bar as well as the page edge — the spec
        // rail is the last thing in this stage and it was sitting directly under the bar.
        // (The floating concierge launcher, which also lives in this corner, is handled
        // separately in `concierge.tsx` — it defers its own entrance rather than this stage
        // reserving space for it, because padding *after* the last flex item cannot move an
        // *earlier* one, which is what the CTA row is.)
        // `min-h-svh`, not `h-svh`. Locked to exactly one viewport, a short screen (a 568px
        // iPhone SE, or any phone in landscape) had to fit the eyebrow, the wordmark, the
        // film, a two-line headline, two calls to action and the spec rail into ~415px of
        // usable height — so they overlapped each other instead. The stage now grows past
        // the fold on the screens that need it and is exactly one viewport everywhere else,
        // which is what it always was on the sizes it was designed against.
        className="relative flex min-h-svh flex-col justify-between px-(--gutter) pt-20 pb-[calc(var(--bottom-nav-space)+0.75rem)] lg:pt-28 lg:pb-8"
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
        {/* The film is absolutely positioned, so it contributes no height and this band was
            free to collapse to the height of the two words — about 95px. On a 568px or 667px
            phone that is exactly what happened: the band shrank, the film kept its own size,
            and it overlapped the eyebrow above and the headline below. The floor below is the
            film's own height expressed in the same terms the opening scale uses (86% of the
            width at 3:2 → 57vw tall, capped at 30svh), plus slack for the tilt. On a phone
            with room it is already smaller than the band and changes nothing; on a short one
            it makes the stage grow past the fold instead of stacking things on top of each
            other. `lg` opts out — the desktop stage is never short of height. */}
        <div className="relative flex min-h-[calc(max(57vw,30svh)+2rem)] flex-1 flex-col items-center justify-center lg:min-h-0">
          {/* First word — in front of the video */}
          <span aria-hidden className="relative z-30 block overflow-clip">
            <span data-hero-word-1 lang={locale} dir={dir} className={wordClass}>
              {word1}
            </span>
          </span>

          {/* The video — between the words */}
          <div
            data-hero-film
            // No `-translate-x-1/2 -translate-y-1/2` here: GSAP owns this element's transform
            // and writes `translate: none`, so those utilities were being discarded. Centring
            // is applied as `xPercent/yPercent` in the timeline instead — see CENTRE above.
            // The ratio is a breakpoint decision, not one number.
            //
            // 2.6:1 from `lg`. Wider than anamorphic, and it is doing a specific job: at the
            // full page width the frame has to stay short enough to travel a visible distance
            // down the viewport *and* still land inside it. At 2.35 the settled frame was
            // 599px tall at 1440x900 and the descent had nowhere to go — the motion collapsed
            // back into "grows in place", which is the thing being corrected.
            //
            // On a phone that same ratio produced a 358x138 letterbox: a 16% band across an
            // 844px screen, with the rest of the first view empty. A landscape clip needs
            // height to read at all at 390px, so the phone gets 3:2 — 358x239, which is a
            // frame a visitor can actually see something in.
            className="absolute top-1/2 left-1/2 z-20 aspect-3/2 w-[calc(100vw-2rem)] overflow-hidden will-change-transform lg:aspect-[2.6/1]"
          >
            {heroAsset ? <HeroVideo hero={heroAsset} /> : null}

            {/* Phone-only scrim. Below `lg` the wordmark sits on top of the footage rather
                than woven through it, and this clip is bright — sunlit glass and a white
                wall. Ink type over that measured under 3:1 across the brightest thirds. A
                wash of the page's own colour lifts it back without tinting the film or
                introducing a colour the system does not already use. It is `lg:hidden`
                because on a wide screen the type is not over the frame at all. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-1 bg-paper/45 lg:hidden"
            />
          </div>

          {/* Second word — behind the video on a wide screen, in front of it on a phone.
              The weave needs the wordmark to be bigger than the frame it is woven through.
              That holds at 1440, where "ELEVATORS" is 1120px against a 596px frame; it does
              not hold at 390, where the phone frame is 374x263 and the two words together
              are 116px tall — the frame simply swallowed the second word and the brand name
              read as "EGYPT". Below `lg` the composition is the wordmark over the film
              instead, which is legible at that size and still one image and one name. */}
          <span aria-hidden className="relative z-30 block overflow-clip lg:z-10">
            <span data-hero-word-2 lang={locale} dir={dir} className={wordClass}>
              {word2}
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

      {/* Cream breathing room after the settled frame, before the next section.
          The claim leads and the lede answers it. They stack in one column on a phone with the
          claim set larger: a two-column split at 390px gave each of them about 24 characters a
          line, which in Arabic is two or three words. */}
      <div className="mx-auto w-full max-w-page px-(--gutter) pt-12 pb-14 lg:pt-20 lg:pb-20">
        <div className="grid gap-6 pt-5 rule-t lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-16">
          <p className="flex max-w-[32ch] gap-3 text-xl leading-snug font-medium text-balance text-ink sm:text-2xl">
            {/* The one accent mark in this band, and a fill rather than text — full-strength
                orange as small text on cream is 2.5:1 and fails. It states nothing the words
                do not already state. */}
            <span aria-hidden className="mt-3 size-1.5 shrink-0 rounded-full bg-accent sm:mt-4" />
            <span>{hero.claim[locale]}</span>
          </p>
          <p className="max-w-[52ch] text-base text-pretty text-ink-2 sm:text-lg">
            {hero.lede[locale]}
          </p>
        </div>
      </div>
    </section>
  );
}
