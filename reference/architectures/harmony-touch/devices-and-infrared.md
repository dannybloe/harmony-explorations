# Harmony Touch: devices and infrared

What a Harmony Touch does with its devices: what it is told about each one, how a command it holds becomes
the blinking of its infrared lamp, and what a writer has to carry through. What a device and device mode are
for the person holding a remote is [how a Harmony works](../../how-a-harmony-works.md); how activities and
button maps lead to a command is [activities and button maps](activities-and-buttons.md); how infrared works
on every Harmony, the code families and how often a press sends a code, is [infrared](../../infrared/README.md).

**The scope is one firmware build and one synced set of documents.** Everything read in the firmware was read
in the Touch's production image 4.15.330, and everything measured was measured in the documents one sync
handed a Touch: seven infrared devices using five code families[^t-touch-devices][^t-touch-engine]. One more
device, composed by this project with a definition of its own, was added to those documents, delivered and heard,
[a device of ours](#a-device-of-ours)[^t-touch-device-of-ours]; and all seven were composed again under ids of
ours from their catalogue records and run inside their activities, [the catalogue's and the
person's](#the-catalogues-and-the-persons)[^t-touch-setup-of-ours]; and all seven were written again by this project
from their catalogue entries, every definition from its own table, and heard inside their activities, [built from
nothing](#built-from-nothing)[^t-touch-from-nothing]. **What
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
floating point and keeps the low word, and that rounds, an exact half to the even neighbour as an IEEE
addition does[^t-touch-engine]. **That is inferred from the decoded
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
one[^t-touch-devices]. In more detail[^t-touch-engine]:

* **The remote keeps a `Raw` only when it starts with `F`**, and sends a command's key code instead whenever
  its `KeyCode` is a text that is not empty, so a raw command states `KeyCode` null or empty.
* **It reads tokens of an optional `P` or `S` and hexadecimal digits**, the letters upper case only and the
  digits either case, so any other character only separates two tokens. The first token has to hold `F` and
  the carrier; its period is rounded like a family's, above. Every later token has to start with `P`, the lamp
  flickering, or `S`, dark; the engine tests for `P` alone. Each value becomes duration words like any other.
* **A token that breaks the pattern stops the reading where it stands**, and the packet is sent with its
  sequence's word count still 0. What the native program then plays is not checked[^unchecked].

So any spelling of that grammar reads the same; how Logitech's own learning code spells one is a
convention of theirs and not something the remote requires.

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
  keeps it going until the time has passed, and stops it[^t-touch-engine]. What a held power code took on a
  unit, the lamp and the wait after it, is under
  [starting, switching and stopping](activities-and-buttons.md#starting-switching-and-stopping).

The power feature's flags[^t-touch-engine]: **`IsPowerAlwaysOn`** suppresses the power off only, the power on
is still sent; a device whose `PowerTypeId` is 0 or 3 is powered by hand and gets neither; `PowerTypeId` 1 makes
power two discrete states and 2 one state that steps. **`IsScartCableSupported`**: while an activity starts,
as long as a command for such a device is waiting, devices without the flag are held back.

## A device of ours

**A device composed by a program, with a definition written from the program's own table of code families, is
listed and sent like one of Logitech's.** One device was added to the device, map and protocol lists a Touch
held and delivered in a sync: a projector with eleven commands, ten bound to keys of its own map and one, Power,
only on its screen, every command in the Sony 12 bit family, whose definition was written from the [rhythm
table](../../infrared/families.md) and listed under a protocol id of ours rather than the catalogue's. The remote
stored and committed the three lists, showed the device in its device list, and sent every one of the eleven when
its key or its screen entry was pressed: each heard at a receiver as the 12 bit frame the definition describes,
the command of the key's name to that device and nothing else, at least three frames a press, the device's press
repeat count being 3[^t-touch-device-of-ours]. Taken out again by a second sync, the device was gone and
the rest of the set was as before. So the engine builds its packet from a definition it has never been given by
Logitech exactly as from theirs, at least for a definition of the same fields and shape as one of theirs: that one
had the fields and shape of Logitech's Sony 20 bit definition, which the same remote sent beside it.

**Identifiers of ours are nine digits from 900000000.** A device, a map and a protocol definition each carry an id
the others name it by. Logitech's device and activity ids in the documents a Touch held are eight digits and the
protocol ids are the catalogue's, below a thousand, so an id of nine digits from 900000000 lies outside both by a
factor of ten and below 2<sup>31</sup>; the remote took a device and a definition under such ids, 900000001 and
900000002[^t-touch-device-of-ours], and an activity under 900000003, its map named `16417Activity900000003` by
it[^t-touch-activity-of-ours], [an activity of ours](activities-and-buttons.md#an-activity-of-ours). That is a margin
and not a guarantee, so a writer still refuses an id the documents already hold, a device id whose digits contain
another device's or sit inside one, and an activity id already an activity's or a device's.

What the screens drew for that device is [the model's display](../../remotes/harmony-touch/display.md#what-the-screen-shows).
*Corrected:* this said a device of ours used inside an activity, with power or input states of its own, was not
checked<!--superseded-->; devices under ids of ours with the catalogue's power, input and channel features ran inside
activities, [below](#the-catalogues-and-the-persons)[^t-touch-setup-of-ours]. It then said a definition of ours inside
an activity was not checked<!--superseded-->, until definitions of ours for five families were heard inside every
activity of a set, [built from nothing](#built-from-nothing)[^t-touch-from-nothing].

## The catalogue's and the person's

**A device a person sets up is two kinds of thing**: what the catalogue brings when the person picks a maker and
model, and what the person chooses. A writer composes the second and carries the first. **The person's**: the
device's name, its maker and model, its control port, its press repeat count, its inter key and inter device delays,
its power on delay, whether it is kept on between activities and always on, its input delay, and its own map.
**The catalogue's**, carried unchanged but for the device's id where a feature names it: every other field of the
device record, its features (inputs, power, channel tuning) with their steps, its commands with their codes, and
the definitions those commands name, under the catalogue's own protocol ids. Composed so from a description of a set
Logitech's service built, every device field came out equal to theirs, or equal but for the id[^t-touch-setup-compared]. All seven
devices of a set a Touch held were composed that way under ids of ours, with their records taken from the set the
remote held, and every code of the ten tests that had run on the set before was heard from them, 418 of 418, inside
their activities and in device mode[^t-touch-setup-of-ours].

**Two carried fields are the account's and not the catalogue's**: `DeviceProfileUri` and `ContentProfileKey`, the
address and the key of the device's favourites documents, which the remote keeps apart from the six. In Logitech's
documents the key is the device's own id; under an id of ours it no longer is. The screens' favourites reader takes
the pair by the device's id and reads the key and the address from the device, so a writer carries the pair on the
tuning device and the favourites are still found[^t-touch-setup-firmware]. Measured: with the pair carried on a TV
under an id of ours, the five favourite channels were each tuned as before, 15 of 15 codes[^t-touch-setup-of-ours]. A pair that does not match the remote's
favourites documents is not checked[^unchecked].

## Built from nothing

**A set whose every device record and every definition was written by a program, with no Logitech document as
input, is stored and sends every device's codes as it states them.** The seven devices of the documents above were
written again from a setup file and Logitech's catalogue: each device record from its catalogue entry, every
definition from the program's own [table of code families](../../infrared/families.md), five definitions in all,
under protocol ids of ours, with the same devices, maps and activities as the whole setup above. Delivered with the
other four documents in a sync, it was committed, and a test that starts every activity from off and ends it heard
every one of its 38 expected codes at a receiver, each pause in its band, judged by rendering every code from the
set's own definitions: Toshiba 32 Bit from four devices, Sharp 15 Bit 2 and Sharp 48 Bit 2 from the receiver's power
and input codes, Sony 20 Bit and Microsoft 30 Bit; no other code was heard during the test[^t-touch-from-nothing].
With the Toshiba 32 Bit definition's header pulse made half as long again, the same pulses fit 15 of the 38, so the
judging rests on the definitions[^t-touch-from-nothing]. Before that, one definition written by a program had been
played, the Sony 12 bit definition [above](#a-device-of-ours)[^t-touch-device-of-ours].

**What these definitions leave out against Logitech's for the same families**, field by field, and why each changes
nothing the engine does, is held by the comparison that built them[^t-touch-nothing-compared]. The one that could show
on a unit is the Microsoft 30 Bit toggle bit, which Logitech's definition states and ours does not, so by the
comparison's reading every press of a key sends the code as first stated[^t-touch-nothing-compared]; a second press of
the same key in a row was not sent in the test, and whether a console tells two presses from a hold without it is not
checked[^unchecked]. The other codes of each family, beyond the ones that
test sends, are the comparison's reading of the definitions and were not heard[^unchecked].

## What a writer must carry

**The remote's own screens change `DeviceList` and send it back whole**: the delay screens and their reset,
the port assignment screen, and a device's setup state, each by changing the document in place and saving
all of it[^t-touch-engine]. So every field a writer puts in a device list can come back, the fields nothing
reads among them, and a writer that drops one has changed what Logitech's service holds. **A device list changed
by a program and delivered in a sync was stored, committed and used**: one with a device of ours appended,
[below](#a-device-of-ours), and the same list with it taken out again[^t-touch-device-of-ours]. This said
uploading a changed device list had not been measured<!--superseded--> until then.

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
* A definition of ours of a shape no Logitech definition the remote holds has[^unchecked]. *Corrected:* this listed a
  device of ours inside an activity and a device of ours with features<!--superseded-->, which [the catalogue's and the
  person's](#the-catalogues-and-the-persons) ran under ids of ours[^t-touch-setup-of-ours], and then a definition of ours
  inside an activity<!--superseded-->, which [built from nothing](#built-from-nothing) ran for five
  families[^t-touch-from-nothing].
* Any other firmware build, and the other remotes of the generation[^unchecked].

[^t-touch-devices]: Measured on a unit. [The test](../../../packages/usb/test/touch-devices.test.ts)
[^t-touch-devices-service]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/touch-devices.test.ts)
[^t-touch-devices-catalogue]: Stated by Logitech, in their catalogue. [The test](../../../packages/usb/test/touch-devices.test.ts)
[^t-touch-engine]: Read in the firmware. [The test](../../../tests/test_harmony_touch_devices.py)
[^t-touch-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync.test.ts)
[^t-touch-device-of-ours]: Measured on a unit. [The test](../../../packages/bench/test/touch81-runs.test.ts)
[^t-touch-activity-of-ours]: Measured on a unit. [The test](../../../packages/bench/test/touch82-runs.test.ts)
[^t-touch-setup-of-ours]: Measured on a unit. [The test](../../../packages/bench/test/touch86-runs.test.ts)
[^t-touch-setup-compared]: Measured on a unit. [The test](../../../packages/corpus/test/touch-setup-set.test.ts)
[^t-touch-from-nothing]: Measured on a unit. [The test](../../../packages/bench/test/touch94-runs.test.ts)
[^t-touch-nothing-compared]: Measured on a unit. [The test](../../../packages/corpus/test/touch-nothing-set.test.ts)
[^t-touch-setup-firmware]: Read in the firmware. [The test](../../../packages/codec/test/touch-setup.test.ts)
[^s92]: Measured in configurations. [Section 92](../../../docs/findings.md#s92)
[^s348]: Measured in configurations. [Section 348](../../../docs/findings.md#s348)
[^unchecked]: Not checked.
