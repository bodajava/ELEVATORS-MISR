/**
 * Route-level performance baseline, measured in a real browser against a production server.
 *
 * The build reporter in this Next version prints no size column, and a number read off a
 * bundle report is not what a visitor pays anyway — this records what actually crosses the
 * network per route, plus the field metrics and the runtime facts a bundle report cannot show:
 * long tasks, layout shift, console errors, how many videos decode, and how many animation
 * loops are still running when the page is idle.
 *
 * Usage:
 *   node scripts/baseline.mjs [baseUrl] [--out docs/baseline.json] [--label before]
 *
 * Run it against `next start`, not `next dev` — dev ships an unminified bundle with HMR
 * attached and the numbers are meaningless for a budget.
 */
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flag = (name, fallback) =>
  process.argv
    .slice(2)
    .find((a) => a.startsWith(`--${name}=`))
    ?.split('=')[1] ?? fallback;

const BASE = positional[0] ?? 'http://localhost:3200';
const OUT = flag('out', null);
const LABEL = flag('label', 'baseline');

const ROUTES = [
  '/',
  '/projects',
  '/projects/chandelier-hall-villa',
  '/panorama-elevators',
  '/process',
  '/about',
  '/contact',
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];

const kb = (bytes) => Math.round((bytes / 1024) * 10) / 10;

const browser = await chromium.launch();
const rows = [];

for (const locale of ['en', 'ar']) {
  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
        // A cold visit every time: a warm cache measures the second visit, and the budget is
        // about the first.
        bypassCSP: false,
      });
      const page = await ctx.newPage();

      // Two numbers per resource type, because they answer different questions. `encoded` is
      // what crosses the network — the budget the visitor pays for on a phone plan. `decoded`
      // is what the browser then parses and executes, which is the number a bundle report
      // prints and the one that predicts main-thread cost. Next gzips but sends no
      // `content-length` when it does, so a naive `body().length` silently records the second
      // and calls it the first.
      const encoded = { script: 0, image: 0, media: 0, font: 0, stylesheet: 0, other: 0 };
      const decoded = { script: 0 };
      // Scripts requested after `load` are route prefetches for links on the page, not the
      // cost of arriving here. Counted, but separately.
      let afterLoad = false;
      let prefetchScript = 0;
      let requests = 0;
      const consoleErrors = [];
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
      });
      page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 200)));
      page.on('response', async (response) => {
        requests += 1;
        const request = response.request();
        const type = request.resourceType();
        const sizes = await request.sizes().catch(() => null);
        const wire = sizes?.responseBodySize ?? 0;
        const key = encoded[type] === undefined ? 'other' : type;
        encoded[key] += wire;
        if (type === 'script') {
          const body = await response
            .body()
            .then((b) => b.length)
            .catch(() => 0);
          decoded.script += body;
          if (afterLoad) prefetchScript += wire;
        }
      });

      // Field metrics have to be observing before the page paints.
      await page.addInitScript(() => {
        window.__metrics = { lcp: 0, cls: 0, longTasks: [], rafs: 0 };
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) window.__metrics.lcp = entry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) window.__metrics.cls += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__metrics.longTasks.push(Math.round(entry.duration));
            }
          }).observe({ type: 'longtask', buffered: true });
        } catch {
          /* the browser is older than the observers; the run still reports bytes */
        }
        // Count animation callbacks scheduled while the page is idle — a loop that never
        // stops shows up here as a per-second rate rather than a one-off.
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (cb) => {
          window.__metrics.rafs += 1;
          return raf(cb);
        };
      });

      const started = Date.now();
      await page.goto(`${BASE}/${locale}${route === '/' ? '' : route}`, {
        waitUntil: 'load',
        timeout: 60000,
      });
      const loaded = Date.now() - started;
      afterLoad = true;
      await page.evaluate(() => document.fonts?.ready);
      await page.waitForTimeout(2500);

      // Idle rAF rate: reset the counter, wait a second, read it back. A page at rest with
      // nothing animating should be at or near zero.
      await page.evaluate(() => {
        window.__metrics.rafs = 0;
      });
      await page.waitForTimeout(1000);

      const runtime = await page.evaluate(() => ({
        ...window.__metrics,
        videos: document.querySelectorAll('video').length,
        playing: [...document.querySelectorAll('video')].filter((v) => !v.paused).length,
        overflow: Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth
        ),
        height: document.documentElement.scrollHeight,
      }));

      rows.push({
        locale,
        viewport: vp.name,
        route,
        loadMs: loaded,
        requests,
        jsKb: kb(encoded.script - prefetchScript),
        jsPrefetchKb: kb(prefetchScript),
        jsParsedKb: kb(decoded.script),
        imageKb: kb(encoded.image),
        mediaKb: kb(encoded.media),
        fontKb: kb(encoded.font),
        cssKb: kb(encoded.stylesheet),
        totalKb: kb(Object.values(encoded).reduce((a, b) => a + b, 0)),
        lcpMs: Math.round(runtime.lcp),
        cls: Math.round(runtime.cls * 1000) / 1000,
        longTasks: runtime.longTasks.length,
        longestTaskMs: runtime.longTasks.length ? Math.max(...runtime.longTasks) : 0,
        idleRafPerSec: runtime.rafs,
        videos: runtime.videos,
        playing: runtime.playing,
        overflowPx: runtime.overflow,
        consoleErrors: consoleErrors.length,
        firstError: consoleErrors[0] ?? null,
      });

      await ctx.close();
    }
  }
}

await browser.close();

const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);
console.log(`\n${LABEL} — ${BASE}\n`);
console.log(
  pad('loc', 4) +
    pad('vp', 8) +
    pad('route', 32) +
    num('js', 8) +
    num('js+pf', 8) +
    num('parsed', 8) +
    num('img', 8) +
    num('media', 8) +
    num('total', 8) +
    num('req', 5) +
    num('lcp', 7) +
    num('cls', 7) +
    num('lt', 4) +
    num('raf/s', 6) +
    num('vid', 4) +
    num('err', 4)
);
for (const r of rows) {
  console.log(
    pad(r.locale, 4) +
      pad(r.viewport, 8) +
      pad(r.route, 32) +
      num(r.jsKb, 8) +
      num(r.jsPrefetchKb, 8) +
      num(r.jsParsedKb, 8) +
      num(r.imageKb, 8) +
      num(r.mediaKb, 8) +
      num(r.totalKb, 8) +
      num(r.requests, 5) +
      num(r.lcpMs, 7) +
      num(r.cls, 7) +
      num(r.longTasks, 4) +
      num(r.idleRafPerSec, 6) +
      num(`${r.playing}/${r.videos}`, 4) +
      num(r.consoleErrors, 4)
  );
}

const worst = (key) => Math.max(...rows.map((r) => r[key]));
console.log(
  `\nworst: js ${worst('jsKb')}KB wire (${worst('jsParsedKb')}KB parsed) · total ${worst('totalKb')}KB · lcp ${worst('lcpMs')}ms · ` +
    `cls ${worst('cls')} · longest task ${worst('longestTaskMs')}ms · idle raf/s ${worst('idleRafPerSec')}`
);
const errors = rows.filter((r) => r.consoleErrors > 0);
if (errors.length) {
  console.log(`\n${errors.length} route/locale combination(s) logged console errors:`);
  for (const r of errors) console.log(`  ${r.locale} ${r.viewport} ${r.route}: ${r.firstError}`);
}
const overflowing = rows.filter((r) => r.overflowPx > 0);
if (overflowing.length) {
  console.log(`\n${overflowing.length} with horizontal overflow:`);
  for (const r of overflowing) console.log(`  ${r.locale} ${r.viewport} ${r.route}: ${r.overflowPx}px`);
}

if (OUT) {
  await writeFile(OUT, JSON.stringify({ label: LABEL, base: BASE, rows }, null, 2) + '\n');
  console.log(`\nwritten: ${OUT}`);
}
