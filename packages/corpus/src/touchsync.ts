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
 * codec's, `packages/codec/src/harmony-touch/`. The codec depends on `packages/usb`, so `packages/usb` cannot
 * import the codec, and an answerer there could only take the check as an argument: a gate a caller hands in
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
 *    this request on the remote has been acted on, so every refusal after it names the recovery step.
 * 4. **The sync started**, `SYNC`, and every list answered from the set until `proxy://Finished` or
 *    `proxy://Abort`, answered as Logitech's client answers both, a status of 200 and nothing else.
 *
 * **How an entry is answered**, `answerOf`:
 *
 * * **a document** with 200, its tag and the object itself, never a string of JSON; **304 when the remote
 *   sent a tag equal to the set's**, echoing it, and never to a request that carried no tag, "The entity tag
 *   an answerer sends"
 * * **a picture the set lacks** with 404, which the remote logs and never aborts on, and **the user's own
 *   favourites document** the same, the one favourites document whose 404 is allowed, "What the remote checks
 *   of an answer"; any other document the set lacks is a refusal of ours
 * * **in `unchanged` mode**, every document, favourites document and picture with 304 against the tag the
 *   remote sent, and a refusal for one it sent no tag for, since a 304 there tells the remote to copy a file
 *   it does not hold and leaves the document missing from the new set
 *
 * **A write of answers is announced with the whole line's length**, which is the session's default,
 * `TouchAnnouncement` in `touchsession.ts`: the remote's listener counts the line from the request's name on,
 * so that is the number it reaches exactly on the last chunk. Logitech's client announces the `responses`
 * argument alone and can be acted on one chunk early; the session is opened by the caller, and the script
 * opens it with the default.
 *
 * **A refusal mid sync stops and says so**, naming `RECOVERY`, rather than sending anything else: the request
 * rail carries no abort for a session driving a sync, on purpose, `TOUCH_RECOVERY_DOOR` in `rails.ts`, so a
 * person runs the recovery step after reading why. A sync stopped before its commit leaves the committed set
 * untouched, `reference/architectures/harmony-touch/firmware.md` "A sync that stops halfway".
 *
 * **Everything goes to the lab folder the caller names**: every request line and every answer, one file
 * each, a log of the lines above, and what the remote handed up, under `handed-up/`, written before the
 * answer that takes it. The folder has to be new or empty, so a run never writes over another's.
 *
 * Nothing in this file has been run against a remote.
 */
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { harmonyTouch } from '@harmony/codec';
import { TOUCH_READ_REQUESTS, TOUCH_SYNC_REQUESTS } from '@harmony/usb';
import type { TouchRequestSession } from '@harmony/usb/touchsession';

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

/** The step a person runs after a refusal of ours once the remote has been acted on. */
export const RECOVERY = 'node packages/usb/bin/touch-recover.ts --step abort';

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
 * of Logitech's tags and still says whose it is: theirs are random identifiers, version 4.
 */
export function ourTag(answer: Pick<SetAnswer, 'body-type' | 'resource'>): string {
  const body = answer['body-type'] === 'application/json' ? JSON.stringify(answer.resource) : String(answer.resource);
  const hex = createHash('sha256').update(`${answer['body-type']}\n${body}`).digest('hex').slice(0, 32).split('');
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
 * two answers share a key.
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
    return { refusals: findings.map((f) => `${f.document}${f.path === '' ? '' : `.${f.path}`}: ${f.message} (${f.rule})`) };
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

/** The one favourites document a 404 is allowed for, the user's own, `answering-a-sync.md`. */
const isUserFavourites = (uri: string): boolean => uri.startsWith(harmonyTouch.CONTENT_USER);

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
    // The 304 rule: only against a tag the remote sent, since a 304 to a request with none tells it to copy a
    // file it does not hold.
    if (tag === undefined) return { refuse: `the remote sent no tag for ${describe(request.uri)}, so it cannot be answered 304` };
    return { statusCode: '304', uri: request.uri, etag: tag };
  }
  const entry = mode.set.entries.get(keyOf(request.uri));
  if (entry === undefined) {
    // A picture's failure is logged and never aborts, and the user's own favourites may be answered 404; any
    // other document a sync asks for and the set lacks would abort the whole sync, so it is ours to refuse.
    if (isPicture(request.uri) || isUserFavourites(request.uri)) return { statusCode: '404', uri: request.uri };
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
  /^sync: unchanged, every document answered 304 against its own tag$/,
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
}

export interface TouchSyncOutcome {
  readonly ending: 'finished' | 'aborted' | 'refused';
  /** Why, for a refusal. */
  readonly reason?: string;
  /** Whether anything that acts on the remote had been sent when the run ended. */
  readonly acted: boolean;
  /** The recovery step to run, for a refusal after the remote was acted on. */
  readonly recovery?: string;
  /** How many request lists were read in the sync down, and how many answers written in it. */
  readonly lists: number;
  readonly answered: number;
  /** The keys of what the remote handed up, each kept in the lab before its answer. */
  readonly handedUp: readonly string[];
}

/** A refusal of ours, carried to the one place that turns it into an outcome. */
class Refusal extends Error {}

/** An answer's status, `errorCode` in the long form's object and `code` otherwise, as text. */
function statusOf(text: string): string | undefined {
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
function resultOf(text: string): Record<string, unknown> | undefined {
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

  const end = (outcome: Omit<TouchSyncOutcome, 'acted' | 'lists' | 'answered' | 'handedUp'>): TouchSyncOutcome => {
    const whole = { ...outcome, acted, lists, answered, handedUp };
    if (outcome.ending === 'refused') {
      report(`sync: refused, ${outcome.reason ?? 'no reason given'}`);
      if (whole.recovery !== undefined) report(`sync: recovery, ${whole.recovery}`);
    } else {
      report(`sync: ${outcome.ending}`);
    }
    writeFileSync(join(folder, 'outcome.json'), `${JSON.stringify(whole, null, 2)}\n`);
    return whole;
  };

  /**
   * A `put` of the remote's own: the document kept in the lab, raw and parsed, **before** its answer exists,
   * then answered 200 with the same document and a tag of ours, as Logitech's client wrote back the service's
   * echo of it. A document whose list the engine's reader walks is checked for that list first, so a reply of
   * ours never hands the remote a document it would raise on, even its own.
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
      let lists: number;
      try {
        lists = harmonyTouch.checkConfiguration(harmonyTouch.readConfiguration({ [key]: document } as harmonyTouch.SyncDocuments))
          .filter((f) => f.rule === 'missing list').length;
      } catch {
        lists = 1;
      }
      if (lists > 0) return { refuse: `the remote handed up ${describe(r.uri)} without a list its own reader walks, so it is not echoed` };
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
    report('sync: unchanged, every document answered 304 against its own tag');
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
    return end(acted ? { ending: 'refused', reason, recovery: RECOVERY } : { ending: 'refused', reason });
  }
}
