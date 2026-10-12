/**
 * Letters rendered in the codec, `todo-compile-650.md` 10.8: the rasteriser's coverage and ink on shapes
 * whose answer is known, and the nine faces drawn from Oxanium's outlines measured against the letters
 * Pillow drew and 8.2 approved, `oxanium.ts`. The renderer does not hint, so the two differ; these pin by
 * how much, so a change to the renderer that moves the count is seen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import {
  LETTERING_CHARACTERS,
  LETTERING_FACES,
  OXANIUM_FACE_SPECS,
  oxanium,
  rasterise,
  renderFace,
  type PathCommand,
} from '../src/index.ts';
import { OXANIUM_FACES as PILLOW_FACES } from '../src/oxanium.ts';

const box = (x0: number, y0: number, x1: number, y1: number): PathCommand[] =>
  [{ type: 'M', x: x0, y: y0 }, { type: 'L', x: x1, y: y0 }, { type: 'L', x: x1, y: y1 }, { type: 'L', x: x0, y: y1 }, { type: 'Z' }];

test('the rasteriser covers a rectangle exactly, inks the pixels whose centres it holds, and keeps a stroke thinner than a pixel', () => {
  // From (1.25, 1) to (3.5, 3): a quarter of column 1 and half of column 3 covered on two whole rows.
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

test('the face table states what the generated letters were drawn with, field for field', () => {
  for (const face of LETTERING_FACES) {
    const { glyphs: _g, greys: _r, ...was } = PILLOW_FACES[face];
    const { rows: _rows, ...now } = OXANIUM_FACE_SPECS[face];
    assert.deepEqual(now, was, face);
  }
});

test('Oxanium is read from the repository\'s own copy of the typeface, and the dependency is pinned exactly', () => {
  assert.equal(oxanium('SemiBold').unitsPerEm, 1000);
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.dependencies['opentype.js'], '2.0.0');
});

test('the nine faces rendered from the outlines: every capital, small letter and digit on the approved rows but the dots of i and j and the tail of Q, the same mask on 414 of 855 letters, a column narrower or wider on 33', () => {
  let same = 0;
  let width = 0;
  const heights: string[] = [];
  for (const face of LETTERING_FACES) {
    const made = renderFace(OXANIUM_FACE_SPECS[face], LETTERING_CHARACTERS);
    const approved = PILLOW_FACES[face];
    for (const ch of LETTERING_CHARACTERS) {
      const a = approved.glyphs[ch as keyof typeof approved.glyphs] as readonly string[];
      const b = made.glyphs[ch]!;
      if (a.join('/') === b.join('/')) same += 1;
      if (a[0]!.length !== b[0]!.length) width += 1;
      // The rows a letter's ink spans, which the fitting to the face's rows is for.
      const span = (rows: readonly string[]) => rows.flatMap((r, y) => (r.includes('#') ? [y] : []));
      const [sa, sb] = [span(a), span(b)];
      if (sa[0] !== sb[0] || sa.at(-1) !== sb.at(-1)) heights.push(`${face} ${ch}`);
    }
  }
  assert.equal(same, 414);
  assert.equal(width, 33);
  // What sits between the heights a face states moves a row: symbols, the dot of an i or a j, the tail of a Q.
  const alphanumeric = heights.filter((one) => /[A-Za-z0-9]$/.test(one));
  assert.deepEqual(alphanumeric, ['F14 i', 'F14 j', 'F13 Q', 'F13 i', 'F13 j', 'F11 Q', 'F10 Q', 'R15 i', 'R15 j', 'R13 Q']);
  assert.equal(heights.length, 121);
});
