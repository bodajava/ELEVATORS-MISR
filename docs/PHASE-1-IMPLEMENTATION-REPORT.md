# Phase 1 — Conversion & Infrastructure Implementation Report

**Date:** 2026-08-08 · **Scope:** `/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS`
**Preceded by:** [`FULL-PROJECT-AUDIT.md`](FULL-PROJECT-AUDIT.md) (2026-08-07) — see its §20 addendum.

This phase turned the site's stated primary conversion from a placeholder into a working path: a
visitor can now request a site inspection in either language, and the request is validated,
rate-limited, screened for automation, persisted, and answered with a reference they can quote.

Everything claimed below was observed — a command's exit code, a unit test, or a browser
measurement. Where something was not verified, or could not be, it says so.

---

## 1. Verification summary

| Check                                                   | Result                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| `pnpm typecheck`                                        | **exit 0**                                                     |
| `pnpm lint`                                             | **exit 0**                                                     |
| `pnpm test`                                             | **exit 0** — 72 tests, 5 files                                 |
| `pnpm build`                                            | **exit 0** — 40 route entries prerendered                      |
| `pnpm verify` (all four, in order)                      | **exit 0**                                                     |
| `scripts/form-check.mjs` — EN/AR × 1440×900 and 390×844 | **138 / 138 checks passed**                                    |
| `scripts/hero-check.mjs` — 1440×900 and 390×844         | Geometry identical to the frozen baseline; **0 GSAP warnings** |
| Fail-closed: production build, `DATABASE_URL` unset     | Refuses; no reference shown; typed values retained             |

---

## 2. The hero freeze held

Confirmed with `git diff` against the baseline commit — every frozen path is **byte-identical**:

| Path                                               | State                          |
| -------------------------------------------------- | ------------------------------ |
| `src/components/sections/hero.tsx`                 | **unchanged**                  |
| `src/components/sections/hero-instruments.tsx`     | **unchanged**                  |
| `src/components/media/hero-video.tsx`              | **unchanged**                  |
| `scripts/hero-check.mjs`                           | **unchanged**                  |
| `tests/unit/media.test.ts`                         | **unchanged**                  |
| `src/content/generated/media-manifest.json`        | **unchanged**                  |
| `public/media/videos/hero-panorama-showroom-*.mp4` | **unchanged**                  |
| `assets/VIDOES/HERO-VDUE/IMG_9128.MP4`             | **unchanged**, 7,676,103 bytes |

Measured geometry, re-run against a fresh production build, matches the frozen numbers exactly:

| Viewport | initial      | mid-scroll      | final       | full-bleed | copy overlap |
| -------- | ------------ | --------------- | ----------- | ---------- | ------------ |
| 1440×900 | 512×289, −6° | 742×386, −2.46° | 893×436, 0° | no         | 0px          |
| 390×844  | 241×130, −4° | 311×159, −1.64° | 358×175, 0° | no         | 0px          |

z-order remains 30 / 20 / 10; the video remains autoplay + muted + loop + playsInline; reduced
motion still produces 0 pin-spacers.

**One near-miss worth recording.** A `prettier --write` pass added a trailing newline to
`src/content/generated/media-manifest.json`. No data changed, but it broke byte-identity with the
frozen baseline, so it was reverted with `git checkout` and `src/content/generated/` was added to
`.prettierignore` — the file is written by `scripts/build-media.mjs` and nobody edits it by hand.

### The burned-in brand name

`assets/VIDOES/HERO-VDUE/IMG_9128.MP4` carries **"ARAB EGYPT FOR ELEVATORS"** burned into the
picture, legible at every scroll position. That is the company's letterhead name, not the site's
English brand name — which appears in the header a few inches above it, reading "Egypt Elevators".

Per instruction this is a **known, accepted issue**. The clip was not replaced, edited, re-encoded
or rejected. It is documented here, in the README's open items, and in audit §20.6, and it should
not be "fixed" without a new decision.

---

## 3. What was built

### 3.1 Git baseline

Repository initialised on `main`. Baseline commit **`0b28e01`** — `chore: establish verified
project baseline` — 560 files, 51,095 insertions, including the completed and verified hero.
No remote was added and nothing was pushed.

`.gitignore` was hardened before staging: build output, caches, runtime logs, local databases and
dumps, Playwright artefacts, private keys, every `.env*` except `.env.example`, the harness capture
directories, `.claude/settings.local.json`, and `/reference/private/` (which holds the company work
record with client names and addresses).

Everything staged was scanned for private keys, cloud credentials, provider tokens and connection
strings with embedded passwords. **Two hits, both false positives**: the URL fragment
`…task-based-asynchronous-programming` in two Microsoft-docs links inside a design-skill CSV matches
an `sk-…` pattern. No secret was staged. No `.env` file exists anywhere in the tree.

**`assets/` (187 MB, 75 files) is deliberately untracked.** It is a read-only drop that nothing in
the repository ever writes to, and committing it would make every clone a permanent 187 MB download
with no way to undo it short of a history rewrite. The 27 MB of web derivatives in `public/media/`
**is** tracked, so a fresh clone builds, tests and deploys without the originals present. The
reasoning is written into `.gitignore` itself. If you would rather track the originals, use Git LFS.

> **Action needed from you.** The commit was authored as
> `bodajava <bbido761@gmail.com.com>` — the configured `user.email` has a duplicated `.com` and is
> not a deliverable address. It was used as configured rather than silently replaced. To correct it
> and re-stamp the baseline:
>
> ```bash
> git config --global user.email "bbido761@gmail.com"
> git commit --amend --reset-author --no-edit
> ```

All Phase 1 work described below is **uncommitted and visible in `git status`**, as instructed.

### 3.2 Environment configuration

Every `process.env` access in the repository was audited: four sites, of which one
(`NEXT_PUBLIC_SITE_URL`) is genuinely configurable and three are `NODE_ENV` guards.

- **`.env.example`** — every variable, with placeholder shapes and a note on when each is needed.
- **`src/lib/env.ts`** — `server-only`, validated **lazily at first use, never at import**. That
  matters: this project prerenders 40 routes at build time, and a module that threw on import for a
  missing `DATABASE_URL` would make `pnpm build` depend on production credentials.
- **README** rewritten from the `create-next-app` default: commands, environment table, stack,
  layout, motion rules, the binding content policy, and the open items.

`RATE_LIMIT_SALT` is required in production and falls back to an ephemeral per-process value in
development, so a fresh clone runs without configuration.

### 3.3 Homepage JSON-LD

The homepage previously emitted none. It now emits a locale-aware three-node graph —
**Organization + WebSite + Service** — cross-referenced by `@id` so the three are one entity rather
than three companies that share a name, and so the About and project pages point at the same
Organization node.

Locale-aware throughout: `inLanguage` is `en` or `ar-EG`, URLs carry the locale, the Service
description is written in each language, and the `WebSite` `@id` is locale-scoped because the two
homepages are separate documents with separate canonicals.

Deliberately absent, and asserted absent by tests: `priceRange`, `offers`, `AggregateRating`,
`review`, `telephone`, `email`, `PostalAddress`, `LocalBusiness`. No `SearchAction` either — there
is no site search, and declaring one that 404s produces a broken sitelinks searchbox.

### 3.4 Persistence — provider-neutral PostgreSQL

`postgres` driver over a standard connection string, `drizzle-orm/postgres-js`. **No provider SDK.**
Point `DATABASE_URL` at local Postgres, Neon, Supabase, RDS or Cloud SQL and it works unchanged.

- `src/lib/db/schema.ts` — one table, four enums, plain PostgreSQL. Stores name, phone (E.164),
  area, setting, finish, notes, locale, `consented_at`, status, timestamps. **Not** stored: IP
  address, user agent, referrer, session id — all personal data under Egypt's PDPL with no
  operational purpose here.
- `src/lib/db/client.ts` — lazy, cached on `globalThis` so Next's dev server does not exhaust the
  connection limit across edits; `onnotice` silenced because every row is personal data.
- `src/lib/db/inspection-repository.ts` — a narrow `InspectionStore` interface.
- `drizzle/0000_inspection_requests.sql` + snapshot + journal, generated by `drizzle-kit`.
- `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio`.

**The development fallback, and its limit.** With no `DATABASE_URL` and a non-production build, an
in-memory store stands in so a fresh clone can exercise the whole submit → confirmation path. In
**production** an unset `DATABASE_URL` makes the form **refuse** — the visitor is told plainly that
nothing was recorded. Accepting a lead into a variable that dies with the process, while showing a
confirmation, is the exact failure this is built to prevent. Verified in a production build.

### 3.5 Shared Zod validation

`src/lib/inspection/schema.ts` — one schema, used by the browser and re-run in full by the server
action against raw `FormData`. Client validation is treated as decoration.

Issues carry stable machine keys (`phone.invalid`) rendered per locale by `messageFor`, so the two
runtimes produce identical text and no translation lookup leaks into the server action's import
graph.

Phone handling is the substantive part. Accepted: `01012345678`, `+201012345678`,
`00201012345678`, `201012345678`, and all of those with spaces, hyphens or parentheses — **and
Eastern Arabic numerals (٠–٩)**, which is what an Arabic keyboard produces. Everything normalises to
E.164 (`+201XXXXXXXXX`), so one person is one row however they typed it. Landlines, unallocated
prefixes and wrong lengths are rejected.

Consent is `z.literal(true)` and required: under Egypt's PDPL a phone number is personal data, and
an unticked box is not consent. `consented_at` is a real column so a deletion request can be
answered with evidence.

**No email field.** The site's permitted contact paths are a closed list and email is not on it;
collecting an address would imply a reply channel that does not exist.

### 3.6 Honeypot

Two independent traps in `src/lib/inspection/honeypot.ts`:

1. **A decoy field** (`company-website`) — plausible to a bot, meaningless to a person. Any value
   at all is a rejection; whitespace alone is not.
2. **A time-of-render check** — a submission arriving faster than 3s did not come from someone who
   read the labels. Forms older than 12h are treated as replays. Client clock skew up to 60s is
   tolerated, because a phone running slightly fast is not the visitor's fault.

The decoy is **not** `display: none` — that is the first thing a competent bot filters on. It is
off-canvas inside an `aria-hidden`, zero-opacity wrapper with `tabIndex={-1}` and
`autoComplete="off"`, so it is a present, laid-out input to naive automation and invisible and
unreachable to a person. A password manager filling it would fail a real visitor; `autoComplete`
prevents that.

A tripped honeypot returns **success with a reference that was never stored**. Telling a bot it was
detected is free tuning feedback.

### 3.7 Rate limiting

`RateLimiter` is a three-line interface with a swappable implementation, installed via
`setRateLimiter()`. The default is a fixed-window counter in process memory: **5 submissions per
address per 10 minutes**, bounded at 10,000 keys and failing closed under key-flood pressure.

The seam is the point, and the honest limitation is documented in the file: an in-memory limiter
does not hold across instances, so on serverless N instances means N × the limit. Moving to
Redis/Upstash is one adapter and one call in `instrumentation.ts`; the exact code is in a comment at
the bottom of `rate-limit.ts`, and no call site changes.

Keys are **HMAC-SHA256 of the client address** under `RATE_LIMIT_SALT`, truncated. The limiter needs
to tell requesters apart; it does not need to know who they are, so nothing here or in any future
Redis ever holds an IP. An unknown address collapses to one shared bucket rather than bypassing the
limiter — "unknown" must not mean "unlimited".

### 3.8 Public reference numbers

Format `EE-XXXX-XXXX` from a 30-symbol alphabet (Crockford base32 minus `U`, `0`, `1`) — no
character that is ambiguous read aloud or handwritten. 30⁸ ≈ 6.6 × 10¹¹, generated with
`crypto.randomInt`, never sequential and never time-derived: a sequential reference would tell
anyone holding one roughly how many leads exist and let them enumerate their neighbours. The
internal row id is a UUID and never reaches the browser.

`canonicaliseReference` accepts a reference read back sloppily — lowercase, spaces, no separator,
prefix missing — and rejects anything containing an excluded symbol rather than guessing at it.
The unique index is the authority on collisions; the repository retries rather than trusting the
arithmetic.

### 3.9 The form

`/en/contact` and `/ar/contact` — a real `<form action={serverAction}>`. It submits, validates and
returns errors with JavaScript disabled; `useActionState` upgrades that to an in-place update.
Nothing is a `fetch` in an `onSubmit` handler.

Fields: name, phone, area (required); space type and finish (radio groups, defaulting to a genuine
"not decided" rather than forcing a guess); free-text notes; consent. Accessibility is enforced in
`src/components/forms/field.tsx` rather than at each call site: real `<label htmlFor>`, hint and
error both wired through `aria-describedby`, `aria-invalid` on failure, `role="alert"` on messages,
44px minimum targets, and errors that are never colour-only.

The Arabic page mirrors entirely through logical properties — but the phone input is forced
`dir="ltr"`, because an RTL phone number renders its digit groups in the wrong order.

---

## 4. Two defects found by browser verification, after everything else passed

Both survived typecheck, lint, 72 unit tests and a clean production build. They were caught only by
driving the real UI, and they are the reason this phase's verification was worth building.

### N-1 — Silent lead loss (critical)

The honeypot's render timestamp was set imperatively on an **uncontrolled** input. When a
submission came back with validation errors, React re-rendered the form and reset that input to its
`defaultValue`. The visitor's **corrected second attempt** then carried an empty timestamp, which
the honeypot read as malformed — so it was silently discarded behind a success panel showing a
reference that was never stored.

Every visitor who mistyped anything would have lost their enquiry, and the site would have shown
them a confirmation for it.

The harness only caught this because it correlates the reference on screen against the server's own
log. A naive UI test sees a green confirmation in both cases and proves nothing — a honeypot that
fakes success makes ordinary form testing lie, which is now documented at the top of
`scripts/form-check.mjs`.

**Fixed:** the value is controlled via `useSyncExternalStore` (the sanctioned way to read a
client-only value — it cannot be computed during render, since `Date.now()` would differ between
prerendered HTML and hydration). `useState` in an effect was tried first and correctly rejected by
`react-hooks/set-state-in-effect`.

### N-2 — Rejected submissions wiped the form (high)

Same root cause, different symptom, and visible in the first captured screenshot: a failed
validation reset **every** field, so correcting one bad digit meant retyping all six.

**Fixed:** the action echoes the submitted values back in every failure state and each control
seeds its `defaultValue` from them. A check now asserts the typed values survive rejection.

### N-3 — Missing salt rendered the error boundary (medium)

`RATE_LIMIT_SALT` is required in production, and its absence threw out of the server action and
surfaced the page-level error boundary — a deployment mistake presented to visitors as a broken
website.

**Fixed:** caught and converted to a fail-closed "your request was not recorded" state, loud in the
logs. Accepting submissions with the limiter disabled was never an option.

---

## 5. Tests

72 unit tests across 5 files, up from 21. The new ones go after the rules, not the happy path.

| File                                     | Covers                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/inspection-schema.test.ts`   | Phone normalisation across 8 written forms, Eastern Arabic numerals, all 4 mobile prefixes, landline/junk rejection, trimming, whitespace-only rejection, consent, enum vocabulary matching the DB enums, length caps, bilingual messages, one-message-per-field, and a scan of all form copy for prices / response times / WhatsApp                                       |
| `tests/unit/inspection-security.test.ts` | Honeypot: all four trip reasons, the human-speed pass, boundary cases, clock skew. References: shape, excluded symbols, 5,000 collision-free, alphabet coverage, sloppy round-trip, rejection. Rate limiter: budget, per-key isolation, window reset, replaceability. Keys: stability, that the address never appears in the key, scope separation, unknown-address bucket |
| `tests/unit/seo-schema.test.ts`          | Node types and order, `inLanguage` per locale, `@id` cross-references, locale-scoped `@id`, locale in URLs, absence of price/offer/rating/review, absence of telephone/email/address/LocalBusiness, no empty `sameAs`, `</script` safety                                                                                                                                   |

`server-only` is aliased to a stub in `vitest.config.mts` — the real package throws by design
outside a React Server Components graph, which would otherwise make every guarded module
untestable. The guard stays real for the application.

**Two test expectations of mine were wrong and the code was right**, corrected rather than
accommodated: Egyptian E.164 drops the trunk zero (`+201012345678`, not `+2001012345678`), and the
reference alphabet is 30 symbols, not 31.

---

## 6. Browser verification

`scripts/form-check.mjs` — **138/138 checks**, across `en` and `ar` at 1440×900 and 390×844.

Per locale and viewport: the form renders, all 7 controls are present, direction is correct, no idle
live region, the decoy is present-but-invisible and outside the a11y tree and not `display: none`,
every control has a real label, the submit button is not covered by a fixed overlay, no WhatsApp, no
price, no response-time promise, no `tel:` link, invalid submissions are marked `aria-invalid` with
messages in the right language and produce no reference, typed values survive rejection, a genuine
submission succeeds **and is confirmed present in the store**, the confirmation promises no response
time, and there are zero console errors across the whole flow.

Plus: a machine-speed submission is shown a confirmation and **is not stored**; a filled decoy is
shown a confirmation and **is not stored**; the rate limiter accepts 5 and refuses the 6th; and a
rate-limited visitor gets a plain message rather than a false confirmation.

Two harness bugs were fixed along the way, both worth noting because they would silently pass a
broken form: Next's development overlay keeps a permanent empty `role="alert"` node in the document,
so an unscoped wait for "a response" resolved instantly and every later assertion read the page as
it was _before_ the round trip; and Lenis owns the scroll position, so Playwright's `.click()`
chases a moving target under the fixed header forever.

**Screenshots** (absolute paths):

```
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-en-1440x900-empty.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-en-1440x900-invalid.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-en-1440x900-success.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-en-390x844-empty.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-en-390x844-invalid.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-en-390x844-success.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-ar-1440x900-empty.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-ar-1440x900-invalid.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-ar-1440x900-success.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-ar-390x844-empty.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-ar-390x844-invalid.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-ar-390x844-success.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-rate-limited.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-production-no-database.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.form-check/form-check.json

/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.hero-check/hero-1440x900-initial.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.hero-check/hero-1440x900-mid-scroll.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.hero-check/hero-1440x900-final.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.hero-check/hero-390x844-initial.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.hero-check/hero-390x844-mid-scroll.png
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.hero-check/hero-390x844-final.png
```

---

## 7. Files

**Added (23)**

```
.env.example
drizzle.config.ts
drizzle/0000_inspection_requests.sql
drizzle/meta/0000_snapshot.json
drizzle/meta/_journal.json
scripts/form-check.mjs
src/app/[locale]/contact/actions.ts
src/components/forms/field.tsx
src/components/forms/inspection-form.tsx
src/content/inspection.ts
src/lib/db/client.ts
src/lib/db/inspection-repository.ts
src/lib/db/schema.ts
src/lib/env.ts
src/lib/inspection/honeypot.ts
src/lib/inspection/rate-limit.ts
src/lib/inspection/reference.ts
src/lib/inspection/schema.ts
tests/stubs/server-only.ts
tests/unit/inspection-schema.test.ts
tests/unit/inspection-security.test.ts
tests/unit/seo-schema.test.ts
docs/PHASE-1-IMPLEMENTATION-REPORT.md
```

**Modified (9)**

```
.gitignore              hardened; assets/ and capture dirs excluded, with reasoning
.prettierignore         src/content/generated/ — generated, formatting it creates spurious diffs
README.md               rewritten from the create-next-app default
package.json            db:generate / db:migrate / db:push / db:studio
vitest.config.mts       server-only alias, import.meta.dirname
docs/FULL-PROJECT-AUDIT.md   §20 addendum + supersession notice
src/app/[locale]/page.tsx     homepage JSON-LD
src/app/[locale]/contact/page.tsx  placeholder box → the form
src/lib/seo/schema.ts   webSiteSchema + homePageSchema
```

---

## 8. Limitations of this verification — read this before deploying

- **No PostgreSQL was exercised.** No local Postgres is installed and the Docker daemon is not
  running, so the schema, migration and repository were verified by generation, typecheck and unit
  test — **not** against a live database. The first `pnpm db:migrate` against a real instance is
  still unproven. The `postgres` path in `inspection-repository.ts` has not executed.
- **The happy path was verified against the development server.** A production build inlines
  `NODE_ENV=production`, which correctly disables the in-memory fallback — so with no database the
  production build can only be verified to _refuse_, which it does. The success path therefore ran
  against `next dev` with the memory store. Both are real servers, real server actions and a real
  browser; neither is a production build talking to a real database.
- **The in-memory rate limiter is single-process.** Correct for `next start` on one machine, wrong
  for serverless. Swap it before deploying to a multi-instance platform.
- **Nobody is notified of a lead.** Requests are persisted; no email is sent. The env vars are
  declared and documented, and that is all.
- **`pnpm test:e2e` still fails** — there is no `playwright.config.*`. The verification here runs
  through `scripts/*.mjs` harnesses, which are real browser tests but are not `playwright test`.

---

## 9. Open items for you

1. **Fix the git author email** and amend the baseline (commands in §3.2).
2. **Provide a `DATABASE_URL`** and run `pnpm db:migrate` — until then the form refuses in
   production, by design.
3. **Set `RATE_LIMIT_SALT`** in production (`openssl rand -base64 32`).
4. **Decide on the burned-in "ARAB EGYPT FOR ELEVATORS" text** in the hero video. Accepted for now.
5. **Confirm a phone number** if you want the call path; it does not ship until you do.
6. **Confirm the form fields** are the ones you want. Name, phone and area are required; space
   type, finish and notes are optional; there is no email field, deliberately.
7. **Decide whether `assets/` should be tracked** in Git LFS, or backed up outside the repository.

---

## 10. Not started, by instruction

Global 20% image reduction · nine-project presentation · `GENERALIMGA` gallery ·
`PHOTO WITH ACTORS` gallery · marketing-video slider · Show Product videos ·
full media manifest reconstruction.
