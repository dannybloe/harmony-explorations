/**
 * The Harmony One's device lists built whole from a description: `todo-compile-one.md` 4.3.3, findings section 424,
 * through the template engine of sections 411 to 415, `screentemplate.ts`, and the hit page rules of section 417,
 * `hitpages.ts`, as the activity menu (`activitymenu.ts`, section 419) and the device pages (`devicepages.ts`,
 * section 420) are built.
 *
 * **What it is.** The list the Devices item on the touch panel opens, `reference/how-a-harmony-works.md`: every device
 * once, three to a page, a touch on a row entering that device's mode. **A Harmony One compile holds one per
 * activity, one for no activity running and one nothing enters**, section 424, so three kinds by what reaches them:
 *
 * * **the idle list**, which the Devices record's case for no activity running enters, every device once in an order
 *   this reads off the list and does not derive;
 * * **an activity's own list**, which the same record's case for that activity enters: the same devices, the ones
 *   the activity's start switches on first, in the order it switches them on, then the rest in the idle list's
 *   order, the four slot family's rule, `startSwitchedOn` in `shared/activities.ts`;
 * * **the list nothing enters**: no three bytes of the configuration name its mode as an enter would, on every
 *   compile, and the firmware was not read for it, so whether the remote ever shows it is open; the Harmony One's counterpart of the four slot family's two row list of section 326, though laid out
 *   as the others are, three rows to a page. Its rows are the idle list's.
 *
 * **One shape, measured on the eighteen English Harmony One compiles in the lab** (section 424), lists of one to
 * fifteen devices, one to five pages, and in its layout on the Dutch nineteenth:
 *
 * * **its own key map**: on a list of one page the page arrows' presses swallowed, the rail of section 275; entering
 *   it starts the header timer and calls, on a list of several pages, the page keys' pair 2 and 0, then the list
 *   lighting key 4 (section 400); leaving it cancels the timer and calls the page keys' and key 4's off lists, on a
 *   list of one page too; scan 55's press maps through a value map, bound straight on the two kinds a person reaches
 *   and, on the list nothing enters, as many times as there are other device lists: through a list of its own
 *   repeating it on the 15 compiles with an activity, bound straight on the four without; and
 *   its header handler runs three base slot 11 programs;
 * * **its chrome**, `screentemplate.ts`' `chrome`, titled "Devices", with the page total and "pages" where there are
 *   several pages;
 * * **its pages**, `DEVICE_LIST_ROWS` rows to a page and the last page short: a row is the row picture at
 *   (6, 38 + 54k), the device's icon at (11, 39 + 54k) and the device's name left aligned at x 63, in one or two
 *   lines centred on the row's label line, 19 below the row's top, 12 apart, the row font selected once a page after
 *   the first row's icon; then the left key's word: on the two kinds a person reaches a switch on whether an
 *   activity runs drawing "Activities" or "Current" over "Activity", both arms joining the page counter, and on the
 *   list nothing enters "Activities" alone and then the counter. A list of several pages draws its page's own
 *   number ending at x 18 and "/" at 18, row 18, in the counter's font. The right key has no word and no binding,
 *   section 275;
 * * **its pages' lists**: a row clicks, enters its device's mode and writes 1 to the device mode marker, section
 *   239; the left key maps through a value map, bound straight on the two kinds a person reaches and clicking first
 *   in a list of its own on the list nothing enters. Each page list's copy runs lists of its own, the same
 *   instructions, section 69;
 * * **its hit pages**, by section 417's rules: the rows as whole width buttons, then the left key, then the edges,
 *   so the codes are 48 to 50 for three rows and the left key takes the next.
 *
 * **What the description carries**: per list its kind, which is what reaches it and not a byte of it, its rows'
 * names as the lines they are drawn in, and on the list nothing enters how many times scan 55's list maps; and the
 * numbering: the mode, every list index, the device mode each row enters, the timer, the light lists, the value
 * maps, the marker and the variable the switch reads, the header and chrome programs, the pictures (the full screen
 * background and each row's picture and icon), the four fonts, each page's hit page index and the homes of texts
 * drawn by reference. **What is generated**: every opcode and constant, the tags and their stored order, every
 * list's instructions, the words "Devices", "pages", "Activities", "Current", "Activity" and the page numbers and
 * where each goes, where every name line goes, which text is inline, the records, and the hit pages' rectangles
 * and codes.
 *
 * **On the composed path**, `withTouchDeviceListRow` and `withTouchActivityDeviceList`: a device's row is put on
 * every device list by building the list again from its description with the row added, as the activity menu's row
 * is, section 419, and an activity's own list is a new mode built by this template from the idle list's description
 * with its rows in the activity's order. **Our look draws every list's rows in ours**, `devicelook.ts`: its row box
 * and the device type's icon, which the description carries as pictures like any other.
 *
 * English only, skin 54 and the European skin 59; the Dutch compile is refused by its words. The Harmony One alone,
 * the touch family's; the Harmony 600, 650 and 700 lay their device lists out in corners, section 294, built by
 * `families/four-slot/devicelist.ts`. Read only towards hardware: the result is pieces.
 */
import { u24 } from '../../bytes.ts';
import { Writer } from '../../emit.ts';
import { ACTION_LIST_TABLE_SLOT, type Container, archSlot, parse } from '../../gspm.ts';
import { type ContainerLayout, type ContainerPiece, layOutContainer, takeApart } from '../../frame.ts';
import type { PieceTarget } from '../../statetables.ts';
import { ENTER_MODE, activities, activityScreens, caseQueued } from '../../inventory.ts';
import { fillTarget, picturesByContent, withBankPictures } from '../../pictures.ts';
import { contentKey } from '../../screencategories.ts';
import { TOUCH_CHOICES, type TouchChoices } from './choices.ts';
import { ACTIVITY_ROW_SIZE, activityRowBox, activityRowIcon } from './activitypictures.ts';
import { colourBehindBackground } from './activityscreen.ts';
import { describeTouchFixedScreens } from './fixedscreens.ts';
import {
  SCREEN_CALL, SCREEN_DRAW_IMAGE, SCREEN_END, SCREEN_FILL, SCREEN_JUMP, SCREEN_RETURN, SCREEN_SWITCH_NARROW, SCREEN_TEXT_AT,
  SCREEN_TEXT_INLINE, screenProgram,
} from '../../screen.ts';
import {
  type BuiltScreen, type ModeRecordsPlace, ScreenRecordError, assertRebuilt, recordReading, withModeRecords,
} from '../../screenrecords.ts';
import { handlerSets, modePages, modeRecords, modeTable, pageListCopies, taggedList } from '../../sections.ts';
import { startSwitchedOn } from '../../shared/activities.ts';
import { appendActionLists, ComposeError, restamped } from '../../shared/core.ts';
import { appendMode } from '../../shared/modes.ts';
import { deviceListMenus } from '../../shared/menus.ts';
import { type ValueReader, blobReader, fontThatSpells, speller, textGlyphs } from '../../shared/spelling.ts';
import { TOUCH_AREA_LENGTH, touchPages } from '../../tables.ts';
import { characterMap, decode } from '../../text.ts';
import { SCREEN_ROW_PITCH } from '../../touch.ts';
import { valueMaps } from '../../valuemap.ts';
import {
  type HitPart, hitPageAreasOf, hitPageRunOf, namedHitPages, touchHitPagesPlace, whole, withTouchHitPages, withoutHitPages,
} from './hitpages.ts';
import { touchValueMapRoles } from './caseprograms.ts';
import { pagingStyle, touchMenuMarkerWriter, withHitPage } from './menus.ts';
import { pageKeysOn } from './activitymenu.ts';
import { CHROME_AND_END, type StandIn, grownList, withMenuPage } from './menupages.ts';
import {
  ARROWS, CALL, CLICK, ENTER, type Entry, HEADER, LIST, MAP, lightOff,
  type Part, type Step, TAG_ENTER, TAG_HEADER, TAG_LEAVE, TIMER_CANCEL, TIMER_START, TITLE_AT, type TemplateScreen,
  type BuiltTemplateScreens, type TemplateScreensDescribed, type TemplateScreensSpec, buildTemplateScreens, chrome, describeTemplateScreens,
  font, joinLines, leftHalf, named, owns, picture, press, templateNumberSlots, text, wrapLines, write,
} from './screentemplate.ts';

// ---------------------------------------------------------------------------------------------------------
// The shape, section 424.

/** Rows to a page, the last page short. */
export const DEVICE_LIST_ROWS = 3;

/** The list's title, the chrome's, and the left key's words, Logitech's English on every English compile. */
const TITLE = 'Devices';
const IDLE_WORD = 'Activities';
const RUNNING_WORDS = ['Current', 'Activity'] as const;
/** The rows the left key's words sit on: one line at 202, two lines at 196 and 207. */
const KEY_WORD_Y = 202;
const RUNNING_WORD_Y = [196, 207] as const;

/** Where a row draws: its picture's top left and its icon's, for the top row; each row below `SCREEN_ROW_PITCH` lower. */
const ROW_PICTURE: readonly [number, number] = [6, 38];
const ROW_ICON: readonly [number, number] = [11, 39];
/** Where a row's name starts across, and where its one line sits below the row's top; two lines sit 12 apart around it. */
const NAME_X = 63;
const NAME_DROP = 19;
const LINE_PITCH = 12;

/** A page's own number ends where the "/" starts, both on the counter's row, section 293. */
const COUNTER_Y = 18;
const SLASH_X = 18;

/** The press every device list maps through a value map in its own key map. */
const MAP_SCAN = 55;
/** The first of a hit page's content codes: a row's place on its page gives its code, section 417. */
const FIRST_CODE = 48;

/** The y of line `j` of a name of `n` lines on the row whose picture's top is `top`. */
export function deviceListLineY(top: number, n: number, j: number): number {
  return top + NAME_DROP - (LINE_PITCH / 2) * (n - 1) + LINE_PITCH * j;
}

/**
 * What reaches a device list, which is its kind: the idle list and an activity's own are reached through the Devices
 * record and switch the left key's word on whether an activity runs; the list nothing enters draws "Activities" alone
 * and clicks before its left key's map.
 */
export type DeviceListKind = 'reached' | 'unreached';

/** The fonts a device list selects, by role. */
export type DeviceListFont = 'title' | 'count' | 'row' | 'left';

/** One device list as a description gives it: what is not a number. */
export interface DeviceListShape {
  kind: DeviceListKind;
  /** Per row, in list order, the lines its device's name is drawn in. */
  rows: string[][];
  /**
   * How many times scan 55's press maps through its value map: 1 where it is bound straight, as on every reached
   * list, and on the list nothing enters once per other device list of the configuration, in a list of its own.
   */
  scan55: number;
}

/** How many pages a list of `rows` devices takes: at least one. */
export function deviceListPages(rows: number): number {
  return Math.max(1, Math.ceil(rows / DEVICE_LIST_ROWS));
}

/** The font roles a list selects: the counter's only on a list of several pages, the rows' only with a row. */
function fontRoles(shape: DeviceListShape): DeviceListFont[] {
  return ['title', 'left', ...(deviceListPages(shape.rows.length) > 1 ? ['count' as const] : []), ...(shape.rows.length > 0 ? ['row' as const] : [])];
}

/**
 * Which number of the configuration's each step of the template takes, its role, as in `activitymenu.ts`: a number
 * step's own, `named`, and every list step and state write by this table. A list of the list's own is walked twice on
 * a page, in the page list and in its copy, and the copy's takes the role with " copy" after it. Module local, since
 * the constant steps tagged here are shared with other modules, which never see this table.
 */
const ROLE = new WeakMap<Step, string>();
const roled = <S extends Step>(step: S, role: string): S => {
  ROLE.set(step, role);
  return step;
};
/** An off list's state write, the last step of `[3F C0a0, 3F C0b0, write 0]` and of the one light form. */
const offWrite = (list: Step): Step => {
  if (list.kind !== 'owns') throw new ScreenRecordError('an off list is a list of its own');
  return list.steps[list.steps.length - 1] as Step;
};

/**
 * The lists switching off the key lights a device list lights, section 400's form: the page keys' pair 2 and 0,
 * called on leaving a list of one page too, and key 4 alone, in that order on all of the eighteen's lists. One
 * copy each, roled once.
 */
const PAGE_KEYS_OFF = lightOff(2, 0);
const LIGHT_4_OFF = lightOff(4);
roled(PAGE_KEYS_OFF, 'page keys off');
roled(offWrite(PAGE_KEYS_OFF), 'page keys variable');
roled(LIGHT_4_OFF, 'light 4 off');
roled(offWrite(LIGHT_4_OFF), 'light 4 variable');
roled(HEADER, 'header');

/**
 * The roles every device list of a configuration takes alike, which a list composed onto it takes from the lists
 * it holds rather than numbering afresh: the remote's lists, timers, value maps, programs and variables. Every other
 * list is the list's own.
 */
const SHARED_ROLES = new Set([
  'timer', 'page keys on', 'light 4 on', 'header 1', 'header 2', 'header 3', 'chrome 1', 'chrome 2', 'chrome 3',
  'devices map', 'activities', 'running', 'marker', 'page keys off', 'page keys variable', 'light 4 off', 'light 4 variable',
]);

/** A list as a template screen: section 424's shape, every number a step with its role. */
export function deviceListScreen(shape: DeviceListShape): TemplateScreen<DeviceListFont> {
  const pages = deviceListPages(shape.rows.length);
  const reached = shape.kind === 'reached';
  if (shape.scan55 < 1 || (reached && shape.scan55 !== 1)) throw new ScreenRecordError(`a ${shape.kind} device list does not map scan 55 ${shape.scan55} times`);
  const scan55: Step = shape.scan55 === 1 ? named(MAP, 'devices map')
    : roled(owns(...Array.from({ length: shape.scan55 }, () => named(MAP, 'devices map'))), 'scan 55 list');
  const own: Entry[] = [
    // A list of one page swallows the page arrows, section 275's rail; one of several leaves them to the firmware.
    ...(pages === 1 ? ARROWS : []),
    [TAG_ENTER, roled(owns(named(TIMER_START, 'timer'), ...(pages > 1 ? [named(LIST, 'page keys on')] : []), named(LIST, 'light 4 on')), 'enter')],
    [TAG_LEAVE, roled(owns(named(TIMER_CANCEL, 'timer'), PAGE_KEYS_OFF, LIGHT_4_OFF), 'leave')],
    [press(MAP_SCAN), scan55],
    [TAG_HEADER, HEADER],
  ];
  // The chrome queues a list of the list's own, made inside `chrome`, so its role is given here.
  const head = chrome<DeviceListFont>(TITLE, pages, { title: 'title', count: 'count' });
  for (const part of head) if (part.op === 'queue' && part.step.kind === 'owns') roled(part.step, 'chrome list');
  return {
    name: 'Device List',
    own,
    chrome: head,
    pages: Array.from({ length: pages }, (_, p) => {
      const first = DEVICE_LIST_ROWS * p;
      const mine = shape.rows.slice(first, first + DEVICE_LIST_ROWS);
      const list: Entry[] = [
        ...mine.map((_, k): Entry => [press(FIRST_CODE + k),
          roled(owns(CLICK, named(ENTER, `device ${first + k}`), roled(write(1), 'marker')), `row ${first + k}`)]),
        [press(FIRST_CODE + mine.length), reached ? named(MAP, 'activities') : roled(owns(CLICK, named(MAP, 'activities')), `activities key ${p}`)],
      ];
      const rowParts: Part<DeviceListFont>[] = mine.flatMap((lines, k) => {
        const top = ROW_PICTURE[1] + SCREEN_ROW_PITCH * k;
        return [
          picture(ROW_PICTURE[0], top),
          picture(ROW_ICON[0], ROW_ICON[1] + SCREEN_ROW_PITCH * k),
          ...(k === 0 ? [font<DeviceListFont>('row')] : []),
          ...lines.map((line, j) => text(line, NAME_X, deviceListLineY(top, lines.length, j))),
        ];
      });
      const counter: Part<DeviceListFont>[] = pages > 1
        ? [font('count'), text(String(p + 1), { endAt: SLASH_X }, COUNTER_Y), text('/', SLASH_X, COUNTER_Y)] : [];
      const below: Part<DeviceListFont>[] = reached
        ? [{
          op: 'switch', role: 'running',
          arms: [
            { match: 0, parts: [font('left'), leftHalf(IDLE_WORD, KEY_WORD_Y)] },
            { match: 1, parts: [font('left'), ...RUNNING_WORDS.map((word, j) => leftHalf(word, RUNNING_WORD_Y[j] as number))] },
          ],
          then: counter,
        }]
        : [font('left'), leftHalf(IDLE_WORD, KEY_WORD_Y), ...counter];
      return { list, parts: [{ op: 'chrome' }, ...rowParts, ...below] };
    }),
  };
}

/** A page's hit page as section 417's rules give it: its rows as whole width buttons, then the left key. */
function pageHitParts(rows: number): HitPart[] {
  return [...Array.from({ length: rows }, (_, k) => whole(ROW_PICTURE[1] + SCREEN_ROW_PITCH * k)), 'left'];
}

// ---------------------------------------------------------------------------------------------------------
// Which modes are device lists, and what reaches each.

/** One device list of a configuration, what reaches it, and for an activity's own the activity. */
export interface TouchDeviceList {
  mode: number;
  kind: DeviceListKind;
  /** The activity whose own list it is, by its value of the activity variable; absent on the idle list and the unreached one. */
  activity?: number;
  /** Whether it is the list the Devices record opens with no activity running. */
  idle?: boolean;
}

/**
 * The device lists, in mode order, and what reaches each: every mode whose rows enter every device, `deviceListMenus`;
 * the one the Devices record's case for no activity running enters is the idle list, each one its case for an
 * activity enters is that activity's own, and the rest are the lists nothing reaches through the record. An activity
 * whose case enters the idle list shares it. Refuses a case entering a mode that is not a device list, and two
 * activities' cases entering one list other than the idle one.
 */
export function touchDeviceLists(c: Container): TouchDeviceList[] {
  const { menus: rowed } = deviceListMenus(c);
  // A configuration with no device has no row to find a list by, so its lists are found by their title: the empty One,
  // `todo-compile-one.md` 7.1.7. Every compile of Logitech's has a device, so this reads none of theirs.
  const menus = rowed.length > 0 ? rowed : titledDeviceLists(c);
  if (menus.length === 0) return [];
  const roles = touchValueMapRoles(c);
  const record = roles.records.get('devices');
  const map = record === undefined ? undefined : valueMaps(c)?.[record];
  if (map === undefined) throw new ScreenRecordError('no value map reads as the Devices record');
  const cases = map.entries.flatMap(([key, target]) => {
    const queued = caseQueued(c, target);
    if (queued?.opcode !== ENTER_MODE) return [];
    if (!menus.includes(queued.operand)) throw new ScreenRecordError(`the Devices record's case for ${key} enters mode ${queued.operand}, which is not a device list`);
    return [[key, queued.operand] as const];
  });
  // The idle list first, so an activity whose case opens it, as every composed one does until its own list is
  // built, `withTouchActivityDeviceList`, shares it rather than taking it.
  const entered = new Map(cases.filter(([key]) => key === roles.idle).map(([key, mode]) => [mode, key]));
  for (const [key, mode] of cases) {
    if (key === roles.idle || entered.get(mode) === roles.idle) continue;
    if (entered.has(mode)) throw new ScreenRecordError(`two activities' Devices cases enter mode ${mode}`);
    entered.set(mode, key);
  }
  return menus.map((mode): TouchDeviceList => {
    const key = entered.get(mode);
    if (key === undefined) return { mode, kind: 'unreached' };
    return key === roles.idle ? { mode, kind: 'reached', idle: true } : { mode, kind: 'reached', activity: key };
  });
}

/**
 * The device lists of a configuration with no device, by their look: every mode whose first page calls a chrome
 * drawing the list's title, "Devices", at the title's place, `TITLE_AT`. On a configuration with a device the rows
 * find the lists, `deviceListMenus`, and this is not asked; a device page is titled by its device's name and the
 * activity menu "My Activities", so on the empty One, `todo-compile-one.md` 7.1.7, the two lists of no row are the only
 * modes titled so.
 */
function titledDeviceLists(c: Container): number[] {
  const map = characterMap(c);
  if (map === undefined) return [];
  const out: number[] = [];
  (modeRecords(c) ?? []).forEach((record, mode) => {
    const first = record.pages[0];
    if (first === undefined) return;
    const call = (screenProgram(c, first.program) ?? []).find((one) => one.opcode === SCREEN_CALL);
    const titled = (call === undefined ? [] : screenProgram(c, call.targets[0] as number) ?? [])
      .find((one) => (one.opcode === SCREEN_TEXT_AT || one.opcode === SCREEN_TEXT_INLINE) && one.operands[0] === TITLE_AT[0] && one.operands[1] === TITLE_AT[1]);
    const glyphs = titled === undefined ? undefined : textGlyphs(c, titled);
    if (glyphs !== undefined && decode(glyphs, map) === TITLE) out.push(mode);
  });
  return out;
}

// ---------------------------------------------------------------------------------------------------------
// The description.

/**
 * What a list draws that is not a number, read off its pages: each row's name as its lines, and on the list nothing
 * enters how many times scan 55's list maps. The glyph codes read are the description's, `at` collecting every
 * offset; the template then holds the rest of the list to section 424's shape.
 */
function readList(c: Container, list: TouchDeviceList, read: ValueReader, at: Set<number>): DeviceListShape {
  const map = characterMap(c);
  const record = modeRecords(c)?.[list.mode];
  if (map === undefined || record === undefined) throw new ScreenRecordError(`device list ${list.mode} does not read`);
  const spelled = (one: { opcode: number; start: number; operands: Uint8Array }): string => {
    const glyphs = textGlyphs(c, one as Parameters<typeof textGlyphs>[1]);
    if (glyphs === undefined) throw new ScreenRecordError(`device list ${list.mode} draws a text that does not spell`);
    const from = one.opcode === SCREEN_TEXT_INLINE ? one.start + 3 : c.blobOffsetOf(u24(one.operands, 2));
    if (from === undefined) throw new ScreenRecordError(`device list ${list.mode} draws a text outside the configuration`);
    const codes = Uint8Array.from(glyphs, (_, k) => {
      at.add(from + k);
      return read(from + k);
    });
    return decode(codes, map);
  };
  const rows: string[][] = [];
  for (const page of record.pages) {
    const program = screenProgram(c, page.program) ?? [];
    let row: string[] | undefined;
    let k = -1;
    for (const one of program) {
      if (one.opcode === SCREEN_SWITCH_NARROW) break;
      if (one.opcode === SCREEN_DRAW_IMAGE && one.operands[0] === ROW_PICTURE[0]) {
        k += 1;
        if (one.operands[1] !== ROW_PICTURE[1] + SCREEN_ROW_PITCH * k) throw new ScreenRecordError(`device list ${list.mode} draws a row at y ${one.operands[1]} where row ${k + 1} goes`);
        row = [];
        rows.push(row);
      } else if ((one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT) && one.operands[0] === NAME_X) {
        if (row === undefined) throw new ScreenRecordError(`device list ${list.mode} draws a name before its first row`);
        row.push(spelled(one));
      } else if (one.opcode === SCREEN_TEXT_INLINE || one.opcode === SCREEN_TEXT_AT) break;
    }
  }
  const scanEntry = record.entries.find((one) => one.tag === press(MAP_SCAN));
  const scan55 = scanEntry !== undefined && scanEntry.opcode === CALL ? (c.actionLists()?.[scanEntry.operand]?.length ?? 0) : 1;
  return { kind: list.kind, rows, scan55 };
}

export interface TouchDeviceListsSpec {
  /** The lists in mode order, the setup's. */
  lists: DeviceListShape[];
  /** Their numbering, pictures, fonts, hit pages and homes, the template engine's description of them. */
  screen: TemplateScreensSpec<DeviceListFont>;
}

export interface TouchDeviceListsPlace {
  screens: ModeRecordsPlace;
  hits: ReturnType<typeof touchHitPagesPlace>;
}

export interface TouchDeviceListsDescribed {
  spec: TouchDeviceListsSpec;
  place: TouchDeviceListsPlace;
  described: Set<number>;
  structure: Set<number>;
  regions: { from: number; to: number; what: string }[];
}

/**
 * Read off a configuration what a composer would supply for its device lists, and where their pieces sat: each
 * list's kind, rows and scan 55 count, then every list against the template for it, then each page's hit page.
 * Refuses a list that is not section 424's shape, a font two places of one role disagree on, and, at the build, a
 * page whose hit page is not the rules' page for it. `layout` is `takeApart(c)`; `read` is where every value is taken
 * from, so a caller can blind every byte the description does not read. `lists` chooses the lists, all by default.
 */
export function describeTouchDeviceLists(
  c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c), lists: readonly TouchDeviceList[] = touchDeviceLists(c),
): TouchDeviceListsDescribed {
  const names = new Set<number>();
  const shapes = lists.map((list) => readList(c, list, read, names));
  const roles = [...new Set(shapes.flatMap(fontRoles))];
  const d: TemplateScreensDescribed<DeviceListFont> = describeTemplateScreens(c, layout, shapes.map(deviceListScreen), lists.map((one) => one.mode), roles, read);
  for (const offset of names) d.described.add(offset);
  // Each page's hit page: the rules' page at the index its page record's lead names. Its areas and header are this
  // builder's; the table is the hit pages builder's, `hitpages.ts`, which builds it over every page.
  const table = touchPages(c);
  if (table === undefined) throw new ScreenRecordError('the configuration has no touch map');
  new Set(d.spec.screens.flatMap((one) => one.leads)).forEach((index) => {
    const page = table.records[index];
    if (page === undefined) throw new ScreenRecordError(`a device list names hit page ${index} of a table of ${table.records.length}`);
    const first = page.start - TOUCH_AREA_LENGTH * page.areas.length;
    for (let k = first; k < page.start + page.length; k += 1) d.structure.add(k);
    d.regions.push({ from: first, to: page.start + page.length, what: `a device list's hit page ${index}` });
  });
  return {
    spec: { lists: shapes, screen: d.spec },
    place: { screens: d.place, hits: touchHitPagesPlace(c, layout) },
    described: d.described, structure: d.structure, regions: d.regions,
  };
}

// ---------------------------------------------------------------------------------------------------------
// The builder.

export interface BuiltTouchDeviceLists {
  screens: BuiltTemplateScreens;
  /** Each page's hit page as its run, by the index its page names. */
  hits: Map<number, ContainerPiece[]>;
}

/**
 * The device lists built from a description: the screens by the template engine, each page's hit page by section
 * 417's rules. Refuses two pages of different shapes named to one hit page.
 */
export function buildTouchDeviceLists(c: Container, spec: TouchDeviceListsSpec): BuiltTouchDeviceLists {
  const screens = buildTemplateScreens(c, spec.screen, spec.lists.map(deviceListScreen));
  const hits = new Map<number, ContainerPiece[]>();
  const shapes = new Map<number, string>();
  spec.screen.screens.forEach((described, s) => {
    const rows = (spec.lists[s] as DeviceListShape).rows.length;
    described.leads.forEach((index, p) => {
      const onPage = Math.max(0, Math.min(DEVICE_LIST_ROWS, rows - DEVICE_LIST_ROWS * p));
      const areas = hitPageAreasOf(pageHitParts(onPage), `a device list page of ${onPage} rows`);
      const shape = JSON.stringify(areas);
      const was = shapes.get(index);
      if (was !== undefined && was !== shape) throw new ScreenRecordError(`two device list pages of other shapes are both hit page ${index}`);
      shapes.set(index, shape);
      if (was === undefined) hits.set(index, hitPageRunOf(areas));
    });
  });
  return { screens, hits };
}

/** A layout with the device lists and their hit pages swapped for the built ones, where the configuration's sat. */
export function withTouchDeviceLists(layout: ContainerLayout, built: BuiltTouchDeviceLists, place: TouchDeviceListsPlace): ContainerLayout {
  // The hit pages first: `withModeRecords` makes every piece afresh, so the hit pages' place, read off `layout`,
  // names pieces only `layout` holds.
  return withModeRecords(withTouchHitPages(layout, { runs: built.hits }, place.hits), built.screens, place.screens);
}

/** Describe, build and put back, and compare every byte with the configuration's. */
export function checkTouchDeviceLists(c: Container, read?: ValueReader): {
  lists: number; reached: number; unreached: number; pages: number; rows: number; listsBuilt: number; hitPages: number;
  described: number; structure: number;
} {
  const layout = takeApart(c);
  const d = describeTouchDeviceLists(c, layout, read);
  const built = buildTouchDeviceLists(c, d.spec);
  assertRebuilt(layOutContainer(withTouchDeviceLists(layout, built, d.place)).bytes, c, d.regions);
  return {
    lists: d.spec.lists.length,
    reached: d.spec.lists.filter((one) => one.kind === 'reached').length,
    unreached: d.spec.lists.filter((one) => one.kind === 'unreached').length,
    pages: d.spec.lists.reduce((sum, one) => sum + deviceListPages(one.rows.length), 0),
    rows: d.spec.lists.reduce((sum, one) => sum + one.rows.length, 0),
    listsBuilt: built.screens.lists.size, hitPages: built.hits.size, described: d.described.size, structure: d.structure.size,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Numbering by role, for a list or a row the configuration does not hold yet.

/**
 * The role of each number a list's template takes, in the order it takes them, `templateNumberSlots`' walk: a number
 * step's own, and a list or a state write by `ROLE`. A list of the list's own reached a second time is a page list's
 * copy, which runs lists of its own, so its role takes " copy". Refuses a step with no role.
 */
function slotRoles(screen: TemplateScreen<DeviceListFont>): { role: string; list: boolean }[] {
  const seen = new Set<Step>();
  return templateNumberSlots(screen).map((slot) => {
    const role = slot.kind === 'number' ? slot.role : ROLE.get(slot);
    if (role === undefined) throw new ScreenRecordError(`a device list takes a number with no role, ${slot.kind}`);
    if (slot.kind !== 'owns') return { role, list: false };
    const again = seen.has(slot);
    seen.add(slot);
    return { role: again ? `${role} copy` : role, list: true };
  });
}

/** The role of each number a list's template takes, in the order its description holds them. */
export function deviceListSlotRoles(shape: DeviceListShape): string[] {
  return slotRoles(deviceListScreen(shape)).map(({ role }) => role);
}

/**
 * Every role's value on one list as described, the description's numbers paired with the template's walk. Refuses a
 * role held as two values.
 */
export function deviceListRoles(shape: DeviceListShape, numbers: readonly number[]): Map<string, number> {
  const slots = slotRoles(deviceListScreen(shape));
  if (slots.length !== numbers.length) throw new ScreenRecordError(`a device list takes ${slots.length} numbers and its description holds ${numbers.length}`);
  const roles = new Map<string, number>();
  slots.forEach(({ role }, k) => {
    const value = numbers[k] as number;
    const was = roles.get(role);
    if (was !== undefined && was !== value) throw new ScreenRecordError(`a device list holds ${value} as its ${role} where it also holds ${was}`);
    roles.set(role, value);
  });
  return roles;
}

/**
 * The numbers a list of `shape` takes, in its walk's order: each role's value from `roles`, and a list of the list's
 * own that `roles` does not hold the next of `fresh`, so the lists a grown or a new list adds are the next free base
 * slot 10 indices in the order it takes them. Refuses any other number `roles` does not hold.
 */
function numberedList(shape: DeviceListShape, roles: ReadonlyMap<string, number>, fresh: () => number): number[] {
  const given = new Map<string, number>();
  return slotRoles(deviceListScreen(shape)).map(({ role, list }) => {
    const value = roles.get(role) ?? given.get(role);
    if (value !== undefined) return value;
    if (!list || SHARED_ROLES.has(role)) throw new ScreenRecordError(`a device list takes a number, its ${role}, the configuration does not say`);
    const made = fresh();
    given.set(role, made);
    return made;
  });
}

/**
 * The numbers a list of `shape` takes, in its walk's order, every one from `roles`: `numberedList` with no fresh index
 * to hand out, for a list whose every number the caller chose, a list of no rows among them, `todo-compile-one.md`
 * 7.1.6. Refuses a role `roles` does not hold.
 */
export function deviceListNumbers(shape: DeviceListShape, roles: ReadonlyMap<string, number>): number[] {
  return numberedList(shape, roles, () => {
    throw new ScreenRecordError('a device list takes a list of its own the numbering does not say');
  });
}

// ---------------------------------------------------------------------------------------------------------
// The composed path: a row on every list, and an activity's own list, `todo-compile-one.md` 4.3.3.

/**
 * The widest a line of a row's name is drawn, in pixels of the row font: all 659 rows of the eighteen English
 * compiles' 99 lists, 37 distinct names, are their names broken by `wrapLines` at any width from 101 to 103, section
 * 424, 101 being the widest line drawn ("JVC AV Receiver") and 104 the narrowest a next piece would have made. The
 * band is set by three names in two compiles; the other names wrap alike over a wider band. Three lines on one row,
 * `harvest_one_families_1`'s "Samsung Samsung Test Device 3".
 */
export const DEVICE_LIST_NAME_WIDTH = 101;

/** A device's name as the lines a list row draws it in, in `font` of `c`: `wrapLines` at `DEVICE_LIST_NAME_WIDTH`. */
export function deviceListNameLines(c: Container, font: number, name: string): string[] {
  const spell = speller(c);
  return wrapLines(name, DEVICE_LIST_NAME_WIDTH, (line) => spell(font, line).width);
}

/**
 * What a list draws, by address: its background, a picture's address or the fill drawn in its place once the background
 * is made one, `withPictureFilled`, findings section 425, and per row its picture and its icon, in list order.
 */
interface ListPictures { background: number | { fill: { width: number; height: number; colour: number } }; rows: { picture: number; icon: number }[] }

/**
 * A fill's stand in for a picture's content key, so a plan names its background whichever it is: `fill:` and the
 * fill's width, height and colour, which no content key starts with, `contentKey`.
 */
const FILL_KEY = 'fill:';
const fillKey = (fill: { width: number; height: number; colour: number }): string => `${FILL_KEY}${fill.width},${fill.height},${fill.colour}`;

/** The pictures a device list draws, read off its chrome and its pages in the template's walk order. */
function listPictures(c: Container, mode: number): ListPictures {
  const record = modeRecords(c)?.[mode];
  if (record === undefined) throw new ComposeError(`device list ${mode} does not read`);
  const draw = (one: { operands: Uint8Array }): number => u24(one.operands, 2);
  const chromeAt = screenProgram(c, record.pages[0]?.program ?? 0)?.find((one) => one.opcode === SCREEN_CALL)?.targets[0];
  const background = chromeAt === undefined ? undefined : screenProgram(c, chromeAt)?.find((one) =>
    (one.opcode === SCREEN_DRAW_IMAGE || one.opcode === SCREEN_FILL) && one.operands[0] === 0 && one.operands[1] === 0);
  if (background === undefined) throw new ComposeError(`device list ${mode} draws no background`);
  const rows: { picture: number; icon: number }[] = [];
  for (const page of record.pages) {
    let row: { picture: number } | undefined;
    for (const one of screenProgram(c, page.program) ?? []) {
      if (one.opcode !== SCREEN_DRAW_IMAGE) continue;
      if (one.operands[0] === ROW_PICTURE[0]) {
        if (row !== undefined) throw new ComposeError(`device list ${mode} draws a row with no icon`);
        row = { picture: draw(one) };
      } else if (one.operands[0] === ROW_ICON[0] && row !== undefined) {
        rows.push({ picture: row.picture, icon: draw(one) });
        row = undefined;
      }
    }
    if (row !== undefined) throw new ComposeError(`device list ${mode} draws a row with no icon`);
  }
  const drawn = background.opcode === SCREEN_FILL
    ? { fill: { width: background.operands[2] as number, height: background.operands[3] as number, colour: ((background.operands[4] as number) << 8) | (background.operands[5] as number) } }
    : draw(background);
  return { background: drawn, rows };
}

/** A stand in page program of the reached kind's shape: the chrome's call, a switch of two arms, its join and its arms. */
function switchStandIn(running: number): StandIn {
  return {
    length: 4 + 12 + 1 + 4 + 4,
    build: (at, chrome) => {
      const join = at + 16;
      const u = (address: number): number[] => [address & 0xff, (address >> 8) & 0xff, address >> 16];
      return Uint8Array.from([
        SCREEN_CALL, ...u(chrome),
        SCREEN_SWITCH_NARROW, running, 2, 0, ...u(join + 1), 1, ...u(join + 5), 0,
        SCREEN_END,
        SCREEN_JUMP, ...u(join), SCREEN_JUMP, ...u(join),
      ]);
    },
  };
}

/** A list to build on the composed path: its mode, its shape, its numbers, its pages' hit pages and its pictures by content. */
interface ListPlan {
  mode: number;
  shape: DeviceListShape;
  numbers: number[];
  leads: number[];
  /** The pictures it draws in walk order, each by its content key, so it is found again after the file moves. */
  pictures: string[];
  /** How many pages the configuration holds for it now; 0 for a list it does not hold yet. */
  held: number;
}

/** A hit page's areas and codes as one string, for telling two pages apart by what they hold. */
function hitShape(areas: readonly { x: number; width: number; y: number; height: number; code: number }[]): string {
  return areas.map((a) => `${a.x},${a.width},${a.y},${a.height}:${a.code}`).join(' ');
}

/**
 * Each page of each plan given the hit page of its shape, `leads` filled in, the configuration grown where a page is
 * appended: a page whose hit page holds what the rules give keeps it; one whose shape the table holds takes that
 * page; one whose shape is nowhere takes a hit page the lists' pages left, named by nothing now, rebuilt where it is,
 * and else a page appended, `withHitPage`. Returns the indices rebuilt in place, whose runs the build writes, and the
 * pages the lists' pages left, `freed`, of which the build drops those still named by nothing.
 */
function assignHitPages(
  start: Container, plans: ListPlan[], oldLeads: ReadonlyMap<number, readonly number[]>,
): { container: Container; inPlace: Set<number>; freed: Set<number> } {
  let c = start;
  const namers = new Map<number, number>();
  (modeRecords(c) ?? []).forEach((record, mode) => {
    if (oldLeads.has(mode)) return;
    for (const page of record.pages) namers.set(page.lead as number, (namers.get(page.lead as number) ?? 0) + 1);
  });
  const left = new Set([...oldLeads.values()].flat().filter((index) => (namers.get(index) ?? 0) === 0));
  const freed = new Set(left);
  const inPlace = new Map<number, string>();
  for (const plan of plans) {
    const old = oldLeads.get(plan.mode) ?? [];
    plan.leads = Array.from({ length: deviceListPages(plan.shape.rows.length) }, (_, p) => {
      const onPage = Math.max(0, Math.min(DEVICE_LIST_ROWS, plan.shape.rows.length - DEVICE_LIST_ROWS * p));
      const wanted = hitPageAreasOf(pageHitParts(onPage), `a device list page of ${onPage} rows`);
      const shape = hitShape(wanted.map(({ area, code }) => ({ ...area, code })));
      const table = touchPages(c);
      if (table === undefined) throw new ComposeError('the hit map stopped reading');
      const holds = (index: number): boolean => (inPlace.get(index) ?? hitShape(table.records[index]?.areas ?? [])) === shape;
      let lead: number;
      const was = old[p];
      if (was !== undefined && holds(was)) lead = was;
      else {
        const same = table.records.findIndex((_, index) => holds(index) && (!left.has(index) || inPlace.has(index)));
        const free = [...left].find((index) => !inPlace.has(index));
        if (same >= 0) lead = same;
        else if (free !== undefined) {
          inPlace.set(free, shape);
          lead = free;
        } else {
          const grown = withHitPage(c, wanted.map(({ area, code }) => [code, { ...area, code, self: 0, address: 0 }] as const));
          c = grown.container;
          lead = grown.lead;
        }
      }
      left.delete(lead);
      return lead;
    });
  }
  return { container: c, inPlace: new Set(inPlace.keys()), freed };
}

/**
 * The device lists of `plans` built over `start` and put in place, with room made first: the lists of their own a
 * plan takes that the configuration does not hold appended as the next free indices, a held list's pages given
 * their lists and copies as built and each page it gains added with a stand in program, `withMenuPage`, and a list
 * the configuration does not hold appended as a mode of its own with stand in pages, `appendMode`. Then every list
 * is built from its plan over the grown configuration and every piece read off it, `recordReading`, the stand ins
 * replaced like the rest; built together, since a name a later list draws is drawn by reference to the copy the
 * first holds inline, section 334, and only a build of them all knows those copies.
 *
 * Last, a page of `freed`, a hit page only the lists' pages named before, that no page names now is dropped,
 * `withoutHitPages`. A list growing from no row to several leaves one: on the empty Harmony One the idle list and the
 * list nothing enters share the hit page of no row, and the composed setup's lists of three pages take the shapes
 * the table already holds, so that page was rebuilt for a shape a later row outgrew and was then named by nothing,
 * findings section 435. Logitech's compiles hold no hit page named by nothing.
 */
function withDeviceListPlans(
  start: Container, plans: readonly ListPlan[], fonts: Record<DeviceListFont, number>, inPlace: ReadonlySet<number>,
  freed: ReadonlySet<number>, firstList: number, nextList: number, running: number | undefined,
): Container {
  let c = start;
  // A picture by its content, found again wherever the file has moved it; a held one stands in for every picture
  // while only the lists' bytes are wanted, which no picture changes.
  const addressOfKey = (key: string): number => {
    const at = picturesByContent(c).get(key)?.[0];
    if (at === undefined) throw new ComposeError('a device list\'s picture left the configuration');
    return at;
  };
  // A fill's key names its target, which no layout holds.
  const targetOfKey = (reading: ReturnType<typeof recordReading>, key: string): PieceTarget => {
    if (!key.startsWith(FILL_KEY)) return reading.targetOf(addressOfKey(key));
    const [width, height, colour] = key.slice(FILL_KEY.length).split(',').map(Number);
    return fillTarget(width as number, height as number, colour as number);
  };
  const reading0 = recordReading(c, takeApart(c), blobReader(c));
  const stand = targetOfKey(reading0, plans[0]?.pictures[0] as string);
  const specWith = (pictures: (plan: ListPlan) => PieceTarget[], homes: Map<string, PieceTarget>): TemplateScreensSpec<DeviceListFont> => ({
    fonts, homes, screens: plans.map((plan) => ({ mode: plan.mode, leads: plan.leads, pictures: pictures(plan), numbers: [...plan.numbers] })),
  });
  const screens = plans.map((plan) => deviceListScreen(plan.shape));
  const first = buildTemplateScreens(c, specWith((plan) => plan.pictures.map(() => stand), new Map()), screens);

  // 1. The new lists, the next free indices in order.
  const fresh = [...first.lists.keys()].filter((index) => index >= firstList).sort((a, b) => a - b);
  if (fresh.length !== nextList - firstList || fresh.some((index, k) => index !== firstList + k)) {
    throw new ComposeError('a device list\'s new lists are not the next free indices in order');
  }
  if (fresh.length > 0) {
    const appended = appendActionLists(c, fresh.map((index) => {
      const bytes = (first.lists.get(index) as ContainerPiece).bytes;
      return Array.from({ length: bytes[0] as number }, (_, k): [number, number] =>
        [(bytes[1 + 3 * k] as number) | ((bytes[2 + 3 * k] as number) << 8), bytes[3 + 3 * k] as number]);
    }));
    if (appended.first !== firstList) throw new ComposeError(`a device list's new lists start at ${appended.first}, not ${firstList}`);
    c = parse(appended.bytes);
  }

  // 2. Each list's pages made room for.
  plans.forEach((plan, s) => {
    const made = first.screens[s] as BuiltScreen;
    const what = `device list ${plan.mode}`;
    const reached = plan.shape.kind === 'reached';
    if (reached && running === undefined) throw new ComposeError('no device list says which variable tells an activity is running');
    const standIn = reached ? switchStandIn(running as number) : CHROME_AND_END;
    if (plan.held === 0) {
      const own = made.own.bytes;
      if (own.length !== 1 + 4 * (own[0] as number)) throw new ComposeError('a device list\'s own key map is not in the narrow form');
      const entries = Array.from({ length: own[0] as number }, (_, k) => ({
        tag: own[1 + 4 * k] as number,
        operand: (own[2 + 4 * k] as number) | ((own[3 + 4 * k] as number) << 8),
        opcode: own[4 + 4 * k] as number,
      }));
      c = appendMode(c, plan.mode, entries, made.lists.map((one) => one.bytes), (_, headAt) => ({
        head: { length: 1, build: () => Uint8Array.of(SCREEN_RETURN) },
        pages: plan.leads.map((__, p) => {
          const at = headAt + 1 + p * (standIn.length + 7);
          return { length: standIn.length, build: () => standIn.build(at, headAt) };
        }),
      }), { copies: made.copies, leads: plan.leads });
      return;
    }
    const pageOf = (p: number) => {
      const page = modeRecords(c)?.[plan.mode]?.pages[p];
      if (page === undefined) throw new ComposeError(`${what}'s page ${p + 1} does not read`);
      return page;
    };
    for (let p = 0; p < plan.held; p += 1) {
      // The copy first, since the pool sits below the page lists and growing it moves them.
      const rank = modePages(c).findIndex((one) => one.address === pageOf(p).address);
      const copyOff = pageListCopies(c)[rank];
      if (copyOff === undefined) throw new ComposeError(`${what}'s page ${p + 1} has no copy`);
      c = grownList(c, copyOff, made.copies[p] as Uint8Array, what);
      c = grownList(c, c.blobOffsetOf(pageOf(p).list) as number, (made.lists[p] as ContainerPiece).bytes, what);
      c.blob[c.blobOffsetOf(pageOf(p).address) as number] = plan.leads[p] as number;
      c = parse(c.blob);
    }
    for (let p = plan.held; p < plan.leads.length; p += 1) {
      c = withMenuPage(c, plan.mode, (made.lists[p] as ContainerPiece).bytes, made.copies[p] as Uint8Array, plan.leads[p] as number, what, standIn);
    }
  });

  // 3. Built over the grown configuration and put in place, every piece read off it.
  const layout = takeApart(c);
  const reading = recordReading(c, layout, blobReader(c));
  const places = plans.map((plan) => {
    const f = reading.frame('Device List', plan.mode);
    const extras = plan.shape.kind !== 'reached' ? [] : f.pages.flatMap((page) => {
      const call = page.program.at(-1);
      if (call?.opcode !== SCREEN_SWITCH_NARROW) throw new ComposeError(`device list ${plan.mode}'s page does not end on its switch`);
      const join = call.targets[0] === undefined ? undefined : screenProgram(c, call.targets[0])?.at(-1)?.targets[0];
      if (join === undefined) throw new ComposeError(`device list ${plan.mode}'s switch does not join`);
      return [join, ...call.targets].map((address, k) => reading.program(address, `device list ${plan.mode}'s piece ${k}`).piece);
    });
    return reading.placeOf('Device List', f, extras);
  });
  const built = buildTemplateScreens(c, specWith((plan) => plan.pictures.map((key) => targetOfKey(reading, key)), reading.homes()), screens);
  for (const index of built.lists.keys()) reading.list(index, 'a device list');
  const hits = new Map<number, ContainerPiece[]>();
  plans.forEach((plan) => plan.leads.forEach((index, p) => {
    if (!inPlace.has(index) || hits.has(index)) return;
    const onPage = Math.max(0, Math.min(DEVICE_LIST_ROWS, plan.shape.rows.length - DEVICE_LIST_ROWS * p));
    hits.set(index, hitPageRunOf(hitPageAreasOf(pageHitParts(onPage), `a device list page of ${onPage} rows`)));
  }));
  const place: TouchDeviceListsPlace = {
    screens: { screens: places, lists: reading.lists, lengths: reading.lengths, inline: reading.inline },
    hits: touchHitPagesPlace(c, layout),
  };
  const out = layOutContainer(withTouchDeviceLists(layout, { screens: built, hits }, place)).container;
  const named = namedHitPages(out);
  return withoutHitPages(out, [...freed].filter((index) => !named.has(index)));
}

/** Each held list as a plan, its numbers' roles and its pictures by content, read off `c`'s description. */
function heldPlans(c: Container, d: TouchDeviceListsDescribed, lists: readonly TouchDeviceList[]): { plans: ListPlan[]; roles: Map<string, number>[] } {
  const keys = new Map<number, string>();
  for (const [key, addresses] of picturesByContent(c)) for (const address of addresses) if (!keys.has(address)) keys.set(address, key);
  const keyOf = (address: number): string => {
    const key = keys.get(address);
    if (key === undefined) throw new ComposeError(`a device list draws a picture at ${address.toString(16)} the bank does not hold`);
    return key;
  };
  const roles: Map<string, number>[] = [];
  const plans = lists.map((list, s): ListPlan => {
    const shape = d.spec.lists[s] as DeviceListShape;
    const described = d.spec.screen.screens[s] as TemplateScreensSpec['screens'][number];
    roles.push(deviceListRoles(shape, described.numbers));
    const drawn = listPictures(c, list.mode);
    return {
      mode: list.mode, shape, numbers: [...described.numbers], leads: [...described.leads],
      pictures: [
        typeof drawn.background === 'number' ? keyOf(drawn.background) : fillKey(drawn.background.fill),
        ...drawn.rows.flatMap((row) => [keyOf(row.picture), keyOf(row.icon)]),
      ],
      held: described.leads.length,
    };
  });
  return { plans, roles };
}

/** The fonts the lists take with a list of several pages and a name to spell: the counter's and a row font that spells every name. */
function listFonts(c: Container, held: Record<DeviceListFont, number>, plans: readonly ListPlan[]): Record<DeviceListFont, number> {
  const fonts = { ...held };
  if (plans.some((plan) => deviceListPages(plan.shape.rows.length) > 1) && (fonts as Partial<typeof fonts>).count === undefined) {
    const style = pagingStyle(c);
    if (style.counterFont !== style.totalFont) throw new ComposeError('the configuration draws its page numbers and its page totals in two fonts, and a device list draws both in one');
    fonts.count = style.counterFont;
  }
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the configuration draws no text this can spell from');
  const names = [...new Set(plans.flatMap((plan) => plan.shape.rows.flat()))].join(' ');
  fonts.row = fontThatSpells(c, map, names, fonts.row);
  return fonts;
}

/**
 * The pictures the first row of a list with none draws, where any of `lists` has none: our row box in the device look,
 * `TouchChoices.deviceBox`, and the icon of a device of no named type, `TouchChoices.otherDeviceIcon`, each smoothed
 * against the colour behind the first row on the first such list's background. Undefined where every list has a row.
 */
function emptyListRow(c: Container, lists: readonly TouchDeviceList[], choices: TouchChoices): { box: Uint8Array; icon: Uint8Array } | undefined {
  const empty = lists.find((list) => (modeRecords(c)?.[list.mode]?.pages ?? []).every((page) =>
    !(screenProgram(c, page.program) ?? []).some((one) => one.opcode === SCREEN_DRAW_IMAGE && one.operands[0] === ROW_PICTURE[0])));
  if (empty === undefined) return undefined;
  const behind = colourBehindBackground(c, listPictures(c, empty.mode).background,
    [[ROW_PICTURE[0], ROW_PICTURE[1], ACTIVITY_ROW_SIZE[0], ACTIVITY_ROW_SIZE[1]]]);
  return {
    box: activityRowBox(choices.deviceBox, behind),
    icon: activityRowIcon(choices.deviceBox, behind, choices.otherDeviceIcon, choices.activityIconGrid.row),
  };
}

/**
 * A device's row put on every device list by building the lists again, `todo-compile-one.md` 4.3.3: the touch
 * family's device composer, in place of appending a row to each the way `composeMenuPage` appends one.
 *
 * 1. **The lists as they are, described**, `describeTouchDeviceLists`, and each one's numbering read by role,
 *    `deviceListRoles`.
 * 2. **The row added to each, at its end**: its name in the lines `deviceListNameLines` breaks it into, entering
 *    `mode`. At the end of an activity's own list too, since the new device is not one any activity switches on, and
 *    at the end of the idle list's order, which is the order of composing. Its pictures are the list's own: the row
 *    picture the list draws at that place, and the icon of the row labelled `iconLike`, or the first row's, which our
 *    look then draws in ours by the device's type, `devicelook.ts`. A list grown to several pages calls the wiring's
 *    list lighting the page keys, `pageKeysOn`, and draws its counter in the configuration's paging font.
 * 3. **Numbered**: every number a list held keeps its role's value, and every list of its own it did not hold takes
 *    the next free base slot 10 index in the order the lists take them, `numberedList`.
 * 4. **Its hit pages**, `assignHitPages`; 5. **made room for and built**, `withDeviceListPlans`.
 */
export function withTouchDeviceListRow(
  given: Container, mode: number, name: string, iconLike?: string, choices: TouchChoices = TOUCH_CHOICES,
): Container {
  const lists = touchDeviceLists(given);
  if (lists.length === 0) throw new ComposeError('no device list to put a row on');
  // A list with no row has none to take the new row's pictures from, the empty One's, `todo-compile-one.md` 8.1.1: its
  // first row draws our row box and the icon of a device of no named type, smoothed against the list's background,
  // put in the bank first. Our look then gives the row its icon by the device's type, as it does every row,
  // `devicelook.ts`, and leaves out the icon nothing draws by then. On Logitech's compiles every list has a row.
  const firstRow = emptyListRow(given, lists, choices);
  const start = firstRow === undefined ? given : withBankPictures(given, [firstRow.box, firstRow.icon]).container;
  const held = describeTouchDeviceLists(start, takeApart(start), blobReader(start), lists);
  const { plans, roles } = heldPlans(start, held, lists);
  // Lists of no row select no row font, the empty One's, `todo-compile-one.md` 8.1.1: their first row is drawn in the
  // font the fixed screens draw their whole width rows in, which is the device lists' row font on all sixteen English
  // compiles of skin 54 that describe both, findings section 435.
  const heldFonts = { ...held.spec.screen.fonts };
  if ((heldFonts as Partial<typeof heldFonts>).row === undefined) heldFonts.row = describeTouchFixedScreens(start, takeApart(start)).spec.fonts.wide;
  const lines = deviceListNameLines(start, heldFonts.row, name);
  const firstList = (start.actionLists() ?? []).length;
  let nextList = firstList;
  plans.forEach((plan, s) => {
    const shape: DeviceListShape = { ...plan.shape, rows: [...plan.shape.rows, lines] };
    const role = roles[s] as Map<string, number>;
    role.set(`device ${plan.shape.rows.length}`, mode);
    // A list of no row writes the marker nowhere to read it off; the variable is the one the Devices key's list writes 1
    // to, the family's marker writer, which is the rows' marker on all nineteen compiles, findings section 435.
    if (!role.has('marker')) {
      const marker = touchMenuMarkerWriter(start);
      if (marker === undefined) throw new ComposeError('no list says which variable marks device mode');
      role.set('marker', marker);
    }
    if (deviceListPages(shape.rows.length) > 1 && !role.has('page keys on')) {
      const variable = role.get('page keys variable');
      if (variable === undefined) throw new ComposeError('no device list says which variable the page keys\' lights write');
      role.set('page keys on', pageKeysOn(start, variable, [2, 0]));
    }
    const drawn = plan.pictures;
    const place = plan.shape.rows.length % DEVICE_LIST_ROWS;
    const rowAt = (k: number): string => drawn[1 + 2 * k] as string;
    const sameplace = plan.shape.rows.findIndex((_, k) => k % DEVICE_LIST_ROWS === place);
    const like = iconLike === undefined ? -1 : plan.shape.rows.findIndex((one) => joinLines(one) === iconLike);
    plan.pictures = plan.shape.rows.length === 0 && firstRow !== undefined
      ? [...drawn, contentKey(firstRow.box), contentKey(firstRow.icon)]
      : [...drawn, rowAt(sameplace >= 0 ? sameplace : 0), drawn[2 + 2 * (like >= 0 ? like : 0)] as string];
    plan.shape = shape;
  });
  // Numbered once every list's roles are known, in mode order, so the new lists come out in the order the build takes them.
  for (const [s, plan] of plans.entries()) plan.numbers = numberedList(plan.shape, roles[s] as Map<string, number>, () => nextList++);
  const fonts = listFonts(start, heldFonts, plans);
  const oldLeads = new Map(plans.map((plan) => [plan.mode, [...plan.leads]]));
  const hit = assignHitPages(start, plans, oldLeads);
  const running = roles.find((one) => one.has('running'))?.get('running');
  return withDeviceListPlans(hit.container, plans, fonts, hit.inPlace, hit.freed, firstList, nextList, running);
}

/**
 * An activity's own device list composed onto a Harmony One configuration, and the Devices item pointed at it while
 * the activity runs, `todo-compile-one.md` 4.3.3: the touch family's `Family.activityDeviceList`, run after the
 * activity composer, which points it at the idle list, and after the menu row.
 *
 * **Its rows are the idle list's devices, the ones the activity's start switches on first**, in the order it switches
 * them on, `startSwitchedOn`, which is the Harmony 600 family's rule and Logitech's on 61 of their 64 Harmony One
 * activities, section 424; then the rest in the idle list's order. **Its build is the idle list's template**: the
 * reached kind, numbered from the idle list by role for every number the lists share and from the next free indices
 * for every list of its own, its pages on the hit pages of their shape, each row drawing the row picture of its place
 * and the device's own icon as the idle list draws them; the mode the next free one. Then each case under the Devices
 * item for the activity, the Devices record's and its unread copy's, `activityKeyedMaps`, queues the new mode.
 *
 * Refuses an activity whose Devices cases do not open the idle list, a configuration with no idle list, and an
 * activity whose start the rule cannot read.
 */
export function withTouchActivityDeviceList(start: Container, activity: number): Uint8Array {
  const lists = touchDeviceLists(start);
  const idle = lists.find((one) => one.idle === true);
  if (idle === undefined) throw new ComposeError('no idle device list to take an activity\'s list from');
  const found = activities(start).find((one) => one.activity === activity);
  if (found === undefined) throw new ComposeError(`${activity} is not an activity of the configuration`);
  const maps = valueMaps(start) ?? [];
  const valueRoles = touchValueMapRoles(start);
  const records = (['devices', 'devices unread'] as const).flatMap((one) => {
    const index = valueRoles.records.get(one);
    return index === undefined ? [] : [index];
  });
  const cases = records.map((record) => {
    const target = maps[record]?.entries.find(([key]) => key === activity)?.[1];
    const queued = target === undefined ? undefined : caseQueued(start, target);
    if (queued?.opcode !== ENTER_MODE || queued.operand !== idle.mode) {
      throw new ComposeError(`record ${record}'s case for activity ${activity} does not open the idle device list`);
    }
    return record;
  });

  const held = describeTouchDeviceLists(start, takeApart(start), blobReader(start), lists);
  const { plans, roles } = heldPlans(start, held, lists);
  const at = lists.indexOf(idle);
  const idlePlan = plans[at] as ListPlan;
  const idleRoles = roles[at] as Map<string, number>;
  const idleModes = idlePlan.shape.rows.map((_, k) => idleRoles.get(`device ${k}`) as number);
  const head = startSwitchedOn(start, found.set, idleModes, `activity ${found.name ?? activity}`);
  const order = [...head, ...idleModes.filter((one) => !head.includes(one))];
  const mode = modeTable(start)?.addresses.length;
  if (mode === undefined) throw new ComposeError('base slot 6 states no table');

  const shape: DeviceListShape = { kind: 'reached', rows: order.map((one) => idlePlan.shape.rows[idleModes.indexOf(one)] as string[]), scan55: 1 };
  const role = new Map([...idleRoles].filter(([name]) => SHARED_ROLES.has(name)));
  order.forEach((one, k) => role.set(`device ${k}`, one));
  if (deviceListPages(shape.rows.length) > 1 && !role.has('page keys on')) {
    const variable = role.get('page keys variable');
    if (variable === undefined) throw new ComposeError('no device list says which variable the page keys\' lights write');
    role.set('page keys on', pageKeysOn(start, variable, [2, 0]));
  }
  // The row picture of each place, as the idle list draws it there, and each device's own icon.
  const place = (k: number): string => idlePlan.pictures[1 + 2 * (k % DEVICE_LIST_ROWS)] as string;
  const pictures = [idlePlan.pictures[0] as string, ...order.flatMap((one, k) => [place(k), idlePlan.pictures[2 + 2 * idleModes.indexOf(one)] as string])];
  const firstList = (start.actionLists() ?? []).length;
  let nextList = firstList;
  const plan: ListPlan = { mode, shape, numbers: numberedList(shape, role, () => nextList++), leads: [], pictures, held: 0 };
  const all = [...plans, plan];
  const fonts = listFonts(start, held.spec.screen.fonts, all);
  const hit = assignHitPages(start, all, new Map(plans.map((one) => [one.mode, [...one.leads]])));
  const built = withDeviceListPlans(hit.container, all, fonts, hit.inPlace, hit.freed, firstList, nextList, idleRoles.get('running'));

  // The Devices cases for the activity queue the new list. The operand is the queued instruction's first two bytes
  // after the opcode, low byte first, as `caseQueued` reads them.
  for (const record of cases) {
    const target = valueMaps(built)?.[record]?.entries.find(([key]) => key === activity)?.[1];
    const offset = target === undefined ? undefined : built.blobOffsetOf(target);
    if (offset === undefined) throw new ComposeError(`record ${record} lost its case for activity ${activity}`);
    built.blob.set(new Writer(2).u16(mode).bytes, offset + 1);
  }
  // **And the Devices key of the activity's own working screen**, which is the way in a person takes: its list,
  // `75 0FCA` and `7E` the idle list's mode, was composed before this list existed, so it entered the idle list
  // while the cases above entered this one, and the spare Harmony One showed the idle order inside an activity.
  // Every list a page of the working screen binds that enters the idle list enters this one now; each is the
  // activity's own, the screen composer making one per page, so nothing another screen runs moves with it.
  const working = activityScreens(built)?.screens.get(activity);
  if (working === undefined) throw new ComposeError(`activity ${activity} has no working screen to point at its device list`);
  const table = built.actionLists() ?? [];
  const addresses = built.pointerArray(archSlot(built.architecture as number, ACTION_LIST_TABLE_SLOT)) ?? [];
  let pointed = 0;
  for (const page of modeRecords(built)?.[working]?.pages ?? []) {
    for (const entry of taggedList(built, page.list)?.entries ?? []) {
      if (entry.opcode !== 0x7f) continue;
      const list = table[entry.operand] ?? [];
      const at = list.findIndex((one) => one.opcode === ENTER_MODE && one.operand === idle.mode);
      if (at < 0) continue;
      const address = addresses[entry.operand];
      const sites = address === undefined ? undefined : built.actionListSites(address);
      const site = sites?.[at];
      if (site === undefined) throw new ComposeError(`list ${entry.operand} of activity ${activity}'s screen has no site for its instruction ${at}`);
      built.blob.set(new Writer(2).u16(mode).bytes, site.operandAt);
      pointed += 1;
    }
  }
  if (pointed === 0) throw new ComposeError(`activity ${activity}'s working screen has no Devices key entering the idle list`);

  // **And the activity's own key map**, base slot 9's set its chain selects: its scan 55 entry runs a list that
  // enters a device list and writes a variable. Logitech's compiles give every activity a list of its own there,
  // entering that activity's list (`7E` its mode, then the write), where the composer bound every activity to the
  // one list the idle device list's key runs. So each such entry gets a copy of that list entering this one.
  let current = parse(built.blob);
  const setAddress = (one: Container): number => handlerSets(one)?.addresses[found.set] as number;
  const bodies = current.actionLists() ?? [];
  const bound = (taggedList(current, setAddress(current))?.entries ?? []).flatMap((entry, k) => {
    const body = entry.opcode === 0x7f ? bodies[entry.operand] : undefined;
    return body?.some((one) => one.opcode === ENTER_MODE && one.operand === idle.mode) === true ? [{ k, body }] : [];
  });
  for (const { k, body } of bound) {
    const copy = body.map((one): [number, number] => [one.opcode === ENTER_MODE && one.operand === idle.mode ? mode : one.operand, one.opcode]);
    const appended = appendActionLists(current, [copy]);
    current = parse(appended.bytes);
    const list = taggedList(current, setAddress(current));
    if (list === undefined) throw new ComposeError(`activity ${activity}'s key map lost its tagged list`);
    const stride = list.wide ? 5 : 4;
    current.blob.set(new Writer(2).u16(appended.first).bytes, (list.wide ? list.start + 2 : list.start + 1) + stride * k + stride - 3);
  }
  return restamped(parse(current.blob).blob);
}

// ---------------------------------------------------------------------------------------------------------
// A configuration with no device: the two lists of no rows, `todo-compile-one.md` 7.1.6.

/**
 * The device lists of a configuration with no device and no activity, in mode order, findings section 429: the idle
 * list, which Devices opens, and the list nothing enters, each of no rows. Logitech's compiles hold the idle list
 * before the list nothing enters on all eighteen English compiles, section 424.
 *
 * **What is measured and what is inferred.** No Harmony One compile of Logitech's holds no device, so no list of no
 * rows has been seen; the smallest lists hold one device (`harvest_one_families_1`), and lists of one, two and three
 * rows, one page each, are rebuilt byte for byte by `deviceListScreen`. **The form at no rows is that template with no
 * row in it**, which is an inference: one page, the chrome titled "Devices" and the left key's word, the page list
 * holding the left key alone at code 48, the next code after no rows, the row font never selected, and the hit page
 * the left key and the edges. What makes it more than a guess is the sibling list: **Logitech's own activity menu of
 * no row**, three rows to a page like this one, on the four compiles with no activity, is one page drawing the chrome
 * and its key words alone, selecting no row font, touched through its keys and the edges, and rebuilt by its template
 * the same way, section 419, though on four compiles of one test account. Against it, Logitech's compiler does special
 * case zero on this remote: the power off help with no device to ask about is "Nothing to do" and not its template with
 * no device in it, section 415. Seen on a remote since `todo-compile-one.md` 7.2: the empty One written to the spare
 * Harmony One started on My Activities and its device list opened with no row; that run is recorded in the todo item
 * and in no findings section, since the archive was frozen at section 436 by then.
 *
 * **The list nothing enters maps scan 55 once, bound straight**: once per other device list, which is the idle list
 * alone here, the form measured on the four compiles with no activity, section 424. Measured, not inferred.
 */
export const EMPTY_DEVICE_LISTS: readonly DeviceListShape[] = [
  { kind: 'reached', rows: [], scan55: 1 },
  { kind: 'unreached', rows: [], scan55: 1 },
];

/**
 * What a configuration built from nothing gives its two lists of no rows, `EMPTY_DEVICE_LISTS`, which is its numbering
 * and nothing that is words: per list, in that order, its mode, its page's hit page and every number by its role,
 * `deviceListSlotRoles`; the two fonts a list of no rows selects, the title's and the left key's; the full screen
 * background the chrome draws; and the homes of texts drawn by reference, none by default.
 */
export interface EmptyDeviceListsNumbering {
  lists: readonly { mode: number; lead: number; roles: ReadonlyMap<string, number> }[];
  fonts: Pick<Record<DeviceListFont, number>, 'title' | 'left'>;
  background: PieceTarget;
  homes?: Map<string, PieceTarget>;
}

/**
 * The description of a configuration's two lists of no rows, made from its numbering rather than read off a file, the
 * way `four-slot/empty.ts` makes the Harmony 650's: what `buildTouchDeviceLists` builds them from. Refuses a numbering
 * of another number of lists and one missing a role.
 */
export function emptyTouchDeviceListsSpec(numbering: EmptyDeviceListsNumbering): TouchDeviceListsSpec {
  if (numbering.lists.length !== EMPTY_DEVICE_LISTS.length) {
    throw new ScreenRecordError(`a configuration with no device holds ${EMPTY_DEVICE_LISTS.length} device lists, not ${numbering.lists.length}`);
  }
  return {
    lists: EMPTY_DEVICE_LISTS.map((one) => ({ ...one, rows: [] })),
    screen: {
      // Only the two roles a list of no rows selects; the template asks for no other.
      fonts: { ...numbering.fonts } as Record<DeviceListFont, number>,
      homes: numbering.homes ?? new Map(),
      screens: numbering.lists.map((one, s) => ({
        mode: one.mode, leads: [one.lead], pictures: [numbering.background],
        numbers: deviceListNumbers(EMPTY_DEVICE_LISTS[s] as DeviceListShape, one.roles),
      })),
    },
  };
}

/**
 * The two lists of no rows put into a Logitech compile with no activity, after its modes, `todo-compile-one.md` 7.1.6:
 * a file the zero row form can be laid out in, read back and drawn before a configuration with no device exists to
 * hold it (7.1.7). Nothing enters the two new modes; the compile's own lists stay as they were.
 *
 * Numbered as an activity's own list is, `withTouchActivityDeviceList`: every number the lists share from the
 * configuration's list of the same kind, by role, and every list of their own the next free base slot 10 index;
 * the background the configuration's lists draw; each page on the hit page of its shape, appended where the table
 * holds none, `assignHitPages`. Returns the file and the two modes. Refuses a configuration whose device lists are not
 * the idle list and the list nothing enters alone, which is one holding an activity.
 */
export function withTouchEmptyDeviceLists(start: Container): { container: Container; modes: number[] } {
  const lists = touchDeviceLists(start);
  if (lists.length !== 2 || lists[0]?.idle !== true || lists[1]?.kind !== 'unreached') {
    throw new ComposeError('the configuration\'s device lists are not the idle list and the list nothing enters alone, so it holds an activity');
  }
  const held = describeTouchDeviceLists(start, takeApart(start), blobReader(start), lists);
  const { plans, roles } = heldPlans(start, held, lists);
  const first = modeTable(start)?.addresses.length;
  if (first === undefined) throw new ComposeError('base slot 6 states no table');
  const firstList = (start.actionLists() ?? []).length;
  let nextList = firstList;
  const added = EMPTY_DEVICE_LISTS.map((shape, s): ListPlan => {
    const role = new Map([...(roles[s] as Map<string, number>)].filter(([name]) => SHARED_ROLES.has(name)));
    const zero: DeviceListShape = { ...shape, rows: [] };
    return {
      mode: first + s, shape: zero, numbers: numberedList(zero, role, () => nextList++), leads: [],
      pictures: [(plans[s] as ListPlan).pictures[0] as string], held: 0,
    };
  });
  const all = [...plans, ...added];
  const fonts = listFonts(start, held.spec.screen.fonts, all);
  const hit = assignHitPages(start, all, new Map(plans.map((one) => [one.mode, [...one.leads]])));
  const container = withDeviceListPlans(hit.container, all, fonts, hit.inPlace, hit.freed, firstList, nextList, roles[0]?.get('running'));
  return { container, modes: added.map((one) => one.mode) };
}
