/**
 * The command layer, against a scripted remote rather than a real one.
 *
 * The fake is not a stub that returns what the code wants. It behaves the way the firmware is
 * documented to behave, and specifically it is **asynchronous**: a request does not produce a
 * reply on the same turn, so a host that assumes one fails here rather than on the bench. That is
 * the property most likely to be got wrong, because it works by accident on a fast machine.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ERASE_FLASH,
  FLASH_DATA,
  HarmonyRemote,
  MISC_RAM,
  READ_FLASH,
  RemoteError,
  decodeReply,
  isHarmony,
  skinId,
  transportOver,
  type Transport,
} from '../src/index.ts';

/**
 * A remote that answers from a script, after `latency` polls of silence.
 *
 * Recording the requests is half the value: the tests below assert what went onto the wire, which
 * is the only thing a real remote will ever see.
 */
function scriptedRemote(replies: Uint8Array[], latency = 1) {
  const written: Uint8Array[] = [];
  const queue = [...replies];
  let silence = 0;
  const transport: Transport = {
    async write(report) {
      written.push(new Uint8Array(report));
      silence = latency;
    },
    async read() {
      if (silence > 0) {
        silence -= 1;
        return undefined;
      }
      return queue.shift();
    },
    async close() {},
  };
  return { transport, written, queue };
}

function report(...bytes: number[]): Uint8Array {
  const out = new Uint8Array(64);
  out.set(bytes);
  return out;
}

test('a reply that arrives after a silent poll is still received', () => {
  // The firmware parses a command, sets a state, and returns; the main loop acts on it later. So
  // the first read after a write is expected to come back empty.
  const { transport } = scriptedRemote([report(0xc2, MISC_RAM, 0x2a)], 2);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 4 });
  return remote.readRam(0x0ec9).then((value) => assert.equal(value, 0x2a));
});

test('a remote that never answers produces an error naming the command', async () => {
  const { transport } = scriptedRemote([], 99);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 2 });
  await assert.rejects(() => remote.readRam(0x0ec9), /no reply to command 0xb3/);
});

test('a RAM read sends selector 0x07 and checks the echo', async () => {
  const { transport, written } = scriptedRemote([report(0xc2, MISC_RAM, 0x5a)], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  assert.equal(await remote.readRam(0x0ec9), 0x5a);
  assert.deepEqual([...(written[0] as Uint8Array).subarray(0, 4)], [0xb3, 0x07, 0x0e, 0xc9]);
});

test('a RAM read that echoes a different selector is an error, not a value', async () => {
  // The echo is the only thing distinguishing the byte asked for from a byte the firmware felt
  // like sending, and accepting the wrong one would look exactly like a successful read.
  const { transport } = scriptedRemote([report(0xc2, 0x06, 0x5a)], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  await assert.rejects(() => remote.readRam(0x0ec9), /echoed selector 0x6/);
});

test('a version block is twelve bytes', async () => {
  const fields = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const { transport } = scriptedRemote([report(0x28, ...fields)], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  assert.deepEqual([...(await remote.getVersion())], fields);
});

/**
 * A `READ_FLASH` data chunk as the remote actually sends it: `0x6A`, then a sequence byte, then 62
 * bytes of data.
 *
 * **Measured, and it replaced a guess.** This was `0x0A` with no sequence byte, chosen because the
 * code was unestablished, and before that `0xFA`, which was worse: `0xFA & 0xF0` is `0xF0`, so it
 * decoded as an acknowledgement. Both are the same lesson. A test written against an unknown is
 * asserting the author's expectation, and the only way out of that is to ask the device.
 */
function flashChunk(sequence: number, data: number[]): Uint8Array {
  const nibble = data.length + 1 === 63 ? 0xa : data.length + 1;
  return report(FLASH_DATA | nibble, sequence, ...data);
}

/** The end of a flash read: nibble 0, and the command byte follows it regardless. */
const FLASH_DONE = report(0xf0, READ_FLASH);

test('a flash read assembles its chunks and stops at the count asked for', async () => {
  // The remote sends 63 byte chunks. The last one overshoots the request, and the extra bytes are
  // dropped rather than returned: a caller asking for 100 bytes and getting 126 would write 26
  // bytes of somebody else's data into whatever it was filling.
  const first = flashChunk(0x01, new Array(62).fill(0xaa));
  const second = flashChunk(0x12, new Array(62).fill(0xbb));
  const { transport, written } = scriptedRemote([first, second], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  const data = await remote.readFlash(0x030000, 100);
  assert.equal(data.length, 100);
  assert.equal(data[61], 0xaa);
  assert.equal(data[62], 0xbb, 'the second chunk continues where the first stopped');
  assert.deepEqual([...(written[0] as Uint8Array).subarray(0, 6)], [0x55, 0x03, 0x00, 0x00, 0x00, 0x64]);
});

test('a flash read that comes up short says so instead of returning zeros', async () => {
  // A short read padded with zeros is the worst outcome available: it parses, it verifies nothing,
  // and it looks like a config.
  const { transport } = scriptedRemote([flashChunk(0x01, new Array(62).fill(0xaa))], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 2 });
  await assert.rejects(() => remote.readFlash(0x030000, 200), /returned 62 of 200 bytes/);
});

test('a flash read ends cleanly when the remote acknowledges instead of sending more', async () => {
  const { transport } = scriptedRemote([FLASH_DONE], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 2 });
  await assert.rejects(() => remote.readFlash(0x030000, 63), /returned 0 of 63 bytes/);
});

test('a flash read of a region the firmware rejects never reaches the wire', async () => {
  // Refused here rather than sent and ignored, so the error says what is wrong rather than
  // "no reply".
  const { transport, written } = scriptedRemote([], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  await assert.rejects(() => remote.readFlash(0x200000, 16), /rejects 0x20/);
  assert.equal(written.length, 0, 'nothing was written');
});

test('an internal memory read is bounded to the window the firmware bounds it to', async () => {
  // The validator clamps the 16-bit offset to 0xFFC0, which is 0x10000 minus a full report. Asking
  // for more would be silently clamped by the device, so it is refused here where it can be seen.
  const { transport } = scriptedRemote([flashChunk(0x01, new Array(62).fill(0x11))], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 2 });
  await assert.rejects(
    () => remote.readInternalMemory(0xfe, 0xffc1, 8),
    /outside the 0x0000\.\.0xFFC0 window/,
  );
});

test('an internal memory read puts the sub-selector in the top address byte', async () => {
  const { transport, written } = scriptedRemote([flashChunk(0x01, new Array(62).fill(0x11))], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  await remote.readFlash(0xfe0000, 8).catch(() => undefined);
  assert.deepEqual([...(written[0] as Uint8Array).subarray(0, 4)], [0x55, 0xfe, 0x00, 0x00]);
});

test('every write method refuses before it touches the transport', async () => {
  // The order matters. A rail checked after the request is written is not a rail.
  const { transport, written } = scriptedRemote([], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  const permission = {
    architecture: 12,
    configLength: 0x1000,
    originalDumpVerified: true,
    intendedVersionMatches: true,
    targetIsTheSpareRemote: true,
  };
  await assert.rejects(() => remote.writeFlash(permission, 0x040000, new Uint8Array(4)));
  await assert.rejects(() => remote.eraseFlash(permission, 0x040000));
  await assert.rejects(() => remote.writeRam(permission, 0x0ec9, 0x01));
  assert.equal(written.length, 0, 'a read only build wrote something to the device');
});

test('an erase request is never built for an address outside the region', async () => {
  const { transport, written } = scriptedRemote([report(0xf0, ERASE_FLASH)], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  await assert.rejects(() =>
    remote.eraseFlash(
      {
        architecture: 12,
        configLength: 0x1000,
        originalDumpVerified: true,
        intendedVersionMatches: true,
        targetIsTheSpareRemote: true,
      },
      0x020000,
    ),
  );
  assert.equal(written.length, 0);
});

test('the transport adapter reports a short write rather than losing bytes', async () => {
  // node-hid returns how many bytes it wrote. Ignoring that number would turn a truncated command
  // into a command with different arguments, which the device would happily execute.
  const transport = transportOver({
    write: () => 32,
    readTimeout: () => [],
    close: () => {},
  });
  await assert.rejects(() => transport.write(new Uint8Array(64)), /wrote 32 of 64 bytes/);
});

test('the transport adapter passes reports through both ways', async () => {
  const seen: number[][] = [];
  const transport = transportOver({
    write: (data) => {
      seen.push(Array.from(data));
      return Array.from(data).length;
    },
    readTimeout: () => [0xf1, 0xd0],
    close: () => {},
  });
  await transport.write(new Uint8Array([1, 2, 3]));
  assert.deepEqual(seen, [[1, 2, 3]]);
  assert.deepEqual([...((await transport.read(1)) as Uint8Array)], [0xf1, 0xd0]);
});

test('device matching is the Logitech vendor and the Harmony product range', () => {
  assert.ok(isHarmony(0x046d, 0xc110));
  assert.ok(isHarmony(0x046d, 0xc14f));
  assert.ok(!isHarmony(0x046d, 0xc150), 'just past the range');
  assert.ok(!isHarmony(0x046d, 0xc10f), 'just before it');
  assert.ok(!isHarmony(0x045e, 0xc111), 'another vendor');
});

test('the skin id is the low byte of bcdDevice, in BCD', () => {
  // Confirmed against the bench Harmony 600, whose bcdDevice is 0x1071 and whose skin is 71.
  assert.equal(skinId(0x1071), 71);
  assert.equal(skinId(0x1015), 15);
  assert.equal(skinId(0x1022), 22);
});

test('RemoteError is what a caller can catch', () => {
  // Exported deliberately: an application that cannot distinguish a protocol failure from a
  // programming error will report the wrong thing to the person holding the remote.
  assert.ok(new RemoteError('x') instanceof Error);
});

test('a dropped chunk is an error, not a hole in the middle of a config', async () => {
  // The sequence byte advances by 0x11 per chunk, so a missing report is detectable. Unchecked it
  // would be silent corruption inside a config, which recompiles and verifies nothing.
  const { transport } = scriptedRemote(
    [flashChunk(0x01, new Array(62).fill(0xaa)), flashChunk(0x23, new Array(62).fill(0xcc))],
    0,
  );
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 2 });
  await assert.rejects(
    () => remote.readFlash(0x030000, 124),
    /out of sequence: expected 0x12, got 0x23 after 62 bytes/,
  );
});

test('the first chunk has to be sequence 0x01', async () => {
  const { transport } = scriptedRemote([flashChunk(0x12, new Array(62).fill(0xaa))], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 2 });
  await assert.rejects(() => remote.readFlash(0x030000, 62), /expected 0x1, got 0x12/);
});

test('an acknowledgement declares no payload and carries its command anyway', () => {
  // The device's own encoding, measured: `f0 50`, not `f1 50`. Reading the command byte from the
  // declared payload made the real reply decode as an acknowledgement with no command in it.
  const decoded = decodeReply(report(0xf0, READ_FLASH));
  assert.deepEqual(decoded, { kind: 'ack', command: 0x50, commandName: 'READ_FLASH' });
});

test('a flash chunk decodes into its sequence and its data separately', () => {
  const decoded = decodeReply(flashChunk(0x23, [1, 2, 3]));
  assert.equal(decoded.kind, 'flash-data');
  if (decoded.kind !== 'flash-data') return;
  assert.equal(decoded.sequence, 0x23);
  assert.deepEqual([...decoded.data], [1, 2, 3]);
});
