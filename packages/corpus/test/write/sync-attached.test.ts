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
 * * **A write that fails part way is finished by the same sync run again.** The first run ends `failed` with the
 *   remote needing recovery and no restart sent; the second, built at the same moment, recognises the block it
 *   left and ends `written`, and one built at another moment is refused.
 *
 * **What is not claimed.** Anything about a remote: the stand in keeps flash as an array and asserts the real
 * rails, `fake-classic-remote.ts`, and what a Harmony One does with a document's configuration is the bench's to
 * say. Nor the other models this path serves, the Harmony 600, 650 and 700, which go through the same function
 * and are not run here.
 *
 * The runs that commit are processes of their own with the two write flags set, `sync-attached-run.ts`; every
 * other run is in this process, where the flags are not set, which is itself the control for the first of them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { NotBuiltError, recipe } from '@harmony/codec/node';
import { syncDocument, type SyncRequest } from '../../src/write.ts';
import { runSync, type SyncRun, type SyncScenario } from './sync-attached-run.ts';

/** One run in a process of its own with the two write flags set. */
function withFlags(scenario: SyncScenario): SyncRun {
  const out = execFileSync(process.execPath, [fileURLToPath(new URL('./sync-attached-run.ts', import.meta.url))], {
    input: JSON.stringify(scenario),
    env: { ...process.env, HARMONY_ENABLE_WRITES: '1', HARMONY_FIRST_WRITE: '1' },
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  return JSON.parse(out) as SyncRun;
}

/** The pretend remote's calls that change a remote. */
const changes = (run: SyncRun): string[] => run.calls.filter((call) => /^(eraseFlash|writeFlash|invalidateCachedRegions|resetDevice)/.test(call));
/** The words of a run without its progress, which is its shape. */
const shape = (words: readonly string[]): string[] => words.filter((word) => !/ \d+\/\d+$/.test(word));
const progress = (words: readonly string[], phase: string): string[] => words.filter((word) => word.startsWith(`${phase} `));

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
  assert.deepEqual([refused.outcome.result, refused.outcome.remote], ['refused', 'as-before']);
  assert.match(refused.outcome.message!, /HARMONY_ENABLE_WRITES/);
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
  assert.deepEqual([run.outcome.result, run.outcome.remote], ['failed', 'needs-recovery']);
  assert.match(run.outcome.message!, /the cable was pulled.*run the same sync again, built at the same moment/);
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
  for (const name of ['Harmony 350', 'Harmony Touch']) {
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
  // The control that the model is what decides: the same request for a Harmony One is read further.
  const one = new Proxy({}, {
    get: (_, member) => {
      if (member === 'remote') return { kind: 'attached' };
      if (member === 'document') return recipe.create({ name: 'Harmony One', skin: 54 });
      throw new Error(`the request's ${String(member)} was read`);
    },
  }) as SyncRequest;
  await assert.rejects(() => syncDocument(one), /the request's journal was read/);
});
