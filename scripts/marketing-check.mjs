/**
 * Browser verification for the homepage film rails.
 *
 * Checks the things a unit test cannot see: that the rail is actually visible, that every
 * slide is reachable at every viewport, that RTL moves the right way, that only one video
 * decodes, that the mobile bottom navigation does not cover it, and that reduced motion
 * really does stop the auto-advance.
 *
 * Two rails use the same component since 2026-08-12, so the rail is selected by name and
 * both are verified by default — `document.querySelector('[data-film-carousel]')` always
 * found whichever came first in the DOM.
 *
 *   node scripts/marketing-check.mjs [baseUrl] [shotsDir] [--rail=marketing|projects|all]
 */
import { chromium } from 'playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flag = (name, fallback) =>
  process.argv
    .slice(2)
    .find((a) => a.startsWith(`--${name}=`))
    ?.split('=')[1] ?? fallback;

const BASE = positional[0] ?? 'http://localhost:3100';
const SHOTS =
  positional[1] ??
  '/private/tmp/claude-501/-Users-abdelrhmannounir-Desktop-REAL-ELEVATORS/851d7b1e-8a7c-4e0a-ae0f-f328d9b322d8/scratchpad/marketing';

const FOLDER = 'assets/VIDOES/MARKTEING-video';

/** How many marketing films are on disk — the rail must show every one of them. */
const marketingCount = readdirSync(new URL(`../${FOLDER}/`, import.meta.url)).filter((f) =>
  /\.(mp4|mov|m4v|webm)$/i.test(f)
).length;

/**
 * How many project films ship, read from the manifest the site itself renders from.
 *
 * The same filter `productFilms()` applies: everything that is not a presenter advertisement.
 * Counting derivatives in `public/` instead would count whatever the build happened to leave
 * behind, which is the class of mistake the rights register exists to prevent.
 */
const manifest = JSON.parse(
  readFileSync(new URL('../src/content/generated/media-manifest.json', import.meta.url), 'utf8')
);
const projectCount = manifest.videos.filter((v) => v.role !== 'marketing-film').length;

const RAILS = {
  marketing: { label: 'Marketing Films', expected: marketingCount },
  projects: { label: 'Project films', expected: projectCount },
};

const chosen = flag('rail', 'all');
const railNames = chosen === 'all' ? Object.keys(RAILS) : [chosen];
for (const name of railNames) {
  if (!RAILS[name]) {
    console.error(
      `Unknown rail "${name}". Expected one of: ${Object.keys(RAILS).join(', ')}, all.`
    );
    process.exit(2);
  }
}

const VIEWPORTS = [
  { w: 1440, h: 900 },
  { w: 1024, h: 768 },
  { w: 768, h: 1024 },
  { w: 430, h: 932 },
  { w: 390, h: 844 },
  { w: 320, h: 568 },
];

/* Set per rail by the loop at the bottom of this file. */
let RAIL = '[data-film-carousel="marketing"]';
let TRACK = `${RAIL} > ul`;
let EXPECTED = marketingCount;

const findings = [];
const note = (m) => console.log('  ' + m);

await mkdir(SHOTS, { recursive: true });
const browser = await chromium.launch();

/** Scroll for real: the section sits inside a Reveal held at autoAlpha 0 until ScrollTrigger fires. */
const bring = (page) =>
  page.evaluate(async (sel) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const el = document.querySelector(sel);
      if (!el) return false;
      const box = el.getBoundingClientRect();
      const centred = box.top + box.height / 2 - window.innerHeight / 2;
      if (Math.abs(centred) < 60) return true;
      const from = window.scrollY;
      const to = Math.max(0, from + centred);
      const stepSize = Math.sign(to - from) * 350;
      for (let at = from; Math.abs(to - at) > 350; at += stepSize) {
        window.scrollTo(0, at);
        await sleep(25);
      }
      window.scrollTo(0, to);
      await sleep(260);
    }
    return true;
  }, RAIL);

/**
 * Wait until the rail has actually stopped moving.
 *
 * A fixed delay was fine when a phone showed three cards at once: a sample taken mid-scroll
 * still had some card fully inside the rail. Since the cards were sized up (they were 118px
 * wide on a phone — see film-carousel.tsx) exactly one card is fully visible at a time, and a
 * sample taken while a 235px smooth scroll is still in flight sees **none** of them. That
 * dropped a slide from the reachable set at random, on a different viewport each run, and the
 * carousel itself was fine — driven with a long enough wait it visits 0 → 1 → 2 → 3 → 0 at
 * every width in both locales.
 *
 * So: poll the scroll position instead of guessing. Wait for the rail to *start* moving first,
 * then for it to stop — a stability test alone returns immediately, because a click's smooth
 * scroll has not begun by the time the first two samples are taken.
 */
const settle = (page, timeout = 4500) =>
  page.evaluate(
    async ([sel, limit]) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const track = document.querySelector(sel);
      if (!track) return false;
      const deadline = Date.now() + limit;
      const start = track.scrollLeft;

      // Movement, or 800ms of nothing. A step that genuinely goes nowhere still has to be
      // measurable — that is a finding, not a reason to hang.
      const moveBy = Math.min(Date.now() + 800, deadline);
      while (Date.now() < moveBy && track.scrollLeft === start) await sleep(40);

      // Stillness for 240ms, not for one sample. The rail's loop correction fires 140ms after
      // the last scroll event and moves it by a whole block, so a single-sample test reports
      // "settled" during that gap and every measurement after it is taken mid-teleport — which
      // is what "next did not change the active slide" looked like at 1440.
      let last = NaN;
      let still = 0;
      while (Date.now() < deadline) {
        await sleep(60);
        const now = track.scrollLeft;
        still = now === last ? still + 1 : 0;
        last = now;
        if (still >= 4) return true;
      }
      return false;
    },
    [TRACK, timeout]
  );

for (const railName of railNames) {
  RAIL = `[data-film-carousel="${railName}"]`;
  TRACK = `${RAIL} > ul`;
  EXPECTED = RAILS[railName].expected;
  const railTag = RAILS[railName].label;

  console.log(`\n${'━'.repeat(66)}`);
  console.log(`${railTag} — expecting ${EXPECTED} slides\n`);

  for (const locale of ['en', 'ar']) {
    for (const { w, h } of VIEWPORTS) {
      const tag = `${railName} ${locale} ${w}x${h}`;
      const ctx = await browser.newContext({
        viewport: { width: w, height: h },
        isMobile: w <= 430,
        hasTouch: w <= 430,
      });
      const page = await ctx.newPage();
      const consoleErrors = [];
      page.on('console', (m) => {
        // Next's LCP advisory is a development-only hint about `priority` on whichever image
        // happened to be largest when the harness scrolled past it — it is not a defect in the
        // rail, it never reaches production, and which image triggers it changes with the
        // scroll position. Everything else still counts.
        const lcpAdvice = m.text().includes('Largest Contentful Paint (LCP)');
        if ((m.type() === 'error' || m.type() === 'warning') && !lcpAdvice)
          consoleErrors.push(m.text().slice(0, 160));
      });
      page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 160)));

      await page.goto(`${BASE}/${locale}`, { waitUntil: 'load' });
      await bring(page);
      await page.waitForTimeout(1600);

      const state = await page.evaluate(
        ([railSel]) => {
          const rail = document.querySelector(railSel);
          if (!rail) return null;
          const track = rail.querySelector('ul');
          const cards = [...track.children];
          const railBox = rail.getBoundingClientRect();
          // The bottom navigation is `lg:hidden`, so above that breakpoint it is still in the
          // DOM with a zero-height box at the top of the page. Reading its `top` unconditionally
          // reported every control as "under the navigation" on a 1440px desktop.
          const nav = document.querySelector('[data-bottom-nav]');
          const navShown = nav ? getComputedStyle(nav).display !== 'none' : false;
          const navTop = navShown ? nav.getBoundingClientRect().top : Infinity;
          const controls = [...rail.querySelectorAll('button')];
          return {
            visible: railBox.height > 40 && getComputedStyle(rail).visibility !== 'hidden',
            slides: cards.filter((c) => c.dataset.marketingSlide === 'real').length,
            clones: cards.filter((c) => c.dataset.marketingSlide === 'clone').length,
            clonesHidden: cards.filter(
              (c) =>
                c.dataset.marketingSlide === 'clone' && c.getAttribute('aria-hidden') === 'true'
            ).length,
            clonesInert: cards.filter(
              (c) => c.dataset.marketingSlide === 'clone' && c.hasAttribute('inert')
            ).length,
            cloneVideos: cards.filter(
              (c) => c.dataset.marketingSlide === 'clone' && c.querySelector('video')
            ).length,
            cloneFocusables: cards.filter(
              (c) =>
                c.dataset.marketingSlide === 'clone' && c.querySelector('button, a, [tabindex]')
            ).length,
            uniqueIds: new Set(
              cards
                .filter((c) => c.dataset.marketingSlide === 'real')
                .map((c) => c.dataset.filmIndex)
            ).size,
            blank: cards.filter((c) => c.getBoundingClientRect().width < 20).length,
            widest: Math.max(...cards.map((c) => Math.round(c.getBoundingClientRect().width))),
            frame: (() => {
              const f = cards
                .find((c) => c.dataset.marketingSlide === 'real')
                ?.querySelector('div')
                ?.getBoundingClientRect();
              return f ? `${Math.round(f.width)}x${Math.round(f.height)}` : null;
            })(),
            sectionHeight: Math.round(rail.closest('section')?.getBoundingClientRect().height ?? 0),
            docOverflow:
              document.documentElement.scrollWidth - document.documentElement.clientWidth,
            trackScrollable: track.scrollWidth > track.clientWidth + 4,
            dots: rail.querySelectorAll('[data-carousel-dot]').length,
            controlsBelowNav: controls.filter((b) => b.getBoundingClientRect().bottom > navTop)
              .length,
            // The concierge launcher is fixed to the bottom of the viewport, so it can land on
            // top of in-flow controls. Measured rather than assumed.
            controlsUnderConcierge: (() => {
              const launcher = document.querySelector(
                '[data-concierge-launcher], [aria-label*="question"], [aria-label*="سؤال"]'
              );
              if (!launcher) return 0;
              const l = launcher.getBoundingClientRect();
              if (l.width === 0) return 0;
              return controls.filter((b) => {
                const r = b.getBoundingClientRect();
                return r.right > l.left && r.left < l.right && r.bottom > l.top && r.top < l.bottom;
              }).length;
            })(),
            unlabelled: controls.filter(
              (b) => !(b.getAttribute('aria-label') || b.textContent || '').trim()
            ).length,
            // WCAG 2.5.8 (AA) is 24x24. The earlier 40px floor here was stricter than the
            // standard and flagged the site's existing 36px media controller on every viewport,
            // which is neither part of this slider nor a failure.
            smallTargets: controls.filter((b) => {
              const r = b.getBoundingClientRect();
              return r.height > 0 && (r.height < 24 || r.width < 24);
            }).length,
            docDir: getComputedStyle(document.documentElement).direction,
          };
        },
        [RAIL]
      );

      if (!state) {
        findings.push(`${tag}: the slider is not on the page`);
        await ctx.close();
        continue;
      }

      note(
        `${tag.padEnd(14)} real ${state.slides} (unique ${state.uniqueIds}) · clones ${state.clones} · frame ${state.frame} · section ${state.sectionHeight}px · overflow ${state.docOverflow}px · dots ${state.dots}`
      );

      if (state.clones !== EXPECTED * 2)
        findings.push(
          `${tag}: ${state.clones} clones, expected ${EXPECTED * 2} (one block each side)`
        );
      if (state.clonesHidden !== state.clones)
        findings.push(`${tag}: ${state.clones - state.clonesHidden} clone(s) are not aria-hidden`);
      if (state.clonesInert !== state.clones)
        findings.push(`${tag}: ${state.clones - state.clonesInert} clone(s) are not inert`);
      if (state.cloneVideos > 0)
        findings.push(
          `${tag}: ${state.cloneVideos} clone(s) hold a <video> — a clone must not play`
        );
      if (state.cloneFocusables > 0)
        findings.push(`${tag}: ${state.cloneFocusables} clone(s) hold a focusable control`);

      if (!state.visible) findings.push(`${tag}: the slider is not visible`);
      if (state.slides !== EXPECTED)
        findings.push(`${tag}: ${state.slides} slides rendered, ${EXPECTED} video files on disk`);
      if (state.uniqueIds !== EXPECTED)
        findings.push(
          `${tag}: ${state.uniqueIds} unique slides, expected ${EXPECTED} — duplicates`
        );
      if (state.blank > 0) findings.push(`${tag}: ${state.blank} blank slide(s)`);
      if (state.docOverflow > 0)
        findings.push(`${tag}: ${state.docOverflow}px horizontal page overflow`);
      if (state.widest > w)
        findings.push(`${tag}: a slide is ${state.widest}px on a ${w}px viewport`);
      if (state.dots !== EXPECTED)
        findings.push(`${tag}: ${state.dots} position indicators for ${EXPECTED} slides`);
      if (state.controlsBelowNav > 0)
        findings.push(
          `${tag}: ${state.controlsBelowNav} control(s) sit under the bottom navigation`
        );
      if (state.controlsUnderConcierge > 0)
        findings.push(
          `${tag}: ${state.controlsUnderConcierge} control(s) sit under the concierge launcher`
        );
      if (state.unlabelled > 0)
        findings.push(`${tag}: ${state.unlabelled} control(s) have no name`);
      if (state.smallTargets > 0)
        findings.push(`${tag}: ${state.smallTargets} control(s) smaller than 24x24 (WCAG 2.5.8)`);

      // ── Reach every slide with the next control ────────────────────────────
      // "Reached" is which slide the rail itself reports as leading, read from its own
      // position indicators. It used to be "which cards are entirely inside the rail", which
      // is a proxy and a bad one: how many cards fit is a function of the card's width, so on
      // a rail showing one card at a time a single sample taken mid-scroll saw none of them
      // and dropped a slide from the set. Driven with a settle between clicks, both rails
      // visit 0 → 1 → 2 → 3 → 0 at every width in both locales; this now measures that.
      //
      // By attribute. `nth(-1)` grabbed the last button in the subtree, which is inside the
      // expanded-film dialog — so "next" was clicking the viewer's control and the rail never
      // moved. That produced "only 1 of 4 reachable" and the false RTL direction failures.
      const next = page.locator(`${RAIL} [data-carousel-arrow="next"]`);
      const pauseToggle = page.locator(`${RAIL} [data-carousel-toggle]`);
      const activeIndex = () =>
        page.evaluate(
          (sel) =>
            [...document.querySelectorAll(`${sel} [data-carousel-dot]`)].findIndex(
              (d) => d.getAttribute('aria-current') === 'true'
            ),
          RAIL
        );
      // Stop the auto-advance for the duration of this check. It fires every 4.2s and each
      // iteration below takes a second or two, so the timer was stepping the rail *between*
      // a click and its sample: the trail came out with a slide skipped or repeated, on a
      // different viewport every run, while clicking `next` by hand visited all four.
      await pauseToggle.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(300);

      const seen = new Set();
      // Per-step record, so a failure says which step went nowhere rather than only the total.
      const trail = [];
      for (let i = 0; i < EXPECTED + 1; i += 1) {
        const at = await activeIndex();
        trail.push(at < 0 ? '—' : String(at));
        if (at >= 0) seen.add(at);
        await next.click({ timeout: 5000 }).catch(() => {});
        await settle(page);
        // The rail reads its active slide off a scroll listener through requestAnimationFrame
        // and then a React render, so the indicator lands a beat after the scroll itself
        // stops. Wait for the state to catch up with the position rather than sampling into
        // that gap — a step that genuinely goes nowhere still falls through after 1.2s and is
        // reported as a repeat in the trail.
        for (let held = 0; held < 10 && (await activeIndex()) === at; held += 1) {
          await page.waitForTimeout(120);
        }
      }
      // Back to running, which is the state every check below assumes.
      await pauseToggle.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(300);

      note(
        `   reached slides [${[...seen].sort((a, b) => a - b).join(', ')}] with next · steps ${trail.join(' → ')}`
      );
      if (seen.size < EXPECTED)
        findings.push(
          `${tag}: only ${seen.size} of ${EXPECTED} slides reachable with the next control`
        );

      // ── Direction ──────────────────────────────────────────────────────────
      // Measured on the *active slide*, not on the first child: the first child is a clone, and
      // the loop correction moves it by a whole block, so its position says nothing about which
      // way the rail travelled.
      const leadingEdge = () =>
        page.evaluate((sel) => {
          const track = document.querySelector(sel);
          // Scoped to this rail. Two rails now use the same component, so an unscoped
          // `[data-carousel-dot]` read the *other* one's active slide: every measurement here
          // came out exactly one card off, on a page where the rail itself was fine.
          const dots = [...track.parentElement.querySelectorAll('[data-carousel-dot]')];
          const index = dots.findIndex((d) => d.getAttribute('aria-current') === 'true');
          const rtlPage = getComputedStyle(document.documentElement).direction === 'rtl';
          const card = [...track.children].find(
            (c) => c.dataset.marketingSlide === 'real' && Number(c.dataset.filmIndex) === index
          );
          if (!card) return null;
          const rail = track.getBoundingClientRect();
          const box = card.getBoundingClientRect();
          // Distance from the rail's leading edge, reduced modulo one block. The card sitting
          // at the edge is often a *clone* of the active film — that is the whole point of the
          // loop, and it is visually identical — so the real card can legitimately be one or
          // two whole blocks away. Only the remainder says whether it is snapped.
          const reals = [...track.children].filter((c) => c.dataset.marketingSlide === 'real');
          const stride =
            reals.length > 1
              ? Math.abs(
                  reals[1].getBoundingClientRect().left - reals[0].getBoundingClientRect().left
                )
              : 0;
          const block = stride * reals.length;
          // Subtract the rail's own scroll padding. A snapped card sits exactly that far in —
          // 32px at the tablet gutter — so measuring against the raw edge called correct
          // snapping a failure.
          const cs = getComputedStyle(track);
          const pad =
            Number.parseFloat(rtlPage ? cs.scrollPaddingRight : cs.scrollPaddingLeft) || 0;
          const raw = (rtlPage ? rail.right - box.right : box.left - rail.left) - pad;
          const offset = block > 0 ? Math.round(((raw % block) + block) % block) : Math.round(raw);
          return { index, offset: Math.min(offset, block > 0 ? block - offset : offset) };
        }, TRACK);

      // Stop the auto-advance first, and check that the control does stop it. Left running it
      // fires during the waits between clicks and adds steps of its own — the sequence then
      // reads 2,0,1,2,0,1 and looks like navigation skipping a slide when it is really two
      // sources of movement being measured as one.
      // Scoped to this rail. The homepage film strip carries its own toggle, so an
      // unscoped selector matched two elements, the click threw, and the `.catch` swallowed it —
      // the slider was never actually paused and every pause assertion was measuring nothing.
      const toggle = page.locator(`${RAIL} [data-carousel-toggle]`);
      await toggle.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1400);
      const parked = await page.evaluate((sel) => document.querySelector(sel).scrollLeft, TRACK);
      await page.waitForTimeout(5200); // longer than one 4.2s tick
      const stillParked = await page.evaluate(
        (sel) => document.querySelector(sel).scrollLeft,
        TRACK
      );
      note(`   paused: scrollLeft ${parked} → ${stillParked} across a full tick`);
      if (Math.abs(stillParked - parked) > 4)
        findings.push(`${tag}: the pause control did not stop the auto-advance`);

      const beforeStep = await leadingEdge();
      await next.click({ timeout: 5000 }).catch(() => {});
      await settle(page);
      const afterStep = await leadingEdge();
      note(
        `   next: slide ${beforeStep?.index} → ${afterStep?.index}, active card sits ${afterStep?.offset}px from the leading edge`
      );
      if (!afterStep || afterStep.index === beforeStep?.index)
        findings.push(`${tag}: next did not change the active slide`);
      if (afterStep && Math.abs(afterStep.offset) > 24)
        findings.push(
          `${tag}: the active slide sits ${afterStep.offset}px from the leading edge — wrong direction or not snapped`
        );

      // ── One video at a time ────────────────────────────────────────────────
      await page.waitForTimeout(1200);
      const playing = await page.evaluate(
        (sel) => [...document.querySelectorAll(`${sel} video`)].filter((v) => !v.paused).length,
        RAIL
      );
      note(`   videos playing at once: ${playing}`);
      if (playing > 1) findings.push(`${tag}: ${playing} videos playing at once`);

      if (consoleErrors.length > 0) {
        note(`   console: ${consoleErrors[0]}`);
        findings.push(
          `${tag}: ${consoleErrors.length} console error/warning — ${consoleErrors[0]}`
        );
      }

      if (w === 1440 && railName === 'marketing') {
        // ── Placement: directly after the hero, outside it ────────────────────
        // Marketing Films only. The project rail belongs further down the page, so this rule
        // is not a property of the component — it is a property of that one section.
        const placement = await page.evaluate((sel) => {
          const rail = document.querySelector(sel);
          const section = rail.closest('section');
          const hero = document.querySelector('[data-hero-stage]')?.closest('section');
          if (!hero) return null;
          const sections = [...document.querySelectorAll('main > section, main > div > section')];
          return {
            insideHero: hero.contains(rail),
            heroBottom: Math.round(hero.getBoundingClientRect().bottom + window.scrollY),
            sectionTop: Math.round(section.getBoundingClientRect().top + window.scrollY),
            nextAfterHero: sections.indexOf(section) - sections.indexOf(hero),
          };
        }, RAIL);
        if (placement) {
          const gap = placement.sectionTop - placement.heroBottom;
          note(
            `   placement: ${gap}px after the hero, inside hero: ${placement.insideHero}, sibling offset ${placement.nextAfterHero}`
          );
          if (placement.insideHero) findings.push(`${tag}: the slider is inside the hero`);
          if (placement.nextAfterHero !== 1)
            findings.push(
              `${tag}: the slider is ${placement.nextAfterHero} sections after the hero, expected 1`
            );
          if (gap > 220) findings.push(`${tag}: ${gap}px of empty space between hero and slider`);
          if (gap < -4) findings.push(`${tag}: the slider overlaps the hero by ${-gap}px`);
        }
      }

      if (w === 1440) {
        // ── The loop: forward past the last, back past the first ──────────────
        const dotState = () =>
          page.evaluate(
            (sel) =>
              [...document.querySelectorAll(`${sel} [data-carousel-dot]`)].findIndex(
                (d) => d.getAttribute('aria-current') === 'true'
              ),
            RAIL
          );
        const prev = page.locator(`${RAIL} [data-carousel-arrow="prev"]`);
        const order = [];
        await page.waitForTimeout(900);
        for (let i = 0; i < EXPECTED + 2; i += 1) {
          order.push(await dotState());
          await next.click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(950);
        }
        note(`   forward: ${order.join(' → ')}`);
        if (!order.includes(0) || !order.includes(EXPECTED - 1))
          findings.push(
            `${tag}: forward navigation did not visit every slide (${order.join(',')})`
          );
        const wrapped = order.some((v, i) => i > 0 && order[i - 1] === EXPECTED - 1 && v === 0);
        if (!wrapped)
          findings.push(`${tag}: forward from the last slide did not continue to the first`);

        const back = [];
        await page.waitForTimeout(900);
        for (let i = 0; i < EXPECTED + 2; i += 1) {
          back.push(await dotState());
          await prev.click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(950);
        }
        note(`   backward: ${back.join(' → ')}`);
        const wrappedBack = back.some((v, i) => i > 0 && back[i - 1] === 0 && v === EXPECTED - 1);
        if (!wrappedBack)
          findings.push(`${tag}: backward from the first slide did not continue to the last`);

        // ── Hover-to-play: one plays, the rest stop ───────────────────────────
        // Park on a known slide, then hover it with Playwright's own hover, which handles
        // scrolling and pointer positioning. Hand-computed coordinates were the problem: a
        // single jump from a control onto the card did not reliably produce a `mouseenter`, so
        // the check read zero on one viewport while the behaviour itself was correct — verified
        // directly by driving the same sequence and reading the component's state.
        await page
          .locator(`${RAIL} [data-carousel-dot]`)
          .first()
          .click({ timeout: 5000 })
          .catch(() => {});
        await page.waitForTimeout(1600);
        await page
          .locator(`${RAIL} [data-marketing-slide="real"][data-film-index="0"]`)
          .hover({ timeout: 5000 })
          .catch(() => {});
        // Poll rather than guess. A card that has just scrolled into view has to have its
        // source attached and metadata loaded before it can start, so a fixed wait sometimes
        // sampled the gap and read zero — which looked like hover-to-play being broken.
        let onHover = { playing: 0, total: 0 };
        for (let attempt = 0; attempt < 20; attempt += 1) {
          onHover = await page.evaluate(
            (sel) => ({
              playing: [...document.querySelectorAll(`${sel} video`)].filter((v) => !v.paused)
                .length,
              total: document.querySelectorAll(`${sel} video`).length,
            }),
            RAIL
          );
          if (onHover.playing >= 1) break;
          await page.waitForTimeout(500);
        }
        note(`   hover: ${onHover.playing} of ${onHover.total} playing`);
        if (onHover.playing > 1)
          findings.push(`${tag}: ${onHover.playing} videos playing on hover`);
        if (onHover.playing !== 1)
          findings.push(
            `${tag}: hovering a slide started ${onHover.playing} videos, expected exactly 1`
          );

        await page.screenshot({ path: path.join(SHOTS, `${locale}-hover-playing.png`) });

        await page.mouse.move(4, 4);
        await page.waitForTimeout(1200);
        const afterLeave = await page.evaluate(
          (sel) => [...document.querySelectorAll(`${sel} video`)].filter((v) => !v.paused).length,
          RAIL
        );
        note(`   after leaving: ${afterLeave} playing`);
        if (afterLeave > 0)
          findings.push(`${tag}: ${afterLeave} video(s) still playing after the pointer left`);

        // ── Resume ────────────────────────────────────────────────────────────
        await toggle.click({ timeout: 5000 }).catch(() => {});
        const resumeFrom = await page.evaluate(
          (sel) => document.querySelector(sel).scrollLeft,
          TRACK
        );
        await page.waitForTimeout(6200);
        const resumeTo = await page.evaluate(
          (sel) => document.querySelector(sel).scrollLeft,
          TRACK
        );
        note(`   resumed: scrollLeft ${resumeFrom} → ${resumeTo}`);
        if (Math.abs(resumeTo - resumeFrom) < 4)
          findings.push(`${tag}: the slider did not resume advancing after the pause was released`);
      }

      await page.screenshot({ path: path.join(SHOTS, `${locale}-${w}x${h}.png`) });
      await ctx.close();
    }
  }

  // ── Keyboard ────────────────────────────────────────────────────────────────
  console.log('\n══ keyboard ══');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/en`, { waitUntil: 'load' });
    await bring(page);
    await page.waitForTimeout(1400);
    await page.locator(TRACK).focus();
    const start = await page.evaluate(
      (sel) => document.querySelector(sel).children[0].getBoundingClientRect().left,
      TRACK
    );
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1300);
    const end = await page.evaluate(
      (sel) => document.querySelector(sel).children[0].getBoundingClientRect().left,
      TRACK
    );
    note(`ArrowRight moved the rail ${(end - start).toFixed(0)}px`);
    if (end - start > -10)
      findings.push(`${railName} keyboard: ArrowRight did not advance the rail`);
    await ctx.close();
  }

  // ── Reduced motion ──────────────────────────────────────────────────────────
  console.log('\n══ reduced motion ══');
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/en`, { waitUntil: 'load' });
    await bring(page);
    await page.waitForTimeout(1200);
    await page.mouse.move(10, 10); // never hovering the rail
    const at = () => page.evaluate((sel) => document.querySelector(sel).scrollLeft, TRACK);
    const first = await at();
    await page.waitForTimeout(6000); // well past the 4.2s cadence
    const second = await at();
    note(`scrollLeft ${first} → ${second} over 6s with no interaction`);
    if (Math.abs(second - first) > 4)
      findings.push(`${railName} reduced motion: the slider still advances on its own`);
    await ctx.close();
  }
}

await browser.close();

console.log(`\n${'═'.repeat(66)}`);
if (findings.length === 0)
  console.log(
    `PASS — ${railNames.map((n) => `${RAILS[n].label} (${RAILS[n].expected})`).join(' and ')} verified at every viewport`
  );
else {
  console.log(`${findings.length} FINDING(S):`);
  for (const f of findings) console.log('  ✗ ' + f);
}
console.log(`screenshots: ${SHOTS}/`);
process.exit(findings.length === 0 ? 0 : 1);
