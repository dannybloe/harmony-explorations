# Harmony 300: USB

A Harmony 300 plugs into a computer with a USB cable, and the computer reads and changes its configuration
as files. How that works, which files are read and why nothing here writes to one, is the family's:
[the family's usb.md](../../architectures/harmony-300-350/usb.md) and
[the file protocol](../../usb-protocol/file-protocol.md). This page states what is the 300's own.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | none | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | none read | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | none read | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

The block above says "none" because it reads the command protocol's profiles, which this family is not on;
the product id is `046D:C124`, shared with the Harmony 350, [the family's usb.md](../../architectures/harmony-300-350/usb.md).

| field | value | evidence |
|---|---|---|
| `bcdDevice` | `0x1078`, skin 78 | [^s195] |
| `/sys/sysinfo` | skin `0x4F`, 79 | [^s264] |

**`bcdDevice` names the wrong skin on a skin 79 remote**: 78, the family's base skin, where the remote's own
`/sys/sysinfo` and configuration say 79[^s195][^s264]. Skins 78 and 79 are the 300's two regional
models[^s131]. So a skin taken from a USB listing without opening the device names the model and not its
regional variant. On the Harmony 350, the only skin of its model, the two agree, which is the
control[^s264].

## Not checked

* The other files on `INERT_PATHS` on a 300.
* What decides 78 or 79 on a unit[^unchecked].

[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^s264]: Measured on a unit. [Section 264](../../../docs/findings.md#s264)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^unchecked]: Not checked.
