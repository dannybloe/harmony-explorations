/**
 * An activity of ours on the Harmony Touch, `todo-touch.md` 8.2, as it ran: Test Cinema added to the set the bench
 * Touch holds, delivered, started, used, switched away from and back to, stopped, and taken out again.
 *
 * **What was run.** After commit `74f98f70`, the 8.2 preparation, and in the order of the lab's
 * `work/touch-firmware/notes/8.2-preflight.md` section 6, each run read before the next:
 *
 * 1. `getconfighash` through the request rail, the remote holding `8.1-device-back`;
 * 2. `touch-sync.ts --set 8.2-activity --commit`: the set of 8.1's put back with Test Cinema, an activity composed
 *    by this project from the bench devices by name, `packages/corpus/touch-activities/test-cinema.json`, its record
 *    appended to `ActivityList` and its button map to `MapList`, the two retagged and the other four left as they
 *    were, `touch-device-set.ts --activity`;
 * 3. `getconfighash` again;
 * 4. the bench test `irtests/done/touch-8-2-activity.json` on the Flirc monitor;
 * 5. `touch-sync.ts --set 8.2-activity-back --commit`, the activity taken out, and `getconfighash`;
 * 6. one `touch-sync.ts --unchanged --commit`.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **The two sets.** The activity set differs from `8.1-device-back` in exactly ActivityList and MapList, content
 *    and tag, and the put back holds `8.1-device-back`'s six documents as parsed JSON, with the two under tags that
 *    are neither set's. That each is what the composer and `changeDocuments` give is held by
 *    `packages/corpus/test/touch-activity-set.test.ts`; here they are the sets as delivered. Read back from the
 *    delivered set, the activity is id 900000003, nine digits from `OWN_IDS` where every activity id of Logitech's in
 *    the documents the remote held is eight, type 5 (`Custom`) with group 0 as `ACTIVITY_GROUPS` gives it, place 5,
 *    the last of six, not hidden, two devices, two start steps and one end step, a map of 13 keys and 4 entries.
 * 2. **Each run's first request list names what the remote held**: the activity run was asked for the six with
 *    `8.1-device-back`'s tags, so its own tags differ there for exactly ActivityList and MapList; the put back with all
 *    six of the activity set's, so the activity set had been committed; the closing run with the put back's.
 * 3. **Each set run answered ActivityList and MapList 200 with the set's content and tag and the other four 304**,
 *    the three favourites 304, the ten pictures 304, the finish 200, and finished: one write of 367778 characters, 12
 *    chunks of 31000 and a last of 26778, for the activity set, and of 359202, 12 chunks, the last 18202, for the put
 *    back, each replied 200 as a write. **All three runs handed out eight request lists**, as every run before 8.1's
 *    two set runs did, where those two handed out nine; the closing `--unchanged` run answered every request 304 or
 *    the finish. The files do not say why the count differed in 8.1, and no cause is claimed.
 * 4. **The configuration hash**, which joins the tags of ActivityList, DeviceList, ProtocolList and Context, was
 *    `8.1-device-back`'s before, the activity set's after and the put back's after the put back: ActivityList is one
 *    of the four, so the hash moved with each set, the remote's own report of its committed store.
 * 5. **The activity ran, at the receiver.** The bench run, judged afresh here from its pulses by the activity set's
 *    own documents, held 33 of 33, and every press of the run is one an expectation took: nothing in the unjudged
 *    Off, and in each judged step exactly as many presses as expectations. The start from Off was the Blu-ray's
 *    PowerOn, the LG TV's 869 ms later, its HDMI 2 10424 ms after that, and the Blu-ray's TopMenu 3286 ms later, the
 *    start step of ours; no Denon code. The keys sent the volume to the LG TV and the rest to the Blu-ray, so one map
 *    of ours sent to two devices; the four screen entries sent their commands by labels of ours; the switch to Watch
 *    TV sent our end step first, the Denon on, the Blu-ray off and the inputs; the switch back the Blu-ray on, the
 *    TV's input and our start steps again, the Denon left on; Off our end step, the LG TV and the Blu-ray off in our
 *    power off order, then the Denon. Every one of the twelve judged pauses fell inside its band.
 *    **What the receiver cannot tell apart**: the Blu-ray's Menu and PopUp are the same code in its definition, so
 *    the Menu key and the Pop Up Menu entry are each named both, and the Denon's PowerOn and PowerOff each share
 *    their code with a main zone command; each verdict holds on the command expected, and which of the two the
 *    remote looked up is not shown by the infrared. Every other press is named by its expected command alone.
 * 6. **After the test and before the put back, the log holds Test Cinema started again from Off and an Off**: the
 *    same four codes as the test's start, its pauses in the same bands, and then the Blu-ray's Stop and the LG TV and
 *    the Blu-ray switched off, with no Denon code, since the test's Off had switched it off; that is what the model
 *    predicts for those two actions after the test. No file records who did what then, and nothing is judged from it
 *    beyond that.
 *
 * **Reported by the person at the bench and held by no file**: Test Cinema was last in the activity list with the
 * custom picture; its screen showed Top Menu, Pop Up Menu, Subtitles and TV Info without icons; after the put back it
 * was gone and the remote worked normally. That is the screens' drawing as the preflight read it: `ImageKey` null so
 * the type's default picture, and an entry with no `FunctionId-` finds no icon.
 *
 * **So an activity composed by this project, under an identifier of ours, from devices the remote already held, was
 * stored, committed, listed, started, used, switched and stopped by a Touch as its record states, and taking it out
 * under new tags restored the set before.** Two documents delivered with 200 among four 304s replaced those two and
 * kept the others. What this does not show: a document composed whole, a favourite or a picture of ours, a type other
 * than Custom or a start screen other than the command list, an activity of ours using a device of ours, and an
 * activity removed while it runs.
 *
 * **The control** judges the run's start by the set the remote held before, `8.1-device-back`, where Test Cinema does
 * not exist: no plan can be derived from it, and the heard start judged as each of the five recorded activities' own
 * start from Off holds whole for none of them, Watch a Blu-ray, the nearest, holding 2 of its 5.
 *
 * **What would have falsified it**: a first list asking with any tags but the set before's; a 200 for a document the
 * set leaves alone, or a 304 for one it changes; a hash not moving to each set's; a code of ours unheard, heard out
 * of order, heard where the step expected none, or a pause outside its band.
 *
 * **Sources checked first**: the lab's `8.2-preflight.md` and `8.2-land-brief.md`, `touch-device-runs.test.ts`, whose shape
 * this follows, `touch-activity-predicted.test.ts` and `families/harmony-touch/engine.ts`. Logitech's client was not consulted: the remote runs its own
 * engine and the answers are ours. **Which architectures**: the Harmony Touch on firmware 4.15.330, one unit, one run
 * of each set; its firmware reports 17 and Logitech's templates file it under 18.
 *
 * The reads and the sets hold tags and the account's numbers: this file asserts equalities, counts and shapes and
 * prints none of them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

// The Node entry, for the fonts, the icons, the deflate and the SHA-256 the core asks its loader for.
import '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';
import * as lab from '@harmony/lab';
import {
  CONFIGHASH, FINISHED, OURS, WRITE, answersWritten, commands, hasTag, kind, list, records, reply, resource, sessions, written,
  type Request_,
} from '@harmony/testkit/touch-recording';

import { CodeBook } from '../src/irmonitor.ts';
import { judge, type Expectation, type RunPress, type Verdict } from '../src/irsession.ts';
import { BenchTouchEngine, TIMING, touch71Configuration } from '../src/touchbench.ts';
import { TOUCH_8_2_ACTIVITY, touch82Tests } from '../experiments/touchactivitytest.ts';

const SOURCE = 'touch_device_set_back';
const ACTIVITY_SET = 'touch_activity_set';
const BACK = 'touch_activity_set_back';
const FULL = 'touch_full_sync_recording';
const RUN = 'touch_8_2_run';
const MONITOR = 'touch_8_2_monitor';

/** One answer of a set as the lab keeps it, `set.json`. */
interface SetAnswer { uri: string; 'body-type': string; resource: unknown; etag: string }
const setOf = (fixture: string): SetAnswer[] => (JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as { answers: SetAnswer[] }).answers;

const TWO = ['ActivityList', 'MapList'];

/** The four documents whose tags `getconfighash` joins, in its order, `touch-confighash.test.ts`. */
const HASHED = ['ActivityList', 'DeviceList', 'ProtocolList', 'Context'];
const hashOf = (set: SetAnswer[]): string => {
  const tags = new Map(set.map((a) => [resource(a.uri), a.etag]));
  return `result=${HASHED.map((d) => tags.get(d)!).join('')}`;
};

/** The two set runs, each with the set it delivered, the set the remote held before it and the write's size. */
const SET_RUNS = [
  { prefix: 'touch_activity_sync_1_', set: ACTIVITY_SET, held: SOURCE, characters: 367778, last: 26778 },
  { prefix: 'touch_activity_sync_2_', set: BACK, held: ACTIVITY_SET, characters: 359202, last: 18202 },
] as const;
const CLOSING = 'touch_activity_unchanged_';

/** The eight request lists every run of 8.2 handed out, as every run before 8.1's sets did, `touch-device-runs.test.ts`. */
const EIGHT = [
  Array(6).fill('document'), [], ['user favourites'], ['device favourites'], ['line up'], [], Array(10).fill('picture'), ['finished'],
];
const EIGHT_ANSWERED = [1, 3, 4, 5, 7, 8] as const;

const runFiles = (prefix: string, answered: readonly number[]): string[] => [
  `${prefix}outcome`, `${prefix}handover_list`, `${prefix}handover_answers`,
  ...EIGHT.map((_, i) => `${prefix}list_${i + 1}`), ...answered.map((n) => `${prefix}answers_${n}`),
];

/**
 * Every answer of one write against its request: a document named in `delivered` 200 with the set's type, tag and
 * content, every other tagged request 304 echoing its tag, an untagged favourites request 304 with a tag of ours,
 * the finish 200. The same rule as 8.1's test, written again here since a test file cannot import another.
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
function checkRun(prefix: string, label: string, set: SetAnswer[], delivered: readonly string[]): void {
  const outcome = JSON.parse(new TextDecoder().decode(lab.require_(`${prefix}outcome`))) as { ending: string; acted: boolean; lists: number; answered: number; handedUp: unknown[] };
  assert.deepEqual([outcome.ending, outcome.acted, outcome.lists, outcome.answered, outcome.handedUp.length], ['finished', true, EIGHT.length, 20, 0], `${label}: the answerer's outcome`);
  assert.deepEqual(list(`${prefix}handover_list`).map((r) => [r.verb, r.uri, 'etag' in r]), [['POST', FINISHED, false]], `${label}: the hand over`);
  assert.deepEqual(written(`${prefix}handover_answers`).map((a) => [a.statusCode, a.uri, 'etag' in a]), [['200', FINISHED, false]], `${label}: the hand over answered`);
  assert.deepEqual(EIGHT.map((_, i) => list(`${prefix}list_${i + 1}`).map((r) => kind(r.uri))), EIGHT, `${label}: the lists`);
  for (const n of EIGHT_ANSWERED) checkAnswers(list(`${prefix}list_${n}`), written(`${prefix}answers_${n}`), `${label}, list ${n}`, set, delivered);
  const all = EIGHT_ANSWERED.flatMap((n) => written(`${prefix}answers_${n}`));
  assert.deepEqual(['200', '304'].map((s) => all.filter((a) => a.statusCode === s).length), [1 + delivered.length, 19 - delivered.length], `${label}: the statuses`);
}

test('the activity set is 8.1-device-back with the two documents changed and retagged, and the put back is its content again', lab.skipUnless(SOURCE, ACTIVITY_SET, BACK), () => {
  const source = setOf(SOURCE);
  const withActivity = setOf(ACTIVITY_SET);
  const back = setOf(BACK);
  for (const s of [withActivity, back]) assert.deepEqual(s.map((a) => a.uri), source.map((a) => a.uri));
  assert.deepEqual(withActivity.filter((a, i) => !isDeepStrictEqual(a.resource, source[i]!.resource)).map((a) => resource(a.uri)), TWO);
  assert.deepEqual(withActivity.filter((a, i) => a.etag !== source[i]!.etag).map((a) => resource(a.uri)), TWO);
  assert.deepEqual(back.map((a) => a.resource), source.map((a) => a.resource));
  assert.deepEqual(back.filter((a, i) => a.etag !== withActivity[i]!.etag).map((a) => resource(a.uri)), TWO);
  assert.deepEqual(back.filter((a, i) => a.etag !== source[i]!.etag).map((a) => resource(a.uri)), TWO);
  assert.ok([...withActivity, ...back].every((a) => OURS.test(a.etag)), 'every tag one of ours');
  // The activity itself, read back from the set the remote was given.
  const read = harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(withActivity as harmonyTouch.SyncAnswer[]));
  const a = read.activities.find((x) => x.name === TOUCH_8_2_ACTIVITY)!;
  assert.deepEqual([a.id, a.type, harmonyTouch.ACTIVITY_TYPES[a.type!], a.group, a.order, a.hidden, a.startScreen], ['900000003', 5, 'Custom', 0, 5, false, 'Commands']);
  assert.deepEqual([read.activities.length, Math.max(...read.activities.map((x) => x.order ?? 0))], [6, 5]);
  assert.deepEqual([a.devices.map((d) => d.device?.name), a.enter.map((s) => s.kind), a.leave.map((s) => s.commandName)], [['Blu-ray', 'LG TV'], ['delay', 'command'], ['Stop']]);
  assert.deepEqual([a.map?.keys.length, a.map?.entries.size], [13, 4]);
  // No record of Logitech's copied: the seven activity fields read by neither program, the roles' and inputs' ids
  // and the steps' ids are absent from the record the remote was given.
  const record = a.source as unknown as Record<string, unknown> & { Roles: Record<string, unknown>[]; EnterActions: Record<string, unknown>[]; LeaveActions: Record<string, unknown>[] };
  const absent = ['AccountId-', 'State', 'IsDefault', 'DateCreated', 'DateModified', 'DefaultStation', 'DefaultStationName'];
  assert.deepEqual(absent.filter((f) => f in record), []);
  assert.equal(record.Roles.length, 3);
  assert.ok(record.Roles.every((r) => !('Id-' in r) && !('Id-' in ((r['SelectedInput'] ?? {}) as object))), 'no role or input id');
  assert.ok([...record.EnterActions, ...record.LeaveActions].every((s) => !('Id' in s)), 'no step id');
  // The rule for identifiers of ours against Logitech's in the documents the remote held: their activity ids eight
  // digits, ours nine from 900000000.
  const activities = (source.find((x) => resource(x.uri) === 'ActivityList')!.resource as { Activities: Record<string, unknown>[] }).Activities;
  assert.deepEqual([...new Set(activities.map((x) => String(x['Id-']).length))], [8]);
  assert.ok(harmonyTouch.isOwnId(a.id) && a.id.length === 9);
  // Each recorded activity's group is the one `ACTIVITY_GROUPS` gives its type, on the documents the remote held.
  const held = harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(source as harmonyTouch.SyncAnswer[])).activities;
  assert.deepEqual(held.map((x) => x.group), held.map((x) => harmonyTouch.ACTIVITY_GROUPS[harmonyTouch.ACTIVITY_TYPES[x.type!]!]));
  assert.deepEqual(new Set(held.map((x) => harmonyTouch.ACTIVITY_TYPES[x.type!])).size, 5);
  // The table `activities-and-buttons.md` gives, type number to group, as the five recorded activities hold it.
  assert.deepEqual(Object.fromEntries(held.map((x) => [x.type, x.group]).sort((p, q) => p[0]! - q[0]!)), { 1: 1, 2: 2, 3: 4, 4: 3, 5: 0 });
});

for (const r of SET_RUNS) {
  test(`${r.prefix}: the six asked for with the tags of the set the remote held, and the set's own differ for exactly the two`, lab.skipUnless(r.held, r.set, `${r.prefix}list_1`), () => {
    const held = setOf(r.held);
    const set = setOf(r.set);
    assert.deepEqual(list(`${r.prefix}list_1`).map((q) => [q.uri, q.etag]), held.map((a) => [a.uri, a.etag]));
    assert.deepEqual(list(`${r.prefix}list_1`).filter((q, i) => q.etag !== set[i]!.etag).map((q) => resource(q.uri)), TWO);
  });

  test(`${r.prefix}: the two answered 200 with the set's content and tags, the rest 304, the finish 200, over eight request lists`, lab.skipUnless(r.set, ...runFiles(r.prefix, EIGHT_ANSWERED)), () => {
    checkRun(r.prefix, r.prefix, setOf(r.set), TWO);
  });

  test(`${r.prefix}: the two went in one write of ${r.characters} characters, 12 chunks, replied 200 as a write`, lab.skipUnless(`${r.prefix}answers_1`, `${r.prefix}reply_1`), () => {
    const line = new TextDecoder().decode(lab.require_(`${r.prefix}answers_1`));
    // 31000 characters a chunk, as `touch-changed-set-sync.test.ts` derives it from the session's shapes.
    assert.deepEqual([line.length, Math.ceil(line.length / 31000), line.length % 31000], [r.characters, 12, r.last]);
    const q = reply(`${r.prefix}reply_1`);
    assert.deepEqual([q.errorCode, q.mime], ['200', WRITE]);
  });
}

test('the closing run asked for the six with the put back\'s tags and answered every request 304 or the finish, over eight lists', lab.skipUnless(BACK, ...runFiles(CLOSING, EIGHT_ANSWERED)), () => {
  const back = setOf(BACK);
  assert.deepEqual(list(`${CLOSING}list_1`).map((q) => [q.uri, q.etag]), back.map((a) => [a.uri, a.etag]));
  checkRun(CLOSING, 'the closing run', back, []);
});

test('the configuration hash was 8.1-device-back\'s before, the activity set\'s after and the put back\'s after the put back',
  lab.skipUnless(SOURCE, ACTIVITY_SET, BACK, 'touch_activity_confighash_before', 'touch_activity_confighash_after', 'touch_activity_confighash_back'), () => {
    const read = (fixture: string) => {
      const q = reply(fixture);
      assert.deepEqual([q.errorCode, q.mime], ['200', CONFIGHASH]);
      return q.result;
    };
    const expected = [SOURCE, ACTIVITY_SET, BACK].map((s) => hashOf(setOf(s)));
    assert.equal(new Set(expected).size, 3, 'three different hashes');
    assert.deepEqual(['before', 'after', 'back'].map((w) => read(`touch_activity_confighash_${w}`)), expected);
  });

// ---- the bench run ----

interface Press { atMs: number; repeats: number; frame: { pulses: { mark: boolean; us: number }[] } }
interface Step { instruction: string; expect?: Expectation[]; presses: Press[]; verdicts: Verdict[]; problem?: string | null }

const run = (): Step[] => (JSON.parse(new TextDecoder().decode(lab.require_(RUN))) as { steps: Step[] }).steps;

let favouritesCache: Record<string, unknown> | undefined;
/** A set's documents with the favourites of the recorded full sync, as in 7.1. */
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
const names = (p: RunPress): string[] => [...new Set(p.frame.matches.map((m) => `${m.device} ${m.command}`))].sort();

/** The pauses between one step's presses, start to start, in whole milliseconds. */
const pausesOf = (presses: readonly { atMs: number }[]): number[] => presses.slice(1).map((p, i) => Math.round(p.atMs - presses[i]!.atMs));

test('the bench run carried the 8.2 test as derived, held 33 of 33 judged afresh by the activity set, every pause in its band, and nothing else was heard',
  lab.skipUnless(ACTIVITY_SET, FULL, RUN), () => {
    const definition = touch82Tests(configuration(ACTIVITY_SET))[0]!.definition;
    const steps = run();
    assert.deepEqual(steps.map((s) => s.instruction), definition.steps.map((s) => s.instruction));
    assert.deepEqual(steps.map((s) => s.expect ?? []), definition.steps.map((s) => JSON.parse(JSON.stringify(s.expect ?? [])) as Expectation[]));
    const book = bookOf(ACTIVITY_SET);
    const verdicts = steps.map((s, i) => judge({ expect: definition.steps[i]!.expect ?? [], presses: named(book, s.presses) }));
    assert.deepEqual([verdicts.flat().length, verdicts.flat().filter((v) => v.ok).length], [33, 33]);
    // Named afresh, the verdicts are the ones the monitor wrote at the bench, one for one.
    assert.deepEqual(verdicts.flat().map((v) => v.ok), steps.flatMap((s) => s.verdicts.map((v) => v.ok)));
    // Every press of the run is one an expectation took, in order: none in the unjudged Off, none beyond them.
    const heard = steps.map((s) => named(book, s.presses).map(names));
    assert.deepEqual(heard.map((h) => h.length), steps.map((s) => (s.expect ?? []).length));
    assert.deepEqual(heard.map((h) => h.length), [0, 4, 2, 5, 3, 3, 4, 5, 3, 4]);
    const expected = definition.steps.flatMap((s) => s.expect ?? []).map((e) => `${String(e.device)} ${e.command}`);
    assert.deepEqual(heard.flat().map((n, i) => n.includes(expected[i]!)), expected.map(() => true));
    // The presses the receiver cannot tie to one command: where a device's definition gives two commands one code,
    // the code is named by both. The Blu-ray's Menu and PopUp are one code, so the Menu key and the Pop Up Menu entry
    // are each named both; the Denon's PowerOn and PowerOff each share theirs with a main zone command of the same
    // name. Every other press is named by its expected command alone.
    assert.deepEqual(heard.flat().map((n, i) => [expected[i], n]).filter(([, n]) => n!.length > 1), [
      ['Blu-ray Menu', ['Blu-ray Menu', 'Blu-ray PopUp']],
      ['Blu-ray PopUp', ['Blu-ray Menu', 'Blu-ray PopUp']],
      ['Denon AV Receiver PowerOn', ['Denon AV Receiver PowerOn', 'Denon AV Receiver PowerOn-MainZone']],
      ['Denon AV Receiver PowerOff', ['Denon AV Receiver PowerOff', 'Denon AV Receiver PowerOff-MainZone']],
    ]);
    // The judged pauses, start to start, each inside the band the model gave: the start's own, the 10 s power on
    // delay of the LG TV and the start step of ours of 3 s, the switches, and Off.
    const timed = [1, 7, 8, 9];
    assert.deepEqual(timed.map((i) => pausesOf(steps[i]!.presses)), [[869, 10424, 3286], [968, 1040, 880, 2193], [880, 3312], [880, 768, 928]]);
    const bands = definition.steps.flatMap((s) => (s.expect ?? []).filter((e) => e.pauseMs !== undefined));
    assert.equal(bands.length, 12);
    assert.ok(steps.every((s) => s.problem === undefined || s.problem === null), 'no step marked');
  });

test('the control: judged by 8.1-device-back\'s documents no plan exists, and the heard start is none of the five recorded activities\' starts from Off',
  lab.skipUnless(SOURCE, ACTIVITY_SET, FULL, RUN), () => {
    const before = configuration(SOURCE);
    assert.throws(() => touch82Tests(before), /holds no Test Cinema/);
    const book = bookOf(SOURCE);
    const start = named(book, run()[1]!.presses);
    // Each recorded activity's start from Off as the model predicts it by the documents the remote held, as expectations.
    const scores = before.activities.map((a) => {
      const engine = new BenchTouchEngine(before, TIMING.low);
      engine.start(undefined);
      engine.idle();
      const expect: Expectation[] = engine.start(a.name).map((s) => ({ device: s.device, command: s.command }) as Expectation);
      const verdicts = judge({ expect, presses: start });
      return [a.name, verdicts.filter((v) => v.ok).length, verdicts.length];
    });
    assert.equal(scores.length, 5);
    assert.ok(scores.every(([, ok, of]) => ok! < of!), 'no recorded start holds whole');
    assert.deepEqual(scores.find(([n]) => n === 'Watch a Blu-ray'), ['Watch a Blu-ray', 2, 5]);
    // And by the activity set, its own start holds whole on the same presses.
    const c = configuration(ACTIVITY_SET);
    const engine = new BenchTouchEngine(c, TIMING.low);
    engine.start(undefined);
    engine.idle();
    const own = engine.start(TOUCH_8_2_ACTIVITY).map((s) => ({ device: s.device, command: s.command }) as Expectation);
    assert.ok(judge({ expect: own, presses: named(bookOf(ACTIVITY_SET), run()[1]!.presses) }).every((v) => v.ok));
  });

/**
 * Where 8.2's part of the monitor log ends: the put back's sync started at 12:53 UTC. The log is the live log of a
 * bench that kept running after 8.2, so frames of later use may follow in the same file and are left out here.
 */
const LOG_END = '2026-11-06T12:53:00';
/** The bench run's own end, from its file: frames after it and before `LOG_END` were heard outside the test. */
const RUN_END = '2026-11-06T12:50:21.400Z';

/** The monitor log's opening frames from `from` up to `LOG_END`, named by `book`, with their time on the receiver's clock. */
function logPresses(book: CodeBook, from: string): { at: string; names: string[] }[] {
  const out: { at: string; names: string[] }[] = [];
  for (const line of new TextDecoder().decode(lab.require_(MONITOR)).split('\n')) {
    if (!line.includes('"pulses"')) continue;
    const f = JSON.parse(line) as { at: string; repeatOf?: number | null; pulses: { mark: boolean; us: number }[] };
    if (f.at >= LOG_END) break;
    if (f.at < from || (f.repeatOf !== undefined && f.repeatOf !== null)) continue;
    out.push({ at: f.at, names: [...new Set(book.match(f.pulses).map((m) => `${m.device} ${m.command}`))].sort() });
  }
  return out;
}

test('the monitor log holds the run\'s 33 presses, then Test Cinema started again from Off and an Off, as the model predicts them after the test',
  lab.skipUnless(ACTIVITY_SET, FULL, RUN, MONITOR), () => {
    const book = bookOf(ACTIVITY_SET);
    const all = logPresses(book, '');
    const during = all.filter((p) => p.at <= RUN_END);
    const after = all.filter((p) => p.at > RUN_END);
    assert.deepEqual([all.length, during.length, after.length], [40, 33, 7]);
    // The log's presses during the run are the run's own, name for name.
    assert.deepEqual(during.map((p) => p.names), run().flatMap((s) => named(book, s.presses).map(names)));
    // After the test's Off the engine holds every device off: a start from Off and an Off then send these.
    const c = configuration(ACTIVITY_SET);
    const engine = new BenchTouchEngine(c, TIMING.low);
    engine.start(undefined);
    engine.idle();
    const predicted = [...engine.start(TOUCH_8_2_ACTIVITY), ...(engine.idle(), engine.start(undefined))].map((s) => `${s.device} ${s.command}`);
    assert.deepEqual(predicted, ['Blu-ray PowerOn', 'LG TV PowerOn', 'LG TV InputHdmi2', 'Blu-ray TopMenu', 'Blu-ray Stop', 'LG TV PowerOff', 'Blu-ray PowerOff']);
    assert.deepEqual(after.map((p, i) => p.names.includes(predicted[i]!)), predicted.map(() => true));
    // The start's pauses fall in the bands the test's own start was judged by.
    const ms = (at: string) => Date.parse(at);
    const pauses = after.slice(0, 4).slice(1).map((p, i) => Math.round(ms(p.at) - ms(after[i]!.at)));
    const bands = touch82Tests(c)[0]!.definition.steps[1]!.expect!.slice(1).map((e) => e.pauseMs!);
    assert.ok(pauses.every((p, i) => p >= bands[i]![0] && p <= bands[i]![1]), `pauses ${pauses.join(', ')}`);
    assert.ok(!after.some((p) => p.names.some((n) => n.startsWith('Denon'))), 'no Denon code');
  });
