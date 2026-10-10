/**
 * The frame laid out from nothing, `todo-compile-650.md` 10.1, measured against Logitech's own
 * compiles.
 *
 * **The measurement is a round trip through zeroed fields.** `takeApart` drops the header, the
 * section table, base slots 1 and 3 and the trailer, and zeroes every address field the census in
 * `growth.ts` knows; `layOutContainer` has to put every one of those bytes back from the content
 * alone. So byte equality with the compile says the frame computes them, and a frame that copied
 * anything would have nothing to copy from.
 *
 * **The growth control is what says the addresses are computed rather than reproduced.** A piece of
 * filler is added to one section and the result has to equal, byte for byte, what `relocate.ts`
 * makes of the original with the same filler at the same place. The two get there by different
 * routes: relocate shifts a finished container and rewrites the fields it finds, the frame lays out
 * pieces and writes every field from where its target landed. **They share one input**, the census
 * of address fields in `growth.ts`, so the comparison checks the arithmetic and not the census.
 * Then the result is read the way
 * `test/relocate.test.ts` reads one, every claim shifted and the inventory unchanged, and it has to
 * round trip through the emitter.
 *
 * **What this cannot see** is an address field the census does not know: it would be carried as
 * content and would round trip, and only the semantic half of the growth control would notice, for
 * whatever the readers cover. That is the limit relocate.ts has too, and for the same reason.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Claim, Container, ContainerLayout, ContainerPiece } from '../src/index.ts';
import {
  LayoutError,
  applyEdits,
  claims,
  clockStateEdits,
  inventory,
  layOutContainer,
  parse,
  relocate,
  roundTrip,
  saveEdits,
  slotOf,
  takeApart,
  trailerAgrees,
} from '../src/index.ts';

/**
 * Every Harmony 600, 650 and 700 configuration Logitech compiled that the lab holds once each, the
 * thirteen section 312 names. Region reads of the same content are left out rather than counted
 * twice, which is the same choice `compose.test.ts` makes for `ARCH14_LISTS`.
 */
const ARCH14_COMPILES = [
  'h650_config_region', 'h650_panasonic_config', 'h600_config', 'calibration_h600',
  'h700_config', 'h700_config_2', 'h700_28_config_region',
  'h650_power_hold_compile', 'h650_power_hold_compile_2', 'h700_power_hold_compile',
  'h700_power_hold_compile_2', 'h700_power_hold_compile_3', 'h700_power_hold_compile_4',
] as const;

/** The skin each compile's architecture record states. Two Harmony 600 compiles disagree. */
const SKINS: Readonly<Record<(typeof ARCH14_COMPILES)[number], number>> = {
  h650_config_region: 72, h650_panasonic_config: 72, h600_config: 73, calibration_h600: 71,
  h700_config: 66, h700_config_2: 66, h700_28_config_region: 66,
  h650_power_hold_compile: 72, h650_power_hold_compile_2: 72, h700_power_hold_compile: 66,
  h700_power_hold_compile_2: 66, h700_power_hold_compile_3: 66, h700_power_hold_compile_4: 66,
};

/**
 * What Logitech parks in front of each base slot's table, by owner, on every one of the thirteen.
 * Section 36 found the first row; the others are the same shape, a slot's bodies in front of the
 * slot's own index, except the mode pages' tagged lists, which sit in front of base slot 9's table
 * rather than base slot 6's. Every slot not named here has nothing in front of its table.
 *
 * **Read off the same thirteen it is asserted on**, so it describes Logitech's compiler and predicts
 * nothing about the remote: `OURS_RAN` below parks differently and ran.
 */
const PARKED: Readonly<Record<number, readonly string[]>> = {
  5: ['slot-5-group'],
  7: ['slot-7-glyph', 'slot-7-set'],
  9: ['slot-6-page-list'],
  10: ['slot-10-list'],
  15: ['slot-15-group'],
};

/**
 * Two configurations this project composed and wrote to the Harmony 650, read back off it: the LG
 * television, section 285, and the LG kijken activity, section 291, both of which then worked on the
 * remote. Where they put a composed device's infrared blocks and its activity's lists is not where
 * Logitech parks anything, which is the measurement that the parking is a habit and not a demand.
 */
const OURS_RAN = ['h650_lg_region', 'h650_post144_region'] as const;
const OURS_PARKED: Readonly<Record<(typeof OURS_RAN)[number], Readonly<Record<number, readonly string[]>>>> = {
  h650_lg_region: { ...PARKED, 5: ['slot-5-block', 'slot-5-group', 'slot-5-header'] },
  h650_post144_region: {
    ...PARKED, 5: ['slot-5-block', 'slot-5-group', 'slot-5-header'], 9: ['slot-6-page-list', 'slot-9-list'],
  },
};

const containerOf = (name: string): Container => parse(load(name) as Uint8Array);

function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  if (a.length !== b.length) return Math.min(a.length, b.length);
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return i;
  return undefined;
}

test('every arch 14 compile is laid out again byte for byte from its pieces',
     skipUnless(...ARCH14_COMPILES), () => {
  let raw = 0;
  for (const name of ARCH14_COMPILES) {
    const c = containerOf(name);
    const layout = takeApart(c);
    // The frame's own bytes are not in the layout at all, and the fields inside the pieces are zero,
    // so nothing below can pass by carrying them.
    const pieces = everyPiece(layout);
    for (const piece of pieces) {
      for (const ref of piece.refs) {
        assert.deepEqual([...piece.bytes.subarray(ref.at, ref.at + 3)], [0, 0, 0], `${name}: a field kept its bytes`);
      }
    }
    assert.equal(layout.skin, SKINS[name], `${name}: skin`);
    if (typeof layout.builtAt !== 'string') raw += 1;
    const out = layOutContainer(layout);
    assert.equal(firstDifference(out.bytes, c.blob), undefined, `${name} differs`);
  }
  // None of the thirteen needs its stamp carried as raw field bytes. One did, `h650_panasonic_config`,
  // whose stored day of 0 the reader refused until section 322 found the day counted from 0: it is
  // Thursday 1 October 2026, and laying it out from that time gives Logitech's own bytes back above.
  assert.equal(raw, 0);
  assert.equal(takeApart(containerOf('h650_panasonic_config')).builtAt, '2026-10-01T14:32:27');
});

test('taking apart a configuration read as a Node Buffer leaves its bytes as they were',
     skipUnless('h650_test_config_clean'), () => {
  const file = Buffer.from(load('h650_test_config_clean') as Uint8Array);
  const before = Buffer.from(file);
  const c = parse(file);
  takeApart(c);
  // A Buffer's slice is a view, so a piece cut with it and zeroed wrote into the file: 93796 bytes.
  assert.equal(Buffer.compare(file, before), 0);
  assert.equal(firstDifference(layOutContainer(takeApart(c)).bytes, c.blob), undefined);
});

/**
 * Assert what sits in front of each table of `layout`, by owner kind, against `parked`.
 *
 * A table is one piece in every container measured: `takeApart` would fold a following piece of the
 * same slot into the table, so the one piece assertion is also what says nothing of a slot's own sits
 * directly behind its table on a Logitech compile.
 */
function assertParked(name: string, layout: ContainerLayout,
                      parked: Readonly<Record<number, readonly string[]>>): void {
  layout.sections.forEach((placed, slot) => {
    if (placed === undefined) {
      assert.ok([18, 19].includes(slot), `${name}: base slot ${slot} absent`);
      return;
    }
    const owners = [...new Set(placed.before.map((piece) => piece.owner))].sort();
    assert.deepEqual(owners, [...(parked[slot] ?? [])].sort(), `${name}: in front of base slot ${slot}`);
    if (slot !== 1 && slot !== 3) {
      assert.equal(placed.head.length, 1, `${name}: base slot ${slot}'s table`);
      assert.equal(slotOf(placed.head[0]!.owner), slot, `${name}: base slot ${slot}'s table owner`);
    }
  });
}

test('what Logitech parks in front of a table is the same on all thirteen compiles',
     skipUnless(...ARCH14_COMPILES), () => {
  for (const name of ARCH14_COMPILES) assertParked(name, takeApart(containerOf(name)), PARKED);
});

test('our own configurations park differently, ran on the Harmony 650, and lay out byte for byte',
     skipUnless(...OURS_RAN), () => {
  for (const name of OURS_RAN) {
    const c = containerOf(name);
    const layout = takeApart(c);
    assertParked(name, layout, OURS_PARKED[name]);
    assert.equal(firstDifference(layOutContainer(layout).bytes, c.blob), undefined, `${name} differs`);
  }
});

/**
 * Lay out `layout` with `delta` bytes of filler appended to one place and demand three things: the
 * bytes `relocate` makes of the original, every reader agreeing with the original shifted, and the
 * emitter round trip.
 */
function grownAgrees(c: Container, before: readonly Claim[], layout: ContainerLayout,
                     grow: (filler: ContainerPiece) => void, at: number, delta: number): Container {
  const filler: ContainerPiece = { bytes: new Uint8Array(delta).fill(0xa5), refs: [], owner: 'filler' };
  grow(filler);
  const out = layOutContainer(layout);
  assert.equal(out.offsetOf(filler), at, 'the filler is where relocate puts it');
  const relocated = relocate(c, at, delta, { fill: 0xa5 }).bytes;
  assert.equal(firstDifference(out.bytes, relocated), undefined, 'the frame and relocate disagree');

  const grown = out.container;
  assert.ok(trailerAgrees(grown));
  assert.equal(grown.endAddr, c.endAddr + delta);
  const shifted = (start: number): number => (start >= at ? start + delta : start);
  const was = before.map((one) => `${one.owner}@${shifted(one.start)}+${one.length}`).sort();
  const is = claims(grown).map((one) => `${one.owner}@${one.start}+${one.length}`).sort();
  assert.deepEqual(is, was, 'a reader reads something else');
  assert.equal(JSON.stringify(inventory(grown)), JSON.stringify(inventory(c)), 'the inventory changed');
  assert.ok(roundTrip(grown).equal, 'the result does not round trip through the emitter');
  return grown;
}

test('a section that grows moves every address above it, end_addr and the checksum',
     skipUnless('h650_config_region'), () => {
  const c = containerOf('h650_config_region');
  const before = claims(c);
  const DELTA = 54;

  // Base slot 4 grows: the event map's table gets 54 bytes longer, so base slot 5's groups and every
  // table above move, and base slots 0 to 4 do not.
  const layout = takeApart(c);
  const slot4 = layout.sections[4]!;
  const at = c.blobOffsetOf(c.sections[4]!.address)! + slot4.head[0]!.bytes.length;
  const grown = grownAgrees(c, before, layout, (filler) => slot4.head.push(filler), at, DELTA);
  grown.sections.forEach((section, slot) => {
    const was = c.sections[slot]!.address;
    assert.equal(section.address, slot < 5 || slot >= 18 ? was : was + DELTA, `base slot ${slot}`);
  });

  // And the body grows at its first byte, which moves everything but the key table.
  const again = takeApart(c);
  const floor = c.blobOffsetOf(c.sections[0]!.address)! - again.body.reduce((n, p) => n + p.bytes.length, 0);
  grownAgrees(c, before, again, (filler) => again.body.unshift(filler), floor, DELTA);
});

test('the frame stamps base slot 3 the way a save does, and refuses a clock that disagrees',
     skipUnless('h650_config_region'), () => {
  const c = containerOf('h650_config_region');
  const when = '2026-10-03T12:34:56';

  // Base slot 13's clock is content, stamped here the way edit.ts stamps it; base slot 3 is the
  // frame's. Together they have to give exactly what a save gives.
  const clockOnly = parse(applyEdits(c, clockStateEdits(c, when)).bytes);
  const layout = takeApart(clockOnly);
  layout.builtAt = when;
  const out = layOutContainer(layout);
  assert.equal(firstDifference(out.bytes, saveEdits(c, [], when).bytes), undefined);
  assert.equal(out.container.builtAt, when);

  // The control: the same stamp over the old clock records is refused, naming the first that differs.
  const stale = takeApart(c);
  stale.builtAt = when;
  assert.throws(() => layOutContainer(stale), (error: unknown) =>
    error instanceof LayoutError && /clock record 0 states 42 where the build timestamp states 56/.test(error.message));
});

test('the frame refuses a layout it would get wrong, and an architecture it was not built for',
     skipUnless('h600_config'), () => {
  const c = containerOf('h600_config');
  const fresh = (): ContainerLayout => takeApart(c);

  // Unsupported rather than wrong: arch 12 (Harmony One) has 22 slots and a bank found by search.
  const wrongArch = fresh();
  wrongArch.architecture = 12;
  assert.throws(() => layOutContainer(wrongArch), /only arch 14/);

  const unaligned = fresh();
  unaligned.flashBase = 0x030800;
  assert.throws(() => layOutContainer(unaligned), /4 KiB boundary/);

  // A field running off the end of its piece would write into the next one.
  const overrun = fresh();
  const piece = overrun.body[0]!;
  piece.refs.push({ at: piece.bytes.length - 2, address: 0 });
  assert.throws(() => layOutContainer(overrun), /outside its piece/);

  // Base slot 17 is the bank's two byte bias, and the codec's readers find the bank by its address.
  const longTouch = fresh();
  longTouch.sections[17]!.head.push({ bytes: new Uint8Array(1), refs: [] });
  assert.throws(() => layOutContainer(longTouch), /base slot 17 is the 2 bytes/);

  const twice = fresh();
  twice.body.push(twice.body[0]!);
  assert.throws(() => layOutContainer(twice), /listed twice/);

  // An address naming a piece the layout does not hold, which is a composer forgetting to place it.
  const orphan = fresh();
  const stray: ContainerPiece = { bytes: new Uint8Array(4), refs: [] };
  const holder = orphan.body.find((piece) => piece.refs.some((ref) => 'to' in ref))!;
  const index = holder.refs.findIndex((ref) => 'to' in ref);
  holder.refs[index] = { at: holder.refs[index]!.at, to: stray, offset: 0 };
  assert.throws(() => layOutContainer(orphan), /not in the layout/);

  const nullSlot = fresh();
  nullSlot.sections[18] = { before: [], head: [{ bytes: new Uint8Array(1), refs: [] }] };
  assert.throws(() => layOutContainer(nullSlot), /NULL/);

  const missing = fresh();
  missing.sections[12] = undefined;
  assert.throws(() => layOutContainer(missing), /base slot 12 has no table/);
});

function everyPiece(layout: ContainerLayout): ContainerPiece[] {
  return [layout.keyTable, ...layout.body,
    ...layout.sections.flatMap((placed) => (placed === undefined ? [] : [...placed.before, ...placed.head])),
    ...layout.pictures];
}
