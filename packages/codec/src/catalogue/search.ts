/**
 * Finding a device, the contract: one question asked of every source at once, each result saying where it came from,
 * and the device fetched as a definition a document carries, decision 41.
 *
 * **Why the libraries ask and not the application.** A device can come from the infrared archive on disk, from the
 * same archive over the network a device at a time, from Logitech's service and from a library of the user's own
 * learned devices. An application that asked each would hold four clients and four result shapes; here it holds a
 * list of sources and gets one list of results, best first.
 *
 * **Why a result is fetched in a second step.** A search answers from an index, a few hundred bytes a device; the
 * definition behind a result is its codeset, its driving rules and the protocol definitions its codes are written in,
 * up to megabytes. So finding lists and fetching carries, and what is fetched is exactly what a document keeps for
 * the device, `RecipeDevice.definition`, which is what leaves a setup editable when no source answers any more.
 *
 * **A source is handed in, never reached for.** This module loads where there is no disk and no network of its own:
 * the disk's source is the Node entry's, `archiveSourceAt`, and the network's is given the application's own way to
 * fetch and its own cache, since the codec's core imports neither.
 *
 * **Built**: the search over the sources handed in, the fetch, and how well a candidate fits what was typed. The
 * network's archive source is not: it refuses by name, `NotBuiltError`, with the requirement it waits on.
 */
import type { RecipeDefinition } from '../recipe/recipe.ts';
import { notBuilt } from '../support/contract.ts';
import { ArchiveError } from './archive.ts';

// ---------------------------------------------------------------------------------------------------
// How well a candidate fits what was typed
// ---------------------------------------------------------------------------------------------------

/**
 * A name as it is compared: letters and digits only, in lower case. A model number is typed with and without its
 * dashes, spaces and capitals, `KDL-32W705B` and `kdl 32w705b`, and the catalogue itself spells one model several
 * ways, so punctuation and case say nothing about which device is meant.
 */
function plain(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * How many single edits turn one text into the other: a letter put in, taken out or replaced, or two neighbours
 * swapped, each counting one. The swap is counted as one because it is the commonest typing error in a model
 * number, `750` for `705`; counted as two replacements it would rank the model meant no higher than a neighbour in
 * the same series that differs in two digits.
 */
function editDistance(a: string, b: string): number {
  let beforeLast: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, k) => k);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      let least = Math.min(previous[j]! + 1, row[j - 1]! + 1, previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) least = Math.min(least, beforeLast[j - 2]! + 1);
      row.push(least);
    }
    beforeLast = previous;
    previous = row;
  }
  return previous[b.length]!;
}

/** The least a candidate has to fit to be a result at all: below it a list fills with devices nobody meant. */
export const LEAST_MATCH = 0.6;

/**
 * How well a candidate fits what was typed, from 0 to 1. The same text once punctuation and case are gone is 1; what
 * was typed being the start of the candidate, or inside it, is high and higher the more of the candidate it covers,
 * which is somebody still typing; anything else is the share of letters that need no edit, which is a typing error.
 * Nothing typed fits everything equally and says nothing, so it is 0 and the caller does not ask.
 */
export function matchOf(typed: string, candidate: string): number {
  const a = plain(typed);
  const b = plain(candidate);
  if (a === '' || b === '') return 0;
  if (a === b) return 1;
  const covered = a.length / b.length;
  if (b.startsWith(a)) return 0.8 + 0.19 * covered;
  if (b.includes(a)) return 0.7 + 0.19 * covered;
  return 1 - editDistance(a, b) / Math.max(a.length, b.length);
}

/**
 * What a person typed to find a device, R9: the manufacturer and the model number as text, typing errors allowed,
 * and the kind of device where they chose one. A field left out is not asked about.
 */
export interface DeviceQuery {
  readonly manufacturer?: string;
  readonly model?: string;
  /** The kind of device, by the catalogue's own name for it: `Television`, `StereoReceiver`. */
  readonly type?: string;
  /** The most results wanted over all sources together; absent is a source's own bound. */
  readonly limit?: number;
}

/** One result of a search: enough to show in a list and to fetch the device by. */
export interface FoundDevice {
  /** The name of the source it came from, `DeviceSource.name`, which is what a result shows as its origin. */
  readonly source: string;
  /** The source's own name for the device, `<manufacturer>/<file>` in the archive; what a document keeps as `device`. */
  readonly entry: string;
  readonly manufacturer: string;
  readonly model: string;
  /** The kind of device, where the source states one. */
  readonly type?: string;
  /** How well it fits what was typed, from 0 to 1, 1 an exact match. Results come best first. */
  readonly match: number;
  /** The versions of its code set, where the source holds several, R10; the first is the one fetched unless another is asked for. */
  readonly versions?: readonly string[];
}

/**
 * A device as a document carries it: where it came from, and its definition with the protocol definitions its
 * commands are written in. `recipe.addDevice` takes one.
 */
export interface CarriedDevice {
  readonly source: string;
  readonly entry: string;
  readonly definition: RecipeDefinition;
  /** The protocol definitions the definition's commands name, as the archive's protocol files hold them. */
  readonly protocols: readonly Readonly<Record<string, unknown>>[];
}

/**
 * One place devices are found. `find` answers from the source's index and `fetch` brings one result's definition;
 * both are asynchronous because two of the four sources are on the network.
 */
export interface DeviceSource {
  /** What a result shows as its origin: `archive`, `logitech`, `library`. */
  readonly name: string;
  find(query: DeviceQuery): Promise<FoundDevice[]>;
  fetch(found: FoundDevice, options?: { readonly version?: string }): Promise<CarriedDevice>;
}

/**
 * Where a network source keeps what it fetched, so a device asked for twice is fetched once, R81. The application's:
 * a folder, a browser's storage, or nothing at all in a test. Keys are the paths the source asked for.
 */
export interface DeviceCache {
  get(key: string): Promise<Uint8Array | undefined>;
  set(key: string, value: Uint8Array): Promise<void>;
}

/** What the network's archive source is given: the application's way to fetch a URL, its cache, and which release it reads. */
export interface NetworkArchiveOptions {
  /** Fetch one URL's bytes; refuses by throwing, which a search reports for that source and goes on with the others. */
  readonly fetch: (url: string) => Promise<Uint8Array>;
  readonly cache: DeviceCache;
  /** The archive release to read, by its tag; absent is the one this version of the libraries was measured at. */
  readonly release?: string;
}

/**
 * One search over every source at once, R82 and R9: the results of all of them in one list, best first, each naming
 * its source. A source that fails does not fail the search; what it said is in `failed`.
 */
export interface DeviceSearch {
  readonly found: readonly FoundDevice[];
  readonly failed: readonly { readonly source: string; readonly message: string }[];
}

/**
 * Ask every source for a device, R82: all of them at once, their results in one list, best first and then by
 * manufacturer and model so that the order is the same on every run, cut to the query's limit. A source that throws
 * is named in `failed` with what it said and the others' results stand, since one source being away is the ordinary
 * case and not a reason to show nothing.
 */
export async function findDevices(sources: readonly DeviceSource[], query: DeviceQuery): Promise<DeviceSearch> {
  const settled = await Promise.allSettled(sources.map(async (source) => source.find(query)));
  const found: FoundDevice[] = [];
  const failed: { source: string; message: string }[] = [];
  settled.forEach((one, at) => {
    if (one.status === 'fulfilled') found.push(...one.value);
    else failed.push({ source: sources[at]!.name, message: one.reason instanceof Error ? one.reason.message : String(one.reason) });
  });
  found.sort((a, b) => b.match - a.match || a.manufacturer.localeCompare(b.manufacturer) || a.model.localeCompare(b.model)
    || a.source.localeCompare(b.source) || a.entry.localeCompare(b.entry));
  return { found: query.limit === undefined ? found : found.slice(0, query.limit), failed };
}

/**
 * Fetch one result's definition from the source that found it, R10; `version` chooses among `FoundDevice.versions`.
 * Refused, as an `ArchiveError`, where the result names a source that was not handed in: a result is only good with
 * the sources it came from.
 */
export async function fetchDevice(
  sources: readonly DeviceSource[], found: FoundDevice, options?: { readonly version?: string },
): Promise<CarriedDevice> {
  const source = sources.find((one) => one.name === found.source);
  if (source === undefined) throw new ArchiveError(`${found.entry} was found by ${found.source}, which is not among the sources given`);
  return source.fetch(found, options);
}

/** The infrared archive read over the network a device at a time, from its own index, kept in the cache given, R81. */
export function networkArchiveSource(options: NetworkArchiveOptions): DeviceSource {
  void options;
  return notBuilt('networkArchiveSource', 81);
}
