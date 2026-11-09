/**
 * The Harmony One's font table stated rather than read off a donor, `todo-compile-one.md` 7.1.1, findings section 427.
 *
 * Three claims. The sixteen English compiles of skin 54 hold sixteen sets in common, each found by the role a
 * builder's description reads and each the face and colours `ONE_FONT_SETS` states, and two more exactly where
 * their setup draws them; every set's header is in one form; and the first 60 codes are handed out in one order.
 * `buildOneFontTable`, from the statement and the donor's code order, lays out to the bytes `letterOneDonor`
 * gives Logitech's compile of two devices, with the same faces, and a wrong set changes them. The composed setup's
 * 33 sets are those 18 and the look's 15 blended copies, `composesetup.test.ts`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { ONE_SKIN_54_FAMILY, require_, sampled, skipUnless } from '@harmony/lab';
import { type Container, parse } from '../../../src/index.ts';
import { layOutContainer, takeApart } from '../../../src/build.ts';
import { modeRecords } from '../../../src/internal.ts';
import { IMAGE_TABLE_SLOT, fontSets, glyphOf } from '../../../src/screens/font.ts';
import { measureSet } from '../../../src/drawing/fonttable.ts';
import { characterMap } from '../../../src/screens/text.ts';
import { ONE_CHOICES } from '../../../src/families/harmony-one/choices.ts';
import { letterOneDonor } from '../../../src/families/harmony-one/look.ts';
import {
  ONE_ADDED_SETS, ONE_CONTENT_FONT_SETS, ONE_FIXED_CODES, ONE_FONT_SETS, ONE_GLYPH_ORDER, type OneFontSet,
  buildOneFontTable, donorGlyphOrder,
} from '../../../src/families/harmony-one/fontsets.ts';
import { TITLE_JOINER } from '../../../src/families/harmony-one/screentexts.ts';
import { describeOneFirmwareScreens } from '../../../src/families/harmony-one/firmwarescreens.ts';
import { describeOneFixedScreens } from '../../../src/families/harmony-one/fixedscreens.ts';
import { describeOneActivityMenu } from '../../../src/families/harmony-one/activitymenu.ts';
import { describeOneTourScreens } from '../../../src/families/harmony-one/tourscreens.ts';
import { describeOneDevicePages } from '../../../src/families/harmony-one/devicepages.ts';
import { describeOneClockHeader } from '../../../src/families/harmony-one/clockheader.ts';
import { oneActivityScreenModes } from '../../../src/families/harmony-one/activityscreens.ts';
import { oneActivityMenu } from '../../../src/families/harmony-one/activityscreen.ts';
import '../../../src/support/resources.node.ts';

/** The sixteen English Harmony One compiles of skin 54, `onewithouttour.test.ts`' list. */
const SKIN_54 = ONE_SKIN_54_FAMILY.full;
const DONOR = 'harvest_one_two_devices';

const containerOf = (name: string): Container => parse(new Uint8Array(require_(name)));
const keyOf = (one: { face: string; ink: number; shadow?: number | undefined }): string =>
  `${one.face} ${one.ink.toString(16)} ${one.shadow === undefined ? '-' : one.shadow.toString(16)}`;

/**
 * Per stated set, the role a builder's description reads it by: which builder and which of its fonts. The device
 * pages name a title font per device, every one the same set.
 */
const ROLES: readonly (readonly [string, string])[] = [
  ['firmware', 'body'], ['fixed', 'ok'], ['fixed', 'title'], ['menu', 'title'], ['menu', 'left'], ['menu', 'right'],
  ['fixed', 'count'], ['fixed', 'item'], ['fixed', 'key'], ['tour', 'tour'], ['tour', 'tourExit'], ['fixed', 'wide'],
  ['tour', 'tourTitle'], ['device', 'title'], ['device', 'count'], ['clock', 'clock'],
];

/** The set each role is drawn in on one compile, by the builders' own descriptions. */
function rolesOf(c: Container): Map<string, number> {
  const layout = takeApart(c);
  const fonts: Record<string, Record<string, number>> = {
    firmware: describeOneFirmwareScreens(c, layout).spec.fonts,
    fixed: describeOneFixedScreens(c, layout).spec.fonts,
    menu: describeOneActivityMenu(c, layout).spec.screen.fonts,
    tour: describeOneTourScreens(c, layout).spec.fonts,
    device: describeOneDevicePages(c, layout).spec.screen.fonts,
    clock: describeOneClockHeader(c, layout).spec.fonts,
  };
  const out = new Map<string, number>();
  for (const [what, roles] of Object.entries(fonts)) {
    for (const [role, set] of Object.entries(roles)) {
      const name = `${what} ${role.startsWith('title ') ? 'title' : role}`;
      const was = out.get(name);
      if (was !== undefined && was !== set) throw new Error(`${what}'s ${role} in set ${set} and set ${was}`);
      out.set(name, set);
    }
  }
  return out;
}

/** The roles whose set, as a description names it, measures as another face or colours than `stated` says. */
function misfits(c: Container, roles: ReadonlyMap<string, number>, stated: readonly OneFontSet[]): string[] {
  const map = characterMap(c)!;
  const sets = fontSets(c)!;
  return ROLES.flatMap(([what, role], k) => {
    const index = roles.get(`${what} ${role}`);
    return index === undefined || keyOf(measureSet(c, sets[index]!, map)) === keyOf(stated[k]!) ? [] : [`${what} ${role}`];
  });
}

test('each compile of skin 54 walked holds the sixteen stated sets, each found by its role, and the start up title set exactly where an activity is and the page count set where the menu or a working screen has several pages: the pair on a step, all sixteen and their census in the slow tier',
     skipUnless(...sampled(ONE_SKIN_54_FAMILY)), () => {
  const walked = sampled(ONE_SKIN_54_FAMILY);
  const orders = new Set<string>();
  const relative = new Set<string>();
  const totals = { sets: 0, startTitle: 0, pageCount: 0 };
  const unnamed: string[] = [];
  for (const name of walked) {
    const c = containerOf(name);
    const map = characterMap(c)!;
    const sets = fontSets(c)!;
    const measured = sets.map((set) => measureSet(c, set, map));
    const roles = rolesOf(c);
    // Each stated set is the one its role is drawn in, in the stated face and colours.
    assert.deepEqual(misfits(c, roles, ONE_FONT_SETS), [], name);
    const found = ROLES.map(([what, role]) => roles.get(`${what} ${role}`));
    // A role no description names on a compile, the device pages' where the inventory reads no device's mode, is
    // the one set left in its face and colours.
    const at = found.map((index, k) => {
      if (index !== undefined) return index;
      unnamed.push(`${name} ${ROLES[k]!.join(' ')}`);
      const left = measured.flatMap((one, n) => (!found.includes(n) && keyOf(one) === keyOf(ONE_FONT_SETS[k]!) ? [n] : []));
      assert.equal(left.length, 1, `${name}: ${ROLES[k]!.join(' ')}`);
      return left[0]!;
    });
    assert.equal(new Set(at).size, ONE_FONT_SETS.length, `${name}: two roles in one set`);
    orders.add(at.join(' '));
    relative.add(JSON.stringify([...at.keys()].sort((a, b) => at[a]! - at[b]!)));
    // The rest are the two content sets, each where its setup draws it.
    const rest = measured.filter((_, k) => !at.includes(k)).map(keyOf).sort();
    const { startups, workings } = oneActivityScreenModes(c);
    const records = modeRecords(c)!;
    const menu = oneActivityMenu(c)!;
    const paged = [menu, ...workings].some((mode) => (records[mode]?.pages.length ?? 0) > 1);
    const want = [
      ...(startups.length > 0 ? [keyOf(ONE_CONTENT_FONT_SETS.startTitle)] : []),
      ...(paged ? [keyOf(ONE_CONTENT_FONT_SETS.pageCount)] : []),
    ].sort();
    assert.deepEqual(rest, want, name);
    totals.sets += sets.length;
    if (startups.length > 0) totals.startTitle += 1;
    if (paged) totals.pageCount += 1;
    // Every set's header is the count at +1 and a zero after it, so its first code is 1.
    assert.ok(sets.every((set) => set.countAt === 1 && set.first === 1), name);
  }
  // One compile's inventory reads no name or mode for its two devices, so the device pages' description names no
  // font there.
  assert.deepEqual(unnamed, ['harvest_one_families_1 device title', 'harvest_one_families_1 device count']
    .filter((one) => walked.includes(one.split(' ')[0]!)));
  // The census of all sixteen, asserted when the slow tier walks all sixteen.
  if (walked.length === SKIN_54.length) {
    assert.deepEqual(totals, { sets: 279, startTitle: 12, pageCount: 11 });
    // Only the order moves: the sixteen sets alone sit in eight orders relative to each other, and with the places
    // the two content sets take the tables are in nine.
    assert.deepEqual([relative.size, orders.size], [8, 9]);
  }
  // The stated order is the two device compile's.
  const donorRoles = rolesOf(containerOf(DONOR));
  assert.deepEqual(ROLES.map(([what, role]) => donorRoles.get(`${what} ${role}`)), ONE_FONT_SETS.map((_, k) => k));
});

test('the census refuses a wrong statement: set 13 with the grey shadow is not what the device titles are drawn in', skipUnless(DONOR), () => {
  const c = containerOf(DONOR);
  const wrong = [...ONE_FONT_SETS];
  wrong[13] = { ...wrong[13]!, shadow: 0x31a6 };
  assert.deepEqual(misfits(c, rolesOf(c), wrong), ['device title']);
});

test('every compile of skin 54 hands out its first 60 codes in one order, the 61st differing between them, and ours keeps those 60',
     skipUnless(...SKIN_54), () => {
  const next = new Set<string>();
  for (const name of SKIN_54) {
    const map = characterMap(containerOf(name))!;
    const codes = Array.from({ length: ONE_FIXED_CODES }, (_, k) => map.codes.get(k + 1));
    assert.deepEqual(codes, ONE_GLYPH_ORDER.slice(0, ONE_FIXED_CODES), name);
    next.add(map.codes.get(ONE_FIXED_CODES + 1)!);
  }
  assert.equal(ONE_FIXED_CODES, 60);
  assert.deepEqual([...next].sort(), [',', '?', 'V', 'x']);
});

test('our code order gives every printable character one code, Logitech\'s first 60 then ASCII order, and no title joiner', () => {
  assert.equal(ONE_GLYPH_ORDER.length, 95);
  assert.equal(new Set(ONE_GLYPH_ORDER).size, 95);
  assert.ok(!ONE_GLYPH_ORDER.includes(TITLE_JOINER));
  assert.equal(ONE_GLYPH_ORDER[29], ' ');
  const tail = ONE_GLYPH_ORDER.slice(ONE_FIXED_CODES);
  assert.deepEqual(tail, [...tail].sort());
  assert.throws(() => buildOneFontTable(ONE_CHOICES, { characters: [...ONE_GLYPH_ORDER.slice(0, -1), 'H'] }), /one code/);
});

/** Logitech's donor with base slot 7 replaced by a stated table built in the donor's code order. */
function statedOnDonor(sets: readonly OneFontSet[] = ONE_FONT_SETS): { bytes: Uint8Array; faces: unknown } {
  const c = containerOf(DONOR);
  const highest = Math.max(...fontSets(c)!.map((set) => set.first + set.count - 1));
  const built = buildOneFontTable(ONE_CHOICES, { sets, characters: donorGlyphOrder(characterMap(c)!, highest) });
  const layout = takeApart(c);
  const section = layout.sections[IMAGE_TABLE_SLOT]!;
  const table = section.head[0]!;
  table.bytes = built.table.bytes;
  table.refs = built.table.refs;
  section.before = [...built.glyphs, ...built.sets];
  return { bytes: layOutContainer(layout).bytes, faces: built.faces };
}

test('the stated table in the donor\'s code order lays out to the lettered donor byte for byte, with its faces',
     skipUnless(DONOR), () => {
  const lettered = letterOneDonor(containerOf(DONOR), ONE_CHOICES);
  const ours = statedOnDonor();
  assert.equal(ours.bytes.length, lettered.bytes.length);
  assert.ok(Buffer.from(ours.bytes).equals(Buffer.from(lettered.bytes)));
  assert.deepEqual(ours.faces, lettered.faces);
  // 18 sets of 95 codes: the sixteen stated and the two added, the table's section 183518 bytes.
  const c = parse(lettered.bytes);
  const sets = fontSets(c)!;
  assert.deepEqual([sets.length, ...new Set(sets.map((set) => set.count))], [ONE_FONT_SETS.length + ONE_ADDED_SETS.length, 95]);
  const section = takeApart(c).sections[IMAGE_TABLE_SLOT]!;
  assert.equal([...section.before, ...section.head].reduce((sum, one) => sum + one.bytes.length, 0), 183518);
});

test('a wrong set in the statement changes the table: two sets swapped or one shadow changed, and two sets alike swap unseen',
     skipUnless(DONOR), () => {
  const lettered = letterOneDonor(containerOf(DONOR), ONE_CHOICES).bytes;
  const same = (sets: OneFontSet[]): boolean => Buffer.from(statedOnDonor(sets).bytes).equals(Buffer.from(lettered));
  const swapped = (a: number, b: number): OneFontSet[] => {
    const sets = [...ONE_FONT_SETS];
    [sets[a], sets[b]] = [sets[b]!, sets[a]!];
    return sets;
  };
  assert.equal(same(swapped(3, 8)), false);
  const shadowed = [...ONE_FONT_SETS];
  shadowed[13] = { ...shadowed[13]!, shadow: 0x31a6 };
  assert.equal(same(shadowed), false);
  // The fixed screens' OK and the rows' set are one face in one pair of colours, so only the census above tells
  // them apart, by the screens that select each.
  assert.equal(same(swapped(1, 7)), true);
});

test('the table built from nothing holds the same letters as the donor\'s, set for set, in our code order', skipUnless(DONOR), () => {
  const empty = buildOneFontTable(ONE_CHOICES);
  assert.equal(empty.sets.length, 18);
  assert.equal(empty.glyphs.length, 18 * 95);
  const size = [empty.table, ...empty.sets, ...empty.glyphs].reduce((sum, one) => sum + one.bytes.length, 0);
  assert.equal(size, 183518);
  // Set for set, each character drawn in the same bytes as in the lettered donor, whatever its code there.
  const c = parse(letterOneDonor(containerOf(DONOR), ONE_CHOICES).bytes);
  const map = characterMap(c)!;
  const codeOf = new Map([...map.codes].map(([code, ch]) => [ch, code]));
  const sets = fontSets(c)!;
  let compared = 0;
  empty.sets.forEach((set, k) => {
    set.refs.forEach((ref, n) => {
      const glyph = glyphOf(c, sets[k]!, codeOf.get(ONE_GLYPH_ORDER[n]!)!);
      const at = c.blobOffsetOf(sets[k]!.glyphs[codeOf.get(ONE_GLYPH_ORDER[n]!)! - 1]!)!;
      assert.ok('to' in ref && glyph !== undefined);
      assert.ok(Buffer.from(c.blob.subarray(at, at + ref.to.bytes.length)).equals(Buffer.from(ref.to.bytes)), `set ${k} '${ONE_GLYPH_ORDER[n]}'`);
      compared += 1;
    });
  });
  assert.equal(compared, 1710);
});
