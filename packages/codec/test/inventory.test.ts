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
  activityCount,
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
    // The closure that ties the values to the header. A record either carries none, 164 of them,
    // or covers `0` to `second` with a constant number of entries per value: 1 in 83 records, 2 in
    // two of them and 4 in one. So the eight byte entries belong to the variable's range rather
    // than being a list that happens to sit after the header, and the count is the number of
    // transitions rather than the number of values.
    //
    // The distribution is over `INVENTORY`, which is the fifteen container corpus and deliberately
    // not the two samples added on 10 August 2026. The test below checks the rule itself against one
    // of those, because the rule holding on a config outside the population is worth more than the
    // tally growing.
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
    assert.deepEqual([...perValue.entries()].sort((a, b) => a[0] - b[0]), [[1, 83], [2, 2], [4, 1]]);
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
  // the highest value. **Which value means "no activity" is deliberately not asserted**: the values
  // run from zero, so either zero is idle or the top is, and no sample here separates them.
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
  }
});
