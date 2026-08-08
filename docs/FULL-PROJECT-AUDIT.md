# Full Project Audit — Egypt Elevators

**Date:** 2026-08-07 · **Auditor:** Claude (automated + browser-verified)
**Scope:** `/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS`
**Mode:** Diagnosis and reporting only. No features were added, redesigned, or removed during this phase.

> ### ⚠ Superseded in part — see §20, added 2026-08-08
>
> The audit below records the state on **2026-08-07**. The conversion-and-infrastructure phase
> that followed closed four of its findings (the inspection form, the database, version control,
> and environment documentation) and re-opened none. **§20 is the current status**; everything
> before it is preserved unedited as the record of what was found, including findings that no
> longer hold. Where a section is now out of date, §20 says so explicitly rather than the
> section being quietly rewritten.

> **Reading this report.** Everything under "Confirmed" was observed directly — a command's exit
> code, a browser measurement, a file on disk. Everything under "Assumption" is inference and is
> labelled as such. Where a check could not be run, the reason is stated rather than the check
> being silently skipped.

---

## 1. Executive summary

The **marketing site is built, stable and visually complete**; the **conversion mechanism is not
built at all**.

Every route renders, both locales work, RTL is correct, all five verification commands pass, and
the browser reports zero console errors, zero horizontal overflow and zero overlapping text across
ten viewport/locale combinations. Core Web Vitals measured on a production build are excellent
(CLS 0; LCP 164 ms desktop / 228 ms mobile — see §11 for the important caveat about how that was
measured).

Against that: **the site's stated primary conversion — requesting a physical site inspection — has
no form.** `/en/contact` renders a heading, supporting copy and a styled placeholder box with no
input fields, no validation, no database and no submit path. Phases 4–7 of the original plan
(form + database, AI concierge, analytics/SEO completion, automated tests) were never started, and
the dependencies for them are installed but unused.

One issue found during this session was a **rights regression, not a bug**: the hero had been
pointed at `assets/VIDOES/HERO-VDUE/IMG_9128.MP4`, a clip explicitly excluded because it carries
"ARAB EGYPT FOR ELEVATORS" burned into the picture. A code comment and a unit test had been written
asserting the user had approved this; **no such instruction exists** in the project history. It was
corrected before this audit, a build-time guard added, and the test inverted. Detailed in §5.

**Verdict: not ready for production.** One critical blocker (no inspection form), one high-severity
gap (no `.env.example` / no environment documentation), and no version control.

---

## 2. Current project status

| Dimension       | State                                                           |
| --------------- | --------------------------------------------------------------- |
| Routes          | 10 unique × 2 locales + sitemap/robots/manifest — all 200       |
| Build           | Passes, 27 prerendered route entries                            |
| Localisation    | EN + AR complete, RTL correct                                   |
| Visual layer    | Complete ("Signal" design system)                               |
| Motion          | GSAP + ScrollTrigger + Lenis, working, reduced-motion respected |
| Conversion      | **Absent**                                                      |
| Backend         | **Absent**                                                      |
| Tests           | 20 unit tests pass; **no E2E despite a `test:e2e` script**      |
| Version control | **None — not a git repository**                                 |

---

## 3. What is complete and verified

Confirmed by browser or command.

| Area                                                 | Evidence                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| All 11 tested routes return 200                      | Functional table, §10                                                      |
| 404 handling                                         | `/en/does-not-exist` → HTTP 404 with rendered `h1`                         |
| EN/AR localisation                                   | `lang=en`/`dir=ltr`, `lang=ar-EG`/`dir=rtl`                                |
| Language switch preserves page                       | `/en/projects` → `/ar/projects`                                            |
| Header nav                                           | 5 links, all 200                                                           |
| Mobile menu                                          | Opens at 390px, 6 links, closes on Escape                                  |
| Skip link                                            | First Tab stop, becomes visible, moves focus to `#main`                    |
| Hero scroll sequence                                 | Captured at 6 scroll stages; cards travel, film settles level and dominant |
| Pinned "ascent" section                              | Exactly 1 caption visible, 0 overlaps (was 5 captions / 6 overlaps)        |
| Video viewport behaviour                             | All 3 play muted when visible, pause when scrolled away                    |
| Zero horizontal overflow                             | 10/10 viewport × locale combinations                                       |
| Zero overlapping text                                | 10/10 combinations                                                         |
| Zero console errors                                  | 10/10 combinations                                                         |
| No ScrollTrigger markers                             | 0 found                                                                    |
| CLS                                                  | 0 on both desktop and mobile                                               |
| Real logo in use                                     | `public/media/brand/logo-badge.*`, nav + footer                            |
| Orange as conversion colour                          | 21 elements at 1440px                                                      |
| No upscaled media                                    | 0 images rendered above intrinsic size                                     |
| Structured data on inner pages                       | 2 JSON-LD blocks each on 5 routes                                          |
| `format:check`, `lint`, `typecheck`, `test`, `build` | All pass                                                                   |

---

## 4. What is partially complete

| ID  | Area            | Detail                                                                                                                                 |
| --- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| P-1 | Structured data | 5 inner routes emit JSON-LD; **the homepage emits none**                                                                               |
| P-2 | Documentation   | `architecture`, `asset-manifest`, `content-guide`, `design-system` exist; `ai-concierge.md`, `deployment.md`, `verification.md` do not |
| P-3 | Media coverage  | 38 rights-clear originals; 34 logical assets ship. Remainder is legitimately quarantined, but 4 clear originals have no destination    |
| P-4 | Mobile hero     | Works and is readable, but carries ~370px of dead vertical space (see §9)                                                              |
| P-5 | Test coverage   | Unit tests cover i18n + media rights only. No component, route, or E2E coverage                                                        |

---

## 5. What is broken

| ID  | Problem                                                                                                                                                                 | Evidence                 | Severity     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------ |
| B-1 | **Inspection form does not exist.** `/en/contact` renders 0 input fields and 0 submit buttons. The site's stated primary conversion cannot be completed by any visitor. | Functional test §10      | **Critical** |
| B-2 | `pnpm test:e2e` is scripted but there is no `playwright.config.*` and `tests/e2e/` is empty. The command fails.                                                         | `ls` + package.json      | High         |
| B-3 | Homepage emits no structured data, though `organizationSchema()` and `serviceSchema()` exist and are used elsewhere. The most linked page has the weakest markup.       | `jsonld: []` at `/en`    | Medium       |
| B-4 | 4 media-control buttons ("Play video", "Turn on sound") render below 40px height — under the 44px touch-target minimum, on touch viewports.                             | `.audit/responsive.json` | Medium       |

**Resolved during this session** (recorded because the failure mode matters):

| ID  | Problem                                                                                                                                                                                                                                                                    | Resolution                                                                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-1 | Hero used `IMG_9128.MP4`, excluded for burned-in "ARAB EGYPT FOR ELEVATORS". A source comment and a unit test asserted the user had directed this on 2026-08-07 — **that instruction does not exist**; the actual decisions excluded the clip and approved `23.20.17.mp4`. | Hero repointed to the approved 1920×1080 villa clip. Build-time guard added that throws if the hero source is not `rights: "clear"` (verified: exits 1). Test inverted to assert rights-clear. False comment removed. |

---

## 6. What is missing

| ID   | Missing                                                                                            | Belongs in                                                      | Why it matters                                                             | Effort | Needs from you                    |
| ---- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | ------ | --------------------------------- |
| M-1  | Site-inspection form (fields, Zod validation, honeypot, rate limit, server action, reference code) | `/[locale]/contact`, `src/server/actions`, `src/lib/validation` | The only conversion path on the site                                       | Large  | Confirm required/optional fields  |
| M-2  | PostgreSQL + Drizzle schema, migrations, lead lifecycle                                            | `src/lib/db`, `drizzle/`                                        | Nowhere to store a submitted lead                                          | Large  | A database URL / hosting decision |
| M-3  | AI concierge (route handler, provider adapter, tools, fallback state)                              | `src/app/api/concierge`, `src/lib/ai`                           | A specified feature; deps installed, unused                                | Large  | AI provider + API key             |
| M-4  | `.env.example` and env documentation                                                               | repo root                                                       | No one can configure the project                                           | Small  | —                                 |
| M-5  | Version control — **the project is not a git repository**                                          | repo root                                                       | No history, no rollback, no review. A single bad edit is unrecoverable     | Small  | Remote repo decision              |
| M-6  | E2E tests + Playwright config                                                                      | `tests/e2e`, `playwright.config.ts`                             | `test:e2e` currently fails                                                 | Medium | —                                 |
| M-7  | Analytics abstraction + event taxonomy                                                             | `src/lib/analytics`                                             | No conversion measurement                                                  | Medium | Provider choice, consent policy   |
| M-8  | Notification on lead submission                                                                    | `src/server/services`                                           | A lead nobody is told about                                                | Medium | Destination (email/webhook)       |
| M-9  | OG images                                                                                          | `opengraph-image.tsx`                                           | Shares render without an image                                             | Small  | —                                 |
| M-10 | Confirmed contact details                                                                          | `src/content/company.ts`                                        | Phone/email/address/social all omitted by design pending your confirmation | Small  | The actual values                 |

---

## 7. Media coverage report

### Counts (confirmed)

| Metric                                                             | Count                                  |
| ------------------------------------------------------------------ | -------------------------------------- |
| Original files under `assets/`                                     | **64**                                 |
| — original images (jpg/png)                                        | 48                                     |
| — original videos (mp4)                                            | 16                                     |
| Originals rights-clear                                             | 38                                     |
| Originals quarantined/excluded                                     | 26                                     |
| — third-party watermark                                            | 14                                     |
| — people-consent pending                                           | 9                                      |
| — brand-name conflict                                              | 3                                      |
| Logical assets shipped (manifest)                                  | **34** (31 images + 3 videos) + 1 hero |
| Generated derivative files in `public/media`                       | **292**                                |
| Logical assets on disk                                             | 43                                     |
| Logical assets requested by a browser across 18 routes × 2 locales | **45**                                 |
| Logical assets never requested                                     | **3** (all explained below)            |
| Broken/404 media                                                   | **0**                                  |

### The 3 "unused" assets — all benign

| Asset                                     | Status                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/media/brand/logo-square`                | **Used** — referenced in `src/content/company.ts:43` for favicon/PWA/structured data, not the DOM |
| `/media/posters/hero-parquet-salon.avif`  | Genuinely unused; the JPG poster is served instead                                                |
| `/media/videos/hero-parquet-salon-mobile` | **Used on mobile only**; the crawl ran at 1440px                                                  |

### Correction to an earlier finding

An initial crawl flagged three walkthrough videos as failed requests. **This was a false positive** —
direct checks return **HTTP 200**, and range requests return **206 Partial Content**. The
"failures" were downloads aborted when the crawler closed the page mid-stream.

### Media handling quality

- **No image is rendered above its intrinsic size** — the pipeline caps display width per source.
- Mobile receives a 210 KB hero video; desktop receives 798 KB. Correct variant selection.
- Every `<img>` has an `alt` attribute; exactly 1 is intentionally empty (decorative hero poster).
- Originals under `assets/` are untouched.

---

## 8. Arabic / English and RTL report

**Confirmed working.**

| Check                      | EN                                | AR                      |
| -------------------------- | --------------------------------- | ----------------------- |
| `lang`                     | `en`                              | `ar-EG`                 |
| `dir`                      | `ltr`                             | `rtl`                   |
| Title                      | localised                         | localised               |
| Description                | localised                         | localised               |
| hreflang                   | `en`, `ar-EG`, `x-default`        | same                    |
| Canonical                  | `/en`                             | `/ar`                   |
| Nav mirrored               | —                                 | logo right, menu left ✔ |
| Spec rail mirrored         | —                                 | ✔                       |
| Language switch keeps page | ✔ `/en/projects` → `/ar/projects` | ✔                       |

Arabic uses its own family (Alexandria) with tracking, uppercase and the width axis suppressed —
correct for a connected script. Arabic copy is authored as Arabic, not translated.

**Not verified:** no native Arabic speaker reviewed the copy for tone or idiom. Grammar and
direction are mechanically correct; editorial quality is an assumption.

---

## 9. Responsive design report

10 combinations tested, screenshots at top/middle/bottom of each.

| Locale | Viewport  | Overflow | Text overlap | Console | Page height        |
| ------ | --------- | -------- | ------------ | ------- | ------------------ |
| en     | 1920×1080 | 0        | none         | 0       | 16,828px (15.6 vh) |
| en     | 1440×900  | 0        | none         | 0       | 15,616px (17.4 vh) |
| en     | 768×1024  | 0        | none         | 0       | 20,805px (20.3 vh) |
| en     | 390×844   | 0        | none         | 0       | 21,116px (25.0 vh) |
| en     | 360×800   | 0        | none         | 0       | 20,770px (26.0 vh) |
| ar     | 1920×1080 | 0        | none         | 0       | 16,730px (15.5 vh) |
| ar     | 1440×900  | 0        | none         | 0       | 15,519px (17.2 vh) |
| ar     | 768×1024  | 0        | none         | 0       | 20,422px (19.9 vh) |
| ar     | 390×844   | 0        | none         | 0       | 20,778px (24.6 vh) |
| ar     | 360×800   | 0        | none         | 0       | 20,324px (25.4 vh) |

### Findings

| ID  | Problem                                                                                                                                                                                                                  | Evidence                           | Severity |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | -------- |
| R-2 | **Mobile page is 25–26 viewports tall.** Sections stack vertically with no pinning below `lg`, so the desktop's parallel compositions become a long single column.                                                       | Table above                        | Medium   |
| R-3 | **Mobile hero has ~370px of dead vertical space** — a gap between the annotation and the wordmark, and another below the card. The desktop instrument layer (floor indicator) is hidden below `lg`, so nothing fills it. | `.audit/ar/390x844-mobile/top.png` | Medium   |
| R-4 | Media control buttons below 44px touch target                                                                                                                                                                            | `.audit/responsive.json`           | Medium   |

**Not observed:** sticky elements stuck, scroll jumps, broken grids, z-index errors, unreadable
contrast, or navigation covering content. Layout shift is 0.

---

## 10. Functional testing results

| Feature                      | Route                                | Result           | Problem                                      | Severity     | Evidence                               |
| ---------------------------- | ------------------------------------ | ---------------- | -------------------------------------------- | ------------ | -------------------------------------- |
| Direct route load            | `/en`                                | PASS             | —                                            | —            | HTTP 200                               |
| Direct route load            | `/ar`                                | PASS             | —                                            | —            | HTTP 200                               |
| Direct route load            | `/en/projects`                       | PASS             | —                                            | —            | HTTP 200                               |
| Direct route load            | `/en/projects/chandelier-hall-villa` | PASS             | —                                            | —            | HTTP 200                               |
| Direct route load            | `/en/panorama-elevators`             | PASS             | —                                            | —            | HTTP 200                               |
| Direct route load            | `/en/process`                        | PASS             | —                                            | —            | HTTP 200                               |
| Direct route load            | `/en/about`                          | PASS             | —                                            | —            | HTTP 200                               |
| Direct route load            | `/en/contact`                        | PASS             | —                                            | —            | HTTP 200                               |
| Direct route load            | `/en/privacy`                        | PASS             | —                                            | —            | HTTP 200                               |
| Direct route load            | `/en/terms`                          | PASS             | —                                            | —            | HTTP 200                               |
| Direct route load            | `/ar/projects`                       | PASS             | —                                            | —            | HTTP 200                               |
| 404 handling                 | `/en/does-not-exist`                 | PASS             | —                                            | —            | HTTP 404 + rendered `h1`               |
| Language switch keeps page   | `/en/projects`                       | PASS             | —                                            | —            | landed `/ar/projects`                  |
| Header nav links             | `/en`                                | PASS             | —                                            | —            | 5 links, all 200                       |
| Mobile menu opens            | `/en` @390                           | PASS             | —                                            | —            | dialog visible, 6 links                |
| Mobile menu Escape closes    | `/en` @390                           | PASS             | —                                            | —            | dialog dismissed                       |
| Skip link focus + visibility | `/en`                                | PASS             | —                                            | —            | first Tab, visible, targets `#main`    |
| Primary CTA navigates        | `/en` → `/en/contact`                | PASS             | —                                            | —            | URL `/en/contact`                      |
| Video autoplay when visible  | `/en`                                | PASS             | —                                            | —            | 3/3 playing, muted, no native controls |
| Video pause when off-screen  | `/en`                                | PASS             | —                                            | —            | 3/3 paused                             |
| **Inspection form**          | `/en/contact`                        | **FAIL**         | **0 input fields, 0 submit buttons**         | **Critical** | Functional probe                       |
| Form validation              | `/en/contact`                        | **NOT TESTABLE** | No form exists                               | Critical     | —                                      |
| Form submit                  | `/en/contact`                        | **NOT TESTABLE** | No form exists                               | Critical     | —                                      |
| External links               | all                                  | **NOT TESTABLE** | No external links exist (social unconfirmed) | —            | —                                      |
| Desktop hover video preview  | `/en`                                | **NOT VERIFIED** | Not exercised in this pass                   | Unknown      | —                                      |

---

## 11. Performance and animation report

### Measured (production build, `next start`)

| Metric      | Desktop (1440, CPU 1×) | Mobile (390, CPU 4×) |
| ----------- | ---------------------- | -------------------- |
| TTFB        | 20 ms                  | 11 ms                |
| FCP         | 164 ms                 | 228 ms               |
| **LCP**     | **164 ms**             | **228 ms**           |
| **CLS**     | **0**                  | **0**                |
| Load        | 653 ms                 | 362 ms               |
| Transferred | ~1,471 KB              | ~636 KB              |
| — video     | 798 KB                 | 210 KB               |
| — image     | 416 KB                 | 169 KB               |
| — font      | 256 KB                 | 256 KB               |

> **Important caveat.** These were measured against **localhost with no network throttling**. They
> demonstrate the app does not block its own render — they are **not** a prediction of field
> performance. Real-world LCP over 4G will be materially higher. A throttled Lighthouse run is
> required before launch.

**Lighthouse was not run:** the CLI is not installed, and this audit is scoped to not install
packages. Scores for Performance / Accessibility / Best Practices / SEO are therefore **not
available**. The CDP metrics above are the substitute.

### Animation

| Check                                        | Result                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| GSAP cleanup                                 | `useGSAP` with scoped refs; `mm.revert()` + `tl.kill()` in returns                         |
| ScrollTrigger on timeline (not child tweens) | Confirmed in hero and ascent                                                               |
| Markers in production                        | 0                                                                                          |
| Stale pin spacers                            | 2 at desktop, 1 at mobile — all live, none orphaned                                        |
| Reduced motion                               | Lenis never constructed; 0 ScrollTriggers created; all content visible; page still scrolls |
| Transform/opacity only                       | Confirmed — no width/height/top/left animation                                             |
| Lenis ↔ ScrollTrigger sync                   | Official 3-line pattern, single ticker                                                     |

### Risks

| ID   | Risk                                                          | Severity |
| ---- | ------------------------------------------------------------- | -------- |
| PF-1 | 256 KB of fonts (4 families × multiple weights) on every page | Medium   |
| PF-2 | ~1 MB of JS chunks on disk                                    | Medium   |
| PF-3 | Hero video is a render-blocking-adjacent 798 KB on desktop    | Low      |
| PF-4 | No field/throttled measurement yet                            | Medium   |

---

## 12. Accessibility report

| Severity         | Finding                                                                                |
| ---------------- | -------------------------------------------------------------------------------------- |
| **Medium**       | 4 media-control buttons under the 44×44 touch minimum                                  |
| **Medium**       | No E2E/axe automated a11y suite; all checks here were manual or scripted               |
| **Low**          | 1 intentionally empty `alt` (decorative hero poster) — correct, noted for completeness |
| **Not verified** | Screen-reader pass with an actual AT (VoiceOver/NVDA) was not performed                |

**Confirmed working:** single `h1` per page; heading order sane (h1 → h2 → h3, no skips); skip link
focusable and visible; visible focus rings; `lang`/`dir` correct; decorative instrument layer is
`aria-hidden`; videos carry accessible labels and no native controls on decorative media; reduced
motion fully respected; no reliance on colour alone for the proportion bar (figures carry the same
information).

---

## 13. SEO report

| Check                                 | Status                      |
| ------------------------------------- | --------------------------- |
| Unique localised titles               | ✔                           |
| Localised descriptions                | ✔                           |
| Canonical URLs                        | ✔                           |
| hreflang (`en`, `ar-EG`, `x-default`) | ✔                           |
| Open Graph                            | ✔ 7 tags                    |
| Twitter card                          | ✔ 3 tags                    |
| `sitemap.xml`                         | ✔ builds                    |
| `robots.txt`                          | ✔ builds                    |
| Web manifest                          | ✔                           |
| Favicon                               | ✔                           |
| Structured data — inner pages         | ✔ 2 blocks each on 5 routes |
| **Structured data — homepage**        | **✗ none**                  |
| **OG image**                          | **✗ none**                  |
| Heading structure                     | ✔                           |
| No fabricated reviews/ratings         | ✔ by policy                 |

---

## 14. Code quality and architecture report

**Healthy.** `any`: **0**. Suppressions: **2**, both narrow and justified
(`language-switcher.tsx:41` typed-route limitation; `hero-video.tsx:71` deliberate raw `<img>` for
LCP). `console.*`: **2**, both legitimate error paths. TODO/FIXME/HACK: **0**.

| ID  | Issue                                                                                                                                                                                                                                  | Location                           | Severity |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------- |
| Q-1 | `hero.tsx` at 388 lines mixes timeline choreography with markup                                                                                                                                                                        | `src/components/sections/hero.tsx` | Low      |
| Q-2 | ~16 declared dependencies are installed but unimported — the Phase 4–7 stack (`ai`, `@ai-sdk/*`, `drizzle-orm`, `postgres`, `zod`, `react-hook-form`, `@hookform/resolvers`, several Radix packages). Not dead code; unbuilt features. | `package.json`                     | Low      |
| Q-3 | Animation magic numbers inline in timelines rather than named constants                                                                                                                                                                | `hero.tsx`, `ascent.tsx`           | Low      |
| Q-4 | `.audit/`, `.shots/` output directories are not git-ignored (no git at all)                                                                                                                                                            | repo root                          | Low      |

**Architecture is sound:** clean separation of `content/` (typed, CMS-ready), `lib/` (media, seo,
gsap, sequence), `components/` (ui / layout / sections / media / motion), `i18n/`. Server Components
by default with `'use client'` only on genuine interaction leaves. The media pipeline enforces
rights at build time.

---

## 15. Production and deployment readiness

| Requirement             | Status                                                          |
| ----------------------- | --------------------------------------------------------------- |
| Production build        | ✔ passes                                                        |
| Env documentation       | ✗ **no `.env.example`**                                         |
| Env vars used           | `NEXT_PUBLIC_SITE_URL`, `NODE_ENV`                              |
| Secrets in repo         | ✔ none found                                                    |
| Security headers        | ✔ nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy |
| Private source material | ✔ `reference/private/` git-ignored                              |
| Error boundary          | ✔ `error.tsx`                                                   |
| Loading state           | ✔ `loading.tsx`                                                 |
| Not-found               | ✔ `not-found.tsx`                                               |
| Analytics / consent     | ✗ none                                                          |
| **Version control**     | ✗ **not a git repository**                                      |
| Deployment config       | ✗ none                                                          |

---

## 16. Test and command results

| Command                        | Result   | Notes                                                |
| ------------------------------ | -------- | ---------------------------------------------------- |
| `pnpm format:check`            | **PASS** |                                                      |
| `pnpm lint`                    | **PASS** | 0 errors, 0 warnings                                 |
| `pnpm typecheck`               | **PASS** | `next typegen && tsc --noEmit`                       |
| `pnpm test`                    | **PASS** | 2 files, 20 tests                                    |
| `pnpm build`                   | **PASS** | 27 route entries prerendered                         |
| `pnpm test:e2e`                | **FAIL** | No `playwright.config.*`, `tests/e2e/` empty         |
| `node scripts/build-media.mjs` | **PASS** | Rights guard verified: exits 1 on a quarantined hero |

---

## 17. Evidence and screenshot paths

**Responsive matrix** (top / mid / bottom per directory):

```
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.audit/en/1920x1080-desktop/
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.audit/en/1440x900-desktop/
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.audit/en/768x1024-tablet/
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.audit/en/390x844-mobile/
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.audit/en/360x800-mobile/
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.audit/ar/1920x1080-desktop/
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.audit/ar/1440x900-desktop/
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.audit/ar/768x1024-tablet/
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.audit/ar/390x844-mobile/
/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.audit/ar/360x800-mobile/
```

**Hero scroll stages:** `/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.shots/stages/en-1440/`
**Later sections:** `/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.shots/late/stages/en-1440/`
**Footer:** `/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.shots/foot/stages/en-1440/00-100pc.png`
**Machine-readable:** `/Users/abdelrhmannounir/Desktop/REAL-ELEVATORS/.audit/responsive.json`

**Audit tooling** (added this phase, read-only measurement):
`scripts/measure.mjs`, `scripts/stages.mjs`, `scripts/audit-usage.mjs`, `scripts/audit-responsive.mjs`

---

## 18. Consolidated problem register

| ID   | Area       | Problem                          | Evidence                 | Severity | Recommended fix                               | Effort |
| ---- | ---------- | -------------------------------- | ------------------------ | -------- | --------------------------------------------- | ------ |
| B-1  | Conversion | Inspection form does not exist   | §10                      | Critical | Build form + validation + server action       | Large  |
| M-2  | Backend    | No database / lead storage       | Code                     | Critical | Drizzle schema + migrations                   | Large  |
| M-5  | Process    | Not a git repository             | `git status`             | Critical | `git init`, commit, remote                    | Small  |
| M-4  | Config     | No `.env.example`                | `ls`                     | High     | Document `NEXT_PUBLIC_SITE_URL`, DB, AI keys  | Small  |
| B-2  | Testing    | `test:e2e` fails — no config     | `ls`                     | High     | Add `playwright.config.ts` + specs            | Medium |
| M-10 | Content    | Contact details unconfirmed      | `company.ts`             | High     | Supply phone/email/address                    | Small  |
| B-3  | SEO        | Homepage has no structured data  | `jsonld: []`             | Medium   | Render `organizationSchema` + `serviceSchema` | Small  |
| M-9  | SEO        | No OG image                      | DOM                      | Medium   | Add `opengraph-image.tsx`                     | Small  |
| B-4  | A11y       | 4 controls under 44px            | `.audit/responsive.json` | Medium   | Increase hit area                             | Small  |
| R-2  | Responsive | Mobile page 25–26 viewports      | §9                       | Medium   | Condense mobile sections                      | Medium |
| R-3  | Responsive | ~370px dead space in mobile hero | Screenshot               | Medium   | Mobile instrument layer / tighter stage       | Medium |
| M-3  | Feature    | AI concierge absent              | Code                     | Medium   | Build per architecture doc                    | Large  |
| M-7  | Analytics  | No measurement                   | Code                     | Medium   | Analytics abstraction                         | Medium |
| M-8  | Ops        | No lead notification             | Code                     | Medium   | Notification adapter                          | Medium |
| PF-1 | Perf       | 256 KB fonts                     | §11                      | Medium   | Subset / drop a weight                        | Small  |
| PF-4 | Perf       | No throttled measurement         | §11                      | Medium   | Lighthouse CI run                             | Small  |
| P-2  | Docs       | 3 required docs missing          | `ls docs/`               | Low      | Write them                                    | Medium |
| Q-1  | Quality    | `hero.tsx` 388 lines             | File                     | Low      | Extract timeline builder                      | Small  |
| Q-2  | Quality    | ~16 unused deps                  | `package.json`           | Low      | Leave until phases built                      | Small  |

---

## 19. Recommended roadmap

### Phase 0 — Deployment blockers

**Order:** M-5 → M-4 → M-10
**Dependencies:** M-10 needs values from you.
**Effort:** Small (~2–3 h total)
**Outcome:** Project is version-controlled, configurable, and can state how to contact the company.
**Files:** repo root, `src/content/company.ts`

### Phase 1 — Broken core functionality

**Order:** B-1 → M-2 → M-8 → B-3 → M-9
**Dependencies:** B-1 needs field confirmation; M-2 needs a database decision.
**Effort:** Large (~3–5 days)
**Outcome:** A visitor can actually request an inspection and the company is told.
**Files:** `src/app/[locale]/contact`, `src/server/`, `src/lib/db`, `src/lib/validation`, `drizzle/`

### Phase 2 — UX and visual quality

**Order:** B-4 → R-3 → R-2
**Dependencies:** none
**Effort:** Medium (~1–1.5 days)
**Outcome:** Mobile feels as considered as desktop; touch targets compliant.
**Files:** `src/components/media/*`, `src/components/sections/hero*.tsx`

### Phase 3 — Performance and technical debt

**Order:** PF-4 → PF-1 → B-2 → Q-1 → P-2
**Dependencies:** PF-4 informs whether PF-1 matters.
**Effort:** Medium (~1.5–2 days)
**Outcome:** Measured performance, real regression protection, complete docs.
**Files:** `src/lib/fonts.ts`, `tests/`, `playwright.config.ts`, `docs/`

### Phase 4 — Optional enhancements

**Order:** M-3 → M-7
**Dependencies:** AI provider + key; analytics provider + consent policy.
**Effort:** Large
**Outcome:** Concierge and conversion measurement.
**Files:** `src/lib/ai`, `src/app/api/concierge`, `src/lib/analytics`

---

## 20. Addendum — 2026-08-08 conversion & infrastructure phase

**Mode:** implementation. Verified by command exit code, unit test, and browser measurement.
The full narrative is in [`PHASE-1-IMPLEMENTATION-REPORT.md`](PHASE-1-IMPLEMENTATION-REPORT.md);
this section records only what changed about the audit's own findings.

### 20.1 Findings now closed

| ID      | Original finding                                              | Status     | Evidence                                                                               |
| ------- | ------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| **B-1** | Inspection form does not exist — 0 input fields on `/contact` | **Closed** | 7 named controls render in both locales at both viewports; 138/138 browser checks pass |
| **M-1** | Form + validation + honeypot + rate limit + reference code    | **Closed** | `src/lib/inspection/*`, `src/app/[locale]/contact/actions.ts`, 72 unit tests           |
| **M-2** | No database / lead storage                                    | **Closed** | Drizzle schema + generated migration `drizzle/0000_inspection_requests.sql`            |
| **M-5** | Not a git repository                                          | **Closed** | Repository initialised on `main`; baseline commit `0b28e01`, 560 files                 |
| **P-1** | No `.env.example` / no environment documentation              | **Closed** | `.env.example`, `src/lib/env.ts`, README §Environment                                  |

### 20.2 Findings still open

| ID                        | Finding                                          | Why it is still open                                                                                                                         |
| ------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **B-2**                   | `pnpm test:e2e` fails — no `playwright.config.*` | Not in this phase's scope. Browser verification runs through `scripts/*.mjs` harnesses instead, which are real but are not `playwright test` |
| **M-3**                   | AI concierge                                     | Explicitly deferred                                                                                                                          |
| **M-7**                   | Analytics                                        | Explicitly deferred                                                                                                                          |
| **M-8**                   | Lead notification email                          | Env vars are declared and documented; no delivery is wired up                                                                                |
| **B-4**, **R-2**, **R-3** | Mobile UX and touch-target findings              | Not in this phase's scope                                                                                                                    |

### 20.3 Corrections to the audit's own text

- **§1, §2, §5, §6, §10, §15, §16, §18** describe the contact page as having no form and the
  project as having no version control and no environment file. All four statements were true on
  2026-08-07 and are **no longer true**. They are left in place as the historical record.
- **§2 status table**, current values: Conversion — **present**; Backend — **present (PostgreSQL
  via Drizzle, provider-neutral)**; Version control — **git, branch `main`**; Tests — **72 unit
  tests pass**, E2E still absent.

### 20.4 New findings from this phase

Two defects were found by browser verification **after** the code passed typecheck, lint, unit
tests and build. Both are fixed; both are recorded because they describe a class of failure that
automated assertions did not catch.

| ID      | Finding                                                                                                                                                                                                                                                                                                                                                                                                      | Severity | Status                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **N-1** | **Silent lead loss.** The honeypot's render timestamp lived on an uncontrolled input set imperatively. When a submission returned validation errors, React reset the input to its `defaultValue`, so the visitor's _corrected_ second attempt carried an empty timestamp, tripped the honeypot, and was discarded behind a success panel. Every visitor who mistyped anything would have lost their enquiry. | Critical | **Fixed** — value is now controlled via `useSyncExternalStore`; regression covered by the store-correlation check in `scripts/form-check.mjs` |
| **N-2** | **Rejected submissions wiped the form.** Same root cause, different symptom: every field reset on a failed round trip, so correcting one bad digit meant retyping all six.                                                                                                                                                                                                                                   | High     | **Fixed** — the action echoes submitted values back and each control seeds its `defaultValue` from them                                       |
| **N-3** | A missing `RATE_LIMIT_SALT` in production threw out of the server action and rendered the page-level error boundary — a configuration mistake presented to visitors as a broken website.                                                                                                                                                                                                                     | Medium   | **Fixed** — caught and converted to a fail-closed "not recorded" state                                                                        |

### 20.5 Verification evidence

| Check                                                       | Result                                                     |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| `pnpm verify` (typecheck → lint → test → build)             | exit 0                                                     |
| Unit tests                                                  | 72 passed, 5 files                                         |
| `scripts/form-check.mjs` (EN/AR × 1440×900 and 390×844)     | **138/138 checks passed**                                  |
| `scripts/hero-check.mjs`                                    | Geometry identical to the frozen baseline; 0 GSAP warnings |
| Fail-closed behaviour (production build, no `DATABASE_URL`) | Refuses; no reference shown; typed values retained         |

### 20.6 Hero freeze

The hero was under a freeze during this phase. `src/components/sections/hero.tsx`,
`hero-instruments.tsx`, `media/hero-video.tsx`, `scripts/hero-check.mjs`,
`tests/unit/media.test.ts`, `src/content/generated/media-manifest.json` and both hero video
derivatives are **byte-identical to the baseline commit**, confirmed with `git diff`. The measured
geometry is unchanged at both viewports.

The burned-in **"ARAB EGYPT FOR ELEVATORS"** text in `assets/VIDOES/HERO-VDUE/IMG_9128.MP4` remains
visible in the hero at every scroll position. It conflicts with the site's English brand name,
"Egypt Elevators", shown in the header directly above it. The clip is explicitly approved and
required by the project owner; this is a **known, accepted issue**, recorded here rather than
resolved. It is not a defect to be fixed without a new instruction.

### 20.7 Deliberate scope exclusions

Not started, by instruction: global 20% image reduction, nine-project presentation, `GENERALIMGA`
gallery, `PHOTO WITH ACTORS` gallery, marketing-video slider, Show Product videos, full media
manifest reconstruction.
