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

/**
 * The colours our letters are drawn in, as RGB565: the ink of a shadowed letter, the ink of a plain one, and
 * the shadow. Which colours is a choice, the family's, `FourSlotChoices.letterInks`, `todo-compile-650.md`
 * 10.7.5; nothing that reads our letters back depends on them, since `letterForm` and the structure a
 * blended letter keeps read where a letter's ink and shadow are rather than what colour they are.
 */
export interface LetterInks {
  readonly shadowed: number;
  readonly plain: number;
  readonly shadow: number;
}

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
  inks: LetterInks,
  background?: number,
): (number | undefined)[][] {
  if (background !== undefined) return blendedRows(face, character, lettering, inks, background);
  const mask = letterMask(face, character);
  const ink = inks[lettering];
  return mask.map((line, y) => [...line].map((cell, x): number | undefined => {
    if (cell === '#') return ink;
    if (lettering === 'shadowed' && y > 0 && x > 0 && mask[y - 1]![x - 1] === '#') return inks.shadow;
    return undefined;
  }));
}

/** A character's one bit mask in a face, `#` for ink and anything else for none. */
function letterMask(face: OxaniumFaceName, character: string): readonly string[] {
  const mask = (OXANIUM_FACES[face].glyphs as Readonly<Record<string, readonly string[]>>)[character];
  if (mask === undefined) throw new RangeError(`face ${face} has no letter '${character}'`);
  return mask;
}

function blendedRows(
  face: OxaniumFaceName, character: string, lettering: Lettering, inks: LetterInks, background: number,
): (number | undefined)[][] {
  const v = letterCoverage(face, character);
  const ink = rgb565(inks[lettering]);
  const shadow = rgb565(inks.shadow);
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
    if (cover < 1 && (colour === inks.shadowed || colour === inks.plain)) return (colour & 0x1f) < 0x1f ? colour + 1 : colour - 1;
    return colour;
  }));
}

/** The glyph `letterRows` draws, as `glyphAt` would decode it, less the address and length it has none of yet. */
export function letterGlyph(
  face: OxaniumFaceName, character: string, lettering: Lettering, inks: LetterInks, background?: number,
): Glyph {
  const rows = letterRows(face, character, lettering, inks, background);
  return { address: 0, width: rows[0]!.length, rows, length: 0 };
}

/**
 * A one bit letter's form, whatever its colours: which pixels are ink and whether a shadow falls one down
 * and one right of them, `<height>:S:` or `<height>:P:` and the ink's mask, `#` and `.` per pixel, rows
 * parted by `/`. The ink and shadow it was drawn in come with it. Undefined for anything else: a blended
 * letter, more than two colours, or two that do not stand to each other as an ink and its shadow, every
 * pixel of the second one down and one right of the first and no such pixel without it.
 *
 * This is what lets the letters' colours be a choice, `todo-compile-650.md` 10.7.5: a configuration is read
 * by the form of its letters, so whichever inks it was lettered in, the same alphabet reads it.
 */
export function letterForm(
  rows: readonly (readonly (number | undefined)[])[],
): { form: string; lettering: Lettering; ink: number; shadow?: number } | undefined {
  const colours = new Set<number>();
  for (const row of rows) for (const p of row) if (p !== undefined) colours.add(p);
  const maskOf = (ink: number): string => rows.map((row) => row.map((p) => (p === ink ? '#' : '.')).join('')).join('/');
  if (colours.size === 1) {
    const [ink] = colours as unknown as [number];
    return { form: `${rows.length}:P:${maskOf(ink)}`, lettering: 'plain', ink };
  }
  if (colours.size !== 2) return undefined;
  const [a, b] = [...colours] as [number, number];
  const shadows = (ink: number, shadow: number): boolean => rows.every((row, y) => row.every((p, x) => {
    if (p === ink) return true;
    const under = y > 0 && x > 0 && rows[y - 1]![x - 1] === ink;
    return (p === shadow) === under;
  }));
  const readings = ([[a, b], [b, a]] as const).filter(([ink, shadow]) => shadows(ink, shadow));
  if (readings.length !== 1) return undefined;
  const [ink, shadow] = readings[0]!;
  return { form: `${rows.length}:S:${maskOf(ink)}`, lettering: 'shadowed', ink, shadow };
}

/** The form `letterForm` reads off a character of a face drawn in either colouring, from its mask alone. */
export function maskForm(face: OxaniumFaceName, character: string, lettering: Lettering): string {
  const mask = letterMask(face, character);
  const body = mask.map((line) => [...line].map((cell) => (cell === '#' ? '#' : '.')).join('')).join('/');
  return `${mask.length}:${lettering === 'shadowed' ? 'S' : 'P'}:${body}`;
}

/**
 * The structure `letterStructure` reads off a character of a face blended into any background, from its
 * coverage alone: `W` or `D` where it covers the whole pixel, by its colouring, `+` where it covers part of
 * it or its shadow does, `_` elsewhere. The same string `letterStructure` gives the drawn letter, since
 * `letterRows` keeps a part covered pixel off both inks, whatever the inks are.
 */
export function coverageStructure(face: OxaniumFaceName, character: string, lettering: Lettering): string {
  const v = letterCoverage(face, character);
  const full = lettering === 'shadowed' ? 'W' : 'D';
  return v.map((row, y) => row.map((cover, x) => {
    const under = lettering === 'shadowed' && y > 0 && x > 0 ? v[y - 1]![x - 1]! : 0;
    if (cover === 0 && under === 0) return '_';
    return cover === 1 ? full : '+';
  }).join('')).join('/');
}

/**
 * A glyph's structure, which a blended letter keeps whatever it was blended into: per pixel, skipped, the
 * shadowed letters' ink, the plain letters' ink, or anything else. A letter reaches its ink only where it
 * covers the whole pixel, and `letterRows` keeps every part covered pixel off both inks, so the structure is
 * the mask of full coverage plus the mask of any coverage or shadow, whatever the background. That tells the
 * characters of a face apart as the one bit mask does. Which colours are the inks the reader learns from the
 * configuration's one bit letters, `letterForm`.
 */
export function letterStructure(
  rows: readonly (readonly (number | undefined)[])[], inks: { readonly shadowed: number; readonly plain: number },
): string {
  const symbol = (p: number | undefined): string =>
    p === undefined ? '_' : p === inks.shadowed ? 'W' : p === inks.plain ? 'D' : '+';
  return rows.map((row) => row.map(symbol).join('')).join('/');
}
