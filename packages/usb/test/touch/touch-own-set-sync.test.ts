/**
 * A Harmony Touch's own six configuration documents delivered back to it with 200 under entity tags of ours, by a
 * program of this project, and what the remote did with them, as measured on the bench unit: `todo-touch.md` 6.8.
 *
 * **What was run.** `packages/corpus/bin/touch-sync.ts --set <lab set> --commit`, the set built by
 * `packages/corpus/bin/touch-own-set.ts` out of the full sync of 2.3 for five documents and the remote's own hand
 * over of 6.7 for Settings, each the parsed document as delivered, under a tag of ours, `setTag` in
 * `packages/corpus/src/touchsync.ts`. Around it, through the request rail, `getconfighash` once before and once
 * after, and then a third `touch-sync.ts --unchanged --commit`. The lab's `work/touch-firmware/notes/6.8-preflight.md`
 * predicted every row below before the run.
 *
 * **The read before the sync survives only as a comparison.** It and the read after fell in the same minute, and
 * the scripts of the time named a read's folder by the minute and wrote into a folder that already existed, so the
 * read after overwrote it; `newReadFolder` in `packages/lab/src/index.ts` refuses that now. Before it was
 * overwritten the before read was compared with `cmp` against the read after 6.7's second sync,
 * `touch_second_sync_confighash_after`, and was byte for byte equal. That comparison is a fact of the run and not
 * of a file: nothing here can assert it. So the hash's move is asserted against the 6.7 read, which stood for the
 * remote's state up to the run by that comparison.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **The hand over handed up nothing**: `proxy://Finished` alone, answered 200 with no tag, and the run's outcome
 *    names nothing handed up. A change waiting would have stopped the run before the sync, by the answerer's own
 *    rule, since the set holds every document a hand over can carry.
 * 2. **The sync asked for the six with the tags the remote held, and got the set's documents with 200 and the
 *    set's tags.** The tags it asked with equal the second sync's, so they are what the remote held; each differs
 *    from the set's. Our answers, in the order asked, carry the set's address, status 200, `application/json`,
 *    the set's tag and a document equal to the set's as parsed JSON. They went in **one write of 571577
 *    characters, 19 chunks of 31000 with a last of 13577**, the first write of ours longer than one chunk; the
 *    session announced it with the whole line's length, its default, `TouchAnnouncement` in `touchsession.ts`,
 *    which the run's file does not keep, so that number is the session's and not read here. The announcement was
 *    answered 200 and the write was replied 200 naming the write.
 * 3. **The rest of the sync was the second sync's shape**: an empty list; the user's, the tuning device's and the
 *    line up's favourites, each untagged, answered 304 with a tag of ours; an empty list; the ten pictures, tagged
 *    with exactly the tags the second sync saw, answered 304 echoing them; `proxy://Finished`, answered 200. The
 *    finish is queued only once the remote's screens have committed the set, `answering-a-sync.md`.
 * 4. **The configuration hash afterwards is the set's**: 200, `result=` and the set's ActivityList, DeviceList,
 *    ProtocolList and Context tags joined in that order, and so not the hash before. The two ends are the set's
 *    file in the lab and the remote's own report of its committed store.
 * 5. **The third run, `--unchanged`, asked for the six with exactly the set's tags**, MapList and Settings
 *    included, which the hash leaves out, at the same addresses; it answered every request 304 echoing the tag, or
 *    with a tag of ours for an untagged favourites document, and the finish 200. So the six tags of ours are what
 *    the remote stored, and the remote asks with them.
 *
 * **So a whole set of six answered 200 by a program of ours was stored and committed by a Touch, and its tags
 * became the remote's.** What this does not show: what the remote makes of a document whose content this project
 * composed, since every document here is one the remote already held, five as Logitech delivered them and Settings
 * as the remote handed it up; a favourites document or a picture delivered with 200; and what the screens show,
 * which the person at the bench reported and `docs/test-notes/harmony-touch.md` holds.
 *
 * **What would have falsified each**: a document handed up; an answer with another status, tag or document than
 * the set's, or the six asked for with the set's tags already; a write replied as anything but a write; a list
 * out of the second sync's shape or a picture with another tag; a hash other than the set's four tags; the third
 * run asking with any tag but the set's, or answered anything but 304 and the finish.
 *
 * **Sources checked first.** `reference/architectures/harmony-touch/answering-a-sync.md`, the lab's
 * `6.8-preflight.md`, `touch-second-sync.test.ts` and `touch-confighash.test.ts`. Logitech's client was not
 * consulted: what is measured here is the remote's side of a sync it plays no part in. **Width**: one unit,
 * firmware 4.15.330, one run, provisioning mode 0.
 *
 * The reads and the set hold tags, the account's numbers and the household's addresses: this file asserts
 * equalities, counts and shapes and prints none of them.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { DATA_PACKET_PAYLOAD } from '../../src/filepipe.ts';
import { TOUCH_REQUEST_SHAPES } from '../../src/touchsession.ts';
import { CONFIGHASH, FINISHED, OURS, WRITE, hasTag, kind, list, reply, resource, written, type Request_ } from '@harmony/testkit/touch-recording';

const SET = 'touch_own_set';
const AFTER = 'touch_own_set_confighash_after';
const BEFORE_SEEN = 'touch_second_sync_confighash_after';
const SECOND_LIST_1 = 'touch_second_sync_list_1';
const SECOND_LIST_7 = 'touch_second_sync_list_7';
const HAND_OVER_LIST = 'touch_own_set_sync_handover_list';
const HAND_OVER_ANSWERS = 'touch_own_set_sync_handover_answers';
const HAND_OVER_REPLY = 'touch_own_set_sync_handover_reply';
const ANNOUNCEMENT = 'touch_own_set_sync_announcement_1';
const THIRD_HAND_OVER_LIST = 'touch_own_set_unchanged_handover_list';
const THIRD_HAND_OVER_ANSWERS = 'touch_own_set_unchanged_handover_answers';

const LISTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const ANSWERED = [1, 3, 4, 5, 7, 8] as const;
const list_ = (n: number): string => `touch_own_set_sync_list_${n}`;
const answers_ = (n: number): string => `touch_own_set_sync_answers_${n}`;
const reply_ = (n: number): string => `touch_own_set_sync_reply_${n}`;
const third_ = (n: number): string => `touch_own_set_unchanged_list_${n}`;
const thirdAnswers_ = (n: number): string => `touch_own_set_unchanged_answers_${n}`;

/** The four documents whose tags `getconfighash` joins, in its order, `touch-confighash.test.ts`. */
const HASHED = ['ActivityList', 'DeviceList', 'ProtocolList', 'Context'];

/** One answer of the set as the lab keeps it, `set.json`, written by `touch-own-set.ts --build`. */
interface SetAnswer {
  uri: string;
  'body-type': string;
  resource: unknown;
  etag: string;
}

function theSet(): SetAnswer[] {
  return (JSON.parse(new TextDecoder().decode(lab.require_(SET))) as { answers: SetAnswer[] }).answers;
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

/** Every answer to one run's lists checked against its request: the set's 200 for the six where `set` is given. */
function checkAnswers(asked: Request_[], ours: ReturnType<typeof written>, label: string, set?: Map<string, SetAnswer>): void {
  assert.deepEqual(ours.map((a) => a.uri), asked.map((r) => r.uri), `${label}: the same addresses in the same order`);
  for (const [i, a] of ours.entries()) {
    const r = asked[i]!;
    const k = kind(r.uri);
    if (k === 'finished') {
      assert.deepEqual([a.statusCode, 'etag' in a], ['200', false], label);
    } else if (k === 'document' && set !== undefined) {
      const s = set.get(r.uri)!;
      assert.deepEqual([a.statusCode, a['body-type'], a.etag], ['200', s['body-type'], s.etag], `${label}: ${resource(r.uri)} answered 200 with the set's tag`);
      assert.deepEqual(a.resource, s.resource, `${label}: ${resource(r.uri)} is the set's document`);
    } else if (hasTag(r)) {
      assert.deepEqual([a.statusCode, a.etag, 'resource' in a], ['304', r.etag, false], `${label}: the tag echoed`);
    } else {
      assert.deepEqual([k.endsWith('favourites') || k === 'line up', a.statusCode, 'resource' in a], [true, '304', false], `${label}: an untagged favourites request kept`);
      assert.match(a.etag ?? '', OURS, `${label}: a tag of ours`);
    }
  }
}

test('the set holds the six under six different tags of ours, each a version 8 identifier', lab.skipUnless(SET), () => {
  const set = theSet();
  assert.deepEqual(set.map((a) => resource(a.uri)), ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList']);
  assert.deepEqual(set.map((a) => OURS.test(a.etag)), Array(6).fill(true));
  assert.equal(new Set(set.map((a) => a.etag)).size, 6);
});

test('the hand over handed up nothing: its list was proxy://Finished alone, answered 200 with no tag', lab.skipUnless(HAND_OVER_LIST, HAND_OVER_ANSWERS, HAND_OVER_REPLY), () => {
  assert.deepEqual(list(HAND_OVER_LIST).map((r) => [r.verb, r.uri, 'etag' in r]), [['POST', FINISHED, false]]);
  assert.deepEqual(written(HAND_OVER_ANSWERS).map((a) => [a.statusCode, a.uri, 'etag' in a]), [['200', FINISHED, false]]);
  const r = reply(HAND_OVER_REPLY);
  assert.deepEqual([r.errorCode, r.mime], ['200', WRITE]);
});

test('the sync handed out the eight lists of the second sync\'s shape: the six, none, three favourites, none, ten pictures, the finish', lab.skipUnless(...LISTS.map(list_)), () => {
  assert.deepEqual(LISTS.map((n) => list(list_(n)).map((r) => kind(r.uri))), SHAPE);
  assert.deepEqual(LISTS.map((n) => list(list_(n)).map(hasTag)), [
    Array(6).fill(true), [], [false], [false], [false], [], Array(10).fill(true), [false],
  ]);
});

test('the six were asked for with the tags the remote held, the second sync\'s, and none of them the set\'s', lab.skipUnless(list_(1), SECOND_LIST_1, SET), () => {
  const asked = list(list_(1));
  const then = list(SECOND_LIST_1);
  assert.deepEqual(asked.map((r) => [r.uri, r.etag]), then.map((r) => [r.uri, r.etag]));
  const set = theSet();
  assert.deepEqual(asked.map((r) => r.uri), set.map((a) => a.uri), 'the set\'s six addresses, in the order asked');
  assert.deepEqual(asked.map((r, i) => r.etag === set[i]!.etag), Array(6).fill(false));
});

test('every request was answered in order: the six 200 with the set\'s document and tag, the rest 304, the finish 200', lab.skipUnless(SET, ...ANSWERED.map(list_), ...ANSWERED.map(answers_)), () => {
  const set = new Map(theSet().map((a) => [a.uri, a]));
  for (const n of ANSWERED) checkAnswers(list(list_(n)), written(answers_(n)), `list ${n}`, set);
  const all = ANSWERED.flatMap((n) => written(answers_(n)));
  assert.deepEqual(['200', '304'].map((s) => all.filter((a) => a.statusCode === s).length), [7, 13]);
});

test('the six went in one write of 571577 characters, 19 chunks with a last of 13577, announced and replied 200', lab.skipUnless(answers_(1), ANNOUNCEMENT, reply_(1)), () => {
  const line = new TextDecoder().decode(lab.require_(answers_(1)));
  const chunk = DATA_PACKET_PAYLOAD * TOUCH_REQUEST_SHAPES[WRITE]!.packetsPerChunk;
  assert.equal(chunk, 31000);
  assert.deepEqual([line.length, Math.ceil(line.length / chunk), line.length % chunk], [571577, 19, 13577]);
  // One character a byte, so the characters the listener counts are the bytes that went out.
  assert.equal(lab.require_(answers_(1)).length, line.length);
  assert.equal(written(answers_(1)).length, 6);
  const announced = JSON.parse(new TextDecoder().decode(lab.require_(ANNOUNCEMENT)).slice('Response,'.length)) as { errorCode: unknown };
  assert.equal(announced.errorCode, 200);
  const r = reply(reply_(1));
  assert.deepEqual([r.errorCode, r.mime], ['200', WRITE]);
});

test('every other write was replied 200 naming the write, and each was shorter than one chunk', lab.skipUnless(HAND_OVER_REPLY, ...ANSWERED.map(reply_), ...ANSWERED.map(answers_)), () => {
  for (const f of [HAND_OVER_REPLY, ...ANSWERED.map(reply_)]) {
    const r = reply(f);
    assert.deepEqual([r.errorCode, r.mime], ['200', WRITE], f);
  }
  for (const n of ANSWERED.filter((m) => m !== 1)) assert.ok(lab.require_(answers_(n)).length < 31000, `list ${n}`);
});

test('the ten pictures came with exactly the tags the second sync saw, at the same addresses', lab.skipUnless(list_(7), SECOND_LIST_7), () => {
  assert.deepEqual(list(list_(7)).map((r) => [r.uri, r.etag]), list(SECOND_LIST_7).map((r) => [r.uri, r.etag]));
});

test('the configuration hash afterwards is the set\'s four tags joined, and not the hash the remote held before', lab.skipUnless(AFTER, BEFORE_SEEN, SET), () => {
  const after = reply(AFTER);
  assert.deepEqual([after.errorCode, after.mime], ['200', CONFIGHASH]);
  const tags = new Map(theSet().map((a) => [resource(a.uri), a.etag]));
  assert.equal(after.result, `result=${HASHED.map((d) => tags.get(d)!).join('')}`);
  assert.notEqual(after.result, reply(BEFORE_SEEN).result);
});

test('the third run asked for the six with exactly the set\'s tags, MapList and Settings included', lab.skipUnless(third_(1), SET), () => {
  const set = theSet();
  assert.deepEqual(list(third_(1)).map((r) => [r.uri, r.etag]), set.map((a) => [a.uri, a.etag]));
});

test('the third run handed up nothing and answered every request 304 or the finish, in the same eight lists', lab.skipUnless(THIRD_HAND_OVER_LIST, THIRD_HAND_OVER_ANSWERS, ...LISTS.map(third_), ...ANSWERED.map(thirdAnswers_)), () => {
  assert.deepEqual(list(THIRD_HAND_OVER_LIST).map((r) => [r.verb, r.uri, 'etag' in r]), [['POST', FINISHED, false]]);
  assert.deepEqual(written(THIRD_HAND_OVER_ANSWERS).map((a) => [a.statusCode, a.uri]), [['200', FINISHED]]);
  assert.deepEqual(LISTS.map((n) => list(third_(n)).map((r) => kind(r.uri))), SHAPE);
  for (const n of ANSWERED) checkAnswers(list(third_(n)), written(thirdAnswers_(n)), `third run, list ${n}`);
  const all = ANSWERED.flatMap((n) => written(thirdAnswers_(n)));
  assert.deepEqual(['200', '304'].map((s) => all.filter((a) => a.statusCode === s).length), [1, 19]);
});
