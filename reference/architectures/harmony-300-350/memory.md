# Harmony 300 and 350: memory

Where things live on both models, stated once. These remotes keep a small filesystem: the program, a few
records about the remote itself, and **one file holding the configuration**, which is the devices and the
infrared codes a person set up. The layout below comes from the firmware's own file table, and the
configuration from the files a remote serves; nothing here was read as raw memory off a remote.

## The file table

The 1.4 firmware carries its filesystem as data: a pool of names at `0x00910A` and a table of 23 records of
11 bytes at `0x0092A6`, each giving a name a medium, an offset and a size[^s199][^t-firmware].

| path | medium and place | what it is |
|---|---|---|
| `/fw/bootloader` | internal `0x000000`, 4 KiB | the bootloader |
| `/fw/safemode` | internal `0x001000`, 32 KiB | the safe mode image |
| `/fw/normalmode` | internal `0x009000`, 89088 bytes, **and** the external medium at `0x000000`, the same size | the application, resident and stored, the arrangement the [Harmony 525](../harmony-5xx/memory.md) has too |
| `/fw/embeddedcfg` | no row: a name in the pool that no row of the table and no instruction points at | nothing this firmware serves, so there is no configuration to fall back on |
| `/cfg/usercfg` | external `0x020000`, 256 KiB | **the user configuration** |
| `/cfg/log` | external, the top 128 KiB of the part, placed at start from the flash part's identity: `0x060000` on a 512 KiB part | the log |
| `/sys/guid`, `/sys/pid`, `/sys/sku`, `/sys/battery`, `/sys/flags0` to `/sys/flags3` | seven 64 byte records from internal `0x01F400` | the unit's records; `/sys/guid` identifies a unit |
| `/fw/config_bits` | internal `0x01FFF8`, 8 bytes | the processor's configuration words |
| `/sys/sysinfo` | dynamic, nothing stored | identity text built on request |
| `/ir/ir_cap` | a stream | infrared capture |

Media: `I` internal program flash, 12 files; `E` the external medium, 3; `D` dynamic, 7; `S` a stream,
1[^s199]. The external medium's part and size are not checked[^unchecked]; concordance reported 512 KiB for
a 350[^s194b]. The 1.4 firmware knows four flash identities, two of 512 KiB, one of 1 MiB and one of 2 MiB, and places the log
from them[^t-harmony-350-file-write].

**This table listed `/fw/embeddedcfg` as a file with no place until the write path was read**: its name is
in the pool, and none of the 23 rows points at it, so it is not one of them[^t-harmony-350-file-write].
The `/cfg/log` row is the firmware's own: the table states no place or size for it, and the code supplies
both at start[^t-harmony-350-file-write].

**An open of `/cfg/usercfg` for writing erases `0x020000` to `0x07FFFF`**, the configuration's 256 KiB and
the 128 KiB after it, which on a 512 KiB part is the log, [usb.md](usb.md#what-the-firmware-does-with-a-write)[^t-harmony-350-file-write].

## The configuration container

The container's general form is [the configuration format's](../../config-format/container.md); this is
what holds on this architecture.

| | value | evidence |
|---|---|---|
| cookies | `GSPM`, then `LWJL` after the pointer table, then `PTYY` | [^s194] |
| pointer slots | 15; the header byte `0x0F` is the count, which is how "format 1.4" turned out to be a slot count all along | [^s194] |
| the marker's offset | `0x47`, which is `0x0B + 4 * 15`, hardcoded in the firmware's validator | [^s259] |
| base address | `0x020000`, the file's place on the external medium | [^s194] |
| slot map | raw slot to base slot in `ARCH16_SLOT_MAP`, `packages/codec/src/gspm.ts`: the name tree, the architecture record, the log area, the clock record, the infrared database, the action list table, the parameter block and the number sender are named; raw 13 is a metadata archive that names devices and commands, [the metadata archive](../../config-format/container.md#the-metadata-archive) and [the container's slots for this family](../../config-format/container.md#the-harmony-300-and-350s-slots). Raw 5, 6, 8, 9, 12 and 14 are read in the firmware, [below](#the-six-slots-the-firmware-was-read-for), and of those the map carries raw 9 alone, the state variable table, which a device's power on delay is read through | [^s259b], [^s260], [^s262b], [^t-slots], [^t-file-family-delays] |
| the infrared table | allocated at the model's **maximum** device count, four groups on a 300 and eight on a 350, unused groups empty, unlike every other architecture | [^s263], [^s264] |
| which group a device takes | the position of the device key it is on, on both models: the first key 0 to the fourth key 3, a short press on the 350, and a long press 4 plus the place; not the metadata archive's name list, which is in the account's order, ascending `DeviceId`[^t-noscreen-routing]. This said the list was alphabetical<!--superseded-->, which holds on the two Harmony 300 files and on none of the five Harmony 350 files; [below](#which-infrared-group-a-device-takes) | [^s265], [^t-device-groups-c], [^t-long-press-c], [^t-harmony-350-setup-u] |
| what is stored | exactly the codes some action list sends | [^s261] |
| raw slot 8 | the timer table, two records per device a key selects on a configuration Logitech's current service compiled, which is twice the devices unless a device is on two keys, and empty on one compiled in 2011, so it follows the compiler and not the model, [below](#the-six-slots-the-firmware-was-read-for). This said twice the device count until a configuration with a device on two keys held twelve for five, [a device key and its long press](#a-device-key-and-its-long-press) | [^s264], [^s265], [^t-slots-c], [^t-long-press-c] |

**A file states its size four bytes short**: `/cfg/usercfg` reports `end_addr - flash_base`, and the read
pads past it rather than serving the `PTYY` marker, so a configuration read as a file needs that marker
appended to be byte identical to concordance's copy, measured on both models[^s262][^s264b]. The firmware
states it that way: the open for reading computes the size as `end_addr - 0x020000`, and as zero when that
field is erased[^t-harmony-350-file-write]. **A write has to put the marker back**, since the validator a
remote runs at start demands it, [firmware.md](firmware.md#what-validates-the-configuration)[^t-harmony-350-file-write].

**A configuration from a different generation of the compiler is not a sample of the same population.**
Raw slot 8's emptiness on the 2011 configuration was first read as a property of the model, and a second
configuration of the same model, compiled by the current service, holds eight for four devices[^s265].
Each configuration states its own build date, so the check is available in every one.

## The six slots the firmware was read for

**Three of the six are base slots already described on the other architectures, one is this family's
own, one is a feature no configuration uses, and one is never read.** The 1.4 firmware seeks each through its section
seeker, and what the code does with the bytes is what names them[^t-slots]:

| raw slot | what it is | what a person meets |
|---|---|---|
| 5 | **the start up event table**, this family's own: a `u8` count, then one action list instruction per event, 11 in every configuration. The firmware queues entry 1 once, when a configuration passes the validator at start, and no other entry is raised by any direct reference in the image[^t-slots][^t-slots-c] | entry 1 installs the key maps and selects the map of the device on infrared group 0, so on that reading the remote starts in that device's mode, which on the Harmony 300 is the TV key's device[^t-slots][^t-slots-c][^s265] |
| 6 | **[base slot 9, the key map table](../../config-format/modes-and-keys.md#base-slot-9-the-key-map-table)**: a `u8` count and pointers to tagged lists, looked up through the same stack, with the same leave and enter tags 2 and 1, as on the Harmony 600, 650 and 700[^t-slots] | each device key selects its device's map[^t-slots-c] |
| 8 | **[base slot 12, the timer table](../../config-format/state.md#base-slot-12-the-timer-table)**, its seven byte records and its four concurrent timers[^t-slots] | on the Harmony 350 each device key's press starts two per device on the key, of 400 and 600 ticks, about 0.40 and 0.60 s, which switch that key's one of four output pins, [below](#a-device-key-and-its-long-press); what the pins drive is not checked[^t-slots-c][^t-long-press-c][^unchecked] |
| 9 | **[base slot 13, the state variable table](../../config-format/state.md#base-slot-13-the-state-variable-table)**, its header of four words and its seeder, `0xFE` fill to `0xC0` included, as on the Harmony 600[^t-slots] | each device's `Power` variable, whose switch on carries the device's power on delay, [below](#a-devices-power-on-delay)[^t-file-family-delays] |
| 12 | **a digit entry table**, no base slot: an instruction arms an entry, digits sent by opcode `0x74` are collected, and the entry turns them into a number or matches them. Two zero bytes in every configuration, so no entry, and none issues a digit[^t-slots][^t-slots-c] | nothing |
| 14 | NULL in every configuration, and no direct reference in the image reads it; a computed jump was not excluded[^t-slots][^t-slots-c] | |

**Raw slot 6's extra entry is not the activity.** It is entry 0, and it is the key table after `LWJL`, the
one map always looked up last: it holds the device keys and the activity's key. Entries 1 to N are the
devices' maps, one per device, each selected by a device key's binding, and by two where one device is on
two keys; a map may also send another device's codes. This said each map is selected by one binding,
until a configuration was read with a device on two keys[^t-long-press-c]. Where one device has no infrared commands, exactly one map is empty. **The activity has
no map of its own on this family**: it is one binding in entry 0 that sends codes or sets the devices' state variables and then
selects one device's map, which matches the Harmony 300's `PartiallySetupActivities` and the description
of it as a shortcut[^t-slots-c][^s265]. Its tag is a press of code 6, which is Watch TV, the only key the
face gives an activity, [the Harmony 350's keys](../../remotes/harmony-350/keys.md#scan-codes)[^t-harmony-350-keys-c].

So **device mode lives in base slot 9 here**, where on the models with a screen it is the device's own
mode record, [modes and keys](../../config-format/modes-and-keys.md#a-devices-mode-is-device-modes-keypad-map):
this family has no mode table for it to live in[^t-slots].

**Every send is paired with a `0x7C` naming the same device**, 602 of 602 lists over the five
configurations of this architecture, some of them as a third shape, `{0x07, 0x7D, 0x7C}`, beside the plain
pair[^s278]. The rule is every architecture's, [the action language](../../config-format/actions.md).

## Which infrared group a device takes

**A device takes the infrared group of the device key it sits on, by the key's place among the four**:
on a Harmony 300 the keys printed TV, Cable/Sat, DVD and VCR/Aux give groups 0, 1, 2 and 3[^s265], and
on a Harmony 350 the short press of the same four scan codes gives the same four groups, which by the
shared moulding are the keys printed `TV/Media`, `Cable/PC`, `AVR/Game` and
`DVD/Music`[^t-device-groups-c]. A group whose key holds no
device stays empty, so a configuration can hold group 3 with group 2 empty: the groups are not filled in
order[^t-device-groups-c]. On a Harmony 350 the bottom left key selected the device on group 2 and the
top left key the device on group 0, heard with an infrared receiver[^t-device-groups-u]; the top right
and bottom right keys follow from the 300's order, since the two are one moulding running one image,
and were not pressed with a device on them[^unchecked]. This said no device key had been pressed on a
350 until that run.

**Nothing in the key path picks a group.** A key press reaches the configuration as an event looked up in
the key table, and a device key's binding there selects the key map its operand names; the group is
whatever that map sends from, so the rule is the compiler's, stated in each
configuration[^t-device-groups][^t-slots]. The 1.4 image, read as Logitech serves it for the 350 and named
by Logitech for the 300 too, queues a held key's scan code with one of three event types: press
`0x80 | scan`, release `0x40 | scan` and, once the key has been held for the hold time, the held event
`0xC0 | scan`, which fires once and is followed by no release,
[key codes](../../config-format/modes-and-keys.md#key-codes-and-scan-codes)[^t-device-groups]. Its
other key events are fixed codes, not a held key's[^t-device-groups].

The four device keys bind scan codes 5, 1, 7 and 4, in the order above, on both models; on the Harmony 300
that order is tied to the printed keys by which device was put on which key[^s265][^t-device-groups-c].
**A Harmony 300 selects the device on the key's press, and a Harmony 350 on its release.** The 350's press
selects nothing: it switches one of the four output pins and starts two timers that switch it again, the
timers of [the six slots](#the-six-slots-the-firmware-was-read-for)[^t-device-groups-c].

**A long press device takes group 4 plus the key's place, on both configurations read that have
one.** Every 350 configuration allocates eight groups[^s263]. The first read gives two keys a
second device: the top right key's long press selects a device that sends from group 5, and the bottom
left key's long press selects the device already on the top right key's short press, which keeps its
group 1, so a device on two keys has one group[^t-long-press-c]. Of the rules the
short presses left open, `4 + place` predicts 5 for the top right key and fits; the lowest group no
short press uses predicts 4 and an interleaved numbering 3, and neither fits. **The second has a long
press device on every key**, groups 4, 5, 6 and 7 on the top left, top right, bottom left and bottom right
keys, which is `4 + place` four times, and on a Harmony 350 each key held long chose the device whose group
the next key was heard sending from[^t-harmony-350-setup-u]. This said one configuration was below two
samples and the rule not checked beyond it until then. Logitech's client holds a
device key as one record, `UserModeMappingInfo`, with a short press device and a long press device,
[its data model](../../logitech/data-model/entities.md#usermodemappinginfo)[^t-model]. How the long press
is stored and timed is [below](#a-device-key-and-its-long-press).

## A device key and its long press

**A Harmony 350 device key selects its short press device when it is let go, and its long press device
when it is held; a Harmony 300's selects as it goes down.** The firmware ends every press in one of two
events, a release or, once the key has been held for the hold time, a held event and no release,
[firmware.md](firmware.md#a-held-key)[^t-long-press]. On every configuration of the 350 read, the binding
in raw slot 6's entry 0 that selects a key's device is its release, and where the key has a second device
a binding of its held event selects that one; the press only cancels the timers, switches one of the four
output pins and starts timers. On both configurations of the 300 read, the press switches the pin and
selects[^t-long-press-c]. A select ends the hold, so the 300's device keys never raise a release or a
held event[^t-long-press].

| | Harmony 350 | Harmony 300 | evidence |
|---|---|---|---|
| the short press device | the release, `0x40` and the scan code: `07 FFFB`, which cancels all four timers, then `1F FFnn` | the press, `0x80` and the scan code: `1F E9p2` then `1F FFnn` | [^t-long-press-c] |
| the long press device | the held event, `0xC0` and the scan code: `07 FFFB` then `1F FFnn`, only on a key that has one | none | [^t-long-press-c] |
| the press | per device on the key, `07 FFFB`, `1F E9p2` and two `1F EB` starts, whose timers run 400 ticks to `1F E9p0` and 600 to `1F E9p2`: one pulse of the pin. A key with two devices carries the group twice, and the second `07 FFFB` cancels the first group's timers | the binding above | [^t-long-press-c], [^t-long-press] |
| scan codes of those bindings | 1, 4 and 5 on a configuration with three devices, and 7 with four or more | 1 and 5 with two devices, 1, 4, 5 and 7 with four | [^t-long-press-c] |
| the pin `p` each switches | 2 for scan 1, 3 for 4, 0 for 5 and 1 for 7 | the same | [^t-long-press-c] |
| the key's place | scan 5 top left, 1 top right, 7 bottom left and 4 bottom right, the order of the Harmony 300's keys, and all four heard so on a Harmony 350 and on a Harmony 300; what is printed on the four keys differs between units, so a key is named by its place | the same | [^t-long-press-c], [^t-harmony-350-setup-u], [^t-harmony-300-keys-u] |
| the hold time at start | `3F F00A`, parameter 0 at 10, about one second | the same | [^t-long-press-c], [^t-long-press-u] |

**One configuration read has long press devices**, two of them, on scan codes 1 and 7, the top right and bottom left keys, and it sets the
hold to 10 like every other, so on it a long press selects after about a second, where Logitech's guide
says two[^t-long-press-c][^t-long-press-u]. Its timer table holds two records per device a key selects,
twelve for five devices on six key assignments, since one device is on two keys, the short press of one
and the long press of another[^t-long-press-c]. That the remote meets the long press at a second is read
in the firmware and that configuration, not watched on a unit[^unchecked].

**A long press was watched selecting the second device** on a Harmony 350 holding a configuration with
two devices on every device key: each key held long chose its second device's map, which the next key was
heard sending from, and each short press its first[^t-harmony-350-setup-u]. How long each key was held was
not recorded; about two seconds was asked. This said a long press was read and not watched until then.

**A key with one device selects nothing on a long press.** No configuration read binds the held event
of a key without a second device, so held past the hold time it ends in a held event nothing binds, the
release that would select its device is never raised, and the remote stays in the mode it was
in[^t-long-press][^t-long-press-c]. Not watched on a unit either[^unchecked].

## What a device's map borrows from another

**A device's map is not only its own commands.** Logitech's service gives some keys of a device's map another
device's command, and its compiler binds them to the very list that device's own map binds, so pressing the key
in one device's mode sends another device's code[^t-noscreen-routing]:

* **Input** sends the input command of the device on the TV key's short press, `InputNext`, `Input` or `Source`,
  on every device's map, that device's own included; where that device has none of the three, no map binds
  Input. All seven Logitech configurations of the family read agree[^t-noscreen-routing].
* **Volume and mute** are the device's own on a television or a receiver; on any other device they are the first
  receiver's of the account, else its first television's. All eight devices of one compile agree, and the
  service's own maps for that account state it; on the other configurations 9 of 12 devices that are neither
  agree, two keeping their own on configurations compiled for earlier owners and one being a map that is the
  activity's[^t-noscreen-routing].

**What a Harmony 350 compile stores and no key sends**, each with a send list nothing calls: a device's
Teletext, which the service puts on a key the Harmony 350 does not have, 11 of 11 devices with the
command[^t-noscreen-routing]; and for some device types, televisions, set top boxes and media players among
them, the ten digits' one block copies, which a favourite channel sends where there is one, 25 of 25 devices
agreeing by type[^t-noscreen-routing]. A television's fifth favourite key holds its Home or its Internet, on 4
of the 5 televisions with either[^t-noscreen-routing].

**Every device's power variable has two lists nothing calls**, on both models: each sets the variable without
running its transitions, the silent flag `07 FFFF` and then the write, one to 0 and one to 1. All 27 devices of
the seven configurations read have the pair, none of the 54 lists is called, and no other list opens with the
flag[^t-noscreen-routing]. What would run them is not read; on the other platforms a list of this shape resets a
variable without sending anything[^unchecked].

**The start up selects the TV key's short press device.** Entry 1 of the start up events calls a list that ends
by selecting that device's map, the same list entries 2 to 4 call without it, on all seven
configurations[^t-noscreen-routing].

## A device's power on delay

**After switching a device on, the remote waits before it sends that device anything else**, and the wait
is stated per device in the configuration. A person would meet it with the power key in a device's mode:
the power code goes out, and a command pressed for the same device straight after it waits. The firmware
queues the wait behind the power code and counts it down only while nothing ahead of it names the same
device[^t-harmony-350-delay]. **A unit is a tenth of a second**: on a Harmony 350, a wait of 30 held the
next command to the same device 3.17 seconds after its power code ended and a wait of 100 held it 10.21
seconds, the same 0.16 seconds besides in both[^t-harmony-350-delay-heard]. **On a Harmony 350, a power
code to another device was not held behind it**, in one activity switching three devices on: the second
device's power code reached the receiver 0.19 seconds after the first's, inside the first's wait of ten
seconds, and the third's 0.50 seconds after that, inside the second's wait of two, while the second
device's own next code arrived 2.54 seconds after its power code[^t-harmony-350-setup-u]. The other images
are read to send that way; a key pressed for another device inside a wait was not tried, and on a Harmony
300 it rests on the shared image[^unchecked]. This said a command to another device was not checked on
this image until then.

Where it is: the device's `Power` state variable, going from 0 to 1, runs a list that calls the list
sending the power code and then carries one `0x7C` naming the device's group, with the wait as its low
byte. That is how the Harmony 880 and 885, the Harmony 525 and the Harmony One keep it,
[state.md](../../config-format/state.md#on-arch-16-the-same-instruction-and-the-activity-keeps-a-copy). 13 of
the 14 devices that send a code over this family's five configurations carry one `0x7C` there, with values
of 15, 50 and 80; the fourteenth carries two, 100 and then 70[^t-file-family-delays]. A Harmony 350 set
up with a Harmony 600's devices states the same three values the Harmony 600 keeps in tenths of a second,
80, 15 and 15[^t-file-family-delays].

**The activity keeps its own copy** of the wait for each device its start switches on directly, eight
over the five configurations: seven equal to the device's own, and one of 170 for the device whose own
list carries 100 and 70. So a device's wait is in two places on a configuration with an
activity[^t-file-family-delays].

Changing one is a one byte edit of that `0x7C`'s operand plus the trailer checksum, `setPowerOnDelay` in
`packages/codec/src/edit.ts`, which leaves the activity's copy alone[^t-file-family-delays].

## The activity

**Watch TV flips every device it uses, and asks none of them what state it is in.** Pressing it the first
time switches each device's power, then notes that the activity is running and puts the devices on their
inputs; pressing it again switches each device's power back, and the configuration writes no input then. It
keeps no record of whether a device is really on: a device switched on beforehand in its own mode is
switched off by Watch TV, and a device with one power code for both ways is sent that code either
way[^t-noscreen-activity]. Both ways end in the same device mode, the map of the device that changes
channels[^t-noscreen-activity]. That is how Logitech's compiles hold it; what a person meets with a device
already on was not tried on a unit[^unchecked].

**In the configuration** the activity is one list bound to Watch TV's press in entry 0, as
[above](#the-six-slots-the-firmware-was-read-for), and it runs, in order[^t-noscreen-activity]:

1. **Each device's power**, in the order the metadata archive lists the devices, which is the account's.
   A device whose power is one code both ways is sent that code's list and then one `0x7C` of its power on
   delay, the activity's own copy, [above](#a-devices-power-on-delay). Any other device has its `Power`
   variable flipped by two lists of the activity's own: the byte register loaded with 0, then a two armed
   compare of the register with the variable whose arms write 1 and 0, so a variable at 0 becomes 1 and one
   at 1 becomes 0, and its transitions send the codes. A device's power key in its own mode runs a list of
   the same bytes, and the activity does not share it.
2. **The activity's flag**, `ActivityPowerState_2`, a variable of two values and no transitions, flipped
   the same way.
3. **The inputs, on the way on only**: the register loaded with 1 and a one armed compare with the flag,
   whose arm runs where the flag has just become 1. The arm is the one input write, or a list of the writes
   in the same device order where there are several, or the null instruction where there are none.
4. **The channel device's map selected**, the map that device's key selects.

**A device has an input variable only where the activity puts it on an input**: in one compile for a Harmony
350, four devices whose catalogue entries list inputs carry none, and the two the activity uses
do[^t-noscreen-activity]. Every value goes from any value to its own through a list of its own sending a
record of its own, the input command's one block copy, its first block without the silence in front of it
and with no held block, as a favourite channel's digits are, [the number
sender](../../config-format/state.md#base-slot-16-the-number-sender), waiting a tenth after it. All 50 values
of the five configurations with inputs have that shape and that wait, from three devices; on the one whose
catalogue entry is known, a receiver, all 19 records are its input commands' copies word for word, and the
values are numbered in the catalogue's order of the inputs[^t-noscreen-activity]. Every activity read writes
value 0, so a write of another value is in no configuration[^t-noscreen-activity]. **A
television whose every input sets internal states of the catalogue's rather than sending a code of its own
gets a variable of one value and no transitions**, which the activity writes 0, so nothing is sent for its
input: measured on one LG television[^t-noscreen-activity]. How a stepping input, or one mixing codes and
states, compiles here is not read[^unchecked].

**Seven configurations of the current generation hold this shape**, six for a Harmony 350 and one for a
Harmony 300, and composed again from their own devices each gives Logitech's power steps and flag, and six
whose channel device is known give its map[^t-noscreen-activity]. A Harmony
300 configuration of an older generation of Logitech's compiler holds an older one, two power codes
with waits and the map, with no flag and no register[^t-noscreen-activity].

## The state variables

**The remote keeps a clock that runs to the minute and no further.** It counts a variable it keeps as
the second and steps the minute by itself, but on all five configurations of this family read here the
hour, the date and the year stay what a cold start set them to, which is the moment the configuration was
built. Nothing a person meets is known to depend on it: neither model has a screen, and none of the five
reads the clock[^t-harmony-350-clock][^t-harmony-350-clock-c].

**The variables sit in data memory from `0x108`**, the Harmony One's address: a one byte variable at
`0x108` plus its index, a two byte one, little endian, at `0x108 + narrow + 2 * (index - narrow)`. The area
ends at `0x1C7`, 192 bytes, where the seeder keeps `narrow`, `wide` and its memory check
next[^t-harmony-350-clock].

**The firmware owns variables 0 to 17**, as on the Harmony 880 and 885, the Harmony One and the Harmony
600, 650 and 700, [state.md](../../config-format/state.md#variables-7-to-17-belong-to-the-firmware-too): the
seeder's other arm paints from 18, and the memory check that decides whether the seeder runs covers 18
upward only[^t-state-block]. In all five configurations records 7 to 17 state the Harmony 600, 650 and
700's values[^t-harmony-350-clock-c]. What the firmware stores into, directly[^t-harmony-350-clock]:

| variable | what the firmware does with it |
|---|---|
| 0, the second | adds the time elapsed, and takes 60 off each time it reaches 60, raising a minute flag |
| 1, the minute | steps it by one, below, never directly |
| 3 and 5, the day and the month | the month end routine[^s322] moves a day past its month's last index to 0 and the month on by one |
| 4, the weekday | worked out from the date by an instruction no configuration here issues |
| 11 and 13 | 10 and 0 at every start, straight after the seeder; no direct reference reads either |
| 16 | 0 or 1 from an input pin, stored when it changes; what the pin senses is not checked[^unchecked] |
| 17 | the send queue's priority, 0 to 3, set by the send path; the Harmony One's priority byte and the Harmony 600, 650 and 700's sending flag |

**The minute is the firmware's last step.** When the second passes 60 and the action queue is empty, the
firmware queues the instruction that adds one to variable 1, which wraps past its `max` of 59 to 0 and then
fires the minute's transitions[^t-harmony-350-clock]. On every other architecture those transitions do
the carry, in all 21 of their containers measured: the minute adds one to the hour when it wraps, the hour
calls a list adding one to the day and the weekday, the day adds one to the month and the month to the
year[^t-harmony-350-clock-c]. **On this family's five configurations the seven clock records carry no
transition at all**, and no instruction in their lists, key maps, start up events, timers or transitions
writes, steps or adds to any of variables 0 to 17; the name tree was not scanned[^t-harmony-350-clock-c].
Five configurations of two generations of Logitech's compiler is the width of this: one that carried the
chain would run its clock, and none is known[^unchecked].

**The clock records seed it.** Their `first` values are base slot 3's build stamp field for field in all
five configurations, and the seeder writes them only when its memory check fails, so at a cold start; a
warm start keeps the running values[^t-harmony-350-clock-c][^t-harmony-350-clock]. The time since the
build is a counter of its own, filled from base slot 3 at start as on the Harmony One, 600 and
700[^t-harmony-350-clock].

**Variable 17 is the one of the eighteen a configuration names**: all five read it in four lists, each
switching one of four output pins one way or the other on its value, the pins band `0xE9` switches, which
is the instruction the timer table's records hold too[^t-harmony-350-clock-c][^t-slots]. That fits the Harmony 350's device keys lighting while it sends,
[the 350's display.md](../../remotes/harmony-350/display.md); that the pins are those lights is not
checked[^unchecked].

**What a configuration writer does**: stamp the seven clock records with the moment of writing, the year's
`max` with them, as on every architecture; reuse none of 0 to 17; and write no clock transitions, since
none of the five configurations read here has any and what the remote would do with them is not
checked[^t-harmony-350-clock-c][^unchecked].

**No read over USB reaches the clock as the library stands.** The file protocol has no read of data
memory, [the file protocol](../../usb-protocol/file-protocol.md), and no file on the inert list serves it.
The firmware does answer one request with the time and the date, one whose service byte is `0xC0` rather
than the file commands' `0xFF`; how it is framed is not read, and Logitech's templates for these skins
never send it[^t-harmony-350-clock][^unchecked].

## Not checked

* The external medium's part and size, and the RAM size[^unchecked].
* What raises the start up event table's entries 2 to 4, what the four output pins drive, and the digit
  entry record beyond its first three bytes, which no configuration fills[^unchecked]. This listed the
  unit of a timer's duration too, until a kind 0 timer was read losing one a tick of the clock the power
  on delay counts in, [firmware.md](firmware.md#a-held-key)[^t-long-press].
* Whether a person meets a Harmony 350's long press after one second, as the configurations and the
  firmware say, or after the two the guide states, [above](#a-device-key-and-its-long-press)[^unchecked].
* The routine that picks the next send past a held one is not read, so that a power on delay holds back no
  command to another device rests on one activity's power codes measured on a Harmony 350,
  [above](#a-devices-power-on-delay)[^unchecked]. This listed the measurement itself as not checked until
  then, and the unit too, until a Harmony 350 was measured at two values; on a Harmony 300 both rest on its
  running the same image[^unchecked].
* What a person meets pressing Watch TV with one of its devices already on, which the configurations say
  switches it off, and how an input that steps through its values, or mixes codes and states, compiles
  here, [the activity](#the-activity)[^unchecked].
* Whether the clock's unit is a second: the firmware counts from a timer and from watchdog wakes whose
  rates are not read, and only a read of the running remote would say[^unchecked].
* Whether a restart after a configuration is written seeds the new configuration's values or keeps the
  old ones: the same memory check decides, and what survives in data memory across this family's restart
  is not read[^unchecked].
* What variables 11, 13 and 16 mean, and what variables 7 to 10, 12, 14 and 15 are for, since nothing
  in the image stores into them directly[^unchecked]. This listed which variables the firmware owns and
  whether the clock runs as not checked too, until the state variables were read,
  [above](#the-state-variables).

[^s199]: Read in the firmware. [Section 199](../../../docs/findings.md#s199)
[^t-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_350_firmware.py)
[^t-harmony-350-file-write]: Read in the firmware. [The test](../../../tests/test_harmony_350_file_write.py)
[^unchecked]: Not checked.
[^s194b]: Measured on a unit. [Section 194](../../../docs/findings.md#s194)
[^s194]: Measured in configurations. [Section 194](../../../docs/findings.md#s194)
[^s259]: Read in the firmware. [Section 259](../../../docs/findings.md#s259)
[^s259b]: Measured in configurations. [Section 259](../../../docs/findings.md#s259)
[^s260]: Measured in configurations. [Section 260](../../../docs/findings.md#s260)
[^s262b]: Measured in configurations. [Section 262](../../../docs/findings.md#s262)
[^s263]: Measured in configurations. [Section 263](../../../docs/findings.md#s263)
[^s264]: Measured in configurations. [Section 264](../../../docs/findings.md#s264)
[^s265]: Measured in configurations. [Section 265](../../../docs/findings.md#s265)
[^s261]: Measured in configurations. [Section 261](../../../docs/findings.md#s261)
[^s262]: Measured on a unit. [Section 262](../../../docs/findings.md#s262)
[^s264b]: Measured on a unit. [Section 264](../../../docs/findings.md#s264)
[^s278]: Measured in configurations. [Section 278](../../../docs/findings.md#s278)
[^s322]: Read in the firmware. [Section 322](../../../docs/findings.md#s322)
[^t-slots]: Read in the firmware. [The test](../../../tests/test_harmony_350_slots.py)
[^t-slots-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_slots.py)
[^t-file-family-delays]: Measured in configurations. [The test](../../../packages/codec/test/filefamilydelays.test.ts)
[^t-device-groups]: Read in the firmware. [The test](../../../tests/test_harmony_350_device_groups.py)
[^t-device-groups-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_device_groups.py)
[^t-device-groups-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_device_groups.py)
[^t-model]: Stated by Logitech, in their client. [The test](../../../tests/test_myharmony_model.py)
[^t-harmony-350-delay]: Read in the firmware. [The test](../../../tests/test_harmony_350_delay.py)
[^t-harmony-350-delay-heard]: Measured on a unit. [The test](../../../tests/test_harmony_350_delay.py)
[^t-harmony-350-clock]: Read in the firmware. [The test](../../../tests/test_harmony_350_clock.py)
[^t-harmony-350-clock-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_clock.py)
[^t-state-block]: Read in the firmware. [The test](../../../tests/test_firmware_state_block.py)
[^t-noscreen-routing]: Measured in configurations. [The test](../../../packages/codec/test/noscreenrouting.test.ts)
[^t-long-press]: Read in the firmware. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-long-press-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-long-press-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-harmony-350-keys-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_keys.py)
[^t-harmony-350-setup-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_keys.py)
[^t-noscreen-activity]: Measured in configurations. [The test](../../../packages/codec/test/noscreenactivity.test.ts)
[^t-harmony-300-keys-u]: Measured on a unit. [The test](../../../tests/test_harmony_300_keys.py)
