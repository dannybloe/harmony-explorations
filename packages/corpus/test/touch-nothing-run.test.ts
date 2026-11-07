/**
 * The 9.4 run rehearsed on the fake remote, `todo-touch.md` 9.4: the set built from nothing delivered to a Harmony Touch
 * that holds what the bench Touch holds after 9.2, then the put back, then a closing `--unchanged` run, through the real
 * answerer and session, served the request lists **9.2's closing run recorded**, `reads/20261107T1138Z-touch-sync-unchanged`.
 *
 * **Why those lists.** That run is the last sync the bench Touch answered: 9.2's put back had committed the six of 8.6's
 * put back with the favourites documents delivered again, and the closing run answered everything 304, so what it
 * asked is what the remote holds and will ask at 9.4's start. Its first list asked for the six with the tags of
 * `9.1-nothing-back`, which is 8.6's put back, content and tags; its three favourites requests were untagged, as every
 * sync through a computer asks them; and its picture list asked for the person's background and its twin and the eight
 * logos, each with the tag the remote holds.
 *
 * **What is held.**
 *
 * 1. **The recorded lists are the remote this run meets**: the first asks for the six with `9.1-nothing-back`'s tags,
 *    the favourites three untagged, the picture list ten, all tagged, the two backgrounds first.
 * 2. **The forward run, `9.1-nothing` on that remote**: the first list as recorded, and the picture list with our
 *    background and its twin in place of the person's, untagged, since our Settings names ours and the remote holds
 *    neither. All six 200 with the set's content and tags in one write of 381470 characters, 13 chunks; the three
 *    favourites 304, which keeps the remote's own copies; our two pictures 200 and the eight logos 304 in one write of
 *    5288 characters; the finish; `finished`. No chunk carries `Content-Length`.
 * 3. **The put back, `9.1-nothing-back` on a remote holding `9.1-nothing`**, its first list asking with our set's tags
 *    and its picture list as recorded, the person's backgrounds asked with the tags the remote kept: all six 200 with
 *    the put back's content and tags in one write of 571577 characters, 19 chunks; the favourites, the backgrounds and
 *    the logos 304; the finish; `finished`.
 * 4. **The closing `--unchanged` run on a remote holding the put back** is the recorded run itself: every answer 304
 *    but the finish.
 * 5. **The control**: `9.1-nothing` on a remote that already holds it, our backgrounds asked with our tags, is answered
 *    304 for everything but the finish, so the 200s above come from the tags and not from the answerer.
 *
 * **What the fake does not model**: what the remote does with the set, which is the bench run; and whether a 304 to a
 * favourites request finds a copy to keep, which 9.2 measured it does when the remote holds one: 9.2's put back
 * delivered the three again, and the closing run's 304 kept them.
 *
 * **Sources checked first.** The 9.3 and 9.4 brief in the lab, 9.2's preflight and its runs, `touch-nothing-set.test.ts`
 * whose fake remote rehearsal on 8.6's closing lists this repeats on 9.2's. Logitech's client was not consulted.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330; its firmware reports 17 and Logitech's templates file it
 * under 18. The recorded run is read by its fixtures, `touch_empty_unchanged_handover_list` and
 * `touch_empty_unchanged_list_1` to `_8`, named when 9.2 landed; nothing here prints a tag or an address.
 *
 * **The run it rehearsed, 9.4, went as rehearsed**: the forward run's six in one write of 381470 characters, 13 chunks,
 * our two pictures 200 in one of 5288, the put back's six in 571577, 19 chunks, every other answer 304 but the finish,
 * and the closing run 304 throughout, `packages/bench/test/touch-from-nothing-runs.test.ts`.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { harmonyTouch } from '@harmony/codec';
import * as lab from '@harmony/lab';

import { writeOfAnswersSize } from '../experiments/touchchangedset.ts';
import { NOTHING_DOCUMENTS } from '../experiments/touchnothingset.ts';
import { keyOf, resultOf, type RemoteRequest, type TouchSet, type TouchSyncOutcome } from '../src/touchsync.ts';
import type { Scenario } from './touch-sync-run.ts';

/** The set 9.1 built and its put back, by fixture. */
const BUILT = 'touch_nothing_set';
const BUILT_BACK = 'touch_nothing_set_back';
/** 9.2's closing run, by fixture: the hand over's list, and the eight lists of the sync down. */
const HAND_OVER = 'touch_empty_unchanged_handover_list';
const LISTS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `touch_empty_unchanged_list_${n}`);

const json = (fixture: string): unknown => JSON.parse(new TextDecoder().decode(lab.require_(fixture)));
const requestsOf = (fixture: string): RemoteRequest[] => {
  const requests = resultOf(new TextDecoder().decode(lab.require_(fixture)))?.['requests'];
  assert.ok(Array.isArray(requests), fixture);
  return requests as RemoteRequest[];
};
const answer = (set: TouchSet, key: string) => set.answers.find((a) => keyOf(a.uri) === key)!;

interface Run {
  readonly outcome: TouchSyncOutcome;
  readonly lines: { readonly name: string; readonly answers?: Record<string, unknown>[] }[];
}

/** One run of the answerer in a process of its own with the two request flags set, as `touch-sync.test.ts` runs it. */
function run(scenario: Scenario): Run {
  const script = fileURLToPath(new URL('./touch-sync-run.ts', import.meta.url));
  const out = execFileSync(process.execPath, [script], {
    input: JSON.stringify(scenario),
    env: { ...process.env, HARMONY_ENABLE_WRITES: '1', HARMONY_TOUCH_REQUESTS: '1', HARMONY_TOUCH_RECOVERY: '' },
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
  return JSON.parse(out) as Run;
}

/**
 * The closing run's lists, the first asking with the tags of `held` when given, and the two background requests
 * replaced by `backgrounds` when given: what the screens ask once a Settings naming other backgrounds is stored.
 */
function lists(held?: TouchSet, backgrounds?: readonly { readonly uri: string; readonly etag?: string }[]): RemoteRequest[][] {
  const out = LISTS.map(requestsOf);
  if (held !== undefined) out[0] = out[0]!.map((r) => ({ ...r, etag: answer(held, keyOf(r.uri)).etag! }));
  if (backgrounds === undefined) return out;
  let next = 0;
  return out.map((list) => list.map((r) => {
    if (!r.uri.startsWith('https://')) return r;
    const { etag: _, ...bare } = r;
    const b = backgrounds[next++]!;
    return { ...bare, uri: b.uri, ...(b.etag === undefined ? {} : { etag: b.etag }) };
  }));
}

/** Our background and its twin as the screens ask for them: untagged on a remote holding neither, else with our tags. */
function ourBackgrounds(tagged?: TouchSet): { uri: string; etag?: string }[] {
  const b = harmonyTouch.ourBackground();
  return [b.addresses.picture, b.addresses.twin].map((uri) => ({ uri, ...(tagged === undefined ? {} : { etag: answer(tagged, uri).etag! }) }));
}

const syncAnswers = (r: Run): Record<string, unknown>[] =>
  r.lines.slice(r.lines.findIndex((l) => l.name === 'setup/sync')).flatMap((l) => l.answers ?? []);

/** The answers of a run by kind and status, in order. */
function summary(r: Run): string[] {
  return syncAnswers(r).map((a) => {
    const uri = a['uri'] as string;
    const what = uri.startsWith('harmony://') ? harmonyTouch.documentKeyOf(uri)! : uri.startsWith('content://') ? 'favourites'
      : uri.startsWith('proxy://') ? 'finish' : uri.startsWith('https://') ? 'background' : 'logo';
    return `${what} ${String(a['statusCode'])}`;
  });
}

/** The write of a run that answers the six, and the one that answers the pictures. */
const writeOf = (r: Run, scheme: string) => r.lines.find((l) => (l.answers ?? []).some((a) => String(a['uri']).startsWith(scheme)))!;
const sizeOf = (r: Run, scheme: string): [number, number] => {
  const size = writeOfAnswersSize(writeOf(r, scheme).answers!);
  assert.ok(!size.line.includes('Content-Length'), scheme);
  return [size.length, size.chunks];
};

const SIX: readonly string[] = NOTHING_DOCUMENTS;
const SHAPE = ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList',
  'favourites', 'favourites', 'favourites', 'background', 'background', ...Array(8).fill('logo'), 'finish'];

describe('9.4 on the fake remote, served 9.2\'s closing lists: the set from nothing, its put back and a closing run',
  { skip: lab.needing(lab.skipUnless(BUILT, BUILT_BACK, HAND_OVER, ...LISTS)).skip }, () => {
    it('the recorded lists: the six asked with the put back\'s tags, the favourites three untagged, ten pictures with tags', () => {
      const back = json(BUILT_BACK) as TouchSet;
      assert.deepEqual(requestsOf(LISTS[0]!).map((r) => [keyOf(r.uri), r.etag === answer(back, keyOf(r.uri)).etag]), SIX.map((d) => [d, true]));
      const favourites = LISTS.flatMap(requestsOf).filter((r) => r.uri.startsWith('content://'));
      assert.deepEqual(favourites.map((r) => r.etag === undefined || r.etag === ''), [true, true, true]);
      const pictures = LISTS.flatMap(requestsOf).filter((r) => r.uri.startsWith('https://') || r.uri.startsWith('content-image://'));
      assert.deepEqual(pictures.map((r) => [r.uri.startsWith('https://'), typeof r.etag === 'string' && r.etag.length > 0]),
        [[true, true], [true, true], ...Array(8).fill([false, true])]);
    });

    it('the forward run: all six 200 in 13 chunks, the favourites 304, our two pictures 200 and the logos 304, finished', () => {
      const ours = json(BUILT) as TouchSet;
      const r = run({ mode: { kind: 'set', set: ours }, handOver: [requestsOf(HAND_OVER)], sync: lists(undefined, ourBackgrounds()) });
      assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
      assert.deepEqual(summary(r), SHAPE.map((w) => `${w} ${SIX.includes(w) || w === 'background' || w === 'finish' ? 200 : 304}`));
      for (const a of syncAnswers(r).filter((x) => /^(harmony|https):\/\//.test(String(x['uri'])))) {
        const mine = answer(ours, keyOf(a['uri'] as string));
        assert.ok(a['etag'] === mine.etag && isDeepStrictEqual(a['resource'], mine.resource), keyOf(a['uri'] as string).startsWith('https') ? 'a background' : keyOf(a['uri'] as string));
      }
      assert.deepEqual([sizeOf(r, 'harmony://'), sizeOf(r, 'https://')], [[381470, 13], [5288, 1]]);
    });

    it('the put back on a remote holding our set: all six 200 with the put back\'s content and tags in 19 chunks, everything else 304, finished', () => {
      const ours = json(BUILT) as TouchSet;
      const back = json(BUILT_BACK) as TouchSet;
      const r = run({ mode: { kind: 'set', set: back }, handOver: [requestsOf(HAND_OVER)], sync: lists(ours) });
      assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
      assert.deepEqual(summary(r), SHAPE.map((w) => `${w} ${SIX.includes(w) || w === 'finish' ? 200 : 304}`));
      for (const a of syncAnswers(r).filter((x) => String(x['uri']).startsWith('harmony://'))) {
        const was = answer(back, keyOf(a['uri'] as string));
        assert.ok(a['etag'] === was.etag && isDeepStrictEqual(a['resource'], was.resource), keyOf(a['uri'] as string));
      }
      assert.deepEqual(sizeOf(r, 'harmony://'), [571577, 19]);
    });

    it('the closing run on a remote holding the put back is the recorded one: every answer 304 but the finish', () => {
      const r = run({ mode: { kind: 'unchanged' }, handOver: [requestsOf(HAND_OVER)], sync: lists() });
      assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
      assert.deepEqual(summary(r), SHAPE.map((w) => `${w} ${w === 'finish' ? 200 : 304}`));
    });

    it('the control: our set on a remote that holds it, our backgrounds asked with our tags, is answered 304 but the finish', () => {
      const ours = json(BUILT) as TouchSet;
      const r = run({ mode: { kind: 'set', set: ours }, handOver: [requestsOf(HAND_OVER)], sync: lists(ours, ourBackgrounds(ours)) });
      assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
      assert.deepEqual(summary(r), SHAPE.map((w) => `${w} ${w === 'finish' ? 200 : 304}`));
    });
  });
