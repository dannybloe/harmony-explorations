/**
 * The Harmony One's ten firmware screens built whole from a description: `todo-compile-one.md` 4.4.3, as
 * the Harmony 650's were in its 7.4, section 357.
 *
 * Every Harmony One configuration opens its mode table with the screens the event map's fallback counts,
 * ten, before its thirty status screens, section 405: Low Battery, USB Connected, two blanks, Update
 * Successful, Upgrade Success, Update in progress, Learning..., Firmware upgrade in progress, and the
 * charging problem screen. Section 408 read that the firmware enters none of them by number; the
 * configuration's own lists enter 0, 1 and 9. On the sixteen English compiles of skin 54 each is one shape
 * once the configuration's numbering is set aside, so this module holds the shape and the description
 * holds the numbering.
 *
 * **What a screen is made of**, each one page:
 *
 * * **its own key map**: on Low Battery, USB Connected and the charging problem screen every press of 52 key
 *   codes, the 40 keypad keys and the touch codes, `TOUCH_FIRMWARE_KEYPAD`, each running a list of its own but
 *   USB Connected's scans 2 and 28, plus the enter and leave handlers, tags 6 and 7, and on two of them the header handler, tag `0x2D`, which runs three of
 *   base slot 11's programs; on the other seven the presses of scans 46 and 47 swallowed and the handlers.
 *   The stored order is the hash order, and three buckets are shared: their stored order is measured, the
 *   same on all nineteen compiles, and the insertion order that produces it, `keyListOrderInserted`, is
 *   inferred, chosen per screen under the head insertion rule `compilerTagOrder` found the corpus fits, the
 *   handlers before the keys on the first two and after them on the charging problem screen;
 * * **its lists**: every list the key map runs that is its own, numbered in stored order from list 0 on,
 *   one screen after another, and after a screen's keys the list its chrome queues. Base slot 10's first
 *   178 lists are these screens' on all sixteen and the European factory file;
 * * **its chrome**, the program its page calls: the full screen picture, the queued clock program and the
 *   queued list where the screen has them, and a second picture on three;
 * * **its page program**: the call, then the screen's lines in the body font, each centred on the 176
 *   pixel width rounded down, and on the two screens with one the "OK" of the right hand key in the
 *   second font at 124, 201, inside the touch area of code 49 the page binds, the charging problem screen's
 *   by reference to Low Battery's;
 * * **its page record**, seven bytes with the hit page first, and its page list and the list's copy,
 *   which on Low Battery and the charging problem screen bind the press of scan 49, each to a list of
 *   its own: the copy's is 239 and 240 on all sixteen, the factory file and the Dutch compile, and 238 and 239
 *   on the everyday One's, where the page list's varies on every compile.
 *
 * **What the description carries**, read off a configuration: the two fonts; per screen its hit page, its
 * pictures, the clock program its chrome queues, and in a fixed walk order every other number the
 * configuration chose, the lists outside these screens it calls, its timers and the clock programs its
 * lists run. **What is generated**: every opcode, every constant operand, the tags and their order, the
 * numbering of these screens' own lists, every word and where it is drawn, and which text is drawn inline.
 *
 * English only; skin 54, the Harmony One the spare reports, and the European factory file of skin 59. Read only towards hardware: the result is
 * pieces.
 */
import type { Container, Instruction } from '../../gspm.ts';
import { actionListBytes } from '../../gspm.ts';
import type { ContainerLayout, ContainerPiece } from '../../frame.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import type { PieceTarget } from '../../statetables.ts';
import { taggedListBytes } from '../../sections.ts';
import {
  SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_END, SCREEN_QUEUE_INSTRUCTION, SCREEN_RETURN, SCREEN_SELECT_FONT,
  SCREEN_TEXT_AT, SCREEN_TEXT_INLINE,
} from '../../screen.ts';
import { keyListOrderInserted } from '../../modezero.ts';
import {
  type BuiltScreen, type RecordFrame, type RecordPlace, ScreenRecordError, assertRebuilt, recordBuilding,
  recordReading, withModeRecords,
} from '../../screenrecords.ts';
import { type ValueReader, blobReader, speller } from '../../shared/spelling.ts';

const PRESS = 0x80;
const ENTER = 0x06;
const LEAVE = 0x07;
/** The header handler, which runs three of base slot 11's programs. */
const HEADER = 0x2d;
/** A tag the charging problem screen binds as it binds a key, not a press. */
const TAG_0X30 = 0x30;
const CALL = 0x7f;
const RUN_PROGRAM = 0x73;
const BAND = 0x1f;
const TIMER_START = 0xeb;
const TIMER_CANCEL = 0xea;
const SCREEN_WIDTH = 176;
/** Where the right hand key's "OK" is drawn. */
const OK_AT = [124, 201] as const;
const OK_WORD = 'OK';

/**
 * The key codes the firmware screens bind, by scan: 52 of 1 to 55, every one but 41, 42 and 54, the 40 keypad
 * keys and the touch codes, `reference/remotes/harmony-one/keys.md`, on all nineteen compiles.
 */
export const TOUCH_FIRMWARE_KEYPAD: readonly number[] = Array.from({ length: 55 }, (_, k) => k + 1)
  .filter((scan) => scan !== 41 && scan !== 42 && scan !== 54);

/** One instruction of a list: its opcode and its operand, or the kind of number the configuration chose. */
type Operand = number | 'list' | 'timer' | 'program';
interface Step { opcode: number; operand: Operand; band?: number }
const nop: Step = { opcode: 0, operand: 0 };
const call: Step = { opcode: CALL, operand: 'list' };
const run: Step = { opcode: RUN_PROGRAM, operand: 'program' };
const timerStart: Step = { opcode: BAND, band: TIMER_START, operand: 'timer' };
const timerCancel: Step = { opcode: BAND, band: TIMER_CANCEL, operand: 'timer' };
const fixed = (opcode: number, operand: number): Step => ({ opcode, operand });

/** What a tag runs: nothing, a list of the screen's own, a list elsewhere, or one instruction. */
type Binding =
  | { kind: 'swallow' }
  | { kind: 'own'; steps: readonly Step[] }
  | { kind: 'elsewhere' }
  | { kind: 'direct'; step: Step };
const swallow: Binding = { kind: 'swallow' };
const own = (...steps: Step[]): Binding => ({ kind: 'own', steps });

interface TouchFirmwareScreen {
  name: string;
  /** The keypad presses' binding, absent where a screen binds only `tags`. */
  keys?: Binding;
  /** Every other tag, in the order inserted relative to the keys: `keys` marks where the keypad goes in. */
  tags: readonly (readonly [number, Binding] | 'keys')[];
  /** The list the chrome queues after its clock program, the screen's own. */
  queued?: readonly Step[];
  /** The second picture the chrome draws, and where. */
  second?: readonly [number, number];
  /** The lines in the body font and their heights. */
  lines: readonly (readonly [string, number])[];
  /** Whether the screen draws the right hand key's "OK". */
  ok?: true;
  /** Whether the page list binds the press of scan 49 to a list. */
  scan49?: true;
}

/** The ten screens, in mode order, on the sixteen English compiles of skin 54. */
const SCREENS: readonly TouchFirmwareScreen[] = [
  {
    name: 'Low Battery', keys: own(nop, nop, nop),
    tags: [[ENTER, own(call, timerStart, call)], [LEAVE, own(call, timerCancel, call)], 'keys', [HEADER, own(run, run, run)]],
    queued: [run, run], second: [58, 103], lines: [['The battery level is low!', 143]], ok: true, scan49: true,
  },
  {
    name: 'USB Connected', keys: own(call, nop),
    tags: [[ENTER, { kind: 'elsewhere' }], [LEAVE, own(call, call)], 'keys',
      [PRESS | 2, { kind: 'elsewhere' }], [PRESS | 28, { kind: 'elsewhere' }]],
    second: [56, 89], lines: [['USB Connected', 168]],
  },
  {
    name: 'blank, one', tags: [[PRESS | 47, swallow], [PRESS | 46, swallow],
      [ENTER, own(fixed(0x07, 0xfffb), fixed(BAND, 0xfe02), fixed(BAND, 0xe805))],
      [LEAVE, own(fixed(0x07, 0xfffb), fixed(BAND, 0xfd02), call, call)]],
    lines: [],
  },
  {
    name: 'blank, two', tags: [[PRESS | 47, swallow], [PRESS | 46, swallow],
      [ENTER, own(fixed(0x07, 0xfffb), fixed(BAND, 0xfe03))],
      [LEAVE, own(fixed(BAND, 0xfd03), call, call)]],
    lines: [],
  },
  ...([['Update Successful', 168], ['Upgrade Success', 168], ['Update in progress', 168], ['Learning...', 168],
    ['Firmware upgrade in progress', 168]] as const).map(([line, y]): TouchFirmwareScreen => ({
    name: line, tags: [[PRESS | 47, swallow], [PRESS | 46, swallow], [ENTER, { kind: 'direct', step: timerStart }],
      [LEAVE, { kind: 'direct', step: timerCancel }], [HEADER, own(run, run, run)]],
    queued: [run, run], lines: [[line, y]],
  })),
  {
    name: 'Charging problem', keys: own(call, nop, nop),
    tags: ['keys', [ENTER, own(timerStart, call)], [LEAVE, own(timerCancel, call)], [HEADER, own(run, run, run)],
      [TAG_0X30, own(call, nop, nop)]],
    queued: [run, run], second: [43, 34],
    lines: [['Charging problem.', 125], ['Contact customer support:', 137], ['http://supportinfo.', 149],
      ['harmonyremote.com', 161]],
    ok: true, scan49: true,
  },
];

/**
 * A screen's tags in the order inserted, and what each runs. A tag listed after the keys overrides the keys' own
 * binding: USB Connected's presses of scans 2 and 28 run lists outside the screens.
 */
function bindings(screen: TouchFirmwareScreen): { inserted: number[]; binding: Map<number, Binding> } {
  const binding = new Map<number, Binding>();
  const inserted: number[] = [];
  for (const one of screen.tags) {
    if (one === 'keys') {
      for (const scan of TOUCH_FIRMWARE_KEYPAD) {
        const tag = PRESS | scan;
        if (!binding.has(tag)) inserted.push(tag);
        if (!binding.has(tag)) binding.set(tag, screen.keys as Binding);
      }
    } else {
      const [tag, bound] = one;
      if (!binding.has(tag)) inserted.push(tag);
      binding.set(tag, bound);
    }
  }
  return { inserted, binding };
}

/** The numbers a screen's lists and bindings take, in walk order, and the kinds they are. */
function slotsOf(screen: TouchFirmwareScreen): ('list' | 'timer' | 'program')[] {
  const out: ('list' | 'timer' | 'program')[] = [];
  const { inserted, binding } = bindings(screen);
  const steps = (body: readonly Step[]) => body.forEach((one) => { if (typeof one.operand === 'string') out.push(one.operand); });
  for (const tag of keyListOrderInserted(inserted)) {
    const bound = binding.get(tag) as Binding;
    if (bound.kind === 'own') steps(bound.steps);
    else if (bound.kind === 'elsewhere') out.push('list');
    else if (bound.kind === 'direct') steps([bound.step]);
  }
  if (screen.queued !== undefined) steps(screen.queued);
  if (screen.queued !== undefined) out.push('program');
  // The page list's list, then its copy's, which Logitech points at another.
  if (screen.scan49) out.push('list', 'list');
  return out;
}

export interface TouchFirmwareScreensSpec {
  fonts: { body: number; ok: number };
  /** Per screen, in mode order. */
  screens: {
    /** The hit page its page record names. */
    hitPage: number;
    /** The full screen picture, and the second where the screen draws one. */
    pictures: PieceTarget[];
    /** Every other number the configuration chose, in `slotsOf`'s walk order. */
    numbers: number[];
  }[];
  /** Texts drawn by reference to a copy outside these screens, by glyph codes joined. */
  homes: Map<string, PieceTarget>;
}

export interface TouchFirmwareScreensDescribed {
  spec: TouchFirmwareScreensSpec;
  place: { screens: RecordPlace[]; lists: Map<number, ContainerPiece>; lengths: Map<ContainerPiece, number>; inline: Map<ContainerPiece, Map<number, string>> };
  described: Set<number>;
  structure: Set<number>;
  addresses: { read: Set<number>; built: Set<number> };
  regions: { from: number; to: number; what: string }[];
}

const shift = (step: Step, value: number): number => (step.band === undefined ? value : (step.band << 8) | value);

/**
 * Read off a configuration what a composer would supply for the One's firmware screens, and where
 * Logitech's sat. Refuses a screen whose tags, list numbering or instructions are not this module's shape.
 */
export function describeTouchFirmwareScreens(
  c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c),
): TouchFirmwareScreensDescribed {
  const reading = recordReading(c, layout, read);
  const { value, value16, value24 } = reading;
  let next = 0;
  let body: number | undefined;
  let ok: number | undefined;
  const fontOf = (start: number, seen: number | undefined): number => {
    const font = value(start + 1);
    if (seen !== undefined && seen !== font) throw new ScreenRecordError('the firmware screens select two fonts for one role');
    return font;
  };
  const frames: RecordFrame[] = [];
  const screens = SCREENS.map((screen, mode) => {
    const f = reading.frame(screen.name, mode);
    frames.push(f);
    if (f.pages.length !== 1) throw new ScreenRecordError(`${screen.name}, mode ${mode}, is not one page`);
    const page = f.pages[0] as RecordFrame['pages'][number];
    const { inserted, binding } = bindings(screen);
    const tags = keyListOrderInserted(inserted);
    const entries = f.record.entries;
    if (entries.length !== tags.length || entries.some((one, k) => one.tag !== tags[k])) {
      throw new ScreenRecordError(`${screen.name}'s key map holds other tags or another order`);
    }
    const numbers: number[] = [];
    // A list of the screen's own: at the next index, of its length, each step's opcode, and its numbers.
    const ownList = (index: number, steps: readonly Step[], what: string): void => {
      if (index !== next) throw new ScreenRecordError(`${screen.name}'s ${what} is list ${index}, not ${next}`);
      next += 1;
      const list = reading.list(index, `${screen.name}'s ${what}`);
      if (list.body.length !== steps.length) throw new ScreenRecordError(`${screen.name}'s ${what} is not ${steps.length} instructions`);
      steps.forEach((step, k) => {
        const got = list.body[k] as Instruction;
        if (got.opcode !== step.opcode) throw new ScreenRecordError(`${screen.name}'s ${what}, instruction ${k}, is not 0x${step.opcode.toString(16)}`);
        const at = list.off + 1 + 3 * k;
        if (typeof step.operand === 'number') {
          if (got.operand !== step.operand) throw new ScreenRecordError(`${screen.name}'s ${what}, instruction ${k}, has another operand`);
        } else if (step.band !== undefined) {
          if (got.operand >> 8 !== step.band) throw new ScreenRecordError(`${screen.name}'s ${what}, instruction ${k}, is in another band`);
          numbers.push(value(at));
        } else numbers.push(value16(at));
      });
    };
    tags.forEach((tag, k) => {
      const bound = binding.get(tag) as Binding;
      const entry = entries[k] as (typeof entries)[number];
      const at = f.ownOff + 1 + 4 * k + 1;
      const what = `binding of tag 0x${tag.toString(16)}`;
      if (bound.kind === 'swallow') {
        if (entry.opcode !== 0 || entry.operand !== 0) throw new ScreenRecordError(`${screen.name}'s ${what} is not swallowed`);
      } else if (bound.kind === 'direct') {
        if (entry.opcode !== bound.step.opcode || entry.operand >> 8 !== bound.step.band) {
          throw new ScreenRecordError(`${screen.name}'s ${what} is not its instruction`);
        }
        numbers.push(value(at));
      } else {
        if (entry.opcode !== CALL) throw new ScreenRecordError(`${screen.name}'s ${what} calls no list`);
        if (bound.kind === 'elsewhere') numbers.push(value16(at));
        else ownList(entry.operand, bound.steps, what);
      }
    });
    // The chrome: its pictures, and what it queues.
    const chrome = page.chrome;
    if (chrome === undefined) throw new ScreenRecordError(`${screen.name}'s page calls no chrome`);
    const pictures = chrome.program.filter((one) => one.opcode === SCREEN_DRAW_IMAGE)
      .map((one) => reading.targetOf(value24(one.start + one.length - 3)));
    if (pictures.length !== (screen.second === undefined ? 1 : 2)) throw new ScreenRecordError(`${screen.name}'s chrome draws another number of pictures`);
    const queues = chrome.program.filter((one) => one.opcode === SCREEN_QUEUE_INSTRUCTION);
    if (queues.length !== (screen.queued === undefined ? 0 : 2)) throw new ScreenRecordError(`${screen.name}'s chrome queues another number of instructions`);
    if (screen.queued !== undefined) {
      const [program, list] = queues as [(typeof queues)[number], (typeof queues)[number]];
      ownList((list.operands[0] as number) | ((list.operands[1] as number) << 8), screen.queued, 'queued list');
      numbers.push(value16(program.start + 1));
    }
    for (const one of page.program) {
      if (one.opcode !== SCREEN_SELECT_FONT) continue;
      if (one === page.program.find((ins) => ins.opcode === SCREEN_SELECT_FONT)) body = fontOf(one.start, body);
      else ok = fontOf(one.start, ok);
    }
    if (screen.scan49) {
      const entry = page.list.entries[0];
      if (page.list.entries.length !== 1 || entry?.tag !== (PRESS | 49) || entry.opcode !== CALL) {
        throw new ScreenRecordError(`${screen.name}'s page list does not bind scan 49's press to a list`);
      }
      numbers.push(value16(page.listOff + 1 + 1));
      const copied = page.copy.entries[0];
      if (page.copy.entries.length !== 1 || copied?.tag !== (PRESS | 49) || copied.opcode !== CALL) {
        throw new ScreenRecordError(`${screen.name}'s page list's copy does not bind scan 49's press to a list`);
      }
      numbers.push(value16(page.copyOff + 1 + 1));
    } else if (page.list.entries.length !== 0 || page.copy.entries.length !== 0) throw new ScreenRecordError(`${screen.name}'s page list binds something`);
    const slots = slotsOf(screen);
    if (slots.length !== numbers.length) throw new ScreenRecordError(`${screen.name} read ${numbers.length} numbers for ${slots.length} slots`);
    return { hitPage: page.page.lead as number, pictures, numbers };
  });
  if (body === undefined || ok === undefined) throw new ScreenRecordError('the firmware screens select no fonts');
  return {
    spec: { fonts: { body, ok }, screens, homes: reading.homes() },
    place: {
      screens: frames.map((f, mode) => reading.placeOf((SCREENS[mode] as TouchFirmwareScreen).name, f)),
      lists: reading.lists, lengths: reading.lengths, inline: reading.inline,
    },
    described: reading.described,
    structure: reading.structure,
    addresses: reading.addresses,
    regions: reading.regions,
  };
}

export interface BuiltTouchFirmwareScreens {
  screens: BuiltScreen[];
  lists: Map<number, ContainerPiece>;
  inline: Map<string, PieceTarget>;
  homes: Map<string, PieceTarget>;
}

/** The ten screens built from a description: everything but its numbers generated. */
export function buildTouchFirmwareScreens(c: Container, spec: TouchFirmwareScreensSpec): BuiltTouchFirmwareScreens {
  const spell = speller(c);
  const { recordOf } = recordBuilding(spec.homes);
  const inline = new Map<string, PieceTarget>();
  const lists = new Map<number, ContainerPiece>();
  let nextList = 0;
  const screens = SCREENS.map((screen, mode): BuiltScreen => {
    const described = spec.screens[mode];
    if (described === undefined) throw new ScreenRecordError(`the description holds no ${screen.name}`);
    const numbers = [...described.numbers];
    const take = (): number => {
      const one = numbers.shift();
      if (one === undefined) throw new ScreenRecordError(`the description holds too few numbers for ${screen.name}`);
      return one;
    };
    const instruction = (step: Step): Instruction => ({
      opcode: step.opcode, operand: typeof step.operand === 'number' ? step.operand : shift(step, take()),
    });
    const ownList = (steps: readonly Step[]): number => {
      const index = nextList;
      nextList += 1;
      lists.set(index, { bytes: actionListBytes(steps.map(instruction)), refs: [], owner: 'slot-10-list' });
      return index;
    };
    const { inserted, binding } = bindings(screen);
    const entries = keyListOrderInserted(inserted).map((tag) => {
      const bound = binding.get(tag) as Binding;
      if (bound.kind === 'swallow') return { tag, operand: 0, opcode: 0 };
      if (bound.kind === 'direct') return { tag, ...instruction(bound.step) };
      if (bound.kind === 'elsewhere') return { tag, operand: take(), opcode: CALL };
      return { tag, operand: ownList(bound.steps), opcode: CALL };
    });

    // The chrome.
    const [background, second] = described.pictures;
    if (background === undefined || (screen.second !== undefined) !== (second !== undefined)) {
      throw new ScreenRecordError(`${screen.name}'s description holds another number of pictures`);
    }
    const chrome: ContainerPiece = { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' };
    const chromeBytes: number[] = [];
    const picture = (x: number, y: number, target: PieceTarget): void => {
      chromeBytes.push(SCREEN_DRAW_IMAGE, x, y);
      chrome.refs.push({ at: chromeBytes.length, to: target.to, offset: target.offset });
      chromeBytes.push(0, 0, 0);
    };
    picture(0, 0, background);
    if (screen.queued !== undefined) {
      const queued = ownList(screen.queued);
      const program = take();
      chromeBytes.push(SCREEN_QUEUE_INSTRUCTION, program & 0xff, program >> 8, RUN_PROGRAM);
      chromeBytes.push(SCREEN_QUEUE_INSTRUCTION, queued & 0xff, queued >> 8, CALL);
    }
    if (screen.second !== undefined) picture(screen.second[0], screen.second[1], second as PieceTarget);
    chromeBytes.push(SCREEN_RETURN, SCREEN_END);
    chrome.bytes = Uint8Array.from(chromeBytes);

    // The page program: the call, the lines centred, and the right hand key's word.
    const program: ContainerPiece = { bytes: new Uint8Array(0), refs: [], owner: 'slot-11-program' };
    const out: number[] = [SCREEN_CALL];
    program.refs.push({ at: out.length, to: chrome, offset: 0 });
    out.push(0, 0, 0);
    const text = (x: number, y: number, codes: readonly number[]): void => {
      const key = codes.join(',');
      const home = spec.homes.get(key) ?? inline.get(key);
      if (home !== undefined) {
        out.push(SCREEN_TEXT_AT, x, y);
        program.refs.push({ at: out.length, to: home.to, offset: home.offset });
        out.push(0, 0, 0);
        return;
      }
      out.push(SCREEN_TEXT_INLINE, x, y);
      inline.set(key, { to: program, offset: out.length });
      out.push(...codes, 0);
    };
    if (screen.lines.length > 0) {
      out.push(SCREEN_SELECT_FONT, spec.fonts.body);
      for (const [line, y] of screen.lines) {
        const { codes, width } = spell(spec.fonts.body, line);
        text(Math.floor((SCREEN_WIDTH - width) / 2), y, codes);
      }
    }
    if (screen.ok) {
      out.push(SCREEN_SELECT_FONT, spec.fonts.ok);
      text(OK_AT[0], OK_AT[1], spell(spec.fonts.ok, OK_WORD).codes);
    }
    out.push(SCREEN_END);
    program.bytes = Uint8Array.from(out);

    const pageList = taggedListBytes(screen.scan49 ? [{ tag: PRESS | 49, operand: take(), opcode: CALL }] : []);
    const copy = taggedListBytes(screen.scan49 ? [{ tag: PRESS | 49, operand: take(), opcode: CALL }] : []);
    if (numbers.length !== 0) throw new ScreenRecordError(`the description holds ${numbers.length} numbers more than ${screen.name} takes`);
    return recordOf(taggedListBytes(entries), [program], [pageList], [copy], undefined,
      { leads: [described.hitPage], chromes: [chrome] });
  });
  return { screens, lists, inline, homes: spec.homes };
}

/** A layout with the One's firmware screens swapped for the built ones, where the configuration's sat. */
export function withTouchFirmwareScreens(
  layout: ContainerLayout, built: BuiltTouchFirmwareScreens, place: TouchFirmwareScreensDescribed['place'],
): ContainerLayout {
  return withModeRecords(layout, built, place);
}

/** Describe, build and put back, and compare every byte with the configuration's. */
export function checkTouchFirmwareScreens(c: Container, read?: ValueReader): { lists: number; described: number } {
  const layout = takeApart(c);
  const described = describeTouchFirmwareScreens(c, layout, read);
  const built = buildTouchFirmwareScreens(c, described.spec);
  const out = layOutContainer(withTouchFirmwareScreens(layout, built, described.place)).bytes;
  assertRebuilt(out, c, described.regions);
  return { lists: built.lists.size, described: described.described.size };
}
