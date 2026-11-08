/**
 * The Harmony Touch's bench test for an activity of ours, `todo-touch.md` 8.2: the activity started from Off, its
 * keys and its screen entries, a switch to a recorded activity and back, and Off, with what the remote is predicted
 * to send derived from the documents by `families/harmony-touch/engine.ts`, never written by hand. The same derivation as 7.1's and
 * 8.1's, `touchTest` in `touchbench.ts`; only the plan is new.
 *
 * **The set it is derived from** is `work/touch-firmware/sets/8.2-activity`, the set the bench Touch holds since 8.1,
 * `8.1-device-back`, with Test Cinema added, `packages/corpus/bin/touch-device-set.ts --activity` and
 * `packages/corpus/touch-activities/test-cinema.json`. Its codes are named on the monitor from the same set,
 * `BENCH_TOUCH_SETS` in `irmonitor.ts`; every command it sends is a bench device's, so the earlier sets name them too.
 *
 * **What the plan holds, and why each step.**
 *
 * * Off, unjudged, so no activity runs and every device is held off whatever ran before.
 * * The activity started from Off: the start order of the activity's own, the Blu-ray switched on before the LG TV,
 *   which no recorded activity starts with; the TV's input; then the start steps added by hand, a pause of 3 s and
 *   the Blu-ray's TopMenu.
 * * Every key its map binds, in the keypad's groups: the volume keys to the LG TV, the others to the Blu-ray, so one
 *   map sends to two devices.
 * * Every screen entry, tapped by its label, `{ entry }` in `touchbench.ts`, which the 8.1 landing added after the
 *   Power entry of a device of ours was heard and not judged: three to the Blu-ray and one to the LG TV.
 * * A switch to Watch TV, a recorded activity: the end step added by hand first (the Blu-ray's Stop), the Denon
 *   switched on, the Blu-ray switched off since Watch TV does not use it, and Watch TV's inputs.
 * * A switch back from Watch TV: the Blu-ray switched on again, the Denon left on since it is kept on between
 *   activities, the TV's input, and the start steps.
 * * Off: the end step, then the activity's power offs in its own order, the LG TV before the Blu-ray, then the
 *   Denon, the one device still on.
 *
 * **What the model cannot say, the description asks the person to note**: the activity on the activity list, last,
 * with its name and the picture of its type, and its command list with the four labels of ours in their order.
 */
import type { harmonyTouch } from '@harmony/codec/node';

import type { TestDefinition } from '../src/irsession.ts';
import { keySteps, touchTest, type TouchStep, type TouchTestPlan } from '../src/touchbench.ts';

type Configuration = harmonyTouch.Configuration;

/** The set the predictions read and the remote is to hold for the bench test, by its path in the lab. */
export const TOUCH_8_2_SET = 'work/touch-firmware/sets/8.2-activity/set.json';
/** The put back, the 8.1 put back's content again under tags of its own. */
export const TOUCH_8_2_BACK_SET = 'work/touch-firmware/sets/8.2-activity-back/set.json';
/** The activity of ours, by the name the documents and the screens give it. */
export const TOUCH_8_2_ACTIVITY = 'Test Cinema';
/** The recorded activity the test switches to and back from. */
export const TOUCH_8_2_OTHER = 'Watch TV';

/** The plan of 8.2, from the configuration: the activity's keys and entries are read from its own map, not listed by hand. */
export function touch82Plans(c: Configuration): TouchTestPlan[] {
  const activity = c.activities.find((a) => a.name === TOUCH_8_2_ACTIVITY);
  if (activity?.map === undefined) throw new Error(`the configuration holds no ${TOUCH_8_2_ACTIVITY} with a map`);
  if (!c.activities.some((a) => a.name === TOUCH_8_2_OTHER)) throw new Error(`the configuration holds no ${TOUCH_8_2_OTHER}`);
  const entries = [...activity.map.entries.values()].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const labels = entries.map((e) => e.label ?? '');
  const shown = [...c.activities].filter((a) => !a.hidden).sort((x, y) => (x.order ?? 0) - (y.order ?? 0)).map((a) => a.name ?? '');
  const steps: TouchStep[] = [
    { actions: [{ start: null }], judged: false },
    { actions: [{ start: TOUCH_8_2_ACTIVITY }], judged: true },
    ...keySteps(activity.map.keys),
    { actions: labels.map((entry) => ({ entry })), judged: true },
    { actions: [{ start: TOUCH_8_2_OTHER }], judged: true },
    { actions: [{ start: TOUCH_8_2_ACTIVITY }], judged: true },
    { actions: [{ start: null }], judged: true },
  ];
  return [{
    id: 'touch-8-2-activity',
    name: `Harmony Touch 8.2, ${TOUCH_8_2_ACTIVITY}, an activity of ours`,
    summary: `An activity of ours: started from Off, its keys and screen entries, a switch to ${TOUCH_8_2_OTHER} and back, and Off.`,
    description: 'todo-touch.md 8.2, on the bench Harmony Touch holding work/touch-firmware/sets/8.2-activity: the set of 8.1\'s '
      + `put back with an activity of ours added, ${TOUCH_8_2_ACTIVITY}, composed from the bench devices by name `
      + '(packages/corpus/touch-activities/test-cinema.json). Every expectation is derived from that set by '
      + 'packages/bench/src/touchengine.ts and named as the monitor names a code of the Touch\'s own documents. Step 1 presses '
      + 'Off and is not judged. '
      + `In step 2, before tapping the activity, write in the problem field whether ${TOUCH_8_2_ACTIVITY} is on the activity `
      + `list, last of ${shown.length} (${shown.join(', ')}), with its name and the picture of a custom activity; and once `
      + `it has started, whether its command list shows ${labels.length} entries in this order, with no icons: `
      + `${labels.join(', ')}. `
      + 'Predicted for the start: the Blu-ray\'s PowerOn first, then the LG TV\'s, then the TV\'s input once its 10 second '
      + 'power on delay is out, then a pause of 3 s and the Blu-ray\'s TopMenu; no Denon code. '
      + 'Predicted per key: the volume keys to the LG TV, the rest to the Blu-ray; per screen entry, its command. '
      + `Then ${TOUCH_8_2_OTHER}: the Blu-ray's Stop first, the Denon switched on, the Blu-ray switched off, the inputs. `
      + `Then ${TOUCH_8_2_ACTIVITY} again: the Blu-ray switched on, the Denon left on, the TV's input, the pause and TopMenu. `
      + 'Off: the Blu-ray\'s Stop, the LG TV and the Blu-ray switched off in that order, then the Denon. '
      + 'Wait for the codes to stop before pressing Next: a start runs about 15 seconds, most of it the LG TV\'s power on delay.',
    steps,
  }];
}

/** Every 8.2 test, derived. */
export function touch82Tests(c: Configuration): { id: string; definition: TestDefinition }[] {
  return touch82Plans(c).map((plan) => ({ id: plan.id, definition: touchTest(c, plan) }));
}
