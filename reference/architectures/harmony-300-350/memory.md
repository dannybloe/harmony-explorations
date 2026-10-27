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
| slot map | raw slot to base slot in `ARCH16_SLOT_MAP`, `packages/codec/src/gspm.ts`: the name tree, the architecture record, the log area, the clock record, the infrared database, the action list table, the parameter block and the number sender are named; raw 13 is a metadata archive that names devices and commands, [the metadata archive](../../config-format/container.md#the-metadata-archive) and [the container's slots for this family](../../config-format/container.md#the-harmony-300-and-350s-slots). Raw 5, 6, 8, 9, 12 and 14 are read in the firmware, [below](#the-six-slots-the-firmware-was-read-for), and the map does not carry them yet | [^s259b], [^s260], [^s262b], [^t-slots] |
| the infrared table | allocated at the model's **maximum** device count, four groups on a 300 and eight on a 350, unused groups empty, unlike every other architecture | [^s263], [^s264] |
| which group a device takes | on the 300, the device key it is assigned to, [the 300's memory.md](../../remotes/harmony-300/memory.md); not the metadata archive's name list, which is alphabetical. On the 350 not checked | [^s265], [^unchecked] |
| what is stored | exactly the codes some action list sends | [^s261] |
| raw slot 8 | the timer table, twice the device count on a configuration Logitech's current service compiled, and empty on one compiled in 2011, so it follows the compiler and not the model, [below](#the-six-slots-the-firmware-was-read-for) | [^s264], [^s265], [^t-slots-c] |

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
| 8 | **[base slot 12, the timer table](../../config-format/state.md#base-slot-12-the-timer-table)**, its seven byte records and its four concurrent timers[^t-slots] | on the Harmony 350 one binding of each device key starts two, which switch one of four output pins; what the pins drive is not checked[^t-slots-c][^unchecked] |
| 9 | **[base slot 13, the state variable table](../../config-format/state.md#base-slot-13-the-state-variable-table)**, its header of four words and its seeder, `0xFE` fill to `0xC0` included, as on the Harmony 600[^t-slots] | |
| 12 | **a digit entry table**, no base slot: an instruction arms an entry, digits sent by opcode `0x74` are collected, and the entry turns them into a number or matches them. Two zero bytes in every configuration, so no entry, and none issues a digit[^t-slots][^t-slots-c] | nothing |
| 14 | NULL in every configuration, and no direct reference in the image reads it; a computed jump was not excluded[^t-slots][^t-slots-c] | |

**Raw slot 6's extra entry is not the activity.** It is entry 0, and it is the key table after `LWJL`, the
one map always looked up last: it holds the device keys and the activity's key. Entries 1 to N are the
devices' maps, one per device, each selected by one device key's binding; a map may also send another
device's codes. Where one device has no infrared commands, exactly one map is empty. **The activity has
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

## Not checked

* The external medium's part and size, and the RAM size[^unchecked].
* What raises the start up event table's entries 2 to 4, the unit of a timer's duration, what the four
  output pins drive, and the digit entry record beyond its first three bytes, which no configuration
  fills[^unchecked].
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
