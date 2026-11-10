/**
 * A Harmony Touch set with **Settings of ours and Context composed from a description**, made from a set the remote
 * holds, its exact inverse, and the comparisons that say what changed.
 *
 * **What the settings set is for.** Every set before it delivered Settings and Context only as the remote had them, the own set's own
 * documents under tags of ours. the settings set composes both in the codec, `composeTouchSettings` and `composeTouchContext` in
 * `packages/codec/src/families/harmony-touch/settings.ts`: Settings with a row or two changed that a person can see or time at
 * the bench, and Context from a description of the seven fields a Touch reads, equal to what the remote holds, so that
 * the run proves Context can be written by us without changing what the remote does.
 *
 * **The set is the six and nothing else.** A source that delivered favourites or a picture, the favourites set's put back, holds
 * them beside its six; once the source is committed the remote holds them, so they are left out here, and the
 * answerer keeps the remote's copy of each, a favourites document 304 and a picture 304 against its tag, as every set
 * before the favourites set did. Settings and Context get new tags, `setTag` with the set's name, through `changeDocuments`, Context
 * with `retagUnchanged` since its content is the source's; the other four keep the source's content and tags.
 *
 * **The put back is the source's Settings and Context, content and tags**, as the favourites set's put back states the tags the
 * remote held before: the remote then holds exactly what it held before the settings set, and each run's first request list still
 * says which set it holds, since the forward set's two tags differ from the source's. `getconfighash` covers Context
 * and not Settings, so the hash says Context arrived and the request list of the next run says Settings did.
 *
 * Nothing here opens a remote: it builds and compares. The bench script is `bin/touch-device-set.ts`, `--settings`
 * with `--context`, `--settings-back` and `--describe-context`.
 */
// The Node entry, for the fonts, the icons, the deflate and the SHA-256 the core asks its loader for.
import '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';

import { changeDocuments, differences } from './touchchangedset.ts';
import { isContent } from './touchfavouritesset.ts';
import { keyOf, prepareSet, type SetAnswer, type TouchSet } from '../src/touchsync.ts';

/** The two documents the settings set delivers. */
export const SETTINGS_SET_DOCUMENTS = ['Settings', 'Context'] as const;

/** The six configuration documents of a set, without the favourites documents and pictures a source may also carry. */
export const sixOf = (set: TouchSet): TouchSet => ({ answers: set.answers.filter((a) => !isContent(a)) });

const documentOf = (set: TouchSet, name: string): SetAnswer | undefined => set.answers.find((a) => keyOf(a.uri) === name);

/**
 * Build the set: Settings composed from `settings` against the source's Settings, Context composed from `context`
 * against the source's Context, both under the tag `name` gives, the other four the source's. Refuses, never quoting a
 * value: a source without either document, whatever the codec's composers refuse, a new tag in play down the chain,
 * and a set the answerer's gate refuses.
 */
export function withSettingsAndContext(options: {
  readonly set: TouchSet;
  readonly settings: harmonyTouch.OwnSettings;
  readonly context: harmonyTouch.OwnContext;
  readonly name: string;
  readonly tagsInPlay?: Iterable<string>;
}): { readonly set: TouchSet } | { readonly refusals: readonly string[] } {
  const six = sixOf(options.set);
  const settings = documentOf(six, 'Settings');
  const context = documentOf(six, 'Context');
  if (settings === undefined || context === undefined) return { refusals: ['the source set holds no Settings or no Context'] };
  let composed: { Settings: unknown; Context: unknown };
  try {
    composed = {
      Settings: harmonyTouch.composeTouchSettings(options.settings, settings.resource as harmonyTouch.Settings),
      Context: harmonyTouch.composeTouchContext(options.context, context.resource as harmonyTouch.Context),
    };
  } catch (e) {
    if (e instanceof harmonyTouch.ComposeRefusal) return { refusals: [e.message] };
    throw e;
  }
  return changeDocuments({ set: six, documents: composed, name: options.name, tagsInPlay: options.tagsInPlay ?? [], retagUnchanged: ['Context'] });
}

/**
 * The exact inverse of a set `withSettingsAndContext` built from `before`: `forward`'s six with Settings and Context
 * as `before` states them, content and tags. Refuses, by document: a set without the six, any of the other four
 * differing between the two in content or tag, which would make this more than a put back, either of the two already
 * holding `before`'s tag, which puts nothing back, and a set the gate refuses.
 */
export function putBackSettingsAndContext(forward: TouchSet, before: TouchSet): { readonly set: TouchSet } | { readonly refusals: readonly string[] } {
  const a = sixOf(forward);
  const b = sixOf(before);
  const refusals: string[] = [];
  for (const document of harmonyTouch.CONFIGURATION_DOCUMENTS) {
    const x = documentOf(a, document);
    const y = documentOf(b, document);
    if (x === undefined || y === undefined) { refusals.push(`${document} is missing from one of the two sets`); continue; }
    const isOurs = (SETTINGS_SET_DOCUMENTS as readonly string[]).includes(document);
    if (!isOurs && (differences(x.resource, y.resource).length > 0 || x.etag !== y.etag)) refusals.push(`${document} differs between the two sets, and only Settings and Context are put back`);
    if (isOurs && x.etag === y.etag) refusals.push(`${document} already holds the tag it is to be put back under`);
  }
  if (refusals.length > 0) return { refusals };
  const out: TouchSet = { answers: a.answers.map((x) => ((SETTINGS_SET_DOCUMENTS as readonly string[]).includes(keyOf(x.uri)) ? documentOf(b, keyOf(x.uri))! : x)) };
  const gate = prepareSet(out);
  if ('refusals' in gate) return { refusals: gate.refusals };
  return { set: out };
}

/** One settings row whose first value differs between two Settings, by name. Only rows `SETTING_ROWS` names carry values. */
export interface RowChange {
  readonly name: string;
  readonly was: string | undefined;
  readonly now: string | undefined;
}

/**
 * Every row whose first value differs between two Settings documents, and whether everything else, the other rows
 * whole and every other field, is equal. **The structural diff for Settings**: the two rows of the settings set and nothing else.
 * A value is reported only for a row `SETTING_ROWS` names, levels, seconds and yes or no; any other row is reported by
 * name alone, since the background's and the pictures' values are the account's.
 */
export function settingsChanges(before: unknown, after: unknown): { readonly rows: readonly RowChange[]; readonly restEqual: boolean } {
  const rowsOf = (x: unknown): Record<string, unknown>[] =>
    (typeof x === 'object' && x !== null && Array.isArray((x as Record<string, unknown>)['Settings']) ? (x as { Settings: Record<string, unknown>[] }).Settings : []);
  const a = rowsOf(before);
  const b = rowsOf(after);
  const first = (r: Record<string, unknown> | undefined): string | undefined => {
    const v = Array.isArray(r?.['Values']) ? (r!['Values'] as unknown[])[0] : undefined;
    return typeof v === 'string' ? v : undefined;
  };
  const rows: RowChange[] = [];
  const names = [...new Set([...a, ...b].map((r) => String(r?.['Name'])))];
  for (const name of names) {
    const x = a.find((r) => r?.['Name'] === name);
    const y = b.find((r) => r?.['Name'] === name);
    if (first(x) !== first(y)) {
      const shown = harmonyTouch.SETTING_ROWS[name] !== undefined;
      rows.push({ name, was: shown ? first(x) : undefined, now: shown ? first(y) : undefined });
    }
  }
  // Everything else: each row with its first value set aside, and every field but the rows.
  const withoutFirst = (rs: Record<string, unknown>[]): unknown => rs.map((r) => ({ ...r, Values: Array.isArray(r?.['Values']) ? (r['Values'] as unknown[]).slice(1) : r?.['Values'] }));
  const rest = (x: unknown, rs: Record<string, unknown>[]): unknown => (typeof x === 'object' && x !== null ? { ...(x as object), Settings: withoutFirst(rs) } : x);
  return { rows, restEqual: differences(rest(before, a), rest(after, b)).length === 0 };
}
