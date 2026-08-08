# Design System — "Zen Linen"

> **Superseded palette.** "Signal" (cream `#F3F0E8` / carbon `#080D10` / orange `#FF6B00`) was
> replaced on 2026-08-08 by "Zen Linen": linen `#FAF9F5`, ink `#3D3929`, terracotta `#C96442`,
> with a real dark theme. The _structure_ below still holds — two radius scales, restricted
> glass, the travel curve, the single-active invariant, the media rules — only the hues
> changed. Current values and their measured contrast are in [`../DESIGN.md`](../DESIGN.md) §2
> and asserted by `tests/unit/contrast.test.ts`.

## The system this replaced — "Signal"

Supersedes "Aperture" (2026-08-06), which was rejected in review as too pale and visually flat,
with no conversion colour anywhere on the page.

> **Authority.** This document is authoritative on **rationale and implementation detail** —
> why each decision was made, the scroll budgets, the media and video rules, the single-active
> invariant. [`../DESIGN.md`](../DESIGN.md) consolidates the same system into a single
> structured reference (tokens, scales, grid, accessibility, RTL, mobile) and does not replace
> it. Token _values_ live in `src/app/globals.css` `@theme` and that file is authoritative for
> them. Where this document and `DESIGN.md` differ on detail, this one wins.

What survives from Aperture: the dark media well (now curved, not square), the hairline rule
grid, the annotation layer, and the travel easing curve. What does not: the plaster ground, the
"no brand chroma" rule, the near-square radii, and the flat typographic weight.

---

## 1. The idea

**A warm cream page, carbon-black anchor sections cut in under large curves, and one electric
orange that only ever means _act here_.**

Three observations drove it:

1. **The photography is overwhelmingly warm.** Nearly every dominant colour in the source
   images sits at hue 20–30° — gold, bronze, travertine. Cream belongs to that family; the
   previous cool plaster did not, and the page read as though the images had been pasted onto
   it.
2. **The page needed weight.** A uniformly light page gave the eye nowhere to rest and no
   sense of structure. Carbon sections, arriving under a wide curve, give the warm images an
   edge to sit against and break the page into movements.
3. **The site exists to produce one action.** A site whose only job is booking a physical
   inspection needs a colour that means that action and nothing else. Signal orange is that
   colour, and it is spent nowhere else.

### Why orange, and why this orange

`#FF6B00` is deliberately electric rather than terracotta. Cream + serif + terracotta is the
default "editorial luxury" palette; it is what this brief would get from anyone. The orange
comes from the product's own world — the sodium glow of a lit car at night, the safety marks
on a shaft — and it is loud enough to be unmistakably a conversion colour rather than a tint.

It is used in exactly these places, and nowhere else:

- primary CTA fills
- active navigation state (rule + label)
- progress indicators (ascent progress line, proportion bar)
- selected project numbers and ordered-sequence numbers
- small labels where the label marks a live state
- hover fills on controls
- media controller hover
- the footer's drawn rule

The whole page is never orange. If a new orange element is proposed and it is not one of the
above, the answer is no.

---

## 2. Colour

| Token                  | Value     | Use                                              |
| ---------------------- | --------- | ------------------------------------------------ |
| `--color-paper`        | `#F3F0E8` | The page. Warm cream.                            |
| `--color-paper-raised` | `#F8F5EE` | Warm white — glass surfaces, raised cards.       |
| `--color-paper-sunken` | `#E8E3D7` | Warm grey — recessed sections.                   |
| `--color-surface`      | `#EBE6DA` | Warm grey card surface.                          |
| `--color-carbon`       | `#080D10` | Anchor sections and the footer.                  |
| `--color-aperture`     | `#080D10` | The media well.                                  |
| `--color-ink`          | `#0B1013` | Body and display type. Near-black, not grey.     |
| `--color-ink-2`        | `#3D464A` | Secondary type.                                  |
| `--color-ink-3`        | `#656E72` | Annotation type.                                 |
| `--color-ink-on-dark`  | `#F8F5EE` | Type on carbon.                                  |
| `--color-accent`       | `#FF6B00` | Signal orange — fills, rules, display-size type. |
| `--color-accent-hi`    | `#FF7200` | Hover/active lift.                               |
| `--color-accent-text`  | `#A83F00` | The only orange permitted at body size on cream. |
| `--color-on-accent`    | `#080D10` | What sits on an orange fill.                     |

### Contrast rules — checked, not guessed

These two are load-bearing and are the reason there are three orange tokens rather than one:

- **`#FF6B00` on white is 2.9:1 — fails at every size.** Orange fills therefore always carry
  carbon text (`--color-on-accent`), which is 6.8:1. Never white on orange.
- **`#FF6B00` as text on cream is 2.5:1 — fails.** Small orange text uses `--color-accent-text`
  (`#A83F00`, 5.3:1). Full-strength orange on a light ground is for fills, rules, and
  display-size type only.

On carbon the situation reverses: `#FF6B00` on `#080D10` is 6.8:1 and is the correct choice,
while `--color-accent-text` would be nearly invisible. The language switcher carries both
branches for exactly this reason.

---

## 3. Type

Bricolage Grotesque (display) / Schibsted Grotesk (body) / Alexandria (Arabic) / Geist Mono
(annotation layer). Unchanged families; changed handling.

Headings are **700 weight at `wdth` 88 with −0.038em tracking**, tightening to −0.048em at
display sizes. Aperture set them at 500 / −0.028em, which read as polite rather than
confident — the specific complaint in review. The width axis narrows the face because the
shaft is a vertical form; it is not a novelty condensed face.

Arabic suppresses tracking, uppercase and the width axis entirely — it is a connected script
and all three break the joins.

---

## 4. Form

Two radius scales, deliberately far apart, so "surface" and "control" are distinguishable at a
glance:

- **Architecture** — `--radius-media` 20px, `--radius-card` 24px, `--radius-section` 40px,
  `--radius-section-lg` 64px. Sections meet each other on wide curves (`curve-t` / `curve-b`),
  never on a straight seam.
- **Instruments** — `--radius-control` 8px, `--radius-control-lg` 12px. Buttons, inputs, chips.

Nothing sits between the two scales.

### Liquid glass

Used on five surfaces only: the floating navigation, the AI concierge window, the media
controller, a selected interactive project viewer, and toast/confirmation surfaces. The UX
database rates `backdrop-filter` performance moderate-poor and flags text contrast as this
style's characteristic failure mode, so it is not a general-purpose surface and every glass
surface keeps its text at AA.

`glass` (over cream) and `glass-dark` (over carbon) are separate utilities because the same
blur needs different tint and border on each ground. `glass-lit` adds the pointer-light
highlight; with no pointer listener it is inert.

Macintosh-style window chrome — soft radius, top bar, three red/amber/green controls — is
reserved for genuinely window-like components. It is **not** applied to image cards or
sections. No such component exists yet, so nothing currently uses it.

---

## 5. Motion

GSAP for scroll-linked sequences, Motion for React state transitions (the mobile nav dialog).
No element is ever driven by both.

Non-negotiables, all enforced in code:

- `useGSAP()` with a scoped ref; never a bare `useEffect`.
- `gsap.matchMedia()` for every breakpoint and for `prefers-reduced-motion` — never a
  hand-rolled check, because matchMedia reverts automatically when the query stops matching.
- Transforms and `autoAlpha` only. Never `width`, `height`, `top`, `left`.
- ScrollTrigger on the timeline or a top-level tween, never on a tween nested in a timeline.
- Never ship `markers: true`.

### Scroll budgets

| Sequence | Desktop                                    | Mobile     |
| -------- | ------------------------------------------ | ---------- |
| Hero     | 2.5 viewports of scroll + the pinned stage | 1.7        |
| Ascent   | 52vh per floor transition                  | not pinned |

The hero holds its settled frame for roughly the last quarter of its budget, so the film the
sequence resolves on is actually looked at rather than glimpsed.

### The single-active invariant

The pinned ascent must show **exactly one floor** at any moment. It is expressed three ways —
`autoAlpha` (so inactive copy also leaves the accessibility tree and the hit-test), a
deterministic `gsap.set()` baseline written before the timeline exists, and labelled
non-overlapping timeline slots — and asserted in development by `assertSingleActiveFloor`.
The original defect was `yPercent` without opacity: five captions, all at full opacity,
painted on top of one another.

---

## 6. Media

Every source photograph is a phone capture topping out at 1280px on the long edge; portrait
frames are ~960px wide. The supplied hero clip is 848x464. **The layout is sized to the
assets, not the other way round.**

`maxImageWidth()` caps a still at `width / 2 × 1.15` — DPR 2 with a 15% tolerance, which is
where upscaling stops being visible on photographic content. `maxVideoWidth()` uses a looser
1.5 divisor, because inter-frame compression and motion hide scaling softness that a static
photograph would show.

The practical consequence, and the reason the design looks the way it does: **media here is a
set of editorial cards, not full-height panels.** That constraint and the brief's request for
an art-directed asymmetric grid happen to agree.

Other rules:

- `sizes` must describe the real slot. A card in a 5-of-12 column is ~500px wide and must say
  so; inheriting a three-up `28vw` makes the browser fetch a file too small and upscale it.
- `bestImageFor()` picks the highest-resolution frame per project, so the sharpest angle leads
  and weaker ones fall to smaller supporting frames.
- Frames keep their source orientation where forcing a common ratio would crop the subject —
  the social-proof row is a contact sheet with a ragged bottom edge, by design.
- Watermarks are shown honestly. Crops are planned around them, never through them.
- **A stack of frames sharing one opening must be taken out of flow.** Where several images
  occupy the same grid cell so one can be revealed at a time, leaving them in flow lets the
  auto-sized row grow to the tallest _intrinsic_ height in the set — the narrowest source. On
  `/projects` that made every frame 721px inside a 438px aperture, clipped from the bottom, so
  `object-center` centred nothing. `absolute inset-0` on each frame hands the box back to the
  aperture's aspect ratio. `scripts/index-check.mjs` asserts every stacked frame matches the
  opening to within a pixel.
- Where one opening is shared by a set, its width cap is the **narrowest** source's
  `maxImageWidth()`, not the widest — and the grid column should be `auto`, so the unused
  width goes to the content beside it instead of becoming dead air.

### Video behaviour

All showcase video is silent, loops, and plays only when actually on screen. Two observers:
one at `rootMargin: 400px` attaches the source and switches to `preload="metadata"`, one at
`threshold: 0.45` starts and stops playback. Before the first fires the element has no source
at all, so opening the page downloads no video below the fold.

Native controls are never rendered. The replacement is a small `glass-dark` controller, and
the sound toggle appears only when the file actually carries an audio track. Nothing on the
site ever starts audio on its own; `play()` rejections are expected and swallowed.
