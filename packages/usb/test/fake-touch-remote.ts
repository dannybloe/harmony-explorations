/**
 * A pretend Harmony Touch on the far side of a transport, for the request channel's tests, in two modes.
 *
 * * **Answering**: it answers the way the recorded syncs show the remote does, `touch-sync.test.ts`. An
 *   open replies `0x80 | sequence`, a handle and a size; a write command counts itself and every packet
 *   after it, the done packet included, and replies `0xFE` after a done packet and `0x80` with the last
 *   data packet's sequence number otherwise; a read replies with its own header, the data packets and the
 *   terminator. What `/sys/hlapi` answers on reading is whatever `answer` makes of the last line written
 *   into it. `/sys/sysinfo` serves the identity file given, and every other path is refused at open.
 * * **Replaying**: from the first open of `/sys/hlapi` on, every report that arrives is compared with the
 *   next one a recorded sync sent, and the recorded replies are served once a command's reports are all
 *   in. The first difference is kept in `mismatch` and refused, so a test can say where the bytes parted.
 *
 * `operationsOf` turns a recording into what the replay needs. Not a test file itself, so the runner does
 * not pick it up; it is imported by `touchsession.test.ts`, including from its subprocesses.
 */
import {
  DONE_PACKET,
  FILE_CLOSE,
  FILE_OPEN,
  FILE_READ,
  FILE_WRITE,
  READ_TERMINATOR,
  requestedPath,
} from '../src/filepipe.ts';
import { TOUCH_READ_REQUESTS, TOUCH_SYNC_REQUESTS, TOUCH_ANNOUNCEMENT } from '../src/rails.ts';
import { TransportError, type Transport } from '../src/transport.ts';
import { commands, payload, records, strings, type Command } from './touch-recording.ts';

const SERVICE = 0xff;
const REPORT = 64;

function padded(bytes: readonly number[]): Uint8Array {
  const report = new Uint8Array(REPORT);
  report.set(bytes);
  return report;
}

function be32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function same(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export interface FakeTouchRemoteOptions {
  /** `/sys/sysinfo`'s text: name, a space, a value, a line each. */
  readonly sysinfo: string;
  /** What `/sys/hlapi` answers on reading, given the last line written into it. */
  readonly answer?: (line: string) => string;
  /** A recording's commands to replay from the first open of `/sys/hlapi`. */
  readonly replay?: readonly Command[];
}

export class FakeTouchRemote implements Transport {
  /** Every report that reached the remote, in order. */
  readonly sent: Uint8Array[] = [];
  /** Every line written into `/sys/hlapi`, in order, when answering. */
  readonly lines: string[] = [];
  /** Where a replay parted from the recording, if it did. */
  mismatch: string | undefined;
  /** How many recorded commands the replay served whole. */
  replayed = 0;

  private readonly replies: Uint8Array[] = [];
  private nextHandle = 1;
  private open: { path: string; mode: string; handle: number; content: Uint8Array; written: number[] } | undefined;
  private chunk: { left: number; lastSequence: number; sawDone: boolean } | undefined;
  private replaying = false;
  private command = 0;
  private report = 0;

  private readonly options: FakeTouchRemoteOptions;

  constructor(options: FakeTouchRemoteOptions) {
    this.options = options;
  }

  async write(report: Uint8Array): Promise<void> {
    this.sent.push(Uint8Array.from(report));
    if (!this.replaying && this.options.replay !== undefined && report[0] === SERVICE && report[1] === FILE_OPEN
      && requestedPath(report) === '/sys/hlapi') {
      this.replaying = true;
    }
    if (this.replaying) {
      this.replayOne(report);
      return;
    }
    this.answerOne(report);
  }

  async read(): Promise<Uint8Array | undefined> {
    return this.replies.shift();
  }

  async close(): Promise<void> {}

  private replayOne(report: Uint8Array): void {
    const recorded = this.options.replay ?? [];
    const expected = recorded[this.command]?.request[this.report];
    if (expected === undefined || !same(expected, report)) {
      this.mismatch ??= `command ${this.command} report ${this.report}: sent `
        + `${Buffer.from(report.subarray(0, 12)).toString('hex')}, recorded `
        + `${expected === undefined ? 'nothing' : Buffer.from(expected.subarray(0, 12)).toString('hex')}`;
      throw new TransportError(`the replay parted from the recording at ${this.mismatch}`);
    }
    this.report += 1;
    const command = recorded[this.command]!;
    if (this.report === command.request.length) {
      this.replies.push(...command.reply);
      this.command += 1;
      this.report = 0;
      this.replayed += 1;
    }
  }

  private answerOne(report: Uint8Array): void {
    if (this.chunk !== undefined) {
      this.takePacket(report);
      return;
    }
    if (report[0] !== SERVICE) throw new TransportError('a data packet with no write command open');
    const command = report[1] as number;
    const sequence = report[2] as number;
    const echo = 0x80 | sequence;
    switch (command) {
      case 0x00:
        this.replies.push(padded([SERVICE, 0x00, echo, 0]));
        return;
      case FILE_OPEN: {
        const path = requestedPath(report) ?? '';
        const mode = strings(report)[1] ?? '';
        let content: Uint8Array;
        if (path === '/sys/sysinfo' && mode === 'R') content = Buffer.from(this.options.sysinfo, 'ascii');
        else if (path === '/sys/hlapi' && mode === 'W') content = new Uint8Array(0);
        else if (path === '/sys/hlapi' && mode === 'R') {
          const line = this.lines.at(-1) ?? '';
          content = Buffer.from((this.options.answer ?? ((): string => 'Response,{}'))(line), 'utf8');
        } else {
          // The refusal every template checks: the sequence byte replaced by the error marker.
          this.replies.push(padded([SERVICE, FILE_OPEN, 0xff, 1, 1, 0x0b]));
          return;
        }
        const handle = this.nextHandle;
        this.nextHandle += 1;
        this.open = { path, mode, handle, content, written: [] };
        this.replies.push(padded([SERVICE, FILE_OPEN, echo, 2, 1, handle, 4, ...be32(content.length)]));
        return;
      }
      case FILE_WRITE: {
        const count = report[6] === 1 ? report[7] as number : ((report[7] as number) << 8) | (report[8] as number);
        this.chunk = { left: count - 1, lastSequence: -1, sawDone: false };
        return;
      }
      case FILE_READ: {
        const open = this.open;
        if (open === undefined) throw new TransportError('a read with nothing open');
        this.replies.push(padded([SERVICE, FILE_READ, echo, 2, 1, open.handle, 1, 1]));
        let packet = 0;
        for (let at = 0; at < open.content.length; at += 62) {
          const part = open.content.subarray(at, Math.min(open.content.length, at + 62));
          this.replies.push(padded([packet % 64, part.length, ...part]));
          packet += 1;
        }
        this.replies.push(padded([READ_TERMINATOR]));
        return;
      }
      case FILE_CLOSE: {
        const open = this.open;
        if (open !== undefined && open.path === '/sys/hlapi' && open.mode === 'W') {
          this.lines.push(String.fromCharCode(...open.written));
        }
        this.replies.push(padded([SERVICE, FILE_CLOSE, echo, 1, 1, open?.handle ?? 0]));
        this.open = undefined;
        return;
      }
      default:
        throw new TransportError(`the fake Touch does not answer command 0x${command.toString(16)}`);
    }
  }

  private takePacket(report: Uint8Array): void {
    const chunk = this.chunk!;
    if (report[0] === DONE_PACKET) {
      chunk.sawDone = true;
    } else {
      chunk.lastSequence = report[0] as number;
      this.open?.written.push(...report.subarray(2, 2 + (report[1] as number)));
    }
    chunk.left -= 1;
    if (chunk.left === 0) {
      const flag = chunk.sawDone ? 0xfe : 0x80 | chunk.lastSequence;
      this.replies.push(padded([SERVICE, FILE_WRITE, flag, 1, 1, this.open?.handle ?? 0]));
      this.chunk = undefined;
    }
  }
}

/** One `/sys/hlapi` operation of a recording: the line written and every command it took. */
export interface RecordedOperation {
  readonly line: string;
  readonly commands: readonly Command[];
}

/**
 * The `/sys/hlapi` operations of a recording whose request the rail allows, and the announcements, in the
 * order they ran: from an open for writing of `/sys/hlapi` to the close after its answer was read. The
 * commands on other files in between, the identity file and the clock, are left out, which is what the
 * session does not send.
 */
export function operationsOf(fixture: string): RecordedOperation[] {
  const allowed = new Set([...TOUCH_READ_REQUESTS, ...TOUCH_SYNC_REQUESTS]);
  const out: { line: number[]; commands: Command[] }[] = [];
  let path: string | undefined;
  let current: { line: number[]; commands: Command[] } | undefined;
  for (const c of commands(records(fixture))) {
    const head = c.request[0]!;
    const command = head[1];
    if (command === FILE_OPEN) {
      path = requestedPath(head);
      if (path === '/sys/hlapi' && strings(head)[1] === 'W') {
        current = { line: [], commands: [] };
        out.push(current);
      }
    }
    if (path === '/sys/hlapi' && current !== undefined) {
      current.commands.push(c);
      if (command === FILE_WRITE) current.line.push(...payload(c.request.slice(1)));
    }
    // A close ends the file it closes; a ping or a reset after it belongs to no file.
    if (command === FILE_CLOSE) path = undefined;
  }
  return out
    .map((o) => ({ line: Buffer.from(o.line).toString('latin1'), commands: o.commands }))
    .filter((o) => TOUCH_ANNOUNCEMENT.test(o.line) || allowed.has(o.line.split('&')[0]!));
}
