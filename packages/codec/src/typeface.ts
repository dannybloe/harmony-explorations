/**
 * Our letters rendered from a typeface's outlines in the codec itself, `todo-compile-650.md` 10.8. Until
 * then `tools/oxanium_glyphs.py` rendered them with Pillow into a generated module; the rules are that
 * tool's, rule for rule. What differs is the drawing, `raster.ts`, which does not hint, so against Pillow's
 * letters 414 of the 855 masks came out identical and 33 a column narrower or wider; the faces' stated rows
 * stand in for the vertical half of the hinting. A preview of the two side by side was approved.
 *
 * **A face** is how Logitech draws one of its nine Harmony 650 faces, measured in 8.2: its cell height,
 * the row its baseline sits on, whether a glyph opens with a blank column, and the width of a space; and
 * the cut and pixel size of the typeface that lands on those rows.
 *
 * **A glyph** is the lead column if the face has one, the one bit ink from its leftmost to its rightmost
 * column, and one trailing column, which is where the shadow of the last ink column falls and what spaces
 * two letters, since the remote adds nothing between glyphs.
 *
 * **Its grey levels keep the mask's box**, so a blended letter is as wide as the one bit letter, and the
 * box may slide right by up to two columns to the place that keeps the most of the letter and, of those,
 * lies most on the one bit ink: on Oxanium the `j` is drawn a column further right in grey than in one bit.
 */
import { readFileSync } from 'node:fs';
import opentype, { type Font } from 'opentype.js';
import { rasterise, type PathCommand } from './raster.ts';

/** One face: what it draws, its cell, baseline row and lead column, the typeface's cut and size, and the space's width. */
export interface FaceSpec {
  readonly what: string;
  readonly cell: number;
  readonly baseline: number;
  readonly lead: number;
  readonly weight: string;
  readonly px: number;
  readonly space: number;
  /**
   * The rows a letter reaches, which the outline is fitted to: capitals and x-height above the baseline,
   * the tallest ascender, and how far a descender goes below it. Where absent the outline is drawn as it
   * scales, which lands a fraction of a row off at these sizes.
   */
  readonly rows?: { readonly cap: number; readonly x: number; readonly ascender: number; readonly descender: number };
}

/** A face's letters: per character rows of `#` ink and `.` nothing, and the grey levels on the same box, `1` to `f`. */
export interface RenderedFace {
  readonly glyphs: Readonly<Record<string, readonly string[]>>;
  readonly greys: Readonly<Record<string, readonly string[]>>;
}

/** The highest grey level, one hexadecimal digit, `0` being no ink. */
const GREY_LEVELS = 15;

/** How far right the grey box may move to sit on its letter. */
const WINDOW_SLIDES = [0, 1, 2] as const;

/** The canvas a letter is drawn on, its origin and baseline: room on every side at these sizes. */
const CANVAS = 64;
const ORIGIN_X = 16;
const BASELINE_Y = 40;

const fonts = new Map<string, Font>();

/** Oxanium in one cut, this repository's own copy beside the codec, with its licence, read once. */
export function oxanium(weight: string): Font {
  let font = fonts.get(weight);
  if (font === undefined) {
    const bytes = readFileSync(new URL(`../fonts/Oxanium/static/Oxanium-${weight}.ttf`, import.meta.url));
    font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    fonts.set(weight, font);
  }
  return font;
}

/** The letter drawn on the canvas, and its one bit ink's box: the inked pixels, the coverage, the leftmost and rightmost ink column, and the top row of the cell. */
function draw(font: Font, spec: FaceSpec, character: string) {
  const path = font.charToGlyph(character).getPath(ORIGIN_X, BASELINE_Y, spec.px);
  const raster = rasterise(spec.rows === undefined ? path.commands : fitted(font, spec, path.commands), CANVAS, CANVAS);
  let x0 = Infinity;
  let x1 = -Infinity;
  for (let k = 0; k < raster.ink.length; k += 1) {
    if (raster.ink[k] === 0) continue;
    x0 = Math.min(x0, k % CANVAS);
    x1 = Math.max(x1, k % CANVAS);
  }
  if (x0 === Infinity) throw new Error(`${spec.weight} ${spec.px}: '${character}' draws nothing`);
  return { raster, x0, x1, top: BASELINE_Y - 1 - spec.baseline };
}

/** A height in font units above the baseline of a glyph's top or, `bottom`, its bottom. */
function extent(font: Font, character: string, bottom = false): number {
  const box = font.charToGlyph(character).getBoundingBox();
  return bottom ? box.y1 : box.y2;
}

/**
 * The outline fitted vertically to the face's rows, the one thing a hinter does that these letters need:
 * every height is mapped piecewise linearly through the typeface's own descender, baseline, x-height,
 * capital height and ascender, read off `p`, `x`, `H` and `d`, onto the rows the face states, so a
 * capital's top lands on a row line rather than a fraction into one. Horizontally the outline is as it
 * scales.
 */
function fitted(font: Font, spec: FaceSpec, commands: readonly PathCommand[]): PathCommand[] {
  const rows = spec.rows!;
  const scale = spec.px / font.unitsPerEm;
  const keys: [number, number][] = [
    [extent(font, 'p', true), -rows.descender], [0, 0], [extent(font, 'x'), rows.x],
    [extent(font, 'H'), rows.cap], [extent(font, 'd'), rows.ascender],
  ];
  const fit = (units: number): number => {
    let k = 1;
    while (k < keys.length - 1 && units > keys[k]![0]) k += 1;
    const [u0, p0] = keys[k - 1]!;
    const [u1, p1] = keys[k]!;
    return p0 + ((units - u0) * (p1 - p0)) / (u1 - u0);
  };
  const y = (pixels: number): number => BASELINE_Y - fit((BASELINE_Y - pixels) / scale);
  return commands.map((c): PathCommand => {
    switch (c.type) {
      case 'M': case 'L': return { ...c, y: y(c.y) };
      case 'Q': return { ...c, y1: y(c.y1), y: y(c.y) };
      case 'C': return { ...c, y1: y(c.y1), y2: y(c.y2), y: y(c.y) };
      case 'Z': return c;
    }
  });
}

/** One character in one face: its mask and its grey levels, `cell` rows each. */
export function renderLetter(font: Font, spec: FaceSpec, character: string): { glyph: string[]; greys: string[] } {
  if (character === ' ') {
    const blank = Array<string>(spec.cell).fill('.'.repeat(spec.space));
    return { glyph: blank, greys: blank };
  }
  const { raster, x0, x1, top } = draw(font, spec, character);
  const width = spec.lead + (x1 - x0 + 1) + 1;
  const inked = (x: number, y: number): boolean => x >= 0 && x < CANVAS && y >= 0 && y < CANVAS && raster.ink[y * CANVAS + x] === 1;
  const level = (x: number, y: number): number =>
    (x >= 0 && x < CANVAS && y >= 0 && y < CANVAS ? Math.round(raster.coverage[y * CANVAS + x]! * GREY_LEVELS) : 0);

  const glyph: string[] = [];
  for (let row = 0; row < spec.cell; row += 1) {
    let line = '';
    for (let k = 0; k < width; k += 1) line += inked(x0 - spec.lead + k, top + row) ? '#' : '.';
    glyph.push(line);
  }

  // The grey box's slide: the most of the letter held, then the most on the one bit ink, then the least slide.
  const score = (slide: number): [number, number] => {
    let held = 0;
    let onInk = 0;
    for (let row = 0; row < spec.cell; row += 1) {
      for (let k = 0; k < width; k += 1) {
        const x = x0 - spec.lead + k;
        const v = level(x + slide, top + row);
        held += v;
        if (inked(x, top + row)) onInk += v;
      }
    }
    return [held, onInk];
  };
  let best: number = WINDOW_SLIDES[0];
  let bestScore = score(best);
  for (const slide of WINDOW_SLIDES.slice(1)) {
    const one = score(slide);
    if (one[0] > bestScore[0] || (one[0] === bestScore[0] && one[1] > bestScore[1])) {
      best = slide;
      bestScore = one;
    }
  }
  const greys: string[] = [];
  for (let row = 0; row < spec.cell; row += 1) {
    let line = '';
    for (let k = 0; k < width; k += 1) {
      const v = level(x0 - spec.lead + best + k, top + row);
      line += v === 0 ? '.' : v.toString(16);
    }
    greys.push(line);
  }
  return { glyph, greys };
}

/** Every character of `characters` in one face, from `font`, Oxanium in the face's cut unless given. */
export function renderFace(spec: FaceSpec, characters: readonly string[], font: Font = oxanium(spec.weight)): RenderedFace {
  const glyphs: Record<string, string[]> = {};
  const greys: Record<string, string[]> = {};
  for (const ch of characters) {
    const one = renderLetter(font, spec, ch);
    glyphs[ch] = one.glyph;
    greys[ch] = one.greys;
  }
  return { glyphs, greys };
}
