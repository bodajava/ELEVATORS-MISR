# Egypt Elevators — Design System

**Direction: "Zen Linen".** A warm linen page, charcoal anchor sections cut in under large
curves, and a terracotta accent that only ever means _act here_. Light and dark are both
first-class themes.

---

## How to read this document

This file **consolidates** the established system into a single structured reference. It does
not introduce a new one.

| File                                                  | Role                                                                                                                                                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/design-system.md`](docs/design-system.md)      | **Authoritative on rationale and implementation detail.** Why each decision was made, the scroll budgets, the media and video rules, the single-active invariant. Where the two disagree on _detail_, that file wins. |
| [`src/app/globals.css`](src/app/globals.css) `@theme` | **Authoritative on token values.** Every number below is transcribed from there. If a value here drifts from the CSS, the CSS is correct and this file is stale.                                                      |
| `DESIGN.md` (this file)                               | The consolidated reference: what the system is, in one place, in the structure the brief asked for.                                                                                                                   |

Nothing here replaces or duplicates a token. There is exactly one definition of each colour,
radius, duration and container width, and it lives in `@theme`.

---

## 1. Platform and intent

- **Platform:** responsive bilingual marketing website (Next.js App Router, Tailwind v4).
- **Theme:** warm editorial architecture with premium industrial detail.
- **Locales:** English (default, LTR) and Arabic (secondary, RTL). Arabic is a **first-class
  system**, not a mirrored afterthought — see §11.
- **Purpose:** one conversion — requesting a physical site inspection. The colour system is
  built around making that action unmistakable.
- **Scope:** panorama elevators exclusively.

### Material palette

The system is described in materials, because the product is architectural:

| Material           | Where it appears                                                       |
| ------------------ | ---------------------------------------------------------------------- |
| **Warm cream**     | the page ground                                                        |
| **Near-black**     | type, and the carbon anchor sections                                   |
| **Brass / gold**   | the photography itself — the dominant hue in nearly every source image |
| **Smoked glass**   | the dark media wells, the glass surfaces, the ambient background       |
| **Dark timber**    | the warm sunken and surface greys                                      |
| **Polished stone** | the cream/warm-white gradient family                                   |
| **Safety orange**  | conversion only — CTAs, active state, progress, live indicators        |

Brass, smoked glass, timber and stone are **rendered by the photography and the ambient
background**, not by extra colour tokens. Adding a "brass" fill token would create a second
palette competing with the photographs.

### What this system is not

No neon. No purple. No gaming aesthetics. No glassmorphism as a general surface (it is
restricted to five components — §6). No generic SaaS card collections: layouts are open and
editorial, and a card is used only when the content is genuinely a discrete object.

---

## 2. Colour

Transcribed from `@theme`. See `docs/design-system.md` §2 for the reasoning.

Values live in `src/app/globals.css`, declared once per theme. Every pairing below is
**measured**, and `tests/unit/contrast.test.ts` asserts them on every run.

| Token          | Light     | Dark      | Use                                                                                             |
| -------------- | --------- | --------- | ----------------------------------------------------------------------------------------------- |
| `paper`        | `#FAF9F5` | `#1C1B18` | The page                                                                                        |
| `paper-raised` | `#FFFFFF` | `#262624` | Raised surfaces, glass                                                                          |
| `paper-sunken` | `#F0EEE6` | `#171614` | Recessed sections                                                                               |
| `surface`      | `#F4F2EA` | `#262624` | Card surface                                                                                    |
| `carbon`       | `#262624` | `#33322F` | Anchor sections. **Lighter than the page in dark** — a black band on a black page is not a band |
| `ink`          | `#3D3929` | `#EDE9DE` | Body and display type                                                                           |
| `ink-2`        | `#5C5747` | `#C4BFB1` | Secondary                                                                                       |
| `ink-3`        | `#6F6A5B` | `#948F80` | Annotation                                                                                      |
| `accent`       | `#C96442` | `#E08A5F` | Rules, indicators, **display-size type only**                                                   |
| `accent-hi`    | `#B0522E` | `#EB9A71` | The CTA fill                                                                                    |
| `accent-text`  | `#A84E2B` | `#E08A5F` | The only accent permitted at body size                                                          |
| `on-accent`    | `#FAF9F5` | `#1C1B18` | What sits on an accent fill                                                                     |
| `danger`       | `#B3392F` | `#E5776B` | Form errors                                                                                     |
| `focus`        | `#3D3929` | `#EDE9DE` | Focus ring                                                                                      |

### Contrast rules — checked, not guessed

These are load-bearing and are why there are three accent tokens rather than one:

- **`#C96442` on linen is 3.70:1 — it fails AA at body size.** It is kept for rules,
  indicators and display-size type. Anything smaller uses `accent-text` (`#A84E2B`, 5.26:1).
- **Neither white nor the ink passes on `#C96442` as a fill** (3.90:1 and 2.97:1). So the CTA
  fill is `accent-hi` (`#B0522E`), whose `#FAF9F5` label measures **4.87:1**.
- **Dark reverses the problem.** A terracotta dark enough to read on linen is nearly invisible
  on charcoal, so dark uses `#E08A5F` — 6.54:1 on the page, and dark enough underneath that a
  `#1C1B18` label on it also measures 6.54:1. One tone serves both roles there.
- `ink-3` is `#6F6A5B`, not the `#837E6C` the palette first suggested: that measured 3.86:1
  and failed. The contrast test caught it before it shipped.

### Themes

Light is the default and the design target. Dark is a real theme, not an inversion — the
accent lightens and the anchor sections lift _out_ of the page instead of sinking into it.

The site follows the OS until the visitor presses the toggle; an explicit choice is stored and
outranks the default. An inline script in `<body>` applies it before any content paints, so
there is no flash of the wrong theme.

### Where orange is allowed

A closed list: primary CTA fills · active navigation state · progress indicators · selected
project and sequence numbers · small labels marking a **live** state · control hover fills ·
media controller hover · the footer's drawn rule. If a proposed orange element is not on this
list, the answer is no.

---

## 3. Typography

| Role       | Latin               | Arabic     |
| ---------- | ------------------- | ---------- |
| Display    | Bricolage Grotesque | Alexandria |
| Body       | Schibsted Grotesk   | Alexandria |
| Annotation | Geist Mono          | Alexandria |

Headings are **700 weight at `wdth` 88, tracking −0.038em**, tightening to −0.048em at display
sizes. The width axis narrows the face because a shaft is a vertical form.

**Arabic suppresses tracking, uppercase and the width axis entirely** — it is a connected
script and all three break the joins. Latin runs inside Arabic copy are marked `lang="en"`.

### Type scale

| Token       | Size       | Line height |
| ----------- | ---------- | ----------- |
| `text-2xs`  | 0.6875rem  | 1.4         |
| `text-xs`   | 0.78125rem | 1.5         |
| `text-sm`   | 0.875rem   | 1.6         |
| `text-base` | 1.0625rem  | 1.6         |
| `text-lg`   | 1.25rem    | 1.5         |
| `text-xl`   | 1.5rem     | 1.35        |
| `text-2xl`  | 2rem       | 1.18        |
| `text-3xl`  | 2.75rem    | 1.08        |
| `text-4xl`  | 3.75rem    | 1.02        |
| `text-5xl`  | 5rem       | 0.98        |
| `text-6xl`  | 7rem       | 0.92        |

Two registers, deliberately far apart: **oversized editorial headings** and **precise
technical labels** (the `annotation` utility — mono, uppercase, wide-tracked, `ink-3`).
Nothing sits in between, so a label never reads as a small heading.

Measure: body copy is capped at `max-w-[52ch]`–`[56ch]`. Display lines set their own measure.

---

## 4. Spacing and layout

**Base unit `--spacing: 0.25rem`** (Tailwind's `n × 4px`).

### Gutter

`--gutter` is the page inset and the axis every hairline lands on:

| Viewport | `--gutter` |
| -------- | ---------- |
| < 640px  | 1.25rem    |
| ≥ 640px  | 2rem       |
| ≥ 1024px | 3rem       |

### Container widths

| Token              | Value  | Use                            |
| ------------------ | ------ | ------------------------------ |
| `--container-text` | 40rem  | Long-form reading column       |
| `--container-wide` | 82rem  | Standard content width         |
| `--container-page` | 100rem | Full-bleed editorial and media |

### Section rhythm

Vertical rhythm is **content-driven**. A section's height comes from what is in it; arbitrary
multi-viewport heights are not used. Where a fixed relationship is needed, it is expressed with
`clamp()` so it scales rather than stepping at a breakpoint.

| Purpose                                          | Value                           |
| ------------------------------------------------ | ------------------------------- |
| Section padding (block)                          | `clamp(4rem, 9vw, 8.5rem)`      |
| Gap between a heading and its content            | `clamp(1.5rem, 3vw, 3rem)`      |
| Grid gap (editorial media)                       | `clamp(0.75rem, 1.6vw, 1.5rem)` |
| **Cream breathing room before a carbon section** | `clamp(1.75rem, 5vw, 6rem)`     |

That last row is a specific requirement: cream and carbon containers must **never touch**, and
the band between them must not become an empty void either. Target separation:

| Viewport | Separation |
| -------- | ---------- |
| Desktop  | 72–96px    |
| Tablet   | 48–72px    |
| Mobile   | 28–44px    |

### Dead space vs. breathing room

The distinction that governs every layout review:

- **Breathing room** is deliberate space _around_ typography and media that gives a composition
  air. It is bounded, it is proportional to the thing it surrounds, and removing it would make
  the page feel cramped. **Preserve it.**
- **Dead space** is an area with no content, no media, no interaction and no narrative — an
  empty grid column, a `min-height` larger than its content, an unfilled pinned scroll, an
  orphan grid item leaving half a row blank. **Remove it.**

The test: _if a visitor's eye lands here, is there a reason?_ No large blank rectangle may
remain without a deliberate function. Space is never filled with meaningless text or fake
decoration to solve this — the layout changes instead.

---

## 5. Breakpoints and grid

Tailwind v4 defaults, unmodified:

| Name   | Min width | Treated as   |
| ------ | --------- | ------------ |
| (base) | 0         | Mobile       |
| `sm`   | 640px     | Large mobile |
| `md`   | 768px     | Tablet       |
| `lg`   | 1024px    | Desktop      |
| `xl`   | 1280px    | Wide desktop |
| `2xl`  | 1536px    | Extra-wide   |

`lg` (1024px) is the primary desktop/mobile fork, and the breakpoint `gsap.matchMedia()` uses.

**Verification widths:** 320 · 360 · 390 · 430 · 768 · 1024 · 1440 · 1920, in both locales.

### Grid principles

- CSS Grid used **deliberately**, with named intent — not a uniform repeat of identical cards.
- Column structure is **derived from item count**, so a set of 5 and a set of 9 do not use the
  same template and neither leaves an orphan.
- Cells combine **portrait, landscape and featured** shapes, with spans chosen from the real
  aspect ratio of the media in them.
- A featured item may span two columns or two rows **when the media justifies it**, not for
  variety.
- **No orphan final item.** No "three above, one alone below".
- Reading order is preserved — no random masonry that scrambles the DOM order.
- Borders do not go around every image. Structure comes from hairlines, indices and captions.
- Captions, indices, material labels and project context are **part of the grid**, not
  afterthoughts hung beneath it.
- Mobile is not "the desktop grid stacked". It uses compact two-column editorial grids,
  horizontal snap rails with a visible peek of the next item, and asymmetric 2-ups. Full width
  is reserved for genuinely cinematic media.

---

## 6. Form — radii, elevation, surfaces

### Radii — two scales, deliberately far apart

| Scale            | Token                 | Value | Applies to                |
| ---------------- | --------------------- | ----- | ------------------------- |
| **Architecture** | `--radius-media`      | 20px  | Media wells, video frames |
|                  | `--radius-card`       | 24px  | Editorial cards           |
|                  | `--radius-section`    | 40px  | Section curves            |
|                  | `--radius-section-lg` | 64px  | Large section curves      |
| **Instruments**  | `--radius-xs`         | 2px   | Chips, ticks              |
|                  | `--radius-control`    | 8px   | Buttons, inputs           |
|                  | `--radius-control-lg` | 12px  | Large controls            |

Nothing sits between the two scales, so "surface" and "control" are distinguishable at a
glance. Sections meet each other on wide curves (`curve-t` / `curve-b`), never a straight seam.

### Shadows

Depth comes from the carbon wells, not from drop shadows.

| Token            | Use                                                      |
| ---------------- | -------------------------------------------------------- |
| `--shadow-sm`    | Barely-there separation                                  |
| `--shadow-md`    | Raised surface                                           |
| `--shadow-lg`    | Lifted surface                                           |
| `--shadow-float` | Genuinely floating surfaces — nav, concierge, bottom nav |
| `--shadow-card`  | Media cards: a tight contact shadow plus a long soft one |

### Liquid glass — restricted

`--glass-blur: 20px`, `--glass-saturate: 180%`. Used on **five surfaces only**: floating
navigation, AI concierge, media controller, interactive project viewer, toast/confirmation.
`backdrop-filter` performance is moderate-poor and text contrast is this style's characteristic
failure mode, so it is not a general-purpose surface and every glass surface keeps text at AA.

`glass` (over cream) and `glass-dark` (over carbon) are separate utilities.

---

## 7. Motion

**GSAP** for scroll-linked sequences. **Motion** for React state transitions. **No element is
ever driven by both.** Lenis provides smooth scroll, synced to ScrollTrigger.

### Durations and easing

| Token                | Value                            | Use                        |
| -------------------- | -------------------------------- | -------------------------- |
| `--duration-instant` | 120ms                            | Colour, immediate feedback |
| `--duration-fast`    | 220ms                            | Hover, focus, small moves  |
| `--duration-base`    | 380ms                            | Panels, reveals            |
| `--duration-slow`    | 620ms                            | Section-scale transitions  |
| `--ease-travel`      | `cubic-bezier(0.22, 1, 0.36, 1)` | **The signature curve**    |
| `--ease-standard`    | `cubic-bezier(0.4, 0, 0.2, 1)`   | General                    |
| `--ease-exit`        | `cubic-bezier(0.4, 0, 1, 1)`     | Leaving                    |

`travel` is the system's signature: a car leaves quickly and settles slowly into a floor.
Mirrored in GSAP as `CustomEase("travel")`.

### Non-negotiables

- `useGSAP()` with a scoped ref — never a bare `useEffect`.
- `gsap.matchMedia()` for every breakpoint **and** for `prefers-reduced-motion`; it reverts
  automatically when the query stops matching.
- **Transforms and `autoAlpha` only.** Never `width`, `height`, `top`, `left` — there is a CLS
  budget and those trigger layout.
- ScrollTrigger on the timeline or a top-level tween, never on a tween nested in a timeline.
- Never ship `markers: true`.
- Every context reverted and every ScrollTrigger killed on unmount.
- **GSAP owns the whole transform.** It writes `translate: none`, so an element GSAP animates
  must not rely on Tailwind's `translate-*` utilities for centring — use `xPercent`/`yPercent`.

Motion is **physical, smooth and scroll-connected**. It is never decorative noise, and it never
costs usability.

---

## 8. Ambient background and cursor

One shared system for the whole site, not per-section animations.

### Ambient background

- Soft cream, brass, smoked-glass and orange-tinted atmospheric forms.
- **Very low opacity.** It must read as light moving across brass and glass — not coloured
  blobs.
- Slow pointer-responsive drift plus slight scroll parallax.
- Built from gradients, blurred shapes, masks and noise. **No video, no canvas** behind
  sections.
- **Never behind body text** at a strength that touches contrast. Text contrast is preserved
  everywhere; the background yields.
- Fixed behind content, `pointer-events: none`, and it never causes layout shift.

**The pointer light is theme-dependent, not one effect with one colour.** On the dark ground
it is additive warm light — the version the client approved. On linen the same colours are
light over light and the measured change was almost nothing, so the light theme uses a warm
_shading_ instead. Both come from `--ambient-glow` / `--ambient-glow-opacity`, and the four
drifting forms are `--ambient-1..4` for the same reason.

There is a hard ceiling on how strong the light-theme version can be, and it is contrast, not
taste: the field sits behind everything, so annotation text passes under it. A terracotta wash
lowers the ground's luminance, and `--ink-3` only has 5.13:1 to spend. Measured under the lamp
it is **4.81:1** — passing, with little room left. A stronger tint in that hue drops it below
AA, which is why the light theme uses a _lighter_ warm (`#E5B98F` at a higher alpha) rather
than more of the accent: it shifts more colour per unit of luminance lost.

`scripts/ambient-check.mjs` asserts both halves — that moving the pointer changes the page
well beyond the background's own drift, and that annotation text still clears AA against the
ground as actually rendered under the light.

### Cursor (desktop, fine pointer only)

- One small precise point plus one larger soft ring that follows with eased lag.
- The ring responds to interactive text, media, buttons and links by changing size.
- It never obscures the system cursor where precision matters, and never intercepts pointer
  events.
- It must not feel like a game.
- **Disabled entirely** on coarse/touch pointers and under reduced motion.

### Performance rules

- Transforms and opacity only.
- **At most one shared `requestAnimationFrame` loop** for the whole system.
- **No React state update on pointer move** — refs and motion values only.
- Work pauses when the document is hidden.
- No continuous full-screen filter animation on low-powered phones.

---

## 9. Accessibility

- **Full keyboard navigation.** Every interaction available to a pointer has a keyboard
  equivalent — including the process stages, sliders and any hover-revealed content.
- **Visible focus** everywhere: 2px `--color-focus` ring, 2–3px offset. Never removed.
- **Contrast:** AA minimum. The orange rules in §2 are the sharp edge of this and are checked,
  not assumed.
- **Touch targets ≥ 44×44px**, including slider controls and bottom navigation.
- **Alt text describes the actual media.** Decorative media is `aria-hidden`.
- **No colour-only meaning.** Errors carry text; active states carry a rule or weight change as
  well as colour.
- **Video:** never autoplays with sound, controls are labelled, and nothing starts audio on its
  own.
- **Live regions** are present only when they have something to say — an always-mounted empty
  `role="alert"` competes for a screen reader's attention.
- Correct `lang` and `dir` on `<html>` per locale.

### Reduced motion

`prefers-reduced-motion: reduce` is honoured through `gsap.matchMedia()`, so it reverts
automatically if the preference changes.

- No pinned sections, no scrubbed sequences, no parallax.
- **The composition still resolves to its final state** — content is never left mid-animation
  or hidden behind a reveal that no longer runs.
- The ambient background becomes **stable and still, but still attractive** — not removed.
- The cursor follower does not mount.
- Video does not autoplay; posters show instead.

---

## 10. Mobile

Mobile is a **deliberate composition**, not a stacked desktop layout.

### Bottom navigation

- The desktop navbar is hidden below `lg`; a fixed bottom navigation takes its place.
- Rounded, floating container — architecture radius, `--shadow-float`.
- Respects `env(safe-area-inset-bottom)`.
- **Essential destinations only:** Home · Projects · Panorama · Process/About · Inspection.
- Icons **plus** concise labels. Clear active state. Minimum 44×44px targets.
- It must not cover content: the page carries bottom padding equal to the navigation height.
- The AI concierge entry point must not conflict with it or with the inspection CTA.

### Mobile motion

No hover dependency — tap and focus equivalents for everything. Lighter animations, no heavy
pointer-follow background, no long pinned sections. Target 60fps on ordinary mobile hardware.

---

## 11. Arabic and RTL

Arabic is a first-class system.

- `dir="rtl"` and `lang="ar-EG"` on `<html>`; direction is a per-locale switch, never a global
  assumption.
- **Logical properties throughout** — `ms-`/`me-`, `ps-`/`pe-`, `start`/`end`, `border-s`. No
  physical `left`/`right` in layout code.
- **Physical offsets are a bug in RTL.** An element positioned with a large negative physical
  `left` creates real scrollable overflow when the inline direction flips. Off-screen hiding
  uses clipping, not displacement.
- Icons and directional arrows mirror (`icon-directional`).
- Arabic suppresses letter-spacing, `text-transform` and the width axis.
- Numerals: phone numbers and reference codes are forced `dir="ltr"` inside RTL copy, because
  otherwise the digit groups render in the wrong order.
- Arabic copy is **written as Arabic**, not translated word-for-word from English.
- **Never split Arabic text into characters.** Arabic is cursive: each letter's glyph depends on
  its neighbours, so wrapping every character in its own element severs the joins and the
  browser falls back to isolated forms — the word stops being the word. Per-character text
  effects (staggers, reveals, split-text animation) must switch their unit to the **word** when
  the string contains Arabic. `splitText` in `components/ui/animated-slideshow.tsx` is the
  reference implementation; `scripts/index-check.mjs` asserts the token count matches the word
  count in `ar` and the character count in `en`.
- **Arabic titles run longer than their English counterparts.** A list that holds one line per
  row in English can wrap every row in Arabic and double in height, which moves everything
  below it. Size list type against the Arabic string, not the English one.

---

## 12. Content rules that constrain design

Binding, and they shape layout as much as they shape copy. Full text in
[`CLAUDE.md`](CLAUDE.md) and [`docs/content-guide.md`](docs/content-guide.md).

- **No prices or estimates** — no tags, ranges, "starting from", or calculators. So: no pricing
  tier tables, no comparison-by-price components.
- **No response-time promises** — no SLA, no countdown, no "within 24 hours".
- **No WhatsApp anywhere** — no button, bubble, icon, link or mention.
- **Contact paths are a closed list of four:** AI concierge · in-site human follow-up form ·
  site-inspection request · direct phone call _once a number is confirmed_. No phone number
  ships until one is confirmed, so no contact block is designed around one.
- **Panorama elevators exclusively** — no adjacent product lines invented to fill a page.
- **No invented company facts** — no founding year, employee count, certifications, client
  logos, testimonials, awards or metrics. A section that would need one is not built.
- Every piece of copy must belong to the real Egypt Elevators context: panorama elevators,
  installation, inspection, engineering, maintenance, projects, or customer support.
