/**
 * The two row device list on a Harmony 600, 650 or 700 is compiled and never entered. Section 326.
 *
 * Logitech's compiler writes one device list per configuration in two rows instead of four corners,
 * section 285, and section 312 grew it like the corner lists. The question here is whether anything
 * on the remote ever shows it, and the configuration half of the answer is these tests: the only way
 * into a mode is the firmware's mode switch, which takes its number from an `0x7E` instruction, from
 * the event map or from the mode stack (the firmware half, `tests/test_gspm.py`), and no `0x7E` in any
 * of these files names the two row list, no event map entry does, and nothing that could build an
 * `0x7E` at run time exists in them.
 *
 * **The search is over raw bytes on purpose.** Every place an instruction can sit, an action list, a
 * tagged list entry, a timer and a screen program's queue instruction, stores it as operand low, operand
 * high, opcode, so `lo hi 0x7E` finds an enter of the mode wherever it is stored, including in a
 * structure no reader here walks. A coincidental match could only make a mode look entered, never hide
 * an enter, so a count of zero is the strong direction. The control is that the same search finds every
 * corner device list and every row menu of the same configurations, 232 lists over the thirteen
 * compiles. It is not a control for the firmware's own numbered screens below the event block, where a
 * small mode number followed by `0x7E` turns up by coincidence.
 *
 * **What the run time builder check covers is the configuration's own instructions.** The firmware
 * also pushes instructions of its own onto the action queue, from several places, and those are not
 * traced here or in the section.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  characterMap,
  deviceListRowMode,
  deviceModeMarker,
  eventMap,
  handlerSets,
  modeRecords,
  parse,
  reachablePrograms,
  screenProgramRoots,
  screenStrings,
  taggedList,
  timers,
  type Container,
} from '../src/index.ts';

/**
 * Every Harmony 600, 650 and 700 configuration Logitech compiled that the lab holds once each, the
 * thirteen of section 312, with the mode number of each one's two row device list. Plus
 * `h650_seventh_base`, which is `h650_panasonic_config` with section 309's one byte edit and so not an
 * independent sample: it is what the bench Harmony 650 held when section 312's seventh device was
 * written, and it is here so the claim is pinned on that exact content too.
 */
const TWO_ROW_MODE = {
  h600_config: 166,
  calibration_h600: 167,
  h650_config_region: 179,
  h650_panasonic_config: 226,
  h650_seventh_base: 226,
  h650_power_hold_compile: 325,
  h650_power_hold_compile_2: 337,
  h700_config: 283,
  h700_config_2: 283,
  h700_28_config_region: 166,
  h700_power_hold_compile: 297,
  h700_power_hold_compile_2: 295,
  h700_power_hold_compile_3: 295,
  h700_power_hold_compile_4: 297,
} as const;
const NAMES = Object.keys(TWO_ROW_MODE) as (keyof typeof TWO_ROW_MODE)[];

/** A key press, event type 2 in the top two bits of a tag. */
const PRESS = 0x80;
const ENTER_MODE = 0x7e;
const CALL_LIST = 0x7f;

/**
 * How many times `lo hi 0x7E` occurs anywhere in the container's bytes, for every mode number at once.
 * One pass rather than one per mode, since a configuration has up to 403 modes and 600 KB of bytes.
 */
function enterCounts(c: Container): (mode: number) => number {
  const b = c.blob;
  const counts = new Map<number, number>();
  for (let i = 0; i + 2 < b.length; i += 1) {
    if (b[i + 2] !== ENTER_MODE) continue;
    const mode = (b[i] as number) | ((b[i + 1] as number) << 8);
    counts.set(mode, (counts.get(mode) ?? 0) + 1);
  }
  return (mode) => counts.get(mode) ?? 0;
}

interface Lists {
  /** Device lists whose rows each bind both buttons of a row, scans 2 and 8, to one device. */
  twoRow: number[];
  /** Device lists laid out in corners, every other mode whose rows enter two devices or more. */
  corners: number[];
  /**
   * Every other mode with a page binding scans 2 and 8 to two lists of identical body that enter no
   * device: the activity menu and the per device delay menus. A second control population, since these
   * are the other screens built in rows.
   */
  rowMenus: number[];
}

/**
 * The configuration's device lists and two row menus, found from the bindings and not from the text,
 * so the "Activity" word asserted below is an independent check that the right mode was found.
 */
function lists(c: Container): Lists {
  const actions = c.actionLists()!;
  const marker = deviceModeMarker(c);
  const device = (list: number | undefined): number | undefined =>
    list === undefined ? undefined : deviceListRowMode(actions[list], c.architecture, marker);
  const out: Lists = { twoRow: [], corners: [], rowMenus: [] };
  modeRecords(c)!.forEach((record, mode) => {
    const reached = new Set<number>();
    let paired = false;
    let menu = false;
    for (const page of record.pages) {
      const entries = taggedList(c, page.list)!.entries;
      const bound = (scan: number): number | undefined =>
        entries.find((one) => one.tag === (PRESS | scan) && one.opcode === CALL_LIST)?.operand;
      for (const one of entries) {
        const d = one.opcode === CALL_LIST ? device(one.operand) : undefined;
        if (d !== undefined) reached.add(d);
      }
      const right = bound(2);
      const left = bound(8);
      if (right === undefined || left === undefined) continue;
      if (device(right) !== undefined && device(right) === device(left)) paired = true;
      if (device(right) === undefined && device(left) === undefined
          && JSON.stringify(actions[right]) === JSON.stringify(actions[left])) menu = true;
    }
    if (reached.size >= 2) (paired ? out.twoRow : out.corners).push(mode);
    else if (menu) out.rowMenus.push(mode);
  });
  return out;
}

test('each arch 14 compile has exactly one two row device list, at these mode numbers',
     skipUnless(...NAMES), () => {
  for (const name of NAMES) {
    const c = parse(require_(name));
    const found = lists(c);
    assert.deepEqual(found.twoRow, [TWO_ROW_MODE[name]], name);
    // Its bottom word is the activity lists' "Activity", on every page: a list that leaves for the
    // running activity, which is what an activity's own corner list says too, section 294.
    // Its own record list is the centre key's press, tag 0x99, running the same `0x72` as every corner
    // list's centre key: wired as a device list in every respect a key can see, so the reason nothing
    // shows it is not in the list itself.
    const records = modeRecords(c)!;
    const own = records[TWO_ROW_MODE[name]]!.entries.map((one) => [one.tag, one.opcode, one.operand]);
    assert.equal(own.length, 1, name);
    assert.deepEqual(own[0]!.slice(0, 2), [PRESS | 25, 0x72], name);
    for (const corner of found.corners) {
      const centre = records[corner]!.entries.find((one) => one.tag === (PRESS | 25))!;
      assert.deepEqual([centre.opcode, centre.operand], [0x72, own[0]![2]], `${name} corner ${corner}`);
    }
    const strings = screenStrings(c, characterMap(c));
    for (const page of records[TWO_ROW_MODE[name]]!.pages) {
      const texts = strings.filter((s) => s.program === page.program).map((s) => s.text);
      assert.equal(texts.at(-1), 'Activity', `${name} page ${page.program.toString(16)}`);
    }
  }
});

test('nothing in an arch 14 compile enters its two row device list, and the same search finds every corner list and row menu',
     skipUnless(...NAMES), () => {
  let corners = 0;
  let menus = 0;
  for (const name of NAMES) {
    const c = parse(require_(name));
    const mode = TWO_ROW_MODE[name];
    const found = lists(c);
    const enters = enterCounts(c);
    assert.equal(enters(mode), 0, `${name}: an 0x7E naming mode ${mode}`);
    // The event map is the firmware's other source of a mode number: thirty contiguous values and a
    // fallback equal to the first, 14 to 43 on the 600 and 650 and 19 to 48 on the 700, section 36.
    const events = eventMap(c)!;
    const values = new Set([events.fallback, ...events.entries.values()]);
    const first = name.startsWith('h700') ? 19 : 14;
    assert.deepEqual([...values].sort((a, b) => a - b), Array.from({ length: 30 }, (_, k) => first + k), name);
    assert.equal(values.has(mode), false, name);
    // The control: every corner device list and every other two row menu of the same file is named
    // by at least one 0x7E, so the search can see an enter where there is one.
    assert.deepEqual(found.corners.filter((m) => enters(m) === 0), [], `${name} corner lists`);
    assert.deepEqual(found.rowMenus.filter((m) => enters(m) === 0), [], `${name} row menus`);
    corners += found.corners.length;
    menus += found.rowMenus.length;
  }
  // Exact, so a reader change that loses a list from the control moves the number in the diff.
  assert.equal(corners, 58);
  assert.equal(menus, 192);
});

test('the two row device list is the one mode above the event block that nothing enters',
     skipUnless(...NAMES), () => {
  // The modes below the event map's block are the firmware's own numbered screens, "Update
  // Successful" and the learning prompt among them, several of which no configuration enters
  // either; above it every mode is the compiler's, and every one of those but this list is named by
  // an 0x7E somewhere in the same file.
  for (const name of NAMES) {
    const c = parse(require_(name));
    const values = new Set([...eventMap(c)!.entries.values()]);
    const top = Math.max(...values);
    const enters = enterCounts(c);
    const orphans = modeRecords(c)!.map((_, mode) => mode)
      .filter((mode) => mode > top && enters(mode) === 0);
    assert.deepEqual(orphans, [TWO_ROW_MODE[name]], name);
  }
});

test('the two row device list shares no page with another mode, and no instruction in the file builds an instruction at run time',
     skipUnless(...NAMES), () => {
  let walked = 0;
  // Two routes the raw search cannot see. A page list or program shared with an entered mode would
  // put its rows on a screen through that mode; there is none. And `0x7B`, or any opcode from `0x1F`
  // to `0x3E` with an operand whose high byte is `0xF7`, assembles an instruction out of a variable
  // and queues it, sections 34 and 72: below `0x65` the operand is a second opcode field, and the band
  // `0x1F` to `0x3E` dispatches on its high byte, of which `0xF7` is the builder. Either could enter a
  // mode no byte names, and neither occurs anywhere a reader here can walk.
  for (const name of NAMES) {
    const c = parse(require_(name));
    const records = modeRecords(c)!;
    const own = new Set(records[TWO_ROW_MODE[name]]!.pages.flatMap((page) => [page.list, page.program]));
    const shared = records.flatMap((record, mode) => (mode === TWO_ROW_MODE[name] ? [] : record.pages))
      .filter((page) => own.has(page.list) || own.has(page.program));
    assert.deepEqual(shared, [], name);

    let builders = 0;
    const look = (one: { opcode: number; operand: number }): void => {
      walked += 1;
      if (one.opcode === 0x7b || (one.opcode >= 0x1f && one.opcode <= 0x3e && one.operand >> 8 === 0xf7)) builders += 1;
    };
    for (const list of c.actionLists()!) list.forEach(look);
    for (const address of handlerSets(c)!.addresses) taggedList(c, address)!.entries.forEach(look);
    for (const record of records) {
      record.entries.forEach(look);
      for (const page of record.pages) taggedList(c, page.list)!.entries.forEach(look);
    }
    for (const timer of timers(c)!.records) look(timer.instruction);
    for (const [, program] of reachablePrograms(c, screenProgramRoots(c))) {
      for (const one of program) {
        // Screen instruction 17 queues one action instruction: operand low, operand high, opcode.
        if (one.opcode === 17) look({ opcode: one.operands[2]!, operand: one.operands[0]! | (one.operands[1]! << 8) });
      }
    }
    assert.equal(builders, 0, name);
  }
  // How many instructions the walk looked at, exact, so a reader that silently walks nothing fails.
  assert.equal(walked, 441215);
});
