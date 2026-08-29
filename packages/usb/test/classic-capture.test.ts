/**
 * Our command encoder against Logitech's own, on the wire, reading a Harmony One.
 *
 * Every other check of `protocol.ts` compares this project against itself: a request is built and
 * then read back by the same module, so a wrong length nibble or a byte swapped address would agree
 * with itself perfectly. This file is the one place that is not true. The fixture is a packet log of
 * **Logitech's classic client** driving a Harmony One, so the bytes on the left were produced by an
 * implementation that has never seen ours, and a disagreement here is the signal this project values
 * most. Section 210.
 *
 * The capture is a log rather than a device, so nothing here touches hardware and nothing here can
 * write. It skips without a lab like every other fixture backed test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import {
  encodeRequest,
  getVersionRequest,
  readFlashRequest,
  ESCAPE,
  ESCAPE_END_SESSION,
  GET_VERSION,
  READ_FLASH,
  ACK,
  payloadLengthForNibble,
} from '../src/protocol.ts';

const FIXTURE = 'classic_read_capture';

/** The hex of every request the client sent, in order, as the client's own logger wrote it. */
function requests(): string[] {
  const text = new TextDecoder('latin1').decode(lab.require_(FIXTURE));
  return [...text.matchAll(/sent: ([0-9A-F]+)/g)].map((m) => m[1]!);
}

/**
 * A report with its trailing zero padding removed.
 *
 * The client logs only the bytes it considers significant, so `GET_VERSION` appears as `10` rather
 * than as 64 bytes. Trimming ours is what makes the two comparable, and it costs nothing: every
 * request in this capture ends in a nonzero byte, so no real payload byte can be trimmed away.
 */
function trimmed(report: Uint8Array): string {
  let end = report.length;
  while (end > 0 && report[end - 1] === 0) end -= 1;
  return Array.from(report.subarray(0, end), (b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join('');
}

test('our encoder reproduces every request Logitech\'s client sent, byte for byte',
  lab.skipUnless(FIXTURE), () => {
    const sent = requests();
    assert.equal(sent.length, 1312, 'requests in the capture');

    let matched = 0;
    for (const hex of sent) {
      const b = Uint8Array.from(Buffer.from(hex, 'hex'));
      const command = b[0]! & 0xf0;
      let ours: Uint8Array;
      if (command === READ_FLASH) {
        ours = readFlashRequest((b[1]! << 16) | (b[2]! << 8) | b[3]!, (b[4]! << 8) | b[5]!);
      } else if (command === GET_VERSION) {
        ours = getVersionRequest();
      } else if (command === ESCAPE) {
        ours = encodeRequest(ESCAPE, [ESCAPE_END_SESSION]);
      } else {
        throw new Error(`the capture holds a command this test does not build: ${hex}`);
      }
      assert.equal(trimmed(ours), hex, `request ${hex}`);
      matched += 1;
    }
    assert.equal(matched, 1312);
  });

test('reading a remote takes three commands and no others', lab.skipUnless(FIXTURE), () => {
  const byCommand = new Map<number, number>();
  for (const hex of requests()) {
    const command = Number.parseInt(hex.slice(0, 2), 16) & 0xf0;
    byCommand.set(command, (byCommand.get(command) ?? 0) + 1);
  }
  // The whole point of asserting the counts rather than the set: a fourth command appearing once in
  // 1312 would still leave the set of three looking right if the set were all that was checked.
  const expected: [number, number][] = [
    [GET_VERSION, 1],
    [READ_FLASH, 1310],
    [ESCAPE, 1],
  ];
  const byFirst = (a: [number, number], b: [number, number]): number => a[0] - b[0];
  assert.deepEqual([...byCommand.entries()].sort(byFirst), expected.sort(byFirst));
});

test('the client opens the session with the escape this project has never sent',
  lab.skipUnless(FIXTURE), () => {
    // `packages/usb/bin/end-session-experiment.ts` is the only script here that sends a command
    // which is not a read, and it is unrun. This is the evidence that Logitech's own client sends
    // exactly those two bytes as its **first** command to a Harmony One, before identifying it.
    const sent = requests();
    assert.equal(sent[0], 'E101');
    assert.equal(sent[1], '10');
    assert.equal(trimmed(encodeRequest(ESCAPE, [ESCAPE_END_SESSION])), sent[0]);
  });

test('the client reads three extents and never the firmware', lab.skipUnless(FIXTURE), () => {
  const runs: { from: number; to: number; reads: number }[] = [];
  for (const hex of requests()) {
    const b = Uint8Array.from(Buffer.from(hex, 'hex'));
    if ((b[0]! & 0xf0) !== READ_FLASH) continue;
    const address = (b[1]! << 16) | (b[2]! << 8) | b[3]!;
    const count = (b[4]! << 8) | b[5]!;
    const last = runs[runs.length - 1];
    if (last !== undefined && last.to === address) {
      last.to = address + count;
      last.reads += 1;
    } else {
      runs.push({ from: address, to: address + count, reads: 1 });
    }
  }
  assert.deepEqual(runs, [
    // The unit's identity block, 48 bytes at `0xFF` `+0xF400`. `docs/memory-map-one.md` gives the
    // block as 64 bytes with its fourth field erased, and the client asks for exactly the 48 that
    // hold the three GUIDs, which is an independent reading of the same boundary.
    { from: 0xfff400, to: 0xfff430, reads: 1 },
    // The safe mode container's whole extent, from its base up to the application firmware.
    { from: 0x002000, to: 0x020000, reads: 40 },
    // The user config region, whole. This is the vendor's own statement that it ends at 0x400000,
    // which is the bound `packages/corpus/src/read.ts` carries for this architecture.
    { from: 0x040000, to: 0x400000, reads: 1269 },
  ]);

  // The gap between the second and third run is the application firmware at 0x020000, and the
  // client steps over it. It has no region table entry for it, so it never asks.
  assert.equal(runs[1]!.to, 0x020000);
  assert.equal(runs[2]!.from, 0x040000);
});

/**
 * The client's own region table, for architecture 12, as its source states it.
 *
 * `UpdateHidService.getRegionAddress` and `getRegionSize` are one switch each, and between them
 * they name **two** regions and **one** architecture: region 3 at 8192 for 122880 bytes and region
 * 4 at 262144 for `0x3C0000`, both under `case 12`. Every other pair throws before a packet is
 * built, which is why a Harmony 600 gets no region read out of this client at all. Section 214.
 *
 * These four numbers are transcribed from the decompiled source, so they are the **source** end of
 * the closure below and nothing here recomputes them from the capture.
 */
const REGION_TABLE: readonly { region: number; address: number; size: number }[] = [
  { region: 3, address: 8192, size: 122880 },
  { region: 4, address: 262144, size: 0x3c0000 },
];

test('the extents the client read are exactly what its own region table predicts',
  lab.skipUnless(FIXTURE), () => {
    // The strongest thing in this file, and the reason it is worth a test of its own. The left hand
    // side is a table in Logitech's source, read on 29 August 2026; the right hand side is where
    // their client's packets actually went, captured on 7 August 2026. Two routes with nothing in
    // common, and neither was derived from the other: section 210 measured the extents without
    // knowing why they were those extents, and section 212 read the table without checking it
    // against packets. They agree on all four numbers.
    const flashRuns: { from: number; to: number }[] = [];
    for (const hex of requests()) {
      const b = Uint8Array.from(Buffer.from(hex, 'hex'));
      if ((b[0]! & 0xf0) !== READ_FLASH) continue;
      const address = (b[1]! << 16) | (b[2]! << 8) | b[3]!;
      const count = (b[4]! << 8) | b[5]!;
      // Internal memory, top byte 0xFF, is the identity block and is not a region.
      if (b[1]! === 0xff) continue;
      const last = flashRuns[flashRuns.length - 1];
      if (last !== undefined && last.to === address) last.to = address + count;
      else flashRuns.push({ from: address, to: address + count });
    }

    const predicted = REGION_TABLE.map((r) => ({ from: r.address, to: r.address + r.size }));
    assert.deepEqual(flashRuns, predicted);

    // And the closure stated the other way round, so a future edit that made both sides move
    // together would still have to move these two literals by hand.
    assert.equal(predicted[0]!.to, 0x020000);
    assert.equal(predicted[1]!.to, 0x400000);
  });

test('the client transfers 3100 bytes at a time, which is fifty full chunks',
  lab.skipUnless(FIXTURE), () => {
    const counts = new Map<number, number>();
    for (const hex of requests()) {
      const b = Uint8Array.from(Buffer.from(hex, 'hex'));
      if ((b[0]! & 0xf0) !== READ_FLASH) continue;
      const count = (b[4]! << 8) | b[5]!;
      counts.set(count, (counts.get(count) ?? 0) + 1);
    }
    // 3100 is 50 times the 62 data bytes a full reply chunk carries, so the vendor sizes a transfer
    // in whole packets. The three odd counts are the identity block and the short tail of each of
    // the two config extents.
    assert.deepEqual([...counts.entries()].sort((a, b) => b[1] - a[1]), [
      [3100, 1307],
      [48, 1],
      [1980, 1],
      [1360, 1],
    ]);
    assert.equal(3100 % 62, 0);
    assert.equal(3100 / 62, 50);
  });

test('every flash read is acknowledged once, and nothing else is', lab.skipUnless(FIXTURE), () => {
  const text = new TextDecoder('latin1').decode(lab.require_(FIXTURE));
  const acks = [...text.matchAll(/receive: ([0-9A-F]{2})([0-9A-F]{2})/g)]
    .filter((m) => Number.parseInt(m[1]!, 16) === ACK);
  assert.equal(acks.length, 1310, 'acknowledgements');
  // The byte after the acknowledgement is the command being acknowledged, and it is READ_FLASH
  // every time: neither the escape nor the version read is acknowledged this way.
  assert.ok(acks.every((m) => Number.parseInt(m[2]!, 16) === READ_FLASH));
});

test('the vendor\'s replies close on the byte count it asked for, which is what pins the length nibble',
  lab.skipUnless(FIXTURE), () => {
    // The strongest thing in this capture. `payloadLengthForNibble` is deliberately **not** linear:
    // nibble 8 means 15 payload bytes, 9 means 31 and A means 63, and `protocol.ts` warns that
    // getting it wrong produces no error. Nothing in this repository could confirm that mapping
    // except by reading the firmware that implements it.
    //
    // Here it is confirmed arithmetically by an implementation that has never seen ours: for every
    // one of the 1310 flash reads, decoding each reply chunk's nibble through our table and
    // subtracting the one sequence byte has to sum to exactly the count the client asked for. Under
    // a linear reading of the nibble, a 3100 byte read would account for 500 bytes and the sums
    // would miss by a factor of six.
    const text = new TextDecoder('latin1').decode(lab.require_(FIXTURE));
    const events = [...text.matchAll(/(sent|receive): ([0-9A-F]+)/g)];

    let checked = 0;
    let wanted: number | undefined;
    let got = 0;
    const nibbles = new Map<number, number>();
    const close = (): void => {
      if (wanted === undefined) return;
      assert.equal(got, wanted, 'reply bytes for one flash read');
      checked += 1;
    };

    for (const [, kind, hex] of events) {
      const first = Number.parseInt(hex!.slice(0, 2), 16);
      if (kind === 'sent') {
        close();
        wanted = undefined;
        if ((first & 0xf0) === READ_FLASH) {
          const b = Uint8Array.from(Buffer.from(hex!, 'hex'));
          wanted = (b[4]! << 8) | b[5]!;
          got = 0;
        }
      } else if (wanted !== undefined && first !== ACK) {
        const nibble = first & 0x0f;
        nibbles.set(nibble, (nibbles.get(nibble) ?? 0) + 1);
        // One payload byte is the chunk's sequence number; the rest is data.
        got += payloadLengthForNibble(nibble) - 1;
      }
    }
    close();

    assert.equal(checked, 1310, 'flash reads whose replies were accounted for');
    // Exact, and the shape is the point: nibble A does the bulk, and the three short nibbles appear
    // only as the tail of a transfer that is not a whole number of full chunks.
    assert.deepEqual([...nibbles.entries()].sort((a, b) => a[0] - b[0]), [
      [0x5, 1],
      [0x8, 5],
      [0x9, 3],
      [0xa, 65402],
    ]);
  });
