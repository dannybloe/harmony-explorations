/**
 * Write a container with one base slot 12 timer's duration changed, for the write path to install.
 *
 *   node packages/codec/bin/set-timer.ts --in <config> --timer 1 --seconds 20 --out <file>
 *
 * The sibling of `set-delay.ts`, and deliberately the same shape: one field of content, no length
 * change, no count restamped, the trailer checksum recomputed by `applyEdits`, and everything it
 * prints a check to read before the result goes near a remote. Which timer, what it held, what it
 * queues when it expires, and which runs of the file moved.
 *
 * **What it is for is the screen light.** MyHarmony offers a Harmony 600 a setting called
 * `GlowTime`, and a timer's duration is where that setting lands: `calibration_h600`, compiled in the
 * session that saved a `GlowTime` of 20, which is also its default, carries that timer at 20 seconds.
 * Writing 20 and then 10 to the Harmony 650 and timing its screen is what showed it, section 292, and
 * running this again with a timed screen is the check that can fail.
 *
 * The rail lives in `setTimerDuration` and not here: section 43 found the firmware clamps a
 * scheduled duration to sixteen bits with no error, so a longer one is refused rather than written.
 * Like `set-delay.ts` it does not stamp the build timestamp, because the point of an exercise is that
 * the output differs from the input in the places this prints and nowhere else.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import {
  applyEdits,
  parse,
  setTimerDuration,
  timers,
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
const index = Number(argument('timer') ?? fail('--timer is the base slot 12 record index'));
const seconds = Number(argument('seconds') ?? fail('--seconds is the new duration'));

const container = parse(new Uint8Array(readFileSync(input)));
const before = timers(container);
const timer = before?.records[index];
if (before === undefined || timer === undefined) fail(`no timer ${index} in ${input}`);
const hex = (n: number, width: number): string => n.toString(16).padStart(width, '0');
process.stdout.write(`${input}: timer ${index} of ${before.records.length} is kind ${timer.kind}, `
  + `${timer.duration} s, and queues ${hex(timer.instruction.opcode, 2)} `
  + `${hex(timer.instruction.operand, 4)} when it expires\n`);

const report = applyEdits(container, setTimerDuration(container, index, seconds));
process.stdout.write(`${report.changed.length} run(s) differ: `
  + `${report.changed.map((r) => `0x${r.start.toString(16)} for ${r.length}`).join(', ')}\n`);

// Read the result back with the same reader rather than trusting the edit: the timer asked for has
// the new duration and nothing else about it moved, every other timer is untouched, and the checksum
// the file states recomputes.
const after = timers(parse(report.bytes));
if (after === undefined || after.records.length !== before.records.length) {
  fail('the result does not read back with the same number of timers');
}
after.records.forEach((one, i) => {
  const was = before.records[i]!;
  const duration = i === index ? seconds : was.duration;
  if (one.address !== was.address || one.kind !== was.kind || one.duration !== duration
    || one.instruction.opcode !== was.instruction.opcode
    || one.instruction.operand !== was.instruction.operand) {
    fail(`timer ${i} does not read back as expected`);
  }
});
const checksum = parse(report.bytes).trailerChecksum;
if (checksum !== trailerChecksum(report.bytes)) fail('the checksum does not recompute');
process.stdout.write(`reads back as ${seconds} s, every other timer unchanged, checksum `
  + `0x${checksum.toString(16)}\n`);

writeFileSync(output, report.bytes);
process.stdout.write(`${output}: ${report.bytes.length} bytes\n`);
