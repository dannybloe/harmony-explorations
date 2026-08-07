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
/**
 * Arch 9 packs its glyphs differently and no arch 9 firmware exists here to read it out of, so
 * the decoder refuses that architecture rather than guessing.
 */
export const IMAGE_ARCHITECTURES: ReadonlySet<number> = new Set([8, 12, 14]);
/**
 * A glyph code is one based: zero terminates an inline string, so the firmware indexes the set by
 * the code minus one. Sections 40 and 46.
 */
export const GLYPH_CODE_BIAS = 1;

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
  /** One entry per pixel, `undefined` for a background pixel the encoding skipped. */
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
