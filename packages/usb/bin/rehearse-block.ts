/**
 * The write rehearsal: put one erase block of a remote's own configuration back, unchanged.
 *
 *   node packages/usb/bin/rehearse-block.ts --dump one_spare_myharmony --block 0x040000
 *   HARMONY_ENABLE_WRITES=1 HARMONY_FIRST_WRITE=1 node packages/usb/bin/rehearse-block.ts \
 *     --dump one_spare_myharmony --block 0x040000 --commit
 *
 * **Without `--commit` it writes nothing and is worth running on its own.** It reads the block off
 * the remote, compares it with the dump, and prints exactly what a commit would send. That is the
 * half that can be checked before anybody decides to write, and it is also the half that verifies
 * the thing the rails can only take a caller's word for.
 *
 * `docs/adding-a-device.md` phase 8 is the checklist this belongs to and `docs/findings.md` section
 * 175 is the protocol it sends.
 *
 * ## Why one block, and why the remote's own bytes
 *
 * A write that changes nothing is the only first write whose correct outcome is known in advance,
 * and one 64 KiB erase block is a twenty sixth of a Harmony One configuration, so it exercises the
 * erase, the announce, the packets, the acknowledgement and the read back compare at a twenty sixth
 * of the erase cycles. The block count is per configuration, 26 and 21 for the spare's two here, so
 * the fraction is the shape of the saving rather than a constant. If it fails halfway it is
 * repeatable, because the bytes it is putting back are bytes the lab already holds.
 *
 * ## What it verifies rather than asserts
 *
 * `WritePermission.originalDumpVerified` is a boolean the library cannot check for itself, and a
 * caller passing `true` because it feels true is the failure the field exists to prevent. Here it
 * is **measured**, for the range about to be written: the block is read off the device and compared
 * with the dump byte for byte, and a single difference is a refusal. So the claim is not "a dump of
 * this unit exists somewhere" but "the bytes I am about to write are the bytes that are there".
 *
 * That is also what makes the version question moot rather than skipped. The configuration being
 * written is the unit's own, so `INTENDEDVERSION` cannot disagree with the remote: the bytes
 * carrying it are unchanged, and for this range that has been measured rather than assumed.
 *
 * ## The risk, stated plainly
 *
 * Between the erase and a successful write the configuration on the remote is incomplete. If the
 * write fails in a way that also stops it being retried, the unit needs its configuration restored
 * from the dump, which is the route this project has never exercised. Nothing here can remove that
 * risk; it is the risk the gate in the checklist is about.
 */
import { readFileSync } from 'node:fs';

import { imagePath } from '@harmony/lab';

import {
  ERASE_BLOCK_SIZE,
  HarmonyRemote,
  RailError,
  WRITABLE_CEILING,
  architectureFromVersion,
  listHarmony,
  openHarmony,
} from '../src/index.ts';
import { CONFIG_REGION_BASE, assertFirstWriteAllowed } from '../src/rails.ts';
import { writeChunkLengths } from '../src/writes.ts';

/** A single transfer's ceiling: the announce carries a 16 bit count, so 65535 is the hard limit. */
const MAX_TRANSFER = 0x8000;

/**
 * The lab images that are the **spare** Harmony One's own configuration, and the only ones `--dump`
 * accepts.
 *
 * **This closes a hole that the byte compare alone does not.** `WritePermission` asks whether the
 * target is the spare, this script has to answer it, and nothing it can see distinguishes two
 * Harmony Ones: they enumerate identically, and `listHarmony` deliberately drops the serial number
 * so that a serial cannot reach `@harmony/probe`'s publishable report. So with only the
 * **programmed** One attached, the obvious operator slip, `--dump one_config`, would compare it
 * against its own dump, match byte for byte, and erase the unit whose configuration is this
 * project's most used sample.
 *
 * The allow-list narrows which dumps may be named, and that is worth having: naming a programmed
 * unit's dump is a refusal rather than a match, so the obvious operator slip above is caught.
 *
 * **It does not identify the unit, and this docstring said it did until 29 August 2026.** The
 * review of 27 August recorded the correct reading and the script was never swept: the allow list
 * proves **content**, not identity, so another Harmony One whose selected block happened to match
 * the spare's dump would pass as the spare. That no two present lab dumps share a block is a
 * control for today and not a proof, and it is the kind of control that stops holding the moment
 * another unit is dumped. `docs/findings.md` section 188.
 *
 * So `targetIsTheSpareRemote` remains a caller assertion the library cannot check, which is what
 * the review says and what this script must not contradict: the operator is the one identifying
 * the unit, and the allow list only stops one specific way of getting it wrong.
 *
 * A serial check would be stronger and is deliberately not built: it would mean carrying a unit
 * identifier through the enumeration path that the probe reads, and the reason that path has no
 * serial is worth more than this script is. If a serial is ever needed here it gets its own route
 * that the probe cannot see.
 */
const SPARE_DUMPS = new Set([
  'one_spare_myharmony',
  'one_spare_before_sync',
  'one_spare_after_sync',
]);

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/**
 * A refusal raised **after** the device is open.
 *
 * `fail` calls `process.exit`, which skips a `finally`, so using it once the remote is open would
 * leave the handle unclosed. Harmless while the process is exiting, and a latent bug the moment
 * anything here stops exiting, which is the shape this repository has recorded before as an
 * unreachable guard reading as protection. Thrown instead, so the `finally` closes the device and
 * the handler below prints one line.
 */
class Refusal extends Error {}

/**
 * The first index at which two equal length buffers differ.
 *
 * It demands equal lengths rather than returning `Math.min` of the two, which is what it did: both
 * callers immediately index the result to print the differing bytes, so an index one past the end of
 * the shorter buffer was a report that could not be produced. Unreachable, since every buffer here
 * is a whole block, and a non-null assertion at the call site was all that hid it.
 */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  if (a.length !== b.length) {
    throw new Refusal(`comparing ${a.length} bytes with ${b.length}, which is a bug in this script`);
  }
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return i;
  return undefined;
}

async function main(): Promise<void> {
  const dumpName = argument('dump')
    ?? fail("--dump names the lab image holding this unit's config");
  const blockText = argument('block') ?? fail('--block is the 64 KiB aligned flash address');
  const block = Number(blockText);
  if (!Number.isInteger(block) || block < 0) fail(`--block is not an address: ${blockText}`);
  const commit = process.argv.includes('--commit');

  if (!SPARE_DUMPS.has(dumpName)) {
    fail(`${dumpName} is not one of the spare Harmony One's own dumps `
      + `(${[...SPARE_DUMPS].join(', ')}). Refusing: the byte compare below can only identify the `
      + 'unit if the dump belongs to the unit that may be written to, and two Harmony Ones cannot '
      + 'be told apart any other way. Nothing here may be written to any other remote.');
  }
  const path = imagePath(dumpName);
  if (path === undefined) fail(`no lab image called ${dumpName}`);
  const dump = new Uint8Array(readFileSync(path));

  // The remote first, because everything below is stated per architecture and the architecture
  // comes off the device rather than out of an argument.
  const attached = await listHarmony();
  if (attached.length === 0) fail('no remote is attached');
  if (attached.length > 1) {
    // Two Harmony Ones enumerate identically, so nothing here can tell the spare from the
    // programmed one. That distinction is the whole write rail, so this refuses rather than
    // offering a `--path`, which says which port and not which unit: detach the other remote.
    const seen = attached.map((d) => `0x${d.productId.toString(16)} at ${d.path}`).join(', ');
    fail(`${attached.length} remotes are attached (${seen}): attach only the spare, since two `
      + 'Harmony Ones cannot be told apart by enumeration and this writes to one of them');
  }
  const found = attached[0] as { productId: number; path: string | undefined };
  process.stdout.write(`product 0x${found.productId.toString(16)} at ${found.path}\n`);
  const remote = new HarmonyRemote(await openHarmony(
    found.path === undefined
      ? { productId: found.productId }
      : { productId: found.productId, path: found.path },
  ));
  try {
    const version = await remote.getVersion();
    const architecture = architectureFromVersion(version);
    if (architecture === undefined) fail('the remote did not say which architecture it is');
    const base = CONFIG_REGION_BASE[architecture];
    const blockSize = ERASE_BLOCK_SIZE[architecture];
    const ceiling = WRITABLE_CEILING[architecture];
    if (base === undefined || blockSize === undefined || ceiling === undefined) {
      fail(`architecture ${architecture} has no write target, so there is nothing to rehearse`);
    }
    if (block % blockSize !== 0) fail(`0x${block.toString(16)} is not on a block boundary`);
    if (block < base) fail(`0x${block.toString(16)} is below the config region`);
    const offset = block - base;
    if (offset + blockSize > dump.length) {
      fail(`the block runs past the end of ${dumpName}, which is ${dump.length} bytes: pick a `
        + 'block the dump covers, since its bytes are what would be written back');
    }
    const intended = dump.subarray(offset, offset + blockSize);

    // Read the block in transfers the count field can state, and compare with the dump. This is the
    // verification the rails cannot perform, and it happens before anything is sent that changes
    // the device.
    process.stdout.write(`reading 0x${block.toString(16)} to `
      + `0x${(block + blockSize).toString(16)} off the remote\n`);
    const live = new Uint8Array(blockSize);
    for (let done = 0; done < blockSize; done += MAX_TRANSFER) {
      const length = Math.min(MAX_TRANSFER, blockSize - done);
      live.set(await remote.readFlash(block + done, length), done);
    }
    const differs = firstDifference(live, intended);
    if (differs !== undefined) {
      throw new Refusal(`the remote and ${dumpName} differ at 0x${(block + differs).toString(16)}: `
        + `0x${live[differs]!.toString(16)} on the device, 0x${intended[differs]!.toString(16)} in `
        + "the dump. Refusing: the dump is not this unit's current content for this range, so a "
        + 'write here would change the configuration rather than reproduce it. Take a fresh dump.');
    }
    process.stdout.write(`the block matches ${dumpName} byte for byte, so writing it back is a `
      + 'write that changes nothing\n');

    // What a commit would send, printed either way.
    const transfers: { address: number; length: number }[] = [];
    for (let done = 0; done < blockSize; done += MAX_TRANSFER) {
      transfers.push({ address: block + done, length: Math.min(MAX_TRANSFER, blockSize - done) });
    }
    const packets = transfers.reduce((n, t) => n + writeChunkLengths(t.length).length + 2, 0);
    process.stdout.write(`plan: erase 0x${blockSize.toString(16)} bytes at `
      + `0x${block.toString(16)}, then ${transfers.length} transfer(s) of `
      + `${transfers.map((t) => t.length).join(' and ')} bytes, ${packets} reports in total, `
      + 'then read the range back and compare\n');

    if (!commit) {
      process.stdout.write('dry run: nothing was written. Add --commit, with '
        + 'HARMONY_ENABLE_WRITES=1 and HARMONY_FIRST_WRITE=1, to perform it\n');
      return;
    }

    assertFirstWriteAllowed();
    const permission = {
      architecture,
      configLength: dump.length,
      // Measured above, for exactly this range, rather than asserted.
      originalDumpVerified: true,
      // The unit's own configuration, unchanged, so the version bytes are the ones already there.
      intendedVersionMatches: true,
      // Earned by two checks together, not asserted: `--dump` is restricted to the spare's own
      // dumps, and the block on the device matched that dump byte for byte. A configuration is
      // unit specific, so those two together say which unit is on the cable, which enumeration
      // cannot.
      targetIsTheSpareRemote: true,
    };

    process.stdout.write(`erasing 0x${block.toString(16)}\n`);
    await remote.eraseFlash(permission, block);
    const erased = new Uint8Array(blockSize);
    for (let done = 0; done < blockSize; done += MAX_TRANSFER) {
      const length = Math.min(MAX_TRANSFER, blockSize - done);
      erased.set(await remote.readFlash(block + done, length), done);
    }
    const notErased = erased.findIndex((b) => b !== 0xff);
    if (notErased >= 0) {
      throw new Refusal(`the erase left 0x${erased[notErased]!.toString(16)} at `
        + `0x${(block + notErased).toString(16)}, so it did not take. The block is now in an `
        + 'unknown state: rerun to erase and write it again before unplugging.');
    }
    process.stdout.write('erased, and the block reads back as all ones\n');

    for (const transfer of transfers) {
      const from = transfer.address - block;
      process.stdout.write(`writing ${transfer.length} bytes at `
        + `0x${transfer.address.toString(16)}\n`);
      await remote.writeFlash(permission, transfer.address,
        intended.subarray(from, from + transfer.length));
    }

    const back = new Uint8Array(blockSize);
    for (let done = 0; done < blockSize; done += MAX_TRANSFER) {
      const length = Math.min(MAX_TRANSFER, blockSize - done);
      back.set(await remote.readFlash(block + done, length), done);
    }
    const wrong = firstDifference(back, intended);
    if (wrong !== undefined) {
      throw new Refusal(`the read back differs at 0x${(block + wrong).toString(16)}: `
        + `0x${back[wrong]!.toString(16)} on the device, 0x${intended[wrong]!.toString(16)} `
        + 'intended. The write did not land. Do not unplug: rerun, which erases and writes again.');
    }
    process.stdout.write('the block reads back byte for byte identical to the dump. '
      + 'The configuration is unchanged and a write has been performed and verified.\n');
  } finally {
    await remote.close();
  }
}

main().catch((error: unknown) => {
  // A rail refusal is the expected outcome of running this without its doors, and a `Refusal` is
  // this script's own check saying no. Both report as one line rather than a stack: the message is
  // the whole content, and for the post-write ones it tells the operator what to do next.
  if (error instanceof RailError) fail(`refused: ${error.message}`);
  if (error instanceof Refusal) fail(error.message);
  throw error;
});
