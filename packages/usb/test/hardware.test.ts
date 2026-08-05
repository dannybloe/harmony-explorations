/**
 * The one test that touches real USB, and it only looks.
 *
 * Enumeration, never an open: this asks the operating system what is attached and stops there. It
 * skips when no remote is plugged in, which is most of the time, and that is the point of keeping it
 * separate from everything else. A test that needs hardware and silently passes without it is a test
 * that reports on nothing.
 *
 * Note what is deliberately not here: no command is sent, nothing is claimed. The first exchange
 * with a remote is a decision for whoever owns the remote, not something a test run does on its way
 * past.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HARMONY_PRODUCT_FIRST, HARMONY_PRODUCT_LAST, isHarmony, listHarmony } from '../src/index.ts';

test('node-hid loads and enumerates the bus', async () => {
  // Which is worth checking on its own: node-hid is a native module, so this failing means the
  // binding did not build or load for this platform, not that anything about Harmony is wrong.
  const hid = await import('node-hid');
  const devices = hid.devices();
  assert.ok(Array.isArray(devices));
  assert.ok(devices.length > 0, 'no HID devices at all, which suggests a permissions problem');
});

test('an attached Harmony is recognised by vendor and product range', async (t) => {
  const found = await listHarmony();
  if (found.length === 0) {
    t.skip('no Harmony remote attached');
    return;
  }
  for (const remote of found) {
    assert.ok(isHarmony(remote.vendorId, remote.productId));
    assert.ok(remote.productId >= HARMONY_PRODUCT_FIRST);
    assert.ok(remote.productId <= HARMONY_PRODUCT_LAST);
    assert.ok(remote.path !== undefined, 'a remote with no device path cannot be opened');
  }
});
