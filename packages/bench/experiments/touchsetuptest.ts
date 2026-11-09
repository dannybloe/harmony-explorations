/**
 * The Harmony Touch's bench test for 8.6, `todo-touch.md` 8.6: the whole test setup, every device and every activity,
 * composed by us from a description, and run as the 7.1 tests themselves.
 *
 * **Why the 7.1 tests and no new plan.** 8.6 composes the four documents that name devices and activities from
 * `packages/corpus/touch-setups/8.6-test-setup.json`, which describes the set the bench Touch holds, and the comparison
 * with Logitech's documents found every field equal, equal after a normalisation the remote does not see, or left out
 * as read by neither program, `packages/corpus/test/touch/touch-setup-set.test.ts`. So the setup is meant to behave exactly
 * as the set it was described from, and the ten 7.1 tests derived from it are the files in `irtests/` as they stand,
 * expectation for expectation, `test/harmony-touch/touch-setup-predicted.test.ts`. Running them on the remote holding our setup is the check that
 * it does: every activity started and ended, the switches, the favourites, every key of every activity's map, and
 * every device's own keys in device mode, 418 expectations in ten tests.
 *
 * **What the model cannot say, and the person notes**: the activity list in its order with the same pictures, the
 * device list, Watch a Blu-ray opening on its gesture screen and Watch TV on the favourites, and each activity's
 * command list in its order with its icons. The ids under all of it are new, so a picture or a cache the remote keys by
 * a device's or an activity's id is the one place the run can show something the documents do not.
 *
 * **Every code it predicts is named by the monitor already**: the codes are the catalogue's, carried unchanged, and
 * the device names are the set's, so `BENCH_TOUCH_SETS` in `irmonitor.ts` names them as it named them in 7.1.
 */

/** The set the bench Touch is to hold for the run, by its path in the lab. */
export const TOUCH_8_6_SET = 'work/touch-firmware/sets/8.6-setup/set.json';
/** The put back, the set the bench Touch held before, content and tags: `8.5-removal-back`. */
export const TOUCH_8_6_BACK_SET = 'work/touch-firmware/sets/8.6-setup-back/set.json';
/** The set the setup was described from and is composed onto, the one the bench Touch holds since 8.5. */
export const TOUCH_8_6_SOURCE_SET = 'work/touch-firmware/sets/8.5-removal-back/set.json';
/** The description, by its path in this repository. */
export const TOUCH_8_6_DESCRIPTION = 'packages/corpus/touch-setups/8.6-test-setup.json';

/** The tests run on the remote holding the setup: the ten of 7.1, in the order 7.1 ran them. */
export const TOUCH_8_6_TESTS = [
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
