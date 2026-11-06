/**
 * A whole Harmony Touch setup composed by us from a description, every device and every activity, onto a set of
 * documents with all of them taken out: `todo-touch.md` 8.6.
 *
 * **What a setup is, in one paragraph.** A person sets a Touch up by picking each device by its maker and model, which
 * brings the catalogue's record of it, its commands and their codes, its inputs and its power steps; then by changing
 * what they want of each, its name, its delays, its keys and its screen list; and then by building activities from the
 * devices. So a setup is two kinds of thing, and this module keeps them apart: **the catalogue's**, which a person
 * picks and does not write, and **the person's**, which the description states and this module composes.
 *
 * **The catalogue here is the recorded documents.** Logitech's service is where a device's record comes from, and the
 * only copy of the bench setup's records is the set the remote holds, so `catalogueOfSet` reads a set's device and
 * protocol lists as a catalogue, keyed by maker and model, the way 8.1 took its own device's definition from our rhythm
 * table. A program with no account takes them from elsewhere; what crosses from the catalogue is the same either way.
 *
 * **Which fields are carried from the catalogue and which are composed, and why.**
 *
 * * **Composed from the description**, being what the person chose: a device's id (ours, `OWN_IDS`), name, maker and
 *   model (which also find its catalogue record), control port, press repeat count, its two delays, its power on delay,
 *   whether it is kept on between activities and always on, its input delay, and its own map; an activity, all of it,
 *   through `composeTouchActivity`; and every map, through `composeButtons`.
 * * **Carried from the catalogue record**, unchanged but for the device's id where a feature names it: every other field
 *   of the device record, its features (inputs, power, channel tuning, states of its own, outputs, with their steps),
 *   its commands with their codes, and the definitions those commands name, under the catalogue's own protocol ids,
 *   which the commands name them by. These are what a person does not write; the codes are the catalogue's
 *   (`devices-and-infrared.md`, "The definitions it works from are Logitech's own catalogue definitions").
 * * **Two of the carried fields are the account's rather than the catalogue's**, `DeviceProfileUri` and
 *   `ContentProfileKey`: the address and the key of the device's favourites documents. The favourites documents are
 *   not among the six and the remote keeps them, so the tuning device composed here carries the pair the remote's
 *   favourites documents are under, or the favourites page would find none. In Logitech's documents the key is the
 *   device's own id and the address holds it; under an id of ours the two no longer match it, and the screens' reader
 *   of the favourites, `favoritesmanager.lua`, takes the pair by the device's id and so still finds them.
 *
 * **The base** is the set with every device, map, activity and definition taken out, `setupBaseOf`: the documents'
 * shells, Context and Settings as they are. **8.5's removal does not reach it and is not changed to**: it refuses
 * taking out every device, every shown activity, the favourites' tuning device and its activity, each because a set
 * that ends like that would mishandle the remote, `remove.ts`. The base is never a set a remote is given; a whole setup
 * is composed onto it and the result goes through the gate like any other. So the base is made by emptying the four
 * lists, and the removal's refusals stay as they are.
 *
 * **Which architectures**: the Harmony Touch alone, firmware 4.15.330; its firmware reports 17 and Logitech's templates
 * file it under 18. **Nothing here sends anything.**
 */
import type { ActivityList, DeviceList, DeviceWithFeatures, Id, IrProtocol, MapList, ProtocolList, SyncDocuments } from './documents.ts';
import { idText, kindOf } from './documents.ts';
import { mapIdentifier, readConfiguration } from './read.ts';
import {
  ACTIVITY_TYPES, ComposeRefusal, composeButtons, composeTouchActivity, functionIdOf, isOwnId, OWN_IDS, withTouchActivity,
  type ActivityRoleKind, type ActivityTypeName, type OwnActivity, type OwnActivityCommand, type OwnActivityDevice,
  type OwnActivityStep, type OwnButton, type OwnPress, type OwnSequence, type TouchButtonKey, type TouchGestureKey,
} from './compose.ts';

type Json = Record<string, unknown>;
const isRecord = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x);
const copyOf = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const listIn = (doc: unknown, field: string): Json[] | undefined => {
  const list = isRecord(doc) ? doc[field] : undefined;
  return Array.isArray(list) ? (list as Json[]) : undefined;
};

/** The four documents a device or an activity is named in, each with the field that holds its list. */
export const SETUP_LISTS = [
  ['ActivityList', 'Activities'], ['DeviceList', 'DevicesWithFeatures'], ['MapList', 'ButtonMaps'], ['ProtocolList', 'Protocols'],
] as const;

/**
 * The base a whole setup is composed onto: `documents` with the four lists emptied and everything else as it stands,
 * Context and Settings among it. Refuses documents lacking one of the four lists. Never delivered: the header says why.
 */
export function setupBaseOf(documents: SyncDocuments): SyncDocuments {
  const out: Record<string, unknown> = { ...documents };
  for (const [document, field] of SETUP_LISTS) {
    if (listIn(documents[document], field) === undefined) throw new ComposeRefusal(`${document} holds no list of ${field}`);
    out[document] = { ...copyOf(documents[document] as Json), [field]: [] };
  }
  return out as SyncDocuments;
}

// ---------------------------------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------------------------------

/** Device records and code definitions a setup picks from, by maker and model and by protocol id. */
export interface TouchCatalogue {
  readonly devices: readonly DeviceWithFeatures[];
  readonly protocols: readonly IrProtocol[];
}

/** A set's device and protocol lists read as a catalogue, copied, so a setup composed from it never reaches them. */
export function catalogueOfSet(documents: SyncDocuments): TouchCatalogue {
  return {
    devices: copyOf(listIn(documents.DeviceList, 'DevicesWithFeatures') ?? []) as unknown as DeviceWithFeatures[],
    protocols: copyOf(listIn(documents.ProtocolList, 'Protocols') ?? []) as unknown as IrProtocol[],
  };
}

/** The catalogue's record of a maker's model, or a refusal when it holds none or several. */
function catalogueRecord(catalogue: TouchCatalogue, manufacturer: string, model: string): DeviceWithFeatures {
  const found = catalogue.devices.filter((d) => d.Device.Manufacturer === manufacturer && d.Device.Model === model);
  if (found.length !== 1) throw new ComposeRefusal(`the catalogue holds ${found.length === 0 ? 'no' : found.length} record${found.length === 1 ? '' : 's'} of ${manufacturer} ${model}`);
  return copyOf(found[0]!);
}

// ---------------------------------------------------------------------------------------------------
// The description
// ---------------------------------------------------------------------------------------------------

/** What a button of a device's own map does: a command of that device by its name, or any press of the ordered form. */
export type SetupPress = string | OwnPress;

/** A button of a device's own map, as `OwnButton` with a press that may name the device's own command by name alone. */
export interface SetupButton extends Omit<OwnButton, 'press' | 'longPress' | 'doublePress'> {
  readonly press: SetupPress;
  readonly longPress?: SetupPress;
  readonly doublePress?: SetupPress;
}

/**
 * One device as the person set it up: the catalogue record it was picked as, by maker and model, and what they chose.
 * Every number is in milliseconds; `pressRepeats` null is the engine's own 3.
 */
export interface SetupDevice {
  /** Ours, `OWN_IDS`; also what its map is named by. */
  readonly id: number;
  readonly name: string;
  readonly manufacturer: string;
  readonly model: string;
  readonly controlPort: number;
  readonly pressRepeats: number | null;
  readonly interKeyDelayMs: number;
  readonly interDeviceDelayMs: number;
  /** The power feature's three values a person sets, written over the catalogue's where given. */
  readonly power?: { readonly onDelayMs?: number; readonly keptOnBetweenActivities?: boolean; readonly alwaysOn?: boolean };
  /** The input feature's delay, written over the catalogue's where given. */
  readonly inputDelayMs?: number;
  readonly buttons: readonly SetupButton[];
  readonly sequences?: readonly OwnSequence[];
}

/** A whole setup: its devices and its activities, each in the order the lists are to hold them. */
export interface TouchSetup {
  readonly devices: readonly SetupDevice[];
  readonly activities: readonly OwnActivity[];
}

/** A press of a device's map, its own command named alone made a command of the device. */
const pressOf = (device: string, p: SetupPress): OwnPress => (typeof p === 'string' ? { device, command: p } : p);

/** A device's buttons in the ordered form, its own commands named alone made commands of it. */
function buttonsOf(d: SetupDevice): OwnButton[] {
  return d.buttons.map(({ press, longPress, doublePress, ...rest }) => ({
    ...rest,
    press: pressOf(d.name, press),
    ...(longPress === undefined ? {} : { longPress: pressOf(d.name, longPress) }),
    ...(doublePress === undefined ? {} : { doublePress: pressOf(d.name, doublePress) }),
  }));
}

// ---------------------------------------------------------------------------------------------------
// Composing
// ---------------------------------------------------------------------------------------------------

/** One device composed from its description and its catalogue record: the device list's entry. */
function composeSetupDevice(d: SetupDevice, record: DeviceWithFeatures): DeviceWithFeatures {
  const device: Json = {
    ...record.Device,
    'Id-': d.id,
    Name: d.name,
    Manufacturer: d.manufacturer,
    Model: d.model,
    ControlPort: d.controlPort,
    PressMinRepeats: d.pressRepeats,
    InterKeyDelay: d.interKeyDelayMs,
    InterDeviceDelay: d.interDeviceDelayMs,
  };
  const features = (record.DeviceFeatures ?? []).map((f) => {
    const out: Json = { ...f };
    // A feature names its device; under an id of ours it names ours.
    if ('DeviceId-' in out) out['DeviceId-'] = d.id;
    if (kindOf(f) === 'PowerFeature' && d.power !== undefined) {
      if (d.power.onDelayMs !== undefined) out['PowerOnDelay'] = d.power.onDelayMs;
      if (d.power.keptOnBetweenActivities !== undefined) out['IsPoweredOnBetweenActivities'] = d.power.keptOnBetweenActivities;
      if (d.power.alwaysOn !== undefined) out['IsPowerAlwaysOn'] = d.power.alwaysOn;
    }
    if (kindOf(f) === 'InputFeature' && d.inputDelayMs !== undefined) out['InputDelay'] = d.inputDelayMs;
    return out;
  });
  return { ...record, Device: device as DeviceWithFeatures['Device'], DeviceFeatures: features, Commands: record.Commands };
}

/**
 * The whole setup composed onto `base`: every device from its catalogue record and its description, with its own map
 * and the definitions its commands name, and then every activity, through `composeTouchActivity` and
 * `withTouchActivity`, against the devices composed. The device list, the device maps and the activity list in the
 * description's order, the activity maps after the device maps, and each definition once, in the order the devices'
 * commands first name it.
 *
 * **Refuses**: a base whose four lists are not empty; a device id not ours, given twice, or one whose digits contain
 * another's or sit inside one, which the screens' search by pattern confuses; two devices whose names differ only in
 * case; a maker and model the catalogue holds no record of, or several; a command naming a definition the catalogue
 * does not hold; and whatever `composeButtons`, `composeTouchActivity` and `withTouchActivity` refuse.
 */
export function composeTouchSetup(base: SyncDocuments, setup: TouchSetup, catalogue: TouchCatalogue): SyncDocuments {
  for (const [document, field] of SETUP_LISTS) {
    if ((listIn(base[document], field) ?? [undefined]).length !== 0) throw new ComposeRefusal(`the base's ${document} is not empty`);
  }
  const ids: string[] = [];
  const names = new Set<string>();
  const entries: DeviceWithFeatures[] = [];
  const protocols: IrProtocol[] = [];
  for (const d of setup.devices) {
    const id = idText(d.id);
    if (!isOwnId(d.id)) throw new ComposeRefusal(`device id ${id} is not one of ours, ${OWN_IDS.first} to ${OWN_IDS.last}`);
    if (ids.some((x) => x.includes(id) || id.includes(x))) throw new ComposeRefusal(`device id ${id} is another device's or one inside the other, which the screens' search by pattern confuses`);
    ids.push(id);
    if (names.has(d.name.toLowerCase())) throw new ComposeRefusal(`two devices are named "${d.name}"`);
    names.add(d.name.toLowerCase());
    const entry = composeSetupDevice(d, catalogueRecord(catalogue, d.manufacturer, d.model));
    entries.push(entry);
    for (const c of entry.Commands ?? []) {
      if (c.ProtocolId === null || c.ProtocolId === undefined) continue;
      const pid = idText(c.ProtocolId);
      if (protocols.some((p) => idText(p['Id-']) === pid)) continue;
      const definition = catalogue.protocols.find((p) => idText(p['Id-']) === pid);
      if (definition === undefined) throw new ComposeRefusal(`${d.name}: a command names definition ${pid}, which the catalogue does not hold`);
      protocols.push(copyOf(definition));
    }
  }

  // The device maps, each command found on the device it names, as the engine finds it: by name in lower case.
  const byName = new Map(setup.devices.map((d, i) => [d.name, entries[i]!]));
  const resolve = (c: OwnActivityCommand) => {
    const entry = byName.get(c.device);
    if (entry === undefined) throw new ComposeRefusal(`no device named "${c.device}" in the setup`);
    const command = (entry.Commands ?? []).filter((x) => x.Name.toLowerCase() === c.command.toLowerCase()).at(-1);
    if (command === undefined) throw new ComposeRefusal(`"${c.device}" has no command "${c.command}"`);
    return { name: command.Name, deviceId: entry.Device['Id-'], functionId: functionIdOf(command) };
  };
  const maps = setup.devices.map((d) => {
    const composed = composeButtons(buttonsOf(d), d.sequences ?? [], resolve);
    return {
      __type: 'DeviceButtonMap',
      ButtonMapIdentifier: mapIdentifier('device', idText(d.id)),
      'DeviceId-': d.id,
      Buttons: composed.buttons,
      Sequences: composed.sequences,
    };
  });

  let documents: SyncDocuments = {
    ...base,
    DeviceList: { ...copyOf(base.DeviceList!), DevicesWithFeatures: entries } as DeviceList,
    MapList: { ...copyOf(base.MapList!), ButtonMaps: maps } as MapList,
    ProtocolList: { ...copyOf(base.ProtocolList!), Protocols: protocols } as ProtocolList,
  };
  for (const a of setup.activities) {
    const added = withTouchActivity(documents, composeTouchActivity(a, documents));
    documents = { ...documents, ActivityList: added.ActivityList as ActivityList, MapList: added.MapList as MapList };
  }
  return documents;
}

// ---------------------------------------------------------------------------------------------------
// Describing a set that exists
// ---------------------------------------------------------------------------------------------------

/** Where the ids of a described setup start: devices, activities and sequences each numbered on from its own. */
export interface SetupIds {
  readonly device: number;
  readonly activity: number;
  readonly sequence: number;
}

/**
 * **A setup described from documents that hold one**, written once for `todo-touch.md` 8.6 from the set the bench
 * Touch holds, Logitech's documents under tags of ours, and kept as `packages/corpus/touch-setups/8.6-test-setup.json`.
 * What it writes is what the person chose, the fields the header lists as composed, in the documents' own order, with
 * ids of ours numbered from `ids`; nothing of the catalogue's and no value of the account's, so the description holds
 * names, numbers and the shape of each map, and no code, address or key.
 *
 * **Refuses** what the composer could not compose back the same, so a description that comes out is one the composer
 * takes: a button deleted on the remote (`ButtonState` 4), a button kind, action kind, client action or gesture the
 * ordered form does not write, a role stating `NextDevicePowerOnDelay`, an activity of a type with no measured group,
 * an activity whose roles of one device are not together or disagree, a step of another kind, and a device map naming a
 * device by an id the documents do not list.
 */
export function describeTouchSetup(documents: SyncDocuments, ids: SetupIds): TouchSetup {
  const c = readConfiguration(documents);
  const deviceIds = new Map(c.devices.map((d, i) => [d.id, { ours: ids.device + i, name: d.name ?? '' }]));
  const nameOfDevice = (id: Id | undefined): string => {
    const found = deviceIds.get(idText(id));
    if (found === undefined) throw new ComposeRefusal(`a map names device ${idText(id)}, which the documents do not list`);
    return found.name;
  };
  let nextSequence = ids.sequence;

  /** A map's buttons and sequences in the ordered form; `own` names the device whose commands may be named alone. */
  const mapOf = (map: Json | undefined, own: string | undefined): { buttons: SetupButton[]; sequences: OwnSequence[] } => {
    if (map === undefined) return { buttons: [], sequences: [] };
    const sequenceNames = new Map<string, string>();
    const sequences: OwnSequence[] = (Array.isArray(map['Sequences']) ? map['Sequences'] as Json[] : []).map((s) => {
      sequenceNames.set(idText(s['SequenceId'] as Id), String(s['Name']));
      const steps = [...(s['Actions'] as Json[])].sort((x, y) => (x['Order'] as number) - (y['Order'] as number)).map((x) => {
        if (kindOf(x as { __type?: unknown }) === 'ButtonDelayAction') return { delaySeconds: x['Duration'] as number };
        if (kindOf(x as { __type?: unknown }) !== 'ButtonCommandAction') throw new ComposeRefusal(`a sequence step of the kind ${String(x['__type'])} is not described`);
        return { device: nameOfDevice(x['DeviceId-'] as Id), command: String(x['CommandName']) };
      });
      return { id: nextSequence++, name: String(s['Name']), steps };
    });
    const press = (a: unknown): SetupPress | undefined => {
      if (a === null || a === undefined) return undefined;
      const x = a as Json;
      const kind = kindOf(x as { __type?: unknown });
      if (kind === 'ButtonCommandAction') {
        const device = nameOfDevice(x['DeviceId-'] as Id);
        return device === own ? String(x['CommandName']) : { device, command: String(x['CommandName']) };
      }
      if (kind === 'ButtonSequenceAction') {
        const name = sequenceNames.get(idText(x['SequenceId'] as Id));
        if (name === undefined) throw new ComposeRefusal('a button runs a sequence its map does not hold');
        return { sequence: name };
      }
      if (kind === 'ButtonClientAction' && x['ActionName'] === 'Numpad') return { client: 'Numpad' };
      throw new ComposeRefusal(`a button action of the kind ${kind} is not described`);
    };
    const buttons = (map['Buttons'] as Json[]).map((b): SetupButton => {
      if (b['ButtonState'] === 4) throw new ComposeRefusal('a button deleted on the remote is not described');
      const kind = kindOf(b as { __type?: unknown });
      const group = b['FunctionGroupType'] as number;
      const actions = {
        press: press(b['ButtonAction'])!,
        ...(press(b['ButtonLongPressAction']) === undefined ? {} : { longPress: press(b['ButtonLongPressAction'])! }),
        ...(press(b['ButtonDoublePressAction']) === undefined ? {} : { doublePress: press(b['ButtonDoublePressAction'])! }),
      };
      const named = kind === 'HardRemoteButton' ? { key: b['ButtonKey'] as TouchButtonKey }
        : kind === 'GestureRemoteButton' ? { gesture: b['ButtonKey'] as TouchGestureKey }
          : kind === 'SoftRemoteButton' ? { entry: String(b['TextOnRemote']), index: (b['MenuItem'] as Json)['IndexInMenu'] as number }
            : undefined;
      if (named === undefined) throw new ComposeRefusal(`a button of the kind ${kind} is not described`);
      return { ...named, ...(group === 0 ? {} : { group }), ...actions };
    });
    return { buttons, sequences };
  };

  const devices: SetupDevice[] = c.devices.map((d) => {
    const power = d.power;
    const map = mapOf(d.map?.source as Json | undefined, d.name);
    return {
      id: deviceIds.get(d.id)!.ours,
      name: d.name ?? '',
      manufacturer: d.manufacturer ?? '',
      model: d.model ?? '',
      controlPort: d.controlPort ?? 0,
      pressRepeats: d.source.Device.PressMinRepeats ?? null,
      interKeyDelayMs: d.interKeyDelayMs ?? 0,
      interDeviceDelayMs: d.interDeviceDelayMs ?? 0,
      ...(power === undefined ? {} : { power: { onDelayMs: power.onDelayMs ?? 0, keptOnBetweenActivities: power.keptOnBetweenActivities, alwaysOn: power.alwaysOn } }),
      ...(d.inputDelayMs === undefined ? {} : { inputDelayMs: d.inputDelayMs }),
      buttons: map.buttons,
      ...(map.sequences.length === 0 ? {} : { sequences: map.sequences }),
    };
  });

  const activities: OwnActivity[] = c.activities.map((a, i) => {
    const type = ACTIVITY_TYPES[a.type ?? -1] as ActivityTypeName | undefined;
    if (type === undefined) throw new ComposeRefusal(`activity "${a.name ?? ''}" is of no type of Logitech's`);
    // The roles grouped by device, in the order each device is first named, as the composer writes them.
    const grouped: OwnActivityDevice[] = [];
    let last: string | undefined;
    for (const r of a.roles) {
      if (r.nextDevicePowerOnDelay !== null && r.nextDevicePowerOnDelay !== undefined) throw new ComposeRefusal('a role stating a power on delay of its own is not described');
      const name = nameOfDevice(r.deviceId);
      const at = grouped.findIndex((g) => g.device === name);
      if (at >= 0 && last !== name) throw new ComposeRefusal(`activity "${a.name ?? ''}": the roles of "${name}" are not together`);
      const input = typeof r.input === 'string' ? r.input : undefined;
      if (at >= 0) {
        const g = grouped[at]!;
        if (g.powerOn !== r.powerOnOrder || g.powerOff !== r.powerOffOrder || g.input !== input) throw new ComposeRefusal(`activity "${a.name ?? ''}": the roles of "${name}" disagree`);
        grouped[at] = { ...g, roles: [...g.roles, r.kind as ActivityRoleKind] };
      } else {
        grouped.push({ device: name, roles: [r.kind as ActivityRoleKind], powerOn: r.powerOnOrder ?? 0, powerOff: r.powerOffOrder ?? 0, ...(input === undefined ? {} : { input }) });
      }
      last = name;
    }
    const steps = (xs: readonly { kind: string; order: number | undefined; deviceId: string | undefined; commandName: string | undefined; durationMs: number | undefined; channelNumber: string | number | undefined }[]): OwnActivityStep[] => xs.map((x) => {
      const order = x.order === undefined ? {} : { order: x.order };
      if (x.kind === 'delay') return { delaySeconds: (x.durationMs ?? 0) / 1000, ...order };
      if (x.kind === 'command') return { device: nameOfDevice(x.deviceId), command: x.commandName ?? '', ...order };
      if (x.kind === 'channel') return { device: nameOfDevice(x.deviceId), channel: String(x.channelNumber), ...order };
      throw new ComposeRefusal(`a step of the kind ${x.kind} is not described`);
    });
    const map = mapOf(a.map?.source as Json | undefined, undefined);
    return {
      id: ids.activity + i,
      name: a.name ?? '',
      type,
      startScreen: a.startScreen as OwnActivity['startScreen'],
      order: a.order ?? 0,
      ...(a.tuningDefault ? { tuningDefault: true } : {}),
      devices: grouped,
      ...(a.enter.length === 0 ? {} : { enter: steps(a.enter) }),
      ...(a.leave.length === 0 ? {} : { leave: steps(a.leave) }),
      buttons: map.buttons as OwnButton[],
      ...(map.sequences.length === 0 ? {} : { sequences: map.sequences }),
    };
  });
  return { devices, activities };
}
