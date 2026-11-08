/**
 * A device record in the shape a Harmony Touch reads, written by our code from a catalogue entry of the third party
 * archive of Logitech's device database and from our own rhythm table: `todo-touch.md` 9.1.
 *
 * **Why this exists.** 8.6 composed the whole bench setup from a description, and carried each device's record whole
 * from the set the remote held, Logitech's documents: its commands with their codes, its features and the code
 * definitions under Logitech's protocol ids, `catalogueOfSet` in `setup.ts`. 9.1 builds every document with no Logitech
 * document as input, so the record has to come from somewhere else. A person picks a device by its maker and model, and
 * what that brings, its commands, its power steps, its inputs, its states and its timing, is exactly what the archive
 * holds per catalogue entry since its schema version 2, every value on the one record checked equal to what Logitech's
 * service answered, `driving.ts`. So this reads the entry through the codec's own readers, `catalogueDevice`,
 * `catalogueCommands` and `catalogueDriving`, handed in as a `CatalogueSource`, and writes the Touch's record from
 * what they give.
 *
 * **What crosses from the archive, and how, decision 15.** Names and numbers only, through our readers: each command's
 * name and the family and numbers of its code, which `statedCode` parses out of the keycode text; the device's maker,
 * model and type; its timing; the steps of its power, inputs, channel tuning and states, as `driving.ts` reads them.
 * **No definition crosses.** Each code is written into a definition of ours, `definitionOfRow` over the rhythm table's
 * row for the family the code names, under a protocol id of ours, and the code's numbers into that definition by
 * `keyCodeText`, so the durations a Touch sends come from our table and not from Logitech's definition. A family the
 * caller has not given an id for is refused rather than looked up, so the families a set sends are stated by the
 * caller, the setup file, and checked against the codes. Everything taken from the archive is **stated and
 * unverified**: Logitech's catalogue as a third party archived it, and decision 11 holds, nothing derived from it may be
 * shared through a community device database.
 *
 * **Which field comes from where**, the attribution 9.3 counts:
 *
 * | field | written from |
 * |---|---|
 * | `Device.Manufacturer`, `Model`, `ParentDeviceManufacturer`, `ParentDeviceModel` | the archive entry's maker and model |
 * | `Device.DeviceType` | the archive entry's type, which the screens name and picture the device by |
 * | `Device.InterKeyDelay`, `InterDeviceDelay` and their `Default...`, `PressMinRepeats` | the archive's timing; the setup file's own choice is written over the first three by `composeTouchSetup` |
 * | `Device.Transport`, `ControlPort`, `IsMultiCode`, `IsScartCableSupported` | constants of ours: infrared, the remote's own lamp, one code set, no Scart |
 * | `Device.Id-`, `Name` | the caller, ours |
 * | a command's `Name` | the archive's command name |
 * | a command's `KeyCode`, `ProtocolId` | `keyCodeText` into our definition of the code's family, under our id |
 * | a command's `TransportType`, `Raw` | constants of ours: infrared, null |
 * | `ProtocolList` entries | `definitionOfRow` over our rhythm table's row |
 * | `PowerFeature` | the archive's power type and steps and its power on delays |
 * | `InputFeature` | the archive's inputs, their steps and its input delay, or one with no inputs where the archive states none |
 * | `ChannelTuningFeature` | the archive's channel tuning, or one with nothing in it where the archive states none |
 * | `InternalStateFeature` | each of the archive's states, its values and their steps |
 *
 * **What the archive does not hold, and so this leaves out**: a command's `FunctionId-`, Logitech's number for what a
 * command does, which the screens draw an entry's icon by, `functionIdOf` in `compose.ts`; a device's `Icon`,
 * `SuggestedDisplay` and `DeviceTypeDisplayName`, which the engine reads into its own description of the device and its
 * answers to other clients only; the outputs feature, which the engine ignores; and every field the reference lists as
 * read by nothing, `devices-and-infrared.md` "What a writer must carry". 9.1's comparison with 8.6's set names each.
 *
 * **Nothing here is about one remote's family of configurations**: the Harmony Touch reads these documents and nothing
 * else does, so this folder is the Touch's own, and no family of `families/` is asked anything. Which architectures:
 * the Harmony Touch alone, firmware 4.15.330; its firmware reports 17 and Logitech's templates file it under 18.
 */
import { ArchiveError } from '../../archive.ts';
import type { CatalogueDevice, CatalogueSource } from '../../catalogue.ts';
import type { DeviceDriving, DeviceState, DriveStep } from '../../driving.ts';
import { statedCode, statedProtocol } from '../../stated.ts';
import { ComposeRefusal, isOwnId, OWN_IDS } from './compose.ts';
import { definitionOfRow, isDefinitionRefusal, keyCodeText } from './definition.ts';
import type { Command, DeviceFeature, DeviceWithFeatures, FeatureAction, IrProtocol } from './documents.ts';

/** Infrared, the one transport a device of ours has, as Logitech's records state for theirs. */
const INFRARED = 1;

/**
 * Logitech's `PowerTypeId` for each power kind the archive names, as the bench set's records pair them: a discrete
 * device 1, a toggled one 2. The engine treats 0 and 3 as power by hand, `getStatesConfiguration`, which is what a
 * device the catalogue says has no power control is; `unknown` is refused, since nothing says which of the two it is.
 */
const POWER_TYPE_IDS: Readonly<Record<string, number>> = { discrete: 1, toggle: 2, none: 0 };

/** Where a device record comes from: its catalogue entry, `<manufacturer slug>/<file>` in the archive. */
export interface ArchiveDeviceRequest {
  /** The archive entry, as a recipe's `device` names it: `LG/OLED65G36LA`. */
  readonly entry: string;
  /** The device's id, ours, `OWN_IDS`. */
  readonly id: number;
  /** The protocol id of ours each family the device's codes name is written under; a family not here is refused. */
  readonly protocolIds: Readonly<Record<string, number>>;
}

/** A record written from the archive: the device list's entry, and each definition its commands name, once. */
export interface ArchiveDeviceRecord {
  readonly record: DeviceWithFeatures;
  readonly protocols: readonly IrProtocol[];
}

/**
 * A step's command name as the device's own command list spells it, where the two differ only in case: the archive's
 * steps spell some names otherwise than its code set does (the Denon's `InputTvAudio` against `InputTVAudio`), and
 * though the engine folds both to lower case, `getActionItems` and `getCommandsAndToggleBytes`, the screens look a
 * command up by its exact name, `getButtonTransportType`, so a step names it as the list does. A name the list does
 * not hold, an empty one among them, is kept as it stands.
 */
type Spelling = (name: string) => string;

/** One step of the archive's as a step of a feature's list, at its place in the list. */
function actionOf(step: DriveStep, order: number, spell: Spelling): FeatureAction {
  switch (step.kind) {
    case 'send':
      return { __type: 'IRPressAction', Order: order, Duration: step.holdMs ?? null, IRCommandName: spell(step.command) };
    case 'hold':
      return { __type: 'IRHoldAction', Order: order, IRCommandName: spell(step.command) };
    case 'wait':
      return { __type: 'IRDelayAction', Order: order, Delay: step.ms };
    case 'state':
      // `DevActionType` 2 is a value set, 1 would force it, `getActionItems`; the archive's `set` is the former.
      return { __type: 'IRDevAction', Order: order, DevActionType: 2, StateName: step.state, StateValue: step.value } as FeatureAction;
  }
}


/**
 * The features of a device, in the order Logitech's records list them on the bench set: inputs, power, channel tuning,
 * then each state of the device's own. `deviceId` is written into each, as every feature of Logitech's names its device.
 */
export function featuresOfDriving(driving: DeviceDriving, deviceId: number, spell: Spelling = (name) => name): DeviceFeature[] {
  const actionsOf = (steps: readonly DriveStep[] | undefined): FeatureAction[] | null =>
    steps === undefined ? null : steps.map((step, order) => actionOf(step, order, spell));
  const out: DeviceFeature[] = [];
  const t = driving.timing;
  // An input feature on every device, with no inputs where the catalogue states none, as Logitech's records give one to
  // every device of the bench set: input type 0, which the engine takes as inputs chosen by name, with nothing to choose.
  {
    const i = driving.inputs;
    out.push({
      __type: 'InputFeature',
      'DeviceId-': deviceId,
      InputType: i?.type ?? 0,
      InputDelay: t.inputDelay,
      DefaultInputDelay: t.inputDelay,
      Inputs: i?.list === undefined ? null : i.list.map((one, k) => ({
        InputName: one.name,
        InputOrder: k + 1,
        IsActiveInput: true,
        IsOnline: false,
        // 1 a list sent every time the input is chosen, 2 one sent only on a change, `getStatesConfiguration`; the
        // archive states no kind, and every input of the bench set that sends anything states 1.
        ActionSetTypeId: one.commands === undefined ? 0 : 1,
        Actions: actionsOf(one.commands),
      })),
      StartActions: actionsOf(i?.start),
      FinishActions: actionsOf(i?.finish),
      NextActions: actionsOf(i?.next),
      PreviousActions: actionsOf(i?.previous),
    } as DeviceFeature);
  }
  if (driving.power !== undefined) {
    const p = driving.power;
    const type = POWER_TYPE_IDS[p.type];
    if (type === undefined) throw new ComposeRefusal(`the catalogue states a power of kind ${p.type}, which is neither discrete, toggled nor none`);
    out.push({
      __type: 'PowerFeature',
      'DeviceId-': deviceId,
      PowerTypeId: type,
      PowerOnDelay: t.powerOnDelay ?? 0,
      DefaultPowerOnDelay: t.powerOnDelay ?? 0,
      ConnectedAppPowerOnDelay: t.connectedAppPowerOnDelay,
      IsPowerAlwaysOn: false,
      IsPoweredOnBetweenActivities: false,
      PowerOnSetType: 0,
      PowerOffSetType: 0,
      PowerOnActions: actionsOf(p.on),
      PowerOffActions: actionsOf(p.off),
      PowerToggleActions: actionsOf(p.toggle),
      PowerOnResetActions: actionsOf(p.onReset),
    } as DeviceFeature);
  }
  // A channel tuning feature on every device, empty where the catalogue states none, as Logitech's records give one to
  // every device of the bench set: the engine keeps a channel state for each that has one, and a channel step to a
  // device with no such state is not a case its reading covers.
  const c = driving.channelTuning;
  out.push({
    __type: 'ChannelTuningFeature',
    'DeviceId-': deviceId,
    FixedDigits: c?.fixedDigits ?? null,
    StartActions: actionsOf(c?.start),
    FinishActions: actionsOf(c?.finish),
    GreaterTenActions: actionsOf(c?.greaterTen),
    GreaterHundredActions: actionsOf(c?.greaterHundred),
  });
  for (const [name, s] of driving.states ?? new Map<string, DeviceState>()) {
    out.push({
      __type: 'InternalStateFeature',
      'DeviceId-': deviceId,
      StateName: name,
      // Each way of reaching a value is one entry under the value's name, as the engine reads them: set type 1 sent
      // every time, 2 sent on a change, 0 neither; a value no way reaches is one entry of set type 0.
      StateValues: s.values.flatMap((v) => (v.select === undefined || v.select.length === 0
        ? [{ StateValueName: v.name, ActionSetType: 0, Actions: [] as FeatureAction[] }]
        : v.select.map((w) => ({ StateValueName: v.name, ActionSetType: w.setType, Actions: actionsOf(w.steps) ?? [] })))),
      StartActions: actionsOf(s.start),
      FinishActions: actionsOf(s.finish),
      NextActions: actionsOf(s.next) ?? [],
      PreviousActions: actionsOf(s.previous) ?? [],
      ValueDelay: s.valueDelay ?? null,
    } as DeviceFeature);
  }
  return out;
}

/**
 * The device record of a catalogue entry, its commands written into definitions of ours, and those definitions.
 *
 * **Refuses**, naming the entry and the command and never quoting a code: an id that is not ours; an entry the archive
 * does not hold, by maker or by file, or one with no codes; a keycode `statedCode` cannot read; a code naming a family the caller gave no id
 * for, or one the rhythm table holds no row of; a protocol id that is not ours or that two families share; a row
 * `definitionOfRow` cannot write, and a code `keyCodeText` cannot write into it; and two commands whose names differ only
 * in case, of which the engine keeps the later.
 */
export function deviceRecordOfArchive(archive: CatalogueSource, request: ArchiveDeviceRequest): ArchiveDeviceRecord {
  const { entry, id } = request;
  if (!isOwnId(id)) throw new ComposeRefusal(`device id ${id} is not one of ours, ${OWN_IDS.first} to ${OWN_IDS.last}`);
  const slash = entry.indexOf('/');
  if (slash <= 0 || slash === entry.length - 1) throw new ComposeRefusal(`"${entry}" is not a catalogue entry, a manufacturer and a file joined by a slash`);
  const slug = entry.slice(0, slash);
  const file = entry.slice(slash + 1);
  let found: CatalogueDevice;
  try {
    found = archive.device(slug, file);
  } catch (e) {
    // The archive's own error, turned into the refusal a caller of this folder catches, so a misspelt entry in a setup
    // file is reported as the file's mistake rather than as a stack.
    if (e instanceof ArchiveError) throw new ComposeRefusal(`${entry}: the archive holds no such entry, ${e.message}`);
    throw e;
  }
  if (found.codeset === undefined) throw new ComposeRefusal(`${entry}: the catalogue holds no codes for it`);
  if (found.model === null) throw new ComposeRefusal(`${entry}: the catalogue states no model`);
  const ids = new Map<string, string>();
  for (const [family, pid] of Object.entries(request.protocolIds)) {
    if (!isOwnId(pid)) throw new ComposeRefusal(`protocol id ${pid} for ${family} is not one of ours, ${OWN_IDS.first} to ${OWN_IDS.last}`);
    const other = ids.get(String(pid));
    if (other !== undefined) throw new ComposeRefusal(`protocol id ${pid} is given to both ${other} and ${family}`);
    ids.set(String(pid), family);
  }

  const definitions = new Map<string, IrProtocol>();
  const definitionOf = (family: string, where: string): IrProtocol => {
    const known = definitions.get(family);
    if (known !== undefined) return known;
    const pid = request.protocolIds[family];
    if (pid === undefined) throw new ComposeRefusal(`${where}: its code is of the family ${family}, which the setup names no protocol id for`);
    const row = statedProtocol(family);
    if (row === undefined) throw new ComposeRefusal(`${where}: the rhythm table holds no row of ${family}`);
    const written = definitionOfRow(row, pid);
    if (isDefinitionRefusal(written)) throw new ComposeRefusal(`${where}: ${family} is not written as a definition, ${written.refusal}`);
    definitions.set(family, written);
    return written;
  };

  const folded = new Map<string, string>();
  const commands: Command[] = archive.commands(found.codeset).map((c) => {
    const where = `${entry} ${c.name}`;
    const before = folded.get(c.name.toLowerCase());
    if (before !== undefined) throw new ComposeRefusal(`${entry}: two commands are named "${before}" and "${c.name}", which the engine keeps as one`);
    folded.set(c.name.toLowerCase(), c.name);
    const code = statedCode(c.keycode);
    if (code === undefined) throw new ComposeRefusal(`${where}: its keycode does not read as a family and numbers`);
    const definition = definitionOf(code.family, where);
    const keyCode = keyCodeText(code, definition);
    if (typeof keyCode !== 'string') throw new ComposeRefusal(`${where}: its code is not written into our ${code.family} definition, ${keyCode.refusal}`);
    // Both `KeyCode` and `Raw` are written, null where they do not apply: a missing `Raw` stops the engine and a
    // missing `KeyCode` makes the command unsendable, "What a writer must carry".
    return { Name: c.name, KeyCode: keyCode, ProtocolId: definition['Id-'], TransportType: INFRARED, Raw: null };
  });

  const driving = archive.driving(slug, file);
  const t = driving.timing;
  const spell: Spelling = (name) => folded.get(name.toLowerCase()) ?? name;
  const record: DeviceWithFeatures = {
    Device: {
      'Id-': id,
      Name: found.model,
      Manufacturer: found.manufacturer,
      Model: found.model,
      DeviceType: found.deviceType,
      Transport: INFRARED,
      ControlPort: 0,
      PressMinRepeats: t.pressMinRepeats,
      InterKeyDelay: t.interKeyDelay,
      InterDeviceDelay: t.interDeviceDelay,
      // What the delay screens reset to: the catalogue's own timing, as Logitech's records state it.
      DefaultInterKeyDelay: t.interKeyDelay,
      DefaultInterDeviceDelay: t.interDeviceDelay,
      // Read by the screens alone; a device of the catalogue is its own parent and one code set.
      ParentDeviceManufacturer: found.manufacturer,
      ParentDeviceModel: found.model,
      IsMultiCode: false,
      IsScartCableSupported: false,
    },
    DeviceFeatures: featuresOfDriving(driving, id, spell),
    Commands: commands,
  };
  return { record, protocols: [...definitions.values()] };
}
