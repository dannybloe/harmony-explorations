/**
 * Which generator writes each byte of a Harmony 300 or 350 configuration, `todo-compile-350.md` 5.2.1 and 5.2.2, and
 * the evidence for 5.2.3, plan 011's "The check that proves 5.2". The attribution is `noScreenAttributedBytes` in
 * `families/harmony-300-350/attribution.ts`, over the generic ledger in `attribution.ts`; the list writers it reads every
 * list back through are `families/harmony-300-350/lists.ts`.
 *
 * **What it settled, in one line each.** Our build of the test setup, made from nothing, is every byte a generator's
 * with none carried and none unclaimed, 124170 of 124170. Logitech's compiles of the family are as well, but for parts
 * no composer of ours writes, each named below: five of the seven are whole or two bytes short, and the two Harmony 300
 * compiles leave that model's own shapes. The function is not generous: a byte planted where no generator writes it is
 * found, by its list; a generator's claim dropped returns its bytes as carried; and the file has to lay out again into
 * itself before anything is credited.
 *
 * **Since `todo-compile-350.md` 5.4** our build carries one entry no Logitech compile holds, event `0xFF` bound to
 * event `0x30`'s list, decision 28, which the constants are credited with: four bytes more on every build of ours and
 * on the empty configurations, and nothing moved on Logitech's seven, which bind no `0xFF`. 5.2 was checked before
 * the entry went in, 124166 bytes then; `noscreenacknowledging.test.ts` holds the entry and its control.
 *
 * **How a byte is credited.** Each generator reads its part's numbers off the file, writes the part again and is
 * credited only where that is the file byte for byte; the bytes the numbers reach are its description, found by
 * changing each number and writing again, `describedByChange`. Lists are credited by shape and content, never by
 * index, since Logitech numbers them in no order of ours, 5.1.8: each list is read by each kind of
 * `NO_SCREEN_LIST_KINDS` and credited to the first whose writer gives it back, and only where the numbers name what
 * the file holds and what a writer calls is of the kind it calls (a power action calls sends, a gate a flip or a
 * condition). The module's table says how each other part is held.
 *
 * **What went into the writers to make this possible.** The family's composers wrote their lists inline, the send
 * list three times over. They now call one writer per kind in `lists.ts`, and the attribution calls the same writers,
 * so no shape is stated twice; our build is byte for byte what it was before the move, `noscreenfromnothing.test.ts`'s
 * lab file and every composer test holding it. Two things the attribution found on the way, each fixed in the writer:
 *
 * * **A key's press list took one timer and counted on.** Logitech's compiles number a key's two timers in no such
 *   order, 14 then 7 in one block of the test setup's compile, 3 then 2 in the factory 350's and 1 then 0 in the
 *   programmed 350's, so eleven press lists of the five Harmony 350 compiles were no generator's until `pressList` took
 *   both numbers as description, the controls below.
 * * **A power action of several steps, the shared device composer's `callingList`, had no reader**: the list the Knoll's
 *   three step power action is, in Logitech's compile and in ours alike. It is the kind `action step lists` now.
 *
 * **Logitech's seven, the calibration**, the frame test's seven compiles:
 *
 * | compile | bytes | attributed | carried | why |
 * |---|---|---|---|---|
 * | the test setup's second compile | 118513 | all | none | |
 * | the test setup's first, without favourites | 118327 | all | none | |
 * | the factory Harmony 350 | 121251 | all | none | |
 * | the bench 350 with three devices | 68985 | 68983 | 2, a key map | the empty map of a device with no infrared commands, a Chromecast, which no composer of ours writes: the device composer refuses a device with no power steps |
 * | the bench 350 programmed | 83840 | 83838 | 2, a key map | the same device's empty map |
 * | the Harmony 300 compiled in 2011 | 41234 | 40633 | 601: 597 of lists, 4 of a map | the plain send pair `{7D, 7C}` with no cancel, 79 lists, which section 278 found to be the older compiles' and our send is not; the 300's device key press that switches the pin and selects, two lists; an activity list with no flag, the older shape; two power on lists calling those plain sends; and one favourite key's binding on the television's map |
 * | the bench 300 programmed | 97474 | 97422 | 52: 28 of lists, 24 of maps | the 300's press that selects, four lists; six bindings of the 300's favourite keys, which `FAVOURITE_SCANS` states for the Harmony 350 alone |
 *
 * **Unclaimed is 0 on all seven** and on our build: every byte a generator does not write sits in a region a reader
 * knows. **Contested**, a list a second writer gives back as well, is 0 on five and 7 bytes on the two with a channel
 * spelled out: its two calls of digit send lists are a power action of two steps as well. The first, the channel, owns
 * them.
 *
 * **An independent closure on the lists.** The census, `noscreencensus.test.ts`, names the test setup compile's 331
 * lists by what reaches them, a reader that knows no writer; the attribution names them by which writer gives them
 * back, knowing nothing of what reaches them. The two agree: the census's 216 sends and 34 uncalled sends are the 250
 * send lists; its 16 uncalled silent writes the 16 reset lists; its six start up and 13 pin lists the constants' 19;
 * its 12 key lists the four press and eight select lists; its five channels the five channel lists; and its 10
 * activity and 19 power lists the 29 of the power on, gate, flip, activity, condition, input write and action step
 * kinds. The two cut the last 29 differently, by reach and by writer, and only their sum is compared.
 *
 * **What the attribution cannot see, and so what 5.2.3 is for.** About nine bytes in ten of a file are description:
 * the infrared blocks' duration words, which are the catalogue's and which `irBuildBlock` only frames with its
 * terminator, 108066 of our build's 124170 bytes. A duration copied out of a Logitech file and one taken from the
 * catalogue are the same bytes, so the attribution cannot say which, and the last test here holds what can: the build
 * takes no container, and no module it runs reads the lab. Within a list the same holds for its numbers: a send of
 * another record of the group is still a send, the fifth test.
 *
 * **Controls**: the planted byte, the dropped claims and the unrestamped file are tests of their own below. Run and
 * reverted by copying the source aside while writing this: `pressList` counting on from a block's first timer again
 * leaves eleven of the five Harmony 350 compiles' press lists carried, six of two devices and five of one, 215 bytes,
 * and changes nothing on our build, whose numbering does count on, which is why our build alone could not have found
 * it; the `calling` check removed, so that a kind's numbers need only exist, lets the start up's two calls read as an
 * action of two steps and the send events' load lists as gates, contested 49 more on every compile, and credits the
 * 2011 Harmony 300's two power on lists, which call its plain sends, 14 bytes. Before `activityList` refused an
 * activity of no steps, the start up's first list read as one too, 10 bytes more contested on every compile.
 *
 * **Sources checked first**: plan 011 and chapter 5 of `todo-compile-350.md`; the two other families' attributions,
 * `attributeBytes` in `families/harmony-600-650-700/assemble.ts` and `oneBuiltBytes` and `oneAttributedBytes` in
 * `families/harmony-one/`, and their tests, `oneempty.test.ts` for the planted controls; `noscreenempty.test.ts`, whose
 * accounting of the empty configuration this generalises; `noscreencensus.test.ts`; `noscreennumbering.test.ts` for
 * why lists are not credited by index; `reference/architectures/harmony-300-350/memory.md`. Logitech's client compiles
 * nothing for this family, `reference/logitech/clients.md`, so it has no attribution to read.
 *
 * **Width**: architecture 16, both models, skins 104 and 79. Calibrated on seven compiles, six of Logitech's current
 * service and one from 2011; the 2017 compile of another owner and the harvest's compiles are not run here.
 *
 * **What would falsify it**: a Logitech compile of the current service holding a list no kind gives back, or a byte of
 * ours that only a donor could have put there and the attribution credits; and on the other side, a byte planted where
 * no generator writes it that the attribution credits anyway.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertFileFamilyContainer } from '@harmony/usb/rails';
import { IR_ARCHIVE, LAB, needing, require_, skipUnless, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import { type Container, ComposeError, parse, type Recipe } from '../src/index.ts';
import {
  buildEmptyNoScreenConfiguration,
  buildNoScreenSetup,
  NO_SCREEN_ATTRIBUTIONS,
  NO_SCREEN_LIST_KINDS,
  type NoScreenAttributed,
  type NoScreenAttribution,
  noScreenAttributedBytes,
  noScreenRegions,
  restamped,
} from '../src/build.ts';
import { archiveAt } from '../src/catalogue.node.ts';

const FIVE = ['h350_config', 'h350_three_devices_config', 'h350_programmed_config', 'h300_config', 'h300_programmed_config'] as const;
const SETUP = 'work/setups/h350-test/compile-Result.EzHex';
const FIRST = 'work/setups/h350-test/first-compile/compile-Result.EzHex';

const needsLab = needing(skipWithoutLab(), skipUnless(...FIVE));
const needsArchive = needing(skipWithoutIrArchive());

const RECIPE = JSON.parse(readFileSync(new URL('../../corpus/setups/h350-test.json', import.meta.url), 'utf8')) as Recipe;
/** Where Logitech's service put each device, as `noscreenfromnothing.test.ts` states it. */
const KEYS = {
  'LG TV': { place: 0, press: 'short' }, Knoll: { place: 0, press: 'long' },
  Plasma: { place: 1, press: 'short' }, Kodi: { place: 1, press: 'long' },
  Denon: { place: 2, press: 'short' }, Switch: { place: 2, press: 'long' },
  KPN: { place: 3, press: 'short' }, 'Sony HT': { place: 3, press: 'long' },
} as const;
const MOMENT = '2026-11-01T12:00:00';

function atPath(path: string): Container {
  const at = join(LAB!, path);
  // The lab is there, so a missing file fails rather than skips: the claim is about these files.
  assert.ok(existsSync(at), `${path} is in the lab`);
  return parse(new Uint8Array(readFileSync(at)));
}

function seven(): [string, Container][] {
  return [['setup', atPath(SETUP)], ['first', atPath(FIRST)], ...FIVE.map((name): [string, Container] => [name, parse(require_(name))])];
}

/** Our build of the test setup from nothing, the setup file, Logitech's keys, a moment and the catalogue alone. */
function ours(): Container {
  return parse(buildNoScreenSetup(archiveAt(IR_ARCHIVE!), { recipe: RECIPE, keys: KEYS, builtAt: MOMENT }).bytes);
}

const sum = (record: Readonly<Record<string, number>>): number => Object.values(record).reduce((a, b) => a + b, 0);
const carriedOf = (a: NoScreenAttributed): number => [...a.carried.values()].reduce((x, y) => x + y, 0);

/** How many lists each generator owns, by the owner of each list's first byte. */
function listsBy(c: Container, a: NoScreenAttributed): Record<string, number> {
  const out: Record<string, number> = {};
  for (const address of c.pointerArray(7) ?? []) {
    const tag = a.owners[c.blobOffsetOf(address)!]!;
    const who = tag === 0 ? 'none' : NO_SCREEN_ATTRIBUTIONS[tag - 1]!;
    out[who] = (out[who] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort());
}

// ---------------------------------------------------------------------------------------------------------------
// 5.2.1: Logitech's seven

test('5.2.1: on Logitech\'s seven compiles every byte is a generator\'s but parts no composer of ours writes, and none is unclaimed', needsLab, () => {
  const out: Record<string, unknown> = {};
  for (const [label, c] of seven()) {
    const a = noScreenAttributedBytes(c);
    assert.equal(sum(a.generated) + carriedOf(a) + a.unclaimed, a.total, `${label}: the counts add to the file`);
    out[label] = { total: a.total, generated: sum(a.generated), carried: Object.fromEntries(a.carried), unclaimed: a.unclaimed, contested: a.contested };
  }
  assert.deepEqual(out, {
    setup: { total: 118513, generated: 118513, carried: {}, unclaimed: 0, contested: 7 },
    first: { total: 118327, generated: 118327, carried: {}, unclaimed: 0, contested: 0 },
    h350_config: { total: 121251, generated: 121251, carried: {}, unclaimed: 0, contested: 0 },
    h350_three_devices_config: { total: 68985, generated: 68983, carried: { 'raw-6-map': 2 }, unclaimed: 0, contested: 0 },
    h350_programmed_config: { total: 83840, generated: 83838, carried: { 'raw-6-map': 2 }, unclaimed: 0, contested: 0 },
    h300_config: { total: 41234, generated: 40633, carried: { 'slot-10-list': 597, 'raw-6-map': 4 }, unclaimed: 0, contested: 0 },
    h300_programmed_config: { total: 97474, generated: 97422, carried: { 'slot-10-list': 28, 'raw-6-map': 24 }, unclaimed: 0, contested: 0 },
  });
});

test('5.2.1: what is left on Logitech\'s compiles is a codeless device\'s empty map and the Harmony 300\'s own shapes, each named', needsLab, () => {
  /** Every list no generator gives back, by its shape: the opcodes, with the band of a `1F` or `07`. */
  const leftLists = (c: Container, a: NoScreenAttributed): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const address of c.pointerArray(7) ?? []) {
      const at = c.blobOffsetOf(address)!;
      if (a.owners[at] !== 0) continue;
      const shape = Array.from({ length: c.blob[at]! }, (_, k) => {
        const opcode = c.blob[at + 3 + 3 * k]!;
        const band = opcode === 0x1f || opcode === 0x07 ? `:${c.blob[at + 2 + 3 * k]!.toString(16)}` : '';
        return `${opcode.toString(16)}${band}`;
      }).join(' ');
      out[shape] = (out[shape] ?? 0) + 1;
    }
    return out;
  };
  /** Every key map entry no generator credits, as `map:tag`, and every map left whole. */
  const leftEntries = (c: Container, a: NoScreenAttributed): string[] => {
    const out: string[] = [];
    (c.pointerArray(6) ?? []).forEach((address, map) => {
      const at = c.blobOffsetOf(address)!;
      if (a.owners[at] === 0) {
        out.push(`${map}:whole ${c.blob[at]!.toString(16)}${c.blob[at + 1]!.toString(16)}`);
        return;
      }
      for (let k = 0; k < c.blob[at]!; k += 1) if (a.owners[at + 1 + 4 * k] === 0) out.push(`${map}:${c.blob[at + 1 + 4 * k]!.toString(16)}`);
    });
    return out;
  };
  const all = Object.fromEntries(seven().map(([label, c]) => {
    const a = noScreenAttributedBytes(c);
    return [label, { lists: leftLists(c, a), entries: leftEntries(c, a) }];
  }));
  // The Harmony 350 compiles: nothing but the empty map, `00 00`, of the device with no infrared commands, which
  // `memory.md` already reads as "exactly one map is empty".
  for (const label of ['setup', 'first', 'h350_config']) assert.deepEqual(all[label], { lists: {}, entries: [] }, label);
  assert.deepEqual(all['h350_three_devices_config'], { lists: {}, entries: ['3:whole 00'] });
  assert.deepEqual(all['h350_programmed_config'], { lists: {}, entries: ['2:whole 00'] });
  // The 2011 Harmony 300: the plain send pair, 79 of them, the press that switches the pin and selects, the activity
  // with no flag (two sends, each with its wait, then the select) and the two power on lists of plain sends; and the
  // television's binding of scan 11, a favourite key of the Harmony 350's table.
  assert.deepEqual(all['h300_config'], {
    lists: { '7d 7c': 79, '1f:e9 1f:ff': 2, '7f 7c 7f 7c 1f:ff': 1, '7f 7c': 2 },
    entries: ['1:8b'],
  });
  // The programmed Harmony 300: the press that selects on its four device keys, and its favourite keys, scans 8, 9, 11,
  // 34 and 2 on the KPN's map and 11 on the DVD's, which `FAVOURITE_SCANS` and `FAVOURITE_FIVE` state for skin 104 only.
  assert.deepEqual(all['h300_programmed_config'], {
    lists: { '1f:e9 1f:ff': 4 },
    entries: ['1:89', '1:88', '1:8b', '1:82', '1:a2', '3:8b'],
  });
});

test('5.2.1: the test setup compile\'s lists by writer agree with the census\'s by what reaches them', needsLab, () => {
  const c = atPath(SETUP);
  const by = listsBy(c, noScreenAttributedBytes(c));
  assert.deepEqual(by, {
    'action step lists': 1, 'activity lists': 1, 'channel lists': 5, 'condition lists': 1, constants: 19, 'flip lists': 8, 'gate lists': 9,
    'input write lists': 1, 'key press lists': 4, 'key select lists': 8, 'power on lists': 8, 'reset lists': 16, 'send lists': 250,
  });
  // The census's roles of the same 331 lists, `noscreencensus.test.ts`, its own reader, by what reaches each.
  const census = { activity: 10, channel: 5, key: 12, pin: 13, power: 19, send: 216, 'start up': 6, 'uncalled send': 34, 'uncalled silent write': 16 };
  assert.equal(sum(by), 331);
  assert.equal(by['send lists'], census.send + census['uncalled send']);
  assert.equal(by['reset lists'], census['uncalled silent write']);
  assert.equal(by['constants'], census['start up'] + census.pin);
  assert.equal(by['key press lists']! + by['key select lists']!, census.key);
  assert.equal(by['channel lists'], census.channel);
  const switching = ['power on lists', 'gate lists', 'flip lists', 'activity lists', 'condition lists', 'input write lists', 'action step lists'];
  assert.equal(switching.reduce((n, kind) => n + ((by as Record<string, number>)[kind] ?? 0), 0), census.activity + census.power);
});

test('5.2.1: a key\'s press starts its timers by numbers in no order of ours, so the press list\'s writer takes both', needsLab, () => {
  // Every press list of the Harmony 350 compiles, read by the kind's own reader, as `[pin, timers...]`.
  const press = NO_SCREEN_LIST_KINDS.find((kind) => kind.name === 'key press lists')!;
  const timersOf = (c: Container): number[][] => {
    const a = noScreenAttributedBytes(c);
    const tag = NO_SCREEN_ATTRIBUTIONS.indexOf('key press lists') + 1;
    const lists = c.actionLists()!;
    return (c.pointerArray(7) ?? []).flatMap((address, index) => (a.owners[c.blobOffsetOf(address)!] === tag ? [index] : []))
      .map((index) => press.read(lists[index]!)!.slice(1));
  };
  const setup = timersOf(atPath(SETUP));
  const factory = timersOf(parse(require_('h350_config')));
  // A block's two timers, the 400 tick one and then the 600: 14 and 7 in a press of the test setup's compile, 3 and 2
  // in the factory 350's, where our composer would number them n and n + 1.
  assert.ok(setup.some((timers) => timers.join() === '3,4,14,7'), 'the test setup compile\'s two device press starting 14 and 7');
  assert.ok(factory.some((timers) => timers.join() === '3,2'), 'the factory 350\'s press starting 3 and 2');
  const consecutive = [...setup, ...factory].flatMap((timers) => [timers.slice(0, 2), timers.slice(2, 4)].filter((pair) => pair.length === 2))
    .filter(([a, b]) => b === a! + 1).length;
  const pairs = [...setup, ...factory].reduce((n, timers) => n + timers.length / 2, 0);
  // Six of the eleven blocks of the two compiles do count on from their first timer, which is why a writer that
  // counted on gave back three of these seven press lists and all of ours, and the four it did not were the finding.
  assert.deepEqual({ consecutive, pairs }, { consecutive: 6, pairs: 11 });
});

// ---------------------------------------------------------------------------------------------------------------
// 5.2.2: our build

test('5.2.2: our build of the test setup from nothing is every byte a generator\'s, none carried and none unclaimed', needsArchive, () => {
  const c = ours();
  const a = noScreenAttributedBytes(c);
  // 124170 since `todo-compile-350.md` 5.4, which put the entry binding event 0xFF into the empty configuration, and so
  // into everything built on it: four bytes in the key table, credited to the constants, two of them the list's number
  // and so description. It was 124166, constants 248 and description 110040, when 5.2 was checked without it.
  assert.equal(a.total, 124170);
  assert.deepEqual(Object.fromEntries(a.carried), {});
  assert.equal(a.unclaimed, 0);
  assert.equal(sum(a.generated), a.total);
  // One owner per byte by construction; a second writer gives back one list, the channel spelled out, whose two
  // calls of digit sends are a power action of two steps as well.
  assert.equal(a.contested, 7);
  assert.deepEqual(Object.fromEntries(a.contests), { 'channel lists > action step lists': 7 });
  assert.deepEqual(a.generated, {
    frame: 102, 'state tables': 847, constants: 252, 'metadata archive': 3028, infrared: 114150, 'number sender': 113, 'key timers': 112,
    'send lists': 2800, 'power on lists': 62, 'gate lists': 63, 'flip lists': 80, 'reset lists': 112, 'key press lists': 100,
    'key select lists': 56, 'activity lists': 22, 'condition lists': 7, 'input write lists': 7, 'channel lists': 35, 'action step lists': 10,
    'key maps': 1021, 'table headers': 1191,
  });
  // The description, what the generators were handed: nine bytes in ten, almost all the infrared blocks' durations.
  assert.equal(sum(a.described), 110042);
  assert.equal(a.described.infrared, 108066);
  // Every list by its writer: 361, the test setup's 331 and the KPN's 30 more sends of 5.1.6.
  assert.deepEqual(listsBy(c, a), {
    'action step lists': 1, 'activity lists': 1, 'channel lists': 5, 'condition lists': 1, constants: 19, 'flip lists': 8, 'gate lists': 9,
    'input write lists': 1, 'key press lists': 4, 'key select lists': 8, 'power on lists': 8, 'reset lists': 16, 'send lists': 280,
  });
});

test('5.2.2: the empty configurations of both models are every byte a generator\'s, the accounting of noscreenempty.test.ts again', () => {
  // Four bytes longer than 5.1.5 built them, 1101 and 1077: the entry binding event 0xFF, 5.4, the constants' too.
  for (const [skin, length] of [[104, 1105], [79, 1081]] as const) {
    const a = noScreenAttributedBytes(buildEmptyNoScreenConfiguration({ skin, builtAt: MOMENT }).container);
    assert.equal(a.total, length, `skin ${skin}`);
    assert.equal(sum(a.generated), length, `skin ${skin}`);
    assert.deepEqual(Object.fromEntries(a.carried), {}, `skin ${skin}`);
    assert.equal(a.unclaimed, 0, `skin ${skin}`);
    assert.equal(a.contested, 0, `skin ${skin}`);
  }
});

test('5.2.2, the control: a byte planted where no generator writes it is named, by its list, and the file still passes the writer\'s check',
  needsArchive, () => {
    const c = ours();
    const a = noScreenAttributedBytes(c);
    // The first send list: `03`, then `FB FF 07`, the timers cancelled. Its `FB` made `FA` gives `07 FFFA`, an
    // instruction a send event's list ends with and no send list holds, so no writer gives the list back.
    const tag = NO_SCREEN_ATTRIBUTIONS.indexOf('send lists') + 1;
    const index = (c.pointerArray(7) ?? []).findIndex((address) => a.owners[c.blobOffsetOf(address)!] === tag);
    const at = c.blobOffsetOf(c.pointerArray(7)![index]!)!;
    assert.deepEqual([...c.blob.subarray(at, at + 4)], [0x03, 0xfb, 0xff, 0x07]);
    const planted = c.blob.slice();
    planted[at + 1] = 0xfa;
    // Unstamped, the writer's check refuses it, and so does the attribution, since the file does not lay out again into
    // itself: the trailer the frame writes is not the one it holds.
    assert.throws(() => assertFileFamilyContainer(planted), /checksum/);
    assert.throws(() => noScreenAttributedBytes(parse(planted)), /does not lay out again/);
    restamped(planted);
    assert.doesNotThrow(() => assertFileFamilyContainer(planted));
    const b = noScreenAttributedBytes(parse(planted));
    assert.deepEqual(Object.fromEntries(b.carried), { 'slot-10-list': 10 });
    assert.equal(b.unclaimed, 0);
    const left = [...b.owners.keys()].filter((k) => b.owners[k] === 0);
    assert.deepEqual(left, Array.from({ length: 10 }, (_, k) => at + k), 'exactly the planted list, all ten bytes of it');
    assert.equal(b.generated['send lists'], a.generated['send lists'] - 10);
  });

test('5.2.2, the control: a generator\'s claim dropped returns its bytes as carried, every generator in turn', needsArchive, () => {
  const c = ours();
  const all = noScreenAttributedBytes(c);
  for (const who of NO_SCREEN_ATTRIBUTIONS) {
    const a = noScreenAttributedBytes(c, { without: new Set<NoScreenAttribution>([who]) });
    assert.equal(a.generated[who], 0, who);
    assert.equal(a.unclaimed, 0, `${who}: a region holds every byte it wrote`);
    // Where a second writer gives back what it wrote, those bytes go to that writer: only the spelled out channel.
    const taken = who === 'channel lists' ? 7 : 0;
    assert.equal(carriedOf(a), all.generated[who] - taken, who);
    if (taken > 0) assert.equal(a.generated['action step lists'], all.generated['action step lists'] + taken);
  }
  // The regions the carried bytes are named by, for three of them.
  const named = (who: NoScreenAttribution) => Object.fromEntries(noScreenAttributedBytes(c, { without: new Set<NoScreenAttribution>([who]) }).carried);
  assert.deepEqual(named('frame'), { header: 11, 'section-table': 60, marker: 4, trailer: 6, 'slot-1-arch': 7, 'slot-3-clock': 14 });
  assert.deepEqual(named('key timers'), { 'raw-8-timer': 112 });
  // The key table's share is 20 bytes, the four send event entries and, since 5.4, the entry binding event 0xFF.
  assert.deepEqual(named('constants'), {
    'slot-2-log': 8, 'slot-10-list': 151, 'raw-5-table': 34, 'raw-10-table': 16, 'raw-12-table': 2, 'raw-6-map': 20, 'raw-10-group': 21,
  });
});

test('5.2.2, what it cannot see: a number in a list changed for another that exists is still the same writer\'s', needsArchive, () => {
  // The record a send list sends is description: the attribution knows a send by its shape and that the record exists,
  // not which record a key should send. So a send of the group's next record is still a send, which is why 5.2.3, that
  // nothing but the setup and the catalogue goes in, is a check of its own.
  const c = ours();
  const a = noScreenAttributedBytes(c);
  const tag = NO_SCREEN_ATTRIBUTIONS.indexOf('send lists') + 1;
  const at = c.blobOffsetOf((c.pointerArray(7) ?? []).find((address) => a.owners[c.blobOffsetOf(address)!] === tag)!)!;
  const planted = c.blob.slice();
  planted[at + 4] = (planted[at + 4]! + 1) & 0xff;
  restamped(planted);
  const b = noScreenAttributedBytes(parse(planted));
  assert.deepEqual(Object.fromEntries(b.carried), {});
  assert.deepEqual(b.generated, a.generated);
});

// ---------------------------------------------------------------------------------------------------------------
// 5.2.3: nothing handed in

test('5.2.3: the build takes no container, and no module of the codec or of the USB library it imports reads the lab', needsArchive, () => {
  // What goes in: the catalogue's path and a request of the setup, its keys and a moment. The request has no field a
  // container could travel in, which the type says and this checks at run time against the keys handed over.
  assert.equal(buildNoScreenSetup.length, 2);
  const request = Object.freeze({ recipe: RECIPE, keys: KEYS, builtAt: MOMENT });
  assert.deepEqual(Object.keys(request).sort(), ['builtAt', 'keys', 'recipe']);
  assert.doesNotThrow(() => buildNoScreenSetup(archiveAt(IR_ARCHIVE!), request));
  // And no module that build can reach names the lab: neither the lab locator's package nor its variable appears in the
  // source of the codec or of the USB library, the one package the codec depends on that could carry a file in.
  const sources = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((one) =>
    one.isDirectory() ? sources(join(dir, one.name)) : one.name.endsWith('.ts') ? [join(dir, one.name)] : []);
  const roots = ['../src', '../../usb/src'].map((one) => new URL(one, import.meta.url).pathname);
  const files = roots.flatMap(sources);
  assert.ok(files.length > 100, 'the sources are found');
  const naming = files.filter((file) => /@harmony\/lab|HARMONY_LAB/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(naming, []);
  // The tests of this build declare no lab: this file's build tests skip only without the catalogue, and so do the
  // build tests of `noscreenfromnothing.test.ts`, so `make test-nolab` runs them where no lab exists.
});

test('the attribution refuses a configuration of another family and reports, rather than refuses, a part no generator writes', () => {
  const c = buildEmptyNoScreenConfiguration({ skin: 104, builtAt: MOMENT }).container;
  assert.throws(() => noScreenAttributedBytes({ ...c, architecture: 14 } as Container), ComposeError);
  // The regions name every byte of the empty configuration, so nothing there is unclaimed even before a generator marks.
  const covered = new Uint8Array(c.blob.length);
  for (const region of noScreenRegions(c)) covered.fill(1, region.start, region.start + region.length);
  assert.equal(covered.every((one) => one === 1), true);
});
