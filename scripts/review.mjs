/**
 * Visual review capture.
 *
 * Takes the specific frames a design review needs, rather than one unreadable full-page
 * strip: each stage of the hero sequence at its own scroll offset, the nav in both of its
 * states, hover states, the repaired pinned section mid-transition, and both locales at both
 * breakpoints.
 *
 * Scroll offsets for the hero and the ascent are computed from the real pin spacers rather
 * than hard-coded, so the captures stay correct when the scroll budget is retuned.
 *
 *   node scripts/review.mjs [--url=...] [--out=.shots/review]
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
const OUT = args.out ?? '.shots/review';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];

/** Scroll, let scrub + reveals settle, then shoot the viewport. */
async function shoot(page, name, y = null) {
  if (y !== null) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(900);
  }
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
}

async function open(locale, width, height, route = '') {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/${locale}${route}`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(1200);
  return { context, page, errors };
}

/** Pin range of a stage, in scroll px. */
async function pinRange(page, selector) {
  return page.evaluate((sel) => {
    const stage = document.querySelector(sel);
    const spacer = stage?.closest('.pin-spacer');
    if (!spacer) return null;
    const top = spacer.getBoundingClientRect().top + window.scrollY;
    return { top, distance: spacer.getBoundingClientRect().height - window.innerHeight };
  }, selector);
}

/* ========================== EN desktop, 1440 ============================== */
{
  const { context, page, errors } = await open('en', 1440, 900);

  await shoot(page, '01-en-hero-initial', 0);

  const hero = await pinRange(page, '[data-hero-stage]');
  if (!hero) problems.push('hero stage is not pinned at 1440');
  else {
    // Four stages across the sequence: first card, mid cards, film arriving, settled.
    for (const [i, frac] of [0.18, 0.42, 0.66, 0.92].entries()) {
      await shoot(page, `02-en-hero-stage-${i + 1}`, hero.top + hero.distance * frac);
    }
    // The settled frame is the sequence's destination — captured on its own.
    await shoot(page, '03-en-hero-settled', hero.top + hero.distance * 0.98);
  }

  // Floating navbar: scroll up a little so the retract logic shows it over a scrolled page.
  await page.evaluate(() => window.scrollTo(0, 4200));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollBy(0, -320));
  await page.waitForTimeout(900);
  await shoot(page, '04-en-navbar-floating-glass');

  // Orange CTA hover.
  const cta = page.locator('header a[href*="/contact"]').first();
  if ((await cta.count()) > 0) {
    await cta.hover();
    await page.waitForTimeout(600);
    await shoot(page, '05-en-cta-hover-orange');
  } else {
    problems.push('no header CTA found to hover');
  }

  // The repaired pinned ascent, mid-sequence.
  const ascent = await pinRange(page, '[data-ascent-stage]');
  if (!ascent) problems.push('ascent stage is not pinned at 1440');
  else {
    await shoot(page, '06-en-ascent-pinned-a', ascent.top + ascent.distance * 0.12);
    await shoot(page, '07-en-ascent-pinned-b', ascent.top + ascent.distance * 0.55);
  }

  // Project gallery, the film row (video playing), and the process→film seam.
  const y = async (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      return el ? el.getBoundingClientRect().top + window.scrollY : null;
    }, sel);

  const filmSection = await y('video:not([data-hero-film] video)');
  const projectsY = await y('section:has(article)');
  if (projectsY !== null) await shoot(page, '08-en-project-gallery', projectsY - 80);
  if (filmSection !== null) {
    await shoot(page, '09-en-film-autoplay', filmSection - 220);
    // The seam above the film row is the reported dead zone.
    await shoot(page, '10-en-process-to-film', filmSection - 900);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  await shoot(page, '11-en-footer');

  if (errors.length) problems.push(`EN desktop console errors: ${errors.slice(0, 3).join(' | ')}`);
  await context.close();
}

/* ========================== other viewports ============================== */
const matrix = [
  { name: '12-en-mobile', locale: 'en', w: 390, h: 844, route: '' },
  { name: '13-ar-desktop', locale: 'ar', w: 1440, h: 900, route: '' },
  { name: '14-ar-mobile', locale: 'ar', w: 390, h: 844, route: '' },
  {
    name: '15-en-project-detail',
    locale: 'en',
    w: 1440,
    h: 900,
    route: '/projects/chandelier-hall-villa',
  },
  {
    name: '16-ar-project-detail',
    locale: 'ar',
    w: 1440,
    h: 900,
    route: '/projects/chandelier-hall-villa',
  },
];

for (const m of matrix) {
  const { context, page, errors } = await open(m.locale, m.w, m.h, m.route);
  await shoot(page, `${m.name}-top`, 0);
  await shoot(
    page,
    `${m.name}-mid`,
    Math.round((await page.evaluate(() => document.body.scrollHeight)) * 0.45)
  );
  if (errors.length) problems.push(`${m.name} console errors: ${errors.slice(0, 3).join(' | ')}`);
  await context.close();
}

/* ========================== reduced motion =============================== */
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shoot(page, '17-en-reduced-motion', 0);

  // Under reduced motion nothing may be pinned and no ScrollTrigger may exist.
  const pins = await page.locator('.pin-spacer').count();
  if (pins > 0) problems.push(`reduced motion still creates ${pins} pin spacer(s)`);
  await context.close();
}

await browser.close();

console.log(`\ncaptured → ${OUT}`);
if (problems.length) {
  console.log(`\n⚠ ${problems.length} problem(s):`);
  for (const p of problems) console.log(`  · ${p}`);
} else {
  console.log('no problems detected during capture');
}
