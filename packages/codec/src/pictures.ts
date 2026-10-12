/**
 * The Harmony 650's pictures, those drawn by rule built from their description: `todo-compile-650.md`
 * 9.1, section 363.
 *
 * A Harmony 650 configuration Logitech compiled holds 18 or 19 pictures in its picture bank, every one
 * byte identical wherever it occurs on the 13 Harmony 650 compiles here; which ones a compile holds
 * follows from which programs draw them, since a configuration carries a picture only where one of its
 * programs draws it. They are named in `HARMONY_650_PICTURES` by what draws them, and split three ways:
 *
 * * **drawn by rule**, six: the plain dark background behind the firmware's own screens that draw no
 *   battery or USB picture, the status screens, the tour, and the screens of Help and the Remote Assistant,
 *   the bar along the top and the rounded bar along the bottom of every page that has them, and
 *   the three patches the programs switching on state variable 17 draw at 114, 112, in the colour of the
 *   background under them, where the variable is 0.
 *   Each is a `PictureDrawing`, a fill or a band of rows each one colour, and `buildPictures` draws and
 *   encodes it;
 * * **artwork**, eleven: the grey and red curved backgrounds behind the device pages, the device list,
 *   the activity menu and an activity's working screen, with their cross or line; the start up screen's
 *   picture; the small mark those programs draw there from 1 to 3; and the four pictures of the firmware screens with a
 *   battery or a USB plug. They are designed images, so their pixels are not written into this
 *   repository and a configuration takes them from a Logitech compile, a donor, unless ours are chosen:
 *   the five backgrounds give way to one flat colour per screen state, `backgrounds.ts`, 9.1.2.1, and the
 *   other six to icons drawn from a font, `buildOurPictures`, 9.1.2.2, section 373, put in by
 *   `withPictures` and read back by `checkOurPictures`. The cross and the line cannot be laid over a plain curved background by rule either:
 *   the crossed background differs from the plain one in 98 pixels off its cross, all within seven pixels
 *   of it and each one colour step off, so Logitech flattened each whole;
 * * **left out**, two: the black background with a dotted cross and the one with a dotted line, which only
 *   the delay screens Help opens when held draw, and Help is what this track leaves out.
 *
 * The pattern is section 347's: `describePictures` names each picture of a layout by its content,
 * `buildPictures` draws the rule pictures from `HARMONY_650_PICTURES` alone, `withPictures` puts them where
 * the layout's own sat, and `checkPictures` lays the result out and compares it. Where the bank puts each
 * picture is `placer.ts`'s, `todo-compile-650.md` 10.5, and not this module's: a built picture takes the
 * place of the one it replaces.
 *
 * Arch 14 only, the Harmony 650's colour look of 2026, which the 2026 Harmony 700 compiles share. Read
 * only towards hardware: the result is pieces.
 */
import type { ContainerLayout, ContainerPiece, PieceRef } from './frame.ts';
import { layOutContainer, takeApart } from './frame.ts';
import type { Container } from './gspm.ts';
import { drawIcon } from './icons.ts';
import { rgb565, rgbTo565 } from './png.ts';
import { encodeBitmap } from './screen.ts';
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

/** Full width rows of one colour each, the top bar's shape. */
const solidRows = (colours: readonly number[]): BandRow[] => colours.map((colour) => ({ inset: 0, end: colour, fill: colour }));

/**
 * The bar along the top of every device page, menu page and working screen: sixteen full width rows, each
 * one colour, light at both edges and darkest across rows 7 and 8. Drawn by an opcode 3 copying 128 by 16
 * from its corner. Byte identical on all 22 compiles of the Harmony 600, 650 and 700, section 363.
 */
const TOP_BAR_ROWS: readonly number[] = [
  0xffff, 0xf7be, 0xf79e, 0xef5d, 0xe73c, 0xdf1c, 0xdedb, 0xd6ba,
  0xd6ba, 0xdedb, 0xdefc, 0xe73c, 0xef5d, 0xef7e, 0xf7be, 0xffdf,
];

/**
 * The bar along the bottom, under the bottom word: a whole screen picture drawing only its last sixteen
 * rows, each inset the same from both sides so that the top two corners are rounded; on rows 113 to 119
 * the two end pixels have a colour of their own, on the others the row's. Drawn by an opcode 3 copying the
 * whole screen.
 */
const BOTTOM_BAR_TOP = 112;
const BOTTOM_BAR_ROWS: readonly BandRow[] = [
  { inset: 22, end: 0xffff, fill: 0xffff },
  { inset: 20, end: 0xffff, fill: 0xffdf },
  { inset: 19, end: 0xffdf, fill: 0xf79e },
  { inset: 18, end: 0xf7be, fill: 0xef7d },
  { inset: 17, end: 0xf7be, fill: 0xe73d },
  { inset: 17, end: 0xe73c, fill: 0xe71c },
  { inset: 16, end: 0xf79e, fill: 0xdedb },
  { inset: 16, end: 0xdf1c, fill: 0xd6ba },
  ...[0xd6ba, 0xdedb, 0xdf1c, 0xe73c, 0xef7d, 0xf79e, 0xffdf, 0xffff].map((colour) => ({ inset: 16, end: colour, fill: colour })),
];

/** The plain background's colour, and the patch's that the corner program of a plain screen draws. */
const PLAIN = 0x2945;
/** The colour the curved red background has under the corner mark at 114, 112, and the grey one. */
const RED_CORNER = 0xb944;
const GREY_CORNER = 0x4a49;

/**
 * Every picture a Harmony 650 configuration Logitech compiled holds, by what draws it: the 19 of the 13
 * compiles, section 363. The rule pictures carry their drawing; the others carry only Logitech's content
 * key, which names a picture without holding any of it.
 */
export const HARMONY_650_PICTURES: readonly PictureEntry[] = [
  { name: 'plain background', key: 'e0340d0f8e2849ee', source: 'rule', drawing: { kind: 'fill', width: 128, height: 128, colour: PLAIN } },
  { name: 'top bar', key: 'e247f3ff422472de', source: 'rule', drawing: { kind: 'band', width: 128, height: 16, top: 0, rows: solidRows(TOP_BAR_ROWS) } },
  { name: 'bottom bar', key: '9e81b982b33e2ff5', source: 'rule', drawing: { kind: 'band', width: 128, height: 128, top: BOTTOM_BAR_TOP, rows: BOTTOM_BAR_ROWS } },
  { name: 'corner patch, plain', key: '424d7bff72f96dee', source: 'rule', drawing: { kind: 'fill', width: 12, height: 12, colour: PLAIN } },
  { name: 'corner patch, red', key: '4c42bdc959b5ad48', source: 'rule', drawing: { kind: 'fill', width: 12, height: 10, colour: RED_CORNER } },
  { name: 'corner patch, grey', key: 'c7d320f981025b68', source: 'rule', drawing: { kind: 'fill', width: 12, height: 10, colour: GREY_CORNER } },
  { name: 'device page of one item', key: '0061c06666b425f1', source: 'artwork' },
  { name: 'device page crossed', key: '45888f139bd13f9c', source: 'artwork' },
  { name: 'activity menu of two', key: '711cbbb1a44ca656', source: 'artwork' },
  { name: 'activity menu of one', key: '21bc4747e696eba8', source: 'artwork' },
  { name: 'working screen crossed', key: 'a0d49b45e9df025c', source: 'artwork' },
  { name: 'start up picture', key: 'a2368d93e91ee138', source: 'artwork' },
  { name: 'corner mark', key: 'cb76b8c6387a1e4d', source: 'artwork' },
  { name: 'USB Connected', key: '7e808abe1ed752bb', source: 'artwork' },
  { name: 'Low Battery', key: '7fd39b38ae113d0f', source: 'artwork' },
  { name: 'battery blank screen', key: 'c1ec5d0d18399e44', source: 'artwork' },
  { name: 'upgrade and learn blank screens', key: 'fbc28ca10ff306c4', source: 'artwork' },
  { name: 'delay picker, dotted cross', key: '8a8bd4cfa704a94e', source: 'left out' },
  { name: 'delay screen, dotted line', key: '2bc3fa1bafa5449a', source: 'left out' },
];

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

/**
 * Where our own picture of each of Logitech's six artwork pictures that is no state's background draws its
 * icon, measured on Logitech's, section 363, `todo-compile-650.md` 9.1.2.2: the four firmware screen
 * pictures fill the square from 32 to 95 each way, the start up picture's runs from row 32 to 79 since
 * the title is above it and three lines below, and the corner mark is the whole of its 12 by 10. A fact of
 * the screen's layout; the icon in each place is a choice, `OurPictureChoices`.
 */
export const OUR_PICTURE_PLACES = {
  'start up picture': { width: 128, height: 128, centre: [64, 56], size: 48, opaque: true },
  'corner mark': { width: 12, height: 10, centre: [6, 5], size: 12, opaque: false },
  'USB Connected': { width: 128, height: 128, centre: [64, 64], size: 64, opaque: true },
  'Low Battery': { width: 128, height: 128, centre: [64, 64], size: 64, opaque: true },
  'battery blank screen': { width: 128, height: 128, centre: [64, 64], size: 64, opaque: true },
  'upgrade and learn blank screens': { width: 128, height: 128, centre: [64, 64], size: 64, opaque: true },
} as const satisfies Record<string, { width: number; height: number; centre: readonly [number, number]; size: number; opaque: boolean }>;

export type OurPictureName = keyof typeof OUR_PICTURE_PLACES;

/** Which icon each of our pictures draws, and in which colours: a family's choice, `FourSlotChoices.pictures`. */
export interface OurPictureChoices {
  readonly icons: Readonly<Record<OurPictureName, string>>;
  /** The icons' colour. */
  readonly colour: number;
  /** The colour the opaque pictures are filled with, under every text and icon those screens draw. */
  readonly background: number;
}

/** Our six pictures drawn and encoded, by the name of Logitech's picture each replaces. */
export function buildOurPictures(choices: OurPictureChoices): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  for (const [name, place] of Object.entries(OUR_PICTURE_PLACES) as [OurPictureName, (typeof OUR_PICTURE_PLACES)[OurPictureName]][]) {
    const drawing: IconDrawing = {
      kind: 'icon', width: place.width, height: place.height, icon: choices.icons[name], centre: place.centre, size: place.size,
      colour: choices.colour, ...(place.opaque ? { background: choices.background } : {}),
    };
    out.set(name, encodeBitmap(pictureRows(drawing)));
  }
  return out;
}

/**
 * Our pictures read back: `after` holds the bank of `before` picture for picture, with every one of the six
 * Logitech's artwork drew there now holding exactly the bytes `buildOurPictures` made and every other picture
 * unchanged. Each of the six has to be found, so a donor that lacks one is refused rather than half lettered.
 */
export function checkOurPictures(before: Container, after: Container, ours: ReadonlyMap<string, Uint8Array>): string[] {
  const was = describePictures(takeApart(before));
  const now = takeApart(after).pictures;
  if (now.length !== was.length) throw new PictureError(`the picture bank holds ${now.length} pictures where it held ${was.length}`);
  const placed: string[] = [];
  was.forEach(({ piece, entry }, k) => {
    const mine = entry === undefined ? undefined : ours.get(entry.name);
    const want = mine ?? piece.bytes;
    if (!sameBytes(now[k]!.bytes, want)) {
      throw new PictureError(`picture ${k}${entry === undefined ? '' : `, ${entry.name},`} ${mine === undefined ? 'changed' : 'is not ours'}`);
    }
    if (mine !== undefined) placed.push((entry as PictureEntry).name);
  });
  const missing = [...ours.keys()].filter((name) => !placed.includes(name));
  if (missing.length > 0) throw new PictureError(`the configuration holds no ${missing.join(', ')} to draw ours over`);
  return placed;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((v, k) => v === b[k]);
}

/** Every rule picture of `entries` drawn and encoded, by name. */
export function buildPictures(entries: readonly PictureEntry[] = HARMONY_650_PICTURES): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  for (const entry of entries) {
    if (entry.source !== 'rule') continue;
    if (entry.drawing === undefined) throw new PictureError(`${entry.name} is drawn by rule and states no drawing`);
    out.set(entry.name, encodeBitmap(pictureRows(entry.drawing)));
  }
  return out;
}

/** One picture of a layout, named where `HARMONY_650_PICTURES` knows it. */
export interface DescribedPicture {
  piece: ContainerPiece;
  entry: PictureEntry | undefined;
}

/**
 * Name every picture of a layout's bank by its content key. Reading the bytes decides only which entry a
 * picture is; what `withPictures` writes comes from the entry. A picture no entry knows, as on the Harmony
 * 600 compiles and every Harmony 700 compile, those of 2026 included, is described as `undefined` and kept
 * as it is.
 */
export function describePictures(layout: ContainerLayout, entries: readonly PictureEntry[] = HARMONY_650_PICTURES): DescribedPicture[] {
  if (layout.architecture !== 14) throw new PictureError('the pictures are built for the Harmony 600, 650 and 700 alone');
  const byKey = new Map(entries.map((entry) => [entry.key, entry]));
  return layout.pictures.map((piece) => ({ piece, entry: byKey.get(contentKey(piece.bytes)) }));
}

/**
 * The layout with each rule picture of `described` replaced by its built bytes, every reference to it
 * re-pointed. A picture is a leaf, so a reference names its first byte; one naming another byte of a
 * replaced picture is refused. The input layout is left as it was.
 */
export function withPictures(layout: ContainerLayout, described: readonly DescribedPicture[],
  built: ReadonlyMap<string, Uint8Array> = buildPictures()): ContainerLayout {
  const replace = new Map<ContainerPiece, ContainerPiece>();
  for (const { piece, entry } of described) {
    if (entry === undefined) continue;
    const bytes = built.get(entry.name);
    // A rule picture is always built; an artwork one only where `built` brings our own, `buildOurPictures`.
    if (bytes === undefined && entry.source === 'rule') throw new PictureError(`${entry.name} was not built`);
    if (bytes === undefined) continue;
    replace.set(piece, { bytes, refs: [], ...(piece.owner === undefined ? {} : { owner: piece.owner }) });
  }
  const all = [layout.keyTable, ...layout.body,
    ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
  // Every piece fresh, so the input layout keeps its own, and a reference into a replaced picture lands on
  // its replacement.
  const fresh = new Map<ContainerPiece, ContainerPiece>();
  for (const old of all) fresh.set(old, replace.get(old) ?? { ...old, refs: [] });
  for (const old of all) {
    const made = fresh.get(old) as ContainerPiece;
    if (replace.has(old)) continue;
    made.refs = old.refs.map((ref): PieceRef => {
      if (!('to' in ref)) return ref;
      if (replace.has(ref.to) && ref.offset !== 0) throw new PictureError('a reference names the inside of a picture built here');
      return { ...ref, to: fresh.get(ref.to) ?? ref.to };
    });
  }
  const rewrite = (run: ContainerPiece[]): ContainerPiece[] => run.map((piece) => fresh.get(piece) as ContainerPiece);
  return {
    ...layout,
    keyTable: fresh.get(layout.keyTable) as ContainerPiece,
    body: rewrite(layout.body),
    sections: layout.sections.map((s) => (s === undefined ? s : { before: rewrite(s.before), head: rewrite(s.head) })),
    pictures: rewrite(layout.pictures),
  };
}

/** What `checkPictures` compared. */
export interface PicturesChecked {
  /** The rule pictures the configuration holds, built and compared, by name. */
  built: string[];
  /** Their bytes. */
  bytes: number;
  /** Pictures kept as the configuration holds them: artwork, left out, or unknown to the entries. */
  kept: number;
}

/**
 * The configuration with its rule pictures built from their drawing: taken apart, described, built, put
 * back, laid out and compared byte for byte, refused at the first difference with the picture it falls in.
 */
export function checkPictures(c: Container, entries: readonly PictureEntry[] = HARMONY_650_PICTURES): PicturesChecked {
  const layout = takeApart(c);
  const described = describePictures(layout, entries);
  const rebuilt = withPictures(layout, described, buildPictures(entries));
  const laid = layOutContainer(rebuilt);
  const out = laid.bytes;
  const length = Math.min(out.length, c.blob.length);
  let at = -1;
  for (let k = 0; k < length; k += 1) if (out[k] !== c.blob[k]) { at = k; break; }
  if (at < 0 && out.length !== c.blob.length) at = length;
  if (at >= 0) {
    // The picture the first difference falls in, by where the rebuilt bank put each one.
    const k = rebuilt.pictures.findIndex((piece) => {
      const from = laid.offsetOf(piece);
      return from !== undefined && at >= from && at < from + piece.bytes.length;
    });
    const name = k < 0 ? 'outside the pictures, where something they name moved' : `in ${described[k]?.entry?.name ?? `picture ${k}`}`;
    throw new PictureError(`the built pictures differ from the configuration's at byte ${at}, ${name}`);
  }
  const built = described.filter((one) => one.entry?.source === 'rule');
  return {
    built: built.map((one) => (one.entry as PictureEntry).name),
    bytes: built.reduce((sum, one) => sum + one.piece.bytes.length, 0),
    kept: described.length - built.length,
  };
}
