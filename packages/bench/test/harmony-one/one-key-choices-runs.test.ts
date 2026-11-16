/**
 * Four keys chosen in a document, on a Harmony One, as they ran: a document with four key choices was synced to
 * the spare Harmony One through `syncDocument`, and the keys were pressed in front of the infrared receiver.
 *
 * **What was run.** The document is the bench test setup, seven devices and five activities, opened through the
 * recipe toolkit and given four choices with `recipe.setKey`, each a key addressed by its scan code, as the toolkit took
 * one then:
 *
 * 1. in the activity TV kijken, Info (scan 10) sends the Denon's Info, where the setup gives it the KPN box's;
 * 2. in the activity TV kijken, Mute (scan 9) does nothing, where the setup gives it the Denon's Mute;
 * 3. in the LG TV's own map, device mode's, Volume Up (scan 3) sends the Denon's VolumeUp, another device's command;
 * 4. in the Denon's own map, Mute (scan 9) does nothing.
 *
 * The remote held a build of the same setup with no key chosen, read into the lab as the compare base. The sync
 * wrote the three 64 KiB blocks that differed, read the whole configuration back and restarted the remote; the
 * region was read again afterwards. Then the bench test `irtests/done/one-key-choices.json` was run on the monitor,
 * nine steps: the activity started, the two chosen activity keys and one key nobody chose, the LG TV's device mode
 * with its chosen key and the key beside it, the Denon's device mode with its chosen key and one nobody chose, Off.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **The remote held the document's build, and the two region reads differ in 22 bytes, as key maps in exactly
 *    the four keys.** The document built again at the moment the sync's journal states is the region read after
 *    the sync, byte for byte over its 905173 bytes, and built one second later it is not, by 4 bytes. Over every
 *    binding the two readers give that ends in a code, by map, event and scan: 256 on screen pages, the same before
 *    and after; 168 in the activities' maps before and 167 after; 193 in the devices' own maps before and 192 after.
 *    So 617 before, 615 after, 613 the same, two changed and two gone, and those four are the document's four. Of
 *    the 361 on the keypad, 357 are the same, the figure the bench test's own description gives. A key chosen to
 *    do nothing is in neither reader's answer, since both report only what ends in a code.
 * 2. **Every key press sent the one code the written configuration binds to that key.** Each press is matched
 *    here again from its pulses against a code book of the written region alone, so the bench's own names take no
 *    part: Info in the activity was the Denon's code 34, which is also what the Denon's own map holds on its Info
 *    key; Volume Up in the activity, in the LG TV's own map and in the Denon's own map was the Denon's code 117 each
 *    time; Volume Down in the LG TV's own map was the LG TV's code 60. One press per step and no other.
 * 3. **The two keys chosen to do nothing sent nothing, and the monitor's own log agrees.** The run holds no press in
 *    either step, and the log the monitor writes of every frame it hears, a second file written by another path,
 *    holds no line at all inside those two steps, 18497 ms and 23344 ms long, while it holds frames in the step
 *    before and the step after each. Up to the run's end the log holds 50 frames before the run and 40 inside it,
 *    15, 3, 0, 3, 3, 3, 0, 3 and 10 by step. The 50 before are not the run's: a first run, stopped after its first
 *    step and started again, is among them. What the log holds after the run is not read: the monitor went on
 *    listening, so the file grew after the run was filed.
 * 4. **The start and Off.** The start was five presses. The first four are the first four sends of the list the
 *    configuration's start gives, in its order: the LG TV, the KPN box and the Denon switched on, and the Denon's
 *    input. That list holds four sends more, one for each of the four devices the activity does not use, and none
 *    of them was heard; the reader follows every branch of a start and does not know which devices were on, and
 *    nothing here says more than that. The fifth press, the LG TV's input, is no send of that list; it came 10441
 *    ms after the LG TV's power code, where the list states 100 tenths of a second beside that code. Whether that
 *    is the cause, and what the 441 ms over are, is not shown. Off was three: the LG TV, the Denon, the KPN box.
 *
 * **The control** judges the same run by the configuration the remote held before. It fails at exactly the four
 * chosen keys and holds on the three nobody chose: that configuration binds Info in the activity to the KPN box's
 * code 24 and the Denon's 34 was heard; it binds Mute, in the activity and in the Denon's own map, to the Denon's
 * code 75 and nothing was heard; it binds the LG TV's own Volume Up to the LG TV's code 61 and the Denon's 117 was
 * heard.
 *
 * **Two verdicts of the bench say "heard 0 of 1", both in the start, and neither is the remote's.** The test's
 * definition expected the Denon's PowerOn by name and the LG TV's input before the Denon's. The Denon's power code
 * carries no command name under the device name Denon in the bench's book, so the name matched nothing; and the
 * remote sent the Denon's input fourth, where its start lists it, and the LG TV's fifth, so the bench, which takes
 * its expectations in order, had no press left for the Denon's input once the LG TV's had been found. Judged again with
 * the same function, the power code by its number and the two inputs in the order heard, all five hold. The fault
 * was in the definition, which was written before the start order was read.
 *
 * **Reported by the person at the bench and held by no file**: the Mute key sent no infrared code.
 *
 * **So a key choice in a document reaches the remote**: in one activity's map and in two devices' own, a key
 * sent another command of a device of the activity, a command of another device, or nothing, as chosen; one key
 * nobody chose was heard in each of the three maps sending what it did, and no other binding that ends in a code
 * differs in the file. What this does not show: any press but a short one, a held one being refused by the
 * builder; a key given a sequence, or an activity's key sending to a device outside the activity; a key around
 * the screen; a second activity; what a key chosen to do nothing does on the screen; and why four sends of the
 * start's list were not heard.
 *
 * **What would have falsified it**: a code heard in either of the two silent steps; a press naming any code but the
 * one bound; a fifth key differing between the two reads; the run holding whole against the configuration before.
 *
 * **Sources checked first**: `reference/how-a-harmony-works.md` and `reference/remotes/harmony-one/keys.md` for the
 * two maps and the scan codes, and the build's own tests, `packages/config/test/families/harmony-one/
 * onerecipekeys.test.ts` and `packages/config/test/recipe/toolkitpath.test.ts`, which hold what the builder writes for
 * a choice. Logitech's client was not consulted: the question is what a configuration of ours does on a remote.
 * **Which architectures**: the Harmony One on firmware 3.4, one unit, one run. Every other family's builder
 * refuses a recipe that states a key, which `onerecipekeys.test.ts` holds, so nothing here is about them.
 *
 * **The document on file names its keys by number, as documents did when it was synced.** A recipe names a key by
 * Logitech's word for it since, `VolumeUp` where it said 3, and the file is the record of what was synced, so it is not
 * rewritten: this file reads it as written, asserts its four choices by scan as raw JSON, and turns each scan into the
 * Harmony One family's word for it, through the family's own table, before it is read as a recipe and rebuilt. The
 * rebuild equalling the remote's bytes is then also the evidence that a key named by word builds what the same key
 * named by scan built.
 *
 * The reads are a remote's configuration: this file asserts equalities, counts and shapes and prints none of it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The Node entry, for what the core asks its loader for.
import '@freeharmony-sdk/config/node';
import {
  activities, buildFromRecipe, chooseByModel, deviceModeMaps, devices, keyCodes, parse, readRecipe, type Container, type Recipe,
} from '@freeharmony-sdk/config';
import { activityStartSteps } from '@freeharmony-sdk/config/internal';
import * as lab from '@freeharmony-sdk/lab';

import { CodeBook, type HeardFrame } from '../../src/irmonitor.ts';
import { judge, type Expectation, type Run, type RunPress } from '../../src/irsession.ts';

const DOCUMENT = 'one_key_choices_document';
const BASE = 'one_spare_sync_base';
const WRITTEN = 'one_spare_sync_written';
const RUN = 'one_key_choices_run';
const MONITOR = 'one_key_choices_monitor';

/** The Harmony One's keys used here, by the scan codes its key table and its drawing give them. */
const VOLUME_UP = 3;
const VOLUME_DOWN = 4;
const MUTE = 9;
const INFO = 10;
/** A key code's event type for a press. */
const PRESS = 2;

const text = (name: string): string => new TextDecoder().decode(lab.require_(name));
const run = (): Run => JSON.parse(text(RUN)) as Run;

type Json = Record<string, any>;
/** The document as the lab holds it, keys by scan, unread. */
const documentOnFile = (): Json => JSON.parse(text(DOCUMENT)) as Json;
/**
 * The document on file with each key's scan turned into the word the model's family gives that scan, and read as a
 * recipe. The family's own table answers, `recipeKeys`, which offers words and the scan of each, so the word is the
 * one whose scan is the number on file; a scan the family has no word for stops the test rather than being guessed.
 */
const documentByWord = (): Recipe => {
  const json = structuredClone(documentOnFile());
  const { family } = chooseByModel(json.model);
  assert.ok(family.kind === 'compiled' && family.recipeKeys !== undefined, 'the model\'s family builds key choices');
  const builder = family.recipeKeys;
  const wordOf = (scan: number): string => {
    const words = builder.keys.filter((key) => builder.scanOf(key) === scan);
    assert.equal(words.length, 1, `one word for scan ${scan}`);
    return words[0]!;
  };
  for (const owner of [...json.devices, ...json.activities] as Json[]) {
    if (owner.keys !== undefined) owner.keys = (owner.keys as Json[]).map(({ scan, ...rest }) => ({ key: wordOf(scan as number), ...rest }));
  }
  return readRecipe(json);
};

/** A code as `group.code`, the infrared group being the device's place in the configuration. */
type Code = string;

const groupOf = (c: Container, name: string): number => {
  const group = devices(c).find((device) => device.name === name)?.group;
  assert.ok(group !== undefined, name);
  return group;
};
const setOf = (c: Container, name: string): number => {
  const set = activities(c).find((activity) => activity.name === name)?.set;
  assert.ok(set !== undefined, name);
  return set;
};
/** What the press of a key sends in an activity's map. */
const inActivity = (c: Container, set: number, scan: number): Code[] => keyCodes(c)
  .filter((one) => one.where === 'set' && one.index === set && one.event === PRESS && one.scan === scan)
  .flatMap((one) => one.codes.map((code) => `${code.group}.${code.code}`));
/** What the press of a key sends in a device's own map. */
const inMode = (c: Container, group: number, scan: number): Code[] => (deviceModeMaps(c).find((one) => one.group === group)?.keypad ?? [])
  .filter((one) => one.event === PRESS && one.scan === scan).flatMap((one) => one.codes.map((code) => `${code.group}.${code.code}`));

/**
 * Every binding the two readers give, by map, event and scan: `page` and `set` are the first reader's, a screen
 * page and an activity's map, and `device` a device's own map, the second's.
 */
const bindings = (c: Container): Map<string, string> => {
  const out = new Map<string, string>();
  for (const one of keyCodes(c)) out.set(`${one.where}/${one.index}/${one.event}/${one.scan}`, one.codes.map((code) => `${code.group}.${code.code}`).join(','));
  for (const map of deviceModeMaps(c)) {
    for (const one of map.keypad) out.set(`device/${map.group}/${one.event}/${one.scan}`, one.codes.map((code) => `${code.group}.${code.code}`).join(','));
  }
  return out;
};
/** How many bindings each kind of map holds, screen pages, activities' maps and devices' own, in that order. */
const perKind = (all: Map<string, string>): number[] => ['page', 'set', 'device'].map((kind) => [...all.keys()].filter((key) => key.startsWith(`${kind}/`)).length);

/**
 * What each key step's key sends by a configuration, in the run's order: steps 1 to 7. The keys of steps 1, 2, 4
 * and 6 are the four the document chose.
 */
const keySteps = (c: Container): Code[][] => {
  const watch = setOf(c, 'TV kijken');
  const television = groupOf(c, 'LG_TV');
  const receiver = groupOf(c, 'Denon');
  return [
    inActivity(c, watch, INFO), inActivity(c, watch, MUTE), inActivity(c, watch, VOLUME_UP),
    inMode(c, television, VOLUME_UP), inMode(c, television, VOLUME_DOWN),
    inMode(c, receiver, MUTE), inMode(c, receiver, VOLUME_UP),
  ];
};
const CHOSEN = [0, 1, 3, 5];

/** A book of the written region alone, so a press is named by the configuration the remote held and nothing else. */
const book = (): CodeBook => new CodeBook((name) => lab.load(name), [WRITTEN]);
/** The codes of the written configuration a press's opening frame is, several where the receiver cannot tell them apart. */
const heard = (codes: CodeBook, press: RunPress): Code[] =>
  [...new Set(codes.match(press.frame.pulses).filter((one) => one.opening).map((one) => `${one.group}.${one.code}`))].sort();

test('the document states four key choices by scan, two that send a command of the Denon and two that do nothing, and by word they are VolumeUp, VolumeMute, Info and VolumeMute', lab.skipUnless(DOCUMENT), () => {
  // As written: the keys by their scan codes, which is no longer a recipe's field, so the JSON is read as it stands.
  const raw = documentOnFile();
  assert.deepEqual([raw.model.name, raw.devices.length, raw.activities.length], ['Harmony One', 7, 5]);
  const onFile = [
    ...(raw.devices as Json[]).flatMap((one) => ((one.keys ?? []) as Json[]).map((key) => ({ device: one.name, ...key }))),
    ...(raw.activities as Json[]).flatMap((one) => ((one.keys ?? []) as Json[]).map((key) => ({ activity: one.name, ...key }))),
  ];
  assert.deepEqual(onFile, [
    { device: 'LG TV', scan: VOLUME_UP, action: { device: 'Denon', command: 'VolumeUp' } },
    { device: 'Denon', scan: MUTE, action: { nothing: true } },
    { activity: 'TV kijken', scan: INFO, action: { device: 'Denon', command: 'Info' } },
    { activity: 'TV kijken', scan: MUTE, action: { nothing: true } },
  ]);
  // As a recipe reads it once each scan is the family's word, and nothing else of the document changed.
  const document = documentByWord();
  const chosen = [
    ...document.devices.flatMap((one) => (one.keys ?? []).map((key) => ({ device: one.name, ...key }))),
    ...document.activities.flatMap((one) => (one.keys ?? []).map((key) => ({ activity: one.name, ...key }))),
  ];
  assert.deepEqual(chosen, [
    { device: 'LG TV', key: 'VolumeUp', action: { device: 'Denon', command: 'VolumeUp' } },
    { device: 'Denon', key: 'VolumeMute', action: { nothing: true } },
    { activity: 'TV kijken', key: 'Info', action: { device: 'Denon', command: 'Info' } },
    { activity: 'TV kijken', key: 'VolumeMute', action: { nothing: true } },
  ]);
  // The control: the file as written is no recipe now, refused at its first key's scan rather than read as some key.
  assert.throws(() => readRecipe(documentOnFile()), /key 1 has a field scan no recipe has/);
});

/** The moment the sync built the document at, as its journal in the lab states it beside the size of the build. */
const BUILT_AT = '2026-11-14T16:09:25';

test('the document built at the moment the sync\'s journal states is what the remote held after it, byte for byte, and built a second later it is not',
  lab.needing(lab.skipUnless(DOCUMENT, WRITTEN), lab.slow()), () => {
    // The document by word: its keys' scans on file turned into the family's words, as the test above holds.
    const document = documentByWord();
    const after = lab.require_(WRITTEN);
    const differing = (builtAt: string): number => {
      const built = buildFromRecipe(document, { builtAt });
      assert.equal(built.kind, 'configuration');
      const bytes = (built as { bytes: Uint8Array }).bytes;
      assert.equal(bytes.length, 905173);
      let count = 0;
      for (let i = 0; i < bytes.length; i += 1) if (bytes[i] !== after[i]) count += 1;
      return count;
    };
    assert.equal(differing(BUILT_AT), 0);
    // The control: the stamp is in the bytes, so the same document built one second later is another file.
    assert.equal(differing('2026-11-14T16:09:26'), 4);
  });

test('what the remote held before and after the sync differs in 22 bytes, and as key maps in exactly the four chosen keys', lab.skipUnless(BASE, WRITTEN), () => {
  const before = lab.require_(BASE);
  const after = lab.require_(WRITTEN);
  assert.equal(before.length, after.length);
  let differing = 0;
  for (let i = 0; i < before.length; i += 1) if (before[i] !== after[i]) differing += 1;
  assert.equal(differing, 22);

  const a = bindings(parse(before));
  const b = bindings(parse(after));
  assert.deepEqual([a.size, b.size], [617, 615]);
  // No key of one reader is a key of the other's, so nothing is counted twice or lost.
  assert.deepEqual([perKind(a), perKind(b)], [[256, 168, 193], [256, 167, 192]]);
  const changed = [...new Set([...a.keys(), ...b.keys()])].filter((key) => a.get(key) !== b.get(key)).sort();
  assert.equal(a.size - changed.length, 613);
  // On the keypad alone, the activities' maps and the devices' own, 357 of 361.
  assert.equal(168 + 193 - changed.length, 357);
  // The LG TV is group 0, the Denon group 2 and the KPN box group 3; TV kijken is handler set 8.
  assert.deepEqual(changed.map((key) => [key, a.get(key), b.get(key)]), [
    [`device/0/${PRESS}/${VOLUME_UP}`, '0.61', '2.117'],
    [`device/2/${PRESS}/${MUTE}`, '2.75', undefined],
    [`set/8/${PRESS}/${INFO}`, '3.24', '2.34'],
    [`set/8/${PRESS}/${MUTE}`, '2.75', undefined],
  ]);

  // The same as the seven keys the run pressed: the written configuration against the one before.
  const written = parse(after);
  assert.deepEqual(keySteps(written), [['2.34'], [], ['2.117'], ['2.117'], ['0.60'], [], ['2.117']]);
  assert.deepEqual(keySteps(parse(before)), [['3.24'], ['2.75'], ['2.117'], ['0.61'], ['0.60'], ['2.75'], ['2.117']]);
  // And the code the activity's Info key now sends is the one the Denon's own map holds on its Info key.
  assert.deepEqual(inMode(written, groupOf(written, 'Denon'), INFO), ['2.34']);
});

test('every key press of the run sent the one code the written configuration binds to that key, and the two keys chosen to do nothing sent nothing', lab.skipUnless(WRITTEN, RUN), () => {
  const one = run();
  assert.deepEqual([one.kind, one.steps.length, one.steps.every((step) => step.reached)], ['test', 9, true]);
  const codes = book();
  const bound = keySteps(parse(lab.require_(WRITTEN)));
  const pressed = one.steps.slice(1, 8).map((step) => step.presses.map((press) => heard(codes, press)));
  // One press per step where a code is bound, none where the key was chosen to do nothing, and each press one code.
  assert.deepEqual(pressed, bound.map((code) => (code.length === 0 ? [] : [code])));
  assert.deepEqual(pressed.map((presses) => presses.length), [1, 0, 1, 1, 1, 0, 1]);
});

test('judged by the configuration the remote held before, the run fails at exactly the four chosen keys', lab.skipUnless(BASE, WRITTEN, RUN), () => {
  const codes = book();
  const before = keySteps(parse(lab.require_(BASE)));
  const pressed = run().steps.slice(1, 8).map((step) => step.presses.map((press) => heard(codes, press)));
  const failing = before.flatMap((code, i) => (JSON.stringify(pressed[i]) === JSON.stringify(code.length === 0 ? [] : [code]) ? [] : [i]));
  assert.deepEqual(failing, CHOSEN);
});

test('the monitor\'s own log holds no line inside the two steps of a key chosen to do nothing, and frames in the steps around them', lab.skipUnless(RUN, MONITOR), () => {
  const one = run();
  const lines = text(MONITOR).split('\n').filter((line) => line !== '').map((line) => JSON.parse(line) as { type?: string; at: string; text?: string });
  const started = Date.parse(one.startedAt);
  const ended = started + (one.steps[8]!.endedMs as number);
  // Only the lines up to the run's end: the monitor went on listening after it, so the file's tail is not the run's.
  const upTo = lines.filter((line) => Date.parse(line.at) < ended);
  const frames = upTo.filter((line) => line.type === undefined);
  assert.deepEqual([upTo.length, frames.length], [91, 90]);
  // The one line that is not a frame is the receiver's firmware, which reports the long Denon codes from 4.10.7 on.
  assert.deepEqual(upTo.filter((line) => line.type !== undefined).map((line) => /found version: (\S+)/.exec(line.text ?? '')?.[1]), ['4.10.7']);

  const within = (from: number, to: number): number => lines.filter((line) => Date.parse(line.at) >= started + from && Date.parse(line.at) < started + to).length;
  assert.deepEqual(one.steps.map((step) => within(step.startedMs, step.endedMs as number)), [15, 3, 0, 3, 3, 3, 0, 3, 10]);
  assert.deepEqual(one.steps.map((step) => (step.endedMs as number) - step.startedMs).filter((_, i) => i === 2 || i === 6), [18497, 23344]);
  assert.equal(frames.filter((line) => Date.parse(line.at) < started).length, 50);
});

test('the start sent the first four codes the configuration\'s start states, in its order, and the LG TV\'s input 10441 ms after its power; Off sent three', lab.skipUnless(WRITTEN, RUN), () => {
  const one = run();
  const codes = book();
  const written = parse(lab.require_(WRITTEN));
  const start = one.steps[0]!.presses;
  const off = one.steps[8]!.presses;
  const group = (press: RunPress): number[] => [...new Set(heard(codes, press).map((code) => Number(code.split('.')[0])))];
  // By device: the LG TV, the KPN box, the Denon twice, the LG TV; and for Off the LG TV, the Denon, the KPN box.
  assert.deepEqual(start.map(group), [[0], [3], [2], [2], [0]]);
  assert.deepEqual(off.map(group), [[0], [2], [3]]);

  const stated = activityStartSteps(written, setOf(written, 'TV kijken'));
  const sends = stated.filter((step) => step.kind === 'send').map((step) => `${step.group}.${step.value}`);
  assert.deepEqual(sends.slice(0, 4), ['0.63', '3.38', '2.118', '2.40']);
  // A power code is stored under more than one number and the receiver hears one rhythm, so each of the first three
  // presses names the stated code among two or three; the Denon's input is one code.
  assert.deepEqual(start.slice(0, 4).map((press) => heard(codes, press)), [['0.45', '0.63'], ['3.29', '3.38'], ['2.118', '2.84', '2.86'], ['2.40']]);
  start.slice(0, 4).forEach((press, i) => assert.ok(heard(codes, press).includes(sends[i]!), `send ${i + 1}`));
  // The list holds four sends more, one for each device the activity does not use, and none was heard.
  assert.deepEqual(sends.slice(4), ['1.64', '4.59', '5.11', '6.56']);
  // The LG TV's input is no send of that list. It was heard 10441 ms after the LG TV's power code, beside which the
  // list states 100 tenths of a second; the files show the two numbers and not that one causes the other.
  assert.deepEqual(heard(codes, start[4]!), ['0.32']);
  assert.ok(!sends.includes('0.32'));
  assert.deepEqual(stated.slice(1, 3), [{ kind: 'delay', group: 0, value: 1 }, { kind: 'delay', group: 0, value: 100 }]);
  assert.equal(start[4]!.atMs - start[0]!.atMs, 10441);
  // Off, by code: each a power code stored under two or three numbers.
  assert.deepEqual(off.map((press) => heard(codes, press)), [['0.44', '0.64'], ['2.119', '2.81', '2.83'], ['3.29', '3.38']]);
});

test('the bench\'s two "heard 0 of 1" verdicts are the definition\'s: a power code with no name under Denon, and two inputs expected in the other order', lab.skipUnless(RUN), () => {
  const one = run();
  const verdicts = one.steps.map((step) => step.verdicts.map((verdict) => verdict.ok));
  assert.deepEqual(verdicts, [[true, true, false, true, false], [true], [], [true], [true], [true], [], [true], []]);
  const start = one.steps[0]!;
  assert.deepEqual(start.expect.map((want) => want.command), ['PowerOn', 'PowerToggle', 'PowerOn', 'InputHdmi1', 'InputCbl/Sat']);

  // The names the run itself kept for each press, as the bench judged by them.
  const named = (frame: HeardFrame, device: string): (string | undefined)[] =>
    [...new Set(frame.matches.filter((match) => match.device.toLowerCase() === device).map((match) => match.command))];
  // The Denon's power code is named for no configuration that calls the device Denon.
  assert.deepEqual(named(start.presses[2]!.frame, 'denon'), [undefined]);
  // The Denon's input was the fourth press and the LG TV's the fifth, where the definition lists them fifth and fourth.
  assert.deepEqual(named(start.presses[3]!.frame, 'denon'), ['InputCbl/Sat']);
  assert.ok(named(start.presses[4]!.frame, 'tv').includes('InputHdmi1'));

  // Judged again by the bench's own function: the power code by its number, the two inputs in the order heard.
  const power = start.presses[2]!.frame.matches.find((match) => match.device === 'Denon' && match.opening);
  assert.ok(power !== undefined);
  const again: Expectation[] = [
    start.expect[0]!, start.expect[1]!, { device: 'Denon', config: power.config, code: power.code }, start.expect[4]!, start.expect[3]!,
  ];
  assert.deepEqual(judge({ expect: again, presses: start.presses }).map((verdict) => verdict.ok), [true, true, true, true, true]);
  // And as the definition had them, the same function gives the run's own verdicts again.
  assert.deepEqual(judge({ expect: start.expect, presses: start.presses }).map((verdict) => verdict.ok), [true, true, false, true, false]);
});
