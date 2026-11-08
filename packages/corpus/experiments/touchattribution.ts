/**
 * **Which generator wrote each field of a Harmony Touch set built from nothing**, found by running the generators
 * again rather than by reading a table: `todo-touch.md` 9.3.
 *
 * **What 9.3 asks.** 9.1 built the whole test setup from `packages/corpus/setups/touch-test.json`, the archive of the
 * catalogue through our readers, our rhythm table, the lab's description of the account and a picture drawn by us,
 * `withNothing` in `touchnothingset.ts`, and its codec headers state per field which generator writes it. A table in a
 * header is a claim with no test behind it. So this walks every field of every document and picture of a built set
 * and names the generator that wrote it **by reproducing each generator's output on its own**, and a field no
 * generator reproduces is reported as carried from a Logitech document, when 8.6's set, Logitech's documents under
 * tags of ours, holds the same value in the same field, or as unattributed.
 *
 * **How a generator is told from the code.** Each step of `buildTouchDocuments` is run again by itself, on the same
 * inputs, and a field is credited to the latest step whose own output holds that value at that place:
 *
 * * **the device records**: `catalogueOfArchive` alone, each record as `deviceRecordOfArchive` writes it; inside it the
 *   features as `featuresOfDriving` writes them from `catalogueDriving`, and each command's key code as `keyCodeText`
 *   writes it from `statedCode` into our definition, each run again here from the archive;
 * * **what the composer writes over a record**, found by composing the same devices onto **skeleton records**, each
 *   holding only what the composer finds a record by (its maker and model, each feature's kind and the field naming its
 *   device, each command's name and protocol id): a field the composer's output holds there with a value the skeleton
 *   did not hold is the composer's own, `composeTouchSetup`. Everything else on a device came from the record;
 * * **the account's favourites address and key**: the fields where `buildTouchDocuments`'s device list differs from
 *   the same setup composed onto the catalogue as the archive gives it, each value the account file's;
 * * **the definitions**: `catalogueOfArchive`'s, matched by protocol id, each `definitionOfRow` over our table's row;
 * * **the device maps**: the setup composed with its devices alone, `composeButtons` inside `composeTouchSetup`; and
 *   **the activities and their maps**: what composing the activities adds, `composeTouchActivity` and
 *   `withTouchActivity`;
 * * **Context**: `contextOfAccount` over the account file; **Settings**: `settingsOfSetupFile` over the setup file, its
 *   two background names and its picture store the values `ourBackground` and `OUR_PICTURE_STORE` give;
 * * **the two pictures**: `ourBackground`'s drawings, byte for byte;
 * * **each answer's envelope**: its address the account file's (or `ourBackground`'s for a picture), its body type
 *   `withNothing`'s, its tag `ourTag` of its body.
 *
 * **What a field is.** Every leaf of a document's JSON, a value that is not an object or a list, plus every empty
 * object and empty list, by its path with list places; a picture is one field, its bytes. **The inputs themselves**,
 * that the build reads no file but the archive's, is held by the test, `touch-attribution.test.ts`, by watching the
 * file system while the set is built.
 *
 * Nothing here opens a remote. **Which architectures**: the Harmony Touch alone, firmware 4.15.330; its firmware reports
 * 17 and Logitech's templates file it under 18.
 */
import { catalogueCommands, catalogueDevice, catalogueDriving, statedCode, archiveAt } from '@harmony/codec/node';
import { harmonyTouch } from '@harmony/codec/build';

import { NOTHING_DOCUMENTS, type TouchAccountFile } from './touchnothingset.ts';
import { keyOf, ourTag, type SetAnswer, type TouchSet } from '../src/touchsync.ts';

type Json = Record<string, unknown>;
const isRecord = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x);
const copyOf = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** The generators a field of a set from nothing may be credited to, each a function of the codec or the answerer. */
export const GENERATORS = [
  'deviceRecordOfArchive', 'featuresOfDriving', 'keyCodeText', 'composeTouchSetup', 'buildTouchDocuments',
  'definitionOfRow', 'composeButtons', 'composeTouchActivity', 'contextOfAccount', 'settingsOfSetupFile',
  'ourBackground', 'withNothing', 'ourTag',
] as const;
export type Generator = typeof GENERATORS[number];
/** What a field no generator reproduces is: a Logitech document's value in the same field, or nothing found. */
export type Unattributed = 'carried from a Logitech document' | 'unattributed';

/** One field of a set and who wrote it. */
export interface AttributedField {
  /** The document by its key, `the background` or `the background's twin` for a picture. */
  readonly document: string;
  /** Inside an answer: `resource` and the path, or `uri`, `body-type` or `etag`. */
  readonly path: string;
  /** The path with its list places taken out, what a report groups by. */
  readonly field: string;
  readonly by: Generator | Unattributed;
}

/** One leaf: its path, with list places, and its value. */
interface Leaf {
  readonly path: string;
  readonly value: unknown;
}

/** Every leaf of a value, an empty object or list counted as one. */
export function leavesOf(value: unknown, path = ''): Leaf[] {
  if (Array.isArray(value)) {
    if (value.length === 0) return [{ path, value }];
    return value.flatMap((x, i) => leavesOf(x, `${path}[${i}]`));
  }
  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return [{ path, value }];
    return keys.flatMap((k) => leavesOf(value[k], path === '' ? k : `${path}.${k}`));
  }
  return [{ path, value }];
}

/** The value at a path `leavesOf` wrote, or `undefined` where the path does not exist. */
function at(value: unknown, path: string): { readonly found: boolean; readonly value?: unknown } {
  if (path === '') return { found: true, value };
  let x: unknown = value;
  for (const part of path.match(/[^.[\]]+|\[\d+\]/g) ?? []) {
    if (part.startsWith('[')) {
      if (!Array.isArray(x)) return { found: false };
      const i = Number(part.slice(1, -1));
      if (i >= x.length) return { found: false };
      x = x[i];
    } else {
      if (!isRecord(x) || !(part in x)) return { found: false };
      x = x[part];
    }
  }
  return { found: true, value: x };
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
/** Whether `layer` holds `value` at `path`. */
const holds = (layer: unknown, path: string, value: unknown): boolean => {
  const found = at(layer, path);
  return found.found && same(found.value, value);
};
const fieldOf = (path: string): string => path.replace(/\[\d+\]/g, '[]');

/** What a set from nothing was built from, as `withNothing` takes it. */
export interface NothingInputs {
  readonly file: unknown;
  readonly archive: string;
  readonly account: TouchAccountFile;
}

/** Each generator's own output, computed again from the inputs, in the documents' shape where a document is meant. */
export interface Layers {
  /** `catalogueOfArchive`: the device list as the records `deviceRecordOfArchive` writes, in the setup's order. */
  readonly records: readonly harmonyTouch.DeviceWithFeatures[];
  /** Per device, the features `featuresOfDriving` writes from the archive's driving. */
  readonly features: harmonyTouch.DeviceFeature[][];
  /** Per device, each command's key code as `keyCodeText` writes it into our definition of its family. */
  readonly keyCodes: (string | undefined)[][];
  /** The skeleton each record was reduced to, and the devices the composer wrote onto them. */
  readonly skeletons: Json[];
  readonly composedOnSkeletons: harmonyTouch.DeviceWithFeatures[];
  /** The definitions `catalogueOfArchive` gives, each `definitionOfRow`'s. */
  readonly protocols: readonly harmonyTouch.IrProtocol[];
  /** The setup composed with its devices alone, and whole, onto the catalogue as the archive gives it. */
  readonly devicesOnly: harmonyTouch.SyncDocuments;
  readonly whole: harmonyTouch.SyncDocuments;
  readonly context: harmonyTouch.Context;
  readonly settings: harmonyTouch.Settings;
  readonly background: harmonyTouch.OurBackground;
}

/** A record reduced to what `composeTouchSetup` finds a record by and writes into. */
function skeletonOf(record: harmonyTouch.DeviceWithFeatures): Json {
  return {
    Device: { Manufacturer: record.Device.Manufacturer, Model: record.Device.Model },
    DeviceFeatures: (record.DeviceFeatures ?? []).map((f) => ({ __type: (f as Json)['__type'], ...('DeviceId-' in f ? { 'DeviceId-': null } : {}) })),
    Commands: (record.Commands ?? []).map((c) => ({ Name: c.Name, ProtocolId: c.ProtocolId })),
  };
}

/** Every generator run again on the inputs, each by itself. */
export function layersOf(inputs: NothingInputs): Layers {
  const file = harmonyTouch.readTouchSetupFile(inputs.file);
  const catalogue = harmonyTouch.catalogueOfArchive(file, archiveAt(inputs.archive));
  const setup = harmonyTouch.setupOfSetupFile(file, catalogue);
  const features: harmonyTouch.DeviceFeature[][] = [];
  const keyCodes: (string | undefined)[][] = [];
  for (const [i, r] of file.devices.entries()) {
    const slash = r.device.indexOf('/');
    const slug = r.device.slice(0, slash);
    const entry = r.device.slice(slash + 1);
    const record = catalogue.devices[i]!;
    // The spelling the record's own steps use: a command's name as its command list spells it, `deviceRecordOfArchive`.
    const spelling = new Map((record.Commands ?? []).map((c) => [c.Name.toLowerCase(), c.Name]));
    features.push(harmonyTouch.featuresOfDriving(catalogueDriving(inputs.archive, slug, entry), Number(record.Device['Id-']), (n) => spelling.get(n.toLowerCase()) ?? n));
    const found = catalogueDevice(inputs.archive, slug, entry);
    keyCodes.push(catalogueCommands(inputs.archive, found.codeset!).map((c) => {
      const code = statedCode(c.keycode);
      const pid = code === undefined ? undefined : file.touch.protocols[code.family];
      const definition = catalogue.protocols.find((p) => p['Id-'] === pid);
      if (code === undefined || definition === undefined) return undefined;
      const text = harmonyTouch.keyCodeText(code, definition);
      return typeof text === 'string' ? text : undefined;
    }));
  }
  const skeletons = catalogue.devices.map(skeletonOf);
  const devicesAlone: harmonyTouch.TouchSetup = { devices: setup.devices, activities: [] };
  const onSkeletons = harmonyTouch.composeTouchSetup(harmonyTouch.emptyTouchLists(), devicesAlone,
    { devices: skeletons as unknown as harmonyTouch.DeviceWithFeatures[], protocols: catalogue.protocols });
  return {
    records: catalogue.devices,
    features,
    keyCodes,
    skeletons,
    composedOnSkeletons: (onSkeletons.DeviceList as { DevicesWithFeatures: harmonyTouch.DeviceWithFeatures[] }).DevicesWithFeatures,
    protocols: catalogue.protocols,
    devicesOnly: harmonyTouch.composeTouchSetup(harmonyTouch.emptyTouchLists(), devicesAlone, catalogue),
    whole: harmonyTouch.composeTouchSetup(harmonyTouch.emptyTouchLists(), setup, catalogue),
    context: harmonyTouch.contextOfAccount(inputs.account),
    settings: harmonyTouch.settingsOfSetupFile(file),
    background: harmonyTouch.ourBackground(),
  };
}

/** A device list field's path split into the device's place and the rest, or none for a field outside a device. */
function devicePath(path: string): { readonly device: number; readonly rest: string } | undefined {
  const m = /^DevicesWithFeatures\[(\d+)\](?:\.(.*))?$/.exec(path);
  return m === null ? undefined : { device: Number(m[1]), rest: m[2] ?? '' };
}

/** The generator of one field of the device list, or none. */
function deviceListField(layers: Layers, account: TouchAccountFile, path: string, value: unknown): Generator | undefined {
  const d = devicePath(path);
  if (d === undefined) return undefined;
  // The account's step: a field the setup composed onto the archive's catalogue does not hold so, holding the
  // account's favourites address or key.
  if (!holds(layers.whole.DeviceList, path, value)) {
    const tuning = account.tuning;
    return tuning !== undefined && /^Device\.(DeviceProfileUri|ContentProfileKey)$/.test(d.rest) && (same(value, tuning.DeviceProfileUri) || same(value, tuning.ContentProfileKey))
      ? 'buildTouchDocuments' : undefined;
  }
  // The composer's own: held on the skeleton's composed device with a value the skeleton did not hold.
  const skeleton = layers.skeletons[d.device];
  if (holds(layers.composedOnSkeletons[d.device], d.rest, value) && !holds(skeleton, d.rest, value)) return 'composeTouchSetup';
  const record = layers.records[d.device];
  const command = /^Commands\[(\d+)\]\.KeyCode$/.exec(d.rest);
  if (command !== null && layers.keyCodes[d.device]?.[Number(command[1])] === value && holds(record, d.rest, value)) return 'keyCodeText';
  const feature = /^DeviceFeatures(\[\d+\].*)$/.exec(d.rest);
  if (feature !== null && holds(layers.features[d.device], feature[1]!, value) && holds(record, d.rest, value)) return 'featuresOfDriving';
  if (holds(record, d.rest, value)) return 'deviceRecordOfArchive';
  return undefined;
}

/** The generator of one field of a document of the set, or none. */
function documentField(layers: Layers, account: TouchAccountFile, document: string, path: string, value: unknown): Generator | undefined {
  switch (document) {
    case 'DeviceList':
      return deviceListField(layers, account, path, value);
    case 'MapList':
      if (holds(layers.devicesOnly.MapList, path, value)) return 'composeButtons';
      return holds(layers.whole.MapList, path, value) ? 'composeTouchActivity' : undefined;
    case 'ActivityList':
      return holds(layers.whole.ActivityList, path, value) ? 'composeTouchActivity' : undefined;
    case 'Context':
      return holds(layers.context, path, value) ? 'contextOfAccount' : undefined;
    case 'Settings': {
      if (!holds(layers.settings, path, value)) return undefined;
      return value === layers.background.name || value === harmonyTouch.OUR_PICTURE_STORE ? 'ourBackground' : 'settingsOfSetupFile';
    }
    default:
      return undefined;
  }
}

/** The definition of the set at a place, matched to `catalogueOfArchive`'s by its protocol id. */
function protocolField(layers: Layers, resource: unknown, path: string, value: unknown): Generator | undefined {
  const m = /^Protocols\[(\d+)\](?:\.(.*))?$/.exec(path);
  if (m === null) return undefined;
  const ours = at(resource, `Protocols[${m[1]}]`).value as Json | undefined;
  const definition = layers.protocols.find((p) => ours !== undefined && p['Id-'] === ours['Id-']);
  return definition !== undefined && holds(definition, m[2] ?? '', value) ? 'definitionOfRow' : undefined;
}

/** Every value Logitech's documents hold, by field: a set's six documents, the fields with their list places out. */
function logitechValues(logitech: TouchSet): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const a of logitech.answers) {
    if (a['body-type'] !== 'application/json') continue;
    for (const l of leavesOf(a.resource)) {
      const key = `${keyOf(a.uri)} ${fieldOf(l.path)}`;
      if (!out.has(key)) out.set(key, new Set());
      out.get(key)!.add(JSON.stringify(l.value));
    }
  }
  return out;
}

/**
 * **Every field of `set` and who wrote it.** `logitech` is the set a field no generator reproduces is looked up in:
 * 8.6's, Logitech's documents.
 */
export function attributeNothingSet(set: TouchSet, inputs: NothingInputs, logitech: TouchSet, layers: Layers = layersOf(inputs)): AttributedField[] {
  const theirs = logitechValues(logitech);
  const out: AttributedField[] = [];
  const pictures: Readonly<Record<string, { readonly name: string; readonly bytes: Uint8Array }>> = {
    [layers.background.addresses.picture]: { name: 'the background', bytes: layers.background.picture },
    [layers.background.addresses.twin]: { name: 'the background\'s twin', bytes: layers.background.twin },
  };
  const add = (document: string, path: string, by: Generator | undefined, value: unknown): void => {
    const field = fieldOf(path);
    const carried = by === undefined && theirs.get(`${document} ${field.replace(/^resource\./, '')}`)?.has(JSON.stringify(value)) === true;
    out.push({ document, path, field, by: by ?? (carried ? 'carried from a Logitech document' : 'unattributed') });
  };
  for (const a of set.answers as readonly SetAnswer[]) {
    const picture = pictures[a.uri];
    const isDocument = a['body-type'] === 'application/json' && NOTHING_DOCUMENTS.includes(keyOf(a.uri));
    const document = picture?.name ?? keyOf(a.uri);
    // The envelope: the address, the body's type and the tag.
    add(document, 'uri', isDocument ? (inputs.account.addresses[document] === a.uri ? 'withNothing' : undefined) : picture !== undefined ? 'ourBackground' : undefined, a.uri);
    add(document, 'body-type', (isDocument && a['body-type'] === 'application/json') || (picture !== undefined && a['body-type'] === 'image/png') ? 'withNothing' : undefined, a['body-type']);
    add(document, 'etag', a.etag === ourTag(a) ? 'ourTag' : undefined, a.etag);
    if (picture !== undefined) {
      add(document, 'resource', a.resource === Buffer.from(picture.bytes).toString('base64') ? 'ourBackground' : undefined, a.resource);
      continue;
    }
    for (const l of leavesOf(a.resource)) {
      const by = !isDocument ? undefined
        : document === 'ProtocolList' ? protocolField(layers, a.resource, l.path, l.value)
          : documentField(layers, inputs.account, document, l.path, l.value);
      add(document, `resource.${l.path}`, by, l.value);
    }
  }
  return out;
}

/** The counts of an attribution, per document and per generator, in the set's order and `GENERATORS`' order. */
export function attributionCounts(fields: readonly AttributedField[]): { readonly document: string; readonly by: string; readonly fields: number }[] {
  const order = [...GENERATORS, 'carried from a Logitech document', 'unattributed'] as string[];
  const documents = [...new Set(fields.map((f) => f.document))];
  const out: { document: string; by: string; fields: number }[] = [];
  for (const document of documents) {
    for (const by of order) {
      const n = fields.filter((f) => f.document === document && f.by === by).length;
      if (n > 0) out.push({ document, by, fields: n });
    }
  }
  return out;
}

/** The lines a report prints: per document its total, then each generator's count; never a value. */
export function attributionLines(fields: readonly AttributedField[]): string[] {
  const counts = attributionCounts(fields);
  const out: string[] = [];
  for (const document of [...new Set(counts.map((c) => c.document))]) {
    const mine = counts.filter((c) => c.document === document);
    out.push(`${document}: ${mine.reduce((n, c) => n + c.fields, 0)} fields`);
    for (const c of mine) out.push(`  ${c.by}: ${c.fields}`);
  }
  return out;
}

/**
 * A copy of a set with one field of one document replaced or added, for a control, and that answer's tag made `ourTag`
 * of its new body, so the field is the only thing that differs; the field's parent must exist.
 */
export function withField(set: TouchSet, document: string, path: string, value: unknown): TouchSet {
  const answers = set.answers.map((a) => {
    if (keyOf(a.uri) !== document) return a;
    const resource = copyOf(a.resource) as Json;
    const parts = path.match(/[^.[\]]+|\[\d+\]/g) ?? [];
    let x: unknown = resource;
    for (const part of parts.slice(0, -1)) x = part.startsWith('[') ? (x as unknown[])[Number(part.slice(1, -1))] : (x as Json)[part];
    const last = parts.at(-1)!;
    if (last.startsWith('[')) (x as unknown[])[Number(last.slice(1, -1))] = value;
    else (x as Json)[last] = value;
    const body = { 'body-type': a['body-type'], resource };
    return { ...a, resource, etag: ourTag(body) };
  });
  return { answers };
}
