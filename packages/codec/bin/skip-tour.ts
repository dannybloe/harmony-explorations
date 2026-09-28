/**
 * Write a container whose introduction tour is skipped, for the write path to install.
 *
 *   node packages/codec/bin/skip-tour.ts --in <config> --out <file>
 *
 * **Why it exists**: a Harmony 650 opens Logitech's ten screen introduction tour every time its
 * configuration is reloaded, which is after every write, and it has to be pressed through before the
 * remote can be used. `skipIntroductionTour` in `src/edit.ts` finds the list that starts it and
 * turns its second instruction into a call to the list the tour's last screen runs, section 286.
 *
 * Same shape as `set-delay.ts` and for the same reason: one instruction of content, no length change,
 * the trailer checksum recomputed by `applyEdits`, and no timestamp stamped, so the output differs
 * from the input in the places this prints and nowhere else.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import {
  applyEdits,
  introductionTour,
  parse,
  skipIntroductionTour,
  trailerChecksum,
} from '../src/index.ts';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const input = argument('in') ?? fail('--in is the container to edit');
const output = argument('out') ?? fail('--out is where the result goes');

const container = parse(new Uint8Array(readFileSync(input)));
const tour = introductionTour(container);
process.stdout.write(`${input}: list ${tour.list} sets variable ${tour.variable} to 1 and `
  + (tour.state === 'shown' ? `enters mode ${tour.mode}` : `already calls list ${tour.exit}, the skipped form`)
  + `, a tour of ${tour.modes} screens whose last one runs list ${tour.exit}\n`);

const report = applyEdits(container, skipIntroductionTour(container));
process.stdout.write(`${report.changed.length} run(s) differ: `
  + `${report.changed.map((r) => `0x${r.start.toString(16)} for ${r.length}`).join(', ')}\n`);

// Read the result back with the same readers, rather than trusting the edit: the list now calls the
// exit, every other list is unchanged, and the checksum the file states recomputes.
const after = parse(report.bytes);
const before = container.actionLists() ?? [];
const lists = after.actionLists() ?? [];
const edited = lists[tour.list] ?? [];
if (edited.length !== 2 || edited[1]?.opcode !== 0x7f || edited[1]?.operand !== tour.exit) {
  fail('the tour list does not read back as a call to its exit');
}
if (lists.length !== before.length) fail('the number of lists moved');
lists.forEach((list, index) => {
  if (index === tour.list) return;
  const was = before[index] ?? [];
  if (list.length !== was.length || list.some((one, k) =>
    one.opcode !== was[k]?.opcode || one.operand !== was[k]?.operand)) {
    fail(`list ${index} moved and should not have`);
  }
});
if (after.trailerChecksum !== trailerChecksum(report.bytes)) fail('the checksum does not recompute');
process.stdout.write(`list ${tour.list} reads back as mark then call list ${tour.exit}, every other `
  + `list unchanged, checksum 0x${after.trailerChecksum.toString(16)}\n`);

writeFileSync(output, report.bytes);
process.stdout.write(`${output}: ${report.bytes.length} bytes\n`);
