/**
 * The Harmony Touch's bench test for a device of ours, `todo-touch.md` 8.1: device mode for the composed device,
 * each of its keys, with what the remote is predicted to send derived from the documents by `harmony-touch/engine.ts`,
 * never written by hand. The same derivation as 7.1's, `touchTest` in `touchbench.ts`; only the plan is new.
 *
 * **The set it is derived from** is `work/touch-firmware/sets/8.1-device`, the bench set of 6.9 with the Test
 * Projector added, `packages/corpus/bin/touch-device-set.ts` and `packages/corpus/touch-devices/test-projector.json`.
 * Its codes are named on the monitor from the same set, `BENCH_TOUCH_SETS` in `irmonitor.ts`.
 *
 * **What the plan holds.** Off, unjudged, so no activity runs. Then the device chosen from the Devices list, which
 * sends nothing; every key its own map binds, tapped, in the keypad's groups; and, as a control from the same run,
 * the Blu-ray chosen and its navigation keys tapped: the bench set's Sony 20 Bit definition, Logitech's, beside
 * our Sony 12 Bit one, which has its shape. **What the model cannot say, the description asks the person to note**:
 * whether the device shows in the list with its name and the default picture, and whether its own screen lists
 * its labels in the order of their `IndexInMenu`. The screen entry Power, which no key binds, is not in the test:
 * when it was written the model predicted a key and not a screen entry, so the lab's `notes/8.1-preflight.md` had
 * the entry pressed after the test, heard and not judged. The model has had a screen entry since the run,
 * `TouchEngine.entry` and the `{ entry }` action, and `test/touch-device-runs.test.ts` holds that it predicts that tap;
 * the plan is left as it ran, so the file in `irtests/` stays the one the run carried.
 */
import type { harmonyTouch } from '@harmony/codec/node';

import type { TestDefinition } from '../src/irsession.ts';
import { KEY_GROUPS, keySteps, touchTest, type TouchStep, type TouchTestPlan } from '../src/touchbench.ts';

type Configuration = harmonyTouch.Configuration;

/** The set the predictions read and the remote is to hold for the bench test, by its path in the lab. */
export const TOUCH_8_1_SET = 'work/touch-firmware/sets/8.1-device/set.json';
/** The put back, the 6.9 set's content again under tags of its own. */
export const TOUCH_8_1_BACK_SET = 'work/touch-firmware/sets/8.1-device-back/set.json';
/** The device of ours, by the name the documents and the screens give it. */
export const TOUCH_8_1_DEVICE = 'Test Projector';
/** The control device, the bench set's Sony 20 Bit one. */
export const TOUCH_8_1_CONTROL = 'Blu-ray';

/** The plan of 8.1, from the configuration: the device's keys are read from its own map, not listed by hand. */
export function touch81Plans(c: Configuration): TouchTestPlan[] {
  const device = c.devices.find((d) => d.name === TOUCH_8_1_DEVICE);
  const control = c.devices.find((d) => d.name === TOUCH_8_1_CONTROL);
  if (device?.map === undefined) throw new Error(`the configuration holds no ${TOUCH_8_1_DEVICE} with a map`);
  if (control?.map === undefined) throw new Error(`the configuration holds no ${TOUCH_8_1_CONTROL} with a map`);
  const navigation = new Set(KEY_GROUPS[1]);
  const controlKeys = control.map.keys.filter((k) => navigation.has(k.key ?? ''));
  const labels = [...device.map.entries.values()].map((e) => e.label ?? '');
  const steps: TouchStep[] = [
    { actions: [{ start: null }], judged: false },
    { actions: [{ device: TOUCH_8_1_DEVICE }], judged: true },
    ...keySteps(device.map.keys),
    { actions: [{ device: TOUCH_8_1_CONTROL }], judged: true },
    ...keySteps(controlKeys),
  ];
  return [{
    id: 'touch-8-1-device-mode',
    name: `Harmony Touch 8.1, ${TOUCH_8_1_DEVICE} in device mode`,
    summary: `A device of ours: chosen from the Devices list, each key of its own map tapped, then the ${TOUCH_8_1_CONTROL}'s navigation keys as a control.`,
    description: 'todo-touch.md 8.1, on the bench Harmony Touch holding work/touch-firmware/sets/8.1-device: the set of 6.9 with a '
      + `device of ours added, ${TOUCH_8_1_DEVICE}, composed from the rhythm table's Sony 12 Bit row with numbers of ours `
      + '(packages/corpus/touch-devices/test-projector.json). Every expectation is derived from that set by '
      + 'packages/bench/src/touchengine.ts and named as the monitor names a code of the Touch\'s own documents. Step 1 presses '
      + 'Off and is not judged. '
      + `In step 2, before pressing Next, write in the problem field whether ${TOUCH_8_1_DEVICE} is in the Devices list, last, `
      + `with its name and the default picture, and whether its own screen lists ${labels.length} entries in this order, with `
      + `no icons: ${labels.join(', ')}. `
      + `Predicted per key: the command of the same name to ${TOUCH_8_1_DEVICE}, a Sony 12 bit code sent three times about `
      + '45 ms apart, which the monitor shows as one press; activities play no part. '
      + `Then the ${TOUCH_8_1_CONTROL} is chosen and its navigation keys tapped: Logitech's Sony 20 Bit definition beside ours, `
      + 'from the same run. A key the map does not bind sends nothing and is not pressed here.',
    steps,
  }];
}

/** Every 8.1 test, derived. */
export function touch81Tests(c: Configuration): { id: string; definition: TestDefinition }[] {
  return touch81Plans(c).map((plan) => ({ id: plan.id, definition: touchTest(c, plan) }));
}
