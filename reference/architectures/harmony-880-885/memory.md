# Harmony 880 and 885: memory

A Harmony 880 or 885 keeps its program and its configuration in one address space. The bottom
64 KiB hold a bootloader that starts the remote, the next 64 KiB the application that runs it, with a
small configuration of its own tucked into its last 8 KiB, and the user's configuration starts at 128 KiB.
This page says what sits where, then how the configuration container is laid out on this architecture,
then the few things in a configuration that are this architecture's own.

Little here was read off a remote: a Harmony 885 answered reads at the application's and the configuration's
addresses, and its identity block at `0x000110`.[^t-arch8-usb] The layout comes from two firmware images of each of the two halves
and from concordance's table, and the container from six configurations, as each footnote says. How a
configuration is laid out in general is [the configuration format](../../config-format/README.md); this
page states what differs here.

## The address space

| address | what | source |
|---|---|---|
| `0x000000` to `0x010000` | the **bootloader**, with the reset vector at zero and no image header; its code ends at `0x0639B` on the 880 and `0x063B1` on the 885. The bootloader erases or writes here only under an unlock, which a host sends or which the bootloader sets around its own one byte write to a hardware version log at `0x000140`, [the bootloader](../../usb-protocol/bootloader.md#a-flash-programmer-for-the-whole-part) | [^s116][^t-885-boot] |
| `0x000104` to `0x000106` | three addresses a host's read or write does not treat as flash: a read whose last byte is `0x000104` or `0x000105`, alone in its chunk, returns the hardware log's newest byte or takes a measurement, and a one byte write to `0x000106` sets the unlock, [usb.md](usb.md#reading-flash) | [^t-885-reads][^t-885-flash] |
| `0x000110` | the remote's **serial number**; the application tests these 48 bytes for being blank at every start, and a blank block keeps the user configuration from being used, [firmware.md](firmware.md#what-the-application-does-at-start) | [^x-concordance][^t-885-start] |
| `0x000140` to `0x000147` | a **hardware version log**, eight one byte entries filled from the bottom; the newest is the version block's hardware field, and both programs can append to it | [^t-885-reads][^t-885-flash] |
| `0x000160` | a **battery calibration word**, which the application tests at start and reports when blank | [^t-885-start] |
| `0x010000` to `0x020000` | the **application firmware**, version 4.4, [firmware.md](firmware.md) | [^s114] |
| `0x01E000` to `0x01FB89` | inside the application's 64 KiB, a **safe mode configuration**: a complete container of 7049 bytes, byte identical in the 880's and the 885's images, which the application runs whenever the user's configuration fails its start check or may not be read, [firmware.md](firmware.md#what-the-application-does-at-start) | [^s114][^t-885-start] |
| `0x020000` | the **user configuration**, the container's own pointers counting from here | [^x-concordance][^s14] |
| `0x1D0000` | where the bootloader copies a staged application from when the status byte asks for status 2, [firmware.md](firmware.md#what-the-bootloader-does-at-power-on), and where Logitech's classic client stages one. What a unit holds there is not checked | [^t-885-boot][^t-885-start-client][^unchecked] |
| `0x1E0000` to `0x1FE000` | the **log area** every configuration declares, 15360 records of 8 bytes | [^s47] |
| `0x1FE040` to `0x1FE0C1` | **devices, not flash**: every immediate load of the table pointer into this range names `0x1FE040`, `0x1FE041`, `0x1FE081` or `0x1FE0C1`, with `0x1FE080` and `0x1FE0C0` reached from them. By the code that uses them they are the keypad lines, the USB controller and the display; that identification is the code's reading and not checked against the hardware | [^t-885-boot][^unchecked] |
| `0x1FFE00` to `0x1FFFFF` | where the bootloader and the application call their RAM copies of the flash programming routines, so a window onto data memory and not flash; inferred from where the copies are placed and called, not from a datasheet | [^t-885-boot] |

**The serial sits below the application**, so a read of the firmware region cannot contain it, and a read
of the bottom 64 KiB, which holds the bootloader, does.[^x-concordance] That address is inside the range
the bootloader's code occupies, so which bytes there are a serial is not checked.[^unchecked]

**The safe mode configuration lives inside the application's region and not in the bootloader's**: the
bottom 64 KiB hold no container at all, in either image. That is the opposite of the Harmony One, whose
safe mode configuration sits at `0x002000` in the bottom 64 KiB.[^s116] It is the oldest configuration
known, built on 3 April 2005, and its architecture record is two zero bytes where a user configuration's
states the architecture and the skin, so the configuration that ships with the firmware names neither.[^s114]

**The log area stops 8 KiB short of 2 MiB**, at `0x1FE000`, where every other architecture's ends on a
round boundary; the stride of 8 bytes is the Harmony 525's and the Harmony 600's as well.[^s47] What the
firmware writes there is not read.[^unchecked] **The top 8 KiB is where the firmware reaches its devices
and its RAM window**, which fits the log area stopping there; whether everything from `0x1FE000` up is
decoded away from flash, rather than only the addresses the firmware uses, is not checked.[^t-885-boot][^unchecked]
So a read there is a bus cycle on a device or on RAM, and neither program's read path refuses one.[^t-885-boot]

## The flash part

**The firmware knows two flash parts and its application reports both as one.** It reads the part's id and
reports an Atmel `1F:C0` as `01:49`, keeps `01:49`, and reports anything else as `FF:FF`, so the `01:49` a
running remote gives in its version block does not say which part is fitted. The bootloader's version
answer gives the part's own bytes.[^t-885-flash][^t-885-boot] Logitech's classic client names `1F:C0`
the `AT49BV163D` and `01:49` the `S29AL016M`, both 2 MiB.[^t-885-flash-client] No datasheet was compared.[^unchecked]

**An erase removes whatever sector of the part holds the address**: the firmware sends the sector erase
command at the host's address unchanged and holds no sector table.[^t-885-flash] **From `0x010000` up every
source has 64 KiB sectors**: Logitech's classic client gives both parts eight 8 KiB blocks below that and
thirty one of 64 KiB above, to `0x200000`, and concordance gives `01:49` sectors of 16, 8, 8 and 32 KiB
below it and 64 KiB above.[^t-885-flash-client][^x-concordance] The bootloader's own staged install erases
once at `0x010000` and then writes 64 KiB, which works only if that sector is at least that large.[^t-885-boot]

**What one erase can take**, with no unlock: the running application and its safe mode configuration at
`0x010000`, the configuration, the staging source at `0x1D0000` and the log area; below `0x010000`, the
bootloader and the identity block, only after the unlock.[^t-885-flash] Erasing `0x010000` erases the code
the remote is running from; that no reply then follows, and that the next start lands in the bootloader,
which can write the application back, is inferred and not checked.[^t-885-flash][^t-885-boot][^unchecked] At `0x1FE000` and up the sector command reaches a device or
the RAM the routine runs from rather than flash, and above `0x3FFFFF` an address may alias low, past the
unlock; both inferred from the processor family and not checked.[^unchecked]

## Data memory

What the application keeps where in its RAM, as far as the write path and the start check read it:[^t-885-start][^t-885-end][^t-885-flash]

| address | what |
|---|---|
| `0x086` | the configuration flags: bit 1 the built in configuration passed, bit 2 the user's passed, bit 3 which of the two every lookup uses |
| `0x100` | the staged install's status, which write misc and read misc selector 6 reach, [firmware.md](firmware.md#what-the-bootloader-does-at-power-on) |
| `0x108` to `0x147` | the state variables, 64 bytes: a narrow variable `i` at `0x108 + i`, the wide ones after the narrow, `0xFE` above the last. The clock is variables 0 to 6, narrow in every configuration read, so at `0x108` to `0x10E` |
| `0x148`, `0x149` | how many narrow and wide variables the running configuration declares |
| `0x23A` | the unlock: `0xA7` lets an erase or a write below `0x010000` through, and it stays set until the application next starts or goes to sleep |

**The storage holds 64 bytes and the counts sit right after it**, so a configuration whose narrow variables
plus twice its wide ones exceed 64 would have the firmware write over its own counts; the 16 containers
read declare 34 to 42.[^t-885-end] Whether the action interpreter's own writes check that bound is not
read.[^unchecked]

## The container

| | value |
|---|---|
| cookie and end marker | `TPTP` and `DKDK`[^s14] |
| marker after the pointer table | `WLWL`, which opens the key table, at offset `0x5F`[^s14][^s20] |
| format word | `0x1500`, which is the pointer count: 21 slots[^s194] |
| pointer table | the base layout of 20 slots with a NULL inserted at slot 8, so everything from base slot 8 up sits one raw slot higher[^s20][^s194] |
| architecture record | raw slot 1, seven bytes: `08 08`, the skin, `0d`, then three zero bytes. `08 08 0f 0d` on an 880 and `08 08 11 0d` on an 885[^s182] |

Where each base slot sits is [the container's table of every architecture](../../config-format/container.md#one-table-four-architectures).[^s194]

**Logitech's classic client states this architecture's container wrongly.** Its constants for
architecture 8 declare 20 pointer slots and a trailer at offset 91[^s206], where four configurations put
the marker at 95, `0x0B + 4 * 21`, so they carry 21.[^s206b] The same constants reproduce architectures 9
and 12 exactly, so it is not a misreading of the client's convention: it is the client describing a
container no configuration here is.

## What a configuration holds that is this architecture's own

The rest of the format is the same as everywhere else and is stated once in
[the configuration format](../../config-format/README.md). These are the places this architecture differs
or where a page there names it:

* **The state variables 0 to 17 are the firmware's**, so a configuration's own variables start at 18, as on
  the Harmony One and the Harmony 600, 650 and 700, where the Harmony 525's firmware owns 0 to 12.[^s284]
  The first seven are the clock, [state](../../config-format/state.md).
* **A device's power on delay is one instruction** at the top of the action list its `Power` variable runs
  when it switches on, as on the Harmony 525 and the Harmony One, where the Harmony 600, 650 and 700 keep it
  in a state variable, [actions](../../config-format/actions.md).[^s235]
* **37 infrared records carry a second group of block pointers**, in four configurations, all in one
  device: the same RC6 command with one payload bit inverted, which is the shape of a toggling code's
  record, [infrared records](../../config-format/infrared-records.md).[^s134] Whether this firmware
  alternates the two groups the way the Harmony One's and the Harmony 650's do is not read.[^unchecked]
* **The screen is 128 by 160**, and the glyph shapes of its fonts are this architecture's own alphabet,
  which the Harmony 890 and 895 share.[^s129][^s180]
* **A scan code is `(line - 1) * 4 + input`**, on a 4 by 16 lattice, [the key table](../../config-format/modes-and-keys.md).[^s144]

## Not checked

* Anything on a remote: which of the two flash parts a unit carries, and whether a unit's layout is the
  images'.[^unchecked]
* What sits between the end of a configuration and the log area, and above the log area.[^unchecked]
* The sector map below `0x010000`, where the two outside sources disagree, against a datasheet.[^unchecked]
* Whether a configuration's state variable writes check the 64 byte bound, and what the firmware appends to
  the log area.[^unchecked]

[^s116]: Read in the firmware. [Section 116](../../../docs/findings.md#s116)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^s14]: Measured in configurations. [Section 14](../../../docs/findings.md#s14)
[^s47]: Measured in configurations. [Section 47](../../../docs/findings.md#s47)
[^unchecked]: Not checked.
[^s20]: Measured in configurations. [Section 20](../../../docs/findings.md#s20)
[^s194]: Measured in configurations. [Section 194](../../../docs/findings.md#s194)
[^s182]: Measured in configurations. [Section 182](../../../docs/findings.md#s182)
[^s206]: Stated by Logitech, in their client. [Section 206](../../../docs/findings.md#s206)
[^s206b]: Measured in configurations. [Section 206](../../../docs/findings.md#s206)
[^s284]: Read in the firmware. [Section 284](../../../docs/findings.md#s284)
[^s235]: Measured in configurations. [Section 235](../../../docs/findings.md#s235)
[^s134]: Measured in configurations. [Section 134](../../../docs/findings.md#s134)
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s180]: Measured in configurations. [Section 180](../../../docs/findings.md#s180)
[^s144]: Read in the firmware. [Section 144](../../../docs/findings.md#s144)
[^t-arch8-usb]: Measured on a unit. [The test](../../../tests/test_arch8_usb.py)
[^t-885-boot]: Read in the firmware. [The test](../../../tests/test_harmony_885_bootloader.py)
[^t-885-start]: Read in the firmware. [The test](../../../tests/test_harmony_885_start_check.py)
[^t-885-start-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_885_start_check.py)
[^t-885-flash]: Read in the firmware. [The test](../../../tests/test_harmony_885_erase_and_write.py)
[^t-885-flash-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_885_erase_and_write.py)
[^t-885-end]: Read in the firmware. [The test](../../../tests/test_harmony_885_write_end.py)
[^t-885-reads]: Read in the firmware. [The test](../../../tests/test_harmony_885_reads.py)
