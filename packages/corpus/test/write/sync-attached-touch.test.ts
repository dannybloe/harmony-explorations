/**
 * A sync of a document to an attached Harmony Touch, requirement R79, against the pretend Touch of the request
 * channel's tests: no remote is touched by any of this.
 *
 * **What is claimed.**
 *
 * * **The path is `answerTouchSync` and nothing beside it.** A committed sync sends the remote exactly the requests the
 *   answerer sends, in its order: the provisioning read, the hand over and its list, the sync and every list answered,
 *   and the six documents and our two pictures answered 200 with the set the keeper was handed, under the set's tags.
 * * **The events are the pretend remote's for a document model**, word for word, `sync-contract.test.ts`: identify,
 *   check, build, the warning not to unplug, the hand over, the write, the word that it may be unplugged, and no
 *   progress. The hand over and the write are entered on the answerer's own lines saying so, which are forms of its
 *   list, `SYNC_LINES`, and follow them in the journal.
 * * **Nothing opens without everything a commit needs, and a dry run reads the identity file and the power source alone**: without the two
 *   flags a commit is refused with the remote as it was, having made no folder and kept nothing, and a dry run ends
 *   after the build with no flag needed, as `bin/touch-sync.ts --document` without `--commit` does, having opened
 *   the remote once, read the identity file and `/tde/powerstate` and closed it, and opened nothing else.
 * * **A power source but `usb` is refused with the remote as it was**, in a dry run and in a commit alike, naming
 *   what the remote reported: the commit's transport opened `/tde/powerstate` and `/sys/sysinfo` for reading and
 *   never `/sys/hlapi`, by the pretend Touch's own record, so no request was sent, and no event that acts was given.
 * * **What does not fit is refused by name before anything is opened**: a Touch's document on a remote that
 *   enumerates as a Harmony One, a Harmony One's document on a Touch, a keeper of the other kind on either, a unit
 *   the library does not list, an address the keeper lacks, and a folder that already holds a run.
 * * **The outcome says what the remote was left as**: a refusal before the remote was acted on, by the session's unit
 *   check or the provisioning read, `refused` and `as-before`; one after it `failed` and `needs-recovery`, named by
 *   its phase, worded for it and naming the state it left: a document the set lacks once the sync started, and an
 *   answer that never came then, `write` and `stopped-after-hand-over`; a change the remote handed up that the set
 *   would revert, a hand over refused, `hand-over` and `stopped-after-hand-over`, the sync not started; a request list
 *   answered with an error inside the hand over, `hand-over` and `stopped-in-hand-over`. The answerer's recovery order
 *   and abort cost, the bench's commands, are in the journal and never in the message. The remote's own abort is
 *   `failed` and `as-before`.
 * * **No word an application's user is shown names a switch**: a commit without the request flags is refused in
 *   words of its own, the rail's kept in the journal.
 * * **A stop is honoured up to the moment the remote is opened and never after**, and a screen that throws stops
 *   nothing.
 * * **A press a key of the Touch has passes**: a held key in a device's own map is checked, built and delivered, and
 *   changes the map document alone; a double press, which only a gesture has, is refused by the check.
 *
 * **What is not claimed.** Anything about a remote: the stand in answers as the scenario says, and what a Harmony
 * Touch does with the set is the bench's to say. Nor that a sync whose every answer is 304 can be told apart: the
 * contract's `nothing-to-write` is never a Touch's outcome, `SyncOutcome`'s header.
 *
 * The runs that commit are processes of their own with the two request flags set, `sync-attached-touch-run.ts`; every
 * other run is in this process, where the flags are not set, which is itself the control for the first of them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { HAND_OVER, PROVISIONING, READ_LIST, SYNC, WRITE_ANSWERS } from '../../src/touchsync.ts';
import { RECOVERY, SYNC_LINES } from '../../src/write.ts';
import { SWITCHED_OFF } from '../../src/sync.ts';

/** What an application's user has none of: a switch, a script, a path of this repository or a command line option. */
const BENCH = /HARMONY_[A-Z_]|\bnode\b|\bbin\/|\.ts\b|\.md\b|(^|\s)--[a-z]/;
import { ADDRESSES, defaultSync, runTouchSync, runTouchSyncCommitted, runTouchSyncCommittedAll, type TouchScenario } from './sync-attached-touch-run.ts';

/** One run in a process of its own with the two request flags set and the recovery flag unset, `runTouchSyncCommitted`. */
const withFlags = runTouchSyncCommitted;

/** The words of a written sync, the same as the pretend remote's for a document model. */
const WRITTEN = ['identify', 'check', 'build', '! do-not-unplug', 'hand-over', 'write', '! safe-to-unplug', '= written'];

test('a committed sync is answered by the answerer alone, the set the keeper kept delivered 200, and told as the pretend remote tells it', () => {
  const run = withFlags({ commit: true });
  assert.deepEqual(run.outcome, { result: 'written', remote: 'new-configuration' });
  assert.deepEqual(run.words, WRITTEN);
  // What reached the remote, by request, in the answerer's order: the provisioning read, the hand over and its one
  // list, the sync, and three lists each read and answered.
  assert.deepEqual(run.written, [
    PROVISIONING, HAND_OVER, READ_LIST, WRITE_ANSWERS,
    SYNC, READ_LIST, WRITE_ANSWERS, READ_LIST, WRITE_ANSWERS, READ_LIST, WRITE_ANSWERS,
  ]);
  // The set kept once, before anything was opened, and delivered: each of its eight answers 200 with its own body and
  // tag, at the address the remote asked, and the two endings 200 with nothing else.
  assert.deepEqual([run.kept.length, run.folders, run.opened, run.closed], [1, 1, 1, true]);
  const set = run.kept[0]!;
  assert.equal(set.answers.length, 8);
  const delivered = run.answers.filter((a) => !a.uri.startsWith('proxy://'));
  assert.deepEqual(delivered.map((a) => [a.uri, a.statusCode, a.etag, JSON.stringify(a.resource)]),
    set.answers.map((a) => [a.uri, '200', a.etag, JSON.stringify(a.resource)]));
  assert.deepEqual(run.answers.filter((a) => a.uri.startsWith('proxy://')).map((a) => [a.uri, a.statusCode]),
    [['proxy://Finished', '200'], ['proxy://Finished', '200']]);
  // The six at the keeper's addresses, in the order the remote asks for them.
  assert.deepEqual(set.answers.slice(0, 6).map((a) => a.uri), Object.values(ADDRESSES));
  // The journal holds the session's unit check and the answerer's account, and each phase after the line that starts it.
  assert.ok(run.journal.includes('the unit matches its record'));
  const at = (line: string): number => run.journal.indexOf(line);
  assert.ok(at('sync: handing over the remote\'s changes') >= 0 && at('sync: handing over the remote\'s changes') + 1 === at('sync: hand-over'));
  assert.ok(at('sync: started') >= 0 && at('sync: started') + 1 === at('sync: write'));
  assert.equal(run.journal.at(-2), 'sync: finished');
  assert.equal(run.journal.at(-1), 'sync: written, the remote new-configuration');
  // The two lines the events follow are forms of the answerer's own list, so a reworded line fails here.
  for (const line of ['sync: handing over the remote\'s changes', 'sync: started']) assert.ok(SYNC_LINES.some((form) => form.test(line)), line);
});

test('without the request flags a commit is refused with nothing made, kept or opened, and a dry run reads the identity file and the power source alone and needs no flag', async () => {
  // This process has neither flag.
  assert.equal(process.env['HARMONY_TOUCH_REQUESTS'], undefined);
  const refused = await runTouchSync({ commit: true });
  assert.deepEqual(refused.outcome, { result: 'refused', remote: 'as-before', message: SWITCHED_OFF });
  assert.doesNotMatch(SWITCHED_OFF, BENCH);
  // The rail's words, which name the switches, are the journal's, for a person at the bench.
  assert.ok(refused.journal.includes('sync: the rail refused: --commit needs HARMONY_ENABLE_WRITES=1 and HARMONY_TOUCH_REQUESTS=1'), refused.journal.join('\n'));
  assert.deepEqual(refused.words, ['identify', 'check', 'build', '= refused']);
  assert.deepEqual([refused.kept.length, refused.folders, refused.opened, refused.written.length], [0, 0, 0, 0]);

  const dry = await runTouchSync({});
  assert.deepEqual(dry.outcome, {
    result: 'dry-run', remote: 'as-before', message: 'everything before the remote is acted on was done, and the set holds 6 documents and 2 pictures',
  });
  assert.deepEqual(dry.words, ['identify', 'check', 'build', '= dry-run']);
  // Opened once for the one read, and closed; nothing kept, no folder, no request line.
  assert.deepEqual([dry.kept.length, dry.folders, dry.opened, dry.closed, dry.written.length], [0, 0, 1, true, 0]);
  assert.deepEqual(dry.openedPaths, ['/sys/sysinfo R', '/tde/powerstate R']);
  assert.ok(dry.journal.includes('sync: built 6 documents and 2 pictures, a set of 8 answers the gate passes'), dry.journal.join('\n'));
  assert.ok(dry.journal.includes('sync: power source, usb'), dry.journal.join('\n'));
});

test('with the recovery flag set as well a commit is refused in the same words as without the request flags, and the journal says which', () => {
  // The outcome is one sentence for both ways a switch refuses, so an application shows the same thing; the rail's
  // own words, kept in the journal, are what tell a person at the bench it was the recovery switch.
  const [refused] = runTouchSyncCommittedAll([{ commit: true }], true);
  assert.deepEqual(refused!.outcome, { result: 'refused', remote: 'as-before', message: SWITCHED_OFF });
  assert.ok(refused!.journal.some((line) => line.startsWith('sync: the rail refused: --commit refuses with HARMONY_TOUCH_RECOVERY set')),
    refused!.journal.join('\n'));
  assert.deepEqual([refused!.kept.length, refused!.folders, refused!.opened, refused!.written.length], [0, 0, 0, 0]);
});

test('a power source but usb is refused with the remote as it was, in a dry run and a commit, before /sys/hlapi is opened', async () => {
  const cases: [string, string][] = [
    ['usb_charge\n', 'usb_charge'], ['battery\n', 'battery'], ['cradle', 'cradle'], ['no such source\n', 'an unexpected text, "no such source"'],
  ];
  for (const [served, said] of cases) {
    const message = `the remote reports its power source as ${said}, and a Harmony Touch takes part in a sync only on USB power `
      + 'from a computer\'s port, the source its software calls usb, when it shows its USB screen: connect it to a USB port '
      + 'of the computer on which it shows that screen, and sync again';
    const dry = await runTouchSync({ powerstate: served });
    assert.deepEqual(dry.outcome, { result: 'refused', remote: 'as-before', message }, served);
    assert.deepEqual(dry.words, ['identify', 'check', 'build', '= refused'], served);
    assert.deepEqual([dry.opened, dry.closed, dry.openedPaths], [1, true, ['/sys/sysinfo R', '/tde/powerstate R']], served);
    assert.ok(dry.journal.includes(`sync: power source, ${said}`), served);

    const commit = withFlags({ commit: true, powerstate: served });
    assert.deepEqual(commit.outcome, { result: 'refused', remote: 'as-before', message }, served);
    assert.deepEqual(commit.words, ['identify', 'check', 'build', '= refused'], served);
    // By the pretend Touch's own record: the power source and the identity read, and never /sys/hlapi, so no request
    // line was written; the transport was closed.
    assert.deepEqual(commit.openedPaths, ['/sys/sysinfo R', '/tde/powerstate R', '/sys/sysinfo R'], served);
    assert.deepEqual([commit.written, commit.answers.length, commit.closed], [[], 0, true], served);
    assert.ok(commit.journal.includes(`sync: power source, ${said}`), served);
  }
  // The control: the same commit on usb is written, its first open the power source and /sys/hlapi opened after it.
  const usb = withFlags({ commit: true });
  assert.deepEqual(usb.outcome, { result: 'written', remote: 'new-configuration' });
  assert.deepEqual(usb.openedPaths.slice(0, 4), ['/sys/sysinfo R', '/tde/powerstate R', '/sys/sysinfo R', '/sys/hlapi W']);
});

test('a document for another model, a keeper of the other kind, an unlisted unit, a missing address and a taken folder are refused by name before anything is opened', () => {
  const cases: [string, TouchScenario, string[], RegExp][] = [
    ['a Touch\'s document on a Harmony One', { remote: 'one' }, ['identify'], /^the document is for a Harmony Touch, skin 99, and the remote on the cable reports skin 54$/],
    ['a Harmony One\'s document on a Touch', { document: 'one' }, ['identify'], /^the document is for a Harmony One, skin 54, and the remote on the cable reports skin 99$/],
    ['a compiled keeper on a Touch', { keeper: 'compiled' }, ['identify'], /^the remote on the cable is a Harmony Touch, which asks for its documents and is answered, and its keeper holds what a write into flash needs/],
    ['a document keeper on a Harmony One', { document: 'one', remote: 'one' }, ['identify'], /^the remote on the cable is a Harmony One, whose configuration is written into flash, and its keeper holds what a sync of a remote that asks for documents needs/],
    ['an unlisted unit', { label: 'other' }, ['identify'], /^other is not a Harmony Touch this library may sync, so nothing was opened and nothing was sent$/],
    ['a missing address', { withoutAddress: 'Context' }, ['identify', 'check', 'build'], /^the account names no address of Context$/],
    ['no account', { noAccount: true }, ['identify', 'check', 'build'], /no account was given/],
    ['a taken folder', { folderTaken: true }, ['identify', 'check', 'build'], /already holds files, and a run never writes over another's$/],
  ];
  for (const [name, scenario, phases, message] of cases) {
    const run = withFlags({ commit: true, ...scenario });
    assert.deepEqual(run.words, [...phases, '= refused'], name);
    assert.equal(run.outcome.remote, 'as-before', name);
    assert.match(run.outcome.message ?? '', message, name);
    assert.deepEqual([run.kept.length, run.opened, run.written.length], [0, 0, 0], name);
  }
  // The control: the same run with nothing out of place is the first test's, which is written.
});

test('a refusal before the remote is acted on leaves it as it was, one after leaves it needing recovery, and its own abort leaves it as it was', () => {
  // Another Touch: the session's unit check refuses after the identity read, before any request is written.
  const other = withFlags({ commit: true, recordSerial: '20000101000000-999999' });
  assert.deepEqual([other.outcome.result, other.outcome.remote], ['refused', 'as-before']);
  assert.deepEqual([other.opened, other.closed, other.written.length], [1, true, 0]);
  // A remote provisioned in a hub's mode: refused after the read alone, nothing acted on.
  const hub = withFlags({ commit: true, provisioning: { accountId: '1', activeRemoteId: 2, mode: 3, se: true } });
  assert.deepEqual([hub.outcome.result, hub.outcome.remote], ['refused', 'as-before']);
  assert.match(hub.outcome.message!, /provisioned in mode 3/);
  assert.deepEqual(hub.words, ['identify', 'check', 'build', '= refused']);
  assert.deepEqual(hub.written, [PROVISIONING]);

  // A document the set lacks, asked once the sync has started: the answerer refuses and the remote needs recovery.
  const lacking = withFlags({ commit: true, sync: [[{ verb: 'GET', uri: 'harmony://Account/1/Other' }]] });
  assert.deepEqual(lacking.outcome, {
    result: 'failed', remote: 'needs-recovery', phase: 'write', state: 'stopped-after-hand-over',
    message: 'the sync stopped while the remote was being answered: the set holds no answer for Other',
  });
  assert.deepEqual(lacking.words, ['identify', 'check', 'build', '! do-not-unplug', 'hand-over', 'write', '= failed']);
  // The recovery order and what an abort would cost are the answerer's lines in the journal, for the bench.
  assert.ok(lacking.journal.includes(`sync: recovery, ${RECOVERY}`));
  assert.ok(lacking.journal.includes('sync: recovery, abort cost, none to a tag: an abort now leaves the committed set as it is'));

  // The remote's own abort: it kept the set it held, so it may be unplugged.
  const aborted = withFlags({ commit: true, sync: [[{ verb: 'POST', uri: 'proxy://Abort' }]] });
  assert.deepEqual(aborted.outcome, { result: 'failed', remote: 'as-before', phase: 'write', message: 'the remote aborted the sync, deleted what it had gathered and kept the set it held' });
  assert.deepEqual(aborted.words, ['identify', 'check', 'build', '! do-not-unplug', 'hand-over', 'write', '! safe-to-unplug', '= failed']);
  // The control: the default lists, the first test's, end written.
  assert.equal(defaultSync().length, 3);
});

test('a stop is honoured up to the moment the remote is opened and not after, and a screen that throws stops nothing', () => {
  const start = withFlags({ commit: true, stopAt: 'start' });
  assert.deepEqual(start.words, ['= stopped']);
  const building = withFlags({ commit: true, stopAt: 'build' });
  assert.deepEqual(building.outcome, { result: 'stopped', remote: 'as-before', message: 'stopped before the remote was opened, with nothing written' });
  assert.deepEqual([building.kept.length, building.folders, building.opened], [0, 0, 0]);
  // Asked once the hand over has begun: the sync runs to its end.
  const late = withFlags({ commit: true, stopAt: 'hand-over' });
  assert.deepEqual(late.outcome, { result: 'written', remote: 'new-configuration' });
  const throwing = withFlags({ commit: true, observerThrows: true });
  assert.deepEqual(throwing.outcome, { result: 'written', remote: 'new-configuration' });
  assert.equal(throwing.answers.filter((a) => a.statusCode === '200').length, 10);
});

test('a keeper that cannot make its folder or keep the set ends the sync failed with the remote as it was, in its own words, with nothing opened', () => {
  // An application learns of every failure through the outcome, so a keeper's throw is one too, never a rejection, as
  // it is for the keeper of a write into flash, `sync-attached.test.ts`.
  for (const [scenario, message] of [
    [{ folderFails: 'the folder for the run cannot be made' }, 'the folder for the run cannot be made'],
    [{ keepFails: 'the disk holding the sets is full' }, 'the disk holding the sets is full'],
  ] as const) {
    const run = withFlags({ commit: true, ...scenario });
    assert.deepEqual(run.outcome, { result: 'failed', remote: 'as-before', phase: 'build', message }, message);
    assert.deepEqual(run.words, ['identify', 'check', 'build', '= failed'], message);
    assert.deepEqual([run.opened, run.kept.length, run.written.length, run.answers.length], [0, 0, 0, 0], message);
  }
  // The control: the same run with a keeper that keeps is the first test's, which is written.
});

test('a held key in a Touch device\'s own map passes the sync\'s check and build and is delivered, changing the map document alone', () => {
  // The volume keys of the LG TV's own map given a command when held, a press those keys have on a Touch; the reference
  // holds one held key of that map already, Menu, and these two are the case on their own, beside the plain run.
  const held = withFlags({ commit: true, heldKeys: true });
  assert.deepEqual(held.outcome, { result: 'written', remote: 'new-configuration' });
  assert.deepEqual(held.words, WRITTEN);
  // The control: the plain reference, built and delivered by the same run, differs from it in the map document alone,
  // so the two held presses reached the set rather than being passed over.
  const plain = withFlags({ commit: true });
  const byAddress = (run: typeof held): Map<string, string> =>
    new Map(run.kept[0]!.answers.map((a) => [a.uri, JSON.stringify(a.resource)]));
  const ours = byAddress(held), theirs = byAddress(plain);
  assert.deepEqual([...ours.keys()], [...theirs.keys()]);
  assert.deepEqual([...ours.keys()].filter((uri) => ours.get(uri) !== theirs.get(uri)), [ADDRESSES['MapList']]);
});

test('a Touch\'s document the check refuses more than once is refused naming its first problem and counting the rest, in the wording a flash sync uses', async () => {
  // Two keys given a double press, which no key of a Harmony Touch has: two problems, the second counted.
  const run = await runTouchSync({ doubleKeys: true });
  assert.deepEqual(run.outcome, {
    result: 'refused', remote: 'as-before',
    message: 'LG TV\'s own map gives the VolumeUp key a double press, which the VolumeUp key of a Harmony Touch does not have, and 1 more problem the check lists',
  });
  assert.deepEqual(run.words, ['identify', 'check', '= refused']);
  assert.equal(run.opened, 0);
});

test('a failure in each phase the remote is acted on in is named by that phase and worded for it: a hand over refused, a request list answered with an error, an answer that never came', () => {
  const [refusedHandOver, failedHandOver, silent, opened] = runTouchSyncCommittedAll([
    { commit: true, handsUpSettings: true }, { commit: true, handOverFails: true }, { commit: true, silentOnceStarted: true },
    { commit: true, openFails: 'the remote did not answer when it was asked which unit it is' },
  ]);
  // The remote handed up the Settings the set holds: the hand over ended and committed it, and the answerer refused to
  // start a sync that would revert it, so the sync was not started.
  assert.deepEqual([refusedHandOver!.outcome.result, refusedHandOver!.outcome.remote, refusedHandOver!.outcome.phase, refusedHandOver!.outcome.state],
    ['failed', 'needs-recovery', 'hand-over', 'stopped-after-hand-over']);
  assert.ok(refusedHandOver!.outcome.message!.startsWith('the remote handed its own changes up, and the sync was not started: the remote handed up Settings, which the set also holds'),
    refusedHandOver!.outcome.message);
  assert.deepEqual(refusedHandOver!.words, ['identify', 'check', 'build', '! do-not-unplug', 'hand-over', '= failed']);
  assert.equal(refusedHandOver!.written.includes(SYNC), false, 'no sync request was sent');
  // A request list of the hand over answered with an error: stopped inside the hand over, where an abort would cost a tag.
  assert.deepEqual(failedHandOver!.outcome, {
    result: 'failed', remote: 'needs-recovery', phase: 'hand-over', state: 'stopped-in-hand-over',
    message: 'the sync stopped while the remote handed its own changes up: the remote answered a request list with status 500',
  });
  // No reply once the sync started, an answer that never came: told as such, in the write.
  assert.deepEqual([silent!.outcome.result, silent!.outcome.remote, silent!.outcome.phase, silent!.outcome.state],
    ['failed', 'needs-recovery', 'write', 'stopped-after-hand-over']);
  assert.match(silent!.outcome.message!, /^the sync stopped while the remote was being answered: no reply to the .* within \d+ ms$/);
  // The remote not opened: nothing acted on, named by identify, where the remote is asked which unit it is.
  assert.deepEqual(opened!.outcome, {
    result: 'failed', remote: 'as-before', phase: 'identify',
    message: 'the remote could not be opened and identified, so nothing that acts on it was sent: the remote did not answer when it was asked which unit it is',
  });
  for (const run of [refusedHandOver!, failedHandOver!, silent!, opened!]) assert.doesNotMatch(run.outcome.message!, BENCH);
  // The control: the same runs with nothing out of place are the first test's, which is written.
});
