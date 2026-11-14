/**
 * The sync contract of decision 38: one function that writes a document to a remote of any model and reports as
 * events, and a pretend remote to run it against, both on the write subpath and refusing by name while nothing is
 * behind them.
 *
 * **What is claimed.** That an application can import both from `@harmony/corpus/write` today, and that calling
 * either throws `NotBuiltError` naming it and the requirement it waits on, before it reads its request: nothing is
 * opened, built or sent. **What is not claimed** is that the request, the events or the outcome have their final
 * shape, which the path on two remotes settles.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { NotBuiltError } from '@harmony/codec';
import { pretendRemote, syncDocument, type SyncRequest } from '../../src/write.ts';

test('syncing a document and making a pretend remote refuse by name with their requirements, before reading what they are given', async () => {
  // A request whose every member throws when read: a refusal that came after reading one would fail here.
  const untouched = new Proxy({}, { get: (_, member) => { throw new Error(`the request's ${String(member)} was read`); } }) as SyncRequest;
  await assert.rejects(() => syncDocument(untouched), (error: unknown) => {
    assert.ok(error instanceof NotBuiltError);
    assert.deepEqual([error.contract, error.requirement], ['syncDocument', 79]);
    return true;
  });
  assert.throws(() => pretendRemote({ model: { name: 'Harmony 650' } }), (error: unknown) => {
    assert.ok(error instanceof NotBuiltError);
    assert.deepEqual([error.contract, error.requirement], ['pretendRemote', 80]);
    return true;
  });
});
