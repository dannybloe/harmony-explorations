/**
 * The firmware's own screens built whole from a description, `todo-compile-650.md` 7.4, section 357,
 * measured against Logitech's own compiles.
 *
 * **The measurement is section 356's round trip**: `takeApart` cuts each compile into pieces,
 * `describeFirmwareScreens` reads only what a composer would supply, `buildFirmwareScreens` builds every
 * screen's own key map, entry, page record, page list, copy and program and the lists "USB Connected"
 * runs, `withFirmwareScreens` puts them where Logitech's sat, and `layOutContainer` lays the container
 * out again. Byte equality says the builder computed everything the description lacks.
 *
 * **The blind control makes that a test**: every byte of the screens the description does not read is
 * overwritten with `0xEE`, in the bytes the reader is handed, in the layout's pieces and in the file the
 * fonts are read from, and the rebuild still equals the compile. The description still finds its way,
 * which binding is where, which instruction selects a font, how long a list is, through the unblinded
 * configuration; that decides no byte of the output, which the comparison checks.
 *
 * **The failing controls** are edits of a compile that `checkFirmwareScreens` refuses.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container,
  type ContainerPiece,
  FIRMWARE_SCREENS,
  ScreenRecordError,
  activityEntriesByName,
  buildFirmwareScreens,
  buildScreenRecords,
  checkFirmwareScreens,
  compareViews,
  describeFirmwareScreens,
  describeScreenRecords,
  describeWiring,
  handlerSets,
  inActivityOrder,
  introductionTour,
  layOutContainer,
  modeRecords,
  modeZeroKeyList,
  parse,
  recordReading,
  restamped,
  screenProgram,
  screenRecordModes,
  screenStrings,
  setupView,
  stateRecords,
  stateVariableSite,
  taggedList,
  takeApart,
  timers,
  withFirmwareScreens,
  withScreenRecords,
  valueMaps,
} from '../src/index.ts';

/** The thirteen arch 14 compiles section 312 names. */
const THIRTEEN = ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4'] as const;
/** Logitech's later compiles of the test record's Harmony 650. */
const LATER_650 = ['h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean'] as const;
/** Section 356's 22 less another owner's Harmony 650, issue 36, which is refused below. */
const BUILT = [...THIRTEEN, ...LATER_650] as const;
const SEVEN_HUNDREDS = ['h700_config', 'h700_config_2', 'h700_28_config_region', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4'] as const;

const containerOf = (name: string): Container => parse(require_(name));

function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) if (a[i] !== b[i]) return i;
  return a.length === b.length ? undefined : length;
}

/** Describe, build, put back and lay out. */
function rebuilt(c: Container): Uint8Array {
  const layout = takeApart(c);
  const d = describeFirmwareScreens(c, layout);
  return layOutContainer(withFirmwareScreens(layout, buildFirmwareScreens(d.spec, c), d.place)).bytes;
}

test('the firmware screens of 21 arch 14 Logitech compiles are rebuilt byte for byte from a description',
     skipUnless(...BUILT), () => {
  const perModel = new Map<string, { compiles: number; screens: number; structure: number; lists: number }>();
  for (const name of BUILT) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const d = describeFirmwareScreens(c, layout);
    const out = layOutContainer(withFirmwareScreens(layout, buildFirmwareScreens(d.spec, c), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
    const model = d.spec.wiring.model;
    const one = perModel.get(model) ?? { compiles: 0, screens: 0, structure: 0, lists: 0 };
    one.compiles += 1;
    one.screens += d.place.screens.length;
    one.structure += d.structure.size;
    one.lists += d.place.lists.size;
    perModel.set(model, one);
    // Laid out in mode order, and no text drawn by reference to a copy outside them.
    assert.deepEqual(d.spec.order, FIRMWARE_SCREENS[model].map((_, k) => k), name);
    assert.equal(d.spec.homes.size, 0, name);
  }
  assert.deepEqual(Object.fromEntries(perModel), {
    'harmony-650': { compiles: 12, screens: 168, structure: 12 * 5435, lists: 120 },
    'harmony-600': { compiles: 2, screens: 28, structure: 2 * 5435, lists: 20 },
    'harmony-700': { compiles: 7, screens: 133, structure: 7 * 8864, lists: 70 },
  });
});

test('another owner\'s Harmony 650 is refused for want of an "I" its letters do not resolve, and a French one for its words',
     skipUnless('h650_issue36_config', 'h650_issue8_config'), () => {
  // The character map leaves the code "Insert batteries" opens with unresolved on issue 36, which is the
  // letters' item, todo-compile-650 8.2, and not this one; section 356's words never needed an "I".
  assert.throws(() => rebuilt(containerOf('h650_issue36_config')),
    (error: Error) => error instanceof ScreenRecordError && /insertBatteries: font 0 has no glyph for 'I'/.test(error.message));
  assert.throws(() => rebuilt(containerOf('h650_issue8_config')),
    (error: Error) => error instanceof ScreenRecordError && /addActivityHere: font 0 has no glyph for 'w'/.test(error.message));
});

test('a blinded input rebuilds all 21: no byte the builder generates is taken from the screens\' own bytes, though the description finds its way through them',
     skipUnless(...BUILT), () => {
  let values = 0;
  let readAddresses = 0;
  let generated = 0;
  let changed = 0;
  let blindedCount = 0;
  let structure = 0;
  const already = { tags: 0, addresses: 0 };
  for (const name of BUILT) {
    const c = containerOf(name);
    const first = describeFirmwareScreens(c, takeApart(c));
    structure += first.structure.size;
    // Every byte of the screens the description did not read, overwritten.
    const blinded = c.blob.slice();
    for (const at of first.structure) {
      if (first.described.has(at)) continue;
      blindedCount += 1;
      if (blinded[at] !== 0xee) changed += 1;
      else if (first.addresses.built.has(at)) already.addresses += 1;
      else {
        // Tag 0xEE is the repeat of scan 46, `3 << 6 | 46`, which every key map over the keypad binds.
        const region = first.regions.find((one) => at >= one.from && at < one.to);
        assert.ok(region !== undefined && /own key map/.test(region.what) && (at - region.from - 1) % 4 === 0, `${name}: ${at}`);
        already.tags += 1;
      }
      blinded[at] = 0xee;
    }
    const layout = takeApart(c);
    const laid = layOutContainer(layout);
    const pieces = [layout.keyTable, ...layout.body,
      ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
    const starts = pieces.map((piece) => ({ piece, at: laid.offsetOf(piece) as number })).sort((a, b) => a.at - b.at);
    // The description is read through the blinded bytes, and the same offsets are read.
    const d = describeFirmwareScreens(c, layout, (at) => blinded[at] as number);
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
    const out = layOutContainer(withFirmwareScreens(layout, buildFirmwareScreens(d.spec, parse(blinded)), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
    // Every read is a byte of the screens: the description reads nothing outside them.
    assert.ok([...first.described].every((at) => first.structure.has(at)), name);
    values += [...first.described].filter((at) => !first.addresses.read.has(at)).length;
    readAddresses += first.addresses.read.size;
    generated += first.structure.size - first.described.size - [...first.addresses.read].filter((at) => !first.described.has(at)).length;
  }
  // Of the 138138 bytes: values the description reads, 469, which are two fonts a compile and "USB
  // Connected"'s variable and list indices, 21 bytes a Harmony 600 or 650 and 19 a Harmony 700, whose leave
  // list's index is the wiring's; addresses naming a picture, 1176, three bytes for each of 17 pictures on a
  // 600 or 650 and 22 on a 700; and the builder's, 136493, every one of them blinded.
  assert.deepEqual({ structure, values, readAddresses, generated, blindedCount }, {
    structure: 138138, values: 14 * (2 + 21) + 7 * (2 + 19), readAddresses: 3 * (14 * 17 + 7 * 22), generated: 136493,
    blindedCount: 136493,
  });
  assert.equal(values + readAddresses + generated, structure);
  // All but 220 were something else first: 182 are the tag 0xEE of a key map over the keypad, one in each
  // of seven on a 600 or 650 and twelve on a 700, and 38 are bytes of address fields, which the frame
  // writes whatever a piece holds there.
  assert.equal(changed, blindedCount - 220);
  assert.deepEqual(already, { tags: 14 * 7 + 7 * 12, addresses: 38 });
});

test('the Harmony 700\'s mode 0 sets the low battery flag the wiring clears, which is the variable section 311 found chosen per configuration',
     skipUnless(...SEVEN_HUNDREDS), () => {
  const variables = new Set<number>();
  for (const name of SEVEN_HUNDREDS) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const low = describeWiring(layout).variables.lowBattery as number;
    variables.add(low);
    assert.deepEqual([...layout.keyTable.bytes], [...modeZeroKeyList('harmony-700', { variable: low })], name);
  }
  assert.deepEqual([...variables].sort((a, b) => a - b), [40, 43, 44]);
});

test('checkFirmwareScreens passes Logitech\'s clean compile and refuses a moved text, a key bound elsewhere, a battery flag on another variable, a wrong step, and an enter handler that runs nothing',
     skipUnless('h650_test_config_clean'), () => {
  const c = containerOf('h650_test_config_clean');
  assert.deepEqual(checkFirmwareScreens(c), { structure: 5435, screens: 14, lists: 10 });
  const d = describeFirmwareScreens(c, takeApart(c));
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
  const refused = (pattern: RegExp) => (error: Error) => error instanceof ScreenRecordError && pattern.test(error.message);
  // "Update Successful" a pixel to the right: its x is the byte after the inline text's opcode.
  const update = region("the updateSuccessful's page 1's program");
  const records = modeRecords(c) ?? [];
  assert.throws(() => checkFirmwareScreens(edited((bytes) => { bytes[update + 9] = (bytes[update + 9] as number) + 1; })),
    refused(/in the updateSuccessful's page 1's program/));
  // One of the 160 keys "USB Connected" binds to its key list, the last entry, bound to its leave list instead.
  const usbOwn = region("the usbConnected's own key map");
  const last = usbOwn + 1 + 4 * ((records[2]?.entries.length ?? 0) - 1);
  assert.throws(() => checkFirmwareScreens(edited((bytes) => {
    bytes[last + 1] = d.spec.usb.cleared & 0xff;
    bytes[last + 2] = d.spec.usb.cleared >> 8;
  })), refused(/in the usbConnected's own key map/));
  // "Insert batteries" setting the variable after the low battery flag on entry, its first entry, tag 6.
  const insert = region("the insertBatteries's own key map");
  assert.equal(c.blob[insert + 1], 0x06);
  assert.throws(() => checkFirmwareScreens(edited((bytes) => { bytes[insert + 4] = (bytes[insert + 4] as number) + 1; })),
    refused(/in the insertBatteries's own key map/));
  // The second step's advance writing 2, where it moves the count on to 3.
  const advance = region(`list ${d.spec.usb.advances[1]}, the advance of step 2`);
  assert.throws(() => checkFirmwareScreens(edited((bytes) => { bytes[advance + 4] = 2; })),
    refused(new RegExp(`in list ${d.spec.usb.advances[1]}, the advance of step 2`)));
  // "USB Connected"'s enter handler, its first entry, swallowed instead of running its key list: refused
  // while the screens are read, before any comparison, since that binding is where the list's index is read.
  assert.equal(c.blob[usbOwn + 1], 0x06);
  assert.throws(() => checkFirmwareScreens(edited((bytes) => { bytes.fill(0, usbOwn + 2, usbOwn + 5); })),
    refused(/USB Connected does not call a list on tag 0x6/));
});

test('the welcome tour, measured and not built: in Logitech\'s skipped form nothing enters its ten screens, its start list is called by the wiring\'s startTour and, with the Remote Assistant on, the Assistant\'s gate, and its mark is read by that gate and by the test before Off',
     skipUnless(...BUILT), () => {
  const forms = { shown: 0, skipped: 0 };
  const assistant = { on: 0, off: 0 };
  const sizes = new Set<number>();
  for (const name of BUILT) {
    const c = containerOf(name);
    const layout = takeApart(c);
    const wiring = describeWiring(layout);
    const tour = introductionTour(c);
    const lists = c.actionLists() ?? [];
    const records = modeRecords(c) ?? [];
    forms[tour.state] += 1;
    // The start list and the exit are the wiring's `tour` and `quiet`.
    assert.equal(tour.list, wiring.lists.tour, name);
    assert.equal(tour.exit, wiring.lists.quiet, name);
    assert.equal(tour.modes, 10, name);
    // The tour's screens: the set closed under the modes they enter whose one list is the exit.
    const bindings = (mode: number) => [...(records[mode]?.entries ?? []),
      ...(records[mode]?.pages ?? []).flatMap((page) => taggedList(c, page.list)?.entries ?? [])];
    let screens = new Set<number>();
    for (let from = 0; from < records.length && screens.size === 0; from += 1) {
      const modes = new Set<number>();
      const exits = new Set<number>();
      const queue = [from];
      while (queue.length > 0) {
        const mode = queue.shift() as number;
        if (modes.has(mode)) continue;
        modes.add(mode);
        for (const one of bindings(mode)) {
          if (one.opcode === 0x7e) queue.push(one.operand);
          else if (one.opcode === 0x7f) exits.add(one.operand);
        }
      }
      if (modes.size === 10 && exits.size === 1 && exits.has(tour.exit) && Math.min(...modes) === from) screens = modes;
    }
    assert.equal(screens.size, 10, name);
    // Every instruction outside those screens: action lists, the other modes' own and page lists, base
    // slot 9's entries, the timers, base slot 13's transitions, base slot 14's value maps' payloads,
    // each `0x11` and one instruction, and the leading list.
    const sites: { opcode: number; operand: number; list?: number }[] = [];
    lists.forEach((list, index) => list.forEach((one) => sites.push({ ...one, list: index })));
    records.forEach((_, mode) => { if (!screens.has(mode)) sites.push(...bindings(mode)); });
    for (const address of handlerSets(c)?.addresses ?? []) sites.push(...(taggedList(c, address)?.entries ?? []));
    for (const timer of timers(c)?.records ?? []) sites.push(timer.instruction);
    for (const record of stateRecords(c) ?? []) sites.push(...record.values);
    for (const map of valueMaps(c) ?? []) {
      for (const address of [...map.entries.map((one) => one[1]), ...map.ranges.map((one) => one[2])]) {
        const at = c.blobOffsetOf(address);
        if (at === undefined || c.blob[at] !== 0x11) continue;
        sites.push({ operand: (c.blob[at + 1] as number) | ((c.blob[at + 2] as number) << 8), opcode: c.blob[at + 3] as number });
      }
    }
    const lead = layout.sections[8]?.head[0]?.bytes as Uint8Array;
    for (let k = 0; k < (lead[0] as number); k += 1) {
      sites.push({ operand: (lead[1 + 3 * k] as number) | ((lead[2 + 3 * k] as number) << 8), opcode: lead[3 + 3 * k] as number });
    }
    const entering = sites.filter((one) => one.opcode === 0x7e && screens.has(one.operand));
    assert.deepEqual(entering.map((one) => one.list), tour.state === 'shown' ? [tour.list] : [], name);
    // Its start list's callers: the wiring's startTour, front list 3 or 4, and the gate with the Assistant on.
    const callers = sites.filter((one) => one.opcode === 0x7f && one.operand === tour.list).map((one) => one.list);
    const startTour = wiring.model === 'harmony-700' ? 4 : 3;
    assert.equal(lists[startTour]?.[1]?.operand, tour.list, name);
    assistant[wiring.settings.remoteAssistant ? 'on' : 'off'] += 1;
    assert.equal(callers.length, wiring.settings.remoteAssistant ? 2 : 1, name);
    assert.equal(callers[0], startTour, name);
    // Its mark's readers: the one armed test idleEnter.first calls before Off, and the two armed gate.
    const off = screenRecordModes(c, layout).off;
    const readers = lists.flatMap((list, index) => (index !== tour.list && list.some((one) => stateVariableSite(one)?.index === tour.variable)
      ? [list.map((one) => [one.opcode, one.operand])] : []));
    const test = [[0x71, tour.variable], [0x7e, off]];
    assert.equal(lists[wiring.lists['idleEnter.first'] as number]?.[1]?.operand,
      lists.findIndex((list) => JSON.stringify(list.map((one) => [one.opcode, one.operand])) === JSON.stringify(test)), name);
    assert.ok(readers.some((one) => JSON.stringify(one) === JSON.stringify(test)), name);
    // idleEnter.first loads 1 before the test, so the test enters Off when the mark is 1.
    assert.deepEqual(lists[wiring.lists['idleEnter.first'] as number]?.[0], { operand: 0xfb01, opcode: 0x1f }, name);
    const gates = readers.filter((one) => one.length === 3 && one[0]?.[1] === (0x8000 | tour.variable) && one[1]?.[1] === tour.list);
    assert.equal(gates.length, wiring.settings.remoteAssistant ? 1 : 0, name);
    // The gate's one caller loads 0 before it, so it runs the start list while the mark is 0.
    for (const gate of gates) {
      const index = lists.findIndex((list) => JSON.stringify(list.map((one) => [one.opcode, one.operand])) === JSON.stringify(gate));
      const gateCallers = lists.filter((list) => list.some((one) => one.opcode === 0x7f && one.operand === index));
      assert.deepEqual(gateCallers.map((list) => list[0]), [{ operand: 0xfb00, opcode: 0x1f }], name);
    }
    assert.equal(readers.length, wiring.settings.remoteAssistant ? 2 : 1, name);
    // No text elsewhere is drawn by reference into a tour screen's program; the tour's own texts do point
    // at copies elsewhere, which stay.
    const tourPrograms = [...screens].flatMap((mode) => (records[mode]?.pages ?? []).map((page) => {
      const program = screenProgram(c, page.program) ?? [];
      return { address: page.program, from: c.blobOffsetOf(page.program) as number, to: Math.max(...program.map((one) => one.start + one.length)) };
    }));
    const inTour = (at: number): boolean => tourPrograms.some((one) => at >= one.from && at < one.to);
    const fromTour = (program: number): boolean => tourPrograms.some((one) => one.address === program);
    const referenced = screenStrings(c).filter((one) => one.referencedFrom !== undefined);
    assert.equal(referenced.filter((one) => !fromTour(one.program) && inTour(c.blobOffsetOf(one.referencedFrom as number) as number)).length, 0, name);
    assert.ok(referenced.some((one) => fromTour(one.program) && !inTour(c.blobOffsetOf(one.referencedFrom as number) as number)), name);
    // What omitting the screens saves, by the reading the firmware screens use.
    const reading = recordReading(c, layout, (at) => c.blob[at] as number);
    for (const mode of screens) reading.frame(`tour ${mode}`, mode);
    sizes.add(reading.structure.size);
    assert.equal(lists[tour.list]?.length, 2, name);
  }
  assert.deepEqual(forms, { shown: 2, skipped: 19 });
  assert.deepEqual(assistant, { on: 18, off: 3 });
  assert.deepEqual([...sizes].sort((a, b) => a - b), [1698, 1699, 1701]);
});

test('the test setup composed by todo-compile-650 6.2.13, its firmware screens rebuilt on top of section 356\'s three records, shows a person nothing Logitech\'s clean compile does not but the menu\'s order',
     skipUnless('h650_7_1_base', 'h650_test_config_clean'), () => {
  const composed = containerOf('h650_7_1_base');
  const clean = containerOf('h650_test_config_clean');
  const setup = JSON.parse(readFileSync(new URL('../../corpus/setups/h650-test.json', import.meta.url), 'utf8')) as
    { activities: { name: string }[] };
  const names = setup.activities.map((one) => one.name);
  // Section 356's three records, the menu in the setup file's order.
  const layout = takeApart(composed);
  const records = describeScreenRecords(composed, layout);
  const spec = inActivityOrder(records.spec, activityEntriesByName(composed, names));
  const step = parse(layOutContainer(withScreenRecords(layout, buildScreenRecords(spec, composed), records.place)).bytes);
  // Then the firmware screens, built from the description read off that file.
  const out = parse(rebuilt(step));
  assert.deepEqual(compareViews(setupView(out), setupView(clean), { menuOrder: false }), []);
  assert.deepEqual(compareViews(setupView(out), setupView(clean)).map((one) => `${one.kind}: ${one.key}`), [
    'label: activity menu | page 1 | cell 0',
    'label: activity menu | page 1 | cell 2',
    'label: activity menu | page 2 | cell 2',
    'label: activity menu | page 3 | cell 0',
  ]);
  // The firmware screens rebuild the composed file's own byte for byte, since its composer carried them
  // unchanged from Logitech's starting compile: so the two bytes the result is longer are all section
  // 356's, and the firmware screens add none.
  assert.equal(firstDifference(rebuilt(composed), composed.blob), undefined);
  assert.equal(firstDifference(out.blob, step.blob), undefined);
  assert.equal(out.blob.length - composed.blob.length, 2);
});
