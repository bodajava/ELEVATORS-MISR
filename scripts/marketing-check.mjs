/**
 * Browser verification for the Marketing Films slider.
 *
 * Checks the things a unit test cannot see: that the rail is actually visible, that every
 * slide is reachable at every viewport, that RTL moves the right way, that only one video
 * decodes, that the mobile bottom navigation does not cover it, and that reduced motion
 * really does stop the auto-advance.
 *
 *   node scripts/marketing-check.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const SHOTS =
  process.argv[3] ??
  '/private/tmp/claude-501/-Users-abdelrhmannounir-Desktop-REAL-ELEVATORS/851d7b1e-8a7c-4e0a-ae0f-f328d9b322d8/scratchpad/marketing';

const FOLDER = 'assets/VIDOES/MARKTEING-video';
const EXPECTED = readdirSync(new URL(`../${FOLDER}/`, import.meta.url)).filter((f) =>
  /\.(mp4|mov|m4v|webm)$/i.test(f)
).length;

const VIEWPORTS = [
  { w: 1440, h: 900 },
  { w: 1024, h: 768 },
  { w: 768, h: 1024 },
  { w: 430, h: 932 },
  { w: 390, h: 844 },
  { w: 320, h: 568 },
];

const RAIL = '[data-film-carousel]';
const TRACK = `${RAIL} > ul`;

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

console.log(`Expecting ${EXPECTED} slides (video files in ${FOLDER})\n`);

for (const locale of ['en', 'ar']) {
  for (const { w, h } of VIEWPORTS) {
    const tag = `${locale} ${w}x${h}`;
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      isMobile: w <= 430,
      hasTouch: w <= 430,
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning')
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
            (c) => c.dataset.marketingSlide === 'clone' && c.getAttribute('aria-hidden') === 'true'
          ).length,
          clonesInert: cards.filter(
            (c) => c.dataset.marketingSlide === 'clone' && c.hasAttribute('inert')
          ).length,
          cloneVideos: cards.filter(
            (c) => c.dataset.marketingSlide === 'clone' && c.querySelector('video')
          ).length,
          cloneFocusables: cards.filter(
            (c) => c.dataset.marketingSlide === 'clone' && c.querySelector('button, a, [tabindex]')
          ).length,
          uniqueIds: new Set(
            cards.filter((c) => c.dataset.marketingSlide === 'real').map((c) => c.dataset.filmIndex)
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
          docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
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
      findings.push(`${tag}: ${state.cloneVideos} clone(s) hold a <video> — a clone must not play`);
    if (state.cloneFocusables > 0)
      findings.push(`${tag}: ${state.cloneFocusables} clone(s) hold a focusable control`);

    if (!state.visible) findings.push(`${tag}: the slider is not visible`);
    if (state.slides !== EXPECTED)
      findings.push(`${tag}: ${state.slides} slides rendered, ${EXPECTED} video files on disk`);
    if (state.uniqueIds !== EXPECTED)
      findings.push(`${tag}: ${state.uniqueIds} unique slides, expected ${EXPECTED} — duplicates`);
    if (state.blank > 0) findings.push(`${tag}: ${state.blank} blank slide(s)`);
    if (state.docOverflow > 0)
      findings.push(`${tag}: ${state.docOverflow}px horizontal page overflow`);
    if (state.widest > w)
      findings.push(`${tag}: a slide is ${state.widest}px on a ${w}px viewport`);
    if (state.dots !== EXPECTED)
      findings.push(`${tag}: ${state.dots} position indicators for ${EXPECTED} slides`);
    if (state.controlsBelowNav > 0)
      findings.push(`${tag}: ${state.controlsBelowNav} control(s) sit under the bottom navigation`);
    if (state.controlsUnderConcierge > 0)
      findings.push(
        `${tag}: ${state.controlsUnderConcierge} control(s) sit under the concierge launcher`
      );
    if (state.unlabelled > 0) findings.push(`${tag}: ${state.unlabelled} control(s) have no name`);
    if (state.smallTargets > 0)
      findings.push(`${tag}: ${state.smallTargets} control(s) smaller than 24x24 (WCAG 2.5.8)`);

    // ── Reach every slide with the next control ────────────────────────────
    // "Reachable" means brought fully into view, not brought to the leading edge. On a snap
    // rail the final card can never sit flush at the start — there is nothing after it to
    // scroll — so the leading-edge test could never see slide 4 and reported it unreachable.
    // By attribute. `nth(-1)` grabbed the last button in the subtree, which is inside the
    // expanded-film dialog — so "next" was clicking the viewer's control and the rail never
    // moved. That produced "only 1 of 4 reachable" and the false RTL direction failures.
    const next = page.locator(`${RAIL} [data-carousel-arrow="next"]`);
    const seen = new Set();
    for (let i = 0; i < EXPECTED + 1; i += 1) {
      const visible = await page.evaluate((sel) => {
        const track = document.querySelector(sel);
        const rail = track.getBoundingClientRect();
        return [...track.children]
          .map((c, index) => {
            const r = c.getBoundingClientRect();
            return r.left >= rail.left - 2 && r.right <= rail.right + 2 ? index : -1;
          })
          .filter((i) => i >= 0);
      }, TRACK);
      for (const index of visible) seen.add(index);
      await next.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
    note(`   reached slides [${[...seen].sort((a, b) => a - b).join(', ')}] with next`);
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
        const dots = [...document.querySelectorAll('[data-carousel-dot]')];
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
        const pad = Number.parseFloat(rtlPage ? cs.scrollPaddingRight : cs.scrollPaddingLeft) || 0;
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
    const stillParked = await page.evaluate((sel) => document.querySelector(sel).scrollLeft, TRACK);
    note(`   paused: scrollLeft ${parked} → ${stillParked} across a full tick`);
    if (Math.abs(stillParked - parked) > 4)
      findings.push(`${tag}: the pause control did not stop the auto-advance`);

    const beforeStep = await leadingEdge();
    await next.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1400);
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
      findings.push(`${tag}: ${consoleErrors.length} console error/warning — ${consoleErrors[0]}`);
    }

    if (w === 1440) {
      // ── Placement: directly after the hero, outside it ────────────────────
      const placement = await page.evaluate(() => {
        const rail = document.querySelector('[data-film-carousel]');
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
      });
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

      // ── The loop: forward past the last, back past the first ──────────────
      const dotState = () =>
        page.evaluate(() =>
          [...document.querySelectorAll('[data-carousel-dot]')].findIndex(
            (d) => d.getAttribute('aria-current') === 'true'
          )
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
        findings.push(`${tag}: forward navigation did not visit every slide (${order.join(',')})`);
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
            playing: [...document.querySelectorAll(`${sel} video`)].filter((v) => !v.paused).length,
            total: document.querySelectorAll(`${sel} video`).length,
          }),
          RAIL
        );
        if (onHover.playing >= 1) break;
        await page.waitForTimeout(500);
      }
      note(`   hover: ${onHover.playing} of ${onHover.total} playing`);
      if (onHover.playing > 1) findings.push(`${tag}: ${onHover.playing} videos playing on hover`);
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
      const resumeTo = await page.evaluate((sel) => document.querySelector(sel).scrollLeft, TRACK);
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
  if (end - start > -10) findings.push('keyboard: ArrowRight did not advance the rail');
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
    findings.push('reduced motion: the slider still advances on its own');
  await ctx.close();
}

await browser.close();

console.log(`\n${'═'.repeat(66)}`);
if (findings.length === 0) console.log(`PASS — ${EXPECTED} slides verified at every viewport`);
else {
  console.log(`${findings.length} FINDING(S):`);
  for (const f of findings) console.log('  ✗ ' + f);
}
console.log(`screenshots: ${SHOTS}/`);
process.exit(findings.length === 0 ? 0 : 1);
