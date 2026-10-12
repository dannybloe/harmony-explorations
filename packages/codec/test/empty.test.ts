/**
 * The Harmony 650 built from nothing, `todo-compile-650.md` 11.1.1 and plan 008. No lab: the point of
 * these is that a configuration comes out of the codec with no Logitech file as input. The one test that
 * reads the lab is a calibration, our corner program against every compile's, and it skips without it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  type Container, ENTER_MODE, FOUR_SLOT_CHOICES, LETTERING_CHARACTERS, MAP_VALUE_OPCODE, RUN_SCREEN_PROGRAM, SCREEN_QUEUE_INSTRUCTION,
  characterMap, claims, describeStateTables, describeWiring, fontSets, glyphOf, letterRows, modePages, modeRecords, oxaniumFace,
  pageListCopies, screenProgram, stateVariables, takeApart, taggedList, valueMaps,
} from '../src/index.ts';
import {
  EMPTY_FONT_SETS, EMPTY_MODES, EMPTY_VARIABLES, buildEmptyConfiguration, buildEmptySkeleton, emptyCodeOf, emptyVariable,
} from '../src/families/four-slot/empty.ts';
import { DEVICES_KEY_TAG, DEVICE_MODE_PROGRAM_TAG, batteryPrograms } from '../src/families/four-slot/chrome.ts';
import { cornerProgram } from '../src/families/four-slot/empty.ts';
import { require_, skipUnless } from '@harmony/lab';
import { archSlot, parse } from '../src/index.ts';
import { checkFirmwareScreens } from '../src/firmwarescreens.ts';

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
  assert.throws(() => buildEmptySkeleton({ skin: 73, builtAt: BUILT_AT, inks: FOUR_SLOT_CHOICES.letterInks }), /Harmony 650/);
});

/** The family's look, as an empty configuration takes it. */
const LOOK = {
  idleColour: FOUR_SLOT_CHOICES.stateColours.idle,
  barColour: FOUR_SLOT_CHOICES.barColour,
  pictures: { icons: FOUR_SLOT_CHOICES.icons, colour: FOUR_SLOT_CHOICES.iconColour, background: FOUR_SLOT_CHOICES.iconBackground },
};

function buildEmpty() {
  return buildEmptyConfiguration({
    skin: 72, builtAt: BUILT_AT, inks: FOUR_SLOT_CHOICES.letterInks, settings: FOUR_SLOT_CHOICES.settings, look: LOOK,
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

test('11.1.1.3: the menus\' keys lead where a compile with activities leads with none running', () => {
  const c = buildEmpty().container;
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
  // Both menus queue the battery program, which draws our corner mark when the battery runs low.
  for (const mode of [EMPTY_MODES.idleList, EMPTY_MODES.activityMenu]) {
    assert.deepEqual(own(mode, DEVICE_MODE_PROGRAM_TAG), { tag: DEVICE_MODE_PROGRAM_TAG, operand: 0, opcode: RUN_SCREEN_PROGRAM, flags: undefined });
  }
  assert.deepEqual(batteryPrograms(c), [0]);
});

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

/** Every Harmony 600, 650 and 700 compile the lab holds, as `activitydevicelist.test.ts` lists them, and the harvest. */
const COMPILES = ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4',
  'h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean',
  'h650_issue36_config', 'h650_issue8_config', 'harvest_650_two_devices'] as const;

test('section 374: our corner program is every compile\'s, byte for byte but its four addresses, 70 of 70 on 24',
  skipUnless(...COMPILES), () => {
    const picture = (): { bytes: Uint8Array; refs: []; owner: string } => ({ bytes: new Uint8Array(0), refs: [], owner: 'picture-bank' });
    const ours = cornerProgram(picture(), picture());
    let count = 0;
    for (const name of COMPILES) {
      const c = parse(require_(name));
      const table = c.pointerArray(archSlot(14, 11))!;
      for (const index of batteryPrograms(c)) {
        const root = table[index]!;
        const at = c.blobOffsetOf(root)!;
        // The three pieces in the compiler's order, back to back, each compared with its address fields
        // blanked; then the four addresses: the two cases right behind the switch, each jumping to the tail.
        let off = at;
        for (const piece of ours) {
          const theirs = Uint8Array.from(c.blob.subarray(off, off + piece.bytes.length));
          for (const ref of piece.refs) theirs.fill(0, ref.at, ref.at + 3);
          assert.deepEqual([...theirs], [...piece.bytes], `${name} entry ${index}`);
          off += piece.bytes.length;
        }
        const u24 = (o: number): number => c.blob[o]! | (c.blob[o + 1]! << 8) | (c.blob[o + 2]! << 16);
        assert.equal(c.blobOffsetOf(u24(at + 4)), at + ours[0]!.bytes.length, `${name} entry ${index}'s case 0`);
        assert.equal(c.blobOffsetOf(u24(at + 10)), at + ours[0]!.bytes.length + ours[1]!.bytes.length, `${name} entry ${index}'s range`);
        for (const k of [1, 2]) {
          const caseAt = c.blobOffsetOf(u24(at + (k === 1 ? 4 : 10)))!;
          assert.equal(u24(caseAt + 7) - root, 13, `${name} entry ${index} case ${k} jumps to the tail`);
        }
        count += 1;
      }
    }
    assert.equal(count, 70);
  });
