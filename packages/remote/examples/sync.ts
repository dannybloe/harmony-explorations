// A document synced to a pretend Harmony One and a pretend Harmony Touch, following what the sync reports.
import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { localTimestamp, NotBuiltError, recipe, type TouchAccount } from '@freeharmony-sdk/config/node';
import { pretendRemote, SYNC_STATES, syncDocument, type SyncEvent } from '@freeharmony-sdk/remote/write';

import { livingRoom, saved } from './library.ts';

// A pretend remote answers a sync as a remote on the cable does, its events, outcomes and failures included, with
// nothing attached; it holds what was synced to it for as long as the object lives.
const one = pretendRemote({ model: { name: 'Harmony One' } });
const document = livingRoom({ name: 'Harmony One' });

// The journal is required: every line the write path reports, which is the record of what was sent to the remote.
// It is kept where it outlives the process, here a file in a folder of its own, so that a sync that is cut off part
// way still leaves its account behind; the events are for a person watching and are not that record.
const journalFile = join(mkdtempSync(join(tmpdir(), 'sync-journal-')), 'journal.txt');
const journal = (line: string): void => appendFileSync(journalFile, `${line}\n`);

// A configuration is stamped with the moment it is built at, and a Harmony One sets its clock from that stamp when it
// starts cold, so a sync passes the current moment. The same moment is kept for a sync run again, since a remote that
// holds part of a build recognises its own blocks only against the same bytes.
const builtAt = localTimestamp(new Date());

const events: SyncEvent[] = [];
const outcome = await syncDocument({
  document, remote: one, sources: { builtAt }, commit: true, onEvent: (event) => events.push(event), journal,
});
assert.deepEqual(outcome, { result: 'written', remote: 'new-configuration' });
assert.deepEqual(events.flatMap((event) => (event.kind === 'phase' ? [event.phase] : [])),
  ['identify', 'check', 'build', 'backup', 'write', 'verify', 'restart']);
assert.deepEqual(events.flatMap((event) => (event.kind === 'attention' ? [event.attention] : [])),
  ['do-not-unplug', 'restarting', 'safe-to-unplug']);
const progress = events.flatMap((event) => (event.kind === 'progress' && event.phase === 'write' ? [event] : []));
assert.equal(progress.at(-1)!.done, progress.at(-1)!.total);
// The outcome is also the last event, and the journal holds the account.
assert.deepEqual(events.at(-1), { kind: 'outcome', outcome });
assert.ok(readFileSync(journalFile, 'utf8').length > 0);

// The same document built at the same moment again: the same bytes, so the remote already holds it.
const again = await syncDocument({ document, remote: one, sources: { builtAt }, commit: true, onEvent: () => {}, journal });
assert.equal(again.result, 'nothing-to-write');

// A failure is an outcome, not an exception, and leaves the remote in a state of a closed list, which says what is
// true of it, whether it may be unplugged and what puts it right: data to act on, beside a sentence to show.
const failing = pretendRemote({ model: { name: 'Harmony One' }, failIn: 'write' });
const failed = await syncDocument({
  document, remote: failing, sources: { builtAt }, commit: true, onEvent: () => {}, journal,
});
assert.equal(failed.result, 'failed');
assert.equal(failed.phase, 'write');
assert.equal(failed.state, 'write-unfinished');
assert.equal(SYNC_STATES[failed.state!].unplug, false);

// So is a refusal. A Harmony 885's document can be started, and its build is not built yet: the sync gets as far as
// the build and ends `refused`, with the remote as it was.
const later = await syncDocument({
  document: recipe.create({ name: 'Harmony 885' }), remote: pretendRemote({ model: { name: 'Harmony 885' } }),
  sources: { builtAt }, commit: true, onEvent: () => {}, journal,
});
assert.deepEqual([later.result, later.remote], ['refused', 'as-before']);

// A sync rejects in two cases only, both before anything is opened: a document of a model whose sync is not built,
// with `NotBuiltError`, such as a Harmony 350's; and a pretend remote `pretendRemote` did not make, with a `TypeError`.
await assert.rejects(syncDocument({
  document: recipe.create({ name: 'Harmony 350' }), remote: pretendRemote({ model: { name: 'Harmony 350' } }),
  sources: { builtAt }, commit: true, onEvent: () => {}, journal,
}), NotBuiltError);

// A Harmony Touch asks for its documents and is answered: no backup, no read back and no restart, and a hand over of
// the changes made on its own screens first. Its build needs the account's identifiers, invented here: the SDK does
// not read them off a Touch or its account yet, so an application has to hold them already.
const account: TouchAccount = {
  context: {
    'AccountId-': '1000001', CountryCode: 'NL', Email: 'john.doe@example.com',
    HouseholdUserProfileUri: 'https://example.invalid/john-doe/household', InstallerId: null, Language: 'en-GB',
    SetupSession: { Type: 0, SetupType: null },
  },
  tuning: { DeviceProfileUri: 'https://example.invalid/john-doe/favourites', ContentProfileKey: 1 },
};
const touch = pretendRemote({ model: { name: 'Harmony Touch' } });
const phases: string[] = [];
const synced = await syncDocument({
  document: saved('touch-test'),
  remote: touch,
  sources: { builtAt, account },
  commit: true,
  onEvent: (event) => { if (event.kind === 'phase') phases.push(event.phase); },
  journal,
});
assert.equal(synced.result, 'written');
assert.deepEqual(phases, ['identify', 'check', 'build', 'hand-over', 'write']);
