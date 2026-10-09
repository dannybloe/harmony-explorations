/**
 * Every text a Harmony 600, 650 or 700 configuration draws, generated from its word and its font:
 * `todo-compile-650.md` 8.1, section 358.
 *
 * Until here each builder spelled the words it knew and carried the rest. Chapters 6 and 7 build the
 * device pages, the menus, the start up screens, Off and the firmware's own screens, but a configuration
 * composed onto Logitech's starting compile still drew most of its texts as Logitech's bytes, and even
 * the built screens read some of theirs as glyph codes: a menu row's label, an activity's own device
 * list's labels, and every text drawn by reference to a copy outside the built screens, by the copy's
 * address. This module is one pass over a whole configuration that makes three things of every text
 * generated rather than carried:
 *
 * * **its glyph codes**, spelled from its word in its font, `speller`. A code is the configuration's own
 *   number for a character, so a word is read off a configuration as characters, through the character
 *   map, and spelled again. A text with a code the map does not resolve has no word to state, so it
 *   keeps its codes, `todo-compile-650.md` 8.2's; it is still placed and given its form here.
 * * **its place**, by the rule its screen kind uses, from the word's width in its font: a title at 0, 2;
 *   the page counter right aligned in a chain against the right edge; a corner label from x 3 or ending
 *   at 125, at y 40 or 90, two lines from 15 higher; a row label, a bottom word and every line of the
 *   fixed line and firmware screens centred, `floor((128 - width) / 2)`, at its screen's own height; a
 *   start up screen's or Off's title broken greedily onto at most two lines at `STARTUP_TITLE_MAX`.
 *   Sections 285, 325, 330, 334, 336, 356 and 357 measured those rules screen kind by screen kind; here
 *   they are one table, `buildScreenTexts`.
 * * **its form**, inline or by reference: **the first text in the configuration to draw a run of glyph
 *   codes draws it inline, and every later one points at that copy**, over the whole configuration and
 *   every screen program in it. That holds for all 63992 text draws of the 24 Harmony 600, 650 and 700
 *   compiles in the lab, the 22 this pass rebuilds, the French one and a compile with no activities, so it
 *   is not a rule of one screen kind; section 334 measured it on the menu pages and section 357 inside the
 *   firmware's screens, and both are this rule seen from inside one builder. The match is on the codes
 *   alone, whatever font the copy is drawn in, and on whole runs: a run equal to the tail of an earlier
 *   one is drawn inline, so a reference never lands inside another text.
 *
 * **What is left out, and why it is not built**, `LeftOutScreen`: the screens this track does not build,
 * help and the Remote Assistant with the delay settings screens and the one text programs their two
 * countdowns reach, the
 * welcome tour and the thirty status screens the remote never draws from a configuration. Their texts
 * keep their glyph codes and their places as read. **Their form is still generated**, because the form
 * rule is the configuration's and not a screen's: a text on a built screen can be the first copy a left
 * out one points at, or the other way round, and a reference must land on whichever is first.
 *
 * **What is still read, `todo-compile-650.md` 8.2's**: the fonts, which font each text is drawn in, and
 * the character map that turns a code into a character and back. A label's lines are read as words, a
 * two line label being two, since how a label is broken is the device composer's rule, section 325, and
 * not this pass's; a start up title is read whole and broken here.
 *
 * The pattern is section 356's: `describeScreenTexts` reads off a configuration only what a composer would
 * supply, through a `ValueReader` that records what it reads; `buildScreenTexts` generates the rest;
 * `withScreenTexts` writes it into a `takeApart` layout, rewriting the text instructions of each program
 * piece in place and every address into a piece that moved, so `layOutContainer` lays the container out
 * again. It finds its way, which instruction is a text, which mode a program draws, which corner a label
 * sits in, through the container itself; none of that decides a byte of the output, which the blind
 * control in `test/screentexts.test.ts` checks.
 *
 * Arch 14 only, the Harmony 600, 650 and 700. Read only towards hardware: the result is pieces.
 */
import type { Container } from './gspm.ts';
import {
  DEVICE_PAGE_BACK_Y,
  FOUR_SLOT_TITLE_XY,
  STARTUP_FIXED_LINE_Y,
  STARTUP_TITLE_MAX,
  STARTUP_TITLE_SECOND_Y,
  STARTUP_TITLE_Y,
  TWO_ROW_COUNTER_X,
  type ValueReader,
  activityKeyedRecords,
  blobReader,
  fourSlotMenus,
  speller,
} from './compose.ts';
import type { ContainerLayout, ContainerPiece, PieceRef } from './frame.ts';
import { layOutContainer, takeApart } from './frame.ts';
import { fontSets, glyphOf } from './font.ts';
import {
  FOUR_SLOT_ITEMS,
  FOUR_SLOT_LABEL_Y,
  FOUR_SLOT_LEFT_X,
  FOUR_SLOT_RIGHT_END,
  FOUR_SLOT_SCREEN_WIDTH,
  TWO_ROW_LABEL_Y,
  caseQueued,
  fourSlotCellAt,
} from './inventory.ts';
import { TWO_LINE_RISE } from './devicemode.ts';
import { modeRecords } from './sections.ts';
import {
  type ScreenInstruction,
  SCREEN_SELECT_FONT,
  SCREEN_TEXT_AT,
  SCREEN_TEXT_INLINE,
  reachablePrograms,
  screenProgram,
} from './screen.ts';
import { modeRoles } from './screencategories.ts';
import { type CharacterMap, characterMap, glyphsReferencedBy } from './text.ts';
import { valueMaps } from './valuemap.ts';
import { FIRMWARE_SCREEN_TEMPLATES } from './firmwarescreens.ts';
import { FIRMWARE_SCREENS, describeWiring } from './wiring.ts';

/** A refusal, named so a caller can tell a configuration this does not describe from a bug. */
export class ScreenTextError extends Error {}

/**
 * The kinds of screen whose texts are placed by a rule, and the kind left as Logitech compiled it.
 *
 * * `firmware`: the firmware's own screens at the head of the mode table, section 357's templates.
 * * `fixed line`: an activity's start up screen and Off, a title over three fixed lines, sections 336
 *   and 356.
 * * `corner page`: a device's own pages, an activity's working screen and the corner device lists, the
 *   idle one and each activity's own, sections 285, 325, 330, 334, 336 and 352.
 * * `two row list`: the device list nothing enters, rows of two buttons, section 326.
 * * `activity menu`: rows of two buttons, its counter where a corner page draws it, section 316.
 * * `left out`: a screen this track does not build, `LeftOutScreen`. Read, not built.
 */
export type TextScreenKind = 'firmware' | 'fixed line' | 'corner page' | 'two row list' | 'activity menu' | 'left out';

/**
 * Why a screen's texts are left as read:
 *
 * * `status screen`: the thirty status screens after the firmware's own, which the Harmony 650 draws none
 *   of from a configuration, section 355, so `todo-compile-650.md` 7.4 does not build them;
 * * `tour`: the welcome tour, which a configuration may leave out, section 357;
 * * `help`: every other mode, help, the Remote Assistant and the delay settings screens they reach,
 *   which our configuration leaves out, `todo-compile-650.md` 3.13, sections 333 and 345;
 * * `no page`: a program no mode's page draws: one text programs the two delay countdowns those delay
 *   settings screens queue reach, 472 on the 7.5 file.
 */
export type LeftOutScreen = 'status screen' | 'tour' | 'help' | 'no page';

/**
 * What a text is on its screen, which decides its place. A `heading` is a start up screen's or Off's
 * whole title, which the build breaks into its lines, or one line of it where a code has no character
 * and the line keeps its codes; every other role is one line.
 */
export type TextRole =
  | { role: 'title' }
  | { role: 'counter'; part: 0 | 1 | 2 }
  | { role: 'corner'; item: number; line: number; lines: number }
  | { role: 'row'; row: number }
  | { role: 'bottom' }
  | { role: 'heading'; line?: number }
  | { role: 'fixed'; line: number }
  | { role: 'template'; screen: string; line: number }
  | { role: 'left out'; x: number; y: number };

/** One text as a composer would state it: the word, the font, its screen and what it is there. */
export interface ScreenTextSpec {
  /** The word, as characters. Empty where `codes` is given. */
  word: string;
  /**
   * The glyph codes, carried rather than spelled: a left out text's, and a text with a code the character
   * map does not resolve, whose word cannot be stated in characters, `todo-compile-650.md` 8.2. Such a
   * text is still placed by its kind's rule and drawn in the form the rule gives it.
   */
  codes?: number[];
  font: number;
  kind: TextScreenKind;
  /** On a left out screen, which one. */
  leftOut?: LeftOutScreen;
  role: TextRole;
  /** Which drawing of a screen it belongs to, so the counter's three texts can find each other. */
  group: number;
  /** For a person: the screen, `mode 57 page 2` or `the program at 0x3a51c0`. */
  where: string;
}

/** Every text of a configuration, in the order they are laid out, which decides which copy is first. */
export interface ScreenTextsSpec {
  texts: ScreenTextSpec[];
}

/**
 * Where each text of the description sat in the layout, parallel to `ScreenTextsSpec.texts`: the piece,
 * the offset in it and how many bytes, which for a heading is the run of its lines' instructions.
 */
export interface ScreenTextsPlace {
  texts: { piece: ContainerPiece; at: number; length: number }[];
}

export interface ScreenTextsDescribed {
  spec: ScreenTextsSpec;
  place: ScreenTextsPlace;
  /** Blob offsets read as values: the glyph codes a word is read from, and a left out text's place. */
  described: Set<number>;
  /** Blob offsets of every text instruction's bytes, which `withScreenTexts` writes. */
  structure: Set<number>;
  /** Per text, the blob offsets of the instructions that drew it: one, or a heading's lines. */
  draws: number[][];
  /** The blob offsets of texts on built screens whose codes are carried, a code having no character. */
  unresolved: Set<number>;
}

/** One instruction built: its codes, its place and, for every copy after the first, the draw it points at. */
export interface BuiltDraw {
  codes: number[];
  x: number;
  y: number;
  /** The index in `draws` of the first draw of the same codes, where this one is drawn by reference. */
  home?: number;
}

export interface BuiltScreenTexts {
  /** Every instruction, in layout order. */
  draws: BuiltDraw[];
  /** Per text of the description, the range of `draws` it is drawn by, `[from, to)`. */
  spans: [number, number][];
}

/** `0x7E` enters a mode, section 37. */
const ENTER_MODE = 0x7e;
/** A text drawn inline is the opcode, two place bytes, the codes and a zero; by reference, six bytes. */
const INLINE_HEAD = 3;
/** Below this y a text is on the title's line, the title and the counter; from this y it is the bottom word. */
const TITLE_LINE_BELOW = 16;
const BOTTOM_LINE_FROM = 112;
/** The y that parts a two row page's two rows, and a fixed line screen's title from its fixed lines. */
const SCREEN_MIDDLE = 64;
/** A start up screen's title lines, at most two. */
const HEADING_Y: readonly number[] = [STARTUP_TITLE_Y, STARTUP_TITLE_SECOND_Y];

/** A program's texts with the font in effect at each, in the order the program draws them. */
interface DrawnText {
  instruction: ScreenInstruction;
  font: number;
}

function textsOf(program: readonly ScreenInstruction[]): DrawnText[] {
  const out: DrawnText[] = [];
  let font = -1;
  for (const one of program) {
    if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0] ?? -1;
    if (one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT) out.push({ instruction: one, font });
  }
  return out;
}

/**
 * The model, off the firmware's wiring, section 347, which is what says how many firmware screens head the
 * mode table. A configuration whose wiring that reader cannot read is refused here as one this pass does not
 * describe, whatever the reader's own error: a Logitech compile with no activities, `harvest_650_two_devices`,
 * and a bench file whose wiring lists run past their end, `h650_bench_4_2_base`, section 358.
 */
function modelOf(layout: ContainerLayout): ReturnType<typeof describeWiring>['model'] {
  try {
    return describeWiring(layout).model;
  } catch (error) {
    throw new ScreenTextError(`the firmware's wiring is not read: ${(error as Error).message}`);
  }
}

/**
 * Which kind of screen each mode is, by the readers that already know them: the firmware's screens by
 * their place at the head of the mode table, section 357, and the status screens after them, which
 * `modeRoles` names with them; a device's own mode, Off, the start up screens and the tour by
 * `modeRoles`; the menus by `fourSlotMenus`; the working screens by the base slot 14 record keyed by the
 * activity whose cases enter them, `activityKeyedRecords`, section 336. Every other mode is help, the
 * Remote Assistant or the delay settings they reach, which `screencategories.ts`'s roles name, and is
 * left out.
 */
function modeKinds(c: Container, layout: ContainerLayout): { kind: TextScreenKind; leftOut?: LeftOutScreen }[] {
  const roles = modeRoles(c);
  const firmware = FIRMWARE_SCREENS[modelOf(layout)].length;
  const kinds = roles.map((role, mode): { kind: TextScreenKind; leftOut?: LeftOutScreen } => {
    if (mode < firmware) {
      if (role !== 'system' && role !== 'status') throw new ScreenTextError(`mode ${mode} is not a firmware screen`);
      return { kind: 'firmware' };
    }
    if (role === 'status' || role === 'system') return { kind: 'left out', leftOut: 'status screen' };
    if (role === 'tour') return { kind: 'left out', leftOut: 'tour' };
    if (role === 'device') return { kind: 'corner page' };
    if (role === 'start-up' || role === 'off') return { kind: 'fixed line' };
    return { kind: 'left out', leftOut: 'help' };
  });
  for (const menu of fourSlotMenus(c)) {
    kinds[menu.menu] = { kind: menu.kind === 'two row device list' ? 'two row list'
      : menu.kind === 'activity menu' ? 'activity menu' : 'corner page' };
  }
  const working = valueMaps(c)?.[activityKeyedRecords(c).working];
  for (const [, target] of working?.entries ?? []) {
    const queued = caseQueued(c, target);
    if (queued?.opcode !== ENTER_MODE) continue;
    if (roles[queued.operand] !== 'other') throw new ScreenTextError(`working screen ${queued.operand} is also a ${roles[queued.operand]}`);
    kinds[queued.operand] = { kind: 'corner page' };
  }
  return kinds;
}

/**
 * Read off a configuration what a composer would supply for its texts, and where each sat. `layout` is
 * `takeApart(c)`; `read` is where every value is taken from. Refuses a text on a built screen drawn
 * before any font is selected, a program two built screens share, a screen whose texts do not fall into
 * its kind's places, and a start up title whose lines are not one run of instructions.
 */
export function describeScreenTexts(
  c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c),
): ScreenTextsDescribed {
  if (c.architecture !== 14) throw new ScreenTextError('the texts are generated for the Harmony 600, 650 and 700 alone');
  const map = characterMap(c);
  if (map === undefined) throw new ScreenTextError('the configuration draws no text a character map reads');
  const described = new Set<number>();
  const value = (offset: number): number => {
    described.add(offset);
    return read(offset);
  };

  // Where every piece sits, so a text's blob offset can be named as a piece and an offset.
  const laid = layOutContainer(layout);
  if (laid.bytes.length !== c.blob.length) throw new ScreenTextError('the layout is not the configuration taken apart');
  const all = [layout.keyTable, ...layout.body,
    ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
  const starts = all.map((piece) => ({ piece, at: laid.offsetOf(piece) as number })).sort((a, b) => a.at - b.at);
  const pieceAt = (offset: number): { piece: ContainerPiece; at: number } => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if ((starts[mid] as (typeof starts)[number]).at <= offset) low = mid;
      else high = mid - 1;
    }
    const found = starts[low] as (typeof starts)[number];
    return { piece: found.piece, at: offset - found.at };
  };

  // Which screen draws each program: a mode's pages, by the mode's kind, and every other program left out.
  const kinds = modeKinds(c, layout);
  const firmwareNames = FIRMWARE_SCREENS[modelOf(layout)];
  const owner = new Map<number, { kind: TextScreenKind; leftOut?: LeftOutScreen; mode?: number; page?: number }>();
  (modeRecords(c) ?? []).forEach((record, mode) => {
    record.pages.forEach((page, index) => {
      for (const [address] of reachablePrograms(c, [page.program])) {
        const seen = owner.get(address);
        const kind = kinds[mode] as (typeof kinds)[number];
        if (seen !== undefined && (seen.kind !== kind.kind || kind.kind !== 'left out')) {
          throw new ScreenTextError(`the program at 0x${address.toString(16)} is drawn by mode ${seen.mode} and mode ${mode}`);
        }
        owner.set(address, { ...kind, mode, page: index });
      }
    });
  });

  // The word a run of codes spells, or undefined where a code has no character to state it in.
  const wordOf = (codes: readonly number[]): string | undefined => {
    let word = '';
    for (const code of codes) {
      const ch = map.codes.get(code);
      if (ch === undefined) return undefined;
      word += ch;
    }
    return word;
  };
  // The codes a text draws, read as values: inline, its own; by reference, the copy's, found by the address.
  const codesOf = (one: ScreenInstruction): number[] => {
    if (one.opcode === SCREEN_TEXT_INLINE) return [...(one.glyphs ?? [])].map((_, k) => value(one.start + INLINE_HEAD + k));
    const o = one.operands;
    const address = (o[2] as number) | ((o[3] as number) << 8) | ((o[4] as number) << 16);
    const off = c.blobOffsetOf(address);
    if (off === undefined) throw new ScreenTextError(`the text at ${one.start} points outside the configuration`);
    const out: number[] = [];
    for (let k = off; c.blob[k] !== 0; k += 1) out.push(value(k));
    return out;
  };

  const texts: { draws: ScreenInstruction[]; spec: ScreenTextSpec }[] = [];
  const structure = new Set<number>();
  const unresolved = new Set<number>();
  const seenAt = new Set<number>();
  let group = 0;
  for (const [address, program] of [...reachablePrograms(c)].sort((a, b) => a[0] - b[0])) {
    const drawn = textsOf(program).filter((one) => !seenAt.has(one.instruction.start));
    if (drawn.length === 0) continue;
    for (const one of drawn) {
      seenAt.add(one.instruction.start);
      for (let b = 0; b < one.instruction.length; b += 1) structure.add(one.instruction.start + b);
    }
    const who = owner.get(address) ?? { kind: 'left out' as const, leftOut: 'no page' as const };
    const where = who.mode === undefined ? `the program at 0x${address.toString(16)}`
      : `mode ${who.mode} page ${(who.page ?? 0) + 1}`;
    // A text's place is read through the reader to find its role, and only there: the build places it again
    // from the role alone. Read lazily, so a firmware screen, whose roles are its template's order, reads none.
    const placeOf = (one: DrawnText, axis: 0 | 1): number => value(one.instruction.start + 1 + axis);
    const roles = rolesOf(who.kind, drawn, who.mode === undefined ? undefined : firmwareNames[who.mode], where, placeOf);
    group += 1;
    let heading: { draws: ScreenInstruction[]; spec: ScreenTextSpec } | undefined;
    // Whether every line of the title, if the screen has one, states its word; navigation, the codes
    // themselves are read as values below.
    const headingWords = drawn.every((one, k) => (roles[k] as TextRole).role !== 'heading'
      || wordOf([...(one.instruction.opcode === SCREEN_TEXT_INLINE ? one.instruction.glyphs ?? []
        : glyphsReferencedBy(c, one.instruction) ?? [])]) !== undefined);
    let headingLine = 0;
    drawn.forEach((one, k) => {
      const role = roles[k] as TextRole;
      const ins = one.instruction;
      if (role.role === 'left out') {
        // Read as it is, place and codes, since the screen is not built here.
        texts.push({ draws: [ins], spec: {
          word: '', codes: codesOf(ins), font: one.font, kind: who.kind, group, where,
          role: { role: 'left out', x: value(ins.start + 1), y: value(ins.start + 2) },
          ...(who.leftOut === undefined ? {} : { leftOut: who.leftOut }),
        } });
        return;
      }
      if (one.font < 0) throw new ScreenTextError(`${where} draws a text before it selects a font`);
      const codes = codesOf(ins);
      const word = wordOf(codes);
      if (role.role === 'heading' && headingWords) {
        // A title's lines are one text, the words joined where the line broke.
        if (heading === undefined) {
          heading = { draws: [], spec: { word: '', font: one.font, kind: who.kind, role, group, where } };
          texts.push(heading);
        } else {
          const last = heading.draws.at(-1) as ScreenInstruction;
          if (last.start + last.length !== ins.start || one.font !== heading.spec.font) {
            throw new ScreenTextError(`${where}'s title lines are not one run in one font`);
          }
        }
        heading.spec.word = heading.draws.length === 0 ? word as string : `${heading.spec.word} ${word}`;
        heading.draws.push(ins);
        return;
      }
      if (role.role === 'heading') {
        // A title with a code the map does not resolve cannot be broken by its words: each line keeps its
        // codes and its line.
        unresolved.add(ins.start);
        texts.push({ draws: [ins], spec: {
          word: '', codes, font: one.font, kind: who.kind, role: { role: 'heading', line: headingLine++ }, group, where,
        } });
        return;
      }
      if (word === undefined) unresolved.add(ins.start);
      texts.push({ draws: [ins], spec: word === undefined
        ? { word: '', codes, font: one.font, kind: who.kind, role, group, where }
        : { word, font: one.font, kind: who.kind, role, group, where } });
    });
  }

  texts.sort((a, b) => (a.draws[0] as ScreenInstruction).start - (b.draws[0] as ScreenInstruction).start);
  return {
    spec: { texts: texts.map((one) => one.spec) },
    place: {
      texts: texts.map((one) => {
        const first = one.draws[0] as ScreenInstruction;
        const last = one.draws.at(-1) as ScreenInstruction;
        return { ...pieceAt(first.start), length: last.start + last.length - first.start };
      }),
    },
    described,
    structure,
    draws: texts.map((one) => one.draws.map((ins) => ins.start)),
    unresolved,
  };
}

/**
 * What each text of one drawing is on its screen, found by its place on the screen: the title's line
 * above y 16, the bottom line from y 112, and in between a corner by `fourSlotCellAt` or a row by which
 * half it is in. A firmware screen's texts are its template's lines in order, then "Exit" where it has
 * one; a fixed line screen's are its title above the middle and its fixed lines below. These read the
 * places through `placeOf`, which is the description's reader, so the blind control counts them as read;
 * the place is then computed from the role alone. A page counter's place follows the kind, the two row
 * list's ending at 118 and every other's at 125, which on the built pages coincides with the page program
 * holding no opcode 17 or one, section 358.
 */
function rolesOf(
  kind: TextScreenKind, drawn: readonly DrawnText[], firmware: string | undefined, where: string,
  placeOf: (one: DrawnText, axis: 0 | 1) => number,
): TextRole[] {
  const yOf = (one: DrawnText): number => placeOf(one, 1);
  if (kind === 'left out') return drawn.map(() => ({ role: 'left out', x: 0, y: 0 }));
  if (kind === 'firmware') {
    const template = firmware === undefined ? undefined : FIRMWARE_SCREEN_TEMPLATES[firmware];
    if (template === undefined) throw new ScreenTextError(`${where} is no firmware screen with a template`);
    const want = template.lines.length + (template.exit ? 1 : 0);
    if (drawn.length !== want) throw new ScreenTextError(`${where}, ${firmware}, draws ${drawn.length} texts where its template has ${want}`);
    return drawn.map((_, k) => (k < template.lines.length ? { role: 'template', screen: firmware as string, line: k } : { role: 'bottom' }));
  }
  if (kind === 'fixed line') {
    let fixed = 0;
    return drawn.map((one) => (yOf(one) < SCREEN_MIDDLE ? { role: 'heading' } : { role: 'fixed', line: fixed++ }));
  }
  const top = drawn.filter((one) => yOf(one) < TITLE_LINE_BELOW);
  if (top.length !== 1 && top.length !== 4) throw new ScreenTextError(`${where} draws ${top.length} texts on the title's line`);
  // A corner's lines are numbered in the order the page draws them, and counted per corner.
  const cells = drawn.map((one) => {
    const y = yOf(one);
    return y >= TITLE_LINE_BELOW && y < BOTTOM_LINE_FROM && kind === 'corner page' ? fourSlotCellAt(placeOf(one, 0), y) : undefined;
  });
  const lineOf = new Map<number, number>();
  let onTop = 0;
  return drawn.map((one, k): TextRole => {
    const y = yOf(one);
    if (y < TITLE_LINE_BELOW) {
      onTop += 1;
      return onTop === 1 ? { role: 'title' } : { role: 'counter', part: (onTop - 2) as 0 | 1 | 2 };
    }
    if (y >= BOTTOM_LINE_FROM) return { role: 'bottom' };
    if (kind !== 'corner page') return { role: 'row', row: y < SCREEN_MIDDLE ? 0 : 1 };
    const item = cells[k];
    if (item === undefined || item < 0) throw new ScreenTextError(`${where} draws a label in no corner`);
    const line = lineOf.get(item) ?? 0;
    lineOf.set(item, line + 1);
    return { role: 'corner', item, line, lines: cells.filter((other) => other === item).length };
  });
}

/**
 * Build every text of a description: broken into its lines where it is a title, spelled in its font,
 * placed by its kind's rule, and drawn inline where it is the first draw of the configuration of its
 * codes and by reference to that one otherwise. `c` is read for its fonts only, and `map` is its
 * character map, both `todo-compile-650.md` 8.2's; `map` is `characterMap(c)` unless given, which the
 * blind control does, since a map's alphabet is chosen by the codes the configuration's texts draw.
 * Refuses a word its font cannot spell, a title that does not fit two lines, a role its kind has no
 * place for, and a counter missing a part.
 */
export function buildScreenTexts(
  spec: ScreenTextsSpec, c: Container, map: CharacterMap | undefined = characterMap(c),
): BuiltScreenTexts {
  const spell = speller(c, map);
  const sets = fontSets(c) ?? [];
  // A carried run's width is its glyphs' own, as a spelled one's is.
  const widthOf = (font: number, codes: readonly number[]): number => {
    const set = sets[font];
    if (set === undefined) return 0;
    return codes.reduce((sum, code) => sum + (glyphOf(c, set, code)?.width ?? 0), 0);
  };
  const spelled = spec.texts.map((one) => (one.codes !== undefined
    ? { codes: one.codes, width: widthOf(one.font, one.codes) }
    : spell(one.font, one.word)));
  const draws: BuiltDraw[] = [];
  const spans: [number, number][] = [];
  spec.texts.forEach((one, k) => {
    const { codes, width } = spelled[k] as { codes: number[]; width: number };
    const centred = (w: number): number => Math.floor((FOUR_SLOT_SCREEN_WIDTH - w) / 2);
    const role = one.role;
    const from = draws.length;
    const draw = (x: number, y: number, run: number[] = codes): void => {
      draws.push({ codes: run, x, y });
    };
    switch (role.role) {
      case 'left out': draw(role.x, role.y); break;
      case 'title': draw(FOUR_SLOT_TITLE_XY[0], FOUR_SLOT_TITLE_XY[1]); break;
      case 'bottom': draw(centred(width), DEVICE_PAGE_BACK_Y); break;
      case 'row': {
        const y = TWO_ROW_LABEL_Y[role.row];
        if (y === undefined) throw new ScreenTextError(`${one.where} has no row ${role.row}`);
        draw(centred(width), y);
        break;
      }
      case 'heading': {
        if (one.codes !== undefined) {
          const y = HEADING_Y[role.line ?? 0];
          if (y === undefined) throw new ScreenTextError(`${one.where}'s title has no line ${(role.line ?? 0) + 1}`);
          draw(centred(width), y);
          break;
        }
        // Broken greedily at the widest title measured on one line, each line centred, section 323.
        const lines: string[] = [];
        for (const word of one.word.split(' ')) {
          const last = lines.at(-1);
          if (last !== undefined && spell(one.font, `${last} ${word}`).width <= STARTUP_TITLE_MAX) lines[lines.length - 1] = `${last} ${word}`;
          else lines.push(word);
        }
        if (lines.length > HEADING_Y.length || lines.some((line) => spell(one.font, line).width > STARTUP_TITLE_MAX)) {
          throw new ScreenTextError(`${one.where}'s title '${one.word}' does not fit two lines of ${STARTUP_TITLE_MAX} pixels`);
        }
        lines.forEach((line, n) => {
          const run = spell(one.font, line);
          draw(centred(run.width), HEADING_Y[n] as number, run.codes);
        });
        break;
      }
      case 'fixed': {
        const y = STARTUP_FIXED_LINE_Y[role.line];
        if (y === undefined) throw new ScreenTextError(`${one.where} has no fixed line ${role.line + 1}`);
        draw(centred(width), y);
        break;
      }
      case 'template': {
        const line = FIRMWARE_SCREEN_TEMPLATES[role.screen]?.lines[role.line];
        if (line === undefined) throw new ScreenTextError(`${role.screen} has no line ${role.line + 1}`);
        draw(line.x ?? centred(width), line.y);
        break;
      }
      case 'corner': {
        const item = FOUR_SLOT_ITEMS[role.item];
        const height = sets[one.font]?.height;
        if (item === undefined || height === undefined || role.lines > 2) {
          throw new ScreenTextError(`${one.where} has no corner ${role.item} for a label of ${role.lines} lines`);
        }
        const top = FOUR_SLOT_LABEL_Y[item.row] - (role.lines > 1 ? TWO_LINE_RISE : 0);
        draw(item.column === 0 ? FOUR_SLOT_LEFT_X : FOUR_SLOT_RIGHT_END - width, top + role.line * height);
        break;
      }
      case 'counter': {
        if (one.kind === 'two row list') {
          draw(TWO_ROW_COUNTER_X[role.part], FOUR_SLOT_TITLE_XY[1]);
          break;
        }
        // The total ends at the right edge, the slash right before it and the number right before the slash.
        const parts = [0, 1, 2].map((part) => spec.texts.findIndex((other) => other.group === one.group
          && other.role.role === 'counter' && other.role.part === part));
        if (parts.some((index) => index < 0)) throw new ScreenTextError(`${one.where}'s counter lacks a part`);
        let x = FOUR_SLOT_RIGHT_END;
        for (let part = 2; part >= role.part; part -= 1) x -= (spelled[parts[part] as number] as { width: number }).width;
        draw(x, FOUR_SLOT_TITLE_XY[1]);
        break;
      }
    }
    spans.push([from, draws.length]);
  });
  // The form: the first draw of a run of codes draws it inline, and every later one points at it.
  const first = new Map<string, number>();
  draws.forEach((one, k) => {
    const key = one.codes.join(',');
    const home = first.get(key);
    if (home === undefined) first.set(key, k);
    else one.home = home;
  });
  return { draws, spans };
}

/** A built draw's bytes; a reference's address is left zero for the frame to write. */
function drawBytes(one: BuiltDraw): number[] {
  if (one.home !== undefined) return [SCREEN_TEXT_AT, one.x, one.y, 0, 0, 0];
  if (one.codes.some((code) => code < 1 || code >= 0x80)) throw new ScreenTextError('a glyph code outside 1 to 127 is not written');
  return [SCREEN_TEXT_INLINE, one.x, one.y, ...one.codes, 0];
}

/**
 * A layout with every text rewritten as built, in place in its program piece. Each piece keeps its
 * identity, so whatever points at it still does; an address into a piece whose texts changed length is
 * moved with the bytes it names, and every reference a text makes is written anew, to the inline copy
 * of its home.
 */
export function withScreenTexts(layout: ContainerLayout, built: BuiltScreenTexts, place: ScreenTextsPlace): ContainerLayout {
  if (built.spans.length !== place.texts.length) throw new ScreenTextError('the built texts are not the described ones');
  // Per piece, its texts in order.
  const byPiece = new Map<ContainerPiece, number[]>();
  place.texts.forEach((one, k) => {
    const list = byPiece.get(one.piece) ?? [];
    list.push(k);
    byPiece.set(one.piece, list);
  });
  // The new bytes of each piece and, per piece, how an old offset maps to a new one.
  const remap = new Map<ContainerPiece, (offset: number) => number>();
  const drawAt = new Map<number, { piece: ContainerPiece; at: number }>();
  const rewritten = new Map<ContainerPiece, { bytes: Uint8Array; refs: PieceRef[] }>();
  for (const [piece, indices] of byPiece) {
    indices.sort((a, b) => (place.texts[a] as { at: number }).at - (place.texts[b] as { at: number }).at);
    const out: number[] = [];
    const shifts: { from: number; to: number; delta: number }[] = [];
    let cursor = 0;
    for (const k of indices) {
      const { at, length } = place.texts[k] as { at: number; length: number };
      if (at < cursor) throw new ScreenTextError('two texts overlap');
      for (let b = cursor; b < at; b += 1) out.push(piece.bytes[b] as number);
      shifts.push({ from: at, to: at + length, delta: out.length - at });
      const [from, to] = built.spans[k] as [number, number];
      for (let d = from; d < to; d += 1) {
        drawAt.set(d, { piece, at: out.length });
        out.push(...drawBytes(built.draws[d] as BuiltDraw));
      }
      cursor = at + length;
    }
    const after = out.length - cursor;
    for (let b = cursor; b < piece.bytes.length; b += 1) out.push(piece.bytes[b] as number);
    // An offset moves by the change of every text before it. One inside a text may only be the text's
    // own start, where a program continuing at the text lands; a text's own references are not moved but
    // written anew, below.
    remap.set(piece, (offset) => {
      for (const one of shifts) {
        if (offset >= one.to) continue;
        if (offset > one.from) throw new ScreenTextError('an address lands inside a text');
        return offset + one.delta;
      }
      return offset + after;
    });
    rewritten.set(piece, { bytes: Uint8Array.from(out), refs: [] });
  }

  const inText = (piece: ContainerPiece, at: number): boolean => (byPiece.get(piece) ?? []).some((k) => {
    const one = place.texts[k] as { at: number; length: number };
    return at >= one.at && at < one.at + one.length;
  });
  const all = [layout.keyTable, ...layout.body,
    ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
  for (const piece of all) {
    const refs: PieceRef[] = [];
    for (const ref of piece.refs) {
      if (byPiece.has(piece) && inText(piece, ref.at)) continue;
      const at = remap.get(piece)?.(ref.at) ?? ref.at;
      if ('address' in ref) refs.push({ at, address: ref.address });
      else refs.push({ at, to: ref.to, offset: remap.get(ref.to)?.(ref.offset) ?? ref.offset });
    }
    const was = rewritten.get(piece);
    if (was !== undefined) was.refs = refs;
    else piece.refs = refs;
  }
  // The texts' own references, to the inline copy of their home.
  built.draws.forEach((one, d) => {
    if (one.home === undefined) return;
    const here = drawAt.get(d) as { piece: ContainerPiece; at: number };
    const home = drawAt.get(one.home) as { piece: ContainerPiece; at: number };
    (rewritten.get(here.piece) as { refs: PieceRef[] }).refs.push({ at: here.at + INLINE_HEAD, to: home.piece, offset: home.at + INLINE_HEAD });
  });
  for (const [piece, { bytes, refs }] of rewritten) {
    piece.bytes = bytes;
    piece.refs = refs.sort((a, b) => a.at - b.at);
  }
  return layout;
}

/** What `checkScreenTexts` compared. */
export interface ScreenTextsChecked {
  /** Texts of the description, a title of two lines counting once. */
  texts: number;
  /** Bytes of text instructions. */
  bytes: number;
}

/**
 * Every text of a configuration against the one built for it: a configuration whose texts are not
 * spelled, placed and shared by the rules here is refused, naming the first text that differs and how,
 * and then the whole container is laid out again with the built texts and compared byte for byte.
 */
export function checkScreenTexts(c: Container): ScreenTextsChecked {
  const layout = takeApart(c);
  const d = describeScreenTexts(c, layout);
  const built = buildScreenTexts(d.spec, c);
  d.draws.forEach((offsets, k) => {
    const spec = d.spec.texts[k] as ScreenTextSpec;
    const what = `${spec.where}'s ${spec.role.role} '${spec.word}'`;
    const [from, to] = built.spans[k] as [number, number];
    if (to - from !== offsets.length) throw new ScreenTextError(`${what} is drawn in ${offsets.length} lines where it is built in ${to - from}`);
    offsets.forEach((offset, n) => {
      const ins = screenProgram(c, c.flashBase + offset)?.[0];
      const one = built.draws[from + n] as BuiltDraw;
      if (ins === undefined) throw new ScreenTextError(`${what} is not a text`);
      const [x, y] = [ins.operands[0], ins.operands[1]];
      if (x !== one.x || y !== one.y) throw new ScreenTextError(`${what} is drawn at ${x}, ${y} where it is built at ${one.x}, ${one.y}`);
      const inline = ins.opcode === SCREEN_TEXT_INLINE;
      if (inline !== (one.home === undefined)) {
        throw new ScreenTextError(`${what} is drawn ${inline ? 'inline' : 'by reference'} where it is built ${inline ? 'by reference' : 'inline'}`);
      }
      if (inline && [...(ins.glyphs ?? [])].join(',') !== one.codes.join(',')) {
        throw new ScreenTextError(`${what} is drawn in other glyph codes than it spells`);
      }
    });
  });
  const out = layOutContainer(withScreenTexts(layout, built, d.place)).bytes;
  if (out.length !== c.blob.length) {
    throw new ScreenTextError(`the texts built are ${out.length - c.blob.length} bytes longer than the configuration's`);
  }
  const k = out.findIndex((byte, i) => byte !== c.blob[i]);
  if (k >= 0) throw new ScreenTextError(`the configuration differs from its texts built at byte ${k}`);
  return { texts: d.spec.texts.length, bytes: d.structure.size };
}
