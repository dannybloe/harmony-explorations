/**
 * The answerer, `src/touchsync.ts`, and its script, `bin/touch-sync.ts`: a sync down driven end to end
 * against the fake Touch.
 *
 * **Nothing here touches a device.** Each run is `touch-sync-run.ts` in a process of its own with the two
 * request flags set, a real session over `FakeTouchRemote` behind the transport's guard, the remote answering
 * what the scenario says.
 *
 * **What it holds.**
 *
 * 1. **The recorded syncs, replayed** (lab): the request lists of Logitech's full sync, and of the trial,
 *    served as recorded, with the answers their client wrote as the set, recorded tags included. **Every answer
 *    the answerer writes is the one their client wrote**, address, status, type, tag and document, compared
 *    whole and in order, `proxy://Finished` included; the announcements apart, which are the whole line's
 *    length where theirs were the `responses` argument's.
 * 2. **`unchanged`**: against a remote that sends a tag for every document, favourites document and picture,
 *    every answer is a 304 echoing that tag and carries nothing else; the endings are answered 200, and the
 *    first line says that what the remote hands up is written back with a tag of ours and committed. **One
 *    document without a tag is refused**, no answer of that list is written, and the recovery is named; **a
 *    picture without one is answered 404** and the run finishes, which is the control for the refusal,
 *    the first bench sync's risk of an unanswered picture. **Each favourites document without one, the user's, a device's and a line
 *    up, is answered 304 with `keptCopyTag`** and the run finishes, where the fake aborts the sync over a
 *    favourites answer without a tag, as the remote's engine does; the untagged document of the same run shape
 *    is the control, refused. That is the first bench sync's run: it stopped at the user's favourites, which a Touch synced
 *    through a computer always asks for untagged, `tests/harmony_touch/test_harmony_touch_favourites_untagged.py`.
 * 3. **The gate**: a set missing each top level list the engine's reader walks, or a document, is refused
 *    before anything at all is written to the remote, not even the provisioning read, and names no recovery;
 *    the smallest set the reference describes passes it, which is the control.
 * 4. **The provisioning**: a remote not provisioned, or provisioned in a hub's mode, is refused after the
 *    provisioning read alone.
 * 5. **The hand over**: what the remote hands up is in the lab before the write that answers it, and is
 *    answered 200 with the same document and a tag of ours; a handed up document lacking its list is refused.
 * 6. **The other rules of `answering-a-sync.md`**: a picture the set lacks is answered 404 and a favourites
 *    document the set lacks 304, so the remote keeps its own, where a set holding one writes it with 200, the
 *    control; another document the set lacks is refused; `proxy://Abort` ends the run as aborted, answered 200;
 *    a sync request answered 202 is refused with the recovery step. The fake's own rule has a control too: an
 *    answer to a favourites request without a tag, or a device's 404, is one it aborts over, and a picture's
 *    is not.
 * 6a. **A set of the remote's own documents**, rehearsed in the shape of the second bench sync's run
 *    with made up values: the six answered 200 with the document and the set's own tag, the three untagged
 *    favourites 304 with a kept copy tag, the ten tagged pictures 304 echoing their tags, and the finish; an
 *    untagged picture 404, the control. **A hand over that hands up a document the set holds stops the run
 *    before the sync request**, since the set's copy would revert the change made on the remote, where one
 *    handing up a favourites document the set lacks goes on, the control.
 * 7. **The lines**: every line any run reported matches one of `SYNC_LINES`.
 * 7a. **A write of answers that is not taken**, the first bench sync's risk of a write that is not taken: a reply to the write that does
 *    not name it, the listener's reply to a write it is still gathering, is refused at the first write, where
 *    the same run with a real reply finishes; and an address handed out a fourth time in one run is refused,
 *    where three times finishes.
 * 7b. **What a refusal says**: after the remote was acted on, the order of recovery, `getconfighash` first,
 *    and what an abort would cost where the run stopped: the handed up document's tag inside the hand over,
 *    and no tag after it, since the hand over committed.
 * 8. **The script**, in the paths that open nothing: the dry run of each mode, which says what `--unchanged`
 *    writes, the order of recovery and that nothing on the rail tells whether the remote is on USB power; a
 *    set outside the lab, a set the gate refuses, a commit without the two flags, and a commit with the
 *    recovery flag. The commit itself is never run by a test.
 *
 * **Sources checked first.** `reference/architectures/harmony-touch/answering-a-sync.md`, `api/proxy.md` and
 * `api/setup.md`; `packages/usb/src/touchsession.ts` and its tests; the recordings through
 * `touch-recording.ts`; and Logitech's Harmony Desktop web application in the lab, decision 2, for how their
 * client answers `proxy://Finished` and `proxy://Abort` (a status of 200 and the address, nothing else) and that
 * it takes a new session id for every read of the request list. Stated by Logitech, in their client, for those
 * two; the rest is the reference's reading of the firmware.
 *
 * **Width.** One model, the Harmony Touch, on the one build the rail admits, 4.15.330. The recordings are one
 * unit synced by one client. The fake answers as the reference reads the remote; none of this has met one.
 *
 * The recordings hold an account's data, an auth token and a serial: this file asserts equalities, counts and
 * shapes and prints nothing out of them. Serials and documents of the synthetic runs are made up.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { skipUnless } from '@harmony/lab';

import { RECOVERY, SYNC_LINES, keptCopyTag, ourTag, setTag, type RemoteRequest, type SetAnswer, type TouchSyncOutcome } from '../../src/touchsync.ts';
import { recordedSyncAnswers, refusedByTheEngine, type Scenario } from './touch-sync-run.ts';

const FULL = 'touch_full_sync_recording';
const TRIAL = 'touch_sync_recording';

interface Line {
  readonly name: string;
  readonly answers?: Record<string, unknown>[];
  readonly length?: number;
}

interface Run {
  readonly outcome: TouchSyncOutcome;
  readonly reports: string[];
  readonly lines: Line[];
  readonly announced: { stated: number; line: number }[];
  readonly keptAtWrite: number[];
  readonly files: string[];
  readonly handedUp: string[];
}

/** Every line any run reported, for the check that each has a form. */
const reported: string[] = [];

/** One run of the answerer in a process of its own with the two request flags set. */
function run(scenario: Scenario): Run {
  const script = fileURLToPath(new URL('./touch-sync-run.ts', import.meta.url));
  const out = execFileSync(process.execPath, [script], {
    input: JSON.stringify(scenario),
    env: { ...process.env, HARMONY_ENABLE_WRITES: '1', HARMONY_TOUCH_REQUESTS: '1', HARMONY_TOUCH_RECOVERY: '' },
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
  const result = JSON.parse(out) as Run;
  reported.push(...result.reports);
  return result;
}

/** The answers written after the sync request, in order, flattened over the writes. */
const syncAnswers = (r: Run): Record<string, unknown>[] =>
  r.lines.slice(r.lines.findIndex((l) => l.name === 'setup/sync')).flatMap((l) => l.answers ?? []);

/** The names of the lines written, announcements and writes of answers by kind. */
const names = (r: Run): string[] => r.lines.map((l) => l.name);

// ---------------------------------------------------------------------------------------------------
// Made up documents: the smallest set `answering-a-sync.md` describes, and the addresses a remote builds
// ---------------------------------------------------------------------------------------------------

const ACCOUNT = 'harmony://Account/1';
const ADDRESS: Record<string, string> = {
  ActivityList: `${ACCOUNT}/ActivityList`,
  DeviceList: `${ACCOUNT}/DeviceList`,
  MapList: `${ACCOUNT}/MapList?excludeFunctionMaps=true`,
  Context: 'harmony://Remote/2/Context',
  Settings: `${ACCOUNT}/Remote/2/Settings`,
  ProtocolList: `${ACCOUNT}/ProtocolList`,
};
const SIX = Object.keys(ADDRESS);

/** The smallest working set: every list empty, a context naming the account, "The smallest set of documents". */
function smallest(): Record<string, Record<string, unknown>> {
  return {
    ActivityList: { Activities: [] },
    DeviceList: { DevicesWithFeatures: [] },
    MapList: { ButtonMaps: [] },
    Context: { 'AccountId-': 1 },
    Settings: { Settings: [] },
    ProtocolList: { Protocols: [] },
  };
}

/** A set of answers out of documents, in the shape Logitech's client wrote, with no tags: ours, then. */
const setOf = (documents: Record<string, unknown>): SetAnswer[] =>
  Object.entries(documents).map(([name, resource]) => ({ uri: ADDRESS[name] ?? name, 'body-type': 'application/json' as const, resource }));

const getSix = (tags = true): RemoteRequest[] => SIX.map((name, i) => ({ verb: 'get', uri: ADDRESS[name]!, ...(tags ? { etag: `tag-${i}` } : {}) }));
const FINISHED: RemoteRequest = { verb: 'POST', uri: 'proxy://Finished' };
const USER = 'content://1.0/user;profile/user/1';
const DEVICE = 'content://1.0/device;profile/device/1';
const SERVICE = 'content://1.0/service/provider-1';
const PICTURE = 'content-image://1.0/station/s1/image;maxX=54;maxY=54;type=png';

after(() => {
  // The status band's contract: every line any run above reported has a form in `SYNC_LINES`.
  assert.ok(reported.length > 0, 'the runs reported lines');
  for (const line of reported) assert.ok(SYNC_LINES.some((form) => form.test(line)), `a form for: ${line}`);
});

// ---------------------------------------------------------------------------------------------------

describe('the recorded syncs, replayed', () => {
  for (const fixture of [FULL, TRIAL]) {
    it(`writes every answer of ${fixture} as Logitech's client wrote it, address, status, type, tag and document`, skipUnless(fixture), () => {
      const recorded = recordedSyncAnswers(fixture);
      const set = recorded.filter((a) => a.uri !== 'proxy://Finished') as SetAnswer[];
      const r = run({ mode: { kind: 'set', set: { answers: set } }, replay: fixture });
      assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
      // The whole of each answer, in order: the five fields their client wrote and nothing else.
      const ours = syncAnswers(r);
      assert.equal(ours.length, recorded.length);
      assert.deepEqual(ours, recorded);
      // The announcement apart: ours states each whole line, theirs stated its responses argument.
      assert.ok(r.announced.length > 0);
      for (const a of r.announced) assert.equal(a.stated, a.line, 'the whole line is announced');
    });
  }

  it('holds the counts the replays compared', skipUnless(FULL, TRIAL), () => {
    // So a lost answer or a lost list moves a number in the diff: six documents, three favourites
    // documents, ten pictures and the ending for the full sync, six and the ending for the trial.
    assert.deepEqual([FULL, TRIAL].map((f) => recordedSyncAnswers(f).length), [20, 7]);
    const r = run({ mode: { kind: 'set', set: { answers: recordedSyncAnswers(FULL).filter((a) => a.uri !== 'proxy://Finished') as SetAnswer[] } }, replay: FULL });
    assert.deepEqual([r.outcome.lists, r.outcome.answered], [7, 20]);
    assert.deepEqual(names(r).filter((n) => n === 'answers').length, 7, 'one write for the hand over and six for the sync');
  });
});

describe('unchanged', () => {
  it('answers every document, favourites document and picture 304 with the tag the remote sent, and nothing else', () => {
    const tagged: RemoteRequest[] = [...getSix(), { verb: 'get', uri: USER, etag: 'u' }, { verb: 'get', uri: DEVICE, etag: 'd' }, { verb: 'get', uri: PICTURE, etag: 'p' }];
    const r = run({ mode: { kind: 'unchanged' }, sync: [tagged, [], [FINISHED]] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    const answers = syncAnswers(r);
    assert.deepEqual(answers, [
      ...tagged.map((q) => ({ statusCode: '304', uri: q.uri, etag: q.etag })),
      { uri: 'proxy://Finished', statusCode: '200' },
    ]);
    assert.deepEqual(r.reports.filter((l) => l.startsWith('sync: request list')), [
      'sync: request list 1, 9 answered', 'sync: request list 2, empty', 'sync: request list 3, 1 answered',
    ]);
    // The first line says the mode is not write free: what the remote hands up goes back with a tag of ours.
    assert.match(r.reports[0]!, /^sync: unchanged, every document the remote hands up is written back to it with a tag of ours and committed, so that change never reaches Logitech's account;/);
  });

  it('answers a picture the remote sent no tag for 404, and every favourites document without one 304 with a kept copy tag', () => {
    // The control first: an untagged picture is answered 404, which the remote logs and never aborts on.
    const picture = run({ mode: { kind: 'unchanged' }, sync: [[...getSix(), { verb: 'get', uri: PICTURE }], [FINISHED]] });
    assert.equal(picture.outcome.ending, 'finished', picture.outcome.reason);
    assert.deepEqual(syncAnswers(picture).slice(6), [{ statusCode: '404', uri: PICTURE }, { uri: 'proxy://Finished', statusCode: '200' }]);
    // The three favourites documents untagged, in the order and the lists the screens ask for them: each is
    // answered 304 with a tag, so the remote copies its own and the fake, which aborts over a favourites
    // answer without a tag as the engine does, reaches the finish.
    const r = run({ mode: { kind: 'unchanged' }, sync: [getSix(), [], [{ verb: 'get', uri: USER }], [{ verb: 'get', uri: DEVICE }], [{ verb: 'get', uri: SERVICE }], [FINISHED]] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(syncAnswers(r).slice(6), [
      ...[USER, DEVICE, SERVICE].map((uri) => ({ statusCode: '304', uri, etag: keptCopyTag(uri) })),
      { uri: 'proxy://Finished', statusCode: '200' },
    ]);
    // None of the four is a document: a 304 carries no body.
    for (const a of syncAnswers(r)) assert.ok(!('resource' in a));
  });

  it('gives a kept copy tag that is never empty, the same every run, and different for each address', () => {
    for (const uri of [USER, DEVICE, SERVICE]) {
      assert.match(keptCopyTag(uri), /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.equal(keptCopyTag(uri), keptCopyTag(uri));
    }
    assert.equal(new Set([USER, DEVICE, SERVICE].map(keptCopyTag)).size, 3);
    // Not the tag of a document: a kept copy tag cannot be mistaken for one of `ourTag`'s.
    assert.notEqual(keptCopyTag(USER), ourTag({ 'body-type': 'application/json', resource: {} }));
  });

  it('the fake aborts over a favourites answer without a tag or a device\'s 404, and not over a picture\'s', () => {
    // The fake's own rule, which the favourites runs rely on to show a tagless answer would abort.
    assert.equal(refusedByTheEngine({ uri: USER, statusCode: '304' }), true);
    assert.equal(refusedByTheEngine({ uri: USER, statusCode: '404' }), true, 'a 404 without a tag fails the callback too');
    assert.equal(refusedByTheEngine({ uri: USER, statusCode: '404', etag: 'x' }), false, 'the user\'s own 404 is allowed');
    assert.equal(refusedByTheEngine({ uri: DEVICE, statusCode: '404', etag: 'x' }), true);
    assert.equal(refusedByTheEngine({ uri: SERVICE, statusCode: '304', etag: 'x' }), false);
    assert.equal(refusedByTheEngine({ uri: PICTURE, statusCode: '404' }), false);
  });

  it('refuses a document the remote sent no tag for, writes no answer of that list, and names the recovery order', () => {
    const [first, ...rest] = getSix();
    const r = run({ mode: { kind: 'unchanged' }, sync: [[{ verb: first!.verb, uri: first!.uri }, ...rest], [FINISHED]] });
    assert.equal(r.outcome.ending, 'refused');
    assert.match(r.outcome.reason ?? '', /sent no tag for ActivityList, so it cannot be answered 304/);
    assert.equal(r.outcome.recovery, RECOVERY);
    assert.equal(r.outcome.acted, true);
    assert.deepEqual(syncAnswers(r), [], 'nothing answered after the sync started');
    assert.equal(names(r).at(-1), 'proxy/request?read', 'the request list was the last thing written');
    assert.ok(r.reports.includes(`sync: recovery, ${RECOVERY}`));
    // The order starts with the read, and nothing was handed up, so an abort costs no tag.
    assert.match(RECOVERY, /^first read getconfighash, .*200 needs nothing; 202 needs .*--step abort, that read again, then --step reboot/);
    assert.equal(r.outcome.abortCost, 'abort cost, none to a tag: an abort now leaves the committed set as it is');
  });
});

describe('the gate before the first write', () => {
  it('passes the smallest set the reference describes, which answers the six with 200 and tags of ours', () => {
    const answers = setOf(smallest());
    const r = run({ mode: { kind: 'set', set: { answers } }, sync: [getSix(false), [FINISHED]] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(syncAnswers(r), [
      ...answers.map((a) => ({ statusCode: '200', uri: a.uri, 'body-type': 'application/json', etag: ourTag(a), resource: a.resource })),
      { uri: 'proxy://Finished', statusCode: '200' },
    ]);
    assert.ok(r.reports.includes('sync: gate passed, 6 answers, 0 tags stated and 6 ours'));
  });

  const LISTS: [string, string][] = [
    ['ActivityList', 'Activities'], ['DeviceList', 'DevicesWithFeatures'], ['MapList', 'ButtonMaps'],
    ['ProtocolList', 'Protocols'], ['Settings', 'Settings'],
  ];
  for (const [document, list] of LISTS) {
    it(`refuses a set whose ${document} lacks ${list} before anything is written to the remote`, () => {
      const documents = smallest();
      delete documents[document]![list];
      const r = run({ mode: { kind: 'set', set: { answers: setOf(documents) } }, sync: [getSix(false), [FINISHED]] });
      assert.equal(r.outcome.ending, 'refused');
      assert.equal(r.outcome.acted, false);
      assert.equal(r.outcome.recovery, undefined, 'nothing was sent, so nothing needs recovering');
      assert.deepEqual(r.lines, [], 'not even the provisioning read');
      assert.ok(r.files.includes('gate.txt'));
    });
  }

  it('refuses a set missing a document, a document sent as a string and a picture that is not a PNG', () => {
    for (const change of ['absent', 'string', 'picture'] as const) {
      const documents: Record<string, unknown> = smallest();
      if (change === 'absent') delete documents['Context'];
      if (change === 'string') documents['Settings'] = JSON.stringify(documents['Settings']);
      const answers = change === 'string'
        ? setOf(smallest()).map((a) => (a.uri === ADDRESS['Settings'] ? { ...a, resource: documents['Settings'] } : a))
        : setOf(documents);
      if (change === 'picture') answers.push({ uri: PICTURE, 'body-type': 'image/png', resource: Buffer.from('not a png').toString('base64') });
      const r = run({ mode: { kind: 'set', set: { answers } }, sync: [getSix(false), [FINISHED]] });
      assert.equal(r.outcome.ending, 'refused', change);
      assert.deepEqual(r.lines, [], change);
    }
  });
});

describe('the provisioning', () => {
  it('refuses a remote that is not provisioned, or provisioned in a hub\'s mode, after the read alone', () => {
    const cases: [unknown, RegExp][] = [
      [{ discoveryServer: 'x', se: true }, /not provisioned/],
      [{ accountId: '1', activeRemoteId: 2, mode: 3, se: true }, /provisioned in mode 3/],
    ];
    for (const [provisioning, reason] of cases) {
      const r = run({ mode: { kind: 'unchanged' }, provisioning, sync: [getSix(), [FINISHED]] });
      assert.equal(r.outcome.ending, 'refused');
      assert.match(r.outcome.reason ?? '', reason);
      assert.equal(r.outcome.acted, false);
      assert.equal(r.outcome.recovery, undefined);
      assert.deepEqual(names(r), ['setup/account?getprovisioninfo']);
    }
    // The control: mode 1 is a Touch's own and passes.
    const r = run({ mode: { kind: 'unchanged' }, provisioning: { accountId: '1', activeRemoteId: 2, mode: 1 }, sync: [getSix(), [FINISHED]] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
  });
});

describe('the hand over', () => {
  const settings = { RemoteName: 'Made Up', Settings: [{ Name: 'KeyBrightness', Values: ['60'] }] };
  const put = (document: unknown): RemoteRequest => ({
    verb: 'put', uri: ADDRESS['Settings']!, resource: encodeURIComponent(JSON.stringify(document)).replace(/%20/g, '+'),
  });

  it('keeps what the remote hands up in the lab before the write that answers it, and answers it 200 with a tag of ours', () => {
    const r = run({ mode: { kind: 'unchanged' }, handOver: [[put(settings)], [FINISHED]], sync: [getSix(), [FINISHED]] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(r.outcome.handedUp, ['Settings']);
    assert.deepEqual(r.handedUp, ['001-Settings.json', '001-Settings.txt']);
    // At the first write of answers, the one that answers the put, the document was already kept.
    assert.equal(r.keptAtWrite[0], 1);
    const answer = r.lines.find((l) => l.name === 'answers')!.answers!;
    assert.deepEqual(answer, [{
      statusCode: '200', uri: ADDRESS['Settings'], 'body-type': 'application/json',
      resource: settings, etag: ourTag({ 'body-type': 'application/json', resource: settings }),
    }]);
    assert.deepEqual(names(r).slice(0, 7), [
      'setup/account?getprovisioninfo', 'setup/syncRemoteChanges', 'proxy/request?read', 'announcement', 'answers',
      'proxy/request?read', 'announcement',
    ]);
  });

  it('refuses a handed up document that lacks the list its own reader walks, and still keeps it', () => {
    const r = run({ mode: { kind: 'unchanged' }, handOver: [[put({ RemoteName: 'Made Up' })], [FINISHED]], sync: [getSix(), [FINISHED]] });
    assert.equal(r.outcome.ending, 'refused');
    assert.equal(r.outcome.recovery, RECOVERY);
    assert.deepEqual(r.handedUp, ['001-Settings.json', '001-Settings.txt']);
    assert.ok(!names(r).includes('answers'), 'nothing was echoed');
    // Inside the hand over an abort costs the handed up document's tag, and the refusal says so.
    assert.match(r.outcome.abortCost ?? '', /^abort cost, Settings: the change made to it on the remote stays there with no tag/);
    assert.ok(r.reports.includes(`sync: recovery, ${r.outcome.abortCost}`));
  });

  it('refuses a handed up document holding an entry without the type name its own reader searches, and still keeps it', () => {
    // A map list whose one button states no `__type`: the reader raises on it, so
    // echoing it would hand the remote a document it raises on. The control is the same list with the name.
    const maps = (button: object) => ({ ButtonMaps: [{ __type: 'DeviceButtonMap', ButtonMapIdentifier: '16417Device1', Buttons: [button] }] });
    const putMaps = (document: unknown): RemoteRequest => ({
      verb: 'put', uri: ADDRESS['MapList']!, resource: encodeURIComponent(JSON.stringify(document)).replace(/%20/g, '+'),
    });
    const r = run({ mode: { kind: 'unchanged' }, handOver: [[putMaps(maps({ ButtonKey: 'Mute' }))], [FINISHED]], sync: [getSix(), [FINISHED]] });
    assert.equal(r.outcome.ending, 'refused');
    assert.deepEqual(r.handedUp, ['001-MapList.json', '001-MapList.txt']);
    assert.ok(!names(r).includes('answers'), 'nothing was echoed');
    const named = run({ mode: { kind: 'unchanged' }, handOver: [[putMaps(maps({ __type: 'HardRemoteButton', ButtonKey: 'Mute' }))], [FINISHED]], sync: [getSix(), [FINISHED]] });
    assert.ok(names(named).includes('answers'), 'the same list with its type name is echoed');
  });

  it('says an abort costs no tag once the hand over has committed', () => {
    // A refusal in the sync after a hand over that handed Settings up: the hand over committed it.
    const [first, ...rest] = getSix();
    const r = run({ mode: { kind: 'unchanged' }, handOver: [[put(settings)], [FINISHED]], sync: [[{ verb: 'get', uri: first!.uri }, ...rest], [FINISHED]] });
    assert.equal(r.outcome.ending, 'refused');
    assert.match(r.outcome.abortCost ?? '', /^abort cost, none to a tag: the hand over committed Settings under a tag of ours/);
  });
});

describe('the other rules of answering a sync', () => {
  it('answers a picture the set lacks 404 and a favourites document it lacks 304, and refuses another document', () => {
    const answers = setOf(smallest());
    const lists = [[...getSix(false), { verb: 'get', uri: PICTURE }], [{ verb: 'get', uri: USER }], [{ verb: 'get', uri: DEVICE }], [FINISHED]];
    const r = run({ mode: { kind: 'set', set: { answers } }, sync: lists });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(syncAnswers(r).slice(6), [
      { statusCode: '404', uri: PICTURE },
      { statusCode: '304', uri: USER, etag: keptCopyTag(USER) },
      { statusCode: '304', uri: DEVICE, etag: keptCopyTag(DEVICE) },
      { uri: 'proxy://Finished', statusCode: '200' },
    ]);
    // The control: a set lacking one of the six is refused, by the gate, where one lacking a favourites
    // document is answered.
    const short = setOf(smallest()).filter((a) => !a.uri.endsWith('/ProtocolList'));
    const refused = run({ mode: { kind: 'set', set: { answers: short } }, sync: [getSix(false), [FINISHED]] });
    assert.equal(refused.outcome.ending, 'refused');
  });

  it('writes a favourites document a set holds with 200 and a tag, the control for the 304 of one it lacks', () => {
    const user: SetAnswer = { uri: USER, 'body-type': 'application/json', resource: { preferences: {} } };
    const r = run({ mode: { kind: 'set', set: { answers: [...setOf(smallest()), user] } }, sync: [getSix(false), [{ verb: 'get', uri: USER }], [FINISHED]] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(syncAnswers(r).slice(6, 7), [{ statusCode: '200', uri: USER, 'body-type': 'application/json', etag: ourTag(user), resource: user.resource }]);
  });

  it('answers 304 to a document whose tag equals the set\'s and 200 to one whose tag differs', () => {
    const answers = setOf(smallest());
    const requests = getSix(false).map((q, i) => (i === 0 ? { ...q, etag: ourTag(answers[0]!) } : { ...q, etag: 'another' }));
    const r = run({ mode: { kind: 'set', set: { answers } }, sync: [requests, [FINISHED]] });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(syncAnswers(r).map((a) => a['statusCode']), ['304', '200', '200', '200', '200', '200', '200']);
  });

  it('ends as aborted on proxy://Abort, answered 200 and nothing else', () => {
    const r = run({ mode: { kind: 'unchanged' }, sync: [[{ verb: 'POST', uri: 'proxy://Abort', resource: '{}' }]] });
    assert.equal(r.outcome.ending, 'aborted');
    assert.deepEqual(syncAnswers(r), [{ uri: 'proxy://Abort', statusCode: '200' }]);
    assert.equal(r.reports.at(-1), 'sync: aborted');
  });

  it('refuses a sync request answered 202, naming the recovery step', () => {
    const r = run({ mode: { kind: 'unchanged' }, syncStatus: 202, sync: [getSix(), [FINISHED]] });
    assert.equal(r.outcome.ending, 'refused');
    assert.match(r.outcome.reason ?? '', /202, a sync is already marked running/);
    assert.equal(r.outcome.recovery, RECOVERY);
    assert.equal(names(r).at(-1), 'setup/sync');
  });

  it('refuses after too many empty lists in a row, naming the recovery step', () => {
    const r = run({ mode: { kind: 'unchanged' }, sync: [[], [], [], [], [], [FINISHED]] });
    assert.equal(r.outcome.ending, 'refused');
    assert.match(r.outcome.reason ?? '', /5 empty request lists in a row/);
    assert.equal(r.outcome.recovery, RECOVERY);
  });
});

describe('a set of the remote\'s own documents', () => {
  // The second bench sync in shape, `reads/20261105T1218Z-touch-sync-unchanged/`, with made up values: a hand
  // over that hands up nothing; the six asked for with the tags the remote holds; an empty list; the user's, a
  // device's and a line up's favourites one list each, untagged; an empty list; ten pictures, tagged; the finish.
  const PICTURES = Array.from({ length: 10 }, (_, i) => `content-image://1.0/station/s${i}/image;maxX=54;maxY=54;type=png`);
  const held = (): RemoteRequest[] => getSix();
  const secondRunShape = (pictures: RemoteRequest[]): RemoteRequest[][] => [
    held(), [], [{ verb: 'get', uri: USER }], [{ verb: 'get', uri: DEVICE }], [{ verb: 'get', uri: SERVICE }], [], pictures, [FINISHED],
  ];
  const tagged = PICTURES.map((uri, i) => ({ verb: 'get', uri, etag: `picture-${i}` }));
  /** The smallest set with tags of ours stated, as `bin/touch-own-set.ts` states them. */
  const ownSet = (): SetAnswer[] => setOf(smallest()).map((a) => ({ ...a, etag: setTag(a, 'made-up') }));

  it('answers the six 200 with the document and its tag, the favourites 304 so the remote keeps its own, and the tagged pictures 304', () => {
    const answers = ownSet();
    const r = run({ mode: { kind: 'set', set: { answers } }, sync: secondRunShape(tagged) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual([r.outcome.lists, r.outcome.answered], [8, 20]);
    assert.deepEqual(syncAnswers(r), [
      ...answers.map((a) => ({ statusCode: '200', uri: a.uri, 'body-type': 'application/json', etag: a.etag, resource: a.resource })),
      ...[USER, DEVICE, SERVICE].map((uri) => ({ statusCode: '304', uri, etag: keptCopyTag(uri) })),
      ...tagged.map((q) => ({ statusCode: '304', uri: q.uri, etag: q.etag })),
      { uri: 'proxy://Finished', statusCode: '200' },
    ]);
    // The tags stated are the set's, none of them what the remote held, so not one of the six is a 304.
    assert.ok(r.reports.includes('sync: gate passed, 6 answers, 6 tags stated and 0 ours'));
    for (const a of answers) assert.ok(!held().some((q) => q.etag === a.etag));
  });

  it('answers a picture the remote sent no tag for 404, the control for the 304 of a tagged one', () => {
    const r = run({ mode: { kind: 'set', set: { answers: ownSet() } }, sync: secondRunShape(PICTURES.map((uri) => ({ verb: 'get', uri }))) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(syncAnswers(r).slice(9, 19), PICTURES.map((uri) => ({ statusCode: '404', uri })));
  });

  const put = (uri: string, document: unknown): RemoteRequest => ({
    verb: 'put', uri, resource: encodeURIComponent(JSON.stringify(document)).replace(/%20/g, '+'),
  });

  it('stops before the sync request when the hand over hands up a document the set holds, which the set would revert', () => {
    const changed = { RemoteName: 'Made Up', Settings: [{ Name: 'KeyBrightness', Values: ['60'] }] };
    const r = run({ mode: { kind: 'set', set: { answers: ownSet() } }, handOver: [[put(ADDRESS['Settings']!, changed)], [FINISHED]], sync: secondRunShape(tagged) });
    assert.equal(r.outcome.ending, 'refused');
    assert.match(r.outcome.reason ?? '', /^the remote handed up Settings, which the set also holds, so answering the set would revert the change/);
    // Kept, echoed and committed by the hand over, and the sync never asked for: no sync is marked running.
    assert.deepEqual(r.handedUp, ['001-Settings.json', '001-Settings.txt']);
    assert.equal(names(r).filter((n) => n === 'answers').length, 2, 'the put\'s echo and the hand over\'s finish');
    assert.ok(!names(r).includes('setup/sync'));
    assert.equal(r.outcome.recovery, RECOVERY);
    assert.match(r.outcome.abortCost ?? '', /^abort cost, none to a tag: the hand over committed Settings under a tag of ours/);
  });

  it('goes on when the hand over hands up a favourites document the set does not hold, the control', () => {
    const r = run({ mode: { kind: 'set', set: { answers: ownSet() } }, handOver: [[put(USER, { preferences: {} })], [FINISHED]], sync: secondRunShape(tagged) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.equal(r.outcome.handedUp.length, 1);
  });
});

describe('a write of answers that is not taken', () => {
  it('refuses a reply to a write that does not name it, the reply to a write still gathered, at the first write', () => {
    const r = run({ mode: { kind: 'unchanged' }, writeReply: 'gathering', sync: [getSix(), [FINISHED]] });
    assert.equal(r.outcome.ending, 'refused');
    assert.match(r.outcome.reason ?? '', /a reply that does not name the write/);
    assert.equal(r.outcome.recovery, RECOVERY);
    assert.match(r.outcome.abortCost ?? '', /^abort cost, if a change was waiting on the remote/);
    assert.equal(names(r).filter((n) => n === 'answers').length, 1, 'one write, the hand over\'s Finished, and no more');
    // The control: the same run with a reply that names the write finishes.
    const control = run({ mode: { kind: 'unchanged' }, sync: [getSix(), [FINISHED]] });
    assert.equal(control.outcome.ending, 'finished', control.outcome.reason);
  });

  it('refuses an address handed out a fourth time in one run, before answering that list', () => {
    const r = run({ mode: { kind: 'unchanged' }, sync: [getSix(), getSix(), getSix(), getSix(), [FINISHED]] });
    assert.equal(r.outcome.ending, 'refused');
    assert.match(r.outcome.reason ?? '', /handed out ActivityList 4 times in this run, more than the limit of 3/);
    assert.equal(r.outcome.recovery, RECOVERY);
    assert.equal(syncAnswers(r).length, 18, 'three lists of six answered, the fourth not');
    // The control: three times finishes, so the limit is not met early.
    const control = run({ mode: { kind: 'unchanged' }, sync: [getSix(), getSix(), getSix(), [FINISHED]] });
    assert.equal(control.outcome.ending, 'finished', control.outcome.reason);
  });
});

describe('a tag of ours', () => {
  it('is a version 8 identifier of the body, the same for the same body and different for another', () => {
    const a = ourTag({ 'body-type': 'application/json', resource: { a: 1 } });
    assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(a, ourTag({ 'body-type': 'application/json', resource: { a: 1 } }));
    assert.notEqual(a, ourTag({ 'body-type': 'application/json', resource: { a: 2 } }));
    assert.notEqual(a, ourTag({ 'body-type': 'image/png', resource: JSON.stringify({ a: 1 }) }));
  });
});

// ---------------------------------------------------------------------------------------------------

/** `bin/touch-sync.ts` in a fresh process against a lab of its own, every flag unset unless given. */
function script(args: readonly string[], lab: string, flags: Record<string, string> = {}): { status: number; out: string } {
  const path = fileURLToPath(new URL('../../bin/touch-sync.ts', import.meta.url));
  const env = {
    ...process.env, HARMONY_LAB: lab, HARMONY_ENABLE_WRITES: '', HARMONY_TOUCH_REQUESTS: '', HARMONY_TOUCH_RECOVERY: '', ...flags,
  };
  try {
    return { status: 0, out: execFileSync(process.execPath, [path, ...args], { env, encoding: 'utf8', stdio: 'pipe' }) };
  } catch (error: unknown) {
    const e = error as { status: number; stdout: string; stderr: string };
    return { status: e.status, out: `${e.stdout}${e.stderr}` };
  }
}

describe('the script', () => {
  const lab = mkdtempSync(join(tmpdir(), 'touch-sync-lab-'));
  const outside = mkdtempSync(join(tmpdir(), 'touch-sync-outside-'));
  const good = join(lab, 'set-good');
  const bad = join(lab, 'set-bad');
  mkdirSync(good);
  mkdirSync(bad);
  writeFileSync(join(good, 'set.json'), JSON.stringify({ answers: setOf(smallest()) }));
  const lacking = smallest();
  delete lacking['MapList']!['ButtonMaps'];
  writeFileSync(join(bad, 'set.json'), JSON.stringify({ answers: setOf(lacking) }));
  writeFileSync(join(outside, 'set.json'), JSON.stringify({ answers: setOf(smallest()) }));
  after(() => {
    rmSync(lab, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  });

  it('opens nothing without --commit, in either mode, and prints the plan', () => {
    const unchanged = script(['--unchanged'], lab);
    assert.equal(unchanged.status, 0, unchanged.out);
    assert.match(unchanged.out, /mode: unchanged/);
    assert.match(unchanged.out, /written back to it with a tag of ours and committed, so that change never reaches Logitech's account/);
    assert.ok(unchanged.out.includes(`recovery: ${RECOVERY}`), 'the order of recovery');
    assert.match(unchanged.out, /USB power: nothing a session can ask tells/);
    assert.match(unchanged.out, /dry run: nothing was opened/);
    const set = script(['--set', good], lab);
    assert.equal(set.status, 0, set.out);
    assert.match(set.out, /gate: passed, 6 answers, 0 tags stated and 6 ours/);
    assert.match(set.out, /dry run: nothing was opened/);
  });

  it('refuses a set the gate refuses, a set outside the lab, both modes and neither, before anything is opened', () => {
    const refused = script(['--set', bad], lab);
    assert.equal(refused.status, 1);
    assert.match(refused.out, /the gate found 1 reasons/);
    assert.match(refused.out, /ButtonMaps.*missing list/);
    assert.match(script(['--set', outside], lab).out, /not inside the lab/);
    assert.equal(script(['--unchanged', '--set', good], lab).status, 1);
    assert.equal(script([], lab).status, 1);
  });

  it('refuses a commit without the two flags, and with the recovery flag set', () => {
    const none = script(['--unchanged', '--commit'], lab);
    assert.equal(none.status, 1);
    assert.match(none.out, /--commit needs HARMONY_ENABLE_WRITES=1 and HARMONY_TOUCH_REQUESTS=1/);
    const recovery = script(['--unchanged', '--commit'], lab, { HARMONY_ENABLE_WRITES: '1', HARMONY_TOUCH_REQUESTS: '1', HARMONY_TOUCH_RECOVERY: '1' });
    assert.equal(recovery.status, 1);
    assert.match(recovery.out, /refuses with HARMONY_TOUCH_RECOVERY set/);
  });
});
