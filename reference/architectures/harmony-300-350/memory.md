# Harmony 300 and 350: memory

Where things live on both models, stated once. **Nothing here was read as memory off a remote**: the
layout comes from the firmware's own file table, and the configuration from the files a remote serves.

## The file table

The 1.4 firmware carries its filesystem as data: a pool of names at `0x00910A` and a table of 23 records of
11 bytes at `0x0092A6`, each giving a name a medium, an offset and a size. Read in the firmware, section 199
and `tests/test_harmony_350_firmware.py`.

| path | medium and place | what it is |
|---|---|---|
| `/fw/bootloader` | internal `0x000000`, 4 KiB | the bootloader |
| `/fw/safemode` | internal `0x001000`, 32 KiB | the safe mode image |
| `/fw/normalmode` | internal `0x009000`, 89088 bytes, **and** the external medium at `0x000000`, the same size | the application, resident and stored, the arrangement the Harmony 525 has too |
| `/fw/embeddedcfg` | | an embedded configuration |
| `/cfg/usercfg` | external `0x020000`, 256 KiB | **the user configuration** |
| `/sys/guid`, `/sys/pid`, `/sys/sku`, `/sys/battery`, `/sys/flags0` to `/sys/flags3` | seven 64 byte records from internal `0x01F400` | the unit's records; `/sys/guid` identifies a unit |
| `/fw/config_bits` | internal `0x01FFF8`, 8 bytes | the processor's configuration words |
| `/sys/sysinfo` | dynamic, nothing stored | identity text built on request |
| `/ir/ir_cap` | a stream | infrared capture |

Media: `I` internal program flash, 12 files; `E` the external medium, 3; `D` dynamic, 7; `S` a stream, 1,
section 199. The external medium's part and size are **not checked**; concordance reported 512 KiB for a
350, third party, section 194.

## The configuration container

| | value | standing and source |
|---|---|---|
| cookies | `GSPM`, then `LWJL` after the pointer table, then `PTYY` | measured, section 194 |
| pointer slots | 15; the header byte `0x0F` is the count, which is how section 194 found that "format 1.4" was a slot count all along | measured, section 194 |
| the marker's offset | `0x47`, which is `0x0B + 4 * 15`, hardcoded in the firmware's validator | read in the firmware, section 259 |
| base address | `0x020000`, the file's place on the external medium | measured, section 194 |
| slot map | raw slot to base slot in `ARCH16_SLOT_MAP`, `packages/codec/src/gspm.ts`: the name tree, the architecture record, the log area, the clock record, the infrared database, the action list table, the parameter block and the number sender are named; raw 13 is a metadata ZIP that names devices and commands; raw 5, 6, 8, 9, 12 and 14 are unread | read in the firmware and configurations, sections 259, 260 and 262, `docs/config-format.md` |
| the infrared table | allocated at the model's **maximum** device count, four groups on a 300 and eight on a 350, unused groups empty, unlike every other architecture | measured, sections 263 and 264 |
| what is stored | exactly the codes some action list sends | measured on five configurations, sections 261 to 265 |

**A file states its size four bytes short**: `/cfg/usercfg` reports `end_addr - flash_base`, and the read
pads past it rather than serving the `PTYY` marker, so a configuration read as a file needs that marker
appended to be byte identical to concordance's copy, measured on both models, sections 262 and 264.

## Not checked

* The external medium's part and size, and the RAM size.
* Raw slots 5, 6, 8, 9 and 12. Raw 6 holds one more entry than there are devices on both models, and
  whether the extra one is the activity is a candidate, sections 263 to 265.
* Whether the remote keeps a running clock: the configuration has a clock record and the firmware a month
  end routine, section 322, and no state table has been read on this architecture.
