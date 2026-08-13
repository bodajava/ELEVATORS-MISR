/**
 * Does the Content-Security-Policy in next.config.ts actually let the site run?
 *
 * A CSP is not verifiable by reading it. The two mistakes this caught, both of which looked
 * correct on the page and broke it in the browser:
 *
 *   · `font-src` without `'self'` — `next/font/google` self-hosts the families under
 *     `/_next/static/media`, so every route silently fell back to a system face.
 *   · `'strict-dynamic'` without a nonce — when it is present the browser ignores `'self'`
 *     in the same directive, and every chunk on every route was refused.
 *
 * Run it against `next start`. `next dev` uses the relaxed development policy and proves
 * nothing about what ships.
 *
 *   node scripts/csp-check.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3200';
const ROUTES = ['', '/projects', '/contact', '/panorama-elevators', '/process', '/about'];

const browser = await chromium.launch();
const problems = [];

for (const locale of ['en', 'ar']) {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    const msgs = [];
    page.on('console', (m) => {
      if (m.type() === 'error') msgs.push(m.text().slice(0, 200));
    });
    page.on('pageerror', (e) => msgs.push('pageerror: ' + String(e).slice(0, 200)));
    await page.goto(`${BASE}/${locale}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Two things a violation shows up as rather than as an error: the webfont never arrives,
    // and the theme bootstrap never runs so the ground stays unpainted.
    const fonts = await page.evaluate(() => document.fonts.size);
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const painted = background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent';

    const label = `${locale}${route || '/'}`;
    console.log(
      `  ${label.padEnd(26)} errors:${String(msgs.length).padStart(3)}  fonts:${String(fonts).padStart(2)}  bg:${background}`
    );
    if (msgs.length) problems.push([label, msgs[0]]);
    if (fonts === 0) problems.push([label, 'no webfont loaded — check font-src']);
    if (!painted) problems.push([label, 'body has no background — the theme script did not run']);
    await page.close();
  }
}

await browser.close();

console.log('');
if (problems.length === 0) {
  console.log('PASS — no console errors, fonts loaded, theme applied, under the shipping CSP.');
  process.exit(0);
}
console.log(`FAIL — ${problems.length} problem(s):`);
for (const [route, message] of problems) console.log(`  ✗ ${route}: ${message}`);
process.exit(1);
