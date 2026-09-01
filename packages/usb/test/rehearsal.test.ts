/**
 * The rehearsal's own arithmetic and wording, checked with no device present.
 *
 * `bin/rehearse-block.ts` cannot be tested end to end without an irreplaceable remote on the cable,
 * so the parts of it that carry a rule live in `src/rehearsal.ts` and are tested here. What is left
 * in the script is sequencing, which is what a review reads rather than what a test asserts.
 *
 * The subject of the first group is a hazard `rails.ts` names by pointing at that script: the erase
 * block size is Logitech's client's word and a rehearsal that reads back and restores exactly one
 * block would not notice a larger sector.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipWithoutLab } from '@harmony/lab';

import {
  NOMINAL_FLASH_SIZE,
  blocksDiffering,
  failureLine,
  neighbourBlocks,
} from '../src/rehearsal.ts';

const ONE = 12;
const BLOCK = 0x10000;

test('a block in the middle of the chip has a neighbour on each side', () => {
  const flash = NOMINAL_FLASH_SIZE[ONE]!;
  // 0x040000 is the config region base on a Harmony One and the block the rehearsal is written for.
  assert.deepEqual(neighbourBlocks(0x040000, BLOCK, flash), [0x030000, 0x050000]);
  // The one below is outside the config region, deliberately: an erase that reached down into the
  // firmware region is the failure worth detecting most, so the check is not scoped to the region
  // the write is scoped to.
  assert.ok(0x030000 < 0x040000, 'the lower neighbour is below the config region base');
});

test('a block at either edge of the chip loses the neighbour that is not there', () => {
  const flash = NOMINAL_FLASH_SIZE[ONE]!;
  assert.deepEqual(neighbourBlocks(0, BLOCK, flash), [BLOCK],
    'the first block has nothing below it');
  assert.deepEqual(neighbourBlocks(flash - BLOCK, BLOCK, flash), [flash - 2 * BLOCK],
    'the last block has nothing above it');
});

test('a neighbour that would run off the chip is dropped and not clamped', () => {
  // Half a block compared against half a block says nothing about the other half, so a partial
  // neighbour is worse than none: it would report success having looked at less than it claims.
  const flash = 0x30000;
  assert.deepEqual(neighbourBlocks(0x20000, BLOCK, flash), [0x10000],
    'the block above ends exactly at the top, so there is no room for a whole one');
  assert.deepEqual(neighbourBlocks(0x10000, BLOCK, flash), [0, 0x20000]);
});

test('the nominal flash size is not the writable ceiling', () => {
  // 0x3D0000 is where the stored application firmware sits, which is why the rails stop there. The
  // chip does not, and a diagnostic read has no reason to.
  assert.equal(NOMINAL_FLASH_SIZE[ONE], 0x400000);
  assert.ok(NOMINAL_FLASH_SIZE[ONE]! > 0x3d0000, 'the part is larger than anything writable');
});

test('only an architecture with a write target has a flash size recorded', () => {
  // The table exists to bound a read on the unit being written to. A hole is not a default, and an
  // architecture nobody writes to reaching this code at all would be the bug.
  assert.deepEqual(Object.keys(NOMINAL_FLASH_SIZE), [String(ONE)]);
});

test('before the erase a failure says only what failed', () => {
  const line = failureLine('the remote and the dump differ at 0x040010', false);
  assert.equal(line, 'the remote and the dump differ at 0x040010');
  assert.ok(!line.includes('unplug'),
    'telling somebody not to unplug when nothing is at risk teaches them to ignore the line');
});

test('after the erase a failure says what to do next', () => {
  const line = failureLine('the write did not land', true);
  assert.ok(line.startsWith('the write did not land'), 'the failure comes first');
  assert.match(line, /Do not unplug/);
  assert.match(line, /rerun this script with the same arguments/);
  assert.match(line, /restored from the lab dump/,
    'and what the fallback is, since rerunning is not always possible');
});

test('the first write put the block back unchanged, and the whole configuration with it',
  skipWithoutLab(), () => {
  // **Section 222, and it is the only executable form this claim can take.** The write itself was a
  // hardware event on 30 August 2026 and cannot be rerun by a test: what can be checked is its
  // evidence, two reads of the spare Harmony One taken either side of it. If they ever stop being
  // byte identical, either a dump was replaced or the claim was wrong, and both are worth failing on.
  //
  // The block level compare the script performs cannot see damage anywhere else, and `ERASE_FLASH`
  // carries no count, so an erase reaching past its block is exactly the failure a whole file
  // comparison catches and a range comparison cannot. That is why the evidence is whole
  // configurations rather than the 64 KiB that was written.
  const before = require_('one_spare_20260830');
  const after = require_('one_spare_after_first_write');
  assert.equal(after.length, before.length, 'the configuration did not change length');
  assert.equal(before.length, 1665900, 'the spare Harmony One config as read on 30 August 2026');
  assert.deepEqual(after, before, 'the remote after the first write is the remote before it');
});

test('a difference either side of a block boundary is two blocks', () => {
  // The case the arithmetic exists for. A run that straddles a boundary must name both, and a
  // reader that rounded the wrong way would erase one, write it correctly, and leave the other
  // holding the old byte with every per block read back passing.
  const size = 0x100;
  const base = 0x040000;
  const dump = new Uint8Array(4 * size);
  const target = Uint8Array.from(dump);
  target[size - 1] = 1;
  target[size] = 1;
  assert.deepEqual(blocksDiffering(dump, target, base, size), [base, base + size]);
});

test('a block is named once however many bytes in it differ', () => {
  const size = 0x100;
  const dump = new Uint8Array(3 * size);
  const target = Uint8Array.from(dump);
  for (const at of [0, 5, size - 1]) target[at] = 1;
  assert.deepEqual(blocksDiffering(dump, target, 0, size), [0]);
  // And identical images name none, which is the arm that makes "nothing to write" reachable
  // rather than a branch nothing takes.
  assert.deepEqual(blocksDiffering(dump, Uint8Array.from(dump), 0, size), []);
});

test('the two bytes a delay edit moves land in two blocks a megabyte apart', skipWithoutLab(), () => {
  // **The measurement behind "a same length edit costs two erase blocks", section 187**, done on the
  // images rather than on the arithmetic: the delay itself and the trailer checksum, which sits at
  // the far end of the container. Two erases to change one number is the shape a config writer has
  // to be built around, and it is why the dump it compares against has to be a **region**: the
  // checksum's block runs past the end of every container.
  const before = require_('one_spare_20260830');
  const after = require_('one_spare_written_by_us');
  assert.equal(before.length, after.length);
  const blocks = blocksDiffering(before, after, 0x040000, 0x10000);
  assert.deepEqual(blocks, [0x080000, 0x1d0000]);
  assert.equal(blocks[1]! - blocks[0]!, 0x150000, 'and they are 1.3 MiB apart');
});
