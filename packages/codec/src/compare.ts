/**
 * Two configurations of the same setup, compared by what a person sees and hears, `todo-compile-650.md`
 * 5.2: every key and every screen item, in every activity, in device mode and with nothing running.
 *
 * **Why not compare bytes.** Two compiles of one setup share almost no addresses, list numbers or page
 * numbers, section 154, and ours is laid out by our own composers besides. So each file is first
 * reduced to a **view** keyed only by things a person can name: the activity or device by its name, the
 * page by its number within that screen, the key by its scan code, and what a binding sends by the
 * device's name and the infrared it emits. Two views are then compared key by key.
 *
 * **What a binding sends is compared at two depths**, because they answer different questions. The
 * **frame** is the first block decoded into the bits a device sees, `irFrame`, which is what the bench's
 * receiver hears; the **record** is the three blocks' durations word for word, which is what the remote
 * stores. Two files that differ only in records send the same command and may still send it a
 * different number of times or with a different hold, which section 343 found between Logitech's
 * sequence and ours, so a record difference is reported and kept apart from a frame difference.
 *
 * **What it does not see.** Pauses inside a sequence and the timing of a start, since a send list's
 * `0x7C` quantities are not part of what a binding sends here; the Help and Remote Assistant screens,
 * which 5.2 leaves out; and screen text other than a corner item's label, a page's title included. A
 * binding that sends nothing, navigation, is compared by its presence and not by where it leads.
 */
import type { Container } from './gspm.ts';
import { STATE_WRITE_BASE } from './actions.ts';
import { characterMap, screenStrings } from './text.ts';
import { ACTION_LIST_INDEX_OPCODE, HANDLER_TAG_ENTER, handlerSets, modeRecords, nameNodes, taggedList } from './sections.ts';
import {
  FOUR_SLOT_ITEMS,
  activities,
  activityScreens,
  deviceListRows,
  deviceModeMaps,
  devices,
  fourSlotCellAt,
  handlerSetRoles,
  infraredCodesPerList,
} from './inventory.ts';
import { irBlockWords, irGroups, irHeaderPointers } from './ir.ts';
import { irFrame } from './irframe.ts';
import { caseQueued } from './inventory.ts';
import { valueMaps } from './valuemap.ts';
import { activityKeyedRecords } from './compose.ts';

/** What one binding shows and does, in names that mean the same in both files. */
export interface ViewItem {
  /** The corner's drawn label, for a screen item; absent for a key. */
  label?: string;
  /** Each code sent, in order, as `device frame`: what a receiver hears. */
  frames: string[];
  /** Each code sent, in order, as `device` and the record's three blocks: what the remote stores. */
  records: string[];
}

/**
 * A configuration reduced to named bindings: `context | part | slot` to what it shows and sends.
 *
 * * context: `activity <name>`, `device <name>` or `idle`; and `activity menu`, page and cell to the
 *   activity there, and `device list`, one slot per distinct list with its rows in order and how many
 *   copies the file holds.
 * * part: `keys` for a key map, `page <n>` for the n-th page of the screen that context shows, `start`
 *   for the power and input writes an activity's start makes, two calls deep.
 * * slot: `scan <s>` for a key, the scan of a corner for a screen item, `writes` for a start.
 */
export type SetupView = Map<string, ViewItem>;

/** Event type 2, a press: the only event that sends a code, section 128. */
const PRESS = 2;

export function setupView(c: Container): SetupView {
  const view: SetupView = new Map();
  const codes = infraredCodesPerList(c);
  const groups = irGroups(c) ?? [];
  const named = new Map(devices(c).map((one) => [one.group, one.name ?? `group ${one.group}`]));
  const drawn = screenStrings(c, characterMap(c));
  const records = modeRecords(c) ?? [];
  const lists = c.actionLists() ?? [];

  const sent = (list: number): Pick<ViewItem, 'frames' | 'records'> => {
    const frames: string[] = [];
    const stored: string[] = [];
    for (const one of codes.get(list) ?? []) {
      const device = named.get(one.group) ?? `group ${one.group}`;
      const address = groups[one.group]?.addresses[one.code];
      if (address === undefined) {
        frames.push(`${device} ?`);
        stored.push(`${device} ?`);
        continue;
      }
      const frame = irFrame(c, address);
      frames.push(`${device} ${frame === undefined ? 'undecoded' : `${frame.bits}:${frame.value.toString(16)}`}`);
      const blocks = irHeaderPointers(c, address).map((pointer) => (irBlockWords(c, pointer) ?? []).join(','));
      stored.push(`${device} ${blocks.join(' | ')}`);
    }
    return { frames, records: stored };
  };

  // A key map: every press binding by its scan, and a press that sends nothing as an empty item, so a
  // key bound in one file and not the other is still seen.
  const keys = (context: string, list: number): void => {
    for (const entry of taggedList(c, list)?.entries ?? []) {
      if (entry.tag >> 6 !== PRESS || entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      view.set(`${context} | keys | scan ${entry.tag & 0x3f}`, sent(entry.operand));
    }
  };

  // A mode's pages, each corner by its scan with its drawn label, the way `modeScreenItems` pairs them.
  const pages = (context: string, mode: number): void => {
    const record = records[mode];
    if (record === undefined) return;
    record.pages.forEach((page, p) => {
      const lines = drawn.filter((one) => one.program === page.program && one.y >= 20 && one.y <= 100);
      const entries = taggedList(c, page.list)?.entries ?? [];
      FOUR_SLOT_ITEMS.forEach((item, k) => {
        const entry = entries.find((one) => (one.tag & 0x3f) === item.scan && one.opcode === ACTION_LIST_INDEX_OPCODE);
        if (entry === undefined) return;
        const label = lines.filter((one) => fourSlotCellAt(one.x, one.y) === k)
          .sort((a, b) => a.y - b.y).map((one) => one.text.trim()).join(' ');
        view.set(`${context} | page ${p + 1} | scan ${item.scan}`, { label, ...sent(entry.operand) });
      });
    });
    // The mode record's own list is the screen's keypad half, consulted before the base slot 9 stack.
    keys(`${context} screen record`, record.start);
  };

  const sets = handlerSets(c);
  const names = new Map((nameNodes(c) ?? []).map((one) => [one.index, one.name]));
  const screens = workingScreens(c);
  for (const activity of activities(c)) {
    const context = `activity ${activity.name ?? activity.activity}`;
    const address = sets?.addresses[activity.set];
    if (address !== undefined) {
      keys(context, address);
      const enter = (taggedList(c, address)?.entries ?? []).find((one) => one.tag === HANDLER_TAG_ENTER);
      if (enter?.opcode === ACTION_LIST_INDEX_OPCODE) {
        const walk = (list: number, depth: number): string[] => (lists[list] ?? []).flatMap((step) =>
          step.opcode >= STATE_WRITE_BASE
            ? [`${(names.get(step.opcode - STATE_WRITE_BASE) ?? `variable ${step.opcode - STATE_WRITE_BASE}`)
              .replace(/_\d+$/, '')}=${step.operand}`]
            : step.opcode === ACTION_LIST_INDEX_OPCODE && depth < 2 ? walk(step.operand, depth + 1) : []);
        const writes = walk(enter.operand, 0).filter((one) => /_(Power|Input)/.test(one));
        view.set(`${context} | start | writes`, { label: writes.join(' '), frames: [], records: [] });
      }
    }
    const mode = screens.get(activity.activity);
    if (mode !== undefined) pages(context, mode);
  }
  for (const map of deviceModeMaps(c)) pages(`device ${named.get(map.group) ?? map.group}`, map.mode);
  // The activity menu: which activity sits in which cell of which page, pages counted in file order.
  const menu = activities(c).filter((one) => one.at !== undefined);
  const menuPages = [...new Set(menu.map((one) => one.page))].sort((x, y) => x - y);
  for (const one of menu) {
    const at = one.at as { x: number; y: number };
    view.set(`activity menu | page ${menuPages.indexOf(one.page) + 1} | cell ${fourSlotCellAt(at.x, at.y) ?? `${at.x},${at.y}`}`,
      { label: one.name ?? String(one.activity), frames: [], records: [] });
  }
  // The device lists. A configuration holds several copies, each with its own order, and nothing names a
  // copy the same way in two files, so each is reduced to its rows in order and the copies are counted.
  const byDevice = new Map(deviceModeMaps(c).map((one) => [one.mode, named.get(one.group) ?? String(one.group)]));
  const copies = new Map<number, string[]>();
  for (const row of deviceListRows(c)) {
    const rows = copies.get(row.menu) ?? [];
    rows.push(`p${row.page + 1}:${row.label ?? '?'}>${byDevice.get(row.mode) ?? `mode ${row.mode}`}`);
    copies.set(row.menu, rows);
  }
  const counted = new Map<string, number>();
  for (const rows of copies.values()) counted.set(rows.join(' '), (counted.get(rows.join(' ')) ?? 0) + 1);
  for (const [rows, n] of counted) view.set(`device list | ${rows}`, { label: `${n} cop${n === 1 ? 'y' : 'ies'}`, frames: [], records: [] });

  const roles = handlerSetRoles(c);
  roles.forEach((role, index) => {
    const address = sets?.addresses[index];
    if (role === 'idle' && address !== undefined) keys('idle', address);
  });
  return view;
}

/** The base slot 6 mode `0x7E` enters, the opcode a case's queued instruction carries. */
const ENTER_MODE = 0x7e;

/**
 * Activity value to the mode of its working screen. The Harmony One's route is `activityScreens`; on
 * the Harmony 600, 650 and 700 the working screen record keyed by the activity is the one to read,
 * `activityKeyedRecords`, section 329, each case queuing `0x7E <mode>`.
 */
function workingScreens(c: Container): Map<number, number> {
  if (c.architecture !== 14) return activityScreens(c)?.screens ?? new Map();
  const out = new Map<number, number>();
  const record = valueMaps(c)?.[activityKeyedRecords(c).working];
  for (const [value, target] of record?.entries ?? []) {
    const queued = caseQueued(c, target);
    if (queued?.opcode === ENTER_MODE) out.set(value, queued.operand);
  }
  return out;
}

/** One way two views differ at one slot. */
export interface ViewDifference {
  key: string;
  /** `only in a`, `only in b`, `label`, `frames` (what is heard differs) or `records` (only what is stored). */
  kind: 'only in a' | 'only in b' | 'label' | 'frames' | 'records';
  a?: ViewItem;
  b?: ViewItem;
}

/** Every slot where two views differ, in key order. A frame difference hides a record one. */
export function compareViews(a: SetupView, b: SetupView): ViewDifference[] {
  const out: ViewDifference[] = [];
  const keys = [...new Set([...a.keys(), ...b.keys()])].sort();
  const same = (x: readonly string[], y: readonly string[]): boolean =>
    x.length === y.length && x.every((one, k) => one === y[k]);
  for (const key of keys) {
    const x = a.get(key);
    const y = b.get(key);
    if (x === undefined) { out.push({ key, kind: 'only in b', b: y as ViewItem }); continue; }
    if (y === undefined) { out.push({ key, kind: 'only in a', a: x }); continue; }
    if ((x.label ?? '') !== (y.label ?? '')) out.push({ key, kind: 'label', a: x, b: y });
    if (!same(x.frames, y.frames)) out.push({ key, kind: 'frames', a: x, b: y });
    else if (!same(x.records, y.records)) out.push({ key, kind: 'records', a: x, b: y });
  }
  return out;
}
