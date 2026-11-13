# Harmony 785: USB

How a Harmony 785 identifies itself on the cable. The platform's transport and its version block are stated once
in [the architecture's USB page](../../architectures/harmony-880-885/usb.md).

## What this library holds for it

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC110 | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | 0x20, so external flash ends at 0x200000 | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | 0x01, 0x02, 0x03 in the Harmony 880 and 885 application 4.4; other arch 8 models not read | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## What the remote states

| | value |
|---|---|
| vendor and product id | `0x046D:0xC110`[^t-785-first-read] |
| `bcdDevice` | `0x082D`: protocol 8 in the high byte and skin 45 in plain binary in the low, the older of the two forms[^t-785-first-read] |
| product string | `Harmony Remote 0-4.5.0`[^t-785-first-read] |
| version block | seven bytes: application 4.5, the hardware version, flash `0x49` from manufacturer `0x01`, architecture 8 and software type 0, skin 45, platform `0x08`[^t-785-first-read] |

The configuration reader's profile for `0xC110` reads a 785's configuration from `0x020000` whole, as an 885's.[^t-785-first-read]

## Not checked

* Any command beyond the reads: the write end in application 4.5 is not read.[^unchecked]

[^t-785-first-read]: Measured on a unit. [The test](../../../tests/harmony_880_885/test_harmony_785_first_read.py)
[^unchecked]: Not checked.
