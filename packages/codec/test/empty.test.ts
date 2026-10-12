/**
 * The Harmony 650 built from nothing, `todo-compile-650.md` 11.1.1 and plan 008. No lab: the point of
 * these is that a configuration comes out of the codec with no Logitech file as input.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { FOUR_SLOT_CHOICES, LETTERING_CHARACTERS, claims, fontSets, glyphOf, letterRows, oxaniumFace } from '../src/index.ts';
import { EMPTY_FONT_SETS, buildEmptySkeleton, emptyCodeOf } from '../src/families/four-slot/empty.ts';

const BUILT_AT = '2026-10-12T12:00:00';

test('11.1.1.1: the skeleton lays out from nothing, every container check passing and every byte claimed', () => {
  const built = buildEmptySkeleton({ skin: 72, builtAt: BUILT_AT, inks: FOUR_SLOT_CHOICES.letterInks });
  const c = built.container;
  assert.ok(c.allChecksPass);
  assert.equal(c.architecture, 14);
  assert.equal(c.versionWord! & 0xff, 72);
  // Every byte is some reader's but the key table's, which no mode names until mode 0 exists, 11.1.1.3.
  const gaps: [number, number][] = [];
  let at = 0;
  for (const one of claims(c).sort((a, b) => a.start - b.start)) {
    if (one.start > at) gaps.push([at, one.start - at]);
    at = Math.max(at, one.start + one.length);
  }
  if (at < c.blob.length) gaps.push([at, c.blob.length - at]);
  assert.deepEqual(gaps, [[0x5f, 649]]);
  // Our font table: nine sets, each holding every printable character at the code of its place.
  const sets = fontSets(c)!;
  assert.deepEqual(sets.map((set) => set.height), EMPTY_FONT_SETS.map(({ face }) => oxaniumFace(face).cell));
  sets.forEach((set, k) => {
    assert.equal(set.first, 1);
    assert.equal(set.count, LETTERING_CHARACTERS.length);
    const { face, lettering } = EMPTY_FONT_SETS[k]!;
    for (const ch of ['A', 'g', '0', '~']) {
      const glyph = glyphOf(c, set, emptyCodeOf(ch))!;
      assert.deepEqual(glyph.rows, letterRows(face, ch, lettering, FOUR_SLOT_CHOICES.letterInks), `${face} ${lettering} '${ch}'`);
    }
  });
  assert.throws(() => buildEmptySkeleton({ skin: 73, builtAt: BUILT_AT, inks: FOUR_SLOT_CHOICES.letterInks }), /Harmony 650/);
});
