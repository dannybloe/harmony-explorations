# Harmony 515: USB

How a Harmony 515 identifies itself on the cable. The protocol it speaks and the platform's identity are
stated once in [the architecture's USB page](../../architectures/harmony-5xx/usb.md).

## What this library holds for it

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC111 | `PROFILES` in `packages/corpus/src/read.ts` |
| flash top bytes accepted | 0x80 to 0x87, so external flash is 0x800000 to 0x880000 | `ARCH9_FLASH_TOP_MIN` and `ARCH9_FLASH_TOP_MAX` in `packages/usb/src/protocol.ts` |
| the other windows | 0x00 internal-program-memory below 0x8000, 0x20 eeprom below 0x0100, 0x30 arch9-tag-30 below 0x0008, 0x40 data-memory below 0x0800 | `ARCH9_WINDOWS` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | none read | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## What the remote states

| | value |
|---|---|
| vendor and product id | `046D:C111`, the same as the Harmony 525's[^t-harmony-515] |
| `bcdDevice` | `0x0943`, protocol 9 and skin 67 in plain binary[^t-harmony-515] |
| version block | firmware 3.4, hardware 1.0, flash `FF:12`, architecture 9 with software type 0, skin 67, platform `0x09`[^t-harmony-515] |
| product string | `Harmony Remote 0-3.4.0`[^t-harmony-515] |

**A host tells a 515 from a 525 by the skin**, in `bcdDevice` or the version block, since the product id is
shared.[^t-harmony-515]

## Not checked

* Any command beyond the reads, and the product string in safe mode.[^unchecked]

[^t-harmony-515]: Measured on a unit. [The test](../../../tests/harmony_5xx/test_harmony_515.py)
[^unchecked]: Not checked.
