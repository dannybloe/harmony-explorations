/**
 * The firmware's own screens built whole from a description: `todo-compile-650.md` 7.4, section 357.
 *
 * Every arch 14 configuration opens its mode table with the screens the firmware's own events lead to,
 * fourteen on the Harmony 600 and 650 and nineteen on the Harmony 700, `FIRMWARE_SCREENS`: the two "add
 * an Activity" placeholders, which 7.4 calls the setup screens, "USB Connected", the battery screens,
 * "Update Successful" and "Upgrade Successful", the three learning screens, and blanks between them.
 * Section 355 read that the firmware enters none of them by number; the configuration's own wiring does,
 * section 347, and `wiring.ts` already builds that. What still came out of a Logitech compile was the
 * screens themselves. This module builds each whole, on section 356's pattern and with its machinery:
 * `describeFirmwareScreens` reads off a configuration only what a composer would supply,
 * `buildFirmwareScreens` generates the rest as pieces, and `withFirmwareScreens` puts them where
 * Logitech's sat, through `withModeRecords`.
 *
 * **What a screen is made of**, every one of them one page:
 *
 * * **its own key map**, which is one of five, all over the whole keypad in `keyMapEntries`' stored
 *   order, section 315's hash order: the placeholder's, every key swallowed but the press of scan 25,
 *   which pops back, which is mode 0's list after the end marker and so `modeZeroKeyList`'s, section
 *   311; a battery screen's, every key swallowed and the enter handler, tag 6, setting the low battery
 *   flag, the variable `wiring.ts` calls `lowBattery`; the Low Battery screen's, that and scan 25 running
 *   the Exit list `wiring.ts` builds first in base slot 10; "USB Connected"'s, below; and the empty one,
 *   two zero bytes, on the update and learning screens and their blanks;
 * * **its entry and page record**, `recordBuilding`'s;
 * * **its page list and that list's second copy**, section 69, both empty;
 * * **its program**: the background picture, then the screen's lines, each in the body font or the
 *   large one, at a measured height, centred except on the two placeholders, whose lines start at the
 *   left edge; and on the placeholders and Low Battery the bottom line, the bar and "Exit",
 *   `bottomLineParts`. Every word is spelled from the configuration's fonts, as section 356 spells
 *   "Turning system off", and is English, measured on 22 compiles;
 * * **the lists "USB Connected" runs**, ten, one of them on the Harmony 700 only through the wiring's
 *   `usbLeave`. Every key event but three presses, and the screen's enter
 *   handler, run `key`, `[07 FFFF, usb := 1]`. The presses of scans 11, 12 and 51 each load their step,
 *   1, 2 and 3, into the byte register and run a two armed test of `usb` against it, section 140, which
 *   moves `usb` on to 2 and 3 and on the last step pops the mode, `07 FFFC`, section 311, and otherwise
 *   runs `key`. Every other key event resets it, the three keys' own releases and repeats included, so how
 *   a person completes the sequence is not read; not checked on a remote. The leave handler, tag 7, runs `cleared`, `[07 FFFF, usb := 0]`, on
 *   the Harmony 600 and 650, and on the Harmony 700 the front list `usbLeave` `wiring.ts` builds, whose
 *   first call is `cleared`. What `07 FFFF` does is not read: section 311 found instruction `0x07`
 *   compares its operand's low byte with `0xFF` first.
 *
 * **What the description carries**, and so what is still read off a configuration:
 *
 * * the wiring's own description, `describeWiring`: the model, the low battery variable, and on the
 *   Harmony 700 the index of `usbLeave`'s first call, which is `cleared`;
 * * the two fonts, the body font and the large one, read once each, `todo-compile-650.md` 8.2's;
 * * every screen's background picture and bottom bar, read off the program's own address fields, 9.1's;
 * * "USB Connected"'s variable and the indices of its lists, base slot 10's numbering;
 * * the texts drawn by reference to a copy outside these screens, which on the 22 compiles is none.
 *
 * **What is generated**: every own key map, entry, page record, page list and copy; every program's
 * opcodes, font selections, positions and words; the lists "USB Connected" runs, each written once from
 * the variable and indices above; which texts are drawn inline and which by reference to the first copy.
 *
 * Arch 14 only, the Harmony 600, 650 and 700, and English only. Read only towards hardware: the result is
 * pieces.
 */
import type { Container, Instruction } from './gspm.ts';
import { actionListBytes } from './gspm.ts';
import { ComposeError, type MenuPart, type ValueReader, blobReader, bottomLineParts, spelledText } from './compose.ts';
import type { ContainerLayout, ContainerPiece } from './frame.ts';
import { layOutContainer, takeApart } from './frame.ts';
import { FOUR_SLOT_SCREEN_WIDTH, KEY_EVENT_PRESS, KEY_EVENT_SHIFT } from './inventory.ts';
import { STATE_WRITE_BASE } from './actions.ts';
import { POP_MODE, keyMapEntries } from './modezero.ts';
import { ACTION_LIST_INDEX_OPCODE, taggedListBytes } from './sections.ts';
import {
  type BuiltScreen, type RecordFrame, type RecordPlace, ScreenRecordError, assertRebuilt, recordBuilding, recordReading,
  withModeRecords,
} from './screenrecords.ts';
import type { PieceTarget } from './statetables.ts';
import { FIRMWARE_SCREENS, type WiringModel, type WiringSpec, describeWiring, wiringFrontIndex } from './wiring.ts';

/** Which of the five own key maps a firmware screen has. */
export type FirmwareKeyMap = 'placeholder' | 'battery' | 'low battery' | 'usb' | 'none';

/** One line a firmware screen draws: the text, the font it is drawn in, its height, and its x when it is not centred. */
export interface FirmwareLine {
  text: string;
  font: 'body' | 'large';
  y: number;
  x?: number;
}

/** A firmware screen's template: its key map, its lines, and whether it draws the bottom line with "Exit". */
export interface FirmwareScreenTemplate {
  keys: FirmwareKeyMap;
  lines: readonly FirmwareLine[];
  exit: boolean;
}

/** The word on the bottom line of the placeholders and Low Battery, under the key at the display's centre. */
export const FIRMWARE_EXIT_WORD = 'Exit';

const body = (y: number, text: string, x?: number): FirmwareLine => (x === undefined ? { text, font: 'body', y } : { text, font: 'body', y, x });
const large = (y: number, text: string): FirmwareLine => ({ text, font: 'large', y });
/** The placeholders draw their lines from the left edge, at x 0, on 22 of 22 compiles. */
const LEFT = 0;

/**
 * Every firmware screen's template by its `FIRMWARE_SCREENS` name, measured on the 22 compiles of
 * section 357: the same on every Harmony 600, 650 and 700 that carries the screen.
 */
export const FIRMWARE_SCREEN_TEMPLATES: Readonly<Record<string, FirmwareScreenTemplate>> = {
  frame0: { keys: 'battery', lines: [], exit: false },
  frame1: { keys: 'battery', lines: [], exit: false },
  frame2: { keys: 'battery', lines: [], exit: false },
  frame3: { keys: 'battery', lines: [], exit: false },
  addActivityHere: {
    keys: 'placeholder', exit: true,
    lines: [body(30, 'Use the Harmony', LEFT), body(45, 'setup software to', LEFT), body(60, 'add an Activity on', LEFT),
      body(75, 'this button.', LEFT)],
  },
  addActivities: {
    keys: 'placeholder', exit: true,
    lines: [body(30, 'Use the Harmony', LEFT), body(45, 'setup software to', LEFT), body(60, 'add Activities.', LEFT)],
  },
  usbConnected: { keys: 'usb', lines: [large(96, 'USB Connected')], exit: false },
  lowBattery: { keys: 'low battery', lines: [large(5, 'Low Battery')], exit: true },
  pleaseCharge: { keys: 'battery', lines: [large(5, 'Please charge your'), large(19, 'remote')], exit: false },
  batteryBlank: { keys: 'battery', lines: [], exit: false },
  insertBatteries: { keys: 'battery', lines: [body(61, 'Insert batteries')], exit: false },
  unableToCharge: { keys: 'battery', lines: [body(61, 'Unable to charge'), body(76, 'batteries')], exit: false },
  updateSuccessful: { keys: 'none', lines: [body(61, 'Update Successful')], exit: false },
  upgradeSuccessful: { keys: 'none', lines: [body(61, 'Upgrade'), body(76, 'Successful')], exit: false },
  upgradeBlank: { keys: 'none', lines: [], exit: false },
  readyToLearn: { keys: 'none', lines: [body(46, 'Ready to learn'), body(61, 'command from'), body(76, 'other remote.')], exit: false },
  commandReceived: { keys: 'none', lines: [body(61, 'Command'), body(76, 'Received')], exit: false },
  learnBlank: { keys: 'none', lines: [], exit: false },
  terminateEntry: { keys: 'none', lines: [body(61, 'Terminate Entry')], exit: false },
};

/** The enter and leave handlers' tags, section 52. */
const ENTER_TAG = 0x06;
const LEAVE_TAG = 0x07;
/** The key under the display's centre, which "Exit" names, sections 290 and 311. */
const EXIT_SCAN = 25;
/** The three presses that step "USB Connected" towards leaving, in order. */
export const USB_STEP_SCANS = [11, 12, 51] as const;
/** `0x7F` calls a list, `0x71` tests a variable against the byte register, `0x1F 0xFB0k` loads k, section 140. */
const CALL = ACTION_LIST_INDEX_OPCODE;
const TEST = 0x71;
const TEST_VARIABLE = 0x8000;
const LOAD = 0x1f;
const LOAD_BASE = 0xfb00;
/** The instruction every list of "USB Connected" opens with, `0x07`'s `0xFF` arm, whose effect is not read. */
const USB_MARK = { opcode: 0x07, operand: 0xffff } as const;
const OP_IMAGE = 0x02;
const OP_BAR = 0x03;
const OP_FONT = 0x10;

const press = (scan: number): number => (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan;
const call = (list: number): Instruction => ({ opcode: CALL, operand: list });
const write = (variable: number, value: number): Instruction => ({ opcode: STATE_WRITE_BASE + variable, operand: value });

/** "USB Connected"'s description: its variable and the base slot 10 indices of the lists it runs. */
export interface FirmwareUsbSpec {
  variable: number;
  /** `[07 FFFF, usb := 1]`, run by the enter handler and every key but three. */
  key: number;
  /** `[07 FFFF, usb := 0]`, the leave handler's on the Harmony 600 and 650, `usbLeave`'s first call on the 700. */
  cleared: number;
  /** Per step, the list the press runs, `[1F FB0k, call test]`. */
  steps: readonly [number, number, number];
  /** Per step, the test, `[71 usb, call advance or 07 FFFC, call key]`. */
  tests: readonly [number, number, number];
  /** The first two steps' advance, `[07 FFFF, usb := k + 1]`. */
  advances: readonly [number, number];
}

export interface FirmwareScreensSpec {
  /** The wiring's description, which names the screens' variables and front lists, section 347. */
  wiring: WiringSpec;
  fonts: { body: number; large: number };
  /** Per screen, in mode order, its background picture and, where it draws one, its bottom bar. */
  pictures: { background: PieceTarget; bar?: PieceTarget }[];
  usb: FirmwareUsbSpec;
  /** The modes in the order they are laid out, which decides which copy of a text is drawn inline. */
  order: number[];
  /** Texts drawn by reference to a copy outside these screens, by glyph codes joined. */
  homes: Map<string, PieceTarget>;
}

export interface FirmwareScreensDescribed {
  spec: FirmwareScreensSpec;
  place: { screens: RecordPlace[]; lists: Map<number, ContainerPiece>; lengths: Map<ContainerPiece, number>; inline: Map<ContainerPiece, Map<number, string>> };
  described: Set<number>;
  structure: Set<number>;
  addresses: { read: Set<number>; built: Set<number> };
  regions: { from: number; to: number; what: string }[];
}

/** The screen templates of a model, in mode order. */
export function firmwareScreenTemplates(model: WiringModel): { name: string; template: FirmwareScreenTemplate }[] {
  return FIRMWARE_SCREENS[model].map((name) => {
    const template = FIRMWARE_SCREEN_TEMPLATES[name];
    if (template === undefined) throw new ScreenRecordError(`no template for the firmware screen ${name}`);
    return { name, template };
  });
}

/**
 * Read off a configuration what a composer would supply for its firmware screens, and where Logitech's
 * sat. `layout` is `takeApart(c)`; `read` is where every value is taken from. Refuses a screen of more
 * than one page, a key map of another shape where a value is read off it, and a list "USB Connected" runs
 * that is not of its shape.
 */
export function describeFirmwareScreens(
  c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c),
): FirmwareScreensDescribed {
  if (c.architecture !== 14) throw new ScreenRecordError('the firmware screens are built for the Harmony 600, 650 and 700 alone');
  const wiring = describeWiring(layout);
  const screens = firmwareScreenTemplates(wiring.model);
  const reading = recordReading(c, layout, read);
  const { value, value16, value24 } = reading;
  const frames = screens.map(({ name }, mode): RecordFrame => {
    const f = reading.frame(name, mode);
    if (f.pages.length !== 1) throw new ScreenRecordError(`the firmware screen ${name}, mode ${mode}, is not one page`);
    return f;
  });
  const frameOf = (name: string): RecordFrame => frames[screens.findIndex((one) => one.name === name)] as RecordFrame;

  // A font, read once, at the first font selection of the screen named.
  const fontAt = (name: string): number => {
    const select = frameOf(name).pages[0]?.program.find((one) => one.opcode === OP_FONT);
    if (select === undefined) throw new ScreenRecordError(`${name} selects no font`);
    return value(select.start + 1);
  };
  const fonts = { body: fontAt('addActivityHere'), large: fontAt('usbConnected') };

  // The pictures, off each program's own address fields.
  const pictures = frames.map((f, mode) => {
    const program = f.pages[0]?.program ?? [];
    const addressOf = (opcode: number): PieceTarget | undefined => {
      const one = program.find((ins) => ins.opcode === opcode);
      return one === undefined ? undefined : reading.targetOf(value24(one.start + one.length - 3));
    };
    const background = addressOf(OP_IMAGE);
    if (background === undefined) throw new ScreenRecordError(`mode ${mode} draws no background`);
    const bar = addressOf(OP_BAR);
    return bar === undefined ? { background } : { background, bar };
  });

  // "USB Connected": the operand a tag's binding names, read, and the list it names, spanned.
  const usbFrame = frameOf('usbConnected');
  const operandOf = (tag: number): number => {
    const at = usbFrame.record.entries.findIndex((one) => one.tag === tag);
    if (at < 0 || usbFrame.record.entries[at]?.opcode !== CALL) throw new ScreenRecordError(`USB Connected does not call a list on tag 0x${tag.toString(16)}`);
    return value16(usbFrame.ownOff + 1 + 4 * at + 1);
  };
  const listOf = (index: number, what: string, length: number) => {
    const one = reading.list(index, what);
    if (one.body.length !== length) throw new ScreenRecordError(`list ${index}, ${what}, is not ${length} instructions`);
    return one;
  };
  const key = operandOf(ENTER_TAG);
  const keyList = listOf(key, 'which USB Connected runs on every key', 2);
  const variable = value(keyList.off + 6) - STATE_WRITE_BASE;
  const seven = wiring.model === 'harmony-700';
  const cleared = seven ? wiring.lists['usbLeave.first'] : operandOf(LEAVE_TAG);
  if (cleared === undefined) throw new ScreenRecordError('the wiring names no first call of the USB leave handler');
  listOf(cleared, 'which USB Connected runs on leaving', 2);
  const steps = USB_STEP_SCANS.map((scan) => operandOf(press(scan)));
  // Each list's second instruction names the next: a step its test, a test its advance.
  const tests = steps.map((step, k) => value16(listOf(step, `step ${k + 1} towards leaving USB Connected`, 2).off + 4));
  const testOffsets = tests.map((test, k) => listOf(test, `the test of step ${k + 1}`, 3).off);
  const advances = testOffsets.slice(0, 2).map((off, k) => {
    const advance = value16(off + 4);
    listOf(advance, `the advance of step ${k + 1}`, 2);
    return advance;
  });

  const homes = reading.homes();
  const order = frames.map((f, mode) => ({ mode, at: reading.offsetOf(f.pages[0]?.programPiece as ContainerPiece) }))
    .sort((a, b) => a.at - b.at).map((one) => one.mode);
  return {
    spec: {
      wiring, fonts, pictures, order, homes,
      usb: {
        variable, key, cleared,
        steps: steps as unknown as [number, number, number],
        tests: tests as unknown as [number, number, number],
        advances: advances as unknown as [number, number],
      },
    },
    place: {
      screens: frames.map((f, mode) => reading.placeOf((screens[mode] as (typeof screens)[number]).name, f)),
      lists: reading.lists, lengths: reading.lengths, inline: reading.inline,
    },
    described: reading.described,
    structure: reading.structure,
    addresses: reading.addresses,
    regions: reading.regions,
  };
}

export interface BuiltFirmwareScreens {
  /** Per mode, in mode order. */
  screens: BuiltScreen[];
  /** The lists "USB Connected" runs, by base slot 10 index. */
  lists: Map<number, ContainerPiece>;
  inline: Map<string, PieceTarget>;
  homes: Map<string, PieceTarget>;
}

/**
 * The parts of one firmware screen's program: its background, its lines with a font selected wherever
 * another is in effect, the compiler's rule, section 289, and the bottom line where it draws one. A
 * picture's address is a handle, 0 for the background and 1 for the bar, which the caller resolves.
 */
export function firmwareScreenParts(
  c: Container, template: FirmwareScreenTemplate, fonts: FirmwareScreensSpec['fonts'],
): MenuPart[] {
  const parts: MenuPart[] = [{ op: 'image', address: 0 }];
  let font: number | undefined;
  const select = (want: number): void => {
    if (want !== font) parts.push({ op: 'font', font: want });
    font = want;
  };
  for (const line of template.lines) {
    const want = line.font === 'body' ? fonts.body : fonts.large;
    const { codes, width } = spelledText(c, want, line.text);
    select(want);
    parts.push({ op: 'text', x: line.x ?? Math.floor((FOUR_SLOT_SCREEN_WIDTH - width) / 2), y: line.y, codes, role: 'fixed' });
  }
  if (template.exit) {
    const bottom = bottomLineParts(c, 1, FIRMWARE_EXIT_WORD);
    parts.push(bottom.bar);
    select(bottom.font);
    parts.push(bottom.text);
  }
  parts.push({ op: 'end' });
  return parts;
}

/**
 * Build the firmware screens from a description, `todo-compile-650.md` 7.4. `c` is read for its fonts and
 * its character map only, which spell the words and place them, `todo-compile-650.md` 8.2's. The screens
 * are built in `spec.order`, so a text is drawn inline the first time they draw it there and by reference
 * to that copy afterwards, unless `spec.homes` names a copy outside them.
 */
export function buildFirmwareScreens(spec: FirmwareScreensSpec, c: Container): BuiltFirmwareScreens {
  const model = spec.wiring.model;
  const screens = firmwareScreenTemplates(model);
  if (spec.pictures.length !== screens.length || spec.order.length !== screens.length) {
    throw new ScreenRecordError(`a ${model} has ${screens.length} firmware screens and the description holds another count`);
  }
  const low = spec.wiring.variables.lowBattery;
  if (low === undefined) throw new ScreenRecordError('the wiring names no low battery variable');
  const lowBatteryExit = wiringFrontIndex(spec.wiring, 'lowBatteryExit');
  const usb = spec.usb;
  const leave = model === 'harmony-700' ? wiringFrontIndex(spec.wiring, 'usbLeave') : usb.cleared;

  // The five own key maps.
  const enterSetsFlag: [number, Instruction] = [ENTER_TAG, write(low, 1)];
  const keyMaps: Record<FirmwareKeyMap, () => Uint8Array> = {
    placeholder: () => taggedListBytes(keyMapEntries(new Map([[press(EXIT_SCAN), POP_MODE]]))),
    battery: () => taggedListBytes(keyMapEntries(new Map([enterSetsFlag]))),
    'low battery': () => taggedListBytes(keyMapEntries(new Map([enterSetsFlag, [press(EXIT_SCAN), call(lowBatteryExit)]]))),
    usb: () => taggedListBytes(keyMapEntries(new Map([
      [ENTER_TAG, call(usb.key)], [LEAVE_TAG, call(leave)],
      ...USB_STEP_SCANS.map((scan, k): [number, Instruction] => [press(scan), call(usb.steps[k] as number)]),
    ]), call(usb.key))),
    none: () => taggedListBytes([]),
  };

  // The lists "USB Connected" runs.
  const lists = new Map<number, ContainerPiece>();
  const list = (index: number, instructions: Instruction[]): void => {
    const bytes = actionListBytes(instructions);
    const was = lists.get(index);
    if (was !== undefined && was.bytes.join(',') !== bytes.join(',')) throw new ScreenRecordError(`list ${index} would hold two lists`);
    lists.set(index, { bytes, refs: [], owner: 'slot-10-list' });
  };
  list(usb.key, [USB_MARK, write(usb.variable, 1)]);
  list(usb.cleared, [USB_MARK, write(usb.variable, 0)]);
  USB_STEP_SCANS.forEach((_, k) => {
    const step = k + 1;
    list(usb.steps[k] as number, [{ opcode: LOAD, operand: LOAD_BASE | step }, call(usb.tests[k] as number)]);
    const last = k === USB_STEP_SCANS.length - 1;
    list(usb.tests[k] as number, [
      { opcode: TEST, operand: TEST_VARIABLE | usb.variable },
      last ? POP_MODE : call(usb.advances[k] as number),
      call(usb.key),
    ]);
    if (!last) list(usb.advances[k] as number, [USB_MARK, write(usb.variable, step + 1)]);
  });

  const { programOf, recordOf, inline } = recordBuilding(spec.homes);
  const built: BuiltScreen[] = new Array(screens.length);
  const empty = taggedListBytes([]);
  for (const mode of spec.order) {
    const { name, template } = screens[mode] as (typeof screens)[number];
    const pictures = spec.pictures[mode] as FirmwareScreensSpec['pictures'][number];
    let program: ContainerPiece;
    try {
      program = programOf(firmwareScreenParts(c, template, spec.fonts), [pictures.background, pictures.bar]);
    } catch (error) {
      if (error instanceof ComposeError) throw new ScreenRecordError(`${name}: ${error.message}`);
      throw error;
    }
    // Mode 0's own key map is the table after the end marker, section 311.
    built[mode] = recordOf(keyMaps[template.keys](), [program], [empty], [empty], mode === 0 ? 'key-table' : undefined);
  }
  return { screens: built, lists, inline, homes: spec.homes };
}

/** Every piece `buildFirmwareScreens` made, for a caller counting what it generated. */
export function builtFirmwarePieces(built: BuiltFirmwareScreens): ContainerPiece[] {
  return [
    ...built.screens.flatMap((one) => [one.own, ...one.programs, ...one.records, ...one.lists, one.entry]),
    ...built.lists.values(),
  ];
}

/** A layout with the firmware screens swapped for the built ones, where the configuration's sat, `withModeRecords`. */
export function withFirmwareScreens(
  layout: ContainerLayout, built: BuiltFirmwareScreens, place: FirmwareScreensDescribed['place'],
): ContainerLayout {
  return withModeRecords(layout, built, place);
}

/** What `checkFirmwareScreens` compared. */
export interface FirmwareScreensChecked {
  /** Bytes the screens hold, copies and lists included. */
  structure: number;
  screens: number;
  lists: number;
}

/**
 * The configuration's firmware screens against the ones built from its own description: described,
 * built, put back, laid out and compared byte for byte, refused with the first difference and the
 * structure it falls in. The calibration of section 357.
 */
export function checkFirmwareScreens(c: Container): FirmwareScreensChecked {
  const layout = takeApart(c);
  const d = describeFirmwareScreens(c, layout);
  assertRebuilt(layOutContainer(withFirmwareScreens(layout, buildFirmwareScreens(d.spec, c), d.place)).bytes, c, d.regions);
  return { structure: d.structure.size, screens: d.place.screens.length, lists: d.place.lists.size };
}
