/**
 * A command's name laid out on a Harmony One pad the way Logitech's compiler lays it, findings section 394,
 * `todo-compile-one.md` 1.2.6.
 *
 * **What a pad is.** A touchable command on a device page or an activity screen is a box 81 pixels wide and
 * 50 high at one of six places, `DEVICE_PAGE_SLOTS`, with the command's name drawn inside it. The composers
 * drew that name as one line and refused any name wider than the box, which is most of a receiver's sound
 * modes. Logitech's compiler instead breaks a name over up to three lines and cuts what still does not fit
 * with `..`, and one rule reproduces every pad label it could be checked against in the 19 distinct
 * configurations Logitech compiled for the Harmony One that the lab holds: 8310 lines on 7525 pads, and 551
 * of the 558 pads whose command is known by the record its press sends, the other seven being a `Z` the
 * character map could not name until section 396 and one record named by its frame value.
 *
 * **The rule, in four parts.**
 *
 * 1. **Words.** A name splits at each space, the space kept inside a line and dropped at a break; before an
 *    upper case letter, a digit or a `+` that follows a lower case letter; and after a hyphen not followed by
 *    another, an exception no drawn label measures, since none holds a doubled hyphen. It never splits a run
 *    of capitals (`DTSNEO`), a capital before a digit (`HDMI2V2`), a digit before a letter (`6Cinema`), or
 *    at `/`, `:` or `.`. Each of those was tested by adding or removing it:
 *    the digit boundary carries 11 labels, the hyphen 3, the plus 1 (`VolumeMain+`, thin); a slash as a
 *    boundary breaks 17.
 * 2. **Greedy lines.** A line takes the next word while the line, its separator and the word are at most
 *    `TOUCH_LABEL_JOIN_WIDTH`, 72 pixels: 111 pads draw a joined line of exactly 72 and 39 break where joining
 *    would make 73. Greedy is right on all 288 distinct names wider than 72; a balanced fill gets 39 wrong.
 * 3. **A word alone may be one pixel wider**, `TOUCH_LABEL_LINE_WIDTH`, 73, on one text (`DTSSurround`, drawn
 *    whole on 9 pads). A wider word takes a line of its own, cut to the longest prefix that is at most 73 with
 *    `..` after it, the rest of the word dropped, and the next word starts a new line. The cut's limit is
 *    pinned to 72 or 73 only. The Harmony 600, 650 and 700's labels have the same one pixel allowance for a
 *    label that cannot break, section 325.
 * 4. **Placement.** Each line is centred on its own width with the odd pixel to the left, `x = pad x +
 *    floor((81 - w) / 2)`, 8310 of 8310 lines; `Math.round`, which the composers used, puts 6053 of them a
 *    pixel right. The block sits on the one line drop, `DEVICE_LABEL_DROP`: lines `TOUCH_LABEL_PITCH` apart,
 *    the first at `pad y + 20 - floor(11 (n - 1) / 2)`, so 20; 15 and 26; 9, 20 and 31, on 6785, 695 and 45
 *    pads, no exception.
 *
 * **What was never seen is refused**: a fourth line, which 54 of the archive's 37750 names would need under
 * this rule; a word after a cut word that would have fitted beside it; a name with a leading, trailing or
 * double space. A character the font lacks is refused by `codesFor`.
 *
 * Measured in the lab's `work/one-track/labels/`. The Harmony One only: the 600 family lays its labels out
 * with a ladder of sizes and two lines, `fourSlotLabelLines`.
 */
import { type FontSet, fontSets } from '../../font.ts';
import { isSmoothedSet, measureSet } from '../../fonttable.ts';
import type { Container } from '../../gspm.ts';
import { type BytesMemo, memoOverBytes } from '../../memo.ts';
import { ComposeError } from '../../shared/core.ts';
import { codesFor, textWidth } from '../../shared/spelling.ts';
import { type CharacterMap, characterMap } from '../../text.ts';
import { modeRecords } from '../../sections.ts';
import { SCREEN_DRAW_IMAGE, SCREEN_SELECT_FONT, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, screenProgram } from '../../screen.ts';
import { DEVICE_LABEL_DROP, DEVICE_PAGE_SLOTS } from './menus.ts';
import { deviceModeMaps } from '../../inventory.ts';

/** A line may take another word only while it stays this wide, its separator included. */
export const TOUCH_LABEL_JOIN_WIDTH = 72;

/** A line of one word, whole or cut with `..`, may be this wide: `DTSSurround`, 73, is drawn whole. */
export const TOUCH_LABEL_LINE_WIDTH = 73;

/** Pixel rows from one line's top to the next. */
export const TOUCH_LABEL_PITCH = 11;

/** The most lines any compile draws on a pad; what happens past it was never seen. */
export const TOUCH_LABEL_MAX_LINES = 3;

/** Every pad of the six places is this wide, on device pages, activity screens and the rest alike. */
export const TOUCH_PAD_WIDTH = 81;

/** And this high. */
export const TOUCH_PAD_HEIGHT = 50;

/** What a cut word ends in. */
const CUT = '..';

/** One line of a pad's label: its text, the glyph codes that spell it, and where its first glyph goes. */
export interface TouchLabelLine {
  readonly text: string;
  readonly codes: number[];
  readonly x: number;
  readonly y: number;
}

/**
 * Whether `b` starts a word after `a`: after a hyphen not followed by another, or after a lower case
 * letter when `b` is an upper case letter, a digit or a plus.
 */
function startsWord(a: string, b: string): boolean {
  if (a === '-' && b !== '-') return true;
  return a >= 'a' && a <= 'z' && ((b >= 'A' && b <= 'Z') || (b >= '0' && b <= '9') || b === '+');
}

/**
 * The words of a name and the separator before each, a space or nothing, per part 1 of the rule.
 */
export function touchLabelWords(label: string): { sep: string; text: string }[] {
  const words: { sep: string; text: string }[] = [];
  let sep = '';
  let word = '';
  for (const ch of label) {
    if (ch === ' ') {
      words.push({ sep, text: word });
      word = '';
      sep = ' ';
      continue;
    }
    if (word !== '' && startsWord(word.at(-1) as string, ch)) {
      words.push({ sep, text: word });
      word = '';
      sep = '';
    }
    word += ch;
  }
  words.push({ sep, text: word });
  return words;
}

/**
 * `label` laid out on the pad whose box starts at `pad`, in `set`, the configuration's pad font numbered
 * `font`: the lines, their glyph codes and their places, or a refusal naming what was never seen.
 * `c` must be the container `set` was read from, since a set read before an insertion below it measures
 * stale glyphs, section 242.
 */
export function touchLabelLines(
  c: Container, map: CharacterMap, set: FontSet, font: number, label: string, pad: { readonly x: number; readonly y: number },
): TouchLabelLine[] {
  if (label === '' || label !== label.trim() || label.includes('  ')) {
    throw new ComposeError(`'${label}': a label with a leading, trailing or double space was never measured`);
  }
  const measure = (text: string): number => textWidth(c, set, codesFor(map, c, set, text, font));
  const lines: string[] = [];
  let line: string | undefined;
  let cutLast = false;
  for (const one of touchLabelWords(label)) {
    const wide = measure(one.text);
    if (wide > TOUCH_LABEL_LINE_WIDTH) {
      if (line !== undefined) lines.push(line);
      let k = one.text.length - 1;
      while (k > 0 && measure(one.text.slice(0, k) + CUT) > TOUCH_LABEL_LINE_WIDTH) k -= 1;
      if (k === 0) throw new ComposeError(`'${label}': no part of '${one.text}' fits a line`);
      lines.push(one.text.slice(0, k) + CUT);
      line = undefined;
      cutLast = true;
      continue;
    }
    if (cutLast && measure(lines.at(-1) as string) + measure(one.sep) + wide <= TOUCH_LABEL_JOIN_WIDTH) {
      throw new ComposeError(`'${label}': '${one.text}' would fit beside a cut word, which was never measured`);
    }
    cutLast = false;
    if (line !== undefined && measure(line + one.sep + one.text) <= TOUCH_LABEL_JOIN_WIDTH) {
      line += one.sep + one.text;
    } else {
      if (line !== undefined) lines.push(line);
      line = one.text;
    }
  }
  if (line !== undefined) lines.push(line);
  if (lines.length > TOUCH_LABEL_MAX_LINES) {
    throw new ComposeError(`'${label}' takes ${lines.length} lines and a pad was only ever drawn with ${TOUCH_LABEL_MAX_LINES}`);
  }
  return lines.map((text, k) => {
    const codes = codesFor(map, c, set, text, font);
    return { text, codes, x: pad.x + Math.floor((TOUCH_PAD_WIDTH - textWidth(c, set, codes)) / 2), y: padLineY(pad.y, lines.length, k) };
  });
}

/**
 * Where line `line` of a label of `n` lines starts in y on a pad whose picture's top is `padY`: the block on the one
 * line drop, `DEVICE_LABEL_DROP`, the lines `TOUCH_LABEL_PITCH` apart, section 394. One rule for every pad a Harmony
 * One draws a label on: the device pages', `devicepages.ts`, an activity's working screen's, `activityscreens.ts`,
 * and a label a composer lays out, `touchLabelLines`.
 */
export function padLineY(padY: number, n: number, line: number): number {
  return padY + DEVICE_LABEL_DROP - Math.floor((TOUCH_LABEL_PITCH * (n - 1)) / 2) + TOUCH_LABEL_PITCH * line;
}

/** The bytes a label's lines take in a screen program: an inline text per line, its x, y, codes and end. */
export function touchLabelLength(lines: readonly TouchLabelLine[]): number {
  return lines.reduce((sum, one) => sum + 1 + 2 + one.codes.length + 1, 0);
}

/**
 * The configuration's pad font, as a base slot 7 index: the font in force where a device page draws a text
 * inside one of its pad boxes, the one every such text agrees on. It is one face, 14 pixels high, under index
 * 5, 7, 8 or 9 depending on the configuration, section 394; `DEVICE_ROW_FONT`, 9, is it on 8 of the 19
 * containers read, which is why it is read rather than assumed. Only device pages are read: on
 * `calibration_one` 25 texts inside boxes on other pages are in a 15 pixel face against 325 in the pad
 * font. Undefined where no device page draws one, and a refusal where device pages disagree.
 */
export function padFontOf(c: Container): number | undefined {
  // Read once per container and its bytes, `memo.ts`: `touchDrawsName` asks for it once per screen item and
  // name it compares, which made this walk of every device page most of what that comparison cost.
  return memoOverBytes(PAD_FONTS, c, readPadFont);
}

const PAD_FONTS: BytesMemo<number | undefined> = new WeakMap();

function readPadFont(c: Container): number | undefined {
  const fonts = new Set<number>();
  const records = modeRecords(c) ?? [];
  // The device pages are the modes the device list enters, one per device, `deviceModeMaps`; a page's lead
  // byte names a hit page, whose number differs per configuration, so it cannot say which pages are a device's.
  for (const mode of new Set(deviceModeMaps(c).map((one) => one.mode))) {
    for (const page of records[mode]?.pages ?? []) {
      // A pad is its box picture drawn at one of the six places; a text inside a place where no box was
      // drawn is prose, which is drawn in another font.
      let font: number | undefined;
      const boxes = new Set<number>();
      for (const one of screenProgram(c, page.program) ?? []) {
        if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0];
        if (one.opcode === SCREEN_DRAW_IMAGE) {
          const at = DEVICE_PAGE_SLOTS.findIndex(([px, py]) => one.operands[0] === px && one.operands[1] === py);
          if (at >= 0) boxes.add(at);
        }
        if (one.opcode !== SCREEN_TEXT_INLINE && one.opcode !== SCREEN_TEXT_AT) continue;
        const [x, y] = [one.operands[0] as number, one.operands[1] as number];
        const inPad = DEVICE_PAGE_SLOTS.some(([px, py], k) => boxes.has(k)
          && x >= px && x < px + TOUCH_PAD_WIDTH && y >= py && y < py + TOUCH_PAD_HEIGHT);
        if (inPad && font !== undefined) fonts.add(font);
      }
    }
  }
  if (fonts.size > 1) throw new ComposeError(`the device pages draw their pads in fonts ${[...fonts].join(' and ')}`);
  return [...fonts][0];
}

/**
 * The one font set of the configuration drawn in `face`, as `fonttable.ts` measures a set's face, or a
 * refusal: the Harmony One's texts are drawn in a face per role, the same on every compile, where the set's
 * number differs per configuration, findings section 399. A smoothed set is passed over, since it is one
 * our font step added for one background, `touchActivityFonts`, and not the face's set.
 */
export function fontOfFace(c: Container, face: string): number {
  const found = fontsOfFace(c, face);
  if (found.length !== 1) throw new ComposeError(`the config holds ${found.length} font sets of the face ${face}, not one`);
  return found[0] as number;
}

/**
 * Every font set of the configuration drawn in `face`, smoothed sets passed over, in table order. A face can be
 * held twice: every Logitech One compile with an activity holds two sets of the start up title's face, section
 * 402, so a caller that meets two decides by what the configuration draws in them.
 */
export function fontsOfFace(c: Container, face: string): number[] {
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  return (fontSets(c) ?? []).flatMap((set, k) => {
    try {
      return !isSmoothedSet(c, set) && measureSet(c, set, map).face === face ? [k] : [];
    } catch {
      return [];
    }
  });
}
