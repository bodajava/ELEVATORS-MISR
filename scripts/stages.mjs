/**
 * Scroll-stage capture.
 *
 * Walks a page at fixed scroll fractions and captures the viewport at each, which is the only
 * way to review a scroll-driven sequence — a full-page screenshot shows the timeline at a
 * single arbitrary progress value and tells you nothing about the stages in between.
 *
 *   node scripts/stages.mjs [--locale=en] [--width=1440] [--route=/] [--stages=0,0.05,...]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a) => {
    const m = a.match(/^--([^=]+)=?(.*)$/);
    return m ? [[m[1], m[2] || true]] : [];
  })
);

const BASE = args.url ?? 'http://localhost:3000';
const LOCALE = args.locale ?? 'en';
const WIDTH = Number(args.width ?? 1440);
const HEIGHT = Number(args.height ?? 900);
const ROUTE = args.route ?? '/';
const OUT = path.join(args.out ?? '.shots', 'stages', `${LOCALE}-${WIDTH}`);

/** Scroll positions as a fraction of total scrollable height. */
const STAGES = (args.stages ?? '0,0.03,0.06,0.10,0.14,0.18,0.24,0.32,0.45,0.6,0.78,0.92,1')
  .split(',')
  .map(Number);

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`${BASE}/${LOCALE}${ROUTE === '/' ? '' : ROUTE}`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts?.ready);
await page.waitForTimeout(1400); // let the entrance timeline settle

const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
console.log(`${LOCALE}${ROUTE} @ ${WIDTH}x${HEIGHT} — scrollable ${total}px`);

for (const [i, frac] of STAGES.entries()) {
  const y = Math.round(total * frac);
  await page.evaluate((to) => window.scrollTo({ top: to, behavior: 'instant' }), y);
  // Lenis + scrub need a few frames to catch up to a programmatic jump.
  await page.waitForTimeout(700);
  const file = path.join(
    OUT,
    `${String(i).padStart(2, '0')}-${String(Math.round(frac * 100)).padStart(3, '0')}pc.png`
  );
  await page.screenshot({ path: file });
  console.log(
    `  ${String(Math.round(frac * 100)).padStart(3)}%  y=${String(y).padStart(6)}  ${path.relative(process.cwd(), file)}`
  );
}

if (errors.length) {
  console.log(`\nconsole errors (${errors.length}):`);
  for (const e of errors.slice(0, 5)) console.log('  ' + e.slice(0, 160));
} else {
  console.log('\nno console errors');
}

await browser.close();
