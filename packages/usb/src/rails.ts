/**
 * The write rails, in the library rather than in the user interface.
 *
 * That placement is the whole point. A rail enforced by a dialog box is enforced until somebody
 * writes a script; a rail enforced here is enforced for every caller. `CLAUDE.md` states these as
 * absolute, and the reason they are absolute rather than cautious is that the devices are
 * irreplaceable and the service that made them can be withdrawn without notice: there is no
 * dependable way back from a bad write, only a dump taken beforehand. (This said "Logitech's
 * recovery servers are gone", which is wrong and `CLAUDE.md` corrects it: the MyHarmony service
 * answered on 7 August 2026 and compiled a config. The classic service is the one that is gone.
 * The rail does not change, because the half that carries it is that a remote is irreplaceable.)
 *
 * Nothing in this module talks to a device. It answers one question, "is this write allowed", and
 * the answer is no unless every condition is met.
 */

import { ESCAPE_END_SESSION, ESCAPE_SUB_COMMANDS } from './protocol.ts';

export class RailError extends Error {}

/**
 * The base of the user config region, per architecture. A write outside it is refused here.
 *
 * These are not guesses: they are where each architecture's user config is stored, and the
 * firmware itself reads the container from there.
 *
 * **This floor is what keeps a mistyped address away from the safe mode image, and on arch 14 it is
 * the only thing that does.** The Harmony One's firmware has an interlock of its own, section 175: a
 * write below `0x020000`, where safe mode lives at `0x002000`, needs a bit that is set at boot and on
 * every main loop pass, and only an ERASE_FLASH below `0x020000` clears it. So a stray low write there
 * does nothing. **Do not read that as cover.** Arch 14 has no such bit in either write executor, the
 * ordering that would let a low write slip through the Harmony One's interlock is unread, and section
 * 175 records two confident readings of this same bit that were both wrong. Losing safe mode is what
 * section 118 measured turning a recoverable remote into a stranded one, so the floor refuses rather
 * than reasons.
 */
export const CONFIG_REGION_BASE: Readonly<Record<number, number>> = {
  12: 0x040000, // Harmony One
  14: 0x030000, // Harmony 600 and 700
};

/**
 * Architectures that have a write target at all.
 *
 * Seven remotes are on the bench: a programmed Harmony One, a Harmony 600, a spare Harmony One,
 * a Harmony 525, which is arch 9 and has no write target either, and since 27 August 2026 a Harmony
 * Touch, a Harmony 350 and a Harmony 300, none of which this library can even open. The spare is the only unit
 * anything may be written to, and it is arch 12. It is no longer unprogrammed: Logitech's own
 * software synced a config to it on 7 August 2026, section 58, and its original contents are
 * verified in the lab. **So arch 14 has no write target**, and writing to it stays refused until a second
 * arch 14 remote exists. Reading arch 14 is unaffected, which is the point of keeping this
 * separate from the read paths.
 */
export const ARCHITECTURES_WITH_A_WRITE_TARGET: readonly number[] = [12];

/**
 * The highest address a write or an erase may reach, per architecture.
 *
 * **Not the same as the top of the config region, and that is the point.** Arch 12's config region
 * is nominally `0x040000` to `0x400000`, which is the range the log area's own writer enforces,
 * section 47. But Logitech's client declares the remote's stored application firmware at
 * `0x3D0000`, inside that range, so the last 192 KiB of the nominal region is not spare at all.
 * A writer that trusted the nominal top would erase the firmware.
 *
 * **Measured on 9 August 2026, on a Harmony One, and it was right.** This was adopted from the
 * vendor client as an unconfirmed number, on the argument that it only makes the rail refuse more,
 * with a note to confirm it before anything relied on it. Reading the remote's own flash at
 * `0x3D0000` returns an image header with the `48 47` magic and version `0x34`, byte identical to
 * the 3.4 package's application phase and to the running copy at `0x020000`. So the top 192 KiB of
 * the nominal config region holds the firmware, on the actual device, and **on both Harmony Ones**:
 * the programmed one has had nothing but reads from this project, so this is a property of the
 * model rather than something a vendor sync left behind. `docs/findings.md` section 88.
 *
 * That read had never happened before because this library refused the address: arch 14's bound had
 * been applied to arch 12 as well. Worth remembering as a shape: a wrong refusal hides whatever it
 * refuses, and the thing it was hiding here is the reason this constant exists.
 */
export const WRITABLE_CEILING: Readonly<Record<number, number>> = {
  12: 0x3d0000,
};

/**
 * The flash erase block size, per architecture.
 *
 * `ERASE_FLASH` carries an address and no count, so the caller cannot scope an erase and the
 * hardware decides how much goes. Logitech's client picks a block table from the flash chip's
 * JEDEC manufacturer and device id, and for every chip it lists against arch 12 the region above
 * `0x010000` is uniform 64 KiB blocks, so an erase anywhere in the config region takes 64 KiB
 * with it. The boot block area below `0x010000` is finer and **its shape is per chip**, section
 * 221: eight 8 KiB blocks on the part both bench Harmony Ones report, `16K, 8K, 8K, 32K` on one of
 * the others. Either way it is outside the config region and therefore outside anything this
 * module permits.
 *
 * **The row for the bench part is identified since 30 August 2026**, section 221, which is the
 * confirmation the paragraph below asks for rather than only proposes: the remotes report `1F:C8`,
 * that is Atmel `AT49BV322A` in the client's own constants, and walking its table from zero puts
 * `0x040000` on a boundary in a 64 KiB block. `tests/test_host_client.py` asserts this constant
 * against that walk.
 *
 * **Provenance is not the same as `WRITABLE_CEILING`'s, and this said it was.** That one was adopted
 * from the client and then **measured on two Harmony Ones**, section 88. This one is still the
 * client's word alone: `docs/host-client.md` says so, and the firmware argument sometimes offered
 * for it establishes a 64 KiB **addressing window** rather than the chip's erase sector, which are
 * different quantities. The direction is still safe, since a rail built on a block size only ever
 * refuses more addresses than a smaller true block would require. What it did **not** protect was
 * `rehearse-block.ts`, which reads back and restores exactly one block: if the true block were
 * larger the erase would reach past what it rewrites, and a run that only ever looked at the block
 * it wrote would report success. **That script measures it now**, since 30 August 2026: it reads
 * the block either side before the erase and again after it and refuses if either moved, so the
 * first run ever performed turns this constant from the client's word into a measurement on the
 * unit in front of it. No evidence suggests it is larger, since all three of the client table's arch
 * 12 rows give uniform 64 KiB above the boot area and the bench part's row is one of them, section
 * 221. What is still unmeasured is the chip rather than the table: a row says what Logitech believed
 * a part does.
 */
export const ERASE_BLOCK_SIZE: Readonly<Record<number, number>> = {
  12: 0x10000,
};

/**
 * The build flag. Off unless the environment says otherwise, and it is read once, here.
 *
 * Version 1 of the application is read only: the write code exists so that it is written and
 * reviewed rather than improvised later, and it does not run. An environment variable rather than
 * a compile time constant because it has to be provable from the outside: you can check what a
 * shipped build will do without reading it.
 */
export const WRITES_ENABLED: boolean = process.env['HARMONY_ENABLE_WRITES'] === '1';

/**
 * Everything that has to be true before a write is even considered.
 *
 * Deliberately not defaulted. A caller that has not thought about whether there is a verified
 * dump of this exact unit cannot construct one of these by accident, and the two booleans are
 * facts about the world that no code here can check for itself.
 */
export interface WritePermission {
  /** The architecture of the connected remote, as the remote itself reports it. */
  readonly architecture: number;
  /** Length in bytes of the config being written, which bounds the region. */
  readonly configLength: number;
  /** A verified original dump of this exact unit exists in the lab. */
  readonly originalDumpVerified: boolean;
  /**
   * The config's `INTENDEDVERSION` matches the connected remote over all **six** compared fields:
   * protocol, skin, flash, board, `SOFTWARETYPE` and `ARCHITECTURE`. Section 87.
   *
   * **This said four fields until 29 August 2026**, which matters more here than in a document: a
   * caller reading it would check four, assert this flag on a four field match, and the rail would
   * pass a config built for a different remote. `SOFTWARETYPE` is the field separating a remote
   * running normally from one in safe mode. An absent or empty field matches anything.
   */
  readonly intendedVersionMatches: boolean;
  /** The unit is the spare remote. Nothing else is ever a write target. */
  readonly targetIsTheSpareRemote: boolean;
}

function assertPermissionIsUsable(p: WritePermission): void {
  if (!WRITES_ENABLED) {
    throw new RailError(
      'writing is disabled: this build is read only (set HARMONY_ENABLE_WRITES=1 knowing why)',
    );
  }
  if (!ARCHITECTURES_WITH_A_WRITE_TARGET.includes(p.architecture)) {
    throw new RailError(
      `architecture ${p.architecture} has no write target on the bench, so writing to it is refused`,
    );
  }
  if (!p.targetIsTheSpareRemote) {
    throw new RailError('the spare remote is the only write target');
  }
  if (!p.originalDumpVerified) {
    throw new RailError('no verified original dump of this unit: refusing to write');
  }
  if (!p.intendedVersionMatches) {
    throw new RailError("the config's INTENDEDVERSION does not match the connected remote");
  }
}

/** The half-open range a write may touch, for the architecture in `p`. */
export function writableRange(p: WritePermission): { start: number; end: number } {
  const start = CONFIG_REGION_BASE[p.architecture];
  if (start === undefined) {
    throw new RailError(`no config region recorded for architecture ${p.architecture}`);
  }
  if (!Number.isInteger(p.configLength) || p.configLength <= 0) {
    throw new RailError(`implausible config length ${p.configLength}`);
  }
  const end = start + p.configLength;
  const ceiling = WRITABLE_CEILING[p.architecture];
  // **A hole in the table is a refusal, not "no ceiling".** This read `ceiling !== undefined &&`,
  // so an architecture with a config region and no recorded ceiling got an unbounded write, while
  // `assertEraseAllowed` reads the identical hole as a refusal. Two rails, one table, opposite
  // readings, and section 88's stated rule is that a table with a hole refuses. It is unreachable
  // today because `ARCHITECTURES_WITH_A_WRITE_TARGET` is `[12]` and arch 12 (Harmony One) has both
  // entries; adding arch 14 (Harmony 600) when a second unit arrives would have silently given its
  // writes no upper bound while its erases still refused. Section 139.
  if (ceiling === undefined) {
    throw new RailError(
      `no writable ceiling recorded for architecture ${p.architecture}: refusing to write`,
    );
  }
  if (end > ceiling) {
    throw new RailError(
      `a config of ${p.configLength} bytes at 0x${start.toString(16)} ends at ` +
        `0x${end.toString(16)}, past the writable ceiling 0x${ceiling.toString(16)}`,
    );
  }
  return { start, end };
}

/**
 * Throws unless `count` bytes at `address` may be written. Never returns false: a refusal has a
 * reason, and a boolean loses it at exactly the moment somebody needs to know why.
 */
export function assertFlashWriteAllowed(
  p: WritePermission,
  address: number,
  count: number,
): void {
  assertPermissionIsUsable(p);
  const { start, end } = writableRange(p);
  if (count <= 0) throw new RailError(`a write of ${count} bytes is not a write`);
  if (address < start || address + count > end) {
    throw new RailError(
      `write of ${count} bytes at 0x${address.toString(16)} leaves the config region ` +
        `0x${start.toString(16)}..0x${end.toString(16)}`,
    );
  }
}

/**
 * The erase block size and the ceiling for an architecture, or a refusal naming which is missing.
 *
 * **Exported so the refusal can be tested at all.** Inside `assertEraseAllowed` it sat after
 * `assertPermissionIsUsable`, which already refuses every architecture outside
 * `ARCHITECTURES_WITH_A_WRITE_TARGET`, and that list is `[12]`, which has both entries. So the
 * branch was unreachable through any caller, and the rail nobody can trigger is the rail nobody has
 * tested: `rails.test.ts` checked the table's shape instead, which is the same defect one level up.
 * The lookup is the thing with a rule in it, so it is a function with a test rather than four lines
 * behind a gate. Section 139.
 */
export function eraseBoundsFor(architecture: number): { block: number; ceiling: number } {
  const block = ERASE_BLOCK_SIZE[architecture];
  const ceiling = WRITABLE_CEILING[architecture];
  if (block === undefined || ceiling === undefined) {
    throw new RailError(
      `no erase block size recorded for architecture ${architecture}: refusing to erase`,
    );
  }
  return { block, ceiling };
}

/**
 * Throws unless the flash may be erased at `address`.
 *
 * `ERASE_FLASH` takes an address and **no count**, so the erase granularity is the hardware's
 * sector size and the caller cannot scope it. Scoping therefore has to come from refusing
 * addresses.
 *
 * **This used to say "an erase near the top of the config region may well reach past it, and
 * nothing here can tell", and now something can.** The block size is known, `ERASE_BLOCK_SIZE`,
 * so the whole block an erase destroys is computable and the rail can require that all of it is
 * permitted. Two conditions, both refusals:
 *
 * * the address is a block boundary, because an unaligned address does not erase what the caller
 *   named. Logitech's own client walks its block table from zero and starts erasing at the first
 *   boundary **at or after** the address, so the block containing an unaligned address is left
 *   alone: the caller gets neither what it asked for nor an error.
 * * the whole block lies inside the region, up to `WRITABLE_CEILING` rather than up to the end of
 *   the config, since the bytes above a short config are still region and erasing them is not the
 *   failure worth guarding against. Erasing the stored firmware is.
 *
 * An architecture with no recorded block size is refused outright rather than falling back to the
 * old address-only check, which would be the weaker rail wearing the stronger one's name.
 */
export function assertEraseAllowed(p: WritePermission, address: number): void {
  assertPermissionIsUsable(p);
  const { start } = writableRange(p);
  const { block, ceiling } = eraseBoundsFor(p.architecture);
  if (address % block !== 0) {
    throw new RailError(
      `erase at 0x${address.toString(16)} is not on a 0x${block.toString(16)} block boundary`,
    );
  }
  if (address < start || address + block > ceiling) {
    throw new RailError(
      `erasing 0x${block.toString(16)} bytes at 0x${address.toString(16)} leaves the writable ` +
        `region 0x${start.toString(16)}..0x${ceiling.toString(16)}`,
    );
  }
}

/**
 * Throws unless a byte may be written into the data memory of a running remote.
 *
 * `WRITE_MISC` selector `0x07` is volatile: nothing survives a power cycle, so it cannot brick
 * anything. It is still a write to a live device, and it sits behind the same flag for that
 * reason and no other. Note what it does not need: a dump, or a matching INTENDEDVERSION, neither
 * of which means anything for RAM. It does still need the flag and the spare remote, because the
 * point of a read only build is that it does not write.
 */
export function assertRamWriteAllowed(
  // `architecture` is optional here where `WritePermission` makes it required, and deliberately: a
  // rail is a runtime boundary and JavaScript crosses it, so a guard the type says is unreachable is
  // the shape `CLAUDE.md` warns about, an unreachable guard reading as protection. Widening the
  // parameter is what makes the check reachable and the test able to state it.
  p: { readonly architecture?: number | undefined; readonly targetIsTheSpareRemote: boolean },
  dataAddress: number,
): void {
  if (!WRITES_ENABLED) {
    throw new RailError('writing is disabled: this build is read only');
  }
  if (!p.targetIsTheSpareRemote) {
    throw new RailError('the spare remote is the only write target, RAM included');
  }
  // An architecture check, like every other write rail here. It had none, so a caller passing
  // `targetIsTheSpareRemote` reached `WRITE_MISC` on a Harmony 600 or a Harmony 525, whose selector 7
  // executors nobody has read. `ARCHITECTURES_WITH_A_WRITE_TARGET` is the same list flash uses and the
  // reason is the same: a read profile is not a write profile. Section 139.
  if (p.architecture === undefined || !ARCHITECTURES_WITH_A_WRITE_TARGET.includes(p.architecture)) {
    throw new RailError(
      `architecture ${p.architecture ?? 'unknown'} has no write target, so no RAM write either; ` +
        `only ${ARCHITECTURES_WITH_A_WRITE_TARGET.join(', ')} has one`,
    );
  }
  if (!Number.isInteger(dataAddress) || dataAddress < 0 || dataAddress >= SFR_PAGE_START) {
    // **The reason this bound exists is that "volatile" is an assumption about the address, not about
    // the command.** `writeRam`'s own comment called the write volatile and therefore harmless, and
    // the request carries a sixteen bit data address: on this MCU family bank 15 from `0xF40` up is
    // the special function registers, and Microchip's own `p18f87j50.inc` puts `EECON1` at `0xFA6`,
    // `EECON2` at `0xFA7`, `TABLAT` at `0xFF5` and `TBLPTR` at `0xFF6` to `0xFF8`. Those are the self
    // programming path: a sequence of single byte writes is what a flash write on a PIC18 is made of.
    //
    // Whether the firmware's own handler bounds the address is **unread**, and that is exactly why the
    // rail does not depend on the answer. Below the SFR page a write can only disturb a variable, and
    // a hang resets the device, section 100. Above it, nobody here can say what it can do.
    throw new RailError(
      `data address 0x${Number(dataAddress).toString(16)} is not below the SFR page at ` +
        `0x${SFR_PAGE_START.toString(16)}: bank 15 holds EECON1, EECON2, TABLAT and TBLPTR, which ` +
        `are the self programming path, so a write there is not volatile`,
    );
  }
}

/**
 * Where the special function registers start on the PIC18F67J50 and 87J50, the parts arch 12 and
 * arch 14 are.
 *
 * The same constant as `SFR_PAGE_START` in `src/harmony/pic18/isa.py`, and the same provenance,
 * Microchip's own `p18f87j50.inc`. It is 0xF60 on the PIC18F4550 that arch 9 is, which does not matter
 * here because arch 9 has no write target: the lower of the two is the safe one to bound against
 * either way, and a test says so rather than leaving it to be re-derived.
 */
export const SFR_PAGE_START = 0xf40;

/**
 * Throws unless the session-end escape may be sent to this remote.
 *
 * `0xE0 0x01` clears the command state variable and nothing else, `docs/findings.md` sections 97 and
 * 99. It touches no storage, volatile or otherwise, so it cannot corrupt anything: the worst it can
 * do is abandon a command that was in progress, and abandoning commands is what closing a handle
 * already does. It is here rather than on the read path anyway, because it changes a device's state
 * and the point of a read only build is that it does not.
 *
 * **Why it exists at all.** A remote whose command state is left nonzero cannot take the
 * unconditional path out of USB mode when its cable goes, so it sits there until its batteries come
 * out. That was seen twice on the bench on 9 August 2026. This command clears exactly that gate.
 *
 * **What this rail deliberately does not decide.** Whether FreeHarmony may send it at the end of
 * every read only session is a judgment call and is not settled by this function existing: the
 * conditions below keep it to the spare remote and to an architecture whose escape has actually been
 * read, which is enough for the experiment and not enough for a product. Lifting
 * `targetIsTheSpareRemote` is the decision, and it belongs in a commit that says so.
 *
 * Arch 9 is refused because nobody has read its escape. A read profile is not a write profile,
 * which is the same rule `ARCHITECTURES_WITH_A_WRITE_TARGET` states for flash.
 */
export function assertSessionEndAllowed(
  p: Pick<WritePermission, 'architecture' | 'targetIsTheSpareRemote'>,
  subCommand: number,
): void {
  if (!WRITES_ENABLED) {
    throw new RailError(
      'writing is disabled: this build is read only (set HARMONY_ENABLE_WRITES=1 knowing why)',
    );
  }
  if (subCommand !== ESCAPE_END_SESSION) {
    throw new RailError(
      `escape sub-command 0x${subCommand.toString(16)} is not the session end: 0x02 and 0x03 ` +
        'reboot the remote and this project does not implement a reboot',
    );
  }
  const known = ESCAPE_SUB_COMMANDS[p.architecture];
  if (known === undefined) {
    throw new RailError(
      `architecture ${p.architecture} has no escape read from its firmware, so sending one is refused`,
    );
  }
  if (!known.includes(subCommand)) {
    throw new RailError(
      `architecture ${p.architecture} does not dispatch escape sub-command 0x${subCommand.toString(16)}`,
    );
  }
  if (!p.targetIsTheSpareRemote) {
    throw new RailError(
      'the spare remote is the only unit this may be sent to until the session-end question is decided',
    );
  }
}

/**
 * The one door through the odd count refusal, for an experiment that needs the hang itself.
 *
 * `readInternalMemory` refuses an odd count because such a read never terminates and the response
 * sender has no bound, sections 94 and 96. That refusal stays. But twice now an experiment has
 * needed the hang as its subject rather than as an accident, and both times the refusal was
 * bypassed by editing `remote.ts` and editing it back afterwards. **That is worse than a named
 * door**: a safety rail modified under time pressure, twice, with nothing in the tests to say it
 * happened.
 *
 * So this is the door, and it is shaped like the write flag: off unless the environment says
 * otherwise, and it says what it will do rather than what it permits. A caller that reaches for it
 * has to have set `HARMONY_ODD_READ_EXPERIMENT=1`, which is not something anybody sets by accident.
 *
 * **It will hang the remote.** Every hang so far has cleared itself in about three seconds at a new
 * device path, and the config read back identical afterwards, but the loop scribbles at least 2247
 * bytes of flash content over data memory on its way, so a remote is not the same afterwards until
 * its batteries come out.
 */
export const ODD_READ_EXPERIMENT: boolean = process.env['HARMONY_ODD_READ_EXPERIMENT'] === '1';

export function assertDeliberateHangAllowed(count: number): void {
  if (!ODD_READ_EXPERIMENT) {
    throw new RailError(
      'a deliberate hang needs HARMONY_ODD_READ_EXPERIMENT=1: this read never terminates and ' +
        'writes flash content over the remote\'s data memory, sections 94 and 96',
    );
  }
  if (count % 2 === 0) {
    throw new RailError(
      `a count of ${count} is even, so it terminates: this entry point is for the hang itself, ` +
        'and an even count belongs on the ordinary read path',
    );
  }
}

/**
 * The firmware is never written, by any path.
 *
 * There is no permission object that makes this return, which is why it takes none. It exists so
 * that a caller reaching for a firmware write finds a refusal with a reason attached rather than
 * an absence, and so that the rule is greppable.
 */
export function assertFirmwareWriteRefused(): never {
  throw new RailError(
    'firmware is never written by this project: the route to everything here is generating ' +
      'config files, and a bad firmware write has no recovery path',
  );
}

/**
 * The named door for the first write this project has ever performed.
 *
 * `WRITES_ENABLED` is the build flag and every condition in `WritePermission` still applies; this
 * is a second, single purpose door in front of the **rehearsal**, and it exists for the same reason
 * `ODD_READ_EXPERIMENT` does. That reason is recorded there and is worth repeating: the odd read
 * refusal was twice bypassed by editing `remote.ts` and editing it back, and a rail edited under
 * time pressure with nothing in the tests to say so is worse than a door that announces itself.
 *
 * A first write is exactly the situation that invites such an edit. The recovery route it depends
 * on is unproven, which is the whole reason the rehearsal writes bytes a remote already holds, so
 * the operator has to say out loud that this is the run where that is understood.
 *
 * It is deliberately not per architecture and not per address: those are `assertFlashWriteAllowed`'s
 * job, and a door that duplicated them would be a second copy of a rail, which is the state this
 * repository's oldest rule forbids.
 */
export const FIRST_WRITE: boolean = process.env['HARMONY_FIRST_WRITE'] === '1';

export function assertFirstWriteAllowed(): void {
  if (!WRITES_ENABLED) {
    throw new RailError(
      'writing is disabled: this build is read only (set HARMONY_ENABLE_WRITES=1 knowing why)',
    );
  }
  if (!FIRST_WRITE) {
    throw new RailError(
      'the write rehearsal needs HARMONY_FIRST_WRITE=1 as well as HARMONY_ENABLE_WRITES=1: this ' +
        'is the first write this project has performed, on an irreplaceable unit, and the restore ' +
        'route it relies on has never been exercised',
    );
  }
}
