/**
 * Our pictures drawn from an icon font, `todo-compile-650.md` 9.1.2.2: Material Design Icons read from the
 * pinned package and drawn by the rasteriser our letters use, placed by one rule, and encoded as the
 * pictures they replace.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  FOUR_SLOT_CHOICES, IconError, OUR_PICTURE_PLACES, STARTUP_FIXED_LINE_Y, STARTUP_TITLE_SECOND_Y, buildOurPictures, drawIcon, iconNames, iconPath,
} from '../src/index.ts';

/** The ink's box on a drawing `width` wide: leftmost, rightmost, top and bottom ink pixel, and the count. */
function inkBox(ink: Uint8Array, width: number): [number, number, number, number, number] {
  let [x0, x1, y0, y1, n] = [Infinity, -1, Infinity, -1, 0];
  ink.forEach((v, k) => {
    if (v === 0) return;
    const x = k % width;
    const y = Math.floor(k / width);
    [x0, x1, y0, y1, n] = [Math.min(x0, x), Math.max(x1, x), Math.min(y0, y), Math.max(y1, y), n + 1];
  });
  return [x0, x1, y0, y1, n];
}

test('every icon of the pinned package is named, and a name it lacks is refused', () => {
  // The package's own list of 7.4.47, `scss/_variables.scss`.
  assert.equal(iconNames().size, 7447);
  assert.equal(iconNames().get('usb'), 0xf0553);
  assert.throws(() => iconPath('no-such-icon', 64, 64, 64), IconError);
});

test('an icon is placed by its grid square: the USB icon at 64 pixels sits inside Logitech\'s icon square, centred', () => {
  // Logitech's firmware screen icons sit in the square x 32 to 95, y 32 to 95; the icon keeps its own margin
  // inside it, so its ink spans 45 to 82 across and 35 to 90 down.
  assert.deepEqual(inkBox(drawIcon('usb', 128, 128, 64, 64, 64).ink, 128), [45, 82, 35, 90, 788]);
  // Moving the centre moves the ink by as much and changes nothing else.
  const moved = inkBox(drawIcon('usb', 128, 128, 74, 54, 64).ink, 128);
  assert.deepEqual(moved, [55, 92, 25, 80, 788]);
});

test('the start up icon clears a title of two lines and the fixed lines below it, and so does any icon chosen in its place', () => {
  // A start up title is at most two lines, the second's 14 high cell at y 19, inked to row 32 by a descender
  // on the bench's Starting Plasma kijken; the fixed lines' ink starts at row 84, under the cell at y 82.
  const place = OUR_PICTURE_PLACES['start up picture'];
  // Every pixel it covers at all, since the picture blends a partly covered edge into its background.
  const drawn = drawIcon(FOUR_SLOT_CHOICES.icons['start up picture'], 128, 128, place.centre[0], place.centre[1], place.size);
  const box = inkBox(Uint8Array.from(drawn.coverage, (v) => (v > 0 ? 1 : 0)), 128);
  assert.deepEqual([box[2], box[3]], [38, 78]);
  assert.equal(box[2] - (STARTUP_TITLE_SECOND_Y + 13), 6, 'rows from the second line\'s last to the icon\'s first');
  assert.equal(STARTUP_FIXED_LINE_Y[0]! + 2 - box[3], 6, 'and from the icon\'s last to the fixed lines\' first');
  // The whole grid square an icon is drawn in lies between them too, so no icon chosen can reach either.
  const [squareTop, squareBottom] = [place.centre[1] - place.size / 2, place.centre[1] + place.size / 2 - 1];
  assert.deepEqual([squareTop, squareBottom], [38, 79]);
  assert.ok(squareTop > STARTUP_TITLE_SECOND_Y + 13 && squareBottom < STARTUP_FIXED_LINE_Y[0]! + 2);
});

test('the six pictures are built at the sizes of the pictures they replace and the Harmony 700\'s five at the size of its firmware screens\' pictures, the same bytes every time', () => {
  const made = buildOurPictures({ icons: FOUR_SLOT_CHOICES.icons, colour: FOUR_SLOT_CHOICES.iconColour, background: FOUR_SLOT_CHOICES.iconBackground });
  assert.deepEqual([...made.keys()].sort(), Object.keys(OUR_PICTURE_PLACES).sort());
  // The ten on a solid background are raw, every pixel drawn: a five byte header and 128 by 128 pixels of
  // two bytes; the corner mark draws its ink alone and is encoded.
  for (const [name, bytes] of made) assert.equal(bytes.length, name === 'corner mark' ? 109 : 5 + 128 * 128 * 2, name);
  // Two digests: the six of the Harmony 650's, which the 700's five were added beside without moving a byte
  // of, and the 700's five, `todo-compile-700.md` 1.2.
  const SEVEN_HUNDRED = new Set(['charging 1', 'charging 2', 'charging 3', 'charging 4', 'charged']);
  const digestOf = (keep: (name: string) => boolean): string => {
    const digest = createHash('sha256');
    for (const [name, bytes] of made) if (keep(name)) digest.update(name).update(bytes);
    return digest.digest('hex').slice(0, 16);
  };
  assert.equal(digestOf((name) => !SEVEN_HUNDRED.has(name)), '463bc81f4e3af245');
  assert.equal(digestOf((name) => SEVEN_HUNDRED.has(name)), '84a4601f659e720f');
});
