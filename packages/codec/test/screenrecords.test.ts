/**
 * The idle device list's, the activity menu's and Off's whole mode records built from a description,
 * `todo-compile-650.md` 7.3, section 356, measured against Logitech's own compiles.
 *
 * **The measurement is section 347's round trip.** `takeApart` cuts each compile into pieces,
 * `describeScreenRecords` reads only what a composer would supply, `buildScreenRecords` builds each record's
 * own key map, entry, page records, page lists, programs, copies and row lists, `withScreenRecords` puts
 * them where Logitech's sat, and `layOutContainer` lays the container out again. Byte equality says the
 * builder computed everything the description lacks.
 *
 * **The blind control makes that a test**: every byte of the three records the description does not read
 * is overwritten with `0xEE`, in the bytes the reader is handed, in the layout's pieces and in the file
 * the fonts are read from, and the rebuild still equals the compile.
 *
 * **The failing controls** are edits of a compile that `checkScreenRecords` refuses, and an order of the
 * activity menu's rows other than the compile's, which the rebuild honours.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container,
  type ContainerPiece,
  ScreenRecordError,
  activityEntriesByName,
  buildScreenRecords,
  checkScreenRecords,
  compareViews,
  describeScreenRecords,
  describeWiring,
  inActivityOrder,
  layOutContainer,
  modeRecords,
  parse,
  restamped,
  screenRecordModes,
  screenStrings,
  setupView,
  taggedList,
  takeApart,
  withScreenRecords,
} from '../src/index.ts';

/** The thirteen arch 14 compiles section 312 names. */
const THIRTEEN = ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4'] as const;
/** Logitech's later compiles of the test record's Harmony 650. */
const LATER_650 = ['h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean'] as const;
/** Another owner's Harmony 650, harmony-decompiler issue 36; issue 8's is in French and refused below. */
const OTHER_OWNER = ['h650_issue36_config'] as const;
const ALL = [...THIRTEEN, ...LATER_650, ...OTHER_OWNER] as const;

const containerOf = (name: string): Container => parse(require_(name));

function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) if (a[i] !== b[i]) return i;
  return a.length === b.length ? undefined : length;
}

/** Describe, build, put back and lay out. */
function rebuilt(c: Container): Uint8Array {
  const layout = takeApart(c);
  const d = describeScreenRecords(c, layout);
  return layOutContainer(withScreenRecords(layout, buildScreenRecords(d.spec, c), d.place)).bytes;
}

test('the three screen records of 22 arch 14 Logitech compiles are rebuilt byte for byte from a description',
     skipUnless(...ALL), () => {
  const totals = { deviceRows: 0, activityRows: 0, idlePages: 0, menuPages: 0, offPages: 0, structure: 0, rowLists: 0 };
  for (const name of ALL) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const d = describeScreenRecords(c, layout);
    const out = layOutContainer(withScreenRecords(layout, buildScreenRecords(d.spec, c), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
    totals.deviceRows += d.spec.idle.rows.length;
    totals.activityRows += d.spec.menu.rows.length;
    totals.idlePages += d.place.screens['idle device list'].programs.length;
    totals.menuPages += d.place.screens['activity menu'].programs.length;
    totals.offPages += d.place.screens.off.programs.length;
    totals.structure += d.structure.size;
    totals.rowLists += d.place.rowLists.size;
    // Laid out in mode order on every compile: the idle list, the menu, Off.
    assert.deepEqual(d.spec.order, ['idle device list', 'activity menu', 'off'], name);
  }
  assert.deepEqual(totals, {
    deviceRows: 143, activityRows: 78, idlePages: 41, menuPages: 43, offPages: 22, structure: 22464, rowLists: 598,
  });
});

test('a French Harmony 650 configuration is refused, since the menus are built in English',
     skipUnless('h650_issue8_config'), () => {
  // Its device pages end in "Sélection pr.." where every other compile says "Back", sections 336 and 352.
  assert.throws(() => rebuilt(containerOf('h650_issue8_config')), /spells 'Back'/);
});

test('the rebuild takes no value from the bytes the builder owns: a blinded input rebuilds all 22',
     skipUnless(...ALL), () => {
  let values = 0;
  let readAddresses = 0;
  let generated = 0;
  let changed = 0;
  let blindedCount = 0;
  let readOutside = 0;
  for (const name of ALL) {
    const c = containerOf(name);
    const first = describeScreenRecords(c, takeApart(c));
    // Every byte of the three records the description did not read, overwritten.
    const blinded = c.blob.slice();
    for (const at of first.structure) {
      if (first.described.has(at)) continue;
      blindedCount += 1;
      if (blinded[at] !== 0xee) changed += 1;
      blinded[at] = 0xee;
    }
    const layout = takeApart(c);
    const laid = layOutContainer(layout);
    const pieces = [layout.keyTable, ...layout.body,
      ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
    const starts = pieces.map((piece) => ({ piece, at: laid.offsetOf(piece) as number })).sort((a, b) => a.at - b.at);
    // The description is read through the blinded bytes, and the same offsets are read.
    const d = describeScreenRecords(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    // The layout's own pieces blinded too, so nothing kept from them can carry a byte.
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      if (first.described.has(at)) continue;
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = 0xee;
    }
    // And the fonts are read off the blinded file, so its own screens cannot spell anything for it.
    const out = layOutContainer(withScreenRecords(layout, buildScreenRecords(d.spec, parse(blinded)), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
    const inside = [...first.described].filter((at) => first.structure.has(at));
    values += inside.filter((at) => !first.addresses.read.has(at)).length;
    readAddresses += first.addresses.read.size;
    readOutside += first.described.size - inside.length;
    generated += first.structure.size - inside.length - [...first.addresses.read].filter((at) => !first.described.has(at)).length;
  }
  // Of the 22464 bytes: values the description reads, addresses naming a picture or a text kept
  // elsewhere, and the builder's. The reads outside are labels' codes at a copy another screen holds.
  assert.equal(values, 3686);
  assert.equal(readAddresses, 2274);
  assert.equal(generated, 16504);
  assert.equal(values + readAddresses + generated, 22464);
  assert.equal(readOutside, 1893);
  // The blind overwrote the builder's bytes and the picture addresses, which the description reads by
  // content rather than off these bytes. All but 10 were something else first, and those 10 are bytes of
  // address fields, which the frame writes whatever a piece holds there.
  assert.equal(blindedCount, 17326);
  assert.equal(changed, 17316);
});

test('Off is All Off\'s working screen: the first mode the Off key map\'s first called list enters, drawing "Turning system off" over the three lines',
     skipUnless(...ALL), () => {
  for (const name of ALL) {
    const c = containerOf(name);
    const modes = screenRecordModes(c, takeApart(c));
    const record = (modeRecords(c) ?? [])[modes.off];
    const programs = new Set(record?.pages.map((page) => page.program));
    assert.equal(record?.pages.length, 1, name);
    assert.equal(screenStrings(c).filter((one) => programs.has(one.program)).map((one) => one.text).join(' / '),
      'Turning system off / Please keep the / remote pointed at / your system', name);
  }
});

test('"Do you want to turn off your system now?" is not Off but a screen before it: one per compile, none of the three, entered by 27 to 67 lists, its Yes selecting the Off key map',
     skipUnless(...ALL), () => {
  const entering: number[] = [];
  for (const name of ALL) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const offEntry = describeWiring(layout).entries.idle as number;
    const modes = screenRecordModes(c, layout);
    const records = modeRecords(c) ?? [];
    const strings = screenStrings(c);
    const asks = records.flatMap((record, mode) => (record.pages.some((page) =>
      strings.some((one) => one.program === page.program && one.text.includes('off your system'))) ? [mode] : []));
    assert.equal(asks.length, 1, name);
    const ask = asks[0] as number;
    assert.ok(!Object.values(modes).includes(ask), name);
    const lists = c.actionLists() ?? [];
    entering.push(lists.filter((list) => list?.some((one) => one.opcode === 0x7e && one.operand === ask)).length);
    // Its own key map is the wide form, and every list it calls is the Off key map selected.
    const record = records[ask];
    assert.ok(record?.entries.every((one) => one.flags !== undefined), name);
    const calls = [...(record?.entries ?? []), ...(record?.pages ?? []).flatMap((page) => taggedList(c, page.list)?.entries ?? [])]
      .filter((one) => one.opcode === 0x7f).map((one) => lists[one.operand]?.map((ins) => `${ins.opcode}:${ins.operand}`).join(' '));
    assert.deepEqual(calls, [`7:${0xfff5} 31:${0xff00 | offEntry}`, `7:${0xfff5} 31:${0xff00 | offEntry}`], name);
  }
  assert.deepEqual([Math.min(...entering), Math.max(...entering)], [27, 67]);
  assert.equal(entering.reduce((sum, one) => sum + one, 0), 1210);
});

test('checkScreenRecords passes Logitech\'s clean compile and refuses an edited copy, a wrong page count, a moved title and a row writing the other marker',
     skipUnless('h650_test_config_clean'), () => {
  const c = containerOf('h650_test_config_clean');
  assert.deepEqual(checkScreenRecords(c), { structure: 1196, rows: 12, pages: 6 });
  const d = describeScreenRecords(c, takeApart(c));
  const region = (what: string): number => {
    const found = d.regions.find((one) => one.what === what);
    if (found === undefined) throw new Error(`no ${what}`);
    return found.from;
  };
  const edited = (edit: (bytes: Uint8Array) => void): Container => {
    const bytes = c.blob.slice();
    edit(bytes);
    return parse(restamped(bytes));
  };
  // The activity menu's first copy with its last two bindings stored the other way round.
  const copy = region("the activity menu's page 1's copy");
  assert.throws(() => checkScreenRecords(edited((bytes) => {
    const third = bytes.slice(copy + 9, copy + 13);
    bytes.copyWithin(copy + 9, copy + 13, copy + 17);
    bytes.set(third, copy + 13);
  })), (error: Error) => error instanceof ScreenRecordError && /in the activity menu's page 1's copy/.test(error.message));
  // The activity menu's entry stating two pages where it has three. Its third page's copy is still in the
  // pool, and the copies pair with the pages by position, section 69, so it falls to Off's page, which
  // binds nothing and is refused for binding something.
  const entry = region("the activity menu's entry");
  assert.throws(() => checkScreenRecords(edited((bytes) => { bytes[entry + 4] = 2; })),
    (error: Error) => error instanceof ScreenRecordError && /Off, mode \d+, is not one page binding nothing/.test(error.message));
  // Off's title a pixel right.
  const off = region("the off's page 1's program");
  assert.throws(() => checkScreenRecords(edited((bytes) => { bytes[off + 9] = (bytes[off + 9] as number) + 1; })),
    (error: Error) => error instanceof ScreenRecordError && /in the off's page 1's program/.test(error.message));
  // An activity row's list writing 1, the device rows' value, into the marker.
  const rowAt = d.regions.find((one) => one.what.startsWith(`list ${d.spec.menu.slots[0]?.page[0]},`))?.from;
  assert.ok(rowAt !== undefined);
  // Refused before the records are read, by section 329's marker check, which every row is held to.
  assert.throws(() => checkScreenRecords(edited((bytes) => { bytes[rowAt + 4] = 1; })),
    /a menu row writes the marker another value: list \d+ writes 1 where 0 is built/);
});

test('the activity menu\'s rows follow the description\'s order: Logitech\'s rows in another order rebuild a menu that differs in its labels only',
     skipUnless('h650_test_config_clean'), () => {
  const c = containerOf('h650_test_config_clean');
  const layout = takeApart(c);
  const d = describeScreenRecords(c, layout);
  const entries = d.spec.menu.rows.map((row) => row.target);
  const swapped = inActivityOrder(d.spec, [entries[1], entries[0], ...entries.slice(2)] as number[]);
  const out = parse(layOutContainer(withScreenRecords(layout, buildScreenRecords(swapped, c), d.place)).bytes);
  assert.notEqual(firstDifference(out.blob, c.blob), undefined);
  assert.deepEqual(compareViews(setupView(out), setupView(c), { menuOrder: false }), []);
  assert.deepEqual(compareViews(setupView(out), setupView(c)).map((one) => `${one.kind}: ${one.key}`), [
    'label: activity menu | page 1 | cell 0',
    'label: activity menu | page 1 | cell 2',
  ]);
  assert.throws(() => inActivityOrder(d.spec, entries.slice(1)), ScreenRecordError);
});

test('the test setup composed by todo-compile-650 6.2.13, its three records rebuilt with the menu in the setup file\'s order, shows a person nothing Logitech\'s clean compile does not but the menu\'s order',
     skipUnless('h650_7_1_base', 'h650_test_config_clean'), () => {
  // `h650_7_1_base` holds the 6.2.13 file as the 650 held it: `step1.ts` and `compose-activity.ts` onto
  // Logitech's starting compile.
  const composed = containerOf('h650_7_1_base');
  const clean = containerOf('h650_test_config_clean');
  const setup = JSON.parse(readFileSync(new URL('../../corpus/setups/h650-test.json', import.meta.url), 'utf8')) as
    { activities: { name: string }[] };
  const names = setup.activities.map((one) => one.name);
  const layout = takeApart(composed);
  const d = describeScreenRecords(composed, layout);
  const spec = inActivityOrder(d.spec, activityEntriesByName(composed, names));
  const out = parse(layOutContainer(withScreenRecords(layout, buildScreenRecords(spec, composed), d.place)).bytes);
  assert.deepEqual(names, ['TV kijken', 'Film kijken', 'Muziek', 'Kodi kijken', 'Plasma kijken']);
  assert.deepEqual(describeScreenRecords(out, takeApart(out)).spec.menu.rows.map((row) => row.target),
    activityEntriesByName(out, names));
  assert.deepEqual(compareViews(setupView(out), setupView(clean), { menuOrder: false }), []);
  assert.deepEqual(compareViews(setupView(out), setupView(clean)).map((one) => `${one.kind}: ${one.key}`), [
    'label: activity menu | page 1 | cell 0',
    'label: activity menu | page 1 | cell 2',
    'label: activity menu | page 2 | cell 2',
    'label: activity menu | page 3 | cell 0',
  ]);
  // Two bytes longer: the composer drew page 1's total by reference and all three counter texts of
  // page 3 inline; the rebuild draws page 1's inline (one byte less) and page 3's three by reference
  // to it (three more).
  assert.equal(out.blob.length - composed.blob.length, 2);
});
