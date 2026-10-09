/**
 * The generated blocks of the per remote reference, `reference/remotes/` and `reference/architectures/`.
 *
 * Those documents are hand written, one folder per model and one per architecture, and a few of their
 * facts already live in code: the skin table in `packages/usb/src/models.ts`, the key list and the
 * measured scan codes in this package's own drawings, the screen raster in `packages/codec`, the
 * product id in `packages/corpus` and every write list in `packages/usb/src/rails.ts`. Typing those
 * into a document a second time is the two copies state this repository refuses everywhere else, and
 * the trigger for the reference was exactly that kind of drift: a session assumed something about a
 * model that nothing it read had stated.
 *
 * So a document carries a marked block, `<!-- generated:NAME -->` up to `<!-- /generated -->`, and
 * this script owns what is between the markers. Text outside them is never touched. Run without
 * arguments it checks, and exits 1 naming every block that differs from the code, every block a file
 * is missing and every marker this script does not know; `--write` rewrites the blocks in place.
 * `make remote-reference` and `make remote-reference-write` are the two spellings, and
 * `test/remotes.test.ts` runs the check in the suite, so a change to a source table that leaves a
 * document behind fails `make ts`.
 *
 * **It lives in `bin` of the silhouettes package and imports the other packages as dev dependencies**,
 * which is a choice and not a necessity. The drawing is the one source here that is about a model
 * rather than an architecture, and keeping the importer in `bin` leaves the library in `src` free of
 * any dependency, which is what FreeHarmony consumes.
 *
 * Adding a model is two lines: a row in `REMOTES` and the folder with its ten files, whose blocks
 * this then fills. Adding an architecture is a row in `ARCHITECTURES` the same way.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SCREEN_SIZES } from '@harmony/codec';
import { PROFILES } from '@harmony/corpus/read';
import {
  ARCHITECTURES_WITH_A_RAM_WRITE_TARGET,
  ARCHITECTURES_WITH_A_REINSTALL_TARGET,
  ARCHITECTURES_WITH_A_RESET_TARGET,
  ARCHITECTURES_WITH_A_SETTINGS_WRITE_TARGET,
  ARCHITECTURES_WITH_A_WRITE_TARGET,
  ARCHITECTURES_WITH_AN_INVALIDATE_TARGET,
  CONFIG_REGION_BASE,
  ERASE_BLOCK_SIZE,
  ESCAPE_SUB_COMMANDS,
  FLASH_TOP_BYTE_BOUND,
  MODELS_BY_SKIN,
  REINSTALL_MAX_IMAGE,
  SETTINGS_WRITE_READ_ON,
  STAGING_REGION,
  STATUS_BYTE_READ_ON_APPLICATION,
  STORE_BLOCK_BYTES,
  STORE_OFFSET_IN_PAGE,
  WRITABLE_CEILING,
  hasLongPress,
} from '@harmony/usb';

import { MODELS } from '../src/index.ts';
import type { Key, Model as Drawing } from '../src/types.ts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** One model folder under `reference/remotes/`. */
interface RemoteFolder {
  readonly folder: string;
  /** The skins this folder describes, both regional variants where there are two. */
  readonly skins: readonly number[];
  /** The drawing it uses, which may be a sibling's where the face is shared. */
  readonly drawing: string;
  readonly architecture: number;
}

/** One architecture folder under `reference/architectures/`. */
interface ArchitectureFolder {
  readonly folder: string;
  readonly architecture: number;
}

/**
 * The model folders that exist. The Harmony 650 uses the Harmony 600's drawing, because the 600, 650 and
 * 700 share one face, Danny's statement; `reference/remotes/harmony-650/keys.md` says so beside the table.
 */
export const REMOTES: readonly RemoteFolder[] = [
  { folder: 'harmony-one', skins: [54, 59], drawing: 'one', architecture: 12 },
  { folder: 'harmony-600', skins: [71, 73], drawing: 'h600', architecture: 14 },
  { folder: 'harmony-650', skins: [72, 74], drawing: 'h650', architecture: 14 },
  { folder: 'harmony-700', skins: [66, 69], drawing: 'h700', architecture: 14 },
];

export const ARCHITECTURES: readonly ArchitectureFolder[] = [
  { folder: 'harmony-600-650-700', architecture: 14 },
];

function hex(n: number, width = 6): string {
  return `0x${n.toString(16).toUpperCase().padStart(width, '0')}`;
}

function kib(n: number): string {
  return n % 1024 === 0 ? `${n / 1024} KiB` : `${n} bytes`;
}

function yes(b: boolean): string {
  return b ? 'yes' : 'no';
}

function provenance(source: string): string {
  return `Generated from ${source} by \`make remote-reference-write\`. Change the source, not this block.`;
}

function modelName(skin: number): string {
  const m = MODELS_BY_SKIN[skin];
  if (m === undefined) throw new Error(`skin ${skin} has no record in models.ts`);
  return `Harmony ${m.name}`;
}

/** The skins of one model folder, with the fields models.ts holds for each. */
function skinTable(skins: readonly number[], source: string): string {
  const rows = skins.map((skin) => {
    const m = MODELS_BY_SKIN[skin];
    if (m === undefined) throw new Error(`skin ${skin} has no record in models.ts`);
    return `| ${skin} | ${modelName(skin)} | ${m.alias === undefined ? '' : `Harmony ${m.alias}`} `
      + `| ${m.architecture} | ${m.panel} | ${yes(m.touch)} | ${m.firmwareSeen ?? ''} |`;
  });
  return [
    '| skin | model | regional twin | architecture | panel | touch | newest firmware the forum table knows |',
    '|---|---|---|---|---|---|---|',
    ...rows,
    '',
    provenance(source),
  ].join('\n');
}

/** The capability fields of models.ts, per skin. */
function featureTable(skins: readonly number[]): string {
  const rows = skins.map((skin) => {
    const m = MODELS_BY_SKIN[skin];
    if (m === undefined) throw new Error(`skin ${skin} has no record in models.ts`);
    return `| ${skin} | ${m.maxDevices} | ${m.favourites ?? 'none'} | ${yes(m.macros)} | ${yes(m.pageButton)} `
      + `| ${yes(m.soundPictureButtons)} | ${yes(hasLongPress(skin))} |`;
  });
  return [
    '| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |',
    '|---|---|---|---|---|---|---|',
    ...rows,
    '',
    provenance('`MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts`'),
  ].join('\n');
}

function scanCell(k: Key): string {
  if (k.scan !== undefined) return `${k.scan} (${hex(k.scan, 2)})`;
  if (k.scanCandidates !== undefined) return `one of ${k.scanCandidates.join(' or ')}`;
  return 'not measured';
}

function keyTable(drawing: Drawing): string {
  const kindOrder = { keypad: 0, screen: 1, touch: 2 } as const;
  const keys = [...drawing.keys].sort((a, b) =>
    kindOrder[a.kind] - kindOrder[b.kind]
      || (a.scan ?? 1000) - (b.scan ?? 1000)
      || a.name.localeCompare(b.name));
  const rows = keys.map((k) => {
    const printed = (k.labels ?? []).map((l) => l.text).join(', ');
    return `| \`${k.name}\` | ${k.kind} | ${k.src} | ${scanCell(k)} | ${k.zone ?? ''} | ${printed} |`;
  });
  const scanned = drawing.keys.filter((k) => k.scan !== undefined).length;
  const paired = drawing.keys.filter((k) => k.scanCandidates !== undefined).length;
  const kinds = (kind: Key['kind']): number => drawing.keys.filter((k) => k.kind === kind).length;
  return [
    // A touch key is counted only where a drawing has one, the Harmony One's, so the sentence on
    // every other model reads as it did before the One's folder existed.
    `${drawing.keys.length} keys on the drawing \`${drawing.id}\`, ${kinds('keypad')} on the keypad`
      + `${kinds('touch') > 0 ? `, ${kinds('touch')} on the touch panel` : ''} and `
      + `${kinds('screen')} that the screen speaks for. ${scanned} carry a measured scan code and ${paired} `
      + 'are left between two candidates by the drawing.',
    '',
    '| key | kind | name from | scan code | screen zone | printed on or beside it |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
    provenance(`\`packages/silhouettes/src/models/${drawing.id}.ts\``),
  ].join('\n');
}

function displayTable(architecture: number, skins: readonly number[], drawing: Drawing): string {
  const size = SCREEN_SIZES[architecture];
  if (size === undefined) throw new Error(`no screen size for architecture ${architecture}`);
  const panels = [...new Set(skins.map((s) => MODELS_BY_SKIN[s]?.panel ?? 'unknown'))].join(', ');
  const touch = [...new Set(skins.map((s) => yes(MODELS_BY_SKIN[s]?.touch ?? false)))].join(', ');
  return [
    '| field | value | from |',
    '|---|---|---|',
    `| raster | ${size.width} by ${size.height} pixels | \`SCREEN_SIZES\` in \`packages/codec/src/render.ts\`, measured from the configurations' full screen pictures |`,
    `| raster on the drawing | ${drawing.screen?.pixels.width ?? '?'} by ${drawing.screen?.pixels.height ?? '?'} | \`${drawing.id}.ts\`, which must agree with the row above |`,
    `| panel | ${panels} | \`packages/usb/src/models.ts\` |`,
    `| touch | ${touch} | \`packages/usb/src/models.ts\`, and \`touch\` on the drawing's screen is ${yes(drawing.screen?.touch ?? false)} |`,
    '',
    provenance('`packages/codec`, `packages/usb` and the drawing'),
  ].join('\n');
}

function usbIdentity(architecture: number): string {
  const profiles = PROFILES.filter((p) => p.architecture === architecture);
  const bound = FLASH_TOP_BYTE_BOUND[architecture];
  const escapes = ESCAPE_SUB_COMMANDS[architecture] ?? [];
  return [
    '| field | value | from |',
    '|---|---|---|',
    `| USB product id | ${profiles.map((p) => hex(p.productId, 4)).join(', ') || 'none'} | \`PROFILES\` in \`packages/corpus/src/read.ts\` |`,
    `| first refused flash top byte | ${bound === undefined ? 'none read' : `${hex(bound, 2)}, so external flash ends at ${hex(bound << 16)}`} | \`FLASH_TOP_BYTE_BOUND\` in \`packages/usb/src/protocol.ts\` |`,
    `| escape sub commands dispatched | ${escapes.map((e) => hex(e, 2)).join(', ') || 'none read'} | \`ESCAPE_SUB_COMMANDS\` in \`packages/usb/src/protocol.ts\` |`,
    '',
    provenance('`packages/corpus` and `packages/usb`'),
  ].join('\n');
}

function architectureSkins(architecture: number): string {
  const skins = Object.keys(MODELS_BY_SKIN).map(Number)
    .filter((s) => MODELS_BY_SKIN[s]?.architecture === architecture)
    .sort((a, b) => a - b);
  const rows = skins.map((skin) => {
    const m = MODELS_BY_SKIN[skin];
    if (m === undefined) throw new Error('unreachable');
    return `| ${skin} | ${modelName(skin)} | ${m.panel} | ${m.maxDevices} | ${m.favourites ?? 'none'} | ${m.firmwareSeen ?? ''} |`;
  });
  return [
    '| skin | model | panel | max devices | favourite channel buttons | newest firmware the forum table knows |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
    provenance('`MODELS_BY_SKIN` in `packages/usb/src/models.ts`'),
  ].join('\n');
}

function memoryConstants(architecture: number): string {
  const base = CONFIG_REGION_BASE[architecture];
  const ceiling = WRITABLE_CEILING[architecture];
  const block = ERASE_BLOCK_SIZE[architecture];
  const bound = FLASH_TOP_BYTE_BOUND[architecture];
  const staging = STAGING_REGION[architecture];
  const cell = (n: number | undefined, f: (n: number) => string): string => (n === undefined ? 'none' : f(n));
  return [
    '| what | value | constant |',
    '|---|---|---|',
    `| external flash size | ${cell(bound, (b) => kib(b << 16))} | \`FLASH_TOP_BYTE_BOUND\`, \`protocol.ts\` |`,
    `| user configuration starts at | ${cell(base, (n) => `external ${hex(n)}`)} | \`CONFIG_REGION_BASE\`, \`rails.ts\` |`,
    `| highest address a write may reach | ${cell(ceiling, (n) => `external ${hex(n)}`)} | \`WRITABLE_CEILING\`, \`rails.ts\` |`,
    `| erase block | ${cell(block, kib)} | \`ERASE_BLOCK_SIZE\`, \`rails.ts\` |`,
    `| firmware staging region | ${staging === undefined ? 'none' : `external ${hex(staging.start)} to ${hex(staging.end)}`} | \`STAGING_REGION\`, \`rails.ts\` |`,
    `| settings store | internal page \`0xFF\` \`+${hex(STORE_OFFSET_IN_PAGE, 4)}\`, two blocks of ${kib(STORE_BLOCK_BYTES)} | \`STORE_OFFSET_IN_PAGE\` and \`STORE_BLOCK_BYTES\`, \`settings.ts\` |`,
    '',
    provenance('`packages/usb/src/protocol.ts`, `rails.ts` and `settings.ts`'),
  ].join('\n');
}

function writeRails(architecture: number): string {
  const on = (list: readonly number[]): string => yes(list.includes(architecture));
  const builds = (table: Readonly<Record<number, readonly string[]>>): string =>
    (table[architecture] ?? []).join(', ') || 'none';
  return [
    '| path | open on this architecture | list |',
    '|---|---|---|',
    `| erase and write a configuration block | ${on(ARCHITECTURES_WITH_A_WRITE_TARGET)} | \`ARCHITECTURES_WITH_A_WRITE_TARGET\` |`,
    `| drop the cached region descriptors, \`WRITE_MISC\` 0x02 | ${on(ARCHITECTURES_WITH_AN_INVALIDATE_TARGET)} | \`ARCHITECTURES_WITH_AN_INVALIDATE_TARGET\` |`,
    `| restart, the escape's 0x02 | ${on(ARCHITECTURES_WITH_A_RESET_TARGET)} | \`ARCHITECTURES_WITH_A_RESET_TARGET\` |`,
    `| write a byte of data memory, \`WRITE_MISC\` 0x07 | ${on(ARCHITECTURES_WITH_A_RAM_WRITE_TARGET)} | \`ARCHITECTURES_WITH_A_RAM_WRITE_TARGET\` |`,
    `| append to the settings store | ${on(ARCHITECTURES_WITH_A_SETTINGS_WRITE_TARGET)}, on builds ${builds(SETTINGS_WRITE_READ_ON)} | \`ARCHITECTURES_WITH_A_SETTINGS_WRITE_TARGET\`, \`SETTINGS_WRITE_READ_ON\` |`,
    `| ask safe mode to install the staged firmware | ${on(ARCHITECTURES_WITH_A_REINSTALL_TARGET)}, at most ${REINSTALL_MAX_IMAGE} bytes; from a running application on builds ${builds(STATUS_BYTE_READ_ON_APPLICATION)} | \`ARCHITECTURES_WITH_A_REINSTALL_TARGET\`, \`REINSTALL_MAX_IMAGE\`, \`STATUS_BYTE_READ_ON_APPLICATION\` |`,
    '',
    'Every row also needs `HARMONY_ENABLE_WRITES=1`, its own named door where it has one, and the unit check on the identity block. Which **unit** may be written is not in this table and cannot be, because three units of this architecture enumerate alike.',
    '',
    provenance('`packages/usb/src/rails.ts`'),
  ].join('\n');
}

/** Every block, keyed by the file it lives in and then by its name. */
export function expectedBlocks(): Map<string, Map<string, string>> {
  const files = new Map<string, Map<string, string>>();
  const put = (file: string, name: string, body: string): void => {
    const blocks = files.get(file) ?? new Map<string, string>();
    blocks.set(name, body);
    files.set(file, blocks);
  };
  for (const r of REMOTES) {
    const drawing = MODELS[r.drawing];
    if (drawing === undefined) throw new Error(`no drawing ${r.drawing}`);
    const dir = join('reference', 'remotes', r.folder);
    put(join(dir, 'README.md'), 'skins', skinTable(r.skins, '`MODELS_BY_SKIN` in `packages/usb/src/models.ts`'));
    put(join(dir, 'features.md'), 'capabilities', featureTable(r.skins));
    put(join(dir, 'keys.md'), 'keys', keyTable(drawing));
    put(join(dir, 'display.md'), 'display', displayTable(r.architecture, r.skins, drawing));
    put(join(dir, 'usb.md'), 'usb-identity', usbIdentity(r.architecture));
  }
  for (const a of ARCHITECTURES) {
    const dir = join('reference', 'architectures', a.folder);
    put(join(dir, 'README.md'), 'skins', architectureSkins(a.architecture));
    put(join(dir, 'memory.md'), 'memory-constants', memoryConstants(a.architecture));
    put(join(dir, 'usb.md'), 'usb-identity', usbIdentity(a.architecture));
    put(join(dir, 'usb.md'), 'write-rails', writeRails(a.architecture));
  }
  return files;
}

const BLOCK = /<!-- generated:([a-z0-9-]+) -->\n([\s\S]*?)<!-- \/generated -->/g;

/**
 * Rewrites the blocks of one document's text, and reports what differed or was missing or unknown.
 * Pure, so the test can run it on the committed files without writing anything.
 */
export function regenerate(file: string, text: string, blocks: ReadonlyMap<string, string>):
  { text: string; problems: string[] } {
  const problems: string[] = [];
  const seen = new Set<string>();
  const out = text.replace(BLOCK, (whole, name: string, body: string) => {
    const want = blocks.get(name);
    if (want === undefined) {
      problems.push(`${file}: a block named ${name} that nothing generates`);
      return whole;
    }
    seen.add(name);
    if (body !== `${want}\n`) problems.push(`${file}: block ${name} differs from the code`);
    return `<!-- generated:${name} -->\n${want}\n<!-- /generated -->`;
  });
  for (const name of blocks.keys()) {
    if (!seen.has(name)) problems.push(`${file}: block ${name} is missing, add the two markers where it belongs`);
  }
  return { text: out, problems };
}

/** Checks, or with `write` rewrites, every document. Returns the problems found before any rewrite. */
export function run(write: boolean): string[] {
  const problems: string[] = [];
  for (const [file, blocks] of expectedBlocks()) {
    const path = join(REPO, file);
    let text: string;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      problems.push(`${file}: missing`);
      continue;
    }
    const result = regenerate(file, text, blocks);
    problems.push(...result.problems);
    if (write && result.text !== text) writeFileSync(path, result.text);
  }
  return problems;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes('--write');
  const problems = run(write);
  for (const p of problems) console.log(p);
  if (write) {
    const left = run(false);
    console.log(left.length === 0 ? 'every generated block matches the code' : `${left.length} problems left`);
    process.exit(left.length === 0 ? 0 : 1);
  }
  if (problems.length > 0) {
    console.log(`${problems.length} problems; make remote-reference-write rewrites the blocks`);
    process.exit(1);
  }
  console.log('every generated block matches the code');
}
