/**
 * A Harmony Touch set with a device of ours added, and the set that takes it out again, `todo-touch.md` 8.1:
 * `changeDocuments`, `listChanges` and `chainTags` in `src/touchchangedset.ts`, the composing being the codec's
 * (`withTouchDevice`, `withoutTouchDevice`, `test/touch-device-add.test.ts` there).
 *
 * **What has to hold, and why each test is here.**
 *
 * 1. **Several documents change at once and only those are retagged.** A device lives in three documents, so the
 *    one value step of 6.9 is generalised: `changeDocuments` replaces the documents it is given, retags exactly
 *    those, and leaves the others with the source's tags, so a remote that committed the source is answered 304
 *    for them. A content equal to the source's is refused, since a document retagged with nothing changed would
 *    be delivered for nothing; `changeOneValue` now goes through the same function and its own tests stand.
 * 2. **The structural diff names an entry added to a list**, where `differences` names only the list: one entry
 *    added to each of three lists and nothing else is what 8.1's check reads. Its control is a list whose entry
 *    was replaced, which shows as one taken out and one added, and a field changed beside the list.
 * 3. **The chain's tags reach past a device set**, so a later set built from one of 8.1's cannot reuse a tag the
 *    chain stated.
 * 4. **On the fake remote, through the real answerer and session, the bench run is rehearsed**: the request lists
 *    of the closing `--unchanged` run of 6.9 served as recorded, the remote asking for the six with the tags of
 *    6.9's last set, which is what the bench Touch holds; the device set answers DeviceList, MapList and
 *    ProtocolList 200 with its content and tags, the other three 304, the three favourites 304, the ten pictures
 *    304, and the run finishes. The put back is rehearsed the same way with the remote holding the device set.
 *    **The control** is the device set answered to a remote holding it already: every request 304.
 *
 * **Sources checked first.** The 8.1 brief in the lab and the 6.9 preflight it follows; `touchsync.ts`
 * (`answerOf`, `prepareSet`, `setTag`); `touch-changed-set.test.ts` and `touch-sync-run.ts`; the recorded lists
 * of the closing run, `packages/usb/test/touch-changed-set-sync.test.ts`. Logitech's client was not consulted.
 *
 * **Width.** One model, the Harmony Touch, firmware 4.15.330; its firmware reports architecture 17 and Logitech's
 * templates file it under 18. The lab half reads the bench set and the recorded lists, prints nothing out of
 * them and touches no remote.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { harmonyTouch } from '@harmony/codec';
import * as lab from '@harmony/lab';

import { chainTags, changeDocuments, changeOneValue, listChanges, setDifferences } from '../src/touchchangedset.ts';
import { keyOf, resultOf, setTag, type RemoteRequest, type SetAnswer, type TouchSet, type TouchSyncOutcome } from '../src/touchsync.ts';
import type { Scenario } from './touch-sync-run.ts';

const ACCOUNT = 'harmony://Account/1';
const ADDRESS: Record<string, string> = {
  ActivityList: `${ACCOUNT}/ActivityList`,
  DeviceList: `${ACCOUNT}/DeviceList`,
  MapList: `${ACCOUNT}/MapList?excludeFunctionMaps=true`,
  Context: 'harmony://Remote/2/Context',
  Settings: `${ACCOUNT}/Remote/2/Settings`,
  ProtocolList: `${ACCOUNT}/ProtocolList`,
};

/** A made up set that passes the gate: no device yet, one activity. */
function source(): TouchSet {
  const documents: Record<string, unknown> = {
    ActivityList: { Activities: [{ 'Id-': 1, Name: 'Made Up Activity', ActivityGroup: 0, Type: 5, ActivityOrder: 0, Roles: [], EnterActions: [], LeaveActions: [] }] },
    DeviceList: { DevicesWithFeatures: [] },
    MapList: { ButtonMaps: [{ __type: 'ActivityButtonMap', ButtonMapIdentifier: '16417Activity1', Buttons: [], Sequences: [] }] },
    Context: { 'AccountId-': 1 },
    Settings: { Settings: [] },
    ProtocolList: { Protocols: [] },
  };
  return {
    answers: Object.entries(documents).map(([name, resource]): SetAnswer => {
      const a = { uri: ADDRESS[name]!, 'body-type': 'application/json' as const, resource };
      return { ...a, etag: setTag(a, 'made-up-source') };
    }),
  };
}

/** The device of 8.1, read from the file the bench set was built from. */
const DESCRIPTION = fileURLToPath(new URL('../touch-devices/test-projector.json', import.meta.url));
const projector = (): harmonyTouch.RowDevice => (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { device: harmonyTouch.RowDevice }).device;

function added(set: TouchSet, name: string, tagsInPlay: Iterable<string> = []): TouchSet {
  const documents = harmonyTouch.withTouchDevice(harmonyTouch.documentsOfAnswers(set.answers), harmonyTouch.composeTouchDeviceOfRow(projector()));
  const result = changeDocuments({ set, documents: { ...documents }, name, tagsInPlay });
  assert.ok(!('refusals' in result), 'refusals' in result ? result.refusals.join('; ') : '');
  return result.set;
}

function removed(set: TouchSet, name: string, tagsInPlay: Iterable<string> = []): TouchSet {
  const documents = harmonyTouch.withoutTouchDevice(harmonyTouch.documentsOfAnswers(set.answers), projector().id);
  const result = changeDocuments({ set, documents: { ...documents }, name, tagsInPlay });
  assert.ok(!('refusals' in result), 'refusals' in result ? result.refusals.join('; ') : '');
  return result.set;
}

const THREE = ['DeviceList', 'MapList', 'ProtocolList'];
const LISTS: Record<string, string> = { DeviceList: 'DevicesWithFeatures', MapList: 'ButtonMaps', ProtocolList: 'Protocols' };
const docOf = (set: TouchSet, name: string): unknown => set.answers.find((a) => keyOf(a.uri) === name)!.resource;

describe('several documents changed at once', () => {
  it('retags exactly the documents it changes, keeps the others as the source states them, and the device reads back', () => {
    const before = source();
    const after = added(before, 'made-up-device');
    const diff = setDifferences(before, after);
    assert.deepEqual(diff.filter((d) => d.values.length > 0).map((d) => d.document), THREE);
    assert.deepEqual(diff.filter((d) => d.tagChanged).map((d) => d.document), THREE);
    for (const a of after.answers) {
      if (THREE.includes(keyOf(a.uri))) assert.equal(a.etag, setTag(a, 'made-up-device'));
      else assert.deepEqual(a, before.answers.find((b) => b.uri === a.uri));
    }
    const read = harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(after.answers));
    assert.deepEqual(read.devices.map((d) => [d.name, d.commands.length, d.map?.reachable]), [['Test Projector', 11, true]]);
  });

  it('refuses a document not among the six, one the source lacks, a content equal to the source\'s and a tag in play', () => {
    const set = source();
    const refusals = (documents: Record<string, unknown>, name = 'n', tagsInPlay: string[] = []): readonly string[] => {
      const r = changeDocuments({ set, documents, name, tagsInPlay });
      return 'refusals' in r ? r.refusals : [];
    };
    assert.deepEqual(refusals({}), ['no document is changed']);
    assert.deepEqual(refusals({ Favourites: {} }), ['Favourites is not one of the six configuration documents']);
    assert.deepEqual(refusals({ DeviceList: docOf(set, 'DeviceList') }), ['DeviceList: the new content equals the source\'s, which changes nothing']);
    const other = { DevicesWithFeatures: [], Extra: 1 };
    const tag = setTag({ 'body-type': 'application/json', resource: other }, 'n');
    assert.deepEqual(refusals({ DeviceList: other }, 'n', [tag]), ['DeviceList: its new tag equals a tag already in play, so a set of this name was made before']);
    const without: TouchSet = { answers: set.answers.filter((a) => keyOf(a.uri) !== 'Context') };
    const r = changeDocuments({ set: without, documents: { Context: {} }, name: 'n' });
    assert.deepEqual('refusals' in r ? r.refusals : [], ['the source set holds no Context']);
  });

  it('still changes one value through the same function, and passes the gate\'s refusals on', () => {
    const r = changeOneValue({ set: source(), change: { document: 'ActivityList', pointer: '/Activities/0/Name', was: 'Made Up Activity', to: 'Other' }, name: 'one' });
    assert.ok(!('refusals' in r));
    assert.deepEqual(setDifferences(source(), r.set).filter((d) => d.tagChanged).map((d) => d.document), ['ActivityList']);
    const broken = changeDocuments({ set: source(), documents: { DeviceList: {} }, name: 'n' });
    assert.match('refusals' in broken ? broken.refusals.join('\n') : '', /DevicesWithFeatures.*missing list/);
  });

  it('the put back is the source\'s content under tags that are neither the source\'s nor the device set\'s', () => {
    const before = source();
    const withDevice = added(before, 'made-up-device');
    const back = removed(withDevice, 'made-up-back');
    assert.ok(setDifferences(before, back).every((d) => d.values.length === 0));
    for (const name of THREE) {
      const tags = [before, withDevice, back].map((s) => s.answers.find((a) => keyOf(a.uri) === name)!.etag);
      assert.equal(new Set(tags).size, 3, name);
    }
  });
});

describe('the structural diff of a list', () => {
  it('names the one entry added to each of the three lists and finds nothing else changed', () => {
    const before = source();
    const after = added(before, 'made-up-device');
    for (const name of THREE) {
      assert.deepEqual(listChanges(docOf(before, name), docOf(after, name), LISTS[name]!), { added: [0], removed: [], restEqual: true }, name);
    }
  });

  it('sees a replaced entry as one out and one in, and a field changed beside the list: the control', () => {
    assert.deepEqual(listChanges({ L: [1, 2, 3] }, { L: [1, 2, 3, 4] }, 'L'), { added: [3], removed: [], restEqual: true });
    assert.deepEqual(listChanges({ L: [1, 2, 3] }, { L: [1, 9, 3] }, 'L'), { added: [1], removed: [1], restEqual: true });
    assert.deepEqual(listChanges({ L: [1, 2], x: 1 }, { L: [1, 2], x: 2 }, 'L'), { added: [], removed: [], restEqual: false });
    assert.deepEqual(listChanges({ L: [{ a: 1 }, { b: 2 }] }, { L: [{ b: 2 }] }, 'L'), { added: [], removed: [0], restEqual: true });
  });
});

describe('the chain of sets', () => {
  it('follows a device set\'s record back through a one value set to the first, and stops at a folder met twice', () => {
    const sets: Record<string, { set: TouchSet; record: Record<string, unknown> }> = {
      first: { set: { answers: [{ uri: 'a', 'body-type': 'application/json', etag: 't1', resource: {} }] }, record: { rows: [] } },
      one: { set: { answers: [{ uri: 'a', 'body-type': 'application/json', etag: 't2', resource: {} }] }, record: { from: 'first', change: {} } },
      device: { set: { answers: [{ uri: 'a', 'body-type': 'application/json', etag: 't3', resource: {} }] }, record: { from: 'one', device: {} } },
      back: { set: { answers: [{ uri: 'a', 'body-type': 'application/json', etag: 't4', resource: {} }] }, record: { from: 'device', removed: 1 } },
      loop: { set: { answers: [{ uri: 'a', 'body-type': 'application/json', etag: 't5', resource: {} }] }, record: { from: 'loop', removed: 1 } },
    };
    const read = (at: string) => sets[at]!;
    assert.deepEqual([...chainTags('back', read)].sort(), ['t1', 't2', 't3', 't4']);
    assert.deepEqual([...chainTags('loop', read)], ['t5']);
  });
});

// ---------------------------------------------------------------------------------------------------
// The bench sets, rehearsed on the fake remote through the real answerer and session
// ---------------------------------------------------------------------------------------------------

const SOURCE = 'touch_changed_set_label_back';
const CLOSING = 'touch_changed_unchanged_';
const CLOSING_LISTS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${CLOSING}list_${n}`);
const HAND_OVER_LIST = `${CLOSING}handover_list`;
/** The two sets 8.1 built in the lab and delivered to the bench Touch, by fixture, for the comparison with what this derivation gives. */
const BUILT = 'touch_device_set';
const BUILT_BACK = 'touch_device_set_back';

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
  let built: { source_: TouchSet; withDevice: TouchSet; back: TouchSet } | undefined;
  const sets = () => {
    if (built === undefined) {
      const source_ = json(SOURCE) as TouchSet;
      const withDevice = added(source_, '8.1-device');
      built = { source_, withDevice, back: removed(withDevice, '8.1-device-back') };
    }
    return built;
  };

  it('the sets the lab holds are the ones this derivation gives, as parsed JSON, tags and all', lab.skipUnless(BUILT, BUILT_BACK), () => {
    const { withDevice, back } = sets();
    assert.deepEqual(json(BUILT), JSON.parse(JSON.stringify(withDevice)));
    assert.deepEqual(json(BUILT_BACK), JSON.parse(JSON.stringify(back)));
  });

  it('the recorded closing run asked for the six with the source\'s tags, so the remote holds the source', () => {
    const { source_ } = sets();
    const first = requestsOf(CLOSING_LISTS[0]!);
    assert.deepEqual(first.map((r) => [keyOf(r.uri), r.etag === source_.answers.find((a) => keyOf(a.uri) === keyOf(r.uri))!.etag]),
      ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList'].map((d) => [d, true]));
  });

  it('the device set: the three 200 with its content and tags, the other three 304, favourites and pictures 304, finished', () => {
    const { source_, withDevice } = sets();
    const r = run({ mode: { kind: 'set', set: withDevice }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(source_) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${THREE.includes(w) ? 200 : w === 'finish' ? 200 : 304}`));
    for (const a of syncAnswers(r).filter((x) => x['statusCode'] === '200' && String(x['uri']).startsWith('harmony://'))) {
      const ours = withDevice.answers.find((x) => keyOf(x.uri) === keyOf(a['uri'] as string))!;
      assert.equal(a['etag'], ours.etag);
      assert.deepEqual(a['resource'], ours.resource);
    }
  });

  it('the put back on a remote holding the device set: the three 200 with the source\'s content, the rest as before, finished', () => {
    const { source_, withDevice, back } = sets();
    const r = run({ mode: { kind: 'set', set: back }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(withDevice) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${THREE.includes(w) || w === 'finish' ? 200 : 304}`));
    for (const a of syncAnswers(r).filter((x) => x['statusCode'] === '200' && String(x['uri']).startsWith('harmony://'))) {
      assert.deepEqual(a['resource'], source_.answers.find((x) => keyOf(x.uri) === keyOf(a['uri'] as string))!.resource);
    }
  });

  it('the device set on a remote holding it already: every request 304 but the finish, the control', () => {
    const { withDevice } = sets();
    const r = run({ mode: { kind: 'set', set: withDevice }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(withDevice) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${w === 'finish' ? 200 : 304}`));
  });
});
