/**
 * A set of a Harmony Touch's own documents, for the answerer to deliver back to it with 200 and tags of ours,
 * and the two checks that read the remote afterwards: `todo-touch.md` 6.8.
 *
 * **What 6.8 is for.** Every answer of ours a Touch has committed so far was a 304 or the finish, so what the
 * remote does with a document of ours delivered with 200 is the firmware reading's alone,
 * `reference/architectures/harmony-touch/answering-a-sync.md` "Not checked". The smallest step that measures
 * it changes one thing: the six configuration documents the remote already holds, delivered whole with 200
 * under tags of ours, the favourites and the pictures kept as before. If it works, the configuration hash
 * reports our tags and the remote behaves as it did.
 *
 * **The one trap, and why the builder checks tags rather than trusting a source.** A document changed on the
 * remote's own screens after the source was taken would be reverted by delivering the source. So each of the
 * six is built from a source only when the tag the remote last asked for it with equals the tag that source
 * was delivered under: the remote reports the tag of what it stores, and a tag is only ever stored with the
 * document it came with, `answering-a-sync.md` "The entity tag an answerer sends". A document whose tag does
 * not match is refused by name, and no set is built.
 *
 * **Where the sources come from is the caller's**, `bin/touch-own-set.ts`: on the bench unit five from the
 * recorded full sync of Logitech's client and Settings from the first hand over of ours, which wrote it back
 * under a tag of ours after a change made on the remote.
 *
 * **A tag of ours here is `setTag`**, `ourTag`'s digest with the set's name in front, so it differs from the
 * tag a hand over of ours already wrote for the same document; the builder still checks that every new tag
 * differs from every tag the remote asked with and every source's.
 *
 * Nothing here opens a remote: it builds and compares.
 */
import { harmonyTouch } from '@harmony/codec';

import { keyOf, prepareSet, resultOf, setTag, statusOf, type RemoteRequest, type SetAnswer, type TouchSet } from '../src/touchsync.ts';

/** The six configuration documents a sync down asks for, in the order the remote asks for them. */
export const OWN_SET_DOCUMENTS: readonly string[] = harmonyTouch.CONFIGURATION_DOCUMENTS;

/**
 * The four documents whose tags `getconfighash` joins on a Touch synced through a computer, in its order, with
 * nothing between them and every double quote removed, `reference/architectures/harmony-touch/api/engine.md`
 * "harmony.engine?getconfighash". The button map list and the settings are not among them.
 */
export const CONFIG_HASH_DOCUMENTS: readonly string[] = ['ActivityList', 'DeviceList', 'ProtocolList', 'Context'];

/** One source of a document: the document as it was delivered, parsed, and the tag it was delivered under. */
export interface OwnSource {
  readonly uri: string;
  readonly resource: unknown;
  readonly tag: string;
  /** Where it came from, a few words for the report, never a value out of it. */
  readonly from: string;
}

/** What the builder reports of each document of the set: where it came from, never a tag or a value. */
export interface OwnSetRow {
  readonly document: string;
  readonly from: string;
}

/**
 * Build the set, or say why not. `sources` in order, a later source of the same document replacing an earlier
 * one; `requests` the last request list the remote handed out for the six, whose tags say what it stores;
 * `name` the set's name, which goes into every tag.
 *
 * Refuses, by document and never quoting a tag: one of the six without a source, the remote not asking for one
 * of them or asking without a tag, a tag that is not its source's, a new tag equal to any tag in play, and a
 * set the answerer's own gate refuses.
 */
export function buildOwnSet(options: {
  readonly sources: readonly OwnSource[];
  readonly requests: readonly RemoteRequest[];
  readonly name: string;
}): { readonly set: TouchSet; readonly rows: readonly OwnSetRow[] } | { readonly refusals: readonly string[] } {
  const refusals: string[] = [];
  const byKey = new Map<string, OwnSource>();
  for (const s of options.sources) byKey.set(keyOf(s.uri), s);
  const asked = new Map<string, RemoteRequest>();
  for (const r of options.requests) asked.set(keyOf(r.uri), r);

  const answers: SetAnswer[] = [];
  const rows: OwnSetRow[] = [];
  for (const document of OWN_SET_DOCUMENTS) {
    const source = byKey.get(document);
    const request = asked.get(document);
    if (source === undefined) {
      refusals.push(`${document}: no source holds it`);
      continue;
    }
    if (request === undefined) {
      refusals.push(`${document}: the remote's request list does not ask for it`);
      continue;
    }
    if (typeof request.etag !== 'string' || request.etag.length === 0) {
      refusals.push(`${document}: the remote asked for it without a tag, so what it holds is not known`);
      continue;
    }
    if (request.etag !== source.tag) {
      refusals.push(`${document}: the tag the remote asked with is not the tag ${source.from} delivered it under, `
        + 'so that source is not known to be what the remote holds');
      continue;
    }
    // The address the remote asked by, which is the one its answer has to name exactly.
    const answer = { uri: request.uri, 'body-type': 'application/json' as const, resource: source.resource };
    answers.push({ ...answer, etag: setTag(answer, options.name) });
    rows.push({ document, from: source.from });
  }
  if (refusals.length > 0) return { refusals };

  const inPlay = new Set([...options.requests.map((r) => r.etag), ...options.sources.map((s) => s.tag)]);
  for (const a of answers) {
    if (inPlay.has(a.etag)) refusals.push(`${keyOf(a.uri)}: its new tag equals a tag already in play`);
  }
  if (new Set(answers.map((a) => a.etag)).size !== answers.length) refusals.push('two documents of the set have the same new tag');
  if (refusals.length > 0) return { refusals };

  const set: TouchSet = { answers };
  const gate = prepareSet(set);
  if ('refusals' in gate) return { refusals: gate.refusals };
  return { set, rows };
}

/** The tag a set states for a document, or undefined. */
function tagOf(set: TouchSet, document: string): string | undefined {
  return set.answers.find((a) => keyOf(a.uri) === document)?.etag;
}

/**
 * The configuration hash a remote reports once it has committed `set`: the four tags of
 * `CONFIG_HASH_DOCUMENTS`, in that order, joined with nothing between them and every double quote removed.
 * Undefined when the set states a tag for none of the four.
 */
export function predictedConfigHash(set: TouchSet): string | undefined {
  const tags = CONFIG_HASH_DOCUMENTS.map((d) => tagOf(set, d)).filter((t): t is string => t !== undefined);
  return tags.length === 0 ? undefined : tags.join('').replace(/"/g, '');
}

/**
 * The answer a remote gave `getconfighash`, as kept in the lab, against what `set` predicts: `equal`, `not
 * equal`, or why it could not be compared. Never the hash itself.
 */
export function compareConfigHash(answer: string, set: TouchSet): string {
  const status = statusOf(answer);
  if (status !== '200') return `not compared, the read answered status ${status ?? 'none'}`;
  const result = answer.startsWith('Response,') ? (JSON.parse(answer.slice('Response,'.length)) as { result?: unknown }).result : undefined;
  if (typeof result !== 'string' || !result.startsWith('result=')) return 'not compared, the answer holds no result= text';
  const predicted = predictedConfigHash(set);
  if (predicted === undefined) return 'not compared, the set states none of the four tags';
  return result.slice('result='.length) === predicted ? 'equal' : 'not equal';
}

/**
 * A request list a remote handed out, as kept in the lab, against `set`: for each of the six, whether it was
 * asked for with the set's tag, with another, with none, or not at all. Never a tag.
 */
export function compareRequestList(answer: string, set: TouchSet): readonly string[] {
  const requests = resultOf(answer)?.['requests'];
  if (!Array.isArray(requests)) return ['not compared, the answer holds no request list'];
  const asked = new Map<string, RemoteRequest>();
  for (const r of requests as RemoteRequest[]) if (typeof r?.uri === 'string') asked.set(keyOf(r.uri), r);
  return OWN_SET_DOCUMENTS.map((document) => {
    const request = asked.get(document);
    if (request === undefined) return `${document}: not asked for`;
    if (typeof request.etag !== 'string' || request.etag.length === 0) return `${document}: asked for without a tag`;
    return `${document}: ${request.etag === tagOf(set, document) ? 'the set\'s tag' : 'another tag'}`;
  });
}
