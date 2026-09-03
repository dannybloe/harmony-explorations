/**
 * Put a configuration **we produced** onto the spare Harmony One, and verify it came back.
 *
 *   node packages/corpus/bin/write-config.ts --config <file> --dump one_spare_20260901_region
 *   HARMONY_ENABLE_WRITES=1 HARMONY_FIRST_WRITE=1 ... --commit
 *   ... --commit --no-restart      section 247's control: every step but the last
 *
 * **This is the step `rehearse-block.ts` was the rehearsal for.** That script writes a unit's own
 * dump back, so its correct outcome is known in advance and a difference is a failure. This one
 * writes bytes that have never been on a remote, which is the whole difficulty: what makes it safe
 * is that every block it touches is compared against known good content first, so a failure halfway
 * leaves something to restore from.
 *
 * The two share `writeBlock`, one copy of the erase and write sequence, because two copies of it
 * would be two copies until one of them moved. What this adds is which blocks, and what goes in
 * them.
 *
 * **It writes only the blocks that differ.** A container is over a megabyte and a same length edit
 * changes a handful of bytes, so writing all of it would be twenty six erase cycles to change two.
 * A one byte edit lands in two blocks rather than one, since the trailer checksum moves with it and
 * lives at the far end, `docs/findings.md` section 187.
 *
 * **The dump must be a region and not a container**, which is why `read-region.ts` exists. A
 * container stops at its declared end, part way through the block the checksum sits in, and this
 * refuses a block its dump does not cover: the bytes past the container's end are still bytes the
 * erase destroys and the write has to put back.
 *
 * Read only without `--commit`, and `--commit` needs both doors, `HARMONY_ENABLE_WRITES=1` and
 * `HARMONY_FIRST_WRITE=1`. Every rail `rehearse-block.ts` passes is passed here too: the unit is
 * identified off its own identity block, the architecture comes off the device, and the erase is
 * measured against both neighbours.
 */
import { appendFileSync, readFileSync } from 'node:fs';

import { imagePath, unitIdentity, unitIdentityPath } from '@harmony/lab';
import {
  ERASE_BLOCK_SIZE,
  HarmonyRemote,
  RailError,
  RemoteError,
  WRITABLE_CEILING,
  architectureFromVersion,
  compareIntendedVersion,
  listHarmony,
  openHarmony,
  readVersion,
  unitIdentityFromText,
  unitIdentityText,
  type StatedVersion,
} from '@harmony/usb';
import {
  CONFIG_REGION_BASE,
  MAX_TRANSFER,
  NOMINAL_FLASH_SIZE,
  assertFirstWriteAllowed,
  assertUnitIsPermitted,
  blocksDiffering,
  failureLine,
  firstDifference,
  neighbourBlocks,
  reportCount,
  transfersFor,
  writeBlock,
} from '@harmony/usb/write';
import {
  ACTION_QUEUE_INSTRUCTIONS, QueueError, assertQueueFits, parse, trailerChecksum, worstQueueRun,
} from '@harmony/codec';
import { profileFor, readConfig } from '../src/index.ts';

/**
 * The lab images this may be written against, which are the spare Harmony One's own reads.
 *
 * The same allow list `rehearse-block.ts` carries and for the same reason, which is worth stating
 * rather than cross referencing: nothing this script can see distinguishes two Harmony Ones, so
 * naming a **programmed** unit's dump would compare it against its own content, match, and erase the
 * remote this project must never write to. The list narrows which slip is possible; the unit itself
 * is identified by `assertUnitIsPermitted` from its identity block, section 226.
 *
 * Only region reads are here, unlike that script's list. A container stops part way through its last
 * block and this needs whole blocks.
 */
const SPARE_DUMPS = new Set([
  'one_spare_20260901_region',
  // The state after the first config this codec wrote, so the revert has something to compare
  // against. Every write adds one of these, which section 237 records as the open wart.
  'one_spare_written_region',
  // After the first write that added a device, section 242, for the second one.
  'one_spare_plus_lg_region',
  // Mid write: 24 blocks of the second candidate and one erased, section 242.
  'one_spare_mixed_region',
  // And that state finished, the compare base for the first write to use the whole eight step
  // sequence, section 246.
  'one_spare_plus_lg2_region',
  // And after that write, section 247, which is the compare base for whatever comes next.
  'one_spare_denon65_region',
  // And after the revert, section 248. Identical to `one_spare_plus_lg2_region`, so either name
  // is a valid compare base for whatever comes next.
  'one_spare_reverted_region',
]);

/** The lab's name for the unit this may run against. One label, because there is one write target. */
const PERMITTED_UNIT_LABEL = 'one_spare';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/**
 * Every line this prints, appended to a file as it is printed.
 *
 * **Because a killed run's account of itself was lost, and that is worse than the kill**, section
 * 243: on 3 September 2026 a write was killed on a log that had stopped moving, and the flash
 * afterwards held 22 blocks the log did not mention. The remote cannot erase its own configuration
 * region, section 243, so those blocks were this script's own work and nothing recorded it.
 * `appendFileSync` is the whole point: the line reaches the file before the next one is composed, so
 * a `SIGTERM` cannot take away the record of what has already been sent to the flash. One file per
 * run, beside the config, and a journal that cannot be opened is a refusal rather than a warning,
 * because a write whose account can be lost is the state this exists to end.
 */
let journalPath: string | undefined;
/** Whether the restart has gone out, which is what makes a failing close expected. */
let resetSent = false;

function say(line: string): void {
  process.stdout.write(line);
  if (journalPath !== undefined) appendFileSync(journalPath, line);
}

/** A refusal raised after the device is open, so the `finally` still closes it. */
class Refusal extends Error {}

/** True from the moment the first erase is sent until the last block has been verified. */
let pastTheErase = false;

async function main(): Promise<void> {
  process.on('SIGINT', () => {
    process.stderr.write(`\n${failureLine('interrupted', pastTheErase)}\n`);
    process.exit(130);
  });

  const configPath = argument('config') ?? fail('--config is the container to put on the remote');
  journalPath = `${configPath}.write-${new Date().toISOString().replace(/[:.]/g, '')}.log`;
  appendFileSync(journalPath, `# ${process.argv.slice(1).join(' ')}\n`);
  const dumpName = argument('dump')
    ?? fail("--dump names the lab region read holding this unit's current content");
  const commit = process.argv.includes('--commit');
  // **The control for section 247, and it exists because that write proved two things at once.**
  // The invalidate and the restart went in together, so the screen coming back clean could have
  // been either. This omits the restart and nothing else, which makes the next run the
  // experiment that separates them: a clean screen afterwards means the invalidate is the fix.
  // It only ever **skips** a command, so it needs no rail of its own.
  const restart = !process.argv.includes('--no-restart');

  if (!SPARE_DUMPS.has(dumpName)) {
    fail(`${dumpName} is not one of the spare Harmony One's own region reads `
      + `(${[...SPARE_DUMPS].join(', ')}). Refusing: the byte compare below can only identify the `
      + 'unit if the dump belongs to the unit that may be written to.');
  }
  const dumpPath = imagePath(dumpName);
  if (dumpPath === undefined) fail(`no lab image called ${dumpName}`);
  const dump = new Uint8Array(readFileSync(dumpPath));
  const wanted = new Uint8Array(readFileSync(configPath));

  // **The one check the remote itself makes, performed before anything is erased.** A container
  // whose trailer disagrees with its bytes is one the boot validator refuses, and the failure would
  // be discovered with the configuration already half replaced. `applyEdits` stamps this, so a file
  // that came out of the codec passes; a file that was truncated in transit does not.
  const container = parse(wanted);
  const computed = trailerChecksum(wanted);
  if (container.trailerChecksum !== computed) {
    fail(`${configPath} states checksum 0x${container.trailerChecksum.toString(16)} and its bytes `
      + `give 0x${computed.toString(16)}: it is damaged, and the remote would refuse to boot it`);
  }
  say(`${configPath}: ${wanted.length} bytes, trailer checksum `
    + `0x${computed.toString(16)}, which recomputes\n`);

  // **A check the remote does not make, which is exactly why it is here.** An action list is
  // spooled into a ring of forty instructions and every push into a full ring is discarded without
  // a word, so a config that asks for more runs and quietly does less than it says. Section 238.
  try {
    assertQueueFits(container);
  } catch (error) {
    if (!(error instanceof QueueError)) throw error;
    fail(`${configPath} overflows the remote's action queue: ${error.message}. The remote would `
      + 'accept it and silently drop instructions, so it is refused here');
  }
  const worst = worstQueueRun(container);
  if (worst !== undefined) {
    say(`deepest action list: ${worst.peak} of ${ACTION_QUEUE_INSTRUCTIONS} queue `
      + `slots, at list ${worst.list}\n`);
  }

  if (wanted.length > dump.length) {
    fail(`the config is ${wanted.length} bytes and ${dumpName} covers ${dump.length}: the dump has `
      + 'to reach at least as far as the config, since the blocks past its end are still erased');
  }

  const attached = await listHarmony();
  if (attached.length === 0) fail('no remote is attached');
  if (attached.length > 1) {
    fail(`${attached.length} remotes are attached; this writes, so it refuses to guess`);
  }
  const productId = (attached[0] as { productId: number }).productId;

  const remote = new HarmonyRemote(await openHarmony({ productId }));
  try {
    // A previous session that died mid read leaves the remote streaming, and the first question
    // asked here would be answered with its leftovers. Section 242, the second device write.
    await remote.drainLeftovers();
    const versionBytes = await remote.getVersion();
    const architecture = architectureFromVersion(versionBytes);
    if (architecture === undefined) {
      throw new Refusal('the remote did not say which architecture it is');
    }
    const identity = readVersion(versionBytes);
    say(`firmware ${identity.firmware}, flash id ${identity.flash}, `
      + `architecture ${architecture}, skin ${identity.skin}\n`);

    const stored = unitIdentity(PERMITTED_UNIT_LABEL);
    if (stored === undefined) {
      throw new Refusal(`the lab has no recorded identity for ${PERMITTED_UNIT_LABEL}, so nothing `
        + 'can say whether the remote on the cable is the one this may write to. Two Harmony Ones '
        + `enumerate identically. Write it to ${unitIdentityPath(PERMITTED_UNIT_LABEL)}`);
    }
    const permitted = unitIdentityFromText(stored);
    const identityBlock = await remote.readUnitIdentity();
    assertUnitIsPermitted({ identityBlock, permittedUnit: permitted });
    say(`unit identity ${unitIdentityText(identityBlock).slice(0, 8)}..., which `
      + `matches the recorded ${PERMITTED_UNIT_LABEL}\n`);

    const base = CONFIG_REGION_BASE[architecture];
    const blockSize = ERASE_BLOCK_SIZE[architecture];
    const ceiling = WRITABLE_CEILING[architecture];
    if (base === undefined || blockSize === undefined || ceiling === undefined) {
      throw new Refusal(`architecture ${architecture} has no write target`);
    }

    /**
     * The compatibility gate, section 225, and here it has something to compare only sometimes.
     *
     * A container that came off a remote carries no XML wrapper and states none of the six fields,
     * so a config derived from one states none either and the gate reports zero compared. That is
     * the truth about the input rather than a pass, and it is printed so nobody assumes otherwise.
     * A config that arrived as a file from Logitech's service does carry them, and then this is the
     * check that refuses a config built for a different remote.
     */
    const statedVersion: StatedVersion = {};
    const comparison = compareIntendedVersion(statedVersion, identity);
    say(`compatibility: ${comparison.compared} of ${comparison.fields.length} `
      + `fields stated by the config`
      + (comparison.compared === 0
        ? ', so there is nothing to compare: this container carries no wrapper\n'
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

    /**
     * What the region should hold afterwards: the dump, with the config laid over its front.
     *
     * Past the config's end the dump's own bytes are kept, which is what makes a **shorter** config
     * safe to write: the tail of the last block it lands in is not part of the container and has to
     * be reproduced rather than invented. A config longer than the dump was refused above.
     */
    const target = Uint8Array.from(dump);
    target.set(wanted, 0);

    // Which blocks differ, which is the arithmetic that decides what gets erased. In `rehearsal.ts`
    // with a test, because a boundary read the wrong way erases one block of a pair and leaves the
    // other holding the old byte, and every per block read back would still pass.
    const blocks = blocksDiffering(dump, target, base, blockSize);
    if (blocks.length === 0) {
      say('the config is byte identical to the dump: there is nothing to write\n');
      return;
    }
    const changedBytes = [...dump].reduce((n, b, at) => (b === target[at] ? n : n + 1), 0);
    say(`${changedBytes} byte(s) differ from ${dumpName}, in `
      + `${blocks.length} block(s): ${blocks.map((b) => `0x${b.toString(16)}`).join(', ')}\n`);

    for (const block of blocks) {
      if (block % blockSize !== 0) throw new Refusal(`0x${block.toString(16)} is not aligned`);
      if (block < base) throw new Refusal(`0x${block.toString(16)} is below the config region`);
      if (block + blockSize > ceiling) {
        throw new Refusal(`0x${block.toString(16)} runs past the writable ceiling `
          + `0x${ceiling.toString(16)}, below which the stored application firmware sits`);
      }
      if (block - base + blockSize > dump.length) {
        throw new Refusal(`block 0x${block.toString(16)} runs past the end of ${dumpName}, so the `
          + 'bytes the erase would destroy are not known. Read a region that covers it.');
      }
    }

    const flashSize = NOMINAL_FLASH_SIZE[architecture];
    const plans = blocks.map((block) => {
      const offset = block - base;
      const transfers = transfersFor(block, blockSize);
      return {
        block,
        offset,
        intended: dump.subarray(offset, offset + blockSize),
        content: target.slice(offset, offset + blockSize),
        neighbours: flashSize === undefined ? [] : neighbourBlocks(block, blockSize, flashSize),
        transfers,
        packets: reportCount(transfers),
      };
    });

    // **Read and compare every block before erasing any of them.** Not per block as it goes: a
    // second block that turns out not to match the dump would be discovered with the first already
    // rewritten, which is the one state this script must not create.
    let interrupted = 0;
    for (const plan of plans) {
      say(`reading 0x${plan.block.toString(16)} off the remote to compare\n`);
      const live = await readBlock(plan.block);
      const differs = firstDifference(live, plan.intended);
      // **A block an earlier run erased and did not finish writing is known content too**, which the
      // failure message below promised and this compare did not deliver until 3 September 2026:
      // the first write that added a device timed out half way through its first block, and the
      // rerun the message asked for refused, because the block matched neither the dump nor the
      // file. Flash only clears bits and a report lands whole, so an interrupted write leaves every
      // byte either what this file puts there or erased, and nothing else. That state is recognised
      // byte by byte rather than as a prefix, since a byte the file wants at 0xff cannot say which.
      if (differs !== undefined
          && live.every((byte, k) => byte === plan.content[k] || byte === 0xff)
          && live.some((byte) => byte !== 0xff)) {
        interrupted += 1;
        say(`0x${plan.block.toString(16)} holds an interrupted write of this file: `
          + 'this file\'s bytes then erased flash, so what an erase would destroy is known\n');
        continue;
      }
      if (differs !== undefined) {
        throw new Refusal(`the remote and ${dumpName} differ at `
          + `0x${(plan.block + differs).toString(16)}: 0x${live[differs]!.toString(16)} on the `
          + `device, 0x${plan.intended[differs]!.toString(16)} in the dump. Refusing: the dump is `
          + "not this unit's current content, so what an erase would destroy is unknown. Take a "
          + 'fresh region read.');
      }
    }
    say(interrupted === 0
      ? `every block matches ${dumpName} byte for byte, so what the erase would destroy is known\n`
      : `every block matches ${dumpName} byte for byte but ${interrupted} holding an interrupted `
        + 'write of this file, so what the erase would destroy is known\n');

    for (const plan of plans) {
      if (plan.neighbours.length !== 2) {
        say(`0x${plan.block.toString(16)}: only ${plan.neighbours.length} `
          + 'neighbouring block(s) can be checked\n');
      }
    }
    const totalPackets = plans.reduce((n, p) => n + p.packets, 0);
    say(`plan: per block, read the neighbours, erase 0x${blockSize.toString(16)} `
      + `bytes, check the neighbours again, write it back and read it back. `
      + `${plans.length} erase(s), ${totalPackets} reports in total\n`);

    if (!commit) {
      say('dry run: nothing was written. Add --commit, with '
        + 'HARMONY_ENABLE_WRITES=1 and HARMONY_FIRST_WRITE=1, to perform it\n');
      return;
    }

    assertFirstWriteAllowed();
    const permission = {
      architecture,
      configLength: dump.length,
      // Measured, block by block, in the loop above.
      originalDumpVerified: true,
      intendedVersion: statedVersion,
      versionBlock: versionBytes,
      identityBlock,
      permittedUnit: permitted,
    };

    // **Step 2 of a working write, and ours did not have it**, sections 245 and 246. concordance
    // drops the remote's cached region descriptors before it erases anything, "so that nothing will
    // attempt to reference it while we're working" in its own words, and arch 12 executes its
    // configuration in place out of the flash the next line is about to erase. It writes no flash and
    // nothing persistent, so a run that fails after this point leaves no marker behind.
    say('dropping the cached region descriptors, so nothing references the config while it changes\n');
    await remote.invalidateCachedRegions(permission);

    for (const plan of plans) {
      await writeBlock({
        remote,
        permission,
        block: plan.block,
        blockSize,
        content: plan.content,
        neighbours: plan.neighbours,
        readBlock,
        log: (line) => say(`${line}\n`),
        onPastTheErase: (value) => { pastTheErase = value; },
        coversBlock: (address) => address >= base && address - base + blockSize <= dump.length,
        sourceName: dumpName,
      });
    }

    // **The check the per block read backs cannot make.** Each block verified the range it wrote;
    // this reads the whole container off the remote and compares it with the file, so a block that
    // was never written, or written in the wrong order, or a run of the config that fell between two
    // blocks, all show up here and nowhere else.
    // **Through `readConfig` rather than a loop of `readFlash`, and that was learned here.** The
    // first version read the range itself and the run failed at 24304 bytes with a chunk out of
    // sequence, which is section 223's transient: HIDAPI's macOS backend holds about 31 input
    // reports and discards the oldest, so a consumer that stalls loses a run. Both blocks had
    // already been written and verified, so the write was fine and the verification was not, which
    // is the worst way round to fail. `readConfig` retries a window, because a read is idempotent.
    say(`reading the configuration back to compare with the file\n`);
    const reread = await readConfig(remote, profileFor(productId));
    if (reread.retries > 0) {
      say(`${reread.retries} window(s) had to be asked for again\n`);
    }
    const back = reread.bytes;
    if (back.length !== wanted.length) {
      throw new Refusal(`the remote now holds ${back.length} bytes and the file is `
        + `${wanted.length}: a same length edit cannot change a container's length`);
    }
    const wrong = firstDifference(back, wanted);
    if (wrong !== undefined) {
      throw new Refusal(`the configuration read back differs from ${configPath} at offset `
        + `0x${wrong.toString(16)}: 0x${back[wrong]!.toString(16)} on the device, `
        + `0x${wanted[wrong]!.toString(16)} in the file`);
    }
    say('the whole configuration reads back byte for byte identical to the file. '
      + "A config we produced is on the remote.\n");

    // **Step 7, and it is the last thing this script does on purpose.** concordance ends a config
    // write with a device reset and waits for the remote to come back, which is the battery pull
    // this bench has performed by hand after every write, section 245. Nothing acknowledges a
    // command that ends in a reset, so there is nothing to wait for here.
    // **Measured on the first run that sent it, section 247: the close then succeeded.** This said
    // the handle was finished and the close was expected to complain, and it is not: on macOS the
    // handle survives the escape long enough to close cleanly, and the remote leaves the bus
    // afterwards. The arm below still catches the other case rather than assuming this one.
    if (restart) {
      say('restarting the remote, which is what a battery pull was doing by hand\n');
      await remote.resetDevice(permission);
      resetSent = true;
      say('the restart is sent. The remote leaves the bus and comes back on its own; '
        + 'give it a few seconds before enumerating again\n');
    } else {
      say('--no-restart: the restart is deliberately not sent, which is section 247\'s control. '
        + 'Look at the screen: a clean one means the invalidate is what fixes it\n');
    }
  } finally {
    try {
      await remote.close();
    } catch (error: unknown) {
      // A close that complains after a reset is the device having already left the bus, which is a
      // platform's business rather than a fault. Section 247 measured the opposite on macOS, so this
      // is the arm for a platform where the handle dies immediately: it says what happened without
      // calling it a failure, because reporting it as one would teach an operator to ignore the line
      // when it is real.
      if (resetSent) {
        say(`(the handle was already gone, which is what a restart does)\n`);
      } else {
        process.stderr.write(`(the device did not close cleanly: ${String(error)})\n`);
      }
    }
  }
}

main().catch((error: unknown) => {
  const known = error instanceof Refusal || error instanceof RailError || error instanceof RemoteError;
  process.stderr.write(`${failureLine(known ? error.message : String(error), pastTheErase)}\n`);
  process.exit(1);
});
