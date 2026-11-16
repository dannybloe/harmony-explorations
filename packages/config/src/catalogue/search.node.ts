/**
 * The infrared archive on disk as a source a search asks, the Node entry's half of `search.ts`.
 *
 * Apart from the core because it reads a checkout's indexes and device files off the disk, which the codec's core
 * never does; a renderer's own source answers the same two questions from wherever it holds the archive.
 *
 * **It searches by manufacturer first, because the archive is laid out that way.** Its top index names every
 * manufacturer in one file, and each manufacturer's folder has an index of its own models; there is no index of
 * models across manufacturers. So a search fits what was typed for the manufacturer against the top index, reads the
 * model indexes of the few that fit, and fits the model there: three or four small files for a search, where a
 * search with no manufacturer would open every folder there is. A query that names no manufacturer is refused by
 * this source with those words, which `findDevices` reports beside the other sources' results.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DEVICE_TYPE_NAMES } from './catalogue.ts';
import { ArchiveError } from './archive.ts';
import { carriedDeviceAt } from './carried.node.ts';
import { catalogueDevice, catalogueManufacturers, catalogueModels } from './catalogue.node.ts';
import { LEAST_MATCH, matchOf, type CarriedDevice, type DeviceQuery, type DeviceSource, type FoundDevice } from './search.ts';

/** The name results of this source carry as their origin. */
export const ARCHIVE_SOURCE_NAME = 'archive';

/**
 * How many manufacturers a search reads the models of: the ones that fit best. A typed name fits its own
 * manufacturer and at most a handful of near spellings, `Sony` and `Sony Ericsson`; more would only be read to be
 * ranked below them.
 */
const MANUFACTURERS_READ = 5;

/** How many results this source gives where the query states no limit. */
const DEFAULT_LIMIT = 50;

/**
 * The archive checked out at `root` as a source. `find` reads indexes only, and a device's own file only for
 * the results it is about to give, to state the kind of device and to hold a kind that was asked for; `fetch` reads
 * the device's record, its codeset and the protocol definitions its codes name, `carriedDeviceAt`.
 *
 * @privateRemarks
 * R9.
 */
export function archiveSourceAt(root: string): DeviceSource {
  return {
    name: ARCHIVE_SOURCE_NAME,
    async find(query: DeviceQuery): Promise<FoundDevice[]> {
      if (query.manufacturer === undefined || query.manufacturer.trim() === '') {
        throw new ArchiveError('the archive is searched by manufacturer first, and the query names none');
      }
      const makers = catalogueManufacturers(root)
        .map((maker) => ({ maker, match: Math.max(matchOf(query.manufacturer!, maker.name), matchOf(query.manufacturer!, maker.slug)) }))
        .filter((one) => one.match >= LEAST_MATCH)
        .sort((a, b) => b.match - a.match || a.maker.name.localeCompare(b.maker.name))
        .slice(0, MANUFACTURERS_READ);
      const candidates: { maker: string; slug: string; file: string; model: string; match: number }[] = [];
      for (const { maker, match } of makers) {
        // A checkout may hold a part of the archive, the top index whole and some manufacturers' folders: it is
        // searched for what it holds, and a manufacturer it names and does not hold has no device to give.
        if (!existsSync(join(root, 'devices', maker.slug, 'index.json'))) continue;
        for (const row of catalogueModels(root, maker.slug)) {
          // A device with no model name cannot be asked for by one; with no model typed, every device of the
          // manufacturer is a result, ranked by how well the manufacturer fits.
          if (row.model === null) continue;
          const fits = query.model === undefined || query.model.trim() === '' ? 1 : matchOf(query.model, row.model);
          if (fits < LEAST_MATCH) continue;
          // Both have to fit, each over the least fit, and the device's fit is the two multiplied: a doubt about the
          // manufacturer and a doubt about the model are two doubts, so the model meant with one typing error
          // ranks above its neighbour with two, whatever the manufacturer's fit was.
          candidates.push({ maker: maker.name, slug: maker.slug, file: row.file.replace(/\.json$/, ''), model: row.model.trim(), match: match * fits });
        }
      }
      candidates.sort((a, b) => b.match - a.match || a.maker.localeCompare(b.maker) || a.model.localeCompare(b.model) || a.file.localeCompare(b.file));
      const limit = query.limit ?? DEFAULT_LIMIT;
      const found: FoundDevice[] = [];
      for (const one of candidates) {
        if (found.length >= limit) break;
        // The kind of device is in the device's own file and in no index, so it is read for a result and never
        // for a candidate that will not be one. A partial checkout may hold the index and not the file: the result
        // then states no kind, and is left out where a kind was asked for, since nothing says it is of that kind.
        const held = existsSync(join(root, 'devices', one.slug, `${one.file}.json`));
        const type = held ? DEVICE_TYPE_NAMES.get(catalogueDevice(root, one.slug, one.file).deviceType) : undefined;
        if (query.type !== undefined && type !== query.type) continue;
        found.push({
          source: ARCHIVE_SOURCE_NAME, entry: `${one.slug}/${one.file}`, manufacturer: one.maker, model: one.model,
          ...(type === undefined ? {} : { type }), match: one.match,
        });
      }
      return found;
    },
    async fetch(found: FoundDevice, options?: { readonly version?: string }): Promise<CarriedDevice> {
      // This source reads the one code set a device's record names and offers no version to choose among, so a
      // version asked for is a result of some other source handed to this one.
      if (options?.version !== undefined) throw new ArchiveError(`the archive offers no versions of ${found.entry}, and version ${options.version} was asked for`);
      const one = carriedDeviceAt(root, found.entry);
      return {
        source: ARCHIVE_SOURCE_NAME,
        entry: found.entry,
        definition: { record: one.record, commands: one.commands },
        protocols: [...one.protocols.keys()].sort().map((name) => one.protocols.get(name) as Readonly<Record<string, unknown>>),
      };
    },
  };
}
