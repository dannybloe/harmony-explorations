/**
 * The Harmony Touch's bench test for 8.5, `todo-touch.md` 8.5: Listen to Music and the Denon AV Receiver taken out of
 * the documents, and the activities that lost the receiver started, used, switched and ended without a code of it,
 * with what the remote is predicted to send derived from the documents by `harmony-touch/engine.ts`, never written by hand. The
 * same derivation as 7.1's to 8.3's, `touchTest` in `touchbench.ts`; only the plan is new.
 *
 * **The set it is derived from** is `work/touch-firmware/sets/8.5-removal`, the set the bench Touch holds since 8.4,
 * `8.4-settings-back`, with the activity and the device taken out by `packages/corpus/bin/touch-device-set.ts
 * --removal` and `packages/corpus/touch-removals/8.5-removal.json`. Every code it predicts is a bench device's that the
 * monitor already names from the earlier sets, `BENCH_TOUCH_SETS` in `irmonitor.ts`, so a receiver code heard would be
 * named too.
 *
 * **What the plan holds, and why each step.**
 *
 * * Off, unjudged, so no activity runs and every device is held off whatever ran before.
 * * Watch TV from Off: the LG TV switched on and to its input and nothing else, where the source switches the
 *   receiver on and to its TV input as well. It is the tuning default, so the favourites keep working through the TV.
 * * Volume Up, Volume Down and Mute in Watch TV: each predicted to send nothing, since the removal took the three keys
 *   out of its map with the receiver and the screens drop a key the map does not hold. A step with no expectation
 *   cannot fail on its own; the run's record is what shows nothing was heard.
 * * Watch a Blu-ray, switched to from Watch TV: the Blu-ray switched on and the TV to its input, no receiver code; and
 *   its Test Sequence entry tapped, which the removal moved down one place in the list when it took the receiver's
 *   entry out above it, so the engine taking the tap by its new index and sending the sequence is the check that the
 *   list was closed up right.
 * * Play a Game, switched to from Watch a Blu-ray: the Xbox on, the Blu-ray off, the TV's input, no receiver code.
 * * Off: the activity's power offs and nothing of the receiver.
 *
 * **What the model cannot say, the description asks the person to note**: the activity list showing four activities and
 * not Listen to Music, the device list showing six devices and not the Denon AV Receiver, and Watch a Blu-ray's command
 * list with eight entries, no InputAm, Test Sequence last.
 */
import type { harmonyTouch } from '@harmony/codec';

import type { TestDefinition } from '../src/irsession.ts';
import { touchTest, type TouchStep, type TouchTestPlan } from '../src/touchbench.ts';

type Configuration = harmonyTouch.Configuration;

/** The set the predictions read and the remote is to hold for the bench test, by its path in the lab. */
export const TOUCH_8_5_SET = 'work/touch-firmware/sets/8.5-removal/set.json';
/** The put back, the set the bench Touch held before, content and tags. */
export const TOUCH_8_5_BACK_SET = 'work/touch-firmware/sets/8.5-removal-back/set.json';
/** What 8.5 takes out, by the names the lists show. */
export const TOUCH_8_5_REMOVED = { activity: 'Listen to Music', device: 'Denon AV Receiver' } as const;
/** The activities the test starts, each of which lost the receiver. */
export const TOUCH_8_5_ACTIVITIES = ['Watch TV', 'Watch a Blu-ray', 'Play a Game'] as const;
/** The entry of Watch a Blu-ray the removal moved down one place. */
export const TOUCH_8_5_ENTRY = 'Test Sequence';

/**
 * The plan of 8.5, from the configuration; refused on one that lacks an activity it starts. It does not refuse a
 * configuration that still holds what 8.5 takes out, since `test/touch-removal-predicted.test.ts`'s control runs it on the set before.
 */
export function touch85Plans(c: Configuration): TouchTestPlan[] {
  for (const name of TOUCH_8_5_ACTIVITIES) if (!c.activities.some((a) => a.name === name)) throw new Error(`the configuration holds no ${name}`);
  const shown = [...c.activities].filter((a) => !a.hidden).sort((x, y) => (x.order ?? 0) - (y.order ?? 0)).map((a) => a.name ?? '');
  const devices = c.devices.map((d) => d.name ?? '');
  const movie = c.activities.find((a) => a.name === TOUCH_8_5_ACTIVITIES[1])!;
  const labels = [...(movie.map?.entries.values() ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((e) => e.label ?? '');
  const steps: TouchStep[] = [
    { actions: [{ start: null }], judged: false },
    { actions: [{ start: TOUCH_8_5_ACTIVITIES[0] }], judged: true },
    { actions: [{ key: 'VolumeUp' }, { key: 'VolumeDown' }, { key: 'VolumeMute' }], judged: true },
    { actions: [{ start: TOUCH_8_5_ACTIVITIES[1] }], judged: true },
    { actions: [{ entry: TOUCH_8_5_ENTRY }], judged: true },
    { actions: [{ start: TOUCH_8_5_ACTIVITIES[2] }], judged: true },
    { actions: [{ start: null }], judged: true },
  ];
  return [{
    id: 'touch-8-5-removal',
    name: `Harmony Touch 8.5, ${TOUCH_8_5_REMOVED.activity} and the ${TOUCH_8_5_REMOVED.device} taken out`,
    summary: `An activity and a device of the remote's own taken out: the activities that lost the ${TOUCH_8_5_REMOVED.device} started, used, switched and ended without a code of it.`,
    description: 'todo-touch.md 8.5, on the bench Harmony Touch holding work/touch-firmware/sets/8.5-removal: the set of 8.4\'s put back '
      + `with ${TOUCH_8_5_REMOVED.activity} and the ${TOUCH_8_5_REMOVED.device} taken out, with everything naming them `
      + '(packages/corpus/touch-removals/8.5-removal.json). Every expectation is derived from that set by '
      + 'packages/bench/src/touchengine.ts and named as the monitor names a code of the Touch\'s own documents. Step 1 presses '
      + 'Off and is not judged. '
      + `In step 2, before tapping ${TOUCH_8_5_ACTIVITIES[0]}, write in the problem field whether the activity list shows `
      + `${shown.length} activities (${shown.join(', ')}) and not ${TOUCH_8_5_REMOVED.activity}; and, from the Devices screen and back `
      + `without choosing a device, whether it lists ${devices.length} devices (${devices.join(', ')}) and not the `
      + `${TOUCH_8_5_REMOVED.device}. `
      + `Predicted for ${TOUCH_8_5_ACTIVITIES[0]}: the LG TV switched on and to its input, and no ${TOUCH_8_5_REMOVED.device} code. `
      + 'Step 3: Volume Up, Volume Down and Mute are predicted to send nothing at all; write in the problem field anything '
      + 'heard or shown. '
      + `In step 5, write whether ${TOUCH_8_5_ACTIVITIES[1]}'s command list shows ${labels.length} entries in this order, `
      + `${labels.join(', ')}, with no InputAm; then tap ${TOUCH_8_5_ENTRY}, predicted to send the Blu-ray's Stop, a pause `
      + 'of about a second, and its TopMenu. '
      + `Then ${TOUCH_8_5_ACTIVITIES[2]}, and Off: no ${TOUCH_8_5_REMOVED.device} code anywhere in the test. `
      + 'Wait for the codes to stop before pressing Next: a start runs up to about 15 seconds, most of it the LG TV\'s power on delay.',
    steps,
  }];
}

/** Every 8.5 test, derived. */
export function touch85Tests(c: Configuration): { id: string; definition: TestDefinition }[] {
  return touch85Plans(c).map((plan) => ({ id: plan.id, definition: touchTest(c, plan) }));
}
