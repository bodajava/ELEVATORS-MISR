# Egypt Elevators

Marketing website for **مصر العربية للمصاعد** — English brand name **Egypt Elevators** — an
Egyptian company specialising exclusively in panorama (glass) elevators.

English is the default locale and renders LTR. Arabic is the secondary locale and renders RTL.
The single conversion path on every page is **requesting a physical site inspection**.

---

## Getting started

Requires Node 22+ and pnpm 11.

```bash
pnpm install
cp .env.example .env.local     # then fill in the values you need — see below
pnpm dev                       # http://localhost:3000 → redirects to /en
```

The site runs with an empty `.env.local`. Only the inspection form needs configuration, and
without `DATABASE_URL` it falls back to an in-memory store in development so you can exercise
the whole submit → confirmation path before provisioning anything. That fallback is
**development only**: in production an unset `DATABASE_URL` makes the form refuse submissions
rather than show a confirmation for a lead nobody kept.

## Commands

| Command            | What it does                                                |
| ------------------ | ----------------------------------------------------------- |
| `pnpm dev`         | Development server                                          |
| `pnpm build`       | Production build (prerenders both locales)                  |
| `pnpm start`       | Serve the production build                                  |
| `pnpm typecheck`   | `next typegen` then `tsc --noEmit`                          |
| `pnpm lint`        | ESLint                                                      |
| `pnpm format`      | Prettier                                                    |
| `pnpm test`        | Unit tests (vitest)                                         |
| `pnpm verify`      | typecheck → lint → test → build, in order                   |
| `pnpm db:generate` | Write a migration from the schema diff (no database needed) |
| `pnpm db:migrate`  | Apply pending migrations                                    |
| `pnpm db:studio`   | Browse the data                                             |

Verification harnesses under `scripts/` are run directly with `node` against a running server.
`scripts/hero-check.mjs` drives the hero's pinned sequence to three checkpoints at two
viewports and reports the measured geometry plus any console output — run it after any change
that could touch the homepage.

## Environment

Every variable is documented in [`.env.example`](.env.example) and read through
`src/lib/env.ts`, which validates lazily at first use rather than at import — so a production
build never needs production credentials.

| Variable                         | Required for                           |
| -------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`           | Canonical URLs, hreflang, sitemap, OG  |
| `DATABASE_URL`                   | Persisting inspection requests         |
| `DIRECT_URL`                     | Migrations, on PgBouncer-fronted hosts |
| `RATE_LIMIT_SALT`                | Rate limiting (required in production) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `LEAD_NOTIFICATION_EMAIL` | Optional — lead notification email via Gmail SMTP |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional — distributed rate limiting across instances |

Never commit a filled-in `.env`. `.gitignore` tracks `.env.example` and ignores every other
`.env*`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · next-intl ·
Drizzle ORM + PostgreSQL · Zod · GSAP + ScrollTrigger · Motion · Lenis · vitest · Playwright

## Layout

```
src/app/[locale]/        routes; both locales prerendered
src/components/          sections, media, forms, motion, layout, ui
src/content/             typed bilingual copy — the only place strings live
src/i18n/                locale config, routing, dictionaries
src/lib/db/              Drizzle schema, client, inspection repository
src/lib/inspection/      shared Zod schema, honeypot, rate limiting, references
src/lib/seo/             metadata and JSON-LD builders
drizzle/                 generated SQL migrations
scripts/                 media pipeline and verification harnesses
docs/                    architecture, design system, asset manifest, audits
assets/                  original media drop — untracked, see .gitignore
```

## Motion

GSAP handles scroll-linked work (the hero, the ascent); Motion handles React state
transitions. **No element is ever driven by both.** All GSAP runs inside `useGSAP()` with a
scope ref, never a bare `useEffect`, and `gsap.matchMedia()` provides the reduced-motion
branch so it reverts automatically. Transforms and `autoAlpha` only — the site has a CLS
budget and animating layout properties would spend it.

The hero is verified and frozen. Before changing it, read the header comment in
`src/components/sections/hero.tsx` and re-run `scripts/hero-check.mjs`.

## Content and policy rules

These are binding, enforced in code and tests, and documented in full in
[`CLAUDE.md`](CLAUDE.md) and [`docs/content-guide.md`](docs/content-guide.md):

- **Never display prices or estimates.** No ranges, no "starting from", no calculators.
  Pricing follows the inspection, off-site.
- **Never promise a response time.** Confirm that a request arrived; say nothing about when
  a reply comes.
- **No WhatsApp anywhere** — no button, link, icon or mention.
- **Permitted contact paths are a closed list of four:** the AI concierge, the in-site human
  follow-up form, the site-inspection request, and a direct phone call _once a confirmed
  number exists_. No number is published until one is confirmed; the call path simply does
  not ship.
- **Panorama elevators exclusively.** No adjacent product lines.
- **No invented company facts.** Unconfirmed values live in `src/content/company.ts` as
  `null` and the components that would render them omit themselves.

## Known open items

- **The hero video has "ARAB EGYPT FOR ELEVATORS" burned into it**, which is the company's
  letterhead name and not the site's English brand name. The clip is explicitly approved and
  required; the conflict is accepted for now and recorded in
  `docs/FULL-PROJECT-AUDIT.md`.
- **No confirmed phone number**, so the call path is not shipped.
- **Quarantined media**: 13 images and 1 video carry third-party brand marks and everything
  under `assets/PHOTO WITH ACTORS/` shows identifiable people. None of it ships until rights
  and consent are confirmed. See `docs/asset-inventory.json`.
- **Email notification is not wired up.** Requests are persisted; nobody is emailed.
