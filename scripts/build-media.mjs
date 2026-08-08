/**
 * Asset derivative pipeline.
 *
 * Reads docs/asset-inventory.json, applies the Phase-0 rights decisions, and writes optimised
 * derivatives into public/media/. Source files under assets/ are opened read-only and are
 * never modified, moved, renamed or deleted.
 *
 * Output is deterministic: the same input always produces the same filenames, so derivatives
 * can be cached immutably and regenerated safely.
 *
 *   node scripts/build-media.mjs [--force] [--only=images|videos|hero]
 */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, '..');
const INVENTORY = path.join(ROOT, 'docs/asset-inventory.json');
const OUT_ROOT = path.join(ROOT, 'public/media');
const MANIFEST_OUT = path.join(ROOT, 'src/content/generated/media-manifest.json');

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a) => {
    const m = a.match(/^--([^=]+)=?(.*)$/);
    return m ? [[m[1], m[2] || true]] : [];
  })
);
const FORCE = Boolean(args.force);
const ONLY = args.only ?? null;

/** Source photography is capped at 1280px on the long edge — never request more. */
const IMAGE_WIDTHS = [400, 640, 828, 1080, 1280];

/**
 * The hero loop.
 *
 * ── Source: approved by explicit user instruction ───────────────────────────
 * `assets/VIDOES/HERO-VDUE/IMG_9128.MP4` is the required hero video.
 *
 * PROVENANCE: this approval originates **solely** from the user instruction dated
 * 2026-08-07 that begins "LATEST USER DECISION — AUTHORITATIVE". It did not exist before
 * that instruction. An earlier session wrote a comment and a test asserting a prior approval
 * on this same file; that assertion was false at the time and was removed. This block is the
 * real, and only, record of the decision.
 *
 * Three consequences are accepted deliberately and recorded so they are not later
 * rediscovered as bugs:
 *
 *   1. **Burned-in "ARAB EGYPT FOR ELEVATORS."** It sits across the middle of the frame for
 *      the entire clip and cannot be cropped out without losing the elevator. The site's
 *      English brand is "Egypt Elevators", so the hero carries a different English name from
 *      the navbar beside it. That is a visible brand inconsistency, accepted by instruction.
 *   2. **848x464.** Low resolution for a hero. `maxVideoWidth()` no longer caps the settled
 *      hero, because the instruction specifies an explicit final width of
 *      clamp(760px, 78vw, 1240px). The clip will therefore be displayed above its native
 *      width and will soften. Accepted by instruction; noted for honesty.
 *   3. **A commercial showroom, not a villa.** Cars and a street are visible through the
 *      glass, which reads differently from the residential work elsewhere on the page.
 *
 * ── The loop window ─────────────────────────────────────────────────────────
 * 19s-27s: the camera holds on the brass-and-glass car with the shaft in frame. The opening
 * seconds show an empty lounge with no elevator, which is the worst possible first frame.
 *
 * Audio is stripped: a hero loop carrying audio cannot autoplay reliably.
 */
const HERO = {
  source: 'assets/VIDOES/HERO-VDUE/IMG_9128.MP4',
  slug: 'hero-panorama-showroom',
  start: 19.0,
  duration: 8.0,
  variants: [
    { name: 'desktop', width: 848, crf: 27 },
    { name: 'mobile', width: 640, crf: 30 },
  ],
};

/**
 * Assets the user has explicitly approved despite a non-clear rights classification.
 *
 * The `rights` field in the inventory records what marks an asset physically carries — that
 * is a fact and does not change. This set records a *policy decision* layered on top of it,
 * with the instruction that produced it. Keeping the two separate means the factual record
 * stays honest while the shipping decision remains visible and revocable.
 */
const USER_APPROVED = new Map([
  [
    'assets/VIDOES/HERO-VDUE/IMG_9128.MP4',
    'Required hero video — user instruction 2026-08-07 ("LATEST USER DECISION — AUTHORITATIVE").',
  ],
]);

/* ------------------------------------------------------------------ helpers */

const log = (...a) => console.log(...a);
let written = 0;
let skipped = 0;

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Skip regeneration unless --force or the output is missing. */
async function needsBuild(outPath) {
  if (FORCE) return true;
  if (await exists(outPath)) {
    skipped++;
    return false;
  }
  return true;
}

function shortHash(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 6);
}

/**
 * Stable, descriptive output basename.
 *
 * Source filenames are capture timestamps with no meaning, so the name is built from the
 * project slug plus a short hash of the source path — descriptive and collision-free.
 */
function outputName(record) {
  const slug = record.project_slug === 'unassigned' ? 'clip' : record.project_slug;
  return `${slug}-${shortHash(record.path)}`;
}

/* ------------------------------------------------------------------- rights */

/**
 * Phase-0 rights decisions, encoded so nothing quarantined can reach public/ by accident.
 *
 *  - third-party-watermark : quarantined by default (GAIA, Three Slabs, Ahmed Hussein,
 *    Concept/Thraa Refaat, Rh, CHANGYMO, Pyramids, creator credits).
 *  - brand-name-conflict   : excluded, no exceptions. Burned-in "ARAB EGYPT FOR ELEVATORS"
 *    contradicts the site's English brand name. This covers the clip in the HERO-VDUE folder;
 *    the hero uses an approved villa clip instead, and the assertion below enforces that.
 *  - people-consent        : permitted as supporting social proof, but only where an elevator
 *    is actually present; people-only frames add no project context.
 */
const SHIPPABLE_ROLES = new Set([
  'hero-still',
  'gallery',
  'process',
  'social-proof',
  'detail-video',
]);

/**
 * `media-story` (the two Arabic presenter advertisements) is deliberately NOT shippable.
 *
 * On inspection both films cut to third-party-branded B-roll partway through — a "DAR" mark
 * around 15s in one, a pyramid mark around 10s in the other. That is exactly the brand
 * confusion the rights rule exists to prevent, and unlike a still it cannot be handled by
 * showing the mark honestly, because it appears and disappears mid-playback.
 *
 * They are also advertisements rather than evidence of work: the standard for using
 * third-party-marked material is that it provides unique, necessary evidence, and the project
 * photography and walkthrough videos already carry that load. Documented in the manifest's
 * `excluded` list so the decision is visible rather than silent.
 */
const EXCLUDED_ROLES_REASON = {
  'media-story': 'Arabic presenter advertisement — contains third-party-branded B-roll mid-film',
};

function isShippable(record) {
  if (!SHIPPABLE_ROLES.has(record.role)) return false;
  if (record.rights === 'third-party-watermark') return false;
  if (record.rights === 'brand-name-conflict') return false;
  // People and actor material is authorised, and is used where an elevator is present.
  if (record.rights === 'people-consent') return record.role === 'social-proof';
  return record.rights === 'clear';
}

/* ------------------------------------------------------------------- images */

async function buildImage(record) {
  const src = path.join(ROOT, record.path);
  const base = outputName(record);
  const dir = path.join(OUT_ROOT, record.role === 'social-proof' ? 'actors' : 'projects');
  await mkdir(dir, { recursive: true });

  const meta = await sharp(src).metadata();
  const maxWidth = meta.width ?? 1280;
  const widths = IMAGE_WIDTHS.filter((w) => w <= maxWidth);
  if (widths.length === 0) widths.push(maxWidth);
  // Always include the native width so the largest layout slot is served exactly.
  if (!widths.includes(maxWidth) && maxWidth < Math.max(...IMAGE_WIDTHS)) widths.push(maxWidth);

  const sources = { avif: [], webp: [] };

  for (const w of widths.sort((a, b) => a - b)) {
    for (const [format, opts] of [
      ['avif', { quality: 52, effort: 5 }],
      ['webp', { quality: 76, effort: 5 }],
    ]) {
      const file = `${base}-${w}.${format}`;
      const outPath = path.join(dir, file);
      if (await needsBuild(outPath)) {
        await sharp(src)
          .resize({ width: w, withoutEnlargement: true })
          .toFormat(format, opts)
          .toFile(outPath);
        written++;
      }
      sources[format].push({ width: w, src: `/media/${path.basename(dir)}/${file}` });
    }
  }

  // A JPEG fallback at the native width, for any context that cannot take AVIF/WebP.
  const fallbackFile = `${base}-${maxWidth}.jpg`;
  const fallbackPath = path.join(dir, fallbackFile);
  if (await needsBuild(fallbackPath)) {
    await sharp(src)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(fallbackPath);
    written++;
  }

  // Tiny blurred placeholder, inlined as a data URI so it costs no request.
  const blurBuffer = await sharp(src).resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
  const blurDataURL = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

  return {
    kind: 'image',
    id: base,
    source: record.path,
    projectSlug: record.project_slug,
    role: record.role,
    rights: record.rights,
    width: meta.width,
    height: meta.height,
    aspectRatio: Number(((meta.width ?? 1) / (meta.height ?? 1)).toFixed(4)),
    orientation: record.orientation,
    src: `/media/${path.basename(dir)}/${fallbackFile}`,
    sources,
    blurDataURL,
    notes: record.notes,
  };
}

/* ------------------------------------------------------------------- videos */

/** Hand-picked poster timestamps, in seconds, keyed by source path. */
const POSTER_AT = {
  'assets/CONPONENTS/3/2026-08-05 23.12.48.mp4': 16.2,
  'assets/CONPONENTS/7/2026-08-05 23.24.59.mp4': 20.7,
  'assets/VIDOES/SHOW PRODUT video/2026-08-05 23.17.10.mp4': 7.0,
};

async function encodeVideo({ src, outPath, width, crf, start, duration, mute }) {
  const pre = [];
  if (start != null) pre.push('-ss', String(start));
  const post = [];
  if (duration != null) post.push('-t', String(duration));

  const common = [
    '-y',
    '-v',
    'error',
    ...pre,
    '-i',
    src,
    ...post,
    '-vf',
    `scale=${width}:-2:flags=lanczos`,
    '-movflags',
    '+faststart',
  ];

  const audio = mute ? ['-an'] : ['-c:a', 'aac', '-b:a', '96k'];

  {
    await run('ffmpeg', [
      ...common,
      '-c:v',
      'libx264',
      '-profile:v',
      'high',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      String(crf),
      '-preset',
      'slow',
      ...audio,
      outPath,
    ]);
  }
}

async function extractPoster(src, outPath, atSeconds, width) {
  await run('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    String(atSeconds),
    '-i',
    src,
    '-frames:v',
    '1',
    '-vf',
    `scale=${width}:-2:flags=lanczos`,
    outPath,
  ]);
}

async function buildHero() {
  const src = path.join(ROOT, HERO.source);
  const dir = path.join(OUT_ROOT, 'videos');
  const posterDir = path.join(OUT_ROOT, 'posters');
  await mkdir(dir, { recursive: true });
  await mkdir(posterDir, { recursive: true });

  const variants = {};
  for (const v of HERO.variants) {
    const mp4 = path.join(dir, `${HERO.slug}-${v.name}.mp4`);

    if (await needsBuild(mp4)) {
      await encodeVideo({
        src,
        outPath: mp4,
        width: v.width,
        crf: v.crf,
        start: HERO.start,
        duration: HERO.duration,
        mute: true,
      });
      written++;
    }
    variants[v.name] = {
      mp4: `/media/videos/${path.basename(mp4)}`,
      width: v.width,
      mp4Bytes: (await stat(mp4)).size,
    };
  }

  // Poster: the first frame of the loop, so the swap from poster to video is seamless.
  const posterJpg = path.join(posterDir, `${HERO.slug}.jpg`);
  const posterAvif = path.join(posterDir, `${HERO.slug}.avif`);
  if (await needsBuild(posterJpg)) {
    await extractPoster(src, posterJpg, HERO.start, 1280);
    written++;
  }
  if (await needsBuild(posterAvif)) {
    await sharp(posterJpg).avif({ quality: 55 }).toFile(posterAvif);
    written++;
  }
  const blur = await sharp(posterJpg).resize({ width: 16 }).webp({ quality: 40 }).toBuffer();

  return {
    kind: 'hero',
    id: HERO.slug,
    source: HERO.source,
    start: HERO.start,
    duration: HERO.duration,
    muted: true,
    variants,
    poster: `/media/posters/${path.basename(posterJpg)}`,
    posterAvif: `/media/posters/${path.basename(posterAvif)}`,
    blurDataURL: `data:image/webp;base64,${blur.toString('base64')}`,
  };
}

async function buildVideo(record) {
  const src = path.join(ROOT, record.path);
  const base = outputName(record);
  const dir = path.join(OUT_ROOT, 'videos');
  const posterDir = path.join(OUT_ROOT, 'posters');
  await mkdir(dir, { recursive: true });
  await mkdir(posterDir, { recursive: true });

  // Never upscale. Cap at the source's real width.
  const targetWidth = Math.min(
    record.display_w ?? 720,
    record.orientation === 'portrait' ? 640 : 1280
  );
  const mp4 = path.join(dir, `${base}.mp4`);
  const poster = path.join(posterDir, `${base}.jpg`);

  if (await needsBuild(mp4)) {
    await encodeVideo({ src, outPath: mp4, width: targetWidth, crf: 32, mute: false });
    written++;
  }
  // Poster frame, chosen per source by sampling and inspecting the frames. A percentage
  // formula is not good enough: on several clips it lands on a cutaway that shows something
  // other than the elevator, which misrepresents the film in the grid.
  const posterAt = POSTER_AT[record.path] ?? Math.max(0.5, (record.duration_s ?? 8) * 0.12);
  if (await needsBuild(poster)) {
    await extractPoster(src, poster, posterAt, targetWidth);
    written++;
  }

  const blur = await sharp(poster).resize({ width: 16 }).webp({ quality: 40 }).toBuffer();

  return {
    kind: 'video',
    id: base,
    source: record.path,
    projectSlug: record.project_slug,
    role: record.role,
    rights: record.rights,
    width: targetWidth,
    height: Math.round(targetWidth / (record.aspect_num ?? 1.777)),
    aspectRatio: record.aspect_num,
    orientation: record.orientation,
    durationSeconds: record.duration_s,
    hasAudio: record.has_audio,
    /** Arabic-only burned-in captions: the English locale shows a contextual summary beside it. */
    burnedInLanguage: record.role === 'media-story' ? 'ar' : null,
    mp4: `/media/videos/${path.basename(mp4)}`,
    poster: `/media/posters/${path.basename(poster)}`,
    mp4Bytes: (await stat(mp4)).size,
    blurDataURL: `data:image/webp;base64,${blur.toString('base64')}`,
    notes: record.notes,
  };
}

/* --------------------------------------------------------------------- main */

const inventory = JSON.parse(await readFile(INVENTORY, 'utf8'));

/**
 * Guard: the hero source must either be rights-clear or explicitly approved.
 *
 * HERO.source is a hardcoded path, so it never flows through `shippable` and the rights rules
 * cannot catch it. A quarantined clip was once reinstated here and shipped unnoticed; this
 * makes that a hard build failure unless the approval is recorded in USER_APPROVED above.
 */
{
  const heroRecord = inventory.assets.find((r) => r.path === HERO.source);
  if (!heroRecord) {
    throw new Error(`Hero source is not in the inventory: ${HERO.source}`);
  }
  const approval = USER_APPROVED.get(HERO.source);
  if (heroRecord.rights !== 'clear' && !approval) {
    throw new Error(
      `Hero source "${HERO.source}" has rights="${heroRecord.rights}" and is not in ` +
        `USER_APPROVED, so it must not ship.\n` +
        `  reason: ${heroRecord.notes || heroRecord.rights}`
    );
  }
  if (approval) {
    log(`  hero: shipping "${path.basename(HERO.source)}" under explicit approval`);
    log(`        ${approval}`);
  }
}
const shippable = inventory.assets.filter(isShippable);
const excluded = inventory.assets.filter((r) => !isShippable(r));

log(`inventory: ${inventory.assets.length} files`);
log(`  shippable: ${shippable.length}`);
log(`  excluded:  ${excluded.length}`);
log('');

/**
 * When `--only` limits the run, the sections that were *not* rebuilt are carried over from
 * the existing manifest rather than written as empty arrays.
 *
 * Without this, `--only=hero` emitted `images: []` and `videos: []` — the derivative files
 * were all still on disk, but every component that reads the manifest silently rendered
 * nothing, and whole sections vanished from the page. A partial build must never be able to
 * destroy the parts it did not touch.
 */
const previous = ONLY
  ? await readFile(MANIFEST_OUT, 'utf8')
      .then((t) => JSON.parse(t))
      .catch(() => null)
  : null;

const images = [];
const videos = [];

if (ONLY && ONLY !== 'images' && previous?.images) images.push(...previous.images);
if (!ONLY || ONLY === 'images') {
  for (const record of shippable.filter((r) => r.kind === 'image' && r.role !== 'logo-source')) {
    process.stdout.write(`  image  ${record.path.slice(0, 62).padEnd(64)}\r`);
    images.push(await buildImage(record));
  }
  log(`  images done: ${images.length}`.padEnd(80));
}

if (ONLY && ONLY !== 'videos' && previous?.videos) videos.push(...previous.videos);
if (!ONLY || ONLY === 'videos') {
  for (const record of shippable.filter((r) => r.kind === 'video')) {
    process.stdout.write(`  video  ${record.path.slice(0, 62).padEnd(64)}\r`);
    videos.push(await buildVideo(record));
  }
  log(`  videos done: ${videos.length}`.padEnd(80));
}

let hero = previous?.hero ?? null;
if (!ONLY || ONLY === 'hero') {
  process.stdout.write('  hero   encoding…\r');
  hero = await buildHero();
  log('  hero done'.padEnd(80));
}

await mkdir(path.dirname(MANIFEST_OUT), { recursive: true });
const manifest = {
  generated: new Date().toISOString(),
  note: 'Generated by scripts/build-media.mjs. Do not edit by hand. Sources under assets/ are never modified.',
  hero,
  images,
  videos,
  excluded: excluded.map((r) => ({
    source: r.path,
    rights: r.rights,
    role: r.role,
    reason: EXCLUDED_ROLES_REASON[r.role] ?? r.notes ?? r.rights,
  })),
};
await writeFile(MANIFEST_OUT, JSON.stringify(manifest, null, 2));

log('');
log(`wrote ${written} derivative files (${skipped} already present, use --force to rebuild)`);
log(`manifest -> ${path.relative(ROOT, MANIFEST_OUT)}`);

if (hero) {
  for (const [name, v] of Object.entries(hero.variants)) {
    const kb = (n) => `${(n / 1024).toFixed(0)}KB`;
    log(`  hero ${name.padEnd(8)} mp4 ${kb(v.mp4Bytes).padStart(8)}`);
  }
}

const overBudget = videos.filter((v) => v.mp4Bytes > 3 * 1024 * 1024);
if (overBudget.length) {
  log('');
  log(`WARNING: ${overBudget.length} video(s) exceed the 3MB budget:`);
  for (const v of overBudget) log(`  ${v.id} — ${(v.mp4Bytes / 1048576).toFixed(1)}MB`);
}
