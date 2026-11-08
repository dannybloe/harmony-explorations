/**
 * The answerer: a program of ours that drives a Harmony Touch's sync down end to end in place of Logitech's
 * client and service. `todo-touch.md` 6.6, under decision 29.
 *
 * **What a sync is, in one paragraph.** A Touch does not take a compiled file. It asks for its own documents
 * one at a time through one file on the cable, `/sys/hlapi`, and whoever is on the other end answers: a
 * request line is written into the file and its answer read back, `touchsession.ts`. The remote's own changes
 * are handed up first, then a sync is started, and from then on the host reads the remote's list of what it
 * wants, answers every entry, and reads again, until the remote queues `proxy://Finished` or `proxy://Abort`.
 * What the remote checks of an answer, and what it does not, is
 * `reference/architectures/harmony-touch/answering-a-sync.md`, and every rule below cites the section of it
 * that it implements.
 *
 * **Why this lives in `packages/corpus` and not in `packages/usb`.** The answerer has to refuse a set the
 * codec's reader and check reject before anything of it is written, and the reader and the check are the
 * codec's, `packages/codec/src/families/harmony-touch/`. The codec depended on `packages/usb` when this was written, so
 * `packages/usb` could not import the codec (since `todo.md` 7.3.4 the codec's own source no longer does, its
 * tests and scripts still do, and nothing has been moved because of it), and an answerer there could only take the check as an argument: a gate a caller hands in
 * is a gate a caller can hand in empty, the lesson `CLAUDE.md` records for the configuration version check,
 * "a rail that asks a caller a question is a rail the caller answers". Here the answerer calls
 * `refusalsBeforeASync` itself. `packages/corpus` already depends on both and already holds the other write
 * of a configuration to a remote, `bin/write-config.ts`, so it is where the line between library and
 * protocol falls for this too. The protocol stays in `packages/usb`: the session, the rail and the transport's
 * guard, which this file reaches only through `TouchRequestSession.request`.
 *
 * **What it does, in order**, each step a line of the form `SYNC_LINES` lists:
 *
 * 1. **The gate**, before anything is opened or sent: a set is read by the codec's reader and passes its
 *    check with no finding that is `refused`, every answer has the envelope `setRefusals` asks for, and all
 *    six configuration documents are present, `refusalsBeforeASync`. A set that fails is refused here, with
 *    nothing sent, so no recovery is needed.
 * 2. **The provisioning read**, `PROVISIONING`, refused unless the remote is provisioned in mode 0 or 1, the
 *    two modes a Touch syncs through a computer in, `api/setup.md` "`setup.account?provision`". A read: nothing
 *    is changed by it.
 * 3. **The remote's own changes handed up**, `HAND_OVER`, and every list that asks answered: a `put` is kept in
 *    the lab folder **before** its answer is written, then answered 200 with the same document and a tag of
 *    ours, as Logitech's client wrote the service's echo back; the hand over ends at `proxy://Finished`. From
 *    this request on the remote has been acted on, so every refusal after it names the recovery and what an
 *    abort would cost. **With a set, a document handed up that the set also holds stops the run** once the
 *    hand over has ended, before the sync request: the set's copy would overwrite the change made on the
 *    remote, `todo-touch.md` 6.8. The change is by then kept in the lab and committed on the remote, and no
 *    sync is marked running. A favourites document is handed up to another address than the one a sync asks
 *    for it at, so it clashes by its kind, `favouritesClash`, `todo-touch.md` 8.3.
 * 4. **The sync started**, `SYNC`, and every list answered from the set until `proxy://Finished` or
 *    `proxy://Abort`, answered as Logitech's client answers both, a status of 200 and nothing else.
 *
 * **How an entry is answered**, `answerOf`:
 *
 * * **a document** with 200, its tag and the object itself, never a string of JSON; **304 when the remote
 *   sent a tag equal to the set's**, echoing it, and never to a request that carried no tag, "The entity tag
 *   an answerer sends"
 * * **a picture the set lacks** with 304 against the tag the remote sent, since a tagged picture is one it
 *   holds, and with 404 when it sent none, which the remote logs and never aborts on; this answered every
 *   picture a set lacks 404 until `todo-touch.md` 6.8, whose set holds no pictures and whose run should change
 *   nothing a unit has not already committed but the six documents. **A favourites document the set lacks**
 *   with 304, below; any other document the set lacks is a refusal of ours
 * * **in `unchanged` mode**, every document and picture with 304 against the tag the remote sent. **A document
 *   it sent no tag for is refused**: a request without a tag means either that the remote holds no file for
 *   it, when a 304 copies nothing and the document is missing from the new set, or that a change made on the
 *   remote's own screens erased the tag of a file it keeps, and this answerer cannot tell the two apart, "The
 *   entity tag an answerer sends". This header said a 304 there always copied a file the remote does not
 *   hold<!--superseded--> until the preflight of `todo-touch.md` 6.7 read the screens' put. **A picture it sent
 *   no tag for is answered 404**, which the remote logs and never aborts on, and the screens copy every stored
 *   picture into the gathered set before asking, so a picture it holds stays
 * * **a favourites document, in either mode, with 304 whether or not the remote sent a tag**, unless a set
 *   holds one, when it is answered 200 with it. On a Touch synced through a computer every favourites request
 *   comes untagged, because the remote's screens look the document up in the set being gathered, where it is
 *   not yet: `tests/test_harmony_touch_favourites_untagged.py`, found when 6.7's first run stopped there. A 304
 *   makes the remote copy its own committed document and its own stored tag into the new set, so it keeps
 *   exactly what it holds, and **writes no document**; one it does not hold stays missing, which costs no more
 *   than a 404 would. The answer still has to carry a tag, since an answer to a favourites request without
 *   one aborts the sync, so it echoes the remote's or carries `keptCopyTag`, which the remote does not store.
 *   **This answerer refused an untagged favourites document**<!--superseded-->, and answered the user's
 *   favourites a set lacked 404 with no tag, which would have aborted the sync, until that reading.
 *
 * **A write of answers is announced with the whole line's length**, which is the session's default,
 * `TouchAnnouncement` in `touchsession.ts`: the remote's listener counts the line from the request's name on,
 * so that is the number it reaches exactly on the last chunk. Logitech's client announces the `responses`
 * argument alone and can be acted on one chunk early; `syncTouch` takes a session its caller opened, and
 * `answerTouchSync` opens it with the default.
 *
 * **`unchanged` is not write free**, and its first line says so: every document the remote hands up is
 * written back to it with a tag of ours, and the hand over then commits it, so the change made on the remote
 * is taken off the queue that would carry it to Logitech's account and never reaches it. A later return to
 * Logitech's service then meets a tag it never issued, which is not checked,
 * `reference/architectures/harmony-touch/answering-a-sync.md` "The entity tag an answerer sends".
 *
 * **A write of answers counts as taken only when its reply names the request**, `mime` equal to
 * `WRITE_ANSWERS`, as every reply to a write of answers in the three recorded syncs does. The remote's listener
 * answers a chunk of a write it is still gathering with a reply of status 200 and no `mime`, the same reply
 * it gives an announcement, so a status of 200 alone would take a write the remote never acted on: the next
 * read would clear the gathered text and hand the same list out again under a new session id, for ever, and
 * the bound on empty lists would never apply. **And one address handed out more often than `maxHandOuts`
 * times in a run is refused** as the second line of that defence, since a run that works hands an address out
 * at most twice, once in the hand over and once in the sync, `proxy://Finished` and Settings among them, and
 * the limit of three leaves one more as a margin.
 *
 * **A refusal mid sync stops and says so**, rather than sending anything else: the request rail carries no
 * abort for a session driving a sync, on purpose, `TOUCH_RECOVERY_DOOR` in `rails.ts`, so a person runs the
 * recovery after reading why. **Every refusal after the remote was acted on reports two recovery lines**:
 * `RECOVERY`, the order of steps, which starts with the read `getconfighash`, since 200 there means no sync is
 * marked running and nothing needs doing; and what an abort would cost at the point the run stopped, which
 * inside the hand over is the handed up document's tag: an abort then empties the remote's outgoing queue, so
 * the change stays on the remote with no tag and is never handed up again, and a later `unchanged` run refuses
 * at it. A sync stopped before its commit leaves the committed set untouched,
 * `reference/architectures/harmony-touch/firmware.md` "A sync that stops halfway". The order is the preflight's,
 * the lab's `work/touch-firmware/notes/6.7-preflight.md`, section 5.
 *
 * **The remote's screens take part only while it is powered over USB**, and nothing a session can ask says
 * which power source it is on: `answering-a-sync.md` "How a sync aborts, and how an answerer learns of it".
 * On any other the screens ignore the hand over's and the sync's broadcasts, never send the commit, and this
 * answerer reads empty lists until its bound and refuses. The script says so in its dry run.
 *
 * **Everything goes to the lab folder the caller names**: every request line and every answer, one file
 * each, a log of the lines above, and what the remote handed up, under `handed-up/`, written before the
 * answer that takes it. The folder has to be new or empty, so a run never writes over another's.
 *
 * **`answerTouchSync` is the whole run an application calls**, `todo.md` 7.3.10, on `@harmony/corpus/write`:
 * the two flags and the recovery flag checked before anything is opened, `assertTouchSyncAllowed`, the Touch
 * opened by the caller's `open`, the session with its unit check, `syncTouch`, and the transport closed. It was
 * the script's `--commit` until then, and `bin/touch-sync.ts` keeps its command line, the lab and the printing.
 *
 * **`unchanged` has driven three syncs on the bench unit**, `todo-touch.md` 6.7 and 6.8, and a set one, 6.8, the
 * remote's own six documents delivered with 200 under tags of ours and committed,
 * `packages/usb/test/touch-own-set-sync.test.ts`. This
 * said nothing in the file had been run against a remote<!--superseded--> until 6.8's preflight read the runs.
 */
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { harmonyTouch } from '@harmony/codec/build';
import type { Transport } from '@harmony/usb';
import {
  RailError,
  TOUCH_READ_REQUESTS,
  TOUCH_RECOVERY_DOOR,
  TOUCH_REQUEST_DOOR,
  TOUCH_SYNC_REQUESTS,
  WRITES_ENABLED,
} from '@harmony/usb/rails';
import { openTouchRequestSession, type TouchRequestSession } from '@harmony/usb/touchsession';

// ---------------------------------------------------------------------------------------------------
// The requests, by the rail's own lists
// ---------------------------------------------------------------------------------------------------

/** The provisioning read, the rail's first read. */
export const PROVISIONING = TOUCH_READ_REQUESTS[0] as string;
/** Hand the remote's own changes up. */
export const HAND_OVER = TOUCH_SYNC_REQUESTS[0] as string;
/** Start the sync from the account. */
export const SYNC = TOUCH_SYNC_REQUESTS[1] as string;
/** Read the next request list. */
export const READ_LIST = TOUCH_SYNC_REQUESTS[2] as string;
/** Write the answers. */
export const WRITE_ANSWERS = TOUCH_SYNC_REQUESTS[3] as string;

/** The two endings the remote queues, each answered as Logitech's client answers them. */
export const FINISHED = 'proxy://Finished';
export const ABORT = 'proxy://Abort';

/**
 * The order a person follows after any stop once the remote has been acted on, the preflight's section 5: the
 * read first, since its answer says whether anything is left to clear, and a run of `touch-recover.ts` per
 * step, each answer read before the next, as `recovering-a-remote` sets out. The abort's cost at the point a
 * run stopped is a line of its own, `TouchSyncOutcome.abortCost`.
 */
export const RECOVERY = 'first read getconfighash, node packages/usb/bin/touch-request.ts --request confighash --commit: '
  + '200 needs nothing; 202 needs node packages/usb/bin/touch-recover.ts --step abort, that read again, then --step reboot; '
  + 'no answer at all, stop and ask';

/** How often one address may be handed out in one run before the run refuses, the header's second defence. */
export const MAX_HAND_OUTS = 3;

/** The two modes a Touch syncs through a computer in, `api/setup.md` "`setup.account?provision`". */
const SYNCING_MODES: readonly number[] = [0, 1];

// ---------------------------------------------------------------------------------------------------
// The set
// ---------------------------------------------------------------------------------------------------

/** The two kinds of body an answer carries, `answering-a-sync.md` "A document has to arrive as the object itself". */
export type BodyType = 'application/json' | 'image/png';

/**
 * One answer of a set: the address it answers, its body's type, its tag if the set states one, and the body,
 * a parsed JSON object for a document and base64 text for a picture. **The shape of the answers Logitech's
 * client wrote**, so a set can be taken from a recording as it stands, `todo-touch.md` 6.8.
 *
 * `uri` is matched by the key `keyOf` gives it: one of the six configuration documents by its name, so a set
 * answers the remote whatever account number its addresses carry, and anything else by the whole address.
 */
export interface SetAnswer {
  readonly uri: string;
  readonly 'body-type': BodyType;
  readonly etag?: string;
  readonly resource: unknown;
}

export interface TouchSet {
  readonly answers: readonly SetAnswer[];
}

/** A set as the answerer uses it: each answer under its key, every one with a tag. */
export interface PreparedSet {
  readonly entries: ReadonlyMap<string, SetAnswer & { readonly etag: string }>;
  /** How many tags the set stated and how many are ours. */
  readonly tags: { readonly stated: number; readonly ours: number };
}

export type TouchSyncMode =
  | { readonly kind: 'unchanged' }
  | { readonly kind: 'set'; readonly set: TouchSet };

/** The key an answer or a request is matched by: a document's key in the codec's rule, else the address. */
export function keyOf(uri: string): string {
  return harmonyTouch.documentKeyOf(uri) ?? uri;
}

/**
 * **A tag of ours**: a digest of the body as it would be sent, so "not changed" is a comparison of two tags
 * rather than a record kept somewhere, `answering-a-sync.md` "The entity tag an answerer sends". Shaped as a
 * version 8 identifier, RFC 9562's form for an identifier made by a rule of one's own, so it has the shape
 * of Logitech's tags and still says whose it is. Theirs are five groups of hex digits of 33 to 36 characters,
 * the groups' leading zeros dropped, and none of the 25 in the two recorded syncs down is a version 4
 * identifier, `touch-own-set.test.ts`; this said theirs were random identifiers, version 4<!--superseded-->,
 * until the preflight of `todo-touch.md` 6.8 counted them. A Touch has stored and sent back tags of all
 * three lengths, so it holds a tag as text of any of them.
 */
export function ourTag(answer: Pick<SetAnswer, 'body-type' | 'resource'>): string {
  return version8(`${answer['body-type']}\n${bodyText(answer)}`);
}

/**
 * **A tag of ours for a set's answer**, `todo-touch.md` 6.8: `ourTag`'s digest with the set's name in front.
 * `ourTag` alone gives a document the tag the hand over already wrote for it when the remote handed that same
 * document up, so a set built from it would be answered 304 and deliver nothing; with the name, a set built
 * from documents the remote holds still states tags the remote does not hold, and each is a 200. The same name
 * and body give the same tag every time, so a set's tags can be recomputed from the set, and a different name
 * gives different tags for the same documents. `bin/touch-own-set.ts` uses it, with the set folder's name.
 */
export function setTag(answer: Pick<SetAnswer, 'body-type' | 'resource'>, name: string): string {
  return version8(`set ${name}\n${answer['body-type']}\n${bodyText(answer)}`);
}

/** A body as it is written into the answer: a document as its JSON, a picture as its base64 text. */
function bodyText(answer: Pick<SetAnswer, 'body-type' | 'resource'>): string {
  return answer['body-type'] === 'application/json' ? JSON.stringify(answer.resource) : String(answer.resource);
}

/**
 * **The tag a 304 to a favourites request carries when the remote sent none.** The remote insists on a tag on
 * every answer to a favourites request and aborts the sync without one, and on a 304 it copies its committed
 * document with the tag stored beside it, so this one is never stored: it only has to be there. A digest of
 * the address, in `ourTag`'s shape, so a run is the same every time and the tag still says whose it is.
 */
export function keptCopyTag(uri: string): string {
  return version8(`kept copy\n${uri}`);
}

/** A digest shaped as a version 8 identifier, RFC 9562's form for one made by a rule of one's own. */
function version8(text: string): string {
  const hex = createHash('sha256').update(text).digest('hex').slice(0, 32).split('');
  hex[12] = '8';
  hex[16] = ((Number.parseInt(hex[16] as string, 16) & 0x3) | 0x8).toString(16);
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const PNG = [0x89, 0x50, 0x4e, 0x47];
const isObject = (x: unknown): boolean => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * What is wrong with a set's answers as answers, before any document is read, each a sentence naming the
 * answer by its place in the set and never quoting it, or none. The envelope the remote checks,
 * `answering-a-sync.md` "What the remote checks of an answer", made stricter where `touch-host.test.ts`'s
 * envelope is: a document is a JSON object, a picture is a PNG in base64, a stated tag is not empty, and no
 * two answers share a key. **And a picture is one the codec lets through**, `pictureRefusals` in
 * `packages/codec/src/families/harmony-touch/favourites.ts`, since `todo-touch.md` 8.3 put the first picture of ours in a
 * set: a channel logo, decoding, in the form every logo the remote was seen to draw has, and inside the box its
 * address asks for.
 */
export function setRefusals(set: TouchSet): string[] {
  const out: string[] = [];
  if (!Array.isArray(set.answers)) return ['the set holds no list of answers'];
  const seen = new Set<string>();
  set.answers.forEach((a, at) => {
    const where = `answer ${at}`;
    if (!isObject(a) || typeof a.uri !== 'string' || a.uri.length === 0) {
      out.push(`${where} names no address`);
      return;
    }
    const key = keyOf(a.uri);
    if (seen.has(key)) out.push(`${where} answers an address an earlier answer already answers`);
    seen.add(key);
    if (a.etag !== undefined && (typeof a.etag !== 'string' || a.etag.length === 0)) out.push(`${where} states a tag that is empty or not text`);
    if (a['body-type'] === 'application/json') {
      if (!isObject(a.resource)) out.push(`${where} is a document that is not a JSON object, which the remote stores as something it cannot read`);
    } else if (a['body-type'] === 'image/png') {
      const bytes = typeof a.resource === 'string' ? Buffer.from(a.resource, 'base64') : Buffer.alloc(0);
      if (!PNG.every((b, i) => bytes[i] === b)) out.push(`${where} is a picture that is not a PNG in base64`);
      // What the codec asks of a picture before the remote is handed it, `todo-touch.md` 8.3: a channel logo's
      // address, a file that decodes, the form the remote was seen to draw, and the box the address asks for.
      else for (const r of harmonyTouch.pictureRefusals(a.uri, bytes)) out.push(`${where}: ${r}`);
    } else {
      out.push(`${where} has a body type other than application/json or image/png`);
    }
  });
  return out;
}

/**
 * The gate, `todo-touch.md` 6.6: the set's envelope, `setRefusals`, then its documents through the codec's
 * reader and check, `refusalsBeforeASync`, which wants all six configuration documents, every list the
 * engine's reader walks, and no finding the check calls `refused`. Either a prepared set or the refusals,
 * each a sentence a person can act on.
 */
export function prepareSet(set: TouchSet): { readonly set: PreparedSet } | { readonly refusals: readonly string[] } {
  const envelope = setRefusals(set);
  if (envelope.length > 0) return { refusals: envelope };
  const documents = harmonyTouch.documentsOfAnswers(set.answers.filter((a) => a['body-type'] === 'application/json'));
  const findings = harmonyTouch.refusalsBeforeASync(documents);
  if (findings.length > 0) {
    // A favourites document's finding names it by its whole address, which carries the account's identifiers, so a
    // refusal names its kind instead: the refusal is printed and kept in the lab's gate file, `todo-touch.md` 8.3.
    return { refusals: findings.map((f) => `${f.document.includes('://') ? describe(f.document) : f.document}${f.path === '' ? '' : `.${f.path}`}: ${f.message} (${f.rule})`) };
  }
  const entries = new Map<string, SetAnswer & { etag: string }>();
  let stated = 0;
  for (const a of set.answers) {
    if (a.etag !== undefined) stated += 1;
    entries.set(keyOf(a.uri), { ...a, etag: a.etag ?? ourTag(a) });
  }
  return { set: { entries, tags: { stated, ours: set.answers.length - stated } } };
}

// ---------------------------------------------------------------------------------------------------
// Answering one request
// ---------------------------------------------------------------------------------------------------

/** One entry of a request list, as `proxy.request` hands it over, `api/proxy.md`. */
export interface RemoteRequest {
  readonly verb: string;
  readonly uri: string;
  readonly etag?: string;
  /** For a `put`, the stored document, JSON and then URL encoded. */
  readonly resource?: string;
}

/** One answer as it is written, in the key order Logitech's client writes it. */
export interface WrittenAnswer {
  readonly statusCode: string;
  readonly uri: string;
  readonly 'body-type'?: BodyType;
  readonly etag?: string;
  readonly resource?: unknown;
}

/** A picture's address: Logitech's user image store, or the logical scheme for channel logos. */
const isPicture = (uri: string): boolean => uri.startsWith('content-image://') || uri.startsWith('https://');

/** A favourites document: the user's own, a device's, or a provider's line up, `favourites-and-settings.md`. */
const isFavourites = (uri: string): boolean =>
  [harmonyTouch.CONTENT_USER, harmonyTouch.CONTENT_DEVICE, harmonyTouch.CONTENT_SERVICE].some((p) => uri.startsWith(p));

/**
 * Whether a favourites document the remote handed up is one a set would overwrite, `todo-touch.md` 8.3. The
 * remote hands its user's favourites up to `content://1.0/user/` and the user's id, and a device's to
 * `content://1.0/device/` and the device document's id, the screens' `getRequest`, where a sync asks for the same
 * documents at `content://1.0/user;` and `content://1.0/device;` and a profile address: so the two keys never
 * match, and a set holding the user's favourites would revert a change of favourites made on the remote without
 * the rule above seeing it. A set holding any favourites document of the kind handed up clashes with it.
 */
function favouritesClash(key: string, set: PreparedSet): boolean {
  const kinds: readonly (readonly [string, string])[] = [['content://1.0/user/', harmonyTouch.CONTENT_USER], ['content://1.0/device/', harmonyTouch.CONTENT_DEVICE]];
  return kinds.some(([up, down]) => key.startsWith(up) && [...set.entries.keys()].some((k) => k.startsWith(down)));
}

/**
 * The answer that keeps a favourites document as the remote holds it: 304, with the tag the remote sent or,
 * when it sent none, `keptCopyTag`. The header says why every favourites request of such a sync is untagged
 * and what the remote does with this answer.
 */
const keepTheRemotesCopy = (uri: string, tag: string | undefined): WrittenAnswer =>
  ({ statusCode: '304', uri, etag: tag ?? keptCopyTag(uri) });

/**
 * The answer to one request of a sync down, or the reason to refuse it. An ending, `proxy://Finished` or
 * `proxy://Abort`, is answered 200 with nothing else, which is what Logitech's client writes for both.
 */
export function answerOf(
  request: RemoteRequest,
  mode: { readonly kind: 'unchanged' } | { readonly kind: 'set'; readonly set: PreparedSet },
): WrittenAnswer | { readonly refuse: string } {
  if (request.verb.toUpperCase() === 'POST' && (request.uri === FINISHED || request.uri === ABORT)) {
    return { uri: request.uri, statusCode: '200' } as WrittenAnswer;
  }
  if (request.verb.toLowerCase() !== 'get') {
    return { refuse: `the remote asked for a ${request.verb} of ${describe(request.uri)} during the sync, which no rule here answers` };
  }
  const tag = typeof request.etag === 'string' && request.etag.length > 0 ? request.etag : undefined;
  if (mode.kind === 'unchanged') {
    // A favourites document is asked for untagged in every sync through a computer, and a 304 makes the remote
    // keep its own copy, so it is answered 304 either way, the header.
    if (isFavourites(request.uri)) return keepTheRemotesCopy(request.uri, tag);
    // The 304 rule: only against a tag the remote sent. A request with none is a file the remote does not hold,
    // or one whose tag a change on its own screens erased, and nothing here tells the two apart, the header.
    // A picture's failure aborts nothing and the held ones were copied into the gathered set before the
    // asking, so an untagged picture is answered 404.
    if (tag === undefined && isPicture(request.uri)) return { statusCode: '404', uri: request.uri };
    if (tag === undefined) return { refuse: `the remote sent no tag for ${describe(request.uri)}, so it cannot be answered 304` };
    return { statusCode: '304', uri: request.uri, etag: tag };
  }
  const entry = mode.set.entries.get(keyOf(request.uri));
  if (entry === undefined) {
    // A picture's failure is logged and never aborts, and a favourites document the set lacks is the remote's
    // own to keep; any other document a sync asks for and the set lacks would abort the whole sync, so it is
    // ours to refuse. A picture the remote asks for with a tag is one it holds, and is answered 304 against
    // that tag as `unchanged` answers it, which is the answer a unit has committed, 6.7's second run; one
    // without a tag is answered 404.
    if (isPicture(request.uri) && tag !== undefined) return { statusCode: '304', uri: request.uri, etag: tag };
    if (isPicture(request.uri)) return { statusCode: '404', uri: request.uri };
    if (isFavourites(request.uri)) return keepTheRemotesCopy(request.uri, tag);
    return { refuse: `the set holds no answer for ${describe(request.uri)}` };
  }
  if (tag !== undefined && tag === entry.etag) return { statusCode: '304', uri: request.uri, etag: tag };
  return { statusCode: '200', uri: request.uri, 'body-type': entry['body-type'], etag: entry.etag, resource: entry.resource };
}

/** What kind of address this is, for a sentence: a configuration document by name, else the scheme. */
function describe(uri: string): string {
  const key = harmonyTouch.documentKeyOf(uri);
  if (key !== undefined && uri.startsWith('harmony://')) return key;
  if (uri.startsWith(harmonyTouch.CONTENT_USER)) return 'the user\'s favourites';
  if (uri.startsWith(harmonyTouch.CONTENT_DEVICE)) return 'a device\'s favourites';
  if (uri.startsWith(harmonyTouch.CONTENT_SERVICE)) return 'a provider\'s line up';
  if (isPicture(uri)) return 'a picture';
  if (uri === FINISHED || uri === ABORT) return uri;
  return `an address of scheme ${uri.split(':')[0] ?? '?'}`;
}

// ---------------------------------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------------------------------

/**
 * The lines a run reports, one per step, for a status band to read. Every line `syncTouch` reports matches
 * one, which `touch-sync.test.ts` holds; the script's header lists the same forms.
 */
export const SYNC_LINES: readonly RegExp[] = [
  /^sync: gate passed, \d+ answers, \d+ tags stated and \d+ ours$/,
  /^sync: unchanged, every document the remote hands up is written back to it with a tag of ours and committed, so that change never reaches Logitech's account; every document asked for is then answered 304 against its own tag, and every favourites document 304 so the remote keeps its own copy$/,
  /^sync: provisioned, mode \d+$/,
  /^sync: handing over the remote's changes$/,
  /^sync: hand over, request list \d+, \d+ answered$/,
  /^sync: hand over, request list \d+, empty$/,
  /^sync: kept .+ in the lab$/,
  /^sync: started$/,
  /^sync: request list \d+, \d+ answered$/,
  /^sync: request list \d+, empty$/,
  /^sync: finished$/,
  /^sync: aborted$/,
  /^sync: refused, .+$/,
  /^sync: recovery, .+$/,
];

export interface TouchSyncOptions {
  /** A session opened on the Touch, `openTouchRequestSession`; its rail and its unit check are its own. */
  readonly session: TouchRequestSession;
  readonly mode: TouchSyncMode;
  /** The lab folder every request, answer and handed up document is kept in; new or empty. */
  readonly folder: string;
  /** Each line of `SYNC_LINES` as it happens. */
  readonly report?: (line: string) => void;
  /** How long to wait after an empty request list before reading again, in milliseconds; 1000 when absent. */
  readonly pollMs?: number;
  /** How many empty request lists in a row end the run as a refusal; 300 when absent. */
  readonly maxEmptyLists?: number;
  /** How often one address may be handed out in the run before it refuses; `MAX_HAND_OUTS` when absent. */
  readonly maxHandOuts?: number;
}

export interface TouchSyncOutcome {
  readonly ending: 'finished' | 'aborted' | 'refused';
  /** Why, for a refusal. */
  readonly reason?: string;
  /** Whether anything that acts on the remote had been sent when the run ended. */
  readonly acted: boolean;
  /** The order of recovery steps, `RECOVERY`, for a refusal after the remote was acted on. */
  readonly recovery?: string;
  /** What an abort would cost at the point the run stopped, for the same refusals. */
  readonly abortCost?: string;
  /** How many request lists were read in the sync down, and how many answers written in it. */
  readonly lists: number;
  readonly answered: number;
  /** The keys of what the remote handed up, each kept in the lab before its answer. */
  readonly handedUp: readonly string[];
}

/** A refusal of ours, carried to the one place that turns it into an outcome. */
class Refusal extends Error {}

/** An answer's status, `errorCode` in the long form's object and `code` otherwise, as text. */
export function statusOf(text: string): string | undefined {
  const body = bodyOf(text);
  const code = body?.['errorCode'] ?? body?.['code'];
  return code === undefined || code === null ? undefined : String(code);
}

/** The JSON of an answer after its `Response,`, or undefined when it is not one. */
function bodyOf(text: string): Record<string, unknown> | undefined {
  if (!text.startsWith('Response,')) return undefined;
  try {
    const parsed = JSON.parse(text.slice('Response,'.length)) as unknown;
    return isObject(parsed) ? parsed as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

/** An answer's `result`, which the remote sends as an object or as text holding one. */
export function resultOf(text: string): Record<string, unknown> | undefined {
  const result = bodyOf(text)?.['result'];
  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result) as unknown;
      return isObject(parsed) ? parsed as Record<string, unknown> : undefined;
    } catch {
      return undefined;
    }
  }
  return isObject(result) ? result as Record<string, unknown> : undefined;
}

/** A name for a file of the folder: a number in order and what it is, with nothing of an address in it. */
const fileName = (n: number, what: string): string => `${String(n).padStart(3, '0')}-${what}`;

/**
 * Drive one sync down, from the gate to `proxy://Finished` or `proxy://Abort`, as the header lists. Never
 * throws for a refusal or for the remote failing to answer: every ending is an outcome, a refusal after the
 * remote was acted on naming `RECOVERY`. It throws only when the folder cannot be used, before anything is
 * sent.
 */
export async function syncTouch(options: TouchSyncOptions): Promise<TouchSyncOutcome> {
  const { session, folder } = options;
  const pollMs = options.pollMs ?? 1000;
  const maxEmpty = options.maxEmptyLists ?? 300;
  const maxHandOuts = options.maxHandOuts ?? MAX_HAND_OUTS;

  if (existsSync(folder) && readdirSync(folder).length > 0) {
    throw new Error(`the lab folder ${folder} already holds files, and a run never writes over another's`);
  }
  mkdirSync(join(folder, 'handed-up'), { recursive: true });
  const report = (line: string): void => {
    appendFileSync(join(folder, 'log.txt'), `${line}\n`);
    options.report?.(line);
  };

  let exchange = 0;
  let acted = false;
  let lists = 0;
  let answered = 0;
  const handedUp: string[] = [];
  /** Where the run is, for what an abort would cost when it stops: before the hand over, in it, or after it. */
  let stage: 'before' | 'hand over' | 'sync' = 'before';
  /** How often each address was handed out in this run, the second defence against a list repeated for ever. */
  const handOuts = new Map<string, number>();

  /** One request through the session, its line and its answer kept in the folder before anything else. */
  const ask = async (line: string, what: string): Promise<string> => {
    exchange += 1;
    writeFileSync(join(folder, fileName(exchange, `${what}-request.txt`)), line);
    const answer = await session.request(line);
    writeFileSync(join(folder, fileName(exchange, `${what}-answer.txt`)), answer.text);
    if (answer.announcement !== undefined) {
      writeFileSync(join(folder, fileName(exchange, `${what}-announcement-answer.txt`)), answer.announcement);
      if (statusOf(answer.announcement) !== '200') {
        throw new Refusal(`the remote answered the announcement of a write with status ${statusOf(answer.announcement) ?? 'none'}`);
      }
    }
    return answer.text;
  };

  /** Read one request list, with a session id of its own as Logitech's client uses, `api/proxy.md`. */
  const readList = async (): Promise<{ sessionId: string; requests: RemoteRequest[] }> => {
    const sessionId = randomUUID();
    const text = await ask(`${READ_LIST}&sessionId=${sessionId}`, 'request-list');
    const status = statusOf(text);
    if (status !== '200') throw new Refusal(`the remote answered a request list with status ${status ?? 'none'}`);
    const requests = resultOf(text)?.['requests'];
    if (!Array.isArray(requests) || !requests.every((r) => isObject(r) && typeof r.verb === 'string' && typeof r.uri === 'string')) {
      throw new Refusal('the remote answered a request list in a shape this answerer does not read');
    }
    return { sessionId, requests: requests as RemoteRequest[] };
  };

  /** Write one list's answers in one request, as Logitech's client does. */
  const writeAnswers = async (sessionId: string, answers: readonly WrittenAnswer[]): Promise<void> => {
    const responses = encodeURIComponent(JSON.stringify({ responses: answers }));
    const text = await ask(`${WRITE_ANSWERS}&sessionId=${sessionId}&responses=${responses}`, 'answers');
    const status = statusOf(text);
    // 200 whatever each answer's handling did; 598 for text that is not JSON and 500 when a handling raised,
    // `api/proxy.md` "`proxy.response`", either of which leaves this list's entries outstanding.
    if (status !== '200') throw new Refusal(`the remote answered a write of answers with status ${status ?? 'none'}`);
    // And a 200 is an answer only when it names the request, the header's first defence: the listener's reply
    // to a chunk it is still gathering is a 200 with no `mime`, and the write was then never acted on.
    if (bodyOf(text)?.['mime'] !== WRITE_ANSWERS) {
      throw new Refusal('the remote answered a write of answers with a reply that does not name the write, the reply '
        + 'it gives a write it is still gathering, so the answers were not taken');
    }
  };

  /**
   * Read lists until an ending, answering each with `answer`, in one phase. Returns the ending met. An empty
   * list is read again after `pollMs`, since one comes between the core documents and the favourites and
   * says nothing, `answering-a-sync.md` "How a sync aborts".
   */
  const phase = async (
    name: 'hand over' | 'sync',
    answer: (r: RemoteRequest) => Promise<WrittenAnswer | { refuse: string }>,
  ): Promise<'finished' | 'aborted'> => {
    let empty = 0;
    let n = 0;
    for (;;) {
      const { sessionId, requests } = await readList();
      n += 1;
      if (name === 'sync') lists += 1;
      const prefix = name === 'sync' ? 'sync: request list' : 'sync: hand over, request list';
      if (requests.length === 0) {
        report(`${prefix} ${n}, empty`);
        empty += 1;
        if (empty >= maxEmpty) throw new Refusal(`${empty} empty request lists in a row, and neither ending arrived`);
        if (pollMs > 0) await new Promise((resolve) => setTimeout(resolve, pollMs));
        continue;
      }
      empty = 0;
      // Count each address once per list it is handed out in, before anything of the list is answered.
      for (const uri of new Set(requests.map((r) => r.uri))) {
        const times = (handOuts.get(uri) ?? 0) + 1;
        handOuts.set(uri, times);
        if (times > maxHandOuts) {
          throw new Refusal(`the remote handed out ${describe(uri)} ${times} times in this run, more than the limit of `
            + `${maxHandOuts}, so its answers are not being taken`);
        }
      }
      const answers: WrittenAnswer[] = [];
      for (const r of requests) {
        const a = await answer(r);
        // A refusal writes none of this list's answers: the remote then holds the list outstanding, which is
        // what the recovery step clears.
        if ('refuse' in a) throw new Refusal(a.refuse);
        answers.push(a);
      }
      await writeAnswers(sessionId, answers);
      if (name === 'sync') answered += answers.length;
      report(`${prefix} ${n}, ${answers.length} answered`);
      if (requests.some((r) => r.uri === ABORT)) return 'aborted';
      if (requests.some((r) => r.uri === FINISHED)) return 'finished';
    }
  };

  /**
   * What an abort would cost where the run stands, the header's second recovery line. Inside the hand over it
   * is the handed up document's tag, whether or not its answer was written: before it, the abort empties the
   * outgoing queue the change waits in; after it, the change is already off that queue, and the screens never
   * sent the commit that would have kept our tag. Once the hand over ended, it was committed before
   * `proxy://Finished` was queued, so an abort in the sync costs no tag.
   */
  const costOfAnAbort = (): string => {
    const names = handedUp.map((k) => (k.includes(':') ? 'a favourites document' : k)).join(' and ');
    if (stage === 'hand over') {
      if (handedUp.length === 0) {
        return 'abort cost, if a change was waiting on the remote an abort now empties the queue it waits in, and '
          + 'that document keeps no tag; ask before aborting';
      }
      return `abort cost, ${names}: the change made to it on the remote stays there with no tag and is never handed up `
        + 'again, so a later --unchanged run refuses at it; ask before aborting';
    }
    if (handedUp.length > 0) {
      return `abort cost, none to a tag: the hand over committed ${names} under a tag of ours, and an abort now leaves `
        + 'the committed set as it is';
    }
    return 'abort cost, none to a tag: an abort now leaves the committed set as it is';
  };

  const end = (outcome: Omit<TouchSyncOutcome, 'acted' | 'lists' | 'answered' | 'handedUp'>): TouchSyncOutcome => {
    const whole = { ...outcome, acted, lists, answered, handedUp };
    if (outcome.ending === 'refused') {
      report(`sync: refused, ${outcome.reason ?? 'no reason given'}`);
      if (whole.recovery !== undefined) report(`sync: recovery, ${whole.recovery}`);
      if (whole.abortCost !== undefined) report(`sync: recovery, ${whole.abortCost}`);
    } else {
      report(`sync: ${outcome.ending}`);
    }
    writeFileSync(join(folder, 'outcome.json'), `${JSON.stringify(whole, null, 2)}\n`);
    return whole;
  };

  /**
   * A `put` of the remote's own: the document kept in the lab, raw and parsed, **before** its answer exists,
   * then answered 200 with the same document and a tag of ours, as Logitech's client wrote back the service's
   * echo of it. A document whose list the engine's reader walks is checked for that list first, and for every
   * type name the reader searches in it, `missing type`, `todo-touch.md` 6.7.1, so a reply of ours never hands
   * the remote a document it would raise on, even its own.
   */
  function keepAndEcho(r: RemoteRequest): WrittenAnswer | { refuse: string } {
    const key = keyOf(r.uri);
    const raw = r.resource as string;
    const n = handedUp.length + 1;
    const label = r.uri.startsWith('harmony://') ? key : describe(r.uri).replace(/[^A-Za-z0-9]+/g, '-');
    writeFileSync(join(folder, 'handed-up', fileName(n, `${label}.txt`)), raw);
    let document: unknown;
    try {
      document = JSON.parse(decodeURIComponent(raw.replace(/\+/g, ' ')));
    } catch {
      return { refuse: `the remote handed up ${describe(r.uri)} in a form this answerer cannot decode; it is kept in the lab as it came` };
    }
    writeFileSync(join(folder, 'handed-up', fileName(n, `${label}.json`)), `${JSON.stringify(document, null, 2)}\n`);
    handedUp.push(key);
    report(`sync: kept ${describe(r.uri)} in the lab`);
    if (!isObject(document)) return { refuse: `the remote handed up ${describe(r.uri)} as something other than a JSON object` };
    if (r.uri.startsWith('harmony://')) {
      // Every place the engine's load raises on, read off this one document, `readerRaises`: a list, a type
      // name, or since `todo-touch.md` 6.10 any other field the load computes with, keys by or lowers.
      let lists: number;
      try {
        lists = harmonyTouch.readerRaises({ [key]: document } as harmonyTouch.SyncDocuments).length;
      } catch {
        lists = 1;
      }
      if (lists > 0) return { refuse: `the remote handed up ${describe(r.uri)} without a list or a type name its own reader needs, or with a field it raises on, so it is not echoed` };
    }
    const answer = { 'body-type': 'application/json' as const, resource: document };
    return { statusCode: '200', uri: r.uri, ...answer, etag: ourTag(answer) };
  }

  // 1. The gate, before anything is sent.
  let prepared: PreparedSet | undefined;
  if (options.mode.kind === 'set') {
    const gate = prepareSet(options.mode.set);
    if ('refusals' in gate) {
      writeFileSync(join(folder, 'gate.txt'), `${gate.refusals.join('\n')}\n`);
      return end({ ending: 'refused', reason: `the gate found ${gate.refusals.length} reasons the set cannot be written, kept in gate.txt` });
    }
    prepared = gate.set;
    report(`sync: gate passed, ${prepared.entries.size} answers, ${prepared.tags.stated} tags stated and ${prepared.tags.ours} ours`);
  } else {
    report('sync: unchanged, every document the remote hands up is written back to it with a tag of ours and committed, '
      + 'so that change never reaches Logitech\'s account; every document asked for is then answered 304 against its own tag, '
      + 'and every favourites document 304 so the remote keeps its own copy');
  }
  const mode = prepared === undefined ? { kind: 'unchanged' as const } : { kind: 'set' as const, set: prepared };

  try {
    // 2. The provisioning read.
    const provisioning = await ask(PROVISIONING, 'provisioning');
    if (statusOf(provisioning) !== '200') throw new Refusal(`the provisioning read answered status ${statusOf(provisioning) ?? 'none'}`);
    const info = resultOf(provisioning);
    const modeNumber = Number(info?.['mode']);
    if (info === undefined || info['accountId'] === undefined || info['activeRemoteId'] === undefined || info['mode'] === undefined) {
      throw new Refusal('the remote is not provisioned: its provisioning states no account, remote number and mode, and a sync needs all three');
    }
    if (!SYNCING_MODES.includes(modeNumber)) {
      throw new Refusal(`the remote is provisioned in mode ${String(info['mode'])}, and a Touch syncs through a computer in mode 0 or 1 only`);
    }
    report(`sync: provisioned, mode ${modeNumber}`);

    // 3. The remote's own changes, handed up and kept before anything else.
    acted = true;
    stage = 'hand over';
    report('sync: handing over the remote\'s changes');
    const handOver = await ask(HAND_OVER, 'hand-over');
    if (statusOf(handOver) !== '200') throw new Refusal(`the hand over answered status ${statusOf(handOver) ?? 'none'}`);
    const handed = await phase('hand over', async (r) => {
      if (r.verb.toUpperCase() === 'POST' && (r.uri === FINISHED || r.uri === ABORT)) return answerOf(r, mode);
      if (r.verb.toLowerCase() !== 'put' || typeof r.resource !== 'string') {
        return { refuse: `the remote asked for a ${r.verb} of ${describe(r.uri)} while handing its changes up, which no rule here answers` };
      }
      return keepAndEcho(r);
    });
    if (handed === 'aborted') return end({ ending: 'aborted' });

    // The hand over ended at `proxy://Finished`, so it has committed: an abort from here on costs no tag.
    stage = 'sync';
    // A change the remote handed up to a document the set also holds would be overwritten by the set's copy
    // at the commit, the change made on the remote reverted, which is the trap `todo-touch.md` 6.8's set is
    // built around. So stop here, before the sync request: the change is kept in the lab and committed on the
    // remote under a tag of ours, no sync is marked running, and the set is rebuilt from what was handed up.
    if (prepared !== undefined) {
      const clashing = handedUp.filter((k) => prepared.entries.has(k) || favouritesClash(k, prepared));
      if (clashing.length > 0) {
        throw new Refusal(`the remote handed up ${clashing.map((k) => (k.includes(':') ? 'a favourites document' : k)).join(' and ')}, `
          + 'which the set also holds, so answering the set would revert the change made on the remote; the change is kept '
          + 'in the lab and committed on the remote, so rebuild the set from it');
      }
    }

    // 4. The sync.
    const started = await ask(SYNC, 'sync');
    const status = statusOf(started);
    if (status === '202') throw new Refusal('the remote answered the sync request 202, a sync is already marked running');
    if (status !== '200') throw new Refusal(`the sync request answered status ${status ?? 'none'}`);
    report('sync: started');
    const ending = await phase('sync', async (r) => answerOf(r, mode));
    return end({ ending });
  } catch (error: unknown) {
    const reason = error instanceof Refusal ? error.message
      : `the run stopped on an error: ${error instanceof Error ? error.message : String(error)}`;
    return end(acted ? { ending: 'refused', reason, recovery: RECOVERY, abortCost: costOfAnAbort() } : { ending: 'refused', reason });
  }
}

// ---------------------------------------------------------------------------------------------------
// The whole run, from the flags to the closed transport, `todo.md` 7.3.10
// ---------------------------------------------------------------------------------------------------

/**
 * Throws unless a sync may be driven: `HARMONY_ENABLE_WRITES=1` and `HARMONY_TOUCH_REQUESTS=1` set, and
 * `HARMONY_TOUCH_RECOVERY` not.
 *
 * **Why the recovery flag refuses**: a session driving a sync has no reason to hold the recovery door,
 * `TOUCH_RECOVERY_DOOR` in `rails.ts`, and the recovery steps are a person's, one per run of
 * `packages/usb/bin/touch-recover.ts`; a sync run with that door open could reach the abort, the delete or the
 * restart through a bug of ours. These two checks were the script's until 7.3.10 moved them here, where an
 * application meets them too; the request rail under the session still checks the two flags on every line.
 * The words are the script's, which its tests read.
 */
export function assertTouchSyncAllowed(): void {
  if (!WRITES_ENABLED || !TOUCH_REQUEST_DOOR) {
    throw new RailError('--commit needs HARMONY_ENABLE_WRITES=1 and HARMONY_TOUCH_REQUESTS=1');
  }
  if (TOUCH_RECOVERY_DOOR) {
    throw new RailError('--commit refuses with HARMONY_TOUCH_RECOVERY set: a sync has no use for the recovery door, '
      + 'and the recovery steps are run by hand, one per run of touch-recover.ts');
  }
}

/**
 * **The Harmony Touches that may be synced, and no others**, decision 29: the one bench unit, by the label of its
 * record. `answerTouchSync` refuses any other label before it opens anything, `todo.md` 7.3.10's review, so the
 * list is the library's and not a caller's; the script's label is this one.
 */
export const TOUCH_SYNC_UNITS = ['touch'] as const;

/** What `answerTouchSync` needs: what `syncTouch` takes but the session, which it opens itself. */
export interface TouchSyncRun extends Omit<TouchSyncOptions, 'session'> {
  /** The label of the unit's record; refused unless it is one of `TOUCH_SYNC_UNITS`. */
  readonly label: string;
  /** That record: the identity the session compares the Touch on the cable with. */
  readonly permittedUnit: Uint8Array;
  /** Open the Touch, `openFileBasedRemote` for the script; called once the flags have passed. */
  open(): Promise<Transport>;
  /** The session's own lines, one per request and the identity read, which do not start with `sync:`. */
  readonly log?: (line: string) => void;
}

/**
 * Answer one sync of a Harmony Touch, from the flags to the closed transport: the library half of
 * `bin/touch-sync.ts`'s `--commit`, `todo.md` 7.3.10.
 *
 * In order: `assertTouchSyncAllowed` and the label against `TOUCH_SYNC_UNITS`, before anything is opened; `open`; a
 * session, which reads the identity file and refuses any unit but `permittedUnit`, `openTouchRequestSession`;
 * `syncTouch`, which runs the gate before anything is sent and answers the sync as this file's header lists; and
 * the transport closed, whatever happened. Resolves with the outcome, as `syncTouch` does; throws only when the
 * flags or the label refuse, the open or the session fails, or the folder cannot be used, each before anything that acts on the
 * remote is sent.
 */
export async function answerTouchSync(run: TouchSyncRun): Promise<TouchSyncOutcome> {
  assertTouchSyncAllowed();
  const { open, permittedUnit, log, label, ...options } = run;
  if (!(TOUCH_SYNC_UNITS as readonly string[]).includes(label)) {
    throw new RailError(`${label} is not a Harmony Touch this may sync: the units are the library's, `
      + `${TOUCH_SYNC_UNITS.join(', ')}, decision 29. Refusing before anything is opened.`);
  }
  const transport = await open();
  try {
    const session = await openTouchRequestSession(transport, { permittedUnit, ...(log === undefined ? {} : { log }) });
    return await syncTouch({ ...options, session });
  } finally {
    await transport.close();
  }
}
