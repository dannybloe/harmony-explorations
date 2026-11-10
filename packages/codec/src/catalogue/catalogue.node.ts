/**
 * Logitech's device catalogue read off an archive checkout on disk, beside the parsers its files feed, `catalogue.ts`,
 * and the one place a builder's `CatalogueSource` is made from a path, `archiveAt`. Kept out of that module, plan
 * 013 decision 5, so the catalogue's reading loads where there is no disk: each reader here finds and reads a file and
 * hands what it parsed to the half that stayed, `manufacturersOfIndex`, `modelsOfIndex`, `deviceOfRecord` and
 * `commandsOfCodeset`.
 *
 * **Every reader here is lazy except `codeIndex`**, which is a full pass over the codesets and says so.
 * The catalogue is 2.2 GB, so a reader that loads it whole is a reader nobody can use inside an
 * application.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ArchiveError } from './archive.ts';
import { archiveManifest, archiveProtocols } from './archive.node.ts';
import {
  codeKey, commandsOfCodeset, deviceOfRecord, manufacturersOfIndex, modelsOfIndex, type CatalogueCommand,
  type CatalogueDevice, type CatalogueManufacturer, type CatalogueModel, type CatalogueSource,
} from './catalogue.ts';
import { catalogueDriving } from './driving.node.ts';

/** Every manufacturer in the catalogue, in the archive's own order, which is by display name. */
export function catalogueManufacturers(root: string): CatalogueManufacturer[] {
  archiveManifest(root);
  const path = join(root, 'index.json');
  if (!existsSync(path)) throw new ArchiveError(`no index.json in ${root}`);
  return manufacturersOfIndex(JSON.parse(readFileSync(path, 'utf8')));
}

/**
 * Every model one manufacturer has.
 *
 * Read from the manufacturer's own `index.json` rather than by listing the directory, which is what
 * makes this cheap: the largest manufacturer has thousands of models and the index is one file. It is
 * also the only place the model name is stated, since a file name has its punctuation replaced and two
 * models may share one, in which case the archive appends the device id.
 */
export function catalogueModels(root: string, slug: string): CatalogueModel[] {
  const path = join(root, 'devices', slug, 'index.json');
  if (!existsSync(path)) throw new ArchiveError(`no such manufacturer: ${slug}`);
  return modelsOfIndex(JSON.parse(readFileSync(path, 'utf8')));
}

/** One device by its manufacturer slug and its file name, as `catalogueModels` gives them. */
export function catalogueDevice(root: string, slug: string, file: string): CatalogueDevice {
  const path = join(root, 'devices', slug, file.endsWith('.json') ? file : `${file}.json`);
  if (!existsSync(path)) throw new ArchiveError(`no such device: ${slug}/${file}`);
  return deviceOfRecord(JSON.parse(readFileSync(path, 'utf8')));
}

/**
 * The commands of one codeset, by the path a device states.
 *
 * `pronto` is left out of the result unless asked for, so a caller holding thousands of commands is not
 * holding thousands of rendered waveforms: they are about 95% of the archive's 1.1 GB of codesets, and an
 * importer wants none of them, since a frame is built from the rhythm table rather than replayed from a
 * rendering. **One file is still parsed whole**, which is cheap; what avoids parsing them at all is
 * `codeIndex`, and that is why it matches text rather than reading through here.
 */
export function catalogueCommands(
  root: string, codeset: string, options: { readonly pronto?: boolean } = {},
): CatalogueCommand[] {
  const path = join(root, codeset);
  if (!existsSync(path)) throw new ArchiveError(`no such codeset: ${codeset}`);
  return commandsOfCodeset(JSON.parse(readFileSync(path, 'utf8')), options);
}

/**
 * Every number any keycode in the archive states, and which codesets state it.
 *
 * **This is a full pass over 54118 files and about eight seconds**, which is why it is one call a caller
 * makes deliberately and holds on to. It exists for one job: a configuration numbers its codes and names
 * none of them, so the way to find out what a device in a config **is** is to look up the numbers it
 * sends. That works because a number is specific: 104938 distinct numbers over 2067863 commands.
 *
 * The keycodes are matched with a regular expression rather than parsed, deliberately. Parsing means
 * materialising the rendered waveforms, which are 95% of the bytes and which nothing here wants, and the
 * shape being matched is a single JSON string field.
 */
export function codeIndex(root: string): Map<string, string[]> {
  archiveManifest(root);
  const directory = join(root, 'codesets');
  if (!existsSync(directory)) throw new ArchiveError(`no codesets/ in ${root}`);
  const out = new Map<string, string[]>();
  for (const bucket of readdirSync(directory)) {
    for (const file of readdirSync(join(directory, bucket))) {
      const at = `codesets/${bucket}/${file}`;
      const text = readFileSync(join(directory, bucket, file), 'utf8');
      for (const match of text.matchAll(/"keycode":\s*"([^"]*)"/g)) {
        for (const value of match[1]!.matchAll(/\(0x([0-9A-Fa-f]+)\)/g)) {
          const key = codeKey(value[1]!);
          const list = out.get(key);
          if (list === undefined) out.set(key, [at]);
          else if (list[list.length - 1] !== at) list.push(at);
        }
      }
    }
  }
  return out;
}

/** One source per checkout, so what a builder keeps per source is kept per checkout. */
const SOURCES = new Map<string, CatalogueSource>();

/**
 * The archive checked out at `root` as a builder reads it, through the readers above: what every composer that needs
 * the catalogue is handed, in place of the path. **The same object for the same path**,
 * since `archiveProtocolsByName` keeps the definitions by name per source, as it kept them per path before, and a
 * device composes many.
 */
export function archiveAt(root: string): CatalogueSource {
  let source = SOURCES.get(root);
  if (source === undefined) {
    source = {
      protocols: () => archiveProtocols(root),
      device: (slug, file) => catalogueDevice(root, slug, file),
      commands: (codeset, options) => catalogueCommands(root, codeset, options),
      driving: (slug, file) => catalogueDriving(root, slug, file),
    };
    SOURCES.set(root, source);
  }
  return source;
}
