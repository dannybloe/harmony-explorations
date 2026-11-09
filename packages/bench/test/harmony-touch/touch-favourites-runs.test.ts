/**
 * Favourites of ours and a logo of ours on the Harmony Touch, `todo-touch.md` 8.3, as it ran: the user's favourites
 * document changed, a channel added from the line up, the order reversed, a logo drawn by this project delivered at
 * the added channel's station logo, all heard at the receiver, and both put back.
 *
 * **What was run.** After commit `630c5b68`, the 8.3 preparation, and in the order of the lab's
 * `work/touch-firmware/notes/8.3-preflight.md` section 7, each run read before the next:
 *
 * 1. `getconfighash` through the request rail, the remote holding `8.2-activity-back`;
 * 2. `touch-sync.ts --set 8.3-favourites --commit`: the six of `8.2-activity-back`, content and tags, beside two
 *    pieces of content of ours, the user's favourites document composed by `composeTouchFavourites` from
 *    `packages/corpus/touch-favourites/8.3-favourites.json` (channel 61 added as the remote's own add screen adds an
 *    offered channel, the station alone appended to the user's list, and the order 61, 4, 3, 2, 1, 666) and the
 *    picture `drawTouchLogo('8.3')` at the address of channel 61's station logo, each under the tag the set's name
 *    gives, `touch-device-set.ts --favourites`;
 * 3. `getconfighash` again;
 * 4. the bench test `irtests/done/touch-8-3-favourites.json` on the Flirc monitor;
 * 5. `touch-sync.ts --set 8.3-favourites-back --commit`, the two pieces as the remote held them before, and
 *    `getconfighash`;
 * 6. one `touch-sync.ts --unchanged --commit`;
 * 7. the 7.1 favourites test, `irtests/done/touch-7-1-3-favourites.json`, unchanged. Two shorter runs of it just before
 *    stopped early, 3 and 2 of its 15 expectations held; nothing records why, so they are abandoned starts and no
 *    cause is claimed.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **The two sets.** The forward set is `8.2-activity-back`'s six, content and tags, and two answers of content:
 *    the user's favourites document, which the reader reads back as 61 BB1 (its number from the line up, where every
 *    other favourite's comes from its dial position), RTL 4, NPO 3, NPO 2, NPO 1, Zork, and the logo, byte for byte the
 *    drawing of `8.3`, 54 by 54. The put back holds the same six and the two addresses with the content and tags the
 *    recorded full sync delivered them with, which no set before 8.3 replaced.
 * 2. **Each set run answered the two pieces 200 with the set's content and tag**, the six 304, the tuning device's
 *    favourites and the line up 304 with a tag of ours, the nine other pictures 304, the finish 200, and finished,
 *    over eight request lists. The user's favourites went in one write of 1216 characters and the pictures in one of
 *    3510 for the forward set, 1166 and 5011 for the put back, each one chunk and each replied 200 as a write. The
 *    closing `--unchanged` run answered every request 304 or the finish.
 * 3. **Each run's first request list asked for the six with `8.2-activity-back`'s tags**, which the two sets also
 *    carry, and **the configuration hash was that set's before, after the forward set and after the put back**: the
 *    four documents it joins are not touched by favourites, so it cannot say that the content arrived.
 * 4. **What says it arrived is the picture request list.** The forward run asked for the station's logo with the tag
 *    the recorded full sync delivered it with; the put back's run asked for it with the forward set's tag, so the
 *    remote had stored the logo of ours under that tag and committed it; the closing run with the recorded tag again.
 *    The nine other pictures were asked for with the same tag in all three runs as in 8.2's closing run. **And the
 *    logos came in the order of the favourites just delivered**: in the forward run the station's logo was the first of
 *    the eight logos, in the new order 61 first, where in the put back's run and the closing run it was the sixth,
 *    after the five favourites in the old order. So the remote builds its picture list from the favourites documents
 *    answered earlier in the same sync, as the screens' `submitImageRequest` reads.
 * 5. **The favourites requests stayed untagged after a 200 of ours.** The user's favourites, the tuning device's and
 *    the line up were asked for without a tag in every run, including the two after the forward set had delivered the
 *    user's document with 200 and a tag. That is what reading A of `favourites-and-settings.md` predicts (the tag
 *    taken from the set being gathered, which holds none yet) and what reading B (a tag whenever the file and its
 *    index entry exist) does not.
 * 6. **The favourites ran, at the receiver.** The bench run, judged afresh here from its pulses by the set's own
 *    documents with the tuning device's favourites and the line up as recorded, held 18 of 18, and every press of the
 *    run is one an expectation took. The first tap, on the tile showing 61, with nothing running, started Watch TV
 *    (the LG TV on, the Denon on 965 ms later, its TV audio input 4103 ms after that, the LG TV's HDMI 1 5342 ms
 *    after that) and then sent 0, 6, 1 about half a second apart, the number the line up gives the station, padded
 *    to three digits by the LG TV's channel tuning. The other five taps sent their own digits, 004, 003, 002, 001,
 *    666, and Off the two power offs. Every judged pause fell inside its band.
 * 7. **After the test and before the put back the log holds twelve more presses the documents name and one frame
 *    they do not**: Listen to Music started from Off and an Off, then Watch TV started from Off with 0, 0, 3 at its
 *    end, NPO 3 tapped with nothing running; the model predicts those twelve for those three actions. No file records
 *    who did what then, and nothing is judged from it beyond that.
 * 8. **After the put back, the 7.1 favourites test held 15 of 15**, judged afresh by the put back's documents. It
 *    taps the five old favourites by name, whose dial positions 8.3 never changed, so it says the favourites still
 *    work after the put back and not which order the screen showed.
 *
 * **Reported by the person at the bench and held by no file**: after the forward set the six tiles were in the order
 * 61, RTL 4, NPO 3, NPO 2, NPO 1, Zork, tile 61 showing our yellow "8.3" logo and the others their own logos; after the
 * put back the five tiles were in the old order with the old logos. The order the screen shows is held by that report
 * alone: the bench test taps by name in the predicted order, so the infrared does not show the order.
 *
 * **So a user's favourites document composed by this project, delivered with 200 under a tag of ours, was stored and
 * committed by a Touch and its screen followed it**, a channel added as the remote adds one from the line up was
 * shown and sent with the line up's number, and a picture of ours at the address of a picture the remote held
 * replaced it and was drawn. Taking both out under their old tags restored what the remote held. What this does not
 * show: a tuning device's document or a line up of ours, a channel added by hand, an uploaded logo of ours, a picture
 * at an address the remote did not hold, the screens' picture cache (the added channel's tile showed the new logo at
 * once, so the cache never held the old one at that path), and the added channel's name, which its tile does not
 * show.
 *
 * **The control** judges the run by the favourites before 8.3, the six with the recorded favourites documents: that
 * plan has five taps, Zork first, and no tile 61, and the run's presses judged by it hold 8 of 15, where by the set's
 * own plan they hold 18 of 18.
 *
 * **What would have falsified it**: a 200 for anything but the two pieces, or a 304 for either; a picture list asking
 * for the station's logo with a tag but the one the remote was given last; a hash that moved; 0 6 1 unheard or heard
 * for another tap, a digit out of order, or a pause outside its band.
 *
 * **Sources checked first**: the lab's `8.3-preflight.md` and `8.3-land-brief.md`, `touch-activity-runs.test.ts`, whose shape
 * this follows, `touch-favourites-predicted.test.ts`, `touchfavouritestest.ts` and `families/harmony-touch/engine.ts`, and the screens' `submitImageRequest` in the
 * lab's firmware copy for the picture order. Logitech's client was not consulted: the remote runs its own screens and
 * the answers are ours. **Which architectures**: the Harmony Touch on firmware 4.15.330, one unit, one run of each set;
 * its firmware reports 17 and Logitech's templates file it under 18.
 *
 * The reads and the sets hold tags, the account's numbers, the household's address and station ids: this file
 * asserts equalities, counts and shapes and prints none of them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

import { readPng } from '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';
import * as lab from '@harmony/lab';
import {
  CONFIGHASH, FINISHED, OURS, WRITE, answersWritten, commands, hasTag, kind, list, records, reply, resource, sessions, written,
  type Request_,
} from '@harmony/testkit/touch-recording';

import { CodeBook } from '../../src/irmonitor.ts';
import { judge, testDefinitions, type Expectation, type RunPress, type TestDefinition, type Verdict } from '../../src/irsession.ts';
import { BenchTouchEngine, TIMING, touch71Configuration, touch71Tests } from '../../src/touchbench.ts';
import { touch83Tests } from '../../experiments/touchfavouritestest.ts';

const SOURCE = 'touch_activity_set_back';
const SET = 'touch_favourites_set';
const BACK = 'touch_favourites_set_back';
const FULL = 'touch_full_sync_recording';
const RUN = 'touch_8_3_run';
const MONITOR = 'touch_8_3_monitor';
const RERUN = 'touch_8_3_favourites_rerun';
const STARTS = ['touch_8_3_favourites_rerun_start_1', 'touch_8_3_favourites_rerun_start_2'];
/** 8.2's closing run's picture list, asked of the remote just before 8.3. */
const BEFORE_PICTURES = 'touch_activity_unchanged_list_7';
const DESCRIPTION = fileURLToPath(new URL('../../../corpus/touch-favourites/8.3-favourites.json', import.meta.url));

/** One answer of a set as the lab keeps it, `set.json`. */
interface SetAnswer { uri: string; 'body-type': string; resource: unknown; etag: string }
const setOf = (fixture: string): SetAnswer[] => (JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as { answers: SetAnswer[] }).answers;
const isContent = (a: { uri: string }): boolean => a.uri.startsWith('content://') || a.uri.startsWith('content-image://');
const description = (): harmonyTouch.OwnFavourites => (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { favourites: harmonyTouch.OwnFavourites }).favourites;

/** The four documents whose tags `getconfighash` joins, in its order, `touch-confighash.test.ts`. */
const HASHED = ['ActivityList', 'DeviceList', 'ProtocolList', 'Context'];
const hashOf = (set: SetAnswer[]): string => {
  const tags = new Map(set.map((a) => [resource(a.uri), a.etag]));
  return `result=${HASHED.map((d) => tags.get(d)!).join('')}`;
};

let recordedCache: SetAnswer[] | undefined;
/** The favourites documents and pictures the recorded full sync delivered, which the remote held before 8.3. */
function recorded(): SetAnswer[] {
  recordedCache ??= (answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi')) as unknown as SetAnswer[]).filter(isContent);
  return recordedCache;
}
/** The recorded favourites documents by address, as `touch71Configuration` takes them. */
const recordedFavourites = (): Record<string, unknown> => Object.fromEntries(recorded().filter((a) => a.uri.startsWith('content://')).map((a) => [a.uri, a.resource]));

/** The two set runs, each with the set it delivered and the sizes of its two writes of content. */
const SET_RUNS = [
  { prefix: 'touch_favourites_sync_1_', set: SET, favourites: 1216, pictures: 3510 },
  { prefix: 'touch_favourites_sync_2_', set: BACK, favourites: 1166, pictures: 5011 },
] as const;
const CLOSING = 'touch_favourites_unchanged_';
const ALL_RUNS = [...SET_RUNS.map((r) => r.prefix), CLOSING];

/** The eight request lists every run of 8.3 handed out, as every run of 8.2 did. */
const EIGHT = [
  Array(6).fill('document'), [], ['user favourites'], ['device favourites'], ['line up'], [], Array(10).fill('picture'), ['finished'],
];
const EIGHT_ANSWERED = [1, 3, 4, 5, 7, 8] as const;

const runFiles = (prefix: string, answered: readonly number[]): string[] => [
  `${prefix}outcome`, `${prefix}handover_list`, `${prefix}handover_answers`,
  ...EIGHT.map((_, i) => `${prefix}list_${i + 1}`), ...answered.map((n) => `${prefix}answers_${n}`),
];

/**
 * Every answer of one write against its request: an address the set delivers 200 with the set's type, tag and
 * content, every other tagged request 304 echoing its tag, an untagged favourites request 304 with a tag of ours,
 * the finish 200. 8.2's rule with the content of a set among what is delivered, written again here since a test file
 * cannot import another.
 */
function checkAnswers(asked: Request_[], ours: ReturnType<typeof written>, label: string, delivered: readonly SetAnswer[]): void {
  const byUri = new Map(delivered.map((a) => [a.uri, a]));
  assert.deepEqual(ours.map((a) => a.uri), asked.map((r) => r.uri), `${label}: the same addresses in the same order`);
  for (const [i, a] of ours.entries()) {
    const r = asked[i]!;
    const k = kind(r.uri);
    const s = byUri.get(r.uri);
    if (k === 'finished') {
      assert.deepEqual([a.statusCode, 'etag' in a], ['200', false], label);
    } else if (s !== undefined) {
      assert.deepEqual([a.statusCode, a['body-type'], a.etag], ['200', s['body-type'], s.etag], `${label}: the ${k} answered 200 with the set's tag`);
      assert.ok(isDeepStrictEqual(a.resource, s.resource), `${label}: the ${k} is the set's`);
    } else if (hasTag(r)) {
      assert.deepEqual([a.statusCode, a.etag, 'resource' in a], ['304', r.etag, false], `${label}: ${k} answered 304 echoing its tag`);
    } else {
      assert.deepEqual([k.endsWith('favourites') || k === 'line up', a.statusCode, 'resource' in a], [true, '304', false], `${label}: an untagged favourites request kept`);
      assert.match(a.etag ?? '', OURS, `${label}: a tag of ours`);
    }
  }
}

/** One whole run: the outcome, the hand over, the lists' shape and every answer, and the status counts. */
function checkRun(prefix: string, label: string, delivered: readonly SetAnswer[]): void {
  const outcome = JSON.parse(new TextDecoder().decode(lab.require_(`${prefix}outcome`))) as { ending: string; acted: boolean; lists: number; answered: number; handedUp: unknown[] };
  assert.deepEqual([outcome.ending, outcome.acted, outcome.lists, outcome.answered, outcome.handedUp.length], ['finished', true, EIGHT.length, 20, 0], `${label}: the answerer's outcome`);
  assert.deepEqual(list(`${prefix}handover_list`).map((r) => [r.verb, r.uri, 'etag' in r]), [['POST', FINISHED, false]], `${label}: the hand over`);
  assert.deepEqual(written(`${prefix}handover_answers`).map((a) => [a.statusCode, a.uri, 'etag' in a]), [['200', FINISHED, false]], `${label}: the hand over answered`);
  assert.deepEqual(EIGHT.map((_, i) => list(`${prefix}list_${i + 1}`).map((r) => kind(r.uri))), EIGHT, `${label}: the lists`);
  for (const n of EIGHT_ANSWERED) checkAnswers(list(`${prefix}list_${n}`), written(`${prefix}answers_${n}`), `${label}, list ${n}`, delivered);
  const all = EIGHT_ANSWERED.flatMap((n) => written(`${prefix}answers_${n}`));
  assert.deepEqual(['200', '304'].map((s) => all.filter((a) => a.statusCode === s).length), [1 + delivered.length, 19 - delivered.length], `${label}: the statuses`);
}

/** The logos a remote holding `favourites` asks for, in the screens' order: the favourites' in the order shown, then the popular ones by rank. */
function logosInOrder(favourites: harmonyTouch.ReadFavourites): string[] {
  const out: string[] = [];
  const add = (uri: string | undefined): void => { if (uri !== undefined && !out.includes(uri)) out.push(uri); };
  for (const f of favourites.favourites) add(f.logo);
  const ranked = (favourites.service?.channels ?? []).filter((c) => Number.isFinite(Number(c?.popularRank)) && typeof c?.station?.id === 'string');
  for (const c of [...ranked].sort((a, b) => Number(a!.popularRank) - Number(b!.popularRank)).slice(0, 25)) add(harmonyTouch.stationLogo(c!.station!.id!));
  return out;
}

/** What the remote reads as its favourites with the favourites documents of `content` over the recorded ones. */
function favouritesOf(content: readonly SetAnswer[]): harmonyTouch.ReadFavourites {
  const documents = { ...recordedFavourites(), ...harmonyTouch.documentsOfAnswers([...setOf(SOURCE), ...content.filter((a) => a.uri.startsWith('content://'))] as harmonyTouch.SyncAnswer[]) };
  const read = harmonyTouch.readConfiguration(documents as harmonyTouch.SyncDocuments).favourites;
  assert.equal(read.length, 1, 'one favourites activity');
  return read[0]!;
}

test('the forward set is 8.2-activity-back\'s six with the user\'s favourites and a logo of ours, and the put back is what the remote held before',
  lab.skipUnless(SOURCE, SET, BACK, FULL), () => {
    const source = setOf(SOURCE);
    const forward = setOf(SET);
    const back = setOf(BACK);
    for (const s of [forward, back]) assert.deepEqual(s.filter((a) => !isContent(a)), source, 'the six, content and tags');
    const two = (s: SetAnswer[]) => s.filter(isContent);
    assert.deepEqual(two(forward).map((a) => [kind(a.uri), a['body-type']]), [['user favourites', 'application/json'], ['picture', 'image/png']]);
    assert.deepEqual(two(back).map((a) => a.uri), two(forward).map((a) => a.uri));
    // Each piece of ours under a tag of ours, which is not the tag the remote held it under.
    const held = new Map(recorded().map((a) => [a.uri, a]));
    for (const a of two(forward)) {
      assert.match(a.etag, OURS);
      assert.notEqual(a.etag, held.get(a.uri)!.etag);
    }
    // The put back is exactly the recorded full sync's content and tags at the two addresses.
    for (const a of two(back)) {
      const was = held.get(a.uri)!;
      assert.deepEqual([a.etag, a['body-type'], a.resource], [was.etag, was['body-type'], was.resource]);
    }
    // The favourites the forward set gives, as the reader reads them: channel 61 added first, its number from the line
    // up, every other from its dial position (Zork's a channel added by hand), in the description's order, and its logo
    // the picture of ours.
    const f = favouritesOf(two(forward));
    assert.deepEqual(f.favourites.map((x) => x.number), description().order);
    assert.deepEqual(f.favourites.map((x) => x.name), ['BB1', 'RTL 4', 'NPO 3', 'NPO 2', 'NPO 1', 'Zork']);
    assert.deepEqual(f.favourites.map((x) => [x.numberAt?.document, x.dial === undefined, x.added]),
      [['ContentService', true, false], ...Array(4).fill(['ContentDevice', false, false]), ['ContentDevice', false, true]]);
    assert.equal(f.favourites[0]!.logo, two(forward)[1]!.uri);
    const png = Buffer.from(two(forward)[1]!.resource as string, 'base64');
    assert.ok(png.equals(Buffer.from(harmonyTouch.drawTouchLogo('8.3'))), 'the drawing of 8.3');
    const header = readPng(png);
    assert.deepEqual([header.width, header.height, header.bitDepth, header.colourType, header.interlace, png.length], [54, 54, 8, 6, 0, 742]);
    assert.deepEqual(harmonyTouch.pictureRefusals(two(forward)[1]!.uri, png), []);
    // And the put back's favourites are the five in the old order.
    assert.deepEqual(favouritesOf(two(back)).favourites.map((x) => x.number), ['666', '1', '2', '3', '4']);
  });

for (const r of SET_RUNS) {
  test(`${r.prefix}: the two pieces answered 200 with the set's content and tags, the rest 304, the finish 200, over eight request lists`,
    lab.skipUnless(r.set, ...runFiles(r.prefix, EIGHT_ANSWERED)), () => {
      checkRun(r.prefix, r.prefix, setOf(r.set).filter(isContent));
    });

  test(`${r.prefix}: the user's favourites went in one write of ${r.favourites} characters and the pictures in one of ${r.pictures}, each replied 200 as a write`,
    lab.skipUnless(`${r.prefix}answers_3`, `${r.prefix}answers_7`, `${r.prefix}reply_3`, `${r.prefix}reply_7`), () => {
      const length = (n: number) => new TextDecoder().decode(lab.require_(`${r.prefix}answers_${n}`)).length;
      // 31000 characters a chunk, as `touch-changed-set-sync.test.ts` derives it from the session's shapes.
      assert.deepEqual([length(3), length(7)], [r.favourites, r.pictures]);
      assert.ok([length(3), length(7)].every((l) => l < 31000), 'one chunk each');
      for (const n of [3, 7]) {
        const q = reply(`${r.prefix}reply_${n}`);
        assert.deepEqual([q.errorCode, q.mime], ['200', WRITE]);
      }
    });
}

test('the closing run answered every request 304 or the finish, over eight lists', lab.skipUnless(...runFiles(CLOSING, EIGHT_ANSWERED)), () => {
  checkRun(CLOSING, 'the closing run', []);
});

test('every run asked for the six with 8.2-activity-back\'s tags and for the three favourites documents untagged, a 200 of ours before it or not',
  lab.skipUnless(SOURCE, ...ALL_RUNS.flatMap((p) => [3, 4, 5].map((n) => `${p}list_${n}`)), ...ALL_RUNS.map((p) => `${p}list_1`)), () => {
    const source = setOf(SOURCE);
    for (const p of ALL_RUNS) {
      assert.deepEqual(list(`${p}list_1`).map((q) => [q.uri, q.etag]), source.map((a) => [a.uri, a.etag]), p);
      assert.deepEqual([3, 4, 5].map((n) => list(`${p}list_${n}`).map((q) => hasTag(q))), [[false], [false], [false]], p);
    }
  });

test('the configuration hash was 8.2-activity-back\'s before, after the forward set and after the put back, since favourites are not in it',
  lab.skipUnless(SOURCE, SET, BACK, 'touch_favourites_confighash_before', 'touch_favourites_confighash_after', 'touch_favourites_confighash_back'), () => {
    const read = (fixture: string) => {
      const q = reply(fixture);
      assert.deepEqual([q.errorCode, q.mime], ['200', CONFIGHASH]);
      return q.result;
    };
    const expected = [SOURCE, SET, BACK].map((s) => hashOf(setOf(s)));
    assert.equal(new Set(expected).size, 1, 'the three sets give one hash');
    assert.deepEqual(['before', 'after', 'back'].map((w) => read(`touch_favourites_confighash_${w}`)), expected);
  });

test('the picture lists: the logo of ours was stored under the forward set\'s tag, the old one came back, and the logos followed the favourites just delivered',
  lab.skipUnless(SET, BACK, FULL, BEFORE_PICTURES, ...ALL_RUNS.map((p) => `${p}list_7`)), () => {
    const forward = setOf(SET).filter(isContent);
    const back = setOf(BACK).filter(isContent);
    const logo = forward[1]!.uri;
    const tagOf = (fixture: string, uri: string): string | undefined => list(fixture).find((q) => q.uri === uri)?.etag;
    const whose = (tag: string | undefined): string => (tag === forward[1]!.etag ? 'the forward set\'s' : tag === back[1]!.etag ? 'the recorded' : 'another');
    assert.deepEqual([BEFORE_PICTURES, ...ALL_RUNS.map((p) => `${p}list_7`)].map((f) => whose(tagOf(f, logo))),
      ['the recorded', 'the recorded', 'the forward set\'s', 'the recorded']);
    // Every other picture asked for with one tag in all four lists.
    const others = (fixture: string) => list(fixture).filter((q) => q.uri !== logo).map((q) => [q.uri, q.etag]).sort();
    for (const p of ALL_RUNS) assert.deepEqual(others(`${p}list_7`), others(BEFORE_PICTURES), p);
    assert.equal(others(BEFORE_PICTURES).length, 9);
    // The logos in the order the screens ask for them, from the favourites the run had just delivered: in the forward
    // run the new order, the station's logo first of eight; in the put back's run and the closing run the old one.
    const logos = (fixture: string) => list(fixture).map((q) => q.uri).filter((u) => u.startsWith('content-image://'));
    const forwardOrder = logosInOrder(favouritesOf(forward));
    const oldOrder = logosInOrder(favouritesOf(back));
    assert.notDeepEqual(forwardOrder, oldOrder);
    assert.deepEqual(ALL_RUNS.map((p) => logos(`${p}list_7`)), [forwardOrder, oldOrder, oldOrder]);
    assert.deepEqual([forwardOrder.length, forwardOrder.indexOf(logo), oldOrder.indexOf(logo)], [8, 0, 5]);
    // The two backgrounds come before the logos in every list.
    assert.deepEqual(ALL_RUNS.map((p) => list(`${p}list_7`).slice(0, 2).map((q) => q.uri.startsWith('https://'))), Array(3).fill([true, true]));
  });

// ---- the bench run ----

interface Press { atMs: number; repeats: number; frame: { pulses: { mark: boolean; us: number }[] } }
interface Step { instruction: string; expect?: Expectation[]; presses: Press[]; verdicts: Verdict[]; problem?: string | null }
interface Run { startedAt: string; endedAt: string; steps: Step[] }

const runOf = (fixture: string): Run => JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as Run;

/** A set's six with the favourites documents of `content` over the recorded ones, as the bench tests read them. */
const configuration = (set: string): harmonyTouch.Configuration => touch71Configuration({ answers: setOf(set) }, recordedFavourites());

/** The 8.3 tests derived from `set`'s documents, with the description's added channel and logo text. */
const testsOf = (set: string) => {
  const d = description();
  return touch83Tests(configuration(set), d.add ?? [], d.logos?.[0]?.text ?? '');
};

let bookCache: CodeBook | undefined;
/**
 * The code book of the six, the way the monitor names a Touch code. The six are `8.2-activity-back`'s in all three
 * sets, so the book is that fixture's, whose answers are the six alone.
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

test('the bench run carried the 8.3 test as derived and on disk, held 18 of 18 judged afresh, every pause in its band, and nothing else was heard',
  lab.skipUnless(SOURCE, SET, FULL, RUN), () => {
    const definition = testsOf(SET)[0]!.definition;
    const onDisk = testDefinitions(fileURLToPath(new URL('../../irtests/', import.meta.url))).concat(testDefinitions(fileURLToPath(new URL('../../irtests/done/', import.meta.url)))).find((one) => one.id === 'touch-8-3-favourites')!.definition;
    assert.deepEqual(onDisk, JSON.parse(JSON.stringify(definition)) as TestDefinition);
    const run = runOf(RUN);
    assert.deepEqual(run.steps.map((s) => s.instruction), definition.steps.map((s) => s.instruction));
    assert.deepEqual(run.steps.map((s) => s.expect ?? []), definition.steps.map((s) => JSON.parse(JSON.stringify(s.expect ?? [])) as Expectation[]));
    const verdicts = run.steps.map((s, i) => judge({ expect: definition.steps[i]!.expect ?? [], presses: named(s.presses) }));
    assert.deepEqual([verdicts.flat().length, verdicts.flat().filter((v) => v.ok).length], [18, 18]);
    // Named afresh, the verdicts are the ones the monitor wrote at the bench, one for one.
    assert.deepEqual(verdicts.flat().map((v) => v.ok), run.steps.flatMap((s) => s.verdicts.map((v) => v.ok)));
    // Every press of the run is one an expectation took, in order, a repeated digit once per press: none in the
    // unjudged Off, none beyond them.
    const heard = run.steps.map((s) => named(s.presses).map(names));
    const expected = definition.steps.map((s) => (s.expect ?? []).flatMap((e) => Array<string>(e.times ?? 1).fill(`${String(e.device)} ${e.command}`)));
    assert.deepEqual(heard.map((h) => h.length), expected.map((e) => e.length));
    assert.deepEqual(heard.map((h) => h.length), [0, 7, 3, 3, 3, 3, 3, 2]);
    assert.deepEqual(heard.flat().map((n, i) => n.includes(expected.flat()[i]!)), expected.flat().map(() => true));
    // The digits tap by tap: the added channel's number from the line up, then the five in the new order.
    const digits = heard.slice(1, 7).map((h) => h.map((n) => n.find((x) => /^LG TV \d$/.test(x))?.slice(-1) ?? '').join(''));
    assert.deepEqual(digits, ['061', '004', '003', '002', '001', '666']);
    // Only the Denon's power codes are named by two commands, each sharing its code with a main zone command.
    assert.deepEqual([...new Set(heard.flat().filter((n) => n.length > 1).map((n) => n.join(' / ')))], [
      'Denon AV Receiver PowerOn / Denon AV Receiver PowerOn-MainZone',
      'Denon AV Receiver PowerOff / Denon AV Receiver PowerOff-MainZone',
    ]);
    // The start of Watch TV and the digits after it, start to start, each inside the band the model gave.
    assert.deepEqual(pausesOf(run.steps[1]!.presses), [965, 4103, 5342, 528, 520, 520]);
    assert.ok(run.steps.every((s) => s.problem === undefined || s.problem === null), 'no step marked');
  });

test('the control: judged by the favourites before 8.3, which hold no tile 61, the run\'s presses hold 8 of 15, where by the set\'s own 18 of 18',
  lab.skipUnless(SOURCE, SET, FULL, RUN), () => {
    const old = testsOf(SOURCE)[0]!.definition;
    assert.deepEqual(old.steps.map((s) => s.instruction),
      ['Button: Off', 'Button: Favorites → Screen: Zork', 'Screen: NPO 1', 'Screen: NPO 2', 'Screen: NPO 3', 'Screen: RTL 4', 'Button: Off']);
    assert.ok(!configuration(SOURCE).favourites[0]!.favourites.some((f) => f.number === '61'), 'no favourite of channel 61');
    const run = runOf(RUN);
    assert.deepEqual(score(run, old), [8, 15]);
    assert.deepEqual(score(run, testsOf(SET)[0]!.definition), [18, 18]);
  });

/**
 * Where 8.3's part of the monitor log ends: the put back's sync started at 13:39 UTC. The log is the live log of a
 * bench that kept running after 8.3, so frames of later use follow in the same file and are left out here.
 */
const LOG_END = '2026-11-06T13:39:00';

/** The monitor log's opening frames up to `LOG_END`, named, with their time on the receiver's clock. */
function logPresses(): { at: string; names: string[] }[] {
  const out: { at: string; names: string[] }[] = [];
  for (const line of new TextDecoder().decode(lab.require_(MONITOR)).split('\n')) {
    if (!line.includes('"pulses"')) continue;
    const f = JSON.parse(line) as { at: string; repeatOf?: number | null; pulses: { mark: boolean; us: number }[] };
    if (f.at >= LOG_END) break;
    if (f.repeatOf !== undefined && f.repeatOf !== null) continue;
    out.push({ at: f.at, names: [...new Set(book().match(f.pulses).map((m) => `${m.device} ${m.command}`))].sort() });
  }
  return out;
}

test('the monitor log holds the run\'s 24 presses, then Listen to Music and Off, then NPO 3 tapped from Off, as the model predicts them, and one unnamed frame',
  lab.skipUnless(SOURCE, SET, FULL, RUN, MONITOR), () => {
    const run = runOf(RUN);
    const all = logPresses();
    const during = all.filter((p) => p.at >= run.startedAt && p.at <= run.endedAt);
    const after = all.filter((p) => p.at > run.endedAt);
    assert.deepEqual([all.length, during.length, after.length], [37, 24, 13]);
    // The log's presses during the run are the run's own, name for name.
    assert.deepEqual(during.map((p) => p.names), run.steps.flatMap((s) => named(s.presses).map(names)));
    // After the test's Off: one frame no code of the documents names, then twelve the model predicts for Listen to
    // Music started from Off, Off, and NPO 3 tapped with nothing running.
    assert.deepEqual(after[0]!.names, []);
    const engine = new BenchTouchEngine(configuration(SET), TIMING.low);
    engine.start(undefined);
    engine.idle();
    const predicted = [...engine.start('Listen to Music'), ...(engine.idle(), engine.start(undefined)), ...(engine.idle(), engine.favourite('Watch TV', '3'))]
      .map((s) => `${s.device} ${s.command}`);
    assert.equal(predicted.length, 12);
    assert.deepEqual(after.slice(1).map((p, i) => p.names.includes(predicted[i]!)), predicted.map(() => true));
  });

test('after the put back the 7.1 favourites test, unchanged, held 15 of 15, and the two shorter runs just before it stopped early at 3 and 2',
  lab.skipUnless(BACK, FULL, RERUN, ...STARTS), () => {
    const definition = touch71Tests(configuration(BACK)).find((d) => d.id === 'touch-7-1-3-favourites')!.definition;
    const onDisk = testDefinitions(fileURLToPath(new URL('../../irtests/', import.meta.url))).concat(testDefinitions(fileURLToPath(new URL('../../irtests/done/', import.meta.url)))).find((one) => one.id === 'touch-7-1-3-favourites')!.definition;
    assert.deepEqual(onDisk, JSON.parse(JSON.stringify(definition)) as TestDefinition);
    const runs = [...STARTS, RERUN].map(runOf);
    for (const r of runs) assert.deepEqual(r.steps.map((s) => s.expect ?? []), definition.steps.map((s) => JSON.parse(JSON.stringify(s.expect ?? [])) as Expectation[]));
    assert.deepEqual(runs.map((r) => score(r, definition)), [[3, 15], [2, 15], [15, 15]]);
    // Named afresh, the verdicts are the ones the monitor wrote, one for one.
    for (const r of runs) {
      const ok = r.steps.flatMap((s, i) => judge({ expect: definition.steps[i]!.expect ?? [], presses: named(s.presses) }).map((v) => v.ok));
      assert.deepEqual(ok, r.steps.flatMap((s) => s.verdicts.map((v) => v.ok)));
    }
    // The two starts, one after the other and both before the full run; each heard nothing past its third step.
    assert.ok(runs[0]!.endedAt < runs[1]!.startedAt && runs[1]!.endedAt < runs[2]!.startedAt);
    assert.deepEqual(runs.map((r) => r.steps.map((s) => s.presses.length)), [[0, 3, 4, 0, 0, 0, 0], [0, 5, 0, 0, 0, 0, 0], [0, 7, 3, 3, 3, 3, 2]]);
  });
