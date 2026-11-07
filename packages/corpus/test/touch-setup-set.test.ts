/**
 * The Harmony Touch set of `todo-touch.md` 8.6: the whole test setup, seven devices and five activities, composed by us
 * from a description onto the set the bench Touch holds with every device and activity taken out, compared with
 * Logitech's documents field by field, and its put back; built by `src/touchsetupset.ts` and rehearsed through the real
 * answerer and session on the fake remote.
 *
 * **What is held here.**
 *
 * 1. **The description is the set described**: `touch-setups/8.6-test-setup.json` is what `describeTouchSetup` writes
 *    from the source with the ids of `SETUP_IDS`, so a change to the describer or to the file shows here. It holds names,
 *    numbers and the shape of each map, and no value of the account: no favourites address, profile key or account id
 *    of the source appears in it, and no address at all.
 * 2. **The source is Logitech's documents**: of the set the bench Touch holds since 8.5's put back, `ActivityList`,
 *    `DeviceList`, `MapList`, `Context` and `ProtocolList` are the recorded full sync's as parsed JSON, and `Settings` is
 *    the remote's own, handed up in 6.7. So the comparison below is with what Logitech's service built.
 * 3. **The comparison, the heart of 8.6**: every field of our four documents against the same field of theirs, matched
 *    by what the remote finds an entry by. Each is equal, equal after one of the five stated normalisations, or
 *    different for one of the eight stated reasons, and the counts are asserted exactly, row by row: ActivityList 194
 *    equal, 25 normalised, 74 different; DeviceList 6440, 32, 0; MapList 6859, 1124, 2725; ProtocolList 370, 0, 0; and
 *    **no row unexplained**. Every list's order is equal. Why each normalisation and difference changes nothing the
 *    remote does is the row's own text in `src/touchsetupset.ts`, with the reading behind it.
 * 4. **The control**: the same description with one key of Watch TV sending another command is composed and compared,
 *    and the comparison then holds an unexplained row, so "no row unexplained" can fail.
 * 5. **The setup delivers the four documents a setup composes and only those**, each under the tag the set's name
 *    gives, the definition list too though its content is the source's, `retagUnchanged`; Context and Settings are the
 *    source's, content and tags. The put back is the source exactly. The gate refuses neither, and the check finds the
 *    same two findings of the screens' lists on both, as on the source.
 * 6. **The sets the lab holds**, `work/touch-firmware/sets/8.6-setup` and `8.6-setup-back`, are what this derivation
 *    gives, read by fixture, `touch_setup_set` and `touch_setup_set_back`; what the remote did with the two is
 *    `packages/bench/test/touch86-runs.test.ts`.
 * 7. **On the fake remote**, the closing `--unchanged` run of 8.5 served as recorded, its first list asking with the
 *    tags of the set the remote holds, which is the source: the setup answers the four 200 with its content and tags and
 *    Context and Settings 304, keeps every favourites document and picture the remote holds, and finishes; the put back
 *    the same with the source's content and tags; and the control, the setup on a remote holding it already, answers
 *    every request 304 but the finish.
 *
 * **Sources checked first.** The 8.6 brief in the lab; `touch-removal-set.test.ts` and its fake remote, whose shape this
 * follows; `setup.ts` in the codec and its test, `packages/codec/test/touch-setup.test.ts`; the reference's
 * `activities-and-buttons.md` and `devices-and-infrared.md`; the lab's decompiled engine and the screens' Lua in the
 * lab's copy of the image for every reading the normalisations and differences name. Logitech's client was not
 * consulted: the documents are the remote's, and what is checked is ours.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330; its firmware reports 17 and Logitech's templates file it
 * under 18. The lab half reads the bench sets and the recorded lists, prints nothing out of them and touches no remote.
 * The source is the `touch_removal_set_back` fixture, `8.5-removal-back`, which 8.5's closing run found the remote
 * holding.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { harmonyTouch } from '@harmony/codec';
import * as lab from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/usb/test/touch-recording';

import { setDifferences } from '../src/touchchangedset.ts';
import { compareSetup, comparisonLines, composedSetupDocuments, putBackSetup, SETUP_DOCUMENTS, SETUP_IDS, withSetup } from '../src/touchsetupset.ts';
import { keyOf, resultOf, setTag, type RemoteRequest, type TouchSet, type TouchSyncOutcome } from '../src/touchsync.ts';
import type { Scenario } from './touch-sync-run.ts';

const SOURCE = 'touch_removal_set_back';
const FULL = 'touch_full_sync_recording';
const CLOSING = 'touch_removal_unchanged_';
const CLOSING_LISTS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${CLOSING}list_${n}`);
const HAND_OVER_LIST = `${CLOSING}handover_list`;
const DESCRIPTION = fileURLToPath(new URL('../touch-setups/8.6-test-setup.json', import.meta.url));
/** The two sets 8.6 built in the lab and delivered to the bench Touch, by fixture. */
const BUILT = 'touch_setup_set';
const BUILT_BACK = 'touch_setup_set_back';
const FOUR: readonly string[] = SETUP_DOCUMENTS;

const description = (): harmonyTouch.TouchSetup => (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { setup: harmonyTouch.TouchSetup }).setup;
const json = (fixture: string): unknown => JSON.parse(new TextDecoder().decode(lab.require_(fixture)));
const requestsOf = (fixture: string): RemoteRequest[] => {
  const requests = resultOf(new TextDecoder().decode(lab.require_(fixture)))?.['requests'];
  assert.ok(Array.isArray(requests), fixture);
  return requests as RemoteRequest[];
};
const answer = (set: TouchSet, document: string) => set.answers.find((a) => keyOf(a.uri) === document)!;
const documentsOf = (set: TouchSet): harmonyTouch.SyncDocuments => harmonyTouch.documentsOfAnswers(set.answers as unknown as harmonyTouch.SyncAnswer[]);
const composedOf = (set: TouchSet, setup: harmonyTouch.TouchSetup): harmonyTouch.SyncDocuments => {
  const built = composedSetupDocuments(set, setup);
  if ('refusal' in built) throw new Error(built.refusal);
  return built.documents;
};

/** The chain as the bench built it: the source, the setup, its put back, each built as the script builds it. */
function chain(): { source: TouchSet; setup: TouchSet; back: TouchSet } {
  const source = json(SOURCE) as TouchSet;
  const setup = withSetup({ set: source, setup: description(), name: '8.6-setup' });
  if ('refusals' in setup) throw new Error(setup.refusals.join('; '));
  const back = putBackSetup(setup.set, source);
  if ('refusals' in back) throw new Error(back.refusals.join('; '));
  return { source, setup: setup.set, back: back.set };
}

/** The comparison's report, every line, as the script prints it: per document its counts, then each row. */
const EXPECTED_COMPARISON = [
  'ActivityList: 194 equal, 25 equal after a normalisation, 74 different',
  '  different 5: Activities[].AccountId-, activity fields read by neither program',
  '  different 5: Activities[].BaseImageUri, an activity\'s picture address without a picture',
  '  different 5: Activities[].DateCreated, activity fields read by neither program',
  '  different 5: Activities[].DateModified, activity fields read by neither program',
  '  different 5: Activities[].DefaultStation, activity fields read by neither program',
  '  different 5: Activities[].DefaultStationName, activity fields read by neither program',
  '  normalised 2: Activities[].EnterActions[].DeviceId-, ids of ours',
  '  different 3: Activities[].EnterActions[].Id, role and step ids',
  '  different 1: Activities[].EnterActions[].TargetLevel, a step\'s target level',
  '  normalised 5: Activities[].Id-, ids of ours',
  '  different 5: Activities[].IsDefault, activity fields read by neither program',
  '  normalised 1: Activities[].LeaveActions[].DeviceId-, ids of ours',
  '  different 1: Activities[].LeaveActions[].Id, role and step ids',
  '  different 1: Activities[].LeaveActions[].TargetLevel, a step\'s target level',
  '  normalised 17: Activities[].Roles[].DeviceId-, ids of ours',
  '  different 17: Activities[].Roles[].Id-, role and step ids',
  '  different 11: Activities[].Roles[].SelectedInput.Id-, role and step ids',
  '  different 5: Activities[].State, activity fields read by neither program',
  'DeviceList: 6440 equal, 32 equal after a normalisation, 0 different',
  '  normalised 7: DevicesWithFeatures[].Device.Id-, ids of ours',
  '  normalised 25: DevicesWithFeatures[].DeviceFeatures[].DeviceId-, ids of ours',
  'MapList: 6859 equal, 1124 equal after a normalisation, 2725 different',
  '  normalised 5: ButtonMaps[].ActivityId-, ids of ours',
  '  different 9: ButtonMaps[].ButtonMapId, map fields read by neither program',
  '  different 3: ButtonMaps[].ButtonMapId-, map fields read by neither program',
  '  normalised 12: ButtonMaps[].ButtonMapIdentifier, ids of ours',
  '  different 12: ButtonMaps[].ButtonMapSurfaceId-, map fields read by neither program',
  '  normalised 608: ButtonMaps[].Buttons[].ButtonAction.DeviceId-, ids of ours',
  '  normalised 132: ButtonMaps[].Buttons[].ButtonAction.EventType, event type of a command, sequence or client action',
  '  different 36: ButtonMaps[].Buttons[].ButtonAction.FunctionId, the function id under the key nothing reads',
  '  normalised 87: ButtonMaps[].Buttons[].ButtonAction.FunctionId-, function id 0 for none',
  '  different 616: ButtonMaps[].Buttons[].ButtonAction.Id, action ids',
  '  normalised 2: ButtonMaps[].Buttons[].ButtonAction.SequenceId, ids of ours',
  '  normalised 4: ButtonMaps[].Buttons[].ButtonDoublePressAction.DeviceId-, ids of ours',
  '  different 4: ButtonMaps[].Buttons[].ButtonDoublePressAction.Id, action ids',
  '  different 616: ButtonMaps[].Buttons[].ButtonId, button fields read by neither program',
  '  different 352: ButtonMaps[].Buttons[].ButtonImageKey, button fields read by neither program',
  '  different 332: ButtonMaps[].Buttons[].ButtonImagePath, button fields read by neither program',
  '  normalised 42: ButtonMaps[].Buttons[].ButtonLongPressAction.DeviceId-, ids of ours',
  '  normalised 1: ButtonMaps[].Buttons[].ButtonLongPressAction.FunctionId-, function id 0 for none',
  '  different 42: ButtonMaps[].Buttons[].ButtonLongPressAction.Id, action ids',
  '  normalised 206: ButtonMaps[].Buttons[].ButtonState, button state 0 for 1',
  '  different 201: ButtonMaps[].Buttons[].ImageId, button fields read by neither program',
  '  different 131: ButtonMaps[].Buttons[].ImageId-, button fields read by neither program',
  '  different 332: ButtonMaps[].Buttons[].MenuItem.MenuName, button fields read by neither program',
  '  different 12: ButtonMaps[].DateModified, map fields read by neither program',
  '  normalised 7: ButtonMaps[].DeviceId-, ids of ours',
  '  different 12: ButtonMaps[].RemoteId-, map fields read by neither program',
  '  normalised 10: ButtonMaps[].Sequences, no sequences as an empty list',
  '  normalised 2: ButtonMaps[].Sequences[].Actions[].DeviceId-, ids of ours',
  '  normalised 3: ButtonMaps[].Sequences[].Actions[].EventType, event type of a command, sequence or client action',
  '  normalised 2: ButtonMaps[].Sequences[].Actions[].FunctionId-, function id 0 for none',
  '  different 3: ButtonMaps[].Sequences[].Actions[].Id, action ids',
  '  normalised 1: ButtonMaps[].Sequences[].SequenceId, ids of ours',
  '  different 12: ButtonMaps[].SurfaceId-, map fields read by neither program',
  'ProtocolList: 370 equal, 0 equal after a normalisation, 0 different',
];

describe('the 8.6 setup, its comparison with Logitech\'s documents and its put back', { skip: lab.needing(lab.skipUnless(SOURCE)).skip }, () => {
  it('the description file is the source described with the ids of SETUP_IDS, seven devices, five activities, 616 buttons, and holds no value of the account', () => {
    const source = json(SOURCE) as TouchSet;
    const setup = description();
    assert.deepEqual(setup, JSON.parse(JSON.stringify(harmonyTouch.describeTouchSetup(documentsOf(source), SETUP_IDS))));
    assert.deepEqual([setup.devices.length, setup.activities.length], [7, 5]);
    assert.equal(setup.devices.reduce((n, d) => n + d.buttons.length, 0) + setup.activities.reduce((n, a) => n + (a.buttons?.length ?? 0), 0), 616);
    const text = readFileSync(DESCRIPTION, 'utf8');
    assert.ok(!text.includes('://') && !text.includes('@'), 'no address of any kind');
    // The account's values in the source: each device's favourites address and key and the account id. None is in the file.
    const docs = documentsOf(source);
    const secrets = new Set<string>();
    for (const d of (docs.DeviceList as unknown as { DevicesWithFeatures: { Device: Record<string, unknown> }[] }).DevicesWithFeatures) {
      for (const k of ['DeviceProfileUri', 'ContentProfileKey', 'AccountId-']) if (d.Device[k] !== null && d.Device[k] !== undefined) secrets.add(String(d.Device[k]));
    }
    for (const a of (docs.ActivityList as unknown as { Activities: Record<string, unknown>[] }).Activities) if (a['AccountId-'] !== undefined) secrets.add(String(a['AccountId-']));
    assert.ok(secrets.size > 0);
    assert.equal([...secrets].filter((s) => s.length > 1 && text.includes(s)).length, 0);
  });

  it('the source is Logitech\'s documents: five of the six are the recorded full sync\'s as parsed JSON, and Settings is the remote\'s own', lab.skipUnless(FULL), () => {
    const recorded = harmonyTouch.documentsOfAnswers(answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi')));
    const source = documentsOf(json(SOURCE) as TouchSet);
    for (const d of ['ActivityList', 'DeviceList', 'MapList', 'Context', 'ProtocolList'] as const) assert.deepEqual(source[d], recorded[d], d);
    assert.notDeepEqual(source.Settings, recorded.Settings);
  });

  it('the comparison: every field equal, equal after a stated normalisation or different for a stated reason, row by row, none unexplained and every order equal', () => {
    const source = json(SOURCE) as TouchSet;
    const comparison = compareSetup(composedOf(source, description()), documentsOf(source));
    assert.deepEqual(comparisonLines(comparison), EXPECTED_COMPARISON);
    assert.equal(comparison.flatMap((c) => c.rows).filter((r) => r.why.startsWith('unexplained')).length, 0);
    assert.equal(comparison.flatMap((c) => c.rows).filter((r) => r.field.endsWith('(order)')).length, 0);
  });

  it('the control: Watch TV\'s first key sending another command shows as an unexplained difference', () => {
    const source = json(SOURCE) as TouchSet;
    const setup = description();
    const [first, ...rest] = setup.activities;
    const buttons = [...first!.buttons!];
    const other = buttons.find((b) => 'command' in b.press && 'command' in buttons[0]!.press && b.press.command !== buttons[0]!.press.command)!;
    buttons[0] = { ...buttons[0]!, press: other.press };
    const comparison = compareSetup(composedOf(source, { ...setup, activities: [{ ...first!, buttons }, ...rest] }), documentsOf(source));
    const unexplained = comparison.flatMap((c) => c.rows).filter((r) => r.why.startsWith('unexplained'));
    assert.ok(unexplained.some((r) => r.document === 'MapList' && r.field === 'ButtonMaps[].Buttons[].ButtonAction.CommandName'), comparisonLines(comparison).join('\n'));
  });

  it('delivers the four documents a setup composes under the set\'s tags, Context and Settings the source\'s, and puts back the source exactly', () => {
    const { source, setup, back } = chain();
    const diff = setDifferences(source, setup);
    // The definition list's content is the source's, carried whole from the catalogue; it is delivered under a new tag.
    assert.deepEqual(diff.filter((d) => d.values.length > 0).map((d) => d.document), ['ActivityList', 'DeviceList', 'MapList']);
    assert.deepEqual(diff.filter((d) => d.tagChanged).map((d) => d.document), FOUR);
    for (const d of FOUR) assert.equal(answer(setup, d).etag, setTag(answer(setup, d), '8.6-setup'), d);
    for (const d of ['Context', 'Settings']) assert.deepEqual(answer(setup, d), answer(source, d), d);
    assert.deepEqual(back, source);
    // The gate refuses neither, and the check finds on both what it finds on the source.
    const findings = (s: TouchSet) => harmonyTouch.findingsByRule(harmonyTouch.checkConfiguration(harmonyTouch.readConfiguration(documentsOf(s))));
    assert.deepEqual(harmonyTouch.refusalsBeforeASync(documentsOf(setup)), []);
    assert.deepEqual(findings(setup), findings(source));
    assert.deepEqual(findings(setup), { 'repeated screen index': 2, 'number pad entry on no key': 2 });
  });

  it('the sets the lab holds are the ones this derivation gives, as parsed JSON, tags and all', lab.skipUnless(BUILT, BUILT_BACK), () => {
    const { setup, back } = chain();
    assert.deepEqual(json(BUILT), JSON.parse(JSON.stringify(setup)));
    assert.deepEqual(json(BUILT_BACK), JSON.parse(JSON.stringify(back)));
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

describe('on the fake remote, the 8.6 run and its put back', { skip: lab.needing(lab.skipUnless(SOURCE, HAND_OVER_LIST, ...CLOSING_LISTS)).skip }, () => {
  let sets: ReturnType<typeof chain> | undefined;
  const chained = () => (sets ??= chain());

  it('the recorded closing run of 8.5 asked for the six with the source\'s tags, which are the tags the bench Touch holds after 8.5', () => {
    const { source } = chained();
    assert.deepEqual(requestsOf(CLOSING_LISTS[0]!).map((r) => [keyOf(r.uri), r.etag === answer(source, keyOf(r.uri)).etag]),
      ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList'].map((d) => [d, true]));
  });

  it('the setup: the four 200 with its content and tags, Context and Settings 304, favourites and pictures 304, finished', () => {
    const { source, setup } = chained();
    const r = run({ mode: { kind: 'set', set: setup }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(source) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${FOUR.includes(w) || w === 'finish' ? 200 : 304}`));
    for (const a of syncAnswers(r).filter((x) => x['statusCode'] === '200' && String(x['uri']).startsWith('harmony://'))) {
      const ours = answer(setup, keyOf(a['uri'] as string));
      assert.equal(a['etag'], ours.etag);
      assert.deepEqual(a['resource'], ours.resource);
    }
  });

  it('the put back on a remote holding the setup: the four 200 with the source\'s content and tags, the rest as before, finished', () => {
    const { source, setup, back } = chained();
    const r = run({ mode: { kind: 'set', set: back }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(setup) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${FOUR.includes(w) || w === 'finish' ? 200 : 304}`));
    for (const a of syncAnswers(r).filter((x) => x['statusCode'] === '200' && String(x['uri']).startsWith('harmony://'))) {
      const was = answer(source, keyOf(a['uri'] as string));
      assert.equal(a['etag'], was.etag);
      assert.deepEqual(a['resource'], was.resource);
    }
  });

  it('the setup on a remote holding it already: every request 304 but the finish, the control', () => {
    const { setup } = chained();
    const r = run({ mode: { kind: 'set', set: setup }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(setup) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${w === 'finish' ? 200 : 304}`));
  });
});
