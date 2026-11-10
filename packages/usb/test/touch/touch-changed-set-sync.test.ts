/**
 * The first changes of content a program of this project delivered to a Harmony Touch, and what the remote did
 * with them, as measured on the bench unit. One value of one document changed and put back,
 * twice: a sequence's delay step, heard on the infrared monitor, and an activity's name, seen on the screen.
 *
 * **What was run.** Four sets, each built by `packages/corpus/bin/touch-changed-set.ts` from the one before it,
 * the first from the own set the remote held, its own six documents under tags of ours,
 * `touch-own-set-sync.test.ts`: `6.9-delay`, MapList's `/ButtonMaps/8/Sequences/0/Actions/1/Duration`
 * from 1 to 3, the delay step between the Sony Blu-ray's Stop and its TopMenu in the sequence Yellow's short press
 * runs in Watch a Blu-ray; `6.9-delay-back`, 3 to 1; `6.9-label`, ActivityList's `/Activities/2/Name` from
 * "Listen to Music" to "Music Test"; `6.9-label-back`, the name back. Each changes that one value and gives that
 * document alone a new tag of ours. Each went to the remote by `packages/corpus/bin/touch-sync.ts --set <set>
 * --commit`, in that order, with `getconfighash` through the request rail before and after each, and a closing
 * `touch-sync.ts --unchanged --commit` after the fourth. The bench test
 * `packages/bench/irtests/done/touch-6-9-sequence-delay.json` ran on the Flirc monitor three times: before the first
 * sync, after it and after the second. The lab's `work/touch-firmware/notes/6.9-preflight.md` predicted every row
 * below before the runs.
 *
 * **Two bench attempts before the baseline are left out**: the monitor's two runs a minute or so before the one
 * used recorded no press of Yellow at all, since their steps were not advanced past the activity's start, so
 * they hold no reading of the sequence and are not registered as fixtures.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **Each set is its source with one value changed and one tag new.** Read off the lab's set files: the
 *    changed document's tag differs from the source's and the other five are the source's; the changed document
 *    differs from the source's only at the pointer, holding the old value there and the new one here; and both
 *    put back sets hold, as parsed JSON, exactly the own set's six documents.
 * 2. **Each run asked for the six with the previous set's tags**, the own set's for the first run, so each run's
 *    first request list is the evidence that the run before it delivered and committed its set: the button map
 *    list is not in `getconfighash`, so the two delay runs show their delivery only there, in the next run's list.
 * 3. **Each run answered the changed document 200 with the set's content and tag and the other five 304**, then
 *    the three favourites 304 with a tag of ours, the ten pictures 304 with their own tags, unchanged since the own set's sync,
 *    and the finish 200; the hand over was `proxy://Finished` alone and the answerer's outcome `finished`. The
 *    write of the one 200 was 349539 characters, twelve chunks of 31000 and a last of 8539, for each delay set,
 *    and one chunk, 10809 and 10816 characters, for the two label sets; each was replied 200 as a write.
 * 4. **The configuration hash** is the own set's four tags before and after both delay runs and before the label
 *    run, since MapList is not one of the four it joins; after the label run it is `6.9-label`'s, read again
 *    before the last run, and after the last run it is `6.9-label-back`'s. The two ends are the set files in the
 *    lab and the remote's own report of its committed store.
 * 5. **The closing run asked for the six with `6.9-label-back`'s tags** and answered every request 304 or the
 *    finish.
 * 6. **The delay step is a sleep of `Duration` seconds between the two commands, heard at the receiver.** Each
 *    bench run's two taps of Yellow gave two presses each: a 20 bit frame whose header mark is about 2450 us,
 *    which the catalogue names Stop, and then one it names TopMenu. The silence before TopMenu's first frame, the
 *    monitor's `gapUs`, and the time from the start of the Stop to the start of TopMenu are computed here from the
 *    files and asserted exactly. The decisive figure is the difference, since the Stop's own length and the
 *    engine's overhead are the same in every run: **the step from 1 s to 3 s added between 1952 and 2017 ms to
 *    the silence press by press, 1984 ms on the means against the baseline and 2011.5 against the put back**,
 *    inside the preflight's predicted band of 2000 ms give or take 100, and the put back lands within 30 ms of
 *    the baseline, outside that band, which is the band's own control.
 * 7. **The name**, by the person at the bench and not by any file: after the label run the activity list's
 *    third entry read MUSIC over TEST, after the put back LISTEN over TO MUSIC, and the remote was otherwise
 *    normal. That is the screens' drawing as the preflight read it, `juniper/style.lua`'s activity button: the
 *    name trimmed, its first space made a line break, drawn in capitals. This test asserts only the documents'
 *    side of it: the name each set delivered.
 *
 * **So a document changed by a program of this project, one value in it, was stored, committed and acted on by
 * a Touch, and putting the old value back under a new tag restored the old behaviour.** One document delivered
 * with 200 among five 304s replaced that document alone and the remote kept the other five. What this does not
 * show: a document composed whole by this project, a favourites document or a picture delivered with 200, and a
 * change made through an editor of the codec rather than at a JSON pointer.
 *
 * **What would have falsified each**: a set differing from its source in more than one place or tag; a first
 * list asking with any tag but the previous set's, which would mean the run before had not committed; a second
 * 200 or a missing one; a hash moving on a delay run or not moving on the label runs; a silence after the 3 s run
 * within 100 ms of 1 s plus the baseline's, or the put back not returning to it.
 *
 * **Sources checked first.** `reference/architectures/harmony-touch/answering-a-sync.md` and
 * `activities-and-buttons.md`, the lab's `6.9-preflight.md` with its reading of the engine (`getSequenceActions`,
 * `fireCommandsList`, `system.blockingSleep`) and the screens (`newActivityButton`), `touch-own-set-sync.test.ts`
 * and the 650's delay test in `packages/codec/test/compose/compose.test.ts` for the way a gap is read off the monitor.
 * Logitech's client was not consulted: what is measured is the remote's side of a sync it plays no part in.
 * **Width**: one unit, firmware 4.15.330, one run of each set, provisioning mode 0; the delay timed on one
 * sequence of one infrared device.
 *
 * The reads and the sets hold tags, the account's numbers and the household's addresses: this file asserts
 * equalities, counts and shapes and prints none of them.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

import * as lab from '@harmony/lab';
import { DATA_PACKET_PAYLOAD } from '../../src/filepipe.ts';
import { TOUCH_REQUEST_SHAPES } from '../../src/touchsession.ts';
import { CONFIGHASH, FINISHED, OURS, WRITE, hasTag, kind, list, reply, resource, written, type Request_ } from '@harmony/testkit/touch-recording';

/** One answer of a set as the lab keeps it, `set.json`. */
interface SetAnswer {
  uri: string;
  'body-type': string;
  resource: unknown;
  etag: string;
}

function setOf(fixture: string): SetAnswer[] {
  return (JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as { answers: SetAnswer[] }).answers;
}

const OWN_SET = 'touch_own_set';
const OWN_HASH = 'touch_own_set_confighash_after';
const OWN_PICTURES = 'touch_own_set_sync_list_7';

/** The four runs in the order they went, each with the set before it, the one change and the write's size. */
const RUNS = [
  { n: 1, set: 'touch_changed_set_delay', before: OWN_SET, document: 'MapList', pointer: '/ButtonMaps/8/Sequences/0/Actions/1/Duration', was: 1, to: 3, characters: 349539 },
  { n: 2, set: 'touch_changed_set_delay_back', before: 'touch_changed_set_delay', document: 'MapList', pointer: '/ButtonMaps/8/Sequences/0/Actions/1/Duration', was: 3, to: 1, characters: 349539 },
  { n: 3, set: 'touch_changed_set_label', before: 'touch_changed_set_delay_back', document: 'ActivityList', pointer: '/Activities/2/Name', was: 'Listen to Music', to: 'Music Test', characters: 10809 },
  { n: 4, set: 'touch_changed_set_label_back', before: 'touch_changed_set_label', document: 'ActivityList', pointer: '/Activities/2/Name', was: 'Music Test', to: 'Listen to Music', characters: 10816 },
] as const;

const SETS = RUNS.map((r) => r.set);
const LISTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const ANSWERED = [1, 3, 4, 5, 7, 8] as const;
const CLOSING = 'touch_changed_unchanged_';
const run_ = (n: number): string => `touch_changed_sync_${n}_`;
const files = (prefix: string): string[] => [
  `${prefix}outcome`, `${prefix}handover_list`, `${prefix}handover_answers`,
  ...LISTS.map((n) => `${prefix}list_${n}`), ...ANSWERED.map((n) => `${prefix}answers_${n}`),
];

/** The four documents whose tags `getconfighash` joins, in its order, `touch-confighash.test.ts`. */
const HASHED = ['ActivityList', 'DeviceList', 'ProtocolList', 'Context'];
const hashOf = (set: SetAnswer[]): string => {
  const tags = new Map(set.map((a) => [resource(a.uri), a.etag]));
  return `result=${HASHED.map((d) => tags.get(d)!).join('')}`;
};

/** The value a JSON Pointer names, `~1` and `~0` unescaped; undefined when a step is missing. */
function at(doc: unknown, pointer: string): unknown {
  let here: unknown = doc;
  for (const raw of pointer.split('/').slice(1)) {
    const step = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (typeof here !== 'object' || here === null) return undefined;
    here = (here as Record<string, unknown>)[step];
  }
  return here;
}

/** A deep copy of `doc` with the value at `pointer` replaced, to compare two documents everywhere but there. */
function withValue(doc: unknown, pointer: string, value: unknown): unknown {
  const copy = structuredClone(doc);
  const steps = pointer.split('/').slice(1);
  let here = copy as Record<string, unknown>;
  for (const step of steps.slice(0, -1)) here = here[step] as Record<string, unknown>;
  here[steps.at(-1)!] = value;
  return copy;
}

/** The shape every sync of this kind has handed out, `touch-second-sync.test.ts`. */
const SHAPE = [
  Array(6).fill('document'),
  [],
  ['user favourites'],
  ['device favourites'],
  ['line up'],
  [],
  Array(10).fill('picture'),
  ['finished'],
];

/**
 * Every answer of one run checked against its request: the documents named in `delivered` answered 200 with the
 * set's type, tag and content, every other tagged request 304 echoing its tag, an untagged favourites request
 * 304 with a tag of ours, the finish 200.
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
      assert.deepEqual(a.resource, s.resource, `${label}: ${resource(r.uri)} is the set's document`);
    } else if (hasTag(r)) {
      assert.deepEqual([a.statusCode, a.etag, 'resource' in a], ['304', r.etag, false], `${label}: ${k} answered 304 echoing its tag`);
    } else {
      assert.deepEqual([k.endsWith('favourites') || k === 'line up', a.statusCode, 'resource' in a], [true, '304', false], `${label}: an untagged favourites request kept`);
      assert.match(a.etag ?? '', OURS, `${label}: a tag of ours`);
    }
  }
}

/** One whole run: the outcome, the hand over, the eight lists' shape and every answer, and the status counts. */
function checkRun(prefix: string, label: string, set: SetAnswer[], delivered: readonly string[]): void {
  const outcome = JSON.parse(new TextDecoder().decode(lab.require_(`${prefix}outcome`))) as { ending: string; acted: boolean; lists: number; answered: number; handedUp: unknown[] };
  assert.deepEqual([outcome.ending, outcome.acted, outcome.lists, outcome.answered, outcome.handedUp.length], ['finished', true, 8, 20, 0], `${label}: the answerer's outcome`);
  assert.deepEqual(list(`${prefix}handover_list`).map((r) => [r.verb, r.uri, 'etag' in r]), [['POST', FINISHED, false]], `${label}: the hand over`);
  assert.deepEqual(written(`${prefix}handover_answers`).map((a) => [a.statusCode, a.uri, 'etag' in a]), [['200', FINISHED, false]], `${label}: the hand over answered`);
  assert.deepEqual(LISTS.map((n) => list(`${prefix}list_${n}`).map((r) => kind(r.uri))), SHAPE, `${label}: the eight lists`);
  for (const n of ANSWERED) checkAnswers(list(`${prefix}list_${n}`), written(`${prefix}answers_${n}`), `${label}, list ${n}`, set, delivered);
  const all = ANSWERED.flatMap((n) => written(`${prefix}answers_${n}`));
  assert.deepEqual(['200', '304'].map((s) => all.filter((a) => a.statusCode === s).length), [1 + delivered.length, 19 - delivered.length], `${label}: the statuses`);
}

test('each set is the one before with one value of one document changed and that document alone retagged', lab.skipUnless(OWN_SET, ...SETS), () => {
  for (const r of RUNS) {
    const before = setOf(r.before);
    const after = setOf(r.set);
    assert.deepEqual(after.map((a) => a.uri), before.map((a) => a.uri), `${r.set}: the six addresses`);
    assert.deepEqual(after.map((a) => OURS.test(a.etag)), Array(6).fill(true), `${r.set}: six tags of ours`);
    assert.deepEqual(after.filter((a, i) => a.etag !== before[i]!.etag).map((a) => resource(a.uri)), [r.document], `${r.set}: one tag new`);
    assert.deepEqual(after.filter((a, i) => !isDeepStrictEqual(a.resource, before[i]!.resource)).map((a) => resource(a.uri)), [r.document], `${r.set}: one document changed`);
    const i = after.findIndex((a) => resource(a.uri) === r.document);
    assert.deepEqual([at(before[i]!.resource, r.pointer), at(after[i]!.resource, r.pointer)], [r.was, r.to], `${r.set}: the value`);
    assert.deepEqual(withValue(after[i]!.resource, r.pointer, r.was), before[i]!.resource, `${r.set}: nothing else in the document`);
  }
  // Three distinct tags for each changed document over the chain: the own set's and one for each of the two sets
  // that changed it, so a tag the remote asks with names the set that delivered it.
  const tags = (doc: string) => new Set([OWN_SET, ...SETS].map((s) => setOf(s).find((a) => resource(a.uri) === doc)!.etag));
  assert.deepEqual([tags('MapList').size, tags('ActivityList').size], [3, 3]);
});

test('both put back sets hold exactly the own set\'s six documents as parsed JSON, under other tags', lab.skipUnless(OWN_SET, 'touch_changed_set_delay_back', 'touch_changed_set_label_back'), () => {
  const own = setOf(OWN_SET);
  for (const back of ['touch_changed_set_delay_back', 'touch_changed_set_label_back']) {
    const s = setOf(back);
    assert.deepEqual(s.map((a) => a.resource), own.map((a) => a.resource), back);
    assert.notDeepEqual(s.map((a) => a.etag), own.map((a) => a.etag), back);
  }
});

for (const r of RUNS) {
  const prefix = run_(r.n);
  test(`run ${r.n}, ${r.set.replace('touch_changed_set_', '')}: the six asked for with the previous set's tags, so the run before had committed`, lab.skipUnless(r.before, r.set, `${prefix}list_1`), () => {
    const before = setOf(r.before);
    assert.deepEqual(list(`${prefix}list_1`).map((q) => [q.uri, q.etag]), before.map((a) => [a.uri, a.etag]));
    // And so with the set's own tags for the five it leaves alone, and another for the one it changes.
    const set = setOf(r.set);
    assert.deepEqual(list(`${prefix}list_1`).map((q, i) => q.etag === set[i]!.etag), set.map((a) => resource(a.uri) !== r.document));
  });

  test(`run ${r.n}: ${r.document} answered 200 with the set's content and tag, the other five 304, the favourites and pictures 304, the finish 200`, lab.skipUnless(r.set, ...files(prefix)), () => {
    checkRun(prefix, `run ${r.n}`, setOf(r.set), [r.document]);
  });

  test(`run ${r.n}: the one 200 went in a write of ${r.characters} characters, replied 200 as a write`, lab.skipUnless(`${prefix}answers_1`, `${prefix}reply_1`), () => {
    const line = new TextDecoder().decode(lab.require_(`${prefix}answers_1`));
    const chunk = DATA_PACKET_PAYLOAD * TOUCH_REQUEST_SHAPES[WRITE]!.packetsPerChunk;
    assert.equal(chunk, 31000);
    assert.deepEqual([line.length, Math.ceil(line.length / chunk), line.length % chunk], [r.characters, r.characters > chunk ? 12 : 1, r.characters > chunk ? 8539 : r.characters]);
    const q = reply(`${prefix}reply_1`);
    assert.deepEqual([q.errorCode, q.mime], ['200', WRITE]);
  });

  test(`run ${r.n}: the ten pictures were asked for at the addresses and with the tags of the own set's sync`, lab.skipUnless(`${prefix}list_7`, OWN_PICTURES), () => {
    assert.deepEqual(list(`${prefix}list_7`).map((q) => [q.uri, q.etag]), list(OWN_PICTURES).map((q) => [q.uri, q.etag]));
  });
}

test('the configuration hash stays the own set\'s through both delay runs and moves to each label set\'s tags after its run', lab.skipUnless(OWN_HASH, OWN_SET, ...SETS, ...[1, 2, 3, 4].flatMap((n) => [`touch_changed_confighash_${n}_before`, `touch_changed_confighash_${n}_after`])), () => {
  const read = (n: number, when: 'before' | 'after') => {
    const q = reply(`touch_changed_confighash_${n}_${when}`);
    assert.deepEqual([q.errorCode, q.mime], ['200', CONFIGHASH]);
    return q.result;
  };
  const own = reply(OWN_HASH).result;
  const label = hashOf(setOf('touch_changed_set_label'));
  const back = hashOf(setOf('touch_changed_set_label_back'));
  // The delay sets carry the own set's four hashed tags, since MapList is not one of them.
  assert.deepEqual([hashOf(setOf(OWN_SET)), hashOf(setOf('touch_changed_set_delay')), hashOf(setOf('touch_changed_set_delay_back'))], [own, own, own]);
  assert.equal(new Set([own, label, back]).size, 3, 'three different hashes');
  assert.deepEqual(
    [read(1, 'before'), read(1, 'after'), read(2, 'before'), read(2, 'after'), read(3, 'before'), read(3, 'after'), read(4, 'before'), read(4, 'after')],
    [own, own, own, own, own, label, label, back],
  );
});

test('the closing run asked for the six with the put back label set\'s tags and answered every request 304 or the finish', lab.skipUnless('touch_changed_set_label_back', ...files(CLOSING)), () => {
  const set = setOf('touch_changed_set_label_back');
  assert.deepEqual(list(`${CLOSING}list_1`).map((q) => [q.uri, q.etag]), set.map((a) => [a.uri, a.etag]));
  checkRun(CLOSING, 'the closing run', set, []);
});

// The delay, off the three bench runs.

type Frame = { gapUs?: number; bits?: number; pulses: { mark: boolean; us: number }[]; guesses?: { name: string }[] };
type Press = { atMs: number; repeats: number; frame: Frame };
type BenchRun = { steps: { instruction: string; presses?: Press[] }[] };

const BENCH = [
  { fixture: 'touch_changed_ir_before', duration: 1 },
  { fixture: 'touch_changed_ir_delay', duration: 3 },
  { fixture: 'touch_changed_ir_back', duration: 1 },
] as const;

/** Per tap of Yellow: the silence before TopMenu's first frame and the start of the Stop to the start of TopMenu, ms. */
function taps(fixture: string): { silenceUs: number; startToStartMs: number }[] {
  const run = JSON.parse(new TextDecoder().decode(lab.require_(fixture))) as BenchRun;
  const yellow = run.steps.filter((s) => s.instruction === 'Button: Yellow, tap');
  assert.equal(yellow.length, 2, `${fixture}: two taps`);
  return yellow.map((s, i) => {
    const presses = s.presses ?? [];
    assert.equal(presses.length, 2, `${fixture}, tap ${i + 1}: two presses, the Stop and TopMenu`);
    for (const [p, name] of [[presses[0]!, 'Stop'], [presses[1]!, 'TopMenu']] as const) {
      assert.equal(p.frame.guesses?.[0]?.name, name, `${fixture}, tap ${i + 1}: the catalogue names it ${name}`);
      assert.equal(p.frame.bits, 20, 'a 20 bit frame');
      const header = p.frame.pulses[0]!;
      assert.ok(header.mark && Math.abs(header.us - 2450) <= 50, `${fixture}, tap ${i + 1}: a header mark of about 2450 us`);
    }
    return { silenceUs: presses[1]!.frame.gapUs!, startToStartMs: presses[1]!.atMs - presses[0]!.atMs };
  });
}

test('the delay step: the silence before TopMenu is about Duration seconds, and 1 s to 3 s adds 2000 ms give or take 100', lab.skipUnless(...BENCH.map((b) => b.fixture)), () => {
  const readings = BENCH.map((b) => taps(b.fixture));
  assert.deepEqual(readings.map((r) => r.map((t) => t.silenceUs)), [[1192000, 1133000], [3144000, 3149000], [1132000, 1138000]]);
  assert.deepEqual(readings.map((r) => r.map((t) => t.startToStartMs)), [[1304, 1248], [3244, 3261], [1248, 1256]]);

  // The decisive figure, the difference: every 3 s silence against every 1 s one, and the means.
  const BAND = { centre: 2000000, slack: 100000 };
  const within = (us: number) => Math.abs(us - BAND.centre) <= BAND.slack;
  const [before, three, back] = readings.map((r) => r.map((t) => t.silenceUs));
  const pairwise = [...before!, ...back!].flatMap((one) => three!.map((t) => t - one));
  assert.deepEqual([Math.min(...pairwise), Math.max(...pairwise)], [1952000, 2017000]);
  assert.ok(pairwise.every(within), 'each 3 s silence is 2000 ms give or take 100 above each 1 s one');
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  assert.deepEqual([mean(three!) - mean(before!), mean(three!) - mean(back!)], [1984000, 2011500]);
  // The band's control: the put back against the baseline, both at 1 s, is nowhere near it.
  assert.equal(mean(back!) - mean(before!), -27500);
  assert.ok(!within(mean(back!) - mean(before!)), 'the put back is not a step of 2 s');
  // The same holds start to start, where the Stop's own frames are inside the figure.
  const [b2, t2, k2] = readings.map((r) => r.map((t) => t.startToStartMs));
  assert.deepEqual([mean(t2!) - mean(b2!), mean(t2!) - mean(k2!)], [1976.5, 2000.5]);
});
