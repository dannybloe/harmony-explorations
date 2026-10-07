/**
 * The harvest's offline half, `todo-secure-logitech.md` 1.1: the rail that refuses a write before a
 * request exists, the search match chosen by device id, the payload's shape, the compile's status word,
 * the ZIP reader and the split of a failed batch. Nothing here touches the network.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';

import { ServiceRefusal, assertCallAllowed } from '../src/myharmony.ts';
import {
  HarvestRefusal, addDeviceOperation, compileStatus, operationBag, pickMatch, readZip, splitBatch,
} from '../src/harvest.ts';

const DENON = { manufacturer: 'Denon', file: 'AVR-X4800H.json', model: 'AVR-X4800H', globalDeviceId: 512420 };

test('a write is refused without its door, and passes with exactly that door open', () => {
  assert.throws(() => assertCallAllowed('UpdateMultiple', {}), ServiceRefusal);
  assert.throws(() => assertCallAllowed('UpdateMultiple', { MYHARMONY_ALLOW_COMPILE: '1' }), ServiceRefusal);
  assert.doesNotThrow(() => assertCallAllowed('UpdateMultiple', { MYHARMONY_ALLOW_DEVICE_WRITE: '1' }));
  assert.doesNotThrow(() => assertCallAllowed('StartCompileWithLocaleAndSettings', { MYHARMONY_ALLOW_COMPILE: '1' }));
  assert.doesNotThrow(() => assertCallAllowed('DeleteDevices', { MYHARMONY_ALLOW_DELETE: '1' }));
});

test('a write with no door is refused even with every door open, and so is the read that compiles', () => {
  const all = { MYHARMONY_ALLOW_COMPILE: '1', MYHARMONY_ALLOW_DEVICE_WRITE: '1', MYHARMONY_ALLOW_DELETE: '1' };
  assert.throws(() => assertCallAllowed('AddRemoteToAccount', all), ServiceRefusal);
  assert.throws(() => assertCallAllowed('UpdateMyData', all), ServiceRefusal);
  assert.throws(() => assertCallAllowed('CommandList', all), ServiceRefusal);
  assert.doesNotThrow(() => assertCallAllowed('GetDevicesInAccount', {}));
  assert.doesNotThrow(() => assertCallAllowed('SearchGlobalDevices', {}));
});

test('the search match is the one carrying the archive\'s device id, and anything else refuses', () => {
  const near = { Id: { Value: 512421 }, DeviceModel: 'AVR-X4800H' };
  const right = { Id: { Value: 512420 }, DeviceModel: 'AVR-X4800H' };
  assert.equal(pickMatch([near, right], DENON), right);
  assert.throws(() => pickMatch([near], DENON), HarvestRefusal);
  assert.throws(() => pickMatch([right, { ...right }], DENON), HarvestRefusal);
});

test('every contract object opens with its type marker, which their deserialiser requires', () => {
  const operation = addDeviceOperation({ Id: { Value: 512420 } }, DENON, 7, 'guid');
  assert.equal(Object.keys(operation)[0], '__type');
  assert.equal(Object.keys(operation['Match'] as object)[0], '__type');
  assert.equal(operation['DeviceName'], 'Denon AVR-X4800H');
  const bag = operationBag(7, [operation])['operation'] as Record<string, unknown>;
  assert.equal(Object.keys(bag)[0], '__type');
  assert.deepEqual((bag['ParentAccount'] as { Value: number }).Value, 7);
});

test('the compile status is read off the raw answer, which is not JSON when it is done', () => {
  const done = new TextEncoder().encode("<Result status='Successful' length='12'/>PK\u0003\u0004...");
  assert.equal(compileStatus(done), 'Successful');
  assert.equal(compileStatus(new TextEncoder().encode("<Result status='Compiling'/>")), 'Compiling');
  assert.equal(compileStatus(new TextEncoder().encode('{"d":null}')), undefined);
});

test('the ZIP reader returns a stored and a deflated file byte for byte', () => {
  const files: [string, Uint8Array, number][] = [
    ['Description.xml', new TextEncoder().encode('<d/>'), 0],
    ['Result.EzHex', new TextEncoder().encode('x'.repeat(500)), 8],
  ];
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, data, method] of files) {
    const body = method === 8 ? new Uint8Array(deflateRawSync(data)) : data;
    const nameBytes = new TextEncoder().encode(name);
    const local = new Uint8Array(30 + nameBytes.length + body.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(8, method, true);
    lv.setUint32(18, body.length, true); lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30); local.set(body, 30 + nameBytes.length);
    const entry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(entry.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(10, method, true);
    cv.setUint32(20, body.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true);
    entry.set(nameBytes, 46);
    locals.push(local); central.push(entry); offset += local.length;
  }
  const directory = central.reduce((n, one) => n + one.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, directory, true); ev.setUint32(16, offset, true);
  const zip = new Uint8Array(offset + directory + 22);
  let at = 0;
  for (const part of [...locals, ...central, end]) { zip.set(part, at); at += part.length; }
  const read = readZip(zip);
  assert.deepEqual([...read.keys()], ['Description.xml', 'Result.EzHex']);
  for (const [name, data] of files) assert.deepEqual(read.get(name), data);
  assert.throws(() => readZip(new Uint8Array(40)), HarvestRefusal);
});

test('a failed batch splits into two halves that between them hold every device once', () => {
  const batch = Array.from({ length: 15 }, (_, i) => i);
  const [a, b] = splitBatch(batch);
  assert.equal(a.length, 8);
  assert.equal(b.length, 7);
  assert.deepEqual([...a, ...b], batch);
  assert.deepEqual(splitBatch([1]), [[1], []]);
});
