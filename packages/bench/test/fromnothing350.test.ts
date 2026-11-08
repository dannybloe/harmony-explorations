/**
 * The Harmony 350's bench test of the test setup built from nothing, `todo-compile-350.md` 5.1.6, held against the
 * file it tests.
 *
 * **What the file is.** `packages/codec/test/noscreenfromnothing.test.ts` builds the whole test setup with no
 * Logitech file as input: the empty configuration of 5.1.5 with the eight devices, Watch TV and the five favourite
 * channels composed onto it, the lab's `work/setups/h350-test/from-nothing-5.1.6.bin`. **Everything the bench hears is
 * ours**, unlike the 4.5 run, whose LG TV, Denon, KPN and Watch TV were Logitech's: so this test presses every device
 * key short and long, a device whose power key switches its power variable, Watch TV on and off, and the five
 * favourites.
 *
 * **What this holds.** Every step's codes are derived from the file, walked on the file based family's model of the
 * remote, `filemodel.ts`, and every step but one is walked on Logitech's second compile of the test setup too and
 * sends the same codes, compared by their bytes. **The one that differs is chosen to**: in the KPN's mode, Channel Up
 * and the digit 1 send the KPN's own codes from our file and nothing from Logitech's, whose KPN map binds 12 keys
 * where ours binds the family's 43, because that account's mode map for the KPN is the one the setup builder saved,
 * which the service reads with its hard buttons unassigned, a reason found after this run, `todo-compile-350.md`
 * 5.1.7 and `noscreenfromnothing.test.ts`. So the run hears
 * whether our fuller map works, where every other step can only agree with what was heard from Logitech's compile in
 * the 3.3 run.
 *
 * **How the monitor names the codes.** A code that is a record byte for byte equal to one of Logitech's compile, in
 * the same infrared group, is expected as the monitor names it from that compile, as the 4.5 test does: the compile
 * is on the bench's list. The two codes Logitech's compile does not store, the KPN's Channel Up and nothing else, are
 * named from our file, so the file is on the bench's list as well, `BENCH_CONFIGS`, by its path in the lab, as the
 * file the bench unit holds. A code the catalogue gives a name it gives another code of the same device too is
 * expected by its number.
 *
 * **Which architectures**: the Harmony 350 alone, one file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { devices, irGroups, parse, type Container } from '@harmony/codec/node';
import { irBlockWords, irHeaderPointers } from '@harmony/codec/internal';
import { IR_ARCHIVE, LAB, needing, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import { BENCH_CODESETS, BENCH_CONFIGS, CodeBook } from '../src/irmonitor.ts';
import { type Expectation, type TestDefinition, testDefinitions } from '../src/irsession.ts';
import { Remote, type Action, type Key, type Send } from './filemodel.ts';

/** The file built from nothing, and Logitech's compile it is held against, by their paths in the lab. */
const OURS = 'work/setups/h350-test/from-nothing-5.1.6.bin';
const COMPILE = 'work/setups/h350-test/compile-Result.EzHex';
const DEFINITION_ID = '350-5-1-6-from-nothing';

/** The scan code of every key the bench test presses, by the drawing's key name, as `setup350.test.ts` holds them. */
const SCAN: Readonly<Record<string, number>> = {
  CablePc: 1, Favorite5: 2, Power: 3, DvdMusic: 4, TvMedia: 5, WatchTV: 6, AvrGame: 7, Favorite1: 8, Favorite2: 9,
  Menu: 10, Favorite3: 11, Number1: 24, PrevChannel: 32, Favorite4: 34, Info: 36, Stop: 40, VolumeUp: 49,
  DirectionUp: 51, Enter: 54, ChannelUp: 55,
};
const scanOf = (key: Key): number => (typeof key === 'number' ? key : SCAN[key]!);

/**
 * What each step of the bench test does, in the JSON's order: the keys its instruction names. The device keys first,
 * each short and long, in the order of the 3.3 run; then a power variable switched on and off; then Watch TV, which
 * ends in the KPN's mode, where the favourites are; then the step where ours and Logitech's differ; then Watch TV
 * again, to switch off.
 */
const STEPS: readonly (readonly Action[])[] = [
  [{ short: 'TvMedia' }, { press: 'VolumeUp' }, { press: 'Info' }],
  [{ long: 'TvMedia' }, { press: 'VolumeUp' }, { press: 'DirectionUp' }],
  [{ short: 'CablePc' }, { press: 'VolumeUp' }, { press: 'Menu' }],
  [{ long: 'CablePc' }, { press: 'VolumeUp' }, { press: 'Enter' }],
  [{ short: 'AvrGame' }, { press: 'VolumeUp' }, { press: 'Info' }],
  [{ long: 'AvrGame' }, { press: 'VolumeUp' }, { press: 'Number1' }],
  [{ short: 'DvdMusic' }, { press: 'VolumeUp' }, { press: 'PrevChannel' }],
  [{ long: 'DvdMusic' }, { press: 'VolumeUp' }, { press: 'Stop' }],
  [{ short: 'CablePc' }, { press: 'Power' }, { press: 'Power' }],
  [{ press: 'WatchTV' }],
  [{ press: 'Favorite1' }, { press: 'Favorite2' }, { press: 'Favorite3' }],
  [{ press: 'Favorite4' }],
  [{ press: 'Favorite5' }],
  [{ press: 'ChannelUp' }, { press: 'Number1' }],
  [{ press: 'WatchTV' }],
];

/** The step whose codes are ours alone: Channel Up and 1 in the KPN's mode. */
const DIFFERING_STEP = 13;

/** The words an instruction uses for each key, so the instruction can be checked against `STEPS`. */
const WORDS: Readonly<Record<string, string>> = {
  CablePc: 'Cable/PC', Favorite5: 'Favourite 5', Power: 'Power', DvdMusic: 'DVD/Music', TvMedia: 'TV/Media',
  WatchTV: 'Watch TV', AvrGame: 'AVR/Game', Favorite1: 'Favourite 1', Favorite2: 'Favourite 2', Menu: 'Menu',
  Favorite3: 'Favourite 3', Number1: '1', PrevChannel: 'Previous Channel', Favorite4: 'Favourite 4', Info: 'Info',
  Stop: 'Stop', VolumeUp: 'Volume Up', DirectionUp: 'Up', Enter: 'Enter', ChannelUp: 'Channel Up',
};

function definition(): TestDefinition {
  const found = testDefinitions(fileURLToPath(new URL('../irtests/', import.meta.url)))
    .concat(testDefinitions(fileURLToPath(new URL('../irtests/done/', import.meta.url))))
    .find((one) => one.id === DEFINITION_ID);
  assert.ok(found, `${DEFINITION_ID}.json in irtests/ or irtests/done/`);
  return found.definition;
}

function container(file: string): { c: Container; blob: Uint8Array } {
  const path = join(LAB!, file);
  // The lab is there, so a missing file fails rather than skips: the claim is about this one file.
  assert.ok(existsSync(path), `${file} is in the lab`);
  const blob = new Uint8Array(readFileSync(path));
  return { c: parse(blob), blob };
}

/** Every step's sends, walked on a file from its seeded state. */
function derived(c: Container): Send[][] {
  const remote = new Remote(c, scanOf);
  return STEPS.map((actions) => actions.flatMap((one) => remote.act(one)));
}

/** A code by its bytes: the words of its three blocks, which is what the receiver can hear of it and more. */
function bytesOf(c: Container, send: Send): string {
  const address = irGroups(c)![send.group]!.addresses[send.code]!;
  return irHeaderPointers(c, address).map((pointer) => (pointer ? (irBlockWords(c, pointer) ?? []).join(',') : '-')).join('|');
}

/** A step's sends by device name and bytes, the form two files are compared in. */
const read = (c: Container): string[][] => {
  const names = new Map(devices(c).map((one) => [one.group, one.name]));
  return derived(c).map((sends) => sends.map((one) => `${names.get(one.group)} ${bytesOf(c, one)}`));
};

test('every instruction of the from nothing bench test names only the keys the model presses, in order, a long press as a long press', () => {
  const steps = definition().steps;
  assert.equal(steps.length, STEPS.length);
  STEPS.forEach((actions, at) => {
    const words = actions.map((one) => {
      if ('long' in one) return `Long press ${WORDS[one.long as string]}`;
      const key = 'short' in one ? one.short : 'press' in one ? one.press : 'Power';
      return WORDS[key as string]!;
    });
    assert.equal(steps[at]!.instruction, words.join(' → '), `step ${at + 1}`);
  });
});

test('the file built from nothing sends, step for step, the codes Logitech\'s second compile sends, by their bytes, but in the KPN\'s fuller map',
  needing(skipWithoutLab()), () => {
    const ours = container(OURS).c;
    const theirs = container(COMPILE).c;
    const [mine, logitech] = [read(ours), read(theirs)];
    STEPS.forEach((_, at) => {
      if (at === DIFFERING_STEP) return;
      assert.deepEqual(mine[at], logitech[at], `step ${at + 1}`);
    });
    // The step that differs: Channel Up and 1 in the KPN's mode, which Logitech's compile binds to nothing.
    assert.deepEqual(logitech[DIFFERING_STEP], []);
    assert.equal(mine[DIFFERING_STEP]!.length, 2);
    // What the file sends, by its own numbers, which are not Logitech's: the order a device's records are stored in
    // is the composer's, plan 011's numbering.
    const names = new Map(devices(ours).map((one) => [one.group, one.name]));
    const own = derived(ours).map((sends) => sends.map((one) => `${names.get(one.group)} ${one.code}`));
    assert.deepEqual(own, [
      ['LG_TV 35', 'LG_TV 24'],
      ['Denon 25', 'Knoll 3'],
      ['Plasma 37', 'Plasma 26'],
      ['Denon 25', 'Kodi 18'],
      ['Denon 25', 'Denon 16'],
      ['Denon 25', 'Switch 0'],
      ['Denon 25', 'KPN 12'],
      ['Denon 25', 'Sony_HT 24'],
      // The Plasma's power variable starts at 0 in the file, so the first press switches it on and the second off.
      ['Plasma 39', 'Plasma 40'],
      // Watch TV from everything off: the TV on, the Denon on, the KPN's toggle, then the Denon's input, which the
      // flag lets through once it is set; the TV's one input sends nothing.
      ['LG_TV 37', 'Denon 26', 'KPN 34', 'Denon 28'],
      // The favourites in the KPN's mode, which Watch TV left the remote in: 1, 2 and 3 a digit each, 666 three 6s,
      // 07 its 0 then its 7, each digit the one block copy the device composer stores.
      ['KPN 36', 'KPN 37', 'KPN 38'],
      ['KPN 41', 'KPN 41', 'KPN 41'],
      ['KPN 35', 'KPN 42'],
      // Channel Up and 1 in the KPN's mode, the KPN's own full codes: the step Logitech's compile sends nothing for.
      ['KPN 13', 'KPN 1'],
      // And again: the TV off, the Denon off, the KPN's toggle, and no input.
      ['LG_TV 38', 'Denon 27', 'KPN 34'],
    ]);
  });

test('every expectation in the from nothing bench test is what the monitor will name the code the file sends',
  needing(skipWithoutLab(), skipWithoutIrArchive()), () => {
    const { c: ours, blob: ourBlob } = container(OURS);
    const { c: theirs, blob } = container(COMPILE);
    // Both files are on the bench's list: the compile names every code it stores, ours the two it does not.
    assert.ok(BENCH_CONFIGS.includes(COMPILE));
    assert.ok(BENCH_CONFIGS.includes(OURS));
    const book = new CodeBook((name) => (name === COMPILE ? blob : name === OURS ? ourBlob : undefined), [COMPILE, OURS], IR_ARCHIVE);
    book.nameFromCatalogue(BENCH_CODESETS);
    // A code as the compile's code of the same bytes in the same group, where it stores one; there is at most one.
    const inCompile = (send: Send): Send | undefined => {
      const want = bytesOf(ours, send);
      const codes = irGroups(theirs)![send.group]!.addresses.map((_, code) => code)
        .filter((code) => bytesOf(theirs, { group: send.group, code }) === want);
      assert.ok(codes.length <= 1, `group ${send.group} code ${send.code}`);
      return codes.length === 0 ? undefined : { group: send.group, code: codes[0]! };
    };
    const expectation = (send: Send): Expectation => {
      const there = inCompile(send);
      const [config, c, one] = there === undefined ? [OURS, ours, send] as const : [COMPILE, theirs, there] as const;
      const command = book.storedName(config, one.group, one.code)?.command;
      const device = new Map(devices(c).map((d) => [d.group, d.name])).get(one.group)!;
      // A name the catalogue gives two codes of one device does not say which was heard, so such a code is expected
      // by its number in the file the monitor names it from.
      const twice = command === undefined
        || irGroups(c)![one.group]!.addresses.filter((_, code) => book.storedName(config, one.group, code)?.command === command).length > 1;
      return twice ? { device, code: one.code, config } : { device, command };
    };
    // The same code twice in a row is one expectation: the monitor folds a frame within 200 ms of the same code into
    // the press before it.
    const expected = derived(ours).map((sends) => sends
      .filter((send, at, all) => at === 0 || send.group !== all[at - 1]!.group || send.code !== all[at - 1]!.code)
      .map(expectation));
    assert.deepEqual(definition().steps.map((step) => step.expect ?? []), expected);
    assert.equal(expected.flat().length, 33);
    // Only the step that differs names a code from our file.
    const fromOurs = expected.flatMap((step, at) => step.filter((one) => one.config === OURS).map(() => at));
    assert.deepEqual([...new Set(fromOurs)].filter((at) => at !== DIFFERING_STEP), []);
  });
