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
  ERASE_FLASH,
  ESCAPE,
  ProtocolError,
  WRITE_FLASH,
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
 * keeps for itself is a latch and not a bound: a write below `0x020000` is skipped unless a write at
 * or above it has already happened in the session, section 175. Nothing here relies on that.
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
