/**
 * Responsive visual verification harness.
 *
 * Screenshots every route at every required width in both locales, and reports the checks
 * that a screenshot alone cannot show: horizontal overflow, console errors, broken media,
 * and the document's lang/dir attributes.
 *
 * Usage:  node scripts/shoot.mjs [--url http://localhost:3000] [--out .shots] [--routes /,/projects]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a) => {
    const m = a.match(/^--([^=]+)=?(.*)$/);
    return m ? [[m[1], m[2] || true]] : [];
  })
);

const BASE = args.url ?? 'http://localhost:3000';
const OUT = args.out ?? '.shots';
const LOCALES = ['en', 'ar'];
const ROUTES = (args.routes ?? '/').split(',');

/** The widths the brief requires, plus the tablet/laptop steps. */
const VIEWPORTS = [
  { name: '320', width: 320, height: 720 },
  { name: '375', width: 375, height: 812 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: '768-tablet', width: 768, height: 1024 },
  { name: '1024-laptop', width: 1024, height: 768 },
  { name: '1440-desktop', width: 1440, height: 900 },
  { name: '1920-wide', width: 1920, height: 1080 },
];

const results = [];

const browser = await chromium.launch();

for (const locale of LOCALES) {
  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();

      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text());
      });
      page.on('pageerror', (e) => pageErrors.push(String(e)));
      page.on('requestfailed', (r) =>
        failedRequests.push(`${r.url()} — ${r.failure()?.errorText ?? 'failed'}`)
      );

      const url = `${BASE}/${locale}${route === '/' ? '' : route}`;
      let status = 0;
      try {
        const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        status = resp?.status() ?? 0;
      } catch (err) {
        results.push({ locale, route, vp: vp.name, error: String(err) });
        await context.close();
        continue;
      }

      // Fonts settled, so text metrics in the screenshot are final.
      await page.evaluate(() => document.fonts?.ready);

      // Scroll the whole page before capturing. Without this, scroll-triggered reveals never
      // fire and lazy images never load, so a full-page screenshot records blank bands that
      // no real visitor would ever see — and genuine defects below the fold stay invisible.
      await page.evaluate(async () => {
        const step = Math.round(window.innerHeight * 0.8);
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 90));
        }
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((r) => setTimeout(r, 350));
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 250));
      });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(400);

      const audit = await page.evaluate(() => {
        const de = document.documentElement;
        const overflow = de.scrollWidth - de.clientWidth;
        const offenders = [];
        if (overflow > 1) {
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1)) {
              offenders.push(
                `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ').slice(0, 2).join('.') : ''} [${Math.round(r.left)}→${Math.round(r.right)}]`
              );
              if (offenders.length >= 5) break;
            }
          }
        }
        const brokenImages = [...document.images]
          .filter((i) => i.complete && i.naturalWidth === 0)
          .map((i) => i.currentSrc || i.src);
        const brokenVideos = [...document.querySelectorAll('video')]
          .filter((v) => v.error)
          .map((v) => v.currentSrc || v.src);
        // Any element whose accessible name is missing on an icon-only control
        const unlabelled = [...document.querySelectorAll('button, a')]
          .filter((el) => {
            const text = (el.textContent || '').trim();
            const label = el.getAttribute('aria-label') || el.getAttribute('title');
            return !text && !label;
          })
          .map((el) => el.outerHTML.slice(0, 90));
        return {
          lang: de.lang,
          dir: de.dir,
          overflowPx: overflow,
          offenders,
          brokenImages,
          brokenVideos,
          unlabelled,
          h1Count: document.querySelectorAll('h1').length,
          title: document.title,
        };
      });

      const dir = path.join(OUT, locale, route === '/' ? 'home' : route.replace(/\//g, '_'));
      await mkdir(dir, { recursive: true });
      // Viewport-sized only. A full-page capture of a 27,000px marketing page at 2x times
      // out and is unreadable anyway — scripts/sections.mjs is the tool for visual review;
      // this harness exists for the programmatic checks below.
      await page.screenshot({
        path: path.join(dir, `${vp.name}.png`),
        timeout: 20000,
      });

      results.push({
        locale,
        route,
        vp: vp.name,
        status,
        ...audit,
        consoleErrors,
        pageErrors,
        failedRequests,
      });
      await context.close();
    }
  }
}

await browser.close();
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'audit.json'), JSON.stringify(results, null, 2));

/* ---- report ---- */
let problems = 0;
const line = (s) => console.log(s);
line('');
line(
  `${'LOCALE'.padEnd(7)}${'ROUTE'.padEnd(14)}${'VIEWPORT'.padEnd(14)}${'ST'.padEnd(5)}${'LANG'.padEnd(7)}${'DIR'.padEnd(5)}${'OVF'.padEnd(6)}NOTES`
);
line('-'.repeat(104));
for (const r of results) {
  if (r.error) {
    problems++;
    line(
      `${r.locale.padEnd(7)}${r.route.padEnd(14)}${r.vp.padEnd(14)}LOAD FAILED — ${r.error.slice(0, 60)}`
    );
    continue;
  }
  const notes = [];
  if (r.overflowPx > 1) notes.push(`OVERFLOW ${r.overflowPx}px: ${r.offenders.join(' | ')}`);
  if (r.consoleErrors.length)
    notes.push(`console(${r.consoleErrors.length}): ${r.consoleErrors[0].slice(0, 60)}`);
  if (r.pageErrors.length) notes.push(`pageerror: ${r.pageErrors[0].slice(0, 60)}`);
  if (r.failedRequests.length)
    notes.push(`reqfail(${r.failedRequests.length}): ${r.failedRequests[0].slice(0, 60)}`);
  if (r.brokenImages.length) notes.push(`broken img: ${r.brokenImages[0]}`);
  if (r.brokenVideos.length) notes.push(`broken video: ${r.brokenVideos[0]}`);
  if (r.unlabelled.length) notes.push(`unlabelled control: ${r.unlabelled[0].slice(0, 50)}`);
  if (r.h1Count !== 1) notes.push(`h1 count = ${r.h1Count}`);
  if (r.status !== 200) notes.push(`HTTP ${r.status}`);
  if (notes.length) problems++;
  line(
    `${r.locale.padEnd(7)}${r.route.padEnd(14)}${r.vp.padEnd(14)}${String(r.status).padEnd(5)}${(r.lang || '—').padEnd(7)}${(r.dir || '—').padEnd(5)}${String(r.overflowPx).padEnd(6)}${notes.join(' ;; ') || 'ok'}`
  );
}
line('-'.repeat(104));
line(`${results.length} checks · ${problems} with findings · screenshots in ${OUT}/`);
process.exit(problems > 0 ? 1 : 0);
