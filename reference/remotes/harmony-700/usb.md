# Harmony 700: USB

How the 700 looks on the cable and what it answers. The command set, the rails and the write lists are
the architecture's, [the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md); this page
states what is the 700's own and what has been sent to a 700.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC122 | `PROFILES` in `packages/corpus/src/read.ts` |
| first refused flash top byte | 0x20, so external flash ends at 0x200000 | `FLASH_TOP_BYTE_BOUND` in `packages/usb/src/protocol.ts` |
| escape sub commands dispatched | 0x01, 0x02, 0x03, 0x05 | `ESCAPE_SUB_COMMANDS` in `packages/usb/src/protocol.ts` |

Generated from `packages/corpus` and `packages/usb` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

| field | value | standing and source |
|---|---|---|
| vendor and product id | `046D:C122`, the same as the Harmony 600 and 650 | measured, section 281; read in the 2.8 image's descriptor, `docs/usb-protocol.md` section 1 |
| `bcdDevice` | `0x1066` | read in the 2.8 image's descriptor, `docs/usb-protocol.md` section 1; on a unit **not checked** |
| product string | `Harmony Remote 0-2.8.0` | read in the 2.8 image, `docs/usb-protocol.md` section 1 |
| firmware | 2.8 since the install of section 297; 2.5, and 2.3 in safe mode, before it | measured, version block, sections 295 and 297 |
| software type | 4 in safe mode, 0 running | measured, sections 295 and 296 |
| flash id | `15:1C`, EON F16, 2 MiB | measured, version block, section 295 |
| architecture | 14 | measured, version block, section 295 |
| skin | 66 | measured, version block, section 295 |
| identity block | at internal `0xFF` `+0xF400` | measured; its values are one unit's serial and are never written here |

**Telling the 700 from the 600 and 650**: product id, architecture and flash id cannot; the skin and
`bcdDevice` can for a person, and the **identity block** is what the write rails compare, section 281.

## What has been sent to a 700

| command | standing and source |
|---|---|
| `GET_VERSION`, `READ_FLASH` external and both internal pages | measured, read only, section 295 |
| `WRITE_MISC` selector 6, the update status byte, and the restart | **sent**: the reinstall that repaired a unit in safe mode, section 295 |
| `ERASE_FLASH` and `WRITE_FLASH` of the staging region | **sent once**, Logitech's 2.8 image, decision 18, section 297 |
| `ERASE_FLASH` and `WRITE_FLASH`, configuration blocks | measured: a block written back unchanged, section 300; then a power on delay changed and put back, section 301 |
| the cache drop, `WRITE_MISC` selector `0x02`, and the restart | sent as part of that write sequence on 2.8, section 301, after section 299 read the 2.8 drop |
| the settings read and write, `0x13 0xB2` and `0x14 0xB3` | **never sent**; the 2.8 build reaches its own append and it is unread, [the architecture's firmware.md](../../architectures/harmony-600-650-700/firmware.md) |
| the battery voltage, `READ_MISC` selector `0x0C` | implemented in the 700's image, section 212; **never sent to a 700** |
| `READ_MISC` selector 7, live data memory | **never sent to a 700** here |
| `WRITE_MISC` selector `0x07`, a RAM write | **refused** on this architecture by the rails |

The command table's handler addresses in `docs/usb-protocol.md` are given for the 700's 2.8 image and the
Harmony 600's 0.2.

## Not checked

* `bcdDevice` on a unit.
* The settings read and write on a 700.
* Any live data memory read on a 700.
