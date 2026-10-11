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
 * **Or blended into the colour it is drawn on**, 8.2.6: where a text sits on one flat colour, the letter is
 * drawn from Oxanium's grey coverage rather than its mask, every pixel the ink mixed with what lies under
 * it in proportion to how much of the pixel the letter covers. The shadow is soft the same way, the
 * coverage of the pixel one up and one left darkening the background before the ink goes over it. Logitech
 * draws no grey edge anywhere, every one of its sets being an ink and at most a shadow; but a pixel is a
 * full colour, so the remote draws a blended letter as it draws any other, and a set blended for one
 * background is only right on that background, which is why `blending.ts` gives every background its own
 * copy of a set.
 *
 * The alphabet is the reverse, the way `text.ts` reads any font: a glyph's pixels to the character it draws.
 * It is built here from the same masks, for every face in both colourings, so a configuration lettered by
 * `fonttable.ts` reads back through the same `characterMap` every configuration does. A blended letter's
 * pixels depend on its background, so it is recognised by its structure instead, `letterStructure`.
 *
 * It sits apart from `fonttable.ts` because `text.ts` needs the alphabet and `fonttable.ts` needs `text.ts`.
 */
import type { Glyph } from './font.ts';
import { OXANIUM_FACES, type OxaniumFaceName } from './oxanium.ts';
import { rgb565, rgbTo565 } from './png.ts';

/** The two colourings a letter is drawn in, decision 20. */
export type Lettering = 'shadowed' | 'plain';

export const LETTERING_INK: Readonly<Record<Lettering, number>> = { shadowed: 0xffff, plain: 0x2104 };
/** The shadow of a shadowed letter, black. Logitech's was dark grey on 130 of the 13 compiles' 196 shadowed sets and black on 66. */
export const LETTERING_SHADOW = 0x0000;

/** The characters every face holds: printable ASCII, the space included. */
export const LETTERING_CHARACTERS: readonly string[] = Array.from({ length: 95 }, (_, k) => String.fromCharCode(32 + k));

export const LETTERING_FACES = Object.keys(OXANIUM_FACES) as OxaniumFaceName[];

/** The highest grey level `oxanium.ts` writes, one hexadecimal digit, `0` being no ink. */
export const LETTERING_GREY_LEVELS = 15;

/** A character's grey coverage on its glyph's box, each pixel from 0 to 1. */
export function letterCoverage(face: OxaniumFaceName, character: string): number[][] {
  const greys = (OXANIUM_FACES[face].greys as Readonly<Record<string, readonly string[]>>)[character];
  if (greys === undefined) throw new RangeError(`face ${face} has no letter '${character}'`);
  return greys.map((line) => [...line].map((cell) => (cell === '.' ? 0 : parseInt(cell, 16) / LETTERING_GREY_LEVELS)));
}

/**
 * A character of a face, coloured: rows the face's cell high, the glyph's width wide.
 *
 * With no `background`, the one bit letter Logitech's sets are drawn like: a pixel the ink where the mask has
 * ink, the shadow where a shadowed letter's mask has ink one up and one left and none here, and skipped
 * elsewhere. The shadow of the bottom row and of the last column falls outside the glyph only where the mask
 * put ink there, which `oxanium_glyphs.py` avoids for the columns by ending every glyph on a blank one.
 *
 * With a `background`, the RGB565 colour the letter will be drawn on, the letter blended into it from its
 * grey coverage `v`: the ink times `v` over what is under it times `1 - v`, where what is under a shadowed
 * letter is the background darkened towards the shadow by the coverage `s` one up and one left. A pixel
 * neither covers is skipped, so the background shows through as it does around a one bit letter.
 */
export function letterRows(
  face: OxaniumFaceName,
  character: string,
  lettering: Lettering,
  background?: number,
): (number | undefined)[][] {
  if (background !== undefined) return blendedRows(face, character, lettering, background);
  const mask = (OXANIUM_FACES[face].glyphs as Readonly<Record<string, readonly string[]>>)[character];
  if (mask === undefined) throw new RangeError(`face ${face} has no letter '${character}'`);
  const ink = LETTERING_INK[lettering];
  return mask.map((line, y) => [...line].map((cell, x): number | undefined => {
    if (cell === '#') return ink;
    if (lettering === 'shadowed' && y > 0 && x > 0 && mask[y - 1]![x - 1] === '#') return LETTERING_SHADOW;
    return undefined;
  }));
}

function blendedRows(face: OxaniumFaceName, character: string, lettering: Lettering, background: number): (number | undefined)[][] {
  const v = letterCoverage(face, character);
  const ink = rgb565(LETTERING_INK[lettering]);
  const shadow = rgb565(LETTERING_SHADOW);
  const paper = rgb565(background);
  return v.map((row, y) => row.map((cover, x): number | undefined => {
    const under = lettering === 'shadowed' && y > 0 && x > 0 ? v[y - 1]![x - 1]! : 0;
    if (cover === 0 && under === 0) return undefined;
    const mixed = [0, 1, 2].map((k) => {
      const below = paper[k]! * (1 - under) + shadow[k]! * under;
      return Math.round(ink[k]! * cover + below * (1 - cover));
    });
    const colour = rgbTo565(mixed[0]!, mixed[1]!, mixed[2]!);
    // A pixel the letter only partly covers must not come out as an ink, or `letterStructure` would read it
    // as fully covered: on the dark start up screen a light shadow lands on Logitech's dark grey exactly.
    // One blue step off it is a difference no eye sees on this panel.
    if (cover < 1 && INKS.has(colour)) return (colour & 0x1f) < 0x1f ? colour + 1 : colour - 1;
    return colour;
  }));
}

const INKS: ReadonlySet<number> = new Set(Object.values(LETTERING_INK));

/** The glyph `letterRows` draws, as `glyphAt` would decode it, less the address and length it has none of yet. */
export function letterGlyph(face: OxaniumFaceName, character: string, lettering: Lettering, background?: number): Glyph {
  const rows = letterRows(face, character, lettering, background);
  return { address: 0, width: rows[0]!.length, rows, length: 0 };
}

/**
 * A glyph's structure, which a blended letter keeps whatever it was blended into: per pixel, skipped, the
 * white ink, the dark ink, or anything else. A letter reaches its ink only where it covers the whole pixel,
 * and `letterRows` keeps every part covered pixel off both inks, so the structure is the mask of full
 * coverage plus the mask of any coverage or shadow, whatever the background. That tells the characters of a
 * face apart as the one bit mask does, and a one bit letter has a structure too, its ink and its shadow.
 */
export function letterStructure(rows: readonly (readonly (number | undefined)[])[]): string {
  const symbol = (p: number | undefined): string =>
    p === undefined ? '_' : p === LETTERING_INK.shadowed ? 'W' : p === LETTERING_INK.plain ? 'D' : '+';
  return rows.map((row) => row.map(symbol).join('')).join('/');
}
