/**
 * The pieces of a harvest that need no network: building the payloads, choosing a search match,
 * reading the compile's answer and splitting a batch that failed. `bin/harvest.ts` strings them together
 * with the service calls, `todo-secure-logitech.md` 1.1.
 *
 * **What a harvest is.** A list of devices out of Logitech's catalogue goes onto one disposable remote
 * record of a test account, Logitech compiles that record's configuration, the file is fetched into the
 * lab with a manifest naming every device, and the devices are removed again so the record is empty for
 * the next batch. The compile is the only way to see how their compiler lays out a device's infrared,
 * which is what `todo-process-logitech.md` works out afterwards.
 *
 * Every payload shape here was read off Logitech's own client by the lab's Python scripts that first
 * made these calls, and is documented beside them there; this module rewrites them, field for field.
 */
import { inflateRawSync } from 'node:zlib';

/**
 * Account records a harvest must never touch: the spare Harmony One's real record on the second test
 * account, and the two records on the first that the lab's cleanup has always refused. A second rail
 * backs this one: `bin/harvest.ts` refuses any record holding a device unless `--empty-record` is asked
 * for, so a real record missing from this list is never emptied by accident.
 *
 * Three records left this list on 7 October 2026, with a go-ahead to repurpose them: the first test
 * account's Harmony One record (16315365), the calibration compiles' source, whose compiles are in the
 * lab, and its Harmony 650 (16326458) and Harmony 700 (16327048) records. Their devices and activities
 * were saved to the lab's `work/harvest/records-before-repurpose/` first.
 */
export const PROTECTED_RECORDS: ReadonlySet<number> = new Set([16318180, 16315370, 16315388]);

/** A harvest that cannot go ahead as asked, with the reason, raised before anything is written. */
export class HarvestRefusal extends Error {}

/** One device to harvest, named as the archive names it. */
export interface HarvestDevice {
  readonly manufacturer: string;
  /** The archive's file name under `devices/<manufacturer>/`. */
  readonly file: string;
  readonly model: string;
  /** Logitech's id for the device, which the service's search match must carry. */
  readonly globalDeviceId: number;
}

const COMMON = 'Logitech.Harmony.Services.Common.Contracts.Data';
const DEVICE_OPERATION = 'Logitech.Harmony.Services.Manager.DeviceManager.Contracts.Data.Operation';
const SEARCH_MATCH = 'Logitech.Harmony.Services.Manager.DeviceManager.Contracts.Data.SearchMatch';

export function accountId(value: number): Record<string, unknown> {
  return { __type: `AccountId:#${COMMON}`, IsPersisted: true, Value: value };
}

/**
 * The one search match whose device id is the archive's, or a refusal. Matching on the id rather than
 * on the model's spelling is the rail: a search for a model number returns near namesakes, and a
 * harvest that compiled the wrong one would file an answer to a question nobody asked.
 */
export function pickMatch(matches: readonly Record<string, unknown>[], device: HarvestDevice):
    Record<string, unknown> {
  const exact = matches.filter((match) => (match['Id'] as { Value?: number } | undefined)?.Value
    === device.globalDeviceId);
  if (exact.length !== 1) {
    throw new HarvestRefusal(`${device.manufacturer} ${device.model}: ${exact.length} of `
      + `${matches.length} search matches carry device id ${device.globalDeviceId}, not 1`);
  }
  return exact[0]!;
}

/** What the device is called on the record, which is the name a compiled file's name tree carries. */
export function deviceName(device: HarvestDevice): string {
  return `${device.manufacturer} ${device.model}`.slice(0, 30);
}

/**
 * One `AddDeviceBySearchResultOperation`, as the client builds it. **`__type` is the first member** in
 * both objects, which their deserialiser requires; an object literal keeps insertion order, so it is
 * written first by hand. `ReturnIdAsKey` is a fresh guid per device, as the client makes it.
 */
export function addDeviceOperation(match: Record<string, unknown>, device: HarvestDevice, record: number,
    guid: string): Record<string, unknown> {
  return {
    __type: `AddDeviceBySearchResultOperation:#${DEVICE_OPERATION}`,
    ParentAccount: accountId(record),
    ReturnIdAsKey: guid,
    ControlPort: 7,
    DeviceName: deviceName(device),
    DeviceClassification: 0,
    IsScartCableSupported: false,
    SetupState: 1,
    State: 1,
    // Infrared only: the infrared is the whole point of a harvest.
    Transport: 1,
    Match: {
      __type: `PublicDeviceSearchMatch:#${SEARCH_MATCH}`, ...match,
      TypedManufacturer: device.manufacturer, TypedDeviceModel: device.model, GlobalDeviceSearchType: 1,
    },
    GroupName: '',
  };
}

/** The `UpdateMultiple` argument: one operation bag holding every device of the batch. */
export function operationBag(record: number, items: readonly Record<string, unknown>[]):
    Record<string, unknown> {
  return {
    operation: { __type: `OperationBag:#${COMMON}.Operation`, ParentAccount: accountId(record), Items: items },
  };
}

/**
 * The status word of a compile's polling answer. **The finished answer is not JSON**: it is a short XML
 * header stating the status, then a ZIP. So the status is read off the raw bytes, never off a parse,
 * which is the mistake the lab client made first and polled to its limit over.
 */
export function compileStatus(bytes: Uint8Array): string | undefined {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 200));
  return /status='([^']*)'/.exec(head)?.[1];
}

/**
 * The files of a ZIP, read through its central directory, stored or deflated entries only, which is
 * what the compile's answer holds. Small on purpose rather than a dependency: the format needed here is
 * two record types and two compression methods.
 */
export function readZip(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 0x10000 - 22); at--) {
    if (view.getUint32(at, true) === 0x06054b50) { end = at; break; }
  }
  if (end < 0) throw new HarvestRefusal('no ZIP end record');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files = new Map<string, Uint8Array>();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new HarvestRefusal('a ZIP directory entry is malformed');
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extra = view.getUint16(at + 30, true);
    const comment = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    const dataAt = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(dataAt, dataAt + size);
    if (method === 0) files.set(name, data.slice());
    else if (method === 8) files.set(name, new Uint8Array(inflateRawSync(data)));
    else throw new HarvestRefusal(`${name}: compression method ${method} is not read`);
    at += 46 + nameLength + extra + comment;
  }
  return files;
}

/**
 * The two halves a failed batch is split into. A compile of fifteen devices fails as a whole when one
 * of them breaks Logitech's compiler, so the batch is halved until the device that breaks it stands
 * alone, and every other device still gets compiled.
 */
export function splitBatch<T>(batch: readonly T[]): [T[], T[]] {
  const half = Math.ceil(batch.length / 2);
  return [batch.slice(0, half), batch.slice(half)];
}
