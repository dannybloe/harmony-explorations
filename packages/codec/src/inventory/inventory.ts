/**
 * What a config says it is **for**: which devices it drives and how many activities it has.
 *
 * Everything else in this codec is about bytes. This module is about the two nouns the
 * application's interface is built from, and it exists because both turn out to be stated rather
 * than inferred: an infrared group is a device, and one state variable counts the activities.
 * `docs/findings.md` section 86.
 *
 * **The names in here are the user's own equipment.** This module hands them back, because the
 * application is reading its owner's own config; what does not happen is quoting one in a document
 * or a test. The generic role words the generator emits are structure and appear freely, and the
 * tests assert how many variables carry a device identifier rather than which.
 *
 * **One module until `todo.md` 7.3.8, the parts now beside it, each re-exported here whole**, so a caller
 * imports from this module as before and every name it had stays: `statevariables.ts`, the variables the
 * name tree names; `instructions.ts`, the instruction words the readers recognise; `compilerorder.ts`, the
 * order Logitech's compiler writes cases and tags in; `activities.ts`; `devices.ts`; `keys.ts`, what each
 * key sends and the labels a screen draws for it; and `power.ts`, a device's power and its delays.
 * `common.ts` holds the few constants the parts share and is not re-exported, since none of it was public.
 * What stays here is the composition, `inventory`.
 */
import { Container } from '../container/gspm.ts';
import { activities, type Activity, idleActivityValue } from './activities.ts';
import { type Device, devices } from './devices.ts';
export * from './statevariables.ts';
export * from './instructions.ts';
export * from './compilerorder.ts';
export * from './activities.ts';
export * from './devices.ts';
export * from './keys.ts';
export * from './power.ts';

/** Everything an interface needs to show a config, in one object. */
export interface Inventory {
  /** The architecture the config states, section 20, which is the only place it says so. */
  architecture?: number;
  /** When the config was built, from base slot 3. On arch 12 this is also what the clock is set to. */
  builtAt?: string;
  devices: Device[];
  activities: Activity[];
  /** The value `CurrentActivityState` holds when no activity is running. */
  idle?: number;
}

/**
 * The whole inventory of a config, composed.
 *
 * **Here so that a caller does not have to know the order.** Naming a device needs the infrared groups,
 * the state variables, the action lists and, for three devices in the corpus, the screen text; naming an
 * activity needs the touch hit map on arch 12 and the modes elsewhere. An application that assembled
 * that itself would be a second copy of the composition, and the first thing to drift.
 */
export function inventory(c: Container): Inventory {
  const out: Inventory = { devices: devices(c), activities: activities(c) };
  if (c.architecture !== undefined) out.architecture = c.architecture;
  if (c.builtAt !== undefined) out.builtAt = c.builtAt;
  const idle = idleActivityValue(c);
  if (idle !== undefined) out.idle = idle;
  return out;
}
