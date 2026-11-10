/**
 * The **file protocol**, which is how the file based family is addressed. Read paths only.
 *
 * `docs/findings.md` section 198 is the derivation and `reference/usb-protocol/file-protocol.md` the
 * specification. In one paragraph: these remotes address their storage by **name** rather than by
 * address over USB. They expose a small filesystem, and a host opens a path, gets a handle, and reads
 * through it. So none of `protocol.ts` applies, which is why this file exists rather than a branch in
 * there.
 *
 * **The config does have an address and this file said it does not**, section 199. The remote's own
 * file table gives each name a medium, an offset and a size, and `/cfg/usercfg` is external flash
 * `0x020000` for 256 KiB on a Harmony 350. It is the **host** that has no address, because this
 * protocol offers no way to ask for one, which is a different claim and the one to keep.
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
 * read, plus a check that an open asks for reading.
 *
 * **The write path exists, and it is not in this file.** It is
 * `filewrite.ts`, which the barrel does not re-export, behind `assertFileWriteAllowed` in `rails.ts`.
 * This said "there is no authorisation path here, because there is nothing to
 * authorise"<!--superseded--> until then. What the guard below gained is the second half of the
 * command protocol's arrangement, section 224: a report on the **write route's own allow list**,
 * `onTheFileWriteRoute`, passes only when `filewrite.ts` has authorised exactly those bytes through
 * `authorise.ts` and both write flags are set. Everything else is refused as before, so a caller
 * holding this transport still has no way to send a write, and the route reaches `/cfg/usercfg` and no
 * other path even for a caller who reaches the hatch by a deep import.
 *
 * **A second route: a Harmony Touch's request channel**, `/sys/hlapi`, which
 * `touchsession.ts` drives behind `assertTouchRequestAllowed`. Its reports pass on the same three
 * conditions with that route's own flag, and on a fourth the file write route does not need: the name
 * a request line opens with is decoded off its first data packet and checked against the allow list,
 * `onTheTouchRequestRoute`, a name of the recovery tier only while `HARMONY_TOUCH_RECOVERY` is set as well,
 * `touchRequestOfLineStart` in `rails.ts`. And a short list of paths is refused at any open whatever the flags,
 * `NEVER_OPENED_PATHS`, since their handlers are read and they act; a path not spelled as the remote's
 * names are is refused before any list is consulted, `isCanonicalPath`, so an exact comparison cannot be
 * walked round by a variant spelling.
 */
import { sameBytes } from '@harmony/base/bytes';
import { takeAuthorisation } from './authorise.ts';
import {
  FILE_WRITE_DOOR,
  FILE_WRITE_PATHS,
  TOUCH_REQUEST_DOOR,
  TOUCH_REQUEST_PATH,
  TOUCH_ANNOUNCEMENT_TEXT,
  WRITES_ENABLED,
  touchArgumentsAfter,
  touchRequestOfLineStart,
} from './rails.ts';
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
/** Write. Refused by the guard unless `filewrite.ts` authorised it, see `onTheFileWriteRoute`. */
export const FILE_WRITE = 0x03;
/** Read: a handle and how many packets to send. */
export const FILE_READ = 0x04;
/** Commit. Refused by the guard unless `filewrite.ts` authorised it. */
export const FILE_FLUSH = 0x05;
/**
 * Device control on an open file, which includes asking for a checksum. Refused by the guard unless
 * `filewrite.ts` authorised it, and then only the check, subcommand 1.
 */
export const FILE_DEVCTRL = 0x06;
/** Close: a handle. */
export const FILE_CLOSE = 0x07;
/** A request with no file at all, which the client's comments call an HBus command. */
export const FILE_HBUS = 0x08;
/**
 * Device control with no file: reset the filesystem, or reboot. Refused by the guard unless
 * `filewrite.ts` authorised it, and then only the two parameters the write route sends.
 */
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
 * **Every parameter carries a prefix and the prefix depends on the type**, which is read out of
 * Logitech's own encoder rather than inferred: `molsonparamwriter.getBytes` in the mirrored client.
 *
 * | type | on the wire |
 * |---|---|
 * | string | `0x80`, the characters, then a NUL |
 * | byte, word, triple, dword | the length in bytes, then the bytes |
 * | byte array, sized string | the length with bit 7 set, then the bytes |
 *
 * So `0x80` is a length field with its high bit set and no length, which is what marks the
 * terminated form. Two guesses were tried on hardware before this was read and both are refuted: a
 * bare NUL terminated string draws a refusal, and a plain length prefix draws no reply at all.
 *
 * **The closure is the templates' own constants.** They read an open's reply at position 5 for the
 * handle and position 7 for a four byte size and never say why. Under this rule the reply is a count
 * at 3, then a byte parameter `01 <handle>` at 4 and 5, then a dword parameter `04 <size>` at 6 and
 * 7 to 10. Both constants and the width fall out, and a refusal reads `ff 01 ff 01 01 0b`, which is
 * one byte parameter carrying `0x0b`.
 *
 * Numbers are big endian, which is **not** inferred: an open's reply states its size big endian and
 * the templates say so with `int:BE`, and this protocol is the same way round in both directions in
 * every field whose order is stated.
 */
/** The prefix byte a string parameter carries: a length field with bit 7 set and no length. */
export const STRING_PREFIX = 0x80;

/**
 * One request parameter, prefix and all, exactly as `molsonparamwriter.getBytes` builds it.
 *
 * A string is the odd one and it is the one the templates use most: prefix, characters, terminator.
 * Everything else states its own width.
 */
function encodeParameter(param: FileParam): Uint8Array {
  switch (param.kind) {
    case 'string':
      return new Uint8Array([STRING_PREFIX, ...Buffer.from(param.value, 'ascii'), 0]);
    case 'byte':
      return new Uint8Array([1, param.value & 0xff]);
    case 'word':
      return new Uint8Array([2, (param.value >>> 8) & 0xff, param.value & 0xff]);
    case 'dword':
      return new Uint8Array([
        4,
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
    for (const byte of encodeParameter(param)) put(byte);
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
 * so the payload is bounded by the packet rather than by the report.
 *
 * **A data packet's own length is padded and the file's stated size is the only authority for where
 * it ends**, section 201, and this used to return the padding as content: measured on a Harmony
 * Touch, an 83 byte file came back as 124 bytes and a 234 byte one as 248, the surplus being NUL to
 * the packet boundary. So a caller saw a file that was not text, and section 198's reading that
 * `a final partial packet can be read without knowing the file size first`<!--superseded--> was
 * wrong, because the last packet does not declare itself short. The result is cut to `size` here.
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
  const assembled = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    assembled.set(chunk, at);
    at += chunk.length;
  }
  // Cut to the size the open reply stated. A short read is left as it is rather than padded, so a
  // caller that gets fewer bytes than it asked for can still see that it did.
  return total > size ? assembled.slice(0, size) : assembled;
}

/**
 * A bare ping: does this remote answer at all.
 *
 * Four bytes, no parameters. Their own client sends one before every file operation, so this is kept
 * as part of a session rather than a diagnostic.
 *
 * **It is not what makes an open succeed, and this said a Harmony Touch refuses an open without it.**
 * Measured and refuted before the framing was fixed, section 200: a bare ping draws no reply and the
 * open after it draws none either. What was actually missing was the string parameter's encoding,
 * `0x80` then the characters then a NUL, read out of Logitech's own encoder. The ping stays because
 * their client sends it and matching their session shape costs nothing; claiming the remote demands
 * it is a hardware fact this project measured the other way.
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
 * The paths this library will open, and **the reason this list exists is a near miss.**
 *
 * A Harmony Touch's `/sys/factoryreset` and `/sys/reboot` were opened here, on 28 August 2026, while
 * probing which paths exist, and nothing happened. That looked like luck, and this rail was built on
 * the fear that it was. Reading the native program later showed those two act on a **write**, not on
 * an open, so opening them was in fact safe; but it also showed that on this model some names **do**
 * act on an open for reading, the vibration test names `/tde/haptic/diagnostic` and
 * `/tde/haptic/calibrate`. So on this protocol **a path can be an action**, and opening one for
 * reading is a plausible way to trigger it: the read and write distinction this project relies on
 * everywhere else does not survive contact with a filesystem whose files are controls.
 *
 * So the mode check is not sufficient and this list is the rail. It holds only paths that are
 * **evidently inert**: they carry a size, they return their contents, and nothing about their name or
 * their entry in the Harmony 300 and 350 file table suggests an effect. Everything else, including
 * every `/fw` path, the streams and the controls, needs `HARMONY_FILE_PATH_EXPERIMENT=1`, which is a
 * named door in the manner of `HARMONY_ODD_READ_EXPERIMENT` rather than a source edit.
 */
export const INERT_PATHS: readonly string[] = [
  '/sys/sysinfo',
  '/rf/deviceinfo',
  '/sys/guid',
  '/sys/pid',
  '/sys/sku',
  '/sys/battery',
  '/sys/flags0',
  '/sys/flags1',
  '/sys/flags2',
  '/sys/flags3',
  '/cfg/usercfg',
  '/cfg/log',
];

/** Whether the named door for opening a path outside `INERT_PATHS` is open. */
export const PATH_EXPERIMENT_ALLOWED = process.env['HARMONY_FILE_PATH_EXPERIMENT'] === '1';

/**
 * The paths this library never opens, for reading or for writing, **whatever the flags**, the named door
 * `HARMONY_FILE_PATH_EXPERIMENT` included: on a Harmony Touch their handlers are read and they act,
 * `reference/architectures/harmony-touch/api/names.md` "The names that act: on a write, and on an open",
 * so there is nothing left to probe and nothing a session of this project wants from them.
 *
 * * `/sys/factoryreset` and `/sys/reboot` arm a factory reset and restart the remote on a write, and
 *   `/tde/shipmode` and `/tde/fb` put it into shipping mode and run a framebuffer test on one
 * * `/tde/haptic/diagnostic` and `/tde/haptic/calibrate` run the vibration motor's self test and its
 *   calibration **when opened for reading**, which is why this list refuses an open of any mode
 * * `/fw/otaupdate` and `/fw/hub-otaupdate` take a firmware package to install
 *
 * The door stays in front of every other path not known to be inert, the Touch names whose open handlers
 * are not read among them. **The Harmony 300 and 350's `/fw/` names are not here**: their images were read
 * through the door for reading, and the file write route refuses them for writing, `FILE_WRITE_PATHS`.
 */
export const NEVER_OPENED_PATHS: readonly string[] = [
  '/sys/factoryreset',
  '/sys/reboot',
  '/tde/shipmode',
  '/tde/fb',
  '/tde/haptic/diagnostic',
  '/tde/haptic/calibrate',
  '/fw/otaupdate',
  '/fw/hub-otaupdate',
];

/**
 * The path an open request names, decoded off the bytes rather than taken from a caller.
 *
 * **Decoded one character per byte, high bytes kept.** It decoded as Node's `ascii` until the review of
 * the request rail, and that decoding clears the high bit of every byte, so the bytes of
 * `/sys/sysinf` and `0xEF` came out as `/sys/sysinfo` and would have passed the inert list as a path the
 * remote was never sent. `latin1` keeps every byte as itself, so a path with a byte above `0x7E` compares
 * equal to no name on any list, and `isCanonicalPath` refuses it.
 */
export function requestedPath(report: Uint8Array): string | undefined {
  if (report[4] !== STRING_PREFIX) return undefined;
  let at = 5;
  const bytes: number[] = [];
  while (at < report.length && report[at] !== 0) {
    bytes.push(report[at] as number);
    at += 1;
  }
  return at < report.length ? Buffer.from(bytes).toString('latin1') : undefined;
}

/**
 * Whether a path is in the one spelling every name on this protocol has: printable characters with no
 * space, lower case, a leading `/`, no empty segment (so no `//`), no `.` or `..` segment and no trailing
 * `/`.
 *
 * **Why the guard asks this before it compares a path with any list.** Every list here compares a path
 * whole and exact, and nothing has read whether the remote's native name table matches a path the same
 * way. So `/sys//reboot`, `/sys/./reboot`, `/SYS/REBOOT`, `/sys/reboot/` and `//sys/reboot` each compare
 * unequal to `/sys/reboot` while the remote might resolve any of them to it; the review of the request
 * rail sent all five through the guard with the experiment door open and each went out. A path that is not
 * canonical is refused at any open, whatever the flags, so the exact comparison and the remote's matching
 * cannot disagree about a name this library refuses. Every name in the native program's tables, the
 * Touch's and the Harmony 300 and 350's, is canonical by this rule, so nothing a session needs is lost.
 */
export function isCanonicalPath(path: string): boolean {
  if (!/^[\x21-\x7e]+$/.test(path) || /[A-Z]/.test(path)) return false;
  if (!path.startsWith('/') || path.endsWith('/')) return false;
  return path.slice(1).split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

/**
 * The parameter of `FILE_CONTROL` that resets the file system, which on the Harmony 300 and 350's 1.4
 * firmware closes whatever file is open and does nothing else, `tests/harmony_300_350/test_harmony_350_file_write.py`.
 * Logitech's client sends it first so that a handle an interrupted attempt left open cannot make the
 * open refuse.
 */
export const FILE_RESET_FILESYSTEM = 0x66;

/**
 * The parameter of `FILE_CONTROL` that reboots the remote: a processor reset after a short delay, with
 * nothing on the way that writes flash, read in the same firmware. `0x62` and `0x6E` do the same and are
 * never sent; `0x73` stores a request first and `0x75` is unread, and neither is on the write route.
 */
export const FILE_REBOOT = 0x00;

/** The device control subcommand that asks the remote to check a written file, the only one sent. */
export const FILE_CHECK = 0x01;

/**
 * A data packet's sequence numbers run 0 to 63 and wrap, one counter for a whole operation, commands
 * and data packets alike: Logitech's client, `tests/logitech/test_file_family_write_route.py`. So a data packet's
 * first byte is never `FILE_SERVICE`, which is what lets the guard tell one from a command.
 */
export const SEQUENCE_MODULUS = 64;

/**
 * The packet that ends a write: one byte, `0x7E`, padded. The firmware parses it as a data packet of
 * length zero and answers the chunk it ends with `0x80 | 0x7E`, `0xFE`; it takes no sequence number.
 */
export const DONE_PACKET = 0x7e;

/**
 * A data packet's payload: the report less its sequence byte and its length byte. The firmware reads
 * the length from the low six bits, so a packet can state at most 63, and 62 fits.
 */
export const DATA_PACKET_PAYLOAD = FILE_REPORT_BYTES - 2;

/** Whether every byte from `from` on is zero, which is how every packet here is padded. */
function zeroFrom(report: Uint8Array, from: number): boolean {
  for (let i = from; i < report.length; i += 1) if (report[i] !== 0) return false;
  return true;
}

/**
 * Whether a report is one the file write route sends, judged on its bytes alone.
 *
 * **This is the allow list the write path adds to the transport, and an authorisation is not enough
 * without it.** `guardFileProtocol` sends a report outside the read allow list only when it was
 * authorised byte for byte **and** it is one of these shapes **and** both write flags are set. So even a
 * caller who imports `authorise.ts` by path, which is the deliberate act section 224 left possible, can
 * open `/cfg/usercfg` for writing and nothing else, and cannot send a reboot parameter the route does
 * not use. Each shape is the one `filewrite.ts` builds, and nothing looser:
 *
 * | report | shape |
 * |---|---|
 * | reset the file system | `FF FF seq 01 01 66` |
 * | reboot | `FF FF seq 01 01 00` |
 * | open for writing | `FF 01 seq 03`, a path on `FILE_WRITE_PATHS`, the mode `W`, a four byte size |
 * | write a chunk | `FF 03 seq 02 01 handle 01 count` |
 * | a data packet | a sequence below 64, a length of 1 to 62, and padding after the payload |
 * | the done packet | `7E` and nothing else |
 * | check | `FF 06 seq 07 01 handle 01 01` and the five checksum fields |
 * | flush | `FF 05 seq 02 01 handle 01 00` |
 * | close | `FF 07 seq 01 01 handle` |
 *
 * The close is on the read allow list as well; it is here so that the route is stated whole.
 */
export function onTheFileWriteRoute(report: Uint8Array): boolean {
  if (report.length !== FILE_REPORT_BYTES) return false;
  const first = report[0] as number;
  if (first === DONE_PACKET) return zeroFrom(report, 1);
  if (first < SEQUENCE_MODULUS) {
    const length = report[1] as number;
    return length >= 1 && length <= DATA_PACKET_PAYLOAD && zeroFrom(report, 2 + length);
  }
  if (first !== FILE_SERVICE) return false;
  const command = report[OFFSET_COMMAND] as number;
  const count = report[OFFSET_PARAMETER_COUNT] as number;
  // A byte parameter is `01 value`, so `at` and `at + 1` are its two bytes.
  const byteParam = (at: number, value?: number): boolean =>
    report[at] === 1 && (value === undefined || report[at + 1] === value);
  switch (command) {
    case FILE_CONTROL:
      return count === 1 && report[4] === 1
        && (report[5] === FILE_RESET_FILESYSTEM || report[5] === FILE_REBOOT) && zeroFrom(report, 6);
    case FILE_OPEN: {
      if (count !== 3) return false;
      const path = requestedPath(report);
      if (path === undefined || !FILE_WRITE_PATHS.includes(path)) return false;
      // The believed framing, section 198: `80 path 00 80 W 00 04 size`. Read off the bytes at fixed
      // places after the path, so a second string or a different mode cannot hide behind the first.
      const mode = 5 + path.length + 1;
      return report[mode] === STRING_PREFIX && report[mode + 1] === 0x57 && report[mode + 2] === 0
        && report[mode + 3] === 4 && zeroFrom(report, mode + 8);
    }
    case FILE_WRITE:
      return count === 2 && byteParam(4) && byteParam(6) && zeroFrom(report, 8);
    case FILE_DEVCTRL:
      return count === 7 && byteParam(4) && byteParam(6, FILE_CHECK);
    case FILE_FLUSH:
      return count === 2 && byteParam(4) && byteParam(6, 0) && zeroFrom(report, 8);
    case FILE_CLOSE:
      return count === 1 && byteParam(4) && zeroFrom(report, 6);
    default:
      return false;
  }
}

/**
 * Where a Harmony Touch's request channel stands on one transport, which is what the guard needs to
 * judge a data packet: a packet carries no path, so whether it is the start of a request line, the rest
 * of one, or nothing that may be sent is a matter of what went before it.
 *
 * * `idle`: no `/sys/hlapi` open for writing. A data packet is not on the route.
 * * `open`: opened for writing and nothing written yet; the next data packet is the line's first, and
 *   its name is decoded and checked.
 * * `line`: the first packet named an allowed request and the line goes on, so more packets may follow.
 * * `ended`: the line had to end with the packet that named it, so no data packet may follow.
 *
 * A close returns it to `idle`.
 */
export type TouchRoutePhase = 'idle' | 'open' | 'line' | 'ended';

/** Printable text and the space, which every byte of every recorded request line is. */
function printableText(bytes: Uint8Array): boolean {
  return bytes.every((b) => b >= 0x20 && b <= 0x7e);
}

/**
 * Whether a report is one the Touch's request channel sends, given where the channel stands, and if so
 * where it stands after it; undefined when the report is not on the route.
 *
 * **The second allow list the transport carries, and the one with the rail that matters most**: the
 * request name. Each shape is the one `touchsession.ts` builds from Logitech's client's templates, which
 * `packages/usb/test/touch/touchsession.test.ts` holds byte for byte against the recorded syncs:
 *
 * | report | shape |
 * |---|---|
 * | open for writing | `FF 01 seq 02 80 /sys/hlapi 00 80 57 00`, then a four byte size or nothing. The parameter count says 2 with the size present, which is the client's template and is kept |
 * | open for reading | `FF 01 seq 02 80 /sys/hlapi 00 80 52 00`, and only while no line is open for writing |
 * | write a chunk | `FF 03 seq 02 01 handle`, then `01 count` or `02 count count` |
 * | the first data packet | a sequence below 64, a length of 1 to 62, a payload `touchRequestOfLineStart` accepts, padding |
 * | a later data packet | printable text, padding; refused once the line had to end |
 * | the done packet | `7E` and nothing else, after the first data packet |
 *
 * The path is compared whole, so `/sys/hlapi` is the one path this route opens. Reads and closes are on
 * the read allow list and need no route.
 */
export function onTheTouchRequestRoute(report: Uint8Array, phase: TouchRoutePhase): TouchRoutePhase | undefined {
  if (report.length !== FILE_REPORT_BYTES) return undefined;
  const first = report[0] as number;
  if (first === DONE_PACKET) {
    return (phase === 'line' || phase === 'ended') && zeroFrom(report, 1) ? phase : undefined;
  }
  if (first < SEQUENCE_MODULUS) {
    const length = report[1] as number;
    if (length < 1 || length > DATA_PACKET_PAYLOAD || !zeroFrom(report, 2 + length)) return undefined;
    const payload = report.subarray(2, 2 + length);
    if (phase === 'open') {
      const start = touchRequestOfLineStart(payload);
      if (start === undefined) return undefined;
      return start.endsHere ? 'ended' : 'line';
    }
    return phase === 'line' && printableText(payload) ? 'line' : undefined;
  }
  if (first !== FILE_SERVICE) return undefined;
  switch (report[OFFSET_COMMAND]) {
    case FILE_OPEN: {
      if (phase !== 'idle' || report[OFFSET_PARAMETER_COUNT] !== 2) return undefined;
      if (requestedPath(report) !== TOUCH_REQUEST_PATH) return undefined;
      // The mode string sits at a fixed place after the path, read off the bytes as the write route does.
      const mode = 5 + TOUCH_REQUEST_PATH.length + 1;
      if (report[mode] !== STRING_PREFIX || report[mode + 2] !== 0) return undefined;
      if (report[mode + 1] === 0x52) return zeroFrom(report, mode + 3) ? 'idle' : undefined;
      if (report[mode + 1] !== 0x57) return undefined;
      if (zeroFrom(report, mode + 3)) return 'open';
      return report[mode + 3] === 4 && zeroFrom(report, mode + 8) ? 'open' : undefined;
    }
    case FILE_WRITE: {
      if (phase === 'idle' || report[OFFSET_PARAMETER_COUNT] !== 2 || report[4] !== 1) return undefined;
      if (report[6] === 1) return zeroFrom(report, 8) ? phase : undefined;
      if (report[6] === 2) return zeroFrom(report, 9) ? phase : undefined;
      return undefined;
    }
    default:
      return undefined;
  }
}

/**
 * What the guard carries from one data packet of a request line to the next, because two refusals need
 * more of the line than one packet holds.
 *
 * * `argumentsPending`: nothing but `&` has followed the request's name yet, so the first other character
 *   is still to be judged. **An argument string that starts with `=` is refused**, because the engine's
 *   cable listener then cuts the command at its `?` and moves the verb into the arguments, so the request
 *   it runs differs from the name the rail checked, `touchArgumentsAfter` in `rails.ts`.
 * * `tail`: the line's last characters, enough that `Content-Length:` split across two packets is still
 *   seen. **The remote takes that text as an announcement wherever it sits in a line**, the listener's own
 *   pattern match on the whole line, so a request carrying it would make the remote gather the writes that
 *   follow into one answer.
 *
 * The rail asks both of the whole line before anything is sent, `touchRequestOfLine`; this is the same
 * rule on the bytes as they go out, which is what makes it the rail and not a convenience.
 */
export interface TouchLineCarry {
  readonly argumentsPending: boolean;
  readonly tail: string;
}

/** Where a line stands before its first packet. */
export const TOUCH_LINE_START: TouchLineCarry = { argumentsPending: true, tail: '' };

/**
 * The carry after a data packet `onTheTouchRequestRoute` accepted in `phase`, or undefined when the packet
 * has to be refused for what it adds to the line. The first packet's own text is judged by
 * `touchRequestOfLineStart` as well; this carries what it leaves open into the packets after it.
 */
export function carryTouchLine(report: Uint8Array, phase: TouchRoutePhase, carry: TouchLineCarry): TouchLineCarry | undefined {
  const length = report[1] as number;
  const text = String.fromCharCode(...report.subarray(2, 2 + length));
  let pending = carry.argumentsPending;
  let rest = text;
  if (phase === 'open') {
    const start = touchRequestOfLineStart(report.subarray(2, 2 + length));
    if (start === undefined) return undefined;
    if (start.tier === 'announcement') return { argumentsPending: false, tail: '' };
    rest = text.slice(start.name.length);
  }
  if (pending) {
    const state = touchArgumentsAfter(rest);
    if (state === 'refused') return undefined;
    pending = state === 'pending';
  }
  const window = carry.tail + text;
  if (window.includes(TOUCH_ANNOUNCEMENT_TEXT)) return undefined;
  return { argumentsPending: pending, tail: window.slice(-(TOUCH_ANNOUNCEMENT_TEXT.length - 1)) };
}

/**
 * A transport for a remote of this family, refusing everything that is not one of the four reads,
 * unless the write path authorised it.
 *
 * Separate from `guardMutations` on purpose. That one keys on the high nibble of byte 0, which is
 * this protocol's fixed service id, so it would classify every packet here as one command. Two
 * protocols cannot share one allow list, and a guard that silently misreads a protocol is worse
 * than no guard.
 *
 * **The write route's half**, decision 26, is the arrangement `guardMutations` has had
 * since section 224, with one more condition. An authorisation is looked up by this object's identity
 * in `authorise.ts`, which the barrel does not offer, and consumed by the next write whether or not it
 * matches, so a permission cannot be left lying about. A report is sent on it only when its bytes are
 * exactly the authorised ones, it is on `onTheFileWriteRoute`, and `HARMONY_ENABLE_WRITES` and
 * `HARMONY_FILE_WRITE` are both set. A report that fails any of the three falls through to the read
 * checks below, which refuse every write as they always have. The returned object still offers
 * `write`, `read` and `close` and nothing else, which a test enumerates.
 */
export function guardFileProtocol(inner: Transport): Transport {
  // Where the Touch's request channel stands on this transport, `onTheTouchRequestRoute`. Kept in this
  // closure and not on the returned object, for the reason the authorisation is kept in `authorise.ts`.
  let phase: TouchRoutePhase = 'idle';
  // And what the line written so far leaves to judge in the next packet, `carryTouchLine`.
  let line: TouchLineCarry = TOUCH_LINE_START;
  const guarded: Transport = {
    async write(report: Uint8Array): Promise<void> {
      const pending = takeAuthorisation(guarded);
      const authorised = pending !== undefined && sameBytes(pending, report);
      const service = report[OFFSET_SERVICE] ?? 0;
      const command = report[OFFSET_COMMAND] ?? 0;

      // A path whose handler acts is never opened, in any mode, by any route, whatever the flags; and a
      // path not in the one spelling the remote's names have is refused first, since the lists compare
      // exactly and the remote's matching of a variant is not read, `isCanonicalPath`.
      if (service === FILE_SERVICE && command === FILE_OPEN) {
        const path = requestedPath(report);
        if (path !== undefined && !isCanonicalPath(path)) {
          throw new TransportError(
            `refusing to open ${JSON.stringify(path)}: a path is opened only in the spelling the remote's names `
              + 'have, lower case with no empty, . or .. segment and no trailing /, whatever the flags',
          );
        }
        if (path !== undefined && NEVER_OPENED_PATHS.includes(path)) {
          throw new TransportError(
            `refusing to open ${path}: its handler acts on the remote, a restart, a reset, firmware or a `
              + 'motor test, so this library never opens it, whatever the flags',
          );
        }
      }

      // The Touch's request channel: authorised for exactly these bytes, on the route given where the
      // channel stands, and both of its flags set.
      if (authorised && WRITES_ENABLED && TOUCH_REQUEST_DOOR) {
        const next = onTheTouchRequestRoute(report, phase);
        if (next !== undefined) {
          let carried = line;
          if ((report[0] as number) < SEQUENCE_MODULUS) {
            const after = carryTouchLine(report, phase, line);
            if (after === undefined) {
              throw new TransportError(
                'refusing a packet of a request line that carries "Content-Length:", which the remote takes as an '
                  + 'announcement anywhere in a line, or whose arguments start with "=", which moves the verb '
                  + 'out of the name the rail checked',
              );
            }
            carried = after;
          }
          await inner.write(report);
          phase = next;
          line = next === 'idle' ? TOUCH_LINE_START : carried;
          return;
        }
      }

      // **While a request line is open for writing, the close is the only other thing that goes out.** In
      // particular a data packet cannot reach the remote by the file write route below, whose data packets
      // are judged on their shape alone, and so skip the name check: with both write flags set, that would
      // be a way to write any line into `/sys/hlapi`.
      if (phase !== 'idle' && !(service === FILE_SERVICE && command === FILE_CLOSE)) {
        throw new TransportError(
          'refusing a report while /sys/hlapi is open for writing: only the request line it was opened for, '
            + 'checked by name, and the close may follow',
        );
      }

      if (
        authorised
        && onTheFileWriteRoute(report)
        && WRITES_ENABLED
        && FILE_WRITE_DOOR
      ) {
        await inner.write(report);
        if (service === FILE_SERVICE && command === FILE_CLOSE) {
          phase = 'idle';
          line = TOUCH_LINE_START;
        }
        return;
      }
      if (service !== FILE_SERVICE) {
        throw new TransportError(
          `refusing a report whose service is 0x${service.toString(16)}: this transport speaks the ` +
            'file protocol and nothing else',
        );
      }
      if (!FILE_READ_ONLY_COMMANDS.has(command)) {
        throw new TransportError(
          `refusing file protocol command 0x${command.toString(16)}: only ping, open, read and ` +
            'close pass on their own, and the rest of this family\'s commands write. A write goes ' +
            'through writeFileConfig, which asks rails.ts first and authorises each report itself.',
        );
      }
      if (command === FILE_OPEN && !opensForReading(report)) {
        throw new TransportError(
          'refusing an open whose mode is not R: opening for writing creates or truncates a file',
        );
      }
      if (command === FILE_OPEN) {
        const path = requestedPath(report);
        if (path === undefined) {
          throw new TransportError('refusing an open whose path cannot be read off the request');
        }
        if (!INERT_PATHS.includes(path) && !PATH_EXPERIMENT_ALLOWED) {
          throw new TransportError(
            `refusing to open ${path}: on this protocol a path can be an action, and this one is ` +
              "not on the inert list. A Touch's /tde/haptic/diagnostic and /tde/haptic/calibrate act " +
              'on an open for reading. Set HARMONY_FILE_PATH_EXPERIMENT=1 to probe a path deliberately.',
          );
        }
      }
      if (command === FILE_PING && (report[OFFSET_PARAMETER_COUNT] ?? 0) !== 0) {
        // Their own template's comment on the one parameter form: it simulates a USB reset. A bare
        // ping asks the remote whether it is there and does nothing else.
        throw new TransportError(
          'refusing a ping that carries a parameter: that form restarts the USB link',
        );
      }
      await inner.write(report);
      if (command === FILE_CLOSE) {
        phase = 'idle';
        line = TOUCH_LINE_START;
      }
    },
    read(timeoutMs: number): Promise<Uint8Array | undefined> {
      return inner.read(timeoutMs);
    },
    close(): Promise<void> {
      return inner.close();
    },
  };
  return guarded;
}

/**
 * Whether an open request asks for reading, read off the bytes rather than trusted from a caller.
 *
 * The mode is the second string parameter, so this walks the first string to its terminator and
 * checks what follows is exactly `R` and a NUL. A mode of `W` with a size after it is the write
 * form, and anything this cannot parse is treated as not a read, which is the safe direction.
 */
export function modeLetters(report: Uint8Array): string[] {
  const letters: string[] = [];
  const letterAt = (at: number): void => {
    const byte = report[at];
    if (byte !== undefined && byte >= 0x41 && byte <= 0x7a) letters.push(String.fromCharCode(byte));
  };

  // The framing: a string is `0x80`, characters, NUL. So walk the path's terminator and the mode's
  // own prefix, and the letter is the byte after it.
  let at = 5;
  while (at < report.length && report[at] !== 0) at += 1;
  letterAt(at + 2);

  // And the two refuted framings are still read, because a guard must refuse a write under any
  // reading a remote might take, not only under the one believed today.
  at = 4;
  while (at < report.length && report[at] !== 0) at += 1;
  letterAt(at + 1);
  const stated = report[4];
  if (stated !== undefined && stated > 0 && 5 + stated + 1 < report.length) {
    letterAt(5 + stated + 1);
  }
  return letters;
}

/**
 * Whether an open request asks for reading, under **every** framing it could be read as.
 *
 * The framing of a request is not fully settled, section 198, and a guard must not depend on the
 * unsettled part. So this reads the mode under each candidate framing and demands that at least one
 * says `R` and that **none** says anything else. A report that could be a write under any reading is
 * refused, which is the safe direction and is why this is not simply "find an R somewhere".
 */
export function opensForReading(report: Uint8Array): boolean {
  const letters = modeLetters(report);
  return letters.length > 0 && letters.every((letter) => letter === 'R');
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
      // **A report ID of zero goes in front of every report, always.** hidapi reads the first byte of a
      // write as the report ID and, when it is zero, drops it and sends the rest, one byte short. This
      // family's reports carry no ID, and its data packets start with their sequence number, which wraps
      // to zero every 64 packets: a Harmony 350's configuration write sent the 11th data packet of its
      // second chunk 63 bytes long, after which the remote's OUT endpoint stayed armed for 63 bytes and
      // refused every report until it was restarted, twice. A command starts with `0xFF` and went out
      // whole, which is why reads never met it. With the explicit zero, the zero is what gets dropped.
      const written = device.write([0x00, ...report]);
      if (written !== report.length && written !== report.length + 1) {
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
