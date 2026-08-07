/**
 * How much of a config this codec can attribute to a structure, per sample.
 *
 *   node packages/codec/bin/coverage.ts                 every sample in the lab
 *   node packages/codec/bin/coverage.ts --file <config> one file, no lab needed
 *   node packages/codec/bin/coverage.ts --detail        plus owners, gaps and overlaps
 *
 * The progress measure for milestone M2: an emitter can only rebuild what the reader can
 * attribute, so this fraction has to reach 100 before a byte exact round trip is possible. See
 * `packages/codec/src/coverage.ts` for why a claim is made by the reader that knows the size.
 *
 * `--detail` is the working view. The largest gaps are where the next reader should go, and any
 * overlap at all is a defect in one of the two claims rather than something to interpret.
 */
import { readFileSync } from 'node:fs';

import { IMAGES, load } from '@harmony/lab';

import { coverage, parse, payloadOf } from '../src/index.ts';
import type { CoverageReport } from '../src/index.ts';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

const detail = process.argv.includes('--detail');

function show(label: string, report: CoverageReport, architecture: number | undefined): void {
  const percent = (100 * report.fraction).toFixed(1);
  process.stdout.write(
    `${label.padEnd(26)} arch ${String(architecture ?? '?').padStart(2)}  ` +
      `${String(report.accounted).padStart(8)} / ${String(report.total).padStart(8)}  ` +
      `${percent.padStart(5)}%` +
      (report.overlaps.length > 0 ? `  OVERLAPS ${report.overlaps.length}` : '') +
      '\n',
  );
  if (!detail) return;
  for (const [owner, bytes] of report.byOwner) {
    process.stdout.write(`    ${owner.padEnd(22)} ${String(bytes).padStart(8)}\n`);
  }
  for (const gap of report.gaps.slice(0, 5)) {
    process.stdout.write(
      `    gap at 0x${gap.start.toString(16).padStart(6, '0')}  ${String(gap.length).padStart(8)}\n`,
    );
  }
  for (const over of report.overlaps) {
    process.stdout.write(
      `    OVERLAP at 0x${over.start.toString(16)} for ${over.length}: ${over.owners.join(' and ')}\n`,
    );
  }
  process.stdout.write('\n');
}

const file = argument('file');
if (file !== undefined) {
  const data = new Uint8Array(readFileSync(file));
  let blob: Uint8Array;
  try {
    blob = payloadOf(data, file);
  } catch {
    blob = data;
  }
  const container = parse(blob);
  show(file, coverage(container), container.architecture);
} else {
  let anything = false;
  for (const name of Object.keys(IMAGES)) {
    const data = load(name);
    if (data === undefined) continue;
    let container;
    try {
      container = parse(data);
    } catch {
      continue; // not a container: the lab table holds firmware images too
    }
    anything = true;
    show(name, coverage(container), container.architecture);
  }
  if (!anything) {
    process.stderr.write('no containers found; set HARMONY_LAB or pass --file\n');
    process.exit(1);
  }
}
