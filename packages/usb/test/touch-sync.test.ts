/**
 * How a Harmony Touch is synced, measured on one recorded sync: a conversation through one file,
 * `/sys/hlapi`, carrying six documents from Logitech's service to the remote unchanged.
 *
 * **The question.** The reference said the whole provisioning conversation rides on the file protocol's
 * request and response command, `0x08`, section 203, and that nothing had ever sent it. `todo-touch.md`
 * 2.1 asked whether a sync's traffic could be seen at all and 2.3 asks for one sync recorded whole. Both
 * were answered by the same instrument: a copy of Harmony Desktop 1.0.303 in the lab that loads a library
 * of ours injecting a recorder into the client's page, which wraps `XMLHttpRequest`, `fetch` and
 * `prompt()`. The client's page reaches the USB layer through `prompt()`, a bridge it calls `SJbridge`,
 * so every packet the client sent the remote through that bridge and every reply is in the same file as
 * every web request the page made through `XMLHttpRequest` or `fetch`, with its answer. The fixture is that file, from one sync of the bench Touch on firmware 4.15.330.
 *
 * **What it measured.**
 *
 * 1. **No `0x08` at all.** 101 commands: the identity read, the file system reset, and then only opens,
 *    writes, reads and closes. The sync is file sessions on `/sys/hlapi`: open it for writing, write one
 *    request, close, open it for reading, read the answer, close. Besides it only `/sys/sysinfo` (read
 *    twice, the identity) and `/sys/time` (opened for writing once, the write refused) are opened.
 * 2. **A request is a line of text** naming `vnd.logitech.<area>/vnd.logitech.<command>`, then `&` and
 *    URL encoded arguments; a long one is announced first by a `Content-Length` line. **An answer is the
 *    word `Response`, a comma and JSON**, the shape `/rf/deviceinfo` gives, section 201.
 * 3. **The remote's list of requests** is six gets of logical `harmony://` addresses, each with an entity
 *    tag: the account's activity, device, map and protocol lists, and the remote's context and settings.
 *    The client writes all six answers back in one request.
 * 4. **The closure: each of the six documents the remote received is, as parsed JSON, the same as what
 *    Logitech's service answered the client's web request for it**; the client re-serialises it compact, so
 *    the text is not byte for byte the answer's. The two ends are different fields of
 *    the recording, read by different routes: the network answer as the page's recorder captured it at
 *    the `XMLHttpRequest`, and the remote's copy reassembled from the hex of the USB data packets by this
 *    file's decoder over `filepipe.ts`'s framing. So it holds the claim (the client hands the documents
 *    over unchanged) and the decoder (a wrong packet boundary would garble the button maps, 92664 characters of compact JSON)
 *    at once. The negative: the six documents are pairwise distinct, so equality is not met by accident.
 *
 * **What it rules out.** That a Touch's configuration is compiled, transformed or packed by the client:
 * it is Logitech's own account data in Logitech's own data model, `reference/logitech/data-model/`. And
 * that `0x08` is needed to drive a sync, which is what made `todo-touch.md` 2.4 a hardware experiment.
 *
 * **Width.** One sync, one Touch, firmware 4.15.330 (asserted from the identity file the client read),
 * one account holding two devices and one activity, one client, Harmony Desktop. The seven skin 99
 * templates in Harmony Desktop's client that name `/sys/hlapi`, `getrequest.xml`, `postresponse.xml`,
 * `syncremote.xml` and four more, use only open, write, read and close; `simplepostresponse.xml` is the
 * only skin 99 template using `0x08`, and the sync never sent it (`tests/test_client_templates.py`).
 * MyHarmony's hub operations do use the simple post response, so nothing here widens to the hubs. MyHarmony's
 * sync calls the get request and post response operations, the `/sys/hlapi` ones, and not the simple
 * post response; it was not run. The other products of the generation are not checked.
 *
 * **Sources checked first.** `reference/architectures/harmony-touch/usb.md`, `reference/remotes/
 * harmony-touch/`, `reference/usb-protocol/file-protocol.md`, `docs/findings.md` sections 198 to 203,
 * Logitech's skin 99 templates in the mirrored client, MyHarmony's decompiled `DSController`, and the
 * Touch engine decompiled in the lab, whose sync request list (`todo-touch.md` 1.6) named these six
 * resources before the recording existed. **How 0x08 got into the reference**: section 203 read the
 * proxy loop in MyHarmony's code and attributed it to the command described as "request and response
 * with no file" by its description alone; the templates beside it said `/sys/hlapi` all along.
 *
 * The fixture holds the test account's data and the unit's serial, so this file asserts names, counts and
 * equalities and prints no value out of it. It skips without the lab.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import {
  FILE_CLOSE,
  FILE_CONTROL,
  FILE_HBUS,
  FILE_OPEN,
  FILE_PING,
  FILE_READ,
  FILE_RESET_FILESYSTEM,
  FILE_WRITE,
  OFFSET_COMMAND,
} from '../src/filepipe.ts';
import { SIX, commands, records, requestLists, requestName, resource, sessions, text } from './touch-recording.ts';

const FIXTURE = 'touch_sync_recording';

test('a Touch sync through Harmony Desktop sends no request and response command', lab.skipUnless(FIXTURE), () => {
  const byCommand = new Map<number, number>();
  const controls: number[] = [];
  for (const c of commands(records(FIXTURE))) {
    const id = c.request[0]![OFFSET_COMMAND]!;
    byCommand.set(id, (byCommand.get(id) ?? 0) + 1);
    // A device control's one byte parameter sits after the count and its type tag.
    if (id === FILE_CONTROL) controls.push(c.request[0]![5]!);
  }
  assert.deepEqual(controls, [FILE_RESET_FILESYSTEM, FILE_RESET_FILESYSTEM], 'both controls reset the file system');
  assert.deepEqual(
    Object.fromEntries([...byCommand].sort((a, b) => a[0] - b[0])),
    { [FILE_PING]: 4, [FILE_OPEN]: 29, [FILE_WRITE]: 22, [FILE_READ]: 15, [FILE_CLOSE]: 29, [FILE_CONTROL]: 2 },
  );
  assert.equal(byCommand.get(FILE_HBUS), undefined, 'no 0x08 in the whole sync');
});

test('the sync opens /sys/hlapi, the identity file and the clock file and nothing else', lab.skipUnless(FIXTURE), () => {
  const opened = new Map<string, number>();
  for (const s of sessions(commands(records(FIXTURE)))) {
    const key = `${s.path} ${s.mode}`;
    opened.set(key, (opened.get(key) ?? 0) + 1);
  }
  assert.deepEqual(Object.fromEntries([...opened].sort()), {
    '/sys/hlapi R': 13,
    '/sys/hlapi W': 13,
    '/sys/sysinfo R': 2,
    '/sys/time W': 1,
  });
});

test('each request is a line written into /sys/hlapi, and each accepted one is answered with Response and JSON', lab.skipUnless(FIXTURE), () => {
  const hlapi = sessions(commands(records(FIXTURE))).filter((s) => s.path === '/sys/hlapi');
  const written = hlapi.filter((s) => s.mode === 'W').map((s) => requestName(text(s.written)));
  assert.deepEqual(written, [
    'setup/syncRemoteChanges',
    'proxy/request?read',
    'Content-Length',
    'proxy/response?write',
    'setup/account?getprovisioninfo',
    // A stringified JavaScript array the client writes after reading the provisioning information,
    // answered by an empty read; unexplained, and asserted so that it stays visible.
    'a stringified array',
    'setup/sync',
    'proxy/request?read',
    'Content-Length',
    'proxy/response?write',
    'proxy/request?read',
    'Content-Length',
    'proxy/response?write',
  ]);

  const answers = hlapi.filter((s) => s.mode === 'R').map((s) => text(s.read));
  assert.equal(answers.filter((a) => a.startsWith('Response,')).length, 12);
  // The read after the stringified array got no reply at all: the client's poll ended in a read timeout.
  assert.equal(answers.filter((a) => a === '').length, 1, 'the read after the stringified array');
  for (const a of answers.filter((x) => x.startsWith('Response,'))) JSON.parse(a.slice('Response,'.length));
});

test('the remote asks for finished, then for six resources by logical address and entity tag, then for finished', lab.skipUnless(FIXTURE), () => {
  const lists = requestLists(sessions(commands(records(FIXTURE))).filter((s) => s.path === '/sys/hlapi'));
  assert.deepEqual(lists.map((l) => l.map((r) => `${r.verb} ${r.uri.startsWith('harmony://') ? resource(r.uri) : r.uri}`)), [
    ['POST proxy://Finished'],
    SIX.map((n) => `get ${n}`),
    ['POST proxy://Finished'],
  ]);
  for (const r of lists[1]!) assert.ok(r.etag && r.etag.length > 0, `${resource(r.uri)} carries an entity tag`);
});

test('the six documents reach the remote as the same JSON Logitech\'s service sent', lab.skipUnless(FIXTURE), () => {
  const all = records(FIXTURE);
  const hlapi = sessions(commands(all)).filter((s) => s.path === '/sys/hlapi');
  const writes = hlapi.filter((s) => s.mode === 'W').map((s) => text(s.written));
  const answer = writes.find((w) => w.startsWith('vnd.logitech.proxy/vnd.logitech.response?write') && w.includes('ActivityList'))!;
  const responses = (JSON.parse(decodeURIComponent(answer.split('&responses=')[1]!)) as {
    responses: { uri: string; statusCode: string; 'body-type': string; etag: string; resource: unknown }[];
  }).responses;
  assert.deepEqual(responses.map((r) => resource(r.uri)), SIX);

  // The other end: the page's own web request for each resource, as the recorder saw it answered.
  const fetched = new Map<string, unknown>();
  for (const r of all) {
    if (r.kind !== 'xhr' || r.method?.toUpperCase() !== 'GET' || typeof r.response !== 'string') continue;
    const name = SIX.find((n) => new RegExp(`/${n}(\\?|$)`).test(r.url!.split('?0.')[0]!));
    if (name) fetched.set(name, JSON.parse(r.response));
  }
  assert.deepEqual([...fetched.keys()].sort(), [...SIX].sort(), 'one web request per resource');

  // Each document's length as compact JSON, so that a lost or doubled entry moves a number in the diff.
  const sizes: Record<string, number> = {};
  for (const r of responses) {
    const name = resource(r.uri);
    assert.deepEqual(r.resource, fetched.get(name), `${name} is the same JSON`);
    assert.equal(r.statusCode, '200', `${name} status`);
    assert.equal(r['body-type'], 'application/json', `${name} type`);
    assert.ok(r.etag.length > 0, `${name} entity tag`);
    sizes[name] = JSON.stringify(r.resource).length;
  }
  assert.deepEqual(sizes, {
    ActivityList: 1218, DeviceList: 68104, MapList: 92664, Context: 889, Settings: 1410, ProtocolList: 4025,
  });

  // The negative: no two documents are alike, so the equalities above cannot be met by a mix up.
  const distinct = new Set(responses.map((r) => JSON.stringify(r.resource)));
  assert.equal(distinct.size, 6);
});

test('the remote refuses two writes, the clock and the stringified array, and accepts every other', lab.skipUnless(FIXTURE), () => {
  const writes = sessions(commands(records(FIXTURE))).filter((s) => s.mode === 'W');
  const refused = writes.filter((s) => s.refused).map((s) => (s.path === '/sys/time' ? '/sys/time' : requestName(text(s.written))));
  assert.deepEqual(refused, ['a stringified array', '/sys/time']);
  assert.equal(writes.length - refused.length, 12, 'the requests written to /sys/hlapi that the remote took');
});

test('the remote synced is a Harmony Touch on firmware 4.15.330, by the identity file the client read', lab.skipUnless(FIXTURE), () => {
  const identity = sessions(commands(records(FIXTURE))).filter((s) => s.path === '/sys/sysinfo');
  assert.equal(identity.length, 2);
  for (const s of identity) {
    // Named fields only: the file also carries the unit's serial.
    const fields = new Map(text(s.read).split('\n').map((line) => line.split(/\s+/, 2) as [string, string]));
    assert.equal(fields.get('fw_ver'), '4.15.330');
    assert.equal(fields.get('skin'), '0x63');
  }
});
