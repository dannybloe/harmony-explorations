/**
 * The test setup composed onto a Logitech compile for the Harmony One, `composeSetup`, `todo-compile-one.md` 1.2:
 * since 1.2.11.2.7 the family's look runs inside it, the donor lettered first and the rest over the composed
 * file, where a lab script used to run those steps after it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { IR_ARCHIVE, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import {
  type ComposedSetup, type Container, SCREEN_OWNERS, archSlot, claims, composeSetup, deviceModeMaps, modeRecords, parse, pointers,
  readRecipe, screenUnits, taggedList, touchPages,
} from '../src/index.ts';
import { characterMap } from '../src/text.ts';
import { timers } from '../src/tables.ts';
import { touchScreenLightTimer } from '../src/families/touch/screenlight.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import { TOUCH_BUILT, type TouchBuiltBytes, touchBuiltBytes } from '../src/families/touch/builders.ts';
import { describeTouchHelpScreens, touchHelpScreenModes } from '../src/families/touch/helpscreens.ts';
import { takeApart } from '../src/frame.ts';
import { dropLists } from '../src/assemble.ts';
import { listsReached } from './screenlists.ts';

const recipe = () => readRecipe(JSON.parse(readFileSync(new URL('../../corpus/setups/one-test.json', import.meta.url), 'utf8')));

// Either missing skips a test; spreading the two would let the second's `false` hide the first's reason.
const NEEDS = { skip: skipUnless('harvest_one_two_devices').skip || skipWithoutIrArchive().skip };

/** The composition, once for every test here: it takes about a minute. */
let composedOnce: ComposedSetup | undefined;
const composed = (): ComposedSetup => {
  composedOnce ??= composeSetup(recipe(), { donor: require_('harvest_one_two_devices'), archive: IR_ARCHIVE!, builtAt: '2026-10-15T12:00:00' });
  return composedOnce;
};

test('the One test setup composed onto Logitech\'s compile of two devices comes out lettered in ours, in the family\'s look, with every check passing',
     NEEDS, () => {
  const out = composed();
  const c = out.container;
  // The look's two halves, in place: lettered before anything is composed, the look after, the stamp last.
  const names = out.steps.map((one) => one.step);
  assert.deepEqual([names[0], names[1], names.at(-2), names.at(-1)], ['donor', 'lettered', 'look', 'stamped']);
  assert.ok(c.allChecksPass);
  assert.equal(characterMap(c)?.alphabet, 'oxanium');
  // The screen light at the family's default.
  assert.equal(timers(c)!.records[touchScreenLightTimer(c)!]!.duration, TOUCH_CHOICES.screenLightSeconds);
  // Every device page whose hit page offers the keys below the screen binds both, the composed ones included,
  // section 401: seven devices, the two the donor held and the five composed.
  const records = modeRecords(c)!;
  const hits = touchPages(c)!;
  const modes = [...new Set(deviceModeMaps(c).map((one) => one.mode))];
  assert.equal(modes.length, 7);
  for (const mode of modes) {
    for (const page of records[mode]!.pages) {
      const codes = (hits.records[page.lead!]?.areas ?? []).map((area) => area.code);
      if (!codes.includes(43) || !codes.includes(44)) continue;
      const bound = (taggedList(c, page.list)?.entries ?? []).filter((one) => [0x80 | 43, 0x80 | 44].includes(one.tag) && one.opcode !== 0);
      assert.equal(bound.length, 2, `mode ${mode}`);
    }
  }
  // Every row's list opens with the click, as Logitech's do, section 404: the donor's two devices and the five
  // composed, 125 rows and 100.
  const lists = c.actionLists()!;
  let rows = 0;
  for (const mode of modes) {
    for (const page of records[mode]!.pages) {
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        const scan = entry.tag & 0x3f;
        if (entry.opcode !== 0x7f || scan === 43 || scan === 44) continue;
        rows += 1;
        assert.deepEqual([lists[entry.operand]?.[0]?.opcode, lists[entry.operand]?.[0]?.operand], [0x75, 0x0fca],
                         `mode ${mode} scan ${scan}`);
      }
    }
  }
  assert.equal(rows, 225);
  // And no binding of any page clicks twice: an activity screen's pad clicks itself and calls the command under
  // the device page's click, and a sequence's key copy, which has none, section 404. Logitech's compiles hold none.
  const clicks = (at: number, seen: Set<number>): number => {
    if (seen.has(at)) return 0;
    seen.add(at);
    return (lists[at] ?? []).reduce((sum, one) => sum + (one.opcode === 0x75 && one.operand === 0x0fca ? 1
      : one.opcode === 0x7f ? clicks(one.operand, seen) : 0), 0);
  };
  const twice = records.flatMap((record, mode) => (record?.pages ?? []).flatMap((page) => (taggedList(c, page.list)?.entries ?? [])
    .filter((one) => one.opcode === 0x7f && clicks(one.operand, new Set()) > 1).map((one) => `${mode}:${one.tag & 0x3f}`)));
  assert.deepEqual(twice, []);
  // Its length is pinned so a change shows here first: 1750855 until each composed row got its click, section 404,
  // and 1751852 once the Radio sequence's pad took the key copy, without a click of its own. 1751962 since
  // `todo-compile-one.md` 3.2.2.3, 110 bytes more: the activity composer gives each of the five activities a case in
  // the unread copy of the Devices record as Logitech's compiles do, five bytes of case and five of program each, 50,
  // and enters every case it makes in base slot 11's table, the five unread ones and the fifteen it made before,
  // three bytes an entry, 60, section 416. 1756549 since 3.2.2.4, 4587 bytes more: the power off help asks about
  // the five composed devices too, all five having a power variable, section 415: four screens each, 20, with
  // their 160 lists, 4038, and their entries in the mode table and base slot 10, three bytes each, 540; the attempt
  // screen resending the two of them sent unasked, two instructions, 6; and the attempt line broken in two in our
  // letters, 3, the "If not" paragraph flowing onto three lines as Logitech's does.
  assert.equal(c.blob.length, 1756549);
});

// ---------------------------------------------------------------------------------------------------------
// What the composed setup still carries out of its donor, `todo-compile-one.md` 3.2's listing.

/**
 * The bytes nothing on the composed path takes from the donor: the frame computes the header, the section table,
 * the marker, the architecture record, the clock section and the trailer (6.1), and the letterer writes every
 * glyph set (1.2.7), 22 of whose glyphs on this donor, a space in nine sets and shapes such as `.` and `I`, come
 * out byte for byte as Logitech's.
 */
const NEVER_CARRIED = new Set(['header', 'section-table', 'marker', 'trailer', 'slot-1-arch', 'slot-3-clock', 'glyph', 'font-set']);

interface Unit { kind: string; key: string; skeleton: string; bytes: number }

/**
 * A configuration cut into units: its screen bytes as `screenUnits` cuts them, keyed by the verbatim form (where a
 * thing sits abstracted), and every other byte by the first claim of `coverage.ts` that holds it, keyed by its
 * bytes with every address field the census knows zeroed. A unit's skeleton is its key with the texts, fonts,
 * text positions and pictures abstracted, which is what is left of a screen once ours are put in.
 *
 * `built`, per byte, is nonzero where a builder on the composed path reproduces the byte, `touchBuiltBytes`, since
 * `todo-compile-one.md` 3.2.2: a unit counts only its bytes no builder reproduces, and a unit every byte of which
 * a builder reproduces is left out, so it neither counts nor takes a donor unit a carried one could match. A
 * builder's part comes out byte for byte as Logitech's in places, the wiring whole, and only this tells it from
 * the donor's.
 */
function unitsOf(c: Container, built?: Uint8Array): Unit[] {
  const out: Unit[] = [];
  const owned = new Uint8Array(c.blob.length);
  const left = (from: number, to: number): number => {
    let n = 0;
    for (let i = from; i < to; i += 1) if (built === undefined || built[i] === 0) n += 1;
    return n;
  };
  for (const unit of screenUnits(c)!) {
    const skeleton = unit.verbatim
      .replace(/(^|[ :|#[])(4|5)\(([0-9a-f]{4})\)[0-9a-f]*/g, '$1T').replace(/F\d+/g, 'F').replace(/@pic:[0-9a-f?]+/g, '@pic');
    for (const range of unit.ranges) owned.fill(1, range.start, range.start + range.length);
    const bytes = unit.ranges.reduce((n, range) => n + left(range.start, range.start + range.length), 0);
    if (bytes === 0) continue;
    out.push({ kind: unit.kind === 'mode' ? `mode ${unit.role}` : unit.kind, key: `${unit.kind}|${unit.verbatim}`,
               skeleton: `${unit.kind}|${skeleton}`, bytes });
  }
  const zeroed = c.blob.slice();
  for (const field of pointers(c)) zeroed.fill(0, field.at, field.at + 3);
  for (const claim of claims(c)) {
    if (SCREEN_OWNERS.has(claim.owner)) continue;
    let fresh = 0;
    for (let i = claim.start; i < claim.start + claim.length; i += 1) {
      if (owned[i] === 0) {
        owned[i] = 1;
        if (built === undefined || built[i] === 0) fresh += 1;
      }
    }
    if (fresh === 0) continue;
    const key = `${claim.owner}|${Buffer.from(zeroed.subarray(claim.start, claim.start + claim.length)).toString('hex')}`;
    out.push({ kind: claim.owner, key, skeleton: key, bytes: fresh });
  }
  // Every byte is claimed, so nothing is left out of the count below by being in no unit.
  assert.equal(owned.indexOf(0), -1);
  return out;
}

/**
 * The output's bytes per kind whose unit the donor holds: verbatim first, then by skeleton among the donor's units
 * not taken, each donor unit taken once. `built` is the output's bytes a builder reproduces, which are not carried.
 */
function carried(out: Container, donor: Container, built?: Uint8Array): Record<string, number> {
  const tally = (units: Unit[], field: 'key' | 'skeleton'): Map<string, number> => {
    const m = new Map<string, number>();
    for (const one of units) m.set(one[field], (m.get(one[field]) ?? 0) + 1);
    return m;
  };
  const theirs = unitsOf(donor);
  const keys = tally(theirs, 'key');
  const skeletons = tally(theirs, 'skeleton');
  const result: Record<string, number> = {};
  const take = (one: Unit): void => { result[one.kind] = (result[one.kind] ?? 0) + one.bytes; };
  const rest: Unit[] = [];
  for (const one of unitsOf(out, built).filter((unit) => !NEVER_CARRIED.has(unit.kind))) {
    const left = keys.get(one.key) ?? 0;
    if (left === 0) { rest.push(one); continue; }
    keys.set(one.key, left - 1);
    skeletons.set(one.skeleton, (skeletons.get(one.skeleton) ?? 0) - 1);
    take(one);
  }
  for (const one of rest) {
    const left = skeletons.get(one.skeleton) ?? 0;
    if (left <= 0) continue;
    skeletons.set(one.skeleton, left - 1);
    take(one);
  }
  return result;
}

/** What the builders on the composed path reproduce of the composed setup, measured on it once: about half a minute. */
let builtOnce: TouchBuiltBytes | undefined;
const builtBytes = (): TouchBuiltBytes => {
  builtOnce ??= touchBuiltBytes(composed().container, composed().blended);
  return builtOnce;
};

test('todo-compile-one 3.2.2: the firmware screens, the fixed screens, the tour and Remote Assistant, the status screens, the clock header, the help screens, the case programs, the hit pages, the wiring, the state tables, raw slot 18 and base slot 16\'s table of the composed setup come out of the touch family\'s builders, run on the composed path and measured on the result',
     NEEDS, () => {
  const out = composed();
  // On the path: one step after the composers and before the look, naming the twelve parts in the order built.
  const names = out.steps.map((one) => one.step);
  assert.equal(out.steps.find((one) => one.step === 'built')?.detail, TOUCH_BUILT.join(', '));
  assert.ok(names.indexOf('activity composed') < names.indexOf('built') && names.indexOf('built') < names.indexOf('look'));
  // The look blended our letters for thirteen backgrounds, and a screen's description reads the result only with
  // those selects pointed back: as the look left it, the firmware screens' body text is in two fonts.
  assert.equal(out.blended.length, 13);
  assert.throws(() => touchBuiltBytes(out.container, []), /firmware screens: the firmware screens select two fonts for one role/);
  // Measured on the finished file, no memory of the path: each part described, rebuilt and held to the file byte
  // for byte, through the look's blending and centring; then its bytes, and of those the description's.
  const a = builtBytes();
  // The status screens' 3872 and the clock header's 3558 are the figures 3.2.1 listed for them, the clock header's
  // being its four programs' 3516 and its six lists' 42; its sixteen pictures and base slot 11's table are not in it.
  // The case programs' 572, since 3.2.2.3, are their 25 programs, 341, their seven lists, 82, the six toggles' and
  // the all off's, and base slot 11's table, 149, its 49 entries the clock header's four, the 25 and four cases for
  // each of the five composed activities. The hit pages' 2013 are the 23 pages the fixed screens name, 1898, and
  // the touch map's table over all 38 pages, 115. The state tables' rose by 25 with them, the five cases the unread
  // copy of the Devices record took.
  //
  // The help screens' 6245, since 3.2.2.4, are the chain of seven devices, 30 screens and their 236 lists: the
  // donor's ten screens and 76 lists, 2198 on the donor, and the composed five's 20 and 160, section 415.
  //
  // Raw slot 18's 2 and base slot 16's 1, since `todo-compile-one.md` 6.7, are the two zero bytes every One
  // container holds and the number sender table's count of zero, the composers making no favourite channel sent
  // as a number; neither reads a byte as a value.
  //
  // The firmware screens', the fixed screens', the tour's and the wiring's rose by 138, 1193, 115 and 98 with
  // `todo-compile-one.md` 6.5, section 418: the lists below the screens that the wiring does not build, 183 lists,
  // and the 14 the wiring's own variables' transitions call. 1544 bytes, where the carried lists below came down by
  // 1347: the other 197 are 17 lists below the clock pickers' tag `0x29` handlers, which name a state variable the
  // composed path renumbered (`0x29` on the donor, `0x37` here), so they matched no donor list and were never carried.
  assert.deepEqual(a.generated, {
    'firmware screens': 3237, 'fixed screens': 14332, 'tour and Remote Assistant': 4015, 'status screens': 3872,
    'clock header': 3558, 'help screens': 6245, 'case programs': 572, 'hit pages': 2013, wiring: 4625, 'state tables': 2347,
    'raw slot 18': 2, 'number senders': 1,
  });
  // 401, 3967, 680 and 1243 for the four before 6.5: what a list below reads is the numbers of the lists it calls
  // and of the variables it writes, and the tour's setting, one byte.
  assert.deepEqual(a.described, {
    'firmware screens': 439, 'fixed screens': 4038, 'tour and Remote Assistant': 719, 'status screens': 699,
    'clock header': 337, 'help screens': 1994, 'case programs': 33, 'hit pages': 0, wiring: 1274, 'state tables': 0,
    'raw slot 18': 0, 'number senders': 0,
  });
  // The help screens' 1994 against 660 on the donor are the numbers and names of a chain of seven rather than two:
  // nearly every operand of a question's eight lists is a number the configuration chose, section 415, and so is
  // read, however the numbers were come by.
  // The case programs' 33 are section 416's 24 numbers, one per power variable the all off writes, seven here, the
  // donor's two and the five composed, and two for its list. The hit pages' description reads 23 bytes, the leads of
  // the screen pages that name them, none of them inside the pages it builds, so none of its bytes is described.
});

test('todo-compile-one 3.2.2.4: the composed setup\'s power off help asks about its seven devices, the donor\'s two and then the five composed in the order composed, each discrete one sent unasked and each toggle not',
     NEEDS, () => {
  const out = composed();
  const c = out.container;
  // Every composed device has a power variable, so every one is asked about, section 415; after the donor's own,
  // in the order composed, a choice of ours. The catalogue states the Plasma and the Switch discrete and the KPN,
  // Kodi and the Sony HT toggles, so only the first two are sent unasked, by the measured rule and its exception.
  assert.deepEqual(out.composed.devices, ['Plasma', 'KPN', 'Kodi', 'Switch', 'Sony HT']);
  const d = describeTouchHelpScreens(c, takeApart(c));
  assert.deepEqual(d.spec.devices.map((one) => `${one.name}: ${one.resend ? 'sent unasked' : 'asked'}`), [
    'Denon AVR-X4800H: sent unasked', 'LG OLED65G26LA: sent unasked', 'Plasma: sent unasked', 'KPN: asked', 'Kodi: asked',
    'Switch: sent unasked', 'Sony HT: asked',
  ]);
  // 4n + 2 screens, the donor's ten where they were and the twenty new ones the next free modes in chain order.
  const modes = touchHelpScreenModes(c).modes;
  assert.equal(modes.length, 30);
  assert.deepEqual(modes.slice(10), Array.from({ length: 20 }, (_, k) => 108 + k));
  assert.equal(modeRecords(c)!.length, 128);
});

test('todo-compile-one 3.2: the One\'s composed test setup carries 1123624 of its 1756549 bytes out of Logitech\'s donor, per kind as pinned here, a list that may only shrink',
     NEEDS, () => {
  const out = composed().container;
  const got = carried(out, parse(require_('harvest_one_two_devices')), builtBytes().owners);
  // Each kind with the item that builds it, `todo-compile-one.md` 3.2. A builder joining the composed path
  // lowers its row; a row that rises is a composer that started copying. 1162052 when 3.2.1 listed it; 3.2.2's
  // first step put the firmware screens, the fixed screens, the tour and Remote Assistant, the wiring and the state
  // tables on the path, 25072 bytes, the sum 3.2.1 listed for the five: `mode system` and every row of base slots 2,
  // 4, 8, 9, 12, 13, 14 and 15 went, and `mode other`, `mode status` and the lists came down. Its second step,
  // 3.2.2.2, put the status screens and the clock header there, 7430 bytes: `mode status` went, 3379, the status
  // screens' 3872 less their 493 list bytes, and so did `dynamic-program`, the clock header's four programs, 3516,
  // and the lists came down by the status screens' 493 and the clock's 42. Its third, 3.2.2.3, put the case
  // programs and the hit pages the fixed screens name there, 2378 bytes: `table`, base slot 11's, went, 89, the case
  // programs came down by their 25 programs' 341, the lists by the six toggles' 60 (the all off's list is the device
  // composer's, written and never carried) and the hit pages by the 23 pages' 1898. Its fourth, 3.2.2.4, put the
  // power off help there, 2198 bytes: `mode other` went, 1495, which was the help screens' ten alone, and the lists
  // came down by their 76, 703, section 415. Its fifth, 3.2.2.5, put the lists below the screens there, section
  // 418: the lists came down by 1347, 180 lists: the 166 below the firmware screens, the fixed screens and the
  // tour that matched a donor list, and the 14 the wiring's variables' transitions call. 197 bytes more are built than that,
  // 17 lists below the clock pickers' tag `0x29` handlers naming a state variable the composed path renumbered,
  // which matched nothing.
  //
  // **What is left of those two rows.** `hit-page` 546 is the six pages no builder makes: the two of the census's 25
  // only setup screens name, a device page's six commands with both page keys (4.2) and the generic help screen's
  // (4.6), and the donor's four of its own screens (4.1 and 4.2). `case-program` 10 is not a part carried: it is two
  // of the ten cases the activity composer writes under Devices, `11 mode 7E 00` entering the idle device list, byte
  // for byte the donor's idle cases of the Devices record and its unread copy, which this match takes once the
  // builder's own, built and so left out, no longer take them. The composer writes them, `caseProgram`.
  //
  // `raw-18-table` 2 and `slot-16-table` 1 went with 6.7, generated on the path by `families/touch/smalltables.ts`.
  // Of `slot-10-list`, 262 are the 34 lists nothing can run, kept with 6.7's reason, the test below.
  assert.deepEqual(got, {
    'picture': 1012839, // 5.3: the 36 every compile holds, the clock's 16 and the donor's 6
    'slot-5-block': 96946, 'slot-5-header': 4116, 'slot-5-group': 594, // the donor's two devices' infrared, 8.1
    'slot-10-list': 4004, // per builder in the listing: 17609 before 3.2.2, 6649 before 3.2.2.2, 6114 before 3.2.2.3, 6054 before 3.2.2.4, 5351 before 3.2.2.5
    'mode device': 4569, // and `mode other` 11983 before 3.2.2 and 1495 before 3.2.2.4
    'hit-page': 546, 'case-program': 10, // 2444 and 341 before 3.2.2.3, and base slot 11's `table` 89
  });
  assert.equal(Object.values(got).reduce((sum, one) => sum + one, 0), 1123624);
  assert.equal(out.blob.length, 1756549);
});

/** The 34 lists of the donor the composed setup carries and nothing can run, `todo-compile-one.md` 6.7. */
const UNRUN = [
  422, 424, 438, 443, 480, 550, 684, 686, 741, 742, 743, 744, 747, 753, 754, 756, 758, 759, 760, 762, 763, 804, 807,
  821, 840, 865, 1499, 1516, 1528, 1551, 1562, 1567, 1570, 1573,
];

test('todo-compile-one 6.7: the composed setup carries 34 lists of its donor, 262 bytes, that nothing in it can run, and keeps them, since leaving them out renumbers base slot 10 and the one renumbering there is refuses a Harmony One',
     NEEDS, () => {
  const c = composed().container;
  const donor = parse(require_('harvest_one_two_devices'));
  const lists = c.actionLists()!;
  const theirs = donor.actionLists()!;
  const owners = builtBytes().owners;
  const table = c.pointerArray(archSlot(c.architecture!, 10))!;
  const reached = listsReached(c);
  const unreached = [...lists.keys()].filter((index) => !reached.has(index));
  const bytesOf = (index: number): number => 1 + 3 * lists[index]!.length;
  const same = (index: number): boolean => theirs[index] !== undefined && theirs[index]!.length === lists[index]!.length
    && theirs[index]!.every((one, k) => one.opcode === lists[index]![k]!.opcode && one.operand === lists[index]![k]!.operand);
  // No builder on the path reproduces a byte of any list nothing reaches: a builder builds what its part runs.
  for (const index of unreached) {
    const at = c.blobOffsetOf(table[index]!)!;
    assert.ok(owners.subarray(at, at + bytesOf(index)).every((one) => one === 0), `list ${index}`);
  }
  // Every list of the 2687 nothing reaches, by what it is. The donor's at the same index byte for byte and no
  // send: the 34 this item is about. The donor's at the same index and a send: its two devices' 11 commands no key
  // binds, 4.2 and 8.1. The rest the composers wrote: 14 of the donor's own lists nothing reaches in it either,
  // at the same indices but naming a state variable the composed devices renumbered, and 12 of their own past the
  // donor's 2060, the composed devices' 7 commands no key binds and five lists selecting base slot 9 entries 8 to
  // 12, each one instruction, which nothing names.
  const group = (index: number): string => (!same(index) ? 'written'
    : lists[index]!.some((one) => one.opcode === 0x7d) ? 'donor sends' : 'carried');
  const tally: Record<string, [number, number]> = {};
  for (const index of unreached) {
    const one = (tally[group(index)] ??= [0, 0]);
    one[0] += 1;
    one[1] += bytesOf(index);
  }
  assert.equal(lists.length, 2687);
  assert.deepEqual(tally, { carried: [34, 262], 'donor sends': [11, 77], written: [26, 215] });
  assert.deepEqual(unreached.filter((index) => group(index) === 'carried'), UNRUN);
  assert.equal(unreached.filter((index) => group(index) === 'written' && index < theirs.length).length, 14);

  // **That nothing can run them**, section 408 on the 3.4 image: base slot 10 is spooled only by an `0x7F`'s
  // operand, and an instruction is rebuilt at run time only by `0x7B` or an opcode `0x1F` to `0x3E` over `0xF7`.
  // Here every one of those is `1F F776`, building an `0x76`, seven of them, as on the nineteen compiles.
  const builders = lists.flat().filter((one) => one.opcode === 0x7b || (one.opcode >= 0x1f && one.opcode <= 0x3e && one.operand >> 8 === 0xf7));
  assert.deepEqual([...new Set(builders.map((one) => `${one.opcode.toString(16)} ${one.operand.toString(16)}`))], ['1f f776']);
  assert.equal(builders.length, 7);
  // And the control on the walk, which reads holders one by one and so could miss one: three bytes `lo hi 7F`
  // naming one of the 34, anywhere in the file, whatever holds them, instruction or not. None outside the 34
  // themselves. Inside them, 12: the dead chains, a list of the 34 calling another, which is the census seeing a
  // name where there is one.
  const own = new Set(UNRUN.flatMap((index) => {
    const at = c.blobOffsetOf(table[index]!)!;
    return Array.from({ length: bytesOf(index) }, (_, k) => at + k);
  }));
  const named = new Set(UNRUN);
  let outside = 0;
  let inside = 0;
  for (let at = 0; at + 2 < c.blob.length; at += 1) {
    if (c.blob[at + 2] !== 0x7f || !named.has(c.blob[at]! | (c.blob[at + 1]! << 8))) continue;
    if (own.has(at)) inside += 1;
    else outside += 1;
  }
  assert.deepEqual([outside, inside], [0, 12]);

  // **Why they stay.** They sit at 34 indices from 422 to 1573 among 2687, so leaving them out moves the index of
  // every kept list above 422, 2231 of them, at every place that names one. The renumbering there is, `dropLists`,
  // rests on `listCallSites`, which reads raw slots 10 and 8, on the Harmony One base slot 9 and the inserted
  // NULL, so it misses every call inside an action list and the leading list; its own check catches the first
  // list left holding an old index and refuses, rather than writing a wrong one. What leaving them out would take
  // is that census read through `archSlot`, the drop run on the path, and a write to the spare Harmony One to see
  // the result start: by the same walk every one of Logitech's nineteen One compiles carries lists nothing
  // reaches, a scratch measurement, so a One configuration without them is a form no remote here has run.
  assert.throws(() => dropLists(c, UNRUN), /does not hold what it held/);
});
