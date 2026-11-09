/**
 * The Harmony One's skeleton laid out from nothing and the probe the screen builders spell through,
 * `todo-compile-one.md` 7.1.3, findings section 431.
 *
 * **No lab for the first four**: the point is that the skeleton comes out of the codec with no Logitech file as
 * input. It passes every check the parser runs, the emitter's round trip and the inventory, every byte of it is
 * claimed by a reader but the two of the empty key table, its font table is the stated one, its state tables read
 * back as the stamped clock, and every table it does not build holds nothing. The probe draws every code once and
 * reads back every code as the character the table states; a probe drawing the space alone gets another alphabet,
 * and a probe with two characters swapped reads them back swapped, the controls that the drawing and the glyphs
 * are what the reading follows.
 *
 * **Three with the lab**: the count widths, raw slot 18 and the key table on the nineteen compiles; every text of
 * the two compiles with no activity whose table is in our order spells through the probe in our codes, those among
 * the first 60 in Logitech's own; and every screen set's builder, given a description read off Logitech's compile of
 * two devices, builds through the probe and refuses on the bare skeleton.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, ONE_FAMILY, ONE_SKIN_54_FAMILY, skipUnless } from '@harmony/lab';
import type { Container } from '../../../src/index.ts';
import { inventory, parse } from '../../../src/index.ts';
import { LETTERING_CHARACTERS, describeStateTables, layOutContainer, takeApart } from '../../../src/build.ts';
import { archSlot, characterMap, claims, fontSets, glyphOf, roundTrip } from '../../../src/internal.ts';
import { clockSpec } from '../../../src/assembly/statetables.ts';
import { countedTable } from '../../../src/assembly/frame.ts';
import { SCREEN_END, SCREEN_SELECT_FONT, SCREEN_TEXT_INLINE, screenProgram } from '../../../src/screens/screen.ts';
import { stateRecords, taggedList } from '../../../src/container/sections.ts';
import { speller, blobReader } from '../../../src/shared/spelling.ts';
import { ONE_CHOICES } from '../../../src/families/harmony-one/choices.ts';
import { ONE_STATE_TABLES } from '../../../src/families/harmony-one/statetables.ts';
import { ONE_FIXED_CODES, ONE_FONT_SETS, ONE_ADDED_SETS, ONE_GLYPH_ORDER, buildOneFontTable } from '../../../src/families/harmony-one/fontsets.ts';
import { buildOneScreenTexts, describeOneScreenTexts, oneCharacterMap } from '../../../src/families/harmony-one/screentexts.ts';
import {
  ONE_COUNT_WIDTHS, ONE_SKELETON_SKINS, OneSkeletonError, buildOneSkeleton, layOutOneSkeleton, oneSpellingContainer,
} from '../../../src/families/harmony-one/skeleton.ts';
import { buildOneFirmwareScreens, describeOneFirmwareScreens } from '../../../src/families/harmony-one/firmwarescreens.ts';
import { buildOneFixedScreens, describeOneFixedScreens } from '../../../src/families/harmony-one/fixedscreens.ts';
import { buildOneStatusScreens, describeOneStatusScreens } from '../../../src/families/harmony-one/statusscreens.ts';
import { buildOneHelpScreens, describeOneHelpScreens } from '../../../src/families/harmony-one/helpscreens.ts';
import { buildOneClockHeader, describeOneClockHeader } from '../../../src/families/harmony-one/clockheader.ts';
import { buildOneTourScreens, describeOneTourScreens } from '../../../src/families/harmony-one/tourscreens.ts';
import { buildOneDevicePages, describeOneDevicePages } from '../../../src/families/harmony-one/devicepages.ts';
import { buildOneDeviceLists, describeOneDeviceLists } from '../../../src/families/harmony-one/devicelists.ts';
import { buildOneActivityMenu, describeOneActivityMenu } from '../../../src/families/harmony-one/activitymenu.ts';
import '../../../src/support/resources.node.ts';

const BUILT_AT = '2026-10-23T12:00:00';
const OPTIONS = { skin: 54, builtAt: BUILT_AT, choices: ONE_CHOICES };

/** The bytes of the skeleton: the frame, our 18 sets of 95 glyphs, the state tables and the empty tables. */
const SKELETON_LENGTH = 183949;
/** Base slot 7, `buildOneFontTable`'s table, sets and glyphs, section 427. */
const FONT_TABLE_LENGTH = 183518;
/** The key table sits straight after the end marker: the 11 byte header, 22 four byte table items, the four byte marker. */
const KEY_TABLE_AT = 0x0b + 4 * 22 + 4;
/** The nineteen distinct Harmony One compiles of section 405, `test/families/harmony-one/oneemptywiring.test.ts`' list. */
// The nineteen in the order this file's per compile tables are written in: skin 54's sixteen, then the three of
// other skins.
const ONES = [...ONE_SKIN_54_FAMILY.full, ...ONE_FAMILY.full.filter((name) => !ONE_SKIN_54_FAMILY.full.includes(name))];

/** Every unclaimed run of a container, `[start, length]`. */
function gapsOf(c: Container): [number, number][] {
  const gaps: [number, number][] = [];
  let at = 0;
  for (const one of claims(c).sort((a, b) => a.start - b.start)) {
    if (one.start > at) gaps.push([at, one.start - at]);
    at = Math.max(at, one.start + one.length);
  }
  if (at < c.blob.length) gaps.push([at, c.blob.length - at]);
  return gaps;
}

test('7.1.3: the skeleton lays out from nothing, every parse check passing and every byte claimed but the empty key table', () => {
  const built = buildOneSkeleton(OPTIONS);
  const c = built.container;
  assert.ok(c.allChecksPass);
  assert.equal(c.architecture, 12);
  assert.equal(c.versionWord! & 0xff, 54);
  assert.equal(built.bytes.length, SKELETON_LENGTH);
  // The key table is the empty tagged list until the firmware screens give mode 0 its own map, 7.1.7.
  assert.deepEqual(gapsOf(c), [[KEY_TABLE_AT, 2]]);
  assert.deepEqual([...c.blob.subarray(KEY_TABLE_AT, KEY_TABLE_AT + 2)], [0, 0]);
  // The checks a Logitech compile is read with: the emitter's round trip and the inventory. The frame's own,
  // `takeApart`, finds the key table's end through mode 0's record, so it reads a configuration with a mode 0
  // and not the skeleton, which has no mode; the layout as placed lays out to the same bytes again instead.
  assert.ok(roundTrip(c).equal);
  assert.doesNotThrow(() => inventory(c));
  assert.throws(() => takeApart(c), /the key table is not one piece/);
  assert.deepEqual(layOutContainer(built.layout).bytes, built.bytes);
  // The same options give the same bytes.
  assert.deepEqual(buildOneSkeleton(OPTIONS).bytes, built.bytes);

  // Every counted table the skeleton does not build is its count of nothing and no more, read off the bytes: a
  // count of zero where its table entry points, and the reader that claims the table claiming only the count.
  const claimed = claims(c);
  for (const [slot, width] of Object.entries(ONE_COUNT_WIDTHS)) {
    const off = c.blobOffsetOf(c.sections[archSlot(12, Number(slot))]!.address)!;
    assert.deepEqual([...c.blob.subarray(off, off + width)], new Array(width).fill(0), `base slot ${slot}`);
    const table = claimed.filter((one) => one.owner === `slot-${slot}-table`);
    assert.deepEqual(table.map((one) => [one.start, one.length]), [[off, width]], `base slot ${slot}`);
  }
  // Raw slot 18, the One's own section, is its two zero bytes.
  const raw18 = c.blobOffsetOf(c.sections[18]!.address)!;
  assert.deepEqual([...c.blob.subarray(raw18, raw18 + 2)], [0, 0]);
  assert.equal(c.blobOffsetOf(c.sections[19]!.address), raw18 + 2);
});

test('7.1.3: the skeleton holds the stated font table and the stamped clock', () => {
  const built = buildOneSkeleton(OPTIONS);
  const c = built.container;
  const stated = buildOneFontTable(ONE_CHOICES);
  const sets = fontSets(c)!;
  assert.equal(sets.length, ONE_FONT_SETS.length + ONE_ADDED_SETS.length);
  assert.equal(sets.length, 18);
  assert.deepEqual(sets.map((set) => set.height), stated.faces.map((face) => face.height));
  // Every glyph of every set holds the bytes the statement built for it, and the bytes add up to the table's.
  let total = 0;
  sets.forEach((set, k) => {
    assert.equal(set.first, 1);
    assert.equal(set.count, LETTERING_CHARACTERS.length);
    const piece = stated.sets[k]!;
    total += piece.bytes.length;
    for (let code = 1; code <= set.count; code += 1) {
      const glyph = glyphOf(c, set, code)!;
      const ref = piece.refs[code - 1]!;
      const want = ('to' in ref ? ref.to.bytes : undefined)!;
      const at = c.blobOffsetOf(glyph.address)!;
      assert.equal(glyph.length, want.length, `set ${k} code ${code}`);
      assert.deepEqual(c.blob.subarray(at, at + want.length), want, `set ${k} code ${code}`);
      total += want.length;
    }
  });
  assert.equal(total + stated.table.bytes.length, FONT_TABLE_LENGTH);

  // The state tables: the firmware's records, the clock as stamped, nothing of the configuration's own.
  // Read off the bytes: the eighteen firmware records, the compiler's two byte variable, and the clock stamped.
  const records = stateRecords(c)!;
  assert.equal(records.length, ONE_STATE_TABLES.firmwareVariables + 1);
  assert.deepEqual(records.slice(0, 7).map((one) => ({ first: one.first, max: one.second })), clockSpec(BUILT_AT));
  assert.deepEqual(records.slice(7, 18).map((one) => [one.first, one.second]), ONE_STATE_TABLES.firmwareRecords);
  // And by the reader a builder's description comes from, over the layout as placed.
  const states = describeStateTables(built.layout, ONE_STATE_TABLES);
  assert.deepEqual(states.clock, clockSpec(BUILT_AT));
  assert.deepEqual(states.variables, []);
  assert.deepEqual(states.valueMaps, []);
  assert.equal(c.builtAt, BUILT_AT);
});

test('7.1.3: the skeleton refuses a skin it is not laid out for and a part for a table that is its own or none', () => {
  assert.deepEqual([...ONE_SKELETON_SKINS], [54]);
  assert.throws(() => buildOneSkeleton({ ...OPTIONS, skin: 59 }), (e: unknown) => e instanceof OneSkeletonError && /not skin 59/.test(e.message));
  const one = { bytes: new Uint8Array(1), refs: [], owner: 'slot-7-table' };
  for (const slot of [0, 7, 13, 14]) assert.throws(() => layOutOneSkeleton(OPTIONS, { tables: { [slot]: one } }), /skeleton's own/);
  for (const slot of [1, 3, 18, 19, 20]) assert.throws(() => layOutOneSkeleton(OPTIONS, { tables: { [slot]: one } }), /no table sits/);
});

test('7.1.3: the probe reads back every code as the character the table states, and the skeleton spells nothing', () => {
  const skeleton = buildOneSkeleton(OPTIONS).container;
  // The control: a configuration that draws no text has no character map, so nothing spells through it.
  assert.equal(characterMap(skeleton), undefined);
  assert.throws(() => speller(skeleton)(0, 'A'), /draws no text/);

  const probe = oneSpellingContainer(OPTIONS);
  assert.ok(probe.allChecksPass);
  // The probe is one base slot 11 program: select set 0, draw codes 1 to 95 inline at the top left, end.
  const entries = probe.pointerArray(archSlot(12, 11))!;
  assert.equal(entries.length, 1);
  const program = screenProgram(probe, entries[0]!)!;
  assert.deepEqual(program.map((one) => one.opcode), [SCREEN_SELECT_FONT, SCREEN_TEXT_INLINE, SCREEN_END]);
  assert.deepEqual([...program[0]!.operands], [0]);
  assert.deepEqual([...program[1]!.glyphs!], ONE_GLYPH_ORDER.map((_, k) => k + 1));
  // The character map names every glyph of every set, and the codes a program draws choose which alphabet names
  // them, `characterMap`: drawing all 95 makes ours the one that explains every drawn code.
  const map = oneCharacterMap(probe)!;
  assert.equal(map.alphabet, 'oxanium');
  assert.deepEqual(map.drawn, { resolved: 95, total: 95 });
  assert.equal(map.codes.size, ONE_GLYPH_ORDER.length);
  ONE_GLYPH_ORDER.forEach((ch, k) => assert.equal(map.codes.get(k + 1), ch, `code ${k + 1}`));
  // Every set spells every printable character in our codes.
  const spell = speller(probe, map);
  const word = LETTERING_CHARACTERS.join('');
  const ours = [...word].map((ch) => ONE_GLYPH_ORDER.indexOf(ch) + 1);
  for (let font = 0; font < 18; font += 1) assert.deepEqual(spell(font, word).codes, ours, `set ${font}`);
  // The probe's font table is the skeleton's: the probe adds one program and its table entry and nothing else.
  const a = fontSets(probe)!;
  const b = fontSets(skeleton)!;
  a.forEach((set, k) => {
    for (let code = 1; code <= set.count; code += 1) {
      const one = glyphOf(probe, set, code)!;
      const two = glyphOf(skeleton, b[k]!, code)!;
      const x = probe.blobOffsetOf(one.address)!;
      const y = skeleton.blobOffsetOf(two.address)!;
      assert.deepEqual(probe.blob.subarray(x, x + one.length), skeleton.blob.subarray(y, y + two.length), `set ${k} code ${code}`);
    }
  });
  assert.equal(probe.blob.length - skeleton.blob.length, 3 + (5 + ONE_GLYPH_ORDER.length + 2));

  // The control that drawing every code matters: a probe drawing the space alone, which every alphabet reads
  // as a blank, ties, and the first alphabet in the list wins, one seeded from Logitech's own letters, which
  // names 10 of our codes.
  const blank = { bytes: Uint8Array.from([SCREEN_SELECT_FONT, 0, SCREEN_TEXT_INLINE, 0, 0, ONE_GLYPH_ORDER.indexOf(' ') + 1, 0, SCREEN_END]), refs: [], owner: 'slot-11-program' };
  const spaceOnly = characterMap(layOutOneSkeleton(OPTIONS, { tables: { 11: countedTable(2, [blank], 'slot-11-table') }, body: [blank] }).container)!;
  assert.deepEqual({ alphabet: spaceOnly.alphabet, codes: spaceOnly.codes.size }, { alphabet: 'one', codes: 10 });

  // The control that the reading follows the glyphs: the first two codes' characters swapped read back swapped.
  const swapped = [ONE_GLYPH_ORDER[1]!, ONE_GLYPH_ORDER[0]!, ...ONE_GLYPH_ORDER.slice(2)];
  const other = oneCharacterMap(oneSpellingContainer({ ...OPTIONS, fonts: { characters: swapped } }))!;
  assert.equal(other.codes.get(1), ONE_GLYPH_ORDER[1]);
  assert.equal(other.codes.get(2), ONE_GLYPH_ORDER[0]);
});

/** A counted table's count width as a compile holds it: its bytes less `stride` per entry it names, three for an address. */
function widthsOf(c: Container, stride = 3): Record<number, number> {
  const layout = takeApart(c);
  return Object.fromEntries(Object.keys(ONE_COUNT_WIDTHS).map((slot) => {
    const table = layout.sections[Number(slot)]!.head[0]!;
    return [slot, table.bytes.length - stride * table.refs.length];
  }));
}

/** Entries in the Harmony One's key table on every compile, section 311. */
const KEY_TABLE_ENTRIES = 55;

test('7.1.3: the empty tables take the count widths, raw slot 18 the two zero bytes, of all nineteen compiles, whose key table is one constant naming lists 0 to 54', skipUnless(...ONES), () => {
  // The control: the same reading with four bytes an entry, the `u32` table section 20 corrected, disagrees
  // with the statement on every compile, so the agreement is the three byte entries' and not the reading's.
  let refuted = 0;
  const keyTables = new Set<string>();
  for (const name of ONES) {
    const c = parse(load(name) as Uint8Array);
    assert.deepEqual(widthsOf(c), { ...ONE_COUNT_WIDTHS }, name);
    if (JSON.stringify(widthsOf(c, 4)) !== JSON.stringify({ ...ONE_COUNT_WIDTHS })) refuted += 1;
    const layout = takeApart(c);
    const raw18 = layout.inserted?.[18];
    assert.deepEqual({ before: raw18?.before.length, head: raw18?.head.map((one) => [...one.bytes]) }, { before: 0, head: [[0, 0]] }, name);
    // The key table, mode 0's own key map, Low Battery's: 55 entries, each calling the list its position numbers,
    // the same bytes on every compile. So it names lists 0 to 54, which a skeleton with no list does not hold.
    const keys = taggedList(c, c.flashBase + c.markerOffset + 4)!;
    assert.equal(keys.entries.length, KEY_TABLE_ENTRIES, name);
    assert.deepEqual(keys.entries.map((one) => [one.opcode, one.operand]), keys.entries.map((_, k) => [0x7f, k]), name);
    keyTables.add(Buffer.from(layout.keyTable.bytes).toString('hex'));
  }
  assert.equal(refuted, ONES.length);
  assert.equal(keyTables.size, 1);
});

/**
 * The two compiles whose font table is in our order, section 427, so a font index in their description names the
 * same set in ours; both hold no activity, so their sixteen sets are the sixteen every compile holds and no start up
 * title or activity name is among their texts. Per compile its texts, how many have every character among the
 * first 60 codes, `ONE_FIXED_CODES`, and how many our codes spell otherwise than Logitech's. The test cannot see
 * which set a text is spelled in, since every set of ours holds every code; that the indices agree is section 427's.
 */
const SAME_ORDER = { harvest_one_two_devices: { texts: 1059, first: 950, differ: 106 }, harvest_one_families_1: { texts: 1231, first: 1185, differ: 46 } } as const;

test('7.1.3: every text of the two compiles with no activity in our table order spells through the probe, in Logitech\'s codes where it is among the first 60',
  skipUnless(...Object.keys(SAME_ORDER)), () => {
    const probe = oneSpellingContainer(OPTIONS);
    for (const [name, want] of Object.entries(SAME_ORDER)) {
      const c = parse(load(name) as Uint8Array);
      const map = oneCharacterMap(c);
      const d = describeOneScreenTexts(c, takeApart(c), blobReader(c), map);
      assert.equal(d.texts.length, want.texts, name);
      assert.ok(d.texts.every((one) => one.codes === undefined), `${name}: no text carries its codes`);
      const theirs = buildOneScreenTexts(d.texts, c, map).draws;
      const ours = buildOneScreenTexts(d.texts, probe).draws;
      let first = 0;
      let differ = 0;
      d.texts.forEach((one, k) => {
        const codes = ours[k]!.codes;
        assert.deepEqual(codes, [...one.word].map((ch) => ONE_GLYPH_ORDER.indexOf(ch) + 1), `${name}: '${one.word}'`);
        const same = codes.join(',') === theirs[k]!.codes.join(',');
        if (!same) differ += 1;
        if ([...one.word].every((ch) => ONE_GLYPH_ORDER.indexOf(ch) < ONE_FIXED_CODES)) {
          first += 1;
          assert.ok(same, `${name}: '${one.word}' is among the first 60 and spelled otherwise`);
        }
      });
      assert.deepEqual({ first, differ }, { first: want.first, differ: want.differ }, name);
    }
  });

test('7.1.3: every screen set builds through the probe from a description of Logitech\'s compile of two devices, and none through the skeleton',
  skipUnless('harvest_one_two_devices'), () => {
    const c = parse(load('harvest_one_two_devices') as Uint8Array);
    const layout = takeApart(c);
    const probe = oneSpellingContainer(OPTIONS);
    const skeleton = buildOneSkeleton(OPTIONS).container;
    const sets: [string, (on: Container) => unknown][] = [
      ['firmware screens', (on) => buildOneFirmwareScreens(on, describeOneFirmwareScreens(c, layout).spec)],
      ['fixed screens', (on) => buildOneFixedScreens(on, describeOneFixedScreens(c, layout).spec)],
      ['status screens', (on) => buildOneStatusScreens(on, describeOneStatusScreens(c, layout).spec)],
      ['help screens', (on) => buildOneHelpScreens(on, describeOneHelpScreens(c, layout).spec)],
      ['clock header', (on) => buildOneClockHeader(on, describeOneClockHeader(c, layout).spec)],
      ['tour', (on) => buildOneTourScreens(on, describeOneTourScreens(c, layout).spec)],
      ['device pages', (on) => buildOneDevicePages(on, describeOneDevicePages(c, layout).spec)],
      ['device lists', (on) => buildOneDeviceLists(on, describeOneDeviceLists(c, layout).spec)],
      ['activity menu', (on) => buildOneActivityMenu(on, describeOneActivityMenu(c, layout).spec)],
    ];
    for (const [what, build] of sets) {
      assert.doesNotThrow(() => build(probe), what);
      assert.throws(() => build(skeleton), /draws no text/, what);
    }
  });
