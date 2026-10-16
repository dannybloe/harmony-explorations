/**
 * The Harmony One's colour buttons, `todo-compile-one.md` 1.2.11.2: a pad whose label names one of the four
 * colour keys a television's remote carries is drawn as a circle in that colour on our box, rather than as
 * the word. Asked for on 16 October 2026, after the everyday Harmony One's own configuration was seen to draw
 * them: on one activity page, a glossy circle drawn over the pad under each of the words Red, Yellow, Green and
 * Blue, which the unprogrammed One's configuration carries too and none of the other seventeen compiles in the
 * lab does, findings section 399; their device pages draw the word on the ordinary pad. So the shape is
 * borrowed from a configuration and the decision to draw it everywhere is ours.
 *
 * **Recognised by the label and nothing else**: a configuration states no colour, only the word its pad
 * draws, which is the command's name. The names per colour are a choice, `TouchChoices.colourButtons`, so a
 * configuration in another language can add its own.
 *
 * **The word goes by default and can stay**, `colourButtonLabels`: the circle alone is the look chosen, and
 * the word is for whoever cannot tell the colours apart. Where it stays, the circle is drawn larger,
 * `colourCircle.withLabel`, so that a word inside it lies on one colour and is smoothed against it, which is why
 * our pages select the pad font before every label; "Yellow" is still wider than the circle at the rows its
 * letters occupy and stays unsmoothed, `todo-compile-one.md` 1.2.11.2.8. Where it goes, its text instruction is cut out of the page, a text
 * drawn by reference with its pointer, and a word other texts draw by reference once those are gone.
 *
 * Runs on a composed configuration, after the device look and before the letters are blended, and reaches
 * every page that draws a pad: the activity screens and the device pages, Logitech's donor pages included.
 */
import { Writer } from '../../emit.ts';
import { type Container, parse } from '../../gspm.ts';
import { deviceModeMaps } from '../../inventory.ts';
import { picturesByContent, withBankPictures } from '../../pictures.ts';
import { rgb565, rgbTo565 } from '../../png.ts';
import { excise, RelocateError } from '../../relocate.ts';
import { contentKey } from '../../screencategories.ts';
import { encodeBitmap, reachablePrograms, SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, screenProgram } from '../../screen.ts';
import { modeRecords } from '../../sections.ts';
import { ComposeError, restamped } from '../../shared/core.ts';
import { textGlyphs } from '../../shared/spelling.ts';
import { characterMap, decode } from '../../text.ts';
import { activityBoxRows } from './activitypictures.ts';
import { activityPadBehind } from './activityscreen.ts';
import type { TouchChoices } from './choices.ts';
import { TOUCH_PAD_HEIGHT, TOUCH_PAD_WIDTH } from './labels.ts';
import { DEVICE_PAGE_SLOTS } from './menus.ts';

/** Samples per pixel side when a pixel's coverage by the circle is measured. */
const SAMPLES = 4;
/** `#rrggbb` as its three channels. */
function channels(hex: string): number[] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (m === null) throw new Error(`${hex} is not a colour of the form #rrggbb`);
  return [1, 2, 3].map((k) => parseInt(m[k] as string, 16));
}

/**
 * A colour button's circle, `diameter` pixels across, in `hex`, with an outline `outline.width` pixels wide in
 * `outline.colour`, centred on the box `under` and smoothed into it. The outline is white by default, asked
 * for on 16 October 2026 so that the circle stands out from the box.
 */
export function colourButtonRows(
  under: readonly (readonly (number | undefined)[])[], hex: string, diameter: number,
  outline: { readonly colour: string; readonly width: number },
): (number | undefined)[][] {
  const fill = channels(hex);
  const rim = channels(outline.colour);
  const height = under.length;
  const width = under[0]?.length ?? 0;
  const [cx, cy, r] = [width / 2, height / 2, diameter / 2];
  const covered = (x: number, y: number, radius: number): number => {
    let inside = 0;
    for (let sy = 0; sy < SAMPLES; sy += 1) {
      for (let sx = 0; sx < SAMPLES; sx += 1) {
        if ((x + (sx + 0.5) / SAMPLES - cx) ** 2 + (y + (sy + 0.5) / SAMPLES - cy) ** 2 <= radius ** 2) inside += 1;
      }
    }
    return inside / (SAMPLES * SAMPLES);
  };
  return under.map((row, y) => row.map((pixel, x) => {
    const outer = covered(x, y, r);
    if (pixel === undefined || outer === 0) return pixel;
    const inner = covered(x, y, r - outline.width);
    const paper = rgb565(pixel);
    const mixed = [0, 1, 2].map((k) => Math.round((paper[k] as number) * (1 - outer)
      + (rim[k] as number) * (outer - inner) + (fill[k] as number) * inner));
    return rgbTo565(mixed[0] as number, mixed[1] as number, mixed[2] as number);
  }));
}

/** The colour a label names, by the choice's names, compared without case or surrounding space. */
function colourNamed(choices: TouchChoices, label: string): string | undefined {
  const wanted = label.trim().toLowerCase();
  return Object.entries(choices.colourButtons).find(([, one]) => one.names.some((name) => name.toLowerCase() === wanted))?.[0];
}

/** One colour pad found: the pad's draw, the colour, the box look its page is in, and its label's texts. */
interface ColourPad {
  drawAt: number;
  colour: string;
  look: 'activity' | 'device';
  texts: { at: number; length: number }[];
}

/** Every pad of every page whose label names a colour, read off the configuration as it is. */
function colourPads(c: Container, choices: TouchChoices): ColourPad[] {
  const map = characterMap(c);
  if (map === undefined) return [];
  const records = modeRecords(c) ?? [];
  const deviceModes = new Set(deviceModeMaps(c).map((one) => one.mode));
  const slots = new Set(DEVICE_PAGE_SLOTS.map(([x, y]) => `${x},${y}`));
  const found = new Map<number, ColourPad>();
  records.forEach((record, mode) => {
    for (const page of record.pages) {
      const roots = [page.program];
      for (const one of screenProgram(c, page.program) ?? []) if (one.opcode === SCREEN_CALL && one.targets[0] !== undefined) roots.push(one.targets[0]);
      const instructions = [...reachablePrograms(c, roots).values()].flat();
      for (const draw of instructions) {
        if (draw.opcode !== SCREEN_DRAW_IMAGE) continue;
        const [x, y] = [draw.operands[0] as number, draw.operands[1] as number];
        if (!slots.has(`${x},${y}`) || found.has(draw.start)) continue;
        const texts = instructions.filter((one) => (one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT)
          && (one.operands[0] as number) >= x && (one.operands[0] as number) < x + TOUCH_PAD_WIDTH
          && (one.operands[1] as number) >= y && (one.operands[1] as number) < y + TOUCH_PAD_HEIGHT);
        const label = texts.map((one) => { const glyphs = textGlyphs(c, one); return glyphs === undefined ? '' : decode(glyphs, map); }).join(' ');
        const colour = colourNamed(choices, label);
        if (colour === undefined) continue;
        found.set(draw.start, {
          drawAt: draw.start, colour, look: deviceModes.has(mode) ? 'device' : 'activity',
          texts: texts.map((one) => ({ at: one.start, length: one.length })),
        });
      }
    }
  });
  return [...found.values()];
}

/** The configuration with its colour buttons drawn as circles, per the header. */
export function withColourButtons(c: Container, choices: TouchChoices): Container {
  const pads = colourPads(c, choices);
  if (pads.length === 0) return c;
  const behind = activityPadBehind(c);
  const diameter = choices.colourButtonLabels ? choices.colourCircle.withLabel : choices.colourCircle.alone;
  const pictureOf = (look: 'activity' | 'device', colour: string): Uint8Array => {
    const box = activityBoxRows(TOUCH_PAD_WIDTH, TOUCH_PAD_HEIGHT, look === 'activity' ? choices.activityBox : choices.deviceBox, behind);
    return encodeBitmap(colourButtonRows(box, (choices.colourButtons[colour] as { colour: string }).colour, diameter,
      choices.colourCircle.outline));
  };
  const wanted = new Map(pads.map((one) => [`${one.look} ${one.colour}`, pictureOf(one.look, one.colour)]));
  let current = withBankPictures(c, [...wanted.values()]).container;
  const held = picturesByContent(current);

  // Every colour pad pointed at its circle, read again where the bank's growth left it.
  const again = colourPads(current, choices);
  const bytes = Uint8Array.from(current.blob);
  for (const pad of again) {
    const address = held.get(contentKey(wanted.get(`${pad.look} ${pad.colour}`) as Uint8Array))?.[0];
    if (address !== undefined) bytes.set(new Writer(3).u24(address).bytes, pad.drawAt + 3);
  }
  current = parse(restamped(bytes));
  if (choices.colourButtonLabels) return current;

  // The words cut, last first so an earlier cut does not move a later one's offset. A word another text draws
  // by reference cannot go while that text stays, so the cuts run again, read afresh, for as long as one of
  // them lands: the referencing texts go in one pass and the word they drew in the next.
  for (;;) {
    // Once each: a place can draw two pictures under one word, Logitech's pad and then its circle on one
    // activity page of `one_config`, and the word is listed under both. Cutting it twice cut the six bytes
    // after it the second time, a draw, as a reviewer measured.
    const cuts = [...new Map(colourPads(current, choices).flatMap((pad) => pad.texts).map((one) => [one.at, one])).values()]
      .sort((a, b) => b.at - a.at);
    let landed = 0;
    for (const cut of cuts) {
      const opcode = current.blob[cut.at];
      if (opcode !== SCREEN_TEXT_INLINE && opcode !== SCREEN_TEXT_AT) throw new ComposeError(`the colour word at ${cut.at} is not a text to cut`);
      try {
        current = parse(restamped(excise(current, cut.at, cut.length, { wholeFields: true }).bytes));
        landed += 1;
      } catch (error) {
        // Another text draws these bytes by reference, or a pointer lands in them: the word stays this pass.
        if (!(error instanceof RelocateError)) throw error;
      }
    }
    if (landed === 0) return current;
  }
}
