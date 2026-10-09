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
import type { Container } from './gspm.ts';
import { parse } from './gspm.ts';
import {
  catalogueCommands,
  catalogueDevice,
} from './catalogue.ts';
import { catalogueDriving, type DeviceDriving } from './driving.ts';
import { archiveProtocols, waveformOfArchiveCommand, type ArchiveProtocol } from './archive.ts';
import { statedCode, statedProtocol } from './stated.ts';
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
} from './compose.ts';
import { devices, stateVariables } from './inventory.ts';

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
  /** Compose the catalogue's inputs and states too, section 321, arch 14 only. Default false. */
  readonly inputs?: boolean;
  /** Arch 14: the two delays in tenths, which win over the catalogue's. */
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
 * Compose one catalogue device onto `c`, unstamped. This is `compose-device.ts` without the command
 * line, step for step: the commands, the power, the inputs, the device, its inputs, the off lists, the
 * screen. A refusal is a `ComposeError` naming why.
 */
export function composeCatalogueDevice(
  c: Container, archive: string, request: CatalogueDeviceRequest,
): ComposedCatalogueDevice {
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

  // A code whose family states no repeat count is composed at the device's count, section 347, from the
  // family's definition in the archive; the device's count is judged once, over its whole codeset.
  const driving = catalogueDriving(archive, manufacturer, model);
  const protocols = archiveProtocolsByName(archive);
  const press = cataloguePressRepeats(driving, available.map((one) => one.keycode), protocols);
  const derived = new Map<string, ReturnType<typeof catalogueCommandBlocks>>();
  const blocksOf = (keycode: string) => {
    if (!derived.has(keycode)) derived.set(keycode, catalogueCommandBlocks(keycode, press, protocols));
    return derived.get(keycode);
  };
  /** True where the table composes the code or its blocks were derived at the device's count. */
  const composable = (keycode: string): boolean => {
    const blocks = blocksOf(keycode);
    return blocks === undefined || !('refusal' in blocks);
  };
  /** The command as the composer takes it, its derived blocks attached where it has them. */
  const withBlocks = <T extends { stated: string }>(one: T): T => {
    const blocks = blocksOf(one.stated);
    return blocks === undefined || 'refusal' in blocks ? one : { ...one, blocks };
  };

  // Under `full`, every name whose code composes, in catalogue order; the layout is computed over all
  // of them, as the compiler's is, and a command left out leaves its place to the next.
  const layout = full ? deviceModeLayout([...byName.keys()]) : undefined;
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
  const device = composeDevice(c, {
    label, commands: [...commands, ...inputCommands], power: powerIndex,
    ...(power === undefined ? {} : {
      powerOn: power.powerOn, powerOff: power.powerOff, interKeyDelay: power.interKeyDelay,
    }),
    ...(powerOnDelay === undefined ? {} : { powerOnDelay }),
    ...(interDeviceDelay === undefined ? {} : { interDeviceDelay }),
  });
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
    catalogue: { manufacturer: entry.manufacturer, model: entry.model ?? model, commands: available.length },
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
      one = composeCatalogueDevice(current, archive, request);
    } catch (error) {
      if (!(error instanceof ComposeError) || k === 0) throw error;
      throw new ComposeError(`${request.label}, after ${k} composed in this run: ${error.message}`);
    }
    composed.push(one);
    current = parse(one.bytes);
  }
  return { bytes: current.blob, devices: composed, variables: finalVariables(current, composed) };
}

// ---------------------------------------------------------------------------------------------------
// How many times a press repeats the code, where the family does not say: the device does, section 347

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

/** A device's press count for the families that state none, or why it is not known. */
export type PressRepeats = { readonly repeats: number } | { readonly refusal: string };

/**
 * How many times one press of this device sends the repeating part of a code whose family's definition
 * states no count: the device's own `timing.pressMinRepeats`, or a refusal where the compiles do not say.
 *
 * **What the count is.** A press is the start group once, the repeat group this many times, and the
 * release group, which is the archive README's reading of the hub's infrared engine and the one
 * `blockOfDefinition` builds. Section 347 scored it against every Logitech compile in the lab whose
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
    const family = /^G:([^:]+):/.exec(keycode)?.[1];
    const stated = family === undefined ? null : protocols.get(family)?.pressMinimumRepeats ?? null;
    if (stated !== null && stated !== repeats) {
      return {
        refusal: `the device states a repeat count of ${repeats} and its ${family} commands' family states `
          + `${stated}, and on such a device Logitech's compiler does not always use the device's number`,
      };
    }
  }
  return { repeats };
}

/**
 * The press's blocks for one command whose family the rhythm table holds no whole block for, at the
 * device's count; `undefined` where the table composes the command itself; a refusal otherwise.
 *
 * Read through `waveformOfArchiveCommand`, the one composition of a definition's readings, so the frames
 * are the ones `make prontocheck` holds against two million of Logitech's renderings, sent as the code
 * states them rather than with the toggle cleared. **A command naming a release group is refused**: a
 * configuration's record has a pointer for it, section 233, and no compile here holds one, so where
 * Logitech's compiler puts it is not seen.
 */
export function catalogueCommandBlocks(
  keycode: string, press: PressRepeats, protocols: ReadonlyMap<string, ArchiveProtocol>,
): StatedBlocks | { readonly refusal: string } | undefined {
  if (composableKeycode(keycode)) return undefined;
  const read = statedCode(keycode);
  if (read === undefined) return { refusal: 'our keycode reader declines the code' };
  const entry = statedProtocol(read.family);
  if (entry === undefined) return { refusal: `no rhythm for ${read.family}` };
  if (entry.tail !== undefined || entry.quad !== undefined || entry.longToggle !== undefined
    || entry.sections !== undefined) {
    return { refusal: `${read.family}'s block does not take this code` };
  }
  if ('refusal' in press) return press;
  const protocol = protocols.get(read.family);
  if (protocol === undefined) return { refusal: `the archive holds no definition of ${read.family}` };
  const built = waveformOfArchiveCommand(protocol, keycode, { repeats: press.repeats, asStored: true });
  if ('refusal' in built) return { refusal: built.refusal };
  if (built.release !== undefined) {
    return { refusal: 'the code names a release group, which no Logitech compile here shows stored' };
  }
  if (built.once.length === 0) return { refusal: 'the code sends nothing on a press' };
  return { once: built.once, ...(built.held.length === 0 ? {} : { held: built.held }) };
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
    const identifier = one.device.delay?.identifier;
    const byName = new Map<string, number>();
    for (const variable of all) {
      const name = variable.name;
      const delay = DELAY_VARIABLE.exec(name);
      // `<label>_<property>_<values>` with a property of no underscore, so that a composed `Panasonic`
      // does not claim an existing `Panasonic_TV_Power_2`.
      const rest = name.startsWith(`${label}_`) ? name.slice(label.length + 1) : undefined;
      const mine = (rest !== undefined && /^[^_]+_\d+$/.test(rest))
        || (delay !== null && identifier !== undefined && Number(delay[2]) === identifier);
      if (mine) byName.set(name, variable.index);
    }
    const power = byName.get(`${label}_Power_2`);
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
