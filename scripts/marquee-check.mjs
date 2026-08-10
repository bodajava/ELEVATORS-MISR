/**
 * Verification for the film strip on the homepage.
 *
 * The things that actually go wrong with a marquee, in order of how often they ship:
 *
 *   1. The seam. Travelling one group's width is only seamless if the measured distance
 *      includes the gap *between* the copies. One gap out and the strip stutters once per
 *      loop — small, regular, and impossible to un-see.
 *   2. It never actually loops. The animation runs once and leaves a blank band.
 *   3. It cannot be stopped, which fails WCAG 2.2.2 for content that moves for over 5s.
 *   4. Every tile decodes at once, because playback was never gated to the viewport.
 *   5. It scrolls the wrong way in RTL, away from its own content.
 *   6. The bleed past the gutter turns into real page overflow.
 *
 *   node scripts/marquee-check.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const browser = await chromium.launch();
const findings = [];
const note = (m) => console.log('  ' + m);

const track = '[data-marquee-track]';
const viewport = '[data-marquee-viewport]';

/**
 * Scroll and hover by coordinate, not by locator action.
 *
 * Playwright's actionability check waits for an element to stop moving, and a marquee never
 * does — `scrollIntoViewIfNeeded()` and `hover()` both time out against it by design. This is
 * a harness constraint, not a defect in the strip.
 */
const bring = async (page) => {
  // Step the page down rather than jumping. The strip sits inside a `Reveal`, which holds it
  // at `autoAlpha: 0` until ScrollTrigger fires, and ScrollTrigger only fires on real scroll
  // events — an instant `scrollIntoView` leaves the whole section invisible.
  //
  // And converge rather than computing the target once: sections above the strip reveal and
  // media loads as the page scrolls, so the document grows underneath and a position measured
  // at the top is stale by the time it is reached. The first version of this harness landed
  // 2335px past the strip and reported "0 videos on screen".
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const target = document.querySelector('[data-film-marquee]');
      if (!target) return;
      const box = target.getBoundingClientRect();
      const centred = box.top + box.height / 2 - window.innerHeight / 2;
      if (Math.abs(centred) < 40) return;
      const from = window.scrollY;
      const to = Math.max(0, from + centred);
      const step = Math.sign(to - from) * 400;
      for (let at = from; Math.abs(to - at) > 400; at += step) {
        window.scrollTo(0, at);
        await sleep(30);
      }
      window.scrollTo(0, to);
      await sleep(250);
    }
  });
};

const hoverTrack = async (page) => {
  const box = await page.evaluate((sel) => {
    // The clip, not the track: the track is one long flex row several thousand pixels wide,
    // and the centre of *its* box lands well outside the window.
    const r = document.querySelector(sel).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, viewport);
  await page.mouse.move(box.x, box.y);
};

for (const locale of ['en', 'ar']) {
  console.log(`\n══ ${locale.toUpperCase()} / ══`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 140)));
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));

  await page.goto(`${BASE}/${locale}`, { waitUntil: 'load' });
  await bring(page);
  await page.waitForTimeout(2500);

  // ── Structure and measurement ────────────────────────────────────────────
  const geom = await page.locator(track).evaluate((el) => {
    const groups = [...el.querySelectorAll(':scope > ul')];
    const cs = getComputedStyle(el);
    const gap = Number.parseFloat(cs.columnGap) || 0;
    return {
      groups: groups.length,
      tiles: groups[0]?.children.length ?? 0,
      echoHidden: groups[1]?.getAttribute('aria-hidden') === 'true',
      gap,
      groupWidth: groups[0]?.scrollWidth ?? 0,
      distance: Number.parseFloat(cs.getPropertyValue('--marquee-distance')) || 0,
      duration: cs.getPropertyValue('--marquee-duration').trim(),
      animation: cs.animationName,
      dirVar: cs.getPropertyValue('--marquee-dir').trim(),
      docDir: getComputedStyle(document.documentElement).direction,
      viewport: window.innerWidth,
    };
  });
  note(`groups ${geom.groups} × ${geom.tiles} tiles, echo aria-hidden: ${geom.echoHidden}`);
  note(
    `group ${geom.groupWidth}px + gap ${geom.gap}px → distance ${geom.distance}px, ${geom.duration}`
  );
  note(`animation "${geom.animation}", dir var ${geom.dirVar} (document ${geom.docDir})`);

  // Not a fixed count: the travel is one copy's width, so at the far end of the loop the
  // remaining copies must still span the screen. Nine films needed two copies; four need
  // three. What matters is the coverage, not the number.
  const spanned = geom.groupWidth * (geom.groups - 1);
  note(`copies span ${spanned}px behind the travel (viewport ${geom.viewport}px)`);
  if (geom.groups < 2) findings.push(`${locale}: ${geom.groups} copies — a loop needs at least 2`);
  else if (spanned < geom.viewport)
    findings.push(
      `${locale}: ${geom.groups} copies span only ${spanned}px against a ${geom.viewport}px viewport — the band will drain at the end of the loop`
    );
  if (!geom.echoHidden)
    findings.push(
      `${locale}: the duplicate copy is not aria-hidden — every film is announced twice`
    );
  if (geom.animation === 'none') findings.push(`${locale}: no animation is running on the track`);

  // The seam test, done as arithmetic rather than by eye.
  const expected = geom.groupWidth + geom.gap;
  const drift = Math.abs(geom.distance - expected);
  note(`seam drift: ${drift.toFixed(2)}px (travel ${geom.distance} vs one group+gap ${expected})`);
  if (drift > 1)
    findings.push(
      `${locale}: travel is ${drift.toFixed(1)}px off one group+gap — the strip stutters once per loop`
    );

  // Direction: RTL must travel the other way, or the band scrolls away from its content.
  const wantDir = geom.docDir === 'rtl' ? '1' : '-1';
  if (geom.dirVar !== wantDir)
    findings.push(`${locale}: travel direction ${geom.dirVar} is wrong for a ${geom.docDir} page`);

  // ── It actually moves, and in the right direction ────────────────────────
  const sample = async () =>
    page.locator(track).evaluate((el) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return m.m41;
    });
  const t0 = await sample();
  await page.waitForTimeout(1500);
  const t1 = await sample();
  const moved = t1 - t0;
  note(`translateX ${t0.toFixed(1)} → ${t1.toFixed(1)} over 1.5s (${moved.toFixed(1)}px)`);
  if (Math.abs(moved) < 20)
    findings.push(
      `${locale}: the strip moved ${moved.toFixed(1)}px in 1.5s — it is not travelling`
    );
  if (geom.docDir === 'rtl' && moved < 0)
    findings.push(`${locale}: RTL strip is travelling left, away from its content`);
  if (geom.docDir === 'ltr' && moved > 0)
    findings.push(`${locale}: LTR strip is travelling right, away from its content`);

  // ── The band must never drain ────────────────────────────────────────────
  // The failure this catches: with the animation on the overflow-hidden element itself, the
  // clipping window travels with the content, so the trailing edge empties out and a hole
  // grows until the loop restarts. Sample the covered width over a full second of travel.
  const coverage = await page.evaluate(
    async ([vpSel, trSel]) => {
      const vp = document.querySelector(vpSel);
      const tr = document.querySelector(trSel);
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      let worstGap = 0;
      let vpDrift = 0;
      const vpStart = vp.getBoundingClientRect().left;
      for (let i = 0; i < 10; i += 1) {
        const box = vp.getBoundingClientRect();
        vpDrift = Math.max(vpDrift, Math.abs(box.left - vpStart));
        // Largest uncovered run inside the clip, sampled across its width.
        let run = 0;
        let worst = 0;
        for (let x = box.left + 1; x < box.right - 1; x += 8) {
          const y = box.top + box.height / 2;
          const hit = document.elementsFromPoint(x, y).some((el) => el.closest(trSel + ' li'));
          run = hit ? 0 : run + 8;
          worst = Math.max(worst, run);
        }
        worstGap = Math.max(worstGap, worst);
        await sleep(100);
      }
      return { worstGap, vpDrift, trackAnimated: getComputedStyle(tr).animationName !== 'none' };
    },
    [viewport, track]
  );
  note(
    `largest uncovered run over 1s: ${coverage.worstGap}px; clip drift ${coverage.vpDrift.toFixed(1)}px`
  );
  if (coverage.worstGap > 24)
    findings.push(
      `${locale}: the band drains — a ${coverage.worstGap}px hole opened inside the clip while travelling`
    );
  if (coverage.vpDrift > 1)
    findings.push(
      `${locale}: the clip itself is moving (${coverage.vpDrift.toFixed(1)}px) — the animation is on the wrong element`
    );

  // ── Uniform frame height, honest widths ──────────────────────────────────
  const sizes = await page.locator(track).evaluate((el) => {
    const tiles = [...el.querySelectorAll(':scope > ul:first-child > li')];
    const heights = tiles.map((t) => Math.round(t.getBoundingClientRect().height));
    return {
      heights: [...new Set(heights)],
      ratios: tiles.map((t) => {
        const r = t.getBoundingClientRect();
        const v = t.querySelector('video');
        const natural = v ? Number(v.dataset.ratio ?? 0) : 0;
        return { drawn: +(r.width / r.height).toFixed(3), natural };
      }),
    };
  });
  note(`frame heights: ${sizes.heights.join(', ')}px`);
  if (sizes.heights.length !== 1)
    findings.push(
      `${locale}: tiles render at ${sizes.heights.length} different heights — the strip is not a film strip`
    );

  // ── Playback is gated ────────────────────────────────────────────────────
  const playback = await page.evaluate(() => {
    const vids = [...document.querySelectorAll('[data-film-marquee] video')];
    const onScreen = vids.filter((v) => {
      const r = v.getBoundingClientRect();
      return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
    });
    return {
      total: vids.length,
      onScreen: onScreen.length,
      playing: vids.filter((v) => !v.paused).length,
      withSource: vids.filter((v) => v.currentSrc).length,
    };
  });
  note(
    `videos ${playback.total} total, ${playback.onScreen} on screen, ${playback.playing} playing, ${playback.withSource} sourced`
  );
  if (playback.playing > playback.onScreen + 1)
    findings.push(
      `${locale}: ${playback.playing} videos decoding but only ${playback.onScreen} on screen — playback is not gated`
    );
  if (playback.playing === 0)
    findings.push(`${locale}: nothing is playing — the films are meant to run inside the strip`);

  // ── WCAG 2.2.2: it must be stoppable ─────────────────────────────────────
  // By attribute, not by tag: the tiles are buttons too now, and so are the
  // viewer's controls.
  const toggle = page.locator('[data-marquee-toggle]');
  const hasToggle = (await toggle.count()) === 1;
  note(`pause control present: ${hasToggle}`);
  if (!hasToggle)
    findings.push(`${locale}: no pause control — content moving for over 5s fails WCAG 2.2.2`);
  else {
    await toggle.click();
    await page.waitForTimeout(700);
    const a = await sample();
    await page.waitForTimeout(900);
    const b = await sample();
    const stopped = Math.abs(b - a) < 1;
    const stillPlaying = await page.evaluate(
      () =>
        [...document.querySelectorAll('[data-film-marquee] video')].filter((v) => !v.paused).length
    );
    note(`after pause: moved ${(b - a).toFixed(2)}px, ${stillPlaying} videos still playing`);
    if (!stopped) findings.push(`${locale}: the pause control did not stop the travel`);
    if (stillPlaying > 0)
      findings.push(`${locale}: ${stillPlaying} videos kept playing after pause`);
    await toggle.click();
    await page.waitForTimeout(900);
    const c = await sample();
    await page.waitForTimeout(900);
    if (Math.abs((await sample()) - c) < 1) findings.push(`${locale}: the strip did not resume`);
  }

  // ── Hover pauses, so a caption can be read ───────────────────────────────
  await hoverTrack(page);
  await page.waitForTimeout(600);
  const h0 = await sample();
  await page.waitForTimeout(900);
  const hoverMoved = Math.abs((await sample()) - h0);
  note(`hover: moved ${hoverMoved.toFixed(2)}px`);
  if (hoverMoved > 1) findings.push(`${locale}: hovering does not pause the strip`);
  await page.mouse.move(0, 0);

  // ── Tiles are controls, and only the announced copy is reachable ─────────
  const controls = await page.evaluate(
    ([vpSel]) => {
      const vp = document.querySelector(vpSel);
      const groups = [...vp.querySelectorAll(':scope > div > ul')];
      const focusable = groups.map((g) => ({
        hidden: g.getAttribute('aria-hidden') === 'true',
        inert: g.hasAttribute('inert'),
        buttons: g.querySelectorAll('button').length,
      }));
      return {
        groups: focusable,
        // A focusable control inside aria-hidden is the defect: tab order walks into
        // something a screen reader has been told is not there.
        reachableHidden: focusable.filter((g) => g.hidden && !g.inert && g.buttons > 0).length,
        leadButtons: focusable[0]?.buttons ?? 0,
      };
    },
    [viewport]
  );
  note(
    `tile buttons: ${controls.leadButtons} in the announced copy; ${controls.groups.length} copies, hidden ones inert: ${controls.groups.filter((g) => g.hidden && g.inert).length}`
  );
  if (controls.leadButtons === 0) findings.push(`${locale}: tiles are not focusable controls`);
  if (controls.reachableHidden > 0)
    findings.push(
      `${locale}: ${controls.reachableHidden} aria-hidden copy/copies still hold focusable buttons`
    );

  // ── The expanded film ────────────────────────────────────────────────────
  await page.evaluate((sel) => document.querySelector(sel + ' li button')?.click(), viewport);
  await page.waitForTimeout(900);
  const opened = await page.evaluate(() => {
    // `dialog[open]`, not `dialog`. The homepage now carries two film viewers — the marketing
    // carousel's and this strip's — and both render a closed `<dialog>` until they are used.
    // Taking the first one in the document read the carousel's, which is never open, and
    // reported that clicking a tile here did nothing.
    const dialog = document.querySelector('dialog[open]');
    return {
      open: dialog?.open ?? false,
      modal: dialog?.matches(':modal') ?? false,
      videos: dialog ? dialog.querySelectorAll('video').length : 0,
      stripPlaying: [...document.querySelectorAll('[data-marquee-track] video')].filter(
        (v) => !v.paused
      ).length,
      counter: dialog?.querySelector('p')?.textContent?.trim() ?? null,
    };
  });
  note(
    `expanded: open=${opened.open} modal=${opened.modal} videos=${opened.videos} counter="${opened.counter}" strip still playing=${opened.stripPlaying}`
  );
  if (!opened.open) findings.push(`${locale}: clicking a tile did not open the expanded film`);
  if (!opened.modal)
    findings.push(`${locale}: the viewer is not a modal dialog — focus can leave it`);
  if (opened.videos !== 1)
    findings.push(`${locale}: the viewer mounted ${opened.videos} videos, expected 1`);
  if (opened.stripPlaying > 0)
    findings.push(
      `${locale}: ${opened.stripPlaying} strip clips kept decoding behind the open viewer`
    );

  const stoppedBehind = await sample();
  await page.waitForTimeout(900);
  if (Math.abs((await sample()) - stoppedBehind) > 1)
    findings.push(`${locale}: the strip keeps travelling behind the open viewer`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const closed = await page.evaluate(() => document.querySelector('dialog[open]') !== null);
  note(`Escape closes: ${!closed}`);
  if (closed) findings.push(`${locale}: Escape did not close the viewer`);

  // ── The gutter bleed must not become page overflow ───────────────────────
  for (const width of [2560, 1440, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(600);
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    note(`${width}px: document overflow ${over}px`);
    if (over > 0) findings.push(`${locale}: ${over}px horizontal overflow at ${width}px`);
  }

  if (errors.length) {
    note(`console errors: ${errors.length} — ${errors[0]}`);
    findings.push(`${locale}: ${errors.length} console error(s): ${errors[0]}`);
  }

  await ctx.close();
}

// ── Reduced motion: no travel, still reachable ─────────────────────────────
console.log('\n══ reduced motion ══');
const rm = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
});
const rp = await rm.newPage();
await rp.goto(`${BASE}/en`, { waitUntil: 'load' });
await bring(rp);
await rp.waitForTimeout(1500);
const reduced = await rp.locator(viewport).evaluate((el) => {
  const cs = getComputedStyle(el);
  return {
    animation: getComputedStyle(el.querySelector('[data-marquee-track]')).animationName,
    overflowX: cs.overflowX,
    scrollable: el.scrollWidth > el.clientWidth,
    playing: [...el.querySelectorAll('video')].filter((v) => !v.paused).length,
  };
});
note(
  `animation "${reduced.animation}", overflow-x ${reduced.overflowX}, scrollable ${reduced.scrollable}, playing ${reduced.playing}`
);
if (reduced.animation !== 'none') findings.push('reduced motion: the strip still travels');
if (!reduced.scrollable || reduced.overflowX === 'hidden')
  findings.push(
    'reduced motion: the strip does not travel and cannot be scrolled — the films are unreachable'
  );
if (reduced.playing > 0) findings.push(`reduced motion: ${reduced.playing} videos are playing`);
await rm.close();

await browser.close();

console.log(`\n${'═'.repeat(62)}`);
if (findings.length === 0) console.log('PASS — no findings');
else {
  console.log(`${findings.length} FINDING(S):`);
  for (const f of findings) console.log('  ✗ ' + f);
}
process.exit(findings.length === 0 ? 0 : 1);
