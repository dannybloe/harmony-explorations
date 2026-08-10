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
  stateRecords,
  stateTable,
  BAND_3F_C0_LIGHT,
  BAND_3F_C0_PIN,
  BAND_3F_C0_PROPERTY_LIMIT,
  BAND_3F_C0_SELECTOR,
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
  assert.equal(reading({ opcode: 0x77, operand: 0 }, 14)?.depth, 'placement');
  // No reading at all is a third state, not a placement.
  assert.equal(reading({ opcode: 0x6e, operand: 0 }, 14), undefined);
});

test('a band the dispatcher tests and ignores is a reading, not a gap', () => {
  // `0x1F` with high byte `0xE0` reaches the dispatcher's floor and does nothing. This test used
  // `0xFC` as its example until section 104 found that one is intercepted before the dispatcher, so
  // the example was the one band on the list that is not a no-op.
  const r = reading({ opcode: 0x1f, operand: 0xe000 }, 14);
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
  // This line used to assert the two descriptions were EQUAL, "since both are the lowest band",
  // which pinned the defect rather than the property: the band was built by renaming arch 14's
  // entry, so arch 14's description sat on arch 12's handler. Section 102 read arch 12's own
  // handler, and the whole point of the divergence is that the two do different things.
  assert.notEqual(arch12.what, arch14.what, 'two different handlers must not share a description');
  assert.equal(arch12.section, 103);
  // But `0xB0` itself is only a band on arch 14: on arch 12 it falls off the end of the chain.
  assert.equal(reading({ opcode: 0x3f, operand: 0xb001 }, 12)?.noop, true);
  assert.equal(reading({ opcode: 0x3f, operand: 0xb001 }, 14)?.noop, undefined);
});

test('0x3F band 0xC0 resolves by selector on arch 12, and only selector 17 has a meaning', () => {
  // The band's handler dispatches again on operand bits 4 to 8, so this table does too. One reading
  // for the band would have to call the whole thing placement, which is what section 102 did and
  // what understated 68 of the 106 uses in each One config. Section 103.
  const at = (selector: number, mid = 0, bit0 = 0) =>
    reading({ opcode: 0x3f, operand: 0xc000 | (selector << 4) | (mid << 1) | bit0 }, 12);

  const light = at(BAND_3F_C0_LIGHT, 6);
  assert.equal(light?.depth, 'meaning');
  assert.match(light!.what, /display's light level/);

  assert.equal(at(BAND_3F_C0_PIN)?.depth, 'placement');
  assert.match(at(BAND_3F_C0_PIN)!.what, /LATC bit 5/);

  for (const selector of [0, 6, BAND_3F_C0_PROPERTY_LIMIT]) {
    const r = at(selector);
    assert.equal(r?.depth, 'placement', `selector ${selector}`);
    assert.match(r!.what, new RegExp(`property ${selector} `));
  }

  // The selector is five bits, so bit 8 belongs to it as well as to the band's high byte: 16 and 17
  // arrive as high byte 0xC1. Reading it as four bits puts the light on selector 1.
  assert.equal(BAND_3F_C0_SELECTOR(0xc000 | (17 << 4)), 17);
  assert.equal((0xc000 | (17 << 4)) >>> 8, 0xc1);

  // 13 to 15 and 18 to 31 are the seventeen values the handler drops, and the corpus never uses
  // one. `sections.test.ts` asserts that from the configs; this asserts the table agrees.
  for (const selector of [13, 15, 18, 31]) {
    assert.equal(at(selector)?.noop, true, `selector ${selector}`);
  }
});

test('0x1F band 0xFC is intercepted by the fetch, so it is not the no-op it looked like', () => {
  // Section 104. The dispatcher's arm really does nothing, which is why reading the dispatcher
  // alone gave the wrong answer: the fetch tests for this opcode and band first and never dispatches
  // it. All four architectures do it, and no config in the corpus emits one.
  for (const architecture of [8, 9, 12, 14]) {
    const r = reading({ opcode: 0x1f, operand: 0xfc0e }, architecture);
    assert.equal(r?.depth, 'meaning', `arch ${architecture}`);
    assert.notEqual(r?.noop, true, 'a reading, not an absence of one');
    assert.equal(r?.section, 104);
  }
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
  ['h700_config', 19370, 279, 2],
  ['h600_config', 11996, 196, 2],
  // Section 103 moved 68 instructions from placement to meaning, the selector 17 uses of band 0xC0.
  ['one_config', 11487, 153, 0],
  ['h525_config', 1013, 30, 0],
  ['arch8_config_a', 3213, 98, 0],
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

/**
 * Section 74: the Harmony One's remaining opcodes.
 *
 * The tone table is the one closure worth pinning as numbers rather than as a count, because it is
 * what turns `0x75` from a placement into a meaning: four operands, four audible frequencies,
 * under a clock section 32 derived from something else entirely.
 */
const TONE_STEP_US = 17 / 4; // seventeen instruction cycles an iteration, at 4 MIPS

// operand, cycles, half period in iterations, frequency to the nearest hertz
const TONES: [number, number, number, number][] = [
  [0x01ff, 1, 255, 461],
  [0x0fca, 15, 202, 582],
  [0x4664, 70, 100, 1176],
  [0x8c19, 140, 25, 4706],
];

test('every 0x75 operand in the corpus is one of four audible tones', skipUnless('one_config'), () => {
  const names = ['one_config', 'h525_config', 'arch8_config_a', 'one_spare_after_sync'];
  const seen = new Map<number, number>();
  for (const name of names) {
    if (!load(name)) continue;
    for (const list of lists(name).lists) {
      for (const i of list) if (i.opcode === 0x75) seen.set(i.operand, (seen.get(i.operand) ?? 0) + 1);
    }
  }
  assert.deepEqual([...seen.keys()].sort((a, b) => a - b), TONES.map((t) => t[0]).sort((a, b) => a - b));

  for (const [operand, cycles, half, hz] of TONES) {
    assert.equal(operand >>> 8, cycles);
    assert.equal(operand & 0xff, half);
    // Audible, and that is the point: a square wave at these rates is a beeper and nothing else.
    const frequency = 1e6 / (2 * half * TONE_STEP_US);
    assert.equal(Math.round(frequency), hz);
    assert.ok(frequency > 200 && frequency < 8000, `${hz} Hz is outside the audible band`);
  }
});

test('arch 12 and arch 14 never use each others 0x3F 0xF0 nibbles', skipUnless('one_config'), () => {
  // The band's XORLW chain has cases 0 to 5 on arch 12 and 0, 1, 2, 6, 7 on arch 14, so the two
  // sets of configs must stay inside their own. A prediction, not a description.
  const only12 = new Set([3, 4, 5]);
  const only14 = new Set([6, 7]);
  const used = new Map<number, Set<number>>();
  for (const name of ['one_config', 'h700_config', 'h600_config', 'arch8_config_a', 'h525_config']) {
    if (!load(name)) continue;
    const { lists: all, architecture } = lists(name);
    if (!used.has(architecture)) used.set(architecture, new Set());
    for (const list of all) {
      for (const i of list) {
        if (i.opcode !== 0x3f) continue;
        const hi = i.operand >>> 8;
        if (hi >= 0xf0) used.get(architecture)!.add(hi & 0x0f);
      }
    }
  }
  for (const [architecture, nibbles] of used) {
    for (const n of nibbles) {
      if (architecture === 12) assert.ok(!only14.has(n), `arch 12 used nibble ${n}`);
      else assert.ok(!only12.has(n), `arch ${architecture} used nibble ${n}`);
    }
  }
  // And the divergence has to be visible, or the test passes vacuously.
  assert.ok([...(used.get(12) ?? [])].some((n) => only12.has(n)), 'arch 12 uses none of its own');
});

test('the low state variable records are identical across architectures', skipUnless('one_config'), () => {
  // Which is what "state variables 3, 5 and 6 are firmware defined" predicts from the config side.
  const shapes = new Map<number, string>();
  for (const name of ['one_config', 'h700_config', 'h600_config', 'arch8_config_a', 'h525_config']) {
    if (!load(name)) continue;
    const c = parse(load(name)!);
    const records = stateRecords(c) ?? [];
    if (records.length < 12) continue;
    shapes.set(c.architecture as number, records.slice(2, 12).map((r) => r.count).join(','));
  }
  assert.ok(shapes.size >= 3, 'needs several architectures to say anything');
  assert.equal(new Set(shapes.values()).size, 1, [...shapes].map(([a, s]) => `${a}: ${s}`).join(' | '));
});
