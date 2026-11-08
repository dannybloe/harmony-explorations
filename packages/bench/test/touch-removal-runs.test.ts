/**
 * An activity and a device of the remote's own taken out of a Harmony Touch, `todo-touch.md` 8.5, as it ran: Listen to
 * Music and the Denon AV Receiver taken out of the four documents that name them, delivered in a sync, the remaining
 * activities heard at the receiver without a code of the receiver, and both put back. And the first try, which
 * stopped while its answers were being written and left the remote on the set before it.
 *
 * **What was run.** After commit `2d7afb1e`, the 8.5 preparation, and in the order of the lab's
 * `work/touch-firmware/notes/8.5-preflight.md` section 7, each run read before the next, Off pressed before each sync:
 *
 * 1. `getconfighash` through the request rail, the remote holding `8.4-settings-back`;
 * 2. `touch-sync.ts --set 8.5-removal --commit`, **the first try, which stopped**: the gate passed, the provisioning
 *    read and the hand over went through with nothing handed up, the sync started, the first request list was read,
 *    and while the answers to it were being written the session's read of the remote's reply timed out,
 *    `hid_read_timeout: error waiting for more data`. The run ended `refused` with the recovery line it prints on
 *    every refusal;
 * 3. `getconfighash` twice, both 200;
 * 4. `touch-sync.ts --set 8.5-removal --commit` again, unchanged, committed, and `getconfighash`;
 * 5. the bench test `irtests/done/touch-8-5-removal.json` on the Flirc monitor;
 * 6. `touch-sync.ts --set 8.5-removal-back --commit` and `getconfighash`;
 * 7. one `touch-sync.ts --unchanged --commit`.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **The two sets.** The removal is `8.4-settings-back`'s six with ActivityList, DeviceList, MapList and ProtocolList
 *    changed and retagged with tags of ours, Context and Settings as they were, content and tags; its reader finds four
 *    activities shown and six devices, neither Listen to Music nor the Denon AV Receiver. The put back is
 *    `8.4-settings-back` exactly. What the removal takes out entry by entry is `packages/corpus/test/touch-removal-set.test.ts`.
 * 2. **The first try stopped inside the write of its first answers, and what it kept says no more than that.** Its
 *    folder holds the request line of that write and no reply to it, neither the announcement's nor the write's, and
 *    nothing after it; the line is byte for byte the committed run's first write but for the session id, 393683
 *    characters, 13 chunks of 31000. Which chunk was going out when the read timed out, the files do not say.
 * 3. **It left the remote on the set before it.** The configuration hash read twice after it answered 200, not 202,
 *    both times with `8.4-settings-back`'s tags and not the removal's, so no sync was marked running and nothing of
 *    the removal was committed; and the same set run again unchanged was asked for the six with `8.4-settings-back`'s
 *    tags, as the first try had been.
 * 4. **The committed run and the put back each answered the four 200 with the set's content and tags**, Context and
 *    Settings 304 against their tags, the three favourites documents 304 with a tag of ours, the ten pictures 304, the
 *    finish 200, and finished, over eight request lists, nothing handed up. The six went in one write of 393683
 *    characters, 13 chunks, for the removal and 567941, 19 chunks, for the put back, each replied 200 as a write. The
 *    closing `--unchanged` run answered every request 304 or the finish.
 * 5. **The first request lists and the hash say what was committed.** The removal's run asked with
 *    `8.4-settings-back`'s six tags; the put back's run asked for the four with the removal's tags and Context and
 *    Settings with the tags both sets carry; the closing run with `8.4-settings-back`'s six. The hash was
 *    `8.4-settings-back`'s before, the removal's after it, three of its four tags new, and `8.4-settings-back`'s after
 *    the put back.
 * 6. **The remaining activities ran without the receiver, at the receiver.** The bench run, judged afresh here from its
 *    pulses by the removal's own documents, held 11 of 11, and every press of the run is one an expectation took:
 *    Watch TV from Off, the LG TV on and its HDMI 1 10405 ms later; Volume Up, Volume Down and Mute, nothing at all;
 *    Watch a Blu-ray, the player on and the TV's HDMI 2; its Test Sequence entry, now the last, the player's Stop and its
 *    TopMenu 1259 ms later; Play a Game, the Xbox on, the player off, HDMI 4; Off, the TV and the Xbox off. No press
 *    in the run or in the monitor's log before the put back is named as the receiver's, by a code book that holds the
 *    receiver's codes.
 *
 * **Reported by the person at the bench and held by no file**: on the first try, the file based family then
 * enumerated no remote for a moment, a read refusing with "no remote of the file based family is attached", the Touch
 * enumerated again, and the person reported it restarting itself and then starting normally with everything there; a
 * second remote, product id `0xc110`, belonging to other work, was on the bus during this. After the removal the
 * activity list showed four activities without Listen to Music, the device list six devices without the Denon, and
 * Watch a Blu-ray's command list eight entries without InputAm; after the put back everything was back and the volume
 * keys worked in Watch TV. The run's problem fields are empty, so none of this is in the run file.
 *
 * **No cause is claimed for the stop.** The files show a read timeout inside a 13 chunk write and, by the person's
 * report, the remote leaving the bus and starting again. Whether the remote restarted because of the write, the cable
 * or anything else, they do not say: the same write went through unchanged on the next try, and 8.2's 12 chunks and
 * 6.8's and 8.1's 19 had gone through before.
 *
 * **So an activity and a device of the remote's own, taken out of the documents by a program with everything naming
 * them, were stored and committed by a Touch**, the activities that had used the device started, switched and ended
 * without a code of it, its volume keys gone with it, the moved screen entry sent by its new index; and the put back
 * restored the set before. And a sync stopped before its commit, by a USB read timeout, left the committed set as it
 * was, measured by the hash. What this does not show: a removal while the activity or the device is in use, the
 * screens' lists at the moment of the commit, what restarted the remote, and an abort or a restart sent by us after
 * this stop, since none was needed.
 *
 * **The control** judges the run by the plan the same steps give on `8.4-settings-back`, which still holds the
 * receiver: it expects eight receiver codes, and the run's presses hold 10 of 19 by it, the eight receiver codes unheard
 * and Watch TV's input heard outside the pause that plan gives after the receiver's input step, where by the removal's
 * own plan they hold 11 of 11. The book the run is named with names the receiver: by it 8.3's monitor log, from when the
 * receiver was still in use, holds eight receiver codes. And the hash after the stop is held against the removal's
 * hash, from which it differs.
 *
 * **What would have falsified it**: a hash after the stop of the removal's, or a 202; a 200 for Context or Settings or a
 * 304 for any of the four; a put back first list asking with any tag but the removal's for the four; a receiver code
 * heard; a volume key sending anything; the entry tapped sending anything but Stop and TopMenu.
 *
 * **Sources checked first**: the lab's `8.5-preflight.md` and `8.5-land-brief.md`, `touch-favourites-runs.test.ts` and
 * `touch-settings-runs.test.ts`, whose shape this follows, `touch-removal-predicted.test.ts`, `touchremovaltest.ts` and `harmony-touch/engine.ts`, and
 * `syncTouch` in `packages/corpus/src/touchsync.ts` for what a run's folder keeps and when: a request line is written
 * before it is sent, its answer and its announcement's answer only once the whole request has returned. Logitech's
 * client was not consulted: the remote runs its own screens and the answers are ours. **Which architectures**: the
 * Harmony Touch on firmware 4.15.330, one unit, one committed run of each set; its firmware reports 17 and Logitech's
 * templates file it under 18.
 *
 * The reads and the sets hold tags, the account's numbers and the household's address: this file asserts equalities,
 * counts and shapes and prints none of them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname } from 'node:path';
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
import { touch71Configuration } from '../src/touchbench.ts';
import { TOUCH_8_5_REMOVED, touch85Tests } from '../experiments/touchremovaltest.ts';

/** `8.4-settings-back`: what the bench Touch held before 8.5, and what the put back delivers. */
const SOURCE = 'touch_settings_set_back';
const SET = 'touch_removal_set';
const BACK = 'touch_removal_set_back';
const FULL = 'touch_full_sync_recording';
const RUN = 'touch_8_5_run';
const MONITOR = 'touch_8_5_monitor';
const STOPPED = 'touch_removal_stopped_';
const RECEIVER = TOUCH_8_5_REMOVED.device;

/** One answer of a set as the lab keeps it, `set.json`. */
interface SetAnswer { uri: string; 'body-type': string; resource: unknown; etag: string }
const setOf = (fixture: string): SetAnswer[] => (JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as { answers: SetAnswer[] }).answers;
const byName = (set: readonly SetAnswer[], name: string): SetAnswer => set.find((a) => resource(a.uri) === name)!;
const text = (fixture: string): string => new TextDecoder().decode(lab.require_(fixture));

/** The four documents 8.5 delivers, the ones a device or an activity is named in. */
const FOUR = ['ActivityList', 'DeviceList', 'MapList', 'ProtocolList'];
/** The answers of `set` that differ from `before`, content or tag. */
const delivered = (set: readonly SetAnswer[], before: readonly SetAnswer[]): SetAnswer[] =>
  set.filter((a) => !isDeepStrictEqual(a, byName(before, resource(a.uri))));

/** The four documents whose tags `getconfighash` joins, in its order, `touch-confighash.test.ts`. */
const HASHED = ['ActivityList', 'DeviceList', 'ProtocolList', 'Context'];
const hashOf = (set: readonly SetAnswer[]): string => `result=${HASHED.map((d) => byName(set, d).etag).join('')}`;
const hashRead = (fixture: string): unknown => {
  const q = reply(fixture);
  assert.deepEqual([q.errorCode, q.mime], ['200', CONFIGHASH], fixture);
  return q.result;
};

/** 31000 characters a chunk, as `touch-changed-set-sync.test.ts` derives it from the session's shapes. */
const CHUNK = 31000;
const chunks = (length: number): number => Math.ceil(length / CHUNK);

/** The two committed set runs, each with the set it delivered, the set the remote held before it, and its kept write. */
const SET_RUNS = [
  { prefix: 'touch_removal_sync_1_', set: SET, before: BACK, length: 393683, chunks: 13 },
  { prefix: 'touch_removal_sync_2_', set: BACK, before: SET, length: 567941, chunks: 19 },
] as const;
const CLOSING = 'touch_removal_unchanged_';
const ALL_RUNS = [...SET_RUNS.map((r) => r.prefix), CLOSING];

/** The eight request lists every committed run of 8.5 handed out, as every run of 8.2 to 8.4 did. */
const EIGHT = [
  Array(6).fill('document'), [], ['user favourites'], ['device favourites'], ['line up'], [], Array(10).fill('picture'), ['finished'],
];
const EIGHT_ANSWERED = [1, 3, 4, 5, 7, 8] as const;

const runFiles = (prefix: string): string[] => [
  `${prefix}outcome`, `${prefix}handover_list`, `${prefix}handover_answers`,
  ...EIGHT.map((_, i) => `${prefix}list_${i + 1}`), ...EIGHT_ANSWERED.map((n) => `${prefix}answers_${n}`),
];

/**
 * Every answer of one write against its request: an address the set delivers 200 with the set's type, tag and
 * content, every other tagged request 304 echoing its tag, an untagged favourites request 304 with a tag of ours,
 * the finish 200. 8.4's rule, written again here since a test file cannot import another.
 */
function checkAnswers(asked: Request_[], ours: ReturnType<typeof written>, label: string, sent: readonly SetAnswer[]): void {
  const byUri = new Map(sent.map((a) => [a.uri, a]));
  assert.deepEqual(ours.map((a) => a.uri), asked.map((r) => r.uri), `${label}: the same addresses in the same order`);
  for (const [i, a] of ours.entries()) {
    const r = asked[i]!;
    const k = kind(r.uri);
    const s = byUri.get(r.uri);
    if (k === 'finished') {
      assert.deepEqual([a.statusCode, 'etag' in a], ['200', false], label);
    } else if (s !== undefined) {
      assert.deepEqual([a.statusCode, a['body-type'], a.etag], ['200', s['body-type'], s.etag], `${label}: ${resource(r.uri)} answered 200 with the set's tag`);
      assert.ok(isDeepStrictEqual(a.resource, s.resource), `${label}: ${resource(r.uri)} is the set's`);
    } else if (hasTag(r)) {
      assert.deepEqual([a.statusCode, a.etag, 'resource' in a], ['304', r.etag, false], `${label}: ${k} answered 304 echoing its tag`);
    } else {
      assert.deepEqual([k.endsWith('favourites') || k === 'line up', a.statusCode, 'resource' in a], [true, '304', false], `${label}: an untagged favourites request kept`);
      assert.match(a.etag ?? '', OURS, `${label}: a tag of ours`);
    }
  }
}

/** One whole run: the outcome, the hand over, the lists' shape and every answer, and the status counts. */
function checkRun(prefix: string, label: string, sent: readonly SetAnswer[]): void {
  const outcome = JSON.parse(text(`${prefix}outcome`)) as { ending: string; acted: boolean; lists: number; answered: number; handedUp: unknown[] };
  assert.deepEqual([outcome.ending, outcome.acted, outcome.lists, outcome.answered, outcome.handedUp.length], ['finished', true, EIGHT.length, 20, 0], `${label}: the answerer's outcome`);
  assert.deepEqual(list(`${prefix}handover_list`).map((r) => [r.verb, r.uri, 'etag' in r]), [['POST', FINISHED, false]], `${label}: the hand over, nothing handed up`);
  assert.deepEqual(written(`${prefix}handover_answers`).map((a) => [a.statusCode, a.uri, 'etag' in a]), [['200', FINISHED, false]], `${label}: the hand over answered`);
  assert.deepEqual(EIGHT.map((_, i) => list(`${prefix}list_${i + 1}`).map((r) => kind(r.uri))), EIGHT, `${label}: the lists`);
  for (const n of EIGHT_ANSWERED) checkAnswers(list(`${prefix}list_${n}`), written(`${prefix}answers_${n}`), `${label}, list ${n}`, sent);
  const all = EIGHT_ANSWERED.flatMap((n) => written(`${prefix}answers_${n}`));
  assert.deepEqual(['200', '304'].map((s) => all.filter((a) => a.statusCode === s).length), [1 + sent.length, 19 - sent.length], `${label}: the statuses`);
}

/** Which set's tag a request of a first list carries: the removal's alone, the one before it, or another. */
function whose(q: Request_): string {
  const d = resource(q.uri);
  const removal = byName(setOf(SET), d).etag;
  const before = byName(setOf(SOURCE), d).etag;
  if (q.etag === removal && q.etag !== before) return 'removal';
  if (q.etag === before) return 'before';
  return 'another';
}

test('the removal is 8.4-settings-back with the four documents that name a device or an activity changed under tags of ours, and the put back is 8.4-settings-back',
  lab.skipUnless(SOURCE, SET, BACK), () => {
    const source = setOf(SOURCE);
    const forward = setOf(SET);
    assert.deepEqual(setOf(BACK), source, 'the put back is the set before, content and tags');
    assert.deepEqual(forward.map((a) => a.uri), source.map((a) => a.uri), 'the six, in the source\'s order');
    assert.deepEqual(delivered(forward, source).map((a) => resource(a.uri)), FOUR, 'only the four differ');
    for (const d of FOUR) {
      assert.match(byName(forward, d).etag, OURS, `${d}: a tag of ours`);
      assert.notEqual(byName(forward, d).etag, byName(source, d).etag, d);
    }
    // What the reader finds in the removal: four activities shown, six devices, neither of the two.
    const read = harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(forward as unknown as harmonyTouch.SyncAnswer[]));
    assert.deepEqual([read.activities.filter((a) => !a.hidden).length, read.devices.length], [4, 6]);
    assert.ok(!read.activities.some((a) => a.name === TOUCH_8_5_REMOVED.activity) && !read.devices.some((d) => d.name === RECEIVER));
    const before = harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(source as unknown as harmonyTouch.SyncAnswer[]));
    assert.deepEqual([before.activities.filter((a) => !a.hidden).length, before.devices.length], [5, 7]);
  });

// ---- the first try, which stopped ----

test('the first try stopped while the answers to its first request list were being written: no reply kept, nothing after it, the write the committed run\'s bar the session id',
  lab.skipUnless(SOURCE, ...['outcome', 'log', 'handover_list', 'handover_answers', 'sync_answer', 'list_1', 'answers_1'].map((f) => `${STOPPED}${f}`), 'touch_removal_sync_1_answers_1'), () => {
    const outcome = JSON.parse(text(`${STOPPED}outcome`)) as { ending: string; reason: string; acted: boolean; lists: number; answered: number; handedUp: unknown[] };
    assert.deepEqual([outcome.ending, outcome.acted, outcome.lists, outcome.answered, outcome.handedUp.length], ['refused', true, 1, 0, 0]);
    assert.match(outcome.reason, /hid_read_timeout: error waiting for more data/);
    // The run's own log: the gate, the provisioning, the hand over of one list, the start, and the refusal, then its
    // two recovery lines.
    assert.deepEqual(text(`${STOPPED}log`).trim().split('\n').map((l) => l.split(',')[0]), [
      'sync: gate passed', 'sync: provisioned', 'sync: handing over the remote\'s changes', 'sync: hand over', 'sync: started',
      'sync: refused', 'sync: recovery', 'sync: recovery',
    ]);
    // The hand over handed nothing up and was answered; the sync request was answered 200.
    assert.deepEqual(list(`${STOPPED}handover_list`).map((r) => [r.verb, r.uri]), [['POST', FINISHED]]);
    assert.deepEqual(written(`${STOPPED}handover_answers`).map((a) => [a.statusCode, a.uri]), [['200', FINISHED]]);
    assert.equal(reply(`${STOPPED}sync_answer`).errorCode, '200');
    // The first list asked for the six with the tags of the set the remote held.
    assert.deepEqual(list(`${STOPPED}list_1`).map((q) => q.uri), setOf(SOURCE).map((a) => a.uri));
    assert.deepEqual(list(`${STOPPED}list_1`).map((q) => whose(q)), Array(6).fill('before'));
    // The write that was going out: the committed run's first write, byte for byte, but for the session id.
    const line = text(`${STOPPED}answers_1`);
    const committed = text('touch_removal_sync_1_answers_1');
    const withoutSession = (s: string) => s.replace(/sessionId=[^&]*/, 'sessionId=');
    assert.equal(withoutSession(line), withoutSession(committed));
    assert.notEqual(line, committed, 'a session id of its own');
    assert.deepEqual([line.length, chunks(line.length)], [393683, 13]);
    // The folder keeps a request before it is sent and its answers only once it returns: it ends at that line.
    const folder = readdirSync(dirname(lab.imagePath(`${STOPPED}outcome`)!)).sort();
    assert.deepEqual(folder.filter((f) => /^\d{3}-/.test(f)).at(-1), '007-answers-request.txt');
    assert.ok(!folder.some((f) => f.startsWith('007-answers-') && f !== '007-answers-request.txt'), 'no reply to the write, nor to its announcement');
    assert.deepEqual(folder.filter((f) => !/^\d{3}-/.test(f)), ['handed-up', 'log.txt', 'outcome.json']);
  });

test('after the stop the hash answered 200 twice with the tags of the set before, not the removal\'s: nothing was marked running and nothing committed',
  lab.skipUnless(SOURCE, SET, BACK, 'touch_removal_confighash_before', 'touch_removal_confighash_stopped_1', 'touch_removal_confighash_stopped_2'), () => {
    const before = hashOf(setOf(BACK));
    assert.equal(hashOf(setOf(SOURCE)), before);
    assert.notEqual(hashOf(setOf(SET)), before, 'the control: the removal moves the hash');
    assert.deepEqual(['before', 'stopped_1', 'stopped_2'].map((w) => hashRead(`touch_removal_confighash_${w}`)), [before, before, before]);
  });

// ---- the committed runs ----

for (const r of SET_RUNS) {
  test(`${r.prefix}: the four answered 200 with the set's content and tags, Context and Settings 304, the finish 200, over eight request lists`,
    lab.skipUnless(r.set, r.before, ...runFiles(r.prefix)), () => {
      const sent = delivered(setOf(r.set), setOf(r.before));
      assert.deepEqual(sent.map((a) => resource(a.uri)), FOUR);
      checkRun(r.prefix, r.prefix, sent);
    });

  test(`${r.prefix}: the six went in one write of ${r.length} characters, ${r.chunks} chunks, replied 200 as a write`,
    lab.skipUnless(`${r.prefix}answers_1`, `${r.prefix}reply_1`), () => {
      const length = text(`${r.prefix}answers_1`).length;
      assert.deepEqual([length, chunks(length)], [r.length, r.chunks]);
      const q = reply(`${r.prefix}reply_1`);
      assert.deepEqual([q.errorCode, q.mime], ['200', WRITE]);
    });
}

test('the closing run answered every request 304 or the finish, over eight lists', lab.skipUnless(...runFiles(CLOSING)), () => {
  checkRun(CLOSING, 'the closing run', []);
});

test('the first lists: the set before\'s six at the removal, the four with the removal\'s tags at the put back, the set before\'s six at the close',
  lab.skipUnless(SOURCE, SET, ...ALL_RUNS.map((p) => `${p}list_1`)), () => {
    const source = setOf(SOURCE);
    const asked = ALL_RUNS.map((p) => list(`${p}list_1`));
    for (const l of asked) assert.deepEqual(l.map((q) => q.uri), source.map((a) => a.uri));
    assert.deepEqual(asked.map((l) => l.map((q) => `${resource(q.uri)} ${whose(q)}`)), [
      source.map((a) => `${resource(a.uri)} before`),
      source.map((a) => `${resource(a.uri)} ${FOUR.includes(resource(a.uri)) ? 'removal' : 'before'}`),
      source.map((a) => `${resource(a.uri)} before`),
    ]);
    for (const p of ALL_RUNS) {
      assert.deepEqual([3, 4, 5].map((n) => list(`${p}list_${n}`).map((q) => hasTag(q))), [[false], [false], [false]], p);
    }
  });

test('the configuration hash was the set before\'s before, the removal\'s after it, three of its four tags new, and the set before\'s after the put back',
  lab.skipUnless(SOURCE, SET, BACK, 'touch_removal_confighash_before', 'touch_removal_confighash_after', 'touch_removal_confighash_back'), () => {
    const expected = [BACK, SET, BACK].map((s) => hashOf(setOf(s)));
    assert.deepEqual(['before', 'after', 'back'].map((w) => hashRead(`touch_removal_confighash_${w}`)), expected);
    // Three of the four hashed documents are among the four delivered; Context is not.
    assert.deepEqual(HASHED.filter((d) => byName(setOf(SET), d).etag !== byName(setOf(BACK), d).etag), ['ActivityList', 'DeviceList', 'ProtocolList']);
  });

// ---- the bench run ----

interface Press { atMs: number; repeats: number; frame: { pulses: { mark: boolean; us: number }[] } }
interface Step { instruction: string; expect?: Expectation[]; presses: Press[]; verdicts: Verdict[]; problem?: string | null }
interface Run { startedAt: string; endedAt: string; steps: Step[] }

const runOf = (fixture: string): Run => JSON.parse(text(fixture)) as Run;

let recordedCache: Record<string, unknown> | undefined;
/** The recorded full sync's favourites documents by address, which no set of 8.5 touches. */
function recordedFavourites(): Record<string, unknown> {
  recordedCache ??= Object.fromEntries(answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi'))
    .filter((a) => a.uri.startsWith('content://')).map((a) => [a.uri, a.resource]));
  return recordedCache;
}
/** A set's six with the recorded favourites, as the bench tests read them. */
const configuration = (set: string): harmonyTouch.Configuration => touch71Configuration({ answers: setOf(set) }, recordedFavourites());
const definitionOf = (set: string): TestDefinition => touch85Tests(configuration(set))[0]!.definition;

let bookCache: CodeBook | undefined;
/**
 * The code book of the set before the removal, the way the monitor names a Touch code. It holds the receiver's codes,
 * so a receiver code heard would be named as the receiver's, and every device the removal kept with the same codes.
 */
const book = (): CodeBook => (bookCache ??= new CodeBook((name) => (name === SOURCE ? lab.require_(SOURCE) : undefined), [], undefined, [SOURCE]));

/** A run's presses named afresh from their pulses. */
function named(presses: readonly Press[]): RunPress[] {
  return presses.map((p) => {
    const matches = book().match(p.frame.pulses);
    return { atMs: p.atMs, repeats: p.repeats, frame: { ...p.frame, matches, bare: matches.length > 0 && !matches.some((m) => m.opening) } } as unknown as RunPress;
  });
}
const names = (p: RunPress): string[] => [...new Set(p.frame.matches.map((m) => `${m.device} ${m.command}`))].sort();

/** Every step of a run judged against a definition's steps by index, as `[ok, of]`. */
function score(run: Run, definition: TestDefinition): [number, number] {
  const verdicts = run.steps.flatMap((s, i) => (definition.steps[i] === undefined ? [] : judge({ expect: definition.steps[i]!.expect ?? [], presses: named(s.presses) })));
  return [verdicts.filter((v) => v.ok).length, verdicts.length];
}

/** The pauses between one step's presses, start to start, in whole milliseconds. */
const pausesOf = (presses: readonly { atMs: number }[]): number[] => presses.slice(1).map((p, i) => Math.round(p.atMs - presses[i]!.atMs));

test('the bench run carried the 8.5 test as derived and on disk, held 11 of 11 judged afresh, the volume keys silent, and no code of the receiver',
  lab.skipUnless(SOURCE, SET, FULL, RUN), () => {
    const definition = definitionOf(SET);
    const onDisk = testDefinitions(fileURLToPath(new URL('../irtests/', import.meta.url))).concat(testDefinitions(fileURLToPath(new URL('../irtests/done/', import.meta.url)))).find((one) => one.id === 'touch-8-5-removal')!.definition;
    assert.deepEqual(onDisk, JSON.parse(JSON.stringify(definition)) as TestDefinition);
    const run = runOf(RUN);
    assert.deepEqual(run.steps.map((s) => s.instruction), definition.steps.map((s) => s.instruction));
    assert.deepEqual(run.steps.map((s) => s.expect ?? []), definition.steps.map((s) => JSON.parse(JSON.stringify(s.expect ?? [])) as Expectation[]));
    const verdicts = run.steps.map((s, i) => judge({ expect: definition.steps[i]!.expect ?? [], presses: named(s.presses) }));
    assert.deepEqual([verdicts.flat().length, verdicts.flat().filter((v) => v.ok).length], [11, 11]);
    // Named afresh, the verdicts are the ones the monitor wrote at the bench, one for one.
    assert.deepEqual(verdicts.flat().map((v) => v.ok), run.steps.flatMap((s) => s.verdicts.map((v) => v.ok)));
    // Every press of the run is one an expectation took, in order: none in the unjudged Off, none on the volume keys.
    const heard = run.steps.map((s) => named(s.presses).map(names));
    const expected = definition.steps.map((s) => (s.expect ?? []).map((e) => `${String(e.device)} ${e.command}`));
    assert.deepEqual(heard.map((h) => h.length), [0, 2, 0, 2, 2, 3, 2]);
    assert.deepEqual(heard.map((h) => h.length), expected.map((e) => e.length));
    assert.deepEqual(heard.flat().map((n, i) => n.includes(expected.flat()[i]!)), expected.flat().map(() => true));
    // Every press named, by a book that names the receiver's codes, and none of them the receiver's.
    assert.ok(heard.flat().every((n) => n.length > 0), 'every press named');
    assert.ok(!heard.flat().flat().some((n) => n.startsWith(`${RECEIVER} `)), 'no code of the receiver');
    // The pauses: Watch TV's input after the LG TV's power on delay, the entry's Stop and TopMenu about a second apart.
    assert.deepEqual([pausesOf(run.steps[1]!.presses), pausesOf(run.steps[4]!.presses)], [[10405], [1259]]);
    assert.ok(run.steps.every((s) => s.problem === undefined || s.problem === null), 'no step marked: the look is held by no file');
  });

test('the control: judged by the same steps on the set before, which still holds the receiver, the run\'s presses hold 10 of 19, where by the removal\'s own 11 of 11',
  lab.skipUnless(SOURCE, SET, FULL, RUN), () => {
    const old = definitionOf(SOURCE);
    assert.equal(old.steps.flatMap((s) => s.expect ?? []).filter((e) => e.device === RECEIVER).length, 8);
    const run = runOf(RUN);
    assert.deepEqual(score(run, old), [10, 19]);
    // What fails by it: the eight receiver codes, unheard, and Watch TV's input, heard but at the pause the set before
    // gives after the receiver's input step, which the run never sent.
    const failing = run.steps.flatMap((s, i) => judge({ expect: old.steps[i]!.expect ?? [], presses: named(s.presses) }).filter((v) => !v.ok).map((v) => v.expected));
    assert.equal(failing.filter((e) => e.startsWith(`${RECEIVER.toLowerCase()} `)).length, 8);
    assert.deepEqual(failing.filter((e) => !e.startsWith(`${RECEIVER.toLowerCase()} `)), ['lg tv · InputHdmi1']);
    assert.deepEqual(score(run, definitionOf(SET)), [11, 11]);
  });

/** Where 8.5's part of the monitor log ends: the put back's sync started at 15:01 UTC. */
const LOG_END = '2026-11-06T15:01:00';

/** A monitor log's opening frames up to `end`, named by the book of the set before. */
function logPresses(fixture: string, end: string): { at: string; names: string[] }[] {
  const out: { at: string; names: string[] }[] = [];
  for (const line of text(fixture).split('\n')) {
    if (!line.includes('"pulses"')) continue;
    const f = JSON.parse(line) as { at: string; repeatOf?: number | null; pulses: { mark: boolean; us: number }[] };
    if (f.at >= end) break;
    if (f.repeatOf !== undefined && f.repeatOf !== null) continue;
    out.push({ at: f.at, names: [...new Set(book().match(f.pulses).map((m) => `${m.device} ${m.command}`))].sort() });
  }
  return out;
}

test('the monitor log before the put back holds the run\'s 11 presses and nothing else, none of them the receiver\'s',
  lab.skipUnless(SOURCE, RUN, MONITOR), () => {
    const run = runOf(RUN);
    const all = logPresses(MONITOR, LOG_END);
    const during = all.filter((p) => p.at >= run.startedAt && p.at <= run.endedAt);
    assert.deepEqual([all.length, during.length], [11, 11]);
    assert.deepEqual(during.map((p) => p.names), run.steps.flatMap((s) => named(s.presses).map(names)));
    assert.ok(!all.some((p) => p.names.some((n) => n.startsWith(`${RECEIVER} `))), 'no code of the receiver');
  });

test('the control for "no code of the receiver": the same book names the receiver in 8.3\'s monitor log, where the receiver was still in use',
  lab.skipUnless(SOURCE, 'touch_8_3_monitor'), () => {
    // 8.3's part of its log, up to its put back, as `touch-favourites-runs.test.ts` bounds it.
    const receiver = logPresses('touch_8_3_monitor', '2026-11-06T13:39:00').filter((p) => p.names.some((n) => n.startsWith(`${RECEIVER} `)));
    // Eight: the receiver's power on and TV input at the 8.3 test's start, its power off at the test's Off, then its
    // power on, media player input and power off for Listen to Music started and ended, and its power on and TV input
    // for Watch TV started again.
    assert.deepEqual(receiver.map((p) => p.names.find((n) => n.startsWith(`${RECEIVER} `))!.slice(RECEIVER.length + 1)),
      ['PowerOn', 'InputTVAudio', 'PowerOff', 'PowerOn', 'InputMediaPlayer', 'PowerOff', 'PowerOn', 'InputTVAudio']);
  });
