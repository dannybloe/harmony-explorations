/**
 * Reading a whole config off a remote, bounded by the config rather than by the region.
 *
 * The naive read is "the config region is 3840 KiB, read 3840 KiB". The config is not that big and
 * the container says so itself: `end_addr` at offset 4 is the absolute flash address of the
 * trailing end marker, so sixteen bytes at the base give the exact length before the bulk read
 * starts. On the Harmony One that is `0x1D867C` minus `0x040000` plus four for the marker, 1672832
 * bytes; on the Harmony 600 `0x0E4361` minus `0x030000` plus four, 738149. Both are the known file
 * sizes to the byte, so this is arithmetic that has already been checked twice rather than a guess.
 *
 * The length also checks itself. If the marker is not sitting at `end_addr` when the read finishes,
 * either the read is wrong or the config is damaged, and either way nothing should be filed.
 */
import { bytes as byteUtil, FAMILIES, type Family } from '@harmony/codec';

/**
 * What a config read needs from a remote, and deliberately nothing more.
 *
 * Narrower than `HarmonyRemote` on purpose. It makes the pipeline testable against a plain object
 * that serves bytes from a file, and it means this module cannot reach a write path even by
 * mistake, because no write method exists on the type it holds.
 */
export interface ConfigReader {
  getVersion(): Promise<Uint8Array>;
  readFlash(address: number, count: number): Promise<Uint8Array>;
}

/** Everything that differs between the architectures this project can read. */
export interface RemoteProfile {
  readonly productId: number;
  readonly model: string;
  readonly architecture: number;
  /** The address a `READ_FLASH` command must name to reach the start of the config. */
  readonly configBase: number;
  /** Where the config region ends, in the same space as `configBase`. */
  readonly configEnd: number;
  /**
   * The base the container's **own** pointers count from, when that is not `configBase`.
   *
   * Two spaces, and on arch 9 they differ by a megabyte: `READ_FLASH` answers at `0x820000` and
   * is silent below `0x800000`, while the container's `end_addr` and every section pointer inside
   * it are `0x02xxxx`. Reading the length as `end_addr - configBase` then gives a negative number,
   * which is how this was found rather than assumed. Defaults to `configBase`, which is what the
   * two bench architectures do. `docs/findings.md` section 76.
   */
  readonly containerBase?: number;
  /**
   * Set when no remote of this model has ever been connected here, so the entry rests on a
   * published report rather than on a measurement. The read still checks itself, because
   * `parseHeader` refuses anything that is not a container, so a wrong base fails loudly.
   */
  readonly unverified?: true;
}

export const PROFILES: readonly RemoteProfile[] = [
  { productId: 0xc121, model: 'Harmony One', architecture: 12, configBase: 0x040000, configEnd: 0x400000 },
  { productId: 0xc122, model: 'Harmony 600 or 700', architecture: 14, configBase: 0x030000, configEnd: 0x400000 },
  // **The 525's read base is `0x820000`, and this entry said `0x020000` until a remote was
  // connected on 8 August 2026.** Both numbers are real and they are not the same number: the
  // container's own pointers are `0x02xxxx`, which is the base its `end_addr` recovers and what
  // every offset inside the file means, while `READ_FLASH` will not answer below `0x800000` at
  // all. So bit 23 is part of the command's address on this architecture and absent from the
  // config's, which is the opposite of the note that used to sit here calling it a flag. Measured:
  // `0x010000`, `0x020000` and `0x030000` are silent, `0x820000` returns `AHCM`.
  //
  // The region is still 384 KiB, ending at `0x880000`, because the flash is a 512 KiB 25F040 and
  // base slot 2 puts the log area above the config. `docs/findings.md` section 76.
  { productId: 0xc111, model: 'Harmony 525', architecture: 9, configBase: 0x820000,
    configEnd: 0x880000, containerBase: 0x020000 },
];

export class ReadError extends Error {}

/**
 * The profile for an attached remote, or a refusal that says why.
 *
 * Refusing beats guessing a base address. Reading the wrong address returns bytes that are not a
 * container, which is a confusing failure, and this project covers two architectures out of at
 * least eleven that exist, so an unknown product id is the expected case rather than a fault.
 */
export function profileFor(productId: number): RemoteProfile {
  const found = PROFILES.find((p) => p.productId === productId);
  if (found === undefined) {
    const known = PROFILES.map((p) => `0x${p.productId.toString(16)} ${p.model}`).join(', ');
    throw new ReadError(
      `no config base known for product id 0x${productId.toString(16)}. Known: ${known}. ` +
        'Other models exist and are not covered yet; see the coverage section of docs/roadmap.md.',
    );
  }
  return found;
}

/** Enough bytes to hold the magic, `end_addr` and the format word. */
export const HEADER_PROBE = 16;

export interface ConfigHeader {
  readonly family: Family;
  readonly endAddr: number;
  readonly format: number;
  /** Container length in bytes, end marker included. */
  readonly length: number;
}

/**
 * Read the container header and work out how long the whole thing is.
 *
 * The magic is checked against every known family rather than against `GSPM` alone, so a container
 * from an architecture nobody here has read still gets a sensible length instead of a refusal.
 */
export function parseHeader(head: Uint8Array, profile: RemoteProfile): ConfigHeader {
  if (head.length < HEADER_PROBE) {
    throw new ReadError(`header probe returned ${head.length} of ${HEADER_PROBE} bytes`);
  }
  const family = FAMILIES.find((f) => byteUtil.ascii(head, 0, 4) === f.magic);
  if (family === undefined) {
    const seen = Array.from(head.subarray(0, 4), (b) => b.toString(16).padStart(2, '0')).join(' ');
    throw new ReadError(
      `no container magic at 0x${profile.configBase.toString(16)}, found ${seen}. ` +
        'Either the remote holds no config or the base address is wrong for this model.',
    );
  }
  const endAddr = byteUtil.u32(head, 4);
  const format = byteUtil.u32(head, 8);
  const length = endAddr - (profile.containerBase ?? profile.configBase) + family.endMarker.length;
  if (length <= HEADER_PROBE || profile.configBase + length > profile.configEnd) {
    throw new ReadError(
      `end_addr 0x${endAddr.toString(16)} gives an implausible length of ${length} bytes ` +
        `for a config based at 0x${profile.configBase.toString(16)}`,
    );
  }
  return { family, endAddr, format, length };
}

export interface ReadProgress {
  /** Bytes in hand, including the header probe. */
  readonly done: number;
  readonly total: number;
}

export interface ConfigRead {
  readonly profile: RemoteProfile;
  readonly header: ConfigHeader;
  readonly versionBlock: Uint8Array;
  readonly bytes: Uint8Array;
  readonly durationMs: number;
}

export interface ReadOptions {
  /** Bytes per `READ_FLASH`. 16 KiB is what the hardware tests use for the firmware read. */
  readonly chunkBytes?: number;
  readonly onProgress?: (progress: ReadProgress) => void;
  /** Injectable so a test does not depend on a clock. */
  readonly now?: () => number;
}

export const DEFAULT_CHUNK_BYTES = 16384;

/**
 * A reply that never came, as opposed to one that came back wrong.
 *
 * Two shapes, because the command layer reports silence differently depending on where it happens:
 * `exchange` says "no reply to command 0x10 within 3 polls" and `readFlash` says "flash read
 * returned 0 of 256 bytes". Both mean the same thing here.
 */
export function isSilence(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /no reply to command/.test(err.message) || /returned 0 of \d+ bytes/.test(err.message);
}

/**
 * Send the first command twice if the first attempt is met with silence.
 *
 * **Only the first command, and only on silence.** Observed twice on a Harmony One: a flash read
 * that returned 0 of 256 bytes, and a `GET_VERSION` that got no reply at all, each on the first
 * command after the device was opened, each followed immediately by a run that worked from end to
 * end including a 1232237 byte config read. The Harmony 600 has not done it. So the honest
 * description is "the One sometimes drops the first command", not a general rule, and the cause is
 * unknown; see `docs/usb-protocol.md`.
 *
 * Everything after the first command stays strict. Retrying the bulk reads too would be a wider
 * workaround than the evidence supports, and it would turn a genuinely failing transfer into an
 * intermittent success, which is the failure mode you least want in the thing that files your
 * backups.
 */
async function firstCommand<T>(attempt: () => Promise<T>): Promise<T> {
  try {
    return await attempt();
  } catch (err) {
    if (!isSilence(err)) throw err;
    return attempt();
  }
}

/**
 * Read the whole config, header first.
 *
 * The version block is read before anything else because it is the cheapest thing that identifies
 * the unit, and a read filed without knowing which remote it came from is a file nobody can use.
 */
export async function readConfig(
  reader: ConfigReader,
  profile: RemoteProfile,
  options: ReadOptions = {},
): Promise<ConfigRead> {
  const chunk = options.chunkBytes ?? DEFAULT_CHUNK_BYTES;
  const now = options.now ?? (() => performance.now());
  const started = now();

  const versionBlock = await firstCommand(() => reader.getVersion());
  const head = await reader.readFlash(profile.configBase, HEADER_PROBE);
  const header = parseHeader(head, profile);

  const bytes = new Uint8Array(header.length);
  bytes.set(head, 0);
  options.onProgress?.({ done: head.length, total: header.length });

  for (let at = head.length; at < header.length; at += chunk) {
    const count = Math.min(chunk, header.length - at);
    const part = await reader.readFlash(profile.configBase + at, count);
    if (part.length !== count) {
      throw new ReadError(`read ${part.length} of ${count} bytes at offset ${at}`);
    }
    bytes.set(part, at);
    options.onProgress?.({ done: at + count, total: header.length });
  }

  // The closure on the whole read: the marker has to be where end_addr said it would be. A read
  // that drifted, or a config that is damaged, fails here rather than being filed and trusted.
  const markerAt = header.length - header.family.endMarker.length;
  if (byteUtil.ascii(bytes, markerAt, header.family.endMarker.length) !== header.family.endMarker) {
    const seen = Array.from(bytes.subarray(markerAt), (b) => b.toString(16).padStart(2, '0')).join(' ');
    throw new ReadError(
      `no ${header.family.endMarker} at end_addr 0x${header.endAddr.toString(16)}, found ${seen}. ` +
        'The read is not trustworthy and has not been filed.',
    );
  }

  return { profile, header, versionBlock, bytes, durationMs: now() - started };
}
