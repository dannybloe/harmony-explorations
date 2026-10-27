/**
 * Writing a configuration to a remote of the **file based** family, the Harmony 300 and the Harmony
 * 350. `todo-compile-350.md` 1.6.
 *
 * **Deliberately not in the barrel.** `index.ts` does not re-export this file, the same protection
 * `writes.ts` and `blockwrite.ts` have: a consumer of `@harmony/usb` gets the read path, and a caller
 * that means to write reaches this through `@harmony/usb/write` or by path, which is a decision visible
 * in a diff. Nothing here is permission either. `writeFileConfig` asks `assertFileWriteAllowed` in
 * `rails.ts` before its first command, and the guard on the transport refuses every report that was not
 * authorised byte for byte, is not on the write route, or arrives with either flag unset.
 *
 * ## Where the sequence comes from
 *
 * Two sources, and they agree on every byte the client checks.
 *
 * * **Logitech's client**, `tests/test_file_family_write_route.py`: seven commands, the same for both
 *   models. Reset the file system, open for writing, write in chunks of at most 50 data packets, the
 *   check, the flush only when the check answered `m`, close, and the reboot only when a package asks.
 *   One sequence counter for the whole operation, 0 to 63 and wrapping, shared by commands and data
 *   packets. Stated by Logitech, in their client.
 * * **The 1.4 firmware**, `tests/test_harmony_350_file_write.py`, which is the authority, decision 2.
 *   What it adds is what each step does, and three things this file is shaped by: opening
 *   `/cfg/usercfg` for writing erases it before the open is answered; nothing in the firmware bounds the
 *   write to the file's size, so the bound is `assertFileFamilyContainer`'s; and the check compares
 *   the checksum word **stored** at the end of the file with the expected value the host sends,
 *   recomputing nothing.
 *
 * ## Three places this departs from the client, and why
 *
 * * **The end marker is written.** A read of `/cfg/usercfg` comes back four bytes short, because the
 *   open for reading states `end_addr - 0x020000` as the size, and the boot validator demands `PTYY` at
 *   `end_addr`. So the container goes out whole. `todo-compile-350.md` 1.6 said to take the marker
 *   off, and the firmware says the opposite.
 * * **The checksum fields are ours.** The client copies them out of a package's manifest and never
 *   computes one; there is no package here. The firmware uses only the expected value, so the type,
 *   seed, offset and length are filled with the truth about this container (`XOR`, `0x4321`, from 0
 *   over everything below the stored word) and the expected value is the stored word itself.
 * * **The written file is read back and compared**, which the client does not do. It is the rule every
 *   write in this project follows, `CLAUDE.md`, and the check cannot stand in for it: it confirms the
 *   header and the stored word arrived, not the body.
 *
 * **What is not read, and a hardware run will show.** The byte order in which the firmware compares the
 * expected value: the client sends every number big endian and the manifest states its expected value
 * as a number, so the stored little endian word is sent as that number, big endian. If that is the
 * wrong way round the check answers `u`, no flush follows (for a configuration it does nothing anyway),
 * the read back still runs, and the run fails with the answer in its log rather than proceeding.
 *
 * Nothing in this file has been sent to a remote.
 */
import { authoriseReport } from './authorise.ts';
import {
  DATA_PACKET_PAYLOAD,
  DONE_PACKET,
  FILE_CHECK,
  FILE_CLOSE,
  FILE_CONTROL,
  FILE_DEVCTRL,
  FILE_FLUSH,
  FILE_OPEN,
  FILE_REBOOT,
  FILE_REPORT_BYTES,
  FILE_RESET_FILESYSTEM,
  FILE_WRITE,
  OFFSET_HANDLE,
  OFFSET_PARAMETER_COUNT,
  OFFSET_SEQUENCE,
  SEQUENCE_MODULUS,
  decodeFileReply,
  encodeFileRequest,
  expectFileReply,
  parseSysInfo,
  readFile,
} from './filepipe.ts';
import {
  FILE_WRITE_DOOR,
  RailError,
  WRITES_ENABLED,
  assertFileFamilyContainer,
  assertFileWriteAllowed,
  type FileFamilyContainer,
} from './rails.ts';
import { TRAILER_CHECKSUM_OFFSET, TRAILER_CHECKSUM_SEED } from './trailer.ts';
import type { Transport } from './transport.ts';

export class FileWriteError extends Error {}

/** At most this many data packets per write command, the client's `packets.number`. */
export const WRITE_PACKETS_PER_CHUNK = 50;

/** A chunk's reply carries the last data packet's sequence number with this bit set. */
export const CHUNK_REPLY_FLAG = 0x80;

/** And the chunk that ends in the done packet is answered with the done packet's own byte, flagged. */
export const DONE_REPLY = CHUNK_REPLY_FLAG | DONE_PACKET;

/** The check's answer is one character, at byte 7 of its reply: `m` for a match and `u` otherwise. */
export const CHECK_ANSWER_OFFSET = 7;
export const CHECK_MATCH = 0x6d;

/** What the check is told the checksum is, which the firmware parses and does not use. */
export const CHECK_TYPE = 'XOR';

/** The family's end marker, which a read leaves off and a write must put back. */
export const FILE_FAMILY_END_MARKER = new Uint8Array([0x50, 0x54, 0x59, 0x59]);

/**
 * How long each step may take, the client's own timeouts. The open is the long one because the remote
 * erases six 64 KiB blocks before it answers it.
 */
export const TIMEOUT_MS = {
  reset: 30000,
  open: 40000,
  chunk: 30000,
  check: 30000,
  flush: 30000,
  close: 30000,
  /** The reboot is not waited for: the client expects no reply, and the remote restarts. */
  reboot: 2000,
} as const;

/**
 * One operation's sequence numbers: 0 first, 63 last, then 0 again.
 *
 * One counter per operation, shared by every command and every data packet, which is the client's
 * `OperationContext.PacketSequenceNumber`. The done packet takes none.
 */
export class SequenceCounter {
  private next = 0;

  take(): number {
    const taken = this.next;
    this.next = (this.next + 1) % SEQUENCE_MODULUS;
    return taken;
  }
}

/** `FF FF seq 01 01 66`: close whatever file is open, so an open cannot be refused for a stale handle. */
export function resetFilesystemReport(sequence: number): Uint8Array {
  return encodeFileRequest(FILE_CONTROL, [{ kind: 'byte', value: FILE_RESET_FILESYSTEM }], sequence);
}

/** `FF FF seq 01 01 00`: restart the remote. */
export function rebootReport(sequence: number): Uint8Array {
  return encodeFileRequest(FILE_CONTROL, [{ kind: 'byte', value: FILE_REBOOT }], sequence);
}

/** `FF 01 seq 03`, the path, `W`, and the size. The firmware replaces the size for `/cfg/usercfg`. */
export function openForWritingReport(path: string, size: number, sequence: number): Uint8Array {
  return encodeFileRequest(FILE_OPEN, [
    { kind: 'string', value: path },
    { kind: 'string', value: 'W' },
    { kind: 'dword', value: size },
  ], sequence);
}

/**
 * `FF 03 seq 02 01 handle 01 count`, the command that opens a chunk.
 *
 * **The count is of packets including this one**, the client's `SetPacketsNumber(m_PacketWriters.Count)`,
 * and the firmware agrees: its counter starts at 1 for the command and adds one per data packet, the
 * done packet included, and it answers when the counter reaches the count. So a full chunk is 51 and a
 * last chunk is its data packets plus two.
 */
export function writeChunkReport(handle: number, count: number, sequence: number): Uint8Array {
  return encodeFileRequest(FILE_WRITE, [
    { kind: 'byte', value: handle },
    { kind: 'byte', value: count },
  ], sequence);
}

/** A data packet: its sequence number, its length, its bytes, and zeroes to the report's end. */
export function dataPacket(sequence: number, payload: Uint8Array): Uint8Array {
  if (payload.length < 1 || payload.length > DATA_PACKET_PAYLOAD) {
    throw new FileWriteError(`a data packet carries 1 to ${DATA_PACKET_PAYLOAD} bytes, not ${payload.length}`);
  }
  if (sequence < 0 || sequence >= SEQUENCE_MODULUS) {
    throw new FileWriteError(`a sequence number runs 0 to ${SEQUENCE_MODULUS - 1}, not ${sequence}`);
  }
  const report = new Uint8Array(FILE_REPORT_BYTES);
  report[0] = sequence;
  report[1] = payload.length;
  report.set(payload, 2);
  return report;
}

/** The done packet, `7E` and padding. */
export function donePacket(): Uint8Array {
  const report = new Uint8Array(FILE_REPORT_BYTES);
  report[0] = DONE_PACKET;
  return report;
}

/**
 * `FF 06 seq 07 01 handle 01 01`, then the type, the seed, the offset, the length and the expected
 * value, which is the client's layout. Only the handle and the expected value are read by the firmware.
 */
export function checkReport(
  handle: number,
  expected: number,
  coveredLength: number,
  sequence: number,
): Uint8Array {
  return encodeFileRequest(FILE_DEVCTRL, [
    { kind: 'byte', value: handle },
    { kind: 'byte', value: FILE_CHECK },
    { kind: 'string', value: CHECK_TYPE },
    { kind: 'word', value: TRAILER_CHECKSUM_SEED },
    { kind: 'dword', value: 0 },
    { kind: 'dword', value: coveredLength },
    { kind: 'word', value: expected },
  ], sequence);
}

/** `FF 05 seq 02 01 handle 01 00`, the flush. The 0 is the flag the firmware does not read. */
export function flushReport(handle: number, sequence: number): Uint8Array {
  return encodeFileRequest(FILE_FLUSH, [
    { kind: 'byte', value: handle },
    { kind: 'byte', value: 0 },
  ], sequence);
}

/** `FF 07 seq 01 01 handle`. */
export function closeReport(handle: number, sequence: number): Uint8Array {
  return encodeFileRequest(FILE_CLOSE, [{ kind: 'byte', value: handle }], sequence);
}

/** One write command's worth of data: its payloads, and whether the done packet follows them. */
export interface WriteChunk {
  readonly payloads: readonly Uint8Array[];
  readonly last: boolean;
}

/**
 * The bytes cut into data packets of 62 and the packets into chunks of 50, the last chunk cut to what
 * is left, which is the client's `PrepareRomData`. The done packet rides on the last chunk.
 */
export function chunksFor(bytes: Uint8Array): WriteChunk[] {
  const payloads: Uint8Array[] = [];
  for (let at = 0; at < bytes.length; at += DATA_PACKET_PAYLOAD) {
    payloads.push(bytes.subarray(at, Math.min(bytes.length, at + DATA_PACKET_PAYLOAD)));
  }
  const chunks: WriteChunk[] = [];
  for (let at = 0; at < payloads.length; at += WRITE_PACKETS_PER_CHUNK) {
    chunks.push({
      payloads: payloads.slice(at, at + WRITE_PACKETS_PER_CHUNK),
      last: at + WRITE_PACKETS_PER_CHUNK >= payloads.length,
    });
  }
  return chunks;
}

/** The container with the family's end marker after it, for bytes read off a remote. */
export function withEndMarker(asRead: Uint8Array): Uint8Array {
  const whole = new Uint8Array(asRead.length + FILE_FAMILY_END_MARKER.length);
  whole.set(asRead, 0);
  whole.set(FILE_FAMILY_END_MARKER, asRead.length);
  return whole;
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

/** Whether these bytes, as read off a remote, are a whole configuration once the marker is back. */
function holdsAConfiguration(asRead: Uint8Array): boolean {
  if (asRead.length === 0) return false;
  try {
    assertFileFamilyContainer(withEndMarker(asRead));
    return true;
  } catch {
    return false;
  }
}

/** What the remote holds before the write, judged against the two things the lab can restore. */
export type CurrentContent = 'the backup' | 'this configuration' | 'no configuration';

/**
 * Throws unless erasing what the remote holds now loses nothing the lab cannot put back.
 *
 * **The file family's form of "no write without a verified dump of this exact unit"**, `CLAUDE.md`.
 * The open for writing destroys the configuration before it answers, so what matters is that the bytes
 * it destroys exist somewhere else. Three states pass, and the third is what keeps a failed write
 * recoverable rather than locked:
 *
 * * the remote holds **the backup**, which is the first write to a unit
 * * it holds **this configuration** already, a rerun of the same write
 * * it holds **no configuration**: nothing reads back, or what does is not a whole container, which is
 *   what a write that stopped part way leaves. There is nothing left to lose, and refusing would leave
 *   the remote with no route back to its backup.
 *
 * A remote holding a whole configuration that is neither is refused: that is a configuration the lab
 * does not hold, and erasing it is the one loss here that nothing can undo.
 *
 * `backup` is accepted as read, four bytes short, or whole; it has to be a whole configuration either
 * way, because a backup that is not one restores nothing.
 */
export function judgeCurrentContent(
  current: Uint8Array,
  backup: Uint8Array,
  container: Uint8Array,
): CurrentContent {
  let backupAsRead: Uint8Array;
  if (holdsAConfiguration(backup)) {
    backupAsRead = backup;
  } else {
    try {
      assertFileFamilyContainer(backup);
    } catch (error: unknown) {
      throw new RailError(
        `the backup is not a whole configuration for this family, so it could not restore the remote: ${
          error instanceof Error ? error.message : String(error)}`,
      );
    }
    backupAsRead = backup.subarray(0, backup.length - FILE_FAMILY_END_MARKER.length);
  }
  if (equalBytes(current, backupAsRead)) return 'the backup';
  if (equalBytes(current, container.subarray(0, container.length - FILE_FAMILY_END_MARKER.length))) {
    return 'this configuration';
  }
  if (!holdsAConfiguration(current)) return 'no configuration';
  throw new RailError(
    `the remote holds a ${current.length} byte configuration that is neither the backup nor the one being `
      + 'written. Opening /cfg/usercfg for writing would erase it, and the lab has no copy: read it into '
      + 'the lab first and name that as the backup',
  );
}

/** What the file write path reads off a remote before it decides anything, every one of them a read. */
export interface FileWriteFacts {
  readonly sysinfo: ReadonlyMap<string, string>;
  /** `/sys/guid`, the unit's identity block. Never printed whole: it identifies a piece of hardware. */
  readonly guid: Uint8Array;
  /** `/cfg/usercfg` as the remote serves it, four bytes short of a container. */
  readonly current: Uint8Array;
}

/**
 * Read the three files the write is judged on: the identity file, `/sys/guid` and the configuration.
 * All three are on `INERT_PATHS` and go through `readFile`, ping, open for reading, read and close.
 */
export async function readFileWriteFacts(transport: Transport): Promise<FileWriteFacts> {
  const sysinfo = parseSysInfo(Buffer.from(await readFile(transport, '/sys/sysinfo')).toString('ascii'));
  const guid = await readFile(transport, '/sys/guid');
  const current = await readFile(transport, '/cfg/usercfg');
  return { sysinfo, guid, current };
}

/** What a caller asks for. Every fact about the remote is read off it rather than taken from here. */
export interface FileConfigWrite {
  /** Must be `/cfg/usercfg`; anything else is refused by the rail. */
  readonly path: string;
  /** The whole container, its end marker included. */
  readonly container: Uint8Array;
  /** The unit this is meant for, from the lab's unit record. */
  readonly permittedUnit: Uint8Array;
  /** The lab's copy of what the unit held, as read or whole. */
  readonly backup: Uint8Array;
  /** Send the reboot after a verified write. Never sent after a failed one. */
  readonly reboot: boolean;
  /** Every line of the account, as it happens, so a caller can journal it before the next step. */
  readonly log?: (line: string) => void;
}

export interface FileWriteResult {
  readonly before: CurrentContent;
  readonly container: FileFamilyContainer;
  readonly chunks: number;
  readonly dataPackets: number;
  /** The check's answer character, `m` or `u`. */
  readonly checkAnswer: string;
  readonly readBackLength: number;
  readonly rebooted: boolean;
}

/** Send one report the write path has decided on: authorised for exactly these bytes, then written. */
async function send(transport: Transport, report: Uint8Array): Promise<void> {
  authoriseReport(transport, report);
  await transport.write(report);
}

async function awaitReply(transport: Transport, command: number, timeoutMs: number, step: string): Promise<Uint8Array> {
  const report = await transport.read(timeoutMs);
  if (report === undefined) {
    throw new FileWriteError(`no reply to the ${step} within ${timeoutMs} ms`);
  }
  try {
    return expectFileReply(decodeFileReply(report), command).bytes;
  } catch (error: unknown) {
    throw new FileWriteError(`the ${step}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Write `request.container` to `/cfg/usercfg` and read it back.
 *
 * In order, and every line goes to `request.log` before the next command is sent:
 *
 * 1. **Read the facts**: the identity file, `/sys/guid` and the configuration as it stands. Reads only.
 * 2. **Judge them**: `assertFileWriteAllowed`, the two flags, the path, the architecture, the packet
 *    length, the unit and the container; then `judgeCurrentContent`, so nothing the lab cannot restore
 *    is erased. Nothing has been sent that changes the remote until both have passed.
 * 3. **Reset the file system**, which only closes an open file.
 * 4. **Open `/cfg/usercfg` for writing**, which erases it. From here a failure leaves the remote with no
 *    configuration, and the backup is how it gets one back: this path again with the backup.
 * 5. **Write it in chunks**, every chunk's reply checked against the sequence number it must carry.
 *    Exactly the container's bytes go out and no more, since the firmware bounds nothing.
 * 6. **The check**, with the stored checksum word as the expected value; **the flush** only on `m`.
 * 7. **Close.**
 * 8. **Read it back** and compare byte for byte with what was sent less the end marker, which a read
 *    does not serve. A mismatch, or a check that did not answer `m`, is a failure, thrown after the
 *    account of both is logged, and no reboot follows it.
 * 9. **The reboot**, when asked for, so the remote validates and loads what it now holds.
 */
export async function writeFileConfig(
  transport: Transport,
  request: FileConfigWrite,
): Promise<FileWriteResult> {
  const log = request.log ?? ((): void => undefined);

  // 0. **A run that stopped after its open leaves `/cfg/usercfg` open for writing**, and the firmware
  // refuses to open any other file while one is open, so the identity read fails and the unit cannot be
  // checked: measured on a Harmony 350 whose first write stopped after the erase. So when the first read
  // fails and both flags are set, a file system reset goes out and the read is tried once more. The reset
  // only closes an open file, read in the firmware, and the family is already fixed by the product id the
  // transport opened; without the flags the failure stands, so the shipped state still sends nothing.
  let facts: Awaited<ReturnType<typeof readFileWriteFacts>>;
  try {
    facts = await readFileWriteFacts(transport);
  } catch (error: unknown) {
    if (!(WRITES_ENABLED && FILE_WRITE_DOOR)) throw error;
    log(`the reads failed (${error instanceof Error ? error.message : String(error)}); a file left open `
      + 'by an interrupted run does that, so a file system reset closes it and the reads go again');
    await send(transport, resetFilesystemReport(0));
    await awaitReply(transport, FILE_CONTROL, TIMEOUT_MS.reset, 'file system reset before the reads');
    facts = await readFileWriteFacts(transport);
  }
  log(`read: architecture ${facts.sysinfo.get('arch') ?? '?'}, skin ${facts.sysinfo.get('skin') ?? '?'}, `
    + `firmware ${facts.sysinfo.get('fw_ver') ?? '?'}, /cfg/usercfg ${facts.current.length} bytes`);
  const container = assertFileWriteAllowed({
    path: request.path,
    sysinfo: facts.sysinfo,
    guid: facts.guid,
    permittedUnit: request.permittedUnit,
    container: request.container,
  });
  log(`the unit matches its record, and the container is ${request.container.length} bytes with `
    + `checksum 0x${container.storedChecksum.toString(16).padStart(4, '0')}`);
  const before = judgeCurrentContent(facts.current, request.backup, request.container);
  log(`the remote holds ${before}, so nothing the lab cannot restore is erased`);

  const sequence = new SequenceCounter();

  // 3. The reset. Its reply carries no parameter, which is what the client checks, at byte 3.
  await send(transport, resetFilesystemReport(sequence.take()));
  const reset = await awaitReply(transport, FILE_CONTROL, TIMEOUT_MS.reset, 'file system reset');
  if (reset[OFFSET_PARAMETER_COUNT] !== 0) {
    throw new FileWriteError(`the file system reset answered with ${reset[OFFSET_PARAMETER_COUNT]} parameters, not 0`);
  }
  log('file system reset: answered');

  // 4. The open, which erases. Its reply echoes the sequence number and carries the handle.
  const openSequence = sequence.take();
  log(`opening ${request.path} for writing: the remote erases its configuration before it answers`);
  await send(transport, openForWritingReport(request.path, request.container.length, openSequence));
  const opened = await awaitReply(transport, FILE_OPEN, TIMEOUT_MS.open, 'open for writing');
  // **The reply sets the high bit of the sequence it echoes**: a Harmony 350 answered an open sent with
  // sequence 1 with 129, `0x80 | 1`, on its first write, and this check stopped the run there, after the
  // erase. The chunk replies already carry the bit, so the rule is one rule across the commands. Plain
  // echo is still accepted, since nothing has shown which form every command uses; `0xFF` is the error
  // marker and matches neither.
  const echoed = opened[OFFSET_SEQUENCE];
  if (echoed !== openSequence && echoed !== (CHUNK_REPLY_FLAG | openSequence)) {
    throw new FileWriteError(`the open's reply carries sequence ${echoed}, not ${openSequence} or ${CHUNK_REPLY_FLAG | openSequence}`);
  }
  const handle = opened[OFFSET_HANDLE] as number;
  log(`opened: handle ${handle}`);

  // **No close after a failure, deliberately.** A failure part way through a chunk leaves the firmware
  // counting data packets, and it parses whatever arrives next as one: a close would be read as a data
  // packet of seven bytes and programmed into the flash after the last good one. The next run's file
  // system reset is what closes a handle left open, which is the reason the client sends it first.
  let closed = false;
  let checkAnswer = '';
  let dataPackets = 0;
  const chunks = chunksFor(request.container);
  try {
    // 5. The chunks. **Every chunk ends with the done packet**, as the client's template sends it inside
    // its repeat, and the count includes the command and the done packet, so every chunk is answered
    // `0xFE`. This sent the done packet after the last chunk alone until a Harmony 350's first write
    // stopped after chunk 1: it answered that chunk and accepted no report afterwards until restarted.
    let sent = 0;
    for (const [index, chunk] of chunks.entries()) {
      const count = 1 + chunk.payloads.length + 1;
      await send(transport, writeChunkReport(handle, count, sequence.take()));
      let lastSequence = -1;
      for (const payload of chunk.payloads) {
        lastSequence = sequence.take();
        await send(transport, dataPacket(lastSequence, payload));
        sent += payload.length;
        dataPackets += 1;
      }
      await send(transport, donePacket());
      const reply = await awaitReply(transport, FILE_WRITE, TIMEOUT_MS.chunk, `write chunk ${index + 1}`);
      const expected = DONE_REPLY;
      if (reply[OFFSET_SEQUENCE] !== expected) {
        throw new FileWriteError(
          `chunk ${index + 1} of ${chunks.length} was answered with 0x${(reply[OFFSET_SEQUENCE] ?? 0).toString(16)}, `
            + `not 0x${expected.toString(16)}`,
        );
      }
      log(`chunk ${index + 1} of ${chunks.length}: ${chunk.payloads.length} packets, ${sent} of `
        + `${request.container.length} bytes, answered 0x${expected.toString(16)}`);
    }
    // The firmware bounds nothing, so this is the writer bounding itself, checked rather than assumed.
    if (sent !== request.container.length) {
      throw new FileWriteError(`sent ${sent} bytes of a ${request.container.length} byte container, which is a bug`);
    }

    // 6. The check, then the flush only on `m`.
    await send(transport, checkReport(
      handle,
      container.storedChecksum,
      request.container.length - TRAILER_CHECKSUM_OFFSET,
      sequence.take(),
    ));
    const checked = await awaitReply(transport, FILE_DEVCTRL, TIMEOUT_MS.check, 'check');
    checkAnswer = String.fromCharCode(checked[CHECK_ANSWER_OFFSET] ?? 0);
    log(`check: answered ${JSON.stringify(checkAnswer)}${checked[CHECK_ANSWER_OFFSET] === CHECK_MATCH
      ? ', the stored checksum arrived' : ', not a match, so no flush'}`);
    if (checked[CHECK_ANSWER_OFFSET] === CHECK_MATCH) {
      await send(transport, flushReport(handle, sequence.take()));
      await awaitReply(transport, FILE_FLUSH, TIMEOUT_MS.flush, 'flush');
      log('flush: answered');
    }

    // 7. Close.
    await send(transport, closeReport(handle, sequence.take()));
    closed = true;
    await awaitReply(transport, FILE_CLOSE, TIMEOUT_MS.close, 'close');
    log('closed');
  } finally {
    if (!closed) {
      log('stopped with the file open: nothing more is sent, and the next run\'s file system reset closes it');
    }
  }

  // 8. The read back, through the read path, and the comparison.
  const back = await readFile(transport, request.path);
  const wanted = request.container.subarray(0, container.readLength);
  let difference: number | undefined;
  for (let i = 0; i < Math.max(back.length, wanted.length); i += 1) {
    if (back[i] !== wanted[i]) {
      difference = i;
      break;
    }
  }
  if (difference === undefined) {
    log(`read back ${back.length} bytes: identical to what was sent, less the end marker the remote does not serve`);
  } else {
    log(`read back ${back.length} bytes against ${wanted.length} sent: they differ from byte ${difference}`);
  }
  if (difference !== undefined || checkAnswer !== 'm') {
    throw new FileWriteError(
      `the write did not verify: ${difference === undefined ? '' : `the read back differs from byte ${difference}`}`
        + `${difference !== undefined && checkAnswer !== 'm' ? ', and ' : ''}`
        + `${checkAnswer === 'm' ? '' : `the check answered ${JSON.stringify(checkAnswer)}`}. No reboot was sent; `
        + 'write the backup through this path to put the unit back',
    );
  }

  // 9. The reboot, which nothing acknowledges reliably: the remote restarts.
  let rebooted = false;
  if (request.reboot) {
    await send(transport, rebootReport(sequence.take()));
    await transport.read(TIMEOUT_MS.reboot).catch(() => undefined);
    rebooted = true;
    log('reboot sent');
  }

  return {
    before,
    container,
    chunks: chunks.length,
    dataPackets,
    checkAnswer,
    readBackLength: back.length,
    rebooted,
  };
}
