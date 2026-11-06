/**
 * The key reader sends two shapes of report and nothing else, and only one function sends at all.
 *
 * Two halves, both read off the **published** page (`built.ts` says why):
 *
 *   * **Who sends.** The built JavaScript is read as text, every file of it, and the device's send method
 *     may be named exactly once, inside `send` in `link.js`; the feature report method not at all; no
 *     string may spell part of a report method's name, which is how a second caller would reach one by
 *     name; and nothing may reach the network, which is what the page promises its reader.
 *   * **What is sent.** `checkReport`, which `send` calls before the device is touched, is run over every
 *     first byte, every selector, every address, every padding position and every length around the two
 *     shapes, and passes exactly the bare version request and the data memory read at the connected
 *     model's key addresses; and each report that passes is the library's own builder output, byte for byte.
 *
 * **Every refusal has a control**: the same check run against the page with that one refusal disarmed,
 * which has to let the refused report through. A refusal whose control fails is one that some other check
 * was doing the work of, and its test was testing nothing.
 *
 * Why these refusals, from the protocol: on arch 14 (Harmony 600, 650 and 700) a version request with a
 * payload selects commands that write data memory and program memory, `isReadOnlyReport` and
 * `reference/usb-protocol/commands.md`; `WRITE_MISC` selector 7 writes one byte of data memory with no bound
 * on arch 8 (Harmony 880 and 885), `reference/architectures/harmony-880-885/usb.md`; and data memory on
 * these processors includes registers that act when read, such as `0xFEE`, which moves an indirect
 * pointer, so a read is not harmless at any address.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getVersionRequest, readRamRequest } from '@harmony/usb/protocol';
import { baseName, buildKeyReader, publishedName } from '../bin/build.ts';
import { appendTo, builtText, linkWithout, publishedLink, refusalOf } from './built.ts';
import type { WebHidDevice } from '../src/webhid.ts';

const link = await publishedLink();

/** The 885's two key addresses, the set `openLink` gives `send` once the remote has said it is an 885. */
const KEY = new Set([0x0295, 0x03a1]);

function report(...head: number[]): Uint8Array {
  const bytes = new Uint8Array(64);
  bytes.set(head);
  return bytes;
}

// ------------------------------------------------------------------------------------------------
// Who sends.

/** Where `send`'s body starts and ends in `link.js`, by matching its braces. */
function sendBody(text: string): [number, number] {
  const at = text.indexOf('export async function send(');
  assert.ok(at >= 0, 'link.js defines send');
  const open = text.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') depth -= 1;
    if (depth === 0) return [open, i];
  }
  throw new Error('send never closes');
}

/** Every way the published page could send other than through `send`, or reach the network. */
function problems(files: ReadonlyMap<string, string>): string[] {
  const found: string[] = [];
  let sends = 0;
  // Reported by base name, `link.js`, since the stamp in a published name changes with every build.
  for (const [published, text] of files) {
    const name = baseName(published);
    if (name === 'index.html') {
      // The page's one script, from beside it, and nothing fetched from anywhere else.
      if (text.includes('://')) found.push('index.html names an address elsewhere');
      const scripts = [...text.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
      const entry = `<script type="module" src="${publishedName(files, 'page.js')}">`;
      if (scripts.join() !== entry) found.push(`index.html scripts: ${scripts.join(' ')}`);
      continue;
    }
    for (const m of text.matchAll(/\bsendReport\b/g)) {
      sends += 1;
      const [start, end] = name === 'link.js' ? sendBody(text) : [-1, -1];
      if (m.index < start || m.index > end) found.push(`${name}: the send method named outside send`);
    }
    if (/sendFeatureReport/.test(text)) found.push(`${name}: the feature report method`);
    for (const m of text.matchAll(/(['"`])[^'"`\n]*Report[^'"`\n]*\1/g)) {
      found.push(`${name}: a string naming a report method, ${m[0]}`);
    }
    for (const m of text.matchAll(/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b|:\/\//g)) {
      found.push(`${name}: reaches the network, ${m[0]}`);
    }
  }
  if (sends !== 1) found.push(`the send method is named ${sends} times, not once`);
  return found;
}

test('only send names the device send method, nothing names the feature report one, and nothing reaches the network', () => {
  assert.deepEqual(problems(buildKeyReader()), []);
});

test('control: a second caller of the send method is found, in any file', () => {
  const files = buildKeyReader();
  appendTo(files, 'page.js', '\nexport const sneak = (d, r) => d.sendReport(0, r);\n');
  assert.deepEqual(problems(files), [
    'page.js: the send method named outside send',
    'the send method is named 2 times, not once',
  ]);
});

test('control: a call inside link.js but outside send is found', () => {
  const files = buildKeyReader();
  appendTo(files, 'link.js', '\nexport const sneak = (d, r) => d.sendReport(0, r);\n');
  assert.deepEqual(problems(files), [
    'link.js: the send method named outside send',
    'the send method is named 2 times, not once',
  ]);
});

test('control: the feature report method, a method reached by a built name, and a fetch are found', () => {
  const files = buildKeyReader();
  appendTo(files, 'presses.js', '\nexport const a = (d) => d.sendFeatureReport(0, []);\n');
  appendTo(files, 'keys.js', "\nexport const b = (d) => d['send' + 'Report'](0, []);\n");
  appendTo(files, 'models.js', "\nexport const c = () => fetch('https://example.org');\n");
  assert.deepEqual(problems(files), [
    "keys.js: a string naming a report method, 'Report'",
    'models.js: reaches the network, fetch',
    'models.js: reaches the network, ://',
    'presses.js: the feature report method',
  ]);
});

test('control: a removed send, a second script and an outside address in the page are found', () => {
  const files = buildKeyReader();
  files.set(publishedName(files, 'link.js'), builtText(files, 'link.js').replace('device.sendReport(', 'device.nothing('));
  files.set(
    'index.html',
    (files.get('index.html') as string).replace('</body>', '<script src="https://example.org/x.js"></script></body>'),
  );
  assert.deepEqual(problems(files), [
    'index.html names an address elsewhere',
    `index.html scripts: <script type="module" src="${publishedName(files, 'page.js')}"> <script src="https://example.org/x.js">`,
    'the send method is named 0 times, not once',
  ]);
});

// ------------------------------------------------------------------------------------------------
// What is sent.

/** Whether `checkReport` passes a report, with the 885's key addresses. */
function passes(bytes: unknown, addresses: ReadonlySet<number> = KEY): boolean {
  return refusalOf(() => link.checkReport(bytes, addresses)) === undefined;
}

test('of every first byte with nothing after it, only the version request passes', () => {
  const passed = [];
  for (let first = 0; first <= 0xff; first += 1) if (passes(report(first))) passed.push(first);
  assert.deepEqual(passed, [0x10]);
});

test('of every first byte before selector 7 and a key address, only the data memory read passes', () => {
  const passed = [];
  for (let first = 0; first <= 0xff; first += 1) if (passes(report(first, 0x07, 0x02, 0x95))) passed.push(first);
  assert.deepEqual(passed, [0xb3]);
});

test('of every read selector, only 7 passes', () => {
  const passed = [];
  for (let selector = 0; selector <= 0xff; selector += 1) if (passes(report(0xb3, selector, 0x02, 0x95))) passed.push(selector);
  assert.deepEqual(passed, [0x07]);
});

test('of every data memory address, only the model key addresses pass', () => {
  const passed = [];
  for (let address = 0; address <= 0xffff; address += 1) {
    if (passes(report(0xb3, 0x07, address >> 8, address & 0xff))) passed.push(address);
  }
  assert.deepEqual(passed, [0x0295, 0x03a1]);
});

test('before the remote has said what it is, the version request is all that passes', () => {
  const none = new Set<number>();
  assert.equal(passes(report(0x10), none), true);
  assert.equal(passes(report(0xb3, 0x07, 0x02, 0x95), none), false);
  assert.equal(passes(report(0xb3, 0x07, 0x03, 0xa1), none), false);
});

test('a nonzero byte anywhere after either shape is refused', () => {
  for (let at = 1; at < 64; at += 1) {
    const version = report(0x10);
    version[at] = 0xff;
    assert.equal(passes(version), false, `version request, byte ${at}`);
  }
  for (let at = 4; at < 64; at += 1) {
    const read = report(0xb3, 0x07, 0x02, 0x95);
    read[at] = 0xff;
    assert.equal(passes(read), false, `data memory read, byte ${at}`);
  }
});

test('of every length from 0 to 128, only 64 passes', () => {
  for (let length = 0; length <= 128; length += 1) {
    for (const head of [[0x10], [0xb3, 0x07, 0x02, 0x95]]) {
      const bytes = new Uint8Array(length);
      bytes.set(head.slice(0, length));
      assert.equal(passes(bytes), length === 64, `${length} bytes starting ${head[0]}`);
    }
  }
});

test('anything that is not a Uint8Array is refused, however right its contents', () => {
  for (const bytes of [
    Array.from(getVersionRequest()),
    new DataView(getVersionRequest().buffer),
    getVersionRequest().buffer,
    new Uint16Array(64),
    Uint8ClampedArray.from(getVersionRequest()),
    '\u0010',
    undefined,
  ]) {
    assert.equal(refusalOf(() => link.checkReport(bytes, KEY)), 'not-bytes');
  }
});

test('every report that passes is the library builder output, byte for byte', () => {
  assert.deepEqual(link.checkReport(getVersionRequest(), KEY), { kind: 'version' });
  for (const address of KEY) {
    assert.deepEqual(link.checkReport(readRamRequest(address), KEY), { kind: 'key-read', address });
  }
  // And the converse over everything the tests above let through: the version request and the two reads,
  // and nothing else, are what the builders make.
  assert.deepEqual([...getVersionRequest()], [...report(0x10)]);
  assert.deepEqual([...readRamRequest(0x0295)], [...report(0xb3, 0x07, 0x02, 0x95)]);
  assert.deepEqual([...readRamRequest(0x03a1)], [...report(0xb3, 0x07, 0x03, 0xa1)]);
});

/** A device that records what reaches it and answers nothing. */
function recorder(): { device: WebHidDevice; sent: [number, Uint8Array][] } {
  const sent: [number, Uint8Array][] = [];
  const device = {
    vendorId: 0x046d,
    productId: 0xc110,
    productName: 'Harmony Remote 0-4.4.2',
    opened: true,
    open: async () => undefined,
    close: async () => undefined,
    sendReport: async (id: number, data: Uint8Array) => {
      sent.push([id, data.slice()]);
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  return { device, sent };
}

test('send puts a passing report on the cable unchanged, under report id 0', async () => {
  const { device, sent } = recorder();
  for (const bytes of [getVersionRequest(), readRamRequest(0x0295), readRamRequest(0x03a1)]) {
    await link.send(device, bytes, KEY);
  }
  assert.deepEqual(
    sent.map(([id, data]) => [id, [...data]]),
    [getVersionRequest(), readRamRequest(0x0295), readRamRequest(0x03a1)].map((r) => [0, [...r]]),
  );
});

test('send refuses before the device is touched', async () => {
  const { device, sent } = recorder();
  for (const bytes of [
    report(0x13, 0xb2, 0x00, 0x01),
    report(0xa3, 0x07, 0x02, 0x95),
    report(0xd3, 0x00, 0x02, 0x00),
    report(0xe1, 0x02),
    report(0xb3, 0x07, 0x0f, 0xee),
    new Uint8Array(0),
  ]) {
    await assert.rejects(link.send(device, bytes, KEY), { name: 'Refused' });
  }
  assert.deepEqual(sent, []);
});

// ------------------------------------------------------------------------------------------------
// The controls: each refusal disarmed alone lets its own example through.

/** Each refusal of `checkReport`, a report only it refuses, and what that report would be on a remote. */
const ONLY_THIS_REFUSES: readonly [string, unknown, string][] = [
  ['not-bytes', Array.from(getVersionRequest()), 'a plain array, which WebHID would not send as given'],
  ['length', Uint8Array.of(0xb3, 0x07, 0x02, 0x95), 'a short report'],
  ['version-payload', report(0x10, 0xb2, 0x00, 0x01), 'a version request with bytes after it'],
  ['command', report(0xa3, 0x07, 0x02, 0x95), 'WRITE_MISC selector 7: a write of data memory'],
  ['selector', report(0xb3, 0x01, 0x02, 0x95), 'READ_MISC selector 1, a state variable'],
  ['address', report(0xb3, 0x07, 0x0f, 0xee), 'data memory 0xFEE, a register that moves a pointer when read'],
  ['padding', report(0xb3, 0x07, 0x02, 0x95, 0xff), 'a key read with a byte after the address'],
];

for (const [refusal, bytes, what] of ONLY_THIS_REFUSES) {
  test(`control: with the ${refusal} refusal disarmed, ${what} gets through`, async () => {
    assert.equal(refusalOf(() => link.checkReport(bytes, KEY)), refusal, 'the published page refuses it');
    const disarmed = await linkWithout(refusal);
    assert.equal(refusalOf(() => disarmed.checkReport(bytes, KEY)), undefined, 'the page without it passes it');
  });
}

test('every refusal of checkReport has a control', () => {
  // A refusal added to `checkReport` without a row above would be a refusal nothing shows is needed.
  const source = builtText(buildKeyReader(), 'link.js');
  const body = source.slice(source.indexOf('export function checkReport('), source.indexOf('export async function send('));
  const named = [...body.matchAll(/refuse\('([a-z-]+)',/g)].map((m) => m[1]);
  assert.deepEqual(named, ONLY_THIS_REFUSES.map(([refusal]) => refusal));
});
