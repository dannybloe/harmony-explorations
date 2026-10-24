# Harmony 885: USB

How a Harmony 885 identifies itself on the cable. The protocol it speaks, its version block and the
platform's identity are stated once in [the architecture's USB page](../../architectures/harmony-880-885/usb.md).

## What this library holds for it

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | none | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | none read | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | none read | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**The rows above read `none` because this library holds no profile for this architecture**, not because
the remote has no product id: it reads nothing off one, and refuses rather than guessing a layout. What
the remote states about itself is below.

## What the remote states

| | value |
|---|---|
| vendor and product id | `0x046D:0xC110`, the Espresso platform[^s207] |
| `bcdDevice` | `0x0811` on an 885 and `0x080F` on an 880, protocol 8 and the skin in plain binary; read as BCD the 885's would name a Harmony 655[^s113] |
| version block | firmware 4.4, software type 0, skin 17, field 6 `0x08`, architecture 8, from the application's own constants[^s114] |

## Not checked

* Any of it on a cable.[^unchecked]

[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^s113]: Read in the firmware. [Section 113](../../../docs/findings.md#s113)
[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^unchecked]: Not checked.
