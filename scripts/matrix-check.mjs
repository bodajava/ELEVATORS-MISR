/**
 * Full responsive verification matrix.
 *
 * Every route × eight widths × both locales, measured rather than eyeballed. This is the
 * check that has to pass before any page is called finished.
 *
 * ── What "dead space" means here ────────────────────────────────────────────
 * A band of the page taller than 60% of the viewport in which almost nothing is painted.
 * Measured by walking the document in 40px bands and recording, per band, the widest visible
 * thing in it — text, media, controls or a rule. Long runs of near-empty bands are the defect
 * the reported screenshots show; ordinary editorial breathing room is far shorter than the
 * threshold and does not trip it.
 *
 *   node scripts/matrix-check.mjs http://localhost:3000
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = path.resolve(import.meta.dirname, '..', '.shots-gate', 'matrix');

const ROUTES = [
  '',
  '/panorama-elevators',
  '/projects',
  '/projects/chandelier-hall-villa',
  '/projects/chevron-marble-villa',
  '/process',
  '/about',
  '/contact',
];

const VIEWPORTS = [
  { name: '320x800', width: 320, height: 800 },
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

/** Screenshot only these combinations — the full grid would be 128 images. */
const SHOOT = new Set(['390x844', '1440x900']);

const rows = [];
const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const locale of ['en', 'ar']) {
  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.width < 768,
        hasTouch: vp.width < 1024,
        reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();
      const errors = [];
      const badRequests = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 120)));
      page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
      page.on('response', (r) => {
        if (r.status() >= 400 && new URL(r.url()).origin === new URL(BASE).origin) {
          badRequests.push(`${r.status()} ${new URL(r.url()).pathname}`);
        }
      });

      const url = `${BASE}/${locale}${route}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      } catch {
        rows.push({ locale, viewport: vp.name, route: route || '/', error: 'navigation failed' });
        await ctx.close();
        continue;
      }
      await page.evaluate(() => document.fonts?.ready);
      await page.evaluate(async () => {
        const step = Math.round(window.innerHeight * 0.8);
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 70));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(350);

      const measured = await page.evaluate(() => {
        const de = document.documentElement;
        const vw = de.clientWidth;
        const vh = window.innerHeight;
        const BAND = 40;
        const docH = de.scrollHeight;
        const bands = Math.ceil(docH / BAND);
        const covered = new Float64Array(bands);

        const paints = (el) => {
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.08)
            return false;
          const tag = el.tagName;
          if (['IMG', 'VIDEO', 'SVG', 'CANVAS', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(tag))
            return true;
          return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        };

        // Scan the whole body, not just `main`. The footer lives outside `main`, and
        // scanning only `main` reported the footer's entire height as a void on every page.
        for (const el of document.querySelectorAll('body *')) {
          if (el.closest('[data-ambient], [data-bottom-nav]')) continue;
          if (!paints(el)) continue;
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;
          const top = r.top + window.scrollY;
          const first = Math.max(0, Math.floor(top / BAND));
          const last = Math.min(bands - 1, Math.floor((top + r.height) / BAND));
          for (let b = first; b <= last; b++) {
            covered[b] = Math.max(covered[b], Math.min(1, r.width / vw));
          }
        }

        let worstVoid = 0;
        let voidAt = 0;
        let run = 0;
        for (let b = 0; b < bands; b++) {
          if (covered[b] < 0.02) {
            run += 1;
          } else {
            if (run * BAND > worstVoid) {
              worstVoid = run * BAND;
              voidAt = (b - run) * BAND;
            }
            run = 0;
          }
        }
        if (run * BAND > worstVoid) {
          worstVoid = run * BAND;
          voidAt = (bands - run) * BAND;
        }

        // Touch targets below 44px on any interactive element that is actually visible.
        const small = [...document.querySelectorAll('a, button, [role="button"]')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 24);
        }).length;

        const nav = document.querySelector('[data-bottom-nav]');
        const navRect = nav ? nav.getBoundingClientRect() : null;

        return {
          overflowPx: de.scrollWidth - de.clientWidth,
          // Genuinely clipped: outside the viewport AND not inside something that scrolls
          // or clips on purpose. Without the second half this counts every off-screen slide
          // in the film rail — 55 of them — as a layout defect, when they are exactly what a
          // horizontal scroll container is for.
          clipped: [...document.querySelectorAll('body *')].filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.width <= 0 || (r.right <= vw + 2 && r.left >= -2)) return false;
            for (let a = el.parentElement; a; a = a.parentElement) {
              if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowX)) return false;
            }
            return true;
          }).length,
          worstVoidPx: worstVoid,
          worstVoidVh: +(worstVoid / vh).toFixed(2),
          voidAt,
          images: new Set(
            [...document.querySelectorAll('main img')].map((i) =>
              (i.currentSrc || i.src).replace(/[?&]w=\d+/, '')
            )
          ).size,
          videos: document.querySelectorAll('main video').length,
          smallTargets: small,
          bottomNav: navRect ? Math.round(navRect.height) : 0,
          dir: de.dir,
          tall: +(docH / vh).toFixed(1),
        };
      });

      if (SHOOT.has(vp.name)) {
        const slug = route === '' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '');
        await page.screenshot({
          path: path.join(OUT, `${locale}-${vp.name}-${slug}.png`),
          fullPage: true,
        });
      }

      rows.push({ locale, viewport: vp.name, route: route || '/', ...measured, errors, badRequests });
      await ctx.close();
    }
  }
}

await browser.close();
await writeFile(path.join(OUT, 'matrix.json'), JSON.stringify(rows, null, 2));

const L = console.log;
const problems = rows.filter(
  (r) =>
    r.error ||
    r.overflowPx > 1 ||
    r.clipped > 0 ||
    r.worstVoidVh >= 0.6 ||
    r.errors.length > 0 ||
    r.badRequests.length > 0
);

L('\n══ RESPONSIVE MATRIX ══');
L(`${rows.length} combinations · ${ROUTES.length} routes × ${VIEWPORTS.length} widths × 2 locales`);
L('-'.repeat(96));
if (problems.length === 0) {
  L('  no overflow · no clipping · no dead space ≥0.6vh · no console errors · no failed requests');
} else {
  for (const p of problems) {
    const bits = [];
    if (p.error) bits.push(p.error);
    if (p.overflowPx > 1) bits.push(`overflow ${p.overflowPx}px`);
    if (p.clipped > 0) bits.push(`clipped ${p.clipped}`);
    if (p.worstVoidVh >= 0.6) bits.push(`void ${p.worstVoidVh}vh @${p.voidAt}px`);
    if (p.errors?.length) bits.push(`console(${p.errors.length}): ${p.errors[0]}`);
    if (p.badRequests?.length) bits.push(`http: ${p.badRequests[0]}`);
    L(`  ${p.locale} ${p.viewport.padEnd(10)} ${p.route.padEnd(34)} ${bits.join(' ; ')}`);
  }
}

L('-'.repeat(96));
L('  media per route (en, 1440x900):');
for (const r of rows.filter((x) => x.locale === 'en' && x.viewport === '1440x900')) {
  L(`    ${r.route.padEnd(34)} images=${String(r.images).padEnd(3)} videos=${String(r.videos).padEnd(3)} tall=${r.tall}vh worstVoid=${r.worstVoidVh}vh`);
}
const navRows = rows.filter((r) => r.viewport === '390x844');
L(`\n  bottom nav present on mobile: ${navRows.every((r) => r.bottomNav > 0) ? 'yes' : 'NO'} (height ${navRows[0]?.bottomNav}px)`);
L(`  bottom nav absent on desktop: ${rows.filter((r) => r.viewport === '1440x900').every((r) => r.bottomNav === 0) ? 'yes' : 'NO'}`);
L(`\n  ${rows.length - problems.length}/${rows.length} combinations clean`);
L(`  screenshots: ${OUT}/`);
if (problems.length) process.exitCode = 1;
