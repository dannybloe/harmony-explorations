/**
 * A device of ours on the Harmony Touch, `todo-touch.md` 8.1, as it ran: Test Projector added to the set the
 * bench Touch holds, delivered, heard in device mode and taken out again.
 *
 * **What was run.** After commit `5f296d09`, the 8.1 preparation, and in the order of the lab's
 * `work/touch-firmware/notes/8.1-preflight.md` section 6, each run read before the next:
 *
 * 1. `getconfighash` through the request rail, the remote holding `6.9-label-back`;
 * 2. `touch-sync.ts --set 8.1-device --commit`: the set of 6.9 with Test Projector, a device composed by this
 *    project from the rhythm table's Sony 12 Bit row with numbers of ours, `packages/corpus/touch-devices/
 *    test-projector.json`, appended to `DeviceList`, its map to `MapList` and its definition, under a protocol id of
 *    ours, to `ProtocolList`, the three retagged and the other three left as they were, `touch-device-set.ts`;
 * 3. `getconfighash` again;
 * 4. the bench test `irtests/done/touch-8-1-device-mode.json` on the Flirc monitor, then, with the monitor still on, the
 *    Power entry of Test Projector's screen tapped once;
 * 5. `touch-sync.ts --set 8.1-device-back --commit`, the device taken out, and `getconfighash`;
 * 6. one `touch-sync.ts --unchanged --commit`.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **The two sets.** The device set differs from `6.9-label-back` in exactly the three documents, content and
 *    tag, and the put back holds `6.9-label-back`'s six documents as parsed JSON, with the three under tags that are
 *    neither set's. That each is what the composer and `changeDocuments` give is held by
 *    `packages/corpus/test/touch-device-set.test.ts`; here they are the sets as delivered. **The identifiers of
 *    ours**, `OWN_IDS` in the codec's `compose.ts`, nine digits from 900000000: the device is 900000001 and its
 *    definition 900000002, where every device and activity id of Logitech's in the documents the remote held is
 *    eight digits and every protocol id the catalogue's, under a thousand.
 * 2. **Each run's first request list names what the remote held**: the device run was asked for the six with
 *    `6.9-label-back`'s tags, so its own tags differ there for exactly DeviceList, MapList and ProtocolList; the put
 *    back with all six of the device set's, so the device set had been committed; the closing run with the put back's.
 * 3. **Each set run answered DeviceList, MapList and ProtocolList 200 with the set's content and tag and the other
 *    three 304**, the three favourites 304, the ten pictures 304, the finish 200, and finished: one write of
 *    571252 characters, 19 chunks of 31000 and a last of 13252, for the device set and of 558278, the last chunk
 *    278 characters, for the put back, each replied 200 as a write. **Both handed out nine request lists where
 *    every earlier run of ours handed out eight**: an empty list between the user favourites and the device
 *    favourites, the rest in the order of 6.9. The preflight predicted eight. The files do not say why, and no
 *    cause is claimed; the answerer polls until the finish and took it as it came. The closing `--unchanged` run
 *    handed out eight, every answer 304 or the finish.
 * 4. **The configuration hash**, which joins the tags of ActivityList, DeviceList, ProtocolList and Context, was
 *    `6.9-label-back`'s before, the device set's after and the put back's after the put back: the remote's own report
 *    of its committed store, against the set files.
 * 5. **The device sent, at the receiver.** The bench run, judged afresh here from its pulses by the device set's
 *    own documents, held 15 of 15: Menu, Exit, the four arrows, OK, Volume Up and Down and Mute, each the command
 *    of its own name to Test Projector, and the Blu-ray's five navigation codes after it as the control; nothing
 *    else was heard in any step, and the two device choices sent nothing. Each code of ours was a 12 bit frame with
 *    a header mark of about 2450 us, about 20 ms long, frames about 45 ms apart start to start; the Blu-ray's a 20
 *    bit frame of about 33 ms. **How many frames a tap gave**: 4 for Menu, Exit and Up, 3 for Down, Left, Right and
 *    OK, 5 for each volume key and 3 for the Power entry, so at least the device's press repeats of 3 every time,
 *    where the preflight predicted three; the Blu-ray's taps gave 3 each. What made six taps longer the files do
 *    not say, and no cause is claimed. The model predicts which code goes to which device and not the frame count.
 * 6. **The Power entry**, tapped after the test with the monitor still on: three frames at 12:00:57 UTC in the
 *    monitor's log, named Test Projector PowerToggle by the device set and named by nothing in `6.9-label-back`.
 *    The model's screen entry, `TouchEngine.entry`, added in this landing as the preflight's section 5 proposed,
 *    predicts that command for that entry, and the Denon's PowerToggle for the Denon's entry of that name, the tap
 *    reported for 7.1; neither 7.1's tests nor 8.1's change by it, since no plan of theirs taps an entry, and the
 *    8.1 test file was run as written and is not rewritten.
 *
 * **Reported by the person at the bench and held by no file**: Test Projector was last in the Devices list with its
 * name and the default picture; its screen showed the eleven entries in the predicted order, Power, Up, Down, Left,
 * Right, OK, Menu, Back, Volume Up, Volume Down, Mute, with no icons; after the put back it was gone from the list
 * and the remote worked normally. That is the screens' drawing as the preflight read it: a device type with no
 * picture of its own falls back to the default one, and an entry with no `FunctionId-` finds no icon.
 *
 * **So a device composed by this project, under identifiers of ours, with a definition written from our own rhythm
 * table under a protocol id of ours, was stored, committed, listed and sent by a Touch, and taking it out under new
 * tags restored the set before.** Three documents delivered with 200 among three 304s replaced those three and kept
 * the others. What this does not show: a document composed whole, an activity of ours, a favourite or a picture of
 * ours, and the device used inside an activity.
 *
 * **The control** judges the same bench run by `6.9-label-back`'s documents, which hold no Test Projector: its ten
 * codes then go unnamed and fail, and only the Blu-ray's five hold. And the Power tap is named by the device set
 * alone.
 *
 * **What would have falsified it**: a first list asking with any tags but the set before's; a 200 for a document the
 * set leaves alone, or a 304 for one it changes; a hash not moving to each set's; a code of ours unheard, heard as
 * another command, or heard where the step expected none.
 *
 * **Sources checked first**: the lab's `8.1-preflight.md` and `8.1-land-brief.md`, `touch-full-bench-runs.test.ts` and
 * `packages/usb/test/touch-changed-set-sync.test.ts`, whose shapes this follows, `harmony-touch/engine.ts`, and the engine's
 * `buttonPress` in the decompiled engine for the screen entry, as the preflight read it. Logitech's client was not
 * consulted: the remote runs its own engine and the answers are ours. **Which architectures**: the Harmony Touch
 * on firmware 4.15.330, one unit, one run of each set; its firmware reports 17 and Logitech's templates file it
 * under 18.
 *
 * The reads and the sets hold tags and the account's numbers: this file asserts equalities, counts and shapes and
 * prints none of them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

import { harmonyTouch } from '@harmony/codec/node';
import * as lab from '@harmony/lab';
import {
  CONFIGHASH, FINISHED, OURS, WRITE, answersWritten, commands, hasTag, kind, list, records, reply, resource, sessions, written,
  type Request_,
} from '@harmony/usb/test/touch-recording';

import { CodeBook } from '../src/irmonitor.ts';
import { judge, testDefinitions, type Expectation, type RunPress, type TestDefinition, type Verdict } from '../src/irsession.ts';
import { BenchTouchEngine, TIMING, touch71Configuration, touch71Tests } from '../src/touchbench.ts';
import { TOUCH_8_1_CONTROL, TOUCH_8_1_DEVICE, touch81Tests } from '../experiments/touchdevicetest.ts';

const SOURCE = 'touch_changed_set_label_back';
const DEVICE_SET = 'touch_device_set';
const BACK = 'touch_device_set_back';
const FULL = 'touch_full_sync_recording';
const RUN = 'touch_8_1_run';
const MONITOR = 'touch_8_1_monitor';

/** One answer of a set as the lab keeps it, `set.json`. */
interface SetAnswer { uri: string; 'body-type': string; resource: unknown; etag: string }
const setOf = (fixture: string): SetAnswer[] => (JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as { answers: SetAnswer[] }).answers;

const THREE = ['DeviceList', 'MapList', 'ProtocolList'];

/** The four documents whose tags `getconfighash` joins, in its order, `touch-confighash.test.ts`. */
const HASHED = ['ActivityList', 'DeviceList', 'ProtocolList', 'Context'];
const hashOf = (set: SetAnswer[]): string => {
  const tags = new Map(set.map((a) => [resource(a.uri), a.etag]));
  return `result=${HASHED.map((d) => tags.get(d)!).join('')}`;
};

/** The two set runs, each with the set it delivered, the set the remote held before it and the write's size. */
const SET_RUNS = [
  { prefix: 'touch_device_sync_1_', set: DEVICE_SET, held: SOURCE, characters: 571252, last: 13252 },
  { prefix: 'touch_device_sync_2_', set: BACK, held: DEVICE_SET, characters: 558278, last: 278 },
] as const;
const CLOSING = 'touch_device_unchanged_';

/** The request lists a set run of 8.1 handed out: 6.9's eight with an empty one after the user favourites. */
const NINE = [
  Array(6).fill('document'), [], ['user favourites'], [], ['device favourites'], ['line up'], [], Array(10).fill('picture'), ['finished'],
];
const NINE_ANSWERED = [1, 3, 5, 6, 8, 9] as const;
/** The eight every earlier run handed out, `touch-changed-set-sync.test.ts`, and the closing run here. */
const EIGHT = [
  Array(6).fill('document'), [], ['user favourites'], ['device favourites'], ['line up'], [], Array(10).fill('picture'), ['finished'],
];
const EIGHT_ANSWERED = [1, 3, 4, 5, 7, 8] as const;

const runFiles = (prefix: string, lists: number, answered: readonly number[]): string[] => [
  `${prefix}outcome`, `${prefix}handover_list`, `${prefix}handover_answers`,
  ...Array.from({ length: lists }, (_, i) => `${prefix}list_${i + 1}`), ...answered.map((n) => `${prefix}answers_${n}`),
];

/**
 * Every answer of one write against its request: a document named in `delivered` 200 with the set's type, tag and
 * content, every other tagged request 304 echoing its tag, an untagged favourites request 304 with a tag of ours,
 * the finish 200. The same rule as 6.9's test, written again here since a test file cannot import another.
 */
function checkAnswers(asked: Request_[], ours: ReturnType<typeof written>, label: string, set: SetAnswer[], delivered: readonly string[]): void {
  const byUri = new Map(set.map((a) => [a.uri, a]));
  assert.deepEqual(ours.map((a) => a.uri), asked.map((r) => r.uri), `${label}: the same addresses in the same order`);
  for (const [i, a] of ours.entries()) {
    const r = asked[i]!;
    const k = kind(r.uri);
    if (k === 'finished') {
      assert.deepEqual([a.statusCode, 'etag' in a], ['200', false], label);
    } else if (k === 'document' && delivered.includes(resource(r.uri))) {
      const s = byUri.get(r.uri)!;
      assert.deepEqual([a.statusCode, a['body-type'], a.etag], ['200', s['body-type'], s.etag], `${label}: ${resource(r.uri)} answered 200 with the set's tag`);
      assert.ok(isDeepStrictEqual(a.resource, s.resource), `${label}: ${resource(r.uri)} is the set's document`);
    } else if (hasTag(r)) {
      assert.deepEqual([a.statusCode, a.etag, 'resource' in a], ['304', r.etag, false], `${label}: ${k} answered 304 echoing its tag`);
    } else {
      assert.deepEqual([k.endsWith('favourites') || k === 'line up', a.statusCode, 'resource' in a], [true, '304', false], `${label}: an untagged favourites request kept`);
      assert.match(a.etag ?? '', OURS, `${label}: a tag of ours`);
    }
  }
}

/** One whole run: the outcome, the hand over, the lists' shape and every answer, and the status counts. */
function checkRun(prefix: string, label: string, set: SetAnswer[], delivered: readonly string[], shape: unknown[][], answered: readonly number[]): void {
  const outcome = JSON.parse(new TextDecoder().decode(lab.require_(`${prefix}outcome`))) as { ending: string; acted: boolean; lists: number; answered: number; handedUp: unknown[] };
  assert.deepEqual([outcome.ending, outcome.acted, outcome.lists, outcome.answered, outcome.handedUp.length], ['finished', true, shape.length, 20, 0], `${label}: the answerer's outcome`);
  assert.deepEqual(list(`${prefix}handover_list`).map((r) => [r.verb, r.uri, 'etag' in r]), [['POST', FINISHED, false]], `${label}: the hand over`);
  assert.deepEqual(written(`${prefix}handover_answers`).map((a) => [a.statusCode, a.uri, 'etag' in a]), [['200', FINISHED, false]], `${label}: the hand over answered`);
  assert.deepEqual(shape.map((_, i) => list(`${prefix}list_${i + 1}`).map((r) => kind(r.uri))), shape, `${label}: the lists`);
  for (const n of answered) checkAnswers(list(`${prefix}list_${n}`), written(`${prefix}answers_${n}`), `${label}, list ${n}`, set, delivered);
  const all = answered.flatMap((n) => written(`${prefix}answers_${n}`));
  assert.deepEqual(['200', '304'].map((s) => all.filter((a) => a.statusCode === s).length), [1 + delivered.length, 19 - delivered.length], `${label}: the statuses`);
}

test('the device set is 6.9-label-back with the three documents changed and retagged, and the put back is its content again', lab.skipUnless(SOURCE, DEVICE_SET, BACK), () => {
  const source = setOf(SOURCE);
  const withDevice = setOf(DEVICE_SET);
  const back = setOf(BACK);
  for (const s of [withDevice, back]) assert.deepEqual(s.map((a) => a.uri), source.map((a) => a.uri));
  assert.deepEqual(withDevice.filter((a, i) => !isDeepStrictEqual(a.resource, source[i]!.resource)).map((a) => resource(a.uri)), THREE);
  assert.deepEqual(withDevice.filter((a, i) => a.etag !== source[i]!.etag).map((a) => resource(a.uri)), THREE);
  assert.deepEqual(back.map((a) => a.resource), source.map((a) => a.resource));
  assert.deepEqual(back.filter((a, i) => a.etag !== withDevice[i]!.etag).map((a) => resource(a.uri)), THREE);
  assert.deepEqual(back.filter((a, i) => a.etag !== source[i]!.etag).map((a) => resource(a.uri)), THREE);
  assert.ok([...withDevice, ...back].every((a) => OURS.test(a.etag)), 'every tag one of ours');
  // The device itself, read back from the set the remote was given.
  const read = harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(withDevice as harmonyTouch.SyncAnswer[]));
  const device = read.devices.find((d) => d.name === TOUCH_8_1_DEVICE)!;
  assert.deepEqual([device.id, device.commands.length, device.map?.reachable, device.map?.keys.length, device.map?.entries.size], ['900000001', 11, true, 10, 11]);
  assert.deepEqual([...new Set(device.commands.map((c) => c.protocol?.id))], ['900000002']);
  // The rule for identifiers of ours against Logitech's in the documents the remote held: their device and
  // activity ids eight digits, their protocol ids the catalogue's, under a thousand; ours nine digits from 900000000.
  const doc = (name: string) => source.find((a) => resource(a.uri) === name)!.resource as Record<string, Record<string, unknown>[]>;
  const digits = (ids: unknown[]) => [...new Set(ids.map((i) => String(i).length))];
  assert.deepEqual(digits(doc('DeviceList')['DevicesWithFeatures']!.map((d) => (d['Device'] as Record<string, unknown>)['Id-'])), [8]);
  assert.deepEqual(digits(doc('ActivityList')['Activities']!.map((a) => a['Id-'])), [8]);
  assert.ok(doc('ProtocolList')['Protocols']!.every((p) => Number(p['Id-']) < 1000));
  assert.ok([device.id, '900000002'].every((id) => harmonyTouch.isOwnId(id) && id.length === 9));
});

for (const r of SET_RUNS) {
  test(`${r.prefix}: the six asked for with the tags of the set the remote held, and the set's own differ for exactly the three`, lab.skipUnless(r.held, r.set, `${r.prefix}list_1`), () => {
    const held = setOf(r.held);
    const set = setOf(r.set);
    assert.deepEqual(list(`${r.prefix}list_1`).map((q) => [q.uri, q.etag]), held.map((a) => [a.uri, a.etag]));
    assert.deepEqual(list(`${r.prefix}list_1`).filter((q, i) => q.etag !== set[i]!.etag).map((q) => resource(q.uri)), THREE);
  });

  test(`${r.prefix}: the three answered 200 with the set's content and tags, the rest 304, the finish 200, over nine request lists`, lab.skipUnless(r.set, ...runFiles(r.prefix, 9, NINE_ANSWERED)), () => {
    checkRun(r.prefix, r.prefix, setOf(r.set), THREE, NINE, NINE_ANSWERED);
  });

  test(`${r.prefix}: the three went in one write of ${r.characters} characters, 19 chunks, replied 200 as a write`, lab.skipUnless(`${r.prefix}answers_1`, `${r.prefix}reply_1`), () => {
    const line = new TextDecoder().decode(lab.require_(`${r.prefix}answers_1`));
    // 31000 characters a chunk, as `touch-changed-set-sync.test.ts` derives it from the session's shapes.
    assert.deepEqual([line.length, Math.ceil(line.length / 31000), line.length % 31000], [r.characters, 19, r.last]);
    const q = reply(`${r.prefix}reply_1`);
    assert.deepEqual([q.errorCode, q.mime], ['200', WRITE]);
  });
}

test('the closing run asked for the six with the put back\'s tags and answered every request 304 or the finish, over eight lists', lab.skipUnless(BACK, ...runFiles(CLOSING, 8, EIGHT_ANSWERED)), () => {
  const back = setOf(BACK);
  assert.deepEqual(list(`${CLOSING}list_1`).map((q) => [q.uri, q.etag]), back.map((a) => [a.uri, a.etag]));
  checkRun(CLOSING, 'the closing run', back, [], EIGHT, EIGHT_ANSWERED);
});

test('the configuration hash was 6.9-label-back\'s before, the device set\'s after and the put back\'s after the put back',
  lab.skipUnless(SOURCE, DEVICE_SET, BACK, 'touch_device_confighash_before', 'touch_device_confighash_after', 'touch_device_confighash_back'), () => {
    const read = (fixture: string) => {
      const q = reply(fixture);
      assert.deepEqual([q.errorCode, q.mime], ['200', CONFIGHASH]);
      return q.result;
    };
    const expected = [SOURCE, DEVICE_SET, BACK].map((s) => hashOf(setOf(s)));
    assert.equal(new Set(expected).size, 3, 'three different hashes');
    assert.deepEqual(['before', 'after', 'back'].map((w) => read(`touch_device_confighash_${w}`)), expected);
  });

// ---- the bench run ----

interface Press { atMs: number; repeats: number; frame: { pulses: { mark: boolean; us: number }[] } }
interface Step { instruction: string; expect?: Expectation[]; presses: Press[]; verdicts: Verdict[]; problem?: string | null }

const run = (): Step[] => (JSON.parse(new TextDecoder().decode(lab.require_(RUN))) as { steps: Step[] }).steps;

let favouritesCache: Record<string, unknown> | undefined;
/** The device set's documents with the favourites of the recorded full sync, as in 7.1. */
function configuration(set: string): harmonyTouch.Configuration {
  if (favouritesCache === undefined) {
    const answers = answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi'));
    favouritesCache = Object.fromEntries(Object.entries(harmonyTouch.documentsOfAnswers(answers)).filter(([k]) => k.startsWith('content://')));
  }
  return touch71Configuration({ answers: setOf(set) }, favouritesCache);
}

/** A code book of one Touch set's documents, the way the monitor names a Touch code. */
const bookOf = (set: string): CodeBook => new CodeBook((name) => (name === set ? lab.require_(set) : undefined), [], undefined, [set]);

/** A run's presses named afresh from their pulses by `book`. */
function named(book: CodeBook, presses: readonly Press[]): RunPress[] {
  return presses.map((p) => {
    const matches = book.match(p.frame.pulses);
    return { atMs: p.atMs, repeats: p.repeats, frame: { ...p.frame, matches, bare: matches.length > 0 && !matches.some((m) => m.opening) } } as unknown as RunPress;
  });
}
const names = (p: RunPress): string[] => [...new Set(p.frame.matches.map((m) => `${m.device} ${m.command}`))];

function judgedBy(set: string, definition: TestDefinition): Verdict[][] {
  const book = bookOf(set);
  return run().map((s, i) => judge({ expect: definition.steps[i]!.expect ?? [], presses: named(book, s.presses) }));
}

test('the bench run carried the 8.1 test as derived, held 15 of 15 judged afresh by the device set, and nothing else was heard',
  lab.skipUnless(DEVICE_SET, FULL, RUN), () => {
    const definition = touch81Tests(configuration(DEVICE_SET))[0]!.definition;
    const steps = run();
    assert.deepEqual(steps.map((s) => s.instruction), definition.steps.map((s) => s.instruction));
    assert.deepEqual(steps.map((s) => s.expect ?? []), definition.steps.map((s) => JSON.parse(JSON.stringify(s.expect ?? [])) as Expectation[]));
    const verdicts = judgedBy(DEVICE_SET, definition);
    assert.deepEqual([verdicts.flat().length, verdicts.flat().filter((v) => v.ok).length], [15, 15]);
    // Named afresh, the verdicts are the ones the monitor wrote at the bench, one for one.
    assert.deepEqual(verdicts.flat().map((v) => v.ok), steps.flatMap((s) => s.verdicts.map((v) => v.ok)));
    // Every press of the run is one an expectation took, in order: none in Off or in the two device choices.
    const book = bookOf(DEVICE_SET);
    const heard = steps.map((s) => named(book, s.presses).map((p) => names(p)));
    assert.deepEqual(heard.map((h) => h.length), [0, 0, 2, 5, 3, 0, 5]);
    assert.deepEqual(heard.flat(), definition.steps.flatMap((s) => s.expect ?? []).map((e) => [`${String(e.device)} ${e.command}`]));
    assert.ok(steps.every((s) => s.problem === undefined || s.problem === null), 'no step marked');
  });

test('the control: judged by 6.9-label-back\'s documents the device\'s ten codes go unnamed, and only the Blu-ray\'s five hold',
  lab.skipUnless(SOURCE, DEVICE_SET, FULL, RUN), () => {
    const definition = touch81Tests(configuration(DEVICE_SET))[0]!.definition;
    const verdicts = judgedBy(SOURCE, definition).flat();
    assert.deepEqual([verdicts.length, verdicts.filter((v) => v.ok).length], [15, 5]);
    assert.ok(verdicts.filter((v) => v.ok).every((v) => v.expected.startsWith(TOUCH_8_1_CONTROL.toLowerCase())));
    const book = bookOf(SOURCE);
    const unnamed = run().flatMap((s) => named(book, s.presses)).filter((p) => p.frame.matches.length === 0).length;
    assert.equal(unnamed, 10);
  });

/**
 * Where 8.1's part of the monitor log ends: the put back's sync started at 12:01 UTC. The log is the live log of a
 * bench that kept running after 8.1, so frames of later use follow in the same file and are left out here.
 */
const LOG_END = '2026-11-06T12:01:00';

/** The monitor log's frames up to `LOG_END`, each opening a press with the frames after it, on the receiver's clock. */
function logPresses(book: CodeBook): { at: string; names: string[]; frames: number; bits: number | undefined; firstUs: number; headerUs: number; periodsMs: number[] }[] {
  const out: ReturnType<typeof logPresses> = [];
  let previousStart = 0;
  for (const line of new TextDecoder().decode(lab.require_(MONITOR)).split('\n')) {
    if (!line.includes('"pulses"')) continue;
    const f = JSON.parse(line) as { at: string; gapUs?: number; bits?: number; repeatOf?: number | null; pulses: { mark: boolean; us: number }[] };
    if (f.at >= LOG_END) break;
    const length = f.pulses.reduce((sum, p) => sum + p.us, 0);
    if (f.repeatOf !== undefined && f.repeatOf !== null) {
      const last = out[out.length - 1]!;
      last.frames += 1;
      // Start to start: the frame before, then the silence before this one.
      last.periodsMs.push((previousStart + (f.gapUs ?? 0)) / 1000);
      previousStart = length;
      continue;
    }
    previousStart = length;
    out.push({ at: f.at, names: [...new Set(book.match(f.pulses).map((m) => `${m.device} ${m.command}`))], frames: 1, bits: f.bits, firstUs: length, headerUs: f.pulses[0]!.us, periodsMs: [] });
  }
  return out;
}

test('every tap gave at least three frames of its code, the device\'s 12 bit frames about 20 ms long and 45 ms apart', lab.skipUnless(DEVICE_SET, MONITOR), () => {
  const presses = logPresses(bookOf(DEVICE_SET));
  assert.deepEqual(presses.map((p) => p.names.length === 1 ? p.names[0]!.replace(/^(Test Projector|Blu-ray) /, '') : p.names.join('|')), [
    'Menu', 'Exit', 'DirectionUp', 'DirectionDown', 'DirectionLeft', 'DirectionRight', 'Select', 'VolumeUp', 'VolumeDown', 'VolumeMute',
    'DirectionUp', 'DirectionDown', 'DirectionLeft', 'DirectionRight', 'Select', 'PowerToggle',
  ]);
  assert.deepEqual(presses.map((p) => p.frames), [4, 4, 4, 3, 3, 3, 3, 5, 5, 5, 3, 3, 3, 3, 3, 3]);
  const ours = presses.filter((p) => p.names[0]!.startsWith(TOUCH_8_1_DEVICE));
  const control = presses.filter((p) => p.names[0]!.startsWith(TOUCH_8_1_CONTROL));
  assert.deepEqual([ours.length, control.length], [11, 5]);
  assert.ok(ours.every((p) => p.bits === 12 && Math.abs(p.headerUs - 2450) <= 50 && Math.abs(p.firstUs - 20000) <= 700), 'a 12 bit frame of about 20 ms');
  assert.ok(control.every((p) => p.bits === 20 && Math.abs(p.firstUs - 33000) <= 700), 'the Blu-ray\'s 20 bit frame of about 33 ms');
  const periods = ours.flatMap((p) => p.periodsMs);
  assert.deepEqual([Math.min(...periods), Math.max(...periods)].map(Math.round), [44, 45]);
});

test('the Power entry tapped after the test was Test Projector\'s PowerToggle, named by the device set alone, as the model\'s screen entry predicts',
  lab.skipUnless(SOURCE, DEVICE_SET, FULL, MONITOR), () => {
    const withDevice = logPresses(bookOf(DEVICE_SET));
    const power = withDevice.at(-1)!;
    assert.deepEqual([power.at.slice(0, 19), power.names, power.frames], ['2026-11-06T12:00:57', [`${TOUCH_8_1_DEVICE} PowerToggle`], 3]);
    // The control: by 6.9-label-back's documents the same frames are nobody's.
    assert.deepEqual(logPresses(bookOf(SOURCE)).at(-1)!.names, []);
    // The model: no key binds Power, and the screen entry labelled Power sends PowerToggle to the device.
    const c = configuration(DEVICE_SET);
    const engine = new BenchTouchEngine(c, TIMING.low);
    engine.idle();
    assert.equal(c.devices.find((d) => d.name === TOUCH_8_1_DEVICE)!.map!.keys.some((b) => b.press?.command?.name === 'PowerToggle'), false);
    assert.deepEqual(engine.entry('Power', TOUCH_8_1_DEVICE).map((s) => `${s.device} ${s.command}`), [`${TOUCH_8_1_DEVICE} PowerToggle`]);
  });

test('the screen entry predicts the Denon\'s PowerToggle for its entry, refuses a label it cannot find, and changes neither 7.1\'s tests nor 8.1\'s',
  lab.skipUnless(SOURCE, DEVICE_SET, FULL), () => {
    const c = configuration(SOURCE);
    const engine = new BenchTouchEngine(c, TIMING.low);
    engine.idle();
    const denon = c.devices.find((d) => d.name === 'Denon AV Receiver')!;
    const entry = [...denon.map!.entries.values()].filter((b) => b.press?.command?.name === 'PowerToggle');
    assert.equal(entry.length, 1);
    assert.deepEqual(engine.entry(entry[0]!.label!, denon.name).map((s) => `${s.device} ${s.command}`), ['Denon AV Receiver PowerToggle']);
    assert.throws(() => engine.entry('No Such Entry', denon.name), /0 screen entries labelled No Such Entry/);
    // The tests written before the screen entry existed are still what the derivation gives, file for file.
    const directory = fileURLToPath(new URL('../irtests/', import.meta.url));
    const onDisk = testDefinitions(directory).concat(testDefinitions(fileURLToPath(new URL('../irtests/done/', import.meta.url))));
    const derived = [...touch71Tests(c), ...touch81Tests(configuration(DEVICE_SET))];
    assert.equal(derived.length, 11);
    for (const d of derived) assert.deepEqual(onDisk.find((one) => one.id === d.id)?.definition, JSON.parse(JSON.stringify(d.definition)) as TestDefinition, d.id);
  });
