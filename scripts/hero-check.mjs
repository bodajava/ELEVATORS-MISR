/**
 * Hero checkpoint capture.
 *
 * Drives the pinned hero sequence to three points — untouched, mid-scrub and settled — at each
 * required viewport, and records every console message alongside the measured geometry of the
 * film so the screenshots can be read against numbers rather than impressions.
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

const results = [];
const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const vp of VIEWPORTS) {
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
  // let the entrance timeline finish before the "initial" frame
  await page.waitForTimeout(2200);

  // The hero's scrubbed distance is the pin-spacer's added height.
  const span = await page.evaluate(() => {
    const stage = document.querySelector('[data-hero-film]')?.closest('.pin-spacer');
    return stage ? stage.getBoundingClientRect().height - window.innerHeight : 0;
  });

  const geometry = () =>
    page.evaluate(() => {
      const el = document.querySelector('[data-hero-film]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const m = new DOMMatrixReadOnly(cs.transform);
      return {
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        rotationDeg: Number((Math.atan2(m.b, m.a) * (180 / Math.PI)).toFixed(2)),
        scale: Number(Math.hypot(m.a, m.b).toFixed(3)),
        viewportW: window.innerWidth,
        fullBleed: Math.round(r.width) >= window.innerWidth - 1,
        // Positive = the film is sitting on top of the headline/CTA band.
        overlapsCopy: (() => {
          const copy = document.querySelector('[data-hero-copy]');
          if (!copy) return null;
          const c = copy.getBoundingClientRect();
          return Math.round(Math.max(0, Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top)));
        })(),
      };
    });

  const stages = [
    { name: 'initial', y: 0 },
    { name: 'mid-scroll', y: Math.round(span * 0.5) },
    { name: 'final', y: Math.round(span * 0.98) },
  ];

  const frames = [];
  for (const s of stages) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), s.y);
    // scrub: 0.65 needs a moment to catch up to the scroll position
    await page.waitForTimeout(1600);
    const file = path.join(OUT, `hero-${vp.name}-${s.name}.png`);
    await page.screenshot({ path: file });
    frames.push({ stage: s.name, scrollY: s.y, file, ...(await geometry()) });
  }

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
      count: document.querySelectorAll('section video').length,
    };
  });

  results.push({ viewport: vp.name, pinSpan: Math.round(span), frames, media, console: console_ });
  await ctx.close();
}

await browser.close();
await writeFile(path.join(OUT, 'hero-check.json'), JSON.stringify(results, null, 2));

const L = console.log;
for (const r of results) {
  L(`\n══ ${r.viewport} · pinned span ${r.pinSpan}px ══`);
  for (const f of r.frames) {
    L(
      `  ${f.stage.padEnd(11)} y=${String(f.scrollY).padStart(5)}  ` +
        `${String(f.width).padStart(4)}×${String(f.height).padStart(3)}px  ` +
        `top=${String(f.top).padStart(4)}  rot=${String(f.rotationDeg).padStart(6)}°  ` +
        `scale=${f.scale}  full-bleed=${f.fullBleed}  copy-overlap=${f.overlapsCopy}px`
    );
  }
  L(`  video: ${JSON.stringify(r.media)}`);
  const gsapWarnings = r.console.filter((c) => /GSAP|target .* not found/i.test(c));
  L(`  console messages: ${r.console.length} · GSAP target warnings: ${gsapWarnings.length}`);
  for (const c of r.console) L(`     ${c}`);
}
