# Harmony 350: USB

A 350 plugged into a computer announces itself as a Harmony and says which model it is, and then speaks
a file protocol: a computer asks for a file by its path and gets its bytes. That protocol, what this
library allows over it and the rails are the family's,
[the architecture's usb.md](../../architectures/harmony-300-350/usb.md); this page states what is the
350's own.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | none | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | none read | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | none read | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

The block lists the command protocol's profiles, which this family does not speak, so it names no product
id; the family's id is in `FILE_BASED_PRODUCTS`,
[the architecture's usb.md](../../architectures/harmony-300-350/usb.md#identity), and below.

| field | value |
|---|---|
| vendor and product id | `046D:C124`, shared with the Harmony 300[^s193][^s195] |
| `bcdDevice` | `0x1104`, BCD of 1000 plus skin 104[^s195] |
| product string | `Harmony Remote 0-1.4.0`[^s193] |
| `/sys/sysinfo` | `arch 0x10`, `skin 0x68`[^s262] |

The 350 is the only skin of its kind, so here `bcdDevice` and the remote's own skin agree; on a Harmony 300
they do not, the descriptor naming the family's base skin and the remote its regional one[^s264].

## Not checked

* The other files on `INERT_PATHS`, `/sys/battery` and `/cfg/log` among them.

[^s193]: Measured on a unit. [Section 193](../../../docs/findings.md#s193)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^s262]: Measured on a unit. [Section 262](../../../docs/findings.md#s262)
[^s264]: Measured on a unit. [Section 264](../../../docs/findings.md#s264)
