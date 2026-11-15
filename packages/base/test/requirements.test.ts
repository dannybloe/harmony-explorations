/**
 * The FHSDK's requirements and their statuses, `src/requirements.ts`, held to the rules that make them worth asking,
 * decision 33.
 *
 * Four kinds of rule. **The numbers are permanent**: they run from 1 with no gap and no repeat, so a requirement
 * taken out of the list instead of being marked withdrawn fails here, and the count is asserted exactly, so adding
 * one is a line in this file's diff. **Every status is complete**: each bench model has exactly one status per
 * requirement of the models, and a requirement of the FHSDK as a whole has one shared status. **Every status carries
 * its evidence**: met names a test and, where the requirement shows on a remote, a bench demonstration; impossible
 * names a reference page; an open one says whose work is missing; and every path names a file that exists, a
 * test-notes passage by a heading that exists.
 * **The proofs are sound**, the calls of `proves` the tests carry, read into `src/proofs.ts`: every requirement on
 * every bench model is proven or has a written status, never both; a proof names a requirement and bench models that
 * exist, every model for a requirement of the FHSDK as a whole; a proof of a requirement that shows on a remote names
 * a bench record; and every path a proof names exists. Each of those checks is a function of the proofs and the
 * written statuses, run on the committed data and, as its control, on data planted to break it.
 *
 * A test cannot judge whether a test shows what its proof claims; that is read when the proof is written, beside the
 * test's own assertions, and the path check is what keeps a renamed test or a moved heading from leaving a proof
 * pointing at nothing. That the proofs module is what the test sources give is the generator's test,
 * `packages/codec/test/package/requirements.test.ts`, since only the generator reads the sources.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as proof from '@harmony/testkit/proof';
import {
  BENCH_MODELS, benchModel, PROOFS, proofsFor, REQUIREMENT_STATUS_NAMES, REQUIREMENT_SUBJECTS, REQUIREMENT_WAIT_NAMES,
  REQUIREMENTS, requirement, requirementState, writtenStatus,
  type BenchModelKey, type Proof, type RequirementState, type RequirementWait,
} from '../src/requirements.ts';
import { MODELS_BY_SKIN } from '../src/models.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** GitHub's anchor for a heading: lower case, punctuation but hyphens, underscores and spaces dropped, spaces to hyphens. */
function anchor(heading: string): string {
  return heading.trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-');
}

/** The anchors of a markdown file's headings, code blocks skipped. */
function anchorsOf(path: string): Set<string> {
  const found = new Set<string>();
  let fenced = false;
  for (const line of readFileSync(ROOT + path, 'utf8').split('\n')) {
    if (line.startsWith('```')) fenced = !fenced;
    const heading = fenced ? null : /^#{1,6} (.*)$/.exec(line);
    if (heading) found.add(anchor(heading[1]!.replace(/`/g, '')));
    // An explicit anchor, as every entry of `docs/decisions.md` carries one, `<a id="d18"></a>`.
    for (const explicit of line.matchAll(/<a id="([a-z0-9_-]+)"><\/a>/g)) found.add(explicit[1]!);
  }
  return found;
}

/** What is wrong with one evidence path, or undefined: a missing file, or a heading the file does not have. */
function missing(path: string): string | undefined {
  const [file, fragment] = path.split('#') as [string, string | undefined];
  if (!existsSync(ROOT + file)) return `${path}: no such file`;
  if (fragment !== undefined && !anchorsOf(file).has(fragment)) return `${path}: no such heading`;
  return undefined;
}

/** Every model's and the whole FHSDK's statuses, each with a label for a failure. */
function everyState(): { label: string; state: RequirementState; needsBench: boolean }[] {
  return REQUIREMENTS.flatMap((one) => (one.scope === 'whole' ? [BENCH_MODELS[0]!] : BENCH_MODELS).map((model) => ({
    label: `R${one.number} on the ${one.scope === 'whole' ? 'FHSDK as a whole' : model.name}`,
    state: requirementState(model.key, one.number),
    needsBench: one.needsBench,
  })));
}

test('the requirements are numbered from 1 with no gap and no repeat, 93 of them under fifteen subjects', () => {
  // Exact, so a requirement added or taken out shows in this diff; a dropped one stays, withdrawn.
  assert.equal(REQUIREMENTS.length, 93);
  assert.deepEqual(REQUIREMENTS.map((one) => one.number), Array.from({ length: 93 }, (_, i) => i + 1));
  assert.equal(REQUIREMENT_SUBJECTS.length, 15);
  // The subjects are listed in the order of their first requirement, and each subject's requirements are in number
  // order. A requirement added to a subject after a later one was numbered takes the next free number, since a number
  // is never moved, so a subject's numbers are one run but for those: R89, the devices' latest, and R90 to R93, the activities'.
  const firsts = REQUIREMENT_SUBJECTS.map((subject) => REQUIREMENTS.find((one) => one.subject === subject)!.number);
  assert.deepEqual(firsts, [...firsts].sort((a, b) => a - b));
  const late = REQUIREMENTS.filter((one, i, all) => i > 0 && one.subject !== all[i - 1]!.subject
    && REQUIREMENTS.some((other) => other.number < one.number && other.subject === one.subject));
  assert.deepEqual(late.map((one) => [one.number, one.subject]), [[89, 'Devices and codes'], [90, 'Activities']]);
  for (const one of REQUIREMENTS) assert.ok(one.text.length > 0 && one.text.endsWith('.'), `R${one.number}`);
});

test('two subjects are the FHSDK\'s as a whole, and of the others the seven that work on a recipe or the catalogue alone', () => {
  const whole = REQUIREMENTS.filter((one) => one.scope === 'whole').map((one) => one.number);
  // Finding a device, renaming a device and an activity, Pronto Hex, identifying a device from taught codes, moving
  // a setup and the report about an unsupported remote reach no remote; then the two subjects, R73 to R82.
  assert.deepEqual(whole, [9, 12, 20, 25, 57, 60, 68, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82]);
  // None of them shows on a remote, so a test proves one whole, but for the report, which is made on a remote.
  assert.deepEqual(REQUIREMENTS.filter((one) => one.scope === 'whole' && one.needsBench).map((one) => one.number), [68]);
  // Removing a device or an activity stays a model's: the Harmony Touch has both proven on a unit.
  assert.deepEqual([13, 26].map((number) => requirement(number)!.scope), ['model', 'model']);
  assert.equal(requirementState('harmony-touch', 13).status, 'met');
  assert.equal(requirementState('harmony-touch', 26).status, 'met');
  // The two subjects every requirement of which is about the FHSDK and no remote: how it is built and delivered, and
  // the outside an application builds against. The hub's own requirements, the last subject, are a model's.
  const wholeSubjects = REQUIREMENT_SUBJECTS.filter((subject) =>
    REQUIREMENTS.filter((one) => one.subject === subject).every((one) => one.scope === 'whole'));
  assert.deepEqual(wholeSubjects, ['The FHSDK as a whole', 'What an application builds on']);
  assert.ok(REQUIREMENTS.filter((one) => one.subject === 'The hub').every((one) => one.scope === 'model'));
});

test('every bench model has a status for every requirement, and a whole one is the same for all', () => {
  for (const model of BENCH_MODELS) {
    for (const one of REQUIREMENTS) {
      const state = requirementState(model.key, one.number);
      assert.ok(REQUIREMENT_STATUS_NAMES.includes(state.status), `R${one.number} on the ${model.name}`);
      assert.ok(state.why.trim().length > 0, `R${one.number} on the ${model.name} says why`);
    }
  }
  for (const one of REQUIREMENTS.filter((r) => r.scope === 'whole')) {
    const states = BENCH_MODELS.map((model) => requirementState(model.key, one.number));
    assert.ok(states.every((state) => state === states[0]), `R${one.number} is one status`);
  }
  assert.throws(() => requirementState('harmony-one', 999), /no requirement R999/);
  assert.equal(requirement(0), undefined);
});

test('a met names a test, and a bench demonstration where the requirement shows on a remote; an impossible names a reference page or a decision', () => {
  const faults: string[] = [];
  for (const { label, state, needsBench } of everyState()) {
    if (state.status === 'met') {
      if (state.tests.length === 0) faults.push(`${label}: met with no test`);
      if (needsBench && state.bench.length === 0) faults.push(`${label}: met with no bench demonstration`);
    }
    if (state.status === 'impossible' && state.reference.length === 0) faults.push(`${label}: impossible with no reference page or decision`);
    // Evidence only where a status rests on it: an open or unknown one says why and names nothing it would need.
    if (state.status !== 'met' && (state.tests.length > 0 || state.bench.length > 0 || state.proofs.length > 0)) {
      faults.push(`${label}: evidence of a met on a ${state.status}`);
    }
    // A met is its proofs: its tests are theirs, and nothing else.
    if (state.status === 'met' && state.tests.some((test) => !state.proofs.some((one) => one.test === test))) {
      faults.push(`${label}: a test no proof names`);
    }
    // A reference page is what an impossible rests on, and what leaves an unknown open; a met rests on its tests.
    if ((state.status === 'met' || state.status === 'open') && state.reference.length > 0) faults.push(`${label}: a reference page on a ${state.status}`);
  }
  assert.deepEqual(faults, []);
});

/** What is wrong with what one status says it waits on, as faults; a function so the control below can plant one. */
function waitFaults(label: string, state: RequirementState, needsBench: boolean, whole: boolean): string[] {
  const faults: string[] = [];
  const waits = state.waitsOn;
  if (state.status !== 'open') return waits.length === 0 ? [] : [`${label}: ${state.status}, and waiting on something`];
  if (waits.length === 0) faults.push(`${label}: open and waiting on nothing`);
  // Each owner once, in the order of the names, so two statuses that wait on the same compare equal.
  const ordered = REQUIREMENT_WAIT_NAMES.filter((wait) => waits.includes(wait));
  if (waits.length !== ordered.length || waits.some((wait, i) => wait !== ordered[i])) faults.push(`${label}: its owners are not each once, in order`);
  // Whatever else is missing has no run on a unit either, so the run is named only when it is all that is missing,
  // and only where the requirement shows on a remote at all.
  if (waits.includes('bench') && waits.length > 1) faults.push(`${label}: a run on a unit named beside other work`);
  if (waits.includes('bench') && !needsBench) faults.push(`${label}: waits on a run on a unit, and a test shows it whole`);
  // A requirement of the FHSDK as a whole has no family and no model in it.
  if (whole && (waits.length !== 1 || waits[0] !== 'shared')) faults.push(`${label}: the FHSDK's as a whole, and waiting on more than the FHSDK`);
  return faults;
}

test('every open status says whose work is missing, a run on a unit only alone, and no other status waits on anything', () => {
  const faults: string[] = [];
  const counts = new Map<RequirementWait, number>(REQUIREMENT_WAIT_NAMES.map((wait) => [wait, 0]));
  for (const one of REQUIREMENTS) {
    for (const model of one.scope === 'whole' ? [BENCH_MODELS[0]!] : BENCH_MODELS) {
      const state = requirementState(model.key, one.number);
      const label = `R${one.number} on the ${one.scope === 'whole' ? 'FHSDK as a whole' : model.name}`;
      faults.push(...waitFaults(label, state, one.needsBench, one.scope === 'whole'));
      for (const wait of state.waitsOn) counts.set(wait, counts.get(wait)! + 1);
    }
  }
  assert.deepEqual(faults, []);
  // Every owner is used, so none of the four is a name nothing carries.
  for (const wait of REQUIREMENT_WAIT_NAMES) assert.ok(counts.get(wait)! > 0, wait);
  // A model no family serves cannot wait on the FHSDK alone for anything a family builds: the Harmony 515's build
  // from a recipe waits on a family, and its taking over as the user's own on its write path as well as the FHSDK.
  assert.deepEqual(requirementState('harmony-515', 4).waitsOn, ['family']);
  assert.deepEqual(requirementState('harmony-515', 6).waitsOn, ['shared', 'model']);
  // And the same requirement on a model whose family builds waits on the FHSDK alone.
  assert.deepEqual(requirementState('harmony-650', 6).waitsOn, ['shared']);
});

test('the control: an open status waiting on nothing, a run beside other work, owners out of order and a whole one with a family are each found', () => {
  const open = (waitsOn: readonly RequirementWait[]): RequirementState =>
    ({ status: 'open', tests: [], bench: [], proofs: [], reference: [], why: 'planted', waitsOn });
  assert.match(waitFaults('x', open([]), true, false)[0]!, /waiting on nothing/);
  assert.match(waitFaults('x', open(['family', 'bench']), true, false)[0]!, /beside other work/);
  assert.match(waitFaults('x', open(['bench']), false, false)[0]!, /a test shows it whole/);
  assert.match(waitFaults('x', open(['family', 'shared']), true, false)[0]!, /in order/);
  assert.match(waitFaults('x', open(['shared', 'shared']), true, false)[0]!, /each once/);
  assert.match(waitFaults('x', open(['shared', 'family']), false, true)[0]!, /more than the FHSDK/);
  assert.match(waitFaults('x', { ...open(['shared']), status: 'unknown' }, true, false)[0]!, /unknown, and waiting on something/);
  assert.deepEqual(waitFaults('x', open(['shared', 'model']), true, false), []);
  assert.deepEqual(waitFaults('x', open(['bench']), true, false), []);
});

test('each kind of evidence is where that kind lives: tests, bench runs or test notes, and the reference', () => {
  const faults: string[] = [];
  for (const { label, state } of everyState()) {
    for (const path of state.tests) {
      if (!/^packages\/[^/]+\/test\/.+\.test\.ts$|^tests\/.+\/test_[^/]+\.py$/.test(path)) faults.push(`${label}: ${path} is not a test`);
    }
    for (const path of state.bench) {
      if (!/^packages\/[^/]+\/test\/.+\.test\.ts$|^docs\/test-notes\/[^/]+\.md(#[a-z0-9_-]+)?$/.test(path)) faults.push(`${label}: ${path} is no bench record`);
    }
    for (const path of state.reference) {
      if (!/^reference\/.+\.md(#[a-z0-9_-]+)?$/.test(path) && !/^docs\/decisions\.md#d\d+$/.test(path)) faults.push(`${label}: ${path} is not a reference page or a decision`);
    }
  }
  assert.deepEqual(faults, []);
});

test('every evidence path names a file that exists, and a heading that exists where it names one', () => {
  const paths = new Set(everyState().flatMap(({ state }) => [...state.tests, ...state.bench, ...state.reference]));
  assert.ok(paths.size > 0, 'the statuses name some evidence');
  assert.deepEqual([...paths].map(missing).filter((fault) => fault !== undefined), []);
});

test('the control: a path to no file and a heading no file has are both found', () => {
  // Without this the test above could pass by checking nothing.
  assert.match(missing('docs/test-notes/no-such-model.md') ?? '', /no such file/);
  assert.match(missing('docs/test-notes/README.md#no-such-heading') ?? '', /no such heading/);
  assert.equal(missing('docs/test-notes/README.md#the-units'), undefined);
});

test('a sentence of the data carries no em or en dash, which nothing published here does', () => {
  const dashes = /[–—]/;
  for (const one of REQUIREMENTS) assert.ok(!dashes.test(one.text), `R${one.number}`);
  for (const { label, state } of everyState()) assert.ok(!dashes.test(state.why), label);
});

test('the bench models are found by key and by every skin they report, and each skin by one model alone', () => {
  assert.deepEqual(BENCH_MODELS.map((model) => model.key), [
    'harmony-one', 'harmony-600', 'harmony-650', 'harmony-700', 'harmony-525', 'harmony-515', 'harmony-885', 'harmony-785',
    'harmony-300', 'harmony-350', 'harmony-touch', 'harmony-elite', 'harmony-hub',
  ]);
  const skins = BENCH_MODELS.flatMap((model) => model.skins);
  assert.equal(new Set(skins).size, skins.length, 'no skin is two models');
  for (const model of BENCH_MODELS) {
    assert.equal(benchModel(model.key), model);
    for (const skin of model.skins) assert.equal(benchModel(skin), model, `skin ${skin}`);
  }
  assert.equal(benchModel(18), undefined, 'the 520, not a bench model');
});

test('a skin the model table holds is that model there, or its European twin', () => {
  // The model table is the other list of skins to models; the two may not disagree about a bench model. The 300, 350
  // and Touch have no record there, by design, and the codec's registry holds their skins, its own test. The Elite and
  // the hub have none either and no family yet, so nothing but the bench list holds their skins.
  for (const model of BENCH_MODELS) {
    for (const skin of model.skins) {
      const record = MODELS_BY_SKIN[skin];
      if (record === undefined) continue;
      assert.ok([model.name, `${model.name} EMEA`].includes(`Harmony ${record.name}`), `skin ${skin} is the Harmony ${record.name}`);
    }
  }
  assert.deepEqual(BENCH_MODELS.flatMap((model) => model.skins).filter((skin) => MODELS_BY_SKIN[skin] === undefined), [79, 104, 99, 111, 106]);
});

// ---------------------------------------------------------------------------------------------------
// The proofs
// ---------------------------------------------------------------------------------------------------

/** A written status by model and number, as the checks below take it, so a control can plant one. */
type Written = (model: BenchModelKey, number: number) => RequirementState | undefined;

/**
 * Every requirement on every bench model is proven or written, never both and never neither: a requirement of the
 * models per model, one of the FHSDK as a whole once, since it is one status for every model.
 */
function standingFaults(proofs: readonly Proof[], written: Written): string[] {
  const faults: string[] = [];
  for (const one of REQUIREMENTS) {
    for (const model of one.scope === 'whole' ? [BENCH_MODELS[0]!] : BENCH_MODELS) {
      const where = `R${one.number} ${one.scope === 'whole' ? 'for the FHSDK as a whole' : `on the ${model.name}`}`;
      const proven = proofsFor(proofs, model.key, one.number).length > 0;
      const stated = written(model.key, one.number) !== undefined;
      if (proven && stated) faults.push(`${where}: proven and written`);
      if (!proven && !stated) faults.push(`${where}: neither proven nor written`);
    }
  }
  return faults;
}

/** A proof names a requirement and bench models that exist, each once, and every model for a whole requirement. */
function namingFaults(proofs: readonly Proof[]): string[] {
  const faults: string[] = [];
  for (const one of proofs) {
    const where = `${one.test}, "${one.title}"`;
    const asked = requirement(one.requirement);
    if (asked === undefined) {
      faults.push(`${where}: no requirement R${one.requirement}`);
      continue;
    }
    if (one.models === 'every') continue;
    if (asked.scope === 'whole') faults.push(`${where}: R${one.requirement} is the FHSDK's as a whole, so it is proven for every model`);
    if (one.models.length === 0) faults.push(`${where}: R${one.requirement} names no model`);
    for (const key of one.models) {
      if (benchModel(key as BenchModelKey) === undefined) faults.push(`${where}: ${key} is no bench model`);
    }
    if (new Set(one.models).size !== one.models.length) faults.push(`${where}: a model named twice`);
  }
  return faults;
}

/** A proof of a requirement that shows on a remote names a bench record, and each record is of a bench record's kind. */
function benchFaults(proofs: readonly Proof[]): string[] {
  const faults: string[] = [];
  for (const one of proofs) {
    const where = `${one.test}, "${one.title}", R${one.requirement}`;
    if (requirement(one.requirement)?.needsBench === true && one.bench.length === 0) {
      faults.push(`${where}: shows on a remote and names no bench record`);
    }
    for (const path of one.bench) {
      if (!/^packages\/[^/]+\/test\/.+\.test\.ts$|^docs\/test-notes\/[^/]+\.md(#[a-z0-9_-]+)?$/.test(path)) {
        faults.push(`${where}: ${path} is no bench record`);
      }
    }
  }
  return faults;
}

/** Every path a proof names exists: its test, a test file, and each bench record, a heading where it names one. */
function pathFaults(proofs: readonly Proof[]): string[] {
  const faults: string[] = [];
  for (const one of proofs) {
    if (!/^packages\/[^/]+\/test\/.+\.test\.ts$|^tests\/.+\/test_[^/]+\.py$/.test(one.test)) faults.push(`${one.test}: not a test file`);
    for (const path of [one.test, ...one.bench]) {
      const fault = missing(path);
      if (fault !== undefined) faults.push(fault);
    }
  }
  return [...new Set(faults)];
}

/** A proof for planting in a control: a real one with a field changed. */
const planted = (change: Partial<Proof>): Proof => ({ ...PROOFS[0]!, ...change });

test('the committed proofs are sound: every requirement on every model proven or written, never both, each proof naming what exists', () => {
  assert.ok(PROOFS.length > 0, 'the tests carry proofs');
  assert.deepEqual(standingFaults(PROOFS, writtenStatus), []);
  assert.deepEqual(namingFaults(PROOFS), []);
  assert.deepEqual(benchFaults(PROOFS), []);
  assert.deepEqual(pathFaults(PROOFS), []);
});

test('the control: a requirement both proven and written, and one neither, are each found', () => {
  // R29 on the Harmony One is impossible, written; a proof of it makes it both.
  const both = standingFaults([...PROOFS, planted({ requirement: 29, models: ['harmony-one'] })], writtenStatus);
  assert.deepEqual(both, ['R29 on the Harmony One: proven and written']);
  // R1 on the Harmony One is proven alone; without its proofs it is neither.
  const without = PROOFS.filter((one) => !(one.requirement === 1 && one.models !== 'every' && one.models.includes('harmony-one')));
  assert.deepEqual(standingFaults(without, writtenStatus), ['R1 on the Harmony One: neither proven nor written']);
  // And a whole requirement counts once: R75 written as open and proven for every model is one fault.
  assert.deepEqual(standingFaults([...PROOFS, planted({ requirement: 75, models: 'every' })], writtenStatus),
    ['R75 for the FHSDK as a whole: proven and written']);
});

test('the control: a proof naming no requirement, no bench model, a model twice or some models for a whole requirement is found', () => {
  const faults = namingFaults([
    planted({ requirement: 999 }),
    planted({ models: ['harmony-520'] }),
    planted({ models: ['harmony-one', 'harmony-one'] }),
    planted({ requirement: 73, models: ['harmony-one'] }),
  ]);
  assert.equal(faults.length, 4, faults.join('\n'));
  assert.match(faults[0]!, /no requirement R999/);
  assert.match(faults[1]!, /harmony-520 is no bench model/);
  assert.match(faults[2]!, /a model named twice/);
  assert.match(faults[3]!, /R73 is the FHSDK's as a whole/);
});

test('the control: a proof of a requirement that shows on a remote with no bench record, and a record of the wrong kind, are found', () => {
  // R1 shows on a remote; R20, Pronto Hex, does not, so it needs no record.
  assert.ok(requirement(1)!.needsBench && !requirement(20)!.needsBench);
  assert.deepEqual(benchFaults([planted({ requirement: 20, models: 'every', bench: [] })]), []);
  const faults = benchFaults([
    planted({ requirement: 1, bench: [] }),
    planted({ requirement: 1, bench: ['reference/remotes/harmony-one/README.md'] }),
  ]);
  assert.equal(faults.length, 2, faults.join('\n'));
  assert.match(faults[0]!, /names no bench record/);
  assert.match(faults[1]!, /is no bench record/);
});

test('the control: a proof naming a test or a bench record that does not exist, or a heading that does not, is found', () => {
  const faults = pathFaults([
    planted({ test: 'packages/codec/test/no-such.test.ts', bench: [] }),
    planted({ bench: ['docs/test-notes/harmony-one.md#no-such-heading'] }),
    planted({ test: 'docs/test-notes/README.md', bench: [] }),
  ]);
  assert.deepEqual(faults, [
    'packages/codec/test/no-such.test.ts: no such file',
    'docs/test-notes/harmony-one.md#no-such-heading: no such heading',
    'docs/test-notes/README.md: not a test file',
  ]);
});

test('a met is what its proofs give: their tests and bench records, and a sentence saying so', () => {
  for (const model of BENCH_MODELS) {
    for (const one of REQUIREMENTS) {
      const state = requirementState(model.key, one.number);
      if (state.status !== 'met') continue;
      const proving = proofsFor(PROOFS, model.key, one.number);
      assert.deepEqual(state.proofs, proving, `R${one.number} on the ${model.name}`);
      assert.deepEqual(state.tests, [...new Set(proving.map((p) => p.test))]);
      assert.deepEqual(state.bench, [...new Set(proving.flatMap((p) => p.bench))]);
      assert.match(state.why, /^Proven by \w+ tests? in \w+ files?(, and shown working on a unit in \w+ records?)?\.$/);
    }
  }
  // The same question answers with the same object, which an application may compare.
  assert.equal(requirementState('harmony-650', 1), requirementState('harmony-650', 1));
});

test('the helper checks its own arguments and nothing else: a requirement, bench models, paths', () => {
  // Called through the module's name, so the generator does not read these as proofs.
  assert.doesNotThrow(() => proof.proves(1, ['harmony-650'], ['docs/test-notes/harmony-650.md#memory-as-read']));
  assert.doesNotThrow(() => proof.proves(20, 'every'));
  // A path that does not exist passes here: the helper does not look at the disk, the checks above do.
  assert.doesNotThrow(() => proof.proves(1, ['harmony-650'], ['docs/test-notes/no-such.md']));
  assert.throws(() => proof.proves(999, 'every'), /no requirement R999/);
  assert.throws(() => proof.proves(1.5, 'every'), /no requirement/);
  assert.throws(() => proof.proves(1, []), /names no model/);
  assert.throws(() => proof.proves(1, ['harmony-520' as BenchModelKey]), /harmony-520, which is no bench model/);
  assert.throws(() => proof.proves(1, ['harmony-one', 'harmony-one']), /a model twice/);
  assert.throws(() => proof.proves(1, ['harmony-one'], ['']), /no path/);
});
