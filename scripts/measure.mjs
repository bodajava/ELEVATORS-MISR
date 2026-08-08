/**
 * Defect measurement harness.
 *
 * Reproduces and quantifies the reported visual defects instead of eyeballing them:
 * upscaled media, dead vertical space, overlapping pinned copy, native video controls,
 * and pin-spacer accounting.
 *
 *   node scripts/measure.mjs [--url=...] [--route=/] [--locale=en] [--width=1440]
 */
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a) => {
    const m = a.match(/^--([^=]+)=?(.*)$/);
    return m ? [[m[1], m[2] || true]] : [];
  })
);

const BASE = args.url ?? 'http://localhost:3000';
const LOCALE = args.locale ?? 'en';
const ROUTE = args.route ?? '/';
const WIDTH = Number(args.width ?? 1440);
const HEIGHT = Number(args.height ?? 900);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.goto(`${BASE}/${LOCALE}${ROUTE === '/' ? '' : ROUTE}`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts?.ready);
// Scroll through so lazy media loads and every ScrollTrigger initialises.
await page.evaluate(async () => {
  const step = Math.round(window.innerHeight * 0.7);
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 80));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 400));
});
await page.waitForTimeout(600);

const report = await page.evaluate(() => {
  const out = {};

  /* ---- 1. upscaled media ------------------------------------------------ */
  out.upscaledImages = [...document.images]
    .map((img) => {
      const r = img.getBoundingClientRect();
      if (r.width < 4) return null;
      const dpr = window.devicePixelRatio || 1;
      // What the layout actually demands in device pixels vs what the file has.
      const demandW = Math.round(r.width * dpr);
      const ratio = img.naturalWidth ? demandW / img.naturalWidth : 0;
      return {
        src: (img.currentSrc || img.src).split('/').pop().slice(0, 60),
        intrinsic: `${img.naturalWidth}x${img.naturalHeight}`,
        rendered: `${Math.round(r.width)}x${Math.round(r.height)}`,
        demandPx: demandW,
        upscale: Number(ratio.toFixed(2)),
      };
    })
    .filter((x) => x && x.upscale > 1.05)
    .sort((a, b) => b.upscale - a.upscale);

  /* ---- 2. video elements ------------------------------------------------ */
  out.videos = [...document.querySelectorAll('video')].map((v) => {
    const r = v.getBoundingClientRect();
    return {
      rendered: `${Math.round(r.width)}x${Math.round(r.height)}`,
      intrinsic: `${v.videoWidth}x${v.videoHeight}`,
      hasNativeControls: v.controls,
      autoplay: v.autoplay,
      muted: v.muted,
      preload: v.preload,
      paused: v.paused,
      hasSource: Boolean(v.currentSrc || v.querySelector('source')),
      upscale: v.videoWidth ? Number((r.width / v.videoWidth).toFixed(2)) : null,
    };
  });

  /* ---- 3. dead vertical space ------------------------------------------- */
  // Walk top-level sections and measure the vertical gap between the last visible
  // content box inside one and the first inside the next.
  const sections = [...document.querySelectorAll('main > section, main > div > section')];
  const hasText = (el) => (el.textContent || '').trim().length > 0;
  out.sections = sections.map((s, i) => {
    const r = s.getBoundingClientRect();
    const top = r.top + window.scrollY;
    // Find the visual extent of real content inside the section.
    let contentTop = Infinity;
    let contentBottom = -Infinity;
    for (const el of s.querySelectorAll('h1,h2,h3,h4,p,li,img,video,a,button,dt,dd')) {
      const b = el.getBoundingClientRect();
      if (b.height < 2 || b.width < 2) continue;
      if (!hasText(el) && !['IMG', 'VIDEO'].includes(el.tagName)) continue;
      contentTop = Math.min(contentTop, b.top + window.scrollY);
      contentBottom = Math.max(contentBottom, b.bottom + window.scrollY);
    }

    // A pinned section's trailing space is not dead — it is the scroll distance the
    // animation is played across, and the pinned stage is drawn over it the whole way.
    // Without this the harness reports every scroll sequence as a defect, which is the
    // opposite of useful.
    const spacer = s.querySelector('.pin-spacer');
    const pinnedScroll = spacer
      ? Math.round(
          spacer.getBoundingClientRect().height -
            (spacer.firstElementChild?.getBoundingClientRect().height ?? 0)
        )
      : 0;

    const padBottom =
      contentBottom === -Infinity ? null : Math.round(top + r.height - contentBottom);

    return {
      index: i + 1,
      label: (s.getAttribute('aria-label') || s.querySelector('h1,h2')?.textContent || '')
        .trim()
        .slice(0, 40),
      height: Math.round(r.height),
      padTop: contentTop === Infinity ? null : Math.round(contentTop - top),
      padBottom,
      pinned: Boolean(spacer),
      pinnedScroll,
      // What is left over once the pin's own scroll distance is accounted for.
      unexplainedBottom: padBottom === null ? null : Math.max(0, padBottom - pinnedScroll),
      minHeightVh: getComputedStyle(s).minHeight,
    };
  });

  /* ---- 4. pin spacers --------------------------------------------------- */
  out.pinSpacers = [...document.querySelectorAll('.pin-spacer')].map((el) => ({
    height: Math.round(el.getBoundingClientRect().height),
    childHeight: Math.round(el.firstElementChild?.getBoundingClientRect().height ?? 0),
  }));

  /* ---- 5. overlapping pinned copy --------------------------------------- */
  // Any two floor captions whose boxes intersect AND both have non-zero opacity.
  const floors = [...document.querySelectorAll('[data-floor]')];
  const visible = floors
    .map((f, i) => {
      const cs = getComputedStyle(f);
      const heading = f.querySelector('h3');
      return {
        i: i + 1,
        opacity: Number(cs.opacity),
        visibility: cs.visibility,
        text: heading?.textContent?.trim().slice(0, 30) ?? '',
        rect: heading?.getBoundingClientRect() ?? null,
      };
    })
    .filter((f) => f.opacity > 0.02 && f.visibility !== 'hidden' && f.rect && f.rect.height > 0);

  const overlaps = [];
  for (let a = 0; a < visible.length; a++) {
    for (let b = a + 1; b < visible.length; b++) {
      const ra = visible[a].rect;
      const rb = visible[b].rect;
      const inter =
        Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)) *
        Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
      if (inter > 100) {
        overlaps.push({
          a: `${visible[a].i}:${visible[a].text} (α${visible[a].opacity})`,
          b: `${visible[b].i}:${visible[b].text} (α${visible[b].opacity})`,
          overlapPx: Math.round(inter),
        });
      }
    }
  }
  out.simultaneouslyVisibleFloors = visible.length;
  out.floorOverlaps = overlaps;

  /* ---- 6. orange presence ----------------------------------------------- */
  const orange = /(#ff6b00|#ff7200|rgb\(255,\s*(10[7-9]|11[0-4]),\s*0\))/i;
  let orangeCount = 0;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (orange.test(cs.color) || orange.test(cs.backgroundColor) || orange.test(cs.borderColor)) {
      orangeCount++;
    }
  }
  out.orangeElements = orangeCount;

  /* ---- 7. page totals --------------------------------------------------- */
  out.pageHeight = document.documentElement.scrollHeight;
  out.viewportsTall = Number(
    (document.documentElement.scrollHeight / window.innerHeight).toFixed(1)
  );
  out.markersPresent = document.querySelectorAll('.gsap-marker-start, .gsap-marker-end').length;

  return out;
});

/* ---------------------------------------------------------------------------
   Playback behaviour

   The static report above can only say whether a video is paused at the moment it is read,
   which for a viewport-aware player is meaningless — every video is correctly paused when it
   is off screen. This walks each one into view, waits, and records whether it actually
   started; then scrolls away and checks it stopped. That is the pair of claims the brief
   makes, so it is the pair that gets tested.
   --------------------------------------------------------------------------- */
const playback = [];
const videoCount = await page.locator('video').count();
for (let i = 0; i < videoCount; i++) {
  const v = page.locator('video').nth(i);

  // The hero film is revealed by the hero's own scroll timeline, not by scrolling the
  // element into view — it sits inside a pinned stage, so its geometry barely changes while
  // the sequence runs. `scrollIntoViewIfNeeded` therefore lands before the film is ever
  // shown and reports a false negative. Drive it to the timeline's settle point instead.
  const isHeroFilm = await v.evaluate((el) => Boolean(el.closest('[data-hero-film]')));
  if (isHeroFilm) {
    await page.evaluate(() => {
      const stage = document.querySelector('[data-hero-stage]');
      const spacer = stage?.closest('.pin-spacer');
      // 85% through the pin: the film has landed and is being held.
      const end = spacer ? spacer.getBoundingClientRect().height - window.innerHeight : 0;
      window.scrollTo(0, Math.max(0, end * 0.85));
    });
  } else {
    await v.scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(1400);
  const whileVisible = await v.evaluate((el) => ({
    paused: el.paused,
    muted: el.muted,
    controls: el.controls,
    currentTime: Number(el.currentTime.toFixed(2)),
    readyState: el.readyState,
  }));

  // Push it well out of view and give the observer time to fire.
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2.5));
  await page.waitForTimeout(900);
  const whileAway = await v.evaluate((el) => ({ paused: el.paused }));

  playback.push({ i: i + 1, isHeroFilm, whileVisible, whileAway });
}

await browser.close();

/* ---------------------------------- print --------------------------------- */
const L = (s) => console.log(s);
L(`\n══ ${LOCALE}${ROUTE} @ ${WIDTH}px ══`);
L(
  `page: ${report.pageHeight}px (${report.viewportsTall} viewports)  ·  orange elements: ${report.orangeElements}  ·  ST markers: ${report.markersPresent}`
);

L(`\n── UPSCALED MEDIA (rendered above intrinsic) ──`);
if (report.upscaledImages.length === 0) L('  none');
for (const i of report.upscaledImages.slice(0, 12)) {
  L(
    `  ${String(i.upscale).padStart(5)}x  intrinsic ${i.intrinsic.padEnd(11)} → rendered ${i.rendered.padEnd(11)} (needs ${i.demandPx}px)  ${i.src}`
  );
}

L(`\n── VIDEOS ──`);
if (report.videos.length === 0) L('  none');
for (const v of report.videos) {
  L(
    `  rendered ${v.rendered.padEnd(11)} intrinsic ${v.intrinsic.padEnd(11)} upscale ${String(v.upscale).padStart(5)}x  controls:${v.hasNativeControls} autoplay:${v.autoplay} muted:${v.muted} preload:${v.preload} paused:${v.paused} src:${v.hasSource}`
  );
}

L(`\n── PINNED SECTION ──`);
L(`  simultaneously visible floor captions: ${report.simultaneouslyVisibleFloors}`);
if (report.floorOverlaps.length) {
  L(`  OVERLAPS (${report.floorOverlaps.length}):`);
  for (const o of report.floorOverlaps.slice(0, 8)) L(`    ${o.a}  ✕  ${o.b}   ${o.overlapPx}px²`);
} else {
  L('  no overlaps');
}

L(`\n── PIN SPACERS ──`);
if (report.pinSpacers.length === 0) L('  none');
for (const p of report.pinSpacers) {
  L(
    `  spacer ${p.height}px, pinned child ${p.childHeight}px → ${p.height - p.childHeight}px of scroll distance`
  );
}

L(`\n── SECTION SPACING ──`);
L(`   padTop/padBottom = empty space above/below real content.`);
L(`   For a pinned section, "pin" is scroll distance the animation plays across — not dead`);
L(`   space. "unexp" is what is left once that is subtracted, and is the number that matters.`);
for (const s of report.sections) {
  const flag = (s.padTop ?? 0) > 180 || (s.unexplainedBottom ?? 0) > 180 ? '  ⚠ DEAD SPACE' : '';
  const pin = s.pinned ? `pin=${String(s.pinnedScroll).padStart(5)}` : '           ';
  L(
    `  ${String(s.index).padStart(2)}  h=${String(s.height).padStart(5)}  padTop=${String(s.padTop).padStart(4)}  padBottom=${String(s.padBottom).padStart(5)}  ${pin}  unexp=${String(s.unexplainedBottom).padStart(4)}  ${s.label}${flag}`
  );
}

L(`\n── PLAYBACK (scrolled into view, then away) ──`);
for (const p of playback) {
  const playing = !p.whileVisible.paused && p.whileVisible.currentTime > 0;
  const stopped = p.whileAway.paused;
  // The hero film is held on screen for the tail of its pin, so it is *expected* to still be
  // playing after a scroll that has not yet left the pinned range. Only the ambient films
  // are asserted to stop.
  const awayLabel = p.isHeroFilm
    ? stopped
      ? 'paused'
      : 'still playing (expected — pinned hero is still on screen)'
    : stopped
      ? 'paused ✓'
      : 'STILL PLAYING ✗';
  L(
    `  video ${p.i}${p.isHeroFilm ? ' (hero film)' : ''}: visible→ ${playing ? 'PLAYING ✓' : 'not playing ✗'} (t=${p.whileVisible.currentTime}s, muted=${p.whileVisible.muted}, controls=${p.whileVisible.controls}, ready=${p.whileVisible.readyState})  ·  away→ ${awayLabel}`
  );
}

if (consoleErrors.length) {
  L(`\n── CONSOLE ERRORS (${consoleErrors.length}) ──`);
  for (const e of consoleErrors.slice(0, 5)) L(`  ${e.slice(0, 140)}`);
}
L('');
