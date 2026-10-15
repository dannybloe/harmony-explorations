/**
 * Our letters: an Oxanium mask made into a glyph of the remote's own kind, and the alphabet that reads one
 * back. `todo-compile-650.md` 8.2, decisions 19 and 20.
 *
 * A glyph on the Harmony 600, 650 and 700 is rows of pixels, each either a colour or skipped, so the
 * background shows through. Logitech's letters are one ink colour, and on most fonts a drop shadow: the ink
 * again one pixel right and one down, under the ink. That shape is the whole of what is copied from them,
 * and `typeface.ts` draws the letters themselves from Oxanium's outlines, a one bit mask and grey levels per
 * character, `todo-compile-650.md` 10.8. This module only colours a mask in:
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
import { rgb565, rgbTo565 } from './png.ts';
import { renderFace, type FaceSpec, type RenderedFace } from './typeface.ts';

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

/**
 * The faces our letters come in. The first nine are one per face Logitech draws its Harmony 650 screens in, measured in
 * 8.2 over the 13 compiles in the lab's `work/sample-8-2/`: each one's cell height, the row its baseline
 * sits on, whether a glyph opens with a blank column, and the width of a space; the Oxanium cut and pixel
 * size whose capitals and x-height land on Logitech's rows, the weight chosen by look, Regular for the
 * three regular faces and SemiBold for the six label faces; and the rows its letters reach, which are the
 * rows the letters drawn with Pillow in 8.2 reached, which the renderer fits the outlines to since that is
 * what Pillow's hinting did, `todo-compile-650.md` 10.8. Tunable, decision 19.
 */
export const OXANIUM_FACE_SPECS = {
  F15: { what: 'bold 15, corner labels and menu rows', cell: 15, baseline: 11, lead: 1, weight: 'SemiBold', px: 14, space: 4,
    rows: { cap: 10, x: 8, ascender: 11, descender: 3 } },
  F14W: { what: 'bold 14 wide, corner labels', cell: 14, baseline: 10, lead: 1, weight: 'SemiBold', px: 13, space: 4,
    rows: { cap: 10, x: 7, ascender: 10, descender: 3 } },
  F14: { what: 'bold 14, titles, counter, bottom words, corner labels', cell: 14, baseline: 10, lead: 0, weight: 'SemiBold', px: 12, space: 3,
    rows: { cap: 9, x: 7, ascender: 9, descender: 3 } },
  F13: { what: 'bold 13, corner labels', cell: 13, baseline: 9, lead: 0, weight: 'SemiBold', px: 11, space: 3,
    rows: { cap: 8, x: 6, ascender: 8, descender: 2 } },
  F11: { what: 'thin 11, corner labels', cell: 11, baseline: 8, lead: 1, weight: 'SemiBold', px: 9, space: 3,
    rows: { cap: 7, x: 5, ascender: 7, descender: 2 } },
  F10: { what: 'thin 10, corner labels', cell: 10, baseline: 7, lead: 0, weight: 'SemiBold', px: 9, space: 3,
    rows: { cap: 7, x: 5, ascender: 7, descender: 2 } },
  R15: { what: 'regular 15, firmware and status screens, Help', cell: 15, baseline: 11, lead: 1, weight: 'Regular', px: 14, space: 4,
    rows: { cap: 10, x: 8, ascender: 11, descender: 3 } },
  R14: { what: 'regular 14, start up and Off screens, Help, the tour', cell: 14, baseline: 10, lead: 1, weight: 'Regular', px: 12, space: 3,
    rows: { cap: 9, x: 7, ascender: 9, descender: 3 } },
  R13: { what: 'regular 13, Help', cell: 13, baseline: 9, lead: 0, weight: 'Regular', px: 11, space: 3,
    rows: { cap: 8, x: 6, ascender: 8, descender: 2 } },
  // The Harmony One's five faces, measured over every set of its nine Logitech compiles in the lab
  // (`work/one-track/fonts/rows.ts`): the same cells as the 650's, but a 14 or 15 pixel capital is a row
  // shorter and starts a row lower, on row 3 on all 1009 of them, and the 16 pixel face is the greeting's alone.
  // The 11 pixel face sits on the 650's rows and opens with ink rather than a blank column on 218 of 307
  // letters. Findings section 396.
  // The weights are the ones whose stroke is Logitech's, the median run of ink along a row: Bold draws the
  // bold faces two pixels wide, as Logitech's are, where SemiBold draws them one, which `measureSet` would
  // read back as a regular face; the 11 pixel face is one pixel in both, and the regular 15 is Regular. Our letters reach the same rows on all five, `todo-compile-one.md` 5.2.
  One16: { what: 'bold 16, the greeting', cell: 16, baseline: 12, lead: 1, weight: 'Bold', px: 14, space: 4,
    rows: { cap: 10, x: 7, ascender: 10, descender: 3 } },
  One15: { what: 'bold 15, menu rows and titles on the Harmony One', cell: 15, baseline: 11, lead: 0, weight: 'Bold', px: 12, space: 3,
    rows: { cap: 9, x: 7, ascender: 9, descender: 2 } },
  OneR15: { what: 'regular 15, Help and prose on the Harmony One', cell: 15, baseline: 11, lead: 1, weight: 'Regular', px: 12, space: 3,
    rows: { cap: 9, x: 7, ascender: 9, descender: 2 } },
  One14: { what: 'bold 14, pads and device rows on the Harmony One', cell: 14, baseline: 10, lead: 0, weight: 'Bold', px: 11, space: 3,
    rows: { cap: 8, x: 6, ascender: 8, descender: 2 } },
  One11: { what: 'bold 11, the clock and small labels on the Harmony One', cell: 11, baseline: 8, lead: 0, weight: 'SemiBold', px: 9, space: 3,
    rows: { cap: 7, x: 5, ascender: 7, descender: 2 } },
} as const satisfies Record<string, FaceSpec>;

export type OxaniumFaceName = keyof typeof OXANIUM_FACE_SPECS;

/** A face and its letters: per character the one bit mask and the grey coverage on the same box. */
export interface OxaniumFace extends FaceSpec, RenderedFace {}

export const LETTERING_FACES = Object.keys(OXANIUM_FACE_SPECS) as OxaniumFaceName[];

/** The nine faces measured on the Harmony 650, `todo-compile-650.md` 8.2. */
export const HARMONY_650_FACES: readonly OxaniumFaceName[] = ['F15', 'F14W', 'F14', 'F13', 'F11', 'F10', 'R15', 'R14', 'R13'];

/** The five measured on the Harmony One, `todo-compile-one.md` 5.2. */
export const HARMONY_ONE_FACES: readonly OxaniumFaceName[] = ['One16', 'One15', 'OneR15', 'One14', 'One11'];

/**
 * The cuts of Oxanium this repository carries, lightest first, `fonts/Oxanium/static/`. Which one a face is
 * drawn in is a choice, `FourSlotChoices.faceWeights`, `todo-compile-650.md` 10.8.5; the face's size is
 * not, since its rows are Logitech's and the outline is fitted to them.
 */
export const OXANIUM_WEIGHTS = ['ExtraLight', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold'] as const;
export type OxaniumWeight = (typeof OXANIUM_WEIGHTS)[number];

/** A face's weight where none is chosen: the one decided by look in 8.2, `OXANIUM_FACE_SPECS`. */
export function defaultWeight(name: OxaniumFaceName): OxaniumWeight {
  return OXANIUM_FACE_SPECS[name].weight;
}

/**
 * A face to draw a letter in: one of the nine by name, in its default weight, or with the weight chosen.
 * What a set lettered by `withOxaniumFonts` records, `SetFace`, is the second.
 */
export type LetterFace = OxaniumFaceName | { readonly name: OxaniumFaceName; readonly weight: OxaniumWeight };

const faces = new Map<string, OxaniumFace>();

/**
 * One of our faces with its letters in a weight, its default unless given, drawn from Oxanium's outlines by
 * `typeface.ts` on first use and kept. They replaced the letters `tools/oxanium_glyphs.py` drew with Pillow
 * once a preview of the two side by side was approved, `todo-compile-650.md` 10.8.
 */
export function oxaniumFace(name: OxaniumFaceName, weight: OxaniumWeight = defaultWeight(name)): OxaniumFace {
  const key = `${name}/${weight}`;
  let face = faces.get(key);
  if (face === undefined) {
    const spec = { ...OXANIUM_FACE_SPECS[name], weight };
    const letters = renderFace(spec, LETTERING_CHARACTERS);
    face = { ...spec, glyphs: letters.glyphs, greys: letters.greys };
    faces.set(key, face);
  }
  return face;
}

/** The face a `LetterFace` names, with its letters. */
export function faceOf(face: LetterFace): OxaniumFace {
  return typeof face === 'string' ? oxaniumFace(face) : oxaniumFace(face.name, face.weight);
}

function nameOf(face: LetterFace): string {
  return typeof face === 'string' ? face : `${face.name} ${face.weight}`;
}

/** The highest grey level `typeface.ts` draws, one hexadecimal digit, `0` being no ink. */
export const LETTERING_GREY_LEVELS = 15;

/** A character's grey coverage on its glyph's box, each pixel from 0 to 1. */
export function letterCoverage(face: LetterFace, character: string): number[][] {
  const greys = faceOf(face).greys[character];
  if (greys === undefined) throw new RangeError(`face ${nameOf(face)} has no letter '${character}'`);
  return greys.map((line) => [...line].map((cell) => (cell === '.' ? 0 : parseInt(cell, 16) / LETTERING_GREY_LEVELS)));
}

/**
 * A character of a face, coloured: rows the face's cell high, the glyph's width wide.
 *
 * With no `background`, the one bit letter Logitech's sets are drawn like: a pixel the ink where the mask has
 * ink, the shadow where a shadowed letter's mask has ink one up and one left and none here, and skipped
 * elsewhere. The shadow of the bottom row and of the last column falls outside the glyph only where the mask
 * put ink there, which `typeface.ts` avoids for the columns by ending every glyph on a blank one.
 *
 * With a `background`, the RGB565 colour the letter will be drawn on, the letter blended into it from its
 * grey coverage `v`: the ink times `v` over what is under it times `1 - v`, where what is under a shadowed
 * letter is the background darkened towards the shadow by the coverage `s` one up and one left. A pixel
 * neither covers is skipped, so the background shows through as it does around a one bit letter.
 */
export function letterRows(
  face: LetterFace,
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
function letterMask(face: LetterFace, character: string): readonly string[] {
  const mask = faceOf(face).glyphs[character];
  if (mask === undefined) throw new RangeError(`face ${nameOf(face)} has no letter '${character}'`);
  return mask;
}

function blendedRows(
  face: LetterFace, character: string, lettering: Lettering, inks: LetterInks, background: number,
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
  face: LetterFace, character: string, lettering: Lettering, inks: LetterInks, background?: number,
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
export function maskForm(face: LetterFace, character: string, lettering: Lettering): string {
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
export function coverageStructure(face: LetterFace, character: string, lettering: Lettering): string {
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
