/**
 * The whole test setup composed by us on a Harmony Touch, `todo-touch.md` 8.6, as it ran: every device and every
 * activity of the set the bench Touch held composed from a description with ids of ours, delivered in a sync, the ten
 * 7.1 bench tests run on it, and the remote's own put back.
 *
 * **What was run.** After commit `a50473a9`, the 8.6 preparation, and commit `72a96edc`, which moved the Touch bench
 * tests already run to `irtests/done/` so that the bench listed the ten 7.1 tests alone, in the order of the lab's
 * `work/touch-firmware/notes/8.6-preflight.md` section 7, each run read before the next, Off pressed before each sync,
 * the bench started afresh so the monitor wrote a new log:
 *
 * 1. `getconfighash` through the request rail, the remote holding `8.5-removal-back`;
 * 2. `touch-sync.ts --set 8.6-setup --commit` and `getconfighash`;
 * 3. the ten 7.1 bench tests, `irtests/touch-7-1-*.json` as they stood, on the Flirc monitor; three attempts were
 *    started again, see below;
 * 4. `touch-sync.ts --set 8.6-setup-back --commit` and `getconfighash`;
 * 5. one `touch-sync.ts --unchanged --commit`.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **The two sets.** The setup is `8.5-removal-back`'s six with ActivityList, DeviceList, MapList and ProtocolList
 *    composed by us and delivered under tags of ours, ProtocolList's content the source's, Context and Settings as they
 *    were, content and tags; its reader finds five activities shown and seven devices, under the same names, and no
 *    device or activity keeps an id of the source. The put back is `8.5-removal-back` exactly. How the setup is
 *    composed and compared with Logitech's documents field by field is `packages/corpus/test/touch/touch-setup-set.test.ts`.
 * 2. **The setup and the put back each answered the four 200 with the set's content and tags**, Context and Settings
 *    304 against their tags, the three favourites documents 304 with a tag of ours, the ten pictures 304, the finish
 *    200, and finished, over eight request lists, nothing handed up. The six went in one write, the run's
 *    `007-answers-request.txt`, 494602 characters, 16 chunks of 31000, for the setup and 567941, 19 chunks, for the put
 *    back, each replied 200 as a write. **That file is the kept write of the six**; the run's other writes of answers
 *    hold none of the six, only the favourites, the pictures and the finish, which is why `touch-device-set.ts --check
 *    --written` reported each of them as answering none of the four at the time; it now names and passes over such a file. The closing `--unchanged` run answered every
 *    request 304 or the finish.
 * 3. **The first request lists and the hash say what was committed.** The setup's run asked for the six with
 *    `8.5-removal-back`'s tags; the put back's run asked for the four with the setup's tags and Context and Settings
 *    with the tags both sets carry; the closing run with `8.5-removal-back`'s six. The hash was `8.5-removal-back`'s
 *    before, the setup's after it, three of its four tags new, and `8.5-removal-back`'s after the put back.
 * 4. **The ten 7.1 tests held 418 of 418 on the setup**, judged afresh here from each last attempt's pulses by the
 *    setup's own documents, which name every code the catalogue carried: 38, 30, 15, 33, 39, 32, 38, 37, 74 and 82,
 *    the verdicts the monitor wrote at the bench, one for one. The tests the runs carried are the files as they stand,
 *    and the files are what the setup derives, `touch-setup-predicted.test.ts`. So every start, switch and stop, the five favourites
 *    through the LG TV under an id of ours, every key of every activity's map, and every key of each device's own map
 *    in device mode went as on the set the setup was described from, every pause in its band.
 * 5. **What was heard that no expectation names**, in every judged step of the ten (the first Off of a test is not
 *    judged): in the Switch Box keys, step 4, one KPN ChannelPrev after Channel Down, unmarked in the run, the code
 *    that Switch Box's Previous key sends and no other key of its map; in device mode 1 of 2, step 7, one LG TV Rewind
 *    between Menu held and Previous held, where the person noted "drukte per ongeluk op << eerst", pressed << by
 *    accident first, << being Rewind, which the LG TV's own map gives as Rewind; in device mode 2 of 2, step 21, five
 *    of the Xbox's codes among the five expected, where the person noted they may have touched too many buttons but
 *    all were recorded properly, each the Xbox's own map's code for one of that step's five keys held. Nothing else,
 *    and every press of every attempt named by the setup's documents. Step numbers here count from 0, as the run
 *    files' steps do.
 * 6. **The monitor's log before the put back holds the runs and one Off between them.** Every press it heard lies
 *    inside one of the thirteen attempts, as many as the attempt's file holds, but two: the LG TV's and the Denon's
 *    power off between the favourites attempt started again and the next, which is what Off sends after Watch TV. It
 *    holds no code before the first test began.
 *
 * **Three attempts were started again and are superseded by the next attempt of the same test**: the favourites at
 * 09:14:13 UTC, 0 of 15, nothing heard at its second step, the codes a tap of NPO 1 sends with nothing running having
 * been heard while it was still at its first, the unjudged Off; Listen to Music's keys at 09:19:12, 1 of 32, the
 * receiver's input heard at the start and not its power or Plex's, which were heard during the Off before it; and at
 * 09:19:22, 0 of 32, stopped before its start, the receiver's power off and Plex's toggle heard at its first step, the
 * Off. **The person at the bench said they made a few mistakes here and
 * there**; no other cause is claimed for these attempts or for the unmarked ChannelPrev.
 *
 * **Reported by the person at the bench and held by no file**: after the setup, the look of the preflight's section 6
 * was right, "everything looks good": the activity list, the devices, Watch TV and Watch a Blu-ray opened; after the put
 * back everything was back. The run files' problem fields hold the two notes above and nothing of the look.
 *
 * **So a whole setup composed by this project, every device and every activity under an id of ours, was stored and
 * committed by a Touch and behaved as the set it was described from**, measured by the ten 7.1 tests at the receiver;
 * and the put back restored the set before, measured by the hash. What this does not show: the screens' pictures and
 * icons beyond the person's look, the engine's stored power state per device, which the new ids start without and Off
 * before the sync left off, the ten tests while an activity runs across a sync, and a setup that is not a description of
 * a set Logitech built.
 *
 * **The control** judges the Watch TV keys run by the tests the same description derives with Watch TV's first key
 * sending another command, the change `touch-setup-predicted.test.ts` makes, Home made to send the LG TV's Exit: the run then holds
 * 32 of 33, the one unheard being that Exit, where it holds 33 of 33 by the setup's own, so the 418 rests on the
 * setup's documents and the judging can fail. The hash after the setup is held against the put
 * back's, from which it differs. And "nothing else heard" is the search that finds the three steps above.
 *
 * **What would have falsified it**: a 200 for Context or Settings or a 304 for any of the four; a hash after the setup
 * other than its tags; a put back first list asking with any tag but the setup's for the four; an expectation of the
 * ten unheard or a pause out of its band; a code heard that the setup's documents do not name; a press in the log
 * outside the attempts other than the Off.
 *
 * **Sources checked first**: the lab's `8.6-preflight.md` and `8.6-land-brief.md`, `touch-removal-runs.test.ts` and
 * `touch-full-bench-runs.test.ts`, whose shape this follows, `touch-setup-predicted.test.ts`, `touchbench.ts` and `families/harmony-touch/engine.ts`, and
 * `syncTouch` in `packages/corpus/src/touchsync.ts` for what a run's folder keeps. Logitech's client was not consulted:
 * the remote runs its own engine and screens and the answers are ours. **Which architectures**: the Harmony Touch on
 * firmware 4.15.330, one unit, one committed run of each set; its firmware reports 17 and Logitech's templates file it
 * under 18.
 *
 * The reads and the sets hold tags, the account's numbers and the household's address: this file asserts equalities,
 * counts and shapes and prints none of them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

// The Node entry, for the fonts, the icons, the deflate and the SHA-256 the core asks its loader for.
import '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';
import * as lab from '@harmony/lab';
import {
  CONFIGHASH, FINISHED, OURS, WRITE, answersWritten, commands, hasTag, kind, list, records, reply, resource, sessions, written,
  type Request_,
} from '@harmony/testkit/touch-recording';

import { CodeBook } from '../../src/irmonitor.ts';
import { judge, testDefinitions, type Expectation, type RunPress, type TestDefinition, type Verdict } from '../../src/irsession.ts';
import { TOUCH_8_6_TESTS } from '../../experiments/touchsetuptest.ts';
import { BenchTouchEngine, TIMING, touch71Configuration, touch71Tests } from '../../src/touchbench.ts';

/** `8.5-removal-back`: what the bench Touch held before 8.6, what the setup is described from and what the put back delivers. */
const SOURCE = 'touch_removal_set_back';
const SET = 'touch_setup_set';
const BACK = 'touch_setup_set_back';
const FULL = 'touch_full_sync_recording';
const MONITOR = 'touch_8_6_monitor';
const DESCRIPTION = fileURLToPath(new URL('../../../corpus/touch-setups/8.6-test-setup.json', import.meta.url));
const IRTESTS = fileURLToPath(new URL('../../irtests/', import.meta.url));

/** One answer of a set as the lab keeps it, `set.json`. */
interface SetAnswer { uri: string; 'body-type': string; resource: unknown; etag: string }
const setOf = (fixture: string): SetAnswer[] => (JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as { answers: SetAnswer[] }).answers;
const byName = (set: readonly SetAnswer[], name: string): SetAnswer => set.find((a) => resource(a.uri) === name)!;
const text = (fixture: string): string => new TextDecoder().decode(lab.require_(fixture));

/** The four documents a setup composes, the ones a device or an activity is named in. */
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
  { prefix: 'touch_setup_sync_1_', set: SET, before: BACK, length: 494602, chunks: 16 },
  { prefix: 'touch_setup_sync_2_', set: BACK, before: SET, length: 567941, chunks: 19 },
] as const;
const CLOSING = 'touch_setup_unchanged_';
const ALL_RUNS = [...SET_RUNS.map((r) => r.prefix), CLOSING];

/** The eight request lists every committed run of 8.6 handed out, as every run of 8.2 to 8.5 did. */
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

/** Which set's tag a request of a first list carries: the setup's alone, the one before it, or another. */
function whose(q: Request_): string {
  const d = resource(q.uri);
  const setup = byName(setOf(SET), d).etag;
  const before = byName(setOf(SOURCE), d).etag;
  if (q.etag === setup && q.etag !== before) return 'setup';
  if (q.etag === before) return 'before';
  return 'another';
}

test('the setup is 8.5-removal-back with the four documents that name a device or an activity composed by us under tags of ours, every id ours, and the put back is 8.5-removal-back',
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
    // The definition list's content is the source's, carried whole from the catalogue, under a tag of ours.
    assert.ok(isDeepStrictEqual(byName(forward, 'ProtocolList').resource, byName(source, 'ProtocolList').resource));
    for (const d of ['ActivityList', 'DeviceList', 'MapList']) assert.ok(!isDeepStrictEqual(byName(forward, d).resource, byName(source, d).resource), d);
    // What the reader finds: the same five activities shown and seven devices by name, none under an id of the source.
    const read = (set: readonly SetAnswer[]) => harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(set as unknown as harmonyTouch.SyncAnswer[]));
    const ours = read(forward);
    const theirs = read(source);
    const shown = (c: harmonyTouch.Configuration) => c.activities.filter((a) => !a.hidden).map((a) => a.name);
    assert.deepEqual(shown(ours), shown(theirs));
    assert.deepEqual([shown(ours).length, ours.devices.length], [5, 7]);
    assert.deepEqual(ours.devices.map((d) => d.name).sort(), theirs.devices.map((d) => d.name).sort());
    const sourceIds = new Set([...theirs.devices.map((d) => d.id), ...theirs.activities.map((a) => a.id)]);
    assert.deepEqual([...ours.devices.map((d) => d.id), ...ours.activities.map((a) => a.id)].filter((id) => sourceIds.has(id)), []);
  });

// ---- the committed runs ----

for (const r of SET_RUNS) {
  test(`${r.prefix}: the four answered 200 with the set's content and tags, Context and Settings 304, the finish 200, over eight request lists`,
    lab.skipUnless(r.set, r.before, ...runFiles(r.prefix)), () => {
      const sent = delivered(setOf(r.set), setOf(r.before));
      assert.deepEqual(sent.map((a) => resource(a.uri)), FOUR);
      checkRun(r.prefix, r.prefix, sent);
    });

  test(`${r.prefix}: the six went in one write of ${r.length} characters, ${r.chunks} chunks, replied 200 as a write, and no other write of the run holds any of the six`,
    lab.skipUnless(`${r.prefix}answers_1`, `${r.prefix}reply_1`, ...EIGHT_ANSWERED.map((n) => `${r.prefix}answers_${n}`)), () => {
      const length = text(`${r.prefix}answers_1`).length;
      assert.deepEqual([length, chunks(length)], [r.length, r.chunks]);
      const q = reply(`${r.prefix}reply_1`);
      assert.deepEqual([q.errorCode, q.mime], ['200', WRITE]);
      // The kept write is `007-answers-request.txt`, the answers to the first list; the others answer the favourites,
      // the pictures and the finish, so a check of the six against them finds none.
      const documents = (n: number) => written(`${r.prefix}answers_${n}`).filter((a) => a.uri.startsWith('harmony://')).length;
      assert.deepEqual(EIGHT_ANSWERED.map(documents), [6, 0, 0, 0, 0, 0]);
    });
}

test('the closing run answered every request 304 or the finish, over eight lists', lab.skipUnless(...runFiles(CLOSING)), () => {
  checkRun(CLOSING, 'the closing run', []);
});

test('the first lists: the set before\'s six at the setup, the four with the setup\'s tags at the put back, the set before\'s six at the close',
  lab.skipUnless(SOURCE, SET, ...ALL_RUNS.map((p) => `${p}list_1`), ...ALL_RUNS.flatMap((p) => [3, 4, 5].map((n) => `${p}list_${n}`))), () => {
    const source = setOf(SOURCE);
    const asked = ALL_RUNS.map((p) => list(`${p}list_1`));
    for (const l of asked) assert.deepEqual(l.map((q) => q.uri), source.map((a) => a.uri));
    assert.deepEqual(asked.map((l) => l.map((q) => `${resource(q.uri)} ${whose(q)}`)), [
      source.map((a) => `${resource(a.uri)} before`),
      source.map((a) => `${resource(a.uri)} ${FOUR.includes(resource(a.uri)) ? 'setup' : 'before'}`),
      source.map((a) => `${resource(a.uri)} before`),
    ]);
    for (const p of ALL_RUNS) {
      assert.deepEqual([3, 4, 5].map((n) => list(`${p}list_${n}`).map((q) => hasTag(q))), [[false], [false], [false]], p);
    }
  });

test('the configuration hash was the set before\'s before, the setup\'s after it, three of its four tags new, and the set before\'s after the put back',
  lab.skipUnless(SOURCE, SET, BACK, 'touch_setup_confighash_before', 'touch_setup_confighash_after', 'touch_setup_confighash_back'), () => {
    const expected = [BACK, SET, BACK].map((s) => hashOf(setOf(s)));
    assert.equal(hashOf(setOf(SOURCE)), expected[0]);
    assert.notEqual(expected[1], expected[0], 'the control: the setup moves the hash');
    assert.deepEqual(['before', 'after', 'back'].map((w) => hashRead(`touch_setup_confighash_${w}`)), expected);
    // Three of the four hashed documents are among the four delivered; Context is not.
    assert.deepEqual(HASHED.filter((d) => byName(setOf(SET), d).etag !== byName(setOf(BACK), d).etag), ['ActivityList', 'DeviceList', 'ProtocolList']);
  });

// ---- the bench runs ----

/** The ten last attempts, by fixture, each with the test it ran, in the order they ran. */
const RUNS: readonly (readonly [string, string])[] = [
  ['touch_8_6_starts', 'touch-7-1-1-starts'],
  ['touch_8_6_switches', 'touch-7-1-2-switches'],
  ['touch_8_6_favourites', 'touch-7-1-3-favourites'],
  ['touch_8_6_watch_tv_keys', 'touch-7-1-4-watch-tv-keys'],
  ['touch_8_6_blu_ray_keys', 'touch-7-1-5-watch-a-blu-ray-keys'],
  ['touch_8_6_music_keys', 'touch-7-1-6-listen-to-music-keys'],
  ['touch_8_6_switch_box_keys', 'touch-7-1-7-switch-box-keys'],
  ['touch_8_6_game_keys', 'touch-7-1-8-play-a-game-keys'],
  ['touch_8_6_device_mode_1', 'touch-7-1-9a-device-mode'],
  ['touch_8_6_device_mode_2', 'touch-7-1-9b-device-mode'],
];
/** The three attempts started again, each superseded by the next attempt of the same test. */
const SUPERSEDED: readonly (readonly [string, string, string])[] = [
  ['touch_8_6_favourites_superseded', 'touch-7-1-3-favourites', 'touch_8_6_favourites'],
  ['touch_8_6_music_keys_superseded_1', 'touch-7-1-6-listen-to-music-keys', 'touch_8_6_music_keys_superseded_2'],
  ['touch_8_6_music_keys_superseded_2', 'touch-7-1-6-listen-to-music-keys', 'touch_8_6_music_keys'],
];
const ATTEMPTS = [...RUNS.map(([f]) => f), ...SUPERSEDED.map(([f]) => f)];
const NEEDS = lab.needing(lab.skipUnless(SET, FULL, ...RUNS.map(([f]) => f)));

interface Press { atMs: number; repeats: number; frame: { pulses: { mark: boolean; us: number }[] } }
interface Step { instruction: string; expect?: Expectation[]; presses: Press[]; verdicts: Verdict[]; problem?: string | null }
interface Run { startedAt: string; endedAt: string; steps: Step[] }

const runCache = new Map<string, Run>();
const runOf = (fixture: string): Run => {
  if (!runCache.has(fixture)) runCache.set(fixture, JSON.parse(text(fixture)) as Run);
  return runCache.get(fixture)!;
};

let favouritesCache: Record<string, unknown> | undefined;
/** The recorded full sync's favourites documents by address, which no set of 8.6 touches, as 7.1 reads them. */
function recordedFavourites(): Record<string, unknown> {
  favouritesCache ??= Object.fromEntries(answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi'))
    .filter((a) => a.uri.startsWith('content://')).map((a) => [a.uri, a.resource]));
  return favouritesCache;
}
/** A set's six with the recorded favourites, as the bench tests read them. */
const configurationOf = (answers: readonly SetAnswer[]): harmonyTouch.Configuration => touch71Configuration({ answers: [...answers] }, recordedFavourites());
let setupCache: harmonyTouch.Configuration | undefined;
const setup = (): harmonyTouch.Configuration => (setupCache ??= configurationOf(setOf(SET)));
const definitionsOf = (c: harmonyTouch.Configuration) => touch71Tests(c);
const plain = (d: TestDefinition): TestDefinition => JSON.parse(JSON.stringify(d)) as TestDefinition;

let bookCache: CodeBook | undefined;
/** The setup's own documents as a code book, the way the monitor names a Touch code. */
const book = (): CodeBook => (bookCache ??= new CodeBook((name) => (name === SET ? lab.require_(SET) : undefined), [], undefined, [SET]));

/** A run's presses named afresh from their pulses. */
function named(presses: readonly Press[]): RunPress[] {
  return presses.map((p) => {
    const matches = book().match(p.frame.pulses);
    return { atMs: p.atMs, repeats: p.repeats, frame: { ...p.frame, matches, bare: matches.length > 0 && !matches.some((m) => m.opening) } } as unknown as RunPress;
  });
}
const names = (p: RunPress): string[] => [...new Set(p.frame.matches.map((m) => `${m.device} ${m.command}`))];

/** Every step of a run judged against a definition's steps by index. */
const verdictsOf = (run: Run, definition: TestDefinition): Verdict[][] =>
  run.steps.map((s, i) => judge({ expect: definition.steps[i]!.expect ?? [], presses: named(s.presses) }));
const score = (vs: Verdict[][]): [number, number] => [vs.flat().filter((v) => v.ok).length, vs.flat().length];

/** The presses of a step that no expectation took, walking the expectations in order as the judge does, 7.1's. */
function extras(expect: readonly Expectation[], presses: readonly RunPress[]): string[] {
  const taken = new Set<number>();
  let cursor = 0;
  for (const want of expect) {
    const devices = (typeof want.device === 'string' ? [want.device] : want.device).map((d) => d.toLowerCase());
    let found = 0;
    for (let i = cursor; i < presses.length && found < (want.times ?? 1); i += 1) {
      const fits = presses[i]!.frame.matches.some((m) => devices.includes(m.device.toLowerCase()) && m.command?.toLowerCase() === want.command?.toLowerCase());
      if (!fits) continue;
      found += 1;
      taken.add(i);
      cursor = i + 1;
    }
  }
  return presses.flatMap((p, i) => (taken.has(i) || p.frame.matches.length === 0 ? [] : [names(p)[0]!]));
}

test('the ten last attempts carried the 7.1 tests as they stand, which the setup derives, and held 418 of 418 judged afresh, the verdicts the bench wrote',
  NEEDS, () => {
    const definitions = definitionsOf(setup());
    assert.deepEqual(definitions.map((d) => d.id), [...TOUCH_8_6_TESTS]);
    assert.deepEqual(RUNS.map(([, id]) => id), [...TOUCH_8_6_TESTS]);
    const onDisk = testDefinitions(IRTESTS).concat(testDefinitions(`${IRTESTS}done/`)).filter((one) => one.id.startsWith('touch-7-1-'));
    const scores: [number, number][] = [];
    for (const [fixture, id] of RUNS) {
      const definition = definitions.find((d) => d.id === id)!.definition;
      assert.deepEqual(plain(definition), onDisk.find((d) => d.id === id)!.definition, `${id}: the file as it stands`);
      const run = runOf(fixture);
      assert.deepEqual(run.steps.map((s) => s.instruction), definition.steps.map((s) => s.instruction), id);
      assert.deepEqual(run.steps.map((s) => s.expect ?? []), plain(definition).steps.map((s) => s.expect ?? []), id);
      const vs = verdictsOf(run, definition);
      // Named afresh, the verdicts are the ones the monitor wrote at the bench, one for one.
      assert.deepEqual(vs.flat().map((v) => v.ok), run.steps.flatMap((s) => s.verdicts.map((v) => v.ok)), id);
      scores.push(score(vs));
    }
    assert.deepEqual(scores, [[38, 38], [30, 30], [15, 15], [33, 33], [39, 39], [32, 32], [38, 38], [37, 37], [74, 74], [82, 82]]);
    assert.equal(scores.reduce((n, [ok]) => n + ok, 0), 418);
    // The ten ran in 7.1's order, one after the other.
    const times = RUNS.map(([f]) => [runOf(f).startedAt, runOf(f).endedAt] as const);
    times.forEach(([from, to], i) => assert.ok(from < to && (i === 0 || times[i - 1]![1] < from), RUNS[i]![0]));
  });

test('nothing heard that no expectation names but one KPN ChannelPrev in the Switch Box keys, unmarked, and the presses in the two steps the person marked, each a code its key gives',
  NEEDS, () => {
    const c = setup();
    const definitions = definitionsOf(c);
    const found: string[] = [];
    let unnamed = 0;
    for (const [fixture, id] of RUNS) {
      const definition = definitions.find((d) => d.id === id)!.definition;
      runOf(fixture).steps.forEach((s, step) => {
        const presses = named(s.presses);
        unnamed += presses.filter((p) => p.frame.matches.length === 0).length;
        // The first Off of a test is not judged: it switches off whatever ran before the test.
        if (step === 0) return;
        for (const extra of extras(definition.steps[step]!.expect ?? [], presses)) found.push(`${id} ${step} ${extra}`);
      });
    }
    assert.deepEqual(found, [
      'touch-7-1-7-switch-box-keys 4 KPN ChannelPrev',
      'touch-7-1-9a-device-mode 7 LG TV Rewind',
      'touch-7-1-9b-device-mode 21 Xbox SkipBack',
      'touch-7-1-9b-device-mode 21 Xbox PageUp',
      'touch-7-1-9b-device-mode 21 Xbox PageDown',
      'touch-7-1-9b-device-mode 21 Xbox SkipForward',
      'touch-7-1-9b-device-mode 21 Xbox SkipBack',
    ]);
    assert.equal(unnamed, 0, 'every press of the ten named by the setup\'s documents');

    // The two marks, and only those two, at the steps the extra presses are in.
    const marked = RUNS.flatMap(([fixture, id]) => runOf(fixture).steps.map((s, step) => ({ id, step, s })).filter((x) => x.s.problem !== undefined && x.s.problem !== null && x.s.problem !== ''));
    assert.deepEqual(marked.map((x) => `${x.id} ${x.step}`), ['touch-7-1-9a-device-mode 7', 'touch-7-1-9b-device-mode 21']);
    assert.match(marked[0]!.s.problem!, /per ongeluk op << eerst/);
    assert.match(marked[1]!.s.problem!, /too many buttons/);

    // Switch Box: KPN ChannelPrev is what its Previous key sends, and no other key or entry of its map.
    const box = c.activities.find((a) => a.name === 'Switch Box')!.map!;
    const sendsChannelPrev = (b: harmonyTouch.ReadButton) => [b.press, b.longPress].some((a) => a?.kind === 'command' && a.command?.name === 'ChannelPrev');
    assert.deepEqual([...box.keys.filter(sendsChannelPrev).map((b) => b.key), ...[...box.entries.values()].filter(sendsChannelPrev).map((b) => b.label)], ['PrevChannel']);
    const engine = new BenchTouchEngine(c, TIMING.low);
    engine.idle();
    engine.start('Switch Box');
    engine.idle();
    assert.deepEqual(engine.key('PrevChannel', 'tap').map((s) => `${s.device} ${s.command}`), ['KPN ChannelPrev']);

    // Device mode 1 of 2, step 7: << is Rewind, and the LG TV's own map sends Rewind for it.
    const device = new BenchTouchEngine(c, TIMING.low);
    device.idle();
    const own = (name: string, key: string, how: 'tap' | 'hold') => device.key(key, how, name).map((s) => `${s.device} ${s.command}`);
    assert.deepEqual(own('LG TV', 'Rewind', 'tap'), ['LG TV Rewind']);

    // Device mode 2 of 2, step 21: the five expected in order among ten, every one of the ten a code the Xbox's own map
    // gives for one of the step's five keys held.
    const step21 = runOf('touch_8_6_device_mode_2').steps[21]!;
    assert.deepEqual(step21.instruction.split(' → '), ['Button: Previous, hold 1 s', 'Button: Channel Up, hold 1 s', 'Button: Channel Down, hold 1 s', 'Button: Rewind, hold 1 s', 'Button: Fast Forward, hold 1 s']);
    const held = ['PrevChannel', 'ChannelUp', 'ChannelDown', 'Rewind', 'FastForward'].map((k) => own('Xbox', k, 'hold'));
    assert.deepEqual(held, [['Xbox Back'], ['Xbox PageUp'], ['Xbox PageDown'], ['Xbox SkipBack'], ['Xbox SkipForward']]);
    const heard = named(step21.presses).map((p) => names(p).find((n) => n.startsWith('Xbox '))!);
    assert.equal(heard.length, 10);
    assert.ok(heard.every((n) => held.flat().includes(n)));
  });

test('the three attempts started again: the same tests, 0 of 15, 1 of 32 and 0 of 32, each before the next attempt of its test, and what each heard',
  lab.needing(lab.skipUnless(SET, FULL, ...SUPERSEDED.flatMap(([f, , next]) => [f, next]))), () => {
    const c = setup();
    const definitions = definitionsOf(c);
    const scores = SUPERSEDED.map(([fixture, id, next]) => {
      const definition = definitions.find((d) => d.id === id)!.definition;
      const run = runOf(fixture);
      assert.deepEqual(run.steps.map((s) => s.expect ?? []), plain(definition).steps.map((s) => s.expect ?? []), fixture);
      assert.ok(run.endedAt < runOf(next).startedAt, `${fixture} before ${next}`);
      const vs = verdictsOf(run, definition);
      assert.deepEqual(vs.flat().map((v) => v.ok), run.steps.flatMap((s) => s.verdicts.map((v) => v.ok)), fixture);
      return score(vs);
    });
    assert.deepEqual(scores, [[0, 15], [1, 32], [0, 32]]);
    // Presses per step, and what they were. Favourites: the codes a tap of NPO 1 gives with nothing running, Watch TV's
    // start and 0 0 1, heard while the run was at its first step, the unjudged Off, and nothing at its second.
    const heard = (fixture: string) => runOf(fixture).steps.map((s) => named(s.presses).map((p) => names(p).sort()[0]!));
    assert.deepEqual(heard('touch_8_6_favourites_superseded'), [
      ['LG TV PowerOn', 'Denon AV Receiver PowerOn', 'Denon AV Receiver InputTVAudio', 'LG TV InputHdmi1', 'LG TV 0', 'LG TV 0', 'LG TV 1'], [], [], [], [], [], [],
    ]);
    // Those seven are the test's own expectations for NPO 1 tapped with nothing running, its second step, in order.
    const npo1 = definitions.find((d) => d.id === 'touch-7-1-3-favourites')!.definition.steps[1]!;
    assert.match(npo1.instruction, /NPO 1/);
    assert.deepEqual((npo1.expect ?? []).flatMap((e) => Array<string>(e.times ?? 1).fill(`${String(e.device)} ${e.command}`)), heard('touch_8_6_favourites_superseded')[0]);
    // Listen to Music, first: the receiver's power and Plex's in the Off, its input at the start, nothing after.
    assert.deepEqual(heard('touch_8_6_music_keys_superseded_1'), [['Denon AV Receiver PowerOn', 'Plex PowerToggle'], ['Denon AV Receiver InputMediaPlayer'], [], [], [], [], [], [], []]);
    // Listen to Music, second: the receiver's power off and Plex's toggle in the Off, nothing after.
    assert.deepEqual(heard('touch_8_6_music_keys_superseded_2'), [['Denon AV Receiver PowerOff', 'Plex PowerToggle'], [], [], [], [], [], [], [], []]);
    assert.ok(SUPERSEDED.every(([f]) => runOf(f).steps.every((s) => s.problem === undefined || s.problem === null || s.problem === '')), 'no step marked');
  });

/** Where 8.6's part of the monitor log ends: the put back's sync started at 09:32 UTC. */
const LOG_END = '2026-11-07T09:32:00';

/** A monitor log's opening frames up to `end`, named by the setup's book. */
function logPresses(end: string): { at: string; names: string[] }[] {
  const out: { at: string; names: string[] }[] = [];
  for (const line of text(MONITOR).split('\n')) {
    if (!line.includes('"pulses"')) continue;
    const f = JSON.parse(line) as { at: string; repeatOf?: number | null; pulses: { mark: boolean; us: number }[] };
    if (f.at >= end) break;
    if (f.repeatOf !== undefined && f.repeatOf !== null) continue;
    out.push({ at: f.at, names: [...new Set(book().match(f.pulses).map((m) => `${m.device} ${m.command}`))].sort() });
  }
  return out;
}

test('the monitor log before the put back holds the thirteen attempts\' presses, as many as each file holds, and one Off between the favourites attempts, every press named',
  lab.needing(lab.skipUnless(SET, FULL, MONITOR, ...ATTEMPTS)), () => {
    const all = logPresses(LOG_END);
    assert.ok(all.every((p) => p.names.length > 0), 'every press named');
    const inside = (p: { at: string }) => ATTEMPTS.find((f) => p.at >= runOf(f).startedAt && p.at <= runOf(f).endedAt);
    assert.deepEqual(ATTEMPTS.map((f) => all.filter((p) => inside(p) === f).length), ATTEMPTS.map((f) => runOf(f).steps.reduce((n, s) => n + s.presses.length, 0)));
    const outside = all.filter((p) => inside(p) === undefined);
    assert.deepEqual(outside.map((p) => p.names[0]), ['LG TV PowerOff', 'Denon AV Receiver PowerOff']);
    assert.ok(outside.every((p) => p.at > runOf('touch_8_6_favourites_superseded').endedAt && p.at < runOf('touch_8_6_favourites').startedAt));
    // That is what Off sends after Watch TV, which the attempt's tap of NPO 1 started.
    const engine = new BenchTouchEngine(setup(), TIMING.low);
    engine.idle();
    engine.start('Watch TV');
    engine.idle();
    assert.deepEqual(engine.start(undefined).map((s) => `${s.device} ${s.command}`), ['LG TV PowerOff', 'Denon AV Receiver PowerOff']);
    // Nothing before the first test.
    assert.ok(all[0]!.at >= runOf(RUNS[0]![0]).startedAt);
  });

/** The source's answers with the four documents of `description` composed onto its base, as `touch-setup-predicted.test.ts` builds them. */
function composedAnswers(description: harmonyTouch.TouchSetup): SetAnswer[] {
  const answers = setOf(SOURCE);
  const docs = harmonyTouch.documentsOfAnswers(answers as unknown as harmonyTouch.SyncAnswer[]);
  const ours = harmonyTouch.composeTouchSetup(harmonyTouch.setupBaseOf(docs), description, harmonyTouch.catalogueOfSet(docs));
  return answers.map((a) => {
    const key = harmonyTouch.documentKeyOf(a.uri);
    return key !== undefined && key in ours ? { ...a, resource: ours[key as keyof typeof ours] } : a;
  });
}

test('the control: by the tests the description gives with Watch TV\'s first key sending another command, the Watch TV keys run fails where it sent what the setup states',
  lab.needing(lab.skipUnless(SOURCE, SET, FULL, 'touch_8_6_watch_tv_keys')), () => {
    const description = (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { setup: harmonyTouch.TouchSetup }).setup;
    // Unchanged, the description composes the set the remote was given, document for document.
    assert.deepEqual(composedAnswers(description).map((a) => a.resource), setOf(SET).map((a) => a.resource));
    const [first, ...rest] = description.activities;
    assert.equal(first!.name, 'Watch TV');
    const buttons = [...first!.buttons!];
    const other = buttons.find((b) => 'command' in b.press && 'command' in buttons[0]!.press && b.press.command !== buttons[0]!.press.command)!;
    buttons[0] = { ...buttons[0]!, press: other.press };
    const changed = definitionsOf(configurationOf(composedAnswers({ ...description, activities: [{ ...first!, buttons }, ...rest] })));
    const run = runOf('touch_8_6_watch_tv_keys');
    const vs = verdictsOf(run, changed.find((d) => d.id === 'touch-7-1-4-watch-tv-keys')!.definition);
    assert.deepEqual(score(vs), [32, 33]);
    // The one that fails is the changed key's: the command it now states, unheard where the run sent the setup's.
    assert.deepEqual(vs.flat().filter((v) => !v.ok).map((v) => v.expected), ['lg tv · Exit']);
    assert.deepEqual([first!.buttons![0]!.press, other.press].map((p) => ('command' in p ? p.command : undefined)), ['Home', 'Exit']);
    assert.deepEqual(score(verdictsOf(run, definitionsOf(setup()).find((d) => d.id === 'touch-7-1-4-watch-tv-keys')!.definition)), [33, 33]);
  });
