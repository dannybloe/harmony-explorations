// A document synced to a pretend Harmony One and a pretend Harmony Touch,
// following what the sync reports.
import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  localTimestamp,
  NotBuiltError,
  recipe,
} from '@freeharmony-sdk/config/node';
import {
  pretendRemote,
  SYNC_STATES,
  syncDocument,
  syncIsBuilt,
  type SyncEvent,
} from '@freeharmony-sdk/remote/write';

import { inventedAccount, livingRoom, saved } from './library.ts';

// The phases each kind of sync reports, in order. A configuration written
// into a remote's memory is backed up first, then read back and the remote
// restarted; a Harmony Touch hands up the changes made on its own screens
// first, and commits what it is sent by itself.
const configurationPhases = [
  'identify',
  'check',
  'build',
  'backup',
  'write',
  'verify',
  'restart',
];

const documentPhases = [
  'identify',
  'check',
  'build',
  'hand-over',
  'write',
];

// A pretend remote answers a sync as a remote on the cable does, its events,
// outcomes and failures included, with nothing attached; it holds what was
// synced to it for as long as the object lives.
const harmonyOne = {
  name: 'Harmony One',
};

const one = pretendRemote({
  model: harmonyOne,
});

const document = livingRoom(harmonyOne);

// The journal is required: every line the write path reports, which is the
// record of what was sent to the remote. It is kept where it outlives the
// process, here a file in a folder of its own, so that a sync that is cut off
// part way still leaves its account behind. The events are for a person
// watching and are not that record.
const folder = mkdtempSync(join(tmpdir(), 'sync-journal-'));
const journalFile = join(folder, 'journal.txt');

function journal(line: string): void {
  appendFileSync(journalFile, `${line}\n`);
}

// A configuration is stamped with the moment it is built at, and a Harmony One
// sets its clock from that stamp when it starts cold, so a sync passes the
// current moment. The same moment is kept for a sync run again, since a remote
// that holds part of a build recognises its own blocks only against the same
// bytes.
const builtAt = localTimestamp(new Date());
const events: SyncEvent[] = [];

const outcome = await syncDocument({
  document,
  remote: one,
  sources: { builtAt },
  commit: true,
  onEvent: (event) => events.push(event),
  journal,
});

assert.deepEqual(outcome, {
  result: 'written',
  remote: 'new-configuration',
});

// The phases it went through, and what it asked of a person on the way.
const phases = events.flatMap((event) => {
  return event.kind === 'phase' ? [event.phase] : [];
});

const attention = events.flatMap((event) => {
  return event.kind === 'attention' ? [event.attention] : [];
});

assert.deepEqual(phases, configurationPhases);
assert.deepEqual(attention, ['do-not-unplug', 'restarting', 'safe-to-unplug']);

// The write reports how far it is, so a screen can show a bar.
const progress = events.flatMap((event) => {
  return event.kind === 'progress' && event.phase === 'write' ? [event] : [];
});

const last = progress.at(-1)!;

assert.equal(last.done, last.total);

// The outcome is also the last event, and the journal holds the account.
assert.deepEqual(events.at(-1), {
  kind: 'outcome',
  outcome,
});

assert.ok(readFileSync(journalFile, 'utf8').length > 0);

// What every sync below has in common: the moment, the commit and the journal,
// and no one watching its events.
const common = {
  sources: { builtAt },
  commit: true,
  onEvent: () => {},
  journal,
};

// The same document built at the same moment again: the same bytes, so the
// remote already holds it.
const again = await syncDocument({
  ...common,
  document,
  remote: one,
});

assert.equal(again.result, 'nothing-to-write');

// A failure is an outcome, not an exception, and leaves the remote in a state
// of a closed list, which says what is true of it, whether it may be
// unplugged and what puts it right: data to act on, beside a sentence to
// show.
const failing = pretendRemote({
  model: harmonyOne,
  failIn: 'write',
});

const failed = await syncDocument({
  ...common,
  document,
  remote: failing,
});

assert.equal(failed.result, 'failed');
assert.equal(failed.phase, 'write');
assert.equal(failed.state, 'write-unfinished');
assert.equal(SYNC_STATES[failed.state!].unplug, false);

// So is a refusal. A Harmony 885's document can be started, and its build is
// not built yet: the sync gets as far as the build and ends `refused`, with
// the remote as it was.
const harmony885 = {
  name: 'Harmony 885',
};

const later = await syncDocument({
  ...common,
  document: recipe.create(harmony885),
  remote: pretendRemote({
    model: harmony885,
  }),
});

assert.deepEqual([later.result, later.remote], ['refused', 'as-before']);

// A sync rejects in two cases only, both before anything is opened. One is a
// document of a model whose sync is not built, with `NotBuiltError`, such as a
// Harmony 350's: every model but the Harmony One, 600, 650, 700 and 885 and
// the Harmony Touch. The other is a pretend remote `pretendRemote` did not
// make, with a `TypeError`.
const harmony350 = {
  name: 'Harmony 350',
};

const notBuilt = syncDocument({
  ...common,
  document: recipe.create(harmony350),
  remote: pretendRemote({
    model: harmony350,
  }),
});

await assert.rejects(notBuilt, NotBuiltError);

// So an application asks before it offers a sync. `syncIsBuilt`, given the
// document's model, is false in both cases above and true where a sync is
// there.
assert.equal(syncIsBuilt(harmony885), false);
assert.equal(syncIsBuilt(harmony350), false);
assert.equal(syncIsBuilt(document.model), true);

// A Harmony Touch asks for its documents and is answered: no backup, no read
// back and no restart, and a hand over of the changes made on its own screens
// first. Its build needs the account's identifiers, which an application
// holds already.
const touch = pretendRemote({
  model: {
    name: 'Harmony Touch',
  },
});

const touchPhases: string[] = [];

const synced = await syncDocument({
  document: saved('touch-test'),
  remote: touch,
  sources: {
    builtAt,
    account: inventedAccount,
  },
  commit: true,
  onEvent: (event) => {
    if (event.kind === 'phase') {
      touchPhases.push(event.phase);
    }
  },
  journal,
});

assert.equal(synced.result, 'written');
assert.deepEqual(touchPhases, documentPhases);
