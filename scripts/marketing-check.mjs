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
          slides: cards.length,
          uniqueIds: new Set(
            cards.map((c) => c.querySelector('video')?.currentSrc || c.getAttribute('aria-label'))
          ).size,
          blank: cards.filter((c) => c.getBoundingClientRect().width < 20).length,
          widest: Math.max(...cards.map((c) => Math.round(c.getBoundingClientRect().width))),
          docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          trackScrollable: track.scrollWidth > track.clientWidth + 4,
          dots: rail.querySelectorAll('[data-carousel-dot]').length,
          controlsBelowNav: controls.filter((b) => b.getBoundingClientRect().bottom > navTop)
            .length,
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
      `${tag.padEnd(14)} slides ${state.slides} (unique ${state.uniqueIds}) · widest ${state.widest}px · overflow ${state.docOverflow}px · dots ${state.dots} · scrollable ${state.trackScrollable}`
    );

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
    // "Next" must move the rail the way the page reads.
    await page.evaluate((sel) => document.querySelector(sel).scrollTo({ left: 0 }), TRACK);
    await page.waitForTimeout(500);
    const before = await page.evaluate(
      (sel) => document.querySelector(sel).children[0].getBoundingClientRect().left,
      TRACK
    );
    await next.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(900);
    const after = await page.evaluate(
      (sel) => document.querySelector(sel).children[0].getBoundingClientRect().left,
      TRACK
    );
    const moved = after - before;
    note(`   next moved the first card ${moved.toFixed(0)}px (${state.docDir})`);
    if (state.docDir === 'ltr' && moved > -10)
      findings.push(`${tag}: next did not carry the rail leftwards on an LTR page`);
    if (state.docDir === 'rtl' && moved < 10)
      findings.push(`${tag}: next did not carry the rail rightwards on an RTL page`);

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
  await page.waitForTimeout(900);
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
