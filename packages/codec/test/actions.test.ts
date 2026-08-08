/**
 * The action list language, once both dispatchers had been read to the end.
 *
 * `docs/findings.md` section 73. Every number here was measured before the table in
 * `packages/codec/src/actions.ts` existed, so these are checks rather than restatements, and the
 * two closures are the ones the section rests on: an index that never leaves its table, and a
 * width the generator never violates.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import {
  archSlot,
  parse,
  reading,
  readingCoverage,
  stateTable,
  STATE_WRITE_BASE,
} from '../src/index.ts';
import type { Instruction } from '../src/index.ts';

/**
 * Every action list a config's base slot 10 table names, with the architecture that reads them.
 *
 * The architecture is asserted rather than cast, because `reading` resolves `0x3F`'s bands from it
 * and a wrong one would answer confidently instead of failing.
 */
function lists(name: string): { lists: Instruction[][]; architecture: number } {
  const c = parse(load(name)!);
  const architecture = c.architecture;
  assert.equal(typeof architecture, 'number', `${name} states no architecture`);
  const table = c.pointerArray(archSlot(architecture as number, 10)) ?? [];
  return { lists: table.map((a) => c.actionList(a) ?? []), architecture: architecture as number };
}

// name, state variable writes, of which narrow, screen program runs
const CLOSURES: [string, number, number, number][] = [
  ['one_config', 371, 371, 1269],
  ['h700_config', 384, 360, 0],
  ['h600_config', 210, 194, 0],
  ['h525_config', 86, 86, 0],
  ['arch8_config_a', 191, 191, 220],
];

for (const [name, writes, narrow, programs] of CLOSURES) {
  test(`${name}: 0x80 | n always names a state variable the table has`, skipUnless(name), () => {
    const c = parse(load(name)!);
    const table = stateTable(c);
    assert.ok(table, 'the sample must have a state variable table for this to test anything');
    let seen = 0;
    let narrowSeen = 0;
    for (const list of lists(name).lists) {
      for (const i of list) {
        if (i.opcode < STATE_WRITE_BASE) continue;
        seen += 1;
        const index = i.opcode - STATE_WRITE_BASE;
        assert.ok(index < table.count, `${name}: variable ${index} of ${table.count}`);
        if (index >= table.narrow) continue;
        narrowSeen += 1;
        // The firmware writes one byte for a narrow variable and drops the operand's high byte.
        // A generator that did not know the width would leave one behind here.
        assert.equal(i.operand >>> 8, 0, `${name}: narrow variable ${index} carries a high byte`);
      }
    }
    assert.equal(seen, writes);
    assert.equal(narrowSeen, narrow);
  });

  test(`${name}: 0x73 always indexes base slot 11`, skipUnless(name), () => {
    const c = parse(load(name)!);
    const programs_ = c.pointerArray(archSlot(c.architecture as number, 11)) ?? [];
    let seen = 0;
    for (const list of lists(name).lists) {
      for (const i of list) {
        if (i.opcode !== 0x73) continue;
        seen += 1;
        assert.ok(i.operand < programs_.length, `${name}: program ${i.operand} of ${programs_.length}`);
      }
    }
    assert.equal(seen, programs);
  });
}

test('the state variable band of 0x1F stays inside the table too', skipUnless('h700_config'), () => {
  // `0xE7` to `0xF2` reach the same store as `0x80 | n`, with the index in the operand instead of
  // the opcode, so the same closure has to hold for both or the reading joining them is wrong.
  const c = parse(load('h700_config')!);
  const table = stateTable(c)!;
  let seen = 0;
  for (const list of lists('h700_config').lists) {
    for (const i of list) {
      if (i.opcode !== 0x1f) continue;
      const band = i.operand >>> 8;
      if (band < 0xe7 || band > 0xf2) continue;
      seen += 1;
      assert.ok((i.operand & 0xff) < table.count);
    }
  }
  assert.equal(seen, 322);
});

test('a reading distinguishes meaning from placement', () => {
  // The distinction is the point of the table: without it the first draft reported 100%.
  assert.equal(reading({ opcode: 0x7f, operand: 0 }, 14)?.depth, 'meaning');
  assert.equal(reading({ opcode: 0x75, operand: 0 }, 14)?.depth, 'placement');
  // No reading at all is a third state, not a placement.
  assert.equal(reading({ opcode: 0x6e, operand: 0 }, 14), undefined);
});

test('a band the dispatcher tests and ignores is a reading, not a gap', () => {
  // `0x1F` with high byte `0xFC` sits in the gap between two live bands and does nothing.
  const r = reading({ opcode: 0x1f, operand: 0xfc00 }, 14);
  assert.equal(r?.noop, true);
  assert.equal(r?.depth, 'meaning');
  // So does everything below `0x07`, where the operand is never looked at.
  assert.equal(reading({ opcode: 0x00, operand: 0x1234 }, 14)?.noop, true);
  assert.equal(reading({ opcode: 0x06, operand: 0xffff }, 14)?.noop, true);
});

test('0x3F band 0xC0 resolves differently on the two architectures', () => {
  // The one place the second operand space is not one table. Arch 14 puts `0xC0` in the `0xB0`
  // band; arch 12 gives it a band and a routine of its own.
  const arch12 = reading({ opcode: 0x3f, operand: 0xc001 }, 12);
  const arch14 = reading({ opcode: 0x3f, operand: 0xc001 }, 14);
  assert.ok(arch12 && arch14);
  assert.equal(arch12.what, arch14.what, 'the same band text, since both are the lowest band');
  // But `0xB0` itself is only a band on arch 14: on arch 12 it falls off the end of the chain.
  assert.equal(reading({ opcode: 0x3f, operand: 0xb001 }, 12)?.noop, true);
  assert.equal(reading({ opcode: 0x3f, operand: 0xb001 }, 14)?.noop, undefined);
});

test('0x3F band 0xC0 is not an index into base slot 8 on arch 12', skipUnless('one_config'), () => {
  // The negative result that found the divergence. Reading it through the arch 14 handler predicts
  // an index bounded by base slot 8's leading byte, and the corpus refutes that outright.
  const c = parse(load('one_config')!);
  const slot8 = c.sections[archSlot(c.architecture as number, 8)]!;
  const bound = c.blob[c.blobOffsetOf(slot8.address)!];
  let highest = -1;
  let seen = 0;
  for (const list of lists('one_config').lists) {
    for (const i of list) {
      if (i.opcode !== 0x3f) continue;
      const band = i.operand >>> 8;
      if (band < 0xc0 || band >= 0xd0) continue;
      seen += 1;
      highest = Math.max(highest, i.operand & 0xff);
    }
  }
  assert.equal(seen, 106);
  assert.equal(bound, 1);
  assert.ok(highest > bound, `${highest} against a bound of ${bound}`);
});

// name, meaning, placement, unread
const COVERAGE: [string, number, number, number][] = [
  ['h700_config', 19355, 294, 2],
  ['h600_config', 11986, 206, 2],
  ['one_config', 9334, 2306, 0],
  ['h525_config', 943, 100, 0],
  ['arch8_config_a', 2825, 486, 0],
];

for (const [name, meaning, placement, unread] of COVERAGE) {
  test(`${name}: the step 6 progress number`, skipUnless(name), () => {
    const { lists: all, architecture } = lists(name);
    const c = readingCoverage(all, architecture);
    assert.equal(c.meaning, meaning);
    assert.equal(c.placement, placement);
    assert.equal(c.total - c.meaning - c.placement, unread);
  });
}

test('exactly one opcode in the whole corpus has no reading', skipUnless('one_config'), () => {
  // Guards against the table quietly growing to cover something nobody read, and against a new
  // sample introducing an opcode that slips past unnoticed.
  const names = ['one_config', 'h700_config', 'h600_config', 'h525_config', 'arch8_config_a'];
  const left = new Map<string, number>();
  for (const name of names) {
    if (!load(name)) continue;
    const { lists: all, architecture } = lists(name);
    for (const [k, n] of readingCoverage(all, architecture).unread) {
      left.set(k, (left.get(k) ?? 0) + n);
    }
  }
  assert.deepEqual([...left.keys()], ['0x6e']);
});
