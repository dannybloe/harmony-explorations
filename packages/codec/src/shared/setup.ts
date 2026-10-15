/**
 * A recipe's devices and activities put onto a donor by the composers, plan 007's shared part: the steps
 * every family takes, whatever builds the rest. `assembleSetup` runs them on a Harmony 600, 650 or 700
 * before its generators, and `composeSetup` runs them alone on a family the generators do not build for
 * yet, the Harmony One, `todo-compile-one.md` 1.2. Cut out of `assemble.ts` unchanged but for asking the
 * family's choices where it read the four slot family's: the activity keys and the delays.
 */
import { type Recipe, type RecipeActivity, type RecipeDevice, type RecipeTarget, recipeTarget } from '../recipe/recipe.ts';
import { familyOf, traitsOf } from '../families/registry.ts';
import { saveEdits } from '../edit.ts';
import { coverage } from '../coverage.ts';
import { trailerAgrees } from '../growth.ts';
import { roundTrip } from '../emit.ts';
import { assertQueueFits } from '../queue.ts';
import { assertStateTableConsistent } from '../sections.ts';
import type { CommonChoices, Family } from '../families/family.ts';
import { parse, type Container } from '../gspm.ts';
import { activities, devices, deviceVariables, SEND_INFRARED, DEVICE_QUANTITY } from '../inventory.ts';
import {
  ComposeError, type ComposeRow, composeActivity, composeActivityDeviceList, composeActivityMenuRow, keepDeviceOn,
  nextActivityValue, startsSwitchingOff,
} from '../compose.ts';
import {
  activityFromRoles, activityKeysFromRoles, activityScreenRows, deviceKeypadLists, type ActivityDevice,
} from '../activityroles.ts';
import { composeCatalogueDevices, composeDonorDeviceInputs, type ComposedCatalogueDevice } from '../composecatalogue.ts';
import { inputPlan, inputTarget, type ComposedInputs } from '../inputs.ts';
import { catalogueDriving } from '../driving.ts';
import { activityPauseGroups, composeSequence } from '../sequence.ts';

/** A refusal, named so a caller can tell a setup the donor cannot serve from a bug. */
export class AssemblyError extends Error {}

export interface AssembleOptions {
  /** The container every part no generator builds is taken from: a Logitech compile, or a library. */
  readonly donor: Uint8Array;
  /** The build time to stamp, `YYYY-MM-DDTHH:MM:SS`; absent keeps the donor's. A write stamps again. */
  readonly builtAt?: string;
  /** False keeps the donor's placement of parked pieces and pictures instead of `placePieces`'. */
  readonly place?: boolean;
  /**
   * The checkout of the device catalogue's archive, decision 15, which composing a device needs, and
   * naming a donor device's input does, since an input's value is its place in the catalogue's list.
   */
  readonly archive?: string;
}

/** One step of the assembly, for a caller that reports. */
export interface AssemblyStep {
  step: string;
  /** The container's length after the step. */
  bytes: number;
  detail?: string;
}

/** A device's name as base slot 0 spells it, with `_` for a space, read back as the setup writes it. */
const spoken = (name: string | undefined): string => (name ?? '').replaceAll('_', ' ');

/**
 * The family a setup is composed for and its choices as that family's composers take them: the working
 * screen an activity is given is the family's, the activity key a type of activity takes is in its choices
 * where its remotes have activity keys, and so are the delays a composed device starts with where its
 * devices carry delay variables. Nothing here asks which remote it is.
 */
export interface SetupParts {
  readonly family: Family<any>;
  readonly choices: CommonChoices;
}

/**
 * Steps 1 to 4 of the assembly, the setup's devices and activities put onto the donor by the composers:
 * the donor checked to hold nothing the setup does not, the devices it lacks composed from the catalogue,
 * keep on applied to its activities, and the activities it lacks composed. Shared by `assembleSetup` and
 * `composeSetup`, which differ in what runs after: the assembly builds every part a generator exists for,
 * and `composeSetup` keeps the donor's.
 */
export function composeSetupParts(
  donor: Container, setup: Recipe, target: RecipeTarget, options: AssembleOptions, parts: SetupParts,
  note: (step: string, detail?: string) => void,
): { container: Container; composed: { devices: string[]; activities: string[] }; keptOn: string[] } {
  let c = donor;
  // 1. The donor holds nothing the setup does not, since no composer removes a device or an activity.
  //    A donor device is the setup's by the setup's name, or by `<manufacturer>_<model>`, the name the
  //    service's compiles of catalogue devices for this project carry; other owners' configurations name
  //    a device by manufacturer and type instead. It keeps the donor's label either way.
  const wantedDevices = new Set(setup.devices.map((one) => one.name));
  if (wantedDevices.size !== setup.devices.length) throw new AssemblyError('the setup names one device twice');
  const setupDeviceOf = (label: string | undefined): RecipeDevice | undefined =>
    setup.devices.find((one) => one.name === spoken(label) || one.device.replace('/', '_') === label);
  for (const one of devices(c)) {
    if (setupDeviceOf(one.name) === undefined) {
      throw new AssemblyError(`the donor holds a device called ${spoken(one.name)} that the setup does not, and no composer removes one`);
    }
  }
  const names = setup.activities.map((one) => one.name);
  if (new Set(names).size !== names.length) throw new AssemblyError('the setup names one activity twice');
  for (const name of activities(c).map((one) => spoken(one.name))) {
    if (!names.includes(name)) {
      throw new AssemblyError(`the donor holds an activity called ${name} that the setup does not, and no composer removes one`);
    }
  }
  /** The donor's or a composed device's label for a setup device, once it is in the container. */
  const labelOf = (name: string): string | undefined =>
    devices(c).find((one) => setupDeviceOf(one.name)?.name === name)?.name;

  // 2. The setup's devices the donor lacks, from the catalogue, in the setup's order, section 331.
  const composed = { devices: [] as string[], activities: [] as string[] };
  const missingDevices = setup.devices.filter((one) => labelOf(one.name) === undefined);
  const composedDevices = new Map<string, ComposedCatalogueDevice>();
  if (missingDevices.length > 0) {
    if (options.archive === undefined) {
      throw new AssemblyError(`the donor lacks ${missingDevices.map((one) => one.name).join(', ')}, and composing a device needs the catalogue's archive`);
    }
    const requests = missingDevices.map((one) => {
      const [manufacturer, model] = one.device.split('/');
      if (manufacturer === undefined || model === undefined) throw new AssemblyError(`${one.name}'s device is not <manufacturer>/<model>`);
      return { manufacturer, model, label: one.name, full: true, inputs: true };
    });
    let result;
    try {
      result = composeCatalogueDevices(c, options.archive, requests, { maxDevices: target.model.maxDevices, ...(parts.choices.delays === undefined ? {} : { delays: parts.choices.delays }) });
    } catch (error) {
      if (error instanceof ComposeError) throw new AssemblyError(`composing ${missingDevices.map((one) => one.name).join(', ')}: ${error.message}`);
      throw error;
    }
    c = parse(result.bytes);
    result.devices.forEach((one, k) => composedDevices.set(missingDevices[k]!.name, one));
    composed.devices.push(...missingDevices.map((one) => one.name));
    note('devices composed', composed.devices.join(', '));
  }

  // 2b. The inputs of a donor device an activity puts on one, where the donor has no input variable for
  //     it: a Logitech compile with no activities writes none, and the Harmony One's donor is one.
  //     Only where a send is the send and its quantity alone, the Harmony One's, which is what
  //     `composeDonorDeviceInputs` matches; the Harmony 600 family's donors are refused at step 4 as before.
  const donorInputs = new Map<string, ComposedInputs>();
  for (const wanted of setup.devices) {
    if (traitsOf(c).sendPrelude || composedDevices.has(wanted.name)) continue;
    if (!setup.activities.some((a) => a.devices.some((d) => d.device === wanted.name && d.input !== undefined))) continue;
    const label = labelOf(wanted.name);
    if (label === undefined) continue;
    if (deviceVariables(c).some((one) => one.device === label && one.property === 'Input')) continue;
    if (options.archive === undefined) {
      throw new AssemblyError(`an activity puts ${wanted.name} on an input, and naming a donor device's input needs the catalogue's archive`);
    }
    const [manufacturer, model] = wanted.device.split('/');
    let inputs: ComposedInputs | undefined;
    try {
      inputs = composeDonorDeviceInputs(c, options.archive, { label, manufacturer: manufacturer ?? '', model: model ?? '' });
    } catch (error) {
      if (error instanceof ComposeError) throw new AssemblyError(`composing ${wanted.name}'s inputs: ${error.message}`);
      throw error;
    }
    if (inputs === undefined) continue;
    c = parse(inputs.bytes);
    donorInputs.set(wanted.name, inputs);
  }
  if (donorInputs.size > 0) note('donor inputs composed', [...donorInputs.keys()].join(', '));

  // 3. Keep on between activities, section 340, on the activities already there. A device with no
  //    power variable is always on. The activities composed below leave a kept on device on themselves.
  const keptOn: string[] = [];
  const present = activities(c).map((one) => spoken(one.name));
  /** The power variable of a setup device, by its label in the container. */
  const powerOf = (name: string): number | undefined => {
    const label = labelOf(name);
    return deviceVariables(c).find((one) => one.device === label && one.property === 'Power')?.index;
  };
  for (const wanted of setup.devices) {
    const power = powerOf(wanted.name);
    if (power === undefined || present.length === 0) continue;
    const off = new Set([...startsSwitchingOff(c, power).values()].flatMap((one) => [...one].map(spoken)));
    const unused = setup.activities.filter((one) => present.includes(one.name)
      && !one.devices.some((d) => d.device === wanted.name)).map((one) => one.name);
    if (wanted.poweredOnBetweenActivities === true) {
      if (off.size > 0) {
        c = parse(keepDeviceOn(c, power).bytes);
        keptOn.push(wanted.name);
      }
    } else if (unused.some((name) => !off.has(name))) {
      throw new AssemblyError(`the donor keeps ${wanted.name} on in ${unused.filter((name) => !off.has(name)).join(', ')}, `
        + 'which the setup does not ask for, and no composer puts a switch off back');
    }
  }
  if (keptOn.length > 0) note('kept on', keptOn.join(', '));

  // 4. The setup's activities the donor lacks, in the setup's order: the start and the keypad from the
  //    roles, section 323, the inputs by their names, the working screen from the recipe, its
  //    sequences first, the menu row and the activity's own device list, `compose-activity.ts`'s route.
  for (const activity of setup.activities) {
    if (activities(c).some((one) => spoken(one.name) === activity.name)) continue;
    try {
      c = composeSetupActivity(c, setup, activity, options, parts, labelOf, powerOf, composedDevices, donorInputs);
    } catch (error) {
      if (error instanceof ComposeError || error instanceof AssemblyError) {
        throw new AssemblyError(`composing ${activity.name}: ${error.message}`);
      }
      throw error;
    }
    composed.activities.push(activity.name);
    note('activity composed', activity.name);
  }
  return { container: c, composed, keptOn };
}

/** The group of the device a setup names, through its label in the container. */
function groupOfDevice(c: Container, label: string | undefined, name: string): number {
  const group = label === undefined ? undefined : devices(c).find((one) => one.name === label)?.group;
  if (group === undefined) throw new AssemblyError(`the setup's device ${name} is not in the container`);
  return group;
}

/**
 * One activity of the setup composed onto `c`, the route `compose-activity.ts` takes: the start's writes
 * and the keypad from the roles, `activityFromRoles`, with each input written by its place in the
 * catalogue's list of the device's inputs, which is how the composer numbers a composed device's and how
 * Logitech's compiler numbers its own, section 321; the devices the setup keeps on between activities get
 * no write of 0, section 340; the working screen from the recipe, a sequence composed first as
 * `composeSequence` composes one; then the menu row, the activity's own device list, and its activity key
 * by its type, section 314.
 */
function composeSetupActivity(
  c: Container, setup: Recipe, activity: RecipeActivity, options: AssembleOptions, parts: SetupParts,
  labelOf: (name: string) => string | undefined, powerOf: (name: string) => number | undefined,
  composedDevices: ReadonlyMap<string, ComposedCatalogueDevice>, donorInputs: ReadonlyMap<string, ComposedInputs>,
): Container {
  // A family whose remotes have activity keys knows which a type takes; the Harmony One has none.
  if (parts.choices.activityKeys !== undefined && !(activity.type in parts.choices.activityKeys)) {
    throw new AssemblyError(`${activity.name}'s type ${activity.type} is not one this assembly knows`);
  }
  const listed: ActivityDevice[] = activity.devices.map((one) => {
    const label = labelOf(one.device);
    const group = groupOfDevice(c, label, one.device);
    if (one.input === undefined) return { group, roles: one.roles };
    const setupDevice = setup.devices.find((each) => each.name === one.device);
    const own = composedDevices.get(one.device)?.inputs ?? donorInputs.get(one.device);
    let names: readonly string[] | undefined;
    if (own !== undefined) {
      names = own.input === undefined ? undefined : [...own.input.values.keys()];
    } else {
      if (options.archive === undefined) {
        throw new AssemblyError(`${activity.name} puts ${one.device} on ${one.input}, and naming a donor device's input needs the catalogue's archive`);
      }
      const [slug, file] = (setupDevice?.device ?? '').split('/');
      names = inputPlan(catalogueDriving(options.archive, slug ?? '', file ?? '')).input?.values;
    }
    const variable = deviceVariables(c).find((each) => each.device === label && each.property === 'Input')?.index;
    // A device with one input that does not step has no input variable, and Logitech's compiler writes
    // none for it, section 321: the input named is the only one there is.
    if (names === undefined && variable === undefined) return { group, roles: one.roles };
    // Logitech's compile of the two device donor gives neither device an input variable, where the
    // catalogue lists ten inputs for its television, so that is said apart from an input name the
    // catalogue does not know.
    if (variable === undefined) throw new AssemblyError(`${one.device} has no input variable here to put on ${one.input}`);
    const value = names?.indexOf(one.input) ?? -1;
    if (value < 0) throw new AssemblyError(`${one.device} has no input called ${JSON.stringify(one.input)}`);
    if (own !== undefined) {
      const target = inputTarget(own, one.input);
      if (target.value !== value) throw new AssemblyError(`${one.device}'s ${one.input} is ${target.value} to its composer and ${value} by its place`);
    }
    return { group, roles: one.roles, input: { variable, value } };
  });
  const from = activityFromRoles(c, listed);
  const keep = new Set<number>();
  for (const one of setup.devices) {
    const power = one.poweredOnBetweenActivities === true ? powerOf(one.name) : undefined;
    if (power !== undefined) keep.add(power);
  }
  const targets = from.targets.filter((one) => !(one.value === 0 && keep.has(one.variable)));
  const keys = activityKeysFromRoles(c, from.roles);

  // The working screen, in the order given; a sequence's lists are appended, so the rows read before
  // it keep their numbers.
  const powered = (group: number): boolean => {
    const label = devices(c).find((each) => each.group === group)?.name;
    return deviceVariables(c).some((each) => each.device === label && each.property === 'Power');
  };
  const pauseGroups = listed.filter((one) => powered(one.group)).map((one) => one.group);
  const rows: ComposeRow[] = [];
  let sequenced = false;
  for (const item of activity.screen ?? []) {
    if ('device' in item) {
      const group = groupOfDevice(c, labelOf(item.device), item.device);
      rows.push(...activityScreenRows(c, [{ group, label: item.command }]));
      continue;
    }
    const lists = c.actionLists() ?? [];
    const interKeyDelays: Record<number, number> = {};
    const steps = item.steps.map((step) => {
      if ('pause' in step) return { pause: step.pause };
      const group = groupOfDevice(c, labelOf(step.device), step.device);
      const list = deviceKeypadLists(c, group).get(step.scan);
      const body = list === undefined ? undefined : lists[list];
      const send = body?.find((one) => one.opcode === SEND_INFRARED);
      const quantity = body?.find((one) => one.opcode === DEVICE_QUANTITY);
      if (send === undefined || quantity === undefined) {
        throw new AssemblyError(`${item.sequence}: ${step.device}'s key ${step.scan} sends no code to put in a sequence`);
      }
      interKeyDelays[group] = quantity.operand & 0xff;
      return { send: { group, code: send.operand & 0xff } };
    });
    const sequence = composeSequence(c, { steps, pauseGroups, interKeyDelays, copies: ['screen'] });
    c = parse(sequence.bytes);
    rows.push({ label: item.sequence, list: sequence.lists[0] as number });
    sequenced = true;
  }

  const screen = parts.family.composeActivityScreen(c, nextActivityValue(c), activity.name, rows, { choices: parts.choices });
  const key = parts.choices.activityKeys?.[activity.type];
  const built = composeActivity(parse(screen.bytes), {
    label: activity.name, targets, keys,
    screen: {
      startupMode: screen.startupMode, workingMode: screen.mode, activity: screen.activity,
      startVariable: screen.startVariable, flagVariable: screen.flagVariable, set: screen.set,
    },
    ...(key === undefined ? {} : { activityKey: key }),
  });
  const rowed = parse(composeActivityMenuRow(parse(built.bytes), built.label, built.set).bytes);
  const after = parse(composeActivityDeviceList(rowed, built.activity).bytes);
  // A sequence's pauses name the activity's devices as its start switches them on, which is read back.
  if (sequenced) {
    const started = activityPauseGroups(after, built.set);
    if (started.join() !== pauseGroups.join()) {
      throw new AssemblyError(`${activity.name}'s sequence pauses name ${pauseGroups.join(', ')} where its start switches on ${started.join(', ')}`);
    }
  }
  return after;
}



/**
 * The checks every configuration a composer touched has to pass, whatever family it is for: the container's
 * own and both checksums' agreement, every byte claimed once, the emitter's round trip, and the queue and
 * state table rails of the `writing-a-config` skill. `checkAssembled` adds each generator's calibration.
 */
export function checkComposed(c: Container): void {
  if (!c.allChecksPass) {
    throw new AssemblyError(`the result fails ${Object.entries(c.checks).filter(([, ok]) => !ok).map(([name]) => name).join(', ')}`);
  }
  if (!trailerAgrees(c)) throw new AssemblyError('the result does not state its own trailer checksum');
  const report = coverage(c);
  if (report.accounted !== report.total) throw new AssemblyError(`${report.total - report.accounted} bytes of the result are claimed by nothing`);
  if (report.overlaps.length > 0) throw new AssemblyError(`${report.overlaps.length} byte ranges of the result are claimed twice`);
  if (!roundTrip(c).equal) throw new AssemblyError('the emitter does not reproduce the result');
  assertQueueFits(c);
  assertStateTableConsistent(c);
}

/**
 * The skins `composeSetup` has been run on: the Harmony One, skin 54, which the spare Harmony One reports,
 * `todo-compile-one.md` 1.2. A family the assembly's generators build for goes through `assembleSetup`.
 */
export const COMPOSE_SETUP_SKINS: ReadonlySet<number> = new Set([54]);

export interface ComposedSetup {
  bytes: Uint8Array;
  container: Container;
  steps: AssemblyStep[];
  /** The devices `keepDeviceOn` was applied to, by the setup's name. */
  keptOn: string[];
  /** The setup's devices and activities the composers added, by the setup's name, in the order added. */
  composed: { devices: string[]; activities: string[] };
}

/**
 * The setup's devices and activities put onto the donor by the composers alone, every other byte the
 * donor's: the first file of `todo-compile-one.md`, a Logitech compile with the test setup composed onto
 * it, for a family no generator builds for yet. The family is the recipe's model's and its choices are the
 * family's own; a recipe stating choices is refused, since what a choice changes is the generators' work.
 */
export function composeSetup(setup: Recipe, options: AssembleOptions): ComposedSetup {
  const target = recipeTarget(setup);
  if (!COMPOSE_SETUP_SKINS.has(target.skin)) {
    throw new AssemblyError(`composing a setup alone is measured on the Harmony One, skin 54, and the recipe is for the ${setup.model.name}, skin ${target.skin}`);
  }
  if (setup.choices !== undefined) throw new AssemblyError('the composers alone take the family\'s own choices, and the recipe states some');
  let c = parse(options.donor);
  if (familyOf(c) !== target.family) throw new AssemblyError(`the donor is arch ${c.architecture}, which is not ${target.family.name}`);
  const skin = (c.versionWord ?? -1) & 0xff;
  if (skin !== target.skin) throw new AssemblyError(`the recipe is for skin ${target.skin}, and the donor is skin ${skin}`);
  const steps: AssemblyStep[] = [];
  const note = (step: string, detail?: string): void => {
    steps.push({ step, bytes: c.blob.length, ...(detail === undefined ? {} : { detail }) });
  };
  note('donor');
  const parts = composeSetupParts(c, setup, target, options, { family: target.family, choices: target.family.choices }, note);
  c = parts.container;
  if (options.builtAt !== undefined) {
    c = parse(saveEdits(c, [], options.builtAt).bytes);
    note('stamped', options.builtAt);
  }
  checkComposed(c);
  return { bytes: c.blob, container: c, steps, keptOn: parts.keptOn, composed: parts.composed };
}
