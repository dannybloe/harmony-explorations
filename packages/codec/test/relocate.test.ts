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
  screenStrings,
  excise,
  inventory,
  parse,
  PICTURE_BANK_BIAS,
  pictureBankStart,
  pointers,
  rebase,
  relocate,
  relocationFloor,
  setupView,
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

// `excise` is `relocate` run backwards, so the strongest check it can have is that: insert filler,
// cut the same bytes out again, and the container comes back byte for byte, on every sample the
// insertion itself is checked on and at both of its offsets. That holds only if the cut rewrote
// exactly the fields the insertion did, by exactly the same amount, and restamped the same two.
for (const name of [...SAMPLES, ...MADE]) {
  test(`${name} comes back byte for byte when the inserted bytes are cut out again`,
       skipUnless(name), () => {
    const before = parse(load(name) as Uint8Array);
    for (const { name: where, at } of offsetsOf(before)) {
      const grown = parse(relocate(before, at, DELTA, { fill: 0xa5 }).bytes);
      const back = excise(grown, at, DELTA);
      assert.equal(back.bytes.length, before.blob.length, where);
      assert.ok(Buffer.from(back.bytes).equals(Buffer.from(before.blob)), `${where}: the bytes differ`);
    }
  });
}

test('a cut refuses to remove a pointer field or anything a pointer names', skipUnless('one_config'), () => {
  const c = parse(load('one_config') as Uint8Array);
  assert.throws(() => excise(c, relocationFloor(c), 0), RelocateError);
  assert.throws(() => excise(c, 0, DELTA), RelocateError);
  // A cut reaching into the trailer is outside the content, as an insertion there is.
  assert.throws(() => excise(c, c.blob.length - TRAILER_CHECKSUM_OFFSET - 1, 4), /outside the content/);
  // The first insertable byte is where the first structure past the key table begins, which a
  // pointer names, so cutting even one byte there is refused as removing what that pointer names.
  assert.throws(() => excise(c, relocationFloor(c), 1), /names/);
  // And a cut through a pointer field itself: the three address bytes of a text drawn by reference,
  // whose target lies elsewhere, so it is the field check that refuses and not the landing check.
  const borrower = screenStrings(c).find((one) => one.referencedFrom !== undefined && one.at > relocationFloor(c));
  assert.ok(borrower !== undefined, 'one_config draws no text by reference above the floor');
  assert.throws(() => excise(c, borrower.at + 3, 3), /removes the .* field at/);
});

/** Where every census field sits and where it lands, which is what a rebase must leave alone. */
const landings = (c: Container): string[] => pointers(c).map((p) => `${p.holder}@${p.at}>${p.lands}`);

/**
 * The Harmony 300 and 350 configurations, read with concordance, outside the corpus since their
 * family is the file based one; in this check because a rebase is a claim about every container
 * these readers parse, and they carry fields naming flash outside themselves that no corpus
 * container does.
 */
const FILE_FAMILY = [
  'h300_config', 'h300_programmed_config', 'h350_config', 'h350_programmed_config', 'h350_three_devices_config',
] as const;

test('a rebase links every container for another address and back again byte for byte, todo-compile-650 7.1.1',
  skipUnless(...SAMPLES, ...MADE, ...FILE_FAMILY), () => {
    for (const name of [...SAMPLES, ...MADE, ...FILE_FAMILY]) {
      const before = parse(load(name)!);
      const there = rebase(before, before.flashBase + 0x10000);
      const moved = parse(there.bytes);
      // The parse finds the new base by itself, which is the check that the move took.
      assert.equal(moved.flashBase, before.flashBase + 0x10000, name);
      assert.ok(moved.allChecksPass, name);
      // Every field still sits on the same byte and names the same byte.
      assert.deepEqual(landings(moved), landings(before), name);
      // Nothing changed but the rewritten fields, `end_addr` and the checksum.
      const touched = new Set(there.rewritten.flatMap((one) => [one.at, one.at + 1, one.at + 2]));
      for (const k of [4, 5, 6, 7, there.bytes.length - TRAILER_CHECKSUM_OFFSET,
                       there.bytes.length - TRAILER_CHECKSUM_OFFSET + 1]) touched.add(k);
      const stray = [...there.bytes.keys()].filter((k) => there.bytes[k] !== before.blob[k] && !touched.has(k));
      assert.deepEqual(stray, [], name);
      // And back.
      assert.deepEqual(rebase(moved, before.flashBase).bytes, before.blob, name);
    }
  });

test('the 650\'s status screen library linked for the configuration\'s address, and a full 650 compile moved, read the same',
  skipUnless('h650_safemode_gspm', 'h650_test_config_clean'), () => {
    const library = parse(load('h650_safemode_gspm')!);
    assert.equal(library.flashBase, 0x20000);
    const linked = rebase(library, 0x30000);
    // 290 census entries naming 289 fields: one field is named by two kinds of entry.
    assert.equal(linked.rewritten.length, 290);
    assert.equal(new Set(linked.rewritten.map((one) => one.at)).size, 289);
    // The log area names flash outside the container and is left as it was, for the caller.
    assert.deepEqual(linked.outward.map((one) => one.target), [0xe0000, 0x100000]);
    assert.deepEqual(screenStrings(parse(linked.bytes)).map((one) => one.text), screenStrings(library).map((one) => one.text));
    // A configuration with devices and activities reads the same item for item at another address.
    const compile = parse(load('h650_test_config_clean')!);
    assert.deepEqual([...setupView(parse(rebase(compile, 0x40000).bytes))], [...setupView(compile)]);
  });

test('a rebase refuses every Harmony 890 file, none of which passes its own checks',
  skipUnless('h890_config', 'h890_config_2', 'h890_config_2_rescan'), () => {
    for (const name of ['h890_config', 'h890_config_2', 'h890_config_2_rescan']) {
      const c = parse(load(name)!);
      assert.equal(c.allChecksPass, false, name);
      assert.throws(() => rebase(c, c.flashBase + 0x10000), RelocateError, name);
    }
  });

/**
 * What the readers make of a container, with nothing in it that is an address: the section claims by
 * offset, the screen text, and every key's label and the frames it sends. A view's raw record words
 * are left out, since an undecoded infrared record carries a flash address among them.
 */
const reading = (c: Container): string => {
  const refusals: string[] = [];
  const sections = claims(c, true, refusals).map((one) => `${one.owner}:${one.start}+${one.length}`).sort();
  // The status screen library has no activities, and the view says so by throwing; the same message
  // either side is the same reading.
  let view: unknown;
  try {
    view = [...setupView(c)].map(([key, item]) => [key, item.label, item.frames]);
  } catch (error) {
    view = (error as Error).message;
  }
  return JSON.stringify({ sections, refusals, view, text: screenStrings(c).map((one) => one.text) });
};

test('a rebase that leaves out any one kind of field is caught by the census on six containers, and by the readers wherever a reader reads that kind',
  skipUnless('h650_safemode_gspm', 'h525_config', 'calibration_favchannels', 'one_config', 'arch8_config_a', 'h350_programmed_config'), () => {
    // Per container: the kinds no reader here reads, so only the census notices them.
    const unread: Record<string, string[]> = {
      h650_safemode_gspm: [], h525_config: ['slot-11-table', 'slot-14-record'], calibration_favchannels: [],
      one_config: [], arch8_config_a: [], h350_programmed_config: ['raw-10-table', 'raw-6-table', 'raw-8-table'],
    };
    // On the Harmony 350 these two kinds name one and the same field, so leaving one out still moves it.
    const shared: Record<string, string[]> = { h350_programmed_config: ['raw-11-table', 'slot-16-table'] };
    for (const [name, blind] of Object.entries(unread)) {
      const c = parse(load(name)!);
      const to = c.flashBase + 0x10000;
      const whole = rebase(c, to);
      assert.equal(reading(parse(whole.bytes)), reading(c), name);
      const kinds = [...new Set(whole.rewritten.map((one) => one.holder))].sort();
      const census: string[] = [];
      const readers: string[] = [];
      for (const omitted of kinds) {
        const bytes = rebase(c, to, { omitForTest: omitted }).bytes;
        if (bytes.every((b, k) => b === whole.bytes[k])) continue;
        const moved = parse(bytes);
        if (moved.flashBase !== to || !moved.allChecksPass || landings(moved).join() !== landings(c).join()) census.push(omitted);
        if (reading(moved) !== reading(c)) readers.push(omitted);
      }
      const same = shared[name] ?? [];
      const effective = kinds.filter((one) => !same.includes(one));
      assert.deepEqual(census, effective, name);
      assert.deepEqual(effective.filter((one) => !readers.includes(one)), blind, name);
    }
  });
/**
 * The container validator's checks on the Harmony 600, 650 and 700 as their firmware computes them,
 * section 354, written here from the firmware rather than from the codec's parser so the two can
 * disagree. The checksum is always computed, where the firmware computes it only while setting `0x80`'s
 * bit 0 is set, which it is not on the bench 650: `GSPM`
 * at offset 0, `LWJL` at `0x5B`, `PTYY` where the three bytes at offset 4 point, and the word XOR seeded
 * with `0x4321` from the start up to the two bytes before that address, against those two bytes. A
 * region read starts at the configuration's flash address, `0x030000`.
 */
const validatorVerdict = (region: Uint8Array, base = 0x30000): string => {
  const ascii = (at: number): string => String.fromCharCode(...region.subarray(at, at + 4));
  if (ascii(0) !== 'GSPM') return 'GSPM';
  if (ascii(0x5b) !== 'LWJL') return 'LWJL';
  const end = (region[4]! | region[5]! << 8 | region[6]! << 16) - base;
  if (end < 0 || end + 4 > region.length || ascii(end) !== 'PTYY') return 'PTYY';
  let sum = 0x4321;
  for (let k = 0; k + 1 < end - 2; k += 2) sum ^= region[k]! | region[k + 1]! << 8;
  return sum === (region[end - 2]! | region[end - 1]! << 8) ? 'accepted' : 'checksum';
};

test('the 7.1 probe on the Harmony 650 passes the validator\'s three cookies and its checksum, computed as the firmware computes them, section 354',
  skipUnless('h650_7_1_probe', 'h650_7_1_base'), () => {
    const probe = new Uint8Array(load('h650_7_1_probe')!);
    assert.equal(validatorVerdict(probe), 'accepted');
    // The figures section 354 quotes: PTYY at 0x031BC7, and a checksum of 0xB5DB stated and computed.
    assert.equal(probe[4]! | probe[5]! << 8 | probe[6]! << 16, 0x031bc7);
    assert.equal(probe[0x1bc5]! | probe[0x1bc6]! << 8, 0xb5db);
    // The control: the 6.2.13 file the remote ran before the probe, read off it, passes too, and one byte of the probe's end marker
    // changed fails at the third cookie, which is the check section 353 had guessed failed.
    assert.equal(validatorVerdict(load('h650_7_1_base')!), 'accepted');
    const end = (probe[4]! | probe[5]! << 8 | probe[6]! << 16) - 0x30000;
    probe[end + 3] = probe[end + 3]! ^ 0xff;
    assert.equal(validatorVerdict(probe), 'PTYY');
    probe[end + 3] = probe[end + 3]! ^ 0xff;
    probe[0x100] = probe[0x100]! ^ 0x01;
    assert.equal(validatorVerdict(probe), 'checksum');
  });
