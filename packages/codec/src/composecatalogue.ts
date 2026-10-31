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
 */
import type { DelayDefaults } from './families/family.ts';
import { choicesOf, familyOf, sendsOf } from './families/registry.ts';
import type { Container } from './gspm.ts';
import { parse } from './gspm.ts';
import {
  catalogueCommands,
  catalogueDevice,
} from './catalogue.ts';
import { catalogueDriving, type DeviceDriving } from './driving.ts';
import {
  archiveProtocols, statedCodeOfDefinition, waveformOfArchiveCommand, withToggleFlipped, type ArchiveProtocol,
} from './archive.ts';
import { blockOfStatedCode, statedCode, statedProtocol, type StatedCode } from './stated.ts';
import { mergedIntervals, type Pulse } from './irframe.ts';
import { catalogueDevicePower, type CataloguePower } from './devicepower.ts';
import { commandIndex, composeDeviceInputs, inputPlan, type ComposedInputs } from './inputs.ts';
import { composableKeycode, deviceModeLayout } from './devicemode.ts';
import {
  ComposeError,
  composeDevice,
  composeDeviceScreen,
  joinPowerOff,
  type ComposeCommand,
  type ComposePowerStep,
  type ComposedDevice,
  type StatedBlocks,
  type ComposedScreen,
  type JoinedPowerOff,
  type ToggledCode,
} from './compose.ts';
import { devices, deviceVariables, SEND_INFRARED, stateVariables } from './inventory.ts';
import {
  IR_HEADER_BASE, IR_POINTERS_PER_GROUP, IR_TABLE_SLOT, irBlockLength, irBlockWords, irGroups, irHeaderLength,
  irHeaderPointers, irRecordStart,
} from './ir.ts';
import { archSlot } from './gspm.ts';
import { Writer } from './emit.ts';
import { layOutContainer } from './frame.ts';
import { instructionSites } from './assemble.ts';
import { type Cut, withoutRanges } from './shared/dropmodes.ts';
import { deviceRecords, type ComposeDevice } from './shared/devices.ts';
import { composeIrGroup } from './shared/infrared.ts';
import { nameOfLabel } from './shared/core.ts';

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
  readonly entry: ReturnType<typeof catalogueDevice>;
  readonly available: ReturnType<typeof catalogueCommands>;
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
 * Exported for the Harmony 300 and 350's device composer, `families/no-screen/devices.ts`, which stores only the
 * commands its keys bind, `todo-compile-350.md` 4.1, and takes them out of this plan rather than reading the
 * catalogue a second way: the same codes, blocks and power steps as a device composed whole.
 */
export function catalogueDevicePlan(c: Container, archive: string, request: CatalogueDeviceRequest): CatalogueDevicePlan {
  const { manufacturer, model, label } = request;
  const full = request.full === true;
  if (full && (request.commands !== undefined || request.labels !== undefined)) {
    throw new ComposeError('a whole device takes every command the catalogue holds, so no commands or labels are given');
  }
  const entry = catalogueDevice(archive, manufacturer, model);
  if (entry.codeset === undefined || entry.codeset === null) {
    throw new ComposeError(`${manufacturer} ${model} states no codeset`);
  }
  const available = catalogueCommands(archive, entry.codeset);
  // The first of each name, since a codeset can state one name twice and the first is what every
  // calibration here took.
  const byName = new Map<string, string>();
  for (const command of available) if (!byName.has(command.name)) byName.set(command.name, command.keycode);

  // A code whose family states no repeat count is composed at the device's count, section 348, from the
  // family's definition in the archive; the device's count is judged once, over its whole codeset.
  const driving = catalogueDriving(archive, manufacturer, model);
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
  c: Container, archive: string, request: CatalogueDeviceRequest, delays?: DelayDefaults,
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
  c: Container, archive: string, requests: readonly CatalogueDeviceRequest[],
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
  c: Container, archive: string, request: DonorDeviceRequest,
): ComposedInputs | undefined {
  const matchSend = sendsOf(c).donorSendList;
  if (matchSend === undefined) throw new ComposeError('a donor device\'s inputs are composed where a send is the send and its quantity alone, the Harmony One\'s');
  const own = devices(c).find((one) => one.name === request.label);
  if (own?.group === undefined) throw new ComposeError(`no device called ${request.label} with codes here`);
  if (deviceVariables(c).some((one) => one.device === request.label && one.property === 'Input')) return undefined;
  const driving = catalogueDriving(archive, request.manufacturer, request.model);
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
  const entry = catalogueDevice(archive, request.manufacturer, request.model);
  const catalogueNames = entry.codeset === undefined || entry.codeset === null ? []
    : [...new Set(catalogueCommands(archive, entry.codeset).map((one) => one.name))];
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

// ---------------------------------------------------------------------------------------------------
// A donor device's infrared composed from the catalogue, todo-compile-one.md 8.1.3

/** One record of a donor device's group, and the composed record its sends name now. */
export interface DonorRecordMapped {
  /** The record's index in the donor's group. */
  readonly from: number;
  /** The composed record's index, which is its index in the group now. */
  readonly to: number;
  /** What the composed record sends: a catalogue command's name, or a power step's. */
  readonly name: string;
  /** How the donor's record differs from the composed one, empty where every block is word for word the same. */
  readonly differs: readonly string[];
}

export interface ComposedDonorInfrared {
  readonly bytes: Uint8Array;
  readonly group: number;
  /** The composed records in group order, each by what it sends. */
  readonly names: readonly string[];
  /** How many records the donor's group held. */
  readonly donorRecords: number;
  /** Every record of the donor's group, in its order, with the composed record that took its place. */
  readonly mapped: readonly DonorRecordMapped[];
}

/** The leading silence of a block, in microseconds: the words before its first mark. */
function openingSilence(words: readonly number[]): number {
  let total = 0;
  for (const word of words) {
    if (word === 0 || (word & 0x8000) !== 0) break;
    total += word;
  }
  return total;
}

/** A block's words from its first mark on, the code without the silence it opens with. */
function withoutOpening(words: readonly number[]): string {
  const first = words.findIndex((word) => (word & 0x8000) !== 0);
  return first < 0 ? '' : words.slice(first).join(',');
}

/** A record as its header's own bytes, the address of its data zeroed, and each pointer's block as words. */
function describeRecord(c: Container, address: number): { header: string; blocks: (number[] | undefined)[] } {
  const start = irRecordStart(c, address);
  const off = start === undefined ? undefined : c.blobOffsetOf(start);
  if (off === undefined) throw new ComposeError(`the infrared record at ${address.toString(16)} has no readable start`);
  const header = c.blob.slice(off, off + IR_HEADER_BASE);
  // The header names its own data seven bytes in plus one, `irRecordStart`: an address, so not compared.
  header.fill(0, 8, 11);
  return {
    header: Buffer.from(header).toString('hex'),
    blocks: irHeaderPointers(c, address).map((pointer) => (pointer === 0 ? undefined : irBlockWords(c, pointer))),
  };
}

/**
 * A device the configuration already holds given the infrared records the catalogue composes for it, in the
 * order and with the codes `composeCatalogueDevice` gives a device composed whole, in place of the records its
 * own group held: what `todo-compile-one.md` 8.1.3 asks of the Harmony One's composed setup, whose donor is
 * Logitech's compile of two of the test setup's seven devices, so that no infrared byte of the result is the
 * donor's.
 *
 * **What it rests on.** Every action list, tagged list, timer and transition that sends one of the device's
 * records names it as its group and its index in the group, `(group << 8) | record`; so the records can be
 * replaced as long as every send is told the new index of the code it sent. Which composed record that is is
 * found by the code, as `composeDonorDeviceInputs` finds an input's: the donor's record whose blocks are word for
 * word one of ours is that record, section 338's measurement; one that is not is matched on its once block with
 * the silence it opens with dropped, the code itself, and preferably on its other blocks too, and **every such
 * difference is reported** in `mapped`, since it is what a remote sends differently afterwards. A donor record
 * whose code no composed record has is refused rather than kept, since keeping it would leave a Logitech record
 * in the result.
 *
 * **What it changes.** The composed group goes in as `composeIrGroup` lays one out, then takes the donor's
 * group's index and the donor's group, its records and every block nothing else names, are taken out,
 * `withoutRanges`; the group count comes back to what it was, so no other device's index moves. Nothing but
 * base slot 5 and the send operands changes: the device's lists, its power variable and its pages are the donor's
 * as before, and they name records by index, so they are the composed device's now.
 *
 * **Scope, decision 16**: generic, base slot 5 and the send opcode being the same on every architecture this
 * codec composes for; run on the Harmony One alone, on `harvest_one_two_devices`' LG and Denon.
 */
export function composeDonorDeviceInfrared(
  c: Container, archive: string, request: DonorDeviceRequest,
): ComposedDonorInfrared {
  const own = devices(c).find((one) => one.name === request.label);
  if (own?.group === undefined) throw new ComposeError(`no device called ${request.label} with codes here`);
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');
  const group = own.group;

  // The records a whole device composed with its inputs holds, in its order: `composeCatalogueDevice`'s plan
  // and `composeDeviceFor`'s record order, each derived once.
  const planned = catalogueDevicePlan(c, archive, {
    manufacturer: request.manufacturer, model: request.model, label: request.label, full: true, inputs: true,
  });
  const records = deviceRecords(planned.device);
  const commandCount = planned.device.commands.length;
  const names = records.sends.map((one, k) => {
    if (k < commandCount) return planned.commandNames[k]!;
    const step = records.steps[k - commandCount]!;
    const named = planned.available.find((command) => command.keycode === step.stated)?.name;
    return `${named ?? 'a code'} as a power step${step.holdMs === undefined ? '' : ` held ${step.holdMs} ms`}`;
  });

  // The composed group, appended as a device composed whole would have it.
  const appended = parse(composeIrGroup(c, records.sends).bytes);
  const groups = irGroups(appended);
  const slot = archSlot(c.architecture, IR_TABLE_SLOT);
  const table = appended.pointerArrayAt(slot);
  if (groups === undefined || table === undefined) throw new ComposeError('base slot 5 does not read as a group table');
  const fresh = groups.length - 1;
  const theirs = groups[group]!.addresses.map((address) => describeRecord(appended, address));
  const ours = groups[fresh]!.addresses.map((address) => describeRecord(appended, address));
  const words = (blocks: readonly (number[] | undefined)[]): string => blocks.map((one) => one?.join(',') ?? '-').join('|');

  // Each donor record to the composed record sending its code. Where several composed records send one code, two
  // catalogue commands sharing it (the LG's Home and SmartMenu), each donor record of that code takes the next
  // one not yet taken, so a donor group's two records of one code stay two records and each keeps a list of its
  // own, which `composeDonorDeviceInputs` relies on to find an input's list.
  const taken = new Set<number>();
  const mapped: DonorRecordMapped[] = theirs.map((record, from) => {
    const exactly = ours.flatMap((one, k) => (one.header === record.header && words(one.blocks) === words(record.blocks) ? [k] : []));
    const exact = exactly.find((k) => !taken.has(k)) ?? exactly[0];
    if (exact !== undefined) {
      taken.add(exact);
      return { from, to: exact, name: names[exact]!, differs: [] };
    }
    const code = withoutOpening(record.blocks[0] ?? []);
    const same = ours.flatMap((one, k) => (one.header === record.header && withoutOpening(one.blocks[0] ?? []) === code ? [k] : []));
    const closest = same.find((k) => words(ours[k]!.blocks.slice(1)) === words(record.blocks.slice(1))) ?? same[0];
    if (closest === undefined) {
      // The header is compared too, its carrier and class, so a code at another carrier is refused as well.
      throw new ComposeError(`${request.label}'s record ${from} sends a code, at its carrier, that no command of ${request.manufacturer} ${request.model} in the catalogue composes`);
    }
    const mine = ours[closest]!;
    const differs: string[] = [];
    const theirOpening = openingSilence(record.blocks[0] ?? []);
    const ourOpening = openingSilence(mine.blocks[0] ?? []);
    if (theirOpening !== ourOpening) differs.push(`opens with ${theirOpening} us of silence where the composed record opens with ${ourOpening} us`);
    const roles = ['held block', 'release block'];
    for (const [k, role] of roles.entries()) {
      const theirBlock = record.blocks[k + 1];
      const ourBlock = mine.blocks[k + 1];
      if (theirBlock === undefined && ourBlock !== undefined) differs.push(`has no ${role} where the composed record has one`);
      else if (theirBlock !== undefined && ourBlock === undefined) differs.push(`has a ${role} where the composed record has none`);
      else if (theirBlock !== undefined && ourBlock !== undefined && theirBlock.join() !== ourBlock.join()) differs.push(`has another ${role}`);
    }
    if (words(record.blocks.slice(IR_POINTERS_PER_GROUP)) !== words(mine.blocks.slice(IR_POINTERS_PER_GROUP))) {
      differs.push('has other toggled blocks');
    }
    return { from, to: closest, name: names[closest]!, differs };
  });

  // Every send of the donor's group told the composed record's index, and the composed group put at the donor's
  // group's index by swapping the two table entries, so the donor's group is the last one, which is taken out.
  const bytes = appended.blob.slice();
  for (const site of instructionSites(appended, SEND_INFRARED)) {
    const sentGroup = site.operand >> 8;
    if (sentGroup === fresh) throw new ComposeError('something already sends the group just composed');
    if (sentGroup !== group) continue;
    const to = mapped[site.operand & 0xff]?.to;
    if (to === undefined) throw new ComposeError(`a send names ${request.label}'s record ${site.operand & 0xff}, which its group does not hold`);
    bytes.set(new Writer(2).u16((group << 8) | to).bytes, site.at);
  }
  const entry = (k: number): number => table.start + table.width + 3 * k;
  bytes.set(new Writer(3).u24(table.values[fresh]!).bytes, entry(group));
  bytes.set(new Writer(3).u24(table.values[group]!).bytes, entry(fresh));
  const swapped = parse(bytes);

  // The donor's group, its records and every block of theirs no other record names, and the table's last entry.
  const after = irGroups(swapped)!;
  const kept = new Set(after.flatMap((one, k) => (k === fresh ? [] : one.addresses.flatMap((address) => irHeaderPointers(swapped, address)))));
  const cuts: Cut[] = [{ from: after[fresh]!.start, to: after[fresh]!.start + after[fresh]!.length }];
  const blocks = new Set<number>();
  for (const address of after[fresh]!.addresses) {
    const start = irRecordStart(swapped, address);
    const off = start === undefined ? undefined : swapped.blobOffsetOf(start);
    if (off === undefined) throw new ComposeError(`${request.label}'s record at ${address.toString(16)} has no readable start`);
    cuts.push({ from: off, to: off + irHeaderLength(swapped, address) });
    for (const pointer of irHeaderPointers(swapped, address)) if (pointer !== 0 && !kept.has(pointer)) blocks.add(pointer);
  }
  for (const pointer of blocks) {
    const off = swapped.blobOffsetOf(pointer);
    const length = irBlockLength(swapped, pointer);
    if (off === undefined || length === undefined) throw new ComposeError(`a block of ${request.label}'s at ${pointer.toString(16)} does not close`);
    cuts.push({ from: off, to: off + length });
  }
  const tableAt = swapped.pointerArrayAt(slot)!;
  cuts.push({ from: tableAt.start + tableAt.length - 3, to: tableAt.start + tableAt.length });
  const cut = withoutRanges(swapped, cuts);
  // The count goes down by the entry taken out, in the table's own width.
  const head = cut.at(tableAt.start);
  if (head === undefined || head.offset !== 0) throw new ComposeError('base slot 5\'s table is not where its section starts');
  head.piece.bytes.set(tableAt.width === 1
    ? new Writer(1).u8(after.length - 1).bytes : new Writer(2).u16(after.length - 1).bytes, 0);
  const result = parse(layOutContainer(cut.layout).bytes);

  // Read back: the group at its index is the composed one, record for record, and nothing sends past its end.
  const back = irGroups(result);
  if (back?.length !== groups.length - 1) throw new ComposeError('the group count did not come back');
  const placed = back[group]!.addresses.map((address) => describeRecord(result, address));
  if (placed.length !== ours.length || placed.some((one, k) => one.header !== ours[k]!.header || words(one.blocks) !== words(ours[k]!.blocks))) {
    throw new ComposeError(`${request.label}'s group does not read back as the composed records`);
  }
  for (const site of instructionSites(result, SEND_INFRARED)) {
    if (site.operand >> 8 === group && (site.operand & 0xff) >= ours.length) {
      throw new ComposeError(`a send names ${request.label}'s record ${site.operand & 0xff} of ${ours.length}`);
    }
  }
  return { bytes: result.blob, group, names, donorRecords: theirs.length, mapped };
}

/** The bytes of a configuration's infrared groups the catalogue reproduces, `catalogueInfraredBytes`. */
export interface CatalogueInfraredBytes {
  /** Per byte of the blob, 1 where the catalogue's records reproduce it. */
  readonly owners: Uint8Array;
  /** Per device asked about: its records, how many the catalogue reproduces, and whether its group array is the composer's. */
  readonly devices: readonly { label: string; records: number; reproduced: number; array: boolean }[];
}

/**
 * Which bytes of a configuration's infrared the catalogue reproduces, device by device: a record whose header and
 * blocks are word for word one the catalogue composes for that device whole, `composeCatalogueDevice`'s records,
 * counts with its blocks, and the group's own record array counts where every record is the composed one at the
 * same place, which is what a group the composer laid out holds. An attribution for a measurement of what a
 * configuration still carries from a donor, as the touch family's `touchBuiltBytes` is for its builders,
 * `todo-compile-one.md` 8.1.3: measured on the result and blind to how it was made, so it says what the catalogue
 * can write and not what wrote it, and a caller holds it to the path separately.
 */
export function catalogueInfraredBytes(
  c: Container, archive: string, wanted: readonly DonorDeviceRequest[],
): CatalogueInfraredBytes {
  const owners = new Uint8Array(c.blob.length);
  const groups = irGroups(c);
  if (groups === undefined) throw new ComposeError('base slot 5 does not read as a group table');
  const words = (blocks: readonly (number[] | undefined)[]): string => blocks.map((one) => one?.join(',') ?? '-').join('|');
  const out: { label: string; records: number; reproduced: number; array: boolean }[] = [];
  for (const request of wanted) {
    const group = devices(c).find((one) => one.name === request.label)?.group;
    if (group === undefined) throw new ComposeError(`no device called ${request.label} with codes here`);
    // The records the catalogue composes for the device whole, laid out in a scratch copy and read back.
    const planned = catalogueDevicePlan(c, archive, {
      manufacturer: request.manufacturer, model: request.model, label: request.label, full: true, inputs: true,
    });
    const scratch = parse(composeIrGroup(c, deviceRecords(planned.device).sends).bytes);
    const ours = irGroups(scratch)!.at(-1)!.addresses.map((address) => describeRecord(scratch, address));
    const keys = ours.map((one) => `${one.header}/${words(one.blocks)}`);
    const theirs = groups[group]!;
    let reproduced = 0;
    let inOrder = theirs.addresses.length === ours.length;
    theirs.addresses.forEach((address, k) => {
      const one = describeRecord(c, address);
      const key = `${one.header}/${words(one.blocks)}`;
      if (key !== keys[k]) inOrder = false;
      if (!keys.includes(key)) return;
      reproduced += 1;
      const off = c.blobOffsetOf(irRecordStart(c, address)!)!;
      owners.fill(1, off, off + irHeaderLength(c, address));
      for (const pointer of irHeaderPointers(c, address)) {
        if (pointer === 0) continue;
        const at = c.blobOffsetOf(pointer)!;
        owners.fill(1, at, at + irBlockLength(c, pointer)!);
      }
    });
    if (inOrder) owners.fill(1, theirs.start, theirs.start + theirs.length);
    out.push({ label: request.label, records: theirs.addresses.length, reproduced, array: inOrder });
  }
  return { owners, devices: out };
}

// ---------------------------------------------------------------------------------------------------
// How many times a press repeats the code, where the family does not say: the device does, section 348

/** Every protocol definition of an archive checkout by family name, read once per checkout. */
const PROTOCOLS_OF = new Map<string, ReadonlyMap<string, ArchiveProtocol>>();

/** The archive's protocol definitions by family name, cached per checkout since a device composes many. */
export function archiveProtocolsByName(archive: string): ReadonlyMap<string, ArchiveProtocol> {
  let found = PROTOCOLS_OF.get(archive);
  if (found === undefined) {
    found = new Map(archiveProtocols(archive).map((one) => [one.name, one]));
    PROTOCOLS_OF.set(archive, found);
  }
  return found;
}

/** A family spelling with its letter case and its spacing set aside: trimmed, runs of white space as one. */
function foldedFamily(spelling: string): string {
  return spelling.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Per definition map, its names by folded spelling, `null` where two definitions fold alike. */
const FOLDED_OF = new WeakMap<ReadonlyMap<string, ArchiveProtocol>, Map<string, string | null>>();

/**
 * The archive's definition of a catalogue code's family: by the code's own spelling of the family, and
 * where no definition is spelt that way, by the one spelt the same but for letter case and spacing.
 * `undefined` where neither finds one, or where the folded spelling would fit two definitions.
 *
 * **Why the code's spelling is not always a definition's name.** Five spellings in the catalogue's codes
 * name no definition, 222 commands: `Ada 40 Bit` (82), `AudioAnalogue 14 bit` (108), `DAM 12 Bit` (29),
 * `toshiba 32 Bit` (2) and `Intellibus 17 Bit ` with a trailing space (1). Until todo-process-logitech 2.3
 * they found no definition, the first four no rhythm row either, and those four were refused as having no
 * rhythm, section 361.
 *
 * **Why folding is Logitech's answer and not a guess.** Every command of Logitech's service carries a
 * `ProtocolId` beside its keycode, the field MyHarmony's client knows as `Command.ProtocolId`, and the
 * definitions carry the same id. Over the 13293293 commands of the raw capture behind the archive that carry a
 * keycode, the id names the keycode's own spelling on 13292991 and on the other 302, every command of the five spellings,
 * it names the definition spelt the same but for case and spacing, and on none does it name another
 * family. The archive's `protocol` field is that id's name. **And folding merges nothing**: the 684
 * definitions fold to 684 different spellings, and a pair that folded alike would be refused here rather
 * than one of them picked.
 */
export function catalogueProtocol(
  keycode: string, protocols: ReadonlyMap<string, ArchiveProtocol>,
): ArchiveProtocol | undefined {
  const family = /^G:([^:]+):/.exec(keycode)?.[1];
  if (family === undefined) return undefined;
  const exact = protocols.get(family);
  if (exact !== undefined) return exact;
  let folded = FOLDED_OF.get(protocols);
  if (folded === undefined) {
    folded = new Map();
    for (const name of protocols.keys()) {
      const key = foldedFamily(name);
      folded.set(key, folded.has(key) ? null : name);
    }
    FOLDED_OF.set(protocols, folded);
  }
  const name = folded.get(foldedFamily(family));
  return name === undefined || name === null ? undefined : protocols.get(name);
}

/** A device's press count for the families that state none, or why it is not known. */
export type PressRepeats = { readonly repeats: number } | { readonly refusal: string };

/**
 * How many times one press of this device sends the repeating part of a code whose family's definition
 * states no count: the device's own `timing.pressMinRepeats`, or a refusal where the compiles do not say.
 *
 * **What the count is.** A press is the start group once, the repeat group this many times, and the
 * release group, which is the archive README's reading of the hub's infrared engine and the one
 * `blockOfDefinition` builds. Section 348 scored it against every Logitech compile in the lab whose
 * devices are known: on 45 of the 47 catalogue devices of the compiles our own accounts produced, the
 * records of every family whose definition states no count repeat exactly the device's number, 1 or 3,
 * the `Kreatel IP 22 Bit` set top box at 1 on four compiles; the two others are the second refusal below.
 * Only three of the 45 state 1, so that is what separates it from a default of 3. That is
 * what retired the rule this replaced, that such a family gets no block at all because the count is not
 * the family's: it is not, it is the device's.
 *
 * **Two refusals, each a place the compiles leave open rather than a guess.**
 *
 * * **A count of 0**, 124 devices of the archive, 120 of them with a codeset. The hub plays it as the
 *   start group alone, per the archive README, and no compile here holds a catalogue device stating it,
 *   so what Logitech's compiler for these remotes writes is not seen. (Section 258's games console is
 *   at 0 in its account and was written at 1, but its family states 1, so it says nothing about 0.)
 *
 * **A count of 2 is composed, and that is unconfirmed**: 1518 devices of the archive with a codeset state
 * it, no compile here shows it either, and it is built as the rule says, between the 1 and the 3 that are
 * seen. 0 is refused where 2 is not because at 0 the hub's reading changes kind, a press with no repeat
 * group at all, where 2 only changes how many.
 * * **A device whose codeset holds a family stating a count other than the device's.** Two devices of
 *   the compiles are this case, a Toshiba television and a Yamaha receiver, both stating 3, both mostly
 *   `Toshiba 32 Bit`, which states 1: Logitech wrote 1 for **every** command of both, the `Memorex 32
 *   Bit` and `PanasonicV2 48 Bit` ones included, which state no count. So on such a device the
 *   device's number is not the one used, and which one is cannot be read off two samples, so it is not
 *   composed. A third, a Sony television stating 3 and mostly `Sony 12 Bit`, which states 3 as well,
 *   gives its one `Toshiba 32 Bit` command 3 rather than its family's 1: the family's own statement does
 *   not always win either.
 */
export function cataloguePressRepeats(
  driving: { readonly timing: Pick<DeviceDriving['timing'], 'pressMinRepeats'> }, keycodes: Iterable<string>,
  protocols: ReadonlyMap<string, ArchiveProtocol>,
): PressRepeats {
  const repeats = driving.timing.pressMinRepeats;
  if (repeats === 0) {
    return { refusal: 'the device states a repeat count of 0, which no Logitech compile here shows' };
  }
  for (const keycode of keycodes) {
    const protocol = catalogueProtocol(keycode, protocols);
    const stated = protocol?.pressMinimumRepeats ?? null;
    if (protocol !== undefined && stated !== null && stated !== repeats) {
      return {
        refusal: `the device states a repeat count of ${repeats} and its ${protocol.name} commands' family states `
          + `${stated}, and on such a device Logitech's compiler does not always use the device's number`,
      };
    }
  }
  return { repeats };
}

/**
 * How many times the rhythm table's whole block repeats the code, for each family whose definition states
 * no count and which the table holds a whole block for, section 350.
 *
 * **Why this exists.** Each row was measured off records Logitech compiled, so its block carries the count
 * those records repeat and gives it to every device: `Memorex 32 Bit` was measured on a Toshiba
 * television's records, written at 1, and the Dell 2300MP, which states 3 and was written at 3, got 1 on
 * all 34 of its ordinary records. The count is the device's, section 348, so where the device states
 * another number the command is built from the definition at the device's count instead,
 * `catalogueCommandBlocks`.
 *
 * **How each number was read**: by rebuilding the table's block of every distinct code of the family in
 * the archive from Logitech's definition at 0 to 6 repetitions, the count being the one at which the two
 * agree interval for interval, `sameTrain`. Each number is the count most of the family's codes that
 * rebuild at any count rebuild at. Of the 37520 distinct codes, 33264 rebuild at their family's number,
 * 22 at another one, every one of them a code whose own groups already state a frame more than once, and
 * 4234 at none; on `MemorexO1 32 Bit` and `Samsung 38 Bit` the ones that rebuild are a minority, 22 of
 * 3671 and 53 of 400, so their number rests on those. `make composecensus` prints the tally per family, and
 * a test names one code per family that rebuilds at its number and at no other. A family the generator
 * adds later and this map does not name is refused rather than given a guessed count.
 */
export const TABLE_PRESS_REPEATS: ReadonlyMap<string, number> = new Map([
  ['JVC 16 Bit', 3],
  ['Magnavox 13 Bit', 3],
  ['Memorex 32 Bit', 1],
  ['MemorexO1 32 Bit', 1],
  ['MemorexV2 32 Bit', 3],
  ['MemorexV2 32 Bit Dual', 3],
  ['Microsoft 30 Bit', 3],
  ['PanasonicV2 48 Bit', 3],
  ['Philips Hurd 16 Bit LongToggle', 3],
  ['Philips RC5 13 Bit Toggle', 3],
  ['Philips RECS80 11 Bit', 3],
  ['Pioneer 32 Bit', 3],
  ['Pioneer 32 Bit 2', 3],
  ['Pioneer 32 Bit Dual', 3],
  ['PioneerO1 32 Bit', 3],
  ['PioneerO1 32 Bit Dual', 3],
  ['RCAV1 LF 24 Bit', 3],
  ['Samsung 38 Bit', 1],
  ['Sharp 15 Bit', 3],
  ['Sharp 15 Bit 2', 3],
  ['Sharp 48 Bit 2', 3],
  ['Short 11 Bit 2', 3],
  ['Sony 15 Bit', 3],
  ['Sony 20 Bit', 3],
  ['Thomson 12 Bit Toggle', 3],
  ['Videocrypt 11 Bit Toggle', 3],
]);

/** A block's intervals with adjacent ones of a kind joined and the silence it opens with dropped. */
function trimmedTrain(pulses: readonly Pulse[]): Pulse[] {
  const merged = mergedIntervals(pulses);
  while (merged.length > 0 && !merged[0]!.mark) merged.shift();
  return merged;
}

/**
 * Whether two blocks send the same train: adjacent intervals of a kind joined, the silence a block opens
 * with dropped, and the last interval allowed to differ by the one microsecond a stored block ends in.
 *
 * **Why the microsecond is forgiven, and only there.** Logitech's compiler adds it to every block it
 * stores, section 230, and the definition route adds it too; the table's long toggle shape does not, so
 * `Philips Hurd 16 Bit LongToggle`'s table block is the definition's at 3 short of exactly that microsecond
 * on 1675 of its 1700 codes. Compared exactly it would read at no count. Over all 37520 distinct codes of
 * these families, that family's 1675 are the only ones this forgiveness changes.
 */
export function sameTrain(a: readonly Pulse[], b: readonly Pulse[]): boolean {
  const [x, y] = [trimmedTrain(a), trimmedTrain(b)];
  return x.length === y.length && x.every((one, at) => one.mark === y[at]!.mark
    && (one.us === y[at]!.us || (at === x.length - 1 && Math.abs(one.us - y[at]!.us) === 1)));
}

/**
 * Where the rhythm table composes a code whose family states no count, the blocks at the device's count:
 * `undefined` where the table's own block is at it, the definition's blocks at the device's count where
 * it is not, and a refusal where the two disagree about how many frames a press sends. Section 350.
 *
 * * **A family stating a count** is the table's: its row carries that count, sections 228 and 348.
 * * **A device whose count is not known**, `cataloguePressRepeats`'s two refusals, keeps the table's
 *   block, which is what it was composed with before this: what the compiler writes on such a device is
 *   `todo-process-logitech.md` 2.2.2 and 2.2.4, and refusing here would take away records the compiles
 *   show right, the Sony KE-50MR1E's 35 `Sony 15 Bit` ones at 3 among them.
 * * **Both blocks come from the definition**, the held one too, so a record is one source's and not two.
 *   On the Dell 2300MP both are Logitech's own, all 35 records whole, held power step included.
 * * **A code whose table block sends a different number of intervals from the definition's at the table's
 *   count is refused** at any other count. That is a disagreement about how many frames a press sends,
 *   which is the very thing in question: a `Magnavox 13 Bit` code with a start group only, three copies in
 *   the table and one from the definition, or a four frame `Microsoft 30 Bit` code. 252 of the 37520
 *   distinct codes are of this kind, the 22 that rebuild at another count among them, and no compile shows
 *   which a press sends at another count.
 * * **3989 of the other codes the definition does not rebuild differ only in a duration**, and those are
 *   built from the definition; 15 more it cannot build at all and they are refused. 3634 are
 *   `MemorexO1 32 Bit`'s, where the definition pads every copy to a
 *   constant 107600 microseconds and the row states a literal gap measured on three records that all carry
 *   twenty set bits, which only 22 of the family's codes in the archive do, section 228 corrected; that the
 *   definition's gap is what Logitech's compiler writes for the others is a reading of their definition
 *   and no compile here shows it. 347 are `Samsung 38 Bit`'s, a closing silence and on 133 a space
 *   between its two sections, not settled either way, and 8 `MemorexV2 32 Bit Dual`'s, a gap after a frame.
 */
function tableBlocksAtDeviceCount(
  keycode: string, read: StatedCode, press: PressRepeats, protocols: ReadonlyMap<string, ArchiveProtocol>,
  toggleFlipped: boolean,
): StatedBlocks | { readonly refusal: string } | undefined {
  const family = read.family;
  const protocol = protocols.get(family);
  if (protocol === undefined || protocol.pressMinimumRepeats !== null) return undefined;
  if ('refusal' in press) return undefined;
  const tabled = TABLE_PRESS_REPEATS.get(family);
  if (tabled === undefined) {
    return { refusal: `the rhythm table's count for ${family} has not been read, so its block's count is not known` };
  }
  if (tabled === press.repeats) return undefined;
  const table = blockOfStatedCode(read, undefined, 'once');
  const atTable = waveformOfArchiveCommand(protocol, keycode, { repeats: tabled, asStored: true });
  if (table !== undefined && !('refusal' in atTable)
    && trimmedTrain(table).length !== trimmedTrain(atTable.once).length) {
    return {
      refusal: `the rhythm table's block for this code and the definition at the table's ${tabled} send `
        + 'different numbers of frames, so how many a press sends at the device\'s count is not known',
    };
  }
  return blocksAtDeviceCount(protocol, keycode, press.repeats, toggleFlipped);
}

/** A command's blocks from its family's definition at the device's count, or why there are none. */
function blocksAtDeviceCount(
  protocol: ArchiveProtocol, keycode: string, repeats: number, toggleFlipped: boolean,
): StatedBlocks | { readonly refusal: string } {
  const built = waveformOfArchiveCommand(protocol, keycode, { repeats, asStored: true, toggleFlipped });
  if ('refusal' in built) return { refusal: built.refusal };
  if (built.once.length === 0) return { refusal: 'the code sends nothing on a press' };
  return {
    once: built.once,
    ...(built.held.length === 0 ? {} : { held: built.held }),
    // The release behind the record's third pointer, todo-process-logitech 2.5, which until then refused
    // the command: Logitech's compiles put it there, `StatedBlocks.release` carries the measurement.
    ...(built.release === undefined || built.release.length === 0 ? {} : { release: built.release }),
  };
}

/** Whether a catalogue code names a release group, its third: `G:<family>:(start)(repeat)(release)`. */
export function namesReleaseGroup(keycode: string): boolean {
  const groups = /^G:[^:]+:\(([^)]*)\)\(([^)]*)\)\(([^)]*)\)/.exec(keycode);
  return groups !== null && groups[3]!.trim() !== '';
}

/**
 * Whether the definition, at the count the rhythm table's row carries, sends the row's own first block for
 * a code the row composes: the family's stated count, or `TABLE_PRESS_REPEATS`'s for a family stating none.
 * The gate on moving a code naming a release group, or of a whole record row, from the row to the
 * definition, todo-process-logitech 2.5: only the blocks the row lacks may change, so a code whose first
 * block the two disagree about stays the row's. Judged on the code as stated, so its toggled group takes
 * the same route.
 */
function definitionKeepsTheRow(protocol: ArchiveProtocol, keycode: string, read: StatedCode): boolean {
  const count = protocol.pressMinimumRepeats ?? TABLE_PRESS_REPEATS.get(read.family);
  if (count === undefined) return false;
  const row = blockOfStatedCode(read, undefined, 'once');
  const built = waveformOfArchiveCommand(protocol, keycode, { repeats: count, asStored: true });
  return row !== undefined && !('refusal' in built) && built.once.length > 0 && sameTrain(row, built.once);
}

/**
 * The press's blocks for one command at the device's count: for a family the rhythm table holds no whole
 * block for, section 348, and for one it holds a block for at another device's count, section 350.
 * `undefined` where the table's block is the one to send; a refusal where neither is known.
 *
 * Read through `waveformOfArchiveCommand`, the one composition of a definition's readings, so the frames
 * are the ones `make prontocheck` holds against two million of the archive's renderings, sent as the code
 * states them rather than with the toggle cleared. **A command naming a release group gets the release as
 * its own block**, `StatedBlocks.release`, the record's third pointer, todo-process-logitech 2.5; it was
 * refused until then, on the ground that no compile here held one, and two families' compiles do.
 *
 * `toggleFlipped` gives the same command's blocks with its toggle bit flipped, by the same route: what a
 * record's second pointer group holds, `catalogueToggledCode`.
 */
export function catalogueCommandBlocks(
  keycode: string, press: PressRepeats, protocols: ReadonlyMap<string, ArchiveProtocol>,
  options: { readonly toggleFlipped?: boolean } = {},
): StatedBlocks | { readonly refusal: string } | undefined {
  const toggleFlipped = options.toggleFlipped === true;
  const read = catalogueCode(keycode, protocols);
  if (read === undefined) return { refusal: 'our keycode reader declines the code' };
  // **The table's whole block is for a code its family's name reads as well**, section 359. Every row was
  // measured or derived over such codes, `bin/protocols.ts` reading them by the name, so a code only the
  // definition's widths read is a shape no row was checked against: on 78 of them a row's block takes
  // the code and sends fewer frames than it states, or none. Those go to the definition at the device's
  // count below, the route of a family with no whole block, section 348.
  //
  //
  // **And so is a code naming a release group, or of a family whose row is a whole record shape, where the
  // definition sends the row's own first block**, todo-process-logitech 2.5, section 365. No row holds a
  // release, and the `quad`, `longToggle` and `sections` rows build no held block, where Logitech's compiles
  // hold both: the release behind the record's third pointer on a `Logitech 24 Bit` code of the Sony
  // PlayStation 3, and a held block on every record but the power steps and copies of the Yamaha DVD-S501,
  // the Microsoft VIP2250 and the Samsung BDC8000 on a Harmony One, which got none of their records whole from the row and 44 of 46, 36 of
  // 37 and 34 of 35 from the definition. The definition states both, so such a code goes below.
  //
  // **Only where the two agree about the first block**, `definitionKeepsTheRow`: the definition at the row's
  // count sends the row's train, so what moves is the block the row lacks and nothing it measured. Where
  // they disagree, `Samsung 38 Bit`'s durations section 350 left unsettled among them and `Magnavox 13 Bit`
  // codes whose release group names another value, no compile here shows which a press sends, so those
  // keep the row's block as before, without a held block or a release.
  const named = statedCode(keycode) !== undefined;
  const entry = statedProtocol(read.family);
  const wholeRecord = entry !== undefined
    && (entry.quad !== undefined || entry.longToggle !== undefined || entry.sections !== undefined);
  const byTable = named && composableKeycode(keycode, read);
  const own = catalogueProtocol(keycode, protocols);
  const rerouted = byTable && (namesReleaseGroup(keycode) || wholeRecord) && own !== undefined
    && definitionKeepsTheRow(own, keycode, read);
  if (byTable && !rerouted) return tableBlocksAtDeviceCount(keycode, read, press, protocols, toggleFlipped);
  if (entry === undefined) return { refusal: `no rhythm for ${read.family}` };
  // **A rerouted code keeps the count the row's block carried** where the device's would not be used for
  // it, as `tableBlocksAtDeviceCount` does: a family stating its own count is built at that count whatever
  // the device states, its row carrying it, sections 228 and 348; and on a device whose count is not known
  // a family stating none is built at `TABLE_PRESS_REPEATS`'s. Without this a code the table composed would
  // be refused on such a device. A code the table did not compose takes the device's count as before, so the
  // refusals of todo-process-logitech 2.2.3 are untouched.
  if (rerouted) {
    const count = own!.pressMinimumRepeats ?? ('refusal' in press ? TABLE_PRESS_REPEATS.get(read.family) : press.repeats);
    if (count !== undefined) return blocksAtDeviceCount(own!, keycode, count, toggleFlipped);
  }
  // **A code the name reads and the family's whole block does not take goes to the definition too**,
  // section 361, which until then refused it: 87 commands of four families, a `Pioneer 32 Bit Dual` code
  // stating one value where the row's block names two, `Philips Hurd 16 Bit LongToggle` and `Galaxis 16
  // Bit Quad Toggle` codes stating three frames where the row's shape takes one, and `Entone 56 Bit` codes
  // stating their value in the start group where the row's block sends the repeat group's. The ground is
  // the one above: the row holds no evidence for a shape it does not take, and the definition states it.
  // The refusal covered a `sections` row too, `Samsung 38 Bit`'s, whose block refused no code. On the codes
  // the four rows do take, the definition at the row's count sends the row's own train on 4797 of 4834; and
  // Logitech's compiles of the two catalogue devices here holding such a code, a Pioneer receiver and a
  // Philips television on a Harmony One, hold the definition's block word for word.
  if ('refusal' in press) return press;
  const protocol = catalogueProtocol(keycode, protocols);
  if (protocol === undefined) return { refusal: `the archive holds no definition of ${read.family}` };
  return blocksAtDeviceCount(protocol, keycode, press.repeats, toggleFlipped);
}

/**
 * A catalogue code with its toggle bit flipped, as the composer takes it for a record's **second pointer
 * group**, todo-process-logitech 2.5: the flipped reading, and its blocks by the route the code's own took,
 * `catalogueCommandBlocks` with `toggleFlipped`, so the table's block where the code's own is the table's.
 * `undefined` for a code whose family's definition states no toggle bit or states one outside its frames.
 *
 * **What Logitech's compiler writes.** On every record of a toggle family in every compile in the lab, the
 * record holds two groups and the second is the first with the toggle bit flipped, in its first and held
 * blocks; none in the lab has a tail. The first is the code as the catalogue states it, which a code stating its toggle bit set shows,
 * `withToggleFlipped` in `archive.ts`. The firmware alternates the two per device, section 365.
 */
export function catalogueToggledCode(
  keycode: string, press: PressRepeats, protocols: ReadonlyMap<string, ArchiveProtocol>,
): ToggledCode | { readonly refusal: string } | undefined {
  const protocol = catalogueProtocol(keycode, protocols);
  const read = catalogueCode(keycode, protocols);
  if (protocol === undefined || read === undefined) return undefined;
  const frames = withToggleFlipped(protocol, read.frames);
  if (frames === undefined) return undefined;
  const blocks = catalogueCommandBlocks(keycode, press, protocols, { toggleFlipped: true });
  if (blocks !== undefined && 'refusal' in blocks) return blocks;
  return { read: { ...read, frames }, ...(blocks === undefined ? {} : { blocks }) };
}

/**
 * A catalogue code as the composer reads it: at the widths and in the bases its family's definition
 * states, `statedCodeOfDefinition`, and at the name's only for a family the archive defines none of.
 * **The definition is found by `catalogueProtocol`**, so a code spelling its family in another letter case
 * or with a trailing space is read by its definition and carries the definition's name as its `family`,
 * which is what the rhythm table is looked up by; 221 commands of four such spellings were refused as having no
 * rhythm until section 361, and a fifth spelling's one command is refused for its device's count of 0. Section 359.
 *
 * **Why the definition and not the name.** The composer read every code at the widths the family's name
 * spells until section 359, and so refused 52658 commands of 156 families as unreadable: a name such as
 * `Russound 9 Bit Quad` gives the digit count, `Motorola 16 Bit Hex`, whose values are 32 bits, neither
 * count, and `Philips RC5Ex` no number at all, sections 231 and 233. On the codes both read, the table's block is the same under either reading on 101369
 * of 101593 and differs on 224, all of `Motorola 16 Bit Quad Toggle`, `Kathrein 16 Bit Quad Toggle` and
 * `Pace 18 Bit Quad Toggle`, whose toggle field the name made sixteen bits wide where the definition makes
 * it one: the name's block is the definition's at no count, the definition's at the count the family
 * states, 1.
 */
export function catalogueCode(
  keycode: string, protocols: ReadonlyMap<string, ArchiveProtocol>,
): StatedCode | undefined {
  const protocol = catalogueProtocol(keycode, protocols);
  if (protocol === undefined) return statedCode(keycode);
  const read = statedCodeOfDefinition(protocol, keycode);
  return read === undefined || read.family === protocol.name ? read : { ...read, family: protocol.name };
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
