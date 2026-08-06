/**
 * Driving a remote to produce a structural report, including a remote nobody here has seen.
 *
 * The interesting case is the unknown model, so this does not refuse one. `@harmony/corpus` maps a
 * product id onto a config base and refuses anything it does not recognise, which is right for a
 * backup and wrong here: the whole value of the probe is what it says about the nine architectures
 * this project cannot reach. So when the product id is unknown, every base this project knows about
 * is tried in turn, sixteen bytes at a time, and the one that answers with a container magic wins.
 *
 * That is a read of sixteen bytes at an address the remote may not have. It is the same `READ_FLASH`
 * the rest of the project uses, it is bounded, and a wrong address returns bytes rather than doing
 * anything. The internal memory cap in `@harmony/usb` still applies, and no base here is in that
 * window.
 */
import { skinId } from '@harmony/usb';
import { FAMILIES, bytes as byteUtil } from '@harmony/codec';

import { buildReport, type StructuralReport, type UsbReport } from './report.ts';

/** What the probe needs from a remote. No write method exists on it, by construction. */
export interface ProbeReader {
  getVersion(): Promise<Uint8Array>;
  readFlash(address: number, count: number): Promise<Uint8Array>;
}

/**
 * Config bases this project has evidence for, plus the arch 12 and arch 14 safe mode base.
 *
 * Ordered by how likely they are to be right on an unknown model, which is a guess, so the order
 * only decides how many sixteen byte reads happen before the answer.
 */
export const CANDIDATE_BASES: readonly { address: number; note: string }[] = [
  { address: 0x030000, note: 'arch 14 user config' },
  { address: 0x040000, note: 'arch 12 user config' },
  { address: 0x020000, note: 'safe mode config on arch 12 and arch 14' },
  { address: 0x002000, note: 'arch 12 internal safe mode container' },
];

export const HEADER_PROBE = 16;
/** A container larger than this is not one; the biggest in the corpus is 1672832 bytes. */
export const MAX_PLAUSIBLE_LENGTH = 8 * 1024 * 1024;

export interface FoundContainer {
  readonly base: number;
  readonly note: string;
  readonly length: number;
}

/** Read sixteen bytes at `base` and say whether a container starts there, and how long it is. */
export async function probeBase(
  reader: ProbeReader,
  base: number,
  note: string,
): Promise<FoundContainer | undefined> {
  const head = await reader.readFlash(base, HEADER_PROBE);
  if (head.length < HEADER_PROBE) return undefined;
  const magic = byteUtil.ascii(head, 0, 4);
  const family = FAMILIES.find((f) => f.magic === magic);
  // An unknown four letter magic is still a container as far as this is concerned, because
  // recognising a new one is a result. What is required is four printable uppercase letters and an
  // `end_addr` that lands above the base and not absurdly far above it.
  const looksLikeMagic = /^[A-Z]{4}$/.test(magic);
  if (!looksLikeMagic) return undefined;
  const endAddr = byteUtil.u32(head, 4);
  const markerBytes = family?.endMarker.length ?? 4;
  const length = endAddr - base + markerBytes;
  if (length <= HEADER_PROBE || length > MAX_PLAUSIBLE_LENGTH) return undefined;
  return { base, note, length };
}

export interface ProbeOptions {
  readonly chunkBytes?: number;
  readonly onProgress?: (done: number, total: number) => void;
  /** Restrict the search, when the base is already known. */
  readonly bases?: readonly { address: number; note: string }[];
}

export const DEFAULT_CHUNK_BYTES = 16384;

/**
 * Read what the report needs and build it.
 *
 * The whole container is read, not just its header, for two reasons: the section table's length
 * column needs `end_addr` to be real, and the trailer checksum is only worth reporting if it was
 * recomputed over the bytes that were actually there. The bytes are not returned and not written
 * anywhere; only the report leaves this function.
 */
export async function probeRemote(
  reader: ProbeReader,
  usb: UsbReport | null,
  options: ProbeOptions = {},
): Promise<StructuralReport> {
  let versionBlock: Uint8Array | undefined;
  try {
    versionBlock = await reader.getVersion();
  } catch (err) {
    return buildReport({
      usb: usb ?? undefined,
      error: `GET_VERSION failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const bases = options.bases ?? CANDIDATE_BASES;
  const tried: string[] = [];
  let found: FoundContainer | undefined;
  for (const candidate of bases) {
    tried.push(`0x${candidate.address.toString(16)} (${candidate.note})`);
    try {
      found = await probeBase(reader, candidate.address, candidate.note);
    } catch (err) {
      tried[tried.length - 1] += `: ${err instanceof Error ? err.message : String(err)}`;
      continue;
    }
    if (found !== undefined) break;
  }
  if (found === undefined) {
    return buildReport({
      usb: usb ?? undefined,
      versionBlock,
      error: `no container found. Bases tried: ${tried.join('; ')}`,
    });
  }

  const chunk = options.chunkBytes ?? DEFAULT_CHUNK_BYTES;
  const blob = new Uint8Array(found.length);
  for (let at = 0; at < found.length; at += chunk) {
    const count = Math.min(chunk, found.length - at);
    const part = await reader.readFlash(found.base + at, count);
    if (part.length !== count) {
      return buildReport({
        usb: usb ?? undefined,
        versionBlock,
        error: `read ${part.length} of ${count} bytes at offset ${at} from 0x${found.base.toString(16)}`,
      });
    }
    blob.set(part, at);
    options.onProgress?.(at + count, found.length);
  }

  return buildReport({ usb: usb ?? undefined, versionBlock, blob });
}

/** The USB half of the report, from an enumeration entry. Never the serial number. */
export function usbReport(found: {
  vendorId: number;
  productId: number;
  release?: number | undefined;
  manufacturer?: string | undefined;
  product?: string | undefined;
}): UsbReport {
  return {
    vendorId: found.vendorId,
    productId: found.productId,
    release: found.release,
    skinId: found.release === undefined ? undefined : skinId(found.release),
    manufacturer: found.manufacturer,
    product: found.product,
  };
}
