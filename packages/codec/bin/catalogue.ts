/**
 * What Logitech's device catalogue says about the devices our own configurations drive.
 *
 * **The measurement behind section 229, and the reason to believe the catalogue reader at all.** The
 * archive is somebody else's checkout of Logitech's data, so it was tested before it was believed, the
 * same way their protocol definitions were: take the devices our corpus already holds, identify each one
 * in the catalogue from the numbers it sends, and check that the codes agree and that the names it hands
 * back are the right names.
 *
 * Three things it prints, in that order:
 *
 * 1. **Identification.** Per device group of every corpus configuration: how many of its numbers the
 *    best matching codeset holds, and how many the runner up holds. The margin matters as much as the
 *    hit count, because Logitech's catalogue holds ranges of near identical codesets.
 * 2. **Naming.** How many of a configuration's button bindings get a command name out of the codeset
 *    identified for that button's own device. This is the number the product wants: a configuration
 *    numbers its codes and names none of them.
 * 3. **The independent comparison**, for the two calibration configurations only, since they are the
 *    only ones whose scan to button table exists: `reference/button-maps.md` names the **key** a scan is,
 *    read out of Logitech's button map service through the account that generated those configs, and the
 *    archive names the **command** a code is. Those are two different questions, so the interesting
 *    output is the taxonomy of the differences rather than an agreement rate.
 *
 * Usage: `make catalogue`, or with `CATALOGUE_ARGS=--detail` for a line per device group. Needs the
 * archive checkout and the lab; no network.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { IR_ARCHIVE, load } from '@harmony/lab';
import { parse, payloadOf } from '../src/index.ts';
import { irGroups } from '../src/ir.ts';
import { devices, keyCodes } from '../src/inventory.ts';
import { irFrame } from '../src/irframe.ts';
import { ArchiveError } from '../src/archive.ts';
import {
  catalogueCommands, catalogueDevice, catalogueManufacturers, codeIndex, codeKey, identifyCodeset,
  DEVICE_TYPE_NAMES, type Identification,
} from '../src/catalogue.ts';
import { CONTAINERS } from './corpus.ts';

const detail = process.argv.includes('--detail');
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

if (IR_ARCHIVE === undefined) {
  console.error('no infrared archive: clone logitech-harmony-ir-archive beside this repository, '
    + 'or set HARMONY_IR_ARCHIVE');
  process.exit(1);
}
let manufacturers: ReturnType<typeof catalogueManufacturers>;
try {
  manufacturers = catalogueManufacturers(IR_ARCHIVE);
} catch (error) {
  console.error(error instanceof ArchiveError ? error.message : String(error));
  process.exit(1);
}
console.log(`${manufacturers.length} manufacturers, `
  + `${manufacturers.reduce((n, one) => n + one.devices, 0)} devices`);

const started = Date.now();
const index = codeIndex(IR_ARCHIVE);
console.log(`${index.size} distinct code numbers indexed in ${Date.now() - started} ms\n`);

/** Every number a device group sends, as the index keys them. */
function numbersOf(container: ReturnType<typeof parse>, group: number): string[] {
  const addresses = (irGroups(container) ?? [])[group]?.addresses ?? [];
  const out: string[] = [];
  for (const address of addresses) {
    const frame = irFrame(container, address);
    if (frame !== undefined) out.push(codeKey(frame.value.toString(16)));
  }
  return out;
}

let groupsSeen = 0;
let groupsIdentified = 0;
let exact = 0;
let namedTotal = 0;
let sendsTotal = 0;
console.log('identification, per device group of every configuration:');
for (const name of CONTAINERS) {
  const data = load(name);
  if (data === undefined) continue;
  let container: ReturnType<typeof parse>;
  try { container = parse(payloadOf(data)); } catch { continue; }
  const labels = new Map(devices(container).map((one) => [one.group, one.name]));
  /** The codeset chosen per group, for the naming pass below. */
  const chosen = new Map<number, Identification>();
  for (const [at] of (irGroups(container) ?? []).entries()) {
    const numbers = numbersOf(container, at);
    if (numbers.length === 0) continue;
    groupsSeen += 1;
    const found = identifyCodeset(index, numbers);
    if (found === undefined) continue;
    groupsIdentified += 1;
    if (found.hits === found.of) exact += 1;
    chosen.set(at, found);
    if (detail) {
      console.log(`  ${name.padEnd(24)} group ${String(at).padEnd(3)} `
        + `${String(labels.get(at) ?? '?').padEnd(26)} ${String(found.hits)}/${String(found.of)} `
        + `(next ${String(found.runnerUp)})`);
    }
  }
  // What each button sends, named out of its own device's codeset rather than out of the whole
  // catalogue: a number alone is ambiguous across manufacturers, and the device is what disambiguates.
  const names = new Map<number, Map<string, string>>();
  for (const [at, found] of chosen) {
    const table = new Map<string, string>();
    for (const command of catalogueCommands(IR_ARCHIVE, found.codeset)) {
      for (const value of command.keycode.matchAll(/\(0x([0-9A-Fa-f]+)\)/g)) {
        const key = codeKey(value[1]!);
        if (!table.has(key)) table.set(key, command.name);
      }
    }
    names.set(at, table);
  }
  let named = 0;
  let sends = 0;
  for (const binding of keyCodes(container)) {
    if (binding.where !== 'set' || binding.event !== 2) continue;
    for (const code of binding.codes) {
      const address = (irGroups(container) ?? [])[code.group]?.addresses[code.code];
      if (address === undefined) continue;
      const frame = irFrame(container, address);
      if (frame === undefined) continue;
      sends += 1;
      if (names.get(code.group)?.has(codeKey(frame.value.toString(16))) === true) named += 1;
    }
  }
  namedTotal += named;
  sendsTotal += sends;
  if (sends > 0) console.log(`  ${name.padEnd(24)} ${named} of ${sends} button sends named`);
}
console.log(`\n${groupsIdentified} of ${groupsSeen} device groups identified, `
  + `${exact} of them on every number they send`);
console.log(`${namedTotal} of ${sendsTotal} button sends got a command name\n`);

/**
 * The independent comparison, and its output is a taxonomy rather than a rate.
 *
 * `reference/button-maps.md` names the physical key a scan code is; the archive names the command a code
 * is. A key called `Number4` sending a command called `4` is two right answers, and a key called
 * `ChannelUp` sending a Blu-ray player's `SkipForward` is the configuration's own binding rather than
 * anybody's mistake. So the rows are grouped by which of the three kinds of difference they are.
 */
const text = readFileSync(join(REPO, 'reference', 'button-maps.md'), 'utf8');
for (const [name, heading] of [['calibration_one', 'Harmony One, skin 54'],
                               ['calibration_h600', 'Harmony 600, skin 71']] as const) {
  const data = load(name);
  if (data === undefined) { console.log(`${name}: absent from the lab`); continue; }
  const container = parse(payloadOf(data));
  const buttons = new Map<number, string>();
  for (const section of text.split(/^## /m).slice(1)) {
    if (!section.startsWith(heading)) continue;
    for (const row of section.matchAll(/^\| (\d+) \| `(\w+)` \| `([^`]*)` \|$/gm)) {
      buttons.set(Number(row[1]), row[2]!);
    }
  }
  const chosen = new Map<number, Map<string, string>>();
  const models = new Map<number, string>();
  for (const [at] of (irGroups(container) ?? []).entries()) {
    const numbers = numbersOf(container, at);
    if (numbers.length === 0) continue;
    const found = identifyCodeset(index, numbers);
    if (found === undefined) continue;
    const table = new Map<string, string>();
    for (const command of catalogueCommands(IR_ARCHIVE, found.codeset)) {
      for (const value of command.keycode.matchAll(/\(0x([0-9A-Fa-f]+)\)/g)) {
        const key = codeKey(value[1]!);
        if (!table.has(key)) table.set(key, command.name);
      }
    }
    chosen.set(at, table);
    models.set(at, found.codeset);
  }
  let same = 0;
  const differ: string[] = [];
  for (const binding of keyCodes(container)) {
    if (binding.where !== 'set' || binding.event !== 2) continue;
    const button = buttons.get(binding.scan);
    if (button === undefined) continue;
    for (const code of binding.codes) {
      const address = (irGroups(container) ?? [])[code.group]?.addresses[code.code];
      if (address === undefined) continue;
      const frame = irFrame(container, address);
      if (frame === undefined) continue;
      const label = chosen.get(code.group)?.get(codeKey(frame.value.toString(16)));
      if (label === undefined) continue;
      if (label === button) same += 1;
      else differ.push(`    scan ${String(binding.scan).padStart(3)} key ${button.padEnd(16)} `
        + `command ${label}`);
    }
  }
  console.log(`${name}: ${same} keys named identically by both tables, ${differ.length} differently`);
  if (detail) for (const one of differ) console.log(one);
}

// The device type mapping, printed because it is a claim with a provenance per value rather than a table.
console.log('\nnumeric device types with a name:');
for (const [value, label] of [...DEVICE_TYPE_NAMES].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${String(value).padStart(3)}  ${label}`);
}
// One device read whole, so the reader's per device path is exercised by the report and not only by the
// tests: a reader nobody has driven end to end is a reader nobody knows works.
const sony = catalogueManufacturers(IR_ARCHIVE).find((one) => one.name === 'Sony');
if (sony !== undefined) {
  console.log(`\nSony has ${sony.devices} devices in the catalogue`);
  const one = catalogueDevice(IR_ARCHIVE, sony.slug, 'KDL-32W705B');
  const commands = catalogueCommands(IR_ARCHIVE, one.codeset!);
  console.log(`  ${one.manufacturer} ${one.model}: type ${one.deviceType} `
    + `(${DEVICE_TYPE_NAMES.get(one.deviceType) ?? 'unnamed'}), `
    + `id ${one.globalDeviceId}, ${commands.length} commands`);
}
