/**
 * The Harmony One's fixed pictures drawn by us in place of Logitech's, `todo-compile-one.md` 5.3.1 and 5.3.3,
 * findings section 422: the status strip along the top of every screen, the pictures of the firmware screens and
 * the power off help, the settings screens' buttons, and the whole screen background, named by 66 to 314 draw
 * instructions a compile over the sixteen (75 on the test setup's donor), as the sample of 18 October 2026 drew them and
 * as was decided on it the same day.
 *
 * **What a picture of ours keeps of Logitech's: its size, nothing else**, `todo-compile-one.md` 7.1.2, findings
 * section 428. Each one is drawn at exactly the size of the picture it replaces, stated here, so a picture of another
 * size is refused rather than drawn, and **it is transparent where our own drawing leaves a pixel empty**,
 * `touchPictureOwnRows`, which reads no configuration: a configuration built from nothing has every picture,
 * `touchFixedPictures`. Which picture is which is read by its content key, `contentKey`, which names a picture without
 * holding any of it. **The masked form of section 422 stays a choice**, `TouchChoices.logitechMasks`, while no remote
 * has shown the rule's own: each of ours undrawn exactly where the picture it replaces is undrawn, a silhouette of
 * Logitech's artwork read off that picture at build time, and black where our drawing leaves a pixel inside it empty.
 * The two differ on the eleven pictures Logitech leaves partly undrawn, the ten gauges and the cross, and nowhere
 * else, and the masked form cut our ink where Logitech's mask was undrawn: a corner pixel of the outline on seven
 * gauges and 27 pixels of level 3's outline and tip.
 *
 * **The drawings**, each a rule:
 *
 * * the battery gauge, levels 0 to 7, a one pixel white outline with a tip, filled white from the left by
 *   level / 7, and level 0, which Logitech draws as a grey "?", the level not known, a dotted grey interior. The
 *   charging gauge's pictures draw the same, decided on the sample: no charging difference for now, since at 20 by
 *   11 there is no room for a bolt beside a fill;
 * * the sending mark, on: an icon; off, and the clock face the day and time are drawn on: all black, which is what
 *   Logitech's are, so ours are their bytes;
 * * the firmware screens' pictures and the power off help's: one white icon each, its grid square centred on where
 *   Logitech's ink sits and sized to it, the Harmony 650's rule of section 373; the places are measured here, the
 *   icons are choices, `TouchChoices.pictureIcons`;
 * * the settings screens' buttons, the clock pickers' pads, Screen Sensitivity's and the rows of the Year picker
 *   and Options: one flat box in `TouchChoices.settingsBox`, `activityBoxRows`, with the pixels outside its rounded
 *   corners black, decided on the sample: smaller to store than undrawn ones and the same on a black screen.
 *   Logitech draws three images of each, one per place; ours draws one image and stores it in each of their places;
 * * **the whole screen background**, all black and stored three times by Logitech, 5.3.3: **one** picture of ours,
 *   and the three photographs of blurred lights six blank screens show, entered by timers, draw it too, so those
 *   screens show nothing. What those six are for is open, section 408; a seventh blank screen draws the charging
 *   screen's picture, which has its own entry. The copies and the photographs are taken out of the bank and every draw of
 *   theirs is pointed at the one. **And then, 5.3.4, the one is no picture at all**: every draw of it becomes one fill of
 *   the screen, screen opcode 1, `withPictureFilled`, and the 77445 bytes leave the bank, unless
 *   `TouchChoices.backgroundFill` keeps the picture. It has to draw every pixel either way: the Harmony One draws a page
 *   over what the screen held, with no clear before it, so a pixel left undrawn would show the screen before, section 425.
 *
 * **What is not drawn here.** The welcome tour's illustrations, since the tour is left out by default (4.10,
 * section 421) and kept as Logitech's where the choice keeps it. The device pages' pads and the device list's rows
 * and icons, which the look draws in `TouchChoices.deviceBox`, `devicelook.ts`, and which since this section takes
 * Logitech's it no longer draws out of the bank. The pictures the setup's composers draw, the activities', are ours
 * already.
 *
 * Measured on the sixteen English compiles of skin 54, which hold every picture named here byte for byte; arch 12
 * (Harmony One) alone. Read only towards hardware: the result is a configuration's bytes.
 */
import { type ContainerPiece, layOutContainer, takeApart } from '../../frame.ts';
import { type Container } from '../../gspm.ts';
import { PictureError, iconOverRows, withPictureFilled, withReplacedPictures } from '../../pictures.ts';
import { rgbTo565 } from '../../png.ts';
import { bitmapPixels } from '../../render.ts';
import { bitmapAt, encodeBitmap } from '../../screen.ts';
import { contentKey } from '../../screencategories.ts';
import { activityBoxRows } from './activitypictures.ts';
import type { TouchChoices } from './choices.ts';

type Rows = (number | undefined)[][];

const BLACK = 0x0000;
const WHITE = rgbTo565(255, 255, 255);
/** A circle icon's circle in the icon font, Material Design Icons: radius 10 of its 24 unit grid, as `close-circle-outline` draws it. */
const CIRCLE_ICON_RADIUS = 10;
const ICON_GRID = 24;
/** The dotted interior of the gauge at level 0, the level not known. */
const GREY = rgbTo565(128, 128, 128);

/** The pictures that draw one icon, whose icon is a choice, `TouchChoices.pictureIcons`. */
export type TouchIconPicture = 'sending mark on' | 'Low Battery' | 'USB Connected' | 'charging problem' | 'charging screen'
  | 'power' | 'sending, large';

/** How one of ours is drawn, inside the mask of the picture it replaces. */
export type TouchPictureDrawing =
  /** All black. */
  | { readonly kind: 'black' }
  /** The battery gauge at `level`, 0 to 7. */
  | { readonly kind: 'gauge'; readonly level: number }
  /**
   * One white icon, `TouchChoices.pictureIcons[name]`, over black: its grid square `size` pixels wide with its top
   * left corner at `at`, which may lie outside the picture, the icon then cut at the edge as Logitech's ink is.
   * `paper` is where the black under it is drawn: the whole picture, by default, or `'circle'`, a disc the size of a
   * circle icon's own circle, radius 10 of the icon font's 24 units, centred on the grid square, every pixel outside it
   * that the icon does not ink left empty, `todo-compile-one.md` 7.1.2, section 428.
   */
  | { readonly kind: 'icon'; readonly at: readonly [number, number]; readonly size: number; readonly paper?: 'circle' }
  /** A flat box in `TouchChoices.settingsBox`, the pixels outside its rounded corners black. */
  | { readonly kind: 'settings box' }
  /** The one whole screen background, black, which every picture of this kind is taken out for and drawn as, 5.3.3. */
  | { readonly kind: 'background' };

export interface TouchPictureEntry {
  /** What draws it, in this module's words, and for an icon picture its key in `TouchChoices.pictureIcons`. */
  readonly name: string;
  /** `contentKey` of each of Logitech's pictures it replaces: Logitech stores some images several times, and draws three of a box. */
  readonly keys: readonly string[];
  /** Logitech's size, which ours keeps. */
  readonly width: number;
  readonly height: number;
  readonly drawing: TouchPictureDrawing;
}

const GAUGE = { width: 20, height: 11 } as const;
const gauge = (name: string, keys: readonly string[], level: number): TouchPictureEntry => ({ name, keys, ...GAUGE, drawing: { kind: 'gauge', level } });

/**
 * Every picture of Logitech's this module draws ours of, by what draws it, with the place of each icon: the grid
 * square centred on the box around every pixel of Logitech's picture that is drawn and not its paper, the colour of
 * its corner, and sized to the longer side of that box but no larger than the picture, section 373's rule; the
 * charging screen's at 0.8 of that, since Logitech's ink includes a reflection under the battery. The charging
 * problem's cross, whose corner is undrawn, takes every drawn pixel as its ink and the shorter side, so the circle
 * stays inside what Logitech's draws. `test/touchpictures.test.ts` applies the rule again off Logitech's pictures, and
 * it is a fitted rule: scored on the seven it was fitted to, with two special cases (the scale and the cross), and no
 * outside sample.
 */
export const TOUCH_PICTURES: readonly TouchPictureEntry[] = [
  // The status strip, drawn on every screen by the clock header's programs, base slot 11 entries 0 to 3, section 414:
  // the gauge (entry 0) by firmware variable 9, the charging gauge (entry 1) by variable 15 and its animation.
  gauge('battery gauge 0', ['9456810d25276362'], 0),
  gauge('battery gauge 1', ['ca19ca492942fa53'], 1),
  gauge('battery gauge 2', ['402c18090541ef9f'], 2),
  gauge('battery gauge 3', ['afad868e8f4fd88d'], 3),
  gauge('battery gauge 4, charging frame 2', ['95b021d99cc90028'], 4),
  gauge('battery gauge 5', ['7aac2447e6b89f52'], 5),
  gauge('battery gauge 6', ['9779e2d0beb2b95c'], 6),
  gauge('battery gauge 7, charged, charging frame 1', ['8b83e7aaed517cfc'], 7),
  gauge('charging frame 3', ['8573355a626e2b64'], 2),
  gauge('charging at gauge level 0', ['08067e086d9d4871'], 0),
  // The sending mark (entry 2), by firmware variable 17: on from 1 to 3, off at 0.
  { name: 'sending mark on', keys: ['37f9efc9dc39dd18'], width: 22, height: 18, drawing: { kind: 'icon', at: [3, -1], size: 18 } },
  { name: 'sending mark off', keys: ['94b07bfb8f5b95d2'], width: 22, height: 18, drawing: { kind: 'black' } },
  // The clock (entry 3), the strip the day and the time are drawn on.
  { name: 'clock face', keys: ['799a9c1db81fb76c'], width: 88, height: 10, drawing: { kind: 'black' } },
  // The firmware screens, section 409, and the screens a timer enters, section 411.
  { name: 'Low Battery', keys: ['570b4c75e71d748e'], width: 61, height: 69, drawing: { kind: 'icon', at: [0, 4], size: 61 } },
  { name: 'USB Connected', keys: ['2643afb9a417f4ea'], width: 69, height: 91, drawing: { kind: 'icon', at: [0, 11], size: 69 } },
  // The cross's paper is its circle: the picture is drawn once over the black fill of a firmware screen, so black
  // anywhere else draws nothing that shows and costs two bytes a pixel, section 428.
  {
    name: 'charging problem', keys: ['a7a93475a4fc2216'], width: 87, height: 62,
    drawing: { kind: 'icon', at: [26, 22], size: 40, paper: 'circle' },
  },
  { name: 'charging screen', keys: ['84b0eb05a60277bc'], width: 176, height: 220, drawing: { kind: 'icon', at: [55, 100], size: 70 } },
  // The power off help, section 415, its questions' symbol, and the attempt screen's large sending mark.
  { name: 'power', keys: ['d0538d4a44ffc9cd'], width: 62, height: 42, drawing: { kind: 'icon', at: [13, 3], size: 36 } },
  { name: 'sending, large', keys: ['e30dd73cab793715'], width: 62, height: 33, drawing: { kind: 'icon', at: [16, -1], size: 33 } },
  // The settings screens' buttons, section 411: the pads of the clock pickers and Screen Sensitivity, the rows of the
  // Year picker and Options, three of Logitech's each, one per place.
  {
    name: 'settings pad', keys: ['6bb86f8e249abfa9', '6bde0b9d59751b4c', 'dc3b13c88d234a11'], width: 81, height: 50,
    drawing: { kind: 'settings box' },
  },
  {
    name: 'settings row', keys: ['081687e888fd4bfb', '39c3ce30ae35d411', '4c71e54675cafa8d'], width: 164, height: 50,
    drawing: { kind: 'settings box' },
  },
  // 5.3.3: the background, named by 66 to 314 draw instructions a compile, the firmware and status screens among them,
  // and the three photographs, each drawn by two of the six blank screens a timer enters whose purpose is open.
  { name: 'whole screen background', keys: ['4cb48913f37bd3c2'], width: 176, height: 220, drawing: { kind: 'background' } },
  {
    name: 'blank screen photographs', keys: ['a2eab2a5c8e07cc8', '8de220781ad6122f', '7827ee5ceb06103f'], width: 176, height: 220,
    drawing: { kind: 'background' },
  },
];

/**
 * The battery gauge by rule, 20 by 11. **Its own drawing is the box from x 1 and y 1 to the picture's far corner**, the
 * box around everything any level inks, the outline and the tip, black wherever no ink falls, so a level drawn over
 * another at the same place leaves none of the other's fill behind: the firmware draws over what the screen held,
 * section 425. Row 0 and column 0 lie outside that box and are left empty, showing what is behind the gauge: a choice,
 * as nine of Logitech's ten gauge pictures leave them undrawn, its level 0 drawing them.
 */
function gaugeRows(level: number): Rows {
  if (!Number.isInteger(level) || level < 0 || level > 7) throw new PictureError(`a battery gauge has levels 0 to 7, not ${level}`);
  const rows: Rows = Array.from({ length: GAUGE.height }, (_, y) => Array.from({ length: GAUGE.width }, (__, x) => (x === 0 || y === 0 ? undefined : BLACK)));
  // The body's outline from x 1 to 17 and y 1 to 10, and the tip at x 18 and 19 over y 4 to 7.
  for (let x = 1; x <= 17; x += 1) { rows[1]![x] = WHITE; rows[10]![x] = WHITE; }
  for (let y = 1; y <= 10; y += 1) { rows[y]![1] = WHITE; rows[y]![17] = WHITE; }
  for (let y = 4; y <= 7; y += 1) { rows[y]![18] = WHITE; rows[y]![19] = WHITE; }
  // The interior, x 3 to 15 and y 3 to 8, a pixel clear of the outline all round: dotted where the level is not
  // known, else filled from the left by level / 7 of its 13 columns.
  if (level === 0) {
    for (let y = 3; y <= 8; y += 1) for (let x = 3; x <= 15; x += 1) if ((x + y) % 2 === 0) rows[y]![x] = GREY;
  } else {
    const width = Math.round((13 * level) / 7);
    for (let y = 3; y <= 8; y += 1) for (let x = 3; x < 3 + width; x += 1) rows[y]![x] = WHITE;
  }
  return rows;
}

/**
 * Ours of `entry` by its rule alone, `todo-compile-one.md` 7.1.2: every pixel the drawing draws, and empty, undefined,
 * where it draws none, which is the picture's transparency. It takes no configuration and reads no picture, so a
 * configuration built from nothing has every fixed picture, and the composed path puts these in place of Logitech's
 * unless `TouchChoices.logitechMasks` keeps the masked form, `touchPictureRows`.
 *
 * **What each drawing leaves empty**: the battery gauge, row 0 and column 0, outside the box its levels ink,
 * `gaugeRows`, where the black is load bearing, since one level is drawn over another; the charging problem's cross,
 * every pixel outside its circle that the icon does not ink, as Logitech's cross leaves its corners undrawn; every
 * other drawing, nothing. The other icons are drawn over black paper the whole picture wide, as Logitech's six are
 * drawn at every pixel. A settings box's pixels outside its rounded corners are black, decided on
 * the sample of 18 October 2026, and the black pictures and the background are black throughout.
 */
export function touchPictureOwnRows(entry: TouchPictureEntry, choices: TouchChoices): Rows {
  const { width, height, drawing } = entry;
  const black = (): Rows => Array.from({ length: height }, () => new Array<number | undefined>(width).fill(BLACK));
  switch (drawing.kind) {
    case 'black':
    case 'background':
      return black();
    case 'gauge':
      if (width !== GAUGE.width || height !== GAUGE.height) throw new PictureError(`${entry.name}: a battery gauge is ${GAUGE.width} by ${GAUGE.height}`);
      return gaugeRows(drawing.level);
    case 'icon': {
      const icon = choices.pictureIcons[entry.name as TouchIconPicture];
      if (icon === undefined) throw new PictureError(`${entry.name} has no icon among the choices`);
      const rows = iconOverRows(black(), drawing.at[0], drawing.at[1], drawing.size, drawing.size, icon, drawing.size, WHITE);
      if (drawing.paper !== 'circle') return rows;
      // The paper a disc: a pixel whose centre lies outside it and that the icon left black is empty.
      const cx = drawing.at[0] + drawing.size / 2;
      const cy = drawing.at[1] + drawing.size / 2;
      const radius = (drawing.size * CIRCLE_ICON_RADIUS) / ICON_GRID;
      return rows.map((line, y) => line.map((v, x) => (v === BLACK && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > radius ? undefined : v)));
    }
    case 'settings box':
      // `activityBoxRows` leaves the corners outside the rounding undrawn; ours are black there, as decided.
      return activityBoxRows(width, height, choices.settingsBox, BLACK).map((line) => line.map((v) => v ?? BLACK));
  }
}

/** Ours of `entry` by its rule alone, encoded: `encodeBitmap` of `touchPictureOwnRows`. */
export function touchPictureOwnBytes(entry: TouchPictureEntry, choices: TouchChoices): Uint8Array {
  return encodeBitmap(touchPictureOwnRows(entry, choices));
}

/**
 * Every fixed picture of ours by its rule alone, one per entry of `TOUCH_PICTURES` in its order, for a configuration
 * that holds no picture of Logitech's to take a mask from, `todo-compile-one.md` 7.1. Nothing here takes a
 * configuration. The background's entry is among them though the composed path draws it as a fill by default,
 * `TouchChoices.backgroundFill`: whether it becomes one is the placing step's business, not the drawing's.
 */
export function touchFixedPictures(choices: TouchChoices): { entry: TouchPictureEntry; bytes: Uint8Array }[] {
  return TOUCH_PICTURES.map((entry) => ({ entry, bytes: touchPictureOwnBytes(entry, choices) }));
}

/**
 * Ours of `entry` drawn inside `mask`, a picture's pixels where only whether each is drawn is read: undrawn where the
 * mask is, and black where the mask is drawn and our drawing is not. The form of section 422, which takes Logitech's
 * transparency off the picture being replaced, kept behind `TouchChoices.logitechMasks` while no remote has shown the
 * rule's own, `touchPictureOwnRows`. Refused where the mask is not the entry's size.
 */
export function touchPictureRows(entry: TouchPictureEntry, mask: readonly (readonly (number | undefined)[])[], choices: TouchChoices): Rows {
  const { width, height } = entry;
  if (mask.length !== height || mask.some((row) => row.length !== width)) {
    throw new PictureError(`${entry.name} is ${width} by ${height}, and the picture it replaces is ${mask[0]?.length ?? 0} by ${mask.length}`);
  }
  const rows = touchPictureOwnRows(entry, choices);
  return mask.map((line, y) => line.map((v, x) => (v === undefined ? undefined : rows[y]![x] ?? BLACK)));
}

/** Ours of `entry` inside `mask`, encoded: `encodeBitmap` of `touchPictureRows`. */
export function touchPictureBytes(entry: TouchPictureEntry, mask: readonly (readonly (number | undefined)[])[], choices: TouchChoices): Uint8Array {
  return encodeBitmap(touchPictureRows(entry, mask, choices));
}

/**
 * Ours in place of `picture`, the form `choices` name: by the rule alone, `touchPictureOwnBytes`, which reads nothing
 * of the picture, or inside its mask, `touchPictureBytes`, with `TouchChoices.logitechMasks`. Either way refused where
 * the picture is not its entry's size, since ours is drawn at the place Logitech's was and a size it does not state
 * would be drawn at a size nobody measured. Undefined where no entry names the picture.
 */
export function touchPictureFor(picture: Pick<TouchPictureRead, 'pixels' | 'entry'>, choices: TouchChoices): Uint8Array | undefined {
  const { entry, pixels } = picture;
  if (entry === undefined) return undefined;
  if (choices.logitechMasks) return touchPictureBytes(entry, pixels, choices);
  if (pixels.length !== entry.height || pixels.some((row) => row.length !== entry.width)) {
    throw new PictureError(`${entry.name} is ${entry.width} by ${entry.height}, and the picture it replaces is ${pixels[0]?.length ?? 0} by ${pixels.length}`);
  }
  return touchPictureOwnBytes(entry, choices);
}

/** One picture of the bank as this module reads it: where it is, its pixels and the entry its content names, if any. */
export interface TouchPictureRead {
  piece: ContainerPiece;
  address: number;
  pixels: Rows;
  entry: TouchPictureEntry | undefined;
}

/**
 * Every picture of `c`'s bank, in bank order, with its pixels and the entry Logitech's content key names, the
 * pieces those of `takeApart(c)` so a caller can replace them. Refused where the configuration does not take apart
 * into itself, since the pixels are read at the address the layout gives each piece, and where a piece is longer
 * than the picture its header states: a picture nothing names is carried on the end of the piece before it, and
 * replacing that piece would take the unnamed one with it unasked.
 */
export function readTouchPictures(c: Container): { layout: ReturnType<typeof takeApart>; pictures: TouchPictureRead[] } {
  const layout = takeApart(c);
  const laid = layOutContainer(layout);
  if (laid.bytes.length !== c.blob.length) throw new PictureError('the configuration does not take apart into itself');
  const byKey = new Map(TOUCH_PICTURES.flatMap((entry) => entry.keys.map((key) => [key, entry] as const)));
  const pictures = layout.pictures.map((piece): TouchPictureRead => {
    const address = c.flashBase + (laid.offsetOf(piece) as number);
    const header = bitmapAt(c, address);
    const pixels = header === undefined ? undefined : bitmapPixels(c, header);
    if (pixels === undefined) throw new PictureError(`the picture at 0x${address.toString(16)} does not decode`);
    if (header?.length !== piece.bytes.length) {
      throw new PictureError(`the picture at 0x${address.toString(16)} carries ${piece.bytes.length - (header?.length ?? 0)} bytes nothing names`);
    }
    return { piece, address, pixels, entry: byKey.get(contentKey(piece.bytes)) };
  });
  return { layout, pictures };
}

/** What `withTouchPictures` did. */
export interface TouchPicturesPlaced {
  container: Container;
  /** The pictures given ours in their place, by entry name, a name once per picture. */
  replaced: string[];
  /** The pictures taken out and drawn as the one background, 5.3.3: its copies and the photographs. */
  merged: number;
  /** The draws of the background made one fill each, 5.3.4, and 0 where `TouchChoices.backgroundFill` keeps the picture. */
  filled: number;
}

/**
 * The configuration with ours in place of every picture `TOUCH_PICTURES` names, the header's drawings: each in its
 * place, its references kept, and every picture of the background's kind taken out for the first copy of the
 * background, which becomes ours, with every draw of theirs pointed at it. A picture no entry names is kept as it is.
 * Refused: a picture of another size than its entry's, and a photograph with no background to draw instead.
 */
export function withTouchPictures(c: Container, choices: TouchChoices): TouchPicturesPlaced {
  const { layout, pictures } = readTouchPictures(c);
  const replace = new Map<ContainerPiece, Uint8Array>();
  const onto = new Map<ContainerPiece, ContainerPiece>();
  const replaced: string[] = [];
  const backgrounds = pictures.filter((one) => one.entry?.drawing.kind === 'background');
  const one = backgrounds.find((picture) => picture.entry?.name === 'whole screen background');
  if (backgrounds.length > 0 && one === undefined) {
    throw new PictureError('the configuration draws the blank screens\' photographs and holds no whole screen background to draw instead');
  }
  for (const picture of pictures) {
    if (picture.entry === undefined) continue;
    if (picture.entry.drawing.kind === 'background' && picture !== one) {
      onto.set(picture.piece, (one as TouchPictureRead).piece);
      continue;
    }
    replace.set(picture.piece, touchPictureFor(picture, choices) as Uint8Array);
    replaced.push(picture.entry.name);
  }
  if (replace.size === 0 && onto.size === 0) return { container: c, replaced, merged: 0, filled: 0 };
  const placed = layOutContainer(withReplacedPictures(layout, replace, onto));
  if (!choices.backgroundFill || one === undefined) return { container: placed.container, replaced, merged: onto.size, filled: 0 };
  // 5.3.4: the background, ours and all black, drawn by one fill where it was drawn, and out of the bank.
  const ours = replace.get(one.piece) as Uint8Array;
  const background = readTouchPictures(placed.container).pictures
    .find((picture) => picture.piece.bytes.length === ours.length && picture.piece.bytes.every((byte, k) => byte === ours[k]));
  if (background === undefined) throw new PictureError('the background put in the bank does not read back');
  const filled = withPictureFilled(placed.container, background.address);
  return { container: filled.container, replaced, merged: onto.size, filled: filled.filled };
}

/**
 * Which pictures of `c` are ours, read off the finished file with no memory of how it was made: a picture is ours
 * where an entry of its size gives its bytes exactly, in the form `choices` name, by the rule alone or, with
 * `TouchChoices.logitechMasks`, drawn inside the picture's own mask. How `touchBuiltBytes` counts this module's bytes;
 * a picture of Logitech's that ours reproduces, the all black ones, counts as ours too, since the rule makes every byte
 * of it. Each picture once, by its blob offset and length.
 */
export function touchOurPictures(c: Container, choices: TouchChoices): { offset: number; length: number; name: string }[] {
  const { pictures } = readTouchPictures(c);
  const out: { offset: number; length: number; name: string }[] = [];
  const own = new Map(choices.logitechMasks ? [] : TOUCH_PICTURES.map((entry) => [entry, touchPictureOwnBytes(entry, choices)] as const));
  for (const picture of pictures) {
    const height = picture.pixels.length;
    const width = picture.pixels[0]?.length ?? 0;
    const offset = c.blobOffsetOf(picture.address) as number;
    for (const entry of TOUCH_PICTURES) {
      if (entry.width !== width || entry.height !== height) continue;
      const ours = own.get(entry) ?? touchPictureBytes(entry, picture.pixels, choices);
      if (ours.length === picture.piece.bytes.length && ours.every((byte, k) => byte === picture.piece.bytes[k])) {
        out.push({ offset, length: ours.length, name: entry.name });
        break;
      }
    }
  }
  return out;
}
