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
  FLASH_CHUNK_DATA,
  FLASH_DATA,
  HarmonyRemote,
  MISC_RAM,
  READ_FLASH,
  RailError,
  RemoteError,
  SOFTWARE_TYPE_SAFE_MODE,
  architectureFromVersion,
  decodeReply,
  FILE_BASED_PRODUCTS,
  HARMONY_PRODUCT_FIRST,
  HARMONY_PRODUCT_LAST,
  isFileBasedRemote,
  isTunnelledRemote,
  TUNNELLED_PRODUCTS,
  isHarmony,
  isMicrochipBootloader,
  MICROCHIP_BOOTLOADER_PRODUCT,
  MICROCHIP_VENDOR,
  nibbleForPayloadLength,
  skinId,
  softwareTypeFromVersion,
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
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 4, architecture: 12 });
  return remote.readRam(0x0ec9).then((value) => assert.equal(value, 0x2a));
});

test('a remote that never answers produces an error naming the command', async () => {
  const { transport } = scriptedRemote([], 99);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 2, architecture: 12 });
  await assert.rejects(() => remote.readRam(0x0ec9), /no reply to command 0xb3/);
});

test('a RAM read sends selector 0x07 and checks the echo', async () => {
  const { transport, written } = scriptedRemote([report(0xc2, MISC_RAM, 0x5a)], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, architecture: 12 });
  assert.equal(await remote.readRam(0x0ec9), 0x5a);
  assert.deepEqual([...(written[0] as Uint8Array).subarray(0, 4)], [0xb3, 0x07, 0x0e, 0xc9]);
});

test('a RAM read that echoes a different selector is an error, not a value', async () => {
  // The echo is the only thing distinguishing the byte asked for from a byte the firmware felt
  // like sending, and accepting the wrong one would look exactly like a successful read.
  const { transport } = scriptedRemote([report(0xc2, 0x06, 0x5a)], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, architecture: 12 });
  await assert.rejects(() => remote.readRam(0x0ec9), /echoed selector 0x6/);
});

test('a Harmony 525 refuses a RAM read rather than returning a cleared zero', async () => {
  // Only selector `0x01` has a body in arch 9's `READ_MISC` executor, section 90, so every other
  // selector emits two bytes the firmware has just cleared: this call would answer **zero** for every
  // address on the device, and a zero is what a real variable holding zero looks like.
  //
  // Section 137 is what that costs. Selector 1 was read as answering zero for a **year**, because the
  // decoder took the byte before the one carrying the value: `decodeReply` says as much on `value`,
  // that on arch 9 the byte after the selector is the high half of a sixteen bit word. `readRam`
  // returned that byte regardless of architecture. Section 139.
  //
  // The transport is scripted with a plausible answer on purpose, so the refusal cannot be mistaken
  // for the device failing to reply.
  const { transport, written } = scriptedRemote([report(0xc2, MISC_RAM, 0x00, 0x5a)], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, architecture: 9 });
  await assert.rejects(() => remote.readRam(0x0ec9), /no READ_MISC body for selector 0x7/);
  // And it refuses before touching the device, which is what makes it a refusal rather than a filter.
  assert.deepEqual(written, []);
});

test('a RAM read still works where the selector has a body', async () => {
  // The control for the refusal above: the same call on the two architectures that answer.
  for (const architecture of [12, 14]) {
    const { transport } = scriptedRemote([report(0xc2, MISC_RAM, 0x5a)], 0);
    const remote = new HarmonyRemote(transport, { timeoutMs: 1, architecture });
    assert.equal(await remote.readRam(0x0ec9), 0x5a, `architecture ${architecture}`);
  }
  // **And with no architecture stated it now refuses**, which is the reverse of what this asserted
  // until section 139. The old claim was that an unpinned caller is the ordinary case and the
  // refusal is about arch 9 (Harmony 525) specifically, and that reasoning has a hole in it: with
  // nothing pinned the arch 9 branch cannot fire at all, so a Harmony 525 read through an unpinned
  // handle got the byte the refusal exists to prevent. Which byte carries the value depends on the
  // architecture, so answering without knowing it is answering from arch 12 (Harmony One)'s rule
  // by default.
  const { transport } = scriptedRemote([report(0xc2, MISC_RAM, 0x5a)], 0);
  const unpinned = new HarmonyRemote(transport, { timeoutMs: 1 });
  await assert.rejects(() => unpinned.readRam(0x0ec9), /architecture is unknown/);
});

test('reading a version block tells the handle which architecture it is talking to', async () => {
  // `useArchitecture` was opt-in and three of the four callers that read a version block did not
  // call it, so `regionOf` kept falling back to arch 12 (Harmony One) while the reply in hand said
  // 9. `getVersion` narrows it now. Section 139.
  const fields = [1, 2, 3, 4, 0x90, 6, 7, 8, 9, 10, 11, 12];
  const { transport } = scriptedRemote([report(0x28, ...fields)], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  await remote.getVersion();
  // Field 4's high nibble is 9, so the arch 9 (Harmony 525) RAM refusal fires where before the
  // handle had no idea and answered from the default.
  await assert.rejects(() => remote.readRam(0x0ec9), /no READ_MISC body for selector 0x7/);
});

test('a pinned architecture survives the remote disagreeing with it', async () => {
  // Narrowing, never overriding: a caller who pinned one keeps it, so a script pinned to the wrong
  // architecture still gets the refusal it asked for rather than a silent correction.
  const fields = [1, 2, 3, 4, 0x90, 6, 7, 8, 9, 10, 11, 12];
  const { transport } = scriptedRemote([report(0x28, ...fields), report(0xc2, MISC_RAM, 0x5a)], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, architecture: 12 });
  await remote.getVersion();
  assert.equal(await remote.readRam(0x0ec9), 0x5a);
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
  const nibble = nibbleForPayloadLength(data.length + 1);
  return report(FLASH_DATA | nibble, sequence, ...data);
}

/** The end of a flash read: nibble 0, and the command byte follows it regardless. */
const FLASH_DONE = report(0xf0, READ_FLASH);

test('a flash read assembles its chunks and encodes its request', async () => {
  // **This used to script a full final chunk and assert the surplus was dropped**, on the comment
  // "the remote sends 63 byte chunks, the last one overshoots the request". The device does not:
  // `docs/usb-protocol.md` records 256 requested and 256 delivered as 62+62+62+62+6+2, measured on
  // hardware, so the final chunk is short and its length nibble says so. The fixture was an
  // assumption written as evidence, contradicted by a measurement already in the repository, and it
  // is what let `Math.min` discard a surplus in silence. Section 139.
  // 62 + 30 + 6 + 2, which is how the device splits 100: the length nibble encodes 0 to 7, 15, 31
  // and 63 payload bytes and nothing else, so a remainder comes off in those steps. The same shape
  // as the 256 the protocol document records as 62+62+62+62+6+2.
  const first = flashChunk(0x01, new Array(62).fill(0xaa));
  const second = flashChunk(0x12, new Array(30).fill(0xbb));
  const third = flashChunk(0x23, new Array(6).fill(0xcc));
  const fourth = flashChunk(0x34, new Array(2).fill(0xdd));
  const { transport, written } = scriptedRemote([first, second, third, fourth, FLASH_DONE], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  const data = await remote.readFlash(0x030000, 100);
  assert.equal(data.length, 100);
  assert.equal(data[61], 0xaa);
  assert.equal(data[62], 0xbb, 'the second chunk continues where the first stopped');
  assert.equal(data[92], 0xcc);
  assert.equal(data[99], 0xdd, 'and the last chunk lands on the final byte');
  assert.deepEqual([...(written[0] as Uint8Array).subarray(0, 6)], [0x55, 0x03, 0x00, 0x00, 0x00, 0x64]);
});

test('a chunk carrying more than was asked for is an error, not a truncation', async () => {
  // The other direction of the pipe hygiene the completion check guards: surplus bytes are evidence
  // that the request and the reply disagree about the length, and `Math.min` threw that evidence
  // away while reporting a clean transfer. Section 139.
  const first = flashChunk(0x01, new Array(62).fill(0xaa));
  const second = flashChunk(0x12, new Array(62).fill(0xbb));
  const { transport } = scriptedRemote([first, second, FLASH_DONE], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  await assert.rejects(() => remote.readFlash(0x030000, 100), /disagree about the length/);
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
  await assert.rejects(() => remote.readFlash(0x400000, 16), /rejects 0x40/);
  assert.equal(written.length, 0, 'nothing was written');
});

test('the same address is legal on one bench architecture and refused on the other', async () => {
  // Section 88. `0x200000` used to be refused on both, because arch 14's bound had been applied to
  // arch 12 as well; each firmware stops at its own flash size. This is the address that separates
  // them, so it is the one worth a test rather than a constant.
  const one = new HarmonyRemote(scriptedRemote([], 0).transport, { architecture: 12, timeoutMs: 1 });
  const h600 = new HarmonyRemote(scriptedRemote([], 0).transport, { architecture: 14, timeoutMs: 1 });
  // The One gets as far as the wire and then times out, which is what "not refused" looks like
  // against a transport with nothing scripted on it.
  await assert.rejects(() => one.readFlash(0x200000, 16), (error: Error) => {
    assert.doesNotMatch(error.message, /rejects 0x20/, 'arch 12 must not refuse this address');
    return true;
  });
  await assert.rejects(() => h600.readFlash(0x200000, 16), /rejects 0x20/);
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

test('an erase request reaches the device on no path at all with writes disabled', async () => {
  // **Renamed on 13 August 2026, and the old title named a rule this test cannot reach.** It was
  // called `an erase request is never built for an address outside the region` and passed an address
  // outside it, but with `WRITES_ENABLED` false the flag is what refuses and the address is never
  // examined, so it would have passed just as well with an address inside the region. The address
  // rule is `rails.test.ts`, which runs each remaining condition in a subprocess with the flag on.
  //
  // What this does carry is worth keeping and is the stronger claim for a read only build: the call
  // is refused, the refusal is a `RailError` rather than something incidental, and nothing was
  // written to the transport.
  const { transport, written } = scriptedRemote([report(0xf0, ERASE_FLASH)], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  await assert.rejects(
    () =>
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
    (error: unknown) => error instanceof RailError,
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

test('a bootloader is Microchip, and asking that question never widens what can be opened', () => {
  // Section 189. Both bench bootloaders present 04D8:000B, so a remote held in recovery is not a
  // Harmony by vendor id and used to enumerate as nothing at all.
  assert.ok(isMicrochipBootloader(0x04d8, 0x000b));
  assert.ok(!isMicrochipBootloader(0x04d8, 0x000c), 'a neighbouring product');
  assert.ok(!isMicrochipBootloader(0x046d, 0x000b), 'Logitech is not Microchip');

  // The assertion that carries the safety, in both directions. A bootloader must not satisfy the
  // predicate that gates openHarmony, because it speaks a different protocol entirely, and a
  // Harmony must not satisfy the bootloader one. The two questions stay disjoint.
  assert.ok(!isHarmony(MICROCHIP_VENDOR, MICROCHIP_BOOTLOADER_PRODUCT), 'openHarmony cannot claim it');
  assert.ok(!isMicrochipBootloader(0x046d, 0xc121), 'a booted Harmony One is not a bootloader');
  for (let product = HARMONY_PRODUCT_FIRST; product <= HARMONY_PRODUCT_LAST; product += 1) {
    assert.ok(
      !isMicrochipBootloader(0x046d, product),
      `no Harmony product id may read as a bootloader, and 0x${product.toString(16)} does`,
    );
  }
});

test('two families sit inside the Harmony range and openHarmony refuses both', () => {
  // Found on 27 August 2026 with a Harmony Touch and a Harmony 350 on the bench, before either had
  // been opened. `isHarmony` was a plain range and both of them sit inside it, so this library would
  // have claimed a Touch and started sending it a command layer its family does not implement.
  //
  // The range membership is asserted first, because that is the whole point: an exclusion that only
  // said "not a Harmony" would look redundant next to the range and get deleted by a tidy-up.
  for (const product of FILE_BASED_PRODUCTS) {
    assert.ok(
      product >= HARMONY_PRODUCT_FIRST && product <= HARMONY_PRODUCT_LAST,
      `0x${product.toString(16)} is inside the Harmony range, which is why the exclusion is needed`,
    );
    assert.ok(isFileBasedRemote(0x046d, product), `0x${product.toString(16)} is file based`);
    assert.ok(!isHarmony(0x046d, product), `openHarmony must refuse 0x${product.toString(16)}`);
  }

  // The two measured on the bench, named so the count cannot quietly shrink past them.
  assert.ok(isFileBasedRemote(0x046d, 0xc12b), 'the Harmony Touch');
  assert.ok(isFileBasedRemote(0x046d, 0xc124), 'the Harmony 350, on the id concordance calls a 300');
  assert.equal(FILE_BASED_PRODUCTS.length, 5);

  // The three predicates partition the range: every id in it is claimed by exactly one.
  for (let product = HARMONY_PRODUCT_FIRST; product <= HARMONY_PRODUCT_LAST; product += 1) {
    const claims = [isHarmony, isFileBasedRemote, isTunnelledRemote].filter((p) =>
      p(0x046d, product),
    );
    assert.equal(claims.length, 1, `0x${product.toString(16)} must be exactly one of the three`);
  }

  // **This block asserted the opposite until section 207, and the claim in its title was the wrong
  // one.** It said 0xC112 to 0xC115 stays a Harmony because excluding it would make a Harmony 890
  // unopenable, arch 10 being an architecture this project reads. A Harmony 890 was never openable
  // here: it does not speak this command protocol, its configs came through concordance, which
  // implements the tunnel, and Logitech's own client hands the same ids to a different driver
  // entirely. So the exclusion is not "refusing anything unfamiliar", it is the same rule the old
  // comment stated, applied now that we can check it.
  for (let product = 0xc112; product <= 0xc115; product += 1) {
    assert.ok(!isHarmony(0x046d, product), `0x${product.toString(16)} is tunnelled, not this protocol`);
    assert.ok(isTunnelledRemote(0x046d, product), 'and it is reported rather than made invisible');
    assert.ok(!isFileBasedRemote(0x046d, product), 'and it is not the file based family either');
  }

  // The Harmony 1000 family is one further out and is in the same set: a third transport again, and
  // concordance refuses it outright rather than routing it anywhere.
  assert.ok(isTunnelledRemote(0x046d, 0xc11f), 'Cognac');
  assert.ok(!isHarmony(0x046d, 0xc11f));

  // The bench remotes are unaffected, which is the control that the exclusion did not go too far.
  assert.ok(isHarmony(0x046d, 0xc121), 'the Harmony One');
  assert.ok(isHarmony(0x046d, 0xc122), 'the Harmony 600 and 700');
  assert.ok(isHarmony(0x046d, 0xc111), 'Mocha, the Harmony 525');
  assert.ok(isHarmony(0x046d, 0xc110), 'Espresso, the Harmony 880 and 885');
  assert.equal(TUNNELLED_PRODUCTS.length, 5);

  // A Logitech mouse is still not a Harmony, and neither predicate answers for another vendor.
  assert.ok(!isFileBasedRemote(0x1234, 0xc124), 'the vendor is part of the question');
  assert.ok(!isHarmony(0x046d, 0xc0ff), 'below the range');
});

test('the skin comes out of bcdDevice, and its encoding is per firmware generation', () => {
  // Seven pairs, each an image's bcdDevice against the `<SKIN>` a config of that model states.
  // The Python side asserts the same table from the files themselves, in `tests/test_usbdesc.py`;
  // this one pins the arithmetic so the two implementations cannot drift.
  //
  // The two cases that used to be here, 0x1015 and 0x1022, were invented rather than measured, and
  // they were wrong: an 880 is 0x080F and a 525 is 0x0916, neither of them 0x10 anything. Inventing
  // a fixture is how a wrong rule gets a passing test.
  //
  // Ten words now, section 195, and the title changed with the tenth: on this generation the whole
  // word is BCD of 1000 plus the skin, so the low byte alone is only the reading for a skin under
  // 100. The high byte is the carry, which is why it looked like a constant on nine of the ten.
  assert.equal(skinId(0x080f), 15, 'Harmony 880, protocol 8');
  assert.equal(skinId(0x0811), 17, 'Harmony 885, protocol 8');
  assert.equal(skinId(0x0916), 22, 'Harmony 525, protocol 9');
  assert.equal(skinId(0x1054), 54, 'Harmony One, protocol 12');
  assert.equal(skinId(0x1066), 66, 'Harmony 700, protocol 14');
  assert.equal(skinId(0x1071), 71, 'Harmony 600, measured on the bench remote');
  assert.equal(skinId(0x1072), 72, 'Harmony 650, protocol 14');
  // Two more read off the bus on 27 August 2026, which is the first time this table grew from a
  // remote rather than from an image. Neither has firmware or a config here, so the closure is a
  // different one: Logitech's own product table names skin 78 a Harmony 300 and skin 99 a Harmony
  // Touch, and those are the two units that were plugged in.
  assert.equal(skinId(0x1078), 78, 'Harmony 300');
  assert.equal(skinId(0x1099), 99, 'Harmony Touch');

  // The tenth, and the only one of them that is not the same under both readings.
  assert.equal(skinId(0x1104), 104, 'Harmony 350, whose own /sys/sysinfo states skin 104');
});

test('an unreadable bcdDevice is undefined rather than a plausible wrong model', () => {
  // The 885 is what separates the two rules: 0x0F is 15 either way and 0x11 is 17 or 11, and
  // Logitech's model list has a Harmony 655 at 11. So a single formula names the wrong remote
  // without failing, which is why an unknown high byte returns nothing at all.
  assert.equal(skinId(0x0a13), undefined, '0x0A is the arch 10 prediction, with nothing to check');
  assert.equal(skinId(0x0000), undefined, 'the Microchip stock descriptor in the 525 image');
  assert.equal(skinId(0x10af), undefined, 'a nibble above 9 is not a decimal digit, so not BCD');
});

test('a skin of 100 or more carries into the high byte, which is what settled its meaning', () => {
  // Section 195, and this test asserted the opposite for one commit. It required these words to be
  // refused, because the whole word reading had been proposed with a descriptor value computed from
  // it rather than read off a remote, and no other word could separate the two readings.
  //
  // Then the remote was plugged in: a Harmony 350 enumerates 0x1104, and its own /sys/sysinfo says
  // skin 104. So the refusal is gone and the measurement is here, which is the only order these two
  // may arrive in.
  assert.equal(skinId(0x1104), 104, 'Harmony 350, measured');
  assert.equal(skinId(0x1102), 102, 'a Harmony Ultimate One would be this, unmeasured but implied');
  assert.equal(skinId(0x1999), 999, 'and Logitech\'s highest skin, a Harmony Link, still fits');
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

test('a flash read drains the trailing acknowledgement', async () => {
  // The bug this pins cost a confusing half hour on real hardware. Stopping as soon as the byte
  // count was satisfied left `f0 50` queued, and the next command read that first and concluded its
  // own transfer was over. The symptom was a device that looked like it had a size limit: a 32 byte
  // read worked, the next 62 byte read returned nothing, and a 256 byte read returned 124.
  const { transport, queue } = scriptedRemote(
    [
      flashChunk(0x01, new Array(62).fill(0xaa)),
      FLASH_DONE,
      flashChunk(0x01, new Array(62).fill(0xbb)),
      FLASH_DONE,
    ],
    0,
  );
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 2 });
  const first = await remote.readFlash(0x030000, 62);
  assert.equal(first[0], 0xaa);
  assert.equal(queue.length, 2, 'the acknowledgement was consumed, not left behind');
  const second = await remote.readFlash(0x030000, 62);
  assert.equal(second[0], 0xbb, 'the second read got its own data, not the first read\'s leftovers');
});

test('all the bytes but no completion is an error, because the pipe is then dirty', async () => {
  const { transport } = scriptedRemote([flashChunk(0x01, new Array(62).fill(0xaa))], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 2 });
  await assert.rejects(() => remote.readFlash(0x030000, 62), /no completion, so the pipe is dirty/);
});

test('an internal read ending in a one byte chunk is refused, because they restart a remote', async () => {
  // Not a style preference. A 63 byte read of internal program memory made a Harmony One leave the
  // USB bus, five times over once it was reproduced on purpose, watched from both ends. Each time the
  // remote recovered with its config intact, but a read that restarts the device is not a read this
  // project performs by accident.
  const { transport, written } = scriptedRemote([], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  // Every odd count, which is the condition section 94 read out of the loop rather than fitted to
  // the measurements. 65 and 127 are the ones that matter: they are odd and they are not 62n + 1,
  // so the rail section 93 installed would have let them hang a remote.
  for (const count of [1, 63, 65, 125, 127, 187]) {
    await assert.rejects(() => remote.readInternalMemory(0xff, 0, count), /never terminates/);
  }
  assert.equal(written.length, 0, 'and it is refused before anything reaches the device');
});

test('the odd test was arithmetic that is false for a whole class of counts', async () => {
  // The predicate was `count % 2 === 1`, and in JavaScript `-3 % 2` is `-1` and `3.5 % 2` is `1.5`,
  // so a negative odd count and a fractional one both read as even and walked through the rail that
  // exists because an odd internal read never terminates. A rail whose predicate is wrong for a class
  // of inputs is worse than no rail, because every test around it passes.
  //
  // Whether a caller can reach these values is not the argument: this is the refusal that stands
  // between a script and a remote leaving the bus, so it refuses anything it cannot prove terminates.
  const { transport, written } = scriptedRemote([], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  for (const count of [-3, -1, 3.5, 62.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    await assert.rejects(
      () => remote.readInternalMemory(0xff, 0, count),
      /never terminates/,
      `${count} is not a count the fetch loop can reach zero from`,
    );
  }
  assert.equal(written.length, 0, 'and none of them reached the device');
  // The old predicate, spelled out, so the difference is visible rather than asserted about: every
  // one of those counts reads as even under it.
  for (const count of [-3, -1, 3.5, 62.5, Number.NaN]) {
    assert.equal(count % 2 === 1, false, `${count} passes the arithmetic that used to be the rail`);
  }
});

test('an even internal read is allowed, because the loop can reach zero', async () => {
  // The other half, and the one that matters: the refusal used to be `> 62`, which is a bound
  // around the hazard rather than the hazard, and it refused the 64 byte read Logitech's own client
  // uses for a unit GUID. 64 and 124 were repeated on the spare One on 9 August 2026 across both
  // internal pages, with the config verified against its dump afterwards. Section 93.
  //
  // Asserted as "not refused for that reason" rather than as a success, because there is no device
  // here: what this pins is the rule, and the transport then fails for its own reasons.
  const { transport } = scriptedRemote([], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1 });
  for (const count of [2, 62, 64, 124, 128]) {
    await assert.rejects(
      () => remote.readInternalMemory(0xff, 0x1000, count),
      (error: Error) => !/never terminates/.test(error.message),
      `${count} bytes is even and must not be refused`,
    );
  }
});

test('the refusal covers arch 9, where internal memory is at plain low addresses', async () => {
  // The rule lived only in `readInternalMemory`, which builds an address in the `0xFE` window. On
  // arch 9 there is no such window: internal program memory answers at 0x000000, so every caller
  // of `readFlash` could reach it uncapped while the documents said otherwise. Found by writing
  // the document and then checking the code rather than the other way round.
  const { transport, written } = scriptedRemote([], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, architecture: 9 });
  await assert.rejects(() => remote.readFlash(0x000000, 63), /never terminates/);
  assert.equal(written.length, 0, 'refused before anything reaches the device');
  // And the same address on the default rule is ordinary config flash, so the cap must not fire
  // there: an arch 12 remote reads its config from below 0x200000 in chunks much larger than 62.
  const other = new HarmonyRemote(scriptedRemote([], 0).transport, { timeoutMs: 1 });
  await assert.rejects(() => other.readFlash(0x000000, 63), /flash read returned 0 of 63/);
});

test('field 4 decodes into an architecture and a software type, in one place', () => {
  // Section 118, and the values are measurements. The 525 answered 0x90 running normally on
  // 8 August 2026 and 0x94 in safe mode on 11 August, same unit, same field.
  const normal = new Uint8Array([0x30, 0x25, 0x12, 0xff, 0x90, 0x16, 0x09]);
  const safe = new Uint8Array([0x20, 0x25, 0x12, 0xff, 0x94, 0x16, 0x00]);
  assert.equal(architectureFromVersion(normal), 9);
  assert.equal(softwareTypeFromVersion(normal), 0);
  assert.equal(architectureFromVersion(safe), 9);
  assert.equal(softwareTypeFromVersion(safe), SOFTWARE_TYPE_SAFE_MODE);
  // The architecture is the same in both, which is the point: safe mode changes the type nibble
  // and not the hardware, so a tool must not conclude a different remote.
  assert.equal(architectureFromVersion(normal), architectureFromVersion(safe));
});

test('a version block too short to hold field 4 yields undefined rather than zero', () => {
  // Undefined, not 0, because 0 is a real software type meaning the application is running. A
  // truncated reply that reported "application on architecture 0" would be a plausible wrong answer.
  assert.equal(architectureFromVersion(new Uint8Array([0x30, 0x25])), undefined);
  assert.equal(softwareTypeFromVersion(new Uint8Array([])), undefined);
});

test('useArchitecture narrows and never overrides what a caller pinned', async () => {
  // The rail on the fix: adopting the remote's own answer must not let it contradict a caller who
  // deliberately pinned one, since the caller may be testing exactly that refusal. Asserted through
  // readFlash because the region rule has no other entry point, and 0x82 is arch 9's flash window
  // and outside arch 12's whole address space, so the two answers cannot be confused.
  const pinned = new HarmonyRemote(scriptedRemote([], 0).transport, {
    architecture: 12,
    timeoutMs: 1,
  });
  pinned.useArchitecture(9);
  await assert.rejects(() => pinned.readFlash(0x820000, 16), /architecture 12/);

  // With nothing pinned, the remote's own answer is adopted and the read reaches the wire, which is
  // the case that was refused on a real 525 in safe mode before section 118.
  const learned = new HarmonyRemote(scriptedRemote([], 0).transport, { timeoutMs: 1, idlePolls: 1 });
  learned.useArchitecture(9);
  await assert.rejects(() => learned.readFlash(0x820000, 16), /returned 0 of 16 bytes/);
});

test('an internal read may not run off the end of its own page', async () => {
  // The `0xFFC0` offset bound was justified in comment by "an offset plus one report cannot leave
  // the window", which held only while this method was capped at one chunk, and that cap does not
  // exist: section 139 entry 17 found the comment describing it and no code enforcing it. So
  // `readInternalMemory(0xff, 0xffc0, 512)` walked past the end of the 64 KiB page with the
  // library's blessing, and what the device serves there is unread. Section 139.
  const { transport, written } = scriptedRemote([], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 1, architecture: 12 });
  await assert.rejects(() => remote.readInternalMemory(0xff, 0xffc0, 512), /runs past the end/);
  // 0xFFF0 is above the offset bound itself, so that refusal fires first and names the window.
  // Stated rather than folded in, because the two bounds are different rules and a test that
  // matched either would not say which one it exercised.
  await assert.rejects(() => remote.readInternalMemory(0xff, 0xfff0, 32), /outside the 0x0000..0xFFC0 window/);
  // The refusal is on the sum, so the last legal read is the one that lands exactly on the end.
  // It is refused before touching the device, which is what makes it a rail and not a filter.
  assert.deepEqual(written, [], 'nothing reached the wire');
  await assert.rejects(() => remote.readInternalMemory(0xff, 0xffc0, 66), /runs past the end/);
});

test('an internal read that ends exactly on the page boundary is allowed', async () => {
  // The positive control for the bound above: 0xFFC0 plus 62 is 0xFFFE, two bytes short, and the
  // protocol document records that the last two bytes of each page are unreachable for exactly
  // this reason. So the boundary case has to be the one that passes, or the bound is off by a
  // report rather than on the sum.
  const chunk = flashChunk(0x01, new Array(62).fill(0x11));
  const { transport, written } = scriptedRemote([chunk, FLASH_DONE], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, architecture: 12 });
  const data = await remote.readInternalMemory(0xff, 0xffc0, 62);
  assert.equal(data.length, 62);
  assert.equal(written.length, 1);
});

test('the first GET_VERSION of a session is sent twice when the remote says nothing', () => {
  // **Measured on the bench, 23 August 2026, section 155.** A Harmony One idle in USB mode for about
  // forty minutes after a sync by Logitech's own software dropped its first GET_VERSION entirely:
  // three polls of two seconds, no reply, while its screen said "USB Connected". The cable was not
  // touched, the remote was not reconnected, and its clock proved no reboot happened, so the retry
  // alone is what cleared it. Without this a person plugging in a remote sees a hard failure that a
  // second attempt fixes.
  //
  // The transport here answers nothing at all to the first request and the version block to the
  // second, which is exactly what the bench did.
  let seen = 0;
  const written: Uint8Array[] = [];
  const transport: Transport = {
    async write(request) {
      written.push(new Uint8Array(request));
      seen += 1;
    },
    async read() {
      // Silent for the first request, forthcoming for the second.
      return seen < 2 ? undefined : report(0x28, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12);
    },
    async close() {},
  };
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 3 });
  return remote.getVersion().then((fields) => {
    assert.equal(written.length, 2, 'the request went out twice');
    assert.deepEqual(written[0], written[1], 'and the second is the same request, not a variant');
    assert.deepEqual([...fields], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

test('the retry is spent once, so a remote that never speaks still fails', () => {
  // The negative, and it is the one that matters: a retry that repeats forever turns a dead remote
  // into a hang, which is worse than the error it was added to avoid.
  let writes = 0;
  const transport: Transport = {
    async write() { writes += 1; },
    async read() { return undefined; },
    async close() {},
  };
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 3 });
  return assert.rejects(() => remote.getVersion(), /no reply to command 0x10/)
    .then(() => assert.equal(writes, 2, 'one attempt and one retry, and no more'));
});

test('a remote that has already answered does not get the retry', () => {
  // The bound. The evidence is about the **first** command of a session, so a silence later on is a
  // different event and is reported rather than papered over.
  let requests = 0;
  const transport: Transport = {
    async write() { requests += 1; },
    // Answers the first request, then goes quiet for good.
    async read() {
      return requests === 1 ? report(0x28, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12) : undefined;
    },
    async close() {},
  };
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 3 });
  return remote.getVersion()
    .then(() => assert.rejects(() => remote.getVersion(), /no reply to command 0x10/))
    .then(() => assert.equal(requests, 2, 'the second call sent one request and did not retry'));
});

/**
 * 62 bytes of one value, which is a full chunk's payload for the helper above.
 *
 * Section 223's subject is what happens when some chunks never arrive, which on the bench is
 * HIDAPI's macOS backend discarding the oldest of an overfull input queue, and here is simply
 * leaving them out of the script.
 */
const fullChunk = (fill: number): number[] => new Array<number>(FLASH_CHUNK_DATA).fill(fill);

test('a read that loses chunks fails, and leaves nothing behind for the next command', async () => {
  // **The half that cost an afternoon on 30 August 2026.** The sequence check already caught the
  // loss; what it did not do was clear the rest of the answer, so the remote went on streaming and
  // the next command read those reports instead of its own. Measured three times: every failed read
  // poisoned the run after it, and one of them answered a GET_VERSION with a flash data reply.
  //
  // The script is a transfer that skips two chunks and then carries on to its acknowledgement,
  // which is what the wire looks like when the queue has dropped some.
  const { transport, queue } = scriptedRemote([
    flashChunk(0x01, fullChunk(0xaa)),
    // 0x12 and 0x23 are missing, so the next one is 0x34.
    flashChunk(0x34, fullChunk(0xbb)),
    flashChunk(0x45, fullChunk(0xcc)),
    FLASH_DONE,
    // What the next command would be answered with, if anything of the above were left over.
    report(0x28, 0x34, 0x05),
  ], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 3, architecture: 12 });

  await assert.rejects(() => remote.readFlash(0x040000, 62 * 4), /out of sequence/,
    'the loss is reported rather than filled in');
  assert.equal(queue.length, 1, 'the rest of the answer was drained, up to and including the ack');

  // And the proof that matters: the next command gets its own reply.
  const version = await remote.getVersion();
  assert.equal(version[0], 0x34, 'GET_VERSION answered with a version block, not with flash data');
});

test('the drain stops at the acknowledgement rather than eating the next reply', async () => {
  // The failure mode on the other side: a drain that reads until silence would swallow whatever the
  // next command is about to be answered with, and the caller would see a timeout it cannot explain.
  const { transport, queue } = scriptedRemote([
    flashChunk(0x01, fullChunk(0xaa)),
    flashChunk(0x34, fullChunk(0xbb)),
    FLASH_DONE,
    report(0x28, 0x34, 0x05),
    report(0x28, 0x34, 0x05),
  ], 0);
  const remote = new HarmonyRemote(transport, { timeoutMs: 1, idlePolls: 3, architecture: 12 });
  await assert.rejects(() => remote.readFlash(0x040000, 62 * 3), /out of sequence/);
  assert.equal(queue.length, 2, 'both of the following replies are untouched');
});
