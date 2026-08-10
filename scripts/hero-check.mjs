/**
 * Hero checkpoint capture and verification.
 *
 * Drives the pinned hero sequence to five points — 0%, 20%, 45%, 70% and 100% of its scrubbed
 * budget — at each required viewport, and asserts the authoritative behaviour rather than just
 * photographing it.
 *
 * ── What changed, and why this file changed with it ─────────────────────────
 * An earlier revision opened with the typography hidden and slid it up on load. That is now
 * explicitly wrong: the full hero composition must be legible at paint, with no reveal to wait
 * through and no empty cream screen. So the checks below assert *presence at 0%* — the
 * opposite of what this harness used to protect — plus the layering and the scroll
 * choreography.
 *
 *   node scripts/hero-check.mjs http://localhost:3000
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = path.resolve(import.meta.dirname, '..', '.hero-check');

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '390x844', width: 390, height: 844 },
];

/** Fractions of the pinned budget to sample. 0 is the opening composition. */
const STAGES = [
  { name: 'initial', at: 0 },
  { name: 'p20', at: 0.2 },
  { name: 'mid-scroll', at: 0.45 },
  { name: 'p70', at: 0.7 },
  { name: 'final', at: 0.98 },
];

const results = [];
const checks = [];

const check = (label, pass, detail = '') => checks.push({ label, pass: Boolean(pass), detail });

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const vp of VIEWPORTS) {
  const tag = vp.name;
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    hasTouch: vp.width < 1024,
    isMobile: vp.width < 768,
  });
  const page = await ctx.newPage();
  const console_ = [];
  page.on('console', (m) => console_.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => console_.push(`[pageerror] ${String(e)}`));

  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.evaluate(() => document.fonts?.ready);
  // Deliberately short: the opening composition must already be correct, so a long settle
  // here would hide exactly the defect this checks for.
  await page.waitForTimeout(700);

  /* ── the opening composition, before any scrolling ────────────────────── */

  const opening = await page.evaluate(() => {
    const vis = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        present: true,
        opacity: Number(cs.opacity),
        visibility: cs.visibility,
        inViewport: r.top < window.innerHeight && r.bottom > 0 && r.width > 0 && r.height > 0,
        rect: {
          top: Math.round(r.top),
          left: Math.round(r.left),
          w: Math.round(r.width),
          h: Math.round(r.height),
        },
      };
    };
    const film = document.querySelector('[data-hero-film]');
    const m = film ? new DOMMatrixReadOnly(getComputedStyle(film).transform) : null;
    return {
      wordTop: vis('[data-hero-word-1]'),
      wordBottom: vis('[data-hero-word-2]'),
      eyebrow: vis('[data-hero-eyebrow]'),
      copy: vis('[data-hero-copy]'),
      cta: vis('[data-hero-copy] a'),
      film: vis('[data-hero-film]'),
      rotation: m ? Number((Math.atan2(m.b, m.a) * (180 / Math.PI)).toFixed(2)) : null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      z: {
        top: getComputedStyle(document.querySelector('[data-hero-word-1]').parentElement).zIndex,
        film: getComputedStyle(film).zIndex,
        bottom: getComputedStyle(document.querySelector('[data-hero-word-2]').parentElement).zIndex,
      },
    };
  });

  const legible = (v) =>
    v && v.present && v.inViewport && v.opacity > 0.85 && v.visibility === 'visible';

  check(
    `[${tag}] top word is legible at paint`,
    legible(opening.wordTop),
    JSON.stringify(opening.wordTop?.opacity)
  );
  check(
    `[${tag}] bottom word is legible at paint`,
    legible(opening.wordBottom),
    JSON.stringify(opening.wordBottom?.opacity)
  );
  check(`[${tag}] supporting label is visible at paint`, legible(opening.eyebrow));
  check(`[${tag}] headline + CTA block is visible at paint`, legible(opening.copy));
  check(`[${tag}] a call to action is visible at paint`, legible(opening.cta));
  check(`[${tag}] the film is visible at paint (no zoom-from-invisible)`, legible(opening.film));
  check(
    `[${tag}] the film opens at a tasteful angle (-4deg..-7deg)`,
    opening.rotation !== null && opening.rotation <= -3.5 && opening.rotation >= -7.5,
    `${opening.rotation}deg`
  );
  check(
    `[${tag}] the film is not a thumbnail at paint (>=28% of viewport width)`,
    opening.film && opening.film.rect.w >= vp.width * 0.28,
    `${opening.film?.rect.w}px of ${vp.width}`
  );
  // Below `lg` the weave itself doesn't hold — see hero.tsx's z-30/lg:z-10 comment on the
  // bottom word. At 1440 "ELEVATORS" is 1120px against a 596px frame, wide enough to still
  // read as text with the film crossing through it; at 390 the phone frame (358x239) is
  // *larger* than the two-word block (116px tall combined), so weaving the second word
  // behind it did not partially obscure the brand name, it deleted the second half of it —
  // the page read as "EGYPT" alone until the sequence finished. Both words sit in front of
  // the film on a phone instead, which is a different, deliberate composition rather than a
  // failure of the desktop one.
  const desktopZOrder = vp.width >= 1024;
  check(
    desktopZOrder
      ? `[${tag}] z-order is 30 / 20 / 10 (word weaves through the film)`
      : `[${tag}] z-order is 30 / 20 / 30 (both words sit in front — the film is smaller than the wordmark here)`,
    desktopZOrder
      ? opening.z.top === '30' && opening.z.film === '20' && opening.z.bottom === '10'
      : opening.z.top === '30' && opening.z.film === '20' && opening.z.bottom === '30',
    JSON.stringify(opening.z)
  );
  check(`[${tag}] no horizontal overflow at paint`, opening.overflow <= 1, `${opening.overflow}px`);

  /* ── the scrubbed sequence ────────────────────────────────────────────── */

  const span = await page.evaluate(() => {
    const stage = document.querySelector('[data-hero-film]')?.closest('.pin-spacer');
    return stage ? stage.getBoundingClientRect().height - window.innerHeight : 0;
  });

  const geometry = () =>
    page.evaluate(() => {
      const el = document.querySelector('[data-hero-film]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      const copy = document.querySelector('[data-hero-copy]');
      const c = copy?.getBoundingClientRect();
      const words = ['[data-hero-word-1]', '[data-hero-word-2]'].map((s) =>
        Number(getComputedStyle(document.querySelector(s)).opacity)
      );
      return {
        width: Math.round(r.width),
        // The *layout* width. A rotated element's bounding rect is wider than its box —
        // at -2deg a 1238px frame measures 1257px — so the spec check needs offsetWidth or
        // it fails on an element that is exactly the right size.
        layoutWidth: el.offsetWidth,
        height: Math.round(r.height),
        top: Math.round(r.top),
        centreX: Math.round(r.left + r.width / 2),
        rotationDeg: Number((Math.atan2(m.b, m.a) * (180 / Math.PI)).toFixed(2)),
        scale: Number(Math.hypot(m.a, m.b).toFixed(3)),
        fullBleed: Math.round(r.width) >= window.innerWidth - 1,
        wordOpacity: words,
        wordTop: Math.round(
          document.querySelector('[data-hero-word-1]').getBoundingClientRect().top
        ),
        copyOpacity: Number(getComputedStyle(document.querySelector('[data-hero-copy]')).opacity),
        wordTop: Math.round(
          document.querySelector('[data-hero-word-1]').getBoundingClientRect().top
        ),
        copyOpacity: Number(getComputedStyle(document.querySelector('[data-hero-copy]')).opacity),
        overlapsCopy: c
          ? Math.round(Math.max(0, Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top)))
          : null,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        viewportW: window.innerWidth,
      };
    });

  const frames = [];
  for (const s of STAGES) {
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' }),
      Math.round(span * s.at)
    );
    await page.waitForTimeout(1500); // scrub: 0.65 needs to catch up
    const file = path.join(OUT, `hero-${vp.name}-${s.name}.png`);
    await page.screenshot({ path: file });
    frames.push({ stage: s.name, at: s.at, file, ...(await geometry()) });
  }

  const [f0, , fMid, , fEnd] = frames;

  check(
    `[${tag}] the film descends as it is scrolled`,
    fEnd.top > f0.top,
    `${f0.top} → ${fEnd.top}`
  );
  check(`[${tag}] the film grows`, fEnd.width > f0.width, `${f0.width} → ${fEnd.width}`);
  // Tilted while travelling, level once it lands.
  check(
    `[${tag}] the film is tilted while travelling and settles level`,
    Math.abs(f0.rotationDeg) >= 3.5 &&
      Math.abs(fMid.rotationDeg) < Math.abs(f0.rotationDeg) &&
      Math.abs(fEnd.rotationDeg) < 0.6,
    `${f0.rotationDeg} → ${fMid.rotationDeg} → ${fEnd.rotationDeg}`
  );
  check(
    `[${tag}] the growth is monotonic across all five stages`,
    frames.every((f, i) => i === 0 || f.width >= frames[i - 1].width - 1),
    frames.map((f) => f.width).join(' → ')
  );
  check(
    `[${tag}] the film stays horizontally centred`,
    frames.every((f) => Math.abs(f.centreX - f.viewportW / 2) <= 2),
    frames.map((f) => f.centreX).join(',')
  );
  check(
    `[${tag}] the film never becomes full-bleed`,
    frames.every((f) => !f.fullBleed)
  );
  // The bottom band leaves upward with the type, so an overlap only matters while the copy
  // is still readable. Once it has faded out there is nothing left to obscure.
  check(
    `[${tag}] the film never overlaps the CTA copy while it is readable`,
    frames.every((f) => f.copyOpacity < 0.12 || f.overlapsCopy === 0),
    frames.map((f) => `${f.overlapsCopy}px@${f.copyOpacity.toFixed(2)}`).join(' ')
  );
  // The words are the headline leaving, not a fade effect: fully opaque for as long as they
  // are on screen, travelling off the top rather than dissolving in place.
  check(
    `[${tag}] the typography stays fully opaque while on screen`,
    frames.every((f) => f.wordOpacity.every((o) => o >= 0.95)),
    frames.map((f) => f.wordOpacity.map((o) => o.toFixed(2)).join('/')).join(' ')
  );
  check(
    `[${tag}] the typography travels upward out of the stage`,
    fEnd.wordTop < f0.wordTop - 100,
    `${f0.wordTop} → ${fEnd.wordTop}`
  );
  // Travelling down, not expanding in place.
  //
  // This was `fEnd.top - f0.top >= 15% of the viewport`, which measured the wrong edge. The
  // frame grows 261px in height on the way down, and half of that growth pushes its top edge
  // *up*, so the top's net movement is the descent minus the growth — a number that shrinks
  // as the resting position is lowered even though the frame is travelling exactly as far.
  // Once the film was moved down to sit between the two words (which is where the composition
  // wants it, and where the brief asks for it), a 15%-of-viewport top travel became
  // arithmetically impossible: the settled frame is 542px tall in a 900px viewport and there
  // is nowhere left to land.
  //
  // What actually distinguishes travelling from expanding is stated in hero.tsx and measured
  // here instead: the frame's *centre* must move further than half its own growth. Below that
  // the top edge stays put and only the bottom extends. It is also viewport-independent, so
  // it does not need recalibrating per breakpoint.
  const centreTravel = fEnd.top + fEnd.height / 2 - (f0.top + f0.height / 2);
  const halfGrowth = (fEnd.height - f0.height) / 2;
  check(
    `[${tag}] the film travels down rather than expanding in place`,
    centreTravel > halfGrowth * 1.25,
    `centre +${Math.round(centreTravel)}px vs half-growth ${Math.round(halfGrowth)}px`
  );
  check(
    `[${tag}] no horizontal overflow at any stage`,
    frames.every((f) => f.overflow <= 1),
    frames.map((f) => f.overflow).join(',')
  );

  // It comes to rest at the full page width, gutter either side.
  const expectedFinal = vp.width - 32;
  check(
    `[${tag}] the resting width matches the spec`,
    Math.abs(fEnd.layoutWidth - Math.min(expectedFinal, vp.width - 32)) <= 2,
    `${fEnd.layoutWidth}px layout (${fEnd.width}px rotated bounds), expected ${Math.round(Math.min(expectedFinal, vp.width - 32))}px`
  );

  const media = await page.evaluate(() => {
    const v = document.querySelector('[data-hero-film] video');
    if (!v) return { present: false };
    return {
      present: true,
      src: v.currentSrc || v.querySelector('source')?.src || '',
      autoplay: v.autoplay,
      muted: v.muted,
      loop: v.loop,
      playsInline: v.playsInline,
      paused: v.paused,
      heroVideoCount: document.querySelectorAll('[data-hero-film] video').length,
    };
  });
  check(`[${tag}] exactly one hero video`, media.heroVideoCount === 1);
  check(
    `[${tag}] autoplay + muted + loop + playsInline`,
    media.autoplay && media.muted && media.loop && media.playsInline
  );
  check(`[${tag}] the hero video is playing`, media.present && !media.paused);
  check(
    `[${tag}] no floating hero image cards`,
    (await page.locator('[data-hero-card]').count()) === 0
  );

  const gsapWarnings = console_.filter((c) => /GSAP|target .* not found/i.test(c));
  check(`[${tag}] zero GSAP target warnings`, gsapWarnings.length === 0, gsapWarnings.join(' | '));

  results.push({ viewport: vp.name, pinSpan: Math.round(span), frames, media, console: console_ });
  await ctx.close();
}

/* ── reduced motion ─────────────────────────────────────────────────────── */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const rm = await page.evaluate(() => {
    const f = document.querySelector('[data-hero-film]');
    const r = f.getBoundingClientRect();
    return {
      pinSpacers: document.querySelectorAll('.pin-spacer').length,
      visible: r.width > 0 && getComputedStyle(f).visibility === 'visible',
      centred: Math.abs(r.left + r.width / 2 - window.innerWidth / 2) <= 2,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scrollable: document.documentElement.scrollHeight > window.innerHeight,
    };
  });
  check('[reduced-motion] no pinned sequence', rm.pinSpacers === 0);
  check('[reduced-motion] the film is visible', rm.visible);
  // The regression this exists to catch: GSAP writes `translate: none`, so an element relying
  // on Tailwind's translate utilities for centring jumped half a viewport and overflowed.
  check('[reduced-motion] the film is horizontally centred', rm.centred);
  check('[reduced-motion] no horizontal overflow', rm.overflow <= 1, `${rm.overflow}px`);
  check('[reduced-motion] the page still scrolls', rm.scrollable);
  await ctx.close();
}

await browser.close();
await writeFile(path.join(OUT, 'hero-check.json'), JSON.stringify({ results, checks }, null, 2));

const L = console.log;
for (const r of results) {
  L(`\n══ ${r.viewport} · pinned span ${r.pinSpan}px ══`);
  for (const f of r.frames) {
    L(
      `  ${f.stage.padEnd(11)} ${String(f.width).padStart(4)}×${String(f.height).padStart(3)}  ` +
        `top=${String(f.top).padStart(4)}  rot=${String(f.rotationDeg).padStart(6)}°  ` +
        `scale=${String(f.scale).padEnd(5)} words=${f.wordOpacity.map((o) => o.toFixed(2)).join('/')}  ` +
        `overlap=${f.overlapsCopy}px  ovf=${f.overflow}`
    );
  }
}

const failed = checks.filter((c) => !c.pass);
L('\n══ HERO VERIFICATION ══');
for (const f of failed) L(`  FAIL  ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
L(`\n  ${checks.length - failed.length}/${checks.length} checks passed`);
L(failed.length ? `  ${failed.length} FAILURES` : '  no failures');
L(`  screenshots: ${OUT}/`);
if (failed.length) process.exitCode = 1;
