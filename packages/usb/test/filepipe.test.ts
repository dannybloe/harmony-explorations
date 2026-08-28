/**
 * The file protocol, section 198. Read paths only, and the negatives carry the weight.
 *
 * Two kinds of test here and they answer different questions. The encoder and parser tests say the
 * bytes are what the specification says. The guard tests say a caller cannot send anything else,
 * which is the half section 188 was about: a rail on a convenient method is no rail while the
 * barrel exports the encoder.
 *
 * The last test is the one worth having: the file names this module carries are asserted against the
 * **firmware image**, not against Logitech's client, so the table cannot drift from the only
 * authority we hold for this family.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { load, skipUnless } from '@harmony/lab';

import {
  ARCH16_DIRECTORIES,
  ARCH16_FILES,
  FILE_CLOSE,
  FILE_CONTROL,
  FILE_DEVCTRL,
  FILE_FLUSH,
  FILE_OPEN,
  FILE_PING,
  FILE_READ,
  FILE_READ_ONLY_COMMANDS,
  FILE_REPORT_BYTES,
  FILE_SERVICE,
  FILE_WRITE,
  OFFSET_HANDLE,
  OFFSET_SIZE,
  READ_TERMINATOR,
  REPLY_ERROR,
  SYSINFO_FIELDS,
  decodeFileReply,
  encodeFileRequest,
  expectFileReply,
  guardFileProtocol,
  opensForReading,
  parseSysInfo,
  readFile,
} from '../src/filepipe.ts';
import { TransportError, type Transport } from '../src/transport.ts';

interface Recording extends Transport {
  readonly sent: Uint8Array[];
}

/** A transport that records what was written and replays a queue of replies. */
function fakeTransport(replies: Uint8Array[]): Recording {
  const sent: Uint8Array[] = [];
  return {
    sent,
    async write(report: Uint8Array): Promise<void> {
      sent.push(Uint8Array.from(report));
    },
    async read(): Promise<Uint8Array | undefined> {
      return replies.shift();
    },
    async close(): Promise<void> {},
  };
}

function reply(command: number, fill: Record<number, number> = {}): Uint8Array {
  const r = new Uint8Array(FILE_REPORT_BYTES);
  r[0] = FILE_SERVICE;
  r[1] = command;
  r[2] = 0;
  for (const [at, value] of Object.entries(fill)) r[Number(at)] = value;
  return r;
}

describe('the request the file protocol sends', () => {
  it('NUL terminates a request string, which is the form a remote answers at all', () => {
    // Measured rather than chosen: length prefixing the request drew no reply from a Harmony Touch
    // where this form draws a reply that refuses. Section 198.
    const report = encodeFileRequest(FILE_OPEN, [
      { kind: 'string', value: '/sys/sysinfo' },
      { kind: 'string', value: 'R' },
    ]);
    assert.equal(report.length, FILE_REPORT_BYTES);
    assert.equal(report[0], FILE_SERVICE);
    assert.equal(report[1], FILE_OPEN);
    assert.equal(report[2], 0, 'the sequence number');
    assert.equal(report[3], 2, 'two parameters');
    assert.equal(Buffer.from(report.slice(4, 16)).toString('ascii'), '/sys/sysinfo');
    assert.equal(report[16], 0, 'the path is terminated');
    assert.equal(report[17], 0x52, 'the mode R');
    assert.equal(report[18], 0, 'and it is terminated too');
  });

  it('reads a reply handle at 5 and a size at 7, which the offsets themselves argue for', () => {
    // A reply frames its parameters with a length byte, which is a separate reading from the
    // request's and has separate evidence: the templates read those two positions as constants,
    // and a constant offset cannot sit behind a variable length field. So count at 3, length at 4,
    // handle at 5, length at 6, four size bytes at 7.
    assert.equal(OFFSET_HANDLE, 5);
    assert.equal(OFFSET_SIZE, 7);
    const refusal = Uint8Array.from([FILE_SERVICE, FILE_OPEN, REPLY_ERROR, 0x01, 0x01, 0x0b]);
    const decoded = decodeFileReply(refusal);
    assert.equal(decoded.sequence, REPLY_ERROR);
    assert.equal(refusal[3], 1, 'one parameter');
    assert.equal(refusal[4], 1, 'of length one');
    assert.equal(refusal[5], 0x0b, 'carrying the value a Harmony Touch actually sent');
  });

  it('writes a size big endian, which is the one byte order this protocol states', () => {
    const report = encodeFileRequest(FILE_READ, [{ kind: 'dword', value: 0x01020304 }]);
    assert.deepEqual(Array.from(report.slice(4, 8)), [0x01, 0x02, 0x03, 0x04]);
  });

  it('refuses parameters that do not fit rather than truncating them', () => {
    assert.throws(
      () => encodeFileRequest(FILE_OPEN, [{ kind: 'string', value: 'x'.repeat(70) }]),
      TransportError,
    );
  });
});

describe('a reply is checked on two fields, not one', () => {
  it('accepts the answer to the command that was sent', () => {
    const ok = expectFileReply(decodeFileReply(reply(FILE_OPEN)), FILE_OPEN);
    assert.equal(ok.command, FILE_OPEN);
  });

  it('treats the sequence byte set to 0xFF as the refusal it is', () => {
    const bad = reply(FILE_OPEN, { 2: REPLY_ERROR });
    assert.throws(() => expectFileReply(decodeFileReply(bad), FILE_OPEN), TransportError);
  });

  it('refuses a reply that answers a different command', () => {
    assert.throws(
      () => expectFileReply(decodeFileReply(reply(FILE_CLOSE)), FILE_OPEN),
      TransportError,
    );
  });
});

describe('the guard is the rail, and it refuses every command that writes', () => {
  const writes = [
    ['write', FILE_WRITE],
    ['flush, meaning commit', FILE_FLUSH],
    ['device control on a file', FILE_DEVCTRL],
    ['device control with no file', FILE_CONTROL],
  ] as const;

  for (const [name, command] of writes) {
    it(`refuses ${name}`, async () => {
      const inner = fakeTransport([]);
      const guarded = guardFileProtocol(inner);
      await assert.rejects(
        () => guarded.write(encodeFileRequest(command, [{ kind: 'byte', value: 1 }])),
        TransportError,
      );
      assert.equal(inner.sent.length, 0, 'nothing may reach the device');
    });
  }

  it('refuses an open for writing, by reading the mode off the bytes', async () => {
    const inner = fakeTransport([]);
    const guarded = guardFileProtocol(inner);
    const write = encodeFileRequest(FILE_OPEN, [
      { kind: 'string', value: '/cfg/usercfg' },
      { kind: 'string', value: 'W' },
      { kind: 'dword', value: 1024 },
    ]);
    await assert.rejects(() => guarded.write(write), TransportError);
    assert.equal(inner.sent.length, 0);
  });

  it('refuses a report that is not this protocol at all', async () => {
    const inner = fakeTransport([]);
    const guarded = guardFileProtocol(inner);
    const alien = new Uint8Array(FILE_REPORT_BYTES);
    alien[0] = 0x50; // READ_FLASH, which belongs to the other family
    await assert.rejects(() => guarded.write(alien), TransportError);
    assert.equal(inner.sent.length, 0);
  });

  it('passes the three reads', async () => {
    const inner = fakeTransport([]);
    const guarded = guardFileProtocol(inner);
    await guarded.write(
      encodeFileRequest(FILE_OPEN, [
        { kind: 'string', value: '/sys/sysinfo' },
        { kind: 'string', value: 'R' },
      ]),
    );
    await guarded.write(encodeFileRequest(FILE_READ, [{ kind: 'byte', value: 1 }]));
    await guarded.write(encodeFileRequest(FILE_CLOSE, [{ kind: 'byte', value: 1 }]));
    assert.equal(inner.sent.length, 3);
  });

  it('states its allow list as exactly four commands, one of them conditional', () => {
    assert.deepEqual(
      [...FILE_READ_ONLY_COMMANDS].sort((a, b) => a - b),
      [FILE_PING, FILE_OPEN, FILE_READ, FILE_CLOSE].sort((a, b) => a - b),
    );
  });

  it('refuses the ping form that carries a parameter, since that one restarts the link', async () => {
    const inner = fakeTransport([]);
    const guarded = guardFileProtocol(inner);
    await assert.rejects(
      () => guarded.write(encodeFileRequest(FILE_PING, [{ kind: 'byte', value: 0 }])),
      TransportError,
    );
    assert.equal(inner.sent.length, 0);
    // And the bare form passes, so the check is on the parameter and not on the command.
    await guarded.write(encodeFileRequest(FILE_PING, []));
    assert.equal(inner.sent.length, 1);
  });
});

describe('reading a file', () => {
  it('opens, reassembles the data packets, stops at the terminator and closes', async () => {
    const header = reply(FILE_READ);
    const first = new Uint8Array(FILE_REPORT_BYTES);
    first[0] = 0; // sequence
    first[1] = 4; // size
    first.set([0x61, 0x72, 0x63, 0x68], 2);
    const terminator = new Uint8Array(FILE_REPORT_BYTES);
    terminator[0] = READ_TERMINATOR;
    const transport = fakeTransport([
      reply(FILE_PING),
      reply(FILE_OPEN, { 5: 3, 7: 0, 8: 0, 9: 0, 10: 4 }),
      header,
      first,
      terminator,
      reply(FILE_CLOSE),
    ]);
    const bytes = await readFile(transport, '/sys/sysinfo');
    assert.equal(Buffer.from(bytes).toString('ascii'), 'arch');
    // Four commands went out, in order, and the last is the close, so no handle is left open. The
    // ping leads because a Harmony Touch refuses an open without one, which was measured and not
    // assumed: see section 198.
    assert.deepEqual(
      transport.sent.map((r) => r[1]),
      [FILE_PING, FILE_OPEN, FILE_READ, FILE_CLOSE],
    );
  });

  it('reads the mode off an open request the way the guard does', () => {
    const read = encodeFileRequest(FILE_OPEN, [
      { kind: 'string', value: '/sys/sysinfo' },
      { kind: 'string', value: 'R' },
    ]);
    const write = encodeFileRequest(FILE_OPEN, [
      { kind: 'string', value: '/sys/sysinfo' },
      { kind: 'string', value: 'W' },
      { kind: 'dword', value: 1 },
    ]);
    assert.equal(opensForReading(read), true);
    assert.equal(opensForReading(write), false);
    // A report it cannot parse counts as not a read, which is the safe direction.
    assert.equal(opensForReading(new Uint8Array(FILE_REPORT_BYTES)), false);
  });
});

describe('the identity file is text, and the firmware states its field names', () => {
  it('parses a name and a value per line', () => {
    const text = ['arch 0x10', 'skin 0x68', 'link_type hid', 'link_packet_length 64', ''].join('\n');
    const fields = parseSysInfo(text);
    assert.equal(fields.get('arch'), '0x10');
    assert.equal(fields.get('link_packet_length'), '64');
    assert.equal(fields.size, 4);
  });

  it(
    'carries the file names and field names that are in the Harmony 350 firmware',
    skipUnless('h350_code'),
    () => {
      const image = load('h350_code');
      assert.ok(image !== undefined);
      const text = Buffer.from(image).toString('latin1');
      // Every path this module lists is a NUL terminated string in the image, and so is every
      // identity field name. That is what makes this table firmware derived rather than client
      // sourced, which is the distinction decision 2 turns on.
      const NUL = '\u0000';
      for (const path of [...ARCH16_FILES, ...ARCH16_DIRECTORIES]) {
        // With the terminator, so a name that is only a prefix of another cannot pass for it:
        // `/sys/flags0` sits beside `/sys/flags1`, and `/fw` beside `/fw/safemode`.
        assert.ok(text.includes(path + NUL), `${path} should be a string in the image`);
      }
      for (const field of SYSINFO_FIELDS) {
        // A field name is followed by a space and then its value, so the space is the
        // terminator here. The two shapes are deliberately not merged: they differ.
        assert.ok(text.includes(field + ' '), `${field} should be a field name in the image`);
      }
      // And the counts are exact, so a name added to this module without reading the image fails.
      assert.equal(ARCH16_FILES.length, 19);
      assert.equal(ARCH16_DIRECTORIES.length, 4);
      assert.equal(SYSINFO_FIELDS.length, 11);
    },
  );
});
