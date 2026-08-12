# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Non-negotiable autonomy boundaries

Claude Code is configured to work autonomously inside this project. That autonomy does not expand
the task scope. Never delete or overwrite original files under `assets/`. Never run destructive Git
commands (`git reset --hard`, `git clean`, force-push), push commits, publish/deploy the application,
purchase services, create external accounts, expose secrets, or modify files outside this repository
unless the user explicitly requests that exact action. Prefer reversible changes, inspect targets
before mutations, keep credentials in ignored local environment files, and stop on a genuine business
decision rather than inventing an answer.

## What this repository is

The media asset drop and skill setup for the **Egypt Elevators** marketing website — the English
website brand name for **مصر العربية للمصاعد**, an Egyptian elevator company.

There is **no application code yet**: no source files, no package manifest, no build/lint/test
tooling, no git repository. The only two things here are `assets/` (~190 MB of photos and video) and
`.claude/skills/` (design skills, see below). Do not report build or test commands that don't exist.

The Next.js application has **not** been initialized and website implementation has **not** begun.
Do not scaffold either until the project brief has been received and the work is asked for.

## Product and brand facts (confirmed)

These are confirmed requirements. Treat them as binding; do not restate them as assumptions.

- **Arabic brand name:** مصر العربية للمصاعد
- **English website brand name:** Egypt Elevators
- **Default locale: English.** Arabic is the **secondary** locale and renders **RTL**
  (`dir="rtl"`, logical CSS properties, mirrored layout and icons). Build the layout so direction is
  a per-locale switch, not a global assumption — the default LTR path is the English one.
- **Scope: panorama elevators exclusively.** The site does not sell or market any other elevator
  type. Do not invent adjacent product lines (freight, home lifts, escalators, service contracts)
  to fill out a page.

  **Amended by the owner on 2026-08-12, and only this far.** The owner supplied a company
  statement naming electro-hydraulic and electro-mechanical drives and the buildings the
  company works in — villas, companies, museums, factories — and it ships verbatim in the
  homepage proof section (`proof.lede` in `src/content/home.ts`). The inspection form's "What
  is the space?" question lost "Apartment building" and gained "Factories" in the same
  instruction. Nothing else widened: the site still markets panorama cars and nothing else,
  there is still no second product line, no page has been added, and the rule above continues
  to hold for everything the owner has not named. Do not extrapolate from these two strings.
- **Primary conversion: requesting a physical site inspection.** Every page's primary CTA path
  leads here. Secondary actions (browse gallery, human follow-up form, and — only once a confirmed
  phone number exists — a direct call) must stay visually subordinate. See _Contact and conversation
  policy_ below for the complete, closed list of permitted contact paths.
- **Never display prices or price estimates.** No price tags, no "starting from", no ranges, no
  cost calculators, no pricing tier tables. Pricing follows the site inspection, off-site.
- **Colors are provisional.** The deep navy (`#1B2A5B`-ish) and metallic gold/brass noted below are
  **estimated from the logo image, not confirmed official brand values.** Do not treat them as
  brand truth or bake them into a token system as final; flag them for confirmation before locking.

## Contact and conversation policy (binding)

These rules govern every contact surface on the site — header, hero, footer, gallery, forms, the
concierge, and any component that offers a way to reach the company. They are binding requirements,
not preferences, and they override any pattern suggested by a design skill, a reference site, or a
landing-page template.

- **No WhatsApp anywhere.** No WhatsApp button, floating bubble, icon, `wa.me` / `api.whatsapp.com`
  link, deep link, share target, or mention in copy — on any page, in any locale, in the footer, or
  inside the concierge. If a design source proposes one, drop it rather than adapting it.
- **The permitted contact paths are a closed list of four:**
  1. the **AI concierge** (the on-site assistant),
  2. an **in-site human follow-up form**,
  3. a **site-inspection request**, and
  4. a **direct phone call**, exposed _only_ after a confirmed phone number has been supplied.

  Nothing else. No email address, no contact inbox, no social DM, no third-party chat widget, no
  callback scheduler, no messaging app of any kind, unless the user explicitly adds it to this list.

- **No phone number until one is confirmed.** Do not invent, guess, or copy a phone number from an
  asset, watermark, or screenshot. Until the user supplies a confirmed number, the call path does not
  ship: omit the `tel:` link and its CTA entirely rather than shipping a placeholder. Raise it as an
  open item instead.
- **The AI concierge opens the conversation.** The concierge greets first and starts the exchange —
  the visitor never faces an empty chat waiting for them to type. The opening message leads toward
  the site inspection and obeys every rule in this section (no prices, no WhatsApp, no time promises).
- **"Talk to a human" renders an in-chat contact form.** When a visitor asks for a person, hand off
  by showing the human follow-up form inline **inside the chat** — not a redirect to another page, not
  a phone number dump, not an external link, and never a messaging app.
- **Never promise a response time.** No "we'll reply within 24 hours", no "same-day response", no
  "instant callback", no SLA, no countdown, and no implied urgency of that kind — anywhere in copy,
  form confirmations, success states, concierge messages, or metadata. Confirm that the request was
  received; say nothing about when a reply arrives.

Four further requirements are binding for this work and are specified in full under _Product and
brand facts_ above — restated here so the full set is verifiable in one place:

- **Never display prices or estimates** — no price tags, ranges, "starting from", or calculators.
- **English is the default locale.**
- **Arabic is the secondary locale with complete RTL support** (`dir="rtl"`, logical properties,
  mirrored layout and icons).
- **The site specializes exclusively in panorama elevators** — no adjacent product lines.

## Implementation status

The master project brief was delivered on **2026-08-06** and implementation was authorised. The
earlier hold is lifted. Phase 0 (repository + asset audit, architecture plan, asset manifest, risk
register) is complete — see `docs/architecture.md` and `docs/asset-manifest.md`.

Binding outputs of Phase 0 that later work must respect:

- **Quarantined media.** 13 images and 1 video carry third-party brand marks (GAIA Design House,
  THREE SLABS, Ahmed Hussein Designs, Concept/Thraa Refaat, Rh Designs, CHANGYMO, PYRAMIDS) and must
  not ship until written rights are confirmed. `assets/GENERALIMGA/` and `assets/CONPONENTS/6/` are
  wholly excluded. The per-file register is `docs/asset-inventory.json` (`rights` field).
- **People.** Everything in `assets/PHOTO WITH ACTORS/` shows identifiable individuals and is excluded
  pending per-person publication consent. Three of those files contain no elevator at all.
- **Brand-name conflict.** Several videos have "ARAB EGYPT FOR ELEVATORS" burned in, which is not
  the site's English brand name. Unresolved — do not ship those clips until the user decides.
  Three of them had reached the public set anyway and were withdrawn on 2026-08-09; see below.
- **The four presenter advertisements ship** (since 2026-08-09), on the owner's explicit
  written authorisation, in a dedicated **Marketing Films** carousel placed directly after the hero on the homepage. They carry
  `rights: owner-approved` with `approved_by`, `approved_on` and `held_for`, so the hold each
  one overrode is preserved rather than erased, and a test fails if any of the three is missing.
  Nothing was removed from the footage. **This override is narrowly scoped to those four files**
  — every other rights rule is unchanged.
- **The project video set is four walkthroughs, not nine** (since 2026-08-09). A frame-by-frame audit
  of every shipping clip found five whose `rights` had never matched their content: two with the
  brand-name watermark, one with that plus a third-party developer's "HYDE PARK DEVELOPMENT"
  title card, and two showing identifiable people. Each had been recorded `clear` because its
  note captured resolution or watermark-absence instead of what the footage shows. **Before
  giving any asset a new destination, look at it** — `rights: clear` in
  `docs/asset-inventory.json` has been wrong three times now, and widening `SHIPPABLE_ROLES`
  publishes whatever that field claims.
- **Derivatives outlive their manifest entry.** Excluding a clip stops the site linking to it but
  leaves the generated file in `public/`, still a live URL. Delete the derivative too;
  `tests/unit/media-rights.test.ts` fails on any orphan.
- **No company PDF exists in this repository.** The "213 documented projects" figure the brief refers
  to cannot be verified from anything here. Claim no experience statistic until the PDF arrives.
- **Folder numbering is not a project index.** `CONPONENTS/1`, `/2` and `/8` each break the
  one-folder-one-project assumption. Use the slugs in `docs/asset-manifest.md`, not folder numbers.
- **Colours: replaced again on 2026-08-07, direction "Signal".** The earlier no-chroma "Aperture"
  system was rejected in review as too pale and visually flat, with no conversion colour. The
  live system is a warm cream page (`#F3F0E8`), carbon-black anchor sections (`#080D10`) under
  large curves, and **signal orange (`#FF6B00`) as the conversion colour** — CTAs, active nav
  states, progress indicators, selected project numbers, hover fills, media controls. See
  `docs/design-system.md`, which is authoritative. The unconfirmed navy/brass logo values are
  still not referenced anywhere; do not reintroduce them.

  Two contrast rules are load-bearing and were checked, not guessed: `#FF6B00` on white is
  2.9:1 and **fails**, so orange fills always carry carbon text (`--color-on-accent`, 6.8:1);
  and `#FF6B00` as text on cream is 2.5:1 and **fails**, so small orange text uses
  `--color-accent-text` (`#A83F00`, 5.3:1). Full-strength orange on a light ground is for
  fills, rules and display-size type only.

## Current status

The build is feature-complete and verified. As of 2026-08-10 the two hard blockers from the
readiness report are resolved: a real PostgreSQL database (Supabase) is configured and
migrated, and `scripts/form-check.mjs` passes end to end against it (136/136). Lead
notification sends via Gmail SMTP (Nodemailer), not Resend — see
`src/lib/email/lead-notification.ts` and its bilingual HTML template in
`lead-notification-template.ts` — deduplicated through Upstash Redis when configured
(`src/lib/redis/client.ts`, `src/instrumentation.ts`), best-effort and skipped entirely
otherwise. `GMAIL_APP_PASSWORD` is configured; `GMAIL_USER` (the Gmail address itself) and
`LEAD_NOTIFICATION_EMAIL` are still blank, which is a supported state: submissions still
persist correctly, nobody is emailed about them yet. Distributed rate limiting
(`createRedisRateLimiter` in `src/lib/inspection/rate-limit.ts`) is implemented but inactive
without `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` — the in-memory limiter, correct
for a single instance, is what actually runs today. Still open: no confirmed phone number (the
call path does not ship without one), the "ARAB EGYPT FOR ELEVATORS" burned-in decision, and
the marketing-video rights questions. Full status and evidence:
[`docs/FINAL-PRODUCTION-READINESS-REPORT.md`](docs/FINAL-PRODUCTION-READINESS-REPORT.md).

**Owner content and Arabic pass, 2026-08-12.** The owner supplied replacement homepage copy
(the "first and only in Egypt" claim, the company statement, the coverage widening to the Arab
world) and compound names for four of the five featured installations, so the site now publishes
a location per project — individual client names are still never published, and there is still
no street address anywhere. The inspection form lost its "Finish" question and swapped
"Apartment building" for "Factories"; `finish` is no longer collected, though the column and its
default survive so historic rows stay readable, and migration `0001_inspection_setting_factory`
adds the new enum value (applied). Three Arabic defects were fixed with it: every `font-display`
/ `font-sans` element rendered Arabic in **Arial**, because `next/font`'s metric-adjusted Latin
fallback sits ahead of Alexandria in the stack and covers Arabic — `:lang(ar)` now redefines the
font variables themselves; Arabic headings inherited Latin leading from the size utilities and
crowded their tashkeel; and the Marketing Films rail sized its cards from a desktop `36vw` rule
that produced 118px-wide cards on a phone.

Verification harnesses live in `scripts/` and are run against a dev or production server:
`hero-check`, `form-check`, `matrix-check`, `emptiness`, `about-check`, `perf`, `index-check`,
`marquee-check`, `grid-check`, `ambient-check`, `marketing-check`. A terminal
command passing is not visual completion — `emptiness.mjs` exists because the earlier
band-based dead-space check reported clean pages that were visibly empty.

## Required skills — consult before any design or frontend work

Before **any** visual design decision or frontend implementation work — page or component layout,
color, typography, spacing, motion, or UI code — both of these skills must be consulted:

| Skill             | Path                                      | Use it for                                                                                                                     |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `frontend-design` | `.claude/skills/frontend-design/SKILL.md` | Aesthetic direction, avoiding templated defaults, type pairing, the plan→critique→build process, UI copywriting                |
| `ui-ux-pro-max`   | `.claude/skills/ui-ux-pro-max/SKILL.md`   | Searchable design database (styles, palettes, typography, landing structure, UX rules, stack guidance) via `scripts/search.py` |

This is not optional and not "when it seems relevant." Consult both, then reconcile: use
`ui-ux-pro-max` for researched, data-backed options and constraints, and `frontend-design` for
choosing a distinctive direction among them. Where they conflict, `frontend-design`'s push away from
generic defaults wins on aesthetic direction; `ui-ux-pro-max`'s accessibility and UX rules win on
correctness.

Run its search tool from the repo root (Python 3, stdlib only, no network):

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system -p "Egypt Elevators"
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>
python3 .claude/skills/ui-ux-pro-max/scripts/validate_data.py   # integrity check
```

Two caveats when following that skill's own instructions verbatim:

- Its examples invoke the script via `${CLAUDE_PLUGIN_ROOT}/...`. That variable is **unset** here
  because the skill is installed as a plain project-local skill, not a plugin — use the paths above
  instead, or the command expands to a broken path.
- `--persist` writes `design-system/` relative to the current working directory. Pass
  `--output-dir` explicitly, and note it silently skips an existing `MASTER.md` unless `--force`.

### GSAP — required before writing any GSAP code

The official GreenSock skills are installed at `.claude/skills/gsap-*` (from
`github.com/greensock/gsap-skills`). **Read the relevant one before writing or reviewing GSAP.**

| Skill                | Read it before                                                     |
| -------------------- | ------------------------------------------------------------------ |
| `gsap-core`          | Any tween, ease, stagger, or `gsap.matchMedia()` work              |
| `gsap-timeline`      | Sequencing more than one step                                      |
| `gsap-scrolltrigger` | Any scroll-linked animation, pinning, or scrub                     |
| `gsap-plugins`       | Any plugin — SplitText, Flip, Observer, ScrollSmoother, DrawSVG, … |
| `gsap-react`         | All GSAP in this codebase (it is React/Next.js)                    |
| `gsap-performance`   | Anything animating many elements, or when tuning for 60fps         |

`gsap-frameworks` (Vue/Svelte) and `gsap-utils` are also installed but rarely apply here.

Non-negotiable rules these skills establish, which this project must follow:

- **`useGSAP()` from `@gsap/react`**, never a bare `useEffect`, and always with `scope` set to a
  ref so selectors cannot escape the component. Register `useGSAP` as a plugin.
- **Never run GSAP during SSR.** Every GSAP call lives in a client component inside `useGSAP`.
- **`gsap.matchMedia()` for `prefers-reduced-motion`**, not a hand-rolled check — it reverts
  automatically when the query stops matching. This is how the existing reduced-motion guarantee
  must be preserved.
- **Transforms and `autoAlpha` only.** Never animate `width`, `height`, `top`, `left` — the site
  has a CLS budget and those trigger layout.
- **ScrollTrigger goes on the timeline or a top-level tween**, never on a tween nested inside a
  timeline. Register `ScrollTrigger` once. Never ship `markers: true`.
- All GSAP plugins are **free** since the Webflow acquisition — install from the public `gsap`
  package. Never add an `.npmrc` auth token or reference `npm.greensock.com`.

GSAP is used only where CSS or Motion genuinely cannot do the job (see the stack rules in the
brief). Motion for React remains the default for ordinary UI motion.

## Asset layout

Directory names contain typos that are load-bearing — reference paths exactly as spelled, and quote
them, since several contain spaces:

| Path                               | Contents                                                                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `assets/LOGO/`                     | Brand logo — a 1024x1024 photographic render of the physical sign. **In use**: see below.                             |
| `assets/CONPONENTS/1..9/`          | ("COMPONENTS") Nine numbered galleries, one per panorama elevator installation. Mixed `.jpg` + `.mp4`, 3–6 files each |
| `assets/VIDOES/HERO-VDUE/`         | ("VIDEOS/HERO-VIDEO") Single hero clip, `IMG_9128.MP4`                                                                |
| `assets/VIDOES/SHOW PRODUT video/` | Product showcase clips                                                                                                |
| `assets/VIDOES/MARKTEING-video/`   | Marketing clips, incl. 720P/1080P variants of the same source                                                         |
| `assets/PHOTO WITH ACTORS/`        | Lifestyle/people shots for hero and section imagery                                                                   |
| `assets/GENERALIMGA/`              | ("GENERAL IMAGE") Misc. brand and context imagery                                                                     |

Filenames are raw capture timestamps (`2026-08-05 23.14.05.jpg`) with no semantic meaning — the
parent folder is the only categorization. Identify an asset by opening it, not by its name.

Notes that affect how assets can be used:

- Most product photos are **watermarked** with the company logo (bottom-left badge plus a large
  translucent center mark). Plan crops and overlays around this; don't assume clean plates.
- Photos are portrait-oriented phone captures at inconsistent aspect ratios.
- Several `.mp4` files exceed 10 MB and some marketing clips are duplicated across resolutions —
  pick one variant and transcode/compress before shipping to the web rather than serving originals.

## Visual language

The live system is **"Aperture"** — documented in `docs/design-system.md`, which is authoritative.
A light plaster page (`#E9E7E2`) with dark apertures (`#0B0B0A`) cut into it; warm graphite ink;
no accent colour. Type is Bricolage Grotesque / Schibsted Grotesk (Latin) with Alexandria (Arabic)
and Geist Mono for the annotation layer.

Historical note, kept because the assets still show it:

- **The real logo is in use.** `scripts/build-logo.mjs` crops the supplied render to the mark's own
  edges and writes `public/media/brand/logo-badge.webp` (navbar + footer) and `logo-square.png`
  (favicon/PWA/structured data). It is presented as a badge — the physical sign it is — because the
  source is a photographic render with marble and elevator shafts baked into the background, and no
  local process can knock that out without damaging the semi-transparent gold. It is deliberately
  **not** redrawn as a flat icon, and there is no longer any invented glyph in the header. If a
  vector or transparent original arrives, rebuild the badge from it; nothing else changes.
- The logo reads deep navy and metallic gold/brass. Those were **estimated, never confirmed** brand
  values, and the UI colour system does not use them — the badge carries its own colour.
- Product photography splits into two finishes — polished gold/brass and black glass/chrome — which
  is the natural axis for organizing the installation gallery.
- The logo wordmark is Arabic-only. There is no confirmed English lockup for "Egypt Elevators"; if
  one is needed, raise it rather than fabricating a logo variant.

## Local Claude skills

`.claude/skills/` bundles design-oriented skills available via the Skill tool: `frontend-design`,
`ui-ux-pro-max` (both **required** — see above), plus `design`, `design-system`, `ui-styling`,
`banner-design`, `brand`, `slides`. Their `data/` CSVs and `scripts/` are self-contained lookups —
prefer these over ad-hoc design decisions. Several scripts are Python or `.cjs` and have their own
`requirements.txt`; nothing is installed at the repo level.

Skills live in `.claude/skills/` and must stay there — never inside the future application source
directory.
