/**
 * Write a container with one device's power on delay changed, for the write path to install.
 *
 *   node packages/codec/bin/set-delay.ts --in <config> --group 0 --tenths 100 --out <file>
 *
 * On a Harmony One or 525 the delay is an instruction and the ceiling is 100 tenths; on a Harmony 600,
 * 650 or 700 it is a stored setting and the ceiling is 450, 45 seconds. The tool picks by what the
 * configuration holds.
 *
 * **The smallest end to end exercise of the editor there is**, and that is what it is for: one byte
 * of content, no length change, no count restamped, and the trailer checksum recomputed by
 * `applyEdits` rather than by hand. Everything it prints is a check somebody should read before the
 * result goes near a remote: which device, what the value was, which runs of the file moved.
 *
 * Two runs is the expected answer for a one byte edit and not a surprise: the delay itself, and the
 * trailer checksum a byte and a half of a megabyte away. `docs/findings.md` section 187 is why that
 * costs two erase blocks.
 *
 * It deliberately does not stamp the build timestamp. `saveEdits` is what does that, and a
 * timestamp is right for a save and wrong for an exercise whose whole point is that the output
 * differs from the input in the places this prints and nowhere else.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import {
  applyEdits,
  deviceDelays,
  devices,
  parse,
  setPowerOnDelay,
  setPowerOnDelayVariable,
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
const group = Number(argument('group') ?? fail('--group is the device\'s infrared group'));
const tenths = Number(argument('tenths') ?? fail('--tenths is the delay, in tenths of a second'));

const container = parse(new Uint8Array(readFileSync(input)));
const named = new Map(devices(container).map((one) => [one.group, one.name ?? '?']));

// Two shapes of the same setting. A Harmony One and a 525 write the delay into the device's power on
// list, so the edit is that instruction's operand; a Harmony 600, 650 or 700 keeps it as a stored
// setting, a state variable, so the edit is that record. `deviceDelays` says which this device has.
const delayOf = (c: typeof container): Map<number, number> =>
  new Map(deviceDelays(c).map((one) => [one.group, one.powerOn]));
const was = deviceDelays(container).find((one) => one.group === group);
if (was === undefined) fail(`no device with infrared group ${group} states a power on delay`);
process.stdout.write(`${input}: group ${group} is ${named.get(group) ?? '?'}, `
  + `${was.powerOn} tenths of a second, held as ${was.source === 'variable' ? 'a stored setting' : 'an instruction'}\n`);

const edits = was.source === 'variable'
  ? setPowerOnDelayVariable(container, group, tenths)
  : setPowerOnDelay(container, group, tenths);
const report = applyEdits(container, edits);
process.stdout.write(`${report.changed.length} run(s) differ: `
  + `${report.changed.map((r) => `0x${r.start.toString(16)} for ${r.length}`).join(', ')}\n`);

// Read the result back with the same readers, rather than trusting the edit. The delay is what was
// asked for, every other device is untouched, and the checksum the file states recomputes.
const after = parse(report.bytes);
const before = delayOf(container);
const read = delayOf(after);
if (read.get(group) !== tenths) fail('the result does not read back as the value asked for');
for (const [other, value] of before) {
  if (other === group) continue;
  if (read.get(other) !== value) fail(`group ${other} moved and should not have`);
}
if (after.trailerChecksum !== trailerChecksum(report.bytes)) fail('the checksum does not recompute');
process.stdout.write(`reads back as ${tenths} tenths, every other device unchanged, checksum `
  + `0x${after.trailerChecksum.toString(16)}\n`);

writeFileSync(output, report.bytes);
process.stdout.write(`${output}: ${report.bytes.length} bytes\n`);
