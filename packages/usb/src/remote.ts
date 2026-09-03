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
 * `readInternalMemory` works and refuses an **odd** count, because an odd read of that region does
 * not terminate and has restarted a remote. Not a one chunk cap, which is what this said: 124 bytes
 * is two chunks and is fine, and section 94 read the mechanism. See the method. Every write path has
 * still never touched a device.
 *
 * The one thing the firmware makes certain is that **replies are asynchronous**: a handler parses
 * its arguments, sets a state, and returns; the main loop acts on the state later. So every read
 * here is a write followed by polling, with a timeout, and never an assumption that a reply is
 * already waiting.
 */
import {
  ESCAPE_END_SESSION,
  ESCAPE_RESET,
  ERASE_FLASH,
  FLASH_CHUNK_DATA,
  GET_VERSION,
  MISC_RAM,
  READ_FLASH,
  WRITE_FLASH,
  WRITE_MISC,
  nextFlashSequence,
  VERSION_FIELD_COUNT_MIN,
  decodeReply,
  getVersionRequest,
  readFlashRequest,
  readRamRequest,
  ARCH_WITHOUT_A_RAM_READ,
  architectureFromVersion,
  regionOf,
  type Reply,
} from './protocol.ts';
import {
  assertEraseAllowed,
  assertFlashWriteAllowed,
  assertDeliberateHangAllowed,
  assertRamWriteAllowed,
  assertInvalidateAllowed,
  assertResetAllowed,
  assertSessionEndAllowed,
  type WritePermission,
} from './rails.ts';
// The four write encoders live in their own module, which `index.ts` does not re-export: see
// `writes.ts` for why the barrel is the rail here rather than a docstring.
import {
  eraseFlashRequest,
  writeFlashRequests,
  escapeRequest,
  invalidateRequest,
  writeFlashRequest,
  writeMiscRequest,
} from './writes.ts';
import { authoriseReport } from './authorise.ts';
import { IDENTITY_BYTES, IDENTITY_OFFSET, IDENTITY_PAGE } from './identity.ts';
import type { Transport } from './transport.ts';

/**
 * Whether a count is one the internal fetch loop can terminate on.
 *
 * **`count % 2 === 1` is not that test**, and both refusals used it. In JavaScript `-3 % 2` is `-1`
 * and `3.5 % 2` is `1.5`, so a negative odd count and a fractional one both read as even and walked
 * straight through the rail that exists because an odd internal read does not terminate: the loop
 * emits two bytes, subtracts two, and exits on equality with zero, with `CLRWDT` inside it so the
 * watchdog cannot end it either. Section 94. A rail whose predicate is wrong for a whole class of
 * inputs is worse than none, because the tests around it all pass.
 */
function refusableInternalCount(count: number): boolean {
  return !Number.isInteger(count) || count < 0 || count % 2 !== 0;
}

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

/**
 * The internal program memory window: two pages of 64 KiB, selected by the top address byte.
 *
 * `INTERNAL_OFFSET_MAX` is the firmware's own bound on the sixteen bit offset, `0x10000` minus one
 * full report. It is not a bound on where a **read** ends, which is what the count check beside it
 * is for.
 *
 * **Whose firmware, though**: `0xFFC0` is arch 14's (Harmony 600 and 700). Arch 12 (Harmony One)
 * bounds the same offset at `0xFFF8`, section 175, so this constant is stricter than the Harmony
 * One's firmware rather than equal to it. Stricter is the safe direction and one constant is worth
 * keeping, but the provenance has to say which part it was measured on, because "the firmware's own
 * bound" invites somebody to raise it to match a device and reach for the wrong number.
 */
const INTERNAL_PAGE_SIZE = 0x10000;
const INTERNAL_OFFSET_MAX = 0xffc0;

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
  /**
   * Send one report, authorising it first.
   *
   * Every report this class sends goes through here, which is what makes the guard's rule true:
   * a mutating report reaching a real remote came through a method that asked `rails.ts` first.
   *
   * **The authorisation is recorded against the transport rather than on it**, section 224. It used
   * to be a method the transport carried, which meant `openHarmony`'s caller carried it too and
   * could authorise anything at all; `authorise.ts` holds it now and the barrel does not export that
   * file. An unguarded transport, which is what the tests use, ignores the record entirely, so they
   * keep their raw access with no branch here to get wrong.
   */
  private async send(report: Uint8Array): Promise<void> {
    authoriseReport(this.transport, report);
    await this.transport.write(report);
  }

  private async exchange(request: Uint8Array): Promise<Reply> {
    await this.send(request);
    for (let poll = 0; poll < this.idlePolls; poll += 1) {
      const report = await this.transport.read(this.timeoutMs);
      if (report !== undefined) {
        this.answeredOnce = true;
        return decodeReply(report);
      }
    }
    throw new RemoteError(
      `no reply to command 0x${(request[0] as number).toString(16)} within ` +
        `${this.idlePolls} polls of ${this.timeoutMs} ms`,
    );
  }

  /**
   * True once any command has been answered on this handle, which is what bounds the retry below.
   *
   * Not a counter: the only thing anything needs to know is whether this remote has spoken at all.
   */
  private answeredOnce = false;

  /**
   * Send `GET_VERSION` and, if the remote says nothing at all, send it exactly once more.
   *
   * **Measured on 23 August 2026 and this is the whole of the evidence.** A Harmony One that had sat
   * idle in USB mode for about forty minutes after a sync by Logitech's own software did not answer
   * its first `GET_VERSION`: three polls of two seconds, nothing. Its screen said "USB Connected",
   * this session had sent it no commands at all, the cable was not touched and the remote was not
   * reconnected, and the next attempt a few minutes later answered and a whole 1.6 MB config read
   * off it with both integrity checks passing. Its clock proved no reboot happened in between, since
   * uptime was continuous with the boot that followed the sync. Section 155.
   *
   * So the first command of a long idle session can be dropped, and without this a person plugging a
   * remote in would be shown a hard failure that a second attempt clears.
   *
   * **Bounded to this command and to a remote that has never spoken**, deliberately. `GET_VERSION`
   * is the session opener on every path here, it is a pure read, and resending it cannot do anything
   * to a remote. A general retry inside `exchange` would resend whatever it was given, which for a
   * write is the one thing this package must never do, and the evidence covers this command and no
   * other.
   */
  private async exchangeVersion(): Promise<Reply> {
    try {
      return await this.exchange(getVersionRequest());
    } catch (error) {
      if (this.answeredOnce || !(error instanceof RemoteError)) throw error;
      return this.exchange(getVersionRequest());
    }
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
    const reply = await this.exchangeVersion();
    if (reply.kind !== 'version') {
      throw new RemoteError(`GET_VERSION answered with a ${reply.kind} reply`);
    }
    if (reply.fields.length < VERSION_FIELD_COUNT_MIN) {
      throw new RemoteError(
        `version block is ${reply.fields.length} bytes, fewer than ${VERSION_FIELD_COUNT_MIN}`,
      );
    }
    // **The remote has just said which architecture it is, so stop throwing that away.**
    // `useArchitecture` was opt-in, and three of the four callers that read a version block did not
    // call it: the bench, the probe and a test. Without it `this.architecture` stays undefined and
    // `regionOf` falls back to arch 12 (Harmony One)'s rule, under which a Harmony 525's internal
    // program flash at top byte `0x00` is ordinary config flash, so the odd count refusal does not
    // apply and a 63 byte read reaches the wire. Narrowing here rather than at every call site means
    // the default cannot outlive the answer. Section 139, and section 118 is where the same defect
    // was found once already in `read-window.ts`.
    const stated = architectureFromVersion(reply.fields);
    if (stated !== undefined) this.useArchitecture(stated);
    return reply.fields;
  }

  /**
   * One byte of the data memory of a running remote, over `READ_MISC` selector `0x07`.
   *
   * This is the capability that stands in for the deferred emulator: poll a variable while
   * operating the remote by hand, and watch what the firmware does. The button mapping experiment
   * is the first use, by watching the keypad scanner's index while every key is pressed.
   *
   * **It refuses on arch 9 (Harmony 525), and that refusal is a finding rather than caution.** Only
   * selector `0x01` has a body in that firmware's `READ_MISC` executor, section 90, so every other
   * selector emits two bytes it has just cleared: this call would return a plausible **zero** for
   * every address on the device. `decodeReply` says as much in the comment on `value`, that on arch 9
   * the byte after the selector is the high half of a sixteen bit word, and section 137 is what that
   * cost: selector 1 was read as answering zero **for a year** because the decoder took the byte
   * before the one carrying the value. Returning a zero nobody can distinguish from a real zero is
   * the failure this whole section is about, so the honest answer is an error naming the reason.
   * Arch 9 has no route to its data memory at all, section 137: `READ_FLASH`'s window at top byte
   * `0x40` answers zero for the bank 2 bytes holding the offset of the read that is answering.
   */
  async readRam(dataAddress: number): Promise<number> {
    if (this.architecture === undefined) {
      // **Which byte carries the value is architecture dependent**, so answering without knowing the
      // architecture is answering from a guess. `decodeReply` gives `value` as the byte after the
      // selector, correct on arch 12 (Harmony One) and arch 14 (Harmony 600 and 700) and the wrong
      // half on arch 9 (Harmony 525), section 90. The refusal below could not fire on an unpinned
      // remote at all, which is exactly the case a Harmony 525 arrives as. `getVersion` narrows this
      // now, so the fix for a caller is to call it first. Section 139.
      throw new RemoteError(
        'the architecture is unknown, and which byte of a misc reply carries the value depends on '
          + 'it; call getVersion() first, or pass architecture to the constructor',
      );
    }
    if (this.architecture === ARCH_WITHOUT_A_RAM_READ) {
      throw new RemoteError(
        `a Harmony 525 has no READ_MISC body for selector 0x${MISC_RAM.toString(16)}, so this would ` +
          `return a cleared zero for every address; docs/findings.md sections 90 and 137`,
      );
    }
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
    if (region === 'internal-program-memory' && refusableInternalCount(count)) {
      // The odd count refusal, enforced here rather than only in `readInternalMemory`. It lived
      // there alone until 8 August 2026, which was fine while internal memory was only reachable
      // through the `0xFE` window that method builds. On arch 9 (Harmony 525) it is at plain low
      // addresses, so every caller of `readFlash` could reach it unguarded. The hazard is in
      // `readInternalMemory`'s comment: a read of this region has restarted a remote, five times, on
      // arch 12 (Harmony One).
      //
      // **Not a chunk cap**, which is what this and the module docstring both called it: 124 bytes is
      // two chunks and is fine, and the same comment below says so. Section 94 read the trigger and
      // it is the parity, so a comment naming the bound that was tried before the mechanism was found
      // is a superseded reading sitting on top of the correct code.
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
    try {
      return await this.readFlashStream(address, count);
    } catch (error: unknown) {
      // **A failed read leaves the remote streaming, and the next command inherits it.** Measured on
      // 30 August 2026, section 223: every induced failure poisoned the following run, whose
      // `GET_VERSION` was answered with a flash data reply. So the failure is reported after the pipe
      // is clean, not before, and the caller gets a session it can use rather than one that fails
      // next for a reason that has nothing to do with what it asked.
      //
      // The drain cannot itself throw: it is cleanup, and replacing the real failure with whatever
      // went wrong while tidying up is the substitution this file already refuses in the rehearsal's
      // `finally`.
      await this.drainFlashRead();
      throw error;
    }
  }

  /**
   * Read whatever is still queued until the transfer's acknowledgement, or until it goes quiet.
   *
   * Bounded by the same idle poll count as a read, so a remote that has stopped talking costs the
   * same wait as any other silence rather than hanging.
   */
  /**
   * Read whatever a previous session left queued, before asking the remote anything.
   *
   * The drain on a failed read, below, cleans a pipe this session dirtied. It cannot clean one a
   * **previous** session left: on 3 September 2026 the remote re-enumerated in the middle of a flash
   * read, section 242, the handle that read died with it, and the next session's `GET_VERSION` was
   * answered with the rest of that read. So a session that has to be right, the writer's, drains
   * first. Reads only, bounded like the drain below, and quiet when there is nothing to take.
   */
  async drainLeftovers(): Promise<void> {
    await this.drainFlashRead();
  }

  private async drainFlashRead(): Promise<void> {
    let idle = 0;
    while (idle < this.idlePolls) {
      let report: Uint8Array | undefined;
      try {
        report = await this.transport.read(this.timeoutMs);
      } catch {
        return;
      }
      if (report === undefined) {
        idle += 1;
        continue;
      }
      idle = 0;
      try {
        const reply = decodeReply(report);
        if (reply.kind === 'ack' && reply.command === READ_FLASH) return;
      } catch {
        // A report this library cannot decode is still a report that is now out of the pipe, which
        // is the only thing this loop is for.
      }
    }
  }

  private async readFlashStream(address: number, count: number): Promise<Uint8Array> {
    await this.send(readFlashRequest(address, count));

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
      // **A chunk carrying more than was asked for is an error.** `Math.min` discarded the surplus
      // in silence, so a device or a transport sending more than the request encoded still satisfied
      // `filled === count` and the read reported clean. That is the same pipe hygiene failure this
      // method's own completion check exists for, in the other direction: the bytes nobody wanted
      // are evidence the request was encoded wrongly, and throwing them away hides it. Section 139.
      if (reply.data.length > count - filled) {
        throw new RemoteError(
          `flash chunk carries ${reply.data.length} bytes with ${count - filled} still wanted, `
            + 'so the request and the reply disagree about the length',
        );
      }
      out.set(reply.data, filled);
      filled += reply.data.length;
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
  /**
   * The unit's own 64 byte identity block, which is what says **which** remote this is.
   *
   * One `READ_FLASH` of internal page `0xFF` at `0xF400`, so no new protocol and no write. The
   * address was predicted before it was read and confirmed on three remotes across two
   * architectures, `docs/usb-protocol.md`, and the closure is that all three GUIDs `concordance -i`
   * prints for one exact unit appear in it in the same order.
   *
   * **What it is for**: two Harmony Ones enumerate identically, so `targetIsTheSpareRemote` was a
   * boolean a caller asserted. This is the reading that replaces it. `identity.ts` holds the
   * comparison and, importantly, the refusal of a block that cannot identify anything, since the
   * field named the serial is `0xEE` on every unit here.
   *
   * It returns the bytes and nothing else: no table of units, no name, no file. Where a caller keeps
   * the expected value is the caller's decision, the lab on the bench and the user's own data in
   * FreeHarmony.
   */
  async readUnitIdentity(): Promise<Uint8Array> {
    return this.readInternalMemory(IDENTITY_PAGE, IDENTITY_OFFSET, IDENTITY_BYTES);
  }

  async readInternalMemory(subSelector: 0xfe | 0xff, offset: number, count: number): Promise<Uint8Array> {
    if (refusableInternalCount(count)) {
      // A read of this region can restart the remote, and this refusal is what avoids it. Measured
      // on the spare Harmony One, then still unprogrammed, deliberately, with the restart watched at the remote:
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
    if (offset < 0 || offset > INTERNAL_OFFSET_MAX) {
      // The firmware bounds the 16-bit offset to 0xFFC0, which is 0x10000 minus a full report.
      // Refusing here reports the rule; sending it anyway would have the device silently clamp.
      throw new RemoteError(`offset 0x${offset.toString(16)} is outside the 0x0000..0xFFC0 window`);
    }
    // **And the count, which the bound above used to be justified by rather than joined to.** The
    // comment read "an offset plus one report cannot leave the window", and that held only while
    // this method was capped at one chunk, a cap that section 139 entry 17 found does not exist. So
    // `readInternalMemory(0xff, 0xffc0, 512)` walked off the end of the 64 KiB page with the
    // library's blessing, and what the device serves past it is unread: a plausible wrong answer
    // about which page was read. Section 139.
    if (count < 0 || offset + count > INTERNAL_PAGE_SIZE) {
      throw new RemoteError(
        `${count} bytes from offset 0x${offset.toString(16)} runs past the end of the `
          + `0x${INTERNAL_PAGE_SIZE.toString(16)} byte internal page`,
      );
    }
    return this.readFlash((subSelector << 16) | offset, count);
  }

  // Everything below is a write. It exists so that it is written once, reviewed, and refused by
  // the rails rather than improvised later under time pressure. `rails.ts` decides; these methods
  // only ask, and they ask before touching the transport.

  /**
   * Send one flash write: the announce, the data packets, and the done that is acknowledged.
   *
   * Section 175 derived every packet, `writes.ts` builds them, and `rails.ts` decides whether they
   * may be sent. This method's own contribution is small and worth stating, because all three of
   * these have already been the shape of a defect in the read path.
   *
   * **It waits for the acknowledgement and demands it names WRITE_FLASH.** A write that returns as
   * soon as the last packet is out leaves `0xF0 0x30` in the pipe, and the next command reads it
   * first and concludes its own transfer is over. `readFlashUnchecked`'s comment records that exact
   * failure costing a run of reads that looked like a device with a size limit.
   *
   * **It does not verify what was written**, deliberately. The caller reads the range back and
   * compares, because a method that verified itself would be verifying with the same assumptions it
   * wrote with, and because the compare belongs to the rehearsal that owns the erase too.
   *
   * **The firmware asks for no pacing, so the default is derived rather than hopeful**, section 175:
   * the command dispatcher returns whether work is pending as its value and its caller drains the
   * staging buffer in the same service call, on all three images, so a packet is programmed before the
   * dispatcher can be entered again and the done cannot overtake the last packet.
   *
   * **What is not derived is the silicon**, and the distinction is why `betweenPacketsMs` stays.
   * whether the USB peripheral can accept a second report before the firmware has serviced the first
   * depends on the endpoint's buffer descriptor, which nobody here has read; the usual arrangement
   * makes it refuse rather than overwrite. So zero is right on the evidence and a delay is the first
   * thing to reach for if a write ever does drop bytes, which should not need adding under pressure.
   */
  async writeFlash(
    p: WritePermission,
    address: number,
    data: Uint8Array,
    betweenPacketsMs = 0,
  ): Promise<void> {
    assertFlashWriteAllowed(p, address, data.length);
    const requests = writeFlashRequests(address, data);
    for (const [index, request] of requests.entries()) {
      await this.send(request);
      // Between data packets only. Pausing after the announce or before the done buys nothing, and
      // the done has to be followed by the wait below rather than by a sleep.
      if (betweenPacketsMs > 0 && index > 0 && index < requests.length - 2) {
        await new Promise((resolve) => setTimeout(resolve, betweenPacketsMs));
      }
    }
    let idle = 0;
    while (idle < this.idlePolls) {
      const report = await this.transport.read(this.timeoutMs);
      if (report === undefined) {
        idle += 1;
        continue;
      }
      const reply = decodeReply(report);
      if (reply.kind === 'ack' && reply.command === WRITE_FLASH) return;
      throw new RemoteError(
        `a flash write answered with a ${reply.kind} reply`
          + (reply.kind === 'ack' ? ` naming command 0x${reply.command.toString(16)}` : ''),
      );
    }
    throw new RemoteError(
      'a flash write sent every packet and was never acknowledged, so what reached the device is '
        + 'unknown: read the range back before doing anything else',
    );
  }

  async eraseFlash(p: WritePermission, address: number): Promise<void> {
    assertEraseAllowed(p, address);
    const reply = await this.exchange(eraseFlashRequest(address));
    if (reply.kind !== 'ack') throw new RemoteError('erase was not acknowledged');
    // Which command was acknowledged, not merely that something was. Section 139.
    if (reply.command !== ERASE_FLASH) {
      throw new RemoteError(
        `the remote acknowledged command 0x${reply.command.toString(16)}, not ERASE_FLASH`,
      );
    }
  }

  /**
   * Write one byte into the data memory of a running remote.
   *
   * **This said "volatile, and still gated" and the first half was an assumption**, section 139: the
   * request carries a sixteen bit data address and bank 15 from `0xF40` up is the special function
   * registers, `EECON1`, `EECON2`, `TABLAT` and `TBLPTR` among them, which are what a PIC18 self
   * programming sequence is made of. Whether the firmware bounds the address is unread, so
   * `assertRamWriteAllowed` bounds it here and the refusal says why. Below the SFR page the write is
   * volatile and a hang resets the device, section 100.
   */
  async writeRam(
    p: {
      readonly architecture?: number | undefined;
      readonly identityBlock: Uint8Array;
      readonly permittedUnit: Uint8Array;
    },
    dataAddress: number,
    value: number,
  ): Promise<void> {
    assertRamWriteAllowed(p, dataAddress);
    const reply = await this.exchange(writeMiscRequest(MISC_RAM, dataAddress, value));
    if (reply.kind !== 'ack') throw new RemoteError('the RAM write was not acknowledged');
    // The command byte, which `eraseFlash` and this method both omitted: an acknowledgement carries
    // one, and without checking it a reply to some other command satisfies the `kind` test. Cheap
    // where it matters most, since these are the two methods that change a device.
    if (reply.command !== WRITE_MISC) {
      throw new RemoteError(
        `the remote acknowledged command 0x${reply.command.toString(16)}, not WRITE_MISC`,
      );
    }
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
    p: Pick<WritePermission, 'architecture' | 'identityBlock' | 'permittedUnit'>,
  ): Promise<void> {
    assertSessionEndAllowed(p, ESCAPE_END_SESSION);
    await this.send(escapeRequest(ESCAPE_END_SESSION));
  }

  /**
   * Drop the remote's cached region descriptors: `0xA1 0x02`, step 2 of a config write.
   *
   * **Why a write needs it**, section 245: concordance's own comment is that it exists "so that
   * nothing will attempt to reference it while we're working", and arch 12 executes its
   * configuration in place out of the flash a write is about to erase. Ours did not send it, and two
   * writes on 3 September 2026 broke off part way through a block.
   *
   * **What it actually does was read before it was ever sent**, section 246: three five byte records
   * in data memory and a two byte entry each in a second table, no flash gate reached, nothing
   * persistent. So the name upstream gives it, invalidate flash, is misleading, and `MISC_INVALIDATE`
   * carries the correction.
   *
   * It **is** acknowledged, unlike the escape, and the acknowledgement's command byte is checked for
   * the reason `writeRam`'s comment gives: a reply to some other command satisfies a bare `kind`
   * test.
   */
  async invalidateCachedRegions(p: WritePermission): Promise<void> {
    assertInvalidateAllowed(p);
    const reply = await this.exchange(invalidateRequest());
    if (reply.kind !== 'ack') throw new RemoteError('the invalidate was not acknowledged');
    if (reply.command !== WRITE_MISC) {
      throw new RemoteError(
        `the remote acknowledged command 0x${reply.command.toString(16)}, not WRITE_MISC`,
      );
    }
  }

  /**
   * Restart the remote: the escape with sub-command `0x02`, the last step of a config write.
   *
   * `0x02` sets a flag whose single reader drives the top level mode to 3, and mode 3 waits and then
   * executes the PIC18 `RESET` instruction, section 97. concordance sends this and then waits for the
   * remote to reappear on the bus, which is the battery pull this bench has been doing by hand after
   * every write, section 245.
   *
   * **No reply is waited for and the handle is finished afterwards.** Nothing acknowledges a command
   * that ends in a reset, and the device leaves the bus, so a caller closes the handle and, if it
   * needs the remote again, enumerates afresh. concordance ignores the transport error its own write
   * of this report can return for the same reason.
   */
  async resetDevice(p: WritePermission): Promise<void> {
    assertResetAllowed(p);
    await this.send(escapeRequest(ESCAPE_RESET));
  }
}

export { GET_VERSION, READ_FLASH };
