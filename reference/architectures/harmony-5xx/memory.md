# Harmony 5xx: memory

Where things live on this platform. There are three kinds of memory and a host reaches all of them with
the same read command: the processor's own program flash, which holds the bootloader and the firmware that
runs; a 256 byte EEPROM inside the processor, which holds the remote's identity and the byte that decides
which firmware gets installed; and a 512 KiB serial flash chip beside the processor, which holds the
configuration and two stored copies of the firmware. The processor's working memory exists too, and it is
the one part a host cannot read.

Everything below is measured on a Harmony 525 and read in its firmware; the other models of this
architecture are not checked.[^unchecked] How an address is spelled in a command on every architecture is
[the USB protocol's commands](../../usb-protocol/commands.md#addressing-in-short).

## Constants in the code

<!-- generated:memory-constants -->
| what | value | constant |
|---|---|---|
| external flash size | 512 KiB, at external 0x800000 to 0x880000 | `ARCH9_FLASH_TOP_MIN` and `ARCH9_FLASH_TOP_MAX`, `protocol.ts` |
| user configuration starts at | external 0x820000 | `CONFIG_REGION_BASE`, `rails.ts` |
| highest address a write may reach | external 0x870000 | `WRITABLE_CEILING`, `rails.ts` |
| erase block | 64 KiB | `ERASE_BLOCK_SIZE`, `rails.ts` |
| firmware staging region | none | `STAGING_REGION`, `rails.ts` |
| settings store | none read: its constants are architecture 14's | `ARCHITECTURES_WITH_A_SETTINGS_WRITE_TARGET`, `rails.ts` |

Generated from `packages/usb/src/protocol.ts`, `rails.ts` and `settings.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

The configuration base is measured.[^s76] The flash window is measured by trying addresses and read in the
firmware's validator.[^s76][^s119] The erase block is read in the firmware, agrees with concordance's chip
table and is measured by reading both neighbours of an erased block, below.[^s267][^s269] The ceiling is the
start of the log area, so a write stops one block below it, `WRITABLE_CEILING` in
`packages/usb/src/rails.ts`.[^s47]

## The address space is a set of windows

A protocol address's top byte selects a window, and only one window is flash. Read out of the validator's
own `XORLW` chain, identically in the application and the safe mode image, and every bound is a documented
size of the PIC18F4550, which is why the table is believed as a whole rather than window by
window.[^s119]

| top byte | offset below | what it is |
|---|---|---|
| `0x00` | `0x8000` | internal program flash, 32 KiB |
| `0x20` | `0x0100` | on chip EEPROM, 256 bytes |
| `0x30` | `0x0008` | eight bytes, whose read arm fetches nothing |
| `0x40` | `0x0800` | data memory, 2048 bytes, which answers zeros whatever it holds, [Data memory](#data-memory) |
| `0x80` to `0x87` | the block | the serial flash, 512 KiB |

Anything else is refused, and **a refused address is answered with silence rather than an error**, so a
wrong base looks like a broken cable.[^s76] There is **no `0xFE` window** here, the internal page form the
Harmony One and the Harmony 600, 650 and 700 use: internal flash answers at plain
`0x000000`.[^s76] `ARCH9_WINDOWS` in `packages/usb/src/protocol.ts` is the table in executable form.

## External flash, 512 KiB serial

The part is a 25F040: the flash id it reports is `0xFF:0x12`,[^s76] and concordance's chip table maps that
id to a 25F040 of 512 KiB.[^x-concordance] It is far smaller than the other two architectures' parts, 4 MiB
on the Harmony One and 2 MiB on the Harmony 600, 650 and 700, each fixed by its firmware's own address
validator.[^s88]

| address | length | contents |
|---|---|---|
| `0x800000` | 65536 | the **safe mode image**, `HG` framed, loading at program `0x1000`; it reports firmware 2.0[^s76][^s118] |
| `0x810000` | 65536 | the **application firmware**, byte identical to internal `0x1000` onward; the bootloader installs it from here[^s76][^s118] |
| `0x818000` | 15342 | the **safe mode configuration**, an `AHCM` container based at `0x018000`, inside the application's block[^s76] |
| `0x820000` to `0x870000` | five 64 KiB blocks | the **user configuration** and the room above it[^s76] |
| `0x870000` to `0x880000` | 65536 | the **log area**, declared by the configuration's base slot 2 as 8192 entries at a stride of 8[^s47] |

**The application sits one block below the configuration.** An erase at `0x820000` that reached a block
too low would take the running firmware's stored copy, and the firmware does not refuse such an
erase.[^s267] [usb.md](usb.md) and [firmware.md](firmware.md) have the consequence.

**A configuration's own pointers count from `0x020000`, not from `0x820000`.** Both are real and they are
two address spaces: a command names `0x820000`, the remote is silent at `0x020000`, and every address
inside the container, its `end_addr` included, is `0x800000` lower. Computing a length from the wrong one
gives minus 8337413.[^s76] `PROFILES` in `packages/corpus/src/read.ts` carries both, as `configBase` and
`containerBase`. The safe mode configuration keeps the same offset, based at `0x018000` and read at
`0x818000`.[^s76] In the container's own space the configuration region runs from `0x020000` to the log
area at `0x070000`, and the part ends at `0x080000`.[^s47]

**The erase block is 64 KiB, and four routes agree.** The firmware's driver sends the SPI block erase
opcode `0xD8`, and the classifier subtracts `0x80` out of the top byte, so the accepted tags `0x80` to
`0x87` are exactly eight blocks of 64 KiB, a 512 KiB part.[^s267] Concordance's chip table gives the
same part sector boundaries `0x010000` to `0x080000` a block apart, and its architecture 9 entry carries
the same `0x800000`, `0x810000` and `0x820000` this page does.[^x-concordance] And it is measured: one
block at `0x820000` was erased and rewritten, and the blocks either side, `0x810000` and `0x830000`, were
byte identical before and after.[^s269]

**Writing is a byte at a time**: every byte gets its own write enable, its own three byte address, its
own status poll and its own write disable, so nothing on this part has a page boundary.[^s267]

**The space past a configuration's end is not necessarily blank.** Flash is erased only where a write
needs the room, so the tail of an earlier, longer configuration can survive above the current one, the
same as on the Harmony One.[^s270] A region read of a 525 can therefore carry a configuration nobody meant
to hand over.

## Internal flash, 32 KiB

| address | contents |
|---|---|
| `0x0000` to `0x0FFF` | the **bootloader**, 3781 of 4096 bytes used. The reset vector is `7b ef 07 f0`, a `GOTO 0x0EF6` that stays inside it, and its interrupt vector jumps into the application. It exists in no external image[^s76] |
| `0x1000` to `0x7FFF` | **whichever image the bootloader last installed**: the application normally, byte identical to the stored copy at `0x810000` over all 28672 bytes, and the safe mode image after safe mode is entered[^s76][^s118] |

**Reads of internal flash are refused at an odd count.** On the Harmony One an internal read of an odd
count never terminates and hangs the remote, because the fetch loop reads a word and subtracts two until
the count is zero.[^s94] Whether this processor's read loop shares that shape is not checked, so
`packages/usb` refuses an odd count here too: `ARCH9_WINDOWS` classifies top byte `0x00` as internal
program memory, which puts the refusal over it.[^unchecked] The whole 32 KiB has been read in single
chunk commands of even count without a restart.[^s76]

## EEPROM, 256 bytes

| address | contents |
|---|---|
| `0x00` | the byte the bootloader reads at every boot to decide which image to install: 2 the application, 1 or 5 safe mode, 3 and 4 an install in progress, 6 an install finished, 0 nothing to do, [firmware.md](firmware.md)[^s119] |
| `0x10` | the **unit identity**, protocol address `0x200010`: a serial field nobody writes and two identifiers that do differ between units. Concordance reckons it 48 bytes long; it is read as 64 here[^s268] |

The identity and the install byte share one 256 byte part, so the same window carries the least and the
most consequential bytes on the remote.[^s268] Concordance's firmware update state cell, which its table
places in flash at `0x200000`, is this EEPROM's byte 0.[^s119]

**A Harmony One keeps its identity in program memory**, internal page `0xFF` at `+0xF400`, and asking a
525 for that address is refused by its validator rather than answered, which is how the EEPROM location
was found.[^s268]

## Data memory

**Not readable over USB by any read this library performs.** The data memory window, top byte `0x40`,
answers zeros whatever the memory holds: the bytes in bank 2 that hold the offset and the buffer pointer
of the very read that is answering, `0x279`, `0x27a`, `0x2a6`, `0x2a7` and `0x2ac`, read back as zero
while the read walks.[^s137] The read arm at `0x033BE` is nonetheless real, walking data memory through
`FSR0` and sending each byte, and where it loses the byte is not established.[^s137b] `READ_MISC` does not
fill the gap: its executor serves selector 1 alone, [usb.md](usb.md).[^s90]

So every address here is read in the firmware and none is measured: the bare scan code at
`0x2DE`;[^s89] the validation flags byte at `0x109`;[^s253] the action queue's ring from `0x0346` to
`0x03BE`, forty three byte instructions;[^s254] the state variable seeder's guard at `0x1A2`.[^s274]

## Not checked

* Whether the state variable storage above `narrow + 2 * wide` is painted `0xFE` at every boot, which is
  read on the images of the Harmony One and the Harmony 600 and 700 and not on this one.[^s276]
* The `0x30` window's purpose.[^unchecked]
* What Logitech's client means by its layout for this architecture. It places the safe mode image at
  `0x800000`, the application firmware at `0x810000` and a 32 KiB embedded configuration at `0x820000`,
  and states no user configuration base[^t-host-client]. The first two agree with the table above; at
  `0x820000` a unit holds its user configuration, longer than 32 KiB, and the safe mode configuration sits
  at `0x818000`, inside the block the client calls application firmware. What the client means by it is
  not checked[^unchecked].
* Every model here but the Harmony 525.[^unchecked]

[^unchecked]: Not checked.
[^t-host-client]: Stated by Logitech, in their client. [The test](../../../tests/test_host_client.py)
[^s76]: Measured on a unit. [Section 76](../../../docs/findings.md#s76)
[^s119]: Read in the firmware. [Section 119](../../../docs/findings.md#s119)
[^s267]: Read in the firmware. [Section 267](../../../docs/findings.md#s267)
[^s269]: Measured on a unit. [Section 269](../../../docs/findings.md#s269)
[^s47]: Measured in configurations. [Section 47](../../../docs/findings.md#s47)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s88]: Read in the firmware. [Section 88](../../../docs/findings.md#s88)
[^s118]: Measured on a unit. [Section 118](../../../docs/findings.md#s118)
[^s270]: Measured on a unit. [Section 270](../../../docs/findings.md#s270)
[^s94]: Read in the firmware. [Section 94](../../../docs/findings.md#s94)
[^s268]: Measured on a unit. [Section 268](../../../docs/findings.md#s268)
[^s137]: Measured on a unit. [Section 137](../../../docs/findings.md#s137)
[^s137b]: Read in the firmware. [Section 137](../../../docs/findings.md#s137)
[^s90]: Read in the firmware. [Section 90](../../../docs/findings.md#s90)
[^s89]: Read in the firmware. [Section 89](../../../docs/findings.md#s89)
[^s253]: Read in the firmware. [Section 253](../../../docs/findings.md#s253)
[^s254]: Read in the firmware. [Section 254](../../../docs/findings.md#s254)
[^s274]: Read in the firmware. [Section 274](../../../docs/findings.md#s274)
[^s276]: Read in the firmware. [Section 276](../../../docs/findings.md#s276)
