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
  SCREEN_DRAW_IMAGE_AT,
  SCREEN_SIZES,
  UNDRAWN,
  BITMAP_ENCODED,
  BITMAP_NOTHING,
  bitmapAt,
  bitmapPixels,
  bitmapReference,
  pictureReference,
  characterMap,
  contactSheetPng,
  IMAGE_PACKED_PAPER,
  fontSets,
  glyphOf,
  glyphs,
  modePages,
  namedContentEnd,
  parse,
  pictureBank,
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

/**
 * The arch 9 (Harmony 525) members.
 *
 * **They used to be here because they "draw no picture from a program at all"**, which was the reader's
 * limitation and not the containers': every picture on a Harmony 525 is named by screen opcode 3, and
 * this file only looked at opcode 2. Section 148. They are no longer an exception to the display size
 * claim, which is why nothing below skips them any more, and the list is kept because it is what names
 * the architecture whose pictures are one bit per pixel.
 */
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
  assert.equal(pages, 3530, 'every mode page in the corpus renders');
  assert.equal(missing, 0, 'no picture and no glyph is unresolvable');
  assert.deepEqual([...architectures].sort((a, b) => a - b), [8, 9, 12, 14]);
});

test('every instruction that names a picture draws one, on every architecture that emits it',
  skipWithoutLab(), () => {
  /**
   * **The claim the test above cannot make**, and the reason this one exists.
   *
   * "Nothing left unresolved" counts `picturesMissing`, which the renderer increments for a picture it
   * looked for and could not decode. An instruction the renderer never looks at contributes nothing to
   * that number, so for a month it reported zero while a rendered Harmony 525 (arch 9) page was missing
   * every picture in it: screen opcode 3 names a picture exactly as opcode 2 does and the draw loop only
   * knew opcode 2. Section 148. A reader that never looks cannot report an absence.
   *
   * So this counts the naming instructions independently, by walking the programs, and asserts the
   * renderer's own tally equals it. The two numbers come from different code and a skipped opcode makes
   * them differ, which is exactly what would have failed a month ago.
   *
   * Per architecture rather than per corpus, because the whole shape of the mistake was that one
   * architecture was silently at zero while the total looked healthy: arch 12 (Harmony One) emits no
   * opcode 3 at all, so a corpus total is dominated by architectures the gap did not touch.
   */
  const drawn = new Map<number, number>();
  const named = new Map<number, number>();
  for (const name of SAMPLES) {
    const c = parse(require_(name));
    const architecture = c.architecture ?? -1;
    if (SCREEN_SIZES[architecture] === undefined) continue;

    // What the programs name, counted by walking them. `renderPages` follows one arm of each switch,
    // so the population has to be the pages it actually renders rather than every reachable program,
    // or the two numbers would differ for a reason that has nothing to do with an opcode.
    let tally = 0;
    for (const rendered of renderPages(c)) {
      if (rendered === undefined) continue;
      tally += rendered.pictures + rendered.picturesMissing;
    }
    drawn.set(architecture, (drawn.get(architecture) ?? 0) + tally);

    let counted = 0;
    for (const [, instructions] of reachablePrograms(c)) {
      for (const instruction of instructions) {
        if (pictureReference(instruction) !== undefined) counted += 1;
      }
    }
    named.set(architecture, (named.get(architecture) ?? 0) + counted);
  }

  // Every architecture is present and none is at zero, which is the guard against the whole loop
  // silently doing nothing: a `continue` above it could have skipped every sample.
  assert.deepEqual([...drawn.keys()].sort((a, b) => a - b), [8, 9, 12, 14]);
  for (const [architecture, count] of drawn) {
    assert.ok(count > 0, `arch ${architecture} drew no picture at all, which is the bug this catches`);
    // Not an equality against `named`: the renderer walks one arm per switch and `reachablePrograms`
    // walks all of them, so a branching program names more than one rendering draws. What must hold is
    // that the renderer reaches a share of them, and that no architecture is at zero while its
    // containers name thousands. Arch 9 was at zero against 2255 named.
    const total = named.get(architecture) ?? 0;
    assert.ok(count <= total,
      `arch ${architecture} drew ${count} pictures where its programs name ${total}`);
  }

  // And both figures exactly, so a reader that starts skipping an opcode again moves a number somebody
  // reads rather than passing quietly. Measured 22 August 2026.
  assert.deepEqual([...named].sort((a, b) => a[0] - b[0]),
    [[8, 8244], [9, 2255], [12, 2819], [14, 2287]],
    'pictures named by a program, per architecture');
  assert.deepEqual([...drawn].sort((a, b) => a[0] - b[0]),
    [[8, 8147], [9, 2255], [12, 1673], [14, 2271]],
    'pictures a rendering actually draws, per architecture');
  // **Arch 9 is where the two are equal**, and that is the tightest form the claim takes: a Harmony 525
  // config has no branching screen program, so every picture its programs name is one a rendering
  // draws, with nothing to explain away. It was 0 against 2255 before opcode 3 was drawn. Elsewhere the
  // gap is the arms `renderPages` does not take, which is why the equality is asserted here and a
  // bound everywhere else.
  assert.equal(drawn.get(9), named.get(9), 'on arch 9 every named picture is a drawn picture');
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
  // Exact, not a floor of 80: both numbers are decided by the corpus and by the cap of forty above,
  // so a container dropping out of the sampling moves them and a reader losing a picture kind does
  // too. The ratio below is then the claim rather than the measurement.
  assert.equal(stored, 283, 'pictures the stored byte order draws more smoothly');
  assert.equal(swappedWins, 2, 'and the ones the swapped order does, which is why this is a ratio');
  assert.ok(stored > 20 * swappedWins,
    `the stored order wins ${stored} and loses ${swappedWins}`);
  assert.deepEqual([...architectures].sort((a, b) => a - b), [8, 12, 14], 'on every architecture');
});

test('the display size is the size of the config\'s own full screen pictures', skipWithoutLab(), () => {
  // Where `SCREEN_SIZES` comes from. A config draws its own backgrounds, so the widest picture any
  // program draws at the origin is the display, and the same number turns up in hundreds of pictures
  // per container. This is the test that would fail first if a new architecture were added by guess.
  let checked = 0;
  let agreed = 0;
  const skipped: string[] = [];
  for (const name of SAMPLES) {
    const data = require_(name);
    const c = parse(data);
    const size = SCREEN_SIZES[c.architecture ?? -1];
    if (size === undefined) { skipped.push(name); continue; }
    // **Both picture opcodes, and they are two independent statements of one number.** Opcode 2 gives
    // it as an origin plus the picture's own dimensions; opcode 3 states the destination rectangle
    // outright, so its width and height are read from the instruction and not from what it points at.
    // Section 148. Reading only opcode 2 is why arch 9 (Harmony 525) had nothing to say here.
    let widest = 0;
    let tallest = 0;
    let widest3 = 0;
    let tallest3 = 0;
    for (const [, instructions] of reachablePrograms(c)) {
      for (const instruction of instructions) {
        if (instruction.opcode === SCREEN_DRAW_IMAGE) {
          const named = bitmapReference(instruction);
          const picture = named === undefined ? undefined : bitmapAt(c, named);
          if (picture === undefined) continue;
          widest = Math.max(widest, (instruction.operands[0] ?? 0) + picture.stride);
          tallest = Math.max(tallest, (instruction.operands[1] ?? 0) + picture.rows);
        } else if (instruction.opcode === SCREEN_DRAW_IMAGE_AT) {
          widest3 = Math.max(widest3, (instruction.operands[0] ?? 0) + (instruction.operands[4] ?? 0));
          tallest3 = Math.max(tallest3, (instruction.operands[1] ?? 0) + (instruction.operands[5] ?? 0));
        }
      }
    }
    // A container that draws no picture from any program has nothing to say, which is the four safe
    // mode containers and the factory config inside a firmware image.
    if (widest === 0 && widest3 === 0) { skipped.push(name); continue; }
    assert.equal(Math.max(widest, widest3), size.width, `${name} draws that many pixels across`);
    assert.equal(Math.max(tallest, tallest3), size.height, `${name} draws that many pixels down`);
    checked += 1;
    // Where both opcodes are present the two routes have to give the same answer, which is the
    // calibration: arch 8 (Harmony 880) and arch 14 (Harmony 600 and 700) know their size from opcode
    // 2 already, so opcode 3 agreeing there is what makes it trustworthy on arch 9, where it is the
    // only witness.
    if (widest > 0 && widest3 > 0) {
      assert.equal(widest3, widest, `${name}: the two picture opcodes disagree about the width`);
      assert.equal(tallest3, tallest, `${name}: the two picture opcodes disagree about the height`);
      agreed += 1;
    }
  }
  assert.equal(agreed, 9, 'containers where both opcodes state the display size and agree');
  // How many actually reached the assertions, which nothing stated: two `continue`s stand above them,
  // one for an architecture with no recorded screen size and one for a container that draws no picture
  // from a program, so the whole test could have run past every sample.
  // **Which samples reach the assertions, named rather than counted**, because two `continue`s stand
  // above them and nothing said so: the test could have run past every sample and still reported a
  // pass. Measured on 13 August 2026, 13 of 21 reach it, and the eight that do not split into two
  // groups with different reasons, which is why the set is asserted and not the number.
  // **Arch 9 is no longer one of the reasons**, which is section 148's consequence here: its three
  // containers state their own 96 by 64 through opcode 3, so the only samples left out are the five
  // that draw no picture from any program at all.
  assert.deepEqual(skipped.sort(), [...NO_FULL_SCREEN_PICTURE].sort(),
    'a different set of samples skipped the display size check than the one reason accounts for');
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
  // The negative control, exact: one extra column per glyph pushes 38 strings off the display. A
  // control's magnitude is evidence, so it is asserted rather than bounded.
  assert.equal(overflowing(1), 38, 'and one extra column would push dozens off it');
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
  assert.equal(covered, 254, 'pages that draw a background');
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
    assert.equal(branching, 36, 'pages of `one_config` that branch');
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
  assert.equal(switches, 214, 'switches in the corpus');
});

test('the length walk and the pixel walk agree about every picture', skipWithoutLab(), () => {
  // `bitmapAt` walks a picture to compute a length and `bitmapPixels` walks it to produce pixels,
  // three forms each, and nothing tied them: section 85's monochrome row padding had to be applied
  // in both by hand. Two right copies is the state that precedes two diverging ones, and no test
  // could see it. Section 139.
  //
  // Three ties, because a wrong copy could pass any one of them: the row count, every row's length,
  // and for the encoded form the row breaks the length walk counted on its way past.
  //
  // **What this cannot see is a byte offset inside a row**, which is what section 85's monochrome
  // padding is: both walks emit `stride` pixels a row either way, so `Math.floor` for `Math.ceil` in
  // either copy leaves every count here intact. That half is caught by the bank walk in
  // `screen.test.ts`, which stops landing on the trailer. Controls run for both, and stated here
  // because a tie test that is assumed to cover everything is the failure this whole entry is about.
  let pictures = 0;
  let monochrome = 0;
  for (const name of SAMPLES) {
    const c = parse(require_(name));
    for (const b of pictureBank(c, namedContentEnd(c)) ?? []) {
      const pixels = bitmapPixels(c, b);
      assert.notEqual(pixels, undefined, `${name} 0x${b.address.toString(16)} does not draw`);
      // Kind 2 is a firmware RETURN off arch 9 (Harmony 525), so it draws nothing there by design
      // and there is no geometry to compare. On arch 9 it is the monochrome form and is compared.
      if (b.kind === BITMAP_NOTHING && c.architecture !== 9) {
        assert.deepEqual(pixels, [], `${name} 0x${b.address.toString(16)} draws where it should not`);
        continue;
      }
      if (b.kind === BITMAP_NOTHING) monochrome += 1;
      pictures += 1;
      assert.equal((pixels ?? []).length, b.rows, `${name} 0x${b.address.toString(16)} row count`);
      for (const row of pixels ?? []) {
        assert.equal(row.length, b.stride, `${name} 0x${b.address.toString(16)} row width`);
      }
      if (b.kind !== BITMAP_ENCODED) continue;
      assert.equal((pixels ?? []).length, (b.rowBreaks as number) + 1,
        `${name} 0x${b.address.toString(16)} row breaks`);
    }
  }
  // The exact population, not a floor: it moves when a reader changes or a sample is added, and
  // then it moves in the diff. The monochrome count is stated separately because it is the form
  // section 85 corrected and the one a single container carries an odd width of.
  assert.equal(pictures, 558);
  assert.equal(monochrome, 13);
});

test('a contact sheet refuses rasters of mixed sizes rather than drawing them wrong', () => {
  // The grid was laid out from the first raster's size and every tile then copied at its **own**
  // size, so a wider raster wrote across the tile beside it and a taller one past the end of the
  // buffer. Only reachable by putting two architectures in one sheet, which no caller does, and the
  // failure is a silently wrong picture rather than an error. Constructed, since the corpus renders
  // one container at a time. Section 139.
  const raster = (width: number, height: number) =>
    ({ width, height, pixels: new Int32Array(width * height).fill(0x1234) });
  const same = [raster(20, 10), raster(20, 10), raster(20, 10)];
  assert.notEqual(contactSheetPng(same, 2), undefined);
  assert.equal(contactSheetPng([...same, raster(21, 10)], 2), undefined, 'a wider tile');
  assert.equal(contactSheetPng([...same, raster(20, 11)], 2), undefined, 'a taller tile');
  // The first raster decides, so a mismatch in position 0 is the same refusal seen from the other
  // side rather than a different rule.
  assert.equal(contactSheetPng([raster(21, 10), ...same], 2), undefined);
  assert.equal(contactSheetPng([], 2), undefined, 'and an empty sheet is still nothing');
});
