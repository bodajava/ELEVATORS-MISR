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
  await page.getByRole('button', { name: /request the inspection/i }).click();

  // The error summary takes focus, not merely scroll — a screen-reader user gets nothing from
  // a scroll — and it is announced as an alert.
  const alert = page.getByRole('alert').first();
  await expect(alert).toBeVisible({ timeout: 20_000 });

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
