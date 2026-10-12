/**
 * Icons drawn from an icon font, `todo-compile-650.md` 9.1.2.2: Material Design Icons by Pictogrammers,
 * Apache 2.0, the npm package `@mdi/font` pinned at 7.4.47, which depends on nothing. Its font is read with
 * opentype.js and its glyphs drawn by `raster.ts`, exactly as our letters are, so an icon is an outline
 * rendered on demand and nothing of a Logitech compile.
 *
 * **An icon is named as the font names it**, `usb`, `battery-alert`, `sync`: the names and their code
 * points are the package's own list, `scss/_variables.scss`, 7400 or so of them. Every icon is drawn on the
 * font's 24 unit grid, which is its em square, 512 font units from the descender to the ascender, so one
 * rule places any icon: the grid's square at `size` pixels with its centre where the picture asks. An icon
 * keeps the margin it has inside that grid, which is what makes two icons of one size look one size.
 *
 * Byte identical on every machine for the reason `raster.ts` gives, and the placement only adds and
 * multiplies.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import opentype, { type Font } from 'opentype.js';
import { rasterise, type Drawing, type PathCommand } from './raster.ts';

/** An icon that cannot be drawn, by its name. */
export class IconError extends Error {}

const require = createRequire(import.meta.url);

let font: Font | undefined;
let names: Map<string, number> | undefined;

/** The icon font, read once from the pinned package. */
function iconFont(): Font {
  if (font === undefined) {
    const bytes = readFileSync(require.resolve('@mdi/font/fonts/materialdesignicons-webfont.ttf'));
    font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  }
  return font;
}

/** Every icon's name and its code point, from the package's own list. */
export function iconNames(): ReadonlyMap<string, number> {
  if (names === undefined) {
    const list = readFileSync(require.resolve('@mdi/font/scss/_variables.scss'), 'utf8');
    names = new Map([...list.matchAll(/^\s*"([a-z0-9-]+)":\s*([0-9A-F]+),?\s*$/gm)].map((m) => [m[1]!, parseInt(m[2]!, 16)]));
  }
  return names;
}

/** An icon's outline: its grid square `size` pixels wide with its centre at `centreX`, `centreY`, y down. */
export function iconPath(name: string, centreX: number, centreY: number, size: number): readonly PathCommand[] {
  const code = iconNames().get(name);
  if (code === undefined) throw new IconError(`Material Design Icons has no icon called ${name}`);
  const f = iconFont();
  // The grid runs from the descender to the ascender, one em; its top edge is `ascender` above the baseline.
  const left = centreX - size / 2;
  const baseline = centreY - size / 2 + (size * f.ascender) / f.unitsPerEm;
  return f.charToGlyph(String.fromCodePoint(code)).getPath(left, baseline, size).commands;
}

/** An icon drawn on a canvas `width` by `height`, its coverage and its one bit ink per pixel. */
export function drawIcon(name: string, width: number, height: number, centreX: number, centreY: number, size: number): Drawing {
  return rasterise(iconPath(name, centreX, centreY, size), width, height);
}
