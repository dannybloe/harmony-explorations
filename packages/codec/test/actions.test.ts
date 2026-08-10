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
  ARITHMETIC_BLOCK,
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
  // `0x77` was the placement example here until section 107 read its helper, and `0x6E` was the
  // no-reading one until the same section. Both were the obvious choices at the time.
  assert.equal(reading({ opcode: 0x67, operand: 0 }, 14)?.depth, 'placement');
  // No reading at all is a third state, and since section 108 **nothing** is in it: every opcode
  // resolves. The state stays in the type because a new architecture or a new sample can reach it,
  // and the test below is what would notice if one did.
  for (let opcode = 0; opcode <= 0xff; opcode += 1) {
    assert.ok(reading({ opcode, operand: 0 }, 14) !== undefined, `0x${opcode.toString(16)}`);
  }
});

test('the second dispatcher resolves by range, so 0x20 behaves like 0x1F', () => {
  // Section 108. Reading it as four exact opcodes cost the number nothing, because no config emits
  // anything but the canonical four, and it was still a wrong claim about the firmware.
  for (const [canonical, other] of [
    [0x3f, 0x40],
    [0x3f, 0x64],
    [0x1f, 0x20],
    [0x1f, 0x3e],
    [0x0f, 0x10],
    [0x0f, 0x1e],
    [0x07, 0x08],
    [0x07, 0x0e],
  ]) {
    for (const operand of [0xf000, 0xe000, 0x00ff, 0x0000]) {
      assert.deepEqual(
        reading({ opcode: other as number, operand }, 14),
        reading({ opcode: canonical as number, operand }, 14),
        `0x${(other as number).toString(16)} against 0x${(canonical as number).toString(16)}`,
      );
    }
  }
  // And below the lowest floor the dispatcher returns before looking at the operand at all.
  assert.equal(reading({ opcode: 0x06, operand: 0xffff }, 14)?.noop, true);
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
  // Selector 0 on arch 12, so the section is 106, which named the channels; selector 17's is 103.
  assert.equal(arch12.section, 106);
  assert.equal(reading({ opcode: 0x3f, operand: 0xc000 | (17 << 4) }, 12)?.section, 103);
  // But `0xB0` itself is only a band on arch 14: on arch 12 it falls off the end of the chain.
  assert.equal(reading({ opcode: 0x3f, operand: 0xb001 }, 12)?.noop, true);
  assert.equal(reading({ opcode: 0x3f, operand: 0xb001 }, 14)?.noop, undefined);
});

test('0x3F band 0xC0 resolves by selector on arch 12, and only selector 17 has a meaning', () => {
  // The band's handler dispatches again on operand bits 4 to 8, so this table does too. One reading
  // for the band would have to call the whole thing placement, which is what section 102 did and
  // what understated 68 of the 106 uses in each One config. Sections 103 and 106.
  //
  // `mid` is operand bits 1 to 3 and `fade` is bit 0. Selector 17 reads both; selectors 0 to 12 read
  // `mid` only, as a boolean, which section 106 corrected from bit 0.
  const at = (selector: number, mid = 0, fade = 0) =>
    reading({ opcode: 0x3f, operand: 0xc000 | (selector << 4) | (mid << 1) | fade }, 12);

  const light = at(BAND_3F_C0_LIGHT, 6);
  assert.equal(light?.depth, 'meaning');
  assert.match(light!.what, /display's light level/);

  assert.equal(at(BAND_3F_C0_PIN)?.depth, 'placement');
  assert.match(at(BAND_3F_C0_PIN)!.what, /LATC bit 5/);

  for (const selector of [0, 6, BAND_3F_C0_PROPERTY_LIMIT]) {
    const r = at(selector);
    assert.equal(r?.depth, 'placement', `selector ${selector}`);
    assert.match(r!.what, new RegExp(`channel ${selector} `));
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
//
// Section 103 moved 68 instructions from placement to meaning in each One config, the selector 17
// uses of band 0xC0. Section 107 moved the rest: the two modulos in each arch 14 config out of
// unread, and every divide and multiply out of placement, which is why the last column is zero
// everywhere and no sample has an unread instruction left.
const COVERAGE: [string, number, number, number][] = [
  ['h700_config', 19372, 279, 0],
  ['h600_config', 11998, 196, 0],
  ['one_config', 11509, 131, 0],
  ['h525_config', 1013, 30, 0],
  ['arch8_config_a', 3233, 78, 0],
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

test('no opcode in the whole corpus is left without a reading', skipUnless('one_config'), () => {
  // Guards against the table quietly growing to cover something nobody read, and against a new
  // sample introducing an opcode that slips past unnoticed. This asserted `['0x6e']` until section
  // 107 read it, which is why the assertion is the whole list and not its length.
  const names = ['one_config', 'h700_config', 'h600_config', 'h525_config', 'arch8_config_a'];
  const left = new Map<string, number>();
  for (const name of names) {
    if (!load(name)) continue;
    const { lists: all, architecture } = lists(name);
    for (const [k, n] of readingCoverage(all, architecture).unread) {
      left.set(k, (left.get(k) ?? 0) + n);
    }
  }
  assert.deepEqual([...left.keys()], []);
});

/**
 * Section 107: the arithmetic block, and the two idioms a generator builds a remainder out of.
 *
 * The closure these tests carry is an identity rather than a firmware address. `x - (x / n) * n` is
 * `x mod n` and `x - (x mod n)` is `(x / n) * n`, so the arch 8 and arch 12 generators computing
 * one with a divide and a multiply, and the arch 14 generator computing the other with a modulo,
 * are two readings of the same arithmetic. Neither could be right on its own accident.
 */
const MODULO = 0x6e;
const DIVIDE = 0x77;
const MULTIPLY = 0x78;
const STATE_OPERATION = 0x70;
const SUBTRACT_NIBBLE = 7;

test('every opcode in the main space has a reading, and three of them nothing uses', () => {
  // Section 108 read the last three, `0x65`, `0x66` and `0x76`. They are placement: two append
  // operand bytes to a region of the serial flash and one positions a cursor in it, and what the
  // bytes are for is not named. The corpus uses none of them, which is asserted below rather than
  // assumed, because a placement nobody exercises is exactly where a wrong reading would survive.
  for (let opcode = 0x65; opcode <= 0x7f; opcode += 1) {
    const r = reading({ opcode, operand: 0 }, 14);
    assert.ok(r !== undefined, `0x${opcode.toString(16)} has no reading`);
  }
  for (const opcode of [0x65, 0x66, 0x76]) {
    assert.equal(reading({ opcode, operand: 0 }, 14)!.depth, 'placement');
    assert.equal(reading({ opcode, operand: 0 }, 14)!.section, 108);
  }
  // `0x76` is outside the arch 14 only block, so it reads the same on every architecture; `0x65`
  // and `0x66` are inside it.
  for (const architecture of [8, 9, 12]) {
    assert.equal(reading({ opcode: 0x76, operand: 0 }, architecture)!.section, 108);
    assert.equal(reading({ opcode: 0x65, operand: 0 }, architecture)!.noop, true);
  }
});

test('nothing in the corpus uses the three flash journal opcodes', skipUnless('one_config'), () => {
  const names = [
    'h700_config',
    'h700_config_2',
    'h600_config',
    'h525_config',
    'one_config',
    'one_config_unprogrammed',
    'arch8_config_a',
    'arch8_config_b',
  ];
  let seen = 0;
  let checked = 0;
  for (const name of names) {
    if (!load(name)) continue;
    checked += 1;
    for (const list of lists(name).lists) {
      for (const instruction of list) {
        if ([0x65, 0x66, 0x76].includes(instruction.opcode)) seen += 1;
      }
    }
  }
  assert.ok(checked >= 5, `only ${checked} samples, which proves little`);
  assert.equal(seen, 0);
});

test('the arithmetic opcodes read as arithmetic, and only on arch 14 for the block', () => {
  const at = (opcode: number, operand: number, architecture: number) =>
    reading({ opcode, operand }, architecture);

  // Modulo is arch 14's, and the same opcode is nothing on the three other architectures.
  assert.match(at(MODULO, 5, 14)!.what, /modulo/);
  assert.equal(at(MODULO, 5, 14)!.depth, 'meaning');
  for (const architecture of [8, 9, 12]) {
    assert.equal(at(MODULO, 5, architecture)?.noop, true, `arch ${architecture}`);
  }
  // Divide and multiply are outside the block, so they read the same everywhere.
  for (const architecture of [8, 9, 12, 14]) {
    assert.match(at(DIVIDE, 6, architecture)!.what, /divided/, `arch ${architecture}`);
    assert.match(at(MULTIPLY, 6, architecture)!.what, /times/, `arch ${architecture}`);
    assert.equal(at(DIVIDE, 6, architecture)!.depth, 'meaning');
    assert.equal(at(MULTIPLY, 6, architecture)!.depth, 'meaning');
  }
  // And the whole block goes quiet off arch 14, not just the one opcode the corpus uses.
  for (const opcode of [0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e]) {
    assert.equal(at(opcode, 0, 12)?.noop, true, `0x${opcode.toString(16)} on arch 12`);
    assert.ok(ARITHMETIC_BLOCK.has(opcode));
  }
  // 0x6F is not in the block: it is the same dead test on every architecture we hold firmware for.
  assert.equal(ARITHMETIC_BLOCK.has(0x6f), false);
  for (const architecture of [9, 12, 14]) {
    assert.equal(at(0x6f, 0, architecture)?.noop, true, `arch ${architecture}`);
  }
});

test('0x70 and 0x71 resolve eight operations, six comparisons and two updates', () => {
  const at = (opcode: number, nibble: number) =>
    reading({ opcode, operand: (nibble << 8) | 0x2d }, 14)!;

  for (let nibble = 0; nibble <= 5; nibble += 1) {
    assert.match(at(STATE_OPERATION, nibble).what, /^condition:/, `nibble ${nibble}`);
    assert.equal(at(STATE_OPERATION, nibble).section, 34, 'a comparison is section 34s reading');
  }
  // The order is the one `docs/config-format.md` already recorded from section 34, which is worth
  // saying because reading the chain's `BZ` targets in the order they appear gives 3, 4 and 5 the
  // wrong way round: the chain tests nibble 7 first and falls through to nibble 0.
  assert.match(at(STATE_OPERATION, 0).what, /is equal to/);
  assert.match(at(STATE_OPERATION, 1).what, /is not equal to/);
  assert.match(at(STATE_OPERATION, 2).what, /is greater than the/);
  assert.match(at(STATE_OPERATION, 3).what, /is less than the/);
  assert.match(at(STATE_OPERATION, 4).what, /is greater than or equal to/);
  assert.match(at(STATE_OPERATION, 5).what, /is less than or equal to/);

  // 6 and 7 are updates, and they carry the clamp, which is the rail an editor needs.
  for (const nibble of [6, 7]) {
    assert.match(at(STATE_OPERATION, nibble).what, /clamped to its stated range/);
    assert.equal(at(STATE_OPERATION, nibble).section, 107);
  }
  assert.match(at(STATE_OPERATION, 6).what, /is added to/);
  assert.match(at(STATE_OPERATION, 7).what, /is subtracted from/);

  // The two opcodes differ only in the left hand side.
  assert.match(at(0x70, 0).what, /the accumulator/);
  assert.match(at(0x71, 0).what, /the byte register/);

  // Nibbles 8 to 15 reach no arm of the chain.
  for (const nibble of [8, 12, 15]) {
    assert.equal(at(STATE_OPERATION, nibble).noop, true, `nibble ${nibble}`);
  }
});

test('every corpus multiply follows a divide by the same operand', skipUnless('one_config'), () => {
  // The arch 8 and arch 12 remainder idiom, and the reason both opcodes are believed: eight
  // multiplies in the whole corpus, eight of them the second half of `x / n * n`. A multiply used
  // for anything else would break this, and so would a divide that did not truncate.
  const names = [
    'one_config',
    'one_config_unprogrammed',
    'arch8_config_a',
    'arch8_config_b',
    'arch8_config_c',
    'arch8_config_d',
    'h700_config',
    'h600_config',
    'h525_config',
  ];
  let multiplies = 0;
  let paired = 0;
  const modulo = new Map<number, number[]>();
  for (const name of names) {
    if (!load(name)) continue;
    const { lists: all, architecture } = lists(name);
    for (const list of all) {
      list.forEach((instruction, at) => {
        if (instruction.opcode === MULTIPLY) {
          multiplies += 1;
          const before = list[at - 1];
          if (before?.opcode === DIVIDE && before.operand === instruction.operand) paired += 1;
        }
        if (instruction.opcode === MODULO) {
          assert.equal(architecture, 14, `${name}: a modulo off arch 14 would do nothing`);
          modulo.set(architecture, [...(modulo.get(architecture) ?? []), instruction.operand]);
        }
      });
    }
  }
  assert.ok(multiplies > 0, 'no multiplies found, so this proves nothing');
  assert.equal(paired, multiplies, 'every multiply is the second half of a remainder');
  // And the moduli are the step sizes, 5 and 10, one of each per arch 14 config.
  for (const [, operands] of modulo) {
    assert.deepEqual([...new Set(operands)].sort((a, b) => a - b), [5, 10]);
  }
});

test('the arch 14 modulo idiom rounds a value down to a multiple', skipUnless('h700_config'), () => {
  // Eight instructions, and the shape is what makes the reading a meaning rather than a placement:
  //
  //   accumulator = X;  scratch = accumulator;  accumulator = X
  //   accumulator = X mod n
  //   call a list whose one instruction is `scratch = scratch - accumulator`
  //   accumulator = scratch;  X = accumulator
  //
  // so X becomes X - (X mod n), the largest multiple of n at or below X. The step the neighbouring
  // lists add and subtract is the same n, which is the closure: a rounding to a grid the plus and
  // minus buttons move on.
  for (const name of ['h700_config', 'h700_config_2', 'h600_config']) {
    if (!load(name)) continue;
    const { lists: all, architecture } = lists(name);
    assert.equal(architecture, 14);
    const found: number[] = [];
    for (const list of all) {
      const at = list.findIndex((i) => i.opcode === MODULO);
      if (at < 0) continue;
      assert.equal(list.length, 8, `${name}: the idiom is eight instructions`);
      assert.equal(at, 3, `${name}: the modulo is the fourth`);
      const target = list[at + 1]!;
      assert.equal(target.opcode, 0x7f, `${name}: the call comes next`);
      // The called list subtracts the accumulator from the scratch variable, and nothing else.
      const called = all[target.operand] ?? [];
      assert.equal(called[0]!.opcode, STATE_OPERATION);
      assert.equal((called[0]!.operand >>> 8) & 0x0f, SUBTRACT_NIBBLE);
      const scratch = called[0]!.operand & 0xff;
      // The scratch is the variable the second instruction saved the value into, and the last
      // instruction writes the result back where the first read it from.
      assert.equal(list[1]!.operand & 0xff, scratch, `${name}: the saved copy is the one updated`);
      assert.equal(list[0]!.operand & 0xff, list[7]!.operand & 0xff, `${name}: read and written`);
      assert.equal(list[6]!.operand & 0xff, scratch, `${name}: the result comes back from it`);
      found.push(list[at]!.operand);

      // The step: some other list adds this modulus to the same variable, and another subtracts it.
      const variable = list[0]!.operand & 0xff;
      const steps = new Set<number>();
      for (const other of all) {
        if (other.length !== 3 || other[1]!.opcode !== 0x79) continue;
        if ((other[0]!.operand & 0xff) !== variable) continue;
        if ((other[2]!.operand & 0xff) !== variable) continue;
        steps.add(other[1]!.operand);
      }
      const n = list[at]!.operand;
      assert.ok(steps.has(n), `${name}: variable ${variable} is stepped up by ${n}`);
      assert.ok(steps.has((0x10000 - n) & 0xffff), `${name}: and down by the same`);
    }
    assert.deepEqual(found.sort((a, b) => a - b), [5, 10], `${name}: one grid each`);
  }
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
