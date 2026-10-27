/**
 * A pretend Harmony 300 or 350 on the far side of a transport, for the file write path's tests.
 *
 * **It answers the way the 1.4 firmware reading says the remote does**, `tests/test_harmony_350_file_write.py`,
 * and not the way the writer expects, which is the point of having it: an open for writing of
 * `/cfg/usercfg` erases the file before it answers; a write command counts itself and every packet after
 * it, the done packet included, and answers `0x80` with the last data packet's sequence number, or `0xFE`
 * after the done packet; the check compares the expected value with the word stored two bytes before
 * `end_addr` and recomputes nothing; and a read of `/cfg/usercfg` serves `end_addr - 0x020000` bytes,
 * four short of the container. Where the firmware reading leaves something open, the byte order the check
 * compares in, this answers the way `filewrite.ts` assumes and says so here, so a hardware run that
 * disagrees is a finding about the remote and not a fault in this file.
 *
 * Not a test file itself, so the runner does not pick it up; it is imported by `filewrite.test.ts`,
 * including from the subprocesses that run with the write flags set.
 */
import type { Transport } from '../src/transport.ts';

const SERVICE = 0xff;
const REPORT = 64;
const CONFIG_BASE = 0x020000;
/** `/cfg/usercfg`'s place in the file table, which the firmware hands out as its handle. */
const USERCFG_HANDLE = 5;
/** The region an open for writing erases: the file's 256 KiB and the 128 KiB after it. */
const ERASED = 0x060000;

export interface FakeFileRemoteOptions {
  readonly sysinfo: string;
  /** `/sys/guid`, 64 bytes. */
  readonly guid: Uint8Array;
  /** What `/cfg/usercfg` holds, as stored: a whole container, marker included, or nothing. */
  readonly usercfg: Uint8Array;
  /** Flip this byte of the file as it is programmed, to make the read back disagree. */
  readonly corruptAt?: number;
}

/** A report padded to the report length. */
function padded(bytes: readonly number[]): Uint8Array {
  const report = new Uint8Array(REPORT);
  report.set(bytes);
  return report;
}

function be32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

export class FakeFileRemote implements Transport {
  /** Every report that reached the remote, in order, as it arrived. */
  readonly sent: Uint8Array[] = [];
  /** The external flash from `0x020000`, the region an open for writing erases. */
  readonly flash = new Uint8Array(ERASED).fill(0xff);
  rebooted = false;
  erased = false;

  private readonly files: Map<string, { handle: number; bytes: () => Uint8Array }>;
  private readonly replies: Uint8Array[] = [];
  private readonly corruptAt: number | undefined;
  private reading: { bytes: Uint8Array; at: number } | undefined;
  /** While a chunk is open: the count it stated and how many packets have arrived, the command being 1. */
  private chunk: { count: number; seen: number } | undefined;
  /** The running address a data packet is programmed at, from the file's place. */
  private address = 0;

  constructor(options: FakeFileRemoteOptions) {
    this.flash.set(options.usercfg, 0);
    this.corruptAt = options.corruptAt;
    const sysinfo = new TextEncoder().encode(options.sysinfo);
    this.files = new Map([
      ['/sys/sysinfo', { handle: 20, bytes: () => sysinfo }],
      ['/sys/guid', { handle: 7, bytes: () => options.guid }],
      ['/cfg/usercfg', { handle: USERCFG_HANDLE, bytes: () => this.servedConfiguration() }],
    ]);
  }

  /** `end_addr - 0x020000` bytes, and none when the field is erased, which is the firmware's read size. */
  servedConfiguration(): Uint8Array {
    const view = new DataView(this.flash.buffer);
    const endAddr = view.getUint32(4, true);
    const size = endAddr - CONFIG_BASE;
    if (endAddr === 0xffffffff || size < 0 || size > this.flash.length) return new Uint8Array(0);
    return this.flash.slice(0, size);
  }

  async write(report: Uint8Array): Promise<void> {
    this.sent.push(Uint8Array.from(report));
    if (this.chunk !== undefined) {
      this.dataPacket(report);
      return;
    }
    if (report[0] !== SERVICE) throw new Error('the fake remote got a data packet outside a write');
    const command = report[1] as number;
    const sequence = report[2] as number;
    switch (command) {
      case 0x00:
        this.replies.push(padded([SERVICE, 0x00, sequence, 0]));
        return;
      case 0x01:
        this.open(report, sequence);
        return;
      case 0x03:
        // `01 handle 01 count`: the counter starts at 1 for this command.
        this.chunk = { count: report[7] as number, seen: 1 };
        return;
      case 0x04:
        this.serve(report[7] as number);
        return;
      case 0x05:
        this.replies.push(padded([SERVICE, 0x05, sequence, 1, 1, report[5] as number]));
        return;
      case 0x06:
        this.check(report, sequence);
        return;
      case 0x07:
        this.reading = undefined;
        this.replies.push(padded([SERVICE, 0x07, sequence, 1, 1, report[5] as number]));
        return;
      case 0xff:
        if (report[5] === 0x00) this.rebooted = true;
        this.reading = undefined;
        this.replies.push(padded([SERVICE, 0xff, sequence, 0]));
        return;
      default:
        throw new Error(`the fake remote does not know command 0x${command.toString(16)}`);
    }
  }

  async read(): Promise<Uint8Array | undefined> {
    return this.replies.shift();
  }

  async close(): Promise<void> {}

  // The open's reply sets the high bit of the sequence it echoes, as a Harmony 350 answered on its first
  // write: sequence 1 came back as 129.
  private open(report: Uint8Array, sequence: number): void {
    let at = 5;
    const name: number[] = [];
    while (report[at] !== 0) name.push(report[at++] as number);
    const path = String.fromCharCode(...name);
    const mode = String.fromCharCode(report[at + 2] as number);
    const file = this.files.get(path);
    if (file === undefined) {
      this.replies.push(padded([SERVICE, 0x01, 0xff, 1, 1, 0x0b]));
      return;
    }
    if (mode === 'W') {
      // Erased before the answer, six blocks, and the verdict cleared: the firmware's order.
      this.flash.fill(0xff);
      this.erased = true;
      this.address = 0;
      this.replies.push(padded([SERVICE, 0x01, 0x80 | sequence, 2, 1, file.handle, 4, ...be32(ERASED)]));
      return;
    }
    const bytes = file.bytes();
    this.reading = { bytes, at: 0 };
    this.replies.push(padded([SERVICE, 0x01, 0x80 | sequence, 2, 1, file.handle, 4, ...be32(bytes.length)]));
  }

  /** Up to `packets` data packets, and the terminator only when the file ends inside this batch. */
  private serve(packets: number): void {
    const reading = this.reading;
    if (reading === undefined) throw new Error('the fake remote got a read with nothing open');
    let sent = 0;
    while (sent < packets && reading.at < reading.bytes.length) {
      const piece = reading.bytes.subarray(reading.at, reading.at + 62);
      this.replies.push(padded([sent & 0x3f, piece.length, ...piece]));
      reading.at += piece.length;
      sent += 1;
    }
    if (sent < packets) this.replies.push(padded([0xfe]));
  }

  private dataPacket(report: Uint8Array): void {
    const chunk = this.chunk as { count: number; seen: number };
    const sequence = report[0] as number;
    // The length is the low six bits, `ANDLW 0x3F`, and the done packet is a packet of length zero.
    const length = (report[1] as number) & 0x3f;
    for (let i = 0; i < length; i += 1) {
      let byte = report[2 + i] as number;
      if (this.address === this.corruptAt) byte ^= 0xff;
      // NOR flash programs ones to zeroes and never back, so an AND is what a page program does.
      this.flash[this.address] = (this.flash[this.address] as number) & byte;
      this.address += 1;
    }
    chunk.seen += 1;
    if (chunk.seen === chunk.count) {
      this.chunk = undefined;
      this.replies.push(padded([SERVICE, 0x03, 0x80 | sequence, 0]));
    }
  }

  private check(report: Uint8Array, sequence: number): void {
    // `01 h  01 01  80 'XOR' 00  02 seed  04 offset  04 length  02 expected`: the expected value's two
    // bytes are 27 and 28. Big endian, as every number in this protocol, compared with the stored word
    // read as a number; the firmware's own byte order here is the one thing not read.
    const expected = ((report[27] as number) << 8) | (report[28] as number);
    const view = new DataView(this.flash.buffer);
    const magic = String.fromCharCode(...this.flash.subarray(0, 4));
    const marker = String.fromCharCode(...this.flash.subarray(0x47, 0x4b));
    const endAddr = view.getUint32(4, true);
    const at = endAddr - CONFIG_BASE - 2;
    const stored = magic === 'GSPM' && marker === 'LWJL' && at > 0 && at + 2 <= this.flash.length
      ? view.getUint16(at, true) : -1;
    const answer = stored === expected ? 0x6d : 0x75;
    this.replies.push(padded([SERVICE, 0x06, sequence, 3, 1, report[5] as number, 0x80, answer, 0,
      2, (stored >>> 8) & 0xff, stored & 0xff]));
  }
}
