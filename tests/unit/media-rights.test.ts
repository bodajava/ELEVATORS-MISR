import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The rights gate, asserted against what actually shipped.
 *
 * This exists because of a near miss. `AQMyyB….mp4` was recorded as `rights: clear` with the
 * note "360x640 - too low resolution to ship". The resolution was true; the classification was
 * not — the film shows the same identifiable presenter as the other marketing videos. Nothing
 * reached the browser, but only because its role happened to be `none`, and the role whitelist
 * had already been widened once. A single further edit would have published a person who never
 * consented to it.
 *
 * So the invariant is checked here against the generated manifest rather than trusted to the
 * pipeline: whatever the roles say, nothing quarantined is in the shipping set.
 */

const inventory = JSON.parse(
  readFileSync(new URL('../../docs/asset-inventory.json', import.meta.url), 'utf8')
) as { assets: { path: string; rights: string; role: string; kind?: string }[] };

const manifest = JSON.parse(
  readFileSync(new URL('../../src/content/generated/media-manifest.json', import.meta.url), 'utf8')
) as {
  hero: { source: string } | null;
  images: { source: string; role: string }[];
  videos: { source: string; role: string }[];
};

const rightsOf = new Map(inventory.assets.map((a) => [a.path, a.rights]));
const shipping = [...manifest.images, ...manifest.videos];

describe('rights gate', () => {
  it('ships nothing carrying a third-party watermark', () => {
    const leaked = shipping.filter((a) => rightsOf.get(a.source) === 'third-party-watermark');
    expect(leaked.map((a) => a.source)).toEqual([]);
  });

  it('ships no video of a person without publication consent', () => {
    const leaked = manifest.videos.filter((v) => rightsOf.get(v.source) === 'people-consent');
    expect(leaked.map((v) => v.source)).toEqual([]);
  });

  it('ships people stills only where they are supporting social proof', () => {
    const wrong = manifest.images.filter(
      (i) => rightsOf.get(i.source) === 'people-consent' && i.role !== 'social-proof'
    );
    expect(wrong.map((i) => i.source)).toEqual([]);
  });

  it('ships nothing with a conflicting burned-in brand name, except the approved hero', () => {
    const leaked = shipping.filter((a) => rightsOf.get(a.source) === 'brand-name-conflict');
    expect(leaked.map((a) => a.source)).toEqual([]);
  });

  it('keeps every marketing film out of the shipping set', () => {
    const leaked = shipping.filter((a) => a.source.includes('MARKTEING-video'));
    expect(leaked.map((a) => a.source)).toEqual([]);
  });

  it('classifies all four marketing films as blocked — none is merely "clear"', () => {
    const marketing = inventory.assets.filter((a) => a.path.includes('MARKTEING-video'));
    expect(marketing).toHaveLength(4);
    for (const asset of marketing) {
      expect(asset.rights, asset.path).not.toBe('clear');
    }
  });

  it('still ships the nine approved films — the gate must not over-block', () => {
    expect(manifest.videos).toHaveLength(9);
    for (const video of manifest.videos) {
      expect(rightsOf.get(video.source), video.source).toBe('clear');
    }
  });
});
