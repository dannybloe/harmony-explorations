/**
 * Base slot 7, the font table, and the run length encoded glyphs it addresses.
 *
 * Ported from `src/harmony/gspm.py`. `docs/findings.md` section 46, which is also the section
 * that was corrected in place the day after it landed: the set header's first byte is the glyph
 * height and not a slot count, and the wrong reading made the inline string codes look like they
 * overran their set. The lesson is in the section; what matters here is that `IMAGE_COUNT_OFFSET`
 * is per architecture because of it.
 *
 * As with the screen language, a glyph carries the byte length it decoded to, which the Python
 * original does not return. The byte accounting needs it and the decoder is the only place that
 * can produce it without a second copy of the encoding rules.
 */
import { Container, GspmError, archSlot } from './gspm.ts';
import { u16, u24, u8 } from './bytes.ts';

export const IMAGE_TABLE_SLOT = 7;
export const IMAGE_SET_HEADER = 3;
export const IMAGE_END = 0x00;
export const IMAGE_SKIP = 0x80;
/** A pixel is two bytes. A one byte pixel fails almost every closure in section 46. */
export const IMAGE_PIXEL_BYTES = 2;
/** Which byte of the three byte set header is the glyph count. Per architecture. */
export const IMAGE_COUNT_OFFSET: Readonly<Record<number, number>> = { 8: 2, 9: 2, 12: 1, 14: 2 };
export const IMAGE_ARCHITECTURES: ReadonlySet<number> = new Set([8, 9, 12, 14]);
/**
 * A glyph code is one based: zero terminates an inline string, so the firmware indexes the set by
 * the code minus one. Sections 40 and 46.
 */
export const GLYPH_CODE_BIAS = 1;

/**
 * Arch 9 shares the set header and the terminator and packs the glyph itself a second way, section
 * 63. The 5xx remotes have a monochrome panel, so a pixel is two bits rather than two bytes, and
 * that is the same lesson section 62 learned one slot over about the picture bank.
 *
 * ```
 * +0x00  u8   width in pixels
 *        one row per pixel row, ending at a 0x00 in the leader position:
 *          +0x00  u8   0x20 | n, n being how many bytes of commands the row occupies
 *          n bytes of commands, each kind << 4 | (count - 1):
 *            0x5  count literal pixels, two bits each, big endian, ceil(2 * count / 8) bytes
 *            0x6  a run of count background pixels, no data
 *            0xA  a run of count ink pixels, no data
 * ```
 *
 * The row's declared length is redundant with its commands and that redundancy is a check: it has
 * to be consumed exactly. `0x20` is constant in all 1730 rows of the only arch 9 sample, so whether
 * it is a tag or the high bits of a longer length field is not settled.
 */
export const IMAGE_PACKED_ARCHITECTURES: ReadonlySet<number> = new Set([9]);
export const IMAGE_PACKED_ROW_TAG = 0x20;
export const IMAGE_PACKED_ROW_TAG_MASK = 0xf0;
export const IMAGE_PACKED_LITERAL = 0x5;
export const IMAGE_PACKED_BACKGROUND = 0x6;
export const IMAGE_PACKED_FOREGROUND = 0xa;
export const IMAGE_PACKED_PIXEL_BITS = 2;
/**
 * Only two of the four values a two bit pixel can hold occur, in 5489 literal pixels, and which of
 * them is the ink is derived rather than assumed. A run is maximal, since the encoder would
 * otherwise have extended it: 80 of 80 adjacent run pairs alternate the two kinds and 50 of 50
 * literal pixels beside a background run read 1, never 2. So the background run's value is not 1,
 * and the ink run's is not the background's. Which of the two kinds is the background is fixed
 * independently, by 160 of 160 glyph cells opening with a full width run of kind 6.
 */
export const IMAGE_PACKED_PAPER = 2;
export const IMAGE_PACKED_INK = 1;

export interface FontSet {
  address: number;
  /** Shared by every glyph in the set, and checked against every decoded glyph. */
  height: number;
  count: number;
  /** One per code, `undefined` for a code this config never draws. */
  glyphs: (number | undefined)[];
  /** Bytes the set header and its pointer array occupy. */
  length: number;
}

export interface Glyph {
  address: number;
  width: number;
  /**
   * One entry per pixel, `undefined` for a background pixel the encoding skipped. Arch 9 never
   * skips, so no entry is `undefined` there, and its values are two bit grey levels rather than
   * the sixteen bit ones the other three architectures store. Section 63.
   */
  rows: (number | undefined)[][];
  /** Bytes the encoded glyph occupies, the leading width byte included. */
  length: number;
}

export function glyphHeight(glyph: Glyph): number {
  return glyph.rows.length;
}

/**
 * Base slot 7: one entry per typeface, with the address of each glyph or undefined.
 *
 * ```
 * +0x00  u8   glyph height, shared by every glyph in the set
 * +0x01  u8   count on arch 12, else 1
 * +0x02  u8   count on arch 8, 9 and 14, else 0
 * +0x03  u24  glyph[count]     NULL for a code this config never draws
 * ```
 *
 * The section itself is a plain pointer array, and opcode 16 of the screen language indexes it.
 */
export function fontSets(c: Container): FontSet[] | undefined {
  if (c.architecture === undefined) return undefined;
  const at = IMAGE_COUNT_OFFSET[c.architecture];
  let slot: number;
  try {
    slot = archSlot(c.architecture, IMAGE_TABLE_SLOT);
  } catch (error) {
    if (error instanceof GspmError) return undefined;
    throw error;
  }
  const entries = slot < c.sections.length ? c.pointerArray(slot) : undefined;
  if (entries === undefined || at === undefined) return undefined;

  const out: FontSet[] = [];
  for (const entry of entries) {
    const off = c.blobOffsetOf(entry);
    if (off === undefined || off + IMAGE_SET_HEADER > c.blob.length) return undefined;
    const count = u8(c.blob, off + at);
    const end = off + IMAGE_SET_HEADER + 3 * count;
    if (end > c.blob.length) return undefined;
    const glyphs: (number | undefined)[] = [];
    for (let p = off + IMAGE_SET_HEADER; p < end; p += 3) {
      const address = u24(c.blob, p);
      glyphs.push(address === 0 ? undefined : address);
    }
    out.push({
      address: entry,
      height: u8(c.blob, off),
      count,
      glyphs,
      length: IMAGE_SET_HEADER + 3 * count,
    });
  }
  return out;
}

/**
 * Decode the glyph at an absolute flash address, or undefined if the stream does not fit.
 *
 * ```
 * +0x00  u8   width in pixels
 *        u8   operation, repeated:
 *               0x00        end of glyph
 *               bit 7 set   skip that many background pixels
 *               otherwise   that many literal two byte pixels follow
 * ```
 *
 * Returns undefined rather than a partial image, because a row that does not come to exactly
 * `width` pixels means the encoding was misread, and a half decoded bitmap would hide that.
 */
export function glyphAt(c: Container, address: number, limit?: number): Glyph | undefined {
  if (c.architecture === undefined || !IMAGE_ARCHITECTURES.has(c.architecture)) return undefined;
  const off = c.blobOffsetOf(address);
  if (off === undefined || off < 0 || off >= c.blob.length) return undefined;
  const end = limit === undefined ? c.blob.length : Math.min(limit, c.blob.length);
  const width = u8(c.blob, off);
  if (width === 0) return undefined;
  if (IMAGE_PACKED_ARCHITECTURES.has(c.architecture)) return packedGlyph(c, address, off, end, width);

  let at = off + 1;
  const rows: (number | undefined)[][] = [];
  let row: (number | undefined)[] = [];
  while (at < end) {
    const op = u8(c.blob, at);
    at += 1;
    if (op === IMAGE_END) {
      if (rows.length === 0 || row.length !== 0) return undefined;
      return { address, width, rows, length: at - off };
    }
    if (op & IMAGE_SKIP) {
      for (let k = 0; k < (op & 0x7f); k += 1) row.push(undefined);
    } else {
      if (at + IMAGE_PIXEL_BYTES * op > end) return undefined;
      for (let k = 0; k < op; k += 1) {
        row.push(u16(c.blob, at));
        at += IMAGE_PIXEL_BYTES;
      }
    }
    if (row.length === width) {
      rows.push(row);
      row = [];
    } else if (row.length > width) {
      return undefined;
    }
  }
  return undefined;
}

/**
 * The arch 9 glyph encoding: rows framed by their own byte length, pixels two bits wide.
 *
 * Unlike the other three architectures this never yields `undefined` for a pixel. A background run
 * states the background rather than skipping it, so every pixel has a value.
 */
function packedGlyph(
  c: Container,
  address: number,
  off: number,
  end: number,
  width: number,
): Glyph | undefined {
  let at = off + 1;
  const rows: (number | undefined)[][] = [];
  while (at < end) {
    const leader = u8(c.blob, at);
    at += 1;
    if (leader === IMAGE_END) {
      return rows.length === 0 ? undefined : { address, width, rows, length: at - off };
    }
    if ((leader & IMAGE_PACKED_ROW_TAG_MASK) !== IMAGE_PACKED_ROW_TAG) return undefined;
    const stop = at + (leader & 0x0f);
    if (stop > end) return undefined;
    const row: (number | undefined)[] = [];
    while (at < stop) {
      const op = u8(c.blob, at);
      at += 1;
      const kind = op >> 4;
      const count = (op & 0x0f) + 1;
      if (kind === IMAGE_PACKED_BACKGROUND) {
        for (let k = 0; k < count; k += 1) row.push(IMAGE_PACKED_PAPER);
      } else if (kind === IMAGE_PACKED_FOREGROUND) {
        for (let k = 0; k < count; k += 1) row.push(IMAGE_PACKED_INK);
      } else if (kind === IMAGE_PACKED_LITERAL) {
        const need = Math.ceil((IMAGE_PACKED_PIXEL_BITS * count) / 8);
        if (at + need > stop) return undefined;
        // Bit by bit rather than through an accumulator: a full width nibble is 16 pixels, which
        // is 32 bits, and JavaScript's shift operators work on a signed 32 bit value.
        for (let k = 0; k < count; k += 1) {
          const bit = IMAGE_PACKED_PIXEL_BITS * k;
          const byte = u8(c.blob, at + (bit >> 3));
          row.push((byte >> (8 - IMAGE_PACKED_PIXEL_BITS - (bit & 7))) & 0x03);
        }
        at += need;
      } else {
        return undefined;
      }
    }
    // The row's declared length and its pixel count are two independent statements of the same
    // thing, so disagreeing means the encoding was misread rather than the data being odd. Refuse
    // instead of returning a glyph that is quietly the wrong shape.
    if (at !== stop || row.length !== width) return undefined;
    rows.push(row);
  }
  return undefined;
}

/**
 * Every glyph in base slot 7, grouped by set, with the NULL codes dropped.
 *
 * Each glyph is bounded by the next one's address, and the last by the set's own header, because
 * the glyphs are laid out immediately before the array that points at them.
 */
export function glyphs(c: Container): Glyph[][] | undefined {
  const sets = fontSets(c);
  if (sets === undefined) return undefined;
  const out: Glyph[][] = [];
  for (const font of sets) {
    const live = font.glyphs.filter((a): a is number => a !== undefined).sort((a, b) => a - b);
    const decoded: Glyph[] = [];
    for (let i = 0; i < live.length; i += 1) {
      const next = c.blobOffsetOf((live[i + 1] ?? font.address) as number);
      const picture = glyphAt(c, live[i] as number, next);
      if (picture === undefined) return undefined;
      decoded.push(picture);
    }
    out.push(decoded);
  }
  return out;
}

/**
 * The glyph an inline string's code names, or undefined if it names nothing.
 *
 * The code is one based, because zero terminates a string, so the `- 1` lives here rather than in
 * every caller.
 */
export function glyphOf(c: Container, font: FontSet, code: number): Glyph | undefined {
  const index = code - GLYPH_CODE_BIAS;
  if (index < 0 || index >= font.glyphs.length) return undefined;
  const address = font.glyphs[index];
  if (address === undefined) return undefined;
  const live = font.glyphs.filter((a): a is number => a !== undefined).sort((a, b) => a - b);
  const after = live.find((a) => a > address);
  return glyphAt(c, address, c.blobOffsetOf(after ?? font.address));
}
