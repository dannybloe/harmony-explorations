/**
 * The write rehearsal: put one erase block of a remote's own configuration back, unchanged, or with
 * named bytes changed.
 *
 *   node packages/usb/bin/rehearse-block.ts --dump one_spare_myharmony --block 0x040000
 *   HARMONY_ENABLE_WRITES=1 HARMONY_FIRST_WRITE=1 node packages/usb/bin/rehearse-block.ts \
 *     --dump one_spare_myharmony --block 0x040000 --commit
 *   ... --block 0x080000 --set 0x83bef=100 --commit
 *
 * ## `--set`, and why it belongs here rather than in a second script
 *
 * The rehearsal writes a block back **unchanged**, which is the only first write whose correct
 * outcome is known in advance. A write that changes something needs every rail this file already
 * has: the dump allow list, the unit read off the unit, the block compared with the dump before
 * anything is sent, the neighbours read either side of the erase, and the read back. A second script
 * would be a second copy of all of it, which is the state this repository's oldest rule forbids, so
 * `--set` is one option on this one.
 *
 * `--set <flash address>=<byte>`, repeatable. Each address must be **inside the block being
 * written**, so the option cannot reach past what the erase already covers, and the compare against
 * the dump happens on the **unedited** block, so `originalDumpVerified` still means "the bytes about
 * to be erased are the bytes the lab has". What changes is only what the transfers carry and what
 * the read back is compared against.
 *
 * **It does not compute a checksum and must not.** A container's trailer checksum lives at its very
 * end, which on the spare's configuration is a different erase block from anything worth editing, so
 * a block scoped tool cannot recompute it. `applyEdits` in `packages/codec` is what works out every
 * byte that has to change, including that one; this script is handed the answer and states it back.
 * So a change is two runs of this script, one per block, and between them the configuration on the
 * remote has a stale checksum. That window is deliberate and stated rather than hidden.
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
 * The version question is **stated rather than skipped**, since section 225 turned it from a boolean
 * into a comparison the rail performs. It has nothing to compare here, and that is a property of the
 * input: a container read off a remote carries no XML wrapper, so it states none of the six fields
 * and an absent field matches anything. The script prints how many were compared, so a dry run says
 * zero out loud instead of reading as a pass. What stands in for it is stronger anyway: the bytes
 * about to be written have been compared with the ones on the device.
 *
 * ## The risk, stated plainly
 *
 * Between the erase and a successful write the configuration on the remote is incomplete. If the
 * write fails in a way that also stops it being retried, the unit needs its configuration restored
 * from the dump, which is the route this project has never exercised. Nothing here can remove that
 * risk; it is the risk the gate in the checklist is about.
 */
import { readFileSync } from 'node:fs';

import { imagePath, unitIdentity, unitIdentityPath } from '@harmony/lab';

import {
  ERASE_BLOCK_SIZE,
  HarmonyRemote,
  compareIntendedVersion,
  unitIdentityFromText,
  unitIdentityText,
  type StatedVersion,
  RailError,
  RemoteError,
  WRITABLE_CEILING,
  architectureFromVersion,
  listHarmony,
  openHarmony,
  readVersion,
} from '../src/index.ts';
import { CONFIG_REGION_BASE, assertFirstWriteAllowed, assertUnitIsPermitted } from '../src/rails.ts';
import { NOMINAL_FLASH_SIZE, failureLine, neighbourBlocks } from '../src/rehearsal.ts';
import { writeChunkLengths } from '../src/writes.ts';

/**
 * A single transfer's size.
 *
 * The announce carries a 16 bit count, so 65535 is the hard limit; half of it is used because an
 * erase block is 64 KiB and two equal halves split it exactly, where 65535 would leave a transfer
 * of one byte behind. The constant is the choice and the comment used to state only the limit,
 * which reads as if the limit produced the number.
 */
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
  // Added 30 August 2026, and **its provenance is weaker than the other three's**, which is worth
  // writing beside it rather than in a commit message nobody re-reads. Those were read in sessions
  // whose subject was the spare, either side of a sync. This one was read because the rehearsal
  // refused: the unit on the cable held a configuration no lab dump matched, so the dry run could
  // not proceed, and the fresh read is of **whatever was attached**. Danny stated it was the spare.
  // What was checked mechanically is narrower and is the honest half: it is not the programmed
  // unit's saved configuration, having six devices and 475 codes where that one has five and 328,
  // with a different equipment list. That rules out the slip this list exists for and it is not an
  // identification.
  'one_spare_20260830',
]);

/**
 * The lab's name for the unit this may run against.
 *
 * One label, because there is one write target. `../lab/units/<label>.txt` holds the identity as hex,
 * which is what `unitIdentityText` produces off a live remote, and the lab is where it lives because a
 * unit identity is that remote's hardware identity and this repository is public. Section 226.
 */
const PERMITTED_UNIT_LABEL = 'one_spare';

/** The recorded identity, or a refusal: with no record there is nothing to compare against. */
function permittedUnit(): Uint8Array {
  const stored = unitIdentity(PERMITTED_UNIT_LABEL);
  if (stored === undefined) {
    throw new Refusal(
      `the lab has no recorded identity for ${PERMITTED_UNIT_LABEL}, so nothing can say whether the `
        + 'remote on the cable is the one this may write to. Two Harmony Ones enumerate identically. '
        + `Write the unit's identity, as printed by read-identity.ts, to `
        + `${unitIdentityPath(PERMITTED_UNIT_LABEL)}`,
    );
  }
  return unitIdentityFromText(stored);
}

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

/** Every occurrence of a repeatable option, in the order given. */
function arguments_(name: string): string[] {
  const out: string[] = [];
  process.argv.forEach((one, at) => {
    if (one === `--${name}`) {
      const value = process.argv[at + 1];
      if (value !== undefined) out.push(value);
    }
  });
  return out;
}

/** One `--set <flash address>=<byte>`. */
interface ByteChange {
  address: number;
  value: number;
}

/**
 * Parse the `--set` options, refusing anything that is not a flash address and a byte.
 *
 * Deliberately strict about the shape: a mistyped value that parsed as `NaN` would reach
 * `Uint8Array.set` and land as zero, which is a byte this would then write and verify happily.
 */
function byteChanges(): ByteChange[] {
  return arguments_('set').map((text) => {
    const [left, right] = text.split('=');
    if (left === undefined || right === undefined) {
      fail(`--set wants <flash address>=<byte>, not ${text}`);
    }
    const address = Number(left);
    const value = Number(right);
    if (!Number.isInteger(address) || address < 0) fail(`--set: ${left} is not an address`);
    if (!Number.isInteger(value) || value < 0 || value > 0xff) {
      fail(`--set: ${right} is not a byte`);
    }
    return { address, value };
  });
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
/**
 * True from the moment the erase is sent until the block has been written and verified.
 *
 * Module scope because two things outside `main` need it and both are about the same question: the
 * failure handler, which decides whether to tell the operator not to unplug, and the interrupt
 * handler, which is the only place that can say it at all when somebody presses Ctrl-C.
 */
let pastTheErase = false;

async function main(): Promise<void> {
  process.on('SIGINT', () => {
    // Node's default handling of SIGINT terminates the process without unwinding, so neither the
    // `finally` below nor the failure handler at the bottom of this file would run. An operator who
    // gets impatient during the thousand or so reports a write takes is exactly the person who most
    // needs the sentence about not unplugging, and until this existed they got nothing at all.
    process.stderr.write(`\n${failureLine('interrupted', pastTheErase)}\n`);
    process.exit(130);
  });

  const dumpName = argument('dump')
    ?? fail("--dump names the lab image holding this unit's config");
  const blockText = argument('block') ?? fail('--block is the 64 KiB aligned flash address');
  const block = Number(blockText);
  if (!Number.isInteger(block) || block < 0) fail(`--block is not an address: ${blockText}`);
  const commit = process.argv.includes('--commit');
  const changes = byteChanges();

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
    // Every refusal from here down is thrown rather than `fail`ed, because `fail` calls
    // `process.exit` and skips the `finally` that closes the device. Five of them called `fail`
    // anyway, in the file whose own docstring for `Refusal` says why they must not.
    const versionBytes = await remote.getVersion();
    const architecture = architectureFromVersion(versionBytes);
    if (architecture === undefined) {
      throw new Refusal('the remote did not say which architecture it is');
    }
    // The flash id is printed because it is the cheap confirmation `rails.ts` asks for and nobody
    // has performed: Logitech's client picks its erase block table from the chip's JEDEC
    // manufacturer and device id, so this pair is what says which row applies to this unit. It says
    // nothing about which unit it is, being a property of the part rather than of the remote.
    const identity = readVersion(versionBytes);
    process.stdout.write(`firmware ${identity.firmware}, flash id ${identity.flash}, `
      + `architecture ${architecture}, skin ${identity.skin}\n`);

    // **Which unit this is**, before anything else is decided about it. One read of internal program
    // memory, no write, and the comparison is against what the lab recorded rather than against a
    // boolean. Printed as the first few characters only: the whole value identifies a specific piece
    // of somebody's hardware and belongs in the lab, not in a terminal log that gets pasted about.
    const permitted = permittedUnit();
    const identityBlock = await remote.readUnitIdentity();
    assertUnitIsPermitted({ identityBlock, permittedUnit: permitted });
    process.stdout.write(`unit identity ${unitIdentityText(identityBlock).slice(0, 8)}..., which `
      + `matches the recorded ${PERMITTED_UNIT_LABEL}\n`);
    const base = CONFIG_REGION_BASE[architecture];
    const blockSize = ERASE_BLOCK_SIZE[architecture];
    const ceiling = WRITABLE_CEILING[architecture];
    if (base === undefined || blockSize === undefined || ceiling === undefined) {
      throw new Refusal(
        `architecture ${architecture} has no write target, so there is nothing to rehearse`,
      );
    }
    if (block % blockSize !== 0) {
      throw new Refusal(`0x${block.toString(16)} is not on a block boundary`);
    }
    if (block < base) throw new Refusal(`0x${block.toString(16)} is below the config region`);
    const offset = block - base;
    if (offset + blockSize > dump.length) {
      throw new Refusal(`the block runs past the end of ${dumpName}, which is ${dump.length} `
        + 'bytes: pick a block the dump covers, since its bytes are what would be written back');
    }
    const intended = dump.subarray(offset, offset + blockSize);

    /**
     * What the configuration being written states about the remote it is for: nothing, here.
     *
     * A container read off a remote has no XML wrapper, so there are no six fields to compare, and
     * `compareIntendedVersion` reports that as `compared: 0` rather than as a match. Parsing a
     * wrapper is `packages/codec`'s job and this package deliberately does not depend on it, so the
     * gate's first real use is the write that installs a config **we** produced, which composes both
     * packages in `packages/corpus`. Printed either way, so a dry run shows what the gate did rather
     * than leaving the operator to assume it did something. Section 225.
     */
    const statedVersion: StatedVersion = {};
    const comparison = compareIntendedVersion(statedVersion, identity);
    process.stdout.write(`compatibility: ${comparison.compared} of `
      + `${comparison.fields.length} fields stated by the config`
      + (comparison.compared === 0
        ? ', so there is nothing to compare: a container read off a remote carries no wrapper\n'
        : `, ${comparison.mismatched.length} disagreeing\n`));

    /** One erase block, read in transfers the announce's count field can state. */
    const readBlock = async (address: number): Promise<Uint8Array> => {
      const out = new Uint8Array(blockSize);
      for (let done = 0; done < blockSize; done += MAX_TRANSFER) {
        const length = Math.min(MAX_TRANSFER, blockSize - done);
        out.set(await remote.readFlash(address + done, length), done);
      }
      return out;
    };

    // Read the block and compare with the dump. This is the verification the rails cannot perform,
    // and it happens before anything is sent that changes the device.
    process.stdout.write(`reading 0x${block.toString(16)} to `
      + `0x${(block + blockSize).toString(16)} off the remote\n`);
    const live = await readBlock(block);
    const differs = firstDifference(live, intended);
    // Carried as the measurement rather than restated as `true` below. The refusal on the next line
    // makes the two equivalent today, and a literal in the permission is a claim that stops being
    // checked the moment somebody moves the compare.
    const dumpMatchesTheDevice = differs === undefined;
    if (differs !== undefined) {
      throw new Refusal(`the remote and ${dumpName} differ at 0x${(block + differs).toString(16)}: `
        + `0x${live[differs]!.toString(16)} on the device, 0x${intended[differs]!.toString(16)} in `
        + "the dump. Refusing: the dump is not this unit's current content for this range, so a "
        + 'write here would change the configuration rather than reproduce it. Take a fresh dump.');
    }
    process.stdout.write(`the block matches ${dumpName} byte for byte, so writing it back is a `
      + 'write that changes nothing\n');

    /**
     * What the transfers will carry: the dump's own bytes, with any `--set` applied.
     *
     * A copy rather than the `subarray` view, because that view aliases `dump` and mutating it would
     * quietly change the thing the compare above just verified against. With no `--set` this is the
     * same bytes and the run is the unchanged rehearsal exactly as before.
     *
     * Every change is checked to be inside this block. `--set` cannot reach a byte the erase does
     * not already cover, so it widens what a run writes and not where it writes.
     */
    const toWrite = Uint8Array.from(intended);
    for (const change of changes) {
      if (change.address < block || change.address >= block + blockSize) {
        throw new Refusal(`--set 0x${change.address.toString(16)} is outside the block `
          + `0x${block.toString(16)} to 0x${(block + blockSize).toString(16)}, which is the only `
          + 'range this run erases. Give it its own run.');
      }
      const at = change.address - block;
      const was = toWrite[at] as number;
      toWrite[at] = change.value;
      process.stdout.write(`--set 0x${change.address.toString(16)}: ${was} -> ${change.value}`
        + `${was === change.value ? ', which is already its value' : ''}\n`);
    }
    const differing = firstDifference(toWrite, intended);
    process.stdout.write(differing === undefined
      ? 'nothing is changed, so this is a write whose correct outcome is the current content\n'
      : `${changes.length} byte(s) changed, first at 0x${(block + differing).toString(16)}: this `
        + "write CHANGES the remote's configuration\n");

    // The blocks either side, which are what measure the erase span rather than assuming it. See
    // `neighbourBlocks`: the size of an erase is the flash chip's business and this project has it
    // on Logitech's client's word alone.
    const flashSize = NOMINAL_FLASH_SIZE[architecture];
    const neighbours = flashSize === undefined
      ? []
      : neighbourBlocks(block, blockSize, flashSize);
    const named = neighbours.map((n) => `0x${n.toString(16)}`).join(' and ');
    process.stdout.write(neighbours.length === 2
      ? `the erase span will be checked against the neighbouring blocks ${named}\n`
      : `only ${neighbours.length} neighbouring block(s) can be checked${named ? `, ${named}` : ''}: `
        + 'a block at the edge of the chip has one side that cannot be compared\n');

    // What a commit would send, printed either way.
    const transfers: { address: number; length: number }[] = [];
    for (let done = 0; done < blockSize; done += MAX_TRANSFER) {
      transfers.push({ address: block + done, length: Math.min(MAX_TRANSFER, blockSize - done) });
    }
    const packets = transfers.reduce((n, t) => n + writeChunkLengths(t.length).length + 2, 0);
    process.stdout.write(`plan: read the neighbours, erase 0x${blockSize.toString(16)} bytes at `
      + `0x${block.toString(16)}, check the neighbours again, then ${transfers.length} transfer(s) `
      + `of ${transfers.map((t) => t.length).join(' and ')} bytes, ${packets} reports in total, `
      + 'then read the range back and compare\n');

    if (!commit) {
      process.stdout.write('dry run: nothing was written. Add --commit, with '
        + 'HARMONY_ENABLE_WRITES=1 and HARMONY_FIRST_WRITE=1, to perform it\n');
      return;
    }

    assertFirstWriteAllowed();
    if (neighbours.length === 0) {
      throw new Refusal('no neighbouring block can be read, so nothing would measure how far the '
        + 'erase reached, and how far it reaches is the one thing about it this project has never '
        + 'confirmed. Refusing to erase.');
    }
    const permission = {
      architecture,
      configLength: dump.length,
      // Measured above, for exactly this range, rather than asserted.
      originalDumpVerified: dumpMatchesTheDevice,
      // **The compatibility gate's inputs, section 225, and here it has nothing to compare.** A
      // container read off a remote carries no XML wrapper, so it states none of the six fields, and
      // the format's own rule is that an absent field matches anything. That is the truth about this
      // input rather than a pass, which is why the line above this printed how many fields were
      // compared: for the rehearsal it is zero, and what stands in for it is far stronger, the block
      // on the device having been compared with the dump byte for byte. A config **we** produced
      // will carry a wrapper and this is where the gate starts doing work.
      intendedVersion: statedVersion,
      versionBlock: versionBytes,
      // **Read off the unit rather than asserted, section 226.** This was `targetIsTheSpareRemote:
      // true` with a paragraph arguing that the dump allow list plus a byte compare together say
      // which unit is on the cable. They do not: they prove content, which the review of 27 August
      // recorded and this script then restated for three days. The unit's own identity block says
      // it, and the lab holds what the permitted one is.
      identityBlock,
      permittedUnit: permitted,
    };

    const before = new Map<number, Uint8Array>();
    for (const neighbour of neighbours) {
      process.stdout.write(`reading neighbour 0x${neighbour.toString(16)} as a baseline\n`);
      before.set(neighbour, await readBlock(neighbour));
    }

    process.stdout.write(`erasing 0x${block.toString(16)}\n`);
    // Set before the command goes out, not after it comes back: an erase that fails halfway is
    // still an erase that happened, and this flag decides what the operator is told.
    pastTheErase = true;
    await remote.eraseFlash(permission, block);
    const erased = await readBlock(block);
    const notErased = erased.findIndex((b) => b !== 0xff);
    if (notErased >= 0) {
      throw new Refusal(`the erase left 0x${erased[notErased]!.toString(16)} at `
        + `0x${(block + notErased).toString(16)}, so it did not take. The block is in an unknown `
        + 'state.');
    }
    process.stdout.write('erased, and the block reads back as all ones\n');

    for (const neighbour of neighbours) {
      const was = before.get(neighbour);
      if (was === undefined) {
        throw new Refusal(`no baseline for 0x${neighbour.toString(16)}, which is a bug here`);
      }
      const moved = firstDifference(await readBlock(neighbour), was);
      if (moved !== undefined) {
        const at = neighbour + moved;
        const covered = neighbour >= base && neighbour - base + blockSize <= dump.length;
        throw new Refusal(`the erase changed 0x${at.toString(16)}, which is in the neighbouring `
          + `block 0x${neighbour.toString(16)} and outside the block it was told to erase. So the `
          + `erase sector on this chip is larger than the 0x${blockSize.toString(16)} bytes this `
          + "project has assumed, which was Logitech's client's word and has never been measured. "
          + (covered
            ? `${dumpName} covers that block, so its content is recoverable, but not by this `
              + 'script: it restores one block and this needs a plan for two.'
            : 'The lab dump does not cover that block, so what was there is not recoverable from '
              + 'it. Stop and read docs/adding-a-device.md phase 8 before touching this unit '
              + 'again.'));
      }
    }
    if (neighbours.length === 2) {
      process.stdout.write('the erase stayed inside its own block, measured on both sides\n');
    }

    for (const transfer of transfers) {
      const from = transfer.address - block;
      process.stdout.write(`writing ${transfer.length} bytes at `
        + `0x${transfer.address.toString(16)}\n`);
      await remote.writeFlash(permission, transfer.address,
        toWrite.subarray(from, from + transfer.length));
    }

    const back = await readBlock(block);
    const wrong = firstDifference(back, toWrite);
    if (wrong !== undefined) {
      throw new Refusal(`the read back differs at 0x${(block + wrong).toString(16)}: `
        + `0x${back[wrong]!.toString(16)} on the device, 0x${toWrite[wrong]!.toString(16)} `
        + 'intended. The write did not land.');
    }

    // Only the block above, and only after the write: a write's address is announced and the
    // remote advances its own pointer from there, so the sole direction it could run past its
    // range is upwards. The erase is the operation with no count at all and it is checked on both
    // sides above.
    const above = neighbours.find((n) => n > block);
    const wasAbove = above === undefined ? undefined : before.get(above);
    if (above !== undefined && wasAbove !== undefined) {
      const spilled = firstDifference(await readBlock(above), wasAbove);
      if (spilled !== undefined) {
        throw new Refusal(`the write changed 0x${(above + spilled).toString(16)}, past the end of `
          + 'the range it announced. The block it was asked to write is correct, and something '
          + 'above it is not.');
      }
    }

    pastTheErase = false;
    // **The line has to say which of the two runs this was**, and it did not: it read "identical to
    // the dump. The configuration is unchanged" after a run that had just changed two bytes, because
    // it was written when `--set` did not exist. The compare above was correct throughout; the
    // sentence reporting it was false, which is the worse of the two failures to have.
    process.stdout.write(differing === undefined
      ? 'the block reads back byte for byte identical to the dump. The configuration is unchanged '
        + 'and a write has been performed and verified.\n'
      : `the block reads back byte for byte identical to the dump with the ${changes.length} `
        + 'changed byte(s) in it, so the write landed and nothing else in the block moved. The '
        + "remote's configuration has been changed.\n");
  } finally {
    // A failure to close must not replace the message above it. The operator is being told whether
    // the remote is mid write, and losing that sentence to "the device did not close" is the one
    // substitution here that costs something.
    try {
      await remote.close();
    } catch (error: unknown) {
      process.stderr.write(`(the device did not close cleanly: ${String(error)})\n`);
    }
  }
}

main().catch((error: unknown) => {
  // A rail refusal is the expected outcome of running this without its doors, and a `Refusal` is
  // this script's own check saying no. `RemoteError` is the third and was missing: it is what
  // `writeFlash` throws when a write is never acknowledged, whose own text says what reached the
  // device is unknown, so the one class that arrives with the block in an unknown state was the one
  // class printed as an unhandled rejection with a stack. All three report as one line, and
  // `failureLine` adds what to do next when the erase has already gone out.
  if (error instanceof RailError) fail(failureLine(`refused: ${error.message}`, pastTheErase));
  if (error instanceof Refusal) fail(failureLine(error.message, pastTheErase));
  if (error instanceof RemoteError) fail(failureLine(`the remote: ${error.message}`, pastTheErase));
  throw error;
});
