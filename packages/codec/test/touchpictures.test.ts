/**
 * The Harmony One's fixed pictures drawn by us, `todo-compile-one.md` 5.3.1 and 5.3.3, findings section 422,
 * `families/touch/pictures.ts`: every picture of ours Logitech's size with Logitech's transparency mask, each icon
 * where Logitech's ink sits, and the whole screen background one black picture that the six blank screens drawing
 * photographs draw too. Logitech's pictures are read off the lab's compiles here and never written into the repository.
 *
 * Every figure is exact. **What the closures here do and do not show**, findings section 422: the mask of every
 * picture of ours is Logitech's by construction, so a mask comparison cannot fail and only shows the comparison works;
 * the size of ours encoded against Logitech's is the closure with two ends, our encoder and Logitech's own bytes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import { type Container, encodeBitmap, layOutContainer, parse, picturesByContent, takeApart } from '../src/index.ts';
import { contentKey } from '../src/screencategories.ts';
import { PictureError, withReplacedPictures } from '../src/pictures.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import {
  TOUCH_PICTURES, type TouchPictureEntry, readTouchPictures, touchOurPictures, touchPictureRows, withTouchPictures,
} from '../src/families/touch/pictures.ts';
import { withTouchBuilders, withTouchComposedBuilders } from '../src/families/touch/builders.ts';
import { withoutTourAndAssistant } from '../src/families/touch/withouttour.ts';

/** The sixteen English compiles of skin 54, section 405. */
const SIXTEEN = [
  'harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830', 'calibration_one',
  'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2', 'compiled_protocols_3',
  'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3', 'one_friend_legacy_sync_config',
  'phase7_before', 'phase7_after',
] as const;
const DONOR = 'harvest_one_two_devices';
/** The compiles of the sixteen that store the whole screen background three times; the other twelve store it four times. */
const THREE_BACKGROUNDS = new Set(['harvest_one_two_devices', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3']);
const backgrounds = (name: string): number => (THREE_BACKGROUNDS.has(name) ? 3 : 4);

type Rows = readonly (readonly (number | undefined)[])[];

/** Whether two pictures have one size and are drawn at exactly the same pixels. */
function sameMask(a: Rows, b: Rows): boolean {
  return a.length === b.length && a.every((row, y) => row.length === b[y]!.length
    && row.every((v, x) => (v === undefined) === (b[y]![x] === undefined)));
}

test('todo-compile-one 5.3: every one of the 29 pictures of Logitech\'s the module names is held by each of the sixteen English compiles of skin 54, at its entry\'s size, 37 or 38 pictures a compile as the background is stored three or four times',
     skipUnless(...SIXTEEN), () => {
  const keys = TOUCH_PICTURES.flatMap((entry) => entry.keys);
  assert.equal(keys.length, 29);
  assert.equal(new Set(keys).size, 29);
  for (const name of SIXTEEN) {
    const { pictures } = readTouchPictures(parse(require_(name)));
    const named = pictures.filter((one) => one.entry !== undefined);
    // 29 images, 37 or 38 pictures: Logitech stores the settings pads twice each, the gauge at level 7 three times and
    // at level 4 twice, and the background three times on four of the sixteen and four times on the others.
    assert.equal(named.length, 34 + backgrounds(name), name);
    assert.deepEqual(new Set(named.map((one) => contentKey(one.piece.bytes))), new Set(keys), name);
    for (const one of named) {
      const entry = one.entry as TouchPictureEntry;
      assert.deepEqual([one.pixels[0]!.length, one.pixels.length], [entry.width, entry.height], `${name} ${entry.name}`);
    }
  }
});

test('todo-compile-one 5.3.1: on each of the sixteen every picture of ours encodes to as many bytes as the Logitech picture it replaces and sits in that picture\'s place in the bank, with the mask taken from it',
     skipUnless(...SIXTEEN), () => {
  for (const name of SIXTEEN) {
    const c = parse(require_(name));
    const { pictures } = readTouchPictures(c);
    const placed = withTouchPictures(c, TOUCH_CHOICES);
    const after = picturesByContent(placed.container);
    // The bank's pictures in order, as the placed file holds them: the replaced ones keep their order, and the
    // background's other copies and the photographs, merged onto the first copy, are the ones gone.
    const first = pictures.find((one) => one.entry?.name === 'whole screen background')!;
    const merged = (one: typeof first): boolean => one.entry?.drawing.kind === 'background' && one !== first;
    const kept = pictures.filter((one) => !merged(one));
    const bank = readTouchPictures(placed.container).pictures;
    assert.equal(bank.length, kept.length, name);
    let checked = 0;
    let atPlace = 0;
    pictures.forEach((one) => {
      if (one.entry === undefined) return;
      const ours = touchPictureRows(one.entry, one.pixels, TOUCH_CHOICES);
      // The mask is Logitech's by construction, so this cannot fail: `sameMask` is held to it, not the drawing.
      assert.ok(sameMask(ours, one.pixels), `${name} ${one.entry.name}`);
      const bytes = encodeBitmap(ours);
      // Where the two ends are independent: Logitech's own byte count off its own header, ours off our encoder. It
      // shows the encoder picks the form and the runs Logitech's does over the same mask, and nothing of the pixels.
      assert.equal(bytes.length, one.piece.bytes.length, `${name} ${one.entry.name}`);
      assert.ok(after.has(contentKey(bytes)), `${name} ${one.entry.name} is not in the file`);
      checked += 1;
      if (merged(one)) return;
      // And in its place: the k-th picture of the placed bank is ours where the k-th kept one was Logitech's.
      const at = kept.indexOf(one);
      assert.equal(contentKey(bank[at]!.piece.bytes), contentKey(bytes), `${name} ${one.entry.name} is not at its place`);
      atPlace += 1;
    });
    assert.equal(checked, 34 + backgrounds(name), name);
    assert.equal(atPlace, 32, name);
    // 32 pictures replaced in place: all of them but the background's other copies and the three photographs.
    assert.equal(placed.replaced.length, 32, name);
    assert.equal(placed.merged, backgrounds(name) - 1 + 3, name);
    // Of Logitech's named pictures only the all black ones are left, which ours reproduces byte for byte: the
    // background, the sending mark off and the clock face.
    const left = TOUCH_PICTURES.flatMap((entry) => entry.keys).filter((key) => after.has(key));
    assert.deepEqual(left.sort(), ['4cb48913f37bd3c2', '799a9c1db81fb76c', '94b07bfb8f5b95d2'], name);
    assert.ok(placed.container.allChecksPass, name);
  }
});

/** The sixteen and the three Harmony One compiles outside them: the everyday One's, its unprogrammed one and the Dutch one. */
const NINETEEN = [...SIXTEEN, 'one_config', 'one_config_unprogrammed', 'one_friend_asfound_config'] as const;

test('todo-compile-one 5.3.1: on all nineteen Harmony One compiles every named picture of ours encodes to as many bytes as Logitech\'s own, 716 of 716, the two ends being our encoder and the length Logitech\'s header states',
     skipUnless(...NINETEEN), () => {
  let total = 0;
  for (const name of NINETEEN) {
    for (const one of readTouchPictures(parse(require_(name))).pictures) {
      if (one.entry === undefined) continue;
      assert.equal(encodeBitmap(touchPictureRows(one.entry, one.pixels, TOUCH_CHOICES)).length, one.piece.bytes.length, `${name} ${one.entry.name}`);
      total += 1;
    }
  }
  assert.equal(total, 716);
});

test('todo-compile-one 5.3.1: the mask comparison used here tells a mask one pixel off apart, and an entry of another size is refused rather than drawn',
     skipUnless(DONOR), () => {
  const { pictures } = readTouchPictures(parse(require_(DONOR)));
  const cross = pictures.find((one) => one.entry?.name === 'charging problem')!;
  const ours = touchPictureRows(cross.entry!, cross.pixels, TOUCH_CHOICES);
  assert.ok(sameMask(ours, cross.pixels));
  // The control: Logitech's mask with one drawn pixel made undrawn, the first drawn pixel of its middle row.
  const off = cross.pixels.map((row) => [...row]);
  const middle = off[31]!;
  middle[middle.findIndex((v) => v !== undefined)] = undefined;
  assert.ok(!sameMask(ours, off));
  assert.ok(sameMask(touchPictureRows(cross.entry!, off, TOUCH_CHOICES), off));
  // An entry of another size than the picture it is given.
  const pad = pictures.find((one) => one.entry?.name === 'settings pad')!;
  assert.throws(() => touchPictureRows(cross.entry!, pad.pixels, TOUCH_CHOICES),
    (error: unknown) => error instanceof PictureError && /^charging problem is 87 by 62, and the picture it replaces is 81 by 50$/.test(error.message));
});

/**
 * Section 373's rule, measured again off Logitech's picture: the box around every pixel drawn and not the paper, the
 * colour of the corner, or around every drawn pixel where the corner is undrawn; the icon's square centred on it,
 * the longer side but no larger than the picture, or the shorter where the corner is undrawn, scaled by `scale`.
 */
function placeOf(pixels: Rows, scale: number): { at: [number, number]; size: number } {
  const paper = pixels[0]![0];
  let x0 = Infinity; let y0 = Infinity; let x1 = -1; let y1 = -1;
  pixels.forEach((row, y) => row.forEach((v, x) => {
    if (v === undefined || v === paper) return;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }));
  const [w, h] = [x1 - x0 + 1, y1 - y0 + 1];
  const side = paper === undefined ? Math.min(w, h) : Math.min(Math.max(w, h), pixels.length, pixels[0]!.length);
  const size = Math.round(side * scale);
  return { at: [Math.round(x0 + w / 2 - size / 2), Math.round(y0 + h / 2 - size / 2)], size };
}

test('todo-compile-one 5.3.1: each of the seven icons sits where section 373\'s rule puts it when measured off Logitech\'s picture, the rule being fitted to these same seven and no outside sample',
     skipUnless(DONOR), () => {
  const { pictures } = readTouchPictures(parse(require_(DONOR)));
  const icons = TOUCH_PICTURES.filter((entry) => entry.drawing.kind === 'icon');
  assert.equal(icons.length, 7);
  for (const entry of icons) {
    const theirs = pictures.find((one) => one.entry === entry)!;
    const drawing = entry.drawing as { at: readonly [number, number]; size: number };
    assert.deepEqual(placeOf(theirs.pixels, entry.name === 'charging screen' ? 0.8 : 1), { at: [...drawing.at], size: drawing.size }, entry.name);
  }
});

/** How many references each picture of `c`'s bank has, by its content key, summed over its copies. */
function namings(c: Container): Map<string, number> {
  const layout = takeApart(c);
  const all = [layout.keyTable, ...layout.body, ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])),
    ...Object.values(layout.inserted ?? {}).flatMap((s) => [...s.before, ...s.head]), ...layout.pictures];
  const out = new Map<string, number>();
  for (const piece of layout.pictures) {
    const key = contentKey(piece.bytes);
    out.set(key, (out.get(key) ?? 0) + all.reduce((n, one) => n + one.refs.filter((ref) => 'to' in ref && ref.to === piece).length, 0));
  }
  return out;
}

test('todo-compile-one 5.3.3: on Logitech\'s compile of two devices the whole screen background is one black picture, 77445 bytes where its three copies and the three photographs took six times that, and every draw of any of the four draws it',
     skipUnless(DONOR), () => {
  const c = parse(require_(DONOR));
  const before = namings(c);
  const background = TOUCH_PICTURES.filter((entry) => entry.drawing.kind === 'background').flatMap((entry) => entry.keys);
  const draws = background.reduce((n, key) => n + (before.get(key) ?? 0), 0);
  // The references to the background's three copies, 75 on this compile (66 to 314 over the sixteen), and to each
  // photograph two: six blank screens a timer enters draw them, which is all this says of what they are for.
  assert.deepEqual(background.map((key) => before.get(key)), [75, 2, 2, 2]);
  const placed = withTouchPictures(c, TOUCH_CHOICES).container;
  assert.equal(c.blob.length - placed.blob.length, 5 * 77445);
  const after = namings(placed);
  // One picture holds them all, all black and uncompressed, Logitech's own bytes.
  assert.deepEqual(background.map((key) => after.get(key)), [draws, undefined, undefined, undefined]);
  assert.equal(picturesByContent(placed).get(background[0]!)!.length, 1);
  const one = readTouchPictures(placed).pictures.find((picture) => contentKey(picture.piece.bytes) === background[0])!;
  assert.ok(one.pixels.every((row) => row.length === 176 && row.every((v) => v === 0)));
  assert.equal(one.piece.bytes.length, 77445);
  // Merging onto a picture that is itself merged, or out of the bank, is refused by the shared step.
  const layout = takeApart(c);
  const [a, b, d] = layout.pictures as [typeof layout.pictures[number], typeof layout.pictures[number], typeof layout.pictures[number]];
  assert.throws(() => withReplacedPictures(layout, new Map(), new Map([[a, b], [b, d]])),
    (error: unknown) => error instanceof PictureError && /merged onto one that is merged itself/.test(error.message));
});

test('todo-compile-one 5.3: on the composed path ours go in unless the choice keeps Logitech\'s, and the attribution, which recognises a picture by reproducing it with the drawing rule, counts 32 on the finished file and on Logitech\'s compile of two devices, with three background copies, the five all black ones the rule reproduces',
     skipUnless(DONOR), () => {
  assert.equal(TOUCH_CHOICES.logitechPictures, false);
  const c = parse(require_(DONOR));
  const without = withoutTourAndAssistant(c).container;
  const kept = withTouchComposedBuilders(c, [], { ...TOUCH_CHOICES, logitechPictures: true });
  assert.equal(Buffer.compare(kept.container.blob, withTouchBuilders(without).container.blob), 0);
  assert.ok(!kept.built.includes('pictures'));
  const ours = withTouchComposedBuilders(c, [], TOUCH_CHOICES);
  assert.equal(ours.built.at(-1), 'pictures');
  assert.equal(Buffer.compare(ours.container.blob, withTouchPictures(kept.container, TOUCH_CHOICES).container.blob), 0);
  // Ours found by reproducing each with the drawing rule, which is what the attribution does and so cannot miss one of
  // ours: 32 pictures, the 37 less the five taken out for the one background.
  assert.equal(touchOurPictures(ours.container, TOUCH_CHOICES).length, 32);
  // On Logitech's compile, with the background stored three times here: five all black pictures. On the twelve of
  // the sixteen that store it four times the rule reproduces six, measured in section 422.
  assert.deepEqual(touchOurPictures(c, TOUCH_CHOICES).map((one) => one.name).sort(), [
    'clock face', 'sending mark off', 'whole screen background', 'whole screen background', 'whole screen background',
  ]);
  // And it lays out again into itself, every picture a piece of its own.
  assert.equal(layOutContainer(takeApart(ours.container)).bytes.length, ours.container.blob.length);
});
