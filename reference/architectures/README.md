# Architectures

A Harmony's **architecture** is the platform under the model: the processor, the way its memory is laid
out and the firmware family that runs on it. Several models can share one, and a configuration built for
one architecture means nothing to another. Logitech's own software numbers them, and the folders here are
named for the models a reader holds rather than for the number.

| folder | architecture |
|---|---|
| [harmony-5xx](harmony-5xx/README.md) | 9 |
| [harmony-one](harmony-one/README.md) | 12 |
| [harmony-600-650-700](harmony-600-650-700/README.md) | 14 |
| [harmony-300-350](harmony-300-350/README.md) | 16 |
| [harmony-touch](harmony-touch/README.md) | 17 by the Harmony Touch's own report, 18 by Logitech's templates |

Each folder's README says which models it covers and how much of it was measured on which of them.

## Two ways to run a program

This is the difference between the Harmony One and the Harmony 600, 650 and 700 that everything else
follows from, and it is stated for those two architectures only.

**On the Harmony One the processor runs the program out of the flash chip it is stored in.** The
application sits in external parallel NOR at `0x020000`, and the processor executes it in place from
there. That needs a PIC18 J-series part with an external memory bus, running in extended microcontroller
mode: addresses below `0x020000` resolve to the processor's own 128 KiB of flash, and addresses at
`0x020000` and above go out onto the bus[^s3].

**On the Harmony 600, 650 and 700 it cannot.** Their part, a `PIC18F67J50`, has 64 pins and no external
memory bus, so the application stored in external SPI flash at `0x000000` is copied by the bootloader into
internal flash at `0x009000` and runs there. The external flash is storage only: the update copy of the
firmware, the safe mode configuration and the user configuration[^s3].

The Harmony 525's arrangement is a third one, an application in internal flash with stored copies on a
serial chip, [harmony-5xx](harmony-5xx/README.md).

## The firmware area, the other way up

Both architectures reserve a 128 KiB area for the firmware in external flash, and they place it the other
way up: the Harmony One puts it at `0x020000` with the safe mode configuration below it, and the Harmony
600, 650 and 700 put it at `0x000000` with the safe mode configuration above it[^s3].

| | Harmony One | Harmony 600, 650 and 700 |
|---|---|---|
| processor | `PIC18F87J50`, inferred[^s3] | `PIC18F67J50`[^s3] |
| external flash | 4 MiB parallel NOR[^s88] | 2 MiB SPI[^s88] |
| application stored at | external `0x020000`[^s3] | external `0x000000`[^s3] |
| application runs from | external `0x020000`, in place[^s3] | internal `0x9000`, copied[^s3] |
| safe mode configuration | external `0x002000`, below the firmware[^s3] | external `0x020000`, above it[^s3] |
| safe mode code | internal `0xFE` `+0x1000`[^s189] | internal `0xFE` `+0x1000`[^s23] |
| user configuration | external `0x040000` to `0x400000`[^s88] | external `0x030000` to `0x200000`[^s88] |
| internal program memory holds | the bootloader, safe mode, a programmable logic image and the external flash programmer[^s206] | the bootloader, safe mode and the application[^s23] |
| container format | `0x1600`, 22 pointer slots[^s7][^s115] | `0x1400`, 20 pointer slots[^s7][^s115] |

**The user configuration region does not end in the same place on both.** On the Harmony One it runs to
`0x400000`, the end of its 4 MiB part. On the Harmony 600, 650 and 700 the firmware refuses every flash
address at or above `0x200000`, and four independent routes agree on a 2 MiB part[^s88].

## The top of program memory

The two parts above lay out the last words of their program memory the same way, as the linker script
for each states[^s25]:

| program address | contents |
|---|---|
| `0x00000` to `0x1FFF7` | program memory |
| `0x1FFF8` to `0x1FFFD` | the **configuration words**: oscillator, watchdog, code protection and the rest |
| `0x1FFFE` to `0x1FFFF` | neither |
| `0x3FFFFE` | the device id |

The configuration words are read as the six byte run at internal `0xFF` `+0xFFF8`, on a Harmony One and on
a Harmony 600[^s25]. The Harmony 525's part is a different one, a `PIC18F4550` with 32 KiB of program
flash, and this table is not about it[^s119].

## What no read can show

**The device id.** A PIC18 keeps it at `0x3FFFFE`, and a host can read only the two internal pages of 64
KiB each, so it is out of reach on both architectures and the Harmony One's part number stays inferred
rather than measured[^s22]. The configuration words sitting where they do is consistent with a 128 KiB
part and is not a confirmation, since every sibling with that flash size would agree[^s25].

[^s3]: Read in the firmware. [Section 3](../../docs/findings.md#s3)
[^s88]: Measured on a unit. [Section 88](../../docs/findings.md#s88)
[^s189]: Read in the firmware. [Section 189](../../docs/findings.md#s189)
[^s23]: Measured on a unit. [Section 23](../../docs/findings.md#s23)
[^s206]: Measured on a unit. [Section 206](../../docs/findings.md#s206)
[^s7]: Measured in configurations. [Section 7](../../docs/findings.md#s7)
[^s115]: Measured in configurations. [Section 115](../../docs/findings.md#s115)
[^s25]: Measured on a unit. [Section 25](../../docs/findings.md#s25)
[^s119]: Read in the firmware. [Section 119](../../docs/findings.md#s119)
[^s22]: Measured on a unit. [Section 22](../../docs/findings.md#s22)
