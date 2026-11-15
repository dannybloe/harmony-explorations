/**
 * One sync of a document to an attached Harmony Touch, against the pretend Touch of the request channel's tests, for
 * `sync-attached-touch.test.ts`.
 *
 * **Why a file of its own.** The rails read their flags once, when `rails.ts` loads, so a run that commits is a process
 * of its own with the two request flags set, as `touch-answer-run.ts` and `sync-attached-run.ts` are. This file is that
 * process and, imported, the same run in the test's process for everything that opens nothing.
 *
 * **Nothing here touches a device.** The remote is `FakeTouchRemote` behind the guard `openFileBasedRemote` returns,
 * handed in through the keeper's `open`, answering each request line as the scenario says; the session over it is the
 * real one, with its unit check against a record made from the fake's serial. No lab and no real account: the document
 * is the Harmony Touch's reference recipe, which carries its devices' definitions, the account John Doe's, invented, with
 * a household address on the same domain that resolves nowhere, and the addresses are made up in the shape the
 * answerer's own tests use.
 *
 * Not a test file itself, so the runner does not pick it up.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { recipe, type Recipe } from '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';
import { unitIdentityFromSerial, type FoundRemote, type HarmonyRemote } from '@harmony/usb';
import { guardFileProtocol } from '@harmony/usb/internal';
import { FakeTouchRemote } from '@harmony/testkit/fake-touch-remote';

import { HAND_OVER, PROVISIONING, READ_LIST, SYNC, WRITE_ANSWERS, type RemoteRequest, type TouchSet } from '../../src/touchsync.ts';
import { syncDocument, type RemoteKeeper, type SyncEvent, type SyncOutcome } from '../../src/write.ts';
import { SERIAL, sysinfoText } from '../touch/touch-sync-run.ts';

const REFERENCES = new URL('../../../codec/test/references/', import.meta.url);
const JOHN_DOE = JSON.parse(readFileSync(new URL('john-doe-account.json', REFERENCES), 'utf8')) as { context: Record<string, unknown> };
/** John Doe with a household address, which the gate asks of a Context: `sync-contract.test.ts` says why. */
export const ACCOUNT = { ...JOHN_DOE, context: { ...JOHN_DOE.context, HouseholdUserProfileUri: 'https://example.invalid/john-doe/household' } };

/** Made up addresses, in the shape the answerer's tests use, one per configuration document. */
export const ADDRESSES: Readonly<Record<string, string>> = {
  ActivityList: 'harmony://Account/1/ActivityList',
  DeviceList: 'harmony://Account/1/DeviceList',
  MapList: 'harmony://Account/1/MapList?excludeFunctionMaps=true',
  Context: 'harmony://Account/1/Remote/2/Context',
  Settings: 'harmony://Account/1/Remote/2/Settings',
  ProtocolList: 'harmony://Account/1/ProtocolList',
};

/** The Touch's product id and its release word, BCD 1000 and skin 99; a Harmony One's, skin 54. */
const TOUCH_PRODUCT = 0xc12b;
const TOUCH_RELEASE = 0x1099;
const ONE_RELEASE = 0x1054;

export interface TouchScenario {
  readonly commit?: boolean;
  /** Which document: the Harmony Touch's reference recipe, the default, or the empty Harmony One. */
  readonly document?: 'touch' | 'one';
  /** What the remote enumerates as: a Touch, the default, or a Harmony One. */
  readonly remote?: 'touch' | 'one';
  /** Which kind of keeper: the document keeper, the default, or a compiled one. */
  readonly keeper?: 'document' | 'compiled';
  /** The unit label the keeper names; the library's one Touch unless given. */
  readonly label?: string;
  /** Leave the address of this document out of the keeper's. */
  readonly withoutAddress?: string;
  /** Build with no account. */
  readonly noAccount?: boolean;
  /** The folder the keeper makes already holds a file. */
  readonly folderTaken?: boolean;
  /** The serial the keeper's record was made from; the fake's own when absent. */
  readonly recordSerial?: string;
  /** The provisioning read's `result`; a provisioned Touch in mode 0 when absent. */
  readonly provisioning?: unknown;
  /** The request lists of the sync down; the six documents, the two pictures and the finish when absent. */
  readonly sync?: readonly (readonly RemoteRequest[])[];
  /** Ask for a stop: before the sync starts, or at the event that enters a phase. */
  readonly stopAt?: 'start' | 'build' | 'hand-over';
  /** The observer throws on every event. */
  readonly observerThrows?: boolean;
  /** The text the pretend Touch's `/tde/powerstate` serves; its own default, `usb` and a newline, when absent. */
  readonly powerstate?: string;
  /** The remote does not answer when it is opened, with these words. */
  readonly openFails?: string;
  /** The remote answers the hand over's request list with status 500, once the hand over has begun. */
  readonly handOverFails?: boolean;
  /** The keeper cannot make the run's folder, and says so in these words. */
  readonly folderFails?: string;
  /** The keeper cannot keep the set it is handed, and says so in these words. */
  readonly keepFails?: string;
  /** The Touch's document gives two keys of its first device a double press, which no key of a Touch has: two problems of its check. */
  readonly doubleKeys?: boolean;
  /** The Touch's document gives the volume keys of its first device's own map a command when held, which the Touch builds. */
  readonly heldKeys?: boolean;
}

export interface TouchRun {
  /** The events as short words, in order. */
  readonly words: string[];
  readonly outcome: SyncOutcome;
  /** Every journal line, in order. */
  readonly journal: string[];
  /** Every line written into `/sys/hlapi` but the announcements, by its request's name. */
  readonly written: string[];
  /** Every answer written, in order, by address, status and tag. */
  readonly answers: { readonly uri: string; readonly statusCode: string; readonly etag?: string; readonly resource?: unknown }[];
  /** The sets the keeper was handed, in order, and how often it made a folder and opened the remote. */
  readonly kept: TouchSet[];
  readonly folders: number;
  readonly opened: number;
  readonly closed: boolean;
  /** Every open the pretend Touch was sent, path and mode, in order, by its own record. */
  readonly openedPaths: string[];
}

const OK = (mime: string, result: unknown = null): string =>
  `Response,${JSON.stringify({ errorMessage: 'OK', mime, result, errorCode: '200' })}`;
/** The listener's reply to an announcement: no `mime`. */
const GATHERING = 'Response,{"result":null,"errorCode":200}';
const listAnswer = (requests: readonly RemoteRequest[]): string => OK(READ_LIST, JSON.stringify({ requests }));

/** The sync down a Touch holding none of the set asks: the six untagged, our two pictures untagged, then the finish. */
export function defaultSync(): RemoteRequest[][] {
  const background = harmonyTouch.ourBackground();
  return [
    harmonyTouch.CONFIGURATION_DOCUMENTS.map((d) => ({ verb: 'GET', uri: ADDRESSES[d]! })),
    [{ verb: 'GET', uri: background.addresses.picture }, { verb: 'GET', uri: background.addresses.twin }],
    [{ verb: 'POST', uri: 'proxy://Finished' }],
  ];
}

const words = (events: readonly SyncEvent[]): string[] => events.map((event) => (event.kind === 'phase' ? event.phase
  : event.kind === 'progress' ? `${event.phase} ${event.done}/${event.total}`
    : event.kind === 'attention' ? `! ${event.attention}` : `= ${event.outcome.result}`));

/**
 * The Harmony Touch's reference document with two keys of its first device's own map given a double press, which no key
 * of a Touch has, only its gestures: its check refuses each once, as a press the key does not have, two problems.
 */
export function doubleKeysTouchDocument(): Recipe {
  const json = JSON.parse(readFileSync(new URL('touch-test.json', REFERENCES), 'utf8')) as { devices: { keys?: unknown[] }[] };
  json.devices[0]!.keys = [
    { key: 'VolumeUp', press: 'double', action: { nothing: true } },
    { key: 'VolumeDown', press: 'double', action: { nothing: true } },
  ];
  return recipe.open(json);
}

/**
 * The Harmony Touch's reference document with the two volume keys of its first device's own map given a command when
 * held, the device's Mute: a press those keys have on a Touch, which its check passes and its build writes.
 */
export function heldKeysTouchDocument(): Recipe {
  const json = JSON.parse(readFileSync(new URL('touch-test.json', REFERENCES), 'utf8')) as { devices: { name: string; keys?: unknown[] }[] };
  const first = json.devices[0]!;
  first.keys = [
    ...(first.keys ?? []),
    { key: 'VolumeUp', press: 'held', action: { device: first.name, command: 'Mute' } },
    { key: 'VolumeDown', press: 'held', action: { device: first.name, command: 'Mute' } },
  ];
  return recipe.open(json);
}

export async function runTouchSync(scenario: TouchScenario): Promise<TouchRun> {
  const document: Recipe = scenario.document === 'one'
    ? recipe.create({ name: 'Harmony One', skin: 54 })
    : scenario.doubleKeys === true ? doubleKeysTouchDocument()
      : scenario.heldKeys === true ? heldKeysTouchDocument()
        : recipe.open(JSON.parse(readFileSync(new URL('touch-test.json', REFERENCES), 'utf8')));

  const handOver = [listAnswer([{ verb: 'POST', uri: 'proxy://Finished' }])];
  const sync = (scenario.sync ?? defaultSync()).map(listAnswer);
  let started = false;
  const remote = new FakeTouchRemote({
    sysinfo: sysinfoText(),
    ...(scenario.powerstate === undefined ? {} : { powerstate: scenario.powerstate }),
    answer: (line: string): string => {
      if (line.startsWith('Content-Length: ')) return GATHERING;
      if (line === PROVISIONING) return OK(PROVISIONING, scenario.provisioning ?? { accountId: '1', activeRemoteId: 2, mode: 0, se: true });
      if (line === HAND_OVER) return OK(HAND_OVER);
      if (line === SYNC) {
        started = true;
        return OK(SYNC);
      }
      if (line.startsWith(READ_LIST)) {
        if (!started && scenario.handOverFails === true) return 'Response,{"errorCode":"500"}';
        return (started ? sync : handOver).shift() ?? listAnswer([]);
      }
      if (line.startsWith(WRITE_ANSWERS)) return OK(WRITE_ANSWERS);
      return 'Response,{"errorCode":"404"}';
    },
  });
  let closed = false;
  remote.close = async (): Promise<void> => { closed = true; };

  const base = mkdtempSync(join(tmpdir(), 'sync-attached-touch-'));
  const kept: TouchSet[] = [];
  let folders = 0;
  let opened = 0;
  const addresses = Object.fromEntries(Object.entries(ADDRESSES).filter(([d]) => d !== scenario.withoutAddress));
  const keeper: RemoteKeeper = scenario.keeper === 'compiled'
    ? {
      kind: 'compiled',
      units: [{ label: 'one_spare', regions: new Set(['held']) }],
      records: { text: () => undefined, where: (label) => `units/${label}.txt` },
      region: { name: 'held', bytes: new Uint8Array(0) },
      keep: () => { throw new Error('a compiled keeper was asked to keep a configuration'); },
      open: async () => {
        opened += 1;
        return { remote: undefined as unknown as HarmonyRemote, productId: 0xc121 };
      },
    }
    : {
      kind: 'document',
      label: scenario.label ?? 'touch',
      permittedUnit: unitIdentityFromSerial(scenario.recordSerial ?? SERIAL),
      addresses,
      folder: () => {
        if (scenario.folderFails !== undefined) throw new Error(scenario.folderFails);
        folders += 1;
        const folder = join(base, 'run');
        if (scenario.folderTaken === true) {
          mkdirSync(folder);
          writeFileSync(join(folder, 'outcome.json'), '{}');
        }
        return folder;
      },
      keep: (set) => {
        if (scenario.keepFails !== undefined) throw new Error(scenario.keepFails);
        kept.push(set);
      },
      open: async () => {
        opened += 1;
        if (scenario.openFails !== undefined) throw new Error(scenario.openFails);
        return guardFileProtocol(remote, TOUCH_PRODUCT);
      },
    };
  const found: FoundRemote = {
    vendorId: 0x046d, productId: scenario.remote === 'one' ? 0xc121 : TOUCH_PRODUCT, path: undefined, product: 'Harmony Remote',
    manufacturer: 'Logitech', release: scenario.remote === 'one' ? ONE_RELEASE : TOUCH_RELEASE,
  };

  const events: SyncEvent[] = [];
  const journal: string[] = [];
  const stop = new AbortController();
  if (scenario.stopAt === 'start') stop.abort();
  let outcome: SyncOutcome;
  try {
    outcome = await syncDocument({
      document,
      remote: { kind: 'attached', found, keeper },
      sources: { builtAt: '2026-11-14T10:00:00', ...(scenario.noAccount === true ? {} : { account: ACCOUNT as never }) },
      commit: scenario.commit ?? false,
      onEvent: (event) => {
        events.push(event);
        if (event.kind === 'phase' && event.phase === scenario.stopAt) stop.abort();
        if (scenario.observerThrows === true) throw new Error('the screen failed');
      },
      journal: (line) => journal.push(line),
      stop: stop.signal,
    });
  } finally {
    rmSync(base, { recursive: true, force: true });
  }

  const written = remote.lines.filter((line) => !line.startsWith('Content-Length: ')).map((line) => line.split('&')[0]!);
  const answers = remote.lines.filter((line) => line.startsWith(WRITE_ANSWERS))
    .flatMap((line) => (JSON.parse(decodeURIComponent(line.split('&responses=')[1]!)) as { responses: TouchRun['answers'] }).responses);
  return { words: words(events), outcome, journal, written, answers, kept, folders, opened, closed, openedPaths: remote.opened };
}

/**
 * One run in a process of its own with the two request flags set and the recovery flag unset, which is how a test
 * commits: the rails read the flags once, as they load, so the test's own process, which has neither, cannot.
 */
export function runTouchSyncCommitted(scenario: TouchScenario): TouchRun {
  return runTouchSyncCommittedAll([scenario])[0]!;
}

/**
 * Several runs in one process of their own with the two request flags set, one after another, each with its own stand
 * in, folder and keeper, so a test that commits many pays for one process rather than one per run.
 */
export function runTouchSyncCommittedAll(scenarios: readonly TouchScenario[]): TouchRun[] {
  const out = execFileSync(process.execPath, [fileURLToPath(import.meta.url)], {
    input: JSON.stringify(scenarios),
    env: { ...process.env, HARMONY_ENABLE_WRITES: '1', HARMONY_TOUCH_REQUESTS: '1', HARMONY_TOUCH_RECOVERY: '' },
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  return JSON.parse(out) as TouchRun[];
}

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  // A list of scenarios is run one after another and answered as a list; one scenario alone, as itself.
  const asked = JSON.parse(Buffer.concat(chunks).toString('utf8')) as TouchScenario | TouchScenario[];
  if (!Array.isArray(asked)) {
    process.stdout.write(JSON.stringify(await runTouchSync(asked)));
    return;
  }
  const runs: TouchRun[] = [];
  for (const scenario of asked) runs.push(await runTouchSync(scenario));
  process.stdout.write(JSON.stringify(runs));
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
}
