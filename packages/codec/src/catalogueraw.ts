/**
 * The raw capture behind the infrared archive: the fields the archive drops, and one device fetched
 * without reading the whole capture.
 *
 * **What this is for.** The archive (`catalogue.ts`, `driving.ts`) is its author's projection of
 * Logitech's service replies, and the replies themselves are a release asset of the archive, kept in
 * the lab at `work/ir-archive-raw/`. Three things the composers need exist only there, section 321:
 * whether a state step **sends** its code or only **records** that the device is now in that state
 * (`DevActionType` 2 or 1, the second compiled behind the silent flag), the number Logitech gives each
 * input (`InputOrder`, which is how the compiler numbers an input variable's values), and the mark on
 * an input that waits for a connected app (`IsOnline`). This module reads those three out of a small
 * side file that `make catalogue-raw` derives in one pass over the capture, and attaches them to the
 * archive's reading of a device, so a caller asks one question and gets both, each marked by source.
 *
 * **TOKEN RULE, for any agent or person reading the raw capture: never print a raw line or a whole
 * device.** One line of `device_features_raw.jsonl` can be 130 KB, about 35000 tokens, and the file is
 * 5.5 GB unpacked. Print the fields you need and nothing else; `rawCaptureDevice` hands back a parsed
 * object precisely so that a caller picks fields out of it rather than echoing it.
 *
 * **The side file is in the archive's coordinates, not the capture's**, which is the design decision
 * to understand before changing anything here. A field hangs off an input, by its position in the
 * archive's `inputs.list`, or off a step, by its path in the archive's reading (`drivingLists`). The
 * capture's own coordinates do not survive the projection: state values arrive one entry per route and
 * are grouped by name, repeated routes are dropped, and every list is sorted on `Order`. So the
 * derivation projects each raw list the way the archive does, compares it with the archive's list at
 * the same path, and **attaches a field only where the two agree step for step**. A list where they
 * disagree is named in the device's `unaligned` set and nothing is attached under it, rather than a
 * field landing on the wrong step. That comparison is also item 1.4's measurement, that every list is
 * in `Order` sequence, section 305.
 *
 * **Adding a field is one entry in `RAW_FIELDS`**: its name, the raw key, what it hangs off, and the
 * value it takes on most records, which is left out of the side file so that the file stays small.
 * Rebuild with `make catalogue-raw` afterwards; the manifest records the field list, and the reader
 * refuses a side file built with a different one.
 *
 * **Staleness fails loudly.** The manifest records the SHA-256 of the capture it was derived from and
 * the archive build it was aligned against. `rawDerivedState` compares the first with the lab's
 * `SHA256SUMS` and `catalogueRules` refuses to attach anything from a side file that disagrees with
 * either, so a newer release downloaded and not yet derived cannot hand back the old release's flags.
 *
 * **The single device fetch** is `rawCaptureDevice`: the derivation re-compresses the capture as a
 * series of independent gzip members of `RAW_BLOCK_LINES` lines each and writes an index of every
 * device's member, so one device costs one seek and one small decompression rather than a 329 MB scan.
 *
 * Decisions 15 and 11 apply as they do to the archive's readers: this is Logitech's data, it crosses
 * into this repository only through readers like this one, and nothing read here may be shared through
 * a community device database. The derived files live in the lab, never here.
 */
import { closeSync, existsSync, openSync, readFileSync, readSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { ArchiveError, archiveManifest } from './archive.ts';
import { catalogueDevice } from './catalogue.ts';
import { catalogueDriving, type DeviceDriving, type DriveStep } from './driving.ts';

/** The capture's own file names, as the release publishes them. */
export const RAW_FEATURES_FILE = 'device_features_raw.jsonl.gz';
export const RAW_SUMS_FILE = 'SHA256SUMS';
/** Where the derived files go, inside the capture's directory, so they travel with what they describe. */
export const RAW_DERIVED_DIRECTORY = 'derived';
export const RAW_BLOCKS_FILE = 'ir-raw-features.blocks.gz';
export const RAW_INDEX_FILE = 'ir-raw-index.bin';
export const RAW_FIELDS_FILE = 'ir-raw-fields.json.gz';
export const RAW_MANIFEST_FILE = 'ir-raw-manifest.json';
/** Lines per gzip member of the seekable copy: a lookup decompresses at most this many devices. */
export const RAW_BLOCK_LINES = 16;
/** The index's magic and its fixed record width: id, line in block, offset as a double, length. */
export const RAW_INDEX_MAGIC = 'HRX1';
export const RAW_INDEX_HEADER = 8;
export const RAW_INDEX_ENTRY = 20;
/** Bumped when the side file's layout changes, so an old one is refused rather than misread. */
export const RAW_FIELDS_FORMAT = 1;

/** A scalar as the service states it. */
export type RawValue = number | boolean | string | null;

/** One field the archive drops, and how it is stored. */
export interface RawField {
  /** Our name for it, the key in the side file and in `catalogueRules`'s answer. */
  readonly name: string;
  /** Logitech's key, on the raw input object or the raw action object. */
  readonly raw: string;
  /** What it hangs off: an input of `inputs.list`, or a step of one of `drivingLists`'s lists. */
  readonly anchor: 'input' | 'step';
  /** For a step field, which step kinds carry it; the others are not given the field at all. */
  readonly kinds?: readonly DriveStep['kind'][];
  /**
   * The value it holds on most records, given the position of what it hangs off. A value equal to it is
   * left out of the side file and put back by the reader, which is what keeps the file small: 191850 of
   * 193647 state steps in the capture's inputs send, so storing the sending ones would be 99% of it.
   */
  readonly usual: (at: number) => RawValue;
  /** What it means, for the manifest and for whoever reads the answer. */
  readonly meaning: string;
}

/**
 * **The one list to extend.** Each entry is a field the archive drops that code here uses.
 */
export const RAW_FIELDS: readonly RawField[] = [
  {
    name: 'devActionType', raw: 'DevActionType', anchor: 'step', kinds: ['state'], usual: () => 2,
    meaning: '2: the state step sends its code; 1: it only records the state, compiled behind the silent '
      + 'flag of section 74. Section 321.',
  },
  {
    name: 'inputOrder', raw: 'InputOrder', anchor: 'input', usual: (at) => at + 1,
    meaning: 'Logitech\'s number for the input, which is how the compiler numbers the input variable\'s '
      + 'values; the archive keeps the array order instead. Section 321.',
  },
  {
    name: 'online', raw: 'IsOnline', anchor: 'input', usual: () => false,
    meaning: 'the input waits for the device\'s connected app before its commands. Section 321.',
  },
];

/** One action as the service states it, with only the keys anything here reads. */
export interface RawAction {
  readonly __type: string;
  readonly Order?: number | null;
  readonly IRCommandName?: string;
  readonly Duration?: number | null;
  readonly StateName?: string;
  readonly StateValue?: string;
  readonly Delay?: number;
  readonly [key: string]: unknown;
}

type RawObject = Readonly<Record<string, unknown>>;

/** One parsed line of the capture. Only `id` and `features` are read; the rest is left alone. */
export interface RawDeviceRecord {
  readonly id: number;
  readonly ok?: boolean;
  readonly features?: readonly RawObject[] | null;
  readonly [key: string]: unknown;
}

/**
 * One raw step as the archive projects it, the five shapes onto four kinds of `driving.ts`. A press with
 * a duration of 0 is a plain press there, so it is here.
 */
export function rawStep(one: RawAction): DriveStep {
  const kind = one.__type.split(':')[0];
  if (kind === 'IRPressAction') {
    if (one.IRCommandName === undefined) throw new ArchiveError(`a press with no command`);
    return one.Duration ? { kind: 'send', command: one.IRCommandName, holdMs: one.Duration }
      : { kind: 'send', command: one.IRCommandName };
  }
  if (kind === 'IRDevAction') return { kind: 'state', state: String(one.StateName), value: String(one.StateValue) };
  if (kind === 'IRDelayAction') return { kind: 'wait', ms: Number(one.Delay) };
  if (kind === 'IRHoldAction') return { kind: 'hold', command: String(one.IRCommandName) };
  throw new ArchiveError(`unknown action ${one.__type}`);
}

/** A list's actions in execution order, which is `Order` and not array position. Stable, so ties keep it. */
export function inOrder(actions: readonly RawAction[]): RawAction[] {
  return [...actions].sort((a, b) => (a.Order ?? 0) - (b.Order ?? 0));
}

/** One action list at its path in the archive's reading of a device. */
export interface DrivingList {
  /** `power.on`, `inputs.list[3].commands`, `states["TVInput"].values[2].select[0]` and so on. */
  readonly path: string;
  readonly steps: readonly DriveStep[];
  /** A state value's route states which way it is reached, `setType`; no other list does. */
  readonly setType?: number;
}

/** Which family a path belongs to, for counting: the four item 1.4 is about, and the rest. */
export type ListFamily = 'device' | 'input' | 'stateList' | 'stateRoute';

export function listFamily(path: string): ListFamily {
  if (path.startsWith('inputs.list[')) return 'input';
  if (path.startsWith('states[')) return path.includes('.select[') ? 'stateRoute' : 'stateList';
  return 'device';
}

/** The path of a state, quoted, since a state name is Logitech's free text. */
function statePath(name: string): string {
  return `states[${JSON.stringify(name)}]`;
}

const DEVICE_LISTS = ['next', 'previous', 'start', 'finish'] as const;

/**
 * Every non empty action list of the archive's reading of a device, by path, in the record's order. A
 * step's path is its list's path and its index, `power.onReset[0]`, which is how `catalogueRules`
 * addresses a step field.
 */
export function drivingLists(driving: DeviceDriving): DrivingList[] {
  const out: DrivingList[] = [];
  const add = (path: string, steps: readonly DriveStep[] | undefined, setType?: number): void => {
    if (steps !== undefined && steps.length > 0) out.push({ path, steps, ...(setType === undefined ? {} : { setType }) });
  };
  const power = driving.power;
  if (power !== undefined) {
    add('power.on', power.on); add('power.off', power.off);
    add('power.toggle', power.toggle); add('power.onReset', power.onReset);
  }
  const inputs = driving.inputs;
  if (inputs !== undefined) {
    for (const key of DEVICE_LISTS) add(`inputs.${key}`, inputs[key]);
    inputs.list?.forEach((one, at) => add(`inputs.list[${at}].commands`, one.commands));
  }
  const tuning = driving.channelTuning;
  if (tuning !== undefined) {
    add('channelTuning.start', tuning.start); add('channelTuning.finish', tuning.finish);
    add('channelTuning.greaterTen', tuning.greaterTen); add('channelTuning.greaterHundred', tuning.greaterHundred);
  }
  for (const [name, state] of driving.states ?? []) {
    for (const key of DEVICE_LISTS) add(`${statePath(name)}.${key}`, state[key]);
    state.values.forEach((value, v) => value.select?.forEach((route, r) =>
      add(`${statePath(name)}.values[${v}].select[${r}]`, route.steps, route.setType)));
  }
  return out;
}

/** One raw list projected, with the actions it came from in execution order and whether it was stored so. */
export interface RawList extends DrivingList {
  readonly actions: readonly RawAction[];
  /** The same list projected in the order the service stored it, for the comparison the other way. */
  readonly storedSteps: readonly DriveStep[];
  /** True where array position differs from `Order`, which is what item 1.4 counts. */
  readonly storedOutOfOrder: boolean;
}

/** The raw half of a device, in the archive's coordinates: its lists, its inputs and its names. */
export interface RawProjection {
  readonly lists: RawList[];
  /** The raw input objects that have a name, in array order, which is the archive's `inputs.list` order. */
  readonly inputs: readonly RawObject[];
  /** Per state, its value names in first appearance order, which is how the archive groups them. */
  readonly stateValues: ReadonlyMap<string, readonly string[]>;
  /** A feature that occurs more than once where the archive keeps one, named, so the caller refuses it. */
  readonly duplicated: readonly string[];
}

/** The service's list name against the archive's, per feature, for the lists a device states once. */
const RAW_LISTS: Readonly<Record<string, readonly [string, Readonly<Record<string, string>>]>> = {
  PowerFeature: ['power', { PowerOnActions: 'on', PowerOffActions: 'off', PowerToggleActions: 'toggle', PowerOnResetActions: 'onReset' }],
  InputFeature: ['inputs', { NextActions: 'next', PreviousActions: 'previous', StartActions: 'start', FinishActions: 'finish' }],
  ChannelTuningFeature: ['channelTuning', { StartActions: 'start', FinishActions: 'finish', GreaterTenActions: 'greaterTen', GreaterHundredActions: 'greaterHundred' }],
};
const STATE_LISTS: Readonly<Record<string, string>> = {
  NextActions: 'next', PreviousActions: 'previous', StartActions: 'start', FinishActions: 'finish',
};

function actionsOf(value: unknown): RawAction[] {
  return Array.isArray(value) ? value as RawAction[] : [];
}

/**
 * Project one raw device the way the archive does, without reading the archive: every list sorted on
 * `Order`, state values grouped by name in first appearance order, and a value's routes with a repeat of
 * an earlier route dropped. **This is a reconstruction of somebody else's converter**, so it is only
 * trusted where it agrees with the archive, which is what `alignDevice` checks.
 */
export function rawProjection(record: RawDeviceRecord): RawProjection {
  const lists: RawList[] = [];
  const add = (path: string, actions: RawAction[], setType?: number): void => {
    if (actions.length === 0) return;
    const sorted = inOrder(actions);
    lists.push({
      path, steps: sorted.map(rawStep), actions: sorted, storedSteps: actions.map(rawStep),
      storedOutOfOrder: sorted.some((one, i) => one !== actions[i]),
      ...(setType === undefined ? {} : { setType }),
    });
  };
  let inputs: readonly RawObject[] = [];
  const stateValues = new Map<string, string[]>();
  const stateSeen = new Map<string, string>();
  const seen = new Set<string>();
  const duplicated: string[] = [];
  for (const feature of record.features ?? []) {
    const type = String(feature['__type']).split(':')[0]!;
    if (type === 'InternalStateFeature') {
      const name = String(feature['StateName']);
      // A state stated twice, word for word, is one state in the archive: measured once in the capture,
      // Panasonic's TX-W32D3DPL, global id 110096, `AV4Input`. Stated twice differently, it is refused.
      const text = JSON.stringify(feature);
      if (stateSeen.has(name)) { if (stateSeen.get(name) !== text) duplicated.push(statePath(name)); continue; }
      stateSeen.set(name, text);
      for (const [served, ours] of Object.entries(STATE_LISTS)) add(`${statePath(name)}.${ours}`, actionsOf(feature[served]));
      const names: string[] = [];
      const routes = new Map<string, string[]>();
      for (const value of actionsOf(feature['StateValues']) as unknown as RawObject[]) {
        const valueName = String(value['StateValueName']);
        if (!names.includes(valueName)) { names.push(valueName); routes.set(valueName, []); }
        const actions = actionsOf(value['Actions']);
        if (actions.length === 0) continue;
        const setType = Number(value['ActionSetType']);
        // A route that repeats an earlier one of the same value is dropped, as the archive's README says
        // it drops them; compared as projected, so two routes that differ only in plumbing are one.
        const key = JSON.stringify([setType, inOrder(actions).map(rawStep)]);
        const kept = routes.get(valueName)!;
        if (kept.includes(key)) continue;
        add(`${statePath(name)}.values[${names.indexOf(valueName)}].select[${kept.length}]`, actions, setType);
        kept.push(key);
      }
      stateValues.set(name, names);
      continue;
    }
    const mapping = RAW_LISTS[type];
    if (mapping === undefined) continue;
    if (seen.has(type)) { duplicated.push(mapping[0]); continue; }
    seen.add(type);
    const [block, names] = mapping;
    for (const [served, ours] of Object.entries(names)) add(`${block}.${ours}`, actionsOf(feature[served]));
    if (type === 'InputFeature') {
      // An input with no name is not in the archive's list, so the archive's positions count the named
      // ones only. Measured: 10 inputs of 1089522 have none, each the only input of its device.
      inputs = (actionsOf(feature['Inputs']) as unknown as RawObject[])
        .filter((one) => typeof one['InputName'] === 'string');
      inputs.forEach((one, at) => add(`inputs.list[${at}].commands`, actionsOf(one['Actions'])));
    }
  }
  return { lists, inputs, stateValues, duplicated };
}

/** How one list compared, for item 1.4's counts. */
export interface ListComparison {
  readonly path: string;
  readonly family: ListFamily;
  readonly storedOutOfOrder: boolean;
  /** The archive's list equals the raw one sorted on `Order`. */
  readonly matchesSorted: boolean;
  /** The archive's list equals the raw one in stored array order. */
  readonly matchesStored: boolean;
}

/** What one device's alignment found: the lists both sides hold, and the paths that do not line up. */
export interface DeviceAlignment {
  readonly compared: readonly ListComparison[];
  /** Paths where the two sides differ or only one side has a list; nothing is attached under these. */
  readonly unaligned: readonly string[];
  /** False where the input names differ by position, so no input field can be attached. */
  readonly inputsAligned: boolean;
}

function sameSteps(a: readonly DriveStep[], b: readonly DriveStep[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compare a raw device with the archive's reading of the same device, list by list. Pure: the caller
 * holds both, which is what lets a test feed it made up records.
 */
export function alignDevice(raw: RawProjection, driving: DeviceDriving): DeviceAlignment {
  const theirs = new Map(drivingLists(driving).map((one) => [one.path, one]));
  const compared: ListComparison[] = [];
  const unaligned: string[] = [...raw.duplicated];
  for (const ours of raw.lists) {
    const archived = theirs.get(ours.path);
    theirs.delete(ours.path);
    if (archived === undefined) { unaligned.push(ours.path); continue; }
    const sameType = ours.setType === archived.setType;
    const matchesSorted = sameType && sameSteps(ours.steps, archived.steps);
    compared.push({
      path: ours.path, family: listFamily(ours.path), storedOutOfOrder: ours.storedOutOfOrder, matchesSorted,
      matchesStored: sameType && sameSteps(ours.storedSteps, archived.steps),
    });
    if (!matchesSorted) unaligned.push(ours.path);
  }
  for (const path of theirs.keys()) unaligned.push(path);
  const archivedNames = driving.inputs?.list?.map((one) => one.name) ?? [];
  const rawNames = raw.inputs.map((one) => String(one['InputName']));
  const inputsAligned = JSON.stringify(archivedNames) === JSON.stringify(rawNames);
  if (!inputsAligned) unaligned.push('inputs.list');
  return { compared, unaligned, inputsAligned };
}

/** One device's entry in the side file: only what differs from each field's usual value. */
export interface RawFieldsEntry {
  /** By input position, the input fields that are not their usual value. */
  readonly i?: Readonly<Record<string, Readonly<Record<string, RawValue>>>>;
  /** By step path, the step fields that are not their usual value. */
  readonly s?: Readonly<Record<string, Readonly<Record<string, RawValue>>>>;
  /** Paths where nothing was attached, because the raw list and the archive's differ. */
  readonly u?: readonly string[];
}

function scalar(value: unknown): RawValue {
  if (value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value;
  throw new ArchiveError(`a raw field holds ${typeof value}, not a scalar`);
}

/** Whether a step path lies under one of the unaligned list paths. */
function under(path: string, unaligned: readonly string[]): boolean {
  return unaligned.some((one) => path === one || path.startsWith(`${one}[`) || path.startsWith(`${one}.`));
}

/**
 * The side file entry for one device, from its projection and its alignment, or undefined when every
 * field holds its usual value and every list lined up, which is most devices.
 */
export function rawFieldsEntry(raw: RawProjection, alignment: DeviceAlignment): RawFieldsEntry | undefined {
  const inputs: Record<string, Record<string, RawValue>> = {};
  const steps: Record<string, Record<string, RawValue>> = {};
  if (alignment.inputsAligned) {
    raw.inputs.forEach((one, at) => {
      for (const field of RAW_FIELDS) {
        if (field.anchor !== 'input') continue;
        const value = scalar(one[field.raw] ?? null);
        if (value !== field.usual(at)) (inputs[String(at)] ??= {})[field.name] = value;
      }
    });
  }
  for (const list of raw.lists) {
    if (under(list.path, alignment.unaligned)) continue;
    list.actions.forEach((action, at) => {
      const step = list.steps[at]!;
      for (const field of RAW_FIELDS) {
        if (field.anchor !== 'step' || (field.kinds !== undefined && !field.kinds.includes(step.kind))) continue;
        const value = scalar(action[field.raw] ?? null);
        if (value !== field.usual(at)) (steps[`${list.path}[${at}]`] ??= {})[field.name] = value;
      }
    });
  }
  const entry: RawFieldsEntry = {
    ...(Object.keys(inputs).length > 0 ? { i: inputs } : {}),
    ...(Object.keys(steps).length > 0 ? { s: steps } : {}),
    ...(alignment.unaligned.length > 0 ? { u: alignment.unaligned } : {}),
  };
  return Object.keys(entry).length > 0 ? entry : undefined;
}

/** What `make catalogue-raw` records about a derivation, beside the files. */
export interface RawManifest {
  readonly format: number;
  /** The capture the files were derived from: its file name, SHA-256 and release tag where known. */
  readonly source: { readonly file: string; readonly sha256: string; readonly release?: string };
  /** The archive build the side file was aligned against, `generated` from its manifest, and its commit. */
  readonly archive: { readonly generated: string; readonly commit?: string };
  /** The field names, in `RAW_FIELDS` order, so a side file built with another list is refused. */
  readonly fields: readonly string[];
  readonly devices: number;
  readonly blockLines: number;
  /** Anything else the derivation measured: sizes, counts, timings. Informational. */
  readonly measured?: Readonly<Record<string, unknown>>;
}

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
export type RawDerivedState =
  | { readonly state: 'absent' }
  | { readonly state: 'fresh'; readonly manifest: RawManifest }
  | { readonly state: 'stale'; readonly reason: string };

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
 * **Read the token rule in this module's docstring before printing what this returns.**
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

/** The raw half of `catalogueRules`'s answer: every field of `RAW_FIELDS`, filled in, in the archive's coordinates. */
export interface RawDrivingFields {
  /** Parallel to the archive's `inputs.list`: each input's input fields. Empty when the inputs did not line up. */
  readonly inputs: readonly Readonly<Record<string, RawValue>>[];
  /** By step path, `power.onReset[0]`, every step a step field applies to, with that field's value. */
  readonly steps: ReadonlyMap<string, Readonly<Record<string, RawValue>>>;
  /** Paths where the raw list and the archive's differ, so nothing under them is attached. */
  readonly unaligned: readonly string[];
}

/** A device's driving rules from both sources, each marked as such. */
export interface CatalogueRules {
  readonly globalDeviceId: number;
  /** Source: the archive checkout, `driving.ts`. */
  readonly archive: DeviceDriving;
  /** Source: the raw capture's side file. Absent when no raw directory was given. */
  readonly raw?: RawDrivingFields;
  /** Which build of each the answer came from. */
  readonly sources: {
    readonly archive: { readonly generated: string };
    readonly raw?: { readonly sha256: string; readonly release?: string; readonly archiveGenerated: string };
  };
}

/**
 * **The one door**: a catalogue device's driving rules as the archive states them, and, given the raw
 * capture's directory, the fields the archive drops attached at the same coordinates.
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
  const entry = sideFileOf(options.raw).get(globalDeviceId) ?? {};
  const unaligned = entry.u ?? [];
  const inputs = unaligned.includes('inputs.list') ? [] : (archive.inputs?.list ?? []).map((_, at) => {
    const stored = entry.i?.[String(at)] ?? {};
    return Object.fromEntries(RAW_FIELDS.filter((one) => one.anchor === 'input')
      .map((one) => [one.name, one.name in stored ? stored[one.name]! : one.usual(at)]));
  });
  const steps = new Map<string, Record<string, RawValue>>();
  for (const list of drivingLists(archive)) {
    if (under(list.path, unaligned)) continue;
    list.steps.forEach((step, at) => {
      const path = `${list.path}[${at}]`;
      const stored = entry.s?.[path] ?? {};
      for (const field of RAW_FIELDS) {
        if (field.anchor !== 'step' || (field.kinds !== undefined && !field.kinds.includes(step.kind))) continue;
        (steps.get(path) ?? steps.set(path, {}).get(path)!)[field.name] = field.name in stored ? stored[field.name]! : field.usual(at);
      }
    });
  }
  // A stored step field on a path the archive has no step for means the coordinates moved: refuse.
  for (const path of Object.keys(entry.s ?? {})) {
    if (!steps.has(path)) throw new ArchiveError(`device ${globalDeviceId}: the side file names ${path}, which the archive has no such step for`);
  }
  return {
    globalDeviceId, archive, raw: { inputs, steps, unaligned },
    sources: {
      archive: { generated },
      raw: { sha256: manifest.source.sha256, archiveGenerated: manifest.archive.generated,
        ...(manifest.source.release === undefined ? {} : { release: manifest.source.release }) },
    },
  };
}
