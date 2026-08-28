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
  INERT_PATHS,
  OFFSET_HANDLE,
  OFFSET_SIZE,
  READ_TERMINATOR,
  REPLY_ERROR,
  STRING_PREFIX,
  SYSINFO_FIELDS,
  decodeFileReply,
  encodeFileRequest,
  expectFileReply,
  guardFileProtocol,
  modeLetters,
  opensForReading,
  parseSysInfo,
  readFile,
  requestedPath,
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
  it('prefixes a string with 0x80 and terminates it, per their own encoder', () => {
    const report = encodeFileRequest(FILE_OPEN, [
      { kind: 'string', value: '/sys/sysinfo' },
      { kind: 'string', value: 'R' },
    ]);
    assert.equal(report.length, FILE_REPORT_BYTES);
    assert.equal(report[0], FILE_SERVICE);
    assert.equal(report[1], FILE_OPEN);
    assert.equal(report[2], 0, 'the sequence number');
    assert.equal(report[3], 2, 'two parameters');
    assert.equal(report[4], STRING_PREFIX, 'a string states no length, only bit 7');
    assert.equal(Buffer.from(report.slice(5, 17)).toString('ascii'), '/sys/sysinfo');
    assert.equal(report[17], 0, 'and then its terminator');
    assert.equal(report[18], STRING_PREFIX, 'the mode is a string too');
    assert.equal(report[19], 0x52, 'R');
    assert.equal(report[20], 0);
  });

  it('states a width for every other type', () => {
    const report = encodeFileRequest(FILE_READ, [
      { kind: 'byte', value: 0x0b },
      { kind: 'dword', value: 0x01020304 },
    ]);
    assert.equal(report[4], 1, 'a byte parameter says one');
    assert.equal(report[5], 0x0b);
    assert.equal(report[6], 4, 'a dword parameter says four');
    assert.deepEqual(Array.from(report.slice(7, 11)), [0x01, 0x02, 0x03, 0x04]);
  });

  it('puts a reply handle at 5 and a size at 7, which is why the templates can be constant', () => {
    // The closure, and the reason to believe the framing beyond having read one function: an open's
    // reply is a byte parameter then a dword parameter, so the handle and the size land exactly
    // where Logitech's templates read them, and the size's stated width comes out too.
    assert.equal(OFFSET_HANDLE, 5);
    assert.equal(OFFSET_SIZE, 7);
    const asReply = encodeFileRequest(FILE_OPEN, [
      { kind: 'byte', value: 0x0b },
      { kind: 'dword', value: 0x000000ff },
    ]);
    assert.equal(asReply[OFFSET_HANDLE], 0x0b);
    assert.equal(asReply[OFFSET_SIZE + 3], 0xff);

    // And a real refusal from a Harmony Touch decodes as one byte parameter carrying 0x0b.
    const refusal = Uint8Array.from([FILE_SERVICE, FILE_OPEN, REPLY_ERROR, 0x01, 0x01, 0x0b]);
    assert.equal(decodeFileReply(refusal).sequence, REPLY_ERROR);
    assert.equal(refusal[4], 1);
    assert.equal(refusal[5], 0x0b);
  });

  it('writes a size big endian, which is the one byte order this protocol states', () => {
    const report = encodeFileRequest(FILE_READ, [{ kind: 'dword', value: 0x01020304 }]);
    assert.deepEqual(Array.from(report.slice(5, 9)), [0x01, 0x02, 0x03, 0x04]);
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

  it('refuses a path that is not evidently inert, because a path can be an action', async () => {
    // The near miss this rail exists for: /sys/factoryreset and /sys/reboot both open for reading
    // on a Harmony Touch. Section 200.
    const inner = fakeTransport([]);
    const guarded = guardFileProtocol(inner);
    for (const path of ['/sys/factoryreset', '/sys/reboot', '/fw/otaupdate', '/tde/enable']) {
      await assert.rejects(
        () =>
          guarded.write(
            encodeFileRequest(FILE_OPEN, [
              { kind: 'string', value: path },
              { kind: 'string', value: 'R' },
            ]),
          ),
        TransportError,
        `${path} must not be openable without the named door`,
      );
    }
    assert.equal(inner.sent.length, 0);
  });

  it('allows the paths that return contents and do nothing else', async () => {
    const inner = fakeTransport([]);
    const guarded = guardFileProtocol(inner);
    for (const path of INERT_PATHS) {
      await guarded.write(
        encodeFileRequest(FILE_OPEN, [
          { kind: 'string', value: path },
          { kind: 'string', value: 'R' },
        ]),
      );
    }
    assert.equal(inner.sent.length, INERT_PATHS.length);
    // Neither control is on the list, which is the claim rather than the count.
    assert.ok(!INERT_PATHS.includes('/sys/factoryreset'));
    assert.ok(!INERT_PATHS.includes('/sys/reboot'));
  });

  it('reads the path off the request rather than trusting a caller', () => {
    const report = encodeFileRequest(FILE_OPEN, [
      { kind: 'string', value: '/sys/sysinfo' },
      { kind: 'string', value: 'R' },
    ]);
    assert.equal(requestedPath(report), '/sys/sysinfo');
    assert.equal(requestedPath(new Uint8Array(FILE_REPORT_BYTES)), undefined);
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

  it('cuts a padded final packet to the size the open reply stated', async () => {
    // Section 201, measured on a Harmony Touch: the last data packet does not declare itself short.
    // It declares a full payload and pads with NUL, so the file's own stated size is the only place
    // its end is stated. Here the file is five bytes and the packet claims twelve.
    const payload = new Uint8Array(12);
    payload.set([0x61, 0x72, 0x63, 0x68, 0x0a], 0);
    const packet = new Uint8Array(FILE_REPORT_BYTES);
    packet[0] = 0; // sequence
    packet[1] = payload.length;
    packet.set(payload, 2);
    const terminator = new Uint8Array(FILE_REPORT_BYTES);
    terminator[0] = READ_TERMINATOR;
    const transport = fakeTransport([
      reply(FILE_PING),
      reply(FILE_OPEN, { 5: 3, 7: 0, 8: 0, 9: 0, 10: 5 }),
      reply(FILE_READ),
      packet,
      terminator,
      reply(FILE_CLOSE),
    ]);
    const bytes = await readFile(transport, '/sys/sysinfo');
    assert.equal(bytes.length, 5);
    assert.equal(Buffer.from(bytes).toString('ascii'), 'arch\n');
  });

  it('a short read is returned short rather than padded, so a caller can see it', async () => {
    // The other direction, and it must not be filled in: fewer bytes than the open stated is a
    // measurement about the transfer, and padding it to the stated size would hide that.
    const packet = new Uint8Array(FILE_REPORT_BYTES);
    packet[0] = 0;
    packet[1] = 2;
    packet.set([0x6f, 0x6b], 2);
    const terminator = new Uint8Array(FILE_REPORT_BYTES);
    terminator[0] = READ_TERMINATOR;
    const transport = fakeTransport([
      reply(FILE_PING),
      reply(FILE_OPEN, { 5: 3, 7: 0, 8: 0, 9: 0, 10: 40 }),
      reply(FILE_READ),
      packet,
      terminator,
      reply(FILE_CLOSE),
    ]);
    const bytes = await readFile(transport, '/sys/sysinfo');
    assert.equal(bytes.length, 2);
  });

  it('the padding parsed as a field, which is what the count in section 200 was', () => {
    // The consequence the truncation prevents, pinned without hardware. `trim()` strips whitespace
    // and NUL is not whitespace, so a run of padding becomes a line, and a line with no space
    // becomes a field with an empty value. That is the whole difference between the
    // `fifteen fields` <!--superseded--> section 200 first reported and the fourteen a Harmony Touch
    // actually states.
    const stated = 'arch 0x11\nskin 0x63\n';
    const padded = stated + '\u0000\u0000\u0000\u0000';
    assert.equal(parseSysInfo(stated).size, 2);
    assert.equal(parseSysInfo(padded).size, 3);
  });

  it('refuses a write mode under every framing, not only the believed one', () => {
    // Two framings are refuted and still read, because a guard must refuse a write under any
    // reading a remote might take. So a report that says W under any of the three is not a read.
    const write = encodeFileRequest(FILE_OPEN, [
      { kind: 'string', value: '/cfg/usercfg' },
      { kind: 'string', value: 'W' },
      { kind: 'dword', value: 1 },
    ]);
    assert.equal(opensForReading(write), false);
    assert.ok(modeLetters(write).includes('W'));
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
