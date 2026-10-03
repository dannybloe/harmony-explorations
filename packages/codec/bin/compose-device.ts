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
 * **The device is put into every list that switches devices off**, section 280: the idle key map's
 * all off list, which is what Off runs, and every activity's enter list as a 0, which is what
 * switches it off when another activity starts. Without that the device goes on and never off.
 * `--no-power-off` leaves it out, which is what this produced before.
 *
 * **On a Harmony 600, 650 or 700 the device also gets its two delays**, sections 287 and 288:
 * `--power-on-delay` and `--inter-device-delay` in tenths of a second, 0 to 450 and 0 to 20, and
 * without them the catalogue's own, which is what Logitech's compiler gives every test device of the
 * power hold compiles, section 320. With `--no-power-steps` and no flags, what most compiled devices
 * carry, 15 and 5.
 *
 * **The power is composed as the catalogue states it and as Logitech's compiler wires it**, sections
 * 309 and 320: each step a record of its own, the long press version where the catalogue holds the step
 * for a time, an action of several steps a list calling them in order, and the power on delay, the inter
 * device delay and the power steps' inter key delay all the catalogue's own. `catalogueDevicePower` is
 * the reading and refuses what no compile shows composed, a wait inside a power action above all, and
 * then this stops and says why; `--no-power-steps` instead sends the first command both ways, which is
 * what this did before section 309. A television that needs its power button held, the Harmony 650's
 * Panasonic, stays off for an ordinary press. **The device page's power keys send the power actions
 * too**, which Logitech's compile does not do, since a device mode Power On of three frames leaves that
 * television off.
 *
 * **`--full` puts the whole device in**, section NNN: every command the catalogue holds whose code
 * composes, on as many device mode pages as it takes, laid out the way Logitech's compiler lays a device
 * out, `devicemode.ts`. The hard keys get the commands the compiler gives them, the screen opens with the
 * power commands and a short fixed list and then runs sorted, each label is sized and split by the
 * compiler's rules, the title is cut to what the counter leaves, and the counter has two digits where it
 * needs them. `--commands` and `--labels` are then not given; `--title` names the device on its pages
 * where `--label` would be too long for the device list. A command whose code cannot be composed is
 * left out and listed.
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
  catalogueDevicePower,
  catalogueDriving,
  type CataloguePower,
  ComposeError,
  composeDevice,
  composeDeviceScreen,
  composableKeycode,
  coverage,
  deviceModeLayout,
  devices,
  inventory,
  irGroups,
  joinPowerOff,
  parse,
  roundTrip,
  statedCode,
  trailerAgrees,
  worstQueueRun,
  assertQueueFits,
  assertStateTableConsistent,
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
// The whole device, laid out as the compiler lays it out, section NNN; or the commands asked for.
const full = process.argv.includes('--full');
if (full && (argument('commands') !== undefined || argument('labels') !== undefined)) {
  fail('--full takes every command the catalogue holds, so --commands and --labels are not given');
}
const title = argument('title') ?? label;
// Which existing device list row's icon the new row wears, by its drawn label: a television gets
// the television's. Without it the first row's icon is copied, whatever device that is.
const iconLike = argument('icon-like');
// Arch 14: which device list row's device mode the new key map copies its keys from, by label. A
// key sending the frame one of the new commands sends is bound to it, every other key to nothing.
const keysLike = argument('keys-like');
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
// Under --full: every name the catalogue holds, first of each, and of those the ones whose code
// composes, in catalogue order. The layout is computed over all of them, as the compiler's is, and a
// command left out simply leaves its place to the next.
const layout = full ? deviceModeLayout([...byName.keys()]) : undefined;
const leftOut = full ? [...byName].filter(([, keycode]) => !composableKeycode(keycode)).map(([name]) => name) : [];
const wanted = full
  ? [...byName].filter(([, keycode]) => composableKeycode(keycode)).map(([name]) => name)
  : (argument('commands') ?? fail('--commands is a comma separated list, or --full for every command')).split(',');
if (wanted.length === 0) fail(`${manufacturer} ${model} has no command whose code composes`);
// What each pad says, in the commands' order. The catalogue's own names are the default and the
// long ones do not fit an 81 pixel pad, section 242, so a real device page passes `--labels`.
const labels = argument('labels')?.split(',') ?? wanted;
if (labels.length !== wanted.length) fail('--labels needs one label per command, in the same order');
const commands = wanted.map((name) => {
  const keycode = byName.get(name);
  if (keycode === undefined) {
    fail(`${manufacturer} ${model} has no command called ${name}. It has: `
      + [...byName.keys()].sort().join(', '));
  }
  // The power toggle must not repeat when held; everything else here is a key you hold down. Under
  // --full the power commands are the ones named so, and every other command repeats where its family
  // has a held block and sends once where it has none, rather than refusing the whole device.
  if (full) return { stated: keycode, ...(name.startsWith('Power') ? { held: false } : {}) };
  return { stated: keycode, held: name !== wanted[0] };
});
// The command the power variable sends both ways where the catalogue's power steps are not used: the
// first asked for, or under --full the power toggle where the catalogue has one.
const powerIndex = full ? Math.max(0, wanted.indexOf('PowerToggle')) : 0;
process.stdout.write(`${device.manufacturer} ${device.model}: ${available.length} commands in the `
  + `catalogue, ${commands.length} ${full ? 'compose' : 'asked for'}\n`);
if (leftOut.length > 0) process.stdout.write(`left out, their codes do not compose: ${leftOut.join(', ')}\n`);

// The catalogue's power and delays, section 320: the steps that switch it on and off, each a record of
// its own, and the three delays its entry states. A statement no compile shows composed stops here.
const driving = catalogueDriving(IR_ARCHIVE, manufacturer, model);
let power: CataloguePower | undefined;
if (!process.argv.includes('--no-power-steps')) {
  try {
    power = catalogueDevicePower(driving, (name) => byName.get(name));
  } catch (error) {
    if (!(error instanceof ComposeError)) throw error;
    fail(`${error.message}. --no-power-steps sends ${wanted[0]} both ways instead`);
  }
  const describe = (steps: CataloguePower['powerOn'], names: readonly string[]) => steps
    .map((step, k) => names[k] + (step.holdMs === undefined ? '' : ` held ${step.holdMs} ms`)).join(', then ');
  process.stdout.write(`power is ${power.type}: on ${describe(power.powerOn, power.onCommands)}; `
    + `off ${describe(power.powerOff, power.offCommands)}\n`);
  process.stdout.write(`catalogue delays in tenths: power on ${power.powerOnDelay ?? 'not stated'}, inter device `
    + `${power.interDeviceDelay}, inter key ${power.interKeyDelay}\n`);
  if (power.onResetStates > 0) {
    process.stdout.write(`the catalogue resets ${power.onResetStates} input state(s) after a power on, `
      + 'which is not composed: the device comes on in whatever input it was left in\n');
  }
}

const before = parse(new Uint8Array(readFileSync(input)));
const wasDevices = inventory(before).devices;
process.stdout.write(`${input}: ${before.blob.length} bytes, ${wasDevices.length} devices `
  + `(${wasDevices.map((one) => one.name ?? '?').join(', ')})\n`);

// Arch 14 only: the two delays in tenths of a second, given on the command line to override the
// catalogue's.
const tenths = (name: string): number | undefined => {
  const given = argument(name);
  if (given === undefined) return undefined;
  const value = Number(given);
  return Number.isInteger(value) ? value : fail(`--${name} is a whole number of tenths of a second`);
};
// A delay given on the command line wins over the catalogue's.
const powerOnDelay = tenths('power-on-delay') ?? power?.powerOnDelay;
const interDeviceDelay = tenths('inter-device-delay') ?? power?.interDeviceDelay;
const composed = composeDevice(before, {
  label, commands, power: powerIndex,
  ...(power === undefined ? {} : {
    powerOn: power.powerOn, powerOff: power.powerOff, interKeyDelay: power.interKeyDelay,
  }),
  ...(powerOnDelay === undefined ? {} : { powerOnDelay }),
  ...(interDeviceDelay === undefined ? {} : { interDeviceDelay }),
});
if (composed.powerOnDelay !== undefined && composed.delay !== undefined) {
  process.stdout.write(`delays: power on variable ${composed.powerOnDelay.variable} through table `
    + `${composed.powerOnDelay.table}, inter device variable ${composed.delay.variable} through table `
    + `${composed.delay.table}, identifier ${composed.delay.identifier}\n`);
}
let withDevice = parse(composed.bytes);
if (!process.argv.includes('--no-power-off')) {
  const joined = joinPowerOff(withDevice, composed.variable);
  withDevice = parse(joined.bytes);
  process.stdout.write(`power variable ${composed.variable} joins all off list ${joined.allOff} and `
    + `${joined.enterLists.length} activity enter lists as 0\n`);
}
// A pad for a power command performs the power action, where there is one, rather than sending the
// ordinary press: the reason a long press version exists is that the press is not enough for this
// device. A command both actions use, a toggle's, gets the on action.
const padList = (k: number): number => {
  const name = wanted[k] as string;
  if (power?.onCommands.includes(name) && composed.powerSteps?.on !== undefined) return composed.powerSteps.on;
  if (power?.offCommands.includes(name) && composed.powerSteps?.off !== undefined) return composed.powerSteps.off;
  return composed.lists[k] as number;
};
// Under --full the screen is the compiler's order and the keys its choice, both over the commands that
// composed. The power pads and power keys still run the power actions, which is the one place the
// page deliberately differs from Logitech's, for the reason above.
const listOfName = (name: string): number | undefined => {
  const k = wanted.indexOf(name);
  return k < 0 ? undefined : padList(k);
};
const rows = layout === undefined
  ? labels.map((name, k) => ({ label: name, list: padList(k) }))
  : layout.screen.flatMap((name) => {
    const list = listOfName(name);
    return list === undefined ? [] : [{ label: name, list }];
  });
const keyLists = new Map<number, number>();
for (const [scan, name] of layout?.keys ?? []) {
  const list = listOfName(name);
  if (list !== undefined) keyLists.set(scan, list);
}
const screen = composeDeviceScreen(withDevice, label, rows, {
  ...(iconLike === undefined ? {} : { iconLike }), ...(keysLike === undefined ? {} : { keysLike }),
  ...(layout === undefined ? {} : { compiled: { title, keys: keyLists } }),
});
if ((screen.substituted ?? []).length > 0) {
  process.stdout.write('drawn in another size than the compiler\'s, for want of a glyph or a width: '
    + `${(screen.substituted ?? []).join(', ')}\n`);
}
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
assertStateTableConsistent(after);
const worst = worstQueueRun(after);
process.stdout.write(`stamped ${builtAt}\n`);
process.stdout.write(`${after.blob.length} bytes, ${nowDevices.length} devices, group `
  + `${composed.group}, mode ${screen.mode}, ${screen.menus.length} device list menus: `
  + `${screen.menus.length - screen.pagesAdded.length} grew a row, ${screen.pagesAdded.length} got a page`
  + (screen.keys === undefined ? '' : `; ${screen.pages} page(s), ${screen.keys} key(s) of the key map send its commands`)
  + '\n');
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
// Every block the growth reaches, from the one holding the input's last byte to the one holding the
// output's. This stepped a whole block from `shorter` until 28 September 2026 and so missed the last
// block whenever the growth crossed a boundary, reporting 13 where a composition touched 14.
for (let block = Math.floor(shorter / ERASE_BLOCK) * ERASE_BLOCK; block < after.blob.length;
  block += ERASE_BLOCK) {
  blocks.add(block);
}
const first = Math.min(...blocks);
process.stdout.write(`the write would touch ${blocks.size} erase block(s) of `
  + `${ERASE_BLOCK / 1024} KiB, the first at offset 0x${first.toString(16)}, `
  + `${after.blob.length - before.blob.length} bytes longer than the input\n`);

writeFileSync(output, after.blob);
process.stdout.write(`wrote ${output}\n`);
