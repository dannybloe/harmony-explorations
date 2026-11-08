/**
 * A Harmony Touch set with devices and activities of the remote's own taken out, everything that names them with
 * them, and its put back: `todo-touch.md` 8.5. The removal is the codec's, `withoutTouchEntries` in
 * `packages/codec/src/families/harmony-touch/remove.ts`; this module puts its documents into a set, puts the set before back,
 * and says, entry by entry, what the removal took out and what it changed.
 *
 * **Which documents are delivered.** A device or an activity is named in `ActivityList`, `DeviceList`, `MapList` and
 * `ProtocolList`, never in `Context` or `Settings`, `remove.ts`'s header; so the set delivers those of the four whose
 * content the removal changed, each under the tag `setTag` gives with the set's name, and the rest keep the source's
 * content and tag, so a remote that committed the source answers them 304, `changeDocuments`. A removal that takes out
 * no definition leaves `ProtocolList` the source's.
 *
 * **The put back is what the remote held before, tags and all**, as 8.3's and 8.4's were: a removal of the remote's
 * own devices cannot be undone by composing them again, since they are Logitech's records, so the put back delivers
 * the source's documents as the source states them. Its first request list then asks with the removal set's tags, and
 * a put back that arrived shows as the source's tags in the next run's first list and in the configuration hash.
 *
 * **The structural diff**, `removalChanges`: the four documents compared entry by entry, an entry known by what the
 * remote finds it by (an activity's and a definition's id, a device's id, a map's identifier), and inside a changed
 * entry its lists compared the same way (a role by its kind and device, a step by its order, a button by its kind,
 * key, label and group, a sequence by its id), so the report says "Watch TV: Roles, 1 taken out" rather than a list of
 * pointers. **It never prints a value out of a document**: an entry is named by its name or, for a map, by its owner's
 * name, and a button by its key or label, which are the person's own and already quoted by the bench tests.
 *
 * Nothing here opens a remote.
 */
// The Node entry, for the fonts, the icons, the deflate and the SHA-256 the core asks its loader for.
import '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';

import { changeDocuments, differences } from './touchchangedset.ts';
import { keyOf, prepareSet, type TouchSet } from '../src/touchsync.ts';

/** The documents a device or an activity is named in, and the list in each that holds them. */
export const REMOVAL_DOCUMENTS: readonly (readonly [string, string])[] = [
  ['ActivityList', 'Activities'], ['DeviceList', 'DevicesWithFeatures'], ['MapList', 'ButtonMaps'], ['ProtocolList', 'Protocols'],
];

type Json = Record<string, unknown>;
const isRecord = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x);
const documentOf = (set: TouchSet, document: string) => set.answers.find((a) => keyOf(a.uri) === document);

/**
 * The set `set` with the removal described by name taken out, the documents it changes under new tags, or why not:
 * the codec's refusal, or `changeDocuments`'s and the gate's.
 */
export function withRemoval(options: {
  readonly set: TouchSet;
  readonly removal: harmonyTouch.NamedRemoval;
  readonly name: string;
  readonly tagsInPlay?: Iterable<string>;
}): { readonly set: TouchSet } | { readonly refusals: readonly string[] } {
  const docs = harmonyTouch.documentsOfAnswers(options.set.answers as unknown as harmonyTouch.SyncAnswer[]);
  let removed: harmonyTouch.RemovedDocuments;
  try {
    removed = harmonyTouch.withoutTouchEntries(docs, harmonyTouch.removalOfNames(docs, options.removal));
  } catch (e) {
    if (e instanceof harmonyTouch.ComposeRefusal) return { refusals: [e.message] };
    throw e;
  }
  // Only the documents whose content changed are delivered; the others keep the source's tag.
  const changed = Object.fromEntries(Object.entries(removed).filter(([name, doc]) => differences(docs[name as keyof typeof docs], doc).length > 0));
  return changeDocuments({ set: options.set, documents: changed, name: options.name, tagsInPlay: options.tagsInPlay ?? [] });
}

/**
 * The exact inverse of a set `withRemoval` built from `before`: `forward` with every document it changed as `before`
 * states it, content and tag. Refuses, by document: a document either set lacks, `Context` or `Settings` differing
 * between the two, which a removal never changes, a document that differs and already holds `before`'s tag, which puts
 * nothing back, nothing differing at all, and a set the gate refuses.
 */
export function putBackRemoval(forward: TouchSet, before: TouchSet): { readonly set: TouchSet } | { readonly refusals: readonly string[] } {
  const refusals: string[] = [];
  const back: Record<string, (typeof before.answers)[number]> = {};
  for (const document of harmonyTouch.CONFIGURATION_DOCUMENTS) {
    const x = documentOf(forward, document);
    const y = documentOf(before, document);
    if (x === undefined || y === undefined) { refusals.push(`${document} is missing from one of the two sets`); continue; }
    const differs = differences(x.resource, y.resource).length > 0 || x.etag !== y.etag;
    if (!differs) continue;
    if (!REMOVAL_DOCUMENTS.some(([d]) => d === document)) { refusals.push(`${document} differs between the two sets, and a removal changes only the four documents that name a device or an activity`); continue; }
    if (x.etag === y.etag) { refusals.push(`${document} already holds the tag it is to be put back under`); continue; }
    back[document] = y;
  }
  if (refusals.length === 0 && Object.keys(back).length === 0) refusals.push('the two sets are the same, so there is nothing to put back');
  if (refusals.length > 0) return { refusals };
  const out: TouchSet = { answers: forward.answers.map((a) => back[keyOf(a.uri)] ?? a) };
  const gate = prepareSet(out);
  if ('refusals' in gate) return { refusals: gate.refusals };
  return { set: out };
}

/** One entry of a document that the removal took out, changed or, which a removal should never do, added. */
export interface EntryChange {
  readonly document: string;
  /** The entry by its name, or a map by its owner's name; never an id or an address. */
  readonly entry: string;
  readonly kind: 'taken out' | 'changed' | 'added';
  /** For a changed entry, what changed in it: a list and how many of its entries went or changed, or a field's name. */
  readonly details: readonly string[];
}

/** How an entry of each list is known: what the remote finds it by. */
const ENTRY_KEYS: Readonly<Record<string, (x: Json) => string>> = {
  Activities: (x) => String(x['Id-']),
  DevicesWithFeatures: (x) => (isRecord(x['Device']) ? String(x['Device']['Id-']) : ''),
  ButtonMaps: (x) => String(x['ButtonMapIdentifier']),
  Protocols: (x) => String(x['Id-']),
};

/** How an entry of a list inside an entry is known, and how it is named in a report. */
const INNER_KEYS: Readonly<Record<string, (x: Json) => string>> = {
  Roles: (x) => `${String(x['__type'])} ${String(x['DeviceId-'])}`,
  EnterActions: (x) => String(x['ActionOrder']),
  LeaveActions: (x) => String(x['ActionOrder']),
  Buttons: (x) => [x['__type'], x['ButtonKey'], x['TextOnRemote'], x['FunctionGroupType']].map(String).join(' '),
  Sequences: (x) => String(x['SequenceId']),
};

/** A button's name in a report: its key, or its label and group. Both are the person's own words, never an id. */
const buttonName = (x: Json): string => (typeof x['ButtonKey'] === 'string' ? String(x['ButtonKey'])
  : `entry "${String(x['TextOnRemote'])}"${x['FunctionGroupType'] === 0 ? '' : ` of group ${String(x['FunctionGroupType'])}`}`);

/** What differs between two versions of one entry: per list, entries taken out, changed and added; per field, its name. */
function entryDetails(before: Json, after: Json): string[] {
  const out: string[] = [];
  for (const field of [...new Set([...Object.keys(before), ...Object.keys(after)])]) {
    const a = before[field];
    const b = after[field];
    if (differences(a, b).length === 0) continue;
    const key = INNER_KEYS[field];
    if (key === undefined || !Array.isArray(a) || !Array.isArray(b)) { out.push(field); continue; }
    const was = new Map((a as Json[]).map((x) => [key(x), x]));
    const now = new Map((b as Json[]).map((x) => [key(x), x]));
    const gone = [...was.keys()].filter((k) => !now.has(k));
    const added = [...now.keys()].filter((k) => !was.has(k));
    const changed = [...now.keys()].filter((k) => was.has(k) && differences(was.get(k), now.get(k)).length > 0);
    const name = (x: Json | undefined): string => (x === undefined ? '' : field === 'Buttons' ? buttonName(x) : field === 'Roles' ? String(x['__type']) : field === 'Sequences' ? `sequence "${String(x['Name'])}"` : `step ${String(x['ActionOrder'])}`);
    const what = (k: string): string => {
      const fields = differences(was.get(k), now.get(k)).map((p) => p.split('/').filter((t) => t !== '' && !/^[0-9]+$/.test(t)).join('.'));
      return `${name(now.get(k))} (${[...new Set(fields)].join(', ')})`;
    };
    const parts = [
      gone.length > 0 ? `${gone.length} taken out: ${gone.map((k) => name(was.get(k))).join(', ')}` : '',
      changed.length > 0 ? `${changed.length} changed: ${changed.map(what).join(', ')}` : '',
      added.length > 0 ? `${added.length} added` : '',
    ].filter((p) => p !== '');
    out.push(`${field}, ${parts.length > 0 ? parts.join('; ') : 'reordered'}`);
  }
  return out;
}

/**
 * The four documents compared entry by entry, `before` and `after` the removal, and whether the entries both hold
 * are in the same order. `names` names a map's owner, by the identifier, from the documents before.
 */
export function removalChanges(before: harmonyTouch.SyncDocuments, after: harmonyTouch.SyncDocuments): {
  readonly changes: readonly EntryChange[];
  readonly orderKept: boolean;
  readonly restEqual: boolean;
} {
  const c = harmonyTouch.readConfiguration(before);
  const owner = new Map<string, string>();
  for (const d of c.devices) owner.set(harmonyTouch.mapIdentifier('device', d.id), `${d.name ?? 'a device'}'s own map`);
  for (const a of c.activities) owner.set(harmonyTouch.mapIdentifier('activity', a.id), `${a.name ?? 'an activity'}'s map`);
  const nameOf = (field: string, x: Json): string => {
    if (field === 'Activities' || field === 'Protocols') return String(x['Name']);
    if (field === 'DevicesWithFeatures') return isRecord(x['Device']) ? String(x['Device']['Name']) : 'a device';
    return owner.get(String(x['ButtonMapIdentifier'])) ?? 'a map no device or activity owns';
  };
  const changes: EntryChange[] = [];
  let orderKept = true;
  let restEqual = true;
  for (const [document, field] of REMOVAL_DOCUMENTS) {
    const listOf = (doc: unknown): Json[] => (isRecord(doc) && Array.isArray(doc[field]) ? doc[field] as Json[] : []);
    const a = listOf(before[document as keyof typeof before]);
    const b = listOf(after[document as keyof typeof after]);
    const key = ENTRY_KEYS[field]!;
    const was = new Map(a.map((x) => [key(x), x]));
    const now = new Map(b.map((x) => [key(x), x]));
    for (const [k, x] of was) if (!now.has(k)) changes.push({ document, entry: nameOf(field, x), kind: 'taken out', details: [] });
    for (const [k, x] of now) {
      if (!was.has(k)) changes.push({ document, entry: nameOf(field, x), kind: 'added', details: [] });
      else if (differences(was.get(k), x).length > 0) changes.push({ document, entry: nameOf(field, x), kind: 'changed', details: entryDetails(was.get(k)!, x) });
    }
    const kept = a.map(key).filter((k) => now.has(k));
    if (JSON.stringify(kept) !== JSON.stringify(b.map(key).filter((k) => was.has(k)))) orderKept = false;
    // Every field of the document but its list.
    const rest = (doc: unknown): unknown => (isRecord(doc) ? { ...doc, [field]: null } : doc);
    if (differences(rest(before[document as keyof typeof before]), rest(after[document as keyof typeof after])).length > 0) restEqual = false;
  }
  return { changes, orderKept, restEqual };
}
