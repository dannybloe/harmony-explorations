/**
 * The labels on the Harmony One's pads centred by their own letters, `todo-compile-one.md` 1.2.11.2, asked for
 * on 16 October 2026 when the labels on the screens looked to sit at different heights.
 *
 * **They sat low, and Logitech's sit just as low.** A pad's label lines are drawn at the heights Logitech's
 * layout puts them: on a device page one line 20 pixels into the 50 pixel pad, two at 15 and 26, three at 9,
 * 20 and 31, over the eighteen Harmony One compiles whose device modes are read, findings section 399. Our letters reach the rows
 * Logitech's do, section 396, so their capitals end up where Logitech's do, the middle of a one line label's
 * capitals 2 pixels below the pad's in the 14 pixel set device pages draw them in, and a word with a g, p or y
 * looks lower still. On Logitech's
 * own letters this step moves 368 label lines of a compile of two devices, 348 up by two pixels and 20 by one. What
 * read as low was seen on our flat boxes; Logitech's boxes are a gradient, and whether that hid it is not
 * known. The remote draws each text exactly where the configuration says, so this is the configuration's to
 * fix.
 *
 * So every pad's label is placed by its letters: the block from the first line's capital top to the last
 * line's capital foot is centred in the pad, and descenders hang below it as they do in any typeset line.
 * Only each text's y byte changes, so no program moves, and Logitech's donor pages are centred alike. The
 * capitals are read off the capital H of the font each line is drawn in, as the renderer meets it.
 *
 * Runs before the letters are blended, while every set is an ink and at most a shadow, which is what tells a
 * letter's ink from its shadow.
 */
import { fontSets, glyphOf } from '../../font.ts';
import { measureSet } from '../../fonttable.ts';
import { type Container, parse } from '../../gspm.ts';
import { renderVariants, type TextDrawn } from '../../render.ts';
import {
  reachablePrograms, SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, screenProgram,
} from '../../screen.ts';
import { modeRecords } from '../../sections.ts';
import { ComposeError, restamped } from '../../shared/core.ts';
import { characterMap } from '../../text.ts';
import { TOUCH_PAD_HEIGHT, TOUCH_PAD_WIDTH } from './labels.ts';
import { DEVICE_PAGE_SLOTS } from './menus.ts';

/** How many appearances of a page are drawn to find its labels. */
const VARIANTS = 16;

/** The rows of a set's capital H that hold its ink, top and foot, or undefined where the set has no H. */
function capitals(c: Container, font: number): { top: number; foot: number } | undefined {
  const map = characterMap(c);
  const set = (fontSets(c) ?? [])[font];
  const code = map === undefined ? undefined : [...map.codes].find(([, ch]) => ch === 'H')?.[0];
  if (map === undefined || set === undefined || code === undefined) return undefined;
  const glyph = glyphOf(c, set, code);
  if (glyph === undefined) return undefined;
  // A set no face measures, a donor's own, is left where Logitech put it.
  let ink: number;
  try { ink = measureSet(c, set, map).ink; } catch { return undefined; }
  const rows = glyph.rows.flatMap((row, y) => (row.includes(ink) ? [y] : []));
  return rows.length === 0 ? undefined : { top: rows[0] as number, foot: rows.at(-1) as number };
}

/** The configuration with every pad's label centred in its pad by its letters, per the header. */
export function withCentredPadLabels(c: Container): Container {
  const bytes = Uint8Array.from(c.blob);
  for (const [at, shift] of padLabelShifts(c)) {
    const opcode = bytes[at];
    if (opcode !== SCREEN_TEXT_INLINE && opcode !== SCREEN_TEXT_AT) throw new ComposeError(`no text at ${at} to move`);
    bytes[at + 2] = (bytes[at + 2] as number) + shift;
  }
  return parse(restamped(bytes));
}

/** How far each pad label's text instruction moves down, by its blob offset, the step's reading. */
export function padLabelShifts(c: Container): Map<number, number> {
  // Per page, every text drawn inside a pad the page draws, with the font it was drawn in. A page that draws no
  // picture at a pad place has no pad there, and a text in that area is something else, a help screen's line,
  // and stays put. Labels are grouped within one page and one place only: grouping a place's lines across
  // pages joined one page's last line to the next page's first, as a reviewer measured, and moved a one line
  // label by the wrong amount.
  const labelsOf: { y: number; label: TextDrawn[] }[] = [];
  for (const record of modeRecords(c) ?? []) {
    for (const page of record.pages) {
      const roots = [page.program];
      for (const one of screenProgram(c, page.program) ?? []) if (one.opcode === SCREEN_CALL && one.targets[0] !== undefined) roots.push(one.targets[0]);
      const drawn = new Set([...reachablePrograms(c, roots).values()].flat()
        .filter((one) => one.opcode === SCREEN_DRAW_IMAGE).map((one) => `${one.operands[0]},${one.operands[1]}`));
      const pads = DEVICE_PAGE_SLOTS.filter(([x, y]) => drawn.has(`${x},${y}`));
      if (pads.length === 0) continue;
      const texts = new Map<number, TextDrawn>();
      renderVariants(c, page.program, VARIANTS, (text) => {
        const inPad = pads.some(([x, y]) => text.x >= x && text.x < x + TOUCH_PAD_WIDTH
          && text.y >= y && text.y < y + TOUCH_PAD_HEIGHT);
        if (inPad && !text.covered) texts.set(text.at, text);
      });
      for (const [x, y] of pads) {
        // A page's appearances can draw different labels at one place, one per switch arm, so the lines are
        // grouped into labels in program order: a line joins the one before it when it sits below it within one
        // line's height.
        const lines = [...texts.values()].filter((one) => one.x >= x && one.x < x + TOUCH_PAD_WIDTH
          && one.y >= y && one.y < y + TOUCH_PAD_HEIGHT).sort((a, b) => a.at - b.at);
        const labels: TextDrawn[][] = [];
        for (const line of lines) {
          const last = labels.at(-1);
          const previous = last?.at(-1);
          if (last !== undefined && previous !== undefined && line.y > previous.y && line.y - previous.y <= previous.height) last.push(line);
          else labels.push([line]);
        }
        for (const label of labels) labelsOf.push({ y, label });
      }
    }
  }
  // Per label the shift that centres its block of lines.
  const shifts = new Map<number, number>();
  for (const { y, label } of labelsOf) {
    const first = label[0] as TextDrawn;
    const lastLine = label.at(-1) as TextDrawn;
    const top = capitals(c, first.font);
    const foot = capitals(c, lastLine.font);
    if (top === undefined || foot === undefined) continue;
    const blockTop = first.y + top.top;
    const blockFoot = lastLine.y + foot.foot;
    const shift = Math.round((y + (TOUCH_PAD_HEIGHT - 1) / 2) - (blockTop + blockFoot) / 2);
    for (const line of label) {
      const had = shifts.get(line.at);
      if (had !== undefined && had !== shift) throw new ComposeError(`the label text at ${line.at} is drawn on two pads that want it at two heights`);
      shifts.set(line.at, shift);
    }
  }
  return shifts;
}
