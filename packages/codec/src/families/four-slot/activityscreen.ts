/**
 * An activity's screens on the Harmony 600, 650 and 700: its row on the activity menu, its start up
 * screen, its working screen and the records keyed by the activity, with their checks. Plan 007's four
 * slot family, cut out of `compose.ts` unchanged.
 */
import type { WithChoices } from '../family.ts';
import { FOUR_SLOT_CHOICES, type FourSlotChoices } from './choices.ts';
import { Writer } from '../../emit.ts';
import {
  bottomWord, builtChrome, checkPageFrames, DEVICE_MODE_PROGRAM_TAG, DEVICE_PAGE_LOOKS, deviceModeChrome,
  type DevicePageLook, DEVICES_KEY_TAG, devicesKeyOperand, FOUR_SLOT_TITLE_XY, fourSlotCounterX, fourSlotLabelLines,
  inlineHomes, type KeyMapEntry, type PageFrame, picturesByContent, smallerLabelFonts,
} from '../../families/four-slot/chrome.ts';
import { activityRowListBody } from '../../families/four-slot/devicelist.ts';
import { appendArch14Mode, fourSlotPageProgram } from '../../families/four-slot/devicescreen.ts';
import {
  assertTextsAtHome, FOUR_SLOT_MAX_PAGES, fourSlotMenuChrome, fourSlotMenus, fourSlotPageList, type FourSlotTemplate,
  fourSlotTemplate, growFourSlotMenu, idleDeviceList, menuLayout, menuPageBytes, type MenuPart, openFourSlotMenuPage,
  pageRecordDifference, partsDifference,
} from '../../families/four-slot/menus.ts';
import { type FontSet, fontSets } from '../../font.ts';
import { archSlot, Container, type Instruction, parse } from '../../gspm.ts';
import {
  activities, ACTIVITY_STATE_NAME, activityBindings, activityNames, caseQueued, compilerCaseOrder, compilerTagOrder,
  ENTER_MODE, FOUR_SLOT_ITEMS, FOUR_SLOT_LEFT_X, FOUR_SLOT_RIGHT_END, FOUR_SLOT_ROWS, FOUR_SLOT_SCREEN_WIDTH,
  KEY_EVENT_PRESS, KEY_EVENT_SHIFT, MAP_VALUE_OPCODE, RUN_SCREEN_PROGRAM, SELECT_BINDING_SET,
  SELECT_BINDING_SET_MASK, stateVariables,
} from '../../inventory.ts';
import { KEYPAD_FIRST_SCAN, KEYPAD_LAST_SCAN } from '../../modezero.ts';
import { relocate } from '../../relocate.ts';
import {
  bitmapReference, SCREEN_DRAW_IMAGE, SCREEN_DRAW_IMAGE_AT, SCREEN_END, SCREEN_QUEUE_INSTRUCTION, SCREEN_SELECT_FONT,
  screenProgram,
} from '../../screen.ts';
import { handlerSets, modeRecords, modeTable, type TaggedEntry, taggedList } from '../../sections.ts';
import { arch14Starts, type Arch14Starts, nextActivityValue } from '../../shared/activities.ts';
import { ACTION_TABLE_SLOT, ComposeError, restamped } from '../../shared/core.ts';
import { appendTableEntries } from '../../shared/infrared.ts';
import {
  appendValueMapCase, type ComposeActivityRowOptions, type ComposeActivityScreenOptions, type ComposedActivityRow,
  type ComposedActivityScreen, type ComposeRow,
} from '../../shared/menus.ts';
import { codesFor, fontThatSpells, textWidth } from '../../shared/spelling.ts';
import { stateVariableName } from '../../statetables.ts';
import { characterMap, screenStrings } from '../../text.ts';
import { valueMaps } from '../../valuemap.ts';

/**
 * The picture a page of the arch 14 activity menu holding **one** activity draws, section 316: the
 * background the activities' working screens draw on a page holding one command or none, by majority
 * over those pages. All 4 such menu pages on the thirteen Logitech compiles for the Harmony 600, 650
 * and 700 draw it, one each on `h650_config_region`, `h600_config`, `h700_config` and `h700_config_2`,
 * the last two compiled for one account; none of the 4 draws its menu's first page picture, the device
 * mode pages' one item picture or any device list page's picture.
 *
 * The working screens are the modes the cases of one base slot 14 record enter: keyed by activities on
 * the menu and the idle value, every activity's case entering a mode and the idle value's not, which
 * is `activityMaps`'s `working` record. **Found here rather than through `activityMaps`**, which
 * demands the keys be exactly the menu's activities and the idle value and every activity's start the
 * compiler's shape, `arch14Starts`. Neither holds while activities are being composed: a row is
 * composed for an activity not on the menu yet, whose working screen `compose-activity.ts` composes
 * first and so adds its case to the record, and an activity composed without screens is on the menu
 * with no case and an enter list of another shape. So this asks only that the record have a case for
 * the idle value and for at least one activity on the menu, and that every case but the idle value's
 * enter a mode. The picture it finds is the one Logitech's page of one activity draws on every compile
 * that has such a page, which the calibration in `compose.test.ts` asserts by finding the working
 * screens another way, by their titles.
 *
 * Undefined where no record or several fit, or where no working screen page holds one command or
 * none, which is `calibration_h600`, so that the caller refuses rather than drawing another picture.
 */
export function activityMenuSingle(c: Container): number | undefined {
  const idle = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME))?.record?.first;
  const onMenu = new Set(activityBindings(c).map((one) => one.activity));
  if (idle === undefined || onMenu.size === 0) return undefined;
  const records = modeRecords(c) ?? [];
  const candidates: number[][] = [];
  for (const map of valueMaps(c) ?? []) {
    if (map.ranges.length !== 0) continue;
    const keys = map.entries.map(([key]) => key);
    if (!keys.includes(idle) || !keys.some((key) => onMenu.has(key))) continue;
    const modes: number[] = [];
    let fits = true;
    for (const [key, target] of map.entries) {
      const queued = caseQueued(c, target);
      const enters = queued?.opcode === ENTER_MODE;
      // The idle value's case enters no mode on the working record and does on the key under
      // Devices', which is what tells the two apart, section 290.
      if (key === idle ? enters : !enters) { fits = false; break; }
      if (key !== idle) modes.push((queued as Instruction).operand);
    }
    if (fits) candidates.push(modes);
  }
  if (candidates.length !== 1) return undefined;
  const counts = new Map<number, number>();
  for (const mode of new Set(candidates[0])) {
    for (const page of records[mode]?.pages ?? []) {
      if ((taggedList(c, page.list)?.entries.length ?? 0) > 1) continue;
      const first = screenProgram(c, page.program)?.[0];
      const picture = first?.opcode === SCREEN_DRAW_IMAGE ? bitmapReference(first) : undefined;
      if (picture !== undefined) counts.set(picture, (counts.get(picture) ?? 0) + 1);
    }
  }
  // The most drawn, the lowest address on a tie. Since section 336 the working screens' own background is
  // located by content, `activityScreenChrome`, and it is this picture on the twelve compiles that hold it.
  return [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
}

/**
 * The activity menu row on arch 14 (Harmony 600, 650 and 700), section 289: one row on the menu's
 * last page, bound to both buttons of that row, its label centred.
 *
 * **The menu is the device list's two row layout**, measured on all four arch 14 user configurations:
 * two activities to a page, the top one on scans 8 and 2 and the bottom one on 9 and 34, each button
 * running a list of its own and the page's pool copy another, the label centred at y 35 or 79 before
 * the page's closing bar. So the growth is `growFourSlotMenu`, the step the device list uses, and
 * what is this builder's is the row's two instructions and one rule about the picture:
 *
 * * a row selects the activity's base slot 9 entry and writes 0 into the marker variable, with **no
 *   beep**, where an arch 12 row opens with one;
 * * **a full page draws a picture of the menu's own**, and a page holding one activity one the
 *   activities' own screens draw too, where a two row device list's one device page draws its full
 *   pages' picture. So a page that grows from one activity to two takes its menu's full page picture,
 *   which means a menu of one page and one activity is refused: there is no full page to take it from.
 *
 * No icon, since the arch 14 menu draws none, so `iconLike` is refused rather than ignored.
 *
 * **A full last page gets a new page, since section 316**, through the step the device lists open
 * theirs with, `openFourSlotMenuPage`: the activity on the top row's two buttons, its label centred at
 * y 35, the menu's own chrome, and a counter on every page. Until then a full page was refused, so a
 * menu could take a row only while it held an odd number of activities, and a second composed activity
 * on the Harmony 650 was refused.
 *
 * **Since section 334 nothing of the page is copied**: `fourSlotMenuChrome` builds it for the kind
 * 'activity menu', the counter where a corner list's sits though the layout is two row, and the
 * background by the look's content, the full page picture for two activities and the one activity
 * picture for one. The one activity picture is checked against the route section 316 found it by,
 * `activityMenuSingle`, the activities' working screens' one command background, wherever that route
 * answers: 12 of 12 compiles agree, and on the thirteenth, `calibration_h600`, neither route finds it.
 *
 * So the page count alternates what a row does: an odd number of activities leaves a last page with
 * one, which the next row fills, and an even number a full one, which the next row opens a page past.
 * What stays refused is a page whose picture the configuration does not hold, since a configuration
 * holds a picture only where one of its programs draws it: a full page on `calibration_h600`, and a menu
 * of one activity on one page wherever no page draws the full page picture.
 */
export function composeFourSlotActivityRow(
  c: Container, label: string, set: number, menu: number, marker: Instruction,
  options: ComposeActivityRowOptions,
): ComposedActivityRow {
  if (options.iconLike !== undefined) {
    throw new ComposeError('an arch 14 activity menu draws no icon, so there is none to copy');
  }
  const record = modeRecords(c)?.[menu];
  const page = record?.pages.at(-1);
  if (record === undefined || page === undefined) throw new ComposeError('the activity menu has no page');
  const layout = menuLayout(c, taggedList(c, page.list)?.entries ?? []);
  if (layout === undefined || !layout.rows) {
    throw new ComposeError("the activity menu's last page is not the two row layout");
  }
  // A full last page gets a page after it, and both refusals that can stop it are made here, before
  // anything moves: a tenth page, whose counter would be two digits, and a configuration whose working
  // screens draw no one command background, which is the picture the new page needs. `calibration_h600`
  // is that configuration, every page of its two activities' working screens holding three commands or
  // four.
  const full = layout.used >= layout.capacity;
  if (full && record.pages.length + 1 > FOUR_SLOT_MAX_PAGES) {
    throw new ComposeError(`the activity menu would need page ${record.pages.length + 1}, and a counter of `
      + 'two digits is not composed');
  }
  // The picture a page of one activity draws is built by content per look, section 334, and checked
  // against the second route section 316 found it by, the working screens' own one command background
  // through base slot 14, wherever that route answers: two routes with nothing in common but the bytes.
  const menuChrome = fourSlotMenuChrome(c, 'activity menu');
  const working = activityMenuSingle(c);
  if (working !== undefined && menuChrome.one !== undefined && working !== menuChrome.one) {
    throw new ComposeError(`the activity menu's page of one activity would draw ${menuChrome.look}'s picture and `
      + 'the working screens of one command draw another');
  }
  if (full && menuChrome.one === undefined) {
    throw new ComposeError("the activity menu's last page is full, and the configuration holds no picture a page "
      + `of one activity draws in ${menuChrome.look}`);
  }

  // The label's font: the one in effect at the closing bar of the page being grown, which is its
  // existing label's, unless that font cannot spell the name. **One font per page** is the compiler's
  // rule, 5 of 5 full pages on the four arch 14 configurations drawing both labels in one, and the
  // Harmony 700's last page is why it is read off that page and not the first: its lone label is in a
  // smaller font than the menu's others, section 289. Spelled before anything moves.
  const map = characterMap(c);
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  const lastProgram = screenProgram(c, page.program) ?? [];
  const bar = lastProgram.findLastIndex((one) => one.opcode === SCREEN_DRAW_IMAGE_AT);
  const preferred = lastProgram.slice(0, bar < 0 ? 0 : bar)
    .findLast((one) => one.opcode === SCREEN_SELECT_FONT)?.operands[0];
  if (preferred === undefined) throw new ComposeError("the activity menu's last page selects no label font");
  const font = fontThatSpells(c, map, label, preferred);
  const fontSet = (fontSets(c) ?? [])[font];
  if (fontSet === undefined) throw new ComposeError(`the config does not carry font ${font}`);
  const codes = codesFor(map, c, fontSet, label, font);
  // The composer's own conservative limit, the width a corner layout's labels span, 3 to 125. The
  // compiler draws a name too wide for the label font whole in a smaller font, and a centred label
  // reaches 128 on one two row device list, section 289; this refuses instead.
  const wide = textWidth(c, fontSet, codes);
  if (wide > FOUR_SLOT_RIGHT_END - FOUR_SLOT_LEFT_X) {
    throw new ComposeError(`'${label}' is ${wide} pixels wide and a row holds `
      + `${FOUR_SLOT_RIGHT_END - FOUR_SLOT_LEFT_X}: give it a shorter label`);
  }

  // 1. The row lists: select the entry, write 0 into the marker. One per button on the page and one
  // per button on its copy, identical, below base slot 10's table with their pointers appended. A new
  // page puts the row on the top row, so two buttons either way.
  const scans = [...(FOUR_SLOT_ROWS[full ? 0 : layout.used] as readonly number[])];
  const rowLists = 2 * scans.length;
  const actionSlot = archSlot(14, ACTION_TABLE_SLOT);
  const actionTable = c.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const rowList = actionTable.values.length;
  const oneRow = activityRowListBody(set, marker.opcode);
  const rowAt = actionTable.start;
  const rowHole = relocate(c, rowAt, oneRow.length * rowLists);
  for (let k = 0; k < rowLists; k += 1) rowHole.bytes.set(oneRow, rowAt + k * oneRow.length);
  let current = parse(appendTableEntries(parse(rowHole.bytes), actionSlot,
    Array.from({ length: rowLists }, (_, k) => c.flashBase + rowAt + k * oneRow.length)));

  // 2. The page grows by the row, its copy first, and a page that held one activity takes the
  // picture its menu's full pages draw. Or a full page gets a page after it holding the row, and every
  // page counts to the new total: in the menu's own counter font where a page draws one, and otherwise
  // in the device mode pages' counter font, which is the menu's on all 7 multi page menus, section 316.
  const grown = full
    ? openFourSlotMenuPage(current, menu, 'activity menu', rowList, codes, font,
      fourSlotTemplate(current, undefined).counterFont)
    : growFourSlotMenu(current, menu, 'activity menu', rowList, codes, font);
  if (grown.bound !== rowLists) {
    throw new ComposeError(`${grown.bound} row lists bound against the ${rowLists} written`);
  }
  current = grown.container;
  const pageIndex = (modeRecords(current)?.[menu]?.pages.length ?? 0) - 1;
  return {
    bytes: restamped(current.blob), menu, page: pageIndex, rowList, scan: scans[0] as number, scans, rowLists,
  };
}

/*
 * ---- An activity's own screens, Harmony 600, 650 and 700 (arch 14), section 290 ----
 *
 * The same two screens as on the Harmony One and a different arrangement of both. The **start up**
 * screen is the activity's own here rather than shared: "Starting" and the activity's name above the
 * three fixed lines, one per activity, 13 of 13 on the four arch 14 user configurations. The
 * **working** screen is a device mode page with a different word at the bottom, "Devices" where a
 * device's says "Back", two backgrounds of its own, and on the 650 and 700 its own operand for the
 * queued `0x73` at the top. Four records of base slot 14 are keyed by the
 * activity rather than one, each of which gains a case:
 *
 * - the working screen's: activity to "enter its working screen", naming the screen the start
 *   sequence ends on, 13 of 13, and the idle value to a further record. What reaches it is the one case,
 *   for 0, of a record keyed by `CurrentLocation`, and that record is what the centre key under a device list
 *   evaluates, 21 device lists of 21, which write "Activity" or "Activities" above that key;
 * - the key under Devices', which the working screen's own record names, and a second one with the same
 *   cases: activity to a device list of its own, saying "Activity" at the bottom, and the idle value
 *   to the one saying "Activities", each holding every device;
 * - the binding set's: activity to "select its keypad map", with no idle case.
 *
 * **What is not composed, and it is deliberate**: the help screen and the Remote Assistant's question.
 * Every real activity on the 650, `calibration_h600` and the 700 reaches its working screen through
 * the Remote Assistant's branch, and `h600_config`'s reach it directly, `[3F D000, 7E working]`. That
 * second form is the one a composed activity takes. **Nor is the activity's own device list, here**:
 * the key under Devices of a composed activity opens the idle value's, the one saying "Activities", its
 * case built as `caseProgram` on `idleDeviceList` since section 336, and `composeActivityDeviceList` then
 * gives it a list of its own, section 294, built since section 352. Its centre
 * key leads back to the composed activity's working screen either way, through `CurrentLocation` and
 * the working screen record.
 *
 * **Since section 336 both screens and the four cases are built, `activityScreenChrome`**, where until
 * then the start up screen's picture, font and fixed lines and the working screen's chrome, backgrounds
 * and record were copied off the configuration's own activities. The start up font is still read,
 * `todo-compile-650.md` 6.2.12's.
 *
 * **A name is spelled in the fonts the configuration has**, and each holds only the letters its own
 * texts use. The start up title's font is the one every start up title is drawn in, and the status and
 * battery messages too, so a name with a letter none of those has is refused, "Watch TV" on
 * `h600_config` for its W.
 */

/** "Starting", then the name, at y 5 and centred, 13 of 13. */
const STARTUP_TITLE_PREFIX = 'Starting ';

export const STARTUP_TITLE_Y = 5;

/**
 * The widest title a start up screen draws on one line, **126 pixels**, `Starting Plasma kijken` on
 * Logitech's two compiles of the Harmony 650's test setup, `h650_test_config` and its clean twin,
 * section 358. A longer one wraps onto a second line at y 19, `STARTUP_TITLE_SECOND_Y`, and since
 * section 323 that is composed: the words break greedily at this width and each line is centred on
 * its own, which reproduces both titles the Logitech compiles wrap, `Starting Watch a` over `Movie` and
 * `Starting Play Audio` over `Cassette`, at the x they are drawn at. **126 is the Harmony 650's and is
 * applied to the 600 and 700 by assumption**: per model, the widest title on one line against the
 * narrowest broken is 116 against 130 on the Harmony 600, 123 against 163 on the 700, and 126 against
 * 130 on the 650, whose 130, "Démarrage de Console", and a kept first line of 126 come from the French
 * compile `h650_issue8_config`. So on the 650 the break starts somewhere from 127 to 130, which is not
 * known, and this keeps the widest one line title measured. **It was 123 until section 358**, the widest of the 13
 * compiles section 336 read, `Starting Watch Bluray`; the composer then broke `Starting Plasma kijken`
 * over two lines where Logitech draws one, on every file this project composed with Plasma kijken in
 * it, a difference the setup comparison does not look at.
 */
export const STARTUP_TITLE_MAX = 126;

export const STARTUP_TITLE_SECOND_Y = 19;

/**
 * Below the title every start up screen draws the same three lines, each centred in the start up font,
 * at y 82, 96 and 110, which is that font's height apart: 40 start up screens of 40 on the thirteen
 * compiles, section 336. Built rather than copied off another activity's screen since then. **Fitted**:
 * every compile here draws them in English, so what a remote set to another language draws is not known,
 * and the places are measured for a start up font 14 high only, which `startupParts` refuses otherwise.
 */
const STARTUP_FIXED_LINES: readonly string[] = ['Please keep the', 'remote pointed at', 'your system'];

export const STARTUP_FIXED_LINE_Y: readonly number[] = [82, 96, 110];

/** The word under the working screen's centre key, which goes to the device list, section 290. */
const WORKING_SCREEN_WORD = 'Devices';

/** The four records keyed by the activity, by what their cases do. */
interface ActivityMaps {
  working: number;
  devices: number[];
  select: number;
}

/**
 * The base slot 14 records keyed by the activity, found by their keys and what their cases queue: every
 * activity and the idle value, activities entering a mode and the idle value not, is the working
 * screen's; the same keys all entering a mode are the key under Devices'; every activity and not the idle
 * value, each selecting that activity's own keypad map, is the binding set's. One, one or more, and
 * one, on 13 of 13, and anything else is refused rather than guessed at.
 *
 * **The key sets are generated from the counter**, section 329, `todo-compile-650.md` 6.2.5, rather than
 * taken from the activities the start lists hold: the counter's values are 0 to its maximum, one of
 * them, its starting value, is the idle value and every other is an activity, section 273. The
 * activities the start lists hold are checked against that, and so is the counter's name, which is
 * generated from its maximum, and the stored order of every record found, which is
 * `compilerCaseOrder`'s. On the thirteen compiles all three hold, and the counter's record is
 * `activityStateVariables`' exactly, the idle value at the maximum.
 *
 * **What is still read is which record is which**, by what its cases do, since the records' indices
 * are the description's order and nothing generates that yet, section 324. So a configuration with no
 * activity is refused here: its records would hold the idle case alone, nothing tells the working
 * screen's from the key under Devices' by keys, and no user configuration of a Harmony 600, 650 or
 * 700 without an activity exists here to show what such a configuration holds.
 *
 * **The order check pins nothing beyond ascending** on the thirteen, whose keys here are 0 to at most 5,
 * where `compilerCaseOrder` is ascending; past key 15 the order is unpinned and refused.
 */
export function activityMaps(c: Container, starts: Arch14Starts): ActivityMaps {
  const maps = valueMaps(c);
  if (maps === undefined) throw new ComposeError('base slot 14 does not read');
  const counter = stateVariables(c).find((one) => one.index === starts.counter);
  const highest = counter?.record?.second;
  if (counter === undefined || highest === undefined || starts.idle > highest) {
    throw new ComposeError(`the ${ACTIVITY_STATE_NAME} variable does not read as a counter with its idle value in range`);
  }
  // The counter's name, generated: its stem and its number of values, section 86.
  const named = stateVariableName(COUNTER_STEM, highest);
  if (counter.name !== named) {
    throw new ComposeError(`the activity counter is named ${counter.name}, and one of maximum ${highest} is ${named}`);
  }
  // The key sets, generated from the counter alone, then the start lists checked against them.
  const everything = Array.from({ length: highest + 1 }, (_, k) => k);
  const activities = everything.filter((value) => value !== starts.idle);
  const held = [...starts.startup.keys()].sort((a, b) => a - b);
  if (held.join() !== activities.join()) {
    throw new ComposeError(`the counter states activities ${activities.join(', ') || 'none'} and the start lists `
      + `hold ${held.join(', ') || 'none'}`);
  }
  if (activities.length === 0) {
    throw new ComposeError('no activity here, so the records keyed by the activity cannot be told apart');
  }
  const same = (keys: number[], want: number[]): boolean =>
    keys.length === want.length && [...keys].sort((a, b) => a - b).every((key, k) => key === want[k]);
  const working: number[] = [];
  const devices: number[] = [];
  const select: number[] = [];
  maps.forEach((map, index) => {
    if (map.ranges.length !== 0) return;
    const keys = map.entries.map(([key]) => key);
    const queued = new Map(map.entries.map(([key, target]) => [key, caseQueued(c, target)]));
    const enters = (key: number): boolean => queued.get(key)?.opcode === ENTER_MODE;
    if (same(keys, everything) && activities.every(enters)) {
      (enters(starts.idle) ? devices : working).push(index);
    } else if (same(keys, activities) && activities.every((key) => {
      const one = queued.get(key);
      return one?.opcode === SELECT_BINDING_SET && one.operand === (SELECT_BINDING_SET_MASK | (starts.sets.get(key) as number));
    })) {
      select.push(index);
    }
  });
  if (working.length !== 1 || devices.length === 0 || select.length !== 1) {
    throw new ComposeError(`the activity keyed records read as ${working.length} working screen, `
      + `${devices.length} Devices key and ${select.length} keypad map records, not 1, some and 1`);
  }
  // Each record's stored order, generated and compared: a record in another order is not one whose
  // order an appended case keeps the compiler's.
  for (const index of [...working, ...devices, ...select]) {
    const keys = (maps[index]?.entries ?? []).map(([key]) => key);
    if (caseOrderOf(keys)?.join() !== keys.join()) {
      throw new ComposeError(`base slot 14 record ${index} holds its cases in an order compilerCaseOrder does not give, or past the keys it pins`);
    }
  }
  return { working: working[0] as number, devices, select: select[0] as number };
}

/**
 * The four base slot 14 records keyed by the activity on a Harmony 600, 650 or 700, of three kinds, with every
 * check `activityMaps` makes: the start sequence against the Off key map, the key sets against the
 * counter, and the stored order against the compiler's. Exported for the calibration, section 329.
 */
export function activityKeyedRecords(c: Container): { working: number; devices: number[]; select: number } {
  if (c.architecture !== 14) throw new ComposeError('the activity keyed records are the Harmony 600, 650 and 700\'s alone');
  return activityMaps(c, arch14Starts(c));
}

/** The activity counter's stem, `CurrentActivityState_0`, as `activityStateVariables` names it. */
const COUNTER_STEM = `${ACTIVITY_STATE_NAME}_0`;

/** `compilerCaseOrder`, or undefined for a key set whose order it does not pin. */
function caseOrderOf(keys: readonly number[]): number[] | undefined {
  try {
    return compilerCaseOrder(keys);
  } catch (error) {
    if (error instanceof RangeError) return undefined;
    throw error;
  }
}

/**
 * A base slot 14 case's program as the compiler writes every one an activity keyed record holds: queue
 * one action, `0x11` and its operand and opcode, then the end, five bytes. Every case of the working
 * screen, key under Devices and keypad map records has this shape on the thirteen compiles but the
 * working screen record's idle case, which queues a further record, section 336; one derivation for the
 * composer and the check.
 */
export function caseProgram(opcode: number, operand: number): Uint8Array {
  return new Writer(5).u8(SCREEN_QUEUE_INSTRUCTION).u16(operand).u8(opcode).u8(SCREEN_END).bytes;
}

/** What an activity's own two screens are drawn with in one Harmony 600, 650 or 700 configuration. */
export interface ActivityScreenChrome {
  look: string;
  /** The start up screen's picture, one per look, located by content. */
  startupPicture: number;
  /**
   * The font a start up screen draws in, font 2 on all thirteen compiles. **Read, not built**: it is the
   * configuration's numbering of its font sets, `todo-compile-650.md` 6.2.12, and it is read off the
   * configuration's own start up screens, all of which have to agree.
   */
  startupFont: number;
  /** A start up screen's key map: the press of every keypad scan, 1 to 54, bound to nothing. */
  startupKeyMap: KeyMapEntry[];
  /** A working screen page's chrome: a device page's with its own two backgrounds, program and word. */
  working: PageFrame;
  /** A working screen's own key map: the key under Devices, and the program tag running `working.battery`. */
  workingKeyMap: KeyMapEntry[];
  /**
   * The device list the key under Devices opens while no activity runs, which is the list a composed
   * activity's case opens until it has a list of its own, `composeActivityDeviceList`, 6.2.11.
   */
  idleList: number;
}

/**
 * The font every start up screen of the configuration selects, its program's second instruction.
 * Refused where they disagree or where there is none to read, `todo-compile-650.md` 6.2.12's.
 */
function startupFontOf(c: Container, starts: Arch14Starts): number {
  const records = modeRecords(c) ?? [];
  const fonts = new Set<number>();
  for (const mode of starts.startup.values()) {
    const page = records[mode]?.pages[0];
    const select = page === undefined ? undefined : screenProgram(c, page.program)?.[1];
    if (select?.opcode !== SCREEN_SELECT_FONT) throw new ComposeError(`start up screen ${mode} selects no font where every one does`);
    fonts.add(select.operands[0] as number);
  }
  if (fonts.size !== 1) {
    throw new ComposeError(`the start up screens select ${fonts.size} fonts, so none is the start up font`);
  }
  return [...fonts][0] as number;
}

/**
 * The start up screen's picture, one per look, located by content: what every start up screen draws
 * under its title, section 336, and All Off's working screen too, section 356. Refused where the
 * configuration holds it more than once or not at all.
 */
export function startupPicture(c: Container): number {
  const look = DEVICE_PAGE_LOOKS.find((one) => one.name === deviceModeChrome(c).look) as DevicePageLook;
  return startupPictureIn(look, picturesByContent(c));
}

function startupPictureIn(look: DevicePageLook, pictures: Map<string, number[]>): number {
  const found = pictures.get(look.startup) ?? [];
  if (found.length > 1) throw new ComposeError(`${look.name}'s start up picture is stored ${found.length} times`);
  if (found[0] === undefined) throw new ComposeError(`the configuration holds no start up picture of ${look.name}`);
  return found[0];
}

/**
 * An activity's start up screen and working screen chrome on a Harmony 600, 650 or 700, built,
 * `todo-compile-650.md` 6.2.10, section 336:
 *
 * * **the start up screen** draws its look's `startup` picture at 0, 0, selects the start up font, draws
 *   "Starting" and the name, broken at `STARTUP_TITLE_MAX` and each line centred, and below it the three
 *   `STARTUP_FIXED_LINES`, each centred; its record binds the press of every keypad scan to nothing, in
 *   `compilerTagOrder`'s order, and its one page binds nothing;
 * * **the working screen** is a device mode page's chrome, `deviceModeChrome`, with three differences:
 *   the backgrounds, the activity menu's page of one activity for a page of one command or none and the
 *   look's `workingSeveral` for more; the queued program, the activity menu's battery program,
 *   `fourSlotMenuChrome`; and the word, "Devices", in the bottom word font and centred, `bottomWord`. Its
 *   record maps the key under Devices as a device mode does, `devicesKeyOperand`, and runs the queued
 *   program under the program tag;
 * * **the key under Devices** of a composed activity opens the idle device list, `idleDeviceList`, as a
 *   `caseProgram`.
 *
 * Then every start up screen, every working screen page and every case of the activity keyed records
 * the configuration holds is checked against what is built, `checkActivityScreens`, so a configuration
 * whose own screens disagree is refused rather than extended. What is still read: the start up font,
 * 6.2.12's; the queued program, the Devices key operand and the idle list, each off the activity menu
 * by the routes of sections 330 and 334 rather than off another activity's screen; and the pictures' and
 * texts' addresses, since the bytes are the configuration's until chapter 9 builds them.
 */
export function activityScreenChrome(c: Container): ActivityScreenChrome {
  if (c.architecture !== 14) {
    throw new ComposeError('an activity\'s screens are built here for the Harmony 600, 650 and 700 only');
  }
  const device = deviceModeChrome(c);
  const menu = fourSlotMenuChrome(c, 'activity menu');
  const look = DEVICE_PAGE_LOOKS.find((one) => one.name === device.look) as DevicePageLook;
  const pictures = picturesByContent(c);
  const held = (key: string, role: string): number | undefined => {
    const found = pictures.get(key) ?? [];
    if (found.length > 1) throw new ComposeError(`${look.name}'s ${role} picture is stored ${found.length} times`);
    return found[0];
  };
  const startupPicture = startupPictureIn(look, pictures);
  if (menu.battery === undefined) throw new ComposeError('the activity menu queues no battery program');
  const battery = menu.battery;
  const word = bottomWord(c, WORKING_SCREEN_WORD);
  const starts = arch14Starts(c);
  const press = (scan: number): number => (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | scan;
  const keypad = Array.from({ length: KEYPAD_LAST_SCAN - KEYPAD_FIRST_SCAN + 1 }, (_, k) => press(KEYPAD_FIRST_SCAN + k));
  const devicesKey = devicesKeyOperand(c);
  const chrome: ActivityScreenChrome = {
    look: look.name,
    startupPicture,
    startupFont: startupFontOf(c, starts),
    startupKeyMap: compilerTagOrder(keypad).map((tag) => ({ tag, operand: 0, opcode: 0 })),
    working: {
      look: look.name,
      single: held(look.activitiesSingle, 'working screen one command'),
      crossed: held(look.workingSeveral, 'working screen'),
      topBar: device.topBar, bottomBar: device.bottomBar, battery,
      word: WORKING_SCREEN_WORD, backFont: word.font, backCodes: word.codes, backX: word.x,
      backHome: inlineHomes(c).get(word.codes.join(',')),
    },
    workingKeyMap: compilerTagOrder([DEVICES_KEY_TAG, DEVICE_MODE_PROGRAM_TAG]).map((tag) => (tag === DEVICES_KEY_TAG
      ? { tag, operand: devicesKey, opcode: MAP_VALUE_OPCODE }
      : { tag, operand: battery, opcode: RUN_SCREEN_PROGRAM })),
    idleList: idleDeviceList(c),
  };
  checkActivityScreensWith(c, chrome, starts);
  return chrome;
}

/**
 * A start up screen built, as parts: the picture, the font, the title "Starting" and `label` broken
 * greedily at `STARTUP_TITLE_MAX` onto at most two lines at y 5 and 19, each centred, then the three
 * fixed lines, each centred, and the end. A title that does not fit two lines is refused.
 */
function startupParts(c: Container, chrome: ActivityScreenChrome, label: string): MenuPart[] {
  return fixedLineScreenParts(c, chrome.startupPicture, chrome.startupFont, STARTUP_TITLE_PREFIX + label);
}

/**
 * The screen a start up screen is, with any title: the picture, the font, the title broken greedily at
 * `STARTUP_TITLE_MAX` onto at most two lines at y 5 and 19, each centred, the three fixed lines, each
 * centred, and the end. `startupParts` gives it "Starting" and an activity's name; All Off's working
 * screen, "Turning system off", is the same screen with its own title, section 356.
 */
export function fixedLineScreenParts(c: Container, picture: number, font: number, title: string): MenuPart[] {
  const map = characterMap(c);
  const set = (fontSets(c) ?? [])[font];
  if (map === undefined) throw new ComposeError('the config draws no text this can spell from');
  if (set === undefined) throw new ComposeError(`the config does not carry font ${font}`);
  // The fixed lines' places are measured, not derived: 14 apart, which is font 2's height on all thirteen
  // compiles. A start up font of another height has no measured places, so it is refused.
  if (set.height !== (STARTUP_FIXED_LINE_Y[1] as number) - (STARTUP_FIXED_LINE_Y[0] as number)) {
    throw new ComposeError(`the start up font is ${set.height} high, and the fixed lines are measured only for one 14 high`);
  }
  const codesOf = (text: string): number[] => codesFor(map, c, set, text, font);
  const widthOf = (text: string): number => textWidth(c, set, codesOf(text));
  const lines: string[] = [];
  for (const word of title.split(' ')) {
    const last = lines.at(-1);
    if (last !== undefined && widthOf(`${last} ${word}`) <= STARTUP_TITLE_MAX) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  if (lines.length > 2 || lines.some((line) => widthOf(line) > STARTUP_TITLE_MAX)) {
    throw new ComposeError(`'${title}' does not fit a start up screen's two lines of `
      + `${STARTUP_TITLE_MAX} pixels: give the activity a shorter label`);
  }
  const centred = (text: string, y: number, role: 'title' | 'fixed'): MenuPart => ({
    op: 'text', x: Math.floor((FOUR_SLOT_SCREEN_WIDTH - widthOf(text)) / 2), y, codes: codesOf(text), role,
  });
  return [
    { op: 'image', address: picture },
    { op: 'font', font },
    ...lines.map((line, k) => centred(line, k === 0 ? STARTUP_TITLE_Y : STARTUP_TITLE_SECOND_Y, 'title')),
    ...STARTUP_FIXED_LINES.map((line, k) => centred(line, STARTUP_FIXED_LINE_Y[k] as number, 'fixed')),
    { op: 'end' },
  ];
}

/** A key map against the built one, entry for entry in the narrow form; the first difference, or undefined. */
function keyMapDifference(entries: readonly TaggedEntry[], built: readonly KeyMapEntry[]): string | undefined {
  if (entries.length !== built.length) return `${entries.length} entries where ${built.length} are built`;
  const k = entries.findIndex((entry, at) => {
    const want = built[at] as KeyMapEntry;
    return entry.tag !== want.tag || entry.opcode !== want.opcode || entry.operand !== want.operand || entry.flags !== undefined;
  });
  return k < 0 ? undefined : `entry ${k}, tag 0x${(entries[k] as TaggedEntry).tag.toString(16)}, is not the built one`;
}

/** What `checkActivityScreens` checked: start up screens, working screens and their pages, and cases. */
export interface ActivityScreensChecked {
  startups: number;
  working: number;
  workingPages: number;
  cases: number;
}

/**
 * Every activity's two screens and every case of its keyed records against what `activityScreenChrome`
 * builds, refused with the first difference:
 *
 * * each start up screen whole: its record's key map, one page binding nothing in the two byte empty
 *   list, its page record, and its program part for part against `startupParts` built from the
 *   activity's name, every text drawn by reference pointing at the compiler's one inline copy of it and
 *   every text drawn inline being that copy;
 * * each working screen's key map, and every page's chrome, `checkPageFrames`: the middle, the title,
 *   counter and labels, is section 323's and is not checked here;
 * * every case of the working screen record, the two records under the key under Devices and the keypad
 *   map record, byte for byte a `caseProgram`. Of the operands, an activity's working screen case is
 *   checked to enter the mode its start sequence ends on, `Arch14Starts.endsOn`, and both Devices
 *   records' idle case to enter `idleDeviceList`'s list; an activity's two Devices cases are held to one
 *   list, the same in both, an activity device list no other activity's case enters or the idle list for
 *   a composed activity without its own yet, which list being section 294's and read; and the keypad map
 *   case's entry is `activityKeyedRecords`' requirement. The working screen record's idle case queues a
 *   further record and is not built.
 */
export function checkActivityScreens(c: Container, chrome: ActivityScreenChrome): ActivityScreensChecked {
  return checkActivityScreensWith(c, chrome, arch14Starts(c));
}

function checkActivityScreensWith(c: Container, chrome: ActivityScreenChrome, starts: Arch14Starts): ActivityScreensChecked {
  const maps = activityMaps(c, starts);
  const records = modeRecords(c) ?? [];
  const values = valueMaps(c) ?? [];
  const homes = inlineHomes(c);
  // The name a start up screen is titled with is the one its working screen is titled with on every
  // page, 40 activities of 40 on the thirteen compiles, and the menu's name for it where the menu
  // resolves one, which it does not for every composed activity.
  const named = new Map(activityNames(c).flatMap((one) => (one.name === undefined ? [] : [[one.activity, one.name] as const])));
  const strings = screenStrings(c, characterMap(c));
  const titleOf = (mode: number): string | undefined => {
    const titles = new Set((records[mode]?.pages ?? []).map((page) => strings.find((one) => one.program === page.program
      && one.x === FOUR_SLOT_TITLE_XY[0] && one.y === FOUR_SLOT_TITLE_XY[1])?.text));
    return titles.size === 1 ? [...titles][0] : undefined;
  };
  const caseBytes = (map: number, key: number): string => {
    const target = values[map]?.entries.find(([one]) => one === key)?.[1];
    const at = target === undefined ? undefined : c.blobOffsetOf(target);
    return at === undefined ? 'none' : [...c.blob.subarray(at, at + 5)].join(',');
  };
  const expect = (map: number, key: number, opcode: number, operand: number, what: string): void => {
    if (caseBytes(map, key) !== [...caseProgram(opcode, operand)].join(',')) {
      throw new ComposeError(`record ${map}'s case for ${key} is not the built ${what}`);
    }
  };
  const checked: ActivityScreensChecked = { startups: 0, working: 0, workingPages: 0, cases: 0 };
  const activityLists = new Set(fourSlotMenus(c).filter((one) => one.kind === 'activity device list').map((one) => one.menu));
  const listsTaken = new Set<number>();
  for (const [activity, mode] of [...starts.startup].sort((a, b) => a[0] - b[0])) {
    // The working screen this activity's start ends on, whose title names it.
    const target = values[maps.working]?.entries.find(([key]) => key === activity)?.[1];
    const working = target === undefined ? undefined : caseQueued(c, target);
    if (working?.opcode !== ENTER_MODE || working.operand !== starts.endsOn.get(activity)) {
      throw new ComposeError(`activity ${activity}'s working screen case does not enter the screen its start sequence ends on`);
    }
    const name = titleOf(working.operand);
    if (name === undefined || (named.has(activity) && named.get(activity) !== name)) {
      throw new ComposeError(`activity ${activity}'s working screen pages are not titled with one name, the menu's`);
    }

    const where = `activity ${activity}'s start up screen ${mode}`;
    const record = records[mode];
    const page = record?.pages[0];
    if (record === undefined || page === undefined || record.pages.length !== 1) {
      throw new ComposeError(`${where} is not one page`);
    }
    const listAt = c.blobOffsetOf(page.list);
    const keys = keyMapDifference(record.entries, chrome.startupKeyMap);
    if (keys !== undefined) throw new ComposeError(`${where}'s key map: ${keys}`);
    if (listAt === undefined || c.blob[listAt] !== 0 || c.blob[listAt + 1] !== 0) {
      throw new ComposeError(`${where}'s page binds something, or not in the two byte empty list`);
    }
    const program = screenProgram(c, page.program) ?? [];
    const difference = partsDifference(c, startupParts(c, chrome, name), program) ?? pageRecordDifference(c, page);
    if (difference !== undefined) throw new ComposeError(`${where}: ${difference}`);
    assertTextsAtHome(c, homes, program, where);
    checked.startups += 1;

    // The working screen, and the four records' cases for the activity.
    expect(maps.working, activity, ENTER_MODE, working.operand, 'working screen case');
    const workingKeys = keyMapDifference(records[working.operand]?.entries ?? [], chrome.workingKeyMap);
    if (workingKeys !== undefined) throw new ComposeError(`activity ${activity}'s working screen's key map: ${workingKeys}`);
    checked.workingPages += checkPageFrames(c, chrome.working, [working.operand], 'working screen');
    checked.working += 1;
    // Which list it is, is read: an activity's own corner list, section 294, held by no other activity,
    // or the idle list where `composeActivityDeviceList` has not yet given a composed activity its own.
    const own = values[maps.devices[0] as number]?.entries.find(([key]) => key === activity)?.[1];
    const ownList = own === undefined ? undefined : caseQueued(c, own);
    if (ownList?.opcode !== ENTER_MODE
        || (ownList.operand !== chrome.idleList && (!activityLists.has(ownList.operand) || listsTaken.has(ownList.operand)))) {
      throw new ComposeError(`activity ${activity}'s case under the key under Devices enters neither a device list of its own nor the idle one`);
    }
    if (ownList.operand !== chrome.idleList) listsTaken.add(ownList.operand);
    for (const map of maps.devices) expect(map, activity, ENTER_MODE, ownList.operand, 'device list case');
    expect(maps.select, activity, SELECT_BINDING_SET, SELECT_BINDING_SET_MASK | (starts.sets.get(activity) as number),
           'keypad map case');
    checked.cases += 2 + maps.devices.length;
  }
  for (const map of maps.devices) {
    expect(map, starts.idle, ENTER_MODE, chrome.idleList, 'idle device list case');
    checked.cases += 1;
  }
  return checked;
}

export function composeFourSlotActivityScreen(
  c: Container, activity: number, label: string, rows: readonly ComposeRow[],
  options: WithChoices<ComposeActivityScreenOptions, FourSlotChoices>,
): ComposedActivityScreen {
  const choices = options.choices ?? FOUR_SLOT_CHOICES;
  const starts = arch14Starts(c);
  if (starts.startup.has(activity) || activity === starts.idle) {
    throw new ComposeError(`activity ${activity} already has a working screen`);
  }
  const maps = activityMaps(c, starts);
  // The new activity's value is generated, one past the counter's highest, section 273, and the four
  // records gain its case at their end, which keeps them in the compiler's order only while that order
  // is ascending, as it is for every key below 16: so both are checked before anything moves.
  if (activity !== nextActivityValue(c)) {
    throw new ComposeError(`activity ${activity} is not the next one, ${nextActivityValue(c)}: one past the counter's highest`);
  }
  for (const map of [maps.working, ...maps.devices, maps.select]) {
    const keys = [...(valueMaps(c)?.[map]?.entries ?? []).map(([key]) => key), activity];
    if (caseOrderOf(keys)?.join() !== keys.join()) {
      throw new ComposeError(`a case for ${activity} appended to record ${map} is out of compilerCaseOrder's order, or past the keys it pins`);
    }
  }
  if (options.startupLike !== undefined) {
    throw new ComposeError('every start up screen on a Harmony 600, 650 or 700 draws one picture, so there is '
      + 'no other activity\'s to show: startupLike is the Harmony One\'s');
  }
  // Both screens and the cases are built, section 336, and the configuration's own are checked against
  // what is built before anything moves.
  const chrome = activityScreenChrome(c);
  const device = fourSlotTemplate(c, undefined);
  const charMap = characterMap(c);
  if (charMap === undefined) throw new ComposeError('the config draws no text this can spell from');
  const setOf = (font: number, now: Container = c): FontSet => {
    const set = (fontSets(now) ?? [])[font];
    if (set === undefined) throw new ComposeError(`the config does not carry font ${font}`);
    return set;
  };
  // The start up screen, built here once so that a title too wide is refused before anything moves.
  startupParts(c, chrome, label);

  // The working screen's text, refused before anything moves.
  const perPage = FOUR_SLOT_ITEMS.length;
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
  if (pageCount > 9) throw new ComposeError('a page counter of two digits is not composed');
  const titleCodes = codesFor(charMap, c, setOf(device.titleFont), label, device.titleFont);
  const titleWidth = textWidth(c, setOf(device.titleFont), titleCodes);
  const titleRoom = (pageCount > 1 ? fourSlotCounterX(c)[0] : FOUR_SLOT_SCREEN_WIDTH) - FOUR_SLOT_TITLE_XY[0];
  if (titleWidth > titleRoom) {
    throw new ComposeError(`'${label}' is ${titleWidth} pixels wide and the working screen's title holds ${titleRoom}`);
  }
  // Each label broken the way the compiler breaks a corner label, section 323: one line or two.
  // A label too wide for its corner goes down a size or is refused, `FourSlotChoices.labelTooWide`.
  const smaller = choices.labelTooWide === 'refuse' ? [] : smallerLabelFonts(c, charMap, device.labelFont,
    new Set([device.titleFont, device.counterFont, device.device.backFont]));
  const rowLabels = rows.map((row) =>
    fourSlotLabelLines(charMap, c, setOf(device.labelFont), device.labelFont, row.label, smaller));
  const rowLines = rowLabels.map((one) => one.lines);
  const existingLists = c.actionLists()?.length ?? 0;
  for (const row of rows) {
    if (!Number.isInteger(row.list) || row.list < 0 || row.list >= existingLists) {
      throw new ComposeError(`'${row.label}' names list ${row.list} of ${existingLists} that exist`);
    }
  }
  const digitCodes = (n: number): number[] =>
    codesFor(charMap, c, setOf(device.counterFont), String(n), device.counterFont);
  const slashCodes = codesFor(charMap, c, setOf(device.counterFont), '/', device.counterFont);
  const pageRows = Array.from({ length: pageCount }, (_, p) => rows.slice(p * perPage, (p + 1) * perPage));
  const needs = new Set(pageRows.map((onPage) => onPage.length > 1));
  if ((needs.has(false) && chrome.working.single === undefined) || (needs.has(true) && chrome.working.crossed === undefined)) {
    throw new ComposeError(`the configuration holds no working screen background of ${chrome.look} for a page of `
      + `${needs.has(false) && chrome.working.single === undefined ? 'one command or none' : 'several commands'}`);
  }

  const table = modeTable(c);
  if (table === undefined) throw new ComposeError('base slot 6 states no table');
  const startupMode = table.addresses.length;
  const mode = startupMode + 1;
  const sets = handlerSets(c);
  if (sets === undefined) throw new ComposeError('base slot 9 does not read');
  const set = sets.addresses.length;

  // 1. The start up screen: the built key map, one page with an empty list, and the built program, every
  // text pointing at the compiler's one inline copy of it where the configuration holds one.
  const startupPointed: ReadonlySet<string> = new Set(['title', 'fixed']);
  let current = appendArch14Mode(c, startupMode, chrome.startupKeyMap, [fourSlotPageList([])], (now) => {
    const parts = startupParts(now, activityScreenChrome(now), label);
    const homes = inlineHomes(now);
    return [{
      length: menuPageBytes(parts, homes, startupPointed, (address) => address).length,
      build: (shifted) => menuPageBytes(parts, homes, startupPointed, shifted),
    }];
  });

  // 2. The working screen: a device mode page's program with the working screen's built chrome and
  // backgrounds, and the working screen's built key map.
  const pageListBytes = pageRows.map((onPage) => fourSlotPageList(onPage.map((row) => row.list)));
  current = appendArch14Mode(current, mode, chrome.workingKeyMap, pageListBytes, (now) => {
    const freshDevice = fourSlotTemplate(now, undefined);
    const working = activityScreenChrome(now).working;
    const template: FourSlotTemplate = {
      ...freshDevice, chrome: builtChrome(working), single: working.single, crossed: working.crossed,
    };
    const measuring = setOf(device.labelFont, now);
    return pageRows.map((onPage, p) => fourSlotPageProgram(now, template, measuring, {
      titleCodes,
      counter: pageCount > 1 ? [digitCodes(p + 1), slashCodes, digitCodes(pageCount)] : undefined,
      labels: onPage.map((_, k) => (rowLines[p * perPage + k] as number[][])[0] as number[]),
      second: onPage.map((_, k) => (rowLines[p * perPage + k] as number[][])[1]),
      fonts: onPage.map((_, k) => (rowLabels[p * perPage + k] as { font: number }).font),
    }));
  });

  // 3. The four cases, each a built `caseProgram`. The key under Devices opens the idle device list, the
  // one shown when no activity is running, until `composeActivityDeviceList` gives the activity its own.
  const idleList = idleDeviceList(current);
  current = appendValueMapCase(current, maps.working, activity, caseProgram(ENTER_MODE, mode));
  for (const map of maps.devices) current = appendValueMapCase(current, map, activity, caseProgram(ENTER_MODE, idleList));
  current = appendValueMapCase(current, maps.select, activity,
                               caseProgram(SELECT_BINDING_SET, SELECT_BINDING_SET_MASK | set));

  return {
    bytes: restamped(current.blob), activity, mode, startupMode, map: maps.working, scans: [],
    startVariable: starts.startVariable, flagVariable: starts.flagVariable, set,
    maps: [maps.working, ...maps.devices, maps.select], pages: pageCount,
  };
}
