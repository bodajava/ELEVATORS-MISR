/**
 * Logo asset build.
 *
 * The only supplied logo (`assets/LOGO/2026-08-05 23.24.46.jpg`) is a 1024x1024 photographic
 * render of the sign — the arch, gears and Arabic wordmark are modelled in gold and navy
 * against marble, with two elevator shafts visible behind. There is no flat, transparent, or
 * vector version in this repository.
 *
 * That rules out a tinted single-colour mark: any background removal would have to cut gold
 * that is semi-transparent against marble, and the result would look damaged. What it does
 * support is a *badge* — the mark cropped to its own edges and presented as the physical sign
 * it is. That is the real logo, used honestly, and it reads on both the cream page and the
 * carbon sections.
 *
 * This never writes to assets/. Source is read-only; output goes to public/media/brand/.
 *
 *   node scripts/build-logo.mjs
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'assets/LOGO/2026-08-05 23.24.46.jpg';
const OUT = 'public/media/brand';

/**
 * The mark's bounding box in the 1024x1024 source, measured off the image: from the outer
 * left edge of the arch to its right edge, and from the crown down to the baseline of
 * "للمصاعد". Cropping here removes the elevator shafts at the edges while keeping the whole
 * lockup — including the Arabic wordmark, which is the only wordmark this brand has.
 */
const MARK = { left: 90, top: 70, width: 850, height: 900 };

await mkdir(OUT, { recursive: true });

/** Retina-grade badge. 3x the largest on-page use (the footer at ~240px). */
await sharp(SRC)
  .extract(MARK)
  .resize({ width: 720, height: 762, fit: 'cover' })
  .webp({ quality: 90 })
  .toFile(`${OUT}/logo-badge.webp`);

await sharp(SRC)
  .extract(MARK)
  .resize({ width: 720, height: 762, fit: 'cover' })
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(`${OUT}/logo-badge.jpg`);

/** Square crop of the arch alone, for the favicon / PWA icon / structured-data logo. */
await sharp(SRC)
  .extract({ left: 95, top: 75, width: 840, height: 840 })
  .resize({ width: 512, height: 512 })
  .png()
  .toFile(`${OUT}/logo-square.png`);

const meta = await sharp(`${OUT}/logo-badge.webp`).metadata();
console.log(`logo-badge.webp  ${meta.width}x${meta.height}`);
console.log(`logo-square.png  512x512`);
