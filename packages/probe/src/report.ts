/**
 * The structural report: everything about a config's shape and nothing about its contents.
 *
 * This is roadmap step 8, and the reason it exists is coverage. Two architectures are read here out
 * of at least eleven that shipped, and there is no way to learn anything about the other nine
 * without hardware nobody involved owns. A full dump answers every question and cannot be
 * published, because it records what equipment somebody owns and carries their remote's GUIDs. A
 * structural report answers the questions that actually block generalisation, and has nowhere for
 * either to hide.
 *
 * **The safety property is structural, not a promise.** Nothing here reads a section's bytes. The
 * report holds addresses, lengths, counts and the outcome of each check, and the only bytes that
 * reach it are the container's own header fields, which are the magic, two integers and a four
 * letter marker. There is no code path from a section pointer to a byte in the output.
 *
 * Two deliberate omissions from the USB half. The device's **serial number string** is not read,
 * although `node-hid` offers it, because it identifies a unit. The version block **is** included:
 * twelve bytes measured to be identical on two different Harmony Ones, so it describes the model
 * and its images rather than the unit. `docs/usb-protocol.md` section 4.
 *
 * The report is built by two layers. `containerReport` works on bytes and works on architectures
 * the codec has never seen, which is the point: an unknown magic still yields the header shape, the
 * slot count and the section table, and that is exactly the evidence needed to say whether the
 * pointer table rule holds on arch 10.
 */
import {
  FAMILIES,
  KNOWN_POINTER_COUNTS,
  POINTER_SIZE,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  bytes as byteUtil,
  findMarker,
  parse,
  trailerChecksum,
} from '@harmony/codec';

/** Bumped when the shape of the report changes, so a contributed file says what produced it. */
export const REPORT_VERSION = 1;

export interface UsbReport {
  readonly vendorId: number;
  readonly productId: number;
  /** `bcdDevice`, which is where the skin id comes from. */
  readonly release: number | undefined;
  readonly skinId: number | undefined;
  readonly manufacturer: string | undefined;
  readonly product: string | undefined;
}

export interface SectionReport {
  readonly slot: number;
  readonly spare: number;
  readonly address: number;
  /** To the next non NULL pointer, or to the end marker. An upper bound, see findings 36. */
  readonly lengthUpperBound: number | undefined;
}

export interface ContainerReport {
  readonly magic: string;
  /** The family this magic belongs to, or null when no known family claims it. */
  readonly family: string | null;
  readonly endAddr: number;
  readonly format: number;
  readonly formatVersion: string;
  readonly flashBase: number;
  readonly length: number;
  readonly markerOffset: number;
  readonly marker: string;
  readonly pointerCount: number;
  readonly pointerCountKnown: boolean;
  readonly trailerChecksum: number;
  readonly trailerChecksumRecomputes: boolean;
  readonly architecture: number | null;
  readonly sections: readonly SectionReport[];
  /** Populated only when the codec could parse it, which needs a known magic. */
  readonly checks: Record<string, boolean> | null;
  /** Set when the codec refused it, verbatim, because a refusal is the interesting case. */
  readonly parseError: string | null;
}

export interface StructuralReport {
  readonly reportVersion: number;
  readonly usb: UsbReport | null;
  /** The twelve version block bytes, as numbers. Ten of them are still unnamed. */
  readonly versionBlock: readonly number[] | null;
  readonly container: ContainerReport | null;
  /** Set when the container could not be read at all. */
  readonly error: string | null;
}

/** Nibble BCD, the same rule `Container.formatVersion` uses: 0x1400 is 1.4. */
function formatVersionOf(format: number): string {
  return `${format >>> 12}.${(format >>> 8) & 0xf}`;
}

/**
 * The container's shape, from its bytes, without needing the codec to recognise it.
 *
 * Everything below is derived rather than tabulated, which is what makes the report useful on a
 * model nobody here has: the base address comes from `end_addr` and the marker position, the slot
 * count comes from the marker offset, and the section lengths come from the pointers ascending.
 * Only `family` and `checks` need the magic to be one this project knows, and both are allowed to
 * come back empty.
 */
export function containerReport(blob: Uint8Array): ContainerReport {
  if (blob.length < 0x68) {
    throw new Error(`container is ${blob.length} bytes, too short to hold a header`);
  }
  const magic = byteUtil.ascii(blob, 0, 4);
  const family = FAMILIES.find((f) => f.magic === magic);
  const endAddr = byteUtil.u32(blob, 4);
  const format = byteUtil.u32(blob, 8);
  const markerOffset = findMarker(blob);
  const pointerCount = (markerOffset - SECTION_TABLE_OFFSET) / SECTION_ITEM_SIZE;
  // The end marker sits at end_addr, and the blob runs from the cookie to the end of it, so the
  // base follows from the two without knowing what the marker says.
  const flashBase = endAddr - (blob.length - 4);

  const raw: { slot: number; spare: number; address: number }[] = [];
  for (let i = 0; i < pointerCount; i += 1) {
    const item = SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * i;
    raw.push({
      slot: i,
      spare: blob[item] as number,
      address: byteUtil.uint(blob, item + 1, POINTER_SIZE),
    });
  }
  const sections: SectionReport[] = raw.map((s, i) => {
    if (s.address === 0) return { ...s, lengthUpperBound: undefined };
    const next = raw.slice(i + 1).find((o) => o.address !== 0);
    return { ...s, lengthUpperBound: (next?.address ?? endAddr) - s.address };
  });

  let checks: Record<string, boolean> | null = null;
  let parseError: string | null = null;
  let architecture: number | null = null;
  try {
    const container = parse(blob);
    checks = container.checks;
    architecture = container.architecture ?? null;
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err);
  }

  const stored = byteUtil.u16(blob, blob.length - 6);
  return {
    magic,
    family: family?.architectures ?? null,
    endAddr,
    format,
    formatVersion: formatVersionOf(format),
    flashBase,
    length: blob.length,
    markerOffset,
    marker: byteUtil.ascii(blob, markerOffset, 4),
    pointerCount,
    pointerCountKnown: KNOWN_POINTER_COUNTS.includes(pointerCount),
    trailerChecksum: stored,
    trailerChecksumRecomputes: trailerChecksum(blob) === stored,
    architecture,
    sections,
    checks,
    parseError,
  };
}

export interface ReportInput {
  readonly usb?: UsbReport | undefined;
  readonly versionBlock?: Uint8Array | undefined;
  readonly blob?: Uint8Array | undefined;
  /** A failure that stopped the read, recorded rather than thrown, since it is itself evidence. */
  readonly error?: string | undefined;
}

export function buildReport(input: ReportInput): StructuralReport {
  let container: ContainerReport | null = null;
  let error = input.error ?? null;
  if (input.blob !== undefined) {
    try {
      container = containerReport(input.blob);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }
  return {
    reportVersion: REPORT_VERSION,
    usb: input.usb ?? null,
    versionBlock: input.versionBlock === undefined ? null : Array.from(input.versionBlock),
    container,
    error,
  };
}
