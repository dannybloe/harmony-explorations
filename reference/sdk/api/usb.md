# `@freeharmony-sdk/usb`

<!-- introduction -->
The USB package's main entry: finding a remote on the cable without opening it, opening it to read, and telling
which model it is. It runs in Node, through the native module `node-hid`. Its other subpaths hold the write machinery,
the checks every write passes and the protocol's parts, and are not for an application: see
[what is not here](README.md#what-is-not-here).
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

## Before a write

Whether a configuration was compiled for this remote, over the six fields a configuration states.

### `COMPARABLE_FIELDS`

```ts
const COMPARABLE_FIELDS: readonly string[]
```

The fields this module can compare, in table order.

### `compareIntendedVersion`

```ts
function compareIntendedVersion(
  stated: StatedVersion,
  reading: VersionReading,
): Compatibility
```

Compare what a config states against what a remote reports.

Throws on a field this module has no comparator for, and on a version block too short to be an
identity. Never returns a bare boolean: the caller of a refusal needs to know which field.

Uses [`StatedVersion`](#statedversion), [`VersionReading`](#versionreading), [`Compatibility`](#compatibility).

### `compareIntendedVersionAgainstBlock`

```ts
function compareIntendedVersionAgainstBlock(
  stated: StatedVersion,
  versionBlock: Uint8Array,
): Compatibility
```

The same, from the raw version block a remote sent, which is what a rail is handed.

Uses [`StatedVersion`](#statedversion), [`Compatibility`](#compatibility).

### `Compatibility`

```ts
interface Compatibility {
  readonly fields: readonly CompatibilityField[];
  /** How many fields carried an actual comparison. Zero means the config claimed nothing. */
  readonly compared: number;
  /** The names of the fields that disagree, in table order. */
  readonly mismatched: readonly string[];
  /** True when nothing disagrees. **Not** the same as having checked anything. */
  readonly compatible: boolean;
}
```

Whether a configuration file was built for the remote on the cable, field by field.

Uses [`CompatibilityField`](#compatibilityfield).

### `CompatibilityError`

```ts
class CompatibilityError extends Error {}
```

A comparison asked for a field it does not know, where a match would mean nothing.

### `CompatibilityField`

```ts
interface CompatibilityField {
  /** The wrapper's own name for the field. */
  readonly field: string;
  /** What the config said, or undefined where it said nothing. */
  readonly stated: string | undefined;
  /** What the remote says, in the config's notation, so the two can be shown side by side. */
  readonly reported: string;
  readonly verdict: FieldVerdict;
}
```

One field of the comparison, both sides of it and its verdict.

Uses [`FieldVerdict`](#fieldverdict).

### `FieldVerdict`

```ts
type FieldVerdict = 'match' | 'mismatch' | 'not-stated';
```

One field's answer: the configuration and the remote agree, they differ, or the configuration states nothing.

### `StatedVersion`

```ts
type StatedVersion = Readonly<Record<string, string>>;
```

What a config's wrapper states, field name to value, exactly as it states it.

## Finding a remote and opening it

Enumerating is not opening. The `list` functions only ask what is attached, and [`openHarmony`](#openharmony) claims a device, refusing the file based family, the tunnelled family and a remote in its bootloader, each of which a `list` and an `is` function names.

### `FoundRemote`

```ts
interface FoundRemote {
  readonly vendorId: number;
  readonly productId: number;
  readonly path: string | undefined;
  readonly product: string | undefined;
  readonly manufacturer: string | undefined;
  /** `bcdDevice`, which carries the skin id in its low byte. See `skinId`. */
  readonly release: number | undefined;
}
```

A device on the USB bus as a `list` function reports it, without opening it.

### `isFileBasedRemote`

```ts
function isFileBasedRemote(vendorId: number, productId: number): boolean
```

Whether a device belongs to the file based family, from enumeration alone.

**Deliberately a second predicate rather than a hole in [`isHarmony`](#isharmony)'s range**, for the reason
[`isMicrochipBootloader`](#ismicrochipbootloader) gives above: the point is to tell "a remote this library cannot drive"
from "nothing plugged in", and a caller that only wants to know whether a Harmony is attached
should get a truthful yes. [`isHarmony`](#isharmony) excludes these because it gates [`openHarmony`](#openharmony), and opening
one would let this package send a device commands its family does not implement.

### `isHarmony`

```ts
function isHarmony(vendorId: number, productId: number): boolean
```

Whether a device is a Harmony this library's command protocol applies to: a Logitech Harmony product id, and not
one of the file based family (the Harmony 300, 350 and Touch) or the tunnelled family (the Harmony 890 and 895),
which speak other protocols.

### `isMicrochipBootloader`

```ts
function isMicrochipBootloader(vendorId: number, productId: number): boolean
```

Whether a device is in a Microchip bootloader, which is what a Harmony in recovery looks like.

A Harmony One or Harmony 600 held in its bootloader by a key at power on enumerates as
`04D8:000B` with no manufacturer, product or serial string at all, where a booted one is
`046D:C121` and calls itself `Harmony Remote 0-3.4.0`. Both bootloaders carry those descriptors
inside their own 4 KiB, so the identity comes from the recovery code rather than from the
application. That is the only signal a host gets, since the bootloader writes thirteen ports in
total and nothing in it drives the display.

### `isTunnelledRemote`

```ts
function isTunnelledRemote(vendorId: number, productId: number): boolean
```

Whether a device belongs to the tunnelled family, from enumeration alone.

### `listFileBasedRemotes`

```ts
async function listFileBasedRemotes(): Promise<FoundRemote[]>
```

The file based family, reported so it is not mistaken for an empty bus. Opens nothing.

Uses [`FoundRemote`](#foundremote).

### `listHarmony`

```ts
async function listHarmony(): Promise<FoundRemote[]>
```

Every attached Harmony, without opening any of them.

Enumeration only, and that distinction is the whole reason this is a separate function from
[`openHarmony`](#openharmony). Listing devices reads what the operating system already knows; opening one claims
it away from anything else and starts a conversation with an irreplaceable device. Code that only
needs to know whether a remote is plugged in should never reach for the second.

The import is dynamic so that merely importing this module does not load a native binding, which
matters for a test run and for an Electron main process that may never touch USB.

Uses [`FoundRemote`](#foundremote).

### `listMicrochipBootloaders`

```ts
async function listMicrochipBootloaders(): Promise<FoundRemote[]>
```

A Harmony waiting in its processor maker's bootloader, which no function here opens. Enumerates only.

Uses [`FoundRemote`](#foundremote).

### `listTunnelledRemotes`

```ts
async function listTunnelledRemotes(): Promise<FoundRemote[]>
```

The tunnelled family, reported for the same reason. Opens nothing.

These really are Harmonys and they really are inside the product range, so reporting them as
nothing at all would say the bus is empty while a Harmony 890 sits on it. What this library cannot
do is drive one. See [`isTunnelledRemote`](#istunnelledremote).

Uses [`FoundRemote`](#foundremote).

### `LOGITECH_VENDOR`

```ts
const LOGITECH_VENDOR = 0x046d
```

Logitech. The product range covers the Harmony models; [`tools/usbprobe.py`](../../../tools/usbprobe.py) uses the same.

### `openHarmony`

```ts
async function openHarmony(select: RemoteSelector = {}): Promise<Transport>
```

Open the one Harmony on the cable that `select` names, to read. Refuses when none matches, and when more than
one does, since two remotes of a model look alike on USB and the caller has to say which by its path. The
transport it gives lets only reads through.

Uses [`RemoteSelector`](#remoteselector), [`Transport`](#transport).

### `RemoteSelector`

```ts
interface RemoteSelector {
  readonly productId?: number;
  readonly path?: string;
}
```

Which remote to open, when more than one is attached.

### `skinId`

```ts
function skinId(bcdDevice: number): number | undefined
```

The skin id out of a device descriptor's `bcdDevice`, or undefined if it cannot be read.

A skin is Logitech's own index into its model list, so the number names the remote: 15 is an 880,
17 an 885, 19 an 890, 22 a 525, 54 a Harmony One, 66 a 700, 71 a 600, 72 a 650. Every config
states its own in the `<SKIN>` element of its EZHex header, which is what these cases are checked
against. It matters because the 600 and the 700 share product id 0xC122, so the product id does
not name which of the Harmony 600, 650 and 700 it is and this does, before a single config byte is
read.

**The low byte's encoding is per firmware generation and reading it wrong is silent**, so the
high byte decides: `0x08` and `0x09` carry the skin in plain binary, and there the high byte is
the protocol number; `0x10` carries it in BCD, on the Harmony One and the Harmony 600, 650 and 700
alike, so there it is a constant whose meaning is not established. Anything else is undefined rather than guessed,
because a guess names the wrong remote: an 885's 0x0811 read as BCD is 11, a Harmony 655.

### `Transport`

```ts
interface Transport {
  /** Send one report. The caller has already padded it to the report size. */
  write(report: Uint8Array): Promise<void>;
  /** The next report, or undefined if none arrived within `timeoutMs`. */
  read(timeoutMs: number): Promise<Uint8Array | undefined>;
  close(): Promise<void>;
}
```

A remote opened on USB, as reports in and out. [`openHarmony`](#openharmony) gives one, guarded so that only a read goes
through; [`HarmonyRemote`](#harmonyremote) speaks the protocol over it.

### `TransportError`

```ts
class TransportError extends Error {}
```

No remote found, more than one found where one was asked for, or a remote that could not be opened.

## Reading a remote

Its version block, its flash and its unit identity, through [`HarmonyRemote`](#harmonyremote).

### `architectureFromVersion`

```ts
function architectureFromVersion(fields: Uint8Array): number | undefined
```

The architecture a remote states in its own version block, or undefined if the block is too short.

### `HarmonyRemote`

```ts
class HarmonyRemote {
  constructor(transport: Transport, options: RemoteOptions = {});
  /**
   * Adopt the architecture the remote itself stated, once its version block has been read. It narrows rather than
   * overrides: an architecture already given in the options is kept.
   */
  useArchitecture(architecture: number): void;
  /** Close the handle. The remote is left as it was. */
  async close(): Promise<void>;
  /**
   * The version block as the remote sends it, twelve bytes on the Harmony One, 600, 650 and 700 and **seven on a
   * Harmony 525**: the length is the reply's, not a constant. `readVersion` names its fields, and `getVersion` also
   * tells this object which architecture's address rule applies. Throws `RemoteError` when the remote does not
   * answer or answers something else.
   */
  async getVersion(): Promise<Uint8Array>;
  /**
   * One byte of the data memory of a running remote, over `READ_MISC` selector `0x07`. Throws `RemoteError` before
   * anything is sent when the architecture is not known yet (call `getVersion()` first) and on a Harmony 525, whose
   * firmware has no way to read it and would answer zero for every address.
   */
  async readRam(dataAddress: number): Promise<number>;
  /**
   * The hardware feature read, `READ_MISC` selector `0x0C`: detail 0 is one byte of data memory, which Logitech's
   * client masks to a hardware flag, and detail 1 a sixteen bit value a routine computes, which the client calls the
   * battery level. Returns the two bytes after the selector as the firmware sends them, **high byte first**. Throws
   * `RemoteError` when the architecture is not known yet and on a Harmony 525, as `readRam` does.
   */
  async readHardwareFeature(detail: number): Promise<Uint8Array>;
  /**
   * Read `count` bytes of flash from `address`. The reply's sequence numbers are checked, so a dropped report is a
   * `RemoteError` rather than silent corruption. Throws `RemoteError` before sending for an address the model's rule
   * refuses and for an odd count of the processor's internal memory, which would never terminate on the remote.
   */
  async readFlash(address: number, count: number): Promise<Uint8Array>;
  /**
   * Read whatever a previous session left queued, before asking the remote anything. Reads only, bounded, and quiet
   * when there is nothing to take; a session that has to be right, a writer's, calls it first.
   */
  async drainLeftovers(): Promise<void>;
  /**
   * The unit's own 64 byte identity block, which is what says **which** remote this is: two remotes of one model
   * enumerate alike, and this tells them apart. One flash read, at an address that depends on the architecture.
   * It returns the bytes and nothing else; `identifiesAUnit`, `sameUnit` and `unitIdentityText` judge and print them,
   * and an application keeps the value it expects with its user's own data.
   */
  async readUnitIdentity(): Promise<Uint8Array>;
  /**
   * Read `count` bytes of the processor's internal program memory, page `0xFE` or `0xFF`, from `offset`. Throws
   * `RemoteError` before anything is sent for an odd count, which the remote's firmware never finishes, for an offset
   * above `0xFFC0`, and for a read that would run past the end of the 64 KiB page.
   */
  async readInternalMemory(subSelector: 0xfe | 0xff, offset: number, count: number): Promise<Uint8Array>;
  /**
   * One setting of the settings store of a Harmony 600, 650 or 700, `0x13 0xB2 0x00 setting`, which is a read.
   * A saved delay is four of these: `latestSettings` and `delaySlots` read the same out of `readSettingsStore`.
   * Throws `RemoteError` on any other model.
   */
  async readSetting(setting: number): Promise<number>;
  /** The settings store's two blocks, internal program memory `0x01EC00` to `0x01F400`, read. */
  async readSettingsStore(): Promise<Uint8Array>;
  /**
   * The firmware update status byte of a Harmony 600, 650 or 700, `B2 06 00`, which is a read: 0 at rest, 2 while an
   * image staged in the remote's external flash is waiting to be installed. Throws `RemoteError` on any other model.
   */
  async readUpdateStatus(): Promise<number>;
}
```

A Harmony opened on USB, spoken to in its own commands: its version, its identity, its memory and its flash.
An application usually needs only [`readConfig`](remote.md#readconfig), which takes one of these.

The class also carries the members the write path uses, which are left off this page: they refuse unless the
process was started with the write switches, and an application writes through `@freeharmony-sdk/remote/write`,
never through them directly.

Uses [`Transport`](#transport), [`RemoteOptions`](#remoteoptions).

### `ProtocolError`

```ts
class ProtocolError extends Error {}
```

A reply that does not have the shape its command gives it, or a request that cannot be built: an argument that
does not fit its field, such as an address past 24 bits, a count past 16 bits, a payload too long, or a value that
is not a byte. A request refused that way is refused before anything is sent.

### `readVersion`

```ts
function readVersion(fields: Uint8Array): VersionReading
```

Read a version block. Throws on one too short to carry an identity.

The refusal is `VERSION_FIELD_COUNT_MIN`, seven, and it is not caution: five is what concordance
also accepts and a block that short carries neither the architecture nor the skin, so it would be
an identity missing the two fields worth having. [`HarmonyRemote.getVersion`](#harmonyremote) already refuses the
same length, so a caller of both sees one rule.

Uses [`VersionReading`](#versionreading).

### `RemoteError`

```ts
class RemoteError extends Error {}
```

A command the remote answered wrongly or not at all, or a request refused before it was sent: because the remote
would not survive it (an odd count of internal memory, an address outside the window), because the model has no
such command, or because the architecture is not known yet, where the message says to call `getVersion()` first.
Nothing was changed on the remote by a refusal of a read; reading again after the cause is fixed is safe.

### `RemoteOptions`

```ts
interface RemoteOptions {
  /** How long to wait for one report. The default is generous: a flash read is not instant. */
  readonly timeoutMs?: number;
  /** How many empty polls in a row end a transfer that has stopped producing data. */
  readonly idlePolls?: number;
  /**
   * Which architecture's address rule applies, since the remote's own check of an address is not the same on all of
   * them. The default is the rule of the Harmony One, 600, 650 and 700; a Harmony 525 needs `9`, or every address
   * that works is refused before it is sent. `getVersion` sets it from the remote's own answer when it is not given.
   */
  readonly architecture?: number;
}
```

How long [`HarmonyRemote`](#harmonyremote) waits for the remote, and which model's rule for addresses it applies.

### `VERSION_FIELD_NAMES`

```ts
const VERSION_FIELD_NAMES: readonly (string | undefined)[]
```

The names of the fields, for a caller showing the block as it came.

### `VersionReading`

```ts
interface VersionReading {
  /** Every byte the remote sent, so this reading never has to be the only record of it. */
  readonly fields: Uint8Array;
  /** Field 0 as two nibbles: `3.4` on a Harmony One, `0.2` on a Harmony 600. */
  readonly firmware: string;
  /** Field 1 the same way. `concordance -i` calls it the board version. */
  readonly hardware: string;
  /** Fields 3 and 2, manufacturer first, as `1F:C8`. One 16-bit SPI read with chip select low. */
  readonly flash: string;
  /** Field 4's high nibble. The remote's own statement of which architecture it is. */
  readonly architecture: number;
  /** Field 4's low nibble: 0 in normal operation, 4 in safe mode. Logitech's own values. */
  readonly softwareType: number;
  /** Logitech's own word for that value, or undefined for one nobody has seen. */
  readonly softwareTypeName: string | undefined;
  /** Field 5, which `bcdDevice` states independently, so the two are a check on each other. */
  readonly skin: number;
  /**
   * Field 6, which names a **platform** and not an architecture.
   *
   * `0x0C` on the Harmony One and the Harmony 600 and 700, which are one platform under it, `0x09` on
   * the Harmony 525 and `0x08` on the Harmony 880 and 885.
   */
  readonly platform: number;
}
```

The version block, with the fields that have a known meaning named, and every byte kept.

## Saved delays

The delays a remote saved in its settings store, which win over a configuration's at start.

### `DelaySlot`

```ts
interface DelaySlot {
  readonly table: 'power on' | 'inter device';
  readonly slot: number;
  readonly key: number;
  readonly value: number;
}
```

One saved delay slot: its key and value, or undefined for an empty slot.

### `delaySlots`

```ts
function delaySlots(settings: ReadonlyMap<number, number>): DelaySlot[]
```

The delay slots that hold a key, read out of any map from setting to value: the store's latest
values from a read of its page, or what the remote answered over USB. An absent setting reads as erased.

Uses [`DelaySlot`](#delayslot).

### `latestSettings`

```ts
function latestSettings(page: Uint8Array): Map<number, number>
```

The latest value of every setting in a read of flash page `0xFF`, or of the store alone when `page` is
exactly the two blocks. The active block is the one whose header is not erased. Throws a plain `Error` when the
read is too short to hold the store, and when neither block or both blocks carry a header, since which one the
remote uses cannot then be told.

## The Harmony 300, 350 and Touch

The file based protocol, which [`openHarmony`](#openharmony) refuses, read paths only. A Harmony Touch's power source is read before a sync, since its screens take part only on USB power.

### `openFileBasedRemote`

```ts
async function openFileBasedRemote(
  select: { readonly productId?: number; readonly path?: string } = {},
): Promise<Transport>
```

Open a remote of the **file based** family, for reading.

**Deliberately a second function rather than widening [`openHarmony`](#openharmony).** That one gates the command
protocol and refuses this family by product id, and it keeps doing so: a caller that reaches for
it has flash addresses in mind and should still be refused. This is a different protocol with a
different allow list, so it gets its own door, which is the same shape as [`isFileBasedRemote`](#isfilebasedremote)
being a second predicate rather than a hole in [`isHarmony`](#isharmony).

Uses [`Transport`](#transport).

### `parseSysInfo`

```ts
function parseSysInfo(text: string): Map<string, string>
```

The identity file, parsed into its fields.

Text rather than a packed block, which is the surprise of this family: one field per line, name
then a space then a value, the architecture among them under the name `arch`. The firmware holds every one of those names as a string, so
the parse is checked against the image and not only against a reply.

### `readFile`

```ts
async function readFile(transport: Transport, path: string): Promise<Uint8Array>
```

Ping, open, read, close. Four commands, none of which changes a byte on the remote.

Uses [`Transport`](#transport).

### `readSysInfo`

```ts
async function readSysInfo(transport: Transport): Promise<Map<string, string>>
```

Read a Harmony 300, 350 or Touch's system information, the remote's own file of names and values, and give each
value by its name.

Uses [`Transport`](#transport).

### `readTouchPowerSource`

```ts
async function readTouchPowerSource(transport: Transport): Promise<TouchPowerSource>
```

Read which power source a Harmony Touch is on, through the read only route: ping, open `/tde/powerstate` for
reading, read, close, as [`readFile`](#readfile) does, and the text trimmed of white space, since the file holds the
source's name and a line feed.

**Refuses before anything is sent** unless `transport` is a guarded transport opened on the Touch's product id,
[`openFileBasedRemote`](#openfilebasedremote) with that id, since the name is a Touch's and nothing is read about it on another model;
the guard refuses the open on any other product besides, `INERT_PATHS_OF_PRODUCT`, so this is the convenient half
of two rails, as `openFileForReading` is beside the mode check.

**And refuses on a firmware build the name's handlers are not read in**, `TOUCH_POWER_READ_ON`: the identity file,
which is on the family's inert list, is read first and its build compared, and the name is opened only on a build
that is listed.

Uses [`Transport`](#transport), [`TouchPowerSource`](#touchpowersource).

### `TOUCH_POWER_SOURCES`

```ts
const TOUCH_POWER_SOURCES = ['battery', 'cradle', 'wall_adapter', 'usb', 'usb_charge'] as const
```

The five power sources a Harmony Touch's power controller driver names, in the order it names them: the battery,
the cradle, a wall adapter, a computer's USB port, and a USB charger, as the firmware names them. The remote's screens take part in a sync on `usb` alone,
[`reference/architectures/harmony-touch/answering-a-sync.md`](../../architectures/harmony-touch/answering-a-sync.md).

### `TouchPowerSource`

```ts
type TouchPowerSource = (typeof TOUCH_POWER_SOURCES)[number] | (string & {});
```

What `/tde/powerstate` reported: one of the five names the driver knows, or whatever other text the remote sent,
carried as it came. Typed so that a comparison with a known name is checked and an unexpected text still fits.

Uses [`TOUCH_POWER_SOURCES`](#touch_power_sources).

## The refusal

What a refused write throws. The rails themselves are on `./rails`.

### `RailError`

```ts
class RailError extends Error {}
```

A change to a remote refused by one of the checks every write passes: a switch not set, a remote that is not
on the list of remotes that may be written, or an address, a length or a file outside what may be written. Each
check runs before the command it judges is sent, so that command did nothing; but a write is many commands, and
a refusal part way through (of a later block, or of the restart) leaves what was already written in place. Read
the remote back before doing anything else when one is thrown after a write began.

## Which unit is on the cable

Read off the unit and compared, never asserted by a caller. The values live with the application's data about its user's remotes, not in this library.

### `identifiesAUnit`

```ts
function identifiesAUnit(blockOrDiscriminator: Uint8Array): boolean
```

Whether this block says anything about **which** unit it came from. A block filled with one byte, or with a
uniform pair of GUIDs, identifies nothing, and [`sameUnit`](#sameunit) refuses it rather than report a match.

### `sameUnit`

```ts
function sameUnit(a: Uint8Array, b: Uint8Array): boolean
```

Whether two identity blocks came off the same unit. Byte exact over the part that tells units apart, and it
throws [`UnitIdentityError`](#unitidentityerror) rather than answering false when either block carries no identity, since that cannot be
told.

### `UnitIdentityError`

```ts
class UnitIdentityError extends Error {}
```

An identity block or a written identity that cannot be read as one.

### `unitIdentityFromSerial`

```ts
function unitIdentityFromSerial(serial: string): Uint8Array
```

The 32 byte discriminator for a unit identified by a serial rather than by an identity block, so that
[`unitIdentityText`](#unitidentitytext), [`sameUnit`](#sameunit) and a record a caller stored of a unit serve this unit unchanged. A Harmony Touch
has no identity block; its serial is the `serial_number` line of [`readSysInfo`](#readsysinfo). Throws [`UnitIdentityError`](#unitidentityerror) for an
empty serial and for one character repeated, which is what a remote states when its record is missing.

### `unitIdentityFromText`

```ts
function unitIdentityFromText(text: string): Uint8Array
```

The inverse, for reading a stored identity back. Refuses anything that is not the right length.

### `unitIdentityText`

```ts
function unitIdentityText(block: Uint8Array): string
```

The identity as text, for a caller that has to store it and read it back: hex of the part that tells units apart,
64 characters, lower case, no separators. [`unitIdentityFromText`](#unitidentityfromtext) reads it back.
