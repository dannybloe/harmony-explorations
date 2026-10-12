/**
 * Our pictures drawn from an icon font, `todo-compile-650.md` 9.1.2.2: Material Design Icons read from the
 * pinned package and drawn by the rasteriser our letters use, placed by one rule, and encoded as the
 * pictures they replace.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { FOUR_SLOT_CHOICES, IconError, OUR_PICTURE_PLACES, buildOurPictures, drawIcon, iconNames, iconPath } from '../src/index.ts';

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

test('the six pictures are built at the sizes of the pictures they replace, the same bytes every time', () => {
  const made = buildOurPictures({ icons: FOUR_SLOT_CHOICES.icons, colour: FOUR_SLOT_CHOICES.iconColour, background: FOUR_SLOT_CHOICES.iconBackground });
  assert.deepEqual([...made.keys()].sort(), Object.keys(OUR_PICTURE_PLACES).sort());
  // The five on a solid background are raw, every pixel drawn: a five byte header and 128 by 128 pixels of
  // two bytes; the corner mark draws its ink alone and is encoded.
  for (const [name, bytes] of made) assert.equal(bytes.length, name === 'corner mark' ? 109 : 5 + 128 * 128 * 2, name);
  const digest = createHash('sha256');
  for (const [name, bytes] of made) digest.update(name).update(bytes);
  assert.equal(digest.digest('hex').slice(0, 16), '59376e0fdc89b070');
});
