/**
 * What a config says it is for: its devices, its activities, and what its state variables mean.
 *
 * **No test here quotes a brand out of a contributor's config.** What lands in this repository is
 * the shape and the count: how many variables carry a device identifier, not which; that a name ends
 * in its variable's value count, not what the name says. `CurrentActivityState`, `Root` and `State`
 * are the generator's own words and are quoted freely.
 *
 * `docs/findings.md` section 86.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless, skipWithoutLab } from '@harmony/lab';
import {
  ACTION_LIST_INDEX_OPCODE,
  ACTIVITY_STATE_NAME,
  activityBindings,
  activityCount,
  activityNames,
  activityWriterCount,
  idleActivityValue,
  modePages,
  screenStrings,
  taggedList,
  archSlot,
  deviceCount,
  deviceIds,
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
    const data = load(name);
    if (data === undefined) continue;
    const c = parse(data);
    for (const variable of stateVariables(c)) {
      if (variable.stated === undefined) continue;
      assert.notEqual(variable.record, undefined, `${name}: a name with no record`);
      assert.equal(variable.stated, (variable.record?.second as number) + 1,
        `${name}: variable ${variable.index}`);
      total += 1;
    }
  }
  assert.ok(total >= 240, `only ${total} named variables checked`);
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
      const data = load(name);
      if (data === undefined) continue;
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
    const data = load(name);
    if (data === undefined) continue;
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
  assert.ok(values >= 520, `only ${values} values`);
  assert.ok(indexed > 0 && sentinels > 0);
});

test('the sentinels are negative and there are two of them', skipWithoutLab(), () => {
  // `-2` in both fields and `-3` in `from`. Named rather than counted, because a third one turning
  // up is a change in the format and should fail here rather than be absorbed.
  const seen = new Set<number>();
  for (const [name] of INVENTORY) {
    const data = load(name);
    if (data === undefined) continue;
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
    const data = load(name);
    if (data === undefined) continue;
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
    const data = load(name);
    if (data === undefined) continue;
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
    const data = load(name);
    if (data === undefined) continue;
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
    const data = load(name);
    if (data === undefined) continue;
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
  assert.ok(total >= 12, `enough activity pages to mean something, got ${total}`);
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
    const data = load(name);
    if (data === undefined) continue;
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
  assert.ok(arch14.total >= 13, `and there are enough of them, got ${arch14.total}`);
  assert.ok(named / total > 0.6, `the corpus names most activities: ${named} of ${total}`);
  // **Every architecture resolves completely since 12 August 2026**, arch 12 last, through the touch
  // hit map rather than through string matching. Asserted per architecture rather than as a share,
  // because a share hides which of them stopped working.
  for (const architecture of [8, 9, 12, 14]) {
    const here = perArchitecture.get(architecture) as { named: number; total: number };
    assert.equal(here.named, here.total, `arch ${architecture} names every activity it binds`);
  }
  assert.equal(named, total, `the corpus names every activity: ${named} of ${total}`);
  assert.ok(total >= 50, `and there are enough of them, got ${total}`);
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
  // The pages differ in which codes they use and not in how many rows they draw, which is the
  // contradiction. Two codes appear on pages whose activity counts differ, so no single assignment of
  // code to row satisfies both.
  const rows = new Set<number>();
  for (const page of perPage.keys()) {
    for (const one of screenStrings(c)) {
      if (one.program === modePages(c)[page]?.program) rows.add(one.y);
    }
  }
  assert.ok(rows.size > 0, 'the pages do draw text');
});
