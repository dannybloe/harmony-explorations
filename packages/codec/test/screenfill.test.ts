/**
 * Screen opcode 1, a filled rectangle, findings section 425: how the renderer draws it, a closure over Logitech's
 * compiles that the operands are read in the right order, and the Harmony One's black background made one fill per
 * draw, `withPictureFilled` through `withTouchPictures`, `todo-compile-one.md` 5.3.4.
 *
 * **The closure has two ends that share no field.** Logitech's pickers frame a button with four fills two pixels wide,
 * section 416. Read as `x, y, width, height`, the firmware's order, the four close into a ring whose inside is exactly a
 * picture some program draws: its place from that draw's operands and its size from the picture's own header. Read in
 * another order they close round nothing, which is the control.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container, PictureError, SCREEN_DRAW_IMAGE, SCREEN_FILL, bitmapAt, fillRows, modePages, parse, pictureReference,
  reachablePrograms, renderPage, withPictureFilled,
} from '../src/index.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import { readTouchPictures, withTouchPictures } from '../src/families/touch/pictures.ts';

/** The sixteen English compiles of skin 54, section 405. */
const SIXTEEN = [
  'harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830', 'calibration_one',
  'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2', 'compiled_protocols_3',
  'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3', 'one_friend_legacy_sync_config',
  'phase7_before', 'phase7_after',
] as const;
const ONE = { width: 176, height: 220 };

test('todo-compile-one 5.3.4: a fill draws its colour, high byte first, over its rectangle clipped to the screen, its rows counted to y + height in eight bits',
     () => {
  const whole = fillRows(Uint8Array.of(0, 0, 176, 220, 0x07, 0xec), ONE);
  assert.deepEqual([whole.x, whole.y, whole.pixels.length, whole.pixels[0]!.length], [0, 0, 220, 176]);
  assert.ok(whole.pixels.every((row) => row.every((pixel) => pixel === 0x07ec)));
  // Past the right and the bottom edge: the columns to the edge, the rows to the edge.
  const clipped = fillRows(Uint8Array.of(170, 210, 20, 20, 0, 0), ONE);
  assert.deepEqual([clipped.pixels.length, clipped.pixels[0]!.length], [10, 6]);
  // 220 rows from y 40 end at row (40 + 220) mod 256 = 4, so none is drawn: what the firmware's loop does.
  assert.equal(fillRows(Uint8Array.of(0, 40, 176, 220, 0, 0), ONE).pixels.length, 0);
  assert.equal(fillRows(Uint8Array.of(0, 35, 176, 220, 0, 0), ONE).pixels.length, 185);
  // The edge: y + height of exactly 256 is a stop row of 0, nothing drawn; 255 is the last that draws.
  assert.equal(fillRows(Uint8Array.of(0, 36, 176, 220, 0, 0), ONE).pixels.length, 0);
  // High byte first is the renderer's convention, the one it draws a picture's pixel in; that the firmware writes the
  // colour's first byte first is section 425's reading of the row routine and not asserted by this test.
});

type Rect = readonly [number, number, number, number];

/** Every run of four consecutive fills in a program that is not the whole screen, as rectangles in `order`. */
function frames(c: Container, order: (o: Uint8Array) => Rect): Rect[][] {
  const out: Rect[][] = [];
  const seen = new Set<number>();
  for (const [, program] of reachablePrograms(c)) {
    let run: Rect[] = [];
    for (const one of program) {
      if (seen.has(one.start)) { run = []; continue; }
      seen.add(one.start);
      const whole = one.operands[2] === 176 && one.operands[3] === 220;
      if (one.opcode === SCREEN_FILL && !whole) run.push(order(one.operands));
      else {
        if (run.length > 0) out.push(run);
        run = [];
      }
    }
    if (run.length > 0) out.push(run);
  }
  return out;
}

/** The inside of a ring two pixels wide the rectangles make exactly, or undefined where they make none. */
function ringInside(rects: readonly Rect[]): Rect | undefined {
  const cells = new Set<string>();
  for (const [x, y, w, h] of rects) for (let r = y; r < y + h; r += 1) for (let k = x; k < x + w; k += 1) cells.add(`${k},${r}`);
  const xs = rects.flatMap(([x, , w]) => [x, x + w]);
  const ys = rects.flatMap(([, y, , h]) => [y, y + h]);
  const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const inside: Rect = [left + 2, top + 2, right - left - 4, bottom - top - 4];
  if (inside[2] <= 0 || inside[3] <= 0) return undefined;
  for (let r = top; r < bottom; r += 1) {
    for (let k = left; k < right; k += 1) {
      const within = k >= inside[0] && k < inside[0] + inside[2] && r >= inside[1] && r < inside[1] + inside[3];
      if (cells.has(`${k},${r}`) === within) return undefined;
    }
  }
  return inside;
}

/** Every picture a program of `c` draws with opcode 2, as its place and its header's size. */
function drawnRects(c: Container): Set<string> {
  const out = new Set<string>();
  for (const [, program] of reachablePrograms(c)) {
    for (const one of program) {
      if (one.opcode !== SCREEN_DRAW_IMAGE) continue;
      const header = bitmapAt(c, pictureReference(one) as number);
      if (header !== undefined) out.add([one.operands[0], one.operands[1], header.stride, header.rows].join(','));
    }
  }
  return out;
}

test('todo-compile-one 5.3.4: read as x, y, width and height, every picker frame of four fills on the sixteen closes into a ring two pixels round a picture a program draws, and read with width and height swapped none does',
     skipUnless(...SIXTEEN), () => {
  const firmware = (o: Uint8Array): Rect => [o[0]!, o[1]!, o[2]!, o[3]!];
  const swapped = (o: Uint8Array): Rect => [o[0]!, o[1]!, o[3]!, o[2]!];
  let rings = 0;
  let control = 0;
  for (const name of SIXTEEN) {
    const c = parse(require_(name));
    const drawn = drawnRects(c);
    const groups = frames(c, firmware);
    assert.ok(groups.every((one) => one.length === 4), name);
    for (const group of groups) {
      const inside = ringInside(group);
      assert.ok(inside !== undefined && drawn.has(inside.join(',')), `${name}: ${JSON.stringify(group)}`);
      rings += 1;
    }
    for (const group of frames(c, swapped)) {
      const inside = ringInside(group);
      if (inside !== undefined && drawn.has(inside.join(','))) control += 1;
    }
  }
  assert.deepEqual([rings, control], [144, 0]);
});

test('todo-compile-one 5.3.4: on each of the sixteen the background of ours becomes one fill per draw and leaves the bank, the file 77445 bytes less a byte a draw shorter, and every page draws the same',
     skipUnless(...SIXTEEN), () => {
  const pictureChoices = { ...TOUCH_CHOICES, backgroundFill: false };
  let draws = 0;
  for (const name of SIXTEEN) {
    const c = parse(require_(name));
    const picture = withTouchPictures(c, pictureChoices).container;
    const fill = withTouchPictures(c, TOUCH_CHOICES);
    assert.ok(fill.container.allChecksPass, name);
    assert.equal(picture.blob.length - fill.container.blob.length, 77445 - fill.filled, name);
    assert.equal(readTouchPictures(fill.container).pictures.some((one) => one.entry?.name === 'whole screen background'), false, name);
    draws += fill.filled;
    const before = modePages(picture);
    const after = modePages(fill.container);
    assert.equal(after.length, before.length, name);
    before.forEach((page, k) => {
      const a = renderPage(picture, page)!;
      const b = renderPage(fill.container, after[k]!)!;
      assert.ok(a.raster.pixels.every((v, i) => v === b.raster.pixels[i]), `${name} page ${k}`);
    });
  }
  assert.equal(draws, 2907);
});

test('todo-compile-one 5.3.4: a picture a fill does not draw exactly is refused, one of more than one colour, an encoded one, and one drawn where the fill\'s rows would wrap',
     skipUnless('harvest_one_two_devices'), () => {
  const c = parse(require_('harvest_one_two_devices'));
  const { pictures } = readTouchPictures(c);
  // The charging screen is 176 by 220 too, and drawn in more than one colour.
  const charging = pictures.find((one) => one.entry?.name === 'charging screen')!;
  assert.throws(() => withPictureFilled(c, charging.address), (error: unknown) => error instanceof PictureError && /not one colour/.test(error.message));
  // A battery gauge is encoded, which a fill takes the place of in no case: refused before its pixels are looked at.
  const gauge = pictures.find((one) => one.entry?.name === 'battery gauge 3')!;
  assert.throws(() => withPictureFilled(c, gauge.address), (error: unknown) => error instanceof PictureError && /raw picture only/.test(error.message));
  // The background, one colour and raw, is taken; with one of its draws moved down to row 40 it is not, since 220
  // rows from row 40 stop at row 4 in the firmware's eight bits and the fill would draw nothing there.
  const background = pictures.find((one) => one.entry?.name === 'whole screen background')!;
  assert.ok(withPictureFilled(c, background.address).filled > 0);
  const draw = [...reachablePrograms(c).values()].flat()
    .find((one) => one.opcode === SCREEN_DRAW_IMAGE && pictureReference(one) === background.address)!;
  const moved = Buffer.from(c.blob);
  moved[draw.start + 2] = 40;
  assert.throws(() => withPictureFilled(parse(moved), background.address),
    (error: unknown) => error instanceof PictureError && /a draw at y 40/.test(error.message));
  // Not exercised here, with no sample of either: a raw picture of one colour with an undrawn pixel, a reference to
  // the picture that is not a draw, and an address landing inside a draw.
});
