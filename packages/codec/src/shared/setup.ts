/**
 * A recipe's devices and activities put onto a donor by the composers, plan 007's shared part: the steps
 * every family takes, whatever builds the rest. `assembleSetup` runs them on a Harmony 600, 650 or 700
 * before its generators, and `composeSetup` runs them on a family no assembly builds whole yet, the Harmony
 * One, `todo-compile-one.md` 1.2, followed since 3.2.2 by the builders that family has for parts the donor
 * carried, `Family.composedBuilders`. Cut out of `assemble.ts` unchanged but for asking the
 * family's choices where it read the four slot family's: the activity keys and the delays.
 */
import { type Recipe, type RecipeActivity, type RecipeDevice, type RecipeTarget, recipeTarget } from '../recipe/recipe.ts';
import { familyOf, sendsOf } from '../families/registry.ts';
import { saveEdits } from '../edit.ts';
import { coverage } from '../coverage.ts';
import { trailerAgrees } from '../growth.ts';
import { roundTrip } from '../emit.ts';
import { assertQueueFits } from '../queue.ts';
import type { BlendedSet } from '../blending.ts';
import { assertStateTableConsistent } from '../sections.ts';
import type { CommonChoices, ComposedDeviceNote, Family } from '../families/family.ts';
import { parse, type Container } from '../gspm.ts';
import { layOutContainer, takeApart } from '../frame.ts';
import { composedIntoBody, loosen, placePieces } from '../placer.ts';
import { activities, devices, deviceVariables, SEND_INFRARED, DEVICE_QUANTITY } from '../inventory.ts';
import {
  ComposeError, type ComposeRow, composeActivity, composeActivityMenuRow, keepDeviceOn,
  nextActivityValue, startsSwitchingOff,
} from '../compose.ts';
import {
  activityFromRoles, activityKeysFromRoles, activityScreenRows, deviceKeypadLists, type ActivityDevice,
} from '../activityroles.ts';
import {
  composeCatalogueDevices, composeDonorDeviceInfrared, composeDonorDeviceInputs, type ComposedCatalogueDevice,
  type ComposedDonorInfrared,
} from '../composecatalogue.ts';
import { inputPlan, inputTarget, type ComposedInputs } from '../inputs.ts';
import { catalogueDriving } from '../driving.ts';
import { catalogueDevice } from '../catalogue.ts';
import { activityPauseGroups, composeSequence } from '../sequence.ts';

/**
 * A donor device whose infrared records were composed from the catalogue, `SetupParts.donorInfraredFromCatalogue`:
 * the setup's name for it and what `composeDonorDeviceInfrared` reports, each donor record and the composed one
 * its sends name now, with how the two differ.
 */
export type DonorInfrared = { readonly name: string } & Omit<ComposedDonorInfrared, 'bytes'>;

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
  /**
   * True gives every device the donor holds the infrared records the catalogue composes for it, in place of the
   * donor's own, `composeDonorDeviceInfrared`, `todo-compile-one.md` 8.1.3: what `composeSetup` asks, whose
   * donor is Logitech's compile and whose result is to carry none of its infrared. The assembly does not ask it,
   * since its pinned results are composed onto Logitech's compiles of the same devices as they are.
   */
  readonly donorInfraredFromCatalogue?: boolean;
}

/**
 * Steps 1 to 4 of the assembly, the setup's devices and activities put onto the donor by the composers:
 * the donor checked to hold nothing the setup does not, the devices it lacks composed from the catalogue,
 * keep on applied to its activities, and the activities it lacks composed. Shared by `assembleSetup` and
 * `composeSetup`, which differ in what runs after: the assembly builds every part a generator exists for,
 * and `composeSetup` keeps the donor's but for the parts its family's builders make, `Family.composedBuilders`,
 * which it tells of the devices composed, `devicesComposed`, since `todo-compile-one.md` 3.2.2.4.
 */
export function composeSetupParts(
  donor: Container, setup: Recipe, target: RecipeTarget, options: AssembleOptions, parts: SetupParts,
  note: (step: string, detail?: string) => void,
): {
  container: Container; composed: { devices: string[]; activities: string[] }; keptOn: string[];
  devicesComposed: ComposedDeviceNote[]; donorInfrared: DonorInfrared[];
} {
  let c = donor;
  // 0. Favourite channels are a recipe field Logitech's service is given and no composer writes, so a
  //    recipe stating some is refused for every family alike rather than built without them, which would
  //    be a configuration missing what its recipe asked for and saying nothing about it.
  if ((setup.favourites?.length ?? 0) > 0) throw new AssemblyError('no composer writes a favourite channel, and the recipe states some');
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

  // 1b. The donor's devices given the catalogue's infrared records, where the caller asks, `todo-compile-one.md`
  //     8.1.3: before anything below reads a record, so the donor inputs' matching at 2b finds the composed ones.
  const donorInfrared: DonorInfrared[] = [];
  if (parts.donorInfraredFromCatalogue === true) {
    for (const wanted of setup.devices) {
      const label = labelOf(wanted.name);
      if (label === undefined) continue;
      if (options.archive === undefined) {
        throw new AssemblyError(`the donor holds ${wanted.name}, and composing its infrared needs the catalogue's archive`);
      }
      const [manufacturer, model] = wanted.device.split('/');
      let infrared: ComposedDonorInfrared;
      try {
        infrared = composeDonorDeviceInfrared(c, options.archive, { label, manufacturer: manufacturer ?? '', model: model ?? '' });
      } catch (error) {
        if (error instanceof ComposeError) throw new AssemblyError(`composing ${wanted.name}'s infrared: ${error.message}`);
        throw error;
      }
      c = parse(infrared.bytes);
      const { bytes: _, ...told } = infrared;
      donorInfrared.push({ name: wanted.name, ...told });
    }
    if (donorInfrared.length > 0) note('donor infrared composed', donorInfrared.map((one) => one.name).join(', '));
  }

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
  //     Only where the family matches a donor's sends, `SendShape.donorSendList`: the send and its quantity
  //     alone, the Harmony One's, which is what `composeDonorDeviceInputs` matches; the Harmony 600 family's
  //     donors are refused at step 4 as before.
  const donorInputs = new Map<string, ComposedInputs>();
  for (const wanted of setup.devices) {
    if (sendsOf(c).donorSendList === undefined || composedDevices.has(wanted.name)) continue;
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
  // The devices composed, as a builder on the composed path is told of them: each one's label read back off the
  // finished configuration, and the power type the catalogue stated, which the configuration does not say.
  const devicesComposed = composed.devices.map((name): ComposedDeviceNote => {
    const label = labelOf(name);
    if (label === undefined) throw new AssemblyError(`the composed device ${name} is not in the container`);
    const power = composedDevices.get(name)?.power?.type;
    return { name, label, ...(power === undefined ? {} : { power }) };
  });
  return { container: c, composed, keptOn, devicesComposed, donorInfrared };
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
    // The key copy, without the click: the activity screen's pad clicks itself on the Harmony One, and the two copies
    // are the same body on the 600 family, section 404.
    const sequence = composeSequence(c, { steps, pauseGroups, interKeyDelays, copies: ['key'] });
    c = parse(sequence.bytes);
    rows.push({ label: item.sequence, list: sequence.lists[0] as number });
    sequenced = true;
  }

  const screen = parts.family.composeActivityScreen(c, nextActivityValue(c), activity.name, rows,
    { choices: parts.choices, type: activity.type });
  const key = parts.choices.activityKeys?.[activity.type];
  // The keys the screens need bound, which take the place of a role's on the same key.
  const screenKeys = screen.keys ?? [];
  const allKeys = [...keys.filter((one) => !screenKeys.some((other) => other.scan === one.scan)), ...screenKeys];
  const built = composeActivity(parse(screen.bytes), {
    label: activity.name, targets, keys: allKeys,
    screen: {
      startupMode: screen.startupMode, workingMode: screen.mode, activity: screen.activity, activeList: screen.activeList,
      startVariable: screen.startVariable, flagVariable: screen.flagVariable, set: screen.set,
    },
    ...(key === undefined ? {} : { activityKey: key }),
  });
  const rowed = parse(composeActivityMenuRow(parse(built.bytes), built.label, built.set, { type: activity.type }).bytes);
  const after = parse(parts.family.activityDeviceList(rowed, built.activity));
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
 * A device's catalogue type by the name a configuration states it under: the recipe's name for a device the
 * composers add, and the catalogue's own manufacturer and model, joined by `_`, for one the donor already
 * holds, the way Logitech names a device it compiled. Unknown without the archive.
 */
function catalogueTypes(setup: Recipe, archive: string | undefined): (name: string | undefined) => number | undefined {
  const types = new Map<string, number>();
  if (archive !== undefined) {
    for (const device of setup.devices) {
      const [slug, file] = device.device.split('/');
      if (slug === undefined || file === undefined) continue;
      const type = catalogueDevice(archive, slug, file).deviceType;
      types.set(device.name, type);
      types.set(`${slug}_${file}`, type);
    }
  }
  return (name) => (name === undefined ? undefined : types.get(name));
}

export interface ComposedSetup {
  bytes: Uint8Array;
  container: Container;
  steps: AssemblyStep[];
  /** The devices `keepDeviceOn` was applied to, by the setup's name. */
  keptOn: string[];
  /** The setup's devices and activities the composers added, by the setup's name, in the order added. */
  composed: { devices: string[]; activities: string[] };
  /**
   * The copies of a font set the family's look blended, empty where it blends nothing: what a reader of the result
   * needs to point a blended select back at its set, `unblendedSelects`, as the Harmony One's attribution does.
   */
  blended: readonly BlendedSet[];
  /**
   * The donor's devices given the catalogue's infrared records, `todo-compile-one.md` 8.1.3, in the setup's order,
   * each donor record with the composed record that took its place and how the two differ.
   */
  donorInfrared: readonly DonorInfrared[];
}

/**
 * The setup's devices and activities put onto the donor by the composers, and the parts the family has builders
 * for put in place of the donor's, `Family.composedBuilders`; every other byte the donor's: the first file of
 * `todo-compile-one.md`, a Logitech compile with the test setup composed onto it, for a family no assembly builds
 * whole yet, with its parts built one at a time since 3.2.2. The family is the recipe's model's and its choices
 * are the family's own; a recipe stating choices is refused, since what a choice changes is the generators' work.
 */
export function composeSetup(setup: Recipe, options: AssembleOptions): ComposedSetup {
  const target = recipeTarget(setup);
  // The skins composing alone has been run on are the family's, `Family.composedSkins`; a family the assembly's
  // generators build for goes through `assembleSetup`.
  if (target.family.composedSkins?.has(target.skin) !== true) {
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
  // The family's look, where it has one: the donor lettered first, so every name a composer spells finds its
  // letters, and the rest over the composed file below. A donor of ours, the family's empty configuration, is in our
  // letters already and draws our pictures, so it is not lettered and no step turning Logitech's pictures into ours
  // runs on it, `todo-compile-one.md` 8.1.2; its faces are its stated table's, which the look's blending letters.
  const look = target.family.composedLook;
  const ours = look?.donorOfOurs?.(c, target.family.choices);
  if (ours !== undefined) note('a donor of ours', `${ours.length} sets of our letters`);
  const lettered = ours !== undefined ? undefined : look?.letterDonor(c, target.family.choices);
  if (lettered !== undefined) {
    c = parse(lettered.bytes);
    note('lettered');
  }
  const faces = ours ?? lettered?.faces;
  // Every device the donor holds is given the catalogue's infrared records, `todo-compile-one.md` 8.1.3, so the
  // result carries none of Logitech's: the five the donor lacks are composed from the catalogue anyway.
  const parts = composeSetupParts(c, setup, target, options,
    { family: target.family, choices: target.family.choices, donorInfraredFromCatalogue: true }, note);
  c = parts.container;
  // The parts the family's builders make, each from a description of the configuration composed so far, in place
  // of the donor's, `todo-compile-one.md` 3.2.2: before the look, whose blending gives one role of a screen several
  // fonts, which a builder's description refuses. A builder's refusal is the composition's; nothing falls back to
  // the donor's part.
  const builders = target.family.composedBuilders;
  if (builders !== undefined) {
    const built = builders(c, parts.devicesComposed, target.family.choices, { donorOfOurs: ours !== undefined });
    c = built.container;
    note('built', built.built.join(', '));
  }
  let blended: readonly BlendedSet[] = [];
  if (look !== undefined && faces !== undefined) {
    const looked = look.look(c, faces, target.family.choices, catalogueTypes(setup, options.archive));
    c = looked.container;
    blended = looked.blended;
    note('look');
  }
  // Placement, `todo-compile-one.md` 6.2: what is parked in front of a table and the picture bank put where the placer
  // puts them rather than where the donor, a composer or the look left them, as the assembly places its result,
  // after the look so that the sets its blending adds and the pictures it draws are placed by the same rule. The
  // placer is the same for every family, section 426. A composer's parked pieces of a kind the placer has no rule
  // for, a composed device's infrared records and an activity's key map, go into the body first. The order of the
  // font sets is the font table's, so a blended set's index, which `blended` names, is unchanged.
  if (options.place !== false) {
    const into = composedIntoBody(takeApart(c));
    c = parse(layOutContainer(placePieces(loosen(into.layout)).layout).bytes);
    note('placed', into.moved === 0 ? undefined : `${into.moved} composed pieces moved into the body first`);
  }
  if (options.builtAt !== undefined) {
    c = parse(saveEdits(c, [], options.builtAt).bytes);
    note('stamped', options.builtAt);
  }
  checkComposed(c);
  return { bytes: c.blob, container: c, steps, keptOn: parts.keptOn, composed: parts.composed, blended, donorInfrared: parts.donorInfrared };
}
