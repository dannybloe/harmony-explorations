/**
 * A Harmony Touch set that delivers **favourites documents and pictures** beside the six configuration
 * documents, and the comparisons that say what it delivers: `todo-touch.md` 8.3.
 *
 * **Why favourites need more than the six did.** Every set before 8.3 held the six configuration documents and
 * nothing else: the answerer answered every favourites request 304, so the remote kept its own copy, and every
 * picture 304 against the tag the remote sent, so it kept its own. A set of 8.3 also holds the favourites
 * documents it changes and the pictures of ours, each under its whole address, which `keyOf` in `touchsync.ts`
 * already matches a request by; the answerer then answers those 200 and everything else as before. **No change to
 * the set format was needed for that**: a set's answer was always an address, a body type, a tag and a body, the
 * shape Logitech's client writes, and a picture is a body of type `image/png` in base64. What was needed is the
 * builder below, the gate's picture rule (`pictureRefusals`, codec) and its favourites address rule
 * (`refusalsBeforeASync`, codec), and the hand over's clash rule for favourites (`favouritesClash`, answerer).
 *
 * **What the remote holds at a favourites address or a picture's is not in any set before 8.3**, since none
 * delivered one: it is what the recorded full sync delivered, `touch_full_sync_recording`, the last sync of
 * Logitech's on the bench unit, after which every favourites document and picture was answered 304 and no hand
 * over handed a favourites change up. So `heldContent` walks a chain of sets back and takes, address by address,
 * the latest set's answer that delivered one, and the recording's for the rest.
 *
 * **The tags.** A favourites document or picture of ours gets `setTag` with the set's name, so it is reproducible
 * and differs from every tag the chain states; a favourites document is asked for without a tag in every sync, so
 * its tag is stored and never seen again, and a picture's is what the next sync asks for it with. **A put back
 * states the tags the remote held before**, the recording's, rather than a third tag of ours as 6.9's put backs
 * did: what the remote then holds is exactly what it held before, document, picture and tag, which is what a later
 * return to Logitech's service meets, and the picture's tag in the next request list still says the put back
 * arrived, since it differs from the tag the forward set left.
 *
 * Nothing here opens a remote: it builds and compares. The bench script is `bin/touch-device-set.ts`,
 * `--favourites` and `--favourites-back`.
 */
import { harmonyTouch } from '@harmony/codec/node';

import { builtFrom, differences, type SetRecord } from './touchchangedset.ts';
import { prepareSet, setTag, keyOf, type BodyType, type SetAnswer, type TouchSet } from '../src/touchsync.ts';

/** A picture's address: Logitech's user image store, or the logical scheme for channel logos, as the answerer tells them. */
export const isPictureAddress = (uri: string): boolean => uri.startsWith('content-image://') || uri.startsWith('https://');

/** Whether an answer of a set is content of 8.3's kind, a favourites document or a picture, rather than one of the six. */
export const isContent = (a: { readonly uri: string }): boolean => harmonyTouch.isFavouritesAddress(a.uri) || isPictureAddress(a.uri);

/** What kind of content an address is, for a report that never quotes an address. */
export function contentKind(uri: string): string {
  if (uri.startsWith(harmonyTouch.CONTENT_USER)) return 'the user\'s favourites';
  if (uri.startsWith(harmonyTouch.CONTENT_DEVICE)) return 'the tuning device\'s favourites';
  if (uri.startsWith(harmonyTouch.CONTENT_SERVICE)) return 'the line up';
  if (uri.startsWith('content-image://1.0/station/')) return 'a station\'s logo';
  if (uri.startsWith('content-image://1.0/image/')) return 'an uploaded logo';
  if (uri.startsWith('https://')) return 'a background';
  return 'another address';
}

/** One piece of content for a set: the address, the body's type, the body, and a tag when it is to keep one. */
export interface Content {
  readonly uri: string;
  readonly 'body-type': BodyType;
  readonly resource: unknown;
  /** A tag the remote held before, for a put back; a tag of ours, `setTag` with the set's name, when absent. */
  readonly etag?: string;
}

/**
 * What the remote holds at each content address after the set in `folder` is committed: the latest answer of the
 * chain of sets back from it that delivered one, and `recorded`'s for every other address. `read` reads a folder's
 * set and record, as `chainTags` takes it, so this stays free of the file system.
 *
 * **It does not model a commit that drops content.** An empty set of `todo-touch.md` 9.2, recorded `empty`, makes the
 * remote ask for no favourites document, and by the reading in the codec's `empty.ts` its commit drops them all; this
 * still answers the older sets' and `recorded`'s for a folder whose latest set is such a one. Its put back, recorded
 * `emptyBack`, delivers them again and so stands first in any chain through it, where the answer is right.
 */
export function heldContent(
  folder: string | undefined,
  read: (folder: string) => { readonly set: TouchSet; readonly record: SetRecord },
  recorded: readonly SetAnswer[],
): Map<string, SetAnswer> {
  const held = new Map<string, SetAnswer>();
  const seen = new Set<string>();
  let at = folder;
  while (at !== undefined && !seen.has(at)) {
    seen.add(at);
    const { set, record } = read(at);
    for (const a of set.answers) if (isContent(a) && !held.has(a.uri)) held.set(a.uri, a);
    at = builtFrom(record);
  }
  for (const a of recorded) if (isContent(a) && !held.has(a.uri)) held.set(a.uri, a);
  return held;
}

/**
 * Build a set that delivers `content` beside the six of `set`, or say why not. The six are the source's, content and
 * tags, so a remote that committed the source answers them 304; any content the source itself delivered is left
 * out, since the remote holds it once the source is committed and the answerer then keeps the remote's copy. Each
 * piece of content gets the tag it states or `setTag` with `name`.
 *
 * Refuses, by kind and never quoting an address or a value: content at an address that is neither a favourites
 * document nor a picture, two pieces at one address, a body of another type than its kind takes, content equal to
 * what the remote holds there (`held`), which would be delivered for nothing, a tag already in play down the chain
 * (`tagsInPlay`), a set the answerer's gate refuses, which reads the favourites documents with the six and checks
 * every picture, and a piece the remote holding the set would never ask for: a favourites document at an address its
 * documents do not build, or a picture that is not among the logos it asks for.
 */
export function withContent(options: {
  readonly set: TouchSet;
  readonly content: readonly Content[];
  readonly held: ReadonlyMap<string, SetAnswer>;
  readonly name: string;
  readonly tagsInPlay?: Iterable<string>;
}): { readonly set: TouchSet } | { readonly refusals: readonly string[] } {
  const { set, content, held, name } = options;
  if (content.length === 0) return { refusals: ['no content is delivered'] };
  const inPlay = new Set([...(options.tagsInPlay ?? []), ...set.answers.map((a) => a.etag).filter((t): t is string => t !== undefined)]);
  const refusals: string[] = [];
  const seen = new Set<string>();
  const added: SetAnswer[] = [];
  for (const c of content) {
    const kind = contentKind(c.uri);
    if (!harmonyTouch.isFavouritesAddress(c.uri) && !isPictureAddress(c.uri)) { refusals.push(`${kind}: neither a favourites document nor a picture`); continue; }
    if (seen.has(c.uri)) { refusals.push(`${kind}: delivered twice`); continue; }
    seen.add(c.uri);
    const type = harmonyTouch.isFavouritesAddress(c.uri) ? 'application/json' : 'image/png';
    if (c['body-type'] !== type) { refusals.push(`${kind}: a body of ${c['body-type']} where it takes ${type}`); continue; }
    const was = held.get(c.uri);
    if (was !== undefined && differences(was.resource, c.resource).length === 0 && (c.etag === undefined || c.etag === was.etag)) {
      refusals.push(`${kind}: the content equals what the remote holds there, which changes nothing`);
      continue;
    }
    const etag = c.etag ?? setTag(c, name);
    if (inPlay.has(etag)) { refusals.push(`${kind}: its tag equals a tag already in play, so a set of this name was made before`); continue; }
    added.push({ uri: c.uri, 'body-type': c['body-type'], etag, resource: c.resource });
  }
  if (refusals.length > 0) return { refusals };
  const out: TouchSet = { answers: [...set.answers.filter((a) => !isContent(a)), ...added] };
  const gate = prepareSet(out);
  if ('refusals' in gate) return { refusals: gate.refusals };
  // Every piece has to be one the remote asks for once it holds the set, or it is never delivered: a favourites
  // document at an address its documents build, `favouritesAddressFindings`, and a picture among the logos it asks.
  const after = documentsHeld(out, held);
  const ours = new Set(added.map((a) => a.uri));
  const misplaced = harmonyTouch.favouritesAddressFindings(after).filter((f) => [...ours].some((u) => harmonyTouch.isFavouritesAddress(u) && contentKind(u) === kindName(f.document)));
  const asked = logosAsked(after);
  const unasked = added.filter((a) => isPictureAddress(a.uri) && !asked.includes(a.uri));
  if (misplaced.length > 0 || unasked.length > 0) {
    return { refusals: [...misplaced.map((f) => `${kindName(f.document)}: ${f.message}`), ...unasked.map((a) => `${contentKind(a.uri)}: the remote holding the set asks for no picture there, so it would never be delivered`)] };
  }
  return { set: out };
}

/** The kind a finding names a favourites document by, as `contentKind` words it. */
const kindName = (document: string): string =>
  document === 'ContentUser' ? 'the user\'s favourites' : document === 'ContentDevice' ? 'the tuning device\'s favourites' : 'the line up';

/** The content a composition of the codec gives, as the set takes it: the documents as JSON, the pictures in base64. */
export function contentOfComposed(composed: harmonyTouch.ComposedFavourites): Content[] {
  return [
    ...Object.entries(composed.documents).map(([uri, resource]): Content => ({ uri, 'body-type': 'application/json', resource })),
    ...composed.pictures.map((p): Content => ({ uri: p.uri, 'body-type': 'image/png', resource: Buffer.from(p.png).toString('base64') })),
  ];
}

/**
 * The put back of a set that delivered content: every piece it delivered, as the remote held it before, address,
 * body and tag, from `before`, which is `heldContent` of the set the forward set was built from. A piece at an
 * address the remote held nothing at before is refused, since there is nothing to put back and a picture once
 * held is kept by the remote for good: its screens carry every stored picture into each new set.
 */
export function putBackContent(forward: TouchSet, before: ReadonlyMap<string, SetAnswer>): Content[] | { readonly refusals: readonly string[] } {
  const refusals: string[] = [];
  const out: Content[] = [];
  for (const a of forward.answers.filter(isContent)) {
    const was = before.get(a.uri);
    if (was === undefined) { refusals.push(`${contentKind(a.uri)}: the remote held nothing there before, so there is nothing to put back`); continue; }
    out.push({ uri: was.uri, 'body-type': was['body-type'], resource: was.resource, ...(was.etag === undefined ? {} : { etag: was.etag }) });
  }
  return refusals.length > 0 ? { refusals } : out;
}

/**
 * The documents a remote holds once it has committed `set` on top of `held`: the six of the set, and every
 * favourites document, the set's where it delivers one and the held one otherwise. What the codec's reader reads
 * to predict the favourites screen and the requests for pictures.
 */
export function documentsHeld(set: TouchSet, held: ReadonlyMap<string, SetAnswer>): harmonyTouch.SyncDocuments {
  const favourites = [...held.values()].filter((a) => harmonyTouch.isFavouritesAddress(a.uri));
  return harmonyTouch.documentsOfAnswers([...favourites, ...set.answers]);
}

/**
 * The logos a remote holding `documents` asks for, in its screens' order, each once: every favourite's in the
 * order shown, a picture a dial position names or else the station's, none for a channel added by hand without
 * one, then the line up's popular channels' by rank, at most 25, `submitUserSelectedImageRequest` and
 * `submitPopularImageRequest` with `addToResourceRequests` dropping an address already asked for. The backgrounds
 * come before them and are not listed: no set here delivers one.
 */
export function logosAsked(documents: harmonyTouch.SyncDocuments): string[] {
  const out: string[] = [];
  const add = (uri: string | undefined): void => { if (uri !== undefined && !out.includes(uri)) out.push(uri); };
  for (const f of harmonyTouch.readConfiguration(documents).favourites) {
    for (const one of f.favourites) add(one.logo);
    const ranked = (f.service?.channels ?? []).filter((c) => c?.number !== undefined && Number.isFinite(Number(c?.popularRank)) && typeof c?.station?.id === 'string');
    // The screens bucket by rank, then walk the buckets in `pairs` order, which for a table of small whole
    // numbers is ascending in the remote's Lua; a stable sort by rank is that.
    const sorted = [...ranked].sort((a, b) => Number(a!.popularRank) - Number(b!.popularRank)).slice(0, 25);
    for (const c of sorted) add(harmonyTouch.stationLogo(c!.station!.id!));
  }
  return out;
}

/**
 * A request list the remote handed out, as kept in the lab, against a set's content: for each picture and
 * favourites document the set holds, whether it was asked for with the set's tag, with another, with none, or not at
 * all. Never a tag or an address.
 */
export function compareContentRequests(requests: readonly { readonly uri: string; readonly etag?: string }[], set: TouchSet): string[] {
  return set.answers.filter(isContent).map((a) => {
    const r = requests.find((x) => x.uri === a.uri);
    const kind = contentKind(a.uri);
    if (r === undefined) return `${kind}: not asked for`;
    if (typeof r.etag !== 'string' || r.etag.length === 0) return `${kind}: asked for without a tag`;
    return `${kind}: ${r.etag === a.etag ? 'the set\'s tag' : 'another tag'}`;
  });
}

/** The keys of a set's content answers, for a caller that matches them as the answerer does. */
export const contentKeys = (set: TouchSet): string[] => set.answers.filter(isContent).map((a) => keyOf(a.uri));
