/**
 * The write rehearsal: put one erase block of a remote's own configuration back, unchanged, or with
 * named bytes changed.
 *
 * **Two units, since 6 September 2026**, and which one is decided by the architecture read off the
 * remote rather than by an argument: the spare Harmony One and the Harmony 525, per Danny's decision
 * of 5 September. **Both may be written to**, the 525 since Danny authorised its demonstration on 6
 * September. This said "only the first may be written to" and that `--commit` on a 525 "is refused by
 * `writeBlock` because `ARCHITECTURES_WITH_A_WRITE_TARGET` is `[12]`"<!--superseded--> for the few
 * hours in between, which was the state the rehearsal was built for: the read and compare had to
 * happen first anyway, and it did.
 *
 * **What arch 9 does not get with it** is a reset at the end, since nothing has read the Harmony
 * 525's escape dispatcher, and this script sends none: `writeBlock` erases, writes and verifies, and
 * the eight step sequence with its cache drop and its restart lives in `packages/corpus`. Nothing
 * here depends on the remote rebooting, and on arch 9 nothing has to: it has no re-check flag to
 * clear, section 253.
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
import {
  MAX_TRANSFER,
  firstDifference,
  reportCount,
  transfersFor,
  writeBlock,
} from '../src/blockwrite.ts';

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
  // Added 1 September 2026, and it is the first entry here that is **not** the unit's untouched
  // content: it is the read taken after the first write that changed something, section 236, so it
  // is `one_spare_20260830` plus two power on delay operands. It has to be named because the byte
  // compare below is against the dump, and the device no longer matches the row above: without a
  // dump of what the unit actually holds there is no way to write to it again, including no way to
  // put the original bytes back. The script's own refusal says "take a fresh dump" and this is it.
  'one_spare_20260901_delay',
  // And after the second, which is the state the revert starts from.
  'one_spare_20260901_denon',
]);

/**
 * The lab images that are the **Harmony 525's** own configuration region, and it is empty.
 *
 * Deliberately empty rather than absent, so that a run against a 525 refuses with a sentence saying
 * what is missing instead of falling off the end of a table. Two things have to happen before it can
 * hold anything, both needing the remote on the cable and neither writing to it:
 *
 * 1. a **region** read. What the lab has of this unit is its configuration, 51195 bytes, which is
 *    smaller than one 64 KiB erase block, so no block is covered and the compare below has nothing
 *    to compare a whole block against. `packages/corpus/bin/read-region.ts` is what takes one.
 * 2. the read's filename registered in `packages/lab/src/index.ts` and `tests/lab.py`. The name is
 *    timestamped, so it cannot be written here in advance, which is why this was empty rather than
 *    holding a guess.
 *
 * **Both were done on 6 September 2026** and the set holds one entry. What made the region read
 * worth trusting is that its first 51195 bytes are byte for byte identical to the configuration read
 * off the same unit a month earlier, by a different code path, so two independent reads agree; and
 * the 14341 bytes past the configuration are all `0xFF`, erased, which is worth knowing because on
 * the spare Harmony One the equivalent tail holds 408034 bytes of a previous configuration.
 *
 * **The allow list does less here than it does above, and that is worth stating rather than quietly
 * relying on.** Its argument on arch 12 (Harmony One) is that two of them enumerate identically, so
 * naming the programmed unit's dump had to be a refusal. There is one Harmony 525 on the bench, so
 * that specific slip is not available. It stays because the identity check is what identifies the
 * unit, section 226, and this catches the different slip of naming some other 525 era image.
 */
const H525_DUMPS = new Set<string>([
  // One erase block, flash 0x820000 to 0x830000, read on 6 September 2026. It covers exactly one
  // block, so 0x820000 is the only address a 525 rehearsal can name today; another block needs
  // another region read.
  'h525_region_820000',
]);

/** A remote this script may run against, per architecture. */
interface Target {
  /** How to say which remote, in a refusal an operator reads. */
  readonly model: string;
  /** The lab's label for the unit's recorded identity, `../lab/units/<label>.txt`. */
  readonly unitLabel: string;
  /** The dumps `--dump` accepts for it. */
  readonly dumps: ReadonlySet<string>;
}

/**
 * The units this may run against, keyed by the architecture read **off the remote**.
 *
 * **This was one hardcoded unit until 6 September 2026** and the constants were called
 * `SPARE_DUMPS` and `PERMITTED_UNIT_LABEL`, singular, with a docstring saying "one label, because
 * there is one write target". Danny's decision of 5 September made it two, the spare Harmony One and
 * the Harmony 525, and section 267 supplied the three constants arch 9 needs, so the script can now
 * read one and it still cannot write it.
 *
 * **Keyed by architecture rather than taken as an argument**, because the architecture comes off the
 * device and an argument comes off a keyboard. An operator who names the wrong unit gets a refusal
 * from the identity check rather than a wrong comparison, and there is no spelling of the command
 * line that points the Harmony One's allow list at a 525.
 *
 * **Being in this table is still not permission to write**, and that is worth keeping now that both
 * rows happen to have it. This table decides which remotes may be **read** and compared;
 * `ARCHITECTURES_WITH_A_WRITE_TARGET` decides whether anything may be written, and `--commit` goes
 * through `writeBlock` and the rails either way. The two lists coincided on 6 September 2026 and a
 * third remote arriving here would put them back out of step, which is the ordinary case rather than
 * the exception: reading and comparing is the step that has to happen before a write is authorised at
 * all.
 */
const TARGETS: Readonly<Record<number, Target>> = {
  9: { model: 'the Harmony 525', unitLabel: 'h525', dumps: H525_DUMPS },
  12: { model: 'the spare Harmony One', unitLabel: 'one_spare', dumps: SPARE_DUMPS },
};

/** Every dump name any target accepts, for the cheap check before the device is opened. */
const EVERY_DUMP = new Set<string>(
  Object.values(TARGETS).flatMap((t) => [...t.dumps]),
);

/**
 * The recorded identity of a target's unit, or a refusal: with no record there is nothing to
 * compare against.
 *
 * `../lab/units/<label>.txt` holds the identity as hex, which is what `unitIdentityText` produces off
 * a live remote, and the lab is where it lives because a unit identity is that remote's hardware
 * identity and this repository is public. Section 226.
 *
 * **This said "one label, because there is one write target" until 6 September 2026.** There are two
 * permitted units now and the label comes from `TARGETS`, so a missing record refuses for the unit
 * actually on the cable rather than for whichever one was hardcoded.
 */
function permittedUnit(target: Target): Uint8Array {
  const stored = unitIdentity(target.unitLabel);
  if (stored === undefined) {
    throw new Refusal(
      `the lab has no recorded identity for ${target.unitLabel}, so nothing can say whether the `
        + `remote on the cable is ${target.model}. Two Harmony Ones enumerate identically, and a `
        + 'read that identifies nothing is worth less than a refusal. '
        + `Write the unit's identity, as printed by read-identity.ts, to `
        + `${unitIdentityPath(target.unitLabel)}`,
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

  // **Two checks, and they answer different questions.** This one is spelling: is the name a dump
  // any permitted unit accepts. It runs before the device is opened so a typo costs nothing. The
  // one that matters is per unit and cannot happen yet, because which unit this is comes off the
  // remote rather than out of an argument, so it sits below with the architecture.
  if (!EVERY_DUMP.has(dumpName)) {
    fail(`${dumpName} is not a dump of any unit this may run against `
      + `(${[...EVERY_DUMP].join(', ') || 'none are registered'}). Refusing: the byte compare below `
      + 'can only identify content if the dump belongs to a permitted unit, and two Harmony Ones '
      + 'cannot be told apart by enumeration. Nothing here may be written to any other remote.');
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
    const target = TARGETS[architecture];
    if (target === undefined) {
      throw new Refusal(
        `architecture ${architecture} is not a unit this may run against `
          + `(${Object.entries(TARGETS).map(([a, t]) => `${a}: ${t.model}`).join(', ')})`,
      );
    }
    if (!target.dumps.has(dumpName)) {
      throw new Refusal(
        `${dumpName} is not one of ${target.model}'s own dumps `
          + `(${[...target.dumps].join(', ') || 'none are registered for it yet'}). The remote on `
          + `the cable is architecture ${architecture}, so that is the unit whose dumps apply, and `
          + 'comparing it against another unit\'s bytes would say nothing about either.',
      );
    }
    const permitted = permittedUnit(target);
    const identityBlock = await remote.readUnitIdentity();
    assertUnitIsPermitted({ identityBlock, permittedUnit: permitted });
    process.stdout.write(`unit identity ${unitIdentityText(identityBlock).slice(0, 8)}..., which `
      + `matches the recorded ${target.unitLabel}\n`);
    const base = CONFIG_REGION_BASE[architecture];
    const blockSize = ERASE_BLOCK_SIZE[architecture];
    const ceiling = WRITABLE_CEILING[architecture];
    if (base === undefined || blockSize === undefined || ceiling === undefined) {
      // **This said "has no write target" until 6 September 2026** and the condition never meant
      // that: it is the three constants, and arch 9 (Harmony 525) gained all three in section 267
      // while remaining outside `ARCHITECTURES_WITH_A_WRITE_TARGET`. Conflating the two is what the
      // rails call permission against capability, and a message that names the wrong one sends an
      // operator to change the wrong thing.
      throw new Refusal(
        `architecture ${architecture} has no config region, erase block size or ceiling recorded, `
          + 'so there is nothing to read back and compare',
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
    const transfers = transfersFor(block, blockSize);
    const packets = reportCount(transfers);
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

    await writeBlock({
      remote,
      permission,
      block,
      blockSize,
      content: toWrite,
      neighbours,
      readBlock,
      log: (line) => process.stdout.write(`${line}\n`),
      onPastTheErase: (value) => { pastTheErase = value; },
      // The dump is what this run restores from, so a block it covers is one whose content is
      // recoverable, which is the distinction the refusal draws.
      coversBlock: (address) => address >= base && address - base + blockSize <= dump.length,
      sourceName: dumpName,
    });

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
