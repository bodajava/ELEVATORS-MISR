# Architecture — Egypt Elevators

**Status:** Phase 0 plan, awaiting sign-off on the blocking questions in §9.
**Repo state at Phase 0:** no application code, no git, no package manifest. 187 MB of source media
under `assets/` and eight Claude skills under `.claude/skills/`.

---

## 1. Stack — resolved live, not from memory

Every version below was resolved against the npm registry on 2026-08-06 and the official docs were
read for the four libraries with breaking changes.

| Package                                               | Version                            | Why                                                   |
| ----------------------------------------------------- | ---------------------------------- | ----------------------------------------------------- |
| `next`                                                | **16.3.0**                         | App Router, Turbopack now default for dev _and_ build |
| `react` / `react-dom`                                 | 19.2.8                             | Required by Next 16                                   |
| `typescript`                                          | **6.0.3 — deliberately not 7.0.2** | See §1.1                                              |
| `tailwindcss` + `@tailwindcss/postcss`                | 4.3.3                              | CSS-first `@theme`, no `tailwind.config.js`           |
| `next-intl`                                           | 4.13.5                             | Peer range explicitly includes `^16.0.0`              |
| `motion`                                              | 13.0.0                             | Successor to `framer-motion`; same version line       |
| `lucide-react`                                        | 1.28.0                             | Interface icons                                       |
| `zod`                                                 | 4.4.3                              | Validation, shared client/server                      |
| `react-hook-form` + `@hookform/resolvers`             | 7.84.0 / 5.7.1                     | Inspection form only                                  |
| `drizzle-orm` + `drizzle-kit`                         | 0.45.2 / 0.31.10                   | See §1.2                                              |
| `postgres`                                            | 3.4.9                              | Driver for Drizzle                                    |
| `ai` + `@ai-sdk/react`                                | 7.0.54                             | Concierge; see §1.3                                   |
| `vitest`                                              | 4.1.10                             | Unit tests                                            |
| `@playwright/test`                                    | 1.62.1                             | E2E                                                   |
| `eslint` + `typescript-eslint` + `eslint-config-next` | 10.8.0 / 8.66.0 / 16.3.0           | Flat config                                           |
| `sharp`                                               | 0.35.3                             | Build-time image derivatives (dev dependency only)    |
| Package manager                                       | **pnpm 11.15.1**                   | Installed; no existing lockfile to respect            |

### 1.1 TypeScript is pinned to 6.0.3, not `latest`

`typescript@latest` is **7.0.2** — the Go-native rewrite. It ships **no stable programmatic compiler
API**, and `typescript-eslint@8.66.0` declares `"typescript": ">=4.8.4 <6.1.0"`. Installing TS 7 makes
the lint toolchain fail to resolve outright.

The brief says to use current stable versions and not hardcode obsolete ones. **6.0.3 is the current
stable version that this toolchain supports** — it is not an obsolete pin. Revisit when TS 7.1 ships
its stable API and typescript-eslint declares support.

### 1.2 ORM decision — Drizzle

Chosen over Prisma for this specific project:

- **Runtime weight.** The site has a hard LCP budget and exactly one write path. Drizzle is a thin
  query builder with no engine process and no generated client to ship; Prisma's client is
  meaningfully heavier for one table.
- **No codegen in the build.** Drizzle infers types directly from the schema module. One less step
  that can drift or break CI.
- **SQL is legible.** Lead lifecycle queries for the future admin dashboard stay plain SQL.

**What we give up:** Prisma Studio, a genuinely nice way for a non-technical team to eyeball leads.
That is a real loss and it is the reason to reconsider if the admin dashboard slips. Drizzle Studio
(`drizzle-kit studio`) covers it in the interim. `drizzle-orm` is also still pre-1.0, so minor
releases can carry breaking changes — the version is pinned exactly, not caret-ranged.

### 1.3 AI SDK v7 API notes (verified against current docs)

v7 differs from v5-era patterns that are still all over the internet:

```ts
// route handler
import {
  streamText,
  convertToModelMessages,
  tool,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai';

const result = streamText({ model, messages: await convertToModelMessages(messages), tools });
return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
```

- Tools use **`inputSchema`**, not `parameters`.
- The client hook is **`useChat` from `@ai-sdk/react`**, not from `ai`.
- The provider sits behind our own adapter (`src/lib/ai/provider.ts`) so swapping vendors touches one
  file.

### 1.4 Next.js 16 breaking changes this project must honour

- `middleware.ts` is renamed **`proxy.ts`** exporting a `proxy` function, Node runtime only. next-intl
  already documents this. Our locale routing lives there.
- `params` / `searchParams` / `cookies()` / `headers()` are **async-only**. Synchronous access is gone.
- `next lint` is **removed** — ESLint runs via its own CLI, flat config, and `next build` no longer
  lints. CI runs lint as a separate step.
- `images.qualities` now defaults to `[75]` and `imageSizes` no longer includes 16.
- `revalidateTag` requires a second `cacheLife` argument.
- Parallel-route slots require an explicit `default.tsx` or the build fails.
- `next typegen` generates `PageProps<'/route'>` / `LayoutProps` helpers — we use them for type-safe
  async params.
- Turbopack is the default builder; we do not add a webpack config (doing so fails `next build`).

---

## 2. Folder tree

```
egypt-elevators/
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ layout.tsx                 # html lang/dir, fonts, providers
│  │  │  ├─ page.tsx                   # homepage
│  │  │  ├─ projects/page.tsx
│  │  │  ├─ projects/[slug]/page.tsx
│  │  │  ├─ panorama-elevators/page.tsx
│  │  │  ├─ process/page.tsx
│  │  │  ├─ about/page.tsx
│  │  │  ├─ contact/page.tsx
│  │  │  ├─ privacy/page.tsx
│  │  │  ├─ terms/page.tsx
│  │  │  ├─ loading.tsx  error.tsx  not-found.tsx
│  │  ├─ api/
│  │  │  ├─ concierge/route.ts
│  │  │  ├─ inspection-requests/route.ts
│  │  │  └─ health/route.ts
│  │  ├─ sitemap.ts  robots.ts  manifest.ts
│  │  └─ globals.css                   # @import "tailwindcss" + @theme tokens
│  ├─ proxy.ts                         # locale routing (was middleware.ts)
│  ├─ components/
│  │  ├─ ui/                           # shadcn-structured primitives (canonical path)
│  │  ├─ layout/  navigation/  sections/  projects/
│  │  ├─ media/                        # ArchFrame, PosterVideo, MediaWindow
│  │  ├─ forms/  concierge/  motion/  seo/
│  ├─ content/                         # typed, CMS-ready, no CMS yet
│  │  ├─ company.ts                    # + UNCONFIRMED placeholder registry
│  │  ├─ navigation.ts  projects.ts  home.ts  faq.ts  legal.ts
│  ├─ i18n/
│  │  ├─ config.ts  routing.ts  navigation.ts  request.ts
│  │  └─ dictionaries/{en,ar}.json
│  ├─ lib/
│  │  ├─ ai/        # provider adapter, system prompt (server-only), knowledge, tools
│  │  ├─ db/        # drizzle client + schema
│  │  ├─ validation/  analytics/  seo/  security/  utils.ts
│  ├─ server/
│  │  ├─ actions/  services/  repositories/
│  ├─ styles/  types/
├─ public/media/{brand,projects,videos,actors,posters}/
├─ drizzle/                            # migrations
├─ scripts/                            # asset pipeline (reads assets/, writes public/media/)
├─ tests/{unit,e2e}/
└─ docs/
```

Alias: `@/*` → `./src/*`. Reusable primitives live at `src/components/ui`.

`.claude/skills/` stays at the repo root — never inside `src/`.

---

## 3. Design direction

The `ui-ux-pro-max` database returned **"Modern Dark (Cinema Mobile)" + Playfair Display/Inter +
black-and-gold**. Its accessibility and layout constraints are adopted. Its _aesthetic_ recommendation
is deliberately overridden, per the reconciliation rule in `CLAUDE.md`: Playfair + Inter on a near-black
page with a single gold accent is precisely the templated default `frontend-design` names as a
cliché — and it would arrive at the same answer for any luxury brief.

### 3.1 Palette — measured from the logo, not estimated

`CLAUDE.md` carries an estimated navy of `#1B2A5B`. Sampling the actual logo (14,400 px, quantised
clustering) gives something different and more useful:

| Measured                                                  | Hue         | Reading                                                 |
| --------------------------------------------------------- | ----------- | ------------------------------------------------------- |
| `#0C243C`, `#0C0C24`                                      | 210° / 240° | The real navy is **considerably darker** than `#1B2A5B` |
| `#6C543C` → `#B48454` → `#CCB484` → `#E4CC9C` → `#FCE4B4` | 30–40°      | A full **metallic ramp**, not one gold                  |
| `#849CB4`                                                 | 210°        | Glass/marble reflection mid-tone                        |

**The important consequence:** brass is a _gradient_, not a hex. A flat `#C9A227` fill reads as cheap
yellow plastic. Metal needs the dark-bronze → mid-brass → pale-champagne ramp across a surface. Tokens
therefore ship both `--brand-brass` (flat, for text and 1px rules, contrast-checked) and
`--gradient-brass` (the ramp, for metal surfaces and edges).

All brand colours are emitted as `--brand-*-provisional` and listed in `docs/design-system.md` as
**unconfirmed**, exactly as `CLAUDE.md` requires. They are sampled from a JPEG composite that includes
photographic background — a good starting point, not brand truth.

### 3.2 Typography — a real bilingual pairing

| Role                        | English           | Arabic                         |
| --------------------------- | ----------------- | ------------------------------ |
| Display                     | **Marcellus**     | **Reem Kufi**                  |
| Body / UI                   | **IBM Plex Sans** | **IBM Plex Sans Arabic**       |
| Technical / reference codes | IBM Plex Mono     | IBM Plex Mono (Latin numerals) |

The reasoning, which is the point:

- **Marcellus** is drawn from Roman inscriptional capitals — letters cut into stone. **Reem Kufi** is
  drawn from Kufic architectural inscription. They are not a translation of one another; they are
  _counterparts_, both being monumental inscription letterforms. That is what makes the Arabic feel
  designed-in rather than substituted.
- **IBM Plex Sans / IBM Plex Sans Arabic** is a genuine superfamily drawn as one system, which is the
  honest way to hold English and Arabic body text to the same voice.
- Marcellus has a single weight and no italic. That is a feature: it forces the display face to be used
  with restraint, in a few large moments only.

All four load through `next/font/google` with subsetting; Arabic faces load only on the `ar` locale.

### 3.3 Signature element — the arch frame

The logo's dominant geometry is a **rounded arch**. It becomes the site's media frame: project
photography sits in arch-topped windows.

This is chosen because it does real work, not because it decorates:

- Every product photo is **portrait** at inconsistent ratios. An arch-topped portrait frame is the one
  shape that flatters 3:4, 4:5 _and_ 1:2 sources without a destructive centre crop.
- It comes from the brand's own mark, so it cannot read as a template.
- It echoes the subject — a glass car rising inside an architectural opening.

Everything else stays quiet. Per Chanel's rule, one accessory: the arch is it.

**Secondary structural device:** a hairline brass rail down the inline-start edge with floor markers
that track scroll. Numbered markers are justified here specifically because floors _are_ an ordered
sequence and the number carries real meaning — not as decoration. It collapses to nothing on mobile
and under `prefers-reduced-motion`.

### 3.4 Motion

Vertical-travel easing (`cubic-bezier(0.16, 1, 0.3, 1)`, the expo-out curve the skill DB recommends)
on reveals, so content _arrives_ the way a car settles at a floor. Masked arch reveals for media.
No scroll hijacking, no intro loader, no cursor replacement. Every animation is opacity/transform
only, so nothing triggers layout. `prefers-reduced-motion` collapses all of it to instant.

---

## 4. Internationalisation

`next-intl` 4.13.5 with `[locale]` segments, `en` default, `ar` secondary.

- `src/proxy.ts` handles locale negotiation (Next 16 name).
- `next/root-params` is available by default in Next 16.3 — used with `generateStaticParams` so both
  locales prerender statically. `setRequestLocale` is legacy and avoided.
- `dir` is set on `<html>` per locale; **all spacing/positioning uses logical properties**
  (`margin-inline`, `padding-block`, `inset-inline-start`) so RTL is structural, not a flip hack.
- Directional icons (chevrons, arrows) mirror via a `logical-icon` utility; non-directional ones
  (phone, calendar) never mirror.
- The language switcher preserves the current pathname via next-intl's `Link`/`usePathname`.
- Locale preference is stored in a cookie **read on the server in `proxy.ts`** — never in a client
  effect, which is what causes hydration mismatches.

**Note on sourcing:** the `ui-ux-pro-max` database returned exactly **one** RTL-related rule (about
date formatting). RTL guidance here comes from WCAG 2.2, the CSS logical-properties spec, and
`CLAUDE.md`'s binding requirement — **not** from the skill database. Flagging that explicitly because
the skill's own instructions require saying when a recommendation did not come from a database match.

Arabic copy will be written as Arabic, not translated from the English. Where a term is genuinely
bilingual in Egyptian usage (e.g. اسانسير بانوراما) it stays as used.

---

## 5. Data model

```
inspection_requests
  id                uuid pk
  reference         text unique      -- human-readable, e.g. EE-8F3K2Q
  full_name         text not null
  phone             text not null
  governorate       text not null
  email             text
  customer_type     enum null
  building_type     enum null
  floors            int  null
  project_status    enum null        -- EXISTING | UNDER_CONSTRUCTION
  preferred_contact text null
  notes             text null
  locale            text not null
  status            enum not null default 'NEW'
                    -- NEW | CONTACTED | INSPECTION_SCHEDULED | COMPLETED | CLOSED
  source            text null        -- utm/referrer, no PII
  created_at        timestamptz not null default now()   -- UTC
  updated_at        timestamptz not null
```

No file uploads. No object storage. Reference codes use a Crockford-base32 alphabet with ambiguous
characters removed, so they can be read aloud over the phone.

---

## 6. AI concierge

- System prompt lives in `src/lib/ai/prompt.server.ts`, imported only from the route handler, with
  `import 'server-only'` at the top.
- Knowledge is assembled from the **typed content modules** — the same objects that render the pages,
  so the concierge cannot know anything the site does not visibly say.
- Three structured tools, all Zod-validated: `showInspectionForm`, `suggestProject`,
  `requestHumanFollowUp`.
- The client renders **only** plain text and a fixed set of React components keyed by tool name. No
  model-generated HTML or markdown is ever injected.
- Prompt-injection containment: tool outputs are treated as data, never as instructions; the project
  slug argument is validated against the known slug list rather than trusted.
- Rate limited per IP; message length capped; conversation content is not persisted beyond the request
  except for a lead the visitor explicitly submits.
- **With no API key configured the whole feature degrades cleanly**: the launcher still opens, states
  that the assistant is unavailable, and offers the inspection form directly.

The concierge opens the conversation, identifies itself as an AI assistant, never quotes a price,
never promises a response time, and offers the in-chat human follow-up form on request — per the
binding rules in `CLAUDE.md`.

---

## 7. Content integrity

`src/content/company.ts` holds a placeholder registry for everything not yet confirmed:

```ts
export const UNCONFIRMED = {
  phone: null,
  email: null,
  address: null,
  businessHours: null,
  foundedYear: null,
  warranty: null,
  emergencySupport: null,
  responseTime: null,
  social: { facebook: null, instagram: null, tiktok: null },
} as const;
```

Behaviour is asymmetric by design: **in development a missing value throws loudly**; in production the
component that would render it is **omitted entirely**. A placeholder never reaches a visitor and is
never silently replaced with an invented value. `LocalBusiness` schema stays out of the build until an
address exists; `Organization` and `Service` ship now.

---

## 8. Risk register

| #   | Risk                                                                                 | Severity           | Handling                                                 |
| --- | ------------------------------------------------------------------------------------ | ------------------ | -------------------------------------------------------- |
| R1  | 13 images + 1 video carry third-party brand marks                                    | **High — legal**   | Quarantined. Build ships without them                    |
| R2  | Identifiable people in 9 files, 3 with no elevator at all                            | **High — privacy** | Excluded pending per-person consent                      |
| R3  | Three videos read "ARAB EGYPT FOR ELEVATORS", conflicting with the site's brand name | **High — brand**   | Blocking question Q1                                     |
| R4  | The referenced company PDF is **not in the repository**                              | **High — content** | Blocking question Q2. No stats claimed without it        |
| R5  | Supplied hero clip is 848×464 and shows a commercial storefront                      | Medium             | Use a 1080p clip instead; Q3                             |
| R6  | All photos capped at 1280px                                                          | Medium             | Layout authored so nothing requests more                 |
| R7  | Marketing videos are Arabic-only with burned-in captions                             | Medium             | English locale gets an English summary; Q4               |
| R8  | Logo is an opaque square JPG on a photo background                                   | Medium             | Typographic wordmark + SVG arch; single-entry swap later |
| R9  | Folder numbering ≠ one project (groups 1, 2, 8 break it)                             | Medium             | Regrouped by visual evidence; Q5                         |
| R10 | `drizzle-orm` is pre-1.0                                                             | Low                | Exact version pin                                        |
| R11 | No PostgreSQL locally (`psql` absent; Docker present)                                | Low                | `docker-compose.yml` for local Postgres                  |
| R12 | Colours are provisional                                                              | Low                | Emitted as `--*-provisional`, documented as unconfirmed  |

---

## 9. Blocking questions

Only Q1–Q3 can change work already planned. Everything else proceeds meanwhile.

1. **English brand name.** Three videos have "ARAB EGYPT FOR ELEVATORS" burned in. Adopt that name,
   drop those three clips, or accept the mismatch?
2. **The company PDF** (the "213 documented projects" record) is not in this repository. Send it, or
   confirm that no experience figure may be claimed.
3. **Hero clip.** Approve `SHOW PRODUT/23.20.17.mp4` (1920×1080 villa) as the hero in place of the
   848×464 storefront clip in `HERO-VDUE/`?
4. **Third-party watermarks** (GAIA, THREE SLABS, AHMED HUSSEIN, Concept/Thraa Refaat, Rh, CHANGYMO,
   PYRAMIDS) — any written permissions? Without them those 14 files stay out.
5. **People photos** — is there publication consent from the individuals shown? Three files contain no
   elevator and are recommended for exclusion regardless.
6. **Contact details** — phone, email, address, hours, founding year, social URLs. Until a phone number
   is confirmed the call CTA does not ship at all.
