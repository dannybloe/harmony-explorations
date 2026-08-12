/**
 * The infrared carrier, `docs/findings.md` section 92.
 *
 * The claim under test is that the two `u24` fields the record loader reads below the class byte
 * are a carrier period and its on time, in nanoseconds. Everything here is a way for that to be
 * wrong: the halving relation, the firmware's own ceiling, the frequencies landing in the consumer
 * band, and a negative that fails if the fields are at different offsets than claimed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless, skipWithoutLab } from '@harmony/lab';

import {
  IR_CARRIER_AT,
  IR_CARRIER_MAX_NS,
  IR_CLASS_STREAM,
  IrEncodeError,
  IR_BLOCK_HELD,
  IR_PULSE_MAX,
  irBlockDuration,
  irBlockWords,
  irBuildBlock,
  irBuildRecord,
  irCarrier,
  irClass,
  irGroups,
  irHeaderLength,
  irHeaderPointers,
  irPeriodFor,
  irRecordBlocks,
  irRecordStart,
  irRepeatBlock,
  irRepeatPeriod,
  parse,
  payloadOf,
} from '../src/index.ts';
import type { Container } from '../src/index.ts';

/** Every container in the corpus that has an infrared section. */
const WITH_INFRARED = [
  'h525_config',
  'h525_config_2',
  'arch8_config_a',
  'arch8_config_b',
  'arch8_config_c',
  'arch8_config_d',
  'one_config',
  'one_config_unprogrammed',
  'h600_config',
  'h700_config',
  'h700_config_2',
  'one_spare_before_sync',
  'one_spare_after_sync',
] as const;

/** The carrier of every record, in address order. */
function carriers(c: Container): { periodNs: number; onNs: number; hertz: number }[] {
  const out: { periodNs: number; onNs: number; hertz: number }[] = [];
  for (const group of irGroups(c) ?? []) {
    for (const address of group.addresses) {
      const carrier = irCarrier(c, address);
      if (carrier !== undefined) out.push(carrier);
    }
  }
  return out;
}

function container(name: string): Container {
  return parse(payloadOf(load(name) as Uint8Array));
}

for (const name of WITH_INFRARED) {
  test(`${name} names a 50 percent carrier in every record`, skipUnless(name), () => {
    const found = carriers(container(name));
    assert.ok(found.length > 0, 'the sample has infrared records');
    for (const { periodNs, onNs } of found) {
      // A carrier is a square wave, so the on time is half the period. Written as the exact
      // relation rather than a tolerance: it holds to the bit in every record of the corpus, and a
      // tolerance would let a wrong field pass.
      assert.equal(onNs, periodNs >> 1, `on time is half of ${periodNs}`);
    }
  });

  test(`${name} stays inside the firmware's own carrier ceiling`, skipUnless(name), () => {
    // The class 1 arm of the record loader clamps the period at this value, so a config that
    // exceeded it would be silently altered by the remote. That the corpus never approaches the
    // clamp is what makes the nanosecond reading sane: as tenths of a microsecond the ceiling
    // would be 25.6 ms, which is not a carrier by any reading.
    for (const { periodNs } of carriers(container(name))) {
      assert.ok(periodNs > 0 && periodNs <= IR_CARRIER_MAX_NS, `period ${periodNs}`);
    }
  });

  test(`${name} carries only consumer infrared frequencies`, skipUnless(name), () => {
    // 30 to 60 kHz is the band consumer infrared uses. This is the test that fails if the unit is
    // not nanoseconds: at tenths of a microsecond every record here would read as 380 Hz.
    for (const { hertz } of carriers(container(name))) {
      assert.ok(hertz >= 30_000 && hertz <= 60_000, `${Math.round(hertz)} Hz is not a carrier`);
    }
  });
}

test('the corpus spans architectures, so the carrier is not one model', skipWithoutLab(), () => {
  const seen = new Set<number>();
  for (const name of WITH_INFRARED) {
    const bytes = load(name);
    if (bytes === undefined) continue;
    const c = parse(payloadOf(bytes));
    if (carriers(c).length > 0 && c.architecture !== undefined) seen.add(c.architecture);
  }
  assert.ok(seen.size >= 3, `only ${[...seen].join(', ')}`);
});

/**
 * The closure. A stored period is `floor(1e9 / f)` for a frequency stated in whole hundreds of
 * hertz, which is what says the unit is nanoseconds: no other unit turns these particular integers
 * into the frequencies consumer infrared actually uses.
 *
 * 40 kHz is the exact case, since 1e9 divides by 40000 without remainder. The other two are the
 * truncation, and getting that wrong is a real risk rather than a hypothetical: the first version
 * of this test asserted 27777 was 36 kHz to the hertz and it is 36001, because the generator
 * truncated 27777.78 rather than rounding it. A writer that rounds would emit 27778 and produce a
 * config that differs from Logitech's by one byte per device.
 */
const CARRIERS: readonly [number, number][] = [
  [40_000, 25_000],
  [38_000, 26_315],
  [36_000, 27_777],
];

test('a stored period is the truncated nanosecond period of a round frequency', () => {
  // No lab needed: this is arithmetic on the numbers the corpus carries, and it is the half of the
  // claim that a fresh clone should still be protected by.
  for (const [hertz, periodNs] of CARRIERS) {
    assert.equal(Math.floor(1e9 / hertz), periodNs, `${hertz} Hz`);
  }
});

test('the periods the arithmetic predicts are the ones the corpus carries', skipWithoutLab(), () => {
  const found = new Set<number>();
  for (const name of WITH_INFRARED) {
    const bytes = load(name);
    if (bytes === undefined) continue;
    for (const { periodNs } of carriers(parse(payloadOf(bytes)))) found.add(periodNs);
  }
  assert.ok(found.size > 0, 'no sample available');
  for (const [hertz, periodNs] of CARRIERS) {
    assert.ok(found.has(periodNs), `${hertz} Hz is not in the corpus`);
  }
  // And the field is not a constant, which is what would make the halving above trivial.
  assert.ok(found.size >= 5, `only ${found.size} distinct carriers`);
});

test('read the other way round the fields are not a carrier', skipWithoutLab(), () => {
  // The negative. Both fields are little endian `u24`, and the whole reading rests on that. Read
  // big endian the same bytes give neither the halving relation nor a frequency in the band, so
  // this fails loudly if the endianness is ever flipped to make some other structure fit.
  const name = WITH_INFRARED.find((n) => load(n) !== undefined);
  if (name === undefined) return;
  const c = parse(payloadOf(load(name) as Uint8Array));

  let halves = 0;
  let inBand = 0;
  let records = 0;
  for (const group of irGroups(c) ?? []) {
    for (const address of group.addresses) {
      const off = recordOffset(c, address);
      if (off === undefined || off + IR_CARRIER_AT + 6 > c.blob.length) continue;
      records += 1;
      const swapped = (at: number): number =>
        ((c.blob[off + at] as number) << 16) |
        ((c.blob[off + at + 1] as number) << 8) |
        (c.blob[off + at + 2] as number);
      const period = swapped(IR_CARRIER_AT);
      if (period > 0 && swapped(IR_CARRIER_AT + 3) === period >> 1) halves += 1;
      if (period > 0 && 1e9 / period >= 30_000 && 1e9 / period <= 60_000) inBand += 1;
    }
  }
  assert.ok(records > 0);
  assert.equal(halves, 0, 'big endian does not halve');
  assert.equal(inBand, 0, 'big endian is not a consumer carrier');
});

/**
 * Milestone M2's third part asked the same question of a whole container. This asks it of one
 * infrared code, built from nothing but timings: can this codec make the bytes of a code that has
 * never existed. Learning a code produces a carrier and a list of durations and nothing else, so if
 * those two are enough to reconstruct a record byte for byte, then a learn path does not need
 * Logitech's service to store what it captured. `docs/findings.md` sections 91 and 92.
 */
for (const name of WITH_INFRARED) {
  test(`${name} rebuilds every class 1 record from timings alone`, skipUnless(name), () => {
    const c = container(name);
    let records = 0;
    let blocks = 0;
    for (const group of irGroups(c) ?? []) {
      for (const address of group.addresses) {
        if (irClass(c, address) !== IR_CLASS_STREAM) continue;
        const carrier = irCarrier(c, address);
        const start = irRecordStart(c, address);
        const off = start === undefined ? undefined : c.blobOffsetOf(start);
        if (carrier === undefined || start === undefined || off === undefined) continue;

        // The header, from the carrier and the addresses and nothing else.
        const built = irBuildRecord({
          periodNs: carrier.periodNs,
          start,
          pointers: irHeaderPointers(c, address),
          spare: c.blob[off] ?? 0,
        });
        const original = c.blob.subarray(off, off + irHeaderLength(c, address));
        assert.deepEqual([...built], [...original], `header of the record at ${start}`);
        records += 1;

        // And each duration block, from its pulses read back as a learn session would deliver
        // them: marks and spaces in microseconds, with no word format in sight.
        for (const block of irRecordBlocks(c, address)) {
          const words = irBlockWords(c, block);
          const at = c.blobOffsetOf(block);
          if (words === undefined || at === undefined) continue;
          const pulses = words.slice(0, -1).map((w) => ({
            mark: w >> 15 === 1,
            microseconds: w & 0x7fff,
          }));
          const rebuilt = irBuildBlock(pulses);
          assert.deepEqual([...rebuilt], [...c.blob.subarray(at, at + 2 * words.length)]);
          blocks += 1;
        }
      }
    }
    // Arch 9 is class 5 in every record, section 82, so it has nothing for this builder to make
    // and saying so is worth more than skipping it: if a class 1 record ever turned up there, the
    // corpus would have changed under a claim this file rests on.
    if (c.architecture === 9) {
      assert.equal(records, 0, 'arch 9 carries no class 1 record');
      return;
    }
    assert.ok(records > 0, 'the sample has class 1 records');
    assert.ok(blocks > 0, 'and they name duration blocks');
  });
}

test('a period is built by truncating, which is what the corpus did', () => {
  for (const [hertz, periodNs] of CARRIERS) assert.equal(irPeriodFor(hertz), periodNs);
  // The negative for the whole builder: rounding is the plausible wrong choice and it is one byte
  // away from the right one, so it gets its own assertion rather than resting on the table above.
  assert.notEqual(irPeriodFor(36_000), Math.round(1e9 / 36_000));
});

test('the builder refuses what it cannot spell rather than truncating', () => {
  // A gap longer than fifteen bits has to become several words, and which several is the caller's
  // decision. Silently truncating would produce a config the remote accepts and mishandles, which
  // is the failure mode every rail in this project exists to prevent.
  assert.throws(() => irBuildBlock([{ mark: false, microseconds: 40_000 }]), IrEncodeError);
  assert.throws(() => irBuildBlock([{ mark: true, microseconds: -1 }]), IrEncodeError);
  // Two pointers is not a group. The firmware reads three per group and a short array would make
  // it read the next record's bytes as an address.
  assert.throws(() => irBuildRecord({ periodNs: 26_315, start: 0, pointers: [1, 2] }), IrEncodeError);
  // And a carrier the firmware would clamp is refused here instead, because a clamp is a silent
  // rewrite of what the caller asked for.
  assert.throws(() => irPeriodFor(1_000), IrEncodeError);
});

/** Blob offset of the record `address` names, from the back pointer the firmware follows. */
function recordOffset(c: Container, address: number): number | undefined {
  const at = c.blobOffsetOf(address);
  if (at === undefined || at + 4 > c.blob.length) return undefined;
  const start =
    (c.blob[at + 1] as number) |
    ((c.blob[at + 2] as number) << 8) |
    ((c.blob[at + 3] as number) << 16);
  return c.blobOffsetOf(start);
}

test('a pointer group takes one of four shapes, and slot 1 is the one that repeats',
  skipWithoutLab(), () => {
    // Section 127. The firmware walks a record's three pointers and samples the keypad at the end of
    // every block: slot 0 is what a tap sends, slot 1 plays only while the key is held and then
    // repeats, slot 2 is a tail. So the shape census is what says how many codes can repeat at all,
    // and it has to be stable: a reader that lost a pointer would move these four numbers.
    const shapes = new Map<string, number>();
    for (const name of WITH_INFRARED) {
      const data = load(name);
      if (data === undefined) continue;
      const c = parse(data);
      for (const group of irGroups(c) ?? []) {
        for (const address of group.addresses) {
          const pointers = irHeaderPointers(c, address);
          for (let at = 0; at + 2 < pointers.length; at += 3) {
            const shape = [0, 1, 2]
              .map((slot) => ((pointers[at + slot] ?? 0) === 0 ? '0' : 'B'))
              .join('');
            shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
          }
        }
      }
    }
    // Only these four occur, and in particular a group is never empty and never `0B*`: the first
    // pointer is always a real block, which is what makes slot 0 "what a tap sends".
    assert.deepEqual([...shapes.keys()].sort(), ['B00', 'B0B', 'BB0', 'BBB']);
    const total = [...shapes.values()].reduce((sum, n) => sum + n, 0);
    assert.ok(total > 3500, `enough groups to mean something, got ${total}`);
    assert.ok((shapes.get('BB0') ?? 0) > 1500, 'most repeating codes are the plain once plus held');
    assert.equal(shapes.get('BBB'), 95, 'and the three block form is rare and only on arch 8');
  });

test('a held key repeats at the length of its second block, which is tens of milliseconds',
  skipWithoutLab(), () => {
    // The number a user feels, and the reason it is worth a reader: the firmware replays the whole
    // block and only then looks at the keypad, so the interval between two sends **is** the block's
    // duration. A misread of the block, its terminator or the mark bit would put this outside any
    // plausible band at once, and the band is wide on purpose: 30.8 ms to 752 ms across these
    // thirteen containers, and nothing here says which of those a device wants.
    let repeating = 0;
    let quiet = 0;
    let fastest = Infinity;
    let slowest = 0;
    for (const name of WITH_INFRARED) {
      const data = load(name);
      if (data === undefined) continue;
      const c = parse(data);
      for (const group of irGroups(c) ?? []) {
        for (const address of group.addresses) {
          const period = irRepeatPeriod(c, address);
          if (period === undefined) {
            quiet += 1;
            // The negative: no second pointer means no repeat block, and the two readers agree.
            assert.equal(irRepeatBlock(c, address), undefined, `${name}: 0x${address.toString(16)}`);
            continue;
          }
          repeating += 1;
          fastest = Math.min(fastest, period);
          slowest = Math.max(slowest, period);
          // The period is the block's own words summed, terminator included, and nothing else.
          const block = irRepeatBlock(c, address) as number;
          const words = irBlockWords(c, block) ?? [];
          assert.equal(period, words.reduce((sum, word) => sum + (word & IR_PULSE_MAX), 0));
          assert.equal(irBlockDuration(c, block), period);
        }
      }
    }
    assert.ok(repeating > 1400, `enough repeating codes, got ${repeating}`);
    assert.ok(quiet > 1800, `and enough that do not repeat, got ${quiet}`);
    assert.ok(fastest > 20_000, `nothing repeats faster than 20 ms, got ${fastest}`);
    assert.ok(slowest < 2_000_000, `and nothing slower than two seconds, got ${slowest}`);
  });

test('the block a key repeats is not the block a tap sends', skipUnless('one_config'), () => {
  // What the finding turns on, stated as the property that would break if slots 0 and 1 were read
  // the other way round: the held block is shorter than the tap block, because a tap sends the
  // opening burst and a hold sends one frame at a time. 205 of the receiver's codes on this remote
  // carry both, and the held one is shorter in every one of them.
  const c = parse(load('one_config') as Uint8Array);
  let pairs = 0;
  for (const group of irGroups(c) ?? []) {
    for (const address of group.addresses) {
      const pointers = irHeaderPointers(c, address);
      const once = pointers[0];
      const held = pointers[IR_BLOCK_HELD];
      if (once === undefined || once === 0 || held === undefined || held === 0) continue;
      const first = irBlockDuration(c, once) as number;
      const repeat = irBlockDuration(c, held) as number;
      assert.ok(repeat < first, `0x${address.toString(16)}: ${repeat} is not under ${first}`);
      pairs += 1;
    }
  }
  assert.ok(pairs >= 200, `enough pairs to mean something, got ${pairs}`);
});
