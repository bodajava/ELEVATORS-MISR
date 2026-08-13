/**
 * The performance budget, as a gate.
 *
 * `scripts/baseline.mjs` measures; this decides. Every threshold below is set from a real
 * measurement of this site on this hardware (`.perf/baseline-*.json`), with headroom — a
 * budget pulled from a blog post fails on noise and gets disabled within a week.
 *
 *   node scripts/perf-budget.mjs [baseUrl] [--json]
 *
 * Exits non-zero when a budget is exceeded, and says by how much and where.
 */
import { chromium } from 'playwright';

const BASE = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:3210';
const JSON_OUT = process.argv.includes('--json');

/**
 * Why each number is what it is.
 *
 * jsWireKb      285–351KB measured. 420 leaves room for a feature without hiding a regression
 *               the size of a new dependency.
 * jsParsedKb    ~1250KB measured, uniform across routes because it is almost all shared. This
 *               is the number that predicts main-thread cost; 1500 is the ceiling.
 * homeMediaKb   the homepage's photography **and** video together — 1216KB desktop, 713KB
 *               mobile, measured. The first draft of this budget said 900 because it had been
 *               read off the video column alone; the gate caught that immediately, which is
 *               the argument for setting budgets from a measurement rather than from taste.
 *               1400 catches an unoptimised asset being added without failing on the set that
 *               ships today.
 * cls           0.000 measured everywhere. 0.1 is the Core Web Vitals threshold and this site
 *               is nowhere near it — a regression means something started animating layout.
 * lcpMs         76–280ms measured against a local production server. 1500 is loose on purpose:
 *               this runs on shared CI hardware and the point is to catch a change of kind,
 *               not to police a hundred milliseconds.
 * idleRafPerSec what is still being scheduled with the page at rest. 64/s mobile and 85/s
 *               desktop after the adaptive-motion work, but it is a sampled rate and it moves:
 *               one run put `ar mobile /contact` at 116 where every other run had it at 65.
 *               130 is set above that observed spread on purpose. The regression this exists
 *               to catch is a new always-on loop, which shows up as 180+ — the same number the
 *               unfixed site measured — not as a ten-frame wobble.
 * playingVideos more than one video decoding at once is the failure the whole media gate
 *               exists to prevent.
 */
const BUDGET = {
  jsWireKb: 420,
  jsParsedKb: 1500,
  homeMediaKb: 1400,
  cls: 0.1,
  lcpMs: 1500,
  idleRafPerSec: 130,
  playingVideos: 1,
};

const ROUTES = ['/', '/projects', '/contact', '/panorama-elevators'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];

const kb = (bytes) => Math.round((bytes / 1024) * 10) / 10;

const browser = await chromium.launch();
const failures = [];
const rows = [];

for (const locale of ['en', 'ar']) {
  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
      });
      const page = await ctx.newPage();

      let jsWire = 0;
      let jsParsed = 0;
      let media = 0;
      let afterLoad = false;
      page.on('response', async (response) => {
        const request = response.request();
        const type = request.resourceType();
        const sizes = await request.sizes().catch(() => null);
        const wire = sizes?.responseBodySize ?? 0;
        if (type === 'script' && !afterLoad) {
          jsWire += wire;
          jsParsed += await response
            .body()
            .then((b) => b.length)
            .catch(() => 0);
        }
        if (type === 'image' || type === 'media') media += wire;
      });

      await page.addInitScript(() => {
        window.__m = { lcp: 0, cls: 0, rafs: 0 };
        try {
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) window.__m.lcp = e.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value;
          }).observe({ type: 'layout-shift', buffered: true });
        } catch {
          /* older browser; bytes are still measured */
        }
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (cb) => {
          window.__m.rafs += 1;
          return raf(cb);
        };
      });

      await page.goto(`${BASE}/${locale}${route === '/' ? '' : route}`, { waitUntil: 'load' });
      afterLoad = true;
      await page.waitForTimeout(2500);
      await page.evaluate(() => {
        window.__m.rafs = 0;
      });
      await page.waitForTimeout(1000);

      const m = await page.evaluate(() => ({
        ...window.__m,
        playing: [...document.querySelectorAll('video')].filter((v) => !v.paused).length,
      }));

      const label = `${locale} ${vp.name} ${route}`;
      const measured = {
        jsWireKb: kb(jsWire),
        jsParsedKb: kb(jsParsed),
        mediaKb: kb(media),
        cls: Math.round(m.cls * 1000) / 1000,
        lcpMs: Math.round(m.lcp),
        idleRafPerSec: m.rafs,
        playingVideos: m.playing,
      };
      rows.push({ label, ...measured });

      const over = (key, value, limit) => {
        if (value > limit) failures.push(`${label}: ${key} ${value} > ${limit}`);
      };
      over('jsWireKb', measured.jsWireKb, BUDGET.jsWireKb);
      over('jsParsedKb', measured.jsParsedKb, BUDGET.jsParsedKb);
      over('cls', measured.cls, BUDGET.cls);
      over('lcpMs', measured.lcpMs, BUDGET.lcpMs);
      over('idleRafPerSec', measured.idleRafPerSec, BUDGET.idleRafPerSec);
      over('playingVideos', measured.playingVideos, BUDGET.playingVideos);
      if (route === '/') over('homeMediaKb', measured.mediaKb, BUDGET.homeMediaKb);

      await ctx.close();
    }
  }
}

await browser.close();

if (JSON_OUT) {
  console.log(JSON.stringify({ budget: BUDGET, rows, failures }, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  const num = (s, n) => String(s).padStart(n);
  console.log('\n══ performance budget ══\n');
  console.log(
    pad('route', 30) +
      num('js', 8) +
      num('parsed', 9) +
      num('media', 8) +
      num('lcp', 7) +
      num('cls', 7) +
      num('raf/s', 7) +
      num('vid', 5)
  );
  for (const r of rows) {
    console.log(
      pad(r.label, 30) +
        num(r.jsWireKb, 8) +
        num(r.jsParsedKb, 9) +
        num(r.mediaKb, 8) +
        num(r.lcpMs, 7) +
        num(r.cls, 7) +
        num(r.idleRafPerSec, 7) +
        num(r.playingVideos, 5)
    );
  }
  console.log('');
  if (failures.length === 0) {
    console.log('PASS — every route is inside its budget.\n');
  } else {
    console.log(`FAIL — ${failures.length} over budget:`);
    for (const f of failures) console.log(`  ✗ ${f}`);
    console.log('');
  }
}

process.exit(failures.length === 0 ? 0 : 1);
