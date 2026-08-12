/**
 * Inspection form verification.
 *
 * Drives the real form in a real browser at both locales and both viewports, and asserts the
 * things a screenshot cannot: that server-side validation rejects, that the honeypot is
 * present but invisible, that the rate limiter refuses the sixth attempt, and that the
 * success panel carries a well-formed reference.
 *
 * ── The honeypot makes naive UI testing lie ─────────────────────────────────
 * A tripped honeypot returns *success* with a reference that was never stored — deliberately,
 * so a bot learns nothing. Playwright fills a form in well under the 3s minimum fill time, so
 * a harness that submits at machine speed sees a green confirmation for every case and proves
 * nothing. Two things follow, and both are load-bearing here:
 *
 *   1. Every genuine submission waits out `MIN_FILL_MS` first (`humanPause`).
 *   2. A real success is confirmed against the server's own log — the memory store prints the
 *      reference it stored, so a reference on screen that is absent from the log is a trapped
 *      submission wearing a confirmation. That is checked explicitly, in both directions.
 *
 * Run against a server whose stdout is captured:
 *   node scripts/form-check.mjs http://localhost:3100 /tmp/srv3100.log
 */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const SERVER_LOG = process.argv[3] ?? null;
const OUT = path.resolve(import.meta.dirname, '..', '.form-check');

/** Must match MIN_FILL_MS in src/lib/inspection/honeypot.ts, plus headroom. */
const HUMAN_PAUSE_MS = 3_600;

const SYMBOLS = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const REFERENCE = new RegExp(`EE-[${SYMBOLS}]{4}-[${SYMBOLS}]{4}`);

/**
 * Addresses are unique per run.
 *
 * The rate limiter lives in the server process, and its window is ten minutes — longer than
 * the gap between two runs of this harness. Reusing a fixed address means run N+1 starts
 * inside run N's window and sees its very first request refused. The run id keeps each
 * execution in its own budget.
 */
const RUN = Math.floor(Math.random() * 60_000);
let addressCounter = 0;

/** A fresh, unique address. Distinct per call and per run of the harness. */
function runAddress() {
  const n = RUN + addressCounter++;
  // 198.18.0.0/15 is reserved for benchmarking — never a real client.
  return `198.18.${Math.floor(n / 256) % 256}.${n % 256}`;
}

const results = [];

function check(label, condition, detail = '') {
  results.push({ label, pass: Boolean(condition), detail });
}

const humanPause = (page) => page.waitForTimeout(HUMAN_PAUSE_MS);

async function serverLog() {
  if (!SERVER_LOG) return '';
  try {
    return await readFile(SERVER_LOG, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Poll the server log until `needle` appears, or give up.
 *
 * The store's write and the browser's confirmation are not synchronised: the action returns
 * to the client as soon as it has the reference, while the process's stdout reaches the file
 * a moment later. Reading once, immediately, races that flush and reports a persisted request
 * as trapped.
 */
async function logContains(needle, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await serverLog()).includes(needle)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/**
 * Tick a checkbox or radio.
 *
 * Same Lenis problem as `submit`, and unfixable by waiting: Lenis owns the scroll position,
 * so `scrollIntoView` does not put the element where Playwright then expects it, and `.check()`
 * retries forever against the fixed header. A DOM `click()` dispatches a real, trusted-shaped
 * event that React's `onChange` handles identically — what it skips is Playwright's
 * hit-testing, which is asserted separately by `submitIsClickable`.
 */
async function tick(page, selector) {
  await page.locator(selector).evaluate((el) => {
    if (!el.checked) el.click();
  });
}

async function fillValid(page, locale) {
  await page.fill('[name="name"]', locale === 'ar' ? 'أحمد حسن' : 'Ahmed Hassan');
  await page.fill('[name="phone"]', '010 1234 5678');
  await page.fill('[name="area"]', locale === 'ar' ? 'التجمع' : 'New Cairo');
  await tick(page, '[name="setting"][value="villa"]');
  await tick(page, '[name="consent"]');
}

/** Wait until Lenis has finished animating and the scroll position is actually still. */
async function scrollSettled(page) {
  await page.waitForFunction(
    () =>
      new Promise((resolve) => {
        const start = window.scrollY;
        setTimeout(() => resolve(Math.abs(window.scrollY - start) < 1), 180);
      }),
    null,
    { timeout: 10_000 }
  );
}

/**
 * Activate the submit button.
 *
 * Not a pointer click. The page runs Lenis smooth scrolling, so the scroll position is being
 * animated while Playwright is trying to aim: it scrolls the button into view, Lenis keeps
 * moving, and by the time the click lands the fixed header (or the mobile CTA bar) is over
 * the target. Playwright then retries forever against a moving element.
 *
 * Focusing the button and pressing Enter is both immune to that and a real path a keyboard
 * user takes. The button's clickability under a pointer is asserted separately, once the
 * scroll has settled, rather than being conflated with "did the form submit".
 */
async function submit(page) {
  const button = page.locator('button[type="submit"]');
  await button.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await scrollSettled(page);
  await button.focus();
  await page.keyboard.press('Enter');
}

/** True when the submit button's centre point is not covered by a fixed overlay. */
async function submitIsClickable(page) {
  const button = page.locator('button[type="submit"]');
  await button.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await scrollSettled(page);
  return button.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit === el || el.contains(hit);
  });
}

/**
 * Wait for the server action to actually answer.
 *
 * Scoped to the form for the error case. Next's development overlay keeps its own empty
 * `role="alert"` node in the document at all times, so an unscoped wait resolves instantly
 * and every later assertion reads the page as it was *before* the round trip — which is
 * exactly how a harness reports "0 validation errors" on a form that validates correctly.
 */
const settled = (page) =>
  page.waitForSelector('form [role="alert"], [role="status"]', { timeout: 20000 });

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

/* ─────────────────── homepage JSON-LD, both locales ──────────────────────── */

for (const locale of ['en', 'ar']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/${locale}`, { waitUntil: 'domcontentloaded' });

  const graph = await page.$$eval('script[type="application/ld+json"]', (nodes) =>
    nodes.map((n) => JSON.parse(n.textContent))
  );
  const types = graph.map((n) => n['@type']);

  check(`[${locale}] homepage emits Organization`, types.includes('Organization'), types.join(','));
  check(`[${locale}] homepage emits WebSite`, types.includes('WebSite'), types.join(','));
  check(`[${locale}] homepage emits Service`, types.includes('Service'), types.join(','));

  const expectedLang = locale === 'ar' ? 'ar-EG' : 'en';
  check(
    `[${locale}] every JSON-LD node declares inLanguage=${expectedLang}`,
    graph.every((n) => n.inLanguage === expectedLang),
    graph.map((n) => n.inLanguage).join(',')
  );

  const org = graph.find((n) => n['@type'] === 'Organization');
  const site = graph.find((n) => n['@type'] === 'WebSite');
  const service = graph.find((n) => n['@type'] === 'Service');
  check(
    `[${locale}] WebSite and Service reference the Organization @id`,
    site?.publisher?.['@id'] === org?.['@id'] && service?.provider?.['@id'] === org?.['@id'],
    String(org?.['@id'])
  );

  check(
    `[${locale}] JSON-LD publishes no price, offer, phone or address`,
    !/priceRange|"offers"|telephone|PostalAddress|LocalBusiness|AggregateRating/.test(
      JSON.stringify(graph)
    )
  );

  await page.close();
}

/* ───────────────────── the form, per locale and viewport ─────────────────── */

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '390x844', width: 390, height: 844 },
];

for (const locale of ['en', 'ar']) {
  for (const vp of VIEWPORTS) {
    const tag = `${locale} ${vp.name}`;
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.width < 768,
      hasTouch: vp.width < 1024,
      // A distinct address per case so the rate-limit budget is never shared between them.
      extraHTTPHeaders: { 'x-forwarded-for': runAddress() },
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
    page.on('pageerror', (e) => consoleErrors.push(String(e)));

    await page.goto(`${BASE}/${locale}/contact`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts?.ready);

    /* — structure — */
    check(`[${tag}] the form renders`, (await page.locator('form').count()) === 1);

    // No `finish`: the question was removed from the form on 2026-08-12.
    for (const field of ['name', 'phone', 'area', 'setting', 'notes', 'consent']) {
      check(
        `[${tag}] field "${field}" is present`,
        (await page.locator(`[name="${field}"]`).count()) > 0
      );
    }

    check(
      `[${tag}] the form has no live region while idle`,
      // Scoped to the form: the dev overlay owns a live region of its own, and an idle
      // assertive region inside the form is the thing that would actually be wrong.
      (await page.locator('form [role="alert"], form [role="status"]').count()) === 0
    );

    check(
      `[${tag}] document direction is ${locale === 'ar' ? 'rtl' : 'ltr'}`,
      (await page.evaluate(() => document.documentElement.dir)) ===
        (locale === 'ar' ? 'rtl' : 'ltr')
    );

    /* — honeypot: in the DOM, invisible, unreachable — */
    const decoy = page.locator('[name="company-website"]');
    check(`[${tag}] honeypot decoy exists in the DOM`, (await decoy.count()) === 1);
    check(
      `[${tag}] honeypot decoy is invisible to a person (clipped, zero opacity)`,
      // Deliberately not `isVisible()`: the field IS laid out and `visibility: visible`,
      // which is the point — it hides by being clipped to 1px inside a zero-opacity,
      // aria-hidden wrapper, so naive automation still finds and fills it.
      //
      // It must NOT hide by displacement. A large negative physical offset is invisible in
      // LTR and 10,000px of scrollable overflow in RTL, which is how it shipped once.
      await decoy.evaluate((el) => {
        const wrapper = el.closest('[aria-hidden="true"]');
        if (!wrapper) return false;
        const w = wrapper.getBoundingClientRect();
        const ws = getComputedStyle(wrapper);
        return (
          Number(ws.opacity) === 0 &&
          w.width <= 2 &&
          w.height <= 2 &&
          ws.overflow === 'hidden' &&
          // on-canvas: not thrown off either edge
          w.left > -200 &&
          w.left < window.innerWidth + 200
        );
      })
    );

    // The regression that made the clipping necessary. Checked on the page itself, in both
    // directions, because it only manifested in RTL.
    check(
      `[${tag}] the page has no horizontal overflow`,
      (await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )) <= 1,
      `${await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)}px`
    );
    check(
      `[${tag}] honeypot decoy is outside the tab order and the a11y tree`,
      await decoy.evaluate(
        (el) => el.tabIndex === -1 && el.closest('[aria-hidden="true"]') !== null
      )
    );
    check(
      `[${tag}] honeypot is not merely display:none, which bots skip`,
      await decoy.evaluate((el) => getComputedStyle(el).display !== 'none')
    );

    /* — labels are real — */
    check(
      `[${tag}] every visible control has an associated label`,
      await page.evaluate(() =>
        [...document.querySelectorAll('form input, form textarea')]
          .filter((el) => el.type !== 'hidden' && el.name !== 'company-website')
          .every((el) => el.labels?.length > 0 || el.closest('label') !== null)
      )
    );

    /* — forbidden content — */
    const bodyText = await page.locator('body').innerText();
    const bodyHtml = await page.content();
    check(`[${tag}] no WhatsApp anywhere`, !/whatsapp|wa\.me/i.test(bodyHtml));
    check(
      `[${tag}] no price or estimate`,
      !/\bprice\b|starting from|\bEGP\b|جنيه|\bسعر\b/i.test(bodyText)
    );
    check(
      `[${tag}] no response-time promise`,
      !/within \d+ (hour|day|minute)|same.day|24 hours|خلال \d+ (ساعة|يوم)/i.test(bodyText)
    );
    check(`[${tag}] no tel: link, since no number is confirmed`, !/href="tel:/.test(bodyHtml));

    check(
      `[${tag}] the submit button is not covered by a fixed overlay`,
      await submitIsClickable(page)
    );

    await page.locator('form').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `form-${locale}-${vp.name}-empty.png`) });

    /* — server-side rejection — */
    await page.fill('[name="name"]', 'A');
    await page.fill('[name="phone"]', '12345');
    await humanPause(page);
    await submit(page);
    await settled(page);

    const invalidCount = await page.locator('[aria-invalid="true"]').count();
    check(
      `[${tag}] invalid fields carry aria-invalid`,
      invalidCount >= 2,
      `${invalidCount} marked`
    );

    const alerts = (await page.locator('[role="alert"]').allInnerTexts())
      .map((t) => t.trim())
      .filter(Boolean);
    check(`[${tag}] validation errors are shown`, alerts.length >= 2, `${alerts.length} messages`);
    check(
      `[${tag}] errors are written in ${locale}`,
      locale === 'ar'
        ? alerts.every((t) => /[؀-ۿ]/.test(t))
        : alerts.every((t) => !/[؀-ۿ]/.test(t)),
      alerts.join(' | ').slice(0, 100)
    );
    check(
      `[${tag}] a rejected submission produces no reference`,
      !REFERENCE.test(await page.locator('body').innerText())
    );
    check(
      `[${tag}] the form is still on screen after rejection`,
      (await page.locator('[name="name"]').count()) === 1
    );
    // React resets uncontrolled inputs when the action's response re-renders the form. A
    // rejected submission used to wipe every field, so correcting one typo meant retyping
    // the lot — the kind of defect that passes every assertion about error messages.
    check(
      `[${tag}] a rejected submission keeps what the visitor typed`,
      (await page.inputValue('[name="name"]')) === 'A' &&
        (await page.inputValue('[name="phone"]')) === '12345',
      `name="${await page.inputValue('[name="name"]')}" phone="${await page.inputValue('[name="phone"]')}"`
    );

    await page.screenshot({ path: path.join(OUT, `form-${locale}-${vp.name}-invalid.png`) });

    /* — a genuine submission, at human speed — */
    const logBefore = await serverLog();
    await fillValid(page, locale);
    await humanPause(page);
    await submit(page);
    await page.waitForSelector('[role="status"]', { timeout: 20000 });

    const successText = await page.locator('[role="status"]').innerText();
    const reference = successText.match(REFERENCE)?.[0] ?? null;

    check(`[${tag}] a valid submission succeeds`, Boolean(reference), successText.slice(0, 80));
    check(
      `[${tag}] the confirmation promises no response time`,
      !/within|hours?|days?|shortly|soon|قريبًا|خلال|ساعة|يوم/i.test(successText),
      successText.replace(/\s+/g, ' ').slice(0, 110)
    );

    // The proof that this was persisted rather than trapped.
    if (SERVER_LOG) {
      const logAfter = await serverLog();
      check(
        `[${tag}] the request actually reached the store (reference appears in the server log)`,
        reference !== null && !logBefore.includes(reference) && logAfter.includes(reference),
        String(reference)
      );
    }

    await page.screenshot({ path: path.join(OUT, `form-${locale}-${vp.name}-success.png`) });

    check(
      `[${tag}] no console errors across the whole flow`,
      consoleErrors.length === 0,
      consoleErrors.slice(0, 2).join(' | ')
    );

    await ctx.close();
  }
}

/* ────────────── the honeypot itself: fast submission is trapped ──────────── */

{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { 'x-forwarded-for': runAddress() },
  });
  const page = await ctx.newPage();

  // (a) a submission faster than a person could read the form
  await page.goto(`${BASE}/en/contact`, { waitUntil: 'networkidle' });
  await fillValid(page, 'en');
  await submit(page); // deliberately no pause
  await page.waitForSelector('[role="status"]', { timeout: 20000 });

  const fastReference = (await page.locator('[role="status"]').innerText()).match(REFERENCE)?.[0];
  check('a machine-speed submission is shown a confirmation', Boolean(fastReference));
  if (SERVER_LOG) {
    check(
      'a machine-speed submission is NOT stored — the honeypot silently discards it',
      Boolean(fastReference) && !(await serverLog()).includes(fastReference),
      String(fastReference)
    );
  }

  // (b) the decoy field filled, at human speed
  const decoyBefore = await serverLog();
  await page.goto(`${BASE}/en/contact`, { waitUntil: 'networkidle' });
  await fillValid(page, 'en');
  await page.locator('[name="company-website"]').fill('https://spam.example');
  await humanPause(page);
  await submit(page);
  await page.waitForSelector('[role="status"]', { timeout: 20000 });

  const decoyReference = (await page.locator('[role="status"]').innerText()).match(REFERENCE)?.[0];
  check('a filled decoy field is shown a confirmation', Boolean(decoyReference));
  if (SERVER_LOG) {
    check(
      'a filled decoy field is NOT stored',
      Boolean(decoyReference) &&
        !decoyBefore.includes(decoyReference) &&
        !(await logContains(decoyReference, 3000)),
      String(decoyReference)
    );
  }

  await ctx.close();
}

/* ──────────────────────────── rate limiting ──────────────────────────────── */

{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { 'x-forwarded-for': runAddress() },
  });
  const page = await ctx.newPage();

  let limitedAt = null;
  const accepted = [];

  for (let attempt = 1; attempt <= 7 && limitedAt === null; attempt++) {
    await page.goto(`${BASE}/en/contact`, { waitUntil: 'networkidle' });
    await page.fill('[name="name"]', `Rate Test ${attempt}`);
    await page.fill('[name="phone"]', '01012345678');
    await page.fill('[name="area"]', 'New Cairo');
    await tick(page, '[name="consent"]');
    await humanPause(page);
    await submit(page);
    await settled(page);

    const text = await page.locator('body').innerText();
    if (/several requests from this connection/i.test(text)) limitedAt = attempt;
    else accepted.push(attempt);
  }

  check(
    'the rate limiter refuses the sixth request from one address',
    limitedAt === 6,
    `accepted ${accepted.length}, refused at ${limitedAt ?? 'never'}`
  );
  check(
    'a rate-limited visitor is told plainly, not shown a false confirmation',
    limitedAt !== null &&
      !REFERENCE.test(
        await page
          .locator('[role="status"]')
          .innerText()
          .catch(() => '')
      )
  );

  await page.screenshot({ path: path.join(OUT, 'form-rate-limited.png') });
  await ctx.close();
}

await browser.close();
await writeFile(path.join(OUT, 'form-check.json'), JSON.stringify(results, null, 2));

const failures = results.filter((r) => !r.pass);
console.log('\n══ INSPECTION FORM VERIFICATION ══');
for (const f of failures) console.log(`  FAIL  ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
console.log(`\n  ${results.length - failures.length}/${results.length} checks passed`);
console.log(failures.length ? `  ${failures.length} FAILURES` : '  no failures');
console.log(`  screenshots: ${OUT}/`);
if (failures.length) process.exitCode = 1;
