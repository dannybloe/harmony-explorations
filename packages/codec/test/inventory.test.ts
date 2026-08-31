/**
 * What a config says it is for: its devices, its activities, and what its state variables mean.
 *
 * **No test here quotes a brand out of a contributor's config.** What lands in this repository is
 * the shape and the count: how many variables carry a device identifier, not which; that a name ends
 * in its variable's value count, not what the name says. `CurrentActivityState`, `Root` and `State`
 * are the generator's own words and are quoted freely.
 *
 * `docs/findings.md` section 86.
 *
 * **The population figures here are exact, not floors.** Fourteen of them read `>= n` until 13 August
 * 2026, and the review that changed them found the two shapes that makes: a floor well under the
 * figure, `delegating >= 100` against 3021, which absorbs a whole sample dropping out; and a floor
 * that equals it, `agree >= 62` against 62, which reads as slack and has none, so it fails on the
 * first sample that adds a key and passes on any that removes one. Every list these loops walk is a
 * literal in this file, so an exact count moves only when a reader changes or a sample is added on
 * purpose, and then it moves in the diff where somebody sees it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LAB, load, skipUnless, skipWithoutLab, require_ } from '@harmony/lab';
import {
  ACTION_LIST_INDEX_OPCODE,
  handlerSets,
  ACTIVITY_STATE_NAME,
  activities,
  deviceModeTitles,
  deviceVariables,
  devices,
  infraredCodesPerList,
  infraredGroupsPerList,
  inventory,
  keyCodes,
  activityBindings,
  activityCount,
  activityNames,
  activityWriterCount,
  characterMap,
  idleActivityValue,
  KEY_EVENT_PRESS,
  keyLabels,
  pairLabelsToGroups,
  softKeyScans,
  pageScans,
  FIRMWARE_STATE_VARIABLES,
  FIRMWARE_STATE_VARIABLE_MAX,
  stateTable,
  SCREEN_ROWS,
  touchOwner,
  touchPageOf,
  modePages,
  screenStrings,
  taggedList,
  archSlot,
  deviceCount,
  deviceDelays,
  deviceIdOfGroup,
  deviceIds,
  parameterGroups,
  STATE_WRITE_BASE,
  parse,
  reading,
  stateRecords,
  stateVariables,
} from '../src/index.ts';

/** `[sample, named variables, activities, devices, device ids in the names]`. */
const INVENTORY: readonly [string, number, number, number, number][] = [
  // The two configs of the deliberate pair, section 58. The second was compiled by Logitech's own
  // service for **one device and one activity**, chosen that day and written down before the read,
  // which is the calibration case for both numbers.
  ['one_spare_before_sync', 7, 1, 1, 0],
  ['one_spare_after_sync', 5, 1, 1, 0],
  ['one_config', 12, 8, 5, 0],
  ['one_config_unprogrammed', 7, 1, 1, 0],
  ['h600_config', 41, 3, 4, 4],
  ['h700_config', 60, 5, 6, 6],
  ['h700_config_2', 60, 5, 6, 6],
  ['arch8_config_a', 7, 1, 3, 0],
  ['arch8_config_b', 12, 2, 6, 0],
  ['arch8_config_c', 13, 3, 7, 0],
  ['arch8_config_d', 13, 3, 7, 0],
  ['h525_config', 8, 3, 4, 0],
  ['h525_config_2', 4, 1, 1, 0],
  // The two of 12 August 2026, and the 880 is the corpus's **only sample with a written description
  // of what is in it**: its contributor sent a sheet naming four devices and four activities, plus a
  // fifth menu entry for the remote's own settings which is deliberately not one. Both numbers agree
  // with it, which is the first time either has been checked against anything but another reader.
  ['arch8_config_880', 11, 4, 4, 0],
  ['arch8_config_885', 16, 9, 7, 0],
];

for (const [name, variables, activities, devices, ids] of INVENTORY) {
  test(`${name} names ${variables} variables, ${activities} activities and ${devices} devices`,
    skipUnless(name), () => {
      const c = parse(load(name) as Uint8Array);
      assert.equal(stateVariables(c).length, variables);
      assert.equal(activityCount(c), activities);
      assert.equal(deviceCount(c), devices);
      assert.equal(deviceIds(c).length, ids);
      // Where the names carry identifiers at all, there is one per device. The older generators
      // emit none, which is why this is a per sample number and not a rule.
      if (ids > 0) assert.equal(ids, devices, 'one identifier per infrared group');
    });
}

test('the reader agrees with a config whose owner wrote out its own screens by hand',
  skipUnless('arch8_config_885'), () => {
    // The second calibration for section 86, and the only one from a config nobody here compiled.
    // One of the eleven configs contributed on 10 August 2026 came with a hand written sheet of that
    // remote's devices screen and activity screen. Seven devices and nine activities on the sheet,
    // and this reader had never seen it.
    //
    // **The sheet's prose describes only eight activities**, while its own activity screen lists
    // nine and the ninth is simply the one the author did not write up. So the reader is right and
    // believing the prose over the listing would have called it wrong.
    //
    // Nothing out of the sheet is quoted here or anywhere in this repository: it names its owner's
    // own equipment by make and model.
    const c = parse(load('arch8_config_885') as Uint8Array);
    assert.equal(deviceCount(c), 7);
    assert.equal(activityCount(c), 9);
    // And the rule from the test above holds on it, which is the point of checking a sample that is
    // outside the population that tallies it: every record covers its whole range evenly.
    for (const variable of stateVariables(c)) {
      const record = variable.record;
      if (record === undefined || record.count === 0) continue;
      const tally = new Map<number, number>();
      for (const value of record.values) tally.set(value.to, (tally.get(value.to) ?? 0) + 1);
      for (let value = 0; value <= record.second; value += 1) {
        assert.ok(tally.has(value), `variable ${variable.index} skips value ${value}`);
      }
      assert.equal(new Set(tally.values()).size, 1, `variable ${variable.index} is uneven`);
      assert.equal(record.count, (tally.get(0) as number) * (record.second + 1));
    }
  });

test('a safe mode container has no activities and no devices', skipUnless('h525_safemode_ahcm'),
  () => {
    // The other end of the calibration: a container that drives nothing says so. Its one named
    // variable is the activity state, and its highest value is zero.
    const c = parse(load('h525_safemode_ahcm') as Uint8Array);
    assert.equal(activityCount(c), 0);
    assert.equal(stateVariables(c).length, 1);
    assert.equal(deviceCount(c), undefined, 'no infrared table at all');
  });

test('a level 1 name ends in the number of values its variable takes', skipWithoutLab(), () => {
  // Section 86, and the reason the `u16` at +0x02 of a base slot 13 record is the **highest**
  // value: the name says how many there are, and the two differ by one every time.
  let total = 0;
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    for (const variable of stateVariables(c)) {
      if (variable.stated === undefined) continue;
      assert.notEqual(variable.record, undefined, `${name}: a name with no record`);
      assert.equal(variable.stated, (variable.record?.second as number) + 1,
        `${name}: variable ${variable.index}`);
      total += 1;
    }
  }
  assert.equal(total, 276, `${total} named variables checked`);
});

test('a record that enumerates anything enumerates every value the same number of times',
  skipWithoutLab(), () => {
    // The closure that ties the values to the header. A record either carries none, 164 of them, or
    // covers `0` to `second` with a constant number of entries per value: 1 in 100 records, 2 in
    // three, 3 in one and 4 in two. So the eight byte entries belong to the variable's range rather
    // than being a list that happens to sit after the header, and the count is the number of
    // transitions rather than the number of values.
    //
    // **The tally moved on 12 August 2026 and the rule did not**, which is what it is for: the two
    // arch 8 configs of that day added 17 records, every one of them even. The 3 and the second 4 are
    // theirs, so they widened the distribution rather than only lengthening it.
    const perValue = new Map<number, number>();
    let empty = 0;
    for (const [name] of INVENTORY) {
      const data = require_(name);
      const c = parse(data);
      for (const variable of stateVariables(c)) {
        const record = variable.record;
        if (record === undefined) continue;
        if (record.count === 0) { empty += 1; continue; }
        const tally = new Map<number, number>();
        for (const value of record.values) tally.set(value.to, (tally.get(value.to) ?? 0) + 1);
        for (let value = 0; value <= record.second; value += 1) {
          assert.ok(tally.has(value), `${name}: variable ${variable.index} skips value ${value}`);
        }
        const each = [...new Set(tally.values())];
        assert.equal(each.length, 1, `${name}: variable ${variable.index} is uneven`);
        assert.equal(record.count, (each[0] as number) * (record.second + 1));
        perValue.set(each[0] as number, (perValue.get(each[0] as number) ?? 0) + 1);
      }
    }
    assert.ok(empty > 0);
    assert.deepEqual(
      [...perValue.entries()].sort((a, b) => a[0] - b[0]),
      [[1, 100], [2, 3], [3, 1], [4, 2]],
    );
  });

test('a state value is a transition carrying one action list instruction', skipWithoutLab(), () => {
  // The eight bytes section 60 left undecoded. Four checks, all of them corpus wide: the lead byte
  // is the format's usual spare zero, the last three are a readable instruction, an instruction
  // that names a base slot 10 entry names one that exists, and no `from` or `to` names a value the
  // variable cannot take.
  let values = 0;
  let indexed = 0;
  let sentinels = 0;
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    const lists = c.pointerArray(archSlot(c.architecture as number, 10)) ?? [];
    for (const record of stateRecords(c) ?? []) {
      for (const value of record.values) {
        values += 1;
        assert.equal(c.blob[value.start], 0, `${name}: the lead byte is not zero`);
        const read = reading({ opcode: value.opcode, operand: value.operand },
          c.architecture as number);
        assert.notEqual(read?.depth, 'none', `${name}: opcode 0x${value.opcode.toString(16)}`);
        if (value.opcode === ACTION_LIST_INDEX_OPCODE) {
          indexed += 1;
          assert.ok(value.operand < lists.length,
            `${name}: action list ${value.operand} of ${lists.length}`);
        }
        for (const field of [value.from, value.to]) {
          if (field < 0) { sentinels += 1; continue; }
          assert.ok(field <= record.second,
            `${name}: ${field} is past the variable's highest value ${record.second}`);
        }
      }
    }
  }
  assert.equal(values, 657, `${values} values`);
  assert.ok(indexed > 0 && sentinels > 0);
});

test('the sentinels are negative and there are two of them', skipWithoutLab(), () => {
  // `-2` in both fields and `-3` in `from`. Named rather than counted, because a third one turning
  // up is a change in the format and should fail here rather than be absorbed.
  const seen = new Set<number>();
  for (const [name] of INVENTORY) {
    const data = require_(name);
    for (const record of stateRecords(parse(data)) ?? []) {
      for (const value of record.values) {
        for (const field of [value.from, value.to]) if (field < 0) seen.add(field);
      }
    }
  }
  assert.deepEqual([...seen].sort((a, b) => b - a), [-2, -3]);
});

test('every container with a name tree names exactly one activity state', skipWithoutLab(), () => {
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    const found = stateVariables(c)
      .filter((variable) => variable.name.split('_')[0] === ACTIVITY_STATE_NAME);
    assert.equal(found.length, 1, `${name}: activity state variables`);
    // And it is the qualified form, so a matcher on the whole label would miss it.
    assert.equal(found[0]?.label, `${ACTIVITY_STATE_NAME}_0`);
  }
});

test('the activity variable is written as many times as it has values', skipWithoutLab(), () => {
  // A second measurement of the same number, from the other interpreter: the action list language
  // writes state variable `n` with opcode `0x80 | n`, so the writes can be counted without going
  // near the name tree. Every value written is inside the range, and the number of distinct ones is
  // the highest value.
  //
  // **The value that means "no activity" is asserted now, and this comment used to say no sample
  // separated the two candidates.** It said either zero is idle or the top is. Both were wrong about
  // the mechanism: the idle value is base slot 13's own `first`, the field section 60 read as an
  // initial value and could not confirm, and `one_config` is the sample that separates it from
  // everything else because its `first` is 7 where its highest is 8. Section 121.
  for (const [name, , activities] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    const variable = stateVariables(c)
      .find((v) => v.name.split('_')[0] === ACTIVITY_STATE_NAME) as { index: number };
    // The opcode carries the variable in five bits, `0x80 | n`.
    const opcode = STATE_WRITE_BASE | (variable.index & 0x1f);
    const written = new Set<number>();
    for (const list of c.actionLists() ?? []) {
      for (const instruction of list) {
        if (instruction.opcode === opcode) written.add(instruction.operand);
      }
    }
    for (const value of written) {
      assert.ok(value >= 0 && value <= activities, `${name}: writes ${value} of ${activities}`);
    }
    assert.equal(written.size, activities, `${name}: distinct values written`);
    // And no list writes the idle value, in any user config. The safe mode container is the one that
    // does and it is the one with no activities, which is a separate test below.
    const idle = idleActivityValue(c);
    assert.equal(typeof idle, 'number', `${name}: states an idle value`);
    assert.ok(!written.has(idle as number), `${name}: nothing writes the idle value ${idle}`);
  }
});

test('the idle value is the one the corpus does not write, and it is not always the top',
  skipUnless('one_config'), () => {
    // The closure that makes the idle reading a finding rather than a guess. In ten of the eleven
    // containers `first` equals the highest value, so any rule of the form "the top value is idle"
    // fits them all. `one_config` is the counterexample: eight activities, values 0 to 8, `first` of
    // 7, and the value **8** is bound to a key while 7 is bound to nothing. So the field states it.
    const c = parse(load('one_config') as Uint8Array);
    assert.equal(activityCount(c), 8);
    assert.equal(idleActivityValue(c), 7);
    const bound = new Set(activityBindings(c).map((one) => one.activity));
    assert.ok(bound.has(8), 'the highest value is an activity here, so it is not the idle one');
    assert.ok(!bound.has(7), 'and the idle value is bound to nothing');
    assert.equal(bound.size, 8, 'eight activities, eight of the nine values');
  });

test('the safe mode container is the only one whose lists write the idle value',
  skipUnless('h525_safemode_ahcm'), () => {
    // Which is why it reports zero activities while still carrying a list that writes the variable:
    // that list returns the remote to idle rather than starting anything. A container that behaved
    // this way and reported an activity would break the count.
    const c = parse(load('h525_safemode_ahcm') as Uint8Array);
    assert.equal(activityCount(c), 0);
    assert.equal(idleActivityValue(c), 0);
    assert.equal(activityWriterCount(c), 1);
    assert.equal(activityBindings(c).length, 0, 'and no key starts anything');
  });

test('every activity is started by a key, and all its keys are on one page', skipWithoutLab(), () => {
  // The chain of section 121: a page's tagged list binds a key to `0x7F`, that action list selects a
  // base slot 9 set with `0x1F` and operand `0xFF | set`, the set's own list writes the variable. Two
  // properties of the result are asserted here because both would break an interface: every activity
  // is reachable, and an activity belongs to one screen rather than being scattered over several.
  for (const [name, , activities] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    const bindings = activityBindings(c);
    const pages = new Map<number, Set<number>>();
    for (const one of bindings) {
      const seen = pages.get(one.activity) ?? new Set<number>();
      seen.add(one.page);
      pages.set(one.activity, seen);
    }
    assert.equal(pages.size, activities, `${name}: activities with a key`);
    for (const [activity, on] of pages) {
      assert.equal(on.size, 1, `${name}: activity ${activity} is bound on one page`);
    }
    // Every binding is a press rather than a release or a repeat, which is what makes the key the
    // thing a user pushes rather than an artefact of the event split. Section 17.
    for (const one of bindings) {
      assert.equal(one.tag & 0xc0, 0x80, `${name}: activity ${one.activity} is bound to a press`);
    }
  }
});

test('an activity page hands its keys a fresh run of action lists', skipWithoutLab(), () => {
  // The structural closure, and it discriminates: on an activity page the `0x7F` operands are a
  // contiguous ascending run of base slot 10 indices, one per key, in the tagged list's own order.
  // That holds for every activity page in the corpus and for well under half of the rest, so it is a
  // property of how the generator lays an activity menu out rather than of pages in general.
  let contiguous = 0;
  let total = 0;
  let elsewhereContiguous = 0;
  let elsewhere = 0;
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    const activityPages = new Set(activityBindings(c).map((one) => one.page));
    for (const [index, page] of modePages(c).entries()) {
      const operands = (taggedList(c, page.list)?.entries ?? [])
        .filter((entry) => entry.opcode === ACTION_LIST_INDEX_OPCODE)
        .map((entry) => entry.operand);
      if (operands.length < 2) continue;
      const run = operands.every((n, at) => at === 0 || n === (operands[at - 1] as number) + 1);
      if (activityPages.has(index)) {
        total += 1;
        if (run) contiguous += 1;
      } else {
        elsewhere += 1;
        if (run) elsewhereContiguous += 1;
      }
    }
  }
  assert.equal(contiguous, total, 'every activity page carries one contiguous run');
  assert.equal(total, 20, `activity pages, got ${total}`);
  // The control. Without it "every activity page is contiguous" would be satisfied by a corpus where
  // every page is, which would make the property no evidence at all.
  assert.ok(
    elsewhereContiguous / elsewhere < 0.8,
    `ordinary pages are not all contiguous: ${elsewhereContiguous} of ${elsewhere}`,
  );
});

test('arch 14 names every activity and the corpus names most of them', skipWithoutLab(), () => {
  // The number section 121 reports, so that it cannot quietly fall. Arch 14 resolves completely; the
  // rest is stated rather than rounded up, and the arch 12 zero has its own test below because it is
  // a proof and not a shortfall.
  let named = 0;
  let total = 0;
  const perArchitecture = new Map<number, { named: number; total: number }>();
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    const rows = activityNames(c);
    const here = rows.filter((one) => one.name !== undefined).length;
    named += here;
    total += rows.length;
    const architecture = c.architecture as number;
    const seen = perArchitecture.get(architecture) ?? { named: 0, total: 0 };
    seen.named += here;
    seen.total += rows.length;
    perArchitecture.set(architecture, seen);
    // Where a name resolved, it resolved to a place on the page as well. One without the other would
    // be a name nothing could put on a screen.
    for (const one of rows) {
      assert.equal(one.name === undefined, one.at === undefined, `${name}: name and place agree`);
    }
  }
  const arch14 = perArchitecture.get(14) as { named: number; total: number };
  assert.equal(arch14.named, arch14.total, 'arch 14 names every activity it binds');
  assert.equal(arch14.total, 13, `arch 14 activities, got ${arch14.total}`);
  assert.ok(named / total > 0.6, `the corpus names most activities: ${named} of ${total}`);
  // **Every architecture resolves completely since 12 August 2026**, arch 12 last, through the touch
  // hit map rather than through string matching. Asserted per architecture rather than as a share,
  // because a share hides which of them stopped working.
  for (const architecture of [8, 9, 12, 14]) {
    const here = perArchitecture.get(architecture) as { named: number; total: number };
    assert.equal(here.named, here.total, `arch ${architecture} names every activity it binds`);
  }
  assert.equal(named, total, `the corpus names every activity: ${named} of ${total}`);
  assert.equal(total, 50, `activities in the corpus, got ${total}`);
});

test('an activity page names as many activities as it binds, and each label once',
  skipUnless('arch8_config_880', 'arch8_config_885', 'h600_config', 'h700_config'), () => {
    // What "it resolves" has to mean for the application: a page that starts four activities hands
    // back four distinct labels, each with a place on the screen, and no two activities holding the
    // same one. The label text is never asserted here, because it is the contributor's own equipment.
    for (const name of ['arch8_config_880', 'arch8_config_885', 'h600_config', 'h700_config']) {
      const c = parse(load(name) as Uint8Array);
      const rows = activityNames(c);
      const labels = rows.map((one) => one.name);
      assert.ok(labels.every((one) => one !== undefined), `${name} names all of them`);
      assert.equal(new Set(labels).size, labels.length, `${name} gives each label to one activity`);
      for (const one of rows) {
        assert.ok((one.name as string).trim().length >= 2, `${name}: a label is a word`);
        assert.ok(one.at !== undefined && one.at.y >= 0, `${name}: and it has a place`);
      }
    }
    // The 880 is the calibration: its contributor described the remote in writing, four activities on
    // a menu of five entries. Four labels out of four is therefore checked against something outside
    // this codebase for the first time.
    const c = parse(load('arch8_config_880') as Uint8Array);
    assert.equal(activityNames(c).length, 4);
  });

test('a label the menu wraps onto a second row is read as one label', skipUnless('h525_config'), () => {
  // The Harmony 525 lays its activity menu out as two columns of two lines, so an activity's label is
  // drawn as two strings on consecutive rows and matching one row at a time returns a fragment. Three
  // of these read as `Watch`, `DVD -` and `Play on` until 12 August 2026, which is worse than reading
  // nothing: each is the first line of a different activity's label.
  //
  // What settles a continuation is not the column, since the second line is not aligned with the
  // first, but that the joined text is the **start** of something the activity's own modes say.
  const c = parse(load('h525_config') as Uint8Array);
  const rows = activityNames(c);
  assert.equal(rows.length, 3);
  for (const one of rows) {
    assert.ok(one.name !== undefined, 'every activity resolves');
    // A joined label, which is what makes this test different from the one above: two words, so the
    // fragment that used to be returned would fail it.
    assert.ok((one.name as string).includes(' '), `${one.name} spans the wrap`);
  }
  assert.equal(new Set(rows.map((one) => one.name)).size, 3);
});

test('no fixed key to row map can exist on a touch panel', skipUnless('one_config'), () => {
  // Why no **string** rule can resolve arch 12, proved from the container rather than asserted as a
  // limitation. It is also why the hit map is the answer rather than one more filter: a scan code on a
  // touch panel names a rectangle the config chose, and the rectangle is what holds the label. Section
  // 125 reads that rectangle; this test is why it had to.
  //
  // The Harmony One is the only touch model here, and base slot 17 gives it nine page shapes, so the
  // rectangle a scan code stands for is per screen. `one_config` shows the consequence: its three
  // activity pages bind activities on {50,51,52}, {50,48,49} and {48,49} while all three draw their
  // labels on the same rows. If a code named a row, code 48 would have to name one row on page 46 and
  // a different one on page 47, and the same for 49. So the hit map is what a One needs, and no
  // amount of comparing pages substitutes for it.
  const c = parse(load('one_config') as Uint8Array);
  const perPage = new Map<number, Set<number>>();
  for (const one of activityBindings(c)) {
    const seen = perPage.get(one.page) ?? new Set<number>();
    seen.add(one.scan);
    perPage.set(one.page, seen);
  }
  assert.equal(perPage.size, 3, 'three activity pages');
  const sets = [...perPage.values()].map((one) => [...one].sort((a, b) => a - b).join(','));
  assert.deepEqual(sets.sort(), ['48,49', '48,49,50', '50,51,52']);
  // The contradiction itself, which used to be a `rows.size > 0` over every page's rows collapsed into
  // one set: that says the pages draw text and nothing about the map the test is named for.
  //
  // Two of the three pages draw text on **exactly the same rows** and bind **different** scan sets, so
  // the rows cannot say which codes are bound. And scan 50 is bound on both of those, first in
  // ascending order on one and last on the other, which is what kills the rule that reads a page's
  // k-th key onto its k-th row: same rows, same code, different position.
  const rowsOf = (page: number): number[] => [...new Set(screenStrings(c)
    .filter((one) => one.program === modePages(c)[page]?.program && one.text.trim().length > 0)
    .map((one) => one.y))].sort((a, b) => a - b);
  const same = [...perPage.keys()].filter((page) => rowsOf(page).join(',') === rowsOf(45).join(','));
  assert.deepEqual(same.sort((a, b) => a - b), [45, 46], 'two pages draw identical rows');
  assert.deepEqual(rowsOf(45), [18, 57, 111, 165, 202], 'and this is where they draw them');
  const ascending = (page: number): number[] => [...(perPage.get(page) ?? [])].sort((a, b) => a - b);
  assert.notDeepEqual(ascending(45), ascending(46), 'while binding different codes');
  assert.equal(ascending(45).indexOf(50), 0, 'scan 50 is first on one of them');
  assert.equal(ascending(46).indexOf(50), 2, 'and last on the other');
});

/** Letters and digits only, since one encoding writes a space where the other writes an underscore. */
function plain(text: string): string {
  return text.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}

test('every device in the corpus has a name, and most of them are stated rather than read off a screen',
  skipWithoutLab(), () => {
    // Section 126. The count is not the interesting column: the **source** is, because the three
    // routes are not equally strong and a regression can hold the total while moving work from base
    // slot 0's ASCII to a title decoded out of glyph pixels.
    let named = 0;
    let total = 0;
    const perSource = new Map<string, number>();
    const perArchitecture = new Map<number, { named: number; total: number }>();
    for (const [name] of INVENTORY) {
      const data = require_(name);
      const c = parse(data);
      const rows = devices(c);
      if (rows.length === 0) continue;
      named += rows.filter((one) => one.name !== undefined).length;
      total += rows.length;
      for (const one of rows) {
        if (one.source === undefined) continue;
        perSource.set(one.source, (perSource.get(one.source) ?? 0) + 1);
      }
      // A device is an infrared group, so the groups are exactly `0` to `count - 1` and each is one
      // device. A reader that dropped an empty group would still pass every count above.
      assert.deepEqual(rows.map((one) => one.group), [...rows.keys()], `${name}: one device per group`);
      const distinct = new Set(rows.map((one) => one.name));
      assert.equal(distinct.size, rows.length, `${name}: no two devices share a name`);
      const seen = perArchitecture.get(c.architecture as number) ?? { named: 0, total: 0 };
      seen.named += rows.filter((one) => one.name !== undefined).length;
      seen.total += rows.length;
      perArchitecture.set(c.architecture as number, seen);
    }
    assert.equal(total, 63, 'every device in the corpus, which is the same figure `make devices` prints');
    assert.equal(named, total, `every device is named: ${named} of ${total}`);
    for (const architecture of [8, 9, 12, 14]) {
      const here = perArchitecture.get(architecture) as { named: number; total: number };
      assert.equal(here.named, here.total, `arch ${architecture} names every device`);
    }
    // The ranking, asserted rather than described: the screen is the exception and stays one.
    const stated = perSource.get('names') ?? 0;
    assert.ok(stated / total > 0.8, `most names are stated: ${stated} of ${total}`);
    assert.ok((perSource.get('screen') ?? 0) <= 3, 'and the screen route stays a last resort');
  });

test('a device label is drawn on the screen as well, which is two encodings of one string',
  skipWithoutLab(), () => {
    // The independent closure for section 126's first route. A device's label comes out of base slot
    // 0 as ASCII and the config also **draws** it, out of base slot 7's glyph pixels through a
    // per config code table, and the two paths share no code at all. Every label the reader ties to
    // an infrared group turns up in the screen text, 53 of 55 exactly and 2 as a prefix, because a
    // menu truncates a long name to the width it has.
    let exact = 0;
    let truncated = 0;
    for (const [name] of INVENTORY) {
      const data = require_(name);
      const c = parse(data);
      const drawn = new Set<string>();
      for (const one of screenStrings(c, characterMap(c))) {
        if (one.text.trim().length > 1) drawn.add(plain(one.text));
      }
      const joined = [...drawn].join('|');
      for (const device of devices(c)) {
        if (device.source !== 'names' || device.name === undefined) continue;
        const label = plain(device.name);
        if (joined.includes(label)) exact += 1;
        else if ([...drawn].some((one) => one.length >= 6 && label.startsWith(one))) truncated += 1;
        else assert.fail(`${name}: a device label nothing draws`);
      }
    }
    assert.equal(exact, 53, 'the labels the drawn name check agrees on');
    assert.ok(truncated <= 2, `and the screen truncates few of them, got ${truncated}`);
  });

test('on arch 9 and arch 14 the device names its own mode, and the pairing is what agrees',
  skipWithoutLab(), () => {
    // The second closure, and the control that makes the first one worth having. Route one pairs an
    // ASCII label with an infrared group through the variable's transitions; on arch 9 and arch 14 the
    // device's own mode draws that label as its title, and the two agree 17 times out of 17. Shifting
    // the pairing to the next group breaks every one of them, so the agreement is about **which**
    // group and not about the label existing.
    //
    // Arch 8 and arch 12 are the reason this route is not the reader's first: they draw a command
    // name at the top of a device mode and no title at all, 1 of 31 and 0 of 7.
    let agree = 0;
    let shifted = 0;
    let shiftable = 0;
    for (const [name] of INVENTORY) {
      const data = require_(name);
      const c = parse(data);
      if (c.architecture !== 9 && c.architecture !== 14) continue;
      const titles = deviceModeTitles(c);
      const rows = devices(c);
      const says = (group: number, label: string): boolean =>
        [...(titles.get(group) ?? [])].some((one) => plain(one) === plain(label));
      for (const device of rows) {
        if (device.source !== 'names' || device.name === undefined) continue;
        if (says(device.group, device.name)) agree += 1;
        else assert.fail(`${name}: group ${device.group} does not say its own name`);
        // A config with one device cannot be shifted onto anything but itself.
        if (rows.length < 2) continue;
        shiftable += 1;
        if (!says((device.group + 1) % rows.length, device.name)) shifted += 1;
      }
    }
    assert.equal(agree, 17, `devices where the two routes agree, got ${agree}`);
    assert.equal(shifted, shiftable, 'and every shifted pairing breaks');
  });

test('a device variable ends in a word and a config variable ends in a number', skipWithoutLab(), () => {
  // The discriminator section 126 rests on, asserted both ways. `TV_Power_2` belongs to a device and
  // `CurrentActivityState_0_4` belongs to the config, and what separates them is that no property is
  // spelled as a number. The negative matters more than the positive here: reading a global as a
  // device would invent a device with no infrared group and then let elimination pair it with a real
  // one.
  let checked = 0;
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    const belong = new Set(deviceVariables(c).map((one) => one.index));
    for (const variable of stateVariables(c)) {
      if (variable.name.startsWith(ACTIVITY_STATE_NAME) || variable.label === 'CurrentLocation') {
        assert.ok(!belong.has(variable.index), `${name}: ${variable.label} is not a device's`);
        checked += 1;
      }
    }
    for (const one of deviceVariables(c)) {
      assert.ok(one.device.length > 0, `${name}: a device label of nothing`);
      assert.ok(!/^[0-9]+$/.test(one.property), `${name}: ${one.property} reads as a qualifier`);
    }
  }
  assert.equal(checked, 30, `global variables, got ${checked}`);
});

test('an action list that sends a code is walked into, not only looked at', skipWithoutLab(), () => {
  // A bug this test exists because of. `infraredGroupsPerList` first memoised a nested walk, and a
  // nested walk stops at whatever the outer one had visited, so its answer is only right in that
  // context. Nothing failed on arch 8, 9 or 12, whose lists carry `0x7D` directly. Arch 14 emits
  // `{0x7F, 0x7D, 0x7C}`, where the send sits in the list the first instruction names, so every arch
  // 14 device lost its name at once. The property that catches it: a list reaching a group through
  // `0x7F` exists in the map, in every container that has one.
  let delegating = 0;
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    const sent = infraredGroupsPerList(c);
    const lists = c.actionLists() ?? [];
    lists.forEach((list, index) => {
      const direct = list.some((one) => one.opcode === 0x7d);
      const names = list.some((one) => one.opcode === ACTION_LIST_INDEX_OPCODE);
      if (direct || !names) return;
      const reached = sent.get(index);
      if (reached === undefined) return;
      delegating += 1;
      assert.ok(reached.size > 0, `${name}: list ${index} is in the map with nothing in it`);
    });
  }
  assert.equal(delegating, 3021, `delegating lists, got ${delegating}`);
});

test('an activity drives one to three of the config\'s own devices', skipWithoutLab(), () => {
  // Section 126's last hop, and what an interface shows next to an activity's name. The devices are
  // the ones the base slot 9 set it installs sends to, so the closure is that they are devices: an
  // infrared group outside the table would mean the set was read wrong, and a set that sends to none
  // would mean the activity does nothing.
  let checked = 0;
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    const known = devices(c).length;
    if (known === 0) continue;
    for (const one of activities(c)) {
      assert.ok(one.devices.length >= 1, `${name}: activity ${one.activity} drives nothing`);
      assert.ok(one.devices.length <= 3, `${name}: activity ${one.activity} drives too many`);
      for (const group of one.devices) {
        assert.ok(group < known, `${name}: activity ${one.activity} names group ${group}`);
      }
      assert.ok(one.set >= 0, `${name}: activity ${one.activity} installs no key map`);
      checked += 1;
    }
  }
  assert.equal(checked, 50, `activities, got ${checked}`);
});

test('every button that sends a code sends it on the press, and every code exists',
  skipWithoutLab(), () => {
    // Two properties of the button map, both corpus wide. Every code sending binding is event type
    // 0x80: nothing here sends a code on release or on repeat, which an interface would otherwise have
    // to allow for. And every operand names a record its group actually has, which is the bounds check
    // that says the group and the index have not been read the wrong way round.
    let bindings = 0;
    let macros = 0;
    let fromPages = 0;
    let fromSets = 0;
    let handlers = 0;
    for (const [name] of INVENTORY) {
      const data = require_(name);
      const c = parse(data);
      const sizes = devices(c).map((one) => one.codes);
      if (sizes.length === 0) continue;
      for (const key of keyCodes(c)) {
        // A press, or one of the handler entries a base slot 9 set carries instead of keys. Never a
        // release and never a repeat, which is the half of this that would change what an interface
        // has to allow for.
        if (key.event !== KEY_EVENT_PRESS) {
          assert.equal(key.event, 0, `${name}: ${key.where} ${key.index} sends on a release or repeat`);
          assert.equal(key.where, 'set', `${name}: a page binding with no event type sends a code`);
          assert.ok([1, 2, 5].includes(key.tag), `${name}: unexpected handler tag ${key.tag}`);
          handlers += 1;
        }
        assert.ok(key.codes.length >= 1);
        if (key.codes.length > 1) macros += 1;
        if (key.where === 'page') fromPages += 1; else fromSets += 1;
        for (const code of key.codes) {
          const size = sizes[code.group];
          assert.ok(size !== undefined, `${name}: code names group ${code.group}`);
          assert.ok(code.code < (size as number),
            `${name}: group ${code.group} has ${size} codes, not ${code.code + 1}`);
        }
        bindings += 1;
      }
    }
    assert.equal(bindings, 4448, 'every key binding in the corpus');
    assert.equal(macros, 88, 'of those, the macros: more than one code in an order that matters');
    // **Both kinds of list are covered**, which they were not at first: the hard keys of an activity
    // are in its base slot 9 set and in no mode page, so a view built on pages alone showed every
    // soft key and no volume key. Asserted as a count of each rather than a total.
    assert.equal(fromPages, 3106, 'the bindings that come from a mode page');
    assert.equal(fromSets, 1342, 'and the ones that come from a base slot 9 set');
    assert.equal(handlers, 17, 'and the handler entries that send are a known, small set');
  });

test('the codes of a list are kept in the order it sends them', skipWithoutLab(), () => {
  // A macro is an ordered thing: a start sequence that powers a device on and then switches its input
  // is not the same as the reverse. So the reader hands back an array and not a set, and this is the
  // test that fails if somebody makes it a set again, which would pass every count above.
  let ordered = 0;
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    for (const [, codes] of infraredCodesPerList(c)) {
      if (codes.length < 2) continue;
      const keys = codes.map((one) => `${one.group}:${one.code}`);
      // A repeated code, or two codes in an order that sorting would change, is only representable
      // in a list. One of the two holds for most macros in the corpus.
      const sorted = [...keys].sort();
      if (new Set(keys).size !== keys.length || keys.join() !== sorted.join()) ordered += 1;
    }
    // The reduction to groups is the same walk, so it cannot disagree about which devices are reached.
    const groups = infraredGroupsPerList(c);
    for (const [index, codes] of infraredCodesPerList(c)) {
      assert.deepEqual([...(groups.get(index) ?? [])].sort(),
        [...new Set(codes.map((one) => one.group))].sort(), `${name}: list ${index}`);
    }
  }
  assert.equal(ordered, 169, `macros where order is visible, got ${ordered}`);
});

test('the composed inventory says the same as the readers it composes', skipWithoutLab(), () => {
  // `inventory` exists so that an application does not assemble this itself, section 126, so the one
  // thing it must not do is answer differently.
  let checked = 0;
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    const whole = inventory(c);
    assert.equal(whole.architecture, c.architecture, name);
    assert.equal(whole.builtAt, c.builtAt, name);
    assert.equal(whole.idle, idleActivityValue(c), name);
    assert.deepEqual(whole.devices.map((one) => one.name), devices(c).map((one) => one.name), name);
    assert.deepEqual(whole.activities.map((one) => one.activity),
      activityNames(c).map((one) => one.activity), name);
    if (whole.devices.length > 0) checked += 1;
  }
  assert.equal(checked, 15, `containers, got ${checked}`);
});

test('a screen key and a keypad key never share a scan code', skipWithoutLab(), () => {
  // Section 128's founding measurement, and the reason `softKeyScans` is derived rather than tabulated:
  // a mode page's tagged list belongs to a screen and a base slot 9 set belongs to a running activity,
  // so the two populations should not overlap, and they do not. One scan on arch 8 is the only
  // exception in the corpus. The census itself is asserted because a wrong entry would silently stop a
  // key being labelled, and the arch 9 set is the one narrowed independently in the silhouette.
  const census = new Map<number, { soft: Set<number>; hard: Set<number>; shared: Set<number> }>();
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    if (c.architecture === undefined) continue;
    const seen = census.get(c.architecture)
      ?? { soft: new Set<number>(), hard: new Set<number>(), shared: new Set<number>() };
    for (const scan of softKeyScans(c)) seen.soft.add(scan);
    for (const key of keyCodes(c)) if (key.where === 'set') seen.hard.add(key.scan);
    census.set(c.architecture, seen);
  }
  // How many keypad scans each architecture binds through a base slot 9 set. Measured, and stated
  // here rather than in the loop so the four numbers sit together where a fifth architecture would
  // have to be added deliberately.
  //
  // The first version of this table had the four values in the wrong order, because they were read off
  // a map whose insertion order is which container came first rather than the architecture. It failed
  // immediately, which is the argument for an exact count in one line: a floor of 20 could not have
  // told a right table from a shuffled one.
  const KEYPAD_SCANS: Record<number, number> = { 8: 42, 9: 39, 12: 37, 14: 41 };
  let shared = 0;
  for (const [architecture, seen] of census) {
    for (const scan of seen.soft) if (seen.hard.has(scan)) shared += 1;
    // Exact per architecture, not a floor of 20: 42 on arch 8 (Harmony 880 and 885), 39 on arch 9
    // (Harmony 525), 37 on arch 12 (Harmony One) and 41 on arch 14 (Harmony 600 and 700). A floor at
    // 20 would have absorbed half the keypad of any of them.
    assert.equal(seen.hard.size, KEYPAD_SCANS[architecture],
      `arch ${architecture} binds ${seen.hard.size} keypad keys`);
  }
  assert.equal(shared, 1, 'exactly one scan is bound both ways anywhere in the corpus');
  const soft = (architecture: number): number[] => [...(census.get(architecture)?.soft ?? [])]
    .sort((a, b) => a - b);
  assert.deepEqual(soft(8), [5, 6, 7, 8, 44, 45, 46, 48]);
  assert.deepEqual(soft(9), [22, 30, 31, 38, 39], 'the four the 525 silhouette narrows to, plus one');
  assert.deepEqual(soft(12), [43, 44, 48, 49, 50, 51, 52, 53], 'the touch codes of section 125');
  assert.deepEqual(soft(14), [2, 8, 9, 34]);
  // The set is per architecture and not per config, which is what makes it a property of the hardware
  // rather than of a generator's mood: six arch 8 configs agree exactly, four arch 12 ones do, three
  // arch 14 ones do. **Arch 9 is the exception and it is an addition, not a disagreement**: one 525
  // config binds a fifth, scan 22, which is column 6 of the group above scan 30, so it is a key in the
  // same column as two of the four rather than somewhere else entirely.
  const perConfig = new Map<number, Set<string>>();
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    if (c.architecture === undefined) continue;
    const seen = perConfig.get(c.architecture) ?? new Set<string>();
    seen.add(softKeyScans(c).join(','));
    perConfig.set(c.architecture, seen);
  }
  assert.equal(perConfig.get(8)?.size, 1, 'every arch 8 config labels the same keys');
  assert.equal(perConfig.get(12)?.size, 1, 'and every arch 12 one');
  assert.equal(perConfig.get(14)?.size, 1, 'and every arch 14 one');
  assert.equal(perConfig.get(9)?.size, 2, 'while the two 525 configs differ by that one scan');
});

test('a Harmony One labels its soft keys from the hit map, and by the nearest region not the first',
  skipUnless('one_config'), () => {
    // The stated route, and the control that matters: `touchOwner` is the firmware's rule, the first
    // rectangle containing the point, which is right for a touch and wrong for a label. A label's x is
    // where its first glyph starts, so a long string in the right hand column starts inside the left
    // hand rectangle where the two overlap. If this test stops finding those cases, the labels have
    // silently moved to the wrong keys.
    const c = parse(load('one_config') as Uint8Array);
    const labels = keyLabels(c);
    const bindings = keyCodes(c).filter((key) => key.where === 'page');
    const named = bindings.filter((key) => labels.get(`${key.index}:${key.scan}`) !== undefined);
    assert.ok(named.length / bindings.length > 0.95,
      `${named.length} of ${bindings.length} soft keys are labelled`);

    // The cases the two rules disagree about: a label whose start point is inside two rectangles.
    const pages = modePages(c);
    const drawn = screenStrings(c, characterMap(c));
    let overlapping = 0;
    for (const page of pages) {
      const areas = touchPageOf(c, page)?.areas ?? [];
      for (const one of drawn) {
        if (one.program !== page.program || one.text.trim().length === 0) continue;
        const containing = areas.filter((area) => touchOwner([area], one.x, one.y) !== undefined);
        if (containing.length > 1) overlapping += 1;
      }
    }
    assert.equal(overlapping, 544, 'labels whose start point is inside two rectangles, where the floor said seven');
  });

test('the labels agree with the activity names derived a different way', skipWithoutLab(), () => {
  // The calibration for both routes, and the only one there is: section 121's chain names an activity
  // from the modes it enters, which uses no geometry at all, so wherever it and a drawn label both have
  // an opinion about the same key they must agree. 62 of 63 do, on all four architectures.
  //
  // **The exception is recorded rather than worked around**: `arch8_config_885` draws a "1 OF 2" page
  // indicator in the bottom row's continuation slot, so that row's label carries it. Nothing in the
  // config says which lines are chrome, and a rule that guessed would be worse than a stated exception.
  let agree = 0;
  const disagreed: string[] = [];
  const perSource = new Map<string, number>();
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    const labels = keyLabels(c);
    for (const activity of activityNames(c)) {
      if (activity.name === undefined) continue;
      for (const scan of activity.scans) {
        const label = labels.get(`${activity.page}:${scan}`);
        if (label === undefined) continue;
        if (label.text === activity.name) {
          agree += 1;
          perSource.set(label.source, (perSource.get(label.source) ?? 0) + 1);
        } else {
          disagreed.push(`${name} page ${activity.page} scan ${scan} by ${label.source}`);
        }
      }
    }
  }
  assert.equal(agree, 62, `${agree} keys agree`);
  assert.deepEqual(disagreed, ['arch8_config_885 page 40 scan 44 by row'], 'the known exception, alone');
  // And both routes are calibrated, not just the stated one.
  // Exact, and the two now close on the total: 11 keys are named through the hit map and 51 through
  // the screen rows, and 11 plus 51 is the 62 asserted above. So a route quietly answering for the
  // other one cannot pass, which is what the two floors of 8 and 45 allowed.
  assert.equal(perSource.get('touch'), 11, 'keys named through the hit map');
  assert.equal(perSource.get('row'), 51, 'and through the screen rows');
  assert.equal((perSource.get('touch') ?? 0) + (perSource.get('row') ?? 0), agree,
    'the two routes account for every agreeing key');
});

test('a row with two items has two keys that do different things', skipWithoutLab(), () => {
  // The structural closure behind `SCREEN_ROWS`, and it is independent of every label text: if a row
  // really is a place on the screen with a key at each end, then a row drawing two items must have its
  // two keys bound to different action lists, and a row drawing one must be able to have them bound to
  // the same one. Every two item row in the corpus has keys that differ, with no exception anywhere.
  let twoItems = 0;
  let twoItemsSame = 0;
  let oneItemSame = 0;
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    const rows = SCREEN_ROWS[c.architecture ?? -1];
    if (rows === undefined) continue;
    const lists = c.actionLists() ?? [];
    const labels = keyLabels(c);
    modePages(c).forEach((page, index) => {
      const bound = new Map<number, number>();
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.opcode === ACTION_LIST_INDEX_OPCODE) bound.set(entry.tag & 0x3f, entry.operand);
      }
      for (const row of rows) {
        const left = bound.get(row.left);
        const right = bound.get(row.right);
        if (left === undefined || right === undefined) continue;
        const first = labels.get(`${index}:${row.left}`);
        const second = labels.get(`${index}:${row.right}`);
        if (first === undefined || second === undefined) continue;
        const sameList = JSON.stringify(lists[left]) === JSON.stringify(lists[right]);
        if (first.text === second.text) {
          if (sameList) oneItemSame += 1;
        } else {
          twoItems += 1;
          if (sameList) twoItemsSame += 1;
        }
      }
    });
  }
  assert.equal(twoItems, 1989, `${twoItems} rows draw two items`);
  assert.equal(twoItemsSame, 0, 'two items always mean two different actions');
  assert.equal(oneItemSame, 82, 'rows where one item means one action');
});

// Named keys against bound keys, per architecture. Stated here so the numbers are visible without
// reading the loop, and exact because the unlabelled remainder is the interesting half: 74 of the
// 6988 bindings this population walks, 71 of them on a Harmony One, whose pages can bind a code its
// hit page has a rectangle for and no text in. Section 128 quotes 6989 over its own population,
// which is not this one: the loop below skips a container that states no architecture.
const EXPECTED_LABELLED_KEYS: Record<number, string> = {
  8: '3152/3154',
  9: '231/232',
  12: '2001/2072',
  14: '1530/1530',
};

test('nearly every key a screen labels gets a label, and the misses are a Harmony One\'s',
  skipWithoutLab(), () => {
  // The coverage claim of section 128, as a floor per architecture rather than a corpus total, since a
  // total hides an architecture that stopped working. The unlabelled remainder is 74 keys of 6989, and
  // all but three of them are on a Harmony One, whose pages can bind a code their hit page has a
  // rectangle for and no text in.
  const per = new Map<number, { named: number; total: number }>();
  for (const [name] of INVENTORY) {
    const data = require_(name);
    const c = parse(data);
    if (c.architecture === undefined) continue;
    const labels = keyLabels(c);
    const seen = per.get(c.architecture) ?? { named: 0, total: 0 };
    modePages(c).forEach((page, index) => {
      const bound = new Set((taggedList(c, page.list)?.entries ?? [])
        .filter((entry) => entry.opcode === ACTION_LIST_INDEX_OPCODE)
        .map((entry) => entry.tag & 0x3f));
      for (const scan of bound) {
        seen.total += 1;
        if (labels.has(`${index}:${scan}`)) seen.named += 1;
      }
    });
    per.set(c.architecture, seen);
  }
  // The counts, per architecture, rather than a share above a bound. A share hides which keys are
  // missing and it hid the title too: this test was called `every key a screen labels gets a label`
  // and 74 keys of 6989 have none, so the title was false by construction the day it was written.
  const counted = Object.fromEntries([...per].sort(([a], [b]) => a - b)
    .map(([architecture, seen]) => [architecture, `${seen.named}/${seen.total}`]));
  assert.deepEqual(counted, EXPECTED_LABELLED_KEYS);
  assert.deepEqual([...per.keys()].sort((a, b) => a - b), [8, 9, 12, 14], 'all four architectures');
});

test('a label wrapped onto a second line is one label', skipUnless('one_config'), () => {
  // Two draws inside one rectangle are one key's label over two lines, so they are joined in reading
  // order. Without this a wrapped label reads as whichever line happened to come first.
  const c = parse(load('one_config') as Uint8Array);
  const joined = [...keyLabels(c).values()].filter((label) => label.text.includes(' '));
  assert.equal(joined.length, 27, 'labels that span more than one draw');
  for (const label of joined) assert.ok(label.text.trim() === label.text, 'and they are trimmed');
});

test('base slot 13 starts with the firmware\'s own clock, seeded from the build timestamp',
  skipWithoutLab(), () => {
    // Section 130, and it is the strongest kind of closure this project gets: a field nobody had read
    // turns out to equal a value that is already known from somewhere else, in every sample, with no
    // freedom left over. `first` is the value the variable holds when the config is generated and
    // `second` is its maximum, so the first seven records are second, minute, hour, day, weekday,
    // month and year, and all seven agree with base slot 3's timestamp.
    //
    // The weekday's zero being a Saturday is not fitted either: base slot 3's own day of week byte is
    // days since 1 January 2000 modulo 7, section 21, and that day was a Saturday.
    let agreeing = 0;
    for (const [name] of INVENTORY) {
      const data = require_(name);
      const c = parse(data);
      if (c.builtAt === undefined) continue;
      const records = stateRecords(c);
      if (records === undefined) continue;
      const [date, time] = c.builtAt.split('T') as [string, string];
      const [year, month, day] = date.split('-').map(Number) as [number, number, number];
      const [hour, minute, second] = time.split(':').map(Number) as [number, number, number];
      const days = Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(2000, 0, 1)) / 86400000);
      const expected: Array<[number, number, number]> = [
        [0, second, 59],
        [1, minute, 59],
        [2, hour, 23],
        [3, day, 30],
        [4, days % 7, 6],
        [5, month - 1, 11],
        [6, year - 2000, year - 2000 + 1],
      ];
      for (const [index, value, most] of expected) {
        const record: { first: number; second: number } | undefined = records[index];
        assert.ok(record !== undefined, `${name} has no record ${index}`);
        assert.equal(record.first, value,
          `${name}: record ${index} is ${record.first} where the timestamp says ${value}`);
        assert.equal(record.second, most, `${name}: record ${index} maximum`);
      }
      // And they are firmware owned rather than config owned: base slot 0 names none of them.
      const named = new Set(stateVariables(c).map((one) => one.index));
      for (const [index] of expected) assert.ok(!named.has(index), `${name} names record ${index}`);
      agreeing += 1;
    }
    // Exactly the population, not a floor under it. This read `>= 15` while INVENTORY held 15 rows,
    // so it was equal to "all of them" by coincidence and would have stopped being so the moment a
    // row was added, letting one container skip in silence. Section 137 needed the claim to cover
    // every sample, because what rests on it is that the corpus contains no container where base slot
    // 3 and base slot 13 disagree, and one absent sample is exactly where such a container would hide.
    assert.equal(agreeing, INVENTORY.length,
      `${agreeing} of ${INVENTORY.length} containers were checked, so one skipped silently`);
    // The table is what a caller reads, so it must cover exactly what is proven and no more.
    // The table is what a caller reads, so it must cover exactly what is proven and no more. Thirteen
    // entries since section 138, where the six above the clock are proven by a different argument: they
    // are fixed per architecture and named by nothing. The boundary is asserted in its own test below.
    assert.deepEqual(Object.keys(FIRMWARE_STATE_VARIABLES),
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
    assert.equal(FIRMWARE_STATE_VARIABLE_MAX, 12);
  });

test('the firmware owns thirteen state variables, and the six above the clock are per architecture',
  skipUnless(...INVENTORY.map(([name]) => name)), () => {
    // Section 138. The clock's own seven are proven by equalling base slot 3's timestamp, which says
    // nothing about 7 to 12. Those rest on two things instead: within one architecture every container
    // states the identical `first` and `second`, and no container names any of them through base slot 0.
    // A config author has no freedom there, which is what "the firmware owns it" means operationally.
    const perArch = new Map<string, Set<string>>();
    let checked = 0;
    for (const [name] of INVENTORY) {
      const c = parse(load(name) as Uint8Array);
      const records = stateRecords(c);
      assert.ok(records !== undefined, `${name} has no base slot 13`);
      const table = stateTable(c);
      assert.ok(table !== undefined, `${name} has no base slot 13 table`);
      // Every index this claim covers has to be in the narrow block, or `0x108 + index` is not its
      // address and the firmware reads two bytes where the table states one.
      assert.ok(table.narrow > FIRMWARE_STATE_VARIABLE_MAX,
        `${name} declares ${table.narrow} narrow variables, so index ` +
        `${FIRMWARE_STATE_VARIABLE_MAX} is wide and the address arithmetic differs`);
      const named = new Set(stateVariables(c).map((one) => one.index));
      for (let index = 0; index <= FIRMWARE_STATE_VARIABLE_MAX; index += 1) {
        const record = records[index];
        assert.ok(record !== undefined, `${name} has no record ${index}`);
        assert.ok(!named.has(index), `${name} names firmware variable ${index}`);
      }
      // Only 7 to 12: the clock's values move with the build timestamp by design, so they are
      // deliberately outside this comparison.
      for (let index = 7; index <= FIRMWARE_STATE_VARIABLE_MAX; index += 1) {
        const record = records[index] as { first: number; second: number };
        const key = `${c.architecture}/${index}`;
        if (!perArch.has(key)) perArch.set(key, new Set());
        perArch.get(key)?.add(`${record.first}/${record.second}`);
      }
      checked += 1;
    }
    assert.equal(checked, INVENTORY.length);
    for (const [key, values] of perArch) {
      assert.equal(values.size, 1,
        `${key} takes ${values.size} values across its architecture (${[...values].join(', ')}), so it ` +
        'is not a firmware constant');
    }
    // And the boundary is measured rather than chosen: index 13 is where a config starts naming one.
    const namesThirteen = [...INVENTORY].filter(([name]) => {
      const c = parse(load(name) as Uint8Array);
      return new Set(stateVariables(c).map((one) => one.index)).has(FIRMWARE_STATE_VARIABLE_MAX + 1);
    });
    assert.ok(namesThirteen.length > 0,
      'no container names variable 13, so the block may reach further than 12 and this test would not ' +
      'notice: section 138 rests on that boundary being visible');

    // The closure, and the reason to believe the meanings rather than only the fixedness: section 111
    // measured these four bytes on a connected Harmony One and section 103 read their level counts out
    // of the firmware, neither of them looking at base slot 13. Four levels wants a maximum of 3 and
    // eight levels wants 7.
    const one = parse(load('one_config') as Uint8Array);
    const records = stateRecords(one) as Array<{ first: number; second: number }>;
    assert.equal(records[8]?.second, 3, 'the display light band has four levels, section 103');
    assert.equal(records[9]?.second, 7, 'the battery gauge has eight levels, section 111');
    // The values section 111 read off the remote have to fit inside the maxima the config states, and
    // the battery sat exactly at its own, which is what a charging remote reads.
    for (const [index, measured] of [[8, 1], [9, 7], [10, 3], [11, 20]] as const) {
      const record = records[index] as { second: number };
      assert.ok(measured <= record.second,
        `section 111 measured ${measured} at 0x${(0x108 + index).toString(16)} where the config's ` +
        `maximum is ${record.second}`);
    }
  });

test('a page binds more keys than it sends codes with, which is why pageScans exists',
  skipWithoutLab(), () => {
    // The guard on a bug that has now been made twice: `keyCodes` reports a binding that ends in an
    // infrared code, so anything asking "what does this page bind" through it silently drops the keys
    // that start an activity or open a menu. Every activity page in the corpus is such a page, so the
    // difference is not a detail: it is exactly the pages a person looks for.
    let pages = 0;
    let extra = 0;
    for (const [name] of INVENTORY) {
      const data = require_(name);
      const c = parse(data);
      const scans = pageScans(c);
      const sending = new Map<number, Set<number>>();
      for (const key of keyCodes(c)) {
        if (key.where !== 'page') continue;
        const seen = sending.get(key.index) ?? new Set<number>();
        seen.add(key.scan);
        sending.set(key.index, seen);
      }
      scans.forEach((bound, index) => {
        const sends = sending.get(index) ?? new Set<number>();
        for (const scan of sends) {
          assert.ok(bound.includes(scan), `${name} page ${index} sends with scan ${scan} unbound`);
        }
        if (bound.length === 0) return;
        pages += 1;
        extra += bound.length - sends.size;
      });
      // And the activity pages are in the second population and not the first.
      for (const activity of activityNames(c)) {
        const bound = scans[activity.page] ?? [];
        for (const scan of activity.scans) {
          assert.ok(bound.includes(scan), `${name}: activity scan ${scan} is not bound by its page`);
        }
      }
    }
    assert.equal(pages, 2184, `${pages} pages bind anything`);
    assert.equal(extra, 3882, 'bindings that send no code, which is what makes the two populations differ');
  });

test('a key label names a scan its own page binds, on every architecture', skipWithoutLab(), () => {
  // **The touch route emitted a label for every region holding text and ignored what the page
  // binds**, where the row route has always required it. 292 of `one_config`'s 1103 entries named a
  // scan its page does not bind, 98 in each unprogrammed Harmony One and 97 in the synced one. Inert
  // for the bench, which looks up by bound scan; live for anything that **iterates** the map, which
  // is what a `Map` invites. Section 139.
  //
  // The claim is over every container that states an architecture, not just the Harmony Ones, since
  // the row route satisfying it already is half of what makes this a rule rather than a patch.
  let labels = 0;
  let pages = 0;
  for (const [name] of INVENTORY) {
    const c = parse(require_(name));
    if (c.architecture === undefined) continue;
    const found = keyLabels(c);
    const bound = new Map<number, Set<number>>();
    modePages(c).forEach((page, index) => {
      bound.set(index, new Set(
        (taggedList(c, page.list)?.entries ?? [])
          .filter((entry) => entry.opcode === 0x7f)
          .map((entry) => entry.tag & 0x3f),
      ));
      pages += 1;
    });
    for (const [key] of found) {
      const [index, scan] = key.split(':').map(Number) as [number, number];
      assert.ok(bound.get(index)?.has(scan), `${name} page ${index} labels unbound scan ${scan}`);
      labels += 1;
    }
  }
  // Exact, so the population moves in a diff rather than silently. 585 fewer than before the filter,
  // all of them on the four Harmony Ones: 292, 98, 98 and 97.
  assert.equal(labels, 6914);
  assert.equal(pages, 3321);
});

test('two device labels reaching one infrared group name nobody', skipWithoutLab(), () => {
  // Route one kept the first label and left the second **free**, so route two could then pair it
  // with an unrelated leftover group and hand the result back as `source: 'elimination'`, which
  // reads as a weaker but real answer where the evidence in fact contradicts itself. This is where a
  // wrong device name would reach FreeHarmony. No container in the corpus contests a group, so the
  // case is constructed by aliasing one label onto another's group. Section 139.
  // The uncontested case first, so the refusal is not simply "names nobody, ever".
  assert.deepEqual(
    [...pairLabelsToGroups([{ label: 'a', group: 0 }, { label: 'b', group: 1 }]).named],
    [['a', 0], ['b', 1]],
  );
  // Two variables of one label agreeing is not a contest.
  const agreeing = pairLabelsToGroups([{ label: 'a', group: 0 }, { label: 'a', group: 0 }]);
  assert.deepEqual([...agreeing.named], [['a', 0]]);
  assert.equal(agreeing.contested.size, 0);
  // The contest: both labels lose the group, and the group is marked so the forced pairing in
  // `devices` cannot treat it as merely free. Keeping the first label was the old behaviour.
  const contested = pairLabelsToGroups([{ label: 'a', group: 3 }, { label: 'b', group: 3 }]);
  assert.deepEqual([...contested.named], []);
  assert.deepEqual([...contested.contested], [3]);
  // A third label on an uncontested group still gets it, so one contest does not poison the rest.
  const mixed = pairLabelsToGroups(
    [{ label: 'a', group: 3 }, { label: 'b', group: 3 }, { label: 'c', group: 4 }],
  );
  assert.deepEqual([...mixed.named], [['c', 4]]);

  // And the corpus really does not contain the case, so the fix cannot be hiding behind a container
  // that already had it.
  for (const [name] of INVENTORY) {
    const other = parse(require_(name));
    const groups = devices(other).filter((d) => d.source === 'names').map((d) => d.group);
    assert.equal(new Set(groups).size, groups.length, `${name} already contests a group`);
  }
});

test('an activity whose keys are on two pages is refused, not labelled from one of them',
  skipWithoutLab(), () => {
  // `activityNames` takes the page from the first binding and the scans from all of them, which is
  // sound only because all of an activity's keys are on one page, section 120. That closure was
  // measured and then depended on with nothing stating it: were it to fail, the label would be
  // looked up on one page using scans from another and come back plausible. 0 counterexamples in
  // the corpus, so this states a rule rather than guarding a case that exists. Section 139.
  let activities = 0;
  for (const [name] of INVENTORY) {
    const c = parse(require_(name));
    const perActivity = new Map<number, Set<number>>();
    for (const binding of activityBindings(c)) {
      const pages = perActivity.get(binding.activity) ?? new Set<number>();
      pages.add(binding.page);
      perActivity.set(binding.activity, pages);
    }
    for (const [activity, pages] of perActivity) {
      assert.equal(pages.size, 1, `${name} activity ${activity} spans ${pages.size} pages`);
      activities += 1;
    }
  }
  assert.equal(activities, 50);
});

/**
 * The population for section 151: every user config, derived from the table at the top of this file.
 *
 * Derived rather than written out, because a second list of fifteen names in one file is a second list
 * to keep in step, and `tests/test_toolchain.py` compares this one against `lab.USER_CONFIGS`.
 */
const USER_CONFIGS = INVENTORY.map(([name]) => name);

test('a button map belongs to a device, and an activity map is that plus its overrides',
     skipUnless(...USER_CONFIGS), () => {
  // **Section 151, and it exists because a design was got wrong.** FreeHarmony's device page was built
  // to show a keypad per activity, on the strength of every keypad binding here sitting in an activity's
  // map. The measurement was right and the question was wrong: a Harmony has a **device mode**, where
  // the Devices key points the whole keypad at one chosen device, and that is what a page about a device
  // is for. `docs/how-a-harmony-works.md` is the context that was missing.
  //
  // What the corpus does say, once asked properly: for each pair of a device and a scan code, the
  // command that pair sends is the **same in every activity that binds it**, 1096 of 1105 times. So the
  // device's own map is what the activity maps agree on, and an activity map is that plus its own
  // overrides. The nine exceptions are what an override looks like: an amplifier whose input selection
  // differs per activity, and two keys customised inside one.
  let pairs = 0;
  let sameEverywhere = 0;
  let inEveryActivity = 0;
  let inSomeOnly = 0;
  let devices = 0;
  let devicesAgreeing = 0;
  for (const name of USER_CONFIGS) {
    const c = parse(require_(name));
    const activityOfSet = new Map(activities(c).map((one) => [one.set, one.activity]));
    // One code only, so the question is "which command", not "which macro". A macro is a key sending
    // several codes in an order that matters and it is a different claim.
    const keys = keyCodes(c).filter((one) =>
      one.event !== 0 && one.where !== 'page' && one.codes.length === 1);

    // Which activities drive each device, from the bindings rather than from the activity record, so
    // the two ends of the comparison below come from different places.
    const driving = new Map<number, Set<number>>();
    for (const key of keys) {
      const group = key.codes[0]!.group;
      driving.set(group, new Set([...(driving.get(group) ?? []), activityOfSet.get(key.index) ?? -1]));
    }

    // Per device and scan: which command, and which activities said so.
    const per = new Map<string, Map<number, Set<number>>>();
    for (const key of keys) {
      const { group, code } = key.codes[0]!;
      const where = `${group}:${key.scan}`;
      const row = per.get(where) ?? new Map<number, Set<number>>();
      row.set(code, new Set([...(row.get(code) ?? []), activityOfSet.get(key.index) ?? -1]));
      per.set(where, row);
    }

    const perDevice = new Map<number, number>();
    for (const [where, row] of per) {
      const group = Number(where.split(':')[0]);
      pairs += 1;
      perDevice.set(group, (perDevice.get(group) ?? 0) + (row.size > 1 ? 1 : 0));
      if (row.size > 1) continue;
      sameEverywhere += 1;
      const said = new Set([...row.values()].flatMap((one) => [...one])).size;
      if (said === driving.get(group)!.size) inEveryActivity += 1;
      else inSomeOnly += 1;
    }
    for (const [, disagreeing] of perDevice) {
      devices += 1;
      if (disagreeing === 0) devicesAgreeing += 1;
    }
  }

  // Exact, per this repository's rule about a corpus total: the population is a literal in this file,
  // so these move only when a reader changes or a sample is added, and then they move in the diff.
  assert.equal(pairs, 1105);
  assert.equal(sameEverywhere, 1096, 'the same command in every activity that binds the pair');
  assert.equal(pairs - sameEverywhere, 9, 'and the overrides, which are the interesting nine');
  assert.equal(inEveryActivity, 970, 'bound in every activity that drives the device');
  assert.equal(inSomeOnly, 126, 'bound in only some of them, which is authoring rather than structure');
  assert.equal(devices, 50);
  assert.equal(devicesAgreeing, 47, 'devices whose every button agrees across the activities');
});

test('a device\'s button is often another device\'s in one of the activities that drive it',
     skipUnless(...USER_CONFIGS), () => {
  // **The half of section 151 that a count of pairs hides**, and it decided the shape of FreeHarmony's
  // writer. The test above asks whether the activities that **bind** a pair agree about its command,
  // which they do 1096 times of 1105. This asks a different question, the one an editor has to answer
  // before it writes: across the activities that **drive the device**, is that button available at all?
  //
  // Often it is not, because a button that works the television while you are watching television and
  // the amplifier while you are listening to music is how a Harmony is set up. So a change to a device's
  // button cannot simply be written into every activity that drives the device: that takes the button off
  // the other device. Nor can it be refused when one activity is in the way, since that blocks most of the
  // keypad. It goes where there is room, and the activities in the way are named rather than touched.
  //
  // The two ends come from different fields: which activities drive a device is the activity's own record
  // through `activities`, and who holds a scan code in an activity is the keypad maps. Same split as the
  // test above, asked per activity instead of per pair.
  let pairs = 0;
  let settled = 0;
  let anotherDeviceSomewhere = 0;
  let unboundSomewhere = 0;
  let both = 0;
  // One remote's first device as well, because a corpus total cannot show how concentrated this is: the
  // figure that matters to somebody editing is what they see on one page.
  const one = { pairs: 0, settled: 0, another: 0, unbound: 0, driving: 0 };
  for (const name of USER_CONFIGS) {
    const c = parse(require_(name));
    const acts = activities(c);
    const activityOfSet = new Map(acts.map((a) => [a.set, a.activity]));
    const keys = keyCodes(c).filter((one) =>
      one.event !== 0 && one.where !== 'page' && one.codes.length === 1);

    // Who holds each scan code in each activity, over the whole remote.
    const holder = new Map<number, Map<number, number>>();
    for (const key of keys) {
      const activity = activityOfSet.get(key.index);
      if (activity === undefined) continue;
      const row = holder.get(key.scan) ?? new Map<number, number>();
      row.set(activity, key.codes[0]!.group);
      holder.set(key.scan, row);
    }

    // Every pair of a device and a scan code that device holds somewhere, deduplicated.
    const held = new Set(keys
      .filter((key) => activityOfSet.get(key.index) !== undefined)
      .map((key) => `${key.codes[0]!.group}:${key.scan}`));

    for (const where of held) {
      const [device, scan] = where.split(':').map(Number);
      const driving = acts.filter((a) => a.devices.includes(device!)).map((a) => a.activity);
      const row = holder.get(scan!) ?? new Map<number, number>();
      const elsewhere = driving.filter((a) => row.has(a) && row.get(a) !== device).length;
      const nowhere = driving.filter((a) => !row.has(a)).length;
      pairs += 1;
      if (elsewhere > 0) anotherDeviceSomewhere += 1;
      if (nowhere > 0) unboundSomewhere += 1;
      if (elsewhere > 0 && nowhere > 0) both += 1;
      if (elsewhere === 0 && nowhere === 0) settled += 1;
      if (name === 'one_config' && device === 0) {
        one.pairs += 1;
        one.driving = driving.length;
        if (elsewhere > 0) one.another += 1;
        if (nowhere > 0) one.unbound += 1;
        if (elsewhere === 0 && nowhere === 0) one.settled += 1;
      }
    }
  }

  // Exact, per this repository's rule about a corpus total.
  assert.equal(pairs, 1105, 'the same population as the test above, reached a different way');
  assert.equal(settled, 938, 'the button is this device\'s in every activity that drives it');
  assert.equal(anotherDeviceSomewhere, 131, 'another device holds it in at least one of them');
  assert.equal(unboundSomewhere, 117, 'nothing holds it in at least one of them');
  assert.equal(both, 81, 'and these are both, which is why the three do not sum to the population');

  // The Harmony One's receiver, which is the case that makes the rail necessary rather than tidy: eight
  // activities drive it, and only three of its 35 buttons are its own in all eight.
  assert.deepEqual(one, { pairs: 35, settled: 3, another: 32, unbound: 29, driving: 8 });
});

test('a keypad map that sends a code is an activity\'s, so no config here holds a device mode map',
     skipUnless(...USER_CONFIGS), () => {
  // The other half of section 151, and it is the open question stated as a check rather than as a
  // paragraph. Device mode points the whole keypad at one device with no activity running, so its map
  // would be a keypad map that sends codes and that no activity installs. There is none.
  //
  // **Do not close this by inventing a mechanism.** Three readings remain: the firmware builds the map
  // from the device's own command order, device mode reuses the running activity's map filtered to one
  // device, or there is a map nothing here recognises. What settles it is the firmware routine behind
  // the Devices item.
  let maps = 0;
  let installedByTheConfig = 0;
  let installedByAnActivity = 0;
  let sending = 0;
  let sendingAndNotAnActivity = 0;
  let bindingTheWholeKeypad = 0;
  for (const name of USER_CONFIGS) {
    const c = parse(require_(name));
    const sets = handlerSets(c);
    assert.ok(sets !== undefined, `${name}: no keypad maps at all`);
    // `infraredCodesPerList` rather than a walk of our own, and that matters: a first attempt threaded
    // one visited set through the whole recursion, so a list seen on one branch was skipped on every
    // other. That is section 126's defect, which this repository warns about and which only produced
    // the right number here by luck.
    const codes = infraredCodesPerList(c);
    const byAnActivity = new Set(activities(c).map((one) => one.set).filter((one) => one >= 0));
    // Which maps the config installs: `0x1F` with a high byte of `0xFF` selects one, section 120.
    const chosen = new Set<number>();
    for (const list of c.actionLists() ?? []) {
      for (const one of list ?? []) {
        if (one.opcode === 0x1f && (one.operand >> 8) === 0xff) chosen.add(one.operand & 0xff);
      }
    }

    maps += sets.addresses.length;
    installedByTheConfig += chosen.size;
    installedByAnActivity += byAnActivity.size;
    sets.addresses.forEach((address, index) => {
      const entries = taggedList(c, address)?.entries ?? [];
      const emits = entries.some((one) =>
        one.opcode === ACTION_LIST_INDEX_OPCODE && codes.has(one.operand));
      if (emits) {
        sending += 1;
        if (!byAnActivity.has(index)) sendingAndNotAnActivity += 1;
      }
      if (entries.length >= 50) bindingTheWholeKeypad += 1;
    });
  }

  assert.equal(maps, 158);
  assert.equal(installedByTheConfig, 65);
  assert.equal(installedByAnActivity, 50);
  assert.equal(sending, 50, 'exactly as many send a code as an activity installs');
  // **The assertion that carries the claim.** A keypad map that sends a code and is not an activity's
  // would be a device mode map, and a sample holding one fails here rather than being absorbed.
  assert.equal(sendingAndNotAnActivity, 0);
  // And the counterweight, so the zero above is not read as "there are no other maps": 38 of them bind
  // fifty or more keys, to lists of comparisons, register work and mode entries. That is a menu.
  assert.equal(bindingTheWholeKeypad, 38);
});

/**
 * The four containers that carry per device delays, with what each device should read.
 *
 * `[sample, [group, tenths of a second before the device answers, tenths between two devices]]`.
 * The labels are the owners' own and stay out of this file; the group is the infrared group, which
 * is how a device is identified everywhere else here. Section 234.
 */
const DELAYS: readonly [string, readonly (readonly [number, number, number])[]][] = [
  ['h600_config', [[0, 80, 5], [1, 15, 5], [2, 0, 5], [3, 15, 5]]],
  ['h700_config', [[0, 0, 5], [1, 50, 5], [2, 15, 5], [3, 15, 3], [4, 15, 5], [5, 75, 5]]],
  ['h700_config_2', [[0, 0, 5], [1, 50, 5], [2, 15, 5], [3, 15, 3], [4, 15, 5], [5, 75, 5]]],
  // Logitech compiled this one for three devices we chose the same day, section 121, so its rows
  // are the calibration: a reader that paired the delays with the wrong device would have to get
  // three known devices right by luck.
  ['calibration_h600', [[0, 35, 5], [1, 15, 5], [2, 15, 5]]],
];

for (const [name, rows] of DELAYS) {
  test(`${name} states a power on delay for each of its ${rows.length} devices`,
    skipUnless(name), () => {
      const c = parse(load(name) as Uint8Array);
      const read = deviceDelays(c);
      assert.equal(read.length, rows.length, 'every device joined, none left behind');
      assert.deepEqual(
        read.map((one) => [one.group, one.powerOn, one.interDevice]),
        rows.map((one) => [...one]),
      );
      // The identifiers are a bijection with the groups: a join that collapsed two devices onto one
      // identifier would still pass the row check above if the delays happened to agree.
      assert.equal(new Set(read.map((one) => one.id)).size, rows.length);
    });
}

test('nothing but an arch 14 config carries a device delay at all', skipWithoutLab(), () => {
  // The counterweight to the four tests above, and it is what makes them a population rather than a
  // list: every other container in the corpus reads zero, including six with devices in them.
  const withDelays = DELAYS.map(([name]) => name);
  let checked = 0;
  let withDevicesAndNoDelays = 0;
  for (const [name] of INVENTORY) {
    if (withDelays.includes(name)) continue;
    const c = parse(require_(name));
    assert.deepEqual(deviceDelays(c), [], name);
    if (devices(c).length > 0) withDevicesAndNoDelays += 1;
    checked += 1;
  }
  assert.equal(checked, 12);
  assert.equal(withDevicesAndNoDelays, 12, 'all twelve drive devices and state no delay for any');
});

test('the screen route beats both orderings of the identifiers it could have been',
  skipWithoutLab(), () => {
    // The calibration, scored against wrong answers. The two guesses anybody would try are that the
    // identifiers pair with the groups in the order base slot 0 lists them, and that they pair in
    // ascending numeric order. Neither is close, which is the point: the screen is carrying the
    // join and no arithmetic on the identifiers would have found it.
    let joined = 0;
    let byAppearance = 0;
    let byValue = 0;
    for (const [name] of DELAYS) {
      const c = parse(require_(name));
      const appearance = deviceIds(c);
      const ascending = [...appearance].sort((a, b) => a - b);
      for (const row of deviceDelays(c)) {
        joined += 1;
        if (appearance[row.group] === row.id) byAppearance += 1;
        if (ascending[row.group] === row.id) byValue += 1;
      }
    }
    assert.equal(joined, 19);
    assert.equal(byAppearance, 1);
    assert.equal(byValue, 4);
  });

test('a device delay is a tenth of a second, which the config draws 451 of', skipWithoutLab(), () => {
  // The independent closure on the unit, and it needs nothing but the config: the remote offers a
  // slider, and the label under it is drawn text. 451 of them, `( 0 sec )` through `( 45 sec )`,
  // contiguous in tenths with no gap, so a stored 80 is eight seconds and not eighty.
  const written = /^\(\s*([0-9]+(?:\.[0-9])?)\s*sec\s*\)$/;
  let drawn = 0;
  let silent = 0;
  for (const [name] of INVENTORY) {
    const c = parse(require_(name));
    const tenths = new Set<number>();
    for (const one of screenStrings(c, characterMap(c))) {
      const match = written.exec(one.text.trim());
      if (match !== null) tenths.add(Math.round(Number(match[1]) * 10));
    }
    if (deviceDelays(c).length === 0) {
      assert.equal(tenths.size, 0, `${name}: no delays and yet a delay slider`);
      silent += 1;
      continue;
    }
    const sorted = [...tenths].sort((a, b) => a - b);
    assert.equal(sorted.length, 451, name);
    assert.equal(sorted[0], 0, name);
    assert.equal(sorted[sorted.length - 1], 450, name);
    assert.deepEqual(sorted.filter((one, at) => at > 0 && one !== (sorted[at - 1] as number) + 1),
      [], `${name}: the ladder has a gap`);
    // And every device's stored value is one of the positions the slider offers.
    for (const row of deviceDelays(c)) assert.ok(tenths.has(row.powerOn), `${name} ${row.group}`);
    drawn += 1;
  }
  assert.equal(drawn, 3, 'the three arch 14 configs of INVENTORY');
  assert.equal(silent, 12);
});

test('base slot 15 is per model and states nothing about a device', skipWithoutLab(), () => {
  // **The refutation.** `docs/roadmap.md` carried "which base slot 15 group holds a device's delays"<!--superseded-->
  // as the last reading before the first write that changes something, and the answer is that no
  // group does. Two controls make that a measurement rather than an absence: the group lengths are
  // identical within an architecture across containers holding 0 to 7 devices, and the values are
  // identical across containers of one **model** that hold different numbers of devices.
  const shapes = new Map<number, Set<string>>();
  const values = new Map<string, Set<number>>();
  let checked = 0;
  for (const [name] of [...INVENTORY, ...DELAYS.slice(3)]) {
    const c = parse(require_(name));
    const groups = parameterGroups(c);
    if (groups === undefined) continue;
    const arch = c.architecture as number;
    (shapes.get(arch) ?? shapes.set(arch, new Set()).get(arch) as Set<string>)
      .add(groups.map((one) => one.values.length).join(','));
    const key = groups.map((one) => one.values.join(',')).join('|');
    (values.get(key) ?? values.set(key, new Set()).get(key) as Set<number>)
      .add(devices(c).length);
    checked += 1;
  }
  assert.equal(checked, 16);
  // One shape per architecture, over device counts that differ by seven.
  assert.deepEqual(
    [...shapes].map(([arch, set]) => [arch, set.size])
      .sort((a, b) => (a[0] as number) - (b[0] as number)),
    [[8, 1], [9, 1], [12, 1], [14, 1]]);
  // And the values are not counting devices either. Sixteen containers carry five distinct value
  // sets, four of which are shared by containers holding **different** numbers of devices, the
  // widest by six containers holding 3, 4, 6 and 7. The fifth is the two Harmony 700 configs, which
  // are one model and both hold six devices, so it is silent rather than contrary.
  const spans = [...values.values()].map((one) => [...one].sort((a, b) => a - b));
  assert.equal(spans.length, 5);
  assert.equal(spans.filter((one) => one.length > 1).length, 4);
  assert.deepEqual(
    spans.sort((a, b) => b.length - a.length || a.join().localeCompare(b.join())),
    [[3, 4, 6, 7], [1, 4], [1, 5], [3, 4], [6]]);
});

test("a device's delay equals its default in every config here", skipWithoutLab(), () => {
  // Nobody in the corpus has ever moved one of these sliders on the remote. That matters twice: it
  // is why the two fields could be swapped without any test noticing, so this states which is which
  // from the name rather than from the value; and it says the delays a config carries are the ones
  // Logitech's own database gave the device, not something its owner tuned.
  let pairs = 0;
  for (const [name] of DELAYS) {
    for (const row of deviceDelays(parse(require_(name)))) {
      assert.equal(row.powerOn, row.defaultPowerOn, `${name} ${row.group}`);
      assert.equal(row.interDevice, row.defaultInterDevice, `${name} ${row.group}`);
      pairs += 1;
    }
  }
  assert.equal(pairs, 19);
});

test("Logitech's own button map agrees about which device an identifier is",
  skipUnless('calibration_h600'), () => {
    // **The external closure, and it is the only one available**: the join above is read off the
    // screen, so a second route has to come from outside the config. Logitech's service was asked
    // for the button maps of the account that generated this config, and its reply says which
    // device each button addresses, by the same numeric identifier. Both of its activities give
    // three buttons to one shared device, which is the receiver taking the volume, and the rest to
    // a device of their own.
    //
    // The reply lives in the lab, since it carries an account identity, and nothing about it is
    // quoted here: the test finds the shared identifier itself and asks our reader which group that
    // is, then asks the config which group both activities drive. No identifier appears in this
    // file.
    if (LAB === undefined) return;
    const path = join(LAB, 'work', 'myharmony', 'responses', 'GET_MapList_skin71.json');
    const reply = JSON.parse(readFileSync(path, 'utf8')) as {
      ButtonMaps: { ActivityId?: unknown; Buttons?: { ButtonAction?: { DeviceId?: { Value?: number } } }[] }[];
    };
    const perActivity = reply.ButtonMaps
      .filter((one) => one.ActivityId !== undefined)
      .map((one) => new Set((one.Buttons ?? []).flatMap((button) => {
        const id = button.ButtonAction?.DeviceId?.Value;
        return typeof id === 'number' ? [id] : [];
      })));
    assert.equal(perActivity.length, 2, 'two activities on that account');
    const shared = [...perActivity[0] as Set<number>]
      .filter((one) => (perActivity[1] as Set<number>).has(one));
    assert.equal(shared.length, 1, 'exactly one device is in both activities');

    const c = parse(load('calibration_h600') as Uint8Array);
    const groups = deviceIdOfGroup(c);
    const ours = activities(c).map((one) => one.devices);
    assert.equal(ours.length, 2);
    const inBoth = (ours[0] as number[]).filter((one) => (ours[1] as number[]).includes(one));
    assert.deepEqual(inBoth, [groups.get(0) === shared[0] ? 0 : 2]);
    assert.equal(groups.get(inBoth[0] as number), shared[0],
      'the group both our activities drive is the device both their activities address');
  });
