/**
 * The Harmony Touch removal set: Listen to Music and the Denon AV Receiver, an activity and a device of
 * the remote's own, taken out of the set the bench Touch holds with everything that names them, and the put back,
 * built by `experiments/touchremovalset.ts` and rehearsed through the real answerer and session on the fake remote.
 *
 * **What is held here.**
 *
 * 1. **The removal delivers the four documents a device or an activity is named in and only those**: `ActivityList`,
 *    `DeviceList`, `MapList` and `ProtocolList`, each under the tag the set's name gives; `Context` and `Settings` are
 *    the source's, content and tags, so a remote that committed the source answers them 304. The put back is the
 *    source exactly, as parsed JSON, tags and all.
 * 2. **The structural diff is what the removal is meant to be and nothing more**, entry by entry: the activity, the
 *    device, their two maps and the receiver's two definitions taken out; Watch TV, Watch a Blu-ray and Play a Game
 *    each losing the receiver's role and, in their maps, its three volume keys and two swipes, their tap's long press
 *    set to null; Watch a Blu-ray's receiver entry taken out and its last entry moved down one; Switch Box and Play a
 *    Game moved up one place on the list; nothing added and the rest in the order it had.
 * 3. **On the fake remote**, the closing `--unchanged` run of the activity set served as recorded with its first list asking for the
 *    six with the tags of the set the remote holds, which is that same set, since the favourites set and the settings set each put back exactly what
 *    they found: the removal answers the four 200 with its content and tags and `Context` and `Settings` 304, keeps every
 *    favourites document and picture the remote holds, and finishes; the put back the same with the source's content and
 *    tags; and **the control**, the removal on a remote that holds it already, answers all six 304.
 * 4. **The builder's refusals**: the codec's (the device the favourites are tuned through, a name no entry carries), a
 *    put back of two equal sets, and of a set whose `Context` differs, which no removal changes.
 *
 * **Sources checked first.** The removal set brief in the lab; `touch-settings-set.test.ts` and `touch-activity-set.test.ts`
 * and their fake remote, whose shape this follows; `remove.ts` in the codec and its test. Logitech's client was not
 * consulted.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330; its firmware reports 17 and Logitech's templates file
 * it under 18. The lab half reads the bench sets and the recorded lists, prints nothing out of them and touches no
 * remote. The source is the `touch_activity_set_back` fixture, which is the set the bench Touch holds after the settings set,
 * `8.4-settings-back`, content and tags: the settings set's put back restored exactly what the activity set's left, `touch-settings-set.test.ts`.
 * The two removal sets are read by fixture, `touch_removal_set` and `touch_removal_set_back`, and `8.4-settings-back` as
 * `touch_settings_set_back`; what the remote did with the two is `packages/bench/test/harmony-touch/touch-removal-runs.test.ts`.
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

import { setDifferences } from '../../experiments/touchchangedset.ts';
import { putBackRemoval, removalChanges, withRemoval } from '../../experiments/touchremovalset.ts';
import { keyOf, resultOf, setTag, type RemoteRequest, type TouchSet, type TouchSyncOutcome } from '../../src/touchsync.ts';
import type { Scenario } from './touch-sync-run.ts';

const SOURCE = 'touch_activity_set_back';
const CLOSING = 'touch_activity_unchanged_';
const CLOSING_LISTS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${CLOSING}list_${n}`);
const HAND_OVER_LIST = `${CLOSING}handover_list`;
const DESCRIPTION = fileURLToPath(new URL('../../touch-removals/8.5-removal.json', import.meta.url));
/** The two sets the removal set built in the lab and delivered to the bench Touch, and the set it held before, by fixture. */
const BUILT = 'touch_removal_set';
const BUILT_BACK = 'touch_removal_set_back';
const HELD = 'touch_settings_set_back';
const FOUR = ['ActivityList', 'DeviceList', 'MapList', 'ProtocolList'];

const description = (): harmonyTouch.NamedRemoval => (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { removal: harmonyTouch.NamedRemoval }).removal;
const json = (fixture: string): unknown => JSON.parse(new TextDecoder().decode(lab.require_(fixture)));
const requestsOf = (fixture: string): RemoteRequest[] => {
  const requests = resultOf(new TextDecoder().decode(lab.require_(fixture)))?.['requests'];
  assert.ok(Array.isArray(requests), fixture);
  return requests as RemoteRequest[];
};
const answer = (set: TouchSet, document: string) => set.answers.find((a) => keyOf(a.uri) === document)!;
const documentsOf = (set: TouchSet): harmonyTouch.SyncDocuments => harmonyTouch.documentsOfAnswers(set.answers as unknown as harmonyTouch.SyncAnswer[]);

/** The chain as the bench built it: the source, the removal, its put back, each built as the script builds it. */
function chain(): { source: TouchSet; removal: TouchSet; back: TouchSet } {
  const source = json(SOURCE) as TouchSet;
  const removal = withRemoval({ set: source, removal: description(), name: '8.5-removal' });
  if ('refusals' in removal) throw new Error(removal.refusals.join('; '));
  const back = putBackRemoval(removal.set, source);
  if ('refusals' in back) throw new Error(back.refusals.join('; '));
  return { source, removal: removal.set, back: back.set };
}

describe('the 8.5 removal and its put back', { skip: lab.needing(lab.skipUnless(SOURCE)).skip }, () => {
  it('delivers the four documents that name a device or an activity under the set\'s tags, Context and Settings the source\'s', () => {
    const { source, removal } = chain();
    const diff = setDifferences(source, removal);
    assert.deepEqual(diff.filter((d) => d.values.length > 0).map((d) => d.document), FOUR);
    assert.deepEqual(diff.filter((d) => d.tagChanged).map((d) => d.document), FOUR);
    for (const d of FOUR) assert.equal(answer(removal, d).etag, setTag(answer(removal, d), '8.5-removal'), d);
    for (const d of ['Context', 'Settings']) assert.deepEqual(answer(removal, d), answer(source, d), d);
  });

  it('puts back exactly what the remote held before, the source\'s six, content and tags', () => {
    const { source, back } = chain();
    assert.deepEqual(back, source);
  });

  it('the structural diff: what was meant to go, the three activities that lose the receiver, two places moved up, nothing added', () => {
    const { source, removal } = chain();
    const diff = removalChanges(documentsOf(source), documentsOf(removal));
    assert.equal(diff.orderKept, true);
    assert.equal(diff.restEqual, true);
    const line = (c: { document: string; entry: string; kind: string; details: readonly string[] }) => `${c.document}: ${c.entry}, ${c.kind}${c.details.length > 0 ? `: ${c.details.join('; ')}` : ''}`;
    const swipes = 'VolumeUp, VolumeDown, VolumeMute, SwipeUp, SwipeDown';
    assert.deepEqual(diff.changes.map(line), [
      'ActivityList: Listen to Music, taken out',
      'ActivityList: Watch TV, changed: Roles, 1 taken out: VolumeActivityRole',
      'ActivityList: Watch a Blu-ray, changed: Roles, 1 taken out: VolumeActivityRole',
      'ActivityList: Switch Box, changed: ActivityOrder',
      'ActivityList: Play a Game, changed: ActivityOrder; Roles, 1 taken out: VolumeActivityRole',
      'DeviceList: Denon AV Receiver, taken out',
      'MapList: Denon AV Receiver\'s own map, taken out',
      'MapList: Listen to Music\'s map, taken out',
      `MapList: Watch TV's map, changed: Buttons, 5 taken out: ${swipes}; 1 changed: Tap (ButtonLongPressAction)`,
      `MapList: Watch a Blu-ray's map, changed: Buttons, 6 taken out: entry "InputAm", ${swipes}; 2 changed: entry "Test Sequence" (MenuItem.IndexInMenu), Tap (ButtonLongPressAction)`,
      `MapList: Play a Game's map, changed: Buttons, 5 taken out: ${swipes}; 1 changed: Tap (ButtonLongPressAction)`,
      'ProtocolList: Sharp 48 Bit 2, taken out',
      'ProtocolList: Sharp 15 Bit 2, taken out',
    ]);
  });

  it('the sets the lab holds are the ones this derivation gives, and the source is the set the bench Touch holds, as parsed JSON, tags and all',
    lab.skipUnless(BUILT, BUILT_BACK, HELD), () => {
      const { source, removal, back } = chain();
      assert.deepEqual(json(HELD), JSON.parse(JSON.stringify(source)));
      assert.deepEqual(json(BUILT), JSON.parse(JSON.stringify(removal)));
      assert.deepEqual(json(BUILT_BACK), JSON.parse(JSON.stringify(back)));
    });

  it('refuses what the codec refuses, a put back of two equal sets, and one whose Context differs', () => {
    const { source, removal } = chain();
    const refusals = (r: { set: TouchSet } | { refusals: readonly string[] }): string => ('refusals' in r ? r.refusals.join('; ') : '');
    assert.match(refusals(withRemoval({ set: source, removal: { devices: ['LG TV'] }, name: 'x' })), /favourite channels are tuned through/);
    assert.match(refusals(withRemoval({ set: source, removal: { activities: ['Nothing'] }, name: 'x' })), /no activity named "Nothing"/);
    assert.match(refusals(putBackRemoval(source, source)), /nothing to put back/);
    const moved: TouchSet = { answers: removal.answers.map((a) => (keyOf(a.uri) === 'Context' ? { ...a, etag: 'another' } : a)) };
    assert.match(refusals(putBackRemoval(moved, source)), /Context differs between the two sets/);
  });
});

// ---------------------------------------------------------------------------------------------------
// On the fake remote, through the real answerer and session
// ---------------------------------------------------------------------------------------------------

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
  lists[0] = lists[0]!.map((r) => ({ ...r, etag: answer(held, keyOf(r.uri)).etag! }));
  return lists;
}

const syncAnswers = (r: Run): Record<string, unknown>[] =>
  r.lines.slice(r.lines.findIndex((l) => l.name === 'setup/sync')).flatMap((l) => l.answers ?? []);

/** The answers of a run by kind and status, in order: a document by name, else what the address is. */
function summary(r: Run): string[] {
  return syncAnswers(r).map((a) => {
    const uri = a['uri'] as string;
    const what = uri.startsWith('harmony://') ? harmonyTouch.documentKeyOf(uri)! : uri.startsWith('content://') ? 'favourites' : uri.startsWith('proxy://') ? 'finish' : 'picture';
    return `${what} ${String(a['statusCode'])}`;
  });
}

const RECORDED_SHAPE = [
  'ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList',
  'favourites', 'favourites', 'favourites', ...Array(10).fill('picture'), 'finish',
];

describe('on the fake remote, the 8.5 run and its put back', { skip: lab.needing(lab.skipUnless(SOURCE, HAND_OVER_LIST, ...CLOSING_LISTS)).skip }, () => {
  let built: ReturnType<typeof chain> | undefined;
  const sets = () => (built ??= chain());

  it('the recorded closing run of 8.2 asked for the six with the source\'s tags, which are the tags the bench Touch holds after 8.4', () => {
    const { source } = sets();
    assert.deepEqual(requestsOf(CLOSING_LISTS[0]!).map((r) => [keyOf(r.uri), r.etag === answer(source, keyOf(r.uri)).etag]),
      ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList'].map((d) => [d, true]));
  });

  it('the removal: the four 200 with its content and tags, Context and Settings 304, favourites and pictures 304, finished', () => {
    const { source, removal } = sets();
    const r = run({ mode: { kind: 'set', set: removal }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(source) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${FOUR.includes(w) || w === 'finish' ? 200 : 304}`));
    for (const a of syncAnswers(r).filter((x) => x['statusCode'] === '200' && String(x['uri']).startsWith('harmony://'))) {
      const ours = answer(removal, keyOf(a['uri'] as string));
      assert.equal(a['etag'], ours.etag);
      assert.deepEqual(a['resource'], ours.resource);
    }
  });

  it('the put back on a remote holding the removal: the four 200 with the source\'s content and tags, the rest as before, finished', () => {
    const { source, removal, back } = sets();
    const r = run({ mode: { kind: 'set', set: back }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(removal) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${FOUR.includes(w) || w === 'finish' ? 200 : 304}`));
    for (const a of syncAnswers(r).filter((x) => x['statusCode'] === '200' && String(x['uri']).startsWith('harmony://'))) {
      const was = answer(source, keyOf(a['uri'] as string));
      assert.equal(a['etag'], was.etag);
      assert.deepEqual(a['resource'], was.resource);
    }
  });

  it('the removal on a remote holding it already: every request 304 but the finish, the control', () => {
    const { removal } = sets();
    const r = run({ mode: { kind: 'set', set: removal }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(removal) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${w === 'finish' ? 200 : 304}`));
  });
});
