# Marketing Video Replacement Plan

**Date:** 2026-08-08 · **Status:** plan only — no video has been generated
**Replaces:** the four blocked films in `assets/VIDOES/MARKTEING-video/`
**Related:** [`media-usage-manifest.md`](media-usage-manifest.md) ·
[`FINAL-PRODUCTION-READINESS-REPORT.md`](FINAL-PRODUCTION-READINESS-REPORT.md)

---

## 0. Provider status — nothing was generated

No AI-video provider is configured and none was invoked. Checked and absent:

| Credential                                                       | State         |
| ---------------------------------------------------------------- | ------------- |
| `VEO_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_API_KEY`                | absent        |
| `RUNWAY_API_KEY`, `RUNWAYML_API_SECRET`                          | absent        |
| `REPLICATE_API_TOKEN`, `FAL_KEY`, `LUMA_API_KEY`, `PIKA_API_KEY` | absent        |
| `.env` / `.env.local` on disk                                    | do not exist  |
| `veo` / `runway` / `replicate` / `fal` / `comfy` CLI             | not installed |
| Any provider SDK in `package.json`                               | none          |

So this document is the complete specification, with copy-ready prompts. **No file was
produced, and no placeholder was written into the manifest.** The public slider keeps its nine
approved films, unchanged, until real replacements exist and are approved.

> One option worth naming rather than hiding: a Higgsfield video tool is reachable from this
> session. It is a **different provider** from the two specified, and it would spend the
> account's credits. It was not used. If you want generation attempted through it, say so and
> which of the four films to start with.

---

## 1. What the source material actually allows

Three constraints were measured, not assumed, and they shape every shot below.

### 1.1 Every rights-clear still is portrait

All 28 shipping stills are portrait, 947–1114 px wide by 1280 px tall. There is no landscape
photograph in the rights-clear set.

**Consequence for the 16:9 target.** A 16:9 band cut from a 1280-tall portrait is at most:

| Source      | 16:9 band      |
| ----------- | -------------- |
| 1114 × 1280 | **1114 × 627** |
| 960 × 1280  | **960 × 540**  |
| 621 × 1280  | **621 × 349**  |

The brief asks for "1920 × 1080 **when source quality permits**". It does not permit.
**Deliver 1280 × 720**, upscaled at most ~15% from a 1114-wide band — the same honesty rule the
site already applies to stills via `maxImageWidth()`. Anything larger is invented detail.

The alternative — generative outpainting to fill a 16:9 frame — is **rejected**: it would
invent architecture, which the brief forbids ("no construction distortion", "no invented
engineering features", "no changing doors, stairs, walls, or elevator dimensions").

### 1.2 The photographs carry the company's own watermark

Sampled on `chandelier-hall-villa-79845c-1114.jpg`: an **opaque** company badge in the
**bottom-right**, roughly 210 × 230 px — about 19% of frame width. It is the company's own
mark, so it is not a rights problem, but the brief requires no watermark in the output.

**It is croppable, and that decides the crop.** Taking the 16:9 band from the **top** of each
portrait excludes the badge entirely and keeps the subject — car, glass, brass, stair — which
all sit in the upper two thirds.

> Verify the badge position on every image before cropping. `CLAUDE.md` records some frames as
> carrying a translucent centre mark as well; a centre mark **cannot** be cropped out, and any
> image showing one is unusable for this purpose. Reject it rather than attempt removal.

**Do not remove the watermark by any means** — not by inpainting, not by a generative "clean
plate", not by an object-removal tool. That restriction is absolute and applies to third-party
marks in the blocked films too.

### 1.3 Existing approved footage is mostly portrait as well

Of the nine approved films, three are landscape (1280×720 ×2, 960×540 ×1). Those three may be
used directly as live-action inserts. The six portrait clips may not be stretched to 16:9.

---

## 2. Global creative direction

Applies to all four films, and should be pasted into every generation.

|           |                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------- |
| Look      | Photorealistic premium architectural commercial. Not stylised, not cinematic-teal, not HDR-crushed       |
| Camera    | Slow, stabilised, single continuous move per shot. Dolly, rise, or parallax — never handheld, never whip |
| Lighting  | Warm natural interior. Preserve the source's own light direction                                         |
| Materials | Real glass refraction, real brass specularity, real stone veining                                        |
| Geometry  | The elevator's proportions, door positions, stair rise and wall lines must not change                    |
| People    | **None**, in any frame, including reflections                                                            |
| Text      | **None** — no captions, no titles, no UI, no signage                                                     |
| Logos     | **None** — no AI-generated mark, no brand name, no plate                                                 |
| Claims    | **None** — no numbers, no years, no counts                                                               |
| Audio     | **None** — the site never autoplays sound                                                                |

### Global negative prompt

Paste verbatim into every generation:

```
people, person, human, face, hands, silhouette, reflection of a person, crowd,
text, caption, subtitle, title card, watermark, logo, brand name, signage, numbers, dates,
warping walls, bending stairs, melting glass, morphing doors, changing elevator dimensions,
extra floors, extra doors, duplicated railings, impossible geometry, structural distortion,
plastic materials, cartoon, illustration, 3d render look, cgi, oversaturated, HDR halo,
teal and orange grade, lens flare, vignette, film grain overlay, motion blur smear,
camera shake, handheld wobble, whip pan, zoom punch, fisheye, dutch angle
```

---

## 3. The four films

Source paths below are the **derivatives already on disk**, which are the exact files to
upload. All are `rights: clear`.

---

### Film 1 — `marketing-01-architectural-reveal`

**Panorama elevator architectural reveal.** The car as part of the building, not an addition.

|           |                                                                                                    |
| --------- | -------------------------------------------------------------------------------------------------- |
| Duration  | 12s final, from two 6s shots                                                                       |
| Rights    | All sources `rights: clear`, company-owned                                                         |
| Output    | `public/media/videos/marketing-01-architectural-reveal.mp4` — 1280×720, H.264, no audio, faststart |
| Mobile    | `marketing-01-architectural-reveal-mobile.mp4` — 720×720 centre crop, ≤1.5 MB                      |
| Poster    | `public/media/posters/marketing-01-architectural-reveal.webp` — 1280×720, ≤250 KB                  |
| Placement | **Slider position 1.** It is the clearest single statement of what the company builds              |

**Approved sources**

| Shot | File                                                          | Crop                     |
| ---- | ------------------------------------------------------------- | ------------------------ |
| 1A   | `public/media/projects/chandelier-hall-villa-79845c-1114.jpg` | top 16:9 band → 1114×627 |
| 1B   | `public/media/projects/grey-marble-stair-hall-9dbd9e-960.jpg` | top 16:9 band → 960×540  |

**Shot list**

| #   | Shot                                                          | Move                                               | Seconds |
| --- | ------------------------------------------------------------- | -------------------------------------------------- | ------- |
| 1A  | Brass-and-glass car in the classical hall, stair to its right | Slow dolly-in along the marble floor, 6% push      | 0–6     |
| 1B  | Dark glass car against grey marble and the pale stair         | Slow vertical rise, 5% travel, following the shaft | 6–12    |

**Frame strategy.** First frame = the unmodified source crop, so the film opens on a real
photograph. Last frame = near-identical composition with the push resolved, so the clip loops
without a visible cut. Ask for a **static final 12 frames** to make the loop clean.

**Veo 3.1 prompt (shot 1A)**

```
Photorealistic architectural commercial. Static interior of a private villa entrance hall: a
brass-framed glass panorama elevator car standing beside a dark marble staircase, polished
stone floor reflecting warm downlights, tall palm plant at left. Camera performs one slow,
stabilised dolly-in of about six percent, holding the elevator centred. Nothing else moves
except light shifting across the brass and the glass. Warm natural interior lighting, real
glass refraction, real brass specularity. Elevator proportions, door positions and stair
geometry remain exactly as in the source image. Final second is static. No people, no text,
no logo.
```

**Runway Gen-4.5 prompt (shot 1A)**

```
Slow stabilised dolly-in, 6% push, locked horizon. Subject: brass and glass panorama elevator
in a marble villa hall. Motion limited to light travelling across brass and glass; architecture
completely static. Photoreal, warm interior lighting, no grade shift. Hold last 12 frames.
```

---

### Film 2 — `marketing-02-glass-and-brass`

**Materials film.** The two finishes the work genuinely divides on, and nothing else.

|           |                                                                                    |
| --------- | ---------------------------------------------------------------------------------- |
| Duration  | 14s final, from three 5s shots                                                     |
| Rights    | All sources `rights: clear`                                                        |
| Output    | `public/media/videos/marketing-02-glass-and-brass.mp4` — 1280×720                  |
| Mobile    | `marketing-02-glass-and-brass-mobile.mp4` — 720×900 (4:5)                          |
| Poster    | `public/media/posters/marketing-02-glass-and-brass.webp`                           |
| Placement | **Slider position 3**, after a project film — it reads as detail, not as an opener |

**Approved sources**

| Shot | File                                                           | Crop                |
| ---- | -------------------------------------------------------------- | ------------------- |
| 2A   | `public/media/projects/chandelier-hall-villa-3eb39f-1099.jpg`  | top 16:9 → 1099×618 |
| 2B   | `public/media/projects/parquet-salon-villa-4126a2-960.jpg`     | top 16:9 → 960×540  |
| 2C   | `public/media/projects/dark-timber-stair-villa-2afffc-960.jpg` | top 16:9 → 960×540  |

**Shot list**

| #   | Shot                                      | Move                                     | Seconds |
| --- | ----------------------------------------- | ---------------------------------------- | ------- |
| 2A  | Brass frame and glass junction, close     | Lateral parallax, 4%                     | 0–5     |
| 2B  | Faceted car against parquet and warm wall | Slow rise, 4%                            | 5–9     |
| 2C  | Smoked glass against dark timber          | Lateral parallax, opposite direction, 4% | 9–14    |

**Frame strategy.** Each shot opens on its source crop and ends held. Cut on matched
brightness, not on movement, so the three read as one material study.

**Veo 3.1 prompt (shot 2A)**

```
Photorealistic close architectural detail. Brass frame meeting a glass panel on a panorama
elevator car, warm interior light raking across the metal, faint reflections of a marble hall
behind. Camera makes one slow lateral parallax move of about four percent, revealing depth
between the glass layers. Metal and glass remain rigid and exact. Warm natural light, real
specular highlights on brass, real refraction through glass. No people, no text, no logo, no
change to any edge or joint.
```

**Runway Gen-4.5 prompt (shot 2A)**

```
Slow lateral parallax, 4%, locked focal length. Subject: brass frame and glass panel of an
elevator car, macro architectural detail. Only light and reflection move. Photoreal metal and
glass, warm interior key. No geometry change. Hold final frames.
```

---

### Film 3 — `marketing-03-installations`

**Project showcase.** Four finished installations, one after another.

|           |                                                                               |
| --------- | ----------------------------------------------------------------------------- |
| Duration  | 15s final, from four 4s shots                                                 |
| Rights    | All sources `rights: clear`                                                   |
| Output    | `public/media/videos/marketing-03-installations.mp4` — 1280×720               |
| Mobile    | `marketing-03-installations-mobile.mp4` — 720×1280 (9:16), re-framed per shot |
| Poster    | `public/media/posters/marketing-03-installations.webp`                        |
| Placement | **Slider position 2**                                                         |

**Approved sources**

| Shot | File                                                         | Crop               |
| ---- | ------------------------------------------------------------ | ------------------ |
| 3A   | `public/media/projects/garden-view-residence-2a9c45-965.jpg` | top 16:9 → 965×543 |
| 3B   | `public/media/projects/beige-marble-villa-6804c0-947.jpg`    | top 16:9 → 947×533 |
| 3C   | `public/media/projects/warm-stone-stair-80470f-960.jpg`      | top 16:9 → 960×540 |
| 3D   | `public/media/projects/chevron-marble-villa-957ab0-971.jpg`  | top 16:9 → 971×546 |

**Shot list.** Four 4s beats, each a 3–5% push or rise, alternating direction so the sequence
does not pulse. Overlap the last 8 frames of each into the next as a cross-dissolve.

**Frame strategy.** First frame of 3A and last frame of 3D are both static holds, so the film
can loop in the slider without a jump.

**Veo 3.1 prompt (shot 3A)**

```
Photorealistic architectural commercial. A glass panorama elevator in a contemporary residence,
set where garden glazing meets the staircase, daylight entering from the left. Camera performs
one slow stabilised push-in of about four percent. Architecture is completely static: glazing
bars, stair treads, wall lines and elevator dimensions do not change. Only daylight and
reflections shift. Photoreal, natural daylight, real glass. No people, no text, no logo.
```

**Runway Gen-4.5 prompt (shot 3A)**

```
Slow push-in 4%, stabilised, locked horizon. Subject: glass panorama elevator beside garden
glazing and a staircase. Static architecture, moving light only. Photoreal daylight interior.
No geometry change, no people, no text. Hold last frames.
```

---

### Film 4 — `marketing-04-process`

**Site inspection and design process, without a single person.** Fitting frames, empty shafts,
finish detail — the work, evidenced by what it leaves behind.

|           |                                                           |
| --------- | --------------------------------------------------------- |
| Duration  | 12s final, from three 5s shots                            |
| Rights    | All sources `rights: clear`, `role: process`              |
| Output    | `public/media/videos/marketing-04-process.mp4` — 1280×720 |
| Mobile    | `marketing-04-process-mobile.mp4` — 720×900               |
| Poster    | `public/media/posters/marketing-04-process.webp`          |
| Placement | **Slider position 4**                                     |

**Approved sources**

| Shot | File                                                        | Crop                   | Note                          |
| ---- | ----------------------------------------------------------- | ---------------------- | ----------------------------- |
| 4A   | `public/media/projects/timber-stair-install-9dbdbb-960.jpg` | top 16:9 → 960×540     | mid-installation              |
| 4B   | `public/media/projects/timber-stair-install-c3a477-960.jpg` | top 16:9 → 960×540     | mid-installation              |
| 4C   | `public/media/projects/gilded-hall-install-013cdb-621.jpg`  | top 16:9 → **621×349** | **narrow source — see below** |

> **4C is the weakest link.** At 621 px wide it yields a 621×349 band, which is 48% of the
> 1280×720 target. Either accept it as the shortest beat at reduced sharpness, or drop shot 4C
> and run this film as two shots at 12s. **Do not upscale it to 1280 wide** — that is a 2.06×
> enlargement and it will be visibly soft. Recommendation: **drop 4C**, make the film two shots
> of 6s.

**Shot list (recommended two-shot version)**

| #   | Shot                                                      | Move             | Seconds |
| --- | --------------------------------------------------------- | ---------------- | ------- |
| 4A  | Installation in progress, timber stair, structure exposed | Slow rise, 5%    | 0–6     |
| 4B  | The same space further along, finishes going in           | Slow push-in, 4% | 6–12    |

**Frame strategy.** Open static, close static. This film is the one most likely to be watched
in silence beside the process copy, so it should feel observational rather than promotional.

**Veo 3.1 prompt (shot 4A)**

```
Photorealistic architectural documentary. A panorama elevator shaft mid-installation beside a
timber staircase, structure visible, surfaces not yet finished, natural light from above.
Camera performs one slow stabilised vertical rise of about five percent, following the shaft.
Everything structural stays exactly as photographed: no new beams, no changed openings, no
altered stair rise. Only light shifts. Photoreal, natural light, honest unfinished materials.
No people, no tools moving, no text, no logo.
```

**Runway Gen-4.5 prompt (shot 4A)**

```
Slow vertical rise, 5%, stabilised. Subject: elevator shaft under installation beside a timber
stair. Structure entirely static; light only. Photoreal documentary look, natural light. No
people, no text, no added structure. Hold last frames.
```

---

## 4. Delivery specification

|            |                                                                |
| ---------- | -------------------------------------------------------------- |
| Container  | MP4, H.264 High profile                                        |
| Resolution | **1280 × 720** (not 1920 × 1080 — see §1.1)                    |
| Frame rate | 25 or 30 fps, constant                                         |
| Bitrate    | CRF 23–26, target ≤ 3 MB per film to match the existing budget |
| Audio      | **none** — strip entirely                                      |
| Faststart  | required                                                       |
| Colour     | BT.709, no LUT, no grade shift from source                     |
| Poster     | WebP, 1280 × 720, quality ~72, **≤ 250 KB**                    |

Encode command the project already uses:

```bash
ffmpeg -i input.mp4 -an -c:v libx264 -profile:v high -crf 24 \
  -vf "scale=1280:720:flags=lanczos" -movflags +faststart \
  public/media/videos/marketing-01-architectural-reveal.mp4

ffmpeg -i public/media/videos/marketing-01-architectural-reveal.mp4 \
  -vf "select=eq(n\,0)" -frames:v 1 -c:v libwebp -quality 72 \
  public/media/posters/marketing-01-architectural-reveal.webp
```

---

## 5. Returning the files to the project

1. Place the encoded MP4s in `public/media/videos/` and posters in `public/media/posters/`,
   using exactly the filenames above.
2. Add each film to `docs/asset-inventory.json` with:
   - `rights: "clear"`
   - `role: "marketing-film"`
   - `notes` naming the source images and the generation provider, so provenance survives.
3. Add `marketing-film` to `SHIPPABLE_ROLES` in `scripts/build-media.mjs`.
4. Run `node scripts/build-media.mjs --only=videos`.
5. Run `pnpm test` — `tests/unit/media-rights.test.ts` asserts the gate and currently expects
   **exactly nine** videos. Update that count deliberately, in the same commit, so the change
   is reviewed rather than absorbed.
6. Review each film full-screen before approving: check for warped geometry, any person or
   reflection of one, any text or mark, and any change to door or stair lines.

**Review gate.** Nothing enters the slider until a human has watched all four end to end. The
failure modes of image-to-video are exactly the things this brief forbids — melting glass,
sliding stair treads, hallucinated signage — and they are obvious on screen and invisible in a
manifest.

---

## 6. Rights position

| Film                     | Sources  | Rights               | People | Third-party marks | Claims |
| ------------------------ | -------- | -------------------- | ------ | ----------------- | ------ |
| 1 · architectural reveal | 2 stills | clear, company-owned | none   | none              | none   |
| 2 · glass and brass      | 3 stills | clear, company-owned | none   | none              | none   |
| 3 · installations        | 4 stills | clear, company-owned | none   | none              | none   |
| 4 · process              | 2 stills | clear, company-owned | none   | none              | none   |

Every source is a photograph the company took of its own installation. No footage from the four
blocked films is used — not a frame, not a crop, not a poster, not B-roll. No watermark, credit,
person or logo is removed from anything.

The `PHOTO WITH ACTORS` set is **excluded from all four**: it is `people-consent` material and
these films must contain no identifiable person.
