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

import { NOMINAL_FLASH_SIZE, failureLine, neighbourBlocks } from '../src/rehearsal.ts';

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
