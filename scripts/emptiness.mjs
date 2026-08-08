/**
 * Visual emptiness audit.
 *
 * ── Why this exists, when a dead-space check already did ────────────────────
 * `matrix-check.mjs` walks the page in horizontal bands and asks whether *anything* paints in
 * each one. That catches a gap between sections and nothing else: if one full-width element
 * crosses a band, the band counts as full even when 70% of it is visibly empty. A section with
 * a caption in the bottom-left corner and a photograph on the right scored as clean while
 * looking like a mostly blank screen.
 *
 * This measures the thing the eye actually judges: **what fraction of a viewport-sized region
 * is covered by ink** — text glyphs, media, controls, filled surfaces. It rasterises element
 * rectangles into a coarse grid and reports the emptiest window on the page.
 *
 * Coverage below ~18% of a full viewport reads as "this screen is empty", which is the
 * complaint this is built to find.
 *
 *   node scripts/emptiness.mjs http://localhost:3000
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = path.resolve(import.meta.dirname, '..', '.shots-gate', 'emptiness');

const ROUTES = ['', '/panorama-elevators', '/projects', '/process', '/about', '/contact'];
const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '390x844', width: 390, height: 844 },
];

/** A viewport-sized window covered less than this reads as an empty screen. */
const FLOOR = 0.18;

const rows = [];
const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const locale of ['en', 'ar']) {
  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.width < 768,
        reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/${locale}${route}`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.evaluate(() => document.fonts?.ready);
      await page.evaluate(async () => {
        const step = Math.round(window.innerHeight * 0.8);
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 70));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(300);

      const measured = await page.evaluate((FLOOR) => {
        const de = document.documentElement;
        const vw = de.clientWidth;
        const vh = window.innerHeight;
        const docH = de.scrollHeight;

        // Rasterise into 24px cells. Coarse enough to be fast, fine enough that a caption
        // does not paint a whole row.
        const CELL = 24;
        const cols = Math.ceil(vw / CELL);
        const rowsN = Math.ceil(docH / CELL);
        const grid = new Uint8Array(cols * rowsN);

        const mark = (r) => {
          const x0 = Math.max(0, Math.floor(r.left / CELL));
          const x1 = Math.min(cols - 1, Math.floor((r.right - 1) / CELL));
          const y0 = Math.max(0, Math.floor((r.top + window.scrollY) / CELL));
          const y1 = Math.min(rowsN - 1, Math.floor((r.bottom + window.scrollY - 1) / CELL));
          for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) grid[y * cols + x] = 1;
          }
        };

        for (const el of document.querySelectorAll('body *')) {
          if (el.closest('[data-ambient], [data-bottom-nav], [role="dialog"]')) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.12)
            continue;

          const tag = el.tagName;
          const isMedia = ['IMG', 'VIDEO', 'SVG', 'CANVAS'].includes(tag);
          const isControl = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
          const hasOwnText = [...el.childNodes].some(
            (n) => n.nodeType === 3 && n.textContent.trim().length > 0
          );
          const filled =
            cs.backgroundImage !== 'none' ||
            (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
              cs.backgroundColor !== 'transparent' &&
              // A page-coloured background is the ground, not content.
              cs.backgroundColor !== 'rgb(243, 240, 232)');

          if (!isMedia && !isControl && !hasOwnText && !filled) continue;

          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;

          // Text is marked at its real line boxes, so a wide <p> with one short line does not
          // claim the whole width.
          if (hasOwnText && !isMedia) {
            const range = document.createRange();
            range.selectNodeContents(el);
            for (const box of range.getClientRects()) {
              if (box.width > 0 && box.height > 0) mark(box);
            }
            range.detach?.();
          } else {
            mark(r);
          }
        }

        // Slide a viewport-tall window down the page and find the emptiest one.
        const windowRows = Math.max(1, Math.round(vh / CELL));
        let worst = { coverage: 1, atY: 0 };
        for (let y = 0; y + windowRows <= rowsN; y += Math.max(1, Math.round(windowRows / 4))) {
          let filledCells = 0;
          for (let r = y; r < y + windowRows; r++) {
            for (let c = 0; c < cols; c++) if (grid[r * cols + c]) filledCells++;
          }
          const coverage = filledCells / (windowRows * cols);
          if (coverage < worst.coverage) worst = { coverage, atY: y * CELL };
        }

        let total = 0;
        for (let i = 0; i < grid.length; i++) total += grid[i];

        return {
          worstCoverage: +worst.coverage.toFixed(3),
          worstAtY: worst.atY,
          pageCoverage: +(total / grid.length).toFixed(3),
          docH,
          failed: worst.coverage < FLOOR,
        };
      }, FLOOR);

      rows.push({ locale, viewport: vp.name, route: route || '/', ...measured });
      await ctx.close();
    }
  }
}

await browser.close();
await writeFile(path.join(OUT, 'emptiness.json'), JSON.stringify(rows, null, 2));

const L = console.log;
L('\n══ VISUAL EMPTINESS ══');
L(`  a viewport-sized window covered under ${FLOOR * 100}% reads as an empty screen\n`);
L(
  `${'LOC'.padEnd(4)}${'VIEWPORT'.padEnd(11)}${'ROUTE'.padEnd(22)}${'WORST WINDOW'.padEnd(14)}${'AT'.padEnd(9)}PAGE`
);
L('-'.repeat(72));
for (const r of rows) {
  const flag = r.failed ? '  ← EMPTY' : '';
  L(
    `${r.locale.padEnd(4)}${r.viewport.padEnd(11)}${r.route.padEnd(22)}${`${(r.worstCoverage * 100).toFixed(1)}%`.padEnd(14)}${`${r.worstAtY}px`.padEnd(9)}${(r.pageCoverage * 100).toFixed(1)}%${flag}`
  );
}
const failed = rows.filter((r) => r.failed);
L('-'.repeat(72));
L(`  ${rows.length - failed.length}/${rows.length} clean · ${failed.length} empty screens`);
if (failed.length) process.exitCode = 1;
