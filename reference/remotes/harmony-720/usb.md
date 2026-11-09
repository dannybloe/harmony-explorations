# Harmony 720: USB

How a Harmony 720 identifies itself on the cable. The platform's transport and its version block are stated
once in [the architecture's USB page](../../architectures/harmony-880-885/usb.md).

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
| vendor and product id | `0x046D:0xC110`, the Espresso platform[^s207] |
| version block | application 4.5, skin 44, [firmware.md](firmware.md)[^t-885-boot] |

## Not checked

* Any of it on a cable.[^unchecked]

[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^t-885-boot]: Read in the firmware. [The test](../../../tests/harmony_880_885/test_harmony_885_bootloader.py)
[^unchecked]: Not checked.
