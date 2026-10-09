# Memory map: Harmony 700 (architecture 14)

Where everything lives on a Harmony 700, as far as anyone here can say.

**A Harmony 700 has been on the bench since 29 September 2026**, section 295, and both internal pages,
external flash from `0x000000` and the configuration region have been read off it. It arrived in safe
mode, was repaired by reinstalling its own staged 2.5 application, section 295, and was taken to 2.8 by
staging Logitech's image, section 297. Rows below say which figures were measured on that unit and
which still come only from the 2.8 update package or from the two configuration files an owner
published.

**Corrected on 9 October 2026.** This document opened by saying that
"No Harmony 700 has ever been connected"<!--superseded--> to this project, and marked most rows
presumed, and it was not revisited when the unit arrived.
Every row and paragraph that sections 295 to 301 overtook is corrected in place below, with what it
said.

Read [memory-map.md](memory-map.md) first for the addressing rules and the `0xFE` and `0xFF`
notation. The Harmony 600 is the same architecture and has been read in full, so
[memory-map-600.md](memory-map-600.md) is the fuller version of this layout. The per model reference,
[reference/remotes/harmony-700/memory.md](../reference/remotes/harmony-700/memory.md), carries the same
measurements with their standing.

## Internal memory, 128 KiB in two pages

| Page and offset | Length | Contents | Source |
|---|---|---|---|
| `0xFE` `+0x0000` | 4096 | the bootloader | read off the unit as part of page `0xFE`, section 295; unchanged by both installs, sections 295 and 297 |
| `0xFE` `+0x1000` | 29888 | the **safe mode image**, version 2.3, verifying | read off the unit, section 295 |
| `0xFE` `+0x9000` | 76672 | the **application firmware**, version 2.8, entry point `0x01BB38`, continuing into the next page and ending at `0xFF` `+0xBB80` | the 2.8 package, own checksum verifies; **installed and verifying on the unit since section 297**. Before it the unit ran 2.5, 71552 bytes, whose page at `0x10000` to `0x10400` was erased when it arrived, which is why it sat in safe mode, section 295 |
| `0xFF` `+0xEC00` | 2048 | the **settings store**, the architecture's two 1 KiB blocks; on this unit only setting `0x80` records, twelve as found and two more after a Harmony Desktop sync | read off the unit, sections 282 and 296 |
| `0xFF` `+0xF400` | 64 | the **identity block** | read off the unit and compared by the write rails, section 295; its values are one unit's serial and never appear here |

The application row said "nobody here has seen it sitting at that address"<!--superseded-->, and the
bootloader, safe mode and identity rows said "presumed, never read", until 9 October 2026.

It is 6336 bytes longer than the 600's and reaches `0xFF` `+0xBB80`, still well below the read clamp
that [memory-map.md](memory-map.md) describes, and below the install routine's own clamp, which ends any
copy at `0x1EC00`, the settings store, section 295.

## External flash, SPI, 2 MiB

The arch 14 firmware refuses any flash address at or above `0x200000`, section 88, which is 2 MiB.
**The bench unit's part is 2 MiB**: its version block reports flash `15:1C`, EON's 2 MiB part, section
295, and the 2.8 build's own table of accepted parts sizes that code at 2 MiB, section 108 as section
297 reads it.

**This said the model "may hold half that"**<!--superseded-->, and that the package was built for the
smaller part, until 9 October 2026. The reading rested on the 2.8 package's upgrade header stating
`0x14:0x1C`. Section 295 found the same package's `Data.xml` stating `0x15:0x1C` for skin 66, which is
what the unit and the second 700 in the corpus carry, and section 297 that `0x14` is the package's
target and not a limit of the firmware.

| Address | Length | Contents | Source |
|---|---|---|---|
| `0x000000` to `0x020000` | 128 KiB | the **staging region**: the application an install copies from. Held the 2.5 application, 71552 bytes, verifying, when first read; the 2.8 image, 76672 bytes, to `0x012B80`, since section 297 staged it, and erased past it | read off the unit, sections 295 and 297; `STAGING_REGION` in `packages/usb/src/rails.ts` |
| `0x020000` to `0x021BCB` | 7115 | the **safe mode config**, a `GSPM` container, format 1.4 | read off the unit and byte for byte the 2.8 package's `Region_3`, sections 295 and 297 |
| `0x030000` onward | varies | the **user config** | read off the unit, 974009 bytes as it arrived and 1070416 after a Harmony Desktop sync, section 295; the published pair are 979184 and 979242 |

The staging row said its address was "presumed from the 600" and the safe mode config row rested on
the package alone until 9 October 2026.

**The config region runs from `0x030000` to `0x200000`**, 1856 KiB: the firmware refuses every flash
address at or above `0x200000` on this architecture, the part on the unit is 2 MiB, and the write rails
use that ceiling, section 300. This said the size was unknown "because ... no 700 has been
connected"<!--superseded--> until 9 October 2026. Nobody has run `concordance -i` against the unit, so
the figure it would report is still not recorded here.

**Corrected on 29 August 2026.** This offered a different guess: that the One is 3840 KiB and the
600 3904 KiB, "both landing exactly on `0x400000`", so 3904 KiB was the obvious guess. The 600 half
of that was refuted by section 88 and the refutation is in `docs/memory-map-600.md`, so the analogy
was resting on the one number this project had already thrown out. A guess is fine here; a guess
built on a corrected figure is a way of putting a dead number back into circulation.

## The pair of configs

The corpus holds two configs of the same Harmony 700, posted together by their owner with one
documented change between them, 979184 and 979242 bytes. It is the only controlled pair in the
corpus and it is what the section 16 analysis rests on. It is not the bench unit.

It also carries the one unresolved contradiction in the format work: the build timestamps in slot 3
order the pair the opposite way round from the contributor's stated direction of the change. Until that is
settled, a timestamp is not used to order two configs of the same remote. See `findings.md` section
21.

## What the bench unit settled, and what it has not

This section was a list of what a Harmony 700 on the bench would settle, and it is kept as that list
with each item's outcome, since 9 October 2026:

1. **Both internal pages**: read, section 295. The safe mode image is 2.3 and 29888 bytes, and
   `0xFF` `+0xEC00` is the settings store, section 282's layout, holding setting `0x80` records only,
   section 296.
2. **`GET_VERSION`**: read, section 295: firmware, software type, flash `15:1C`, architecture 14 and
   skin 66. The item asked for a third data point on version block fields 7, 10 and 11 as "the three
   still unexplained"<!--superseded-->; they have had readings since section 59, field 10 the safe
   mode image's version and field 11 the application's, and field 7 named as the bootloader's by
   section 190, all on other models. This unit's safe mode image and
   application do carry different versions, 2.3 against 2.5 and then 2.8, and whether its fields 7, 10
   and 11 were compared against them is not recorded.
3. **External `0x020000`**: read, byte for byte the package's region 3, section 295.
4. **The config region size from `concordance -i`**: **not done**. The ceiling above is the firmware's,
   and the region's first `0x120000` bytes have been read and written back, section 300.
5. **The USB product id and the descriptor block**: the unit is opened through the arch 14 profile,
   `0xC122`, [reference/remotes/harmony-700/usb.md](../reference/remotes/harmony-700/usb.md); its
   `bcdDevice` on the unit is **not checked**.
