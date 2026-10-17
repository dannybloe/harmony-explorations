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
  type ComposedSetup, type Container, SCREEN_OWNERS, claims, composeSetup, deviceModeMaps, modeRecords, parse, pointers,
  readRecipe, screenUnits, taggedList, touchPages,
} from '../src/index.ts';
import { characterMap } from '../src/text.ts';
import { timers } from '../src/tables.ts';
import { touchScreenLightTimer } from '../src/families/touch/screenlight.ts';
import { TOUCH_CHOICES } from '../src/families/touch/choices.ts';
import { TOUCH_BUILT, type TouchBuiltBytes, touchBuiltBytes } from '../src/families/touch/builders.ts';

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
  // and 1751852 once the Radio sequence's pad took the key copy, without a click of its own.
  assert.equal(c.blob.length, 1751852);
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

test('todo-compile-one 3.2.2: the firmware screens, the fixed screens, the tour and Remote Assistant, the wiring and the state tables of the composed setup come out of the touch family\'s builders, run on the composed path and measured on the result',
     NEEDS, () => {
  const out = composed();
  // On the path: one step after the composers and before the look, naming the five parts in the order built.
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
  assert.deepEqual(a.generated, {
    'firmware screens': 3099, 'fixed screens': 13139, 'tour and Remote Assistant': 3900, wiring: 4527, 'state tables': 2322,
  });
  assert.deepEqual(a.described, {
    'firmware screens': 401, 'fixed screens': 3967, 'tour and Remote Assistant': 680, wiring: 1243, 'state tables': 0,
  });
});

test('todo-compile-one 3.2: the One\'s composed test setup carries 1136980 of its 1751852 bytes out of Logitech\'s donor, per kind as pinned here, a list that may only shrink',
     NEEDS, () => {
  const out = composed().container;
  const got = carried(out, parse(require_('harvest_one_two_devices')), builtBytes().owners);
  // Each kind with the item that builds it, `todo-compile-one.md` 3.2. A builder joining the composed path
  // lowers its row; a row that rises is a composer that started copying. 1162052 when 3.2.1 listed it; 3.2.2's
  // first step put the firmware screens, the fixed screens, the tour and Remote Assistant, the wiring and the state
  // tables on the path, 25072 bytes, the sum 3.2.1 listed for the five: `mode system` and every row of base slots 2,
  // 4, 8, 9, 12, 13, 14 and 15 went, and `mode other`, `mode status` and the lists came down.
  assert.deepEqual(got, {
    'picture': 1012839, // 5.3: the 36 every compile holds, the clock's 16 and the donor's 6
    'slot-5-block': 96946, 'slot-5-header': 4116, 'slot-5-group': 594, // the donor's two devices' infrared, 8.1
    'slot-10-list': 6649, // per builder in the listing: 17609 before 3.2.2
    'mode other': 1495, 'mode status': 3379, 'mode device': 4569, // 11983, 4025 and the same before 3.2.2
    'dynamic-program': 3516, 'hit-page': 2444, 'case-program': 341, 'table': 89,
    'raw-18-table': 2, 'slot-16-table': 1,
  });
  assert.equal(Object.values(got).reduce((sum, one) => sum + one, 0), 1136980);
  assert.equal(out.blob.length, 1751852);
});
