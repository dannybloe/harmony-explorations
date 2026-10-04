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
 * **`--full` puts the whole device in**, section 325: every command the catalogue holds whose code
 * composes, on as many device mode pages as it takes, laid out the way Logitech's compiler lays a device
 * out, `devicemode.ts`. The hard keys get the commands the compiler gives them, the screen opens with the
 * power commands and a short fixed list and then runs sorted, each label is sized and split by the
 * compiler's rules, the title is cut to what the counter leaves, and the counter has two digits where it
 * needs them. `--commands` and `--labels` are then not given; `--title` names the device on its pages
 * where `--label` would be too long for the device list. A command whose code cannot be composed is
 * left out and listed.
 *
 * **`--inputs` composes the device's inputs too**, section 321, Harmony 600, 650 and 700 only: the
 * `<label>_Input_<n>` variable and the catalogue's state variables with every transition its rules
 * state, `composeDeviceInputs`. The commands those transitions send are composed as records of the
 * device whether or not `--commands` names them, since a transition can only send a record the device
 * has, and they are not put on the screen: a page shows what `--commands` asks for and nothing more.
 * The input variable and its values are printed, because that variable and a value are what an
 * activity's `--targets` names to put the device on an input. Added for the combined bench file of
 * todo-compile-650 2.5 and 3.6, which needed a catalogue device with inputs on a configuration that
 * gets a screen page, and the library had both halves with no command line that joined them.
 *
 * **`--catalogue <file>` composes several devices in one run**, todo-compile-650 2.7, section 331: a
 * JSON array of devices, each an object with the flags above as fields, `manufacturer`, `model`,
 * `label`, and optionally `title`, `full`, `commands` and `labels` as arrays, `iconLike`, `keysLike`,
 * `powerSteps: false`, `powerOff: false`, `inputs`, `powerOnDelay` and `interDeviceDelay`. They are
 * composed in the order given, each onto the result of the one before, which is byte for byte what
 * running this once per device does, and the order is the order of their device list rows and of their
 * identifiers, as on Logitech's own compiles. The per device flags are then not given.
 * `composeCatalogueDevices` in `composecatalogue.ts` is the composition, and the single device form goes
 * through it too, so the two cannot drift.
 *
 * **A model holds as many devices as Logitech lets an account hold**, eight on a Harmony 650, five on a
 * Harmony 600: the model is the one the configuration's own skin names, `modelForSkin` in
 * `packages/usb`, and a composition past its `maxDevices` is refused before anything is composed. That
 * is why this bin depends on `@harmony/usb`, for its model table and nothing else.
 *
 * **The other bound is the state variables, and it is not a device count.** A write names its variable
 * in seven bits, so a configuration holds at most 128, and a device composed here costs three plus its
 * inputs, 3 to 14 on the devices measured; Logitech's own eight device compiles hold 112 to 124. Within
 * the model's device count it has not been met, section 331: compositions onto the Harmony 650 and 700
 * bases end at 94 to 110. A device that would cross it is refused and the refusal says how many came
 * before it in the run.
 *
 * **A save is stamped with the moment of saving**, base slot 3 and the clock's state values. This
 * header said it deliberately did not stamp, for `set-delay.ts`'s reason<!--superseded-->, from before
 * section 242 found that a Harmony One resets its clock to the stamp at every boot; the code has stamped
 * since, and the sentence had not followed it.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { IR_ARCHIVE } from '@harmony/lab';
import { modelForSkin } from '@harmony/usb/models';

import {
  type CatalogueDeviceRequest,
  type ComposedCatalogueDevice,
  ComposeError,
  composeCatalogueDevices,
  coverage,
  inventory,
  irGroups,
  parse,
  roundTrip,
  statedCode,
  trailerAgrees,
  worstQueueRun,
  assertQueueFits,
  assertStateTableConsistent,
  ACTION_QUEUE_INSTRUCTIONS,
  catalogueCommands,
  catalogueDevice,
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
if (IR_ARCHIVE === undefined) {
  fail('no infrared archive: clone logitech-harmony-ir-archive beside this repository, '
    + 'or set HARMONY_IR_ARCHIVE');
}
const archive: string = IR_ARCHIVE;

/** The flags that describe one device, which `--catalogue` replaces with a file of them. */
const DEVICE_FLAGS = ['manufacturer', 'model', 'label', 'title', 'commands', 'labels', 'icon-like', 'keys-like',
  'power-on-delay', 'inter-device-delay'] as const;
const DEVICE_SWITCHES = ['--full', '--inputs', '--no-power-steps', '--no-power-off'] as const;

// Arch 14 only: the two delays in tenths of a second, given on the command line to override the
// catalogue's.
const tenths = (name: string): number | undefined => {
  const given = argument(name);
  if (given === undefined) return undefined;
  const value = Number(given);
  return Number.isInteger(value) ? value : fail(`--${name} is a whole number of tenths of a second`);
};

/** The one device the flags describe, as the library takes it. */
function requestFromFlags(): CatalogueDeviceRequest {
  const full = process.argv.includes('--full');
  if (full && (argument('commands') !== undefined || argument('labels') !== undefined)) {
    fail('--full takes every command the catalogue holds, so --commands and --labels are not given');
  }
  const commands = argument('commands')?.split(',');
  if (!full && commands === undefined) fail('--commands is a comma separated list, or --full for every command');
  const labels = argument('labels')?.split(',');
  const powerOnDelay = tenths('power-on-delay');
  const interDeviceDelay = tenths('inter-device-delay');
  const title = argument('title');
  const iconLike = argument('icon-like');
  const keysLike = argument('keys-like');
  return {
    manufacturer: argument('manufacturer') ?? fail('--manufacturer names the catalogue folder'),
    model: argument('model') ?? fail('--model names the catalogue device'),
    label: argument('label') ?? fail('--label is what the config will call it'),
    ...(title === undefined ? {} : { title }),
    ...(full ? { full } : {}),
    ...(commands === undefined ? {} : { commands }),
    ...(labels === undefined ? {} : { labels }),
    ...(iconLike === undefined ? {} : { iconLike }),
    ...(keysLike === undefined ? {} : { keysLike }),
    ...(process.argv.includes('--no-power-steps') ? { powerSteps: false } : {}),
    ...(process.argv.includes('--no-power-off') ? { powerOff: false } : {}),
    ...(process.argv.includes('--inputs') ? { inputs: true } : {}),
    ...(powerOnDelay === undefined ? {} : { powerOnDelay }),
    ...(interDeviceDelay === undefined ? {} : { interDeviceDelay }),
  };
}

const listFile = argument('catalogue');
let requests: CatalogueDeviceRequest[];
if (listFile !== undefined) {
  const given = [...DEVICE_FLAGS.map((one) => `--${one}`), ...DEVICE_SWITCHES]
    .filter((flag) => process.argv.includes(flag));
  if (given.length > 0) fail(`--catalogue names every device in its file, so ${given.join(', ')} is not given`);
  const parsed: unknown = JSON.parse(readFileSync(listFile, 'utf8'));
  if (!Array.isArray(parsed) || parsed.length === 0) fail('--catalogue is a JSON array of devices');
  requests = parsed as CatalogueDeviceRequest[];
  for (const [k, one] of requests.entries()) {
    if (typeof one?.manufacturer !== 'string' || typeof one.model !== 'string' || typeof one.label !== 'string') {
      fail(`device ${k + 1} of ${listFile} needs manufacturer, model and label`);
    }
  }
} else {
  requests = [requestFromFlags()];
}

const before = parse(new Uint8Array(readFileSync(input)));
const wasDevices = inventory(before).devices;
process.stdout.write(`${input}: ${before.blob.length} bytes, ${wasDevices.length} devices `
  + `(${wasDevices.map((one) => one.name ?? '?').join(', ')})\n`);
// The model the configuration's own architecture record names, by its skin, the low byte of the
// version word, section 81; and how many devices Logitech lets that model's account hold.
const skin = before.versionWord === undefined ? undefined : before.versionWord & 0xff;
const model = modelForSkin(skin);
if (model === undefined) {
  process.stdout.write(`skin ${skin ?? 'not stated'} names no model this knows, so the device count is not bounded\n`);
} else {
  process.stdout.write(`skin ${skin} is the Harmony ${model.name}, which holds ${model.maxDevices} devices\n`);
}

let composed: ReturnType<typeof composeCatalogueDevices>;
try {
  composed = composeCatalogueDevices(before, archive, requests,
    model === undefined ? {} : { maxDevices: model.maxDevices });
} catch (error) {
  if (!(error instanceof ComposeError)) throw error;
  const steps = process.argv.includes('--no-power-steps') ? '' : '. --no-power-steps sends the first command both ways';
  fail(`${error.message}${/power/i.test(error.message) ? steps : ''}`);
}

/** What one device's composition chose, in the words this printed before it handled several. */
function report(one: ComposedCatalogueDevice): void {
  const { request, device, screen, power } = one;
  process.stdout.write(`\n${one.catalogue.manufacturer} ${one.catalogue.model} as ${request.label}: `
    + `${one.catalogue.commands} commands in the catalogue, ${one.onScreen} `
    + `${request.full === true ? 'compose' : 'asked for'}\n`);
  if (one.leftOut.length > 0) process.stdout.write(`left out, their codes do not compose: ${one.leftOut.join(', ')}\n`);
  if (power !== undefined) {
    const describe = (steps: typeof power.powerOn, names: readonly string[]) => steps
      .map((step, k) => names[k] + (step.holdMs === undefined ? '' : ` held ${step.holdMs} ms`)).join(', then ');
    process.stdout.write(`power is ${power.type}: on ${describe(power.powerOn, power.onCommands)}; `
      + `off ${describe(power.powerOff, power.offCommands)}\n`);
    process.stdout.write(`catalogue delays in tenths: power on ${power.powerOnDelay ?? 'not stated'}, inter device `
      + `${power.interDeviceDelay}, inter key ${power.interKeyDelay}\n`);
    // The resets are composed with the inputs, section NNN, so without `--inputs` there is nothing to
    // reset and the remote keeps whatever input the device was last put on.
    if (power.onResetStates > 0 && one.inputs === undefined) {
      process.stdout.write(`the catalogue resets ${power.onResetStates} input state(s) after a power on, `
        + 'which is composed only with --inputs\n');
    }
  }
  if (device.delay !== undefined) {
    process.stdout.write(`identifier ${device.delay.identifier}, delay tables ${device.powerOnDelay?.table} `
      + `(power on) and ${device.delay.table} (inter device)\n`);
  }
  if (one.inputs !== undefined) {
    process.stdout.write(`inputs: ${one.inputs.plan.input?.values.length ?? 0} input value(s), `
      + `${one.inputs.plan.states.length} state(s), commands composed for them that the screen does not show: `
      + `${one.commandNames.slice(one.onScreen).join(', ') || 'none'}\n`);
    if (one.inputs.input !== undefined) {
      process.stdout.write(`input variable ${one.inputs.input.variable}: `
        + `${[...one.inputs.input.values].map(([name, value]) => `${value} ${name}`).join(', ')}\n`);
    }
    for (const [name, state] of one.inputs.states) {
      process.stdout.write(`state ${name} variable ${state.variable}: `
        + `${[...state.values].map(([one, value]) => `${value} ${one}`).join(', ')}\n`);
    }
    for (const reset of one.inputs.resets) {
      process.stdout.write(`after a power on, ${reset.state} variable ${reset.variable} is set silently to `
        + `${reset.value}${reset.declared ? ` ${reset.named}` : `, the catalogue's ${reset.named} not being one of its values`}\n`);
    }
    for (const left of one.inputs.resetsLeftOut) {
      process.stdout.write(`after a power on the catalogue resets ${left}, a variable not composed, so it is left out\n`);
    }
  }
  if (one.joined !== undefined) {
    process.stdout.write(`power variable ${device.variable} joins all off list ${one.joined.allOff} and `
      + `${one.joined.enterLists.length} activity enter lists as 0\n`);
  }
  if ((screen.substituted ?? []).length > 0) {
    process.stdout.write('drawn in another size than the compiler\'s, for want of a glyph or a width: '
      + `${(screen.substituted ?? []).join(', ')}\n`);
  }
  process.stdout.write(`group ${device.group}, mode ${screen.mode}, ${screen.menus.length} device list menus: `
    + `${screen.menus.length - screen.pagesAdded.length} grew a row, ${screen.pagesAdded.length} got a page`
    + (screen.keys === undefined ? '' : `; ${screen.pages} page(s), ${screen.keys} key(s) of the key map send its commands`)
    + '\n');
}
composed.devices.forEach(report);

// Every device's variables in the final numbering: the delay variables of a device composed before
// another have moved up since its own lines above, which is why this is read back rather than kept.
process.stdout.write('\nstate variables in the result:\n');
for (const one of composed.variables) {
  process.stdout.write(`  ${one.label}: power ${one.power}`
    + (one.powerOnDelay === undefined ? '' : `, power on delay ${one.powerOnDelay}`)
    + (one.interDeviceDelay === undefined ? '' : `, inter device delay ${one.interDeviceDelay}`)
    + `; ${one.byName.size} named\n`);
}

// **A save is stamped with the moment of saving**, base slot 3 and the clock's seven state values,
// which is the rail that separates a save from a round trip. The first device written to a remote
// carried its input's stamp, and after a battery pull the remote's clock showed 22 August, section
// 242: a Harmony One resets its clock to this stamp at every boot, section 111. Once, at the end, for
// however many devices.
const builtAt = localTimestamp(new Date());
const after = parse(saveEdits(parse(composed.bytes), [], builtAt).bytes);

// Read the result back with the same readers rather than trusting the composition.
const nowDevices = inventory(after).devices;
if (nowDevices.length !== wasDevices.length + requests.length) fail('the devices did not all arrive');
const coverageReport = coverage(after);
if (coverageReport.accounted !== coverageReport.total) {
  fail(`${coverageReport.total - coverageReport.accounted} byte(s) of the result are claimed by no reader`);
}
if (coverageReport.overlaps.length > 0) fail(`${coverageReport.overlaps.length} byte range(s) are claimed twice`);
if (!trailerAgrees(after)) fail('the result does not state its own checksum');
if (!roundTrip(after).equal) fail('the emitter does not reproduce the result');
assertQueueFits(after);
assertStateTableConsistent(after);
const worst = worstQueueRun(after);
process.stdout.write(`\nstamped ${builtAt}\n`);
process.stdout.write(`${after.blob.length} bytes, ${nowDevices.length} devices\n`);
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
for (const one of composed.devices) {
  const entry = catalogueDevice(archive, one.request.manufacturer, one.request.model);
  const keycodes = new Map<string, string>();
  for (const command of catalogueCommands(archive, entry.codeset as string)) {
    if (!keycodes.has(command.name)) keycodes.set(command.name, command.keycode);
  }
  let known = 0;
  for (const name of one.commandNames) {
    const value = statedCode(keycodes.get(name) as string)?.frames[0]?.value.toString(16).toUpperCase();
    if (value !== undefined && existing.has(value)) known += 1;
  }
  process.stdout.write(`${one.request.label}: ${known} of ${one.commandNames.length} commands send a number `
    + 'this configuration already carries, so the device is known to answer them\n');
}

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
