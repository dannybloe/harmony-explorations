/**
 * The Harmony Touch set of `todo-touch.md` 8.4: Settings of ours and Context composed from a description, delivered
 * beside the four other configuration documents the remote holds, and its exact inverse, built by
 * `experiments/touchsettingsset.ts` and rehearsed through the real answerer and session on the fake remote.
 *
 * **What is held here.**
 *
 * 1. **The set delivers Settings and Context and leaves the rest to the remote**: Settings with the two rows of
 *    `touch-settings/8.4-settings.json` changed and nothing else, and Context composed from the description of its
 *    seven fields as the remote holds them, so its content is the source's; each under the tag the set's name gives.
 *    The other four are the source's, content and tags, so a remote that committed the source answers them 304.
 * 2. **The put back is what the remote held before**: the source's Settings and Context, content and tags, so the
 *    put back is the source again.
 * 3. **On the fake remote**, the closing `--unchanged` run of 8.2 served as recorded with its first list asking for the
 *    six with the tags of the set the remote holds: the set answers Settings and Context 200 and the four 304, keeps
 *    every favourites document and picture the remote holds, and finishes; the put back the same with the source's
 *    content and tags; and **the control**, the set on a remote that holds it already, answers all six 304.
 * 4. **The hand over**: Settings is the one document the remote writes itself, and a change made on its screens is
 *    handed up at the next sync. A set run whose hand over hands Settings up stops before the sync, since the set's
 *    Settings would revert it; the control, `--unchanged` with the same hand over, writes it back and finishes.
 * 5. **The builder's refusals**: a description the codec refuses, a source without Settings, a tag already in play, and
 *    a put back of anything but the two documents.
 *
 * **Sources checked first.** The 8.4 brief in the lab; `touch-favourites-set.test.ts` and its fake remote, whose shape
 * this follows; the screens' settings code in the lab's firmware copy for the hand over (`updateRemoteSettings` in
 * `appscommon/harmony.lua`). Logitech's client was not consulted.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330; its firmware reports 17 and Logitech's templates
 * file it under 18. The two 8.4 sets are read by fixture, `touch_settings_set` and `touch_settings_set_back`, and
 * what the remote did with them is `touch-settings-runs.test.ts`.
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

import { differences } from '../../experiments/touchchangedset.ts';
import { putBackSettingsAndContext, settingsChanges, sixOf, withSettingsAndContext } from '../../experiments/touchsettingsset.ts';
import { keyOf, resultOf, setTag, type RemoteRequest, type TouchSet, type TouchSyncOutcome } from '../../src/touchsync.ts';
import type { Scenario } from './touch-sync-run.ts';

const SOURCE = 'touch_activity_set_back';
const CLOSING = 'touch_activity_unchanged_';
const CLOSING_LISTS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${CLOSING}list_${n}`);
const HAND_OVER_LIST = `${CLOSING}handover_list`;
const DESCRIPTION = fileURLToPath(new URL('../../touch-settings/8.4-settings.json', import.meta.url));
/** The two sets 8.4 built in the lab and delivered to the bench Touch, by fixture, for the comparison with what this derivation gives. */
const BUILT = 'touch_settings_set';
const BUILT_BACK = 'touch_settings_set_back';

const description = (): harmonyTouch.OwnSettings => (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { settings: harmonyTouch.OwnSettings }).settings;
const json = (fixture: string): unknown => JSON.parse(new TextDecoder().decode(lab.require_(fixture)));
const requestsOf = (fixture: string): RemoteRequest[] => {
  const requests = resultOf(new TextDecoder().decode(lab.require_(fixture)))?.['requests'];
  assert.ok(Array.isArray(requests), fixture);
  return requests as RemoteRequest[];
};
const answer = (set: TouchSet, document: string) => set.answers.find((a) => keyOf(a.uri) === document)!;

/** The chain as the bench built it: the source, the 8.4 set, its put back, each built as the script builds it. */
function chain(): { source: TouchSet; forward: TouchSet; back: TouchSet; context: harmonyTouch.OwnContext } {
  const source = json(SOURCE) as TouchSet;
  const context = harmonyTouch.describeTouchContext(answer(source, 'Context').resource as harmonyTouch.Context);
  const forward = withSettingsAndContext({ set: source, settings: description(), context, name: '8.4-settings' });
  if ('refusals' in forward) throw new Error(forward.refusals.join('; '));
  const back = putBackSettingsAndContext(forward.set, source);
  if ('refusals' in back) throw new Error(back.refusals.join('; '));
  return { source, forward: forward.set, back: back.set, context };
}

describe('the 8.4 set and its put back', { skip: lab.needing(lab.skipUnless(SOURCE)).skip }, () => {
  it('delivers Settings with the two rows changed and Context as the remote holds it, each under the tag the set\'s name gives, the four the source\'s', () => {
    const { source, forward } = chain();
    assert.deepEqual(forward.answers.map((a) => keyOf(a.uri)), source.answers.map((a) => keyOf(a.uri)));
    for (const d of ['ActivityList', 'DeviceList', 'MapList', 'ProtocolList']) assert.deepEqual(answer(forward, d), answer(source, d), d);
    for (const d of ['Settings', 'Context']) {
      assert.equal(answer(forward, d).etag, setTag(answer(forward, d), '8.4-settings'), d);
      assert.notEqual(answer(forward, d).etag, answer(source, d).etag, d);
    }
    const changes = settingsChanges(answer(source, 'Settings').resource, answer(forward, 'Settings').resource);
    assert.deepEqual(changes, { rows: [{ name: 'ScreenBrightness', was: '100', now: '20' }, { name: 'ScreenTimeout', was: '10', now: '30' }], restEqual: true });
    assert.deepEqual(differences(answer(source, 'Context').resource, answer(forward, 'Context').resource), []);
    assert.equal(JSON.stringify(answer(forward, 'Context').resource), JSON.stringify(answer(source, 'Context').resource), 'key order too');
  });

  it('puts back exactly what the remote held before, the source\'s six, content and tags', () => {
    const { source, back } = chain();
    assert.deepEqual(back, source);
  });

  it('the sets the lab holds are the ones this derivation gives, as parsed JSON, tags and all', lab.skipUnless(BUILT, BUILT_BACK), () => {
    const { forward, back } = chain();
    assert.deepEqual(json(BUILT), JSON.parse(JSON.stringify(forward)));
    assert.deepEqual(json(BUILT_BACK), JSON.parse(JSON.stringify(back)));
  });

  it('leaves out the favourites and pictures a source carries, which the remote holds once the source is committed', () => {
    const { source, forward, context } = chain();
    const withContent: TouchSet = { answers: [...source.answers, { uri: 'content-image://1.0/station/x/image;maxX=54;maxY=54;type=png', 'body-type': 'image/png', etag: 'x', resource: 'iVBORw0KGgo=' }] };
    assert.deepEqual(sixOf(withContent), source);
    const built = withSettingsAndContext({ set: withContent, settings: description(), context, name: '8.4-settings' });
    assert.ok('set' in built);
    assert.deepEqual(built.set, forward);
  });

  it('refuses a description the codec refuses, a source without Settings, a tag in play, and a put back of more than the two', () => {
    const { source, forward, context } = chain();
    const refusals = (r: { set: TouchSet } | { refusals: readonly string[] }): readonly string[] => ('refusals' in r ? r.refusals : []);
    assert.match(refusals(withSettingsAndContext({ set: source, settings: { values: { ScreenTimeout: '0' } }, context, name: 'x' })).join(';'), /ScreenTimeout: 0 is outside 1 to 30/);
    assert.match(refusals(withSettingsAndContext({ set: source, settings: description(), context: { ...context, 'AccountId-': 1 }, name: 'x' })).join(';'), /AccountId- differs/);
    assert.deepEqual(refusals(withSettingsAndContext({ set: { answers: source.answers.filter((a) => keyOf(a.uri) !== 'Settings') }, settings: description(), context, name: 'x' })),
      ['the source set holds no Settings or no Context']);
    const inPlay = [answer(forward, 'Settings').etag!, answer(forward, 'Context').etag!];
    assert.match(refusals(withSettingsAndContext({ set: source, settings: description(), context, name: '8.4-settings', tagsInPlay: inPlay })).join(';'), /its new tag equals a tag already in play/);
    // A put back of a set whose other four differ from the one before is more than a put back.
    const moved: TouchSet = { answers: forward.answers.map((a) => (keyOf(a.uri) === 'MapList' ? { ...a, etag: 'another' } : a)) };
    assert.match(refusals(putBackSettingsAndContext(moved, source)).join(';'), /MapList differs between the two sets/);
    assert.match(refusals(putBackSettingsAndContext(source, source)).join(';'), /Settings already holds the tag it is to be put back under/);
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

/** 8.2's closing run's lists as a remote holding `six` would hand them out: the six asked with `six`'s tags, the rest as recorded. */
function listsHolding(six: TouchSet): RemoteRequest[][] {
  return CLOSING_LISTS.map(requestsOf).map((list) => list.map((r): RemoteRequest =>
    (r.uri.startsWith('harmony://') ? { ...r, etag: answer(six, keyOf(r.uri)).etag! } : r)));
}

const syncAnswers = (r: Run): Record<string, unknown>[] =>
  r.lines.slice(r.lines.findIndex((l) => l.name === 'setup/sync')).flatMap((l) => l.answers ?? []);

/** A run's answers by status, as counts per kind: the six, the favourites, the pictures, the finish. */
function counts(r: Run): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of syncAnswers(r)) {
    const uri = a['uri'] as string;
    const what = uri.startsWith('harmony://') ? 'six' : uri.startsWith('content://') ? 'favourites' : uri.startsWith('proxy://') ? 'finish' : 'picture';
    const key = `${what} ${String(a['statusCode'])}`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/** The six answered 200 in a run, by name, with their tag and body. */
const delivered = (r: Run): Map<string, { etag: unknown; resource: unknown }> => new Map(syncAnswers(r)
  .filter((a) => a['statusCode'] === '200' && String(a['uri']).startsWith('harmony://'))
  .map((a) => [keyOf(a['uri'] as string), { etag: a['etag'], resource: a['resource'] }]));

describe('on the fake remote, the 8.4 set and its put back', { skip: lab.needing(lab.skipUnless(SOURCE, HAND_OVER_LIST, ...CLOSING_LISTS)).skip }, () => {
  let built: ReturnType<typeof chain> | undefined;
  const sets = () => (built ??= chain());

  it('the set on a remote holding the source: Settings and Context 200 with the set\'s content and tags, the four 304, everything else kept, finished', () => {
    const { source, forward } = sets();
    const r = run({ mode: { kind: 'set', set: forward }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(source) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(counts(r), { 'six 200': 2, 'six 304': 4, 'favourites 304': 3, 'picture 304': 10, 'finish 200': 1 });
    const got = delivered(r);
    assert.deepEqual([...got.keys()].sort(), ['Context', 'Settings']);
    for (const d of ['Settings', 'Context']) assert.deepEqual(got.get(d), { etag: answer(forward, d).etag, resource: answer(forward, d).resource });
  });

  it('the put back on a remote holding the set: the same two 200 with the source\'s content and tags, finished', () => {
    const { source, forward, back } = sets();
    const r = run({ mode: { kind: 'set', set: back }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(forward) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(counts(r), { 'six 200': 2, 'six 304': 4, 'favourites 304': 3, 'picture 304': 10, 'finish 200': 1 });
    const got = delivered(r);
    for (const d of ['Settings', 'Context']) assert.deepEqual(got.get(d), { etag: answer(source, d).etag, resource: answer(source, d).resource });
  });

  it('the set on a remote holding it already: all six 304, the control', () => {
    const { forward } = sets();
    const r = run({ mode: { kind: 'set', set: forward }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(forward) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(counts(r), { 'six 304': 6, 'favourites 304': 3, 'picture 304': 10, 'finish 200': 1 });
  });

  it('stops before the sync when the hand over hands up Settings changed on the remote, which the set would revert; --unchanged writes it back and finishes, the control', () => {
    const { source, forward } = sets();
    const settings = answer(source, 'Settings');
    // A setting changed on the remote's screens: the whole document put to its own address, as 6.7's first run measured.
    const changed = harmonyTouch.composeTouchSettings({ values: { ScreenLockFlag: 'true' } }, settings.resource as harmonyTouch.Settings);
    const put: RemoteRequest = { verb: 'put', uri: settings.uri, resource: encodeURIComponent(JSON.stringify(changed)).replace(/%20/g, '+') };
    const finished: RemoteRequest = { verb: 'POST', uri: 'proxy://Finished' };
    const r = run({ mode: { kind: 'set', set: forward }, handOver: [[put], [finished]], sync: listsHolding(source) });
    assert.equal(r.outcome.ending, 'refused');
    assert.match(r.outcome.reason ?? '', /^the remote handed up Settings, which the set also holds/);
    const control = run({ mode: { kind: 'unchanged' }, handOver: [[put], [finished]], sync: listsHolding(source) });
    assert.equal(control.outcome.ending, 'finished', control.outcome.reason);
  });
});
