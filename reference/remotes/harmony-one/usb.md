# Harmony One: USB

How the One looks on the cable: which numbers it reports, and what tells one Harmony One from another. What
it answers, and which write paths this library opens on it, is
[the platform's USB page](../../architectures/harmony-one/usb.md); the command protocol is
[the USB protocol reference](../../usb-protocol/README.md).

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC121 | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | 0x40, so external flash ends at 0x400000 | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | 0x01, 0x02, 0x03 | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| field | value |
|---|---|
| vendor and product id | `046D:C121`, its own; the 600, 650 and 700 share `0xC122`[^s190], [the transport reference](../../usb-protocol/transport.md) |
| `bcdDevice` | `0x1054`[^s113] |
| interface | HID, interrupt endpoints of 64 bytes at 1 ms; the report descriptor differs from the Harmony 600's in one input item, [the transport reference](../../usb-protocol/transport.md) |
| version block | `34 05 c8 1f c0 36 0c 34 34 16 34 34`: firmware 3.4, hardware 0.5, flash `1F:C8`, architecture 12 and software type 0, skin 54, platform `0x0C`, then the versions of five images[^s190]; field 4 is the architecture[^s57], [the version block reference](../../usb-protocol/version-block.md) |
| in safe mode | the same block with software type 4, and the same product id[^s190] |

## Telling one Harmony One from another

**Two Harmony Ones enumerate identically**, so nothing a computer sees when one is plugged in says which
remote it is[^s226]. What tells them apart is the **identity block** in the processor's internal flash, at
`0xFF` `+0xF400`, whose GUIDs are what Logitech's service takes as a remote's serial[^s226]. The field
named the serial in that block is `0xEE` on every remote read and identifies nothing[^s226]. Where the block
sits beside the rest of internal memory is
[the platform's memory page](../../architectures/harmony-one/memory.md); the values are a remote's serial and
never appear in this reference.

## Not checked

* Learning infrared over USB, which is Logitech's desktop client's,
  [the command reference](../../usb-protocol/commands.md)[^unchecked].

[^s190]: Measured on a unit. [Section 190](../../../docs/findings.md#s190)
[^s113]: Measured on a unit. [Section 113](../../../docs/findings.md#s113)
[^s57]: Measured on a unit. [Section 57](../../../docs/findings.md#s57)
[^s226]: Measured on a unit. [Section 226](../../../docs/findings.md#s226)
[^unchecked]: Not checked.
