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
 * * `--unchanged`: every document and picture answered 304 against the tag the remote sent; a picture it sent
 *   no tag for answered 404, which aborts nothing, and a document it sent no tag for refused, since the
 *   answerer cannot tell a file the remote does not hold from one whose tag a change on the remote erased.
 *   **Every favourites document answered 304, tag or none**: a Touch synced through a computer asks for all of
 *   them untagged, and a 304 makes it copy its own, so it keeps them as it holds them and no document is
 *   written. **It is not write free**: every document the remote hands up first is written back to it with a
 *   tag of ours and committed, so that change never reaches Logitech's account. The documents otherwise end as
 *   the remote held them. `todo-touch.md` 6.7.
 * * `--set <lab folder>`: every request answered from the set kept in that folder's `set.json`, `{ "answers":
 *   [...] }` in the shape of the answers Logitech's client wrote, `SetAnswer`; a tag the set leaves out is ours,
 *   a digest of the body. A favourites document the set holds is written with 200, and one it lacks answered
 *   304 so the remote keeps its own; a picture it lacks is answered 304 against the remote's tag, or 404 when
 *   the remote sent none. **A document the hand over hands up that the set also holds stops the run before the
 *   sync request**, since the set's copy would revert the change made on the remote. The folder has to be
 *   inside the lab. `todo-touch.md` 6.8 builds the first, with `touch-own-set.ts`.
 *
 * **Without `--commit` it opens nothing.** It prints the mode, and for a set the gate's verdict, which a commit
 * would meet first, the answers by kind and how many tags are stated; whether the lab holds the unit record and
 * which flags are set; the steps a commit takes; and the line forms below.
 *
 * **With `--commit`, the two flags and the unit record it opens the Touch** through `openFileBasedRemote`,
 * by way of `answerTouchSync` in `src/touchsync.ts`, on `@harmony/corpus/write` since `todo.md` 7.3.10,
 * opens a session, which reads the identity file and refuses any unit but the lab's `units/touch.txt`, and
 * runs the answerer, keeping every request, every answer and what the remote hands up in a new folder of the
 * lab's `reads/`. **It refuses with `HARMONY_TOUCH_RECOVERY` set**: a session driving a sync has no reason to
 * hold the recovery door, `TOUCH_RECOVERY_DOOR` in `rails.ts`, and the recovery steps are a person's, one per
 * run of `packages/usb/bin/touch-recover.ts`. The session announces each write of answers with the whole
 * line's length, its default, `TouchAnnouncement` in `touchsession.ts`. It exits 0 on `proxy://Finished` and
 * 1 otherwise.
 *
 * **After any stop, the first step is the read `getconfighash`**, `touch-request.ts --request confighash`:
 * 200 needs nothing; 202 needs `touch-recover.ts --step abort`, that read again, then `--step reboot`. A
 * refusal prints that order and what an abort would cost where the run stopped, which inside the hand over
 * is the handed up document's tag. `RECOVERY` in `src/touchsync.ts`, and `recovering-a-remote`'s Harmony
 * Touch section.
 *
 * **The remote has to be powered over USB, and nothing here can tell whether it is.** Its screens ignore
 * the hand over's and the sync's messages on any power source but the one named `usb`, so on a port where it
 * shows Charging nothing commits and the run ends in a refusal after its empty lists. Neither read on the rail
 * says which source it is on: `/sys/sysinfo` is built once when the remote starts, and the provisioning read
 * names no power source; the name that reads the power controller is a factory test name the rail never
 * opens. `reference/architectures/harmony-touch/answering-a-sync.md` "How a sync aborts, and how an answerer
 * learns of it". So the person at the bench checks that the remote shows its USB screen before `--commit`,
 * and the dry run says so.
 *
 * **Why this script is in `packages/corpus` and not beside `touch-recover.ts` in `packages/usb`**: the
 * answerer calls the codec's reader and check itself, and `packages/usb` cannot import the codec, which
 * depends on it; `src/touchsync.ts` argues it.
 *
 * **The lines it prints, one per step, for a status band**, `SYNC_LINES` in `src/touchsync.ts`, which a test
 * holds every reported line against:
 *
 *   sync: gate passed, <n> answers, <n> tags stated and <n> ours
 *   sync: unchanged, every document the remote hands up is written back to it with a tag of ours and
 *     committed, so that change never reaches Logitech's account; every document asked for is then answered
 *     304 against its own tag, and every favourites document 304 so the remote keeps its own copy
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
 *   sync: recovery, <the order of steps, getconfighash first>
 *   sync: recovery, abort cost, <what an abort would cost where the run stopped>
 *
 * The session's own lines, one per request and the identity read, are printed too and do not start with
 * `sync:`.
 *
 * **`--unchanged --commit` has run three times on the bench unit**, `todo-touch.md` 6.7 and 6.8, and `--set --commit`
 * once, 6.8, which the remote committed, `packages/usb/test/touch-own-set-sync.test.ts`.
 * This said nothing in the script had been run against a remote<!--superseded--> until 6.8's preflight.
 */
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import { LAB, newReadFolder, unitIdentity, unitIdentityPath } from '@harmony/lab';
import { openFileBasedRemote, unitIdentityFromText } from '@harmony/usb';
import { TOUCH_PRODUCT_ID, TOUCH_RECOVERY_DOOR, TOUCH_REQUEST_DOOR, WRITES_ENABLED } from '@harmony/usb/rails';

import { RECOVERY, SYNC_LINES, prepareSet, type TouchSet, type TouchSyncMode } from '../src/touchsync.ts';
import { TOUCH_SYNC_UNITS, answerTouchSync, assertTouchSyncAllowed } from '../src/write.ts';
import { commandLine, fail } from '@harmony/lab/cli';

const cli = commandLine({
  usage: [
    'usage: node packages/corpus/bin/touch-sync.ts --unchanged | --set <lab folder>',
    '       HARMONY_ENABLE_WRITES=1 HARMONY_TOUCH_REQUESTS=1 \\',
    '         node packages/corpus/bin/touch-sync.ts --unchanged | --set <lab folder> --commit',
  ].join('\n'),
  values: ['set'],
  flags: ['unchanged', 'commit'],
});

/** The lab record the request channel compares against: the library's one Touch, `TOUCH_SYNC_UNITS`. */
const UNIT = TOUCH_SYNC_UNITS[0];

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
  const unchanged = cli.flag('unchanged');
  const setFolder = cli.value('set');
  if (unchanged === (setFolder !== undefined)) fail('one of --unchanged or --set <lab folder>, not both and not neither');
  const commit = cli.flag('commit');

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
    console.log('mode: unchanged, every document the remote hands up is written back to it with a tag of ours and '
      + 'committed, so that change never reaches Logitech\'s account; every document asked for is then answered 304 '
      + 'against the tag the remote sends, a picture sent without one 404, and a document sent without one refused; '
      + 'every favourites document 304, tag or none, so the remote keeps its own and no favourites document is written');
    mode = { kind: 'unchanged' };
  }

  const record = unitIdentity(UNIT);
  console.log(`unit record: ${record === undefined ? `none at ${unitIdentityPath(UNIT)}` : `${record.slice(0, 8)}...`}`);
  console.log(`flags: HARMONY_ENABLE_WRITES ${WRITES_ENABLED ? 'set' : 'unset'}, HARMONY_TOUCH_REQUESTS `
    + `${TOUCH_REQUEST_DOOR ? 'set' : 'unset'}, HARMONY_TOUCH_RECOVERY ${TOUCH_RECOVERY_DOOR ? 'set, which a commit refuses' : 'unset'}`);
  console.log('steps: the provisioning read; the remote\'s changes handed up and kept in the lab; the sync; every '
    + 'request list answered until proxy://Finished or proxy://Abort; each write of answers announced with the whole line\'s length');
  console.log(`line forms: ${SYNC_LINES.length}, listed in this script's header`);
  console.log(`recovery: ${RECOVERY}`);
  console.log('USB power: nothing a session can ask tells whether the remote is on USB power, and on any other power '
    + 'source its screens ignore the sync and nothing commits; check that it shows its USB screen, not Charging, '
    + 'and leave the cable alone until the run ends');

  if (!commit) {
    console.log('\ndry run: nothing was opened. --commit needs the unit record, HARMONY_ENABLE_WRITES=1 and HARMONY_TOUCH_REQUESTS=1.');
    return;
  }
  // The flags, first and with the library's words: `answerTouchSync` asks the same again before it opens
  // anything, so a caller that skips this still meets it, and asking here keeps the order of the refusals.
  try {
    assertTouchSyncAllowed();
  } catch (error: unknown) {
    fail(error instanceof Error ? error.message : String(error));
  }
  if (record === undefined) {
    fail(`no unit record at ${unitIdentityPath(UNIT)}: read one with read-file-identity.ts --product 0xc12b --record ${UNIT}`);
  }
  if (LAB === undefined) fail('no lab directory, so there is nowhere to keep the run');
  const folder = newReadFolder(LAB, `touch-sync-${unchanged ? 'unchanged' : 'set'}`);

  // The run is the library's since `todo.md` 7.3.10: the flags again, the open, the session with its unit
  // check, the answerer, and the transport closed.
  const outcome = await answerTouchSync({
    mode,
    folder,
    label: UNIT,
    permittedUnit: unitIdentityFromText(record),
    open: () => openFileBasedRemote({ productId: TOUCH_PRODUCT_ID }),
    log: (text) => console.log(text),
    report: (line) => console.log(line),
  });
  console.log(`\nkept in ${folder}`);
  if (outcome.ending !== 'finished') process.exit(1);
}

main().catch((error: unknown) => {
  console.error(String(error));
  process.exit(1);
});
