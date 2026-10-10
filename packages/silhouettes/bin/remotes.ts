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
 * this then fills. Adding an architecture is a row in `ARCHITECTURES` the same way, naming the blocks
 * its folder carries. A model whose skins have no record in `MODELS_BY_SKIN`, or that has no screen,
 * gets rows that say so rather than a failure, which is what the Harmony 300 and 350 need.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SCREEN_SIZES } from '@harmony/codec';
import { PROFILES } from '@harmony/corpus/read';
import {
  ARCH9_FLASH_TOP_MAX,
  ARCH9_FLASH_TOP_MIN,
  ARCH9_WINDOWS,
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
  SKINS_WITHOUT_A_MODEL_RECORD,
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
  /**
   * Where the screen size on the drawing comes from, for a model whose architecture has no entry in
   * `SCREEN_SIZES`.
   *
   * `displayTable` refuses a drawing with a screen on an architecture the codec has no raster for,
   * because that is usually two sources disagreeing. **The Harmony Touch is the case where it is not**:
   * `SCREEN_SIZES` is measured from configurations' own full screen pictures, no configuration of a
   * Touch has been read, section 200, so the codec has nothing to say and the drawing's raster comes
   * from Logitech's user guide. A model that states a source here gets a row saying so instead of the
   * refusal, and every other model keeps the refusal.
   */
  readonly rasterFromDrawing?: string;
}

/** The blocks an architecture folder can carry. */
type ArchitectureBlock = 'skins' | 'memory-constants' | 'usb-identity' | 'write-rails';

/** One architecture folder under `reference/architectures/`. */
interface ArchitectureFolder {
  readonly folder: string;
  readonly architecture: number;
  /**
   * Which blocks the folder carries. The memory constants and the write rails are stated for the
   * architectures this library writes to, the Harmony 600, 650 and 700's and the Harmony 525's, so
   * an architecture the library never opens, the Harmony 300 and 350's, carries neither: a table of
   * `none` and `no` would say less than its folder's prose and look like a measurement.
   */
  readonly blocks: readonly ArchitectureBlock[];
}

/**
 * The model folders that exist. The Harmony 650 uses the Harmony 600's drawing, because the 600, 650 and
 * 700 share one face, Danny's statement; `reference/remotes/harmony-650/keys.md` says so beside the table.
 */
export const REMOTES: readonly RemoteFolder[] = [
  { folder: 'harmony-one', skins: [54, 59], drawing: 'one', architecture: 12 },
  // Neither model has a record in `MODELS_BY_SKIN`, so their skin and capability rows say so rather
  // than failing: 78 and 79 are named by `SKINS_WITHOUT_A_MODEL_RECORD`, and 104 by nothing in
  // models.ts but `SKINS_WITH_A_LONG_PRESS`. The 300 uses its own drawing, which takes the 350's shapes.
  { folder: 'harmony-300', skins: [78, 79], drawing: 'h300', architecture: 16 },
  { folder: 'harmony-350', skins: [104], drawing: 'h350', architecture: 16 },
  { folder: 'harmony-600', skins: [71, 73], drawing: 'h600', architecture: 14 },
  { folder: 'harmony-650', skins: [72, 74], drawing: 'h650', architecture: 14 },
  { folder: 'harmony-700', skins: [66, 69], drawing: 'h700', architecture: 14 },
  // Skin 22 alone, as the drawing serves it. Skin 18, the Harmony 520, is the same remote under its
  // other regional name in `MODELS_BY_SKIN`, but its face lacks the four teletext keys this drawing
  // carries, `reference/capabilities.md`, so it is not this drawing's skin and not this folder's.
  { folder: 'harmony-525', skins: [22], drawing: 'h525', architecture: 9 },
];

export const ARCHITECTURES: readonly ArchitectureFolder[] = [
  { folder: 'harmony-600-650-700', architecture: 14, blocks: ['skins', 'memory-constants', 'usb-identity', 'write-rails'] },
  { folder: 'harmony-300-350', architecture: 16, blocks: ['skins', 'usb-identity'] },
  // Named for the 5xx series rather than for the one bench model, because the skins it lists are every
  // model `MODELS_BY_SKIN` places on architecture 9, the Harmony 510, 515, 520 and the Xbox 360 remote
  // among them, the way the arch 14 folder lists the Harmony 665 it holds nothing of.
  { folder: 'harmony-5xx', architecture: 9, blocks: ['skins', 'memory-constants', 'usb-identity', 'write-rails'] },
];

/**
 * Where an architecture's external flash sits in the protocol's address space, and the constants that
 * say so.
 *
 * Every architecture but one states a ceiling, `FLASH_TOP_BYTE_BOUND`, with the flash starting at the
 * bottom of the space. **Arch 9 (Harmony 525) states a window instead**, top bytes `0x80` to `0x87`, a
 * megabyte up, sections 76 and 119, so reading its size off the ceiling table finds nothing and reading
 * it as a ceiling would call 512 KiB eight and a half megabytes. The literal 9 is the one
 * `validateRegionByte` in `packages/usb/src/protocol.ts` tests as well.
 */
function flashSpan(architecture: number): { start: number; end: number; constants: string } | undefined {
  const bound = FLASH_TOP_BYTE_BOUND[architecture];
  if (bound !== undefined) return { start: 0, end: bound << 16, constants: '`FLASH_TOP_BYTE_BOUND`' };
  if (architecture === 9) {
    return {
      start: ARCH9_FLASH_TOP_MIN << 16,
      end: (ARCH9_FLASH_TOP_MAX + 1) << 16,
      constants: '`ARCH9_FLASH_TOP_MIN` and `ARCH9_FLASH_TOP_MAX`',
    };
  }
  return undefined;
}

/** Every skin a folder of this architecture names, so a skin with no model record still gets a row. */
function folderSkins(architecture: number): number[] {
  return REMOTES.filter((r) => r.architecture === architecture).flatMap((r) => r.skins);
}

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

/** The cell a skin with no record in `MODELS_BY_SKIN` gets for a field only that table holds. */
const NO_RECORD = 'no record';

/** A skin's model name: the record's, else the catalogue name `SKINS_WITHOUT_A_MODEL_RECORD` keeps. */
function modelName(skin: number): string {
  const m = MODELS_BY_SKIN[skin];
  if (m !== undefined) return `Harmony ${m.name}`;
  const named = SKINS_WITHOUT_A_MODEL_RECORD[skin];
  return named === undefined ? `${NO_RECORD} in models.ts` : `Harmony ${named}, ${NO_RECORD}`;
}

/** The skins of one model folder, with the fields models.ts holds for each. */
function skinTable(skins: readonly number[], architecture: number): string {
  // The provenance names `SKINS_WITHOUT_A_MODEL_RECORD` only where a row came from it.
  // Skin 104 has neither a record nor a catalogue name, so its folder cites the first table alone.
  const source = skins.every((s) => SKINS_WITHOUT_A_MODEL_RECORD[s] === undefined)
    ? '`MODELS_BY_SKIN` in `packages/usb/src/models.ts`'
    : '`MODELS_BY_SKIN` and `SKINS_WITHOUT_A_MODEL_RECORD` in `packages/usb/src/models.ts`';
  const rows = skins.map((skin) => {
    const m = MODELS_BY_SKIN[skin];
    if (m === undefined) {
      // The architecture is the folder's, not the table's, and the row says which of the two it is.
      return `| ${skin} | ${modelName(skin)} |  | ${architecture}, the folder's | ${NO_RECORD} | ${NO_RECORD} |  |`;
    }
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
    if (m === undefined) {
      const none = NO_RECORD;
      return `| ${skin} | ${none} | ${none} | ${none} | ${none} | ${none} | ${yes(hasLongPress(skin))} |`;
    }
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

function displayTable(remote: RemoteFolder, drawing: Drawing): string {
  const { architecture, skins } = remote;
  const size = SCREEN_SIZES[architecture];
  // A model with no screen has neither a raster nor a screen on its drawing, and both are stated as
  // absent. A raster with no screen on the drawing, or the reverse, is a disagreement and refused,
  // unless the folder names where the drawing's raster comes from, which is the Harmony Touch's case.
  const unread = size === undefined && drawing.screen !== undefined && remote.rasterFromDrawing !== undefined;
  if (!unread && (size === undefined) !== (drawing.screen === undefined)) {
    throw new Error(`architecture ${architecture} and the drawing ${drawing.id} disagree about a screen`);
  }
  const panels = [...new Set(skins.map((s) => MODELS_BY_SKIN[s]?.panel ?? NO_RECORD))].join(', ');
  const touch = [...new Set(skins.map((s) => {
    const m = MODELS_BY_SKIN[s];
    return m === undefined ? NO_RECORD : yes(m.touch);
  }))].join(', ');
  const raster = size === undefined
    ? `| raster | none: no entry for architecture ${architecture} | \`SCREEN_SIZES\` in \`packages/codec/src/render.ts\` |`
    : `| raster | ${size.width} by ${size.height} pixels | \`SCREEN_SIZES\` in \`packages/codec/src/render.ts\`, measured from the configurations' full screen pictures |`;
  const drawn = drawing.screen === undefined
    ? `| raster on the drawing | no screen on the drawing | \`${drawing.id}.ts\` |`
    : `| raster on the drawing | ${drawing.screen.pixels.width} by ${drawing.screen.pixels.height} | ${unread ? remote.rasterFromDrawing : `\`${drawing.id}.ts\`, which must agree with the row above`} |`;
  return [
    '| field | value | from |',
    '|---|---|---|',
    raster,
    drawn,
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
  const span = flashSpan(architecture);
  // A ceiling is one row and the arch 9 window is two: where the flash is, and the four smaller
  // windows the same validator serves before it reaches the flash test, section 119.
  const flashRows = bound === undefined && span !== undefined
    ? [
      `| flash top bytes accepted | ${hex(ARCH9_FLASH_TOP_MIN, 2)} to ${hex(ARCH9_FLASH_TOP_MAX, 2)}, so external flash is ${hex(span.start)} to ${hex(span.end)} | ${span.constants} in \`packages/usb/src/protocol.ts\` |`,
      `| the other windows | ${Object.entries(ARCH9_WINDOWS).map(([top, w]) => `${hex(Number(top), 2)} ${w.region} below ${hex(w.bound, 4)}`).join(', ')} | \`ARCH9_WINDOWS\` in \`packages/usb/src/protocol.ts\` |`,
    ]
    : [`| first refused flash top byte | ${bound === undefined ? 'none read' : `${hex(bound, 2)}, so external flash ends at ${hex(bound << 16)}`} | \`FLASH_TOP_BYTE_BOUND\` in \`packages/usb/src/protocol.ts\` |`];
  return [
    '| field | value | from |',
    '|---|---|---|',
    `| USB product id | ${profiles.map((p) => hex(p.productId, 4)).join(', ') || 'none'} | \`PROFILES\` in \`packages/corpus/src/read.ts\` |`,
    ...flashRows,
    `| escape sub commands dispatched | ${escapes.map((e) => hex(e, 2)).join(', ') || 'none read'} | \`ESCAPE_SUB_COMMANDS\` in \`packages/usb/src/protocol.ts\` |`,
    '',
    provenance('`packages/corpus` and `packages/usb`'),
  ].join('\n');
}

function architectureSkins(architecture: number): string {
  const recorded = Object.keys(MODELS_BY_SKIN).map(Number)
    .filter((s) => MODELS_BY_SKIN[s]?.architecture === architecture);
  const unrecorded = folderSkins(architecture).filter((s) => MODELS_BY_SKIN[s] === undefined);
  const skins = [...new Set([...recorded, ...unrecorded])].sort((a, b) => a - b);
  const rows = skins.map((skin) => {
    const m = MODELS_BY_SKIN[skin];
    if (m === undefined) return `| ${skin} | ${modelName(skin)} | ${NO_RECORD} | ${NO_RECORD} | ${NO_RECORD} |  |`;
    return `| ${skin} | ${modelName(skin)} | ${m.panel} | ${m.maxDevices} | ${m.favourites ?? 'none'} | ${m.firmwareSeen ?? ''} |`;
  });
  // The provenance names the second table only where a row came from it, so a folder whose skins all
  // have a record reads exactly as it did before.
  const source = unrecorded.length === 0
    ? '`MODELS_BY_SKIN` in `packages/usb/src/models.ts`'
    : '`MODELS_BY_SKIN` and `SKINS_WITHOUT_A_MODEL_RECORD` in `packages/usb/src/models.ts`, and the skins the model folders name';
  return [
    '| skin | model | panel | max devices | favourite channel buttons | newest firmware the forum table knows |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
    provenance(source),
  ].join('\n');
}

function memoryConstants(architecture: number): string {
  const base = CONFIG_REGION_BASE[architecture];
  const ceiling = WRITABLE_CEILING[architecture];
  const block = ERASE_BLOCK_SIZE[architecture];
  const span = flashSpan(architecture);
  const staging = STAGING_REGION[architecture];
  const cell = (n: number | undefined, f: (n: number) => string): string => (n === undefined ? 'none' : f(n));
  // A flash that starts at the bottom of the space is stated by its size alone, as it always was; one
  // that sits in a window says where, since the size alone would not tell a reader which addresses.
  const flash = span === undefined
    ? 'none'
    : `${kib(span.end - span.start)}${span.start === 0 ? '' : `, at external ${hex(span.start)} to ${hex(span.end)}`}`;
  // The settings store's constants are the arch 14 store's, so an architecture off that list gets a
  // row saying none is read rather than the arch 14 offsets under its own name.
  const store = ARCHITECTURES_WITH_A_SETTINGS_WRITE_TARGET.includes(architecture)
    ? `| settings store | internal page \`0xFF\` \`+${hex(STORE_OFFSET_IN_PAGE, 4)}\`, two blocks of ${kib(STORE_BLOCK_BYTES)} | \`STORE_OFFSET_IN_PAGE\` and \`STORE_BLOCK_BYTES\`, \`settings.ts\` |`
    : `| settings store | none read: its constants are architecture ${ARCHITECTURES_WITH_A_SETTINGS_WRITE_TARGET.join(', ')}'s | \`ARCHITECTURES_WITH_A_SETTINGS_WRITE_TARGET\`, \`rails.ts\` |`;
  return [
    '| what | value | constant |',
    '|---|---|---|',
    `| external flash size | ${flash} | ${span?.constants ?? '`FLASH_TOP_BYTE_BOUND`'}, \`protocol.ts\` |`,
    `| user configuration starts at | ${cell(base, (n) => `external ${hex(n)}`)} | \`CONFIG_REGION_BASE\`, \`rails.ts\` |`,
    `| highest address a write may reach | ${cell(ceiling, (n) => `external ${hex(n)}`)} | \`WRITABLE_CEILING\`, \`rails.ts\` |`,
    `| erase block | ${cell(block, kib)} | \`ERASE_BLOCK_SIZE\`, \`rails.ts\` |`,
    `| firmware staging region | ${staging === undefined ? 'none' : `external ${hex(staging.start)} to ${hex(staging.end)}`} | \`STAGING_REGION\`, \`rails.ts\` |`,
    store,
    '',
    provenance('`packages/usb/src/protocol.ts`, `rails.ts` and `settings.ts`'),
  ].join('\n');
}

function writeRails(architecture: number): string {
  const on = (list: readonly number[]): string => yes(list.includes(architecture));
  const builds = (table: Readonly<Record<number, readonly string[]>>): string =>
    (table[architecture] ?? []).join(', ') || 'none';
  // The qualifiers describe an open path, so a closed one reads "no" and stops, rather than "no, on
  // builds none", which is what the Harmony 525's row said the first time it was generated.
  const settings = ARCHITECTURES_WITH_A_SETTINGS_WRITE_TARGET.includes(architecture)
    ? `yes, on builds ${builds(SETTINGS_WRITE_READ_ON)}`
    : 'no';
  const reinstall = ARCHITECTURES_WITH_A_REINSTALL_TARGET.includes(architecture)
    ? `yes, at most ${REINSTALL_MAX_IMAGE} bytes; from a running application on builds ${builds(STATUS_BYTE_READ_ON_APPLICATION)}`
    : 'no';
  return [
    '| path | open on this architecture | list |',
    '|---|---|---|',
    `| erase and write a configuration block | ${on(ARCHITECTURES_WITH_A_WRITE_TARGET)} | \`ARCHITECTURES_WITH_A_WRITE_TARGET\` |`,
    `| drop the cached region descriptors, \`WRITE_MISC\` 0x02 | ${on(ARCHITECTURES_WITH_AN_INVALIDATE_TARGET)} | \`ARCHITECTURES_WITH_AN_INVALIDATE_TARGET\` |`,
    `| restart, the escape's 0x02 | ${on(ARCHITECTURES_WITH_A_RESET_TARGET)} | \`ARCHITECTURES_WITH_A_RESET_TARGET\` |`,
    `| write a byte of data memory, \`WRITE_MISC\` 0x07 | ${on(ARCHITECTURES_WITH_A_RAM_WRITE_TARGET)} | \`ARCHITECTURES_WITH_A_RAM_WRITE_TARGET\` |`,
    `| append to the settings store | ${settings} | \`ARCHITECTURES_WITH_A_SETTINGS_WRITE_TARGET\`, \`SETTINGS_WRITE_READ_ON\` |`,
    `| ask safe mode to install the staged firmware | ${reinstall} | \`ARCHITECTURES_WITH_A_REINSTALL_TARGET\`, \`REINSTALL_MAX_IMAGE\`, \`STATUS_BYTE_READ_ON_APPLICATION\` |`,
    '',
    // This named "three units of this architecture" until the Harmony 525's folder took the block,
    // which is one architecture's count stated in a sentence every architecture's folder now carries.
    'Every row also needs `HARMONY_ENABLE_WRITES=1`, its own named door where it has one, and the unit check on the identity block. Which **unit** may be written is not in this table and cannot be: an architecture names a kind of remote, and the unit check compares the identity block read off the remote with the lab\'s record of a permitted unit.',
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
    put(join(dir, 'README.md'), 'skins', skinTable(r.skins, r.architecture));
    put(join(dir, 'features.md'), 'capabilities', featureTable(r.skins));
    put(join(dir, 'keys.md'), 'keys', keyTable(drawing));
    put(join(dir, 'display.md'), 'display', displayTable(r, drawing));
    put(join(dir, 'usb.md'), 'usb-identity', usbIdentity(r.architecture));
  }
  for (const a of ARCHITECTURES) {
    const dir = join('reference', 'architectures', a.folder);
    if (a.blocks.includes('skins')) put(join(dir, 'README.md'), 'skins', architectureSkins(a.architecture));
    if (a.blocks.includes('memory-constants')) {
      put(join(dir, 'memory.md'), 'memory-constants', memoryConstants(a.architecture));
    }
    if (a.blocks.includes('usb-identity')) put(join(dir, 'usb.md'), 'usb-identity', usbIdentity(a.architecture));
    if (a.blocks.includes('write-rails')) put(join(dir, 'usb.md'), 'write-rails', writeRails(a.architecture));
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
