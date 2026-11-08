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
 * devices and three activities, each with the name the configuration states for it, the counts the
 * container states agreeing with the lists read. The names are asserted one by one, because a count of
 * names is what let a wrong one through. Not that the names are right for the person who set the remote
 * up: those are what the configuration spells, Dutch included, and nothing here compares them with
 * anything outside it.
 *
 * **Corrected in place.** This test said "every one named" and asserted only that no name was empty,
 * and it passed while the fifth device, infrared group 4, was named `Pwr`: a command label off the top
 * of its own mode's third page, taken as a title, on an architecture whose device modes draw no title.
 * The device has no state variable, so base slot 0 names nothing for it, and its name is the label on
 * its device list row, `Cd-speler`, which the reader did not read on arch 8 until the follow up to
 * `todo-compile-885.md` 1.7. The argument and the bytes are `arch8devicelist.test.ts`.
 *
 * **Unit B as the control, for the activities only now.** The same reader on unit B's configuration
 * leaves one of its seven activities unnamed, so "every activity named" is a property of A's file and
 * not of the reader's output shape. Why that activity is unnamed is not read here. B's two unnamed
 * devices were the same defect as A's `Pwr`, and B names all nine since; `arch8devicelist.test.ts`
 * holds which.
 *
 * Arch 8 (Harmony 880 and 885) only; the two units run one application build, 4.4.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { load, skipUnless } from '@harmony/lab';
import { parse, devices, activityNames, activityCount, deviceCount } from '../src/index.ts';
import '../src/support/resources.node.ts';

test('unit A, the base: eight devices and three activities, each with the name its configuration states',
  skipUnless('h885_a_config'), () => {
    const c = parse(load('h885_a_config') as Uint8Array);
    assert.equal(deviceCount(c), 8);
    // By infrared group, with the route each name came by: seven from base slot 0's name tree, and the CD
    // player, which no state variable names, from the label its device list row draws.
    assert.deepEqual(devices(c).map((d) => [d.group, d.name, d.source]), [
      [0, 'PVR', 'names'],
      [1, 'old_media_Center', 'names'],
      [2, 'Media_Center-pc', 'names'],
      [3, 'AV-ontvanger-Woonkamer', 'names'],
      [4, 'Cd-speler', 'list'],
      [5, 'Tv', 'names'],
      [6, 'Media_Center-pc_2', 'names'],
      [7, 'DVD_speler', 'names'],
    ]);
    assert.equal(activityCount(c), 3);
    assert.deepEqual(activityNames(c).map((a) => a.name), ['DVD Kijken', 'TV Kijken', 'Polsat kijken']);
  });

test('unit B, the control: nine devices all named, and one of its seven activities unnamed',
  skipUnless('h885_b_config'), () => {
    const c = parse(load('h885_b_config') as Uint8Array);
    const named = devices(c);
    assert.equal(deviceCount(c), 9);
    assert.equal(named.length, 9);
    assert.equal(named.filter((d) => d.name == null || d.name === '').length, 0);
    const activities = activityNames(c);
    assert.equal(activityCount(c), 7);
    assert.equal(activities.filter((a) => a.name == null || a.name === '').length, 1);
  });
