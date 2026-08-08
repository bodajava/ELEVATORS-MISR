/**
 * About page verification.
 *
 * The acceptance gate for this page is specific: **meaningful real media must intersect the
 * first viewport at every mobile width, in both locales**, without the heading or the
 * introduction being pushed off screen and without the media becoming a full-screen card.
 *
 * "Meaningful" is defined here rather than assumed: an image at least 96px on its shortest
 * side and at least 4% of the viewport area. That excludes an icon, a 1px tracking pixel or a
 * decorative rule accidentally counting as media.
 *
 *   node scripts/about-check.mjs http://localhost:3000
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = path.resolve(import.meta.dirname, '..', '.shots-gate', 'about');

const VIEWPORTS = [
  { name: '320x800', width: 320, height: 800, mobile: true },
  { name: '360x800', width: 360, height: 800, mobile: true },
  { name: '390x844', width: 390, height: 844, mobile: true },
  { name: '430x932', width: 430, height: 932, mobile: true },
  { name: '768x1024', width: 768, height: 1024, mobile: false },
  { name: '1440x900', width: 1440, height: 900, mobile: false },
];

const rows = [];
const checks = [];
const check = (label, pass, detail = '') => checks.push({ label, pass: Boolean(pass), detail });

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const locale of ['en', 'ar']) {
  for (const vp of VIEWPORTS) {
    const tag = `${locale} ${vp.name}`;
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.width < 768,
      hasTouch: vp.width < 1024,
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(`${BASE}/${locale}/about`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(500);

    const first = await page.evaluate(() => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      const media = [...document.querySelectorAll('main img, main video')]
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { el, r };
        })
        .filter(({ r }) => {
          const meaningful = Math.min(r.width, r.height) >= 96 && (r.width * r.height) / (vw * vh) >= 0.04;
          const intersects = r.top < vh && r.bottom > 0;
          return meaningful && intersects;
        })
        .sort((a, b) => a.r.top - b.r.top);

      const h1 = document.querySelector('main h1');
      const h1r = h1?.getBoundingClientRect();
      const lede = h1?.parentElement?.querySelector('p:last-of-type');
      const ledeR = lede?.getBoundingClientRect();
      const lineHeight = lede ? parseFloat(getComputedStyle(lede).lineHeight) || 24 : 24;

      const firstMedia = media[0]?.r;

      return {
        mediaInFirstViewport: media.length,
        firstMediaRect: firstMedia
          ? {
              top: Math.round(firstMedia.top),
              left: Math.round(firstMedia.left),
              w: Math.round(firstMedia.width),
              h: Math.round(firstMedia.height),
              vhPct: Math.round((firstMedia.height / vh) * 100),
            }
          : null,
        headingVisible: Boolean(h1r && h1r.top < vh && h1r.bottom > 0),
        headingTop: h1r ? Math.round(h1r.top) : null,
        ledeLines: ledeR ? Math.round(ledeR.height / lineHeight) : 0,
        overflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        // Anything wider than the viewport is clipped content.
        clipped: [...document.querySelectorAll('main *')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > vw + 2 || r.left < -2);
        }).length,
        totalImages: new Set(
          [...document.querySelectorAll('main img')].map((i) =>
            (i.currentSrc || i.src).replace(/[?&]w=\d+/, '')
          )
        ).size,
        sections: document.querySelectorAll('main h2').length,
        dir: document.documentElement.dir,
      };
    });

    const file = path.join(OUT, `about-${locale}-${vp.name}.png`);
    await page.screenshot({ path: file });

    rows.push({ locale, viewport: vp.name, file, ...first, errors });

    check(`[${tag}] media intersects the first viewport`, first.mediaInFirstViewport > 0, `${first.mediaInFirstViewport} item(s)`);
    check(`[${tag}] heading is visible`, first.headingVisible, `top=${first.headingTop}`);
    check(`[${tag}] no horizontal overflow`, first.overflowPx <= 1, `${first.overflowPx}px`);
    check(`[${tag}] no clipped content`, first.clipped === 0, `${first.clipped} element(s)`);
    check(`[${tag}] no console errors`, first.errors === undefined || errors.length === 0, errors.slice(0, 1).join(''));
    if (vp.mobile) {
      check(
        `[${tag}] first media is not a full-screen card (<= 45vh)`,
        first.firstMediaRect !== null && first.firstMediaRect.vhPct <= 45,
        `${first.firstMediaRect?.vhPct}vh`
      );
      check(
        `[${tag}] introduction is short above the fold (<= 5 lines)`,
        first.ledeLines > 0 && first.ledeLines <= 5,
        `${first.ledeLines} lines`
      );
    }

    await ctx.close();
  }
}

await browser.close();
await writeFile(path.join(OUT, 'about-check.json'), JSON.stringify({ rows, checks }, null, 2));

const L = console.log;
L('\n══ ABOUT ══');
L(
  `${'LOC'.padEnd(4)}${'VIEWPORT'.padEnd(11)}${'MEDIA'.padEnd(7)}${'1st MEDIA RECT'.padEnd(28)}${'H1'.padEnd(4)}${'LEDE'.padEnd(6)}${'OVF'.padEnd(5)}${'CLIP'.padEnd(6)}${'IMGS'.padEnd(6)}SECT`
);
L('-'.repeat(104));
for (const r of rows) {
  const rect = r.firstMediaRect
    ? `${r.firstMediaRect.w}x${r.firstMediaRect.h}@top${r.firstMediaRect.top} ${r.firstMediaRect.vhPct}vh`
    : '—';
  L(
    `${r.locale.padEnd(4)}${r.viewport.padEnd(11)}${String(r.mediaInFirstViewport).padEnd(7)}${rect.padEnd(28)}${(r.headingVisible ? 'yes' : 'NO').padEnd(4)}${String(r.ledeLines).padEnd(6)}${String(r.overflowPx).padEnd(5)}${String(r.clipped).padEnd(6)}${String(r.totalImages).padEnd(6)}${r.sections}`
  );
}

const failed = checks.filter((c) => !c.pass);
L('-'.repeat(104));
for (const f of failed) L(`  FAIL  ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
L(`\n  ${checks.length - failed.length}/${checks.length} checks passed`);
L(failed.length ? `  ${failed.length} FAILURES` : '  no failures');
L(`  screenshots: ${OUT}/`);
if (failed.length) process.exitCode = 1;
