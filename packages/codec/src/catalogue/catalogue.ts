/**
 * Reading Logitech's device catalogue out of the Harmony infrared archive.
 *
 * **What this is for.** Two gaps close here at once, and neither is about pulses. Picking a device from
 * a catalogue needed Logitech's live service, which answers today and will not one day; and knowing
 * **which command a stored code is** needed the button map service, which two test accounts had told us
 * about 1200 commands' worth. The archive holds 276236 devices from 7889 manufacturers, 257720 of them
 * with codes, and every command in it carries a name beside its code. `packages/codec/src/catalogue/archive.ts`
 * reads the protocol half of the same checkout; this reads the device half.
 *
 * **The keycode is character for character what the live service returns**, `G:Toshiba 32 Bit:(0x20DF9E61)(Repeat)():3`,
 * so `statedCode` parses it with no adapter and the archive is a drop-in for the live device fetch.
 *
 * **Decision 15 in `docs/decisions.md` governs what may cross.** Names and durations come through our own
 * readers; the archive's own JSON never enters this repository, and neither does its 13.29 million
 * rendered waveforms. **And decision 11**: a definition taken from here is Logitech's data, so it may
 * never be shared through a community device database, whatever else is done with it.
 *
 * **The layout, from the manifest.** `index.json` lists the manufacturers; `devices/<slug>/index.json`
 * lists that manufacturer's models; `devices/<slug>/<file>.json` is one device, naming the codeset it
 * uses; `codesets/<first two>/<hash>.json` is a list of commands. **A codeset is shared**: 257720
 * devices use 54118 of them, one of which serves 3911 devices, so a codeset is a code table rather than
 * a device's property and 35175 of them belong to exactly one device.
 *
 * **The files are read in `catalogue.node.ts`, and parsed here**, plan 013 decision 5: each reader by path there
 * hands what it read to a parser here, so the catalogue's reading loads where there is no disk, and a builder that
 * needs the catalogue is handed a `CatalogueSource` rather than a path. Every reader there is lazy except `codeIndex`.
 */
import type { ArchiveProtocol } from './archive.ts';
import type { DeviceDriving } from './driving.ts';

/** One manufacturer, as `index.json` states it. */
export interface CatalogueManufacturer {
  /** The display name, which is what a person picks from: `1 by one`, `3B Technology`, `Sony`. */
  readonly name: string;
  /** The directory name, which is the display name with its punctuation replaced. */
  readonly slug: string;
  /** How many devices the manufacturer has, so a picker can show it without opening the directory. */
  readonly devices: number;
}

/** One model of one manufacturer, as its manufacturer's own index states it. */
export interface CatalogueModel {
  /**
   * **Null for the three devices that state no model name**, of 276236: one each under Thomson,
   * Gemini and Sony, whose only identity is `globalDeviceId` and whose file is named for it. This
   * field was typed `string` until it was measured, so a caller reaching for a string method on it
   * threw on Sony, which is a manufacturer the tests here already walk.
   */
  readonly model: string | null;
  /** The file inside `devices/<slug>/`, which is not always the model name: two models may collide. */
  readonly file: string;
  /** Logitech's own id for the device, which is what their live service takes as a key. */
  readonly globalDeviceId: number;
}

/** One device: what it is, and where its codes live. */
export interface CatalogueDevice {
  readonly manufacturer: string;
  /** Null for the same three devices, and for the same reason. See `CatalogueModel.model`. */
  readonly model: string | null;
  /**
   * Logitech's own numeric device type. **Not an index into the `DeviceType` enum** in
   * `reference/logitech/data-model/model.json`, which is serialised alphabetically, so its index 1 is `Default` and
   * its 4 is `CableBox`. See `DEVICE_TYPE_NAMES` for the values that are named and how.
   */
  readonly deviceType: number;
  readonly globalDeviceId: number;
  /**
   * The codeset path relative to the archive root, absent for the 18516 devices with no codes.
   *
   * **The archive spells that absence as `null` and this field is normalised to omit it**, which is
   * the point of the normalising: the count in this comment was right and the type was wrong about
   * exactly those rows, since all 18516 carry the key with a null value and **not one** of the
   * 276236 device files omits it. So a `=== undefined` guard was never true once, and every codeless
   * device came back with a null typed as `string | undefined`, which threw a path error deep in
   * `catalogueCommands` rather than reporting no codes.
   */
  readonly codeset?: string;
}

/** One command: the name a person would recognise, and the code to send. */
export interface CatalogueCommand {
  /** Logitech's own canonical command name: `VolumeUp`, `ChannelPrev`, `4`, `Mute`. */
  readonly name: string;
  /** The keycode string, which `statedCode` parses. */
  readonly keycode: string;
  /** The archive's rendered waveform, only when asked for: it is 95% of the file's bytes. */
  readonly pronto?: string;
}

/**
 * What Logitech's numeric device type means, for the values something outside the archive has named.
 *
 * **Three of these are Logitech's own words** and one is corroborated rather than stated. Their live
 * service returns a `DeviceType` number beside a `DeviceTypeDisplayName`, and a captured reply in the
 * lab pairs 1 with `Television`, 4 with `DVD` and 5 with `StereoReceiver`. Type 2 is not in that reply;
 * what names it is our own corpus, where the one device group a config's owner labelled `VCR` identifies
 * a device the archive types 2, and the archive's own README says 2 is a VCR as well.
 *
 * **The other 42 values in use are deliberately unnamed.** Naming them by guessing from the models that
 * carry them is exactly the kind of fit this project refuses; what would settle them is more captured
 * replies, one per type, and that is cheap whenever it is wanted.
 */
export const DEVICE_TYPE_NAMES: ReadonlyMap<number, string> = new Map([
  [1, 'Television'],
  [2, 'VCR'],
  [4, 'DVD'],
  [5, 'StereoReceiver'],
]);

/**
 * The archive as a builder reads it: the four questions a composer asks of a checkout, handed in rather than read from
 * a path, so the builders load where there is no disk, plan 013 decision 5. `archiveAt` in `catalogue.node.ts` answers
 * them from a checkout on disk through the readers there, which is what every builder was handed the path of before;
 * a renderer answers them from wherever it holds the archive. Each answers as the reader it is named after.
 */
export interface CatalogueSource {
  /** Every protocol definition, `archiveProtocols`. */
  readonly protocols: () => ArchiveProtocol[];
  /** One device by its manufacturer slug and file name, `catalogueDevice`. */
  readonly device: (slug: string, file: string) => CatalogueDevice;
  /** The commands of one codeset, by the path a device states, `catalogueCommands`. */
  readonly commands: (codeset: string, options?: { readonly pronto?: boolean }) => CatalogueCommand[];
  /** One device's driving rules, `catalogueDriving`. */
  readonly driving: (slug: string, file: string) => DeviceDriving;
}

/** The manufacturers of a parsed `index.json`, in its own order, which is by display name. */
export function manufacturersOfIndex(parsed: unknown): CatalogueManufacturer[] {
  const rows = parsed as { c: number; n: string; s: string }[];
  return rows.map((one) => ({ name: one.n, slug: one.s, devices: one.c }));
}

/** The models of a manufacturer's parsed `devices/<slug>/index.json`. */
export function modelsOfIndex(parsed: unknown): CatalogueModel[] {
  // `m` is null on three rows of the whole archive, so the cast says so rather than the interface
  // carrying the lie: a cast is where a reader decides what it believes about somebody else's data.
  type Row = { f: string; id: number; m: string | null };
  const rows = parsed as Row[];
  return rows.map((one) => ({ model: one.m ?? null, file: one.f, globalDeviceId: one.id }));
}

/** One device of a parsed `devices/<slug>/<file>.json`. */
export function deviceOfRecord(parsed: unknown): CatalogueDevice {
  const one = parsed as {
    manufacturer: string; model: string | null; deviceType: number; globalDeviceId: number;
    codeset?: string | null;
  };
  return {
    manufacturer: one.manufacturer, model: one.model ?? null, deviceType: one.deviceType,
    globalDeviceId: one.globalDeviceId,
    // `== null` deliberately, since the archive states both spellings across its own files and the
    // declared type promises the field is absent when there are no codes. Omitting rather than
    // passing the null through is what makes `codeset ?? fail(...)` and `codeset!` behave as the
    // callers here already assume they do.
    ...(one.codeset === undefined || one.codeset === null ? {} : { codeset: one.codeset }),
  };
}

/**
 * The commands of a parsed codeset file, with `pronto` left out unless asked for, `catalogueCommands` in
 * `catalogue.node.ts` says why.
 */
export function commandsOfCodeset(parsed: unknown, options: { readonly pronto?: boolean } = {}): CatalogueCommand[] {
  const codeset = parsed as {
    commands?: { keycode: string; name: string; pronto?: string }[];
  };
  return (codeset.commands ?? []).map((one) => ({
    name: one.name, keycode: one.keycode,
    ...(options.pronto === true && one.pronto !== undefined ? { pronto: one.pronto } : {}),
  }));
}

/** How a code number is keyed: lower case hexadecimal with no leading zeroes.
 *
 * **The normalisation is load bearing.** Logitech pads a keycode's number to a whole number of nibbles
 * and our decoder does not, so a Sony frame is `70` here and `070` there, which is the same code. That
 * exact mistake was made once already when comparing our decoding against their analyser, section 159. */
export function codeKey(hex: string): string {
  return BigInt(`0x${hex}`).toString(16);
}

/** What an identification found: the codeset, how many of the asked for numbers it holds, and the margin. */
export interface Identification {
  readonly codeset: string;
  /** How many of the group's numbers this codeset holds. */
  readonly hits: number;
  /** How many the next best codeset holds, which is what says whether the answer is a single one. */
  readonly runnerUp: number;
  readonly of: number;
}

/**
 * Which codeset a set of code numbers came from, ranked.
 *
 * **The margin is the point, not the winner.** Logitech's catalogue holds families of near identical
 * codesets, one per model of a range, so a device that matches 108 of 108 will often have a runner up at
 * 105: the answer is a **model range** rather than a single model, and a caller that reads only the top
 * entry will report a precision the data does not have. Hence `runnerUp` sits in the result rather than
 * being filtered out here.
 */
export function identifyCodeset(
  index: ReadonlyMap<string, string[]>, values: readonly string[],
): Identification | undefined {
  const score = new Map<string, number>();
  for (const value of values) {
    for (const at of index.get(value) ?? []) score.set(at, (score.get(at) ?? 0) + 1);
  }
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const best = ranked[0];
  if (best === undefined) return undefined;
  return { codeset: best[0], hits: best[1], runnerUp: ranked[1]?.[1] ?? 0, of: values.length };
}
