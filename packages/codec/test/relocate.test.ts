/**
 * The check that carries phase 5 of `docs/adding-a-device.md`: insert filler into a real config,
 * relocate, and every reader reports exactly what it reported before.
 *
 * Two halves, and both are needed. The **semantic** half reparses the result and compares what the
 * readers say: every claim the accounting makes, owner for owner and length for length with the
 * starts shifted, and the whole inventory, devices, activities and their drawn names, which pulls
 * the text reading, the touch map and the action list walks into the comparison. The **mechanical**
 * half compares bytes: the diff between a naive shift and the relocation must be exactly the
 * rewritten pointer fields plus the two restamps, and nothing else, which is what stops a
 * relocation that scribbles somewhere a reader never looks.
 *
 * The implied positions need no rewriting and the semantic half is what shows they survive: the
 * picture bank's walk, every mode page's second copy of its tagged list, base slot 5's shared
 * duration blocks and base slot 16's shared digit tables are all claims, so a walk that lost its
 * footing or a shared structure claimed at a stale address changes the claim list and fails the
 * comparison.
 *
 * **The negative is per address class and exact**: switching off the rewrite of any one class has
 * to break the check, and the test names which class it disabled. A class whose omission nothing
 * catches would be a class nothing reads, which is not a pointer census entry but a guess.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Claim, Container } from '../src/index.ts';
import {
  END_MARKER_LENGTH,
  RelocateError,
  TRAILER_CHECKSUM_OFFSET,
  claims,
  inventory,
  parse,
  PICTURE_BANK_BIAS,
  pictureBankStart,
  relocate,
  relocationFloor,
  trailerAgrees,
} from '../src/index.ts';

/** The whole corpus, the same nineteen as every corpus wide claim. */
const SAMPLES = [
  'one_safemode', 'one34_region2', 'h700_gspm', 'h600_safemode_gspm', 'h650_safemode_gspm',
  'one_config', 'one_config_unprogrammed', 'h600_config', 'h700_config', 'h700_config_2',
  'h525_config', 'h525_config_2', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c',
  'arch8_config_d', 'h525_safemode_ahcm', 'one_spare_before_sync', 'one_spare_after_sync',
] as const;

/**
 * The two made configs, outside the corpus by policy since every corpus wide total is computed
 * over `CONTAINERS`, and in this check because only they populate base slot 16: its records and
 * shared digit tables are pointer targets no corpus container states, which is how the census
 * missed them until this test relocated one.
 */
const MADE = ['calibration_favchannels', 'calibration_favzero'] as const;

const DELTA = 54;

/**
 * The offsets worth demonstrating: everything moves, and the cheapest real place.
 *
 * **"Just below the trailer" is only insertable where there is no picture bank**, which the check
 * found rather than a reading and is worth keeping: the bank's extent is implied by its walk
 * landing exactly on the trailer, section 55, so filler between the last picture and the trailer
 * unmakes that closure and every picture claim relabels. On a bank carrying container the top
 * clean insertion point is the bank's own bottom, and appending a picture means extending the
 * bank, not leaving dead bytes above it.
 */
function offsetsOf(c: Container): { name: string; at: number }[] {
  const out = [{ name: 'the first insertable byte', at: relocationFloor(c) }];
  const bank = claims(c)
    .filter((claim) => claim.owner === 'picture-bank')
    .reduce<number | undefined>(
      (low, claim) => (low === undefined ? claim.start : Math.min(low, claim.start)), undefined);
  // Where the bank's start is stated, the insertion goes below the section's own two bias bytes
  // and not at the first picture: the arch 9 safe mode container is where the difference bites,
  // since its first picture sits exactly at stated plus bias, so a cut at the picture leaves the
  // section pointer below the cut and the stated start lands on filler.
  const stated = pictureBankStart(c);
  if (bank !== undefined) {
    out.push({ name: 'the bottom of the picture bank',
               at: stated === undefined ? bank : stated - PICTURE_BANK_BIAS });
  } else {
    out.push({ name: 'just below the trailer', at: c.blob.length - TRAILER_CHECKSUM_OFFSET });
  }
  return out;
}

/**
 * Why `after` does not mean what `before` did, or `undefined` because it does.
 *
 * A reason string rather than an assertion so the negative can run the identical check and demand
 * it fails: a check that exists twice, once to pass and once to fail, is two checks that drift.
 */
function differs(
  before: Container, beforeClaims: readonly Claim[], after: Container, at: number, delta: number,
): string | undefined {
  if (after.blob.length !== before.blob.length + delta) return 'the length is wrong';
  if (after.flashBase !== before.flashBase) return 'the recovered base moved';
  if (!trailerAgrees(after)) return 'the trailer checksum does not verify';
  const shifted = (start: number): number => (start >= at ? start + delta : start);
  // Sorted, because a claim's position in the list is discovery order and discovery order is not
  // meaning: the multiset of (owner, start, length) is what has to be identical.
  const ordered = (list: readonly Claim[], shift: boolean): string[] => list
    .map((one) => `${one.owner}@${shift ? shifted(one.start) : one.start}+${one.length}`)
    .sort();
  const was = ordered(beforeClaims, true);
  const is = ordered(claims(after), false);
  if (was.length !== is.length) return `${was.length} claims became ${is.length}`;
  for (let i = 0; i < was.length; i += 1) {
    if (was[i] !== is[i]) return `claim ${was[i]} became ${is[i]}`;
  }
  const meant = JSON.stringify(inventory(before));
  const means = JSON.stringify(inventory(after));
  if (meant !== means) return 'the inventory changed';
  return undefined;
}

for (const name of [...SAMPLES, ...MADE]) {
  test(`${name} relocates at each offset and every reader reports what it reported`,
       skipUnless(name), () => {
    const before = parse(load(name) as Uint8Array);
    const beforeClaims = claims(before);
    for (const { name: where, at } of offsetsOf(before)) {
      const out = relocate(before, at, DELTA, { fill: 0xa5 });

      // The mechanical half: against a naive shift, exactly the rewritten fields and the two
      // restamps differ. Membership rather than equality for the checksum alone, since a
      // recomputed checksum can coincide with the shifted original's bytes.
      const naive = new Uint8Array(before.blob.length + DELTA);
      naive.set(before.blob.subarray(0, at), 0);
      naive.fill(0xa5, at, at + DELTA);
      naive.set(before.blob.subarray(at), at + DELTA);
      const allowed = new Set<number>([4, 5, 6, 7]);
      for (const field of out.rewritten) {
        for (let k = 0; k < 3; k += 1) allowed.add(field.at + k);
      }
      allowed.add(out.bytes.length - TRAILER_CHECKSUM_OFFSET);
      allowed.add(out.bytes.length - TRAILER_CHECKSUM_OFFSET + 1);
      for (let i = 0; i < out.bytes.length; i += 1) {
        if (out.bytes[i] !== naive[i] && !allowed.has(i)) {
          assert.fail(`${where}: byte ${i} changed and no rewrite or restamp explains it`);
        }
      }

      // The semantic half: the relocated bytes parse, and every reader reports what it reported.
      const after = parse(out.bytes);
      const reason = differs(before, beforeClaims, after, at, DELTA);
      assert.equal(reason, undefined, `${where}: ${reason}`);
    }
  });
}

test('omitting any one address class breaks the check, and the failure names the class',
     skipUnless('one_config'), () => {
  const before = parse(load('one_config') as Uint8Array);
  const beforeClaims = claims(before);
  const at = relocationFloor(before);
  const whole = relocate(before, at, DELTA, { fill: 0xa5 });
  const classes = [...new Set(whole.rewritten.map((one) => one.holder))].sort();
  // The classes a Harmony One config states addresses in, exactly. A class disappearing from this
  // list means a reader stopped stating addresses, which is a format claim and moves in the diff.
  assert.deepEqual(classes, [
    'section-table', 'slot-10-table', 'slot-11-program', 'slot-11-table', 'slot-12-table',
    'slot-13-table', 'slot-14-record', 'slot-14-table', 'slot-15-table', 'slot-17-area',
    'slot-17-page', 'slot-17-table', 'slot-5-group', 'slot-5-header', 'slot-5-table',
    'slot-6-entry', 'slot-6-page', 'slot-6-table', 'slot-7-set', 'slot-7-table', 'slot-9-table',
  ]);
  for (const omitted of classes) {
    const out = relocate(before, at, DELTA, { fill: 0xa5, omitForTest: omitted });
    let reason: string | undefined;
    try {
      reason = differs(before, beforeClaims, parse(out.bytes), at, DELTA);
    } catch (failure) {
      reason = `parse refused: ${(failure as Error).message}`;
    }
    assert.notEqual(reason, undefined,
                    `omitting ${omitted} was not caught, so nothing reads that class`);
  }
});

test('a relocation refuses what the survey cannot vouch for', skipUnless('one_config'), () => {
  const c = parse(load('one_config') as Uint8Array);
  // Growth only: a shrink is not surveyed, and zero is not a relocation.
  assert.throws(() => relocate(c, relocationFloor(c), 0), RelocateError);
  assert.throws(() => relocate(c, relocationFloor(c), -8), RelocateError);
  // Between the marker and the key table, which the corpus check found rather than a reading: the
  // firmware reads the key table at a fixed offset after the marker, section 52, so that gap is
  // wrong for every caller and the floor sits past it.
  assert.throws(() => relocate(c, c.markerOffset + END_MARKER_LENGTH, DELTA), RelocateError);
  // The header and section table are the format's own arithmetic, and the trailer is restamped,
  // so neither side is a place to insert.
  assert.throws(() => relocate(c, 0, DELTA), RelocateError);
  assert.throws(() => relocate(c, c.blob.length, DELTA), RelocateError);
});
