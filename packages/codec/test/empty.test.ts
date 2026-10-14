/**
 * The Harmony 650 built from nothing, `todo-compile-650.md` 11.1.1 and plan 008. No lab: the point of
 * these is that a configuration comes out of the codec with no Logitech file as input. The tests that read
 * the lab are calibrations against every compile, our corner program and the structural readings of
 * section 375, and they skip without it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  type Container, ENTER_MODE, FOUR_SLOT_CHOICES, rgbTo565, LETTERING_CHARACTERS, MAP_VALUE_OPCODE, RUN_SCREEN_PROGRAM, SCREEN_QUEUE_INSTRUCTION,
  characterMap, claims, describeStateTables, describeWiring, fontSets, glyphOf, letterRows, modePages, modeRecords, oxaniumFace,
  pageListCopies, screenProgram, stateVariables, takeApart, taggedList, valueMaps,
} from '../src/index.ts';
import {
  EMPTY_FONT_SETS, EMPTY_VARIABLES, buildEmptyConfiguration, buildEmptySkeleton, emptyCodeOf, emptyModelOf, emptyModes, emptyVariable,
  emptyVariables,
} from '../src/families/four-slot/empty.ts';
import { modeZeroKeyList } from '../src/modezero.ts';
import { DEVICES_KEY_TAG, DEVICE_MODE_PROGRAM_TAG, SCAN_FOUR_TAG, cornerPrograms } from '../src/families/four-slot/chrome.ts';
import { FIRMWARE_SCREENS } from '../src/wiring.ts';
import { CORNER_PLACES, cornerPlaceAt, cornerProgramAt, emptyFont } from '../src/families/four-slot/empty.ts';
import { OUR_LOOK, deviceModeChrome, inOurLook } from '../src/families/four-slot/chrome.ts';
import { fourSlotMenus, fourSlotTemplate } from '../src/families/four-slot/menus.ts';
import { ourStateColours, recolouredStates, stateLookOf } from '../src/families/four-slot/statelook.ts';
import { composeCatalogueDevices } from '../src/composecatalogue.ts';
import { bitmapReference } from '../src/screen.ts';
import { stateBackgroundColour } from '../src/backgrounds.ts';
import { activities, activityNames, deviceListRows } from '../src/inventory.ts';
import { activityKeys } from '../src/activitykeys.ts';
import { IR_ARCHIVE, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import { archSlot, checkWiring, compareViews, parse, readRecipe, screenStrings, setupView } from '../src/index.ts';
import { readFileSync } from 'node:fs';
import { checkFirmwareScreens } from '../src/firmwarescreens.ts';
import { checkScreenRecords } from '../src/screenrecords.ts';
import { stateRecords } from '../src/sections.ts';
import { assembleSetup, attributeBytes } from '../src/assemble.ts';
import { OUR_FOUR_SLOT_CHOICES } from '../src/index.ts';
import type { Recipe } from '../src/index.ts';
import { fourSlotActivityMenu, fourSlotMenuMarkerWriter } from '../src/families/four-slot/chrome.ts';
import { startupTitleYs } from '../src/families/four-slot/activityscreen.ts';
import { activityMenuByRows, menuMarkerOf } from '../src/shared/menus.ts';
import { allOffList, composeDevice, coverage, deviceIds, joinPowerOff } from '../src/index.ts';
import { FIRST_DEVICE_IDENTIFIER } from '../src/shared/core.ts';

const BUILT_AT = '2026-10-12T12:00:00';

test('11.1.1.1: the skeleton lays out from nothing, every container check passing and every byte claimed', () => {
  const built = buildEmptySkeleton({ skin: 72, builtAt: BUILT_AT, inks: FOUR_SLOT_CHOICES.letterInks });
  const c = built.container;
  assert.ok(c.allChecksPass);
  assert.equal(c.architecture, 14);
  assert.equal(c.versionWord! & 0xff, 72);
  // Every byte is some reader's but the key table's, which no mode names until mode 0 exists, 11.1.1.3.
  const gaps: [number, number][] = [];
  let at = 0;
  for (const one of claims(c).sort((a, b) => a.start - b.start)) {
    if (one.start > at) gaps.push([at, one.start - at]);
    at = Math.max(at, one.start + one.length);
  }
  if (at < c.blob.length) gaps.push([at, c.blob.length - at]);
  assert.deepEqual(gaps, [[0x5f, 649]]);
  // Our font table: nine sets, each holding every printable character at the code of its place.
  const sets = fontSets(c)!;
  assert.deepEqual(sets.map((set) => set.height), EMPTY_FONT_SETS.map(({ face }) => oxaniumFace(face).cell));
  sets.forEach((set, k) => {
    assert.equal(set.first, 1);
    assert.equal(set.count, LETTERING_CHARACTERS.length);
    const { face, lettering } = EMPTY_FONT_SETS[k]!;
    for (const ch of ['A', 'g', '0', '~']) {
      const glyph = glyphOf(c, set, emptyCodeOf(ch))!;
      assert.deepEqual(glyph.rows, letterRows(face, ch, lettering, FOUR_SLOT_CHOICES.letterInks), `${face} ${lettering} '${ch}'`);
    }
  });
  assert.throws(() => buildEmptySkeleton({ skin: 69, builtAt: BUILT_AT, inks: FOUR_SLOT_CHOICES.letterInks }), /not skin 69/);
});

/** The family's look, as an empty configuration takes it. */
const LOOK = {
  idleColour: FOUR_SLOT_CHOICES.stateColours.idle,
  barColour: FOUR_SLOT_CHOICES.barColour,
  pictures: { icons: FOUR_SLOT_CHOICES.icons, colour: FOUR_SLOT_CHOICES.iconColour, background: FOUR_SLOT_CHOICES.iconBackground },
};

function buildEmpty(blendLetters = false, skin = 72) {
  return buildEmptyConfiguration({
    skin, builtAt: BUILT_AT, inks: FOUR_SLOT_CHOICES.letterInks, settings: FOUR_SLOT_CHOICES.settings, look: LOOK, blendLetters,
  });
}

/** What a `0x11` case program queues, as opcode and operand. */
function queued(c: Container, address: number): { opcode: number; operand: number } {
  const [first] = screenProgram(c, address) ?? [];
  assert.equal(first?.opcode, SCREEN_QUEUE_INSTRUCTION);
  const operands = first!.operands;
  return { opcode: operands[2]!, operand: operands[0]! | (operands[1]! << 8) };
}

test('11.1.1.2: the wiring and the state tables read back as the description they were built from', () => {
  const built = buildEmpty();
  const c = built.container;
  assert.ok(c.allChecksPass);
  const layout = takeApart(c);
  const wiring = describeWiring(layout);
  assert.deepEqual(
    { lists: wiring.lists, maps: wiring.maps, variables: wiring.variables, modes: wiring.modes, entries: wiring.entries, settings: wiring.settings },
    { lists: built.wiring.spec.lists, maps: built.wiring.spec.maps, variables: built.wiring.spec.variables, modes: built.wiring.spec.modes, entries: built.wiring.spec.entries, settings: built.wiring.spec.settings },
  );
  // Every variable read back as built, in index order after the firmware's eighteen, the named ones under
  // their names at the index `emptyVariable` gives.
  assert.deepEqual(describeStateTables(layout).variables, EMPTY_VARIABLES.map(([, one]) => ({ transitions: [], ...one })));
  for (const name of ['activity', 'location']) {
    assert.ok(stateVariables(c).some((one) => one.index === emptyVariable(name)), name);
  }
  // The clock's hour list increments the day and the weekday.
  assert.deepEqual(c.actionLists()![built.wiring.hourList], [{ opcode: 0x1f, operand: 0xf203 }, { opcode: 0x1f, operand: 0xf204 }]);
});

test('11.1.1.3: the firmware screens rebuild byte for byte from their own description', () => {
  const c = buildEmpty().container;
  const checked = checkFirmwareScreens(c);
  assert.equal(checked.screens, 14);
  assert.equal(checked.lists, 10);
});

test('11.1.1.3, and todo-compile-700.md 1.1 on the Harmony 700: the menus\' keys lead where a compile with activities leads with none running', () => {
  for (const skin of [72, 66]) menusLead(skin);
});

function menusLead(skin: number): void {
  const c = buildEmpty(false, skin).container;
  const EMPTY_MODES = emptyModes(emptyModelOf(skin));
  const records = modeRecords(c)!;
  assert.equal(records.length, EMPTY_MODES.off + 1);
  const maps = valueMaps(c)!;
  /** The case for `value` of the map a `0x72` operand names, read on the variable it names. */
  const through = (operand: number, variable: string, value: number) => {
    assert.equal(operand & 0xff, emptyVariable(variable));
    const target = maps[operand >> 8]!.entries.find(([key]) => key === value)?.[1];
    assert.ok(target !== undefined, `map ${operand >> 8} has a case ${value}`);
    return queued(c, target);
  };
  const own = (mode: number, tag: number) => records[mode]!.entries.find((one) => one.tag === tag)!;
  const idle = 0;
  // Devices on the activity menu: the counter's idle case enters the device list.
  const devices = own(EMPTY_MODES.activityMenu, DEVICES_KEY_TAG);
  assert.equal(devices.opcode, MAP_VALUE_OPCODE);
  assert.deepEqual(through(devices.operand, 'activity', idle), { opcode: ENTER_MODE, operand: EMPTY_MODES.idleList });
  // Back on the device list: the location's record, then the working record's idle case, then the
  // location map, which enters the activity menu.
  const back = own(EMPTY_MODES.idleList, DEVICES_KEY_TAG);
  const working = through(back.operand, 'location', 0);
  assert.equal(working.opcode, MAP_VALUE_OPCODE);
  const location = through(working.operand, 'activity', idle);
  assert.equal(location.opcode, MAP_VALUE_OPCODE);
  assert.deepEqual(through(location.operand, 'location', 0), { opcode: ENTER_MODE, operand: EMPTY_MODES.activityMenu });
  // Both menus queue the corner program, which draws our sending mark while the remote sends.
  for (const mode of [EMPTY_MODES.idleList, EMPTY_MODES.activityMenu]) {
    assert.deepEqual(own(mode, DEVICE_MODE_PROGRAM_TAG), { tag: DEVICE_MODE_PROGRAM_TAG, operand: 0, opcode: RUN_SCREEN_PROGRAM, flags: undefined });
  }
  assert.deepEqual(cornerPrograms(c), [0]);
  // More Activities on the empty activity menu calls the list that shows "add Activities", as Logitech's
  // compile with no activity does, section 383; with a mapping back it did nothing on the 650 and the 700.
  const more = own(EMPTY_MODES.activityMenu, SCAN_FOUR_TAG);
  assert.equal(more.opcode, 0x7f);
  const list = c.actionLists()![more.operand]!;
  assert.deepEqual(list.slice(1), [{ opcode: 0x07, operand: 0xfffd }, { opcode: ENTER_MODE, operand: FIRMWARE_SCREENS[emptyModelOf(skin)].indexOf('addActivities') }]);
}

test('11.1.1.3: every page has its copy where the reader finds it, and the bank holds what the screens draw', () => {
  const built = buildEmpty();
  const c = built.container;
  const pages = modePages(c);
  const copies = pageListCopies(c);
  assert.equal(copies.length, pages.length);
  pages.forEach((page, k) => {
    const list = taggedList(c, page.list)!;
    const copy = c.blob.subarray(copies[k]!, copies[k]! + list.length);
    assert.deepEqual([...copy], [...c.blob.subarray(c.blobOffsetOf(page.list)!, c.blobOffsetOf(page.list)! + list.length)], `page ${k}`);
  });
  // The plain background, the two bars, the idle background and patch, and our six.
  assert.equal(takeApart(c).pictures.length, 11);
  // Every code the screens draw is a character of ours.
  assert.equal(characterMap(c)?.drawn.resolved, characterMap(c)?.drawn.total);
});

test('11.1.1.4: our letters blend into the colour under each text, read back as the assembly reads them', () => {
  const one = buildEmpty(false);
  const built = buildEmpty(true);
  const c = built.container;
  assert.ok(c.allChecksPass);
  assert.ok((built.blended?.length ?? 0) > 0, 'a set blended');
  // The copies are appended, so the table grows by exactly them, and every drawn code still reads.
  assert.equal(fontSets(c)!.length, fontSets(one.container)!.length + built.blended!.length);
  assert.equal(characterMap(c)?.drawn.resolved, characterMap(c)?.drawn.total);
  // The firmware screens are checked before the blending, as the assembly checks them: after it each screen
  // selects the copy blended for its own background, and their description reads one body font for all.
  assert.throws(() => checkFirmwareScreens(c), /differ/);
});

/** Every Harmony 600, 650 and 700 compile the lab holds, as `activitydevicelist.test.ts` lists them, and the harvest. */
const COMPILES = ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4',
  'h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean',
  'h650_issue36_config', 'h650_issue8_config', 'harvest_650_two_devices'] as const;

test('section 374: our corner program is every compile\'s, byte for byte but its four addresses and its place, 70 of 70 on 24 drawing at Logitech\'s and ours three rows lower',
  skipUnless(...COMPILES), () => {
    // Read by `cornerProgramAt`, the one reading the attribution uses too: the three pieces in the
    // compiler's order, back to back, each compared with its address fields blanked, then the four
    // addresses, the two cases right behind the switch, each jumping to the tail.
    let count = 0;
    for (const name of COMPILES) {
      const c = parse(require_(name));
      const table = c.pointerArray(archSlot(14, 11))!;
      for (const index of cornerPrograms(c)) {
        const pieces = cornerProgramAt(c, table[index]!);
        assert.ok(pieces !== undefined, `${name} entry ${index}`);
        assert.deepEqual(pieces.map((one) => one.length), [18, 10, 10]);
        assert.equal(cornerPlaceAt(c, table[index]!), CORNER_PLACES.logitech, `${name} entry ${index}`);
        count += 1;
      }
    }
    assert.equal(count, 70);
    // The empty configuration's own, read by the same reading, at our place.
    const ours = buildEmpty().container;
    const entry = ours.pointerArray(archSlot(14, 11))![0]!;
    assert.deepEqual(cornerProgramAt(ours, entry)?.map((one) => one.length), [18, 10, 10]);
    assert.equal(cornerPlaceAt(ours, entry), CORNER_PLACES.ours);
  });

test('11.1.1.4: the empty configuration reads back as ours, its three screens rebuilt and every byte attributed to a generator, none carried', () => {
  const c = buildEmpty().container;
  assert.deepEqual(checkScreenRecords(c), { structure: 485, rows: 0, pages: 3 });
  const a = attributeBytes(c);
  assert.deepEqual(Object.fromEntries(a.carried), {});
  assert.deepEqual(a.generated, {
    frame: 136, addresses: 2910, description: 537, 'mode 0': 649, wiring: 1165, 'state tables': 480, 'screen records': 451,
    'firmware screens': 4712, 'corner programs': 38, texts: 0, pictures: 237275, letters: 93702,
  });
  assert.equal(Object.values(a.generated).reduce((n, v) => n + v, 0), a.total);
});

test('todo-compile-700.md 1.1 to 1.3: the Harmony 700 built from nothing: its wiring and state tables read back, its nineteen firmware screens and three of ours rebuild, mode 0\'s key table is the charging frame\'s, and every byte attributed to a generator, none carried', () => {
  const built = buildEmpty(false, 66);
  const c = built.container;
  assert.ok(c.allChecksPass);
  assert.equal(c.architecture, 14);
  assert.equal(c.versionWord! & 0xff, 66);
  const layout = takeApart(c);
  const wiring = describeWiring(layout);
  assert.equal(wiring.model, 'harmony-700');
  assert.deepEqual(
    { lists: wiring.lists, maps: wiring.maps, variables: wiring.variables, modes: wiring.modes, entries: wiring.entries, settings: wiring.settings },
    { lists: built.wiring.spec.lists, maps: built.wiring.spec.maps, variables: built.wiring.spec.variables, modes: built.wiring.spec.modes, entries: built.wiring.spec.entries, settings: built.wiring.spec.settings },
  );
  // The 650's variables, then the Assistant's mark the USB leave handler compares, section 382.
  assert.deepEqual(describeStateTables(layout).variables, emptyVariables('harmony-700').map(([, one]) => ({ transitions: [], ...one })));
  assert.equal(emptyVariables('harmony-700').length, EMPTY_VARIABLES.length + 1);
  assert.deepEqual(checkFirmwareScreens(c), { structure: 8864, screens: 19, lists: 10 });
  assert.equal(modeRecords(c)!.length, emptyModes('harmony-700').off + 1);
  // Mode 0's own key map is the key table, and it is the charging frame's, which sets the low battery flag.
  assert.deepEqual([...layout.keyTable.bytes], [...modeZeroKeyList('harmony-700', { variable: emptyVariable('lowBattery') })]);
  assert.deepEqual(checkScreenRecords(c), { structure: 485, rows: 0, pages: 3 });
  // The plain background, the two bars, the idle background and patch, and the eleven of ours the 700 draws:
  // the 650's six and its four charging frames and full battery.
  assert.equal(takeApart(c).pictures.length, 16);
  assert.equal(characterMap(c)?.drawn.resolved, characterMap(c)?.drawn.total);
  const a = attributeBytes(c);
  assert.deepEqual(Object.fromEntries(a.carried), {});
  assert.deepEqual(a.generated, {
    frame: 136, addresses: 3069, description: 676, 'mode 0': 653, wiring: 1497, 'state tables': 497, 'screen records': 451,
    'firmware screens': 8124, 'corner programs': 38, texts: 0, pictures: 401140, letters: 93702,
  });
  assert.equal(Object.values(a.generated).reduce((n, v) => n + v, 0), a.total);
  // With our letters blended, as it will be written, every drawn code still reads.
  const blended = buildEmpty(true, 66).container;
  assert.ok(blended.allChecksPass);
  assert.equal(characterMap(blended)?.drawn.resolved, characterMap(blended)?.drawn.total);
});

test('section 375: the activity menu and the menu marker found by structure are the ones the rows find on 23 compiles, and found with no row on the other and on ours',
  skipUnless(...COMPILES), () => {
    let agree = 0;
    for (const name of COMPILES) {
      const c = parse(require_(name));
      // The marker: the family's writer outside the rows joins the rows' own in `menuMarkerOf`, which refuses
      // two variables, so an answer is their agreement. Every compile holds device rows.
      assert.equal(menuMarkerOf(c), fourSlotMenuMarkerWriter(c), name);
      const rows = activityMenuByRows(c);
      if (rows === undefined) {
        // The one compile with no activity: the rows find nothing, and the structure finds the menu.
        assert.equal(name, 'harvest_650_two_devices');
        assert.equal(fourSlotActivityMenu(c), 101);
        continue;
      }
      assert.equal(fourSlotActivityMenu(c), rows, name);
      agree += 1;
    }
    assert.equal(agree, 23);
    const ours = buildEmpty().container;
    assert.equal(activityMenuByRows(ours), undefined);
    assert.equal(fourSlotActivityMenu(ours), emptyModes('harmony-650').activityMenu);
    assert.equal(fourSlotMenuMarkerWriter(ours), emptyVariable('menuMarker'));
  });

test('section 376: the first device onto the empty configuration is switched off by the idle record\'s case, and the second makes the all off list of both', () => {
  const empty = buildEmpty().container;
  // Our base slot 5 is a table with no entry, which only a caller naming a table takes as one.
  assert.equal(empty.pointerArrayAt(archSlot(14, 5)), undefined);
  assert.deepEqual(empty.pointerArrayAt(archSlot(14, 5), true)?.values, []);
  const television = [
    { stated: 'G:Toshiba 32 Bit:(0x20DF10EF)(Repeat)():3', held: false },
    { stated: 'G:Toshiba 32 Bit:(0x20DF40BF)(Repeat)():3', held: true },
  ];
  const first = composeDevice(empty, { label: 'TV', commands: television, power: 0 });
  assert.equal(deviceIds(parse(first.bytes))[0], FIRST_DEVICE_IDENTIFIER);
  const one = parse(joinPowerOff(parse(first.bytes), first.variable).bytes);
  assert.equal(allOffList(one), undefined);
  // The idle map's one case writes the device's power 0, as Logitech's configurations with one device do.
  const idle = describeWiring(takeApart(one)).maps['idleMap'] as number;
  const [entry] = valueMaps(one)![idle]!.entries;
  assert.deepEqual(queued(one, entry![1]), { opcode: 0x80 + first.variable, operand: 0 });
  const second = composeDevice(one, { label: 'Amp', commands: television, power: 0 });
  const two = parse(joinPowerOff(parse(second.bytes), second.variable).bytes);
  const list = allOffList(two);
  assert.deepEqual(list?.variables, [first.variable, second.variable]);
  assert.deepEqual(queued(two, valueMaps(two)![idle]!.entries[0]![1]), { opcode: 0x7f, operand: list?.list });
  for (const c of [one, two]) {
    const report = coverage(c);
    assert.equal(report.accounted, report.total);
    assert.ok(c.allChecksPass);
  }
});

test('section 377: the first catalogue device onto the empty configuration draws its pages in the device colour and our fonts, and the idle device list gains its row', skipWithoutIrArchive(), () => {
  const empty = buildEmpty().container;
  const device = FOUR_SLOT_CHOICES.stateColours.device;
  // An empty configuration holds the idle look alone: its menus are its only screens.
  assert.equal(stateLookOf(empty, device), undefined);
  const out = composeCatalogueDevices(empty, IR_ARCHIVE!, [{ manufacturer: 'LG', model: 'OLED65G26LA', label: 'TV', full: true, inputs: true }],
    { maxDevices: 8, delays: FOUR_SLOT_CHOICES.delays });
  const c = parse(out.bytes);
  assert.ok(c.allChecksPass);
  // The device look was added, its corner program appended below the 256 a screen can queue.
  const look = stateLookOf(c, device);
  assert.ok(look !== undefined && look.corner < 256);
  // Every device page is checked against the chrome built in our look, which is that look.
  const chrome = deviceModeChrome(c);
  assert.equal(chrome.look, OUR_LOOK);
  assert.deepEqual([chrome.crossed, chrome.corner], [look.background, look.corner]);
  // The pages were drawn in the fonts described for a configuration with no device page; read back off the
  // pages now there, they are the plain 14 and the shadowed 15 of ours.
  const template = fourSlotTemplate(c, undefined);
  assert.deepEqual([template.titleFont, template.counterFont, template.labelFont],
    [emptyFont('F14', 'plain'), emptyFont('F14', 'plain'), emptyFont('F15', 'shadowed')]);
  // The idle device list holds the one row, in the idle look still.
  assert.deepEqual(deviceListRows(c).map((row) => row.label), ['TV']);
  const idle = fourSlotMenus(c).find((one) => one.kind === 'idle device list')!.menu;
  const page = screenProgram(c, modeRecords(c)![idle]!.pages[0]!.program)!;
  assert.equal(bitmapReference(page[0]!), stateLookOf(c, FOUR_SLOT_CHOICES.stateColours.idle)?.background);
});

test('section 378: the assembly takes the empty configuration as its donor, runs none of the steps that turn Logitech\'s look into ours, and carries only the composed device', skipWithoutIrArchive(), () => {
  const recipe = { model: { name: 'Harmony 650', skin: 72 }, devices: [{ name: 'TV', device: 'LG/OLED65G26LA' }], activities: [],
    choices: { letters: 'oxanium', backgrounds: 'state colours', pictures: 'ours', blendLetters: false } } as Recipe;
  const out = assembleSetup(recipe, { donor: buildEmpty().bytes, archive: IR_ARCHIVE! });
  const steps = out.steps.map((one) => one.step);
  assert.ok(steps.includes('a donor of ours'));
  for (const skipped of ['our letters', 'state colours', 'our pictures']) assert.ok(!steps.includes(skipped), skipped);
  const c = out.container;
  assert.deepEqual(deviceListRows(c).map((row) => row.label), ['TV']);
  // Every page list has its copy again after the first row went into a list of none, the two zero bytes.
  assert.equal(pageListCopies(c).length, modePages(c).length);
  // What no generator describes is the composed device alone: its lists, its mode and pages, its infrared.
  assert.deepEqual([...attributeBytes(c).carried.keys()].sort(), [
    'slot-10-list reached', 'slot-10-list reached by nothing', 'slot-11-program', 'slot-5-block', 'slot-5-group', 'slot-5-header',
    'slot-6-entry', 'slot-6-mode', 'slot-6-page-list', 'slot-6-page-list-copy',
  ]);
  // A blended donor holds more sets than the description, and blending runs once, last.
  assert.throws(() => assembleSetup(recipe, { donor: buildEmpty(true).bytes, archive: IR_ARCHIVE! }), /is blended or not one of ours/);
});

test('a build on the empty configuration takes our look as its defaults, smoothed letters included, where one on Logitech\'s compiles keeps theirs', skipWithoutIrArchive(), () => {
  assert.deepEqual([OUR_FOUR_SLOT_CHOICES.letters, OUR_FOUR_SLOT_CHOICES.backgrounds, OUR_FOUR_SLOT_CHOICES.pictures, OUR_FOUR_SLOT_CHOICES.blendLetters],
    ['oxanium', 'state colours', 'ours', true]);
  assert.deepEqual([FOUR_SLOT_CHOICES.letters, FOUR_SLOT_CHOICES.backgrounds, FOUR_SLOT_CHOICES.pictures, FOUR_SLOT_CHOICES.blendLetters],
    ['logitech', 'designed', 'logitech', false]);
  // The rest are one set of defaults: only those four top level choices differ.
  const differ = Object.keys(FOUR_SLOT_CHOICES).filter((key) => JSON.stringify(FOUR_SLOT_CHOICES[key as keyof typeof FOUR_SLOT_CHOICES])
    !== JSON.stringify(OUR_FOUR_SLOT_CHOICES[key as keyof typeof OUR_FOUR_SLOT_CHOICES])).sort();
  assert.deepEqual(differ, ['backgrounds', 'blendLetters', 'letters', 'pictures']);
  // A recipe stating no choice: on the empty configuration it is assembled and blended, where before the
  // assembly refused it for asking a donor of ours for Logitech's look.
  const recipe = { model: { name: 'Harmony 650', skin: 72 }, devices: [{ name: 'TV', device: 'LG/OLED65G26LA' }], activities: [] } as unknown as Recipe;
  const out = assembleSetup(recipe, { donor: buildEmpty().bytes, archive: IR_ARCHIVE! });
  assert.ok(out.steps.some((one) => one.step === 'blended letters'));
  assert.ok((out.blended?.length ?? 0) > 0);
  // And smoothing stays a choice a recipe can turn off.
  const plain = assembleSetup({ ...recipe, choices: { blendLetters: false } } as Recipe, { donor: buildEmpty().bytes, archive: IR_ARCHIVE! });
  assert.ok(!plain.steps.some((one) => one.step === 'blended letters'));
});

test('section 379: the first activity goes onto the empty configuration through the assembly, on the Watch TV key or on none, and its wiring, its name and its looks read back', skipWithoutIrArchive(), () => {
  const recipe = (type: string): Recipe => ({
    model: { name: 'Harmony 650', skin: 72 },
    devices: [{ name: 'LG TV', device: 'LG/OLED65G26LA' }, { name: 'Denon', device: 'Denon/AVR-X4800H' }],
    activities: [{ name: 'TV', type, devices: [
      { device: 'LG TV', input: 'HDMI 1', roles: ['Display'] }, { device: 'Denon', input: 'CBL/SAT', roles: ['Volume'] }] }],
    choices: { letters: 'oxanium', backgrounds: 'state colours', pictures: 'ours', blendLetters: false },
  } as Recipe);
  const donor = buildEmpty().bytes;
  for (const [type, key] of [['WatchTV', 'Watch TV'], ['Custom', undefined]] as const) {
    const out = assembleSetup(recipe(type), { donor, archive: IR_ARCHIVE! });
    const c = out.container;
    // Read back by its name, which on a menu of one activity only the tie break finds.
    const found = activities(c);
    assert.deepEqual(found.map((one) => one.name), ['TV'], type);
    // On its key or on none, the other keys still opening the "add an Activity" screen.
    assert.deepEqual(activityKeys(c).map((one) => [one.key, one.kind, one.set ?? null]),
      ['Watch TV', 'Watch a Movie', 'Listen to Music'].map((name) => (name === key ? [name, 'activity', found[0]!.set] : [name, 'placeholder', null])), type);
    // The wiring is the one its description builds, scan 4 mapping the location now there is an activity.
    checkWiring(c);
    // And the activity menu maps More Activities back now it has a row, as every compile with activities does.
    assert.equal(modeRecords(c)![fourSlotActivityMenu(c)!]!.entries.find((one) => one.tag === SCAN_FOUR_TAG)?.opcode, MAP_VALUE_OPCODE, type);
    // The activity's look was added next to the idle and the device ones.
    for (const state of ['idle', 'device', 'activity'] as const) assert.ok(stateLookOf(c, FOUR_SLOT_CHOICES.stateColours[state]), `${type} ${state}`);
    // The front list the key no longer needs is dropped with the lists nothing names.
    if (key !== undefined) assert.match(out.steps.find((one) => one.step === 'lists dropped')?.detail ?? '', /^1 lists, 7 bytes/);
  }
});

test('11.2.2: one activity named as a device or as a word of the menus composes and reads back by its name, at its label on the activity menu', skipWithoutIrArchive(), () => {
  const donor = buildEmpty().bytes;
  for (const name of ['LG TV', 'Denon', 'Devices', 'Activities', 'Back']) {
    const recipe = {
      model: { name: 'Harmony 650', skin: 72 },
      devices: [{ name: 'LG TV', device: 'LG/OLED65G26LA' }, { name: 'Denon', device: 'Denon/AVR-X4800H' }],
      activities: [{ name, type: 'WatchTV', devices: [
        { device: 'LG TV', input: 'HDMI 1', roles: ['Display'] }, { device: 'Denon', input: 'CBL/SAT', roles: ['Volume'] }] }],
      choices: { blendLetters: false },
    } as Recipe;
    const c = assembleSetup(recipe, { donor, archive: IR_ARCHIVE! }).container;
    const found = activityNames(c);
    assert.deepEqual(found.map((one) => one.name), [name], name);
    // The menu's label, on its first row, and not the title "Activities" at the top or the footer "Devices" below.
    assert.equal(found[0]!.at?.y, 35, name);
  }
});

test('section 380: the whole test setup assembles on the empty configuration, with no Logitech file as input, every device list page by page in the order taken from Logitech\'s compile of the same setup, and nothing carried but what the composers make', skipWithoutIrArchive(), () => {
  const setup = readRecipe(JSON.parse(readFileSync(new URL('../../corpus/setups/h650-test.json', import.meta.url), 'utf8')));
  const recipe = { ...setup, choices: { letters: 'oxanium', backgrounds: 'state colours', pictures: 'ours', blendLetters: false } } as Recipe;
  // The two inputs: a configuration our generators built from nothing, and the catalogue.
  const out = assembleSetup(recipe, { donor: buildEmpty().bytes, archive: IR_ARCHIVE! });
  const c = out.container;
  // None of Logitech's device page looks held whole; that every picture byte is a rule's or ours is the
  // attribution's, below, where no picture kind is carried.
  assert.ok(inOurLook(c));
  assert.deepEqual(activities(c).map((one) => one.name?.replaceAll('_', ' ')), setup.activities.map((one) => one.name));
  assert.deepEqual(deviceListRows(c).map((row) => row.label).sort(), setup.devices.map((one) => one.name).sort());
  // Each device list's labels, page by page, as the menus draw them: the idle one first, then each
  // activity's in the setup's order. The order is taken from Logitech's compile of this setup,
  // `h650_test_config_clean`, which draws every one of them so, four and then three.
  const strings = screenStrings(c, characterMap(c)!);
  const records = modeRecords(c)!;
  const drawn = fourSlotMenus(c).filter((one) => one.kind !== 'activity menu').map((one) => records[one.menu]!.pages
    .map((page) => strings.filter((s) => s.program === page.program).map((s) => s.text)
      .filter((text) => !['Devices', 'Activities', 'Activity', '1', '2', '/'].includes(text))));
  assert.deepEqual(drawn, [
    [['LG TV', 'Plasma', 'Denon', 'KPN'], ['Kodi', 'Switch', 'Sony HT']],
    [['LG TV', 'KPN', 'Denon', 'Plasma'], ['Kodi', 'Switch', 'Sony HT']],
    [['Plasma', 'Kodi', 'Denon', 'LG TV'], ['KPN', 'Switch', 'Sony HT']],
    [['Kodi', 'Sony HT', 'LG TV', 'Plasma'], ['Denon', 'KPN', 'Switch']],
    [['LG TV', 'Kodi', 'Switch', 'Plasma'], ['Denon', 'KPN', 'Sony HT']],
    [['Plasma', 'KPN', 'LG TV', 'Denon'], ['Kodi', 'Switch', 'Sony HT']],
  ]);
  // The names are spelt as Logitech's compilers spell them, an underscore for a space, none of 5397 of theirs
  // holding a space: `LG_TV_Power_2` for the device the screen calls LG TV.
  assert.ok(stateVariables(c).some((one) => one.label === 'LG_TV_Power'));
  assert.deepEqual(stateVariables(c).filter((one) => one.label?.includes(' ')).map((one) => one.label), []);
  // What no describing generator rebuilds is the composers' own: the devices' infrared, lists, modes and
  // pages with their copies, the activities' key maps and the programs of their screens.
  assert.deepEqual([...attributeBytes(c).carried.keys()].sort(), [
    'slot-10-list reached', 'slot-10-list reached by nothing', 'slot-11-program', 'slot-5-block', 'slot-5-group', 'slot-5-header',
    'slot-6-entry', 'slot-6-mode', 'slot-6-page-list', 'slot-6-page-list-copy', 'slot-9-list',
  ]);
});

/** Each device list a file draws, the idle one first, as its labels page by page. */
function drawnDeviceLists(c: Container): string[][][] {
  const strings = screenStrings(c, characterMap(c)!);
  const records = modeRecords(c)!;
  return fourSlotMenus(c).filter((one) => one.kind !== 'activity menu').map((one) => records[one.menu]!.pages
    .map((page) => strings.filter((s) => s.program === page.program).map((s) => s.text)
      .filter((text) => !['Devices', 'Activities', 'Activity', '1', '2', '/'].includes(text))));
}

test('todo-compile-700.md 2.1: the whole test setup assembles on the Harmony 700\'s empty configuration in our look, and the setup comparison finds nothing different from the Harmony 650\'s in 627 slots, nor in the activity keys and the six drawn device lists, smoothed letters or not', skipWithoutIrArchive(), () => {
  const setup = readRecipe(JSON.parse(readFileSync(new URL('../../corpus/setups/h650-test.json', import.meta.url), 'utf8')));
  const on = (skin: number, name: string, blendLetters: boolean) => assembleSetup({
    ...setup, model: { name, skin }, choices: { letters: 'oxanium', backgrounds: 'state colours', pictures: 'ours', blendLetters },
  } as Recipe, { donor: buildEmpty(false, skin).bytes, archive: IR_ARCHIVE! }).container;
  const seven = on(66, 'Harmony 700', false);
  const six = on(72, 'Harmony 650', false);
  assert.ok(seven.allChecksPass);
  assert.ok(inOurLook(seven));
  // The 700's empty configuration ends base slot 14 with a record of no cases, which the first composed
  // device once met as "base slot 14 stopped reading"; the 650's last record has one.
  assert.deepEqual(valueMaps(buildEmpty(false, 66).container)?.at(-1)?.entries, []);
  assert.notDeepEqual(valueMaps(buildEmpty(false, 72).container)?.at(-1)?.entries, []);
  const view = setupView(seven);
  assert.equal(view.size, 627);
  assert.deepEqual(compareViews(setupView(six), view, { menuOrder: true }), []);
  // What the view holds no slot for: the always installed map's activity keys, and the device lists as drawn.
  const keys = (c: Container) => activityKeys(c).map((one) => [one.key, one.kind, one.set ?? null]);
  assert.deepEqual(keys(seven), keys(six));
  assert.equal(drawnDeviceLists(seven).length, 6);
  assert.deepEqual(drawnDeviceLists(seven), drawnDeviceLists(six));
  // Smoothing the letters is the assembly's last step, after the checks that rebuild the screens, and
  // changes nothing a person sees by this comparison.
  assert.deepEqual(compareViews(view, setupView(on(66, 'Harmony 700', true)), { menuOrder: true }), []);
  // What no describing generator rebuilds is the composers' own, as on the Harmony 650.
  assert.deepEqual([...attributeBytes(seven).carried.keys()].sort(), [...attributeBytes(six).carried.keys()].sort());
});

test('todo-compile-700.md 2.1: Logitech\'s seven Harmony 700 compiles do not read as our look, and the assembly refuses one as a donor', skipUnless(
  'h700_config', 'h700_config_2', 'h700_28_config_region', 'h700_power_hold_compile', 'h700_power_hold_compile_2',
  'h700_power_hold_compile_3', 'h700_power_hold_compile_4'), () => {
  for (const name of ['h700_config', 'h700_config_2', 'h700_28_config_region', 'h700_power_hold_compile',
    'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4']) {
    const c = parse(new Uint8Array(require_(name)));
    assert.equal((c.versionWord ?? -1) & 0xff, 66, name);
    assert.equal(inOurLook(c), false, name);
  }
  const setup = readRecipe(JSON.parse(readFileSync(new URL('../../corpus/setups/h650-test.json', import.meta.url), 'utf8')));
  assert.throws(() => assembleSetup({ ...setup, model: { name: 'Harmony 700', skin: 66 } } as Recipe, { donor: require_('h700_config') }),
    /on a donor of ours alone, an empty configuration, and this donor is Logitech's/);
});

test('decision 20 on a build from nothing: the state colours are a choice, written over the defaults the composers draw in, read back off the file\'s own pages, and nothing a person does changes', skipWithoutIrArchive(), () => {
  const setup = readRecipe(JSON.parse(readFileSync(new URL('../../corpus/setups/h650-test.json', import.meta.url), 'utf8')));
  // The 650's bench test colours, for a colourblind tester on a dim panel.
  const bright = { device: rgbTo565(255, 0, 0), activity: rgbTo565(0, 96, 255), idle: rgbTo565(255, 140, 0) };
  const on = (stateColours?: typeof bright) => assembleSetup({
    ...setup, model: { name: 'Harmony 700', skin: 66 },
    choices: { letters: 'oxanium', backgrounds: 'state colours', pictures: 'ours', blendLetters: true, ...(stateColours ? { stateColours } : {}) },
  } as Recipe, { donor: buildEmpty(false, 66).bytes, archive: IR_ARCHIVE! }).container;
  const plain = on();
  const coloured = on(bright);
  assert.ok(coloured.allChecksPass);
  assert.deepEqual(ourStateColours(plain), FOUR_SLOT_CHOICES.stateColours);
  assert.deepEqual(ourStateColours(coloured), bright);
  assert.equal(coloured.blob.length, plain.blob.length);
  assert.deepEqual(compareViews(setupView(plain), setupView(coloured), { menuOrder: true }), []);
  // An empty configuration holds the idle state alone, and the dark fill its firmware screens draw over is no state's.
  assert.deepEqual(ourStateColours(buildEmpty(false, 66).container), { idle: FOUR_SLOT_CHOICES.stateColours.idle });
  assert.throws(() => recolouredStates(plain, { ...bright, idle: bright.device }), /have to differ/);
});

test('todo-compile-700.md 2.3: a file of ours starts the mark the Off screen waits for at 1, and draws its start up and Off titles two rows below Logitech\'s', () => {
  // Logitech's compiles start it at 0 and set it from the tour, which a file of ours does not hold; at 0 the
  // bench Harmony 700 did not show "Turning system off" on the test setup, section 386, though its empty
  // configuration did, section 383, and on the Harmony 600 it did not show with the mark read 1, section 387.
  assert.deepEqual(emptyVariables('harmony-700').find(([name]) => name === 'tourMark')?.[1], { first: 1, max: 1 });
  // And in the file as built, where the remote's restart seeds it from, on each model of ours.
  for (const skin of [66, 72, 73]) {
    assert.equal(stateRecords(buildEmpty(false, skin).container)?.[emptyVariable('tourMark')]?.first, 1, `skin ${skin}`);
  }
  assert.deepEqual(startupTitleYs(buildEmpty(false, 66).container), [7, 21]);
  const strings = screenStrings(buildEmpty(false, 66).container, characterMap(buildEmpty(false, 66).container)!);
  assert.equal(strings.find((one) => one.text === 'Turning system off')?.y, 7);
});

test('todo-compile-700.md 2.3: a Logitech compile keeps its start up titles at y 5 and 19', skipUnless('h700_config'), () => {
  assert.deepEqual(startupTitleYs(parse(require_('h700_config'))), [5, 19]);
});

test('todo-compile-600.md 1.1: the Harmony 600 built from nothing, skins 73 and 71, rebuilds by every checker with every byte attributed, and differs from the Harmony 650\'s only in its skin, its settings block and the checksum', () => {
  for (const skin of [73, 71]) {
    const c = buildEmpty(false, skin).container;
    assert.ok(c.allChecksPass, `skin ${skin}`);
    assert.ok(inOurLook(c), `skin ${skin}`);
    checkWiring(c);
    checkFirmwareScreens(c);
    assert.deepEqual(checkScreenRecords(c), { structure: 485, rows: 0, pages: 3 }, `skin ${skin}`);
    assert.deepEqual([...attributeBytes(c).carried.keys()], [], `skin ${skin}`);
  }
  const h650 = buildEmpty(false, 72).container.blob;
  const h600 = buildEmpty(false, 73).container.blob;
  assert.equal(h600.length, h650.length);
  // Runs of differing bytes, joined across gaps of up to four: the skin, the settings block's group 3, the checksum.
  const runs: [number, number][] = [];
  h650.forEach((value, k) => {
    if (value === h600[k]) return;
    const last = runs.at(-1);
    if (last !== undefined && k - last[1] <= 4) last[1] = k; else runs.push([k, k]);
  });
  assert.equal(runs.length, 3);
  assert.deepEqual([...h600.subarray(runs[1]![0], runs[1]![1] + 1)], [1, 0, 3, 0, 5]);
});

test('todo-compile-600.md 1.2.4: the Harmony 600 draws every state in one look, so its first device\'s pages take the idle look and add none, and a recolouring takes one colour', skipWithoutIrArchive(), () => {
  const empty = buildEmpty(false, 73).container;
  const idle = FOUR_SLOT_CHOICES.stateColours.idle;
  // Before any page of theirs, the device and activity states read as the idle one.
  assert.deepEqual(ourStateColours(empty), { idle, device: idle, activity: idle });
  const out = composeCatalogueDevices(empty, IR_ARCHIVE!, [{ manufacturer: 'LG', model: 'OLED65G26LA', label: 'TV', full: true, inputs: true }],
    { maxDevices: 5, delays: FOUR_SLOT_CHOICES.delays });
  const c = parse(out.bytes);
  assert.ok(c.allChecksPass);
  // No look in the device colour was added: the device pages draw the idle look's background and corner program.
  assert.equal(stateLookOf(c, FOUR_SLOT_CHOICES.stateColours.device), undefined);
  const look = stateLookOf(c, idle)!;
  const chrome = deviceModeChrome(c);
  assert.deepEqual([chrome.crossed, chrome.corner], [look.background, look.corner]);
  assert.deepEqual(ourStateColours(c), { idle, device: idle, activity: idle });
  // One colour recolours the one look; three are refused, since one background cannot take three.
  const grey = rgbTo565(128, 128, 128);
  assert.deepEqual(ourStateColours(recolouredStates(c, { idle: grey, device: grey, activity: grey })),
    { idle: grey, device: grey, activity: grey });
  assert.throws(() => recolouredStates(c, FOUR_SLOT_CHOICES.stateColours), /one colour for all three/);
  // The Harmony 650 keeps its three.
  assert.deepEqual(ourStateColours(buildEmpty(false, 72).container), { idle });
  // The 600's one colour, chosen off the test card: grey 2 of sixteen.
  assert.equal(FOUR_SLOT_CHOICES.oneLookColour, rgbTo565(33, 34, 33));
  const one = FOUR_SLOT_CHOICES.oneLookColour;
  const grey2 = buildEmptyConfiguration({
    skin: 73, builtAt: BUILT_AT, inks: FOUR_SLOT_CHOICES.letterInks, settings: FOUR_SLOT_CHOICES.settings, blendLetters: false,
    look: { ...LOOK, idleColour: one },
  }).container;
  assert.deepEqual(ourStateColours(grey2), { idle: one, device: one, activity: one });
});

test('todo-compile-600.md 1.2.4: the Harmony 600\'s letters blend, every drawn code still reads, and the file stays in its one grey', () => {
  const build = (blendLetters: boolean) => buildEmptyConfiguration({
    skin: 73, builtAt: BUILT_AT, inks: FOUR_SLOT_CHOICES.letterInks, settings: FOUR_SLOT_CHOICES.settings, blendLetters,
    look: { ...LOOK, idleColour: FOUR_SLOT_CHOICES.oneLookColour },
  });
  const plain = build(false);
  const built = build(true);
  const c = built.container;
  assert.ok(c.allChecksPass);
  assert.ok((built.blended?.length ?? 0) > 0, 'a set blended');
  assert.equal(fontSets(c)!.length, fontSets(plain.container)!.length + built.blended!.length);
  assert.equal(characterMap(c)?.drawn.resolved, characterMap(c)?.drawn.total);
  // Blending leaves the one look as it was.
  const one = FOUR_SLOT_CHOICES.oneLookColour;
  assert.deepEqual(ourStateColours(c), { idle: one, device: one, activity: one });
});

/** The test setup cut to the Harmony 600's five devices: the Sony HT and Muziek out, and the Switch out of Kodi kijken, where it holds no role. */
function fiveDeviceSetup(): Recipe {
  const setup = readRecipe(JSON.parse(readFileSync(new URL('../../corpus/setups/h650-test.json', import.meta.url), 'utf8')));
  return {
    ...setup,
    devices: setup.devices.filter((one) => one.name !== 'Sony HT' && one.name !== 'Switch'),
    activities: setup.activities.filter((one) => one.name !== 'Muziek')
      .map((one) => ({ ...one, devices: one.devices.filter((device) => device.device !== 'Switch') })),
  } as Recipe;
}

test('todo-compile-600.md 2.1: the five device test setup assembles on the Harmony 600\'s empty configuration with every page in its one grey, smaller than the 650\'s by exactly its two further looks, and the setup comparison finds nothing different from the 650\'s in 515 slots, nor in the activity keys and the drawn device lists, smoothed letters or not', skipWithoutIrArchive(), () => {
  const setup = fiveDeviceSetup();
  const on = (skin: number, name: string, colour: number) => assembleSetup({
    ...setup, model: { name, skin }, choices: { letters: 'oxanium', backgrounds: 'state colours', pictures: 'ours', blendLetters: false },
  } as Recipe, { donor: buildEmptyConfiguration({
    skin, builtAt: BUILT_AT, inks: FOUR_SLOT_CHOICES.letterInks, settings: FOUR_SLOT_CHOICES.settings, blendLetters: false,
    look: { ...LOOK, idleColour: colour },
  }).bytes, archive: IR_ARCHIVE! }).container;
  const one = FOUR_SLOT_CHOICES.oneLookColour;
  const h600 = on(73, 'Harmony 600 EMEA', one);
  const h650 = on(72, 'Harmony 650', FOUR_SLOT_CHOICES.stateColours.idle);
  assert.ok(h600.allChecksPass);
  assert.ok(inOurLook(h600));
  // Read off every page rather than through `ourStateColours`, which on one look copies the idle colour:
  // each page's first state background, 61 pages of the 600 in the one grey, the 650's same pages in three.
  const pageColours = (c: Container): Map<number, number> => {
    const counts = new Map<number, number>();
    for (const record of modeRecords(c) ?? []) {
      for (const page of record.pages) {
        const draw = (screenProgram(c, page.program) ?? []).find((step) => bitmapReference(step) !== undefined);
        const at = draw === undefined ? undefined : c.blobOffsetOf(bitmapReference(draw) as number);
        const colour = at === undefined ? undefined : stateBackgroundColour(c.blob.subarray(at));
        if (colour !== undefined) counts.set(colour, (counts.get(colour) ?? 0) + 1);
      }
    }
    return counts;
  };
  // The firmware screens' own dark fill, the icons' background, is no state's and is the same on both.
  const states = (c: Container) => new Map([...pageColours(c)].filter(([colour]) => colour !== FOUR_SLOT_CHOICES.iconBackground));
  assert.equal(pageColours(h600).get(FOUR_SLOT_CHOICES.iconBackground), 9);
  assert.equal(pageColours(h650).get(FOUR_SLOT_CHOICES.iconBackground), 9);
  assert.deepEqual([...states(h600)], [[one, 61]]);
  assert.deepEqual([...states(h650).values()].sort((x, y) => x - y), [4, 4, 53]);
  const view = setupView(h600);
  assert.equal(view.size, 515);
  assert.deepEqual(compareViews(setupView(h650), view, { menuOrder: true }), []);
  const keys = (c: Container) => activityKeys(c).map((key) => [key.key, key.kind, key.set ?? null]);
  assert.deepEqual(keys(h600), keys(h650));
  assert.equal(drawnDeviceLists(h600).length, 5);
  assert.deepEqual(drawnDeviceLists(h600), drawnDeviceLists(h650));
  // One look where the 650 draws three: two backgrounds of 32773 bytes, two corner patches of 245 and two
  // corner programs of 38 with their three byte table entries fewer.
  assert.equal(h650.blob.length - h600.blob.length, 2 * 32773 + 2 * 245 + 2 * (38 + 3));
  const generated = (c: Container) => attributeBytes(c).generated as Record<string, number>;
  const [g650, g600] = [generated(h650), generated(h600)];
  assert.deepEqual(Object.fromEntries(Object.keys(g650).map((kind) => [kind, g650[kind]! - (g600[kind] ?? 0)]).filter(([, n]) => n !== 0)),
    { pictures: 2 * 32773 + 2 * 245, 'corner programs': 2 * 38, addresses: 2 * 3 });
  // A donor in another colour comes out byte for byte the build on the grey one; any state colour chosen is refused.
  assert.deepEqual(on(73, 'Harmony 600 EMEA', FOUR_SLOT_CHOICES.stateColours.idle).blob, h600.blob);
  assert.throws(() => assembleSetup({ ...setup, model: { name: 'Harmony 600 EMEA', skin: 73 },
    choices: { letters: 'oxanium', backgrounds: 'state colours', pictures: 'ours', blendLetters: false, stateColours: { device: rgbTo565(255, 0, 0) } } } as Recipe,
  { donor: buildEmpty(false, 73).bytes, archive: IR_ARCHIVE! }), /one look, so its colour is oneLookColour/);
  // Smoothed letters, the 600's default, change nothing the view compares.
  const blended = assembleSetup({ ...setup, model: { name: 'Harmony 600 EMEA', skin: 73 } } as Recipe, {
    donor: buildEmptyConfiguration({ skin: 73, builtAt: BUILT_AT, inks: FOUR_SLOT_CHOICES.letterInks, settings: FOUR_SLOT_CHOICES.settings,
      blendLetters: false, look: { ...LOOK, idleColour: one } }).bytes, archive: IR_ARCHIVE! }).container;
  assert.ok(blended.blob.length > h600.blob.length, 'blended');
  assert.deepEqual(compareViews(view, setupView(blended), { menuOrder: true }), []);
});

test('todo-compile-600.md 2.1: Logitech\'s two Harmony 600 compiles do not read as our look, the assembly refuses one as a donor, and the seven device setup is refused at the 600\'s five', skipUnless('h600_config', 'calibration_h600'), () => {
  for (const name of ['h600_config', 'calibration_h600']) assert.equal(inOurLook(parse(new Uint8Array(require_(name)))), false, name);
  const setup = readRecipe(JSON.parse(readFileSync(new URL('../../corpus/setups/h650-test.json', import.meta.url), 'utf8')));
  assert.throws(() => assembleSetup({ ...setup, model: { name: 'Harmony 600 EMEA', skin: 73 } } as Recipe, { donor: require_('h600_config') }),
    /on a donor of ours alone, an empty configuration, and this donor is Logitech's/);
  assert.throws(() => assembleSetup({ ...setup, model: { name: 'Harmony 600 EMEA', skin: 73 } } as Recipe, { donor: buildEmpty(false, 73).bytes, archive: IR_ARCHIVE ?? '' }),
    /this model holds 5/);
});
