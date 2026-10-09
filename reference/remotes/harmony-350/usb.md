# Harmony 350: USB

The protocol and the rails are the architecture's,
[the architecture's usb.md](../../architectures/harmony-300-350/usb.md); this page states what is the 350's
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
| vendor and product id | `046D:C124`, shared with the Harmony 300 | measured, sections 193 and 195 |
| `bcdDevice` | `0x1104`, BCD of 1000 plus skin 104 | measured, section 195 |
| product string | `Harmony Remote 0-1.4.0` | measured, section 193 |
| `/sys/sysinfo` | `arch 0x10`, `skin 0x68` | measured, section 262 |

The 350 is the only skin of its kind, so here `bcdDevice` and the remote's own skin agree, section 195; on a
Harmony 300 they do not.

## What has been read

| | standing and source |
|---|---|
| the factory configuration, by concordance's file family support | measured, section 194 |
| `/sys/sysinfo` and `/cfg/usercfg`, by this library's `openFileBasedRemote`, read only | measured, sections 262 and 263 |
| anything written | **nothing, ever** |

## Not checked

* The other files on `INERT_PATHS`, `/sys/battery` and `/cfg/log` among them.
