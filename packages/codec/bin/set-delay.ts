/**
 * Write a container with one device's power on delay changed, for the write path to install.
 *
 *   node packages/codec/bin/set-delay.ts --in <config> --group 0 --tenths 100 --out <file>
 *
 * On a Harmony One, 525, 300 or 350 the delay is an instruction and the ceiling is 100 tenths; on a
 * Harmony 600, 650 or 700 it is a stored setting and the ceiling is 450, 45 seconds. The tool picks by
 * what the configuration holds.
 *
 * **What it changes is every copy of the delay a key reaches**, which `setPowerOnDelay` asks the family for. On a
 * Harmony 300 or 350 that is the `0x7C` in the device's power on list and, for a device with one power code for
 * on and off, the wait after it in Watch TV's list, which the activity keeps as its own; a device with separate
 * on and off codes is switched by Watch TV through its power variable, so its power on list is its one copy.
 * Every other remote has the one. It prints each copy it changed.
 *
 * **The smallest end to end exercise of the editor there is**, and that is what it is for: one byte
 * of content, no length change, no count restamped, and the trailer checksum recomputed by
 * `applyEdits` rather than by hand. Everything it prints is a check somebody should read before the
 * result goes near a remote: which device, what the value was, which runs of the file moved.
 *
 * Two runs is the expected answer for a one byte edit and not a surprise: the delay itself, and the
 * trailer checksum a byte and a half of a megabyte away; a delay with a second copy adds that byte's run. `docs/findings.md` section 187 is why that
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
import '../src/resources.node.ts';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (process.argv.includes('--help') || process.argv.length <= 2) {
  process.stdout.write([
    'usage: node packages/codec/bin/set-delay.ts --in <config> --group <n> --tenths <t> --out <file>',
    '',
    'Writes <config> with the power on delay of the device in infrared group <n> set to <t> tenths of a second.',
    'It changes every copy of that delay a key reaches, and prints each one:',
    '  Harmony One, 525: the 0x7C in the device\'s power on list, up to 100 tenths.',
    '  Harmony 300, 350: that 0x7C and, for a device with one power code for on and off, Watch TV\'s own wait',
    '    after that code; a device with separate codes is switched through its power variable, one copy.',
    '  Harmony 600, 650, 700: the stored delay setting, up to 450 tenths.',
    'Nothing is written to a remote; the build timestamp is not stamped.',
    '',
  ].join('\n'));
  process.exit(0);
}

const input = argument('in') ?? fail('--in is the container to edit');
const output = argument('out') ?? fail('--out is where the result goes');
const group = Number(argument('group') ?? fail('--group is the device\'s infrared group'));
const tenths = Number(argument('tenths') ?? fail('--tenths is the delay, in tenths of a second'));

const container = parse(new Uint8Array(readFileSync(input)));
const named = new Map(devices(container).map((one) => [one.group, one.name ?? '?']));

// Two shapes of the same setting. A Harmony One, a 525, a 300 and a 350 write the delay into the device's power on
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
for (const edit of edits) {
  process.stdout.write(`  ${edit.owner}, at 0x${edit.start.toString(16)}: ${container.blob[edit.start]} becomes ${edit.bytes[0]}\n`);
}
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
