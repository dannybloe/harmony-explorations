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
  IMAGE_ARCHITECTURES,
  SCREEN_ARCH12_ONLY,
  SCREEN_FIXED_OPERANDS,
  SCREEN_SELECT_FONT,
  fontSets,
  glyphAt,
  glyphOf,
  glyphs,
  parse,
  reachablePrograms,
  screenProgram,
  screenProgramRoots,
  valueMaps,
} from '../src/index.ts';
import type { Glyph } from '../src/index.ts';

/** `[sample, reachable programs, decoded glyphs]`. Same walk as `tests/test_interpreter.py`. */
const DECODED: readonly [string, number, number][] = [
  ['h700_config', 6194, 553],
  ['h700_config_2', 6194, 553],
  ['h600_config', 4290, 463],
  ['h525_config', 22, 0],
  ['one_config', 304, 501],
  ['one_config_unprogrammed', 278, 405],
  ['arch8_config_a', 239, 397],
  ['arch8_config_b', 241, 299],
  ['arch8_config_c', 245, 312],
  ['arch8_config_d', 245, 312],
  ['h600_safemode_gspm', 0, 46],
  ['h700_gspm', 0, 46],
  ['h650_safemode_gspm', 0, 46],
];

/** What sections 40 and 46 report, from the Python implementation, before this port existed. */
const CORPUS_PROGRAMS = 18252;
const CORPUS_GLYPHS = 3933;
const CORPUS_STRING_CODES = 16054;

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

test('the roots come from base slot 11 and from base slot 14', skipUnless('h600_config'), () => {
  const c = parse(load('h600_config') as Uint8Array);
  const roots = screenProgramRoots(c);
  const fromTable = c.pointerArray(11) ?? [];
  const fromMaps = (valueMaps(c) ?? []).flatMap((m) => [
    ...m.entries.map(([, target]) => target),
    ...m.ranges.map(([, , target]) => target),
  ]);
  assert.ok(fromTable.length > 0, 'slot 11 supplies roots');
  assert.ok(fromMaps.length > 0, 'slot 14 supplies roots');
  assert.equal(roots.length, fromTable.length + fromMaps.length);
});

test('the opcode table has no entry for the two the arch 12 dispatcher alone knows', () => {
  // Listed so a parser refuses them rather than desynchronising silently. No config uses them, so
  // their operand counts are not established and guessing one would be worse than stopping.
  for (const opcode of SCREEN_ARCH12_ONLY) {
    assert.equal(SCREEN_FIXED_OPERANDS[opcode], undefined);
  }
});

/**
 * `[sample, distinct opcode 2 targets, highest offset any other known structure reaches]`.
 *
 * findings.md section 49. Opcode 2 is the only known referent of the region that holds most of a
 * config, and the pairing is what says so: every target above every other structure, in every
 * container that has any, and no region at all in the two kinds that emit no opcode 2.
 */
const REGION: readonly [string, number, number][] = [
  ['h700_config', 4, 0x052c5f],
  ['h600_config', 3, 0x043aa7],
  ['one_config', 16, 0x048bc6],
  ['one_config_unprogrammed', 16, 0x01de24],
  ['arch8_config_a', 10, 0x025eba],
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
