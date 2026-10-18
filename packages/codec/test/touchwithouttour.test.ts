/**
 * The welcome tour and the start's Remote Assistant left out of a Harmony One configuration, `todo-compile-one.md`
 * 4.10, `docs/findings.md` section 421, and the list census that leaving anything out of base slot 10 rests on.
 *
 * **Three things are measured here.** The census, `listCallSites`, over the nineteen Harmony One compiles: since it
 * reads base slots 10 and 8 through `archSlot` it finds the calls inside action lists, which reading raw slots 10
 * and 8 missed, and every list nothing reaches drops out of every compile with every check passing; on the test
 * setup's donor each holder of the census is one the drop cannot do without but the leading list. Then
 * `withoutTourAndAssistant` on the sixteen English compiles of skin 54: what it takes out, that nothing left names
 * any of it, and that every builder of the touch family rebuilds the result byte for byte. And the choice on the
 * composed path, `TouchChoices.welcomeTour`, off by default.
 *
 * Arch 12 (Harmony One) alone: the touch family's step, and the census measured here on that family's compiles;
 * the Harmony 600, 650 and 700's census is `assemble.test.ts`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import { u16 } from '../src/bytes.ts';
import { BINDING_SLOT, archSlot, parse, type Container } from '../src/gspm.ts';
import { dropLists, instructionSites, listCallSites, namedLists } from '../src/assemble.ts';
import { assertStateTableConsistent, modeRecords, taggedList } from '../src/sections.ts';
import { touchPages } from '../src/tables.ts';
import { assertQueueFits } from '../src/queue.ts';
import { takeApart } from '../src/frame.ts';
import { reachablePrograms } from '../src/screen.ts';
import { dropModes } from '../src/shared/dropmodes.ts';
import { withoutTourAndAssistant } from '../src/families/touch/withouttour.ts';
import { touchTourScreenModes } from '../src/families/touch/tourscreens.ts';
import { checkTouchWiring, withoutTouchStartupLadder } from '../src/families/touch/wiring.ts';
import { checkTouchScreenTexts, describeTouchScreenTexts } from '../src/families/touch/screentexts.ts';
import { TOUCH_FIXED_SCREENS, touchFixedScreenModes, withTouchOptionsWithoutTour } from '../src/families/touch/fixedscreens.ts';
import { withTouchBuilders, withTouchComposedBuilders } from '../src/families/touch/builders.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';

/** The sixteen English compiles of skin 54, the population every builder of the touch family rebuilds. */
const SKIN_54 = [
  'harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830', 'calibration_one',
  'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2', 'compiled_protocols_3',
  'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3', 'one_friend_legacy_sync_config',
  'phase7_before', 'phase7_after',
] as const;
/** The three beyond them: the European factory file and its programmed copy, and the Dutch one. */
const BEYOND = ['one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'] as const;

const containerOf = (name: string): Container => parse(new Uint8Array(require_(name)));

/** The start list, base slot 8's call: no list below it is the composer's to drop. */
const startList = (c: Container): number => {
  const lead = c.sections[archSlot(c.architecture!, BINDING_SLOT)]!;
  return u16(c.blob, c.blobOffsetOf(lead.address)! + 1);
};

/** The lists nothing reaches, the census's own answer. */
const unreached = (c: Container): number[] => {
  const named = namedLists(c);
  return (c.actionLists() ?? []).map((_, k) => k).filter((k) => !named.has(k));
};

// ---------------------------------------------------------------------------------------------------------
// The census

/** Per compile, the census's sites, and the lists nothing reaches, which the drop takes out, and their bytes. */
const CENSUS: Readonly<Record<string, [number, number, number]>> = {
  harvest_one_two_devices: [3067, 59, 485], one_spare_after_sync: [3154, 60, 540], one_spare_myharmony: [7071, 106, 862],
  one_spare_20260830: [7476, 111, 903], calibration_one: [4322, 74, 638], calibration_favchannels: [4403, 64, 568],
  calibration_favzero: [7328, 111, 903], compiled_protocols: [10311, 173, 1385], compiled_protocols_2: [9429, 193, 1525],
  compiled_protocols_3: [8453, 135, 1071], harvest_one_families_1: [3462, 44, 380], harvest_one_families_2: [2937, 58, 478],
  harvest_one_families_3: [3642, 62, 506], one_friend_legacy_sync_config: [4877, 94, 778], phase7_before: [4403, 64, 568],
  phase7_after: [4676, 76, 652], one_config: [6701, 111, 987], one_config_unprogrammed: [3331, 52, 454],
  one_friend_asfound_config: [3281, 90, 774],
};

test('todo-compile-one 4.10: on all nineteen Harmony One compiles every list nothing reaches drops out, none below the start list, with every check passing, the wiring still read where it was, and every list reached after',
     skipUnless(...SKIN_54, ...BEYOND), () => {
  const got: Record<string, [number, number, number]> = {};
  for (const name of [...SKIN_54, ...BEYOND]) {
    const c = containerOf(name);
    const census = listCallSites(c);
    const gone = unreached(c);
    const floor = startList(c);
    assert.equal(gone.filter((k) => k < floor).length, 0, `${name}: a list below the start reached by nothing`);
    let wiring = true;
    try {
      checkTouchWiring(c);
    } catch {
      wiring = false;
    }
    const d = dropLists(c, gone, floor, census);
    const e = parse(d.bytes);
    assert.ok(e.allChecksPass, name);
    assert.equal(namedLists(e).size, e.actionLists()!.length, `${name}: a list is reached by nothing after`);
    if (wiring) checkTouchWiring(e);
    got[name] = [census.length, d.dropped.length, d.length];
  }
  assert.deepEqual(got, CENSUS);
  // 102324 places in all; reading raw slots 10 and 8, as the census did before 4.10, found 1553 of the 3067 on the
  // donor, none inside an action list, and the drop refused, section 413.
  assert.equal(Object.values(got).reduce((sum, one) => sum + one[0], 0), 102324);
});

test('todo-compile-one 4.10: on the test setup\'s donor every holder of the census names lists the drop moves and the drop refuses a census short of it, but the leading list, whose one call is the start list',
     skipUnless('harvest_one_two_devices'), () => {
  const c = containerOf('harvest_one_two_devices');
  const census = listCallSites(c);
  const gone = unreached(c);
  const floor = startList(c);
  const lowest = Math.min(...gone);
  assert.deepEqual([lowest, floor], [422, 238]);
  // Per holder: its places, those naming a list above the lowest drop, the lists no other holder names, and
  // whether the drop refuses the census without it.
  const by: Record<string, [number, number, number, boolean]> = {};
  for (const holder of new Set(census.map((one) => one.holder))) {
    const mine = census.filter((one) => one.holder === holder);
    const others = new Set(census.filter((one) => one.holder !== holder).map((one) => one.list));
    let refused = false;
    try {
      dropLists(c, gone, floor, census.filter((one) => one.holder !== holder));
    } catch {
      refused = true;
    }
    by[holder] = [mine.length, mine.filter((one) => one.list > lowest).length,
      new Set(mine.map((one) => one.list).filter((k) => !others.has(k))).size, refused];
  }
  assert.deepEqual(by, {
    'action list': [1513, 1496, 475, true], 'base slot 9 entry': [181, 13, 172, true], 'leading list': [1, 0, 1, false],
    'mode key map': [430, 228, 423, true], 'page list copy': [417, 415, 417, true], 'page list': [417, 417, 417, true],
    'screen program': [79, 42, 79, true], 'state transition': [10, 8, 9, true], timer: [19, 19, 18, true],
  });
  // The action lists' 1513 are what reading raw slot 10 missed: on the Harmony One that is base slot 9.
  assert.equal(census.length, 3067);
});

// ---------------------------------------------------------------------------------------------------------
// The tour and the Remote Assistant left out

/**
 * Per compile: the bytes the file came down by, the lists taken out and their bytes, of those the ones nothing
 * reached before either, and the hit pages taken out. Every compile loses the sixteen modes and the eleven
 * pictures only they drew.
 */
const LEFT_OUT: Readonly<Record<string, [number, number, number, number, number]>> = {
  harvest_one_two_devices: [245513, 121, 970, 0, 12], one_spare_after_sync: [245340, 118, 940, 0, 12],
  one_spare_myharmony: [245246, 118, 940, 0, 11], one_spare_20260830: [245323, 118, 940, 3, 12],
  calibration_one: [245332, 118, 940, 0, 12], calibration_favchannels: [245332, 118, 940, 0, 12],
  calibration_favzero: [245325, 118, 940, 3, 12], compiled_protocols: [245322, 118, 940, 3, 12],
  compiled_protocols_2: [245323, 118, 940, 3, 12], compiled_protocols_3: [245323, 118, 940, 3, 12],
  harvest_one_families_1: [245593, 121, 970, 0, 13], harvest_one_families_2: [245504, 121, 970, 0, 12],
  harvest_one_families_3: [245583, 121, 970, 0, 13], one_friend_legacy_sync_config: [245325, 118, 940, 0, 12],
  phase7_before: [245332, 118, 940, 0, 12], phase7_after: [245328, 118, 940, 0, 12],
};

test('todo-compile-one 4.10: on the sixteen English compiles of skin 54 the tour\'s eleven screens and the Remote Assistant\'s five go with what only they reach, nothing left names any of it, every check holds, and every builder of the family rebuilds the result byte for byte',
     skipUnless(...SKIN_54), () => {
  const got: Record<string, [number, number, number, number, number]> = {};
  for (const name of SKIN_54) {
    const c = containerOf(name);
    const w = withoutTourAndAssistant(c);
    const e = w.container;
    assert.deepEqual([w.modes.length, w.pictures], [16, 11], name);
    assert.ok(e.allChecksPass, name);
    // Nothing left names what went: every list call, every mode entered and every page's hit page resolves.
    const lists = e.actionLists()!.length;
    const records = modeRecords(e)!;
    const pages = touchPages(e)!.records.length;
    assert.equal(listCallSites(e).filter((one) => one.list >= lists).length, 0, `${name}: a call past base slot 10`);
    assert.equal(instructionSites(e, 0x7e).filter((one) => one.operand >= records.length).length, 0, `${name}: a mode past base slot 6`);
    assert.equal(records.flatMap((one) => one.pages).filter((page) => page.lead! >= pages).length, 0, `${name}: a hit page past base slot 17`);
    // The rails a writer has to respect, and the family's own reading of the result.
    assertStateTableConsistent(e);
    assertQueueFits(e);
    checkTouchWiring(e);
    checkTouchScreenTexts(e);
    assert.deepEqual(touchTourScreenModes(e).modes, [], name);
    // Lists nothing reaches: what there was, less the ones that named what went.
    assert.equal(unreached(e).length, unreached(c).length - w.unreachedBefore, name);
    // Every builder rebuilds the result as it is: it is in the form Logitech's compiles hold, fourteen parts.
    assert.equal(Buffer.compare(withTouchBuilders(e).container.blob, e.blob), 0, `${name}: a builder changes the result`);
    // And it is a fixed point: a configuration without the sixteen comes back as it is.
    assert.equal(withoutTourAndAssistant(e).container, e);
    got[name] = [c.blob.length - e.blob.length, w.lists.length, w.listBytes, w.unreachedBefore, w.hitPages.length];
  }
  assert.deepEqual(got, LEFT_OUT);
});

test('todo-compile-one 4.10: the three compiles beyond the sixteen are refused, by the fixed screens\' finder and the tour\'s',
     skipUnless(...BEYOND), () => {
  for (const name of ['one_config', 'one_config_unprogrammed']) {
    assert.throws(() => withoutTourAndAssistant(containerOf(name)), /holds 2 screens of the look of Month, not one/, name);
  }
  assert.throws(() => withoutTourAndAssistant(containerOf('one_friend_asfound_config')), /holds 0 screens of the look of Tour Another Activity, not one/);
});

test('todo-compile-one 4.10: where a screen that stays draws text by reference into what goes, the same steps without first drawing the texts away are refused',
     skipUnless('one_spare_after_sync'), () => {
  // The control on `withTextsSharedAway`: the same steps without it. An activity's own Remote Assistant screens
  // here draw the start's words by reference into a screen of the five, and taking what is drawn into out is
  // refused rather than leaving the reference naming nothing.
  const c = containerOf('one_spare_after_sync');
  const modes = touchTourScreenModes(c).modes;
  assert.throws(() => dropModes(withTouchOptionsWithoutTour(withoutTouchStartupLadder(c)), modes),
    /that stays names a slot-11-program being taken out/);
});

test('todo-compile-one 4.10: Options comes out one page, its three rows Date and Time, Sounds and Screen Sensitivity, without Tutorial or Turn Remote Assistant, its page turn keys swallowed and no page count or number drawn',
     skipUnless('harvest_one_two_devices'), () => {
  const pageOf = (c: Container) => {
    const mode = touchFixedScreenModes(c)[TOUCH_FIXED_SCREENS.indexOf('Options')]!;
    const record = modeRecords(c)![mode]!;
    const d = describeTouchScreenTexts(c, takeApart(c));
    const words = record.pages.map((page) => {
      const starts = new Set([...reachablePrograms(c, [page.program]).values()].flat().map((one) => one.start));
      return d.texts.filter((_, k) => starts.has(d.draws[k]!)).map((one) => one.word);
    });
    const own = (taggedList(c, record.start)?.entries ?? []).map((one) => `${one.tag & 0x3f} ${one.opcode.toString(16)}`);
    const lists = record.pages.map((page) => (taggedList(c, page.list)?.entries ?? []).map((one) => `${one.tag & 0x3f} ${one.opcode.toString(16)}`));
    return { words, own, lists };
  };
  const c = containerOf('harvest_one_two_devices');
  const before = pageOf(c);
  assert.deepEqual(before.words, [
    ['Options', '2', 'pages', 'Options', 'Tutorial', 'Date and Time', '1', '/', 'Turn Remote Assistant', 'On', 'Turn Remote Assistant', 'Off', 'Activities', 'Current', 'Activity'],
    ['Options', '2', 'pages', 'Options', 'Screen Sensitivity', '2', '/', 'Turn Screen Sounds Off', 'Turn Screen Sounds On', 'Activities', 'Current', 'Activity'],
  ]);
  const after = pageOf(withoutTourAndAssistant(c).container);
  assert.deepEqual(after.words, [
    ['Options', 'Options', 'Date and Time', 'Screen Sensitivity', 'Turn Screen Sounds Off', 'Turn Screen Sounds On', 'Activities', 'Current', 'Activity'],
  ]);
  // The rail of a one page screen, section 275: its own key map takes scans 46 and 47, the page turn keys, and
  // does nothing with them, where the two page form left them to turn the page.
  assert.deepEqual(before.own, ['6 7f', '7 7f', '38 0', '45 7f']);
  assert.deepEqual(after.own, ['47 0', '46 0', '6 7f', '7 7f', '38 0', '45 7f']);
  // The rows, by scan: 48 Date and Time, 49 the sounds' value map, 50 Screen Sensitivity, 51 the key's value map.
  assert.deepEqual(after.lists, [['50 7f', '51 72', '48 7f', '49 72']]);
});

// ---------------------------------------------------------------------------------------------------------
// The choice

test('todo-compile-one 4.10: the composed path leaves the tour and the Remote Assistant out unless the family\'s choice keeps them, and kept it builds what it built before',
     skipUnless('harvest_one_two_devices'), () => {
  assert.equal(TOUCH_CHOICES.welcomeTour, false);
  const c = containerOf('harvest_one_two_devices');
  const kept = withTouchComposedBuilders(c, [], { welcomeTour: true }).container;
  assert.equal(Buffer.compare(kept.blob, withTouchBuilders(c).container.blob), 0);
  assert.equal(Buffer.compare(kept.blob, c.blob), 0);
  const left = withTouchComposedBuilders(c, [], { welcomeTour: false }).container;
  assert.equal(Buffer.compare(left.blob, withoutTourAndAssistant(c).container.blob), 0);
  assert.equal(c.blob.length - left.blob.length, 245513);
});
