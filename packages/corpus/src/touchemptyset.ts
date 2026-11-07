/**
 * A Harmony Touch set holding **the empty configuration**, no device and no activity, and the put back that restores
 * what its commit dropped: `todo-touch.md` 9.2.
 *
 * **The empty set**, `withEmpty`: the six of the source with the four lists emptied by the codec's
 * `emptyTouchDocuments` (`packages/codec/src/harmony-touch/empty.ts`, whose header says why each document has the form
 * it has), `ActivityList`, `DeviceList`, `MapList` and `ProtocolList` each under the tag `setTag` gives with the set's
 * name, through `changeDocuments`; Context and Settings keep the source's content and tag and are answered 304.
 *
 * **The put back is not the six alone**, which is what sets it apart from every put back before it. A set with no
 * activity makes the remote's screens ask for no favourites document, and a sync keeps only what it gathers, so the
 * commit of the empty set drops every favourites document the remote held, by the reading in `empty.ts`; a put back of
 * the six alone would then be answered 304 for each favourites document, which on a remote holding none copies nothing.
 * So `emptyBackOf` delivers the six as the set before the empty one states them (`putBackRemoval`), **and** the
 * favourites documents and logos the remote asks for once it holds them, each as the remote held it before the empty
 * set, content and tag, `withContent`. The logos are in it so that, if the pictures were not carried, an untagged
 * request for one is answered 200 rather than 404; asked with the tag the remote held they are answered 304. The two user
 * backgrounds are not in it: no set here holds a background, and the one shown when they are missing is built in.
 *
 * What 9.2's run on the bench Touch did with the two is `packages/bench/test/touch92-runs.test.ts`; the sets are held
 * here by `packages/corpus/test/touch-empty-set.test.ts`. It never prints a value out of a document. Nothing here opens
 * a remote.
 */
import { harmonyTouch } from '@harmony/codec';

import { changeDocuments } from './touchchangedset.ts';
import { isPictureAddress, logosAsked, withContent, type Content } from './touchfavouritesset.ts';
import { putBackRemoval } from './touchremovalset.ts';
import { sixOf } from './touchsettingsset.ts';
import type { SetAnswer, TouchSet } from './touchsync.ts';

/** The four documents the empty set empties and its put back restores, in the order the remote asks for them. */
export const EMPTY_DOCUMENTS = ['ActivityList', 'DeviceList', 'MapList', 'ProtocolList'] as const;

const documentsOf = (set: TouchSet): harmonyTouch.SyncDocuments => harmonyTouch.documentsOfAnswers(set.answers as unknown as harmonyTouch.SyncAnswer[]);

/**
 * The six of `set` with the four lists emptied, each of the four under the tag `name` gives, Context and Settings the
 * source's, content and tags; or why not: the codec's refusal of documents lacking a list, `changeDocuments`'s and the
 * gate's. Favourites documents or pictures `set` delivers are left out: the empty set makes the remote ask for none.
 */
export function withEmpty(options: {
  readonly set: TouchSet;
  readonly name: string;
  readonly tagsInPlay?: Iterable<string>;
}): { readonly set: TouchSet } | { readonly refusals: readonly string[] } {
  const six = sixOf(options.set);
  let empty: harmonyTouch.SyncDocuments;
  try {
    empty = harmonyTouch.emptyTouchDocuments(documentsOf(six));
  } catch (e) {
    if (e instanceof harmonyTouch.ComposeRefusal) return { refusals: [e.message] };
    throw e;
  }
  const documents = Object.fromEntries(EMPTY_DOCUMENTS.map((d) => [d, empty[d]]));
  return changeDocuments({ set: six, documents, name: options.name, tagsInPlay: options.tagsInPlay ?? [] });
}

/**
 * The put back of an empty set `empty` built from `before`: the six as `before` states them, content and tags, and
 * beside them every favourites document and logo the remote asks for once it holds them, each as `held` gives it, which
 * is what the remote held before the empty set (`heldContent` of `before`'s folder). Refuses what `putBackRemoval`
 * refuses, a piece the remote would ask for that `held` lacks, and what `withContent` refuses; `name` tags a piece that
 * `held` gives without a tag, which no piece of the bench chain is.
 */
export function emptyBackOf(options: {
  readonly empty: TouchSet;
  readonly before: TouchSet;
  readonly held: ReadonlyMap<string, SetAnswer>;
  readonly name: string;
}): { readonly set: TouchSet } | { readonly refusals: readonly string[] } {
  const six = putBackRemoval(sixOf(options.empty), sixOf(options.before));
  if ('refusals' in six) return six;
  // The favourites documents the remote will ask for are read from the six with the user's document beside them, since
  // the line up's address is named in the user's document; the logos from the same.
  const withUser = {
    ...documentsOf(six.set),
    ...Object.fromEntries([...options.held.values()].filter((a) => !isPictureAddress(a.uri)).map((a) => [a.uri, a.resource])),
  } as harmonyTouch.SyncDocuments;
  const asked = [...harmonyTouch.favouritesAskedFor(withUser), ...logosAsked(withUser)];
  const missing = asked.filter((uri) => !options.held.has(uri));
  if (missing.length > 0) return { refusals: missing.map(() => 'nothing is held at an address the put back would be asked for') };
  const content: Content[] = asked.map((uri) => {
    const a = options.held.get(uri)!;
    return { uri: a.uri, 'body-type': a['body-type'], resource: a.resource, ...(a.etag === undefined ? {} : { etag: a.etag }) };
  });
  // The remote holds no favourites document after the empty set, so nothing is held for `withContent`'s rule against
  // delivering what the remote already has.
  return withContent({ set: six.set, content, held: new Map(), name: options.name });
}
