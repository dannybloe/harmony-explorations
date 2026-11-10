/**
 * A whole setup composed onto a Harmony 350 configuration, and written as a file for the bench unit.
 *
 *   node packages/codec/bin/compose-no-screen-setup.ts --donor <config> --setup <recipe.json> --out <file> \
 *       [--take-out 'Knoll,Kodi,Switch,Sony HT,Plasma']
 *   node packages/codec/bin/compose-no-screen-setup.ts --from-nothing --setup <recipe.json> --keys <keys> --out <file> \
 *       [--built-at YYYY-MM-DDTHH:MM:SS]
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
 * `packages/codec/test/families/harmony-300-350/noscreensetup.test.ts` runs the same steps and holds the result against Logitech's second
 * compile part by part.
 *
 * **The file is checked as the writer will check it** before it is saved: the family's cookie and header marker,
 * the end marker, `end_addr` at the end marker and the trailer checksum, `assertFileFamilyContainer`, the same
 * function `write-file-config.ts` asks. The trailer checksum is restamped last, `restamped`. No build time is
 * stamped: this family's clock records carry no transitions, so the remote's clock does not run from the file,
 * `reference/architectures/harmony-300-350/memory.md`, and Logitech's compile was written to the bench unit with
 * its own.
 *
 * **Built from nothing**: `--from-nothing` in place of `--donor` composes the whole setup
 * onto the empty configuration of `buildEmptyNoScreenConfiguration`, devices, Watch TV and favourite channels, so no
 * Logitech file goes in, `buildNoScreenSetup`. Which key each device goes on is then not read off a donor and is
 * given, `--keys`, each device as `name:place` for a short press or `name:place:long`, the place 0 top left to 3
 * bottom right; and the moment the file is built at is `--built-at`, the moment of running unless given, since the
 * stamp, the clock records and the archive's time are taken from it. The later file, which adds the LG TV's Back
 * and its channel finish's copy to the first, the lab keeping both, is
 *
 *   node packages/codec/bin/compose-no-screen-setup.ts --from-nothing \
 *       --setup packages/corpus/setups/h350-test.json \
 *       --keys 'LG TV:0,Knoll:0:long,Plasma:1,Kodi:1:long,Denon:2,Switch:2:long,KPN:3,Sony HT:3:long' \
 *       --out ../lab/work/setups/h350-test/from-nothing-5.1.7.bin
 *
 * with the keys Logitech's service chose for the test setup, `h350-test.json`'s own account of its compile.
 * **A build from nothing binds firmware event `0xFF`** to the list event `0x30` runs, decision 28, so the
 * file serves the Harmony 300 as well as the Harmony 350; the same command with `--out
 * ../lab/work/setups/h350-test/from-nothing-5.4.bin` wrote that file, the two earlier files staying in the lab as
 * they were, without the entry. `packages/codec/test/families/harmony-300-350/noscreenfromnothing.test.ts` rebuilds that file from its own
 * stamp and holds it against Logitech's second compile part by part. A composition onto `--donor` does not add the
 * entry, `families/harmony-300-350/setup.ts` says why.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { assertFileFamilyContainer } from '@harmony/usb/rails';

import { parse, type Recipe } from '../src/index.ts';
import {
  buildNoScreenSetup,
  type ComposedNoScreenSetup,
  composeNoScreenSetup,
  devicePlaces,
  type DevicePlace,
  restamped,
  withoutNoScreenDevice,
} from '../src/build.ts';
import { nameOfLabel } from '../src/shared/core.ts';
import { archiveAt } from '../src/catalogue/catalogue.node.ts';
import '../src/support/resources.node.ts';
import { commandLine, fail } from '@harmony/lab/cli';

const cli = commandLine({
  usage: [
    "usage: node packages/codec/bin/compose-no-screen-setup.ts --donor <config> --setup <recipe.json> --out <file> [--take-out 'a,b,...']",
    '       node packages/codec/bin/compose-no-screen-setup.ts --from-nothing --setup <recipe.json> --keys <keys> --out <file>',
    '         [--built-at YYYY-MM-DDTHH:MM:SS]',
  ].join('\n'),
  values: ['setup', 'out', 'donor', 'take-out', 'keys', 'built-at'],
  flags: ['from-nothing'],
});

/** The moment of running in local time, the spelling base slot 3 takes, as `empty-no-screen.ts` stamps it. */
function now(): string {
  const d = new Date();
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

/** `--keys`, each device `name:place` or `name:place:long`, separated by commas. */
function keysOf(text: string): Record<string, DevicePlace> {
  const out: Record<string, DevicePlace> = {};
  for (const one of text.split(',').map((part) => part.trim()).filter((part) => part !== '')) {
    const [name, place, press, ...rest] = one.split(':');
    if (name === undefined || place === undefined || rest.length > 0 || (press !== undefined && press !== 'long')) {
      fail(`a key is name:place or name:place:long, not "${one}"`);
    }
    out[name] = { place: Number(place), press: press === 'long' ? 'long' : 'short' };
  }
  return out;
}

const fromNothing = cli.flag('from-nothing');
const setupPath = cli.value('setup') ?? fail('--setup <recipe.json> is required');
const output = cli.value('out') ?? fail('--out <file> is required');
const archive = process.env.HARMONY_IR_ARCHIVE ?? fail('HARMONY_IR_ARCHIVE names the catalogue checkout');
const recipe = JSON.parse(readFileSync(setupPath, 'utf8')) as Recipe;

let out: ComposedNoScreenSetup;
if (fromNothing) {
  if (cli.value('donor') !== undefined || cli.value('take-out') !== undefined) fail('--from-nothing takes no --donor and no --take-out');
  const keys = keysOf(cli.value('keys') ?? fail('--from-nothing needs --keys, since there is no donor to read them off'));
  const builtAt = cli.value('built-at') ?? now();
  process.stdout.write(`from nothing, built at ${builtAt}\n`);
  out = buildNoScreenSetup(archiveAt(archive), { recipe, keys, builtAt });
} else {
  const donorPath = cli.value('donor') ?? fail('--donor <config> or --from-nothing is required');
  const takeOut = (cli.value('take-out') ?? '').split(',').map((one) => one.trim()).filter((one) => one !== '');
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
  out = composeNoScreenSetup(c, archiveAt(archive), { recipe, keys });
}
for (const one of out.composed) process.stdout.write(`composed ${one.name}: group ${one.group}, map ${one.map}\n`);
if (out.kept.length > 0) process.stdout.write(`kept ${out.kept.join(', ')}\n`);
if (out.activity !== undefined) {
  process.stdout.write(`composed Watch TV: list ${out.activity.list}, flag variable ${out.activity.flag.variable}, `
    + `${out.activity.inputs.map((one) => `${one.device}'s input of ${one.values}`).join(' and ')}, ${out.activity.recordsAdded} input records\n`);
}
for (const one of out.favourites) {
  process.stdout.write(`favourites on map ${one.map}: ${one.channels.map((ch) => `${ch.channel} on scan ${ch.scan}`).join(', ')}\n`);
}
const bytes = restamped(out.bytes);
const checked = assertFileFamilyContainer(bytes);
process.stdout.write(`${bytes.length} bytes, end_addr 0x${checked.endAddr.toString(16)}, checksum 0x${checked.storedChecksum.toString(16)}\n`);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, bytes);
process.stdout.write(`wrote ${output}\n`);
