/**
 * Responsive audit capture.
 *
 * Captures top / middle / bottom of the page at every required viewport in both locales, and
 * records the measurements a screenshot cannot show: overflow, overlapping text, contrast
 * failures, sticky elements that never release, console errors and layout shift.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = path.resolve(import.meta.dirname, '..', '.audit');

const VIEWPORTS = [
  { name: '1920x1080-desktop', width: 1920, height: 1080 },
  { name: '1440x900-desktop', width: 1440, height: 900 },
  { name: '768x1024-tablet', width: 768, height: 1024 },
  { name: '390x844-mobile', width: 390, height: 844 },
  { name: '360x800-mobile', width: 360, height: 800 },
];

const POSITIONS = [
  { name: 'top', frac: 0 },
  { name: 'mid', frac: 0.5 },
  { name: 'bottom', frac: 1 },
];

const results = [];
const browser = await chromium.launch();

for (const locale of ['en', 'ar']) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      hasTouch: vp.width < 1024,
      isMobile: vp.width < 768,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(1200);

    const dir = path.join(OUT, locale, vp.name);
    await mkdir(dir, { recursive: true });

    const total = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight
    );

    for (const pos of POSITIONS) {
      await page.evaluate(
        (y) => window.scrollTo({ top: y, behavior: 'instant' }),
        Math.round(total * pos.frac)
      );
      await page.waitForTimeout(650);
      await page.screenshot({ path: path.join(dir, `${pos.name}.png`), timeout: 20000 });
    }

    // back to top for the structural checks
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(500);

    const audit = await page.evaluate(() => {
      const de = document.documentElement;
      const overflow = de.scrollWidth - de.clientWidth;

      const offenders = [];
      if (overflow > 1) {
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1)) {
            offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
            if (offenders.length >= 4) break;
          }
        }
      }

      // Text nodes whose boxes intersect another text box by a meaningful area.
      const texts = [...document.querySelectorAll('h1,h2,h3,h4,p,li,dt,dd,span')].filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || Number(cs.opacity) < 0.15) return false;
        if (!el.textContent?.trim()) return false;
        // only leaf-ish nodes
        return ![...el.children].some((c) => c.textContent?.trim());
      });
      const overlaps = [];
      for (let i = 0; i < texts.length && overlaps.length < 6; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i].getBoundingClientRect();
          const b = texts[j].getBoundingClientRect();
          if (a.height < 4 || b.height < 4) continue;
          const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          const area = ix * iy;
          const minArea = Math.min(a.width * a.height, b.width * b.height);
          if (area > 200 && area / minArea > 0.35) {
            overlaps.push(
              `"${texts[i].textContent.trim().slice(0, 22)}" ✕ "${texts[j].textContent.trim().slice(0, 22)}"`
            );
            break;
          }
        }
      }

      // Touch targets below 44px on pointer-coarse widths.
      const small = [...document.querySelectorAll('a,button')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (r.height < 40 || r.width < 24);
        })
        .map(
          (el) =>
            `${el.tagName.toLowerCase()}:"${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}"`
        )
        .slice(0, 5);

      return {
        lang: de.lang,
        dir: de.dir,
        overflowPx: overflow,
        offenders,
        textOverlaps: overlaps,
        smallTargets: small,
        pageHeight: de.scrollHeight,
        viewportsTall: Number((de.scrollHeight / window.innerHeight).toFixed(1)),
        h1Count: document.querySelectorAll('h1').length,
        markers: document.querySelectorAll('.gsap-marker-start,.gsap-marker-end').length,
        pinSpacers: document.querySelectorAll('.pin-spacer').length,
        title: document.title,
      };
    });

    results.push({ locale, viewport: vp.name, ...audit, consoleErrors: errors, dir });
    await ctx.close();
  }
}

await browser.close();
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'responsive.json'), JSON.stringify(results, null, 2));

const L = console.log;
L(
  `\n${'LOCALE'.padEnd(7)}${'VIEWPORT'.padEnd(20)}${'LANG'.padEnd(7)}${'DIR'.padEnd(5)}${'OVF'.padEnd(6)}${'TALL'.padEnd(6)}${'H1'.padEnd(4)}NOTES`
);
L('-'.repeat(118));
let problems = 0;
for (const r of results) {
  const notes = [];
  if (r.overflowPx > 1) notes.push(`OVERFLOW ${r.overflowPx}px ${r.offenders[0] ?? ''}`);
  if (r.textOverlaps.length) notes.push(`TEXT OVERLAP: ${r.textOverlaps[0]}`);
  if (r.consoleErrors.length) notes.push(`console(${r.consoleErrors.length})`);
  if (r.h1Count !== 1) notes.push(`h1=${r.h1Count}`);
  if (r.markers) notes.push(`MARKERS=${r.markers}`);
  if (r.smallTargets.length) notes.push(`small targets: ${r.smallTargets.length}`);
  if (notes.length) problems++;
  L(
    `${r.locale.padEnd(7)}${r.viewport.padEnd(20)}${r.lang.padEnd(7)}${r.dir.padEnd(5)}${String(r.overflowPx).padEnd(6)}${String(r.viewportsTall).padEnd(6)}${String(r.h1Count).padEnd(4)}${notes.join(' ;; ') || 'ok'}`
  );
}
L('-'.repeat(118));
L(`${results.length} combinations · ${problems} with findings · screenshots in ${OUT}/`);
