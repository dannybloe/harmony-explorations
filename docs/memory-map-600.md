# Memory map: Harmony 600 (architecture 14)

Where everything lives on a Harmony 600. The Harmony 700 is the same architecture and has its own
map in [memory-map-700.md](memory-map-700.md), because the two remotes carry different images and
only one of them has ever been read off a device.

Read [memory-map.md](memory-map.md) first: the addressing rules, the `0xFE` and `0xFF` notation, the
two execution models and the comparison against architecture 12 are all there, and this document
assumes them. Every figure below is measured elsewhere and the **Source** column says where.

One Harmony 600 has been read here, read only, both internal pages and its whole config.

## Internal memory, 128 KiB in two pages

This is where the remote actually runs.

| Page and offset | Length | Contents | Source |
|---|---|---|---|
| `0xFE` `+0x0000` | 3880 used of 4096 | the **bootloader**, no header of its own, reset vector at zero | read off the remote |
| `0xFE` `+0x1000` | 24320 | the **safe mode image**, version 0.2 | own checksum verifies |
| `0xFE` `+0x9000` | 70336 | the **application firmware**, version 0.2, entry point `0x01A26E`, continuing into the next page and ending at `0xFF` `+0xA2C0` | own checksum verifies over all of it |
| `0xFF` `+0xEC00` | 121 | unidentified | |
| `0xFF` `+0xF400` | 48 | the **identity block**: three GUIDs at `+0x00`, `+0x10` and `+0x20`, big endian, and the fourth field erased rather than zero filled | all three match `concordance -i` for that unit |
| `0xFF` `+0xF580` | 4 | unidentified | |
| `0xFF` `+0xF640` | 12 | unidentified | |
| `0xFF` `+0xF6C0` | 4 | unidentified | |
| `0xFF` `+0xF735` | 3 | unidentified | |
| `0xFF` `+0xFFF8` | 6 | the **configuration words**, program `0x1FFF8` to `0x1FFFD` | gputils `18f67j50_g.lkr`; `findings.md` section 25 |

Everything else in both pages is erased, including `0xFE` `+0x6F00` to `+0x9000`.

The application spans the page boundary, which is why it is 70336 bytes and why concordance, reading
a single 64 KiB window, returned 65536 of them and lost the entry point at the end.

**Two addresses are notable for being empty.** `0xFF` `+0x0000` holds no image header, and `0xFF`
`+0xE000` holds nothing at all. On the Harmony One both carry an image and version block fields 9
and 8 name their versions; on this remote both fields read `0x00`. That absence matching an absence
is what placed those two fields.

Architecture 14 reserves internal `0x000000` to `0x008FFF` for the bootloader, 36 KiB, of which only
the first 4 KiB and the safe mode image are used.

## External flash, SPI

Not memory mapped, so this is storage rather than code the processor runs.

**How big it is, is open, and the heading used to say 4 MiB.** Three routes say 2 MiB and one says
4, and the one is the weakest of them. See the note below the table.

| Address | Length | Contents | Source |
|---|---|---|---|
| `0x000000` to `0x0112C0` | 70336 | the **application firmware as stored**, which the bootloader copies to internal `0x9000` | `concordance --dump-firmware` returns the first 64 KiB of exactly this image |
| `0x020000` to `0x021BCB` | 7115 | the **safe mode config**, a `GSPM` container, format 1.4, 20 section slots | read off the device; all ten container checks pass and the recovered base is `0x020000` |
| `0x030000` to `0x400000` | 3904 KiB | the **user config** | read off the device, byte identical to that unit's own `.EZHex`, 738149 of 738149 bytes |

The 1077 bytes after the safe mode container, up to the end of the 8192 that were read, are erased.
Two stretches have never been examined: `0x0112C0` to `0x020000`, and the rest of `0x021BCB` to
`0x030000`.

Same closure as on the One: concordance reports the config region as 3904 KiB, and `0x030000` plus
3904 KiB is exactly `0x400000`.

**Whether the part actually holds 4 MiB is unresolved**, `docs/findings.md` section 87, and the
closure above is the only thing that says it does. Three independent routes say **2 MiB**: the
`FLASH` field this remote reports over USB, `0x15:0x1C`, whose capacity byte `0x15` is 2 MiB in
JEDEC's power of two convention; the part number recorded for it, an EON F16, which is a 16 Mbit
device; and Logitech's own client, which has exactly two arch 14 flash geometries, 1 MiB and 2 MiB,
and no 4 MiB one. The one route that says 4 MiB is concordance's architecture table, which is the
same table that is wrong about firmware on this architecture.

Nothing here is changed on the argument alone, because every number derived from the 4 MiB figure
is an upper bound on a region that a read path never reaches. **One read settles it**: sixteen
bytes at `0x230000`, which is the config's own base plus 2 MiB. A 2 MiB part ignores the high
address bit and returns the config's first bytes, `GSPM`; a 4 MiB part returns what is really at
that address, which is erased. Seeing `GSPM` proves 2 MiB.

## What is not established

* **What is in the 121 bytes at `0xFF` `+0xEC00`**, and in the four small records after the identity
  block. Offsets and lengths only.
* **The two unexamined stretches of external flash** named above.
* **What the 83 bytes are** that separate the 600's safe mode config from the 700's. They sit almost
  entirely in the `LWJL` key table, which is the expected place for two different keypads to differ,
  but nothing here has read them. See `findings.md` section 24.
