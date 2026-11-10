/**
 * What a Harmony Touch reports of its stored configuration when asked over the cable: the first request this
 * project sent a Touch.
 *
 * **The question.** Before anything is written to a Touch, the work needs to know what the remote holds,
 * so that a backup is a backup of that and a first write can be compared against it. The engine's
 * `getconfighash` was read in the firmware (`reference/architectures/harmony-touch/api/engine.md`) to answer
 * `result=` followed by the entity tags of the stored activity list, device list, function list, protocol
 * list, context and home control configuration, in that order, each only when stored, joined with nothing
 * between them; on a Touch synced through a computer, four tags. Nobody had sent it, Logitech's client
 * included, so whether a unit answers it on the cable and in that form was the reading's alone.
 *
 * **The instrument.** `packages/usb/bin/touch-request.ts --request confighash --commit`, through the request
 * rail (`openTouchRequestSession`, the unit checked against the lab's `units/touch.txt`), one open
 * of `/sys/hlapi` for writing with the request line, one for reading the answer, kept in the lab. The
 * other end is the recorded full sync, `touch-sync-both-ways.test.ts`: the tags Logitech's client
 * handed the remote with each of the six documents. **The two ends are independent**: one is what the
 * remote reports of its store, read off the unit, the other what a client wrote into it, recorded on the
 * way in, and neither was computed from the other.
 *
 * **What it measured.** The unit answered, and its hash is exactly the full sync's activity list, device
 * list, protocol list and context tags joined in that order, with no separator and no quote. So:
 *
 * * the engine reading's order and joining hold on a unit, for the four documents a computer's sync stores;
 * * the button map list and the settings are not in it, as read, so it says nothing about those two;
 * * the four documents the remote holds are the ones the full sync delivered, so that recording is a backup
 *   of them, and no sync down has reached the remote since. The settings were changed on the remote
 *   after it (the reverse sync recorded after it uploaded them), which the hash cannot show.
 *
 * **What would have falsified it**: a different order, a separator, a fifth tag, any tag not among the full
 * sync's, or a refusal while no sync runs. The control below permutes the four and asserts every other order
 * differs, so the equality is not one the tags' shapes would give anyway.
 *
 * **Sources checked first**: the engine's handler (`processConfigHash`, read for `api/engine.md`), MyHarmony
 * (which never sends it), and the recorded syncs. **Width**: one unit, firmware 4.15.330; the hubs, which run
 * the same engine, are not checked.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { answersWritten, commands, records, resource, sessions } from '@harmony/testkit/touch-recording';

const FULL = 'touch_full_sync_recording';
const HASH = 'touch_confighash_read';

/** The four documents a Touch synced through a computer reports, in the engine's order. */
const FOUR = ['ActivityList', 'DeviceList', 'ProtocolList', 'Context'];

/** The tag Logitech's client handed the remote with each `harmony://` document of a recorded sync. */
function tagsDelivered(fixture: string): Map<string, string> {
  const hl = sessions(commands(records(fixture))).filter((s) => s.path === '/sys/hlapi');
  const out = new Map<string, string>();
  for (const a of answersWritten(hl)) if (a.etag && a.uri.startsWith('harmony://')) out.set(resource(a.uri), a.etag);
  return out;
}

/** The hash the unit answered, without its `result=`. */
function hashAnswered(): string {
  const text = new TextDecoder().decode(lab.require_(HASH));
  assert.ok(text.startsWith('Response,'), 'the answer is not a request answer');
  const body = JSON.parse(text.slice('Response,'.length)) as { errorCode: string; result: string };
  assert.equal(body.errorCode, '200');
  assert.ok(body.result.startsWith('result='), 'the result does not open with result=');
  return body.result.slice('result='.length);
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

test('the unit\'s config hash is the full sync\'s activity, device, protocol and context tags joined in that order', lab.skipUnless(FULL, HASH), () => {
  const tags = tagsDelivered(FULL);
  for (const r of FOUR) assert.ok(tags.has(r), `the full sync handed no tag with ${r}`);
  assert.equal(hashAnswered(), FOUR.map((r) => tags.get(r)!).join(''));
});

test('no other order of the four tags gives the hash, so the equality is the order and not the tags\' shape', lab.skipUnless(FULL, HASH), () => {
  const tags = tagsDelivered(FULL);
  const hash = hashAnswered();
  const others = permutations(FOUR).filter((p) => p.join() !== FOUR.join());
  assert.equal(others.length, 23);
  for (const p of others) assert.notEqual(p.map((r) => tags.get(r)!).join(''), hash, p.join());
});

test('the button map list\'s and the settings\' tags are not in the hash', lab.skipUnless(FULL, HASH), () => {
  const tags = tagsDelivered(FULL);
  const hash = hashAnswered();
  for (const r of ['MapList', 'Settings']) {
    if (tags.has(r)) assert.ok(!hash.includes(tags.get(r)!), `${r}'s tag is in the hash`);
  }
});
