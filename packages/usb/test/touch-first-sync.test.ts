/**
 * The first sync of a Harmony Touch answered by a program of this project, and the recovery after it stopped,
 * as measured on the bench unit: `todo-touch.md` 6.7.
 *
 * **What was run.** `packages/corpus/bin/touch-sync.ts --unchanged --commit`, the remote on the port where it
 * shows its USB screen, with the settings changed on the remote beforehand (screen lock off). The answerer read
 * the provisioning, asked the remote to hand its own changes up, answered them, started the sync, answered the
 * first list of six with 304 and stopped at the user's favourites, which came without a tag. Then, by hand,
 * through the request rail: `getconfighash`, `touch-recover.ts --step abort`, `getconfighash` again and
 * `--step reboot`. The order of the four is the run's, recorded in `docs/test-notes/harmony-touch.md`; the two
 * reads in the middle folders share a minute, so the folder names alone do not order them.
 *
 * **What it measured, each against something independent of it.**
 *
 * 1. **The hand over handed up one document, Settings, untagged**, after a change on the remote, and nothing
 *    else, which is the reading in `answering-a-sync.md` that a change on the remote erases the tag and queues
 *    the whole document. The other end is the full sync of 2.3, Logitech's client's recording, in which
 *    Settings had been delivered with a tag.
 * 2. **The hand over committed our answer**: the sync's own list then carried, for Settings, exactly the tag
 *    our answer to the hand over had written, and not the full sync's or the reverse sync's, while the other
 *    five carried exactly the full sync's. The two ends are what we wrote and what the remote later reported
 *    of its store, independently.
 * 3. **The six were asked for with their tags, answered 304 and taken**: the reply to that write named it, and
 *    the remote went on to the favourites, which its screens ask for only once the engine reports the gathered
 *    six in, `answering-a-sync.md`; so the 304s were copied and the reload passed. **So a sync answered by a
 *    program of ours runs on a unit**, as far as the end of the configuration documents.
 * 4. **The user's favourites came without a tag**, at an address equal to the one the full sync answered with
 *    200 and a tag. Why is `tests/test_harmony_touch_favourites_untagged.py`: in a sync through a computer the
 *    screens look the document up in the set being gathered, where it is not yet.
 * 5. **The recovery route of `todo-touch.md` 6.1 ran end to end**: after the refusal mid sync `getconfighash`
 *    answered 202 with "sync in progress"; the abort answered 200; the read then answered 200 with the same
 *    hash as before the run, which is the full sync's four tags (`touch-confighash.test.ts`), so the abort
 *    cleared the flag and touched no stored document; and the restart answered 200. That the remote then
 *    started normally, showed its activities and still had screen lock off was seen on the remote and is in the
 *    test notes, not here.
 *
 * **What would have falsified each**: a second document handed up, or Settings handed up with a tag; any of
 * the six untagged or with a tag of neither origin; a reply to the write naming nothing; a different favourites
 * address; a 200 while the sync was running, a hash changed by the abort, or a restart refused.
 *
 * **Sources checked first.** `reference/architectures/harmony-touch/answering-a-sync.md` and `firmware.md`
 * "Recovery", `recovering-a-remote`'s Touch section, the lab's `6.7-preflight.md`, which predicted rows 1 to 3
 * and the recovery, and the recordings through `touch-recording.ts`. **Width**: one unit, firmware 4.15.330, one
 * run, mode 0.
 *
 * The reads hold tags, the account's numbers and a Settings document: this file asserts equalities, counts and
 * shapes and prints none of them.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { answersWritten, commands, list, records, reply, requestLists, resource, sessions, SIX, written } from '@harmony/testkit/touch-recording';

const FULL = 'touch_full_sync_recording';
const REVERSE = 'touch_reverse_sync_recording';
const BEFORE = 'touch_first_sync_confighash_before';
const HAND_OVER_LIST = 'touch_first_sync_handover_list';
const HAND_OVER_ANSWERS = 'touch_first_sync_handover_answers';
const LIST = 'touch_first_sync_list';
const ANSWERS = 'touch_first_sync_answers';
const ANSWERS_REPLY = 'touch_first_sync_answers_reply';
const FAVOURITES = 'touch_first_sync_favourites_list';
const RUNNING = 'touch_recovery_confighash_running';
const ABORT = 'touch_recovery_abort';
const AFTER = 'touch_recovery_confighash_after';
const REBOOT = 'touch_recovery_reboot';
const HASH_64 = 'touch_confighash_read';

function hlapi(fixture: string) {
  return sessions(commands(records(fixture))).filter((s) => s.path === '/sys/hlapi');
}

/** The tag a recorded sync's client wrote with each `harmony://` document, by resource. */
function delivered(fixture: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const a of answersWritten(hlapi(fixture))) if (a.etag && a.uri.startsWith('harmony://')) out.set(resource(a.uri), a.etag);
  return out;
}

test('the hand over handed up Settings alone, untagged, and our answer wrote it back 200 with a tag', lab.skipUnless(HAND_OVER_LIST, HAND_OVER_ANSWERS, FULL), () => {
  const handed = list(HAND_OVER_LIST);
  assert.deepEqual(handed.map((r) => [r.verb, resource(r.uri), 'etag' in r]), [['put', 'Settings', false]]);
  assert.equal(typeof handed[0]!.resource, 'string', 'the put carries the document');
  // The full sync had delivered Settings with a tag, so the remote held one before the change on its screens.
  assert.ok(delivered(FULL).has('Settings'));
  const ours = written(HAND_OVER_ANSWERS);
  assert.equal(ours.length, 1);
  assert.equal(ours[0]!.uri, handed[0]!.uri);
  assert.equal(ours[0]!.statusCode, '200');
  assert.ok(typeof ours[0]!.etag === 'string' && ours[0]!.etag.length > 0);
});

test('the sync asked for the six with tags: five the full sync\'s, Settings the one our hand over answer wrote', lab.skipUnless(LIST, HAND_OVER_ANSWERS, FULL, REVERSE), () => {
  const asked = list(LIST);
  assert.deepEqual(asked.map((r) => resource(r.uri)), SIX);
  for (const r of asked) assert.equal(r.verb, 'get');
  const full = delivered(FULL);
  const ourTag = written(HAND_OVER_ANSWERS)[0]!.etag;
  for (const r of asked) {
    const name = resource(r.uri);
    if (name === 'Settings') {
      assert.equal(r.etag, ourTag, 'Settings carries the tag of our hand over answer');
      // The control: neither earlier origin of a Settings tag.
      assert.notEqual(r.etag, full.get('Settings'));
      assert.notEqual(r.etag, delivered(REVERSE).get('Settings'));
    } else {
      assert.equal(r.etag, full.get(name), `${name} carries the full sync's tag`);
    }
  }
});

test('the six were answered 304 echoing each tag, and the reply named the write', lab.skipUnless(LIST, ANSWERS, ANSWERS_REPLY), () => {
  const asked = list(LIST);
  const ours = written(ANSWERS);
  assert.deepEqual(ours, asked.map((r) => ({ statusCode: '304', uri: r.uri, etag: r.etag })));
  const r = reply(ANSWERS_REPLY);
  assert.equal(r.errorCode, '200');
  assert.equal(r.mime, 'vnd.logitech.proxy/vnd.logitech.response?write');
});

test('both writes of answers were shorter than one chunk, so the whole line announcement met no boundary', lab.skipUnless(HAND_OVER_ANSWERS, ANSWERS), () => {
  // A chunk is the template's 500 packets of 62 characters, `touchsession.ts`: each write went as one, so
  // the run says the announcement of the whole line was acted on, and nothing about a line of several chunks.
  for (const fixture of [HAND_OVER_ANSWERS, ANSWERS]) assert.ok(lab.require_(fixture).length < 31000, fixture);
});

test('the user\'s favourites came untagged, at the address the full sync answered 200 with a tag', lab.skipUnless(FAVOURITES, FULL), () => {
  const asked = list(FAVOURITES);
  assert.equal(asked.length, 1);
  assert.equal(asked[0]!.verb, 'get');
  assert.ok(asked[0]!.uri.startsWith('content://1.0/user;'));
  assert.ok(!('etag' in asked[0]!), 'no tag');
  const answered = answersWritten(hlapi(FULL)).filter((a) => a.uri.startsWith('content://1.0/user;'));
  assert.equal(answered.length, 1);
  assert.equal(answered[0]!.uri, asked[0]!.uri, 'the same address');
  assert.equal(answered[0]!.statusCode, '200');
  assert.ok(typeof answered[0]!.etag === 'string' && answered[0]!.etag.length > 0, 'delivered with a tag');
  // The full sync asked for it untagged as well, which a remote holding none does, so that sync alone could
  // not tell the causes apart; this one, after a tagged delivery, can.
  const fullAsked = requestLists(hlapi(FULL)).flat().filter((q) => q.uri.startsWith('content://1.0/user;'));
  assert.deepEqual(fullAsked.map((q) => 'etag' in q), [false]);
});

test('the recovery route: 202 while the sync was marked running, the abort 200, the same hash, the restart 200', lab.skipUnless(BEFORE, RUNNING, ABORT, AFTER, REBOOT, HASH_64), () => {
  const before = reply(BEFORE);
  assert.equal(before.errorCode, '200');
  assert.equal(before.mime, 'vnd.logitech.harmony/vnd.logitech.harmony.engine?getconfighash');
  const running = reply(RUNNING);
  assert.deepEqual([running.errorCode, running.errorMessage, running.mime, running.result],
    ['202', 'sync in progress', 'vnd.logitech.harmony/vnd.logitech.harmony.engine?getconfighash', null]);
  const abort = reply(ABORT);
  assert.deepEqual([abort.errorCode, abort.mime], ['200', 'vnd.logitech.proxy/vnd.logitech.abort']);
  const after = reply(AFTER);
  assert.equal(after.errorCode, '200');
  // The abort cleared the flag and touched no stored document: the hash is the one before the run, which is
  // the first read's of 6.4.
  assert.equal(after.result, before.result);
  assert.equal(before.result, reply(HASH_64).result);
  const reboot = reply(REBOOT);
  assert.deepEqual([reboot.errorCode, reboot.mime], ['200', 'vnd.logitech.setup/vnd.logitech.firmware?reboot']);
});
