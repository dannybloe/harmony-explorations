# Harmony One: the platform

**Architecture 12**, which Logitech's client calls Gin and which carries one model, the Harmony
One[^s81]. What sets it apart from every other Harmony is that its processor runs the remote's program
straight out of a flash chip beside it, read as ordinary memory, where the Harmony 600, 650 and 700 copy
their program into the processor before running it. Most of what is different about the One for a
programmer follows from that. This folder is for what the platform does; the model's own folder, keys,
screen and behaviour, is [harmony-one](../../remotes/harmony-one/README.md).

## Skins

<!-- generated:skins -->
| skin | model | panel | max devices | favourite channel buttons | newest firmware the forum table knows |
|---|---|---|---|---|---|
| 54 | Harmony One | colour | 15 | 24 | 3.4.0 |
| 59 | Harmony One EMEA | colour | 15 | 24 | 3.4.0 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## Shared, in one table

| | value |
|---|---|
| processor | a PIC18 J-series part with an external memory bus, most likely the 80 pin `PIC18F87J50`; inferred, since the device id is out of reach of every read[^s3] |
| external flash | 4 MiB parallel NOR, Atmel AT49BV322A, `1F:C8`, memory mapped[^s88][^s221] |
| execution | the application runs in place from external flash at `0x020000`, entry point `0x02EA38` in 3.4[^s3][^s1] |
| user configuration | from external `0x040000`; writes stop at `0x3D0000`, where a stored copy of the application sits[^s88] |
| configuration storage | executed in place out of the same flash, which is why a write restarts the remote[^s251] |
| container | `GSPM` and `PTYY`, marker `LWJL`, format `0x1600`, 22 pointer slots[^s7][^s115] |
| internal program memory | the bootloader, safe mode, the programmable logic image and the external flash programmer, [memory.md](memory.md) |
| USB product id | `0xC121`, its own[^s190] |
| the host protocol family | the HID command protocol, which Logitech's client groups with architectures 9 and 14[^s197] |

How these compare with the Harmony 600, 650 and 700 is
[the comparison of architectures](../README.md).

## The files

| file | what it holds |
|---|---|
| [memory.md](memory.md) | the external flash, the two internal pages, Logitech's region names, data memory |
| [firmware.md](firmware.md) | the images, the package and where its parts load, safe mode and the bootloader |
| [usb.md](usb.md) | the commands as this architecture answers them, the write lists |
| [compiler.md](compiler.md) | what Logitech's compiler writes into a configuration for this platform |
| [misc.md](misc.md) | why one platform has one model, and the container beside the Harmony 600's |

## Not checked

* The processor's part number, as above[^unchecked].

[^s81]: Stated by Logitech, in their client. [Section 81](../../../docs/findings.md#s81)
[^s3]: Read in the firmware. [Section 3](../../../docs/findings.md#s3)
[^s88]: Measured on a unit. [Section 88](../../../docs/findings.md#s88)
[^s221]: Measured on a unit. [Section 221](../../../docs/findings.md#s221)
[^s1]: Read in the firmware. [Section 1](../../../docs/findings.md#s1)
[^s251]: Measured on a unit. [Section 251](../../../docs/findings.md#s251)
[^s7]: Measured in configurations. [Section 7](../../../docs/findings.md#s7)
[^s115]: Measured in configurations. [Section 115](../../../docs/findings.md#s115)
[^s190]: Measured on a unit. [Section 190](../../../docs/findings.md#s190)
[^s197]: Stated by Logitech. [Section 197](../../../docs/findings.md#s197)
[^unchecked]: Not checked.
