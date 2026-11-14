/**
 * The sync contract of decision 38: one function that writes a document to a remote of any model and reports as
 * events, and a pretend remote to run it against, both on the write subpath.
 *
 * **What is claimed.** That a sync to a pretend remote runs with nothing attached and reports what a screen needs:
 * its phases in order, progress that counts up to its total in each, the warning not to unplug before the first
 * write and the word that it is safe after the last, and one outcome, last, which is also what the call resolves
 * with. That the document is checked and built for real on the way, so a document the check or the build refuses
 * ends as `refused` with the remote as it was. That a dry run, a stop and a failure asked for in each phase end as
 * the outcome their place in the sync leaves, and that the journal, which is required, tells the same story. A
 * sync to an attached remote is `sync-attached.test.ts`'s, and to an attached Harmony Touch
 * `sync-attached-touch.test.ts`'s.
 *
 * **A document model's pretend sync has the shape of the attached Harmony Touch's**: identify, check, build, the
 * warning, the hand over, the write, the word that it may be unplugged, and no progress, since nothing a Touch reports
 * gives a total; its dry run stops before the hand over, it is synced again whatever it holds, and a failure in the hand
 * over or the write leaves it needing its recovery. `sync-attached-touch.test.ts` holds the attached sync to the same
 * words, so a screen built against the one fits the other.
 *
 * **What is not claimed.** That the pretend remote's phases are any real remote's: they are a shape to build a
 * screen against, and each real path reports the phases it has. Nor that the request, the events or the outcome
 * have their final shape, which the path on two remotes settles.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';

import { recipe, type BuildSources, type Recipe } from '@harmony/codec/node';
import {
  pretendRemote, syncDocument, type PretendRemote, type SyncEvent, type SyncOutcome, type SyncPhase,
} from '../../src/write.ts';

const ONE = { name: 'Harmony One', skin: 54 };
const SOURCES = { builtAt: '2026-11-14T10:00:00' };

/**
 * The Harmony Touch's reference recipe, which carries every device's definition so it builds with no archive, and the
 * invented account the references are built with, John Doe's: no lab and no real account's values. **With a household
 * address**, on the same domain that resolves nowhere: the references' account states none, and the answerer's gate
 * refuses a Context whose household address is neither text nor a number, since the remote's screens raise on it, so
 * the reference build as it stands is not a set a sync delivers. The control is the test of the build's refusal below.
 */
const REFERENCES = new URL('../../../codec/test/references/', import.meta.url);
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

test('a sync to a pretend Harmony One runs its seven phases in order with progress to the total in each, warns before the write and ends written', async () => {
  const remote = pretendRemote({ model: ONE });
  const document = recipe.create(ONE);
  assert.equal(remote.holds(), undefined);
  const { words, events, lines, outcome } = await run(document, remote);
  assert.deepEqual(outcome, { result: 'written', remote: 'new-configuration' });
  assert.deepEqual(shape(words), [
    'identify', 'check', 'build', 'backup', '! do-not-unplug', 'write', 'verify', '! restarting', 'restart', '! safe-to-unplug', '= written',
  ]);
  // Progress in the three phases that have any: counted from 1 to the total with none left out, and the total is
  // the empty Harmony One configuration's eight blocks of flash in each.
  for (const phase of ['backup', 'write', 'verify'] as const) {
    const progress = events.flatMap((event) => (event.kind === 'progress' && event.phase === phase ? [event] : []));
    assert.equal(progress.length, 8, phase);
    assert.deepEqual(progress.map((one) => one.done), progress.map((_, k) => k + 1));
    assert.deepEqual(new Set(progress.map((one) => one.total)), new Set([8]));
  }
  // The outcome is the last event and the one the call resolved with, and every warning says what to do.
  assert.deepEqual(events.at(-1), { kind: 'outcome', outcome });
  assert.deepEqual(events.flatMap((event) => (event.kind === 'attention' ? [event.message] : [])), [
    'Leave the remote on its cable until the sync says it is done.',
    'The remote restarts and is away from the cable for a moment.',
    'The remote can be unplugged.',
  ]);
  // The journal names every phase in order and ends with how it ended.
  assert.deepEqual(lines.filter((line) => /: (identify|check|build|backup|write|verify|restart)$/.test(line)).map((line) => line.split(': ')[1]),
    ['identify', 'check', 'build', 'backup', 'write', 'verify', 'restart']);
  assert.match(lines.at(-1)!, /^pretend Harmony One: written, the remote new-configuration$/);
  // It holds the document now, and the same document again is nothing to write and touches nothing.
  assert.equal(remote.holds(), document);
  const again = await run(document, remote);
  assert.equal(again.outcome.result, 'nothing-to-write');
  assert.equal(again.outcome.remote, 'as-before');
  assert.deepEqual(again.words, ['identify', 'check', 'build', '= nothing-to-write']);
});

test('a dry run does everything up to the write and sends nothing, and the pretend remote holds what it held', async () => {
  // What it held only has to be told apart from the one synced: the same empty setup, its model stated by name alone.
  const before = recipe.create({ name: 'Harmony One' });
  const remote = pretendRemote({ model: ONE, holds: before });
  const other = recipe.create(ONE);
  const { words, outcome } = await run(other, remote, { commit: false });
  assert.equal(outcome.result, 'dry-run');
  assert.equal(outcome.remote, 'as-before');
  assert.deepEqual(shape(words), ['identify', 'check', 'build', 'backup', '= dry-run']);
  assert.equal(remote.holds(), before);
  // The control: the same sync committed is written and held.
  assert.equal((await run(other, remote)).outcome.result, 'written');
  assert.equal(remote.holds(), other);
});

test('a document for another model, one the check refuses and one nothing builds end refused with the remote as it was', async () => {
  const remote = pretendRemote({ model: ONE });
  const wrong = await run(recipe.create({ name: 'Harmony 650' }), remote);
  assert.deepEqual(wrong.words, ['identify', '= refused']);
  assert.match(wrong.outcome.message!, /Harmony 650.*Harmony One/);
  // A key given a second command when held is an error of the check, which nothing builds yet.
  const held = recipe.open({ model: ONE, devices: [{ name: 'Television', device: 'Made/TV', keys: [{ scan: 3, press: 'held', action: { nothing: true } }] }], activities: [] });
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

test('a failure asked for in each phase of a configuration\'s sync ends as that phase leaves the remote, once, and the sync after it runs through', async () => {
  const left: Record<Exclude<SyncPhase, 'hand-over'>, [SyncOutcome['result'], SyncOutcome['remote'], string]> = {
    identify: ['failed', 'as-before', 'the remote did not answer when it was asked which remote it is'],
    check: ['refused', 'as-before', 'the document was refused by its check'],
    build: ['refused', 'as-before', 'the document could not be built'],
    backup: ['failed', 'as-before', 'reading what the remote holds stopped part way, before anything was written'],
    write: ['failed', 'needs-recovery', 'the write stopped part way, so the remote holds a part of each configuration'],
    verify: ['failed', 'needs-recovery', 'what the remote holds does not read back as what was written'],
    restart: ['failed', 'new-configuration', 'the remote holds the new configuration and did not restart by itself'],
  };
  // On a Harmony 350, whose build is the quickest and whose pretend sync has the same seven phases.
  const small = { name: 'Harmony 350' };
  const document = recipe.create(small);
  for (const phase of Object.keys(left) as (keyof typeof left)[]) {
    const remote = pretendRemote({ model: small, failIn: phase });
    const { words, outcome } = await run(document, remote);
    assert.deepEqual([outcome.result, outcome.remote, outcome.message], left[phase], phase);
    // It ends in the phase it failed in: that phase is the last one entered.
    assert.equal(shape(words).filter((word) => !/^[!=]/.test(word)).at(-1), phase);
    // Only a failed restart asks for one by hand, and no failure says the remote may be unplugged.
    assert.equal(words.includes('! restart-by-hand'), phase === 'restart', phase);
    assert.equal(words.includes('! safe-to-unplug'), false, phase);
    assert.equal(remote.holds(), undefined, phase);
    // The failure was for one sync: the next is written.
    assert.equal((await run(document, remote)).outcome.result, 'written', phase);
  }
});

test('a stop is honoured up to the first write with nothing written, and one asked for after it lets the sync finish', async () => {
  const document = recipe.create(ONE);
  // Asked before the sync starts: nothing is entered.
  const already = new AbortController();
  already.abort();
  const none = await run(document, pretendRemote({ model: ONE }), { stop: already.signal });
  assert.deepEqual(none.words, ['= stopped']);
  // Asked while what the remote holds is being read: it stops there, before the warning not to unplug.
  const reading = new AbortController();
  const remote = pretendRemote({ model: ONE });
  const during = await run(document, remote, {
    stop: reading.signal, onEvent: (event) => { if (event.kind === 'progress' && event.phase === 'backup' && event.done === 2) reading.abort(); },
  });
  assert.deepEqual([during.outcome.result, during.outcome.remote], ['stopped', 'as-before']);
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

test('a pretend remote takes its time where it is given one, and one put together by hand or given a time below none is refused', async () => {
  // Three steps of five milliseconds at the least in each of three phases: slower than the same sync with no time.
  const slow = pretendRemote({ model: { name: 'Harmony 350' }, stepMs: 5 });
  const started = performance.now();
  assert.equal((await run(recipe.create({ name: 'Harmony 350' }), slow)).outcome.result, 'written');
  assert.ok(performance.now() - started >= 15, 'the steps took no time');
  assert.throws(() => pretendRemote({ model: ONE, stepMs: -1 }), RangeError);
  const made = { kind: 'pretend', model: ONE, holds: () => undefined } as PretendRemote;
  await assert.rejects(() => run(recipe.create(ONE), made), TypeError);
});

// ---------------------------------------------------------------------------------------------------
// A document model: the Harmony Touch's shape
// ---------------------------------------------------------------------------------------------------

/** The words a sync of a Harmony Touch reports, pretend or attached: `sync-attached-touch.test.ts` holds the same. */
const TOUCH_WRITTEN = ['identify', 'check', 'build', '! do-not-unplug', 'hand-over', 'write', '! safe-to-unplug', '= written'];

test('a sync to a pretend Harmony Touch hands over and writes with no progress, warns before the hand over and ends written', async () => {
  const remote = pretendRemote({ model: TOUCH });
  const document = touchDocument();
  const { words, events, lines, outcome } = await run(document, remote, { sources: TOUCH_SOURCES });
  assert.deepEqual(outcome, { result: 'written', remote: 'new-configuration' });
  // Exactly these words, progress included: there is none, since nothing a Touch reports gives a total.
  assert.deepEqual(words, TOUCH_WRITTEN);
  assert.equal(events.filter((event) => event.kind === 'progress').length, 0);
  // The build is real: the reference recipe's six documents and our two pictures.
  assert.ok(lines.includes('pretend Harmony Touch: built 6 documents and 2 pictures'), lines.join('\n'));
  assert.equal(remote.holds(), document);
  // Synced again with the same document, it is written again and never nothing to write: a remote that asks for
  // documents cannot be asked what it holds by the real path, which syncs it again whatever it holds.
  const again = await run(document, remote, { sources: TOUCH_SOURCES });
  assert.deepEqual(again.words, TOUCH_WRITTEN);
  // The control: the same document on a pretend Harmony One's shape would have been nothing to write the second time,
  // the first test's last lines.
});

test('a pretend Harmony Touch\'s dry run stops before the hand over, saying what the set holds, and a stop asked there is honoured', async () => {
  const remote = pretendRemote({ model: TOUCH });
  const dry = await run(touchDocument(), remote, { sources: TOUCH_SOURCES, commit: false });
  assert.deepEqual(dry.words, ['identify', 'check', 'build', '= dry-run']);
  assert.deepEqual(dry.outcome, {
    result: 'dry-run', remote: 'as-before', message: 'everything before the remote is acted on was done, and the set holds 6 documents and 2 pictures',
  });
  assert.equal(remote.holds(), undefined);
  // Asked while it builds: honoured before the hand over, nothing sent and no warning given.
  const stop = new AbortController();
  const stopped = await run(touchDocument(), remote, {
    sources: TOUCH_SOURCES, stop: stop.signal, onEvent: (event) => { if (event.kind === 'phase' && event.phase === 'build') stop.abort(); },
  });
  assert.deepEqual(stopped.words, ['identify', 'check', 'build', '= stopped']);
  assert.deepEqual(stopped.outcome, { result: 'stopped', remote: 'as-before', message: 'stopped before the hand over, with nothing written' });
  // Asked once the hand over has begun: the sync runs to its end.
  const late = new AbortController();
  const finished = await run(touchDocument(), remote, {
    sources: TOUCH_SOURCES, stop: late.signal, onEvent: (event) => { if (event.kind === 'phase' && event.phase === 'hand-over') late.abort(); },
  });
  assert.deepEqual(finished.words, TOUCH_WRITTEN);
});

test('a pretend Harmony Touch with no account or one the gate refuses is refused at the build, and a failure in the hand over or the write leaves it needing recovery', async () => {
  const unbuilt = await run(touchDocument(), pretendRemote({ model: TOUCH }), { sources: SOURCES });
  assert.deepEqual(unbuilt.words, ['identify', 'check', 'build', '= refused']);
  assert.match(unbuilt.outcome.message!, /no account was given/);
  // The references' account as it stands, with no household address: built, and refused by the gate over the documents.
  const ungated = await run(touchDocument(), pretendRemote({ model: TOUCH }), { sources: { ...SOURCES, account: JOHN_DOE as never } });
  assert.deepEqual(ungated.words, ['identify', 'check', 'build', '= refused']);
  assert.deepEqual([ungated.outcome.result, ungated.outcome.remote], ['refused', 'as-before']);
  assert.match(ungated.outcome.message!, /^Context: the household's address is neither a string nor a number/);
  const left: Record<'identify' | 'check' | 'build' | 'hand-over' | 'write', [SyncOutcome['result'], SyncOutcome['remote'], string]> = {
    identify: ['failed', 'as-before', 'the remote did not answer when it was asked which remote it is'],
    check: ['refused', 'as-before', 'the document was refused by its check'],
    build: ['refused', 'as-before', 'the document could not be built'],
    'hand-over': ['failed', 'needs-recovery', 'the sync stopped while the remote handed its own changes up, so it may hold a sync marked running: run its recovery, which starts with a read that says whether anything is left to clear'],
    write: ['failed', 'needs-recovery', 'the sync stopped before the remote committed it, so it keeps the set it held and may hold a sync marked running: run its recovery, which starts with a read that says whether anything is left to clear'],
  };
  for (const phase of Object.keys(left) as (keyof typeof left)[]) {
    const remote = pretendRemote({ model: TOUCH, failIn: phase });
    const { words, outcome } = await run(touchDocument(), remote, { sources: TOUCH_SOURCES });
    assert.deepEqual([outcome.result, outcome.remote, outcome.message], left[phase], phase);
    assert.equal(words.filter((word) => !/^[!=]/.test(word)).at(-1), phase);
    assert.equal(words.includes('! safe-to-unplug'), false, phase);
    // The warning comes exactly where the remote is first acted on: before the hand over, and only if it is reached.
    assert.equal(words.includes('! do-not-unplug'), phase === 'hand-over' || phase === 'write', phase);
    assert.equal(remote.holds(), undefined, phase);
  }
  // The control: the phases a Touch's sync does not have are never entered, so failing in one fails nothing.
  for (const phase of ['backup', 'verify', 'restart'] as const) {
    const { words } = await run(touchDocument(), pretendRemote({ model: TOUCH, failIn: phase }), { sources: TOUCH_SOURCES });
    assert.deepEqual(words, TOUCH_WRITTEN, phase);
  }
});
