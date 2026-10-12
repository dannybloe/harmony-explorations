/**
 * The few parts of opentype.js the codec uses, `typeface.ts`: the package ships no types. Pinned at 2.0.0,
 * which depends on nothing, `todo-compile-650.md` 10.8.
 */
declare module 'opentype.js' {
  import type { PathCommand } from './raster.ts';

  export interface Glyph {
    readonly advanceWidth?: number;
    /** The outline's box in font units, y up. */
    getBoundingBox(): { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number };
    /** The outline at `fontSize` pixels to the em, its origin at `x`, its baseline at `y`, y running down. */
    getPath(x: number, y: number, fontSize: number): { readonly commands: readonly PathCommand[] };
  }

  export interface Font {
    readonly unitsPerEm: number;
    charToGlyph(character: string): Glyph;
  }

  const opentype: { parse(buffer: ArrayBuffer): Font };
  export default opentype;
}
