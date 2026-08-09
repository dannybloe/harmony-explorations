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
 *     own payload length and a checksum: `<BINARYDATASIZE>` is the exact payload length and
 *     `<CHECKSUM>` is an XOR of every payload byte seeded with `0x69`. The header also carries
 *     `<INTENDEDVERSION>`, which pins the six fields a remote must report before the file is
 *     offered to it. That is a safety rail, not a curiosity: it is what a write path checks.
 *
 *     **The split is structural**, section 87: the header ends at the line carrying
 *     `</INFORMATION>` and the payload is everything after that line's terminator. The declared
 *     length is a check on that rather than the definition of it, and both are optional. A file
 *     with no header at all is all payload, and the corpus holds one. Both splits are computed
 *     here and compared, because two derivations landing on the same byte are worth more than
 *     either alone.
 *
 * `.EZUpgrade` / `.EZUp`
 *     XML with the payload hex encoded across many `<DATA>` elements, grouped into a `<PHASE>`
 *     per destination. Some EZHex files use that form too, so both are handled by sniffing
 *     rather than by extension. Reading the phases apart is a research concern and stays in
 *     `src/harmony/ezfile.py`; the application only ever meets single payload config files.
 */
import { bytesOf, indexOf } from './bytes.ts';
import { FAMILIES } from './gspm.ts';

export class EzFileError extends Error {}

export const CHECKSUM_SEED = 0x69;

/** The end of the XML header. The payload starts after this line's terminator. */
export const HEADER_TERMINATOR = '</INFORMATION>';

/**
 * The six fields a compatibility check compares, section 87.
 *
 * Not the four this used to list. `SOFTWARETYPE` says which of the remote's images is running
 * and `ARCHITECTURE` is compared too; a field that is absent or empty matches anything, which
 * is how one entry is written to match every remote. `SOFTWARE` appears in one arch 8 config
 * and is **not** one of the six, so a version that looks like a gate is not one.
 */
export const INTENDED_VERSION_FIELDS = [
  'PROTOCOL',
  'SKIN',
  'FLASH',
  'BOARD',
  'SOFTWARETYPE',
  'ARCHITECTURE',
] as const;

export type IntendedVersionField = (typeof INTENDED_VERSION_FIELDS)[number];

/** How the payload was carried, kept so a round trip can put it back the same way. */
export type Encoding = 'hex-data-elements' | 'raw-after-header' | 'bare-container';

/** How the header's last line ended, or `none` when the terminator sits at end of file. */
export type LineEnding = 'crlf' | 'lf' | 'cr' | 'none';

export interface EzHex {
  readonly name: string;
  readonly xml: string;
  readonly payload: Uint8Array;
  readonly declaredSize: number | undefined;
  readonly declaredChecksum: number | undefined;
  readonly intendedVersion: Partial<Record<IntendedVersionField, string>>;
  readonly checks: Record<string, boolean>;
  /** Where the header terminator puts the split, or undefined when there is no header. */
  readonly structuralSplit: number | undefined;
  readonly lineEnding: LineEnding | undefined;
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

/**
 * Read a decimal element. Signed, because a checksum is compared as a byte.
 *
 * The reader that consumes these files parses `<CHECKSUM>` as a signed 16 bit number and then
 * narrows it to a byte, so a value of `0x80` upwards may legitimately be written negative. No
 * sample here does, and matching digits only would have failed silently on the first one that did.
 */
function xmlInt(text: string, tag: string): number | undefined {
  const match = new RegExp(`<${tag}>(-?\\d+)</${tag}>`).exec(text);
  return match === null ? undefined : Number.parseInt(match[1] as string, 10);
}

/**
 * Where the XML header ends, by the header's own terminator rather than by arithmetic.
 *
 * The line ending is reported rather than required: an EZHex header is written CR LF and an
 * EZUp header bare LF, and both are read by the same rule.
 */
function structuralSplitOf(
  head: string,
): { split: number; lineEnding: LineEnding } | undefined {
  const at = head.indexOf(HEADER_TERMINATOR);
  if (at < 0) return undefined;
  const after = at + HEADER_TERMINATOR.length;
  if (head.startsWith('\r\n', after)) return { split: after + 2, lineEnding: 'crlf' };
  if (head.startsWith('\n', after)) return { split: after + 1, lineEnding: 'lf' };
  if (head.startsWith('\r', after)) return { split: after + 1, lineEnding: 'cr' };
  return { split: after, lineEnding: 'none' };
}

function containerOffset(data: Uint8Array): number {
  const found = FAMILIES.map((f) => indexOf(data, bytesOf(f.magic))).filter((o) => o >= 0);
  return found.length === 0 ? -1 : Math.min(...found);
}

/**
 * Split an EZHex file into XML header and payload, two ways, and compare them.
 *
 * The **structural** split is the format's own: the payload is everything after the line
 * carrying `</INFORMATION>`, and a file whose header is missing entirely is all payload. The
 * **declared** split is `BINARYDATASIZE` bytes off the end. Either can be absent, and when both
 * are present they must agree; the structural one is preferred, because it does not depend on
 * the file having been truncated or extended by a byte.
 *
 * Falls back to locating a container cookie when neither is available, which is a guess and is
 * the only branch here that is.
 */
export function parseEzhex(blob: Uint8Array, name = '<blob>'): EzHex {
  // Only the head is decoded as text: the header is a few hundred bytes and the payload can be
  // megabytes, and nothing in the payload is text.
  const head = latin1(blob.subarray(0, Math.min(blob.length, 0x4000)));
  const size = xmlInt(head, 'BINARYDATASIZE');
  const declaredChecksum = xmlInt(head, 'CHECKSUM');
  const structural = structuralSplitOf(head);
  const declared =
    size !== undefined && size > 0 && size <= blob.length ? blob.length - size : undefined;

  let split: number;
  if (structural !== undefined) {
    split = structural.split;
  } else if (declared !== undefined) {
    split = declared;
  } else {
    // No header and no declared length. The cookie search is the last resort and it is a guess:
    // it finds the first container magic anywhere, including inside a payload.
    split = containerOffset(blob);
    if (split < 0) {
      throw new EzFileError(`${name}: no header, no BINARYDATASIZE and no container magic`);
    }
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
    structuralSplit: structural?.split,
    lineEnding: structural?.lineEnding,
    // A check is a claim that has to hold, not a note about what the file happens to carry. An
    // absent `BINARYDATASIZE` or `CHECKSUM` is legal, so neither absence is a failure here;
    // `declaredSize === undefined` says the file did not declare one. The reader that consumes
    // these files takes exactly this position, and the corpus contains one file of each kind.
    checks: {
      payload_length_matches_declaration: size === undefined || size === payload.length,
      checksum_matches_declaration:
        declaredChecksum === undefined ||
        payloadChecksum(payload) === (declaredChecksum & 0xff),
      the_two_splits_agree:
        structural === undefined || declared === undefined || structural.split === declared,
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

  // No hex elements, so the payload is raw bytes: after the header if there is one, and the
  // whole file if there is not.
  const ez = parseEzhex(blob, name);
  return {
    name,
    payload: ez.payload,
    encoding: ez.structuralSplit === undefined ? 'bare-container' : 'raw-after-header',
  };
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
