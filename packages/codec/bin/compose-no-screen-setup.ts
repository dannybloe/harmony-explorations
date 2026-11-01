/**
 * A whole setup composed onto a Harmony 350 configuration, `todo-compile-350.md` 4.5, and written as a file for the
 * bench unit.
 *
 *   node packages/codec/bin/compose-no-screen-setup.ts --donor <config> --setup <recipe.json> --out <file> \
 *       [--take-out 'Knoll,Kodi,Switch,Sony HT,Plasma']
 *
 * **What it runs.** `--take-out` names devices of the donor to take out first, in that order, by
 * `withoutNoScreenDevice`; each device's key and press are read off the donor before that, `devicePlaces`, so a
 * device taken out goes back where the donor had it. Then `composeNoScreenSetup` composes every device of the setup
 * the configuration now lacks and the setup's favourite channels. The 4.5 file is this with Logitech's first compile
 * of the test setup as the donor and its five removable devices taken out:
 *
 *   node packages/codec/bin/compose-no-screen-setup.ts \
 *       --donor ../lab/work/setups/h350-test/first-compile/compile-Result.EzHex \
 *       --setup packages/corpus/setups/h350-test.json --take-out 'Knoll,Kodi,Switch,Sony HT,Plasma' \
 *       --out ../lab/work/setups/h350-test/composed-4.5.bin
 *
 * `packages/codec/test/noscreensetup.test.ts` runs the same steps and holds the result against Logitech's second
 * compile part by part.
 *
 * **The file is checked as the writer will check it** before it is saved: the family's cookie and header marker,
 * the end marker, `end_addr` at the end marker and the trailer checksum, `assertFileFamilyContainer`, the same
 * function `write-file-config.ts` asks. The trailer checksum is restamped last, `restamped`. No build time is
 * stamped: this family's clock records carry no transitions, so the remote's clock does not run from the file,
 * `reference/architectures/harmony-300-350/memory.md`, and Logitech's compile was written to the bench unit with
 * its own.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { assertFileFamilyContainer } from '@harmony/usb';

import {
  composeNoScreenSetup, devicePlaces, type DevicePlace, parse, type Recipe, restamped, withoutNoScreenDevice,
} from '../src/index.ts';
import { nameOfLabel } from '../src/shared/core.ts';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const donorPath = argument('donor') ?? fail('--donor <config> is required');
const setupPath = argument('setup') ?? fail('--setup <recipe.json> is required');
const output = argument('out') ?? fail('--out <file> is required');
const archive = process.env.HARMONY_IR_ARCHIVE ?? fail('HARMONY_IR_ARCHIVE names the catalogue checkout');
const takeOut = (argument('take-out') ?? '').split(',').map((one) => one.trim()).filter((one) => one !== '');

const recipe = JSON.parse(readFileSync(setupPath, 'utf8')) as Recipe;
let c = parse(new Uint8Array(readFileSync(donorPath)));
const placed = devicePlaces(c);
for (const name of takeOut) {
  const removed = withoutNoScreenDevice(c, name);
  process.stdout.write(`took out ${name}: group ${removed.group}, ${removed.records} records, ${removed.lists.length} lists\n`);
  c = parse(removed.bytes);
}
// Every setup device's key: where the donor had it, before anything was taken out.
const keys: Record<string, DevicePlace> = {};
for (const one of recipe.devices) {
  const where = placed[nameOfLabel(one.name)];
  if (where === undefined) fail(`the donor holds no ${one.name}, so its key is not known`);
  keys[one.name] = where;
}
const out = composeNoScreenSetup(c, archive, { recipe, keys });
for (const one of out.composed) process.stdout.write(`composed ${one.name}: group ${one.group}, map ${one.map}\n`);
process.stdout.write(`kept ${out.kept.join(', ')}\n`);
for (const one of out.favourites) {
  process.stdout.write(`favourites on map ${one.map}: ${one.channels.map((ch) => `${ch.channel} on scan ${ch.scan}`).join(', ')}\n`);
}
const bytes = restamped(out.bytes);
const checked = assertFileFamilyContainer(bytes);
process.stdout.write(`${bytes.length} bytes, end_addr 0x${checked.endAddr.toString(16)}, checksum 0x${checked.storedChecksum.toString(16)}\n`);
writeFileSync(output, bytes);
process.stdout.write(`wrote ${output}\n`);
