/**
 * The **file protocol**, which is how the file based family is addressed. Read paths only.
 *
 * `docs/findings.md` section 198 is the derivation and `docs/usb-protocol.md` section 6 the
 * specification. In one paragraph: these remotes have no config address. They expose a small
 * filesystem, and a host opens a path, gets a handle, and reads through it. So none of
 * `protocol.ts` applies, which is why this file exists rather than a branch in there.
 *
 * **Two sources and they agree.** Logitech's own client states the packets, per skin, in the
 * templates section 197 found; and the Harmony 300 and 350 firmware, which is the only firmware
 * this project holds for a remote in this family, carries the **file name table** and the identity
 * file's own field names as strings. The second is the authority under decision 2, and it confirms
 * the first on every name the two have in common.
 *
 * **Nothing in this file writes, and that is enforced rather than intended.** Section 188's lesson
 * is that a rail on a method is no rail at all while the barrel exports the encoder, so the refusal
 * sits on the transport `openFileBasedRemote` returns: an allow list of the four commands that only
 * read, plus a check that an open asks for reading. There is no authorisation path here, because
 * there is nothing to authorise: this family's write commands are not implemented, and
 * `WRITES_ENABLED` therefore has nothing to enable.
 */
import { TransportError, type Transport, isFileBasedRemote, listFileBasedRemotes } from './transport.ts';

/**
 * The one service id, in 1629 of 1629 packets across all nineteen skins that speak this protocol.
 *
 * A "service" is Logitech's word, from the templates' own `<byte type="service.id">`. Only this one
 * value has ever been seen, so whether the field selects anything is unknown.
 */
export const FILE_SERVICE = 0xff;

/** Ping. With no parameter it is a plain ping; with one byte it restarts USB, so we never send it. */
export const FILE_PING = 0x00;
/** Open: a path string, a mode string, and for writing a size. Reply carries handle and size. */
export const FILE_OPEN = 0x01;
/** Write. Not implemented here and refused by the guard. */
export const FILE_WRITE = 0x03;
/** Read: a handle and how many packets to send. */
export const FILE_READ = 0x04;
/** Commit. Not implemented here and refused by the guard. */
export const FILE_FLUSH = 0x05;
/** Device control on an open file, which includes asking for a checksum. Refused by the guard. */
export const FILE_DEVCTRL = 0x06;
/** Close: a handle. */
export const FILE_CLOSE = 0x07;
/** A request with no file at all, which the client's comments call an HBus command. */
export const FILE_HBUS = 0x08;
/** Device control with no file: reset the filesystem, or reboot. Refused by the guard. */
export const FILE_CONTROL = 0xff;

/**
 * The commands this library will send to a remote of this family.
 *
 * **`FILE_PING` is on the list and its parameterless form only**, which is a correction rather than
 * a design. It was left off on the reasoning that the client's own template sends a ping with one
 * parameter whose comment says it simulates a USB reset, and that telling the two apart is one byte.
 * Then a Harmony Touch refused every open with the error marker set, identically for two paths and
 * both sequence numbers, and the client's own operation opens with a ping. So the ping is not a
 * courtesy, and the one byte that separates the two forms is checked in `guardFileProtocol` rather
 * than reasoned about: a ping carrying any parameter is refused.
 */
export const FILE_READ_ONLY_COMMANDS: ReadonlySet<number> = new Set([
  FILE_PING,
  FILE_OPEN,
  FILE_READ,
  FILE_CLOSE,
]);

/** The report size, and the firmware says so: `link_packet_length 64` in the identity file. */
export const FILE_REPORT_BYTES = 64;

/** Offsets in a request, and in a reply, which share their first three fields. */
export const OFFSET_SERVICE = 0;
export const OFFSET_COMMAND = 1;
export const OFFSET_SEQUENCE = 2;
export const OFFSET_PARAMETER_COUNT = 3;
/** In an open's reply: the handle, then a big endian `u32` size two bytes later. */
export const OFFSET_HANDLE = 5;
export const OFFSET_SIZE = 7;

/**
 * A reply whose sequence byte is this is an error, and every command in every template checks it.
 *
 * So the field is a sequence number on the way out and a status on the way back, which is why it
 * has two names in the templates and one offset.
 */
export const REPLY_ERROR = 0xff;

/** The last packet of a read carries this in its first byte and no payload. */
export const READ_TERMINATOR = 0xfe;

/** A parameter, tagged the way the templates tag theirs. */
export type FileParam =
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'byte'; readonly value: number }
  | { readonly kind: 'word'; readonly value: number }
  | { readonly kind: 'dword'; readonly value: number };

/**
 * Build one request report.
 *
 * **A request's strings are NUL terminated, and a reply's parameters are length prefixed.** Those
 * are two separate readings with different evidence, and merging them cost a round of hardware.
 *
 * The reply half rests on an offset closure and is the stronger of the two. Logitech's templates read
 * an open's reply at position 5 for the handle and position 7 for a four byte size, and never say
 * why. With a parameter count at 3, a length byte at 4, a one byte handle at 5, a length byte at 6
 * and four size bytes at 7, both constants and the width fall out; and a refusal reads
 * `ff 01 ff 01 01 0b`, which is one parameter of length one carrying `0x0b`. Nothing else explains a
 * count of 1 followed by two bytes.
 *
 * The request half is **measured and it is not the same**. Length prefixing the request was tried on
 * a Harmony Touch and drew **no reply at all**, where the NUL terminated form draws a reply that
 * refuses. Silence is weaker evidence than a refusal, and it says plainly that the length prefixed
 * request was the less acceptable of the two, so this encoder writes NUL terminated strings. Why the
 * NUL terminated open is still refused is section 198's open question.
 *
 * **A reply being framed differently from a request is not the tidy answer** and it is what the
 * evidence supports. The generalisation to both directions is the mistake that was made here, so it
 * is recorded rather than quietly reverted.
 *
 * Numbers are big endian, which is **not** inferred: an open's reply states its size big endian and
 * the templates say so with `int:BE`, and this protocol is the same way round in both directions in
 * every field whose order is stated.
 */
/**
 * The bytes of one request parameter.
 *
 * A string carries its NUL, because that is the form a remote of this family answers at all. See the
 * note on `encodeFileRequest` for why this differs from how a **reply** frames its parameters.
 */
function parameterBody(param: FileParam): Uint8Array {
  switch (param.kind) {
    case 'string':
      return new Uint8Array([...Buffer.from(param.value, 'ascii'), 0]);
    case 'byte':
      return new Uint8Array([param.value & 0xff]);
    case 'word':
      return new Uint8Array([(param.value >>> 8) & 0xff, param.value & 0xff]);
    case 'dword':
      return new Uint8Array([
        (param.value >>> 24) & 0xff,
        (param.value >>> 16) & 0xff,
        (param.value >>> 8) & 0xff,
        param.value & 0xff,
      ]);
  }
}

export function encodeFileRequest(
  command: number,
  params: readonly FileParam[],
  sequence = 0,
): Uint8Array {
  const report = new Uint8Array(FILE_REPORT_BYTES);
  report[OFFSET_SERVICE] = FILE_SERVICE;
  report[OFFSET_COMMAND] = command;
  report[OFFSET_SEQUENCE] = sequence;
  report[OFFSET_PARAMETER_COUNT] = params.length;
  let at = 4;
  const put = (byte: number): void => {
    if (at >= FILE_REPORT_BYTES) {
      throw new TransportError('the parameters do not fit in one report');
    }
    report[at] = byte;
    at += 1;
  };
  for (const param of params) {
    // No length prefix on a request: measured, see the note above.
    for (const byte of parameterBody(param)) put(byte);
  }
  return report;
}

export interface FileReply {
  readonly service: number;
  readonly command: number;
  /** The sequence number echoed, or `REPLY_ERROR`. */
  readonly sequence: number;
  readonly bytes: Uint8Array;
}

/** Split a reply into its three stated fields and keep the whole report, which the callers index. */
export function decodeFileReply(report: Uint8Array): FileReply {
  if (report.length < 4) throw new TransportError(`a reply of ${report.length} bytes is too short`);
  return {
    service: report[OFFSET_SERVICE] as number,
    command: report[OFFSET_COMMAND] as number,
    sequence: report[OFFSET_SEQUENCE] as number,
    bytes: report,
  };
}

/**
 * Check a reply is the answer to the command we sent and is not the error marker.
 *
 * Both halves matter and the second is the one the templates spell out: this protocol signals a
 * failure by setting the sequence byte to `0xFF` rather than by a status code, so a caller that only
 * matched the command id would read an error reply's payload as data.
 */
export function expectFileReply(reply: FileReply, command: number): FileReply {
  if (reply.service !== FILE_SERVICE) {
    throw new TransportError(
      `reply names service 0x${reply.service.toString(16)}, not 0x${FILE_SERVICE.toString(16)}`,
    );
  }
  if (reply.command !== command) {
    throw new TransportError(
      `reply answers command 0x${reply.command.toString(16)}, not 0x${command.toString(16)}`,
    );
  }
  if (reply.sequence === REPLY_ERROR) {
    throw new TransportError(`the remote refused command 0x${command.toString(16)}`);
  }
  return reply;
}

function beU32(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] as number) << 24) |
    ((bytes[at + 1] as number) << 16) |
    ((bytes[at + 2] as number) << 8) |
    (bytes[at + 3] as number)
  );
}

export interface OpenFile {
  readonly handle: number;
  readonly size: number;
}

/** Every path the Harmony 300 and 350 firmware names, in the order its own pool holds them.
 *
 * Read out of the image rather than out of the client, which is why it includes five names no
 * template mentions. Four of them are directories, listed separately, and `/cfg/usercfg` is the
 * one worth knowing: it is where a remote of this family keeps the configuration this project
 * exists to read.
 *
 * **Per architecture, and this list is arch 16's.** A Harmony Touch's templates name
 * `/rf/deviceinfo` and `/sys/hlapi`, which are absent here and describe hardware a Harmony 350
 * does not have, so a path is not assumed to exist on a model until that model answers for it.
 */
export const ARCH16_FILES: readonly string[] = [
  '/fw/safemode',
  '/fw/normalmode',
  '/fw/bootloader',
  '/fw/embeddedcfg',
  '/cfg/usercfg',
  '/sys/sysinfo',
  '/sys/guid',
  '/sys/pid',
  '/sys/sku',
  '/fw/config_bits',
  '/ir/ir_cap',
  '/cfg/state',
  '/cfg/log',
  '/sys/state',
  '/sys/battery',
  '/sys/flags0',
  '/sys/flags1',
  '/sys/flags2',
  '/sys/flags3',
];

export const ARCH16_DIRECTORIES: readonly string[] = ['/fw', '/ir', '/cfg', '/sys'];

/** The identity file's field names, as strings in the Harmony 300 and 350 firmware, in order. */
export const SYSINFO_FIELDS: readonly string[] = [
  'arch',
  'skin',
  'usb_vendor_id',
  'usb_product_id',
  'fw_ver',
  'fw_type',
  'hw_ver',
  'link_hw',
  'link_type',
  'link_packet_length',
  'guid',
];

const REPLY_TIMEOUT_MS = 5000;

async function exchange(
  transport: Transport,
  command: number,
  params: readonly FileParam[],
): Promise<FileReply> {
  await transport.write(encodeFileRequest(command, params));
  const report = await transport.read(REPLY_TIMEOUT_MS);
  if (report === undefined) {
    throw new TransportError(
      `no reply to command 0x${command.toString(16)} within ${REPLY_TIMEOUT_MS} ms`,
    );
  }
  return expectFileReply(decodeFileReply(report), command);
}

/**
 * Open a path for reading. The mode is fixed to `R` here and the guard checks it too.
 *
 * Two rails in front of one byte looks redundant and is not: this function is the convenient path
 * and the guard is the one a caller cannot go around, per section 188.
 */
export async function openFileForReading(transport: Transport, path: string): Promise<OpenFile> {
  const reply = await exchange(transport, FILE_OPEN, [
    { kind: 'string', value: path },
    { kind: 'string', value: 'R' },
  ]);
  return {
    handle: reply.bytes[OFFSET_HANDLE] as number,
    size: beU32(reply.bytes, OFFSET_SIZE),
  };
}

export async function closeFile(transport: Transport, handle: number): Promise<void> {
  await exchange(transport, FILE_CLOSE, [{ kind: 'byte', value: handle }]);
}

/**
 * Read a whole open file.
 *
 * The request asks for a number of packets and the remote answers with data packets until it sends
 * one whose first byte is the terminator. A data packet states its own sequence number and size,
 * so the payload is bounded by the packet rather than by the report, which is what lets a final
 * partial packet be read without knowing the file size first. `size` is still used as a stop, since
 * a protocol that never terminates has to be bounded by something the caller stated.
 */
export async function readOpenFile(
  transport: Transport,
  handle: number,
  size: number,
  packetsPerRequest = 32,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < size) {
    await transport.write(
      encodeFileRequest(FILE_READ, [
        { kind: 'byte', value: handle },
        { kind: 'byte', value: packetsPerRequest },
      ]),
    );
    let sawTerminator = false;
    for (let packet = 0; packet < packetsPerRequest; packet += 1) {
      const report = await transport.read(REPLY_TIMEOUT_MS);
      if (report === undefined) {
        throw new TransportError(`the read stopped after ${total} of ${size} bytes`);
      }
      if (report[0] === READ_TERMINATOR) {
        sawTerminator = true;
        break;
      }
      // A data packet: sequence at 0, size at 1, payload from 2. The first report of a read also
      // repeats the request's own header, which `expectFileReply` is used on rather than skipped.
      if (report[OFFSET_SERVICE] === FILE_SERVICE && report[OFFSET_COMMAND] === FILE_READ) {
        expectFileReply(decodeFileReply(report), FILE_READ);
        continue;
      }
      const length = Math.min(report[1] as number, report.length - 2);
      chunks.push(report.slice(2, 2 + length));
      total += length;
    }
    if (sawTerminator) break;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

/**
 * A bare ping: does this remote answer at all.
 *
 * Four bytes, no parameters. Their own client sends one before every file operation, and a Harmony
 * Touch refuses an open without it, so this is part of a session rather than a diagnostic.
 */
export async function pingFileRemote(transport: Transport): Promise<FileReply> {
  return exchange(transport, FILE_PING, []);
}

/** Ping, open, read, close. Four commands, none of which changes a byte on the remote. */
export async function readFile(transport: Transport, path: string): Promise<Uint8Array> {
  await pingFileRemote(transport);
  const open = await openFileForReading(transport, path);
  try {
    return await readOpenFile(transport, open.handle, open.size);
  } finally {
    // Close even on a failed read: a handle left open is state on the remote, and the close is
    // itself a read as far as storage is concerned.
    await closeFile(transport, open.handle).catch(() => undefined);
  }
}

/**
 * The identity file, parsed into its fields.
 *
 * Text rather than a packed block, which is the surprise of this family: `arch 0x10`, one field per
 * line, name then a space then a value. The firmware holds every one of those names as a string, so
 * the parse is checked against the image and not only against a reply.
 */
export function parseSysInfo(text: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    const space = trimmed.indexOf(' ');
    if (space < 0) {
      fields.set(trimmed, '');
      continue;
    }
    fields.set(trimmed.slice(0, space), trimmed.slice(space + 1));
  }
  return fields;
}

export async function readSysInfo(transport: Transport): Promise<Map<string, string>> {
  const bytes = await readFile(transport, '/sys/sysinfo');
  return parseSysInfo(Buffer.from(bytes).toString('ascii'));
}

/**
 * A transport for a remote of this family, refusing everything that is not one of the three reads.
 *
 * Separate from `guardMutations` on purpose. That one keys on the high nibble of byte 0, which is
 * this protocol's fixed service id, so it would classify every packet here as one command. Two
 * protocols cannot share one allow list, and a guard that silently misreads a protocol is worse
 * than no guard.
 */
export function guardFileProtocol(inner: Transport): Transport {
  return {
    async write(report: Uint8Array): Promise<void> {
      const service = report[OFFSET_SERVICE] ?? 0;
      const command = report[OFFSET_COMMAND] ?? 0;
      if (service !== FILE_SERVICE) {
        throw new TransportError(
          `refusing a report whose service is 0x${service.toString(16)}: this transport speaks the ` +
            'file protocol and nothing else',
        );
      }
      if (!FILE_READ_ONLY_COMMANDS.has(command)) {
        throw new TransportError(
          `refusing file protocol command 0x${command.toString(16)}: only open, read and close are ` +
            'implemented, and the rest of this family\'s commands write. Nothing here has ever ' +
            'written to a remote.',
        );
      }
      if (command === FILE_OPEN && !opensForReading(report)) {
        throw new TransportError(
          'refusing an open whose mode is not R: opening for writing creates or truncates a file',
        );
      }
      if (command === FILE_PING && (report[OFFSET_PARAMETER_COUNT] ?? 0) !== 0) {
        // Their own template's comment on the one parameter form: it simulates a USB reset. A bare
        // ping asks the remote whether it is there and does nothing else.
        throw new TransportError(
          'refusing a ping that carries a parameter: that form restarts the USB link',
        );
      }
      await inner.write(report);
    },
    read(timeoutMs: number): Promise<Uint8Array | undefined> {
      return inner.read(timeoutMs);
    },
    close(): Promise<void> {
      return inner.close();
    },
  };
}

/**
 * Whether an open request asks for reading, read off the bytes rather than trusted from a caller.
 *
 * The mode is the second string parameter, so this walks the first string to its terminator and
 * checks what follows is exactly `R` and a NUL. A mode of `W` with a size after it is the write
 * form, and anything this cannot parse is treated as not a read, which is the safe direction.
 */
export function opensForReading(report: Uint8Array): boolean {
  let at = 4;
  while (at < report.length && report[at] !== 0) at += 1;
  at += 1; // past the path's own terminator
  // Exactly `R` and then its terminator. Anything else, including a report this walk runs off the
  // end of, counts as not a read, which is the safe direction for a guard.
  return report[at] === 0x52 /* R */ && report[at + 1] === 0;
}

/**
 * Open a remote of the **file based** family, for reading.
 *
 * **Deliberately a second function rather than widening `openHarmony`.** That one gates the command
 * protocol and refuses this family by product id, and it keeps doing so: a caller that reaches for
 * it has flash addresses in mind and should still be refused. This is a different protocol with a
 * different allow list, so it gets its own door, which is the same shape as `isFileBasedRemote`
 * being a second predicate rather than a hole in `isHarmony`.
 */
export async function openFileBasedRemote(
  select: { readonly productId?: number; readonly path?: string } = {},
): Promise<Transport> {
  const all = await listFileBasedRemotes();
  const candidates = all.filter(
    (d) =>
      (select.productId === undefined || d.productId === select.productId) &&
      (select.path === undefined || d.path === select.path),
  );
  if (candidates.length === 0) {
    throw new TransportError(
      all.length === 0
        ? 'no remote of the file based family is attached'
        : `no attached remote of that family matches the selector; attached: ${all
            .map((d) => `0x${d.productId.toString(16)}`)
            .join(', ')}`,
    );
  }
  if (candidates.length > 1) {
    // The same reason `openHarmony` refuses: two identical units must not be resolved by order.
    throw new TransportError(
      `${candidates.length} remotes match; pass a path to say which. Attached: ${all
        .map((d) => `0x${d.productId.toString(16)} at ${d.path ?? 'no path'}`)
        .join(', ')}`,
    );
  }
  const found = candidates[0];
  if (found === undefined || found.path === undefined) {
    throw new TransportError('the remote reported no device path');
  }
  if (!isFileBasedRemote(found.vendorId, found.productId)) {
    throw new TransportError('that device is not in the file based family');
  }
  const hid = await import('node-hid');
  return guardFileProtocol(transportOverFileDevice(new hid.HID(found.path)));
}

/** Local copy of the node-hid wrapper's shape, so this file does not depend on its internals. */
function transportOverFileDevice(device: {
  write(data: number[] | Uint8Array): number;
  readTimeout(timeoutMs: number): number[];
  close(): void;
}): Transport {
  return {
    async write(report: Uint8Array): Promise<void> {
      const written = device.write(Array.from(report));
      if (written !== report.length) {
        throw new TransportError(`wrote ${written} of ${report.length} bytes`);
      }
    },
    async read(timeoutMs: number): Promise<Uint8Array | undefined> {
      const data = device.readTimeout(timeoutMs);
      return data === undefined || data.length === 0 ? undefined : new Uint8Array(data);
    },
    async close(): Promise<void> {
      device.close();
    },
  };
}
