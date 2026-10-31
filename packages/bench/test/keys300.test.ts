/**
 * Which key of the bench Harmony 300 raises which scan code, heard by pressing every key with the receiver
 * listening, `todo-compile-300.md` 2.1 and 2.2, against the predictions committed before the second run,
 * `docs/predictions/harmony-300-keys.md`.
 *
 * **What was run.** Two bench tests on the bench Harmony 300, which is the European model, skin 79. The
 * first, `packages/bench/irtests/done/300-2-1-every-key.json`, the lab's `h300_every_key_ir`, pressed every key
 * in the television's mode on `work/300-every-key/every-key.bin`: the unit's own configuration with the twelve
 * codes the television's map left unbound given Info's list, so every key sends something and a filled key
 * says nothing about which code it is. The second, `packages/bench/irtests/done/300-2-2-keys.json`, the lab's
 * `h300_keys_ir`, pressed every key in the television's mode and again in the KPN box's on the unit's own
 * configuration, `h300_programmed_config` (the lab's `work/300-delay/before.bin`, byte for byte). The second
 * test was generated from the file by the lab's `work/300-every-key/k2300.ts`, each step expecting what the
 * file binds to the code the Harmony 350 raises for the key in the same place.
 *
 * **Why four of its steps failed, and why that is not the remote.** The test's steps named the keys by the
 * US Harmony 300's printing, which `packages/silhouettes/src/models/h300.ts` draws, and the bench unit is
 * the European one, whose printing differs in two places, as stated by the person holding it: the colour
 * keys run red, green, yellow, blue with no letters, as on the Harmony 350, where the US printing runs
 * yellow, blue, red, green lettered A to D; and the favourite block prints 1 left of TV Input, 3 right of
 * it, and 2, Teletext and 4 below, where the US printing has favourites 1 to 5. So the person pressed the
 * colour keys by the colour the step named and the favourites by their printed numbers, in another order
 * than the steps expected, and steps 6, 9, 15 and 18 failed their stored verdicts. **These tests do not read
 * a stored verdict as the result**: every press is matched again from the pulses the receiver reported,
 * and each step is held to what the file sends for the presses the European printing implies, `STEPS_22`.
 *
 * **The method**, as for the Harmony 350's run on Logitech's compile, `setup350.test.ts`: the remote is the
 * file walked key by key, `filemodel.ts`, and a key's code is every one of the 56 that, raised in its place
 * with every other press of the run as it was, gives what the receiver heard from that point to the end of
 * the run, intersected over every press of the key in both runs. A key is tied where one code is left. No
 * code is taken from one key's set because another key holds it: the favourites printed 1, 2 and 3 send the
 * KPN box a channel whose digit the digit keys send too, so their presses in that mode fit their own code and
 * the digit key's alike, and the television's mode tells them apart, where the digit keys send and the
 * favourites, pressed there too, sent nothing.
 *
 * ## What was heard
 *
 * **Every step of both runs is what the file sends for the presses the European printing implies**: 36 of
 * the 37 steps, 132 sends compared code by code, 53 in the first run and 79 in the second; the other step,
 * the first run's favourite block, is not known press by press, below. **49 of the 55 keys are tied to one code, and every one is the code of the Harmony 350 key
 * in the same place**, `DECIDED`: the four device keys, Watch TV, Power, the three favourites and Teletext
 * among them. The six left are the keys both files bind to nothing in the modes pressed, which sent
 * nothing: Clear, Enter, TV Input, Live and the two arrows between Menu, Info, Exit and Guide.
 *
 * * **The colour keys are the 350's order on this unit.** Pressed left to right in the first run they sent
 *   the television's Red, Green, Yellow and Blue, codes 13, 27, 28 and 29; pressed by colour in the KPN box's
 *   mode of the second, yellow, blue, red, green as the step named them, they raised 28, 29, 13 and 27. In
 *   the television's mode of the second the person noted pressing in the wrong order: heard were Red,
 *   Yellow, Blue, Red and Green, five presses, each a command one code alone binds, so that step ties no
 *   key, `STEPS_22` restating it from what was heard.
 * * **The favourites printed 2 and 3 carry the second and third channels the other way round.** In the KPN
 *   box's mode the key printed 1 sent channel 1, printed 2 channel 3, printed 3 channel 2, and printed 4
 *   channel 666, three 6s: codes 8, 9, 2 and 34, the file binding channels 1, 2, 3 and 666 to codes 8, 2, 9
 *   and 34. How the channels were
 *   entered in Logitech's client is not recorded here, and the order is reported, not explained.
 * * **Teletext is code 11**, the code of the Harmony 350's favourite 3 in the same place. In the first run's
 *   favourite step, seven presses heard where five keys were named, six sent Info, which every key of the
 *   block but code 11 sends on that file, and one the television's Teletext, which code 11 alone binds. The
 *   second run did not press it: its television's favourite step heard nothing, and the person noted that
 *   there is no favourite 5, only Teletext; its KPN box's step heard the four favourites and nothing for 11.
 * * **The KPN box's Play and Pause are one frame** in this file, codes 20 and 31 the same bytes, so their
 *   presses there fit 44 and 46 alike; the television's mode decides them.
 *
 * **The predictions scored**: P1 holds for all 49 keys tied and no key sent another's code or sent where
 * silence was predicted; P2's six silent keys were silent, and its three favourites that send a digit were
 * placed after all, through the television's mode; P3 holds; P4 holds for the four favourites pressed, and its favourite 3, code 11, is this
 * unit's Teletext key and was not pressed in the KPN box's mode; P5 holds. `docs/test-notes/harmony-300.md`.
 *
 * **The control on the method**: matched again against the file and judged against the test's own
 * expectations, the second run gives the verdicts its monitor stored, word for word, steps 6, 9, 15 and 18
 * failing; the first run passes every step as stored.
 *
 * **Sources checked first**: `reference/remotes/harmony-350/keys.md` and `harmony-300/keys.md`, the family's
 * `firmware.md` (the keypad scan), `keys350.test.ts` and `setup350.test.ts`, and the predictions. Logitech's
 * client was not read for this: it names buttons by word and says nothing about which key raises which code.
 *
 * **Which architectures.** The Harmony 300 alone, skin 79, one unit, two files. The US printing, skin 78, was
 * not pressed; the codes are the moulding's, so the US drawing would take them by the same places, which is
 * not checked.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  bytes, devices, irBlockWords, irGroups, irHeaderPointers, numberSenders, parse, taggedList, type Container,
} from '@harmony/codec';
import { IR_ARCHIVE, LAB, needing, require_, skipUnless, skipWithoutIrArchive, skipWithoutLab } from '@harmony/lab';

import { CodeBook } from '../src/irmonitor.ts';
import { judge, testDefinitions, type Expectation, type RunPress, type Verdict } from '../src/irsession.ts';
import { PRESS, Remote, type Action, type Key, type Send } from './filemodel.ts';

/**
 * The prediction: every key on the code of the Harmony 350 key in the same place, by the European drawing's
 * names, `reference/remotes/harmony-350/keys.md`. Live is 43 or 56 there; neither file binds either, so 43
 * stands for it in the walk, which sends nothing either way.
 */
const SCAN: Readonly<Record<string, number>> = {
  CableSat: 1, Favorite3: 2, Power: 3, VcrAux: 4, Tv: 5, WatchTV: 6, Dvd: 7, Favorite1: 8, Favorite2: 9,
  Menu: 10, Teletext: 11, Exit: 12, Red: 13, DirectionLeft: 14, VolumeMute: 15, List: 16, Number4: 17,
  Number7: 18, Clear: 19, Number0: 20, SkipBack: 21, Rewind: 22, Record: 23, Number1: 24, UpArrow: 25,
  DownArrow: 26, Green: 27, Yellow: 28, Blue: 29, FastForward: 30, DirectionRight: 31, PrevChannel: 32,
  Guide: 33, Favorite4: 34, Input: 35, Info: 36, Number6: 37, SkipForward: 38, Number3: 39, Stop: 40,
  ChannelDown: 41, DirectionDown: 42, Live: 43, Play: 44, Number9: 45, Pause: 46, Number2: 47, Number5: 48,
  VolumeUp: 49, Select: 50, DirectionUp: 51, VolumeDown: 52, Number8: 53, Enter: 54, ChannelUp: 55,
};
const scanOf = (key: Key): number => (typeof key === 'number' ? key : SCAN[key]!);
const presses = (...keys: string[]): Action[] => keys.map((press) => ({ press }));

const RUN_21 = 'h300_every_key_ir';
const RUN_22 = 'h300_keys_ir';
/** The file the unit held for each run: a lab name, or a path in the lab for a working copy. */
const FILE: Readonly<Record<string, string>> = { [RUN_21]: 'work/300-every-key/every-key.bin', [RUN_22]: 'h300_programmed_config' };
/** The name the monitor matched both runs against, `BENCH_CONFIGS`: the two files hold the same codes. */
const NAMED_BY = 'h300_programmed_config';

const DIGITS = ['Number1', 'Number2', 'Number3', 'Number4', 'Number5', 'Number6', 'Number7', 'Number8', 'Number9', 'Number0'];

/**
 * What the person pressed in the second run, by the European drawing's names, one entry per step.
 *
 * Step 6 is restated from what was heard, the keys the five codes heard are bound to, since the person
 * noted pressing in the wrong order; it ties no key, `UNKNOWN_KEYS`. Steps 9 and 18 press the favourites by
 * their printed numbers, as the person did, and not Teletext, which neither step heard.
 */
const STEPS_22: readonly (readonly Action[])[] = [
  presses('Tv'),
  presses('VolumeUp', 'VolumeDown', 'VolumeMute', 'Power', 'Power'),
  presses('ChannelUp', 'ChannelDown', 'PrevChannel'),
  presses('DirectionUp', 'DirectionRight', 'DirectionDown', 'DirectionLeft', 'Select'),
  presses('Menu', 'Exit', 'Guide', 'Info', 'UpArrow', 'DownArrow'),
  presses('Red', 'Yellow', 'Blue', 'Red', 'Green'),
  presses('Rewind', 'Play', 'Pause', 'FastForward', 'Record', 'Stop', 'SkipBack', 'SkipForward', 'List', 'Live'),
  presses(...DIGITS, 'Clear', 'Enter'),
  presses('Input', 'Favorite1', 'Favorite2', 'Favorite3', 'Favorite4'),
  presses('CableSat'),
  presses('VolumeUp', 'VolumeDown', 'VolumeMute', 'Power'),
  presses('ChannelUp', 'ChannelDown', 'PrevChannel'),
  presses('DirectionUp', 'DirectionRight', 'DirectionDown', 'DirectionLeft', 'Select'),
  presses('Menu', 'Exit', 'Guide', 'Info', 'UpArrow', 'DownArrow'),
  // A (yellow), B (blue), C (red), D (green), pressed by the colour the step named.
  presses('Yellow', 'Blue', 'Red', 'Green'),
  presses('Rewind', 'Play', 'Pause', 'FastForward', 'Record', 'Stop', 'SkipBack', 'SkipForward', 'List', 'Live'),
  presses(...DIGITS, 'Clear', 'Enter'),
  presses('Input', 'Favorite1', 'Favorite2', 'Favorite3', 'Favorite4'),
  presses('Tv'),
];

/**
 * What the person pressed in the first run. Step 7 is the colour keys left to right, as its text says;
 * step 12, the favourite block, is not known press by press, `FAVOURITE_STEP_21`.
 */
const STEPS_21: readonly (readonly Action[])[] = [
  presses('Tv'),
  presses('VolumeUp', 'VolumeDown', 'VolumeMute'),
  presses('ChannelUp', 'ChannelDown', 'PrevChannel'),
  presses('DirectionUp', 'DirectionRight', 'DirectionDown', 'DirectionLeft', 'Select'),
  presses('Exit', 'Guide', 'Info'),
  presses('Menu', 'UpArrow', 'DownArrow'),
  presses('Red', 'Green', 'Yellow', 'Blue'),
  presses('Rewind', 'Play', 'Pause', 'FastForward', 'Record', 'Stop'),
  presses('SkipBack', 'SkipForward', 'List', 'Live'),
  presses(...DIGITS, 'Clear', 'Enter'),
  presses('Input'),
  [],
  presses('Power'),
  presses('Dvd', 'Number1', 'VolumeUp'),
  presses('VcrAux', 'ChannelUp'),
  presses('CableSat', 'ChannelUp'),
  presses('WatchTV'),
  presses('WatchTV', 'Tv'),
];

/** The first run's favourite step, zero based: seven presses heard for five keys named, not known one by one. */
const FAVOURITE_STEP_21 = 11;

/** The steps whose presses tie no key, zero based: the second run's television colours, restated from what was heard. */
const UNKNOWN_KEYS: Readonly<Record<string, readonly number[]>> = { [RUN_21]: [FAVOURITE_STEP_21], [RUN_22]: [5] };

const STEPS: Readonly<Record<string, readonly (readonly Action[])[]>> = { [RUN_21]: STEPS_21, [RUN_22]: STEPS_22 };
const RUNS = [RUN_21, RUN_22] as const;

/** A step of a run file, as far as these tests read it. */
interface RunFileStep {
  readonly instruction: string;
  readonly expect: readonly Expectation[];
  readonly presses: RunPress[];
  readonly verdicts: readonly Verdict[];
  readonly problem?: string;
}

function runFile(name: string): { readonly name: string; readonly steps: readonly RunFileStep[] } {
  return JSON.parse(new TextDecoder().decode(require_(name)));
}

function blob(file: string): Uint8Array {
  if (!file.includes('/')) return require_(file);
  const path = join(LAB!, file);
  // The lab is there, so a missing working copy fails rather than skips: the claim is about this one file.
  assert.ok(existsSync(path), `${file} is in the lab`);
  return new Uint8Array(readFileSync(path));
}

const CONTAINERS = new Map<string, Container>();
function container(file: string): Container {
  const done = CONTAINERS.get(file);
  if (done !== undefined) return done;
  const c = parse(blob(file));
  CONTAINERS.set(file, c);
  return c;
}

/**
 * Each run's presses matched again from their pulses against the unit's own configuration alone, the name
 * the monitor gave it. The catalogue is read only for the control on the method, which judges command names.
 */
const REMATCHED = new Map<string, readonly RunFileStep[]>();
const BOOKS = new Map<boolean, CodeBook>();
function rematched(name: string, named = false): readonly RunFileStep[] {
  const key = `${name} ${named}`;
  const done = REMATCHED.get(key);
  if (done !== undefined) return done;
  let book = BOOKS.get(named);
  if (book === undefined) {
    const bytes = blob(NAMED_BY);
    book = new CodeBook((one) => (one === NAMED_BY ? bytes : undefined), [NAMED_BY], IR_ARCHIVE);
    if (named) book.nameFromCatalogue();
    BOOKS.set(named, book);
  }
  const b = book;
  const steps = runFile(name).steps.map((step) => ({
    ...step,
    presses: step.presses.map((press) => {
      assert.ok(press.frame.pulses.length > 0, 'every press keeps its pulses');
      return { ...press, frame: { ...press.frame, matches: b.match(press.frame.pulses) } };
    }),
  }));
  REMATCHED.set(key, steps);
  return steps;
}

/**
 * The presses a step's sends are held to: not a bare trailing frame, and not an unreadable fragment, which on
 * these runs is always the tail of the press before it, cut off 85 to 90 ms after it began, the test below.
 */
function sent(step: RunFileStep): RunPress[] {
  return step.presses.filter((press) => !press.frame.bare && !press.frame.unreadable);
}

/** The codes of the file a heard press matches, as `group/code`. */
function heardCodes(press: RunPress): Set<string> {
  return new Set(press.frame.matches.filter((one) => one.config === NAMED_BY).map((one) => `${one.group}/${one.code}`));
}

/** Every step's sends, walking the file, with one press raised on another code if asked. */
function walk(c: Container, steps: readonly (readonly Action[])[], swap?: { step: number; at: number; scan: number }): Send[][] {
  const remote = new Remote(c, scanOf);
  return steps.map((actions, s) => actions.flatMap((action, a) =>
    remote.act(swap !== undefined && swap.step === s && swap.at === a ? { press: swap.scan } : action)));
}

/** Whether the sends of every step from `from` on are, one for one and in order, among what each press matched. */
function agrees(name: string, sends: readonly Send[][], from = 0): boolean {
  const heard = rematched(name);
  for (let s = from; s < sends.length; s += 1) {
    if (s === FAVOURITE_STEP_21 && name === RUN_21) continue;
    const h = sent(heard[s]!);
    if (h.length !== sends[s]!.length) return false;
    if (!sends[s]!.every((one, at) => heardCodes(h[at]!).has(`${one.group}/${one.code}`))) return false;
  }
  return true;
}

/** Per key, the codes every one of its presses in a run fits: the intersection over its presses. */
function fitting(name: string): Record<string, number[]> {
  const c = container(FILE[name]!);
  const steps = STEPS[name]!;
  const out: Record<string, number[]> = {};
  for (const [s, actions] of steps.entries()) {
    if (UNKNOWN_KEYS[name]!.includes(s)) continue;
    for (const [a, action] of actions.entries()) {
      const key = (action as { press: string }).press;
      const fits: number[] = [];
      for (let scan = 1; scan <= 56; scan += 1) if (agrees(name, walk(c, steps, { step: s, at: a, scan }), s)) fits.push(scan);
      out[key] = out[key] === undefined ? fits : out[key]!.filter((one) => fits.includes(one));
    }
  }
  return out;
}

/**
 * The first run's favourite step: which codes, raised in the television's mode on its file, send Teletext,
 * the one press of the step that was not Info.
 */
function teletextFits(): number[] {
  const c = container(FILE[RUN_21]!);
  const fits: number[] = [];
  const teletext = [...heardCodes(sent(rematched(RUN_21)[FAVOURITE_STEP_21]!)[4]!)];
  for (let scan = 1; scan <= 56; scan += 1) {
    const remote = new Remote(c, scanOf);
    for (const actions of STEPS_21.slice(0, FAVOURITE_STEP_21)) for (const action of actions) remote.act(action);
    const sends = remote.act({ press: scan });
    if (sends.length === 1 && teletext.includes(`${sends[0]!.group}/${sends[0]!.code}`)) fits.push(scan);
  }
  return fits;
}

/**
 * Both runs' fits, intersected per key. A key is decided where one code is left. No code is taken out of one
 * key's set for being another's: the favourites, whose channel's digits the digit keys send too, are held
 * apart by the television's mode, where they send nothing and the digit keys send.
 */
function decided(): { codes: Record<string, number>; open: Record<string, number> } {
  const sets: Record<string, number[]> = {};
  for (const name of RUNS) {
    for (const [key, fits] of Object.entries(fitting(name))) {
      sets[key] = sets[key] === undefined ? fits : sets[key]!.filter((one) => fits.includes(one));
    }
  }
  sets['Teletext'] = teletextFits();
  const codes: Record<string, number> = {};
  const open: Record<string, number> = {};
  for (const [key, fits] of Object.entries(sets)) {
    if (fits.length === 1) codes[key] = fits[0]!;
    else open[key] = fits.length;
  }
  return { codes, open };
}

const NEEDS_RUNS = needing(skipWithoutLab(), skipUnless(...RUNS, NAMED_BY));

test('both runs are the bench tests as they stand, and the second\'s stored verdicts failed steps 6, 9, 15 and 18', NEEDS_RUNS, () => {
  const dirs = ['../irtests/', '../irtests/done/'].map((dir) => fileURLToPath(new URL(dir, import.meta.url)));
  const definition = (id: string) => dirs.flatMap((dir) => testDefinitions(dir)).find((one) => one.id === id)?.definition;
  for (const [name, id] of [[RUN_21, '300-2-1-every-key'], [RUN_22, '300-2-2-keys']] as const) {
    const run = runFile(name);
    const want = definition(id);
    assert.ok(want, `${id}.json in irtests/ or irtests/done/`);
    assert.equal(run.name, want.name);
    assert.deepEqual(run.steps.map((step) => [step.instruction, step.expect]),
      want.steps.map((step) => [step.instruction, step.expect ?? []]), name);
    assert.equal(run.steps.length, STEPS[name]!.length, name);
  }
  const failed = (name: string): number[] => runFile(name).steps
    .flatMap((step, at) => (step.verdicts.every((one) => one.ok) ? [] : [at + 1]));
  assert.deepEqual(failed(RUN_21), []);
  assert.deepEqual(failed(RUN_22), [6, 9, 15, 18]);
  // The person's two notes, by step: the television's colours pressed in the wrong order, and no favourite 5.
  assert.deepEqual(runFile(RUN_22).steps.flatMap((step, at) => (step.problem ? [`${at + 1} ${step.problem}`] : [])),
    ['6 i pressed in the wrong order probably', '9 there is not favorite 5 (only teletext)']);
});

test('the two files hold the same infrared codes, so matching both runs against the unit\'s own configuration is exact', NEEDS_RUNS, () => {
  // `work/300-every-key/every-key.bin` is `h300_programmed_config` with key bindings added and nothing else,
  // the lab's NOTE beside it; the monitor matched both runs against the latter.
  const blocks = (c: Container): string[] => irGroups(c)!.flatMap((group) => group.addresses.map((address) =>
    irHeaderPointers(c, address).map((pointer) => (pointer ? (irBlockWords(c, pointer) ?? []).join(',') : '-')).join('|')));
  const [a, b] = [container(FILE[RUN_21]!), container(FILE[RUN_22]!)];
  assert.deepEqual(blocks(a), blocks(b));
  assert.deepEqual(devices(a).map((one) => `${one.group} ${one.name}`), ['0 Panasonic_TV', '1 KPN', '2 Panasonic_DVD', '3 Sony_VCR']);
  assert.deepEqual(devices(b).map((one) => `${one.group} ${one.name}`), ['0 Panasonic_TV', '1 KPN', '2 Panasonic_DVD', '3 Sony_VCR']);
});

test('every unreadable frame is the tail of the press before it, cut off within 90 ms', NEEDS_RUNS, () => {
  for (const name of RUNS) {
    for (const step of rematched(name)) {
      for (const [at, press] of step.presses.entries()) {
        if (!press.frame.unreadable) continue;
        // After a press that was readable, and after a silence a repeat's own gap is, not a person's.
        assert.ok(at > 0 && !step.presses[at - 1]!.frame.unreadable, name);
        assert.ok((press.frame.gapUs ?? Infinity) <= 90000, `${name}: ${press.frame.gapUs}`);
      }
    }
  }
  const count = (name: string): number => rematched(name).flatMap((step) => step.presses).filter((one) => one.frame.unreadable).length;
  assert.deepEqual(RUNS.map(count), [0, 5]);
});

test('every step of both runs is what the file sends for the presses the European printing implies', NEEDS_RUNS, () => {
  for (const name of RUNS) assert.ok(agrees(name, walk(container(FILE[name]!), STEPS[name]!)), name);
  // Spelled out for the second run, `device code` by step, so a reader sees what each mode sent.
  const c = container(FILE[RUN_22]!);
  const names = new Map(devices(c).map((one) => [one.group, one.name]));
  const spelled = walk(c, STEPS_22).map((sends) => sends.map((one) => `${names.get(one.group)} ${one.code}`).join(', '));
  assert.deepEqual(spelled, [
    '',
    'Panasonic_TV 35, Panasonic_TV 12, Panasonic_TV 11, Panasonic_TV 5, Panasonic_TV 5',
    'Panasonic_TV 46, Panasonic_TV 42, Panasonic_TV 26',
    'Panasonic_TV 37, Panasonic_TV 25, Panasonic_TV 2, Panasonic_TV 1, Panasonic_TV 32',
    // Menu, Exit, Guide, Info; the two arrows send nothing.
    'Panasonic_TV 28, Panasonic_TV 4, Panasonic_TV 40, Panasonic_TV 47',
    // Red, Yellow, Blue, Red, Green, as heard.
    'Panasonic_TV 48, Panasonic_TV 27, Panasonic_TV 31, Panasonic_TV 48, Panasonic_TV 23',
    // The transport keys, Replay and Skip; List and Live send nothing.
    'Panasonic_TV 19, Panasonic_TV 30, Panasonic_TV 14, Panasonic_TV 34, Panasonic_TV 41, Panasonic_TV 36, '
      + 'Panasonic_TV 45, Panasonic_TV 18',
    // The digits; Clear and Enter send nothing.
    'Panasonic_TV 22, Panasonic_TV 38, Panasonic_TV 44, Panasonic_TV 15, Panasonic_TV 43, Panasonic_TV 39, '
      + 'Panasonic_TV 7, Panasonic_TV 24, Panasonic_TV 6, Panasonic_TV 33',
    // TV Input and the four favourites, none bound in the television's map.
    '',
    '',
    // Power alone: the KPN box's map binds no volume.
    'KPN 29',
    'KPN 35, KPN 34, KPN 19',
    'KPN 24, KPN 27, KPN 7, KPN 15, KPN 33',
    // Menu, Guide, Info; Exit and the arrows send nothing.
    'KPN 3, KPN 16, KPN 11',
    // Yellow, blue, red, green.
    'KPN 38, KPN 1, KPN 10, KPN 18',
    // Replay, Skip and Live send nothing; List is KPN 41.
    'KPN 37, KPN 31, KPN 20, KPN 13, KPN 12, KPN 28, KPN 41',
    'KPN 43, KPN 8, KPN 30, KPN 42, KPN 6, KPN 26, KPN 5, KPN 4, KPN 0, KPN 39',
    // Printed 1, 2, 3 and 4: channels 1, 3, 2 and 666, digit by digit.
    'KPN 36, KPN 25, KPN 40, KPN 17, KPN 17, KPN 17',
    '',
  ]);
  // Counted: the presses compared code by code, over both runs.
  const compared = RUNS.map((name) => walk(container(FILE[name]!), STEPS[name]!)
    .reduce((n, sends, s) => n + (name === RUN_21 && s === FAVOURITE_STEP_21 ? 0 : sends.length), 0));
  assert.deepEqual(compared, [53, 79]);
});

test('judged again against the tests\' own expectations, the runs give the verdicts their monitors stored, word for word',
  needing(skipWithoutLab(), skipWithoutIrArchive(), skipUnless(...RUNS, NAMED_BY)), () => {
    // The control on the method: matching again from the pulses changes nothing the monitor decided.
    for (const name of RUNS) {
      assert.deepEqual(rematched(name, true).map((step) => judge(step)), runFile(name).steps.map((step) => step.verdicts), name);
    }
  });

test('the colour keys run red, green, yellow, blue: left to right they raised 13, 27, 28 and 29', NEEDS_RUNS, () => {
  const fits = fitting(RUN_21);
  assert.deepEqual(['Red', 'Green', 'Yellow', 'Blue'].map((key) => fits[key]), [[13], [27], [28], [29]]);
  // Pressed by colour in the KPN box's mode, yellow, blue, red, green: the same four codes in that order.
  assert.deepEqual(walk(container(FILE[RUN_22]!), STEPS_22)[14]!.map((one) => one.code), [38, 1, 10, 18]);
  const kpn = fitting(RUN_22);
  assert.deepEqual(['Yellow', 'Blue', 'Red', 'Green'].map((key) => kpn[key]), [[28], [29], [13], [27]]);
});

/** Every number loaded for the number sender, `0x7A` then `0x1F` band `0xF3`, by the press that does it. */
function favourites(c: Container): Record<string, number> {
  const out: Record<string, number> = {};
  const maps = c.pointerArray(6)!;
  for (const [entry, address] of maps.entries()) {
    for (const one of taggedList(c, address)!.entries) {
      if ((one.tag & 0xC0) !== PRESS || one.opcode !== 0x7F) continue;
      const at = c.blobOffsetOf(c.pointerArray(7)![one.operand]!)!;
      const body = Array.from({ length: bytes.u8(c.blob, at) }, (_, k) => ({
        operand: bytes.u16(c.blob, at + 1 + 3 * k), opcode: bytes.u8(c.blob, at + 3 + 3 * k),
      }));
      const load = body.findIndex((x) => x.opcode === 0x7A);
      if (load >= 0 && body[load + 1]?.opcode === 0x1F && body[load + 1]!.operand >> 8 === 0xF3) {
        out[`map ${entry} code ${one.tag & 0x3F}`] = body[load]!.operand;
      }
    }
  }
  return out;
}

test('the favourites printed 1 to 4 sent channels 1, 3, 2 and 666: codes 8, 9, 2 and 34, the file binding 1, 2, 3 and 666 to 8, 2, 9 and 34',
  NEEDS_RUNS, () => {
    const c = container(FILE[RUN_22]!);
    // The KPN box's map, entry 1, loads the four channels, and no other map loads any.
    assert.deepEqual(favourites(c), { 'map 1 code 8': 1, 'map 1 code 2': 2, 'map 1 code 9': 3, 'map 1 code 34': 666 });
    // The number sender sends a channel's decimal digits through the KPN box's own digit codes; the model
    // refuses any other shape, `filemodel.ts`.
    assert.equal(numberSenders(c)!.records.length, 1);
    // What the four presses after TV Input were heard as: one 1, one 3, one 2, three 6s.
    const step = sent(rematched(RUN_22)[17]!);
    assert.equal(step.length, 6);
    const digit = (n: number): string => `1/${walk(c, [presses('CableSat'), presses(DIGITS[(n + 9) % 10]!)])[1]![0]!.code}`;
    assert.deepEqual(step.map((press) => [1, 3, 2, 6, 6, 6].find((n) => heardCodes(press).has(digit(n)))), [1, 3, 2, 6, 6, 6]);
    // In the KPN box's mode alone a favourite's press fits its own code and the digit key's that sends the
    // same digit too, but 666, which no digit key sends three times.
    const kpnOnly = (key: string, at: number): number[] => {
      const out: number[] = [];
      for (let scan = 1; scan <= 56; scan += 1) if (agrees(RUN_22, walk(c, STEPS_22, { step: 17, at, scan }), 17)) out.push(scan);
      return out;
    };
    assert.deepEqual(['Favorite1', 'Favorite2', 'Favorite3', 'Favorite4'].map((key, at) => kpnOnly(key, at + 1)),
      [[8, 24], [9, 39], [2, 47], [34]]);
    // The television's mode binds no favourite and the digit keys there, and the same keys pressed in it sent
    // nothing, so over the run each favourite fits its own code alone.
    const fits = fitting(RUN_22);
    assert.deepEqual(['Favorite1', 'Favorite2', 'Favorite3', 'Favorite4'].map((key) => fits[key]), [[8], [9], [2], [34]]);
    // Code 11, the 350's favourite 3, sends the KPN box's code 22 in this file: the Teletext key's binding.
    assert.deepEqual(walk(c, [presses('CableSat'), presses('Teletext')])[1], [{ group: 1, code: 22 }]);
  });

test('Teletext is code 11: once in the first run\'s favourite step, among six presses sending Info', NEEDS_RUNS, () => {
  const heard = sent(rematched(RUN_21)[FAVOURITE_STEP_21]!);
  const info = [...heardCodes(heard[0]!)];
  assert.deepEqual(heard.map((press) => (heardCodes(press).has(info[0]!) ? 'Info' : [...heardCodes(press)].join())),
    ['Info', 'Info', 'Info', 'Info', '0/16', 'Info', 'Info']);
  assert.deepEqual(teletextFits(), [11]);
  // On that file every other key of the block, TV Input and the four favourites, sends Info.
  const c = container(FILE[RUN_21]!);
  for (const key of ['Input', 'Favorite1', 'Favorite2', 'Favorite3', 'Favorite4']) {
    assert.deepEqual(walk(c, [presses('Tv'), presses(key)])[1], [{ group: 0, code: 47 }], key);
  }
  // The second run pressed it in neither mode: its television's favourite step heard nothing.
  assert.deepEqual(rematched(RUN_22)[8]!.presses, []);
});

/** What the runs tie, by the European drawing's names: every key but six, each on its place's 350 code. */
const DECIDED: Readonly<Record<string, number>> = Object.fromEntries(Object.entries(SCAN)
  .filter(([key]) => !['Clear', 'Enter', 'Input', 'Live', 'UpArrow', 'DownArrow'].includes(key)));

test('49 keys are tied to one code, each the code of the Harmony 350 key in the same place, and six sent nothing',
  needing(skipWithoutLab(), skipUnless(...RUNS, NAMED_BY)), () => {
    const { codes, open } = decided();
    assert.deepEqual(codes, DECIDED);
    assert.equal(Object.keys(codes).length, 49);
    // The six, and how many codes each fits: the codes neither file binds in the modes they were pressed in.
    assert.deepEqual(open, { UpArrow: 7, DownArrow: 7, Live: 7, Clear: 7, Enter: 7, Input: 7 });
  });

test('the European drawing carries exactly the codes the runs tie, and the US drawing none', () => {
  const svg = (id: string): string => readFileSync(fileURLToPath(new URL(`../../../reference/silhouettes/${id}.svg`, import.meta.url)), 'utf8');
  const drawn = (id: string) => Object.fromEntries([...svg(id).matchAll(/data-name="(\w+)"[^>]*? data-scan="(\d+)"/g)]
    .map((m) => [m[1]!, Number(m[2])]));
  assert.deepEqual(drawn('h300eu'), DECIDED);
  assert.deepEqual(drawn('h300'), {});
});
