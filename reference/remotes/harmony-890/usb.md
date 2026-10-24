# Harmony 890: USB

How a Harmony 890 identifies itself on the cable. It does not speak the command protocol the other remotes
here speak; the tunnelled transport it uses instead, and what a read of its configuration does, are stated
once in [the architecture's USB page](../../architectures/harmony-890-895/usb.md).

## What this library holds for it

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | none | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | none read | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | none read | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

**The rows above read `none` because this library holds no profile for this architecture**, and could not
use one: the remote does not answer the command reports the rows describe.

## What the remote states

| | value |
|---|---|
| vendor and product id | `0x046D:0xC112`, the Cappuccino platform, on a tunnelled datagram transport[^s207] |
| `bcdDevice` | not read; the skin is taken from a configuration's own architecture record instead[^s113] |

## Not checked

* Any of it on a cable.[^unchecked]

[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^s113]: Measured in configurations. [Section 113](../../../docs/findings.md#s113)
[^unchecked]: Not checked.
