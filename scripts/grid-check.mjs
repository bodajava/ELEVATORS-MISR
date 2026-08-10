/**
 * Grid gap detector for the project matrix.
 *
 * The reported defect: cells carried their own aspect ratio, a grid row takes the height of
 * its tallest item, and a short wide cell therefore left a void under itself. Automated
 * overflow and coverage checks all passed while the page looked like this, because a void
 * *inside* a grid row is not an overflow and the row itself is "full".
 *
 * So this measures the thing that was actually wrong: for every row of the grid, how far the
 * shortest cell falls short of the tallest.
 *
 *   node scripts/grid-check.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const browser = await chromium.launch();
const findings = [];
const note = (m) => console.log('  ' + m);

/** A gap taller than this reads as a hole rather than a rounding difference. */
const TOLERANCE = 4;

const ROUTES = ['', '/projects'];

for (const locale of ['en', 'ar']) {
  for (const route of ROUTES) {
    for (const width of [1440, 390]) {
      const ctx = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        isMobile: width === 390,
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/${locale}${route}`, { waitUntil: 'load' });

      // Reveal holds sections at autoAlpha 0 until ScrollTrigger fires, so the page has to be
      // scrolled for real before anything can be measured.
      await page.evaluate(async () => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await sleep(25);
        }
        window.scrollTo(0, 0);
        await sleep(300);
      });
      await page.waitForTimeout(800);

      const grids = await page.evaluate((tol) => {
        const out = [];
        /**
         * Bento grids: coverage, not row levelling.
         *
         * A two-row cell beside a one-row cell shares a top edge and differs in height, which
         * the row model below reads as a void — but there is no void, because a second cell is
         * stacked under the short one. The honest measurement for that layout is whether the
         * tiles fill their own bounding box. Anything the gaps do not explain is a real hole.
         */
        const bento = (ul) => {
          const tiles = [...ul.children]
            .map((li) => (li.querySelector('a > div') ?? li).getBoundingClientRect())
            .filter((r) => r.height > 40);
          if (tiles.length < 2) return null;
          const box = {
            left: Math.min(...tiles.map((r) => r.left)),
            right: Math.max(...tiles.map((r) => r.right)),
            top: Math.min(...tiles.map((r) => r.top)),
            bottom: Math.max(...tiles.map((r) => r.bottom)),
          };
          const area = (box.right - box.left) * (box.bottom - box.top);
          const filled = tiles.reduce((sum, r) => sum + r.width * r.height, 0);
          return { tiles: tiles.length, coverage: area > 0 ? filled / area : 1 };
        };

        for (const ul of document.querySelectorAll('ul.grid')) {
          if (ul.dataset.ragged === 'bento') {
            const result = bento(ul);
            if (result) out.push({ kind: 'bento', ...result });
            continue;
          }
          // One documented exception: the social-proof contact sheet hangs from a shared top
          // line and is meant to be ragged. It carries the attribute so this is a declared
          // exemption rather than a hole the detector happens to miss.
          if (ul.dataset.ragged) continue;
          const tiles = [...ul.children]
            .map((li) => {
              const frame = li.querySelector('a > div') ?? li;
              const r = frame.getBoundingClientRect();
              return { top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) };
            })
            .filter((t) => t.h > 40);
          if (tiles.length < 2) continue;

          // Group by top edge — that is a grid row.
          const rows = new Map();
          for (const t of tiles) {
            const key = [...rows.keys()].find((k) => Math.abs(k - t.top) < 8) ?? t.top;
            rows.set(key, [...(rows.get(key) ?? []), t]);
          }

          let worst = 0;
          let worstRow = null;
          for (const [, row] of rows) {
            if (row.length < 2) continue;
            const tall = Math.max(...row.map((t) => t.h));
            const short = Math.min(...row.map((t) => t.h));
            if (tall - short > worst) {
              worst = tall - short;
              worstRow = row.map((t) => `${t.w}x${t.h}`).join(' | ');
            }
          }
          out.push({
            tiles: tiles.length,
            rows: rows.size,
            worst,
            worstRow,
            orphanRows: [...rows.values()].filter((r) => r.length === 1).length,
          });
        }
        return out.filter((g) => g.kind === 'bento' || (g.tiles >= 2 && (g.worst > tol || g.tiles > 2)));
      }, TOLERANCE);

      const label = `${locale} ${width}px ${route || '/'}`;
      if (grids.length === 0) {
        note(`${label.padEnd(24)} no grid found`);
      }
      for (const g of grids) {
        if (g.kind === 'bento') {
          const pct = (g.coverage * 100).toFixed(1);
          note(`${label.padEnd(24)} bento · ${g.tiles} tiles · ${pct}% of its box covered`);
          // Gaps between cells account for a few percent. Anything past that is a hole the
          // planner left, which is the failure this whole script exists to catch.
          if (g.coverage < 0.9) {
            findings.push(
              `${label}: the bento covers only ${pct}% of its own box — a cell is missing`
            );
          }
          continue;
        }
        note(
          `${label.padEnd(24)} ${g.tiles} tiles / ${g.rows} rows · worst in-row height gap ${g.worst}px` +
            (g.worst > TOLERANCE ? `  [${g.worstRow}]` : '')
        );
        if (g.worst > TOLERANCE) {
          findings.push(
            `${label}: a grid row leaves a ${g.worst}px void — cells in one row are different heights (${g.worstRow})`
          );
        }
        if (g.orphanRows > 0 && g.tiles > 2) {
          findings.push(`${label}: ${g.orphanRows} row(s) hold a single tile`);
        }
      }

      await ctx.close();
    }
  }
}

await browser.close();

console.log(`\n${'═'.repeat(62)}`);
if (findings.length === 0) console.log('PASS — no findings');
else {
  console.log(`${findings.length} FINDING(S):`);
  for (const f of findings) console.log('  ✗ ' + f);
}
process.exit(findings.length === 0 ? 0 : 1);
