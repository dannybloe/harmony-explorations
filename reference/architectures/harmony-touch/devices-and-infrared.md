# Harmony Touch: devices and infrared

What a Harmony Touch does with its devices: what it is told about each one, how a command it holds becomes
the blinking of its infrared lamp, and what a writer has to carry through. What a device and device mode are
for the person holding a remote is [how a Harmony works](../../how-a-harmony-works.md); how activities and
button maps lead to a command is [activities and button maps](activities-and-buttons.md); how infrared works
on every Harmony, the code families and how often a press sends a code, is [infrared](../../infrared/README.md).

**The scope is one firmware build and one synced set of documents.** Everything read in the firmware was read
in the Touch's production image 4.15.330, and everything measured was measured in the documents one sync
handed a Touch: seven infrared devices using five code families[^t-touch-devices][^t-touch-engine]. **What
is read in the firmware was read in the decompiled engine**, the remote's own program; the test anchors the
parts it can name in the compiled files and lists the rest as read only. Nothing here is checked on another
build or another model.

**The engine runs on the image's Lua 5.1 interpreter, not on its LuaJIT.** The image carries both, and the
start up script starts the engine through its launcher, which on the remote runs it with the Lua 5.1.4
interpreter; LuaJIT 2.0.0 beta 10 is what the screens' launcher runs. The engine's files are compiled for Lua
5.1, which LuaJIT does not load, and its bit library is the one built into the engine's own native
library[^t-touch-engine].

## Built at the moment of sending

An infrared command is a lamp blinking in a precise rhythm, and on the older Harmonys that rhythm is worked
out by Logitech's compiler and stored in the configuration as a list of durations, ready to play,
[infrared records](../../config-format/infrared-records.md). **A Touch is given no command as durations.** It
is given each command as Logitech's catalogue writes it, a code family's name and a number, and the family's
definition beside it, and **it works out the durations itself each time a command is sent**, in its own
program, before handing them to the part that drives the lamp[^t-touch-engine].

**The definitions it works from are Logitech's own catalogue definitions, unchanged**: each family a Touch
is given is, field for field, the definition Logitech's catalogue states for that family, under the
catalogue's own protocol id[^t-touch-devices]. So a Touch sends what the catalogue says, with no compiled
step in between, from the same definitions older remotes were compiled from, with the differences listed
under [against a compiled configuration](#against-a-compiled-configuration).

## The two documents

A Touch's devices arrive as two of the documents a sync hands it, [the platform on the
cable](usb.md)[^t-touch-sync]:

* **`DeviceList`**, one entry per device: the device record, its features (power, inputs, channel tuning and
  states of its own) and its commands. Every device record states the same fields, 56 of
  them[^t-touch-devices].
* **`ProtocolList`**, one definition per code family the devices use, an `IrProtocol` each in the sync
  measured. Every command names one of them by id and every one of them is named by a command, so the list
  holds the families in use and nothing else[^t-touch-devices].

Both are Logitech's own data model, [the entity listing](../../logitech/data-model/entities.md#devicelist).
**Logitech's service hands both out**: the client fetched each with one request on the account, and what it
got is, as parsed JSON, the document the remote received[^t-touch-devices-service].

## From a key press to the lamp

1. **The command is found by name**, without regard to case: each device's commands are kept by their name in
   lower case, so of two commands whose names differ only in case the later one wins, on any device that is
   not both a network and an infrared device[^t-touch-engine]. Which
   button leads to which command is [activities and button maps](activities-and-buttons.md#how-a-key-press-becomes-a-command).
2. **The transport is chosen per command**, by its `TransportType`: Bluetooth, a keyboard, a network
   device, or else infrared[^t-touch-engine]. Every command of the sync measured was infrared, none was
   learned and none carried a raw code[^t-touch-devices].
3. **The family is looked up** by the command's protocol id, and **a command whose family or device is
   missing sends nothing**[^t-touch-engine].
4. **The engine builds one packet of durations** from the command's code and the family's definition, the
   start, repeat and finish sequences each in full, below[^t-touch-engine].
5. **The packet goes to a native program** with the device's control port. A press starts the code, a held
   key sends the same request again with no packet, and a release switches it off[^t-touch-engine]. How that
   program plays the three sequences, and what keeps a held code repeating, are not checked[^unchecked].

**How many times a press repeats the code travels as a number beside the sequences** rather than as copies
of them: the device's `PressMinRepeats`, or 3 when that is null or negative[^t-touch-engine]. A compiled
configuration states the same count by holding that many copies in a record's first block,
[sending](../../infrared/sending.md#how-many-times-a-press-sends-a-code). **The family's own count is never
used on a Touch**: a definition's `PressMinimumRepeats` and `HoldMinimumRepeats` are stored and nothing reads
them, and neither is the device's `HoldMinRepeats`[^t-touch-engine]. Where Logitech's compiler writes a code
at its family's count[^s348], a Touch therefore sends it at the device's, and whether the two ever differ for
a device a Touch is given is not checked[^unchecked].

## How a code becomes durations

**A command's code is written in the catalogue's notation**, `G:<family>:(<A>)(<B>)(<C>):<n>`, three groups
of items, [how the catalogue writes a code](../../infrared/families.md#how-the-catalogue-writes-a-code). In the
sync measured every code had that form, with the family named exactly as its definition and `<n>`
3[^t-touch-devices]. What a Touch reads of it[^t-touch-engine]:

* **only the three bracketed groups**, which are the start, the repeat and the finish sequence. The `G:`, the
  family name and the trailing number are never read. What they mean is not checked[^unchecked].
* **each item names a segment of the definition.** An item whose second character is `x` is a segment id,
  its first character, and a value, the digits after the `x`; any other item is a segment id on its own, the
  word. **So the `0x` in front of a code is not a hexadecimal prefix**: it is segment `0` and a separator, and
  the one digit the catalogue's notation puts before every value names the segment the value is sent in.
* **a segment's id comes from its name**: the segment named exactly like the family is `0`, a segment whose
  name holds `KeyCode` is what follows that word, `Repeat` for `... KeyCodeRepeat`, and any other is the text
  after the family's name and a space.

**The structure is taken from each command, never from the family**: a definition states its own default
sequence in a field also called `KeyCode`, a list of segment references each naming a segment by
`SegmentName`, and no file on a Touch names `SegmentName`[^t-touch-engine]. In the sync measured the
two always agreed, per group as many items, a value where the definition names an encoded segment and a word
where it names a code segment[^t-touch-devices].

**A segment becomes durations** in one of two ways[^t-touch-engine]:

* **An encoded segment**, one that carries the bits of a value: its header's durations, one cell per bit,
  its trailer's durations, and then a silence that pads the whole to the segment's `TotalLength` when that is
  longer.
  * **The value's digits**: with `EncodingType` 0 or 1 each hexadecimal digit is four bits, padded with zeros
    on the left to the segment's `NumberOfBits` or cut from the left when longer. With 2 or 3 each digit is
    one symbol choosing one of the definition's cells, padded and never cut. The engine does not tell 0 from
    1: a biphase family's meaning is entirely in its two cells.
  * **A toggle bit**: when the segment states `ToggleBit`, that bit, counted from the left of the padded
    value, is replaced by a value the remote keeps per device and per family, which starts at 0 and flips
    on every send. Whatever the code states at that place is ignored. Of the five families measured only one
    states a toggle bit, inside its frame[^t-touch-devices].
* **A code segment**, literal durations: its `Atoms`, padded to `TotalLength` when that is longer. Its
  `Header`, `Trailer` and `Payload` are never read, which loses nothing, since every code segment in
  Logitech's catalogue carries its header and trailer inside its atoms and none has a
  payload[^t-touch-devices-catalogue].

**A duration is a 16 bit word**: 15 bits of microseconds and the top bit set while the lamp
flickers[^t-touch-engine]. A duration over 32767 is written as words of 32767, as many as fit, and one word
for the rest, and one under 30 is raised to 30. Two durations of the same kind in a row, a cell ending in a
silence and the next opening on one, stay two words[^t-touch-engine].

**The carrier**, how fast the lamp flickers, goes into the packet as a period in nanoseconds, **rounded to
the nearest nanosecond**, where a compiled configuration truncates it[^t-touch-engine][^s92]. The period goes
through the engine's bit library, whose conversion of a number adds 2<sup>52</sup> + 2<sup>51</sup> in
floating point and keeps the low word, and that rounds[^t-touch-engine]. **That is inferred from the decoded
conversion routine and not measured on the lamp**: the routine was recognised by its constant and by the shape
of the addition it calls. What the native program does with
the period after that is not checked[^unchecked].

## The packet

Big endian throughout[^t-touch-engine]:

| offset | bytes | holds |
|---|---|---|
| 0 | 1 | 1 for a code, 255 for a learned raw code |
| 1 | 4 | the carrier period in nanoseconds |
| 5 | 1 | the constant 50 |
| 6 | 2 | the silence before the code, the device's `InterDeviceDelay` in milliseconds; 0 for a raw code |
| 8 | 1 | how many times a press repeats the code, the device's `PressMinRepeats`, 3 when null or negative; 0 for a raw code |
| 9 | 1 | 0 |
| 10, 12, 14 | 2 each | where the start, the repeat and the finish sequence begin, 0 for a group that is empty |
| 16 | | each sequence: its number of duration words, then the words |

**A learned raw code**, a `Raw` text starting `F`, has no start and no finish, only a repeat sequence at 16.
The text is `F` and the carrier in hexadecimal hertz, then `P` and `S` values in hexadecimal microseconds, the
lamp's on and off times, with any dashes ignored[^t-touch-engine]. No command of the sync measured carried
one[^t-touch-devices].

**The packet goes to the native program as `/ir/ir_send`**, with the device's `ControlPort` as the ports it
goes out on and a key latency; a held key sends `/ir/ir_send` again with no packet, and a release sends it
switched off[^t-touch-engine]. The native program names the period, the silence and the repeat count in its
own messages, as `period_ns`, `presilence` and `min_repeat`, and one of those messages reports the silence
updated for the repeat count[^t-touch-engine]. **What the constant 50, the byte after the repeat count and the ports do, and how the
start, the repeat and the finish are played, are not checked**[^unchecked].

## Against a compiled configuration

**The rhythms are the same numbers**, since both come from the same definitions: Logitech's compiler built
the older remotes' records from the catalogue, [families](../../infrared/families.md), and a Touch sends the
definition itself. Two things differ in how the numbers reach the lamp[^t-touch-engine]:

| | a compiled configuration | a Touch |
|---|---|---|
| the carrier period | truncated, 26315 nanoseconds for 38 kHz[^s92] | rounded, 26316 for 38 kHz |
| how often a press repeats | copies in the first block, at the family's count where it states one[^s348] | a number beside the sequences, the device's count always |

Of the five families measured, rounding and truncating give different periods for the two at
38 kHz and the same for the other three[^t-touch-devices].

## Delays a device states

All in milliseconds, read against the engine's own millisecond clock[^t-touch-engine]:

* **`InterKeyDelay`** is the wait after a command before the next one **to the same device**, when commands
  are sent as a list, as an activity's start and end and a sequence are. **A single key press neither waits
  for it nor starts it.** A state that carries a delay of its own, an input's
  `InputDelay`, replaces it for that command when longer[^t-touch-engine].
* **`InterDeviceDelay`** is the silence a device needs after another device's last command before its own
  first, and it is also the packet's silence field[^t-touch-engine].
* **`PowerOnDelay`**, on the power feature, goes on the device's last power on command, so it holds back that
  device's next command only[^t-touch-engine]. How an activity's start schedules around it is
  [starting, switching and stopping](activities-and-buttons.md#starting-switching-and-stopping).
* **`ConnectedAppPowerOnDelay`** replaces the power on delay when an activity selects an input marked
  `IsOnline`[^t-touch-engine].
* **`Duration`** on an action is how long the code is held, in milliseconds: the engine starts the code,
  keeps it going until the time has passed, and stops it[^t-touch-engine].

The power feature's flags[^t-touch-engine]: **`IsPowerAlwaysOn`** suppresses the power off only, the power on
is still sent; a device whose `PowerTypeId` is 0 or 3 is powered by hand and gets neither; `PowerTypeId` 1 makes
power two discrete states and 2 one state that steps. **`IsScartCableSupported`**: while an activity starts,
as long as a command for such a device is waiting, devices without the flag are held back.

## What a writer must carry

**The remote's own screens change `DeviceList` and send it back whole**: the delay screens and their reset,
the port assignment screen, and a device's setup state, each by changing the document in place and saving
all of it[^t-touch-engine]. So every field a writer puts in a device list can come back, the fields nothing
reads among them, and a writer that drops one has changed what Logitech's service holds. Uploading a changed
device list has not been measured[^unchecked].

**Required**, in that a document without the field stops the engine[^t-touch-engine]: a device's
`DeviceType`, `Manufacturer` and `Transport`; a command's `TransportType` and its `Raw` key, which may be
null but has to be there; and, when infrared is sent, the device's `PressMinRepeats` and `InterDeviceDelay`.
A command whose `KeyCode` key is missing, rather than null, cannot be sent. `ControlPort` is taken as it
stands, so a missing one is not the engine's default.

**`ControlPort` 0 means the remote's own lamp**, any other value a hub or its blasters, in the screens'
reading; the values Logitech's schema names are Remote, HubInternal, HubBlaster1 and HubBlaster2,
[the entity listing](../../logitech/data-model/entities.md#controlport)[^t-touch-engine]. What a Touch with no
hub does with a nonzero port is not checked[^unchecked].

**Read by nothing on the remote**, as no file of its engine, its screens or its native programs names
them[^t-touch-engine]:

| where | fields |
|---|---|
| a command | `CommandTypeId`, `IsLearned`, `FunctionGroupId`, `DateTaught` |
| a device | `DefaultPressMinRepeats`, `HoldInterKeyDelay`, `HoldInterDeviceDelay`, `IsInterKeyDelayOptimized`, `DeviceOrder`, `GroupName`, `PrivateAddType`, `DongleIndex`, `Characterization`, `CopiedDeviceSource`, `DeviceSearchType`, `DeviceClassification`, `AppLaunchConfigs`, `PictureId`, `RegionalCharset`, `DecodedEdid`, `EncodedEdid`, `ActivityIds`, `GlobalLanguageVersionId-` |
| a device feature | `CanSkipInputs`, `IsAutoSwitch`, `PortTypes`, `ValueDelay`, `IsConfirmed`, `PowerOnResetInputName` |
| a protocol | `IsPadded`, `IsFullSequence`, `SendingType`, `HoldDelay`, `RelatedProtocols`, `IsPublic`, `NumberOfLinkedLanguage`, and its `KeyCode` field's segment references |

**Stored and never used**: a protocol's `PressMinimumRepeats` and `HoldMinimumRepeats`, a device's
`HoldMinRepeats`[^t-touch-engine]. **Read by the screens alone**: `DefaultInterKeyDelay`,
`DefaultInterDeviceDelay`, `DefaultInputDelay` and `DefaultPowerOnDelay`, which the delay screens reset to,
and `ParentDeviceManufacturer`, `ParentDeviceModel` and `IsMultiCode`[^t-touch-engine]. **A protocol's
`ControlSection` is read**, for a network device's commands[^t-touch-engine].

## Not checked

* What the native program does with the packet: the constant 50, the byte after the repeat count, the ports,
  how the start, repeat and finish sequences are played, and how the silence is adjusted for the repeat
  count[^unchecked].
* What the native program does with the carrier period after the engine has rounded it[^unchecked].
* What `G:` and the trailing number of a code mean; a Touch ignores both[^unchecked].
* Learned raw codes, Bluetooth, keyboard and network devices, a finish sequence and encoding types 2 and 3,
  which are read in the engine and occur in no document measured[^unchecked].
* Whether a device's repeat count and its family's ever differ for a device a Touch is given, which decides
  whether a Touch and a compiled configuration send such a code a different number of times[^unchecked].
* What a nonzero control port does on a Touch with no hub[^unchecked].
* Any other firmware build, and the other remotes of the generation[^unchecked].

[^t-touch-devices]: Measured on a unit. [The test](../../../packages/usb/test/touch-devices.test.ts)
[^t-touch-devices-service]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/touch-devices.test.ts)
[^t-touch-devices-catalogue]: Stated by Logitech, in their catalogue. [The test](../../../packages/usb/test/touch-devices.test.ts)
[^t-touch-engine]: Read in the firmware. [The test](../../../tests/test_harmony_touch_devices.py)
[^t-touch-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync.test.ts)
[^s92]: Measured in configurations. [Section 92](../../../docs/findings.md#s92)
[^s348]: Measured in configurations. [Section 348](../../../docs/findings.md#s348)
[^unchecked]: Not checked.
