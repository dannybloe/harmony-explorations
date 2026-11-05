/**
 * Send a Harmony Touch one step of the recovery tier, by hand, after a write has gone wrong: the abort of a
 * sync, the delete of every stored document, or the restart. `todo-touch.md` 6.3.1, decision 29.
 *
 *   node packages/usb/bin/touch-recover.ts --step abort|delete|reboot [--backup <lab folder>]
 *   HARMONY_ENABLE_WRITES=1 HARMONY_TOUCH_REQUESTS=1 HARMONY_TOUCH_RECOVERY=1 \
 *     node packages/usb/bin/touch-recover.ts --step abort|delete|reboot [--backup <lab folder>] --commit
 *
 * **Without `--commit` it opens nothing.** It prints the request line, what the step does to the remote,
 * every report the session would send with the remote's handles shown as zero, whether the lab holds the
 * unit record, which flags are set, and for the delete whether the backup qualifies.
 *
 * **With `--commit` and all three flags it opens the Touch** through `openFileBasedRemote`, opens a session,
 * which reads the identity file and refuses any unit but the lab's `units/touch.txt`, sends the one request
 * through the rail and the guard, prints the answer's status and what it means, and keeps the answer in a
 * new folder of the lab's `reads/`.
 *
 * **One step per run, and it does not chain them.** The order is the rail's, `TOUCH_RECOVERY_REQUESTS` in
 * `rails.ts`: the abort first, since the restart answers 202 and restarts nothing while a sync is marked
 * running; then the delete, only when the stored set itself is what fails; then the restart. A person runs
 * each and reads its answer before the next, because what the remote answers is what says which step comes
 * next, and on a remote whose configuration task has ended the abort's answer never comes at all.
 *
 * **The delete needs `--backup <lab folder>`**, a folder inside the lab that exists and holds at least one
 * file with something in it, checked before anything else and before any flag. The delete destroys every
 * stored document and picture and the remote keeps no copy. **A remote stuck on a set its reader raises on
 * has nothing worth keeping on it except what the backup holds**: the set it is stuck on is the set that
 * fails, and nothing over the cable reads a Touch's stored documents back by name,
 * `reference/architectures/harmony-touch/api/proxy.md` "Can a stored document be read back". So the backup
 * is whatever the set was built from or recorded as, in the lab, the backup `todo-touch.md` 6.5 takes being
 * the first, and the check is that a person named one.
 *
 * What this cannot clear, and what then needs the remote's own factory reset and Logitech's client: a remote
 * whose system does not start, and one whose provisioning is gone. The `recovering-a-remote` skill's Harmony
 * Touch section has the whole route.
 *
 * Nothing in this script has been run against a remote.
 */
import { existsSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import { LAB, newReadFolder, unitIdentity, unitIdentityPath } from '@harmony/lab';

import { openFileBasedRemote } from '../src/filepipe.ts';
import { SequenceCounter, closeReport, dataPacket } from '../src/filewrite.ts';
import { unitIdentityFromText } from '../src/identity.ts';
import {
  TOUCH_PRODUCT_ID,
  TOUCH_RECOVERY_DOOR,
  TOUCH_RECOVERY_REQUESTS,
  TOUCH_REQUEST_DOOR,
  WRITES_ENABLED,
} from '../src/rails.ts';
import {
  TOUCH_REQUEST_SHAPES,
  TouchRequestError,
  openTouchRequestSession,
  requestOpenForReadingReport,
  requestOpenForWritingReport,
  requestReadReport,
  requestWriteChunkReport,
} from '../src/touchsession.ts';

/** One step: its request line, what it does, and what each answer it can give means. */
interface Step {
  readonly line: string;
  readonly does: string;
  /** What a status means for this step, by the status the remote answered. */
  readonly answers: Readonly<Record<string, string>>;
  /** What no answer at all means for this step. */
  readonly silence: string;
}

/**
 * The three steps, in the order they are run. The lines are the rail's list, not a copy of it, so a
 * change of spelling there is a change here.
 */
const STEPS: Readonly<Record<'abort' | 'delete' | 'reboot', Step>> = {
  abort: {
    line: TOUCH_RECOVERY_REQUESTS[0] as string,
    does: 'abandons a sync: clears the sync flags and the set being gathered, empties the request queue and '
      + 'reloads the stored configuration. The stored documents are kept.',
    answers: {
      200: 'the sync flags are cleared. Next: --step delete if the stored set is what fails, otherwise --step reboot.',
    },
    silence: 'no answer. On a remote whose configuration task has ended this is what the abort does: it clears '
      + 'the flags before the reload it then waits on, and the reload never returns. Go on as after a 200.',
  },
  delete: {
    line: TOUCH_RECOVERY_REQUESTS[1] as string,
    does: 'deletes every stored document and picture, and answers with no status of its own. The remote keeps '
      + 'no copy; after a restart it starts with no configuration and a sync works.',
    answers: {
      501: 'the remote is not provisioned, so the delete was refused and nothing was deleted. This remote needs '
        + 'Logitech\'s client to provision it again, which no step here does.',
    },
    silence: 'no answer within the timeout. Read the identity file before anything else, and do not send the '
      + 'delete again in a loop.',
  },
  reboot: {
    line: TOUCH_RECOVERY_REQUESTS[2] as string,
    does: 'restarts the remote two seconds after it answers, without the task that loads the configuration, '
      + 'so it reaches a remote whose task has ended. Refused while a sync is marked running.',
    answers: {
      200: 'the remote restarts in two seconds and leaves the cable meanwhile. A restart loads the committed set.',
      202: 'a sync is marked running, so nothing restarts. Run --step abort first, then this step again.',
    },
    silence: 'no answer within the timeout. Read the identity file before anything else, and do not send the '
      + 'restart again in a loop.',
  },
};

/** The lab record the request channel compares against. */
const UNIT = 'touch';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const hex = (report: Uint8Array, length = 24): string =>
  [...report.subarray(0, length)].map((b) => b.toString(16).padStart(2, '0')).join(' ');

/**
 * The reports a request of one data packet would send, in order, with the remote's handles as zero. The
 * same builders the session uses, so this is what it sends and not a description of it.
 */
function plannedReports(line: string): Uint8Array[] {
  const shape = TOUCH_REQUEST_SHAPES[line];
  if (shape === undefined) fail(`no shape for ${line}`);
  const bytes = Buffer.from(line, 'ascii');
  if (bytes.length > 62) fail('the three recovery requests fit one data packet, and this one does not');
  const sequence = new SequenceCounter(shape.firstRuntimeSequence);
  return [
    requestOpenForWritingReport(shape, bytes.length),
    requestWriteChunkReport(shape, 0, 2, sequence.take()),
    dataPacket(sequence.take(), bytes),
    closeReport(0, sequence.take()),
    requestOpenForReadingReport(shape),
    requestReadReport(shape, 0, sequence.take()),
    closeReport(0, sequence.take()),
  ];
}

/** Every regular file under `folder` that holds at least one byte, counted. */
function filesWithContent(folder: string): number {
  let count = 0;
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) count += filesWithContent(path);
    else if (entry.isFile() && statSync(path).size > 0) count += 1;
  }
  return count;
}

/**
 * Why `backup` does not qualify as the backup a delete needs, or undefined when it does: a folder inside the
 * lab, which exists and holds at least one file with something in it. Inside the lab because that is where a
 * set we built or a sync we recorded is kept, and a folder elsewhere is one nobody here is looking after.
 */
function backupRefusal(backup: string | undefined): string | undefined {
  if (backup === undefined) {
    return 'the delete needs --backup <lab folder>: it destroys every stored document, and the remote keeps no copy';
  }
  if (LAB === undefined) return 'there is no lab directory, so no backup can be in it';
  const path = resolve(backup);
  if (!existsSync(path) || !statSync(path).isDirectory()) return `the backup ${path} is not a folder that exists`;
  const real = realpathSync(path);
  const lab = realpathSync(LAB);
  if (!real.startsWith(lab + sep)) return `the backup ${real} is not inside the lab, ${lab}`;
  if (filesWithContent(real) === 0) return `the backup ${real} holds no file with anything in it`;
  return undefined;
}

/** The status an answer states, `errorCode` in the long form's object and `code` otherwise. */
function statusOf(text: string): string | undefined {
  if (!text.startsWith('Response,')) return undefined;
  try {
    const answer = JSON.parse(text.slice('Response,'.length)) as Record<string, unknown>;
    const code = answer['errorCode'] ?? answer['code'];
    return code === undefined ? undefined : String(code);
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const which = argument('step');
  if (which !== 'abort' && which !== 'delete' && which !== 'reboot') {
    fail(`--step takes ${Object.keys(STEPS).join(', ')}, one per run, in that order`);
  }
  const step = STEPS[which];
  const commit = process.argv.includes('--commit');
  const backup = argument('backup');

  // The delete's backup first, before the flags and before anything is opened, so the refusal a person
  // meets for a missing backup is the same in a dry run and a commit.
  const refusal = which === 'delete' ? backupRefusal(backup) : undefined;
  if (commit && refusal !== undefined) fail(refusal);

  const record = unitIdentity(UNIT);
  console.log(`step: ${which}, ${step.line}`);
  console.log(`what it does: ${step.does}`);
  console.log(`shape: ${TOUCH_REQUEST_SHAPES[step.line]?.template ?? '?'}, borrowed, since Logitech's client sends none of the three`);
  console.log(`unit record: ${record === undefined ? `none at ${unitIdentityPath(UNIT)}` : `${record.slice(0, 8)}...`}`);
  console.log(`flags: HARMONY_ENABLE_WRITES ${WRITES_ENABLED ? 'set' : 'unset'}, HARMONY_TOUCH_REQUESTS `
    + `${TOUCH_REQUEST_DOOR ? 'set' : 'unset'}, HARMONY_TOUCH_RECOVERY ${TOUCH_RECOVERY_DOOR ? 'set' : 'unset'}`);
  if (which === 'delete') console.log(`backup: ${refusal ?? `${resolve(backup as string)}, which qualifies`}`);
  console.log('order: abort, then delete only if the stored set is what fails, then reboot; one per run');

  if (!commit) {
    console.log('\nthe reports a commit would send, the remote\'s handles shown as 00:');
    for (const report of plannedReports(step.line)) console.log(`  ${hex(report)}`);
    console.log('\ndry run: nothing was opened. --commit needs the unit record and all three flags.');
    return;
  }

  if (!WRITES_ENABLED || !TOUCH_REQUEST_DOOR || !TOUCH_RECOVERY_DOOR) {
    fail('--commit needs HARMONY_ENABLE_WRITES=1, HARMONY_TOUCH_REQUESTS=1 and HARMONY_TOUCH_RECOVERY=1');
  }
  if (record === undefined) {
    fail(`no unit record at ${unitIdentityPath(UNIT)}: read one with read-file-identity.ts --product 0xc12b --record ${UNIT}`);
  }
  if (LAB === undefined) fail('no lab directory, so there is nowhere to keep the answer');
  const lab = LAB;

  const transport = await openFileBasedRemote({ productId: TOUCH_PRODUCT_ID });
  try {
    const session = await openTouchRequestSession(transport, {
      permittedUnit: unitIdentityFromText(record),
      log: (text) => console.log(text),
    });
    const folder = newReadFolder(lab, `touch-recover-${which}`);
    writeFileSync(join(folder, 'request.txt'), `${step.line}\n`);
    let text: string;
    try {
      text = (await session.request(step.line)).text;
    } catch (error: unknown) {
      // A step whose answer does not come is a state of the remote, and the step says which one. Any other
      // failure, a refusal by the rail or the guard among them, is passed on as it is.
      if (!(error instanceof TouchRequestError) || !/no reply|stopped after|before its end/.test(error.message)) throw error;
      writeFileSync(join(folder, 'answer.txt'), `no answer: ${error.message}\n`);
      console.log(`\n${error.message}`);
      console.log(step.silence);
      return;
    }
    writeFileSync(join(folder, 'answer.txt'), text);
    const status = statusOf(text);
    console.log(`\nanswered ${text.length} characters, status ${status ?? 'none stated'}, kept in ${folder}`);
    const meaning = status === undefined
      ? (which === 'delete' ? 'no status, which is what the delete is read to answer: it returns no reply of its own. Next: --step reboot.' : undefined)
      : step.answers[status];
    console.log(meaning ?? 'not an answer this step is read to give: stop and read the answer in the lab before anything else.');
  } finally {
    // After a restart the remote leaves the cable, so closing the handle can fail; that is not the step's.
    try {
      await transport.close();
    } catch {
      console.log('the transport could not be closed cleanly, as expected after a restart');
    }
  }
}

main().catch((error: unknown) => {
  console.error(String(error));
  process.exit(1);
});
