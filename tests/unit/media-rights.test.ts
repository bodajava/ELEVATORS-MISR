import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

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
) as {
  assets: {
    path: string;
    rights: string;
    role: string;
    kind?: string;
    approved_by?: string;
    approved_on?: string;
    held_for?: string;
  }[];
};

const manifest = JSON.parse(
  readFileSync(new URL('../../src/content/generated/media-manifest.json', import.meta.url), 'utf8')
) as {
  hero: { source: string } | null;
  images: { source: string; role: string }[];
  videos: { id: string; source: string; role: string }[];
};

const rightsOf = new Map(inventory.assets.map((a) => [a.path, a.rights]));
const shipping = [...manifest.images, ...manifest.videos];

describe('rights gate', () => {
  it('ships nothing carrying a third-party watermark', () => {
    const leaked = shipping.filter((a) => rightsOf.get(a.source) === 'third-party-watermark');
    expect(leaked.map((a) => a.source)).toEqual([]);
  });

  it('ships no video of a person without either consent or a recorded override', () => {
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

  it('never records an override as plain "clear"', () => {
    // The four presenter advertisements ship from 2026-08-09 on the owner's instruction.
    // What must not happen is the reason disappearing: rewriting these to `clear` would say
    // the footage was fine all along, and the next audit would find nothing to re-examine.
    // They carry `owner-approved` plus the hold it overrode.
    const marketing = inventory.assets.filter((a) => a.path.includes('MARKTEING-video'));
    expect(marketing).toHaveLength(4);
    for (const asset of marketing) {
      expect(asset.rights, asset.path).not.toBe('clear');
    }
  });

  it('requires every override to name who approved it and when', () => {
    const overridden = inventory.assets.filter((a) => a.rights === 'owner-approved');
    expect(overridden.length).toBeGreaterThan(0);
    for (const asset of overridden) {
      expect(asset.approved_by, `${asset.path} has no approved_by`).toBeTruthy();
      expect(asset.approved_on, `${asset.path} has no approved_on`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // The hold it overrode has to survive the override, or the record loses the only
      // information a re-review would need.
      expect(asset.held_for, `${asset.path} does not record what it overrode`).toBeTruthy();
    }
  });

  it('publishes the presenter films only where they were sent', () => {
    // They are a separate destination on the About page, not folded into the project films.
    // `productFilms()` returns every video by role, so without the split they would appear in
    // the homepage strip and the panorama rail too, purely because they are videos.
    const marketing = manifest.videos.filter((v) => v.source.includes('MARKTEING-video'));
    for (const film of marketing) {
      expect(film.role, film.source).toBe('marketing-film');
    }
  });

  it('still ships the four approved films — the gate must not over-block', () => {
    // Was nine until 2026-08-09. A frame-by-frame audit of the whole shipping set, prompted
    // by a third-party developer's title card appearing in the new homepage strip, found five
    // clips whose `rights` had never matched their content: two with a burned-in "Arab Egypt
    // for elevators" watermark, one with both that and a "HYDE PARK DEVELOPMENT" card, and two
    // showing identifiable people. Each had been recorded as `clear` because its note captured
    // resolution or watermark-absence rather than what the footage shows.
    // Four project walkthroughs. The presenter films are counted separately: they ship under
    // the recorded override, not because they are clear, and folding them into this count
    // would hide that distinction behind a number.
    const walkthroughs = manifest.videos.filter((v) => v.role !== 'marketing-film');
    expect(walkthroughs).toHaveLength(4);
    for (const video of walkthroughs) {
      expect(rightsOf.get(video.source), video.source).toBe('clear');
    }
    for (const video of manifest.videos.filter((v) => v.role === 'marketing-film')) {
      expect(rightsOf.get(video.source), video.source).toBe('owner-approved');
    }
  });

  it('keeps every clip carrying the wrong English brand name out of the shipping set', () => {
    // "ARAB EGYPT FOR ELEVATORS" is burned into several originals and is not the site's
    // English brand name. Phase 0 recorded the conflict as unresolved; these clips reached the
    // shipping set anyway once `SHIPPABLE_ROLES` was widened, because the widening changed
    // which *roles* ship without revisiting whether their `rights` were right.
    const conflicted = inventory.assets.filter((a) => a.rights === 'brand-name-conflict');
    expect(conflicted.length).toBeGreaterThan(0);
    const sources = new Set(shipping.map((a) => a.source));
    for (const asset of conflicted) {
      expect(sources.has(asset.path), asset.path).toBe(false);
    }
  });

  it('leaves no orphaned film or poster in public/', () => {
    // Excluding a clip from the manifest stops the site linking to it. It does not delete the
    // derivative the build already wrote, and `public/` is served as-is — so an unlinked file
    // stays a live, fetchable URL. When five clips were reclassified on 2026-08-09 their ten
    // derivatives were still on disk, including poster frames of an identifiable person and
    // of a third-party developer's title card.
    const shipped = new Set(manifest.videos.map((v) => v.id));
    if (manifest.hero) shipped.add('hero');

    const orphans = [];
    for (const dir of ['videos', 'posters']) {
      const at = new URL(`../../public/media/${dir}/`, import.meta.url);
      if (!existsSync(at)) continue;
      for (const file of readdirSync(at)) {
        const id = file.replace(/\.[^.]+$/, '').replace(/-(desktop|mobile)$/, '');
        if (id.startsWith('hero-')) continue;
        if (!shipped.has(id)) orphans.push(`${dir}/${file}`);
      }
    }
    expect(orphans).toEqual([]);
  });

  it('ships no video showing an identifiable person', () => {
    const people = inventory.assets.filter(
      (a) => a.kind === 'video' && a.rights === 'people-consent'
    );
    expect(people.length).toBeGreaterThan(0);
    const sources = new Set(shipping.map((a) => a.source));
    for (const asset of people) {
      expect(sources.has(asset.path), asset.path).toBe(false);
    }
  });
});
