/**
 * Reading Logitech's device catalogue out of the Harmony infrared archive.
 *
 * **What this is for.** Two gaps close here at once, and neither is about pulses. Picking a device from
 * a catalogue needed Logitech's live service, which answers today and will not one day; and knowing
 * **which command a stored code is** needed the button map service, which two test accounts had told us
 * about 1200 commands' worth. The archive holds 276236 devices from 7889 manufacturers, 257720 of them
 * with codes, and every command in it carries a name beside its code. `packages/codec/src/archive.ts`
 * reads the protocol half of the same checkout; this reads the device half.
 *
 * **The keycode is character for character what the live service returns**, `G:Toshiba 32 Bit:(0x20DF9E61)(Repeat)():3`,
 * so `statedCode` parses it with no adapter and the archive is a drop-in for the live device fetch.
 *
 * **Decision 15 in `docs/roadmap.md` governs what may cross.** Names and durations come through our own
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
 * **Every reader here is lazy except `codeIndex`**, which is a full pass over the codesets and says so.
 * The catalogue is 2.2 GB, so a reader that loads it whole is a reader nobody can use inside an
 * application.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ArchiveError, archiveManifest } from './archive.ts';

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
   * `docs/myharmony/model.json`, which is serialised alphabetically, so its index 1 is `Default` and
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

/** Every manufacturer in the catalogue, in the archive's own order, which is by display name. */
export function catalogueManufacturers(root: string): CatalogueManufacturer[] {
  archiveManifest(root);
  const path = join(root, 'index.json');
  if (!existsSync(path)) throw new ArchiveError(`no index.json in ${root}`);
  const rows = JSON.parse(readFileSync(path, 'utf8')) as { c: number; n: string; s: string }[];
  return rows.map((one) => ({ name: one.n, slug: one.s, devices: one.c }));
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
  // `m` is null on three rows of the whole archive, so the cast says so rather than the interface
  // carrying the lie: a cast is where a reader decides what it believes about somebody else's data.
  type Row = { f: string; id: number; m: string | null };
  const rows = JSON.parse(readFileSync(path, 'utf8')) as Row[];
  return rows.map((one) => ({ model: one.m ?? null, file: one.f, globalDeviceId: one.id }));
}

/** One device by its manufacturer slug and its file name, as `catalogueModels` gives them. */
export function catalogueDevice(root: string, slug: string, file: string): CatalogueDevice {
  const path = join(root, 'devices', slug, file.endsWith('.json') ? file : `${file}.json`);
  if (!existsSync(path)) throw new ArchiveError(`no such device: ${slug}/${file}`);
  const one = JSON.parse(readFileSync(path, 'utf8')) as {
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
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
    commands?: { keycode: string; name: string; pronto?: string }[];
  };
  return (parsed.commands ?? []).map((one) => ({
    name: one.name, keycode: one.keycode,
    ...(options.pronto === true && one.pronto !== undefined ? { pronto: one.pronto } : {}),
  }));
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
