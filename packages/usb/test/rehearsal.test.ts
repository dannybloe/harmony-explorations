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
import {
  ARCHITECTURES_WITH_A_WRITE_TARGET,
  CONFIG_REGION_BASE,
  ERASE_BLOCK_SIZE,
  WRITABLE_CEILING,
} from '../src/rails.ts';

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
  // Arch 14 (Harmony 650) since section 281, arch 8 (Harmony 885 unit A) since `todo-compile-885.md` 1.2.
  assert.deepEqual(Object.keys(NOMINAL_FLASH_SIZE).sort(), ['12', '14', '8', '9']);
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

test('the rehearsal names five units and keys them by the architecture off the remote', () => {
  // Danny's decision of 5 September 2026 made the permitted units two, and section 267 gave arch 9
  // (Harmony 525) the three constants a comparison needs. Before that the script had one hardcoded
  // label and one hardcoded dump set. **Three since 27 September 2026**, section 281: the Harmony 650
  // is arch 14's. **Five since Danny's decision of 29 September 2026**: the Harmony 600 and the
  // Harmony 700 join it, each with its own unit record and its own dumps, the 700's registered for
  // section 300 and the 600's for section 302. This said "the 600's not yet" until 9 October 2026.
  const text = rehearsalScript();
  assert.match(text, /const TARGETS: Readonly<Record<number, readonly Target\[\]>>/);
  assert.match(text, /9: \[\{ model: 'the Harmony 525', unitLabel: 'h525'/);
  assert.match(text, /12: \[\{ model: 'the spare Harmony One', unitLabel: 'one_spare'/);
  assert.match(text, /\{ model: 'the Harmony 650', unitLabel: 'h650', dumps: H650_DUMPS \}/);
  assert.match(text, /\{ model: 'the Harmony 600', unitLabel: 'h600', dumps: H600_DUMPS \}/);
  assert.match(text, /\{ model: 'the Harmony 700', unitLabel: 'h700', dumps: H700_DUMPS \}/);
  assert.match(text, /const H650_DUMPS = new Set<string>\(\[\s*'h650_region_030000',\s*\]\);/);
  // The 600's is its configuration region read before anything was written to it, and the 700's
  // its configuration region as read on 2.8.
  assert.match(text, /const H600_DUMPS = new Set<string>\(\[\s*'h600_config_region',\s*\]\);/);
  assert.match(text, /const H700_DUMPS = new Set<string>\(\[\s*(\/\/[^\n]*\n\s*)*'h700_28_config_region',\s*\]\);/);
  // Keyed by what the device says, and within an architecture by the dump, which the identity check
  // then holds to: an argument alone would let an operator point one unit's allow list at another.
  assert.match(text, /const targets = TARGETS\[architecture\];/);
  assert.match(text, /const target = targets\.find\(\(one\) => one\.dumps\.has\(dumpName\)\);/);
  assert.ok(!/--unit/.test(text), 'the unit is read off the remote, never taken as an argument');
});

test('the config writer refuses a commit on a firmware build whose drop and restart nobody read', () => {
  // Danny's decision of 29 September 2026 made the Harmony 600 and 700 writable, and the 700 runs
  // another build than the one the 650's drop and restart were read in, section 282. So each unit
  // names the builds read, and a commit on any other is refused. The 700 named none until section
  // 299 read its 2.8.
  const text = readFileSync(fileURLToPath(new URL('../../corpus/bin/write-config.ts', import.meta.url)), 'utf8');
  assert.match(text, /unitLabel: 'one_spare', dumps: SPARE_DUMPS, sequenceReadOn: \['3\.4'\] \}/);
  assert.match(text, /unitLabel: 'h650', dumps: H650_DUMPS, sequenceReadOn: \['0\.2'\] \}/);
  assert.match(text, /unitLabel: 'h600', dumps: H600_DUMPS, sequenceReadOn: \['0\.2'\] \}/);
  assert.match(text, /unitLabel: 'h700', dumps: H700_DUMPS, sequenceReadOn: \['2\.8'\] \}/);
  // What each may be written against starts with the read taken straight after its first block went
  // back unchanged, sections 302 and 300, then the read after its delay write. Every later write appends
  // the read it leaves behind, so the list is asserted from its start and not to its end, which is what
  // this asserted until the 600's empty configuration added the third.
  assert.match(text, /const H600_DUMPS = new Set<string>\(\[\s*(\/\/[^\n]*\n\s*)*'h600_after_rehearsal_region',\s*(\/\/[^\n]*\n\s*)*'h600_kpn45_region',/);
  assert.match(text, /const H700_DUMPS = new Set<string>\(\[\s*(\/\/[^\n]*\n\s*)*'h700_after_rehearsal_region',\s*(\/\/[^\n]*\n\s*)*'h700_delay90_region',/);
  assert.match(text, /if \(commit && !unit\.sequenceReadOn\.includes\(identity\.firmware\)\) \{\s*throw new Refusal/);
  assert.match(text, /const unit = units\.find\(\(one\) => one\.dumps\.has\(dumpName\)\);/);
  // The two bench Harmony 885s since `todo-compile-885.md` 1.4: their write end was read in the 885's
  // application 4.4, `tests/test_harmony_885_write_end.py`, which both units report. Their compare bases
  // start with the region reads `rehearse-block.ts` takes, from the configuration's base to the staging region.
  assert.match(text, /unitLabel: 'h885_a', dumps: H885_A_DUMPS, sequenceReadOn: \['4\.4'\],/);
  assert.match(text, /unitLabel: 'h885_b', dumps: H885_B_DUMPS, sequenceReadOn: \['4\.4'\],/);
  assert.match(text, /const H885_A_DUMPS = new Set<string>\(\[\s*'h885_a_region',\s*'h885_a_region_2',/);
  assert.match(text, /const H885_B_DUMPS = new Set<string>\(\[\s*'h885_b_region',\s*'h885_b_region_2',/);
});

test("the config writer ends an 885's write with the drop and the restart, and sends nothing an 885 must not get", () => {
  // `todo-compile-885.md` 1.4. The Harmony 880 and 885's write end, `reference/architectures/
  // harmony-880-885/usb.md` "How a write ends": `WRITE_MISC` selector 2 before the first erase and the
  // restart `E1 02` after the read back, and of the other Harmonys' eight steps neither selector `0x0A`,
  // which an 885 never answers, nor the update status set to 2, which turns its next restart into an
  // install over the application. `rails.test.ts` holds the library's half, that nothing in it can send
  // them to arch 8; this holds the script's, that it does not ask, since it cannot be imported.
  const text = readFileSync(fileURLToPath(new URL('../../corpus/bin/write-config.ts', import.meta.url)), 'utf8');
  // Code only, so that the comments naming what is left out do not satisfy or defeat the checks.
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // The two commands, each once on the ordinary path, the drop before the first block and the restart
  // after the whole configuration reads back.
  const drop = code.indexOf('await remote.invalidateCachedRegions(permission);\n    } else');
  const firstBlock = code.indexOf('await writeBlock(');
  const readBack = code.lastIndexOf('await containerMatchesTheFile();');
  const restart = code.lastIndexOf('await remote.resetDevice(permission);');
  assert.ok(drop > 0 && firstBlock > drop && readBack > firstBlock && restart > readBack,
    'the drop, then the blocks, then the read back, then the restart');
  // Nothing that writes the update status, data memory, the settings store or the session end, and no
  // request built by hand, on any architecture.
  for (const forbidden of ['requestFirmwareReinstall', 'stageFirmware', 'writeRam', 'writeSettings',
    'endSession', 'encodeRequest', 'writeMiscRequest', 'updateStatusWriteRequest', '0x0a', '0x0A']) {
    assert.ok(!code.includes(forbidden), `write-config.ts calls ${forbidden}`);
  }
  // And on an 885 the drop cannot be left out: the control `--no-invalidate` is the Harmony One's, and on
  // an 885 the drop is what keeps the remote off a block between its erase and its write.
  assert.match(code, /if \(!invalidate && unit\.dropRequired !== undefined\) \{\s*throw new Refusal/);
  assert.equal([...code.matchAll(/dropRequired: ARCH8_DROP_REQUIRED/g)].length, 2, 'both 885s');
});

test("the config writer's code reads an 885's install status before the first erase and before each restart, and refuses on a value other than 0", () => {
  // A check on the script's source, since it cannot be imported: it holds the order and the refusal's
  // presence, and not that the value read off a remote is the right byte, which the first dry run shows.
  // `todo-compile-885.md` 1.4. On the Harmony 880 and 885 the status byte at data `0x100` survives the
  // `RESET` instruction `E1 02` ends in, and the bootloader then installs firmware over the application
  // unless it is 0, `reference/architectures/harmony-880-885/firmware.md` "What the bootloader does at power
  // on". Nothing this package can send to arch 8 sets it, and the script reads it anyway, because being
  // wrong costs the application. Held here on the script's code, since the script cannot be imported.
  const text = readFileSync(fileURLToPath(new URL('../../corpus/bin/write-config.ts', import.meta.url)), 'utf8');
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // A property of the two 885s, not a test of the architecture: both carry the address, nothing else does.
  assert.match(code, /const ARCH8_INSTALL_STATUS = 0x100;/);
  assert.equal([...code.matchAll(/installStatusAt: ARCH8_INSTALL_STATUS/g)].length, 2, 'both 885s');
  assert.equal([...code.matchAll(/installStatusAt:/g)].length, 2, 'and no other unit');
  // The read: two bytes over `READ_MISC` selector 7, the first judged, and anything but 0 refused.
  const helper = code.slice(code.indexOf('const installStatusIsClear'));
  assert.match(helper, /^const installStatusIsClear = async[^\n]*\{\s*const at = unit\.installStatusAt;\s*if \(at === undefined\) return;\s*const status = await remote\.readRam\(at\);\s*const neighbour = await remote\.readRam\(at \+ 1\);/);
  assert.match(helper, /if \(status === 0\) return;\s*throw new Refusal\(/);
  // Before the first erase: after the blocks are compared, before the dry run returns, and so before the
  // drop and the first block of a commit.
  const beforeErase = code.indexOf("await installStatusIsClear('before the first erase');");
  const dryRun = code.indexOf('if (!commit) {');
  const drop = code.indexOf('await remote.invalidateCachedRegions(permission);\n    } else');
  const firstBlock = code.indexOf('await writeBlock(');
  assert.ok(beforeErase > 0 && dryRun > beforeErase && drop > beforeErase && firstBlock > beforeErase,
    'the status is read before anything that changes the remote');
  // Immediately before each restart: nothing awaited between the read and the escape but a journal line.
  const restarts = [...code.matchAll(/await remote\.resetDevice\(permission\);/g)].map((m) => m.index!);
  assert.equal(restarts.length, 2, 'the ordinary restart and --restart-only');
  for (const restart of restarts) {
    const read = code.lastIndexOf("await installStatusIsClear('before the restart');", restart);
    assert.ok(read > 0, 'a status read before the restart');
    const between = code.slice(read, restart);
    assert.equal([...between.matchAll(/await /g)].length, 1, `only the read is awaited before the restart: ${between}`);
  }
  // And the ordinary restart comes after the whole configuration has read back, so a withheld restart
  // leaves a configuration that is written and verified.
  assert.ok(code.lastIndexOf('await containerMatchesTheFile();') < restarts[1]!);
});

test('a dry run asks for no write permission, whether or not the target has one', () => {
  // **This was "being a rehearsal target is not being a write target"<!--superseded--> until 6
  // September 2026**, and it asserted the two lists differing: the script could read and compare a
  // Harmony 525 while `--commit` on one was refused inside `writeBlock`. Danny authorised the
  // demonstration that day, so arch 9 (Harmony 525) is on both lists and the two now coincide.
  //
  // The claim that survives is the one that never depended on the lists, and it is the half that
  // protects an operator: a run without `--commit` reaches its own end before anything asks for
  // write permission, so a dry run on a permitted target is still a read. That is a property of the
  // script's shape and it can fail on any refactor, where the old assertion could only fail on a
  // decision. Arch 14 (Harmony 650) joined both on 27 September 2026, section 281.
  // Arch 8 (Harmony 885 unit A) joined both for `todo-compile-885.md` 1.2.
  assert.deepEqual([...ARCHITECTURES_WITH_A_WRITE_TARGET], [8, 9, 12, 14]);
  const text = rehearsalScript();
  const dryReturn = text.indexOf("dry run: nothing was written");
  const firstWrite = text.indexOf('assertFirstWriteAllowed()');
  assert.ok(dryReturn > 0 && firstWrite > dryReturn,
            'the dry run must return before anything asks for write permission');
});

test("the Harmony 525's registered blocks are its config region and nothing else", () => {
  // **This test has failed twice and both times that was its job**, because every entry in the set
  // is added by hand with the filename a region read produced, so the set growing is a decision
  // somebody took rather than a drift. It asserted the set was empty until 6 September 2026, then
  // that it held one block and therefore one rehearsable address, which is worth pinning because a
  // dump covering one block makes every other block refuse and that reads like a broken script.
  //
  // It is the whole region now, section 270, so the claim moves up a level: the set is exactly the
  // blocks between the architecture's config base and its writable ceiling, each named once. That
  // states the population instead of counting it, so a sixth entry fails here whether it is a block
  // outside the region or the same block twice.
  const text = rehearsalScript();
  // The capture group, not a strip of non-hex characters: `region` is itself four hex digits, so
  // stripping gave a number four hundred thousand times too large and the failure looked like a
  // wrong table. Worth the comment because the wrong version failed rather than passing.
  const named = [...text.matchAll(/'h525_region_([0-9a-f]+)'/g)]
    .map((one) => Number.parseInt(one[1]!, 16));
  const base = CONFIG_REGION_BASE[9] as number;
  const ceiling = WRITABLE_CEILING[9] as number;
  const block = ERASE_BLOCK_SIZE[9] as number;
  const expected: number[] = [];
  for (let at = base; at + block <= ceiling; at += block) expected.push(at);
  assert.deepEqual(named, expected,
    'every block of the arch 9 config region, in order, and no block outside it');
  assert.equal(named.length, 5, "five 64 KiB blocks from 0x820000 to the log area at 0x870000");
  // The refusal's wording still has to work for an architecture whose set is empty, which is the
  // state arch 9 was in for a day and the state any new architecture starts in.
  assert.match(text, /none are registered for it yet/,
               'the refusal still has to say what is missing when a set is empty');
  // And the two blocks that are erased throughout are called out where an operator chooses one,
  // since a rehearsal there cannot distinguish a working write path from one that writes nothing.
  assert.match(text, /cannot be told apart from not writing at all/);
});
