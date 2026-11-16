/**
 * A sync of a document to an attached Harmony One, requirement R79, against the pretend remote of the compiled
 * families: no remote is touched by any of this.
 *
 * **What is claimed.**
 *
 * * **The path is `writeConfiguration` and nothing beside it.** A committed sync sends the remote exactly what a
 *   configuration write sends, in its order: the cache drop, then per block the erase and the write, the restart
 *   last, and nothing that changes the remote before the drop.
 * * **The events tell it as it happens**: identify, check and build before anything is opened; what the remote
 *   holds read and compared, with progress; the warning not to unplug before the first command that changes the
 *   remote; the write with progress, the read back, the restart, and the word that it may be unplugged.
 * * **What is not allowed ends as an outcome with the remote as it was**, and sends nothing: without the write
 *   flags, on another unit than the one recorded, for a unit the library does not list, on a remote that
 *   enumerates as another model, which is never opened at all.
 * * **A stop is honoured up to the first write**: asked before the sync, or while what the remote holds is read,
 *   nothing is written; asked once the write has begun, the sync finishes.
 * * **A screen that fails stops nothing**: with an observer that throws on every event the remote is written all
 *   the same.
 * * **A write that fails part way is finished by the same sync run again.** The first run ends `failed` in `write`,
 *   the remote `write-unfinished` and no restart sent; the second, built at the same moment, recognises the block it
 *   left and ends `written`, and one built at another moment is refused.
 * * **A failure is told in words of the phase it happened in, and names no bench command.** A read back that differs
 *   from what was written, though every block read back as written while it was, ends in `verify` and
 *   `read-back-failed`, never as a write that stopped part way; and a commit without the write flags is refused in
 *   words that name no switch, the rail's own words kept in the journal.
 * * **The Harmony 600, 650 and 700 sync through the same path** on the same stand in, each as its own model on the
 *   cable: its document built, compared, written, read back and restarted, and refused on a remote of another skin.
 *
 * **What is not claimed.** Anything about a remote: the stand in keeps flash as an array and asserts the real
 * rails, `fake-classic-remote.ts`, and what a remote does with a document's configuration is the bench's to say.
 *
 * The runs that commit are processes of their own with the two write flags set, `sync-attached-run.ts`; every
 * other run is in this process, where the flags are not set, which is itself the control for the first of them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { NotBuiltError, recipe } from '@harmony/codec/node';
import { SYNC_STATES, syncDocument, type SyncRequest } from '../../src/write.ts';
import { SWITCHED_OFF } from '../../src/sync.ts';
import { runSync, runSyncCommitted, runSyncCommittedAll, type SyncRun } from './sync-attached-run.ts';

/** One run in a process of its own with the two write flags set, `runSyncCommitted`. */
const withFlags = runSyncCommitted;

/** The pretend remote's calls that change a remote. */
const changes = (run: SyncRun): string[] => run.calls.filter((call) => /^(eraseFlash|writeFlash|invalidateCachedRegions|resetDevice)/.test(call));
/** The words of a run without its progress, which is its shape. */
const shape = (words: readonly string[]): string[] => words.filter((word) => !/ \d+\/\d+$/.test(word));
const progress = (words: readonly string[], phase: string): string[] => words.filter((word) => word.startsWith(`${phase} `));
/** What an application's user has none of: a switch, a script, a path of this repository or a command line option. */
const BENCH = /HARMONY_[A-Z_]|\bnode\b|\bbin\/|\.ts\b|\.md\b|(^|\s)--[a-z]/;

test('a committed sync writes the blocks that differ, in the configuration write\'s own order, and tells it as it happens', () => {
  const run = withFlags({ commit: true });
  assert.deepEqual(run.outcome, { result: 'written', remote: 'new-configuration' });
  assert.deepEqual(shape(run.words), [
    'identify', 'check', 'build', 'backup', '! do-not-unplug', 'write', 'verify', '! restarting', 'restart', '! safe-to-unplug', '= written',
  ]);
  // Two builds of one setup at two moments differ in their stamps, which sit in one block: it is compared with
  // what the keeper holds before it is erased, and written.
  assert.deepEqual(progress(run.words, 'backup'), ['backup 1/1']);
  assert.deepEqual(progress(run.words, 'write'), ['write 1/1']);
  // What reached the remote, in order: the drop first, each block erased and then written, the restart last.
  const sent = changes(run);
  assert.equal(sent[0], 'invalidateCachedRegions');
  assert.equal(sent.at(-1), 'resetDevice');
  assert.deepEqual(sent.slice(1, -1).map((call) => call.split(' ')[0]), ['eraseFlash', 'writeFlash']);
  assert.equal(run.holdsTheBuild, true);
  // The keeper was handed what was written, once, before the remote was opened once.
  assert.deepEqual([run.kept, run.keptTheBuild, run.opened], [1, true, 1]);
  assert.ok(run.calls.includes('close'));
});

test('without the write flags a committed sync is refused with the remote as it was, and a dry run says what it would write', async () => {
  // This process has neither flag: the rail refuses after every read and before anything is sent.
  assert.equal(process.env['HARMONY_ENABLE_WRITES'], undefined);
  const refused = await runSync({ commit: true });
  assert.deepEqual(refused.outcome, { result: 'refused', remote: 'as-before', message: SWITCHED_OFF });
  assert.doesNotMatch(refused.outcome.message!, BENCH);
  // The rail's own words, which name the switch, are the journal's, for a person at the bench.
  assert.ok(refused.lines.some((line) => /^sync: the rail refused: .*HARMONY_ENABLE_WRITES=1/.test(line)), refused.lines.join('\n'));
  assert.deepEqual(changes(refused), []);
  assert.equal(refused.unchanged, true);
  assert.equal(refused.words.includes('! do-not-unplug'), false);

  const dry = await runSync({});
  assert.deepEqual(dry.outcome, { result: 'dry-run', remote: 'as-before', message: 'everything up to the write was done, and 1 block would be written' });
  assert.deepEqual(shape(dry.words), ['identify', 'check', 'build', 'backup', '= dry-run']);
  assert.deepEqual(changes(dry), []);
  assert.equal(dry.unchanged, true);
  // A dry run keeps nothing, since nothing is about to be written.
  assert.equal(dry.kept, 0);
});

test('another unit, a unit the library does not list and a remote of another model are refused with nothing sent, the last without being opened', () => {
  const other = withFlags({ commit: true, onCable: 2 });
  const unlisted = withFlags({ commit: true, label: 'one_everyday' });
  // A Harmony 650 enumerates as skin 68.
  const model = withFlags({ commit: true, release: 0x1068 });
  for (const run of [other, unlisted, model]) {
    assert.deepEqual([run.outcome.result, run.outcome.remote], ['refused', 'as-before']);
    assert.deepEqual(changes(run), []);
    assert.equal(run.unchanged, true);
  }
  assert.match(unlisted.outcome.message!, /one_everyday is not a unit this may write/);
  assert.match(model.outcome.message!, /skin 54.*skin 68/);
  assert.deepEqual([other.opened, unlisted.opened, model.opened], [1, 0, 0]);
  assert.deepEqual(model.words, ['identify', '= refused']);
  // The control: the same run on the recorded unit is the first test's, which is written.
});

test('a stop asked before the write leaves the remote as it was, and one asked once it has begun lets the sync finish', () => {
  const start = withFlags({ commit: true, stopAt: 'start' });
  assert.deepEqual(start.words, ['= stopped']);
  assert.equal(start.opened, 0);
  const reading = withFlags({ commit: true, stopAt: 'backup' });
  assert.deepEqual([reading.outcome.result, reading.outcome.remote], ['stopped', 'as-before']);
  assert.deepEqual(changes(reading), []);
  assert.equal(reading.unchanged, true);
  assert.equal(reading.words.includes('! do-not-unplug'), false);
  const writing = withFlags({ commit: true, stopAt: 'write' });
  assert.deepEqual(writing.outcome, { result: 'written', remote: 'new-configuration' });
  assert.equal(writing.holdsTheBuild, true);
});

test('an observer that throws on every event stops nothing: the remote is written and restarted', () => {
  const run = withFlags({ commit: true, observerThrows: true });
  assert.deepEqual(run.outcome, { result: 'written', remote: 'new-configuration' });
  assert.equal(run.holdsTheBuild, true);
  assert.equal(changes(run).at(-1), 'resetDevice');
});

test('a write that fails part way ends failed with no restart sent, and the same sync run again finishes it', () => {
  // The first flash write of the block fails: the block is erased and holds nothing of the file.
  const run = withFlags({ commit: true, failWrite: 1 });
  assert.deepEqual(run.outcome, {
    result: 'failed', remote: 'needs-recovery', phase: 'write', state: 'write-unfinished', message: 'the write stopped part way: the cable was pulled',
  });
  assert.match(SYNC_STATES['write-unfinished'].next, /run the same sync again, built at the same moment/);
  assert.equal(run.words.includes('! safe-to-unplug'), false);
  assert.equal(run.words.includes('restart'), false);
  // The second run: written, and the one restart of the two runs is its own, the last thing sent.
  assert.deepEqual(run.again?.outcome, { result: 'written', remote: 'new-configuration' });
  assert.equal(run.holdsTheBuild, true);
  assert.deepEqual(changes(run).filter((call) => call === 'resetDevice'), ['resetDevice']);
  assert.equal(changes(run).at(-1), 'resetDevice');
  // The reason the second run is built at the first one's moment, on a write that fails at its twelfth flash
  // write, by when the block holds bytes of the build's stamp: built at the same moment the second run finishes
  // it; built seven seconds later its stamps differ, the block is no longer its own unfinished write, and the
  // write refuses to erase what it does not know. A block that was erased and not yet written, the first run
  // above, is finished at any moment, since erased flash holds nothing to lose.
  const same = withFlags({ commit: true, failWrite: 12 });
  assert.deepEqual([same.outcome.result, same.again?.outcome.result, same.holdsTheBuild], ['failed', 'written', true]);
  const later = withFlags({ commit: true, failWrite: 12, againAtAnotherMoment: true });
  assert.deepEqual([later.outcome.result, later.again?.outcome.result, later.holdsTheBuild], ['failed', 'refused', false]);
  assert.equal(changes(later).includes('resetDevice'), false);
});

test('a remote that already holds the document\'s configuration is nothing to write', async () => {
  const run = await runSync({ commit: true, holdsTheDocument: true });
  assert.deepEqual([run.outcome.result, run.outcome.remote], ['nothing-to-write', 'as-before']);
  assert.deepEqual(changes(run), []);
});

test('a sync to an attached remote of a model with a write path of its own refuses by name, before anything is read but the document\'s model', async () => {
  for (const name of ['Harmony 350']) {
    const untouched = new Proxy({}, {
      get: (_, member) => {
        if (member === 'remote') return { kind: 'attached' };
        if (member === 'document') return { model: { name } };
        throw new Error(`the request's ${String(member)} was read`);
      },
    }) as SyncRequest;
    await assert.rejects(() => syncDocument(untouched), (error: unknown) => {
      assert.ok(error instanceof NotBuiltError);
      assert.deepEqual([error.contract, error.requirement], [`syncDocument for an attached ${name}`, 79]);
      return true;
    });
  }
  // The control that the model is what decides: the same request for a Harmony One, and for a Harmony Touch, whose
  // sync is built since, `sync-attached-touch.test.ts`, is read further.
  for (const model of [{ name: 'Harmony One', skin: 54 }, { name: 'Harmony Touch', skin: 99 }]) {
    const further = new Proxy({}, {
      get: (_, member) => {
        if (member === 'remote') return { kind: 'attached' };
        if (member === 'document') return recipe.create(model);
        throw new Error(`the request's ${String(member)} was read`);
      },
    }) as SyncRequest;
    await assert.rejects(() => syncDocument(further), /the request's journal was read/, model.name);
  }
});

test('a keeper that cannot keep the configuration ends the sync failed with the remote as it was, in its own words, with nothing opened', () => {
  // An application learns of every failure through the outcome, so a keeper's throw is one too, never a rejection.
  const run = withFlags({ commit: true, keepFails: 'the disk holding the backups is full' });
  assert.deepEqual(run.outcome, { result: 'failed', remote: 'as-before', phase: 'build', message: 'the disk holding the backups is full' });
  assert.deepEqual(run.words, ['identify', 'check', 'build', '= failed']);
  assert.deepEqual([run.opened, run.kept, changes(run).length, run.unchanged], [0, 0, 0, true]);
  // The control: the same run with a keeper that keeps is the first test's, which is written.
});

test('a document the check refuses more than once is refused naming its first problem and counting the rest, in one wording', async () => {
  // Two keys given a second command when held, a press no key of a Harmony One has: two problems, the second counted,
  // with nothing opened.
  const run = await runSync({ heldKeys: true });
  assert.deepEqual(run.outcome, {
    result: 'refused', remote: 'as-before',
    message: 'Television\'s own map gives the VolumeUp key a held press, which the VolumeUp key of a Harmony One does not have, and 1 more problem the check lists',
  });
  assert.deepEqual(run.words, ['identify', 'check', '= refused']);
  assert.equal(run.opened, 0);
});

test('a read back that differs from what was written ends in verify, the remote read-back-failed, and never as a write that stopped part way', () => {
  // Every block was written and read back as written; then one byte of the configuration reads otherwise, which the
  // read of the whole configuration meets, through its trailer checksum or its comparison with the build.
  const run = withFlags({ commit: true, verifyDiffers: true });
  assert.deepEqual([run.outcome.result, run.outcome.remote, run.outcome.phase, run.outcome.state], ['failed', 'needs-recovery', 'verify', 'read-back-failed']);
  assert.ok(run.outcome.message!.startsWith('every block was written, and the whole configuration did not read back as written: '), run.outcome.message);
  assert.doesNotMatch(run.outcome.message!, /stopped part way/);
  assert.deepEqual(shape(run.words), ['identify', 'check', 'build', 'backup', '! do-not-unplug', 'write', 'verify', '= failed']);
  // No restart was sent, and no restart is asked of a person: the remote does not hold the new configuration whole.
  assert.equal(changes(run).includes('resetDevice'), false);
  assert.equal(run.words.includes('! restart-by-hand'), false);
  // The control: the write that stopped part way, the test above, is told as one and not as a read back.
  const stopped = withFlags({ commit: true, failWrite: 1 });
  assert.deepEqual([stopped.outcome.phase, stopped.outcome.state], ['write', 'write-unfinished']);
});

test('an erase that reaches the block beside its own ends in write, the remote neighbour-erased, and nothing a person is told says to run it again', () => {
  // The first erase sets the block above to 0xff as well, which the block write reads before the first data report.
  const [run, stopped] = runSyncCommittedAll([{ commit: true, eraseReaches: true }, { commit: true, failWrite: 1 }]);
  assert.deepEqual([run!.outcome.result, run!.outcome.remote, run!.outcome.phase, run!.outcome.state],
    ['failed', 'needs-recovery', 'write', 'neighbour-erased']);
  assert.ok(run!.outcome.message!.startsWith('the write stopped part way: the erase changed 0x'), run!.outcome.message);
  // What the outcome and its state tell a person, none of which offers the same sync again; the state may not be
  // unplugged, and what it holds is not the new configuration, so no restart was sent or asked for.
  const told = [run!.outcome.message!, SYNC_STATES['neighbour-erased'].holds, SYNC_STATES['neighbour-erased'].next];
  for (const said of told) assert.doesNotMatch(said, /(?<!not )run (it|the (same )?sync|this) again|try again|rerun/, said);
  assert.match(SYNC_STATES['neighbour-erased'].next, /do not run the sync again/);
  assert.equal(SYNC_STATES['neighbour-erased'].unplug, false);
  assert.equal(changes(run!).includes('resetDevice'), false);
  assert.equal(run!.words.includes('! restart-by-hand'), false);
  assert.equal(run!.words.includes('! safe-to-unplug'), false);
  // Nothing was written into the block after its erase: the write stopped before its first data report.
  assert.equal(changes(run!).includes('writeFlash'), false);
  // The control: a write that stopped part way on the same stand in is the state that offers the sync again.
  assert.deepEqual([stopped!.outcome.phase, stopped!.outcome.state], ['write', 'write-unfinished']);
  assert.match(SYNC_STATES[stopped!.outcome.state!].next, /run the same sync again/);
});

test('a document of a Harmony 600, 650 and 700 is synced to an attached remote of its model through the same path, and refused on another', () => {
  const models = ['Harmony 600', 'Harmony 650', 'Harmony 700'] as const;
  // Written, and refused on a remote that enumerates as the Harmony One, in one process with the write flags set.
  const runs = runSyncCommittedAll(models.flatMap((model) => [{ model, commit: true }, { model, commit: true, release: 0x1054 }]));
  for (const [k, model] of models.entries()) {
    const written = runs[2 * k]!;
    const elsewhere = runs[2 * k + 1]!;
    assert.deepEqual(written.outcome, { result: 'written', remote: 'new-configuration' }, model);
    assert.deepEqual(shape(written.words), [
      'identify', 'check', 'build', 'backup', '! do-not-unplug', 'write', 'verify', '! restarting', 'restart', '! safe-to-unplug', '= written',
    ], model);
    // The configuration write's own order on the cable, and the remote holds the build.
    const sent = changes(written);
    assert.deepEqual([sent[0], sent.at(-1)], ['invalidateCachedRegions', 'resetDevice'], model);
    assert.equal(written.holdsTheBuild, true, model);
    assert.deepEqual([elsewhere.outcome.result, elsewhere.outcome.remote, elsewhere.words], ['refused', 'as-before', ['identify', '= refused']], model);
    assert.match(elsewhere.outcome.message!, new RegExp(`^the document is for a ${model}, skin \\d+, and the remote on the cable reports skin 54$`), model);
    assert.equal(elsewhere.opened, 0, model);
  }
});
