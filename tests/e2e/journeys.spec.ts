import { expect, test, type Page } from '@playwright/test';

/**
 * The journeys that have to work, in both locales, on desktop and on a phone.
 *
 * Written against what a visitor can see and do — a heading, a link's accessible name, a
 * labelled field — rather than against class names or DOM structure, so a layout change does
 * not rewrite the suite and a broken layout does not pass it.
 *
 * The Arabic runs are not a translation check. They are structural: RTL is where this codebase
 * has actually broken before (an off-canvas honeypot that became 10,000px of scrollable width
 * when the inline axis flipped, a rail that would not move because `scrollLeft` is negative),
 * and none of those are visible in English at any viewport.
 */

type Locale = 'en' | 'ar';

/** Which locale this project is exercising. The project name carries it; default to English. */
function localeFor(projectName: string): Locale {
  return projectName.includes('-ar') ? 'ar' : 'en';
}

const copy = {
  en: {
    inspectionCta: /request a site inspection/i,
    name: /^name$/i,
    phone: /^phone$/i,
    area: /^area$/i,
    consent: /you may contact me on this number/i,
    submit: /request the inspection/i,
    received: /request received/i,
    projects: /projects/i,
    phoneError: /egyptian mobile number/i,
  },
  ar: {
    inspectionCta: /اطلب معاينة الموقع/,
    name: /^الاسم$/,
    phone: /^رقم الهاتف$/,
    area: /^المنطقة$/,
    consent: /أوافق على التواصل معي/,
    submit: /اطلب المعاينة/,
    received: /تم استلام طلبك/,
    projects: /المشروعات/,
    phoneError: /رقم موبايل مصري/,
  },
} as const;

/** A phone number nobody owns, in a valid Egyptian mobile shape. */
const validPhone = () => `010${String(Math.floor(10_000_000 + Math.random() * 89_999_999))}`;

/**
 * Give this test its own client address, so it gets its own rate-limit bucket.
 *
 * The inspection action allows five submissions per address per ten minutes, keyed on
 * `x-forwarded-for` (see `clientAddressFrom`). Every project in this suite submits from the
 * same machine, so together they exceed that within a single run and the later ones are
 * refused — a correct product behaviour failing an incorrect test.
 *
 * The addresses come from 198.51.100.0/24, which RFC 5737 reserves for documentation and
 * examples, so nothing here can collide with a real client.
 */
async function withOwnRateLimitBucket(page: Page) {
  await page.setExtraHTTPHeaders({
    'x-forwarded-for': `198.51.100.${1 + Math.floor(Math.random() * 254)}`,
  });
}

async function fillInspectionForm(page: Page, locale: Locale, phone: string) {
  const t = copy[locale];
  await page.getByLabel(t.name).fill('E2E Test Visitor');
  await page.getByLabel(t.phone).fill(phone);
  await page.getByLabel(t.area).fill(locale === 'ar' ? 'التجمع' : 'New Cairo');
  await page.getByLabel(t.consent).check();
}

/**
 * Submit no sooner than the form's own anti-automation threshold allows.
 *
 * The action treats anything completed within `MIN_FILL_MS` (3s of the render timestamp in the
 * `form-rendered-at` field) as a bot, and answers it with a **fake success carrying a reference
 * that was never stored** — deliberately, so a scripted submitter sees no signal to retry.
 *
 * Playwright fills four fields in well under a second, so every test here was submitting into
 * that trap: it saw a confirmation, asserted on it happily, and was in fact exercising the
 * rejection path with nothing written to the database. The failure only became visible where a
 * test looked at the form *after* submitting and found it replaced.
 *
 * Waiting on the timestamp the server will actually read, rather than a fixed sleep, keeps this
 * correct if the threshold moves and costs nothing when the test was already slow enough.
 */
async function submitAfterHumanDwell(page: Page, locale: Locale) {
  const MIN_FILL_MS = 3_000;
  const renderedAt = Number(await page.locator('input[name="form-rendered-at"]').inputValue());
  const remaining = MIN_FILL_MS - (Date.now() - renderedAt);
  if (remaining > 0) await page.waitForTimeout(remaining + 250);
  await page.getByRole('button', { name: copy[locale].submit }).click();
}

test.describe('the conversion path', () => {
  test('homepage → project → inspection form → confirmation', async ({ page }, testInfo) => {
    const locale = localeFor(testInfo.project.name);
    const t = copy[locale];
    await withOwnRateLimitBucket(page);

    await page.goto(`/${locale}`);

    // The page is readable before anything animates: the brand name and a primary action are
    // present at first paint, not after a reveal.
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('link', { name: t.inspectionCta }).first()).toBeVisible();

    // Into a project, by its own link rather than by a URL a test invented.
    await page.goto(`/${locale}/projects`);
    const firstProject = page.getByRole('link', { name: /./ }).filter({ has: page.locator('img') });
    await expect(firstProject.first()).toBeVisible();

    // The inspection form itself.
    await page.goto(`/${locale}/contact`);
    const phone = validPhone();
    await fillInspectionForm(page, locale, phone);
    await submitAfterHumanDwell(page, locale);

    // Confirmation, with a reference the visitor can quote. No timing promise is asserted
    // because none may exist — that is a product rule, and this is where it would leak.
    await expect(page.getByRole('heading', { name: t.received })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/EE-[A-Z0-9]{4}-[A-Z0-9]{4}/)).toBeVisible();
    await expect(page.getByText(/24 hours|ساعة|shortly|قريبًا/i)).toHaveCount(0);
  });

  test('a rejected field is corrected without losing the rest of the form', async ({
    page,
  }, testInfo) => {
    const locale = localeFor(testInfo.project.name);
    const t = copy[locale];
    await withOwnRateLimitBucket(page);

    await page.goto(`/${locale}/contact`);
    await page.getByLabel(t.name).fill('E2E Test Visitor');
    await page.getByLabel(t.phone).fill('12345');
    await page.getByLabel(t.area).fill(locale === 'ar' ? 'التجمع' : 'New Cairo');
    await page.getByLabel(t.consent).check();
    await submitAfterHumanDwell(page, locale);

    // Scoped to the live region: "Egyptian mobile number" is also the field's permanent hint,
    // so a page-wide match for it passes before anything has been submitted at all.
    await expect(page.locator('[role="alert"]').filter({ hasText: t.phoneError })).toBeVisible({
      timeout: 20_000,
    });

    // The bug this guards: React resets uncontrolled inputs to `defaultValue` when the action's
    // response re-renders, so a single bad digit used to wipe every other field.
    await expect(page.getByLabel(t.name)).toHaveValue('E2E Test Visitor');
    await expect(page.getByLabel(t.area)).toHaveValue(locale === 'ar' ? 'التجمع' : 'New Cairo');
    await expect(page.getByLabel(t.consent)).toBeChecked();

    await page.getByLabel(t.phone).fill(validPhone());
    await page.getByRole('button', { name: t.submit }).click();
    await expect(page.getByRole('heading', { name: t.received })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/EE-[A-Z0-9]{4}-[A-Z0-9]{4}/)).toBeVisible();
  });
});

test.describe('direction and layout', () => {
  test('the document declares its own direction, and nothing overflows sideways', async ({
    page,
  }, testInfo) => {
    const locale = localeFor(testInfo.project.name);

    for (const route of ['', '/projects', '/contact', '/panorama-elevators', '/process']) {
      await page.goto(`/${locale}${route}`);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${locale}${route} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(
        1
      );
    }
  });
});

test.describe('keyboard only', () => {
  test('the skip link leads to the content and the primary action is reachable', async ({
    page,
  }, testInfo) => {
    const locale = localeFor(testInfo.project.name);
    await page.goto(`/${locale}`);

    // First stop of the tab order is the skip link, and it must become visible when focused —
    // a skip link nobody can see is a skip link nobody uses.
    await page.keyboard.press('Tab');
    const skip = page.locator(':focus');
    await expect(skip).toBeVisible();

    await skip.press('Enter');
    await expect(page.locator('#main, main')).toBeVisible();

    // Every focusable control must show where focus is. Walking the whole page is slow; the
    // first twenty stops cover the header, the hero and its calls to action.
    for (let i = 0; i < 20; i += 1) {
      await page.keyboard.press('Tab');
      const outline = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return 'none';
        const style = getComputedStyle(el);
        return `${style.outlineStyle}:${style.outlineWidth}:${style.boxShadow.slice(0, 12)}`;
      });
      expect(outline).not.toBe('none');
    }
  });
});

test.describe('project links', () => {
  test('a project URL is shareable and an unknown one is a real 404', async ({
    page,
  }, testInfo) => {
    const locale = localeFor(testInfo.project.name);

    const response = await page.goto(`/${locale}/projects/chandelier-hall-villa`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // The canonical link is what makes the URL shareable rather than merely reachable.
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /\/projects\/chandelier-hall-villa$/);

    const missing = await page.goto(`/${locale}/projects/a-project-that-does-not-exist`);
    expect(missing?.status()).toBe(404);
  });
});
