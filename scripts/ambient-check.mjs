/**
 * Is the pointer light actually visible?
 *
 * The light was tuned on a dark ground with fixed warm colours. On the linen theme that is
 * light over light, and the effect was very nearly invisible — but every structural check
 * passed, because the element existed, had opacity, and moved. "It renders" is not "you can
 * see it".
 *
 * So this measures the only thing that matters: how much the page's pixels change when the
 * pointer moves. And it measures a **control** first — the same two frames with the pointer
 * held still — because the four background forms drift on their own, and that drift would
 * otherwise be mistaken for the lamp.
 *
 * The cursor ring and dot are hidden for the measurement. They move with the pointer too, and
 * they would make an invisible glow look like a working one.
 *
 * Needs ffmpeg for the frame difference.
 *
 *   node scripts/ambient-check.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const BASE = process.argv[2] ?? 'http://localhost:3100';
const findings = [];
const note = (m) => console.log('  ' + m);

/**
 * Difference between two PNGs, as peak and average luma, 0–255.
 *
 * Averaging the whole frame to a single pixel — the first thing this did — reports 0 for any
 * subtle effect: a soft glow over a fraction of a 1280x800 frame averages well below one
 * level and rounds away. It reported 0 for the dark theme too, where the light is plainly
 * visible, which is how the measurement was caught rather than the code.
 *
 * `signalstats` keeps the peak, which is what a localised change actually shows up in.
 */
async function difference(a, b, crop) {
  // `metadata=print:file=-` writes to **stdout**. Parsing stderr — which is where ffmpeg's
  // own logging goes — found nothing and quietly reported 0 for both themes, including the
  // one where the light is plainly visible. That mismatch is what exposed it.
  const { stdout } = await run(
    'ffmpeg',
    [
      '-loglevel',
      'info',
      '-i',
      a,
      '-i',
      b,
      '-filter_complex',
      `[0][1]blend=all_mode=difference,${crop ? crop + ',' : ''}format=gray,signalstats,metadata=print:file=-`,
      '-f',
      'null',
      '-',
    ],
    { encoding: 'utf8', maxBuffer: 1 << 24 }
  );
  const peak = /lavfi\.signalstats\.YMAX=(\d+(?:\.\d+)?)/.exec(stdout);
  const avg = /lavfi\.signalstats\.YAVG=(\d+(?:\.\d+)?)/.exec(stdout);
  if (!peak) throw new Error('ffmpeg produced no signalstats output — the diff pipeline is broken');
  return { peak: peak ? Number(peak[1]) : 0, avg: avg ? Number(avg[1]) : 0 };
}

const dir = await mkdtemp(path.join(tmpdir(), 'ambient-'));
const browser = await chromium.launch();

// A static page: no hero video, no travelling film strip. Anything that animates on its own
// would land in the difference and be indistinguishable from the lamp.
const ROUTE = '/contact';

for (const theme of ['light', 'dark']) {
  console.log(`\n══ ${theme} ══`);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem('ee-theme', t), theme);
  await page.goto(`${BASE}/en${ROUTE}`, { waitUntil: 'load' });

  // Only the glow may contribute.
  await page.addStyleTag({
    content: '[data-cursor-ring],[data-cursor-dot]{display:none !important}',
  });
  await page.waitForTimeout(1500);

  const state = await page.evaluate(() => {
    const field = document.querySelector('[data-ambient]');
    const glow = document.querySelector('[data-cursor-glow]');
    return {
      fieldState: field?.dataset.state ?? null,
      glowShown: glow ? getComputedStyle(glow).display !== 'none' : false,
      glowOpacity: glow ? getComputedStyle(glow).opacity : null,
      glowBackground: glow ? getComputedStyle(glow).backgroundImage.slice(0, 60) : null,
    };
  });
  note(`field "${state.fieldState}", glow shown ${state.glowShown}, opacity ${state.glowOpacity}`);
  if (state.fieldState !== 'live')
    findings.push(`${theme}: ambient field is "${state.fieldState}", expected "live"`);
  if (!state.glowShown) findings.push(`${theme}: the pointer light is not rendered`);
  if (state.glowBackground === 'none')
    findings.push(`${theme}: the pointer light has no background`);

  const shoot = async (name) => {
    const file = path.join(dir, `${theme}-${name}.png`);
    await writeFile(file, await page.screenshot());
    return file;
  };

  // Measure only where the lamp lands. The four background forms drift across the whole
  // frame, and over a full 1280x800 they dominate both the peak and the average — the lamp
  // is a local effect and has to be measured locally or it is buried in the noise.
  const AT = { x: 1080, y: 400 };
  const SPAN = 520; // the glow is 46vmin across and blurred by 70px
  const crop = `crop=${SPAN}:${SPAN}:${AT.x - SPAN / 2}:${AT.y - SPAN / 2}`;

  // ── Control: how much the page changes on its own ────────────────────────
  await page.mouse.move(200, 400);
  await page.waitForTimeout(1400); // let the eased light settle
  const still1 = await shoot('still1');
  await page.waitForTimeout(1400);
  const still2 = await shoot('still2');
  const drift = await difference(still1, still2, crop);

  // ── The lamp: same interval, pointer moved right across ──────────────────
  await page.mouse.move(AT.x, AT.y);
  await page.waitForTimeout(1400);
  const moved = await shoot('moved');
  const delta = await difference(still2, moved, crop);

  note(`drift where the lamp lands:     peak ${drift.peak}, avg ${drift.avg.toFixed(2)}`);
  note(`change when the pointer arrives: peak ${delta.peak}, avg ${delta.avg.toFixed(2)}`);

  // Average, not peak: the lamp is a broad wash, and a wash is what the average measures.
  //
  // The floor is calibrated against the dark theme, which is the version confirmed to look
  // right — it measures about 1.2 levels over this patch at roughly 30x the local drift. So
  // 1.0 and 5x is "at least as present as the one that works", not a number picked to make
  // the test pass. If the dark theme is ever retuned, recalibrate from it again.
  const ratio = delta.avg / Math.max(drift.avg, 0.01);
  note(`lamp is ${ratio.toFixed(1)}x the drift, avg ${delta.avg.toFixed(2)}`);
  if (delta.avg < 1 || ratio < 5) {
    findings.push(
      `${theme}: the pointer light washes only ${delta.avg.toFixed(2)} levels against ${drift.avg.toFixed(2)} of drift (${ratio.toFixed(1)}x) — too faint to see`
    );
  }

  // ── The lamp must not eat text contrast ──────────────────────────────────
  // It sits behind everything, so annotation text does pass under it. On a light ground a
  // warm wash lowers the ground's luminance, and the margin there is small: the first tuning
  // of this took --ink-3 from 5.13:1 to 4.60:1, which passes AA only just. Measure the ground
  // as actually rendered under the lamp centre, rather than trusting the arithmetic.
  const ground = await (async () => {
    // Find a patch of *plain page* rather than assuming one. Guessing a coordinate put the
    // first version of this sample on the terracotta CTA and reported the ground as #bd6c4d,
    // which then "failed" contrast for both themes — a measurement error, not a defect.
    const spot = await page.evaluate(() => {
      const bare = (x, y) => {
        // Every element under the point must be a plain container: no text node of its own,
        // no media, no control, no painted surface of its own.
        const stack = document.elementsFromPoint(x, y);
        for (const el of stack) {
          if (el === document.documentElement || el === document.body) continue;
          if (el.closest('[data-ambient]')) continue;
          const tag = el.tagName;
          if (['IMG', 'VIDEO', 'BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SVG', 'PATH'].includes(tag))
            return false;
          const hasOwnText = [...el.childNodes].some(
            (n) => n.nodeType === 3 && n.textContent.trim().length > 0
          );
          if (hasOwnText) return false;
          const bg = getComputedStyle(el).backgroundColor;
          if (bg !== 'rgba(0, 0, 0, 0)' && el.tagName !== 'MAIN' && el.tagName !== 'DIV')
            return false;
        }
        return true;
      };
      for (let y = 140; y < window.innerHeight - 80; y += 20) {
        for (let x = window.innerWidth - 60; x > 60; x -= 20) {
          if (
            bare(x, y) &&
            bare(x - 18, y) &&
            bare(x + 18, y) &&
            bare(x, y - 18) &&
            bare(x, y + 18)
          )
            return { x, y };
        }
      }
      return null;
    });
    if (!spot) throw new Error('no bare patch of page to sample the lit ground from');
    await page.mouse.move(spot.x, spot.y);
    await page.waitForTimeout(1500);
    const file = path.join(dir, `${theme}-ground.png`);
    await writeFile(
      file,
      await page.screenshot({ clip: { x: spot.x - 16, y: spot.y - 16, width: 32, height: 32 } })
    );
    const { stdout } = await run(
      'ffmpeg',
      [
        '-loglevel',
        'error',
        '-i',
        file,
        '-vf',
        'scale=1:1',
        '-frames:v',
        '1',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgb24',
        '-',
      ],
      { encoding: 'buffer' }
    );
    return [stdout[0], stdout[1], stdout[2]];
  })();

  const ink3 = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.className = 'text-ink-3';
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  });

  const luminance = (c) =>
    c
      .map((v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [hi, lo] = [luminance(ink3), luminance(ground)].sort((a, b) => b - a);
  const contrast = (hi + 0.05) / (lo + 0.05);

  const asHex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  note(`ground under the lamp ${asHex(ground)}; annotation text ${contrast.toFixed(2)}:1`);
  if (contrast < 4.5)
    findings.push(
      `${theme}: annotation text measures ${contrast.toFixed(2)}:1 against the lit ground — below AA`
    );

  await ctx.close();
}

await browser.close();
await rm(dir, { recursive: true, force: true });

console.log(`\n${'═'.repeat(62)}`);
if (findings.length === 0) console.log('PASS — no findings');
else {
  console.log(`${findings.length} FINDING(S):`);
  for (const f of findings) console.log('  ✗ ' + f);
}
process.exit(findings.length === 0 ? 0 : 1);
