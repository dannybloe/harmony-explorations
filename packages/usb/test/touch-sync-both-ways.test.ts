/**
 * Both directions of a Harmony Touch sync, measured on two more recordings: what the remote asks for when
 * its account holds favourites and pictures, and how a change made on the remote reaches the account.
 *
 * **The questions.** `touch-sync.test.ts` measured one sync of an account holding two devices and one
 * activity, which asked for six documents and nothing else, and the reference left open what a remote asks
 * for when the account holds favourites, sequences or pictures. `todo-touch.md` 2.2.1 filled the bench
 * Touch's account to cover the feature list of 1.3.2 (seven devices, five activities, sequences, delays,
 * long presses, screen labels, five favourite channels, one with an uploaded logo, and an uploaded
 * background), and 2.3 asked for one complete sync of it recorded whole. The reverse direction, the
 * remote's own changes going up, had been read in the engine (1.6) and recorded only empty, in the trial
 * sync, whose `syncRemoteChanges` answered with nothing but `proxy://Finished`.
 *
 * **The instrument** is the trial's: the lab's copy of Harmony Desktop 1.0.303 recording every web request
 * with its answer and every call through the page's `prompt()` bridge to the USB layer, decoded by
 * `touch-recording.ts`. Two fixtures: the sync after the setup was filled, and the copy's log after it,
 * which holds one reverse sync taken with settings changed on the remote, nothing changed on the account,
 * and the remote connected when the client opened.
 *
 * **What the full sync measured.**
 *
 * 1. **No `syncRemoteChanges` first**, where the trial opened with one. The client went from the
 *    provisioning information straight to `setup/sync`.
 * 2. **The six documents, then the favourites, then the pictures, then finished**, one request list at a
 *    time: the six gets in one list, every one with an entity tag except Settings; then an empty list; then
 *    one `content://1.0/user;...` get, one `content://1.0/device;...` get and one
 *    `content://1.0/service/<id>` get, each alone in its list; then one list of ten pictures; then
 *    `POST proxy://Finished`. This is the order the engine reading of 1.6 predicted before the recording.
 * 3. **The pictures are addressed two ways**: the user's own pictures, the background and its `_small`
 *    twin, by absolute `https` address on Logitech's user image store, and the channel logos by the logical
 *    scheme `content-image://`: seven station logos and one custom logo, the one uploaded for a favourite.
 * 4. **The closure, as in the trial**: every document the remote received is, as parsed JSON, the same as
 *    the page's own web answer for it, six of six and three of three, and every picture is byte for byte
 *    an image the page fetched, ten of ten, each a PNG handed over in base64 as `image/png`. The two ends
 *    are different fields of the recording read by different routes, the network answer at the page's
 *    `XMLHttpRequest` and the remote's copy out of the USB packets' hex. The negative: the nine documents
 *    are pairwise distinct and so are the ten pictures.
 *
 * **What the reverse sync measured.**
 *
 * 5. **The remote hands its change over as one request, verb `put`**, the logical address of the remote's
 *    Settings and no entity tag, carrying its **whole** Settings document, URL encoded with `+` for a
 *    space; 1.6 read the shape in the engine and this measures it.
 * 6. **The client sends that document to Logitech's service, the same as parsed JSON**, as the body of one `PUT` to the
 *    account's remote settings address, the service answers with the same document, and the client writes
 *    the answer back to the remote, status 200, `application/json`, with an entity tag. Three ends equal
 *    as parsed JSON: the remote's upload from the USB hex, the web request's body and the web answer.
 * 7. **Then finished, and the second ask is empty**: the remote asks for `proxy://Finished`; the client
 *    asks for the remote's changes a second time and the list holds only `proxy://Finished`. No
 *    `setup/sync` follows in that log.
 * 8. **What the upload changed** against the Settings the full sync had delivered: exactly
 *    `BackgroundImage`, `KeyBrightness` and `ScreenBrightness`, which are the settings the person at the
 *    bench reports changing on the remote; that they were changed there is their account, not this
 *    measurement. The document carries no setting named `HapticFlag`, and the remote has no vibration
 *    setting as far as they know.
 * 9. **The hand over writes no clock**: it opens only `/sys/hlapi` and the identity file, where both syncs
 *    down also tried `/sys/time`.
 *
 * **Why the full sync skipped the reverse step** is Logitech's client and not the remote:
 * `tests/test_client_templates.py` holds that Harmony Desktop asks for the remote's changes only when the
 * account has no sync pending, and the account had the 2.2.1 edits pending. The two recordings are one case
 * each way and consistent with it.
 *
 * **What it rules out.** That a Touch's favourites or pictures arrive inside the six documents; that the
 * client passes the remote's pictures through a logical address only; and that a change on the remote
 * travels as a difference rather than a whole document.
 *
 * **Width.** Two syncs of one Touch on firmware 4.15.330 (asserted from the identity file), one account,
 * one client, Harmony Desktop. The account held no Sonos, Roku, speaker or home control device, so the
 * requests the engine has for those were not exercised. Whether MyHarmony syncs the same way, and what a
 * reverse sync carries for a change other than a setting (a favourite's order, a command), are not
 * checked.
 *
 * **Sources checked first.** `touch-sync.test.ts` and the reference pages it feeds,
 * `reference/architectures/harmony-touch/usb.md` and `reference/remotes/harmony-touch/`; the Touch engine
 * and screens decompiled in the lab, whose sync request list (`todo-touch.md` 1.6) named this order;
 * Harmony Desktop's main script in the mirrored client for the reverse sync's condition.
 *
 * **Reviewed blind**: a second reader with a decoder of its own, given the questions and not these
 * answers, measured the same paths, request lists, nineteen matches out of nineteen, the same three
 * changed settings, and the same condition in the client.
 *
 * The fixtures hold the test account's data, an auth token and the unit's serial, so this file asserts
 * names, counts and equalities and prints no value out of them. It skips without the lab.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { FILE_HBUS, OFFSET_COMMAND } from '../src/filepipe.ts';
import { SIX, answersWritten, commands, records, requestLists, requestName, resource, sessions, text } from '@harmony/testkit/touch-recording';
import type { Record_, Request_, Session } from '@harmony/testkit/touch-recording';

const FULL = 'touch_full_sync_recording';
const REVERSE = 'touch_reverse_sync_recording';

const hlapi = (fixture: string): Session[] => sessions(commands(records(fixture))).filter((s) => s.path === '/sys/hlapi');

/** How a request is drawn for comparison: the verb and the kind of address, with no identifier in it. */
function shape(r: Request_): string {
  const u = r.uri;
  if (u.startsWith('harmony://')) return `${r.verb} ${resource(u)}`;
  if (u.startsWith('content://1.0/user;')) return `${r.verb} content user`;
  if (u.startsWith('content://1.0/device;')) return `${r.verb} content device`;
  if (u.startsWith('content://1.0/service/')) return `${r.verb} content service`;
  if (u.startsWith('content-image://1.0/station/')) return `${r.verb} content-image station`;
  if (u.startsWith('content-image://1.0/image/')) return `${r.verb} content-image image`;
  if (/^https:\/\/[^/]+\/UserImages\//.test(u)) return `${r.verb} https user image`;
  return `${r.verb} ${u}`;
}

/** The page's own web answers that came back as text, and those that came back as a picture. */
function webAnswers(all: Record_[]): { json: unknown[]; images: Buffer[] } {
  const json: unknown[] = [];
  const images: Buffer[] = [];
  for (const r of all) {
    if ((r.kind !== 'xhr' && r.kind !== 'fetch') || r.method?.toUpperCase() !== 'GET') continue;
    if (typeof r.response === 'string' && r.response.startsWith('{')) json.push(JSON.parse(r.response));
    const b64 = (r.response as { base64?: string } | undefined)?.base64;
    if (typeof b64 === 'string') images.push(Buffer.from(b64, 'base64'));
  }
  return { json, images };
}

/** How many sessions opened each path in each mode, a refused write counted apart. */
function opened(fixture: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions(commands(records(fixture)))) {
    const key = `${s.path} ${s.mode}${s.refused ? ' refused' : ''}`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort());
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

test('a full sync of the filled account sends no 0x08 and asks the remote for none of its changes', lab.skipUnless(FULL), () => {
  for (const c of commands(records(FULL))) assert.notEqual(c.request[0]![OFFSET_COMMAND], FILE_HBUS);
  const written = hlapi(FULL).filter((s) => s.mode === 'W').map((s) => requestName(text(s.written)));
  assert.deepEqual(written.slice(0, 3), ['setup/account?getprovisioninfo', 'a stringified array', 'setup/sync']);
  assert.ok(!written.includes('setup/syncRemoteChanges'));
  // The same three files as the trial, and the same two writes refused: the stringified array and the clock.
  assert.deepEqual(opened(FULL), {
    '/sys/hlapi R': 22, '/sys/hlapi W': 21, '/sys/hlapi W refused': 1, '/sys/sysinfo R': 1, '/sys/time W refused': 1,
  });
});

test('the remote asks for the six documents, then its favourites one at a time, then ten pictures, then finished', lab.skipUnless(FULL), () => {
  const lists = requestLists(hlapi(FULL));
  assert.deepEqual(lists.map((l) => l.map(shape)), [
    SIX.map((n) => `get ${n}`),
    [],
    ['get content user'],
    ['get content device'],
    ['get content service'],
    [
      'get https user image',
      'get https user image',
      'get content-image image',
      ...Array<string>(7).fill('get content-image station'),
    ],
    ['POST proxy://Finished'],
  ]);
  // Every document but the settings carries the entity tag the remote holds; nothing after the six does.
  assert.deepEqual(lists[0]!.filter((r) => !r.etag).map((r) => resource(r.uri)), ['Settings']);
  assert.deepEqual(lists.slice(1).flat().filter((r) => r.etag).length, 0);
  // The two user pictures are one picture and its small twin: the same address with `_small` before the type.
  const user = lists[5]!.filter((r) => shape(r) === 'get https user image').map((r) => r.uri);
  assert.equal(new Set(user.map((u) => u.replace('_small.png', '.png'))).size, 1);
  assert.equal(user.filter((u) => u.endsWith('_small.png')).length, 1);
});

test('every document and picture of the full sync reaches the remote as Logitech\'s service sent it', lab.skipUnless(FULL), () => {
  const given = answersWritten(hlapi(FULL)).filter((a) => a.uri !== 'proxy://Finished');
  const web = webAnswers(records(FULL));
  // Each web answer once in a key order independent form, so matching nine documents is not a deep walk each.
  const webKeys = web.json.map(canonical);

  const documents = given.filter((a) => a['body-type'] === 'application/json');
  const pictures = given.filter((a) => a['body-type'] === 'image/png');
  assert.equal(documents.length, 9, 'six documents and three favourites documents');
  assert.equal(pictures.length, 10);
  assert.equal(given.length, documents.length + pictures.length, 'no answer of another type');

  for (const a of given) {
    assert.equal(a.statusCode, '200', `${shape({ verb: 'get', uri: a.uri })} status`);
    assert.ok(a.etag && a.etag.length > 0, `${shape({ verb: 'get', uri: a.uri })} entity tag`);
  }
  for (const d of documents) {
    const same = webKeys.filter((w) => w === canonical(d.resource));
    assert.equal(same.length, 1, `${shape({ verb: 'get', uri: d.uri })} is one web answer`);
  }
  for (const p of pictures) {
    const bytes = Buffer.from(p.resource as string, 'base64');
    assert.deepEqual(bytes.subarray(0, 4), PNG, `${shape({ verb: 'get', uri: p.uri })} is a PNG`);
    assert.equal(web.images.filter((w) => w.equals(bytes)).length, 1, `${shape({ verb: 'get', uri: p.uri })} is one fetched picture`);
  }

  // Each of the six as compact JSON, so that a lost or doubled entry moves a number in the diff.
  const sizes = Object.fromEntries(documents.filter((d) => d.uri.startsWith('harmony://')).map((d) => [resource(d.uri), JSON.stringify(d.resource).length]));
  assert.deepEqual(sizes, {
    ActivityList: 6596, DeviceList: 133076, MapList: 238385, Context: 889, Settings: 1470, ProtocolList: 6585,
  });

  // The negatives: no two documents and no two pictures are alike, so no equality above is a mix up.
  assert.equal(new Set(documents.map((d) => JSON.stringify(d.resource))).size, 9);
  assert.equal(new Set(pictures.map((p) => p.resource as string)).size, 10);
});

/** A document as text with every object's keys sorted, so two parsed documents compare as strings. */
function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : x,
  );
}

/** Deep equality as a boolean, for counting matches rather than asserting one. */
function isDeepEqual(a: unknown, b: unknown): boolean {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch {
    return false;
  }
}

/** A Settings document's settings by name, values only. */
const byName = (doc: unknown): Map<string, unknown> =>
  new Map((doc as { Settings: { Name: string; Values: unknown }[] }).Settings.map((s) => [s.Name, s.Values]));

test('a reverse sync hands the remote\'s whole settings over as one put, and asks twice', lab.skipUnless(REVERSE), () => {
  const on = hlapi(REVERSE);
  const written = on.filter((s) => s.mode === 'W').map((s) => requestName(text(s.written)));
  assert.deepEqual(written, [
    'setup/syncRemoteChanges', 'proxy/request?read', 'Content-Length', 'proxy/response?write',
    'proxy/request?read', 'Content-Length', 'proxy/response?write',
    'setup/syncRemoteChanges', 'proxy/request?read', 'Content-Length', 'proxy/response?write',
  ]);
  assert.ok(!written.includes('setup/sync'), 'no sync from the account follows');

  const lists = requestLists(on);
  assert.deepEqual(lists.map((l) => l.map(shape)), [['put Settings'], ['POST proxy://Finished'], ['POST proxy://Finished']]);
  assert.equal(lists[0]![0]!.etag, undefined, 'the put carries no entity tag');
  for (const c of commands(records(REVERSE))) assert.notEqual(c.request[0]![OFFSET_COMMAND], FILE_HBUS);
  // Only the request file and the identity, and nothing refused: no clock write, where both syncs down tried one.
  assert.deepEqual(opened(REVERSE), { '/sys/hlapi R': 11, '/sys/hlapi W': 11, '/sys/sysinfo R': 3 });
  assert.ok(!Object.keys(opened(REVERSE)).some((k) => k.startsWith('/sys/time')), 'the hand over writes no clock');
});

test('the remote\'s settings reach the service unchanged and come back as the service\'s answer', lab.skipUnless(REVERSE), () => {
  const all = records(REVERSE);
  const put = requestLists(hlapi(REVERSE))[0]![0]!;
  const uploaded = JSON.parse(decodeURIComponent(put.resource!.replace(/\+/g, ' '))) as unknown;

  const web = all.filter((r) => (r.kind === 'xhr' || r.kind === 'fetch') && r.method?.toUpperCase() === 'PUT');
  assert.equal(web.length, 1, 'one web request writes, and it is the settings');
  // The address without the page's cache breaking query; tested as a boolean so a failure prints no id.
  assert.ok(/\/Account\/\d+\/Remote\/\d+\/Settings$/.test(web[0]!.url!.split('?')[0]!), 'the account\'s remote settings address');
  const body = (web[0] as Record_ & { body: string }).body;
  assert.deepEqual(JSON.parse(body), uploaded, 'the web request carries the remote\'s document');
  assert.deepEqual(JSON.parse(web[0]!.response as string), uploaded, 'the service answers with the same document');

  const back = answersWritten(hlapi(REVERSE)).filter((a) => a.uri !== 'proxy://Finished');
  assert.equal(back.length, 1);
  assert.equal(resource(back[0]!.uri), 'Settings');
  assert.equal(back[0]!.statusCode, '200');
  assert.equal(back[0]!['body-type'], 'application/json');
  assert.ok(back[0]!.etag && back[0]!.etag.length > 0);
  assert.deepEqual(back[0]!.resource, uploaded, 'the remote gets the service\'s answer');
});

test('the upload differs from the settings the full sync delivered in exactly BackgroundImage, KeyBrightness and ScreenBrightness', lab.skipUnless(FULL, REVERSE), () => {
  const delivered = answersWritten(hlapi(FULL)).find((a) => a.uri.startsWith('harmony://') && resource(a.uri) === 'Settings')!.resource;
  const put = requestLists(hlapi(REVERSE))[0]![0]!;
  const uploaded = JSON.parse(decodeURIComponent(put.resource!.replace(/\+/g, ' '))) as Record<string, unknown>;

  const before = byName(delivered);
  const after = byName(uploaded);
  assert.deepEqual([...after.keys()], [...before.keys()], 'the same settings in the same order');
  const changed = [...after.keys()].filter((k) => !isDeepEqual(before.get(k), after.get(k)));
  assert.deepEqual(changed.sort(), ['BackgroundImage', 'KeyBrightness', 'ScreenBrightness']);
  assert.ok(!after.has('HapticFlag'), 'no setting named HapticFlag travels');
  const { Settings: _a, ...restBefore } = delivered as Record<string, unknown>;
  const { Settings: _b, ...restAfter } = uploaded;
  assert.deepEqual(restAfter, restBefore, 'nothing outside the settings list changed');
});

test('both recordings are of a Harmony Touch on firmware 4.15.330, by the identity file the client read', lab.skipUnless(FULL, REVERSE), () => {
  for (const fixture of [FULL, REVERSE]) {
    const identity = sessions(commands(records(fixture))).filter((s) => s.path === '/sys/sysinfo');
    assert.ok(identity.length > 0, `${fixture} reads the identity`);
    for (const s of identity) {
      // Named fields only: the file also carries the unit's serial.
      const fields = new Map(text(s.read).split('\n').map((line) => line.split(/\s+/, 2) as [string, string]));
      assert.equal(fields.get('fw_ver'), '4.15.330');
      assert.equal(fields.get('skin'), '0x63');
    }
  }
});
