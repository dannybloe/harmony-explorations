/**
 * The raw capture's derived files read off the lab's disk, beside the projection and alignment they feed,
 * `catalogueraw.ts`, whose docstring says what the capture is, how the side file is laid out and the token rule that
 * applies to everything returned here. Moved out of that module by `todo.md` 7.3.5 so the projection loads where there
 * is no disk; `catalogueRules` reads the files and hands the side file's entry to `rawDrivingFields`, which attaches it.
 *
 * **TOKEN RULE: never print a raw line or a whole device.** One line can be 130 KB, about 35000 tokens.
 */
import { closeSync, existsSync, openSync, readFileSync, readSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { ArchiveError } from './archive.ts';
import { archiveManifest } from './archive.node.ts';
import { catalogueDevice } from './catalogue.node.ts';
import {
  RAW_BLOCKS_FILE, RAW_DERIVED_DIRECTORY, RAW_FIELDS, RAW_FIELDS_FILE, RAW_FIELDS_FORMAT, RAW_INDEX_ENTRY, RAW_INDEX_FILE,
  RAW_INDEX_HEADER, RAW_INDEX_MAGIC, RAW_MANIFEST_FILE, RAW_SUMS_FILE, rawDrivingFields, type CatalogueRules,
  type RawDerivedState, type RawDeviceRecord, type RawFieldsEntry, type RawManifest,
} from './catalogueraw.ts';
import { catalogueDriving } from './driving.node.ts';

/** The SHA-256 the lab's `SHA256SUMS` states for one file, or undefined. */
export function statedSha256(directory: string, file: string): string | undefined {
  const path = join(directory, RAW_SUMS_FILE);
  if (!existsSync(path)) return undefined;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^([0-9a-f]{64})\s+\*?(.+)$/.exec(line.trim());
    if (match !== null && match[2] === file) return match[1];
  }
  return undefined;
}

/** Whether the derived files exist and were derived from the capture `SHA256SUMS` states. */
export function rawDerivedState(directory: string): RawDerivedState {
  const derived = join(directory, RAW_DERIVED_DIRECTORY);
  const manifestPath = join(derived, RAW_MANIFEST_FILE);
  if (!existsSync(manifestPath)) return { state: 'absent' };
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as RawManifest;
  for (const file of [RAW_BLOCKS_FILE, RAW_INDEX_FILE, RAW_FIELDS_FILE]) {
    if (!existsSync(join(derived, file))) return { state: 'stale', reason: `${file} is missing beside the manifest` };
  }
  if (manifest.format !== RAW_FIELDS_FORMAT) {
    return { state: 'stale', reason: `side file format ${manifest.format}, this reader knows ${RAW_FIELDS_FORMAT}` };
  }
  const fields = RAW_FIELDS.map((one) => one.name);
  if (JSON.stringify(manifest.fields) !== JSON.stringify(fields)) {
    return { state: 'stale', reason: `derived with fields ${manifest.fields.join(', ')}, RAW_FIELDS is ${fields.join(', ')}` };
  }
  const stated = statedSha256(directory, manifest.source.file);
  if (stated === undefined) return { state: 'stale', reason: `${RAW_SUMS_FILE} states no checksum for ${manifest.source.file}` };
  if (stated !== manifest.source.sha256) {
    return { state: 'stale', reason: `derived from ${manifest.source.sha256.slice(0, 12)}, ${RAW_SUMS_FILE} states ${stated.slice(0, 12)}` };
  }
  return { state: 'fresh', manifest };
}

/** Refuse anything but a fresh derivation, naming why. */
function requireFresh(directory: string): RawManifest {
  const state = rawDerivedState(directory);
  if (state.state === 'absent') throw new ArchiveError(`no derived files in ${directory}: run make catalogue-raw`);
  if (state.state === 'stale') throw new ArchiveError(`the derived raw files are stale: ${state.reason}; run make catalogue-raw`);
  return state.manifest;
}

// The index and the side file are loaded once per directory, since a caller asking about several
// devices should not pay for reading 5.5 MB of index each time.
const indexes = new Map<string, Buffer>();
const sideFiles = new Map<string, ReadonlyMap<number, RawFieldsEntry>>();

function indexOf(directory: string): Buffer {
  let index = indexes.get(directory);
  if (index === undefined) {
    index = readFileSync(join(directory, RAW_DERIVED_DIRECTORY, RAW_INDEX_FILE));
    if (index.toString('latin1', 0, 4) !== RAW_INDEX_MAGIC) throw new ArchiveError(`${RAW_INDEX_FILE} is not an index`);
    indexes.set(directory, index);
  }
  return index;
}

/**
 * The raw line of one device, by its global device id, or undefined when the capture has no such id.
 *
 * **Read the token rule in `catalogueraw.ts`'s docstring before printing what this returns.**
 */
export function rawCaptureLine(directory: string, globalDeviceId: number): string | undefined {
  requireFresh(directory);
  const index = indexOf(directory);
  const count = index.readUInt32LE(4);
  let low = 0;
  let high = count - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const at = RAW_INDEX_HEADER + middle * RAW_INDEX_ENTRY;
    const id = index.readUInt32LE(at);
    if (id < globalDeviceId) low = middle + 1;
    else if (id > globalDeviceId) high = middle - 1;
    else {
      const line = index.readUInt32LE(at + 4);
      const offset = index.readDoubleLE(at + 8);
      const length = index.readUInt32LE(at + 16);
      const block = Buffer.alloc(length);
      const fd = openSync(join(directory, RAW_DERIVED_DIRECTORY, RAW_BLOCKS_FILE), 'r');
      try { readSync(fd, block, 0, length, offset); } finally { closeSync(fd); }
      const text = gunzipSync(block).toString('utf8');
      // The member holds whole lines, each ending in a newline, so the line'th is between two of them.
      let start = 0;
      for (let skip = 0; skip < line; skip++) start = text.indexOf('\n', start) + 1;
      const end = text.indexOf('\n', start);
      return text.slice(start, end === -1 ? undefined : end);
    }
  }
  return undefined;
}

/**
 * One device of the raw capture, parsed. **Never print it whole**: pick the fields you need. One device
 * can be 35000 tokens.
 */
export function rawCaptureDevice(directory: string, globalDeviceId: number): RawDeviceRecord | undefined {
  const line = rawCaptureLine(directory, globalDeviceId);
  return line === undefined ? undefined : JSON.parse(line) as RawDeviceRecord;
}

function sideFileOf(directory: string): ReadonlyMap<number, RawFieldsEntry> {
  let side = sideFiles.get(directory);
  if (side === undefined) {
    const parsed = JSON.parse(gunzipSync(readFileSync(join(directory, RAW_DERIVED_DIRECTORY, RAW_FIELDS_FILE))).toString('utf8')) as {
      devices: Record<string, RawFieldsEntry>;
    };
    side = new Map(Object.entries(parsed.devices).map(([id, entry]) => [Number(id), entry]));
    sideFiles.set(directory, side);
  }
  return side;
}

/**
 * **The one door**: a catalogue device's driving rules as the archive states them, and, given the raw
 * capture's directory, the fields the archive drops attached at the same coordinates, `rawDrivingFields`.
 *
 * Refuses, rather than answering from the archive alone, when a raw directory is given and its derived
 * files are absent, stale against `SHA256SUMS`, or aligned against a different archive build: a caller
 * that asked for the raw fields and silently got none would compose every state step as a sending one.
 */
export function catalogueRules(
  root: string, slug: string, file: string, options: { readonly raw?: string } = {},
): CatalogueRules {
  const archive = catalogueDriving(root, slug, file);
  const { globalDeviceId } = catalogueDevice(root, slug, file);
  const generated = archiveManifest(root).generated;
  if (options.raw === undefined) return { globalDeviceId, archive, sources: { archive: { generated } } };
  const manifest = requireFresh(options.raw);
  if (manifest.archive.generated !== generated) {
    throw new ArchiveError(`the side file was aligned against the archive of ${manifest.archive.generated}, `
      + `the checkout is ${generated}: run make catalogue-raw`);
  }
  const raw = rawDrivingFields(archive, globalDeviceId, sideFileOf(options.raw).get(globalDeviceId) ?? {});
  return {
    globalDeviceId, archive, raw,
    sources: {
      archive: { generated },
      raw: { sha256: manifest.source.sha256, archiveGenerated: manifest.archive.generated,
        ...(manifest.source.release === undefined ? {} : { release: manifest.source.release }) },
    },
  };
}
