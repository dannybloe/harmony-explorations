/**
 * A Harmony Touch set holding **a whole setup composed by us**, every device and every activity, its put back, and the
 * field by field comparison of our documents with Logitech's: `todo-touch.md` 8.6.
 *
 * **What 8.6 is for.** 8.1 to 8.5 each changed one thing in a set Logitech's service built. 8.6 builds the four
 * documents that name devices and activities from nothing but a description and the catalogue's records,
 * `composeTouchSetup` in `packages/codec/src/harmony-touch/setup.ts`, onto the set the remote holds with all of them
 * taken out, `setupBaseOf`. Context and Settings are the source's: a setup names neither, and 8.4 composed both.
 *
 * **Which documents are delivered.** The four the setup composes, `ActivityList`, `DeviceList`, `MapList` and
 * `ProtocolList`, each under the tag `setTag` gives with the set's name, through `changeDocuments`; `retagUnchanged`
 * covers one whose content came out equal to the source's, which for a definition list carried whole is the expected
 * case, so that every document the setup composes is delivered and committed rather than kept from before. Context and
 * Settings keep the source's content and tag and are answered 304.
 *
 * **The put back is what the remote held before, tags and all**, `putBackSetup`, as 8.5's was: the four documents as
 * the source states them, which a remote that committed the setup asks for with the setup's tags.
 *
 * **The comparison**, `compareSetup`, is the heart of 8.6: our four documents against Logitech's, every field. A field
 * is a value at the end of a path, a list's entries matched by what the remote finds them by (an activity and a device
 * by name, a map by its owner's name, a button by its kind, key, label, group and place, a role by its kind and device,
 * a step by its order, a command by its name), so that a field of ours is set beside the same field of theirs and not
 * beside whatever sits at the same index. Each field is **equal**, **equal after a stated normalisation**, each with the
 * reading that says the remote does not tell the two apart (`NORMALISATIONS`), or **different**, each with why
 * (`DIFFERENCES`). A difference no row explains fails the test that runs the comparison, `touch-setup-set.test.ts`.
 * Beside the fields, each list's **order** is compared, since the screens show lists in document order where no number
 * places them, and the gesture screen presses the first button of a device's map that matches.
 *
 * **It never prints a value out of a document**: a field is named by its path, its entries by the names the lists
 * show, which are the person's own and already quoted by the bench tests.
 *
 * Nothing here opens a remote.
 */
import { harmonyTouch } from '@harmony/codec';

import { changeDocuments, differences } from './touchchangedset.ts';
import { putBackRemoval } from './touchremovalset.ts';
import { sixOf } from './touchsettingsset.ts';
import type { TouchSet } from './touchsync.ts';

/** Where a described setup's ids start, `OWN_IDS`: past the ids 8.1 and 8.2 used, 900000001 to 900000003. */
export const SETUP_IDS: harmonyTouch.SetupIds = { device: 900_000_101, activity: 900_000_201, sequence: 900_000_301 };

/** The four documents a setup composes, in the order the remote asks for them. */
export const SETUP_DOCUMENTS = ['ActivityList', 'DeviceList', 'MapList', 'ProtocolList'] as const;

type Json = Record<string, unknown>;
const isRecord = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x);
const documentsOf = (set: TouchSet): harmonyTouch.SyncDocuments => harmonyTouch.documentsOfAnswers(set.answers as unknown as harmonyTouch.SyncAnswer[]);

/** The documents of `set` with the setup composed onto its base, or the codec's refusal. */
export function composedSetupDocuments(set: TouchSet, setup: harmonyTouch.TouchSetup): { readonly documents: harmonyTouch.SyncDocuments } | { readonly refusal: string } {
  const docs = documentsOf(sixOf(set));
  try {
    return { documents: harmonyTouch.composeTouchSetup(harmonyTouch.setupBaseOf(docs), setup, harmonyTouch.catalogueOfSet(docs)) };
  } catch (e) {
    if (e instanceof harmonyTouch.ComposeRefusal) return { refusal: e.message };
    throw e;
  }
}

/**
 * The set `set` with the four documents of a setup composed from `setup` in place of its own, each under the tag
 * `name` gives, Context and Settings the source's; or why not: the codec's refusal, `changeDocuments`'s and the gate's.
 * The catalogue is `set`'s own device and protocol lists, `catalogueOfSet`, and the base `set` with the four emptied.
 */
export function withSetup(options: {
  readonly set: TouchSet;
  readonly setup: harmonyTouch.TouchSetup;
  readonly name: string;
  readonly tagsInPlay?: Iterable<string>;
}): { readonly set: TouchSet } | { readonly refusals: readonly string[] } {
  const six = sixOf(options.set);
  const built = composedSetupDocuments(six, options.setup);
  if ('refusal' in built) return { refusals: [built.refusal] };
  const composed = built.documents;
  const source = documentsOf(six);
  const documents = Object.fromEntries(SETUP_DOCUMENTS.map((d) => [d, composed[d]]));
  const unchanged = SETUP_DOCUMENTS.filter((d) => differences(source[d], composed[d]).length === 0);
  return changeDocuments({ set: six, documents, name: options.name, tagsInPlay: options.tagsInPlay ?? [], retagUnchanged: unchanged });
}

/**
 * The exact inverse of a set `withSetup` built from `before`: the four documents as `before` states them, content and
 * tags. `putBackRemoval`'s rule, since a setup, like a removal, changes only the four documents that name a device or an
 * activity: it refuses a document either set lacks, Context or Settings differing between the two, a document that
 * already holds `before`'s tag, nothing differing at all, and a set the gate refuses.
 */
export function putBackSetup(forward: TouchSet, before: TouchSet): { readonly set: TouchSet } | { readonly refusals: readonly string[] } {
  return putBackRemoval(forward, sixOf(before));
}

// ---------------------------------------------------------------------------------------------------
// The field by field comparison
// ---------------------------------------------------------------------------------------------------

/** What one field of ours is, set beside the same field of theirs. */
export type FieldKind = 'equal' | 'normalised' | 'different';

/** One row of the comparison's report: a field, by its path with the entries' names taken out, and how many. */
export interface ComparisonRow {
  readonly document: string;
  /** The path with each list entry written `[]`: `ButtonMaps[].Buttons[].ButtonId`. */
  readonly field: string;
  readonly kind: Exclude<FieldKind, 'equal'>;
  /** The row of `NORMALISATIONS` or `DIFFERENCES` that explains it, by its name, or `unexplained`. */
  readonly why: string;
  readonly count: number;
}

/** The comparison of one document: how many fields of each kind, and the rows of those not equal. */
export interface DocumentComparison {
  readonly document: string;
  readonly equal: number;
  readonly normalised: number;
  readonly different: number;
  readonly rows: readonly ComparisonRow[];
}

/** One field's two values, ours and theirs, `undefined` where one side lacks the field. */
interface Pair {
  readonly field: string;
  readonly ours: unknown;
  readonly theirs: unknown;
  readonly oursPresent: boolean;
  readonly theirsPresent: boolean;
}

/**
 * **The normalisations, each a pair of values the remote does not tell apart, with the reading that says so.** A row
 * matches a field by its path and its two values; the first row that matches names it.
 */
export const NORMALISATIONS: readonly {
  readonly name: string;
  readonly field: RegExp;
  readonly applies: (p: Pair, ids: IdMap) => boolean;
  readonly reading: string;
}[] = [
  {
    name: 'ids of ours',
    field: /(^|\.)(Id-|DeviceId-|ActivityId-|SequenceId|ButtonMapIdentifier)$/,
    applies: (p, ids) => p.oursPresent && p.theirsPresent && ids.same(p.ours, p.theirs),
    reading: 'a device, an activity, a map and a sequence are found by their ids and every reference to one names the same id, '
      + 'and ours map one to one onto Logitech\'s by name, so every reference resolves alike; ids of ours by `OWN_IDS`',
  },
  {
    name: 'button state 0 for 1',
    field: /Buttons\[\]\.ButtonState$/,
    applies: (p) => p.ours === 0 && p.theirs === 1,
    reading: 'the engine never reads ButtonState and the screens compare it only with 2 and 4 (activitycommands.lua, devicemode.lua, '
      + 'gesturepad.lua, style.lua, harmony.lua), so 0 and 1 take the same branch everywhere',
  },
  {
    name: 'event type of a command, sequence or client action',
    field: /(ButtonAction|ButtonLongPressAction|ButtonDoublePressAction|Actions\[\])\.EventType$/,
    applies: (p) => p.oursPresent && p.theirsPresent,
    reading: 'the engine reads EventType only on home control and program actions (userconfigreader.lua 727 and 768) and the screens '
      + 'never, `activities-and-buttons.md` "What a writer must carry"',
  },
  {
    name: 'function id 0 for none',
    field: /(ButtonAction|ButtonLongPressAction|ButtonDoublePressAction|Actions\[\])\.FunctionId-$/,
    applies: (p) => p.theirs === 0 && !p.oursPresent,
    reading: 'the screens read `FunctionId-` for an icon, `<id>.png`, of which neither `0.png` nor `nil.png` exists, and in the gesture '
      + 'screen\'s getButton, which treats 0 and none alike, matching by name (gesturepad.lua 121 to 139); getButtonFunctionInfo, '
      + 'the one other reader, is never called',
  },
  {
    name: 'no sequences as an empty list',
    field: /ButtonMaps\[\]\.Sequences$/,
    applies: (p) => p.theirs === null && Array.isArray(p.ours) && p.ours.length === 0,
    reading: 'the engine takes sequences only from a table (userconfigreader.lua, getButtonActions), the gesture screen guards null '
      + '(gesturepad.lua 148), so both are no sequence; an empty list is what 8.1 and 8.2 delivered and the remote ran',
  },
];

/**
 * **The differences, each with why it does not change what the remote does.** Every one is a field Logitech's documents
 * hold and ours leave out, or hold another way, and each names the reading. A field of ours that is different and no row
 * names is `unexplained`, which the test refuses.
 */
export const DIFFERENCES: readonly {
  readonly name: string;
  readonly field: RegExp;
  readonly applies: (p: Pair) => boolean;
  readonly why: string;
}[] = [
  {
    name: 'activity fields read by neither program',
    field: /^Activities\[\]\.(AccountId-|State|IsDefault|DateCreated|DateModified|DefaultStation|DefaultStationName)$/,
    applies: (p) => !p.oursPresent,
    why: 'left out; read by neither program, `activities-and-buttons.md` "What a writer must carry", as `composeTouchActivity` leaves them out, delivered in 8.2',
  },
  {
    name: 'an activity\'s picture address without a picture',
    field: /^Activities\[\]\.BaseImageUri$/,
    applies: (p) => p.ours === null && typeof p.theirs === 'string',
    why: 'null for a service address; the screens use it only with an ImageKey, null on every activity, and fetch the default picture '
      + 'of the activity\'s type (harmony.lua 1716 to 1729, 3158), and the engine only copies it into its answer to other clients '
      + '(config.lua 56); 8.2\'s activity carried null and showed its type\'s picture',
  },
  {
    name: 'role and step ids',
    field: /^Activities\[\]\.(Roles\[\]\.Id-|Roles\[\]\.SelectedInput\.Id-|EnterActions\[\]\.Id|LeaveActions\[\]\.Id)$/,
    applies: (p) => !p.oursPresent,
    why: 'left out; read by neither program, `activities-and-buttons.md` "What a writer must carry"',
  },
  {
    name: 'a step\'s target level',
    field: /^Activities\[\]\.(EnterActions|LeaveActions)\[\]\.TargetLevel$/,
    applies: (p) => !p.oursPresent && p.theirs === null,
    why: 'left out where Logitech\'s states null; the engine reads it only when set and not null (userconfigreader.lua 162), and it '
      + 'belongs to a speaker group',
  },
  {
    name: 'map fields read by neither program',
    field: /^ButtonMaps\[\]\.(ButtonMapId|ButtonMapId-|ButtonMapSurfaceId-|SurfaceId-|RemoteId-|DateModified)$/,
    applies: (p) => !p.oursPresent,
    why: 'left out; read by neither program, `activities-and-buttons.md` "What a writer must carry", as 8.1\'s and 8.2\'s maps left them out',
  },
  {
    name: 'button fields read by neither program',
    field: /^ButtonMaps\[\]\.Buttons\[\]\.(ButtonId|ImageId|ImageId-|ButtonImageKey|ButtonImagePath|MenuItem\.MenuName)$/,
    applies: (p) => !p.oursPresent,
    why: 'left out; read by neither program, or by the screens only to copy or to test in a way that never takes effect, '
      + '`activities-and-buttons.md` "What a writer must carry"',
  },
  {
    name: 'action ids',
    field: /(ButtonAction|ButtonLongPressAction|ButtonDoublePressAction|Actions\[\])\.Id$/,
    applies: (p) => !p.oursPresent,
    why: 'left out; an action\'s Id is read by neither program, `activities-and-buttons.md` "What a writer must carry"',
  },
  {
    name: 'the function id under the key nothing reads',
    field: /(ButtonAction|ButtonLongPressAction|ButtonDoublePressAction|Actions\[\])\.FunctionId$/,
    applies: (p) => !p.oursPresent && p.theirs === null,
    why: 'left out where Logitech\'s states null under `FunctionId`, without the hyphen; the screens read `FunctionId-` alone and the '
      + 'engine neither',
  },
];

/** Ids of ours set beside Logitech's: two ids are the same when ours maps to theirs. */
export interface IdMap {
  readonly same: (ours: unknown, theirs: unknown) => boolean;
}

/** The id map of two sets of documents: devices and activities by name, maps by their owner's, sequences by map and name. */
function idMapOf(ours: harmonyTouch.SyncDocuments, theirs: harmonyTouch.SyncDocuments): IdMap {
  const a = harmonyTouch.readConfiguration(ours);
  const b = harmonyTouch.readConfiguration(theirs);
  const map = new Map<string, string>();
  for (const d of a.devices) {
    const t = b.devices.find((x) => x.name === d.name);
    if (t === undefined) continue;
    map.set(d.id, t.id);
    map.set(harmonyTouch.mapIdentifier('device', d.id), harmonyTouch.mapIdentifier('device', t.id));
    for (const s of d.map?.sequences ?? []) {
      const u = t.map?.sequences.find((x) => x.name === s.name);
      if (u !== undefined) map.set(s.id, u.id);
    }
  }
  for (const x of a.activities) {
    const t = b.activities.find((y) => y.name === x.name);
    if (t === undefined) continue;
    map.set(x.id, t.id);
    map.set(harmonyTouch.mapIdentifier('activity', x.id), harmonyTouch.mapIdentifier('activity', t.id));
    for (const s of x.map?.sequences ?? []) {
      const u = t.map?.sequences.find((y) => y.name === s.name);
      if (u !== undefined) map.set(s.id, u.id);
    }
  }
  return { same: (o, t) => o !== null && t !== null && map.get(String(o)) === String(t) };
}

/**
 * How an entry of a list is known, so ours is set beside the same entry of theirs: by what the remote finds it by.
 * `names` gives a device's or an activity's name by its id, and a map's owner's name by its identifier, on each side.
 */
function entryKey(list: string, x: unknown, names: ReadonlyMap<string, string>): string {
  if (!isRecord(x)) return '?';
  const name = (id: unknown): string => names.get(String(id)) ?? `id ${String(id)}`;
  switch (list) {
    case 'Activities': return String(x['Name']);
    case 'DevicesWithFeatures': return isRecord(x['Device']) ? String(x['Device']['Name']) : '?';
    case 'ButtonMaps': return name(x['ButtonMapIdentifier']);
    case 'Protocols': return String(x['Id-']);
    case 'Roles': return `${String(x['__type'])} ${name(x['DeviceId-'])}`;
    case 'EnterActions': case 'LeaveActions': return String(x['ActionOrder']);
    case 'Buttons': return [x['__type'], x['ButtonKey'], x['TextOnRemote'], x['FunctionGroupType'], isRecord(x['MenuItem']) ? x['MenuItem']['IndexInMenu'] : ''].map(String).join(' ');
    case 'Sequences': return String(x['Name']);
    case 'Actions': return String(x['Order']);
    case 'Commands': return String(x['Name']);
    case 'DeviceFeatures': return String(x['__type']);
    case 'Inputs': return String(x['InputName']);
    default: return '';
  }
}

/** Names by id and by map identifier, of one side's documents. */
function namesOf(docs: harmonyTouch.SyncDocuments): Map<string, string> {
  const c = harmonyTouch.readConfiguration(docs);
  const out = new Map<string, string>();
  for (const d of c.devices) {
    out.set(d.id, d.name ?? '?');
    out.set(harmonyTouch.mapIdentifier('device', d.id), `${d.name ?? '?'}'s own map`);
  }
  for (const a of c.activities) {
    out.set(a.id, a.name ?? '?');
    out.set(harmonyTouch.mapIdentifier('activity', a.id), `${a.name ?? '?'}'s map`);
  }
  return out;
}

/** The lists whose entries are matched by key; any other list is matched place by place. */
const KEYED = new Set(['Activities', 'DevicesWithFeatures', 'ButtonMaps', 'Protocols', 'Roles', 'EnterActions', 'LeaveActions', 'Buttons', 'Sequences', 'Actions', 'Commands', 'DeviceFeatures', 'Inputs']);

/** Every leaf of a document, keyed by its path with entries named, and the order of every keyed list. */
function leaves(doc: unknown, names: ReadonlyMap<string, string>): { values: Map<string, { field: string; value: unknown }>; orders: Map<string, { field: string; keys: string[] }> } {
  const values = new Map<string, { field: string; value: unknown }>();
  const orders = new Map<string, { field: string; keys: string[] }>();
  const walk = (x: unknown, path: string, field: string, list: string): void => {
    if (Array.isArray(x) && x.length > 0) {
      const keyed = KEYED.has(list);
      const seen = new Map<string, number>();
      const keys: string[] = [];
      x.forEach((item, i) => {
        let key = keyed ? entryKey(list, item, names) : String(i);
        // Two entries with one key, as two buttons on one repeated place: numbered by occurrence.
        const n = seen.get(key) ?? 0;
        seen.set(key, n + 1);
        if (n > 0) key = `${key} #${n + 1}`;
        keys.push(key);
        walk(item, `${path}[${key}]`, `${field}[]`, list);
      });
      if (keyed) orders.set(path, { field, keys });
      return;
    }
    if (isRecord(x) && Object.keys(x).length > 0) {
      for (const [k, v] of Object.entries(x)) walk(v, path === '' ? k : `${path}.${k}`, field === '' ? k : `${field}.${k}`, k);
      return;
    }
    values.set(path, { field, value: x });
  };
  walk(doc, '', '', '');
  return { values, orders };
}

/**
 * Our documents against theirs, document by document over the four a setup composes, every field and every keyed
 * list's order. A list's order is one field more: equal when the entries both hold come in the same order.
 */
export function compareSetup(ours: harmonyTouch.SyncDocuments, theirs: harmonyTouch.SyncDocuments): DocumentComparison[] {
  const ids = idMapOf(ours, theirs);
  const ourNames = namesOf(ours);
  const theirNames = namesOf(theirs);
  return SETUP_DOCUMENTS.map((document) => {
    const a = leaves(ours[document], ourNames);
    const b = leaves(theirs[document], theirNames);
    const counts = { equal: 0, normalised: 0, different: 0 };
    const rows = new Map<string, ComparisonRow>();
    const note = (field: string, kind: Exclude<FieldKind, 'equal'>, why: string): void => {
      const key = `${kind} ${field} ${why}`;
      const row = rows.get(key);
      rows.set(key, { document, field, kind, why, count: (row?.count ?? 0) + 1 });
      counts[kind] += 1;
    };
    for (const path of new Set([...a.values.keys(), ...b.values.keys()])) {
      const x = a.values.get(path);
      const y = b.values.get(path);
      const field = (x ?? y)!.field;
      const pair: Pair = { field, ours: x?.value, theirs: y?.value, oursPresent: x !== undefined, theirsPresent: y !== undefined };
      if (x !== undefined && y !== undefined && differences(x.value, y.value).length === 0) { counts.equal += 1; continue; }
      const normalised = NORMALISATIONS.find((n) => n.field.test(field) && n.applies(pair, ids));
      if (normalised !== undefined) { note(field, 'normalised', normalised.name); continue; }
      const explained = DIFFERENCES.find((d) => d.field.test(field) && d.applies(pair));
      note(field, 'different', explained?.name ?? (x === undefined ? 'unexplained, left out' : y === undefined ? 'unexplained, added' : 'unexplained, another value'));
    }
    for (const path of new Set([...a.orders.keys(), ...b.orders.keys()])) {
      const x = a.orders.get(path);
      const y = b.orders.get(path);
      const field = `${(x ?? y)!.field} (order)`;
      if (x === undefined || y === undefined) { note(field, 'different', 'unexplained, a list one side lacks'); continue; }
      const common = x.keys.filter((k) => y.keys.includes(k));
      if (JSON.stringify(common) === JSON.stringify(y.keys.filter((k) => x.keys.includes(k)))) counts.equal += 1;
      else note(field, 'different', 'unexplained, another order');
    }
    return { document, ...counts, rows: [...rows.values()].sort((p, q) => p.field.localeCompare(q.field)) };
  });
}

/** The comparison as lines for a report: per document its counts, then each row. Never a value. */
export function comparisonLines(comparison: readonly DocumentComparison[]): string[] {
  return comparison.flatMap((c) => [
    `${c.document}: ${c.equal} equal, ${c.normalised} equal after a normalisation, ${c.different} different`,
    ...c.rows.map((r) => `  ${r.kind} ${r.count}: ${r.field}, ${r.why}`),
  ]);
}
