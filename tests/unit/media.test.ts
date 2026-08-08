import { describe, expect, it } from 'vitest';

import {
  allImages,
  allVideos,
  bestImageFor,
  heroAsset,
  maxImageWidth,
  maxVideoWidth,
  socialProofImages,
  verticalWalkthroughs,
} from '@/lib/media';

/**
 * Resolution honesty.
 *
 * The reported defect was media rendered far above what the source files can carry. The caps
 * that fixed it are pure functions, so the rule itself can be tested rather than only its
 * visible symptom — a regression here would show up as pixelation in a screenshot review
 * weeks later, which is exactly what happened the first time.
 */
describe('resolution caps', () => {
  it('never permits a still to be drawn above 58% of its source width', () => {
    // width / 2 * 1.15 — DPR 2 with a 15% tolerance.
    for (const image of allImages) {
      const cap = maxImageWidth(image);
      expect(cap).toBeLessThanOrEqual(image.width * 0.58);
      expect(cap).toBeGreaterThan(0);
    }
  });

  it('caps video at two thirds of source width', () => {
    for (const video of allVideos) {
      expect(maxVideoWidth(video)).toBeLessThanOrEqual(video.width * 0.67);
    }
  });

  it('keeps the hero card within the supplied clip’s resolution', () => {
    if (!heroAsset) return;
    const cap = maxVideoWidth({ width: heroAsset.variants.desktop.width });
    expect(cap).toBeLessThanOrEqual(heroAsset.variants.desktop.width);
  });
});

describe('lead frame selection', () => {
  it('picks the highest-resolution frame for each project', () => {
    const slugs = [...new Set(allImages.map((i) => i.projectSlug))];
    for (const slug of slugs) {
      const best = bestImageFor(slug);
      if (!best) continue;
      const candidates = allImages.filter((i) => i.projectSlug === slug);
      const largest = Math.max(...candidates.map((i) => i.width * i.height));
      expect(best.width * best.height).toBe(largest);
    }
  });
});

/**
 * Rights guarantees.
 *
 * These are the Phase-0 decisions expressed as assertions. The manifest is generated, so a
 * change to the pipeline could quietly let quarantined material through; this makes that a
 * test failure instead of a legal problem.
 */
describe('rights', () => {
  it('ships no third-party-watermarked media', () => {
    for (const asset of [...allImages, ...allVideos]) {
      expect(asset.rights).not.toBe('third-party-watermark');
    }
  });

  it('ships no brand-name-conflict media through the automatic pipeline', () => {
    // The hero is exempt and is asserted separately below — it ships through HERO, by
    // explicit instruction, not through this filter.
    for (const asset of [...allImages, ...allVideos]) {
      expect(asset.rights).not.toBe('brand-name-conflict');
    }
  });

  /**
   * The hero bypasses the rights filter — it is a hardcoded path in scripts/build-media.mjs,
   * not an inventory row — so it needs its own assertion.
   *
   * `IMG_9128.MP4` is required by explicit user instruction dated 2026-08-07. That approval
   * originates from that instruction alone; it did not exist before it. An earlier revision
   * of this test asserted a prior approval that was never given, and a later revision
   * asserted the opposite. Both are superseded.
   *
   * The asset still carries "ARAB EGYPT FOR ELEVATORS" burned into the picture — the rights
   * classification in the inventory is unchanged and still reads `brand-name-conflict`,
   * because that describes the file, not the decision. What changed is the policy.
   */
  it('uses the explicitly approved hero clip', () => {
    expect(heroAsset?.source).toBe('assets/VIDOES/HERO-VDUE/IMG_9128.MP4');
  });

  it('keeps the hero out of the general media lists', () => {
    // It ships via HERO, not via the rights filter, so it must not also appear as a
    // gallery/detail video — that would double-count it and bypass role handling.
    for (const v of allVideos) {
      expect(v.source).not.toBe('assets/VIDOES/HERO-VDUE/IMG_9128.MP4');
    }
  });

  it('uses people photography only as social proof', () => {
    for (const image of allImages) {
      if (image.rights === 'people-consent') {
        expect(image.role).toBe('social-proof');
      }
    }
  });
});

describe('page requirements', () => {
  it('has enough featured media for the hero sequence and the ascent', () => {
    // The hero travels three cards before the film; the ascent needs five floors.
    const slugs = [...new Set(allImages.map((i) => i.projectSlug))].filter(
      (s) => s !== 'people' && bestImageFor(s)
    );
    expect(slugs.length).toBeGreaterThanOrEqual(5);
  });

  it('has walkthrough films and social proof to render', () => {
    expect(verticalWalkthroughs().length).toBeGreaterThan(0);
    expect(socialProofImages().length).toBeGreaterThan(0);
  });
});
