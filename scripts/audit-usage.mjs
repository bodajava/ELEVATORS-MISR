/**
 * Media usage audit.
 *
 * Answers "which assets actually reach a page" by crawling the built routes in a browser and
 * recording every image and video URL the DOM requests, then reconciling that against the
 * manifest and the derivative files on disk.
 *
 * A grep over source would not do: `next/image` rewrites every URL through /_next/image and
 * most media is selected at runtime from the manifest, so the only reliable evidence is what
 * the browser actually asks for.
 */
import { chromium } from 'playwright';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const ROOT = path.resolve(import.meta.dirname, '..');

const manifest = JSON.parse(
  readFileSync(path.join(ROOT, 'src/content/generated/media-manifest.json'), 'utf8')
);

const projects = JSON.parse(readFileSync(path.join(ROOT, 'docs/asset-inventory.json'), 'utf8'));

const ROUTES = [
  '/',
  '/panorama-elevators',
  '/projects',
  '/process',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  ...manifest.images
    .map((i) => i.projectSlug)
    .filter((s, idx, a) => s !== 'people' && s !== 'brand' && a.indexOf(s) === idx)
    .map((s) => `/projects/${s}`),
];

const requested = new Set();
const failed = new Set();

const browser = await chromium.launch();

for (const locale of ['en', 'ar']) {
  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith(BASE)) return;
      if (/\/_next\/image\?url=([^&]+)/.test(u)) {
        requested.add(decodeURIComponent(RegExp.$1));
      } else if (/\/media\//.test(u)) {
        requested.add(new URL(u).pathname);
      }
    });
    page.on('requestfailed', (r) => {
      if (r.url().includes('/media/')) failed.add(new URL(r.url()).pathname);
    });
    page.on('response', (r) => {
      if (r.url().includes('/media/') && r.status() >= 400) {
        failed.add(`${new URL(r.url()).pathname} → HTTP ${r.status()}`);
      }
    });

    try {
      await page.goto(`${BASE}/${locale}${route === '/' ? '' : route}`, {
        waitUntil: 'networkidle',
        timeout: 45000,
      });
      await page.evaluate(async () => {
        const step = Math.round(window.innerHeight * 0.7);
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 70));
        }
      });
      await page.waitForTimeout(400);
    } catch {
      /* recorded via requestfailed */
    }
    await page.close();
  }
}

await browser.close();

/* ------------------------------------------------------------------ report */
const onDisk = [];
function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else onDisk.push('/media' + p.split('/public/media')[1]);
  }
}
walk(path.join(ROOT, 'public/media'));

// Group derivatives by their logical source (strip -<width>.<ext>)
const logical = (f) =>
  f.replace(/-\d+\.(avif|webp|jpg|png)$/, '').replace(/\.(mp4|jpg|png|webp)$/, '');
const diskLogical = new Set(onDisk.map(logical));
const usedLogical = new Set([...requested].map(logical));

const unusedLogical = [...diskLogical].filter((l) => !usedLogical.has(l));

console.log('══ MEDIA USAGE ══');
console.log(`routes crawled: ${ROUTES.length} × 2 locales`);
console.log(`distinct media URLs requested by the browser: ${requested.size}`);
console.log(`derivative files on disk: ${onDisk.length}`);
console.log(`logical assets on disk: ${diskLogical.size}`);
console.log(`logical assets actually used: ${usedLogical.size}`);
console.log(`logical assets NEVER requested: ${unusedLogical.length}`);
if (unusedLogical.length) {
  for (const u of unusedLogical.sort()) console.log(`   unused: ${u}`);
}
console.log(`\nbroken/failed media responses: ${failed.size}`);
for (const f of failed) console.log(`   ${f}`);

/* originals coverage */
const clear = projects.assets.filter(
  (a) => a.rights === 'clear' && a.role !== 'none' && a.role !== 'unreviewed'
);
const quarantined = projects.assets.filter((a) => a.rights !== 'clear');
console.log(`\n══ ORIGINALS ══`);
console.log(`originals total: ${projects.assets.length}`);
console.log(`  rights-clear & assigned a role: ${clear.length}`);
console.log(`  quarantined / excluded: ${quarantined.length}`);
const byRights = {};
for (const a of projects.assets) byRights[a.rights] = (byRights[a.rights] ?? 0) + 1;
for (const [k, v] of Object.entries(byRights)) console.log(`    ${k}: ${v}`);
