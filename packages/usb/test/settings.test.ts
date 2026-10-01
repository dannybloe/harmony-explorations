/**
 * The settings store over USB and in a lab dump, sections 303 and 304.
 *
 * The request and the reply are the firmware's statement and have not been seen on a remote, so the
 * scripted tests pin what this library sends and what it accepts, and the lab test pins the reader
 * that a read over USB is compared against.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  DELAY_SETTINGS,
  HarmonyRemote,
  delaySlots,
  isReadOnlyReport,
  latestSettings,
  settingsReadRequest,
} from '../src/index.ts';
import type { Transport } from '../src/transport.ts';

function scripted(replies: Uint8Array[]) {
  const written: Uint8Array[] = [];
  const queue = [...replies];
  const transport: Transport = {
    async write(report) { written.push(new Uint8Array(report)); },
    async read() { return queue.shift(); },
    async close() {},
  };
  return { transport, written };
}

function report(...bytes: number[]): Uint8Array {
  const out = new Uint8Array(64);
  out.set(bytes);
  return out;
}

test('a settings read sends 0x13 0xB2 0x00 and the setting, and the transport classifies it as a read', () => {
  const request = settingsReadRequest(0x08);
  assert.deepEqual([...request.subarray(0, 5)], [0x13, 0xb2, 0x00, 0x08, 0x00]);
  assert.ok(isReadOnlyReport(request));
  // 0xFF and above are refused before sending: the remote answers a refused lookup with 0xFF, which
  // is also what an empty slot holds.
  assert.throws(() => settingsReadRequest(0xff), /outside/);
  assert.throws(() => settingsReadRequest(-1), /outside/);
});

test('the reply is taken from the seventh byte of an exact frame and anything else is an error', async () => {
  const { transport, written } = scripted([report(0xf0, 0x11, 0xb2, 0x04, 0x01, 0x01, 0x0e)]);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, architecture: 14 });
  assert.equal(await remote.readSetting(0x08), 0x0e);
  assert.equal(written.length, 1);

  // A frame that differs anywhere is refused with its bytes, and so is the error status.
  for (const wrong of [
    report(0xf0, 0x11, 0xb3, 0x04, 0x01, 0x01, 0x0e),
    report(0xf0, 0x11, 0xb2, 0x04, 0x00, 0x01, 0x0e),
    report(0xf0, 0x0e),
    report(0x28, 0x02),
  ]) {
    const remote = new HarmonyRemote(scripted([wrong]).transport, { timeoutMs: 1, architecture: 14 });
    await assert.rejects(() => remote.readSetting(0x08), /setting 0x8: not a settings read reply/);
  }
  const failed = new HarmonyRemote(scripted([report(0xf0, 0x11, 0xb2, 0x01, 0x01, 0x01, 0x0e)]).transport,
    { timeoutMs: 1, architecture: 14 });
  await assert.rejects(() => failed.readSetting(0x08), /reports status 1/);
});

test('a settings read is refused off arch 14 and on an unpinned remote, and sends nothing', async () => {
  for (const architecture of [9, 12, undefined]) {
    const { transport, written } = scripted([]);
    const remote = new HarmonyRemote(transport, architecture === undefined
      ? { timeoutMs: 1 } : { timeoutMs: 1, architecture });
    await assert.rejects(() => remote.readSetting(0x08), /arch 14 only/);
    assert.equal(written.length, 0);
  }
});

test('the Harmony 600\'s store in the lab holds the two saved delays section 303 found',
     skipUnless('h600_internal_ff_region'), () => {
  const latest = latestSettings(require_('h600_internal_ff_region'));
  assert.equal(DELAY_SETTINGS.length, 40);
  assert.deepEqual(delaySlots(latest), [
    { table: 'power on', slot: 2, key: 0x0edc, value: 10 },
    { table: 'inter device', slot: 2, key: 0x0e26, value: 15 },
  ]);
  // Every other delay setting is erased, and setting 0x80's latest value is 0xFE, section 282.
  const erased = DELAY_SETTINGS.filter((s) => (latest.get(s) ?? 0xff) === 0xff);
  assert.equal(erased.length, 32);
  assert.equal(latest.get(0x80), 0xfe);
});

test('the Harmony 650\'s and 700\'s stores in the lab hold no saved delay',
     skipUnless('h650_page_ff', 'h700_28_internal_ff'), () => {
  for (const name of ['h650_page_ff', 'h700_28_internal_ff']) {
    const latest = latestSettings(require_(name));
    assert.deepEqual(delaySlots(latest), [], name);
    assert.deepEqual([...latest.keys()], [0x80], name);
  }
});
