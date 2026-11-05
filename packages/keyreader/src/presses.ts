/**
 * Turning two polled bytes into key presses and releases.
 *
 * An arch 8 remote keeps the key held in one byte, zero when none, and copies every newly pressed key into
 * a second byte that nothing clears, `@harmony/usb/keys`. The page reads both on every poll, and what a
 * person cares about is the presses. So a press is the held byte going to a code, and a release is it
 * leaving one; and a change of the second byte alone is a key pressed and let go between two polls, too
 * quick for the held byte to show it, which is the reading the measurement of the 885's keypad used.
 *
 * **The two bytes are two reads, not one snapshot**, and that is where a press gets counted twice. The
 * firmware writes the held byte first and the copy straight after, and `link.ts` reads the copy first and
 * the held byte second, so a press that lands between the two reads shows as held with the copy still
 * old, and the copy catches up a poll later. That catching up is not a second press, so the tracker
 * remembers the press it has reported and is still waiting to see in the copy. Found by driving the page
 * with a pretend remote whose two bytes changed between reads: the press was listed twice.
 *
 * Pure, so that the learning and test modes of the page can share it and a test can drive it without a
 * remote. It knows nothing about key names: a code is a number here, and naming it is the drawing's job.
 */

export type KeyEvent = { readonly kind: 'press' | 'release'; readonly code: number };

export class PressTracker {
  #held: number | undefined;
  #last: number | undefined;
  /** A press reported from the held byte that the copy has not caught up with yet. */
  #awaitingCopy: number | undefined;

  /**
   * The events between the previous poll and this one, in the order they happened.
   *
   * The first poll only sets the resting values and reports nothing, the way `watch-keys.ts` seeds its
   * comparison: a key already down when the page connected was not pressed while it was watching, and the
   * last key pressed then is whatever was pressed before the page existed.
   */
  update(held: number, last: number): KeyEvent[] {
    const wasHeld = this.#held;
    const wasLast = this.#last;
    this.#held = held;
    this.#last = last;
    if (wasHeld === undefined || wasLast === undefined) return [];

    const events: KeyEvent[] = [];
    if (held !== wasHeld && wasHeld !== 0) events.push({ kind: 'release', code: wasHeld });
    if (last !== wasLast) {
      if (last === this.#awaitingCopy || last === held) {
        // The copy of a press the held byte shows, now or earlier: the same press, not another.
        this.#awaitingCopy = undefined;
      } else if (last !== 0) {
        // A key pressed and let go between two polls: the copy moved to it and the held byte never showed it.
        events.push({ kind: 'press', code: last }, { kind: 'release', code: last });
      }
    }
    if (held !== wasHeld && held !== 0) {
      events.push({ kind: 'press', code: held });
      // Unless the copy already shows it, it will a poll from now, and that is this press.
      this.#awaitingCopy = last === held ? undefined : held;
    }
    return events;
  }
}
