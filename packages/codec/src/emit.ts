/**
 * The emitter, milestone M2's third part: rebuild what is accounted and copy the rest.
 *
 * **The shape is deliberate and it is what makes progress measurable.** An emitter that rebuilds
 * everything is untestable until the day it works. This one copies the payload it cannot yet
 * rebuild and rebuilds the container frame, so byte equality holds from the first commit, and each
 * structure moves from copied to rebuilt one at a time with the same test still passing. The
 * measure is `rebuilt / total`, which is the byte accounting read the other way round.
 *
 * **The copy is explicit, and it has to be.** The obvious version fills the buffer with the source
 * and overwrites what it rebuilds, and that version passes whether or not the emitter writes
 * anything, because the right bytes are already there. So the buffer starts as poison and the
 * residue is copied by name. What is neither rebuilt nor copied survives as poison and fails.
 *
 * **What it is not.** Nothing here goes near a remote. It produces bytes; writing them to hardware
 * is a later milestone behind `packages/usb/src/rails.ts`, and version 1 of the application is
 * read only. `docs/roadmap.md`, milestone M2.
 */

import {
  Container,
  GspmError,
  MARKER_SEARCH_LIMIT,
  POINTER_SIZE,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  TRAILER_CHECKSUM_OFFSET,
  trailerChecksum,
} from './gspm.ts';

/** Bytes of the container frame: the cookie, the two `u32`s, the trailer and the end marker. */
export const COOKIE_LENGTH = 4;
/**
 * What an unwritten byte reads as. Any value works; this one is chosen because a run of it in a
 * failure is unmistakable in a hex dump, unlike zero, which half the container legitimately is.
 */
export const POISON = 0xa5;
export const END_ADDR_OFFSET = 4;
export const FORMAT_OFFSET = 8;

export interface EmitReport {
  bytes: Uint8Array;
  /** Bytes written from a parsed structure rather than copied from the source. */
  rebuilt: number;
  /** Which structures were rebuilt, for the progress number. */
  owners: string[];
}

function writeU32(out: Uint8Array, at: number, value: number): void {
  out[at] = value & 0xff;
  out[at + 1] = (value >>> 8) & 0xff;
  out[at + 2] = (value >>> 16) & 0xff;
  out[at + 3] = (value >>> 24) & 0xff;
}

function writeU24(out: Uint8Array, at: number, value: number): void {
  out[at] = value & 0xff;
  out[at + 1] = (value >>> 8) & 0xff;
  out[at + 2] = (value >>> 16) & 0xff;
}

/**
 * Rebuild a container's bytes.
 *
 * Rebuilt today: the cookie, `endAddr`, the format word, the section table, the trailer checksum
 * and the end marker. Copied: everything from the marker after the table to the trailer.
 *
 * The section table is the interesting part of this first cut, because it is where a wrong reading
 * would show. An item is `{ u8 spare; u24 address }` and the spare byte is written back from the
 * parse rather than assumed zero, for the reason section 20 gives: reading the item as a `u32`
 * pointer is what cost a whole section, and an emitter that assumes the byte away would reintroduce
 * the same error from the other side.
 */
export function emit(c: Container): EmitReport {
  const source = c.blob;
  const out = new Uint8Array(source.length);

  // **Poison, not a copy.** Filling with the source and overwriting the rebuilt parts would pass
  // whether or not the emitter wrote anything, because the right bytes are already there. So the
  // buffer starts as a value no container byte can be mistaken for, the residue is copied
  // explicitly, and anything neither rebuilt nor copied survives as poison and fails the compare.
  out.fill(POISON);

  // The residue: everything from the marker after the section table to the trailer. It shrinks as
  // structures move into the rebuilt half, and it is the only thing copied.
  const residueFrom = c.markerOffset;
  const residueTo = source.length - TRAILER_CHECKSUM_OFFSET;
  if (residueFrom > residueTo) throw new GspmError('section table overruns the trailer');
  out.set(source.subarray(residueFrom, residueTo), residueFrom);

  let rebuilt = 0;
  const owners: string[] = [];

  // The cookie. Taken from the family rather than from the bytes, so a wrong family fails here.
  const cookie = c.family.magic;
  for (let i = 0; i < COOKIE_LENGTH; i += 1) out[i] = cookie.charCodeAt(i);
  writeU32(out, END_ADDR_OFFSET, c.endAddr);
  writeU32(out, FORMAT_OFFSET, c.formatRaw);
  rebuilt += FORMAT_OFFSET + 4;
  owners.push('header');

  // The section table. `formatRaw`'s top byte and item 0's spare byte are the same byte at 0x0B,
  // which is why the format word is written first and the table second: the table owns it.
  for (const section of c.sections) {
    const item = SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * section.slot;
    if (item + SECTION_ITEM_SIZE > out.length) {
      throw new GspmError(`section item ${section.slot} runs past the container`);
    }
    out[item] = section.spare;
    writeU24(out, item + 1, section.address);
    rebuilt += 1 + POINTER_SIZE;
  }
  owners.push('section-table');

  // The end marker, then the checksum. Order matters: the checksum covers everything up to
  // `TRAILER_CHECKSUM_OFFSET` from the end, which excludes the marker and the checksum word itself
  // but includes every byte the section table just wrote, so it has to be computed last.
  const endMarker = c.family.endMarker;
  for (let i = 0; i < COOKIE_LENGTH; i += 1) {
    out[out.length - COOKIE_LENGTH + i] = endMarker.charCodeAt(i);
  }
  const checksum = trailerChecksum(out);
  const at = out.length - TRAILER_CHECKSUM_OFFSET;
  out[at] = checksum & 0xff;
  out[at + 1] = (checksum >>> 8) & 0xff;
  rebuilt += COOKIE_LENGTH + 2;
  owners.push('trailer');

  return { bytes: out, rebuilt, owners };
}

/** Whether emitting a container reproduces it exactly, and where the first difference is. */
export interface RoundTrip {
  equal: boolean;
  /** Offset of the first differing byte, or undefined when they match. */
  firstDifference?: number;
  rebuilt: number;
  total: number;
}

/**
 * Emit and compare, which is milestone M2's test.
 *
 * Reported rather than asserted, so a caller can measure the whole corpus and see which samples
 * fail instead of stopping at the first.
 */
export function roundTrip(c: Container): RoundTrip {
  const { bytes, rebuilt } = emit(c);
  const source = c.blob;
  if (bytes.length !== source.length) {
    return { equal: false, firstDifference: Math.min(bytes.length, source.length), rebuilt, total: source.length };
  }
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] !== source[i]) {
      return { equal: false, firstDifference: i, rebuilt, total: source.length };
    }
  }
  return { equal: true, rebuilt, total: source.length };
}

/** Kept so the marker search limit is referenced where an emitter would need it next. */
export const EMIT_MARKER_LIMIT = MARKER_SEARCH_LIMIT;
