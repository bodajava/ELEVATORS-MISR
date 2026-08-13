import { expect, test } from '@playwright/test';

import { THEME_STORAGE_KEY } from '@/lib/theme';

/**
 * The theme bootstrap, which failed silently for its entire life.
 *
 * `themeScript` used to be exported from `theme-toggle.tsx` — a `'use client'` module. A
 * Server Component importing from one of those receives a *client reference*, not the value,
 * so what the layout interpolated into the document was the stub Next generates in its place:
 * `function() { throw new Error("Attempted to call themeScript() from the server ...") }`.
 * Not valid as a statement, so it threw at parse, so the bootstrap never ran and a remembered
 * theme was never restored on any load.
 *
 * Nothing caught it. The types were right (the reference is typed as the string it stands in
 * for), the build was green, the toggle worked within a page view, and the only symptom was a
 * preference quietly not being honoured. These assertions are against the bytes on the wire
 * and the attribute in the DOM, because that is the only layer where the failure was visible.
 */
test.describe('theme', () => {
  test('the pre-paint bootstrap reaches the browser as executable script', async ({ request }) => {
    const html = await (await request.get('/en')).text();

    expect(html, 'the bootstrap is not in the document').toContain(
      `localStorage.getItem('${THEME_STORAGE_KEY}')`
    );
    expect(html, 'a client-reference stub shipped instead of the bootstrap').not.toContain(
      'Attempted to call'
    );
  });

  test('a remembered theme is applied before the page paints', async ({ page }) => {
    // Recorded at `interactive` — the end of parsing, before first paint. An effect that
    // applied the theme afterwards would still be a flash, and would still pass a check that
    // only looked at the settled page.
    await page.addInitScript((key) => {
      localStorage.setItem(key, 'dark');
      document.addEventListener('readystatechange', () => {
        if (document.readyState === 'interactive') {
          (window as unknown as { __themeAtParse?: string | null }).__themeAtParse =
            document.documentElement.dataset.theme ?? null;
        }
      });
    }, THEME_STORAGE_KEY);

    await page.goto('/en');
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { __themeAtParse?: string | null }).__themeAtParse
        )
      )
      .toBe('dark');
  });

  test('the chosen theme survives a language switch', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().includes('Encountered a script tag')) {
        errors.push(message.text());
      }
    });

    await page.addInitScript((key) => localStorage.setItem(key, 'dark'), THEME_STORAGE_KEY);
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Switching language is a soft navigation across the [locale] segment, so the layout
    // unmounts and mounts again. React acquires <html> as a singleton on that remount and
    // strips every attribute it did not render itself, `data-theme` included.
    await page
      .getByRole('button', { name: /العربية/ })
      .locator('visible=true')
      .first()
      .click();
    await page.waitForURL(/\/ar/);

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // The bootstrap is handed to the DOM as innerHTML precisely so this never fires: React
    // does not execute a <script> it renders on the client, it builds an inert node and warns.
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
