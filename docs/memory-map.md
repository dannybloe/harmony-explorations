# Memory maps: what is shared

One document per remote, plus this one for everything they have in common, so that the addressing
rules and the architecture comparison are written once rather than once per remote.

| Document | Remote | Architecture | Read off a device |
|---|---|---|---|
| [memory-map-one.md](memory-map-one.md) | Harmony One | 12 | yes, three units |
| [memory-map-600.md](memory-map-600.md) | Harmony 600 | 14 | yes, one unit |
| [memory-map-700.md](memory-map-700.md) | Harmony 700 | 14 | **no**, package only |
| [memory-map-525.md](memory-map-525.md) | Harmony 525 | 9 | yes, one unit |

These five documents derive nothing. Every figure in them is measured elsewhere and each row names
its source, so where one disagrees with `docs/findings.md` or `docs/usb-protocol.md`, those two are
right and the map is stale. `tests/test_memory_map.py` pins the figures a lab image can check.

## Addressing

Every remote here has **two** address spaces, and `READ_FLASH` reaches both. It takes a 24 bit
address and the top byte selects:

| Top byte | Reaches |
|---|---|
| below `0x20` | the external flash |
| `0xFE` | internal program memory, mapping one to one from program address zero |
| `0xFF` | the second internal page |
| anything else | rejected by the firmware |

So `0xFE` and `0xFF` are two 64 KiB pages, 128 KiB of internal memory in total, and the maps write
an address in them as `0xFE` `+0x1000`. `0xFE` maps one to one from program address zero, so `0xFF`
`+0x1234` is program address `0x11234`, and the top of the `0xFF` page is the top of program memory.

The offset within a page is clamped at `0xFFC0`, which is 64 short of the end, so an offset plus a
full report cannot leave the window and **the last two bytes of each page cannot be read**. That
costs nothing: on both parts the program region ends at `0x1FFF7` and the configuration words run
`0x1FFF8` to `0x1FFFD`, so `0x1FFFE` and `0x1FFFF` are neither.

In every table, "erased" means `0xFF` bytes, and a region with no row is erased.

**Reading internal memory is the one place where read only is not the same as harmless.** A
`READ_FLASH` with top byte `0xFE` or `0xFF` restarts the remote when the transfer ends in a one byte
chunk. `packages/usb` caps an internal read at a single chunk, which is a workaround rather than an
explanation. See `docs/usb-protocol.md`.

## Two execution models

This is the difference everything else follows from.

**Architecture 12** stores the application in external parallel NOR at `0x020000` and **executes it
in place** from there. That requires an 80 pin PIC18 J-series part with an external memory bus,
running in extended microcontroller mode: addresses below `0x020000` resolve to internal flash, and
at `0x020000` and above the processor goes out onto the bus.

**Architecture 14** stores the application in external SPI flash at `0x000000` and the processor
cannot execute from there at all, because a `PIC18F67J50` has 64 pins and no external memory bus.
The bootloader copies the image into internal flash at `0x9000` and runs it there. So on
architecture 14 the external flash is storage: the update copy of the firmware, the safe mode config
and the user config.

## The mirror

Both architectures reserve a 128 KiB firmware area in external flash and put it the other way up.

| | architecture 12 | architecture 14 |
|---|---|---|
| MCU | `PIC18F87J50`, inferred | `PIC18F67J50` |
| external flash | 4 MiB parallel NOR | 2 MiB SPI |
| application stored at | external `0x020000` | external `0x000000` |
| application runs from | external `0x020000`, in place | internal `0x9000`, copied |
| safe mode config | external `0x002000`, below the firmware | external `0x020000`, above it |
| safe mode code | internal, role not established | internal `0xFE` `+0x1000` |
| user config | external `0x040000` | external `0x030000` |
| internal memory holds | bootloader and three support images | bootloader, safe mode and the application |
| container format | `0x1600`, 22 pointer slots | `0x1400`, 20 pointer slots |

The user config region does **not** end in the same place on both, and this paragraph said it did
until 29 August 2026. On architecture 12 it runs to `0x400000`, which is `0x040000` plus the 3840 KiB
concordance reports. On architecture 14 it ends at `0x200000`: the firmware refuses every flash
address at or above that, four independent routes agree on a 2 MiB part, and `docs/memory-map-600.md`
has said so since section 88.

**The dead reading was `0x030000` plus concordance's 3904 KiB, landing on `0x400000`.** That figure
needs a 4 MiB part, so most of the region it describes is not addressable at all, and this document
is the one a reader opens first to find out where a config lives. The One's own figure is unaffected
and still measured.

The practical consequence is the one `CLAUDE.md` records as a safety rail. A file named `*-safe.bin`
holds the safe mode region on architecture 12 and the **application** on architecture 14, so a
recovery step written for one architecture restores the wrong thing on the other.

## The top of program memory

Both parts lay out the last words the same way, and gputils states it in the linker script for each:

| Program address | Contents |
|---|---|
| `0x00000` to `0x1FFF7` | program memory, which is the two pages above minus the last eight bytes |
| `0x1FFF8` to `0x1FFFD` | the **configuration words**: oscillator, watchdog, code protection and the rest |
| `0x1FFFE` to `0x1FFFF` | neither, and unreadable anyway |
| `0x3FFFFE` | the device id, outside the window entirely |

The configuration words are read on all three bench remotes, as the six byte run at `0xFF`
`+0xFFF8`. `findings.md` section 25.

## What no map can show

The device id. A PIC18 keeps it at `0x3FFFFE` and the internal read window is the two pages above,
128 KiB, so `MCU_ID` is out of reach on both architectures and the architecture 12 part number stays
inferred rather than measured. The configuration words being where they are is consistent with a
128 KiB part and is not a confirmation, since every sibling with that flash size would agree.

## Where the detail is

* `docs/findings.md` sections 1 to 5 for the images and their headers, 20 to 23 for the sweeps.
* `docs/usb-protocol.md` section 4 for `READ_FLASH`, the region validator and the version block.
* `docs/config-format.md` for what is inside a `GSPM` container.
* `reference/checksums.md` for the provenance of every file the figures came from.
