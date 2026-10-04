/**
 * A catalogue device's power, as `composeDevice` takes it: the steps that switch it on and off, and the
 * three delays its catalogue entry states, section 320.
 *
 * **Why this exists.** `driving.ts` reads what Logitech's catalogue says about driving a device and
 * `composeDevice` builds what a configuration needs, and until section 320 the step between them lived
 * in `compose-device.ts`, a command line script, where no test could reach it. It took a power action
 * only when it was one send, and set every delay to what most compiled devices carry rather than to
 * what the device's own entry states. Calibrated against Logitech's compiler on the 18 test device
 * instances of the six power hold compiles, sections 306 to 308, this reproduces every step record and
 * every transition their compiler wrote, except the input states a power on resets, which
 * `composeDeviceInputs` composes since section NNN because they are writes into the input variables,
 * and one device whose family has no press block to build from.
 *
 * **What the catalogue states and how each part lands**:
 *
 * - **Power on and off.** A `discrete` device states an `on` and an `off` action; a `toggle` device
 *   states one `toggle` action, used both ways, which is what Logitech's compile of every toggle test
 *   device does: one record, sent by both transitions. Each action is an ordered list of steps.
 * - **A step** is a command sent once, or a command held for a stated time, the long press version,
 *   section 309. A step stated twice is one record and one send list called twice, as their compile of
 *   the Knoll HDP-1100's off does, three holds of its power toggle.
 * - **The power on delay** is the catalogue's `powerOnDelay` in tenths of a second, and the inter device
 *   delay its `interDeviceDelay`: both equal the compiled variables' first values on every test device.
 * - **The inter key delay** is the amount of the `0x7C` after each power step's send, in tenths: the
 *   catalogue's `interKeyDelay`, on every power step of every test device. Every command also has a
 *   list at 1, and on some devices Logitech's compiler adds an uncalled second list per digit at the
 *   inter key delay and a second list for some input commands at the input delay, on rules not read;
 *   `composeDevice` gives its ordinary commands 1 and composes neither copy.
 *
 * **What it refuses, rather than guessing**, each by throwing `ComposeError` with the reason:
 *
 * - a power type of `none`, `unknown` or absent, 35716 devices, since `composeDevice` always makes a
 *   power variable and no compile here shows what Logitech's compiler gives such a device. The one
 *   device on the test records with no power variable at all, Kodi, is not a test device and its
 *   catalogue entry is not pinned, so it says nothing about this;
 * - a discrete device missing either action, and a toggle device that also states an `on` or `off`
 *   action, whose meaning beside the toggle no compile here shows;
 * - a step that is a wait, a press held for an unstated time, or a state, since no compile here holds
 *   one inside a power action;
 * - a power on followed by a send or a wait, `onReset` holding anything but states. The input states a
 *   power on resets are reported rather than refused, because Logitech's compile writes them after the
 *   power action and the power on delay and they change neither, and `composeDeviceInputs` composes
 *   them, section NNN; a send there would be a command the device misses;
 * - a delay that is not a whole number of tenths, 119 power on delays, 3 inter device delays and 1 inter
 *   key delay over the 240520 discrete and toggle devices of the archive; a delay out of the
 *   composer's range is refused there.
 *
 * Decision 15 applies: what is read here is Logitech's data and stays on this machine.
 */
import { ComposeError, type ComposePowerStep } from './compose.ts';
import type { DeviceDriving, DriveStep } from './driving.ts';

/** What `composeDevice` needs to switch a catalogue device the way Logitech's compiler does. */
export interface CataloguePower {
  /** The catalogue's power type: a toggle device's two actions are the same steps. */
  readonly type: 'discrete' | 'toggle';
  readonly powerOn: readonly ComposePowerStep[];
  readonly powerOff: readonly ComposePowerStep[];
  /** The command names behind `powerOn` and `powerOff`, step for step, for a report. */
  readonly onCommands: readonly string[];
  readonly offCommands: readonly string[];
  /**
   * Tenths of a second, the catalogue's own. Absent where the catalogue states none, 40 of the 240520
   * discrete and toggle devices, and then `composeDevice` uses its default, which is not measured
   * against any compile of such a device.
   */
  readonly powerOnDelay?: number;
  readonly interDeviceDelay: number;
  readonly interKeyDelay: number;
  /**
   * How many input states the catalogue resets after a power on, `onReset`. Logitech's compile writes
   * one list per state after the power on delay, on the six test devices that state any and compose,
   * thirteen lists over eight device instances. `composeDeviceInputs` composes them, section NNN, since
   * they write the input variables it creates; this only counts them.
   */
  readonly onResetStates: number;
}

/** A catalogue delay in milliseconds as the tenths a configuration states, refused unless whole. */
function tenths(ms: number, what: string): number {
  if (!Number.isInteger(ms) || ms < 0 || ms % 100 !== 0) {
    throw new ComposeError(`the catalogue's ${what} of ${ms} ms is not a whole number of tenths of a second`);
  }
  return ms / 100;
}

/**
 * One action's steps as composer steps. `keycodeOf` turns a command name into the catalogue's code for
 * it, from the device's own codeset; a name it does not know is refused, since the catalogue's power
 * action naming a command its codeset lacks is a catalogue defect nothing should paper over.
 */
function stepsOf(
  steps: readonly DriveStep[], which: string, keycodeOf: (name: string) => string | undefined,
): { steps: ComposePowerStep[]; commands: string[] } {
  if (steps.length === 0) throw new ComposeError(`the catalogue's power ${which} action has no steps`);
  const out: ComposePowerStep[] = [];
  const commands: string[] = [];
  for (const step of steps) {
    if (step.kind !== 'send') {
      const what = step.kind === 'wait' ? 'a wait' : step.kind === 'hold' ? 'a press held for an unstated time' : 'a state';
      throw new ComposeError(`the catalogue's power ${which} action holds ${what}, which no compile here shows composed`);
    }
    const stated = keycodeOf(step.command);
    if (stated === undefined) {
      throw new ComposeError(`the catalogue's power ${which} action sends ${step.command}, which the codeset lacks`);
    }
    out.push(step.holdMs === undefined ? { stated } : { stated, holdMs: step.holdMs });
    commands.push(step.command);
  }
  return { steps: out, commands };
}

/** How many states a power on resets, refusing a reset that sends or waits, which is not composed. */
function resetStates(steps: readonly DriveStep[]): number {
  for (const step of steps) {
    if (step.kind !== 'state') {
      throw new ComposeError(`the catalogue's power on is followed by ${step.kind === 'send' ? 'a send' : 'a ' + step.kind}, `
        + 'which is not composed');
    }
  }
  return steps.length;
}

/**
 * A catalogue device's power and delays as `composeDevice`'s options, or a `ComposeError` saying why
 * the catalogue's statement is one this cannot compose the way Logitech's compiler does.
 */
export function catalogueDevicePower(
  driving: DeviceDriving, keycodeOf: (name: string) => string | undefined,
): CataloguePower {
  const power = driving.power;
  if (power === undefined || (power.type !== 'discrete' && power.type !== 'toggle')) {
    throw new ComposeError(`the catalogue states the power as ${power?.type ?? 'absent'}, `
      + 'and no compile here shows how a device without a power action is composed');
  }
  let on: { steps: ComposePowerStep[]; commands: string[] };
  let off: { steps: ComposePowerStep[]; commands: string[] };
  if (power.type === 'discrete') {
    if (power.on === undefined || power.off === undefined) {
      throw new ComposeError(`a discrete device with no power ${power.on === undefined ? 'on' : 'off'} action`);
    }
    on = stepsOf(power.on, 'on', keycodeOf);
    off = stepsOf(power.off, 'off', keycodeOf);
  } else {
    if (power.toggle === undefined) throw new ComposeError('a toggle device with no toggle action');
    if (power.on !== undefined || power.off !== undefined) {
      throw new ComposeError('a toggle device that also states a power on or off action, '
        + 'whose meaning beside the toggle no compile here shows');
    }
    on = stepsOf(power.toggle, 'toggle', keycodeOf);
    off = on;
  }
  const timing = driving.timing;
  return {
    type: power.type,
    powerOn: on.steps,
    powerOff: off.steps,
    onCommands: on.commands,
    offCommands: off.commands,
    ...(timing.powerOnDelay === undefined ? {} : { powerOnDelay: tenths(timing.powerOnDelay, 'power on delay') }),
    interDeviceDelay: tenths(timing.interDeviceDelay, 'inter device delay'),
    interKeyDelay: tenths(timing.interKeyDelay, 'inter key delay'),
    onResetStates: resetStates(power.onReset ?? []),
  };
}
