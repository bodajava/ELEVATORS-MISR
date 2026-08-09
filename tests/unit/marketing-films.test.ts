import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The Marketing Films slider must carry every file in the folder — no more, no fewer.
 *
 * The central assertion compares two numbers that are derived independently: how many video
 * files are on disk in the marketing folder, and how many unique videos the manifest hands the
 * slider. Anything that quietly reduces the set — a `.slice()`, a cap, an orientation or
 * resolution filter, a rights rule, a role rename — moves one of those numbers and not the
 * other, and this fails.
 */

const ROOT = new URL('../../', import.meta.url);

/** The folder is spelled MARKTEING in this repository. Verified, not assumed. */
const FOLDER = 'assets/VIDOES/MARKTEING-video';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm'];

const manifest = JSON.parse(
  readFileSync(new URL('src/content/generated/media-manifest.json', ROOT), 'utf8')
) as {
  videos: {
    id: string;
    source: string;
    role: string;
    width: number;
    height: number;
    durationSeconds: number;
    orientation: string;
    mp4: string;
    poster: string;
  }[];
};

function onDisk(): string[] {
  const dir = new URL(`${FOLDER}/`, ROOT);
  return readdirSync(dir)
    .filter((file) => VIDEO_EXTENSIONS.some((ext) => file.toLowerCase().endsWith(ext)))
    .sort();
}

const slides = manifest.videos.filter((v) => v.role === 'marketing-film');

describe('Marketing Films slider', () => {
  it('finds the marketing folder on disk', () => {
    expect(existsSync(fileURLToPath(new URL(FOLDER, ROOT))), `${FOLDER} is missing`).toBe(true);
    expect(onDisk().length).toBeGreaterThan(0);
  });

  it('renders exactly one slide per video file in the folder', () => {
    // The acceptance assertion. Two independently derived counts.
    const files = onDisk();
    expect(slides.length, `on disk: ${files.join(', ')}`).toBe(files.length);
  });

  it('reaches every source file — none is dropped', () => {
    const rendered = new Set(slides.map((s) => s.source.split('/').pop()));
    for (const file of onDisk()) {
      expect(rendered.has(file), `${file} is on disk but not in the slider`).toBe(true);
    }
  });

  it('renders no duplicate', () => {
    expect(new Set(slides.map((s) => s.id)).size).toBe(slides.length);
    expect(new Set(slides.map((s) => s.source)).size).toBe(slides.length);
  });

  it('lets nothing in from another directory', () => {
    for (const slide of slides) {
      expect(slide.source.startsWith(`${FOLDER}/`), slide.source).toBe(true);
    }
  });

  it('points every slide at a derivative and a poster that exist', () => {
    for (const slide of slides) {
      expect(slide.mp4, slide.id).toBeTruthy();
      expect(slide.poster, slide.id).toBeTruthy();
      expect(
        existsSync(fileURLToPath(new URL(`public${slide.mp4}`, ROOT))),
        `${slide.mp4} is referenced but not on disk`
      ).toBe(true);
      expect(
        existsSync(fileURLToPath(new URL(`public${slide.poster}`, ROOT))),
        `${slide.poster} is referenced but not on disk`
      ).toBe(true);
    }
  });

  it('carries the metadata each slide needs', () => {
    for (const slide of slides) {
      expect(slide.id, slide.source).toBeTruthy();
      expect(slide.width, slide.source).toBeGreaterThan(0);
      expect(slide.height, slide.source).toBeGreaterThan(0);
      expect(slide.durationSeconds, slide.source).toBeGreaterThan(0);
      expect(['portrait', 'landscape', 'square']).toContain(slide.orientation);
    }
  });

  it('keeps the marketing films out of the project rails', () => {
    // `productFilms()` selects everything that is not a marketing film. If the role were ever
    // dropped, the same four files would appear twice on the homepage.
    const others = manifest.videos.filter((v) => v.role !== 'marketing-film');
    for (const video of others) {
      expect(
        video.source.startsWith(`${FOLDER}/`),
        `${video.source} leaked into the project rail`
      ).toBe(false);
    }
  });
});

describe('the code path from folder to slider', () => {
  /**
   * Source with comments removed.
   *
   * Without this the guard matches the prose describing it — the sentence "there is no
   * `.slice()` here" trips a search for `.slice(`. A guard that fails on its own documentation
   * is worse than no guard, because the fix is to delete the explanation.
   */
  const read = (file: string) =>
    readFileSync(new URL(file, ROOT), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('sits directly after the hero on the homepage', () => {
    const page = read('src/app/[locale]/page.tsx');
    const order = [...page.matchAll(/<([A-Z][A-Za-z]+)\b/g)].map((m) => m[1]);
    const hero = order.indexOf('Hero');
    const slider = order.indexOf('MarketingFilms');
    expect(hero, 'Hero not rendered').toBeGreaterThan(-1);
    expect(slider, 'MarketingFilms not rendered').toBeGreaterThan(-1);
    // Immediately after, and as a sibling — never nested inside the hero's pinned stage.
    expect(slider - hero).toBe(1);
  });

  it('renders one real block and two clone blocks, and only the real one can play', () => {
    const carousel = read('src/components/media/film-carousel.tsx');
    // Three blocks, so forward from the last and back from the first both have runway.
    expect(carousel).toMatch(/length:\s*count\s*\*\s*3/);
    // Clones: hidden from accessibility, inert, and a poster rather than a player.
    expect(carousel).toMatch(/'aria-hidden':\s*true,\s*inert:\s*true/);
    expect(carousel).toMatch(/real\s*\?\s*\(\s*<AmbientVideo/);
    // Exactly one card can ever be handed permission to play.
    expect(carousel).toMatch(/active=\{isPlaying && expanded === null\}/);
  });

  it('holds the auto-advance for every required reason', () => {
    const carousel = read('src/components/media/film-carousel.tsx');
    const gate = /const running =([\s\S]*?);/.exec(carousel)?.[1] ?? '';
    for (const condition of [
      '!paused',
      '!hovering',
      '!dragging',
      'tabVisible',
      'playing === null',
      'expanded === null',
    ]) {
      expect(gate, `auto-advance is not held by ${condition}`).toContain(condition);
    }
    // One timer, cleared on teardown, so a Strict Mode double-invoke cannot leave two.
    expect(carousel).toMatch(/prefers-reduced-motion: reduce/);
    expect(carousel).toMatch(/return \(\) => window\.clearInterval\(timer\)/);
    expect(carousel).toMatch(/interval = 4200/);
  });

  it('does not reduce the set anywhere between the manifest and the rail', () => {
    // A guard against the specific ways this silently shrinks. `marketingFilms()` may sort,
    // but it may not slice, cap or filter on anything except the role.
    const media = read('src/lib/media.ts');
    const body = /export function marketingFilms\(\)[\s\S]*?\n}/.exec(media)?.[0] ?? '';
    expect(body, 'marketingFilms() not found').not.toBe('');
    expect(body).not.toMatch(/\.slice\(/);
    expect(body).not.toMatch(/orientation\s*===/);
    expect(body).not.toMatch(/width\s*[<>]/);

    const section = read('src/components/sections/marketing-films.tsx');
    expect(section).not.toMatch(/\.slice\(/);
    expect(section).not.toMatch(/\.filter\(/);

    const carousel = read('src/components/media/film-carousel.tsx');
    expect(carousel).not.toMatch(/films\.slice\(/);
  });
});
