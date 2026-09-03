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

import { ESCAPE_END_SESSION, ESCAPE_SUB_COMMANDS, readVersion } from './protocol.ts';
import { compareIntendedVersion } from './compatible.ts';
import { sameUnit } from './identity.ts';
import type { Compatibility, StatedVersion } from './compatible.ts';

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
 * unit in front of it. **It was measured on 30 August 2026 and it is 64 KiB**, section 222: the
 * rehearsal erased `0x040000` on the spare Harmony One with the blocks either side read before and
 * after, and both are byte identical. So this constant is no longer client sourced for arch 12. The
 * client's table and section 221's row for the part agree with the measurement, which is a closure
 * between a vendor table and a remote rather than a second opinion about one of them. Every other
 * architecture in this table, if one is ever added, is back to the client's word.
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
 * dump of this exact unit cannot construct one of these by accident, and the booleans that remain
 * are facts about the world that no code here can check for itself.
 *
 * **One of them stopped being a boolean on 30 August 2026**, section 225. `intendedVersionMatches`
 * asked the caller whether the config's `INTENDEDVERSION` matches the connected remote, over six
 * fields, and the answer every caller gave was `true`. So the rail whose whole job is refusing a
 * config built for a different remote was a comment. It takes the two **inputs** now, what the
 * config states and what the remote reported, and performs the comparison itself, which is the only
 * shape a caller cannot get wrong by being optimistic.
 */
export interface WritePermission {
  /** The architecture of the connected remote, as the remote itself reports it. */
  readonly architecture: number;
  /** Length in bytes of the config being written, which bounds the region. */
  readonly configLength: number;
  /** A verified original dump of this exact unit exists in the lab. */
  readonly originalDumpVerified: boolean;
  /**
   * What the config's wrapper states about the remote it was built for, exactly as it states it.
   *
   * The six fields are protocol, skin, flash, board, `SOFTWARETYPE` and `ARCHITECTURE`, section 87,
   * and `compareIntendedVersion` is what compares them. An absent or empty field matches anything,
   * per the format's own rule, so `{}` is legal and means the config claimed nothing: a container
   * read off a remote has no wrapper and therefore no claim. A field this library cannot compare is
   * a refusal rather than something skipped.
   *
   * **This was a boolean until 30 August 2026** and the note attached to it was about the six
   * fields being four in an earlier reading. That was the right worry about the wrong thing: the
   * risk was never that a caller would compare the wrong number of fields, it was that no caller
   * compared any of them. Section 225.
   */
  readonly intendedVersion: StatedVersion;
  /**
   * The remote's own `GET_VERSION` reply, as it came off the wire.
   *
   * Both halves of the compatibility check come from here: the fields the config is compared
   * against, and the architecture, which is cross checked against `architecture` above rather than
   * taken on the caller's word. A caller that read a version block from one remote and an
   * architecture from somewhere else is refused.
   */
  readonly versionBlock: Uint8Array;
  /**
   * The identity block read off the connected remote, as `readUnitIdentity` returned it.
   *
   * **This was `targetIsTheSpareRemote`, a boolean, until 30 August 2026**, section 226. Two Harmony
   * Ones enumerate identically, so section 188 recorded the question as one the library could not
   * answer, and every caller answered it `true`. It can be answered: the unit's own program memory
   * holds a 64 byte identity block whose two GUIDs are what Logitech's own service takes as a
   * serial. Danny's decision was to identify a unit the way the vendor does rather than to invent a
   * fingerprint, which was this project's own earlier proposal.
   */
  readonly identityBlock: Uint8Array;
  /**
   * The identity of the unit that **may** be written to, from wherever the caller keeps it.
   *
   * Not a table in this library, deliberately: a unit identifier is that unit's hardware identity, so
   * the bench keeps it in the private lab and FreeHarmony keeps it with the user's own data. Either
   * the whole block or the 32 byte discriminator, since a stored copy is the shorter one.
   */
  readonly permittedUnit: Uint8Array;
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
  assertUnitIsPermitted(p);
  if (!p.originalDumpVerified) {
    throw new RailError('no verified original dump of this unit: refusing to write');
  }
  assertConfigIsForThisRemote(p);
}

/**
 * Throws unless the config was built for the remote that sent this version block.
 *
 * Split out from `assertPermissionIsUsable` because it is the one condition in there with a
 * derivation behind it rather than a boolean to read, and because a caller wanting to show the
 * comparison before deciding anything needs it on its own. `compareIntendedVersion` is where the
 * per field mapping lives and section 225 is the evidence for it.
 *
 * Two refusals, and the second is the cheap one worth having: a version block that is not an
 * identity at all, and an architecture that disagrees with the number the caller passed.
 */
export function assertConfigIsForThisRemote(
  p: Pick<WritePermission, 'architecture' | 'intendedVersion' | 'versionBlock'>,
): Compatibility {
  let reading;
  try {
    reading = readVersion(p.versionBlock);
  } catch (error: unknown) {
    throw new RailError(
      `the remote's version block is not an identity, so nothing can be compared against it: ${
        error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (reading.architecture !== p.architecture) {
    throw new RailError(
      `the version block says architecture ${reading.architecture} and the permission says ` +
        `${p.architecture}: refusing to write on two readings of the same remote that disagree`,
    );
  }
  let comparison;
  try {
    comparison = compareIntendedVersion(p.intendedVersion, reading);
  } catch (error: unknown) {
    throw new RailError(
      `the config states a version field this library cannot compare, so a match would mean ` +
        `nothing: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!comparison.compatible) {
    const detail = comparison.fields
      .filter((f) => f.verdict === 'mismatch')
      .map((f) => `${f.field}: config says ${f.stated}, remote says ${f.reported}`)
      .join('; ');
    throw new RailError(
      `the config's INTENDEDVERSION does not match the connected remote (${detail})`,
    );
  }
  return comparison;
}

/**
 * Throws unless the remote on the cable is the one that may be written to.
 *
 * A byte comparison of what the unit reports against what the caller has recorded, section 226,
 * which replaces the boolean `targetIsTheSpareRemote`. Three refusals and the third is the one worth
 * having:
 *
 * * the two identities differ, so this is a different unit
 * * either is the wrong length to be an identity at all
 * * **either carries no per unit value**, its GUID fields being uniform filler. That is the trap
 *   this whole path is about: the field named the serial is `0xEE` on every remote read here, so a
 *   comparison of the obvious field matches every unit against every other and reports a confident
 *   yes. `identifiesAUnit` refuses instead, and a refusal that says "this cannot be told" is the
 *   only honest answer there.
 */
export function assertUnitIsPermitted(
  p: Pick<WritePermission, 'identityBlock' | 'permittedUnit'>,
): void {
  let same;
  try {
    same = sameUnit(p.identityBlock, p.permittedUnit);
  } catch (error: unknown) {
    throw new RailError(
      `the connected unit cannot be identified, so it is not a permitted write target: ${
        error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!same) {
    throw new RailError(
      'the remote on the cable is not the unit this write is permitted for: its identity block '
        + 'differs from the recorded one. Two Harmony Ones enumerate identically, which is why this '
        + 'is checked against the unit and not against the model',
    );
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
 * of which means anything for RAM. It does still need the flag and the permitted unit, because the
 * point of a read only build is that it does not write.
 */
export function assertRamWriteAllowed(
  // `architecture` is optional here where `WritePermission` makes it required, and deliberately: a
  // rail is a runtime boundary and JavaScript crosses it, so a guard the type says is unreachable is
  // the shape `CLAUDE.md` warns about, an unreachable guard reading as protection. Widening the
  // parameter is what makes the check reachable and the test able to state it.
  p: {
    readonly architecture?: number | undefined;
    readonly identityBlock: Uint8Array;
    readonly permittedUnit: Uint8Array;
  },
  dataAddress: number,
): void {
  if (!WRITES_ENABLED) {
    throw new RailError('writing is disabled: this build is read only');
  }
  // The unit check, RAM included, and it is a comparison rather than a boolean since section 226.
  // Nothing survives a power cycle here, so this is not about bricking a remote; it is that a read
  // only build must not disturb a variable on somebody's working unit either.
  assertUnitIsPermitted(p);
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
 * read, which is enough for the experiment and not enough for a product. Widening the permitted unit
 * beyond the bench spare is the decision, and it belongs in a commit that says so.
 *
 * Arch 9 is refused because nobody has read its escape. A read profile is not a write profile,
 * which is the same rule `ARCHITECTURES_WITH_A_WRITE_TARGET` states for flash.
 */
export function assertSessionEndAllowed(
  p: Pick<WritePermission, 'architecture' | 'identityBlock' | 'permittedUnit'>,
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
        'reboot the remote, and 0x02 goes through assertResetAllowed rather than this rail',
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
  // Same comparison as every other rail, section 226: the unit on the cable against the one the
  // caller recorded, rather than a boolean the caller sets.
  assertUnitIsPermitted(p);
}

/**
 * Throws unless the cached region descriptors may be dropped: `WRITE_MISC` selector `0x02`.
 *
 * **Step 2 of a working config write**, section 245, and the reason it is gated at all is that it
 * changes a running device's state rather than that it endangers storage. Section 246 read the
 * executor before this was ever sent: on arch 12 it clears three five byte records in **data
 * memory** and a two byte entry each in a second table, reaches no flash gate at all, and so leaves
 * nothing behind that a power cycle would not.
 *
 * It takes the **full** write permission rather than the lighter one the session end takes, and that
 * is deliberate: its only purpose is to precede an erase, so a caller holding it already has a
 * verified dump and a config that matches the remote, and requiring them here means the sequence
 * cannot be half authorised. A caller that wants to drop caches for some other reason is a decision
 * to take in a commit that says so.
 */
export function assertInvalidateAllowed(p: WritePermission): void {
  assertPermissionIsUsable(p);
}

/**
 * Throws unless the remote may be restarted: the escape with sub-command `0x02`.
 *
 * **Step 7 of a working config write**, section 245. concordance sends exactly this and then waits
 * for the remote to come back on the bus, which is the battery pull that has been performed by hand
 * after every write on this bench. The firmware side was read long before, section 97: `0x02` sets a
 * flag whose single reader drives the top level mode to 3, and mode 3 waits and then executes the
 * PIC18 `RESET` instruction. So it is a deliberate reboot rather than a watchdog or a jump.
 *
 * **The handle dies with it**, so a caller must treat the transport as gone afterwards and must not
 * wait for a reply: nothing acknowledges a command that ends in a reset.
 *
 * Full write permission again, for the same reason as the invalidate: this is the last step of a
 * sequence, not a facility. Sending a reboot to a remote that this process has no business writing
 * to is exactly what the unit check exists to prevent, and `assertSessionEndAllowed` keeps the
 * lighter gate because `0x01` writes nothing and changes one variable.
 *
 * **It deliberately does not re-check that the architecture dispatches the escape.** The first
 * version did, copying `assertSessionEndAllowed`, and that check could never fire: the shared gate
 * above refuses every architecture outside `ARCHITECTURES_WITH_A_WRITE_TARGET`, which is `[12]`, and
 * arch 12 does dispatch `0x02`. An unreachable guard is worse than none because it reads as
 * protection, so the claim is a test instead, `TheOnlyWriteTargetDispatchesTheReset`, which compares
 * the two tables. The session end rail keeps its own copy because it takes the lighter permission and
 * really can be reached with any architecture.
 */
export function assertResetAllowed(p: WritePermission): void {
  assertPermissionIsUsable(p);
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
