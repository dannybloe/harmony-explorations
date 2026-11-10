/**
 * The few parts of opentype.js the codec uses, `typeface.ts`, and a line of text for a Harmony
 * Touch's channel logo, `families/harmony-touch/favourites.ts`: the package ships no types. Pinned at 2.0.0, which
 * depends on nothing.
 */
declare module 'opentype.js' {
  import type { PathCommand } from './raster.ts';

  export interface Glyph {
    /** The glyph's place in the font, 0 being the one drawn for a character the font lacks. */
    readonly index: number;
    readonly advanceWidth?: number;
    /** The outline's box in font units, y up. */
    getBoundingBox(): { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number };
    /** The outline at `fontSize` pixels to the em, its origin at `x`, its baseline at `y`, y running down. */
    getPath(x: number, y: number, fontSize: number): { readonly commands: readonly PathCommand[] };
  }

  export interface Font {
    readonly unitsPerEm: number;
    readonly ascender: number;
    readonly descender: number;
    charToGlyph(character: string): Glyph;
    /** A line of text at `fontSize` pixels to the em, its origin at `x`, its baseline at `y`, y running down; its box in the same units. */
    getPath(text: string, x: number, y: number, fontSize: number): {
      readonly commands: readonly PathCommand[];
      getBoundingBox(): { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number };
    };
  }

  const opentype: { parse(buffer: ArrayBuffer): Font };
  export default opentype;
}
