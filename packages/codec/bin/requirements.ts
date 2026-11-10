/**
 * Write or check `docs/remote-requirements.md`, the FHSDK's requirements and every bench model's status on each,
 * generated from the data in `@harmony/base/requirements`, decision 33.
 *
 * ```
 * node packages/codec/bin/requirements.ts            check the document against the data
 * node packages/codec/bin/requirements.ts --write    rewrite the document from the data
 * ```
 *
 * **What is hand written and what is generated.** The introduction, what a requirement is and what each status
 * means, sits between the two `introduction` markers and is kept as it stands; everything after it is generated:
 * the counts per model, then per subject a table of the requirements with the nine models' statuses, and the
 * evidence behind every met and every impossible. So a status is changed in the data and never in the document,
 * and `test/package/requirements.test.ts` fails when the committed document differs from what the data generates.
 *
 * Reads and writes nothing but that one document; no lab, no network, no remote.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { commandLine } from '@harmony/lab/cli';
import {
  BENCH_MODELS, REQUIREMENT_STATUS_NAMES, REQUIREMENT_SUBJECTS, REQUIREMENTS, requirementState,
  type BenchModel, type RequirementState,
} from '@harmony/base/requirements';

/** The document, from the repository's root. */
export const DOCUMENT = new URL('../../../docs/remote-requirements.md', import.meta.url);

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

/** A model's column heading: its name without "Harmony", "One", "600", "Touch". */
const column = (model: BenchModel): string => model.name.replace(/^Harmony /, '');

/** A list of repository paths as code spans. */
const paths = (list: readonly string[]): string => list.map((path) => `\`${path}\``).join(', ');

/** A sentence ends with a full stop, whatever the data's `why` ended with. */
const sentence = (why: string): string => (why.endsWith('.') ? why : `${why}.`);

/** The evidence line for one status, or undefined for open and unknown, whose reason is in the data. */
function evidence(state: RequirementState): string | undefined {
  if (state.status === 'met') {
    const bench = state.bench.length === 0 ? '' : `; shown on a unit in ${paths(state.bench)}`;
    return `met: ${sentence(state.why)} Tests ${paths(state.tests)}${bench}.`;
  }
  if (state.status === 'impossible') return `impossible: ${sentence(state.why)} ${paths(state.reference)}.`;
  return undefined;
}

/** The whole document, the introduction given. */
export function requirementsDocument(introduction: string): string {
  const out: string[] = [TITLE, '', OPEN, introduction, CLOSE, ''];
  out.push('<!-- Generated from packages/base/src/requirements.ts by make requirements-write. Change the data, not what follows. -->', '');

  // The counts per model, over the requirements of the models; a whole one has a column of its own.
  const perModel = REQUIREMENTS.filter((one) => one.scope === 'model' && one.withdrawn !== true);
  out.push('## Counts', '');
  out.push(`Over the ${perModel.length} requirements that have a status per model.`, '');
  out.push(`| model | ${REQUIREMENT_STATUS_NAMES.join(' | ')} |`, `|---|${REQUIREMENT_STATUS_NAMES.map(() => '---').join('|')}|`);
  for (const model of BENCH_MODELS) {
    const counts = REQUIREMENT_STATUS_NAMES.map((status) =>
      perModel.filter((one) => requirementState(model.key, one.number).status === status).length);
    out.push(`| ${model.name} | ${counts.join(' | ')} |`);
  }
  out.push('');

  for (const subject of REQUIREMENT_SUBJECTS) {
    const listed = REQUIREMENTS.filter((one) => one.subject === subject);
    out.push(`## ${subject}`, '');
    const whole = listed.every((one) => one.scope === 'whole');
    if (whole) {
      out.push('| requirement | every model |', '|---|---|');
      for (const one of listed) out.push(`| R${one.number} ${one.text} | ${requirementState(BENCH_MODELS[0]!.key, one.number).status} |`);
    } else {
      out.push(`| requirement | ${BENCH_MODELS.map(column).join(' | ')} |`, `|---|${BENCH_MODELS.map(() => '---').join('|')}|`);
      for (const one of listed) {
        const cells = BENCH_MODELS.map((model) => requirementState(model.key, one.number).status);
        out.push(`| R${one.number} ${one.withdrawn === true ? '(withdrawn) ' : ''}${one.text} | ${cells.join(' | ')} |`);
      }
    }
    out.push('');
    // The evidence behind every met and impossible, model by model; an open or unknown one says why in the data.
    const lines: string[] = [];
    for (const one of listed) {
      const models = whole ? [BENCH_MODELS[0]!] : BENCH_MODELS;
      for (const model of models) {
        const state = requirementState(model.key, one.number);
        const line = evidence(state);
        if (line !== undefined) lines.push(`* **R${one.number}**, ${whole ? 'every model' : model.name}, ${line}`);
      }
    }
    if (lines.length > 0) out.push(...lines, '');
  }
  return out.join('\n');
}

/** Check the committed document against the data, or rewrite it; the problems found, empty when it agrees. */
export function run(write: boolean): string[] {
  const committed = readFileSync(DOCUMENT, 'utf8');
  const expected = requirementsDocument(introductionOf(committed));
  if (committed === expected) return [];
  if (write) {
    writeFileSync(DOCUMENT, expected);
    return [];
  }
  return ['docs/remote-requirements.md differs from the data: run make requirements-write'];
}

function main(): void {
  const cli = commandLine({
    usage: 'usage: node packages/codec/bin/requirements.ts [--write]',
    flags: ['write'],
  });
  const problems = run(cli.flag('write'));
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) process.exit(1);
  console.log(cli.flag('write') ? 'docs/remote-requirements.md written' : 'docs/remote-requirements.md agrees with the data');
}

if (import.meta.main) main();
