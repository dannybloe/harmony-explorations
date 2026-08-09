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
  irCarrier,
  irGroups,
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
