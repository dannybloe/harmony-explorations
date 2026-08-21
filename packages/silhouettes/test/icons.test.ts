/**
 * The shared symbol set, and the measurement that sizes it.
 *
 * `extentOf` is the part worth testing hard, because it decides how big every mark on every drawing
 * comes out and it got the arcs wrong once: the power ring is drawn as one arc whose curve reaches
 * well past its own endpoints, and taking only endpoints reported it as half its real height, so the
 * mark was scaled up and overflowed its key. The controls below are shapes whose extent is known
 * without measuring anything.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ICONS, extentOf, MODELS } from '../src/index.ts';
import type { Icon } from '../src/icons.ts';

test('every symbol a drawing asks for exists', () => {
  for (const [id, model] of Object.entries(MODELS)) {
    for (const key of model.keys) {
      if (key.icon === undefined) continue;
      assert.ok(ICONS[key.icon], `${id}: ${key.name} wants a symbol called ${key.icon}`);
    }
  }
});

test('the extent of a full circle is its diameter, whichever way it is drawn', () => {
  // The control the arc solver exists for. A circle of radius r has an extent of 2r however it is cut
  // into arcs, and taking endpoints alone gets every one of these wrong.
  const r = 0.6;
  const twoHalves: Icon = { parts: [{
    d: `M ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 Z`, mode: 'fill' }] };
  const oneBigArc: Icon = { parts: [{
    d: `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r}`, mode: 'stroke' }] };
  for (const [what, icon, w, h] of [
    ['two halves', twoHalves, 2 * r, 2 * r],
    // A half circle from top to bottom, bulging right: full height, half the width.
    ['one half circle', oneBigArc, r, 2 * r],
  ] as const) {
    const e = extentOf(icon);
    assert.ok(Math.abs(e.w - w) < 1e-6, `${what}: width ${e.w} against ${w}`);
    assert.ok(Math.abs(e.h - h) < 1e-6, `${what}: height ${e.h} against ${h}`);
  }
});

test('the power ring is measured round its curve and not across its ends', () => {
  // The case that refuted the first version. Its two endpoints span 1.0 across and 0.8 down; the ring
  // itself is 1.5 by 1.66, because the arc has radius 0.75 and hangs below the chord.
  const e = extentOf(ICONS.power!);
  assert.ok(Math.abs(e.w - 1.5) < 0.01, `width ${e.w}`);
  assert.ok(e.h > 1.6, `height ${e.h}: the endpoints alone would say 0.8`);
});

test('a symbol that is one stroke has no extent across itself', () => {
  // `dash` and `dashVertical` are a single line, and a plain zero divides into infinity when a mark is
  // scaled to fit a key. So the axis it does not occupy comes back effectively zero and the other one
  // is what binds.
  //
  // The lengths are exact, not a floor. A floor of one passes on any of these and on a mark half the
  // size, and the value is a property of the path a few lines away, so it moves in a diff.
  //
  // `minus` used to be here and is now a filled bar, so the pair below is what says the two cases are
  // still distinguishable: a bar that carries its own weight has a real extent on both axes, and if it
  // ever loses one the scaling silently falls back to the other. Its own thickness is measured off the
  // Harmony 525's photograph, per the note in `icons.ts`.
  const ALONG: Readonly<Record<string, { w: number; h: number }>> = {
    dash: { w: 1.8, h: 0 },
    dashVertical: { w: 0, h: 1.6 },
  };
  const ACROSS: Readonly<Record<string, { w: number; h: number }>> = {
    minus: { w: 2, h: 0.264 },
    plus: { w: 2, h: 1.806 },
  };
  for (const [name, want] of [...Object.entries(ALONG), ...Object.entries(ACROSS)]) {
    const e = extentOf(ICONS[name]!);
    assert.ok(Math.abs(e.w - want.w) < 1e-3, `${name}: width ${e.w} against ${want.w}`);
    assert.ok(Math.abs(e.h - want.h) < 1e-3, `${name}: height ${e.h} against ${want.h}`);
  }
});

test('every symbol fits in a box of about the unit square', () => {
  for (const [name, icon] of Object.entries(ICONS)) {
    const e = extentOf(icon);
    // A mark much bigger than the box is not wrong, since everything is scaled to its own extent, but
    // it means the drawing is not in the coordinates the rest of the file uses, which is worth
    // catching: it makes a stroke width chosen for the box come out wrong.
    assert.ok(e.w <= 2.05 && e.h <= 2.05, `${name}: ${e.w.toFixed(2)} by ${e.h.toFixed(2)}`);
    assert.ok(e.w > 0 && e.h > 0, `${name}: no extent at all`);
  }
});

test('the two ends of a volume rocker print different marks', () => {
  // On a Harmony 600 the louder end has waves and the quieter end does not, and that difference is the
  // only thing telling the two halves apart. Two versions of this test have now been wrong in the same
  // direction: the symbol set once drew both ends the same, and then the test compared `icon` names
  // after the marks had started coming from the traced drawing, where `icon` is unset on both and the
  // assertion passed on undefined against undefined.
  const plain = extentOf(ICONS.speaker!);
  const waves = extentOf(ICONS.speakerWaves!);
  assert.ok(waves.w > plain.w * 1.4, 'the waves make the louder mark wider');
  for (const [id, model] of Object.entries(MODELS)) {
    const up = model.keys.find((k) => k.name === 'VolumeUp');
    const down = model.keys.find((k) => k.name === 'VolumeDown');
    if (up === undefined || down === undefined) continue;
    // Whichever route the marks came from, the two ends have to differ. A traced key states paths and a
    // drawn one states a symbol name, and a key with neither is a key with nothing printed on it.
    const mark = (k: typeof up) => (k.marks ?? [k.icon ?? '']).join(' ');
    assert.notEqual(mark(up), mark(down), `${id}: the two ends must not print the same mark`);
    assert.notEqual(mark(up), '', `${id}: the louder end prints nothing at all`);
    // And the louder end is the one with more of them, since the waves are separate strokes.
    if (up.marks !== undefined && down.marks !== undefined) {
      assert.ok(up.marks.length > down.marks.length,
        `${id}: ${up.marks.length} marks against ${down.marks.length}`);
    }
  }
});

test('only a marking whose colour is the button identity carries an accent', () => {
  for (const [id, model] of Object.entries(MODELS)) {
    const accented = model.keys.filter((k) => k.accent !== undefined).map((k) => k.name).sort();
    // The teletext keys and nothing else: four identical light pills where the colour is all there is
    // to tell them apart. The record dot is red too, but that red is the same on every model, so it
    // lives in the palette rather than on the key.
    const expected = model.keys.some((k) => k.name === 'Red')
      ? ['Blue', 'Green', 'Red', 'Yellow'] : [];
    assert.deepEqual(accented, expected, `${id}: an accent has spread beyond the colour keys`);
  }
});
