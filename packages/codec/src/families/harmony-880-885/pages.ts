/**
 * A page of the Harmony 880 and 885's screen: what it is made of, read off a page of the configuration's own, and
 * a page of ours built from those parts. The device list and a device's own pages are one grammar on these remotes,
 * so one builder serves both.
 *
 * **The grammar, as every device mode and device list of the eight arch 8 configurations the lab holds draws it**,
 * each count below asserted in `sidekeysdevice.test.ts` unless it says otherwise:
 *
 * * a page of a one page mode is the mode's own program, and draws, in order: the background picture at the top
 *   left; the top bar, a region of one picture copied twice, at rows 0 and 12; the queued run of a screen program
 *   (`0x73 2` on seven configurations, `0x73 3` on one, read and not asserted); the title, in the title font at x 3 and y 10; a queued call
 *   of a list of the mode's own, which runs three screen programs; then the items, each a label and the separator
 *   picture of its cell; then the bottom bar, a region copied at row 152; then the end;
 * * the items fill the eight cells beside the keys left then right, row by row, `SIDE_KEY_GRIDS`; a left label
 *   starts at x 3 and a right one ends at x 125, 1918 of 1918 and 1823 of 1823 over every page of the eight
 *   configurations; a one line label sits 18 below its row's top, the rows 32 apart from 24, and the first line
 *   of two 5 below it in another font; after each label comes its cell's separator, one picture for the left
 *   column at x 0 and one for the right at x 64, at the row's top, after every one of those 3741 lines;
 * * a page of a mode of several pages draws its items, the bottom bar and a counter, `n OF m`, and jumps to the
 *   mode's own program, which draws the top bar, the queued program, the title and the queued list. The counter is
 *   two arrow pictures at x 25 and 88 of row 152 and three texts in one font: the page's number ending at x 52,
 *   `OF` at 57 and the total at 75, on every one of the 473 counters read.
 *
 * **What this builds is the one page form, and the counter on it where the mode has more than one page.** That is
 * Logitech's form for a mode of one page exactly. For a page of a mode of several it is not: Logitech's page jumps
 * to a program the mode carries once, where ours draws the same instructions itself, so a mode of ours with two
 * pages carries the top bar, the title and the queued calls twice. The difference is in where the bytes sit and in
 * the order the top bar and the items are drawn, which do not overlap; nothing a person sees is expected to differ,
 * and that is not checked on a unit. It was chosen because turning a mode of one page into Logitech's form moves the
 * title and the items out of a program other programs point into by text reference, which a first composer should
 * not have to do. How these remotes draw a screen is not yet written up as a screen family of the codec, and until
 * it is, which form a builder of the screens should take stays open, requirement R35.
 *
 * **The pictures, the fonts and the queued program are the configuration's own, borrowed off a page it already
 * draws**, as the Harmony 650's composers borrowed before they drew their own: a device page's off one of the
 * configuration's device modes, the device list's new page off the list itself. Nothing here draws a picture or a
 * glyph of ours.
 */
import { u24 } from '../../support/bytes.ts';
import { SIDE_KEY_GRIDS, type LabelGrid } from '../../inventory/cornerlayout.ts';
import { Writer } from '../../container/emit.ts';
import { type FontSet, fontSets } from '../../screens/font.ts';
import type { Container } from '../../container/gspm.ts';
import { ACTION_LIST_INDEX_OPCODE, type ModeRecord, modeRecords } from '../../container/sections.ts';
import {
  SCREEN_DRAW_IMAGE, SCREEN_DRAW_IMAGE_AT, SCREEN_END, SCREEN_JUMP, SCREEN_QUEUE_INSTRUCTION, SCREEN_SELECT_FONT,
  SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, type ScreenInstruction, screenProgram,
} from '../../screens/screen.ts';
import { RUN_SCREEN_PROGRAM } from '../../inventory/inventory.ts';
import { ComposeError } from '../../shared/core.ts';
import type { ModeProgram } from '../../shared/modes.ts';
import { codesFor, textGlyphs, textWidth } from '../../shared/spelling.ts';
import { characterMap } from '../../screens/text.ts';
import { SIDE_KEYS_NAME } from './sends.ts';

/** The eight keys beside the screen with their cells, in the order a page fills them: the reader's table. */
export const SIDE_KEYS_GRID = SIDE_KEY_GRIDS[8] as LabelGrid;

/** Items a page holds: one per key beside the screen. */
export const SIDE_KEYS_PER_PAGE = SIDE_KEYS_GRID.items.length;

/** Where a left label starts and a right one ends, 1918 of 1918 and 1823 of 1823 lines 18 below a row. */
export const SIDE_KEYS_LEFT_X = 3;
export const SIDE_KEYS_RIGHT_END = 125;

/**
 * The widest label of one line the compiles draw, 59 pixels: the right column's widest, and the left column's
 * labels end by x 62, which from x 3 is 59 too. A label of ours is held to it rather than cut or wrapped, since
 * the compiler's rule for wrapping a label onto two lines is not read here, requirement R35.
 */
export const SIDE_KEYS_LABEL_WIDTH = 59;

/** The top of the first row of cells and the pitch between rows, in pixels. */
export const SIDE_KEYS_ROW_TOP = 24;
export const SIDE_KEYS_ROW_PITCH = 32;

/** A one line label's y below its row's top. */
export const SIDE_KEYS_LINE_Y = 18;

/** Where the separator picture of each column is drawn, at its row's top. */
export const SIDE_KEYS_SEPARATOR_X: readonly [number, number] = [0, 64];

/** The title's place, and the right edge a title of ours is held to, the labels' own. */
export const SIDE_KEYS_TITLE_XY: readonly [number, number] = [3, 10];

/** The two rows the top bar is copied to, and the row the bottom bar and the counter sit on. */
export const SIDE_KEYS_TOP_ROWS: readonly [number, number] = [0, 12];
export const SIDE_KEYS_BOTTOM_ROW = 152;

/** The counter: the two arrows' x, where the page number ends, and where `OF` and the total start. */
export const SIDE_KEYS_ARROW_X: readonly [number, number] = [25, 88];
export const SIDE_KEYS_NUMBER_END = 52;
export const SIDE_KEYS_OF_X = 57;
export const SIDE_KEYS_TOTAL_X = 75;

/** A picture or a copied region: where its instruction draws it and the picture's address. */
interface Placed {
  /** The operand bytes before the address: two for a picture, six for a copied region. */
  readonly at: readonly number[];
  readonly address: number;
}

/** What a page of the configuration's own is made of, read off it, for a page of ours to borrow. */
export interface SideKeysChrome {
  /** The picture drawn at the top left, the page's background. */
  readonly background: number;
  /** The two copies of the top bar, rows 0 and 12, and the bottom bar's copy at row 152. */
  readonly top: readonly [Placed, Placed];
  readonly bottom: Placed;
  /** The screen program the page queues the run of, `0x73`'s operand. */
  readonly program: number;
  /** The list of the mode's own the page queues a call of, `0x7F`'s operand. */
  readonly list: number;
  readonly titleFont: number;
  /** The title as drawn, its glyph codes. */
  readonly title: readonly number[];
  /** The font one line labels are drawn in, and each column's separator picture. */
  readonly labelFont: number;
  readonly separators: readonly [number, number];
}

/** What a counter is drawn with: the two arrows and the font, off a page of the configuration's that has one. */
export interface SideKeysCounter {
  readonly arrows: readonly [number, number];
  readonly font: number;
}

/** The instructions a mode draws on its first page: the page's own, then the mode's own if the page jumps to it. */
function drawnBy(c: Container, record: ModeRecord): ScreenInstruction[] {
  const page = record.pages[0];
  if (page === undefined) throw new ComposeError('a mode with no page draws nothing to borrow');
  const own = screenProgram(c, page.program) ?? [];
  const jump = own.at(-1);
  const head = jump?.opcode === SCREEN_JUMP ? screenProgram(c, u24(c.blob, jump.start + 1)) ?? [] : [];
  return [...own, ...head];
}

/** The address an instruction names in its last three operand bytes. */
function addressOf(c: Container, one: ScreenInstruction): number {
  return u24(c.blob, one.start + one.length - 3);
}

/**
 * The parts of a mode's first page, as the grammar above names them, or a refusal naming the part it lacks. The
 * fonts are the ones in effect where the title and a one line label are drawn.
 */
export function sideKeysChrome(c: Container, mode: number): SideKeysChrome {
  const record = modeRecords(c)?.[mode];
  if (record === undefined) throw new ComposeError(`mode ${mode} does not read`);
  const drawn = drawnBy(c, record);
  let font: number | undefined;
  let background: number | undefined;
  const tops: Placed[] = [];
  let bottom: Placed | undefined;
  let program: number | undefined;
  let list: number | undefined;
  let titleFont: number | undefined;
  let title: number[] | undefined;
  let labelFont: number | undefined;
  const separators: (number | undefined)[] = [undefined, undefined];
  for (const one of drawn) {
    const [x, y] = [one.operands[0] as number, one.operands[1] as number];
    if (one.opcode === SCREEN_SELECT_FONT) font = x;
    else if (one.opcode === SCREEN_DRAW_IMAGE) {
      if (x === 0 && y === 0) background ??= addressOf(c, one);
      const row = (y - SIDE_KEYS_ROW_TOP) / SIDE_KEYS_ROW_PITCH;
      const column = SIDE_KEYS_SEPARATOR_X.indexOf(x);
      if (column >= 0 && Number.isInteger(row) && row >= 0 && row < SIDE_KEYS_PER_PAGE / 2) {
        separators[column] ??= addressOf(c, one);
      }
    } else if (one.opcode === SCREEN_DRAW_IMAGE_AT) {
      const placed = { at: [...one.operands.slice(0, 6)], address: addressOf(c, one) };
      if (x === 0 && SIDE_KEYS_TOP_ROWS.includes(y) && tops.length < 2) tops.push(placed);
      if (x === 0 && y === SIDE_KEYS_BOTTOM_ROW) bottom ??= placed;
    } else if (one.opcode === SCREEN_QUEUE_INSTRUCTION) {
      const operand = (one.operands[0] as number) | ((one.operands[1] as number) << 8);
      if (one.operands[2] === RUN_SCREEN_PROGRAM) program ??= operand;
      if (one.operands[2] === ACTION_LIST_INDEX_OPCODE) list ??= operand;
    } else if (one.opcode === SCREEN_TEXT_AT || one.opcode === SCREEN_TEXT_INLINE) {
      if (x === SIDE_KEYS_TITLE_XY[0] && y === SIDE_KEYS_TITLE_XY[1]) {
        titleFont ??= font;
        title ??= [...(textGlyphs(c, one) ?? [])];
      } else if (y >= SIDE_KEYS_ROW_TOP && (y - SIDE_KEYS_ROW_TOP) % SIDE_KEYS_ROW_PITCH === SIDE_KEYS_LINE_Y) {
        labelFont ??= font;
      }
    }
  }
  const missing = [
    background === undefined ? 'a background' : undefined, tops.length < 2 ? 'the top bar' : undefined,
    bottom === undefined ? 'the bottom bar' : undefined, program === undefined ? 'a queued screen program' : undefined,
    list === undefined ? 'a queued list' : undefined, titleFont === undefined ? 'a title' : undefined,
    labelFont === undefined ? 'a label of one line' : undefined,
    separators[0] === undefined ? 'a left separator' : undefined, separators[1] === undefined ? 'a right separator' : undefined,
  ].filter((one) => one !== undefined);
  if (missing.length > 0) throw new ComposeError(`mode ${mode}'s first page draws no ${missing.join(', ')} to borrow`);
  return {
    background: background as number, top: [tops[0] as Placed, tops[1] as Placed], bottom: bottom as Placed,
    program: program as number, list: list as number, titleFont: titleFont as number, title: title as number[],
    labelFont: labelFont as number, separators: [separators[0] as number, separators[1] as number],
  };
}

/**
 * The counter's arrows and font off the first page of `modes` that draws one, or undefined where none does: a
 * configuration whose device modes all have one page has no counter to borrow, and a composer that needs one
 * refuses.
 */
export function sideKeysCounter(c: Container, modes: readonly number[]): SideKeysCounter | undefined {
  for (const mode of modes) {
    const record = modeRecords(c)?.[mode];
    for (const page of record?.pages ?? []) {
      let font: number | undefined;
      let counterFont: number | undefined;
      const arrows: (number | undefined)[] = [undefined, undefined];
      for (const one of screenProgram(c, page.program) ?? []) {
        if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0];
        const [x, y] = [one.operands[0] as number, one.operands[1] as number];
        if (y !== SIDE_KEYS_BOTTOM_ROW) continue;
        if (one.opcode === SCREEN_DRAW_IMAGE && SIDE_KEYS_ARROW_X.includes(x)) {
          arrows[SIDE_KEYS_ARROW_X.indexOf(x)] = addressOf(c, one);
        }
        if ((one.opcode === SCREEN_TEXT_AT || one.opcode === SCREEN_TEXT_INLINE) && x === SIDE_KEYS_OF_X) counterFont = font;
      }
      if (arrows[0] !== undefined && arrows[1] !== undefined && counterFont !== undefined) {
        return { arrows: [arrows[0], arrows[1]], font: counterFont };
      }
    }
  }
  return undefined;
}

/** One item on a page: its label's glyph codes in the page's label font. */
export interface SideKeysItem {
  readonly codes: readonly number[];
}

/** A page's counter: its number, the total, and what draws them. */
export interface SideKeysPageCount {
  readonly number: number;
  readonly total: number;
  readonly counter: SideKeysCounter;
}

/** A configuration's font sets, refusing a font it does not carry. */
function setOf(c: Container, font: number): FontSet {
  const set = (fontSets(c) ?? [])[font];
  if (set === undefined) throw new ComposeError(`the configuration carries no font ${font}`);
  return set;
}

/** The glyph codes of `text` in `font`, refused with the missing character, `codesFor`. */
export function sideKeysSpell(c: Container, font: number, text: string): number[] {
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the configuration draws no text to spell from');
  return codesFor(map, c, setOf(c, font), text, font);
}

/** The pixels `codes` take in `font`. */
export function sideKeysWidth(c: Container, font: number, codes: readonly number[]): number {
  return textWidth(c, setOf(c, font), codes);
}

/**
 * A label of ours spelled in the label font and held to the widest one the compiles draw, or refused: a label is
 * not cut or wrapped here.
 */
export function sideKeysLabel(c: Container, font: number, text: string): number[] {
  const codes = sideKeysSpell(c, font, text);
  const width = sideKeysWidth(c, font, codes);
  if (width > SIDE_KEYS_LABEL_WIDTH) {
    throw new ComposeError(`'${text}' is ${width} pixels wide and a cell holds ${SIDE_KEYS_LABEL_WIDTH}: give it a shorter label`);
  }
  return codes;
}

/**
 * The counter's instructions, `n OF m` between the two arrows, every text inline. Spelled in the counter's font,
 * which every configuration read draws its counters in, so the digits and `OF` are there; a configuration whose
 * counter font lacks one is refused by the speller.
 */
function counterBytes(c: Container, count: SideKeysPageCount, shifted: (address: number) => number): number[] {
  const { counter } = count;
  const number = sideKeysSpell(c, counter.font, String(count.number));
  const of = sideKeysSpell(c, counter.font, 'OF');
  const total = sideKeysSpell(c, counter.font, String(count.total));
  const y = SIDE_KEYS_BOTTOM_ROW;
  return [
    SCREEN_DRAW_IMAGE, SIDE_KEYS_ARROW_X[0], y, ...new Writer(3).u24(shifted(counter.arrows[0])).bytes,
    SCREEN_SELECT_FONT, counter.font,
    SCREEN_TEXT_INLINE, SIDE_KEYS_NUMBER_END - sideKeysWidth(c, counter.font, number), y, ...number, 0,
    SCREEN_TEXT_INLINE, SIDE_KEYS_OF_X, y, ...of, 0,
    SCREEN_TEXT_INLINE, SIDE_KEYS_TOTAL_X, y, ...total, 0,
    SCREEN_DRAW_IMAGE, SIDE_KEYS_ARROW_X[1], y, ...new Writer(3).u24(shifted(counter.arrows[1])).bytes,
  ];
}

/**
 * The counter on its own, for a page that has none yet: what goes in front of its end when its mode gains a page.
 * The arrows' addresses as `shifted` gives them, since the bytes are written into a hole of their own length.
 */
export function sideKeysCounterBytes(
  c: Container, count: SideKeysPageCount, shifted: (address: number) => number,
): Uint8Array {
  return new Uint8Array(counterBytes(c, count, shifted));
}

/**
 * A page in the one page form, with `count` where its mode has more than one page: the chrome borrowed, the title
 * and the items ours. `title` is drawn as given, in the chrome's title font; each item is its cell's label in the
 * chrome's label font and its separator, in fill order.
 */
export function sideKeysPageProgram(
  c: Container, chrome: SideKeysChrome, title: readonly number[], items: readonly SideKeysItem[],
  count?: SideKeysPageCount,
): ModeProgram {
  if (items.length === 0 || items.length > SIDE_KEYS_PER_PAGE) {
    throw new ComposeError(`a page of ${SIDE_KEYS_NAME} holds 1 to ${SIDE_KEYS_PER_PAGE} items, not ${items.length}`);
  }
  if (title.length === 0) throw new ComposeError('a page needs a title to draw');
  const bytes = (shifted: (address: number) => number): Uint8Array => {
    const address = (value: number): number[] => [...new Writer(3).u24(shifted(value)).bytes];
    const out: number[] = [
      SCREEN_DRAW_IMAGE, 0, 0, ...address(chrome.background),
      SCREEN_DRAW_IMAGE_AT, ...chrome.top[0].at, ...address(chrome.top[0].address),
      SCREEN_QUEUE_INSTRUCTION, chrome.program & 0xff, chrome.program >> 8, RUN_SCREEN_PROGRAM,
      SCREEN_DRAW_IMAGE_AT, ...chrome.top[1].at, ...address(chrome.top[1].address),
      SCREEN_SELECT_FONT, chrome.titleFont,
      SCREEN_TEXT_INLINE, SIDE_KEYS_TITLE_XY[0], SIDE_KEYS_TITLE_XY[1], ...title, 0,
      SCREEN_QUEUE_INSTRUCTION, chrome.list & 0xff, chrome.list >> 8, ACTION_LIST_INDEX_OPCODE,
      SCREEN_SELECT_FONT, chrome.labelFont,
    ];
    items.forEach((item, k) => {
      const cell = SIDE_KEYS_GRID.items[k] as (typeof SIDE_KEYS_GRID.items)[number];
      const top = SIDE_KEYS_ROW_TOP + SIDE_KEYS_ROW_PITCH * cell.row;
      const x = cell.column === 0 ? SIDE_KEYS_LEFT_X
        : SIDE_KEYS_RIGHT_END - sideKeysWidth(c, chrome.labelFont, item.codes);
      if (item.codes.length > 0) out.push(SCREEN_TEXT_INLINE, x, top + SIDE_KEYS_LINE_Y, ...item.codes, 0);
      out.push(SCREEN_DRAW_IMAGE, SIDE_KEYS_SEPARATOR_X[cell.column] as number, top,
        ...address(chrome.separators[cell.column] as number));
    });
    out.push(SCREEN_DRAW_IMAGE_AT, ...chrome.bottom.at, ...address(chrome.bottom.address));
    if (count !== undefined) out.push(...counterBytes(c, count, shifted));
    out.push(SCREEN_END);
    return new Uint8Array(out);
  };
  return { length: bytes((address) => address).length, build: bytes };
}
