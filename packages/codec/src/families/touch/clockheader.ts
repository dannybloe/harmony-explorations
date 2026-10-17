/**
 * The Harmony One's clock header built from a description: `todo-compile-one.md` 4.7, findings section 414.
 * The four screen programs that draw the strip along the top of the screen, base slot 11 entries 0 to 3 on
 * every compile read, and the six lists the clock's minute and hour call. Built through the template engine
 * of sections 411 and 412, `screentemplate.ts`, as programs of their own: no mode calls them, a queued
 * `0x73` naming the entry runs them.
 *
 * **What the four draw**, measured on the nineteen Harmony One compiles in the lab:
 *
 * * **the gauge**: a switch on firmware variable 9, the battery gauge's eight levels (`FIRMWARE_STATE_VARIABLES`,
 *   sections 103 and 111), one picture each at 153, 4;
 * * **the gauge while charging**: a switch on firmware variable 15. At 0 it draws the gauge again, its own copy
 *   of the eight arms; at 3 the full gauge's image again; at 1 or 2 a switch on the gauge, a picture of its own at level
 *   0, and at levels 1 to 3 and 4 to 7 a switch on the clock's second whose sixty arms step through three
 *   pictures (the second modulo 3) or two of them (the second modulo 2). Reading variable 15 as the charger's
 *   state is by what it draws, and the firmware's side of it is not read;
 * * **the sending mark**: a switch on firmware variable 17, one picture at 0 and another at 1 to 3, at 128, 0,
 *   then a queued `07 FFFA`, which the wiring's tag `0x2D` binds too and whose meaning section 410 left unread;
 * * **the clock**: its face at 88, 19, then a switch on the weekday, its join a switch on the hour, its join a
 *   switch on the minute, each arm drawing a word in one font at y 18: the day's three letters ending at x 138,
 *   the hour and a colon ending at x 156, and the minute's two digits from x 158. On the sixteen English
 *   compiles of skin 54 the hour is on a twelve hour clock, 0 and 12 drawing "12:", and on both European
 *   compiles of skin 59 on a twenty four hour clock, "00:" to "23:"; what decides it is not read, so it is the
 *   description's, `hours`.
 *
 * Which entry each of the four is differs between compiles, three orders over the nineteen, so it is the
 * description's; the four are laid out contiguously in entry order, each as `screentemplate.ts`' program
 * reader reads it: a piece's main line and its joins, then its arms, each arm whole before the next.
 *
 * **The lists the clock calls**: the minute's transition on every change calls a list of two calls, each a
 * list loading the byte register with 0 and calling a list that tests a variable of the configuration's
 * against it (`0x71`, operation 1) and increments that variable (`1F F2`); the hour's rollover calls the hour
 * list, `hourListBytes`, which increments the day and the weekday. What the two variables count is not read;
 * they are unnamed in the name tree. Nothing else names the six lists, on any of the nineteen.
 *
 * **What the description carries**: which entry each program is; the sixteen pictures once each, by role, a
 * picture drawn from several places taken from a shared table (`pictureOf`), 5.3's to build; the clock's font;
 * the homes of the texts drawn by reference to a copy outside the programs, on the sixteen the sixty minutes,
 * held by section 411's clock pickers on all but one compile, where another mode of nineteen pages holds ten; whether the hour is twelve or twenty four; and the lists'
 * indices and the minute's two variables. **Everything else is generated**: every opcode and operand, the
 * firmware's variables the switches test, every switch's cases, every arm, every word and where it goes, which
 * text is drawn inline, which picture each of the 249 arms and joins draws, and the six lists' instructions.
 *
 * The Harmony One alone, the touch family's: no other model's screen draws a clock (`CLAUDE.md`), and the
 * Harmony 600 family's corner program, sections 369 and 374, is the sending mark's shape at another place, encoded
 * there by `families/four-slot/empty.ts`' `cornerProgram`; whether one encoder serves both is left to plan 007. English only. Read only towards hardware: the result
 * is pieces.
 */
import type { Container } from '../../gspm.ts';
import { archSlot } from '../../gspm.ts';
import type { ContainerLayout } from '../../frame.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import { stateRecords } from '../../sections.ts';
import { SCREEN_DRAW_IMAGE, SCREEN_JUMP, SCREEN_SWITCH_NARROW, SCREEN_TABLE_SLOT, screenProgram } from '../../screen.ts';
import { characterMap, decode } from '../../text.ts';
import { ScreenRecordError, assertRebuilt } from '../../screenrecords.ts';
import { CLOCK_HOUR, CLOCK_MINUTE, CLOCK_SECOND, CLOCK_WEEKDAY, hourListBytes } from '../../statetables.ts';
import { type ValueReader, blobReader, textGlyphs, textValues } from '../../shared/spelling.ts';
import {
  BAND, type BuiltTemplatePrograms, CALL, type Part, type Step, type TemplateCall, type TemplateProgram,
  type TemplateProgramsDescribed, type TemplateProgramsSpec, buildTemplatePrograms, describeTemplatePrograms, font,
  k, owns, pictureOf, text, withTemplatePrograms,
} from './screentemplate.ts';

/** The one font the clock's words are drawn in; a number the configuration chose, 15 to 17 on the nineteen. */
export type ClockHeaderFont = 'clock';
type ClockPart = Part<ClockHeaderFont>;
type ClockSwitch = Extract<ClockPart, { op: 'switch' }>;

/** The four programs, in the order a description lists them. */
export const CLOCK_HEADER_PROGRAMS = ['gauge', 'charging', 'sending', 'clock'] as const;
export type ClockHeaderProgram = (typeof CLOCK_HEADER_PROGRAMS)[number];

// ---------------------------------------------------------------------------------------------------------
// The firmware's variables the programs switch on, the template's constants.

/**
 * The battery gauge, eight levels, firmware variable 9 on the Harmony One (`FIRMWARE_STATE_VARIABLES`, sections
 * 103 and 111); the same on all nineteen compiles, as every firmware owned variable is, section 284.
 */
const GAUGE = 9;
/** Firmware variable 15, which the firmware stores into itself (section 284): 0, 1 to 2 and 3 draw apart. */
const CHARGE = 15;
/** Firmware variable 17, the sending flag of the 600 family's corner program; here 0 and 1 to 3 draw apart. */
const SENDING = 17;
/** The gauge's levels, one picture each. */
const LEVELS = 8;

// ---------------------------------------------------------------------------------------------------------
// The sixteen pictures, by slot: what a description carries once each, and what chapter 5.3 builds.

/**
 * The gauge's eight levels are slots 0 to 7. The sixteen slots are sixteen addresses and thirteen images: the
 * charged picture and the animation's first frame are the full gauge's image (slot 7) stored again, and its
 * second frame level 4's (slot 4), each at an address of its own on every compile read, section 414.
 */
const CHARGED = 8;
/** What the charging gauge draws at level 0. */
const CHARGING_EMPTY = 9;
/** The three pictures the charging gauge steps through, slots 10 to 12. */
const FRAME = 10;
const QUIET = 13;
const SENDING_MARK = 14;
const FACE = 15;
export const CLOCK_HEADER_PICTURES = 16;

/** Where the gauge, the sending mark and the clock's face are drawn. */
const GAUGE_AT = [153, 4] as const;
const MARK_AT = [128, 0] as const;
const FACE_AT = [88, 19] as const;
/** The clock's words: the day ending at x 138, the hour and its colon ending at 156, the minute from 158, all at y 18. */
const DAY_ENDS = 138;
const HOUR_ENDS = 156;
const MINUTE_AT = 158;
const WORDS_Y = 18;

const range = (count: number): number[] => Array.from({ length: count }, (_, i) => i);

/** A switch on a firmware variable with an arm per value from 0, each `arm(value)`, joining at nothing. */
const each = (variable: number, count: number, arm: (value: number) => ClockPart[]): ClockSwitch => ({
  op: 'switch', variable, arms: range(count).map((value) => ({ match: value, parts: arm(value) })), then: [],
});
/** The gauge: a picture per level. */
const gauge = (): ClockPart => each(GAUGE, LEVELS, (level) => [pictureOf(level, ...GAUGE_AT)]);
/** The charging gauge's animation: a picture per second of the minute, the frame `frameOf(second)`. */
const stepping = (frameOf: (second: number) => number): ClockPart =>
  each(CLOCK_SECOND, 60, (second) => [pictureOf(FRAME + frameOf(second), ...GAUGE_AT)]);

/** The days as the weekday counts them, from Sunday, section 322. */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** The hour's word: on a twelve hour clock 0 and 12 are "12:", on a twenty four hour clock two digits. */
const hourWord = (hour: number, hours: 12 | 24): string =>
  (hours === 12 ? `${hour % 12 === 0 ? 12 : hour % 12}:` : `${String(hour).padStart(2, '0')}:`);
const word = (one: string, x: Parameters<typeof text>[1]): ClockPart[] => [font('clock'), text(one, x, WORDS_Y)];

/** The four programs, in `CLOCK_HEADER_PROGRAMS`' order, for a clock of `hours`. */
function clockHeaderPrograms(hours: 12 | 24): TemplateProgram<ClockHeaderFont>[] {
  return [
    { name: 'the gauge', parts: [gauge()] },
    {
      name: 'the charging gauge',
      parts: [{
        op: 'switch', variable: CHARGE, then: [],
        arms: [
          { match: 0, parts: [gauge()] },
          { match: 3, parts: [pictureOf(CHARGED, ...GAUGE_AT)] },
          {
            match: [1, 2],
            parts: [{
              op: 'switch', variable: GAUGE, then: [],
              arms: [
                { match: 0, parts: [pictureOf(CHARGING_EMPTY, ...GAUGE_AT)] },
                { match: [1, 3], parts: [stepping((second) => second % 3)] },
                { match: [4, 7], parts: [stepping((second) => [0, 2][second % 2] as number)] },
              ],
            }],
          },
        ],
      }],
    },
    {
      name: 'the sending mark',
      parts: [{
        op: 'switch', variable: SENDING,
        arms: [{ match: 0, parts: [pictureOf(QUIET, ...MARK_AT)] }, { match: [1, 3], parts: [pictureOf(SENDING_MARK, ...MARK_AT)] }],
        then: [{ op: 'queue', step: k(0x07, 0xfffa) }],
      }],
    },
    {
      name: 'the clock',
      parts: [pictureOf(FACE, ...FACE_AT), {
        ...each(CLOCK_WEEKDAY, 7, (day) => word(DAYS[day] as string, { endAt: DAY_ENDS })),
        then: [{
          ...each(CLOCK_HOUR, 24, (hour) => word(hourWord(hour, hours), { endAt: HOUR_ENDS })),
          then: [each(CLOCK_MINUTE, 60, (minute) => word(String(minute).padStart(2, '0'), MINUTE_AT))],
        }],
      }],
    },
  ];
}

// ---------------------------------------------------------------------------------------------------------
// The lists the clock calls.

/** A test of a variable of the configuration's against the byte register, `0x71` operation 1. */
const TEST: Step = { kind: 'number', opcode: 0x71, band: 0x01, what: 'variable' };
/** An increment of a variable of the configuration's, `1F F2`. */
const INCREMENT: Step = { kind: 'number', opcode: BAND, band: 0xf2, what: 'variable' };
/** Load the byte register with 0, `1F FB00`. */
const LOAD_ZERO = k(BAND, 0xfb00);
/** One of the minute's two calls: load 0, then a list testing a variable against it and incrementing it. */
const COUNT = owns(LOAD_ZERO, owns(TEST, INCREMENT));
/** The list the minute calls on every change: two counts, each of a variable of the configuration's. */
const MINUTE_LIST: Step = owns(COUNT, COUNT);

/**
 * The hour list, as its one encoder `hourListBytes` writes it: read back into constant steps so the template
 * checks and builds it without a second copy of what it holds.
 */
function hourList(): Step {
  const bytes = hourListBytes();
  return owns(...range(bytes[0] as number).map((i) => k(bytes[3 + 3 * i] as number, (bytes[1 + 3 * i] as number) | ((bytes[2 + 3 * i] as number) << 8))));
}

/** Where a transition holds the instruction it runs: its operand five bytes in, its opcode seven. */
const TRANSITION_OPERAND = 5;

/**
 * The two calls, read off the configuration's state records: the minute's call on every change (record 1) and
 * the hour's rollover (record 2), each the one transition of its record that calls a list. Refused where a
 * record holds no such transition or two.
 */
function clockCalls(c: Container): TemplateCall[] {
  const records = stateRecords(c) ?? [];
  const callOf = (index: number, what: string): number => {
    const calls = (records[index]?.values ?? []).filter((one) => one.opcode === CALL);
    if (calls.length !== 1) throw new ScreenRecordError(`the clock's ${what} calls ${calls.length} lists, not one`);
    return (calls[0] as { start: number }).start + TRANSITION_OPERAND;
  };
  return [
    { what: 'the minute\'s call', step: MINUTE_LIST, at: callOf(CLOCK_MINUTE, 'minute') },
    { what: 'the hour\'s call', step: hourList(), at: callOf(CLOCK_HOUR, 'hour') },
  ];
}

// ---------------------------------------------------------------------------------------------------------
// Which entry each program is.

/**
 * Where each of the four programs starts and which base slot 11 entry it is, in `CLOCK_HEADER_PROGRAMS`'
 * order. Found by look over every entry: a program whose first instruction is a switch on variable 9, 15 or
 * 17 is the gauge, the charging gauge or the sending mark, and one drawing a picture at 88, 19 and then
 * switching on the weekday is the clock. Refused: a program found other than once. On all nineteen compiles
 * the four are entries 0 to 3, in three orders.
 */
export function touchClockHeaderEntries(c: Container): { addresses: number[]; entries: number[] } {
  if (c.architecture === undefined) throw new ScreenRecordError('the configuration states no architecture');
  const table = c.pointerArray(archSlot(c.architecture, SCREEN_TABLE_SLOT)) ?? [];
  const byVariable: Readonly<Record<number, ClockHeaderProgram>> = { [GAUGE]: 'gauge', [CHARGE]: 'charging', [SENDING]: 'sending' };
  const found = new Map<ClockHeaderProgram, number[]>();
  const add = (role: ClockHeaderProgram, entry: number): void => { found.set(role, [...(found.get(role) ?? []), entry]); };
  table.forEach((address, entry) => {
    const [first, second] = screenProgram(c, address) ?? [];
    if (first?.opcode === SCREEN_SWITCH_NARROW) {
      const role = byVariable[first.operands[0] as number];
      if (role !== undefined) add(role, entry);
    } else if (first?.opcode === SCREEN_DRAW_IMAGE && first.operands[0] === FACE_AT[0] && first.operands[1] === FACE_AT[1]
      && second?.opcode === SCREEN_SWITCH_NARROW && second.operands[0] === CLOCK_WEEKDAY) {
      add('clock', entry);
    }
  });
  const entries = CLOCK_HEADER_PROGRAMS.map((role) => {
    const at = found.get(role) ?? [];
    if (at.length !== 1) throw new ScreenRecordError(`the configuration holds ${at.length} programs of the look of ${role}, not one`);
    return at[0] as number;
  });
  return { addresses: entries.map((entry) => table[entry] as number), entries };
}

/**
 * Whether the clock at `clock` is on a twelve or a twenty four hour clock, read off the word its first hour
 * arm draws, "12:" or "00:", after checking its first day arm draws "Sun". The words' glyph codes are taken
 * through `read`, so they are among the bytes a description reads; a Sunday other than "Sun" is another
 * language and refused, as is a midnight that is neither.
 */
export function touchClockHours(c: Container, clock: number, read: ValueReader = blobReader(c)): 12 | 24 {
  const map = characterMap(c);
  if (map === undefined) throw new ScreenRecordError('the configuration draws no text this can read');
  // The first arm of the switch a program piece ends in, the word it draws and where it goes on to.
  const firstWord = (at: number): { word: string; join: number } => {
    const arm = screenProgram(c, screenProgram(c, at)?.find((one) => one.opcode === SCREEN_SWITCH_NARROW)?.targets[0] as number) ?? [];
    const drawn = arm.find((one) => textGlyphs(c, one) !== undefined);
    const codes = drawn === undefined ? undefined : textValues(c, drawn, read);
    const jump = arm.find((one) => one.opcode === SCREEN_JUMP);
    if (codes === undefined || jump === undefined) throw new ScreenRecordError('the clock\'s first arm draws no word');
    return { word: decode(Uint8Array.from(codes), map), join: jump.targets[0] as number };
  };
  const day = firstWord(clock);
  if (day.word !== DAYS[0]) throw new ScreenRecordError(`the clock draws Sunday as "${day.word}", another language than English`);
  const midnight = firstWord(day.join).word;
  if (midnight === hourWord(0, 12)) return 12;
  if (midnight === hourWord(0, 24)) return 24;
  throw new ScreenRecordError(`the clock draws midnight as "${midnight}"`);
}

// ---------------------------------------------------------------------------------------------------------
// The description, the builder and the check.

export interface TouchClockHeaderSpec extends TemplateProgramsSpec<ClockHeaderFont> {
  /** A twelve hour clock, as on skin 54, or a twenty four hour one, as on skin 59. */
  hours: 12 | 24;
}

export interface TouchClockHeaderDescribed extends Omit<TemplateProgramsDescribed<ClockHeaderFont>, 'spec'> {
  spec: TouchClockHeaderSpec;
}

/** The two calls as the builder takes them: what each builds, without where Logitech's sat. */
const CALL_STEPS = (): Omit<TemplateCall, 'at'>[] => [
  { what: 'the minute\'s call', step: MINUTE_LIST },
  { what: 'the hour\'s call', step: hourList() },
];

/**
 * Read off a configuration what a composer would supply for its clock header: `describeTemplatePrograms` at
 * the entries `touchClockHeaderEntries` finds, with the minute's and the hour's calls, and the clock's hours
 * `touchClockHours` reads. `layout` is `takeApart(c)`; `read` is where every value is taken from.
 */
export function describeTouchClockHeader(c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c)): TouchClockHeaderDescribed {
  const { addresses, entries } = touchClockHeaderEntries(c);
  // The words that say which clock it is are read like every other value, and counted with them.
  const words = new Set<number>();
  const hours = touchClockHours(c, addresses[CLOCK_HEADER_PROGRAMS.indexOf('clock')] as number, (at) => { words.add(at); return read(at); });
  const d = describeTemplatePrograms(c, layout, clockHeaderPrograms(hours), addresses, entries, ['clock'], clockCalls(c), read);
  for (const at of words) d.described.add(at);
  return { ...d, spec: { ...d.spec, hours } };
}

/** The four programs and the six lists built from a description; everything but its numbers is generated. */
export function buildTouchClockHeader(c: Container, spec: TouchClockHeaderSpec): BuiltTemplatePrograms {
  return buildTemplatePrograms(c, spec, clockHeaderPrograms(spec.hours), CALL_STEPS());
}

/** A layout with the clock header swapped for the built one, where the configuration's sat. */
export function withTouchClockHeader(
  layout: ContainerLayout, built: BuiltTemplatePrograms, place: TouchClockHeaderDescribed['place'],
): ContainerLayout {
  return withTemplatePrograms(layout, built, place);
}

/**
 * Describe, build and put back, and compare every byte with the configuration's. Also refused: a built call
 * other than the instruction the state record holds, which the state tables' builder writes, section 407.
 */
export function checkTouchClockHeader(c: Container, read?: ValueReader): { programs: number; pieces: number; lists: number; described: number; structure: number } {
  const layout = takeApart(c);
  const described = describeTouchClockHeader(c, layout, read);
  const built = buildTouchClockHeader(c, described.spec);
  clockCalls(c).forEach((call, k) => {
    const one = built.calls[k];
    if (one === undefined || one.opcode !== c.blob[call.at + 2] || one.operand !==((c.blob[call.at] as number) | ((c.blob[call.at + 1] as number) << 8))) {
      throw new ScreenRecordError(`${call.what} is not the call its record holds`);
    }
  });
  assertRebuilt(layOutContainer(withTouchClockHeader(layout, built, described.place)).bytes, c, described.regions);
  return {
    programs: built.programs.length,
    pieces: built.programs.reduce((sum, one) => sum + one.length, 0),
    lists: built.lists.size,
    described: described.described.size,
    structure: described.structure.size,
  };
}
