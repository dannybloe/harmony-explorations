/**
 * A session on a Harmony Touch's request channel, `/sys/hlapi`: one request line written, its answer
 * read, under decision 29.
 *
 * **Deliberately not in the barrel**, as `filewrite.ts` is not: a consumer of `@harmony/usb` gets the read
 * path, and a caller that means to write a request line reaches this by path, which is a decision visible
 * in a diff. Nothing here is permission either. A session reads the remote's identity file when it opens
 * and refuses another unit then; every request asks `assertTouchRequestAllowed` in `rails.ts` before its
 * first report, the two flags, the path, the unit as that identity file names it and the name, since the
 * transport is bound to the one device it opened; and the guard on the transport refuses a
 * report that was not authorised byte for byte, is not on `onTheTouchRequestRoute`, or arrives with either
 * flag unset, and decodes the request's name off the bytes of its first data packet itself.
 *
 * ## What a request is on the cable
 *
 * Every step of a sync is a session on one file, `reference/architectures/harmony-touch/answering-a-sync.md`
 * "Which request names act": `/sys/hlapi` opened for writing with the line's size, the line written in
 * data packets, a close, then `/sys/hlapi` opened for reading, the answer read, a close. The answer is the
 * word `Response`, a comma and JSON. A write of answers is announced first by a line of its own,
 * `Content-Length: ` and a length, as a session of its own, and this file writes that announcement
 * itself before every write of answers. **The number is the whole line's length by default**, which is
 * what the remote's listener counts, `TouchAnnouncement`; Logitech's client's number, the `responses`
 * argument's length, `announcedLength`, is kept as an option for the tests that compare this file's bytes
 * with theirs.
 *
 * ## Whose bytes these are
 *
 * **Logitech's client's, reproduced byte for byte**, which is what `packages/usb/test/touch/touchsession.test.ts`
 * holds against the three recorded syncs: for every request of theirs on the allow list, the reports this
 * file sends are the reports their client sent, given the same replies. The shapes come from five of the
 * client's skin 99 templates, one per kind of request, and they differ in ways a single shape would get
 * wrong, so each request names its template:
 *
 * * **the sequence numbers** of one operation are numbered in two passes. The client numbers the commands
 *   it builds before the operation runs first, the opens, and those it builds while running after them, so
 *   an open for writing is sequence 0, the open for reading 1, and the write command 2. The sync request's
 *   template opens `/sys/time` first, so there its two opens are 1 and 2 and the running commands start at
 *   6; this file does not send the clock write, which the remote refused in both recorded syncs down and
 *   which is not `/sys/hlapi`, and it keeps the numbers the client gave the rest.
 * * **the open for writing states two parameters and carries three**, the size being the third, which is
 *   the templates' literal count; the sync request's open carries no size.
 * * **the count of packets in a chunk is a byte or a word**, and only the template whose count is a word
 *   sends the done packet, on its last chunk.
 * * **the read asks for a number of packets that is the template's own**: 500 as a byte, which goes out as
 *   `0xF4`, 50, or 33825 as a four byte number.
 *
 * Whether the remote cares about any of these is not read; matching the client costs nothing and the bytes
 * it sent are the bytes the remote is known to take. `harmony.engine?getconfighash` has no template,
 * since Logitech's client never sends it, and goes in the provisioning read's shape, and so do the three
 * requests of the recovery tier, behind `HARMONY_TOUCH_RECOVERY`, for the same reason.
 *
 * This said "Nothing in this file has been sent to a remote" until the provisioning read and `getconfighash`
 * went to the bench Touch; every request here has been sent since, through thirty four syncs and the recovery
 * tier's abort and restart, `docs/test-notes/harmony-touch.md`.
 */
import { authoriseReport } from './authorise.ts';
import {
  DATA_PACKET_PAYLOAD,
  FILE_CLOSE,
  FILE_OPEN,
  FILE_READ,
  FILE_SERVICE,
  FILE_WRITE,
  OFFSET_COMMAND,
  OFFSET_HANDLE,
  OFFSET_PARAMETER_COUNT,
  OFFSET_SEQUENCE,
  OFFSET_SERVICE,
  OFFSET_SIZE,
  READ_TERMINATOR,
  decodeFileReply,
  encodeFileRequest,
  expectFileReply,
  parseSysInfo,
  readFile,
  type FileParam,
} from './filepipe.ts';
import { CHUNK_REPLY_FLAG, DONE_REPLY, SequenceCounter, closeReport, dataPacket, donePacket } from './filewrite.ts';
import {
  TOUCH_ANSWER_WRITE,
  TOUCH_REQUEST_PATH,
  assertTouchRequestAllowed,
  assertTouchUnit,
  type TouchRequestTier,
} from './rails.ts';
import type { Transport } from './transport.ts';

export class TouchRequestError extends Error {}

/** How one kind of request goes on the cable, one of Logitech's client's skin 99 templates. */
export interface TouchRequestShape {
  /** The client's template this shape is read from, for a reader who wants to check it. */
  readonly template: string;
  /** The sequence number of the open for writing, numbered before the operation runs. */
  readonly openWriteSequence: number;
  /** And of the open for reading. */
  readonly openReadSequence: number;
  /** Where the commands built while the operation runs start counting. */
  readonly firstRuntimeSequence: number;
  /** Whether the open for writing carries the line's size. */
  readonly statesSize: boolean;
  /** The width of a write command's count of packets. */
  readonly count: 'byte' | 'word';
  /** Whether the last chunk ends in the done packet. */
  readonly donePacket: boolean;
  /** The most data packets one write command carries. */
  readonly packetsPerChunk: number;
  /** The read's second parameter, how many packets it asks for. */
  readonly read: FileParam;
}

/** `getonremotechanges.xml`: the hand over of the remote's own changes. */
const HAND_OVER: TouchRequestShape = {
  template: 'getonremotechanges.xml',
  openWriteSequence: 0,
  openReadSequence: 1,
  firstRuntimeSequence: 2,
  statesSize: true,
  count: 'byte',
  donePacket: false,
  packetsPerChunk: 500,
  // The template's 500, written as a byte parameter, so its low byte.
  read: { kind: 'byte', value: 500 & 0xff },
};

/** `getrequest.xml`: the next request list. */
const REQUEST_LIST: TouchRequestShape = {
  template: 'getrequest.xml',
  openWriteSequence: 0,
  openReadSequence: 1,
  firstRuntimeSequence: 2,
  statesSize: true,
  count: 'byte',
  donePacket: false,
  packetsPerChunk: 33825,
  read: { kind: 'dword', value: 33825 },
};

/** `getprovisioninfo.xml`: the provisioning read, and the shape `getconfighash` borrows. */
const PROVISIONING: TouchRequestShape = {
  template: 'getprovisioninfo.xml',
  openWriteSequence: 0,
  openReadSequence: 1,
  firstRuntimeSequence: 2,
  statesSize: true,
  count: 'byte',
  donePacket: false,
  packetsPerChunk: 50,
  read: { kind: 'byte', value: 50 },
};

/**
 * `syncremote.xml`: the sync from the account. Its template opens `/sys/time` for writing first, as
 * sequence 0, and writes the clock with sequences 3 to 5, which this file does not send; the numbers of
 * the rest are kept as the client gave them.
 */
const SYNC: TouchRequestShape = {
  template: 'syncremote.xml',
  openWriteSequence: 1,
  openReadSequence: 2,
  firstRuntimeSequence: 6,
  statesSize: false,
  count: 'byte',
  donePacket: false,
  packetsPerChunk: 50,
  read: { kind: 'byte', value: 50 },
};

/** `postresponse.xml`: a write of answers, and the announcement that precedes it. */
const ANSWERS: TouchRequestShape = {
  template: 'postresponse.xml',
  openWriteSequence: 0,
  openReadSequence: 1,
  firstRuntimeSequence: 2,
  statesSize: true,
  count: 'word',
  donePacket: true,
  packetsPerChunk: 500,
  read: { kind: 'byte', value: 500 & 0xff },
};

/**
 * The shape of every request the rail allows, by name, and of the announcement. A test holds the keys
 * equal to the three allow lists and the announcement, so a name added to a list without a shape fails.
 *
 * **The three recovery requests borrow the provisioning read's shape**, as `getconfighash` does: Logitech's
 * client never sends any of them over the cable, the abort being the remote's own screens' request, so no
 * template of theirs exists. Each is one short line with a short answer, which is that template's case.
 */
export const TOUCH_REQUEST_SHAPES: Readonly<Record<string, TouchRequestShape>> = {
  'vnd.logitech.setup/vnd.logitech.account?getprovisioninfo': PROVISIONING,
  'vnd.logitech.harmony/vnd.logitech.harmony.engine?getconfighash': PROVISIONING,
  'vnd.logitech.setup/vnd.logitech.syncRemoteChanges': HAND_OVER,
  'vnd.logitech.setup/vnd.logitech.sync': SYNC,
  'vnd.logitech.proxy/vnd.logitech.request?read': REQUEST_LIST,
  'vnd.logitech.proxy/vnd.logitech.response?write': ANSWERS,
  'vnd.logitech.proxy/vnd.logitech.abort': PROVISIONING,
  'vnd.logitech.setup/vnd.logitech.sync?deleteresources': PROVISIONING,
  'vnd.logitech.setup/vnd.logitech.firmware?reboot': PROVISIONING,
  'Content-Length': ANSWERS,
};

/** How long each step may take. The client's own are longer still; a step that takes this long has failed. */
export const TOUCH_TIMEOUT_MS = {
  open: 40000,
  write: 120000,
  close: 30000,
  read: 120000,
} as const;

/** `FF 01 seq 02`, `/sys/hlapi`, `W`, and the size when the template states one. */
export function requestOpenForWritingReport(shape: TouchRequestShape, size: number): Uint8Array {
  const params: FileParam[] = [
    { kind: 'string', value: TOUCH_REQUEST_PATH },
    { kind: 'string', value: 'W' },
  ];
  if (shape.statesSize) params.push({ kind: 'dword', value: size });
  const report = encodeFileRequest(FILE_OPEN, params, shape.openWriteSequence);
  // The template's literal count, two, whether or not the size follows. Kept, since these are the bytes
  // the remote took from Logitech's client.
  report[OFFSET_PARAMETER_COUNT] = 2;
  return report;
}

/** `FF 01 seq 02`, `/sys/hlapi`, `R`. */
export function requestOpenForReadingReport(shape: TouchRequestShape): Uint8Array {
  return encodeFileRequest(FILE_OPEN, [
    { kind: 'string', value: TOUCH_REQUEST_PATH },
    { kind: 'string', value: 'R' },
  ], shape.openReadSequence);
}

/** `FF 03 seq 02 01 handle`, then the count of packets including this command, as a byte or a word. */
export function requestWriteChunkReport(
  shape: TouchRequestShape,
  handle: number,
  count: number,
  sequence: number,
): Uint8Array {
  return encodeFileRequest(FILE_WRITE, [
    { kind: 'byte', value: handle },
    { kind: shape.count, value: count },
  ], sequence);
}

/** `FF 04 seq 02 01 handle`, then the template's number of packets. */
export function requestReadReport(shape: TouchRequestShape, handle: number, sequence: number): Uint8Array {
  return encodeFileRequest(FILE_READ, [{ kind: 'byte', value: handle }, shape.read], sequence);
}

/** The line's bytes, one per character: the rail has already refused anything that is not printable text. */
function asciiBytes(line: string): Uint8Array {
  return Uint8Array.from(line, (c) => c.charCodeAt(0));
}

/** The line cut into data packets of 62 and the packets into chunks of the template's size. */
function chunksOf(bytes: Uint8Array, shape: TouchRequestShape): Uint8Array[][] {
  const payloads: Uint8Array[] = [];
  for (let at = 0; at < bytes.length; at += DATA_PACKET_PAYLOAD) {
    payloads.push(bytes.subarray(at, Math.min(bytes.length, at + DATA_PACKET_PAYLOAD)));
  }
  // A byte count holds at most 255, the command and 254 data packets. The request lines that go in a
  // byte template are one or two packets, so a longer one is refused rather than split in a way the
  // client was never seen to split one.
  if (shape.count === 'byte' && payloads.length > 254) {
    throw new TouchRequestError(`a request of ${payloads.length} data packets does not fit a byte count`);
  }
  const chunks: Uint8Array[][] = [];
  for (let at = 0; at < payloads.length; at += shape.packetsPerChunk) {
    chunks.push(payloads.slice(at, at + shape.packetsPerChunk));
  }
  return chunks;
}

/** What a request answered. */
export interface TouchAnswer {
  /** The request's name, as the rail decoded it. */
  readonly name: string;
  readonly tier: TouchRequestTier;
  /** The answer as the remote served it, `Response,` and JSON, or empty when it served nothing. */
  readonly text: string;
  /** For a write of answers, what the remote answered its announcement. */
  readonly announcement?: string;
}

/**
 * A session on one Touch. **`request` is its whole surface**, which a test enumerates: the transport, the
 * identity file and the unit record stay in the closure, so nothing reachable from the object can send a
 * report around the rail.
 */
export interface TouchRequestSession {
  request(line: string): Promise<TouchAnswer>;
}

/**
 * Which number announces a write of answers: `line`, the whole line's length, or `responses`, the length of
 * its `responses` argument as Logitech's client states it, `announcedLength`.
 *
 * **`line` is this project's choice and the default**. The remote's cable listener,
 * `halhttpserverconnector.lua` `clientConnection`, keeps the announced number, adds each write command's
 * text after its `/api/` to what it holds, answers "go on" while it holds fewer characters than announced
 * and acts on what it holds as soon as it holds at least that many. What it holds is the line from the
 * request's name on, so the whole line's length is the one number it reaches exactly when the last chunk
 * arrives, whatever that chunk's length: one character more and it would wait for a write that never comes,
 * one fewer and it would act a chunk early on a line whose last characters are missing. Logitech's number is
 * the line less 101 to 104 characters, so with it a line whose last chunk is no longer than that is acted on
 * one chunk early, `answering-a-sync.md` "The number announced falls short of what the remote counts".
 * `touchsession.test.ts` holds both against a fake listener built from that reading, at a last chunk of 1,
 * 103 and 104 characters. **The whole line's length has been sent once with a line of more than one chunk**,
 * the remote's own six documents answered back, 571577 characters in 19 chunks with a last of 13577, and the remote acted on
 * the write once, as a whole, `packages/usb/test/touch/touch-own-set-sync.test.ts`; a last chunk inside the shortfall has
 * not been sent with either number, and that the remote hands on each chunk as it arrives is read in its native
 * program and not tried.
 *
 * `responses` exists so that the tests comparing this file with Logitech's client report by report can ask
 * for the client's bytes; nothing that answers a sync should.
 */
export type TouchAnnouncement = 'line' | 'responses';

export interface TouchSessionOptions {
  /** The unit the session is meant for, from the lab's `units/touch.txt`. */
  readonly permittedUnit: Uint8Array;
  /** Every line of the account, as it happens. */
  readonly log?: (line: string) => void;
  /** Which number announces a write of answers; the whole line when absent. */
  readonly announce?: TouchAnnouncement;
}

/** Send one report the session has decided on: authorised for exactly these bytes, then written. */
async function send(transport: Transport, report: Uint8Array): Promise<void> {
  authoriseReport(transport, report);
  await transport.write(report);
}

/** The reply to a command, checked to be that command's and not the error marker. */
async function awaitReply(transport: Transport, command: number, timeoutMs: number, step: string): Promise<Uint8Array> {
  const report = await transport.read(timeoutMs);
  if (report === undefined) throw new TouchRequestError(`no reply to the ${step} within ${timeoutMs} ms`);
  try {
    return expectFileReply(decodeFileReply(report), command).bytes;
  } catch (error: unknown) {
    throw new TouchRequestError(`the ${step}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * A reply's sequence byte against the command's: the remote sets the high bit of the number it echoes,
 * `0x80 | sequence`, in every recorded reply; the plain echo is accepted as the file write path accepts it.
 */
function checkEcho(reply: Uint8Array, sequence: number, step: string): void {
  const echoed = reply[OFFSET_SEQUENCE];
  if (echoed !== (CHUNK_REPLY_FLAG | sequence) && echoed !== sequence) {
    throw new TouchRequestError(`the ${step}'s reply carries sequence ${echoed}, not ${CHUNK_REPLY_FLAG | sequence}`);
  }
}

function beU32(bytes: Uint8Array, at: number): number {
  return (((bytes[at] as number) << 24) | ((bytes[at + 1] as number) << 16)
    | ((bytes[at + 2] as number) << 8) | (bytes[at + 3] as number)) >>> 0;
}

/**
 * The answer's data packets after a read command, to the terminator, cut to the size the open stated.
 * The first report is the read's own reply; then data packets, a sequence byte, a size byte and the bytes;
 * then `0xFE`. An answer longer than one read asks for is refused rather than read again, since a second
 * read is not what the client was recorded doing.
 */
async function readAnswer(transport: Transport, size: number): Promise<Uint8Array> {
  await awaitReply(transport, FILE_READ, TOUCH_TIMEOUT_MS.read, 'read');
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const report = await transport.read(TOUCH_TIMEOUT_MS.read);
    if (report === undefined) throw new TouchRequestError(`the answer stopped after ${total} of ${size} bytes`);
    if (report[0] === READ_TERMINATOR) break;
    if (report[OFFSET_SERVICE] === FILE_SERVICE && report[OFFSET_COMMAND] === FILE_READ) {
      expectFileReply(decodeFileReply(report), FILE_READ);
      continue;
    }
    const length = Math.min(report[1] as number, report.length - 2);
    chunks.push(report.slice(2, 2 + length));
    total += length;
  }
  if (total < size) throw new TouchRequestError(`the answer is ${size} bytes and ${total} arrived before its end`);
  const assembled = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    assembled.set(chunk, at);
    at += chunk.length;
  }
  return assembled.slice(0, size);
}

/**
 * **Logitech's client's number** for a write of answers: the length of its `responses` argument as written,
 * URL encoded, not of the whole line. That is what their client stated before every one of the twelve
 * answer writes in the three recorded syncs, from 107 to 571459, each time the line's length less its name,
 * its `sessionId` and the argument's own name, 101 to 104 characters, `touch-host.test.ts`. A session sends
 * it only when asked for with `announce: 'responses'`, which the tests comparing this file with the
 * recordings do.
 *
 * **It is short, and a session sending it reproduces a hazard of Logitech's client.** The remote's cable
 * listener counts every character of the line **from the request's name on**, and it is handed each write
 * command's text as the command arrives, so for a line written in more than one chunk it acts as soon as
 * the chunks it holds reach the announced number. When the last chunk is no longer than the shortfall, the
 * 101 to 104 characters above, it acts one chunk early, on a line whose `responses` stops short, which it
 * answers as JSON it cannot decode, and the last chunk then arrives as a request line of its own. A chunk
 * is 500 packets, 31000 characters, so that is a line whose length is a little over a whole number of
 * chunks. Every recorded write of more than one chunk ended in a chunk of thousands of characters, so the
 * recordings never met it. The listener's count is read in the engine, the per command hand over in the
 * native program, `reference/architectures/harmony-touch/answering-a-sync.md` "A long answer is announced
 * first"; neither has been run. **The default announcement is the whole line instead**, `TouchAnnouncement`,
 * which the listener reaches on the last chunk whatever its length.
 *
 * A write of answers without exactly one `responses` argument is refused, since there is nothing to state.
 */
export function announcedLength(line: string): number {
  const parts = line.split('&responses=');
  if (parts.length !== 2 || (parts[1] as string).length === 0) {
    throw new TouchRequestError('a write of answers carries one responses argument, and this line does not');
  }
  return (parts[1] as string).length;
}

/**
 * The number a session announces a write of answers with, by the rule asked for, `TouchAnnouncement`. Both
 * refuse a line without exactly one `responses` argument, so the rule chosen changes the number and nothing
 * else about what a session accepts.
 */
export function announcementFor(line: string, rule: TouchAnnouncement): number {
  const responses = announcedLength(line);
  return rule === 'responses' ? responses : line.length;
}

/**
 * One operation: the line written into `/sys/hlapi` and the answer read out of it, in the template's
 * shape. Not exported: the only way in is `request`, which asks the rail first.
 */
async function operation(
  transport: Transport,
  line: string,
  shape: TouchRequestShape,
  log: (line: string) => void,
): Promise<string> {
  const bytes = asciiBytes(line);
  const chunks = chunksOf(bytes, shape);
  const sequence = new SequenceCounter(shape.firstRuntimeSequence);

  await send(transport, requestOpenForWritingReport(shape, bytes.length));
  const opened = await awaitReply(transport, FILE_OPEN, TOUCH_TIMEOUT_MS.open, 'open for writing');
  checkEcho(opened, shape.openWriteSequence, 'open for writing');
  const handle = opened[OFFSET_HANDLE] as number;

  // **No close after a failure while writing**, the file write path's reason: part way through a chunk the
  // remote counts packets, and a close would be taken for one. The read side closes whatever happens.
  for (const [index, payloads] of chunks.entries()) {
    const last = index === chunks.length - 1;
    const done = last && shape.donePacket;
    await send(transport, requestWriteChunkReport(shape, handle, 1 + payloads.length + (done ? 1 : 0), sequence.take()));
    let lastSequence = -1;
    for (const payload of payloads) {
      lastSequence = sequence.take();
      await send(transport, dataPacket(lastSequence, payload));
    }
    if (done) await send(transport, donePacket());
    const reply = await awaitReply(transport, FILE_WRITE, TOUCH_TIMEOUT_MS.write, `write chunk ${index + 1}`);
    const expected = done ? DONE_REPLY : CHUNK_REPLY_FLAG | lastSequence;
    if (reply[OFFSET_SEQUENCE] !== expected) {
      throw new TouchRequestError(
        `chunk ${index + 1} of ${chunks.length} was answered with 0x${(reply[OFFSET_SEQUENCE] ?? 0).toString(16)}, `
          + `not 0x${expected.toString(16)}`,
      );
    }
  }
  const writeClose = sequence.take();
  await send(transport, closeReport(handle, writeClose));
  checkEcho(await awaitReply(transport, FILE_CLOSE, TOUCH_TIMEOUT_MS.close, 'close'), writeClose, 'close');

  await send(transport, requestOpenForReadingReport(shape));
  const forReading = await awaitReply(transport, FILE_OPEN, TOUCH_TIMEOUT_MS.open, 'open for reading');
  checkEcho(forReading, shape.openReadSequence, 'open for reading');
  const readHandle = forReading[OFFSET_HANDLE] as number;
  const size = beU32(forReading, OFFSET_SIZE);
  // The read's number is taken whether or not the read is sent, so the close keeps the client's number.
  const readSequence = sequence.take();
  let answer: Uint8Array = new Uint8Array(0);
  try {
    // An empty answer is not read: the one the recordings hold drew no reply to its read at all.
    if (size > 0) {
      await send(transport, requestReadReport(shape, readHandle, readSequence));
      answer = await readAnswer(transport, size);
    }
  } finally {
    const readClose = sequence.take();
    await send(transport, closeReport(readHandle, readClose));
    await awaitReply(transport, FILE_CLOSE, TOUCH_TIMEOUT_MS.close, 'close after reading');
  }
  const text = Buffer.from(answer).toString('utf8');
  log(`${JSON.stringify(line.split('&')[0])}: ${bytes.length} bytes written, ${answer.length} answered`);
  return text;
}

/**
 * Open a session on the Touch behind `transport`: read its identity file and refuse any remote but the
 * unit the session is for. The flags are asked per request, so a session opens in a read only build and
 * every request it is given is refused there.
 *
 * `transport` is the guarded one `openFileBasedRemote` returns; the identity file is read through the read
 * path, ping, open, read and close, and `/sys/sysinfo` is on `INERT_PATHS`.
 */
export async function openTouchRequestSession(
  transport: Transport,
  options: TouchSessionOptions,
): Promise<TouchRequestSession> {
  const log = options.log ?? ((): void => undefined);
  const announce = options.announce ?? 'line';
  const sysinfo = parseSysInfo(Buffer.from(await readFile(transport, '/sys/sysinfo')).toString('ascii'));
  log(`read: architecture ${sysinfo.get('arch') ?? '?'}, skin ${sysinfo.get('skin') ?? '?'}, `
    + `firmware ${sysinfo.get('fw_ver') ?? '?'}`);
  assertTouchUnit({ sysinfo, permittedUnit: options.permittedUnit });
  log('the unit matches its record');
  const permittedUnit = Uint8Array.from(options.permittedUnit);

  // One request at a time: two interleaved would interleave their reports on the one channel.
  let busy = false;
  const session: TouchRequestSession = {
    async request(line: string): Promise<TouchAnswer> {
      if (busy) throw new TouchRequestError('a request is already running on this session');
      busy = true;
      try {
        const start = assertTouchRequestAllowed({ path: TOUCH_REQUEST_PATH, line, sysinfo, permittedUnit });
        const shape = TOUCH_REQUEST_SHAPES[start.name];
        if (shape === undefined) throw new TouchRequestError(`no shape for ${start.name}, which is a bug`);
        let announcement: string | undefined;
        if (start.name === TOUCH_ANSWER_WRITE) {
          const shapeOfAnnouncement = TOUCH_REQUEST_SHAPES['Content-Length'];
          if (shapeOfAnnouncement === undefined) throw new TouchRequestError('no shape for the announcement, which is a bug');
          announcement = await operation(transport, `Content-Length: ${announcementFor(line, announce)}`, shapeOfAnnouncement, log);
        }
        const text = await operation(transport, line, shape, log);
        return announcement === undefined
          ? { name: start.name, tier: start.tier, text }
          : { name: start.name, tier: start.tier, text, announcement };
      } finally {
        busy = false;
      }
    },
  };
  return Object.freeze(session);
}
