/**
 * Our letters blended into the colour they are drawn on, `todo-compile-650.md` 8.2.6.
 *
 * Four claims. The grey levels sit on the one bit letter's own box, so a blended text is placed exactly as a
 * one bit one. A blended pixel is the ink where the letter covers it, skipped where nothing does, and in
 * between otherwise, never an ink, so its structure is the same on every background and the alphabet reads
 * it by that. `withBlendedLetters` gives every text of all 13 Harmony 650 compiles, in state colours and our
 * letters, a copy of its set blended for the colour under it, with the setup and every word unchanged. And
 * `checkBlendedLetters`, which holds a copy's colour against the pixels of the result, refuses a text in a
 * copy for another colour and a copy with one glyph off.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import type { Container } from '../src/index.ts';
import {
  BLEND_DITHER_STEPS,
  FOUR_SLOT_CHOICES,
  LETTERING_CHARACTERS,
  LETTERING_FACES,
  oxaniumFace,
  UNDRAWN,
  checkBlendedLetters,
  compareViews,
  flatColour,
  layOutContainer,
  letterCoverage,
  letterRows,
  letterStructure,
  modePages,
  oxaniumAlphabet,
  parse,
  renderVariants,
  screenStrings,
  setupView,
  takeApart,
  withBlendedLetters,
  withOxaniumFonts,
  withStateBackgrounds,
} from '../src/index.ts';

/** The inks our letters are drawn in, the four slot family's default, `todo-compile-650.md` 10.7.5. */
const INKS = FOUR_SLOT_CHOICES.letterInks;

const H650 = [
  'h650_config_region', 'h650_panasonic_config', 'h650_power_hold_compile', 'h650_power_hold_compile_2',
  'h650_start_config', 'h650_options_config', 'h650_sequence_config', 'h650_favourites_config',
  'h650_assistant_off_config', 'h650_tilt_off_config', 'h650_test_config', 'h650_test_config_clean',
  'h650_issue36_config',
] as const;

const containerOf = (name: string): Container => parse(load(name) as Uint8Array);

/** Logitech's compile in our state colours and our one bit letters, and the faces its sets were given. */
function lettered(name: string): { c: Container; faces: ReturnType<typeof withOxaniumFonts>['faces'] } {
  const coloured = parse(layOutContainer(withStateBackgrounds(takeApart(containerOf(name)), FOUR_SLOT_CHOICES.stateColours, FOUR_SLOT_CHOICES.barColour).layout).bytes);
  const fonts = withOxaniumFonts(takeApart(coloured), INKS);
  return { c: parse(layOutContainer(fonts.layout).bytes), faces: fonts.faces };
}

/** Backgrounds a letter is blended into below: the decided state colours, the bench ones, white, dark grey, black and both inks. */
const BACKGROUNDS = [0xb107, 0x1138, 0x0446, 0xf800, 0x031f, 0xfc60, 0xffff, 0x2945, 0x0000, 0x2104];

test('the grey levels of every letter sit on its one bit box, sixteen levels a pixel', () => {
  for (const face of LETTERING_FACES) {
    const { glyphs, greys } = oxaniumFace(face);
    for (const ch of LETTERING_CHARACTERS) {
      const mask = (glyphs as Record<string, readonly string[]>)[ch]!;
      const grey = (greys as Record<string, readonly string[]>)[ch]!;
      assert.deepEqual(grey.map((row) => row.length), mask.map((row) => row.length), `${face} '${ch}'`);
      assert.ok(grey.every((row) => /^[.1-9a-f]*$/.test(row)), `${face} '${ch}'`);
    }
  }
  // The space covers nothing; a stroke covers its pixels whole where it sits on the pixel grid, the foot
  // of F15's `!`, and not where it does not, its tapering stem above.
  assert.ok(letterCoverage('F15', ' ').flat().every((v) => v === 0));
  assert.deepEqual(letterCoverage('F15', '!')[10], [0, 1, 12 / 15, 0]);
  assert.deepEqual(letterCoverage('F15', '!')[2], [0, 14 / 15, 11 / 15, 0]);
});

test('a blended pixel is the ink where covered, skipped where nothing is, otherwise between and never an ink', () => {
  for (const face of LETTERING_FACES) {
    for (const lettering of ['shadowed', 'plain'] as const) {
      for (const ch of LETTERING_CHARACTERS) {
        const v = letterCoverage(face, ch);
        const structure = letterStructure(letterRows(face, ch, lettering, INKS, BACKGROUNDS[0]), INKS);
        for (const background of BACKGROUNDS) {
          const rows = letterRows(face, ch, lettering, INKS, background);
          rows.forEach((row, y) => row.forEach((p, x) => {
            const shade = lettering === 'shadowed' && y > 0 && x > 0 ? v[y - 1]![x - 1]! : 0;
            const where = `${face} ${lettering} '${ch}' at ${x},${y} on ${background.toString(16)}`;
            if (v[y]![x] === 1) assert.equal(p, INKS[lettering], where);
            else if (v[y]![x] === 0 && shade === 0) assert.equal(p, undefined, where);
            else assert.ok(p !== undefined && p !== INKS.shadowed && p !== INKS.plain, where);
          }));
          assert.equal(letterStructure(rows, INKS), structure, `${face} ${lettering} '${ch}' on ${background.toString(16)}`);
        }
      }
    }
  }
  // By hand: the foot of F15's `!` covers 12 of 15 of the pixel right of its stem, no shadow over it since
  // the row above is the gap, on the bench orange 0xfc60, which the panel shows as rgb(255 142 0): white
  // times 0.8 plus orange times 0.2 is rgb(255 232 204).
  assert.equal(letterRows('F15', '!', 'shadowed', INKS, 0xfc60)[10]![2], (31 << 11) | (57 << 5) | 25);
});

test('our alphabet names a blended letter by its structure, which tells every character apart but eight pairs and triples in the three smallest faces', () => {
  const structures = Object.values(oxaniumAlphabet().structures ?? {});
  assert.equal(structures.length, 1675);
  // Drawn from the outlines, 10.8, fewer pixels of a thin stroke are covered whole than in the letters Pillow
  // hinted, and a structure is full coverage against any: so `!` is `I`, `]` is `}` and one `0` is a `9` in
  // F11, F10 and R13, where Pillow's left `I` and `l` alone. None is a misreading: a code is settled across
  // every set that draws it, the unblended set among them, and by its ASCII value, `characterMap`.
  assert.deepEqual(structures.filter((one) => one.length > 1).sort(), ['!I', '!I', '!Il', '!Il', '09', 'Il', ']}', ']}']);
});

test('flatColour takes a box of one colour, or dithered by one step, and nothing else', () => {
  assert.equal(BLEND_DITHER_STEPS, 1);
  assert.equal(flatColour([0x2945, 0x2945]), 0x2945);
  // The dark screens' second line: one step either way in every channel, the commonest colour taken.
  assert.equal(flatColour([0x2945, 0x2945, 0x2124, 0x2965, 0x2925]), 0x2945);
  assert.equal(flatColour([0x2945, 0x2945, 0x2985]), undefined);
  assert.equal(flatColour([0x2945, UNDRAWN]), undefined);
  assert.equal(flatColour([]), undefined);
});

test('withBlendedLetters blends every text of all 13 Harmony 650 compiles into the colour under it, the setup and every word unchanged',
     skipUnless(...H650), () => {
  const totals = { copies: 0, repointed: 0, kept: 0, glyphs: 0, strings: 0, checked: 0 };
  const backgrounds = new Map<number, number>();
  for (const name of H650) {
    const { c, faces } = lettered(name);
    const made = withBlendedLetters(takeApart(c), faces);
    const out = parse(layOutContainer(made.layout).bytes);
    assert.ok(out.allChecksPass, `${name}: the result fails its own checks`);
    assert.deepEqual(compareViews(setupView(out), setupView(containerOf(name))), [], `${name}: the setup changed`);
    const words = (one: Container): string[] => screenStrings(one).map((s) => s.text).sort();
    assert.deepEqual(words(out), words(c), `${name}: a text reads differently`);
    const checked = checkBlendedLetters(out, faces, made.blended);
    totals.copies += made.blended.length;
    totals.repointed += made.repointed;
    totals.kept += made.kept.notFlat + made.kept.twoColours + made.kept.unseen;
    totals.glyphs += made.glyphs;
    totals.strings += checked.strings;
    totals.checked += checked.glyphs;
    for (const one of made.blended) backgrounds.set(one.background, (backgrounds.get(one.background) ?? 0) + 1);
  }
  // No select is left on its one bit set: every text of every page sits on one colour, a dithered one included.
  assert.deepEqual(totals, { copies: 307, repointed: 16612, kept: 0, glyphs: 19190, strings: 31097, checked: 29165 });
  // The device, activity and idle colours, white under the bars' words, the dark start up and Off screens,
  // and black.
  assert.deepEqual(Object.fromEntries([...backgrounds].sort((a, b) => a[0] - b[0]).map(([k, n]) => [k.toString(16), n])),
    { 0: 32, 446: 20, 1138: 20, 2945: 79, b107: 117, ffff: 39 });
});

test('the check refuses Logitech\'s letters, a text in a copy for another colour and a copy with one glyph off',
     skipUnless('h650_test_config_clean'), () => {
  const { c, faces } = lettered('h650_test_config_clean');
  const made = withBlendedLetters(takeApart(c), faces);
  const out = parse(layOutContainer(made.layout).bytes);
  assert.throws(() => checkBlendedLetters(containerOf('h650_test_config_clean'), faces, made.blended), /does not read our letters/);
  // One select moved to a copy blended for another colour.
  const copies = new Map(made.blended.map((one) => [one.set, one]));
  let select: { at: number; to: number } | undefined;
  for (const page of modePages(out)) {
    renderVariants(out, page.program, 1, (text) => {
      const copy = copies.get(text.font);
      if (select !== undefined || copy === undefined || text.selectAt === undefined) return;
      const other = made.blended.find((one) => one.background !== copy.background);
      if (other !== undefined) select = { at: text.selectAt, to: other.set };
    });
    if (select !== undefined) break;
  }
  assert.ok(select !== undefined, 'a text is drawn in a copy');
  const moved = Uint8Array.from(out.blob);
  moved[select.at + 1] = select.to;
  assert.throws(() => checkBlendedLetters(parse(moved), faces, made.blended), /drawn in a set blended for/);
  // One pixel of one blended glyph given a colour none of the blends holds.
  const glyph = made.layout.sections[7]!.before.find((piece, k, all) => k > all.length - made.blended.length - made.glyphs
    && piece.owner === 'slot-7-glyph' && piece.bytes.length > 8)!;
  const bytes = Uint8Array.from(glyph.bytes);
  const literal = bytes.findIndex((b, k) => k > 0 && b > 0 && b < 0x80);
  bytes[literal + 1] = 0x12;
  glyph.bytes = bytes;
  assert.throws(() => checkBlendedLetters(parse(layOutContainer(made.layout).bytes), faces, made.blended), /is not .* blended for/);
});

test('a Harmony 700 compile is refused, since its fonts were not measured', skipUnless('h700_28_config_region'), () => {
  assert.throws(() => withBlendedLetters(takeApart(containerOf('h700_28_config_region')), []), /Harmony 650 alone/);
});
