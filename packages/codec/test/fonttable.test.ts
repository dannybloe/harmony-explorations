/**
 * The Harmony 650's font table in our own letters, `todo-compile-650.md` 8.2, decisions 19 and 20.
 *
 * Three claims. Our letters are whole: eight faces, each holding every printable ASCII character on its
 * cell, coloured by two rules, and read back by an alphabet in which only `I` and `l` ever share a shape.
 * Logitech's font sets fall into those eight faces by measurement, on all 13 compiles, in the same counts.
 * And `withOxaniumFonts` re-letters all 13 with every text still reading the same character and the setup
 * unchanged, which `checkOxaniumFonts` reads back from the pixels and refuses when one glyph is off.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Container } from '../src/index.ts';
import {
  FontTableError,
  LETTERING_CHARACTERS,
  LETTERING_FACES,
  LETTERING_INK,
  LETTERING_SHADOW,
  OXANIUM_FACES,
  checkOxaniumFonts,
  compareViews,
  layOutContainer,
  letterRows,
  oxaniumAlphabet,
  parse,
  screenStrings,
  setupView,
  takeApart,
  withOxaniumFonts,
} from '../src/index.ts';

const H650 = [
  'h650_config_region', 'h650_panasonic_config', 'h650_power_hold_compile', 'h650_power_hold_compile_2',
  'h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean',
  'h650_issue36_config',
] as const;

const containerOf = (name: string): Container => parse(load(name) as Uint8Array);

test('every face holds the 95 printable characters on its own cell, each ending on a blank column', () => {
  assert.equal(LETTERING_CHARACTERS.length, 95);
  assert.deepEqual(LETTERING_FACES, ['F15', 'F14W', 'F14', 'F13', 'F11', 'F10', 'R15', 'R14', 'R13']);
  for (const face of LETTERING_FACES) {
    const { cell, glyphs } = OXANIUM_FACES[face];
    for (const ch of LETTERING_CHARACTERS) {
      const mask = (glyphs as Record<string, readonly string[]>)[ch]!;
      assert.equal(mask.length, cell, `${face} '${ch}'`);
      // The trailing column is where the last ink column's shadow falls, and what spaces two letters.
      assert.ok(mask.every((row) => row.length === mask[0]!.length && row.endsWith('.')), `${face} '${ch}'`);
    }
  }
});

test('a shadowed letter is white over black one pixel down and right, a plain one dark and alone, in every face', () => {
  let shadows = 0;
  for (const face of LETTERING_FACES) {
    for (const ch of LETTERING_CHARACTERS) {
      const mask = (OXANIUM_FACES[face].glyphs as Record<string, readonly string[]>)[ch]!;
      // Shadowed: the ink where the mask has ink, black exactly where the mask has ink one up and one
      // left and none here, and nothing anywhere else.
      letterRows(face, ch, 'shadowed').forEach((row, y) => row.forEach((p, x) => {
        const under = y > 0 && x > 0 && mask[y - 1]![x - 1] === '#';
        if (mask[y]![x] === '#') assert.equal(p, LETTERING_INK.shadowed, `${face} '${ch}'`);
        else if (under) {
          assert.equal(p, LETTERING_SHADOW, `${face} '${ch}'`);
          shadows += 1;
        } else assert.equal(p, undefined, `${face} '${ch}'`);
      }));
      // Plain: the dark ink where the mask has ink, nothing else.
      letterRows(face, ch, 'plain').forEach((row, y) => row.forEach((p, x) => {
        assert.equal(p, mask[y]![x] === '#' ? LETTERING_INK.plain : undefined, `${face} '${ch}' plain`);
      }));
    }
  }
  assert.ok(shadows > 0);
  assert.deepEqual([LETTERING_INK.shadowed, LETTERING_INK.plain, LETTERING_SHADOW], [0xffff, 0x2104, 0x0000]);
});

test('our alphabet tells every character apart but I from l, which four faces draw alike', () => {
  const shapes = Object.values(oxaniumAlphabet().shapes);
  // 9 faces, 2 colourings, 94 characters with ink: 1692, less 18 keys a character shares with itself across
  // faces, which name one character, and 8 that are `I` and `l` in one shape, in F13, F11, F10 and R13.
  assert.equal(shapes.length, 1666);
  assert.deepEqual(shapes.filter((one) => one.length > 1), Array(8).fill('Il'));
});

test('withOxaniumFonts re-letters all 13 Harmony 650 compiles, every text reading the same, the setup unchanged',
     skipUnless(...H650), () => {
  const faces = new Map<string, number>();
  let added = 0;
  let glyphs = 0;
  for (const name of H650) {
    const original = containerOf(name);
    const made = withOxaniumFonts(takeApart(containerOf(name)));
    const out = parse(layOutContainer(made.layout).bytes);
    assert.ok(out.allChecksPass, `${name}: the result fails its own checks`);
    assert.deepEqual(compareViews(setupView(out), setupView(original)), [], `${name}: the setup changed`);
    // Same codes, so the same words: the text pass is what re-places them.
    const words = (c: Container): string[] => screenStrings(c).map((one) => one.text).sort();
    assert.deepEqual(words(out), words(original), `${name}: a text reads differently`);
    const checked = checkOxaniumFonts(out, made.faces);
    assert.equal(checked.glyphs, 95 * checked.sets, name);
    // One face in one colouring draws a character once, whichever sets point at it.
    assert.equal(made.glyphs, 95 * new Set(made.faces.map((one) => `${one.face} ${one.lettering}`)).size, name);
    glyphs += made.glyphs;
    for (const one of made.faces) {
      const key = `${one.face} ${one.lettering}`;
      faces.set(key, (faces.get(key) ?? 0) + 1);
    }
    added += made.added.length;
  }
  // The same tally as Logitech's measured faces in `work/fonts-8-2/faces.ts`: 39 sets on the bars, plain.
  assert.deepEqual(Object.fromEntries([...faces].sort()), {
    'F10 shadowed': 13, 'F11 shadowed': 14, 'F13 shadowed': 25, 'F14 plain': 39, 'F14 shadowed': 39,
    'F14W shadowed': 26, 'F15 shadowed': 13, 'R13 shadowed': 1, 'R14 shadowed': 39, 'R15 shadowed': 26,
  });
  assert.equal(added, 19 * 10 + 20 * 2 + 21);
  // Nine pairs of a face and a colouring on twelve compiles, ten on the one holding the regular 13 pixel Help set.
  assert.equal(glyphs, 95 * (9 * 12 + 10));
});

test('the rule holds out of sample: a fourteenth Harmony 650 compile, two devices and no activity, re-letters and checks',
     skipUnless('harvest_650_two_devices'), () => {
  const made = withOxaniumFonts(takeApart(containerOf('harvest_650_two_devices')));
  const out = parse(layOutContainer(made.layout).bytes);
  assert.ok(out.allChecksPass);
  assert.deepEqual(checkOxaniumFonts(out, made.faces), { sets: 18, glyphs: 18 * 95 });
  // The same twelve groups as the 13, one set each but F14 plain, R14, R15, F14W, F13 and F14 more.
  assert.deepEqual(made.faces.map((one) => one.face + (one.lettering === 'plain' ? ' plain' : '')).sort(), [
    'F10', 'F11', 'F13', 'F13', 'F14', 'F14', 'F14', 'F14 plain', 'F14 plain', 'F14 plain', 'F14W', 'F14W',
    'F15', 'R14', 'R14', 'R14', 'R15', 'R15']);
});

test('the check refuses Logitech\'s own letters and one glyph of ours changed', skipUnless('h650_test_config_clean'), () => {
  const logitech = containerOf('h650_test_config_clean');
  const made = withOxaniumFonts(takeApart(containerOf('h650_test_config_clean')));
  assert.throws(() => checkOxaniumFonts(logitech, made.faces), /does not read our letters/);
  // The first glyph piece is some character of one face, shared by every set of that face and colouring;
  // make one of its pixels `0x12` in its high byte, a colour none of our letters holds.
  const glyph = made.layout.sections[7]!.before[0]!;
  const bytes = Uint8Array.from(glyph.bytes);
  const literal = bytes.findIndex((b, k) => k > 0 && b > 0 && b < 0x80);
  bytes[literal + 1] = 0x12;
  glyph.bytes = bytes;
  const out = parse(layOutContainer(made.layout).bytes);
  assert.throws(() => checkOxaniumFonts(out, made.faces), FontTableError);
});

test('a Harmony 700 compile is refused, since its fonts were not measured', skipUnless('h700_28_config_region'), () => {
  assert.throws(() => withOxaniumFonts(takeApart(containerOf('h700_28_config_region'))), /Harmony 650 alone/);
});
