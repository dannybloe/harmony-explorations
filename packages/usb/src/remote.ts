/**
 * The command layer: a remote, and the read operations version 1 of the application needs.
 *
 * Status: every read here has run against **two remotes and both architectures**, a Harmony 600 and
 * a Harmony One, and is measured rather than inferred. The verification that matters is `readFlash`:
 * 256 bytes read off each remote are byte-identical to the lab dump of that same unit, which is an
 * answer obtained without this code.
 *
 * Three things the hardware corrected, all recorded where they belong rather than quietly fixed. An
 * acknowledgement's length nibble is `0` with the command byte following anyway. A data chunk is
 * `0x6A` with a sequence byte ahead of 62 data bytes. And `readFlash` used to stop as soon as it had
 * the bytes it asked for, leaving the trailing acknowledgement in the pipe for the next command to
 * trip over, which looked exactly like a device with a size limit.
 *
 * `readInternalMemory` works and is capped at one chunk, because a multi chunk read of that region
 * restarted a remote. See the method. Every write path has still never touched a device.
 *
 * The one thing the firmware makes certain is that **replies are asynchronous**: a handler parses
 * its arguments, sets a state, and returns; the main loop acts on the state later. So every read
 * here is a write followed by polling, with a timeout, and never an assumption that a reply is
 * already waiting.
 */
import {
  ESCAPE_END_SESSION,
  FLASH_CHUNK_DATA,
  GET_VERSION,
  MISC_RAM,
  READ_FLASH,
  nextFlashSequence,
  VERSION_FIELD_COUNT_MIN,
  decodeReply,
  escapeRequest,
  getVersionRequest,
  readFlashRequest,
  readRamRequest,
  regionOf,
  type Reply,
} from './protocol.ts';
import {
  assertEraseAllowed,
  assertFlashWriteAllowed,
  assertDeliberateHangAllowed,
  assertRamWriteAllowed,
  assertSessionEndAllowed,
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
  /**
   * Which architecture's address rule applies, since the device's own validator is not the same
   * on all of them. Defaults to the arch 12 and arch 14 rule; an arch 9 remote needs `9` or every
   * address that works is refused before it is sent. `docs/findings.md` section 76.
   */
  readonly architecture?: number;
}

const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_IDLE_POLLS = 3;

export class HarmonyRemote {
  private readonly transport: Transport;
  private readonly timeoutMs: number;
  private readonly idlePolls: number;
  private architecture: number | undefined;

  constructor(transport: Transport, options: RemoteOptions = {}) {
    this.transport = transport;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.idlePolls = options.idlePolls ?? DEFAULT_IDLE_POLLS;
    this.architecture = options.architecture;
  }

  /**
   * Adopt the architecture the remote itself stated, once its version block has been read.
   *
   * Narrows rather than overrides: it refuses to change an architecture the caller supplied, so a
   * script that pinned one keeps it and a caller that pinned the wrong one still gets the refusal
   * it asked for. It exists because the address rule has to come from somewhere and the remote's
   * own answer is the best source available, section 118.
   *
   * **This does not touch the write rails.** `ARCHITECTURES_WITH_A_WRITE_TARGET` is consulted
   * separately and is `[12]`, so learning that a remote is arch 9 cannot make it writable.
   */
  useArchitecture(architecture: number): void {
    if (this.architecture === undefined) this.architecture = architecture;
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
   * The version block, twelve bytes on arch 12 and arch 14 and **seven on a Harmony 525**.
   *
   * Twelve because two independent counts agree there: the firmware stores through its output
   * pointer at exactly twelve sites, and the executor copies twelve bytes. A read of a Harmony 600
   * compared against `concordance -i` on the same unit identifies five of them and leaves six
   * unidentified, with one candidate; see `docs/usb-protocol.md` for the mapping and its caveat.
   *
   * **The length is stated by the reply and is not a constant.** This used to insist on twelve, so
   * an arch 9 remote answering `0x27` and seven good fields was refused twice over: once because
   * the decoder matched the whole byte and once because of this check. Measured on the bench on
   * 8 August 2026; `docs/findings.md` section 76.
   *
   * Raw bytes, not a labelled object, and that stays true until a second remote agrees. Ten labels
   * on bytes nobody has identified would be worse than none, because they would be believed.
   */
  async getVersion(): Promise<Uint8Array> {
    const reply = await this.exchange(getVersionRequest());
    if (reply.kind !== 'version') {
      throw new RemoteError(`GET_VERSION answered with a ${reply.kind} reply`);
    }
    if (reply.fields.length < VERSION_FIELD_COUNT_MIN) {
      throw new RemoteError(
        `version block is ${reply.fields.length} bytes, fewer than ${VERSION_FIELD_COUNT_MIN}`,
      );
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
    // Throws for a top byte the device's own rule rejects, and tells us which region this is.
    const region = regionOf(address, this.architecture);
    if (region === 'internal-program-memory' && count % 2 === 1) {
      // The one chunk cap, enforced here rather than only in `readInternalMemory`. It lived there
      // alone until 8 August 2026, which was fine while internal memory was only reachable through
      // the `0xFE` window that method builds. On arch 9 it is at plain low addresses, so every
      // caller of `readFlash` could reach it uncapped and the documents claimed otherwise. The
      // hazard is in `readInternalMemory`'s comment: a multi chunk read of this region has
      // restarted a remote, five times, on arch 12.
      throw new RemoteError(
        `an internal memory read of ${count} bytes is an odd count, and the firmware's fetch loop ` +
          `decrements by two and exits on zero, so an odd count never terminates; ask for an even one`,
      );
    }
    return this.readFlashUnchecked(address, count);
  }

  /**
   * `readFlash`'s body with the odd count refusal already decided by the caller.
   *
   * Private, and the only other caller is `readInternalMemoryExpectingAHang`, which has its own
   * gate. Factored out rather than duplicated so that a fix to the transfer loop cannot apply to one
   * path and not the other.
   */
  private async readFlashUnchecked(address: number, count: number): Promise<Uint8Array> {
    await this.transport.write(readFlashRequest(address, count));

    const out = new Uint8Array(count);
    let filled = 0;
    let idle = 0;
    let sequence: number | undefined;
    let finished = false;
    // Loop until the acknowledgement, not until the byte count is satisfied. Stopping early leaves
    // the trailing `0xF0 0x50` in the pipe, and the next command then reads it first and concludes
    // its own transfer is over. That is not hypothetical: it produced a run where a 32 byte read
    // succeeded, the next 62 byte read returned nothing, and a 256 byte read returned 124, which
    // looks like a device with a mysterious size limit and is really one stale report.
    while (!finished && idle < this.idlePolls) {
      const report = await this.transport.read(this.timeoutMs);
      if (report === undefined) {
        idle += 1;
        continue;
      }
      idle = 0;
      const reply = decodeReply(report);
      if (reply.kind === 'ack' && reply.command === READ_FLASH) {
        finished = true;
        break;
      }
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
    if (!finished) {
      // The bytes are all here but the remote never said it was done, so something is still queued
      // and the next command would inherit it. Better to fail the read that noticed.
      throw new RemoteError(`flash read got ${count} bytes but no completion, so the pipe is dirty`);
    }
    return out;
  }

  /**
   * The MCU's own program memory, which is where a PIC18 J-series part keeps its device id.
   *
   * A `READ_FLASH` whose top address byte is `0xFE` or `0xFF` reads internal memory by table read
   * instead of the external config flash. **The two are separate 64 KiB pages and both read**,
   * measured at six offsets: `0xFE` maps from program address zero, where the three PIC18 vectors
   * are, and `0xFF` is a different page whose top holds the remote's identity block. An earlier
   * measurement here had that backwards and recorded `0xFE` as returning nothing, which came from a
   * single probe rather than from the device. `docs/findings.md` section 22.
   */
  async readInternalMemory(subSelector: 0xfe | 0xff, offset: number, count: number): Promise<Uint8Array> {
    if (count % 2 === 1) {
      // A read of this region can restart the remote, and this refusal is what avoids it. Measured
      // on the spare unprogrammed Harmony One, deliberately, with the owner watching it restart:
      //
      //   63 bytes at 0x1000   restarts it, 3 times out of 3, wherever it sits in a sequence
      //   63 bytes at 0x0040   completed, and the remote died immediately afterwards
      //   63 bytes at 0x0000   fine, twice
      //   64 bytes at 0x1000   fine, twice
      //   124 bytes at 0x1000  fine, twice, and that is two full chunks
      //
      // So it is not the chunk count: 124 is two chunks and is fine. What 63 has that 64 and 124 do
      // not is a final chunk of exactly one byte. Offset 0 looked exempt, and is not: section 96
      // predicted 63 bytes at offset 4 would hang, and it does, four bytes away.
      //
      // **The mechanism is read now, and it is not the chunk shape at all**, section 94. The fetch
      // at `0x26BC8` on the One calls a primitive that can only read a *word*, emits both bytes,
      // and does `count -= 2` with an exit test of `count == 0`. An odd count steps 1, 255, 253 and
      // never lands on zero, so the loop runs forever, and `CLRWDT` at the top of it means the
      // watchdog does not end it either. Every chunk size the length clamp can produce is even
      // except 1, 3 and 5, so the parity of the remaining count never changes: an odd *total* is
      // what hangs a remote.
      //
      // So this refuses odd counts. Two earlier refusals were both bounds around the hazard rather
      // than the hazard: `> FLASH_CHUNK_DATA` refused the 64 byte read Logitech's own client makes,
      // and `% FLASH_CHUNK_DATA == 1` would have let 65 and 127 through.
      //
      // **And an odd read that comes back is not a success**, section 96. The sender at `0x20394`
      // has no bound, so the loop walks a write pointer up through data memory writing what it
      // reads, and after 2247 bytes it overwrites its own counter with a byte of flash. An even byte
      // there is the only reason a read ever returns, and by then it has scribbled over 2247 bytes
      // of the remote's memory. So the refusal covers the case that looks fine as well, which is the
      // main reason it is on the count rather than on the address.
      //
      // Every one of those restarts recovered on its own, and the config read back byte-identical to
      // its dump across three separate windows afterwards. So this is disruption, not damage. Still,
      // "read only" and "harmless" are not the same sentence on this path, which is the reason for a
      // refusal here rather than a comment somewhere.
      throw new RemoteError(
        `an internal memory read of ${count} bytes is an odd count, and the firmware's fetch loop ` +
          `decrements by two and exits on zero, so an odd count never terminates; ask for an even one`,
      );
    }
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

  /**
   * Read internal memory with a count that will not terminate, on purpose.
   *
   * The only caller is an experiment whose subject is the hang. `assertDeliberateHangAllowed`
   * refuses unless `HARMONY_ODD_READ_EXPERIMENT=1`, and refuses an even count too, so this cannot
   * quietly become a second ordinary read path. The ordinary refusal in `readInternalMemory` is
   * untouched.
   *
   * It throws when the remote stops answering, which is the expected outcome rather than a failure,
   * so a caller catches it and carries on.
   */
  async readInternalMemoryExpectingAHang(
    subSelector: 0xfe | 0xff,
    offset: number,
    count: number,
  ): Promise<Uint8Array> {
    assertDeliberateHangAllowed(count);
    return this.readFlashUnchecked((subSelector << 16) | offset, count);
  }

  /**
   * End the command session: `0xE0 0x01`, which clears the command state variable and nothing else.
   *
   * `docs/findings.md` sections 97 and 99. This is the one thing that lets a remote take the
   * unconditional path out of USB mode when its cable goes, instead of sitting in USB mode until its
   * batteries come out. It writes no storage of any kind.
   *
   * **It sends no reply**, so this does not wait for one: the arch 12 handler returns before the
   * shared exit that appends an acknowledgement. A method that waited would time out on success,
   * which is the sort of thing that gets "fixed" by removing the check rather than the wait.
   *
   * Gated all the same, by `assertSessionEndAllowed`, because it changes a device's state. Whether a
   * read only product may send it is not decided by this method existing.
   */
  async endSession(
    p: Pick<WritePermission, 'architecture' | 'targetIsTheSpareRemote'>,
  ): Promise<void> {
    assertSessionEndAllowed(p, ESCAPE_END_SESSION);
    await this.transport.write(escapeRequest(ESCAPE_END_SESSION));
  }
}

export { GET_VERSION, READ_FLASH };
