/**
 * Put a device from Logitech's catalogue into a configuration, screen page and all.
 *
 *   node packages/codec/bin/compose-device.ts --in <config> --out <file> \
 *       --manufacturer LG --model OLED55C27LA --label LG \
 *       --commands PowerToggle,VolumeUp,VolumeDown,ChannelUp,ChannelDown,Mute \
 *       --labels Power,Vol+,Vol-,Ch+,Ch-,Mute --icon-like TV
 *
 * This is phase 9 of `docs/adding-a-device.md` in one command: pick a device out of the catalogue,
 * compose it, and print every check somebody should read before the result goes near a remote.
 * Phases 6 and 7 built and proved the composition; what this adds is a way to run it on a real
 * configuration and see what the write would cost.
 *
 * **A length change, unlike `set-delay.ts`.** The device's infrared records go in near the front of
 * the file, so everything after them moves and the trailer checksum moves with it. That is why the
 * block count is printed: a one byte edit costs two erase blocks and this costs as many as the
 * insertion point leaves behind it.
 *
 * It deliberately does not stamp the build timestamp, for `set-delay.ts`'s reason: a timestamp is
 * right for a save and wrong for an exercise whose output should differ from its input only in the
 * places this prints.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { IR_ARCHIVE } from '@harmony/lab';

import {
  catalogueCommands,
  catalogueDevice,
  composeDevice,
  composeDeviceScreen,
  coverage,
  devices,
  inventory,
  irGroups,
  parse,
  roundTrip,
  statedCode,
  trailerAgrees,
  worstQueueRun,
  assertQueueFits,
  ACTION_QUEUE_INSTRUCTIONS,
  localTimestamp,
  saveEdits,
} from '../src/index.ts';
import { irFrame } from '../src/irframe.ts';

/** The erase block a Harmony One clears in one go, which is what a write is counted in. */
const ERASE_BLOCK = 0x10000;

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const input = argument('in') ?? fail('--in is the container to add to');
const output = argument('out') ?? fail('--out is where the result goes');
const manufacturer = argument('manufacturer') ?? fail('--manufacturer names the catalogue folder');
const model = argument('model') ?? fail('--model names the catalogue device');
const label = argument('label') ?? fail('--label is what the config will call it');
const wanted = (argument('commands') ?? fail('--commands is a comma separated list')).split(',');
// Which existing device list row's icon the new row wears, by its drawn label: a television gets
// the television's. Without it the first row's icon is copied, whatever device that is.
const iconLike = argument('icon-like');
// What each pad says, in the commands' order. The catalogue's own names are the default and the
// long ones do not fit an 81 pixel pad, section 242, so a real device page passes `--labels`.
const labels = argument('labels')?.split(',') ?? wanted;
if (labels.length !== wanted.length) fail('--labels needs one label per command, in the same order');

if (IR_ARCHIVE === undefined) {
  fail('no infrared archive: clone logitech-harmony-ir-archive beside this repository, '
    + 'or set HARMONY_IR_ARCHIVE');
}

// The device, and the commands asked for in the order asked for, since that is the row order on
// the page. A name the codeset does not carry is a refusal rather than a shorter page.
const device = catalogueDevice(IR_ARCHIVE, manufacturer, model);
const available = catalogueCommands(IR_ARCHIVE, device.codeset ?? fail('the device states no codeset'));
const byName = new Map<string, string>();
for (const command of available) if (!byName.has(command.name)) byName.set(command.name, command.keycode);
const commands = wanted.map((name) => {
  const keycode = byName.get(name);
  if (keycode === undefined) {
    fail(`${manufacturer} ${model} has no command called ${name}. It has: `
      + [...byName.keys()].sort().join(', '));
  }
  // The power toggle must not repeat when held; everything else here is a key you hold down.
  return { stated: keycode, held: name !== wanted[0] };
});
process.stdout.write(`${device.manufacturer} ${device.model}: ${available.length} commands in the `
  + `catalogue, ${commands.length} asked for\n`);

const before = parse(new Uint8Array(readFileSync(input)));
const wasDevices = inventory(before).devices;
process.stdout.write(`${input}: ${before.blob.length} bytes, ${wasDevices.length} devices `
  + `(${wasDevices.map((one) => one.name ?? '?').join(', ')})\n`);

const composed = composeDevice(before, { label, commands, power: 0 });
const withDevice = parse(composed.bytes);
const screen = composeDeviceScreen(withDevice, label,
  labels.map((name, k) => ({ label: name, list: composed.lists[k] as number })),
  iconLike === undefined ? {} : { iconLike });
// **A save is stamped with the moment of saving**, base slot 3 and the clock's seven state values,
// which is the rail that separates a save from a round trip. The first device written to a remote
// carried its input's stamp, and after a battery pull the remote's clock showed 22 August, section
// 242: a Harmony One resets its clock to this stamp at every boot, section 111.
const builtAt = localTimestamp(new Date());
const after = parse(saveEdits(parse(screen.bytes), [], builtAt).bytes);

// Read the result back with the same readers rather than trusting the composition.
const nowDevices = inventory(after).devices;
if (nowDevices.length !== wasDevices.length + 1) fail('the device did not arrive');
const report = coverage(after);
if (report.accounted !== report.total) {
  fail(`${report.total - report.accounted} byte(s) of the result are claimed by no reader`);
}
if (report.overlaps.length > 0) fail(`${report.overlaps.length} byte range(s) are claimed twice`);
if (!trailerAgrees(after)) fail('the result does not state its own checksum');
if (!roundTrip(after).equal) fail('the emitter does not reproduce the result');
assertQueueFits(after);
const worst = worstQueueRun(after);
process.stdout.write(`stamped ${builtAt}\n`);
process.stdout.write(`${after.blob.length} bytes, ${nowDevices.length} devices, group `
  + `${composed.group}, mode ${screen.mode}, ${screen.menus.length} device list menus: `
  + `${screen.menus.length - screen.pagesAdded.length} grew a row, ${screen.pagesAdded.length} got a page\n`);
process.stdout.write(`every byte accounted, no overlap, checksum agrees, emitter round trips, `
  + `deepest action list ${worst?.peak} of ${ACTION_QUEUE_INSTRUCTIONS} queue slots\n`);

// **The known answer**, where the host config already drives the same device: every number the
// new device sends should already be in the file, put there by Logitech's own compiler. That is not
// a property of the composition, it is a property of this pairing, so it is reported rather than
// demanded.
const existing = new Set<string>();
for (const group of irGroups(before) ?? []) {
  for (const address of group.addresses) {
    const frame = irFrame(before, address);
    if (frame !== undefined) existing.add(frame.value.toString(16).toUpperCase());
  }
}
let known = 0;
for (const command of commands) {
  const stated = statedCode(command.stated);
  const value = stated?.frames[0]?.value.toString(16).toUpperCase();
  if (value !== undefined && existing.has(value)) known += 1;
}
process.stdout.write(`${known} of ${commands.length} commands send a number this configuration `
  + 'already carries, so the device is known to answer them\n');

// What the write would cost, in the unit a write is actually performed in.
const blocks = new Set<number>();
const shorter = Math.min(before.blob.length, after.blob.length);
for (let at = 0; at < shorter; at += 1) {
  if (before.blob[at] === after.blob[at]) continue;
  const block = Math.floor(at / ERASE_BLOCK) * ERASE_BLOCK;
  blocks.add(block);
  at = block + ERASE_BLOCK - 1;
}
for (let at = shorter; at < after.blob.length; at += ERASE_BLOCK) {
  blocks.add(Math.floor(at / ERASE_BLOCK) * ERASE_BLOCK);
}
const first = Math.min(...blocks);
process.stdout.write(`the write would touch ${blocks.size} erase block(s) of `
  + `${ERASE_BLOCK / 1024} KiB, the first at offset 0x${first.toString(16)}, `
  + `${after.blob.length - before.blob.length} bytes longer than the input\n`);

writeFileSync(output, after.blob);
process.stdout.write(`wrote ${output}\n`);
