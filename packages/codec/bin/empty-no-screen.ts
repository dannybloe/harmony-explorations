/**
 * The Harmony 300 or 350 configuration with no device and no activity, built from nothing, `todo-compile-350.md`
 * 5.1.5, and written as a file for the bench unit.
 *
 *   node packages/codec/bin/empty-no-screen.ts --out <file> [--skin 104] [--built-at YYYY-MM-DDTHH:MM:SS]
 *
 * **What it runs.** `buildEmptyNoScreenConfiguration`, with the skin given, 104 for a Harmony 350 unless another is,
 * and the moment of running unless `--built-at` names one. Nothing else goes in: no Logitech file, no setup, no
 * infrared archive, which is the point of the file. What the configuration holds and why each part is what it is,
 * the start up selecting no map among them, is `packages/codec/src/families/harmony-300-350/empty.ts`; what it was held
 * against, three of Logitech's smallest compiles of the family part by part and every byte to a generator, is
 * `packages/codec/test/noscreenempty.test.ts`. The 5.1.5 file is
 *
 *   node packages/codec/bin/empty-no-screen.ts --out ../lab/work/setups/h350-empty/empty-350.bin
 *
 * and since `todo-compile-350.md` 5.4 the empty configuration binds firmware event `0xFF` to the list event `0x30`
 * runs, decision 28, four bytes more; that file is `--out ../lab/work/setups/h350-empty/empty-350-5.4.bin`, the 5.1.5
 * file staying as it was written.
 *
 * **Skins.** 104, the Harmony 350, and 79, the European Harmony 300, the two whose infrared allocation a compile has
 * stated. Skin 78 is refused by the builder, since no configuration stating it has been read.
 *
 * **The file is checked as the writer will check it** before it is saved: the family's cookie and header marker,
 * the end marker, `end_addr` at the end marker and the trailer checksum, `assertFileFamilyContainer`, the same
 * function `write-file-config.ts` asks; the trailer checksum is restamped last, `restamped`. It holds the end marker,
 * as a write does and a read of `/cfg/usercfg` does not. **The moment is the stamp**: base slot 3, the clock records
 * the remote seeds its clock from at a cold start, and the archive's time, all from `--built-at`. This family's clock
 * steps the minute and nothing beyond it, `reference/architectures/harmony-300-350/memory.md`, so the hour and date
 * it starts with stay what the file says.
 *
 * Read only towards hardware: nothing here opens a remote. Writing the file to the bench Harmony 350 is
 * `packages/usb/bin/write-file-config.ts`, behind the family's rail, with the file the remote holds now as its
 * backup; the `harmony-300-350` skill has the route.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { assertFileFamilyContainer } from '@harmony/usb/rails';

import { irGroups } from '../src/index.ts';
import { buildEmptyNoScreenConfiguration } from '../src/build.ts';
import '../src/resources.node.ts';

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/** The moment of running in local time, the spelling base slot 3 takes, as `empty-one.ts` stamps the Harmony One's. */
function now(): string {
  const d = new Date();
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

const output = argument('out') ?? fail('--out <file> is required');
const skin = Number(argument('skin') ?? '104');
if (!Number.isInteger(skin)) fail('--skin is a number, 104 for a Harmony 350 or 79 for a European Harmony 300');
const builtAt = argument('built-at') ?? now();

const built = buildEmptyNoScreenConfiguration({ skin, builtAt });
const c = built.container;
if (!c.allChecksPass) fail('the empty configuration fails a container check');
const checked = assertFileFamilyContainer(built.bytes);
process.stdout.write(`skin ${skin}, built at ${builtAt}: ${irGroups(c)!.length} empty infrared groups, `
  + `${c.pointerArray(7)!.length} action lists, ${c.pointerArray(6)!.length} key map (the key table), no device\n`);
process.stdout.write(`${built.bytes.length} bytes, end_addr 0x${checked.endAddr.toString(16)}, checksum 0x${checked.storedChecksum.toString(16)}\n`);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, built.bytes);
process.stdout.write(`wrote ${output}\n`);
