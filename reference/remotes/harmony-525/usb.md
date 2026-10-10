# Harmony 525: USB

The protocol, the command set and the write rails are the architecture's,
[the architecture's usb.md](../../architectures/harmony-5xx/usb.md); this page states what is the 525's
own.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC111 | `PROFILES` in `packages/corpus/src/read.ts` |
| flash top bytes accepted | 0x80 to 0x87, so external flash is 0x800000 to 0x880000 | `ARCH9_FLASH_TOP_MIN` and `ARCH9_FLASH_TOP_MAX` in `packages/usb/src/protocol.ts` |
| the other windows | 0x00 internal-program-memory below 0x8000, 0x20 eeprom below 0x0100, 0x30 arch9-tag-30 below 0x0008, 0x40 data-memory below 0x0800 | `ARCH9_WINDOWS` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | none read | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| field | value | standing and source |
|---|---|---|
| vendor and product id | `046D:C111`, its own | measured, section 76 |
| `bcdDevice` | `0x0916`: protocol 9 and skin 22 in plain hex | measured, sections 76 and 195 |
| product string | `Harmony Remote 0-3.0.0`, and `Harmony Safe Mode!` in safe mode | measured, sections 76 and 118 |
| version block | `27 30 25 12 ff 90 16 09`: seven fields | measured, section 76 |
| identity block | EEPROM, protocol address `0x200010` | measured, section 268. The values are a unit's and never appear here |

**The skin is readable without opening the device**, from `bcdDevice`'s low byte, section 195. Whether
the other models of this architecture share the product id is **not checked**. Enumeration does not tell
safe mode from the application: only the product string does, section 118.

## What has been done over USB

| | standing and source |
|---|---|
| identity, configuration, whole internal flash, both external firmware images, EEPROM and the configuration region, all read | measured, sections 76, 119, 268 and 270 |
| data memory, through `READ_MISC` and through the data memory window: answers zeros | measured, sections 90 and 137 |
| one block of the configuration erased and written back unchanged, verified by reading | measured, section 269 |
| the restart, the cache drop, a learn capture, a data memory write | **never sent** |

## Not checked

* `READ_MISC` selector 1 on this model, which a third party reads the clock through, section 90.
* A learn capture.
