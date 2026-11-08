/**
 * The Harmony Touch sets of `todo-touch.md` 9.2: the empty configuration, no device and no activity, built from the set
 * the bench Touch held, and its put back, which carries the favourites documents and logos beside the six; built by
 * `experiments/touchemptyset.ts` and rehearsed through the real answerer and session on the fake remote.
 *
 * **What is held here.**
 *
 * 1. **The empty set is the source's six with the four lists emptied**, `ActivityList`, `DeviceList`, `MapList` and
 *    `ProtocolList` each under the tag the set's name gives, Context and Settings the source's, content and tags. The
 *    gate passes it, the reader reads no activity, device, map, definition or favourites activity, and the codec's
 *    `keptAtTheCommit` says the screens ask for no favourites document and for two pictures, the bench Settings' user
 *    background and its twin, so the pictures are carried and the favourites documents dropped (the reading of the
 *    codec's `empty.ts`, which the run measures, `packages/bench/test/touch-empty-runs.test.ts`).
 * 2. **The put back is the six of the set before, content and tags, and eleven pieces of content**: the user's
 *    favourites document, the tuning device's, the line up, the uploaded logo and seven station logos, each as the
 *    remote held it before the empty set, which is the recorded full sync's content and tag, since 8.3's put back
 *    restored exactly those and no set since delivered content. Every piece is one the remote asks for once it holds
 *    the six, and nothing it asks for is missing. **The control**: the same put back without the content, the six alone,
 *    answers each favourites document 304, which on a remote holding none copies nothing (the second control on the fake remote).
 * 3. **The sets the lab holds**, `work/touch-firmware/sets/9.2-empty` and `9.2-empty-back`, are what this derivation
 *    gives, read by fixture, `touch_empty_set` and `touch_empty_set_back`; they were built by the lab's
 *    `notes/9.2-build-sets.ts` before `touch-device-set.ts --empty` existed, and the script builds them byte for byte.
 * 4. **On the fake remote**, the lists of 8.6's closing run served as the reading predicts them, the five runs of the
 *    lab's `notes/9.2-preflight.md` section 7: the empty set on a remote holding the source answers the four 200 with
 *    its content and tags, Context and Settings 304, the two backgrounds 304 and the finish, in a first write of 1573
 *    characters, one chunk; the put back on a remote holding the empty set with its pictures carried answers the four
 *    200, Context and Settings 304, the three favourites documents 200 with the set's content and tags, the ten pictures
 *    304 and the finish, in a first write of 567941 characters, 19 chunks, and a line up write of 56446, two chunks; the
 *    same with the pictures not carried answers the eight logos 200 and the two backgrounds 404; the empty set on a
 *    remote holding it answers every request 304 but the finish, the control; and the six alone answer the favourites
 *    304. The write sizes are the ones the run's kept files measured.
 *
 * **Sources checked first.** The 9.2 preflight and brief in the lab; `touch-setup-set.test.ts`, whose shape this follows;
 * the codec's `empty.ts` and its test; `touchfavouritesset.ts` for what the remote held and asks for; the reference's
 * `answering-a-sync.md` and `favourites-and-settings.md`. Logitech's client was not consulted: the documents are the
 * remote's, and what is checked is ours.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330; its firmware reports 17 and Logitech's templates file it
 * under 18. The lab half reads the bench sets and the recorded lists, prints nothing out of them and touches no remote.
 * The source is the `touch_setup_set_back` fixture, `8.6-setup-back`, which 9.2's first hash found the remote holding.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

// The Node entry, for the fonts, the icons, the deflate and the SHA-256 the core asks its loader for.
import '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';
import * as lab from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/testkit/touch-recording';

import { answersWhenHolding, setDifferences, writeOfAnswersSize } from '../experiments/touchchangedset.ts';
import { EMPTY_DOCUMENTS, emptyBackOf, withEmpty } from '../experiments/touchemptyset.ts';
import { contentKind, heldContent, isContent, isPictureAddress } from '../experiments/touchfavouritesset.ts';
import { sixOf } from '../experiments/touchsettingsset.ts';
import { keyOf, prepareSet, resultOf, setTag, type RemoteRequest, type SetAnswer, type TouchSet, type TouchSyncOutcome } from '../src/touchsync.ts';
import type { Scenario } from './touch-sync-run.ts';

const SOURCE = 'touch_setup_set_back';
const FULL = 'touch_full_sync_recording';
const CLOSING = 'touch_setup_unchanged_';
const CLOSING_LISTS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${CLOSING}list_${n}`);
const HAND_OVER_LIST = `${CLOSING}handover_list`;
/** The two sets 9.2 built in the lab and delivered to the bench Touch, by fixture. */
const BUILT = 'touch_empty_set';
const BUILT_BACK = 'touch_empty_set_back';
const FOUR: readonly string[] = EMPTY_DOCUMENTS;

const json = (fixture: string): unknown => JSON.parse(new TextDecoder().decode(lab.require_(fixture)));
const requestsOf = (fixture: string): RemoteRequest[] => {
  const requests = resultOf(new TextDecoder().decode(lab.require_(fixture)))?.['requests'];
  assert.ok(Array.isArray(requests), fixture);
  return requests as RemoteRequest[];
};
const answer = (set: TouchSet, document: string) => set.answers.find((a) => keyOf(a.uri) === document)!;
const documentsOf = (set: TouchSet): harmonyTouch.SyncDocuments => harmonyTouch.documentsOfAnswers(set.answers as unknown as harmonyTouch.SyncAnswer[]);
const recorded = (): SetAnswer[] =>
  (answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi')) as unknown as SetAnswer[]).filter(isContent);

/** The chain as the bench built it: the source, the empty set, its put back, and what the remote held before the empty set. */
function chain(): { source: TouchSet; empty: TouchSet; back: TouchSet; held: Map<string, SetAnswer> } {
  const source = json(SOURCE) as TouchSet;
  const empty = withEmpty({ set: source, name: '9.2-empty' });
  if ('refusals' in empty) throw new Error(empty.refusals.join('; '));
  const held = heldContent('source', () => ({ set: source, record: {} }), recorded());
  const back = emptyBackOf({ empty: empty.set, before: source, held, name: '9.2-empty-back' });
  if ('refusals' in back) throw new Error(back.refusals.join('; '));
  return { source, empty: empty.set, back: back.set, held };
}

describe('the 9.2 empty set and its put back', { skip: lab.needing(lab.skipUnless(SOURCE, FULL)).skip }, () => {
  it('the empty set is the source\'s six with the four lists emptied under the set\'s tags, Context and Settings the source\'s, read as nothing, the gate passing it', () => {
    const { source, empty } = chain();
    assert.deepEqual(empty.answers.map((a) => a.uri), sixOf(source).answers.map((a) => a.uri));
    const diff = setDifferences(sixOf(source), empty);
    assert.deepEqual(diff.filter((d) => d.values.length > 0).map((d) => d.document), FOUR);
    assert.deepEqual(diff.filter((d) => d.tagChanged).map((d) => d.document), FOUR);
    for (const d of FOUR) assert.equal(answer(empty, d).etag, setTag(answer(empty, d), '9.2-empty'), d);
    for (const d of ['Context', 'Settings']) assert.ok(isDeepStrictEqual(answer(empty, d), answer(source, d)), d);
    const docs = documentsOf(empty);
    assert.deepEqual(harmonyTouch.refusalsBeforeASync(docs), []);
    assert.ok(!('refusals' in prepareSet(empty)));
    const c = harmonyTouch.readConfiguration(docs);
    assert.deepEqual([c.activities.length, c.devices.length, c.maps.length, c.protocols.length, c.favourites.length], [0, 0, 0, 0, 0]);
    // What the commit keeps, by the reading: no favourites document asked for, two pictures, so the pictures carried.
    assert.deepEqual(harmonyTouch.keptAtTheCommit(docs), { favourites: [], pictures: true });
    assert.equal(harmonyTouch.userBackgroundsAsked(docs), 2);
  });

  it('the put back is the source\'s six, content and tags, and the three favourites documents and eight logos as the remote held them before, every one asked for', () => {
    const { source, back, held } = chain();
    assert.ok(isDeepStrictEqual(sixOf(back), sixOf(source)), 'the six are the source\'s, content and tags');
    const content = back.answers.filter(isContent);
    const kinds = content.map((a) => contentKind(a.uri));
    assert.deepEqual([...new Set(kinds)].map((k) => `${kinds.filter((x) => x === k).length} ${k}`),
      ['1 the user\'s favourites', '1 the tuning device\'s favourites', '1 the line up', '1 an uploaded logo', '7 a station\'s logo']);
    // Compared as booleans, so a failure names the kind and never prints an address, a tag or a value of the account.
    for (const a of content) {
      const was = held.get(a.uri);
      assert.ok(was !== undefined && was.etag === a.etag && was['body-type'] === a['body-type'] && isDeepStrictEqual(was.resource, a.resource), contentKind(a.uri));
    }
    // What the remote held is the recorded full sync's, content and tags: 8.3's put back restored exactly those.
    const byUri = new Map(recorded().map((a) => [a.uri, a]));
    for (const a of content) assert.ok(byUri.get(a.uri)?.etag === a.etag, contentKind(a.uri));
    assert.ok(!('refusals' in prepareSet(back)));
    const read = harmonyTouch.readConfiguration(documentsOf(back)).favourites;
    assert.deepEqual(read.map((f) => [f.device?.name, f.favourites.length, f.missing.length]), [['LG TV', 5, 0]]);
  });

  it('the sets the lab holds are the ones this derivation gives, as parsed JSON, tags and all', lab.skipUnless(BUILT, BUILT_BACK), () => {
    const { empty, back } = chain();
    // As booleans, so a failure prints no value out of the documents.
    assert.ok(isDeepStrictEqual(json(BUILT), JSON.parse(JSON.stringify(empty))), BUILT);
    assert.ok(isDeepStrictEqual(json(BUILT_BACK), JSON.parse(JSON.stringify(back))), BUILT_BACK);
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

const syncWrites = (r: Run): Record<string, unknown>[][] =>
  r.lines.slice(r.lines.findIndex((l) => l.name === 'setup/sync')).flatMap((l) => (l.answers === undefined ? [] : [l.answers]));

/** The answers of a run by kind and status, in order. */
function summary(r: Run): string[] {
  return syncWrites(r).flat().map((a) => {
    const uri = a['uri'] as string;
    const what = uri.startsWith('harmony://') ? harmonyTouch.documentKeyOf(uri)! : uri.startsWith('proxy://') ? 'finish' : isPictureAddress(uri) ? (uri.startsWith('https://') ? 'background' : 'logo') : 'favourites';
    return `${what} ${String(a['statusCode'])}`;
  });
}

/** Every 200 of a run against the set it should come from, content and tag. */
function deliveredFrom(r: Run, set: TouchSet): void {
  for (const a of syncWrites(r).flat().filter((x) => x['statusCode'] === '200' && !String(x['uri']).startsWith('proxy://'))) {
    const uri = a['uri'] as string;
    const ours = set.answers.find((x) => (uri.startsWith('harmony://') ? keyOf(x.uri) === keyOf(uri) : x.uri === uri))!;
    assert.ok(a['etag'] === ours.etag && isDeepStrictEqual(a['resource'], ours.resource), `${String(a['statusCode'])} with the set's content and tag`);
  }
}

/** A list with the tags `held` states for each of its documents. */
const tagsOf = (held: TouchSet, list: readonly RemoteRequest[]): RemoteRequest[] => list.map((r) => ({ ...r, etag: answer(held, keyOf(r.uri)).etag! }));

const SIX = ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList'];
const sixAs = (four: string): string[] => SIX.map((d) => `${d} ${FOUR.includes(d) ? four : '304'}`);

describe('on the fake remote, the 9.2 run and its put back, the five runs of the preflight', { skip: lab.needing(lab.skipUnless(SOURCE, FULL, HAND_OVER_LIST, ...CLOSING_LISTS)).skip }, () => {
  let sets: ReturnType<typeof chain> | undefined;
  const chained = () => (sets ??= chain());
  const lists = () => CLOSING_LISTS.map(requestsOf);
  const handOver = () => [requestsOf(HAND_OVER_LIST)];

  it('8.6\'s closing run, whose lists these are, asked for the six with the source\'s tags, three favourites documents untagged and two backgrounds and eight logos', () => {
    const { source } = chained();
    const l = lists();
    assert.deepEqual(l[0]!.map((r) => r.etag === answer(source, keyOf(r.uri)).etag), SIX.map(() => true));
    assert.deepEqual([l[2]!, l[3]!, l[4]!].map((x) => x.map((r) => [contentKind(r.uri), r.etag === undefined])), [
      [['the user\'s favourites', true]], [['the tuning device\'s favourites', true]], [['the line up', true]],
    ]);
    assert.deepEqual(l[6]!.map((r) => contentKind(r.uri)), ['a background', 'a background', 'an uploaded logo', ...Array(7).fill('a station\'s logo')]);
  });

  it('the empty set on a remote holding the source: the four 200 with its content and tags, Context and Settings 304, the two backgrounds 304, finished, a first write of 1573 characters', () => {
    const { source, empty } = chained();
    const l = lists();
    const r = run({ mode: { kind: 'set', set: empty }, handOver: handOver(), sync: [tagsOf(source, l[0]!), [], l[6]!.filter((p) => p.uri.startsWith('https://')), l[7]!] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), [...sixAs('200'), 'background 304', 'background 304', 'finish 200']);
    deliveredFrom(r, empty);
    const gate = prepareSet(empty);
    assert.ok(!('refusals' in gate));
    const size = writeOfAnswersSize(answersWhenHolding(gate.set, sixOf(source)));
    assert.deepEqual([size.length, size.chunks], [1573, 1]);
  });

  it('the put back on a remote holding the empty set, the pictures carried: the four 200, the three favourites 200 with the set\'s content and tags, the ten pictures 304, writes of 567941 and 56446 characters', () => {
    const { empty, back } = chained();
    const l = lists();
    const r = run({ mode: { kind: 'set', set: back }, handOver: handOver(), sync: [tagsOf(empty, l[0]!), [], l[2]!, l[3]!, l[4]!, [], l[6]!, l[7]!] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), [...sixAs('200'), 'favourites 200', 'favourites 200', 'favourites 200', 'background 304', 'background 304', ...Array(8).fill('logo 304'), 'finish 200']);
    deliveredFrom(r, back);
    const writes = syncWrites(r);
    assert.deepEqual([writes[0]!, writes[3]!].map((w) => [writeOfAnswersSize(w).length, writeOfAnswersSize(w).chunks]), [[567941, 19], [56446, 2]]);
  });

  it('the same with the pictures not carried, each asked without a tag: the eight logos 200 with the set\'s content and tags and the two backgrounds 404', () => {
    const { empty, back } = chained();
    const l = lists();
    const untagged = l[6]!.map(({ verb, uri }) => ({ verb, uri }));
    const r = run({ mode: { kind: 'set', set: back }, handOver: handOver(), sync: [tagsOf(empty, l[0]!), [], l[2]!, l[3]!, l[4]!, [], untagged, l[7]!] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), [...sixAs('200'), 'favourites 200', 'favourites 200', 'favourites 200', 'background 404', 'background 404', ...Array(8).fill('logo 200'), 'finish 200']);
    deliveredFrom(r, back);
  });

  it('the control: the empty set on a remote holding it answers every request 304 but the finish', () => {
    const { empty } = chained();
    const l = lists();
    const r = run({ mode: { kind: 'set', set: empty }, handOver: handOver(), sync: [tagsOf(empty, l[0]!), [], l[6]!.filter((p) => p.uri.startsWith('https://')), l[7]!] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), [...sixAs('304'), 'background 304', 'background 304', 'finish 200']);
  });

  it('the second control: the six alone on a remote holding the empty set answer each favourites document 304, which on a remote holding none copies nothing', () => {
    const { empty, back } = chained();
    const l = lists();
    const r = run({ mode: { kind: 'set', set: sixOf(back) }, handOver: handOver(), sync: [tagsOf(empty, l[0]!), [], l[2]!, l[3]!, l[4]!, [], l[6]!, l[7]!] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), [...sixAs('200'), 'favourites 304', 'favourites 304', 'favourites 304', 'background 304', 'background 304', ...Array(8).fill('logo 304'), 'finish 200']);
  });
});
