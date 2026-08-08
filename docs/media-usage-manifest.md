# Media Usage Manifest

**Generated:** 2026-08-08 · Regenerate the underlying data with `node scripts/build-media.mjs`.

> ### Superseded — see the final report
>
> [`FINAL-PRODUCTION-READINESS-REPORT.md`](FINAL-PRODUCTION-READINESS-REPORT.md) (2026-08-08) is
> the current status of this project. It records the Contact rebuild, the AI concierge, the
> first real performance measurement, the Bun/gstack installation, the git checkpoints, and the
> two remaining blockers. This document is kept as the record of an earlier phase.

Every unique **original** under `assets/`, what happens to it, and — where it does not ship —
why. Optimised derivatives in `public/media/` are **not** counted as separate originals; they
are outputs of `scripts/build-media.mjs` and there are several per original (widths, formats,
posters, desktop/mobile video renditions).

Authoritative companions: [`docs/asset-inventory.json`](asset-inventory.json) holds the
per-file rights record, and [`docs/asset-manifest.md`](asset-manifest.md) holds the Phase-0
project grouping. This file is about **placement**.

---

## 1. Totals

|           | Originals | Ship              | Held back |
| --------- | --------- | ----------------- | --------- |
| Video     | 16        | **10** (9 + hero) | 6         |
| Image     | 48        | 31                | 17        |
| **Total** | **64**    | **41**            | **23**    |

### What changed this phase

The site rendered **two** videos. It now renders **ten**.

The cause was not a rendering limit, a `.slice(0, 2)`, a filter on rights, or a missing public
path. `SHIPPABLE_ROLES` in `scripts/build-media.mjs` is a **destination** whitelist, and six
rights-clear films carried roles that were not on it — `optional`, `hero-video-primary`,
`hero-video-alt`. With no destination, the build never generated derivatives for them, so
there was nothing on disk for any component to render. The homepage then narrowed what little
remained: it called `verticalWalkthroughs()`, which is `detail-video` **and** portrait, and
that resolved to two clips.

Both are fixed: the roles now have a destination (the film slider), and the homepage draws
from `productFilms()`.

---

## 2. Video

| Original                                                                                                                    | Type  | Dimensions · duration | Rights                | Status       | Route / section                                        | Desktop                                           | Mobile                   | Loading                                                | Exclusion reason                                                              |
| --------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------- | --------------------- | ------------ | ------------------------------------------------------ | ------------------------------------------------- | ------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `assets/CONPONENTS/1/2026-08-05 23.13.29.mp4`                                                                               | video | ?x? · ?               | brand-name-conflict   | **excluded** | — excluded                                             | —                                                 | —                        | —                                                      | shows the group-6 subject, not group 1; burned-in 'Arab Egypt for elevators'  |
| `assets/CONPONENTS/2/2026-08-05 23.16.18.mp4`                                                                               | video | 1280x720 · 32s        | clear                 | **ships**    | Homepage film slider + /projects/wrought-iron-villa    | Two slides visible; only the active one plays     | One slide + peek of next | Poster first; source attached within 400px of viewport |                                                                               |
| `assets/CONPONENTS/3/2026-08-05 23.12.48.mp4`                                                                               | video | 624x832 · 39s         | clear                 | **ships**    | Homepage film slider + /projects/garden-view-residence | Two slides visible; only the active one plays     | One slide + peek of next | Poster first; source attached within 400px of viewport |                                                                               |
| `assets/CONPONENTS/7/2026-08-05 23.24.59.mp4`                                                                               | video | 624x832 · 28s         | clear                 | **ships**    | Homepage film slider + /projects/chevron-marble-villa  | Two slides visible; only the active one plays     | One slide + peek of next | Poster first; source attached within 400px of viewport |                                                                               |
| `assets/VIDOES/HERO-VDUE/IMG_9128.MP4`                                                                                      | video | ?x? · ?               | brand-name-conflict   | **HERO**     | Homepage hero                                          | Woven between the headline; scrubbed grow/descend | Same, mobile derivative  | Preloaded — the only eagerly loaded media              |                                                                               |
| `assets/VIDOES/MARKTEING-video/AQMyyBWqPWNZ7cGJ9aTQ9fniO14r63GpYLC3XP1cuhwEUNe3c6nZvHnztpjjeVsh6Olx16SQszOUnB_WYVeMBOQ.mp4` | video | ?x? · ?               | clear                 | **excluded** | — excluded                                             | —                                                 | —                        | —                                                      | 360x640 - too low resolution to ship                                          |
| `assets/VIDOES/MARKTEING-video/savefromins.com  0 1080P.mp4`                                                                | video | ?x? · ?               | third-party-watermark | **excluded** | — excluded                                             | —                                                 | —                        | —                                                      | @solephiworks + @mohamedm credits; Arabic captions                            |
| `assets/VIDOES/MARKTEING-video/savefromins.com  0 720P.mp4`                                                                 | video | ?x? · ?               | people-consent        | **excluded** | — excluded                                             | —                                                 | —                        | —                                                      | Arabic presenter advertisement — contains third-party-branded B-roll mid-film |
| `assets/VIDOES/MARKTEING-video/video.mp4`                                                                                   | video | ?x? · ?               | people-consent        | **excluded** | — excluded                                             | —                                                 | —                        | —                                                      | Arabic presenter advertisement — contains third-party-branded B-roll mid-film |
| `assets/VIDOES/SHOW PRODUT video/2026-08-05 23.11.30.mp4`                                                                   | video | ?x? · ?               | brand-name-conflict   | **excluded** | — excluded                                             | —                                                 | —                        | —                                                      | cyan-lit corridor; 'Arab Egypt for elevators' script mark                     |
| `assets/VIDOES/SHOW PRODUT video/2026-08-05 23.12.11.mp4`                                                                   | video | 464x848 · 32s         | clear                 | **ships**    | Homepage film slider                                   | Two slides visible; only the active one plays     | One slide + peek of next | Poster first; source attached within 400px of viewport |                                                                               |
| `assets/VIDOES/SHOW PRODUT video/2026-08-05 23.13.14.mp4`                                                                   | video | 624x832 · 22s         | clear                 | **ships**    | Homepage film slider                                   | Two slides visible; only the active one plays     | One slide + peek of next | Poster first; source attached within 400px of viewport |                                                                               |
| `assets/VIDOES/SHOW PRODUT video/2026-08-05 23.17.10.mp4`                                                                   | video | 960x540 · 28s         | clear                 | **ships**    | Homepage film slider + /projects/chandelier-hall-villa | Two slides visible; only the active one plays     | One slide + peek of next | Poster first; source attached within 400px of viewport |                                                                               |
| `assets/VIDOES/SHOW PRODUT video/2026-08-05 23.20.17.mp4`                                                                   | video | 1280x720 · 41s        | clear                 | **ships**    | Homepage film slider + /projects/parquet-salon-villa   | Two slides visible; only the active one plays     | One slide + peek of next | Poster first; source attached within 400px of viewport |                                                                               |
| `assets/VIDOES/SHOW PRODUT video/2026-08-05 23.24.56.mp4`                                                                   | video | 464x848 · 86s         | clear                 | **ships**    | Homepage film slider                                   | Two slides visible; only the active one plays     | One slide + peek of next | Poster first; source attached within 400px of viewport |                                                                               |
| `assets/VIDOES/SHOW PRODUT video/savefromins.com  0 720P.mp4`                                                               | video | 640x1138 · 41s        | clear                 | **ships**    | Homepage film slider                                   | Two slides visible; only the active one plays     | One slide + peek of next | Poster first; source attached within 400px of viewport |                                                                               |

### The six held-back videos

None of these is a layout problem, and no layout change can include them. They are Phase-0
rights decisions and they hold until the company supplies written permission.

| Original                                       | Blocker                                                                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MARKTEING-video/savefromins.com  0 720P.mp4`  | **Identifiable person, no publication consent.** An Arabic presenter advertisement. It also cuts to third-party-branded B-roll partway through — a "DAR" mark around 15s. |
| `MARKTEING-video/video.mp4`                    | **Identifiable person, no publication consent.** Same format; a pyramid mark appears around 10s.                                                                          |
| `MARKTEING-video/savefromins.com  0 1080P.mp4` | **Third-party watermark** — `@solephiworks` and `@mohamedm` creator credits burned in.                                                                                    |
| `MARKTEING-video/AQMyyB…OQ.mp4`                | **360x640.** Below anything that can be shown honestly; upscaling it would be visible.                                                                                    |
| `CONPONENTS/1/2026-08-05 23.13.29.mp4`         | **Burned-in "Arab Egypt for elevators"**, which contradicts the site's English brand name, _and_ it shows the group-6 subject rather than group 1.                        |
| `SHOW PRODUT video/2026-08-05 23.11.30.mp4`    | **Burned-in "Arab Egypt for elevators"** script mark.                                                                                                                     |

> **A conflict worth stating plainly.** The brief asks for a marketing slider containing every
> marketing video — "if there are four videos, all four must exist in the slider". All four
> files in `MARKTEING-video/` are blocked above: two for consent, one for a third-party
> credit, one for resolution. Shipping them would breach the binding rules in `CLAUDE.md`, so
> the slider carries the **nine rights-clear product and project films instead**. Supplying
> per-person consent and written rights would unblock up to three of the four; the 360x640
> file cannot be rescued at any resolution.

> **The hero's burned-in text is a separate, accepted case.** `IMG_9128.MP4` also carries
> "ARAB EGYPT FOR ELEVATORS" and is shipped anyway, under an explicit and recorded instruction
> from the project owner. It is the one exception, it is enforced by a named approval in
> `scripts/build-media.mjs`, and it remains a known open item.

---

## 3. Images

| Folder                     | Originals | Ship            | Where they go                                                                                                                                                       | Held back                                                                                                    |
| -------------------------- | --------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `assets/CONPONENTS/1..9`   | 35        | 27              | Project galleries, project detail pages, homepage ascent, process section                                                                                           | 8 — third-party brand marks (GAIA, THREE SLABS, Ahmed Hussein, Concept/Thraa Refaat, Rh, CHANGYMO, PYRAMIDS) |
| `assets/PHOTO WITH ACTORS` | 7         | 4               | Social-proof row — only frames where an elevator is actually present                                                                                                | 3 — no elevator in frame, so no project context; people-consent applies to all 7                             |
| `assets/GENERALIMGA`       | 5         | 0               | —                                                                                                                                                                   | 5 — the folder is wholly excluded by the Phase-0 rights audit                                                |
| `assets/LOGO`              | 1         | 0 (transformed) | Not shipped as-is. `scripts/build-logo.mjs` crops it to `public/media/brand/logo-badge.webp` (navbar, footer) and `logo-square.png` (favicon, PWA, structured data) | —                                                                                                            |

By role, of the 31 shipping images: **15** gallery · **7** hero-still · **5** process ·
**4** social-proof.

### Known gaps against the brief

Recorded honestly rather than marked done:

- **`GENERALIMGA` gallery — not built.** All five originals are excluded by the Phase-0 rights
  audit, so there is nothing rights-clear to build a matrix from. This needs a rights decision,
  not a component.
- **`PHOTO WITH ACTORS` editorial gallery — not built.** Four of the seven are usable and
  currently appear in the social-proof row; a dedicated people-and-installations gallery is
  still outstanding.
- **Nine-project presentation — not rebuilt.** The projects index still uses the previous
  layout.

---

## 4. Loading strategy

| Media                 | Strategy                                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero video            | The only eagerly loaded media on the site. Desktop and mobile renditions; `HeroVideo` declines to fetch either under reduced motion, Save-Data, or a 2g/3g connection, and shows the poster.                   |
| Slider films          | Poster first. `useVideoAutoplay` attaches no `src` at all until the clip is within 400px of the viewport, then plays only while ≥45% visible. Opening the page downloads **zero** below-fold video bytes.      |
| Simultaneous playback | Capped at one. Visibility alone is insufficient in a horizontal rail — two slides can be fully on screen — so the rail passes an explicit `active` permission and only the current slide is allowed to decode. |
| Images                | `next/image` with per-slot `sizes`. `maxImageWidth()` caps the drawn width at `intrinsic / 2 × 1.15`, so nothing is ever upscaled past the point where softness shows.                                         |
| Originals             | `assets/` is never served. Only `public/media/` derivatives reach the browser; the 187MB source drop is untracked and local-only.                                                                              |
