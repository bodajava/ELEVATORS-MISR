/**
 * Section-by-section screenshots.
 *
 * A full-page capture of a long marketing page is unreadable when scaled down. This walks the
 * page one section at a time, scrolls each into view so its reveal fires, and captures it on
 * its own — which is the only way to actually review the design below the fold.
 *
 *   node scripts/sections.mjs [--locale=en] [--width=1440] [--route=/]
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
const HEIGHT = Number(args.height ?? 2200);
const ROUTE = args.route ?? '/';
const OUT = path.join(args.out ?? '.shots', 'sections', `${LOCALE}-${WIDTH}`);

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});

const url = `${BASE}/${LOCALE}${ROUTE === '/' ? '' : ROUTE}`;
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
await page.evaluate(() => document.fonts?.ready);

const count = await page.locator('main > section, main > * > section').count();
console.log(`${url} — ${count} sections at ${WIDTH}px`);

for (let i = 0; i < count; i++) {
  const section = page.locator('main > section, main > * > section').nth(i);
  await section.scrollIntoViewIfNeeded();
  // Let the reveal finish and any lazy image decode.
  await page.waitForTimeout(900);
  const box = await section.boundingBox();
  const file = path.join(OUT, `${String(i + 1).padStart(2, '0')}.png`);
  await section.screenshot({ path: file });
  console.log(
    `  ${String(i + 1).padStart(2, '0')}  ${Math.round(box?.height ?? 0)}px tall  -> ${path.relative(process.cwd(), file)}`
  );
}

await browser.close();
