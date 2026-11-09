/**
 * Which remotes the key reader opens, what it makes of their answers, and a whole session against a
 * pretend remote, all read off the **published** page (`built.ts` says why).
 *
 * **Which remotes**: an allow list of product ids holding arch 8's alone, `0xC110`, and none of the ids
 * this library keeps for remotes that speak something else: the file based family (the Harmony Touch, 300
 * and 350) and the tunnelled one (the 890), from `packages/usb/src/transport.ts`, and the Harmony 525,
 * One and 600, 650 and 700, whose key addresses are not this page's to read. A remote held in its
 * bootloader carries its application's ids, so its product string refuses it before it is opened, and its
 * software type after, in case a bootloader ever names itself differently.
 *
 * **What it makes of the answers**: the version block of a running Harmony 885 as measured,
 * `44 21 49 01 80 11 08` (`tests/harmony_880_885/test_arch8_usb.py`), is an 885 with skin 17, and the page reads the
 * skin from that field because WebHID offers no `bcdDevice`. The reply byte before the fields is not in
 * that record; seven fields make it `0x27` by the rule `decodeReply` reads, the Harmony 525's measured
 * answer, and the 12 field form `0x28` decodes to the same identity, so the page does not depend on which.
 * A data memory read is answered `C2`, the selector and the value.
 *
 * Each refusal has a control, as in `send.test.ts`: disarmed alone, it lets its own example through.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOGITECH_VENDOR, readVersion } from '@harmony/usb';
import { FILE_BASED_PRODUCTS, TUNNELLED_PRODUCTS, encodeVersionBlock } from '@harmony/usb/internal';
import { getVersionRequest, readRamRequest } from '@harmony/usb/protocol';
import { buildKeyReader } from '../bin/build.ts';
import { builtText, linkWithout, publishedLink, refusalOf } from './built.ts';
import { H885_FIELDS, Pretend885, reply } from './pretend.ts';

const link = await publishedLink();

const running885 = { vendorId: 0x046d, productId: 0xc110, productName: 'Harmony Remote 0-4.4.2' };

// ------------------------------------------------------------------------------------------------
// Which remotes are opened.

test('the page opens arch 8 product 0xc110 and nothing else, as Logitech', () => {
  assert.deepEqual([...link.OPENED_PRODUCTS], [[0xc110, 8]]);
  assert.equal(link.LOGITECH, LOGITECH_VENDOR);
  assert.equal(link.checkDevice(running885), 8);
});

test('no product id of the file based or tunnelled families, nor the 525, One, 600, 650 or 700, is opened', () => {
  const others = [...FILE_BASED_PRODUCTS, ...TUNNELLED_PRODUCTS, 0xc111, 0xc121, 0xc122];
  // The Touch and the 350 are the cases the brief names; both ids are in the file based list.
  assert.ok(others.includes(0xc12b) && others.includes(0xc124));
  for (const productId of others) {
    assert.equal(refusalOf(() => link.checkDevice({ ...running885, productId })), 'product', `0x${productId.toString(16)}`);
  }
});

test('a remote in its bootloader is refused by its product string before it is opened', () => {
  assert.equal(refusalOf(() => link.checkDevice({ ...running885, productName: 'Harmony Bootloader' })), 'bootloader');
});

test('a device of another vendor is refused even with an arch 8 product id', () => {
  assert.equal(refusalOf(() => link.checkDevice({ ...running885, vendorId: 0x04d8 })), 'vendor');
});

// ------------------------------------------------------------------------------------------------
// What the answers mean.

test('an 885 version block reads as a Harmony 885 with its key at 0x295 and its last key at 0x3a1', () => {
  for (const header of [0x27, 0x28]) {
    const fields = header === 0x28 ? [...H885_FIELDS, 0, 0, 0, 0, 0] : H885_FIELDS;
    const reading = link.decodeVersionReply(reply(header, ...fields));
    assert.equal(reading.skin, 17);
    assert.equal(reading.architecture, 8);
    assert.equal(reading.softwareType, 0);
    assert.equal(reading.firmware, '4.4');
    assert.deepEqual(link.checkVersion(reading, 8), { name: 'Harmony 885', held: 0x0295, last: 0x03a1 });
  }
});

test('the 880, the 880 Pro and the 720 get their own entries, and the 785 none', () => {
  const place = (skin: number) => link.checkVersion(readVersion(encodeVersionBlock({ architecture: 8, skin })), 8);
  assert.deepEqual(place(15), { name: 'Harmony 880', held: 0x0295, last: 0x03a1 });
  assert.deepEqual(place(39), { name: 'Harmony 880 Pro', held: 0x0295, last: 0x03a1 });
  assert.deepEqual(place(44), { name: 'Harmony 720', held: 0x0296, last: 0x03a1 });
  assert.equal(refusalOf(() => place(45)), 'skin');
});

test('a remote reporting another architecture, or not running its application, is refused', () => {
  const block = (v: Parameters<typeof encodeVersionBlock>[0]) => readVersion(encodeVersionBlock(v));
  assert.equal(refusalOf(() => link.checkVersion(block({ architecture: 14, skin: 17 }), 8)), 'architecture');
  // The bootloader's type 3, measured in both arch 8 bootloaders, and safe mode's 4.
  for (const softwareType of [1, 2, 3, 4]) {
    assert.equal(refusalOf(() => link.checkVersion(block({ architecture: 8, softwareType, skin: 17 }), 8)), 'software-type');
  }
});

test('a data memory reply gives the byte after the echoed selector', () => {
  assert.equal(link.decodeKeyReply(reply(0xc2, 0x07, 0x11, 0x00)), 17);
  assert.equal(link.decodeKeyReply(reply(0xc2, 0x07, 0x00, 0x00)), 0);
  assert.equal(refusalOf(() => link.decodeKeyReply(reply(0xc2, 0x01, 0x11, 0x00))), 'reply');
  assert.equal(refusalOf(() => link.decodeKeyReply(reply(0x27, ...H885_FIELDS))), 'reply');
  assert.equal(refusalOf(() => link.decodeVersionReply(reply(0xc2, 0x07, 0x11, 0x00))), 'version-reply');
});

// ------------------------------------------------------------------------------------------------
// The controls.

const CONTROLS: readonly [string, string, (l: typeof link) => unknown][] = [
  ['vendor', 'another vendor', (l) => l.checkDevice({ ...running885, vendorId: 0x04d8 })],
  ['product', 'a Harmony Touch', (l) => l.checkDevice({ ...running885, productId: 0xc12b })],
  ['bootloader', 'a remote in its bootloader', (l) => l.checkDevice({ ...running885, productName: 'Harmony Bootloader' })],
  // Skin 17 with architecture 14: the skin table alone would have let it through.
  ['architecture', 'an architecture the product did not promise', (l) => l.checkVersion(readVersion(encodeVersionBlock({ architecture: 14, skin: 17 })), 8)],
  ['software-type', 'a remote in its bootloader by its version block', (l) => l.checkVersion(readVersion(encodeVersionBlock({ architecture: 8, softwareType: 3, skin: 17 })), 8)],
  ['skin', 'a Harmony 785', (l) => l.checkVersion(readVersion(encodeVersionBlock({ architecture: 8, skin: 45 })), 8)],
  ['reply', 'a misc reply of another selector', (l) => l.decodeKeyReply(reply(0xc2, 0x01, 0x11, 0x00))],
  ['version-reply', 'a misc reply to a version request', (l) => l.decodeVersionReply(reply(0xc2, 0x07, 0x11, 0x00))],
];

test('every refusal of link.js outside checkReport has a control here', () => {
  // checkReport's own are `send.test.ts`'s. A refusal added without a row would be one nothing shows is needed.
  const source = builtText(buildKeyReader(), 'link.js');
  const outside =
    source.slice(0, source.indexOf('export function checkReport(')) +
    source.slice(source.indexOf('export async function send('));
  const named = [...outside.matchAll(/refuse\('([a-z-]+)',/g)].map((m) => m[1]).sort();
  assert.deepEqual(named, CONTROLS.map(([refusal]) => refusal).sort());
});

for (const [refusal, what, call] of CONTROLS) {
  test(`control: with the ${refusal} refusal disarmed, ${what} is no longer refused`, async () => {
    assert.equal(refusalOf(() => call(link)), refusal, 'the published page refuses it');
    const disarmed = await linkWithout(refusal);
    assert.notEqual(refusalOf(() => call(disarmed)), refusal, 'the page without it does not');
  });
}

// ------------------------------------------------------------------------------------------------
// A whole session against a pretend 885.

test('a session asks the version, then reads only the two key addresses, and lets go', async () => {
  const remote = new Pretend885();
  const open = await link.openLink(remote, 50);
  assert.deepEqual(open.remote, { name: 'Harmony 885', skin: 17, firmware: '4.4', architecture: 8 });
  assert.deepEqual(await open.readKeys(), { held: 0, last: 0 });
  remote.memory.set(0x0295, 11);
  remote.memory.set(0x03a1, 11);
  assert.deepEqual(await open.readKeys(), { held: 11, last: 11 });
  await open.close();
  assert.equal(remote.opened, false);
  assert.deepEqual(
    remote.sent.map((r) => [...r]),
    // The copy before the held byte each time, `link.ts` says why.
    [getVersionRequest(), ...[0x03a1, 0x0295, 0x03a1, 0x0295].map(readRamRequest)].map((r) => [...r]),
  );
});

test('a remote that drops its first commands is asked its version again, up to four times', async () => {
  const remote = new Pretend885();
  remote.silentFor = 3;
  const open = await link.openLink(remote, 20);
  assert.equal(open.remote.skin, 17);
  assert.equal(remote.sent.length, 4);
  await open.close();

  const mute = new Pretend885();
  mute.silentFor = 4;
  await assert.rejects(link.openLink(mute, 20), { name: 'Error', message: /did not answer/ });
  assert.equal(mute.sent.length, link.VERSION_ATTEMPTS);
  assert.equal(mute.opened, false, 'a remote that never answered is let go');
});

test('a 785 is let go after its version, with no key read sent', async () => {
  const remote = new Pretend885();
  remote.version = [0x27, 0x44, 0x21, 0x49, 0x01, 0x80, 45, 0x08];
  await assert.rejects(link.openLink(remote, 50), { name: 'Refused', message: /Harmony 785/ });
  assert.deepEqual(remote.sent.map((r) => r[0]), [0x10]);
  assert.equal(remote.opened, false);
});

test('a bootloader is never opened and is sent nothing', async () => {
  const remote = new Pretend885();
  remote.productName = 'Harmony Bootloader';
  await assert.rejects(link.openLink(remote, 50), { name: 'Refused' });
  assert.equal(remote.opened, false);
  assert.deepEqual(remote.sent, []);
});

test('a key read that goes unanswered ends the link, since a late reply could be taken for the next', async () => {
  const remote = new Pretend885();
  const open = await link.openLink(remote, 20);
  remote.silentFor = 1;
  await assert.rejects(open.readKeys(), { message: /did not answer/ });
  const sentBefore = remote.sent.length;
  await assert.rejects(open.readKeys(), { message: /did not answer/ });
  assert.equal(remote.sent.length, sentBefore, 'nothing more is sent');
  await open.close();
});
