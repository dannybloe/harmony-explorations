/**
 * Catalogue devices composed into a configuration, one or several in one run, todo-compile-650 2.7.
 *
 * **What this is**: the whole of `compose-device.ts`'s composition lifted out of the command line, so
 * that one device and a list of them go through one derivation rather than a bin and a copy of it. A
 * catalogue device is looked up in the public infrared archive, its commands, its power as the
 * catalogue states it (section 320), its inputs where asked (section 321) and its device mode (section
 * 285, or the compiler's whole layout, section 325) are composed with `composeDevice`,
 * `composeDeviceInputs`, `joinPowerOff` and `composeDeviceScreen`, in the order the bin used. Nothing is
 * stamped: a save stamps once, at the end, and a caller that composes several devices stamps the
 * result and not every step.
 *
 * **Several devices are composed one after another on the reparsed result of the one before**, which is
 * what chaining the bin did, and that is deliberate rather than a shortcut: every composer here reads
 * what it needs off the configuration it is given, so a device composed second sees the first exactly
 * as a later run of the bin would. A test holds the two equal byte for byte. What composing several at
 * once has to get right on top of that, and what Logitech's compiles of the same devices show, is
 * section 331:
 *
 * * **The identifiers** climb by one per device, `nextDeviceIdentifier` reading the one before's delay
 *   variables, and that is the order Logitech's numbering gives devices added together: on the six
 *   pairs of a test account's compile with and without the devices added, every added device is
 *   numbered above every device both hold, and the added ones in the order of their device list rows.
 * * **The device list** takes each device at its end, in the order composed, which is where Logitech's
 *   compiles put the added devices on all six pairs: after the account's own, in identifier order.
 * * **The variable numbers a device reports go stale** when a later device is composed: the power and
 *   input variables sit below `narrow` and stay, but the delay variables sit above it, and every later
 *   one byte insertion moves them up by one. So the result states every device's variables as numbered
 *   in the final configuration, read back by name.
 * * **The device count is bounded by the model**, eight on a Harmony 650, which is Logitech's own figure
 *   for an account, `maxDevices`. Refused before anything is composed, since a ninth device's composition
 *   would succeed and leave a configuration no Logitech account could have produced.
 *
 * **Two of its sections are modules of their own since `todo.md` 7.3.8**, each re-exported here whole so every
 * name keeps its path: `donorinfrared.ts`, a donor device's infrared composed from the catalogue, and
 * `cataloguecodes.ts`, a catalogue command's code as the blocks a press sends.
 */
import type { CatalogueCommand, CatalogueDevice, CatalogueSource } from '../catalogue/catalogue.ts';
import type { DeviceDriving } from '../catalogue/driving.ts';
import { type Container, parse } from '../container/gspm.ts';
import type { DelayDefaults } from '../families/family.ts';
import { choicesOf, familyOf, sendsOf } from '../families/registry.ts';
import { irBlockWords, irGroups, irHeaderPointers } from '../infrared/ir.ts';
import { devices, deviceVariables, stateVariables } from '../inventory/inventory.ts';
import { nameOfLabel } from '../shared/core.ts';
import type { ComposeDevice } from '../shared/devices.ts';
import {
  archiveProtocolsByName, catalogueCode, catalogueCommandBlocks, cataloguePressRepeats, catalogueToggledCode,
} from './cataloguecodes.ts';
import {
  type ComposeCommand, type ComposedDevice, composeDevice, composeDeviceScreen, type ComposedScreen, ComposeError,
  type ComposePowerStep, type JoinedPowerOff, joinPowerOff,
} from './compose.ts';
import { deviceModeLayout } from './devicemode.ts';
import { catalogueDevicePower, type CataloguePower } from './devicepower.ts';
import { commandIndex, composeDeviceInputs, type ComposedInputs, inputPlan } from './inputs.ts';
export * from './donorinfrared.ts';
export * from './cataloguecodes.ts';

/** One catalogue device to compose, with the options `compose-device.ts` takes as flags. */
export interface CatalogueDeviceRequest {
  /** The catalogue folder and file, `devices/<manufacturer>/<model>.json` in the archive. */
  readonly manufacturer: string;
  readonly model: string;
  /** What the configuration calls the device: its name tree stem and its device list row. */
  readonly label: string;
  /** Under `full`, the name its device mode pages carry where `label` would be too long; else `label`. */
  readonly title?: string;
  /** Every command the catalogue holds whose code composes, laid out as the compiler lays it, section 325. */
  readonly full?: boolean;
  /** Otherwise the commands asked for, in page order, and what each pad says, the names by default. */
  readonly commands?: readonly string[];
  readonly labels?: readonly string[];
  /** Which existing device list row's icon, and which device mode's key map shape, the device copies. */
  readonly iconLike?: string;
  readonly keysLike?: string;
  /** False sends the first command both ways rather than the catalogue's power steps. Default true. */
  readonly powerSteps?: boolean;
  /** False leaves the device out of the lists that switch devices off, section 280. Default true. */
  readonly powerOff?: boolean;
  /** Compose the catalogue's inputs and states too, section 321, the 600 family and the Harmony One. Default false. */
  readonly inputs?: boolean;
  /**
   * The two delays in tenths, which win over the catalogue's: both on the 600 family, the power on delay
   * alone on the Harmony One, which carries no inter device delay of a device's own, `todo-compile-one.md` 1.2.
   */
  readonly powerOnDelay?: number;
  readonly interDeviceDelay?: number;
}

/** One device as composed, and what the composition chose, for a caller to report. */
export interface ComposedCatalogueDevice {
  /** The configuration after this device, not stamped. */
  readonly bytes: Uint8Array;
  readonly request: CatalogueDeviceRequest;
  readonly catalogue: { manufacturer: string; model: string; commands: number };
  /** The catalogue names composed, in record order: the screen's commands, then the inputs' own. */
  readonly commandNames: readonly string[];
  /** How many of those the screen shows, the first ones. */
  readonly onScreen: number;
  /** Under `full`, the catalogue's commands whose codes do not compose and were left out. */
  readonly leftOut: readonly string[];
  readonly power?: CataloguePower;
  readonly device: ComposedDevice;
  readonly inputs?: ComposedInputs;
  readonly joined?: JoinedPowerOff;
  readonly screen: ComposedScreen;
}

/** One device's state variables as numbered in the final configuration, read back by name. */
export interface FinalDeviceVariables {
  readonly label: string;
  readonly identifier?: number;
  readonly power: number;
  readonly powerOnDelay?: number;
  readonly interDeviceDelay?: number;
  /** Every variable whose name carries the device's label or identifier, by name. */
  readonly byName: ReadonlyMap<string, number>;
}

export interface ComposedCatalogueDevices {
  readonly bytes: Uint8Array;
  readonly devices: readonly ComposedCatalogueDevice[];
  /** Each device's variables in the final numbering, index for index with `devices`. */
  readonly variables: readonly FinalDeviceVariables[];
}

/**
 * What composing a catalogue device decides before anything is written: the commands and their codes, the
 * power steps, the inputs' own commands, and the device `composeDevice` is handed. `composeCatalogueDevice`
 * composes it, and `composeDonorDeviceInfrared` puts its records in a donor device's place,
 * `todo-compile-one.md` 8.1.3, so the two cannot disagree about what a catalogue device's records are.
 */
export interface CatalogueDevicePlan {
  readonly entry: CatalogueDevice;
  readonly available: CatalogueCommand[];
  readonly driving: DeviceDriving;
  /** The commands asked for or, under `full`, every one whose code composes, in catalogue order. */
  readonly wanted: readonly string[];
  readonly labels: readonly string[];
  /** `wanted`, then the inputs' own commands: one name per command record, in record order. */
  readonly commandNames: readonly string[];
  readonly leftOut: readonly string[];
  readonly layout: ReturnType<typeof deviceModeLayout> | undefined;
  readonly power: CataloguePower | undefined;
  readonly plan: ReturnType<typeof inputPlan> | undefined;
  /** What `composeDevice` takes. */
  readonly device: ComposeDevice;
}

/**
 * Exported for the Harmony 300 and 350's device composer, `families/harmony-300-350/devices.ts`, which stores only the
 * commands its keys bind, `todo-compile-350.md` 4.1, and takes them out of this plan rather than reading the
 * catalogue a second way: the same codes, blocks and power steps as a device composed whole.
 */
export function catalogueDevicePlan(c: Container, archive: CatalogueSource, request: CatalogueDeviceRequest): CatalogueDevicePlan {
  const { manufacturer, model, label } = request;
  const full = request.full === true;
  if (full && (request.commands !== undefined || request.labels !== undefined)) {
    throw new ComposeError('a whole device takes every command the catalogue holds, so no commands or labels are given');
  }
  const entry = archive.device(manufacturer, model);
  if (entry.codeset === undefined || entry.codeset === null) {
    throw new ComposeError(`${manufacturer} ${model} states no codeset`);
  }
  const available = archive.commands(entry.codeset);
  // The first of each name, since a codeset can state one name twice and the first is what every
  // calibration here took.
  const byName = new Map<string, string>();
  for (const command of available) if (!byName.has(command.name)) byName.set(command.name, command.keycode);

  // A code whose family states no repeat count is composed at the device's count, section 348, from the
  // family's definition in the archive; the device's count is judged once, over its whole codeset.
  const driving = archive.driving(manufacturer, model);
  const protocols = archiveProtocolsByName(archive);
  const press = cataloguePressRepeats(driving, available.map((one) => one.keycode), protocols);
  const derived = new Map<string, ReturnType<typeof catalogueCommandBlocks>>();
  const blocksOf = (keycode: string) => {
    if (!derived.has(keycode)) derived.set(keycode, catalogueCommandBlocks(keycode, press, protocols));
    return derived.get(keycode);
  };
  const toggledOf = new Map<string, ReturnType<typeof catalogueToggledCode>>();
  const flippedOf = (keycode: string) => {
    if (!toggledOf.has(keycode)) toggledOf.set(keycode, catalogueToggledCode(keycode, press, protocols));
    return toggledOf.get(keycode);
  };
  /**
   * True where the table composes the code or its blocks were derived at the device's count, and where
   * its toggle bit flipped composes as well, since a toggling code's record carries both.
   */
  const composable = (keycode: string): boolean => {
    const blocks = blocksOf(keycode);
    const toggled = flippedOf(keycode);
    return (blocks === undefined || !('refusal' in blocks)) && (toggled === undefined || !('refusal' in toggled));
  };
  /**
   * The command as the composer takes it: the code as its definition reads it, section 359, its derived
   * blocks where it has them, and the code with its toggle bit flipped where it toggles, todo-process-logitech
   * 2.5, which becomes the record's second pointer group.
   */
  const withBlocks = <T extends { stated: string }>(one: T): T => {
    const blocks = blocksOf(one.stated);
    const read = catalogueCode(one.stated, protocols);
    const toggled = flippedOf(one.stated);
    const withRead = read === undefined ? one : { ...one, read };
    const withToggled = toggled === undefined || 'refusal' in toggled ? withRead : { ...withRead, toggled };
    return blocks === undefined || 'refusal' in blocks ? withToggled : { ...withToggled, blocks };
  };

  // Under `full`, every name whose code composes, in catalogue order; the layout is computed over all
  // of them, as the compiler's is, and a command left out leaves its place to the next.
  // The keys a whole device's commands go to are its family's, since the compiler binds the same names
  // differently per family; a configuration no family serves has no table to lay a whole device out by.
  const hardKeys = full ? familyOf(c)?.deviceModeKeys : undefined;
  if (full && hardKeys === undefined) throw new ComposeError(`no family states which command a key takes on arch ${c.architecture}`);
  const layout = hardKeys === undefined ? undefined : deviceModeLayout([...byName.keys()], hardKeys);
  const leftOut = full ? [...byName].filter(([, keycode]) => !composable(keycode)).map(([name]) => name) : [];
  const wanted = full
    ? [...byName].filter(([, keycode]) => composable(keycode)).map(([name]) => name)
    : [...(request.commands ?? [])];
  if (wanted.length === 0) {
    throw new ComposeError(full ? `${manufacturer} ${model} has no command whose code composes`
      : 'a device needs commands, or full for every command');
  }
  const labels = request.labels ?? wanted;
  if (labels.length !== wanted.length) throw new ComposeError('one label per command, in the same order');
  const commands: ComposeCommand[] = wanted.map((name) => {
    const keycode = byName.get(name);
    if (keycode === undefined) {
      throw new ComposeError(`${manufacturer} ${model} has no command called ${name}. It has: `
        + [...byName.keys()].sort().join(', '));
    }
    // Under `full` every command repeats where its family has a held block and sends once where it
    // has none, the power commands included: Logitech's compile of the Harmony 650's starting setup
    // gives all 20 power commands of its seven devices the held block of their family, as it does every
    // other command, todo-compile-650 2.6. This withheld it from every command named Power until then,
    // on the reasoning that a held toggle must not repeat, which no compile shows.
    if (full) return withBlocks({ stated: keycode });
    // Without `full` the first command is the one sent both ways, and it does not repeat.
    return withBlocks({ stated: keycode, held: name !== wanted[0] });
  });
  // The command sent both ways where the catalogue's power steps are not used.
  const powerIndex = full ? Math.max(0, wanted.indexOf('PowerToggle')) : 0;

  // The catalogue's power and delays, section 320. A statement no compile shows composed is refused.
  const statedPower = request.powerSteps === false ? undefined
    : catalogueDevicePower(driving, (name) => byName.get(name));
  const stepsWithBlocks = (steps: readonly ComposePowerStep[]) => steps.map((one) => withBlocks(one));
  const power = statedPower === undefined ? undefined : {
    ...statedPower,
    powerOn: stepsWithBlocks(statedPower.powerOn),
    powerOff: stepsWithBlocks(statedPower.powerOff),
  };

  // The inputs' own commands, appended after the screen's and named the way the rules name them, so
  // `composeDeviceInputs` finds each by name; one already asked for is not composed twice.
  const plan = request.inputs === true ? inputPlan(driving) : undefined;
  const commandNames: string[] = [...wanted];
  const inputCommands: ComposeCommand[] = [];
  if (plan !== undefined) {
    const catalogueNames = [...byName.keys()];
    const sent = new Set([...plan.states, ...(plan.input === undefined ? [] : [plan.input])]
      .flatMap((one) => one.transitions.flatMap((t) => t.steps.flatMap((s) => (s.kind === 'send' ? [s.command] : [])))));
    for (const name of sent) {
      try {
        commandIndex(commandNames, name);
        continue;
      } catch (error) {
        if (!(error instanceof ComposeError)) throw error;
      }
      const keycode = byName.get(catalogueNames[commandIndex(catalogueNames, name)] as string) as string;
      if (!composable(keycode)) throw new ComposeError(`the inputs send ${name}, whose code does not compose`);
      commandNames.push(name);
      inputCommands.push(withBlocks({ stated: keycode }));
    }
  }

  const powerOnDelay = request.powerOnDelay ?? power?.powerOnDelay;
  const interDeviceDelay = request.interDeviceDelay ?? power?.interDeviceDelay;
  return {
    entry, available, driving, wanted, labels, commandNames, leftOut, layout, power, plan,
    device: {
      label, commands: [...commands, ...inputCommands], power: powerIndex,
      ...(power === undefined ? {} : {
        powerOn: power.powerOn, powerOff: power.powerOff, interKeyDelay: power.interKeyDelay,
      }),
      ...(powerOnDelay === undefined ? {} : { powerOnDelay }),
      ...(interDeviceDelay === undefined ? {} : { interDeviceDelay }),
    },
  };
}

/**
 * Compose one catalogue device onto `c`, unstamped. This is `compose-device.ts` without the command
 * line, step for step: the commands, the power, the inputs, the device, its inputs, the off lists, the
 * screen. A refusal is a `ComposeError` naming why.
 */
export function composeCatalogueDevice(
  c: Container, archive: CatalogueSource, request: CatalogueDeviceRequest, delays?: DelayDefaults,
): ComposedCatalogueDevice {
  const { label } = request;
  const planned = catalogueDevicePlan(c, archive, request);
  const { entry, available, driving, wanted, labels, commandNames, leftOut, layout, power, plan } = planned;
  const device = composeDevice(c, planned.device, delays ?? choicesOf(c).delays);
  let current = parse(device.bytes);
  // The inputs before the power variable joins the off lists, the input composer's own test's order:
  // its variables go in at `narrow`, below which the power variable already sits.
  const inputs = plan === undefined ? undefined
    : composeDeviceInputs(current, { device, label, commandNames, driving });
  if (inputs !== undefined) current = parse(inputs.bytes);
  const joined = request.powerOff === false ? undefined : joinPowerOff(current, device.variable);
  if (joined !== undefined) current = parse(joined.bytes);

  // A pad for a power command performs the power action where there is one, rather than the ordinary
  // press: the reason a long press version exists is that the press is not enough for this device.
  // **Logitech's device mode does not**: it sends the plain press and none of the power transition's
  // records, on all thirteen devices section 331 compared. Kept as a choice of ours and named there.
  const padList = (k: number): number => {
    const name = wanted[k] as string;
    if (power?.onCommands.includes(name) && device.powerSteps?.on !== undefined) return device.powerSteps.on;
    if (power?.offCommands.includes(name) && device.powerSteps?.off !== undefined) return device.powerSteps.off;
    return device.lists[k] as number;
  };
  const listOfName = (name: string): number | undefined => {
    const k = wanted.indexOf(name);
    return k < 0 ? undefined : padList(k);
  };
  const rows = layout === undefined
    ? labels.map((name, k) => ({ label: name, list: padList(k) }))
    : layout.screen.flatMap((name) => {
      const list = listOfName(name);
      return list === undefined ? [] : [{ label: name, list }];
    });
  const keyLists = new Map<number, number>();
  for (const [scan, name] of layout?.keys ?? []) {
    const list = listOfName(name);
    if (list !== undefined) keyLists.set(scan, list);
  }
  const screen = composeDeviceScreen(current, label, rows, {
    ...(request.iconLike === undefined ? {} : { iconLike: request.iconLike }),
    ...(request.keysLike === undefined ? {} : { keysLike: request.keysLike }),
    ...(layout === undefined ? {} : { compiled: { title: request.title ?? label, keys: keyLists } }),
  });

  return {
    bytes: screen.bytes,
    request,
    catalogue: { manufacturer: entry.manufacturer, model: entry.model ?? request.model, commands: available.length },
    commandNames,
    onScreen: wanted.length,
    leftOut,
    ...(power === undefined ? {} : { power }),
    device,
    ...(inputs === undefined ? {} : { inputs }),
    ...(joined === undefined ? {} : { joined }),
    screen,
  };
}

/** Options for several devices at once. */
export interface ComposeCatalogueDevicesOptions {
  /**
   * The most devices the model holds, `maxDevices` in `packages/usb`'s model table, eight on a Harmony
   * 650. Absent means no bound, which is what a calibration composing onto a full compile needs.
   */
  readonly maxDevices?: number;
  /** The delays a device starts with where neither the request nor the catalogue states one; the family's. */
  readonly delays?: DelayDefaults;
}

/**
 * Compose several catalogue devices onto `c` in the order given, each on the reparsed result of the
 * one before, unstamped; then read every device's variables back in the final numbering.
 *
 * Refused before anything is composed: more devices than the model holds, and two devices with one
 * label, whose state variables would carry one name and whose device list rows could not be told
 * apart.
 */
export function composeCatalogueDevices(
  c: Container, archive: CatalogueSource, requests: readonly CatalogueDeviceRequest[],
  options: ComposeCatalogueDevicesOptions = {},
): ComposedCatalogueDevices {
  if (requests.length === 0) throw new ComposeError('no device to compose');
  const existing = devices(c);
  const labels = new Set(existing.flatMap((one) => (one.name === undefined ? [] : [one.name])));
  for (const request of requests) {
    if (labels.has(request.label)) {
      throw new ComposeError(`a device called ${request.label} is already here or earlier in the list`);
    }
    labels.add(request.label);
  }
  if (options.maxDevices !== undefined && existing.length + requests.length > options.maxDevices) {
    throw new ComposeError(`${existing.length} devices and ${requests.length} more is `
      + `${existing.length + requests.length}, and this model holds ${options.maxDevices}`);
  }
  let current = c;
  const composed: ComposedCatalogueDevice[] = [];
  for (const [k, request] of requests.entries()) {
    // A refusal past the first device is about the configuration the earlier ones left, the variable
    // ceiling above all: a write names its variable in seven bits, so 128 is the last a configuration
    // can hold, and Logitech's own eight device compiles already reach 124. So the refusal says which
    // device it was and how many came before, since the same device alone would compose.
    let one: ComposedCatalogueDevice;
    try {
      one = composeCatalogueDevice(current, archive, request, options.delays);
    } catch (error) {
      if (!(error instanceof ComposeError) || k === 0) throw error;
      throw new ComposeError(`${request.label}, after ${k} composed in this run: ${error.message}`);
    }
    composed.push(one);
    current = parse(one.bytes);
  }
  return { bytes: current.blob, devices: composed, variables: finalVariables(current, composed) };
}

/** A device the configuration already holds, by its label, and the catalogue entry it is. */
export interface DonorDeviceRequest {
  readonly label: string;
  readonly manufacturer: string;
  readonly model: string;
}

/** The label the commands are composed under in the scratch copy, which is thrown away. */
const SCRATCH_LABEL = 'Scratch';

/** A record's three blocks as their words, `-` for a null pointer: what two records sending one code share. */
function recordWords(c: Container, address: number): string {
  return irHeaderPointers(c, address).slice(0, 3)
    .map((pointer) => (pointer === 0 ? '-' : (irBlockWords(c, pointer) ?? []).join(','))).join('|');
}

/**
 * The inputs of a device the configuration already holds, composed onto it: what a Logitech compile with
 * no activities leaves out, since its compiler writes a device's input variables only for an activity
 * that puts the device on an input. `todo-compile-one.md` 1.2.9, the donor's LG and Denon.
 *
 * `composeDeviceInputs` asks for the device's send list per command it sends. A compile names none of its
 * commands, so each is found by its code: the command composed from the catalogue into a scratch copy, its
 * record's three blocks matched word for word against the device's own group, and the one list that sends
 * that record and nothing else but its quantity taken as the command's. **That rests on the records being
 * the catalogue's**, which section 337 measured, 418 of 418 records of seven devices identical to one of
 * Logitech's; and it is refused rather than guessed where a command's code is in no record of the group,
 * or where no single list sends it. Two records with one code, the LG's `Home` twice, send the same code,
 * so the first is taken. **A send list is the family's**, `Family.sends`, and so is matching one,
 * `SendShape.donorSendList`: the send and its quantity alone on the Harmony One, the only family this has been
 * run on. The Harmony 600, 650 and 700's send opens with a prelude of three lists, which nothing matches, so their
 * family states no matcher and is refused up front.
 *
 * `undefined` for a device whose catalogue entry states no variable to compose, and for one that already
 * has an input variable here.
 */
export function composeDonorDeviceInputs(
  c: Container, archive: CatalogueSource, request: DonorDeviceRequest,
): ComposedInputs | undefined {
  const matchSend = sendsOf(c).donorSendList;
  if (matchSend === undefined) throw new ComposeError('a donor device\'s inputs are composed where a send is the send and its quantity alone, the Harmony One\'s');
  const own = devices(c).find((one) => one.name === request.label);
  if (own?.group === undefined) throw new ComposeError(`no device called ${request.label} with codes here`);
  if (deviceVariables(c).some((one) => one.device === request.label && one.property === 'Input')) return undefined;
  const driving = archive.driving(request.manufacturer, request.model);
  const plan = inputPlan(driving);
  const variables = [...plan.states, ...(plan.input === undefined ? [] : [plan.input])];
  if (variables.length === 0) return undefined;
  const sent = [...new Set(variables.flatMap((one) => one.transitions.flatMap((t) => t.steps.flatMap((s) => (s.kind === 'send' ? [s.command] : [])))))];
  const power = deviceVariables(c).find((one) => one.device === request.label && one.property === 'Power')?.index;
  if (power === undefined) throw new ComposeError(`${request.label} has no power variable to compose inputs beside`);

  // The commands sent, composed into a scratch copy for their records and nothing else, by the names the
  // catalogue spells them, which the rules may spell in another case. Behind one other command, since a
  // device composed without `full` sends its first command both ways and gives it no held block, where
  // every input command of a compile is a command like any other and repeats while held.
  const entry = archive.device(request.manufacturer, request.model);
  const catalogueNames = entry.codeset === undefined || entry.codeset === null ? []
    : [...new Set(archive.commands(entry.codeset).map((one) => one.name))];
  const spelt = sent.map((name) => catalogueNames[commandIndex(catalogueNames, name)]!);
  const lead = catalogueNames.find((name) => !spelt.includes(name));
  if (lead === undefined) throw new ComposeError(`${request.label}'s catalogue entry holds no command but the ones its inputs send`);
  const scratch = composeCatalogueDevice(c, archive, {
    manufacturer: request.manufacturer, model: request.model, label: SCRATCH_LABEL,
    commands: [lead, ...spelt], powerSteps: false, powerOff: false,
  });
  const composed = parse(scratch.bytes);
  const scratchGroup = devices(composed).find((one) => one.name === SCRATCH_LABEL)?.group;
  const theirs = irGroups(c)?.[own.group]?.addresses.map((address) => recordWords(c, address)) ?? [];
  const mine = scratchGroup === undefined ? [] : irGroups(composed)?.[scratchGroup]?.addresses ?? [];
  const lists = c.actionLists() ?? [];
  // Each command's record in the device's own group, which is in its compiler's order and not the commands'.
  const records = sent.map((name) => {
    const k = commandIndex(scratch.commandNames, spelt[sent.indexOf(name)]!);
    const record = mine[k] === undefined ? -1 : theirs.indexOf(recordWords(composed, mine[k]!));
    if (record < 0) throw new ComposeError(`${request.label} holds no record with the catalogue's code for ${name}`);
    return record;
  });
  const listOf = sent.map((name, k) => {
    const operand = (own.group! << 8) | records[k]!;
    const sending = matchSend(lists, operand);
    if (sending.length !== 1) throw new ComposeError(`${sending.length} lists of ${request.label} send its ${name} alone, where one is wanted`);
    return sending[0]!;
  });
  const device: ComposedDevice = { bytes: c.blob, group: own.group, lists: listOf, variable: power };
  // The records go with the commands: the input composer writes its own send lists, and without them it would
  // take a command's place among `sent` for its record, findings section 436.
  return composeDeviceInputs(c, { device, label: request.label, commandNames: sent, records, driving });
}

/** A delay variable's name: its property, the device's identifier, and its number of values. */
const DELAY_VARIABLE = /^(PowerOnDelay|InterDeviceDelay)_(\d+)_\d+$/;

/**
 * Every composed device's variables in `c`'s numbering, by name: the power variable named
 * `<label>_Power_2`, the inputs `<label>_<property>_<n>`, the delays `<property>_<identifier>_65278`.
 * The power variable is checked against what `composeDevice` returned, since it sits below `narrow` and
 * nothing composed after it moves it; a disagreement means that reading is wrong and is refused.
 */
function finalVariables(c: Container, composed: readonly ComposedCatalogueDevice[]): FinalDeviceVariables[] {
  const all = stateVariables(c);
  return composed.map((one) => {
    const label = one.request.label;
    const named = nameOfLabel(label);
    const identifier = one.device.delay?.identifier;
    const byName = new Map<string, number>();
    for (const variable of all) {
      const name = variable.name;
      const delay = DELAY_VARIABLE.exec(name);
      // `<label>_<property>_<values>` with a property of no underscore, so that a composed `Panasonic`
      // does not claim an existing `Panasonic_TV_Power_2`.
      const rest = name.startsWith(`${named}_`) ? name.slice(named.length + 1) : undefined;
      const mine = (rest !== undefined && /^[^_]+_\d+$/.test(rest))
        || (delay !== null && identifier !== undefined && Number(delay[2]) === identifier);
      if (mine) byName.set(name, variable.index);
    }
    const power = byName.get(`${named}_Power_2`);
    if (power !== one.device.variable) {
      throw new ComposeError(`${label}'s power variable reads back as ${power}, not ${one.device.variable}`);
    }
    const find = (property: string): number | undefined =>
      [...byName].find(([name]) => name.startsWith(`${property}_${identifier}_`))?.[1];
    const powerOnDelay = identifier === undefined ? undefined : find('PowerOnDelay');
    const interDeviceDelay = identifier === undefined ? undefined : find('InterDeviceDelay');
    return {
      label,
      ...(identifier === undefined ? {} : { identifier }),
      power,
      ...(powerOnDelay === undefined ? {} : { powerOnDelay }),
      ...(interDeviceDelay === undefined ? {} : { interDeviceDelay }),
      byName,
    };
  });
}
