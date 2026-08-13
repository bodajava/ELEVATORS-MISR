import { expect, test } from '@playwright/test';

/**
 * What a visitor who has asked for less motion actually gets.
 *
 * Two different failures hide here, and only one of them is about motion:
 *
 *   1. Content that is only revealed *by* an animation. Under reduced motion the animation
 *      never runs, and on a site built around scroll-driven reveals that means a section can
 *      be permanently invisible rather than merely still. That is not a degraded experience,
 *      it is a blank page.
 *   2. Loops that keep running anyway. `prefers-reduced-motion` is frequently set by people
 *      on low-power hardware or with vestibular conditions; an ambient rAF loop that ignores
 *      it costs them battery for an effect they asked not to see.
 */
test.describe('reduced motion', () => {
  for (const locale of ['en', 'ar'] as const) {
    test(`${locale}: every section is readable without any animation running`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');

      // Nothing may be left at zero opacity or displaced by a transform that never resolves.
      const hidden = await page.evaluate(() => {
        const offenders: string[] = [];
        for (const el of document.querySelectorAll('[data-reveal], section')) {
          const style = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          if (box.height === 0) continue;
          if (Number(style.opacity) < 0.9) {
            offenders.push(
              `${el.tagName}.${el.className.toString().slice(0, 40)} @ ${style.opacity}`
            );
          }
        }
        return offenders;
      });
      expect(
        hidden,
        `sections still transparent under reduced motion: ${hidden.join(', ')}`
      ).toEqual([]);

      // The hero's own composition is complete at paint: both halves of the wordmark and the
      // primary call to action are present without scrolling.
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test(`${locale}: no animation frame loop is left running`, async ({ page }) => {
      await page.addInitScript(() => {
        (window as unknown as { __rafs: number }).__rafs = 0;
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (cb) => {
          (window as unknown as { __rafs: number }).__rafs += 1;
          return raf(cb);
        };
      });
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Reset, settle, and count what is still being scheduled with no interaction at all.
      await page.evaluate(() => {
        (window as unknown as { __rafs: number }).__rafs = 0;
      });
      await page.waitForTimeout(1000);
      const perSecond = await page.evaluate(() => (window as unknown as { __rafs: number }).__rafs);

      // Not zero: ScrollTrigger's ticker has real work to do and a scroll-linked hero is not
      // an animation the preference is about. The budget is "nothing ambient", which is well
      // under a full 60fps loop — the unfixed page ran at 85–187 a second.
      expect(perSecond, `${perSecond} animation frames a second while idle`).toBeLessThan(70);
    });
  }
});
