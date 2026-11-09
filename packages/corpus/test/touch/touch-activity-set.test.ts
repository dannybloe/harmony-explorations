/**
 * A Harmony Touch set with an activity of ours added, and the set that takes it out again, `todo-touch.md` 8.2:
 * `changeDocuments` and `chainTags` in `experiments/touchchangedset.ts` and `bin/touch-device-set.ts --activity`, the
 * composing being the codec's (`composeTouchActivity`, `withTouchActivity`, `withoutTouchActivity`,
 * `test/families/harmony-touch/touch-activity-add.test.ts` there).
 *
 * **What has to hold, and why each test is here.**
 *
 * 1. **An activity changes two documents and only those are retagged.** It lives in `ActivityList` and `MapList`;
 *    `Context` and `Settings` name no activity, and no other document names one by id, measured on the bench set
 *    below: each activity id occurs in `ActivityList` once and in `MapList` only as its map's identifier, its map's
 *    `ActivityId-` and inside a screen entry's `MenuItem.MenuName`, and in the other four not at all. So a remote
 *    that committed the source is answered 304 for four documents and 200 for two.
 * 2. **The chain's tags reach past an activity set**, so a later set built from one of 8.2's cannot reuse a tag the
 *    chain stated; `chainTags` follows the record's `activity` and `removedActivity`.
 * 3. **On the fake remote, through the real answerer and session, the bench run is rehearsed**: the request lists
 *    of the closing `--unchanged` run of 8.1 served as recorded, the remote asking for the six with the tags of 8.1's
 *    put back, which is what the bench Touch holds; the activity set answers `ActivityList` and `MapList` 200 with its
 *    content and tags, the other four 304, the three favourites 304, the ten pictures 304, and the run finishes. The
 *    put back is rehearsed the same way with the remote holding the activity set, and its content is 8.1's put back's,
 *    as parsed JSON. **The control** is the activity set answered to a remote holding it already: every request 304.
 *
 * **Sources checked first.** The 8.2 brief in the lab and the 8.1 preflight it follows; `touch-device-set.test.ts`,
 * whose shape this is; `touchsync.ts` (`answerOf`, `prepareSet`, `setTag`); the recorded lists of 8.1's closing run.
 * Logitech's client was not consulted.
 *
 * **Width.** One model, the Harmony Touch, firmware 4.15.330; its firmware reports architecture 17 and Logitech's
 * templates file it under 18. The lab half reads the bench sets and the recorded lists, prints nothing out of them
 * and touches no remote. The two 8.2 sets are read by fixture, `touch_activity_set` and `touch_activity_set_back`, and
 * what the remote did with them is `packages/bench/test/harmony-touch/touch-activity-runs.test.ts`.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

// The Node entry, for the fonts, the icons, the deflate and the SHA-256 the core asks its loader for.
import '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';
import * as lab from '@harmony/lab';

import { chainTags, changeDocuments, setDifferences } from '../../experiments/touchchangedset.ts';
import { keyOf, resultOf, setTag, type RemoteRequest, type TouchSet, type TouchSyncOutcome } from '../../src/touchsync.ts';
import type { Scenario } from './touch-sync-run.ts';

/** The activity of 8.2, read from the file the bench set is built from. */
const DESCRIPTION = fileURLToPath(new URL('../../touch-activities/test-cinema.json', import.meta.url));
const cinema = (): harmonyTouch.OwnActivity => (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { activity: harmonyTouch.OwnActivity }).activity;

const TWO = ['ActivityList', 'MapList'];

function added(set: TouchSet, name: string, tagsInPlay: Iterable<string> = []): TouchSet {
  const docs = harmonyTouch.documentsOfAnswers(set.answers);
  const documents = harmonyTouch.withTouchActivity(docs, harmonyTouch.composeTouchActivity(cinema(), docs));
  const result = changeDocuments({ set, documents: { ...documents }, name, tagsInPlay });
  assert.ok(!('refusals' in result), 'refusals' in result ? result.refusals.join('; ') : '');
  return result.set;
}

function removed(set: TouchSet, name: string, tagsInPlay: Iterable<string> = []): TouchSet {
  const documents = harmonyTouch.withoutTouchActivity(harmonyTouch.documentsOfAnswers(set.answers), cinema().id);
  const result = changeDocuments({ set, documents: { ...documents }, name, tagsInPlay });
  assert.ok(!('refusals' in result), 'refusals' in result ? result.refusals.join('; ') : '');
  return result.set;
}

describe('the chain of sets', () => {
  it('follows an activity set\'s record and its put back\'s to the first', () => {
    const answer = (etag: string) => ({ answers: [{ uri: 'a', 'body-type': 'application/json' as const, etag, resource: {} }] });
    const sets: Record<string, { set: TouchSet; record: Record<string, unknown> }> = {
      first: { set: answer('t1'), record: {} },
      device: { set: answer('t2'), record: { from: 'first', device: {} } },
      activity: { set: answer('t3'), record: { from: 'device', activity: {} } },
      back: { set: answer('t4'), record: { from: 'activity', removedActivity: 900000003 } },
    };
    assert.deepEqual([...chainTags('back', (at) => sets[at]!)].sort(), ['t1', 't2', 't3', 't4']);
  });
});

// ---------------------------------------------------------------------------------------------------
// The bench sets, rehearsed on the fake remote through the real answerer and session
// ---------------------------------------------------------------------------------------------------

/** What the bench Touch holds since 8.1's put back, and 8.1's closing `--unchanged` run, by fixture. */
const SOURCE = 'touch_device_set_back';
const CLOSING = 'touch_device_unchanged_';
const CLOSING_LISTS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${CLOSING}list_${n}`);
const HAND_OVER_LIST = `${CLOSING}handover_list`;
/** The two sets 8.2 built in the lab and delivered to the bench Touch, by fixture, for the comparison with what this derivation gives. */
const BUILT = 'touch_activity_set';
const BUILT_BACK = 'touch_activity_set_back';

const json = (fixture: string): unknown => JSON.parse(new TextDecoder().decode(lab.require_(fixture)));
const requestsOf = (fixture: string): RemoteRequest[] => {
  const result = resultOf(new TextDecoder().decode(lab.require_(fixture)));
  const requests = result?.['requests'];
  assert.ok(Array.isArray(requests), fixture);
  return requests as RemoteRequest[];
};

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

/** The closing run's lists, the first one asking with the tags of `held` in place of the recorded ones. */
function listsHolding(held: TouchSet): RemoteRequest[][] {
  const lists = CLOSING_LISTS.map(requestsOf);
  lists[0] = lists[0]!.map((r) => ({ ...r, etag: held.answers.find((a) => keyOf(a.uri) === keyOf(r.uri))!.etag! }));
  return lists;
}

const syncAnswers = (r: Run): Record<string, unknown>[] =>
  r.lines.slice(r.lines.findIndex((l) => l.name === 'setup/sync')).flatMap((l) => l.answers ?? []);

/** The answers of a run by kind and status, in order: a document by name, else what the address is. */
function summary(r: Run): string[] {
  return syncAnswers(r).map((a) => {
    const uri = a['uri'] as string;
    const key = harmonyTouch.documentKeyOf(uri);
    const what = uri.startsWith('harmony://') ? key! : uri.startsWith('content://') ? 'favourites' : uri.startsWith('proxy://') ? 'finish' : 'picture';
    return `${what} ${String(a['statusCode'])}`;
  });
}

const RECORDED_SHAPE = [
  'ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList',
  'favourites', 'favourites', 'favourites', ...Array(10).fill('picture'), 'finish',
];

describe('on the fake remote, the bench run and its put back', { skip: lab.needing(lab.skipUnless(SOURCE, HAND_OVER_LIST, ...CLOSING_LISTS)).skip }, () => {
  // Built on first use, so a run without the lab never reads it.
  let built: { source_: TouchSet; withActivity: TouchSet; back: TouchSet } | undefined;
  const sets = () => {
    if (built === undefined) {
      const source_ = json(SOURCE) as TouchSet;
      const withActivity = added(source_, '8.2-activity');
      built = { source_, withActivity, back: removed(withActivity, '8.2-activity-back') };
    }
    return built;
  };

  it('no document but the activity list and the map list names an activity by id, on the set the remote holds', () => {
    const { source_ } = sets();
    const ids = (harmonyTouch.documentsOfAnswers(source_.answers).ActivityList!.Activities).map((a) => String(a['Id-']));
    assert.equal(ids.length, 5);
    for (const a of source_.answers) {
      const text = JSON.stringify(a.resource);
      const count = ids.reduce((n, id) => n + text.split(id).length - 1, 0);
      if (keyOf(a.uri) === 'ActivityList') assert.equal(count, 5, 'each id once');
      else if (keyOf(a.uri) !== 'MapList') assert.equal(count, 0, keyOf(a.uri));
    }
    // In the map list, where each id is the map's identifier, its ActivityId- and part of a screen entry's MenuName.
    const where = new Set<string>();
    const walk = (x: unknown, key: string): void => {
      if (Array.isArray(x)) x.forEach((y) => walk(y, key));
      else if (x !== null && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, k);
      else if (ids.some((id) => String(x).includes(id))) where.add(key);
    };
    walk(harmonyTouch.documentsOfAnswers(source_.answers).MapList, '');
    assert.deepEqual([...where].sort(), ['ActivityId-', 'ButtonMapIdentifier', 'MenuName']);
  });

  it('the activity set retags exactly the two documents it changes, and its put back is the source\'s content under tags of its own', () => {
    const { source_, withActivity, back } = sets();
    const diff = setDifferences(source_, withActivity);
    assert.deepEqual(diff.filter((d) => d.values.length > 0).map((d) => d.document), TWO);
    assert.deepEqual(diff.filter((d) => d.tagChanged).map((d) => d.document), TWO);
    for (const a of withActivity.answers) if (TWO.includes(keyOf(a.uri))) assert.equal(a.etag, setTag(a, '8.2-activity'));
    assert.ok(setDifferences(source_, back).every((d) => d.values.length === 0));
    for (const name of TWO) {
      const tags = [source_, withActivity, back].map((s) => s.answers.find((a) => keyOf(a.uri) === name)!.etag);
      assert.equal(new Set(tags).size, 3, name);
    }
  });

  it('the sets the lab holds are the ones this derivation gives, as parsed JSON, tags and all', lab.skipUnless(BUILT, BUILT_BACK), () => {
    const { withActivity, back } = sets();
    assert.deepEqual(json(BUILT), JSON.parse(JSON.stringify(withActivity)));
    assert.deepEqual(json(BUILT_BACK), JSON.parse(JSON.stringify(back)));
  });

  it('the recorded closing run of 8.1 asked for the six with the source\'s tags, so the remote holds the source', () => {
    const { source_ } = sets();
    const first = requestsOf(CLOSING_LISTS[0]!);
    assert.deepEqual(first.map((r) => [keyOf(r.uri), r.etag === source_.answers.find((a) => keyOf(a.uri) === keyOf(r.uri))!.etag]),
      ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList'].map((d) => [d, true]));
  });

  it('the activity set: the two 200 with its content and tags, the other four 304, favourites and pictures 304, finished', () => {
    const { source_, withActivity } = sets();
    const r = run({ mode: { kind: 'set', set: withActivity }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(source_) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${TWO.includes(w) || w === 'finish' ? 200 : 304}`));
    for (const a of syncAnswers(r).filter((x) => x['statusCode'] === '200' && String(x['uri']).startsWith('harmony://'))) {
      const ours = withActivity.answers.find((x) => keyOf(x.uri) === keyOf(a['uri'] as string))!;
      assert.equal(a['etag'], ours.etag);
      assert.deepEqual(a['resource'], ours.resource);
    }
  });

  it('the put back on a remote holding the activity set: the two 200 with the source\'s content, the rest as before, finished', () => {
    const { source_, withActivity, back } = sets();
    const r = run({ mode: { kind: 'set', set: back }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(withActivity) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${TWO.includes(w) || w === 'finish' ? 200 : 304}`));
    for (const a of syncAnswers(r).filter((x) => x['statusCode'] === '200' && String(x['uri']).startsWith('harmony://'))) {
      assert.deepEqual(a['resource'], source_.answers.find((x) => keyOf(x.uri) === keyOf(a['uri'] as string))!.resource);
    }
  });

  it('the activity set on a remote holding it already: every request 304 but the finish, the control', () => {
    const { withActivity } = sets();
    const r = run({ mode: { kind: 'set', set: withActivity }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(withActivity) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${w === 'finish' ? 200 : 304}`));
  });
});
