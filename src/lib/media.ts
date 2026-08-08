import manifest from '@/content/generated/media-manifest.json';

/**
 * Typed access to the generated media manifest.
 *
 * The manifest is produced by scripts/build-media.mjs from docs/asset-inventory.json. It is
 * the only route from a source asset to a public URL, which is what keeps quarantined media
 * out of the build: anything excluded by the rights rules never gets a derivative, so there is
 * no URL for a component to reference even by mistake.
 */

export type MediaSource = { width: number; src: string };

export type ImageAsset = {
  kind: 'image';
  id: string;
  source: string;
  projectSlug: string;
  role: string;
  rights: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: string;
  src: string;
  sources: { avif: MediaSource[]; webp: MediaSource[] };
  blurDataURL: string;
  notes?: string;
};

export type VideoAsset = {
  kind: 'video';
  id: string;
  source: string;
  projectSlug: string;
  role: string;
  rights: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: string;
  durationSeconds: number;
  hasAudio: boolean;
  /** 'ar' when the clip carries burned-in Arabic captions and no English track exists. */
  burnedInLanguage: 'ar' | null;
  mp4: string;
  webm: string;
  poster: string;
  mp4Bytes: number;
  webmBytes: number;
  blurDataURL: string;
  notes?: string;
};

export type HeroAsset = {
  kind: 'hero';
  id: string;
  source: string;
  start: number;
  duration: number;
  muted: true;
  variants: Record<
    'desktop' | 'mobile',
    { mp4: string; webm: string; width: number; mp4Bytes: number; webmBytes: number }
  >;
  poster: string;
  posterAvif: string;
  blurDataURL: string;
};

type Manifest = {
  generated: string;
  hero: HeroAsset | null;
  images: ImageAsset[];
  videos: VideoAsset[];
  excluded: { source: string; rights: string; role: string; reason: string }[];
};

const media = manifest as unknown as Manifest;

export const heroAsset = media.hero;
export const allImages = media.images;
export const allVideos = media.videos;
export const excludedAssets = media.excluded;

/** Images for a project, largest first, so the lead image is index 0. */
export function imagesFor(projectSlug: string): ImageAsset[] {
  return media.images
    .filter((i) => i.projectSlug === projectSlug)
    .sort((a, b) => (a.role === 'hero-still' ? -1 : b.role === 'hero-still' ? 1 : 0));
}

export function leadImageFor(projectSlug: string): ImageAsset | undefined {
  return imagesFor(projectSlug)[0];
}

export function videosFor(projectSlug: string): VideoAsset[] {
  return media.videos.filter((v) => v.projectSlug === projectSlug);
}

/** Supporting people photography — only frames where an elevator is actually present. */
export function socialProofImages(): ImageAsset[] {
  return media.images.filter((i) => i.role === 'social-proof');
}

/**
 * Walkthrough films of finished installations.
 *
 * These are the company's own footage, carrying only the company's own watermark. The two
 * Arabic presenter advertisements that were originally intended for this slot are excluded
 * upstream — both cut to third-party-branded B-roll partway through. See the `excluded` list
 * in the manifest and the rationale in scripts/build-media.mjs.
 */
export function walkthroughFilms(): VideoAsset[] {
  return media.videos.filter((v) => v.role === 'detail-video');
}

/** Portrait walkthroughs, for the vertical-video presentation. */
export function verticalWalkthroughs(): VideoAsset[] {
  return walkthroughFilms().filter((v) => v.orientation === 'portrait');
}

/**
 * Every film the site may show, in one list.
 *
 * The homepage used to render `verticalWalkthroughs()` — `detail-video` **and** portrait —
 * which resolved to two clips out of sixteen originals and read as a broken pipeline. It was
 * not broken: the other rights-clear films simply had no destination, so the media build
 * never generated derivatives for them. See the note on `SHIPPABLE_ROLES` in
 * scripts/build-media.mjs.
 *
 * This returns all of them, ordered so the highest-resolution landscape films lead — they are
 * the ones that survive being shown large — and the portrait phone captures follow.
 *
 * It is still a *rights-gated* list: anything carrying a third-party watermark, a conflicting
 * burned-in brand name, or an identifiable person without consent never reaches the manifest
 * in the first place.
 */
export function productFilms(): VideoAsset[] {
  return [...media.videos].sort((a, b) => {
    const landscape = (v: VideoAsset) => (v.orientation === 'landscape' ? 0 : 1);
    return landscape(a) - landscape(b) || b.width * b.height - a.width * a.height;
  });
}

/** Films not already tied to a specific project page. */
export function unassignedFilms(): VideoAsset[] {
  return productFilms().filter((v) => !v.projectSlug || v.projectSlug === 'unassigned');
}

/**
 * The `sizes` attribute for a slot.
 *
 * Source photography tops out at 1280px, so no slot should ever request more than that —
 * `next/image` would otherwise emit a srcset entry that cannot be satisfied honestly.
 */
export const imageSizes = {
  /** Full-bleed on mobile, half the grid on tablet, a third on desktop. */
  card: '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw',
  /** A single large editorial frame. */
  feature: '(max-width: 640px) 92vw, (max-width: 1024px) 70vw, 46vw',
  /** Small supporting thumbnails. */
  thumb: '(max-width: 640px) 40vw, 200px',
} as const;

/* ==========================================================================
   Resolution honesty

   Every source photograph in this repository is a phone capture topping out at
   1280px on its long edge — portrait frames are ~960px wide. The originals are
   what they are, and no CSS trick makes them bigger. So the layout is sized to
   the assets rather than the assets being stretched to the layout: media here
   is a set of editorial cards, not full-height panels, because that is the
   largest honest presentation this photography supports.
   ========================================================================== */

/**
 * The device pixel ratio the caps are computed against.
 *
 * 2 is the realistic worst case — every current laptop and phone the site is used on. Sizing
 * for DPR 1 would look sharp only on an external monitor and soft everywhere else.
 */
const TARGET_DPR = 2;

/**
 * How far above a perfect pixel match is still acceptable.
 *
 * 1.15 is where upscaling stops being visible on photographic content at arm's length. Above
 * roughly 1.3 the softness reads as "low quality image", which is the reported defect.
 */
const UPSCALE_TOLERANCE = 1.15;

/**
 * The widest this image may be rendered, in CSS pixels, before it visibly softens.
 *
 * Use it as a `max-width` on the frame — not as a fixed width — so small viewports still get
 * a fluid layout and only the upper bound is constrained.
 */
export function maxImageWidth(asset: Pick<ImageAsset, 'width'>): number {
  return Math.floor((asset.width / TARGET_DPR) * UPSCALE_TOLERANCE);
}

/**
 * The widest this video may be rendered, in CSS pixels.
 *
 * Video gets a looser effective DPR than stills: inter-frame compression and motion blur hide
 * scaling softness that a static photograph would show, and the alternative — a 640px hero
 * film — would not read as a hero at all. 1.5 is the point where the 1280px hero clip still
 * fills a dominant card without looking resampled.
 */
export function maxVideoWidth(asset: Pick<VideoAsset, 'width'>): number {
  return Math.floor(asset.width / 1.5);
}

/**
 * The best available frame for a project's primary slot.
 *
 * Picks the highest-resolution image rather than the first in folder order, so the strongest
 * angle leads and the weaker ones fall through to the smaller supporting frames.
 */
export function bestImageFor(projectSlug: string): ImageAsset | undefined {
  return imagesFor(projectSlug)
    .slice()
    .sort((a, b) => b.width * b.height - a.width * a.height)[0];
}
