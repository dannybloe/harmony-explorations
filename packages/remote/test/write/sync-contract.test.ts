/**
 * The sync contract of decision 38 against the pretend remote, R80: one function that writes a document to a remote of
 * any model and reports as events, and a pretend remote to run it and a read against with nothing attached, all on the
 * write subpath. What the pretend remote is held to beside a remote on the cable, event for event, is
 * `pretend-against-attached.test.ts`; this file holds what it does on its own.
 *
 * **What is claimed.** That a sync to a pretend remote runs with nothing attached and reports what a screen needs: its
 * phases in order, progress that counts up to its total where the real write reports any, the warning not to unplug
 * before the first write and the word that it is safe after the last, and one outcome, last, which is also what the
 * call resolves with. That the document is checked and built for real on the way, so a document the check or the build
 * refuses ends as `refused` with the remote as it was. That a dry run, a stop, nothing to write and a failure asked for
 * in each phase end as the outcome their place in the sync leaves, in the words the real path ends them with: a failure
 * named by the phase it happened in, worded for that phase, and naming the state of `SYNC_STATES` the remote was left
 * in where one is owed, with no bench command, script, path or switch in any of it; and that
 * the journal, which is required, tells the same story under the pretend remote's name. That it holds what was written
 * and compares by erase block as the real write does, so a sync of the same build again has nothing to write and a
 * write that stopped part way is finished by the same sync run again. That a screen which throws stops nothing. That
 * a document of a model whose sync is not built is refused by name, to a pretend remote as to an attached one. And that
 * a read of it is `readConfig`'s, with its progress, its retries and its failures, over what it holds.
 *
 * **A Harmony Touch's pretend sync has the attached Touch's shape**: identify, check, build, the warning, the hand over,
 * the write, the word that it may be unplugged, and no progress, since nothing a Touch reports gives a total; its dry
 * run reads the power source and stops before the hand over, it is synced again whatever it holds, a power source but
 * `usb` is refused before anything acts, its own abort leaves it as it was, and a failure in the hand over or the write
 * leaves it needing its recovery, in the state of that phase, `stopped-in-hand-over` or `stopped-after-hand-over`.
 *
 * **What is not claimed.** Anything about a remote: the pretend remote's stand ins report what the real write paths
 * report, and what a remote does with a document is the bench's to say.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildFromRecipe, NotBuiltError, recipe, type BuildSources, type Recipe } from '@freeharmony-sdk/config/node';
import { readVersion } from '@freeharmony-sdk/usb';
import { proves } from '@freeharmony-sdk/testkit/proof';
import { ReadError, readConfig, type ReadProgress } from '../../src/index.ts';
import { MAX_WINDOW_RETRIES } from '../../src/read.ts';
import {
  SYNC_LINES, SYNC_STATES, pretendReader, pretendRemote, syncDocument, type PretendRemote, type SyncEvent, type SyncOutcome,
  type SyncPhase,
} from '../../src/write.ts';
import { touchPowerRefusal } from '../../src/touchsync.ts';

const ONE = { name: 'Harmony One', skin: 54 };
const SOURCES = { builtAt: '2026-11-14T10:00:00' };

/**
 * The Harmony Touch's reference recipe, which carries every device's definition so it builds with no archive, and the
 * invented account the references are built with, John Doe's: no lab and no real account's values. **With a household
 * address**, on the same domain that resolves nowhere: the references' account states none, and the answerer's gate
 * refuses a Context whose household address is neither text nor a number, since the remote's screens raise on it, so
 * the reference build as it stands is not a set a sync delivers. The control is the test of the build's refusal below.
 */
const REFERENCES = new URL('../../../config/test/references/', import.meta.url);
const TOUCH = { name: 'Harmony Touch', skin: 99 };
const touchDocument = (): Recipe => recipe.open(JSON.parse(readFileSync(new URL('touch-test.json', REFERENCES), 'utf8')));
const JOHN_DOE = JSON.parse(readFileSync(new URL('john-doe-account.json', REFERENCES), 'utf8')) as { context: Record<string, unknown> };
const TOUCH_SOURCES: BuildSources = {
  ...SOURCES,
  account: { ...JOHN_DOE, context: { ...JOHN_DOE.context, HouseholdUserProfileUri: 'https://example.invalid/john-doe/household' } } as never,
};

/** One sync with everything it reported: the events as short words in order, the journal's lines, and the outcome. */
async function run(
  document: Recipe, remote: PretendRemote,
  options: { commit?: boolean; stop?: AbortSignal; onEvent?: (event: SyncEvent) => void; sources?: BuildSources } = {},
): Promise<{ words: string[]; events: SyncEvent[]; lines: string[]; outcome: SyncOutcome }> {
  const events: SyncEvent[] = [];
  const lines: string[] = [];
  const outcome = await syncDocument({
    document, remote, sources: options.sources ?? SOURCES, commit: options.commit ?? true,
    onEvent: (event) => { events.push(event); options.onEvent?.(event); },
    journal: (line) => lines.push(line),
    ...(options.stop === undefined ? {} : { stop: options.stop }),
  });
  const words = events.map((event) => (event.kind === 'phase' ? event.phase
    : event.kind === 'progress' ? `${event.phase} ${event.done}/${event.total}`
      : event.kind === 'attention' ? `! ${event.attention}` : `= ${event.outcome.result}`));
  return { words, events, lines, outcome };
}

/** The words of a run without its progress, which is its shape. */
const shape = (words: readonly string[]): string[] => words.filter((word) => !/ \d+\/\d+$/.test(word));
/** The progress of one phase, as words. */
const progress = (words: readonly string[], phase: string): string[] => words.filter((word) => word.startsWith(`${phase} `));
/** The phases entered, in order, without the warnings and the outcome. */
const phases = (words: readonly string[]): string[] => shape(words).filter((word) => !/^[!=]/.test(word));

/** What an application's user has none of: a switch, a script, a path of this repository or a command line option. */
const BENCH = /HARMONY_[A-Z_]|\bnode\b|\bbin\/|\.ts\b|\.md\b|(^|\s)--[a-z]/;

test('a sync to a pretend Harmony One runs its seven phases in order with progress where the write reports any, warns before the write and ends written', async () => {
  const remote = pretendRemote({ model: ONE });
  const document = recipe.create(ONE);
  assert.equal(remote.holds(), undefined);
  const { words, events, lines, outcome } = await run(document, remote);
  assert.deepEqual(outcome, { result: 'written', remote: 'new-configuration' });
  assert.deepEqual(shape(words), [
    'identify', 'check', 'build', 'backup', '! do-not-unplug', 'write', 'verify', '! restarting', 'restart', '! safe-to-unplug', '= written',
  ]);
  // Progress in the two phases the real write reports any for, comparing and writing, counted from 1 to the total
  // with none left out: the empty Harmony One configuration's eight erase blocks, every one differing from a remote
  // that holds none of ours. The read back reports no progress, as `writeConfiguration`'s does not.
  for (const phase of ['backup', 'write'] as const) {
    const counted = events.flatMap((event) => (event.kind === 'progress' && event.phase === phase ? [event] : []));
    assert.deepEqual(counted.map((one) => `${one.done}/${one.total}`), ['1/8', '2/8', '3/8', '4/8', '5/8', '6/8', '7/8', '8/8'], phase);
  }
  assert.deepEqual(progress(words, 'verify'), []);
  // The outcome is the last event and the one the call resolved with, and every warning says what to do.
  assert.deepEqual(events.at(-1), { kind: 'outcome', outcome });
  assert.deepEqual(events.flatMap((event) => (event.kind === 'attention' ? [event.message] : [])), [
    'Leave the remote on its cable until the sync says it is done.',
    'The remote restarts and is away from the cable for a moment.',
    'The remote can be unplugged.',
  ]);
  // The journal names every phase in order, under the pretend remote's name, and ends with how it ended.
  assert.deepEqual(lines.filter((line) => /: (identify|check|build|backup|write|verify|restart)$/.test(line)).map((line) => line.split(': ')[1]),
    ['identify', 'check', 'build', 'backup', 'write', 'verify', 'restart']);
  assert.ok(lines.every((line) => line.startsWith('pretend Harmony One: ')), 'a pretend journal never reads as a remote on the cable');
  assert.match(lines.at(-1)!, /^pretend Harmony One: written, the remote new-configuration$/);
  // It holds the document now, and the same document built at the same moment again is nothing to write.
  assert.equal(remote.holds(), document);
  const again = await run(document, remote);
  assert.deepEqual(again.outcome, { result: 'nothing-to-write', remote: 'as-before', message: 'the remote already holds this configuration' });
  assert.deepEqual(again.words, ['identify', 'check', 'build', '= nothing-to-write']);
  // The control: built at another moment it differs in the block its stamps are in, which is written, as on the cable.
  const later = await run(document, remote, { sources: { builtAt: '2026-11-14T10:00:07' } });
  assert.equal(later.outcome.result, 'written');
  assert.deepEqual([progress(later.words, 'backup'), progress(later.words, 'write')], [['backup 1/1'], ['write 1/1']]);
});

test('a dry run does everything up to the write and sends nothing, and the pretend remote holds what it held', async () => {
  // What it held only has to be told apart from the one synced: the same empty setup, its model stated by name alone,
  // built at the moment a pretend remote's first configuration is built at.
  const before = recipe.create({ name: 'Harmony One' });
  const remote = pretendRemote({ model: ONE, holds: before });
  const other = recipe.create(ONE);
  const { words, outcome } = await run(other, remote, { commit: false });
  // The two differ in their stamps alone, which sit in one block: one block compared, one that would be written.
  assert.deepEqual(outcome, { result: 'dry-run', remote: 'as-before', message: 'everything up to the write was done, and 1 block would be written' });
  assert.deepEqual(words, ['identify', 'check', 'build', 'backup', 'backup 1/1', '= dry-run']);
  assert.equal(remote.holds(), before);
  // The control: the same sync committed is written and held.
  assert.equal((await run(other, remote)).outcome.result, 'written');
  assert.equal(remote.holds(), other);
});

test('a document for another model, one the check refuses and one nothing builds end refused with the remote as it was', async () => {
  const remote = pretendRemote({ model: ONE });
  // The words the attached path gives: the document's skin against the skin the remote reports.
  const wrong = await run(recipe.create({ name: 'Harmony 650' }), remote);
  assert.deepEqual(wrong.words, ['identify', '= refused']);
  assert.equal(wrong.outcome.message, 'the document is for a Harmony 650, skin 72, and the remote on the cable reports skin 54');
  // A key given a second command when held is an error of the check: no key of a Harmony One has that press.
  const held = recipe.open({ model: ONE, devices: [{ name: 'Television', device: 'Made/TV', keys: [{ key: 'VolumeUp', press: 'held', action: { nothing: true } }] }], activities: [] });
  assert.equal(recipe.check(held).filter((one) => one.severity === 'error').length, 1);
  const checked = await run(held, remote);
  assert.deepEqual(checked.words, ['identify', 'check', '= refused']);
  assert.match(checked.outcome.message!, /held/);
  // A Harmony 885 is a model the library knows and builds nothing for from a document yet.
  const unbuilt = await run(recipe.create({ name: 'Harmony 885' }), pretendRemote({ model: { name: 'Harmony 885' } }));
  assert.deepEqual(unbuilt.words, ['identify', 'check', 'build', '= refused']);
  for (const one of [wrong, checked, unbuilt]) assert.deepEqual([one.outcome.result, one.outcome.remote], ['refused', 'as-before']);
  assert.equal(remote.holds(), undefined);
});

test('a document of a model whose sync is not built is refused by name to a pretend remote, as to an attached one', async () => {
  // The Harmony 350 is written by a path of its own that `syncDocument` does not reach yet.
  await assert.rejects(() => run(recipe.create({ name: 'Harmony 350' }), pretendRemote({ model: { name: 'Harmony 350' } })), (error: unknown) => {
    assert.ok(error instanceof NotBuiltError);
    assert.deepEqual([error.contract, error.requirement], ['syncDocument for a pretend Harmony 350', 79]);
    return true;
  });
  // The control: a Harmony 600, whose configuration is written into flash, is synced.
  assert.equal((await run(recipe.create({ name: 'Harmony 600' }), pretendRemote({ model: { name: 'Harmony 600' } }))).outcome.result, 'written');
});

test('a failure asked for in each phase of a configuration\'s sync ends where and as the real path ends it, named by its phase in its words, once, and the sync after it runs through', async () => {
  // What each failure ends as: its result, the remote, the phase the outcome names, the state it names, its words, and
  // the phase last entered. A failure of the document names no phase: it is refused, not failed.
  const left: Record<Exclude<SyncPhase, 'hand-over'>, [SyncOutcome['result'], SyncOutcome['remote'], SyncPhase | undefined, SyncOutcome['state'], string, string]> = {
    // The remote is asked which unit it is once it is opened, after the build: the identify phase opens nothing, and
    // the outcome names that work as identify's.
    identify: ['failed', 'as-before', 'identify', undefined, 'the remote on the cable could not be identified, so nothing was written: the remote did not answer when it was asked which unit it is', 'build'],
    check: ['refused', 'as-before', undefined, undefined, 'the document was refused by its check', 'check'],
    build: ['refused', 'as-before', undefined, undefined, 'the document could not be built', 'build'],
    backup: ['failed', 'as-before', 'backup', undefined, 'reading what the remote holds stopped, so nothing was written: the remote stopped answering', 'backup'],
    write: ['failed', 'needs-recovery', 'write', 'write-unfinished', 'the write stopped part way: the remote stopped answering', 'write'],
    // A read back that differs is told as one, and not as a write that stopped part way.
    verify: ['failed', 'needs-recovery', 'verify', 'read-back-failed', 'every block was written, and the whole configuration did not read back as written: the last block written reads back erased', 'verify'],
    restart: ['failed', 'new-configuration', 'restart', 'restart-owed', 'the configuration is written and read back, and the restart failed: the remote did not take the restart', 'restart'],
  };
  const document = recipe.create(ONE);
  for (const phase of Object.keys(left) as (keyof typeof left)[]) {
    const remote = pretendRemote({ model: ONE, failIn: phase });
    const { words, events, outcome } = await run(document, remote);
    const [result, state, named, owed, message, last] = left[phase];
    assert.deepEqual([outcome.result, outcome.remote, outcome.phase, outcome.state, outcome.message], [result, state, named, owed, message], phase);
    assert.equal(phases(words).at(-1), last, phase);
    // No word a person is shown names a command of the bench.
    for (const said of [outcome.message!, ...events.flatMap((event) => (event.kind === 'attention' ? [event.message] : []))]) assert.doesNotMatch(said, BENCH, phase);
    // Only a failed restart asks for one by hand, and no failure says the remote may be unplugged: the state says
    // whether it may be, and only the owed restart's does.
    assert.equal(words.includes('! restart-by-hand'), phase === 'restart', phase);
    assert.equal(words.includes('! safe-to-unplug'), false, phase);
    if (owed !== undefined) assert.equal(SYNC_STATES[owed].unplug, phase === 'restart', phase);
    // A remote whose restart failed holds the new configuration whole; every other failure leaves it holding none.
    assert.equal(remote.holds(), phase === 'restart' ? document : undefined, phase);
    // The failure was for one sync: the next is written, or has nothing left to write after a failed restart.
    assert.equal((await run(document, remote)).outcome.result, phase === 'restart' ? 'nothing-to-write' : 'written', phase);
    assert.equal(remote.holds(), document, phase);
  }
});

test('a write that stopped part way leaves the block it was writing erased, and the same sync run again writes the blocks it left', async () => {
  const remote = pretendRemote({ model: ONE, failIn: 'write' });
  const document = recipe.create(ONE);
  // Eight blocks to write: four are written, the fifth is erased and the write stops there.
  const first = await run(document, remote);
  assert.deepEqual(progress(first.words, 'write'), ['write 1/8', 'write 2/8', 'write 3/8', 'write 4/8']);
  assert.deepEqual([first.outcome.remote, first.outcome.state], ['needs-recovery', 'write-unfinished']);
  // Run again, the four it left are what differ.
  const again = await run(document, remote);
  assert.deepEqual(again.outcome, { result: 'written', remote: 'new-configuration' });
  assert.deepEqual(progress(again.words, 'write'), ['write 1/4', 'write 2/4', 'write 3/4', 'write 4/4']);
});

test('a stop is honoured up to the first write with nothing written, and one asked for after it lets the sync finish', async () => {
  const document = recipe.create(ONE);
  // Asked before the sync starts: nothing is entered.
  const already = new AbortController();
  already.abort();
  const none = await run(document, pretendRemote({ model: ONE }), { stop: already.signal });
  assert.deepEqual(none.words, ['= stopped']);
  // Asked while what the remote holds is read: as the real write does, every block is compared first, and it stops
  // there, before the warning not to unplug.
  const reading = new AbortController();
  const remote = pretendRemote({ model: ONE });
  const during = await run(document, remote, {
    stop: reading.signal, onEvent: (event) => { if (event.kind === 'progress' && event.phase === 'backup' && event.done === 2) reading.abort(); },
  });
  assert.deepEqual(during.outcome, { result: 'stopped', remote: 'as-before', message: 'stopped before the write, with nothing written' });
  assert.equal(progress(during.words, 'backup').length, 8);
  assert.equal(during.words.includes('! do-not-unplug'), false);
  assert.equal(during.words.includes('write'), false);
  assert.equal(remote.holds(), undefined);
  // Asked once the write has begun: the sync runs to its end and the remote holds the document.
  const writing = new AbortController();
  const late = await run(document, remote, {
    stop: writing.signal, onEvent: (event) => { if (event.kind === 'progress' && event.phase === 'write' && event.done === 1) writing.abort(); },
  });
  assert.deepEqual(late.outcome, { result: 'written', remote: 'new-configuration' });
  assert.equal(remote.holds(), document);
});

test('a screen that throws on every event stops nothing: the pretend remote is written all the same', async () => {
  const remote = pretendRemote({ model: ONE });
  const outcome = await syncDocument({
    document: recipe.create(ONE), remote, sources: SOURCES, commit: true,
    onEvent: () => { throw new Error('the screen failed'); },
    journal: () => undefined,
  });
  assert.deepEqual(outcome, { result: 'written', remote: 'new-configuration' });
  assert.notEqual(remote.holds(), undefined);
});

test('a pretend remote takes its time where it is given one, and one put together by hand, of no known model or given a time below none is refused', async () => {
  // Eight steps of five milliseconds at the least in each of the compare and the write: slower than the same sync with no time.
  const slow = pretendRemote({ model: ONE, stepMs: 5 });
  const started = performance.now();
  assert.equal((await run(recipe.create(ONE), slow)).outcome.result, 'written');
  assert.ok(performance.now() - started >= 80, 'the steps took no time');
  assert.throws(() => pretendRemote({ model: ONE, stepMs: -1 }), RangeError);
  assert.throws(() => pretendRemote({ model: { name: 'Harmony Nothing' } }), RangeError);
  assert.throws(() => pretendRemote({ model: ONE, holds: recipe.create({ name: 'Harmony 650' }) }), RangeError);
  const made = { kind: 'pretend', model: ONE, holds: () => undefined } as PretendRemote;
  await assert.rejects(() => run(recipe.create(ONE), made), TypeError);
  assert.throws(() => pretendReader(made), TypeError);
});

// ---------------------------------------------------------------------------------------------------
// Reading a pretend remote
// ---------------------------------------------------------------------------------------------------

test('a pretend remote is read through readConfig as a remote on the cable is, with its progress, and a failure asked for stops the read part way after its retries', async () => {
  proves(80, 'every');
  const document = recipe.create(ONE);
  const remote = pretendRemote({ model: ONE, holds: document, heldSources: SOURCES });
  const built = buildFromRecipe(document, SOURCES);
  assert.equal(built.kind, 'configuration');
  const bytes = built.kind === 'configuration' ? built.bytes : new Uint8Array(0);
  const { reader, profile } = pretendReader(remote);
  assert.deepEqual([profile.model, profile.architecture], ['Harmony One', 12]);
  const seen: ReadProgress[] = [];
  const read = await readConfig(reader, profile, { onProgress: (at) => seen.push(at), now: () => 0 });
  // The configuration it holds, byte for byte, through the read's own checks of its end marker and its trailer.
  assert.equal(read.bytes.length, bytes.length);
  assert.ok(read.bytes.every((b, i) => b === bytes[i]));
  assert.equal(read.retries, 0);
  // The version block states the model's architecture and skin.
  assert.deepEqual([readVersion(read.versionBlock).architecture, readVersion(read.versionBlock).skin], [12, 54]);
  // Progress from the header to the whole, in the read's own windows.
  const windows = Math.ceil((bytes.length - 16) / 16384);
  assert.equal(seen.length, 1 + windows);
  assert.deepEqual(seen.at(-1), { done: bytes.length, total: bytes.length });

  // Told to fail, the next read stops answering half way: every window before it read, the failing one asked for
  // again as often as the read asks, and the read rejected with what the remote did.
  const failing = pretendRemote({ model: ONE, holds: document, heldSources: SOURCES, failIn: 'read' });
  const partway: ReadProgress[] = [];
  let retries = 0;
  const once = pretendReader(failing);
  await assert.rejects(
    () => readConfig(once.reader, once.profile, { onProgress: (at) => partway.push(at), onRetry: () => { retries += 1; } }),
    /^Error: flash read returned 0 of 16384 bytes$/,
  );
  assert.equal(retries, MAX_WINDOW_RETRIES);
  // The windows that end at or before half of the configuration came back.
  assert.equal(partway.length, 1 + Math.floor((Math.floor(bytes.length / 2) - 16) / 16384));
  // Once: the read after it is whole.
  assert.equal((await readConfig(pretendReader(failing).reader, once.profile)).bytes.length, bytes.length);
});

test('a pretend remote reads what was last synced to it, a remote holding none of ours is refused as a remote holding no configuration, and a model the read does not serve is refused', async () => {
  const remote = pretendRemote({ model: ONE });
  const empty = pretendReader(remote);
  await assert.rejects(() => readConfig(empty.reader, empty.profile), (error: unknown) => error instanceof ReadError && /no container magic/.test(error.message));
  const document = recipe.create(ONE);
  assert.equal((await run(document, remote)).outcome.result, 'written');
  const built = buildFromRecipe(document, SOURCES);
  const read = await readConfig(pretendReader(remote).reader, empty.profile);
  assert.ok(built.kind === 'configuration' && read.bytes.length === built.bytes.length && read.bytes.every((b, i) => b === built.bytes[i]));
  // The read of a configuration out of flash serves no Harmony Touch, whose documents no entry reads yet, and no
  // Harmony 350, as `profileFor` serves neither's product id.
  for (const model of [TOUCH, { name: 'Harmony 350' }]) {
    assert.throws(() => pretendReader(pretendRemote({ model })), (error: unknown) => error instanceof ReadError && error.message.startsWith(`no config base known for the ${model.name}`));
  }
});

// ---------------------------------------------------------------------------------------------------
// A document model: the Harmony Touch's shape
// ---------------------------------------------------------------------------------------------------

/** The words a sync of a Harmony Touch reports, pretend or attached: `sync-attached-touch.test.ts` holds the same. */
const TOUCH_WRITTEN = ['identify', 'check', 'build', '! do-not-unplug', 'hand-over', 'write', '! safe-to-unplug', '= written'];

test('a sync to a pretend Harmony Touch hands over and writes with no progress, warns before the hand over, tells the answerer\'s account and ends written', async () => {
  const remote = pretendRemote({ model: TOUCH });
  const document = touchDocument();
  const { words, events, lines, outcome } = await run(document, remote, { sources: TOUCH_SOURCES });
  assert.deepEqual(outcome, { result: 'written', remote: 'new-configuration' });
  // Exactly these words, progress included: there is none, since nothing a Touch reports gives a total.
  assert.deepEqual(words, TOUCH_WRITTEN);
  assert.equal(events.filter((event) => event.kind === 'progress').length, 0);
  // The build is real: the reference recipe's six documents and our two pictures, a set of eight the gate passes.
  assert.ok(lines.includes('pretend Harmony Touch: built 6 documents and 2 pictures, a set of 8 answers the gate passes'), lines.join('\n'));
  // The answerer's account, under the pretend remote's name, every line one of the answerer's own forms.
  const account = lines.map((line) => line.replace(/^pretend Harmony Touch: /, '')).filter((line) => line.startsWith('sync: '));
  assert.deepEqual(account, [
    'sync: gate passed, 8 answers, 8 tags stated and 0 ours', 'sync: power source, usb', 'sync: provisioned, mode 0',
    'sync: handing over the remote\'s changes', 'sync: hand over, request list 1, 1 answered', 'sync: started',
    'sync: request list 1, 6 answered', 'sync: request list 2, 2 answered', 'sync: request list 3, 1 answered', 'sync: finished',
  ]);
  for (const line of account) assert.ok(SYNC_LINES.some((form) => form.test(line)), line);
  assert.equal(remote.holds(), document);
  // Synced again with the same document, it is written again and never nothing to write: a remote that asks for
  // documents cannot be asked what it holds by the real path, which syncs it again whatever it holds.
  const again = await run(document, remote, { sources: TOUCH_SOURCES });
  assert.deepEqual(again.words, TOUCH_WRITTEN);
  // The control: a pretend Harmony One synced the same document again had nothing to write, the first test's last lines.
});

test('a pretend Harmony Touch\'s dry run reads its power source and stops before the hand over, and a stop is honoured up to the moment the remote is opened', async () => {
  const remote = pretendRemote({ model: TOUCH });
  const dry = await run(touchDocument(), remote, { sources: TOUCH_SOURCES, commit: false });
  assert.deepEqual(dry.words, ['identify', 'check', 'build', '= dry-run']);
  assert.deepEqual(dry.outcome, {
    result: 'dry-run', remote: 'as-before', message: 'everything before the remote is acted on was done, and the set holds 6 documents and 2 pictures',
  });
  assert.ok(dry.lines.includes('pretend Harmony Touch: power source, usb'), dry.lines.join('\n'));
  assert.equal(remote.holds(), undefined);
  // Asked while it builds: honoured before the remote is opened, nothing sent and no warning given.
  const stop = new AbortController();
  const stopped = await run(touchDocument(), remote, {
    sources: TOUCH_SOURCES, stop: stop.signal, onEvent: (event) => { if (event.kind === 'phase' && event.phase === 'build') stop.abort(); },
  });
  assert.deepEqual(stopped.words, ['identify', 'check', 'build', '= stopped']);
  assert.deepEqual(stopped.outcome, { result: 'stopped', remote: 'as-before', message: 'stopped before the remote was opened, with nothing written' });
  // Asked once the hand over has begun: the sync runs to its end.
  const late = new AbortController();
  const finished = await run(touchDocument(), remote, {
    sources: TOUCH_SOURCES, stop: late.signal, onEvent: (event) => { if (event.kind === 'phase' && event.phase === 'hand-over') late.abort(); },
  });
  assert.deepEqual(finished.words, TOUCH_WRITTEN);
});

test('a pretend Harmony Touch on a power source but usb is refused before anything acts, in a dry run and a commit, with the words of the real check', async () => {
  const before = touchDocument();
  for (const source of ['battery', 'usb_charge', 'cradle']) {
    const remote = pretendRemote({ model: TOUCH, holds: before, powerSource: source });
    for (const commit of [false, true]) {
      const { words, outcome } = await run(touchDocument(), remote, { sources: TOUCH_SOURCES, commit });
      assert.deepEqual(words, ['identify', 'check', 'build', '= refused'], `${source} ${String(commit)}`);
      assert.deepEqual(outcome, { result: 'refused', remote: 'as-before', message: touchPowerRefusal(source) }, `${source} ${String(commit)}`);
    }
    assert.equal(remote.holds(), before, source);
  }
  // The control: on usb the same commit is written.
  assert.deepEqual((await run(touchDocument(), pretendRemote({ model: TOUCH, powerSource: 'usb' }), { sources: TOUCH_SOURCES })).words, TOUCH_WRITTEN);
});

test('a pretend Harmony Touch with no account or one the gate refuses is refused at the build, and a failure in each phase ends as the attached path ends it', async () => {
  const unbuilt = await run(touchDocument(), pretendRemote({ model: TOUCH }), { sources: SOURCES });
  assert.deepEqual(unbuilt.words, ['identify', 'check', 'build', '= refused']);
  assert.match(unbuilt.outcome.message!, /no account was given/);
  // The references' account as it stands, with no household address: built, and refused by the answerer's gate, in its
  // words: the document, the field, the finding and its rule.
  const ungated = await run(touchDocument(), pretendRemote({ model: TOUCH }), { sources: { ...SOURCES, account: JOHN_DOE as never } });
  assert.deepEqual(ungated.words, ['identify', 'check', 'build', '= refused']);
  assert.deepEqual([ungated.outcome.result, ungated.outcome.remote], ['refused', 'as-before']);
  assert.match(ungated.outcome.message!, /^Context\.HouseholdUserProfileUri: the household's address is neither a string nor a number.*\(screens raise\)$/);
  // What each failure ends as: its result, the remote, the phase the outcome names, the state it names, its words, and
  // the events. The answerer's recovery order and abort cost are the bench's commands and stay in the journal; the
  // state says the same as data.
  const left: Record<'identify' | 'check' | 'build' | 'hand-over' | 'write', [SyncOutcome['result'], SyncOutcome['remote'], SyncPhase | undefined, SyncOutcome['state'], string, string[]]> = {
    identify: ['failed', 'as-before', 'identify', undefined,
      'the remote could not be opened and identified, so nothing that acts on it was sent: the remote did not answer when it was asked which unit it is',
      ['identify', 'check', 'build', '= failed']],
    check: ['refused', 'as-before', undefined, undefined, 'the document was refused by its check', ['identify', 'check', '= refused']],
    build: ['refused', 'as-before', undefined, undefined, 'the document could not be built', ['identify', 'check', 'build', '= refused']],
    'hand-over': ['failed', 'needs-recovery', 'hand-over', 'stopped-in-hand-over',
      'the sync stopped while the remote handed its own changes up: the remote stopped answering',
      ['identify', 'check', 'build', '! do-not-unplug', 'hand-over', '= failed']],
    write: ['failed', 'needs-recovery', 'write', 'stopped-after-hand-over',
      'the sync stopped while the remote was being answered: the remote stopped answering',
      ['identify', 'check', 'build', '! do-not-unplug', 'hand-over', 'write', '= failed']],
  };
  const before = touchDocument();
  for (const phase of Object.keys(left) as (keyof typeof left)[]) {
    const remote = pretendRemote({ model: TOUCH, holds: before, failIn: phase });
    const { words, lines, outcome } = await run(touchDocument(), remote, { sources: TOUCH_SOURCES });
    const [result, state, named, owed, message, said] = left[phase];
    assert.deepEqual([outcome.result, outcome.remote, outcome.phase, outcome.state, outcome.message], [result, state, named, owed, message], phase);
    assert.deepEqual(words, said, phase);
    assert.doesNotMatch(outcome.message!, BENCH, phase);
    // A Touch is never safe to unplug while a sync may be marked running on it, and the journal still carries the
    // answerer's own recovery lines for the bench.
    if (owed !== undefined) {
      assert.equal(SYNC_STATES[owed].unplug, false, phase);
      assert.ok(lines.some((line) => line.includes('sync: recovery, first read getconfighash')), phase);
    }
    // A Touch swaps a new set in only at its commit, so every failure leaves it holding what it held.
    assert.equal(remote.holds(), before, phase);
  }
  // The control: the phases a Touch's sync does not have are never entered, so failing in one fails nothing.
  for (const phase of ['backup', 'verify', 'restart'] as const) {
    const { words } = await run(touchDocument(), pretendRemote({ model: TOUCH, failIn: phase }), { sources: TOUCH_SOURCES });
    assert.deepEqual(words, TOUCH_WRITTEN, phase);
  }
});

test('a pretend Harmony Touch\'s own abort ends failed with the remote as it was and may be unplugged, once', async () => {
  const before = touchDocument();
  const remote = pretendRemote({ model: TOUCH, holds: before, aborts: true });
  const aborted = await run(touchDocument(), remote, { sources: TOUCH_SOURCES });
  assert.deepEqual(aborted.outcome, { result: 'failed', remote: 'as-before', phase: 'write', message: 'the remote aborted the sync, deleted what it had gathered and kept the set it held' });
  assert.deepEqual(aborted.words, ['identify', 'check', 'build', '! do-not-unplug', 'hand-over', 'write', '! safe-to-unplug', '= failed']);
  assert.equal(remote.holds(), before);
  // Once: the sync after it is written.
  assert.deepEqual((await run(touchDocument(), remote, { sources: TOUCH_SOURCES })).words, TOUCH_WRITTEN);
});
