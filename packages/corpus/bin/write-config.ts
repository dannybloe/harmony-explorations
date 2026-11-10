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
 * **Every write stamps the configuration at the moment of writing**: the build
 * timestamp and the clock records, since a restart puts the remote's clock back to that stamp
 * (sections 111 and 310). The stamped file is saved over `--config` before the first erase, so the
 * lab holds what went onto the remote, and a rerun after a run that stopped past its erase writes
 * that saved file unchanged rather than stamping again, `stoppedAfterErase`. `--as-is` writes the
 * file as it is, which is what a compile written back unchanged as a compare base needs, and `--drop-only` and
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
 * **Six with the two bench Harmony 885s**, units A and B, decision 30, on
 * arch 8, which every arch 8 model reports alike, so again the dump names the unit and the identity block
 * has to match its record. **Their write end is not the others'**, `reference/architectures/
 * harmony-880-885/usb.md` "How a write ends": the cache drop, `WRITE_MISC` selector 2, before the first
 * erase, and the restart `E1 02`, which gets no reply. This script sends exactly those two and never a
 * status step, on any architecture, so the two steps of the other Harmonys' sequence that hang or
 * overwrite an 885, selector `0x0A` and the update status set to 2, are not in it to leave out.
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
 *
 * **The sequence is the library's**, `writeConfiguration` in `src/writeconfig.ts`, on
 * `@harmony/corpus/write`, so an application writes a remote through the same function this script calls. What
 * stays here is the bench's: the command line, the lab's names for the units and their region reads, reading
 * the two files, finding a stopped run's journal, opening the one remote attached, the journal file, the signal
 * handler and printing. Every line the library reports is printed and appended to the journal as before.
 */
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { imagePath, unitIdentity, unitIdentityPath } from '@harmony/lab';
import { HarmonyRemote, RailError, RemoteError, listHarmony, openHarmony } from '@harmony/usb';
import { failureLine } from '@harmony/usb/write';
import {
  ConfigWriteRefusal,
  writeConfiguration,
  type ConfigWriteUnit,
  type ConfigWriteUnitLabel,
} from '../src/write.ts';
import { stoppedAfterErase } from '../src/stamp.ts';
import { commandLine, fail } from '@harmony/lab/cli';

const cli = commandLine({
  usage: [
    'usage: node packages/corpus/bin/write-config.ts --config <file> --dump <lab region read>',
    '       HARMONY_ENABLE_WRITES=1 HARMONY_FIRST_WRITE=1 ... --commit',
    "       ... --commit --no-restart      section 247's control: every step but the last",
    "       ... --commit --no-invalidate   section 250's control: every step but the first",
    "       ... --commit --drop-only       section 250's isolating control: the drop and nothing else",
    '       ... --commit --restart-only    section 282: the restart and nothing else',
    "       ... --as-is                    write the file's own stamp, for putting a compile back unchanged",
  ].join('\n'),
  values: ['config', 'dump'],
  flags: ['commit', 'no-restart', 'no-invalidate', 'drop-only', 'restart-only', 'as-is'],
});

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
  // MyHarmony's sync of the spare with the two test activities of section 293 composed onto it, read before
  // the first write of a configuration composed for the One: the compare base for that write.
  'one_spare_track_start',
  // The same unit unchanged and read further, because the configuration with our look, section 399, outgrew it.
  'one_spare_look_base',
  // The spare with that configuration on it, the base for the next write.
  'one_spare_look_written',
  // The spare after the light timer test, the base for the page key light write.
  'one_spare_glow_written',
  // The spare with its page keys lit, the base for the write binding the keys below a device page.
  'one_spare_arrows_written',
  // The spare with the keys below a device page bound, the base for the write raising the screen light to 60 s.
  'one_spare_bottom_written',
  // The spare with the screen lit 60 s, the base for the write at 20 s without the Remote Assistant at start.
  'one_spare_light60_written',
  // The spare at 20 s without the Remote Assistant at start, the base for the write giving composed rows their click.
  'one_spare_noassistant_written',
  // The spare with composed rows clicking, read before the write without the tour.
  'one_spare_tourfree_base',
  'one_spare_tourfree_written',
  'one_spare_pictures_written',
  'one_spare_options_written',
  'one_spare_lists_written',
  'one_spare_devlistfix_written',
  'one_spare_pictures2_written',
  'one_spare_empty_written',
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
  // Read again before the composed activity's write, one block longer, since that write reaches the block at 0x110000.
  'h650_pre144_region',
  // After the composed activity's write, LG kijken: the file written, byte for byte, and the
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
  // After section 309's one byte write: the compare base for the seventh device, the one that opens a new device list page, section 312.
  'h650_seventh_base',
  // After the seventh device, read back identical to that write: the compare base for the combined
  // bench file, the device and activity features composed for the 650 in one configuration.
  'h650_combined_base',
  'h650_combined2_base',
  'h650_two_devices_base',
  'h650_full_plasma_base',
  'h650_full_plasma2_base',
  'h650_combined3_base',
  'h650_kpn_gap_base',
  'h650_denon_gap_base',
  'h650_clock_base',
  'h650_start_base',
  'h650_bench_2_3_base',
  'h650_bench_3_9_base',
  'h650_options_base',
  'h650_bench_4_2_base',
  'h650_favourites_base',
  'h650_milestone_5_1_base',
  'h650_5_2_5_base',
  'h650_6_2_13_base',
  'h650_7_1_base',
  'h650_7_1_stopped',
  'h650_7_1_probe',
  'h650_7_5_base',
  'h650_10_5_base',
  'h650_9_1_2_base',
  'h650_stuck_9_1_2',
  'h650_freeze_a_base',
  'h650_9_1_2_fixed_base',
  'h650_bright_base',
  'h650_8_2_base',
  'h650_8_2_6_base',
  'h650_8_2_6_after',
  'h650_8_2_6_control',
  'h650_empty_base',
  'h650_empty_blended_base',
  // Before the test setup built from nothing was written: the compare base for that write.
  'h650_11_2_3_base',
  // Before the same setup with its letters smoothed: the compare base for that write.
  'h650_11_2_4_base',
  // With the smoothed setup on it, before the start up icon and the corner mark were moved: that write's base.
  'h650_11_2_4_look_base',
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
  // Before the empty configuration: the region to the 0x200000 ceiling.
  'h600_before_empty',
  // With our empty configuration on it, before the same file with the Off screen's mark at 0, section 387.
  'h600_empty_on',
  // With the mark at 0 on it, before the empty configuration in grey 2.
  'h600_markoff_on',
  // With the empty configuration in grey 2 on it, before its letters blended.
  'h600_grey2_on',
  // With the empty configuration in grey 2 and blended letters on it, before the five device setup.
  'h600_blended_on',
  // With the five device setup on it, after its bench run.
  'h600_setup5_on',
  // With the six device file on it, the Switch the sixth, after its bench run.
  'h600_setup6_on',
]);
const H700_DUMPS = new Set<string>([
  // Read straight after section 300 put block 0x030000 back unchanged: the 2.8 configuration, the
  // whole region to 0x150000, identical to the read before that rehearsal. The compare base for the
  // 700's first configuration write.
  'h700_after_rehearsal_region',
  // After the 700's first real write, the Denon's power on delay raised from 60 to 90 tenths: the two
  // bytes the file changed and nothing else. The compare base for putting it back.
  'h700_delay90_region',
  // Before the empty configuration built from nothing, section 382.
  'h700_before_empty',
  // With the empty configuration on it, section 383: the compare base for putting the original back.
  'h700_empty_on',
  'h700_before_setup',
  'h700_six_on',
  'h700_seven_on',
  'h700_bright_on',
]);

/**
 * The two bench Harmony 885s' region reads, arch 8. The same rule as every list
 * above: region reads only, each the unit's content when it was read, so a write adds the next one.
 *
 * **The first entries are the reads `rehearse-block.ts` compares against**, each taken twice and
 * identical, from the configuration's base at `0x020000` to the staging region at `0x1D0000`, so every
 * block a configuration can occupy is covered and none past the ceiling is. Unit A's are still its content
 * after the rehearsal that wrote block `0x0C0000` back unchanged, `tests/harmony_880_885/test_harmony_885_flash_backup.py`; unit
 * B's are from before anything was written to it. A write that lands makes them stale, which the block
 * compare refuses rather than trusts, and the read after it is what goes in next.
 */
const H885_A_DUMPS = new Set<string>([
  'h885_a_region',
  'h885_a_region_2',
]);
const H885_B_DUMPS = new Set<string>([
  'h885_b_region',
  'h885_b_region_2',
  // B's region after the first configuration write to it put its own configuration back restamped: its content
  // from then on, differing from the two above in that write's 17 stamp bytes. Read once; a second read met a
  // sequence break, and the one read is checked against the written file and the region before it instead,
  // `tests/harmony_880_885/test_harmony_885_first_config_write.py`. The writes to B after that one compared against this, until the read below.
  'h885_b_after_1_4_region',
  // B's region after unit A's configuration with the Sony HT was written onto it: the file written in its
  // first 572238 bytes, and the region above everywhere outside the nine sectors that write erased. Read once,
  // no window retried, before the next write to B; every write to B since compares against this.
  'h885_b_after_2_1_region',
]);

/**
 * The region reads of each unit this may write. **The units themselves are the library's**, `CONFIG_WRITE_UNITS`
 * in `src/writeconfig.ts`, each label with its name and model, and the library refuses any other label; this
 * table only says which lab reads are each unit's own content. It is typed by the library's labels, so the
 * compiler refuses a table that leaves one out or adds one, and the two cannot differ. The library chooses among
 * the units by the architecture the remote reports and the region read `--dump` names, never by an argument, for
 * the reason `rehearse-block.ts` gives, and the identity block read off the remote refuses any other unit, since
 * the 600 and the 650 enumerate identically and so do two Harmony Ones. What each model's write end needs is
 * `CONFIG_WRITE_MODELS` beside it, in the library, which holds the sequence.
 *
 * **Several units per architecture since Danny's decision of 29 September 2026**, the Harmony 600 and the
 * Harmony 700 beside the 650, and the two bench Harmony 885s, decision 30.
 */
const REGIONS: Readonly<Record<ConfigWriteUnitLabel, ReadonlySet<string>>> = {
  h885_a: H885_A_DUMPS,
  h885_b: H885_B_DUMPS,
  one_spare: SPARE_DUMPS,
  h650: H650_DUMPS,
  h600: H600_DUMPS,
  h700: H700_DUMPS,
};
const UNITS: readonly ConfigWriteUnit[] = Object.entries(REGIONS).map(([label, regions]) => ({ label, regions }));
const ALL_DUMPS = new Set(UNITS.flatMap((unit) => [...unit.regions]));

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

function say(line: string): void {
  process.stdout.write(line);
  if (journalPath !== undefined) appendFileSync(journalPath, line);
}

/** True from the moment the first erase is sent until the last block has been verified. */
let pastTheErase = false;

async function main(): Promise<void> {
  process.on('SIGINT', () => {
    process.stderr.write(`\n${failureLine('interrupted', pastTheErase)}\n`);
    process.exit(130);
  });

  const configPath = cli.value('config') ?? fail('--config is the container to put on the remote');
  journalPath = `${configPath}.write-${new Date().toISOString().replace(/[:.]/g, '')}.log`;
  appendFileSync(journalPath, `# ${cli.argv.slice(1).join(' ')}\n`);
  const dumpName = cli.value('dump')
    ?? fail("--dump names the lab region read holding this unit's current content");
  const commit = cli.flag('commit');
  // **The control for section 247, and it exists because that write proved two things at once.**
  // The invalidate and the restart went in together, so the screen coming back clean could have
  // been either. **What that run actually showed is not what section 248 concluded**, section 250:
  // no write clears the flag a status screen needs to be gone, so neither command was suppressing
  // anything and the state the remote was already in was doing the work. This flag stays because a
  // run without the restart is still worth being able to perform deliberately.
  // It only ever **skips** a command, so it needs no rail of its own.
  const restart = !cli.flag('no-restart');
  // **The control for section 250, which is the counterfactual section 248 never ran.** That
  // section credited the invalidate with keeping the sync screen away, and reading the firmware
  // afterwards found that no write clears the flag a status screen needs to be gone, so a write
  // without the invalidate should be just as quiet, and should leave the remote holding a verdict
  // it earned against different bytes. This omits the invalidate and nothing else.
  //
  // **It is a control and not an option**, and the difference matters: leaving the invalidate out
  // is what both working implementations do not do, so an ordinary write sends it.
  const invalidate = !cli.flag('no-invalidate');

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
  const dropOnly = cli.flag('drop-only');
  if (dropOnly && !invalidate) {
    fail('--drop-only and --no-invalidate ask for opposite things: the first sends only the drop '
      + 'and the second sends everything but');
  }
  // **The restart alone, section 282**, the other half of sending the two commands once each on the
  // Harmony 650 before any write depends on them. Same precondition as `--drop-only`: the remote
  // holds the file, read whole and compared, and nothing is erased.
  const restartOnly = cli.flag('restart-only');
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
  const wanted = new Uint8Array(readFileSync(configPath));

  // Which stamp: the file's own, the one a stopped run saved, or the moment of writing, which the library
  // applies before every other check so that they all run on the bytes that will be written.
  const asIs = cli.flag('as-is') || dropOnly || restartOnly;
  const previous = readdirSync(dirname(configPath))
    .filter((name) => name.startsWith(`${basename(configPath)}.write-`) && name.endsWith('.log'))
    .map((name) => join(dirname(configPath), name))
    .filter((path) => path !== journalPath)
    .sort()
    .at(-1);
  const resuming = previous !== undefined && stoppedAfterErase(readFileSync(previous, 'utf8'));

  await writeConfiguration({
    config: { name: configPath, bytes: wanted },
    region: { name: dumpName, bytes: dump },
    units: UNITS,
    records: { text: unitIdentity, where: unitIdentityPath },
    stamp: asIs ? { kind: 'as-is' }
      : resuming ? { kind: 'resume', journal: basename(previous!) }
        : { kind: 'now', at: new Date() },
    commit,
    invalidate,
    restart,
    ...(dropOnly ? { only: 'drop' as const } : restartOnly ? { only: 'restart' as const } : {}),
    // Exactly one remote attached, since this writes and refuses to guess, opened through the guarded
    // transport `openHarmony` returns. The library calls this once every check that needs no remote has
    // passed, the point at which this script opened it before the sequence moved into the library.
    open: async () => {
      const attached = await listHarmony();
      if (attached.length === 0) fail('no remote is attached');
      if (attached.length > 1) {
        fail(`${attached.length} remotes are attached; this writes, so it refuses to guess`);
      }
      const productId = (attached[0] as { productId: number }).productId;
      return { remote: new HarmonyRemote(await openHarmony({ productId })), productId };
    },
    // Saved over `--config` before the first command that changes the remote, so the lab holds what went
    // onto it and a rerun after a run that stopped past its erase finds it, `stoppedAfterErase`.
    saveStamped: (bytes) => writeFileSync(configPath, bytes),
    say: (line) => say(`${line}\n`),
    onPastTheErase: (value) => { pastTheErase = value; },
    warn: (line) => { process.stderr.write(`${line}\n`); },
  });
}

main().catch((error: unknown) => {
  const known = error instanceof ConfigWriteRefusal || error instanceof RailError || error instanceof RemoteError;
  process.stderr.write(`${failureLine(known ? error.message : String(error), pastTheErase)}\n`);
  process.exit(1);
});
