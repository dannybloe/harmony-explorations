/**
 * The second sync of a Harmony Touch answered by a program of this project, the first one the remote committed,
 * as measured on the bench unit.
 *
 * **What was run.** `packages/corpus/bin/touch-sync.ts --unchanged --commit`, after the first run of
 * `touch-first-sync.test.ts` had stopped at the favourites and been recovered by abort and restart, and after
 * the answerer had learnt to answer every favourites request 304, `tests/harmony_touch/test_harmony_touch_favourites_untagged.py`.
 * Around it, the configuration hash read through the request rail, once before and once after. The answerer's
 * own log ended `sync: finished`; this file reads what the remote handed out and what was written to it, not
 * the log.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **The hand over handed up nothing**: its one request list held `proxy://Finished` alone, untagged, and
 *    our answer to it was that address with 200 and no tag. Nothing had been changed on the remote since the
 *    first run's hand over, which had handed up Settings, so this is the reading of `answering-a-sync.md`
 *    that only a change on the remote queues a document, met from the other side.
 * 2. **The sync asked for the six with tags, exactly the first run's**: the six addresses and the six tags
 *    equal the first run's first list, Settings' included, which is the tag the first run's hand over answer
 *    wrote. The two ends are our earlier write and the remote's later report of its store. What this does not
 *    settle is whether the stored Settings document is the one handed up then: the configuration hash leaves
 *    Settings out, and its content was not read.
 * 3. **The three favourites documents, the user's, the tuning device's and the provider's line up, were each
 *    asked for without a tag**, one list each, at the addresses the recorded full sync had answered with 200 and
 *    a tag. Each was answered 304 with a tag of ours, a version 8 identifier, `keptCopyTag` in
 *    `packages/corpus/src/touchsync.ts`, and the remote went on. That all three came untagged is what the
 *    reading in `test_harmony_touch_favourites_untagged.py` predicts, the screens reading a favourites file
 *    from the set being gathered; it does not by itself exclude the earlier reading of the lab's
 *    `6.7-preflight.md`, that the tag is sent only when the file and its index entry exist, since nothing read
 *    on the unit says which favourites files the remote holds. Both stay named and the cause stays open.
 * 4. **The ten pictures were asked for with tags, every one the tag the full sync had delivered for it with
 *    200**, at the same ten addresses in the same order, where the full sync had asked for all ten untagged.
 *    That is the reading's prediction that a picture already held is asked for tagged, the screens taking its
 *    tag straight from the committed index, now seen. Each was answered 304 echoing its tag.
 * 5. **The sync ran to its end**: list 8 was `proxy://Finished`, which the remote queues only after its
 *    screens have committed the new set, `answering-a-sync.md`, and our answer to it was 200. Every write of
 *    answers was replied 200 naming the write. **So a sync driven end to end by a program of ours was
 *    committed by a Touch.**
 * 6. **The configuration hash was the same before and after**, and the same as the first read, `touch-confighash.test.ts`, so the
 *    four tags it carries (activity, device and protocol lists and the context) did not move. It leaves out
 *    the button map list and Settings, which item 2 covers for the run before.
 *
 * What the person at the bench reported after the run, that the remote starts normally and the favourites are
 * still there, is in `docs/test-notes/harmony-touch.md` and not here: nothing here reads the screen.
 *
 * **What would have falsified each**: a document handed up; any of the six untagged or with a tag other than
 * the first run's; a favourites request carrying a tag, or one at a new address; a picture untagged or with a
 * tag the full sync did not deliver; a sync ending in `proxy://Abort`, or a write not replied as a write; a
 * hash that moved.
 *
 * **Sources checked first.** `reference/architectures/harmony-touch/answering-a-sync.md` and
 * `favourites-and-settings.md`, `touch-first-sync.test.ts` and `test_harmony_touch_favourites_untagged.py`,
 * the lab's `6.7-preflight.md` and `6.7-favourites-brief.md`. Logitech's client was not consulted: what is
 * measured here is the remote's side of a sync it plays no part in. **Width**: one unit, firmware 4.15.330,
 * one run, provisioning mode 0.
 *
 * The reads hold tags, the account's numbers and the household's addresses: this file asserts equalities,
 * counts and shapes and prints none of them.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { CONFIGHASH, FINISHED, OURS, WRITE, answersWritten, commands, hasTag, kind, list, records, reply, requestLists, resource, sessions, SIX, written } from '@harmony/testkit/touch-recording';

const FULL = 'touch_full_sync_recording';
const FIRST_LIST = 'touch_first_sync_list';
const FIRST_HAND_OVER_ANSWERS = 'touch_first_sync_handover_answers';
const HASH_64 = 'touch_confighash_read';
const BEFORE = 'touch_second_sync_confighash_before';
const AFTER = 'touch_second_sync_confighash_after';
const HAND_OVER_LIST = 'touch_second_sync_handover_list';
const HAND_OVER_ANSWERS = 'touch_second_sync_handover_answers';
const HAND_OVER_REPLY = 'touch_second_sync_handover_reply';

/** The sync's lists in the order the remote handed them out, and whether each carried requests to answer. */
const LISTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const ANSWERED = [1, 3, 4, 5, 7, 8] as const;
const list_ = (n: number): string => `touch_second_sync_list_${n}`;
const answers_ = (n: number): string => `touch_second_sync_answers_${n}`;
const reply_ = (n: number): string => `touch_second_sync_reply_${n}`;

function fullSync() {
  const hlapi = sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi');
  return { answers: answersWritten(hlapi), asked: requestLists(hlapi).flat() };
}

test('the configuration hash was read 200 before and after, the same both times and the same as the first read\'s', lab.skipUnless(BEFORE, AFTER, HASH_64), () => {
  const before = reply(BEFORE);
  const after = reply(AFTER);
  assert.deepEqual([before.errorCode, before.mime], ['200', CONFIGHASH]);
  assert.deepEqual([after.errorCode, after.mime], ['200', CONFIGHASH]);
  assert.equal(typeof before.result, 'string');
  assert.equal(after.result, before.result);
  assert.equal(before.result, reply(HASH_64).result);
});

test('the hand over handed up nothing: its list was proxy://Finished alone, answered 200 with no tag', lab.skipUnless(HAND_OVER_LIST, HAND_OVER_ANSWERS, HAND_OVER_REPLY), () => {
  const handed = list(HAND_OVER_LIST);
  assert.deepEqual(handed.map((r) => [r.verb, r.uri, 'etag' in r]), [['POST', FINISHED, false]]);
  assert.deepEqual(written(HAND_OVER_ANSWERS).map((a) => [a.statusCode, a.uri, 'etag' in a]), [['200', FINISHED, false]]);
  const r = reply(HAND_OVER_REPLY);
  assert.deepEqual([r.errorCode, r.mime], ['200', WRITE]);
});

test('the sync handed out eight lists: the six, none, three favourites one by one, none, ten pictures, the finish', lab.skipUnless(...LISTS.map(list_)), () => {
  const shape = LISTS.map((n) => list(list_(n)).map((r) => kind(r.uri)));
  assert.deepEqual(shape, [
    Array(6).fill('document'),
    [],
    ['user favourites'],
    ['device favourites'],
    ['line up'],
    [],
    Array(10).fill('picture'),
    ['finished'],
  ]);
  assert.deepEqual(list(list_(1)).map((r) => resource(r.uri)), SIX);
  for (const n of [1, 3, 4, 5, 7]) for (const r of list(list_(n))) assert.equal(r.verb, 'get', `list ${n}`);
  assert.equal(list(list_(8))[0]!.verb, 'POST');
});

test('which requests carried a tag: the six and the ten pictures every one, the favourites and the finish none', lab.skipUnless(...LISTS.map(list_)), () => {
  const tagged = LISTS.map((n) => list(list_(n)).map(hasTag));
  assert.deepEqual(tagged, [
    Array(6).fill(true),
    [],
    [false],
    [false],
    [false],
    [],
    Array(10).fill(true),
    [false],
  ]);
});

test('every request was answered in order: 304 echoing the tag, 304 with a tag of ours for the favourites, 200 to the finish', lab.skipUnless(...ANSWERED.map(list_), ...ANSWERED.map(answers_)), () => {
  for (const n of ANSWERED) {
    const asked = list(list_(n));
    const ours = written(answers_(n));
    assert.deepEqual(ours.map((a) => a.uri), asked.map((r) => r.uri), `list ${n}: the same addresses in the same order`);
    for (const [i, a] of ours.entries()) {
      const r = asked[i]!;
      if (kind(r.uri) === 'finished') {
        assert.deepEqual([a.statusCode, 'etag' in a], ['200', false]);
      } else if (hasTag(r)) {
        assert.deepEqual([a.statusCode, a.etag], ['304', r.etag], `list ${n}: the tag echoed`);
      } else {
        assert.equal(a.statusCode, '304', `list ${n}: an untagged favourites request kept`);
        assert.match(a.etag ?? '', OURS, `list ${n}: a tag of ours`);
      }
    }
  }
  // Every 304 carries a tag, which the remote demands of a favourites answer and aborts the sync without.
  const all = ANSWERED.flatMap((n) => written(answers_(n)));
  assert.equal(all.length, 20);
  assert.deepEqual(all.filter((a) => a.statusCode === '304').map(hasTag), Array(19).fill(true));
  // The three kept copies' tags differ, each a digest of its own address.
  const kept = [3, 4, 5].map((n) => written(answers_(n))[0]!.etag);
  assert.equal(new Set(kept).size, 3);
});

test('every write of answers was replied 200 naming the write, and each was shorter than one chunk', lab.skipUnless(HAND_OVER_REPLY, HAND_OVER_ANSWERS, ...ANSWERED.map(reply_), ...ANSWERED.map(answers_)), () => {
  for (const f of [HAND_OVER_REPLY, ...ANSWERED.map(reply_)]) {
    const r = reply(f);
    assert.deepEqual([r.errorCode, r.mime], ['200', WRITE], f);
  }
  // A chunk is 31000 characters, `touchsession.ts`: no write of this run met the boundary either.
  for (const f of [HAND_OVER_ANSWERS, ...ANSWERED.map(answers_)]) assert.ok(lab.require_(f).length < 31000, f);
});

test('the six carried exactly the first run\'s tags, Settings the one the first run\'s hand over answer wrote', lab.skipUnless(list_(1), FIRST_LIST, FIRST_HAND_OVER_ANSWERS), () => {
  const now = list(list_(1));
  const then = list(FIRST_LIST);
  assert.deepEqual(now.map((r) => [r.uri, r.etag]), then.map((r) => [r.uri, r.etag]));
  const settings = now.find((r) => resource(r.uri) === 'Settings')!;
  assert.equal(settings.etag, written(FIRST_HAND_OVER_ANSWERS)[0]!.etag);
});

test('the favourites came untagged at addresses the full sync had answered 200 with a tag', lab.skipUnless(list_(3), list_(4), list_(5), FULL), () => {
  const { answers } = fullSync();
  for (const n of [3, 4, 5]) {
    const asked = list(list_(n))[0]!;
    const delivered = answers.filter((a) => a.uri === asked.uri);
    assert.deepEqual(delivered.map((a) => [a.statusCode, hasTag(a)]), [['200', true]], `list ${n}`);
  }
});

test('the ten pictures came tagged, each with the tag the full sync delivered at 200, where that sync asked untagged', lab.skipUnless(list_(7), FULL), () => {
  const { answers, asked } = fullSync();
  const pictures = list(list_(7));
  const delivered = answers.filter((a) => kind(a.uri) === 'picture');
  assert.deepEqual(pictures.map((r) => r.uri), delivered.map((a) => a.uri), 'the same ten addresses in the same order');
  assert.deepEqual(delivered.map((a) => a.statusCode), Array(10).fill('200'));
  assert.deepEqual(pictures.map((r, i) => r.etag === delivered[i]!.etag), Array(10).fill(true));
  // The contrast: the full sync, on a remote that held none of them, asked for every one without a tag.
  assert.deepEqual(asked.filter((q) => kind(q.uri) === 'picture').map((q) => 'etag' in q), Array(10).fill(false));
});
