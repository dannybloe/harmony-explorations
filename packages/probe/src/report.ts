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
 * **That argument is per architecture and the probe exists for the ones it does not cover**, which
 * this said as if it were general. The measurement is two Harmony Ones, arch 12; fields 7, 10 and
 * 11 have no reading at all on any architecture, section 87, and a byte with no reading on a model
 * nobody here owns is a byte nobody can say is not per unit. It stays in, because it is the field
 * that identifies which firmware a contributed report describes and a report of unknown provenance
 * is worth much less, and because every field has been the same on every unit of one model this
 * project has ever read. But the safety of this one field is an **argument** where everything else
 * in the report is a structure, and it is the field to drop first if a contributor asks. Stated
 * rather than left implicit, section 139.
 *
 * The report is built by two layers. `containerReport` works on bytes and works on architectures
 * the codec has never seen, which is the point: an unknown magic still yields the header shape, the
 * slot count and the section table, and that is exactly the evidence needed to say whether the
 * pointer table rule holds on arch 10.
 */
import {
  FAMILIES,
  POINTER_SIZE,
  SECTION_ITEM_SIZE,
  statedPointerCount,
  SECTION_TABLE_OFFSET,
  bytes as byteUtil,
  findMarker,
  parse,
  recoverFlashBase,
  containerExtent,
  END_MARKER_LENGTH,
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

/**
 * One pointer slot as the report publishes it: where it points and how far it can run.
 *
 * **This is a structural map of a remote's configuration, and publishing it is deliberate**, which
 * is worth stating because `packages/lab` says the opposite about a golden vector, in the same
 * words, about the same kind of information. The line between them is **consent**: a probe report is
 * produced by the config's owner, on their own machine, from their own remote, and they decide
 * whether to send it, where a golden vector would be this project publishing a contributor's
 * structural map on their behalf without asking. Reconciled with that docstring in one commit,
 * section 139, because two stated policies and no way to tell which was meant is worse than either.
 *
 * What is still never here is **contents**: no name, no infrared code, no byte of a section.
 */
export interface SectionReport {
  readonly slot: number;
  readonly spare: number;
  readonly address: number;
  /** To the next non NULL pointer, or to the end marker. An upper bound, see findings 36. */
  readonly lengthUpperBound: number | undefined;
}

export interface ContainerReport {
  readonly magic: string;
  /**
   * The architectures the family carrying this magic covers, or null when no known family claims it.
   *
   * **It was called `family` and its value is `FAMILIES[n].architectures`**, so a published report
   * carried a field named family holding `"12 (One), 14 (600, 700)"`. Harmless to read and wrong in
   * the schema a contributor's report is read against, which is the one document a contributor has.
   * Renamed rather than re-derived: the family itself has no name in `FAMILIES`, only a magic, and
   * inventing one here would be a second naming of something the codec does not name. Section 139.
   */
  readonly familyArchitectures: string | null;
  readonly endAddr: number;
  readonly format: number;
  readonly formatVersion: string;
  readonly flashBase: number;
  readonly length: number;
  readonly markerOffset: number;
  readonly marker: string;
  readonly pointerCount: number;
  /** What the header states its pointer count is, section 194. */
  readonly statedPointerCount: number;
  /** Whether that agrees with the count the marker's position implies. */
  readonly formatStatesThePointerCount: boolean;
  /** Null when the file's magic has no end marker after it, so the container has no extent. */
  readonly trailerChecksum: number | null;
  readonly trailerChecksumRecomputes: boolean | null;
  /** Whether the container's own extent could be found, which is what the two above depend on. */
  readonly extentKnown: boolean;
  /**
   * Whether `flashBase` came from the clock record anchor or from the marker subtraction fallback.
   *
   * False means the anchor **refused**, which section 122 says is the finding rather than a nuisance:
   * every arch 10 (Harmony 890) read here came back with duplicated 54 byte chunks, and on the one
   * where they landed inside the container no candidate base is `0x1000` aligned. A base from the
   * fallback is not wrong by a little, it reads the neighbouring bytes.
   */
  readonly flashBaseAnchored: boolean;
  /** Whether `flashBase` is `0x1000` aligned, which every real one here is. */
  readonly flashBaseAligned: boolean;
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

/**
 * The legacy label, and this was a **third** copy of the arithmetic behind it.
 *
 * `Container.formatVersion` and its Python twin were the other two, all three splitting one byte
 * into nibbles, with a test asserting this one agrees with the codec's. A test that two copies agree
 * is not the same as one copy: it catches them diverging and not the fact that there are two. Since
 * section 194 the byte's meaning is `statedPointerCount`, which is imported rather than rewritten,
 * and the label is derived from that single reading.
 */
function formatVersionOf(format: number): string {
  return `${format >>> 12}.${(format >>> 8) & 0xf}`;
}

/**
 * The container's shape, from its bytes, without needing the codec to recognise it.
 *
 * Everything below is derived rather than tabulated, which is what makes the report useful on a
 * model nobody here has: the base address is anchored on the clock record, the slot count comes
 * from the marker offset, and the section lengths come from the pointers ascending. Only `family`
 * and `checks` need the magic to be one this project knows, and both are allowed to come back
 * empty.
 *
 * **The base derivation is the codec's and not a copy of it.** This file carried its own
 * `endAddr - (blob.length - 4)` until section 117, which is the reading the codec had abandoned as
 * circular, so for one commit two derivations of the same number disagreed on one sample. That is
 * the state `CLAUDE.md` warns about for the opcode table, and nothing in either suite could see it,
 * because both copies were right on everything the tests loaded.
 */
export function containerReport(data: Uint8Array): ContainerReport {
  // **The container's own extent, not the file's**, since section 139: this worked on whatever bytes it
  // was handed, so on a raw flash read with fill past the end marker it took the stored trailer `u16`
  // out of the fill and reported a checksum failure for a container that is fine. Two of the four
  // Harmony 890 reads here. `containerExtent` is the codec's own slicing, the same call `parse` makes,
  // rather than a second copy of it.
  //
  // A file whose magic has no end marker after it has no extent, so there is nothing to checksum and
  // the report says so with a null rather than computing something. That is the one case where the
  // report is thinner than before, and a null a reader can see beats a boolean nobody can trust.
  let blob = data;
  let extentKnown = true;
  try {
    blob = containerExtent(data).blob;
  } catch {
    extentKnown = false;
  }
  if (blob.length < 0x68) {
    throw new Error(`container is ${blob.length} bytes, too short to hold a header`);
  }
  const magic = byteUtil.ascii(blob, 0, 4);
  const family = FAMILIES.find((f) => f.magic === magic);
  const endAddr = byteUtil.u32(blob, 4);
  const format = byteUtil.u32(blob, 8);
  const markerOffset = findMarker(blob);
  const pointerCount = (markerOffset - SECTION_TABLE_OFFSET) / SECTION_ITEM_SIZE;

  const raw: { slot: number; spare: number; address: number }[] = [];
  for (let i = 0; i < pointerCount; i += 1) {
    const item = SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * i;
    raw.push({
      slot: i,
      spare: blob[item] as number,
      address: byteUtil.uint(blob, item + 1, POINTER_SIZE),
    });
  }
  // One derivation, the codec's, with the same fallback it uses. A probe of an unknown model is
  // exactly where a wrong base would go unnoticed, since there is nothing to compare its numbers
  // against.
  // **And whether the anchor produced it, which the report did not say**, section 139. On a damaged
  // read the anchor refuses and the fallback returns an unaligned base: `h890_config_2_rescan` reports
  // 0x2FEBC where every other container here is 0x1000 aligned. That number was published looking
  // exactly like a derived one, which is section 122's warning arriving in the one package meant to be
  // read by somebody who has none of this. `flashBaseAnchored` is the flag; a consumer that ignores it
  // is at least ignoring something.
  const anchored = recoverFlashBase(blob, raw.map((s) => s.address));
  const flashBase = anchored ?? endAddr - (blob.length - END_MARKER_LENGTH);
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
    familyArchitectures: family?.architectures ?? null,
    endAddr,
    format,
    formatVersion: formatVersionOf(format),
    flashBase,
    length: blob.length,
    markerOffset,
    marker: byteUtil.ascii(blob, markerOffset, 4),
    pointerCount,
    statedPointerCount: statedPointerCount(format),
    formatStatesThePointerCount: statedPointerCount(format) === pointerCount,
    trailerChecksum: extentKnown ? stored : null,
    trailerChecksumRecomputes: extentKnown ? trailerChecksum(blob) === stored : null,
    extentKnown,
    flashBaseAnchored: anchored !== undefined,
    flashBaseAligned: (flashBase & 0xfff) === 0,
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
