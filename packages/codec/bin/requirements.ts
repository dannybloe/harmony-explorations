/**
 * Read every test's proofs, and write or check what they and the requirements data generate, decision 33.
 *
 * ```
 * node packages/codec/bin/requirements.ts            check every generated file against the sources
 * node packages/codec/bin/requirements.ts --write    rewrite them from the sources
 * ```
 *
 * **What it reads.** Every test source in the repository, the TypeScript tests under `packages/<name>/test/` and the
 * Python tests under `tests/`, statically: no test is run. In each it finds the calls of `proves`, the line a test
 * carries to say which requirement it proves for which bench models and where that was shown on a unit,
 * `@harmony/testkit/proof` and `tests/proves.py`, and records each with the test's file and title. A call whose
 * arguments are not literals, or that stands outside any test, is a fault, since what it would prove cannot be read
 * off the source. The requirements themselves and the statuses written by hand, open, impossible and unknown, are
 * `@harmony/base/requirements`.
 *
 * **What it writes**, each file whole or between its markers:
 *
 * * `packages/base/src/proofs.ts`, the proofs as data, which an application reads at run time through the base,
 *   since it cannot read test sources. A met is derived from it, so it is the reason this script exists.
 * * `docs/remote-requirements.md`, short: its introduction, kept as written between the `introduction` markers; one
 *   table of where each remote stands; the requirements by subject, number and sentence only.
 * * `docs/remote-requirements-evidence.md`, whole: every status on every model with what it rests on, the proofs'
 *   tests by file and title for a met, the reason for the rest.
 * * a checklist per bench remote in the `todo/` folder, named after the model's key: the requirements possible on
 *   that remote by subject, a box each, ticked where proven, between the `checklist` markers. What stands before and
 *   after the markers, the header and the remote's own work, is kept as written; a checklist that does not exist yet
 *   is written with a header and an empty part for that work.
 *
 * `test/package/requirements.test.ts` fails when any committed file differs from what the sources generate, so a
 * proof added to a test, or a status changed, is followed by `make requirements-write`. Reads the repository's own
 * files and writes these; no lab, no network, no remote.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { commandLine } from '@harmony/lab/cli';
import {
  BENCH_MODELS, REQUIREMENT_SUBJECTS, REQUIREMENTS, requirementStateFrom,
  type BenchModel, type Proof, type Requirement, type RequirementState, type RequirementStatus,
} from '@harmony/base/requirements';

/** The repository's root, which every path below and in the proofs is relative to. */
export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** The generated module of proofs. */
export const PROOFS_MODULE = 'packages/base/src/proofs.ts';
/** The short document, its introduction hand written. */
export const DOCUMENT_PATH = 'docs/remote-requirements.md';
/** The document of the evidence, generated whole. */
export const EVIDENCE_PATH = 'docs/remote-requirements-evidence.md';

/** The short document as a URL, for a caller that reads it. */
export const DOCUMENT = new URL(`../../../${DOCUMENT_PATH}`, import.meta.url);

/**
 * A bench model's checklist, `todo/` and the model's key after the folder's own prefix. Built from its parts, since
 * code names no todo file, decision 33, and a path written out here would be one.
 */
export function checklistPath(model: BenchModel): string {
  const folder = 'todo';
  return `${folder}/${[folder, model.key].join('-')}.md`;
}

// ---------------------------------------------------------------------------------------------------
// Reading the proofs off the test sources
// ---------------------------------------------------------------------------------------------------

/** What a scan found: the proofs, and the calls it could not read, each said with where it stands. */
export interface Scan {
  readonly proofs: Proof[];
  readonly faults: string[];
}

/** The name a proof is called by. A call through any other name, `proof.proves(...)`, is not a proof. */
const CALLEE = 'proves';

/** The names a test is declared with in Node's runner, `test('title', ...)` and `it('title', ...)`. */
const TEST_CALLS = new Set(['test', 'it']);

/** A proof's three arguments read off their literals, or the fault that kept them from being read. */
type Arguments = { requirement: number; models: readonly string[] | 'every'; bench: readonly string[] } | { fault: string };

/** The three arguments of a TypeScript call, which must be literals. */
function typescriptArguments(call: ts.CallExpression): Arguments {
  const [number, models, bench, ...rest] = call.arguments;
  if (rest.length > 0) return { fault: 'arguments are more than three' };
  if (number === undefined || !ts.isNumericLiteral(number)) return { fault: 'requirement is not a number written out' };
  const strings = (node: ts.Expression): string[] | undefined => {
    if (!ts.isArrayLiteralExpression(node)) return undefined;
    const found: string[] = [];
    for (const element of node.elements) {
      if (!ts.isStringLiteral(element) && !ts.isNoSubstitutionTemplateLiteral(element)) return undefined;
      found.push(element.text);
    }
    return found;
  };
  let proven: readonly string[] | 'every' | undefined;
  if (models !== undefined && (ts.isStringLiteral(models) || ts.isNoSubstitutionTemplateLiteral(models)) && models.text === 'every') {
    proven = 'every';
  } else {
    proven = models === undefined ? undefined : strings(models);
  }
  if (proven === undefined) return { fault: 'models are not a list of keys written out, or \'every\'' };
  const records = bench === undefined ? [] : strings(bench);
  if (records === undefined) return { fault: 'bench records are not a list of paths written out' };
  return { requirement: Number(number.text), models: proven, bench: records };
}

/** The title of the test a node stands in, the nearest `test(...)` or `it(...)` around it, or undefined outside any. */
function enclosingTitle(node: ts.Node, source: ts.SourceFile): string | undefined {
  for (let at: ts.Node | undefined = node.parent; at !== undefined; at = at.parent) {
    if (!ts.isCallExpression(at)) continue;
    // `test(...)`, or `test.skip(...)` and the like, by the name the runner gives it.
    const callee = at.expression;
    const name = ts.isIdentifier(callee) ? callee.text
      : ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) ? callee.expression.text : undefined;
    if (name === undefined || !TEST_CALLS.has(name)) continue;
    const title = at.arguments[0];
    if (title === undefined) continue;
    if (ts.isStringLiteral(title) || ts.isNoSubstitutionTemplateLiteral(title)) return title.text;
    // A title built in a loop is kept as its source reads, so a reader sees which test it is.
    if (ts.isTemplateExpression(title)) return title.getText(source).slice(1, -1);
  }
  return undefined;
}

/** The proofs in one TypeScript test source. */
export function proofsInTypeScript(path: string, text: string): Scan {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const proofs: Proof[] = [];
  const faults: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === CALLEE) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const read = typescriptArguments(node);
      const title = enclosingTitle(node, source);
      if ('fault' in read) faults.push(`${path}:${line}: a proof whose ${read.fault}`);
      else if (title === undefined) faults.push(`${path}:${line}: a proof outside any test`);
      else proofs.push({ requirement: read.requirement, models: read.models, test: path, title, bench: read.bench });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { proofs, faults };
}

/**
 * Python literals of the kinds a proof is written with, read from `text` at `at`: a whole number, a quoted string, or
 * a list or tuple of strings. Returns the value and where reading stopped, or undefined at anything else.
 */
function pythonLiteral(text: string, at: number): { value: number | string | string[]; end: number } | undefined {
  const skip = (from: number): number => {
    let i = from;
    for (;;) {
      while (i < text.length && /\s/.test(text[i]!)) i += 1;
      if (text[i] !== '#') return i;
      while (i < text.length && text[i] !== '\n') i += 1;
    }
  };
  const string = (from: number): { value: string; end: number } | undefined => {
    const quote = text[from];
    if (quote !== '\'' && quote !== '"') return undefined;
    let value = '';
    for (let i = from + 1; i < text.length; i += 1) {
      if (text[i] === '\\') { value += text[i + 1] ?? ''; i += 1; continue; }
      if (text[i] === quote) return { value, end: i + 1 };
      if (text[i] === '\n') return undefined;
      value += text[i];
    }
    return undefined;
  };
  const i = skip(at);
  const number = /^\d+/.exec(text.slice(i));
  if (number) return { value: Number(number[0]), end: i + number[0].length };
  if (text[i] === '[' || text[i] === '(') {
    const close = text[i] === '[' ? ']' : ')';
    const values: string[] = [];
    let j = skip(i + 1);
    while (text[j] !== close) {
      const item = string(j);
      if (item === undefined) return undefined;
      values.push(item.value);
      j = skip(item.end);
      if (text[j] === ',') j = skip(j + 1);
      else if (text[j] !== close) return undefined;
    }
    return { value: values, end: j + 1 };
  }
  return string(i);
}

/** The proofs in one Python test source: each call of `proves` standing alone, in the test method around it. */
export function proofsInPython(path: string, text: string): Scan {
  const proofs: Proof[] = [];
  const faults: string[] = [];
  const lines = text.split('\n');
  // A call by the bare name only: `module.proves(` and `improves(` are not proofs.
  for (const match of text.matchAll(/(?<![\w.])proves\(/g)) {
    const line = text.slice(0, match.index).split('\n').length;
    const fault = (why: string): void => { faults.push(`${path}:${line}: a proof whose ${why}`); };
    // The definition of the helper itself is not a call.
    if (/^\s*def\s+$/.test(lines[line - 1]!.slice(0, lines[line - 1]!.indexOf('proves(')))) continue;
    const values: (number | string | string[])[] = [];
    let at = match.index + match[0].length;
    let closed = false;
    while (!closed && values.length < 4) {
      const read = pythonLiteral(text, at);
      if (read === undefined) break;
      values.push(read.value);
      at = read.end;
      while (/\s/.test(text[at] ?? '')) at += 1;
      if (text[at] === ',') at += 1;
      while (/\s/.test(text[at] ?? '')) at += 1;
      if (text[at] === ')') closed = true;
    }
    if (!closed || values.length < 2 || values.length > 3) { fault('arguments are not two or three literals'); continue; }
    const [number, models, bench = []] = values;
    const proven = models === 'every' ? 'every' : Array.isArray(models) ? models : undefined;
    const records = Array.isArray(bench) ? bench : undefined;
    if (typeof number !== 'number') { fault('requirement is not a number written out'); continue; }
    if (proven === undefined) { fault('models are not a list of keys written out, or \'every\''); continue; }
    if (records === undefined) { fault('bench records are not a list of paths written out'); continue; }
    // The test method around the call, the nearest `def test_` above it indented less, and its class.
    const indent = /^\s*/.exec(lines[line - 1]!)![0].length;
    let method: string | undefined;
    let owner: string | undefined;
    for (let i = line - 2; i >= 0; i -= 1) {
      const definition = /^(\s*)def (test\w*)\(/.exec(lines[i]!);
      if (method === undefined && definition && definition[1]!.length < indent) method = definition[2];
      const declared = /^class (\w+)/.exec(lines[i]!);
      if (method !== undefined && declared) { owner = declared[1]; break; }
    }
    if (method === undefined) { fault('call stands outside any test method'); continue; }
    proofs.push({ requirement: number, models: proven, test: path, title: owner === undefined ? method : `${owner}.${method}`, bench: records });
  }
  return { proofs, faults };
}

/** Every file under a folder whose name passes `wanted`, as paths from the root, dependencies' folders skipped. */
function filesUnder(folder: string, wanted: (name: string) => boolean): string[] {
  const found: string[] = [];
  const walk = (at: string): void => {
    if (!existsSync(join(ROOT, at))) return;
    for (const entry of readdirSync(join(ROOT, at), { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '__pycache__' || entry.name.startsWith('.')) continue;
      const path = `${at}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (wanted(entry.name)) found.push(path);
    }
  };
  walk(folder);
  return found.sort();
}

/** The test sources a proof may stand in: every package's `test/` folder and the Python `tests/`. */
export function testSources(): string[] {
  const packages = readdirSync(join(ROOT, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  return [
    ...packages.flatMap((name) => filesUnder(`packages/${name}/test`, (file) => file.endsWith('.test.ts'))),
    ...filesUnder('tests', (file) => /^test_\w+\.py$/.test(file)),
  ];
}

/** The order the proofs are kept in: by requirement, then file, then test, then models. */
function byRequirement(a: Proof, b: Proof): number {
  const models = (proof: Proof): string => (proof.models === 'every' ? '' : proof.models.join(' '));
  return a.requirement - b.requirement || a.test.localeCompare(b.test) || a.title.localeCompare(b.title)
    || models(a).localeCompare(models(b));
}

/** Every proof in the repository's test sources, in order, with every call that could not be read. */
export function scanSources(paths: readonly string[] = testSources()): Scan {
  const proofs: Proof[] = [];
  const faults: string[] = [];
  for (const path of paths) {
    const text = readFileSync(join(ROOT, path), 'utf8');
    // A cheap test first, so a file with no proof is not parsed.
    if (!text.includes(`${CALLEE}(`)) continue;
    const scan = path.endsWith('.py') ? proofsInPython(path, text) : proofsInTypeScript(path, text);
    proofs.push(...scan.proofs);
    faults.push(...scan.faults);
  }
  return { proofs: proofs.sort(byRequirement), faults };
}

// ---------------------------------------------------------------------------------------------------
// The generated module
// ---------------------------------------------------------------------------------------------------

const MODULE_HEADER = `/**
 * Every proof in the repository's tests, generated by \`packages/codec/bin/requirements.ts\` from the calls of \`proves\`
 * it reads off the test sources, decision 33. **Generated: never edit this file**; change a test and run
 * \`make requirements-write\`, and \`packages/codec/test/package/requirements.test.ts\` fails while the two differ.
 *
 * A proof says that a test proves a requirement for some bench models, or for every one, and where the requirement was
 * shown on a unit when it shows on a remote. A requirement is met on a model exactly when a proof here names it for
 * that model, \`requirements.ts\`, which is how an application, which cannot read the tests, gets the same answer
 * the tests give. Imports nothing, like every module of the base.
 */

/** One call of \`proves\` in a test. */
export interface Proof {
  /** The requirement's number. */
  readonly requirement: number;
  /** The bench models' keys it is proven for, or \`'every'\` for one that does not depend on the remote. */
  readonly models: readonly string[] | 'every';
  /** The test file, from the repository's root. */
  readonly test: string;
  /** The test's title, or for a Python test its class and method. */
  readonly title: string;
  /** Where it was shown on a unit: a bench test, or a passage of \`docs/test-notes/\` by its heading's anchor. */
  readonly bench: readonly string[];
}
`;

/** The generated module for a list of proofs. */
export function proofsModule(proofs: readonly Proof[]): string {
  const quoted = (value: string): string => JSON.stringify(value);
  const list = (values: readonly string[]): string => `[${values.map(quoted).join(', ')}]`;
  const out = [MODULE_HEADER, 'export const PROOFS: readonly Proof[] = ['];
  for (const proof of proofs) {
    out.push('  {');
    out.push(`    requirement: ${proof.requirement}, models: ${proof.models === 'every' ? quoted('every') : list(proof.models)},`);
    out.push(`    test: ${quoted(proof.test)},`);
    out.push(`    title: ${quoted(proof.title)},`);
    out.push(`    bench: ${list(proof.bench)},`);
    out.push('  },');
  }
  out.push('];', '');
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------------
// The documents
// ---------------------------------------------------------------------------------------------------

const OPEN = '<!-- introduction -->';
const CLOSE = '<!-- /introduction -->';
const TITLE = '# The FHSDK\'s requirements, per remote';

/** The hand written introduction between the markers, or a refusal naming what is missing. */
export function introductionOf(text: string): string {
  const start = text.indexOf(OPEN);
  const end = text.indexOf(CLOSE);
  if (start < 0 || end < start) throw new Error(`the document has no ${OPEN} ... ${CLOSE} pair`);
  return text.slice(start + OPEN.length, end).trim();
}

/** What the documents call each status: a met is proven, by its tests. */
const SAID: Readonly<Record<RequirementStatus, string>> = { met: 'proven', open: 'open', impossible: 'impossible', unknown: 'unknown' };

/** The order the statuses are counted in, proven first. */
const COUNTED: readonly RequirementStatus[] = ['met', 'open', 'unknown', 'impossible'];

/** The requirements that have a status per model and are not withdrawn, which a remote's counts are over. */
const perModel = (): Requirement[] => REQUIREMENTS.filter((one) => one.scope === 'model' && one.withdrawn !== true);

/** A list of repository paths as code spans. */
const paths = (list: readonly string[]): string => list.map((path) => `\`${path}\``).join(', ');

/** A sentence ends with a full stop, whatever the data's `why` ended with. */
const sentence = (why: string): string => (why.endsWith('.') ? why : `${why}.`);

/** The statuses of every requirement on every model, with the proofs given; a requirement with neither throws. */
type States = (model: BenchModel, number: number) => RequirementState;
const statesFrom = (proofs: readonly Proof[]): States => (model, number) => requirementStateFrom(proofs, model.key, number);

/** The short document, the introduction given. */
export function requirementsDocument(introduction: string, proofs: readonly Proof[]): string {
  const state = statesFrom(proofs);
  const out: string[] = [TITLE, '', OPEN, introduction, CLOSE, ''];
  out.push('<!-- Generated by make requirements-write from packages/base/src/requirements.ts and the proofs in the tests. Change those, not what follows. -->', '');

  const counted = perModel();
  out.push('## Where each remote stands', '');
  out.push(`Over the ${counted.length} requirements that have a status per model. Possible is every one but the impossible ones; `
    + `the evidence behind each status is [the evidence](remote-requirements-evidence.md), and each remote's list of them its checklist.`, '');
  out.push(`| remote | ${COUNTED.map((status) => SAID[status]).join(' | ')} | proven of possible | checklist |`);
  out.push(`|---|${COUNTED.map(() => '---').join('|')}|---|---|`);
  for (const model of BENCH_MODELS) {
    const of = (status: RequirementStatus): number => counted.filter((one) => state(model, one.number).status === status).length;
    const possible = counted.length - of('impossible');
    const link = `[${checklistPath(model).split('/').at(-1)!}](../${checklistPath(model)})`;
    out.push(`| ${model.name} | ${COUNTED.map(of).join(' | ')} | ${of('met')} of ${possible} | ${link} |`);
  }
  out.push('');
  const whole = REQUIREMENTS.filter((one) => one.scope === 'whole' && one.withdrawn !== true);
  const wholeSaid = whole.map((one) => `R${one.number} ${SAID[state(BENCH_MODELS[0]!, one.number).status]}`);
  out.push(`The ${whole.length} requirements of the FHSDK as a whole carry one status each, for every remote: ${wholeSaid.join(', ')}.`, '');

  out.push('## The requirements', '');
  for (const subject of REQUIREMENT_SUBJECTS) {
    out.push(`### ${subject}`, '');
    for (const one of REQUIREMENTS.filter((r) => r.subject === subject)) {
      out.push(`* **R${one.number}** ${one.withdrawn === true ? '(withdrawn) ' : ''}${one.text}`);
    }
    out.push('');
  }
  return out.join('\n');
}

/** One status said with what it rests on, for the evidence document. */
function evidenceOf(state: RequirementState): string {
  if (state.status === 'met') {
    const tests = state.proofs.map((proof) => `\`${proof.test}\`, "${proof.title}"`);
    const bench = state.bench.length === 0 ? '' : ` Shown on a unit in ${paths(state.bench)}.`;
    return `proven by ${tests.join('; ')}.${bench}`;
  }
  const reference = state.reference.length === 0 ? '' : ` ${paths(state.reference)}.`;
  return `${SAID[state.status]}: ${sentence(state.why)}${reference}`;
}

/** The evidence document, generated whole. */
export function evidenceDocument(proofs: readonly Proof[]): string {
  const state = statesFrom(proofs);
  const out: string[] = ['# The FHSDK\'s requirements: the evidence', ''];
  out.push('<!-- Generated by make requirements-write from packages/base/src/requirements.ts and the proofs in the tests. Change those, not this file. -->', '');
  out.push('Every requirement of [the requirements](remote-requirements.md) on every bench model, with what its status rests on. '
    + 'A proven one names each test that proves it, by file and title, and where the requirement shows on a remote the bench run '
    + 'or the passage of the test notes that shows it on a unit; the others say why, as written in the requirements data.', '');
  for (const subject of REQUIREMENT_SUBJECTS) {
    out.push(`## ${subject}`, '');
    for (const one of REQUIREMENTS.filter((r) => r.subject === subject)) {
      out.push(`### R${one.number} ${one.withdrawn === true ? '(withdrawn) ' : ''}${one.text}`, '');
      if (one.scope === 'whole') out.push(`* **Every remote**, ${evidenceOf(state(BENCH_MODELS[0]!, one.number))}`);
      else for (const model of BENCH_MODELS) out.push(`* **${model.name}**, ${evidenceOf(state(model, one.number))}`);
      out.push('');
    }
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------------
// A checklist per bench remote
// ---------------------------------------------------------------------------------------------------

const LIST_OPEN = '<!-- checklist -->';
const LIST_CLOSE = '<!-- /checklist -->';

/** A new checklist's header, what the file is. Kept as written once the file exists. */
function checklistHeader(model: BenchModel): string {
  return [
    `# The ${model.name}: what the FHSDK can do for it`,
    '',
    `Every requirement possible on the ${model.name}, by subject, ticked where a test proves it. The list is generated by`,
    '`make requirements-write` from the requirements data and the proofs in the tests, so a box changes with a test and',
    'never by hand; an impossible requirement is left out, and one marked "find out first" is not known to be possible.',
    'What each requirement means is [the requirements](../docs/remote-requirements.md), and what a box rests on',
    '[the evidence](../docs/remote-requirements-evidence.md).',
  ].join('\n');
}

/** A new checklist's part for the remote's own work, kept as written once the file exists. */
function checklistTail(model: BenchModel): string {
  return [
    '## The remote\'s own work',
    '',
    `Work for the ${model.name} that no requirement above names, written by hand and kept when the list is regenerated.`,
  ].join('\n');
}

/** The generated list of one checklist: the requirements possible on the model by subject, a box each. */
function checklistItems(model: BenchModel, proofs: readonly Proof[]): string {
  const state = statesFrom(proofs);
  const out: string[] = [];
  for (const subject of REQUIREMENT_SUBJECTS) {
    // A requirement of the FHSDK as a whole is no remote's, and a withdrawn one is nobody's.
    const listed = perModel().filter((one) => one.subject === subject)
      .map((one) => ({ one, status: state(model, one.number).status }))
      .filter(({ status }) => status !== 'impossible');
    if (listed.length === 0) continue;
    out.push(`## ${subject}`, '');
    for (const { one, status } of listed) {
      const box = status === 'met' ? '[x]' : '[ ]';
      out.push(`- ${box} R${one.number} ${one.text}${status === 'unknown' ? ' (find out first)' : ''}`);
    }
    out.push('');
  }
  return out.join('\n').trimEnd();
}

/**
 * A checklist, written over what the file holds now: the header and the remote's own work kept, the list between
 * the markers generated. A file that does not exist is given a header and an empty part for that work.
 */
export function checklist(model: BenchModel, proofs: readonly Proof[], existing: string | undefined): string {
  let header = checklistHeader(model);
  let tail = checklistTail(model);
  if (existing !== undefined) {
    const start = existing.indexOf(LIST_OPEN);
    const end = existing.indexOf(LIST_CLOSE);
    if (start < 0 || end < start) throw new Error(`${checklistPath(model)} has no ${LIST_OPEN} ... ${LIST_CLOSE} pair`);
    header = existing.slice(0, start).trim();
    tail = existing.slice(end + LIST_CLOSE.length).trim();
  }
  return `${header}\n\n${LIST_OPEN}\n${checklistItems(model, proofs)}\n${LIST_CLOSE}\n\n${tail}\n`;
}

// ---------------------------------------------------------------------------------------------------
// Checking and writing
// ---------------------------------------------------------------------------------------------------

const readIfThere = (path: string): string | undefined =>
  (existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), 'utf8') : undefined);

/** Every generated file by its path from the root, as the proofs given make it from what is committed now. */
export function generatedFiles(proofs: readonly Proof[]): Map<string, string> {
  const files = new Map<string, string>();
  files.set(PROOFS_MODULE, proofsModule(proofs));
  const document = readIfThere(DOCUMENT_PATH);
  if (document === undefined) throw new Error(`${DOCUMENT_PATH} is missing, and its introduction with it`);
  files.set(DOCUMENT_PATH, requirementsDocument(introductionOf(document), proofs));
  files.set(EVIDENCE_PATH, evidenceDocument(proofs));
  for (const model of BENCH_MODELS) files.set(checklistPath(model), checklist(model, proofs, readIfThere(checklistPath(model))));
  return files;
}

/** Check every generated file against the sources, or rewrite them; the problems found, empty when all agree. */
export function run(write: boolean): string[] {
  const scan = scanSources();
  // A proof that cannot be read is refused before anything is written, since what it proves is not known.
  if (scan.faults.length > 0) return scan.faults;
  let files: Map<string, string>;
  try {
    files = generatedFiles(scan.proofs);
  } catch (error) {
    return [(error as Error).message];
  }
  const problems: string[] = [];
  for (const [path, expected] of files) {
    if (readIfThere(path) === expected) continue;
    if (write) writeFileSync(join(ROOT, path), expected);
    else problems.push(`${path} differs from what the sources generate: run make requirements-write`);
  }
  return problems;
}

function main(): void {
  const cli = commandLine({
    usage: 'usage: node packages/codec/bin/requirements.ts [--write]',
    flags: ['write'],
  });
  const problems = run(cli.flag('write'));
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) process.exit(1);
  console.log(cli.flag('write') ? 'the proofs, the requirements documents and the checklists written'
    : 'the proofs, the requirements documents and the checklists agree with the sources');
}

if (import.meta.main) main();
