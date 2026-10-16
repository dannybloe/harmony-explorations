/**
 * The Harmony One's activity screens, built rather than copied, `todo-compile-one.md` 1.2.11.2: the start up
 * screen an activity shows while it starts and the working screen it shows while it runs, with everything
 * the two need. The copying composer in `screens.ts` takes its frame from an existing activity, and the
 * configuration the One's first file is built on has none, so this builds both from what Logitech's compiles
 * were measured to hold, findings section 399: one grammar over the 64 activities of the Harmony One's
 * fifteen compiles in the lab, every byte fixed, the activity's own (its name, type, rows and their paging)
 * or the configuration's.
 *
 * **What the configuration supplies is read off it, never assumed**: its fonts by their faces, the full
 * screen background and the header work its device modes' chrome draws and queues, the timer and the
 * header list their handlers start, the screen lights' lists, the idle device list and the records keyed
 * by the activity. The rest is this module's, each with its measurement:
 *
 * * a start up screen's key map, `STARTUP_TAGS`: the press of 52 keys bound to a list that does nothing, and
 *   its three handlers, the header timer started and stopped and the header list;
 * * its hit page, one area over the screen and the two edges, and its program: the type's icon and two
 *   fixed lines under a chrome drawing "Starting" and the name;
 * * a working screen's key map, its three handlers and on a one page screen the two page turn keys bound
 *   to nothing; its handlers start the header timer and switch on light 7, and light 3 and 1 where it has
 *   several pages, and switch them off again;
 * * its hit page by how many pads the page has, its pages' lists binding the Devices key and the pads each
 *   to a list of its own that beeps first, and its pages' programs: "Devices", the pads in their boxes and
 *   their labels, and the page counter, under a chrome drawing the name and the page total.
 *
 * **Where ours departs from Logitech's, by choice**: Logitech gives each of the 52 keys of a start up screen
 * a list of its own, each the same three empty instructions, and each screen a timer and header lists of its
 * own with the same instructions as every other; ours shares one of each, which runs the same instructions.
 * It draws every text inline where Logitech's often points at a copy elsewhere. It draws no favourite
 * channels, which are refused, and not the small screen instruction Logitech's television activities carry,
 * which is unread. The activity's Devices key enters the idle device list, the one every device is on,
 * where Logitech's enters a list of the activity's own devices, which is not built yet.
 */
import { u24 } from '../../bytes.ts';
import { Writer } from '../../emit.ts';
import { type FontSet, fontSets } from '../../font.ts';
import { type Container, type Instruction, parse } from '../../gspm.ts';
import {
  activityBindings, caseQueued, compilerTagOrder, deviceModeMaps, ENTER_MODE, handlerSetRoles, MAP_VALUE_OPCODE,
  SCREEN_ITEM_BEEP,
  SELECT_BINDING_SET, SELECT_BINDING_SET_MASK, stateVariables, ACTIVITY_STATE_NAME, idleActivityValue,
} from '../../inventory.ts';
import { picturesByContent, withBankPictures } from '../../pictures.ts';
import { bitmapPixels } from '../../render.ts';
import {
  bitmapAt, bitmaps, SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_END, SCREEN_QUEUE_INSTRUCTION, SCREEN_RETURN,
  SCREEN_SELECT_FONT, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, screenProgram,
} from '../../screen.ts';
import { contentKey } from '../../screencategories.ts';
import {
  ACTION_LIST_INDEX_OPCODE, HANDLER_TAG_ENTER, handlerSets, modeRecords, modeTable, taggedList, taggedListBytes,
} from '../../sections.ts';
import { activityKeyedMaps } from '../../shared/activities.ts';
import { appendActionLists, ComposeError, restamped } from '../../shared/core.ts';
import {
  activityMenuByRows, appendValueMapCase, caseProgram, type ComposeActivityScreenOptions, type ComposedActivityScreen, type ComposeRow,
} from '../../shared/menus.ts';
import { appendMode, type ModeProgram } from '../../shared/modes.ts';
import { codesFor, textGlyphs, textWidth } from '../../shared/spelling.ts';
import type { TouchArea } from '../../tables.ts';
import { characterMap, decode } from '../../text.ts';
import { valueMaps } from '../../valuemap.ts';
import type { WithChoices } from '../family.ts';
import {
  activityIconOf, activityPadBox, colourBehind, colourUnder, STARTUP_ICON_AT, STARTUP_ICON_SIZE, startupIcon,
} from './activitypictures.ts';
import { type ExtraFontSet, fontSetOn, measureSet } from '../../fonttable.ts';
import type { LetterInks } from '../../lettering.ts';
import { TOUCH_CHOICES, type TouchChoices } from './choices.ts';
import {
  fontOfFace, padFontOf, TOUCH_PAD_HEIGHT, TOUCH_PAD_WIDTH, type TouchLabelLine, touchLabelLength, touchLabelLines,
} from './labels.ts';
import { DEVICE_PAGE_SLOTS, MENU_COUNTER_XY, MENU_EDGE_SCANS, MODE_TITLE_X, MODE_TITLE_Y, pagingStyle, withHitPage } from './menus.ts';

/** The screen is this wide, in pixels. */
const SCREEN_WIDTH = 176;

/**
 * A start up screen's key map, in Logitech's stored order: the press of 52 keys, each bound to a list that
 * does nothing, and three handlers, tag `0x06` on entering the screen, `0x07` on leaving it and `0x2D` for
 * its header. The same 55 tags in the same order on all 63 start up screens of the Harmony One's compiles.
 */
const STARTUP_TAGS: readonly number[] = [
  0x89, 0x88, 0x8b, 0x8a, 0x8d, 0x8c, 0x06, 0x8f, 0x07, 0x8e, 0x81, 0x83, 0x82, 0x85, 0x84, 0x87, 0x86,
  0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f, 0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97,
  0xab, 0xa8, 0xaf, 0xae, 0xad, 0xac, 0xa3, 0xa2, 0xa1, 0xa0, 0xa7, 0xa6, 0xa5, 0x2d, 0xa4,
  0xb2, 0xb3, 0xb0, 0xb1, 0xb7, 0xb4, 0xb5,
];
const TAG_ENTERING = 0x06;
const TAG_LEAVING = 0x07;
const TAG_HEADER = 0x2d;
const PRESS = 0x80;

/** The `0x1F` band's timer sub opcodes, `actions.ts`: start the timer the low byte names, and cancel it. */
const TIMER_START = 0xeb00;
const TIMER_CANCEL = 0xea00;
const STATE_BAND = 0x1f;

/** The list every key of a start up screen runs: three empty instructions, as Logitech's each are. */
const NOTHING: readonly (readonly [number, number])[] = [[0, 0], [0, 0], [0, 0]];

/**
 * The hit areas of the two screens, in the panel's own coordinates, measured on all 64 activities: a start
 * up screen offers one area over the screen, 48, and the two edges; a working screen offers the Devices key,
 * 48, then a pad's area for each pad the page draws, in the order the pads fill the six places, then the
 * two edges. A page of no pad offers the Devices key and the edges.
 */
const STARTUP_AREA: Omit<TouchArea, 'self' | 'address'> = { x: 1257, width: 2791, y: 885, height: 2470, code: 48 };
const DEVICES_AREA: Omit<TouchArea, 'self' | 'address'> = { x: 2406, width: 1150, y: 271, height: 1001, code: 48 };
const EDGE_AREAS: readonly Omit<TouchArea, 'self' | 'address'>[] = [
  { x: 765, width: 492, y: 1400, height: 2000, code: MENU_EDGE_SCANS[0] },
  { x: 3556, width: 492, y: 1400, height: 2000, code: MENU_EDGE_SCANS[1] },
];
/** A pad's area and the key code it reports, in the order the pads fill `DEVICE_PAGE_SLOTS`. */
const PAD_HITS: readonly Omit<TouchArea, 'self' | 'address'>[] = [
  { x: 1257, width: 1284, y: 3016, height: 807, code: 49 },
  { x: 2422, width: 1134, y: 3016, height: 807, code: 50 },
  { x: 1257, width: 1284, y: 2144, height: 807, code: 51 },
  { x: 2422, width: 1134, y: 2144, height: 807, code: 52 },
  { x: 1257, width: 1284, y: 1272, height: 807, code: 53 },
  { x: 2422, width: 1134, y: 1272, height: 807, code: 43 },
];
const DEVICES_SCAN = DEVICES_AREA.code;

/** Where the texts go, measured on all 64: the start up title's row and the two fixed lines'. */
const STARTUP_TITLE_Y = 124;
const STARTUP_LINES: readonly (readonly [string, number])[] = [['Keep the remote pointed at', 179], ['your system.', 191]];
const STARTUP_TITLE_WORD = 'Starting';
/** The picture of the remote's signal a start up screen's chrome draws, 62 by 33, and where. */
const SIGNAL_SIZE: readonly [number, number] = [62, 33];
const SIGNAL_AT: readonly [number, number] = [57, 33];
/** "Devices" under the right half of the screen: centred on x 132, on row 202. */
const DEVICES_WORD = 'Devices';
const DEVICES_CENTRE_TWICE = 264;
const DEVICES_Y = 202;
/** The page counter: a page's number ends at the slash, both on row 18, and the chrome draws the total. */
const COUNTER_SLASH_X = 18;
const COUNTER_Y = 18;
const TOTAL_X = 23;
const TOTAL_WORD_X = 35;

/** The faces each text is drawn in, all 64: `fonttable.ts` names them. */
const STARTUP_TITLE_FACE = 'One15';
const STARTUP_LINE_FACE = 'OneR15';

const pressOf = (scan: number): number => PRESS | scan;

/** A text as a program draws it: the font in force, where, and the glyph codes. */
interface Drawn {
  font: number;
  x: number;
  y: number;
  text: string;
}

/** The texts a program draws, with their fonts, following its calls one level. */
function drawnTexts(c: Container, address: number): Drawn[] {
  const map = characterMap(c);
  const out: Drawn[] = [];
  let font: number | undefined;
  const walk = (at: number, depth: number): void => {
    for (const one of screenProgram(c, at) ?? []) {
      if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0];
      if (one.opcode === SCREEN_CALL && depth === 0) walk(u24(one.operands, 0), 1);
      if ((one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT) && font !== undefined && map !== undefined) {
        const glyphs = textGlyphs(c, one);
        if (glyphs !== undefined) out.push({ font, x: one.operands[0] as number, y: one.operands[1] as number, text: decode(glyphs, map) });
      }
    }
  };
  walk(address, 0);
  return out;
}

/** What the configuration's own device modes draw and run for their header, read off them all. */
interface DeviceHeader {
  /** The full screen picture their chrome draws first. */
  background: number;
  /** The two instructions their chrome queues, the first before the page total and the second after. */
  queued: readonly [Instruction, Instruction];
  /** The timer their entering handler starts, which refreshes the header. */
  timer: number;
  /** The list their header handler runs. */
  header: number;
}

/**
 * The header of the configuration's device modes, from every one whose chrome queues two instructions,
 * which is every mode Logitech's compiler wrote; they have to agree. A device page of ours draws no header
 * work and is passed over.
 */
function deviceHeader(c: Container): DeviceHeader {
  const records = modeRecords(c) ?? [];
  const lists = c.actionLists() ?? [];
  const found = new Map<string, DeviceHeader>();
  for (const mode of new Set(deviceModeMaps(c).map((one) => one.mode))) {
    const record = records[mode];
    const page = record?.pages[0];
    const call = page === undefined ? undefined : screenProgram(c, page.program)?.[0];
    const chrome = call?.opcode === SCREEN_CALL ? u24(call.operands, 0) : undefined;
    if (record === undefined || chrome === undefined) continue;
    const program = screenProgram(c, chrome) ?? [];
    const queued = program.filter((one) => one.opcode === SCREEN_QUEUE_INSTRUCTION).map((one) => ({
      operand: (one.operands[0] as number) | ((one.operands[1] as number) << 8), opcode: one.operands[2] as number,
    }));
    const background = program.find((one) => one.opcode === SCREEN_DRAW_IMAGE && one.operands[0] === 0 && one.operands[1] === 0);
    const entering = record.entries.find((one) => one.tag === TAG_ENTERING);
    const header = record.entries.find((one) => one.tag === TAG_HEADER);
    const timer = entering?.opcode === ACTION_LIST_INDEX_OPCODE
      ? lists[entering.operand]?.find((one) => one.opcode === STATE_BAND && (one.operand & 0xff00) === TIMER_START)
      : undefined;
    if (queued.length !== 2 || background === undefined || timer === undefined
        || header?.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
    const one: DeviceHeader = {
      background: u24(background.operands, 2),
      queued: [queued[0] as Instruction, queued[1] as Instruction], timer: timer.operand & 0xff, header: header.operand,
    };
    // Logitech gives every mode a list of its own for what the chrome queues and the header runs, the same
    // instructions in each, so two modes agree when their lists hold the same instructions.
    const body = (one_: Instruction): unknown => (one_.opcode === ACTION_LIST_INDEX_OPCODE ? lists[one_.operand] : one_);
    const key = JSON.stringify({
      ...one, background: contentKeyAt(c, one.background), queued: one.queued.map(body), header: lists[one.header],
    });
    if (!found.has(key)) found.set(key, one);
  }
  if (found.size !== 1) {
    throw new ComposeError(`the device modes' chromes read as ${found.size} different headers, not one`);
  }
  return [...found.values()][0] as DeviceHeader;
}

function backgroundPixels(c: Container, address: number): (number | undefined)[][] {
  const background = bitmapAt(c, address);
  const pixels = background === undefined ? undefined : bitmapPixels(c, background);
  if (pixels === undefined) throw new ComposeError('the device pages\' background does not decode');
  return pixels;
}

/** The colour of the background behind the six pad places, which the pad box's corners are smoothed against. */
function padsBehind(pixels: readonly (readonly (number | undefined)[])[]): number {
  return colourBehind(pixels, DEVICE_PAGE_SLOTS.map(([x, y]) => [x, y, TOUCH_PAD_WIDTH, TOUCH_PAD_HEIGHT] as const));
}

/** Where the start up screen draws its title, the whole width since it is centred, the face's 15 pixels high. */
const STARTUP_TITLE_AREA: readonly [number, number, number, number] = [0, STARTUP_TITLE_Y, SCREEN_WIDTH, 15];

/** The one colour of the background under the start up screen's title, which its letters are smoothed against. */
function startupBehind(c: Container): number {
  return colourUnder(backgroundPixels(c, deviceHeader(c).background), [STARTUP_TITLE_AREA]);
}

/**
 * Every font set the Harmony One's activity screens of ours draw in that a font step has to add, `ExtraFontSet`:
 * the start up screen's title in `startTitleWeight`, a copy of a set the configuration draws elsewhere in its
 * face's own weight, smoothed against the black it is drawn on. The labels on our boxes need none, since the
 * blending step letters them lighter, `touchLabelWeight`; the title shares black with texts that stay as they are.
 */
export function touchActivityFonts(c: Container, choices: TouchChoices): ExtraFontSet[] {
  return [
    { like: fontOfFace(c, STARTUP_TITLE_FACE), weight: choices.startTitleWeight, background: startupBehind(c) },
    { like: pagingStyle(c).counterFont, background: counterBehind(c), inks: titleInks(c) },
  ];
}

/** Where a page's count is drawn, its number, slash, total and word, the header's row at the counter's height. */
const COUNTER_AREA: readonly [number, number, number, number] = [0, MENU_COUNTER_XY[1], SCREEN_WIDTH, 11];

/** The one colour under the header's page count, which the count's letters are smoothed against. */
function counterBehind(c: Container): number {
  return colourUnder(backgroundPixels(c, deviceHeader(c).background), [COUNTER_AREA]);
}

/** The inks the activity title is drawn in, which a page count in the title's colour is lettered in. */
function titleInks(c: Container): LetterInks {
  const map = characterMap(c);
  const set = (fontSets(c) ?? [])[activityTitleFont(c)];
  if (map === undefined || set === undefined) throw new ComposeError('the activity title\'s font does not read');
  const measured = measureSet(c, set, map);
  return { shadowed: measured.ink, plain: measured.ink, shadow: measured.shadow ?? measured.ink };
}

/**
 * The font a device mode's header draws its page count in: the copy of the count's own font in the activity
 * title's colour that `touchActivityFonts` adds, so the count reads as the title does, asked for on 16 October
 * 2026 since a small orange or green on black is hard to read; undefined where the configuration has none.
 */
export function headerCounterFont(c: Container): number | undefined {
  return fontSetOn(c, pagingStyle(c).counterFont, undefined, counterBehind(c), titleInks(c));
}

/**
 * The colour the pad box of a working screen of this configuration is drawn over, read off the background its
 * device modes' chrome draws: what tells our pad box from Logitech's, since the box is smoothed against it.
 */
export function activityPadBehind(c: Container): number {
  return padsBehind(backgroundPixels(c, deviceHeader(c).background));
}

function contentKeyAt(c: Container, address: number): string {
  const bitmap = bitmapAt(c, address);
  const at = c.blobOffsetOf(address);
  if (bitmap?.length === undefined || at === undefined) throw new ComposeError(`no picture at ${address.toString(16)}`);
  return contentKey(c.blob.subarray(at, at + bitmap.length));
}

/**
 * The list switching on or off the screen lights `lights`, in that order: the `0x3F` band's `0xC0` sub
 * opcode once per light, its number in the high nibble of the low byte and 2 for on or 0 for off in the
 * low, then the light's state variable written 1 or 0. Logitech's compiles hold one of each, and the
 * activity screens run them: light 7 always, 3 and 1 where a screen has several pages, 5 with favourites.
 */
function lightList(c: Container, lights: readonly number[], on: boolean): number {
  const lists = c.actionLists() ?? [];
  const found = lists.flatMap((list, k) => {
    if (list.length !== lights.length + 1) return [];
    const ok = lights.every((light, n) => list[n]?.opcode === 0x3f && list[n]?.operand === (0xc000 | (light << 4) | (on ? 2 : 0)));
    const last = list[lights.length] as Instruction;
    return ok && last.opcode >= 0x80 && last.operand === (on ? 1 : 0) ? [k] : [];
  });
  if (found.length !== 1) {
    throw new ComposeError(`the config holds ${found.length} lists switching light ${lights.join(' and ')} ${on ? 'on' : 'off'}, not one`);
  }
  return found[0] as number;
}

/** The first list holding exactly `body`, or undefined. */
function listOf(c: Container, body: readonly (readonly [number, number])[]): number | undefined {
  const k = (c.actionLists() ?? []).findIndex((list) => list.length === body.length
    && list.every((one, n) => one.operand === (body[n] as readonly [number, number])[0] && one.opcode === (body[n] as readonly [number, number])[1]));
  return k < 0 ? undefined : k;
}

/** What the idle key map runs that a composed activity needs: the running flag's variable and scan 55's list. */
interface IdleParts {
  /** The variable written 0 by the list the idle key map's entering list calls with `0x07` band `0xFF` first. */
  flag: number;
  /** The list the idle key map binds scan 55 to, which enters the idle device list. */
  scan55: number;
}

/** The "an activity is running" list's first instruction, `0x07` band `0xFF`, and the flag write after it. */
const RUNNING_FIRST = { opcode: 0x07, operand: 0xffff } as const;
const SCAN_DEVICES_KEY = 55;

function idleParts(c: Container): IdleParts {
  const sets = handlerSets(c);
  const lists = c.actionLists() ?? [];
  if (sets === undefined) throw new ComposeError('base slot 9 does not read');
  const roles = handlerSetRoles(c);
  const flags = new Set<number>();
  const scan55 = new Set<number>();
  sets.addresses.forEach((address, k) => {
    if (roles[k] !== 'idle') return;
    const entries = taggedList(c, address)?.entries ?? [];
    const enter = entries.find((one) => one.tag === HANDLER_TAG_ENTER);
    for (const one of enter?.opcode === ACTION_LIST_INDEX_OPCODE ? lists[enter.operand] ?? [] : []) {
      const called = one.opcode === ACTION_LIST_INDEX_OPCODE ? lists[one.operand] : undefined;
      if (called?.length === 2 && called[0]?.opcode === RUNNING_FIRST.opcode && called[0]?.operand === RUNNING_FIRST.operand
          && (called[1] as Instruction).opcode >= 0x80 && called[1]?.operand === 0) {
        flags.add((called[1] as Instruction).opcode - 0x80);
      }
    }
    const key = entries.find((one) => one.tag === pressOf(SCAN_DEVICES_KEY));
    if (key?.opcode === ACTION_LIST_INDEX_OPCODE) scan55.add(key.operand);
  });
  if (flags.size !== 1 || scan55.size !== 1) {
    throw new ComposeError(`the idle key maps clear ${flags.size} running flags and bind scan 55 to ${scan55.size} lists, not one each`);
  }
  return { flag: [...flags][0] as number, scan55: [...scan55][0] as number };
}

const inlineLength = (codes: readonly number[]): number => 3 + codes.length + 1;
function inline(out: Writer, x: number, y: number, codes: readonly number[]): void {
  out.u8(SCREEN_TEXT_INLINE).u8(x).u8(y);
  codes.forEach((code) => out.u8(code));
  out.u8(0);
}

/**
 * The Harmony One's half of `composeActivityScreen`, building both screens rather than copying them off an
 * existing activity. The activity's value must be the next one; its handler set is predicted as the next
 * base slot 9 entry, which `composeActivity` checks.
 */
export function buildTouchActivityScreens(
  c: Container, activity: number, label: string, rows: readonly ComposeRow[],
  options: WithChoices<ComposeActivityScreenOptions, TouchChoices> = {},
): ComposedActivityScreen {
  const choices = options.choices ?? TOUCH_CHOICES;
  if (options.startupLike !== undefined) {
    throw new ComposeError('a built start up screen draws the type\'s icon, so there is no other activity\'s to show');
  }
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  const idle = idleActivityValue(c);
  if (counter === undefined || idle === undefined) throw new ComposeError(`no ${ACTIVITY_STATE_NAME} variable`);
  const bindings = activityBindings(c);
  const values = [...new Set(bindings.map((one) => one.activity))];
  if (values.includes(activity)) throw new ComposeError(`activity ${activity} already has a working screen`);
  const keyed = activityKeyedMaps(c, counter.index, idle, values, new Map(bindings.map((one) => [one.activity, one.set])));
  if (keyed.select === undefined) throw new ComposeError('the config holds no keypad map record to add the activity to');
  const sets = handlerSets(c);
  if (sets === undefined) throw new ComposeError('base slot 9 does not read');
  const set = sets.addresses.length;

  // The configuration's own parts, refused before anything moves.
  const header = deviceHeader(c);
  const idle_ = idleParts(c);
  const devicesMode = (() => {
    const modes = new Set(keyed.devices.map((index) => {
      const entry = valueMapEntry(c, index, idle);
      return entry === undefined ? undefined : caseQueued(c, entry)?.operand;
    }));
    const only = [...modes][0];
    if (modes.size !== 1 || only === undefined) throw new ComposeError('the records under Devices do not agree on the idle device list');
    return only;
  })();
  const lights = {
    on: lightList(c, [7], true), off: lightList(c, [7], false),
    pagedOn: lightList(c, [3, 1], true), pagedOff: lightList(c, [3, 1], false),
  };
  const fonts = {
    // In the lighter copy our font step added for it, `touchActivityFonts`, and in the face's own set otherwise.
    startTitle: (() => {
      const like = fontOfFace(c, STARTUP_TITLE_FACE);
      return fontSetOn(c, like, choices.startTitleWeight, startupBehind(c)) ?? like;
    })(),
    startLines: fontOfFace(c, STARTUP_LINE_FACE),
    title: activityTitleFont(c),
    devices: devicesFont(c, devicesMode),
    pad: padFontOf(c),
  };
  if (fonts.pad === undefined) throw new ComposeError('no device page shows which font a pad is drawn in');
  const setOf = (font: number): FontSet => {
    const one = (fontSets(c) ?? [])[font];
    if (one === undefined) throw new ComposeError(`the config does not carry font ${font}`);
    return one;
  };
  const spelled = (font: number, text: string): number[] => codesFor(map, c, setOf(font), text, font);
  const width = (font: number, codes: readonly number[]): number => textWidth(c, setOf(font), codes);

  // The texts, all laid out now, against the fonts as they are: nothing below changes a glyph.
  const startTitle = spelled(fonts.startTitle, `${STARTUP_TITLE_WORD} ${label}`);
  const startTitleWidth = width(fonts.startTitle, startTitle);
  if (startTitleWidth > SCREEN_WIDTH) {
    throw new ComposeError(`'${STARTUP_TITLE_WORD} ${label}' is ${startTitleWidth} pixels wide and the start up screen ${SCREEN_WIDTH}`);
  }
  const startTitleX = Math.floor((SCREEN_WIDTH - startTitleWidth) / 2);
  const startLines = STARTUP_LINES.map(([text, y]) => {
    const codes = spelled(fonts.startLines, text);
    return { codes, x: Math.floor((SCREEN_WIDTH - width(fonts.startLines, codes)) / 2), y };
  });
  const title = spelled(fonts.title, label);
  const titleRoom = SCREEN_WIDTH - MODE_TITLE_X;
  if (width(fonts.title, title) > titleRoom) {
    throw new ComposeError(`'${label}' is ${width(fonts.title, title)} pixels wide and the working screen's title holds ${titleRoom}`);
  }
  const devicesWord = spelled(fonts.devices, DEVICES_WORD);
  const devicesX = Math.floor((DEVICES_CENTRE_TWICE - width(fonts.devices, devicesWord)) / 2);
  const perPage = PAD_HITS.length;
  const pageRows = rows.length === 0 ? [[]] as ComposeRow[][]
    : Array.from({ length: Math.ceil(rows.length / perPage) }, (_, p) => rows.slice(p * perPage, (p + 1) * perPage));
  const paged = pageRows.length > 1;
  if (pageRows.length > 9) throw new ComposeError('a page counter of two digits is not composed');
  const paging = paged ? pagingStyle(c) : undefined;
  const padSet = setOf(fonts.pad);
  const labels = pageRows.map((onPage) => onPage.map((row, k) => {
    const [x, y] = DEVICE_PAGE_SLOTS[k] as readonly [number, number];
    return touchLabelLines(c, map, padSet, fonts.pad as number, row.label, { x, y });
  }));
  const counter_ = paging === undefined ? undefined : {
    total: codesFor(map, c, setOf(paging.totalFont), String(pageRows.length), paging.totalFont),
    word: codesFor(map, c, setOf(paging.totalFont), paging.word, paging.totalFont),
    slash: codesFor(map, c, setOf(paging.counterFont), '/', paging.counterFont),
    numbers: pageRows.map((_, p) => codesFor(map, c, setOf(paging.counterFont), String(p + 1), paging.counterFont)),
  };
  const existing = c.actionLists()?.length ?? 0;
  for (const row of rows) {
    if (!Number.isInteger(row.list) || row.list < 0 || row.list >= existing) {
      throw new ComposeError(`'${row.label}' names list ${row.list} of ${existing} that exist`);
    }
  }
  const signal = bitmaps(c).filter((one) => one.stride === SIGNAL_SIZE[0] && one.rows === SIGNAL_SIZE[1]);
  const signals = new Set(signal.map((one) => contentKeyAt(c, one.address)));
  if (signals.size !== 1) throw new ComposeError(`the config holds ${signals.size} pictures of the remote's signal, not one`);
  const signalKey = [...signals][0] as string;

  // 1. Our pictures, in the bank: the pad box and the type's icon over the background where it goes.
  const pixels = backgroundPixels(c, header.background);
  const [ix, iy] = STARTUP_ICON_AT;
  const under = pixels.slice(iy, iy + STARTUP_ICON_SIZE[1]).map((row) => row.slice(ix, ix + STARTUP_ICON_SIZE[0]));
  const padBox = activityPadBox(choices.activityBox, padsBehind(pixels));
  const icon = startupIcon(activityIconOf(choices, options.type), under, choices.activityIconGrid.startup);
  const backgroundKey = contentKeyAt(c, header.background);
  let current = withBankPictures(c, [padBox, icon]).container;
  const pictureOf = (now: Container, key: string): number => {
    const address = picturesByContent(now).get(key)?.[0];
    if (address === undefined) throw new ComposeError('a picture the screens draw left the bank');
    return address;
  };

  // 2. The lists: the empty one every start up key runs, the running list, the Devices key's and each pad's,
  // and the working screen's two handlers. Each found where the configuration has it, appended otherwise.
  const bodies: (readonly (readonly [number, number])[])[] = [];
  const index = (body: readonly (readonly [number, number])[], share: boolean): number => {
    const found = share ? listOf(current, body) : undefined;
    if (found !== undefined) return found;
    const at = bodies.findIndex((one) => JSON.stringify(one) === JSON.stringify(body));
    if (share && at >= 0) return existing + at;
    bodies.push(body);
    return existing + bodies.length - 1;
  };
  const nothing = index(NOTHING, true);
  const running = index([[RUNNING_FIRST.operand, RUNNING_FIRST.opcode], [1, 0x80 + idle_.flag]], true);
  const beep = [SCREEN_ITEM_BEEP.operand, SCREEN_ITEM_BEEP.opcode] as const;
  const devicesKey = index([beep, [devicesMode, ENTER_MODE]], false);
  const pads = rows.map((row) => index([beep, [row.list, ACTION_LIST_INDEX_OPCODE]], false));
  const entering = index([[TIMER_START | header.timer, STATE_BAND], [lights.on, ACTION_LIST_INDEX_OPCODE],
    ...(paged ? [[lights.pagedOn, ACTION_LIST_INDEX_OPCODE] as const] : [])], false);
  const leaving = index([[TIMER_CANCEL | header.timer, STATE_BAND], [lights.off, ACTION_LIST_INDEX_OPCODE],
    [lights.pagedOff, ACTION_LIST_INDEX_OPCODE]], false);
  if (bodies.length > 0) {
    const appended = appendActionLists(current, bodies.map((body) => body.map(([operand, opcode]) => [operand, opcode] as [number, number])));
    if (appended.first !== existing) throw new ComposeError(`the lists went in at ${appended.first}, not ${existing}`);
    current = parse(appended.bytes);
  }

  // 3. The hit pages: the start up screen's, and the working screen's for each page's number of pads.
  const area = (one: Omit<TouchArea, 'self' | 'address'>): readonly [number, TouchArea] =>
    [one.code, { ...one, self: 0, address: 0 }] as const;
  const startHit = withHitPage(current, [area(STARTUP_AREA), ...EDGE_AREAS.map(area)]);
  current = startHit.container;
  const workingLeads: number[] = [];
  for (const onPage of pageRows) {
    const made = withHitPage(current, [area(DEVICES_AREA), ...PAD_HITS.slice(0, onPage.length).map(area), ...EDGE_AREAS.map(area)]);
    current = made.container;
    workingLeads.push(made.lead);
  }

  // 4. The start up screen.
  const table = modeTable(current);
  if (table === undefined) throw new ComposeError('base slot 6 states no table');
  const startupMode = table.addresses.length;
  const mode = startupMode + 1;
  const startupOwn = STARTUP_TAGS.map((tag) => {
    if (tag === TAG_ENTERING) return { tag, operand: TIMER_START | header.timer, opcode: STATE_BAND };
    if (tag === TAG_LEAVING) return { tag, operand: TIMER_CANCEL | header.timer, opcode: STATE_BAND };
    if (tag === TAG_HEADER) return { tag, operand: header.header, opcode: ACTION_LIST_INDEX_OPCODE };
    return { tag, operand: nothing, opcode: ACTION_LIST_INDEX_OPCODE };
  });
  const queue = (out: Writer, one: Instruction): void => {
    out.u8(SCREEN_QUEUE_INSTRUCTION).u16(one.operand).u8(one.opcode);
  };
  current = appendMode(current, startupMode, startupOwn, [taggedListBytes([])], (now, chromeAt) => {
    const startChrome: ModeProgram = {
      length: 2 + inlineLength(startTitle) + 6 + 4 + 4 + 6 + 6 + 1 + 1,
      build: (shifted) => {
        const out = new Writer(startChrome.length);
        out.u8(SCREEN_SELECT_FONT).u8(fonts.startTitle);
        inline(out, startTitleX, STARTUP_TITLE_Y, startTitle);
        out.u8(SCREEN_DRAW_IMAGE).u8(0).u8(0).u24(shifted(pictureOf(now, backgroundKey)));
        queue(out, header.queued[0]);
        queue(out, header.queued[1]);
        out.u8(SCREEN_DRAW_IMAGE).u8(SIGNAL_AT[0]).u8(SIGNAL_AT[1]).u24(shifted(pictureOf(now, signalKey)));
        out.u8(SCREEN_TEXT_AT).u8(startTitleX).u8(STARTUP_TITLE_Y).u24(chromeAt + 2 + 3);
        out.u8(SCREEN_RETURN).u8(SCREEN_END);
        return out.bytes;
      },
    };
    const page: ModeProgram = {
      length: 4 + 6 + 2 + startLines.reduce((sum, one) => sum + inlineLength(one.codes), 0) + 1,
      build: (shifted) => {
        const out = new Writer(page.length);
        out.u8(SCREEN_CALL).u24(chromeAt);
        out.u8(SCREEN_DRAW_IMAGE).u8(ix).u8(iy).u24(shifted(pictureOf(now, contentKey(icon))));
        out.u8(SCREEN_SELECT_FONT).u8(fonts.startLines);
        for (const one of startLines) inline(out, one.x, one.y, one.codes);
        out.u8(SCREEN_END);
        return out.bytes;
      },
    };
    return { head: startChrome, pages: [page] };
  }, { leads: [startHit.lead] });

  // 5. The working screen.
  const workingOwn = [
    ...(paged ? [] : [...MENU_EDGE_SCANS].reverse().map((scan) => ({ tag: pressOf(scan), operand: 0, opcode: 0 }))),
    { tag: TAG_ENTERING, operand: entering, opcode: ACTION_LIST_INDEX_OPCODE },
    { tag: TAG_LEAVING, operand: leaving, opcode: ACTION_LIST_INDEX_OPCODE },
    { tag: TAG_HEADER, operand: header.header, opcode: ACTION_LIST_INDEX_OPCODE },
  ];
  // Each page's list binds the Devices key and its pads, stored in the compiler's case order, all 64.
  let padAt = 0;
  const pageLists = pageRows.map((onPage) => {
    const bound = new Map<number, number>([[pressOf(DEVICES_SCAN), devicesKey]]);
    onPage.forEach((_, k) => bound.set(pressOf((PAD_HITS[k] as { code: number }).code), pads[padAt + k] as number));
    padAt += onPage.length;
    return taggedListBytes(compilerTagOrder([...bound.keys()])
      .map((tag) => ({ tag, operand: bound.get(tag) as number, opcode: ACTION_LIST_INDEX_OPCODE })));
  });
  current = appendMode(current, mode, workingOwn, pageLists, (now, chromeAt) => {
    const chrome: ModeProgram = {
      length: 2 + inlineLength(title) + 6 + 4
        + (counter_ === undefined ? 0 : 2 + inlineLength(counter_.total) + inlineLength(counter_.word))
        + 4 + (counter_ === undefined ? 0 : 2) + 6 + 1 + 1,
      build: (shifted) => {
        const out = new Writer(chrome.length);
        out.u8(SCREEN_SELECT_FONT).u8(fonts.title);
        inline(out, MODE_TITLE_X, MODE_TITLE_Y, title);
        out.u8(SCREEN_DRAW_IMAGE).u8(0).u8(0).u24(shifted(pictureOf(now, backgroundKey)));
        queue(out, header.queued[0]);
        if (counter_ !== undefined && paging !== undefined) {
          out.u8(SCREEN_SELECT_FONT).u8(paging.totalFont);
          inline(out, TOTAL_X, COUNTER_Y, counter_.total);
          inline(out, TOTAL_WORD_X, COUNTER_Y, counter_.word);
        }
        queue(out, header.queued[1]);
        if (counter_ !== undefined) out.u8(SCREEN_SELECT_FONT).u8(fonts.title);
        out.u8(SCREEN_TEXT_AT).u8(MODE_TITLE_X).u8(MODE_TITLE_Y).u24(chromeAt + 2 + 3);
        out.u8(SCREEN_RETURN).u8(SCREEN_END);
        return out.bytes;
      },
    };
    const pages = pageRows.map((onPage, p): ModeProgram => {
      const lines = labels[p] as TouchLabelLine[][];
      const number = counter_?.numbers[p];
      const length = 4 + 2 + inlineLength(devicesWord)
        + onPage.reduce((sum, _, k) => sum + 6 + 2 + touchLabelLength(lines[k] as TouchLabelLine[]), 0)
        + (counter_ === undefined || number === undefined ? 0 : 2 + inlineLength(number) + inlineLength(counter_.slash)) + 1;
      return {
        length,
        build: (shifted) => {
          const out = new Writer(length);
          out.u8(SCREEN_CALL).u24(chromeAt);
          out.u8(SCREEN_SELECT_FONT).u8(fonts.devices);
          inline(out, devicesX, DEVICES_Y, devicesWord);
          const box = shifted(pictureOf(now, contentKey(padBox)));
          onPage.forEach((_, k) => {
            const [x, y] = DEVICE_PAGE_SLOTS[k] as readonly [number, number];
            out.u8(SCREEN_DRAW_IMAGE).u8(x).u8(y).u24(box);
            // A select per label, not one after the first box as Logitech's, so each label is smoothed
            // against what is behind it alone, `colourbuttons.ts`.
            out.u8(SCREEN_SELECT_FONT).u8(fonts.pad as number);
            for (const line of lines[k] as TouchLabelLine[]) inline(out, line.x, line.y, line.codes);
          });
          if (counter_ !== undefined && number !== undefined && paging !== undefined) {
            out.u8(SCREEN_SELECT_FONT).u8(paging.counterFont);
            inline(out, COUNTER_SLASH_X - width(paging.counterFont, number), COUNTER_Y, number);
            inline(out, COUNTER_SLASH_X, COUNTER_Y, counter_.slash);
          }
          out.u8(SCREEN_END);
          return out.bytes;
        },
      };
    });
    return { head: chrome, pages };
  }, { leads: workingLeads });

  // 6. The activity's cases: its working screen, its device list under Devices, its keypad map.
  current = appendValueMapCase(current, keyed.working, activity, caseProgram(ENTER_MODE, mode));
  for (const index_ of keyed.devices) current = appendValueMapCase(current, index_, activity, caseProgram(ENTER_MODE, devicesMode));
  current = appendValueMapCase(current, keyed.select, activity, caseProgram(SELECT_BINDING_SET, SELECT_BINDING_SET_MASK | set));

  return {
    bytes: restamped(current.blob), activity, mode, startupMode, activeList: running, map: keyed.working,
    devicesList: devicesKey, scans: rows.map((_, k) => (PAD_HITS[k % perPage] as { code: number }).code), set,
    keys: [{ scan: SCAN_DEVICES_KEY, list: idle_.scan55 }],
  };
}

/** The case program `record` names for `key`, or undefined. */
function valueMapEntry(c: Container, record: number, key: number): number | undefined {
  return valueMaps(c)?.[record]?.entries.find(([one]) => one === key)?.[1];
}

/**
 * The font an activity's title is drawn in at the working screen's corner: the font the activity menu's own
 * header draws its title in. Measured on the fifteen Harmony One compiles, findings section 399: the working
 * screens' title font is the menu header's on 15 of 15 and the device pages' on none. A font carries its
 * colour in its glyphs, so taking the device pages' drew the title in their colour rather than the menu's.
 */
export function activityTitleFont(c: Container): number {
  const menu = touchActivityMenu(c);
  const first = menu === undefined ? undefined : modeRecords(c)?.[menu]?.pages[0];
  const title = first === undefined ? undefined
    : drawnTexts(c, first.program).find((one) => one.x === MODE_TITLE_X && one.y === MODE_TITLE_Y);
  if (title === undefined) throw new ComposeError('the activity menu draws no title to take the activity title\'s font from');
  return title.font;
}

/**
 * The font "Devices" is drawn in: the font the idle device list's own page draws it in, where every
 * configuration with a device draws the word, measured on the 64 activities' working screens, which draw it
 * in that font on all of them.
 */
function devicesFont(c: Container, devicesMode: number): number {
  const fonts = new Set<number>();
  for (const page of modeRecords(c)?.[devicesMode]?.pages ?? []) {
    for (const one of drawnTexts(c, page.program)) if (one.text === DEVICES_WORD) fonts.add(one.font);
  }
  for (const record of modeRecords(c) ?? []) {
    if (fonts.size > 0) break;
    for (const page of record.pages) for (const one of drawnTexts(c, page.program)) if (one.text === DEVICES_WORD && one.y === DEVICES_Y) fonts.add(one.font);
  }
  if (fonts.size !== 1) throw new ComposeError(`the config draws "${DEVICES_WORD}" in ${fonts.size} fonts, not one`);
  return [...fonts][0] as number;
}


/**
 * The Harmony One's activity menu, found the way the remote reaches it when no activity runs: the working
 * screen record's case for the idle value maps the location variable through a record of one case, and
 * that case enters the menu, findings section 399. On all fifteen of the Harmony One's compiles that hold
 * an activity row it is the mode `activityMenuByRows` finds, and it finds the menu on the four with no
 * activity, where the rows cannot. Where the records do not read this way, the rows decide.
 */
export function touchActivityMenu(c: Container): number | undefined {
  const counter = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  const idle = idleActivityValue(c);
  const maps = valueMaps(c);
  if (counter === undefined || idle === undefined || maps === undefined) return activityMenuByRows(c);
  // The records mapped through on the counter, wherever a `0x72` names one: a mode's key map, an action list
  // or a case's program. Read off them rather than off `activityKeyedMaps`, which wants the activities'
  // rows, and a composed activity has its screens before its row.
  const named = new Set<number>();
  const note = (one: Instruction | undefined): void => {
    if (one?.opcode === MAP_VALUE_OPCODE && (one.operand & 0xff) === counter.index) named.add(one.operand >> 8);
  };
  for (const record of modeRecords(c) ?? []) for (const entry of record.entries) note(entry);
  for (const list of c.actionLists() ?? []) for (const one of list) note(one);
  for (const map of maps) for (const [, target] of map.entries) note(caseQueued(c, target));
  const menus = new Set<number>();
  for (const index of named) {
    const idleCase = valueMapEntry(c, index, idle);
    const location = idleCase === undefined ? undefined : caseQueued(c, idleCase);
    if (location?.opcode !== MAP_VALUE_OPCODE) continue;
    const record = maps[location.operand >> 8];
    const only = record?.entries.length === 1 && record.ranges.length === 0 ? record.entries[0] : undefined;
    const enters = only === undefined ? undefined : caseQueued(c, only[1]);
    if (enters?.opcode === ENTER_MODE) menus.add(enters.operand);
  }
  return menus.size === 1 ? [...menus][0] : activityMenuByRows(c);
}
