/**
 * Devices and activities taken out of a Harmony Touch's documents, **with everything that names them**. The general
 * removal: where `withoutTouchDevice` and `withoutTouchActivity` in `compose.ts` are the exact inverse of an
 * addition of ours and refuse anything another document names, these take out devices and activities of Logitech's
 * too, the remote's own, and follow every reference to them through the four documents that hold one.
 *
 * **Where a device or an activity is named, and so what goes.** Measured on the set the bench Touch held and on the
 * recorded full sync, and read in the engine's and the screens' readers, `activities-and-buttons.md` "Taking out an
 * activity and a device" and the lab's `work/touch-firmware/notes/8.5-preflight.md`:
 *
 * * **A device** is named by its entry in `DeviceList` (and inside it by its features' `DeviceId-`, its profile key
 *   and profile address, which go with the entry); by its own map in `MapList`, `16417Device` and its id; by every
 *   activity role and every start or end step naming it by `DeviceId-`; by every button action and sequence step of
 *   any map naming it by `DeviceId-`; by the protocol definitions its commands name, which go when no other device
 *   names them; and, when it is the device the favourite channels are tuned through, by the favourites documents,
 *   which are keyed by its profile and are not among the six. `Context` and `Settings` name no device.
 * * **An activity** is named by its entry in `ActivityList`, by its own map, `16417Activity` and its id, and by any
 *   button whose action starts it, `ButtonActivityAction` with its `ActivityId-`. `Context` and `Settings` name no
 *   activity; the favourite channels belong to the tuning default activity.
 *
 * **What is taken out and what is changed.** An entry, a map, a role, a step, a protocol and a sequence step naming a
 * removed device are taken out. **A button is taken out when its press names what is removed**, since a button whose
 * press is gone is either a key that raises on every press in the screens, `init.lua` `fireIr`, or one whose long press
 * the engine would treat as its press; **a long or double press naming it is set to null and the button stays**, which
 * is the form every button without one carries. A sequence left with no command step is taken out with the buttons that
 * run it. Everything else is carried as it stands, key order included.
 *
 * **Two numberings are closed up, and one is left alone, each for a reason read in the remote's programs.**
 *
 * * **A screen list's `IndexInMenu`**, when an entry of group 0 or 36 is taken out: the engine keeps the list by
 *   index and the screens show entry `IndexInMenu + 1` and build their list as a table keyed by it, walked with
 *   `pairs` (`reorderActivityButtonMaps` in `appscommon/harmony.lua`), whose order over a gap Lua does not state. So
 *   every later entry of the two groups moves down by the number taken out before it, repeated indexes moving
 *   together so that which of two shadows the other is kept. The number pad, group 2, is placed by command name and
 *   kept apart in the engine, so its indexes are left alone.
 * * **`ActivityOrder`**, when an activity is taken out: the screens build the home list the same way, a table keyed by
 *   `ActivityOrder + 1` walked with `pairs` (`reorderActivities`), and the remote's own reordering writes 0 to n - 1
 *   (`juniper/activity.lua`). So the activities shown are numbered again from 0 in the order they had; a hidden one,
 *   negative, keeps its number.
 * * **`PowerOnOrder` and `PowerOffOrder` are left as they are**: the engine sorts each into a list, `orderTableItems`
 *   in `loader/userconfigreader.lua`, so a gap costs nothing there, the screens read neither, and Logitech's own
 *   documents carry a gap already, an activity whose power off orders start at 2. `ActionOrder` is kept the same way,
 *   sorted by the same routine.
 *
 * **Refused, each a removal the remote would mishandle or that would cost the person something silently**:
 * a document without its list; an id not listed, or given twice; for activities, the tuning default, whose favourite
 * channels would be left on no activity, and taking out every activity the list shows; for devices, the device the
 * favourite channels are tuned through, whose favourites documents are keyed by its profile and would then be on
 * nothing, so the page would show none (`getStations` in `appscommon/favoritesmanager.lua` finds no profile and
 * returns an empty list); a device whose removal leaves an activity with no role, which the screens' home list then
 * drops (`reorderActivities` keeps activities with roles); and taking out every device. **The running activity is not
 * refused here**: nothing a host can ask a Touch on this project's rail says which activity runs, so the run in the lab
 * starts with Off pressed instead.
 *
 * Nothing is changed in place; the four documents come back as copies, `Context` and `Settings` untouched and not
 * returned. **Nothing here sends anything.**
 */
import type { ActivityList, DeviceList, Id, MapList, ProtocolList, SyncDocuments } from './documents.ts';
import { idText, kindOf } from './documents.ts';
import { FAVOURITES_ROLES, mapIdentifier, readConfiguration } from './read.ts';
import { ComposeRefusal } from './compose.ts';

/** The four documents a device or an activity is named in, as a removal gives them back. */
export interface RemovedDocuments {
  readonly ActivityList: ActivityList;
  readonly DeviceList: DeviceList;
  readonly MapList: MapList;
  readonly ProtocolList: ProtocolList;
}

/** What to take out: devices and activities by id. */
export interface TouchRemoval {
  readonly devices?: readonly Id[];
  readonly activities?: readonly Id[];
}

/** What to take out, as a person names it: devices and activities by the names the lists show. */
export interface NamedRemoval {
  readonly devices?: readonly string[];
  readonly activities?: readonly string[];
}

type Json = Record<string, unknown>;
const isRecord = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x);
const copyOf = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const listIn = (doc: unknown, field: string): Json[] | undefined => {
  const list = isRecord(doc) ? doc[field] : undefined;
  return Array.isArray(list) ? (list as Json[]) : undefined;
};
const deviceIdOf = (entry: unknown): string => (isRecord(entry) && isRecord(entry['Device']) ? idText(entry['Device']['Id-'] as Id) : '');
const ACTIONS = ['ButtonAction', 'ButtonLongPressAction', 'ButtonDoublePressAction'] as const;
/** The screen list's two groups that share its numbering, `reorderActivityButtonMaps` and `reorderDeviceButtonMaps`. */
const LIST_GROUPS = [0, 36];

/** The four documents, copied, or a refusal naming the first one whose list is missing. */
function four(documents: SyncDocuments): { activities: Json[]; devices: Json[]; maps: Json[]; protocols: Json[] } {
  const activities = listIn(documents.ActivityList, 'Activities');
  const devices = listIn(documents.DeviceList, 'DevicesWithFeatures');
  const maps = listIn(documents.MapList, 'ButtonMaps');
  const protocols = listIn(documents.ProtocolList, 'Protocols');
  if (activities === undefined) throw new ComposeRefusal('ActivityList holds no list of activities');
  if (devices === undefined) throw new ComposeRefusal('DeviceList holds no list of devices');
  if (maps === undefined) throw new ComposeRefusal('MapList holds no list of maps');
  if (protocols === undefined) throw new ComposeRefusal('ProtocolList holds no list of definitions');
  return { activities: copyOf(activities), devices: copyOf(devices), maps: copyOf(maps), protocols: copyOf(protocols) };
}

function documentsOf(documents: SyncDocuments, parts: { activities: Json[]; devices: Json[]; maps: Json[]; protocols: Json[] }): RemovedDocuments {
  return {
    ActivityList: { ...copyOf(documents.ActivityList!), Activities: parts.activities } as unknown as ActivityList,
    DeviceList: { ...copyOf(documents.DeviceList!), DevicesWithFeatures: parts.devices } as unknown as DeviceList,
    MapList: { ...copyOf(documents.MapList!), ButtonMaps: parts.maps } as unknown as MapList,
    ProtocolList: { ...copyOf(documents.ProtocolList!), Protocols: parts.protocols } as unknown as ProtocolList,
  };
}

/** The ids, as text, each listed and given once, or a refusal. */
function idsOf(ids: readonly Id[], listed: readonly string[], what: string): Set<string> {
  if (ids.length === 0) throw new ComposeRefusal(`no ${what} is named to take out`);
  const out = new Set<string>();
  for (const id of ids.map(idText)) {
    if (out.has(id)) throw new ComposeRefusal(`${what} ${id} is named twice`);
    if (!listed.includes(id)) throw new ComposeRefusal(`${what} ${id} is not listed`);
    out.add(id);
  }
  return out;
}

/**
 * One map with the buttons `gone` names taken out and the long or double presses `goneLater` names set to null, its
 * list closed up, and its sequences without a command step taken out with the buttons that run them. `stepGone` says
 * which sequence steps go. Changes the map in place; it is a copy.
 */
function pruneMap(
  map: Json, gone: (action: Json) => boolean, stepGone: (step: Json) => boolean,
): void {
  // Sequences first: a sequence left with no command step runs nothing, and the buttons running it go with it.
  const goneSequences = new Set<string>();
  if (Array.isArray(map['Sequences'])) {
    const kept: Json[] = [];
    for (const s of map['Sequences'] as Json[]) {
      if (!isRecord(s) || !Array.isArray(s['Actions'])) { kept.push(s); continue; }
      const before = (s['Actions'] as Json[]).length;
      const actions = (s['Actions'] as Json[]).filter((a) => !(isRecord(a) && stepGone(a)));
      if (actions.length !== before && !actions.some((a) => isRecord(a) && kindOf(a as { __type?: unknown }) === 'ButtonCommandAction')) {
        goneSequences.add(idText(s['SequenceId'] as Id));
        continue;
      }
      kept.push(actions.length === before ? s : { ...s, Actions: actions });
    }
    map['Sequences'] = kept;
  }
  const names = (a: unknown): boolean => isRecord(a) && (gone(a)
    || (kindOf(a as { __type?: unknown }) === 'ButtonSequenceAction' && goneSequences.has(idText(a['SequenceId'] as Id))));
  if (!Array.isArray(map['Buttons'])) return;
  const removedIndexes: number[] = [];
  const buttons: Json[] = [];
  for (const b of map['Buttons'] as Json[]) {
    if (!isRecord(b)) { buttons.push(b); continue; }
    if (names(b['ButtonAction'])) {
      const index = isRecord(b['MenuItem']) ? b['MenuItem']['IndexInMenu'] : undefined;
      if (kindOf(b as { __type?: unknown }) === 'SoftRemoteButton' && LIST_GROUPS.includes(b['FunctionGroupType'] as number) && typeof index === 'number') removedIndexes.push(index);
      continue;
    }
    const later = ACTIONS.slice(1).filter((field) => names(b[field]));
    buttons.push(later.length === 0 ? b : { ...b, ...Object.fromEntries(later.map((field) => [field, null])) });
  }
  // Close the list's numbering up over the entries taken out: each later entry of the two groups moves down by the
  // number taken out below it, so two entries that shared an index still share one.
  map['Buttons'] = removedIndexes.length === 0 ? buttons : buttons.map((b) => {
    if (!isRecord(b) || kindOf(b as { __type?: unknown }) !== 'SoftRemoteButton' || !LIST_GROUPS.includes(b['FunctionGroupType'] as number)) return b;
    const item = b['MenuItem'];
    if (!isRecord(item) || typeof item['IndexInMenu'] !== 'number') return b;
    const below = removedIndexes.filter((i) => i < (item['IndexInMenu'] as number)).length;
    return below === 0 ? b : { ...b, MenuItem: { ...item, IndexInMenu: (item['IndexInMenu'] as number) - below } };
  });
}

/**
 * `documents` with the activities `ids` taken out, with their maps and every button that starts one, and the
 * activities shown numbered again from 0. The header says what is refused and why.
 */
export function withoutTouchActivities(documents: SyncDocuments, ids: readonly Id[]): RemovedDocuments {
  const parts = four(documents);
  const listed = parts.activities.map((a) => (isRecord(a) ? idText(a['Id-'] as Id) : ''));
  const gone = idsOf(ids, listed, 'activity');
  for (const a of parts.activities) {
    if (isRecord(a) && gone.has(idText(a['Id-'] as Id)) && a['IsTuningDefault'] === true) {
      throw new ComposeRefusal(`activity ${idText(a['Id-'] as Id)} is the one the favourite channels belong to, which would be left on no activity`);
    }
  }
  const shown = (a: Json): boolean => isRecord(a) && typeof a['ActivityOrder'] === 'number' && (a['ActivityOrder'] as number) >= 0;
  const remaining = parts.activities.filter((a) => !(isRecord(a) && gone.has(idText(a['Id-'] as Id))));
  if (!remaining.some(shown)) throw new ComposeRefusal('taking these out leaves no activity on the list');

  // The activities shown, numbered again from 0 in the order they had; the document's own order breaks a tie.
  const order = remaining.map((a, i) => [a, i] as const).filter(([a]) => shown(a))
    .sort(([x, i], [y, j]) => (x['ActivityOrder'] as number) - (y['ActivityOrder'] as number) || i - j);
  const renumbered = new Map(order.map(([a], place) => [a, place]));
  parts.activities = remaining.map((a) => (renumbered.has(a) && renumbered.get(a) !== a['ActivityOrder'] ? { ...a, ActivityOrder: renumbered.get(a)! } : a));

  const identifiers = new Set([...gone].map((id) => mapIdentifier('activity', id)));
  parts.maps = parts.maps.filter((m) => !(isRecord(m) && identifiers.has(m['ButtonMapIdentifier'] as string)));
  const starts = (a: Json): boolean => kindOf(a as { __type?: unknown }) === 'ButtonActivityAction' && gone.has(idText(a['ActivityId-'] as Id));
  for (const m of parts.maps) if (isRecord(m)) pruneMap(m, starts, () => false);
  return documentsOf(documents, parts);
}

/**
 * `documents` with the devices `ids` taken out, with their maps, every role, step, button and sequence step naming
 * one, and every definition no remaining device's command names. The header says what is refused and why.
 */
export function withoutTouchDevices(documents: SyncDocuments, ids: readonly Id[]): RemovedDocuments {
  const parts = four(documents);
  const gone = idsOf(ids, parts.devices.map(deviceIdOf), 'device');
  if (parts.devices.every((d) => gone.has(deviceIdOf(d)))) throw new ComposeRefusal('taking these out leaves no device');

  // The device the favourite channels are tuned through: the tuning default activity's favourites role, as the
  // screens find it, `updateInfoFromActivity` in `appscommon/favoritesmanager.lua`.
  for (const f of readConfiguration(documents).activities.filter((a) => a.tuningDefault)) {
    const role = f.roles.find((r) => (FAVOURITES_ROLES as readonly string[]).includes(r.kind));
    if (role !== undefined && gone.has(role.deviceId)) {
      throw new ComposeRefusal(`device ${role.deviceId} is the one the favourite channels are tuned through, and its favourites documents would be on nothing`);
    }
  }

  const names = (x: unknown): boolean => isRecord(x) && 'DeviceId-' in x && gone.has(idText(x['DeviceId-'] as Id));
  parts.activities = parts.activities.map((a) => {
    if (!isRecord(a)) return a;
    const out: Json = { ...a };
    for (const field of ['Roles', 'EnterActions', 'LeaveActions']) {
      if (!Array.isArray(a[field])) continue;
      const kept = (a[field] as unknown[]).filter((x) => !names(x));
      if (kept.length !== (a[field] as unknown[]).length) out[field] = kept;
    }
    if (Array.isArray(a['Roles']) && (a['Roles'] as unknown[]).length > 0 && (out['Roles'] as unknown[]).length === 0) {
      throw new ComposeRefusal(`activity ${idText(a['Id-'] as Id)} would be left with no device, and the screens' home list drops an activity with no role`);
    }
    return out;
  });

  const identifiers = new Set([...gone].map((id) => mapIdentifier('device', id)));
  parts.maps = parts.maps.filter((m) => !(isRecord(m) && identifiers.has(m['ButtonMapIdentifier'] as string)));
  for (const m of parts.maps) if (isRecord(m)) pruneMap(m, names, names);

  // A definition goes when no remaining device's command names it.
  const named = (entry: unknown): string[] => (isRecord(entry) && Array.isArray(entry['Commands']) ? entry['Commands'] as unknown[] : [])
    .map((c) => (isRecord(c) && c['ProtocolId'] !== null && c['ProtocolId'] !== undefined ? idText(c['ProtocolId'] as Id) : ''))
    .filter((p) => p !== '');
  const ofGone = new Set(parts.devices.filter((d) => gone.has(deviceIdOf(d))).flatMap(named));
  parts.devices = parts.devices.filter((d) => !gone.has(deviceIdOf(d)));
  const stillNamed = new Set(parts.devices.flatMap(named));
  parts.protocols = parts.protocols.filter((p) => !(isRecord(p) && ofGone.has(idText(p['Id-'] as Id)) && !stillNamed.has(idText(p['Id-'] as Id))));
  return documentsOf(documents, parts);
}

/**
 * The activities and then the devices of `removal` taken out, the activities first so that a device whose only
 * activities go with it does not count as emptying one. Either list may be absent; both absent is refused.
 */
export function withoutTouchEntries(documents: SyncDocuments, removal: TouchRemoval): RemovedDocuments {
  const activities = removal.activities ?? [];
  const devices = removal.devices ?? [];
  if (activities.length === 0 && devices.length === 0) throw new ComposeRefusal('nothing is named to take out');
  let docs: SyncDocuments = documents;
  let out: RemovedDocuments | undefined;
  if (activities.length > 0) {
    out = withoutTouchActivities(docs, activities);
    docs = { ...docs, ...out };
  }
  if (devices.length > 0) out = withoutTouchDevices(docs, devices);
  return out!;
}

/**
 * A removal named as a person names it, the names the device and activity lists show, as ids. **A name two entries
 * share cannot say which is meant and is refused**, as one no entry has; compared exactly, as the lists show them.
 */
export function removalOfNames(documents: SyncDocuments, named: NamedRemoval): TouchRemoval {
  const c = readConfiguration(documents);
  const one = <T extends { readonly id: string; readonly name: string | undefined }>(xs: readonly T[], name: string, what: readonly [string, string]): string => {
    const found = xs.filter((x) => x.name === name);
    if (found.length !== 1) throw new ComposeRefusal(`${found.length === 0 ? `no ${what[0]}` : `${found.length} ${what[1]}`} named "${name}"`);
    return found[0]!.id;
  };
  return {
    devices: (named.devices ?? []).map((n) => one(c.devices, n, ['device', 'devices'])),
    activities: (named.activities ?? []).map((n) => one(c.activities, n, ['activity', 'activities'])),
  };
}
