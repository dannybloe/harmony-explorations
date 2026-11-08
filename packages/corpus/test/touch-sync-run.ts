/**
 * One run of the answerer against the fake Touch, in a process of its own, for `touch-sync.test.ts`.
 *
 * **Why a process of its own.** The rail reads its flags once, when `rails.ts` loads, and a test process runs
 * with writes disabled, which other tests rely on. So the test starts this file with the two request flags
 * set, `HARMONY_ENABLE_WRITES` and `HARMONY_TOUCH_REQUESTS`, hands it a scenario as JSON on standard input,
 * and reads back what happened as JSON on standard output: the outcome, every line the answerer reported,
 * every line the fake remote was written, with the answers of each write of answers decoded, and whether each
 * document the remote handed up was in the lab before the write that answered it.
 *
 * **Nothing here touches a device.** The remote is `FakeTouchRemote`, answering each request line with what
 * the scenario says, behind the same guard `openFileBasedRemote` returns, through a real session.
 *
 * **One rule of the remote's is modelled rather than scripted**: an answer to a favourites request that the
 * engine refuses, one with no tag, or a status from 400 up but the user's own 404, aborts the sync, so the
 * next request list holds `proxy://Abort` whatever the scenario says, and the write is still answered 200, as
 * the remote answers every write it can decode, `tests/test_harmony_touch_favourites_untagged.py`. That is what
 * makes an answerer that writes such an answer end `aborted` here, as it would on a remote.
 *
 * Not a test file itself, so the runner does not pick it up.
 */
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { unitIdentityFromSerial } from '@harmony/usb';
import { guardFileProtocol } from '@harmony/usb/internal';
import { openTouchRequestSession } from '@harmony/usb/touchsession';
import { FakeTouchRemote } from '@harmony/testkit/fake-touch-remote';
import { answersWritten, commands, records, sessions, text } from '@harmony/testkit/touch-recording';

import { HAND_OVER, PROVISIONING, READ_LIST, SYNC, WRITE_ANSWERS, syncTouch, type RemoteRequest, type TouchSyncMode } from '../src/touchsync.ts';

/** A made up serial, as `touchsession.test.ts` uses. */
export const SERIAL = '20000101000000-424242';

export function sysinfoText(): string {
  return [
    'arch 0x11', 'skin 0x63', 'usb_vendor_id 0x046d', 'usb_product_id 0xc12b', 'fw_ver 4.15.330', 'fw_type 0x00',
    'hw_ver 01.00', 'link_hw usb', 'link_type hid', 'link_packet_length 64', `serial_number ${SERIAL}`, 'status normal',
  ].join('\n');
}

/** What a test asks for: the mode, and what the fake answers each request with. */
export interface Scenario {
  readonly mode: TouchSyncMode;
  /** The provisioning read's `result`; a provisioned Touch in mode 0 when absent. */
  readonly provisioning?: unknown;
  /** The status the sync request answers; 200 when absent. */
  readonly syncStatus?: number;
  /** The request lists of the hand over, in order; one list holding `proxy://Finished` when absent. */
  readonly handOver?: readonly (readonly RemoteRequest[])[];
  /** The request lists of the sync down, in order, as lists of requests. */
  readonly sync?: readonly (readonly RemoteRequest[])[];
  /** Instead of `sync`: a recording whose request list answers are served as recorded, in order. */
  readonly replay?: string;
  /**
   * `gathering`: every write of answers is answered with the reply the remote's listener gives a write it is
   * still gathering, a status of 200 and no `mime`, the same as its reply to an announcement. A real answer,
   * naming the write in `mime`, when absent.
   */
  readonly writeReply?: 'gathering';
}

const OK = (mime: string, result: unknown = null): string =>
  `Response,${JSON.stringify({ errorMessage: 'OK', mime, result, errorCode: '200' })}`;

/** The listener's reply to an announcement, and to a chunk of a write it is still gathering: no `mime`. */
const GATHERING = 'Response,{"result":null,"errorCode":200}';

const listAnswer = (requests: readonly RemoteRequest[]): string => OK(READ_LIST, JSON.stringify({ requests }));

/** What the fake remote wrote back for each request list of a recording's sync down, as recorded. */
function recordedListAnswers(fixture: string): string[] {
  const hlapi = sessions(commands(records(fixture))).filter((s) => s.path === '/sys/hlapi');
  const out: string[] = [];
  let started = false;
  for (let i = 0; i + 1 < hlapi.length; i += 1) {
    const line = text(hlapi[i]!.written);
    if (hlapi[i]!.mode !== 'W') continue;
    if (line === SYNC) started = true;
    if (started && line.startsWith(READ_LIST)) out.push(text(hlapi[i + 1]!.read));
  }
  return out;
}

/** The answers a recording's client wrote in its sync down, the set a replay answers from. */
export function recordedSyncAnswers(fixture: string): ReturnType<typeof answersWritten> {
  const hlapi = sessions(commands(records(fixture))).filter((s) => s.path === '/sys/hlapi');
  const at = hlapi.findIndex((s) => s.mode === 'W' && text(s.written) === SYNC);
  return answersWritten(hlapi.slice(at));
}

/** One answer of a write, the fields the remote's engine checks first. */
interface Written {
  readonly uri: string;
  readonly statusCode?: string;
  readonly etag?: string | null;
}

/**
 * Whether the remote's engine would abort the sync over this answer: a favourites answer with no tag fails the
 * content callback, and one with a status from 400 up fails the status check, the user's own 404 apart.
 * Pictures and the configuration documents are left to the scenario.
 */
export function refusedByTheEngine(a: Written): boolean {
  if (!a.uri.startsWith('content://')) return false;
  // The callback tests the field's presence alone, before it turns an empty or null tag into none.
  if (a.etag === undefined) return true;
  const status = a.statusCode ?? '';
  if (status === '404' && a.uri.startsWith('content://1.0/user')) return false;
  return status >= '400' && status < '600';
}

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const scenario = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Scenario;

  const handOver = [...(scenario.handOver ?? [[{ verb: 'POST', uri: 'proxy://Finished' }]])].map(listAnswer);
  const sync = scenario.replay !== undefined ? recordedListAnswers(scenario.replay) : (scenario.sync ?? []).map(listAnswer);
  let started = false;
  // Set by a write of answers the remote's engine would refuse, `refusedByTheEngine`; the next list is the abort.
  let aborting = false;
  const folder = join(mkdtempSync(join(tmpdir(), 'touch-sync-')), 'run');
  // Whether the hand up folder held a document when each write of answers arrived, in order.
  const keptAtWrite: number[] = [];

  const remote = new FakeTouchRemote({
    sysinfo: sysinfoText(),
    answer: (line: string): string => {
      if (line.startsWith('Content-Length: ')) return GATHERING;
      if (line === PROVISIONING) {
        return OK(PROVISIONING, scenario.provisioning ?? { accountId: '1', activeRemoteId: 2, mode: 0, se: true });
      }
      if (line === HAND_OVER) return OK(HAND_OVER);
      if (line === SYNC) {
        started = true;
        return `Response,${JSON.stringify({ errorMessage: 'OK', mime: SYNC, result: null, errorCode: String(scenario.syncStatus ?? 200) })}`;
      }
      if (line.startsWith(READ_LIST)) {
        if (aborting) {
          aborting = false;
          return listAnswer([{ verb: 'POST', uri: 'proxy://Abort' }]);
        }
        const next = (started ? sync : handOver).shift();
        return next ?? listAnswer([]);
      }
      if (line.startsWith(WRITE_ANSWERS)) {
        const written = (JSON.parse(decodeURIComponent(line.split('&responses=')[1]!)) as { responses: Written[] }).responses;
        if (written.some(refusedByTheEngine)) aborting = true;
        const kept = join(folder, 'handed-up');
        keptAtWrite.push(existsSync(kept) ? readdirSync(kept).filter((f) => f.endsWith('.json')).length : 0);
        return scenario.writeReply === 'gathering' ? GATHERING : OK(WRITE_ANSWERS);
      }
      return 'Response,{"errorCode":"404"}';
    },
  });

  const reports: string[] = [];
  const session = await openTouchRequestSession(guardFileProtocol(remote), { permittedUnit: unitIdentityFromSerial(SERIAL) });
  const outcome = await syncTouch({ session, mode: scenario.mode, folder, report: (l) => reports.push(l), pollMs: 0, maxEmptyLists: 5 });

  const lines = remote.lines.map((line) => {
    if (line.startsWith(WRITE_ANSWERS)) {
      return { name: 'answers', answers: (JSON.parse(decodeURIComponent(line.split('&responses=')[1]!)) as { responses: unknown[] }).responses };
    }
    if (line.startsWith('Content-Length: ')) return { name: 'announcement', length: Number(line.slice(16)) };
    return { name: line.split('&')[0]!.replace(/^vnd\.logitech\./, '').replace('/vnd.logitech.', '/') };
  });
  // The announcement against the line it announced: the whole line's length, the session's default.
  const announced = remote.lines.flatMap((line, i) => (line.startsWith('Content-Length: ')
    ? [{ stated: Number(line.slice(16)), line: remote.lines[i + 1]?.length ?? -1 }] : []));
  const files = readdirSync(folder).sort();
  const handedUp = readdirSync(join(folder, 'handed-up')).sort();
  rmSync(join(folder, '..'), { recursive: true, force: true });
  process.stdout.write(JSON.stringify({ outcome, reports, lines, announced, keptAtWrite, files, handedUp }));
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
}
