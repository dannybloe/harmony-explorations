/**
 * The Harmony 650's font table in our own letters, `todo-compile-650.md` 8.2, decisions 19 and 20.
 *
 * Three claims. Our letters are whole: nine faces, each holding every printable ASCII character on its
 * cell, coloured by two rules, and read back by an alphabet in which only `I` and `l` ever share a shape.
 * Logitech's font sets fall into those nine faces by measurement, on all 13 compiles, in the same counts.
 * And `withOxaniumFonts` re-letters all 13 with every text still reading the same character and the setup
 * unchanged, which `checkOxaniumFonts` reads back from the pixels and refuses when one glyph is off.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Container } from '../src/index.ts';
// Which faces a family letters in is the family's since `todo-compile-one.md` 3.3.3.5.
import { HARMONY_650_FACES } from '../src/families/four-slot/fonts.ts';
import { HARMONY_ONE_FACES } from '../src/families/touch/fonts.ts';
import { characterMap } from '../src/text.ts';
import { fontSets, glyphOf } from '../src/font.ts';
import { measureSet } from '../src/fonttable.ts';
import {
  FontTableError,
  LETTERING_CHARACTERS,
  LETTERING_FACES,
  OXANIUM_FACE_SPECS,
  oxaniumFace,
  checkOxaniumFonts,
  layOutContainer,
  letterRows,
  maskForm,
  oxaniumAlphabet,
  parse,
  screenStrings,
  takeApart,
  withOxaniumFonts} from '../src/index.ts';
import { FOUR_SLOT_CHOICES } from '../src/families/four-slot/choices.ts';
import { compareViews, setupView } from '../src/families/four-slot/compare.ts';

/** The inks our letters are drawn in, the four slot family's default, `todo-compile-650.md` 10.7.5. */
const INKS = FOUR_SLOT_CHOICES.letterInks;

const H650 = [
  'h650_config_region', 'h650_panasonic_config', 'h650_power_hold_compile', 'h650_power_hold_compile_2',
  'h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean',
  'h650_issue36_config',
] as const;

const containerOf = (name: string): Container => parse(load(name) as Uint8Array);

test('every face holds the 95 printable characters on its own cell, each ending on a blank column', () => {
  assert.equal(LETTERING_CHARACTERS.length, 95);
  assert.deepEqual(LETTERING_FACES, [...HARMONY_650_FACES, ...HARMONY_ONE_FACES]);
  assert.deepEqual(HARMONY_650_FACES, ['F15', 'F14W', 'F14', 'F13', 'F11', 'F10', 'R15', 'R14', 'R13']);
  assert.deepEqual(HARMONY_ONE_FACES, ['One16', 'One15', 'OneR15', 'One14', 'One11']);
  for (const face of LETTERING_FACES) {
    const { cell, glyphs } = oxaniumFace(face);
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
      const mask = (oxaniumFace(face).glyphs as Record<string, readonly string[]>)[ch]!;
      // Shadowed: the ink where the mask has ink, black exactly where the mask has ink one up and one
      // left and none here, and nothing anywhere else.
      letterRows(face, ch, 'shadowed', INKS).forEach((row, y) => row.forEach((p, x) => {
        const under = y > 0 && x > 0 && mask[y - 1]![x - 1] === '#';
        if (mask[y]![x] === '#') assert.equal(p, INKS.shadowed, `${face} '${ch}'`);
        else if (under) {
          assert.equal(p, INKS.shadow, `${face} '${ch}'`);
          shadows += 1;
        } else assert.equal(p, undefined, `${face} '${ch}'`);
      }));
      // Plain: the dark ink where the mask has ink, nothing else.
      letterRows(face, ch, 'plain', INKS).forEach((row, y) => row.forEach((p, x) => {
        assert.equal(p, mask[y]![x] === '#' ? INKS.plain : undefined, `${face} '${ch}' plain`);
      }));
    }
  }
  assert.ok(shadows > 0);
  assert.deepEqual([INKS.shadowed, INKS.plain, INKS.shadow], [0xffff, 0x2104, 0x0000]);
});

test('our alphabet tells every character apart by form but I from l in the weights decided in 8.2, and holds every weight', () => {
  // In the default weights, measured off the faces directly. 9 faces, 2 colourings, 94 characters with ink:
  // 1692, less 52 keys a character shares with itself across faces, which name one character, and 6 that
  // are `I` and `l` in one shape, in F11 and F10, and in R13 where F13's `I` is the same shape too. The faces
  // drawn in one weight share shapes since the weights were chosen by look (SemiBold for labels, Regular for
  // the three regular faces).
  const own = new Map<string, Set<string>>();
  for (const face of HARMONY_650_FACES) {
    for (const lettering of ['shadowed', 'plain'] as const) {
      for (const ch of LETTERING_CHARACTERS) {
        const form = maskForm(face, ch, lettering);
        if (form.includes('#')) (own.get(form) ?? own.set(form, new Set()).get(form)!).add(ch);
      }
    }
  }
  assert.equal(own.size, 1634);
  assert.deepEqual([...own.values()].filter((one) => one.size > 1).map((one) => [...one].sort().join('')), Array(6).fill('Il'));
  // The alphabet holds all seven weights of every face, 10.8.5, so a configuration in any is read. Across
  // weights more shapes are shared: `D` and `O`, `5` and `S`, and `!` with `I` and `l`, in the lightest and
  // heaviest cuts of the small faces; a code is still settled across the sets that draw it.
  // The Harmony One's five faces add 4150 forms and no new kind of pair, section 396.
  const forms = Object.values(oxaniumAlphabet().forms ?? {});
  assert.equal(forms.length, 10010);
  const shared: Record<string, number> = {};
  for (const one of forms) if (one.length > 1) shared[[...one].sort().join('')] = (shared[[...one].sort().join('')] ?? 0) + 1;
  assert.deepEqual(shared, { '!Il': 6, '5S': 12, DO: 10, Il: 16 });
});

test('withOxaniumFonts re-letters all 13 Harmony 650 compiles, every text reading the same, the setup unchanged',
     skipUnless(...H650), () => {
  const faces = new Map<string, number>();
  let added = 0;
  let glyphs = 0;
  for (const name of H650) {
    const original = containerOf(name);
    const made = withOxaniumFonts(takeApart(containerOf(name)), INKS);
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
  const made = withOxaniumFonts(takeApart(containerOf('harvest_650_two_devices')), INKS);
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
  const made = withOxaniumFonts(takeApart(containerOf('h650_test_config_clean')), INKS);
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
  assert.throws(() => withOxaniumFonts(takeApart(containerOf('h700_28_config_region')), INKS), /faces were measured on the Harmony 650's compiles alone/);
});

/**
 * Logitech's Harmony One compiles, one of each distinct container, section 395's nineteen: the faces were
 * measured on nine of them and hold on all nineteen, section 396 as corrected per review.
 */
const ONE_COMPILES = ['one_config', 'one_config_unprogrammed', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830',
  'calibration_one', 'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2',
  'compiled_protocols_3', 'harvest_one_two_devices', 'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3',
  'one_friend_asfound_config', 'one_friend_legacy_sync_config', 'phase7_before', 'phase7_after'] as const;

test('section 396: every font set of the nineteen Harmony One compiles is one of the One\'s five faces, on that face\'s rows, and every glyph names its character',
     skipUnless(...ONE_COMPILES), () => {
  const faces: Record<string, number> = {};
  // Per face, the rows Logitech's capitals start and end on, J and Q aside, whose tails go elsewhere.
  const rows: Record<string, Set<string>> = {};
  for (const name of ONE_COMPILES) {
    const c = containerOf(name);
    const map = characterMap(c)!;
    for (const set of fontSets(c)!) {
      const { face, ink } = measureSet(c, set, map);
      faces[face] = (faces[face] ?? 0) + 1;
      set.glyphs.forEach((address, k) => {
        if (address === undefined) return;
        // A glyph whose character nothing settles is one `withOxaniumFonts` cannot re-letter, which is why
        // `bin/alphabets.ts` names the shapes the first seeds never drew.
        const ch = map.codes.get(set.first + k);
        assert.ok(ch !== undefined, `${name}: code ${set.first + k}`);
        if (!/^[A-IK-PR-Z]$/.test(ch)) return;
        const inked = glyphOf(c, set, set.first + k)!.rows.flatMap((row, y) => (row.includes(ink) ? [y] : []));
        (rows[face] ??= new Set()).add(`${inked[0]}-${inked.at(-1)}`);
      });
    }
  }
  assert.deepEqual(faces, { One16: 19, One15: 34, OneR15: 19, One14: 190, One11: 70 });
  // One shape of row each, and the face's spec states the same rows: the cap height up from the baseline.
  assert.deepEqual(Object.fromEntries(Object.entries(rows).map(([face, seen]) => [face, [...seen]])),
    { One16: ['3-12'], One15: ['3-11'], OneR15: ['3-11'], One14: ['3-10'], One11: ['2-8'] });
  for (const face of HARMONY_ONE_FACES) {
    const spec = OXANIUM_FACE_SPECS[face];
    assert.equal(`${spec.baseline - spec.rows.cap + 1}-${spec.baseline}`, [...rows[face]!][0], face);
  }
});

test('section 396: eighteen of the nineteen Harmony One compiles lettered in ours read the same, each set read back as its face, and the Dutch one refused by name',
     skipUnless(...ONE_COMPILES), () => {
  let same = 0;
  for (const name of ONE_COMPILES) {
    const logitech = containerOf(name);
    if (name === 'one_friend_asfound_config') {
      // A friend's Dutch compile: `ë` and `é` are not in our letters, printable ASCII.
      assert.throws(() => withOxaniumFonts(takeApart(logitech), 'own'), /draws 'ë', which our letters do not have/);
      continue;
    }
    const made = withOxaniumFonts(takeApart(logitech), 'own');
    const out = parse(layOutContainer(made.layout).bytes);
    checkOxaniumFonts(out, made.faces);
    const read = characterMap(out)!;
    assert.equal(read.drawn.resolved, read.drawn.total, name);
    const texts = (c: Container): string[] => screenStrings(c).map((one) => one.text).sort();
    assert.deepEqual(texts(out), texts(logitech), name);
    // Our letters in the default weights measure as the face they stand for, stroke and all: a SemiBold 14
    // would read back as a regular 14, which no compile draws.
    fontSets(out)!.forEach((set, k) => assert.equal(measureSet(out, set, read).face, made.faces[k]!.face, `${name} set ${k}`));
    same += 1;
  }
  assert.equal(same, 18);
});

test('section 396: Logitech\'s Harmony One compile of the Denon and the LG lettered in ours, each set in its own colours, reads the same',
     skipUnless('harvest_one_two_devices'), () => {
  const logitech = containerOf('harvest_one_two_devices');
  const made = withOxaniumFonts(takeApart(logitech), 'own');
  const out = parse(layOutContainer(made.layout).bytes);
  assert.ok(out.allChecksPass);
  checkOxaniumFonts(out, made.faces);
  // Every set keeps the ink and the shadow Logitech drew it in: ten pairs over the One's compiles, where the
  // 650 family letters every set in one scheme.
  const map = characterMap(logitech)!;
  // The check above holds every glyph to `letterRows` in the inks a face records, so these are the colours drawn.
  assert.deepEqual(made.faces.map((one) => [one.inks!.shadowed, one.inks!.plain, one.lettering === 'shadowed' ? one.inks!.shadow : undefined]),
    fontSets(logitech)!.map((set) => { const was = measureSet(logitech, set, map); return [was.ink, was.ink, was.shadow]; }));
  assert.deepEqual(made.faces.map((one) => one.face), ['OneR15', 'One14', 'One14', 'One14', 'One14', 'One14', 'One11', 'One14',
    'One14', 'One14', 'One14', 'One15', 'One16', 'One14', 'One11', 'One11']);
  const read = characterMap(out)!;
  assert.equal(read.alphabet, 'oxanium');
  assert.equal(read.drawn.resolved, read.drawn.total);
  const texts = (c: Container): string[] => screenStrings(c).map((one) => one.text).sort();
  assert.deepEqual(texts(out), texts(logitech));
  assert.equal(made.added.length, 21);
  // No glyph shared between sets on the One, whose text routine is unread: 16 sets of 95 each.
  assert.equal(made.glyphs, 16 * 95);
});
