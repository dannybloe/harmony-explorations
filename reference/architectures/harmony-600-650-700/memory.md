# Harmony 600, 650 and 700: memory

Where things live on all three, stated once. The addressing rules, the `0xFE` and `0xFF` notation and
the comparison with the Harmony One are in `docs/memory-map.md` and are not restated.

## What this file carries and what the per unit maps keep

`docs/memory-map-600.md` and `docs/memory-map-700.md` stay where they are. **This file now carries the
parts that are the architecture's**: the constants below, the external flash layout, the internal page
layout and the settings store's shape. The per unit maps keep what is one unit's: the 600's measured
row lengths and its 59 settings records, the 0.2 build's data memory addresses, and the 700 map's list
of what to measure. Where a per unit map and this file disagree, `docs/findings.md` is right and both
are checked against it. The Harmony 650's own differences are in
[its memory.md](../../remotes/harmony-650/memory.md).

**`docs/memory-map-700.md` is out of date on one point**: it says no Harmony 700 has been connected,
and one has since section 295. Its rows marked "presumed" have not been revisited here.

## Constants in the code

<!-- generated:memory-constants -->
| what | value | constant |
|---|---|---|
| external flash size | 2048 KiB | `FLASH_TOP_BYTE_BOUND`, `protocol.ts` |
| user configuration starts at | external 0x030000 | `CONFIG_REGION_BASE`, `rails.ts` |
| highest address a write may reach | external 0x200000 | `WRITABLE_CEILING`, `rails.ts` |
| erase block | 64 KiB | `ERASE_BLOCK_SIZE`, `rails.ts` |
| firmware staging region | external 0x000000 to 0x020000 | `STAGING_REGION`, `rails.ts` |
| settings store | internal page `0xFF` `+0xEC00`, two blocks of 1 KiB | `STORE_OFFSET_IN_PAGE` and `STORE_BLOCK_BYTES`, `settings.ts` |

Generated from `packages/usb/src/protocol.ts`, `rails.ts` and `settings.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Standing: the flash size and ceiling are read in four arch 14 images' address classifiers and measured
on the 600, section 88 and 281; the erase block is read in the same four images, SPI `0xD8`, and
measured by the neighbour check on the 650, section 281; the configuration base is measured on all
three units; the staging region is Logitech's region 2 for skin 66 and was written on the 700 only,
section 297; the store is read in the firmware and measured on the 600 and 650, section 282.

## External flash, 2 MiB SPI

| address | contents | standing and source |
|---|---|---|
| `0x000000` to `0x020000` | the application as stored, or the staging region for an update. **Differs by unit**: an application copy on the 600, erased but for an identity copy on the 650, a staged image on the 700 | measured per unit, sections 281 and 297 |
| `0x020000` | the safe mode configuration, 7115 bytes, format 1.4; its section table byte identical on all three models | measured on the 600, read out of the 650's and 700's packages, section 30 |
| `0x030000` to `0x200000` | the user configuration, 1856 KiB of room | measured on all three |
| `0x1E0000` to `0x200000` | declared as a log area by user configurations | read from configurations, `docs/host-client.md`; nothing on arch 14 is known to write it |

## Internal flash, two 64 KiB pages

| page and offset | contents | standing and source |
|---|---|---|
| `0xFE` `+0x0000` | the bootloader, 4 KiB, which also carries a USB flash programmer | measured on the 600 and 650, section 189; differs between them |
| `0xFE` `+0x1000` | the safe mode image | measured on the 600 and 650, 0.2; the 700's is 2.3, 29888 bytes, section 295 |
| `0xFE` `+0x9000` | the application, running into page `0xFF` | measured on all three |
| `0xFF` `+0xEC00` | the **settings store**: two 1 KiB blocks used one at a time, a four byte header `fc ff 00 00`, then two byte records, setting then value, appended. Settings `0x00` to `0x13` and `0x18` to `0x2B` are the saved power on and inter device delays, which override the configuration's at start | read in the firmware, measured on the 600 and 650, sections 282 and 303 |
| `0xFF` `+0xF400` | the **identity block**: a 16 byte field that is named the serial and holds `0xEE` on every remote read, then two GUIDs, which Logitech's service takes as the serial. `docs/memory-map-600.md` counts the `0xEE` field as a third GUID | measured on the 600, 650 and 700, sections 226 and 281 and `CLAUDE.md`. Values only in the lab |
| `0xFF` `+0xFFF8` | the processor's configuration words | `docs/memory-map.md` |

## Data memory

The addresses differ between builds, so they are per build and not per architecture. The 0.2 build's,
shared by the 600 and 650, are in `docs/memory-map-600.md`; the 0.4 package's and 2.8's few known ones
are in sections 282, 283 and 299.

## Not checked

* External `0x0112C0` to `0x020000` and `0x021BCB` to `0x030000` on the 600, `docs/memory-map-600.md`.
* What setting `0x80` in the store means.
* The four small unidentified records after the identity block.
* Whether anything on this architecture writes the declared log area.
