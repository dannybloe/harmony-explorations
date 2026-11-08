/**
 * The Harmony 350's bench test of our composed test setup, `todo-compile-350.md` 4.5, held against the file it tests.
 *
 * **What the file is.** `packages/codec/test/noscreensetup.test.ts` takes Logitech's first compile of the test setup,
 * takes out the five devices the family's removal step can, the Knoll, Kodi, the Switch, the Sony HT and the Plasma,
 * and composes them back with the five favourite channels on the KPN; the result is the lab's `work/setups/h350-test/
 * composed-4.5.bin`, and it is Logitech's second compile read by content. **What the bench hears as ours**: the five
 * composed devices, their records, send lists, maps, key bindings, timers and power variables, and the five
 * favourite channels with the number sender. **What stays Logitech's**: the LG TV, the Denon and the KPN, and Watch
 * TV, so the bench test presses no Watch TV.
 *
 * **What this holds.** The bench test's expectations are derived from the composed file, the way `setup350.test.ts`
 * derives the 3.3 run's: the file's own instructions walked on a model of the remote, `filemodel.ts`, and every code
 * named as the monitor will name it. And because the composed file is meant to be Logitech's by content, each step is
 * walked on Logitech's second compile too, and sends the same codes, compared by their bytes.
 *
 * **The monitor names these codes without loading the composed file.** Every code the bench test expects is a record
 * byte for byte equal to one of Logitech's second compile, in the same infrared group, so it matches that compile's
 * stored frame, which `BENCH_CONFIGS` loads, and the catalogue names it the same; so the composed file is not added
 * there. A composed device's codes are numbered otherwise than Logitech's, the composer storing its records in
 * another order, so an expectation that would need a number names the compile's, and the test checks that each such
 * number is the compile's for the same bytes.
 *
 * **Which architectures**: the Harmony 350 alone, one file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { devices, irBlockWords, irGroups, irHeaderPointers, parse, type Container } from '@harmony/codec/node';
import { IR_ARCHIVE, LAB, needing, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import { BENCH_CODESETS, BENCH_CONFIGS, CodeBook } from '../src/irmonitor.ts';
import { type Expectation, type TestDefinition, testDefinitions } from '../src/irsession.ts';
import { Remote, type Action, type Key, type Send } from './filemodel.ts';

/** The composed file, and Logitech's compile it is held against, by their paths in the lab. */
const COMPOSED = 'work/setups/h350-test/composed-4.5.bin';
const COMPILE = 'work/setups/h350-test/compile-Result.EzHex';
const DEFINITION_ID = '350-4-5-composed';

/** The scan code of every key the bench test presses, by the drawing's key name, as `setup350.test.ts` holds them. */
const SCAN: Readonly<Record<string, number>> = {
  CablePc: 1, Favorite5: 2, Power: 3, DvdMusic: 4, TvMedia: 5, AvrGame: 7, Favorite1: 8, Favorite2: 9, Menu: 10,
  Favorite3: 11, Number1: 24, Favorite4: 34, Stop: 40, VolumeUp: 49, DirectionUp: 51, Enter: 54,
};
const scanOf = (key: Key): number => (typeof key === 'number' ? key : SCAN[key]!);

/** What each step of the bench test does, in the JSON's order: the keys its instruction names. */
const STEPS: readonly (readonly Action[])[] = [
  [{ short: 'CablePc' }, { press: 'VolumeUp' }, { press: 'Menu' }],
  [{ press: 'Power' }, { press: 'Power' }],
  [{ long: 'TvMedia' }, { press: 'VolumeUp' }, { press: 'DirectionUp' }],
  [{ press: 'Power' }],
  [{ long: 'CablePc' }, { press: 'VolumeUp' }, { press: 'Enter' }, { press: 'Number1' }],
  [{ long: 'AvrGame' }, { press: 'VolumeUp' }, { press: 'Number1' }],
  [{ long: 'DvdMusic' }, { press: 'VolumeUp' }, { press: 'Stop' }],
  [{ short: 'DvdMusic' }, { press: 'Favorite1' }],
  [{ press: 'Favorite2' }],
  [{ press: 'Favorite3' }],
  [{ press: 'Favorite4' }],
  [{ press: 'Favorite5' }],
];

/** The words an instruction uses for each key, so the instruction can be checked against `STEPS`. */
const WORDS: Readonly<Record<string, string>> = {
  CablePc: 'Cable/PC', Favorite5: 'Favourite 5', Power: 'Power', DvdMusic: 'DVD/Music', TvMedia: 'TV/Media',
  AvrGame: 'AVR/Game', Favorite1: 'Favourite 1', Favorite2: 'Favourite 2', Menu: 'Menu', Favorite3: 'Favourite 3',
  Number1: '1', Favorite4: 'Favourite 4', Stop: 'Stop', VolumeUp: 'Volume Up', DirectionUp: 'Up', Enter: 'Enter',
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

test('every instruction of the bench test names only the keys the model presses, in order, a long press as a long press', () => {
  const steps = definition().steps;
  assert.equal(steps.length, STEPS.length);
  assert.ok(steps.length <= 12);
  STEPS.forEach((actions, at) => {
    const words = actions.map((one) => {
      if ('long' in one) return `Long press ${WORDS[one.long as string]}`;
      const key = 'short' in one ? one.short : 'press' in one ? one.press : 'Power';
      return WORDS[key as string]!;
    });
    assert.equal(steps[at]!.instruction, words.join(' → '), `step ${at + 1}`);
  });
});

test('the composed file sends, step for step, the codes Logitech\'s second compile sends, by their bytes', needing(skipWithoutLab()), () => {
  const ours = container(COMPOSED).c;
  const theirs = container(COMPILE).c;
  const names = (c: Container) => new Map(devices(c).map((one) => [one.group, one.name]));
  const read = (c: Container) => derived(c).map((sends) => sends.map((one) => `${names(c).get(one.group)} ${bytesOf(c, one)}`));
  assert.deepEqual(read(ours), read(theirs));
  // What the composed file sends, by its own numbers; Logitech's numbers the composed devices' codes otherwise.
  const own = derived(ours).map((sends) => sends.map((one) => `${names(ours).get(one.group)} ${one.code}`));
  assert.deepEqual(own, [
    ['Plasma 37', 'Plasma 26'],
    // The Plasma's power variable starts at 0 in the file, so the first press switches it on and the second off.
    ['Plasma 39', 'Plasma 40'],
    ['Denon 14', 'Knoll 3'],
    ['Knoll 6'],
    ['Denon 14', 'Kodi 18', 'Kodi 1'],
    ['Denon 14', 'Switch 0'],
    ['Denon 14', 'Sony_HT 24'],
    // The five favourites in the KPN's mode: 1, 2 and 3 a digit each, 666 three 6s, and 07 its 0 then its 7.
    ['KPN 12'],
    ['KPN 13'],
    ['KPN 8'],
    ['KPN 3', 'KPN 3', 'KPN 3'],
    ['KPN 10', 'KPN 5'],
  ]);
});

test('every expectation in the bench test is what the monitor, loading Logitech\'s compile, will name the code the composed file sends',
  needing(skipWithoutLab(), skipWithoutIrArchive()), () => {
    const ours = container(COMPOSED).c;
    const { c: theirs, blob } = container(COMPILE);
    // The compile is on the bench's list and the composed file is not: its codes are the compile's, below.
    assert.ok(BENCH_CONFIGS.includes(COMPILE));
    assert.ok(!BENCH_CONFIGS.includes(COMPOSED));
    const book = new CodeBook((name) => (name === COMPILE ? blob : undefined), [COMPILE], IR_ARCHIVE);
    book.nameFromCatalogue(BENCH_CODESETS);
    const names = new Map(devices(theirs).map((one) => [one.group, one.name]));
    // Each composed code as the compile's code of the same bytes in the same group; there is exactly one.
    const inCompile = (send: Send): Send => {
      const want = bytesOf(ours, send);
      const codes = irGroups(theirs)![send.group]!.addresses.map((_, code) => code)
        .filter((code) => bytesOf(theirs, { group: send.group, code }) === want);
      assert.equal(codes.length, 1, `group ${send.group} code ${send.code}`);
      return { group: send.group, code: codes[0]! };
    };
    const commandOf = (send: Send) => book.storedName(COMPILE, send.group, send.code)?.command;
    // A name the catalogue gives two codes of one device does not say which was heard, so such a code is expected by
    // its number in the compile.
    const ambiguous = (send: Send): boolean => {
      const name = commandOf(send);
      if (name === undefined) return true;
      return irGroups(theirs)![send.group]!.addresses.filter((_, code) => commandOf({ group: send.group, code }) === name).length > 1;
    };
    // The same code twice in a row is one expectation: the monitor folds a frame within 200 ms of the same code into
    // the press before it.
    const expected = derived(ours).map((sends) => sends.map(inCompile)
      .filter((send, at, all) => at === 0 || send.group !== all[at - 1]!.group || send.code !== all[at - 1]!.code)
      .map((send): Expectation => (ambiguous(send)
        ? { device: names.get(send.group)!, code: send.code, config: COMPILE }
        : { device: names.get(send.group)!, command: commandOf(send)! })));
    assert.deepEqual(definition().steps.map((step) => step.expect ?? []), expected);
    assert.equal(expected.flat().length, 20);
  });
