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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { require_, skipWithoutLab } from '@harmony/lab';

import {
  NOMINAL_FLASH_SIZE,
  blocksDiffering,
  failureLine,
  neighbourBlocks,
} from '../src/rehearsal.ts';
import { ARCHITECTURES_WITH_A_WRITE_TARGET } from '../src/rails.ts';

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

test('only a unit the rehearsal may run against has a flash size recorded', () => {
  // **The title said "with a write target" until 6 September 2026 and both halves went stale at
  // once.** Arch 9 (Harmony 525) has a flash size now and has no write target, so the old title
  // named a property this table does not have. What the table actually bounds is the neighbour
  // reads, which happen in the **dry run**, before anything is written and on an architecture that
  // may never be written to at all. A hole is still not a default.
  assert.deepEqual(Object.keys(NOMINAL_FLASH_SIZE).sort(), ['12', '9']);
});

test('the arch 9 part is eight blocks and the config region is the top five of them', () => {
  // Section 267, and concordance's own chip table says the same: `0x800000` to `0x880000`, eight
  // 64 KiB blocks. The two below the configuration are the safe mode image and the application
  // firmware, which is why the rails floor is `0x820000` and not the bottom of the part.
  const size = NOMINAL_FLASH_SIZE[9] as number;
  assert.equal(size, 0x880000);
  assert.equal((size - 0x800000) / 0x10000, 8, 'blocks in the part');
  assert.equal((0x870000 - 0x820000) / 0x10000, 5, 'blocks in the writable region');
});

test('the neighbours of the first rehearsable arch 9 block are the firmware and the next block', () => {
  // The lower neighbour is the **application firmware** at 0x810000, and reading it is the point:
  // if an erase at 0x820000 ever reached downwards, that is the block it would take, and the
  // rehearsal compares both neighbours before and after. The read is harmless and the comparison is
  // the whole control.
  assert.deepEqual(neighbourBlocks(0x820000, 0x10000, NOMINAL_FLASH_SIZE[9] as number),
                   [0x810000, 0x830000]);
  // And the top of the writable region still has a neighbour above it, the log area, so no
  // rehearsable arch 9 block loses a side.
  assert.deepEqual(neighbourBlocks(0x860000, 0x10000, NOMINAL_FLASH_SIZE[9] as number),
                   [0x850000, 0x870000]);
});

test('the arch 9 zero floor is never reached, which is why a size is enough', () => {
  // `neighbourBlocks` treats 0 as the bottom of the part, which is true on arch 12 (Harmony One) and
  // false on arch 9 (Harmony 525), where the part starts at 0x800000. It is never binding because
  // the configuration starts two blocks above the bottom. This asserts the gap rather than the
  // claim, so that an architecture whose region begins at the very bottom of its part fails here
  // instead of silently asking for a block that is not on the chip.
  const base = 0x820000;
  assert.ok(base - 0x10000 >= 0x800000, 'the lower neighbour is still on the part');
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

/**
 * The script's own text, since it cannot be imported: it runs on import and would claim a device.
 * `rails.test.ts` pins the write builder the same way and for the same reason.
 */
function rehearsalScript(): string {
  return readFileSync(fileURLToPath(new URL('../bin/rehearse-block.ts', import.meta.url)), 'utf8');
}

test('the rehearsal names two units and keys them by the architecture off the remote', () => {
  // Danny's decision of 5 September 2026 made the permitted units two, and section 267 gave arch 9
  // (Harmony 525) the three constants a comparison needs. Before that the script had one hardcoded
  // label and one hardcoded dump set.
  const text = rehearsalScript();
  assert.match(text, /const TARGETS: Readonly<Record<number, Target>>/);
  assert.match(text, /9: \{ model: 'the Harmony 525', unitLabel: 'h525'/);
  assert.match(text, /12: \{ model: 'the spare Harmony One', unitLabel: 'one_spare'/);
  // Keyed by what the device says. An argument would let an operator point the Harmony One's allow
  // list at a 525, which is the slip the allow list exists to stop.
  assert.match(text, /const target = TARGETS\[architecture\];/);
  assert.ok(!/--unit/.test(text), 'the unit is read off the remote, never taken as an argument');
});

test('being a rehearsal target is not being a write target', () => {
  // The distinction the whole module rests on, asserted where it can actually fail: the script may
  // now read and compare a Harmony 525, and `--commit` on one is refused inside `writeBlock`.
  assert.ok(!ARCHITECTURES_WITH_A_WRITE_TARGET.includes(9),
            'arch 9 (Harmony 525) is readable by the rehearsal and not writable by it');
  assert.deepEqual([...ARCHITECTURES_WITH_A_WRITE_TARGET], [12]);
  // And the dry run reaches its end without building a permission, which is what makes that true:
  // the write gate sits after the early return.
  const text = rehearsalScript();
  const dryReturn = text.indexOf("dry run: nothing was written");
  const firstWrite = text.indexOf('assertFirstWriteAllowed()');
  assert.ok(dryReturn > 0 && firstWrite > dryReturn,
            'the dry run must return before anything asks for write permission');
});

test('the Harmony 525 has exactly one registered block, so only that address can be rehearsed', () => {
  // **This test asserted the set was empty and it failed on 6 September 2026**, which is what it was
  // for: the entry is added by hand with the filename the region read produced, so adding one is a
  // decision somebody takes rather than a drift. It now pins the other end, that there is one block
  // and therefore one address, because a dump covering one block makes every other block a refusal
  // and that is easy to mistake for a broken script.
  const text = rehearsalScript();
  assert.match(text, /const H525_DUMPS = new Set<string>\(\[\n[\s\S]*?'h525_region_820000',\n\]\);/);
  assert.equal((text.match(/'h525_region_[0-9a-f]+'/g) ?? []).length, 1,
               'one registered block, so one rehearsable address');
  assert.match(text, /none are registered for it yet/,
               'the refusal still has to say what is missing when a set is empty');
});
