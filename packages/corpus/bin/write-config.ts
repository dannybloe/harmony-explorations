/**
 * Put a configuration **we produced** onto a permitted remote, and verify it came back.
 *
 *   node packages/corpus/bin/write-config.ts --config <file> --dump one_spare_20260901_region
 *   HARMONY_ENABLE_WRITES=1 HARMONY_FIRST_WRITE=1 ... --commit
 *   ... --commit --no-restart      section 247's control: every step but the last
 *   ... --commit --no-invalidate   section 250's control: every step but the first
 *   ... --commit --drop-only      section 250's isolating control: the drop and nothing else
 *   ... --commit --restart-only   section 282: the restart and nothing else
 *   ... --as-is                   write the file's own stamp, for putting a compile back unchanged
 *
 * **Every write stamps the configuration at the moment of writing**, todo-compile-650 1.3: the build
 * timestamp and the clock records, since a restart puts the remote's clock back to that stamp
 * (sections 111 and 310). The stamped file is saved over `--config` before the first erase, so the
 * lab holds what went onto the remote, and a rerun after a run that stopped past its erase writes
 * that saved file unchanged rather than stamping again, `stoppedAfterErase`. `--as-is` writes the
 * file as it is, which is what 1.6 needs for a compile written back unchanged, and `--drop-only` and
 * `--restart-only` imply it, since both compare the remote against the file and write nothing.
 *
 * **Two units since 27 September 2026, section 282**, chosen by the architecture read off the remote
 * the way `rehearse-block.ts` chooses: the spare Harmony One on arch 12 and the Harmony 650 on arch
 * 14, each with its own unit record and its own list of dumps. The Harmony 525 is not here, since
 * nothing has composed a configuration for it. On arch 14 the Harmony 600 enumerates identically to
 * the 650 and is refused by the unit check.
 *
 * **Four since 29 September 2026**, Danny's decision: the Harmony 600 and the Harmony 700 join the 650
 * on arch 14, so the dump names which unit is expected and the identity block has to match its
 * record, the way `rehearse-block.ts` does it. **A unit also states the firmware builds its cache
 * drop and restart were read in**, and a commit on any other build is refused. The 700's 2.8 is read
 * since section 299: its drop is the 0.2 builds' at other addresses plus a second flag section 283
 * read, and its restart is section 97's.
 * The version string is not a build: the 600 and the 650 both report 0.2 and differ in 1395 bytes,
 * and 0.2 is listed for both only because section 282 found every routine involved identical.
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
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

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
  ACTION_QUEUE_INSTRUCTIONS, QueueError, StateTableError, assertQueueFits,
  assertStateTableConsistent, parse, trailerChecksum, worstQueueRun,
} from '@harmony/codec';
import { profileFor, readConfig } from '../src/index.ts';
import { StampError, stampForWrite, stoppedAfterErase } from '../src/stamp.ts';

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
  // And after the first activity write, section 276, read on 7 September 2026 with the unit's
  // identity checked by `assertUnitIsPermitted` before it was filed. It is the compare base for the
  // write that corrects that configuration's base slot 13 header, and it is the reason this list has
  // to be added to by hand: the previous entry stopped describing the remote the moment that write
  // landed, and a stale compare base is exactly what this rail exists to refuse.
  'one_spare_lg_activity_region',
  // And after the second activity write, section 277, which is the compare base for the write that
  // moves the power variable below `narrow`.
  'one_spare_narrow_base',
  'one_spare_probe_base',
  // The region behind the retargeted transition probe, read after the enter-mode write.
  'one_spare_retarget_base',
  // The region behind the paired-send probe, read after the retarget write.
  'one_spare_paired_base',
  'one_spare_screen_base',
  'one_spare_poweroff_base',
  'one_spare_page4_base',
]);

/**
 * The Harmony 650's own region reads, section 282. Same rule as the spare's list: region reads only,
 * each one the unit's content at the moment it was read, so every write adds the next one.
 */
const H650_DUMPS = new Set([
  'h650_config_region',
  // After 1.4.2's write, the Denon's power on delay at 90 tenths: the compare base for the revert.
  'h650_delay90_region',
  // After 1.4.3's write, the composed LG television, section 285: the compare base for the next one.
  'h650_lg_region',
  // After section 286's write, the introduction tour skipped: the compare base after that.
  'h650_notour_region',
  // Read again before 1.4.4, one block longer, since that write reaches the block at 0x110000.
  'h650_pre144_region',
  // After 1.4.4's write, the composed activity LG kijken: the file written, byte for byte, and the
  // rest of its last block erased. The compare base after that.
  'h650_post144_region',
  // After timer 1, the screen light, went from 8 to 20 seconds: two bytes, read after a battery pull.
  'h650_glow20_region',
  // And after it went to 10: the same two bytes again. The compare base after that.
  'h650_glow10_region',
  // After section 294, LG kijken's own device list, written in two runs. The compare base after that.
  'h650_devicelist_region',
  // Before section 309's test device with held power steps: the Panasonic configuration as MyHarmony
  // left it. The compare base for that write.
  'h650_plasma_base',
  // After section 309's one byte write: the compare base for the seventh device, todo-compile-650 2.3.
  'h650_seventh_base',
  // After the seventh device, read back identical to that write: the compare base for the combined
  // bench file, todo-compile-650 2.2 to 3.12.
  'h650_combined_base',
  'h650_combined2_base',
  'h650_two_devices_base',
  'h650_full_plasma_base',
  'h650_full_plasma2_base',
  'h650_combined3_base',
  'h650_kpn_gap_base',
  'h650_denon_gap_base',
]);

/**
 * The Harmony 600's and the Harmony 700's region reads. Danny's decision of 29 September 2026 made
 * both writable, and an empty list is what kept a unit from being written before the lab held bytes
 * to restore it from. The 600's first is section 302's.
 */
const H600_DUMPS = new Set<string>([
  // Read straight after section 302 put block 0x030000 back unchanged: the configuration region to
  // the 0x200000 ceiling, identical to the read before that rehearsal. The compare base for the
  // 600's first configuration write.
  'h600_after_rehearsal_region',
  // After the 600's first real write, the KPN box's power on delay raised from 15 to 45 tenths: the
  // two bytes the file changed and nothing else. The compare base for putting it back.
  'h600_kpn45_region',
]);
const H700_DUMPS = new Set<string>([
  // Read straight after section 300 put block 0x030000 back unchanged: the 2.8 configuration, the
  // whole region to 0x150000, identical to the read before that rehearsal. The compare base for the
  // 700's first configuration write.
  'h700_after_rehearsal_region',
  // After the 700's first real write, the Denon's power on delay raised from 60 to 90 tenths: the two
  // bytes the file changed and nothing else. The compare base for putting it back.
  'h700_delay90_region',
]);

/** A remote this may run against, per architecture read off the device. */
interface Target {
  readonly model: string;
  /** The lab's name for the unit, whose identity file the unit check compares against. */
  readonly unitLabel: string;
  readonly dumps: ReadonlySet<string>;
  /**
   * The firmware builds, as the remote reports them, in whose own image the cache drop and the
   * restart this sends were read before either was sent. A unit reporting any other build is refused
   * a commit, because both commands are the firmware's and not the format's: the 650's were read on
   * its build 0.2 and sent once each before a write depended on them, section 282. The Harmony 700's
   * 2.8 was read against that build, section 299, and has been sent neither. Empty for a unit whose
   * build nobody has read yet.
   */
  readonly sequenceReadOn: readonly string[];
}

/**
 * Keyed by what the device says, never by an argument, for the reason `rehearse-block.ts` gives: an
 * argument would let an operator point one unit's allow list at another. **Several units per
 * architecture since Danny's decision of 29 September 2026**, and the 600 and the 650 enumerate
 * identically, so the dump names which unit is expected and the identity block read off the remote
 * is what refuses any other.
 */
const TARGETS: Readonly<Record<number, readonly Target[]>> = {
  12: [{ model: 'the spare Harmony One', unitLabel: 'one_spare', dumps: SPARE_DUMPS, sequenceReadOn: ['3.4'] }],
  14: [
    { model: 'the Harmony 650', unitLabel: 'h650', dumps: H650_DUMPS, sequenceReadOn: ['0.2'] },
    // The same build as the 650, `600-0.2-code-base0x9000-COMPLETE.bin`, read off this unit.
    { model: 'the Harmony 600', unitLabel: 'h600', dumps: H600_DUMPS, sequenceReadOn: ['0.2'] },
    // 2.8, which it runs since section 297: the drop is read in section 299 and the restart in 97.
    // Its first configuration change, a power on delay raised and put back, is section 301.
    { model: 'the Harmony 700', unitLabel: 'h700', dumps: H700_DUMPS, sequenceReadOn: ['2.8'] },
  ],
};
const ALL_DUMPS = new Set(Object.values(TARGETS).flat().flatMap((t) => [...t.dumps]));

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
  // been either. **What that run actually showed is not what section 248 concluded**, section 250:
  // no write clears the flag a status screen needs to be gone, so neither command was suppressing
  // anything and the state the remote was already in was doing the work. This flag stays because a
  // run without the restart is still worth being able to perform deliberately.
  // It only ever **skips** a command, so it needs no rail of its own.
  const restart = !process.argv.includes('--no-restart');
  // **The control for section 250, which is the counterfactual section 248 never ran.** That
  // section credited the invalidate with keeping the sync screen away, and reading the firmware
  // afterwards found that no write clears the flag a status screen needs to be gone, so a write
  // without the invalidate should be just as quiet, and should leave the remote holding a verdict
  // it earned against different bytes. This omits the invalidate and nothing else.
  //
  // **It is a control and not an option**, and the difference matters: leaving the invalidate out
  // is what both working implementations do not do, so an ordinary write sends it.
  const invalidate = !process.argv.includes('--no-invalidate');

  // **The isolating control for section 250, added 4 September 2026, and it writes no flash at
  // all.** That section's mechanism was argued from the firmware and then measured twice with
  // opposite outcomes: a run whose verdict had been dropped came back from a cable transition with
  // its clock reseeded, so the remote had restarted, and a run whose verdict stood came back with
  // its clock still running. One run each side with the **write** present in only one of them, so
  // the drop and the write are both candidate causes and nothing separates them.
  //
  // This sends the drop and stops. The precondition is measured rather than asserted: the whole
  // container is read off the remote and compared with the file first, so a run that proceeds has
  // established what the remote holds. Nothing is erased, so there is no dump to restore from and
  // none is needed.
  //
  // **It presents the full write permission for something that precedes no erase**, which
  // `assertInvalidateAllowed`'s own docstring calls a decision to take in a commit that says so.
  // This is that commit: the drop touches three records in data memory and no flash gate, section
  // 246, so what the permission is protecting here is the **unit**, and that is exactly the check
  // worth keeping.
  const dropOnly = process.argv.includes('--drop-only');
  if (dropOnly && !invalidate) {
    fail('--drop-only and --no-invalidate ask for opposite things: the first sends only the drop '
      + 'and the second sends everything but');
  }
  // **The restart alone, section 282**, the other half of sending the two commands once each on the
  // Harmony 650 before any write depends on them. Same precondition as `--drop-only`: the remote
  // holds the file, read whole and compared, and nothing is erased.
  const restartOnly = process.argv.includes('--restart-only');
  if (restartOnly && (dropOnly || !restart)) {
    fail('--restart-only sends the restart and nothing else, so it cannot be combined with '
      + '--drop-only or --no-restart');
  }

  if (!ALL_DUMPS.has(dumpName)) {
    fail(`${dumpName} is not one of a permitted unit's own region reads `
      + `(${[...ALL_DUMPS].join(', ')}). Refusing: the byte compare below can only identify the `
      + 'unit if the dump belongs to the unit that may be written to.');
  }
  const dumpPath = imagePath(dumpName);
  if (dumpPath === undefined) fail(`no lab image called ${dumpName}`);
  const dump = new Uint8Array(readFileSync(dumpPath));
  let wanted: Uint8Array = new Uint8Array(readFileSync(configPath));

  // The stamp, before every other check so that they all run on the bytes that will be written.
  // `stampForWrite` checks the file's own checksum first, since stamping recomputes it.
  const asIs = process.argv.includes('--as-is') || dropOnly || restartOnly;
  const previous = readdirSync(dirname(configPath))
    .filter((name) => name.startsWith(`${basename(configPath)}.write-`) && name.endsWith('.log'))
    .map((name) => join(dirname(configPath), name))
    .filter((path) => path !== journalPath)
    .sort()
    .at(-1);
  const resuming = previous !== undefined && stoppedAfterErase(readFileSync(previous, 'utf8'));
  let stamped = false;
  if (asIs) {
    say('--as-is: the file is written with its own stamp\n');
  } else if (resuming) {
    say(`${basename(previous!)} erased flash and never read the configuration back, so this is its `
      + 'rerun: the file is written with the stamp that run saved, which is what its blocks hold\n');
  } else {
    try {
      const result = stampForWrite(wanted, new Date());
      wanted = result.bytes;
      stamped = true;
      say(`stamped ${result.at}: the build timestamp and the clock records, which the remote's `
        + 'clock is set back to at every restart\n');
    } catch (error) {
      if (!(error instanceof StampError)) throw error;
      fail(`${configPath}: ${error.message}. It would also be refused by the remote at boot`);
    }
  }

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
  // **The second silent one, and ours produced it.** The firmware sizes the state variable storage
  // from base slot 13's `narrow` and `wide` and paints `0xFE` over everything above it at each boot,
  // while the seeding loop runs over `count`. So a config whose header does not add up carries
  // variables that are seeded and then erased, with no error anywhere. Section 276.
  try {
    assertStateTableConsistent(container);
  } catch (error) {
    if (!(error instanceof StateTableError)) throw error;
    fail(`${configPath} has an inconsistent state variable table: ${error.message}. The remote `
      + 'would accept it and overwrite those variables at every boot, so it is refused here');
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

    const units = TARGETS[architecture];
    if (units === undefined) {
      throw new Refusal(`architecture ${architecture} has no unit this may write to `
        + `(${Object.entries(TARGETS).map(([a, t]) => `${a}: ${t.map((one) => one.model).join(' or ')}`).join(', ')})`);
    }
    const unit = units.find((one) => one.dumps.has(dumpName));
    if (unit === undefined) {
      throw new Refusal(`${dumpName} is not one of the region reads of an architecture ${architecture} `
        + `unit (${units.map((one) => `${one.model}: ${[...one.dumps].join(', ') || 'none registered yet'}`).join('; ')}). `
        + "Refusing rather than comparing one unit against another's content.");
    }
    if (commit && !unit.sequenceReadOn.includes(identity.firmware)) {
      throw new Refusal(`${unit.model} reports firmware ${identity.firmware}, and the cache drop and the `
        + `restart this sends have been read in ${unit.sequenceReadOn.length === 0 ? 'no build of it yet'
          : `build ${unit.sequenceReadOn.join(' and ')} only`}. Read both in that build's image first.`);
    }
    const stored = unitIdentity(unit.unitLabel);
    if (stored === undefined) {
      throw new Refusal(`the lab has no recorded identity for ${unit.unitLabel}, so nothing `
        + 'can say whether the remote on the cable is the one this may write to. Two remotes of one '
        + `model enumerate identically. Write it to ${unitIdentityPath(unit.unitLabel)}`);
    }
    const permitted = unitIdentityFromText(stored);
    const identityBlock = await remote.readUnitIdentity();
    assertUnitIsPermitted({ identityBlock, permittedUnit: permitted });
    say(`unit identity ${unitIdentityText(identityBlock).slice(0, 8)}..., which `
      + `matches the recorded ${unit.unitLabel}\n`);

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

    /**
     * Read the whole container off the remote and refuse unless it is the file, byte for byte.
     *
     * **One derivation with two callers**, which is why it is a local rather than two copies: it is
     * the post write check that no per block read back can make, and it is `--drop-only`'s
     * precondition, where its job is to establish what the remote holds before a control changes
     * anything about it.
     *
     * **Through `readConfig` rather than a loop of `readFlash`, and that was learned here.** The
     * first version read the range itself and the run failed at 24304 bytes with a chunk out of
     * sequence, which is section 223's transient: HIDAPI's macOS backend holds about 31 input
     * reports and discards the oldest, so a consumer that stalls loses a run. Both blocks had
     * already been written and verified, so the write was fine and the verification was not, which
     * is the worst way round to fail. `readConfig` retries a window, because a read is idempotent.
     */
    const containerMatchesTheFile = async (): Promise<void> => {
      say('reading the configuration back to compare with the file\n');
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
    };

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
    if (blocks.length === 0 && !dropOnly && !restartOnly) {
      say('the config is byte identical to the dump: there is nothing to write\n');
      return;
    }
    // **`--drop-only` wants exactly this case**, and that is the point rather than a leniency: the
    // control sends a command to a remote whose configuration is already the file, so a run with
    // blocks to write would be measuring the drop and the write together, which is the confusion it
    // exists to resolve. Everything below then loops over an empty plan and the dump comparison
    // measures nothing, so the precondition that matters is the container read the branch performs.
    if ((dropOnly || restartOnly) && blocks.length !== 0) {
      throw new Refusal(`${dropOnly ? '--drop-only' : '--restart-only'} wants a remote that already `
        + `holds ${configPath}, and `
        + `${blocks.length} block(s) differ from ${dumpName}. Write it first, or name the dump and `
        + 'config that match what is on the device.');
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
      //
      // **A block that is entirely erased is the same case and was refused until 4 September 2026**,
      // when a run failed between the erase and the first data report and left exactly that. The
      // `some` clause was there to stop an all ones block being read as an interrupted write, on the
      // reasoning that it says nothing about which file had been going in. That reasoning is wrong
      // twice over: erased flash is the one state where **nothing** is at risk, since an erase
      // destroys nothing that is not already gone, and refusing it is what turns a recoverable run
      // into a restore from the lab. It is reported separately so the operator sees which it was.
      const erasedWhole = live.every((byte) => byte === 0xff);
      if (differs !== undefined
          && live.every((byte, k) => byte === plan.content[k] || byte === 0xff)) {
        interrupted += 1;
        say(`0x${plan.block.toString(16)} holds ${erasedWhole ? 'erased flash, so an earlier run '
          + 'erased it and wrote nothing' : 'an interrupted write of this file: this file\'s bytes '
          + 'then erased flash'}, so what an erase would destroy is known\n`);
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
    // Saved before the first command that changes the remote, so that whatever happens next the lab
    // holds the bytes the remote is being given, and a rerun can find them. The journal says so.
    if (stamped) {
      writeFileSync(configPath, wanted);
      say(`saved the stamped configuration over ${configPath}\n`);
    }
    const permission = {
      architecture,
      configLength: dump.length,
      // Measured, block by block, in the loop above. **On a `--drop-only` run there are no blocks
      // and this is measured by something else**: the config is byte identical to the dump, checked
      // above, and the branch below reads the whole container off the remote and compares it before
      // sending anything. That is a stronger statement than the block loop makes, not a weaker one,
      // and nothing is erased either way.
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
    // The control's precondition, measured before anything is sent: the remote holds the file.
    if (dropOnly) {
      await containerMatchesTheFile();
      say('--drop-only: sending the cache drop and nothing else. No erase, no write, no restart\n');
      await remote.invalidateCachedRegions(permission);
      // Section 250's clock experiment is a Harmony One's; on arch 14 the next erase consumes the drop's
      // flag instead, section 282, so the advice differs per architecture.
      say(architecture === 12
        ? 'the drop is sent. The remote keeps running; its verdict byte is now clear. Read its '
          + 'clock, pull the cable, plug it back in, and read the clock again: a running time that '
          + 'starts over is a restart the drop caused with no write anywhere in the chain\n'
        : 'the drop is sent. The remote keeps running with its verdict clear and a flag set that the '
          + 'next erase consumes; a restart or a battery pull clears both\n');
      return;
    }
    if (restartOnly) {
      await containerMatchesTheFile();
      say('--restart-only: sending the restart and nothing else. No drop, no erase, no write\n');
      await remote.resetDevice(permission);
      resetSent = true;
      say('the restart is sent. The remote leaves the bus and comes back on its own; '
        + 'give it a few seconds before enumerating again\n');
      return;
    }

    // **On arch 14 the drop also arms the first erase after it**, section 282: that erase clears the
    // flag wherever it is, and only an erase at exactly `0x030000` then updates a setting in the
    // remote's settings store. This writes only the blocks that differ, in ascending order, so a run
    // that leaves the first block alone spends the flag on another block and never touches the store.
    if (invalidate) {
      say('dropping the cached region descriptors, so nothing references the config while it '
        + 'changes, and so the remote re-checks what we write\n');
      if (architecture === 14) {
        say(blocks[0] === base
          ? 'arch 14: the first erase is the configuration\'s first block, so the remote will also '
            + 'look at setting 0x80 in its settings store and write it if its bit 0 is set, section 282\n'
          : `arch 14: the first erase is 0x${blocks[0]!.toString(16)}, not the configuration's first `
            + 'block, so the drop\'s flag is spent there and the settings store is left alone, '
            + 'section 282\n');
      }
      await remote.invalidateCachedRegions(permission);
    } else {
      say("--no-invalidate: the drop is deliberately not sent, which is section 250's control. "
        + 'The remote is expected to keep its old verdict, check nothing, and show no screen\n');
    }

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
    await containerMatchesTheFile();

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
        + 'The remote stays on the bus; a battery pull is the only other way to restart it\n');
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
