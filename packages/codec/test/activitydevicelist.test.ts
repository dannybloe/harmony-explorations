/**
 * An activity's own device list on a Harmony 600, 650 or 700, built rather than copied, section 352,
 * `todo-compile-650.md` 6.2.11. Until then the composer moved the idle list's label instructions to their
 * new corners, ran the idle list's row lists and took the word "Activity" off another activity's list.
 *
 * The population is every configuration with an activity Logitech compiled for an arch 14 remote that the
 * lab holds as a container: the thirteen of section 312, the Harmony 700 pair counted twice, the eight
 * later compiles of the test record's Harmony 650, and the two Harmony 650 configurations other owners
 * posted. The shape is section 330's: the builder builds every activity's list from the activity and the
 * idle list's rows and labels, which are still read, the configuration's own lists are checked against
 * it, edits show the check refuses, and every real list composed again is the compiler's on the screen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container,
  activityDeviceList,
  activityKeyedRecords,
  caseQueued,
  checkActivityDeviceLists,
  checkFourSlotMenuPages,
  composeActivityDeviceList,
  FOUR_SLOT_ITEMS,
  fourSlotMenus,
  modeRecords,
  parse,
  renderPage,
  screenProgram,
  taggedList,
  valueMaps,
} from '../src/index.ts';

/** The thirteen arch 14 compiles, as `compose.test.ts`'s `ARCH14_LISTS`. */
const THIRTEEN = ['h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4'] as const;
/** Logitech's later compiles of the test record's Harmony 650, sections 337 to 351. */
const LATER_650 = ['h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean'] as const;
/** Two Harmony 650 configurations posted by other owners, harmony-decompiler issues 36 and 8. */
const OTHER_OWNERS = ['h650_issue36_config', 'h650_issue8_config'] as const;
const ALL = [...THIRTEEN, ...LATER_650, ...OTHER_OWNERS] as const;
/** Each Harmony 650's skin, 72, against the 600's 71 and 73 and the 700's 66. */
const isHarmony650 = (c: Container): boolean => ((c.versionWord ?? -1) & 0xff) === 72;

test('section 352: every activity device list of Logitech\'s arch 14 compiles is the one built for its activity off the idle list\'s rows and labels, 78 of 82, 53 of 57 on the Harmony 650',
     skipUnless(...ALL), () => {
  // Per configuration, the lists it holds and what the check compared. One configuration is refused,
  // and why: its screens are in French, its device pages' bottom line saying "Sélection pr.." where every
  // other says "Back", so the chrome cannot be built in English, which is the builders' language and not
  // the list's rule.
  const held = { all: 0, harmony650: 0 };
  const checked = { lists: 0, pages: 0, rows: 0, ownRowLists: 0 };
  const checked650 = { lists: 0, pages: 0, rows: 0, ownRowLists: 0 };
  const refused: string[] = [];
  for (const name of ALL) {
    const c = parse(require_(name));
    const lists = fourSlotMenus(c).filter((one) => one.kind === 'activity device list').length;
    held.all += lists;
    if (isHarmony650(c)) held.harmony650 += lists;
    let one;
    try {
      one = checkActivityDeviceLists(c);
    } catch (error) {
      refused.push(`${name}: ${(error as Error).message}`);
      continue;
    }
    assert.equal(one.lists, lists, `${name}: every activity list is reached and checked`);
    for (const key of Object.keys(checked) as (keyof typeof checked)[]) {
      checked[key] += one[key];
      if (isHarmony650(c)) checked650[key] += one[key];
    }
  }
  assert.deepEqual(held, { all: 82, harmony650: 57 });
  assert.deepEqual(checked, { lists: 78, pages: 149, rows: 515, ownRowLists: 515 });
  assert.deepEqual(checked650, { lists: 53, pages: 104, rows: 363, ownRowLists: 363 });
  assert.deepEqual(refused, ["h650_issue8_config: no font of the title's size spells 'Back'"]);
});

test('section 352: each real activity list composed again is the compiler\'s on the screen, 149 pages of 149, and differs only where the compiler\'s own list holds a text the new one points at',
     skipUnless(...ALL.filter((name) => name !== 'h650_issue8_config')), () => {
  // The calibration. Every real activity's two cases under Devices are pointed back at the idle list and
  // its list composed again. The composed pages draw what the compiler's draw, and their programs are the
  // compiler's byte for byte except where the compiler's list is the one inline copy of a text: the
  // composed list then points at that copy, which is the compiler's own rule for a text drawn before. The
  // order rule is not idle: on 77 of the 78 lists putting the activity's devices first gives another order
  // than the idle list's. Each composed configuration then passes both checks, section 334's with its
  // half about where a text points, the new list included.
  const count = { lists: 0, pages: 0, raster: 0, programBytes: 0, textsPointingAtTheRealInlineCopy: 0, otherDifferences: 0,
    orderIsNotIdle: 0, composedChecks: 0, homesHold: 0 };
  for (const name of ALL.filter((one) => one !== 'h650_issue8_config')) {
    const c = parse(require_(name));
    const maps = valueMaps(c)!;
    const devices = activityKeyedRecords(c).devices;
    const idle = fourSlotMenus(c).find((one) => one.kind === 'idle device list')!.menu;
    const held = checkActivityDeviceLists(c).lists;
    let last: Container | undefined;
    for (const [activity, target] of maps[devices[0]!]!.entries) {
      const real = caseQueued(c, target)!.operand;
      if (real === idle) continue;
      const back = new Uint8Array(c.blob);
      for (const map of devices) {
        const own = maps[map]!.entries.find(([key]) => key === activity)![1];
        back.set([idle & 0xff, idle >> 8], c.blobOffsetOf(own)! + 1);
      }
      const listed = composeActivityDeviceList(parse(back), activity);
      const after = parse(listed.bytes);
      count.lists += 1;
      // The composer lists what the builder builds, and the activity's devices first is a rule that bites.
      const built = activityDeviceList(c, activity);
      assert.deepEqual(listed.order, built.order, `${name}: activity ${activity}'s composed order is the built one`);
      if (built.order.join() !== idleOrderOf(c, idle).join()) count.orderIsNotIdle += 1;
      const records = modeRecords(after)!;
      records[listed.mode]!.pages.forEach((page, p) => {
        const realPage = records[real]!.pages[p]!;
        count.pages += 1;
        if (JSON.stringify(renderPage(after, page)!.raster) === JSON.stringify(renderPage(after, realPage)!.raster)) count.raster += 1;
        const ours = screenProgram(after, page.program)!;
        const theirs = screenProgram(after, realPage.program)!;
        const bytes = (one: { start: number; length: number }) => [...after.blob.subarray(one.start, one.start + one.length)].join();
        // The same number of instructions first, or a shorter composed page would leave some unread below.
        assert.equal(ours.length, theirs.length, `${name}: activity ${activity}'s page ${p + 1} has the compiler's length`);
        if (ours.every((one, k) => bytes(one) === bytes(theirs[k]!))) {
          count.programBytes += 1;
          return;
        }
        ours.forEach((one, k) => {
          const other = theirs[k]!;
          if (bytes(one) === bytes(other)) return;
          // Ours by reference, `04 x y` and the address low byte first, at the compiler's inline copy.
          const home = after.flashBase + other.start + 3;
          const pointed = after.blob.subarray(one.start + 3, one.start + 6);
          if (one.opcode === 0x04 && other.opcode === 0x05 && one.operands[0] === other.operands[0]
              && one.operands[1] === other.operands[1] && (pointed[0]! | pointed[1]! << 8 | pointed[2]! << 16) === home) {
            count.textsPointingAtTheRealInlineCopy += 1;
          } else {
            count.otherDifferences += 1;
          }
        });
      });
      // The real list is reached by no activity now and the composed one by this one, so the count stays.
      if (checkActivityDeviceLists(after).lists === held) count.composedChecks += 1;
      last = after;
    }
    // Section 334's whole check, where every text points, once per configuration on its last composition,
    // since it walks every menu page and the compositions differ only in which list is new.
    if (last !== undefined) {
      checkFourSlotMenuPages(last);
      count.homesHold += 1;
    }
  }
  assert.deepEqual(count, { lists: 78, pages: 149, raster: 149, programBytes: 110, textsPointingAtTheRealInlineCopy: 228,
    otherDifferences: 0, orderIsNotIdle: 77, composedChecks: 78, homesHold: 22 });
});

/** The device modes an idle list's rows enter, page after page, each page in `FOUR_SLOT_ITEMS` order. */
function idleOrderOf(c: Container, idle: number): number[] {
  const lists = c.actionLists()!;
  return modeRecords(c)![idle]!.pages.flatMap((page) => {
    const entries = taggedList(c, page.list)!.entries;
    return FOUR_SLOT_ITEMS.flatMap((item) => entries.filter((entry) => (entry.tag & 0x3f) === item.scan)
      .map((entry) => lists[entry.operand]![0]!.operand));
  });
}

test('section 352: the activity device list check refuses two rows swapped and a centre key through another record, and a list is composed where no activity has one',
     skipUnless('h650_config_region', 'h650_issue8_config'), () => {
  // Edits of `h650_config_region`, each where the compiler's list is the built one, each refused. The
  // first activity list's first page binds its first two entries as stored, 9 then 8, bottom left and top
  // left, to each other's row lists, on the page and not on its copy; and its record maps the centre key
  // through the record after the built one.
  const base = require_('h650_config_region');
  const c = parse(base);
  const list = fourSlotMenus(c).find((one) => one.kind === 'activity device list')!.menu;
  const refused = (edit: (bytes: Uint8Array) => void): string => {
    const bytes = base.slice();
    edit(bytes);
    try {
      checkActivityDeviceLists(parse(bytes));
    } catch (error) {
      return (error as Error).message;
    }
    return 'accepted';
  };
  const page = modeRecords(c)![list]!.pages[0]!;
  const at = c.blobOffsetOf(page.list)!;
  assert.equal(c.blob[at], 4, 'the first page binds four rows, narrow form');
  assert.match(refused((bytes) => {
    // Each entry is tag, u16 operand low byte first, opcode: swap the first two entries' operands.
    const first = bytes.slice(at + 2, at + 4);
    bytes.copyWithin(at + 2, at + 6, at + 8);
    bytes.set(first, at + 6);
  }), /does not enter mode \d+ and mark it/);
  const record = modeRecords(c)![list]!;
  const centre = record.entries.findIndex((one) => one.tag === 0x99);
  const operandAt = c.blobOffsetOf(record.start)! + 1 + 4 * centre + 2;
  assert.match(refused((bytes) => { bytes[operandAt] = bytes[operandAt]! + 1; }), /own entries are not the ones built/);
  assert.equal(refused(() => {}), 'accepted');

  // No activity's key opening a list of its own: all of them pointed back at the idle list. Until here
  // the composer refused, having no list to take "Activity" off; the word is built now, and the list is
  // the compiler's on the screen.
  const maps = valueMaps(c)!;
  const devices = activityKeyedRecords(c).devices;
  const idle = fourSlotMenus(c).find((one) => one.kind === 'idle device list')!.menu;
  const back = new Uint8Array(c.blob);
  const realOf = new Map<number, number>();
  for (const [activity, target] of maps[devices[0]!]!.entries) {
    const real = caseQueued(c, target)!.operand;
    if (real === idle) continue;
    realOf.set(activity, real);
    for (const map of devices) {
      const own = maps[map]!.entries.find(([key]) => key === activity)![1];
      back.set([idle & 0xff, idle >> 8], c.blobOffsetOf(own)! + 1);
    }
  }
  assert.equal(checkActivityDeviceLists(parse(back)).lists, 0, 'no activity has a list of its own');
  const [activity, real] = [...realOf][0]!;
  const listed = composeActivityDeviceList(parse(back), activity);
  const after = parse(listed.bytes);
  const records = modeRecords(after)!;
  assert.deepEqual(records[listed.mode]!.pages.map((one) => JSON.stringify(renderPage(after, one)!.raster)),
    records[real]!.pages.map((one) => JSON.stringify(renderPage(after, one)!.raster)));

  // A language the builders do not speak: the Harmony 650 another owner posted is in French.
  assert.throws(() => activityDeviceList(parse(require_('h650_issue8_config')), 1), /spells 'Back'/);
});
