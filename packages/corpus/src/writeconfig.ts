/**
 * Put a configuration onto a permitted remote of the compiled families, and verify it came back: the
 * library half of `bin/write-config.ts`, `todo.md` 7.3.10.
 *
 * **Why this is a function now and not only a script.** The measure 7.3.10 set is an application that writes
 * a remote through the library and never through a script, and until then the write's whole sequence lived
 * in the script's `main`: the stamp, the checks the remote does not make, the unit check, the compare of every
 * block before any erase, the cache drop, the blocks, the read back and the restart. An application that
 * wanted to write would have had to copy that, and two copies of a write sequence are two copies until one of
 * them moves. So the body moved here as it stood, every check in the order it had, and the script keeps what
 * is the bench's: its command line, the lab's names for the units and their region reads, the files, the
 * journal file and the signal handler.
 *
 * **The sequence, in the order the bytes reach the cable**, which is the script's and is argued in the script's
 * header and at each step below:
 *
 * 1. Before anything is opened: the stamp (`stampForWrite`, or the file's own with `as-is`, or the stamp a
 *    stopped run saved), the trailer checksum recomputed, `assertQueueFits`, `assertStateTableConsistent`, the
 *    deepest action list, and the configuration against the length of the region read.
 * 2. `open`, which is the caller's: the script enumerates and opens the one remote attached.
 * 3. The leftovers drained, the version read; the unit chosen among `units` by the architecture the remote
 *    states and the region read named; the firmware build against the model's, on a commit; `--no-invalidate`
 *    refused where the drop is required; the unit's record, then its identity block read and
 *    `assertUnitIsPermitted`.
 * 4. The compatibility gate's account, the blocks that differ, each block bounded, every block read and
 *    compared before any erase, and on a Harmony 885 the staged install status read.
 * 5. On a commit: `assertFirstWriteAllowed`, the stamped file handed to `saveStamped`, then the drop alone,
 *    the restart alone, or the drop, `writeBlock` per block, the whole configuration read back, the status read
 *    again on an 885 and the restart.
 *
 * **What a caller hands in is what it has**: the units it may write with the model of each and the names of
 * its region reads, the region read itself, the configuration's bytes, where its unit records are, how to open
 * the remote, and an options object for what the script's flags say. What the remote is, its architecture, its
 * firmware and its identity, is read off it here, never taken from the caller, which is the rule
 * `rehearse-block.ts` set: an argument would let an operator point one unit's allow list at another. What a
 * model's write end needs, the builds its drop and restart were read in, whether the drop is required and where
 * an install status sits, is `CONFIG_WRITE_MODELS` in this file, a fact about the model and not a caller's
 * answer, "a rail that asks a caller a question is a rail the caller answers", `CLAUDE.md`.
 *
 * **The rails did not move.** Every rail is called here on the inputs and in the place the script called it,
 * relative to what reaches the cable, and every command is still sent through `HarmonyRemote`, whose methods
 * each assert their own rail, over the guarded transport `openHarmony` returns. The flags are read inside the
 * rails, `assertFirstWriteAllowed` among them; nothing here reads one. The read back compare is still
 * `writeBlock` in `@harmony/usb/write`, and the whole configuration read back after it is `readConfig`.
 *
 * **Every line the run prints goes to `say` before the next command is sent**, the script's journal: a line
 * reaches the caller before the next one is composed, so a run that is killed has already handed over its
 * account of what reached the flash, section 243. The lines are the script's, word for word, and some name its
 * flags (`--commit`, `--no-invalidate`, `--drop-only`); an option here carries the flag's meaning under the
 * flag's name, so the account reads the same whichever caller ran it, and `stoppedAfterErase` in `stamp.ts`
 * reads a journal by two of these lines.
 *
 * **A refusal is a `ConfigWriteRefusal`**, before the remote is opened and after, so a caller can tell a
 * refusal of ours from a fault: the script prints it as it printed its own, `failureLine` in
 * `@harmony/usb/write`, which says nothing more unless the run was past an erase.
 */
import {
  HarmonyRemote,
  architectureFromVersion,
  compareIntendedVersion,
  readVersion,
  unitIdentityFromText,
  unitIdentityText,
  type StatedVersion,
} from '@harmony/usb';
import { ERASE_BLOCK_SIZE, WRITABLE_CEILING } from '@harmony/usb/rails';
import {
  CONFIG_REGION_BASE,
  MAX_TRANSFER,
  NOMINAL_FLASH_SIZE,
  assertFirstWriteAllowed,
  assertUnitIsPermitted,
  blocksDiffering,
  firstDifference,
  neighbourBlocks,
  reportCount,
  transfersFor,
  writeBlock,
} from '@harmony/usb/write';
import { readFlashWindow } from '@harmony/usb/readwindow';
import { QueueError, StateTableError, assertQueueFits, assertStateTableConsistent, parse } from '@harmony/codec/node';
import { ACTION_QUEUE_INSTRUCTIONS, trailerChecksum, worstQueueRun } from '@harmony/codec/internal';

import { profileFor, readConfig } from './read.ts';
import { StampError, stampForWrite } from './stamp.ts';

/** A refusal of the write, before anything was sent or at any point after, as opposed to a fault. */
export class ConfigWriteRefusal extends Error {}

/**
 * What a model's write end needs, which is the firmware's and not the caller's to say.
 *
 * Moved here from `write-config.ts`'s table of units, where each fact sat on every unit of its model, by
 * 7.3.10: the facts are about the model's firmware, and a unit inherits them by naming its model.
 */
export interface ConfigWriteModel {
  /** The architecture every unit of this model reports, which the remote's own version block is checked against. */
  readonly architecture: number;
  /**
   * The firmware builds, as the remote reports them, in whose own image the cache drop and the restart this
   * sends were read before either was sent. A unit reporting any other build is refused a commit, because both
   * commands are the firmware's and not the format's: the 650's were read on its build 0.2 and sent once each
   * before a write depended on them, section 282. The Harmony 700's 2.8 was read against that build, section
   * 299; the script's table said it had been sent neither, which stopped being true with the 700's first
   * configuration write, section 301, and was corrected when 7.3.10 moved the table here. Empty for a model
   * whose build nobody has read yet. **The version string is not a build**: the 600 and the 650 both report 0.2 and differ in 1395 bytes,
   * and 0.2 is listed for both only because section 282 found every routine involved identical.
   */
  readonly sequenceReadOn: readonly string[];
  /**
   * Why `invalidate: false` is refused on this model, or undefined where the control is offered.
   *
   * **The control is the Harmony One's**, section 250: there the drop clears a verdict and nothing the write
   * needs. **On the Harmony 880 and 885 the drop is what keeps the remote off the region**: it moves every
   * lookup to the built in configuration until the next start, and the firmware runs from the same flash part,
   * so without it the remote can look up a block between its erase and its write and read it blank,
   * `tests/test_harmony_885_write_end.py`. A control that measures that is not one to run on an irreplaceable
   * remote, so it is refused rather than offered.
   */
  readonly dropRequired?: string;
  /**
   * The data memory address of the staged install's status byte, where a restart over USB can install
   * firmware, or undefined where it cannot.
   *
   * **On the Harmony 880 and 885 the restart this ends with is an install whenever that byte is not 0**,
   * `reference/architectures/harmony-880-885/firmware.md` "What the bootloader does at power on": the byte at
   * `0x100` survives the processor's `RESET` instruction, which is how `E1 02` ends, and the bootloader then
   * erases the application at `0x010000` and copies 64 KiB over it, status 2 from the staging region and 6 from
   * `0x020000`, 4 and 7 resuming them. A host sets it and the application never does, and nothing this
   * workspace can send to arch 8 writes it, so 0 is expected. **It is read anyway, because the cost of being
   * wrong is the application**: before the first erase, so a nonzero value stops the run with nothing written,
   * and again immediately before the restart, which is withheld unless the byte is still 0. Read with
   * `READ_MISC` selector 7, `readRam`, the path `read-ram.ts` read unit A's clock at `0x108` with,
   * `tests/test_harmony_885_bench_reads.py`; on the Harmony One and the 600 series the install is a different
   * mechanism and this stays undefined.
   */
  readonly installStatusAt?: number;
}

/** The refusal of `invalidate: false` on an 885, `ConfigWriteModel.dropRequired`. */
const ARCH8_DROP_REQUIRED = 'on the Harmony 885 the cache drop moves every lookup to the built in '
  + 'configuration until the restart, and the firmware runs from the same flash part, so without it the '
  + 'remote can read a block between its erase and its write';

/** Data memory `0x100`, the 885's staged install status, `ConfigWriteModel.installStatusAt`. */
const ARCH8_INSTALL_STATUS = 0x100;

/**
 * The models this may write, with what each one's write end needs. **A model here is not a permission**: the
 * unit has to be among the caller's `units`, match its record by its own identity block, and pass every rail
 * in `@harmony/usb`, which keeps its own lists per path.
 */
export const CONFIG_WRITE_MODELS = {
  // **4.4 is the build their write end was read in**, the 885's application, `tests/test_harmony_885_write_end.py`;
  // both bench units report it, version block `44 21 49 01 80 11 08`. The 880 runs the same application, but no
  // 880 is a unit here. `todo-compile-885.md` 1.4.
  'Harmony 885': {
    architecture: 8, sequenceReadOn: ['4.4'], dropRequired: ARCH8_DROP_REQUIRED, installStatusAt: ARCH8_INSTALL_STATUS,
  },
  'Harmony One': { architecture: 12, sequenceReadOn: ['3.4'] },
  'Harmony 650': { architecture: 14, sequenceReadOn: ['0.2'] },
  // The same build as the 650, `600-0.2-code-base0x9000-COMPLETE.bin`, read off the bench unit.
  'Harmony 600': { architecture: 14, sequenceReadOn: ['0.2'] },
  // 2.8, which the bench unit runs since section 297: the drop is read in section 299 and the restart in 97.
  // Its first configuration change, a power on delay raised and put back, is section 301.
  'Harmony 700': { architecture: 14, sequenceReadOn: ['2.8'] },
} as const satisfies Readonly<Record<string, ConfigWriteModel>>;

export type ConfigWriteModelName = keyof typeof CONFIG_WRITE_MODELS;

/** One unit a caller may write, as the caller records it. */
export interface ConfigWriteUnit {
  /** What the account calls it, `the spare Harmony One`. */
  readonly name: string;
  /** The name of its record, which `UnitRecords` is asked for. */
  readonly label: string;
  readonly model: ConfigWriteModelName;
  /**
   * The names of the region reads that are this unit's own content, each read whole blocks from the
   * configuration's base. The region read handed in has to be one of them, so that one unit is never compared
   * against another's content.
   */
  readonly regions: ReadonlySet<string>;
}

/** Where a caller keeps its units' records: the text of each, and where it is kept, for a refusal's wording. */
export interface UnitRecords {
  text(label: string): string | undefined;
  where(label: string): string;
}

/** Which stamp the configuration is written with. */
export type ConfigWriteStamp =
  /** The moment of writing, the ordinary case. */
  | { readonly kind: 'now'; readonly at: Date }
  /** The file's own, for a compile put back unchanged; the script's `--as-is`, and implied by `only`. */
  | { readonly kind: 'as-is' }
  /**
   * The stamp a run that stopped past its erase saved over the file, which is what its blocks hold, so the
   * file is written as it is. `journal` names that run's journal; `stoppedAfterErase` in `stamp.ts` decides.
   */
  | { readonly kind: 'resume'; readonly journal: string };

export interface ConfigWrite {
  /** The configuration: the name it is known by in the account, a path for the script, and its bytes. */
  readonly config: { readonly name: string; readonly bytes: Uint8Array };
  /** The region read the unit's content is compared against: its name, one of a unit's `regions`, and its bytes. */
  readonly region: { readonly name: string; readonly bytes: Uint8Array };
  /** Every unit this caller may write. The one on the cable is chosen by what it reports, never by the caller. */
  readonly units: readonly ConfigWriteUnit[];
  readonly records: UnitRecords;
  readonly stamp: ConfigWriteStamp;
  /** Write. Without it the run reads only and says what a commit would do, the script's dry run. */
  readonly commit: boolean;
  /**
   * Send the cache drop before the first erase, the ordinary write; false is section 250's control, the
   * script's `--no-invalidate`, and refused on a model whose drop is required.
   */
  readonly invalidate: boolean;
  /** Send the restart at the end, the ordinary write; false is section 247's control, `--no-restart`. */
  readonly restart: boolean;
  /**
   * Send one command and write nothing, on a remote that already holds the configuration: the drop, section
   * 250's isolating control, `--drop-only`, or the restart, section 282, `--restart-only`.
   */
  readonly only?: 'drop' | 'restart';
  /** Open the one remote to write, after every check that needs no remote has passed. */
  open(): Promise<{ readonly remote: HarmonyRemote; readonly productId: number }>;
  /** The stamped bytes, to keep before the first command that changes the remote, so a rerun finds them. */
  saveStamped(bytes: Uint8Array): void;
  /** Each line of the account, without its newline, as it happens. */
  readonly say?: (line: string) => void;
  /** True the instant before the first erase goes out, false once its block is verified, as `writeBlock` sets it. */
  readonly onPastTheErase?: (value: boolean) => void;
  /** A line that is not part of the account: a close that failed before any restart was sent. */
  readonly warn?: (line: string) => void;
}

export interface ConfigWriteResult {
  /** How the run ended: nothing differed, a dry run, one of the two controls, or a written configuration. */
  readonly outcome: 'nothing to write' | 'dry run' | 'dropped' | 'restarted' | 'written';
  readonly architecture: number;
  /** The unit it ran against, by `ConfigWriteUnit.name`. */
  readonly unit: string;
  readonly firmware: string;
  /** The stamp written, when this run stamped. */
  readonly stampedAt?: string;
  /** The blocks that differ from the region read, as flash addresses, written when `outcome` is `written`. */
  readonly blocks: readonly number[];
  readonly changedBytes: number;
  /** Whether the restart was sent. */
  readonly restarted: boolean;
}

/**
 * Write `request.config` to the unit on the cable, as the header lists. Resolves with what was done; throws a
 * `ConfigWriteRefusal` for every refusal, and lets a fault of the remote or of a rail through as it is.
 */
export async function writeConfiguration(request: ConfigWrite): Promise<ConfigWriteResult> {
  const say = request.say ?? ((): void => undefined);
  const { config, region, units } = request;
  const configPath = config.name;
  const dumpName = region.name;
  const dump = region.bytes;
  const commit = request.commit;
  const dropOnly = request.only === 'drop';
  const restartOnly = request.only === 'restart';
  const invalidate = request.invalidate;
  const restart = request.restart;
  const onPastTheErase = request.onPastTheErase ?? ((): void => undefined);

  // Keyed by what the device says, never by an argument, for the reason `rehearse-block.ts` gives. Several
  // units per architecture, and the 600 and the 650 enumerate identically, so the region read names which
  // unit is expected and the identity block read off the remote is what refuses any other. Integer keys
  // iterate in ascending order, which is the order a refusal lists them in.
  const targets: Record<number, ConfigWriteUnit[]> = {};
  for (const unit of units) {
    const { architecture } = CONFIG_WRITE_MODELS[unit.model];
    (targets[architecture] ??= []).push(unit);
  }

  let wanted: Uint8Array = config.bytes;

  // The stamp, before every other check so that they all run on the bytes that will be written.
  // `stampForWrite` checks the file's own checksum first, since stamping recomputes it.
  let stampedAt: string | undefined;
  if (request.stamp.kind === 'as-is') {
    say('--as-is: the file is written with its own stamp');
  } else if (request.stamp.kind === 'resume') {
    say(`${request.stamp.journal} erased flash and never read the configuration back, so this is its `
      + 'rerun: the file is written with the stamp that run saved, which is what its blocks hold');
  } else {
    try {
      const result = stampForWrite(wanted, request.stamp.at);
      wanted = result.bytes;
      stampedAt = result.at;
      say(`stamped ${result.at}: the build timestamp and the clock records, which the remote's `
        + 'clock is set back to at every restart');
    } catch (error) {
      if (!(error instanceof StampError)) throw error;
      throw new ConfigWriteRefusal(`${configPath}: ${error.message}. It would also be refused by the remote at boot`);
    }
  }
  const stamped = stampedAt !== undefined;

  // **The one check the remote itself makes, performed before anything is erased.** A container
  // whose trailer disagrees with its bytes is one the boot validator refuses, and the failure would
  // be discovered with the configuration already half replaced. `applyEdits` stamps this, so a file
  // that came out of the codec passes; a file that was truncated in transit does not.
  const container = parse(wanted);
  const computed = trailerChecksum(wanted);
  if (container.trailerChecksum !== computed) {
    throw new ConfigWriteRefusal(`${configPath} states checksum 0x${container.trailerChecksum.toString(16)} and its bytes `
      + `give 0x${computed.toString(16)}: it is damaged, and the remote would refuse to boot it`);
  }
  say(`${configPath}: ${wanted.length} bytes, trailer checksum `
    + `0x${computed.toString(16)}, which recomputes`);

  // **A check the remote does not make, which is exactly why it is here.** An action list is
  // spooled into a ring of forty instructions and every push into a full ring is discarded without
  // a word, so a config that asks for more runs and quietly does less than it says. Section 238.
  try {
    assertQueueFits(container);
  } catch (error) {
    if (!(error instanceof QueueError)) throw error;
    throw new ConfigWriteRefusal(`${configPath} overflows the remote's action queue: ${error.message}. The remote would `
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
    throw new ConfigWriteRefusal(`${configPath} has an inconsistent state variable table: ${error.message}. The remote `
      + 'would accept it and overwrite those variables at every boot, so it is refused here');
  }
  const worst = worstQueueRun(container);
  if (worst !== undefined) {
    say(`deepest action list: ${worst.peak} of ${ACTION_QUEUE_INSTRUCTIONS} queue `
      + `slots, at list ${worst.list}`);
  }

  if (wanted.length > dump.length) {
    throw new ConfigWriteRefusal(`the config is ${wanted.length} bytes and ${dumpName} covers ${dump.length}: the dump has `
      + 'to reach at least as far as the config, since the blocks past its end are still erased');
  }

  const { remote, productId } = await request.open();
  /** Whether the restart has gone out, which is what makes a failing close expected. */
  let resetSent = false;
  try {
    // A previous session that died mid read leaves the remote streaming, and the first question
    // asked here would be answered with its leftovers. Section 242, the second device write.
    await remote.drainLeftovers();
    const versionBytes = await remote.getVersion();
    const architecture = architectureFromVersion(versionBytes);
    if (architecture === undefined) {
      throw new ConfigWriteRefusal('the remote did not say which architecture it is');
    }
    const identity = readVersion(versionBytes);
    say(`firmware ${identity.firmware}, flash id ${identity.flash}, `
      + `architecture ${architecture}, skin ${identity.skin}`);

    const candidates = targets[architecture];
    if (candidates === undefined) {
      throw new ConfigWriteRefusal(`architecture ${architecture} has no unit this may write to `
        + `(${Object.entries(targets).map(([a, t]) => `${a}: ${t.map((one) => one.name).join(' or ')}`).join(', ')})`);
    }
    const unit = candidates.find((one) => one.regions.has(dumpName));
    if (unit === undefined) {
      throw new ConfigWriteRefusal(`${dumpName} is not one of the region reads of an architecture ${architecture} `
        + `unit (${candidates.map((one) => `${one.name}: ${[...one.regions].join(', ') || 'none registered yet'}`).join('; ')}). `
        + "Refusing rather than comparing one unit against another's content.");
    }
    const model: ConfigWriteModel = CONFIG_WRITE_MODELS[unit.model];
    if (commit && !model.sequenceReadOn.includes(identity.firmware)) {
      throw new ConfigWriteRefusal(`${unit.name} reports firmware ${identity.firmware}, and the cache drop and the `
        + `restart this sends have been read in ${model.sequenceReadOn.length === 0 ? 'no build of it yet'
          : `build ${model.sequenceReadOn.join(' and ')} only`}. Read both in that build's image first.`);
    }
    // Before the unit check and before any comparison, so that a run which would leave the remote reading
    // a region while it is erased stops having read nothing but the version and the identity. Not only on
    // a commit: a dry run that says what a commit would do should not describe a sequence this refuses.
    if (!invalidate && model.dropRequired !== undefined) {
      throw new ConfigWriteRefusal(`--no-invalidate is refused for ${unit.name}: ${model.dropRequired}`);
    }
    const stored = request.records.text(unit.label);
    if (stored === undefined) {
      throw new ConfigWriteRefusal(`the lab has no recorded identity for ${unit.label}, so nothing `
        + 'can say whether the remote on the cable is the one this may write to. Two remotes of one '
        + `model enumerate identically. Write it to ${request.records.where(unit.label)}`);
    }
    const permitted = unitIdentityFromText(stored);
    const identityBlock = await remote.readUnitIdentity();
    assertUnitIsPermitted({ identityBlock, permittedUnit: permitted });
    say(`unit identity ${unitIdentityText(identityBlock).slice(0, 8)}..., which `
      + `matches the recorded ${unit.label}`);

    const base = CONFIG_REGION_BASE[architecture];
    const blockSize = ERASE_BLOCK_SIZE[architecture];
    const ceiling = WRITABLE_CEILING[architecture];
    if (base === undefined || blockSize === undefined || ceiling === undefined) {
      throw new ConfigWriteRefusal(`architecture ${architecture} has no write target`);
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
        ? ', so there is nothing to compare: this container carries no wrapper'
        : `, ${comparison.mismatched.length} disagreeing`));

    /**
     * Read the whole container off the remote and refuse unless it is the file, byte for byte.
     *
     * **One derivation with two callers**, which is why it is a local rather than two copies: it is
     * the post write check that no per block read back can make, and it is the drop only control's
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
      say('reading the configuration back to compare with the file');
      const reread = await readConfig(remote, profileFor(productId));
      if (reread.retries > 0) {
        say(`${reread.retries} window(s) had to be asked for again`);
      }
      const back = reread.bytes;
      if (back.length !== wanted.length) {
        throw new ConfigWriteRefusal(`the remote now holds ${back.length} bytes and the file is `
          + `${wanted.length}: a same length edit cannot change a container's length`);
      }
      const wrong = firstDifference(back, wanted);
      if (wrong !== undefined) {
        throw new ConfigWriteRefusal(`the configuration read back differs from ${configPath} at offset `
          + `0x${wrong.toString(16)}: 0x${back[wrong]!.toString(16)} on the device, `
          + `0x${wanted[wrong]!.toString(16)} in the file`);
      }
      say('the whole configuration reads back byte for byte identical to the file. '
        + "A config we produced is on the remote.");
    };

    /**
     * Read the staged install's status byte, report it, and refuse unless it is 0, on a model that has
     * one, `ConfigWriteModel.installStatusAt`. A no op elsewhere.
     *
     * **Two bytes from the status's address and not one**, the status and its neighbour, so that every
     * read here is an even count the way the odd count rail asks of a read of program memory. That rail is
     * about `READ_FLASH` into internal memory and `READ_MISC` selector 7 reads one byte per exchange, so
     * nothing hangs on a single byte; the even pair is kept because it costs one exchange and leaves no
     * read in this sequence that a reader has to argue is the exception. Only the first byte is judged.
     *
     * `readRam` is the path `read-ram.ts` uses, and it takes the value from the byte of the reply the
     * architecture puts it in, which `getVersion` has already pinned for this handle above.
     */
    const installStatusIsClear = async (moment: 'before the first erase' | 'before the restart'): Promise<void> => {
      const at = model.installStatusAt;
      if (at === undefined) return;
      const status = await remote.readRam(at);
      const neighbour = await remote.readRam(at + 1);
      say(`install status at data 0x${at.toString(16)} ${moment}: ${status} `
        + `(0x${(at + 1).toString(16)} holds ${neighbour})`);
      if (status === 0) return;
      throw new ConfigWriteRefusal(moment === 'before the first erase'
        ? `the staged install status at data 0x${at.toString(16)} reads ${status}, and on ${unit.name} the `
          + 'restart a write ends with installs firmware over the application whenever it is not 0. Nothing '
          + 'was erased or written. Do not restart the remote over USB; report the value before going on'
        : `the configuration is written and reads back identical to the file, and the restart is withheld: `
          + `the staged install status at data 0x${at.toString(16)} reads ${status}, and on ${unit.name} `
          + 'E1 02 with that byte set erases the application and copies 64 KiB over it. Leave the remote '
          + 'as it is, running on its built in configuration, and report the value. A battery pull restarts '
          + 'it without an install, since the bootloader clears the request after any reset but the RESET '
          + 'instruction, reference/architectures/harmony-880-885/firmware.md; decide that step once the '
          + 'value is understood, and do not rerun this script');
    };

    /**
     * One erase block, read in transfers the announce's count field can state.
     *
     * **Each transfer is asked for again on a failure, through the shared `readFlashWindow`**, since
     * `todo-compile-885.md` 2.1's first commit stopped here: a `flash chunk out of sequence` during the
     * compare before the first erase ended the run with nothing written, as such breaks had ended region
     * reads on both bench 885s (`docs/test-notes/harmony-885.md`). Every read this helper makes is a read,
     * whether it is the compare before an erase, a neighbour check or the read back after a write, so asking
     * again is safe; the bound and the reasoning are `readwindow.ts`'s. Each retry is reported, because a
     * write whose read back needed a second go is one to know about.
     */
    const readBlock = async (address: number): Promise<Uint8Array> => {
      const out = new Uint8Array(blockSize);
      for (let done = 0; done < blockSize; done += MAX_TRANSFER) {
        const length = Math.min(MAX_TRANSFER, blockSize - done);
        const { bytes } = await readFlashWindow(remote, address + done, length, (retry) => {
          say(`read of 0x${retry.at.toString(16)} asked for again (attempt ${retry.attempt}): ${String(retry.error)}`);
        });
        if (bytes.length !== length) {
          throw new ConfigWriteRefusal(`read ${bytes.length} of ${length} bytes at 0x${(address + done).toString(16)}`);
        }
        out.set(bytes, done);
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

    const result = (outcome: ConfigWriteResult['outcome'], blocks: readonly number[], changedBytes: number): ConfigWriteResult => ({
      outcome,
      architecture,
      unit: unit.name,
      firmware: identity.firmware,
      ...(stampedAt === undefined ? {} : { stampedAt }),
      blocks,
      changedBytes,
      restarted: resetSent,
    });

    // Which blocks differ, which is the arithmetic that decides what gets erased. In `rehearsal.ts`
    // with a test, because a boundary read the wrong way erases one block of a pair and leaves the
    // other holding the old byte, and every per block read back would still pass.
    const blocks = blocksDiffering(dump, target, base, blockSize);
    if (blocks.length === 0 && !dropOnly && !restartOnly) {
      say('the config is byte identical to the dump: there is nothing to write');
      return result('nothing to write', blocks, 0);
    }
    // **The drop only control wants exactly this case**, and that is the point rather than a leniency: the
    // control sends a command to a remote whose configuration is already the file, so a run with
    // blocks to write would be measuring the drop and the write together, which is the confusion it
    // exists to resolve. Everything below then loops over an empty plan and the dump comparison
    // measures nothing, so the precondition that matters is the container read the branch performs.
    if ((dropOnly || restartOnly) && blocks.length !== 0) {
      throw new ConfigWriteRefusal(`${dropOnly ? '--drop-only' : '--restart-only'} wants a remote that already `
        + `holds ${configPath}, and `
        + `${blocks.length} block(s) differ from ${dumpName}. Write it first, or name the dump and `
        + 'config that match what is on the device.');
    }
    const changedBytes = [...dump].reduce((n, b, at) => (b === target[at] ? n : n + 1), 0);
    say(`${changedBytes} byte(s) differ from ${dumpName}, in `
      + `${blocks.length} block(s): ${blocks.map((b) => `0x${b.toString(16)}`).join(', ')}`);

    for (const block of blocks) {
      if (block % blockSize !== 0) throw new ConfigWriteRefusal(`0x${block.toString(16)} is not aligned`);
      if (block < base) throw new ConfigWriteRefusal(`0x${block.toString(16)} is below the config region`);
      if (block + blockSize > ceiling) {
        throw new ConfigWriteRefusal(`0x${block.toString(16)} runs past the writable ceiling `
          + `0x${ceiling.toString(16)}, below which the stored application firmware sits`);
      }
      if (block - base + blockSize > dump.length) {
        throw new ConfigWriteRefusal(`block 0x${block.toString(16)} runs past the end of ${dumpName}, so the `
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
    // rewritten, which is the one state this sequence must not create.
    let interrupted = 0;
    for (const plan of plans) {
      say(`reading 0x${plan.block.toString(16)} off the remote to compare`);
      const live = await readBlock(plan.block);
      const differs = firstDifference(live, plan.intended);
      // **A block an earlier run erased and did not finish writing is known content too**, which the
      // failure message promised and this compare did not deliver until 3 September 2026:
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
          + 'then erased flash'}, so what an erase would destroy is known`);
        continue;
      }
      if (differs !== undefined) {
        throw new ConfigWriteRefusal(`the remote and ${dumpName} differ at `
          + `0x${(plan.block + differs).toString(16)}: 0x${live[differs]!.toString(16)} on the `
          + `device, 0x${plan.intended[differs]!.toString(16)} in the dump. Refusing: the dump is `
          + "not this unit's current content, so what an erase would destroy is unknown. Take a "
          + 'fresh region read.');
      }
    }
    say(interrupted === 0
      ? `every block matches ${dumpName} byte for byte, so what the erase would destroy is known`
      : `every block matches ${dumpName} byte for byte but ${interrupted} holding an interrupted `
        + 'write of this file, so what the erase would destroy is known');

    for (const plan of plans) {
      if (plan.neighbours.length !== 2) {
        say(`0x${plan.block.toString(16)}: only ${plan.neighbours.length} `
          + 'neighbouring block(s) can be checked');
      }
    }
    const totalPackets = plans.reduce((n, p) => n + p.packets, 0);
    say(`plan: per block, read the neighbours, erase 0x${blockSize.toString(16)} `
      + `bytes, check the neighbours again, write it back and read it back. `
      + `${plans.length} erase(s), ${totalPackets} reports in total`);

    // **Before anything is sent that changes the remote**, and in a dry run too, so that a remote whose
    // restart would be an install is found by the run that writes nothing. On the 885s only.
    await installStatusIsClear('before the first erase');

    if (!commit) {
      say('dry run: nothing was written. Add --commit, with '
        + 'HARMONY_ENABLE_WRITES=1 and HARMONY_FIRST_WRITE=1, to perform it');
      return result('dry run', blocks, changedBytes);
    }

    assertFirstWriteAllowed();
    // Saved before the first command that changes the remote, so that whatever happens next the caller
    // holds the bytes the remote is being given, and a rerun can find them. The account says so.
    if (stamped) {
      request.saveStamped(wanted);
      say(`saved the stamped configuration over ${configPath}`);
    }
    const permission = {
      architecture,
      configLength: dump.length,
      // Measured, block by block, in the loop above. **On a drop only run there are no blocks
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
      say('--drop-only: sending the cache drop and nothing else. No erase, no write, no restart');
      await remote.invalidateCachedRegions(permission);
      // Section 250's clock experiment is a Harmony One's; on arch 14 the next erase consumes the drop's
      // flag instead, section 282, and on arch 8 the remote runs on its built in configuration until it
      // next starts, `tests/test_harmony_885_write_end.py`, so the advice differs per architecture.
      say(architecture === 12
        ? 'the drop is sent. The remote keeps running; its verdict byte is now clear. Read its '
          + 'clock, pull the cable, plug it back in, and read the clock again: a running time that '
          + 'starts over is a restart the drop caused with no write anywhere in the chain'
        : architecture === 8
          ? 'the drop is sent. The remote now looks everything up in its built in configuration, and '
            + 'goes on doing so until it next starts; --restart-only or a battery pull ends it'
          : 'the drop is sent. The remote keeps running with its verdict clear and a flag set that the '
            + 'next erase consumes; a restart or a battery pull clears both');
      return result('dropped', blocks, changedBytes);
    }
    if (restartOnly) {
      await containerMatchesTheFile();
      say('--restart-only: sending the restart and nothing else. No drop, no erase, no write');
      await installStatusIsClear('before the restart');
      await remote.resetDevice(permission);
      resetSent = true;
      say('the restart is sent. The remote leaves the bus and comes back on its own; '
        + 'give it a few seconds before enumerating again');
      return result('restarted', blocks, changedBytes);
    }

    // **On arch 14 the drop also arms the first erase after it**, section 282: that erase clears the
    // flag wherever it is, and only an erase at exactly `0x030000` then updates a setting in the
    // remote's settings store. This writes only the blocks that differ, in ascending order, so a run
    // that leaves the first block alone spends the flag on another block and never touches the store.
    if (invalidate) {
      say('dropping the cached region descriptors, so nothing references the config while it '
        + 'changes, and so the remote re-checks what we write');
      // **On arch 8 the drop is the whole of the protection while the blocks change**: the remote looks
      // up the built in configuration from here until it restarts, so nothing it does reads a block this
      // run is erasing. Said in the account so that a run which stops part way says what the remote is
      // running on, which is the first thing an operator looking at its screen will want to know.
      if (architecture === 8) {
        // Worded after the review of 1.4: the built in configuration covers only until the next start, and a
        // battery pull is a start, which checks whatever the region then holds.
        say('arch 8: from the drop until the restart the remote runs on its built in configuration; a run '
          + 'that stops part way leaves the region half written, and the next start, a battery pull included, '
          + 'checks it, so do not unplug or pull the batteries, report the stop');
      }
      if (architecture === 14) {
        say(blocks[0] === base
          ? 'arch 14: the first erase is the configuration\'s first block, so the remote will also '
            + 'look at setting 0x80 in its settings store and write it if its bit 0 is set, section 282'
          : `arch 14: the first erase is 0x${blocks[0]!.toString(16)}, not the configuration's first `
            + 'block, so the drop\'s flag is spent there and the settings store is left alone, '
            + 'section 282');
      }
      await remote.invalidateCachedRegions(permission);
    } else {
      say("--no-invalidate: the drop is deliberately not sent, which is section 250's control. "
        + 'The remote is expected to keep its old verdict, check nothing, and show no screen');
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
        log: say,
        onPastTheErase,
        coversBlock: (address) => address >= base && address - base + blockSize <= dump.length,
        sourceName: dumpName,
      });
    }

    // **The check the per block read backs cannot make.** Each block verified the range it wrote;
    // this reads the whole container off the remote and compares it with the file, so a block that
    // was never written, or written in the wrong order, or a run of the config that fell between two
    // blocks, all show up here and nowhere else.
    await containerMatchesTheFile();

    // **Step 7, and it is the last thing this does on purpose.** concordance ends a config
    // write with a device reset and waits for the remote to come back, which is the battery pull
    // this bench has performed by hand after every write, section 245. Nothing acknowledges a
    // command that ends in a reset, so there is nothing to wait for here.
    // **Measured on the first run that sent it, section 247: the close then succeeded.** This said
    // the handle was finished and the close was expected to complain, and it is not: on macOS the
    // handle survives the escape long enough to close cleanly, and the remote leaves the bus
    // afterwards. The arm in the `finally` still catches the other case rather than assuming this one.
    if (restart) {
      // **Immediately before the restart, on the 885s**: the configuration is written and verified by now,
      // so a refusal here leaves it in place and withholds only the command that would install firmware.
      await installStatusIsClear('before the restart');
      say('restarting the remote, which is what a battery pull was doing by hand');
      await remote.resetDevice(permission);
      resetSent = true;
      say('the restart is sent. The remote leaves the bus and comes back on its own; '
        + 'give it a few seconds before enumerating again');
      // **Only a start takes up a new configuration on arch 8**: the start check and the sizing of the
      // state variables run at a start and at no other moment, so the restart is what makes the remote
      // use what was just written, and it comes back through its bootloader.
      if (architecture === 8) {
        say('arch 8: the remote comes back through its bootloader and checks the new configuration at '
          + 'its start, the only moment it does');
      }
    } else {
      say('--no-restart: the restart is deliberately not sent, which is section 247\'s control. '
        + 'The remote stays on the bus; a battery pull is the only other way to restart it');
    }
    return result('written', blocks, changedBytes);
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
        say('(the handle was already gone, which is what a restart does)');
      } else {
        request.warn?.(`(the device did not close cleanly: ${String(error)})`);
      }
    }
  }
}
