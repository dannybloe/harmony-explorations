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
export function address24(address: number): number[] {
  if (!Number.isInteger(address) || address < 0 || address > 0xffffff) {
    throw new ProtocolError(`address 0x${address.toString(16)} does not fit in 24 bits`);
  }
  return [(address >>> 16) & 0xff, (address >>> 8) & 0xff, address & 0xff];
}

export function count16(count: number): number[] {
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



/** `READ_MISC`: a selector and a 16-bit parameter, high byte first. */
export function readMiscRequest(selector: number, parameter: number): Uint8Array {
  if (!Number.isInteger(selector) || selector < 0 || selector > 0xff) {
    throw new ProtocolError(`selector ${selector} is not a byte`);
  }
  return encodeRequest(READ_MISC, [selector, ...count16(parameter)]);
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
/**
 * The escape's sub-commands, `docs/findings.md` section 97, read from both bench architectures.
 *
 * `0x01` clears the command state variable and invalidates whatever address a half finished
 * command had parsed. It is **not** a reset, and it sends no reply at all: the arch 12 path returns
 * `0` directly rather than falling through the shared exit that appends an acknowledgement. So a
 * caller must not wait for one, which is a thing worth stating in code because every other command
 * here does wait.
 *
 * `0x02` and `0x03` set a flag whose single reader drives the top level mode to 3, and mode 3 waits
 * and then executes the PIC18 `RESET` instruction. This library does not implement them, and
 * `assertSessionEndAllowed` refuses them by number rather than leaving them merely unused.
 */
export const ESCAPE_END_SESSION = 0x01;
export const ESCAPE_RESET = 0x02;
export const ESCAPE_RESET_ALT = 0x03;

/** The sub-commands each architecture's escape dispatches. Arch 9 has not been read. */
export const ESCAPE_SUB_COMMANDS: Readonly<Record<number, readonly number[]>> = {
  12: [ESCAPE_END_SESSION, ESCAPE_RESET, ESCAPE_RESET_ALT],
  14: [ESCAPE_END_SESSION, ESCAPE_RESET, ESCAPE_RESET_ALT, 0x05],
};


export function readRamRequest(dataAddress: number): Uint8Array {
  return readMiscRequest(MISC_RAM, dataAddress);
}

/**
 * What a firmware's validator makes of the top address byte of a flash command.
 *
 * Not a host side politeness: this is the device's own rule, so a host that gets it wrong is
 * refused rather than obeyed. `0xFE` and `0xFF` select the MCU's own program memory by table read,
 * an ordinary config flash address is below a per architecture bound, and everything else is
 * rejected.
 *
 * **The bound is that architecture's flash size, and it is not the same on the two bench
 * remotes.** This module used to apply arch 14's `0x20` to arch 12 as well, on the strength of
 * having read one validator and assumed the other matched. Arch 12's is at `0x2637A` in the One's
 * image and its bound is `0x40`, so a One accepts addresses up to `0x400000` and a 600 stops at
 * `0x200000`. Each bound is exactly the capacity of that model's flash part, which is what makes
 * the pair a measurement of the flash size rather than only of the protocol.
 * `docs/findings.md` section 88.
 *
 * The mistake never bit because a Harmony One config is 1.6 MB and ends below `0x200000`, so
 * nothing this project has ever read needed the range it was refusing.
 *
 * **The rule is per architecture, which cost a session's first config read.** A Harmony 525 is
 * silent at `0x010000`, `0x020000` and `0x030000` and answers at `0x820000`, so external flash
 * sits a whole megabyte up and the arch 12 rule refuses every address that works. Measured on the
 * bench on 8 August 2026; `docs/findings.md` section 76. The device says no by saying nothing,
 * which is why a wrong base looks like a broken cable rather than a rejected address.
 */
export type Region =
  | 'config-flash'
  | 'internal-program-memory'
  // The three arch 9 regions below the flash window. All read from its own firmware, section 119,
  // and none of them is flash: the address space the protocol calls "flash" is a set of tagged
  // windows onto different memories, and only one of them is the serial chip.
  | 'eeprom'
  | 'data-memory'
  | 'arch9-tag-30';

/** The architecture whose rule applies when a caller does not say. The two bench targets share it. */
export const DEFAULT_REGION_ARCHITECTURE = 12;

/**
 * The first top address byte each firmware's validator rejects, per architecture.
 *
 * Read out of the validators themselves: `0x2637A` on the One and `0x13DFE` on the 700, both of
 * which build the bound as a literal and branch on the carry. An architecture that is not listed
 * has no reading and is refused rather than given a neighbour's bound, which is the mistake this
 * table exists to prevent.
 */
export const FLASH_TOP_BYTE_BOUND: Readonly<Record<number, number>> = {
  12: 0x40, // 4 MiB, an Atmel AT49BV322A
  14: 0x20, // 2 MiB, an EON F16
};
/**
 * Arch 9 addresses its serial flash from here, one megabyte up, and it is the one architecture
 * whose rule is a window rather than a ceiling.
 *
 * Measured on a live 525 by trying addresses until one answered, section 76, and **confirmed from
 * its own firmware since**: the validator refuses below `0x80` and at or above `0x88`, which is
 * eight 64 KiB blocks and exactly the 512 KiB the part holds. Section 88.
 */
/**
 * The architecture whose `READ_MISC` executor has a body for selector `0x01` and for nothing else.
 *
 * Sections 90 and 137. Every other selector emits two bytes the firmware has just cleared, so a RAM
 * read there returns a zero indistinguishable from a real one. Named rather than written inline
 * because it is a property of the firmware and the refusal that uses it should say which.
 */
export const ARCH_WITHOUT_A_RAM_READ = 9;
export const ARCH9_FLASH_TOP_MIN = 0x80;
export const ARCH9_FLASH_TOP_MAX = 0x87;

/**
 * The four windows arch 9's validator accepts before it reaches the flash range test, with the
 * offset bound each one carries. Read out of the validator's own `XORLW` chain, section 119.
 *
 * **This table is why section 88's reading was incomplete rather than wrong.** That section read
 * from `0x02E30`, which is the *default arm*: four cases are tested above it at `0x02E14`, and the
 * bound test only applies to a top byte that matched none of them. So "arch 9's flash is 0x80 to
 * 0x87" describes what a top byte outside these four gets, and this library refused three regions
 * the firmware serves.
 *
 * Each bound is the literal the validator subtracts against, and each is exactly a documented size
 * of the PIC18F4550, which is the independent closure: 256 bytes of EEPROM, 2048 of RAM, 32 KiB of
 * program flash. The `0x30` window is 8 bytes and its read handler branches straight to the common
 * exit without fetching anything, so it is named for its tag and not for a memory.
 */
export const ARCH9_WINDOWS: Readonly<Record<number, { region: Region; bound: number }>> = {
  0x00: { region: 'internal-program-memory', bound: 0x8000 },
  0x20: { region: 'eeprom', bound: 0x0100 },
  0x30: { region: 'arch9-tag-30', bound: 0x0008 },
  0x40: { region: 'data-memory', bound: 0x0800 },
};

export function validateRegionByte(
  topByte: number,
  architecture: number = DEFAULT_REGION_ARCHITECTURE,
  offset?: number,
): Region {
  if (architecture === 9) {
    // Internal program memory is at plain low addresses on this part, a PIC18LF4550 with 32 KiB
    // of it, so the top byte is `0x00` and there is no `0xFE` window. It is still reported as
    // internal, which is what keeps `readInternalMemory`'s one chunk cap over it: arch 12 restarts
    // when such a read ends in a one byte chunk and nothing establishes that arch 9 does not.
    const window = ARCH9_WINDOWS[topByte];
    if (window) {
      // The bound is the firmware's, so enforcing it here only ever agrees with the device. Checked
      // when the caller passes an offset, which `regionOf` always does: a top byte on its own is
      // still answerable, which is what keeps this callable from a test.
      if (offset !== undefined && offset >= window.bound) {
        throw new ProtocolError(
          `arch 9 window 0x${topByte.toString(16)} ends at 0x${window.bound.toString(16)}, ` +
            `and 0x${offset.toString(16)} is past it`,
        );
      }
      return window.region;
    }
    if (topByte >= ARCH9_FLASH_TOP_MIN && topByte <= ARCH9_FLASH_TOP_MAX) return 'config-flash';
    throw new ProtocolError(
      `arch 9 rejects 0x${topByte.toString(16)} as a top address byte; its flash is at 0x80 to ` +
        `0x87 and its other windows are 0x00, 0x20, 0x30 and 0x40`,
    );
  }
  // The internal window is tested first and by masking bit 0 off, which is why both 0xFE and 0xFF
  // select it: the One's validator does `BCF` then compares against 0xFE, so the two bytes are one
  // case rather than two.
  if (topByte === 0xfe || topByte === 0xff) return 'internal-program-memory';
  const bound = FLASH_TOP_BYTE_BOUND[architecture];
  if (bound === undefined) {
    throw new ProtocolError(
      `no flash address bound recorded for architecture ${architecture}: refusing to guess one`,
    );
  }
  if (topByte < bound) return 'config-flash';
  throw new ProtocolError(
    `architecture ${architecture} rejects 0x${topByte.toString(16)} as a top address byte; ` +
      `its flash ends below 0x${(bound << 16).toString(16)}`,
  );
}

export function regionOf(address: number, architecture?: number): Region {
  return validateRegionByte((address >>> 16) & 0xff, architecture, address & 0xffff);
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

/** Data bytes in a full chunk: 63 payload bytes less the sequence byte. Measured. */
export const FLASH_CHUNK_DATA = 62;
/** `READ_MISC` replies with this: two payload bytes, the selector echoed and one data byte. */
export const MISC_REPLY = 0xc2;
/** `GET_VERSION` replies with this high nibble, whatever the generation. */
export const VERSION_REPLY_CODE = 0x20;
/** What an arch 12 or arch 14 remote answers: this byte, then twelve fields. */
export const VERSION_REPLY = 0x28;
/**
 * The twelve fields of an arch 12 or arch 14 version block. Ten of them are not named yet.
 *
 * **Twelve is not universal and the nibble is what says so.** A Harmony 525 answers `0x27` and
 * seven fields, measured on the bench on 8 August 2026. On the two MyHarmony era remotes the byte
 * is `0x28` while the firmware copies twelve, so the nibble is a floor there rather than a count,
 * and concordance reads it the same way: it accepts 5, 7 or 8 and branches on which.
 * `docs/findings.md` section 76.
 */
export const VERSION_FIELD_COUNT = 12;
/** The nibble the MyHarmony era answers, where the block is longer than the nibble states. */
export const VERSION_NIBBLE_LONG = 8;
/**
 * The shortest block a caller may treat as an identity.
 *
 * Seven, because that is what a Harmony 525 answers and every field of it is identified. Five is
 * what concordance also accepts, and a block that short carries no architecture and no skin, so it
 * would be an identity with the two fields worth having missing.
 */
export const VERSION_FIELD_COUNT_MIN = 7;

/**
 * Field 4 carries the architecture in its high nibble and the software type in its low one.
 *
 * `docs/findings.md` sections 87 and 116. The software type is Logitech's own word and their own
 * values: 0 application, 1 test mode, 3 boot mode, 4 safe mode.
 */
export const VERSION_FIELD_ARCH_AND_TYPE = 4;
/** Software type 4, which a remote in safe mode reports. Measured on a 525, section 118. */
export const SOFTWARE_TYPE_SAFE_MODE = 4;

/**
 * The architecture a remote states in its own version block, or undefined if the block is too short.
 *
 * **This exists because the tools were reading the version block, printing the architecture, and
 * then throwing it away.** `read-window.ts` defaulted the region validator to arch 12 while holding
 * a reply that said 9, so a legitimate read of a 525's flash was refused with a message naming the
 * wrong architecture, and the only way through was to repeat by hand what the remote had just said.
 * Found on a Harmony 525 in safe mode, section 118. The refusal was in the safe direction, which is
 * why nothing caught it sooner.
 */
export function architectureFromVersion(fields: Uint8Array): number | undefined {
  const byte = fields[VERSION_FIELD_ARCH_AND_TYPE];
  return byte === undefined ? undefined : byte >> 4;
}

/**
 * The software type from the same field: 0 in normal operation, 4 in safe mode.
 *
 * Worth having separately from the architecture because a caller that reads flash needs the first
 * and a caller reporting on a remote's state needs the second, and one of them used to be a
 * hand written nibble shift at the call site.
 */
export function softwareTypeFromVersion(fields: Uint8Array): number | undefined {
  const byte = fields[VERSION_FIELD_ARCH_AND_TYPE];
  return byte === undefined ? undefined : byte & 0x0f;
}

export type Reply =
  | { kind: 'ack'; command: number; commandName: string | undefined }
  | {
      kind: 'misc';
      selector: number;
      /**
       * The byte directly after the selector, which is the value on arch 12 and arch 14.
       *
       * **It is the wrong byte on arch 9**, section 90: that firmware emits its result as two bytes,
       * high first, so this is the high half of a sixteen bit word. Read `word` or `low` there.
       */
      value: number;
      /** The two bytes after the selector, whatever they mean on the architecture that sent them. */
      bytes: Uint8Array;
      /** Those two bytes read big endian, which is arch 9's own order. */
      word: number;
    }
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
    // Read one byte past the declared payload, the way the acknowledgement above does. The header
    // nibble claims two bytes on every architecture, and arch 9 sends **three**: the selector it
    // echoes and then a sixteen bit result, high byte first. libconcord has carried a comment about
    // exactly this since 2007; the firmware reading is section 90. A remote that sent only two
    // leaves this byte at whatever the report was zero filled with, which is why `value` stays the
    // arch 12 and arch 14 answer and nothing here guesses between them.
    const low = report[3] ?? 0;
    return {
      kind: 'misc',
      selector,
      value,
      bytes: Uint8Array.of(value, low),
      word: (value << 8) | low,
    };
  }
  if (code === VERSION_REPLY_CODE) {
    // The nibble is the field count, except where it is a floor. `0x28` means twelve, which the
    // arch 12 and arch 14 firmware settles by copying twelve bytes; anything else means itself,
    // which is how a Harmony 525's `0x27` yields seven. Matching the whole byte instead is what
    // made a 525's perfectly good answer decode as an anonymous data reply.
    const stated = first & 0x0f;
    const count = stated >= VERSION_NIBBLE_LONG ? VERSION_FIELD_COUNT : stated;
    if (report.length < 1 + count) throw new ProtocolError('version reply is short');
    return { kind: 'version', fields: report.subarray(1, 1 + count) };
  }
  return { kind: 'data', code, payload };
}
