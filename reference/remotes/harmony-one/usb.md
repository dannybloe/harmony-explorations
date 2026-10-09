# Harmony One: USB

How the One looks on the cable and what it answers. The command protocol is `docs/usb-protocol.md`, whose
section 4 is the One's, and the rails are `packages/usb/src/rails.ts`, with the argument in `CLAUDE.md`'s
"Never write to a remote".

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
| vendor and product id | `046D:C121`, its own; the 600, 650 and 700 share `0xC122` | read in the firmware's descriptor and measured, `docs/usb-protocol.md` sections 1 and 4 |
| `bcdDevice` | `0x1054` | measured, `docs/usb-protocol.md` section 4 |
| interface | HID, interrupt endpoints of 64 bytes at 1 ms; the report descriptor differs from arch 14's in one input item | read in the firmware and measured, `docs/usb-protocol.md` section 1 |
| version block | `34 05 c8 1f c0 36 0c 34 34 16 34 34`: firmware 3.4, hardware 0.5, flash `1F:C8`, architecture 12 and software type 0, skin 54, platform `0x0C`, then the versions of five images | measured on two units, identical, `docs/usb-protocol.md` section 4 |
| in safe mode | the same block with software type 4 | measured, section 190 |
| identity block | internal `0xFF` `+0xF400` | measured; the values are a unit's serial and never appear here |

**Two Harmony Ones enumerate identically**, so the identity block is what the write rails compare,
`assertUnitIsPermitted`, section 226.

## Commands, as this model answers them

* **Reads**: `GET_VERSION`, `READ_FLASH` over external flash and the two internal pages, measured. An odd
  count of internal bytes hangs the remote, so `packages/usb` refuses one everywhere, sections 94 and 96.
* **Live data memory**: `READ_MISC` selector 7 answers, measured, section 111; the battery is selector
  `0x0C`, section 212.
* **The escape** dispatches `0x01`, which ends a session, and `0x02` and `0x03`, which restart; it has no
  `0x05`, read in the firmware, section 97.
* **`WRITE_MISC`** services eight selectors, four of which do nothing on this model; `0x02` drops the
  cached region descriptors and writes no flash, read in the firmware, sections 97 and 246.
* **A write** is an announce, unanswered data packets and an acknowledged end, in transfers of 3150 bytes,
  derived from the firmware and confirmed on hardware, sections 175, 222 and 245.
* **Logitech's classic client reading a One**, captured on the wire, matches this project's encoder on 1312
  of 1312 requests, section 210, and verifies every byte it writes, section 211.
* Read failures of the form "expected 0xbf, got 0x14" were the host dropping queued reports, not the remote,
  section 223.

## Write standing

| path | on this architecture | list in `rails.ts` |
|---|---|---|
| erase and write a configuration block | yes | `ARCHITECTURES_WITH_A_WRITE_TARGET` |
| drop the cached region descriptors | yes | `ARCHITECTURES_WITH_AN_INVALIDATE_TARGET` |
| restart, the escape's `0x02` | yes | `ARCHITECTURES_WITH_A_RESET_TARGET` |
| write a byte of data memory, `WRITE_MISC` `0x07` | yes, the only architecture | `ARCHITECTURES_WITH_A_RAM_WRITE_TARGET` |

Every row also needs `HARMONY_ENABLE_WRITES=1`, its own named door and the unit check. **Which unit may be
written is not in this table**: on this model it is one of two that enumerate alike, `CLAUDE.md`. All four
paths have been sent to a unit, sections 222, 247 and 251.

## Not checked

* `WRITE_MISC` selector `0x0A`, the learn and restart command of other models, does nothing here by the
  firmware's reading, section 246; learning over USB is Logitech's desktop client's, `docs/host-client.md`.
* The internal read window's own bound on this architecture against the one `packages/usb` applies,
  section 175.
