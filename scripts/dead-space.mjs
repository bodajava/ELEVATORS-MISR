/**
 * Dead-space and density audit.
 *
 * The reported defects are all variants of one thing: large regions of the page that carry no
 * content, no media and no narrative. "It looks empty" is not actionable, so this measures it.
 *
 * Method: walk the page in horizontal bands and ask, for each band, how much of it is covered
 * by something a visitor can actually see — text, media, controls, rules. A run of consecutive
 * bands with near-zero coverage is dead space, and the script reports where it starts, how tall
 * it is, and which section owns it.
 *
 * Deliberately not flagged: bands that are empty *because* a section is deliberately breathing
 * around a heading. The threshold is set so that ordinary editorial spacing (under ~40% of a
 * viewport) passes and only genuinely unexplained voids are reported.
 *
 *   node scripts/dead-space.mjs http://localhost:3000
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = path.resolve(import.meta.dirname, '..', '.audit-density');

const ROUTES = [
  '',
  '/panorama-elevators',
  '/projects',
  '/process',
  '/about',
  '/contact',
];

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '390x844', width: 390, height: 844 },
];

/** A band is dead if less than this fraction of its area is covered by visible content. */
const COVERAGE_FLOOR = 0.02;
/** Only report voids at least this tall, as a fraction of the viewport height. */
const MIN_VOID_VH = 0.45;

const BAND = 40; // px

const report = [];
const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const locale of ['en', 'ar']) {
  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.width < 768,
        hasTouch: vp.width < 1024,
        // Reduced motion so pinned/scrubbed sections settle deterministically instead of
        // being measured mid-animation.
        reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();
      const consoleErrors = [];
      page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
      page.on('pageerror', (e) => consoleErrors.push(String(e)));

      const url = `${BASE}/${locale}${route}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      } catch {
        report.push({ locale, viewport: vp.name, route, error: 'navigation failed' });
        await ctx.close();
        continue;
      }
      await page.evaluate(() => document.fonts?.ready);
      // Walk the page so lazy media loads before anything is measured as "empty".
      await page.evaluate(async () => {
        const step = Math.round(window.innerHeight * 0.8);
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 90));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(500);

      const measured = await page.evaluate(
        ({ BAND, COVERAGE_FLOOR, MIN_VOID_VH }) => {
          const docHeight = document.documentElement.scrollHeight;
          const width = document.documentElement.clientWidth;
          const bands = Math.ceil(docHeight / BAND);
          const covered = new Float64Array(bands);

          const isPaint = (el) => {
            const cs = getComputedStyle(el);
            if (cs.visibility === 'hidden' || cs.display === 'none') return false;
            if (Number(cs.opacity) < 0.08) return false;
            const tag = el.tagName;
            if (tag === 'IMG' || tag === 'VIDEO' || tag === 'SVG' || tag === 'CANVAS') return true;
            if (['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(tag)) return true;
            // A leaf-ish element with its own text.
            const own = [...el.childNodes].some(
              (n) => n.nodeType === 3 && n.textContent.trim().length > 0
            );
            if (own) return true;
            // A visible rule or filled block that is not merely a layout wrapper.
            const hasBg =
              cs.backgroundImage !== 'none' ||
              (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent');
            const r0 = el.getBoundingClientRect();
            if (hasBg && r0.height > 0 && r0.height <= 8) return true; // rules
            return false;
          };

          for (const el of document.querySelectorAll('body *')) {
            if (!isPaint(el)) continue;
            const r = el.getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0) continue;
            const top = r.top + window.scrollY;
            const bottom = top + r.height;
            const first = Math.max(0, Math.floor(top / BAND));
            const last = Math.min(bands - 1, Math.floor(bottom / BAND));
            for (let b = first; b <= last; b++) {
              covered[b] = Math.max(covered[b], Math.min(1, r.width / width));
            }
          }

          // Collect runs of near-empty bands.
          const voids = [];
          let runStart = null;
          for (let b = 0; b < bands; b++) {
            const empty = covered[b] < COVERAGE_FLOOR;
            if (empty && runStart === null) runStart = b;
            if ((!empty || b === bands - 1) && runStart !== null) {
              const runEnd = empty ? b : b - 1;
              const height = (runEnd - runStart + 1) * BAND;
              if (height >= window.innerHeight * MIN_VOID_VH) {
                const y = runStart * BAND;
                // Name the nearest section so the finding is actionable.
                let owner = '(unknown)';
                for (const s of document.querySelectorAll('section, [data-section], main > div')) {
                  const r = s.getBoundingClientRect();
                  const st = r.top + window.scrollY;
                  if (y >= st - 4 && y <= st + r.height + 4) {
                    owner =
                      s.getAttribute('data-section') ||
                      s.querySelector('h1,h2,h3')?.textContent?.trim().slice(0, 40) ||
                      s.className.slice(0, 50) ||
                      s.tagName.toLowerCase();
                  }
                }
                voids.push({ atY: y, heightPx: height, vh: +(height / window.innerHeight).toFixed(2), owner });
              }
              runStart = null;
            }
          }

          return {
            docHeight,
            viewportsTall: +(docHeight / window.innerHeight).toFixed(1),
            overflowPx: document.documentElement.scrollWidth - width,
            voids,
            counts: {
              images: document.querySelectorAll('main img').length,
              videos: document.querySelectorAll('main video').length,
              headings: document.querySelectorAll('main h1,main h2,main h3').length,
              links: document.querySelectorAll('main a').length,
            },
          };
        },
        { BAND, COVERAGE_FLOOR, MIN_VOID_VH }
      );

      const slug = route === '' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '');
      await page.screenshot({
        path: path.join(OUT, `${locale}-${vp.name}-${slug}.png`),
        fullPage: true,
      });

      report.push({ locale, viewport: vp.name, route: route || '/', ...measured, consoleErrors });
      await ctx.close();
    }
  }
}

await browser.close();
await writeFile(path.join(OUT, 'density.json'), JSON.stringify(report, null, 2));

const L = console.log;
L('\n══ DEAD SPACE & DENSITY ══');
L(
  `${'LOC'.padEnd(4)}${'VIEWPORT'.padEnd(11)}${'ROUTE'.padEnd(20)}${'TALL'.padEnd(6)}${'IMG'.padEnd(5)}${'VID'.padEnd(5)}${'OVF'.padEnd(5)}VOIDS`
);
L('-'.repeat(110));
let totalVoids = 0;
for (const r of report) {
  if (r.error) {
    L(`${r.locale.padEnd(4)}${r.viewport.padEnd(11)}${(r.route || '/').padEnd(20)}${r.error}`);
    continue;
  }
  totalVoids += r.voids.length;
  const v = r.voids.map((x) => `${x.vh}vh@${x.atY}px [${x.owner}]`).join(' ; ') || '—';
  L(
    `${r.locale.padEnd(4)}${r.viewport.padEnd(11)}${r.route.padEnd(20)}${String(r.viewportsTall).padEnd(6)}${String(r.counts.images).padEnd(5)}${String(r.counts.videos).padEnd(5)}${String(r.overflowPx).padEnd(5)}${v}`
  );
}
L('-'.repeat(110));
L(`${report.length} combinations · ${totalVoids} dead-space regions · captures in ${OUT}/`);
