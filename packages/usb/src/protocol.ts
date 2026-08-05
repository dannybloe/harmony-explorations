/**
 * The Harmony command protocol, encoding and decoding only.
 *
 * Everything here is derived from `docs/usb-protocol.md`, which is derived from the firmware
 * images. No I/O: this module turns commands into 64 byte reports and reports back into replies,
 * so all of it is testable without a remote attached, which matters because the remotes are
 * irreplaceable and the interesting failure modes are in the encoding.
 *
 * Two properties of the protocol shape this module more than anything else:
 *
 *   * **The first byte is a command in the high nibble and a payload length in the low nibble**,
 *     and the length mapping is not linear. Getting the nibble wrong does not produce an error,
 *     it produces a command the firmware reads with the wrong number of arguments.
 *   * **Responses are asynchronous.** Every handler in the firmware parses its arguments, sets a
 *     state variable and returns; the work happens later when the main loop sees that state. So
 *     writing a command does not mean a reply is waiting, and a host that assumes otherwise will
 *     read an empty report and conclude the device is broken.
 */

export class ProtocolError extends Error {}

/** The seven commands every image dispatches. `docs/usb-protocol.md` section 3. */
export const GET_VERSION = 0x10;
export const WRITE_FLASH = 0x30;
export const WRITE_FLASH_DATA = 0x40;
export const READ_FLASH = 0x50;
export const START_IRCAP = 0x70;
export const STOP_IRCAP = 0x80;
export const WRITE_MISC = 0xa0;
export const READ_MISC = 0xb0;
export const ERASE_FLASH = 0xd0;
/** `0xE0` is an escape: the payload byte selects the kind of reset. `0xE1` is it with length 1. */
export const ESCAPE = 0xe0;

export const COMMAND_NAMES: Readonly<Record<number, string>> = {
  [GET_VERSION]: 'GET_VERSION',
  [WRITE_FLASH]: 'WRITE_FLASH',
  [WRITE_FLASH_DATA]: 'WRITE_FLASH_DATA',
  [READ_FLASH]: 'READ_FLASH',
  [START_IRCAP]: 'START_IRCAP',
  [STOP_IRCAP]: 'STOP_IRCAP',
  [WRITE_MISC]: 'WRITE_MISC',
  [READ_MISC]: 'READ_MISC',
  [ERASE_FLASH]: 'ERASE_FLASH',
  [ESCAPE]: 'ESCAPE',
};

/** The state each command sets, which is what the main loop later dispatches on. */
export const COMMAND_STATES: Readonly<Record<number, number>> = {
  [GET_VERSION]: 1,
  [WRITE_FLASH]: 2,
  [READ_FLASH]: 4,
  [START_IRCAP]: 5,
  [ERASE_FLASH]: 8,
  [WRITE_MISC]: 9,
  [READ_MISC]: 10,
};

/** Both directions use 64 byte reports, so the largest payload is 63 bytes. */
export const REPORT_SIZE = 64;
export const MAX_PAYLOAD = REPORT_SIZE - 1;

/**
 * The low nibble to payload length mapping the firmware implements.
 *
 * Nibbles 0 to 7 pass through; `8`, `9` and `A` mean 15, 31 and 63. Those are 2^4-1, 2^5-1 and
 * 2^6-1, and 63 plus the command byte is exactly the 64 byte report the descriptors declare,
 * which is the closure that says this reading is right: a misreading would not land on the
 * report size. Nibbles `B` to `F` pass through as well, so 11 to 15, and are almost certainly
 * unused since 8 to 10 already cover those lengths and more.
 */
export function payloadLengthForNibble(nibble: number): number {
  if (nibble < 0 || nibble > 0xf) throw new ProtocolError(`not a nibble: ${nibble}`);
  if (nibble === 0x8) return 15;
  if (nibble === 0x9) return 31;
  if (nibble === 0xa) return 63;
  return nibble;
}

/**
 * The nibble to use for a payload of `length` bytes: the smallest one that encodes it exactly.
 *
 * Exactly, not "at least": the firmware reads its arguments from fixed offsets and takes the
 * length as the number of bytes present, so padding a five byte request out to a nibble that
 * says 15 is a different request, not a longer one.
 */
export function nibbleForPayloadLength(length: number): number {
  for (let nibble = 0; nibble <= 0xa; nibble += 1) {
    if (payloadLengthForNibble(nibble) === length) return nibble;
  }
  throw new ProtocolError(
    `no length nibble encodes ${length} payload bytes (0 to 7, 15, 31 and 63 are encodable)`,
  );
}

/**
 * One request, as the 64 byte report to write.
 *
 * Reports are always the full 64 bytes, zero padded. The firmware reads only as many argument
 * bytes as the command's parser asks for, so the padding is inert, but a short buffer is not:
 * `hid_write` sends what it is given.
 */
export function encodeRequest(command: number, payload: readonly number[] = []): Uint8Array {
  if ((command & 0x0f) !== 0) {
    throw new ProtocolError(
      `command 0x${command.toString(16)} has bits in its low nibble, which is the length field`,
    );
  }
  if (payload.length > MAX_PAYLOAD) {
    throw new ProtocolError(`payload of ${payload.length} bytes exceeds ${MAX_PAYLOAD}`);
  }
  for (const byte of payload) {
    if (!Number.isInteger(byte) || byte < 0 || byte > 0xff) {
      throw new ProtocolError(`payload byte ${byte} is not a byte`);
    }
  }
  const report = new Uint8Array(REPORT_SIZE);
  report[0] = command | nibbleForPayloadLength(payload.length);
  report.set(payload, 1);
  return report;
}

/** A 24-bit address, most significant byte first, which is the order every command uses. */
function address24(address: number): number[] {
  if (!Number.isInteger(address) || address < 0 || address > 0xffffff) {
    throw new ProtocolError(`address 0x${address.toString(16)} does not fit in 24 bits`);
  }
  return [(address >>> 16) & 0xff, (address >>> 8) & 0xff, address & 0xff];
}

function count16(count: number): number[] {
  if (!Number.isInteger(count) || count < 0 || count > 0xffff) {
    throw new ProtocolError(`count ${count} does not fit in 16 bits`);
  }
  return [(count >>> 8) & 0xff, count & 0xff];
}

/** `GET_VERSION`: no arguments established, parsed inline in the USB callback. */
export function getVersionRequest(): Uint8Array {
  return encodeRequest(GET_VERSION);
}

/**
 * `READ_FLASH`: a 24-bit address and a 16-bit count, both most significant byte first.
 *
 * The top address byte is also the region selector, which `validateRegionByte` explains.
 */
export function readFlashRequest(address: number, count: number): Uint8Array {
  return encodeRequest(READ_FLASH, [...address24(address), ...count16(count)]);
}

/**
 * `WRITE_FLASH`: **the same five bytes as `READ_FLASH`**, into the same firmware variables.
 *
 * Encoding it is not permission to send it. The rails in `rails.ts` decide that, and they are
 * where the region restriction lives, because the firmware's own validator accepts any config
 * flash address and both commands call it.
 */
export function writeFlashRequest(address: number, count: number): Uint8Array {
  return encodeRequest(WRITE_FLASH, [...address24(address), ...count16(count)]);
}

/**
 * `ERASE_FLASH`: a 24-bit address and **no count**.
 *
 * So the granularity is whatever the hardware sector size is, not something the host chooses.
 * An erase cannot be scoped by the caller, only refused, which is why `rails.ts` refuses.
 */
export function eraseFlashRequest(address: number): Uint8Array {
  return encodeRequest(ERASE_FLASH, address24(address));
}

/** `READ_MISC`: a selector and a 16-bit parameter, high byte first. */
export function readMiscRequest(selector: number, parameter: number): Uint8Array {
  if (!Number.isInteger(selector) || selector < 0 || selector > 0xff) {
    throw new ProtocolError(`selector ${selector} is not a byte`);
  }
  return encodeRequest(READ_MISC, [selector, ...count16(parameter)]);
}

/** `WRITE_MISC`: a selector, a 16-bit address and a 16-bit value. */
export function writeMiscRequest(selector: number, address: number, value: number): Uint8Array {
  return encodeRequest(WRITE_MISC, [selector, ...count16(address), ...count16(value)]);
}

/**
 * The `READ_MISC` and `WRITE_MISC` selectors the arch 14 firmware actually services.
 *
 * **`RAM` is `0x07` here, not `0x06`.** libconcord's header names `MISC_RAM` as `0x06`, and
 * `0x06` on this architecture is a different accessor entirely, so taking the upstream number on
 * faith would have read the wrong thing and still returned a plausible byte. `0x03`, which
 * upstream calls `MISC_QUEUE_ACTION`, is not in the chain at all, and `0x09`,
 * `MISC_QUEUE_EVENT`, is accepted and does nothing. So there is no event injection.
 */
export const MISC_RAM = 0x07;
export const READ_MISC_SELECTORS: readonly number[] = [0x01, 0x06, 0x07, 0x0c];
export const WRITE_MISC_SELECTORS: readonly number[] = [
  0x01, 0x02, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
];

/** Read one byte of the data memory of a running remote. Volatile, and read only. */
export function readRamRequest(dataAddress: number): Uint8Array {
  return readMiscRequest(MISC_RAM, dataAddress);
}

/**
 * What the firmware's validator at `0x13DFE` makes of the top address byte of a flash command.
 *
 * Not a host side politeness: this is the device's own rule, so a host that gets it wrong is
 * refused rather than obeyed. Below `0x20` is an ordinary config flash address. `0xFE` and `0xFF`
 * select the MCU's own program memory, read by table read, which is the route to the device id
 * words on a PIC18 J-series part. Everything else is rejected.
 */
export type Region = 'config-flash' | 'internal-program-memory';

export function validateRegionByte(topByte: number): Region {
  if (topByte < 0x20) return 'config-flash';
  if (topByte === 0xfe || topByte === 0xff) return 'internal-program-memory';
  throw new ProtocolError(
    `the firmware's validator rejects 0x${topByte.toString(16)} as a top address byte`,
  );
}

export function regionOf(address: number): Region {
  return validateRegionByte((address >>> 16) & 0xff);
}

/**
 * `0xF0 cmd` is a bare acknowledgement, naming the command it acknowledges.
 *
 * **Measured, and it corrects an assumption made here first.** The length nibble is `0`, and the
 * command byte follows anyway. So `0xF0` arrives as `f0 50` at the end of a `READ_FLASH`, not as
 * `f1 50`. This module used to compute the acknowledged command's position from the nibble, which
 * meant the real reply decoded as "acknowledgement with no command byte"; the test that passed was
 * asserting the assumption rather than the device. Responses reuse the request encoding for their
 * code, and for data chunks they use it for the length too, but an acknowledgement does not.
 */
export const ACK = 0xf0;

/**
 * The code a `READ_FLASH` data chunk carries, which was unestablished until it was measured.
 *
 * The reply is a series of `0x6A` reports: nibble `A`, so 63 payload bytes, of which **the first is
 * a sequence byte and 62 are data**. That resolves the firmware's 63 by arithmetic rather than by
 * proximity: the chunking code compares the remaining count against 63, and 63 is the payload the
 * largest length nibble can describe, and one of those bytes is the sequence. The final short chunk
 * carries a literal nibble, then `0xF0 0x50` ends the command.
 */
export const FLASH_DATA = 0x60;

/**
 * A chunk's sequence byte advances by `0x11` per chunk: `0x01`, `0x12`, `0x23`, `0x34` and so on.
 *
 * So the low nibble is this chunk's number and the high nibble is the previous one's, both wrapping
 * at 16. Checking it is what turns a dropped report from silent corruption into an error, and a
 * dropped report is the failure mode a chunked transfer over HID actually has.
 */
export const FLASH_SEQUENCE_STEP = 0x11;

export function nextFlashSequence(previous: number): number {
  return (previous + FLASH_SEQUENCE_STEP) & 0xff;
}
/** `READ_MISC` replies with this: two payload bytes, the selector echoed and one data byte. */
export const MISC_REPLY = 0xc2;
/** `GET_VERSION` replies with this, then twelve bytes. */
export const VERSION_REPLY = 0x28;
/** The twelve fields of a version block. Ten of them are not named yet. */
export const VERSION_FIELD_COUNT = 12;

export type Reply =
  | { kind: 'ack'; command: number; commandName: string | undefined }
  | { kind: 'misc'; selector: number; value: number }
  | { kind: 'version'; fields: Uint8Array }
  | { kind: 'flash-data'; sequence: number; data: Uint8Array }
  | { kind: 'data'; code: number; payload: Uint8Array };

/**
 * Decode one 64 byte report from the remote.
 *
 * Responses reuse the request encoding for their code, in the high nibble, which is what lets this
 * be one function rather than a table of per command parsers. **They do not all reuse it for the
 * length**, and that is measured rather than assumed now: a data chunk's nibble is its payload
 * length, an acknowledgement's nibble is `0` with a command byte following it anyway, and
 * GET_VERSION's `0x28` would mean 15 under the request mapping while the firmware copies 12. So the
 * nibble is trusted for data and ignored for the other two.
 */
export function decodeReply(report: Uint8Array): Reply {
  const first = report[0];
  if (first === undefined) throw new ProtocolError('empty report');
  const code = first & 0xf0;
  const payload = report.subarray(1, 1 + payloadLengthForNibble(first & 0x0f));

  if (code === ACK) {
    // Read past the declared payload on purpose: the nibble says zero and the byte is there.
    const command = report[1];
    if (command === undefined) throw new ProtocolError('acknowledgement with no command byte');
    return { kind: 'ack', command, commandName: COMMAND_NAMES[command] };
  }
  if (code === FLASH_DATA) {
    const sequence = payload[0];
    if (sequence === undefined) throw new ProtocolError('flash data chunk with no sequence byte');
    return { kind: 'flash-data', sequence, data: payload.subarray(1) };
  }
  if (first === MISC_REPLY) {
    const selector = payload[0];
    const value = payload[1];
    if (selector === undefined || value === undefined) {
      throw new ProtocolError('READ_MISC reply is short');
    }
    return { kind: 'misc', selector, value };
  }
  if (first === VERSION_REPLY) {
    if (report.length < 1 + VERSION_FIELD_COUNT) {
      throw new ProtocolError('version reply is short');
    }
    return { kind: 'version', fields: report.subarray(1, 1 + VERSION_FIELD_COUNT) };
  }
  return { kind: 'data', code, payload };
}
