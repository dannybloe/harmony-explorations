# Harmony 525: memory

The layout is the architecture's, read on this model: the address windows, the external flash with the
safe mode image at `0x800000`, the application at `0x810000` and the configuration from `0x820000`, the
32 KiB of internal flash and the 256 bytes of EEPROM, [the architecture's memory.md](../../architectures/harmony-5xx/memory.md).
The long form is `docs/memory-map-525.md`. This page carries what a reader of the 525 needs first.

## The three facts to carry

| | value | standing and source |
|---|---|---|
| **the application is one erase block below the configuration** | `0x810000` against `0x820000`, 64 KiB blocks, and the firmware refuses neither | measured and read in the firmware, sections 76, 267 and 269 |
| **two address spaces** | a command names `0x820000`; the container's own pointers count from `0x020000` | measured, section 76 |
| **no memory read of a running remote** | every data memory window answers zeros, so nothing about the clock, the keypad or the validation flags is measured | measured, sections 90 and 137 |

## What the configurations hold

| | value | standing and source |
|---|---|---|
| infrared | class 5 in every record, a dictionary of pulse blocks | read from configurations and in the firmware, section 82 |
| bound key codes | fifty, 1 to 57 with no multiple of eight | read from configurations, section 89 |
| state variables | the firmware owns 0 to 12; the clock is the first seven | read in the firmware and configurations, sections 274 and 284 |
| the configuration fits one erase block | a configuration read here was 51195 bytes, so the whole container, trailer checksum included, sits in the block at `0x820000` | measured on a unit, section 269 |
| the space above it | can hold the tail of an earlier configuration, since flash is erased only where a write needs room | measured on a unit, section 270 |

## Not checked

* Whether the state variable storage is painted `0xFE` above its declared size at every boot, section 276.
* What the remote keeps in data memory while it runs: unreadable by every route this architecture has.
