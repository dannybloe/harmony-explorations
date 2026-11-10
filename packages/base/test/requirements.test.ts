/**
 * The FHSDK's requirements and their statuses, `src/requirements.ts`, held to the rules that make them worth asking,
 * decision 33.
 *
 * Three kinds of rule. **The numbers are permanent**: they run from 1 with no gap and no repeat, so a requirement
 * taken out of the list instead of being marked withdrawn fails here, and the count is asserted exactly, so adding
 * one is a line in this file's diff. **Every status is complete**: each bench model has exactly one status per
 * requirement of the models, and a requirement of the FHSDK as a whole has one shared status. **Every status carries
 * its evidence**: met names a test and, where the requirement shows on a remote, a bench demonstration; impossible
 * names a reference page; and every path names a file that exists, a test-notes passage by a heading that exists.
 * A test cannot judge whether the evidence shows what it is cited for; that was read when each status was written,
 * and the path check is what keeps a renamed test or a moved heading from leaving a status pointing at nothing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  BENCH_MODELS, benchModel, REQUIREMENT_STATUS_NAMES, REQUIREMENT_SUBJECTS, REQUIREMENTS, requirement, requirementState,
  type RequirementState,
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

test('the requirements are numbered from 1 with no gap and no repeat, 75 of them under twelve subjects', () => {
  // Exact, so a requirement added or taken out shows in this diff; a dropped one stays, withdrawn.
  assert.equal(REQUIREMENTS.length, 75);
  assert.deepEqual(REQUIREMENTS.map((one) => one.number), Array.from({ length: 75 }, (_, i) => i + 1));
  assert.equal(REQUIREMENT_SUBJECTS.length, 12);
  // The subjects follow each other in number order: a subject's requirements are one run.
  const runs = REQUIREMENTS.map((one) => one.subject).filter((subject, i, all) => subject !== all[i - 1]);
  assert.deepEqual(runs, REQUIREMENT_SUBJECTS);
  for (const one of REQUIREMENTS) assert.ok(one.text.length > 0 && one.text.endsWith('.'), `R${one.number}`);
});

test('the requirements of the last subject are the FHSDK\'s as a whole, and of the others only the report about an unsupported remote', () => {
  const whole = REQUIREMENTS.filter((one) => one.scope === 'whole').map((one) => one.number);
  assert.deepEqual(whole, [68, 73, 74, 75]);
  assert.ok(REQUIREMENTS.filter((one) => one.subject === REQUIREMENT_SUBJECTS.at(-1)).every((one) => one.scope === 'whole'));
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
  assert.throws(() => requirementState('harmony-one', 76), /no requirement R76/);
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
    if (state.status !== 'met' && (state.tests.length > 0 || state.bench.length > 0)) faults.push(`${label}: evidence of a met on a ${state.status}`);
    // A reference page is what an impossible rests on, and what leaves an unknown open; a met rests on its tests.
    if ((state.status === 'met' || state.status === 'open') && state.reference.length > 0) faults.push(`${label}: a reference page on a ${state.status}`);
  }
  assert.deepEqual(faults, []);
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
    'harmony-one', 'harmony-600', 'harmony-650', 'harmony-700', 'harmony-525', 'harmony-885', 'harmony-300', 'harmony-350',
    'harmony-touch',
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
  // and Touch have no record there, by design, and the codec's registry holds their skins, its own test.
  for (const model of BENCH_MODELS) {
    for (const skin of model.skins) {
      const record = MODELS_BY_SKIN[skin];
      if (record === undefined) continue;
      assert.ok([model.name, `${model.name} EMEA`].includes(`Harmony ${record.name}`), `skin ${skin} is the Harmony ${record.name}`);
    }
  }
  assert.deepEqual(BENCH_MODELS.flatMap((model) => model.skins).filter((skin) => MODELS_BY_SKIN[skin] === undefined), [79, 104, 99]);
});
