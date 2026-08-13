/**
 * Base slot 7, the font table, and the run length encoded glyphs it addresses.
 *
 * Ported from `src/harmony/gspm.py`. `docs/findings.md` section 46, which is also the section
 * that was corrected in place the day after it landed: the set header's first byte is the glyph
 * height and not a slot count, and the wrong reading made the inline string codes look like they
 * overran their set. The lesson is in the section, and section 78 had to apply it a second time
 * to the two header bytes below the height: they are a first code and a count, not a count and a
 * spare that swap places by architecture.
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
export const IMAGE_ARCHITECTURES: ReadonlySet<number> = new Set([8, 9, 12, 14]);
/**
 * The first code a set covers when the header does not state one. Zero terminates an inline
 * string, so nothing can name the first glyph by the code zero. Sections 40 and 46.
 */
export const GLYPH_FIRST_CODE_DEFAULT = 1;

export interface FontSetHeader {
  height: number;
  /** The code the first pointer belongs to, so a glyph's index is `code - first`. */
  first: number;
  count: number;
  /** The byte the count sits at, 1 or 2. Not decided by the architecture, section 78. */
  countAt: 1 | 2;
  /** Whatever the other byte holds, carried rather than assumed. */
  spare: number;
}

/**
 * Read a set's three byte header, section 78.
 *
 * ```
 * +0x00  u8   glyph height in pixels
 * +0x01  u8   the first glyph code
 * +0x02  u8   the glyph count
 * ```
 *
 * **unless `+0x02` is zero**, and then the count is at `+0x01` and the first code is 1. Section 46
 * read that as an architecture rule, `1` at `+0x01` on arch 8, 9 and 14 and the count there on
 * arch 12, and it is not one: the One's own safe mode container carries the other shape, which is
 * why 47 of its inline strings resolved through a set the reader had cut to a single glyph. What
 * settled the meaning of `+0x01` is the arch 9 safe mode container, whose sets start at code 32:
 * its strings render as English only when the index is `code - 32`, and the glyphs it ships are
 * exactly the ASCII characters its own text uses.
 */
export function fontSetHeader(blob: Uint8Array, off: number): FontSetHeader {
  const height = u8(blob, off);
  const second = u8(blob, off + 1);
  const third = u8(blob, off + 2);
  return third === 0
    ? { height, first: GLYPH_FIRST_CODE_DEFAULT, count: second, countAt: 1, spare: third }
    : { height, first: second, count: third, countAt: 2, spare: second };
}

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
  /**
   * Shared by every glyph in the set, and checked against every glyph decoded through a route that
   * has the set in hand: `glyphs`, `decodedSet` and `glyphOf`. `glyphAt` on its own cannot, since
   * it is handed an address and no set.
   */
  height: number;
  /** The code `glyphs[0]` belongs to. 1 in every user config, 32 and 72 in a safe mode one. */
  first: number;
  count: number;
  /** Where the count was read from, and the byte that was not the count. */
  countAt: 1 | 2;
  spare: number;
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
 * +0x01  u8   the first glyph code, or the count when the byte below is zero
 * +0x02  u8   the glyph count
 * +0x03  u24  glyph[count]     NULL for a code this config never draws
 * ```
 *
 * The section itself is a plain pointer array, and opcode 16 of the screen language indexes it.
 * `fontSetHeader` carries the argument for the two byte reading.
 */
export function fontSets(c: Container): FontSet[] | undefined {
  if (c.architecture === undefined) return undefined;
  let slot: number;
  try {
    slot = archSlot(c.architecture, IMAGE_TABLE_SLOT);
  } catch (error) {
    if (error instanceof GspmError) return undefined;
    throw error;
  }
  const entries = slot < c.sections.length ? c.pointerArray(slot) : undefined;
  if (entries === undefined) return undefined;

  const out: FontSet[] = [];
  for (const entry of entries) {
    const off = c.blobOffsetOf(entry);
    if (off === undefined || off + IMAGE_SET_HEADER > c.blob.length) return undefined;
    const { height, first, count, countAt, spare } = fontSetHeader(c.blob, off);
    const end = off + IMAGE_SET_HEADER + 3 * count;
    if (end > c.blob.length) return undefined;
    const glyphs: (number | undefined)[] = [];
    for (let p = off + IMAGE_SET_HEADER; p < end; p += 3) {
      const address = u24(c.blob, p);
      glyphs.push(address === 0 ? undefined : address);
    }
    out.push({
      address: entry,
      height,
      first,
      count,
      countAt,
      spare,
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
 * The set's own height, enforced rather than described.
 *
 * `FontSet.height` said "shared by every glyph in the set, and checked against every decoded glyph"
 * and nothing checked it: the only comparison was an assertion in `screen.test.ts`, so the promise
 * held for the corpus and not for a caller. It is a real guarantee now, on every route that has a
 * set in hand, and it costs nothing today because all 3772 glyphs in the corpus agree with their
 * set's header. What it buys is the container that does not, which is the shape section 46 and
 * section 78 each found once in this very field. Section 139.
 */
function ofDeclaredHeight(font: FontSet, glyph: Glyph | undefined): Glyph | undefined {
  if (glyph === undefined || glyph.rows.length !== font.height) return undefined;
  return glyph;
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
    const decoded: Glyph[] = [];
    for (const { glyph } of decodedSet(c, font)) {
      if (glyph === undefined) return undefined;
      decoded.push(glyph);
    }
    out.push(decoded);
  }
  return out;
}

/**
 * One decoded glyph per **live** address in the set, in address order.
 *
 * Shared by `glyphs` and by `text.ts`'s resolver, which decoded the same glyphs itself and did so
 * **unbounded**, so the one path whose decode nothing constrained was the one that resolves a
 * character. Both routes go through here now, which is the rule about a derivation existing once.
 * An entry is `undefined` where the glyph does not decode or does not match the set's height.
 */
export function decodedSet(c: Container, font: FontSet): DecodedGlyph[] {
  const live: { index: number; address: number }[] = [];
  for (const [index, address] of font.glyphs.entries()) {
    if (address !== undefined) live.push({ index, address });
  }
  live.sort((a, b) => a.address - b.address);
  return live.map(({ index, address }, i) => ({
    index,
    address,
    // Bounded by the next glyph, and the last by the set's own header, because the glyphs are laid
    // out immediately before the array that points at them.
    glyph: ofDeclaredHeight(
      font,
      glyphAt(c, address, c.blobOffsetOf((live[i + 1]?.address ?? font.address) as number)),
    ),
  }));
}

export interface DecodedGlyph {
  /** The position in `FontSet.glyphs`, so the code is `font.first + index`. */
  index: number;
  address: number;
  glyph: Glyph | undefined;
}

/**
 * The glyph an inline string's code names, or undefined if it names nothing.
 *
 * The index is `code - font.first`, which is the code minus one in every user config and the code
 * minus 32 in the arch 9 safe mode container. Section 78; the subtraction lives here rather than
 * in every caller.
 */
export function glyphOf(c: Container, font: FontSet, code: number): Glyph | undefined {
  const index = code - font.first;
  if (index < 0 || index >= font.glyphs.length) return undefined;
  const address = font.glyphs[index];
  if (address === undefined) return undefined;
  const live = font.glyphs.filter((a): a is number => a !== undefined).sort((a, b) => a - b);
  const after = live.find((a) => a > address);
  return ofDeclaredHeight(font, glyphAt(c, address, c.blobOffsetOf(after ?? font.address)));
}
