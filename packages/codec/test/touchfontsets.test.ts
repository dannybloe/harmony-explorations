/**
 * The Harmony One's font table stated rather than read off a donor, `todo-compile-one.md` 7.1.1, findings section 427.
 *
 * Three claims. The sixteen English compiles of skin 54 hold sixteen sets in common, each found by the role a
 * builder's description reads and each the face and colours `TOUCH_FONT_SETS` states, and two more exactly where
 * their setup draws them; every set's header is in one form; and the first 60 codes are handed out in one order.
 * `buildTouchFontTable`, from the statement and the donor's code order, lays out to the bytes `letterTouchDonor`
 * gives Logitech's compile of two devices, with the same faces, and a wrong set changes them. The composed setup's
 * 33 sets are those 18 and the look's 15 blended copies, `composesetup.test.ts`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import { type Container, layOutContainer, modeRecords, parse, takeApart } from '../src/index.ts';
import { IMAGE_TABLE_SLOT, fontSets, glyphOf } from '../src/font.ts';
import { measureSet } from '../src/fonttable.ts';
import { characterMap } from '../src/text.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import { letterTouchDonor } from '../src/families/touch/look.ts';
import {
  TOUCH_ADDED_SETS, TOUCH_CONTENT_FONT_SETS, TOUCH_FIXED_CODES, TOUCH_FONT_SETS, TOUCH_GLYPH_ORDER, type TouchFontSet,
  buildTouchFontTable, donorGlyphOrder,
} from '../src/families/touch/fontsets.ts';
import { TITLE_JOINER } from '../src/families/touch/screentexts.ts';
import { describeTouchFirmwareScreens } from '../src/families/touch/firmwarescreens.ts';
import { describeTouchFixedScreens } from '../src/families/touch/fixedscreens.ts';
import { describeTouchActivityMenu } from '../src/families/touch/activitymenu.ts';
import { describeTouchTourScreens } from '../src/families/touch/tourscreens.ts';
import { describeTouchDevicePages } from '../src/families/touch/devicepages.ts';
import { describeTouchClockHeader } from '../src/families/touch/clockheader.ts';
import { touchActivityScreenModes } from '../src/families/touch/activityscreens.ts';
import { touchActivityMenu } from '../src/families/touch/activityscreen.ts';

/** The sixteen English Harmony One compiles of skin 54, `touchwithouttour.test.ts`' list. */
const SKIN_54 = [
  'harvest_one_two_devices', 'one_spare_after_sync', 'one_spare_myharmony', 'one_spare_20260830', 'calibration_one',
  'calibration_favchannels', 'calibration_favzero', 'compiled_protocols', 'compiled_protocols_2', 'compiled_protocols_3',
  'harvest_one_families_1', 'harvest_one_families_2', 'harvest_one_families_3', 'one_friend_legacy_sync_config',
  'phase7_before', 'phase7_after',
] as const;
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
    firmware: describeTouchFirmwareScreens(c, layout).spec.fonts,
    fixed: describeTouchFixedScreens(c, layout).spec.fonts,
    menu: describeTouchActivityMenu(c, layout).spec.screen.fonts,
    tour: describeTouchTourScreens(c, layout).spec.fonts,
    device: describeTouchDevicePages(c, layout).spec.screen.fonts,
    clock: describeTouchClockHeader(c, layout).spec.fonts,
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
function misfits(c: Container, roles: ReadonlyMap<string, number>, stated: readonly TouchFontSet[]): string[] {
  const map = characterMap(c)!;
  const sets = fontSets(c)!;
  return ROLES.flatMap(([what, role], k) => {
    const index = roles.get(`${what} ${role}`);
    return index === undefined || keyOf(measureSet(c, sets[index]!, map)) === keyOf(stated[k]!) ? [] : [`${what} ${role}`];
  });
}

test('the sixteen compiles of skin 54 hold the sixteen stated sets, each found by its role, and the start up title set exactly where an activity is and the page count set where the menu or a working screen has several pages',
     skipUnless(...SKIN_54), () => {
  const orders = new Set<string>();
  const relative = new Set<string>();
  const totals = { sets: 0, startTitle: 0, pageCount: 0 };
  const unnamed: string[] = [];
  for (const name of SKIN_54) {
    const c = containerOf(name);
    const map = characterMap(c)!;
    const sets = fontSets(c)!;
    const measured = sets.map((set) => measureSet(c, set, map));
    const roles = rolesOf(c);
    // Each stated set is the one its role is drawn in, in the stated face and colours.
    assert.deepEqual(misfits(c, roles, TOUCH_FONT_SETS), [], name);
    const found = ROLES.map(([what, role]) => roles.get(`${what} ${role}`));
    // A role no description names on a compile, the device pages' where the inventory reads no device's mode, is
    // the one set left in its face and colours.
    const at = found.map((index, k) => {
      if (index !== undefined) return index;
      unnamed.push(`${name} ${ROLES[k]!.join(' ')}`);
      const left = measured.flatMap((one, n) => (!found.includes(n) && keyOf(one) === keyOf(TOUCH_FONT_SETS[k]!) ? [n] : []));
      assert.equal(left.length, 1, `${name}: ${ROLES[k]!.join(' ')}`);
      return left[0]!;
    });
    assert.equal(new Set(at).size, TOUCH_FONT_SETS.length, `${name}: two roles in one set`);
    orders.add(at.join(' '));
    relative.add(JSON.stringify([...at.keys()].sort((a, b) => at[a]! - at[b]!)));
    // The rest are the two content sets, each where its setup draws it.
    const rest = measured.filter((_, k) => !at.includes(k)).map(keyOf).sort();
    const { startups, workings } = touchActivityScreenModes(c);
    const records = modeRecords(c)!;
    const menu = touchActivityMenu(c)!;
    const paged = [menu, ...workings].some((mode) => (records[mode]?.pages.length ?? 0) > 1);
    const want = [
      ...(startups.length > 0 ? [keyOf(TOUCH_CONTENT_FONT_SETS.startTitle)] : []),
      ...(paged ? [keyOf(TOUCH_CONTENT_FONT_SETS.pageCount)] : []),
    ].sort();
    assert.deepEqual(rest, want, name);
    totals.sets += sets.length;
    if (startups.length > 0) totals.startTitle += 1;
    if (paged) totals.pageCount += 1;
    // Every set's header is the count at +1 and a zero after it, so its first code is 1.
    assert.ok(sets.every((set) => set.countAt === 1 && set.first === 1), name);
  }
  assert.deepEqual(totals, { sets: 279, startTitle: 12, pageCount: 11 });
  // One compile's inventory reads no name or mode for its two devices, so the device pages' description names no
  // font there.
  assert.deepEqual(unnamed, ['harvest_one_families_1 device title', 'harvest_one_families_1 device count']);
  // Only the order moves: the sixteen sets alone sit in eight orders relative to each other, and with the places
  // the two content sets take the tables are in nine.
  assert.deepEqual([relative.size, orders.size], [8, 9]);
  // The stated order is the two device compile's.
  const donorRoles = rolesOf(containerOf(DONOR));
  assert.deepEqual(ROLES.map(([what, role]) => donorRoles.get(`${what} ${role}`)), TOUCH_FONT_SETS.map((_, k) => k));
});

test('the census refuses a wrong statement: set 13 with the grey shadow is not what the device titles are drawn in', skipUnless(DONOR), () => {
  const c = containerOf(DONOR);
  const wrong = [...TOUCH_FONT_SETS];
  wrong[13] = { ...wrong[13]!, shadow: 0x31a6 };
  assert.deepEqual(misfits(c, rolesOf(c), wrong), ['device title']);
});

test('every compile of skin 54 hands out its first 60 codes in one order, the 61st differing between them, and ours keeps those 60',
     skipUnless(...SKIN_54), () => {
  const next = new Set<string>();
  for (const name of SKIN_54) {
    const map = characterMap(containerOf(name))!;
    const codes = Array.from({ length: TOUCH_FIXED_CODES }, (_, k) => map.codes.get(k + 1));
    assert.deepEqual(codes, TOUCH_GLYPH_ORDER.slice(0, TOUCH_FIXED_CODES), name);
    next.add(map.codes.get(TOUCH_FIXED_CODES + 1)!);
  }
  assert.equal(TOUCH_FIXED_CODES, 60);
  assert.deepEqual([...next].sort(), [',', '?', 'V', 'x']);
});

test('our code order gives every printable character one code, Logitech\'s first 60 then ASCII order, and no title joiner', () => {
  assert.equal(TOUCH_GLYPH_ORDER.length, 95);
  assert.equal(new Set(TOUCH_GLYPH_ORDER).size, 95);
  assert.ok(!TOUCH_GLYPH_ORDER.includes(TITLE_JOINER));
  assert.equal(TOUCH_GLYPH_ORDER[29], ' ');
  const tail = TOUCH_GLYPH_ORDER.slice(TOUCH_FIXED_CODES);
  assert.deepEqual(tail, [...tail].sort());
  assert.throws(() => buildTouchFontTable(TOUCH_CHOICES, { characters: [...TOUCH_GLYPH_ORDER.slice(0, -1), 'H'] }), /one code/);
});

/** Logitech's donor with base slot 7 replaced by a stated table built in the donor's code order. */
function statedOnDonor(sets: readonly TouchFontSet[] = TOUCH_FONT_SETS): { bytes: Uint8Array; faces: unknown } {
  const c = containerOf(DONOR);
  const highest = Math.max(...fontSets(c)!.map((set) => set.first + set.count - 1));
  const built = buildTouchFontTable(TOUCH_CHOICES, { sets, characters: donorGlyphOrder(characterMap(c)!, highest) });
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
  const lettered = letterTouchDonor(containerOf(DONOR), TOUCH_CHOICES);
  const ours = statedOnDonor();
  assert.equal(ours.bytes.length, lettered.bytes.length);
  assert.ok(Buffer.from(ours.bytes).equals(Buffer.from(lettered.bytes)));
  assert.deepEqual(ours.faces, lettered.faces);
  // 18 sets of 95 codes: the sixteen stated and the two added, the table's section 183518 bytes.
  const c = parse(lettered.bytes);
  const sets = fontSets(c)!;
  assert.deepEqual([sets.length, ...new Set(sets.map((set) => set.count))], [TOUCH_FONT_SETS.length + TOUCH_ADDED_SETS.length, 95]);
  const section = takeApart(c).sections[IMAGE_TABLE_SLOT]!;
  assert.equal([...section.before, ...section.head].reduce((sum, one) => sum + one.bytes.length, 0), 183518);
});

test('a wrong set in the statement changes the table: two sets swapped or one shadow changed, and two sets alike swap unseen',
     skipUnless(DONOR), () => {
  const lettered = letterTouchDonor(containerOf(DONOR), TOUCH_CHOICES).bytes;
  const same = (sets: TouchFontSet[]): boolean => Buffer.from(statedOnDonor(sets).bytes).equals(Buffer.from(lettered));
  const swapped = (a: number, b: number): TouchFontSet[] => {
    const sets = [...TOUCH_FONT_SETS];
    [sets[a], sets[b]] = [sets[b]!, sets[a]!];
    return sets;
  };
  assert.equal(same(swapped(3, 8)), false);
  const shadowed = [...TOUCH_FONT_SETS];
  shadowed[13] = { ...shadowed[13]!, shadow: 0x31a6 };
  assert.equal(same(shadowed), false);
  // The fixed screens' OK and the rows' set are one face in one pair of colours, so only the census above tells
  // them apart, by the screens that select each.
  assert.equal(same(swapped(1, 7)), true);
});

test('the table built from nothing holds the same letters as the donor\'s, set for set, in our code order', skipUnless(DONOR), () => {
  const empty = buildTouchFontTable(TOUCH_CHOICES);
  assert.equal(empty.sets.length, 18);
  assert.equal(empty.glyphs.length, 18 * 95);
  const size = [empty.table, ...empty.sets, ...empty.glyphs].reduce((sum, one) => sum + one.bytes.length, 0);
  assert.equal(size, 183518);
  // Set for set, each character drawn in the same bytes as in the lettered donor, whatever its code there.
  const c = parse(letterTouchDonor(containerOf(DONOR), TOUCH_CHOICES).bytes);
  const map = characterMap(c)!;
  const codeOf = new Map([...map.codes].map(([code, ch]) => [ch, code]));
  const sets = fontSets(c)!;
  let compared = 0;
  empty.sets.forEach((set, k) => {
    set.refs.forEach((ref, n) => {
      const glyph = glyphOf(c, sets[k]!, codeOf.get(TOUCH_GLYPH_ORDER[n]!)!);
      const at = c.blobOffsetOf(sets[k]!.glyphs[codeOf.get(TOUCH_GLYPH_ORDER[n]!)! - 1]!)!;
      assert.ok('to' in ref && glyph !== undefined);
      assert.ok(Buffer.from(c.blob.subarray(at, at + ref.to.bytes.length)).equals(Buffer.from(ref.to.bytes)), `set ${k} '${TOUCH_GLYPH_ORDER[n]}'`);
      compared += 1;
    });
  });
  assert.equal(compared, 1710);
});
