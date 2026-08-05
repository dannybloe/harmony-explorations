/**
 * The command layer: a remote, and the read operations version 1 of the application needs.
 *
 * Status: **`getVersion`, `readRam` and `readFlash` have run against a Harmony 600 and are measured,
 * not inferred.** The verification that matters is `readFlash`: 256 bytes read off the remote are
 * byte-identical to the lab dump of that same unit, which is an answer obtained without this code.
 * The first run also corrected two things this file had assumed, both recorded in `protocol.ts`
 * where they belong: an acknowledgement's length nibble is `0` with the command byte following
 * anyway, and a data chunk is `0x6A` with a sequence byte ahead of 62 data bytes.
 *
 * `readInternalMemory` and every write path have still never touched a device.
 *
 * The one thing the firmware makes certain is that **replies are asynchronous**: a handler parses
 * its arguments, sets a state, and returns; the main loop acts on the state later. So every read
 * here is a write followed by polling, with a timeout, and never an assumption that a reply is
 * already waiting.
 */
import {
  GET_VERSION,
  MISC_RAM,
  READ_FLASH,
  nextFlashSequence,
  VERSION_FIELD_COUNT,
  decodeReply,
  getVersionRequest,
  readFlashRequest,
  readRamRequest,
  regionOf,
  type Reply,
} from './protocol.ts';
import {
  assertEraseAllowed,
  assertFlashWriteAllowed,
  assertRamWriteAllowed,
  type WritePermission,
} from './rails.ts';
import { eraseFlashRequest, writeFlashRequest, writeMiscRequest } from './protocol.ts';
import type { Transport } from './transport.ts';

export class RemoteError extends Error {}

export interface RemoteOptions {
  /** How long to wait for one report. The default is generous: a flash read is not instant. */
  readonly timeoutMs?: number;
  /** How many empty polls in a row end a transfer that has stopped producing data. */
  readonly idlePolls?: number;
}

const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_IDLE_POLLS = 3;

export class HarmonyRemote {
  private readonly transport: Transport;
  private readonly timeoutMs: number;
  private readonly idlePolls: number;

  constructor(transport: Transport, options: RemoteOptions = {}) {
    this.transport = transport;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.idlePolls = options.idlePolls ?? DEFAULT_IDLE_POLLS;
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  /** Send one request and wait for the first report that comes back. */
  private async exchange(request: Uint8Array): Promise<Reply> {
    await this.transport.write(request);
    for (let poll = 0; poll < this.idlePolls; poll += 1) {
      const report = await this.transport.read(this.timeoutMs);
      if (report !== undefined) return decodeReply(report);
    }
    throw new RemoteError(
      `no reply to command 0x${(request[0] as number).toString(16)} within ` +
        `${this.idlePolls} polls of ${this.timeoutMs} ms`,
    );
  }

  /**
   * The twelve byte version block.
   *
   * Twelve because two independent counts agree: the firmware stores through its output pointer at
   * exactly twelve sites, and the executor copies twelve bytes. A read of a Harmony 600 compared
   * against `concordance -i` on the same unit identifies five of them and leaves six unidentified,
   * with one candidate; see `docs/usb-protocol.md` for the mapping and its caveat, which is that it
   * rests on a single remote.
   *
   * Raw bytes, not a labelled object, and that stays true until a second remote agrees. Ten labels
   * on bytes nobody has identified would be worse than none, because they would be believed.
   */
  async getVersion(): Promise<Uint8Array> {
    const reply = await this.exchange(getVersionRequest());
    if (reply.kind !== 'version') {
      throw new RemoteError(`GET_VERSION answered with a ${reply.kind} reply`);
    }
    if (reply.fields.length !== VERSION_FIELD_COUNT) {
      throw new RemoteError(`version block is ${reply.fields.length} bytes, expected 12`);
    }
    return reply.fields;
  }

  /**
   * One byte of the data memory of a running remote, over `READ_MISC` selector `0x07`.
   *
   * This is the capability that stands in for the deferred emulator: poll a variable while
   * operating the remote by hand, and watch what the firmware does. The button mapping experiment
   * is the first use, by watching the keypad scanner's index while every key is pressed.
   */
  async readRam(dataAddress: number): Promise<number> {
    const reply = await this.exchange(readRamRequest(dataAddress));
    if (reply.kind !== 'misc') {
      throw new RemoteError(`a RAM read answered with a ${reply.kind} reply`);
    }
    if (reply.selector !== MISC_RAM) {
      throw new RemoteError(`the remote echoed selector 0x${reply.selector.toString(16)}`);
    }
    return reply.value;
  }

  /**
   * Read `count` bytes of flash from `address`.
   *
   * Measured against a Harmony 600, and verified the only way worth verifying a read: 256 bytes off
   * the remote came back byte-identical to the lab dump of that same unit, which is an answer
   * obtained without this code.
   *
   * The reply is a series of `0x6A` chunks, each 62 bytes of data behind a sequence byte, then
   * `0xF0 0x50` to say the command is finished. The sequence is checked, because a dropped report
   * over HID is the failure this transfer actually has, and unchecked it would be silent corruption
   * in the middle of a config rather than an error.
   *
   * One thing that was open is now closed by arithmetic rather than by proximity: the firmware
   * compares the remaining count against 63, 63 is the payload the largest length nibble can
   * describe, and one of those 63 bytes is the sequence, so a full chunk carries 62. The device
   * sent exactly the number of bytes asked for, so the count on the wire is not biased by one.
   */
  async readFlash(address: number, count: number): Promise<Uint8Array> {
    regionOf(address); // throws for a top byte the firmware's own validator rejects
    await this.transport.write(readFlashRequest(address, count));

    const out = new Uint8Array(count);
    let filled = 0;
    let idle = 0;
    let sequence: number | undefined;
    while (filled < count && idle < this.idlePolls) {
      const report = await this.transport.read(this.timeoutMs);
      if (report === undefined) {
        idle += 1;
        continue;
      }
      idle = 0;
      const reply = decodeReply(report);
      if (reply.kind === 'ack' && reply.command === READ_FLASH) break;
      if (reply.kind !== 'flash-data') {
        throw new RemoteError(`a flash read answered with a ${reply.kind} reply`);
      }
      const expected = sequence === undefined ? 0x01 : nextFlashSequence(sequence);
      if (reply.sequence !== expected) {
        throw new RemoteError(
          `flash chunk out of sequence: expected 0x${expected.toString(16)}, ` +
            `got 0x${reply.sequence.toString(16)} after ${filled} bytes`,
        );
      }
      sequence = reply.sequence;
      const take = Math.min(reply.data.length, count - filled);
      out.set(reply.data.subarray(0, take), filled);
      filled += take;
    }
    if (filled !== count) {
      throw new RemoteError(`flash read returned ${filled} of ${count} bytes`);
    }
    return out;
  }

  /**
   * The MCU's own program memory, which is where a PIC18 J-series part keeps its device id.
   *
   * A `READ_FLASH` whose top address byte is `0xFE` or `0xFF` reads internal program memory by
   * table read instead of the external config flash. Which of the two values selects what is not
   * established: the validator keeps the low bit of the byte as a sub-selector and both reach the
   * same body. Telling them apart is one of the things this method exists to do.
   */
  async readInternalMemory(subSelector: 0xfe | 0xff, offset: number, count: number): Promise<Uint8Array> {
    if (offset < 0 || offset > 0xffc0) {
      // The firmware bounds the 16-bit offset to 0xFFC0, which is 0x10000 minus a full report, so
      // an offset plus one report cannot leave the window. Refusing here reports the rule; sending
      // it anyway would have the device silently clamp.
      throw new RemoteError(`offset 0x${offset.toString(16)} is outside the 0x0000..0xFFC0 window`);
    }
    return this.readFlash((subSelector << 16) | offset, count);
  }

  // Everything below is a write. It exists so that it is written once, reviewed, and refused by
  // the rails rather than improvised later under time pressure. `rails.ts` decides; these methods
  // only ask, and they ask before touching the transport.

  async writeFlash(p: WritePermission, address: number, data: Uint8Array): Promise<void> {
    assertFlashWriteAllowed(p, address, data.length);
    throw new RemoteError(
      'the flash write data path is not implemented: WRITE_FLASH only announces the write, and ' +
        'the 0x40 data packets that follow it have not been derived from the firmware yet',
    );
  }

  async eraseFlash(p: WritePermission, address: number): Promise<void> {
    assertEraseAllowed(p, address);
    const reply = await this.exchange(eraseFlashRequest(address));
    if (reply.kind !== 'ack') throw new RemoteError('erase was not acknowledged');
  }

  /** Write one byte into the data memory of a running remote. Volatile, and still gated. */
  async writeRam(p: Pick<WritePermission, 'targetIsTheSpareRemote'>, dataAddress: number, value: number): Promise<void> {
    assertRamWriteAllowed(p);
    const reply = await this.exchange(writeMiscRequest(MISC_RAM, dataAddress, value));
    if (reply.kind !== 'ack') throw new RemoteError('the RAM write was not acknowledged');
  }
}

export { GET_VERSION, READ_FLASH };
