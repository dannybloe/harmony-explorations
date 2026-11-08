/**
 * The infrared archive's protocol definitions read off a checkout on disk, beside the converter they feed, `archive.ts`.
 * Moved out of that module by `todo.md` 7.3.5 so the converter loads where there is no disk; each reader here is the
 * file half of what it was, and hands the parsed rows to the half that stayed: the manifest's check to
 * `archiveManifestOf`, the catalogue by rhythm to `catalogueByRhythmOf`, the generated module to
 * `segmentLengthsModuleOf`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ArchiveError, archiveManifestOf, catalogueByRhythmOf, segmentLengthsModuleOf, type ArchiveManifest, type ArchiveProtocol,
  type CatalogueFamily,
} from './archive.ts';

/**
 * Check the archive's manifest and hand back its counts.
 *
 * Throws on an unknown schema version, which is the whole point: a reader that carries on against a
 * layout it does not know produces durations nobody can tell from correct ones.
 */
export function archiveManifest(root: string): ArchiveManifest {
  const path = join(root, 'manifest.json');
  if (!existsSync(path)) throw new ArchiveError(`no manifest.json in ${root}`);
  return archiveManifestOf(JSON.parse(readFileSync(path, 'utf8')));
}

/**
 * Every protocol definition in the archive, in the order the filesystem hands them over.
 *
 * `protocols/index.json` is skipped: it is the archive's own index of the other files, not a
 * definition, and counting it is what made an early reading of this checkout report 685 families where
 * the manifest says 684.
 */
export function archiveProtocols(root: string): ArchiveProtocol[] {
  archiveManifest(root);
  const directory = join(root, 'protocols');
  if (!existsSync(directory)) throw new ArchiveError(`no protocols/ in ${root}`);
  const out: ArchiveProtocol[] = [];
  for (const file of readdirSync(directory).sort()) {
    if (!file.endsWith('.json') || file === 'index.json') continue;
    out.push(JSON.parse(readFileSync(join(directory, file), 'utf8')) as ArchiveProtocol);
  }
  return out;
}

/** Logitech's catalogue indexed by rhythm, from the checkout at `root`, `catalogueByRhythmOf`. */
export function catalogueByRhythm(root: string): Map<string, CatalogueFamily[]> {
  return catalogueByRhythmOf(archiveProtocols(root));
}

/**
 * The text of `src/infrared/segmentlengths.ts` as the archive at `root` states it, which `bin/segmentlengths.ts`
 * writes and a test compares the checked in file against, `segmentLengthsModuleOf`.
 */
export function segmentLengthsModule(root: string): string {
  return segmentLengthsModuleOf(archiveProtocols(root));
}
