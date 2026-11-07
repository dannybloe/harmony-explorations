/**
 * The test setup built from nothing on a Harmony Touch, `todo-touch.md` 9.4, as it ran: the six documents and our
 * background written in 9.1 from a setup file, the archive of the catalogue through our readers, our rhythm table and a
 * description of the account, with no Logitech document as input, delivered in a sync and committed, used with one 7.1
 * bench test, and put back.
 *
 * **What was run.** After commit `8d4d004b`, the 9.3 and 9.4 preparation, and commit `81526d34`, which moved nine of the
 * ten 7.1 tests to `irtests/done/` so that the bench listed test 1 alone, in the order of the lab's
 * `work/touch-firmware/notes/9.4-preflight.md` section 7, each run read before the next, Off pressed before each sync,
 * the bench started afresh so the monitor wrote a new log:
 *
 * 1. `getconfighash` through the request rail, the remote holding what 9.2's put back committed;
 * 2. `touch-sync.ts --set 9.1-nothing --commit` and `getconfighash`;
 * 3. the 7.1 test 1, `irtests/touch-7-1-1-starts.json`, on the Flirc monitor; two attempts were started again, below;
 * 4. `touch-sync.ts --set 9.1-nothing-back --commit` and `getconfighash`;
 * 5. one `touch-sync.ts --unchanged --commit`.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **The two sets.** `9.1-nothing` is six documents and two pictures, our background and its twin, every one under a
 *    tag of ours and none under a tag the remote held; its reader finds five activities shown, seven devices and five
 *    definitions. `9.1-nothing-back` is the six of 8.6's put back, content and tags, which are the six 9.2's put back
 *    delivered. How the set is built, that no field of it is carried from a Logitech document, and how it compares with
 *    8.6's set field by field, are `packages/corpus/test/touch-nothing-set.test.ts` and `touch-attribution.test.ts`.
 * 2. **The forward run answered all six 200 with the set's content and tags, the three favourites documents 304 with a
 *    tag of ours, our background and its twin 200 with the set's pictures and tags, the eight logos 304, the finish
 *    200**, over eight request lists, nothing handed up, `finished`. The six went in one write of 381470 characters, 13
 *    chunks of 31000, the two pictures with the logos' answers in one of 5288, one chunk, each replied 200 as a write;
 *    no other write of the run holds any of the six. The rehearsal on the fake remote,
 *    `packages/corpus/test/touch-nothing-run.test.ts`, predicted every one of these answers and both sizes.
 * 3. **The put back answered the six 200 with its content and tags, everything else 304, the finish 200**, over eight
 *    lists, nothing handed up, `finished`; the six in 571577 characters, 19 chunks, as 8.6's put back and 9.2's. The
 *    closing `--unchanged` run answered every request 304 or the finish.
 * 4. **The first lists and the hash say what was committed.** The forward run asked for the six with the put back's tags;
 *    the put back asked for all six with the forward set's tags, so the remote had stored all six of ours; the closing
 *    run asked with the put back's tags. The hash was the put back's before, the forward set's after it, all four of its
 *    tags new, and the put back's after the put back.
 * 5. **The pictures.** The forward run's picture list asked for our background and its twin, at our store's addresses,
 *    without a tag, which is what a remote asks for a picture it does not hold, and for the eight logos with the tags 9.2's
 *    closing run sent; so the screens asked for the background our Settings names. The put back's picture list and the
 *    closing run's are 9.2's closing run's, address for address and tag for tag: the person's two backgrounds were asked
 *    again with the tags the remote held before our set, so they were carried across our set's commit, as 9.2 measured
 *    for an empty set. **Our background was delivered at an address of ours**, which nothing fetches from: the remote
 *    asked the program answering the sync for it, and stored it.
 * 6. **The bench test, reduced by the person's decision to test 1 of 7.1**, `touch-7-1-1-starts`, every activity
 *    started from off and ended. **The argument for one test**: what 9.1 changes against 8.6, which held 418 of 418, is
 *    the infrared definitions, written from our rhythm table where 8.6 carried Logitech's, and the device records
 *    written from the archive; which code sits under which key and activity is 8.6's structure, already run. Every code
 *    of one family shares its rhythm and differs only in its data, so a code heard right per device shows its family's
 *    definition rendered on the remote, and test 1 hears all seven devices and all five families the set holds, 38
 *    expectations. **It held 38 of 38**, judged afresh here from the last attempt's pulses by the forward set's own
 *    documents, which render every code from our definitions, the verdicts the monitor wrote at the bench, one for one.
 *    **This is the first time the remote played definitions of ours for these five families**: Toshiba 32 Bit, heard from
 *    the LG TV, the KPN, the Plex and the Switch; Sharp 15 Bit 2 and Sharp 48 Bit 2, both the Denon's, its power codes
 *    and its inputs; Sony 20 Bit, the Blu-ray; and Microsoft 30 Bit, the Xbox. The one definition of ours the remote had
 *    played before is 8.1's Sony 12 Bit, 15 of 15, a family this set does not hold.
 * 7. **What was heard that no expectation names**, in every step of the last attempt: no code. In the last Off, after the
 *    Xbox's power off, the last code that Off sends, came nine short frames of 5 to 17 edges, where every code the test
 *    heard has 31 or more, each marked unreadable by the monitor at the bench, and neither the set's documents nor 8.6's name
 *    any of them; what made them is not recorded. Every other press of the attempt is named by the set's documents.
 * 8. **The monitor's log before the put back** opens with the first attempt, so nothing was heard during the forward
 *    sync, and holds every press of the three attempts, as many as each attempt's file holds, 2, 19 and 47. Outside them:
 *    after the first attempt stopped, the rest of Watch TV's start, the Denon's input and the LG TV's, then what Off
 *    sends after Watch TV; and after the last attempt and before the put back, the codes the set gives Listen to Music's
 *    start and end, twice over, three frames among them unnamed. The person's photograph of Listen to Music's "Powering
 *    off" screen is consistent with those; no cause is claimed for them.
 *
 * **Two attempts were started again and are superseded by the last**: at 13:25:14 UTC, 0 of 38, stopped after its
 * first step, the unjudged Off, while the monitor heard the first two codes of Watch TV's start, the rest following after
 * the attempt had stopped; and at 13:25:37, 14 of 38, stopped after step 4, every expectation it reached held. No cause
 * is claimed for either.
 *
 * **The Xbox's toggle bit is not checked.** Our definition states none where Logitech's alternates a bit from press to
 * press, and test 1 sends no Xbox code twice in a row, so nothing here could show whether a console acts on a second
 * press of the same key.
 *
 * **Reported by the person at the bench and held by no file but two photographs**, `touch_9_4_activities_photo` and
 * `touch_9_4_powering_off_photo`, which this file names and no document embeds:
 *
 * * **a green band at the foot of every screen**, photographed on the activity list. Our background is dark blue with a
 *   bright yellow band across its foot, `ourBackground` in the codec's `fromnothing.ts`, and the screens draw a dark
 *   footer over the foot, so the band seen through it is the reading: consistent with the picture's design, and nothing
 *   else was compared;
 * * **the "Powering off" screen's help text runs past the right edge**, "Point the remote at your devices while th...",
 *   photographed. After the put back, on Logitech's documents, the person saw the same, so it is the firmware's layout
 *   and not a difference of the set;
 * * the entry icons, the favourites page and the background picker were not reported.
 *
 * **Scored against 9.1's four predictions** (`src/touch91.ts`): our background shown **held**, by the band; no icon on
 * any entry **not checked**; the seven field Context accepted **held**, every run committed and the remote acted on the
 * set; the person's background out of the picker **not checked**.
 *
 * **So a configuration built by this project from nothing, every device record, every definition, Settings, Context and
 * the background ours, was stored and committed by a Touch and played every device's codes as the set states them**,
 * measured at the receiver by test 1; and the put back restored the set before, measured by the hash and the closing
 * run's first list. What this does not show: the nine other 7.1 tests on this set, which exercise 8.6's structure already
 * run; the Xbox's toggle bit; the entry icons and the picker; and every code of each family beyond the ones test 1 sends.
 *
 * **The control** judges the last attempt by a code book whose Toshiba 32 Bit definition has its header pulse lengthened
 * by a half: the 22 expectations of the four devices of that family, the LG TV, the KPN, the Plex and the Switch, then
 * go unheard, and one more, the Denon's input in Listen to Music, whose pause is counted from the Plex's code; 15 of 38,
 * where the set's own book holds 38 of 38, so the 38 rests on our definitions and the judging can fail. The hash after
 * the forward run is held against the put back's, from which it differs; the answers of the forward run checked against
 * the put back's six fail.
 *
 * **What would have falsified it**: a 304 for any of the six or a 200 for a favourites document in the forward run; our
 * backgrounds asked with a tag, or not asked; a hash after the forward run other than its tags; a put back first list
 * asking with any tag but the forward set's; an expectation of test 1 unheard or a pause out of its band; a code of the
 * set heard in the last attempt that no expectation names; a family of the five, or a device of the seven, not heard.
 *
 * **Sources checked first**: the lab's `9.4-preflight.md` and `9.4-land-brief.md`, `touch92-runs.test.ts` and
 * `touch86-runs.test.ts`, whose shape this follows, `touch91.ts` and `touch91.test.ts`, and `syncTouch` in
 * `packages/corpus/src/touchsync.ts` for what a run's folder keeps. Logitech's client was not consulted: the remote runs
 * its own engine and screens and the answers are ours. **Which architectures**: the Harmony Touch on firmware 4.15.330,
 * one unit, one committed run of each set; its firmware reports 17 and Logitech's templates file it under 18.
 *
 * The reads and the sets hold tags, the account's numbers and the household's address: this file asserts equalities,
 * counts and shapes and prints none of them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

import { harmonyTouch } from '@harmony/codec';
import * as lab from '@harmony/lab';
import {
  CONFIGHASH, FINISHED, OURS, WRITE, answersWritten, commands, hasTag, kind, list, records, reply, resource, sessions, written,
  type Request_,
} from '@harmony/usb/test/touch-recording';

import { CodeBook } from '../src/irmonitor.ts';
import { judge, testDefinitions, type Expectation, type RunPress, type TestDefinition, type Verdict } from '../src/irsession.ts';
import { TOUCH_9_1_TESTS } from '../src/touch91.ts';
import { touch71Configuration, touch71Tests } from '../src/touchbench.ts';
import { TIMING, TouchEngine } from '../src/touchengine.ts';

/** The set built from nothing, its put back, and 9.2's put back, which the bench Touch held before 9.4. */
const SET = 'touch_nothing_set';
const BACK = 'touch_nothing_set_back';
const BEFORE = 'touch_empty_set_back';
/** 8.6's put back, which `9.1-nothing-back` is, content and tags. */
const SETUP_BACK = 'touch_setup_set_back';
const FULL = 'touch_full_sync_recording';
const MONITOR = 'touch_9_4_monitor';
const PHOTOS = ['touch_9_4_activities_photo', 'touch_9_4_powering_off_photo'];
/** 9.2's closing run, the last sync before 9.4, for what the remote asked before the set. */
const BEFORE_CLOSING = 'touch_empty_unchanged_';
/** 8.6's set, whose documents carried Logitech's definitions for the same devices. */
const SETUP = 'touch_setup_set';
const IRTESTS = fileURLToPath(new URL('../irtests/', import.meta.url));

/** One answer of a set as the lab keeps it, `set.json`. */
interface SetAnswer { uri: string; 'body-type': string; resource: unknown; etag: string }
const setOf = (fixture: string): SetAnswer[] => (JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as { answers: SetAnswer[] }).answers;
const isDocument = (a: { uri: string }): boolean => a.uri.startsWith('harmony://');
const sixOf = (set: readonly SetAnswer[]): SetAnswer[] => set.filter(isDocument);
const byName = (set: readonly SetAnswer[], name: string): SetAnswer => set.find((a) => isDocument(a) && resource(a.uri) === name)!;
const text = (fixture: string): string => new TextDecoder().decode(lab.require_(fixture));

const SIX = ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList'];
/** The answers of `set` that differ from `before`'s answer at the same address, content or tag, or that `before` lacks. */
const delivered = (set: readonly SetAnswer[], before: readonly SetAnswer[]): SetAnswer[] =>
  set.filter((a) => {
    const was = isDocument(a) ? byName(before, resource(a.uri)) : before.find((b) => b.uri === a.uri);
    return was === undefined || !isDeepStrictEqual(a, was);
  });

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

const FORWARD = 'touch_nothing_sync_1_';
const PUT_BACK = 'touch_nothing_sync_2_';
const CLOSING = 'touch_nothing_unchanged_';
const ALL_RUNS = [FORWARD, PUT_BACK, CLOSING];

/** The eight request lists every committed run of 8.2 to 9.2's put back handed out. */
const EIGHT = [
  Array(6).fill('document'), [], ['user favourites'], ['device favourites'], ['line up'], [], Array(10).fill('picture'), ['finished'],
];
const EIGHT_ANSWERED = [1, 3, 4, 5, 7, 8] as const;
const runFiles = (prefix: string): string[] => [
  `${prefix}outcome`, `${prefix}handover_list`, `${prefix}handover_answers`,
  ...EIGHT.map((_, i) => `${prefix}list_${i + 1}`), ...EIGHT_ANSWERED.map((n) => `${prefix}answers_${n}`),
];

/**
 * Every answer of one write against its request: an address the set delivers 200 with the set's type, tag and content,
 * unless the request carries the set's own tag, every other tagged request 304 echoing its tag, an untagged favourites
 * request 304 with a tag of ours, the finish 200. 8.4's rule, written again here since a test file cannot import
 * another. Compared as booleans, so a failure prints no value out of a document.
 */
function checkAnswers(asked: Request_[], ours: ReturnType<typeof written>, label: string, sent: readonly SetAnswer[]): void {
  const byUri = new Map(sent.map((a) => [a.uri, a]));
  assert.ok(isDeepStrictEqual(ours.map((a) => a.uri), asked.map((r) => r.uri)), `${label}: the same addresses in the same order`);
  for (const [i, a] of ours.entries()) {
    const r = asked[i]!;
    const k = kind(r.uri);
    const s = byUri.get(r.uri) ?? (isDocument(r) ? sent.find((x) => isDocument(x) && resource(x.uri) === resource(r.uri)) : undefined);
    if (k === 'finished') {
      assert.deepEqual([a.statusCode, 'etag' in a], ['200', false], label);
    } else if (s !== undefined && !(hasTag(r) && r.etag === s.etag)) {
      assert.ok(a.statusCode === '200' && a['body-type'] === s['body-type'] && a.etag === s.etag && isDeepStrictEqual(a.resource, s.resource),
        `${label}: ${k} answered 200 with the set's content and tag`);
    } else if (hasTag(r)) {
      assert.ok(a.statusCode === '304' && a.etag === r.etag && !('resource' in a), `${label}: ${k} answered 304 echoing its tag`);
    } else {
      assert.deepEqual([k.endsWith('favourites') || k === 'line up', a.statusCode, 'resource' in a], [true, '304', false], `${label}: an untagged favourites request kept`);
      assert.ok(OURS.test(a.etag ?? ''), `${label}: a tag of ours`);
    }
  }
}

/** One whole run: the outcome, the hand over, the lists' shape and every answer, and the status counts. */
function checkRun(prefix: string, label: string, sent: readonly SetAnswer[], statuses: readonly [number, number]): void {
  const outcome = JSON.parse(text(`${prefix}outcome`)) as { ending: string; acted: boolean; lists: number; answered: number; handedUp: unknown[] };
  assert.deepEqual([outcome.ending, outcome.acted, outcome.lists, outcome.answered, outcome.handedUp.length],
    ['finished', true, EIGHT.length, statuses[0] + statuses[1], 0], `${label}: the answerer's outcome`);
  assert.deepEqual(list(`${prefix}handover_list`).map((r) => [r.verb, r.uri, 'etag' in r]), [['POST', FINISHED, false]], `${label}: the hand over, nothing handed up`);
  assert.deepEqual(written(`${prefix}handover_answers`).map((a) => [a.statusCode, a.uri, 'etag' in a]), [['200', FINISHED, false]], `${label}: the hand over answered`);
  assert.deepEqual(EIGHT.map((_, i) => list(`${prefix}list_${i + 1}`).map((r) => kind(r.uri))), EIGHT, `${label}: the lists`);
  for (const n of EIGHT_ANSWERED) checkAnswers(list(`${prefix}list_${n}`), written(`${prefix}answers_${n}`), `${label}, list ${n}`, sent);
  const all = EIGHT_ANSWERED.flatMap((n) => written(`${prefix}answers_${n}`));
  assert.deepEqual(['200', '304'].map((s) => all.filter((a) => a.statusCode === s).length), [...statuses], `${label}: the statuses`);
}

/** Which set's tag a document request of a first list carries: the forward set's, the put back's, or another. */
function whose(q: Request_): string {
  const d = resource(q.uri);
  if (q.etag === byName(setOf(SET), d).etag) return 'ours';
  if (q.etag === byName(setOf(BACK), d).etag) return 'back';
  return 'another';
}

test('the set built from nothing is six documents and two pictures under tags of ours, and the put back is the six 9.2\'s put back and 8.6\'s put back delivered',
  lab.skipUnless(SET, BACK, BEFORE, SETUP_BACK), () => {
    const ours = setOf(SET);
    const back = setOf(BACK);
    assert.deepEqual(ours.map((a) => (isDocument(a) ? resource(a.uri) : kind(a.uri))), [...SIX, 'picture', 'picture']);
    assert.deepEqual(back.map((a) => resource(a.uri)), SIX);
    assert.ok(ours.every((a) => OURS.test(a.etag)), 'every tag of ours');
    assert.deepEqual(delivered(ours, back).length, 8, 'every answer of the set differs from the put back\'s');
    assert.ok(isDeepStrictEqual(back, sixOf(setOf(BEFORE))), 'the put back is the six 9.2\'s put back delivered, content and tags');
    assert.ok(isDeepStrictEqual(back, setOf(SETUP_BACK)), 'and 8.6\'s put back');
    // Our two pictures are the background the codec draws, at our store's addresses.
    const b = harmonyTouch.ourBackground();
    assert.deepEqual(ours.filter((a) => !isDocument(a)).map((a) => a.uri), [b.addresses.picture, b.addresses.twin]);
    const read = (set: readonly SetAnswer[]) => harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(set as unknown as harmonyTouch.SyncAnswer[]));
    const c = read(ours);
    assert.deepEqual([c.activities.filter((a) => !a.hidden).length, c.devices.length, c.protocols.length], [5, 7, 5]);
  });

// ---- the committed runs ----

test('the forward run: all six 200 with the set\'s content and tags, the favourites 304, our two pictures 200, the logos 304, the finish, over eight request lists',
  lab.skipUnless(SET, BACK, ...runFiles(FORWARD)), () => {
    const sent = delivered(setOf(SET), setOf(BACK));
    assert.equal(sent.length, 8);
    checkRun(FORWARD, 'the forward run', sent, [9, 11]);
    assert.deepEqual(written(`${FORWARD}answers_7`).map((a) => [a.uri.startsWith('https://'), a.statusCode]),
      [[true, '200'], [true, '200'], ...Array(8).fill([false, '304'])]);
  });

test('the forward run\'s writes: the six in 381470 characters, 13 chunks; our two pictures with the logos\' answers in 5288, one chunk; each replied 200 as a write',
  lab.skipUnless(...EIGHT_ANSWERED.map((n) => `${FORWARD}answers_${n}`), `${FORWARD}reply_1`, `${FORWARD}reply_7`), () => {
    const lengths = EIGHT_ANSWERED.map((n) => text(`${FORWARD}answers_${n}`).length);
    assert.deepEqual([lengths[0], lengths[4]], [381470, 5288]);
    assert.deepEqual(lengths.map(chunks), [13, 1, 1, 1, 1, 1]);
    for (const r of ['reply_1', 'reply_7']) {
      const q = reply(`${FORWARD}${r}`);
      assert.deepEqual([q.errorCode, q.mime], ['200', WRITE], r);
    }
    const documents = (n: number) => written(`${FORWARD}answers_${n}`).filter(isDocument).length;
    assert.deepEqual(EIGHT_ANSWERED.map(documents), [6, 0, 0, 0, 0, 0]);
  });

test('the put back: all six 200 with its content and tags, everything else 304, the finish, over eight request lists; the six in 571577 characters, 19 chunks',
  lab.skipUnless(SET, BACK, ...runFiles(PUT_BACK), `${PUT_BACK}reply_1`), () => {
    const sent = delivered(setOf(BACK), sixOf(setOf(SET)));
    assert.deepEqual(sent.map((a) => resource(a.uri)), SIX);
    checkRun(PUT_BACK, 'the put back', sent, [7, 13]);
    const length = text(`${PUT_BACK}answers_1`).length;
    assert.deepEqual([length, chunks(length)], [571577, 19]);
    const q = reply(`${PUT_BACK}reply_1`);
    assert.deepEqual([q.errorCode, q.mime], ['200', WRITE]);
    const documents = (n: number) => written(`${PUT_BACK}answers_${n}`).filter(isDocument).length;
    assert.deepEqual(EIGHT_ANSWERED.map(documents), [6, 0, 0, 0, 0, 0]);
  });

test('the closing run answered every request 304 or the finish, over eight lists', lab.skipUnless(...runFiles(CLOSING)), () => {
  checkRun(CLOSING, 'the closing run', [], [1, 19]);
});

test('the first lists: the put back\'s six at the forward run, the forward set\'s six at the put back, the put back\'s six at the close, the favourites always untagged',
  lab.skipUnless(SET, BACK, ...ALL_RUNS.map((p) => `${p}list_1`), ...ALL_RUNS.flatMap((p) => [3, 4, 5].map((n) => `${p}list_${n}`))), () => {
    const asked = ALL_RUNS.map((p) => list(`${p}list_1`));
    for (const l of asked) assert.deepEqual(l.map((q) => resource(q.uri)), SIX);
    assert.deepEqual(asked.map((l) => l.map(whose)), [Array(6).fill('back'), Array(6).fill('ours'), Array(6).fill('back')]);
    for (const p of ALL_RUNS) {
      assert.deepEqual([3, 4, 5].map((n) => list(`${p}list_${n}`).map((q) => hasTag(q))), [[false], [false], [false]], p);
    }
  });

test('the pictures: our background and its twin asked untagged at our addresses and the logos as 9.2\'s closing run asked them; after the put back the list is 9.2\'s closing run\'s, tag for tag',
  lab.skipUnless(SET, `${FORWARD}list_7`, `${PUT_BACK}list_7`, `${CLOSING}list_7`, `${BEFORE_CLOSING}list_7`), () => {
    const b = harmonyTouch.ourBackground();
    const all = (fixture: string) => list(fixture).map((r) => `${r.uri} ${r.etag ?? ''}`);
    const forward = list(`${FORWARD}list_7`);
    const before = list(`${BEFORE_CLOSING}list_7`);
    assert.deepEqual(forward.filter((r) => r.uri.startsWith('https://')).map((r) => [r.uri === b.addresses.picture || r.uri === b.addresses.twin, hasTag(r)]),
      [[true, false], [true, false]]);
    assert.deepEqual(forward.filter((r) => r.uri.startsWith('https://')).map((r) => r.uri), [b.addresses.picture, b.addresses.twin]);
    const logos = (l: readonly Request_[]) => l.filter((r) => r.uri.startsWith('content-image://')).map((r) => `${r.uri} ${r.etag ?? ''}`);
    assert.equal(logos(forward).length, 8);
    assert.ok(isDeepStrictEqual(logos(forward), logos(before)), 'the logos with the tags 9.2\'s closing run sent');
    // The person's two backgrounds, asked with the tags the remote held before our set: carried across its commit.
    assert.equal(before.filter((r) => r.uri.startsWith('https://') && hasTag(r)).length, 2);
    assert.ok(isDeepStrictEqual(all(`${PUT_BACK}list_7`), all(`${BEFORE_CLOSING}list_7`)), 'the put back\'s picture list');
    assert.ok(isDeepStrictEqual(all(`${CLOSING}list_7`), all(`${BEFORE_CLOSING}list_7`)), 'the closing run\'s picture list');
  });

test('the configuration hash was the put back\'s before, the forward set\'s after it, all four tags new, and the put back\'s after the put back',
  lab.skipUnless(SET, BACK, 'touch_nothing_confighash_before', 'touch_nothing_confighash_after', 'touch_nothing_confighash_back'), () => {
    const expected = [BACK, SET, BACK].map((s) => hashOf(setOf(s)));
    assert.notEqual(expected[1], expected[0], 'the control: the forward set moves the hash');
    assert.ok(isDeepStrictEqual(['before', 'after', 'back'].map((w) => hashRead(`touch_nothing_confighash_${w}`)), expected));
    assert.deepEqual(HASHED.filter((d) => byName(setOf(SET), d).etag !== byName(setOf(BACK), d).etag), HASHED);
  });

test('the control: the forward run\'s answers checked against the put back\'s set fail, where they hold against the forward set',
  lab.skipUnless(SET, BACK, `${FORWARD}list_1`, `${FORWARD}answers_1`), () => {
    assert.throws(() => checkAnswers(list(`${FORWARD}list_1`), written(`${FORWARD}answers_1`), 'the control', sixOf(setOf(BACK))), assert.AssertionError);
    checkAnswers(list(`${FORWARD}list_1`), written(`${FORWARD}answers_1`), 'the forward run', delivered(setOf(SET), setOf(BACK)));
  });

// ---- the bench run ----

/** The last attempt of test 1, and the two started again, each superseded by the next. */
const LAST = 'touch_9_4_starts';
const SUPERSEDED: readonly (readonly [string, string])[] = [
  ['touch_9_4_starts_superseded_1', 'touch_9_4_starts_superseded_2'],
  ['touch_9_4_starts_superseded_2', LAST],
];
const ATTEMPTS = [SUPERSEDED[0]![0], SUPERSEDED[1]![0], LAST];
const ID = 'touch-7-1-1-starts';
const NEEDS = lab.needing(lab.skipUnless(SET, FULL, LAST));

interface Press { atMs: number; repeats: number; frame: { pulses: { mark: boolean; us: number }[] } }
interface Step { instruction: string; expect?: Expectation[]; presses: Press[]; verdicts: Verdict[]; problem?: string | null }
interface Run { startedAt: string; endedAt: string; steps: Step[] }

const runCache = new Map<string, Run>();
const runOf = (fixture: string): Run => {
  if (!runCache.has(fixture)) runCache.set(fixture, JSON.parse(text(fixture)) as Run);
  return runCache.get(fixture)!;
};

let favouritesCache: Record<string, unknown> | undefined;
/** The recorded full sync's favourites documents, which a set of 9.1 does not deliver, as 7.1 and 9.1 read them. */
function recordedFavourites(): Record<string, unknown> {
  favouritesCache ??= harmonyTouch.documentsOfAnswers(answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi')));
  return favouritesCache;
}
const plain = (d: TestDefinition): TestDefinition => JSON.parse(JSON.stringify(d)) as TestDefinition;
let configurationCache: harmonyTouch.Configuration | undefined;
/** The forward set with the recorded favourites, as the bench tests read it. */
const configuration = (): harmonyTouch.Configuration =>
  (configurationCache ??= touch71Configuration({ answers: setOf(SET) as unknown as harmonyTouch.SyncAnswer[] }, recordedFavourites()));
let definitionCache: TestDefinition | undefined;
/** Test 1 as the forward set derives it, `touch91.test.ts`'s derivation. */
const definition = (): TestDefinition => (definitionCache ??= touch71Tests(configuration()).find((t) => t.id === ID)!.definition);

/** A code book of one set's documents, the way the monitor names a Touch code; `blob` stands in for the set's bytes. */
const bookOf = (blob: Uint8Array, name: string = SET): CodeBook => new CodeBook((n) => (n === name ? blob : undefined), [], undefined, [name]);
let bookCache: CodeBook | undefined;
const book = (): CodeBook => (bookCache ??= bookOf(lab.require_(SET)));

/** A run's presses named afresh from their pulses by `codes`. */
function named(presses: readonly Press[], codes: CodeBook = book()): RunPress[] {
  return presses.map((p) => {
    const matches = codes.match(p.frame.pulses);
    return { atMs: p.atMs, repeats: p.repeats, frame: { ...p.frame, matches, bare: matches.length > 0 && !matches.some((m) => m.opening) } } as unknown as RunPress;
  });
}
const names = (p: RunPress): string[] => [...new Set(p.frame.matches.map((m) => `${m.device} ${m.command}`))];

/** Every step of a run judged against the definition's steps by index. */
const verdictsOf = (run: Run, d: TestDefinition, codes?: CodeBook): Verdict[][] =>
  run.steps.map((s, i) => judge({ expect: d.steps[i]!.expect ?? [], presses: named(s.presses, codes) }));
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

test('the last attempt carried test 1 as it stands, which the forward set derives, and held 38 of 38 judged afresh by the set\'s own definitions, the verdicts the bench wrote',
  NEEDS, () => {
    const d = definition();
    assert.equal(TOUCH_9_1_TESTS[0], ID);
    const onDisk = testDefinitions(IRTESTS).filter((one) => one.id.startsWith('touch-'));
    assert.deepEqual(onDisk.map((one) => one.id), [ID], 'the bench listed test 1 alone');
    assert.deepEqual(plain(d), onDisk[0]!.definition, 'the file as it stands');
    const run = runOf(LAST);
    assert.deepEqual(run.steps.map((s) => s.instruction), d.steps.map((s) => s.instruction));
    assert.deepEqual(run.steps.map((s) => s.expect ?? []), plain(d).steps.map((s) => s.expect ?? []));
    const vs = verdictsOf(run, d);
    assert.deepEqual(vs.flat().map((v) => v.ok), run.steps.flatMap((s) => s.verdicts.map((v) => v.ok)), 'the verdicts the monitor wrote');
    assert.deepEqual(score(vs), [38, 38]);
    assert.deepEqual(vs.map((v) => v.length), [0, 4, 2, 5, 3, 3, 2, 7, 4, 5, 3]);
  });

test('every device of the seven and every family of the five was heard in the last attempt, each code rendered from a definition of ours',
  NEEDS, () => {
    const c = harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(setOf(SET) as unknown as harmonyTouch.SyncAnswer[]));
    const familyOf = (device: string, command: string | undefined) =>
      c.devices.find((d) => d.name === device)!.commands.find((m) => m.name === command)!.protocol!.name;
    const heard = new Map<string, Set<string>>();
    for (const p of runOf(LAST).steps.flatMap((s) => named(s.presses))) {
      for (const m of p.frame.matches) {
        const family = familyOf(m.device, m.command);
        if (!heard.has(family)) heard.set(family, new Set());
        heard.get(family)!.add(m.device);
      }
    }
    assert.deepEqual([...heard].map(([f, d]) => `${f}: ${[...d].sort().join(', ')}`).sort(), [
      'Microsoft 30 Bit: Xbox',
      'Sharp 15 Bit 2: Denon AV Receiver',
      'Sharp 48 Bit 2: Denon AV Receiver',
      'Sony 20 Bit: Blu-ray',
      'Toshiba 32 Bit: KPN, LG TV, Plex, Switch',
    ]);
    // The five are every definition the set holds, each under an id of ours; that each is written from our rhythm
    // table and carries nothing of a Logitech document is `touch-attribution.test.ts`.
    assert.deepEqual(c.protocols.map((p) => p.name).sort(), [...heard.keys()].sort());
    assert.deepEqual(c.protocols.map((p) => [p.id, p.name]), [
      ['900000401', 'Toshiba 32 Bit'], ['900000402', 'Sharp 48 Bit 2'], ['900000403', 'Sharp 15 Bit 2'], ['900000404', 'Sony 20 Bit'],
      ['900000405', 'Microsoft 30 Bit'],
    ], 'every definition under an id of ours');
  });

test('nothing heard that no expectation names; nine frames in the last Off after the Xbox\'s power off that neither the set\'s documents nor 8.6\'s name, every other press named',
  lab.needing(NEEDS, lab.skipUnless(SETUP)), () => {
    const d = definition();
    const found: string[] = [];
    const unnamed: number[] = [];
    runOf(LAST).steps.forEach((s, step) => {
      const presses = named(s.presses);
      presses.forEach((p) => { if (p.frame.matches.length === 0) unnamed.push(step); });
      for (const extra of extras(d.steps[step]!.expect ?? [], presses)) found.push(`${step} ${extra}`);
    });
    assert.deepEqual(found, []);
    assert.deepEqual(unnamed, Array(9).fill(10), 'nine frames unnamed, all in the last Off');
    // All nine come after the Xbox's power off, the last code that Off sends, and 8.6's documents name none of them.
    const last = runOf(LAST).steps[10]!.presses;
    const xbox = named(last).findIndex((p) => names(p).includes('Xbox PowerOff'));
    assert.deepEqual(named(last).map((p, i) => p.frame.matches.length === 0 ? i > xbox : i <= xbox), Array(last.length).fill(true));
    const theirs = bookOf(lab.require_(SETUP), SETUP);
    assert.equal(last.filter((p) => theirs.match(p.frame.pulses).length > 0).length, 3, 'only the three expected');
    // Short: 5 to 17 edges, where the codes this test hears are 31 edges or more.
    assert.deepEqual(last.slice(xbox + 1).map((p) => p.frame.pulses.length), [17, 7, 5, 7, 11, 5, 5, 5, 7]);
    assert.deepEqual([...new Set(runOf(LAST).steps.flatMap((x) => named(x.presses)).filter((p) => p.frame.matches.length > 0).map((p) => p.frame.pulses.length))].sort((a, b) => a - b),
      [31, 41, 63, 67, 99]);
    assert.ok(runOf(LAST).steps.every((s) => s.problem === undefined || s.problem === null || s.problem === ''), 'no step marked');
  });

test('the two attempts started again: test 1 as it stands, 0 of 38 and 14 of 38, each before the next attempt, every expectation the second reached held',
  lab.needing(lab.skipUnless(SET, FULL, ...ATTEMPTS)), () => {
    const d = definition();
    const scores = SUPERSEDED.map(([fixture, next]) => {
      const run = runOf(fixture);
      assert.deepEqual(run.steps.map((s) => s.expect ?? []), plain(d).steps.map((s) => s.expect ?? []), fixture);
      assert.ok(run.endedAt < runOf(next).startedAt, `${fixture} before ${next}`);
      const vs = verdictsOf(run, d);
      assert.deepEqual(vs.flat().map((v) => v.ok), run.steps.flatMap((s) => s.verdicts.map((v) => v.ok)), fixture);
      return score(vs);
    });
    assert.deepEqual(scores, [[0, 38], [14, 38]]);
    // The first stopped after its first step, the unjudged Off; the second after step 4, steps 1 to 4 whole.
    const heardBy = (fixture: string) => runOf(fixture).steps.map((s) => s.presses.length > 0);
    assert.deepEqual(heardBy(SUPERSEDED[0]![0]).lastIndexOf(true), 0);
    // What the first heard at its Off step: the first two codes of Watch TV's start, so Watch TV was started while the
    // run still stood at its first step.
    assert.deepEqual(named(runOf(SUPERSEDED[0]![0]).steps[0]!.presses).map((p) => names(p)[0]), ['LG TV PowerOn', 'Denon AV Receiver PowerOn']);
    assert.deepEqual(heardBy(SUPERSEDED[1]![0]).lastIndexOf(true), 4);
    const second = verdictsOf(runOf(SUPERSEDED[1]![0]), d);
    assert.ok(second.slice(1, 5).every((v) => v.every((one) => one.ok)) && second.slice(5).every((v) => v.every((one) => !one.ok)));
  });

/** Where 9.4's part of the monitor log ends: the put back's sync started at 13:32 UTC. */
const LOG_END = '2026-11-07T13:32:00';

test('the monitor log before the put back: the three attempts\' presses, as many as each file holds; Watch TV\'s start finishing and an Off after the first; Listen to Music started and ended twice after the last',
  lab.needing(lab.skipUnless(SET, MONITOR, ...ATTEMPTS)), () => {
    const all: { at: string; names: string[]; unreadable: boolean }[] = [];
    for (const line of text(MONITOR).split('\n')) {
      if (!line.includes('"pulses"')) continue;
      const f = JSON.parse(line) as { at: string; repeatOf?: number | null; unreadable?: boolean; pulses: { mark: boolean; us: number }[] };
      if (f.at >= LOG_END) break;
      if (f.repeatOf !== undefined && f.repeatOf !== null) continue;
      all.push({ at: f.at, names: [...new Set(book().match(f.pulses).map((m) => `${m.device} ${m.command}`))].sort(), unreadable: f.unreadable === true });
    }
    assert.equal(all.length, 84);
    // The log opens with the first attempt: nothing was heard during the forward sync or before the test.
    assert.ok(all[0]!.at >= runOf(ATTEMPTS[0]!).startedAt);
    const inside = (p: { at: string }) => ATTEMPTS.find((f) => p.at >= runOf(f).startedAt && p.at <= runOf(f).endedAt);
    assert.deepEqual(ATTEMPTS.map((f) => all.filter((p) => inside(p) === f).length), ATTEMPTS.map((f) => runOf(f).steps.reduce((n, s) => n + s.presses.length, 0)));
    assert.deepEqual(ATTEMPTS.map((f) => runOf(f).steps.reduce((n, s) => n + s.presses.length, 0)), [2, 19, 47]);
    // Inside the attempts, every frame the set does not name is one of the last attempt's nine, unreadable at the bench.
    assert.deepEqual(all.filter((p) => inside(p) !== undefined && p.names.length === 0).map((p) => [inside(p), p.unreadable]), Array(9).fill([LAST, true]));
    const outside = all.filter((p) => inside(p) === undefined);
    const between = outside.filter((p) => p.at < runOf(ATTEMPTS[1]!).startedAt);
    const after = outside.filter((p) => p.at > runOf(LAST).endedAt);
    assert.equal(between.length + after.length, outside.length);
    // After the first attempt stopped, the rest of Watch TV's start, the Denon's input and the LG TV's, then what Off sends.
    assert.deepEqual(between.map((p) => p.names[0]), ['Denon AV Receiver InputTVAudio', 'LG TV InputHdmi1', 'LG TV PowerOff', 'Denon AV Receiver PowerOff']);
    assert.ok(between.every((p) => p.at > runOf(ATTEMPTS[0]!).endedAt));
    // After the last, before the put back: Listen to Music's start and end codes twice, three frames among them unnamed.
    assert.deepEqual(after.map((p) => p.names[0] ?? (p.unreadable ? 'unreadable' : 'unnamed')), [
      'Denon AV Receiver PowerOn', 'unreadable', 'unreadable', 'Denon AV Receiver PowerOff', 'unnamed', 'Denon AV Receiver PowerOff', 'Plex PowerToggle',
      'Denon AV Receiver PowerOn', 'Plex PowerToggle', 'Denon AV Receiver InputMediaPlayer', 'Denon AV Receiver PowerOff', 'Plex PowerToggle',
    ]);
    // Those are the codes the set gives Listen to Music's start and its end.
    const engine = new TouchEngine(configuration(), TIMING.low);
    engine.idle();
    const start = engine.start('Listen to Music').map((x) => `${x.device} ${x.command}`);
    engine.idle();
    const end = engine.start(undefined).map((x) => `${x.device} ${x.command}`);
    assert.deepEqual([start, end], [
      ['Denon AV Receiver PowerOn', 'Plex PowerToggle', 'Denon AV Receiver InputMediaPlayer'], ['Denon AV Receiver PowerOff', 'Plex PowerToggle'],
    ]);
  });

/** The forward set with its Toshiba 32 Bit definition's header pulse lengthened by a half, as bytes. */
function withLongerToshibaHeader(): Uint8Array {
  const set = JSON.parse(text(SET)) as { answers: SetAnswer[] };
  const protocols = (byName(set.answers, 'ProtocolList').resource as { Protocols: { Name: string; IRSegments: { Header: { Type: number; Value: number }[] }[] }[] }).Protocols;
  const toshiba = protocols.filter((p) => p.Name === 'Toshiba 32 Bit');
  assert.equal(toshiba.length, 1);
  const header = toshiba[0]!.IRSegments[0]!.Header[0]!;
  assert.equal(header.Type, 1, 'a pulse');
  header.Value = Math.round(header.Value * 1.5);
  return new TextEncoder().encode(JSON.stringify(set));
}

test('the control: by a code book whose Toshiba 32 Bit definition has a longer header, the 22 expectations of that family\'s four devices go unheard, 15 of 38, where the set\'s own holds 38',
  NEEDS, () => {
    const d = definition();
    const changed = verdictsOf(runOf(LAST), d, bookOf(withLongerToshibaHeader()));
    assert.deepEqual(score(changed), [15, 38]);
    const failed = changed.flat().filter((v) => !v.ok);
    const toshiba = /^(lg tv|kpn|plex|switch) · /;
    assert.equal(failed.filter((v) => toshiba.test(v.expected)).length, 22, 'every expectation of the LG TV, the KPN, the Plex and the Switch');
    // The 23rd is the Denon's input in Listen to Music: heard, but its pause is counted from the Plex's code, now unheard.
    assert.deepEqual(failed.filter((v) => !toshiba.test(v.expected)).map((v) => [v.expected, /after the previous, wanted/.test(v.detail)]),
      [['denon av receiver · InputMediaPlayer', true]]);
    assert.ok(changed.flat().filter((v) => v.ok).every((v) => /^(denon av receiver|blu-ray|xbox) · /.test(v.expected)), 'every one still held is another family\'s');
    assert.deepEqual(score(verdictsOf(runOf(LAST), d)), [38, 38]);
  });

test('the person\'s two photographs, the activity list and the "Powering off" screen on the set, are kept in the lab, PNGs; what they show is the person\'s report in this file\'s header',
  lab.skipUnless(...PHOTOS), () => {
    for (const photo of PHOTOS) assert.deepEqual([...lab.require_(photo).subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], photo);
  });
