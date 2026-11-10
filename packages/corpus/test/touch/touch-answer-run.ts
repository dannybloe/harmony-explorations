/**
 * One run of `answerTouchSync` against the fake Touch, for `touch-answer.test.ts`.
 *
 * **Why a process of its own**, as `touch-sync-run.ts` gives: the rails read their flags once, when `rails.ts`
 * loads, so the test starts this file with the flags it wants and reads the result back as JSON. **Nothing here
 * touches a device**: the only transport the run is ever handed is `FakeTouchRemote` behind the guard
 * `openFileBasedRemote` returns, through the scenario's `open`, answering a sync that hands nothing up and asks
 * for nothing. What `syncTouch` does with a request list is `touch-sync.test.ts`'s; this holds the run around
 * it: the flags and the label before anything is opened, the session's unit check, and the transport closed.
 *
 * Not a test file itself, so the runner does not pick it up.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { unitIdentityFromSerial } from '@harmony/usb';
import { guardFileProtocol } from '@harmony/usb/internal';
import { FakeTouchRemote } from '@harmony/testkit/fake-touch-remote';

import { HAND_OVER, PROVISIONING, READ_LIST, SYNC, WRITE_ANSWERS } from '../../src/touchsync.ts';
import { answerTouchSync, type TouchSyncOutcome } from '../../src/write.ts';
import { SERIAL, sysinfoText } from './touch-sync-run.ts';

export interface AnswerScenario {
  /** The serial the caller's record was made from; the fake's own when absent. */
  readonly recordSerial?: string;
  /** The label the caller names; `touch`, the library's one Touch, when absent. */
  readonly label?: string;
}

export interface AnswerRun {
  readonly outcome?: TouchSyncOutcome;
  readonly error?: { readonly name: string; readonly message: string };
  readonly opened: boolean;
  readonly closed: boolean;
  /** Every line written into `/sys/hlapi`, by its request's name. */
  readonly written: string[];
  readonly log: string[];
  readonly reports: string[];
}

const OK = (mime: string, result: unknown = null): string =>
  `Response,${JSON.stringify({ errorMessage: 'OK', mime, result, errorCode: '200' })}`;
const FINISHED = OK(READ_LIST, JSON.stringify({ requests: [{ verb: 'POST', uri: 'proxy://Finished' }] }));

export async function runAnswer(scenario: AnswerScenario): Promise<AnswerRun> {
  const remote = new FakeTouchRemote({
    sysinfo: sysinfoText(),
    answer: (line: string): string => {
      if (line === PROVISIONING) return OK(PROVISIONING, { accountId: '1', activeRemoteId: 2, mode: 0, se: true });
      if (line === HAND_OVER) return OK(HAND_OVER);
      if (line === SYNC) return OK(SYNC);
      if (line.startsWith(READ_LIST)) return FINISHED;
      if (line.startsWith(WRITE_ANSWERS)) return OK(WRITE_ANSWERS);
      if (line.startsWith('Content-Length: ')) return 'Response,{"result":null,"errorCode":200}';
      return 'Response,{"errorCode":"404"}';
    },
  });
  let opened = false;
  let closed = false;
  remote.close = async (): Promise<void> => { closed = true; };
  const folder = join(mkdtempSync(join(tmpdir(), 'touch-answer-')), 'run');
  const log: string[] = [];
  const reports: string[] = [];
  let outcome: TouchSyncOutcome | undefined;
  let error: { name: string; message: string } | undefined;
  try {
    outcome = await answerTouchSync({
      mode: { kind: 'unchanged' },
      folder,
      label: scenario.label ?? 'touch',
      permittedUnit: unitIdentityFromSerial(scenario.recordSerial ?? SERIAL),
      open: async () => {
        opened = true;
        return guardFileProtocol(remote);
      },
      log: (line) => log.push(line),
      report: (line) => reports.push(line),
      pollMs: 0,
      maxEmptyLists: 5,
    });
  } catch (thrown: unknown) {
    error = thrown instanceof Error
      ? { name: thrown.constructor.name, message: thrown.message }
      : { name: typeof thrown, message: String(thrown) };
  } finally {
    rmSync(join(folder, '..'), { recursive: true, force: true });
  }
  return {
    ...(outcome === undefined ? {} : { outcome }),
    ...(error === undefined ? {} : { error }),
    opened,
    closed,
    written: remote.lines.map((line) => line.split('&')[0]!),
    log,
    reports,
  };
}

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  process.stdout.write(JSON.stringify(await runAnswer(JSON.parse(Buffer.concat(chunks).toString('utf8')) as AnswerScenario)));
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
}
