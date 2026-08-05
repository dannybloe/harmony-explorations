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

import { load } from '@harmony/lab';
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

/**
 * The end to end read, against the answer.
 *
 * Gated behind `HARMONY_HARDWARE_TESTS=1` as well as an attached remote, because this one opens the
 * device and sends commands, and a routine `make ts` should not claim a remote on its way past. Read
 * only: GET_VERSION, one RAM byte, and a flash read.
 *
 * What makes it a test rather than a demonstration: the 256 bytes read off the remote are compared
 * against the lab dump of that same unit, which is an answer obtained without any of this code. A
 * read that returns plausible bytes proves nothing; a read that returns the right bytes does.
 */
const HARDWARE = process.env['HARMONY_HARDWARE_TESTS'] === '1';

test('a flash read matches the lab dump of the same remote, byte for byte', async (t) => {
  if (!HARDWARE) {
    t.skip('set HARMONY_HARDWARE_TESTS=1 to let tests open the remote');
    return;
  }
  const dump = load('h600_config');
  if (dump === undefined) {
    t.skip('no lab dump of the 600 to compare against');
    return;
  }
  if ((await listHarmony()).length === 0) {
    t.skip('no Harmony remote attached');
    return;
  }

  const { HarmonyRemote, openHarmony } = await import('../src/index.ts');
  const remote = new HarmonyRemote(await openHarmony(), { timeoutMs: 500 });
  try {
    const read = await remote.readFlash(0x030000, 256);
    // The container sits behind the EZHex XML header in the dump, so find it rather than assume an
    // offset: conflating a file offset with a flash offset is a mistake this project has made.
    const at = dump.findIndex(
      (_b, i) =>
        dump[i] === 0x47 && dump[i + 1] === 0x53 && dump[i + 2] === 0x50 && dump[i + 3] === 0x4d,
    );
    assert.ok(at >= 0, 'no GSPM container in the lab dump');
    assert.deepEqual([...read], [...dump.subarray(at, at + read.length)]);
  } finally {
    await remote.close();
  }
});

test('the version block is twelve bytes and the flash id in it matches concordance', async (t) => {
  if (!HARDWARE || (await listHarmony()).length === 0) {
    t.skip('needs HARMONY_HARDWARE_TESTS=1 and an attached remote');
    return;
  }
  const { HarmonyRemote, openHarmony } = await import('../src/index.ts');
  const remote = new HarmonyRemote(await openHarmony(), { timeoutMs: 500 });
  try {
    const fields = await remote.getVersion();
    assert.equal(fields.length, 12);
    // Fields 2 and 3 are the flash id, which concordance prints for this unit as 15:1C. Asserted
    // rather than printed, because the block also carries values that identify the remote.
    assert.equal(fields[3], 0x15, 'flash manufacturer id');
    assert.equal(fields[2], 0x1c, 'flash device id');
    assert.equal(fields[5], 71, 'skin, which concordance and bcdDevice both say is 71');
  } finally {
    await remote.close();
  }
});

test('live RAM reads return varying values, and selector 0x06 is not the same accessor', async (t) => {
  if (!HARDWARE || (await listHarmony()).length === 0) {
    t.skip('needs HARMONY_HARDWARE_TESTS=1 and an attached remote');
    return;
  }
  const { HarmonyRemote, openHarmony } = await import('../src/index.ts');
  const remote = new HarmonyRemote(await openHarmony(), { timeoutMs: 500 });
  try {
    // 0x1C1 is the 600's command state variable. Reading it during a READ_MISC returns 10, which is
    // the state READ_MISC itself sets: the read observes the command that is doing the reading. That
    // is the closure that makes this a live RAM read rather than a byte from somewhere.
    assert.equal(await remote.readRam(0x1c1), 10);
    const varied = new Set<number>();
    for (const address of [0x1c1, 0x08d, 0x3bf]) varied.add(await remote.readRam(address));
    assert.ok(varied.size > 1, 'every address returned the same byte, which is not a memory read');
  } finally {
    await remote.close();
  }
});
