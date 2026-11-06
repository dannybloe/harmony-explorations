/**
 * The compare base of the Harmony 885 compile track, `todo/todo-compile-885.md` 1.7.
 *
 * **Why a base of our own choosing.** Logitech's service compiles nothing for the 880 or 885, so the
 * 650's route, a Logitech compile of our test setup to check every step against, is not open here. The
 * base is what bench unit A already holds, read off it twice and identical on 5 November 2026
 * (`docs/test-notes/harmony-885.md`), and every composer of the track is checked by adding to it and by
 * what the remote then does. This test pins what our reader finds in it, so a reader change that loses a
 * device or an activity of the base shows here rather than in a bench run.
 *
 * **What it settles and what it does not.** That the codec reads the base's inventory whole: eight
 * devices and three activities, every one with a name, the counts the container states agreeing with
 * the lists read. Not that the names are right for the person who set the remote up: those are what the
 * configuration spells, Dutch included, and nothing here compares them with anything outside it.
 *
 * **Unit B as the control.** The same reader on unit B's configuration finds names missing, two devices
 * and one activity, so "every one named" is a property of A's file and not of the reader's output
 * shape. Which of B's are unnamed, and why, is not read here.
 *
 * Arch 8 (Harmony 880 and 885) only; the two units run one application build, 4.4.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import { parse, devices, activityNames, activityCount, deviceCount } from '../src/index.ts';

test('unit A, the base: eight devices and three activities, every one named', skipUnless('h885_a_config'), () => {
  const c = parse(load('h885_a_config') as Uint8Array);
  const named = devices(c);
  assert.equal(deviceCount(c), 8);
  assert.equal(named.length, 8);
  assert.equal(named.filter((d) => d.name == null || d.name === '').length, 0);
  const activities = activityNames(c);
  assert.equal(activityCount(c), 3);
  assert.equal(activities.length, 3);
  assert.equal(activities.filter((a) => a.name == null || a.name === '').length, 0);
});

test('unit B, the control: the same reader leaves two devices and one activity unnamed', skipUnless('h885_b_config'), () => {
  const c = parse(load('h885_b_config') as Uint8Array);
  const named = devices(c);
  assert.equal(deviceCount(c), 9);
  assert.equal(named.filter((d) => d.name == null || d.name === '').length, 2);
  const activities = activityNames(c);
  assert.equal(activityCount(c), 7);
  assert.equal(activities.filter((a) => a.name == null || a.name === '').length, 1);
});
