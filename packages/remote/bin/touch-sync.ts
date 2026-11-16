/**
 * Drive a Harmony Touch's sync down end to end through the answerer, `src/touchsync.ts`,
 * under decision 29.
 *
 *   node packages/remote/bin/touch-sync.ts --unchanged | --set <lab folder>
 *   HARMONY_ENABLE_WRITES=1 HARMONY_TOUCH_REQUESTS=1 \
 *     node packages/remote/bin/touch-sync.ts --unchanged | --set <lab folder> --commit
 *   node packages/remote/bin/touch-sync.ts --document <lab file> --account <lab file> [--archive <checkout>] [--commit]
 *
 * **Three modes.**
 *
 * * `--unchanged`: every document and picture answered 304 against the tag the remote sent; a picture it sent
 *   no tag for answered 404, which aborts nothing, and a document it sent no tag for refused, since the
 *   answerer cannot tell a file the remote does not hold from one whose tag a change on the remote erased.
 *   **Every favourites document answered 304, tag or none**: a Touch synced through a computer asks for all of
 *   them untagged, and a 304 makes it copy its own, so it keeps them as it holds them and no document is
 *   written. **It is not write free**: every document the remote hands up first is written back to it with a
 *   tag of ours and committed, so that change never reaches Logitech's account. The documents otherwise end as
 *   the remote held them.
 * * `--set <lab folder>`: every request answered from the set kept in that folder's `set.json`, `{ "answers":
 *   [...] }` in the shape of the answers Logitech's client wrote, `SetAnswer`; a tag the set leaves out is ours,
 *   a digest of the body. A favourites document the set holds is written with 200, and one it lacks answered
 *   304 so the remote keeps its own; a picture it lacks is answered 304 against the remote's tag, or 404 when
 *   the remote sent none. **A document the hand over hands up that the set also holds stops the run before the
 *   sync request**, since the set's copy would revert the change made on the remote. The folder has to be
 *   inside the lab. `touch-own-set.ts` builds one of the remote's own documents, and the other `touch-*-set.ts`
 *   scripts build the changed ones.
 * * `--document <lab file> --account <lab file>`: **the sync an application calls, on the bench**, as
 *   `write-config.ts --document` is for the Harmony One. The document is a recipe as the toolkit keeps one, of
 *   version 2, decision 43; one of the earlier form, with a block of the Touch's own, is refused naming the converter,
 *   `describeTouchDocument`, before anything is opened. It is checked, built, made into a set at the account's addresses and answered by `syncDocument` on
 *   `@freeharmony-sdk/remote/write`, which hands the set to the same `answerTouchSync` the other two modes call. The account is
 *   the lab file `touch-nothing-set.ts --describe-account` writes: Context's seven fields, the tuning device's
 *   favourites address and key, and the six documents' addresses, which the build and the set take and which never
 *   enter the repository, so **the document has to be inside the lab too**: what is kept beside it, the journal and
 *   the set built, carries the account's values. The archive is `--archive`, `HARMONY_IR_ARCHIVE` or the checkout
 *   beside this repository, and a recipe that carries every device's definition builds without one. The events a
 *   screen would show are printed beside the account of the run; the journal goes beside the document, and so does
 *   the set built, `<document>.built-set.json`, kept before the remote is opened. **No rerun rule applies**, unlike
 *   the Harmony One's: a Touch's documents take no stamp from the moment of the build and their tags are digests of
 *   their content, so the same document and account build the same set at any moment, and what a stopped run leaves
 *   is the recovery's to clear, below, not a part of a build to finish. Without `--commit` it is a dry run of the
 *   sync: the build, the set and the gate, and then **one read off the attached Touch**, its power source, through
 *   the read only route, refused on any source but `usb` as a commit would be, `syncDocument`.
 *   **A remote not found** is refused with the check a person can make, `TOUCH_NOT_FOUND`: a cable that carries
 *   power and no data charges the remote while the computer never sees it.
 *
 * **Without `--commit`, `--unchanged` and `--set` open nothing.** They print the mode, and for a set the gate's verdict, which a commit
 * would meet first, the answers by kind and how many tags are stated; whether the lab holds the unit record and
 * which flags are set; the steps a commit takes; and the line forms below.
 *
 * **With `--commit`, the two flags and the unit record it opens the Touch** through `openFileBasedRemote`,
 * by way of `answerTouchSync` in `src/touchsync.ts`, on `@freeharmony-sdk/remote/write`,
 * reads the remote's power source, opens a session, which reads the identity file and refuses any unit but the
 * lab's `units/touch.txt`, and runs the answerer, which refuses on any power source but `usb` before anything that
 * acts, keeping every request, every answer and what the remote hands up in a new folder of the
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
 * **The remote has to be powered over USB, and a commit reads whether it is.** Its screens ignore the hand
 * over's and the sync's messages on any power source but the one named `usb`, so on any other nothing would
 * commit. Neither read on the request channel says which source it is on, but the power controller's own file
 * does, through the factory test name `/tde/powerstate`, which opening for reading only reads,
 * `reference/architectures/harmony-touch/api/names.md`. So `answerTouchSync` reads it through the read only route
 * before the session opens and refuses on anything but `usb`, before anything that acts is sent, saying what the
 * remote reported. The dry runs of `--unchanged` and `--set` open nothing and so read nothing; the plan they print
 * says what a commit checks.
 *
 * **Why this script is in `packages/remote` and not beside `touch-recover.ts` in `packages/usb`**: the
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
 *   sync: power source, <usb, another of the five sources, or the unexpected text quoted>
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
 * **`--unchanged --commit` ran three of the first four syncs on the bench unit**, and `--set --commit` the
 * other, which the remote committed, `packages/usb/test/touch/touch-own-set-sync.test.ts`.
 * This said nothing in the script had been run against a remote<!--superseded--> until a preflight read the runs.
 */
import { appendFileSync, existsSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';

import { archiveAt, localTimestamp, recipe } from '@freeharmony-sdk/config/node';
import { IR_ARCHIVE, LAB, newReadFolder, unitIdentity, unitIdentityPath } from '@freeharmony-sdk/lab';
import { listFileBasedRemotes, openFileBasedRemote, unitIdentityFromText } from '@freeharmony-sdk/usb';
import { TOUCH_PRODUCT_ID, TOUCH_RECOVERY_DOOR, TOUCH_REQUEST_DOOR, WRITES_ENABLED } from '@freeharmony-sdk/usb/rails';

import type { TouchAccountFile } from '../experiments/touchnothingset.ts';
import { RECOVERY, SYNC_LINES, TOUCH_NOT_FOUND, prepareSet, type TouchSet, type TouchSyncMode } from '../src/touchsync.ts';
import { SYNC_STATES, TOUCH_SYNC_UNITS, answerTouchSync, assertTouchSyncAllowed, syncDocument } from '../src/write.ts';
import { SWITCHED_OFF } from '../src/sync.ts';
import { commandLine, fail } from '@freeharmony-sdk/lab/cli';

const cli = commandLine({
  usage: [
    'usage: node packages/remote/bin/touch-sync.ts --unchanged | --set <lab folder>',
    '       HARMONY_ENABLE_WRITES=1 HARMONY_TOUCH_REQUESTS=1 \\',
    '         node packages/remote/bin/touch-sync.ts --unchanged | --set <lab folder> --commit',
    '       node packages/remote/bin/touch-sync.ts --document <lab file> --account <lab file> [--archive <checkout>] [--commit]',
  ].join('\n'),
  values: ['set', 'document', 'account', 'archive'],
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

/** A path inside the lab, resolved through its links, or a refusal; the rule `touch-nothing-set.ts` keeps. */
function insideTheLab(path: string, what: string): string {
  if (LAB === undefined) fail('there is no lab directory');
  const real = existsSync(resolve(path)) ? realpathSync(resolve(path)) : fail(`${what} ${resolve(path)} does not exist`);
  const lab = realpathSync(LAB);
  if (!real.startsWith(lab + sep)) fail(`${what} ${real} is not inside the lab, ${lab}`);
  return real;
}

/** The plan every mode prints: the unit record, the flags, the power source and the recovery order. */
function printPlan(record: string | undefined): void {
  console.log(`unit record: ${record === undefined ? `none at ${unitIdentityPath(UNIT)}` : `${record.slice(0, 8)}...`}`);
  console.log(`flags: HARMONY_ENABLE_WRITES ${WRITES_ENABLED ? 'set' : 'unset'}, HARMONY_TOUCH_REQUESTS `
    + `${TOUCH_REQUEST_DOOR ? 'set' : 'unset'}, HARMONY_TOUCH_RECOVERY ${TOUCH_RECOVERY_DOOR ? 'set, which a commit refuses' : 'unset'}`);
  console.log('steps: the power source read, refused unless usb; the provisioning read; the remote\'s changes handed up and kept in the lab; the sync; every '
    + 'request list answered until proxy://Finished or proxy://Abort; each write of answers announced with the whole line\'s length');
  console.log(`line forms: ${SYNC_LINES.length}, listed in this script's header`);
  console.log(`recovery: ${RECOVERY}`);
  console.log('USB power: a commit reads the remote\'s power source first and refuses unless it is usb, the one source '
    + 'its screens take part in a sync on, where it shows its USB screen; '
    + 'leave the cable alone until the run ends');
}

/**
 * `--document`: sync a document to the one Harmony Touch attached through `syncDocument`, the function an application
 * calls. The bench's part: the lab's account file and unit record, the journal and the set kept beside the document,
 * the run's folder in the lab's `reads/`, and printing. Everything that can be refused without the remote is refused
 * before the bus is enumerated. Ends the process with 1 unless the sync ended written or as a dry run.
 */
async function syncTheDocument(documentFile: string): Promise<void> {
  const commit = cli.flag('commit');
  if (LAB === undefined) fail('there is no lab directory, and the document, the account and the run are kept in it');
  const lab = LAB;
  // Inside the lab, since the journal and the set kept beside the document carry the account's values.
  const documentPath = insideTheLab(documentFile, 'the document');
  const accountFile = insideTheLab(cli.value('account') ?? fail('--document needs --account <lab file>, the account\'s description'), 'the account file');
  const account = (JSON.parse(readFileSync(accountFile, 'utf8')) as { account?: TouchAccountFile }).account;
  if (account === undefined || typeof account.addresses !== 'object' || account.addresses === null) {
    fail(`${accountFile} holds no account with the documents' addresses: write one with touch-nothing-set.ts --describe-account`);
  }
  const document = recipe.open(JSON.parse(readFileSync(documentPath, 'utf8')));
  const archivePath = cli.value('archive') ?? IR_ARCHIVE;
  const record = unitIdentity(UNIT);
  if (commit && record === undefined) {
    fail(`no unit record at ${unitIdentityPath(UNIT)}: read one with read-file-identity.ts --product 0xc12b --record ${UNIT}`);
  }

  // Enumerated, not opened: the sync reads the model off the release word before anything is opened, and opens the
  // Touch only for its power source in a dry run and for the run itself in a commit.
  const touches = (await listFileBasedRemotes()).filter((found) => found.productId === TOUCH_PRODUCT_ID);
  if (touches.length === 0) fail(TOUCH_NOT_FOUND);
  if (touches.length > 1) fail(`${touches.length} remotes of the Touch's product id are attached; this writes, so it refuses to guess`);

  const journalPath = `${documentPath}.sync-${new Date().toISOString().replace(/[:.]/g, '')}.log`;
  const say = (line: string): void => {
    console.log(line);
    appendFileSync(journalPath, `${line}\n`);
  };
  appendFileSync(journalPath, `# ${cli.argv.slice(1).join(' ')}\n`);
  console.log(`mode: sync ${basename(documentPath)} through syncDocument, answered from the set it builds`);
  printPlan(record);
  const setPath = `${documentPath}.built-set.json`;
  let folder: string | undefined;

  const outcome = await syncDocument({
    document,
    remote: {
      kind: 'attached',
      found: touches[0] as (typeof touches)[number],
      keeper: {
        kind: 'document',
        label: UNIT,
        // A dry run reads the identity file, for the build, and the power source, and compares nothing, so it
        // needs no record and is handed none; a commit without one was refused above, and the session refuses
        // an empty record besides.
        permittedUnit: record === undefined ? new Uint8Array(0) : unitIdentityFromText(record),
        addresses: account.addresses,
        // Made at a commit, never by a dry run.
        folder: () => {
          folder = newReadFolder(lab, 'touch-sync-document');
          return folder;
        },
        // Beside the document, before the remote is opened, so the lab holds what was being given to it.
        keep: (set) => {
          writeFileSync(setPath, `${JSON.stringify(set, null, 1)}\n`);
          say(`kept the set built, ${set.answers.length} answers, in ${basename(setPath)}`);
        },
      },
    },
    sources: {
      builtAt: localTimestamp(new Date()),
      account,
      ...(archivePath === undefined ? {} : { archive: archiveAt(archivePath) }),
    },
    commit,
    // What a screen would show, printed beside the account and marked, and kept out of the journal, which is the
    // account's alone.
    onEvent: (event) => {
      if (event.kind === 'phase') console.log(`  [event] phase ${event.phase}`);
      else if (event.kind === 'progress') console.log(`  [event] ${event.phase} ${event.done} of ${event.total}`);
      else if (event.kind === 'attention') console.log(`  [event] ${event.attention}: ${event.message}`);
      else console.log(`  [event] ended ${event.outcome.result}, the remote ${event.outcome.remote}`);
    },
    journal: say,
  });
  if (folder !== undefined) console.log(`\nkept in ${folder}`);
  console.log(`journal: ${journalPath}`);
  if (!['written', 'dry-run'].includes(outcome.result)) {
    console.error(`${outcome.result}${outcome.phase === undefined ? '' : ` in ${outcome.phase}`}: ${outcome.message ?? ''}`);
    // The library names the state the remote was left in and no command; at the bench the way back is the read and
    // the recovery steps of this repository's scripts, in the answerer's order, and what an abort would cost there
    // is the answerer's own line in the journal above.
    if (outcome.state !== undefined) {
      console.error(`the remote is left ${outcome.state}: ${SYNC_STATES[outcome.state].holds}`);
      console.error(`recovery: ${RECOVERY}`);
      console.error('do not unplug the remote before that read has answered');
    } else if (outcome.message === SWITCHED_OFF) {
      console.error('--commit needs HARMONY_ENABLE_WRITES=1 and HARMONY_TOUCH_REQUESTS=1, and HARMONY_TOUCH_RECOVERY unset');
    }
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const unchanged = cli.flag('unchanged');
  const setFolder = cli.value('set');
  const documentFile = cli.value('document');
  if ([unchanged, setFolder !== undefined, documentFile !== undefined].filter(Boolean).length !== 1) {
    fail('one of --unchanged, --set <lab folder> or --document <lab file>, not two and not none');
  }
  if (documentFile !== undefined) {
    await syncTheDocument(documentFile);
    return;
  }
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
  printPlan(record);

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

  // The run is the library's: the flags again, the open, the session with its unit
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
