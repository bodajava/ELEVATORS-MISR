/**
 * Browser verification for the partners rails.
 *
 * The unit layer can prove the names are in the content file. It cannot see the thing this
 * section is actually built on: that the loop has no seam. The rail carries its list twice and
 * travels -50%, which only lands on the duplicate if one repeating unit is exactly half the
 * track — and a flex `gap` on the track breaks that by half a gap per cycle, which reads as a
 * visible jolt once a minute. That arithmetic is measured here, at every viewport, because it
 * depends on rendered widths and nothing else can check it.
 *
 * Also checked: both rails render, each name is announced once rather than twice, the rails do
 * not push the page into horizontal scroll (they are wider than the viewport by design), the
 * hover pause works, and reduced motion leaves the rail static instead of snapping it to its
 * end position.
 *
 *   node scripts/partners-check.mjs [baseUrl] [shotsDir]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const BASE = positional[0] ?? 'http://localhost:3000';
const SHOTS = positional[1] ?? '.partners-check';

const VIEWPORTS = [
  { w: 390, h: 844, tag: 'phone' },
  { w: 768, h: 1024, tag: 'tablet' },
  { w: 1440, h: 900, tag: 'desktop' },
];

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log(`  ✗ ${msg}`);
};
const pass = (msg) => console.log(`  ✓ ${msg}`);

await mkdir(SHOTS, { recursive: true });
const browser = await chromium.launch();

/**
 * Bring the rails into the viewport.
 *
 * `window.scrollTo` is useless here: Lenis runs in the full motion tier (fine pointer, no
 * stated motion preference) and drives scroll from the GSAP ticker, so a programmatic jump is
 * overwritten on the next frame — the section measures fine but sits 2000px below the fold,
 * which silently broke the hover check. Real wheel events are what Lenis listens for, so the
 * rail is walked into view a notch at a time and the loop stops when it is genuinely on screen.
 */
async function reachSection(page, height) {
  await page.waitForSelector('[data-rail]', { state: 'attached', timeout: 15000 });
  const railTop = () =>
    page.evaluate(() => {
      const rail = document.querySelector('[data-rail]');
      return rail ? rail.getBoundingClientRect().top : null;
    });

  for (let i = 0; i < 80; i++) {
    const top = await railTop();
    if (top === null) break;
    if (top > 80 && top < height - 120) break;
    await page.mouse.wheel(0, top > 0 ? 500 : -500);
    await page.waitForTimeout(90);
  }
  // ScrollTrigger reveals the section's contents on the way past; let the tween land.
  await page.waitForTimeout(700);
}

/** Everything measurable about the two rails, read from the rendered page. */
async function measure(page) {
  return page.evaluate(() => {
    const rails = [...document.querySelectorAll('[data-rail]')];
    return {
      railCount: rails.length,
      bodyOverflow: Math.round(
        document.documentElement.scrollWidth - document.documentElement.clientWidth
      ),
      dir: document.documentElement.dir || 'ltr',
      rails: rails.map((rail) => {
        const track = rail.querySelector('[data-rail-track]');
        const items = [...track.children];
        const half = items.length / 2;
        // The distance the animation must travel for the loop to be invisible, versus the
        // distance -50% actually travels.
        const unit = items[half].offsetLeft - items[0].offsetLeft;
        const halfTrack = track.scrollWidth / 2;
        const cs = getComputedStyle(track);
        const railRect = rail.getBoundingClientRect();
        return {
          names: half,
          // In RTL the first item is the rightmost, so the duplicate sits at a negative
          // offset. The magnitude is what makes the loop seamless; the sign says which
          // way the track has to travel, and that is asserted separately.
          seamError: Math.abs(Math.abs(unit) - halfTrack),
          shiftsLeft: unit > 0,
          unit: Math.round(unit),
          halfTrack: Math.round(halfTrack),
          animation: cs.animationName,
          duration: cs.animationDuration,
          reverse: track.dataset.reverse === 'true',
          ariaHiddenDuplicates: items.slice(half).every((li) => li.getAttribute('aria-hidden')),
          ariaHiddenOriginals: items.slice(0, half).some((li) => li.getAttribute('aria-hidden')),
          visible: railRect.width > 0 && railRect.height > 0,
          height: Math.round(railRect.height),
          width: Math.round(railRect.width),
          firstName: items[0]?.innerText.trim(),
        };
      }),
    };
  });
}

for (const locale of ['en', 'ar']) {
  for (const { w, h, tag } of VIEWPORTS) {
    console.log(`\n── ${locale} · ${tag} ${w}x${h} ──`);
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/${locale}`, { waitUntil: 'load' });
    await reachSection(page, h);

    const m = await measure(page);
    const label = `${locale}/${tag}`;

    if (m.railCount !== 2) fail(`${label}: expected 2 rails, found ${m.railCount}`);
    else pass(`${label}: 2 rails`);

    if (m.bodyOverflow > 1) fail(`${label}: page scrolls horizontally by ${m.bodyOverflow}px`);
    else pass(`${label}: no horizontal page scroll`);

    m.rails.forEach((r, i) => {
      const id = `${label}/rail${i + 1}`;
      if (!r.visible) fail(`${id}: rail has no rendered box`);
      // Sub-pixel rounding is expected; half a gap (16px+) is the bug this guards against.
      if (r.seamError > 1)
        fail(
          `${id}: loop seam off by ${r.seamError.toFixed(2)}px ` +
            `(one unit ${r.unit}px vs half-track ${r.halfTrack}px) — the rail will jump each cycle`
        );
      else pass(`${id}: seamless (unit ${r.unit}px = half-track ${r.halfTrack}px)`);

      // Travelling the wrong way empties the rail out and snaps it back once a cycle.
      const wantRtl = m.dir === 'rtl';
      const wantName = wantRtl ? 'rail-drift-rtl' : 'rail-drift';
      if (r.animation !== wantName)
        fail(`${id}: animation is "${r.animation}", expected ${wantName} for dir=${m.dir}`);
      else pass(`${id}: ${wantName} for dir=${m.dir}`);
      if (r.shiftsLeft === wantRtl)
        fail(
          `${id}: track is laid out ${r.shiftsLeft ? 'left' : 'right'}ward but dir=${m.dir} ` +
            `— it will animate away from the duplicate`
        );
      if (!r.ariaHiddenDuplicates) fail(`${id}: duplicate half is not aria-hidden`);
      if (r.ariaHiddenOriginals) fail(`${id}: an original item is aria-hidden`);
      if (r.names < 2) fail(`${id}: only ${r.names} name(s)`);
    });

    if (m.rails[0] && m.rails[1] && m.rails[0].reverse === m.rails[1].reverse)
      fail(`${label}: both rails run the same direction`);

    const section = page.locator('[data-rail]').first().locator('xpath=ancestor::section[1]');
    await section.screenshot({ path: path.join(SHOTS, `${locale}-${tag}.png`) }).catch(() => {});
    await ctx.close();
  }
}

/* ── Reduced motion: static, not snapped ─────────────────────────────────── */
console.log('\n── reduced motion ──');
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: 'load' });
  await reachSection(page, 900);
  const state = await page.evaluate(() => {
    const track = document.querySelector('[data-rail-track]');
    const cs = getComputedStyle(track);
    return { name: cs.animationName, transform: cs.transform };
  });
  if (state.name !== 'none')
    fail(`reduced motion: animation "${state.name}" still applied — the rail should not move`);
  else pass('reduced motion: no animation applied');
  if (state.transform !== 'none' && state.transform !== 'matrix(1, 0, 0, 1, 0, 0)')
    fail(`reduced motion: track is displaced (${state.transform}) — names start off-screen`);
  else pass('reduced motion: track sits at its natural position');
  await page.screenshot({ path: path.join(SHOTS, 'reduced-motion.png') });
  await ctx.close();
}

/* ── Hover pauses the rail ───────────────────────────────────────────────── */
console.log('\n── hover ──');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: 'load' });
  await reachSection(page, 900);
  const rail = page.locator('[data-rail]').first();
  await rail.hover().catch(() => {});
  await page.waitForTimeout(400);
  const playState = await page.evaluate(
    () => getComputedStyle(document.querySelector('[data-rail-track]')).animationPlayState
  );
  if (playState !== 'paused') fail(`hover: play state is "${playState}", expected paused`);
  else pass('hover: rail pauses so a name can be read');
  await ctx.close();
}

await browser.close();

console.log(`\nscreenshots: ${SHOTS}/`);
if (failures.length) {
  console.log(`\nFAIL — ${failures.length} issue(s)`);
  process.exit(1);
}
console.log('\nPASS');
