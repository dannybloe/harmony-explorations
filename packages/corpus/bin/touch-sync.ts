/**
 * Drive a Harmony Touch's sync down end to end through the answerer, `src/touchsync.ts`. `todo-touch.md` 6.6,
 * under decision 29.
 *
 *   node packages/corpus/bin/touch-sync.ts --unchanged | --set <lab folder>
 *   HARMONY_ENABLE_WRITES=1 HARMONY_TOUCH_REQUESTS=1 \
 *     node packages/corpus/bin/touch-sync.ts --unchanged | --set <lab folder> --commit
 *
 * **Two modes.**
 *
 * * `--unchanged`: every document, favourites document and picture answered 304 against the tag the remote
 *   sent, and a refusal for one it sent no tag for, since a 304 to a request with no tag leaves the document
 *   missing from the new set. The remote ends holding what it held. `todo-touch.md` 6.7.
 * * `--set <lab folder>`: every request answered from the set kept in that folder's `set.json`, `{ "answers":
 *   [...] }` in the shape of the answers Logitech's client wrote, `SetAnswer`; a tag the set leaves out is ours,
 *   a digest of the body. The folder has to be inside the lab. `todo-touch.md` 6.8 builds the first.
 *
 * **Without `--commit` it opens nothing.** It prints the mode, and for a set the gate's verdict, which a commit
 * would meet first, the answers by kind and how many tags are stated; whether the lab holds the unit record and
 * which flags are set; the steps a commit takes; and the line forms below.
 *
 * **With `--commit`, the two flags and the unit record it opens the Touch** through `openFileBasedRemote`,
 * opens a session, which reads the identity file and refuses any unit but the lab's `units/touch.txt`, and
 * runs the answerer, keeping every request, every answer and what the remote hands up in a new folder of the
 * lab's `reads/`. **It refuses with `HARMONY_TOUCH_RECOVERY` set**: a session driving a sync has no reason to
 * hold the recovery door, `TOUCH_RECOVERY_DOOR` in `rails.ts`, and the recovery steps are a person's, one per
 * run of `packages/usb/bin/touch-recover.ts`. The session announces each write of answers with the whole
 * line's length, its default, `TouchAnnouncement` in `touchsession.ts`. It exits 0 on `proxy://Finished` and
 * 1 otherwise.
 *
 * **Why this script is in `packages/corpus` and not beside `touch-recover.ts` in `packages/usb`**: the
 * answerer calls the codec's reader and check itself, and `packages/usb` cannot import the codec, which
 * depends on it; `src/touchsync.ts` argues it.
 *
 * **The lines it prints, one per step, for a status band**, `SYNC_LINES` in `src/touchsync.ts`, which a test
 * holds every reported line against:
 *
 *   sync: gate passed, <n> answers, <n> tags stated and <n> ours
 *   sync: unchanged, every document answered 304 against its own tag
 *   sync: provisioned, mode <n>
 *   sync: handing over the remote's changes
 *   sync: hand over, request list <n>, <n> answered
 *   sync: hand over, request list <n>, empty
 *   sync: kept <what> in the lab
 *   sync: started
 *   sync: request list <n>, <n> answered
 *   sync: request list <n>, empty
 *   sync: finished
 *   sync: aborted
 *   sync: refused, <why>
 *   sync: recovery, <the step to run>
 *
 * The session's own lines, one per request and the identity read, are printed too and do not start with
 * `sync:`.
 *
 * Nothing in this script has been run against a remote.
 */
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import { LAB, unitIdentity, unitIdentityPath } from '@harmony/lab';
import {
  TOUCH_PRODUCT_ID,
  TOUCH_RECOVERY_DOOR,
  TOUCH_REQUEST_DOOR,
  WRITES_ENABLED,
  openFileBasedRemote,
  unitIdentityFromText,
} from '@harmony/usb';
import { openTouchRequestSession } from '@harmony/usb/touchsession';

import { SYNC_LINES, prepareSet, syncTouch, type TouchSet, type TouchSyncMode } from '../src/touchsync.ts';

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

/** Why `folder` is not a set this script reads, or the set: a folder inside the lab holding `set.json`. */
function readSet(folder: string): TouchSet {
  if (LAB === undefined) fail('there is no lab directory, so no set can be in it');
  const path = resolve(folder);
  if (!existsSync(path) || !statSync(path).isDirectory()) fail(`the set ${path} is not a folder that exists`);
  const real = realpathSync(path);
  const lab = realpathSync(LAB);
  if (!real.startsWith(lab + sep)) fail(`the set ${real} is not inside the lab, ${lab}`);
  const file = join(real, 'set.json');
  if (!existsSync(file)) fail(`the set folder ${real} holds no set.json`);
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as TouchSet;
  } catch (error: unknown) {
    fail(`${file} is not JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** What kind of address a key is, for the plan: a document by name, else its scheme. */
const kindOfKey = (key: string): string => (key.includes(':') ? key.split(':')[0] as string : key);

async function main(): Promise<void> {
  const unchanged = process.argv.includes('--unchanged');
  const setFolder = argument('set');
  if (unchanged === (setFolder !== undefined)) fail('one of --unchanged or --set <lab folder>, not both and not neither');
  const commit = process.argv.includes('--commit');

  let mode: TouchSyncMode;
  if (setFolder !== undefined) {
    const set = readSet(setFolder);
    const gate = prepareSet(set);
    if ('refusals' in gate) {
      console.log(`sync: refused, the gate found ${gate.refusals.length} reasons the set cannot be written:`);
      for (const r of gate.refusals) console.log(`  ${r}`);
      process.exit(1);
    }
    const kinds = new Map<string, number>();
    for (const key of gate.set.entries.keys()) kinds.set(kindOfKey(key), (kinds.get(kindOfKey(key)) ?? 0) + 1);
    console.log(`mode: answer from the set in ${resolve(setFolder)}`);
    console.log(`gate: passed, ${gate.set.entries.size} answers, ${gate.set.tags.stated} tags stated and ${gate.set.tags.ours} ours`);
    console.log(`answers by kind: ${[...kinds].map(([k, n]) => `${k} ${n}`).join(', ')}`);
    // The answers are printed by kind only: an address names the account.
    mode = { kind: 'set', set };
  } else {
    console.log('mode: unchanged, every document answered 304 against the tag the remote sends');
    mode = { kind: 'unchanged' };
  }

  const record = unitIdentity(UNIT);
  console.log(`unit record: ${record === undefined ? `none at ${unitIdentityPath(UNIT)}` : `${record.slice(0, 8)}...`}`);
  console.log(`flags: HARMONY_ENABLE_WRITES ${WRITES_ENABLED ? 'set' : 'unset'}, HARMONY_TOUCH_REQUESTS `
    + `${TOUCH_REQUEST_DOOR ? 'set' : 'unset'}, HARMONY_TOUCH_RECOVERY ${TOUCH_RECOVERY_DOOR ? 'set, which a commit refuses' : 'unset'}`);
  console.log('steps: the provisioning read; the remote\'s changes handed up and kept in the lab; the sync; every '
    + 'request list answered until proxy://Finished or proxy://Abort; each write of answers announced with the whole line\'s length');
  console.log(`line forms: ${SYNC_LINES.length}, listed in this script's header`);

  if (!commit) {
    console.log('\ndry run: nothing was opened. --commit needs the unit record, HARMONY_ENABLE_WRITES=1 and HARMONY_TOUCH_REQUESTS=1.');
    return;
  }
  if (!WRITES_ENABLED || !TOUCH_REQUEST_DOOR) fail('--commit needs HARMONY_ENABLE_WRITES=1 and HARMONY_TOUCH_REQUESTS=1');
  if (TOUCH_RECOVERY_DOOR) {
    fail('--commit refuses with HARMONY_TOUCH_RECOVERY set: a sync has no use for the recovery door, and the '
      + 'recovery steps are run by hand, one per run of touch-recover.ts');
  }
  if (record === undefined) {
    fail(`no unit record at ${unitIdentityPath(UNIT)}: read one with read-file-identity.ts --product 0xc12b --record ${UNIT}`);
  }
  if (LAB === undefined) fail('no lab directory, so there is nowhere to keep the run');
  const folder = join(LAB, 'reads', `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 13)}Z-touch-sync-${unchanged ? 'unchanged' : 'set'}`);

  const transport = await openFileBasedRemote({ productId: TOUCH_PRODUCT_ID });
  let ending: string;
  try {
    const session = await openTouchRequestSession(transport, {
      permittedUnit: unitIdentityFromText(record),
      log: (text) => console.log(text),
    });
    const outcome = await syncTouch({ session, mode, folder, report: (line) => console.log(line) });
    console.log(`\nkept in ${folder}`);
    ending = outcome.ending;
  } finally {
    await transport.close();
  }
  if (ending !== 'finished') process.exit(1);
}

main().catch((error: unknown) => {
  console.error(String(error));
  process.exit(1);
});
