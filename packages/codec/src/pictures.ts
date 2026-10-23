/**
 * A picture drawn by us, from rows of colour or an icon of Material Design Icons, and a configuration's picture
 * bank read by content and added to: what every family draws its pictures with.
 *
 * Shared since `todo-compile-one.md` 3.3.3.2, which moved the Harmony 650's own pictures, their list, the icons
 * chosen for them and the builder that puts them in a configuration, into the four slot family,
 * `families/four-slot/pictures.ts`, section 363; the touch family draws the Harmony One's boxes and icons through
 * the same `pictureRows` and `iconOverRows`. Read only towards hardware: the result is pixels or pieces.
 */
import { type ContainerLayout, type ContainerPiece, type PieceRef, layOutContainer, takeApart } from './frame.ts';
import { type Container } from './gspm.ts';
import { drawIcon } from './icons.ts';
import { rgb565, rgbTo565 } from './png.ts';
import { namedContentEnd } from './coverage.ts';
import {
  BITMAP_RAW, SCREEN_DRAW_IMAGE, SCREEN_FILL, bitmapAt, bitmaps, pictureBank, pictureReference, reachablePrograms,
} from './screen.ts';
import { bitmapPixels } from './render.ts';
import type { PieceTarget } from './statetables.ts';
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

/**
 * Every piece of a layout, the inserted sections' among them, in the order `takeApart` lists them: what a step
 * rewriting references walks.
 */
function everyPiece(layout: ContainerLayout): ContainerPiece[] {
  const inserted = Object.values(layout.inserted ?? {});
  return [layout.keyTable, ...layout.body, ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])),
    ...inserted.flatMap((s) => [...s.before, ...s.head]), ...layout.pictures];
}

/**
 * The layout with pictures of its bank replaced: each picture in `replace` takes the bytes given, in its own place,
 * and each picture in `onto` is taken out with every reference to it pointed at the picture it maps to, which stays.
 * A picture is a leaf, so a reference names its first byte; one naming another byte of a replaced or a merged
 * picture is refused, and so is a picture merged onto one that is itself merged or not in the bank. The input layout
 * is left as it was: every piece is made fresh.
 *
 * Generic, and every family's: the Harmony 650's rule pictures and ours of its artwork, `families/four-slot/pictures.ts`,
 * and the Harmony One's, `families/touch/pictures.ts`, whose black background takes the place of three copies and
 * three photographs, `todo-compile-one.md` 5.3.3.
 */
export function withReplacedPictures(
  layout: ContainerLayout, replace: ReadonlyMap<ContainerPiece, Uint8Array>,
  onto: ReadonlyMap<ContainerPiece, ContainerPiece> = new Map(),
): ContainerLayout {
  const bank = new Set(layout.pictures);
  for (const [from, to] of onto) {
    if (!bank.has(from) || !bank.has(to)) throw new PictureError('a picture merged onto another is not in the bank');
    if (onto.has(to)) throw new PictureError('a picture is merged onto one that is merged itself');
  }
  const all = everyPiece(layout);
  const fresh = new Map<ContainerPiece, ContainerPiece>();
  for (const old of all) {
    if (onto.has(old)) continue;
    const bytes = replace.get(old);
    fresh.set(old, bytes === undefined ? { ...old, refs: [] }
      : { bytes, refs: [], ...(old.owner === undefined ? {} : { owner: old.owner }) });
  }
  for (const old of all) {
    if (onto.has(old) || replace.has(old)) continue;
    (fresh.get(old) as ContainerPiece).refs = old.refs.map((ref): PieceRef => {
      if (!('to' in ref)) return ref;
      const merged = onto.get(ref.to);
      if ((merged !== undefined || replace.has(ref.to)) && ref.offset !== 0) {
        throw new PictureError('a reference names the inside of a picture replaced here');
      }
      return { ...ref, to: fresh.get(merged ?? ref.to) ?? ref.to };
    });
  }
  const rewrite = (run: readonly ContainerPiece[]): ContainerPiece[] => run.flatMap((piece) => {
    const made = fresh.get(piece);
    return made === undefined ? [] : [made];
  });
  const placement = (s: { before: ContainerPiece[]; head: ContainerPiece[] }): { before: ContainerPiece[]; head: ContainerPiece[] } =>
    ({ before: rewrite(s.before), head: rewrite(s.head) });
  return {
    ...layout,
    keyTable: fresh.get(layout.keyTable) as ContainerPiece,
    body: rewrite(layout.body),
    sections: layout.sections.map((s) => (s === undefined ? s : placement(s))),
    ...(layout.inserted === undefined ? {} : {
      inserted: Object.fromEntries(Object.entries(layout.inserted).map(([raw, s]) => [raw, placement(s)])),
    }),
    pictures: rewrite(layout.pictures),
  };
}

/**
 * A fill in the place of a picture, as a description of screens carries it among its pictures: a target naming no
 * piece of the layout, whose bytes are the fill's width, height and colour, high byte first. One per rectangle, so
 * two draws of the same fill carry the same target, as two draws of one picture do. A reader of a program that meets
 * a `SCREEN_FILL` where a template draws a picture takes `fillTarget`, and a writer that meets one emits the fill,
 * `fillOf`: so a screen whose background `withPictureFilled` made a fill is described and rebuilt as it is, findings
 * section 425.
 */
const FILLS = new Map<string, PieceTarget>();
const FILL_OWNER = 'fill';

/** The target a description carries for a fill of `width` by `height` in `colour`, the same object for the same fill. */
export function fillTarget(width: number, height: number, colour: number): PieceTarget {
  const key = `${width},${height},${colour}`;
  let target = FILLS.get(key);
  if (target === undefined) {
    target = { to: { bytes: Uint8Array.of(width, height, colour >> 8, colour & 0xff), refs: [], owner: FILL_OWNER }, offset: 0 };
    FILLS.set(key, target);
  }
  return target;
}

/** The fill a description's picture target stands for, or undefined where it names a picture. */
export function fillOf(target: PieceTarget): { width: number; height: number; colour: number } | undefined {
  if (target.to.owner !== FILL_OWNER) return undefined;
  const [width = 0, height = 0, high = 0, low = 0] = target.to.bytes;
  return { width, height, colour: (high << 8) | low };
}

/** The bytes of a fill at `x, y` in the place of a picture, `fillOf`'s. */
export function fillBytes(x: number, y: number, fill: { width: number; height: number; colour: number }): number[] {
  return [SCREEN_FILL, x, y, fill.width, fill.height, fill.colour >> 8, fill.colour & 0xff];
}

/** What `withPictureFilled` did. */
export interface PictureFilled {
  container: Container;
  /** The draws made fills, one per instruction that drew the picture. */
  filled: number;
  /** The picture's bytes, gone from the bank with it. */
  dropped: number;
}

/** A `SCREEN_DRAW_IMAGE` is the opcode, two place bytes and a three byte address; a `SCREEN_FILL` the opcode and six. */
const DRAW_LENGTH = 6;
const DRAW_ADDRESS_AT = 3;
const FILL_LENGTH = 7;

/**
 * The configuration with every draw of the picture at `address` made a filled rectangle of its size and colour,
 * opcode 1, `SCREEN_FILL`, and the picture out of the bank: findings section 425, where the firmware's handler is
 * read. One instruction of seven bytes in place of a draw of six, in the same place, every address into the program
 * after it moved by the byte it gains.
 *
 * **Only a picture a fill draws exactly is taken**, so the result shows what the input showed: a raw picture drawn in
 * every pixel, every pixel one colour, each draw a `SCREEN_DRAW_IMAGE` whose `y + height` is below 256, since the
 * fill's stop row is taken in eight bits, and a width and a height that fit a byte. Refused otherwise, and refused
 * where anything but such a draw names the picture, or an address lands inside a draw made a fill.
 *
 * Generic, and every compiled family's: it reads the references the frame keeps and the picture header every
 * architecture's compiles share. Opcode 1 is read as this rectangle in full on the Harmony One 3.4 and the Harmony 650
 * 0.2, and to its row loop and clip on the Harmony 600 0.2 and 700 2.8, section 425; it has run on the Harmony One alone. The Harmony One's background is the one caller, `families/touch/pictures.ts`.
 */
export function withPictureFilled(c: Container, address: number): PictureFilled {
  const layout = takeApart(c);
  const laid = layOutContainer(layout);
  if (laid.bytes.length !== c.blob.length) throw new PictureError('the configuration does not take apart into itself');
  const from = c.blobOffsetOf(address);
  const picture = layout.pictures.find((one) => laid.offsetOf(one) === from);
  const header = bitmapAt(c, address);
  const rows = header === undefined ? undefined : bitmapPixels(c, header);
  if (picture === undefined || header === undefined || rows === undefined) throw new PictureError(`no picture of the bank at 0x${address.toString(16)}`);
  if (header.kind !== BITMAP_RAW) throw new PictureError('a fill takes the place of a raw picture only, drawn in every pixel');
  const colour = rows[0]?.[0];
  if (colour === undefined || rows.some((row) => row.some((pixel) => pixel !== colour))) {
    throw new PictureError('the picture is not one colour in every pixel, so a fill does not draw it');
  }
  const width = header.stride;
  const height = header.rows;
  if (width > 0xff || height > 0xff || width === 0 || height === 0) throw new PictureError(`a fill of ${width} by ${height} does not fit its operands`);

  // Every draw of the picture, by the piece holding it and the instruction's offset in that piece. The programs'
  // own walk says which references are draws: a reference to the picture that is not a draw's address is refused.
  const draws = new Set<number>();
  for (const [, program] of reachablePrograms(c)) {
    for (const one of program) if (one.opcode === SCREEN_DRAW_IMAGE && pictureReference(one) === address) draws.add(one.start);
  }
  const all = everyPiece(layout);
  const sites = new Map<ContainerPiece, number[]>();
  for (const piece of all) {
    for (const ref of piece.refs) {
      if (!('to' in ref) || ref.to !== picture) continue;
      const start = ref.at - DRAW_ADDRESS_AT;
      if (ref.offset !== 0 || !draws.has((laid.offsetOf(piece) as number) + start)) {
        throw new PictureError(`the picture is named ${ref.at} bytes into a ${piece.owner ?? 'piece'} by something not a draw`);
      }
      const y = piece.bytes[start + 2] as number;
      if (y + height > 0xff) throw new PictureError(`a draw at y ${y} has y + height ${y + height}, 256 or more, where a fill's stop row wraps and it draws nothing`);
      sites.set(piece, [...(sites.get(piece) ?? []), start]);
    }
  }
  const named = [...sites.values()].reduce((sum, one) => sum + one.length, 0);
  if (named !== draws.size) throw new PictureError(`${draws.size} draws of the picture and ${named} references to it`);

  // Each piece holding a draw made again: the draw's six bytes become the fill's seven, its address field goes, and
  // an offset into the piece moves by a byte for every draw before it. An offset inside a draw past its first byte
  // would name half an instruction, and is refused.
  const remap = new Map<ContainerPiece, (offset: number) => number>();
  for (const [piece, at] of sites) {
    at.sort((a, b) => a - b);
    remap.set(piece, (offset) => {
      let gained = 0;
      for (const start of at) {
        if (offset <= start) break;
        if (offset < start + DRAW_LENGTH) throw new PictureError(`an address lands ${offset - start} bytes into a draw made a fill`);
        gained += FILL_LENGTH - DRAW_LENGTH;
      }
      return offset + gained;
    });
  }
  // The references, every piece's at once and before any piece's bytes change, so each is moved by its own piece's
  // draws and the draws of the piece it names; a draw's own address field goes with its draw.
  const moved = all.map((piece) => {
    const mine = sites.get(piece);
    return piece.refs.flatMap((ref): PieceRef[] => {
      if (mine?.some((start) => ref.at >= start && ref.at < start + DRAW_LENGTH)) return [];
      const at = remap.get(piece)?.(ref.at) ?? ref.at;
      if (!('to' in ref)) return [{ ...ref, at }];
      return [{ at, to: ref.to, offset: remap.get(ref.to)?.(ref.offset) ?? ref.offset }];
    });
  });
  all.forEach((piece, k) => { piece.refs = moved[k] as PieceRef[]; });
  for (const [piece, at] of sites) {
    const out: number[] = [];
    let cursor = 0;
    for (const start of at) {
      out.push(...piece.bytes.subarray(cursor, start));
      out.push(...fillBytes(piece.bytes[start + 1] as number, piece.bytes[start + 2] as number, { width, height, colour }));
      cursor = start + DRAW_LENGTH;
    }
    out.push(...piece.bytes.subarray(cursor));
    piece.bytes = Uint8Array.from(out);
  }
  layout.pictures = layout.pictures.filter((one) => one !== picture);
  return { container: layOutContainer(layout).container, filled: draws.size, dropped: picture.bytes.length };
}
