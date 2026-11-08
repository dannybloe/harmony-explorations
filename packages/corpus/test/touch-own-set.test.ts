/**
 * The set of a Harmony Touch's own documents that `todo-touch.md` 6.8 delivers back with 200, its builder
 * `experiments/touchownset.ts`, the two comparisons that read the remote afterwards, and the shape of the tags a Touch
 * has been seen to store.
 *
 * **What the builder has to get right, and why each test is here.**
 *
 * 1. **A document goes into the set only when the remote's last request for it carried the tag its source was
 *    delivered under.** That is the protection against the trap the 6.8 brief names: Settings was changed on
 *    the remote's own screens after the recorded full sync, so the recording's copy is no longer what the
 *    remote holds, and delivering it would revert the change. The remote reports the tag of what it stores and
 *    stores a tag only with the document it came with, `answering-a-sync.md` "The entity tag an answerer
 *    sends", so equal tags are the evidence that a source is the stored document. The control is the same
 *    build with one tag changed, or one missing, which is refused by document name.
 * 2. **A later source replaces an earlier one**: the document a hand over of ours wrote back replaces the
 *    recording's copy, which is how the bench set takes Settings from the first run of 6.7.
 * 3. **Every tag is new.** `setTag` puts the set's name in front of `ourTag`'s digest, because `ourTag` alone
 *    gives a document handed up and echoed by our hand over exactly the tag the remote now holds for it, and
 *    the answerer would then answer it 304 and deliver nothing. The tests hold that the two differ, that the
 *    name changes the tag, and that the builder refuses a tag already in play.
 * 4. **The configuration hash the remote reports after the commit** is the set's activity list, device list,
 *    protocol list and context tags joined in that order, `api/engine.md` "harmony.engine?getconfighash",
 *    measured on the unit in `packages/usb/test/touch-confighash.test.ts`. The comparison says `equal` only for
 *    that order; every other order of the four, and the four with the button map list's or the settings' tag
 *    put in, says `not equal`.
 * 5. **A request list against the set** says, per document, whether the set's tag came back, which is what a
 *    third `--unchanged` run after the commit is read for.
 * 6. **The tags Logitech's client delivered** (lab): five groups of hex digits, 33 to 36 characters, none of the
 *    25 a version 4 identifier. The remote stored and sent back tags of all three lengths, and in 6.7 one of
 *    ours of 36, so it holds a tag as text of no one length or form, which is the firmware reading too
 *    (`core/resourcemanager.lua` `saveResource` keeps the tag it is given in an index entry encoded as JSON).
 *    It corrects the answerer's header, which called theirs random version 4 identifiers.
 *
 * **Sources checked first.** The 6.8 brief and the lab's `6.7-preflight.md`; `answering-a-sync.md` and
 * `api/engine.md`; `touch-confighash.test.ts`, `touch-second-sync.test.ts` and `touch-first-sync.test.ts`; the
 * engine's `proxy/sync.lua` `syncResponseCallback` and `core/resourcemanager.lua` in the lab's decompiled
 * source. Logitech's client was not consulted beyond its recorded tags: what is checked is ours.
 *
 * **Width.** One model, the Harmony Touch, firmware 4.15.330; the documents here are made up, and the lab test
 * reads the two recorded syncs of one unit. Nothing here touches a remote.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { skipUnless } from '@harmony/lab';
import { answersWritten, commands, records, sessions } from '@harmony/testkit/touch-recording';

import {
  CONFIG_HASH_DOCUMENTS,
  OWN_SET_DOCUMENTS,
  buildOwnSet,
  compareConfigHash,
  compareRequestList,
  predictedConfigHash,
  type OwnSource,
} from '../experiments/touchownset.ts';
import { READ_LIST, ourTag, setTag, type RemoteRequest, type TouchSet } from '../src/touchsync.ts';

const ADDRESS: Record<string, string> = {
  ActivityList: 'harmony://Account/1/ActivityList',
  DeviceList: 'harmony://Account/1/DeviceList',
  MapList: 'harmony://Account/1/MapList?excludeFunctionMaps=true',
  Context: 'harmony://Remote/2/Context',
  Settings: 'harmony://Account/1/Remote/2/Settings',
  ProtocolList: 'harmony://Account/1/ProtocolList',
};

/** The smallest working set of `answering-a-sync.md`, made up. */
const DOCUMENTS: Record<string, unknown> = {
  ActivityList: { Activities: [] },
  DeviceList: { DevicesWithFeatures: [] },
  MapList: { ButtonMaps: [] },
  Context: { 'AccountId-': 1 },
  Settings: { Settings: [] },
  ProtocolList: { Protocols: [] },
};

const recorded = (): OwnSource[] => OWN_SET_DOCUMENTS.map((d, i) => ({
  uri: ADDRESS[d]!, resource: DOCUMENTS[d], tag: `recorded-${i}`, from: 'the recording',
}));
const asked = (tags: Record<string, string | undefined> = {}): RemoteRequest[] => OWN_SET_DOCUMENTS.map((d, i) => {
  const etag = d in tags ? tags[d] : `recorded-${i}`;
  return { verb: 'get', uri: ADDRESS[d]!, ...(etag === undefined ? {} : { etag }) };
});

function built(result: ReturnType<typeof buildOwnSet>): TouchSet {
  assert.ok(!('refusals' in result), 'refusals' in result ? result.refusals.join('; ') : '');
  return result.set;
}

const answer = (status: string, result: unknown): string => `Response,${JSON.stringify({ errorCode: status, result })}`;

describe('building the set', () => {
  it('takes each of the six from a source whose tag the remote asked with, and gives every one a new tag', () => {
    const result = buildOwnSet({ sources: recorded(), requests: asked(), name: 'made-up' });
    const set = built(result);
    assert.deepEqual(set.answers.map((a) => a.uri), OWN_SET_DOCUMENTS.map((d) => ADDRESS[d]));
    for (const a of set.answers) {
      assert.equal(a.etag, setTag(a, 'made-up'));
      assert.notEqual(a.etag, ourTag(a), 'not the tag a hand over of ours gives the same document');
      assert.deepEqual(a.resource, DOCUMENTS[OWN_SET_DOCUMENTS[set.answers.indexOf(a)]!]);
    }
    assert.equal(new Set(set.answers.map((a) => a.etag)).size, 6);
    assert.ok(!('refusals' in result) && result.rows.every((r) => r.from === 'the recording'));
  });

  it('refuses a document whose tag the remote asked with is not its source\'s, or that it asked for untagged, by name', () => {
    // The control for the test above: the same build with Settings changed on the remote since the source.
    const changed = buildOwnSet({ sources: recorded(), requests: asked({ Settings: 'changed-on-the-remote' }), name: 'made-up' });
    assert.ok('refusals' in changed);
    assert.deepEqual(changed.refusals, ['Settings: the tag the remote asked with is not the tag the recording delivered it under, so that source is not known to be what the remote holds']);
    const untagged = buildOwnSet({ sources: recorded(), requests: asked({ Context: undefined }), name: 'made-up' });
    assert.ok('refusals' in untagged);
    assert.match(untagged.refusals[0]!, /^Context: the remote asked for it without a tag/);
    const lacking = buildOwnSet({ sources: recorded().filter((s) => !s.uri.endsWith('/MapList?excludeFunctionMaps=true')), requests: asked(), name: 'made-up' });
    assert.ok('refusals' in lacking);
    assert.deepEqual(lacking.refusals, ['MapList: no source holds it']);
  });

  it('lets a later source replace an earlier one, which is how Settings comes from a hand over of ours', () => {
    const settings = { RemoteName: 'Made Up', Settings: [] };
    const handed: OwnSource = { uri: ADDRESS['Settings']!, resource: settings, tag: 'ours-from-the-hand-over', from: 'a hand over of ours' };
    const result = buildOwnSet({ sources: [...recorded(), handed], requests: asked({ Settings: 'ours-from-the-hand-over' }), name: 'made-up' });
    const set = built(result);
    assert.deepEqual(set.answers[4]!.resource, settings);
    assert.ok(!('refusals' in result) && result.rows[4]!.from === 'a hand over of ours');
  });

  it('refuses a new tag that equals a tag already in play, and a set the answerer\'s gate refuses', () => {
    // A request whose tag happens to be the new tag the set would state for that document.
    const clash = setTag({ 'body-type': 'application/json', resource: DOCUMENTS['DeviceList'] }, 'made-up');
    const sources = recorded().map((s) => (s.uri === ADDRESS['DeviceList'] ? { ...s, tag: clash } : s));
    const result = buildOwnSet({ sources, requests: asked({ DeviceList: clash }), name: 'made-up' });
    assert.ok('refusals' in result);
    assert.deepEqual(result.refusals, ['DeviceList: its new tag equals a tag already in play']);
    const gated = buildOwnSet({ sources: recorded().map((s) => (s.uri === ADDRESS['MapList'] ? { ...s, resource: {} } : s)), requests: asked(), name: 'made-up' });
    assert.ok('refusals' in gated);
    assert.match(gated.refusals.join('\n'), /ButtonMaps.*missing list/);
  });

  it('gives different tags under a different name, and the same under the same', () => {
    const a = { 'body-type': 'application/json' as const, resource: { a: 1 } };
    assert.match(setTag(a, 'one'), /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(setTag(a, 'one'), setTag(a, 'one'));
    assert.notEqual(setTag(a, 'one'), setTag(a, 'two'));
    assert.notEqual(setTag(a, 'one'), ourTag(a));
  });
});

describe('what the remote reports after the commit', () => {
  const set = built(buildOwnSet({ sources: recorded(), requests: asked(), name: 'made-up' }));
  const tag = (d: string): string => set.answers.find((a) => a.uri === ADDRESS[d])!.etag!;

  it('predicts the hash as the activity, device, protocol and context tags joined in that order', () => {
    assert.deepEqual(CONFIG_HASH_DOCUMENTS, ['ActivityList', 'DeviceList', 'ProtocolList', 'Context']);
    const hash = ['ActivityList', 'DeviceList', 'ProtocolList', 'Context'].map(tag).join('');
    assert.equal(predictedConfigHash(set), hash);
    assert.equal(compareConfigHash(answer('200', `result=${hash}`), set), 'equal');
  });

  it('says not equal for every other order, and with the button map list\'s or the settings\' tag in, the control', () => {
    const four = ['ActivityList', 'DeviceList', 'ProtocolList', 'Context'];
    const orders = (xs: string[]): string[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => orders([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
    const others = orders(four).filter((o) => o.join() !== four.join());
    assert.equal(others.length, 23);
    for (const o of others) assert.equal(compareConfigHash(answer('200', `result=${o.map(tag).join('')}`), set), 'not equal');
    assert.equal(compareConfigHash(answer('200', `result=${[...four, 'MapList'].map(tag).join('')}`), set), 'not equal');
    assert.equal(compareConfigHash(answer('200', `result=${[...four, 'Settings'].map(tag).join('')}`), set), 'not equal');
    assert.equal(compareConfigHash(answer('202', 'sync in progress'), set), 'not compared, the read answered status 202');
  });

  it('reads a request list per document: the set\'s tag, another, none, or not asked for', () => {
    const requests: RemoteRequest[] = [
      { verb: 'get', uri: ADDRESS['ActivityList']!, etag: tag('ActivityList') },
      { verb: 'get', uri: ADDRESS['DeviceList']!, etag: 'another' },
      { verb: 'get', uri: ADDRESS['MapList']! },
      ...['Context', 'Settings'].map((d) => ({ verb: 'get', uri: ADDRESS[d]!, etag: tag(d) })),
    ];
    const list = `Response,${JSON.stringify({ errorCode: '200', mime: READ_LIST, result: JSON.stringify({ requests }) })}`;
    assert.deepEqual(compareRequestList(list, set), [
      'ActivityList: the set\'s tag', 'DeviceList: another tag', 'MapList: asked for without a tag',
      'Context: the set\'s tag', 'Settings: the set\'s tag', 'ProtocolList: not asked for',
    ]);
  });
});

describe('the tags a Touch has stored', () => {
  it('are, from Logitech\'s client, five hex groups of 33 to 36 characters and none a version 4 identifier', skipUnless('touch_sync_recording', 'touch_full_sync_recording'), () => {
    const tags = ['touch_sync_recording', 'touch_full_sync_recording'].flatMap((f) => answersWritten(sessions(commands(records(f))).filter((s) => s.path === '/sys/hlapi'))
      .map((a) => a.etag).filter((t): t is string => typeof t === 'string' && t.length > 0));
    assert.equal(tags.length, 25);
    const lengths = new Map<number, number>();
    for (const t of tags) lengths.set(t.length, (lengths.get(t.length) ?? 0) + 1);
    assert.deepEqual([...lengths].sort((a, b) => a[0] - b[0]), [[33, 1], [35, 10], [36, 14]]);
    assert.ok(tags.every((t) => /^[0-9a-f]+(-[0-9a-f]+){4}$/i.test(t)));
    assert.equal(tags.filter((t) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)).length, 0);
    // The control: a version 4 identifier of the same pattern is recognised, so the zero is a measurement.
    assert.match(crypto.randomUUID(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
