/**
 * The Harmony Touch set of `todo-touch.md` 8.3: favourites of ours and a logo of ours delivered beside the six
 * configuration documents the remote holds, and its exact inverse, built by `experiments/touchfavouritesset.ts` and
 * rehearsed through the real answerer and session on the fake remote.
 *
 * **What is held here.**
 *
 * 1. **The set delivers two pieces and leaves the rest to the remote**: the user's favourites document, changed by the
 *    codec's `composeTouchFavourites` from `touch-favourites/8.3-favourites.json`, and the logo of ours at the address
 *    of the added channel's station logo, each under the tag the set's name gives; the six are the source's, content
 *    and tags, so a remote that committed the source answers them 304; the tuning device's favourites and the line up
 *    are not in the set, so the answerer keeps the remote's copies.
 * 2. **The put back is what the remote held before**: the user's document and the station's logo as the recorded full
 *    sync delivered them, tags and all, since no set before 8.3 delivered either.
 * 3. **On the fake remote**, the closing `--unchanged` run of 8.2 served as recorded, its first list asking with the
 *    tags of the set the remote holds and each logo with the tag it holds: the set answers the six 304, the user's
 *    favourites 200, the other two favourites 304, the one logo of ours 200 and the other nine 304, and finishes; the
 *    put back the same with the remote's old content; and **the control**, the set on a remote that holds it already,
 *    still delivers the user's favourites, which every sync asks for untagged, and answers the logo 304.
 * 4. **The hand over's clash rule for favourites**: the remote hands its user's favourites up to another address than
 *    the one a sync asks for them at, so a set holding them stops before the sync when the hand over hands them up;
 *    the control, the six alone, goes on.
 * 5. **The builder's refusals**: content equal to what the remote holds, a body of the wrong kind, an address that is
 *    neither, a picture the gate refuses, and a favourites document the screens raise on, named by its kind and never by
 *    its address, which carries the account's identifiers.
 *
 * **Sources checked first.** The 8.3 brief in the lab; `touchchangedset.ts`, `touch-activity-set.test.ts` and their
 * fake remote, whose shape this follows; the screens' favourites code in the lab's firmware copy for the put addresses
 * (`getRequest` in `appscommon/harmony.lua`). Logitech's client was not consulted.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330; its firmware reports 17 and Logitech's templates
 * file it under 18. The two 8.3 sets are read by fixture, `touch_favourites_set` and `touch_favourites_set_back`, and
 * what the remote did with them is `packages/bench/test/harmony-touch/touch-favourites-runs.test.ts`.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { encodePng } from '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';
import * as lab from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/testkit/touch-recording';

import { contentOfComposed, documentsHeld, heldContent, isContent, putBackContent, withContent, type Content } from '../../experiments/touchfavouritesset.ts';
import { keyOf, resultOf, setTag, type RemoteRequest, type SetAnswer, type TouchSet, type TouchSyncOutcome } from '../../src/touchsync.ts';
import type { Scenario } from './touch-sync-run.ts';

const SOURCE = 'touch_activity_set_back';
const FULL = 'touch_full_sync_recording';
const CLOSING = 'touch_activity_unchanged_';
const CLOSING_LISTS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${CLOSING}list_${n}`);
const HAND_OVER_LIST = `${CLOSING}handover_list`;
const DESCRIPTION = fileURLToPath(new URL('../../touch-favourites/8.3-favourites.json', import.meta.url));
/** The two sets 8.3 built in the lab and delivered to the bench Touch, by fixture, for the comparison with what this derivation gives. */
const BUILT = 'touch_favourites_set';
const BUILT_BACK = 'touch_favourites_set_back';

const description = (): harmonyTouch.OwnFavourites => (JSON.parse(readFileSync(DESCRIPTION, 'utf8')) as { favourites: harmonyTouch.OwnFavourites }).favourites;
const json = (fixture: string): unknown => JSON.parse(new TextDecoder().decode(lab.require_(fixture)));
const recorded = (): SetAnswer[] =>
  (answersWritten(sessions(commands(records(FULL))).filter((s) => s.path === '/sys/hlapi')) as unknown as SetAnswer[]).filter(isContent);
const requestsOf = (fixture: string): RemoteRequest[] => {
  const requests = resultOf(new TextDecoder().decode(lab.require_(fixture)))?.['requests'];
  assert.ok(Array.isArray(requests), fixture);
  return requests as RemoteRequest[];
};

/** The chain as the bench built it: the source, then the favourites set, then its put back, each built as the script builds it. */
function chain(): { source: TouchSet; forward: TouchSet; back: TouchSet; before: Map<string, SetAnswer> } {
  const source = json(SOURCE) as TouchSet;
  const sets: Record<string, { set: TouchSet; record: Record<string, unknown> }> = { source: { set: source, record: {} } };
  const read = (at: string) => sets[at]!;
  const before = heldContent('source', read, recorded());
  const content = contentOfComposed(harmonyTouch.composeTouchFavourites(description(), documentsHeld(source, before)));
  const forward = withContent({ set: source, content, held: before, name: '8.3-favourites' });
  if ('refusals' in forward) throw new Error(forward.refusals.join('; '));
  sets['forward'] = { set: forward.set, record: { from: 'source', favourites: description() } };
  const put = putBackContent(forward.set, before);
  if (!Array.isArray(put)) throw new Error(put.refusals.join('; '));
  const back = withContent({ set: forward.set, content: put, held: heldContent('forward', read, recorded()), name: '8.3-favourites-back' });
  if ('refusals' in back) throw new Error(back.refusals.join('; '));
  return { source, forward: forward.set, back: back.set, before };
}

describe('the 8.3 set and its put back', { skip: lab.needing(lab.skipUnless(SOURCE, FULL)).skip }, () => {
  it('delivers the user\'s favourites and one logo beside the source\'s six, each under the tag the set\'s name gives', () => {
    const { source, forward, before } = chain();
    assert.deepEqual(forward.answers.filter((a) => !isContent(a)), source.answers);
    const content = forward.answers.filter(isContent);
    assert.deepEqual(content.map((a) => [a.uri.startsWith(harmonyTouch.CONTENT_USER), a['body-type']]), [[true, 'application/json'], [false, 'image/png']]);
    for (const a of content) {
      assert.equal(a.etag, setTag(a, '8.3-favourites'));
      assert.notEqual(a.etag, before.get(a.uri)?.etag);
    }
    // The logo is the drawing of the description's text, at the address of the added channel's station logo.
    const read = harmonyTouch.readConfiguration(documentsHeld(forward, before)).favourites[0]!;
    assert.equal(content[1]!.uri, read.favourites[0]!.logo);
    assert.equal(content[1]!.resource, Buffer.from(harmonyTouch.drawTouchLogo('8.3')).toString('base64'));
    assert.deepEqual(read.favourites.map((f) => f.number), description().order);
  });

  it('puts back exactly what the remote held before, the recorded full sync\'s content and tags', () => {
    const { forward, back, before } = chain();
    assert.deepEqual(back.answers.filter((a) => !isContent(a)), forward.answers.filter((a) => !isContent(a)));
    const content = back.answers.filter(isContent);
    assert.deepEqual(content.map((a) => a.uri), forward.answers.filter(isContent).map((a) => a.uri));
    for (const a of content) {
      const was = before.get(a.uri)!;
      assert.deepEqual([a.etag, a['body-type'], a.resource], [was.etag, was['body-type'], was.resource]);
    }
  });

  it('the sets the lab holds are the ones this derivation gives, as parsed JSON, tags and all', lab.skipUnless(BUILT, BUILT_BACK), () => {
    const { forward, back } = chain();
    assert.deepEqual(json(BUILT), JSON.parse(JSON.stringify(forward)));
    assert.deepEqual(json(BUILT_BACK), JSON.parse(JSON.stringify(back)));
  });

  it('refuses content equal to what the remote holds, a body of the wrong kind, an address that is neither, and a picture the gate refuses', () => {
    const { source, before } = chain();
    const user = [...before.values()].find((a) => a.uri.startsWith(harmonyTouch.CONTENT_USER))!;
    const logo = [...before.values()].find((a) => a.uri.startsWith('content-image://1.0/station/'))!;
    const refusals = (content: Content[]): readonly string[] => {
      const r = withContent({ set: source, content, held: before, name: 'x' });
      return 'refusals' in r ? r.refusals : [];
    };
    assert.match(refusals([{ uri: user.uri, 'body-type': 'application/json', resource: user.resource }])[0]!, /the user's favourites: the content equals what the remote holds/);
    assert.match(refusals([{ uri: logo.uri, 'body-type': 'application/json', resource: {} }])[0]!, /a body of application\/json where it takes image\/png/);
    assert.match(refusals([{ uri: 'proxy://Finished', 'body-type': 'application/json', resource: {} }])[0]!, /neither a favourites document nor a picture/);
    const big = Buffer.from(encodePng(60, 60, new Uint8Array(60 * 60 * 4), 4)).toString('base64');
    assert.match(refusals([{ uri: logo.uri, 'body-type': 'image/png', resource: big }]).join(';'), /larger than the 54 by 54/);
    assert.deepEqual(refusals([]), ['no content is delivered']);
    // A favourites document the screens raise on is refused by the gate, named by its kind and never by its address.
    const broken = refusals([{ uri: user.uri, 'body-type': 'application/json', resource: { ...(user.resource as object), preferences: true } }]);
    assert.match(broken.join(';'), /^the user's favourites\.preferences: the favourites are not an object, which the remote's screens raise on: the error screen at every start, .* \(screens raise\)$/);
    assert.ok(broken.every((r) => !r.includes('://')));
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

/**
 * 8.2's closing run's lists as a remote holding `six` and the content `held` would hand them out: the six asked with
 * `six`'s tags, every logo with the tag `held` states for it, the favourites untagged as every sync asks for them.
 */
function listsHolding(six: TouchSet, held: ReadonlyMap<string, SetAnswer>): RemoteRequest[][] {
  return CLOSING_LISTS.map(requestsOf).map((list) => list.map((r): RemoteRequest => {
    if (r.uri.startsWith('harmony://')) return { ...r, etag: six.answers.find((a) => keyOf(a.uri) === keyOf(r.uri))!.etag! };
    const tag = held.get(r.uri)?.etag;
    return r.uri.startsWith('content-image://') && tag !== undefined ? { ...r, etag: tag } : r;
  }));
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

/** The answers of a run with 200 that carry content, by address, with their tag and body. */
const delivered = (r: Run): Map<string, { etag: unknown; resource: unknown }> => new Map(syncAnswers(r)
  .filter((a) => a['statusCode'] === '200' && !String(a['uri']).startsWith('proxy://'))
  .map((a) => [a['uri'] as string, { etag: a['etag'], resource: a['resource'] }]));

describe('on the fake remote, the 8.3 set and its put back', { skip: lab.needing(lab.skipUnless(SOURCE, FULL, HAND_OVER_LIST, ...CLOSING_LISTS)).skip }, () => {
  let built: ReturnType<typeof chain> | undefined;
  const sets = () => (built ??= chain());
  const holdingAfter = (set: TouchSet, before: ReadonlyMap<string, SetAnswer>): Map<string, SetAnswer> => {
    const m = new Map(before);
    for (const a of set.answers.filter(isContent)) m.set(a.uri, a);
    return m;
  };

  it('8.2\'s closing run asked for every logo with the tag the recorded full sync delivered it with, so the remote holds those', () => {
    const { before } = sets();
    const logos = CLOSING_LISTS.map(requestsOf).flat().filter((r) => r.uri.startsWith('content-image://'));
    assert.equal(logos.length, 8);
    assert.ok(logos.every((r) => r.etag !== undefined && r.etag === before.get(r.uri)?.etag));
  });

  it('the set on a remote holding the source: the six 304, the user\'s favourites and the logo 200 with its content and tags, the rest 304, finished', () => {
    const { source, forward, before } = sets();
    const r = run({ mode: { kind: 'set', set: forward }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(source, before) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(counts(r), { 'six 304': 6, 'favourites 200': 1, 'favourites 304': 2, 'picture 200': 1, 'picture 304': 9, 'finish 200': 1 });
    const got = delivered(r);
    for (const a of forward.answers.filter(isContent)) assert.deepEqual(got.get(a.uri), { etag: a.etag, resource: a.resource });
    assert.equal(got.size, 2);
  });

  it('the put back on a remote holding the set: the same two 200 with the remote\'s old content and tags, finished', () => {
    const { forward, back, before } = sets();
    const r = run({ mode: { kind: 'set', set: back }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(forward, holdingAfter(forward, before)) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(counts(r), { 'six 304': 6, 'favourites 200': 1, 'favourites 304': 2, 'picture 200': 1, 'picture 304': 9, 'finish 200': 1 });
    const got = delivered(r);
    for (const a of back.answers.filter(isContent)) assert.deepEqual(got.get(a.uri), { etag: before.get(a.uri)!.etag, resource: before.get(a.uri)!.resource });
  });

  it('the set on a remote holding it already: the logo 304, and the user\'s favourites still 200, which every sync asks for untagged, the control', () => {
    const { forward, before } = sets();
    const r = run({ mode: { kind: 'set', set: forward }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(forward, holdingAfter(forward, before)) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(counts(r), { 'six 304': 6, 'favourites 200': 1, 'favourites 304': 2, 'picture 304': 10, 'finish 200': 1 });
  });

  it('stops before the sync when the hand over hands up the user\'s favourites, which the set would revert; the six alone go on, the control', () => {
    const { source, forward, before } = sets();
    const user = [...before.values()].find((a) => a.uri.startsWith(harmonyTouch.CONTENT_USER))!;
    const id = String((user.resource as { id: unknown }).id);
    // The address the screens hand the user's favourites up to, `content://1.0/user/` and the document's id.
    const put: RemoteRequest = { verb: 'put', uri: `content://1.0/user/${id}`, resource: encodeURIComponent(JSON.stringify(user.resource)).replace(/%20/g, '+') };
    const finished: RemoteRequest = { verb: 'POST', uri: 'proxy://Finished' };
    const r = run({ mode: { kind: 'set', set: forward }, handOver: [[put], [finished]], sync: listsHolding(source, before) });
    assert.equal(r.outcome.ending, 'refused');
    assert.match(r.outcome.reason ?? '', /^the remote handed up a favourites document, which the set also holds/);
    const control = run({ mode: { kind: 'set', set: source }, handOver: [[put], [finished]], sync: listsHolding(source, before) });
    assert.equal(control.outcome.ending, 'finished', control.outcome.reason);
  });
});
