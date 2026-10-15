/**
 * Letters rendered in the codec, `todo-compile-650.md` 10.8: the rasteriser's coverage and ink on shapes
 * whose answer is known, the nine faces' letters landing on the rows each face states, and the whole of
 * what the renderer draws pinned by a digest, so a change to the rasteriser or to the font is seen and the
 * claim that every machine draws the same bytes is checked on each one the suite runs on.
 *
 * Against the letters Pillow drew, which these replaced once a preview was approved, 414 of the 855 masks
 * were identical, 33 a column narrower or wider, and every capital, small letter and digit on the same
 * rows but the dots of i and j and the tail of Q; measured while both existed, and recorded in `typeface.ts`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import {
  LETTERING_CHARACTERS,
  HARMONY_650_FACES,
  HARMONY_ONE_FACES,
  LETTERING_FACES,
  OXANIUM_FACE_SPECS,
  oxanium,
  oxaniumFace,
  rasterise,
  type PathCommand,
} from '../src/index.ts';

const box = (x0: number, y0: number, x1: number, y1: number): PathCommand[] =>
  [{ type: 'M', x: x0, y: y0 }, { type: 'L', x: x1, y: y0 }, { type: 'L', x: x1, y: y1 }, { type: 'L', x: x0, y: y1 }, { type: 'Z' }];

test('the rasteriser covers a rectangle exactly, inks the pixels whose centres it holds, and keeps a stroke thinner than a pixel', () => {
  // From (1.25, 1) to (3.5, 3): three quarters of column 1 and half of column 3 covered on two whole rows.
  const r = rasterise(box(1.25, 1, 3.5, 3), 5, 4);
  const row = (y: number) => [...r.coverage.slice(y * 5, y * 5 + 5)];
  assert.deepEqual(row(0), [0, 0, 0, 0, 0]);
  assert.deepEqual(row(1), [0, 0.75, 1, 0.5, 0]);
  assert.deepEqual(row(2), [0, 0.75, 1, 0.5, 0]);
  // Centres at x + 0.5: columns 1 and 2 inside, column 3's centre on the right edge is not.
  assert.deepEqual([...r.ink.slice(5, 10)], [0, 1, 1, 0, 0]);
  // Both directions of winding fill: the same box drawn the other way round.
  const reversed = rasterise([{ type: 'M', x: 1.25, y: 1 }, { type: 'L', x: 1.25, y: 3 }, { type: 'L', x: 3.5, y: 3 },
    { type: 'L', x: 3.5, y: 1 }, { type: 'Z' }], 5, 4);
  assert.deepEqual([...reversed.coverage], [...r.coverage]);
  // A bar 0.4 pixels high between two rows' centres, which a centre test alone loses: dropout control
  // inks the row its middle falls in.
  const thin = rasterise(box(0, 1.6, 5, 2.0), 5, 4);
  assert.deepEqual([...thin.ink.slice(5, 10)], [1, 1, 1, 1, 1]);
  assert.equal(thin.ink.reduce((n, v) => n + v, 0), 5);
});

test('Oxanium is read from the repository\'s own copy of the typeface, and the dependency is pinned exactly', () => {
  assert.equal(oxanium('SemiBold').unitsPerEm, 1000);
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.dependencies['opentype.js'], '2.0.0');
});

test('every face\'s capitals, x-height, ascenders and descenders reach exactly the rows it states', () => {
  for (const name of LETTERING_FACES) {
    const face = oxaniumFace(name);
    const inked = (ch: string) => face.glyphs[ch]!.flatMap((row, y) => (row.includes('#') ? [y] : []));
    const top = (ch: string) => face.baseline - inked(ch)[0]! + 1;
    const bottom = (ch: string) => inked(ch).at(-1)! - face.baseline;
    const rows = OXANIUM_FACE_SPECS[name].rows;
    assert.deepEqual([top('H'), top('x'), top('d'), bottom('p')], [rows.cap, rows.x, rows.ascender, rows.descender], name);
    // Every glyph its cell high, a space its stated width, and the box one blank column past the ink.
    for (const ch of LETTERING_CHARACTERS) {
      assert.equal(face.glyphs[ch]!.length, face.cell, `${name} '${ch}'`);
      assert.equal(face.greys[ch]![0]!.length, face.glyphs[ch]![0]!.length, `${name} '${ch}'`);
      if (ch !== ' ') assert.ok(face.glyphs[ch]!.every((line) => line.endsWith('.')), `${name} '${ch}'`);
    }
    assert.equal(face.glyphs[' ']![0], '.'.repeat(face.space), name);
  }
});

test('what the renderer draws, the Harmony 650\'s nine faces\' and the Harmony One\'s five faces\' masks and grey levels, is the same bytes on every machine', () => {
  const digest = (faces: readonly (typeof LETTERING_FACES)[number][]): string => {
    const hash = createHash('sha256');
    for (const name of faces) {
      const face = oxaniumFace(name);
      for (const ch of LETTERING_CHARACTERS) hash.update(`${name} ${ch} ${face.glyphs[ch]!.join('/')} ${face.greys[ch]!.join('/')}\n`);
    }
    return hash.digest('hex').slice(0, 16);
  };
  assert.equal(digest(HARMONY_650_FACES), '3cc228b1b060c8fb');
  assert.equal(digest(HARMONY_ONE_FACES), 'e61e4a3c80d16c12');
});
