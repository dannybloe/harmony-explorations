/**
 * Two polled bytes into presses and releases, `src/presses.ts`, as published.
 *
 * The cases are the shapes an 885's keypad produced when it was measured, `tests/test_harmony_885_keys.py`:
 * a press is the held byte going to a code and the copy following it; a release is the held byte going to
 * zero while the copy stays; one key straight to another happened once; and a change of the copy alone is a
 * key pressed and let go between two reads.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type * as Presses from '../src/presses.ts';
import { publishedModule, publishedWith } from './built.ts';

const { PressTracker } = (await publishedModule('presses.js')) as typeof Presses;

/** The events of a run of polls, each `[held, last]`, flattened to `+code` and `-code`. */
function events(...polls: [number, number][]): string[] {
  const tracker = new PressTracker();
  return polls.flatMap(([held, last]) =>
    tracker.update(held, last).map((e) => `${e.kind === 'press' ? '+' : '-'}${e.code}`),
  );
}

test('the first poll reports nothing, whatever it reads', () => {
  assert.deepEqual(events([11, 11]), []);
  assert.deepEqual(events([0, 33]), []);
});

test('a press and its release', () => {
  assert.deepEqual(events([0, 5], [11, 11], [11, 11], [0, 11]), ['+11', '-11']);
});

test('the same key twice', () => {
  assert.deepEqual(events([0, 11], [11, 11], [0, 11], [11, 11], [0, 11]), ['+11', '-11', '+11', '-11']);
});

test('one key straight to another', () => {
  assert.deepEqual(events([0, 0], [32, 32], [11, 11], [0, 11]), ['+32', '-32', '+11', '-11']);
});

test('a copy that catches up a poll late is the same press, not a second one', () => {
  // A press landing between the page's two reads: held already, the copy still old. Without the tracker
  // remembering the press, the next poll's copy read as a key pressed and let go, and the press was listed
  // twice; that is how it was found, driving the page with a pretend remote.
  assert.deepEqual(events([0, 5], [11, 5], [11, 11], [0, 11]), ['+11', '-11']);
  assert.deepEqual(events([0, 5], [11, 5], [0, 11]), ['+11', '-11']);
});

test('control: without the pairing, the late copy counts the key twice', async () => {
  // The published tracker with the pairing taken out, so that the case above is shown to be about it.
  const pairing = 'last === this.#awaitingCopy || ';
  const without = (await publishedWith('presses.js', pairing, '')) as typeof Presses;
  const tracker = new without.PressTracker();
  const seen = ([[0, 5], [11, 5], [0, 11]] as const).flatMap(([held, last]) => tracker.update(held, last));
  assert.deepEqual(seen.map((e) => `${e.kind === 'press' ? '+' : '-'}${e.code}`), ['+11', '-11', '+11', '-11']);
});

test('a key pressed and let go between two reads shows in the copy alone', () => {
  assert.deepEqual(events([0, 5], [0, 7]), ['+7', '-7']);
  // And while another key is let go in the same interval, after it.
  assert.deepEqual(events([0, 5], [11, 11], [0, 7]), ['+11', '-11', '+7', '-7']);
});
