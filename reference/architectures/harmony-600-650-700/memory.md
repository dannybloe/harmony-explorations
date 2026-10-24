# Harmony 600, 650 and 700: memory

These three remotes keep what they know in three places. **Inside the processor** are 128 KiB of flash,
in two pages of 64 KiB, holding the program the remote runs and a few small records of its own: its
saved settings, its identity and the processor's own configuration. **On a separate 2 MiB flash chip**
sit the configuration a person builds, the screens the remote falls back on when that configuration is
missing, and a copy of the firmware for an update. And **data memory** holds what changes while the
remote runs: the clock, the state of each device, the current screen. The processor runs its program
from inside; the configuration is read off the chip a few bytes at a time and is never executed.

Where the three models differ, each model's own memory page says so: the
[Harmony 600](../../remotes/harmony-600/memory.md), the [Harmony 650](../../remotes/harmony-650/memory.md)
and the [Harmony 700](../../remotes/harmony-700/memory.md). Internal flash is addressed as two pages, `0xFE`
for program addresses `0x00000` to `0x0FFFF` and `0xFF` for `0x10000` to `0x1FFFF`, which is how a USB
read names them, [the command reference](../../usb-protocol/commands.md#addressing-in-short) "Internal memory: `0xFE` and
`0xFF` are two pages, not one selector and a dud".

## Constants in the code

<!-- generated:memory-constants -->
| what | value | constant |
|---|---|---|
| external flash size | 2048 KiB | `FLASH_TOP_BYTE_BOUND`, `protocol.ts` |
| user configuration starts at | external 0x030000 | `CONFIG_REGION_BASE`, `rails.ts` |
| highest address a write may reach | external 0x200000 | `WRITABLE_CEILING`, `rails.ts` |
| erase block | 64 KiB | `ERASE_BLOCK_SIZE`, `rails.ts` |
| firmware staging region | external 0x000000 to 0x020000 | `STAGING_REGION`, `rails.ts` |
| settings store | internal page `0xFF` `+0xEC00`, two blocks of 1 KiB | `STORE_OFFSET_IN_PAGE` and `STORE_BLOCK_BYTES`, `settings.ts` |

Generated from `packages/usb/src/protocol.ts`, `rails.ts` and `settings.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

The flash size and the ceiling are read in four builds' address classifiers[^s281] and the 2 MiB part
is measured[^s88b]. The erase block is read in the same four builds, the SPI opcode `0xD8`, and measured
by checking the blocks either side of an erase[^s281b]. The configuration base is measured on all three
models[^t-memory-map][^s281b][^s295]. The staging region is Logitech's region 2 for skin 66 and has been written on a Harmony 700
only[^s297]. The store's layout is read in the firmware and measured[^s282].

## External flash, 2 MiB

**2 MiB and not 4**: the firmware refuses every address at or above `0x200000`[^s88], and the part
reports itself as EON's 2 MiB part, flash id `15:1C`[^s88b], on each of the three models[^s281b][^s295].

| address | contents | evidence |
|---|---|---|
| `0x000000` to `0x020000` | the region an install copies the application from, see [firmware.md](firmware.md). **What it holds differs by model**: a stored copy of the application on the 600, nothing but a copy of the identity block's first bytes on the 650, an image staged for an update on the 700 | [^s281b], [^s297] |
| `0x020000` | the **safe mode configuration**, 7115 bytes to `0x021BCB`, container format 1.4 with 20 pointer slots. It is the **status screen library**: no devices, no activities, 35 status screens, linked for this address, its end marker at `0x021BC7`. Its section table is byte identical on all three models | [^s24], [^s353], [^t-memory-map] |
| `0x030000` to `0x200000` | the **user configuration**, 1856 KiB of room | [^s88] |
| `0x0E0000` to `0x100000` | declared as the log area by every safe mode configuration of the three models, and the region Logitech's client names for a user log, 128 KiB | [^s206] |
| `0x1E0000` to `0x200000` | declared as the log area by the user configurations instead: the same 128 KiB at the top of the 2 MiB part. Which of the two a remote wants is open, and nothing on these models is known to write either; the log area's writer is the Harmony One's alone | [^s206], [^s47] |

## Internal flash, two pages of 64 KiB

| page and offset | contents | evidence |
|---|---|---|
| `0xFE` `+0x0000` | the **bootloader**, 4 KiB, with the reset vector at zero. At every start it scans the keypad and compares two key codes, `0x14` and `0x2C`, then checks that an image header is present at `+0x1000` before entering it. It also carries a USB flash programmer of twelve commands with an erase bound of `0x001000`. It differs between the 600 and the 650 | [^s87], [^s189], [^s281b] |
| `0xFE` `+0x1000` | the **safe mode image**, up to `+0x9000`. Its length and version differ by model | [^s23], [^s295] |
| `0xFE` `+0x9000` | the **application**, entered through its own header, running on into page `0xFF`. Its length differs by build; an install copies at most up to `0xFF` `+0xEC00`, [firmware.md](firmware.md) | [^s23], [^s295] |
| `0xFF` `+0xEC00` | the **settings store**, two blocks of 1 KiB, below | [^s282] |
| `0xFF` `+0xF400` to `+0xF800` | the **identity block** and the records after it, below | [^s150b] |
| `0xFF` `+0xFFF8` | the processor's **configuration words**, six bytes, program `0x1FFF8` to `0x1FFFD` | [^s25] |

On the Harmony 600 everything else in both pages is erased[^s23]; the other models' pages are on their
own memory pages.

### The settings store

Two 1 KiB blocks at `0xFF` `+0xEC00` and `+0xF000`, used one at a time. Each opens with a four byte
header, `fc ff 00 00`, and then holds two byte records, a setting and its value, appended in order; the
latest record for a setting wins[^s282].

* **Settings `0x00` to `0x13` and `0x18` to `0x2B`** are two tables of five saved delays, power on and
  inter device, each slot a key naming a device and a value. At start the firmware copies a saved value
  over the configuration's own, so a delay saved on the remote wins over the file[^s303].
* **Setting `0x80`'s bit 0 decides whether the configuration's checksum is checked at start.** It is
  copied at start to `0x744` on the 0.2 builds and `0x3A9` on the 700's 2.8[^s354]. Its other bits are
  not read.
* **An erase at exactly `0x030000` after a cache drop** may update setting `0x80`, clearing its bit 0;
  where that bit is already clear it writes nothing[^s282].

A host reads and writes the store with a version request carrying a payload, [usb.md](usb.md).

### The identity block and the records after it

**The identity block** is a 64 byte slot at `0xFF` `+0xF400`, four 16 byte fields. The first is the
field named the serial, and it holds the filler byte `0xEE` on every remote read, so it identifies
nothing. The second and third are the two GUIDs that do identify a remote, which Logitech's service
takes as its serial[^s226]. The fourth is erased on the Harmony 600[^s23]. A tool that prints the
remote's "three GUIDs" is counting the `0xEE` field as one of them, in order at `+0x00`, `+0x10` and
`+0x20`[^s22], which is how one description of this block came to say three GUIDs and another two:
both describe the same bytes.

**Above it Logitech's client names ten records of 64 bytes**, from `0x01F400` to `0x01F680`, and a
1024 byte block at `0x01F800`; the first address is also the start of a 1024 byte block of system
parameters, so the records are subdivisions of one block[^s150]. Ten, where this page said twelve
until the client's table was counted rather than restated[^t-memory-map-client].

| address | the client's name for it | what is there |
|---|---|---|
| `0x01F400` | the unit's serial identifier | the identity block above |
| `0x01F440` | key timing | erased |
| `0x01F480` | infrared capture silence timing | erased |
| `0x01F4C0` | unit settings | erased |
| `0x01F500` | keypad settings | erased |
| `0x01F540` | display settings | erased |
| `0x01F580` | battery calibration | a few bytes |
| `0x01F5C0` | power settings | erased on the Harmony 600; one byte on the Harmony One's equivalent |
| `0x01F600` | other settings | erased |
| `0x01F640` | a manufacturing identifier | a few bytes |
| `0x01F680` to `0x01F800` | nothing | see the model pages |
| `0x01F800` | test flags, 1024 bytes | erased |

The names are the client's[^s150] and the contents are measured[^s150b]. **Six of the seven records the
client calls settings have never been written** on the Harmony 600 or on the two Harmony Ones read
beside it, so a remote has no per unit setting that its configuration does not carry. The seventh holds
one byte on the Harmony One and nothing on the Harmony 600[^s150b].

One word in the unnamed stretch is read in the firmware: a state of the version request family, `0xBD`,
reads the program word at `0x01F6C0` and, when its bit 0 is set, programs `0xFFFE` there, so the word
is a flag cleared once[^s304].

## Data memory

The addresses differ between builds, so they are given per build and not per architecture. On every
build read, the first seven state variables are the clock and are live while the remote is on the
cable[^s283][^s386][^s387].

### Build 0.2, the Harmony 600 and 650

The 600's and the 650's 0.2 builds are one program with its code moved[^s392], and the addresses come
from the 0.2 image, which the two share for these routines. The values were read over USB, `READ_MISC` selector 7, on the 650
throughout[^s283b] and on the 600 for the state variables[^s387].

| data | what | evidence |
|---|---|---|
| `0xE10` | the **state variables**: one byte each below `narrow`, two above, in a 192 byte allocation, so variable `n` is at `0xE10 + n` while `n` is narrow. The clock is the first seven | [^s283], [^s387] |
| `0xE22` to `0xECF` | what the reload checksum covers, an XOR seeded `0xA5` | [^s283] |
| `0xED2` | that checksum, restamped by every store. At start, once a container validated, a match skips the reload in the code; across a restart of a Harmony 650 it did not | [^s283], [^s283b] |
| `0xED4`, `0xED6`, `0xEE1`, `0xEE2`, `0xEE4`, `0xEE5` | among the working bytes of the two setters at `0x16360` and `0x163AA`, which store a variable and, unless a flag at `0xED8` or `0xEDC` is set, run the transitions; shared with the seeder and others. `0xEE1` is the index the store was handed, for a narrow variable | [^s283] |
| `0xEDC` to `0xEDF` | the second setter's arguments, written only where it is called | [^s283] |
| `0xE00` to `0xEFF` | the whole bank: across one bare restart at rest only the clock's seconds, minutes and hours and the six working bytes above changed | [^s283b] |
| `0x500` to `0x5FF` | the infrared sender's ring, with its indices at `0x75E` to `0x760`; kept across a bare restart | [^s283], [^s283b] |
| `0x06F` | the counter of time since the configuration was built | [^s310] |
| `0x0A8`, `0x0AD` | the current mode and the mode switch's argument | [^s326] |
| `0x3DA` | the infrared toggle word | [^s365] |
| `0x384` | the panel's first identity byte | [^s387] |
| `0x686`, `0x687` | the flash id, `0x15` and `0x1C` | [^s110] |
| `0x68B` | bit 4 chooses where a configuration read goes, the configuration at `0x030000` when set and the status screen library at `0x020000` when clear; bit 2 is the configuration's verdict and bit 1 the safe mode configuration's | [^s282], [^s283], [^s354] |
| `0x725` | the flag the cache drop sets and the next erase consumes | [^s282] |
| `0x744` | bit 0 gates the trailer checksum, loaded at start from setting `0x80` | [^s354] |
| `0xD2A`, `0xD2F` to `0xD32` | the light level in force, and the configuration's four light levels of parameter group 3 | [^s392] |

### Build 0.4, the Harmony 650's update package

Its few data memory addresses read are those of the cache drop and of the state variable
seeder[^s282][^s284].

### Build 2.8, the Harmony 700

Its addresses differ from the 0.2 builds' throughout: the state variables are at `0x900 + n`, and the
rest is on [the Harmony 700's memory page](../../remotes/harmony-700/memory.md)[^s384].

## Not checked

* What setting `0x80`'s bits other than bit 0 mean[^unchecked].
* What the runs between `0x01F680` and `0x01F800` hold, beyond the flag word at `0x01F6C0`[^unchecked].
* Logitech's client reserves 16 KiB at external `0x020000` for the safe mode configuration, of which
  the container uses 7115 bytes; the rest of the 16 KiB has not been read whole on any model[^unchecked].
* Whether anything on this architecture writes either declared log area[^unchecked].

[^s281]: Read in the firmware. [Section 281](../../../docs/findings.md#s281)
[^s88b]: Measured on a unit. [Section 88](../../../docs/findings.md#s88)
[^s281b]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^t-memory-map]: Measured in configurations. [The test](../../../tests/test_memory_map.py)
[^s295]: Measured on a unit. [Section 295](../../../docs/findings.md#s295)
[^s297]: Measured on a unit. [Section 297](../../../docs/findings.md#s297)
[^s282]: Read in the firmware. [Section 282](../../../docs/findings.md#s282)
[^s88]: Read in the firmware. [Section 88](../../../docs/findings.md#s88)
[^s24]: Measured on a unit. [Section 24](../../../docs/findings.md#s24)
[^s353]: Measured in configurations. [Section 353](../../../docs/findings.md#s353)
[^s206]: Measured in configurations. [Section 206](../../../docs/findings.md#s206)
[^s47]: Read in the firmware. [Section 47](../../../docs/findings.md#s47)
[^s87]: Read in the firmware. [Section 87](../../../docs/findings.md#s87)
[^s189]: Read in the firmware. [Section 189](../../../docs/findings.md#s189)
[^s23]: Measured on a unit. [Section 23](../../../docs/findings.md#s23)
[^s150b]: Measured on a unit. [Section 150](../../../docs/findings.md#s150)
[^s25]: Read in the firmware. [Section 25](../../../docs/findings.md#s25)
[^s303]: Read in the firmware. [Section 303](../../../docs/findings.md#s303)
[^s354]: Read in the firmware. [Section 354](../../../docs/findings.md#s354)
[^s226]: Measured on a unit. [Section 226](../../../docs/findings.md#s226)
[^s22]: Measured on a unit. [Section 22](../../../docs/findings.md#s22)
[^s150]: Stated by Logitech, in their client. [Section 150](../../../docs/findings.md#s150)
[^t-memory-map-client]: Stated by Logitech, in their client. [The test](../../../tests/test_memory_map.py)
[^s304]: Read in the firmware. [Section 304](../../../docs/findings.md#s304)
[^s283]: Read in the firmware. [Section 283](../../../docs/findings.md#s283)
[^s386]: Measured on a unit. [Section 386](../../../docs/findings.md#s386)
[^s387]: Measured on a unit. [Section 387](../../../docs/findings.md#s387)
[^s392]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^s283b]: Measured on a unit. [Section 283](../../../docs/findings.md#s283)
[^s310]: Read in the firmware. [Section 310](../../../docs/findings.md#s310)
[^s326]: Read in the firmware. [Section 326](../../../docs/findings.md#s326)
[^s365]: Read in the firmware. [Section 365](../../../docs/findings.md#s365)
[^s110]: Measured on a unit. [Section 110](../../../docs/findings.md#s110)
[^s284]: Read in the firmware. [Section 284](../../../docs/findings.md#s284)
[^s384]: Read in the firmware. [Section 384](../../../docs/findings.md#s384)
[^unchecked]: Not checked.
