/**
 * The Harmony One's screens built from a template: the language a fixed screen is written in, the reader that
 * takes a description of a configuration's numbering off its screens against a template, and the builder that
 * makes the screens again from that description. Shared by `fixedscreens.ts` (`todo-compile-one.md` 4.4.4.1,
 * findings section 411) and `tourscreens.ts` (4.4.4.2, section 412), so that both read and build a screen
 * the same way rather than each keeping a copy. It was `fixedscreens.ts`' own until 4.4.4.2 needed it a second
 * time.
 *
 * **What a template screen is**, `TemplateScreen`: its own key map, the presses it swallows and its handlers;
 * its chrome, the program every page calls; and its pages, each a hit page, a page list, the list's copy and
 * a program. Every binding is a `Step`: a constant instruction, an instruction whose operand (or low byte, or
 * for a state write the opcode) is a number the configuration chose, or a list of the screen's own, whose index
 * is described and whose instructions are built. Every program is `Part`s: pictures, fonts by role, texts with
 * their place rule, queued steps, the chrome's call, switches on a state variable whose arms jump back, and
 * the constant drawing instructions a chrome may open with.
 *
 * **What a description carries**, `TemplateScreensSpec`: per screen the mode it is, its pages' hit pages, the
 * pictures in walk order and every other number in walk order; one font per role; and the homes, texts drawn by
 * reference to a copy outside the screens. **What is generated**: every opcode and constant operand, the tags
 * and their stored order (`keyListOrder`'s), every list's instructions, the switches' cases, every word and
 * where it is drawn, which text is drawn inline, and the records' bytes.
 *
 * **Inline or by reference** follows the compiler's one inline copy, section 334: a text the screens draw that
 * a program outside them holds is drawn by reference to it; otherwise the first program to draw it holds it
 * inline and every later one points there. "First" is the order the programs are laid out in, which section
 * 411 measured is mode order, a screen's chrome before its pages, and in a page the main line first, every
 * piece a switch joins at, then each switch's arms; so the builder builds in that order.
 *
 * **The mode entry's first byte** is generated: 1 exactly where the screen's own key map binds tag `0x29`,
 * section 411's 139 of 139 over the nineteen compiles.
 *
 * **Programs of their own**, `TemplateProgram`, since `todo-compile-one.md` 4.7 (section 414): a base slot 11
 * entry that no mode calls, read and built by the same program reader and writer as a screen's pages, with the
 * lists a state transition calls beside them, `TemplateCall`, and put back by `withTemplatePrograms`. The
 * clock's header programs needed three things the screens did not, each generic to the language: a switch on
 * a variable the firmware owns, a constant of the template; a switch inside an arm, whose join closes as the
 * arm would; and pictures drawn from several places, taken from a shared table by slot.
 *
 * **A text wrapped to a width**, `wrapped`, since `todo-compile-one.md` 4.6 (section 415): the help screens'
 * questions name a device, so how many lines a question takes is the device name's and the font's, not the
 * template's. The template states the words, the width and the block; the builder breaks the words into lines
 * with the font in force, `wrapLines`, and centres each. Since `todo-compile-one.md` 3.2.2.4 a wrapped part is rows
 * of a block, every block of the help screens is one, and the reader takes each row's lines by their words,
 * `joinLines`, rather than every text in a row, since one block may follow another and since the description of a
 * configuration lettered anew reads the lines Logitech's letters made while the builder breaks them in its own.
 *
 * **Roles**, `named`, since 3.2.2.4: a number step may say which number of the configuration's it is, and
 * `templateNumberSlots` walks a screen in the order the builder takes its numbers, so a caller can read each
 * role's value off the screens a configuration holds and number a screen it does not hold yet, the help screens'
 * questions about a composed device. The reader and the builder ignore roles.
 *
 * The Harmony One alone, the touch family's. Read only towards hardware: the result is pieces.
 */
import type { Container, Instruction } from '../../gspm.ts';
import { actionListBytes } from '../../gspm.ts';
import type { ContainerLayout, ContainerPiece, PieceRef } from '../../frame.ts';
import type { PieceTarget } from '../../statetables.ts';
import { taggedListBytes } from '../../sections.ts';
import {
  SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_END, SCREEN_JUMP, SCREEN_QUEUE_INSTRUCTION, SCREEN_RETURN,
  SCREEN_SELECT_FONT, SCREEN_SWITCH_NARROW, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, type ScreenInstruction, screenProgram,
} from '../../screen.ts';
import { keyListOrder } from '../../modezero.ts';
import {
  type BuiltScreen, type RecordFrame, type RecordPlace, type RecordReading, ScreenRecordError, recordBuilding, recordReading,
} from '../../screenrecords.ts';
import { type ValueReader, blobReader, speller, textGlyphs } from '../../shared/spelling.ts';
import { type CharacterMap, characterMap, decode } from '../../text.ts';

export const CALL = 0x7f;
export const BAND = 0x1f;
/** A state write's opcode is this plus the variable's number, section 33's `0x80` to `0xFF`. */
export const STATE_WRITE = 0x80;
export const SCREEN_WIDTH = 176;
/** Half the screen: the key below it on either side is centred in its half. */
export const HALF = SCREEN_WIDTH / 2;

// ---------------------------------------------------------------------------------------------------------
// The template's language.

/** What a number the configuration chose is, for the reader of a description; each is read the same way. */
export type NumberKind = 'list' | 'mode' | 'program' | 'timer' | 'map' | 'variable';

/**
 * One instruction: a constant; an instruction whose operand (or, for an opcode with a band, whose low byte)
 * is a number the configuration chose; a state write, whose opcode names the variable the configuration chose
 * and whose operand is the constant written; or a call of a list of the screen's own, whose index is described
 * and whose instructions are built.
 */
export type Step =
  | { kind: 'constant'; opcode: number; operand: number }
  | { kind: 'number'; opcode: number; band?: number; what: NumberKind; role?: string }
  | { kind: 'write'; operand: number }
  | { kind: 'owns'; steps: readonly Step[] };

export const k = (opcode: number, operand: number): Step => ({ kind: 'constant', opcode, operand });
export const n = (opcode: number, what: NumberKind): Step => ({ kind: 'number', opcode, what });
export const banded = (band: number, what: NumberKind): Step => ({ kind: 'number', opcode: BAND, band, what });
export const owns = (...steps: Step[]): Step => ({ kind: 'owns', steps });
/** A write of `value` to a state variable the configuration chose, `0x80 + variable`. */
export const write = (value: number): Step => ({ kind: 'write', operand: value });

/**
 * A number step given a name, its **role**: which number of the configuration's it is, where the step's kind
 * says only what sort of number it is. The reader and the builder ignore it, so a template reads and builds the
 * same with roles or without. What it is for is numbering screens a configuration does not hold yet, the help
 * screens of a device a composer added, section 415 and `todo-compile-one.md` 3.2.2.4: `templateNumberSlots`
 * walks a screen in the order the builder takes its numbers, and a caller that knows the value of each role
 * (read off the screens the configuration does hold, by the same walk) can number a new screen from it.
 */
export const named = (step: Step, role: string): Step => {
  if (step.kind !== 'number') throw new ScreenRecordError(`only a number step takes a role, not ${role}'s`);
  return { ...step, role };
};

export const SWALLOW = k(0, 0);
/** The click every button's list opens with, `0x75` with `0x0FCA`. */
export const CLICK = k(0x75, 0x0fca);
export const LIST = n(CALL, 'list');
export const ENTER = n(0x7e, 'mode');
export const RUN = n(0x73, 'program');
export const MAP = n(0x72, 'map');
export const TIMER_START = banded(0xeb, 'timer');
export const TIMER_CANCEL = banded(0xea, 'timer');
/**
 * A number in an operand's low byte under a constant high byte, for an opcode other than the band's `0x1F`: the
 * comparison `0x71 form | variable` of section 140, and `0x70`'s two forms the clock pickers' handlers run,
 * section 418.
 */
export const lowByte = (opcode: number, high: number, what: NumberKind): Step => ({ kind: 'number', opcode, band: high, what });
/** A comparison of a variable the configuration chose with the byte register, `0x71 form | variable`, section 140. */
export const TEST = (form: number): Step => lowByte(0x71, form, 'variable');
/** The `07 FFFF` every setter below the clock pickers opens with, section 418; what it does is not read. */
export const SET = k(0x07, 0xffff);

/**
 * The lists that switch a key light off, section 400's `[3F C0a0, 3F C0b0, write 0]`: the page keys' pair,
 * channels 3 and 1, and channels 5 and 7 alone, each writing 0 to the variable the wiring's matching on list
 * writes 1 to. The wiring builds the on lists, `families/touch/wiring.ts`' `keyLights`, and never reaches an
 * off list; every screen whose entering list lights a key leaves through one, so the screen sets state them,
 * section 418, each set that reaches one building it alike.
 */
const lightOff = (...channels: number[]): Step => owns(...channels.map((one) => k(0x3f, 0xc000 | (one << 4))), write(0));
export const PAGE_KEYS_OFF = lightOff(3, 1);
export const LIGHT_5_OFF = lightOff(5);
export const LIGHT_7_OFF = lightOff(7);

/**
 * The list that turns the Remote Assistant on: `07 FFFB`, the wiring's `lights`, the screen it starts on entered
 * and its variable written 1. Options' first row runs it, and the tour's "Devices Off Again" reaches it through
 * the start choice, so the fixed screens and the tour state it alike, section 418.
 */
export const ASSISTANT_ON = owns(k(0x07, 0xfffb), LIST, ENTER, write(1));

/**
 * The header handler, tag `0x2D`: three base slot 11 programs, named by their place so a screen numbered from
 * roles runs the programs the configuration's other screens run, `named`.
 */
export const HEADER = owns(named(RUN, 'header 1'), named(RUN, 'header 2'), named(RUN, 'header 3'));

const PRESS = 0x80;
export const press = (scan: number): number => PRESS | scan;
export const TAG_ENTER = 0x06;
export const TAG_LEAVE = 0x07;
export const TAG_HEADER = 0x2d;
export const TAG_CLOCK = 0x29;

export type Entry = readonly [number, Step];

/** The page arrows' presses, scans 47 and 46, which a screen of one page swallows, section 275. */
export const ARROWS: readonly Entry[] = [[press(47), SWALLOW], [press(46), SWALLOW]];
/** Scan 38's press, which most fixed screens swallow. */
export const SCAN_38: Entry = [press(38), SWALLOW];

/** Where a text starts: at a constant x, centred in `[left, left + width)`, or ending at an x. */
export type Place = number | { in: readonly [number, number] } | { endAt: number };

export type Part<F extends string = string> =
  /**
   * A picture at a place. Without `slot` it is the next of the description's pictures in walk order, as every
   * screen's are; with one it is that entry of a table of pictures the programs share, for a picture drawn
   * from several places, which the clock's header programs do (`clockheader.ts`, section 414): the
   * description then carries each picture once and the template says where it is drawn again.
   */
  | { op: 'picture'; x: number; y: number; slot?: number }
  | { op: 'font'; font: F }
  | { op: 'text'; word: string; x: Place; y: number }
  /**
   * Rows of text, each broken into lines no wider than `width` pixels by `wrapLines`, every line centred on the
   * screen, the lines `pitch` apart in a block centred on y `centre`, an empty row a line's place left blank as
   * in `centredBlock`: the help screens' questions, section 415, whose line count follows the device name they
   * hold, and since `todo-compile-one.md` 3.2.2.4 every other block of the help screens, so a fixed line our
   * letters make wider than `width` breaks by the questions' rule rather than leaving the screen. A row that fits
   * is one line where `centredBlock` would have put it, so a block whose every row fits is that block. One text
   * instruction per line.
   */
  | { op: 'wrapped'; rows: readonly string[]; width: number; centre: number; pitch: number }
  | { op: 'queue'; step: Step }
  | { op: 'chrome' }
  | { op: 'return' }
  /** A drawing instruction whose operands are all constants, the tour's chrome opening with opcode 1. */
  | { op: 'constant'; opcode: number; operands: readonly number[] }
  /**
   * A switch on a state variable: exact values first, then ranges, each arm a program piece of its own ending
   * in a jump to `then`, the piece the arms join again at. The variable is a number the configuration chose,
   * or with `variable` one the firmware owns and every configuration names alike, the clock's and the
   * battery's, which is then the template's constant and not the description's.
   *
   * **A switch may sit inside an arm.** Its `then` piece closes as the arm would have, with a jump to the
   * piece the outer arms join at, measured on the clock's header programs, section 414: there a join that
   * draws nothing is a lone jump onwards. At the top of a program it closes with the end, as before.
   */
  | {
    op: 'switch'; variable?: number;
    arms: readonly { match: number | readonly [number, number]; parts: readonly Part<F>[] }[]; then: readonly Part<F>[];
  };

export interface TemplatePage<F extends string = string> {
  /** The page list's bindings, which its copy repeats with lists of its own. */
  list: readonly Entry[];
  parts: readonly Part<F>[];
}

export interface TemplateScreen<F extends string = string> {
  name: string;
  own: readonly Entry[];
  chrome: readonly Part<F>[];
  pages: readonly TemplatePage<F>[];
}

export const font = <F extends string>(which: F): Part<F> => ({ op: 'font', font: which });
export const picture = (x: number, y: number): Part<never> => ({ op: 'picture', x, y });
/** A picture taken from the programs' shared table by `slot`, `Part`'s first form. */
export const pictureOf = (slot: number, x: number, y: number): Part<never> => ({ op: 'picture', x, y, slot });
export const text = (word: string, x: Place, y: number): Part<never> => ({ op: 'text', word, x, y });
/** A body line centred on the 176 pixel width rounded down, `floor((176 - w) / 2)`, section 409's rule. */
export const centred = (word: string, y: number): Part<never> => text(word, { in: [0, SCREEN_WIDTH] }, y);
/** A word of the key below the screen, centred on the left half, the "Back" or "Yes" side. */
export const leftHalf = (word: string, y: number): Part<never> => text(word, { in: [0, HALF] }, y);
/** A word of the key below the screen, centred on the right half, the "OK" or "No" side. */
export const rightHalf = (word: string, y: number): Part<never> => text(word, { in: [HALF, HALF] }, y);
export const TITLE_AT = [6, 4] as const;

/**
 * Lines centred on the screen, `pitch` apart in a block centred on y `centre`, so n lines start at
 * `centre - (pitch / 2) (n - 1)`. An empty row is a line's place left blank, which moves the rows after it as a
 * drawn line would: the help screens' "Did that fix the problem?" over a blank row and three more, section 415.
 */
export function centredBlock(rows: readonly string[], centre: number, pitch: number): Part<never>[] {
  const top = centre - (pitch / 2) * (rows.length - 1);
  return rows.flatMap((row, r) => (row === '' ? [] : [centred(row, top + pitch * r)]));
}

/**
 * A text, or rows of text, wrapped to `width` and centred on the screen in a block centred on y `centre`,
 * `Part`'s `wrapped`. A single text is a block of one row, the help screens' questions.
 */
export const wrapped = (rows: string | readonly string[], width: number, centre: number, pitch: number): Part<never> =>
  ({ op: 'wrapped', rows: typeof rows === 'string' ? [rows] : rows, width, centre, pitch });

/**
 * Lines `wrapLines` made joined back into the text they were broken from: a space between two, none after a
 * hyphen, which stays at the end of its line. The reader of a `wrapped` part takes a row's lines by it.
 */
export function joinLines(lines: readonly string[]): string {
  return lines.reduce((sum, line) => (sum === '' ? line : sum + (sum.endsWith('-') ? '' : ' ') + line), '');
}

/**
 * The rows a `wrapped` part draws: each row that is not blank broken by `wrapLines`, a blank row kept as a
 * place. One function for the reader, which counts the lines to take, and the builder, which draws them, so the
 * two agree on how many lines a block is by construction; the byte comparison after a build checks the rest.
 */
export function wrapRows(rows: readonly string[], width: number, widthOf: (line: string) => number): string[] {
  return rows.flatMap((row) => (row === '' ? [''] : wrapLines(row, width, widthOf)));
}

/**
 * `word` broken into lines no wider than `width` by `widthOf`, greedily: as many pieces to a line as fit, a piece
 * ending at a space, which the break swallows, or just after a hyphen, which stays at the end of its line. So a
 * device name breaks at its hyphens as well as its spaces: "Now is the Denon AVR-" over "X4800H off?", and never
 * at a slash, "Now is the Philips" over "70FA930/00S off?". Measured on every help question of the eighteen
 * English Harmony One compiles, the "on?", "off?" and input ones alike, section 415: 171 pixels is the widest line
 * drawn and 172 the narrowest a next piece would have made. A piece wider than `width` on its own is refused,
 * since no compile shows how the compiler breaks one.
 */
export function wrapLines(word: string, width: number, widthOf: (line: string) => number): string[] {
  const pieces: { text: string; sep: string }[] = [];
  let piece = '';
  for (const ch of word) {
    if (ch === ' ') {
      pieces.push({ text: piece, sep: ' ' });
      piece = '';
    } else if (ch === '-') {
      pieces.push({ text: piece + ch, sep: '' });
      piece = '';
    } else piece += ch;
  }
  if (piece !== '') pieces.push({ text: piece, sep: '' });
  const lines: string[] = [];
  let line = '';
  let sep = '';
  for (const one of pieces) {
    if (one.text === '') throw new ScreenRecordError(`'${word}' holds a doubled space or hyphen, which no compile shows broken`);
    if (widthOf(one.text) > width) throw new ScreenRecordError(`'${one.text}' is wider than ${width} pixels on its own`);
    const longer = line === '' ? one.text : line + sep + one.text;
    if (line !== '' && widthOf(longer) > width) {
      lines.push(line);
      line = one.text;
    } else line = longer;
    sep = one.sep;
  }
  lines.push(line);
  return lines;
}

/**
 * A chrome: the title, the full screen picture, the queued program and list, the page count where there are
 * several pages, and the title again. The title is drawn twice, once before the picture and once by reference
 * to itself after it, on every chrome with one; the second needs the title font again only after the count.
 * Measured on the fixed screens of section 411 and the Remote Assistant's of section 412, whose title font is
 * the role `title` in both.
 */
export function chrome<F extends string>(title: string | undefined, pages: number, fonts: { title: F; count: F }): Part<F>[] {
  const head: Part<F>[] = title === undefined ? [] : [font(fonts.title), text(title, TITLE_AT[0], TITLE_AT[1])];
  const count: Part<F>[] = pages > 1 ? [font(fonts.count), text(String(pages), 23, 18), text('pages', 35, 18)] : [];
  const again: Part<F>[] = title === undefined ? [] : [...(pages > 1 ? [font(fonts.title)] : []), text(title, TITLE_AT[0], TITLE_AT[1])];
  // The three programs it queues named by their place, as `HEADER`'s are, for a screen numbered from roles.
  return [...head, picture(0, 0), { op: 'queue', step: named(RUN, 'chrome 1') }, ...count,
    { op: 'queue', step: owns(named(RUN, 'chrome 2'), named(RUN, 'chrome 3')) }, ...again, { op: 'return' }];
}

// ---------------------------------------------------------------------------------------------------------
// The description.

export interface TemplateScreensSpec<F extends string = string> {
  /** One font per role. */
  fonts: Record<F, number>;
  /** Per screen, in the template's order. */
  screens: {
    /** Which mode it is, which also orders the build: the programs are laid out in mode order. */
    mode: number;
    /** Each page's hit page. */
    leads: number[];
    /** Every picture it draws, in walk order. */
    pictures: PieceTarget[];
    /** Every other number the configuration chose, in walk order. */
    numbers: number[];
  }[];
  /** Texts drawn by reference to a copy outside these screens, by glyph codes joined. */
  homes: Map<string, PieceTarget>;
}

export interface TemplateScreensDescribed<F extends string = string> {
  spec: TemplateScreensSpec<F>;
  place: { screens: RecordPlace[]; lists: Map<number, ContainerPiece>; lengths: Map<ContainerPiece, number>; inline: Map<ContainerPiece, Map<number, string>> };
  described: Set<number>;
  structure: Set<number>;
  addresses: { read: Set<number>; built: Set<number> };
  regions: { from: number; to: number; what: string }[];
}

const hex = (value: number): string => `0x${value.toString(16)}`;

/**
 * Whether a mode's own key map, page list or copy is in the wide form, section 52's: where one of its bindings
 * is a state write bound directly, and the narrow form otherwise. Measured over the nineteen Harmony One
 * compiles: 18 own key maps are wide and every one binds a write, scan 34's press, the Remote Assistant's
 * welcome's where read, and none of the 3576 narrow ones binds a write; every page list and copy is narrow and
 * binds none. A wide own key map's flags byte is 1 on the write and 0 on every other binding, 18 and 90. **Mode
 * lists only**: base slot 9's handler sets are wide on 95 lists that bind no write, with flag 1 on calls, the
 * second reviewer's census of section 412, so this rule says nothing about them, and the engine builds none.
 */
const isWide = (entries: readonly Entry[]): boolean => entries.some(([, binding]) => binding.kind === 'write');
const flagOf = (binding: Step): number => (binding.kind === 'write' ? 1 : 0);
/** Where a tagged list's entries start and how long each is, in either form. */
const form = (wide: boolean): { head: number; stride: number } => (wide ? { head: 2, stride: 5 } : { head: 1, stride: 4 });

/** A switch's tables as its operands hold them: the variable, the exact values, the ranges, narrow form. */
function switchTables(one: ScreenInstruction): { exact: number[]; ranges: [number, number][]; fields: number[] } {
  const o = one.operands;
  const exact: number[] = [];
  const ranges: [number, number][] = [];
  const fields: number[] = [];
  let at = 1;
  const exactCount = o[at] as number;
  at += 1;
  for (let i = 0; i < exactCount; i += 1, at += 4) { exact.push(o[at] as number); fields.push(one.start + 1 + at + 1); }
  const rangeCount = o[at] as number;
  at += 1;
  for (let i = 0; i < rangeCount; i += 1, at += 5) { ranges.push([o[at] as number, o[at + 1] as number]); fields.push(one.start + 1 + at + 2); }
  return { exact, ranges, fields };
}

// ---------------------------------------------------------------------------------------------------------
// One instruction against its step, read and written: shared by the template's screens and programs and, since
// `todo-compile-one.md` 6.5, by the firmware screens' lists below them, `firmwarescreens.ts`, whose own older
// language takes a template step wherever a list of the configuration's is built rather than named.

/**
 * Read one instruction against its step, pushing the numbers it holds onto `numbers` in walk order: an `owns`
 * step's index, then its list's instructions read in turn, depth first. `at` is where the instruction's operand
 * starts and `at + 2` its opcode; `name` and `what` word a refusal. **A list reached twice is read twice**, its
 * index a number each time, which is what lets the lists below a screen be shared: the Day pickers' setters,
 * which all three Day pickers run, and the key lights' off lists most screens' leaving lists call, section 418.
 */
export function readStep(
  reading: RecordReading, name: string, numbers: number[], want: Step, got: { opcode: number; operand: number }, at: number, what: string,
): void {
  const { value, value16 } = reading;
  if (want.kind === 'constant') {
    if (got.opcode !== want.opcode || got.operand !== want.operand) {
      throw new ScreenRecordError(`${name}'s ${what} is ${hex(got.opcode)} ${hex(got.operand)}, not ${hex(want.opcode)} ${hex(want.operand)}`);
    }
  } else if (want.kind === 'number') {
    if (got.opcode !== want.opcode) throw new ScreenRecordError(`${name}'s ${what} is not ${hex(want.opcode)}`);
    if (want.band !== undefined) {
      if (got.operand >> 8 !== want.band) throw new ScreenRecordError(`${name}'s ${what} is in another band`);
      numbers.push(value(at));
    } else numbers.push(value16(at));
  } else if (want.kind === 'write') {
    // The variable is the opcode less 0x80, a number the configuration chose; the value is the template's.
    if (got.opcode < STATE_WRITE || got.operand !== want.operand) {
      throw new ScreenRecordError(`${name}'s ${what} is ${hex(got.opcode)} ${hex(got.operand)}, not a write of ${want.operand}`);
    }
    numbers.push(value(at + 2) - STATE_WRITE);
  } else {
    if (got.opcode !== CALL) throw new ScreenRecordError(`${name}'s ${what} calls no list`);
    numbers.push(value16(at));
    const list = reading.list(got.operand, `${name}'s ${what}`);
    if (list.body.length !== want.steps.length) {
      throw new ScreenRecordError(`${name}'s ${what} is ${list.body.length} instructions, not ${want.steps.length}`);
    }
    want.steps.forEach((one, i) => readStep(reading, name, numbers, one, list.body[i] as Instruction, list.off + 1 + 3 * i, `${what}, instruction ${i}`));
  }
}

/**
 * One instruction made from its step, `readStep`'s other half: every number taken by `take` in the order the
 * reader pushed it, and an `owns` step's list built into `lists` at the index it takes. A list built twice must
 * come out the same both times, or the description is refused: two places naming one index with lists of two
 * shapes is a description no configuration has.
 */
export function writeStep(want: Step, take: (step: Step) => number, lists: Map<number, ContainerPiece>): Instruction {
  if (want.kind === 'constant') return { opcode: want.opcode, operand: want.operand };
  if (want.kind === 'number') return { opcode: want.opcode, operand: want.band === undefined ? take(want) : (want.band << 8) | take(want) };
  if (want.kind === 'write') {
    // A write names its variable in the opcode's low seven bits, so a number past 127 is not a variable: a
    // description whose numbers have slid against the template, one short, say, where a setting reads the other
    // way, which is refused here in the template's words rather than by the list encoder's range check.
    const variable = take(want);
    if (variable < 0 || variable > 0x7f) throw new ScreenRecordError(`${variable} is not a variable a state write can name`);
    return { opcode: STATE_WRITE + variable, operand: want.operand };
  }
  const index = take(want);
  const bytes = actionListBytes(want.steps.map((one) => writeStep(one, take, lists)));
  const was = lists.get(index);
  if (was !== undefined && was.bytes.join() !== bytes.join()) throw new ScreenRecordError(`list ${index} is built two ways`);
  lists.set(index, { bytes, refs: [], owner: 'slot-10-list' });
  return { opcode: CALL, operand: index };
}

/** What each number a step takes is, in the order `readStep` pushes them: a firmware screen's slots, section 418. */
export function stepKinds(want: Step): NumberKind[] {
  if (want.kind === 'constant') return [];
  if (want.kind === 'number') return [want.what];
  if (want.kind === 'write') return ['variable'];
  return ['list', ...want.steps.flatMap(stepKinds)];
}

// ---------------------------------------------------------------------------------------------------------
// Reading a program against its parts, shared by the screens and the programs of their own.

/** What a program reader collects as it reads, which its caller owns: one per screen, or per program. */
interface ReadCursor<F extends string> {
  /** For a refusal's wording: a screen's name, or a program's. */
  name: string;
  numbers: number[];
  pictures: PieceTarget[];
  /** The shared table a picture with a `slot` is read into; absent where no part may name one. */
  slots?: (PieceTarget | undefined)[];
  fonts: Partial<Record<F, number>>;
  /** The program pieces a switch reaches, in the order the builder makes them. */
  extras: ContainerPiece[];
  /** What a `chrome` part reads; absent on a program of its own, which calls none. */
  chrome?: (call: ScreenInstruction) => void;
}

/**
 * Read instructions and programs against a template's steps and parts. `step` reads one instruction against
 * a step, `at` being where its operand starts and `at + 2` its opcode. `unit` reads a program piece and
 * everything it reaches: its main line and every piece a switch on it joins at, then each of those switches'
 * arms in turn, each arm read whole, its own switches' joins and arms included, before the next arm.
 *
 * **That order is the order the builder makes pieces in, and the order Logitech lays them out in**: on a page
 * the main line, then the joins, then the arms, section 411, and an arm holding a switch of its own laid out
 * with that switch's join and arms straight after it, section 414 on the clock's header programs. Section 411's
 * and 412's screens hold no switch inside an arm, so on them this is the order they were read in before.
 */
function programReader<F extends string>(c: Container, reading: RecordReading, cursor: ReadCursor<F>) {
  const { value, value24 } = reading;
  const name = cursor.name;
  const numbers = cursor.numbers;
  // The configuration's character map, which a `wrapped` part's lines are read by, made on the first one met: most
  // templates have none.
  let map: CharacterMap | undefined;

  // An instruction against its step, `at` being where its operand starts and `at + 2` its opcode.
  const step = (want: Step, got: { opcode: number; operand: number }, at: number, what: string): void =>
    readStep(reading, name, numbers, want, got, at, what);

  /**
   * Where an arm goes on to: the target of its closing jump, or, where it ends in a switch of its own, where
   * that switch's join goes on to. The arms of one switch all go on to one piece, the switch's join.
   */
  const exitOf = (address: number, what: string): number => {
    const program = screenProgram(c, address);
    const last = program?.[program.length - 1];
    if (last?.opcode === SCREEN_JUMP) return last.targets[0] as number;
    if (last?.opcode === SCREEN_SWITCH_NARROW) return exitOf(exitOf(last.targets[0] as number, what), what);
    throw new ScreenRecordError(`${name}'s ${what}'s first arm does not jump back`);
  };

  interface Arm { parts: readonly Part<F>[]; address: number; join: number; what: string }

  // A piece's main line against its parts, and the pieces its switches join at: the arms are returned, in
  // order, for `unit` to read. `join` is what follows the last part where it is not an end: a jump to the
  // piece the arms around it join at.
  const chain = (parts: readonly Part<F>[], program: readonly ScreenInstruction[], what: string, join?: number): Arm[] => {
    let i = 0;
    const next = (opcode: number, part: string): ScreenInstruction => {
      const one = program[i];
      if (one === undefined || one.opcode !== opcode) throw new ScreenRecordError(`${name}'s ${what}, instruction ${i}, is not ${part}`);
      i += 1;
      return one;
    };
    for (const part of parts) {
      if (part.op === 'picture') {
        const one = next(SCREEN_DRAW_IMAGE, 'a picture');
        if (one.operands[0] !== part.x || one.operands[1] !== part.y) throw new ScreenRecordError(`${name}'s ${what} draws a picture elsewhere`);
        const field = one.start + one.length - 3;
        if (part.slot === undefined) cursor.pictures.push(reading.targetOf(value24(field)));
        else {
          // A shared picture is the description's where it is first drawn; every later place it is drawn is
          // checked against it through the configuration's own bytes and is the template's.
          const slots = cursor.slots;
          if (slots === undefined) throw new ScreenRecordError(`${name}'s ${what} draws a shared picture, and nothing holds a table of them`);
          const was = slots[part.slot];
          if (was === undefined) slots[part.slot] = reading.targetOf(value24(field));
          else {
            const now = reading.targetOf((c.blob[field] as number) | ((c.blob[field + 1] as number) << 8) | ((c.blob[field + 2] as number) << 16));
            if (now.to !== was.to || now.offset !== was.offset) throw new ScreenRecordError(`${name}'s ${what} draws another picture for shared picture ${part.slot}`);
          }
        }
      } else if (part.op === 'font') {
        const one = next(SCREEN_SELECT_FONT, 'a font');
        const number = value(one.start + 1);
        const was = cursor.fonts[part.font];
        if (was !== undefined && was !== number) throw new ScreenRecordError(`the screens select two fonts for ${part.font}`);
        cursor.fonts[part.font] = number;
      } else if (part.op === 'text') {
        const one = program[i];
        if (one === undefined || (one.opcode !== SCREEN_TEXT_AT && one.opcode !== SCREEN_TEXT_INLINE)) {
          throw new ScreenRecordError(`${name}'s ${what}, instruction ${i}, is not a text`);
        }
        i += 1;
      } else if (part.op === 'wrapped') {
        // Each row's lines, read by their words: text instructions taken while the lines joined, `joinLines`, are
        // still the start of the row, until they are the row. **Not by measuring the row in the font in force**,
        // which is how the builder breaks it: a configuration whose letters were changed under its screens, the
        // donor lettered in ours on the composed path, draws a row in the lines Logitech's letters made, and the
        // description reads what is there while the build decides what will be. Nor by the run of texts, since a
        // block may be followed by another, the help screens' attempt line by its other two lines. The byte
        // comparison after a build checks where each line sits and what it is.
        map ??= characterMap(c);
        for (const row of part.rows) {
          if (row === '') continue;
          let drawn = '';
          while (drawn !== row) {
            const one = program[i];
            const glyphs = one === undefined ? undefined : textGlyphs(c, one);
            if (one === undefined || glyphs === undefined || map === undefined) {
              throw new ScreenRecordError(`${name}'s ${what}, instruction ${i}, is not a text, where '${row}' goes on`);
            }
            drawn = joinLines([drawn, decode(glyphs, map)].filter((line) => line !== ''));
            if (!row.startsWith(drawn)) throw new ScreenRecordError(`${name}'s ${what} draws '${drawn}' where it says '${row}'`);
            i += 1;
          }
        }
      } else if (part.op === 'constant') {
        const one = next(part.opcode, `opcode ${part.opcode}`);
        if (one.operands.length !== part.operands.length || part.operands.some((v, j) => one.operands[j] !== v)) {
          throw new ScreenRecordError(`${name}'s ${what}, instruction ${i - 1}, has other operands`);
        }
      } else if (part.op === 'queue') {
        const one = next(SCREEN_QUEUE_INSTRUCTION, 'a queued instruction');
        const o = one.operands;
        step(part.step, { opcode: o[2] as number, operand: (o[0] as number) | ((o[1] as number) << 8) }, one.start + 1, `${what}'s queued instruction`);
      } else if (part.op === 'return') {
        next(SCREEN_RETURN, 'a return');
      } else if (part.op === 'chrome') {
        const one = next(SCREEN_CALL, 'the call of the chrome');
        if (cursor.chrome === undefined) throw new ScreenRecordError(`${name}'s ${what} calls a chrome, and a program of its own has none`);
        cursor.chrome(one);
      } else {
        const one = next(SCREEN_SWITCH_NARROW, 'a switch');
        if (i !== program.length || part !== parts[parts.length - 1]) throw new ScreenRecordError(`${name}'s ${what} goes on after its switch`);
        // A variable the firmware owns is the template's constant, checked; any other is the description's.
        if (part.variable === undefined) numbers.push(value(one.start + 1));
        else if (one.operands[0] !== part.variable) {
          throw new ScreenRecordError(`${name}'s ${what} switches on variable ${one.operands[0]}, not ${part.variable}`);
        }
        const tables = switchTables(one);
        const wantExact = part.arms.filter((arm) => typeof arm.match === 'number').map((arm) => arm.match as number);
        const wantRanges = part.arms.filter((arm) => typeof arm.match !== 'number').map((arm) => arm.match as [number, number]);
        if (part.arms.some((arm, a) => (typeof arm.match === 'number') !== (a < wantExact.length))
          || tables.exact.join() !== wantExact.join() || tables.ranges.join() !== wantRanges.join()) {
          throw new ScreenRecordError(`${name}'s ${what} switches on other values`);
        }
        tables.fields.forEach((at) => reading.addressField(at, 'built'));
        // The piece the arms join at, where the first arm goes on to: the main line goes on there.
        const joinAt = exitOf(one.targets[0] as number, what);
        const arms = part.arms.map((arm, a): Arm => ({ parts: arm.parts, address: one.targets[a] as number, join: joinAt, what: `${what}'s arm ${a + 1}` }));
        const then = reading.program(joinAt, `${name}'s ${what}'s join`);
        cursor.extras.push(then.piece);
        return [...arms, ...chain(part.then, then.program, `${what}'s join`, join)];
      }
    }
    if (join === undefined) next(SCREEN_END, 'the end');
    else {
      const one = next(SCREEN_JUMP, 'a jump');
      if (one.targets[0] !== join) throw new ScreenRecordError(`${name}'s ${what} jumps elsewhere`);
      reading.addressField(one.start + 1, 'built');
    }
    if (i !== program.length) throw new ScreenRecordError(`${name}'s ${what} holds more than its parts`);
    return [];
  };

  /** A program piece and everything it reaches, arms depth first after the main line and its joins. */
  const unit = (parts: readonly Part<F>[], program: readonly ScreenInstruction[], what: string, join?: number): void => {
    for (const arm of chain(parts, program, what, join)) {
      const one = reading.program(arm.address, `${name}'s ${arm.what}`);
      cursor.extras.push(one.piece);
      unit(arm.parts, one.program, arm.what, arm.join);
    }
  };

  return { step, unit };
}

/**
 * Read off a configuration what a composer would supply for the template's screens, and where Logitech's sat.
 * `modes` names the mode of each screen, in the template's order, and `roles` the font roles the screens
 * select. Refuses a screen whose tags, instructions, lists or programs are not the template's shape, or a font
 * that two places of one role disagree on. `layout` is `takeApart(c)`; `read` is where every value is taken
 * from, so a caller can blind every byte it does not read.
 */
export function describeTemplateScreens<F extends string>(
  c: Container, layout: ContainerLayout, screens: readonly TemplateScreen<F>[], modes: readonly number[], roles: readonly F[],
  read: ValueReader = blobReader(c),
): TemplateScreensDescribed<F> {
  if (modes.length !== screens.length) throw new ScreenRecordError(`${modes.length} modes for ${screens.length} screens`);
  const reading = recordReading(c, layout, read);
  const fonts: Partial<Record<F, number>> = {};
  const places: RecordPlace[] = [];

  const described = screens.map((screen, s) => {
    const mode = modes[s] as number;
    const f: RecordFrame = reading.frame(screen.name, mode);
    if (f.pages.length !== screen.pages.length) {
      throw new ScreenRecordError(`${screen.name}, mode ${mode}, has ${f.pages.length} pages, not ${screen.pages.length}`);
    }
    const numbers: number[] = [];
    const pictures: PieceTarget[] = [];
    const extras: ContainerPiece[] = [];
    // The chrome every page calls, read where the first page calls it.
    let chromeRead = false;
    const cursor: ReadCursor<F> = {
      name: screen.name, numbers, pictures, fonts, extras,
      chrome: (one) => {
        if (chromeRead) return;
        chromeRead = true;
        const chrome = f.pages[0]?.chrome;
        if (chrome === undefined || chrome.program[0]?.start !== reading.blobOf(one.targets[0] as number)) {
          throw new ScreenRecordError(`${screen.name}'s chrome does not read`);
        }
        reader.unit(screen.chrome, chrome.program, 'chrome');
      },
    };
    const reader = programReader(c, reading, cursor);

    // A tagged list against its entries, in the stored order, and in the form `isWide` says the template's
    // bindings take: its first byte is the form, which the reader finds its way by, and is checked.
    const tagged = (want: readonly Entry[], entries: readonly { tag: number; opcode: number; operand: number; flags?: number | undefined }[], off: number, what: string): void => {
      const tags = keyListOrder(want.map(([tag]) => tag));
      const by = new Map(want);
      if (entries.length !== tags.length || entries.some((one, i) => one.tag !== tags[i])) {
        throw new ScreenRecordError(`${screen.name}'s ${what} holds other tags or another order`);
      }
      const wide = isWide(want);
      // An empty list is `0 0` in either reading, `taggedListBytes`', so only a list with entries states a form.
      if (want.length > 0 && (c.blob[off] === 0) !== wide) throw new ScreenRecordError(`${screen.name}'s ${what} is not in the ${wide ? 'wide' : 'narrow'} form`);
      const { head, stride } = form(wide);
      tags.forEach((tag, i) => {
        const binding = by.get(tag) as Step;
        if (wide && entries[i]?.flags !== flagOf(binding)) throw new ScreenRecordError(`${screen.name}'s ${what}'s binding of tag ${hex(tag)} carries another flag`);
        reader.step(binding, entries[i] as { opcode: number; operand: number }, off + head + stride * i + stride - 3, `${what}'s binding of tag ${hex(tag)}`);
      });
    };

    tagged(screen.own, f.record.entries, f.ownOff, 'own key map');
    const leads = screen.pages.map((page, p) => {
      const frame = f.pages[p] as RecordFrame['pages'][number];
      tagged(page.list, frame.list.entries, frame.listOff, `page ${p + 1}'s list`);
      tagged(page.list, frame.copy.entries, frame.copyOff, `page ${p + 1}'s copy`);
      reader.unit(page.parts, frame.program, `page ${p + 1}`);
      return frame.page.lead as number;
    });
    places.push(reading.placeOf(screen.name, f, extras));
    return { mode, leads, pictures, numbers };
  });
  for (const one of roles) if (fonts[one] === undefined) throw new ScreenRecordError(`the screens select no ${one} font`);
  return {
    spec: { fonts: fonts as Record<F, number>, screens: described, homes: reading.homes() },
    place: { screens: places, lists: reading.lists, lengths: reading.lengths, inline: reading.inline },
    described: reading.described,
    structure: reading.structure,
    addresses: reading.addresses,
    regions: reading.regions,
  };
}

// ---------------------------------------------------------------------------------------------------------
// The builder.

export interface BuiltTemplateScreens {
  screens: BuiltScreen[];
  lists: Map<number, ContainerPiece>;
  inline: Map<string, PieceTarget>;
  homes: Map<string, PieceTarget>;
}

/** Where a text of width `w` starts by its place rule. */
function startOf(place: Place, w: number): number {
  if (typeof place === 'number') return place;
  if ('endAt' in place) return place.endAt - w;
  return place.in[0] + Math.floor((place.in[1] - w) / 2);
}

/** What a program writer takes from as it builds, which its caller owns: one per screen, or per program. */
interface WriteCursor {
  name: string;
  numbers: number[];
  pictures: PieceTarget[];
  /** The shared pictures by slot, where the template draws one. */
  slots?: readonly PieceTarget[];
  /** Every shared picture drawn, by slot, for the caller to check none is left over. */
  slotsDrawn?: Set<number>;
  /** The program pieces a switch reaches, in the order they are made. */
  extras: ContainerPiece[];
  /** The chrome a `chrome` part calls, built on its first call; absent on a program of its own. */
  chrome?: () => ContainerPiece;
  /**
   * Where each number comes from in place of `numbers`, given the step that takes it: `templateNumberSlots`'
   * walk, which records the steps rather than numbering them. Absent, the numbers are `numbers` in order.
   */
  numberOf?: (step: Step) => number;
}

/** What a switch's variable is taken as, where the template leaves it to the configuration: a number like any other. */
const SWITCH_VARIABLE: Step = { kind: 'number', opcode: SCREEN_SWITCH_NARROW, what: 'variable' };

/**
 * Build instructions and programs from a template's steps and parts, `programReader`'s other half: the same
 * order, every number and picture taken from the cursor in the order the reader put them there. `inline` and
 * `lists` are shared by everything one build makes, since a text is held inline once and a list built once.
 */
function programWriter<F extends string>(
  spell: ReturnType<typeof speller>, fonts: Record<F, number>, homes: ReadonlyMap<string, PieceTarget>,
  inline: Map<string, PieceTarget>, lists: Map<number, ContainerPiece>, cursor: WriteCursor,
) {
  const take = (want: Step): number => {
    if (cursor.numberOf !== undefined) return cursor.numberOf(want);
    const one = cursor.numbers.shift();
    if (one === undefined) throw new ScreenRecordError(`the description holds too few numbers for ${cursor.name}`);
    return one;
  };
  const instruction = (want: Step): Instruction => writeStep(want, take, lists);

  interface Arm { parts: readonly Part<F>[]; piece: ContainerPiece; join: ContainerPiece }

  // One program piece from its parts, closed by an end or by a jump to `join`; a switch closes it early, and
  // its join is made next, closing as this piece would have. The arms are returned, in order, for `unit`.
  const chain = (parts: readonly Part<F>[], piece: ContainerPiece, join?: ContainerPiece): Arm[] => {
    const out: number[] = [];
    const refs: PieceRef[] = [];
    const pointer = (to: ContainerPiece, offset = 0): void => {
      refs.push({ at: out.length, to, offset });
      out.push(0, 0, 0);
    };
    let current: F | undefined;
    // One text at its place: by reference to its home outside or to the copy an earlier program holds, else
    // inline here, where every later program drawing the same codes will point.
    const draw = (word: string, place: Place, y: number): void => {
      if (current === undefined) throw new ScreenRecordError(`${cursor.name} draws ${word} with no font selected`);
      const { codes, width } = spell(fonts[current], word);
      const key = codes.join(',');
      const home = homes.get(key) ?? inline.get(key);
      const x = startOf(place, width);
      // A text wider than its place starts left of it, and a negative x stored in a byte would draw at 255: refused
      // rather than written. Section 415's attempt line in our letters, 177 pixels on a 176 pixel screen, is one.
      if (x < 0 || x >= SCREEN_WIDTH) throw new ScreenRecordError(`'${word}' is ${width} pixels wide and would start at x ${x}, off the screen`);
      if (home !== undefined) {
        out.push(SCREEN_TEXT_AT, x, y);
        pointer(home.to, home.offset);
      } else {
        out.push(SCREEN_TEXT_INLINE, x, y);
        inline.set(key, { to: piece, offset: out.length });
        out.push(...codes, 0);
      }
    };
    for (const part of parts) {
      if (part.op === 'picture') {
        let target: PieceTarget | undefined;
        if (part.slot === undefined) target = cursor.pictures.shift();
        else {
          target = cursor.slots?.[part.slot];
          cursor.slotsDrawn?.add(part.slot);
        }
        if (target === undefined) throw new ScreenRecordError(`the description holds too few pictures for ${cursor.name}`);
        out.push(SCREEN_DRAW_IMAGE, part.x, part.y);
        pointer(target.to, target.offset);
      } else if (part.op === 'font') {
        current = part.font;
        out.push(SCREEN_SELECT_FONT, fonts[part.font]);
      } else if (part.op === 'text') {
        draw(part.word, part.x, part.y);
      } else if (part.op === 'wrapped') {
        if (current === undefined) throw new ScreenRecordError(`${cursor.name} draws ${part.rows.join(' ')} with no font selected`);
        const set = fonts[current];
        // Every row broken at the width, then the block centred as `centredBlock` centres one, a blank row
        // keeping its place: a row that fits is the line `centredBlock` would have drawn.
        for (const line of centredBlock(wrapRows(part.rows, part.width, (row) => spell(set, row).width), part.centre, part.pitch)) {
          if (line.op === 'text') draw(line.word, line.x, line.y);
        }
      } else if (part.op === 'constant') {
        out.push(part.opcode, ...part.operands);
      } else if (part.op === 'queue') {
        const one = instruction(part.step);
        out.push(SCREEN_QUEUE_INSTRUCTION, one.operand & 0xff, one.operand >> 8, one.opcode);
      } else if (part.op === 'return') {
        out.push(SCREEN_RETURN);
      } else if (part.op === 'chrome') {
        if (cursor.chrome === undefined) throw new ScreenRecordError(`${cursor.name} calls a chrome, and a program of its own has none`);
        out.push(SCREEN_CALL);
        pointer(cursor.chrome());
      } else {
        // The switch, then the piece its arms join at, which goes on with the main line; the arms after it.
        const variable = part.variable ?? take(SWITCH_VARIABLE);
        const then: ContainerPiece = { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' };
        const exact = part.arms.filter((arm) => typeof arm.match === 'number');
        const ranges = part.arms.filter((arm) => typeof arm.match !== 'number');
        const pieces = new Map(part.arms.map((arm) => [arm, { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' } as ContainerPiece]));
        out.push(SCREEN_SWITCH_NARROW, variable, exact.length);
        for (const arm of exact) { out.push(arm.match as number); pointer(pieces.get(arm) as ContainerPiece); }
        out.push(ranges.length);
        for (const arm of ranges) { out.push(...(arm.match as readonly [number, number])); pointer(pieces.get(arm) as ContainerPiece); }
        piece.bytes = Uint8Array.from(out);
        piece.refs = refs;
        cursor.extras.push(then);
        const arms = part.arms.map((arm): Arm => ({ parts: arm.parts, piece: pieces.get(arm) as ContainerPiece, join: then }));
        return [...arms, ...chain(part.then, then, join)];
      }
    }
    if (join === undefined) out.push(SCREEN_END);
    else {
      out.push(SCREEN_JUMP);
      pointer(join);
    }
    piece.bytes = Uint8Array.from(out);
    piece.refs = refs;
    return [];
  };

  /** A program piece and everything it reaches, made in `programReader`'s order. */
  const unit = (parts: readonly Part<F>[], piece: ContainerPiece, join?: ContainerPiece): void => {
    for (const arm of chain(parts, piece, join)) {
      cursor.extras.push(arm.piece);
      unit(arm.parts, arm.piece, arm.join);
    }
  };

  return { instruction, unit };
}

/**
 * One screen's pieces made from its template: the own key map, then per page its list, the list's copy and its
 * program, the chrome made where the first page calls it. **This is the order a screen takes its numbers in**,
 * the reader's order in `describeTemplateScreens`, and it is written once here for both the builder and
 * `templateNumberSlots`, which walks it to learn which step takes which number.
 */
function writeScreen<F extends string>(
  screen: TemplateScreen<F>, spell: ReturnType<typeof speller>, fonts: Record<F, number>, homes: ReadonlyMap<string, PieceTarget>,
  inline: Map<string, PieceTarget>, lists: Map<number, ContainerPiece>,
  source: { numbers: number[]; pictures: PieceTarget[]; numberOf?: (step: Step) => number },
): { own: Uint8Array; programs: ContainerPiece[]; pageLists: Uint8Array[]; copies: Uint8Array[]; chromePiece: ContainerPiece; extras: ContainerPiece[] } {
  const extras: ContainerPiece[] = [];
  const chromePiece: ContainerPiece = { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' };
  let chromeBuilt = false;
  const writer = programWriter(spell, fonts, homes, inline, lists, {
    name: screen.name, numbers: source.numbers, pictures: source.pictures, extras,
    ...(source.numberOf === undefined ? {} : { numberOf: source.numberOf }),
    // The chrome every page calls, built where the first page calls it, so its texts come first.
    chrome: () => {
      if (!chromeBuilt) {
        chromeBuilt = true;
        writer.unit(screen.chrome, chromePiece);
      }
      return chromePiece;
    },
  });
  const tagged = (entries: readonly Entry[]): Uint8Array => {
    const by = new Map(entries);
    const order = keyListOrder(entries.map(([tag]) => tag));
    const built = order.map((tag) => ({ tag, flags: flagOf(by.get(tag) as Step), ...writer.instruction(by.get(tag) as Step) }));
    if (!isWide(entries)) return taggedListBytes(built);
    // The wide form: a zero, the count, and per entry its flags byte before the narrow form's four.
    const { head, stride } = form(true);
    const out = new Uint8Array(head + stride * built.length);
    out[1] = built.length;
    built.forEach((one, i) => out.set([one.flags, one.tag, one.operand & 0xff, one.operand >> 8, one.opcode], head + stride * i));
    return out;
  };

  const own = tagged(screen.own);
  const programs: ContainerPiece[] = [];
  const pageLists: Uint8Array[] = [];
  const copies: Uint8Array[] = [];
  for (const page of screen.pages) {
    pageLists.push(tagged(page.list));
    copies.push(tagged(page.list));
    const program: ContainerPiece = { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' };
    writer.unit(page.parts, program);
    programs.push(program);
  }
  return { own, programs, pageLists, copies, chromePiece, extras };
}

/**
 * The steps of a template screen that take a number, in the order the screen takes them: an `owns` step for a
 * list of the screen's own, whose index is a number, a number step for an operand, a write for its variable.
 * The builder's own walk, `writeScreen`, run with nothing drawn: every text measured as nothing wide, every
 * picture a stand in, so neither the configuration nor its fonts are needed. **So a description's numbers for
 * this screen pair one to one with what this returns**, and a caller can read each number's role off the
 * steps, `named`, or number a screen no configuration holds from roles it knows the values of: section 415's
 * help screens for a device a composer added, `todo-compile-one.md` 3.2.2.4.
 */
export function templateNumberSlots<F extends string>(screen: TemplateScreen<F>): Step[] {
  const slots: Step[] = [];
  const stand: PieceTarget = { to: { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' }, offset: 0 };
  const fonts = new Proxy({} as Record<F, number>, { get: () => 0 });
  // Each list a distinct index, so the lists built on the way are never built two ways.
  writeScreen(screen, () => ({ codes: [], width: 0 }), fonts, new Map(), new Map(), new Map(), {
    numbers: [], pictures: Array<PieceTarget>(256).fill(stand),
    numberOf: (step) => { slots.push(step); return slots.length; },
  });
  return slots;
}

/**
 * The screens built from a description, in mode order since the programs are laid out in that order and the
 * first program to draw a text holds it inline. Everything but the description's numbers is generated. `c` is
 * read for its fonts and character map only, which spell the words and measure them.
 */
export function buildTemplateScreens<F extends string>(
  c: Container, spec: TemplateScreensSpec<F>, screens: readonly TemplateScreen<F>[],
): BuiltTemplateScreens {
  const spell = speller(c);
  const { recordOf } = recordBuilding(spec.homes);
  if (spec.screens.length !== screens.length) throw new ScreenRecordError(`the description holds ${spec.screens.length} screens, not ${screens.length}`);
  const inline = new Map<string, PieceTarget>();
  const lists = new Map<number, ContainerPiece>();
  const built: BuiltScreen[] = [];
  const order = screens.map((_, s) => s).sort((a, b) => (spec.screens[a]?.mode as number) - (spec.screens[b]?.mode as number));
  for (const s of order) {
    const screen = screens[s] as TemplateScreen<F>;
    const described = spec.screens[s] as TemplateScreensSpec<F>['screens'][number];
    const numbers = [...described.numbers];
    const pictures = [...described.pictures];
    const { own, programs, pageLists, copies, chromePiece, extras } = writeScreen(screen, spell, spec.fonts, spec.homes, inline, lists, { numbers, pictures });
    if (numbers.length !== 0) throw new ScreenRecordError(`the description holds ${numbers.length} numbers more than ${screen.name} takes`);
    if (pictures.length !== 0) throw new ScreenRecordError(`the description holds ${pictures.length} pictures more than ${screen.name} draws`);
    const one = recordOf(own, programs, pageLists, copies, undefined, { leads: described.leads, chromes: [chromePiece] });
    // The entry's first byte, the flag section 66 found the firmware tests bit 0 of: on the Harmony One it is
    // 1 exactly on a mode whose own key map binds tag 0x29, 139 of 139 and 0 on the other 3455 of the
    // nineteen compiles, section 411.
    one.entry.bytes[0] = screen.own.some(([tag]) => tag === TAG_CLOCK) ? 1 : 0;
    built[s] = { ...one, extras };
  }
  return { screens: built, lists, inline, homes: spec.homes };
}

// ---------------------------------------------------------------------------------------------------------
// Programs of their own: base slot 11 entries no mode calls.

/**
 * A screen program that is a base slot 11 entry of its own rather than a mode's page, the clock's header
 * programs of section 414: run by a queued `0x73` that names its entry, not called by a page. It is parts
 * alone; it has no key map, no page record and no chrome.
 */
export interface TemplateProgram<F extends string = string> {
  name: string;
  parts: readonly Part<F>[];
}

/**
 * A list the template builds that a program does not name: a state transition's call, the clock's minute's,
 * section 414. `at` is where the instruction that calls it holds its operand in the configuration, its opcode
 * two bytes on, `step`'s convention; the instruction itself is the caller's to write.
 */
export interface TemplateCall {
  what: string;
  step: Step;
  at: number;
}

export interface TemplateProgramsSpec<F extends string = string> {
  /** One font per role. */
  fonts: Record<F, number>;
  /**
   * Per program, in the template's order: the base slot 11 entry it is, which also orders the build, since
   * the programs are laid out in entry order; its pictures in walk order; and every other number it reads.
   */
  programs: { entry: number; pictures: PieceTarget[]; numbers: number[] }[];
  /** The pictures the programs share, by slot, each where it is first drawn. */
  slots: PieceTarget[];
  /** Per call, in the order given, its numbers in walk order: the list it calls first. */
  calls: number[][];
  /** Texts drawn by reference to a copy outside these programs, by glyph codes joined. */
  homes: Map<string, PieceTarget>;
}

export interface TemplateProgramsPlace {
  /** Per program, its pieces in the order `programReader` reads them, the entry's own first. */
  programs: ContainerPiece[][];
  lists: Map<number, ContainerPiece>;
  lengths: Map<ContainerPiece, number>;
  inline: Map<ContainerPiece, Map<number, string>>;
}

export interface TemplateProgramsDescribed<F extends string = string> {
  spec: TemplateProgramsSpec<F>;
  place: TemplateProgramsPlace;
  described: Set<number>;
  structure: Set<number>;
  regions: { from: number; to: number; what: string }[];
}

/**
 * Read off a configuration what a composer would supply for programs of their own and the lists `calls`
 * name, against the template, and where Logitech's sat. `addresses` is where each program starts, in the
 * template's order, and `entries` the base slot 11 entry each is; `roles` the font roles the programs select.
 * Refuses as `describeTemplateScreens` does. `layout` is `takeApart(c)`; `read` is where every value is taken
 * from.
 */
export function describeTemplatePrograms<F extends string>(
  c: Container, layout: ContainerLayout, programs: readonly TemplateProgram<F>[], addresses: readonly number[],
  entries: readonly number[], roles: readonly F[], calls: readonly TemplateCall[] = [], read: ValueReader = blobReader(c),
): TemplateProgramsDescribed<F> {
  if (addresses.length !== programs.length || entries.length !== programs.length) {
    throw new ScreenRecordError(`${addresses.length} addresses and ${entries.length} entries for ${programs.length} programs`);
  }
  const reading = recordReading(c, layout, read);
  const fonts: Partial<Record<F, number>> = {};
  const slots: (PieceTarget | undefined)[] = [];
  const places: ContainerPiece[][] = [];
  const described = programs.map((program, p) => {
    const numbers: number[] = [];
    const pictures: PieceTarget[] = [];
    const extras: ContainerPiece[] = [];
    const root = reading.program(addresses[p] as number, program.name);
    programReader(c, reading, { name: program.name, numbers, pictures, slots, fonts, extras }).unit(program.parts, root.program, 'program');
    places.push([root.piece, ...extras]);
    return { entry: entries[p] as number, pictures, numbers };
  });
  const called = calls.map((call) => {
    const numbers: number[] = [];
    const operand = (c.blob[call.at] as number) | ((c.blob[call.at + 1] as number) << 8);
    programReader(c, reading, { name: call.what, numbers, pictures: [], fonts, extras: [] })
      .step(call.step, { opcode: c.blob[call.at + 2] as number, operand }, call.at, 'call');
    return numbers;
  });
  for (const one of roles) if (fonts[one] === undefined) throw new ScreenRecordError(`the programs select no ${one} font`);
  const missing = slots.findIndex((one) => one === undefined);
  if (missing >= 0) throw new ScreenRecordError(`the programs draw no shared picture ${missing}`);
  return {
    spec: { fonts: fonts as Record<F, number>, programs: described, slots: slots as PieceTarget[], calls: called, homes: reading.homes() },
    place: { programs: places, lists: reading.lists, lengths: reading.lengths, inline: reading.inline },
    described: reading.described,
    structure: reading.structure,
    regions: reading.regions,
  };
}

export interface BuiltTemplatePrograms {
  /** Per program, in the template's order, its pieces in the order they are made, the entry's own first. */
  programs: ContainerPiece[][];
  /** Per call, the instruction that calls its list, for the caller that writes it. */
  calls: Instruction[];
  lists: Map<number, ContainerPiece>;
  inline: Map<string, PieceTarget>;
}

/**
 * Programs of their own and the lists `calls` name, built from a description: the programs in entry order,
 * the order they are laid out in, so the first to draw a text holds it inline; the calls' lists after them.
 * Everything but the description's numbers, pictures, fonts and homes is generated. `c` is read for its fonts
 * and character map only.
 */
export function buildTemplatePrograms<F extends string>(
  c: Container, spec: TemplateProgramsSpec<F>, programs: readonly TemplateProgram<F>[], calls: readonly Omit<TemplateCall, 'at'>[] = [],
): BuiltTemplatePrograms {
  if (spec.programs.length !== programs.length) throw new ScreenRecordError(`the description holds ${spec.programs.length} programs, not ${programs.length}`);
  if (spec.calls.length !== calls.length) throw new ScreenRecordError(`the description holds ${spec.calls.length} calls, not ${calls.length}`);
  const spell = speller(c);
  const inline = new Map<string, PieceTarget>();
  const lists = new Map<number, ContainerPiece>();
  const slotsDrawn = new Set<number>();
  const built: ContainerPiece[][] = [];
  const order = programs.map((_, p) => p).sort((a, b) => (spec.programs[a]?.entry as number) - (spec.programs[b]?.entry as number));
  for (const p of order) {
    const program = programs[p] as TemplateProgram<F>;
    const described = spec.programs[p] as TemplateProgramsSpec<F>['programs'][number];
    const numbers = [...described.numbers];
    const pictures = [...described.pictures];
    const extras: ContainerPiece[] = [];
    const root: ContainerPiece = { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' };
    programWriter(spell, spec.fonts, spec.homes, inline, lists, { name: program.name, numbers, pictures, slots: spec.slots, slotsDrawn, extras })
      .unit(program.parts, root);
    if (numbers.length !== 0) throw new ScreenRecordError(`the description holds ${numbers.length} numbers more than ${program.name} takes`);
    if (pictures.length !== 0) throw new ScreenRecordError(`the description holds ${pictures.length} pictures more than ${program.name} draws`);
    built[p] = [root, ...extras];
  }
  if (slotsDrawn.size !== spec.slots.length) {
    throw new ScreenRecordError(`the description holds ${spec.slots.length} shared pictures and the programs draw ${slotsDrawn.size}`);
  }
  const called = calls.map((call, k) => {
    const numbers = [...(spec.calls[k] as number[])];
    const one = programWriter(spell, spec.fonts, spec.homes, inline, lists, { name: call.what, numbers, pictures: [], extras: [] }).instruction(call.step);
    if (numbers.length !== 0) throw new ScreenRecordError(`the description holds ${numbers.length} numbers more than ${call.what} takes`);
    return one;
  });
  return { programs: built, calls: called, lists, inline };
}

/**
 * A layout with programs of their own and their lists swapped for built ones, where the configuration's sat:
 * each built piece takes the place of the piece read in the same order, a list the place of the list of the
 * same index, which keeps the layout's emission order. Every reference to a replaced piece's start, the base
 * slot 11 table's among them, names the built piece. Refused: a replaced piece carrying bytes after its
 * structure, a reference from elsewhere into the inside of one (a text drawn by reference to one of their
 * inline copies, which no Harmony One compile holds, section 414), a built list the place does not hold and a
 * placed list not built.
 */
export function withTemplatePrograms(layout: ContainerLayout, built: BuiltTemplatePrograms, place: TemplateProgramsPlace): ContainerLayout {
  if (built.programs.length !== place.programs.length) {
    throw new ScreenRecordError(`${built.programs.length} programs were built for ${place.programs.length} places`);
  }
  const replace = new Map<ContainerPiece, ContainerPiece>();
  const swap = (old: ContainerPiece, made: ContainerPiece, what: string): void => {
    if (replace.has(old)) throw new ScreenRecordError('one piece is replaced twice');
    if (place.lengths.get(old) !== old.bytes.length) throw new ScreenRecordError(`${what} carries bytes after its structure`);
    replace.set(old, made);
  };
  place.programs.forEach((pieces, p) => {
    const made = built.programs[p] as ContainerPiece[];
    if (made.length !== pieces.length) {
      throw new ScreenRecordError(`program ${p + 1} would be ${made.length} pieces where the configuration's is ${pieces.length}`);
    }
    pieces.forEach((old, k) => swap(old, made[k] as ContainerPiece, `program ${p + 1}'s piece ${k + 1}`));
  });
  for (const [index, made] of built.lists) {
    const old = place.lists.get(index);
    if (old === undefined) throw new ScreenRecordError(`list ${index} is not one the programs or their calls run`);
    swap(old, made, `list ${index}`);
  }
  for (const index of place.lists.keys()) {
    if (!built.lists.has(index)) throw new ScreenRecordError(`list ${index} is run by nothing built`);
  }
  // Every piece of the result a fresh object, so the input layout is left as it was and a piece whose
  // references change is the one every other piece names.
  const all = [layout.keyTable, ...layout.body,
    ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
  const fresh = new Map<ContainerPiece, ContainerPiece>();
  const sourceOf = new Map<ContainerPiece, ContainerPiece>();
  for (const old of all) {
    const made = replace.get(old) ?? old;
    const one: ContainerPiece = { ...made, refs: [] };
    fresh.set(old, one);
    fresh.set(made, one);
    sourceOf.set(one, made);
  }
  for (const [one, made] of sourceOf) {
    one.refs = made.refs.map((ref) => {
      if (!('to' in ref)) return ref;
      if (replace.has(ref.to) && ref.offset !== 0) {
        throw new ScreenRecordError('a reference names the inside of a replaced program');
      }
      return { ...ref, to: fresh.get(ref.to) ?? ref.to };
    });
  }
  const rewrite = (run: ContainerPiece[]): ContainerPiece[] => run.map((piece) => fresh.get(piece) as ContainerPiece);
  return {
    ...layout,
    keyTable: fresh.get(layout.keyTable) as ContainerPiece,
    body: rewrite(layout.body),
    sections: layout.sections.map((s) => (s === undefined ? s : { before: rewrite(s.before), head: rewrite(s.head) })),
    pictures: rewrite(layout.pictures),
  };
}
