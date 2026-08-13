/**
 * The screen language and the font table, ported from Python for milestone M2.
 *
 * **The port proves itself by arithmetic rather than by golden vectors.** `docs/findings.md`
 * section 40 states 18252 programs across the corpus and section 46 states 3933 glyphs, and both
 * numbers were produced by `src/harmony/gspm.py`. This suite reaches the same two totals from an
 * independent implementation, which is a stronger check than a vector file because the numbers
 * were published before the port existed.
 *
 * They are also the closures the readings rest on. Screen instructions are variable length with no
 * length field anywhere, so one wrong operand count desynchronises the walk and the next byte read
 * as an opcode is almost certainly not one of the eleven. A glyph whose rows do not come to
 * exactly its declared width means the same.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless, skipWithoutLab, require_ } from '@harmony/lab';
import {
  BITMAP_HEADER,
  BITMAP_NOTHING,
  BITMAP_RAW,
  PIXEL_BYTES,
  GLYPH_FIRST_CODE_DEFAULT,
  IMAGE_ARCHITECTURES,
  IMAGE_PACKED_ARCHITECTURES,
  IMAGE_PACKED_INK,
  IMAGE_PACKED_PAPER,
  PICTURE_BANK_BIAS,
  SCREEN_CALL,
  SCREEN_CALL_TARGET_ARCHITECTURES,
  SCREEN_OPERANDS_BY_ARCHITECTURE,
  SCREEN_FIXED_OPERANDS,
  SCREEN_SELECT_FONT,
  bitmapAt,
  bitmaps,
  namedContentEnd,
  SECTION_ITEM_SIZE,
  SECTION_TABLE_OFFSET,
  TOUCH_MAP_SLOT,
  archSlot,
  pictureBank,
  pictureBankStart,
  pictureRun,
  fontSets,
  glyphAt,
  glyphOf,
  glyphs,
  modeProgramRoots,
  parse,
  reachablePrograms,
  screenProgram,
  modePages,
  modeRecords,
  screenProgramRoots,
  valueMaps,
} from '../src/index.ts';
import type { Glyph } from '../src/index.ts';

/** `[sample, reachable programs, decoded glyphs]`. Same walk as `tests/test_interpreter.py`. */
const DECODED: readonly [string, number, number][] = [
  ['h700_config', 6620, 553],
  ['h700_config_2', 6620, 553],
  ['h600_config', 4544, 463],
  ['h525_config', 157, 160],
  ['h525_config_2', 111, 143],
  ['one_config', 1013, 501],
  ['one_config_unprogrammed', 586, 405],
  ['arch8_config_a', 394, 397],
  ['arch8_config_b', 427, 299],
  ['arch8_config_c', 463, 312],
  ['arch8_config_d', 463, 312],
  // Zero before section 53. A safe mode container has 35 modes and no base slot 11 table, so
  // every program it holds is reached through a mode record.
  ['h600_safemode_gspm', 35, 46],
  ['h700_gspm', 35, 46],
  ['h650_safemode_gspm', 35, 46],
  // The arch 9 safe mode container, whose 79 glyphs are the ASCII of section 78. 48 programs
  // until section 85 corrected opcode 22's width: the 49th is the one the old reading walked off,
  // and it is the only program in the corpus that selects fonts 1 and 2.
  ['h525_safemode_ahcm', 49, 79],
];

/**
 * What the Python implementation reports. 18252, 3933 and 16054 when this port landed; the first
 * and third moved with section 53, which made a mode record's own screen program a root and so
 * reached 1629 programs nothing had reached before, and again with section 66, which added the
 * program each of a mode's pages states outright: 20374 and 41793 before it. The glyph total
 * moved once, by section 63's 160 arch 9 glyphs; it does not move with the programs, because
 * glyphs come from base slot 7 and not from the programs that draw them.
 *
 * **This list had drifted from Python's and nothing said so**, because both sides pin their own
 * totals: `h525_config_2` joined the Python corpus and not this one, and the two files then agreed
 * with themselves and not with each other. So the list is the same fifteen samples as
 * `lab.CONTAINERS` and the three totals are the numbers `tests/test_interpreter.py` asserts.
 */
const CORPUS_PROGRAMS = 21552;
const CORPUS_GLYPHS = 4315;
const CORPUS_STRING_CODES = 58083;

for (const [name, programs, glyphCount] of DECODED) {
  test(`${name} decodes ${programs} programs and ${glyphCount} glyphs`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    assert.equal(reachablePrograms(c).size, programs, 'reachable screen programs');
    assert.equal(
      (glyphs(c) ?? []).reduce((n, set) => n + set.length, 0),
      glyphCount,
      'decoded glyphs',
    );
  });

  test(`${name} decodes every program it can reach`, skipUnless(name), () => {
    // Not the same claim as the count. A program that fails to decode is dropped by
    // `reachablePrograms`, so the count alone would not notice; this asks every root and every
    // target directly.
    const c = parse(load(name) as Uint8Array);
    const found = reachablePrograms(c);
    for (const [address, program] of found) {
      assert.ok(program.length > 0, `empty program at ${address}`);
      for (const instruction of program) {
        for (const target of instruction.targets) {
          if (target === 0) continue;
          assert.ok(found.has(target), `unreachable target ${target} from ${address}`);
        }
      }
    }
  });

  test(`${name} glyphs are exactly their set's declared height`, skipUnless(name), () => {
    // The closure that corrected section 46: the set header's first byte is the glyph height, not
    // a slot count. Every glyph agreeing with it is what says so.
    const c = parse(load(name) as Uint8Array);
    const sets = fontSets(c);
    const pictures = glyphs(c);
    // Asserted rather than returned. `if (sets === undefined || pictures === undefined) return;` used
    // to stand here, so a container the readers could not open at all passed the height closure, and
    // every sample in this loop is one that has fonts: a container without them belongs out of the
    // list rather than silently past the assertions.
    assert.ok(sets !== undefined && pictures !== undefined, `${name} has font sets to check`);
    assert.ok(sets.length > 0, `${name} declares at least one font set`);
    let checked = 0;
    for (let i = 0; i < sets.length; i += 1) {
      const font = sets[i] as (typeof sets)[number];
      const decoded: Glyph[] = pictures[i] ?? [];
      for (const picture of decoded) {
        assert.equal(picture.rows.length, font.height, `glyph at ${picture.address}`);
        for (const row of picture.rows) assert.equal(row.length, picture.width);
        checked += 1;
      }
    }
    assert.ok(checked > 0, `${name} decoded no glyph, so the height closure checked nothing`);
  });
}

test('the set header byte below the height is the first glyph code', skipWithoutLab(), () => {
  // Section 78. Every container Logitech's generator produced starts its sets at code 1, which is
  // exactly why the byte read as a constant for so long. The one that does not is in the list
  // rather than excluded from it, and asserted to be the exception: a corpus that agrees with
  // itself is what hid this field.
  for (const [name] of DECODED) {
    const data = require_(name);
    for (const font of fontSets(parse(data)) ?? []) {
      if (name === 'h525_safemode_ahcm') {
        assert.ok(font.first === 32 || font.first === 72, `${name} at ${font.address}`);
        continue;
      }
      assert.equal(font.first, GLYPH_FIRST_CODE_DEFAULT, `${name} at ${font.address}`);
    }
  }
});

test('the count offset is not an architecture property', skipUnless('one_safemode'), () => {
  // The claim section 78 corrected, as the two arch 12 containers that disagree about it. Keying
  // the count on the architecture cut the One's safe mode font from 46 glyphs to one, and with it
  // 5437 bytes of an 8902 byte container.
  const safe = parse(load('one_safemode') as Uint8Array);
  const font = (fontSets(safe) ?? [])[0];
  assert.equal(safe.architecture, 12);
  assert.deepEqual([font?.countAt, font?.count], [2, 46]);
  const user = require_('one_config');
  const other = (fontSets(parse(user)) ?? [])[0];
  assert.equal(other?.countAt, 1, 'the same architecture, the other shape');
});

test('the arch 9 safe mode container ships exactly the ASCII its own strings use',
  skipUnless('h525_safemode_ahcm'), () => {
    // The sample that settled the field, and the closure that settled it: the font table and the
    // screen programs are independent structures, and under this reading they agree exactly.
    const c = parse(load('h525_safemode_ahcm') as Uint8Array);
    const sets = fontSets(c) ?? [];
    assert.deepEqual(sets.map((f) => [f.first, f.count]), [[32, 91], [32, 90], [72, 50], [32, 90]]);
    const used = new Map<number, Set<number>>();
    for (const [, program] of reachablePrograms(c)) {
      let selected: number | undefined;
      for (const instruction of program) {
        if (instruction.opcode === SCREEN_SELECT_FONT && instruction.operands.length > 0) {
          selected = instruction.operands[0];
        }
        if (instruction.glyphs === undefined || selected === undefined) continue;
        const codes = used.get(selected) ?? new Set<number>();
        for (const code of instruction.glyphs) codes.add(code);
        used.set(selected, codes);
      }
    }
    // All four sets are used, which they were not until section 85: the program the eleven byte
    // reading of opcode 22 walked off is the one that selects fonts 1 and 2.
    assert.deepEqual([...used.keys()].sort((a, b) => a - b), [0, 1, 2, 3]);
    // Glyphs present against glyphs drawn, per set. Font 0 ships exactly what it draws; the other
    // three ship a handful more, and `H` is spare in all three of them.
    const spare: Record<number, number[]> = { 0: [], 1: [72, 121], 2: [72, 97, 121], 3: [72] };
    for (const [selected, codes] of used) {
      const font = sets[selected] as (typeof sets)[number];
      const present = new Set(font.glyphs.map((a, i) => (a === undefined ? -1 : font.first + i)));
      assert.deepEqual([...present].filter((code) => code >= 0 && !codes.has(code)).sort((a, b) => a - b),
        spare[selected], `font ${selected} ships more than its strings use`);
      for (const code of codes) {
        assert.ok(present.has(code), `code ${code} of font ${selected} has no glyph`);
        assert.ok(code >= 32 && code < 127, `code ${code} is not ASCII`);
        assert.notEqual(glyphOf(c, font, code), undefined, `code ${code} does not decode`);
      }
      // And the reading section 46 published runs the codes off the end of the set.
      assert.ok(Math.max(...codes) - GLYPH_FIRST_CODE_DEFAULT >= font.glyphs.length);
    }
  });

test(`the corpus decodes ${CORPUS_PROGRAMS} programs, as Python reports`, skipWithoutLab(), () => {
  let total = 0;
  let counted = 0;
  for (const [name] of DECODED) {
    const data = require_(name);
    counted += 1;
    total += reachablePrograms(parse(data)).size;
  }
  assert.equal(counted, DECODED.length, 'the total is only meaningful over the whole corpus');
  assert.equal(total, CORPUS_PROGRAMS);
});

test(`the corpus decodes ${CORPUS_GLYPHS} glyphs, as Python reports`, skipWithoutLab(), () => {
  let total = 0;
  let counted = 0;
  for (const [name] of DECODED) {
    const data = require_(name);
    counted += 1;
    total += (glyphs(parse(data)) ?? []).reduce((n, set) => n + set.length, 0);
  }
  assert.equal(counted, DECODED.length, 'the total is only meaningful over the whole corpus');
  assert.equal(total, CORPUS_GLYPHS);
});

test(`the corpus resolves ${CORPUS_STRING_CODES} inline string codes, as Python reports`,
  skipWithoutLab(), () => {
    // Section 46's third closure, and the one the wrong header reading made look impossible.
    // Opcode 16 selects a font by a zero based index and it stays selected for the rest of the
    // program, so a string before any select is drawn with nothing and is not counted. Same rule
    // as tools/screen_dump.py and as tests/test_interpreter.py, which is what makes the total
    // comparable.
    let codes = 0;
    for (const [name] of DECODED) {
      const data = require_(name);
      const c = parse(data);
      if (c.architecture === undefined || !IMAGE_ARCHITECTURES.has(c.architecture)) continue;
      const sets = fontSets(c);
      if (sets === undefined) continue;
      for (const [, program] of reachablePrograms(c)) {
        let selected: number | undefined;
        for (const instruction of program) {
          if (instruction.opcode === SCREEN_SELECT_FONT && instruction.operands.length > 0) {
            selected = instruction.operands[0];
          }
          if (instruction.glyphs === undefined || instruction.glyphs.length === 0) continue;
          if (selected === undefined || selected >= sets.length) continue;
          const font = sets[selected] as (typeof sets)[number];
          for (const code of instruction.glyphs) {
            assert.notEqual(glyphOf(c, font, code), undefined, `${name}: code ${code}`);
            codes += 1;
          }
        }
      }
    }
    assert.equal(codes, CORPUS_STRING_CODES);
  });

test('a program at an address outside the container does not decode', skipUnless('h600_config'), () => {
  const c = parse(load('h600_config') as Uint8Array);
  assert.equal(screenProgram(c, c.endAddr + 1), undefined);
  assert.equal(screenProgram(c, 0), undefined);
});

test('a glyph whose rows do not close is refused rather than truncated', skipUnless('h600_config'), () => {
  // The decoder returns nothing rather than a partial bitmap, because a partial one hides the
  // misread that produced it. Cutting a real glyph short is the cheapest way to exercise that.
  const c = parse(load('h600_config') as Uint8Array);
  const sets = glyphs(c) ?? [];
  const first: { address: number } | undefined = sets[0]?.[0];
  assert.notEqual(first, undefined, 'expected at least one glyph to cut short');
  assert.equal(glyphAt(c, (first as { address: number }).address, 2), undefined);
});

test('the roots come from base slots 11, 14 and 6, and from a mode page', skipUnless('h600_config'), () => {
  const c = parse(load('h600_config') as Uint8Array);
  const roots = screenProgramRoots(c);
  const fromTable = c.pointerArray(11) ?? [];
  const fromMaps = (valueMaps(c) ?? []).flatMap((m) => [
    ...m.entries.map(([, target]) => target),
    ...m.ranges.map(([, , target]) => target),
  ]);
  const fromModes = modeProgramRoots(c);
  const fromPages = modePages(c);
  assert.ok(fromTable.length > 0, 'slot 11 supplies roots');
  assert.ok(fromMaps.length > 0, 'slot 14 supplies roots');
  assert.ok(fromModes.length > 0, 'slot 6 supplies roots, section 53');
  assert.ok(fromPages.length > 0, "slot 6's pages supply roots, section 66");
  assert.equal(
    roots.length,
    fromTable.length + fromMaps.length + fromModes.length + fromPages.length,
  );
});

test('opcode 22 is the one opcode whose width is per architecture', () => {
  // Three on arch 12, from the firmware, where it is a call and opcode 23 is its return. **One** on
  // arch 9, from the corpus, where it selects a row. It stays out of the shared table because a
  // single width there would be wrong on one of the two. Sections 54, 64 and 85.
  assert.equal(SCREEN_FIXED_OPERANDS[SCREEN_CALL], undefined);
  assert.equal(SCREEN_OPERANDS_BY_ARCHITECTURE[12]?.[SCREEN_CALL], 3);
  assert.equal(SCREEN_OPERANDS_BY_ARCHITECTURE[9]?.[SCREEN_CALL], 1);
  // Only the arch 12 one transfers control; arch 9's address is a picture, not a program.
  assert.deepEqual([...SCREEN_CALL_TARGET_ARCHITECTURES], [12]);
  assert.equal(SCREEN_FIXED_OPERANDS[23], 0);
});

/**
 * `[sample, distinct opcode 2 targets, highest offset any other known structure reaches]`.
 *
 * findings.md section 49. Opcode 2 is the only known referent of the region that holds most of a
 * config, and the pairing is what says so: every target above every other structure, in every
 * container that has any, and no region at all in the two kinds that emit no opcode 2.
 */
const REGION: readonly [string, number, number][] = [
  ['h700_config', 22, 0x052c5f],
  ['h600_config', 16, 0x043aa7],
  ['one_config', 98, 0x048bc6],
  ['one_config_unprogrammed', 70, 0x01de24],
  ['arch8_config_a', 30, 0x025eba],
  ['h525_config', 0, 0x011fd0],
  ['h600_safemode_gspm', 0, 0x000879],
];

/** Where opcode 2's address sits: five operands, two of position then three of address. */
const SCREEN_DRAW_FROM_ADDRESS = 2;

for (const [name, count, ceiling] of REGION) {
  test(`${name}: opcode 2 addresses ${count} places, all above everything named`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const targets = new Set<number>();
    for (const [, program] of reachablePrograms(c)) {
      for (const instruction of program) {
        if (instruction.opcode !== SCREEN_DRAW_FROM_ADDRESS) continue;
        if (instruction.operands.length < 5) continue;
        const at = instruction.operands.length - 3;
        const address =
          (instruction.operands[at] as number) |
          ((instruction.operands[at + 1] as number) << 8) |
          ((instruction.operands[at + 2] as number) << 16);
        targets.add(address);
      }
    }
    assert.equal(targets.size, count, 'distinct opcode 2 targets');
    for (const address of targets) {
      const off = c.blobOffsetOf(address);
      assert.notEqual(off, undefined, `target ${address} is outside the container`);
      assert.ok(
        (off as number) > ceiling,
        `target at 0x${(off as number).toString(16)} is not above 0x${ceiling.toString(16)}`,
      );
    }
  });
}

/**
 * `[sample, pictures, kinds, strides, row counts]`, mirroring `tests/test_interpreter.py`.
 * findings.md section 50.
 *
 * The numbers are small on purpose: this is also the measurement that says opcode 2 does **not**
 * explain the unreached region of section 49. Sixteen pictures of 125 to 885 bytes account for
 * under two kilobytes of a container where the region runs to hundreds of them.
 */
const BITMAPS: readonly [string, number, number[], number[], number[]][] = [
  // Strides 128 and 64 appear only through a mode record's own program, section 53, and they are
  // where the large pictures are: one is 16389 bytes against 125 for an icon.
  ['h700_config', 22, [0, 1], [12, 128], [10, 128]],
  ['h600_config', 16, [0, 1], [12, 128], [10, 128]],
  // Section 66 took arch 12 from 28 to 98 by making the program a mode's pages state a root,
  // which is where the One does its screen drawing.
  ['one_config', 98, [0, 1],
    [20, 22, 42, 47, 51, 61, 62, 69, 81, 87, 88, 98, 133, 147, 162, 163, 164, 176],
    [10, 11, 18, 33, 42, 48, 50, 52, 58, 62, 69, 80, 83, 85, 89, 91, 96, 114, 220]],
  ['arch8_config_a', 30, [0, 1], [15, 16, 17, 18, 19, 64, 128], [8, 10, 32, 160]],
  // Arch 9 emits no opcode 2 at all and neither does a safe mode container, which is what says
  // the pictures are optional rather than structural.
  ['h525_config', 0, [], [], []],
  ['h600_safemode_gspm', 0, [], [], []],
];

for (const [name, count, kinds, strides, rows] of BITMAPS) {
  test(`${name} addresses ${count} pictures, all of which decode`, skipUnless(name), () => {
    const c = parse(load(name) as Uint8Array);
    const found = bitmaps(c);
    assert.equal(found.length, count);
    const uniq = (xs: number[]): number[] => [...new Set(xs)].sort((a, b) => a - b);
    assert.deepEqual(uniq(found.map((b) => b.kind)), kinds);
    assert.deepEqual(uniq(found.map((b) => b.stride)), strides);
    assert.deepEqual(uniq(found.map((b) => b.rows)), rows);
    for (const bitmap of found) {
      if (bitmap.kind === BITMAP_RAW) {
        assert.equal(bitmap.length, BITMAP_HEADER + PIXEL_BYTES * bitmap.stride * bitmap.rows);
        assert.equal(bitmap.rowBreaks, undefined);
      } else {
        // The closure the encoded extent rests on: the body discards the header and then breaks
        // rows exactly as many times as the header said, which is two independent statements of
        // one number. A walk one control byte out of step would agree with neither.
        assert.equal(bitmap.rowBreaks, bitmap.rows - 1);
      }
      const off = c.blobOffsetOf(bitmap.address) as number;
      assert.ok(off + (bitmap.length as number) <= c.blob.length);
    }
  });
}

test('the pictures tile the region', skipUnless('h600_config'), () => {
  // The closure on the extent, and the correction of an earlier negative. `stride` is in pixels
  // and a pixel is two bytes, so section 50's byte reading halved every raw extent and made the
  // pictures look as though they did not tile. They do.
  const c = parse(load('h600_config') as Uint8Array);
  const pictures = bitmaps(c).sort((a, b) => a.address - b.address);
  let exact = 0;
  for (let k = 0; k + 1 < pictures.length; k += 1) {
    const here = pictures[k] as { address: number; length: number };
    if (here.address + here.length === (pictures[k + 1] as { address: number }).address) exact += 1;
  }
  assert.equal(pictures.length, 16);
  assert.equal(exact, 14);
});

test('a kind above the three the firmware knows is refused', skipUnless('h600_config'), () => {
  // Kind 2 is a bare RETURN in the renderer, so it is valid and draws nothing; three and up are
  // not reached at all. A reader that accepted them would invent a picture out of whatever bytes
  // followed.
  const c = parse(load('h600_config') as Uint8Array);
  const first = bitmaps(c).reduce((a, b) => (b.address < a.address ? b : a));
  const off = c.blobOffsetOf(first.address) as number;
  const copy = parse(load('h600_config') as Uint8Array);
  copy.blob[off] = BITMAP_NOTHING;
  assert.equal(bitmapAt(copy, first.address)?.kind, BITMAP_NOTHING);
  copy.blob[off] = BITMAP_NOTHING + 1;
  assert.equal(bitmapAt(copy, first.address), undefined);
});

/** `[sample, pictures in the bank, bytes]`. findings.md section 55. */
const BANK: readonly [string, number, number][] = [
  ['one_config', 98, 1361283],
  ['one_config_unprogrammed', 70, 1102735],
  ['h600_config', 18, 434210],
  ['h700_config', 24, 598320],
  ['arch8_config_a', 32, 284539],
];

for (const [name, count, size] of BANK) {
  test(`${name}: the picture bank walks to the trailer exactly`, skipUnless(name), () => {
    // The whole region above the named content is one contiguous array of pictures. Landing on the
    // trailer after dozens of variable length records is the proof, not the parse.
    const c = parse(load(name) as Uint8Array);
    const bank = pictureBank(c, namedContentEnd(c));
    assert.notEqual(bank, undefined);
    const pictures = bank as { address: number; length: number }[];
    assert.equal(pictures.length, count);
    assert.equal(pictures.reduce((n, p) => n + p.length, 0), size);
    for (let k = 0; k + 1 < pictures.length; k += 1) {
      const here = pictures[k] as { address: number; length: number };
      assert.equal(here.address + here.length, (pictures[k + 1] as { address: number }).address);
    }
    // Every picture opcode 2 names is one of these, which is the second constraint that makes the
    // start unique.
    const inside = new Set(pictures.map((p) => p.address));
    for (const bitmap of bitmaps(c)) assert.ok(inside.has(bitmap.address));
  });
}

test('a start one byte out does not walk', skipUnless('h600_config'), () => {
  const c = parse(load('h600_config') as Uint8Array);
  const bank = pictureBank(c, namedContentEnd(c)) as { address: number }[];
  const start = c.blobOffsetOf((bank[0] as { address: number }).address) as number;
  assert.notEqual(pictureRun(c, start), undefined);
  for (const delta of [-1, 1, 2, 3]) {
    assert.equal(pictureRun(c, start + delta), undefined, `offset ${delta}`);
  }
});

test('arch 9 has a bank after all, of four monochrome pictures', skipUnless('h525_config'), () => {
  // This asserted `undefined` until section 62. Section 55 concluded arch 9 had no picture region,
  // on the strength of it emitting no screen opcode 2, and the conclusion did not follow: nothing
  // there draws a picture, and the pictures are there anyway. Base slot 17 names them.
  const c = parse(load('h525_config') as Uint8Array);
  const bank = pictureBank(c, namedContentEnd(c));
  assert.notEqual(bank, undefined);
  const pictures = bank as { kind: number; stride: number; rows: number; length: number }[];
  assert.equal(pictures.length, 4);
  for (const picture of pictures) {
    // Kind 2 draws nothing on the other three architectures. Here it is one bit a pixel, so a
    // 96 by 64 screen is 768 bytes and the record is 773.
    assert.deepEqual(
      { kind: picture.kind, stride: picture.stride, rows: picture.rows, length: picture.length },
      { kind: 2, stride: 96, rows: 64, length: 773 },
    );
  }
});

test('base slot 17 states where the bank begins', skipUnless('h525_config', 'h600_config'), () => {
  // Two bytes ahead of it, and the walk from there lands on the trailer, which is the check the
  // search used to have to make for every candidate offset.
  for (const name of ['h525_config', 'h600_config']) {
    const c = parse(load(name) as Uint8Array);
    const stated = pictureBankStart(c);
    assert.notEqual(stated, undefined, name);
    assert.notEqual(pictureRun(c, stated as number), undefined, name);
  }
});

/**
 * Section 63, the second glyph encoding. Two bits to a pixel on a monochrome panel, rows framed by
 * their own byte length, and one arch 9 sample to hold it up, so the closures are inside the
 * sample rather than across two of them.
 */
test('arch 9 packs 160 glyphs two bits to a pixel', skipUnless('h525_config'), () => {
  const c = parse(load('h525_config') as Uint8Array);
  assert.ok(IMAGE_PACKED_ARCHITECTURES.has(c.architecture as number));
  const sets = fontSets(c);
  const decoded = glyphs(c);
  assert.notEqual(sets, undefined);
  assert.notEqual(decoded, undefined);
  const pictures = decoded as Glyph[][];
  let total = 0;
  const seen = new Set<number | undefined>();
  for (let i = 0; i < pictures.length; i += 1) {
    const height = (sets as NonNullable<typeof sets>)[i]?.height;
    for (const glyph of pictures[i] as Glyph[]) {
      assert.equal(glyph.rows.length, height, `glyph at ${glyph.address}`);
      for (const row of glyph.rows) {
        assert.equal(row.length, glyph.width);
        for (const pixel of row) seen.add(pixel);
      }
      total += 1;
    }
  }
  assert.equal(total, 160);
  // Never undefined: a background run states the background rather than skipping it. And only two
  // of the four values a two bit pixel can hold ever occur.
  assert.deepEqual([...seen].sort(), [IMAGE_PACKED_INK, IMAGE_PACKED_PAPER]);
});

test('an arch 9 glyph ends exactly where the next one starts', skipUnless('h525_config'), () => {
  // Truncating by one byte has to fail, because the terminator is the last byte. A glyph carrying
  // even one byte of slack would still find its terminator in the short read, so this is what says
  // the extent is exact rather than merely sufficient. Same closure as the picture bank's walk.
  const c = parse(load('h525_config') as Uint8Array);
  const sets = fontSets(c) as NonNullable<ReturnType<typeof fontSets>>;
  let checked = 0;
  for (const font of sets) {
    const live = font.glyphs.filter((a): a is number => a !== undefined).sort((a, b) => a - b);
    for (let i = 0; i < live.length; i += 1) {
      const limit = c.blobOffsetOf((live[i + 1] ?? font.address) as number) as number;
      const address = live[i] as number;
      assert.notEqual(glyphAt(c, address, limit), undefined, `glyph at ${address}`);
      assert.equal(glyphAt(c, address, limit - 1), undefined, `glyph at ${address}, one byte short`);
      checked += 1;
    }
  }
  assert.equal(checked, 160);
});

/**
 * Section 64. Opcode 22 on arch 9 takes eleven operand bytes whose last three name a picture, and
 * that one entry makes every arch 9 mode record carry a screen program. No arch 9 firmware exists,
 * so the width rests on the corpus, and the closure below is what makes that acceptable: the four
 * picture addresses come from walking the bank base slot 17 names, not from these instructions.
 */
test('an arch 9 row draw is opcode 22 then opcode 3, and the row index is the operand',
  skipUnless('h525_config', 'h525_config_2'), () => {
    // Section 85, correcting section 64 in place. The old reading gave opcode 22 eleven operands
    // whose last three named a picture. They do name one, but the instruction is opcode 3 and the
    // operand of opcode 22 is a row index: it runs 0 to 7 for every mode page, and the opcode 3
    // after it draws 96 by 8 at `y = 8 * operand`. Both readings consume the same twelve bytes,
    // which is why 1856 instances could not tell them apart.
    for (const [name, expected, pictures] of
      [['h525_config', 1080, 4], ['h525_config_2', 776, 5]] as const) {
      const data = require_(name);
      const c = parse(data);
      const bank = pictureBank(c, namedContentEnd(c)) ?? [];
      const start = (c.sections[17]?.address ?? 0) + PICTURE_BANK_BIAS;
      const addresses = new Set<number>();
      let at = start;
      for (const picture of bank) {
        addresses.add(at);
        at += picture.length as number;
      }
      assert.equal(addresses.size, pictures, `${name}: the bank's own picture count`);

      const pages = (modeRecords(c) ?? []).flatMap((record) => record.pages);
      let rows = 0;
      const perValue = new Map<number, number>();
      for (const page of pages) {
        const program = screenProgram(c, page.program);
        assert.notEqual(program, undefined, `${name}: a page whose program does not walk`);
        let onThisPage = 0;
        for (let i = 0; i < (program ?? []).length; i += 1) {
          const instruction = (program as { opcode: number; operands: Uint8Array }[])[i] as
            { opcode: number; operands: Uint8Array };
          if (instruction.opcode !== SCREEN_CALL) continue;
          rows += 1;
          onThisPage += 1;
          assert.equal(instruction.operands.length, 1, `${name}: one operand`);
          const row = instruction.operands[0] as number;
          assert.ok(row < 8, `${name}: row ${row}`);
          perValue.set(row, (perValue.get(row) ?? 0) + 1);
          // The draw that follows, and its geometry, which is what ties the operand to a row.
          const next = (program as { opcode: number; operands: Uint8Array }[])[i + 1] as
            { opcode: number; operands: Uint8Array } | undefined;
          assert.equal(next?.opcode, 3, `${name}: opcode 22 is followed by a draw`);
          const operands = next?.operands as Uint8Array;
          // Two `(0, 8 * row)` pairs, then 96 by 8. Whatever the first four bytes are exactly,
          // the row's pixel position is in them twice and it is eight times the operand.
          assert.deepEqual([...operands.subarray(0, 6)], [0, 8 * row, 0, 8 * row, 0x60, 8],
            `${name}: row ${row} is drawn at y = ${8 * row}`);
          const target = (operands[operands.length - 3] as number)
            | ((operands[operands.length - 2] as number) << 8)
            | ((operands[operands.length - 1] as number) << 16);
          assert.ok(addresses.has(target), `${name}: the draw names ${target}, not a picture`);
        }
        assert.equal(onThisPage, 8, `${name}: eight rows on every page`);
      }
      assert.equal(rows, expected, `${name}: rows`);
      assert.equal(rows, 8 * pages.length, `${name}: eight per page`);
      // Uniform, which is the closure: each row index appears exactly once per page.
      assert.deepEqual([...perValue.entries()].sort((a, b) => a[0] - b[0]),
        Array.from({ length: 8 }, (_, k) => [k, pages.length]));
    }
  });

test('the bank search refuses when its two constraints do not pick one start', skipWithoutLab(), () => {
  // The docstring said "exactly one start satisfies both in every container that has a bank", and
  // that sentence is what justified searching 1024 offsets. It is false where the second constraint
  // is **empty**: no arch 9 (Harmony 525) program names a picture with opcode 2, so `wanted` is a
  // set of nothing and any tiling start satisfies it. Two, two and three offsets do, on the three
  // arch 9 (Harmony 525) containers. It was masked because base slot 17 states the bank there and
  // `pictureBankStart` answers first. Section 139.
  //
  // Counted here rather than asserted away, so the number is on the record: for each container, how
  // many starts in the search window tile to the trailer and hold every opcode 2 address.
  const AMBIGUOUS = ['h525_config', 'h525_config_2', 'h525_safemode_ahcm'];
  for (const name of AMBIGUOUS) {
    const c = parse(require_(name));
    const stated = pictureBankStart(c) as number;
    const wanted = bitmaps(c);
    assert.equal(wanted.length, 0, `${name} names a picture with opcode 2 after all`);
    let candidates = 0;
    for (let start = stated; start < Math.min(stated + 1024, c.blob.length); start += 1) {
      if (pictureRun(c, start) !== undefined) candidates += 1;
    }
    assert.ok(candidates > 1, `${name} has ${candidates} candidates, so it is not the ambiguous case`);
    // The stated start still answers, because `pictureBank` asks base slot 17 before it searches.
    assert.notEqual(pictureBank(c, stated), undefined);
  }
  // And the refusal itself, constructed, because no container in the corpus reaches the branch: a
  // copy of an arch 9 (Harmony 525) container with base slot 17's pointer zeroed. `pictureBankStart`
  // declines a NULL section, so the search is the only route left, `wanted` is empty and two starts
  // tile. It used to hand back the lower of the two.
  const blob = new Uint8Array(require_('h525_config'));
  const c = parse(blob);
  const slot = archSlot(c.architecture as number, TOUCH_MAP_SLOT);
  const at = (c.blobOffset as number) + SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * slot;
  assert.notEqual(pictureBankStart(c), undefined, 'the sample has to state its bank for this to bite');
  blob.fill(0, at, at + SECTION_ITEM_SIZE);
  const blinded = parse(blob);
  assert.equal(pictureBankStart(blinded), undefined);
  assert.equal(pictureBank(blinded, namedContentEnd(blinded)), undefined);
});
