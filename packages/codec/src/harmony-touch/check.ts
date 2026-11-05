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
import {
  CONFIGURATION_DOCUMENTS, CONTENT_DEVICE, CONTENT_SERVICE, CONTENT_USER, type Activity, type Command, type Device, type SyncDocuments,
} from './documents.ts';
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
  | 'missing type'
  | 'entry not an object'
  | 'not a number'
  | 'not text'
  | 'not a list'
  | 'alternatives not an object'
  | 'no power state'
  | 'screens raise'
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
 * Every finding over one configuration: the lists the reader walks first, then the type names it reads, then
 * the other fields its load raises on, then in the order of the documents, devices, maps, activities,
 * favourites.
 */
export function checkConfiguration(c: Configuration): Finding[] {
  return [
    ...checkLists(c.documents),
    ...checkTypes(c.documents),
    ...checkFields(c.documents),
    ...checkScreens(c.documents),
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
 * object is skipped here, as the view skips it. **On the lists whose entries the reader tells apart by their
 * type name it raises, and `checkTypes` refuses it**: the reader reads the name off the entry itself, which
 * for anything but an object raises. **On the other lists it walks, `checkFields` refuses it**, `entry not an
 * object`. This said such an entry's fate on the remote was not read, until `todo-touch.md` 6.7.1 read it for
 * the first kind of list and 6.10 for the second.
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
 * One place where the engine's reader reads an entry's `__type` to tell what kind of entry it is: a device
 * feature, an action, a role, a map, a button. `typePlaces` lists them; `checkTypes` judges them.
 */
export interface TypePlace {
  readonly document: string;
  /** The entry's path, `ButtonMaps[0].Buttons[3]`; the field read is that path's `__type`. */
  readonly path: string;
  /** The entry as the document holds it, which need not be an object. */
  readonly entry: unknown;
  /**
   * Whether the reader tests the field before it searches it, which it does on a button's three actions
   * alone, `getButtonActions`: there an action without the field is passed over, where everywhere else it
   * raises.
   */
  readonly guarded: boolean;
  /**
   * What the entry is to the reader, so `checkFields` can read the other fields of the same entries without a
   * second walk: a device feature, an action of one (`getActionItems`), an activity's role, an activity's
   * start or end step (`getActivityAction`), a map, a button, a button's action (`getButtonActions`), a
   * sequence's step (`getSequenceActions`).
   */
  readonly kind: 'feature' | 'feature action' | 'role' | 'activity step' | 'map' | 'button' | 'button action' | 'sequence step';
}

/**
 * The feature kinds the reader tells apart, in the order `getStatesConfiguration` tries them, each with the
 * action lists only that kind reads. The test is a substring search of the type name, first match winning,
 * so `InputFeature` anywhere in the name makes an input feature whatever follows. `OutputFeature` is the fifth
 * kind and reads no list of its own, and an unknown name is logged and reads none either.
 */
const FEATURE_LISTS: readonly (readonly [string, readonly string[]])[] = [
  ['InputFeature', []],
  ['PowerFeature', ['PowerOffActions', 'PowerOnActions', 'PowerToggleActions', 'PowerOnResetActions']],
  ['ChannelTuningFeature', ['GreaterTenActions', 'GreaterHundredActions']],
  ['InternalStateFeature', ['ResetActions']],
];

/** The action lists every feature carries, read after the kind's own whatever the kind, unknown included. */
const EVERY_FEATURE_LISTS = ['StartActions', 'FinishActions', 'NextActions', 'PreviousActions'] as const;

/**
 * Every place the engine's configuration reader reads `__type`, in the four documents its load reads, walked
 * over the documents themselves and in the reader's own order. The reading is the lab's
 * `work/touch-firmware/notes/6.7.1-type-field.md`, with file and line per place, and the argument is the
 * header of `test/touch-check.test.ts`.
 *
 * **Where it walks, by the reader's functions**, each list only where the reader reaches it:
 *
 * * `DeviceList`, `getDevicesConfiguration` and `getStatesConfiguration`: every feature of every device; then
 *   the action lists `getActionItems` reads, which depend on the feature's own kind, `FEATURE_LISTS`, and on a
 *   state value's `ActionSetType` being 1 or 2, plus the four every feature carries. An input feature's lists
 *   are its inputs' `Actions`. `getActionItems` and the callers test that a list is a table first, so only an
 *   array is walked, an object yielding no entry to the reader's walk either.
 * * `ActivityList`, `getActivitiesConfiguration`: every role, and every start and end step,
 *   `getActivityAction`, of an activity whose list is a table.
 * * `MapList`, `getButtonMaps`: every map, every button of it, the three actions of each button that is a
 *   table, `getButtonActions`, guarded; and every step of every sequence of a map whose `Sequences` is a
 *   table, `getSequenceActions`, which the reader walks for every sequence at load and not only for the one a
 *   button names.
 * * **`ProtocolList` is not walked**: `initializeFromHarmonyProtocol` compares the name for equality with
 *   three names, so a missing or strange one is logged and never raises.
 *
 * **Not walked, and why.** The start's compatibility pass reads the roles of the activity that is the tuning
 * default, a subset of the roles walked here. The function list's maps are read on a request for the
 * configuration and not by the load, and the function list is not one of the six documents a sync answers.
 * The screens read `__type` as well, in a program of their own: an absent or `false` name on a button's press,
 * which the engine passes over, raises in a command page there, costing that page and not the remote, so it is
 * not refused, `checkScreens`.
 *
 * The walk does not stop where the reader would: a feature whose own name raises still has its common lists
 * walked, since a set is refused for any one place and every place found is a place to fix.
 */
export function typePlaces(documents: SyncDocuments): TypePlace[] {
  const out: TypePlace[] = [];
  const at = (document: string, path: string, entry: unknown, kind: TypePlace['kind'], guarded = false): void => {
    out.push({ document, path, entry, guarded, kind });
  };
  // The reader walks a list only when it is a table, and a table that is a JSON object yields nothing to its
  // walk, so an array is the only list with entries.
  const list = (x: unknown): readonly unknown[] => (Array.isArray(x) ? x : []);
  const field = (x: unknown, name: string): unknown => (isObject(x) ? x[name] : undefined);
  const actions = (document: string, path: string, xs: unknown, kind: TypePlace['kind']): void => {
    list(xs).forEach((x, i) => at(document, `${path}[${i}]`, x, kind));
  };

  list(field(documents.DeviceList, 'DevicesWithFeatures')).forEach((device, d) => {
    list(field(device, 'DeviceFeatures')).forEach((feature, f) => {
      const path = `DevicesWithFeatures[${d}].DeviceFeatures[${f}]`;
      at('DeviceList', path, feature, 'feature');
      if (!isObject(feature)) return;
      // The kind, by the reader's substring search in its own order. A number is searched as its decimal
      // text and matches no kind; any other value raised above and reads no list, but the walk goes on.
      const name = feature['__type'];
      const text = typeof name === 'string' ? name : typeof name === 'number' ? String(name) : undefined;
      const kind = text === undefined ? undefined : FEATURE_LISTS.find(([k]) => text.includes(k));
      if (kind?.[0] === 'InputFeature') {
        list(feature['Inputs']).forEach((input, i) => actions('DeviceList', `${path}.Inputs[${i}].Actions`, field(input, 'Actions'), 'feature action'));
      }
      if (kind?.[0] === 'InternalStateFeature') {
        // A state value's actions are read only when its `ActionSetType` is 1 or 2.
        list(feature['StateValues']).forEach((value, v) => {
          const set = field(value, 'ActionSetType');
          if (set === 1 || set === 2) actions('DeviceList', `${path}.StateValues[${v}].Actions`, field(value, 'Actions'), 'feature action');
        });
      }
      for (const own of kind?.[1] ?? []) actions('DeviceList', `${path}.${own}`, feature[own], 'feature action');
      for (const every of EVERY_FEATURE_LISTS) actions('DeviceList', `${path}.${every}`, feature[every], 'feature action');
    });
  });

  list(field(documents.ActivityList, 'Activities')).forEach((activity, a) => {
    actions('ActivityList', `Activities[${a}].Roles`, field(activity, 'Roles'), 'role');
    for (const name of ['EnterActions', 'LeaveActions']) actions('ActivityList', `Activities[${a}].${name}`, field(activity, name), 'activity step');
  });

  list(field(documents.MapList, 'ButtonMaps')).forEach((map, m) => {
    at('MapList', `ButtonMaps[${m}]`, map, 'map');
    list(field(map, 'Buttons')).forEach((button, b) => {
      const path = `ButtonMaps[${m}].Buttons[${b}]`;
      at('MapList', path, button, 'button');
      // A button's actions are read only when they are tables; an array is one and has no `__type`, which
      // the guard passes over, so only an object is a place.
      for (const name of ['ButtonAction', 'ButtonLongPressAction', 'ButtonDoublePressAction']) {
        const action = field(button, name);
        if (isObject(action)) at('MapList', `${path}.${name}`, action, 'button action', true);
      }
    });
    list(field(map, 'Sequences')).forEach((sequence, s) => actions('MapList', `ButtonMaps[${m}].Sequences[${s}].Actions`, field(sequence, 'Actions'), 'sequence step'));
  });
  return out;
}

/**
 * Why the reader raises at one place, or undefined where it does not. The reader tells kinds apart by
 * searching the type name with Lua's `string.find`, which on the engine's LuaJIT takes a string or a number,
 * the number as its decimal text, and raises on anything else: on nil, the field absent; on the decoder's
 * null, which is a userdata of the JSON library's; on a boolean, a table. So:
 *
 * * `missing`: the field absent, where nothing tests for it first;
 * * `not a name`: present and neither a string nor a number. Where the field is tested first, a button's
 *   actions, `false` fails the test and is passed over like an absent field, and every other value passes it
 *   and raises in the search;
 * * `not an object`: the entry itself is not an object, so the field is read off a null, a string, a number,
 *   a boolean or an array, each of which raises or yields nothing and then raises. A guarded place holds
 *   only objects, `typePlaces`.
 *
 * **An unknown name is not here**, because nowhere in the load does it raise: a feature, an action, a step or
 * a button action of an unknown kind is logged, a map or a button of one is kept under an empty name, and a
 * role's name is stored as it stands.
 */
function typeFault(place: TypePlace): 'missing' | 'not a name' | 'not an object' | undefined {
  if (!isObject(place.entry)) return place.guarded ? undefined : 'not an object';
  const name = place.entry['__type'];
  const searchable = typeof name === 'string' || typeof name === 'number';
  if (place.guarded) return name === undefined || name === false || searchable ? undefined : 'not a name';
  if (name === undefined) return 'missing';
  return searchable ? undefined : 'not a name';
}

/**
 * `missing type`, refused: every place `typePlaces` finds where the engine's reader raises on the type name,
 * `typeFault`. A raise inside the load ends the task that loads the configuration, `firmware.md` "A
 * configuration that fails to load", which is why a set with one is refused before anything of it is
 * written. Walked over the documents themselves, as `checkLists` is, because the view reads leniently.
 */
export function checkTypes(documents: SyncDocuments): Finding[] {
  const message = {
    'missing': 'the entry states no __type, which the engine\'s reader searches with no test first, so it raises and the configuration does not load',
    'not a name': 'the entry\'s __type is neither a string nor a number, which the engine\'s reader cannot search, so it raises and the configuration does not load',
    'not an object': 'the entry is not an object, so the engine\'s reader reads its __type off something that has none and raises, and the configuration does not load',
  } as const;
  return typePlaces(documents).flatMap((place): Finding[] => {
    const fault = typeFault(place);
    if (fault === undefined) return [];
    const path = fault === 'not an object' ? place.path : `${place.path}.__type`;
    return [{ rule: 'missing type', effect: 'refused', document: place.document, path, message: message[fault] }];
  });
}

/**
 * How a value meets the engine's Lua, as the language defines it on the engine's LuaJIT: its documented rules
 * and not a reading of the image, the same standing as `typeFault`'s `string.find`. The lab's
 * `work/touch-firmware/notes/6.10-reader-raises.md`, "How a raise is decided here", lists them.
 *
 * * **Truth**: everything but nil and `false` is true, JSON null, the decoder's userdata, included. So a guard
 *   `if x then`, or `x or ""`, hands null on to whatever follows it.
 * * **A table** is a JSON object or array. `ipairs` and `next` raise on anything else; `ipairs` over an object
 *   yields nothing.
 * * **A string function**, `string.lower`, `string.find`, `string.sub`, takes a string or a number, the number
 *   as its decimal text, and raises on anything else.
 * * **A table key** may be anything but nil: `t[nil] = v` raises "table index is nil", even with `v` nil.
 */
const truthy = (x: unknown): boolean => x !== undefined && x !== false;
const isTable = (x: unknown): boolean => typeof x === 'object' && x !== null;
const isText = (x: unknown): boolean => typeof x === 'string' || typeof x === 'number';
/**
 * **What the check asks of a value the reader does arithmetic, a bitwise operation or a sort on: a JSON
 * number.** Arithmetic would take a string of digits too, a comparison never does (`orderTableItems` sorts its
 * keys with `<`, so two keys of different types raise), and whether `bit.band` takes one is not read.
 * Logitech's documents state every such value as a number, so refusing a string of digits refuses nothing a
 * remote has been given and is the safe side: **the one place the check refuses more than the reader raises
 * on**, and the rules that use it say so in their message.
 */
const isNumber = (x: unknown): boolean => typeof x === 'number';

/** The kind an entry's type name gives, by the reader's substring search in its order, first match winning. */
function kindOf(entry: unknown, kinds: readonly string[]): string | undefined {
  const name = isObject(entry) ? entry['__type'] : undefined;
  const text = typeof name === 'string' ? name : typeof name === 'number' ? String(name) : undefined;
  return text === undefined ? undefined : kinds.find((k) => text.includes(k));
}

/** The feature kinds in `getStatesConfiguration`'s order, the action kinds of a step, a map and a button. */
const FEATURE_KINDS = FEATURE_LISTS.map(([k]) => k);
const ACTIVITY_STEP_KINDS = ['CommandActivityAction', 'ChannelActivityAction', 'DelayActivityAction'] as const;
const SEQUENCE_STEP_KINDS = ['ButtonCommandAction', 'ButtonDelayAction'] as const;
const MAP_KINDS = ['DeviceButtonMap', 'ActivityButtonMap', 'RootButtonMap'] as const;
const BUTTON_KINDS = ['HardRemoteButton', 'SoftRemoteButton', 'GestureRemoteButton'] as const;
const BUTTON_ACTION_KINDS = [
  'ButtonCommandAction', 'ButtonActivityAction', 'ButtonSequenceAction', 'ButtonClientAction', 'ButtonChannelAction',
  'ButtonBookmarkAction', 'ButtonHomeControlAction', 'ButtonProgramAction',
] as const;

/**
 * Whether a button ends with an action in the reader, `getButtonMaps` with `getButtonActions`: its press, or
 * failing that its long press, of a kind that gives one. A command, an activity and a home control action
 * always give one; a sequence gives its steps, so one when the map's sequence of that id has a step; a program
 * gives one when it states a `ProgramId` that is not null (`setProgramAction`); a client, channel or bookmark
 * action and an unknown kind give none. Only an object is read, and only one whose type name is set, since the
 * reader tests that first.
 */
function endsWithAction(button: Record<string, unknown>, map: Record<string, unknown>): boolean {
  return ['ButtonAction', 'ButtonLongPressAction'].some((name) => {
    const action = button[name];
    if (!isObject(action) || !truthy(action['__type'])) return false;
    switch (kindOf(action, BUTTON_ACTION_KINDS)) {
      case 'ButtonCommandAction': case 'ButtonActivityAction': case 'ButtonHomeControlAction': return true;
      case 'ButtonSequenceAction': {
        const sequences = Array.isArray(map['Sequences']) ? map['Sequences'] : [];
        const own = sequences.find((s) => isObject(s) && s['SequenceId'] === action['SequenceId']);
        return isObject(own) && Array.isArray(own['Actions']) && own['Actions'].length > 0;
      }
      case 'ButtonProgramAction': return action['ProgramId'] !== undefined && action['ProgramId'] !== null && action['ProgramId'] !== false;
      default: return false;
    }
  });
}

/**
 * Every other place where the engine's load raises on a field, `todo-touch.md` 6.10, beyond a missing list
 * (`checkLists`) and a type name (`checkTypes`): walked over the documents themselves as those two are, because
 * the view reads leniently, and run beside them in `refusalsBeforeASync`. The reading, one row per place with
 * file and line, is the lab's `work/touch-firmware/notes/6.10-reader-raises.md`, section 1; the argument is the
 * header of `test/touch-check.test.ts`. Every rule is `refused`: each place raises inside `loadAll`, which
 * nothing catches, and the task that loads the configuration ends, `firmware.md` "A configuration that fails to
 * load".
 *
 * **Six rules, one per kind of raise**, each named for what is wrong with the value:
 *
 * * `entry not an object`: an entry of a list the load walks without telling entries apart by type, read off
 *   for a field it then indexes, uses as a key or passes to a string function. Devices and activities
 *   (`getDevicesConfiguration`, `getActivitiesConfiguration`), a device's commands (`getCommandsAndToggleBytes`),
 *   an input feature's inputs, a map's sequences, a protocol's segments, encodings and atoms (`addIRSegments`,
 *   `addCodeSegments`, `processAtoms`) raise for every value that is not an object; a protocol and a state
 *   value only for null, a number or a boolean, since a string or an array there reads as an empty entry; a
 *   home control action's first three targets for null, a string, a number or `true`, which `next` raises on.
 * * `not a number`: a value used in arithmetic, a bitwise operation or a sort. `DeviceType` and
 *   `ActivityGroup` (`+ 1`), a device's `Transport` and a command's `TransportType` (`bit.band`, in the
 *   reader and in the start's fixes, `postLoad`), a delay step's `Duration` on an activity and in a sequence
 *   (`* 1000`), `ActionOrder`, `Order` and `InputOrder` (table keys `orderTableItems` sorts), a protocol's
 *   `CarrierFrequency`, a code segment's `TotalLength`, an encoding's `BitType` and an atom's `Value`. A
 *   string of digits is refused too, `isNumber`. An absent value is the view's `required field` where the
 *   reference already names it, and this rule's otherwise.
 * * `not text`: a value passed to a string function, absent included where nothing defaults it: a command's
 *   `Name` and `Raw` (`string.lower`, `string.sub` unless null), a device's `Manufacturer` (`postLoad`) and
 *   `Model` when true (`getCursorInfo`), `CommandName` on the three command actions and `IRCommandName` on a
 *   feature's actions when set, an activity map's `ButtonMapIdentifier` (`string.find`), a hard key's
 *   `ButtonKey` on a map whose identifier holds `16420` (`string.lower`), a segment's `Name` unless it equals
 *   the protocol's, and the protocol's own `Name` (`getSegmentId`'s `#`, and `__tostring` when an atom list is
 *   absent), asked of every IR protocol with a segment, the safe side of the reader's two conditions.
 * * `required field`: a value used as a table key and absent, so "table index is nil": an input's `InputName`
 *   and `InputOrder`, a state value's `StateValueName` when its actions are read, a device, activity or root
 *   map's `ButtonMapIdentifier`, a button's name, `ButtonKey` or `MenuItem.IndexInMenu`, when the button ends
 *   with an action, `endsWithAction`; and a value indexed and absent: a screen entry's `MenuItem`, an IR
 *   segment's `Payload`.
 * * `missing list` and `not a list`: a list walked with `ipairs` or `next` that is not a table. An IR
 *   protocol's `IRSegments` and `CodeSegments` and a payload's `Encodings` are walked whatever they are, so
 *   absent is refused, `missing list`; a device's `Commands`, every atom list and a home control action's
 *   `Targets` only when true, so absent and `false` pass and null, a string, a number or `true` is refused,
 *   `not a list`.
 * * `alternatives not an object`: an activity's `Alternatives`, when a string, is decoded under a guard and
 *   the result indexed outside it, so text that decodes to a number, a boolean or null raises. Decoded here by
 *   `JSON.parse`, whose leniency against the remote's decoder is not compared: text that only one of them
 *   decodes is not refused.
 * * `no power state`: a device the start's fixes take for a Wii, its `Transport` holding 8 and a command whose
 *   `TransportType` holds 8 or 32 naming a protocol called `WiiBT 6 Bit`, gets its power state's next actions
 *   set (`postLoad`), which raises when it has none: no feature of the power kind, and no internal state named
 *   `Power`. The engine takes the first such command in a table's order, which is not defined; any one is
 *   enough here, the safe side.
 *
 * **What it does not walk, and why.** A list or entry the reader does not reach, as `typePlaces` decides it; a
 * protocol of any type but `IrProtocol`, which reads its id and name alone; the Context, which the load reads
 * with `tostring`; and every value the engine reads at a key press rather than at the load, which the lab note
 * lists as not read. The start's compatibility pass is not walked: by the same note's section 2 it cannot meet
 * a set of ours.
 */
export function checkFields(documents: SyncDocuments): Finding[] {
  const out: Finding[] = [];
  const found = (rule: Rule, document: string, path: string, message: string): void => {
    out.push({ rule, effect: 'refused', document, path, message });
  };
  const ending = 'so the engine\'s reader raises and the configuration does not load';
  const notObject = (document: string, path: string): void => found('entry not an object', document, path, `the entry is not an object, and the reader reads fields off it, ${ending}`);
  const notNumber = (document: string, path: string, x: unknown): void => found('not a number', document, path,
    x === undefined ? `the field is absent where the reader computes with it, ${ending}` : `the field is not a number where the reader computes with it or sorts by it (a string of digits is refused too), ${ending}`);
  const notText = (document: string, path: string, x: unknown): void => found('not text', document, path,
    x === undefined ? `the field is absent where the reader passes it to a string function, ${ending}` : `the field is neither a string nor a number where the reader passes it to a string function, ${ending}`);
  const required = (document: string, path: string, what: string): void => found('required field', document, path, `${what}, ${ending}`);
  const notList = (document: string, path: string): void => found('not a list', document, path, `the field is set and is not a list, which the reader walks, ${ending}`);
  const missingList = (document: string, path: string): void => found('missing list', document, path, `the field is not a list, which the reader walks without a check, ${ending}`);
  const list = (x: unknown): readonly unknown[] => (Array.isArray(x) ? x : []);
  const field = (x: unknown, name: string): unknown => (isObject(x) ? x[name] : undefined);
  /** `string.lower(x or "")`: absent and `false` become the empty name, anything else has to be text. */
  const orEmpty = (document: string, path: string, x: unknown): void => { if (truthy(x) && !isText(x)) notText(document, path, x); };

  // DeviceList, `getDevicesConfiguration`, `getCommandsAndToggleBytes` and `getStatesConfiguration`; then the
  // start's fixes over each device, `postLoad`.
  const protocolNames = new Map<string, unknown>();
  list(field(documents.ProtocolList, 'Protocols')).forEach((p) => { if (isObject(p)) protocolNames.set(String(p['Id-']), p['Name']); });
  list(field(documents.DeviceList, 'DevicesWithFeatures')).forEach((item, d) => {
    const at = `DevicesWithFeatures[${d}]`;
    if (!isObject(item)) { notObject('DeviceList', at); return; }
    // A record that is not an object is the view's `required field`, every field it requires being absent.
    const device = item['Device'];
    if (isObject(device)) {
      for (const name of ['DeviceType', 'Transport']) if (states(device, name) && !isNumber(device[name])) notNumber('DeviceList', `${at}.Device.${name}`, device[name]);
      if (states(device, 'Manufacturer') && !isText(device['Manufacturer'])) notText('DeviceList', `${at}.Device.Manufacturer`, device['Manufacturer']);
      // `getCursorInfo` lowers the model when it is true, which JSON null is.
      if (truthy(device['Model']) && !isText(device['Model'])) notText('DeviceList', `${at}.Device.Model`, device['Model']);
    }
    const commands = item['Commands'];
    if (truthy(commands) && !isTable(commands)) notList('DeviceList', `${at}.Commands`);
    list(commands).forEach((c, i) => {
      const path = `${at}.Commands[${i}]`;
      if (!isObject(c)) { notObject('DeviceList', path); return; }
      if (!isText(c['Name'])) notText('DeviceList', `${path}.Name`, c['Name']);
      // An absent `Raw` key is the view's `required field`; null is passed over.
      if (states(c, 'Raw') && c['Raw'] !== null && !isText(c['Raw'])) notText('DeviceList', `${path}.Raw`, c['Raw']);
      if (states(c, 'TransportType') && !isNumber(c['TransportType'])) notNumber('DeviceList', `${path}.TransportType`, c['TransportType']);
    });
    list(item['DeviceFeatures']).forEach((feature, f) => {
      const path = `${at}.DeviceFeatures[${f}]`;
      const kind = kindOf(feature, FEATURE_KINDS);
      if (!isObject(feature)) return;
      // An input's order and name are table keys, the order sorted, and every input reaches both.
      if (kind === 'InputFeature') {
        list(feature['Inputs']).forEach((input, i) => {
          const where = `${path}.Inputs[${i}]`;
          if (!isObject(input)) { notObject('DeviceList', where); return; }
          if (input['InputOrder'] === undefined) required('DeviceList', `${where}.InputOrder`, 'the input states no InputOrder, which the reader keys it by');
          else if (!isNumber(input['InputOrder'])) notNumber('DeviceList', `${where}.InputOrder`, input['InputOrder']);
          if (input['InputName'] === undefined) required('DeviceList', `${where}.InputName`, 'the input states no InputName, which the reader keys its actions by');
        });
      }
      // A state value is read field by field, so only one that cannot be indexed raises; its name is a key
      // when its actions are read.
      if (kind === 'InternalStateFeature') {
        list(feature['StateValues']).forEach((value, v) => {
          const where = `${path}.StateValues[${v}]`;
          if (value === null || typeof value === 'number' || typeof value === 'boolean') { notObject('DeviceList', where); return; }
          if (isObject(value) && (value['ActionSetType'] === 1 || value['ActionSetType'] === 2) && value['StateValueName'] === undefined) {
            required('DeviceList', `${where}.StateValueName`, 'the state value states no StateValueName, which the reader keys its actions by');
          }
        });
      }
    });
    // `postLoad`: a device taken for a Wii gets its power state's next actions set.
    if (isObject(device) && isNumber(device['Transport']) && ((device['Transport'] as number) & 8) === 8) {
      const wii = list(commands).some((c) => isObject(c) && isNumber(c['TransportType']) && ((c['TransportType'] as number) & 40) !== 0
        && protocolNames.get(String(c['ProtocolId'])) === 'WiiBT 6 Bit');
      const power = list(item['DeviceFeatures']).some((f) => {
        const kind = kindOf(f, FEATURE_KINDS);
        return kind === 'PowerFeature' || (kind === 'InternalStateFeature' && field(f, 'StateName') === 'Power');
      });
      if (wii && !power) {
        found('no power state', 'DeviceList', at, `the device is one the engine takes for a Wii and has no power state, whose actions the engine sets at load, ${ending}`);
      }
    }
  });

  // ActivityList, `getActivitiesConfiguration`.
  list(field(documents.ActivityList, 'Activities')).forEach((activity, a) => {
    const at = `Activities[${a}]`;
    if (!isObject(activity)) { notObject('ActivityList', at); return; }
    if (states(activity, 'ActivityGroup') && !isNumber(activity['ActivityGroup'])) notNumber('ActivityList', `${at}.ActivityGroup`, activity['ActivityGroup']);
    const alternatives = activity['Alternatives'];
    if (typeof alternatives === 'string') {
      let decoded: unknown = {};
      try { decoded = JSON.parse(alternatives); } catch { /* the reader's decode fails too, under its guard */ }
      if (decoded === null || typeof decoded === 'number' || typeof decoded === 'boolean') {
        found('alternatives not an object', 'ActivityList', `${at}.Alternatives`, `the text decodes to a value the reader then reads fields off, ${ending}`);
      }
    }
  });

  // The entries `typePlaces` walks, read for their other fields.
  for (const place of typePlaces(documents)) {
    const e = place.entry;
    if (!isObject(e)) continue;
    const { document, path } = place;
    switch (place.kind) {
      case 'feature action':
        // `getActionItems` lowers the command name unless it is null.
        if (e['IRCommandName'] !== null) orEmpty(document, `${path}.IRCommandName`, e['IRCommandName']);
        break;
      case 'activity step': {
        // An absent `ActionOrder` is the view's `required field`.
        if (states(e, 'ActionOrder') && !isNumber(e['ActionOrder'])) notNumber(document, `${path}.ActionOrder`, e['ActionOrder']);
        const kind = kindOf(e, ACTIVITY_STEP_KINDS);
        if (kind === 'CommandActivityAction') orEmpty(document, `${path}.CommandName`, e['CommandName']);
        if (kind === 'DelayActivityAction' && !isNumber(e['Duration'])) notNumber(document, `${path}.Duration`, e['Duration']);
        break;
      }
      case 'sequence step': {
        // An absent `Order` is the view's `required field`.
        if (states(e, 'Order') && !isNumber(e['Order'])) notNumber(document, `${path}.Order`, e['Order']);
        const kind = kindOf(e, SEQUENCE_STEP_KINDS);
        if (kind === 'ButtonCommandAction') orEmpty(document, `${path}.CommandName`, e['CommandName']);
        if (kind === 'ButtonDelayAction' && !isNumber(e['Duration'])) notNumber(document, `${path}.Duration`, e['Duration']);
        break;
      }
      case 'map': {
        const kind = kindOf(e, MAP_KINDS);
        const id = e['ButtonMapIdentifier'];
        if (kind !== undefined && id === undefined) required(document, `${path}.ButtonMapIdentifier`, 'the map states no ButtonMapIdentifier, which the reader keys it by');
        else if (kind === 'ActivityButtonMap' && !isText(id)) notText(document, `${path}.ButtonMapIdentifier`, id);
        // A map's sequences, when a table, are each read for their steps.
        if (isTable(e['Sequences'])) list(e['Sequences']).forEach((s, i) => { if (!isObject(s)) notObject(document, `${path}.Sequences[${i}]`); });
        break;
      }
      case 'button': {
        const map = locateMap(documents, path);
        const kind = kindOf(e, BUTTON_KINDS);
        const mapKind = kindOf(map, MAP_KINDS);
        const id = field(map, 'ButtonMapIdentifier');
        // A keyboard code is looked up by the lowered key name on an activity map whose identifier holds 16420.
        const lowered = kind === 'HardRemoteButton' && mapKind === 'ActivityButtonMap' && isText(id) && String(id).includes('16420');
        if (lowered && !isText(e['ButtonKey'])) { notText(document, `${path}.ButtonKey`, e['ButtonKey']); break; }
        let name: unknown = '';
        let at = '';
        if (kind === 'HardRemoteButton' || kind === 'GestureRemoteButton') { name = e['ButtonKey']; at = 'ButtonKey'; }
        if (kind === 'SoftRemoteButton') {
          const item = e['MenuItem'];
          if (item === undefined || item === null || typeof item === 'number' || typeof item === 'boolean') {
            required(document, `${path}.MenuItem`, 'the screen entry states no MenuItem object, which the reader reads its index off');
            break;
          }
          name = field(item, 'IndexInMenu');
          at = 'MenuItem.IndexInMenu';
        }
        if (name === undefined && isObject(map) && endsWithAction(e, map)) {
          required(document, `${path}.${at}`, 'the button states no name and ends with an action, which the reader keys it by its name');
        }
        break;
      }
      case 'button action': {
        const kind = truthy(e['__type']) ? kindOf(e, BUTTON_ACTION_KINDS) : undefined;
        if (kind === 'ButtonCommandAction') orEmpty(document, `${path}.CommandName`, e['CommandName']);
        if (kind === 'ButtonHomeControlAction') {
          const targets = e['Targets'];
          if (truthy(targets) && !isTable(targets)) notList(document, `${path}.Targets`);
          // Only the first three are read, by position, which an array alone has.
          list(targets).slice(0, 3).forEach((t, i) => { if (truthy(t) && !isTable(t)) notObject(document, `${path}.Targets[${i}]`); });
        }
        break;
      }
      default:
        break;
    }
  }

  // ProtocolList, `initializeFromHarmonyProtocol`: an IR protocol's segments, `addIRSegments`, `addCodeSegments`,
  // `getSegmentId` and `processAtoms`. Every other type reads its id and name alone.
  list(field(documents.ProtocolList, 'Protocols')).forEach((protocol, p) => {
    const at = `Protocols[${p}]`;
    if (protocol === null || typeof protocol === 'number' || typeof protocol === 'boolean') { notObject('ProtocolList', at); return; }
    if (!isObject(protocol) || protocol['__type'] !== 'IrProtocol') return;
    if (!isNumber(protocol['CarrierFrequency'])) notNumber('ProtocolList', `${at}.CarrierFrequency`, protocol['CarrierFrequency']);
    const atoms = (path: string, x: unknown): void => {
      if (!truthy(x)) return;
      if (!isTable(x)) { notList('ProtocolList', path); return; }
      list(x).forEach((atom, i) => {
        if (!isObject(atom)) notObject('ProtocolList', `${path}[${i}]`);
        else if (!isNumber(atom['Value'])) notNumber('ProtocolList', `${path}[${i}].Value`, atom['Value']);
      });
    };
    let segments = 0;
    for (const name of ['IRSegments', 'CodeSegments'] as const) {
      const xs = protocol[name];
      if (!isTable(xs)) { missingList('ProtocolList', `${at}.${name}`); continue; }
      list(xs).forEach((segment, s) => {
        const path = `${at}.${name}[${s}]`;
        if (!isObject(segment)) { notObject('ProtocolList', path); return; }
        segments += 1;
        if (segment['Name'] !== protocol['Name'] && typeof segment['Name'] !== 'string') notText('ProtocolList', `${path}.Name`, segment['Name']);
        if (name === 'IRSegments') {
          const payload = segment['Payload'];
          if (!isObject(payload)) required('ProtocolList', `${path}.Payload`, 'the segment states no Payload object, which the reader reads the bits off');
          else if (!isTable(payload['Encodings'])) missingList('ProtocolList', `${path}.Payload.Encodings`);
          else {
            list(payload['Encodings']).forEach((encoding, n) => {
              const where = `${path}.Payload.Encodings[${n}]`;
              if (!isObject(encoding)) { notObject('ProtocolList', where); return; }
              if (!isNumber(encoding['BitType'])) notNumber('ProtocolList', `${where}.BitType`, encoding['BitType']);
              atoms(`${where}.Atoms`, encoding['Atoms']);
            });
          }
          atoms(`${path}.Header`, segment['Header']);
          atoms(`${path}.Trailer`, segment['Trailer']);
        } else {
          if (!isNumber(segment['TotalLength'])) notNumber('ProtocolList', `${path}.TotalLength`, segment['TotalLength']);
          atoms(`${path}.Atoms`, segment['Atoms']);
        }
      });
    }
    if (segments > 0 && typeof protocol['Name'] !== 'string') notText('ProtocolList', `${at}.Name`, protocol['Name']);
  });
  return out;
}

/** The map a button's path `ButtonMaps[m].Buttons[b]` lies in. */
function locateMap(documents: SyncDocuments, path: string): unknown {
  const m = /^ButtonMaps\[(\d+)\]/.exec(path);
  const maps = isObject(documents.MapList) ? documents.MapList['ButtonMaps'] : undefined;
  return m !== null && Array.isArray(maps) ? maps[Number(m[1])] : undefined;
}

/**
 * Every place the engine's load raises on, read off the documents themselves: `missing list`, `missing type`
 * and the rules of `checkFields`. **This is the gate's third step and the answerer's test of a document the
 * remote hands up**, `packages/corpus/src/touchsync.ts`, so a new rule of the load joins both by being here.
 */
export function readerRaises(documents: SyncDocuments): Finding[] {
  return [...checkLists(documents), ...checkTypes(documents), ...checkFields(documents)];
}

/**
 * `screens raise`, refused: the places where the remote's **screens**, a Lua program of their own beside the
 * engine, raise on a document the engine's load takes, `todo-touch.md` 6.10. The reading, one row per place, is
 * the lab's `work/touch-firmware/notes/6.10-screens-reads.md`; the screens read the same stored documents with a
 * JSON decoder of their own whose null is again a userdata with no metatable, and their `string` is slnunicode's
 * table, which takes a string or a number like the engine's.
 *
 * **What a raise there costs decides what is refused.** The screens catch a raise in an event, a timer, a
 * drawing and each turn of their main loop, so most cost one screen or one key. **Three cost the whole
 * remote**, and every place of those three is refused here:
 *
 * * the screens' program ends at every start: a raise while their style module first loads, which reads the
 *   background setting and runs the screens' first reading of the Context and the favourites;
 * * the error screen at every start, whose one button is a factory reset: a raise while the first screens are
 *   built, the home list of activities, the favourites page, and the device list on an account with no
 *   activity;
 * * a sync that never commits: a raise in the screens' half of a sync, after the engine has loaded the set and
 *   before the screens send the commit. That the sync then waits rather than aborts is inferred.
 *
 * **And the labels, names and pictures chapter 8 composes**, refused wherever they raise even when the cost is
 * one screen, since a set of ours should not break a screen either: a device's `Name`, a screen entry's
 * `TextOnRemote` and a sequence's `Name`. **The other screen raises are not refused**, each costing one screen,
 * one key, one timer or the screens' hearing of the engine until a restart; the lab note lists them and the
 * reference names them as not refused.
 *
 * Where the reading names a narrower condition than this module can state, a built in picture name or the
 * matching settings row, the rule asks the wider one, the safe side, and says so.
 */
export function checkScreens(documents: SyncDocuments): Finding[] {
  const out: Finding[] = [];
  const found = (document: string, path: string, what: string, cost: string): void => {
    out.push({ rule: 'screens raise', effect: 'refused', document, path, message: `${what}, which the remote's screens raise on: ${cost}` });
  };
  const AT_START = 'their program ends at every start';
  const ERROR_SCREEN = 'the error screen at every start, whose one way on is a factory reset';
  const NO_COMMIT = 'the sync is never committed';
  const ONE_SCREEN = 'that screen does not draw';
  const list = (x: unknown): readonly unknown[] => (Array.isArray(x) ? x : []);
  /** A value a guard lets through and then indexes, concatenates or passes to a string function. */
  const raisesAsText = (x: unknown): boolean => truthy(x) && !isText(x);

  // Settings: the background at the style module's first load, every row through `getRemoteSettings`, the
  // pictures in the sync, `submitBackgroundImageRequest`. Every row's values are asked, the safe side of "the
  // row a reader asks for".
  const settings = documents.Settings;
  if (isObject(settings)) {
    let background: unknown;
    let userImages: readonly unknown[] = [];
    list(settings['Settings']).forEach((row, r) => {
      const at = `Settings[${r}]`;
      if (!isObject(row)) {
        if (row === null || typeof row === 'number' || typeof row === 'boolean') found('Settings', at, 'the settings row is not an object', AT_START);
        return;
      }
      const values = row['Values'];
      if (values === undefined || values === null || typeof values === 'number' || typeof values === 'boolean') {
        found('Settings', `${at}.Values`, 'the settings row states no list of values', AT_START);
        return;
      }
      if (row['Name'] === 'BackgroundImage' && Array.isArray(values) && values.length > 0) {
        background = values[0];
        if (!isText(background)) found('Settings', `${at}.Values[0]`, 'the background picture is neither a string nor a number', AT_START);
      }
      if (row['Name'] === 'UserImages' && Array.isArray(values)) {
        userImages = values;
        values.forEach((v, i) => { if (!isText(v)) found('Settings', `${at}.Values[${i}]`, 'a picture of the user\'s is neither a string nor a number', NO_COMMIT); });
      }
    });
    if (userImages.length > 0 && typeof settings['UserImageBucketUri'] !== 'string') found('Settings', 'UserImageBucketUri', 'the address of the user\'s pictures is not a string while the user has pictures', NO_COMMIT);
    // Asked whenever there is a background, the safe side of "a background that is not built in".
    if (background !== undefined && typeof settings['DefaultImageBucketUri'] !== 'string') found('Settings', 'DefaultImageBucketUri', 'the address of the default pictures is not a string while a background is set', NO_COMMIT);
  }

  // Context: the language at the style module's first load and in the sync, `loadRemoteContext`; the household's
  // address in the sync, `submitContentUserRequest`.
  const context = documents.Context;
  if (isObject(context)) {
    const language = context['Language'];
    if (language !== undefined && !(typeof language === 'string' && language.includes('-'))) {
      found('Context', 'Language', 'the language is not a string of a language and a country joined by a hyphen', AT_START);
    }
    if (raisesAsText(context['HouseholdUserProfileUri'])) found('Context', 'HouseholdUserProfileUri', 'the household\'s address is neither a string nor a number', NO_COMMIT);
  }

  // ActivityList: the home list at start, `reorderActivities`, `newActivityButton`, `getActivityImage`,
  // `isGoogleTvActivity`; the pictures in the sync, `submitActivityImageRequest`; the favourites at start and
  // in the sync, `updateInfoFromActivity`.
  list(isObject(documents.ActivityList) ? documents.ActivityList['Activities'] : undefined).forEach((activity, a) => {
    if (!isObject(activity)) return;
    const at = `Activities[${a}]`;
    if (!isNumber(activity['ActivityOrder'])) found('ActivityList', `${at}.ActivityOrder`, 'the activity\'s place on the list is not a number', ERROR_SCREEN);
    if (!isText(activity['Name'])) found('ActivityList', `${at}.Name`, 'the activity\'s name is neither a string nor a number', ERROR_SCREEN);
    const image = activity['ImageKey'];
    const base = activity['BaseImageUri'];
    if (raisesAsText(image) && image !== null) found('ActivityList', `${at}.ImageKey`, 'the activity\'s picture is neither a string nor a number', ERROR_SCREEN);
    // Asked of every picture named by text, the safe side of "a picture that is not built in".
    else if (isText(image) && !isText(base)) found('ActivityList', `${at}.BaseImageUri`, 'the activity names a picture and no text address to fetch it from', ERROR_SCREEN);
    else if (base === true || isTable(base)) found('ActivityList', `${at}.BaseImageUri`, 'the address of the activity\'s picture is neither a string nor a number', NO_COMMIT);
    const tuning = truthy(activity['IsTuningDefault']);
    if ((tuning || activity['Type'] === 1) && !isTable(activity['Roles'])) found('ActivityList', `${at}.Roles`, 'the activity states no list of roles', ERROR_SCREEN);
    if (tuning && activity['Id-'] === undefined) found('ActivityList', `${at}.Id-`, 'the activity that tunes channels states no id', ERROR_SCREEN);
  });

  // DeviceList: the favourites at start and in the sync, `updateContentProfileKeys`; the device list,
  // `newDeviceButton`, which is the first screen on an account with no activity.
  list(isObject(documents.DeviceList) ? documents.DeviceList['DevicesWithFeatures'] : undefined).forEach((item, d) => {
    const device = field(item, 'Device');
    if (!isObject(device)) return;
    const at = `DevicesWithFeatures[${d}].Device`;
    if (device['Id-'] === undefined) found('DeviceList', `${at}.Id-`, 'the device states no id', ERROR_SCREEN);
    if (device['Name'] !== undefined && !isText(device['Name'])) found('DeviceList', `${at}.Name`, 'the device\'s name is neither a string nor a number', ONE_SCREEN);
  });

  // MapList: a screen entry's text on the activity's or device's command page, `newCommandButton`, for an entry
  // with a press that is not on the number pad and not hidden; a sequence's name on the sequence list.
  list(isObject(documents.MapList) ? documents.MapList['ButtonMaps'] : undefined).forEach((map, m) => {
    if (!isObject(map)) return;
    list(map['Buttons']).forEach((button, b) => {
      if (!isObject(button) || kindOf(button, BUTTON_KINDS) !== 'SoftRemoteButton') return;
      if (!isObject(button['ButtonAction']) || button['FunctionGroupType'] === 2 || button['ButtonState'] === 4) return;
      if (!isText(button['TextOnRemote'])) found('MapList', `ButtonMaps[${m}].Buttons[${b}].TextOnRemote`, 'the screen entry\'s text is neither a string nor a number', ONE_SCREEN);
    });
    list(map['Sequences']).forEach((sequence, s) => {
      if (raisesAsText(field(sequence, 'Name'))) found('MapList', `ButtonMaps[${m}].Sequences[${s}].Name`, 'the sequence\'s name is neither a string nor a number', ONE_SCREEN);
    });
  });

  // The favourites, by their addresses: the user's at start and in the sync, `updateContentUser`,
  // `getStations` and the favourites page; a service's line up at the style module's first load,
  // `setPopularChannels`, and on the favourites page; a device's dial positions in the sync,
  // `submitSpeakerImageRequest`, and on the favourites page.
  for (const [name, document] of Object.entries(documents)) {
    if (!isObject(document)) continue;
    if (name.startsWith(CONTENT_USER)) {
      const preferences = document['preferences'];
      if (preferences === undefined) continue;
      if (!isObject(preferences)) { found(name, 'preferences', 'the favourites are not an object', ERROR_SCREEN); continue; }
      for (const [key, services] of Object.entries(preferences)) {
        if (!isObject(services)) { found(name, `preferences.${key}`, 'a device\'s favourites are not an object', ERROR_SCREEN); continue; }
        for (const [service, one] of Object.entries(services)) {
          if (!isObject(one)) { found(name, `preferences.${key}.${service}`, 'a service\'s favourites are not an object', ERROR_SCREEN); continue; }
          const stations = one['stations'];
          if (stations === null || typeof stations === 'number' || typeof stations === 'boolean') found(name, `preferences.${key}.${service}.stations`, 'the stations are not a list', ERROR_SCREEN);
        }
      }
    } else if (name.startsWith(CONTENT_SERVICE)) {
      const channels = document['channels'];
      if (!isTable(channels)) { found(name, 'channels', 'the service states no list of channels', AT_START); continue; }
      list(channels).forEach((channel, c) => {
        const at = `channels[${c}]`;
        const station = field(channel, 'station');
        if (truthy(field(channel, 'popularRank')) && !isObject(station)) found(name, `${at}.station`, 'a ranked channel states no station', AT_START);
        if (raisesAsText(field(channel, 'number'))) found(name, `${at}.number`, 'the channel\'s number is neither a string nor a number', ERROR_SCREEN);
        if (raisesAsText(field(station, 'shortName'))) found(name, `${at}.station.shortName`, 'the station\'s name is neither a string nor a number', ERROR_SCREEN);
      });
    } else if (name.startsWith(CONTENT_DEVICE)) {
      const services = document['services'];
      if (!isTable(services)) { found(name, 'services', 'the device states no services', NO_COMMIT); continue; }
      for (const [service, one] of Object.entries(services as object)) {
        if (!isObject(one)) { found(name, `services.${service}`, 'a service of the device is not an object', NO_COMMIT); continue; }
        const positions = one['dialPositions'];
        if (!isTable(positions)) { found(name, `services.${service}.dialPositions`, 'the service states no list of dial positions', NO_COMMIT); continue; }
        Object.entries(positions as object).forEach(([p, position]) => {
          const at = `services.${service}.dialPositions[${p}]`;
          if (!isObject(position)) { found(name, at, 'a dial position is not an object', NO_COMMIT); return; }
          for (const f of ['name', 'image', 'number']) {
            if (raisesAsText(position[f])) found(name, `${at}.${f}`, `the dial position's ${f} is neither a string nor a number`, ERROR_SCREEN);
          }
        });
      }
    }
  }
  return out;
}

/** A field of an object, or undefined for anything that is not one. */
function field(x: unknown, name: string): unknown {
  return isObject(x) ? x[name] : undefined;
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
 * 3. **every place the engine's load raises on**, `readerRaises`: every list the reader walks, every type
 *    name it searches and every other field it computes with, keys by or passes to a string function,
 *    `missing list`, `missing type` and `checkFields`'s rules, together, since all are read off the documents
 *    themselves and all end the load: a set is told every place of any of them at once, `todo-touch.md`
 *    6.7.1 and 6.10
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
  const structure = [...readerRaises(documents), ...checkScreens(documents)];
  if (structure.length > 0) return structure;
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
