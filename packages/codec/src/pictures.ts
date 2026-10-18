/**
 * A picture drawn by us, from rows of colour or an icon of Material Design Icons, and a configuration's picture
 * bank read by content and added to: what every family draws its pictures with.
 *
 * Shared since `todo-compile-one.md` 3.3.3.2, which moved the Harmony 650's own pictures, their list, the icons
 * chosen for them and the builder that puts them in a configuration, into the four slot family,
 * `families/four-slot/pictures.ts`, section 363; the touch family draws the Harmony One's boxes and icons through
 * the same `pictureRows` and `iconOverRows`. Read only towards hardware: the result is pixels or pieces.
 */
import { layOutContainer, takeApart } from './frame.ts';
import { type Container } from './gspm.ts';
import { drawIcon } from './icons.ts';
import { rgb565, rgbTo565 } from './png.ts';
import { namedContentEnd } from './coverage.ts';
import { bitmaps, pictureBank } from './screen.ts';
import { contentKey } from './screencategories.ts';

/** A refusal, named so a caller can tell a bad description from a bug. */
export class PictureError extends Error {}

/** One row of a band: drawn from `inset` to `width - 1 - inset`, the two ends in `end` and the rest in `fill`. */
export interface BandRow {
  inset: number;
  end: number;
  fill: number;
}

/**
 * How a picture is drawn by rule. A **fill** is one colour over the whole picture. A **band** is a run of
 * rows from `top`, each one colour between its two ends and inset from both sides by the same count, and
 * nothing drawn outside the band, which is what makes a picture the encoded kind.
 */
export type PictureDrawing =
  | { kind: 'fill'; width: number; height: number; colour: number }
  | { kind: 'band'; width: number; height: number; top: number; rows: readonly BandRow[] }
  | IconDrawing;

/**
 * An icon of Material Design Icons, `icons.ts`, `todo-compile-650.md` 9.1.2.2: its grid square `size`
 * pixels wide centred at `centre`, in `colour`. Over a `background` it is blended into it by coverage, as
 * our letters are, and every pixel is drawn; with none it is one bit, the colour where it inks and nothing
 * elsewhere, which makes the picture the encoded kind and lets what is under it show.
 */
export interface IconDrawing {
  kind: 'icon';
  width: number;
  height: number;
  icon: string;
  centre: readonly [number, number];
  size: number;
  colour: number;
  background?: number;
}

/** Why a picture is not drawn by rule. */
export type PictureSource = 'rule' | 'artwork' | 'left out';

export interface PictureEntry {
  /** What draws it, in this module's words. */
  name: string;
  /** `contentKey` of Logitech's bytes, which is how a layout's picture is named; never the pixels. */
  key: string;
  source: PictureSource;
  /** Present exactly when `source` is `'rule'`. */
  drawing?: PictureDrawing;
}

/** A drawing's pixels, one row per row, `undefined` where nothing is drawn. */
export function pictureRows(drawing: PictureDrawing): (number | undefined)[][] {
  if (drawing.kind === 'icon') return iconRows(drawing);
  if (drawing.kind === 'fill') {
    return Array.from({ length: drawing.height }, () => new Array<number | undefined>(drawing.width).fill(drawing.colour));
  }
  const { width, height, top, rows } = drawing;
  if (top < 0 || top + rows.length > height) throw new PictureError(`a band of ${rows.length} rows from ${top} does not fit ${height}`);
  return Array.from({ length: height }, (_, y) => {
    const line = new Array<number | undefined>(width).fill(undefined);
    const row = rows[y - top];
    if (row === undefined) return line;
    const last = width - 1 - row.inset;
    if (row.inset < 0 || last < row.inset) throw new PictureError(`a band row inset ${row.inset} draws nothing in ${width}`);
    for (let x = row.inset; x <= last; x += 1) line[x] = x === row.inset || x === last ? row.end : row.fill;
    return line;
  });
}

/** An icon's pixels: blended by coverage over its background, or one bit where it has none. */
function iconRows(drawing: IconDrawing): (number | undefined)[][] {
  const { width, height, icon, centre, size, colour, background } = drawing;
  const drawn = drawIcon(icon, width, height, centre[0], centre[1], size);
  const ink = rgb565(colour);
  const paper = background === undefined ? undefined : rgb565(background);
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x): number | undefined => {
    const k = y * width + x;
    if (paper === undefined) return drawn.ink[k] === 1 ? colour : undefined;
    const v = drawn.coverage[k]!;
    const mixed = [0, 1, 2].map((c) => Math.round(ink[c]! * v + paper[c]! * (1 - v)));
    return rgbTo565(mixed[0]!, mixed[1]!, mixed[2]!);
  }));
}

/** Every picture of a configuration by its content, the bank's and the ones outside it, as `screenUnits` lists them. */
export function picturesByContent(c: Container): Map<string, number[]> {
  const bank = pictureBank(c, namedContentEnd(c)) ?? [];
  const inBank = new Set(bank.map((one) => one.address));
  const out = new Map<string, number[]>();
  for (const picture of [...bank, ...bitmaps(c).filter((one) => !inBank.has(one.address))]) {
    const off = c.blobOffsetOf(picture.address);
    if (off === undefined || picture.length === undefined) continue;
    const key = contentKey(c.blob.subarray(off, off + picture.length));
    out.set(key, [...(out.get(key) ?? []), picture.address]);
  }
  return out;
}

/**
 * The configuration with `pictures` in its picture bank, each one the bank does not already hold appended
 * at its end, and every picture's address, in the order given. A picture the bank holds already is found
 * by its bytes and not added twice. Nothing names an appended picture yet, and the bank keeps it all the
 * same: a picture is read off the bank in sequence and not by reference, measured on the Harmony One's
 * compile of two devices, every byte still claimed once.
 */
export function withBankPictures(c: Container, pictures: readonly Uint8Array[]): { container: Container; addresses: number[] } {
  const held = picturesByContent(c);
  const missing = pictures.filter((bytes, k) => !held.has(contentKey(bytes))
    && pictures.findIndex((one) => contentKey(one) === contentKey(bytes)) === k);
  let container = c;
  if (missing.length > 0) {
    const layout = takeApart(c);
    layout.pictures = [...layout.pictures, ...missing.map((bytes) => ({ bytes, refs: [], owner: 'picture-bank' }))];
    container = layOutContainer(layout).container;
  }
  const now = picturesByContent(container);
  const addresses = pictures.map((bytes) => {
    const address = now.get(contentKey(bytes))?.[0];
    if (address === undefined) throw new PictureError('a picture put in the bank does not read back');
    return address;
  });
  return { container, addresses };
}

/**
 * `under` with an icon of Material Design Icons blended into it by coverage in `colour`, its grid square
 * `size` pixels wide centred in the `width` by `height` box at `x`, `y`: the way our letters and the
 * icons of `IconDrawing` are blended, over whatever the picture holds there rather than one colour. A
 * pixel nothing is drawn at stays undrawn. Changes `under` and returns it.
 */
export function iconOverRows(
  under: (number | undefined)[][], x: number, y: number, width: number, height: number, icon: string, size: number,
  colour: number,
): (number | undefined)[][] {
  const drawn = drawIcon(icon, width, height, width / 2, height / 2, size);
  const ink = rgb565(colour);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const v = drawn.coverage[row * width + column] as number;
      const line = under[y + row];
      const paper = line?.[x + column];
      if (v === 0 || line === undefined || paper === undefined) continue;
      const from = rgb565(paper);
      const mixed = [0, 1, 2].map((k) => Math.round((ink[k] as number) * v + (from[k] as number) * (1 - v)));
      line[x + column] = rgbTo565(mixed[0] as number, mixed[1] as number, mixed[2] as number);
    }
  }
  return under;
}
