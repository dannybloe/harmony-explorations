/**
 * The pretend remote held to a remote on the cable, R80: for the same document, a sync to a pretend remote reports the
 * same events in the same order, and ends with the same outcome, as a sync to an attached remote whose write path
 * meets the same thing, for both kinds of remote: a Harmony One, whose configuration is written into flash, and a
 * Harmony Touch, which is given documents.
 *
 * **Why this test and not the contract's own.** An application builds and tries its screens against the pretend
 * remote and ships them against a remote on the cable, so what the pretend remote reports is only worth anything where
 * it is what the real path reports. The two used to state their phases, progress, messages and outcomes in two copies,
 * and the copies disagreed: the pretend remote reported progress in the read back, which the real write reports none
 * of; it stopped in the middle of the compare, where the real write compares every block before it honours a stop;
 * it failed at `identify`, which on the cable opens nothing and cannot fail; it named a wrong model by name where the
 * real path names skins; it had nothing to write whenever it held the same document, where the real write compares
 * bytes and writes the block the stamps are in when the build's moment differs; its gate named a finding without its
 * field and rule; it dropped no error a screen threw; and it worded its stops and its failures in its own words. Each
 * time the pretend remote was the side that was wrong, since what it pretends is the real path. Now both go through
 * one stage per kind in `src/sync.ts`, and this test is what keeps that so.
 *
 * **How the attached side runs with nothing attached.** Through the existing stand ins: `FakeClassicRemote`, which
 * keeps flash as an array and asserts every rail its `HarmonyRemote` counterpart asserts, under `writeConfiguration`;
 * and `FakeTouchRemote` from the test kit, behind the file protocol's guard, under `answerTouchSync` and the real
 * request session. The runs that commit are run together in one process of their own with the flags set, one per
 * model, `runSyncCommittedAll` and `runTouchSyncCommittedAll`, each with its own stand in; a run that commits nothing
 * runs here, where no flag is set.
 *
 * **What is compared, exactly.** The events as words, progress included, and the outcome, message included, wherever
 * the two stand ins fail with the same words; where a failure's own words are the stand in's, the attached one's
 * `the cable was pulled` and the pretend remote's `the remote stopped answering`, the message is compared around them,
 * and the phase and the state the outcome names exactly. **And on both sides no word a person is shown names a
 * command, script, path or switch of the bench**, in an outcome or an attention event.
 *
 * **Which endings, and which are left to the attached tests.** Every ending of `SYNC_ENDINGS` for each kind is reached
 * on both sides and asserted against that list, so a new ending fails here until a case reaches it. Within those
 * endings the cases are: for the Harmony One, written, a dry run, nothing to write, a stop before the sync, during the
 * compare and once the write began, a screen that throws, a remote of another model, no answer when opened, and a
 * failure in the compare, the write (with the same sync again), an erase that reaches the block beside its own, the
 * read back and the restart; for the Harmony 600, 650
 * and 700, written, on the same stand in; **one ending is reached by no case**, a restart withheld, which only a Harmony
 * 885's write does and no document builds for an 885 yet, and the test names it; for the Harmony Touch,
 * written, written with an activity switched off, whose outcome names it on both sides, a dry run, a power source but usb in a dry run and a commit, no answer when opened in a dry run and a
 * commit, a stop before the sync, while it builds and once the hand over began, a screen that throws, a remote of
 * another model, the remote's own abort, and a failure in the hand over and once the sync started, one of these an
 * answer that never came. **The refusals the
 * pretend remote never produces are not compared here**, since it has no rail, no keeper and no unit to refuse: a
 * wrong unit on the cable, a unit the library does not list, the write flags or the request flags missing, a backup
 * that is not what the remote holds, a keeper of the wrong kind or one that fails, a taken folder, an address the
 * keeper lacks, the provisioning in a hub's mode, and the gate's refusal of a set; each is held on the attached path by
 * `sync-attached.test.ts` and `sync-attached-touch.test.ts`, and the gate's refusal on the pretend by
 * `sync-contract.test.ts`.
 *
 * **What is not claimed.** That the attached side is a remote: both are stand ins, and what a remote does is the
 * bench's. Nor the journal, which a pretend remote keeps under its own name, `sync-contract.test.ts`.
 */
import test from 'node:test';
import assert, { AssertionError } from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { recipe, type BuildSources, type Recipe, type RecipeModel } from '@harmony/codec/node';
import { proves } from '@harmony/testkit/proof';
import {
  SYNC_ENDINGS, pretendRemote, syncDocument, type PretendOptions, type SyncEvent, type SyncOutcome,
} from '../../src/write.ts';
import { BUILT_AT, HELD_AT, SYNC_MODELS, runSync, runSyncCommittedAll, type SyncScenario } from './sync-attached-run.ts';
import { ACCOUNT, runTouchSync, runTouchSyncCommittedAll, switchedOffTouchDocument, type TouchScenario } from './sync-attached-touch-run.ts';

const ONE: RecipeModel = { name: 'Harmony One', skin: 54 };
const TOUCH: RecipeModel = { name: 'Harmony Touch', skin: 99 };
const REFERENCES = new URL('../../../codec/test/references/', import.meta.url);
/** The documents both sides sync: the empty Harmony One setup, and the Harmony Touch's reference recipe. */
const oneDocument = (): Recipe => recipe.create(ONE);
const touchDocument = (): Recipe => recipe.open(JSON.parse(readFileSync(new URL('touch-test.json', REFERENCES), 'utf8')));

/** The words a stand in fails with where both sides can be told the same: the remote not answering when opened. */
const NO_ANSWER = 'the remote did not answer when it was asked which unit it is';

/** What an application's user has none of: a switch, a script, a path of this repository or a command line option. */
const BENCH = /HARMONY_[A-Z_]|\bnode\b|\bbin\/|\.ts\b|\.md\b|(^|\s)--[a-z]/;

/** One sync as both sides report it: its events as words, its outcome, and the same sync again where one was run. */
interface Reported {
  readonly words: string[];
  readonly outcome: SyncOutcome;
  readonly again?: { readonly words: string[]; readonly outcome: SyncOutcome };
  /** The words of every attention event, which a person is shown as the outcome's message is. */
  readonly told?: readonly string[];
}

/** The events as the attached runs give them: short words, progress included. */
const wordsOf = (events: readonly SyncEvent[]): string[] => events.map((event) => (event.kind === 'phase' ? event.phase
  : event.kind === 'progress' ? `${event.phase} ${event.done}/${event.total}`
    : event.kind === 'attention' ? `! ${event.attention}` : `= ${event.outcome.result}`));

/** How a pretend run is asked: where it stops, whether its screen throws, and whether the same sync runs again after. */
interface PretendRun {
  readonly document: Recipe;
  readonly sources: BuildSources;
  readonly remote: PretendOptions;
  readonly commit?: boolean;
  readonly stopAt?: 'start' | 'backup' | 'write' | 'build' | 'hand-over';
  readonly observerThrows?: boolean;
  readonly again?: boolean;
}

/** One sync to a pretend remote as the attached runs make theirs, and the same sync again where asked. */
async function pretend(asked: PretendRun): Promise<Reported> {
  const remote = pretendRemote(asked.remote);
  const once = async (): Promise<{ words: string[]; outcome: SyncOutcome; told: string[] }> => {
    const events: SyncEvent[] = [];
    const stop = new AbortController();
    if (asked.stopAt === 'start') stop.abort();
    const outcome = await syncDocument({
      document: asked.document, remote, sources: asked.sources, commit: asked.commit ?? false,
      onEvent: (event) => {
        events.push(event);
        if (event.kind === 'phase' && event.phase === asked.stopAt) stop.abort();
        if (asked.observerThrows === true) throw new Error('the screen failed');
      },
      journal: () => undefined,
      stop: stop.signal,
    });
    return { words: wordsOf(events), outcome, told: events.flatMap((event) => (event.kind === 'attention' ? [event.message] : [])) };
  };
  const first = await once();
  return asked.again === true ? { ...first, again: await once() } : first;
}

/** A message with a stand in's own words for a failure taken out, so two stand ins' messages compare around them. */
const around = (message: string | undefined, words: string | RegExp): string => (message ?? '').replace(words, '<the failure>');

/** One case: what the attached stand in is told, whether it commits, what the pretend remote is told, and its words. */
interface Case<Scenario> {
  readonly name: string;
  readonly attached: Scenario;
  /** The attached run commits, so it runs in the process with the flags set. */
  readonly committed: boolean;
  readonly pretend: PretendRun;
  /** Where the failure's words are each stand in's: the attached one's, and the pretend remote's. */
  readonly words?: { readonly theirs: string | RegExp; readonly ours: string };
}

/**
 * The comparison every case runs, and the control runs on a case made wrong: the event words first, then the outcome,
 * whole or around each stand in's own words for the failure, then the same sync again where the case asks for one.
 * Throws the first assertion that does not hold.
 */
function compare(name: string, attached: Reported, ours: Reported, words: Case<unknown>['words'], again: boolean): void {
  assert.deepEqual(ours.words, attached.words, name);
  if (words === undefined) {
    assert.deepEqual(ours.outcome, attached.outcome, name);
  } else {
    assert.deepEqual([ours.outcome.result, ours.outcome.remote, ours.outcome.phase, ours.outcome.state],
      [attached.outcome.result, attached.outcome.remote, attached.outcome.phase, attached.outcome.state], name);
    assert.equal(around(ours.outcome.message, words.ours), around(attached.outcome.message, words.theirs), name);
    assert.notEqual(around(ours.outcome.message, words.ours), ours.outcome.message, `${name}: the pretend remote's words are in its message`);
  }
  // A case that runs the same sync again has a second run on both sides, and one that does not has none on either.
  assert.equal(ours.again !== undefined, again, `${name}: the pretend side's second run`);
  assert.equal(attached.again !== undefined, again, `${name}: the attached side's second run`);
  if (again) {
    assert.deepEqual(ours.again!.words, attached.again!.words, `${name}, again`);
    assert.deepEqual(ours.again!.outcome, attached.again!.outcome, `${name}, again`);
  }
}

/** Every case's attached run, those that commit in one process of their own, in the cases' order. */
function attachedRuns<Scenario, Run>(
  cases: readonly Case<Scenario>[], inProcess: (s: Scenario) => Promise<Run>, committedAll: (s: readonly Scenario[]) => Run[],
): Promise<Run[]> {
  const committed = committedAll(cases.filter((one) => one.committed).map((one) => one.attached));
  // One at a time, in the cases' order, so no two stand ins build at once.
  return (async () => {
    const runs: Run[] = [];
    for (const one of cases) runs.push(one.committed ? committed.shift()! : await inProcess(one.attached));
    return runs;
  })();
}

/** An ending as words, `result remote` and the state it names where it names one. */
const ending = (one: { readonly result: string; readonly remote: string; readonly state?: string }): string =>
  `${one.result} ${one.remote}${one.state === undefined ? '' : ` ${one.state}`}`;
/** The endings of a kind as words, sorted, but those `unreached` names. */
const endings = (kind: keyof typeof SYNC_ENDINGS, unreached: readonly string[] = []): string[] =>
  SYNC_ENDINGS[kind].map(ending).filter((one) => !unreached.includes(one)).sort();
/** Every message and attention a person is shown of a sync on both sides: none may name a bench command. */
const benchFree = (name: string, ...runs: readonly Reported[]): void => {
  for (const run of runs.flatMap((one) => (one.again === undefined ? [one] : [one, one.again as Reported]))) {
    for (const said of [run.outcome.message ?? '', ...(run.told ?? [])]) assert.doesNotMatch(said, BENCH, name);
  }
};

// ---------------------------------------------------------------------------------------------------
// A Harmony One, written into flash
// ---------------------------------------------------------------------------------------------------

/** The pretend Harmony One holding what the attached stand in holds: the same document built at the other moment. */
const ONE_HOLDING = { model: ONE, holds: oneDocument(), heldSources: { builtAt: HELD_AT } } as const;
const ONE_SOURCES: BuildSources = { builtAt: BUILT_AT };
const onePretend = (remote: PretendOptions, more: Partial<PretendRun> = {}): PretendRun =>
  ({ document: oneDocument(), sources: ONE_SOURCES, remote, commit: true, ...more });
const PULLED = 'the cable was pulled';
/** The pretend remote's words for an erase that reached the block beside its own. */
const NEIGHBOUR_WORDS = 'the erase reached the block beside the one it was told to erase, and putting that block back is '
  + 'not built yet: send nothing more to this unit';

const ONE_CASES: readonly Case<SyncScenario>[] = [
  { name: 'written', attached: { commit: true }, committed: true, pretend: onePretend(ONE_HOLDING) },
  { name: 'a dry run', attached: {}, committed: false, pretend: onePretend(ONE_HOLDING, { commit: false }) },
  { name: 'nothing to write', attached: { commit: true, holdsTheDocument: true }, committed: false,
    pretend: onePretend({ model: ONE, holds: oneDocument(), heldSources: ONE_SOURCES }) },
  { name: 'a stop before the sync', attached: { commit: true, stopAt: 'start' }, committed: true, pretend: onePretend(ONE_HOLDING, { stopAt: 'start' }) },
  { name: 'a stop during the compare', attached: { commit: true, stopAt: 'backup' }, committed: true, pretend: onePretend(ONE_HOLDING, { stopAt: 'backup' }) },
  { name: 'a stop once the write began', attached: { commit: true, stopAt: 'write' }, committed: true, pretend: onePretend(ONE_HOLDING, { stopAt: 'write' }) },
  { name: 'a screen that throws', attached: { commit: true, observerThrows: true }, committed: true, pretend: onePretend(ONE_HOLDING, { observerThrows: true }) },
  { name: 'a remote of another model', attached: { commit: true, release: 0x1072 }, committed: true, pretend: onePretend({ model: { name: 'Harmony 650' } }) },
  { name: 'no answer when opened', attached: { commit: true, openFails: NO_ANSWER }, committed: true, pretend: onePretend({ ...ONE_HOLDING, failIn: 'identify' }) },
  { name: 'a read of what it holds that fails', attached: { commit: true, readFails: PULLED }, committed: true,
    pretend: onePretend({ ...ONE_HOLDING, failIn: 'backup' }), words: { theirs: PULLED, ours: 'the remote stopped answering' } },
  { name: 'a write that fails part way, and the same sync again', attached: { commit: true, failWrite: 1 }, committed: true,
    pretend: onePretend({ ...ONE_HOLDING, failIn: 'write' }, { again: true }), words: { theirs: PULLED, ours: 'the remote stopped answering' } },
  // The block write's words name the addresses the stand in's flash gave, so they are taken out by their shape.
  { name: 'an erase that reaches the block beside its own', attached: { commit: true, eraseReaches: true }, committed: true,
    pretend: onePretend({ ...ONE_HOLDING, failIn: 'neighbour' }),
    words: { theirs: /the erase changed 0x[\s\S]*send nothing more to this unit\./, ours: NEIGHBOUR_WORDS } },
  { name: 'a read back that fails', attached: { commit: true, verifyFails: PULLED }, committed: true,
    pretend: onePretend({ ...ONE_HOLDING, failIn: 'verify' }), words: { theirs: PULLED, ours: 'the last block written reads back erased' } },
  { name: 'a restart that fails', attached: { commit: true, restartFails: PULLED }, committed: true,
    pretend: onePretend({ ...ONE_HOLDING, failIn: 'restart' }), words: { theirs: PULLED, ours: 'the remote did not take the restart' } },
  // The three other models whose configuration is written into flash, on the same stand in: each written, the pretend
  // remote holding the same setup built at the other moment, as the attached one does.
  ...(['Harmony 600', 'Harmony 650', 'Harmony 700'] as const).map((model): Case<SyncScenario> => {
    const on = SYNC_MODELS[model].model;
    return {
      name: `written, a ${model}`, attached: { model, commit: true }, committed: true,
      pretend: { document: recipe.create(on), sources: ONE_SOURCES, remote: { model: on, holds: recipe.create(on), heldSources: { builtAt: HELD_AT } }, commit: true },
    };
  }),
];

/** The endings a write into flash has that no case reaches, each with why: a restart withheld, the Harmony 885's alone. */
const ONE_UNREACHED = ['failed new-configuration restart-withheld'];

test('a sync to a pretend Harmony One reports what a sync to an attached one reports, event for event and outcome for outcome, reaching every ending of a write into flash', async () => {
  proves(80, 'every');
  const attached = await attachedRuns(ONE_CASES, runSync, runSyncCommittedAll);
  const reached = new Set<string>();
  for (const [k, one] of ONE_CASES.entries()) {
    const ours = await pretend(one.pretend);
    compare(one.name, attached[k]!, ours, one.words, one.pretend.again === true);
    benchFree(one.name, ours, attached[k]!);
    reached.add(ending(ours.outcome));
  }
  // Every ending a write into flash has, by the source's own list, reached on both sides, but the one no model a
  // document builds for reaches; and that one is still on the list, so it is not reached because it went.
  assert.deepEqual([...reached].sort(), endings('compiled', ONE_UNREACHED));
  assert.ok(ONE_UNREACHED.every((one) => SYNC_ENDINGS.compiled.map(ending).includes(one)));

  // The control: the same comparison, run on the failing write with the pretend remote told to fail in the read back
  // instead, has to fail, and on the event words.
  const wrong = ONE_CASES.find((one) => one.name.startsWith('a write that fails part way'))!;
  const ours = await pretend({ ...wrong.pretend, remote: { ...wrong.pretend.remote, failIn: 'verify' } });
  assert.throws(() => compare(wrong.name, attached[ONE_CASES.indexOf(wrong)]!, ours, wrong.words, true), (error: unknown) => {
    assert.ok(error instanceof AssertionError);
    assert.deepEqual(error.actual, ours.words, 'the comparison failed on the event words');
    return true;
  });
});

// ---------------------------------------------------------------------------------------------------
// A Harmony Touch, given documents
// ---------------------------------------------------------------------------------------------------

const TOUCH_SOURCES: BuildSources = { builtAt: BUILT_AT, account: ACCOUNT as never };
const touchPretend = (remote: Partial<PretendOptions> = {}, more: Partial<PretendRun> = {}): PretendRun =>
  ({ document: touchDocument(), sources: TOUCH_SOURCES, remote: { model: TOUCH, ...remote }, commit: true, ...more });
const STOPPED = 'the remote stopped answering';
/** The session's words for a reply that never came to the first open of the sync's first request list, `touchsession.ts`. */
const SILENCE = 'no reply to the open for reading within 40000 ms';

const TOUCH_CASES: readonly Case<TouchScenario>[] = [
  { name: 'written', attached: { commit: true }, committed: true, pretend: touchPretend() },
  { name: 'written, an activity switched off', attached: { commit: true, switchedOff: true }, committed: true,
    pretend: touchPretend({}, { document: switchedOffTouchDocument() }) },
  { name: 'a dry run', attached: {}, committed: false, pretend: touchPretend({}, { commit: false }) },
  { name: 'a dry run on battery', attached: { powerstate: 'battery\n' }, committed: false, pretend: touchPretend({ powerSource: 'battery' }, { commit: false }) },
  { name: 'a commit on battery', attached: { commit: true, powerstate: 'battery\n' }, committed: true, pretend: touchPretend({ powerSource: 'battery' }) },
  { name: 'a dry run with no answer when opened', attached: { openFails: NO_ANSWER }, committed: false, pretend: touchPretend({ failIn: 'identify' }, { commit: false }) },
  { name: 'a commit with no answer when opened', attached: { commit: true, openFails: NO_ANSWER }, committed: true, pretend: touchPretend({ failIn: 'identify' }) },
  { name: 'a stop before the sync', attached: { commit: true, stopAt: 'start' }, committed: true, pretend: touchPretend({}, { stopAt: 'start' }) },
  { name: 'a stop while it builds', attached: { commit: true, stopAt: 'build' }, committed: true, pretend: touchPretend({}, { stopAt: 'build' }) },
  { name: 'a stop once the hand over began', attached: { commit: true, stopAt: 'hand-over' }, committed: true, pretend: touchPretend({}, { stopAt: 'hand-over' }) },
  { name: 'a screen that throws', attached: { commit: true, observerThrows: true }, committed: true, pretend: touchPretend({}, { observerThrows: true }) },
  { name: 'a remote of another model', attached: { commit: true, remote: 'one' }, committed: true,
    pretend: { document: touchDocument(), sources: TOUCH_SOURCES, remote: { model: ONE }, commit: true } },
  { name: 'the remote\'s own abort', attached: { commit: true, sync: [[{ verb: 'POST', uri: 'proxy://Abort' }]] }, committed: true,
    pretend: touchPretend({ aborts: true }) },
  { name: 'a hand over that fails', attached: { commit: true, handOverFails: true }, committed: true,
    pretend: touchPretend({ failIn: 'hand-over' }), words: { theirs: 'the remote answered a request list with status 500', ours: STOPPED } },
  { name: 'a write that fails once the sync started', attached: { commit: true, sync: [[{ verb: 'GET', uri: 'harmony://Account/1/Other' }]] },
    committed: true, pretend: touchPretend({ failIn: 'write' }), words: { theirs: 'the set holds no answer for Other', ours: STOPPED } },
  { name: 'an answer that never came once the sync started', attached: { commit: true, silentOnceStarted: true }, committed: true,
    pretend: touchPretend({ failIn: 'write' }), words: { theirs: SILENCE, ours: STOPPED } },
];

test('a sync to a pretend Harmony Touch reports what a sync to an attached one reports, event for event and outcome for outcome, reaching every ending of an answered sync', async () => {
  proves(80, 'every');
  const attached = await attachedRuns(TOUCH_CASES, runTouchSync, runTouchSyncCommittedAll);
  const reached = new Set<string>();
  for (const [k, one] of TOUCH_CASES.entries()) {
    const ours = await pretend(one.pretend);
    compare(one.name, attached[k]!, ours, one.words, false);
    benchFree(one.name, ours, attached[k]!);
    reached.add(ending(ours.outcome));
  }
  // Every ending an answered sync has, by the source's own list, reached on both sides.
  assert.deepEqual([...reached].sort(), endings('document'));
  // The case with an activity switched off compares outcomes that name it, so the two sides agree on a statement made,
  // not on an absent one; every other case's outcome names none.
  const off = TOUCH_CASES.findIndex((one) => one.name === 'written, an activity switched off');
  assert.deepEqual(attached[off]!.outcome.leftOut, [{ id: 'a3', name: 'Listen to Music' }]);
  assert.deepEqual(attached.filter((_, k) => k !== off).map((one) => one.outcome.leftOut), TOUCH_CASES.slice(1).map(() => undefined));

  // The control: the same comparison, run on the failing hand over with the pretend remote told to fail in the write
  // instead, has to fail, and on the event words.
  const wrong = TOUCH_CASES.find((one) => one.name === 'a hand over that fails')!;
  const ours = await pretend({ ...wrong.pretend, remote: { ...wrong.pretend.remote, failIn: 'write' } });
  assert.throws(() => compare(wrong.name, attached[TOUCH_CASES.indexOf(wrong)]!, ours, wrong.words, false), (error: unknown) => {
    assert.ok(error instanceof AssertionError);
    assert.deepEqual(error.actual, ours.words, 'the comparison failed on the event words');
    return true;
  });
});
