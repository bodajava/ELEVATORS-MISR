/**
 * Performance measurement.
 *
 * ── What this is, and what it is not ────────────────────────────────────────
 * This runs against a **production build served locally**, with CPU and network throttling
 * applied through the Chrome DevTools Protocol. That makes it a *lab* measurement of the
 * application's own cost — bundle size, request count, image and video bytes, layout
 * stability, long tasks — which is exactly what optimisation work needs.
 *
 * It is **not** a field measurement and it is not Lighthouse. There is no CDN, no TLS, no real
 * network path and no real device. LCP measured here is faster than any visitor will see, and
 * the report says so rather than quoting it as a score.
 *
 *   node scripts/perf.mjs http://localhost:3100 [--fast]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const FAST = process.argv.includes('--fast');
const OUT = path.resolve(import.meta.dirname, '..', '.perf');

const ROUTES = [
  { name: 'home', path: '' },
  { name: 'projects', path: '/projects' },
  { name: 'project-detail', path: '/projects/chandelier-hall-villa' },
  { name: 'panorama', path: '/panorama-elevators' },
  { name: 'about', path: '/about' },
  { name: 'process', path: '/process' },
  { name: 'contact', path: '/contact' },
];

/**
 * "Slow 4G"-ish, matching what a mid-range phone on Egyptian mobile data experiences more
 * closely than an unthrottled loopback does.
 */
const NETWORK = { downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 };
const CPU_SLOWDOWN = 4;

const rows = [];
const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const route of ROUTES) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  const bytes = { total: 0, js: 0, css: 0, image: 0, video: 0, font: 0, other: 0 };
  let requests = 0;

  page.on('response', async (response) => {
    requests += 1;
    try {
      const headers = response.headers();
      const length = Number(headers['content-length'] ?? 0);
      const type = headers['content-type'] ?? '';
      const size = length || 0;
      bytes.total += size;
      if (/javascript/.test(type)) bytes.js += size;
      else if (/css/.test(type)) bytes.css += size;
      else if (/^image\//.test(type)) bytes.image += size;
      else if (/^video\//.test(type)) bytes.video += size;
      else if (/font/.test(type)) bytes.font += size;
      else bytes.other += size;
    } catch {
      /* a response with no readable headers is not worth failing the run over */
    }
  });

  const cdp = await ctx.newCDPSession(page);
  if (!FAST) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NETWORK });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  }

  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 120)));
  page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 120)));

  const started = Date.now();
  await page.goto(`${BASE}/en${route.path}`, { waitUntil: 'load', timeout: 120000 });

  // Give LCP and CLS a moment to settle, and let long tasks be recorded.
  await page.waitForTimeout(3500);

  const vitals = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const out = { lcp: 0, cls: 0, fcp: 0, longTasks: 0, longTaskMs: 0, ttfb: 0 };

        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) out.ttfb = Math.round(nav.responseStart);

        const paint = performance.getEntriesByName('first-contentful-paint')[0];
        if (paint) out.fcp = Math.round(paint.startTime);

        // `getEntriesByType('largest-contentful-paint')` returns nothing: LCP entries are not
        // retained in the timeline. Only a buffered PerformanceObserver sees them, which is why
        // the first version of this script reported LCP as 0 on every route.
        try {
          const po = new PerformanceObserver(() => {});
          po.observe({ type: 'largest-contentful-paint', buffered: true });
          // The buffered entries come back from `takeRecords()`, synchronously. Calling it and
          // discarding the return — which the first version did — leaves LCP at 0, because the
          // observer's own callback has not been scheduled yet at this point.
          const records = po.takeRecords();
          for (const entry of records) out.lcp = Math.round(entry.startTime);
          po.disconnect();
        } catch {
          /* unsupported: reported as 0 and labelled as such rather than guessed */
        }
        for (const entry of performance.getEntriesByType('layout-shift')) {
          if (!entry.hadRecentInput) out.cls += entry.value;
        }
        for (const entry of performance.getEntriesByType('longtask')) {
          out.longTasks += 1;
          out.longTaskMs += Math.round(entry.duration);
        }
        out.cls = Number(out.cls.toFixed(4));
        resolve(out);
      })
  );

  // Byte accounting from the resource timeline rather than `content-length`, which is absent
  // whenever the server uses chunked transfer encoding — that is why the header-based count
  // reported 1 kB of JavaScript for pages that clearly ship more.
  const transfer = await page.evaluate(() => {
    const buckets = { total: 0, js: 0, css: 0, image: 0, video: 0, font: 0, other: 0 };
    for (const entry of performance.getEntriesByType('resource')) {
      const size = entry.transferSize || entry.encodedBodySize || 0;
      buckets.total += size;
      const url = entry.name;
      if (entry.initiatorType === 'script' || /\.js(\?|$)/.test(url)) buckets.js += size;
      else if (entry.initiatorType === 'css' || /\.css(\?|$)/.test(url)) buckets.css += size;
      else if (/\.(mp4|webm)(\?|$)/.test(url)) buckets.video += size;
      else if (entry.initiatorType === 'img' || /_next\/image|\.(avif|webp|jpe?g|png|svg)(\?|$)/.test(url))
        buckets.image += size;
      else if (/\.(woff2?|ttf)(\?|$)/.test(url)) buckets.font += size;
      else buckets.other += size;
    }
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) buckets.total += nav.transferSize || 0;
    return buckets;
  });

  const dom = await page.evaluate(() => ({
    images: document.querySelectorAll('img').length,
    videos: document.querySelectorAll('video').length,
    videosWithSrc: [...document.querySelectorAll('video')].filter((v) => v.currentSrc).length,
    playing: [...document.querySelectorAll('video')].filter((v) => !v.paused).length,
    lazyImages: [...document.querySelectorAll('img')].filter((i) => i.loading === 'lazy').length,
    eagerImages: [...document.querySelectorAll('img')].filter((i) => i.loading !== 'lazy').length,
  }));

  rows.push({
    route: route.name,
    throttled: !FAST,
    wallMs: Date.now() - started,
    ...vitals,
    ...dom,
    requests,
    kb: Object.fromEntries(Object.entries(transfer).map(([k, v]) => [k, Math.round(v / 1024)])),
    headerKb: Math.round(bytes.total / 1024),
    consoleErrors,
  });

  await ctx.close();
}

await browser.close();
await writeFile(path.join(OUT, `perf${FAST ? '-unthrottled' : '-throttled'}.json`), JSON.stringify(rows, null, 2));

const L = console.log;
L(`\n══ PERFORMANCE — ${FAST ? 'UNTHROTTLED localhost' : 'lab: 4x CPU + ~1.6Mbps/150ms, 390x844'} ══`);
L('  Lab figures against a local production build. Not a field measurement, not Lighthouse.\n');
L(
  `${'ROUTE'.padEnd(16)}${'FCP'.padEnd(7)}${'LCP'.padEnd(8)}${'CLS'.padEnd(8)}${'LONGTASK'.padEnd(10)}${'REQ'.padEnd(6)}${'JS kB'.padEnd(8)}${'IMG kB'.padEnd(8)}${'VID kB'.padEnd(8)}IMGS`
);
L('-'.repeat(94));
for (const r of rows) {
  L(
    `${r.route.padEnd(16)}${String(r.fcp).padEnd(7)}${String(r.lcp).padEnd(8)}${String(r.cls).padEnd(8)}${`${r.longTasks}/${r.longTaskMs}ms`.padEnd(10)}${String(r.requests).padEnd(6)}${String(r.kb.js).padEnd(8)}${String(r.kb.image).padEnd(8)}${String(r.kb.video).padEnd(8)}${r.eagerImages}eager/${r.lazyImages}lazy`
  );
}
L('-'.repeat(94));
const worstCls = Math.max(...rows.map((r) => r.cls));
const anyMultiPlay = rows.filter((r) => r.playing > 1);
const errors = rows.filter((r) => r.consoleErrors.length > 0);
L(`  worst CLS: ${worstCls}`);
L(`  routes decoding more than one video at once: ${anyMultiPlay.length}`);
L(`  routes with console errors: ${errors.length}`);
for (const e of errors) L(`     ${e.route}: ${e.consoleErrors[0]}`);
L(`  raw: ${OUT}/`);
