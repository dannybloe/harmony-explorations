/**
 * The work a person has done is kept when the remote stops answering, carried on after a reconnect of the
 * same remote, and never mixed with another remote's, all read off the **published** page (`built.ts`
 * says why).
 *
 * **Why**: at the bench, pressing Glow on a Harmony 885 while the page read its keys switched the remote's
 * screen off and the remote stopped answering, until its cable was unplugged and plugged back in. The page
 * warns against it, and a person who presses it anyway should not have to start the steps over. So the
 * test does what that person does: it connects a pretend 885 through the published `link.js`, does some
 * work, lets the remote go quiet in the middle of a key read, then connects a fresh pretend 885, as a
 * replugged remote is a new device to the browser, and asks the visit what it kept.
 *
 * **What it cannot see**: the page itself, which needs a browser. The page's part is small, it hands
 * `Visit` the remote each connection reports and shows `STOPPED_ANSWERING` when a read fails, and the
 * screenshots in the report of this change show it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publishedLink, publishedModule, publishedWith } from './built.ts';
import { H885_FIELDS, Pretend885 } from './pretend.ts';
import type * as VisitModule from '../src/visit.ts';

const link = await publishedLink();
const visits = (await publishedModule('visit.js')) as typeof VisitModule;

/** What the page keeps per model, cut down to what shows whether it survived: the answers given so far. */
type Work = { answers: string[] };

/** A Harmony 880, which reports skin 15 where the 885 reports 17. */
function pretend880(): Pretend885 {
  const remote = new Pretend885();
  remote.version = [0x27, ...H885_FIELDS.slice(0, 5), 15, H885_FIELDS[6] as number];
  return remote;
}

/** Connect the way the page does, and tell the visit what arrived. */
async function arrive(visit: VisitModule.Visit<Work>, remote: Pretend885) {
  const open = await link.openLink(remote, 20);
  return { open, arrival: visit.connected(open.remote) };
}

test('the words the page shows when the remote stops answering say what happened and what to do', () => {
  assert.equal(
    visits.STOPPED_ANSWERING,
    'Your remote stopped answering. Unplug its cable, plug it back in, and press Reconnect.',
  );
});

test('a remote that goes quiet mid read keeps the work, and the same remote reconnected carries on with it', async () => {
  const visit = new visits.Visit<Work>();
  const device = new Pretend885();
  const first = await arrive(visit, device);
  assert.deepEqual(first.arrival, { kind: 'first' });
  const work = visit.workFor(17, () => ({ answers: [] }));
  work.answers.push('Power', 'Menu');

  // The remote goes quiet: the read fails with the error the page turns into STOPPED_ANSWERING.
  assert.deepEqual(await first.open.readKeys(), { held: 0, last: 0 });
  device.silentFor = 1;
  const failure = await first.open.readKeys().catch((error: unknown) => error);
  assert.ok(failure instanceof link.NoReply, 'a silent remote ends the read as no reply');
  await first.open.close();

  // Unplugged and plugged back in: a new device to the browser, the same remote to the page.
  const again = await arrive(visit, new Pretend885());
  assert.deepEqual(again.arrival, { kind: 'same' });
  assert.equal(visit.chosen, 17, 'the model the person was working on');
  let made = false;
  const resumed = visit.workFor(17, () => {
    made = true;
    return { answers: [] };
  });
  assert.equal(made, false, 'nothing new is made');
  assert.equal(resumed, work);
  assert.deepEqual(resumed.answers, ['Power', 'Menu']);
  await again.open.close();
});

test('a different remote after a lost connection is said to be different, and its work is its own', async () => {
  const visit = new visits.Visit<Work>();
  const h885 = await arrive(visit, new Pretend885());
  visit.workFor(17, () => ({ answers: [] })).answers.push('Power');
  await h885.open.close();

  const h880 = await arrive(visit, pretend880());
  assert.equal(h880.arrival.kind, 'different');
  assert.deepEqual(h880.arrival.kind === 'different' ? h880.arrival.before : undefined, h885.open.remote);
  assert.equal(visit.chosen, undefined, 'no model is chosen for a remote seen for the first time');
  // Even asked under the 885's own model number, the 880 gets work of its own and never the 885's.
  const other = visit.workFor(17, () => ({ answers: [] }));
  assert.equal(other.answers.length, 0);
  other.answers.push('Glow');
  await h880.open.close();

  // The 885 back again: its work is as it was left, untouched by the 880's.
  const back = await arrive(visit, new Pretend885());
  assert.equal(back.arrival.kind, 'different');
  assert.equal(visit.chosen, 17);
  assert.deepEqual(visit.workFor(17, () => ({ answers: [] })).answers, ['Power']);
  await back.open.close();
});

test('control: with the identity comparison disarmed, the 880 after an 885 reads as the same remote', async () => {
  // Shows the test above can fail: what tells two remotes apart is that one comparison.
  const disarmed = (await publishedWith('visit.js', 'identity(before) === identity(remote)', 'true')) as typeof VisitModule;
  const visit = new disarmed.Visit<Work>();
  await (await arrive(visit, new Pretend885())).open.close();
  const h880 = await arrive(visit, pretend880());
  assert.deepEqual(h880.arrival, { kind: 'same' });
  await h880.open.close();
});
