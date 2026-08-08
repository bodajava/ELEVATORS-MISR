# Asset Manifest — Egypt Elevators

**Generated:** 2026-08-06 · **Source:** `assets/` (read-only, never modified)
**Method:** every file probed with `ffprobe` for real dimensions/duration/codec, then visually
inspected via generated contact sheets and filmstrips. Nothing here is inferred from filenames —
filenames are capture timestamps and carry no meaning.

**Totals:** 64 files / 187 MB — 43 JPG, 5 PNG, 16 MP4. All videos are H.264, 30fps, and **all carry
an audio track**.

---

## 1. Headline constraints

| #   | Constraint                                                                                                                                                       | Consequence for the build                                                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Every photo is capped at 1280px on the long edge.**                                                                                                            | 1280px is the maximum honest render width. Never upscale. `next/image` `sizes` must be authored so no layout requests more than the source provides. |
| 2   | **The designated hero video is 848×464** — lower than 720p, handheld, 36.6s.                                                                                     | Cannot be a full-bleed background. Use only inside a framed media window ≤848px CSS px wide.                                                         |
| 3   | **Two clips are true 1920×1080** and are the highest-quality motion assets in the drop.                                                                          | These, not the "HERO" folder clip, are the strongest hero candidates.                                                                                |
| 4   | **13 of 48 images carry a third-party brand watermark** (plus 1 video).                                                                                          | Quarantined until rights are confirmed. See §4.                                                                                                      |
| 5   | **Egypt Elevators' own watermark position is inconsistent** (bottom-left, bottom-right, or top-left) and most photos also carry a large translucent centre mark. | No global crop rule is safe. Crop windows must be authored per image. Never overlay a second logo.                                                   |
| 6   | **All marketing videos are Arabic-only with burned-in Arabic captions.**                                                                                         | There is no English motion asset. Content parity gap — see §6.                                                                                       |
| 7   | **Photos are portrait phone captures at inconsistent ratios** (3:4, 4:5, 0.86:1, 1:2, 1:1).                                                                      | Every media slot needs an explicit aspect-ratio container; no fixed-ratio grid can hold them all without bad crops.                                  |

---

## 2. Project groups

`assets/CONPONENTS/1..9` are the nine supplied groups. **Visual inspection shows the folder numbering
is not a reliable one-folder-one-project index** — three folders break the assumption. Findings below
are what the images actually show.

| Group | Files         | Finish                       | Setting                                                                                                                                       | Integrity                                                                                                                                                                                | Verdict                            |
| ----- | ------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **1** | 5 jpg + 1 mp4 | Black/smoked glass           | Marble stair hall                                                                                                                             | ⚠ Images 1–3 (cool grey marble) and 4–5 (warm beige, wood stair) look like **two different interiors**. The MP4 matches **neither** — it shows the group-6 black-glass/balustrade villa. | Split or confirm                   |
| **2** | 4 jpg + 1 mp4 | Polished gold/brass          | Classical villa, chandelier, palm, dark marble stair                                                                                          | ⚠ The 4 photos are one installation. The 1920×1080 MP4 in this folder shows a **different villa** (cream walls, wrought-iron balustrade).                                                | Photos usable; video is standalone |
| **3** | 3 jpg + 1 mp4 | Dark smoked glass            | Modern minimal home, wood floor, garden glazing                                                                                               | ✅ Photos and video are the same installation.                                                                                                                                           | **Ready**                          |
| **4** | 3 jpg         | Gold/brass, faceted plan     | Classical villa, wood parquet, teal sofas                                                                                                     | ✅ Consistent. Matches `SHOW PRODUT/23.20.17.mp4` (1080p).                                                                                                                               | **Ready**                          |
| **5** | 3 jpg         | Gold/brass                   | Dark wood + black marble stair, parquet                                                                                                       | ✅ Consistent.                                                                                                                                                                           | **Ready**                          |
| **6** | 5 jpg         | Black glass                  | 3 different interiors                                                                                                                         | ⛔ **All five carry third-party marks** (GAIA ×2, THREE SLABS ×3).                                                                                                                       | **Quarantined**                    |
| **7** | 4 jpg + 1 mp4 | Bronze/gold glass            | Modern villa, black-and-white chevron marble floor                                                                                            | ⚠ 1 photo clean, **3 carry "AHMED HUSSEIN DESIGNS"**. Video is clean and matches.                                                                                                        | 1 photo + video usable             |
| **8** | 5 jpg         | Gold/brass                   | **Two projects**: (a) 2 photos, plain wood-floor stair, mid-installation; (b) 3 narrow 621×1280 crops, ornate gilded palace, mid-installation | ✅ Clean, but split into two, and both are **visibly under construction**.                                                                                                               | Usable as _process_ content        |
| **9** | 3 jpg         | Gold/champagne, faceted plan | Classical villa, beige marble                                                                                                                 | ✅ Consistent.                                                                                                                                                                           | **Ready**                          |

**Deterministic slugs** (stable output names, used for derivative filenames and URLs):

| Slug                      | Source                                                     | Finish      |
| ------------------------- | ---------------------------------------------------------- | ----------- |
| `grey-marble-stair-hall`  | CONPONENTS/1 (23.14.01, 23.14.05, 23.14.20)                | black-glass |
| `warm-stone-stair`        | CONPONENTS/1 (23.14.28, 23.14.34) — _pending confirmation_ | black-glass |
| `chandelier-hall-villa`   | CONPONENTS/2 photos + `SHOW PRODUT/23.17.10.mp4`           | gold        |
| `garden-view-residence`   | CONPONENTS/3 photos + video                                | black-glass |
| `parquet-salon-villa`     | CONPONENTS/4 photos + `SHOW PRODUT/23.20.17.mp4`           | gold        |
| `dark-timber-stair-villa` | CONPONENTS/5                                               | gold        |
| `chevron-marble-villa`    | CONPONENTS/7 (23.12.40 only) + video                       | bronze      |
| `timber-stair-install`    | CONPONENTS/8 (23.20.32, 23.20.35)                          | gold        |
| `gilded-hall-install`     | CONPONENTS/8 (23.20.51, 23.20.54, 23.20.57)                | gold        |
| `beige-marble-villa`      | CONPONENTS/9                                               | gold        |
| `wrought-iron-villa`      | CONPONENTS/2 video only                                    | gold        |

That is **10 presentable installations**, of which 8 have clean stills.

---

## 3. Video inventory

| File                               | Display   | Ratio  | Dur       | Size    | Content                                           | Burned-in marks                                           | Recommended use                        |
| ---------------------------------- | --------- | ------ | --------- | ------- | ------------------------------------------------- | --------------------------------------------------------- | -------------------------------------- |
| `SHOW PRODUT/23.20.17.mp4`         | 1920×1080 | 16:9   | 40.8s     | 38.5 MB | Villa walkthrough → gold elevator (= group 4)     | Arabic diagonal + badge                                   | **Primary hero candidate.** Trim 6–9s  |
| `CONPONENTS/2/23.16.18.mp4`        | 1920×1080 | 16:9   | 32.3s     | 32.1 MB | Cream villa, wrought-iron stair, gold elevator    | Arabic diagonal + badge                                   | **Alternate hero.** Trim 6–9s          |
| `VIDOES/HERO-VDUE/IMG_9128.MP4`    | 848×464   | 1.83:1 | 36.6s     | 7.3 MB  | **Commercial storefront** install, street visible | "NEW PROJECT" + **"ARAB EGYPT FOR ELEVATORS"**            | Framed window only. See §5             |
| `SHOW PRODUT/23.11.30.mp4`         | 960×1280  | 3:4    | 21.0s     | 7.6 MB  | Modern corridor, cyan light, gold car interior    | "Arab Egypt for elevators" script                         | Product story, portrait                |
| `SHOW PRODUT/23.17.10.mp4`         | 960×540   | 16:9   | 27.9s     | 7.3 MB  | = group 2 chandelier villa                        | Arabic diagonal + badge                                   | Project detail (low res)               |
| `SHOW PRODUT/23.12.11.mp4`         | 464×848   | 9:16   | 31.8s     | 6.3 MB  | —                                                 | —                                                         | Low res; optional                      |
| `SHOW PRODUT/23.13.14.mp4`         | 624×832   | 3:4    | 22.4s     | 4.5 MB  | —                                                 | —                                                         | Low res; optional                      |
| `SHOW PRODUT/23.24.56.mp4`         | 464×848   | 9:16   | **85.7s** | 17.1 MB | Handheld villa walkthrough, gold elevator         | **none**                                                  | Too long/low-res. Skip or heavily trim |
| `SHOW PRODUT/savefromins 720P.mp4` | 720×1280  | 9:16   | 40.5s     | 6.6 MB  | —                                                 | —                                                         | Optional                               |
| `CONPONENTS/3/23.12.48.mp4`        | 624×832   | 3:4    | 38.8s     | 7.7 MB  | = group 3, person entering car                    | Arabic + badge                                            | Project detail                         |
| `CONPONENTS/7/23.24.59.mp4`        | 624×832   | 3:4    | 27.6s     | 5.5 MB  | = group 7 chevron villa                           | **none**                                                  | Project detail                         |
| `CONPONENTS/1/23.13.29.mp4`        | 480×640   | 3:4    | 18.7s     | 1.6 MB  | Black glass, balustrade villa (= group 6 subject) | "Arab Egypt for elevators"                                | Low res                                |
| `MARKTEING/savefromins 1080P.mp4`  | 1080×1920 | 9:16   | 39.6s     | 16.2 MB | Presenter ad + B-roll                             | Arabic captions, **@solephiworks**, **@mohamedm…** credit | ⛔ third-party credits — verify        |
| `MARKTEING/savefromins 720P.mp4`   | 720×1280  | 9:16   | 22.6s     | 3.6 MB  | Presenter ad, **opens with animated logo bumper** | Arabic captions                                           | Media story (AR)                       |
| `MARKTEING/video.mp4`              | 720×1280  | 9:16   | 29.1s     | 2.9 MB  | Presenter ad, gold circular badge                 | Arabic captions                                           | Media story (AR)                       |
| `MARKTEING/AQMyy…mp4`              | 360×640   | 9:16   | 35.7s     | 1.3 MB  | —                                                 | —                                                         | ⛔ Too low-res to ship                 |

> **Correction to `CLAUDE.md`:** the two `savefromins` files in `MARKTEING-video` are **not** 720P/1080P
> variants of one source — they are different clips (22.6s vs 39.6s). Do not de-duplicate them.

---

## 4. Rights register — third-party marks

Confirmed by cropping and inspecting each mark at full resolution.

| Mark                              | Appears on                                | Nature                                                         |
| --------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| **GAIA DESIGN HOUSE**             | `CONPONENTS/6` ×2, `GENERALIMGA/23.12.31` | Interior design studio                                         |
| **THREE SLABS**                   | `CONPONENTS/6` ×3                         | Stone/marble supplier                                          |
| **AHMED HUSSEIN DESIGNS™**        | `CONPONENTS/7` ×3                         | Design studio                                                  |
| **Concept — Thraa Refaat**        | `GENERALIMGA/23.13.33`                    | Design studio ("Real shot")                                    |
| **Rh Designs**                    | `GENERALIMGA/23.24.43`                    | Design studio                                                  |
| **CHANGYMO — "Change your life"** | `GENERALIMGA/23.24.43`                    | **Elevator manufacturer** — may indicate third-party equipment |
| **PYRAMIDS**                      | `GENERALIMGA/Screenshot 23.10.31`         | Unidentified brand                                             |
| **TikTok handle**                 | `GENERALIMGA/23.12.31`                    | Screen-recorded social post                                    |
| **@solephiworks**, **@mohamedm…** | `MARKTEING/savefromins 1080P`             | Videographer/creator credits                                   |

**Consequence:** `assets/GENERALIMGA/` is **100% contaminated** (5 of 5) and `CONPONENTS/6` is **100%
contaminated** (5 of 5). Both are excluded from the build until written rights confirmation arrives.

**Clean, shippable product photography: 27 images** (of 48 total images), spread across 10 installation
slugs. Plus 6 clean videos. That is enough for a strong projects section without touching anything
quarantined.

---

## 5. Brand-name conflict in the media

Three videos carry a burned-in English name — **"ARAB EGYPT FOR ELEVATORS"** / _"Arab Egypt for
elevators"_ — which is a different English rendering of مصر العربية للمصاعد than the website brand
**"Egypt Elevators"**. Burned-in text cannot be removed without re-cropping or covering it.

Affected: `HERO-VDUE/IMG_9128.MP4`, `SHOW PRODUT/23.11.30.mp4`, `CONPONENTS/1/23.13.29.mp4`.

**This is a business decision, not a technical one** — see the blocking questions. Options are (a)
adopt "Arab Egypt for Elevators" as the English name, (b) avoid these three clips, or (c) accept the
inconsistency. No option is applied until the user chooses.

---

## 6. People, privacy, and `PHOTO WITH ACTORS/`

7 files. These are **candid phone photos and social-media screenshots**, not art-directed lifestyle
photography.

| File                      | Content                              | Elevator present? |
| ------------------------- | ------------------------------------ | ----------------- |
| `23.24.29.jpg` (1280×960) | 4 people, group selfie               | Yes, background   |
| `23.24.32.jpg` (960×1280) | 4 people in a hall                   | Yes, background   |
| `23.24.35.jpg` (1280×960) | ~10 people posing                    | Yes, background   |
| `Screenshot 23.07.44.png` | 2 people outdoors, olive trees       | **No**            |
| `Screenshot 23.08.02.png` | 2 people on a sofa                   | **No**            |
| `Screenshot 23.08.07.png` | 2 people in a room                   | **No**            |
| `Screenshot 23.10.10.png` | 2 people, glass elevator + lit stair | Yes, foreground   |

Every face is clearly identifiable. Three files contain **no elevator at all** and therefore carry
privacy risk with zero product value.

**Recommendation:** ship none of these in the first pass. Build the social-proof section so it works
without them and can accept them later. Personal photographs of identifiable people are personal data
under Egypt's Personal Data Protection Law (Law 151/2020); "the company supplied them" is not the same
as "each person consented to publication on a marketing website."

---

## 7. Logo

`assets/LOGO/2026-08-05 23.24.46.jpg` — **1024×1024 JPG, opaque, photographic background.**

It is a rendered 3D badge (gold arch + gears + Arabic wordmark مصر العربية للمصاعد) composited over a
photo of a marble-and-glass elevator lobby. It is **not** a navbar-ready asset: no transparency, square,
and it carries its own background imagery.

- The wordmark is **Arabic-only**. There is no English lockup.
- A cleaner still of the same badge appears in `MARKTEING/savefromins 720P.mp4`'s opening bumper.
- **No replacement logo will be fabricated.** The layout takes the logo from one config entry
  (`src/content/company.ts → brand.logo`) so a future SVG/transparent PNG is a one-line swap.
- Until then the header uses a **typographic wordmark** plus the arch motif drawn as inline SVG —
  derived from the logo's geometry, not a redrawn copy of it.

---

## 8. Derivative pipeline (planned, Phase 1)

Originals are never touched. `sharp` and `ffmpeg` write into `public/media/**`.

**Images** → AVIF + WebP + JPEG fallback at widths `[400, 640, 828, 1080, 1280]`, capped at the
source's real width. Blur placeholders generated as inline base64. Output name:
`<project-slug>-<nn>.<ext>`.

**Videos** → two derivatives each: an MP4 (H.264, yuv420p, `+faststart`) and a WebM (VP9), plus a
poster frame extracted at a hand-chosen timestamp. Hero loop is **muted, 6–9s, no audio track**
(audio stripped, saving bandwidth and avoiding autoplay blocking). Long-form clips keep audio and
play only on explicit interaction.

**Budget targets:** hero loop < 1.5 MB; any project video < 3 MB; poster < 80 KB.

---

## 9. Machine-readable index

`docs/asset-inventory.json` holds the full probe output (64 records: path, bytes, coded and display
dimensions, rotation, aspect, orientation, codec, duration, fps, bitrate, audio presence) plus the
group/rights classification above. The build pipeline reads that file; this document is its
human-readable companion.
