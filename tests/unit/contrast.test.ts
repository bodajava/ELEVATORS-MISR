import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Colour contrast, asserted rather than trusted.
 *
 * The palette is "Zen Linen". Its supplied accent, `#C96442`, measures **3.70:1** on the linen
 * ground — it fails AA at body size, and neither white nor the ink passes on it as a fill. That
 * is not a reason to reject the direction; it is a reason to derive the tones that carry text
 * and to pin them here, so a future edit that "simplifies" the palette back to one orange fails
 * the suite instead of shipping unreadable type.
 *
 * Values are read from globals.css, so the test and the stylesheet cannot drift apart.
 */

const css = readFileSync(new URL('../../src/app/globals.css', import.meta.url), 'utf8');

/** Read a custom property from a specific theme block. */
function token(block: 'light' | 'dark', name: string): string {
  const start =
    block === 'light'
      ? css.indexOf(":root,\n[data-theme='light'] {")
      : css.indexOf("[data-theme='dark'] {");
  const end = css.indexOf('}', start);
  const scope = css.slice(start, end);
  const match = scope.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`--${name} not found in the ${block} theme`);
  return match[1];
}

const channel = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const AA_NORMAL = 4.5;
const AA_LARGE = 3;

describe.each(['light', 'dark'] as const)('%s theme', (theme) => {
  const t = (name: string) => token(theme, name);

  it('body text passes AA on the page ground', () => {
    expect(contrast(t('ink'), t('paper'))).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('secondary text passes AA on the page ground', () => {
    expect(contrast(t('ink-2'), t('paper'))).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('annotation text passes AA on the page ground', () => {
    expect(contrast(t('ink-3'), t('paper'))).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('text on a raised surface passes AA', () => {
    expect(contrast(t('ink'), t('paper-raised'))).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('text on the anchor sections passes AA', () => {
    expect(contrast(t('ink-on-dark'), t('carbon'))).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrast(t('ink-2-on-dark'), t('carbon'))).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('the accent-text tone is readable at body size — the accent itself is not', () => {
    expect(contrast(t('accent-text'), t('paper'))).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('a label on an accent fill passes AA', () => {
    expect(contrast(t('on-accent'), t('accent-hi'))).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('the accent is at least usable for rules and display-size type', () => {
    expect(contrast(t('accent'), t('paper'))).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it('error text passes AA', () => {
    expect(contrast(t('danger'), t('paper'))).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('the focus ring is visible against the page', () => {
    expect(contrast(t('focus'), t('paper'))).toBeGreaterThanOrEqual(AA_LARGE);
  });
});

describe('the accent that must not be used for small text', () => {
  it('is documented as failing on the light ground, which is why accent-text exists', () => {
    const ratio = contrast(token('light', 'accent'), token('light', 'paper'));
    expect(ratio).toBeLessThan(AA_NORMAL);
    expect(ratio).toBeGreaterThanOrEqual(AA_LARGE);
  });
});
