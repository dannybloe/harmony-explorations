/**
 * The Harmony Touch's bench test for 9.1, `todo-touch.md` 9.1, run in 9.4: the whole test setup built from a setup file
 * with no Logitech document as input, and run as the 7.1 tests themselves.
 *
 * **Why the 7.1 tests and no new plan.** 9.1 builds all six documents from `packages/corpus/setups/touch-test.json`,
 * the archive of the catalogue and our rhythm table, and the comparison with 8.6's set, which the bench Touch ran 418 of
 * 418, found every field equal, equal after a normalisation the remote does not tell apart, or different for a stated
 * reason, and every one of the 373 commands sending the same, `packages/corpus/test/touch/touch-nothing-set.test.ts`. So the
 * set is meant to behave as 8.6's did, and the ten 7.1 tests derived from it are the files in `irtests/` as they stand,
 * expectation for expectation, `test/harmony-touch/touch-from-nothing-predicted.test.ts`: every activity started and ended, the switches, the favourites,
 * every key of every activity's map, and every device's own keys in device mode, 418 expectations in ten tests.
 *
 * **What the model cannot say, and the person notes**, beyond 8.6's list: the entries of each activity's and device's
 * command list with no icon, since the archive holds no function id; the Xbox's codes, sent with no toggle bit where
 * Logitech's definition states one, so every press sends the code as first stated where theirs alternate, which the
 * monitor names either way since it renders each command with its toggle bit both ways, and whether the Xbox acts on a
 * second press of the same key is the person's to see; a Context of seven fields where Logitech's documents carry
 * twenty one; and the background, a picture of ours, dark blue with a yellow band across its foot, shown in place of the
 * built in one 8.6 showed, with the person's own background out of the background picker while the set is held and in
 * it again after the put back. Those are the predictions 9.4 tests, each named as a difference in
 * `experiments/touchnothingset.ts` in `packages/corpus`.
 *
 * **Every code it predicts is named by the monitor already**: the codes send what 8.6's sent and the device names are
 * the setup file's, which are 8.6's, so `BENCH_TOUCH_SETS` in `irmonitor.ts` names them as it named them in 7.1.
 */

/** The set the bench Touch is to hold for the run, by its path in the lab. */
export const TOUCH_9_1_SET = 'work/touch-firmware/sets/9.1-nothing/set.json';
/** The put back, the set the bench Touch holds before the run, content and tags: `8.6-setup-back`. */
export const TOUCH_9_1_BACK_SET = 'work/touch-firmware/sets/9.1-nothing-back/set.json';
/** The setup file, by its path in this repository. */
export const TOUCH_9_1_SETUP_FILE = 'packages/corpus/setups/touch-test.json';

/** The tests run on the remote holding the set: the ten of 7.1, in the order 7.1 ran them. */
export const TOUCH_9_1_TESTS = [
  'touch-7-1-1-starts',
  'touch-7-1-2-switches',
  'touch-7-1-3-favourites',
  'touch-7-1-4-watch-tv-keys',
  'touch-7-1-5-watch-a-blu-ray-keys',
  'touch-7-1-6-listen-to-music-keys',
  'touch-7-1-7-switch-box-keys',
  'touch-7-1-8-play-a-game-keys',
  'touch-7-1-9a-device-mode',
  'touch-7-1-9b-device-mode',
] as const;
