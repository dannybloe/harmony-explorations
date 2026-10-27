/**
 * The file based family's write path, `todo-compile-350.md` 1.6, tested against a fake remote.
 *
 * Nothing here touches a device. `fake-file-remote.ts` answers the way the 1.4 firmware reading says a
 * Harmony 300 or 350 does, so the whole sequence runs end to end and the exact bytes it sends are
 * asserted: the seven steps Logitech's client takes (`tests/test_file_family_write_route.py`) as the
 * firmware handles them (`tests/test_harmony_350_file_write.py`).
 *
 * **Most of these run in the shipped state, flags off, and are refusals**, which is where a rail's
 * value is. The ones that need the write to proceed run in a subprocess with `HARMONY_ENABLE_WRITES=1`
 * and `HARMONY_FILE_WRITE=1`, the shape `rails.test.ts` uses, so the flags never leak into the rest of
 * the suite: the flags are read once, when `rails.ts` loads.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { load, skipUnless } from '@harmony/lab';

import { authoriseReport } from '../src/authorise.ts';
import {
  DATA_PACKET_PAYLOAD,
  FILE_REPORT_BYTES,
  encodeFileRequest,
  guardFileProtocol,
  onTheFileWriteRoute,
} from '../src/filepipe.ts';
import {
  SequenceCounter,
  checkReport,
  chunksFor,
  closeReport,
  dataPacket,
  donePacket,
  flushReport,
  judgeCurrentContent,
  openForWritingReport,
  rebootReport,
  resetFilesystemReport,
  withEndMarker,
  writeChunkReport,
  writeFileConfig,
} from '../src/filewrite.ts';
import { IDENTITY_BYTES, IDENTITY_FIELDS } from '../src/identity.ts';
import {
  FILE_FAMILY_CONFIG_MAX,
  FILE_WRITE_PATHS,
  RailError,
  WRITES_ENABLED,
  assertFileFamilyContainer,
  assertFileWriteAllowed,
  assertFileWriteTarget,
} from '../src/rails.ts';
import { trailerChecksum } from '../src/trailer.ts';
import { TransportError, type Transport } from '../src/transport.ts';
import { FakeFileRemote } from './fake-file-remote.ts';

/** The bytes as a hex string, which is how an assertion about a packet is easiest to read. */
function hex(bytes: Uint8Array, length = bytes.length): string {
  return [...bytes.subarray(0, length)].map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

/**
 * A synthetic container in this family's shape: `GSPM`, `end_addr` naming the end marker above
 * `0x020000`, `LWJL` at `0x47`, a body, the trailer checksum, `PTYY`. Built here rather than read from
 * the lab so the suite runs in a fresh clone, and the lab's own configurations are checked below
 * against the same rail.
 */
function container(length: number, seed = 1): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = (i * 7 + seed * 13) & 0xff;
  bytes.set([0x47, 0x53, 0x50, 0x4d], 0);
  new DataView(bytes.buffer).setUint32(4, 0x020000 + length - 4, true);
  bytes.set([0x4c, 0x57, 0x4a, 0x4c], 0x47);
  bytes.set([0x50, 0x54, 0x59, 0x59], length - 4);
  new DataView(bytes.buffer).setUint16(length - 6, trailerChecksum(bytes), true);
  return bytes;
}

/** An identity block in the shape a remote's is: `0xEE`, two GUIDs, filler. */
function guidFor(seed: number): Uint8Array {
  const block = new Uint8Array(IDENTITY_BYTES).fill(0xff);
  block.fill(0xee, IDENTITY_FIELDS.serial, IDENTITY_FIELDS.guidA);
  for (let i = 0; i < 0x20; i += 1) block[IDENTITY_FIELDS.guidA + i] = (seed * 31 + i * 7 + 1) & 0xff;
  return block;
}

const SYSINFO = 'arch 0x10\nskin 0x68\nfw_ver 1.4.0\nlink_packet_length 64\n';
const THIS_UNIT = guidFor(1);
const ANOTHER_UNIT = guidFor(2);

describe('the packets the write route sends, byte for byte', () => {
  it('resets the file system, and reboots, with one byte parameter each', () => {
    assert.equal(hex(resetFilesystemReport(0), 6), 'ff ff 00 01 01 66');
    assert.equal(hex(rebootReport(9), 6), 'ff ff 09 01 01 00');
    assert.equal(resetFilesystemReport(0).length, FILE_REPORT_BYTES);
  });

  it('opens for writing with the path, the mode W and a four byte size', () => {
    const open = openForWritingReport('/cfg/usercfg', 0x8b07, 1);
    // `80 path 00`, `80 W 00`, `04` and the size big endian.
    assert.equal(hex(open, 28),
      'ff 01 01 03 80 2f 63 66 67 2f 75 73 65 72 63 66 67 00 80 57 00 04 00 00 8b 07 00 00');
  });

  it('opens a chunk with the handle and a count that includes itself', () => {
    assert.equal(hex(writeChunkReport(5, 51, 2), 9), 'ff 03 02 02 01 05 01 33 00');
  });

  it('frames a data packet as its sequence, its length and its bytes, and the done packet as 7E', () => {
    const packet = dataPacket(63, Uint8Array.of(1, 2, 3));
    assert.equal(hex(packet, 6), '3f 03 01 02 03 00');
    assert.equal(packet.length, FILE_REPORT_BYTES);
    assert.equal(hex(donePacket(), 2), '7e 00');
    assert.ok(donePacket().subarray(1).every((b) => b === 0));
    assert.throws(() => dataPacket(64, Uint8Array.of(1)), /0 to 63/);
    assert.throws(() => dataPacket(0, new Uint8Array(DATA_PACKET_PAYLOAD + 1)), /1 to 62/);
  });

  it('asks for the check with the handle, subcommand 1 and the five checksum fields', () => {
    // handle 5, subcommand 1, "XOR", seed 0x4321, offset 0, length 0x8b01, expected 0xbeef.
    assert.equal(hex(checkReport(5, 0xbeef, 0x8b01, 7), 29),
      'ff 06 07 07 01 05 01 01 80 58 4f 52 00 02 43 21 04 00 00 00 00 04 00 00 8b 01 02 be ef');
  });

  it('flushes with the flag the firmware does not read, and closes with the handle', () => {
    assert.equal(hex(flushReport(5, 8), 9), 'ff 05 08 02 01 05 01 00 00');
    assert.equal(hex(closeReport(5, 9), 7), 'ff 07 09 01 01 05 00');
  });
});

describe('one sequence counter for the operation, 0 to 63 and wrapping', () => {
  it('wraps after 63 to 0', () => {
    const counter = new SequenceCounter();
    const taken = Array.from({ length: 130 }, () => counter.take());
    assert.equal(taken[0], 0);
    assert.equal(taken[63], 63);
    assert.equal(taken[64], 0);
    assert.equal(taken[129], 1);
    assert.ok(taken.every((s) => s >= 0 && s < 64));
  });
});

describe('chunks of at most 50 data packets of 62 bytes', () => {
  it('cuts the last chunk to what is left and puts the done packet on it alone', () => {
    const length = DATA_PACKET_PAYLOAD * 50 * 2 + 100;
    const chunks = chunksFor(new Uint8Array(length));
    assert.deepEqual(chunks.map((c) => c.payloads.length), [50, 50, 2]);
    assert.deepEqual(chunks.map((c) => c.last), [false, false, true]);
    assert.deepEqual(chunks[2]!.payloads.map((p) => p.length), [62, 38]);
    assert.equal(chunks.flatMap((c) => c.payloads).reduce((n, p) => n + p.length, 0), length);
  });

  it('keeps an exact multiple in one last chunk of 50, so the done packet makes its count 52', () => {
    const chunks = chunksFor(new Uint8Array(DATA_PACKET_PAYLOAD * 50));
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0]!.payloads.length, 50);
    assert.equal(chunks[0]!.last, true);
  });
});

describe('a container this family accepts, and the ones it would not', () => {
  it('accepts a whole container and reports the stored checksum the check is sent', () => {
    const bytes = container(5000);
    const read = assertFileFamilyContainer(bytes);
    assert.equal(read.storedChecksum, trailerChecksum(bytes));
    assert.equal(read.endAddr, 0x020000 + 5000 - 4);
    assert.equal(read.readLength, 4996);
  });

  it('refuses one without its end marker, which is what a read off the remote is', () => {
    const asRead = container(5000).subarray(0, 4996);
    assert.throws(() => assertFileFamilyContainer(asRead), RailError);
    // And putting the marker back is all it takes, which is what the script does for such a file.
    assert.doesNotThrow(() => assertFileFamilyContainer(withEndMarker(asRead)));
  });

  it('refuses a stored checksum that does not recompute', () => {
    const bytes = container(5000);
    bytes[200] = (bytes[200] as number) ^ 1;
    assert.throws(() => assertFileFamilyContainer(bytes), /recompute/);
  });

  it('refuses an end_addr that does not name the end marker', () => {
    const bytes = container(5000);
    new DataView(bytes.buffer).setUint32(4, 0x020000 + 4000, true);
    bytes.set(Uint8Array.of(0, 0), 4994);
    new DataView(bytes.buffer).setUint16(4994, trailerChecksum(bytes), true);
    assert.throws(() => assertFileFamilyContainer(bytes), /end_addr/);
  });

  it('refuses a container without LWJL at 0x47, which a Harmony One or 600 one is', () => {
    const bytes = container(5000);
    bytes.set([0, 0, 0, 0], 0x47);
    bytes.set([0x4c, 0x57, 0x4a, 0x4c], 0x5f);
    new DataView(bytes.buffer).setUint16(4994, trailerChecksum(bytes), true);
    assert.throws(() => assertFileFamilyContainer(bytes), /LWJL/);
  });

  it('refuses anything that does not start with GSPM', () => {
    const bytes = container(5000);
    bytes.set([0x41, 0x48, 0x43, 0x4d], 0);
    assert.throws(() => assertFileFamilyContainer(bytes), /GSPM/);
  });

  // The synthetic container above is this file's own idea of the shape, so the rail is also held against
  // every configuration read off a Harmony 300 or 350, each stored as read or with its marker put back.
  const FAMILY_CONFIGS = ['h350_config', 'h350_programmed_config', 'h350_three_devices_config',
    'h300_config', 'h300_programmed_config'];
  it('accepts all five configurations read off the family, once the end marker is on', skipUnless(...FAMILY_CONFIGS), () => {
    for (const name of FAMILY_CONFIGS) {
      const stored = load(name);
      assert.ok(stored !== undefined, name);
      const whole = stored.subarray(stored.length - 4).every((b, i) => b === [0x50, 0x54, 0x59, 0x59][i])
        ? stored : withEndMarker(stored);
      const read = assertFileFamilyContainer(whole);
      assert.equal(read.readLength, whole.length - 4, name);
    }
  });

  it('refuses a container longer than the file, since the firmware would write it into the log', () => {
    assert.doesNotThrow(() => assertFileFamilyContainer(container(FILE_FAMILY_CONFIG_MAX)));
    assert.throws(() => assertFileFamilyContainer(container(FILE_FAMILY_CONFIG_MAX + 2)), /log/);
  });
});

describe('the target: the path, the remote and the unit', () => {
  const permission = {
    path: '/cfg/usercfg',
    sysinfo: new Map([['arch', '0x10'], ['skin', '0x68'], ['link_packet_length', '64']]),
    guid: THIS_UNIT,
    permittedUnit: THIS_UNIT,
    container: container(5000),
  };

  it('passes the unit it was recorded for, with the path and the container right', () => {
    assert.doesNotThrow(() => assertFileWriteTarget(permission));
  });

  it('opens /cfg/usercfg and nothing else, firmware paths first among the refused', () => {
    assert.deepEqual(FILE_WRITE_PATHS, ['/cfg/usercfg']);
    for (const path of ['/fw/normalmode', '/fw/safemode', '/fw/bootloader', '/fw/config_bits',
      '/cfg/log', '/cfg/state', '/sys/guid', '/cfg/usercfg ', '/CFG/USERCFG']) {
      assert.throws(() => assertFileWriteTarget({ ...permission, path }), RailError, path);
    }
  });

  it('refuses a different unit, and a unit whose GUIDs are filler', () => {
    assert.throws(() => assertFileWriteTarget({ ...permission, guid: ANOTHER_UNIT }), /not the unit/);
    const filler = new Uint8Array(IDENTITY_BYTES).fill(0xee);
    assert.throws(() => assertFileWriteTarget({ ...permission, guid: filler }), /cannot be identified/);
    assert.throws(() => assertFileWriteTarget({ ...permission, permittedUnit: filler }), RailError);
  });

  it('refuses another architecture, and a packet length the data packets are not sized for', () => {
    assert.throws(() => assertFileWriteTarget({ ...permission, sysinfo: new Map([
      ['arch', '0x11'], ['link_packet_length', '64']]) }), /architecture/);
    assert.throws(() => assertFileWriteTarget({ ...permission, sysinfo: new Map([
      ['arch', '0x10'], ['link_packet_length', '32']]) }), /packet length/);
  });

  it('refuses in the shipped state before it looks at anything else, naming the build flag', () => {
    assert.equal(WRITES_ENABLED, false, 'this file must run in the shipped state');
    assert.throws(() => assertFileWriteAllowed(permission), /HARMONY_ENABLE_WRITES=1/);
  });
});

describe('nothing the lab cannot put back is erased', () => {
  const backup = container(5000, 1);
  const next = container(6000, 2);

  it('passes when the remote holds the backup, as read or whole', () => {
    const current = backup.subarray(0, 4996);
    assert.equal(judgeCurrentContent(current, backup, next), 'the backup');
    assert.equal(judgeCurrentContent(current, current, next), 'the backup');
  });

  it('passes a rerun of the same write, and a remote that holds nothing whole', () => {
    assert.equal(judgeCurrentContent(next.subarray(0, 5996), backup, next), 'this configuration');
    assert.equal(judgeCurrentContent(new Uint8Array(0), backup, next), 'no configuration');
    // What a write that stopped part way leaves: a header and then erased flash.
    const partial = next.slice(0, 5996);
    partial.fill(0xff, 1000);
    assert.equal(judgeCurrentContent(partial, backup, next), 'no configuration');
  });

  it('refuses a whole configuration the lab does not hold, and a backup that restores nothing', () => {
    const stranger = container(5500, 3).subarray(0, 5496);
    assert.throws(() => judgeCurrentContent(stranger, backup, next), /lab has no copy/);
    assert.throws(() => judgeCurrentContent(new Uint8Array(0), new Uint8Array(100), next), /backup/);
  });
});

describe('the guard: the write route reaches the transport only authorised, flagged and on the route', () => {
  it('knows every packet the route sends, and no firmware path', () => {
    for (const report of [
      resetFilesystemReport(0), rebootReport(1), openForWritingReport('/cfg/usercfg', 100, 2),
      writeChunkReport(5, 51, 3), dataPacket(4, Uint8Array.of(9)), donePacket(),
      checkReport(5, 0x1234, 100, 5), flushReport(5, 6), closeReport(5, 7),
    ]) {
      assert.ok(onTheFileWriteRoute(report), hex(report, 8));
    }
    for (const path of ['/fw/normalmode', '/fw/bootloader', '/fw/safemode', '/cfg/log']) {
      assert.equal(onTheFileWriteRoute(openForWritingReport(path, 100, 2)), false, path);
    }
    // An open for reading is the read path's, not this route's; the other control parameters are
    // reboots or unread, and the other device control subcommands are unread.
    const openRead = encodeFileRequest(0x01, [{ kind: 'string', value: '/cfg/usercfg' }, { kind: 'string', value: 'R' }]);
    assert.equal(onTheFileWriteRoute(openRead), false);
    for (const parameter of [0x62, 0x6e, 0x73, 0x75]) {
      assert.equal(onTheFileWriteRoute(encodeFileRequest(0xff, [{ kind: 'byte', value: parameter }])), false);
    }
    assert.equal(onTheFileWriteRoute(encodeFileRequest(0x06, [{ kind: 'byte', value: 5 }, { kind: 'byte', value: 2 }])), false);
    // A data packet whose padding is not padding, or whose length the firmware would misread.
    const dirty = dataPacket(4, Uint8Array.of(9));
    dirty[40] = 1;
    assert.equal(onTheFileWriteRoute(dirty), false);
    const long = dataPacket(4, Uint8Array.of(9));
    long[1] = 63;
    assert.equal(onTheFileWriteRoute(long), false);
  });

  it('refuses an authorised write route report in the shipped state', async () => {
    const sent: Uint8Array[] = [];
    const inner: Transport = {
      async write(report) { sent.push(report); },
      async read() { return undefined; },
      async close() {},
    };
    const guarded = guardFileProtocol(inner);
    for (const report of [resetFilesystemReport(0), openForWritingReport('/cfg/usercfg', 100, 1),
      dataPacket(2, Uint8Array.of(1))]) {
      authoriseReport(guarded, report);
      await assert.rejects(() => guarded.write(report), TransportError);
    }
    // Unauthorised, it is refused as it always was.
    await assert.rejects(() => guarded.write(flushReport(5, 0)), TransportError);
    assert.equal(sent.length, 0);
  });

  it('offers write, read and close and nothing else, so the permission is not on its surface', () => {
    const guarded = guardFileProtocol({
      async write() {}, async read() { return undefined; }, async close() {},
    });
    const surface = new Set<string>();
    for (let o: object | null = guarded; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) {
      for (const name of Object.getOwnPropertyNames(o)) surface.add(name);
    }
    assert.deepEqual([...surface].sort(), ['close', 'read', 'write']);
  });

  it('keeps the writer out of the barrel and in the write subpath', async () => {
    const barrel = (await import('../src/index.ts')) as Record<string, unknown>;
    for (const name of ['writeFileConfig', 'openForWritingReport', 'dataPacket', 'resetFilesystemReport',
      'rebootReport', 'checkReport', 'flushReport', 'authoriseReport']) {
      assert.equal(barrel[name], undefined, `${name} is in the barrel`);
    }
    const write = (await import('../src/write.ts')) as Record<string, unknown>;
    assert.equal(typeof write['writeFileConfig'], 'function');
    assert.equal(write['openForWritingReport'], undefined, 'the subpath offers the writer, not its packets');
  });
});

describe('the whole write against a fake remote, in the shipped state', () => {
  it('reads and refuses, and sends nothing that writes', async () => {
    const backup = container(5000, 1);
    const remote = new FakeFileRemote({ sysinfo: SYSINFO, guid: THIS_UNIT, usercfg: backup });
    const guarded = guardFileProtocol(remote);
    await assert.rejects(() => writeFileConfig(guarded, {
      path: '/cfg/usercfg', container: container(6000, 2), permittedUnit: THIS_UNIT, backup, reboot: true,
    }), /HARMONY_ENABLE_WRITES=1/);
    assert.equal(remote.erased, false);
    // Three files read, each a ping, an open, as many reads as it takes, and a close.
    assert.ok(remote.sent.every((r) => r[0] === 0xff && [0, 1, 4, 7].includes(r[1] as number)));
    assert.equal(remote.sent.filter((r) => r[1] === 1).length, 3);
  });
});

/**
 * Run a script in a fresh process with these flags set, importing the write path and the fake by
 * absolute path, and return what it printed.
 */
function withEnv(extra: Record<string, string>, script: string): string {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const path = (relative: string): string => join(here, relative).replaceAll('\\', '/');
  return execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', `
      import * as write from '${path('../src/filewrite.ts')}';
      import * as pipe from '${path('../src/filepipe.ts')}';
      import * as rails from '${path('../src/rails.ts')}';
      import { trailerChecksum } from '${path('../src/trailer.ts')}';
      import { authoriseReport } from '${path('../src/authorise.ts')}';
      import { FakeFileRemote } from '${path('./fake-file-remote.ts')}';
      ${CONTAINER_SOURCE}
      ${script}
    `],
    { env: { ...process.env, ...extra }, encoding: 'utf8' },
  ).trim();
}

/** `container` and `guidFor` again, as source, for the subprocesses. */
const CONTAINER_SOURCE = `
  function container(length, seed = 1) {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) bytes[i] = (i * 7 + seed * 13) & 0xff;
    bytes.set([0x47, 0x53, 0x50, 0x4d], 0);
    new DataView(bytes.buffer).setUint32(4, 0x020000 + length - 4, true);
    bytes.set([0x4c, 0x57, 0x4a, 0x4c], 0x47);
    bytes.set([0x50, 0x54, 0x59, 0x59], length - 4);
    new DataView(bytes.buffer).setUint16(length - 6, trailerChecksum(bytes), true);
    return bytes;
  }
  function guidFor(seed) {
    const block = new Uint8Array(64).fill(0xff);
    block.fill(0xee, 0, 0x10);
    for (let i = 0; i < 0x20; i += 1) block[0x10 + i] = (seed * 31 + i * 7 + 1) & 0xff;
    return block;
  }
  const SYSINFO = ${JSON.stringify(SYSINFO)};
  const hex = (r, n) => [...r.subarray(0, n)].map((b) => b.toString(16).padStart(2, '0')).join(' ');
`;

const FLAGS = { HARMONY_ENABLE_WRITES: '1', HARMONY_FILE_WRITE: '1' };

/** Two full chunks and a short one, so the sequence counter wraps inside the second. */
const WRITE_LENGTH = 62 * 50 * 2 + 100;

const RUN = `
  const backup = container(5000, 1);
  const next = container(${WRITE_LENGTH}, 2);
  const remote = new FakeFileRemote({
    sysinfo: SYSINFO, guid: guidFor(Number(process.env.UNIT_ON_THE_CABLE ?? 1)), usercfg: backup,
    corruptAt: process.env.CORRUPT_AT === undefined ? undefined : Number(process.env.CORRUPT_AT),
  });
  const lines = [];
  let outcome = 'written';
  try {
    await write.writeFileConfig(pipe.guardFileProtocol(remote), {
      path: process.env.WRITE_PATH ?? '/cfg/usercfg', container: next, permittedUnit: guidFor(1), backup,
      reboot: true, log: (line) => lines.push(line),
    });
  } catch (error) {
    outcome = error.constructor.name + ': ' + error.message;
  }
  const stored = remote.flash.subarray(0, next.length);
  process.stdout.write(JSON.stringify({
    outcome,
    lines,
    erased: remote.erased,
    rebooted: remote.rebooted,
    flashHoldsIt: stored.every((b, i) => b === next[i]),
    sent: remote.sent.map((r) => hex(r, 12)),
  }));
`;

/** Whether every report is one of the read path's four commands: nothing that writes went out. */
function onlyReads(sent: readonly string[]): boolean {
  return sent.every((r) => ['ff 00', 'ff 01', 'ff 04', 'ff 07'].includes(r.slice(0, 5)));
}

interface Run {
  outcome: string;
  lines: string[];
  erased: boolean;
  rebooted: boolean;
  flashHoldsIt: boolean;
  sent: string[];
}

function run(extra: Record<string, string> = {}): Run {
  return JSON.parse(withEnv({ ...FLAGS, ...extra }, RUN)) as Run;
}

describe('the whole write against a fake remote, with both flags set', () => {
  it('writes, checks, closes, reads back identical and reboots, in the client\'s order', () => {
    const result = run();
    assert.equal(result.outcome, 'written', result.lines.join('\n'));
    assert.equal(result.flashHoldsIt, true);
    assert.equal(result.rebooted, true);

    // The reads of the three files first, which change nothing, and from the reset on the write.
    const start = result.sent.indexOf('ff ff 00 01 01 66 00 00 00 00 00 00');
    assert.ok(start > 0 && onlyReads(result.sent.slice(0, start)));
    const sent = result.sent.slice(start);

    // The reset is sequence 0 and the open sequence 1, then one counter for everything after.
    assert.equal(sent[0], 'ff ff 00 01 01 66 00 00 00 00 00 00');
    assert.equal(sent[1]!.slice(0, 17), 'ff 01 01 03 80 2f');
    // First chunk: its command at 2 stating 52 packets, the command, fifty data packets 3 to 52 and the
    // done packet at 53, which every chunk ends with, as the client's template sends it.
    assert.equal(sent[2], 'ff 03 02 02 01 05 01 34 00 00 00 00');
    assert.equal(sent[3]!.slice(0, 5), '03 3e');
    assert.equal(sent[52]!.slice(0, 5), '34 3e');
    assert.equal(sent[53], '7e 00 00 00 00 00 00 00 00 00 00 00');
    // Second chunk: its command at 54, and its data packets run 54 to 63 and wrap to 0 to 39.
    assert.equal(sent[54], 'ff 03 35 02 01 05 01 34 00 00 00 00');
    assert.equal(sent[55]!.slice(0, 2), '36');
    assert.equal(sent[64]!.slice(0, 2), '3f');
    assert.equal(sent[65]!.slice(0, 2), '00');
    assert.equal(sent[104]!.slice(0, 2), '27');
    assert.equal(sent[105], '7e 00 00 00 00 00 00 00 00 00 00 00');
    // The last chunk: command 40, two data packets (62 and 38 bytes), the done packet, count 4.
    assert.equal(sent[106], 'ff 03 28 02 01 05 01 04 00 00 00 00');
    assert.equal(sent[107]!.slice(0, 5), '29 3e');
    assert.equal(sent[108]!.slice(0, 5), '2a 26');
    assert.equal(sent[109], '7e 00 00 00 00 00 00 00 00 00 00 00');
    // The check with the stored word, the flush on m, the close, at 43, 44 and 45.
    assert.equal(sent[110]!.slice(0, 23), 'ff 06 2b 07 01 05 01 01');
    assert.equal(sent[111], 'ff 05 2c 02 01 05 01 00 00 00 00 00');
    assert.equal(sent[112], 'ff 07 2d 01 01 05 00 00 00 00 00 00');
    // The read back is the read path again, 6296 bytes in four reads, and the reboot is the last thing
    // sent, at 46.
    assert.deepEqual(sent.slice(113, -1).map((r) => r.slice(0, 5)),
      ['ff 00', 'ff 01', 'ff 04', 'ff 04', 'ff 04', 'ff 04', 'ff 07']);
    assert.equal(sent.at(-1), 'ff ff 2e 01 01 00 00 00 00 00 00 00');
    assert.equal(sent.length, 121);
    assert.match(result.lines.join('\n'), /identical to what was sent, less the end marker/);
  });

  it('fails on a read back that differs, and sends no reboot after it', () => {
    const result = run({ CORRUPT_AT: '3000' });
    assert.match(result.outcome, /^FileWriteError: the write did not verify: the read back differs from byte 3000/);
    assert.equal(result.rebooted, false);
    assert.ok(!result.sent.includes('ff ff 2e 01 01 00 00 00 00 00 00 00'));
  });

  it('refuses another unit before anything is erased', () => {
    const result = run({ UNIT_ON_THE_CABLE: '2' });
    assert.match(result.outcome, /^RailError: the remote on the cable is not the unit/);
    assert.equal(result.erased, false);
    assert.ok(onlyReads(result.sent), 'only the reads went out');
  });

  it('refuses another path before anything is erased', () => {
    const result = run({ WRITE_PATH: '/fw/normalmode' });
    assert.match(result.outcome, /^RailError: refusing to write \/fw\/normalmode/);
    assert.equal(result.erased, false);
    assert.ok(onlyReads(result.sent));
  });

  it('refuses with writes enabled and the file door shut, which is the point of the door', () => {
    const result = run({ HARMONY_FILE_WRITE: '' });
    assert.match(result.outcome, /HARMONY_FILE_WRITE=1/);
    assert.equal(result.erased, false);
    assert.ok(onlyReads(result.sent));
  });

  it('keeps a firmware path off the transport even authorised and with both flags', () => {
    const output = withEnv(FLAGS, `
      const remote = new FakeFileRemote({ sysinfo: SYSINFO, guid: guidFor(1), usercfg: new Uint8Array(0) });
      const guarded = pipe.guardFileProtocol(remote);
      const outcomes = [];
      for (const report of [write.openForWritingReport('/fw/normalmode', 100, 1),
        pipe.encodeFileRequest(0xff, [{ kind: 'byte', value: 0x73 }])]) {
        authoriseReport(guarded, report);
        try { await guarded.write(report); outcomes.push('sent'); }
        catch (error) { outcomes.push(error.constructor.name); }
      }
      // And the control: the same door passes the route's own open.
      const open = write.openForWritingReport('/cfg/usercfg', 100, 1);
      authoriseReport(guarded, open);
      await guarded.write(open);
      outcomes.push(remote.erased ? 'usercfg opened' : 'usercfg refused');
      // An authorisation is for those bytes once: the same open again is refused.
      try { await guarded.write(open); outcomes.push('reused'); }
      catch (error) { outcomes.push(error.constructor.name); }
      process.stdout.write(outcomes.join(','));
    `);
    assert.equal(output, 'TransportError,TransportError,usercfg opened,TransportError');
  });

  it('needs both flags at the guard too, each one alone refusing an authorised open', () => {
    // The guard's own check, not the rail's: a caller who reaches `authorise.ts` by path never meets
    // `assertFileWriteAllowed`, so the guard has to refuse on either flag being unset by itself.
    const script = `
      const remote = new FakeFileRemote({ sysinfo: SYSINFO, guid: guidFor(1), usercfg: new Uint8Array(0) });
      const guarded = pipe.guardFileProtocol(remote);
      const open = write.openForWritingReport('/cfg/usercfg', 100, 1);
      authoriseReport(guarded, open);
      try { await guarded.write(open); process.stdout.write(remote.erased ? 'sent' : 'lost'); }
      catch (error) { process.stdout.write(error.constructor.name); }
    `;
    assert.equal(withEnv({ HARMONY_ENABLE_WRITES: '', HARMONY_FILE_WRITE: '1' }, script), 'TransportError');
    assert.equal(withEnv({ HARMONY_ENABLE_WRITES: '1', HARMONY_FILE_WRITE: '' }, script), 'TransportError');
    assert.equal(withEnv(FLAGS, script), 'sent');
  });
});
