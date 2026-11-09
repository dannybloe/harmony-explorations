/**
 * `@harmony/usb`, the main entry: what an application finds a remote with, reads it with, and checks a
 * configuration against before anything is written.
 *
 * **Explicit names, grouped by what a caller does with them**, `todo.md` 7.3.6 and plan 013 decision 6, and
 * `test/package/surface.test.ts` holds the list, so a new public name is a line in that list's diff. What a script, a
 * bench tool or a test needs beyond this is under a named subpath of `package.json`: `./internal` for the
 * protocol and the transport's parts, `./rails` for the rails, `./write` for the machinery that erases and
 * writes flash, `./touchsession` for the Harmony Touch's request session, `./touchrecording` for the decoder of
 * a recorded Touch sync, and `./protocol` and `./readwindow` for the two modules that import nothing, which a
 * browser page and `@harmony/corpus/read` load on their own.
 *
 * **The rails are not on this entry, and that is the one answer to where they are.** A write through
 * `HarmonyRemote` passes them inside this library whatever its caller imports, so a caller of this entry needs
 * only the refusal it meets, `RailError`. The rails themselves, the refusals and the lists of what may be
 * written, are `./rails`; `./write` carries the three a block writer asserts beside the machinery. Nothing on
 * any entry is permission: writing is off unless `HARMONY_ENABLE_WRITES=1`, the guarded transport `openHarmony`
 * returns passes only the commands that read, and the authorisation of a report is in no entry at all,
 * `authorise.ts`. `CLAUDE.md` "Never write to a remote" is the rule.
 */

// Finding a remote and opening it. Enumerating is not opening: the `list` functions only ask what is attached,
// and `openHarmony` claims a device, refusing the file based family, the tunnelled family and a remote in its
// bootloader, each of which a `list` and an `is` function names.
export {
  isFileBasedRemote,
  isHarmony,
  isMicrochipBootloader,
  isTunnelledRemote,
  listFileBasedRemotes,
  listHarmony,
  listMicrochipBootloaders,
  listTunnelledRemotes,
  LOGITECH_VENDOR,
  openHarmony,
  skinId,
  TransportError,
} from './transport.ts';
export type { FoundRemote, RemoteSelector, Transport } from './transport.ts';

// Reading a remote: its version block, its flash and its unit identity, through `HarmonyRemote`.
export { HarmonyRemote, RemoteError } from './remote.ts';
export type { RemoteOptions } from './remote.ts';
export { architectureFromVersion, ProtocolError, readVersion, VERSION_FIELD_NAMES } from './protocol.ts';
export type { VersionReading } from './protocol.ts';

// Which unit is on the cable, read off the unit and compared, never asserted by a caller. The values live with
// the user's data, not here.
export {
  identifiesAUnit,
  sameUnit,
  unitIdentityFromSerial,
  unitIdentityFromText,
  unitIdentityText,
  UnitIdentityError,
} from './identity.ts';

// The Harmony 300 and 350, which `openHarmony` refuses: their own protocol, read paths only.
export { openFileBasedRemote, parseSysInfo, readFile, readSysInfo } from './filepipe.ts';

// The delays a remote saved in its settings store, which win over a configuration's at start.
export { delaySlots, latestSettings } from './settings.ts';
export type { DelaySlot } from './settings.ts';

// Before a write: whether a configuration was compiled for this remote, over the six fields a configuration
// states.
export {
  COMPARABLE_FIELDS,
  CompatibilityError,
  compareIntendedVersion,
  compareIntendedVersionAgainstBlock,
} from './compatible.ts';
export type { Compatibility, CompatibilityField, FieldVerdict, StatedVersion } from './compatible.ts';

// What a refused write throws; the rails themselves are `./rails`.
export { RailError } from './rails.ts';
