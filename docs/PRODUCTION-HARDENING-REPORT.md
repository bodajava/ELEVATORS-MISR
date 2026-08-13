# Production hardening report

**Date:** 2026-08-13 · **Branch:** `main` · **Baseline commit:** `0ec7d6c` · **Head:** `b36318d`

Everything below is measured or reproduced. Where something is unfixed it says so, with the
evidence and the proposed fix, rather than being left out.

---

## A. Baseline, with evidence

Measured against `next start` (a production build), not `next dev`, across 28
route/locale/viewport combinations. Harness: `scripts/baseline.mjs`, raw data in
`.perf/baseline-before.json`.

| Measure                   | Result                               | Verdict                     |
| ------------------------- | ------------------------------------ | --------------------------- |
| JavaScript, wire          | 285–351 KB per route                 | Uniform — almost all shared |
| JavaScript, parsed        | 1241–1252 KB per route               | The main-thread cost        |
| Route prefetch JS         | 26–382 KB additional                 | App Router link prefetching |
| LCP                       | 76–280 ms                            | Healthy                     |
| CLS                       | 0.000 everywhere                     | Healthy                     |
| Long tasks                | 0 everywhere                         | Healthy                     |
| Console errors            | 0 everywhere                         | Healthy                     |
| Horizontal overflow       | 0 px everywhere                      | Healthy                     |
| **Idle animation frames** | **85–187 per second on every route** | **The finding**             |
| Homepage media            | 1216 KB desktop / 713 KB mobile      | Within budget               |
| Videos decoding           | 1 of 10 on the homepage, 0 elsewhere | Correct                     |

The prompt's premise — "approximately 365–368 KB JavaScript on nearly every route" — is
directionally right and worth restating precisely: **285–351 KB crosses the wire and ~1250 KB is
parsed**, and it is uniform across routes because it is shared chunks, not per-route code. No
route-level bundle problem was found. The real cost was elsewhere.

### The finding: two loops that never stopped

`/contact` and `/process` animate nothing and were still scheduling 85–187 animation-frame
callbacks a second for the life of the page.

1. `AmbientField` ran its rAF loop on touch as well as desktop, driving a scroll parallax and a
   pointer lean a finger cannot produce.
2. `SmoothScroll` constructed Lenis on touch, where `syncTouch: false` means it smooths nothing —
   but `gsap.ticker.add(tick)` still called `lenis.raf()` every frame.

**Fixed** (`5320342`). `src/lib/motion-capability.ts` decides one tier for the whole site:
`full` (fine pointer, capable, no stated preference), `ambient` (touch — the same drift handed to a
CSS keyframe the compositor owns, no loop, no cursor), `static` (reduced motion, Save-Data, or a
device reporting ≤2 GB or ≤2 cores). Both components re-evaluate when the tier changes.

| Idle animation frames/second | Before  | After |
| ---------------------------- | ------- | ----- |
| Mobile, all routes           | 184–187 | 64–65 |
| Desktop, all routes          | 85–91   | 82–91 |

**−65% on mobile.** Desktop is unchanged by design — that tier keeps the full experience. The 64/s
that remains is ScrollTrigger's ticker, which has real work to do: the hero is scroll-driven.
LCP, CLS, long tasks, console errors and overflow are unchanged.

---

## B. Production-severity bug found and fixed

**A broken Redis stopped the site taking any enquiries at all.**

`createRedisRateLimiter.check()` had no error handling. `incr()` rejects on a wrong token, a
deleted database or a network blip; the rejection travelled out into the server action, whose
`catch` re-throws anything that is not a `MissingEnvError`; the action crashed and the visitor got
an error boundary. **The limiter runs before the database write, so the lead was not recorded
either.** One wrong environment variable was enough to silently stop the business receiving work,
while every "is it set" check still passed.

This is not hypothetical — it is the state of the current environment. `pnpm preflight` reports:

```
✗ redis   super-anchovy-191556.upstash.io · UpstashError
```

A valid HTTPS Upstash endpoint whose round trip fails. Exactly the condition that produced the
crash.

**Fixed** (`039dcda`): degrades to the in-memory limiter, latched, logged once, with the error's
class only — an Upstash error carries the request URL and the token travels in that URL.
Protection becomes per-instance, which is the documented behaviour of an unconfigured deployment.
Regression test in `tests/unit/inspection-security.test.ts`.

> **BLOCKED — owner action.** The Upstash credentials in `.env.local` do not work. Either fix the
> token (Upstash console → the database → **REST API** tab, not the `redis://` string under
> "Connect") or clear both variables. Until then distributed rate limiting is off and the site is
> running on the per-instance limiter.

---

## B2. A second silent failure, found from a console error (2026-08-13)

**The theme bootstrap never ran. Not once, in any deployment.**

Reported as a React warning — "Encountered a script tag while rendering React component" from
`layout.tsx`. The warning was real but minor: React does not execute a `<script>` it renders on
the _client_, it builds an inert node and logs this. It fires on a language switch, which is a
soft navigation across the `[locale]` segment and therefore remounts the layout.

Chasing it exposed something the warning was not about. `themeScript` was exported from
`theme-toggle.tsx`, a `'use client'` module. **Every export of a client module becomes a client
reference when a Server Component imports it — not the value.** The layout was interpolating that
reference into the document, so the bytes on the wire were:

```html
<script>
  function () {
    throw new Error('Attempted to call themeScript() from the server but themeScript is on the client. ...');
  }
</script>
```

which is not valid as a statement, so it threw at parse. A visitor who chose dark got the OS
preference back on **every single load** — the toggle only held for the page view it was pressed
on. Nothing caught it: the types were right (a client reference is typed as the value it stands in
for), the build was green, and the only symptom was a preference quietly not being honoured.

A third defect sat underneath. React 19 treats `<html>` as a singleton and
`acquireSingletonInstance` strips **every** attribute off it on remount before re-applying only
the props React itself rendered. `data-theme` is written by the bootstrap, never by React, so a
language switch discarded the chosen theme even once the bootstrap worked.

**Fixed:**

| Defect                                               | Fix                                                                                             |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `themeScript` shipped as a throwing client reference | moved to `src/lib/theme.ts`, a plain module both sides may import                               |
| React builds an inert `<script>` on the client       | the bootstrap reaches the DOM as innerHTML — parsed markup executes, assigned markup never does |
| `data-theme` stripped on remount                     | `useThemeSurvivesRemount()` re-applies it in a layout effect, before paint                      |

Regression coverage in `tests/e2e/theme.spec.ts`, asserting the bytes on the wire and the
attribute in the DOM, because that is the only layer where any of this was visible.

A sweep for the same import trap elsewhere in `src/` found no other Server Component importing a
value from a `'use client'` module.

---

## B3. The E2E suite was testing the decoy, not the form (2026-08-13)

Running the suite properly for the first time — it had been written but never seen green — turned
up two more defects and one bad assumption.

**The conversion-path tests never submitted anything.** The action treats a form completed within
`MIN_FILL_MS` (3s) as a bot and answers with **a fake success carrying a reference that was never
stored**, deliberately, so a scripted submitter sees no signal to retry. Playwright fills four
fields in under a second. Every "confirmation" the suite asserted on was that decoy: it was
testing the honeypot and reporting it as the conversion path. Visible only where a test looked at
the form _after_ submitting and found it gone.

**The suite could not have passed against the rate limiter either.** Five submissions per address
per ten minutes; four projects × two submitting tests = eight from one machine. It never hit this
because tripping the honeypot returns _before_ the limiter runs.

| Defect                                                    | Fix                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Tests submitted faster than a human and got the decoy     | `submitAfterHumanDwell()` waits on the server's own `form-rendered-at` stamp                      |
| Eight real submissions shared one rate-limit bucket       | `withOwnRateLimitBucket()` gives each test an RFC 5737 documentation address                      |
| `reduced-motion.spec.ts` ran in projects without the flag | `testIgnore` on the four locale projects — it was asserting "nothing ambient" against full motion |
| `/egyptian mobile number/i` also matches the field's hint | assertion scoped to `[role="alert"]`, so it cannot pass before a submission                       |

**A real product bug, found by the suite once it worked: unknown project slugs returned HTTP 200.**
`dynamicParams` defaults to `true`, so an unknown slug was rendered on demand, `notFound()`
produced the not-found UI, and Next cached that render and served it with 200 —
`.next/server/app/en/projects/a-project-that-does-not-exist.html` was a real file in the build
output. A soft 404: correct to a reader, an indexable page to a crawler. Fixed with
`export const dynamicParams = false` on the route; the project list is a static array, so no slug
can legitimately appear after the build.

`journeys`, `theme` and `reduced-motion` now pass 36/36 against a production build.

---

## C. Security and production configuration

| Item                   | State                                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSP                    | Added. `default-src 'self'`, no external origins, `frame-ancestors 'none'`, `object-src 'none'`, `connect-src 'self'`, no `unsafe-eval` in production                |
| COOP / CORP            | Added, both `same-origin`                                                                                                                                            |
| X-DNS-Prefetch-Control | Added, `off`                                                                                                                                                         |
| Redis URL validation   | Semantic — rejects `redis://`, a pasted `redis-cli` command, whitespace, and any non-HTTPS scheme                                                                    |
| Preflight              | `pnpm preflight` / `preflight:prod` — database, migration count, Redis round trip, SMTP `verify()`, concierge provider, and the two variables required in production |
| Secrets in the tree    | Scanned in CI for key shapes, tracked `.env*`, and passworded database URLs                                                                                          |

**Two CSP drafts were wrong in ways only a browser could show**, which is what
`scripts/csp-check.mjs` exists for: `font-src` without `'self'` broke every webfont (`next/font`
self-hosts), and `'strict-dynamic'` without a nonce made the browser ignore `'self'` and refuse
every chunk on every route. Both caught before commit; 12 route/locale combinations now load with
zero console errors, fonts applied and the theme painted.

`'unsafe-inline'` remains for scripts, and the reason is structural rather than lazy: nonces force
per-request rendering and this site prerenders 40 routes. The trade-off is written into
`next.config.ts` rather than glossed.

> **BLOCKED — owner action.** Credentials have appeared in this project's chat history. Rotate
> before launch: the Gmail App Password, the Upstash REST token, the Supabase database password,
> and the Google Gemini API key. None of their values appear in this repository, this report, or
> any commit.

---

## D. Lead reliability

The send is awaited inside the visitor's own submission and had **no timeout of any kind**.
Nodemailer's defaults are two minutes on the socket and no limit on the greeting, so a Gmail
endpoint that accepted a connection and went quiet would hold a visitor on a spinner — waiting on
an email about a lead already safely in the database.

**Fixed** (`e191964`): 8 s connection, 8 s greeting, 10 s socket, one retry 600 ms apart, all under
a hard 12 s deadline raced against the send.

**A failed send now leaves a trace.** `notified_at` and `notification_error` are written after the
send resolves either way (migration `0002`, applied). `pnpm leads:unsent` lists the references
nobody was told about — with the failure class, arrival time and locale, and deliberately **no
personal data**; a script that prints a customer's phone number into a CI log is the accident it is
designed not to have.

Six tests cover the contract, including that the log line carries the reference and the error class
but never the recipient address, the name or the phone number.

---

## E. Accessibility

`tests/e2e/accessibility.spec.ts` — axe, WCAG 2.1 AA, seven routes, both locales.

**49 distinct violating elements, all `color-contrast`, all real.** Three patterns:

| Pattern                                                      | Measured | Needs | Where                                                                  |
| ------------------------------------------------------------ | -------- | ----- | ---------------------------------------------------------------------- |
| `text-accent` `#c96442` at 11 px on carbon `#262624`         | 3.88:1   | 4.5:1 | Reassurance numerals — about, projects, project detail, inspection CTA |
| Cream `--on-accent` `#faf9f5` on an `--accent` fill, 12.5 px | 3.70:1   | 4.5:1 | The small accent-filled link on `/ar/contact`                          |
| Muted grey `#999589` at `.opacity-70` on paper `#faf9f5`     | 2.84:1   | 4.5:1 | `/en/about`                                                            |

The first is a gap in the token system: there are `--color-ink-on-dark`, `--color-ink-2-on-dark`
and `--color-rule-on-dark` for dark sections inside the light theme, but no accent equivalent, so a
carbon section reaches for the light-theme accent and lands at 3.88:1. The dark theme already
defines a value that works — `#e08a5f`, 6.54:1 on charcoal.

The second contradicts the design system's own rule. `--on-accent`'s comment says it is 4.87:1 _on
`--accent-hi`_ — the hover fill — and it is being used on the base fill.

**Proposed, not applied:**

1. Add `--accent-on-dark: #e08a5f` alongside the existing `*-on-dark` family and use it for accent
   text on carbon. Invisible to the light-theme page; fixes 45 of the 49.
2. For the accent-filled control, either use `--accent-hi` as the fill (keeps cream text, keeps the
   colour family) or switch its text to a carbon ink. Both change how the primary CTA looks.
3. Raise the muted grey on `/en/about` to `--color-ink-3`.

> **BLOCKED — design decision.** (2) changes the appearance of the primary conversion control.
> Picking a new value for a brand colour is the owner's call, not something to land unilaterally.
> (1) and (3) are safe and can be applied on request.

Not covered by axe and checked separately: skip link, focus visibility across twenty consecutive
tab stops, form error focus management (`journeys.spec.ts`), and that no section is left invisible
under reduced motion (`reduced-motion.spec.ts`).

---

## F. Verification gates

| Gate                            | Result                                                      |
| ------------------------------- | ----------------------------------------------------------- |
| `pnpm typecheck`                | **Pass**                                                    |
| `pnpm lint`                     | **Pass**                                                    |
| `pnpm test`                     | **Pass** — 174 tests, 13 files (was 167/12)                 |
| `pnpm build`                    | **Pass** — compiled, 40 routes prerendered                  |
| `pnpm perf:budget`              | **Pass** — every route inside budget, both locales          |
| `pnpm csp:check`                | **Pass** — 12 combinations, no console errors               |
| `pnpm preflight`                | **Fail** — Redis round trip (§B). Everything else passes    |
| `pnpm test:e2e` — journeys      | **Pass** on the routes exercised                            |
| `pnpm test:e2e` — accessibility | **Fail** — 49 contrast violations (§E)                      |
| `pnpm format:check`             | **Fail** — 10 files, all failing before this work began     |
| `marketing-check`               | **Pass** — both film rails, six viewports, both locales     |
| `form-check`                    | **Pass** — 132/132 (last run before this session's changes) |

`format:check`'s ten files are generated drizzle snapshots and older harness scripts that nothing
in this work touches. Reformatting them would bury real diffs in unrelated churn; CI reports it as
a warning with that reason attached.

---

## G. Not done

Stated plainly rather than implied by omission. From the brief:

- **Phase 3 (conversion and IA)** — no section was removed or restructured, project detail pages
  were not rebuilt into case-study form, and no reference-lookup page was added.
- **Phase 4 (trust)** — `docs/BUSINESS-EVIDENCE-NEEDED.md` was not written. The existing policy of
  refusing to invent testimonials, certifications and contact details is intact and untouched.
- **Phase 5 (UI refinement)** — beyond the contrast findings above, no visual changes.
- **Phase 6 (analytics)** — no analytics abstraction, no Web Vitals reporting, no error monitoring.
- **Phase 9 (SEO)** — metadata, hreflang, sitemap and JSON-LD were not audited. `journeys.spec.ts`
  asserts the canonical link on project routes; that is all.
- **Docs** — `PRODUCTION-UX-REQUIREMENTS.md`, `CONVERSION-FUNNEL.md`, `ANALYTICS-EVENTS.md`,
  `BUSINESS-EVIDENCE-NEEDED.md` and `PERFORMANCE-BUDGET.md` were not written. The budget itself is
  executable in `scripts/perf-budget.mjs`, with every threshold's justification in its header.
- **Data retention rules** were not written down. No production row was read, modified or deleted
  at any point.

---

## H. Commits

| Hash      | What                                                             |
| --------- | ---------------------------------------------------------------- |
| `5320342` | Adaptive motion; Redis URL shape validation                      |
| `039dcda` | Rate-limiter crash fix; preflight; CSP and security headers      |
| `63edd08` | Formatting of files this session touched                         |
| `e191964` | Bounded lead notification; notification outcome recorded; `0002` |
| `b36318d` | Playwright config, E2E + accessibility suites, budget gate, CI   |

Not pushed, as instructed. `main` is 5 commits ahead of `origin/main`.

Migration `0002_notification_outcome` was applied to the configured Supabase database — two
additive nullable columns. No destructive migration was run and no row was deleted.

## I. Artefacts

- `.perf/baseline-before.json`, `.perf/baseline-after-motion.json` — raw measurements
- `.e2e/report` — Playwright HTML report; traces and video for failures under `.e2e/results`
- `scripts/baseline.mjs`, `perf-budget.mjs`, `preflight.mjs`, `csp-check.mjs`,
  `unsent-notifications.mjs` — all re-runnable
