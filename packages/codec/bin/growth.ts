/**
 * What a length change would move, per sample: the survey behind `docs/growing-a-config.md`.
 *
 *   node packages/codec/bin/growth.ts                 every container in the corpus
 *   node packages/codec/bin/growth.ts --file <config> one file, no lab needed
 *   node packages/codec/bin/growth.ts --detail        plus the implied structures and the shares
 *
 * Read only. It parses a container and counts; nothing here writes a byte, moves a structure or
 * goes near a remote. `edit.ts` refuses to change any structure's length, and this is the survey of
 * what would have to be true before that refusal could be lifted.
 *
 * The three costs are the working view. `content` is the ceiling, making room on the first byte
 * above the end marker; `bank` is the bottom of the picture array; `end` is just below the trailer.
 * The spread between them is the finding: growth has no single price, it has a price per place.
 */
import { readFileSync } from 'node:fs';

import { require_ } from '@harmony/lab';

import { growthReport, parse, payloadOf } from '../src/index.ts';
import type { GrowthReport } from '../src/index.ts';
import { CONTAINERS } from './corpus.ts';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

const detail = process.argv.includes('--detail');

/** Nonzero exit if any container has an implied structure nobody can explain. */
let unexplained = 0;

/**
 * The corpus wide totals, printed as one line so `tools/facts.py` can read them back.
 *
 * Marked numbers in the documents come from here rather than from a hand sum, for the reason every
 * other `facts.py` family shells out: one implementation of the count, in the codec, and not a
 * second one in Python that would be free to disagree.
 */
const totals = { pointers: 0, outward: 0, shared: 0, implied: 0, frame: 0, packed: 0, chain: 0 };

function show(label: string, report: GrowthReport, architecture: number | undefined): void {
  unexplained += report.unexplained.length;
  const kinds = new Map<string, number>();
  for (const one of report.implied) kinds.set(String(one.kind), (kinds.get(String(one.kind)) ?? 0) + 1);
  totals.pointers += report.pointers.length;
  totals.outward += report.outward.length;
  totals.shared += report.shared.length;
  totals.implied += report.implied.length;
  totals.frame += kinds.get('frame') ?? 0;
  totals.packed += kinds.get('packed') ?? 0;
  totals.chain += kinds.get('chain') ?? 0;
  const cost = (at: { rewrite: number } | undefined): string =>
    at === undefined ? '     -' : String(at.rewrite).padStart(6);
  process.stdout.write(
    `${label.padEnd(26)} arch ${String(architecture ?? '?').padStart(2)}  ` +
      `pointers ${String(report.pointers.length).padStart(6)}  ` +
      `shared ${String(report.shared.length).padStart(5)}  ` +
      `implied ${String(report.implied.length).padStart(6)}  ` +
      `rewrite content ${cost(report.atContent)} bank ${cost(report.atBank)} ` +
      `end ${cost(report.atEnd)}` +
      (report.unexplained.length > 0 ? `  UNEXPLAINED ${report.unexplained.join(' ')}` : '') +
      '\n',
  );
  if (!detail) return;
  process.stdout.write(
    `    implied: frame ${kinds.get('frame') ?? 0}, packed ${kinds.get('packed') ?? 0}, ` +
      `chain ${kinds.get('chain') ?? 0}\n`,
  );
  const byOwner = new Map<string, number>();
  for (const one of report.implied) byOwner.set(one.owner, (byOwner.get(one.owner) ?? 0) + 1);
  for (const [owner, count] of [...byOwner].sort((a, b) => b[1] - a[1])) {
    process.stdout.write(`      ${owner.padEnd(24)} ${String(count).padStart(6)}\n`);
  }
  const holders = new Map<string, number>();
  for (const pointer of report.pointers) {
    holders.set(pointer.holder, (holders.get(pointer.holder) ?? 0) + 1);
  }
  process.stdout.write('    pointers by holder:\n');
  for (const [holder, count] of [...holders].sort((a, b) => b[1] - a[1])) {
    process.stdout.write(`      ${holder.padEnd(24)} ${String(count).padStart(6)}\n`);
  }
  for (const one of report.outward) {
    process.stdout.write(`    outward: ${one.holder} names 0x${one.target.toString(16)}, ${one.names}\n`);
  }
  process.stdout.write('\n');
}

const file = argument('file');
if (file === undefined) {
  for (const name of CONTAINERS) {
    const container = parse(payloadOf(require_(name)));
    show(name, growthReport(container), container.architecture);
  }
} else {
  const container = parse(payloadOf(new Uint8Array(readFileSync(file))));
  show(file, growthReport(container), container.architecture);
}

if (file === undefined) {
  process.stdout.write(
    `TOTAL pointers ${totals.pointers} outward ${totals.outward} shared ${totals.shared} ` +
      `implied ${totals.implied} frame ${totals.frame} packed ${totals.packed} ` +
      `chain ${totals.chain}\n`,
  );
}

if (unexplained > 0) {
  process.stdout.write(`\n${unexplained} implied structures with no reason recorded\n`);
  process.exit(1);
}
