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
  type BuiltScreen, type RecordFrame, type RecordPlace, ScreenRecordError, recordBuilding, recordReading,
} from '../../screenrecords.ts';
import { type ValueReader, blobReader, speller } from '../../shared/spelling.ts';

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
  | { kind: 'number'; opcode: number; band?: number; what: NumberKind }
  | { kind: 'write'; operand: number }
  | { kind: 'owns'; steps: readonly Step[] };

export const k = (opcode: number, operand: number): Step => ({ kind: 'constant', opcode, operand });
export const n = (opcode: number, what: NumberKind): Step => ({ kind: 'number', opcode, what });
export const banded = (band: number, what: NumberKind): Step => ({ kind: 'number', opcode: BAND, band, what });
export const owns = (...steps: Step[]): Step => ({ kind: 'owns', steps });
/** A write of `value` to a state variable the configuration chose, `0x80 + variable`. */
export const write = (value: number): Step => ({ kind: 'write', operand: value });

export const SWALLOW = k(0, 0);
/** The click every button's list opens with, `0x75` with `0x0FCA`. */
export const CLICK = k(0x75, 0x0fca);
export const LIST = n(CALL, 'list');
export const ENTER = n(0x7e, 'mode');
export const RUN = n(0x73, 'program');
export const MAP = n(0x72, 'map');
export const TIMER_START = banded(0xeb, 'timer');
export const TIMER_CANCEL = banded(0xea, 'timer');
/** The header handler, tag `0x2D`: three base slot 11 programs. */
export const HEADER = owns(RUN, RUN, RUN);

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
  | { op: 'picture'; x: number; y: number }
  | { op: 'font'; font: F }
  | { op: 'text'; word: string; x: Place; y: number }
  | { op: 'queue'; step: Step }
  | { op: 'chrome' }
  | { op: 'return' }
  /** A drawing instruction whose operands are all constants, the tour's chrome opening with opcode 1. */
  | { op: 'constant'; opcode: number; operands: readonly number[] }
  /**
   * A switch on a state variable the configuration chose: exact values first, then ranges, each arm a
   * program piece of its own ending in a jump to `then`, the piece the arms join again at.
   */
  | { op: 'switch'; arms: readonly { match: number | readonly [number, number]; parts: readonly Part<F>[] }[]; then: readonly Part<F>[] };

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
export const text = (word: string, x: Place, y: number): Part<never> => ({ op: 'text', word, x, y });
/** A body line centred on the 176 pixel width rounded down, `floor((176 - w) / 2)`, section 409's rule. */
export const centred = (word: string, y: number): Part<never> => text(word, { in: [0, SCREEN_WIDTH] }, y);
/** A word of the key below the screen, centred on the left half, the "Back" or "Yes" side. */
export const leftHalf = (word: string, y: number): Part<never> => text(word, { in: [0, HALF] }, y);
/** A word of the key below the screen, centred on the right half, the "OK" or "No" side. */
export const rightHalf = (word: string, y: number): Part<never> => text(word, { in: [HALF, HALF] }, y);
export const TITLE_AT = [6, 4] as const;

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
  return [...head, picture(0, 0), { op: 'queue', step: RUN }, ...count, { op: 'queue', step: owns(RUN, RUN) }, ...again,
    { op: 'return' }];
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
  const { value, value16, value24 } = reading;
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

    // An instruction against its step, `at` being where its operand starts and `at + 2` its opcode.
    const step = (want: Step, got: { opcode: number; operand: number }, at: number, what: string): void => {
      if (want.kind === 'constant') {
        if (got.opcode !== want.opcode || got.operand !== want.operand) {
          throw new ScreenRecordError(`${screen.name}'s ${what} is ${hex(got.opcode)} ${hex(got.operand)}, not ${hex(want.opcode)} ${hex(want.operand)}`);
        }
      } else if (want.kind === 'number') {
        if (got.opcode !== want.opcode) throw new ScreenRecordError(`${screen.name}'s ${what} is not ${hex(want.opcode)}`);
        if (want.band !== undefined) {
          if (got.operand >> 8 !== want.band) throw new ScreenRecordError(`${screen.name}'s ${what} is in another band`);
          numbers.push(value(at));
        } else numbers.push(value16(at));
      } else if (want.kind === 'write') {
        // The variable is the opcode less 0x80, a number the configuration chose; the value is the template's.
        if (got.opcode < STATE_WRITE || got.operand !== want.operand) {
          throw new ScreenRecordError(`${screen.name}'s ${what} is ${hex(got.opcode)} ${hex(got.operand)}, not a write of ${want.operand}`);
        }
        numbers.push(value(at + 2) - STATE_WRITE);
      } else {
        if (got.opcode !== CALL) throw new ScreenRecordError(`${screen.name}'s ${what} calls no list`);
        numbers.push(value16(at));
        const list = reading.list(got.operand, `${screen.name}'s ${what}`);
        if (list.body.length !== want.steps.length) {
          throw new ScreenRecordError(`${screen.name}'s ${what} is ${list.body.length} instructions, not ${want.steps.length}`);
        }
        want.steps.forEach((one, i) => step(one, list.body[i] as Instruction, list.off + 1 + 3 * i, `${what}, instruction ${i}`));
      }
    };
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
        step(binding, entries[i] as { opcode: number; operand: number }, off + head + stride * i + stride - 3, `${what}'s binding of tag ${hex(tag)}`);
      });
    };

    let chromeRead = false;
    // A program piece against its parts. `join` is what follows the last part where it is not an end: a jump to
    // the piece the arms join at. Switches leave their arms in `arms`, walked after the main line.
    const arms: { parts: readonly Part<F>[]; address: number; join: number; what: string }[] = [];
    const walk = (parts: readonly Part<F>[], program: readonly ScreenInstruction[], what: string, join?: number): void => {
      let i = 0;
      const next = (opcode: number, part: string): ScreenInstruction => {
        const one = program[i];
        if (one === undefined || one.opcode !== opcode) throw new ScreenRecordError(`${screen.name}'s ${what}, instruction ${i}, is not ${part}`);
        i += 1;
        return one;
      };
      for (const part of parts) {
        if (part.op === 'picture') {
          const one = next(SCREEN_DRAW_IMAGE, 'a picture');
          if (one.operands[0] !== part.x || one.operands[1] !== part.y) throw new ScreenRecordError(`${screen.name}'s ${what} draws a picture elsewhere`);
          pictures.push(reading.targetOf(value24(one.start + one.length - 3)));
        } else if (part.op === 'font') {
          const one = next(SCREEN_SELECT_FONT, 'a font');
          const number = value(one.start + 1);
          const was = fonts[part.font];
          if (was !== undefined && was !== number) throw new ScreenRecordError(`the screens select two fonts for ${part.font}`);
          fonts[part.font] = number;
        } else if (part.op === 'text') {
          const one = program[i];
          if (one === undefined || (one.opcode !== SCREEN_TEXT_AT && one.opcode !== SCREEN_TEXT_INLINE)) {
            throw new ScreenRecordError(`${screen.name}'s ${what}, instruction ${i}, is not a text`);
          }
          i += 1;
        } else if (part.op === 'constant') {
          const one = next(part.opcode, `opcode ${part.opcode}`);
          if (one.operands.length !== part.operands.length || part.operands.some((v, j) => one.operands[j] !== v)) {
            throw new ScreenRecordError(`${screen.name}'s ${what}, instruction ${i - 1}, has other operands`);
          }
        } else if (part.op === 'queue') {
          const one = next(SCREEN_QUEUE_INSTRUCTION, 'a queued instruction');
          const o = one.operands;
          step(part.step, { opcode: o[2] as number, operand: (o[0] as number) | ((o[1] as number) << 8) }, one.start + 1, `${what}'s queued instruction`);
        } else if (part.op === 'return') {
          next(SCREEN_RETURN, 'a return');
        } else if (part.op === 'chrome') {
          const one = next(SCREEN_CALL, 'the call of the chrome');
          if (!chromeRead) {
            chromeRead = true;
            const chrome = f.pages[0]?.chrome;
            if (chrome === undefined || chrome.program[0]?.start !== reading.blobOf(one.targets[0] as number)) {
              throw new ScreenRecordError(`${screen.name}'s chrome does not read`);
            }
            walk(screen.chrome, chrome.program, 'chrome');
          }
        } else {
          const one = next(SCREEN_SWITCH_NARROW, 'a switch');
          if (i !== program.length || part !== parts[parts.length - 1]) throw new ScreenRecordError(`${screen.name}'s ${what} goes on after its switch`);
          numbers.push(value(one.start + 1));
          const tables = switchTables(one);
          const wantExact = part.arms.filter((arm) => typeof arm.match === 'number').map((arm) => arm.match as number);
          const wantRanges = part.arms.filter((arm) => typeof arm.match !== 'number').map((arm) => arm.match as [number, number]);
          if (part.arms.some((arm, a) => (typeof arm.match === 'number') !== (a < wantExact.length))
            || tables.exact.join() !== wantExact.join() || tables.ranges.join() !== wantRanges.join()) {
            throw new ScreenRecordError(`${screen.name}'s ${what} switches on other values`);
          }
          tables.fields.forEach((at) => reading.addressField(at, 'built'));
          // The piece the arms join at, from the first arm's closing jump: the main line goes on there.
          const first = screenProgram(c, one.targets[0] as number);
          const jump = first?.[first.length - 1];
          if (jump === undefined || jump.opcode !== SCREEN_JUMP) throw new ScreenRecordError(`${screen.name}'s ${what}'s first arm does not jump back`);
          const joinAt = jump.targets[0] as number;
          part.arms.forEach((arm, a) => arms.push({ parts: arm.parts, address: one.targets[a] as number, join: joinAt, what: `${what}'s arm ${a + 1}` }));
          const then = reading.program(joinAt, `${screen.name}'s ${what}'s join`);
          extras.push(then.piece);
          walk(part.then, then.program, `${what}'s join`);
          return;
        }
      }
      if (join === undefined) next(SCREEN_END, 'the end');
      else {
        const one = next(SCREEN_JUMP, 'a jump');
        if (one.targets[0] !== join) throw new ScreenRecordError(`${screen.name}'s ${what} jumps elsewhere`);
        reading.addressField(one.start + 1, 'built');
      }
      if (i !== program.length) throw new ScreenRecordError(`${screen.name}'s ${what} holds more than its parts`);
    };

    tagged(screen.own, f.record.entries, f.ownOff, 'own key map');
    const leads = screen.pages.map((page, p) => {
      const frame = f.pages[p] as RecordFrame['pages'][number];
      tagged(page.list, frame.list.entries, frame.listOff, `page ${p + 1}'s list`);
      tagged(page.list, frame.copy.entries, frame.copyOff, `page ${p + 1}'s copy`);
      walk(page.parts, frame.program, `page ${p + 1}`);
      while (arms.length > 0) {
        const arm = arms.shift() as (typeof arms)[number];
        const one = reading.program(arm.address, `${screen.name}'s ${arm.what}`);
        extras.push(one.piece);
        walk(arm.parts, one.program, arm.what, arm.join);
      }
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
    const take = (): number => {
      const one = numbers.shift();
      if (one === undefined) throw new ScreenRecordError(`the description holds too few numbers for ${screen.name}`);
      return one;
    };
    const instruction = (want: Step): Instruction => {
      if (want.kind === 'constant') return { opcode: want.opcode, operand: want.operand };
      if (want.kind === 'number') return { opcode: want.opcode, operand: want.band === undefined ? take() : (want.band << 8) | take() };
      if (want.kind === 'write') return { opcode: STATE_WRITE + take(), operand: want.operand };
      const index = take();
      const bytes = actionListBytes(want.steps.map(instruction));
      const was = lists.get(index);
      if (was !== undefined && was.bytes.join() !== bytes.join()) throw new ScreenRecordError(`list ${index} is built two ways`);
      lists.set(index, { bytes, refs: [], owner: 'slot-10-list' });
      return { opcode: CALL, operand: index };
    };
    const tagged = (entries: readonly Entry[]): Uint8Array => {
      const by = new Map(entries);
      const order = keyListOrder(entries.map(([tag]) => tag));
      const built = order.map((tag) => ({ tag, flags: flagOf(by.get(tag) as Step), ...instruction(by.get(tag) as Step) }));
      if (!isWide(entries)) return taggedListBytes(built);
      // The wide form: a zero, the count, and per entry its flags byte before the narrow form's four.
      const { head, stride } = form(true);
      const out = new Uint8Array(head + stride * built.length);
      out[1] = built.length;
      built.forEach((one, i) => out.set([one.flags, one.tag, one.operand & 0xff, one.operand >> 8, one.opcode], head + stride * i));
      return out;
    };

    const own = tagged(screen.own);
    const chromePiece: ContainerPiece = { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' };
    let chromeBuilt = false;
    const extras: ContainerPiece[] = [];
    const arms: { parts: readonly Part<F>[]; piece: ContainerPiece; join: ContainerPiece }[] = [];

    // One program piece from its parts, closed by an end or by a jump to `join`.
    const emit = (parts: readonly Part<F>[], piece: ContainerPiece, join?: ContainerPiece): void => {
      const out: number[] = [];
      const refs: PieceRef[] = [];
      const pointer = (to: ContainerPiece, offset = 0): void => {
        refs.push({ at: out.length, to, offset });
        out.push(0, 0, 0);
      };
      let current: F | undefined;
      for (const part of parts) {
        if (part.op === 'picture') {
          const target = pictures.shift();
          if (target === undefined) throw new ScreenRecordError(`the description holds too few pictures for ${screen.name}`);
          out.push(SCREEN_DRAW_IMAGE, part.x, part.y);
          pointer(target.to, target.offset);
        } else if (part.op === 'font') {
          current = part.font;
          out.push(SCREEN_SELECT_FONT, spec.fonts[part.font]);
        } else if (part.op === 'text') {
          if (current === undefined) throw new ScreenRecordError(`${screen.name} draws ${part.word} with no font selected`);
          const { codes, width } = spell(spec.fonts[current], part.word);
          const key = codes.join(',');
          const home = spec.homes.get(key) ?? inline.get(key);
          const x = startOf(part.x, width);
          if (home !== undefined) {
            out.push(SCREEN_TEXT_AT, x, part.y);
            pointer(home.to, home.offset);
          } else {
            out.push(SCREEN_TEXT_INLINE, x, part.y);
            inline.set(key, { to: piece, offset: out.length });
            out.push(...codes, 0);
          }
        } else if (part.op === 'constant') {
          out.push(part.opcode, ...part.operands);
        } else if (part.op === 'queue') {
          const one = instruction(part.step);
          out.push(SCREEN_QUEUE_INSTRUCTION, one.operand & 0xff, one.operand >> 8, one.opcode);
        } else if (part.op === 'return') {
          out.push(SCREEN_RETURN);
        } else if (part.op === 'chrome') {
          out.push(SCREEN_CALL);
          pointer(chromePiece);
          if (!chromeBuilt) {
            chromeBuilt = true;
            emit(screen.chrome, chromePiece);
          }
        } else {
          // The switch, then the piece its arms join at, which goes on with the main line; the arms after it.
          const variable = take();
          const then: ContainerPiece = { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' };
          const exact = part.arms.filter((arm) => typeof arm.match === 'number');
          const ranges = part.arms.filter((arm) => typeof arm.match !== 'number');
          const pieces = new Map(part.arms.map((arm) => [arm, { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' } as ContainerPiece]));
          out.push(SCREEN_SWITCH_NARROW, variable, exact.length);
          for (const arm of exact) { out.push(arm.match as number); pointer(pieces.get(arm) as ContainerPiece); }
          out.push(ranges.length);
          for (const arm of ranges) { out.push(...(arm.match as readonly [number, number])); pointer(pieces.get(arm) as ContainerPiece); }
          for (const arm of part.arms) arms.push({ parts: arm.parts, piece: pieces.get(arm) as ContainerPiece, join: then });
          piece.bytes = Uint8Array.from(out);
          piece.refs = refs;
          extras.push(then);
          emit(part.then, then);
          return;
        }
      }
      if (join === undefined) out.push(SCREEN_END);
      else {
        out.push(SCREEN_JUMP);
        pointer(join);
      }
      piece.bytes = Uint8Array.from(out);
      piece.refs = refs;
    };

    const programs: ContainerPiece[] = [];
    const pageLists: Uint8Array[] = [];
    const copies: Uint8Array[] = [];
    for (const page of screen.pages) {
      pageLists.push(tagged(page.list));
      copies.push(tagged(page.list));
      const program: ContainerPiece = { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' };
      emit(page.parts, program);
      while (arms.length > 0) {
        const arm = arms.shift() as (typeof arms)[number];
        extras.push(arm.piece);
        emit(arm.parts, arm.piece, arm.join);
      }
      programs.push(program);
    }
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
