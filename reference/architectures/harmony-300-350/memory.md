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
| which group a device takes | on the 300, the device key it is assigned to, [the 300's memory.md](../../remotes/harmony-300/memory.md); not the metadata archive's name list, which is alphabetical. On the 350 not checked | [^s265], [^unchecked] |
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
of it as a shortcut[^t-slots-c][^s265]. Which physical key carries it is not checked, since no scan code is
tied to a key here[^unchecked].

So **device mode lives in base slot 9 here**, where on the models with a screen it is the device's own
mode record, [modes and keys](../../config-format/modes-and-keys.md#a-devices-mode-is-device-modes-keypad-map):
this family has no mode table for it to live in[^t-slots].

**Every send is paired with a `0x7C` naming the same device**, 602 of 602 lists over the five
configurations of this architecture, some of them as a third shape, `{0x07, 0x7D, 0x7C}`, beside the plain
pair[^s278]. The rule is every architecture's, [the action language](../../config-format/actions.md).

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
| the hold time at start | `3F F00A`, parameter 0 at 10, about one second | the same | [^t-long-press-c], [^t-long-press-u] |

**One configuration read has long press devices**, two of them, on scan codes 1 and 7, and it sets the
hold to 10 like every other, so on it a long press selects after about a second, where Logitech's guide
says two[^t-long-press-c][^t-long-press-u]. Its timer table holds two records per device a key selects,
twelve for five devices on six key assignments, since one device is on two keys, the short press of one
and the long press of another[^t-long-press-c]. That the remote meets the long press at a second is read
in the firmware and that configuration, not watched on a unit[^unchecked].

**A key with one device selects nothing on a long press.** No configuration read binds the held event
of a key without a second device, so held past the hold time it ends in a held event nothing binds, the
release that would select its device is never raised, and the remote stays in the mode it was
in[^t-long-press][^t-long-press-c]. Not watched on a unit either[^unchecked].

## A device's power on delay

**After switching a device on, the remote waits before it sends that device anything else**, and the wait
is stated per device in the configuration. A person would meet it with the power key in a device's mode:
the power code goes out, and a command pressed for the same device straight after it waits. The firmware
queues the wait behind the power code and counts it down only while nothing ahead of it names the same
device[^t-harmony-350-delay]. **A unit is a tenth of a second**: on a Harmony 350, a wait of 30 held the
next command to the same device 3.17 seconds after its power code ended and a wait of 100 held it 10.21
seconds, the same 0.16 seconds besides in both[^t-harmony-350-delay-heard]. That a command to another
device is not held behind it is how the other images send, and on this one it is not
checked[^unchecked].

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

## Not checked

* The external medium's part and size, and the RAM size[^unchecked].
* What raises the start up event table's entries 2 to 4, what the four output pins drive, and the digit
  entry record beyond its first three bytes, which no configuration fills[^unchecked]. This listed the
  unit of a timer's duration too, until a kind 0 timer was read losing one a tick of the clock the power
  on delay counts in, [firmware.md](firmware.md#a-held-key)[^t-long-press].
* Whether a person meets a Harmony 350's long press after one second, as the configurations and the
  firmware say, or after the two the guide states, [above](#a-device-key-and-its-long-press)[^unchecked].
* That the power on delay holds back no command to another device: the routine that picks the next send
  is not read, and only the same device was measured, [above](#a-devices-power-on-delay)[^unchecked]. This
  listed the unit as not checked too, until a Harmony 350 was measured at two values; on a Harmony 300 the
  unit rests on its running the same image[^unchecked].
* Which state variables the firmware owns on this family, and whether the remote keeps a running clock:
  the configuration has a clock record and the firmware a month end routine[^s322], and the state
  variable table is read for its layout and its seeder only, [above](#the-six-slots-the-firmware-was-read-for)[^unchecked].

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
[^t-harmony-350-delay]: Read in the firmware. [The test](../../../tests/test_harmony_350_delay.py)
[^t-harmony-350-delay-heard]: Measured on a unit. [The test](../../../tests/test_harmony_350_delay.py)
[^t-long-press]: Read in the firmware. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-long-press-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-long-press-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_long_press.py)
