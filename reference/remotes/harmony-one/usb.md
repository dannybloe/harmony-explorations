# Harmony One: USB

How the One looks on the cable. What it answers, and which write paths this library opens on it, is
[the platform's USB page](../../architectures/harmony-one/usb.md); the command protocol is
`reference/usb-protocol/`.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC121 | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | 0x40, so external flash ends at 0x400000 | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | 0x01, 0x02, 0x03 | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| field | value | standing and source |
|---|---|---|
| vendor and product id | `046D:C121`, its own; the 600, 650 and 700 share `0xC122` | read in the firmware's descriptor and measured, `reference/usb-protocol/transport.md` |
| `bcdDevice` | `0x1054` | measured, `reference/usb-protocol/transport.md` |
| interface | HID, interrupt endpoints of 64 bytes at 1 ms; the report descriptor differs from arch 14's in one input item | read in the firmware and measured, `reference/usb-protocol/transport.md` |
| version block | `34 05 c8 1f c0 36 0c 34 34 16 34 34`: firmware 3.4, hardware 0.5, flash `1F:C8`, architecture 12 and software type 0, skin 54, platform `0x0C`, then the versions of five images | measured on two units, identical, `reference/usb-protocol/version-block.md` |
| in safe mode | the same block with software type 4 | measured, section 190 |
| identity block | internal `0xFF` `+0xF400` | measured; the values are a unit's serial and never appear here |

**Two Harmony Ones enumerate identically**, so the identity block is what the write rails compare,
`assertUnitIsPermitted`, section 226.

## Not checked

* Learning infrared over USB, which is Logitech's desktop client's, `reference/usb-protocol/commands.md`.
