/**
 * The Harmony One's device lists built whole from a description, `todo-compile-one.md` 4.3.3, findings section 424:
 * every list the Devices item opens, the one with no activity running and each activity's own, and the one list
 * nothing enters, each from its kind, its rows' names as the lines they are drawn in and the configuration's
 * numbering.
 *
 * **The blind control makes "generated" a test**, as sections 409 and 411 to 420 did: every byte of the lists the
 * description does not read is overwritten, in the file the description reads and the fonts are spelled from and in
 * the layout's own pieces, and the lists still come back byte for byte.
 *
 * Then the composed path: a device composed onto a Logitech compile gets its row on every list by the lists being
 * built again, `withTouchDeviceListRow`, and the result rebuilds byte for byte. An activity's own list on the composed
 * path is asserted in `composesetup.test.ts`, where activities are composed.
 *
 * Every figure is exact, and the populations are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container, type ContainerPiece, ScreenRecordError, activities, composeDevice, composeDeviceScreen, layOutContainer, modeRecords,
  parse, takeApart, taggedList, touchPages,
} from '../src/index.ts';
import { deviceListRowMode } from '../src/inventory.ts';
import { deviceListMenus } from '../src/shared/menus.ts';
import { speller } from '../src/shared/spelling.ts';
import { startSwitchedOn } from '../src/shared/activities.ts';
import { ComposeError } from '../src/shared/core.ts';
import { joinLines, wrapLines } from '../src/families/touch/screentemplate.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import { letterTouchDonor } from '../src/families/touch/look.ts';
import {
  DEVICE_LIST_NAME_WIDTH, buildTouchDeviceLists, deviceListPages, checkTouchDeviceLists, describeTouchDeviceLists, deviceListNameLines,
  touchDeviceLists, withTouchDeviceLists,
} from '../src/families/touch/devicelists.ts';

/** The first offset two files differ at, or undefined where they are the same. */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.max(a.length, b.length);
  for (let at = 0; at < length; at += 1) if (a[at] !== b[at]) return at;
  return undefined;
}

/**
 * The eighteen English Harmony One compiles in the lab with what the check returns on each: the lists, of them the
 * kinds a person reaches and the one nothing enters, pages, rows, the lists built, the hit pages built, the bytes the
 * description reads and the bytes of the lists. 99 lists, every compile one nothing enters.
 */
const LISTS: Record<string, [number, number, number, number, number, number, number, number, number]> = {
  harvest_one_two_devices: [2, 1, 1, 2, 4, 20, 1, 202, 649],
  harvest_one_families_1: [2, 1, 1, 2, 2, 16, 1, 168, 542],
  harvest_one_families_2: [2, 1, 1, 2, 4, 20, 1, 243, 634],
  harvest_one_families_3: [2, 1, 1, 4, 8, 30, 2, 433, 1134],
  one_spare_after_sync: [3, 2, 1, 3, 3, 23, 1, 272, 725],
  one_config_unprogrammed: [3, 2, 1, 3, 3, 23, 1, 267, 695],
  calibration_one: [4, 3, 1, 4, 12, 45, 1, 452, 1410],
  calibration_favchannels: [4, 3, 1, 4, 12, 45, 1, 452, 1410],
  phase7_before: [4, 3, 1, 4, 12, 45, 1, 452, 1410],
  phase7_after: [4, 3, 1, 8, 16, 55, 2, 669, 2076],
  one_friend_legacy_sync_config: [5, 4, 1, 10, 20, 67, 2, 906, 2427],
  one_spare_myharmony: [9, 8, 1, 18, 45, 133, 2, 1741, 4693],
  one_spare_20260830: [9, 8, 1, 18, 54, 151, 1, 1897, 5041],
  calibration_favzero: [9, 8, 1, 18, 54, 151, 1, 1897, 5041],
  compiled_protocols: [9, 8, 1, 45, 135, 319, 1, 3149, 11352],
  compiled_protocols_2: [9, 8, 1, 45, 135, 319, 1, 3121, 11116],
  compiled_protocols_3: [9, 8, 1, 36, 90, 227, 2, 2250, 8384],
  one_config: [10, 9, 1, 20, 50, 147, 2, 1929, 5198],
};
const ENGLISH = Object.keys(LISTS);
const DUTCH = 'one_friend_asfound_config';
const ALL = [...ENGLISH, DUTCH];

test('todo-compile-one 4.3.3: the device lists of all eighteen English Harmony One compiles are rebuilt byte for byte from a description, 99 lists of one to fifteen devices, and the Dutch compile is refused by its words',
     skipUnless(...ALL), () => {
  // Every list of a compile holds every device once, so a list's rows are the compile's rows over its lists.
  const totals = { lists: 0, rows: 0, shortest: Infinity, longest: 0 };
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const got = checkTouchDeviceLists(c);
    assert.deepEqual([got.lists, got.reached, got.unreached, got.pages, got.rows, got.listsBuilt, got.hitPages, got.described, got.structure],
      LISTS[name], name);
    totals.lists += got.lists;
    totals.rows += got.rows;
    const d = describeTouchDeviceLists(c, takeApart(c));
    for (const list of d.spec.lists) {
      totals.shortest = Math.min(totals.shortest, list.rows.length);
      totals.longest = Math.max(totals.longest, list.rows.length);
    }
  }
  assert.deepEqual(totals, { lists: 99, rows: 659, shortest: 1, longest: 15 });
  // Refused by its words before any byte is compared: the title font of the Dutch compile holds the letters of
  // "Apparaten" and not of "Devices". No language branch.
  assert.throws(() => checkTouchDeviceLists(parse(require_(DUTCH))), /font 10 has no glyph for 'D'/);
});

/** The device modes a list's rows enter, in the order they stand on the screen: page by page, a page by its touch area. */
function rowsOf(c: Container, mode: number): number[] {
  const lists = c.actionLists() ?? [];
  const hits = touchPages(c)!.records;
  const { marker } = deviceListMenus(c);
  return modeRecords(c)![mode]!.pages.flatMap((page) => {
    const areas = hits[page.lead as number]?.areas ?? [];
    return (taggedList(c, page.list)?.entries ?? []).flatMap((one) => {
      if (one.opcode !== 0x7f) return [];
      const entered = deviceListRowMode(lists[one.operand] ?? [], c.architecture, marker);
      const area = areas.find((a) => a.code === (one.tag & 0x3f));
      return entered === undefined || area === undefined ? [] : [{ entered, y: area.y, x: area.x }];
    }).sort((a, b) => (b.y - a.y) || (a.x - b.x)).map((one) => one.entered);
  });
}

test('todo-compile-one 4.3.3: every Harmony One compile holds one device list nothing enters, no three bytes of it naming its mode where every other list\'s mode is named, its rows in the idle list\'s order, and its scan 55 list mapping once per other list, activities and 1',
     skipUnless(...ALL), () => {
  const tally = { compiles: 0, unreached: 0, idleOrder: 0, scan55: 0, unreachedNamed: 0, reachedNamed: 0, reached: 0 };
  for (const name of ALL) {
    const c = parse(require_(name));
    const lists = touchDeviceLists(c);
    const records = modeRecords(c)!;
    const idle = lists.find((one) => one.idle === true)!;
    const unreached = lists.filter((one) => one.kind === 'unreached');
    tally.compiles += 1;
    tally.unreached += unreached.length;
    // The three bytes an enter would be, `lo hi 7E`, anywhere in the file, whatever holds them, instruction or not:
    // the walk-free control on "nothing enters it". Every list a person reaches is named so at least once.
    const named = (mode: number): number => {
      let n = 0;
      for (let at = 0; at + 2 < c.blob.length; at += 1) {
        if (c.blob[at] === (mode & 0xff) && c.blob[at + 1] === mode >> 8 && c.blob[at + 2] === 0x7e) n += 1;
      }
      return n;
    };
    for (const one of lists) {
      if (one.kind === 'unreached') tally.unreachedNamed += named(one.mode);
      else {
        tally.reached += 1;
        if (named(one.mode) > 0) tally.reachedNamed += 1;
      }
    }
    for (const one of unreached) {
      if (JSON.stringify(rowsOf(c, one.mode)) === JSON.stringify(rowsOf(c, idle.mode))) tally.idleOrder += 1;
      const entry = records[one.mode]!.entries.find((e) => e.tag === 0xb7)!;
      const maps = entry.opcode === 0x7f ? (c.actionLists() ?? [])[entry.operand]!.length : 1;
      if (maps === activities(c).length + 1 && maps === lists.length - 1) tally.scan55 += 1;
    }
  }
  assert.deepEqual(tally, { compiles: 19, unreached: 19, idleOrder: 19, scan55: 19, unreachedNamed: 0, reachedNamed: 83, reached: 83 });
});

test('sections 402 and 424: the devices an activity\'s start switches on, in that order, then the rest in the idle order, is each Logitech One activity\'s own list on 61 of 64; the three refused are one compile\'s, two devices with no power variable',
     skipUnless(...ALL), () => {
  const tally = { lists: 0, rule: 0, refused: [] as string[] };
  // The refused three: a placeholder in the start, and two listed devices without a power variable.
  for (const name of ALL) {
    const c = parse(require_(name));
    const lists = touchDeviceLists(c);
    const idle = rowsOf(c, lists.find((one) => one.idle === true)!.mode);
    for (const activity of activities(c)) {
      const own = lists.find((one) => one.activity === activity.activity);
      if (own === undefined) continue;
      tally.lists += 1;
      try {
        const head = startSwitchedOn(c, activity.set, idle, activity.name ?? `activity ${activity.activity}`);
        if (JSON.stringify([...head, ...idle.filter((one) => !head.includes(one))]) === JSON.stringify(rowsOf(c, own.mode))) tally.rule += 1;
      } catch (error) {
        if (!(error instanceof ComposeError)) throw error;
        assert.match(error.message, /2 devices on the list have none/);
        tally.refused.push(`${name}: ${activity.name}`);
      }
    }
  }
  assert.deepEqual({ ...tally, refused: [...tally.refused].sort() }, {
    lists: 64, rule: 61,
    refused: ['compiled_protocols_3: HDMI Extra', 'compiled_protocols_3: Heos/Spotify', 'compiled_protocols_3: Kodi kijken'],
  });
});

test('todo-compile-one 4.3.3: every row name of the eighteen\'s device lists is its name broken at 101 pixels, and at any width from 101 to 103 and none outside it',
     skipUnless(...ENGLISH), () => {
  const fits = new Map<number, number>();
  let rows = 0;
  let threeLines = 0;
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const d = describeTouchDeviceLists(c, takeApart(c));
    const font = d.spec.screen.fonts.row;
    const spell = speller(c);
    for (const list of d.spec.lists) {
      for (const lines of list.rows) {
        rows += 1;
        if (lines.length === 3) threeLines += 1;
        assert.deepEqual(deviceListNameLines(c, font, joinLines(lines)), lines, `${name}: ${lines.join(' | ')}`);
        for (let width = 99; width <= 105; width += 1) {
          if (JSON.stringify(wrapLines(joinLines(lines), width, (line) => spell(font, line).width)) === JSON.stringify(lines)) {
            fits.set(width, (fits.get(width) ?? 0) + 1);
          }
        }
      }
    }
  }
  assert.equal(DEVICE_LIST_NAME_WIDTH, 101);
  assert.equal(rows, 659);
  // The one name of three lines, `harvest_one_families_1`'s "Samsung Samsung Test Device 3", on both its lists.
  assert.equal(threeLines, 2);
  assert.deepEqual([...fits].sort((a, b) => a[0] - b[0]), FITS);
});

/**
 * How many of the 659 rows each width from 99 to 105 breaks into the lines drawn: all of them from 101 to 103, and
 * at 100 and 104 nine and eleven rows fewer, so the band is closed on both sides.
 */
const FITS: [number, number][] = [[99, 641], [100, 650], [101, 659], [102, 659], [103, 659], [104, 648], [105, 623]];

test('todo-compile-one 4.3.3: a blinded input rebuilds the device lists of all eighteen: no byte of them outside the description reaches the build',
     skipUnless(...ENGLISH), () => {
  const totals = { structure: 0, inside: 0, outside: 0, blinded: 0 };
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const first = describeTouchDeviceLists(c, takeApart(c));
    totals.structure += first.structure.size;
    for (const at of first.described) totals[first.structure.has(at) ? 'inside' : 'outside'] += 1;
    const blinded = c.blob.slice();
    for (const at of first.structure) {
      if (first.described.has(at)) continue;
      blinded[at] = (blinded[at] as number) ^ 0xff;
      totals.blinded += 1;
    }
    const layout = takeApart(c);
    const laid = layOutContainer(layout);
    const pieces = [layout.keyTable, ...layout.body,
      ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
    const starts = pieces.map((piece) => ({ piece, at: laid.offsetOf(piece) as number })).sort((a, b) => a.at - b.at);
    const d = describeTouchDeviceLists(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      if (first.described.has(at)) continue;
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = blinded[at] as number;
    }
    const out = layOutContainer(withTouchDeviceLists(layout, buildTouchDeviceLists(parse(blinded), d.spec), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
  }
  assert.deepEqual(totals, BLIND);
});

/**
 * The blind control's totals over the eighteen: 63937 bytes of device lists, 43850 of them written by the builder and
 * every one blinded; the description reads 20087 bytes inside them, the names and the numbering, and 413 outside, the
 * glyph codes of texts drawn by reference to a copy another program holds.
 */
const BLIND = { structure: 63937, inside: 20087, outside: 413, blinded: 43850 };

test('todo-compile-one 4.3.3: a description with two rows swapped, a list\'s kind flipped, scan 55 mapped once more or two pages of other shapes named to one hit page is refused, by the builder or the byte comparison',
     skipUnless('phase7_after'), () => {
  // A compile of four lists of four devices, each two pages.
  const c = parse(require_('phase7_after'));
  type Spec = ReturnType<typeof describeTouchDeviceLists>['spec'];
  const tamper = (change: (spec: Spec) => void): void => {
    const layout = takeApart(c);
    const d = describeTouchDeviceLists(c, layout);
    change(d.spec);
    const out = layOutContainer(withTouchDeviceLists(layout, buildTouchDeviceLists(c, d.spec), d.place)).bytes;
    if (firstDifference(out, c.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  tamper(() => undefined);
  const moved = /the rebuilt file differs/;
  const unreached = (spec: Spec): number => spec.lists.findIndex((one) => one.kind === 'unreached');
  // The first two rows of the idle list the other way round: each name lands on the other's row, its list unmoved.
  assert.throws(() => tamper((spec) => {
    const rows = spec.lists.find((one) => one.kind === 'reached')!.rows;
    [rows[0], rows[1]] = [rows[1]!, rows[0]!];
  }), moved);
  // The list nothing enters read as one a person reaches: a switch where it draws one word, its scan 55 bound straight.
  assert.throws(() => tamper((spec) => { spec.lists[unreached(spec)]!.kind = 'reached'; }), /a reached device list does not map scan 55 3 times/);
  // Scan 55's list mapping once more than the configuration has other lists: one number more taken, so every
  // number after it one role late, the first to land wrong a list index read where a variable goes.
  assert.throws(() => tamper((spec) => { spec.lists[unreached(spec)]!.scan55 += 1; }), /is not a variable a state write can name/);
  // The last page of a list of several named to the first page's hit page, a page of other shape.
  assert.throws(() => tamper((spec) => {
    const screen = spec.screen.screens.find((one) => one.leads.length > 1)!;
    screen.leads[screen.leads.length - 1] = screen.leads[0]!;
  }), /two device list pages of other shapes/);
});

/** Pads to compose, with labels the compile's pad font spells. */
const LABELS = ['Power', 'Mute', 'Input'];

/** One device composed onto `c` with a page of three pads. */
function composeOne(c: Container, label: string): Container {
  const device = composeDevice(c, {
    label, power: 0,
    commands: [
      { stated: 'G:Toshiba 32 Bit:(0x20DF10EF)(Repeat)():3', held: false },
      { stated: 'G:Toshiba 32 Bit:(0x20DF40BF)(Repeat)():3', held: true },
      { stated: 'G:Toshiba 32 Bit:(0x20DF807F)(Repeat)():3', held: true },
    ],
  });
  const rows = LABELS.map((one, k) => ({ label: one, list: device.lists[k]! }));
  return parse(composeDeviceScreen(parse(device.bytes), label, rows, { compiled: { title: label, keys: new Map([[3, device.lists[1]!]]) } }).bytes);
}

test('todo-compile-one 4.3.3: devices composed onto a Logitech compile take a row at the end of every device list by the lists being built again, which this rebuilds byte for byte, a list of a full last page gaining a page',
     skipUnless('one_config', 'calibration_one'), () => {
  for (const [name, added] of [['one_config', 1], ['calibration_one', 2]] as const) {
    // Lettered in ours first, as the composed path letters its donor, `letterTouchDonor`.
    let c = parse(letterTouchDonor(parse(require_(name)), TOUCH_CHOICES).bytes);
    const before = describeTouchDeviceLists(c, takeApart(c)).spec.lists.map((one) => one.rows.map(joinLines));
    // Counted off the description: the lettered donor still places the left key's words by Logitech's letters' widths,
    // which the template centres in ours, so its lists rebuild only once a composition has built them.
    const pagesBefore = before.reduce((sum, rows) => sum + deviceListPages(rows.length), 0);
    const names = ['Lamp', 'Radio Tuner Deluxe'].slice(0, added);
    for (const label of names) c = composeOne(c, label);
    const got = checkTouchDeviceLists(c);
    const after = describeTouchDeviceLists(c, takeApart(c)).spec.lists.map((one) => one.rows.map(joinLines));
    assert.equal(got.lists, before.length, name);
    after.forEach((rows, s) => assert.deepEqual(rows, [...before[s]!, ...names], `${name} list ${s}`));
    // `one_config`'s ten lists of five rows take a sixth on their second page; `calibration_one`'s four lists of
    // three, one full page each, take a second page each for the two rows.
    assert.deepEqual([pagesBefore, got.pages], name === 'one_config' ? [20, 20] : [4, 8], name);
  }
});
