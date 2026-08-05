/**
 * Logitech's config file wrappers: EZHex, and EZUp's hex encoded variant.
 *
 * A port of the config-reading half of `src/harmony/ezfile.py`. The `.hfw` half is deliberately
 * left behind: an `.hfw` is a ZIP of firmware regions, which is a research concern, and the
 * application never opens one. Porting it would mean either a ZIP dependency or a hand written
 * inflate, to read files that only ever get looked at once, by hand, in the lab. `ezfile.py`
 * keeps that job.
 *
 * `.EZHex`
 *     XML header followed by the payload as **raw bytes**, not hex. A config EZHex declares its
 *     own payload length and a checksum, so the split is verifiable rather than guessed:
 *     `<BINARYDATASIZE>` is the exact payload length and `<CHECKSUM>` is an XOR of every payload
 *     byte seeded with `0x69`. The header also carries `<INTENDEDVERSION>`, which pins the
 *     protocol, skin, board and flash id a remote must report before it will accept the file.
 *     That is a safety rail, not a curiosity: it is what a write path checks before writing.
 *
 * `.EZUpgrade` / `.EZUp`
 *     XML with the payload hex encoded across many `<DATA>` elements. Some EZHex files use that
 *     form too, so both are handled by sniffing rather than by extension.
 */
import { bytesOf, indexOf } from './bytes.ts';
import { FAMILIES } from './gspm.ts';

export class EzFileError extends Error {}

export const CHECKSUM_SEED = 0x69;
export const INTENDED_VERSION_FIELDS = ['PROTOCOL', 'SKIN', 'FLASH', 'BOARD'] as const;

export type IntendedVersionField = (typeof INTENDED_VERSION_FIELDS)[number];

/** How the payload was carried, kept so a round trip can put it back the same way. */
export type Encoding = 'hex-data-elements' | 'raw-after-xml' | 'declared-length';

export interface EzHex {
  readonly name: string;
  readonly xml: string;
  readonly payload: Uint8Array;
  readonly declaredSize: number | undefined;
  readonly declaredChecksum: number | undefined;
  readonly intendedVersion: Partial<Record<IntendedVersionField, string>>;
  readonly checks: Record<string, boolean>;
}

export interface Region {
  readonly name: string;
  readonly payload: Uint8Array;
  readonly encoding: Encoding;
}

/** The `<CHECKSUM>` an EZHex header carries: XOR of every byte, seeded 0x69. */
export function payloadChecksum(payload: Uint8Array): number {
  let value = CHECKSUM_SEED;
  for (const byte of payload) value ^= byte;
  return value;
}

export function allChecksPass(checked: { checks: Record<string, boolean> }): boolean {
  return Object.values(checked.checks).every((ok) => ok);
}

/**
 * The header is read as Latin-1 rather than UTF-8.
 *
 * Not a shortcut: an EZHex is XML text with raw binary appended, so decoding the whole file as
 * UTF-8 either throws or silently replaces bytes, and a replacement character costs a different
 * number of bytes than the byte it replaced. Latin-1 is the one decoding where a byte offset in
 * the text is still a byte offset in the file, which is what the split depends on.
 */
function latin1(data: Uint8Array): string {
  let out = '';
  // Chunked, because String.fromCharCode with a spread of a megabyte overflows the call stack.
  for (let i = 0; i < data.length; i += 0x8000) {
    out += String.fromCharCode(...data.subarray(i, Math.min(i + 0x8000, data.length)));
  }
  return out;
}

function xmlInt(text: string, tag: string): number | undefined {
  const match = new RegExp(`<${tag}>(\\d+)</${tag}>`).exec(text);
  return match === null ? undefined : Number.parseInt(match[1] as string, 10);
}

function containerOffset(data: Uint8Array): number {
  const found = FAMILIES.map((f) => indexOf(data, bytesOf(f.magic))).filter((o) => o >= 0);
  return found.length === 0 ? -1 : Math.min(...found);
}

/**
 * Split an EZHex file into XML header and payload, verifying the declared length.
 *
 * The payload is the last `BINARYDATASIZE` bytes of the file, which is what the remote itself
 * relies on, and the two byte CR LF separator before it is checked rather than assumed. Falls
 * back to locating a container cookie when the header declares no size.
 */
export function parseEzhex(blob: Uint8Array, name = '<blob>'): EzHex {
  // Only the head is decoded as text: the header is a few hundred bytes and the payload can be
  // megabytes, and nothing in the payload is text.
  const head = latin1(blob.subarray(0, Math.min(blob.length, 0x4000)));
  const size = xmlInt(head, 'BINARYDATASIZE');
  const declaredChecksum = xmlInt(head, 'CHECKSUM');

  let split: number;
  if (size !== undefined && size > 0 && size <= blob.length) {
    split = blob.length - size;
  } else {
    split = containerOffset(blob);
    if (split < 0) throw new EzFileError(`${name}: no BINARYDATASIZE and no container magic`);
  }
  const payload = blob.subarray(split);

  const intendedVersion: Partial<Record<IntendedVersionField, string>> = {};
  const versionBlock = /<INTENDEDVERSION>([\s\S]*?)<\/INTENDEDVERSION>/.exec(head);
  if (versionBlock !== null) {
    for (const field of INTENDED_VERSION_FIELDS) {
      const m = new RegExp(`<${field}>([\\s\\S]*?)</${field}>`).exec(versionBlock[1] as string);
      if (m !== null) intendedVersion[field] = (m[1] as string).trim();
    }
  }

  const magics = FAMILIES.map((f) => f.magic);
  const startsWithContainer = magics.includes(latin1(payload.subarray(0, 4)));

  return {
    name,
    xml: latin1(blob.subarray(0, split)),
    payload,
    declaredSize: size,
    declaredChecksum,
    intendedVersion,
    checks: {
      declares_a_payload_size: size !== undefined,
      payload_length_matches_declaration: size === payload.length,
      separator_before_payload_is_crlf: blob[split - 2] === 0x0d && blob[split - 1] === 0x0a,
      checksum_matches_declaration:
        declaredChecksum !== undefined && payloadChecksum(payload) === declaredChecksum,
      payload_starts_with_a_known_container: startsWithContainer,
    },
  };
}

const DATA_ELEMENT = /<DATA>([0-9A-Fa-f]+)<\/DATA>/g;

function unhex(text: string, name: string): Uint8Array {
  if (text.length % 2 !== 0) throw new EzFileError(`${name}: odd number of hex digits`);
  const out = new Uint8Array(text.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    const byte = Number.parseInt(text.substr(2 * i, 2), 16);
    if (Number.isNaN(byte)) throw new EzFileError(`${name}: bad hex in <DATA> elements`);
    out[i] = byte;
  }
  return out;
}

/** Extract the payload from an EZUp or EZHex file. */
export function decodePayload(blob: Uint8Array, name = '<blob>'): Region {
  const text = latin1(blob);
  const chunks = [...text.matchAll(DATA_ELEMENT)].map((m) => m[1] as string);
  if (chunks.length > 0) {
    return { name, payload: unhex(chunks.join(''), name), encoding: 'hex-data-elements' };
  }

  // No hex elements, so the payload is raw bytes after the XML header. A config EZHex declares
  // its own length, which is exact; otherwise fall back to the container cookie.
  if (xmlInt(text.slice(0, 0x4000), 'BINARYDATASIZE') !== undefined) {
    return { name, payload: parseEzhex(blob, name).payload, encoding: 'declared-length' };
  }
  const off = containerOffset(blob);
  if (off < 0) {
    throw new EzFileError(
      `${name}: no <DATA> elements and no container magic, unrecognised container`,
    );
  }
  return { name, payload: blob.subarray(off), encoding: 'raw-after-xml' };
}

/**
 * Accepts whatever a config arrives as and hands back the bytes to parse.
 *
 * A raw flash read from a remote is passed through untouched, because `gspm.parse` finds the
 * container inside a larger dump on its own. Anything that starts as XML is unwrapped first.
 */
export function payloadOf(blob: Uint8Array, name = '<blob>'): Uint8Array {
  let i = 0;
  while (i < blob.length && (blob[i] === 0x20 || blob[i] === 0x09 || blob[i] === 0x0a || blob[i] === 0x0d)) {
    i += 1;
  }
  if (blob[i] === 0x3c) return decodePayload(blob, name).payload;
  return blob;
}
