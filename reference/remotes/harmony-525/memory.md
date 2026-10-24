# Harmony 525: memory

The layout is the architecture's, read on this model: the address windows, the external flash with the
safe mode image at `0x800000`, the application at `0x810000` and the configuration from `0x820000`, the
32 KiB of internal flash and the 256 bytes of EEPROM, [the architecture's
memory.md](../../architectures/harmony-5xx/memory.md). This page carries what a reader of the 525 needs
first, and what its configurations hold.

## The three facts to carry

* **The application is one erase block below the configuration**: `0x810000` against `0x820000`, in 64
  KiB blocks,[^s76][^s269] and the firmware refuses an erase of neither.[^s267]
* **There are two address spaces**: a command names `0x820000`, and the container's own pointers count
  from `0x020000`.[^s76]
* **No memory read of a running remote is known**: the data memory window answers zeros,[^s137] and
  `READ_MISC` serves selector 1 alone,[^s90] so nothing about the clock, the keypad or the validation flags
  is measured.

## What the configurations hold

| | value |
|---|---|
| infrared | class 5 in every record, a dictionary of pulse blocks, [infrared records](../../config-format/infrared-records.md)[^s82] |
| bound key codes | fifty, 1 to 57 with no multiple of eight, [keys.md](keys.md)[^s89c] |
| state variables | the firmware owns 0 to 12;[^s284] the clock is the first seven[^s274] |
| size | a configuration fits one 64 KiB erase block with its trailer checksum, so the whole container sits in the block at `0x820000`[^s269] |
| the space above it | can hold the tail of an earlier configuration, since flash is erased only where a write needs room[^s270] |

## Not checked

* Whether the state variable storage is painted `0xFE` above its declared size at every boot, which is
  read on the other architectures and not on this one.[^s276]
* What the remote keeps in data memory while it runs: no read reaches it.[^unchecked]

[^s76]: Measured on a unit. [Section 76](../../../docs/findings.md#s76)
[^s269]: Measured on a unit. [Section 269](../../../docs/findings.md#s269)
[^s267]: Read in the firmware. [Section 267](../../../docs/findings.md#s267)
[^s137]: Measured on a unit. [Section 137](../../../docs/findings.md#s137)
[^s90]: Read in the firmware. [Section 90](../../../docs/findings.md#s90)
[^s82]: Read in the firmware. [Section 82](../../../docs/findings.md#s82)
[^s89c]: Measured in configurations. [Section 89](../../../docs/findings.md#s89)
[^s284]: Read in the firmware. [Section 284](../../../docs/findings.md#s284)
[^s274]: Read in the firmware. [Section 274](../../../docs/findings.md#s274)
[^s270]: Measured on a unit. [Section 270](../../../docs/findings.md#s270)
[^s276]: Read in the firmware. [Section 276](../../../docs/findings.md#s276)
[^unchecked]: Not checked.
