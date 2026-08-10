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
 */
export const CONFIG_REGION_BASE: Readonly<Record<number, number>> = {
  12: 0x040000, // Harmony One
  14: 0x030000, // Harmony 600 and 700
};

/**
 * Architectures that have a write target at all.
 *
 * Three remotes are on the bench: a programmed Harmony One, a Harmony 600, and a spare
 * unprogrammed Harmony One. The spare is the only unit anything may be written to, and it is
 * arch 12. **So arch 14 has no write target**, and writing to it stays refused until a second
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
 * with it. The boot block area below `0x010000` is finer, 16K then 8K, 8K, 32K, and it is outside
 * the config region and therefore outside anything this module permits.
 *
 * Same provenance and same direction as `WRITABLE_CEILING`: it only ever refuses more.
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
  /** The config's INTENDEDVERSION matches the remote's protocol, skin, board and flash id. */
  readonly intendedVersionMatches: boolean;
  /** The unit is the spare, unprogrammed remote. Nothing else is ever a write target. */
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
    throw new RailError('the spare unprogrammed remote is the only write target');
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
  if (ceiling !== undefined && end > ceiling) {
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
  const block = ERASE_BLOCK_SIZE[p.architecture];
  const ceiling = WRITABLE_CEILING[p.architecture];
  if (block === undefined || ceiling === undefined) {
    throw new RailError(
      `no erase block size recorded for architecture ${p.architecture}: refusing to erase`,
    );
  }
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
export function assertRamWriteAllowed(p: Pick<WritePermission, 'targetIsTheSpareRemote'>): void {
  if (!WRITES_ENABLED) {
    throw new RailError('writing is disabled: this build is read only');
  }
  if (!p.targetIsTheSpareRemote) {
    throw new RailError('the spare unprogrammed remote is the only write target, RAM included');
  }
}

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
 * every read only session is the owner's call and is not settled by this function existing: the
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
