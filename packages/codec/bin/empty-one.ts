/**
 * Build the empty Harmony One, `todo-compile-one.md` 7.1.7, and write it to a file, with the screens to look at
 * before it goes near a remote.
 *
 * ```
 * node packages/codec/bin/empty-one.ts --out <file.bin>
 * node packages/codec/bin/empty-one.ts --out <file.bin> --built-at 2026-10-23T12:00:00 --screens <directory>
 * ```
 *
 * The file is a configuration for the Harmony One the spare reports, skin 54, decision 23, built by
 * `buildEmptyTouchConfiguration` with the touch family's default choices and nothing read off a compile; it is held to
 * the checks a container takes before it is written: every parse check, the whole file attributed with no byte
 * carried, `touchAttributedBytes`, and the Harmony One's writable region. `--built-at` stamps the clock and picks the
 * Year picker's three years, the moment of running unless given; the writer stamps the file again when it writes it.
 *
 * `--screens` draws the screen the remote starts on, read off the file as the case the start's ready map takes for the
 * location the remote starts at, and then the activity menu, the idle device list and Options, each its first page with
 * the status strip along the top drawn over it as the header handler draws it, as PNG files in that directory. Nothing
 * is written anywhere `--out` and `--screens` do not name: the lab is the caller's to choose.
 *
 * Read only towards hardware: no remote is opened. Writing the result to the spare Harmony One is `todo-compile-one.md`
 * 7.2, through `packages/corpus/bin/write-config.ts` and the `harmony-one` skill.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { CONFIG_REGION_BASE, WRITABLE_CEILING } from '@harmony/usb';
import {
  type Container, type Raster, UNDRAWN, archSlot, modeRecords, rasterPng, renderPage, renderProgram,
} from '../src/index.ts';
import { buildEmptyTouchConfiguration, touchAttributedBytes } from '../src/families/touch/empty.ts';
import { touchValueMapRoles } from '../src/families/touch/caseprograms.ts';
import { touchFixedScreenModes, TOUCH_FIXED_SCREENS } from '../src/families/touch/fixedscreens.ts';
import { touchActivityMenu } from '../src/families/touch/activityscreen.ts';
import { touchDeviceLists } from '../src/families/touch/devicelists.ts';
import { caseQueued, ENTER_MODE } from '../src/inventory.ts';
import { valueMaps } from '../src/valuemap.ts';

const argument = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};

const out = argument('out');
if (out === undefined) {
  console.error('usage: node packages/codec/bin/empty-one.ts --out <file.bin> [--built-at YYYY-MM-DDTHH:MM:SS] [--screens <directory>]');
  process.exit(2);
}
/** The moment of running in local time, the form a configuration's stamp takes. */
const now = (): string => {
  const d = new Date();
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
};
const builtAt = argument('built-at') ?? now();

const built = buildEmptyTouchConfiguration({ skin: 54, builtAt });
const c = built.container;
if (!c.allChecksPass) throw new Error('the empty One fails a container check');
const attributed = touchAttributedBytes(c, built.blended);
if (attributed.carried.size > 0) throw new Error(`the empty One carries bytes: ${JSON.stringify(Object.fromEntries(attributed.carried))}`);
// The region a write to the Harmony One may cover, `rails.ts`: from the configuration's base to the stored firmware.
const room = (WRITABLE_CEILING[12] as number) - (CONFIG_REGION_BASE[12] as number);
if (built.bytes.length > room) throw new Error(`the empty One is ${built.bytes.length} bytes and the region holds ${room}`);
writeFileSync(out, built.bytes);
console.log(`${out}  ${built.bytes.length} bytes, built at ${builtAt}, ${built.numbering.modes.size} modes, every byte attributed, ${room - built.bytes.length} bytes of the region left`);

const screens = argument('screens');
if (screens !== undefined) {
  mkdirSync(screens, { recursive: true });
  const records = modeRecords(c) ?? [];
  // The start: the ready map's case for the location the remote starts at, the menu role's, section 430.
  const roles = touchValueMapRoles(c);
  const ready = valueMaps(c)?.[roles.records.get('menu') as number];
  const target = ready?.entries.find(([key]) => key === 0)?.[1];
  const start = target === undefined ? undefined : caseQueued(c, target);
  if (start?.opcode !== ENTER_MODE) throw new Error('the start enters no screen this reads');
  const chosen: [string, number][] = [
    ['start', start.operand],
    ['activity-menu', touchActivityMenu(c) as number],
    ['idle-device-list', touchDeviceLists(c).find((one) => one.idle === true)?.mode as number],
    ['options', touchFixedScreenModes(c)[TOUCH_FIXED_SCREENS.indexOf('Options')] as number],
  ];
  for (const [name, mode] of chosen) {
    const page = records[mode]?.pages[0];
    const rendered = page === undefined ? undefined : renderPage(c, page);
    if (rendered === undefined) throw new Error(`mode ${mode}, ${name}, does not render`);
    overlayHeader(c, rendered.raster);
    const file = join(screens, `empty-one-${name}.png`);
    writeFileSync(file, rasterPng(rendered.raster));
    console.log(`${file}  mode ${mode}, ${rendered.strings} strings, ${rendered.pictures} pictures, ${rendered.picturesMissing + rendered.glyphsMissing} missing`);
  }
}

/**
 * The status strip drawn over a page as the header handler draws it: the clock header's programs, base slot 11 entries
 * 0 to 3 on the empty One, each run into a raster of its own and every pixel it drew copied over the page's.
 */
function overlayHeader(on: Container, raster: Raster): void {
  const table = on.pointerArray(archSlot(12, 11)) ?? [];
  for (const address of table.slice(0, 4)) {
    const strip = renderProgram(on, address);
    if (strip === undefined) continue;
    strip.raster.pixels.forEach((value, k) => { if (value !== UNDRAWN) raster.pixels[k] = value; });
  }
}
