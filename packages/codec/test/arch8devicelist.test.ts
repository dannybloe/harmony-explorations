/**
 * The Harmony 880 and 885's device list, read, and the name of a device base slot 0 does not name.
 *
 * **What was seen.** `devices` named bench unit A's eight devices with one wrong name: its fifth, infrared group
 * 4, came back `Pwr`, and two of unit B's devices came back unnamed. `h885base.test.ts` asserted "every one
 * named" on A, so it passed on a command label taken for a device.
 *
 * **Why.** A device's name has four routes in `devices`, `reference/config-format/activities-and-devices.md`.
 * Group 4 on A has no state variable at all, so base slot 0's ASCII names nothing for it and routes one and two
 * cannot reach it. Route three, the top row its own mode draws, found exactly one candidate, `Pwr`: the first line
 * of the wrapped command label `Pwr` over `Toggle2` at y 29 on the third page of mode 148, the highest line any of
 * that mode's three pages draws. The inventory tests had already measured that on arch 8 the top row of a device
 * mode is the device's label 1 time in 31, `on arch 9 and arch 14 the device names its own mode` in
 * `inventory.test.ts`, and the reason is below: a title is drawn on a device mode of one page and on no longer one.
 * Route four, the label on the device's row of the device list, would have
 * answered, but read no row on arch 8: `isDeviceListRowShape` tested every architecture but arch 14 against the
 * Harmony One's row, beep, enter a mode, mark device mode, and an arch 8 row has no beep.
 *
 * **What the configuration states.** A's device list, mode 42, the menu titled `Apparaten`, binds the key beside
 * the screen whose scan is 48, the right column's third, to action list 1724, which is `0x7E` operand 148, enter
 * mode 148, then `0x9A` operand 1, the device mode mark. Mode 148's three pages bind keys that send group 4's codes
 * and no other group's. The label drawn in that cell, right column, third row, is `Cd-speler` at x 70, y 106. No
 * state variable names the device, and the file's text never spells the name: the device list draws it. B's two
 * unnamed devices are the same case: group 2 is `Cd-speler`, on scan 8 of its list, mode 224, and group 3 is
 * `Lichtcont..`, alone on the list's second page, mode 204, the two dots being the screen's own elision of a name
 * too long for its cell, with no longer spelling in the file's text. B's group 8, `CEC AMP`, has no state variable
 * either. That a device with no state variable is spelled only in glyphs rests on these four devices of the two
 * bench configurations; the six contributed configurations name every device through a state variable.
 *
 * **The fix, as a property of the architecture and in reader tables, plan 007's form for a reader.** Three entries:
 * `DEVICE_LIST_ROW_BEEPS` takes arch 8 as having no beep, as arch 14; `SIDE_KEY_GRIDS` in `cornerlayout.ts` holds
 * the eight keys beside the screen in their cells, so the labels pair by cell as arch 14's corners do; and
 * `DEVICE_MODE_TITLE_ROUTE` keeps route three off arch 8, on check 4. Arch 12 (Harmony One) measured 0 of 7 for
 * titles in the inventory tests and is left as it was, since no device of the corpus reaches route three there.
 *
 * **Why believe it.** Four checks below, over every arch 8 configuration the lab holds, six contributed and the
 * two bench units'. **Two of the six carry one remote's device list**, `arch8_config_c` and `arch8_config_d`, the
 * same rows, labels, pages and names, so every count below counts that list twice; each is given with the figure
 * counting it once, and no conclusion turns on the difference.
 *
 * 1. the row is the configuration's: each configuration writes 1 to one state variable as its device mode mark,
 *    the variable differing between configurations (`0x98` to `0x9B`), and every row's mode reaches exactly one
 *    infrared group, so the rows are exactly the devices, one each; that the row has no beep is the reader's
 *    `isDeviceListRowShape`, which this check uses rather than restates;
 * 2. the cells are a measurement on a unit, not on these pages: the scans per cell are the reference's,
 *    `reference/remotes/harmony-885/keys.md` "The keys beside the screen", pressed on an 885 and read off one
 *    activity menu, section 128. What the pages add is where their lines sit: 574 lines on every page of every
 *    menu that binds a row, the unread copies included, each a title at y 10 above the first band, a page counter
 *    at y 152 below the last, a left label starting at x 3 or a right one starting at x 66 or beyond. The bands
 *    are contiguous, so no line can fall between two rows; what the check holds is that nothing is drawn where the
 *    split or the bands would misplace it;
 * 3. the closure: for every device route one names from base slot 0's ASCII, the label the list draws in the cell
 *    of the key that enters that device's mode spells the same name, letters and digits compared since the screen
 *    writes a space where the name has an underscore, or a cut of it. The two ends are independent, base slot 0's
 *    bytes against base slot 7's glyph pixels, with the key cells measured on a unit; the pairing between them is
 *    the reader's own, `screenStrings`, `characterMap` and `gridCellAt`, which the test shares. 44 devices, 38
 *    counting the repeated list once, 40 whole and 4 cut, 3 distinct cuts. The calibration control mirrors the two
 *    columns, which pairs every row with the cell beside it, and none of the 42 rows that have a cell beside them
 *    agrees;
 * 4. why route three is off and nothing is lost by it: an arch 8 device mode draws a title, a line above the first
 *    row band spelling the device's name, on 10 of its 10 modes of one page and on none of its 41 longer ones, 9
 *    and 35 counted once, so the top row of most device modes is a command; and the list labels all 51 devices of
 *    the eight configurations, 44 counted once, so route four answers wherever route three could.
 *
 * **Sources checked first.** The reference's pages on device names and on the 885's keys, the existing inventory
 * tests that hold the four routes and their calibration, and both bench units' configurations rendered. Logitech's
 * client was not read for this: the question is what a compiled configuration draws, which the client does not
 * hold, and the firmware was not read either, since nothing here depends on how it runs a list.
 *
 * **Width.** Arch 8, the Harmony 880 and 885, which run one application; five configurations are 880s' and three
 * 885s', by the skin byte each states (15 and 17); this said one 880's and seven 885s' until the glyph borrow's
 * check of the same files. The key cells were pressed on an 885 only. Arch 9 and arch 10 are not read by any of it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import { deviceListRows, devices, parse } from '../src/index.ts';
import {
  ACTION_LIST_INDEX_OPCODE,
  characterMap,
  deviceModeMarker,
  deviceModeTitles,
  isDeviceListRowShape,
  modeRecords,
  screenStrings,
  taggedList,
} from '../src/internal.ts';
import type { Container } from '../src/index.ts';
import { SIDE_KEY_GRIDS, gridCellAt } from '../src/cornerlayout.ts';
import type { LabelGrid } from '../src/cornerlayout.ts';
import '../src/resources.node.ts';

/** Every arch 8 configuration the lab holds, with the device mode mark it writes and its device count. */
const ARCH8: readonly [string, number, number][] = [
  ['arch8_config_a', 0x9b, 3],
  ['arch8_config_b', 0x99, 6],
  ['arch8_config_c', 0x99, 7],
  ['arch8_config_d', 0x98, 7],
  ['arch8_config_880', 0x98, 4],
  ['arch8_config_885', 0x9b, 7],
  ['h885_a_config', 0x9a, 8],
  ['h885_b_config', 0x9a, 9],
];
const NAMES = ARCH8.map(([name]) => name);

const GRID = SIDE_KEY_GRIDS[8] as LabelGrid;

/** Letters and digits only, since the screen writes a space where base slot 0 writes an underscore. */
function plain(text: string): string {
  return text.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}

/** Whether a drawn label spells a stated name, whole or cut, the screen's `..` elision dropped first. */
function spells(label: string, name: string): 'exact' | 'cut' | undefined {
  const drawn = plain(label.endsWith('..') ? label.slice(0, -2) : label);
  if (drawn === plain(name)) return 'exact';
  return drawn.length > 0 && plain(name).startsWith(drawn) ? 'cut' : undefined;
}

/** The label a device list row's cell draws under `grid`, its lines joined top to bottom, as the reader joins them. */
function labelIn(c: Container, grid: LabelGrid, menu: number, page: number, scan: number): string | undefined {
  const program = modeRecords(c)?.[menu]?.pages[page]?.program;
  const cell = grid.items.findIndex((one) => one.scan === scan);
  const lines = screenStrings(c, characterMap(c))
    .filter((one) => one.program === program && one.text.trim().length >= 2 && gridCellAt(grid, one.x, one.y) === cell)
    .sort((a, b) => a.y - b.y);
  return lines.length === 0 ? undefined : lines.map((one) => one.text.trim()).join(' ');
}

test('every arch 8 configuration marks device mode with its own variable, and has one list row per device',
  skipUnless(...NAMES), () => {
    for (const [name, mark, count] of ARCH8) {
      const c = parse(load(name) as Uint8Array);
      const marker = deviceModeMarker(c);
      assert.deepEqual([marker?.opcode, marker?.operand], [mark, 1], `${name}: the mark is a write of 1`);
      const rows = deviceListRows(c);
      assert.equal(rows.length, count, `${name}: one row per device`);
      for (const row of rows) assert.ok(row.label !== undefined, `${name}: row on scan ${row.scan} labelled`);
      // Every device has a mode from its row and no two share one: the rows are exactly the devices.
      const found = devices(c);
      assert.equal(found.length, count, `${name}: devices`);
      assert.deepEqual(found.map((one) => one.mode).sort(), rows.map((row) => row.mode).sort(), name);
      assert.equal(found.filter((one) => one.name === undefined).length, 0, `${name}: every device named`);
      assert.equal(found.filter((one) => one.source === 'screen').length, 0, `${name}: none named by a mode's top row`);
    }
  });

test('an arch 8 device list draws its title at y 10, its counter at y 152, and its labels from x 3 and from x 66',
  skipUnless(...NAMES), () => {
    // What makes the bands and the split a description of the layout rather than of the labels the closure checks:
    // every line on every page of every menu that binds a row, the unread copies included. The bands are
    // contiguous, so a line inside them always has a cell; what can fail is where the lines outside them sit and
    // where the labels start against the split.
    let lines = 0;
    let titles = 0;
    let counters = 0;
    const titleYs = new Set<number>();
    const counterYs = new Set<number>();
    const leftStarts = new Set<number>();
    let rightStart = Number.POSITIVE_INFINITY;
    for (const name of NAMES) {
      const c = parse(load(name) as Uint8Array);
      const lists = c.actionLists() ?? [];
      const drawn = screenStrings(c, characterMap(c));
      const marker = deviceModeMarker(c);
      for (const record of modeRecords(c) ?? []) {
        // A menu is a record one of whose pages binds a key to a row ending in the configuration's mark.
        const menu = record.pages.some((page) => (taggedList(c, page.list)?.entries ?? [])
          .some((entry) => entry.opcode === ACTION_LIST_INDEX_OPCODE
            && isDeviceListRowShape(lists[entry.operand], c.architecture)
            && lists[entry.operand]!.at(-1)!.opcode === marker!.opcode));
        if (!menu) continue;
        for (const page of record.pages) {
          for (const one of drawn) {
            if (one.program !== page.program || one.text.trim().length === 0) continue;
            lines += 1;
            const cell = gridCellAt(GRID, one.x, one.y);
            if (cell === undefined) {
              if (one.y < (GRID.rowBands[0] as number)) {
                titles += 1;
                titleYs.add(one.y);
              } else {
                counters += 1;
                counterYs.add(one.y);
              }
              continue;
            }
            if (GRID.items[cell]!.column === 0) leftStarts.add(one.x);
            else rightStart = Math.min(rightStart, one.x);
          }
        }
      }
    }
    assert.equal(lines, 574);
    assert.equal(titles, 39);
    assert.equal(counters, 54);
    assert.deepEqual([[...titleYs], [...counterYs]], [[10], [152]]);
    assert.deepEqual([...leftStarts], [3], 'a left label starts at x 3');
    assert.equal(rightStart, 66, 'and a right one at 66 or beyond, past the split at 64');
  });

test('a name route one reads from base slot 0 is the label the list draws in its key\'s cell',
  skipUnless(...NAMES), () => {
    let exact = 0;
    let cut = 0;
    let mirroredAgree = 0;
    let mirroredTried = 0;
    // The control: the same rows, each paired with the cell beside it, which is what a grid with its columns the
    // wrong way round would read.
    const mirrored: LabelGrid = {
      ...GRID,
      items: GRID.items.map((one) => ({ ...one, column: 1 - one.column })),
    };
    for (const name of NAMES) {
      const c = parse(load(name) as Uint8Array);
      const found = devices(c);
      for (const row of deviceListRows(c)) {
        // The test's own pairing is the reader's, so the control below varies the grid and nothing else.
        assert.equal(labelIn(c, GRID, row.menu, row.page, row.scan), row.label, `${name}: scan ${row.scan}`);
        const device = found.find((one) => one.mode === row.mode);
        if (device?.source !== 'names' || device.name === undefined) continue;
        const how = spells(row.label as string, device.name);
        if (how === 'exact') exact += 1;
        else if (how === 'cut') cut += 1;
        else assert.fail(`${name}: ${device.name} drawn as ${row.label}`);
        const beside = labelIn(c, mirrored, row.menu, row.page, row.scan);
        if (beside === undefined) continue;
        mirroredTried += 1;
        if (spells(beside, device.name) !== undefined) mirroredAgree += 1;
      }
    }
    // 44 devices route one names across the eight configurations, every one drawn in its own cell; 38 counting
    // once the device list `arch8_config_c` and `arch8_config_d` share. The four cuts are three distinct ones: a
    // long name wrapped and elided, `AV- ontvange..`, the Game Console of that shared list dropping its
    // `(With_DVD)`, twice, and unit A's second media centre drawn without the `_2` that tells the two apart in base
    // slot 0.
    assert.equal(exact, 40);
    assert.equal(cut, 4);
    // Mirrored, none pairs with its name, on the rows that have a cell beside them: the agreement is about which
    // cell, not about the label being somewhere on the page.
    assert.deepEqual([mirroredTried, mirroredAgree], [42, 0]);
  });

test('an arch 8 device mode draws the device\'s name as a title on one page and on no longer mode, and the list labels every device',
  skipUnless(...NAMES), () => {
    let onePage = 0;
    let onePageTitled = 0;
    let longer = 0;
    let longerTitled = 0;
    let labelled = 0;
    let rows = 0;
    for (const name of NAMES) {
      const c = parse(load(name) as Uint8Array);
      const drawn = screenStrings(c, characterMap(c));
      const records = modeRecords(c) ?? [];
      const found = devices(c);
      for (const row of deviceListRows(c)) {
        rows += 1;
        if (row.label !== undefined) labelled += 1;
        const pages = records[row.mode]?.pages ?? [];
        const name = found.find((one) => one.mode === row.mode)?.name as string;
        // A line above the first row band, where the device list draws its own title.
        const top = drawn.filter((one) => pages.some((page) => page.program === one.program)
          && one.y < (GRID.rowBands[0] as number) && one.text.trim().length >= 2);
        // Where there is one, it spells the device's name whole: `Media Center PC 2` where the list draws
        // `Media Center PC`, so the comparison is with the device's name and not with its list label.
        const titled = top.length > 0;
        if (titled) assert.deepEqual(top.map((one) => spells(one.text.trim(), name)), ['exact'], `${name} titled`);
        if (pages.length === 1) {
          onePage += 1;
          if (titled) onePageTitled += 1;
        } else {
          longer += 1;
          if (titled) longerTitled += 1;
        }
      }
    }
    // 9 and 35 counting once the device list two configurations share, and 44 rows.
    assert.deepEqual([onePage, onePageTitled, longer, longerTitled], [10, 10, 41, 0]);
    assert.deepEqual([rows, labelled], [51, 51]);
  });

test('bench unit A\'s fifth device is Cd-speler, which its mode\'s top row would have called Pwr',
  skipUnless('h885_a_config'), () => {
    const c = parse(load('h885_a_config') as Uint8Array);
    const device = devices(c).find((one) => one.group === 4);
    assert.deepEqual([device?.name, device?.source, device?.mode, device?.variables], ['Cd-speler', 'list', 148, []]);
    const row = deviceListRows(c).find((one) => one.mode === 148);
    assert.deepEqual([row?.menu, row?.page, row?.scan], [42, 0, 48]);
    // The wrong answer, still what route three would read, so the reason it is kept off arch 8 stays visible.
    assert.deepEqual([...(deviceModeTitles(c).get(4) ?? [])], ['Pwr']);
    // And the file's text never spells the name; the device list draws it.
    assert.equal(Buffer.from(load('h885_a_config') as Uint8Array).toString('latin1').toLowerCase().includes('cd-speler'), false);
  });

test('bench unit B\'s three devices with no name in base slot 0 are named off its list, two the reader had left unnamed',
  skipUnless('h885_b_config'), () => {
  // The third, group 8, route three had named `CEC AMP` already, off the title of a mode of one page; the list
  // draws the same, so taking route three off arch 8 changes its route and not its name.
  const c = parse(load('h885_b_config') as Uint8Array);
  const found = devices(c);
  assert.deepEqual(found.filter((one) => one.source === 'list').map((one) => [one.group, one.name, one.mode, one.variables]),
    [[2, 'Cd-speler', 224, []], [3, 'Lichtcont..', 204, []], [8, 'CEC AMP', 60, []]]);
  // And the file's text spells none of the three; the device list draws them.
  const text = Buffer.from(load('h885_b_config') as Uint8Array).toString('latin1').toLowerCase();
  assert.deepEqual(['cd-speler', 'lichtcont', 'cec amp'].filter((one) => text.includes(one)), []);
});
