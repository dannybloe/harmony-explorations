/**
 * Our letters: an Oxanium mask made into a glyph of the remote's own kind, and the alphabet that reads one
 * back. `todo-compile-650.md` 8.2, decisions 19 and 20.
 *
 * A glyph on the Harmony 600, 650 and 700 is rows of pixels, each either a colour or skipped, so the
 * background shows through. Logitech's letters are one ink colour, and on most fonts a drop shadow: the ink
 * again one pixel right and one down, under the ink. That shape is the whole of what is copied from them,
 * and `oxanium.ts` holds the letters themselves as one bit masks, rendered from Oxanium by
 * `tools/oxanium_glyphs.py`. This module only colours a mask in:
 *
 * * **shadowed**, white ink over a black shadow, decision 20, for every font Logitech draws with a shadow;
 * * **plain**, dark ink and no shadow, for the fonts Logitech draws without one, which are the words on the
 *   top and bottom bars. Their ink is Logitech's own dark grey, `0x2104`, the one ink all 39 of those font
 *   sets hold across the 13 Harmony 650 compiles, kept because the bars stay white.
 *
 * The alphabet is the reverse, the way `text.ts` reads any font: a glyph's pixels to the character it draws.
 * It is built here from the same masks, for every face in both colourings, so a configuration lettered by
 * `fonttable.ts` reads back through the same `characterMap` every configuration does.
 *
 * It sits apart from `fonttable.ts` because `text.ts` needs the alphabet and `fonttable.ts` needs `text.ts`.
 */
import type { Glyph } from './font.ts';
import { OXANIUM_FACES, type OxaniumFaceName } from './oxanium.ts';

/** The two colourings a letter is drawn in, decision 20. */
export type Lettering = 'shadowed' | 'plain';

export const LETTERING_INK: Readonly<Record<Lettering, number>> = { shadowed: 0xffff, plain: 0x2104 };
/** The shadow of a shadowed letter, black. Logitech's was dark grey on 130 of the 13 compiles' 196 shadowed sets and black on 66. */
export const LETTERING_SHADOW = 0x0000;

/** The characters every face holds: printable ASCII, the space included. */
export const LETTERING_CHARACTERS: readonly string[] = Array.from({ length: 95 }, (_, k) => String.fromCharCode(32 + k));

export const LETTERING_FACES = Object.keys(OXANIUM_FACES) as OxaniumFaceName[];

/**
 * A character of a face, coloured: rows the face's cell high, a pixel the ink where the mask has ink, the
 * shadow where a shadowed letter's mask has ink one up and one left and none here, and skipped elsewhere.
 * The shadow of the bottom row and of the last column falls outside the glyph only where the mask put ink
 * there, which `oxanium_glyphs.py` avoids for the columns by ending every glyph on a blank one.
 */
export function letterRows(face: OxaniumFaceName, character: string, lettering: Lettering): (number | undefined)[][] {
  const mask = (OXANIUM_FACES[face].glyphs as Readonly<Record<string, readonly string[]>>)[character];
  if (mask === undefined) throw new RangeError(`face ${face} has no letter '${character}'`);
  const ink = LETTERING_INK[lettering];
  return mask.map((line, y) => [...line].map((cell, x): number | undefined => {
    if (cell === '#') return ink;
    if (lettering === 'shadowed' && y > 0 && x > 0 && mask[y - 1]![x - 1] === '#') return LETTERING_SHADOW;
    return undefined;
  }));
}

/** The glyph `letterRows` draws, as `glyphAt` would decode it, less the address and length it has none of yet. */
export function letterGlyph(face: OxaniumFaceName, character: string, lettering: Lettering): Glyph {
  const rows = letterRows(face, character, lettering);
  return { address: 0, width: rows[0]!.length, rows, length: 0 };
}
