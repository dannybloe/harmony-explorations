/**
 * The write rails, in the library rather than in the user interface.
 *
 * That placement is the whole point. A rail enforced by a dialog box is enforced until somebody
 * writes a script; a rail enforced here is enforced for every caller. `CLAUDE.md` states these as
 * absolute, and the reason they are absolute rather than cautious is that the devices are
 * irreplaceable and Logitech's recovery servers are gone: there is no supported way back from a
 * bad write, only a dump taken beforehand.
 *
 * Nothing in this module talks to a device. It answers one question, "is this write allowed", and
 * the answer is no unless every condition is met.
 */

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
  return { start, end: start + p.configLength };
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
 * addresses, and the address alone has to be enough: an erase near the top of the config region
 * may well reach past it, and nothing here can tell.
 */
export function assertEraseAllowed(p: WritePermission, address: number): void {
  assertPermissionIsUsable(p);
  const { start, end } = writableRange(p);
  if (address < start || address >= end) {
    throw new RailError(
      `erase at 0x${address.toString(16)} is outside the config region ` +
        `0x${start.toString(16)}..0x${end.toString(16)}`,
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
