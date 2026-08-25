/**
 * The request encoders for the four commands that change a remote, kept out of the package's barrel.
 *
 * **`index.ts` deliberately does not re-export this file, and that is a rail rather than tidiness.**
 * `rails.ts` opens by saying that a rail enforced here is enforced for every caller. It was enforced
 * for every caller **of `HarmonyRemote`**: the barrel star-exported these encoders and `openHarmony`
 * hands back a `Transport` whose `write` is public, so two lines reached `ERASE_FLASH` with no
 * permission object, no `WRITES_ENABLED` and no architecture check. An erase takes an address and no
 * count and destroys 64 KiB of a Harmony One (arch 12).
 *
 * No gate can live in the encoders themselves, because `rails.ts` imports from `protocol.ts` and not
 * the other way round, and because a pure byte builder has to stay testable with the flag off. So the
 * boundary is a module: `remote.ts` and the tests import this file by path, and a consumer of
 * `@harmony/usb` gets no way to build a write request at all.
 *
 * It is a module rather than an explicit export list in the barrel for one reason: a list of fifty
 * names drifts, and a new write encoder added to `protocol.ts` would be exported by default. Here the
 * default is the safe one, and `rails.test.ts` asserts the barrel stays clean.
 *
 * None of this stops somebody assembling five bytes by hand. It stops the accident, and it makes the
 * deliberate act look deliberate, which is the same reasoning as the named door in `rails.ts`.
 */
import {
  ACK,
  ERASE_FLASH,
  ESCAPE,
  MAX_PAYLOAD,
  ProtocolError,
  WRITE_FLASH,
  WRITE_FLASH_DATA,
  WRITE_MISC,
  address24,
  count16,
  encodeRequest,
} from './protocol.ts';

/**
 * `WRITE_FLASH`: **the same five bytes as `READ_FLASH`**, into the same firmware variables.
 *
 * Encoding it is not permission to send it. The rails in `rails.ts` decide that, and they are
 * where the region restriction lives, because the firmware's own validator accepts **every** top
 * address byte below `0x40` on arch 12 (Harmony One), which is the whole 4 MiB part including the
 * running firmware at `0x020000` and the stored copy at `0x3D0000`, section 88. Both commands call
 * it, which is why one classification serves reads and writes alike. The one guard the firmware
 * keeps for itself is an **interlock** rather than a bound: a write below `0x020000` needs bit 5 of
 * `0x1A4` clear, that bit is set at boot and on every main loop pass, and the only thing that clears
 * it is an ERASE_FLASH below `0x020000`. So the low region opens just after a low erase and is shut
 * otherwise, section 175, which records two earlier readings of this that were both wrong. Nothing
 * here relies on it, and the refusal below is what actually keeps the region safe.
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

/** `WRITE_MISC`: a selector, a 16-bit address and a 16-bit value. */
export function writeMiscRequest(selector: number, address: number, value: number): Uint8Array {
  return encodeRequest(WRITE_MISC, [selector, ...count16(address), ...count16(value)]);
}

/** `0xE0` with one payload byte, which is the byte the protocol is known by as `0xE1`. */
export function escapeRequest(subCommand: number): Uint8Array {
  if (!Number.isInteger(subCommand) || subCommand < 0 || subCommand > 0xff) {
    throw new ProtocolError(`escape sub-command ${subCommand} is not a byte`);
  }
  return encodeRequest(ESCAPE, [subCommand]);
}

/**
 * `0x40`: one packet of data for a write already announced.
 *
 * Section 175. The payload is data and nothing else, no offset and no sequence byte, which is why
 * the announced address is the only thing that says where these bytes go and why a lost packet
 * cannot be detected from the wire: the remote advances its own pointer by whatever it received.
 */
export function writeFlashDataRequest(chunk: Uint8Array): Uint8Array {
  return encodeRequest(WRITE_FLASH_DATA, [...chunk]);
}

/**
 * `0xF0`: done with something, naming what. `0xF0 0x30` ends a flash write.
 *
 * The remote answers this one, and only this one, with `0xF0 0x30` of its own from state 3.
 */
export function doneRequest(subject: number): Uint8Array {
  if (!Number.isInteger(subject) || subject < 0 || subject > 0xff) {
    throw new ProtocolError(`done subject ${subject} is not a byte`);
  }
  return encodeRequest(ACK, [subject]);
}

/**
 * The lengths to split `total` data bytes into, largest first.
 *
 * **A chunk's length has to be exactly encodable, which bounds this more than the report size
 * does.** The length nibble encodes 0 to 7, 15, 31 and 63 and nothing else, and
 * `nibbleForPayloadLength` refuses the rest rather than rounding, because the firmware takes the
 * nibble as the number of bytes present. So a transfer of 71 bytes cannot be 63 and 8: it is 63, 7
 * and 1.
 *
 * Greedy from the largest works and cannot strand a remainder, since every length from 1 to 7 is
 * encodable, so whatever is left after the big steps is one packet. That is the whole argument for
 * greedy being safe here, and it is why the test asserts every total up to a few thousand rather
 * than a handful of cases.
 */
export function writeChunkLengths(total: number): number[] {
  if (!Number.isInteger(total) || total <= 0) {
    throw new ProtocolError(`a write of ${total} bytes is not a write`);
  }
  const out: number[] = [];
  let left = total;
  for (const step of [MAX_PAYLOAD, 31, 15]) {
    while (left >= step) {
      out.push(step);
      left -= step;
    }
  }
  if (left > 0) {
    while (left > 7) {
      out.push(7);
      left -= 7;
    }
    out.push(left);
  }
  return out;
}

/**
 * Every request of one flash write, in order: the announce, the data packets, the done.
 *
 * Pure, and separate from sending for two reasons. It is the derived protocol in executable form,
 * so it is worth testing byte for byte with no device present, which is what
 * `packages/usb/test/writes.test.ts` does. And a caller that wants to know what a write **would**
 * send, which is what the rehearsal script prints before it is allowed to send anything, must be
 * able to ask without a permission object.
 *
 * Building the packets is not permission to send them. `HarmonyRemote.writeFlash` decides that,
 * through `rails.ts`.
 */
export function writeFlashRequests(address: number, data: Uint8Array): Uint8Array[] {
  const out = [writeFlashRequest(address, data.length)];
  let offset = 0;
  for (const length of writeChunkLengths(data.length)) {
    out.push(writeFlashDataRequest(data.subarray(offset, offset + length)));
    offset += length;
  }
  if (offset !== data.length) {
    throw new ProtocolError(`chunking covered ${offset} of ${data.length} bytes`);
  }
  out.push(doneRequest(WRITE_FLASH));
  return out;
}
