/**
 * A Harmony Touch set with one value changed, `experiments/touchchangedset.ts`, for `todo-touch.md` 6.9: one delay
 * and one label changed and put back, each heard or seen at the bench.
 *
 * **What has to hold, and why each test is here.**
 *
 * 1. **The changed set differs from its source in exactly the one value, and in exactly that document's tag.**
 *    The answerer answers a request 304 when the remote's tag equals the set's and 200 otherwise, `answerOf`
 *    in `touchsync.ts`, so five unchanged documents under the tags the remote holds them by are answered 304
 *    and only the changed one is delivered. The structural diff, `differences`, is what says "exactly one
 *    value"; its own control is a pair of values it has to report, a missing key, a list of another length and
 *    a leaf of another kind.
 * 2. **On a fake remote that committed the source, a sync answers one document 200 and five 304**, through the
 *    real answerer and session in `touch-sync-run.ts`. The control is the same run with one other document held
 *    under a tag the set does not state, which is answered 200 too: the 304s come from the tags being equal,
 *    not from anything the changed set leaves out.
 * 3. **The put back is the change the other way under a third tag**: its content equals the source's as parsed
 *    JSON and its tag is neither the source's nor the changed set's. A tag never stated before is a mark only
 *    that delivery can leave, which the old tag would not be, the module's header. Building a set of the same
 *    name twice down one chain is refused, since its tag would already be in play.
 * 4. **The change is a value, and the value it was written against.** A pointer that reaches nothing, a value
 *    other than the one expected, an object, a type change and a change to the same value are refused by
 *    document and pointer; the expected value is the guard against building from the wrong source, the same
 *    trap `touchownset.ts` guards with tags.
 * 5. **The codec's reader reads the change as the engine will**: a sequence delay's `Duration` of 3 as 3000 ms
 *    and an activity's new name, `readConfiguration`.
 *
 * **Sources checked first.** The 6.9 brief in the lab; `touchsync.ts` `answerOf` and `prepareSet`;
 * `touchownset.ts` and its test; `answering-a-sync.md`; the engine's `loader/userconfigreader.lua`
 * `getSequenceActions` (a delay step's `Duration` times 1000) and `apihandler/activity.lua`
 * `fireCommandsList` (a step with no device sleeps its delay) in the lab's decompiled source. Logitech's client
 * was not consulted: what is checked is ours.
 *
 * **Width.** One model, the Harmony Touch, firmware 4.15.330. Every document here is made up; the bench sets
 * are checked by `bin/touch-changed-set.ts --check`, and nothing here touches a remote.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { harmonyTouch } from '@harmony/codec/node';

import {
  answersWhenHolding,
  changeOneValue,
  differences,
  pointerTokens,
  setDifferences,
  type OneChange,
} from '../../experiments/touchchangedset.ts';
import { keyOf, prepareSet, setTag, type RemoteRequest, type SetAnswer, type TouchSet, type TouchSyncOutcome } from '../../src/touchsync.ts';
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

/** A made up set that passes the gate, with one activity's name and one sequence delay to change. */
function documents(): Record<string, unknown> {
  return {
    ActivityList: { Activities: [{ 'Id-': 1, Name: 'Made Up Activity', ActivityGroup: 0, Type: 5, ActivityOrder: 0, Roles: [], EnterActions: [], LeaveActions: [] }] },
    DeviceList: { DevicesWithFeatures: [] },
    MapList: {
      ButtonMaps: [{
        // The identifier the engine keys a map by: a map without one raises in the reader, which the gate
        // refuses since `todo-touch.md` 6.10.
        __type: 'ActivityButtonMap',
        ButtonMapIdentifier: '16417Activity1',
        Buttons: [],
        Sequences: [{ Name: 'Made Up Sequence', SequenceId: 1, Actions: [{ __type: 'ButtonDelayAction', EventType: 0, Order: 1, Duration: 1 }] }],
      }],
    },
    Context: { 'AccountId-': 1 },
    Settings: { Settings: [] },
    ProtocolList: { Protocols: [] },
  };
}

/** The source: the made up documents under tags of ours, as a set the remote committed would state them. */
function source(): TouchSet {
  return {
    answers: Object.entries(documents()).map(([name, resource]): SetAnswer => {
      const a = { uri: ADDRESS[name]!, 'body-type': 'application/json' as const, resource };
      return { ...a, etag: setTag(a, 'made-up-source') };
    }),
  };
}

const DELAY: OneChange = { document: 'MapList', pointer: '/ButtonMaps/0/Sequences/0/Actions/0/Duration', was: 1, to: 3 };
const LABEL: OneChange = { document: 'ActivityList', pointer: '/Activities/0/Name', was: 'Made Up Activity', to: 'Made Up Label' };

function built(result: ReturnType<typeof changeOneValue>): TouchSet {
  assert.ok(!('refusals' in result), 'refusals' in result ? result.refusals.join('; ') : '');
  return result.set;
}

const refusals = (result: ReturnType<typeof changeOneValue>): readonly string[] => ('refusals' in result ? result.refusals : []);

describe('changing one value', () => {
  for (const change of [DELAY, LABEL]) {
    it(`changes ${change.document}'s one value and gives that document alone a new tag`, () => {
      const before = source();
      const after = built(changeOneValue({ set: before, change, name: 'made-up-change' }));
      const diff = setDifferences(before, after);
      assert.deepEqual(diff.filter((d) => d.values.length > 0), [{ document: change.document, values: [change.pointer], tagChanged: true }]);
      assert.deepEqual(diff.filter((d) => d.tagChanged).map((d) => d.document), [change.document]);
      const answer = after.answers.find((a) => keyOf(a.uri) === change.document)!;
      assert.equal(answer.etag, setTag(answer, 'made-up-change'));
      // The other five are the source's answers as they stood, tags and all, and the source is untouched.
      for (const [i, a] of after.answers.entries()) if (keyOf(a.uri) !== change.document) assert.deepEqual(a, before.answers[i]);
      assert.deepEqual(before, source());
    });
  }

  it('is read by the codec as the engine reads it: the delay in milliseconds, the new name', () => {
    const read = (set: TouchSet): ReturnType<typeof harmonyTouch.readConfiguration> =>
      harmonyTouch.readConfiguration(harmonyTouch.documentsOfAnswers(set.answers));
    assert.equal(read(source()).maps[0]!.sequences[0]!.steps[0]!.durationMs, 1000);
    assert.equal(read(built(changeOneValue({ set: source(), change: DELAY, name: 'd' }))).maps[0]!.sequences[0]!.steps[0]!.durationMs, 3000);
    assert.equal(read(built(changeOneValue({ set: source(), change: LABEL, name: 'l' }))).activities[0]!.name, 'Made Up Label');
  });

  it('refuses by document and pointer: nothing there, another value, an object, another type, the same value, not one of the six', () => {
    const set = source();
    const name = 'made-up-change';
    assert.deepEqual(refusals(changeOneValue({ set, change: { ...DELAY, pointer: '/ButtonMaps/1/Sequences' }, name })),
      ['MapList /ButtonMaps/1/Sequences: names no value in the source set\'s document']);
    // The control for the test above: a source holding another value than the change was written against.
    assert.deepEqual(refusals(changeOneValue({ set, change: { ...DELAY, was: 2 }, name })),
      ['MapList /ButtonMaps/0/Sequences/0/Actions/0/Duration: holds another value than the one the change expects, so the source is not what the change was written against']);
    assert.match(refusals(changeOneValue({ set, change: { ...DELAY, pointer: '/ButtonMaps/0/Sequences/0' }, name }))[0]!, /holds an object, and only a string, a number or a boolean is changed here$/);
    assert.match(refusals(changeOneValue({ set, change: { ...DELAY, to: '3' }, name }))[0]!, /the new value is a string where the document holds a number$/);
    assert.match(refusals(changeOneValue({ set, change: { ...DELAY, to: 1 }, name }))[0]!, /the new value equals the one it holds, which changes nothing$/);
    assert.deepEqual(refusals(changeOneValue({ set, change: { ...DELAY, document: 'Favourites' }, name })), ['Favourites is not one of the six configuration documents']);
    assert.match(refusals(changeOneValue({ set, change: { ...DELAY, pointer: 'ButtonMaps/0' }, name }))[0]!, /not a JSON Pointer/);
  });

  it('passes on the gate\'s refusals for a set the answerer would refuse', () => {
    const broken: TouchSet = { answers: source().answers.map((a) => (keyOf(a.uri) === 'DeviceList' ? { ...a, resource: {} } : a)) };
    assert.match(refusals(changeOneValue({ set: broken, change: DELAY, name: 'made-up-change' })).join('\n'), /DevicesWithFeatures.*missing list/);
  });
});

describe('putting it back', () => {
  const changed = built(changeOneValue({ set: source(), change: DELAY, name: 'made-up-change' }));
  const back = built(changeOneValue({ set: changed, change: { ...DELAY, was: DELAY.to, to: DELAY.was }, name: 'made-up-back', tagsInPlay: source().answers.map((a) => a.etag!) }));

  it('is the source\'s content under a tag that is neither the source\'s nor the changed set\'s', () => {
    const against = setDifferences(source(), back);
    assert.ok(against.every((d) => d.values.length === 0), 'the content equals the source\'s as parsed JSON');
    assert.deepEqual(against.filter((d) => d.tagChanged).map((d) => d.document), ['MapList']);
    const tag = (set: TouchSet): string | undefined => set.answers.find((a) => keyOf(a.uri) === 'MapList')!.etag;
    assert.equal(new Set([tag(source()), tag(changed), tag(back)]).size, 3);
  });

  it('refuses a set named as one already made down the chain, whose tag would be in play', () => {
    // The put back named as the source: its MapList is the source's content, so `setTag` gives the source's tag.
    const result = changeOneValue({ set: changed, change: { ...DELAY, was: 3, to: 1 }, name: 'made-up-source', tagsInPlay: source().answers.map((a) => a.etag!) });
    assert.deepEqual(refusals(result), ['MapList: its new tag equals a tag already in play, so a set of this name was made before']);
  });
});

describe('the structural diff', () => {
  it('finds a leaf, a missing key, a list of another length and another kind, and nothing in equal values', () => {
    assert.deepEqual(differences({ a: [1, { b: 'x' }] }, { a: [1, { b: 'x' }] }), []);
    assert.deepEqual(differences({ a: [1, { b: 'x' }] }, { a: [1, { b: 'y' }] }), ['/a/1/b']);
    assert.deepEqual(differences({ a: 1, c: 2 }, { a: 1 }), ['/c']);
    assert.deepEqual(differences({ a: [1, 2] }, { a: [1] }), ['/a']);
    assert.deepEqual(differences({ a: 1 }, { a: '1' }), ['/a']);
    assert.deepEqual(differences({ 'x/y': { '~': 1 } }, { 'x/y': { '~': 2 } }), ['/x~1y/~0']);
  });

  it('reads a JSON Pointer\'s tokens, escapes included, and refuses what is not one', () => {
    assert.deepEqual(pointerTokens('/x~1y/~0/3'), ['x/y', '~', '3']);
    assert.equal(pointerTokens(''), undefined);
    assert.equal(pointerTokens('a/b'), undefined);
    assert.equal(pointerTokens('/a~2'), undefined);
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

const FINISHED: RemoteRequest = { verb: 'POST', uri: 'proxy://Finished' };
const syncAnswers = (r: Run): Record<string, unknown>[] =>
  r.lines.slice(r.lines.findIndex((l) => l.name === 'setup/sync')).flatMap((l) => l.answers ?? []);

/** The six asked for with the tags a set states, the remote holding that set; `except` held under other tags. */
const holding = (set: TouchSet, except: readonly string[] = []): RemoteRequest[] =>
  set.answers.map((a) => ({ verb: 'get', uri: a.uri, etag: except.includes(keyOf(a.uri)) ? 'held-otherwise' : a.etag! }));

describe('on a fake remote that committed the source', () => {
  const changed = built(changeOneValue({ set: source(), change: DELAY, name: 'made-up-change' }));

  it('answers the changed document 200 with its new content and tag, and the other five 304', () => {
    const r = run({ mode: { kind: 'set', set: changed }, sync: [holding(source()), [FINISHED]] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    const answers = syncAnswers(r);
    const map = changed.answers.find((a) => keyOf(a.uri) === 'MapList')!;
    assert.deepEqual(answers.filter((a) => a['statusCode'] === '200' && a['uri'] !== 'proxy://Finished'), [
      { statusCode: '200', uri: map.uri, 'body-type': 'application/json', etag: map.etag, resource: map.resource },
    ]);
    assert.deepEqual(answers.filter((a) => a['statusCode'] === '304').map((a) => keyOf(a['uri'] as string)), ['ActivityList', 'DeviceList', 'Context', 'Settings', 'ProtocolList']);
    // The run agrees with what the bench script predicts without a remote.
    const prepared = prepareSet(changed);
    assert.ok(!('refusals' in prepared));
    assert.deepEqual(answersWhenHolding(prepared.set, source()), answers.slice(0, 6));
  });

  it('answers a document the remote holds under another tag 200 as well, the control', () => {
    const r = run({ mode: { kind: 'set', set: changed }, sync: [holding(source(), ['Context']), [FINISHED]] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(syncAnswers(r).filter((a) => a['statusCode'] === '200' && a['uri'] !== 'proxy://Finished').map((a) => keyOf(a['uri'] as string)), ['MapList', 'Context']);
  });
});
