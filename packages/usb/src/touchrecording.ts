/**
 * The decoder of a sync of a Harmony Touch recorded through the lab's inspectable copy of Harmony Desktop:
 * a library, `@harmony/usb/touchrecording`, because the bench's and the corpus's scripts that derive what a
 * remote holds from a recorded sync run it as well as the tests do. It lived in `test/` and was
 * exported as `./test/touch-recording` at first, so a runnable script depended on a test file.
 *
 * A recording is one JSON object a line: what the page's recorder posted, which is every web request with
 * its answer and every call through the page's `prompt()` bridge to the USB layer. This file turns the
 * bridge calls back into file protocol commands, the commands into file sessions, and the `/sys/hlapi`
 * sessions into the requests and answers they carried, over `filepipe.ts`'s framing, so there is one
 * decoder however many recordings are read. The argument for trusting it is the closure in
 * `touch-sync.test.ts`: a wrong packet boundary would garble documents that are compared whole with the
 * web side's answers.
 *
 * **It reads bytes and never the lab.** `recordsOf` takes a recording's bytes; a script reads them out of the
 * lab itself, and a test through the test kit's `records`, `@harmony/testkit/touch-recording`, which also
 * holds the readers of a run of this project's own answerer, `reply`, `list` and `written`. This package
 * does not depend on the lab locator outside its tests, and a product that loads this module loads no lab.
 */
import {
  DONE_PACKET,
  FILE_CLOSE,
  FILE_OPEN,
  FILE_READ,
  FILE_REPORT_BYTES,
  FILE_WRITE,
  OFFSET_COMMAND,
  OFFSET_SEQUENCE,
  READ_TERMINATOR,
  REPLY_ERROR,
  STRING_PREFIX,
  requestedPath,
} from './filepipe.ts';

/** One line of the recording: a record the page's recorder posted, or the shell's own. */
export interface Line {
  name: string;
  body: unknown;
}

export interface Record_ {
  kind: string;
  /** When the page's recorder saw the call, in milliseconds; what times a command's reply. */
  at?: number;
  message?: string;
  answer?: string;
  method?: string;
  url?: string;
  response?: unknown;
}

/** The recorder's records of a recording, out of its bytes: one JSON object a line, the page recorder's own kept. */
export function recordsOf(recording: Uint8Array): Record_[] {
  const text = new TextDecoder().decode(recording);
  return text
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as Line)
    .filter((l) => l.name === 'hdRecorder' && typeof l.body === 'object' && l.body !== null)
    .map((l) => l.body as Record_);
}

export function hex(s: string): Uint8Array {
  return Uint8Array.from(Buffer.from(s.replace(/[^0-9A-Fa-f]/g, ''), 'hex'));
}

export function reports(bytes: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let at = 0; at < bytes.length; at += FILE_REPORT_BYTES) out.push(bytes.subarray(at, at + FILE_REPORT_BYTES));
  return out;
}

/**
 * The USB commands, each its request reports and the reply reports of the polls after it.
 *
 * The page sends a command with `execute` and a non empty request, then calls `execute` with an empty
 * request until the reply arrives as hex; until then the shell answers with a `{{-n|...}}` status. So a
 * command is one non empty request and the first hex answer after it.
 */
export interface Command {
  request: Uint8Array[];
  reply: Uint8Array[];
  /**
   * Milliseconds from the call that sent the request to the poll that returned the reply, from the
   * recorder's own timestamps; undefined when either has none. The page polls, so this is the reply's
   * time to within one poll.
   */
  replyMs?: number;
}

export function commands(all: Record_[]): Command[] {
  const out: Command[] = [];
  const sentAt = new Map<Command, number | undefined>();
  for (const r of all) {
    if (r.kind !== 'prompt' || !r.message?.includes('"execute"')) continue;
    const data = (JSON.parse(r.message) as { data: { request: string } }).data;
    const answer = r.answer ?? '';
    if (data.request) {
      out.push({ request: reports(hex(data.request)), reply: [] });
      sentAt.set(out.at(-1)!, r.at);
    } else if (out.length > 0 && answer && !answer.startsWith('{{') && out.at(-1)!.reply.length === 0) {
      const last = out.at(-1)!;
      last.reply = reports(hex(answer));
      const sent = sentAt.get(last);
      if (typeof sent === 'number' && typeof r.at === 'number') last.replyMs = r.at - sent;
    }
  }
  return out;
}

/** Every string parameter of a request report, in order: `0x80`, the characters, a NUL. */
export function strings(report: Uint8Array): string[] {
  const out: string[] = [];
  let at = 4;
  while (at < report.length && report[at] === STRING_PREFIX) {
    let end = at + 1;
    while (end < report.length && report[end] !== 0) end += 1;
    out.push(Buffer.from(report.subarray(at + 1, end)).toString('latin1'));
    at = end + 1;
  }
  return out;
}

/** The payload of a run of data packets: a sequence byte, a size byte, the payload, until a terminator. */
export function payload(packets: Uint8Array[]): Buffer {
  const parts: Buffer[] = [];
  for (const p of packets) {
    if (p[0] === READ_TERMINATOR || p[0] === DONE_PACKET) break;
    parts.push(Buffer.from(p.subarray(2, 2 + p[1]!)));
  }
  return Buffer.concat(parts);
}

/** A file session: what was opened, how, and the bytes written into it or read out of it. */
export interface Session {
  path: string;
  mode: string;
  written: Buffer;
  read: Buffer;
  /** Whether the remote answered any write in this session with the error marker. */
  refused: boolean;
  /** How long the remote took to acknowledge each write command of the session, in order, where timed. */
  writeAcksMs: (number | undefined)[];
  /**
   * How many bytes each write command of the session carried, in order: a line is written in chunks of
   * up to the template's packets per command, and the remote's native program hands each chunk on as it
   * arrives, which is what the announcement's arithmetic is about, `touch-host.test.ts`.
   */
  writeChunks: number[];
}

export function sessions(cmds: Command[]): Session[] {
  const out: Session[] = [];
  let current: Session | undefined;
  for (const c of cmds) {
    const head = c.request[0]!;
    const command = head[OFFSET_COMMAND];
    if (command === FILE_OPEN) {
      current = { path: requestedPath(head) ?? '?', mode: strings(head)[1] ?? '?', written: Buffer.alloc(0), read: Buffer.alloc(0), refused: false, writeAcksMs: [], writeChunks: [] };
      out.push(current);
    } else if (command === FILE_WRITE && current) {
      const chunk = payload(c.request.slice(1));
      current.written = Buffer.concat([current.written, chunk]);
      current.writeChunks.push(chunk.length);
      current.writeAcksMs.push(c.replyMs);
      if (c.reply[0]?.[OFFSET_SEQUENCE] === REPLY_ERROR) current.refused = true;
    } else if (command === FILE_READ && current) {
      // The first reply report is the read's own header; the data packets follow it.
      current.read = Buffer.concat([current.read, payload(c.reply.slice(1))]);
    } else if (command === FILE_CLOSE) {
      current = undefined;
    }
  }
  return out;
}

export const text = (b: Buffer): string => b.toString('utf8').replace(/\0+$/, '');

/** The command a `/sys/hlapi` request line names, or the announcement line, without its arguments. */
export function requestName(line: string): string {
  if (line.startsWith('Content-Length:')) return 'Content-Length';
  if (line.startsWith('[object Object]')) return 'a stringified array';
  return line.split('&')[0]!.replace(/^vnd\.logitech\./, '').replace('/vnd.logitech.', '/');
}

/** One request the remote hands over: a verb, an address, an entity tag if it holds one, and for a `put` the document. */
export interface Request_ {
  verb: string;
  uri: string;
  etag?: string;
  /** The document a `put` carries, URL encoded with `+` for a space. */
  resource?: string;
}

/** The remote's list of requests, from the answer to a `proxy/request?read`. */
export function requestLists(hlapi: Session[]): Request_[][] {
  const out: Request_[][] = [];
  for (let i = 0; i + 1 < hlapi.length; i += 1) {
    if (hlapi[i]!.mode !== 'W' || requestName(text(hlapi[i]!.written)) !== 'proxy/request?read') continue;
    const answer = JSON.parse(text(hlapi[i + 1]!.read).slice('Response,'.length)) as { result: string };
    out.push((JSON.parse(answer.result) as { requests: Request_[] }).requests);
  }
  return out;
}

/**
 * One answer the client writes back to the remote in a `proxy/response?write`: the logical address it
 * answers, the status, and for a document or a picture its type, entity tag and the document parsed.
 * Only `uri` is always there, and a reader that needs another field asserts it where it reads it.
 */
export interface Answer {
  uri: string;
  statusCode: string;
  'body-type'?: string;
  etag?: string;
  resource?: unknown;
}

/**
 * Every answer the client wrote back to the remote, in order, out of a recording's `/sys/hlapi` sessions.
 *
 * Each answer travels as one write, `vnd.logitech.proxy/vnd.logitech.response?write&...&responses=<URL
 * encoded JSON>`, whose JSON holds a list of answers, so the walk keeps the writes that start that way,
 * decodes each and flattens the lists. The one walk for every test that reads what the remote received;
 * a test that wants the answers keyed by resource, or only the `harmony://` ones, shapes this result at
 * its own call site rather than walking the sessions again.
 */
export function answersWritten(hlapi: Session[]): Answer[] {
  return hlapi
    .filter((s) => s.mode === 'W')
    .map((s) => text(s.written))
    .filter((w) => w.startsWith('vnd.logitech.proxy/vnd.logitech.response?write'))
    .flatMap((w) => (JSON.parse(decodeURIComponent(w.split('&responses=')[1]!)) as { responses: Answer[] }).responses);
}

export const SIX = ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList'];

/**
 * The last path segment of a logical address, which names the resource.
 *
 * A twin of the rule in the codec's `documentsOfAnswers`, `packages/codec/src/families/harmony-touch/documents.ts`,
 * kept here because this package cannot import the codec, which depends on it. The two are one line each and
 * have to change together.
 */
export const resource = (uri: string): string => uri.split('?')[0]!.split('/').at(-1)!;

/** The address the remote queues once its screens have committed a sync. */
export const FINISHED = 'proxy://Finished';
/** The name the remote's reply to `getconfighash` carries. */
export const CONFIGHASH = 'vnd.logitech.harmony/vnd.logitech.harmony.engine?getconfighash';
/** The name of a write of answers, and of the remote's reply to one. */
export const WRITE = 'vnd.logitech.proxy/vnd.logitech.response?write';

/** What kind of request an address is, the scheme and the kind and never the identifiers after them. */
export function kind(uri: string): string {
  if (uri === FINISHED) return 'finished';
  if (uri.startsWith('harmony://')) return 'document';
  if (uri.startsWith('content://1.0/user;')) return 'user favourites';
  if (uri.startsWith('content://1.0/device;')) return 'device favourites';
  if (uri.startsWith('content://1.0/service/')) return 'line up';
  if (uri.startsWith('content-image://')) return 'picture';
  if (uri.startsWith('https://')) return 'picture';
  return 'other';
}

export const hasTag = (x: { etag?: string }): boolean => typeof x.etag === 'string' && x.etag.length > 0;

/** A version 8 identifier, the shape of a tag of ours, `ourTag`, `keptCopyTag` and `setTag` in `touchsync.ts`. */
export const OURS = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
