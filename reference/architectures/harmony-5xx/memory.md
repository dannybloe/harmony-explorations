# Harmony 5xx: memory

Where things live, measured on a Harmony 525 and read in its firmware. The long form, with the predictions
written before the remote arrived kept beside what was measured, is `docs/memory-map-525.md`; the
addressing rules shared with the other architectures are `docs/memory-map.md`. Where either disagrees with
`docs/findings.md`, the findings are right.

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

Standing: the configuration base is measured, section 76; the flash window is measured by trying
addresses and read in the firmware's validator, sections 76 and 119; the erase block is read in the
firmware, the SPI opcode `0xD8`, agrees with concordance's chip table and is measured by the neighbour
check, sections 267 and 269; the ceiling is the start of the log area, so a write stops one block below
it, `WRITABLE_CEILING` in `packages/usb/src/rails.ts`.

## The address space is a set of windows

A protocol address's top byte selects a window, and only one window is flash. Read out of the
validator's own chain, identically in the application and the safe mode image, section 119.

| top byte | offset below | what it is |
|---|---|---|
| `0x00` | `0x8000` | internal program flash, 32 KiB |
| `0x20` | `0x0100` | on chip EEPROM, 256 bytes |
| `0x30` | `0x0008` | eight bytes, whose read arm fetches nothing |
| `0x40` | `0x0800` | data memory, 2048 bytes, which answers zeros whatever it holds, section 137 |
| `0x80` to `0x87` | the block | the serial flash, 512 KiB |

Anything else is refused, and **a refused address is answered with silence rather than an error**, so a
wrong base looks like a broken cable, measured, section 76. `ARCH9_WINDOWS` in
`packages/usb/src/protocol.ts` is the table in executable form.

## External flash, 512 KiB serial

| address | contents | standing and source |
|---|---|---|
| `0x800000` | the **safe mode image**, `HG` framed, loading at program `0x1000`; it reports firmware 2.0 | measured, sections 76 and 118 |
| `0x810000` | the **application firmware**, byte identical to internal `0x1000` onward; the bootloader installs it from here | measured, sections 76 and 118 |
| `0x818000` | the safe mode configuration, 15342 bytes, an `AHCM` container based at `0x018000` | measured, section 76 |
| `0x820000` to `0x870000` | the **user configuration** and the room above it, five 64 KiB blocks | measured, section 76; `CONFIG_REGION_BASE` and `WRITABLE_CEILING` |
| `0x870000` to `0x880000` | the log area, declared by the configuration's base slot 2 | read from configurations, `docs/memory-map-525.md` |

**The application sits one block below the configuration.** An erase at `0x820000` that reached a block
too low would take the running firmware's stored copy, and the firmware does not refuse such an erase,
section 267; [usb.md](usb.md).

**A configuration's own pointers count from `0x020000`, not from `0x820000`.** Both are real: a command
names `0x820000`, and every address inside the container is `0x800000` lower. Computing a length from the
wrong one gives minus 8337413, measured, section 76. `PROFILES` in `packages/corpus/src/read.ts` carries
both, as `configBase` and `containerBase`.

**The space past a configuration's end is not necessarily blank**: on one unit 8629 bytes of earlier
configurations sat above the current one, because flash is erased only where a write needs the room, the
same as on the Harmony One, measured, section 270. So a region read of a 525 can carry a configuration
nobody meant to hand over, and it stays in the lab.

## Internal flash, 32 KiB

| address | contents | standing and source |
|---|---|---|
| `0x0000` to `0x0FFF` | the **bootloader**, 3781 of 4096 bytes used; its reset vector stays inside it and its interrupt vector jumps into the application. It exists in no external image | measured, section 76 |
| `0x1000` to `0x7FFF` | **whichever image the bootloader last installed**: the application normally, the safe mode image after safe mode is entered | measured, sections 76 and 118 |

## EEPROM, 256 bytes

| address | contents | standing and source |
|---|---|---|
| `0x00` | the byte the bootloader reads at every boot to decide which image to install: 2 the application, 1 or 5 safe mode, 3 and 4 an install in progress, 6 an install finished, 0 nothing to do | read in the firmware and measured, section 119 |
| `0x10` | the **unit identity**: a serial field nobody writes and two identifiers that do differ between units; protocol address `0x200010` | measured, section 268. The values are a unit's and never appear in this repository |

The identity and the install byte share one 256 byte part, so the same window carries the least and the
most consequential bytes on the remote, `docs/memory-map-525.md`.

## Data memory

Not readable over USB, sections 90 and 137, so every address here is read in the firmware and none is
measured: the bare scan code at `0x2DE`, section 89; the validation flags byte at `0x109`, section 253;
the action queue's ring from `0x0346` to `0x03BE`, forty three byte instructions, section 254; the state
variable seeder's guard at `0x1A2`, section 274.

## Not checked

* Whether the state variable storage above `narrow + 2 * wide` is painted `0xFE` at every boot, which is
  read on the Harmony One's and the Harmony 600's and 700's images and not on this one, section 276 and
  the `writing-a-config` skill. `todo-later.md` carries it.
* The `0x30` window's purpose.
* Every model here but the Harmony 525.
