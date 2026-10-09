# Harmony 300: USB

The protocol and the rails are the architecture's,
[the architecture's usb.md](../../architectures/harmony-300-350/usb.md); this page states what is the 300's
own.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | none | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | none read | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | none read | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| field | value | standing and source |
|---|---|---|
| vendor and product id | `046D:C124`, shared with the Harmony 350 | measured, section 195 |
| `bcdDevice` | `0x1078` | measured, section 195 |
| `/sys/sysinfo` | skin `0x4F`, 79 | measured, section 264 |

**`bcdDevice` names the wrong skin on a skin 79 unit**: 78, the family's base skin, where the remote's own
`/sys/sysinfo` and configuration say 79, measured, sections 195 and 264. So a skin taken from a listing
without opening the device is the model and not the regional variant.

## What has been read

| | standing and source |
|---|---|
| `/sys/sysinfo` and `/cfg/usercfg`, by this library's `openFileBasedRemote`, read only, as the unit arrived and after it was programmed | measured, sections 264 and 265 |
| anything written | **nothing, ever** |

## Not checked

* The other files on `INERT_PATHS` on a 300.
