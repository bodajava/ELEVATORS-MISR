/**
 * Verification for the installations index band on /projects.
 *
 * Checks the things that are actually at risk: Arabic letter shaping under the character
 * split, that hover / focus / tap all reach the same state, that the frame links to the
 * *selected* installation rather than a fixed one, that nothing overflows at 320px, and
 * that the band is not a hover-only dead zone on touch.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3100';
const browser = await chromium.launch();
const findings = [];
const note = (m) => console.log('  ' + m);

for (const locale of ['en', 'ar']) {
  console.log(`\n══ ${locale.toUpperCase()} /projects ══`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${locale}/projects`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  const band = page.locator('[data-project-index]');
  const buttons = band.locator('button[aria-pressed]');
  const count = await buttons.count();
  note(`titles rendered: ${count}`);
  if (count !== 10) findings.push(`${locale}: expected 10 index titles, got ${count}`);

  // ── Arabic shaping ───────────────────────────────────────────────────────
  // A cursive word split per character renders as isolated forms. Isolated forms are far
  // narrower in sum than the shaped word, so the giveaway is measurable: compare the token
  // count inside a title against its word count.
  const shape = await buttons.nth(0).evaluate((el) => {
    const name = el.querySelector('.sr-only')?.textContent ?? '';
    const tokens = [...el.querySelectorAll(':scope > span[aria-hidden] > span')].length;
    return { name, tokens, words: name.trim().split(/\s+/).length, chars: name.length };
  });
  note(`first title: "${shape.name}"`);
  note(`  tokens=${shape.tokens} words=${shape.words} chars=${shape.chars}`);
  if (locale === 'ar' && shape.tokens !== shape.words) {
    findings.push(
      `ar: title split into ${shape.tokens} tokens for ${shape.words} words — Arabic shaping is broken`
    );
  }
  if (locale === 'en' && shape.tokens < shape.chars - 2) {
    findings.push(`en: expected per-character split, got ${shape.tokens} tokens`);
  }

  // Word spacing must survive the split. Comparing the rendered line against an unsplit copy
  // is useless here — both wrap at the grid column, so both report the column width. Measure
  // the gaps between adjacent tokens instead, which is constraint-independent.
  const gaps = await buttons.nth(0).evaluate((el) => {
    const boxes = [...el.querySelectorAll(':scope > span[aria-hidden] > span')].map((span) => {
      const r = span.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: Math.round(r.top),
        width: r.width,
        text: span.textContent,
      };
    });
    // Direction-aware: in RTL each token sits to the *left* of the one before it, so
    // `left - right` is a large negative number, and taking its absolute value reports a
    // 200px "gap" between two adjacent words that are in fact touching.
    const rtl = getComputedStyle(el).direction === 'rtl';
    const sameLine = [];
    for (let k = 1; k < boxes.length; k += 1) {
      if (boxes[k].top !== boxes[k - 1].top) continue;
      sameLine.push(rtl ? boxes[k - 1].left - boxes[k].right : boxes[k].left - boxes[k - 1].right);
    }
    const spaceTokens = boxes.filter((b) => /^\s+$/.test(b.text ?? ''));
    return {
      minGap: sameLine.length ? Math.min(...sameLine) : -1,
      maxGap: sameLine.length ? Math.max(...sameLine) : -1,
      spaceTokens: spaceTokens.length,
      narrowestSpace: spaceTokens.length ? Math.min(...spaceTokens.map((b) => b.width)) : -1,
      /** Arabic tokens carry their own trailing space, so the word box itself is wider. */
      wordWidths: boxes.slice(0, 3).map((b) => Math.round(b.width)),
    };
  });
  note(`  token gaps: min ${gaps.minGap.toFixed(1)}px, max ${gaps.maxGap.toFixed(1)}px`);

  if (locale === 'en') {
    note(`  space tokens: ${gaps.spaceTokens}, narrowest ${gaps.narrowestSpace.toFixed(1)}px`);
    if (gaps.spaceTokens < 6) findings.push('en: word spaces were dropped from the split');
    if (gaps.narrowestSpace < 3)
      findings.push(
        `en: a space token rendered ${gaps.narrowestSpace.toFixed(1)}px wide — collapsed`
      );
  } else {
    // Arabic words end in a preserved space, so the gap sits inside the token box, not
    // between boxes. A collapsed space would leave the words touching with no trailing room.
    note(`  first word widths: ${gaps.wordWidths.join(', ')}px`);
    const trailing = await buttons.nth(0).evaluate((el) => {
      const first = el.querySelector(':scope > span[aria-hidden] > span > span');
      if (!first) return -1;
      const withSpace = first.getBoundingClientRect().width;
      const probe = first.cloneNode(true);
      probe.textContent = (first.textContent ?? '').trimEnd();
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      first.parentElement.appendChild(probe);
      const without = probe.getBoundingClientRect().width;
      probe.remove();
      return withSpace - without;
    });
    note(`  trailing space preserved on word 1: ${trailing.toFixed(1)}px`);
    if (trailing < 3)
      findings.push(
        `ar: trailing space collapsed (${trailing.toFixed(1)}px) — words will run together`
      );
  }

  // No character may sit on a different line from the rest of its word — the defect the
  // word wrapper exists to prevent, and one that only appears once a title is long enough
  // to wrap at the column width.
  const broken = await band.evaluate((root) => {
    const bad = [];
    for (const button of root.querySelectorAll('button[aria-pressed]')) {
      for (const word of button.querySelectorAll(':scope > span[aria-hidden]')) {
        const tops = [...word.querySelectorAll(':scope > span')].map((c) =>
          Math.round(c.getBoundingClientRect().top)
        );
        if (new Set(tops).size > 1) bad.push(word.textContent?.trim() ?? '');
      }
    }
    return bad;
  });
  note(
    `words split across lines: ${broken.length}${broken.length ? ' — ' + broken.join(', ') : ''}`
  );
  if (broken.length > 0)
    findings.push(`${locale}: ${broken.length} word(s) broken mid-word: ${broken.join(', ')}`);

  // ── Resting contrast ─────────────────────────────────────────────────────
  // The unselected titles are the page's content, not decoration. The upstream component
  // rests them at opacity-30, which on this palette is illegible.
  const contrast = await buttons.nth(2).evaluate((el) => {
    const span = el.querySelector(':scope > span[aria-hidden] > span > span');
    if (!span) return null;
    const cs = getComputedStyle(span);
    const page = getComputedStyle(document.body).backgroundColor;
    const parse = (c) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const lum = (rgb) => {
      const [r, g, b] = rgb.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const alpha = Number(cs.opacity);
    const fg = parse(cs.color);
    const bg = parse(page);
    // Flatten any element opacity against the page before measuring.
    const eff = fg.map((v, i) => v * alpha + bg[i] * (1 - alpha));
    const [a, b2] = [lum(eff), lum(bg)].sort((x, y) => y - x);
    return { ratio: (a + 0.05) / (b2 + 0.05), color: cs.color, opacity: alpha };
  });
  note(
    `resting title contrast: ${contrast.ratio.toFixed(2)}:1 (${contrast.color} @ ${contrast.opacity})`
  );
  if (contrast.ratio < 4.5)
    findings.push(
      `${locale}: resting titles measure ${contrast.ratio.toFixed(2)}:1, below AA 4.5:1`
    );

  // ── Selection reaches the frame, three ways ──────────────────────────────
  const frameHref = () => page.locator('a[data-index-frame]').getAttribute('href');
  const before = await frameHref();

  await buttons.nth(4).hover();
  await page.waitForTimeout(700);
  const afterHover = await frameHref();
  note(`link: ${before} → hover(5) → ${afterHover}`);
  if (afterHover === before)
    findings.push(`${locale}: hovering a title did not change the frame link`);

  await buttons.nth(7).focus();
  await page.waitForTimeout(1400); // the reveal is 0.8s; wait past it
  const afterFocus = await frameHref();
  note(`      → focus(8) → ${afterFocus}`);
  if (afterFocus === afterHover)
    findings.push(`${locale}: focusing a title did not change the frame link`);

  const pressed = await buttons.nth(7).getAttribute('aria-pressed');
  if (pressed !== 'true') findings.push(`${locale}: focused title reports aria-pressed=${pressed}`);

  // The visible frame must be the selected one, not merely the link target.
  const visible = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('a[data-index-frame] img')];
    // The hidden variant collapses the polygon's bottom edge to the top, so a revealed
    // frame is the one whose clip polygon still has real height.
    return imgs
      .map((img, index) => {
        const clip = getComputedStyle(img).clipPath;
        const ys = [...clip.matchAll(/(-?[\d.]+)px\s*\)?\s*(?:,|\))/g)].map((m) => Number(m[1]));
        const box = img.getBoundingClientRect();
        return { index, height: ys.length ? Math.max(...ys) : box.height };
      })
      .filter((i) => i.height > 4)
      .map((i) => i.index);
  });
  note(`frames fully revealed: [${visible.join(', ')}]`);

  // Every stacked frame must fill the aperture exactly. If any is taller than the opening,
  // the stack is sizing itself off the tallest source's intrinsic height and `object-cover`
  // is cropping from wherever the overflow lands rather than where it was told to.
  const fit = await band.evaluate((root) => {
    const wrap = root.querySelector('a[data-index-frame] > div').getBoundingClientRect();
    const imgs = [...root.querySelectorAll('a[data-index-frame] img')].map((img) => {
      const r = img.getBoundingClientRect();
      return { dh: Math.round(r.height - wrap.height), dw: Math.round(r.width - wrap.width) };
    });
    return {
      opening: `${Math.round(wrap.width)}x${Math.round(wrap.height)}`,
      worst: Math.max(...imgs.map((i) => Math.abs(i.dh))),
      wide: Math.max(...imgs.map((i) => Math.abs(i.dw))),
    };
  });
  note(`aperture ${fit.opening}; worst frame overflow ${fit.worst}px tall / ${fit.wide}px wide`);
  if (fit.worst > 1 || fit.wide > 1)
    findings.push(
      `${locale}: a frame overflows the aperture by ${fit.worst}x${fit.wide}px — the crop is not the one specified`
    );
  if (visible.length !== 1)
    findings.push(`${locale}: ${visible.length} frames revealed at once, expected 1`);
  else if (visible[0] !== 7)
    findings.push(`${locale}: revealed frame is ${visible[0]}, selected is 7`);

  await ctx.close();

  // ── Touch: tap must select, and must not navigate ────────────────────────
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mob = await touch.newPage();
  await mob.goto(`${BASE}/${locale}/projects`, { waitUntil: 'load' });
  await mob.waitForTimeout(900);
  const urlBefore = mob.url();
  await mob.locator('[data-project-index] button[aria-pressed]').nth(3).tap();
  await mob.waitForTimeout(700);
  const tapped = await mob.locator('a[data-index-frame]').getAttribute('href');

  // A tap that changes nothing the visitor can see is a dead control. Measure how much of
  // the frame is actually on screen with the whole list in view.
  const seen = await mob.evaluate(() => {
    const band = document.querySelector('[data-project-index]');
    band.scrollIntoView({ block: 'start', behavior: 'instant' });
    const frame = band.querySelector('a[data-index-frame] img').getBoundingClientRect();
    const nav = document.querySelector('[data-bottom-nav]')?.getBoundingClientRect();
    const floor = nav ? nav.top : window.innerHeight;
    return {
      visible: Math.round(Math.max(0, Math.min(frame.bottom, floor) - Math.max(frame.top, 0))),
      height: Math.round(frame.height),
    };
  });
  note(`frame visible with the list in view: ${seen.visible}/${seen.height}px`);
  if (seen.visible < 120)
    findings.push(
      `${locale}: only ${seen.visible}px of the frame is on screen on a phone — tapping a title has no visible effect`
    );
  note(`tap(4) on touch → link ${tapped}, navigated: ${mob.url() !== urlBefore}`);
  if (mob.url() !== urlBefore)
    findings.push(`${locale}: tapping a title navigated away instead of previewing`);
  if (!tapped?.includes('dark-timber-stair-villa'))
    findings.push(`${locale}: tap did not select the 4th installation (got ${tapped})`);

  await touch.close();

  // ── 320px overflow ───────────────────────────────────────────────────────
  const narrow = await browser.newContext({ viewport: { width: 320, height: 800 } });
  const np = await narrow.newPage();
  await np.goto(`${BASE}/${locale}/projects`, { waitUntil: 'load' });
  await np.waitForTimeout(700);
  const over = await np.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    worst: [...document.querySelectorAll('[data-project-index] button, a[data-index-frame]')]
      .map((el) => Math.round(el.getBoundingClientRect().right))
      .reduce((a, b) => Math.max(a, b), 0),
  }));
  note(`320px: document overflow ${over.doc}px, furthest edge ${over.worst}px`);
  if (over.doc > 0) findings.push(`${locale}: ${over.doc}px horizontal overflow at 320px`);

  await narrow.close();
}

// ── Reduced motion ─────────────────────────────────────────────────────────
const rm = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
});
const rp = await rm.newPage();
await rp.goto(`${BASE}/en/projects`, { waitUntil: 'load' });
await rp.waitForTimeout(900);
await rp.locator('[data-project-index] button[aria-pressed]').nth(2).hover();
await rp.waitForTimeout(120); // far shorter than the 0.8s reveal
const rmLink = await rp.locator('a[data-index-frame]').getAttribute('href');
console.log(`\n══ reduced motion ══`);
note(`after 120ms the frame link is ${rmLink}`);
if (!rmLink?.includes('parquet-salon-villa'))
  findings.push('reduced motion: selection did not apply promptly');
const rmOverflow = await rp.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth
);
if (rmOverflow > 0) findings.push(`reduced motion: ${rmOverflow}px overflow`);
await rm.close();

await browser.close();

console.log(`\n${'═'.repeat(60)}`);
if (findings.length === 0) console.log('PASS — no findings');
else {
  console.log(`${findings.length} FINDING(S):`);
  for (const f of findings) console.log('  ✗ ' + f);
}
process.exit(findings.length === 0 ? 0 : 1);
