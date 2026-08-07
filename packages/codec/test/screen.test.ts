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

import { load, skipUnless, skipWithoutLab } from '@harmony/lab';
import {
  BITMAP_HEADER,
  BITMAP_NOTHING,
  BITMAP_RAW,
  PIXEL_BYTES,
  IMAGE_ARCHITECTURES,
  SCREEN_ARCH12_ONLY,
  SCREEN_FIXED_OPERANDS,
  SCREEN_SELECT_FONT,
  bitmapAt,
  bitmaps,
  namedContentEnd,
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
  screenProgramRoots,
  valueMaps,
} from '../src/index.ts';
import type { Glyph } from '../src/index.ts';

/** `[sample, reachable programs, decoded glyphs]`. Same walk as `tests/test_interpreter.py`. */
const DECODED: readonly [string, number, number][] = [
  ['h700_config', 6568, 553],
  ['h700_config_2', 6568, 553],
  ['h600_config', 4527, 463],
  ['h525_config', 22, 0],
  ['one_config', 572, 501],
  ['one_config_unprogrammed', 389, 405],
  ['arch8_config_a', 345, 397],
  ['arch8_config_b', 366, 299],
  ['arch8_config_c', 399, 312],
  ['arch8_config_d', 399, 312],
  // Zero before section 53. A safe mode container has 35 modes and no base slot 11 table, so
  // every program it holds is reached through a mode record.
  ['h600_safemode_gspm', 35, 46],
  ['h700_gspm', 35, 46],
  ['h650_safemode_gspm', 35, 46],
];

/**
 * What the Python implementation reports. 18252, 3933 and 16054 when this port landed; the first
 * and third moved with section 53, which made a mode record's own screen program a root and so
 * reached 1629 programs nothing had reached before. The glyph total does not move, because glyphs
 * come from base slot 7 and not from the programs that draw them.
 */
const CORPUS_PROGRAMS = 20260;
const CORPUS_GLYPHS = 3933;
const CORPUS_STRING_CODES = 40588;

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
    if (sets === undefined || pictures === undefined) return;
    for (let i = 0; i < sets.length; i += 1) {
      const font = sets[i] as (typeof sets)[number];
      const decoded: Glyph[] = pictures[i] ?? [];
      for (const picture of decoded) {
        assert.equal(picture.rows.length, font.height, `glyph at ${picture.address}`);
        for (const row of picture.rows) assert.equal(row.length, picture.width);
      }
    }
  });
}

test(`the corpus decodes ${CORPUS_PROGRAMS} programs, as Python reports`, skipWithoutLab(), () => {
  let total = 0;
  let counted = 0;
  for (const [name] of DECODED) {
    const data = load(name);
    if (data === undefined) continue;
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
    const data = load(name);
    if (data === undefined) continue;
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
      const data = load(name);
      if (data === undefined) continue;
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

test('the roots come from base slots 11, 14 and 6', skipUnless('h600_config'), () => {
  const c = parse(load('h600_config') as Uint8Array);
  const roots = screenProgramRoots(c);
  const fromTable = c.pointerArray(11) ?? [];
  const fromMaps = (valueMaps(c) ?? []).flatMap((m) => [
    ...m.entries.map(([, target]) => target),
    ...m.ranges.map(([, , target]) => target),
  ]);
  const fromModes = modeProgramRoots(c);
  assert.ok(fromTable.length > 0, 'slot 11 supplies roots');
  assert.ok(fromMaps.length > 0, 'slot 14 supplies roots');
  assert.ok(fromModes.length > 0, 'slot 6 supplies roots, section 53');
  assert.equal(roots.length, fromTable.length + fromMaps.length + fromModes.length);
});

test('the opcode table has no entry for the one the arch 12 dispatcher alone knows', () => {
  // Listed so a parser refuses it rather than desynchronising silently. No config uses opcode 22,
  // so its operand count is not established and guessing one would be worse than stopping. Opcode
  // 23 was in this set until its handler was read: it takes none. Section 54.
  assert.deepEqual([...SCREEN_ARCH12_ONLY], [22]);
  for (const opcode of SCREEN_ARCH12_ONLY) {
    assert.equal(SCREEN_FIXED_OPERANDS[opcode], undefined);
  }
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
  ['h700_config', 21, 0x052c5f],
  ['h600_config', 16, 0x043aa7],
  ['one_config', 28, 0x048bc6],
  ['one_config_unprogrammed', 27, 0x01de24],
  ['arch8_config_a', 28, 0x025eba],
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
  ['h700_config', 21, [0, 1], [12, 128], [10, 128]],
  ['h600_config', 16, [0, 1], [12, 128], [10, 128]],
  ['one_config', 28, [0, 1], [20, 22, 61, 62, 69, 87, 88, 176],
    [10, 11, 18, 33, 62, 69, 91, 220]],
  ['arch8_config_a', 28, [0, 1], [16, 17, 18, 19, 64, 128], [10, 32, 160]],
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
