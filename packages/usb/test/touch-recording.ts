/**
 * The decoder of a sync of a Harmony Touch recorded through the lab's inspectable copy of Harmony Desktop,
 * shared by the tests that read a recording.
 *
 * A recording is one JSON object a line: what the page's recorder posted, which is every web request with
 * its answer and every call through the page's `prompt()` bridge to the USB layer. This file turns the
 * bridge calls back into file protocol commands, the commands into file sessions, and the `/sys/hlapi`
 * sessions into the requests and answers they carried, over `filepipe.ts`'s framing, so there is one
 * decoder however many recordings are read. The argument for trusting it is the closure in
 * `touch-sync.test.ts`: a wrong packet boundary would garble documents that are compared whole with the
 * web side's answers.
 *
 * Not a test file itself, so the runner does not pick it up.
 */
import * as lab from '@harmony/lab';
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
} from '../src/filepipe.ts';

/** One line of the recording: a record the page's recorder posted, or the shell's own. */
export interface Line {
  name: string;
  body: unknown;
}

export interface Record_ {
  kind: string;
  message?: string;
  answer?: string;
  method?: string;
  url?: string;
  response?: unknown;
}

export function records(fixture: string): Record_[] {
  const text = new TextDecoder().decode(lab.require_(fixture));
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
}

export function commands(all: Record_[]): Command[] {
  const out: Command[] = [];
  for (const r of all) {
    if (r.kind !== 'prompt' || !r.message?.includes('"execute"')) continue;
    const data = (JSON.parse(r.message) as { data: { request: string } }).data;
    const answer = r.answer ?? '';
    if (data.request) out.push({ request: reports(hex(data.request)), reply: [] });
    else if (out.length > 0 && answer && !answer.startsWith('{{') && out.at(-1)!.reply.length === 0) {
      out.at(-1)!.reply = reports(hex(answer));
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
}

export function sessions(cmds: Command[]): Session[] {
  const out: Session[] = [];
  let current: Session | undefined;
  for (const c of cmds) {
    const head = c.request[0]!;
    const command = head[OFFSET_COMMAND];
    if (command === FILE_OPEN) {
      current = { path: requestedPath(head) ?? '?', mode: strings(head)[1] ?? '?', written: Buffer.alloc(0), read: Buffer.alloc(0), refused: false };
      out.push(current);
    } else if (command === FILE_WRITE && current) {
      current.written = Buffer.concat([current.written, payload(c.request.slice(1))]);
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

export const SIX = ['ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList'];

/** The last path segment of a logical address, which names the resource. */
export const resource = (uri: string): string => uri.split('?')[0]!.split('/').at(-1)!;
