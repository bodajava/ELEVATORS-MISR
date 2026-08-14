import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Automated accessibility scanning, on every route, in both locales.
 *
 * ── What this does and does not prove ───────────────────────────────────────
 * axe catches roughly a third of WCAG failures — the mechanical third: contrast, names,
 * landmarks, duplicate ids, form labels, heading order. It cannot tell whether a heading
 * describes its section, whether alt text is true, or whether the focus order makes sense.
 * Those are checked by hand and by `journeys.spec.ts`. A green run here is a floor, not a
 * certificate.
 *
 * It runs in Arabic as well as English because several of the rules it enforces are
 * direction-sensitive — an element positioned off-canvas in one direction is inside the
 * scrollable area in the other, and a contrast pair can differ when the type is a different
 * family at a different weight.
 */

const ROUTES = [
  '',
  '/projects',
  '/projects/chandelier-hall-villa',
  '/panorama-elevators',
  '/process',
  '/about',
  '/contact',
];

for (const locale of ['en', 'ar'] as const) {
  for (const route of ROUTES) {
    test(`${locale}${route || '/'} has no automatically detectable violations`, async ({
      page,
    }) => {
      await page.goto(`/${locale}${route}`);
      await page.waitForLoadState('networkidle');
      // The ambient field animates opacity on a timer; scanning mid-transition produces
      // contrast readings for a state no one ever sees.
      await page.waitForTimeout(1200);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // The scan covers the page a visitor lands on. Elements that only exist inside an
        // opened dialog are covered where that dialog is opened, not here.
        .analyze();

      const summary = results.violations.map(
        (v) => `${v.id} (${v.impact}) ×${v.nodes.length}: ${v.help}`
      );
      expect(summary, `${locale}${route}\n${summary.join('\n')}`).toEqual([]);
    });
  }
}

test('the inspection form is announced correctly when it rejects input', async ({ page }) => {
  await page.goto('/en/contact');
  await page.getByLabel(/^phone$/i).fill('12345');

  // Submitting within `MIN_FILL_MS` (3s of the render timestamp) is treated as a bot and
  // answered with a fake success, so there is no error to announce and this test was asserting
  // against the honeypot's response rather than the form's. Wait on the stamp the server reads.
  const renderedAt = Number(await page.locator('input[name="form-rendered-at"]').inputValue());
  const remaining = 3_000 - (Date.now() - renderedAt);
  if (remaining > 0) await page.waitForTimeout(remaining + 250);

  await page.getByRole('button', { name: /request the inspection/i }).click();

  // The error summary takes focus, not merely scroll — a screen-reader user gets nothing from
  // a scroll — and it is announced as an alert.
  const alert = page.getByRole('alert').first();
  await expect(alert).toBeVisible({ timeout: 20_000 });

  // Let the page stop moving before measuring colour.
  //
  // Moving focus to the alert scrolls the page, which brings new sections into view and starts
  // their scroll-triggered fade. Running axe straight after caught `text-ink` part-way through
  // that fade — reported as #ECEBE6 on #FAFAF6, 1.14:1 — and produced 18 violations that were
  // all gone 1.5s later. A state that exists for a few hundred milliseconds mid-animation is
  // exempt from the contrast requirement; asserting on it measures the animation, not the
  // design. Only mobile ever saw it, because the desktop run happened to be slow enough.
  //
  // Two identical opacity samples rather than a fixed sleep: it waits exactly as long as the
  // fades take, and it does not silently stop waiting if they get slower. GSAP drives these
  // through inline styles, so there is no animation object to await.
  const opacities = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('main *')].map((el) => getComputedStyle(el).opacity).join(',')
    );
  await expect
    .poll(
      async () => {
        const before = await opacities();
        await page.waitForTimeout(250);
        return (await opacities()) === before;
      },
      { timeout: 15_000 }
    )
    .toBe(true);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
