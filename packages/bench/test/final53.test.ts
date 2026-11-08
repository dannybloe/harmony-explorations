/**
 * The two bench tests of `todo-compile-350.md` 5.3, one per remote, held against the file both are run on: the lab's
 * `work/setups/h350-test/from-nothing-5.4.bin`, the test setup built from nothing with firmware event `0xFF` bound,
 * 5.4. `irtests/350-5-3-final.json` is for the bench Harmony 350 and `irtests/300-5-3-final.json` for the bench Harmony
 * 300, the European printing.
 *
 * **Why two files for one configuration.** Decision 28 makes the two remotes one for configurations, and the steps are
 * the same keys in the same order, but a step's instruction names the keys as they are printed, and the printing
 * differs: the device keys (TV/Media, Cable/PC, AVR/Game and DVD/Music on the 350, TV, Cable/Sat, DVD and VCR/Aux on
 * the 300) and the favourite block (five favourites on the 350; on the European 300 four and Teletext, the key printed
 * 3 in the place of the 350's favourite 5 and Teletext in the place of its favourite 3),
 * `reference/remotes/harmony-300/keys.md`. The expectations are one derivation and the two files carry them alike.
 *
 * **The steps** are 5.1.6's, `fromnothing350.test.ts`, every device key short and long, a power variable on and off,
 * Watch TV on and off and the favourites, with one change: Kodi's step presses Exit where 5.1.6 pressed Enter, since
 * Enter was never tied to a code on a Harmony 300 and Exit was heard from Kodi there, `todo-compile-300.md` 4.3. The
 * four long press steps send from infrared groups 4, 5, 6 and 7, which is what hung the Harmony 300 before the entry,
 * the second test.
 *
 * **What this holds.** Every expectation is derived from the file, walked on the family's model of the remote,
 * `filemodel.ts`, and named the way the monitor names it from that file, which `BENCH_CONFIGS` lists: by its catalogue
 * command where the catalogue gives that name to one code of the device, and otherwise by its number in this file.
 * Every step but one also sends, by its bytes, what Logitech's second compile of the test setup sends from the same
 * keys, which both remotes have been heard to send, the 350 in 3.3 and the 300 with the entry added in 4.3; the step
 * that differs is the KPN's Channel Up and 1, which Logitech's KPN map does not bind, `noscreenfromnothing.test.ts`.
 *
 * **What it does not show**: what the remotes do. That is the run's; until it is run, the 300's sends from groups 4 to
 * 7 on our own build are predicted from the same entry on Logitech's compile, `eventff300.test.ts`.
 *
 * **Which architectures**: architecture 16, the Harmony 350 and the European Harmony 300, one file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { devices, irBlockWords, irGroups, irHeaderPointers, parse, taggedList, type Container } from '@harmony/codec/node';
import { IR_ARCHIVE, LAB, needing, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import { BENCH_CONFIGS, CodeBook } from '../src/irmonitor.ts';
import { type Expectation, type TestDefinition, testDefinitions } from '../src/irsession.ts';
import { Remote, type Action, type Key, type Send } from './filemodel.ts';

/** The file both remotes are given, and Logitech's compile it is compared with, by their paths in the lab. */
const OURS = 'work/setups/h350-test/from-nothing-5.4.bin';
const COMPILE = 'work/setups/h350-test/compile-Result.EzHex';
const DEFINITIONS = { h350: '350-5-3-final', h300: '300-5-3-final' } as const;

/**
 * The scan code of every key the tests press, by the Harmony 350 drawing's key name: one moulding, so one scan per
 * place on both remotes, `reference/remotes/harmony-300/keys.md` "Scan codes"; Exit is 12 on both.
 */
const SCAN: Readonly<Record<string, number>> = {
  CablePc: 1, Favorite5: 2, Power: 3, DvdMusic: 4, TvMedia: 5, WatchTV: 6, AvrGame: 7, Favorite1: 8, Favorite2: 9,
  Menu: 10, Favorite3: 11, Exit: 12, Number1: 24, PrevChannel: 32, Favorite4: 34, Info: 36, Stop: 40, VolumeUp: 49,
  DirectionUp: 51, ChannelUp: 55,
};
const scanOf = (key: Key): number => (typeof key === 'number' ? key : SCAN[key]!);

/** What each step does, in the files' order: 5.1.6's steps with Exit for Kodi's Enter. */
const STEPS: readonly (readonly Action[])[] = [
  [{ short: 'TvMedia' }, { press: 'VolumeUp' }, { press: 'Info' }],
  [{ long: 'TvMedia' }, { press: 'VolumeUp' }, { press: 'DirectionUp' }],
  [{ short: 'CablePc' }, { press: 'VolumeUp' }, { press: 'Menu' }],
  [{ long: 'CablePc' }, { press: 'VolumeUp' }, { press: 'Exit' }],
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

/** The step whose codes Logitech's compile does not send: Channel Up and 1 in the KPN's mode. */
const DIFFERING_STEP = 13;
/** The four long press steps, Knoll, Kodi, Switch and Sony HT, and the infrared group each one's last code is from. */
const LONG_PRESS_GROUPS: readonly [number, number][] = [[1, 4], [3, 5], [5, 6], [7, 7]];

/** The words both printings share. */
const COMMON: Readonly<Record<string, string>> = {
  Power: 'Power', WatchTV: 'Watch TV', Menu: 'Menu', Number1: '1', PrevChannel: 'Previous Channel', Info: 'Info',
  Stop: 'Stop', VolumeUp: 'Volume Up', DirectionUp: 'Up', Exit: 'Exit', ChannelUp: 'Channel Up',
};
/** Each remote's words for the keys whose printing differs, `reference/remotes/harmony-300/keys.md`. */
const WORDS: Readonly<Record<keyof typeof DEFINITIONS, Readonly<Record<string, string>>>> = {
  h350: {
    ...COMMON, TvMedia: 'TV/Media', CablePc: 'Cable/PC', AvrGame: 'AVR/Game', DvdMusic: 'DVD/Music',
    Favorite1: 'Favourite 1', Favorite2: 'Favourite 2', Favorite3: 'Favourite 3', Favorite4: 'Favourite 4', Favorite5: 'Favourite 5',
  },
  // The European printing: the favourite block's keys printed 1, 2 and 4 in the 350's favourites 1, 2 and 4, the key
  // printed 3 in its favourite 5 and Teletext in its favourite 3, codes 8, 9, 34, 2 and 11 on both.
  h300: {
    ...COMMON, TvMedia: 'TV', CablePc: 'Cable/Sat', AvrGame: 'DVD', DvdMusic: 'VCR/Aux',
    Favorite1: 'Favourite 1', Favorite2: 'Favourite 2', Favorite3: 'Teletext', Favorite4: 'Favourite 4', Favorite5: 'Favourite 3',
  },
};

function definition(id: string): TestDefinition {
  const found = testDefinitions(fileURLToPath(new URL('../irtests/', import.meta.url)))
    .concat(testDefinitions(fileURLToPath(new URL('../irtests/done/', import.meta.url))))
    .find((one) => one.id === id);
  assert.ok(found, `${id}.json in irtests/ or irtests/done/`);
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

/** A code by its bytes: the words of its three blocks. */
function bytesOf(c: Container, send: Send): string {
  const address = irGroups(c)![send.group]!.addresses[send.code]!;
  return irHeaderPointers(c, address).map((pointer) => (pointer ? (irBlockWords(c, pointer) ?? []).join(',') : '-')).join('|');
}

test('both files\' instructions name only the keys the model presses, in order, each in its remote\'s printing', () => {
  for (const remote of ['h350', 'h300'] as const) {
    const steps = definition(DEFINITIONS[remote]).steps;
    assert.equal(steps.length, STEPS.length, remote);
    STEPS.forEach((actions, at) => {
      const words = actions.map((one) => {
        if ('long' in one) return `Long press ${WORDS[remote][one.long as string]}`;
        const key = 'short' in one ? one.short : 'press' in one ? one.press : 'Power';
        return WORDS[remote][key as string]!;
      });
      assert.equal(steps[at]!.instruction, words.join(' → '), `${remote} step ${at + 1}`);
    });
  }
  // The control that the two printings are told apart: the steps whose words differ are the device keys' and the
  // favourites', and no other.
  const [a, b] = [definition(DEFINITIONS.h350).steps, definition(DEFINITIONS.h300).steps];
  const differing = a.flatMap((step, at) => (step.instruction === b[at]!.instruction ? [] : [at + 1]));
  assert.deepEqual(differing, [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13]);
});

test('the file binds event 0xFF to the 0x30 entry\'s list, and the four long press steps send from groups 4 to 7, which it is for',
  needing(skipWithoutLab()), () => {
    const ours = container(OURS).c;
    const keyTable = taggedList(ours, ours.pointerArray(6)![0]!)!.entries;
    const [ff, thirty] = [keyTable.filter((one) => one.tag === 0xff), keyTable.find((one) => one.tag === 0x30)!];
    assert.equal(ff.length, 1);
    assert.deepEqual([ff[0]!.opcode, ff[0]!.operand], [thirty.opcode, thirty.operand]);
    const sends = derived(ours);
    for (const [step, group] of LONG_PRESS_GROUPS) assert.equal(sends[step]!.at(-1)!.group, group, `step ${step + 1}`);
    // And no other step sends from a group above 3: the short press devices are groups 0 to 3.
    const above = sends.flatMap((step, at) => (step.some((one) => one.group > 3) ? [at] : []));
    assert.deepEqual(above, LONG_PRESS_GROUPS.map(([step]) => step));
  });

test('every step but the KPN\'s fuller map sends what Logitech\'s second compile sends from the same keys, by their bytes',
  needing(skipWithoutLab()), () => {
    const ours = container(OURS).c;
    const theirs = container(COMPILE).c;
    const read = (c: Container): string[][] => {
      const names = new Map(devices(c).map((one) => [one.group, one.name]));
      return derived(c).map((sends) => sends.map((one) => `${names.get(one.group)} ${bytesOf(c, one)}`));
    };
    const [mine, logitech] = [read(ours), read(theirs)];
    STEPS.forEach((_, at) => {
      if (at !== DIFFERING_STEP) assert.deepEqual(mine[at], logitech[at], `step ${at + 1}`);
    });
    assert.deepEqual(logitech[DIFFERING_STEP], []);
    assert.equal(mine[DIFFERING_STEP]!.length, 2);
  });

test('every expectation in both files is what the monitor will name the code the file sends, the same in both',
  needing(skipWithoutLab(), skipWithoutIrArchive()), () => {
    const { c: ours, blob } = container(OURS);
    assert.ok(BENCH_CONFIGS.includes(OURS), 'the file is on the bench\'s list, so the monitor names its codes');
    const book = new CodeBook((name) => (name === OURS ? blob : undefined), [OURS], IR_ARCHIVE);
    book.nameFromCatalogue();
    const names = new Map(devices(ours).map((d) => [d.group, d.name]));
    const expectation = (send: Send): Expectation => {
      const command = book.storedName(OURS, send.group, send.code)?.command;
      const device = names.get(send.group)!;
      // A name the catalogue gives two codes of one device does not say which was heard, so such a code is expected by
      // its number in this file.
      const twice = command === undefined
        || irGroups(ours)![send.group]!.addresses.filter((_, code) => book.storedName(OURS, send.group, code)?.command === command).length > 1;
      return twice ? { device, code: send.code, config: OURS } : { device, command };
    };
    // The same code twice in a row is one expectation: the monitor folds a frame within 200 ms of the same code into the
    // press before it.
    const expected = derived(ours).map((sends) => sends
      .filter((send, at, all) => at === 0 || send.group !== all[at - 1]!.group || send.code !== all[at - 1]!.code)
      .map(expectation));
    for (const remote of ['h350', 'h300'] as const) {
      assert.deepEqual(definition(DEFINITIONS[remote]).steps.map((step) => step.expect ?? []), expected, remote);
    }
    assert.equal(expected.flat().length, 33);
    // Which are by number: the Denon's power on and off, and every KPN digit and its Channel Up.
    const byNumber = expected.flat().filter((one) => one.code !== undefined).map((one) => `${one.device} ${one.code}`);
    assert.deepEqual(byNumber, ['Denon 26', 'KPN 36', 'KPN 37', 'KPN 38', 'KPN 41', 'KPN 35', 'KPN 42', 'KPN 13', 'KPN 1', 'Denon 27']);
  });
