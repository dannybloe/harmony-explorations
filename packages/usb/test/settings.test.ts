/**
 * The settings store over USB and in a lab dump, sections 303 and 304.
 *
 * The read and the write were both sent to the Harmony 600, sections 304 and 305. The
 * scripted tests pin what this library sends and what it accepts, the lab tests pin the reader that a
 * read over USB is compared against and the prediction a write's read back is compared against, and
 * the subprocess tests pin the write's rail with its two flags on.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  DELAY_SETTINGS,
  HarmonyRemote,
  delaySlots,
  isReadOnlyReport,
  ACTIVE_BLOCK_HEADER,
  STORE_BLOCK_BYTES,
  STORE_OFFSET_IN_PAGE,
  clearSlotWrites,
  decodeSettingsWriteReply,
  latestSettings,
  predictStoreAfter,
  settingsReadRequest,
} from '../src/index.ts';
import { settingsWriteRequest } from '../src/writes.ts';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
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
  // The frame the Harmony 600 answered with for setting 0, with setting 8's value from the lab dump.
  const { transport, written } = scripted([report(0xf0, 0x11, 0xb2, 0x01, 0x01, 0x01, 0x0e)]);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, architecture: 14 });
  assert.equal(await remote.readSetting(0x08), 0x0e);
  assert.equal(written.length, 1);

  // A frame that differs anywhere is refused with its bytes, and so is the error status.
  for (const wrong of [
    report(0xf0, 0x11, 0xb3, 0x01, 0x01, 0x01, 0x0e),
    report(0xf0, 0x11, 0xb2, 0x01, 0x00, 0x01, 0x0e),
    report(0xf0, 0x0e),
    report(0x28, 0x02),
  ]) {
    const remote = new HarmonyRemote(scripted([wrong]).transport, { timeoutMs: 1, architecture: 14 });
    await assert.rejects(() => remote.readSetting(0x08), /setting 0x8: not a settings read reply/);
  }
  // A 4 in the fourth byte is what a command that clears the firmware's flag answers, a failed
  // settings write among them, so it is not a settings read reply.
  const other = new HarmonyRemote(scripted([report(0xf0, 0x11, 0xb2, 0x04, 0x01, 0x01, 0x0e)]).transport,
    { timeoutMs: 1, architecture: 14 });
  await assert.rejects(() => other.readSetting(0x08), /answers 4 where every read answers 1/);
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

test('a settings write sends 0x14 0xB3 0x00, the setting and the value, and the transport does not take it for a read', () => {
  const request = settingsWriteRequest(0x08, 0xff);
  assert.deepEqual([...request.subarray(0, 6)], [0x14, 0xb3, 0x00, 0x08, 0xff, 0x00]);
  assert.ok(!isReadOnlyReport(request));
  assert.throws(() => settingsWriteRequest(0xff, 0), /outside/);
  assert.throws(() => settingsWriteRequest(0x08, 0x100), /one byte/);
});

test('a settings write succeeds on status 1 with code 0, and every code the append returns otherwise is an error', () => {
  // The executor clears the firmware's flag only when the append returns nonzero, `0xCD24`, so a
  // success answers 1 and a failure 4, with the code in the seventh byte.
  decodeSettingsWriteReply(report(0xf0, 0x11, 0xb3, 0x01, 0x01, 0x01, 0x00));
  for (const [code, meaning] of [[4, /no free record/], [5, /0xFF or more/], [6, /neither block/], [7, /read back differ/]] as const) {
    assert.throws(() => decodeSettingsWriteReply(report(0xf0, 0x11, 0xb3, 0x04, 0x01, 0x01, code)), meaning);
  }
  assert.throws(() => decodeSettingsWriteReply(report(0xf0, 0x11, 0xb2, 0x01, 0x01, 0x01, 0x00)), /not a settings write reply/);
  assert.throws(() => decodeSettingsWriteReply(report(0xf0, 0x0e)), /not a settings write reply/);
});

test('clearing the Harmony 600\'s KPN slot appends four records at the first free one and leaves only the PS3\'s saved delay',
     skipUnless('h600_internal_ff_region'), () => {
  const store = require_('h600_internal_ff_region').subarray(STORE_OFFSET_IN_PAGE, STORE_OFFSET_IN_PAGE + 2 * STORE_BLOCK_BYTES);
  const writes = clearSlotWrites('power on', 2);
  assert.deepEqual(writes.map((w) => w.setting), [0x08, 0x09, 0x0a, 0x0b]);
  const { after, appended, freeBefore } = predictStoreAfter(store, writes);
  assert.equal(appended, 4);
  // 59 records from offset 4, so the first free one is at 0x7A and 451 remain.
  assert.equal(freeBefore, 451);
  const changed = [...after.keys()].filter((i) => after[i] !== store[i]);
  // Only the setting bytes change: each value is 0xFF, which an erased byte already holds.
  assert.deepEqual(changed, [0x7a, 0x7c, 0x7e, 0x80]);
  assert.deepEqual([...after.subarray(0x7a, 0x82)], [0x08, 0xff, 0x09, 0xff, 0x0a, 0xff, 0x0b, 0xff]);
  assert.deepEqual(delaySlots(latestSettings(after)).map((s) => [s.table, s.key, s.value]),
    [['inter device', 0x0e26, 15]]);
  // Writing the values it already holds appends nothing, as the firmware's append returns 0 unwritten.
  assert.equal(predictStoreAfter(after, writes).appended, 0);
});

test('the prediction refuses a wrong header, a second live block, stray bytes, a write onto the last record and a wrong length', () => {
  const blank = () => {
    const store = new Uint8Array(2 * STORE_BLOCK_BYTES).fill(0xff);
    store.set(ACTIVE_BLOCK_HEADER, 0);
    return store;
  };
  const writes = clearSlotWrites('power on', 0);
  assert.equal(predictStoreAfter(blank(), writes).appended, 0);
  const one = [{ setting: 0x00, value: 0x01 }];
  assert.equal(predictStoreAfter(blank(), one).appended, 1);

  const header = blank(); header[0] = 0xfe;
  assert.throws(() => predictStoreAfter(header, one), /not the active header/);
  const second = blank(); second[STORE_BLOCK_BYTES + 10] = 0;
  assert.throws(() => predictStoreAfter(second, one), /block 1 is not erased/);
  const stray = blank(); stray[0x100] = 0;
  assert.throws(() => predictStoreAfter(stray, one), /bytes after its first free record/);
  // A block with one free record left: the write would land on the last record, which starts the copy.
  const full = blank(); full.fill(0x00, 4, STORE_BLOCK_BYTES - 2);
  assert.throws(() => predictStoreAfter(full, one), /fill the block/);
  const nearly = blank(); nearly.fill(0x00, 4, STORE_BLOCK_BYTES - 4);
  assert.equal(predictStoreAfter(nearly, one).appended, 1);
  assert.throws(() => predictStoreAfter(new Uint8Array(100), one), /two blocks/);
  // No free record at all is refused the same way, since the firmware would answer it with the copy.
  const none = blank(); none.fill(0x00, 4, STORE_BLOCK_BYTES);
  assert.throws(() => predictStoreAfter(none, one), /fill the block/);
});

test('a slot whose key\'s high byte is 0xFF is empty, as the firmware\'s save tests it', () => {
  // What a clear interrupted after its first write leaves: 0xFFDC, which the save at 0xE0D0 treats as
  // free. Reporting it as a live slot would describe a delay the remote no longer has.
  assert.deepEqual(delaySlots(new Map([[0x08, 0xff], [0x09, 0xdc], [0x0a, 0x00], [0x0b, 0x0a]])), []);
  assert.deepEqual(delaySlots(new Map([[0x08, 0x0e], [0x09, 0xff], [0x0a, 0x00], [0x0b, 0x0a]])).map((s) => s.key), [0x0eff]);
});

function withEnv(extra: Record<string, string>, script: string): string {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const index = join(here, '..', 'src', 'index.ts').replaceAll('\\', '/');
  return execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', `import * as usb from '${index}';\n${script}`],
    { env: { ...process.env, ...extra }, encoding: 'utf8' },
  ).trim();
}

const WRITE_CASES = `
  const unit = new Uint8Array(64).fill(0xee, 0, 16);
  for (let i = 16; i < 48; i += 1) unit[i] = (i * 7 + 1) & 0xff;
  const other = unit.slice(); other[20] ^= 0xff;
  const store = new Uint8Array(2 * usb.STORE_BLOCK_BYTES).fill(0xff);
  store.set(usb.ACTIVE_BLOCK_HEADER, 0);
  const copied = store.slice(); copied[usb.STORE_BLOCK_BYTES] = 0xfc;
  const p = { architecture: 14, identityBlock: unit, permittedUnit: unit };
  const clear = usb.clearSlotWrites('power on', 2);
  const cases = {
    'the whole of it': [p, { firmware: '0.2', store }, clear],
    'another unit': [{ ...p, identityBlock: other }, { firmware: '0.2', store }, clear],
    'arch 12': [{ ...p, architecture: 12 }, { firmware: '0.2', store }, clear],
    'running 2.8': [p, { firmware: '2.8', store }, clear],
    'no writes': [p, { firmware: '0.2', store }, []],
    'nine writes': [p, { firmware: '0.2', store }, [...clear, ...clear, clear[0]]],
    'setting 0x80': [p, { firmware: '0.2', store }, [{ setting: 0x80, value: 0 }]],
    'a value past a byte': [p, { firmware: '0.2', store }, [{ setting: 0x08, value: 256 }]],
    'a store mid copy': [p, { firmware: '0.2', store: copied }, clear],
  };
  for (const [name, [perm, remote, writes]] of Object.entries(cases)) {
    try { usb.assertSettingsWriteAllowed(perm, remote, writes); console.log(name + ': allowed'); }
    catch (error) { console.log(name + ': refused: ' + error.message); }
  }
`;

test('with writing disabled, or the settings door shut, every settings write case is refused', () => {
  for (const env of [{ HARMONY_ENABLE_WRITES: '', HARMONY_SETTINGS_WRITE: '1' }, { HARMONY_ENABLE_WRITES: '1', HARMONY_SETTINGS_WRITE: '' }]) {
    const lines = withEnv(env, WRITE_CASES).split('\n');
    assert.equal(lines.length, 9);
    const reason = env.HARMONY_ENABLE_WRITES === '1' ? 'needs HARMONY_SETTINGS_WRITE=1' : 'this build is read only';
    assert.ok(lines.every((line) => line.includes(': refused: ') && line.includes(reason)), lines.join('\n'));
  }
});

test('with both flags, each condition of the settings write refuses by itself and the whole of it passes', () => {
  const lines = withEnv({ HARMONY_ENABLE_WRITES: '1', HARMONY_SETTINGS_WRITE: '1' }, WRITE_CASES).split('\n');
  const expected: [string, RegExp][] = [
    ['the whole of it', /^the whole of it: allowed$/],
    ['another unit', /: refused: the remote on the cable is not the unit/],
    ['arch 12', /: refused: architecture 12 has no settings store/],
    ['running 2.8', /: refused: the remote runs firmware 2\.8, and the settings write is read on 0\.2 only/],
    ['no writes', /: refused: a settings write takes one to eight records, and this is 0/],
    ['nine writes', /: refused: a settings write takes one to eight records, and this is 9/],
    ['setting 0x80', /: refused: setting 0x80 is not a delay setting/],
    ['a value past a byte', /: refused: a setting holds one byte/],
    ['a store mid copy', /: refused: refusing the settings write: block 1 is not erased/],
  ];
  assert.equal(lines.length, expected.length, lines.join('\n'));
  expected.forEach(([name, pattern], i) => assert.ok(lines[i]!.startsWith(name) && pattern.test(lines[i]!), lines[i]));
});

test('the Harmony 600\'s store read back after the clear is the prediction, byte for byte',
     skipUnless('h600_settings_before_clear', 'h600_settings_after_clear'), () => {
  // Section 305: four writes sent, and the two blocks read back afterwards. The same comparison the
  // script made on the bench, made again here out of the filed bytes rather than its journal.
  const before = require_('h600_settings_before_clear');
  const after = require_('h600_settings_after_clear');
  const predicted = predictStoreAfter(before, clearSlotWrites('power on', 2));
  assert.equal(predicted.appended, 4);
  assert.deepEqual([...after], [...predicted.after]);
  assert.deepEqual(delaySlots(latestSettings(after)).map((s) => [s.table, s.slot, s.key, s.value]),
    [['inter device', 2, 0x0e26, 15]]);
});
