/**
 * Ask a Harmony Touch one of the two reads its request channel carries: the
 * provisioning information, or `getconfighash`, the entity tags of the stored documents.
 *
 *   node packages/usb/bin/touch-request.ts --request provisioning|confighash
 *   HARMONY_ENABLE_WRITES=1 HARMONY_TOUCH_REQUESTS=1 node packages/usb/bin/touch-request.ts \
 *     --request provisioning|confighash --commit
 *
 * **Without `--commit` it opens nothing.** It prints the request line, the template its shape comes from,
 * every report the session would send with the remote's handles shown as zero, whether the lab holds the
 * unit record, and which flags a commit needs. Nothing is read off a remote for that, since nothing that
 * matters for these bytes is on it but the handles.
 *
 * **With `--commit` and both flags it opens the Touch** through `openFileBasedRemote`, opens a session on
 * it, which reads the identity file and refuses any unit but the lab's `units/touch.txt` (recorded with
 * `read-file-identity.ts --product 0xc12b --record touch`), sends the one request through the rail and
 * the guard, and writes the answer into a new folder of the lab's `reads/`. **Even a read is a write into
 * `/sys/hlapi`**, which is why both flags are needed; the request itself changes nothing the remote stores,
 * `reference/architectures/harmony-touch/api/setup.md` and `api/engine.md`.
 *
 * **What it prints may identify an account**: the provisioning answer carries the account and remote
 * numbers and an e-mail, so the terminal gets the answer's field names and sizes, and the values go to the
 * lab only. Only the two reads are offered here; the sync's requests are the answerer's, `syncTouch` in
 * `packages/corpus/src/touchsync.ts`.
 *
 * Nothing in this script has been run against a remote.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { LAB, newReadFolder, unitIdentity, unitIdentityPath } from '@harmony/lab';

import { openFileBasedRemote } from '../src/filepipe.ts';
import { unitIdentityFromText } from '../src/identity.ts';
import { TOUCH_PRODUCT_ID, TOUCH_READ_REQUESTS, TOUCH_REQUEST_DOOR, WRITES_ENABLED } from '../src/rails.ts';
import {
  SequenceCounter,
  closeReport,
  dataPacket,
} from '../src/filewrite.ts';
import {
  TOUCH_REQUEST_SHAPES,
  openTouchRequestSession,
  requestOpenForReadingReport,
  requestOpenForWritingReport,
  requestReadReport,
  requestWriteChunkReport,
} from '../src/touchsession.ts';
import { commandLine, fail } from '@harmony/lab/cli';

const cli = commandLine({
  usage: [
    'usage: node packages/usb/bin/touch-request.ts --request provisioning|confighash',
    '       HARMONY_ENABLE_WRITES=1 HARMONY_TOUCH_REQUESTS=1 node packages/usb/bin/touch-request.ts \\',
    '         --request provisioning|confighash --commit',
  ].join('\n'),
  values: ['request'],
  flags: ['commit'],
});

/** The two reads, by the short names this script takes. */
const REQUESTS: Readonly<Record<string, string>> = {
  provisioning: TOUCH_READ_REQUESTS[0] as string,
  confighash: TOUCH_READ_REQUESTS[1] as string,
};

/** The lab record the request channel compares against. */
const UNIT = 'touch';

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
  if (bytes.length > 62) fail('these two reads fit one data packet, and this one does not');
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

/** The shape of a JSON value for the terminal: field names and sizes, never a value. */
function outline(value: unknown, depth = 0): string {
  if (Array.isArray(value)) return `an array of ${value.length}`;
  if (value === null || typeof value !== 'object') {
    return typeof value === 'string' ? `text of ${value.length} characters` : typeof value;
  }
  if (depth > 1) return `an object of ${Object.keys(value).length} fields`;
  return `{ ${Object.entries(value).map(([k, v]) => `${k}: ${outline(v, depth + 1)}`).join(', ')} }`;
}

async function main(): Promise<void> {
  const which = cli.value('request');
  const line = which === undefined ? undefined : REQUESTS[which];
  if (line === undefined) fail(`--request takes ${Object.keys(REQUESTS).join(' or ')}`);
  const commit = cli.flag('commit');
  const record = unitIdentity(UNIT);

  console.log(`request: ${line}`);
  console.log(`shape: ${TOUCH_REQUEST_SHAPES[line]?.template ?? '?'}`);
  console.log(`unit record: ${record === undefined ? `none at ${unitIdentityPath(UNIT)}` : `${record.slice(0, 8)}...`}`);
  console.log(`flags: HARMONY_ENABLE_WRITES ${WRITES_ENABLED ? 'set' : 'unset'}, HARMONY_TOUCH_REQUESTS ${TOUCH_REQUEST_DOOR ? 'set' : 'unset'}`);

  if (!commit) {
    console.log('\nthe reports a commit would send, the remote\'s handles shown as 00:');
    for (const report of plannedReports(line)) console.log(`  ${hex(report)}`);
    console.log('\ndry run: nothing was opened. --commit needs the unit record and both flags.');
    return;
  }

  if (record === undefined) {
    fail(`no unit record at ${unitIdentityPath(UNIT)}: read one with read-file-identity.ts --product 0xc12b --record ${UNIT}`);
  }
  if (LAB === undefined) fail('no lab directory, so there is nowhere to keep the answer');
  const transport = await openFileBasedRemote({ productId: TOUCH_PRODUCT_ID });
  try {
    const session = await openTouchRequestSession(transport, {
      permittedUnit: unitIdentityFromText(record),
      log: (text) => console.log(text),
    });
    const answer = await session.request(line);
    const folder = newReadFolder(LAB, `touch-${which}`);
    writeFileSync(join(folder, 'answer.txt'), answer.text);
    writeFileSync(join(folder, 'request.txt'), `${line}\n`);
    console.log(`\nanswered ${answer.text.length} characters, kept in ${folder}`);
    if (answer.text.startsWith('Response,')) {
      try {
        console.log(`shape: ${outline(JSON.parse(answer.text.slice('Response,'.length)))}`);
      } catch {
        console.log('the answer after Response, is not JSON');
      }
    }
  } finally {
    await transport.close();
  }
}

main().catch((error: unknown) => {
  console.error(String(error));
  process.exit(1);
});
