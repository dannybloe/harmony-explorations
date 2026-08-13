/**
 * Drawing a screen the way the remote draws it, `docs/findings.md` section 129.
 *
 * The point of a renderer here is that it fails differently from every other test in this package: a
 * reader test says a number came back, and a rendered page says the number puts the label where the
 * label goes. So these tests assert the things a picture would reveal, mechanically, rather than
 * asserting that rendering returned something.
 *
 * **No screen is committed and no label is quoted.** The images belong to the config owners; what is
 * asserted here is geometry, coverage and the pixel order.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless, skipWithoutLab, require_ } from '@harmony/lab';
import {
  GLYPH_ADVANCE,
  SCREEN_DRAW_IMAGE,
  SCREEN_SIZES,
  UNDRAWN,
  bitmapAt,
  bitmapPixels,
  bitmapReference,
  characterMap,
  IMAGE_PACKED_PAPER,
  fontSets,
  glyphOf,
  glyphs,
  modePages,
  parse,
  reachablePrograms,
  renderPage,
  renderPages,
  renderVariants,
  screenStrings,
  screenSwitch,
  describeChoices,
} from '../src/index.ts';
/**
 * The whole corpus, safe mode containers included, since those are the counterexamples that have
 * caught two picture readers already, sections 78 and 85.
 */
const SAMPLES = [
  'one_safemode', 'one34_region2', 'h700_gspm', 'h600_safemode_gspm', 'h650_safemode_gspm',
  'one_config', 'one_config_unprogrammed', 'one_spare_before_sync', 'one_spare_after_sync',
  'h600_config', 'h700_config', 'h700_config_2',
  'h525_config', 'h525_config_2', 'h525_safemode_ahcm',
  'arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d',
  'arch8_config_880', 'arch8_config_885',
];

/** The arch 9 members, which draw no picture from a program at all, so some claims skip them. */
const ARCH9_SAMPLES = ['h525_config', 'h525_config_2', 'h525_safemode_ahcm'];

/**
 * The containers that are nobody's configuration: a factory config packed inside a firmware image and
 * four safe mode containers. None draws a full screen background, so none states a display size, which
 * is why the display size claim is about user configs and not about the corpus.
 */
const NO_FULL_SCREEN_PICTURE = [
  'one_safemode', 'one34_region2', 'h700_gspm', 'h600_safemode_gspm', 'h650_safemode_gspm',
];

test('every page of every config draws with nothing left unresolved', skipWithoutLab(), () => {
  // The coverage claim, and it is a strong one because it is not a share: over every mode page of every
  // container in the corpus, no picture the program names fails to decode and no glyph code is missing
  // from the font the program selected. A renderer is where a wrong extent or a wrong first glyph code
  // finally has nowhere to hide, since it has to produce pixels rather than a count.
  let pages = 0;
  let missing = 0;
  const architectures = new Set<number>();
  for (const name of SAMPLES) {
    const data = require_(name);
    const c = parse(data);
    if (SCREEN_SIZES[c.architecture ?? -1] === undefined) continue;
    architectures.add(c.architecture as number);
    for (const rendered of renderPages(c)) {
      assert.ok(rendered !== undefined, `${name} has a page that did not render`);
      pages += 1;
      missing += rendered.picturesMissing + rendered.glyphsMissing;
    }
  }
  assert.ok(pages > 1500, `only ${pages} pages rendered`);
  assert.equal(missing, 0, 'no picture and no glyph is unresolvable');
  assert.deepEqual([...architectures].sort((a, b) => a - b), [8, 9, 12, 14]);
});

test('a pixel is big endian, and the little endian reading draws a rainbow', skipWithoutLab(), () => {
  // Section 129's one measured claim, as a number rather than as a look at a picture. An icon is smooth:
  // neighbouring pixels are close in colour. Reading a pixel's two bytes the wrong way round moves the
  // green field across the red and the blue ones, so neighbours a single step apart in green come out
  // differing wildly in hue, which is what a Harmony One's glossy buttons looked like before this.
  //
  // **Most pictures cannot tell the two apart**, and saying so is the point: a picture drawn only in
  // `0x0000` and `0xffff` reads the same either way, and the 600's do. So the count is over the ones
  // that decide, and among those the stored order is smoother in every case bar two, both on the
  // near monochrome 600 whose whole picture set uses 30 distinct colours.
  const channels = (value: number): [number, number, number] => [
    ((value >> 11) & 0x1f) << 3, ((value >> 5) & 0x3f) << 2, (value & 0x1f) << 3,
  ];
  const roughness = (rows: (number | undefined)[][], swap: boolean): number => {
    let total = 0;
    let pairs = 0;
    for (const row of rows) {
      for (let x = 1; x < row.length; x += 1) {
        const left = row[x - 1];
        const right = row[x];
        if (left === undefined || right === undefined) continue;
        const order = (value: number): number => (swap ? ((value & 0xff) << 8) | (value >> 8) : value);
        const a = channels(order(left));
        const b = channels(order(right));
        total += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
        pairs += 1;
      }
    }
    return pairs === 0 ? 0 : total / pairs;
  };

  let stored = 0;
  let swappedWins = 0;
  const architectures = new Set<number>();
  for (const name of SAMPLES) {
    const data = require_(name);
    const c = parse(data);
    // Arch 9 stores one bit a pixel, so it has no byte order to get wrong.
    if (c.architecture === 9 || SCREEN_SIZES[c.architecture ?? -1] === undefined) continue;
    let pictures = 0;
    for (const [, instructions] of reachablePrograms(c)) {
      for (const instruction of instructions) {
        if (instruction.opcode !== SCREEN_DRAW_IMAGE) continue;
        const named = bitmapReference(instruction);
        const picture = named === undefined ? undefined : bitmapAt(c, named);
        if (picture === undefined || picture.stride < 16) continue;
        const rows = bitmapPixels(c, picture);
        if (rows === undefined || rows.length === 0) continue;
        pictures += 1;
        const asStored = roughness(rows, false);
        const asSwapped = roughness(rows, true);
        if (asStored < asSwapped) stored += 1;
        else if (asSwapped < asStored) swappedWins += 1;
        if (asStored !== asSwapped) architectures.add(c.architecture as number);
        // Forty per container is plenty for a claim this one sided, and it keeps the test quick.
        if (pictures >= 40) break;
      }
      if (pictures >= 40) break;
    }
  }
  assert.ok(stored + swappedWins > 80, `only ${stored + swappedWins} pictures decide the question`);
  assert.ok(stored > 20 * swappedWins,
    `the stored order wins ${stored} and loses ${swappedWins}`);
  assert.deepEqual([...architectures].sort((a, b) => a - b), [8, 12, 14], 'on every architecture');
});

test('the display size is the size of the config\'s own full screen pictures', skipWithoutLab(), () => {
  // Where `SCREEN_SIZES` comes from. A config draws its own backgrounds, so the widest picture any
  // program draws at the origin is the display, and the same number turns up in hundreds of pictures
  // per container. This is the test that would fail first if a new architecture were added by guess.
  let checked = 0;
  const skipped: string[] = [];
  for (const name of SAMPLES) {
    const data = require_(name);
    const c = parse(data);
    const size = SCREEN_SIZES[c.architecture ?? -1];
    if (size === undefined) { skipped.push(name); continue; }
    let widest = 0;
    let tallest = 0;
    for (const [, instructions] of reachablePrograms(c)) {
      for (const instruction of instructions) {
        if (instruction.opcode !== SCREEN_DRAW_IMAGE) continue;
        const named = bitmapReference(instruction);
        const picture = named === undefined ? undefined : bitmapAt(c, named);
        if (picture === undefined) continue;
        widest = Math.max(widest, (instruction.operands[0] ?? 0) + picture.stride);
        tallest = Math.max(tallest, (instruction.operands[1] ?? 0) + picture.rows);
      }
    }
    // Arch 9 draws no picture from a program at all, so it has nothing to say here.
    if (widest === 0) { skipped.push(name); continue; }
    assert.equal(widest, size.width, `${name} draws ${widest} pixels across`);
    assert.equal(tallest, size.height, `${name} draws ${tallest} pixels down`);
    checked += 1;
  }
  // How many actually reached the assertions, which nothing stated: two `continue`s stand above them,
  // one for an architecture with no recorded screen size and one for a container that draws no picture
  // from a program, so the whole test could have run past every sample.
  // **Which samples reach the assertions, named rather than counted**, because two `continue`s stand
  // above them and nothing said so: the test could have run past every sample and still reported a
  // pass. Measured on 13 August 2026, 13 of 21 reach it, and the eight that do not split into two
  // groups with different reasons, which is why the set is asserted and not the number.
  assert.deepEqual(skipped.sort(), [...NO_FULL_SCREEN_PICTURE, ...ARCH9_SAMPLES].sort(),
    'a different set of samples skipped the display size check than the two reasons account for');
  assert.equal(checked, SAMPLES.length - skipped.length);
});

test('the space between letters belongs to the glyph, not to the pen', skipWithoutLab(), () => {
  // `GLYPH_ADVANCE` is the one constant a renderer needs that no reader did, and a page looks plausible
  // whether it is nought or one, so it is measured twice, section 129.
  //
  // First from the glyphs. A glyph's last column is background in most of them, drawn as paper rather
  // than skipped, which is the gap between letters sitting inside the width.
  const blankLastColumn = (name: string): { blank: number; total: number } => {
    const c = parse(load(name) as Uint8Array);
    let blank = 0;
    let total = 0;
    for (const set of glyphs(c) ?? []) {
      for (const glyph of set) {
        if (glyph === undefined || glyph.width < 2) continue;
        total += 1;
        const background = glyph.rows.every((row) => {
          const pixel = row[glyph.width - 1];
          return pixel === undefined || pixel === 0x0000 || pixel === IMAGE_PACKED_PAPER;
        });
        if (background) blank += 1;
      }
    }
    return { blank, total };
  };
  for (const name of ['h525_config', 'arch8_config_880', 'h600_config']) {
    if (load(name) === undefined) continue;
    const { blank, total } = blankLastColumn(name);
    assert.ok(blank / total > 0.5, `${name}: only ${blank} of ${total} glyphs end in a blank column`);
  }

  // Then from the display, which is the sharper half: a remote does not draw text off its own edge, so
  // an advance that is too wide shows up as strings running past it. The generator wraps a label that
  // does not fit, section 124, which is why this is a property and not a coincidence.
  const c = parse(load('one_config') as Uint8Array);
  const map = characterMap(c);
  const sets = fontSets(c) ?? [];
  assert.ok(map !== undefined);
  // The map runs code to character, so it is inverted here rather than in `text.ts`, where nothing
  // needs the other direction.
  const codeOf = new Map([...map.codes].map(([code, character]) => [character, code]));
  const overflowing = (advance: number): number => {
    let over = 0;
    for (const one of screenStrings(c, map)) {
      if (one.text.trim().length < 2 || one.unread > 0) continue;
      const set = sets[one.font];
      if (set === undefined) continue;
      let pen = one.x;
      for (const character of one.text) {
        const code = codeOf.get(character);
        const glyph = code === undefined ? undefined : glyphOf(c, set, code);
        if (glyph !== undefined) pen += glyph.width + advance;
      }
      if (pen > (SCREEN_SIZES[12]?.width ?? 0)) over += 1;
    }
    return over;
  };
  assert.equal(GLYPH_ADVANCE, 0);
  assert.equal(overflowing(GLYPH_ADVANCE), 0, 'no string passes the edge of the display');
  assert.ok(overflowing(1) > 20, 'and one extra column would push dozens off it');
});

test('a page that draws a background leaves no pixel undrawn', skipUnless('h600_config'), () => {
  // The check on the coordinates. A Harmony 600 page draws a full screen picture first and then its
  // text, so if the origin or the row order were wrong the raster would keep a band of `UNDRAWN` at an
  // edge. Every one of that config's pages covers the display exactly.
  const c = parse(load('h600_config') as Uint8Array);
  let covered = 0;
  for (const page of modePages(c)) {
    const rendered = renderPage(c, page);
    if (rendered === undefined || rendered.pictures === 0) continue;
    const undrawn = rendered.raster.pixels.reduce((n, value) => n + (value === UNDRAWN ? 1 : 0), 0);
    assert.equal(undrawn, 0, `a page with a background left ${undrawn} pixels undrawn`);
    covered += 1;
  }
  assert.ok(covered > 100, `only ${covered} pages draw a background`);
});

test('a page with a branch has one variant per arm, and variant 0 is what renderPage draws',
  skipUnless('one_config'), () => {
    // Section 129's variant walk. Two claims, and the second is the one that keeps the two entry
    // points honest: the number of appearances follows the arms of the switches met, and the first
    // variant is byte for byte the raster `renderPage` produces, since it takes the first arm of each.
    const c = parse(load('one_config') as Uint8Array);
    let branching = 0;
    for (const [index, page] of modePages(c).entries()) {
      const rendered = renderPage(c, page);
      if (rendered === undefined) continue;
      const { variants, truncated } = renderVariants(c, page.program);
      assert.ok(variants.length >= 1, `page ${index} has no variant at all`);
      assert.deepEqual([...(variants[0]?.page.raster.pixels ?? [])], [...rendered.raster.pixels],
        `page ${index}: variant 0 is not the page as drawn`);
      if (rendered.branches === 0) {
        assert.equal(variants.length, 1, `page ${index} does not branch, so it has one appearance`);
        assert.deepEqual(variants[0]?.choices, []);
        continue;
      }
      branching += 1;
      assert.ok(variants.length > 1, `page ${index} branches but has one variant`);
      assert.equal(truncated, false, `page ${index} should not need the cap`);
      // Every variant of a one switch page states the condition that selects it, and no two agree.
      const conditions = variants.map((one) => describeChoices(c, one.choices).join('; '));
      assert.equal(new Set(conditions).size, conditions.length, `page ${index} repeats a condition`);
      for (const one of variants) {
        assert.equal(one.choices.length, rendered.branches);
        for (const choice of one.choices) assert.ok(choice.arms > 1);
      }
    }
    assert.ok(branching >= 30, `only ${branching} pages branch, so this proved little`);
  });

test('the arms of a switch are the values that select them', skipWithoutLab(), () => {
  // `screenSwitch` reads the same bytes the program walk measures, so the two must agree about how
  // many arms there are and where each goes. That is what stops a condition being attached to the
  // wrong screen: the label comes from one reading and the target from the other.
  let switches = 0;
  for (const name of SAMPLES) {
    const data = require_(name);
    const c = parse(data);
    for (const [, instructions] of reachablePrograms(c)) {
      for (const instruction of instructions) {
        const decoded = screenSwitch(instruction);
        if (decoded === undefined) continue;
        switches += 1;
        assert.deepEqual(decoded.cases.map((one) => one.target), instruction.targets);
        for (const one of decoded.cases) {
          if (one.value !== undefined) continue;
          assert.ok((one.from as number) <= (one.to as number), 'a range runs upwards');
        }
      }
    }
  }
  assert.ok(switches > 100, `only ${switches} switches in the corpus`);
});
