/**
 * Every configuration the Harmony 300 and 350 family builds from nothing binds firmware event `0xFF` to the list event
 * `0x30` runs, `todo-compile-350.md` 5.4 and decision 28, so one build serves the Harmony 300 and the Harmony 350 alike.
 * The entry is `noScreenAcknowledgingEntry` in `families/harmony-300-350/constants.ts`; the builders that carry it are
 * `buildEmptyNoScreenConfiguration` and `buildNoScreenSetup`, the latter putting it in last, `withAcknowledgingEntry`.
 *
 * **The fact it rests on**, measured before this item and held elsewhere: a Harmony 300's application raises event
 * `0xFF` for a send from infrared groups 4 to 7, which no Logitech configuration of the family binds, so no list runs
 * the acknowledgement `07 FFFA` and the remote hangs, `tests/test_harmony_300_group_4_send.py`; Logitech's compile of
 * the Harmony 350's test setup with `0xFF` bound by hand to the `0x30` entry's list sent from all eight groups on the
 * bench Harmony 300 and changed nothing heard on the bench Harmony 350, `noscreeneventff.test.ts` for the file and
 * `packages/bench/test/eventff300.test.ts` for what was heard. This item makes that entry a family fact of our
 * builders rather than a hand edit.
 *
 * **What is claimed here.**
 *
 * 1. The entry is tag `0xFF` and a call, `0x7F`, of the list the `0x30` entry calls, for whatever numbers the send
 *    events' lists are given, and that list ends in `07 FFFA`. A change of `0x30`'s numbers moves it, a change of
 *    another event's does not, so it is `0x30`'s list by construction and not a number that happens to agree.
 * 2. Every configuration built from nothing binds it once, to the `0x30` entry's list: the empty configuration on
 *    both skins measured, 104 and 79, and the test setup. **The control** is the same check on Logitech's compiles,
 *    which bind no `0xFF` and fail it, so the check can fail. On the test setup the key table is Logitech's second
 *    compile's binding for binding, each spelled out to the lists it calls, and tag for tag in order, with `0xFF` the
 *    one entry more, between `0x2D` and `0x30`: put in last, `withAcknowledgingEntry`, it lands where it did in the
 *    file the bench Harmony 300 ran. Put in first, with the empty configuration's four, it doubled the table one
 *    device earlier and stored `0xC1` before `0x2E` and `0x85`, which is why the setup builder adds it last.
 * 3. The attribution credits its four bytes to the constants, as it does the four send event entries; with the entry
 *    planted to call `0x2D`'s list instead, another list that ends in `07 FFFA` but switches another pin, those four
 *    bytes are no generator's and are reported carried, in the key map's region, and the check of claim 2 fails.
 *    Logitech's seven compiles are attributed as before, `noscreenattribution.test.ts`'s 5.2.1 counts unchanged, since
 *    none holds a `0xFF` for the attribution to find.
 * 4. **A composition onto a Logitech compile does not add it**, the choice of this item: no composer rebuilds the key
 *    table from the family's constants, each adds its entries to what the file holds, so the entry is the builders'
 *    from nothing and not the composers'. `withAcknowledgingEntry` refuses a file whose `0x30` entry calls another list
 *    than the empty configuration's numbers name, Logitech's among them, and a file that binds `0xFF` already.
 *
 * **What it does not show**: that a Harmony 300 sends from groups 4 to 7 on this build. That is the bench's, 5.3, with
 * `packages/bench/irtests/350-5-3-final.json` and `300-5-3-final.json` on the lab's `from-nothing-5.4.bin`; until it
 * is run the hearing rests on Logitech's compile with the same entry.
 *
 * **Sources checked first**: decision 28; `reference/architectures/harmony-300-350/README.md`, "Making a Harmony 300
 * behave as a Harmony 350", and `firmware.md`, "What a send does with its event"; the three tests above. Logitech's
 * client compiles nothing for this family and its compiles bind no `0xFF`, so there is nothing of theirs to read.
 *
 * **Width**: architecture 16, the Harmony 300 and the Harmony 350, skins 104 and 79 built; skin 78 is refused by the
 * empty builder, no configuration of it having been read.
 *
 * **What would falsify it**: a build of ours from nothing without the entry or with two, an entry calling another list
 * than `0x30`'s, or a planted entry the attribution credits.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE, LAB, needing, require_, skipUnless, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import { ComposeError, type Container, parse, type Recipe } from '../src/index.ts';
import {
  ACKNOWLEDGED_AS,
  buildEmptyNoScreenConfiguration,
  buildNoScreenSetup,
  composeNoScreenSetup,
  EMPTY_LIST_NUMBERS,
  NO_SCREEN_ATTRIBUTIONS,
  noScreenAcknowledgingEntry,
  noScreenAttributedBytes,
  type NoScreenSendEventNumbers,
  restamped,
  SEND_EVENT_PINS,
  UNMASKED_SEND_EVENT,
} from '../src/build.ts';
import { bytes, taggedList } from '../src/internal.ts';
import { withAcknowledgingEntry } from '../src/families/harmony-300-350/empty.ts';
import { maps } from './noscreenparts.ts';
import { archiveAt } from '../src/catalogue/catalogue.node.ts';

const MOMENT = '2026-11-01T12:00:00';
const RECIPE = JSON.parse(readFileSync(new URL('../../corpus/setups/h350-test.json', import.meta.url), 'utf8')) as Recipe;
/** Where Logitech's service put each device, as `noscreenfromnothing.test.ts` states it. */
const KEYS = {
  'LG TV': { place: 0, press: 'short' }, Knoll: { place: 0, press: 'long' },
  Plasma: { place: 1, press: 'short' }, Kodi: { place: 1, press: 'long' },
  Denon: { place: 2, press: 'short' }, Switch: { place: 2, press: 'long' },
  KPN: { place: 3, press: 'short' }, 'Sony HT': { place: 3, press: 'long' },
} as const;
const FIRST = 'work/setups/h350-test/first-compile/compile-Result.EzHex';
const SECOND = 'work/setups/h350-test/compile-Result.EzHex';
const FIVE = ['h350_config', 'h350_three_devices_config', 'h350_programmed_config', 'h300_config', 'h300_programmed_config'] as const;

/** The two literals this test holds the constants to, stated here so a change of either constant shows. */
const EVENT_FF = 0xff;
const EVENT_30 = 0x30;
const EVENT_2D = 0x2d;

const needsArchive = needing(skipWithoutIrArchive());
const needsLab = needing(skipWithoutLab(), skipUnless(...FIVE));
const needsBoth = needing(skipWithoutLab(), skipWithoutIrArchive());

function labFile(path: string): Container {
  const at = join(LAB!, path);
  // The lab is there, so a missing file fails rather than skips: the claim is about these files.
  assert.ok(existsSync(at), `${path} is in the lab`);
  return parse(new Uint8Array(readFileSync(at)));
}

/** An action list's instructions, `[opcode, operand]` each, by its index. */
function listOf(c: Container, index: number): [number, number][] {
  const at = c.blobOffsetOf(c.pointerArray(7)![index]!)!;
  return Array.from({ length: bytes.u8(c.blob, at) }, (_, k) => [bytes.u8(c.blob, at + 3 + 3 * k), bytes.u16(c.blob, at + 1 + 3 * k)]);
}

/**
 * Whether a configuration binds event 0xFF as this item requires: once in the key table, the entry the key table's
 * `0x30` entry is, opcode and operand, and that a call of a list ending in `07 FFFA`. The reason when not.
 */
function acknowledges(c: Container): true | string {
  const keyTable = taggedList(c, c.pointerArray(6)![0]!)!.entries;
  const ff = keyTable.filter((one) => one.tag === EVENT_FF);
  if (ff.length !== 1) return `${ff.length} entries for 0xff`;
  const thirty = keyTable.find((one) => one.tag === EVENT_30);
  if (thirty === undefined) return 'no entry for 0x30';
  if (ff[0]!.opcode !== thirty.opcode || ff[0]!.operand !== thirty.operand) return `0xff calls ${ff[0]!.operand}, 0x30 ${thirty.operand}`;
  if (ff[0]!.opcode !== 0x7f) return 'not a call';
  const last = listOf(c, ff[0]!.operand).at(-1);
  return last?.[0] === 0x07 && last[1] === 0xfffa ? true : `the list ends in ${last}`;
}

/** Our build of the test setup from nothing, once. */
let memo: Container | undefined;
const setup = (): Container => (memo ??= parse(buildNoScreenSetup(archiveAt(IR_ARCHIVE!), { recipe: RECIPE, keys: KEYS, builtAt: MOMENT }).bytes));

test('the entry is tag 0xFF calling the list the 0x30 entry calls, whatever the numbers, and only 0x30\'s numbers move it', () => {
  assert.equal(UNMASKED_SEND_EVENT, EVENT_FF);
  assert.equal(ACKNOWLEDGED_AS, EVENT_30);
  const numbers = EMPTY_LIST_NUMBERS.sendEvents;
  const entry = noScreenAcknowledgingEntry(numbers);
  assert.deepEqual(entry, { tag: EVENT_FF, opcode: 0x7f, operand: numbers.events.get(EVENT_30)!.bound });
  // Another numbering: 0x30's bound list moved, and the entry follows it; 0x2D's moved, and the entry does not.
  const moved = (tag: number, bound: number): NoScreenSendEventNumbers => ({
    empty: numbers.empty, events: new Map([...numbers.events].map(([t, one]) => [t, t === tag ? { ...one, bound } : one])),
  });
  assert.equal(noScreenAcknowledgingEntry(moved(EVENT_30, 200)).operand, 200);
  assert.equal(noScreenAcknowledgingEntry(moved(EVENT_2D, 200)).operand, numbers.events.get(EVENT_30)!.bound);
  // Numbers missing a send event are refused, as the four entries' are.
  const without30: NoScreenSendEventNumbers = { empty: numbers.empty, events: new Map([...numbers.events].filter(([t]) => t !== EVENT_30)) };
  assert.throws(() => noScreenAcknowledgingEntry(without30), ComposeError);
  assert.equal(SEND_EVENT_PINS.has(EVENT_FF), false, 'not a pin tag: it borrows 0x30\'s list and has no pin of its own');
});

test('every configuration built from nothing binds it once, to the 0x30 entry\'s list: the empty one on both skins and the test setup', needsArchive, () => {
  for (const skin of [104, 79]) {
    assert.equal(acknowledges(buildEmptyNoScreenConfiguration({ skin, builtAt: MOMENT }).container), true, `the empty configuration, skin ${skin}`);
  }
  assert.equal(acknowledges(setup()), true, 'the test setup');
});

test('the control: Logitech\'s compiles bind no 0xFF and fail the same check, and the hand made file the bench 300 ran passes it', needsLab, () => {
  const theirs: [string, Container][] = [
    ['second', labFile(SECOND)], ['first', labFile(FIRST)], ...FIVE.map((name): [string, Container] => [name, parse(require_(name))]),
  ];
  for (const [label, c] of theirs) assert.equal(acknowledges(c), '0 entries for 0xff', label);
  assert.equal(acknowledges(labFile('work/300-event-ff/h350-compile-event-ff.bin')), true);
});

test('on the test setup the key table is Logitech\'s binding for binding and in order, with 0xFF the one entry more, between 0x2D and 0x30',
  needsBoth, () => {
    const ours = setup();
    const theirs = labFile(SECOND);
    const { ff, ...rest } = maps(ours)['keys']!;
    assert.deepEqual(rest, maps(theirs)['keys']);
    assert.equal(ff, maps(theirs)['keys']!['30']);
    const tags = (c: Container) => taggedList(c, c.pointerArray(6)![0]!)!.entries.map((one) => one.tag);
    const at = tags(ours).indexOf(EVENT_FF);
    assert.deepEqual(tags(ours).filter((tag) => tag !== EVENT_FF), tags(theirs));
    assert.deepEqual(tags(ours).slice(at - 1, at + 2), [EVENT_2D, EVENT_FF, EVENT_30]);
    // The control, and the reason the setup builder adds it last: the same setup composed onto the empty configuration
    // that holds the entry from the start stores the table in another order, 0xC1 ahead of 0x2E and 0x85.
    const early = parse(composeNoScreenSetup(buildEmptyNoScreenConfiguration({ skin: 104, builtAt: MOMENT }).container, archiveAt(IR_ARCHIVE!),
      { recipe: RECIPE, keys: KEYS }).bytes);
    assert.equal(acknowledges(early), true);
    const earlyTags = tags(early).filter((tag) => tag !== EVENT_FF);
    assert.deepEqual([...earlyTags].sort(), [...tags(theirs)].sort());
    assert.notDeepEqual(earlyTags, tags(theirs));
    assert.ok(earlyTags.indexOf(0xc1) < earlyTags.indexOf(0x2e) && tags(theirs).indexOf(0xc1) > tags(theirs).indexOf(0x2e));
  });

test('the attribution credits the entry to the constants, and an 0xFF planted to call another acknowledging list is no generator\'s', needsArchive, () => {
  const c = setup();
  const a = noScreenAttributedBytes(c);
  const tableAt = c.blobOffsetOf(c.pointerArray(6)![0]!)!;
  const k = taggedList(c, c.pointerArray(6)![0]!)!.entries.findIndex((one) => one.tag === EVENT_FF);
  const at = tableAt + 1 + 4 * k;
  const constants = NO_SCREEN_ATTRIBUTIONS.indexOf('constants') + 1;
  assert.deepEqual(Array.from(a.owners.subarray(at, at + 4)), [constants, constants, constants, constants]);
  assert.deepEqual(Object.fromEntries(a.carried), {});
  // The plant: 0xFF calling 0x2D's bound list, which ends in 07 FFFA too, but switches pin 0 and not pin 3.
  const other = EMPTY_LIST_NUMBERS.sendEvents.events.get(EVENT_2D)!.bound;
  assert.deepEqual(listOf(c, other).at(-1), [0x07, 0xfffa]);
  const planted = c.blob.slice();
  planted[at + 1] = other & 0xff;
  planted[at + 2] = other >> 8;
  restamped(planted);
  const p = parse(planted);
  assert.equal(acknowledges(p), `0xff calls ${other}, 0x30 ${EMPTY_LIST_NUMBERS.sendEvents.events.get(EVENT_30)!.bound}`);
  const b = noScreenAttributedBytes(p);
  assert.deepEqual(Object.fromEntries(b.carried), { 'raw-6-map': 4 });
  assert.equal(b.unclaimed, 0);
  assert.equal(b.generated['constants'], a.generated['constants']! - 4);
});

test('a composition onto a Logitech compile keeps its key table without 0xFF, and the last step refuses a file not numbered as ours', needsBoth, () => {
  // Logitech's first compile holds every device of the setup, so composing the setup onto it composes the favourites
  // alone, a composition onto a donor: the key table stays the donor's, with no 0xFF.
  const first = labFile(FIRST);
  const onto = parse(composeNoScreenSetup(first, archiveAt(IR_ARCHIVE!), { recipe: RECIPE, keys: KEYS }).bytes);
  const tags = (c: Container) => taggedList(c, c.pointerArray(6)![0]!)!.entries.map((one) => one.tag);
  assert.equal(tags(onto).includes(EVENT_FF), false);
  assert.deepEqual(tags(onto), tags(first));
  // The step `buildNoScreenSetup` ends with refuses Logitech's file, whose 0x30 entry calls a list of its own numbering,
  // and our own finished build, which binds 0xFF already.
  assert.throws(() => withAcknowledgingEntry(first), /0x30 entry does not call list/);
  assert.throws(() => withAcknowledgingEntry(setup()), /binds event 0xff already/);
});
