/**
 * A catalogue device's driving rules read off an archive checkout on disk, beside the reader of one record it feeds,
 * `deviceDriving` in `driving.ts`. Kept out of that module, plan 013 decision 5, so the reader loads where there is no
 * disk; a builder is handed a `CatalogueSource`, whose `driving` this is on Node, `archiveAt` in `catalogue.node.ts`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ArchiveError } from './archive.ts';
import { archiveManifest } from './archive.node.ts';
import { deviceDriving, type DeviceDriving } from './driving.ts';

/** One device's driving rules, by its manufacturer slug and file name as `catalogueModels` gives them. */
export function catalogueDriving(root: string, slug: string, file: string): DeviceDriving {
  archiveManifest(root);
  const path = join(root, 'devices', slug, file.endsWith('.json') ? file : `${file}.json`);
  if (!existsSync(path)) throw new ArchiveError(`no such device: ${slug}/${file}`);
  return deviceDriving(JSON.parse(readFileSync(path, 'utf8')));
}
