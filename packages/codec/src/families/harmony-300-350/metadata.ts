/**
 * The Harmony 300 and 350's metadata archive built from nothing, `todo-compile-350.md` 5.1.4 and plan 011 step 4: the
 * section a configuration of this family ends with, raw slot 13, from the setup's devices and two choices.
 *
 * **What is the family's and what is shared.** The text around the devices is this family's: the same 149
 * characters before them and 610 after in all seven Logitech files of the family the lab holds, and the Harmony 890
 * and 895's archive is another document. The ZIP around the text, the device element and the deflate are shared,
 * `metadata.ts` and `deflate.ts`, measured on this family and, for the ZIP's shape, on the Harmony 890 and 895 too.
 *
 * **The two choices, and why they are choices.** Neither number is a function of the file, plan 011:
 *
 * * **A device's `DeviceId`** is the account's number for it. In each of the five Harmony 350 compiles the numbers
 *   are consecutive in the archive's order, and in neither Harmony 300 compile, which is no rule of the model, since two
 *   other files in the lab are not; a build with no account has none,
 *   so the builder counts on from a first number it is given, or takes one per device where a caller holds an
 *   account's.
 * * **The ZIP's time** is the build stamp's less a zone's whole hours less 413 to 419 seconds in all seven, so no
 *   rule recovers it to the second; `noScreenZipTime` takes the middle of that band, 416, and its date is the
 *   stamp's own date in all seven.
 *
 * No reader of the archive is known on the remote, `withMetadataDevice` in `metadata.ts` says where that was looked
 * for, so both choices are copied for their shape and nothing is known to depend on either. What the builder writes
 * is checked against all seven compiles byte for byte given each compile's own choices, `metadatabuild.test.ts`.
 */
import { GspmError } from '../../container/gspm.ts';
import { metadataDeviceElement, metadataSection, type ZipTime, type ZipTimeWords } from '../../container/metadata.ts';

/** The text before the first device, the same in seven of seven of the family's compiles. */
export const NO_SCREEN_METADATA_BEFORE = '<Section class="com.logitech.harmony.compiler.binarysubsystems.binarizer.pepsi.MetaDataSection"'
  + ' name="BinarizerConstants.SECTION_META_DATA"><Devices>';

/**
 * The text after the last device, the same in seven of seven: the log area's two record layouts, an infrared event
 * naming a device and a command with a three byte time, and a device selected event, `reference/config-format/
 * container.md`.
 */
export const NO_SCREEN_METADATA_AFTER = '</Devices><RecordTypes>'
  + '<Class name="Infrared" id="0"><Record name="InfraredEvent" id="0">'
  + '<Field name="StartRecord" type="StartRecord" size="2"/><Field name="ClassId" type="byte"/>'
  + '<Field name="CurrentTime" type="currentTime" size="3"/><Field name="Device" type="byte"/>'
  + '<Field name="Command" type="byte"/></Record></Class>'
  + '<Class name="Device" id="1"><Record name="DeviceSelected" id="0">'
  + '<Field name="StartRecord" type="StartRecord" size="2"/><Field name="ClassId" type="byte"/>'
  + '<Field name="CurrentTime" type="currentTime" size="3"/><Field name="DeviceIndex" type="byte"/></Record></Class>'
  + '</RecordTypes></Section>';

/** One device as the archive names it: the setup's name and every command its catalogue entry names, in any order. */
export interface NoScreenMetadataDevice {
  readonly name: string;
  readonly commands: readonly string[];
}

/** The two numbers a build chooses, plan 011 step 4. */
export interface NoScreenMetadataChoices {
  /**
   * Each device's `DeviceId`, one per device in the setup's order, where a caller holds an account's numbers, or the
   * first device's, each later device taking the next, which is what every Harmony 350 compile shows.
   */
  readonly deviceIds: readonly number[] | { readonly first: number };
  /** The ZIP's time, `noScreenZipTime` for the build's own, or a compile's words to reproduce it. */
  readonly time: ZipTime | ZipTimeWords;
}

/** How far before the build stamp, after a zone's whole hours, the ZIP's time falls: the middle of 413 to 419. */
export const ZIP_TIME_BEFORE_STAMP_SECONDS = 416;

/**
 * The ZIP time a build states for its stamp, `builtAt` in base slot 3's spelling, `YYYY-MM-DDTHH:MM:SS`: the stamp
 * less `zoneHours` whole hours less `ZIP_TIME_BEFORE_STAMP_SECONDS`. The zone was 6 hours in the family's July and
 * September compiles, 5 in the test setup's and 0 in the 2011 file, so it is the caller's. Not checked: a stamp near
 * midnight, where this moves the date back with the time and no compile shows whether Logitech's does.
 */
export function noScreenZipTime(builtAt: string, zoneHours: number): ZipTime {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(builtAt);
  if (parts === null) throw new GspmError(`a build stamp is spelled YYYY-MM-DDTHH:MM:SS, not ${builtAt}`);
  const [year, month, day, hour, minute, second] = parts.slice(1).map(Number) as [number, number, number, number, number, number];
  const at = new Date(Date.UTC(year, month - 1, day, hour, minute, second) - (zoneHours * 3600 + ZIP_TIME_BEFORE_STAMP_SECONDS) * 1000);
  return {
    year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate(),
    hour: at.getUTCHours(), minute: at.getUTCMinutes(), second: at.getUTCSeconds(),
  };
}

/** The archive's text: the family's frame around one element per device, `Index` its position. */
export function noScreenMetadataXml(devices: readonly NoScreenMetadataDevice[], deviceIds: readonly number[]): string {
  if (deviceIds.length !== devices.length) {
    throw new GspmError(`${devices.length} devices and ${deviceIds.length} DeviceIds; the archive needs one each`);
  }
  const names = new Set(devices.map((one) => one.name));
  if (names.size !== devices.length) throw new GspmError('two devices of the setup share a name, which the archive cannot tell apart');
  return NO_SCREEN_METADATA_BEFORE
    + devices.map((device, k) => metadataDeviceElement(device.name, k, deviceIds[k]!, device.commands)).join('')
    + NO_SCREEN_METADATA_AFTER;
}

/**
 * The whole metadata section of a Harmony 300 or 350 configuration, the `u32` length and the ZIP, built from the
 * setup's devices in its order and the two choices.
 */
export function noScreenMetadataSection(devices: readonly NoScreenMetadataDevice[], choices: NoScreenMetadataChoices): Uint8Array {
  const given = choices.deviceIds;
  const ids = 'first' in given ? devices.map((_, k) => given.first + k) : given;
  if (ids.some((one) => !Number.isSafeInteger(one) || one < 0)) throw new GspmError('a DeviceId is a whole number');
  return metadataSection(noScreenMetadataXml(devices, ids), choices.time);
}
