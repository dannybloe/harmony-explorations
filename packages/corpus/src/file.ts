/**
 * Filing a read into the lab corpus.
 *
 * Two files per read, next to each other: the config exactly as it came off the remote, and a
 * sidecar saying where it came from. A blob with no provenance is a blob nobody can use later, and
 * this project has already spent effort chasing which unit a file belonged to.
 *
 * Reads land in `lab/reads/`, not in `lab/dumps/`. The `dumps/` tree is curated, one directory per
 * contributor and remote with a hand written `META.md`; this is machine output that accumulates
 * every time somebody presses the button, and mixing the two would erode the curated one.
 *
 * Everything written here stays in the lab. The sidecar carries the version block and a label the
 * operator chose, which is exactly the sort of thing that must not reach a public repository.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse, summary } from '@harmony/codec';

import type { ConfigRead } from './read.ts';

export class FileError extends Error {}

/** Directory under the lab root where automated reads accumulate. */
export const READS_DIR = 'reads';

/**
 * A filename-safe UTC stamp: `20260806T1145Z`.
 *
 * UTC rather than local time, because a corpus that spans machines and time zones needs one
 * ordering, and colons are not portable in filenames.
 */
export function stamp(when: Date): string {
  const iso = when.toISOString();
  return `${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}Z`;
}

/** Anything that is not a letter, digit or dash becomes a dash, so a label cannot escape the directory. */
export function slug(label: string): string {
  const cleaned = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (cleaned === '') throw new FileError(`label "${label}" has nothing usable in it`);
  return cleaned;
}

export interface FileNames {
  readonly config: string;
  readonly sidecar: string;
}

export function fileNames(label: string, when: Date): FileNames {
  const base = `${stamp(when)}-${slug(label)}`;
  return { config: `${base}-config.bin`, sidecar: `${base}-config.json` };
}

/** What the sidecar records. Kept flat so it stays readable without a tool. */
export function describe(read: ConfigRead, label: string, when: Date): Record<string, unknown> {
  const container = parse(read.bytes);
  return {
    label,
    read_at: when.toISOString(),
    duration_ms: Math.round(read.durationMs),
    bytes_per_second: Math.round(read.bytes.length / (read.durationMs / 1000)),
    remote: {
      product_id: `0x${read.profile.productId.toString(16)}`,
      model: read.profile.model,
      architecture: read.profile.architecture,
      version_block: Array.from(read.versionBlock, (b) => b.toString(16).padStart(2, '0')).join(' '),
    },
    flash: {
      base: `0x${read.profile.configBase.toString(16).padStart(6, '0')}`,
      end_addr: `0x${read.header.endAddr.toString(16).padStart(6, '0')}`,
      length: read.bytes.length,
    },
    container: summary(container),
  };
}

export interface FiledRead extends FileNames {
  readonly directory: string;
}

/**
 * Write both files, refusing to overwrite.
 *
 * `wx` rather than a plain write: two reads in the same minute would otherwise silently replace
 * each other, and the one that survives is the one you were not comparing against.
 */
export function fileRead(labRoot: string, read: ConfigRead, label: string, when: Date): FiledRead {
  const directory = join(labRoot, READS_DIR);
  mkdirSync(directory, { recursive: true });
  const names = fileNames(label, when);
  try {
    writeFileSync(join(directory, names.config), read.bytes, { flag: 'wx' });
    writeFileSync(join(directory, names.sidecar), `${JSON.stringify(describe(read, label, when), null, 2)}\n`, {
      flag: 'wx',
    });
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'EEXIST') {
      throw new FileError(`${names.config} already exists; a read from this minute is already filed`);
    }
    throw err;
  }
  return { ...names, directory };
}
