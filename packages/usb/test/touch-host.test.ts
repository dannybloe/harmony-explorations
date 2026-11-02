/**
 * A strict envelope for an answer to a Harmony Touch, the rule a writer of ours keeps, as a function,
 * calibrated on the three recorded syncs and on mutated answers that must each be refused. It is stricter
 * than the remote, on purpose, in three ways:
 *
 * * it requires a `body-type` of `application/json` or `image/png`, where the remote reads no type for a
 *   document and stores a picture typed `image/jpeg` or given no type;
 * * it requires a picture's bytes to open as a PNG, where the remote decodes the base64 without a check;
 * * it passes a 304 without looking at its tag, where the remote needs a tag on a 304 of a favourites
 *   document or a picture, so this rule never judges a 304 and the recordings hold none.
 *
 * The remote's own rules are `reference/architectures/harmony-touch/answering-a-sync.md`.
 *
 * **The question.** `touch-sync.test.ts` and `touch-sync-both-ways.test.ts` measured what Logitech's client
 * wrote during a sync and closed each document against the web answer it came from. This file asks the next
 * thing: of everything the client wrote, which parts does the **remote** insist on, so that a program other
 * than Logitech's, answering the same requests, would be taken for the server? The firmware reading of
 * `todo-touch.md` 4.2 (`tests/test_harmony_touch_host.py` anchors it in the compiled engine) found the
 * remote checks the envelope of an answer and not its contents: the address is matched exactly, the status
 * is read as text and only some values pass, a 200 of a document needs a non empty entity tag, a document
 * only works as a parsed object, a picture needs a tag and is base64, and a long answer is announced first.
 * This file turns those rules, made stricter as above, into one predicate and shows every answer the client
 * wrote passes it while a single mutation of each kind fails, which is the offline acceptance rehearsal 4.2
 * proposes.
 *
 * **It is not a second measurement of the recordings.** The values, the per document equalities and the
 * counts are `touch-sync-both-ways.test.ts`'s; here the recordings are the calibration corpus for a rule,
 * the way a base address derivation is scored against the value it is meant to find. The answers come from
 * `touch-recording.ts`'s `answersWritten`, the one walk, and the request lists from `requestLists`, so no
 * session is walked a second time.
 *
 * **What it rules out.** That Logitech's client wrote anything this predicate refuses, for the cases the
 * recordings cover: a rewritten address, a missing tag on a 200, a status outside the accepted set, a
 * document sent as a string, or a picture that is not a PNG. The last two the remote itself takes and
 * then cannot use, or stores unchecked. It does not reach a 304,
 * which no recording holds, nor the abort path, which the firmware reading covers and this does not.
 *
 * **Width.** Three syncs of one Harmony Touch on firmware 4.15.330, one account, one client, Harmony
 * Desktop: the trial, the full sync of a filled account, and one reverse sync. Every answer in them carried
 * status 200, so the 304 and the abort branches are read in the firmware and not exercised here.
 *
 * **Sources checked first.** `touch-recording.ts` and `touch-sync-both-ways.test.ts`;
 * `reference/architectures/harmony-touch/answering-a-sync.md` and `usb.md`; the firmware reading of
 * `todo-touch.md` 4.2, anchored in `tests/test_harmony_touch_host.py`.
 *
 * The fixtures hold the account's data, an auth token and the unit's serial, so this file asserts the shape
 * of an answer, counts and the predicate's verdict, and prints no value out of them. It skips without the lab.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { SIX, answersWritten, commands, records, requestLists, requestName, resource, sessions, text } from './touch-recording.ts';
import type { Answer, Session } from './touch-recording.ts';

const FIXTURES = ['touch_sync_recording', 'touch_full_sync_recording', 'touch_reverse_sync_recording'] as const;

const hlapi = (fixture: string): Session[] => sessions(commands(records(fixture))).filter((s) => s.path === '/sys/hlapi');

/** The body answers a host writes, the end markers (`proxy://Finished`) dropped: what the remote stores. */
const bodies = (fixture: string): Answer[] => answersWritten(hlapi(fixture)).filter((a) => a.uri !== 'proxy://Finished');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const ACCEPTED_STATUS = new Set(['200', '304']);
const BODY_TYPES = new Set(['application/json', 'image/png']);

/** A parsed JSON object, which is what a document's `resource` must be: not a string of one, not an array. */
const isObject = (v: unknown): boolean => typeof v === 'object' && v !== null && !Array.isArray(v);
const hasTag = (a: Answer): boolean => typeof a.etag === 'string' && a.etag.length > 0;
const isPng = (v: unknown): boolean => typeof v === 'string' && Buffer.from(v, 'base64').subarray(0, 4).equals(PNG);

/**
 * The strict envelope, stricter than the remote's as the header lists, for a 200 answer, as a boolean. A
 * 304 and the abort path are read in the firmware and not reached by the recordings, so they are out of
 * this predicate's scope; it judges only the 200 answers the recordings hold.
 */
function strictEnvelopeAccepts(a: Answer): boolean {
  if (typeof a.statusCode !== 'string' || !ACCEPTED_STATUS.has(a.statusCode)) return false;
  if (a.statusCode !== '200') return true;
  const type = a['body-type'];
  if (typeof type !== 'string' || !BODY_TYPES.has(type)) return false;
  if (!hasTag(a)) return false;
  return type === 'application/json' ? isObject(a.resource) : isPng(a.resource);
}

/** The addresses the remote asked for across the whole sync, which an answer's own address must be one of. */
const requestedUris = (on: Session[]): Set<string> => new Set(requestLists(on).flat().map((r) => r.uri));

for (const fixture of FIXTURES) {
  test(`every answer the client wrote for ${fixture} passes the strict envelope a writer of ours keeps`, lab.skipUnless(fixture), () => {
    const written = bodies(fixture);
    assert.ok(written.length > 0, 'the sync carried at least one document');
    for (const a of written) assert.ok(strictEnvelopeAccepts(a), `${a['body-type'] ?? 'no type'} answer accepted`);
    // Only the two body types the strict rule takes appear; nothing else is written with a body.
    assert.deepEqual([...new Set(written.map((a) => a['body-type']))].sort(), ['application/json', 'image/png'].filter((t) => written.some((a) => a['body-type'] === t)));
  });

  test(`every answer in ${fixture} names an address the remote asked for, and none that it did not`, lab.skipUnless(fixture), () => {
    const on = hlapi(fixture);
    const asked = requestedUris(on);
    const answers = answersWritten(on).filter((a) => a.uri !== 'proxy://Finished');
    assert.ok(answers.length > 0, 'the sync wrote at least one answer');
    for (const a of answers) assert.ok(asked.has(a.uri), 'the answer was requested');
    // The negative, on the logical addresses, is in the control test below: a rewritten `harmony://`
    // address is not among the requests. The absolute picture addresses cannot be rewritten the same way.
  });

  test(`${fixture} announces every answer write with a Content-Length first`, lab.skipUnless(fixture), () => {
    const names = hlapi(fixture).filter((s) => s.mode === 'W').map((s) => requestName(text(s.written)));
    const writes = names.filter((n) => n === 'proxy/response?write').length;
    assert.ok(writes > 0, 'the sync wrote at least one answer');
    assert.ok(announcedBeforeEachWrite(names), 'each answer write is preceded by a Content-Length');
  });
}

/** True when every `proxy/response?write` in the ordered request names is immediately preceded by an announcement. */
function announcedBeforeEachWrite(names: string[]): boolean {
  return names.every((name, i) => name !== 'proxy/response?write' || names[i - 1] === 'Content-Length');
}

test('the six documents and three favourites documents of the full sync are objects with tags, pictures are PNGs', lab.skipUnless('touch_full_sync_recording'), () => {
  const written = bodies('touch_full_sync_recording');
  const documents = written.filter((a) => a['body-type'] === 'application/json');
  const pictures = written.filter((a) => a['body-type'] === 'image/png');
  assert.equal(documents.length, 9);
  assert.equal(pictures.length, 10);
  for (const d of documents) assert.ok(isObject(d.resource) && hasTag(d), 'a document is an object with a tag');
  for (const p of pictures) assert.ok(isPng(p.resource) && hasTag(p), 'a picture is a PNG with a tag');
});

test('the largest answer write of the full sync is one proxy/response?write of 571560 bytes', lab.skipUnless('touch_full_sync_recording'), () => {
  // The size alone; the slow acknowledgement it was once blamed for is the next test's, and it follows the
  // reload the write sets off rather than the write's length.
  const writes = hlapi('touch_full_sync_recording').filter((s) => s.mode === 'W' && requestName(text(s.written)) === 'proxy/response?write');
  assert.equal(Math.max(...writes.map((s) => s.written.length)), 571560);
});

/** `filepipe.ts`'s reply window, `REPLY_TIMEOUT_MS`, which is not exported. */
const TRANSPORT_REPLY_WINDOW_MS = 5000;

/** The slow acknowledgement of each recording, in seconds to a tenth, as `docs/test-notes/harmony-touch.md` quotes them. */
const SLOW_ACK_SECONDS: Record<string, number> = {
  touch_sync_recording: 4.6, touch_full_sync_recording: 7.6, touch_reverse_sync_recording: 4.8,
};

for (const fixture of FIXTURES) {
  test(`in ${fixture} the slow acknowledgement is the last chunk of the write that completes the core documents`, lab.skipUnless(fixture), () => {
    // Times and sizes only. Each answer write is chunked, and the remote acknowledges each chunk; the
    // final chunk of the write holding the last core document waits for the remote to store the set and
    // reload, so it is the slow one, whatever the write's size.
    const writes = hlapi(fixture).filter((s) => s.mode === 'W' && requestName(text(s.written)) === 'proxy/response?write');
    const finals = writes.map((s) => s.writeAcksMs.at(-1));
    assert.ok(finals.every((ms) => typeof ms === 'number'), 'every write is timed');
    for (const s of writes) for (const ms of s.writeAcksMs.slice(0, -1)) assert.ok(ms! < 500, 'a chunk before the last is acknowledged at once');
    const carriesCore = (s: (typeof writes)[number]): boolean =>
      answersWritten([s]).some((a) => a.uri.startsWith('harmony://') && SIX.includes(resource(a.uri)));
    const completing = writes.findLastIndex(carriesCore);
    assert.ok(completing >= 0, 'a write carries a core document');
    const slow = finals[completing]!;
    finals.forEach((ms, i) => { if (i !== completing) assert.ok(ms! < slow / 2, 'every other final chunk is quicker by half'); });
    // The reload takes seconds, to the tenth of a second the test notes quote it at.
    assert.equal(Math.round(slow / 100) / 10, SLOW_ACK_SECONDS[fixture]);
    assert.equal(slow > TRANSPORT_REPLY_WINDOW_MS, fixture === 'touch_full_sync_recording', 'only the full sync passes the transport window');
    if (fixture === 'touch_reverse_sync_recording') assert.equal(writes[completing]!.writeAcksMs.length, 1, 'one chunk, and still slow');
  });
}

test('the two syncs down read the provisioning information and it reports mode 0; the reverse sync reads none', lab.skipUnless(...FIXTURES), () => {
  // The mode alone is compared; nothing else of the provisioning answer, which names the account, is read.
  const modes = (fixture: string): number[] => {
    const on = hlapi(fixture);
    const out: number[] = [];
    for (let i = 0; i + 1 < on.length; i += 1) {
      if (on[i]!.mode !== 'W' || requestName(text(on[i]!.written)) !== 'setup/account?getprovisioninfo') continue;
      const outer = JSON.parse(text(on[i + 1]!.read).slice('Response,'.length)) as { result: unknown };
      const inner = (typeof outer.result === 'string' ? JSON.parse(outer.result) : outer.result) as { mode?: unknown };
      out.push(Number(inner.mode));
    }
    return out;
  };
  assert.deepEqual(modes('touch_sync_recording'), [0]);
  assert.deepEqual(modes('touch_full_sync_recording'), [0]);
  assert.deepEqual(modes('touch_reverse_sync_recording'), []);
});

// The controls: the same predicate must reject each kind of broken answer, or it checks nothing. One per
// closure, built by mutating one field of an answer that passes.
test('a control: the strict envelope rejects a rewritten address, a bad status, a missing tag, a string document and a non-PNG picture', lab.skipUnless('touch_full_sync_recording'), () => {
  const written = bodies('touch_full_sync_recording');
  const document = written.find((a) => a['body-type'] === 'application/json')!;
  const picture = written.find((a) => a['body-type'] === 'image/png')!;
  const asked = requestedUris(hlapi('touch_full_sync_recording'));

  // Calibration: the unmutated answers pass, so a rejection below is the mutation and not a wrong baseline.
  assert.ok(strictEnvelopeAccepts(document) && asked.has(document.uri));
  assert.ok(strictEnvelopeAccepts(picture) && asked.has(picture.uri));

  assert.ok(!asked.has(document.uri.replace('harmony://', 'https://host/')), 'a rewritten address is not requested');
  assert.ok(!strictEnvelopeAccepts({ ...document, statusCode: '301' }), 'a 301 is refused');
  assert.ok(!strictEnvelopeAccepts({ ...document, statusCode: 200 as unknown as string }), 'a non-text status is refused');
  assert.ok(!strictEnvelopeAccepts({ ...document, etag: '' }), 'a 200 without a tag is refused');
  assert.ok(!strictEnvelopeAccepts({ ...document, resource: JSON.stringify(document.resource) }), 'a document sent as a string is refused');
  assert.ok(!strictEnvelopeAccepts({ ...picture, resource: Buffer.from('not a png').toString('base64') }), 'a picture that is not a PNG is refused');
  assert.ok(!strictEnvelopeAccepts({ ...picture, 'body-type': 'image/gif' }), 'a picture typed image/gif is refused');
});

test('all three recordings carried only status 200, so 304 and abort are read in the firmware alone', lab.skipUnless(...FIXTURES), () => {
  for (const fixture of FIXTURES) {
    const statuses = new Set(bodies(fixture).map((a) => a.statusCode));
    assert.deepEqual([...statuses], ['200'], `${fixture} answers are all 200`);
  }
});
