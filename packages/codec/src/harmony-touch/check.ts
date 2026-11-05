/**
 * What a Harmony Touch would refuse or ignore in a configuration, read off the view `read.ts` builds.
 *
 * **Why a check and not a validation.** Every rule here is one the reference reads in the remote's own
 * program, and each is a way for a set of documents to arrive whole and do less than it says: a button map
 * the engine never finds, a screen entry overwritten by a later one on the same index, a command whose
 * family is not in the protocol list. None of them is an error a document format can express, and Logitech's
 * own documents carry two of them, so the check reports and never throws; what to do about a finding is the
 * caller's.
 *
 * **Two effects, named for what the remote does.**
 *
 * * `refused`: the engine's reader stops, or the remote turns the value away. The reference states each as a
 *   document "without the field stops the engine" or "stops the reader"; what the remote then shows is not
 *   checked, `activities-and-buttons.md`, "Not checked".
 * * `ignored`: the document reads, and the part named does nothing, or is overwritten, or is skipped
 *   without a word.
 *
 * **Each rule cites the section of the reference it implements**, in its comment, so a rule can be checked
 * against its source and corrected there first. A rule the reference does not state is not here: in
 * particular nothing reports what the remote does with a document that breaks a rule beyond that, which the
 * reference lists as not checked.
 *
 * **A finding names a place and never a value.** `document` and `path` say where, as a path through the
 * document a person can follow; `message` says what in words without quoting the documents, since a
 * configuration holds an account's data and a finding is the kind of thing that gets printed.
 */
import { CONFIGURATION_DOCUMENTS, type Activity, type Command, type Device, type SyncDocuments } from './documents.ts';
import {
  DELETED_ON_REMOTE, INFRARED_TRANSPORT, numberPadKey, readConfiguration, type Configuration, type ReadActivity,
  type ReadButtonAction, type ReadDevice, type ReadMap,
} from './read.ts';

/** The rules, each named for what it finds. */
export type Rule =
  | 'required field'
  | 'no key code'
  | 'no protocol'
  | 'map identifier'
  | 'no map'
  | 'repeated screen index'
  | 'action device missing'
  | 'action command missing'
  | 'commands differ in case'
  | 'unknown input'
  | 'shared power order'
  | 'shared activity order'
  | 'number pad entry on no key'
  | 'favourite number'
  | 'missing list'
  | 'document absent'
  | 'not a document';

export interface Finding {
  readonly rule: Rule;
  readonly effect: 'refused' | 'ignored';
  readonly document: string;
  readonly path: string;
  readonly message: string;
}

/** Whether an object states a field at all, null included: a document "without the field" lacks the key. */
const states = (x: object, field: string): boolean => Object.prototype.hasOwnProperty.call(x, field) && (x as Record<string, unknown>)[field] !== undefined;

/** The actions of a button, short, long and double, as the view holds them. */
const actionsOf = (b: { press: ReadButtonAction | undefined; longPress: ReadButtonAction | undefined; doublePress: ReadButtonAction | undefined }): ReadButtonAction[] =>
  [b.press, b.longPress, b.doublePress].filter((a): a is ReadButtonAction => a !== undefined);

/**
 * Every finding over one configuration: the lists the reader walks first, then in the order of the
 * documents, devices, maps, activities, favourites.
 */
export function checkConfiguration(c: Configuration): Finding[] {
  return [
    ...checkLists(c.documents),
    ...checkDevices(c.devices),
    ...checkMaps(c.maps, c.devices),
    ...checkActivities(c),
    ...checkFavourites(c),
  ];
}

/**
 * The lists the engine's reader walks with no guard, by document: each document's top level list, and inside
 * them the lists of an entry it walks the same way. `answering-a-sync.md`, "What the remote does not check,
 * and why an answerer still has to be careful": a document that is valid JSON and lacks one of these, or
 * states it as `null`, makes the reader raise, which ends the task that loads the configuration,
 * `firmware.md` "A configuration that fails to load".
 *
 * **`null` counts as lacking it, and that is this module's reading of a guard rather than a measurement.**
 * The reader tests `type(x) == "table"` before walking the lists it may meet as `null`, a role list, an
 * input list, a sequence list, and walks these without the test, so a `null` here reaches the walk as the
 * decoder's null value, which those tests exist to keep out of it. No document measured states one of these
 * as `null`, so nothing Logitech wrote is refused by it.
 *
 * The settings document's own list is on the reference's word for the Settings document; the engine's
 * load, `loadAll`, reads the other four and the context, and which reader of the remote walks `Settings` is
 * not named here.
 */
export const TOP_LEVEL_LISTS: Readonly<Record<string, string>> = {
  ActivityList: 'Activities',
  DeviceList: 'DevicesWithFeatures',
  MapList: 'ButtonMaps',
  ProtocolList: 'Protocols',
  Settings: 'Settings',
};

/** A parsed JSON object that is not an array, which is what a document and an entry of one have to be. */
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * `missing list` over the documents as they are, before the view reads them: the view reads a missing list
 * as empty, which is its promise and the opposite of what the remote's reader does, so this walks the
 * documents themselves. A document that is absent is not this rule's; `refusalsBeforeASync` names it.
 *
 * Inside the lists, walked as the reader walks them: each device entry's `DeviceFeatures`, each map's
 * `Buttons`, and the `Actions` of each sequence of a map whose `Sequences` is a list. An entry that is not an
 * object is skipped here, as the view skips it, and its own fate on the remote is not read.
 */
function checkLists(documents: SyncDocuments): Finding[] {
  const out: Finding[] = [];
  const missing = (document: string, path: string, list: string): void => {
    out.push({
      rule: 'missing list', effect: 'refused', document, path,
      message: `the document states no ${list} list, which the engine's reader walks without a check, so it raises and the configuration does not load`,
    });
  };
  for (const [name, list] of Object.entries(TOP_LEVEL_LISTS)) {
    const document = documents[name];
    if (!isObject(document)) continue;
    if (!Array.isArray(document[list])) missing(name, list, list);
  }
  const entries = (document: unknown, list: string): [Record<string, unknown>, number][] => {
    const xs = isObject(document) ? document[list] : undefined;
    return Array.isArray(xs) ? xs.flatMap((x, at): [Record<string, unknown>, number][] => (isObject(x) ? [[x, at]] : [])) : [];
  };
  for (const [entry, at] of entries(documents.DeviceList, 'DevicesWithFeatures')) {
    if (!Array.isArray(entry['DeviceFeatures'])) missing('DeviceList', `DevicesWithFeatures[${at}].DeviceFeatures`, 'DeviceFeatures');
  }
  for (const [map, at] of entries(documents.MapList, 'ButtonMaps')) {
    if (!Array.isArray(map['Buttons'])) missing('MapList', `ButtonMaps[${at}].Buttons`, 'Buttons');
    for (const [sequence, s] of entries(map, 'Sequences')) {
      if (!Array.isArray(sequence['Actions'])) missing('MapList', `ButtonMaps[${at}].Sequences[${s}].Actions`, 'Actions');
    }
  }
  return out;
}

/**
 * **The gate before a write**: every finding that would make the remote's reader raise or turn a value away,
 * over a whole set of documents meant to answer a sync, or none when the set may be written. `todo-touch.md`
 * 6.6; the answerer refuses a set this returns anything for, before it sends the sync request.
 *
 * In order, and stopping at the first kind that finds anything, since a set missing a document or a list
 * cannot be read the way the remote reads it:
 *
 * 1. **all six configuration documents present**, `document absent`: a sync down asks for every one of them
 *    and a status from 400 up on any aborts, `answering-a-sync.md` "The smallest set of documents"
 * 2. **each of them a JSON object**, `not a document`: a document sent as a string of JSON or an array is
 *    stored as that and the reader finds none of its lists, "A document has to arrive as the object itself"
 * 3. **every list the reader walks**, `missing list`, above
 * 4. **then the whole check, keeping what is `refused`**: what stops the reader, a required field, and what
 *    the remote turns away. What is only `ignored` is not a refusal: Logitech's own documents carry two kinds
 *    of it, `touch-reader.test.ts`.
 *
 * Favourites documents present in the set are read with the rest; which ones a sync will ask for depends on
 * the documents, so their absence is the answerer's to meet when the remote asks.
 */
export function refusalsBeforeASync(documents: SyncDocuments): Finding[] {
  const absent = CONFIGURATION_DOCUMENTS.filter((name) => documents[name] === undefined).map((name): Finding => ({
    rule: 'document absent', effect: 'refused', document: name, path: '',
    message: 'the set holds no such document, and a sync down asks for all six',
  }));
  if (absent.length > 0) return absent;
  const notObjects = CONFIGURATION_DOCUMENTS.filter((name) => !isObject(documents[name])).map((name): Finding => ({
    rule: 'not a document', effect: 'refused', document: name, path: '',
    message: 'the document is not a JSON object, so the remote stores it as something its reader finds no list in',
  }));
  if (notObjects.length > 0) return notObjects;
  const lists = checkLists(documents);
  if (lists.length > 0) return lists;
  return checkConfiguration(readConfiguration(documents)).filter((f) => f.effect === 'refused');
}

/**
 * Whether a command or a device is infrared, by the one transport number the reference names,
 * `INFRARED_TRANSPORT`. **Every other value is treated as not infrared**, and that is this module's choice
 * rather than the remote's: the engine sends a command over Bluetooth, a keyboard or the network by its
 * `TransportType` and over infrared otherwise, and the numbers of those three are not stated, so a value
 * other than 1 may well be infrared on the remote. The choice makes a rule that depends on it miss a
 * finding rather than invent one.
 */
const isInfrared = (transport: number | undefined): boolean => transport === INFRARED_TRANSPORT;

/**
 * The device list, `devices-and-infrared.md`, "What a writer must carry" and "From a key press to the lamp".
 */
function checkDevices(devices: readonly ReadDevice[]): Finding[] {
  const out: Finding[] = [];
  const found = (rule: Rule, effect: Finding['effect'], path: string, message: string): void => {
    out.push({ rule, effect, document: 'DeviceList', path, message });
  };
  for (const d of devices) {
    // "How a key press becomes a command", step 4: in device mode the screens name the map
    // `16417Device<device>`, and with no map under it every key of that mode does nothing.
    if (d.map === undefined) found('no map', 'ignored', d.path, 'no map has the identifier the engine builds for this device, so no key does anything in its device mode');
    // A device entry without its record is one stating none of the fields, as the view reads it.
    const device: Partial<Device> = d.source.Device ?? {};
    // "Required, in that a document without the field stops the engine: a device's `DeviceType`,
    // `Manufacturer` and `Transport`."
    for (const field of ['DeviceType', 'Manufacturer', 'Transport']) {
      if (!states(device, field)) found('required field', 'refused', `${d.path}.Device`, `the device states no ${field}, which the engine requires`);
    }
    const infrared = d.commands.filter((c) => isInfrared(c.transportType));
    // "and, when infrared is sent, the device's `PressMinRepeats` and `InterDeviceDelay`." A device with an
    // infrared command is one infrared is sent for, infrared being `TransportType` 1 alone, `isInfrared`.
    if (infrared.length > 0) {
      for (const field of ['PressMinRepeats', 'InterDeviceDelay']) {
        if (!states(device, field)) found('required field', 'refused', `${d.path}.Device`, `the device sends infrared and states no ${field}, which the engine requires`);
      }
    }
    for (const c of d.commands) {
      const command: Command = c.source;
      // "a command's `TransportType` and its `Raw` key, which may be null but has to be there".
      if (!states(command, 'TransportType')) found('required field', 'refused', c.path, 'the command states no TransportType, which the engine requires');
      if (!Object.prototype.hasOwnProperty.call(command, 'Raw')) found('required field', 'refused', c.path, 'the command has no Raw key, which the engine requires even when null');
      // "A command whose `KeyCode` key is missing, rather than null, cannot be sent."
      if (!Object.prototype.hasOwnProperty.call(command, 'KeyCode')) found('no key code', 'ignored', c.path, 'the command has no KeyCode key, so it cannot be sent');
      // "a command whose family or device is missing sends nothing", step 3: an infrared command that is not
      // a learned raw code is built from the family its `ProtocolId` names.
      const raw = typeof c.raw === 'string' && c.raw.startsWith('F');
      if (isInfrared(c.transportType) && !raw && c.protocol === undefined) {
        found('no protocol', 'ignored', c.path, 'the command names a protocol the protocol list does not hold, so it sends nothing');
      }
    }
    // Step 1: "each device's commands are kept by their name in lower case, so of two commands whose names
    // differ only in case the later one wins, on any device that is not both a network and an infrared
    // device". The earlier one is reached by no button. The exception is not applied: no document measured
    // holds such a device, and how it keeps its commands is not stated. The fold is JavaScript's, which also
    // lowers letters outside ASCII where the engine's Lua may not, `ReadDevice.commandsByName`; so a pair
    // differing only in such a letter is reported here and may not be one on the remote.
    const lastAt = new Map<string, number>();
    d.commands.forEach((c, at) => { if (c.name !== undefined) lastAt.set(c.name.toLowerCase(), at); });
    d.commands.forEach((c, at) => {
      if (c.name !== undefined && lastAt.get(c.name.toLowerCase()) !== at) {
        found('commands differ in case', 'ignored', c.path, 'a later command of the device has the same name but for case, so this one is never sent');
      }
    });
  }
  return out;
}

/**
 * The button maps, `activities-and-buttons.md`.
 *
 * **A map is found by its identifier alone**, "How a key press becomes a command", step 4: "If no loaded map
 * has exactly that identifier the press does nothing: the engine's retry without the `16417` prefix comes
 * after a return and is never reached." The map's own `DeviceId-` and `ActivityId-` are "stored by the
 * engine and never used", "What a writer must carry", so they play no part here: what decides is whether
 * the identifier is one the screens build for a device or an activity of the configuration, `ReadMap.owner`.
 */
function checkMaps(maps: readonly ReadMap[], devices: readonly ReadDevice[]): Finding[] {
  const out: Finding[] = [];
  const found = (rule: Rule, effect: Finding['effect'], path: string, message: string): void => {
    out.push({ rule, effect, document: 'MapList', path, message });
  };
  const deviceIds = new Set(devices.map((d) => d.id));
  for (const m of maps) {
    // A map whose identifier no device and no activity builds is reached by no press. A map of another
    // kind than a device's or an activity's, a root map among them, is left alone: how the engine finds
    // one is not stated, and the documents measured hold none.
    if (m.kind !== 'other' && !m.reachable) {
      found('map identifier', 'ignored', m.path, 'the map\'s identifier is not one the engine builds for any device or activity, so no press reaches it');
    }
    // "Screen entries and the number pad", the second trap: "An index can repeat. ... The engine and the
    // screens both keep the later of the two, so the earlier entry is on neither the screen nor in the
    // engine's table."
    for (const b of m.shadowed) {
      found('repeated screen index', 'ignored', b.path, 'a later entry of the map has the same index, so this one is neither shown nor sent');
    }
    for (const b of m.buttons) {
      // "The number pad screen ... places each by its command's name ... A command of any other name is
      // placed on no key." An entry the screens hide, marked deleted, is not on the screen to begin with.
      if (b.kind === 'number pad' && b.press?.kind === 'command' && b.press.commandName !== undefined
        && b.state !== DELETED_ON_REMOTE && numberPadKey(b.press.commandName) === undefined) {
        found('number pad entry on no key', 'ignored', b.path, 'the number pad places this entry\'s command on no key');
      }
      for (const a of actionsOf(b)) checkCommandAction(a, deviceIds, found);
    }
    for (const s of m.sequences) {
      for (const a of s.steps) {
        // "Sequences": "a step without an `Order` stops the reader".
        if (!states(a.source, 'Order')) found('required field', 'refused', a.path, 'the sequence step states no Order, which stops the engine\'s reader');
        checkCommandAction(a, deviceIds, found);
      }
    }
  }
  return out;
}

/**
 * A command action that names a device the device list does not hold sends nothing, "From a key press to the
 * lamp", step 3; one naming a command its device lacks finds nothing to send, step 1, the command being found
 * by name, and the reference states the same outright for a channel's actions, "An action whose command the
 * device lacks ... sends nothing".
 */
function checkCommandAction(
  a: ReadButtonAction, deviceIds: ReadonlySet<string>,
  found: (rule: Rule, effect: Finding['effect'], path: string, message: string) => void,
): void {
  if (a.kind !== 'command') return;
  if (a.deviceId === undefined || !deviceIds.has(a.deviceId)) {
    found('action device missing', 'ignored', a.path, 'the action names a device the device list does not hold, so it sends nothing');
  } else if (a.command === undefined) {
    found('action command missing', 'ignored', a.path, 'the action names a command its device does not have, so it sends nothing');
  }
}

/** The activity list, `activities-and-buttons.md`, "An activity: what it is made of". */
function checkActivities(c: Configuration): Finding[] {
  const out: Finding[] = [];
  const found = (rule: Rule, effect: Finding['effect'], path: string, message: string): void => {
    out.push({ rule, effect, document: 'ActivityList', path, message });
  };
  const deviceIds = new Set(c.devices.map((d) => d.id));
  const byOrder = new Map<number, string[]>();
  for (const a of c.activities) {
    const activity: Activity = a.source;
    // Step 4 again: while an activity runs the screens name the map `16417Activity<activity>`.
    if (a.map === undefined) found('no map', 'ignored', a.path, 'no map has the identifier the engine builds for this activity, so no key does anything while it runs');
    // "an activity without one makes the reader fail", of `ActivityGroup`.
    if (!states(activity, 'ActivityGroup')) found('required field', 'refused', a.path, 'the activity states no ActivityGroup, which makes the engine\'s reader fail');
    // "an action without an `ActionOrder` stops the reader", of `EnterActions` and `LeaveActions`.
    for (const step of [...a.enter, ...a.leave]) {
      if (!states(step.source, 'ActionOrder')) found('required field', 'refused', step.path, 'the step states no ActionOrder, which stops the engine\'s reader');
      if (step.kind === 'command' && (step.deviceId === undefined || !deviceIds.has(step.deviceId))) {
        found('action device missing', 'ignored', step.path, 'the step names a device the device list does not hold, so it sends nothing');
      } else if (step.kind === 'command' && step.command === undefined) {
        found('action command missing', 'ignored', step.path, 'the step names a command its device does not have, so it sends nothing');
      }
    }
    // "`SelectedInput.Name` is the input the device is switched to, and a name that is not one of the
    // device's inputs is skipped without a word." Only the first role of a device makes its input step.
    for (const d of a.devices) {
      if (typeof d.role.input === 'string' && !d.role.inputKnown) {
        found('unknown input', 'ignored', `${d.role.path}.SelectedInput`, 'the input named is not one of the device\'s inputs, so no input step is sent');
      }
    }
    for (const [field, steps] of powerSteps(a)) {
      for (const [n, sharing] of steps) {
        if (sharing.size > 1) {
          found('shared power order', 'ignored', a.path, `${sharing.size} devices of the activity share one ${field === 'powerOnOrder' ? 'power on' : 'power off'} order, number ${n}, so only one of their steps is kept`);
        }
      }
    }
    // The table of "the other fields the remote uses": `ActivityOrder` is "its place on the activity list ...
    // a negative order hides the activity, and of two with the same order only the later shows".
    if (a.order !== undefined && !a.hidden) byOrder.set(a.order, [...(byOrder.get(a.order) ?? []), a.path]);
  }
  for (const [order, paths] of byOrder) {
    for (const path of paths.slice(0, -1)) {
      found('shared activity order', 'ignored', path, `a later activity has the same ActivityOrder, ${order}, so this one is not shown on the list`);
    }
  }
  return out;
}

/**
 * The power steps of one activity, per field, as the numbers each is kept under and the devices whose steps
 * land there, `activities-and-buttons.md`, "An activity: what it is made of".
 *
 * **The two fields are taken from different roles, because the engine takes them so.** "The first role
 * naming a device makes that device's power on step", so a power on order is read off each device's first
 * role alone; "Every role's power off order is still recorded", so a power off order is read off every role.
 * Both are "stored as keys ... so two devices of one activity with the same number keep only one step": what
 * collides is two **devices** under one number. Two roles of one device on one number are one device's step
 * kept once, which loses nothing, and are not counted.
 */
function powerSteps(a: ReadActivity): readonly (readonly ['powerOnOrder' | 'powerOffOrder', ReadonlyMap<number, ReadonlySet<string>>])[] {
  const keep = (into: Map<number, Set<string>>, n: number | undefined, deviceId: string): void => {
    if (n === undefined) return;
    const one = into.get(n) ?? new Set<string>();
    one.add(deviceId);
    into.set(n, one);
  };
  const on = new Map<number, Set<string>>();
  for (const d of a.devices) keep(on, d.role.powerOnOrder, d.deviceId);
  const off = new Map<number, Set<string>>();
  for (const r of a.roles) keep(off, r.powerOffOrder, r.deviceId);
  return [['powerOnOrder', on], ['powerOffOrder', off]];
}

/**
 * The favourites, `favourites-and-settings.md`, "How a favourite becomes key presses", step 3: "For an
 * infrared device, a number holding anything but digits, `-` and `.` is refused." Infrared is the device's
 * `Transport` 1, `isInfrared`.
 *
 * **The finding names the number's place and not its document's address**, which is built from the account's
 * own profile identifiers: `document` is the kind of document, `ContentDevice` for a dial position's number
 * or `ContentService` for one the line up filled in, and `path` the place in it, `ReadFavourite.numberAt`.
 */
function checkFavourites(c: Configuration): Finding[] {
  const out: Finding[] = [];
  for (const f of c.favourites) {
    if (f.device === undefined || !isInfrared(f.device.transport)) continue;
    for (const one of f.favourites) {
      if (one.number !== undefined && !/^[0-9.-]*$/.test(one.number)) {
        out.push({
          rule: 'favourite number', effect: 'refused',
          document: one.numberAt?.document ?? 'ContentDevice', path: one.numberAt?.path ?? '',
          message: 'the channel number holds a character other than a digit, - or ., which the remote refuses for an infrared device',
        });
      }
    }
  }
  return out;
}

/** The findings counted by rule, the shape a test or a summary wants. */
export function findingsByRule(findings: readonly Finding[]): Partial<Record<Rule, number>> {
  const out: Partial<Record<Rule, number>> = {};
  for (const f of findings) out[f.rule] = (out[f.rule] ?? 0) + 1;
  return out;
}
