/**
 * Borrowing the letters unit A's fonts lack from other Harmony 880 and 885 configurations, `todo-compile-885.md` 1.6
 * (decided at the bench) for 2.7, `src/glyphborrow.ts`.
 *
 * **The question.** Of the test setup's names, "LG TV" (L, G), "KPN" (N), "Switch" (w, h) and "Film kijken" (F)
 * cannot be drawn in bench unit A's title font, and "Muziek" (z) not in its two label fonts: a Logitech compile
 * carries a glyph only for what its own text draws. ("Denon", which the lab's `compile-1.6-setup.md` listed for an N,
 * spells on A as it is: its N is lower case.) The decision was to copy the missing glyphs from other configurations of
 * the same remotes, until chapter 8 letters the 885 in our own. The risk is a copy in the wrong face: a glyph is
 * pixels in colours, and a set's header says only its height, so an `F` copied from another face of the same height
 * draws a letter that does not match its word.
 *
 * **Sources checked before the work.** `reference/config-format/screens.md` on the font table, glyph codes and what
 * the firmware reads (the Harmony 880 and 885's text routine, and section 368's on the Harmony 650 and 700); the
 * codec's `font.ts`, `fonttable.ts`, `text.ts` and `shared/spelling.ts`; how the Harmony 650 track borrowed letters
 * within one configuration and then replaced them, `todo-compile-650.md` 6.2.12 and chapter 8. Logitech's client
 * was not read: the question is what their compiled configurations contain, which the files answer, and nothing in
 * it was needed to read a font set.
 *
 * **The argument, which lives here since the archive takes nothing new.** Two sets are taken to be one face when
 * every non blank character both draw is the same bytes in both, and at least three are shared. Measured over every
 * pair of the eight Harmony 880 and 885 configurations the lab holds (28 pairs of configurations, 574 pairs of sets
 * of one height): 280 set pairs agree on every non blank glyph they share, between 5 and 67 of them, and 294 agree on
 * none; not one pair agrees on some glyphs and not others, and none shares no character. So the line between one
 * face and two is not a threshold chosen on a gradient but a gap. The first test holds that count, so a
 * configuration added to the list that blurs the gap fails it. Since no measured pair shares 1 to 4 glyphs, the
 * minimum of three is exercised on a synthetic donor instead: one sharing two identical glyphs is refused and one
 * sharing three is accepted. **Negative results**: no set pair is partial, which would have meant a face drawn in two
 * versions; and a donor's set of another height is never compared at all.
 *
 * **What else the tests settle.** Which donor holds each letter in the font that needs it, asserted as a table, so
 * a change to a reader or a donor shows as a changed row. That the borrow into unit A spells every name of the setup
 * in the three fonts the names are drawn in (titles, labels, the upper line of a two line label, the lab's
 * `compile-1.6-setup.md` section 3) through the composers' own speller, spaces included; that every glyph A had keeps
 * its bytes at its own code, every text A draws decodes the same, and its devices, activities and log area read the
 * same; and that the character map settles every code A draws. Addresses move, since the borrow inserts bytes, so
 * no position is asserted. That a set whose array stops short of a code being written grows to reach it. That a new
 * code, NULL in the sets it was not borrowed into, is refused there by the speller. And the refusals, each with a
 * control: a donor whose glyph was altered by one byte stops counting as the face, a letter no donor holds is refused
 * by name, a target whose code for a character no shape names refuses to hand out a new code, and an architecture
 * the proof was not measured on is refused.
 *
 * **One correction found on the way.** Unit A's configuration drew four codes no shape named, among them the `J` of
 * "Ja" and "Jaar", so its character map had no `J`, and the first borrow gave `J` a second code. Those four were
 * read and added to the arch 8 alphabet's seeds, `bin/alphabets.ts`, and the borrow now refuses a new code while a
 * drawn code is unsettled.
 *
 * **Width.** Arch 8, the Harmony 880 and 885, which run one application: of the eight configurations five state
 * skin 15, the Harmony 880's (`arch8_config_a` to `_d` and `arch8_config_880`), and three skin 17, the 885's. That
 * the container also passes the 885 firmware's start check is `tests/test_harmony_885_borrowed_letters.py`, since the
 * check is read out of the firmware in Python. Whether the remote draws the borrowed letters is a bench question and
 * is not settled here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import { devices, activityNames, parse } from '../src/index.ts';
import { BORROW_PROOF_MINIMUM, borrowGlyphs, faceProofs, glyphDonors, provesOneFace } from '../src/build.ts';
import {
  characterMap,
  decodedSet,
  excise,
  fontSets,
  glyphOf,
  logArea,
  screenStrings,
  trailerChecksum,
} from '../src/internal.ts';
import type { Container } from '../src/index.ts';
import type { GlyphDonor, GlyphWant } from '../src/build.ts';
import { IMAGE_SET_HEADER } from '../src/font.ts';
import { TRAILER_CHECKSUM_OFFSET } from '../src/gspm.ts';
import { Writer } from '../src/emit.ts';
import { spelledText } from '../src/shared/spelling.ts';
import '../src/resources.node.ts';

/** Every Harmony 880 and 885 configuration the lab holds, the measurement's population. */
const ARCH8 = [
  'arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d', 'arch8_config_880', 'arch8_config_885',
  'h885_a_config', 'h885_b_config',
];
/** The donors, every one but unit A: the other bench unit first, then the contributed 885, then the rest. */
const DONORS = ['h885_b_config', 'arch8_config_885', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d', 'arch8_config_880'];

/** Every name the test setup gives a device, an activity or the sequence, the lab's `compile-1.6-setup.md`. */
const SETUP_NAMES = [
  'LG TV', 'Plasma', 'Denon', 'KPN', 'Kodi', 'Switch', 'Sony HT',
  'TV kijken', 'Film kijken', 'Muziek', 'Kodi kijken', 'Plasma kijken', 'Radio',
];
/** Their letters in the order they first appear; `tests/test_harmony_885_borrowed_letters.py` uses the same order. */
const LETTERS = [...new Set(SETUP_NAMES.join('').replace(/ /g, ''))].join('');
/**
 * The three of unit A's fonts the names are drawn in, by their index in base slot 7: 0 the titles, 2 the labels and
 * menu rows, 3 the upper line of a two line label. The label fonts also take `q`, `J` and `Y`, which A's labels lack
 * and a catalogue command's label may need, so a borrow that gives a character its first code is exercised too.
 */
const TITLES = 0;
const WANTS: GlyphWant[] = [
  { set: TITLES, characters: LETTERS },
  { set: 2, characters: `${LETTERS}qJY` },
  { set: 3, characters: `${LETTERS}qJY` },
];

const parsed = (name: string): Container => parse(load(name) as Uint8Array);
const donors = (): GlyphDonor[] => DONORS.map((name) => ({ name, container: parsed(name) }));

/** Restate the trailer checksum over edited bytes and read them again, for the synthetic configurations below. */
function reparsed(bytes: Uint8Array): Container {
  bytes.set(new Writer(2).u16(trailerChecksum(bytes)).bytes, bytes.length - TRAILER_CHECKSUM_OFFSET);
  return parse(bytes);
}

/** A copy of `c` with one pixel byte of the glyph `code` of `set` changed. */
function altered(c: Container, set: number, code: number): Container {
  const font = fontSets(c)![set]!;
  const address = font.glyphs[code - font.first]!;
  const bytes = c.blob.slice();
  // The glyph's width byte, then operations: the first literal run's first pixel byte is two bytes in.
  let at = c.blobOffsetOf(address)! + 1;
  while (bytes[at]! & 0x80) at += 1;
  bytes[at + 1] = bytes[at + 1]! ^ 0x01;
  return reparsed(bytes);
}

/** A copy of `c` whose set `set` points only at the glyphs of `keep`, every other entry NULL: a same length edit. */
function keepingOnly(c: Container, set: number, keep: string): Container {
  const map = characterMap(c)!;
  const font = fontSets(c)![set]!;
  const bytes = c.blob.slice();
  const header = c.blobOffsetOf(font.address)!;
  font.glyphs.forEach((address, k) => {
    if (address !== undefined && !keep.includes(map.codes.get(font.first + k) ?? '\u0000')) {
      bytes.fill(0, header + IMAGE_SET_HEADER + 3 * k, header + IMAGE_SET_HEADER + 3 * k + 3);
    }
  });
  return reparsed(bytes);
}

test('two sets of one height either share every non blank glyph byte for byte or none, over the eight configurations',
  skipUnless(...ARCH8), () => {
    const cs = ARCH8.map(parsed);
    let one = 0;
    let none = 0;
    let some = 0;
    let nothingShared = 0;
    const sizes: number[] = [];
    for (let x = 0; x < cs.length; x += 1) {
      for (let y = x + 1; y < cs.length; y += 1) {
        for (const row of faceProofs(cs[x]!, cs[y]!)) {
          for (const proof of row) {
            if (proof === undefined) continue;
            if (proof.shared === 0) nothingShared += 1;
            else if (proof.differing === 0) {
              one += 1;
              sizes.push(proof.shared);
            } else if (proof.differing === proof.shared) none += 1;
            else some += 1;
          }
        }
      }
    }
    assert.deepEqual({ one, none, some, nothingShared }, { one: 280, none: 294, some: 0, nothingShared: 0 });
    assert.equal(Math.min(...sizes), 5);
    assert.equal(Math.max(...sizes), 67);
    // Inside the gap: below the smallest real agreement, five, and above a coincidence of one or two shapes, which
    // the synthetic donors below hold from both sides.
    assert.equal(BORROW_PROOF_MINIMUM, 3);
  });

test('a donor sharing two identical glyphs with the set is refused, and one sharing three is the face',
  skipUnless('h885_a_config', 'arch8_config_885'), () => {
    const a = parsed('h885_a_config');
    const donor = parsed('arch8_config_885');
    // The contributed 885's title font, cut down to `G`, which A's title font lacks, and two or three letters both
    // draw. Its other sets are untouched, and none of them is A's title face, so only this set can supply `G`.
    const two = keepingOnly(donor, 0, 'GHy');
    const three = keepingOnly(donor, 0, 'GHya');
    assert.deepEqual(faceProofs(a, two)[TITLES]![0], { shared: 2, differing: 0 });
    assert.deepEqual(faceProofs(a, three)[TITLES]![0], { shared: 3, differing: 0 });
    const offered = (container: Container): string[] => glyphDonors(a, [{ name: 'cut', container }],
      [{ set: TITLES, characters: 'G' }])[0]!.sources.map((s) => `${s.donor}#${s.donorSet} ${s.proof.shared}`);
    assert.deepEqual(offered(two), []);
    assert.deepEqual(offered(three), ['cut#0 3']);
    assert.throws(() => borrowGlyphs(a, [{ name: 'cut', container: two }], [{ set: TITLES, characters: 'G' }]),
      /no donor holds 'G' in set 0/);
    assert.equal(borrowGlyphs(a, [{ name: 'cut', container: three }], [{ set: TITLES, characters: 'G' }]).borrowed.length, 1);
  });

test('which donor holds each letter of the setup\'s names that unit A lacks, and q, J and Y in the two label fonts',
  skipUnless('h885_a_config', ...DONORS), () => {
    const a = parsed('h885_a_config');
    const table = glyphDonors(a, donors(), WANTS)
      .map((one) => [one.set, one.character, one.code ?? null, one.sources.map((s) => `${s.donor}#${s.donorSet}`).join(' ')]);
    assert.deepEqual(table, [
      // The title font: every letter there, each in two to seven configurations' title fonts.
      [0, 'L', 17, 'h885_b_config#0 arch8_config_885#0'],
      [0, 'G', 52, 'arch8_config_885#0 arch8_config_c#0 arch8_config_d#0 arch8_config_880#0'],
      [0, 'N', 51, 'h885_b_config#0 arch8_config_885#0'],
      [0, 'w', 53, 'arch8_config_885#0 arch8_config_a#0 arch8_config_b#0 arch8_config_c#0 arch8_config_d#0 arch8_config_880#0'],
      [0, 'h', 37, 'h885_b_config#0 arch8_config_885#0 arch8_config_a#0 arch8_config_b#0 arch8_config_c#0 arch8_config_d#0 arch8_config_880#0'],
      [0, 'F', 15, 'h885_b_config#0 arch8_config_885#0 arch8_config_b#0 arch8_config_c#0 arch8_config_d#0'],
      // The label font: `z` in unit B's alone; `q` and `Y` have no code in A, so a borrow gives them one.
      [2, 'z', 59, 'h885_b_config#2'],
      [2, 'q', null, 'arch8_config_a#4 arch8_config_b#4 arch8_config_c#4 arch8_config_d#4'],
      [2, 'J', 67, 'arch8_config_885#4 arch8_config_a#4 arch8_config_b#4 arch8_config_c#4 arch8_config_d#4 arch8_config_880#4'],
      [2, 'Y', null, 'arch8_config_885#4 arch8_config_a#4 arch8_config_b#4 arch8_config_c#4 arch8_config_d#4 arch8_config_880#4'],
      // The upper line of a two line label, the same face as the labels by the proof.
      [3, 'z', 59, 'h885_b_config#2'],
      [3, 'q', null, 'arch8_config_a#4 arch8_config_b#4 arch8_config_c#4 arch8_config_d#4'],
      [3, 'J', 67, 'arch8_config_885#4 arch8_config_a#4 arch8_config_b#4 arch8_config_c#4 arch8_config_d#4 arch8_config_880#4'],
      [3, 'Y', null, 'arch8_config_885#4 arch8_config_a#4 arch8_config_b#4 arch8_config_c#4 arch8_config_d#4 arch8_config_880#4'],
    ]);
  });

test('borrowed into unit A: every name of the setup spells in its three fonts, spaces included, and every glyph and text A had reads back the same',
  skipUnless('h885_a_config', ...DONORS), () => {
    const a = parsed('h885_a_config');
    // The control: before the borrow the composers' speller refuses the names the question names.
    assert.throws(() => spelledText(a, TITLES, 'LG TV'), /has no glyph for 'L'/);
    assert.throws(() => spelledText(a, 2, 'Muziek'), /has no glyph for 'z'/);
    const result = borrowGlyphs(a, donors(), WANTS);
    const b = parse(result.bytes);
    // The container is whole: its checksum is the one over its bytes, which is what `parse` alone does not demand.
    assert.equal(b.trailerChecksum, trailerChecksum(b.blob));

    // The first donor in the list supplies each glyph; the two characters with no code get the next two.
    assert.deepEqual(result.added, [['q', 74], ['Y', 75]]);
    assert.equal(result.borrowed.length, 14);
    // Every code the configuration draws now has a character, the four read in 1.6 among them.
    assert.deepEqual(characterMap(b)!.drawn, { resolved: 73, total: 73 });
    for (const want of WANTS) {
      for (const name of SETUP_NAMES) assert.doesNotThrow(() => spelledText(b, want.set, name), `${name} in font ${want.set}`);
    }
    for (const font of [2, 3]) assert.doesNotThrow(() => spelledText(b, font, 'qJY'));

    // Every glyph A had, byte for byte, at its own code in its own set. Its address moves, so is not compared.
    const before = fontSets(a)!;
    const after = fontSets(b)!;
    assert.equal(after.length, before.length);
    let kept = 0;
    before.forEach((set, index) => {
      for (const { index: k, address, glyph } of decodedSet(a, set)) {
        assert.ok(glyph !== undefined);
        const code = set.first + k;
        const moved = glyphOf(b, after[index]!, code);
        assert.ok(moved !== undefined, `set ${index} lost code ${code}`);
        const from = a.blobOffsetOf(address)!;
        const to = b.blobOffsetOf(moved.address)!;
        assert.deepEqual(b.blob.subarray(to, to + moved.length), a.blob.subarray(from, from + glyph.length));
        kept += 1;
      }
    });
    assert.equal(kept, before.reduce((sum, set) => sum + set.glyphs.filter((g) => g !== undefined).length, 0));
    // The growth is exactly the copies and the pointers the two new codes take in every set, nothing else.
    const copied = result.borrowed.reduce((sum, one) => sum + one.length, 0);
    assert.equal(b.blob.length - a.blob.length, copied + 3 * result.added.length * before.length);

    // What A's own readers find is unchanged: every text with its font and place on its screen, its devices and
    // activities, and the log area base slot 2 states, which the Harmony 880 and 885's log append writes to.
    const texts = (c: Container): string[] => screenStrings(c).map((s) => `${s.font} ${s.x} ${s.y} ${s.text}`);
    assert.deepEqual(texts(b), texts(a));
    assert.deepEqual(devices(b).map((d) => [d.group, d.name]), devices(a).map((d) => [d.group, d.name]));
    assert.deepEqual(activityNames(b).map((x) => x.name), activityNames(a).map((x) => x.name));
    const area = logArea(b)!;
    assert.deepEqual([area.capacity, area.start, area.limit], [15360, 0x1e0000, 0x1fe000]);
  });

test('a new code is NULL in the sets it was not borrowed into, and the composers\' speller refuses it there',
  skipUnless('h885_a_config', ...DONORS), () => {
    const b = parse(borrowGlyphs(parsed('h885_a_config'), donors(), WANTS).bytes);
    const sets = fontSets(b)!;
    // `q` and `Y`, codes 74 and 75, reach every set's array and point somewhere in sets 2 and 3 alone.
    for (const [index, set] of sets.entries()) {
      assert.equal(set.count, 75);
      const holds = [74, 75].map((code) => set.glyphs[code - set.first] !== undefined);
      assert.deepEqual(holds, index === 2 || index === 3 ? [true, true] : [false, false], `set ${index}`);
    }
    for (const index of [0, 1, 4, 5, 6, 7]) {
      assert.throws(() => spelledText(b, index, 'q'), /has no glyph for 'q'/);
      assert.throws(() => spelledText(b, index, 'Y'), /has no glyph for 'Y'/);
    }
  });

test('a set whose pointer array stops short of a code being written grows to reach it, and no other set does',
  skipUnless('h885_a_config', ...DONORS), () => {
    // A synthetic target: unit A with its title font's array cut to 50 codes, so N, G and w (51 to 53) lie past it
    // while the other sets keep 73. A code past a set's count is what `glyphOf` and the speller treat as absent.
    const a = parsed('h885_a_config');
    const set = fontSets(a)![TITLES]!;
    const header = a.blobOffsetOf(set.address)!;
    const cut = excise(a, header + IMAGE_SET_HEADER + 3 * 50, 3 * (set.count - 50), { wholeFields: true }).bytes;
    cut[header + 2] = 50;
    const short = reparsed(cut);
    assert.deepEqual(fontSets(short)!.map((one) => one.count), [50, 73, 73, 73, 73, 73, 73, 73]);
    const result = borrowGlyphs(short, donors(), [{ set: TITLES, characters: 'NGw' }]);
    const b = parse(result.bytes);
    // No code was added, and the title font alone grew, to the highest code written into it.
    assert.deepEqual(result.added, []);
    assert.deepEqual(fontSets(b)!.map((one) => one.count), [53, 73, 73, 73, 73, 73, 73, 73]);
    assert.deepEqual(result.borrowed.map((one) => [one.character, one.code]), [['N', 51], ['G', 52], ['w', 53]]);
    // The three spell now; the control is the cut target, where the speller finds no glyph past the count.
    assert.throws(() => spelledText(short, TITLES, 'N'), /has no glyph for 'N'/);
    assert.doesNotThrow(() => spelledText(b, TITLES, 'NGw'));
  });

test('a donor whose glyph differs by one byte from a shared one is no longer the face, and its letters are not offered',
  skipUnless('h885_a_config', 'arch8_config_885'), () => {
    const a = parsed('h885_a_config');
    const donor = parsed('arch8_config_885');
    // Unit A's title font and the contributed 885's agree on every glyph they share, so this donor offers `G`.
    const offered = (container: Container): boolean => glyphDonors(a, [{ name: 'arch8_config_885', container }],
      [{ set: TITLES, characters: 'G' }])[0]!.sources.length === 1;
    assert.ok(provesOneFace(faceProofs(a, donor)[TITLES]![0]));
    assert.ok(offered(donor));
    // The control: the donor's `H`, which A's title font shares, altered by one pixel byte.
    const H = [...characterMap(donor)!.codes].find(([, ch]) => ch === 'H')![0];
    const changed = altered(donor, 0, H);
    assert.deepEqual(faceProofs(a, changed)[TITLES]![0], { shared: 30, differing: 1 });
    assert.ok(!offered(changed));
  });

test('the borrow refuses a letter no donor holds in the face, naming it',
  skipUnless('h885_a_config', ...DONORS), () => {
    // Set 1, the firmware's own messages, lacks `K`, and no donor's set of that face draws one.
    assert.throws(() => borrowGlyphs(parsed('h885_a_config'), donors(), [{ set: 1, characters: 'K' }]),
      /no donor holds 'K' in set 1/);
  });

test('the borrow refuses a new code while a code the target draws names no settled character',
  skipUnless('h885_a_config', ...DONORS), () => {
    // Unit A's `J`, code 67, drawn in sets 0 and 6. Altered in both, no shape names it, which is the state A was in
    // before its four codes were read into the alphabet: then `q` must not be handed a code.
    const a = parsed('h885_a_config');
    const unread = altered(altered(a, 0, 67), 6, 67);
    assert.equal(characterMap(unread)!.codes.has(67), false);
    assert.throws(() => borrowGlyphs(unread, donors(), [{ set: 2, characters: 'q' }]), /codes 67 name no settled character/);
    // The control: a borrow at an existing code is still allowed there.
    assert.equal(borrowGlyphs(unread, donors(), [{ set: 2, characters: 'z' }]).borrowed.length, 1);
  });

test('the borrow refuses an architecture it was not measured on, and a donor of another architecture',
  skipUnless('h885_a_config', 'h600_config'), () => {
    const a = parsed('h885_a_config');
    const h600 = parsed('h600_config');
    assert.throws(() => glyphDonors(h600, [], [{ set: 0, characters: 'F' }]), /measured on the Harmony 880 and 885 alone/);
    assert.throws(() => glyphDonors(a, [{ name: 'h600_config', container: h600 }], [{ set: 0, characters: 'F' }]),
      /h600_config is architecture 14/);
  });
