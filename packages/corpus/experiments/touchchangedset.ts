/**
 * A set of a Harmony Touch's documents with **one value changed**, made from a set the remote already holds,
 * and the comparisons that say the change is that one value and nothing else: `todo-touch.md` 6.9.
 *
 * **What 6.9 is for.** 6.8 delivered the remote's own six documents back with 200 under tags of ours, and the
 * remote stored and committed them, so the answerer can put a document on a Touch. 6.9 is the first change of
 * content: one delay and one label, each changed and put back, each heard or seen at the bench. The smallest
 * step that measures it changes one value of one document and keeps everything else exactly as the remote
 * holds it.
 *
 * **Why only the changed document gets a new tag.** The answerer answers a request 304 when the tag the remote
 * sends equals the set's tag for that document, and 200 with the document otherwise, `answerOf` in
 * `touchsync.ts`. So a set whose five unchanged documents keep the tags the remote stores them under is
 * answered 304 for those five and delivers the changed one alone. That makes the run's write of answers one
 * document long, and it makes the run's outcome a measurement: one 200, five 304s, or something the remote held
 * that nobody expected.
 *
 * **Why a new tag rather than an old one, and why the put back gets one too.** A tag of ours is `setTag` with
 * the new set's name, so it is reproducible from the set and differs from every tag the source set states. The
 * put back is the same change with the original value, under a third tag, rather than the source set again
 * under the tag it had: a document returning under its old tag would still be delivered, since the remote
 * holds the changed one under the changed tag, but a tag never stated before is a mark only that delivery can
 * have left. A request list or a configuration hash read afterwards then says the put back arrived, where the
 * old tag would say only that the remote holds a tag it has held before. The caller passes every tag stated
 * by the chain of sets so far, `tagsInPlay`, and a new tag equal to one of them is refused.
 *
 * **The change is a value, never a structure.** A JSON Pointer (RFC 6901) names the value, which has to be a
 * string, a number or a boolean already there, holding the value the caller says it holds, and the new value
 * has to be of the same type. An object, a list or a null is not changed here, nor is a value added or
 * removed: that is a family's editor, which `packages/codec/src/families/harmony-touch/` does not have for these
 * fields, and 6.9 does not need one. The codec's reader and check meet the changed set through the answerer's
 * own gate, `prepareSet`, before the builder returns it.
 *
 * **Several documents at once, since `todo-touch.md` 8.1.** A device composed by the codec goes into three
 * documents together, the device, map and protocol lists, so `changeDocuments` replaces any of the six by new
 * content and retags exactly those, by the same rules; `changeOneValue` is that with one value of one document.
 * The composing stays in the codec, `withTouchDevice` and `withoutTouchDevice` in
 * `packages/codec/src/families/harmony-touch/compose.ts`; this module only puts their documents into a set.
 *
 * Nothing here opens a remote: it builds and compares. The bench scripts are `bin/touch-changed-set.ts` and, for
 * a device added or taken out, `bin/touch-device-set.ts`.
 */
import { DATA_PACKET_PAYLOAD } from '@harmony/usb';
import { TOUCH_REQUEST_SHAPES } from '@harmony/usb/touchsession';

import { OWN_SET_DOCUMENTS } from './touchownset.ts';
import {
  WRITE_ANSWERS,
  answerOf,
  keyOf,
  prepareSet,
  setTag,
  type PreparedSet,
  type RemoteRequest,
  type SetAnswer,
  type TouchSet,
  type WrittenAnswer,
} from '../src/touchsync.ts';

/** A value a change may touch: the three JSON leaves that are not null. */
export type Leaf = string | number | boolean;

/** One value of one document, what it holds now and what it is to hold. */
export interface OneChange {
  /** One of the six configuration documents, by name. */
  readonly document: string;
  /** Where in that document, as a JSON Pointer: `/ButtonMaps/8/Sequences/0/Actions/1/Duration`. */
  readonly pointer: string;
  /** The value the source set holds there, which the builder checks before it changes anything. */
  readonly was: Leaf;
  readonly to: Leaf;
}

/** A JSON Pointer's reference tokens, unescaped, or undefined when it is not one. The whole document, `''`, is not a value here. */
export function pointerTokens(pointer: string): string[] | undefined {
  if (!pointer.startsWith('/')) return undefined;
  const tokens = pointer.slice(1).split('/');
  // `~` may only start `~0` or `~1`, RFC 6901 section 3.
  if (tokens.some((t) => /~(?![01])/.test(t))) return undefined;
  return tokens.map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/** A pointer for a list of tokens, escaped. */
function pointerOf(tokens: readonly string[]): string {
  return tokens.map((t) => `/${t.replace(/~/g, '~0').replace(/\//g, '~1')}`).join('');
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** The value a pointer reaches, or undefined when a token names nothing: an array index has to be one of its places. */
function reach(x: unknown, tokens: readonly string[]): { readonly value: unknown } | undefined {
  let at: unknown = x;
  for (const t of tokens) {
    if (Array.isArray(at)) {
      if (!/^(0|[1-9][0-9]*)$/.test(t) || Number(t) >= at.length) return undefined;
      at = at[Number(t)];
    } else if (isObject(at)) {
      if (!Object.prototype.hasOwnProperty.call(at, t)) return undefined;
      at = at[t];
    } else {
      return undefined;
    }
  }
  return { value: at };
}

const isLeaf = (x: unknown): x is Leaf => typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean';

/** A copy of a parsed JSON value, so a change never reaches the source set. */
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/**
 * Build the changed set, or say why not. `set` the source, `change` the one value, `name` the new set's name,
 * which goes into the changed document's tag, and `tagsInPlay` every tag the chain of sets so far has stated.
 *
 * Refuses, by document and pointer and never quoting a value out of the document: a document not among the six
 * or not in the set, a pointer that is not one or reaches nothing, a value that is not a string, number or
 * boolean, a value other than `was`, a `to` of another type or equal to `was`, a new tag already in play, and a
 * set the answerer's gate refuses.
 */
export function changeOneValue(options: {
  readonly set: TouchSet;
  readonly change: OneChange;
  readonly name: string;
  readonly tagsInPlay?: Iterable<string>;
}): { readonly set: TouchSet } | { readonly refusals: readonly string[] } {
  const { set, change, name } = options;
  const where = `${change.document} ${change.pointer}`;
  if (!OWN_SET_DOCUMENTS.includes(change.document)) return { refusals: [`${change.document} is not one of the six configuration documents`] };
  const at = set.answers.findIndex((a) => keyOf(a.uri) === change.document);
  if (at < 0) return { refusals: [`the source set holds no ${change.document}`] };
  const tokens = pointerTokens(change.pointer);
  if (tokens === undefined) return { refusals: [`${where}: not a JSON Pointer to a value inside the document`] };
  const source = set.answers[at]!;
  const found = reach(source.resource, tokens);
  if (found === undefined) return { refusals: [`${where}: names no value in the source set's document`] };
  if (!isLeaf(found.value)) return { refusals: [`${where}: holds ${found.value === null ? 'null' : Array.isArray(found.value) ? 'a list' : 'an object'}, and only a string, a number or a boolean is changed here`] };
  if (found.value !== change.was) return { refusals: [`${where}: holds another value than the one the change expects, so the source is not what the change was written against`] };
  if (typeof change.to !== typeof change.was) return { refusals: [`${where}: the new value is a ${typeof change.to} where the document holds a ${typeof change.was}`] };
  if (change.to === change.was) return { refusals: [`${where}: the new value equals the one it holds, which changes nothing`] };

  const resource = copy(source.resource);
  const parent = reach(resource, tokens.slice(0, -1))!.value as Record<string, unknown> | unknown[];
  const last = tokens.at(-1)!;
  if (Array.isArray(parent)) parent[Number(last)] = change.to;
  else parent[last] = change.to;
  return changeDocuments({ set, documents: { [change.document]: resource }, name, tagsInPlay: options.tagsInPlay ?? [] });
}

/**
 * Build a set with **several documents replaced at once**, each changed one under a new tag, or say why not:
 * `todo-touch.md` 8.1, where a device is added to the device, map and protocol lists together, and its put back
 * takes all three out again. `documents` maps a configuration document's name to its new content, parsed JSON;
 * the documents it does not name keep the source's content and tag, so a remote that committed the source is
 * answered 304 for them, and each named one is delivered with 200 under `setTag` with the new set's name. The
 * same reasons `changeOneValue` gives for one document hold for each: a tag never stated before is the mark only
 * that delivery leaves, and a new tag already in play down the chain is refused.
 *
 * Refuses, by document and never quoting a value: a name not among the six or not in the source, a content that
 * equals the source's (a document retagged with nothing changed would be delivered for nothing), a new tag in
 * play, and a set the answerer's gate refuses. `changeOneValue` is this with one value changed in one document.
 */
export function changeDocuments(options: {
  readonly set: TouchSet;
  readonly documents: Readonly<Record<string, unknown>>;
  readonly name: string;
  readonly tagsInPlay?: Iterable<string>;
  /**
   * Documents delivered under a new tag although their content equals the source's, `todo-touch.md` 8.4, where Context
   * is composed from a description equal to what the remote holds so that the run proves Context can be written with
   * no change of behaviour. Every other document whose content equals the source's is still refused.
   */
  readonly retagUnchanged?: readonly string[];
}): { readonly set: TouchSet } | { readonly refusals: readonly string[] } {
  const { set, name } = options;
  const names = Object.keys(options.documents);
  if (names.length === 0) return { refusals: ['no document is changed'] };
  const inPlay = new Set([...(options.tagsInPlay ?? []), ...set.answers.map((a) => a.etag).filter((t): t is string => t !== undefined)]);
  const refusals: string[] = [];
  const replaced = new Map<number, SetAnswer>();
  for (const document of names) {
    if (!OWN_SET_DOCUMENTS.includes(document)) { refusals.push(`${document} is not one of the six configuration documents`); continue; }
    const at = set.answers.findIndex((a) => keyOf(a.uri) === document);
    if (at < 0) { refusals.push(`the source set holds no ${document}`); continue; }
    const source = set.answers[at]!;
    const resource = copy(options.documents[document]);
    if (differences(source.resource, resource).length === 0 && !(options.retagUnchanged ?? []).includes(document)) {
      refusals.push(`${document}: the new content equals the source's, which changes nothing`);
      continue;
    }
    const tag = setTag({ 'body-type': source['body-type'], resource }, name);
    if (inPlay.has(tag)) { refusals.push(`${document}: its new tag equals a tag already in play, so a set of this name was made before`); continue; }
    // The source's own key order, so a changed answer is written as the others are.
    replaced.set(at, { ...source, resource, etag: tag });
  }
  if (refusals.length > 0) return { refusals };
  const out: TouchSet = { answers: set.answers.map((a, i) => replaced.get(i) ?? a) };
  const gate = prepareSet(out);
  if ('refusals' in gate) return { refusals: gate.refusals };
  return { set: out };
}

/**
 * Every place two parsed JSON values differ, as pointers: a leaf that differs, a key one side lacks, a list of
 * another length, a value of another kind. Equal values give none.
 */
export function differences(a: unknown, b: unknown, at: readonly string[] = []): string[] {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return [pointerOf(at)];
    return a.flatMap((x, i) => differences(x, b[i], [...at, String(i)]));
  }
  if (isObject(a) && isObject(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    return keys.flatMap((k) => (k in a && k in b ? differences(a[k], b[k], [...at, k]) : [pointerOf([...at, k])]));
  }
  return Object.is(a, b) ? [] : [pointerOf(at)];
}

/**
 * How one list of a document changed between two versions of it: the places of entries `after` holds that
 * `before` does not, and of those `before` holds that `after` does not, matched as parsed JSON and in order; and
 * whether everything else is equal, the entries both hold in the same order and every other field of the
 * document. **The structural diff for a list that grew or shrank**, where `differences` names only the list:
 * a device added shows here as one entry added to each of three lists and nothing else, `todo-touch.md` 8.1.
 */
export function listChanges(before: unknown, after: unknown, field: string): {
  readonly added: readonly number[];
  readonly removed: readonly number[];
  readonly restEqual: boolean;
} {
  const list = (x: unknown): readonly unknown[] => (isObject(x) && Array.isArray(x[field]) ? x[field] as unknown[] : []);
  const a = list(before).map((x) => JSON.stringify(x));
  const b = list(after).map((x) => JSON.stringify(x));
  // The longest common subsequence, so entries moved or replaced show as removed and added rather than hidden.
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const added: number[] = [];
  const removed: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i += 1; j += 1; } else if (table[i + 1]![j]! >= table[i]![j + 1]!) removed.push(i++); else added.push(j++);
  }
  while (i < a.length) removed.push(i++);
  while (j < b.length) added.push(j++);
  const without = (x: unknown): unknown => (isObject(x) ? { ...x, [field]: null } : x);
  return { added, removed, restEqual: differences(without(before), without(after)).length === 0 };
}

/** What a set folder's `sources.json` records about where the set came from, as far as the chain needs it. */
export interface SetRecord {
  readonly from?: unknown;
  readonly change?: unknown;
  readonly device?: unknown;
  readonly removed?: unknown;
  /** An activity added or taken out, `todo-touch.md` 8.2. */
  readonly activity?: unknown;
  readonly removedActivity?: unknown;
  /** Favourites and a logo of ours delivered, or put back as the remote held them, `todo-touch.md` 8.3. */
  readonly favourites?: unknown;
  readonly favouritesBack?: unknown;
  /** Settings of ours and Context composed from a description, or both put back as the remote held them, `todo-touch.md` 8.4. */
  readonly settings?: unknown;
  readonly settingsBack?: unknown;
  /** Devices and activities of the remote's own taken out, or put back as the remote held them, `todo-touch.md` 8.5. */
  readonly removal?: unknown;
  readonly removalBack?: unknown;
  /** A whole setup composed by us onto the set with its devices taken out, or put back as the remote held it, `todo-touch.md` 8.6. */
  readonly setup?: unknown;
  readonly setupBack?: unknown;
  /** The empty configuration, no device and no activity, or its put back with the favourites, `todo-touch.md` 9.2. */
  readonly empty?: unknown;
  readonly emptyBack?: unknown;
}

/**
 * Every tag stated by the set in `folder` and by each set it was built from, back to the first, which
 * `touch-own-set.ts` built and records no change of ours. A set built by `touch-changed-set.ts` records its
 * `change`, one built by `touch-device-set.ts` its `device` or `removed`, or for an activity, `todo-touch.md` 8.2,
 * its `activity` or `removedActivity`, or for favourites, 8.3, its `favourites` or `favouritesBack`, or for Settings
 * and Context, 8.4, its `settings` or `settingsBack`, or for devices and activities of the remote's taken out, 8.5,
 * its `removal` or `removalBack`, or for a whole setup of ours, 8.6, its `setup` or `setupBack`, or for the empty
 * configuration, 9.2, its `empty` or `emptyBack`; each names the set it came `from`.
 * `read` reads a folder's set and record, so this stays free of the file system. A folder met twice stops it.
 */
export function chainTags(folder: string, read: (folder: string) => { readonly set: TouchSet; readonly record: SetRecord }): Set<string> {
  const tags = new Set<string>();
  const seen = new Set<string>();
  let at: string | undefined = folder;
  while (at !== undefined && !seen.has(at)) {
    seen.add(at);
    const { set, record } = read(at);
    for (const a of set.answers) if (typeof a.etag === 'string') tags.add(a.etag);
    at = builtFrom(record);
  }
  return tags;
}

/**
 * The folder a set was built from, by its record, or undefined for a set no builder of a change made: the first of
 * a chain, which `touch-own-set.ts` built and records no change of ours.
 */
export function builtFrom(record: SetRecord): string | undefined {
  const built = record.change !== undefined || record.device !== undefined || record.removed !== undefined
    || record.activity !== undefined || record.removedActivity !== undefined
    || record.favourites !== undefined || record.favouritesBack !== undefined
    || record.settings !== undefined || record.settingsBack !== undefined
    || record.removal !== undefined || record.removalBack !== undefined
    || record.setup !== undefined || record.setupBack !== undefined
    || record.empty !== undefined || record.emptyBack !== undefined;
  return built && typeof record.from === 'string' ? record.from : undefined;
}

/** One document of two sets compared: where its content differs, and whether its tag does. */
export interface DocumentDifference {
  readonly document: string;
  readonly values: readonly string[];
  readonly tagChanged: boolean;
}

/**
 * Two sets compared document by document, in the order of `after`: the content as parsed JSON and the tag. A
 * document one set lacks is reported with the pointer `''`, the whole document.
 */
export function setDifferences(before: TouchSet, after: TouchSet): DocumentDifference[] {
  const was = new Map(before.answers.map((a) => [keyOf(a.uri), a]));
  const keys = [...new Set([...after.answers.map((a) => keyOf(a.uri)), ...before.answers.map((a) => keyOf(a.uri))])];
  return keys.map((document) => {
    const a = was.get(document);
    const b = after.answers.find((x) => keyOf(x.uri) === document);
    if (a === undefined || b === undefined) return { document, values: [''], tagChanged: true };
    return { document, values: differences(a.resource, b.resource), tagChanged: a.etag !== b.etag };
  });
}

/** The value a pointer reaches in a set's document, for a report that never prints it. */
export function valueAt(set: TouchSet, document: string, pointer: string): unknown {
  const answer = set.answers.find((a) => keyOf(a.uri) === document);
  const tokens = pointerTokens(pointer);
  return answer === undefined || tokens === undefined ? undefined : reach(answer.resource, tokens)?.value;
}

/**
 * What the answerer writes for the six when the remote holds `held`: a request for each document at the set's
 * address with the tag `held` states for it, answered by `answerOf` from `set`. On a remote that committed
 * `held`, this is the run's first sync list.
 */
export function answersWhenHolding(set: PreparedSet, held: TouchSet): (WrittenAnswer | { readonly refuse: string })[] {
  const requests: RemoteRequest[] = held.answers.map((a) => ({ verb: 'get', uri: a.uri, ...(a.etag === undefined ? {} : { etag: a.etag }) }));
  return requests.map((r) => answerOf(r, { kind: 'set', set }));
}

/**
 * The size of one write of answers as the session sends it: the line's length, the chunks of the answers
 * request's shape it takes, and the last chunk's length. The session id is made up, of a real one's length.
 */
export function writeOfAnswersSize(written: readonly unknown[]): { readonly length: number; readonly chunks: number; readonly perChunk: number; readonly last: number; readonly line: string } {
  const line = `${WRITE_ANSWERS}&sessionId=${'0'.repeat(8)}-0000-4000-8000-${'0'.repeat(12)}&responses=${encodeURIComponent(JSON.stringify({ responses: written }))}`;
  const perChunk = DATA_PACKET_PAYLOAD * (TOUCH_REQUEST_SHAPES[WRITE_ANSWERS]?.packetsPerChunk ?? 0);
  const chunks = Math.ceil(line.length / perChunk);
  return { length: line.length, chunks, perChunk, last: line.length - (chunks - 1) * perChunk, line };
}
