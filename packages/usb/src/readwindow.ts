/**
 * Asking for one window of flash again when its transfer failed, bounded and counted. **Read only.**
 *
 * One copy of the retry, for every reader that walks the flash in windows: `readConfig` in
 * `@harmony/corpus`, which had it alone, and the two region readers, `packages/corpus/bin/read-region.ts`
 * and `packages/usb/bin/read-region.ts`, which had none and stopped on the first lost chunk without filing
 * anything. Both bench Harmony 885s met that on long reads, `docs/test-notes/harmony-885.md`, while
 * `readConfig` on the same cable finished. `todo-compile-885.md` 1.10 moved the loop here so the three
 * share it: a derivation lives once, and two copies of a retry diverge the same way two copies of an
 * opcode table do, one of them gaining a bound or a report the other never hears about.
 *
 * **Why here and not in `@harmony/corpus`**: corpus depends on this package, so the region reader in
 * `packages/usb/bin` cannot import from corpus, and the shared copy has to sit on this side of the line.
 *
 * **Why a function of its own and not part of `readFlash`**, which is a decision carried over from
 * `readConfig` rather than made here. The library reports what happened; deciding that asking again is
 * safe needs to know the request has no side effect, and that is the caller's knowledge. `readFlash`
 * stays strict, so a caller that sends something whose repetition matters, or that wants to see every
 * failure, gets exactly one attempt; a caller that walks the flash in windows opts in by calling this.
 *
 * **This module imports nothing**, deliberately, like `keys.ts` and `models.ts`. `@harmony/corpus/read`
 * is consumed by FreeHarmony as the read alone, and pulling this package's barrel in behind it would
 * bring the transport with it for the sake of one loop. So it is reachable as `@harmony/usb/readwindow`
 * as well as through the barrel.
 */

/**
 * How many extra goes one window gets before the read fails, section 223.
 *
 * Two rather than one, because the failure it recovers from is a host side queue overflowing while
 * something else held the process up, and whatever held it up may still be happening on the next
 * attempt. Not more, because a link dropping three windows in a row is not a hiccup and the read
 * should say so rather than grind on: every retry costs a whole window twice over, once to be
 * abandoned and once to be drained.
 */
export const MAX_WINDOW_RETRIES = 2;

/**
 * What a window read needs from a remote, and nothing more: no write method exists on it, so a caller
 * holding only this cannot reach a write path by mistake. `HarmonyRemote` satisfies it, and so does a
 * plain object serving bytes from a file, which is how the tests drive it.
 */
export interface FlashWindowReader {
  readFlash(address: number, count: number): Promise<Uint8Array>;
}

/** One window that had to be asked for again: where it starts, which retry this is, and why. */
export interface WindowRetry {
  /** The absolute flash address the window starts at, as it was sent. */
  readonly at: number;
  /** 1 for the first retry, up to `MAX_WINDOW_RETRIES`. */
  readonly attempt: number;
  /** What the failed attempt threw, passed on untouched so a caller can print the real reason. */
  readonly error: unknown;
}

export interface WindowRead {
  readonly bytes: Uint8Array;
  /** How many times this window was asked for again; zero for a window that came back first time. */
  readonly retries: number;
}

/**
 * Read one window of flash, asking for it again up to `MAX_WINDOW_RETRIES` times if an attempt throws.
 *
 * **A window is retried, because a read is idempotent and the failure it has is transient.** Section
 * 223: a `READ_FLASH` answer streams back as fast as the remote can send it, and HIDAPI's macOS backend
 * holds about 31 input reports and then silently discards the oldest, so a consumer stalled for longer
 * than the queue takes to fill loses a run of chunks. Measured by stalling on purpose: 100 ms costs 17
 * chunks and 200 ms costs 67, both within one of what the measured transfer rate and that queue depth
 * predict. A lost chunk shows up here as `readFlash` throwing `flash chunk out of sequence`, and the
 * same request afterwards is answered normally because nothing on the remote changed.
 *
 * **The retry asks for the same window, the same address and the same count, and nothing else.** That
 * matters on the Harmony 880 and 885, where a read is not always harmless: one whose last byte is
 * `0x000104` or `0x000105` alone in its chunk runs code. A caller that chose a safe window shape keeps
 * it, because a retry introduces no shape the first attempt did not already send.
 *
 * **Why the next attempt starts on a clean pipe**: `HarmonyRemote.readFlash` drains whatever the failed
 * transfer left queued before it throws, section 223, so the retry is not answered with the tail of the
 * attempt it replaces.
 *
 * It is bounded and counted rather than silent, because a link that needs three goes at every window is
 * a fault to see and not to absorb: `onRetry` is told at the moment it happens and the count comes back
 * with the bytes. The last failure is rethrown as it was, not wrapped, so the caller reports the
 * transport's own reason. The budget is attempts in total, `MAX_WINDOW_RETRIES + 1`, not retries after
 * an unlimited first go.
 *
 * The length is the caller's to check. A real `readFlash` already throws on a short transfer, and what a
 * short window means differs per caller: `readConfig` refuses it with its own error type.
 */
export async function readFlashWindow(
  reader: FlashWindowReader,
  address: number,
  count: number,
  onRetry?: (retry: WindowRetry) => void,
): Promise<WindowRead> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return { bytes: await reader.readFlash(address, count), retries: attempt };
    } catch (error: unknown) {
      if (attempt === MAX_WINDOW_RETRIES) throw error;
      onRetry?.({ at: address, attempt: attempt + 1, error });
    }
  }
}
