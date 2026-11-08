/**
 * A configuration's devices as it states them: an infrared group per device, named from the state variables, the
 * device list or the device mode's title, the device list's rows, and the codes each action list sends. Part of the
 * inventory, `inventory.ts`, whose docstring says why the names are handed back and never quoted.
 */
import { STATE_WRITE_BASE } from '../container/actions.ts';
import { Container, type Instruction, type PerArchitecture } from '../container/gspm.ts';
import {
  ACTION_LIST_INDEX_OPCODE, type ModeRecord, modeRecords, stateRecords, taggedList,
} from '../container/sections.ts';
import { irGroups } from '../infrared/ir.ts';
import { characterMap, screenStrings } from '../screens/text.ts';
import { activityNames } from './activities.ts';
import { INFRARED_GROUP_SHIFT, SHORTEST_USEFUL_LABEL } from './common.ts';
import { gridCellAt, type LabelGrid, labelGridOf } from './cornerlayout.ts';
import { BEEP_OPCODE, ENTER_MODE, SEND_INFRARED } from './instructions.ts';
import { pairLabelsToGroups } from './keys.ts';
import { deviceVariables } from './statevariables.ts';

/** One device: an infrared group, and the name the config gives it. */
export interface Device {
  /**
   * Index into base slot 5's group array, which is the device's identity when it sends infrared.
   * Section 86. **Undefined for a device that sends nothing**, which the remote lists all the same:
   * the Wii in a protocol campaign compile has a row on the device list, a device mode of its own,
   * and not one infrared code, and until 1 September 2026 this reader did not see it, because it
   * took the infrared groups as the population. Section 239.
   */
  group?: number;
  /** How many infrared codes it has. A group may be empty, and a device may have no group. */
  codes: number;
  /** The name, where the config states one. */
  name?: string;
  /**
   * Where that name came from, because the four routes are not equally strong:
   *
   * * `names` is base slot 0's own ASCII, tied to this group by the variable's transitions. Stated.
   * * `elimination` is the one label left over for the one group left over. Forced, not read.
   * * `screen` is the title the device's own mode draws, decoded from glyph pixels. Last resort.
   * * `list` is the label drawn on the device's row of the device list, decoded the same way. It is
   *   what the person holding the remote reads, and it is the only route that reaches a device with
   *   no infrared codes, so it fills the gaps the first three leave and overrides none of them.
   */
  source?: 'names' | 'elimination' | 'screen' | 'list';
  /** The base slot 13 variables whose name carries this device's label. */
  variables: number[];
  /**
   * The mode the device list enters for this device, as a base slot 6 index. Arch 12 (Harmony One)
   * only, since the row shape it is read from is that model's, and undefined where no row reaches
   * the device.
   */
  mode?: number;
}

/**
 * Every device the config drives, with its name.
 *
 * **The name is stated, and it took a detour to see where.** Base slot 0 names no devices: its level
 * 1 nodes are state variables, and a device's label is only ever a **prefix** of one, `TV_Power_2`.
 * So the label is in the file in ASCII and nothing says which infrared group it belongs to. The link
 * is base slot 13: a variable's record carries its transitions, each holding one action list
 * instruction, section 86, and for a device's `Power` or `Input` variable that list is the one that
 * **sends the code**. So the group is `0x7D`'s own operand, reached from the variable that names it.
 *
 * That is route one and it is exact: 37 of 37 labels across eleven containers reach exactly one
 * group, and no two labels reach the same one. Two routes fill in behind it, in this order:
 *
 * 1. **Elimination**, when exactly one label and one group are left unpaired. Forced rather than
 *    read, and it is what names the device whose only variable has no transitions, which happens when
 *    the remote knows one value for it and therefore has nothing to switch between.
 * 2. **The screen**, for a group with no label at all: the title of the device's own mode, taken only
 *    when one candidate survives. A string that already names an activity is not a candidate, which
 *    is what separates a device called `Roku` from an activity called `Watch Roku`.
 *
 * The independent closure is that the ASCII label is **drawn**: for every device route one names, the
 * label turns up in the screen text as well, and those are two encodings of one string decoded by
 * unrelated code, base slot 0's bytes against base slot 7's glyph pixels.
 */
/**
 * Whether a device list row opens with the beeper, per architecture, in a table so that the reader names an
 * architecture in one place rather than testing it inline. Arch 14 (Harmony 600, 650 and 700) is without, section
 * 285, and so is arch 8 (Harmony 880 and 885), `packages/codec/test/arch8devicelist.test.ts`: every row of every
 * device list in its eight configurations is enter a mode, then write 1 to the configuration's device mode marker,
 * as on arch 14. Every other architecture is read with the Harmony One's shape, which has it.
 *
 * **Arch 8 was read with the Harmony One's shape until `todo-compile-885.md` 1.7's follow up**, which found no row
 * there, so no device on arch 8 had a mode and no device list label reached `devices`: a group base slot 0 names
 * nothing for fell through to the top row of its own mode, which on arch 8 is mostly a command, so a bench Harmony
 * 885's CD player came back named `Pwr`, and two of the other unit's devices came back unnamed,
 * `DEVICE_MODE_TITLE_ROUTE`.
 */
const DEVICE_LIST_ROW_BEEPS: PerArchitecture<boolean> = { 8: false, 14: false };

/**
 * A device list row's shape, per architecture, or false where none is known.
 *
 * Arch 12 (Harmony One): beep, enter a mode, mark device mode. Arch 14 (Harmony 600, 650 and 700):
 * enter a mode, mark device mode, **with no beep**, which is why the Harmony One's shape found no row
 * on any arch 14 configuration and this reader reported none there until section 285. Measured on
 * all four arch 14 user configurations: every list of the two instruction shape ends in the one
 * write each configuration uses, `0x9F` operand 1 on the Harmony 650, `0x9B` on the 600 and `0xA5`
 * on both 700s, half of them bound on a device list page and the other half the lists that page's
 * second copy names, section 69. Arch 8 (Harmony 880 and 885) has the arch 14 shape, its marker a write
 * of 1 to `0x98`, `0x99`, `0x9A` or `0x9B` by configuration, `packages/codec/test/arch8devicelist.test.ts`.
 * Every other architecture is tested against the Harmony One's shape, which finds no marker on arch 9 or
 * 10 and so no row, rather than being read on its own terms.
 *
 * Exported for `menuMarkerOf` in `compose.ts`, which checks that every list of this shape writes the
 * one marker rather than taking the majority `deviceModeMarker` takes, section 329.
 */
export function isDeviceListRowShape(
  list: readonly Instruction[] | undefined, architecture: number | undefined,
): boolean {
  if (list === undefined) return false;
  if (DEVICE_LIST_ROW_BEEPS[architecture ?? -1] === false) {
    return list.length === 2
      && list[0]?.opcode === ENTER_MODE
      && (list[1] as Instruction).opcode >= STATE_WRITE_BASE;
  }
  return list.length === 3
    && list[0]?.opcode === BEEP_OPCODE
    && list[1]?.opcode === ENTER_MODE
    && (list[2] as Instruction).opcode >= STATE_WRITE_BASE;
}

/**
 * The mode a device list row enters, if `list` is a row ending in `marker`, and otherwise undefined.
 * The one test of a row, which the composer's menu finder and `deviceListRows` both use: it was two
 * copies of the same four conditions until the arch 14 shape was added, and a third shape would have
 * had to be taught to both.
 */
export function deviceListRowMode(
  list: readonly Instruction[] | undefined, architecture: number | undefined,
  marker: Instruction | undefined,
): number | undefined {
  if (marker === undefined || !isDeviceListRowShape(list, architecture)) return undefined;
  const rows = list as readonly Instruction[];
  const end = rows[rows.length - 1] as Instruction;
  if (end.opcode !== marker.opcode || end.operand !== marker.operand) return undefined;
  return (rows.find((one) => one.opcode === ENTER_MODE) as Instruction).operand;
}

/**
 * The instruction a device list row ends with, which marks the remote as being in device mode.
 *
 * **Read off the configuration rather than carried as a constant**, and that is a correction: the
 * composer hardcoded a write of 1 into state variable 24, which is what `one_config` uses, and it is
 * one of eight different variables across the fourteen configurations here that carry a device list,
 * moving between two syncs of one remote. It is unnamed in the name tree in all of them, so there is
 * nothing to look it up by. What is stable is that a config's own rows all write the same one, so the
 * majority answer over every row shaped list is the marker. Section 239.
 *
 * Undefined for a configuration with no such row, which is every architecture but arch 12 (Harmony
 * One) and arch 14 (Harmony 600, 650 and 700), and any config of those two with no device list.
 */
export function deviceModeMarker(c: Container): Instruction | undefined {
  const tally = new Map<string, { instruction: Instruction; count: number }>();
  for (const list of c.actionLists() ?? []) {
    if (!isDeviceListRowShape(list, c.architecture)) continue;
    const end = list[list.length - 1] as Instruction;
    const key = `${end.opcode}:${end.operand}`;
    const seen = tally.get(key);
    if (seen === undefined) tally.set(key, { instruction: end, count: 1 });
    else seen.count += 1;
  }
  let marker: Instruction | undefined;
  let most = 0;
  for (const { instruction, count } of tally.values()) {
    if (count > most) { most = count; marker = instruction; }
  }
  return marker;
}

/** One row of the device list: where it sits, which mode it enters, and what it says. */
export interface DeviceListRow {
  /** The menu mode the row is on, as a base slot 6 index. */
  menu: number;
  /** Which page of that menu, zero based. */
  page: number;
  /** The touch scan the row is bound to: 48 is the top row, 49 the middle, 50 the bottom. */
  scan: number;
  /** The device mode the row enters. */
  mode: number;
  /** The label drawn on the row, where the page's strings pair with its rows one to one. */
  label?: string;
}

/**
 * The device list, read off the widest menu that lists devices.
 *
 * **This is the list the Devices button shows**, and it is the authoritative population of devices,
 * per `reference/how-a-harmony-works.md`: a device is what that list offers, whether or not it sends
 * infrared. A configuration carries several copies of the list, one per context it is shown in,
 * all reaching the same modes, so the first menu reaching the most distinct device modes is taken.
 *
 * A row's label is the string drawn on its page at the row's rank, top to bottom, and only when the
 * page draws exactly as many strings of two characters or more as it has rows. A page that draws
 * more, a page indicator say, leaves its rows unlabelled rather than mislabelled.
 */
export function deviceListRows(c: Container): DeviceListRow[] {
  const marker = deviceModeMarker(c);
  if (marker === undefined) return [];
  const lists = c.actionLists() ?? [];
  const records = modeRecords(c) ?? [];
  let best: DeviceListRow[] = [];
  let bestReach = 0;
  records.forEach((record, menu) => {
    const rows: DeviceListRow[] = [];
    record.pages.forEach((page, pageIndex) => {
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
        const mode = deviceListRowMode(lists[entry.operand], c.architecture, marker);
        if (mode === undefined) continue;
        rows.push({ menu, page: pageIndex, scan: entry.tag & 0x3f, mode });
      }
    });
    const reach = new Set(rows.map((row) => row.mode)).size;
    if (reach > bestReach) { bestReach = reach; best = rows; }
  });
  if (best.length === 0) return best;

  // The labels, by rank on the page. A long name wraps onto a second line drawn a glyph height
  // below the first ("Yamaha AV" over "Receiver", "Microsoft Media" over "Player"), where the rows
  // themselves sit 54 pixels apart, so lines closer than half a row pitch are one label. Counting
  // lines rather than labels is what left the Wii's page unpaired in section 240's first reading.
  const record = records[best[0]!.menu] as ModeRecord;
  const drawn = screenStrings(c, characterMap(c));
  // A screen whose keys sit in cells, the corners of the Harmony 600, 650 and 700 or the two columns beside the
  // Harmony 880 and 885's, pairs by cell; the Harmony One's touch rows pair by rank below.
  const grid = labelGridOf(c.architecture);
  if (grid !== undefined) {
    labelCornerRows(best, record, drawn, grid);
    return best;
  }
  record.pages.forEach((page, pageIndex) => {
    const onPage = best.filter((row) => row.page === pageIndex).sort((a, b) => a.scan - b.scan);
    const lines = drawn
      .filter((one) => one.program === page.program
        && one.text.trim().length >= SHORTEST_USEFUL_LABEL)
      .sort((a, b) => a.y - b.y);
    const labels: string[] = [];
    let lastY = Number.NEGATIVE_INFINITY;
    for (const line of lines) {
      if (labels.length > 0 && line.y - lastY < DEVICE_LIST_ROW_PITCH / 2) {
        labels[labels.length - 1] += ` ${line.text.trim()}`;
      } else {
        labels.push(line.text.trim());
      }
      lastY = line.y;
    }
    if (labels.length !== onPage.length) return;
    onPage.forEach((row, k) => { row.label = labels[k] as string; });
  });
  return best;
}

/** Vertical distance between two rows of the device list on the arch 12 screen, in pixels. */
const DEVICE_LIST_ROW_PITCH = 54;

/**
 * A device list page's labels where its keys sit in cells, paired with its rows by **cell** rather than by rank:
 * arch 14's corners (Harmony 600, 650 and 700) and arch 8's two columns beside the screen (Harmony 880 and 885).
 * Two labels share a line when they sit side by side, so the rank pairing arch 12 uses would read "TV KPN" as one
 * label. The lines of a cell join top to bottom, which is how a long name wraps.
 *
 * Corners only. The two row layout's labels are centred and would pair with its left hand rows
 * alone. A two row list reaches every device, as the corner lists do, and `deviceListRows` keeps the
 * first of the tied lists, which is a corner one on every configuration here because its mode number
 * is lower; so the case does not arise, by that tie order rather than by width, and is not read.
 */
function labelCornerRows(
  rows: DeviceListRow[], record: ModeRecord, drawn: ReturnType<typeof screenStrings>, corners: LabelGrid,
): void {
  record.pages.forEach((page, pageIndex) => {
    const lines = drawn.filter((one) => one.program === page.program
      && one.text.trim().length >= SHORTEST_USEFUL_LABEL);
    for (const row of rows) {
      if (row.page !== pageIndex) continue;
      const item = corners.items.findIndex((one) => one.scan === row.scan);
      if (item < 0) continue;
      const inCell = lines
        .filter((one) => gridCellAt(corners, one.x, one.y) === item)
        .sort((a, b) => a.y - b.y);
      if (inCell.length > 0) row.label = inCell.map((one) => one.text.trim()).join(' ');
    }
  });
}

export function devices(c: Container): Device[] {
  const groups = irGroups(c) ?? [];
  const records = stateRecords(c);
  // The infrared devices, one per group, which the first three routes name. A device with no
  // group cannot be here, so those are collected separately and appended at the end.
  const out: (Device & { group: number })[] = groups.map((group, index) => ({
    group: index,
    codes: group.addresses.length,
    variables: [],
  }));
  const withoutInfrared: Device[] = [];
  const sent = infraredGroupsPerList(c);
  if (sent.size === 0 && groups.length === 0) return out;
  const groupsOf = (index: number): Set<number> => sent.get(index) ?? new Set<number>();

  // Route one: a device variable's transitions send that device's codes and nobody else's.
  const labels: string[] = [];
  const reaches: { label: string; group: number }[] = [];
  for (const variable of deviceVariables(c)) {
    if (!labels.includes(variable.device)) labels.push(variable.device);
    const reached = new Set<number>();
    for (const value of records?.[variable.index]?.values ?? []) {
      if (value.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      for (const group of groupsOf(value.operand)) reached.add(group);
    }
    if (reached.size !== 1) continue;
    reaches.push({ label: variable.device, group: [...reached][0] as number });
  }
  const { named, contested } = pairLabelsToGroups(reaches);
  for (const [label, group] of named) {
    const device = out[group];
    if (device === undefined) continue;
    device.name = label;
    device.source = 'names';
  }
  for (const variable of deviceVariables(c)) {
    const group = named.get(variable.device);
    if (group !== undefined) out[group]?.variables.push(variable.index);
  }

  // Route two: one label and one group left over pair by force.
  //
  // **A contested group is not "left over"**, it is a group whose evidence contradicts itself, so it
  // is excluded here as well as above. Dropping its label without this would put both back in the
  // free pools and let the forced pairing produce exactly the wrong name the exclusion exists to
  // prevent.
  const freeGroups = out.filter((device) => device.name === undefined && !contested.has(device.group));
  const freeLabels = labels.filter((label) => !named.has(label));
  if (freeGroups.length === 1 && freeLabels.length === 1) {
    const device = freeGroups[0] as Device & { group: number };
    device.name = freeLabels[0] as string;
    device.source = 'elimination';
    for (const variable of deviceVariables(c)) {
      if (variable.device === device.name) device.variables.push(variable.index);
    }
  }

  // Route three: the title of the device's own mode, for a group base slot 0 does not name at all, and
  // only on an architecture where that top row is a title often enough to name by, `DEVICE_MODE_TITLE_ROUTE`.
  const stillFree = out.filter((device) => device.name === undefined && device.codes > 0);
  if (stillFree.length > 0 && DEVICE_MODE_TITLE_ROUTE[c.architecture ?? -1] !== false) {
    const spokenFor = new Set(activityNames(c).map((one) => one.name));
    const titles = deviceModeTitles(c);
    for (const device of stillFree) {
      const candidates = [...(titles.get(device.group) ?? [])].filter((one) => !spokenFor.has(one));
      if (candidates.length !== 1) continue;
      device.name = candidates[0] as string;
      device.source = 'screen';
    }
  }
  // Route four, and the population fix: the device list itself. A row whose mode reaches exactly one
  // group ties that group to a mode and, where the first three routes named nothing, to the label the
  // row draws. A row whose mode reaches **no** group is a device with no infrared codes, which the
  // groups above cannot hold, so it is appended: the Wii of section 240.
  for (const row of deviceListRows(c)) {
    const reached = new Set<number>();
    for (const page of (modeRecords(c) ?? [])[row.mode]?.pages ?? []) {
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
        for (const group of groupsOf(entry.operand)) reached.add(group);
      }
    }
    if (reached.size === 1) {
      const device = out[[...reached][0] as number];
      if (device === undefined) continue;
      if (device.mode === undefined) device.mode = row.mode;
      if (device.name === undefined && row.label !== undefined) {
        device.name = row.label;
        device.source = 'list';
      }
    } else if (reached.size === 0 && !withoutInfrared.some((device) => device.mode === row.mode)) {
      // A mode with no codes on its pages can still belong to a device that has codes: the Harmony
      // 600's Chromecast has a group and a mode whose one page binds nothing, section 285, and it
      // was appended a second time as `GChromeca..` the moment arch 14 rows were read. So the label
      // names it first, where exactly one unmoded device carries it, a trailing `..` being the
      // screen's own elision of a name too long for its cell. A name spells a space as `_`, which a
      // label does not, so the two are compared with the underscores read as spaces. **Fitted to one
      // case**: two rows in the corpus reach no group, this one and a Wii on `compiled_protocols_3`
      // that names nothing and falls through, and a screen does not always mark an elision, one
      // calibration configuration cutting `Panasonic_Blu-ray_Player` to `Panasonic Blu-ray` with no
      // dots, so an unmarked cut is not matched.
      const stem = row.label?.endsWith('..') ? row.label.slice(0, -2) : row.label;
      const spoken = (name: string): string => name.replaceAll('_', ' ');
      const named = stem === undefined ? [] : out.filter((device) => device.mode === undefined
        && device.name !== undefined
        && (spoken(device.name) === row.label
          || (stem !== row.label && spoken(device.name).startsWith(stem))));
      if (named.length === 1) {
        (named[0] as (typeof out)[number]).mode = row.mode;
        continue;
      }
      withoutInfrared.push({
        codes: 0,
        variables: [],
        mode: row.mode,
        ...(row.label === undefined ? {} : { name: row.label, source: 'list' as const }),
      });
    }
  }
  return [...out, ...withoutInfrared];
}

/**
 * Whether route three of `devices`, the top row a device's own mode draws, may name a device, per architecture.
 * An architecture absent from the table takes it, which is how every architecture was read before arch 8 joined.
 *
 * **Arch 8 (Harmony 880 and 885) does not**, on two measurements over the eight arch 8 configurations the lab holds,
 * two of which carry one remote's identical device list, `packages/codec/test/arch8devicelist.test.ts`. A device
 * mode there draws a title only when it has one page, 10 of 10 such modes against none of the 41 longer ones, 9 and
 * 35 with the repeated list counted once, so on most devices the top row is a command: that is how a bench Harmony
 * 885's CD player, a device with no state variable and so no name in base slot 0, came back named `Pwr`, the first
 * line of the wrapped command label `Pwr` over `Toggle2` on the third page of its own mode, the highest line any of
 * its pages draws. And the route is not needed there: the device list labels every device of the eight, 51 rows of
 * 51, 44 counted once, which route four reads once route three leaves the device alone. Section 126 had counted
 * the top row as the label 1 time in 31, over the devices route one names in the six contributed configurations,
 * `on arch 9 and arch 14 the device names its own mode` in `packages/codec/test/inventory.test.ts`; of those 31,
 * one has a device mode of one page, and that mode is titled.
 *
 * Arch 12 (Harmony One) draws no title, 0 of 7 by section 126's count, and is deliberately not entered: no device
 * of the corpus reaches route three on it, so nothing has shown what entering it would change, and the change is
 * its own decision. Arch 9 (Harmony 525) and arch 14 (Harmony 600, 650 and 700) draw the title, 17 of 17.
 */
const DEVICE_MODE_TITLE_ROUTE: PerArchitecture<boolean> = { 8: false };

/**
 * The top row a mode draws, for every mode whose own keys address exactly one device.
 *
 * A device's mode is where its buttons live, so the modes worth looking at are the ones whose pages
 * bind keys that send one group's codes and nothing else. **This is a weak route and the calibration
 * says why**: run against the devices route one already names, the top row is the label on arch 9 and
 * arch 14 and is a command name on arch 8 and arch 12, which draw no title. So it is used only where
 * nothing else reaches, and only when it leaves one candidate.
 */
export function deviceModeTitles(c: Container): Map<number, Set<string>> {
  const out = new Map<number, Set<string>>();
  const sent = infraredGroupsPerList(c);
  const drawn = screenStrings(c, characterMap(c));
  for (const mode of modeRecords(c) ?? []) {
    const reached = new Set<number>();
    for (const page of mode.pages) {
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
        for (const group of sent.get(entry.operand) ?? []) reached.add(group);
      }
    }
    if (reached.size !== 1) continue;
    const texts = mode.pages.flatMap((page) =>
      drawn.filter(
        (one) =>
          one.program === page.program && one.text.trim().length >= SHORTEST_USEFUL_LABEL,
      ),
    );
    if (texts.length === 0) continue;
    const top = Math.min(...texts.map((one) => one.y));
    const group = [...reached][0] as number;
    const acc = out.get(group) ?? new Set<string>();
    for (const one of texts) if (one.y === top) acc.add(one.text.trim());
    out.set(group, acc);
  }
  return out;
}

/** One infrared code: which device it goes to, and which of that device's codes it is. */
export interface InfraredCode {
  /** Index into base slot 5's group array, so the device. */
  group: number;
  /** Index into that group's own record array. */
  code: number;
}

/**
 * Which codes each base slot 10 action list sends, in the order it sends them.
 *
 * `0x7D` is the only instruction that names a device, section 33, so this is the whole of it, plus
 * `0x7F` because a list may hand the work to another. **Order is kept** because a list is a macro: an
 * activity's start sends several codes and which comes first is part of what it does.
 *
 * Shared rather than derived twice. `devices` uses it to tie a state variable to a group,
 * `deviceModeTitles` to tie a screen to one, `activities` to say which devices an activity drives and
 * `keyCodes` to say what a button sends. Two copies of one walk is the state that precedes two
 * diverging ones.
 *
 * A list that sends nothing is absent rather than empty, so a caller can tell "sends no codes" from
 * "no such list".
 */
export function infraredCodesPerList(c: Container): Map<number, InfraredCode[]> {
  const lists = c.actionLists();
  const out = new Map<number, InfraredCode[]>();
  if (lists === undefined) return out;
  // Each list gets its own walk with its own visited set. **Not a shared cache**: a nested walk stops
  // at whatever the outer one had already visited, so its answer is only correct in that context, and
  // memoising it would let a list inherit a truncated result from whoever reached it first. That is
  // the bug of section 126, which only arch 14 could show, because its send sits one list down.
  const walk = (index: number, seen: Set<number>): InfraredCode[] => {
    const found: InfraredCode[] = [];
    if (seen.has(index) || lists[index] === undefined) return found;
    seen.add(index);
    for (const instruction of lists[index] as { opcode: number; operand: number }[]) {
      if (instruction.opcode === SEND_INFRARED) {
        found.push({
          group: instruction.operand >> INFRARED_GROUP_SHIFT,
          code: instruction.operand & 0xff,
        });
      } else if (instruction.opcode === ACTION_LIST_INDEX_OPCODE) {
        found.push(...walk(instruction.operand, seen));
      }
    }
    return found;
  };
  lists.forEach((_, index) => {
    const found = walk(index, new Set());
    if (found.length > 0) out.set(index, found);
  });
  return out;
}

/** The same, reduced to the set of devices each list talks to. */
export function infraredGroupsPerList(c: Container): Map<number, Set<number>> {
  const out = new Map<number, Set<number>>();
  for (const [index, codes] of infraredCodesPerList(c)) {
    out.set(index, new Set(codes.map((one) => one.group)));
  }
  return out;
}
