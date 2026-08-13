import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * `package.json` has exposed a `test:e2e` script since Phase 1 with no configuration behind
 * it, so the command has always failed. This is that configuration.
 *
 * ── Against a production build, not the dev server ──────────────────────────
 * `next dev` ships an unminified bundle with HMR attached, recompiles routes on first request,
 * and renders a development error overlay that intercepts what a real failure would look like.
 * Every timing assertion made against it is noise. `webServer` therefore builds and starts the
 * real thing — slower to start, and the only version of the site worth asserting on.
 *
 * ── Both locales, both input models ─────────────────────────────────────────
 * Arabic is not a translation of this site, it is a mirrored layout with a different script,
 * and the failures it produces are structural — a honeypot positioned off-canvas that becomes
 * 10,000px of scrollable width when the inline axis flips, a rail that will not move because
 * `scrollLeft` is negative. Every journey runs in both, on desktop and on a phone.
 *
 * ── Artefacts ───────────────────────────────────────────────────────────────
 * Screenshots, video and traces on failure only. A green run should leave nothing behind but
 * the report; a red one should leave everything needed to understand it without a re-run.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './.e2e/results',

  // A failing test that passes on a retry is a flaky test, and a flaky test that is allowed to
  // retry locally hides itself. CI retries once, because CI machines genuinely do stall.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  fullyParallel: true,

  // No `.only` reaches CI.
  forbidOnly: !!process.env.CI,

  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: '.e2e/report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: '.e2e/report', open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'desktop-en', use: { ...devices['Desktop Chrome'], locale: 'en-GB' } },
    { name: 'desktop-ar', use: { ...devices['Desktop Chrome'], locale: 'ar-EG' } },
    { name: 'mobile-en', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-ar', use: { ...devices['Pixel 7'], locale: 'ar-EG' } },
    // Reduced motion is a rendering mode, not a preference to check once — a page that only
    // becomes readable after an animation is broken for everyone who has it on.
    {
      name: 'reduced-motion',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: { reducedMotion: 'reduce' },
      },
      testMatch: /reduced-motion\.spec\.ts/,
    },
  ],

  // Setting `E2E_BASE_URL` points the suite at a server that is already running — a build in
  // another terminal, or a preview deployment — and skips starting one here. Without it the
  // suite owns its own production build, which is what CI does.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm start --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        // A cold build of 40 prerendered routes plus the media pipeline is not fast.
        timeout: 300_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
