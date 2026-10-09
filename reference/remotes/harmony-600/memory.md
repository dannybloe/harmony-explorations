# Harmony 600: memory

The layout is the architecture's: internal flash of two 64 KiB pages holding the bootloader, safe mode
and the application, and 2 MiB of external SPI flash holding the user configuration from `0x030000`.
That map and its constants are in
[the architecture's memory.md](../../architectures/harmony-600-650-700/memory.md). The 600's own measured
map, row by row, is `docs/memory-map-600.md`, which stays the long form; this page states only where the
600 differs from the other two.

## Where the 600 differs

| region | on the 600 | standing and source |
|---|---|---|
| external `0x000000` to `0x0112C0` | **a stored copy of the application**, 70336 bytes, which the bootloader copies to internal `0x9000`; the 650 has none and the 700 holds a staged image there | measured, `docs/memory-map-600.md` and section 281 |
| internal application, `0xFE` `+0x9000` | 0.2, 70336 bytes, entry `0x1A26E`, running into page `0xFF` to `+0xA2C0` | measured, verified by its own checksum, section 23 |
| internal safe mode, `0xFE` `+0x1000` | 0.2, 24320 bytes; 924 bytes differ from the 650's | measured, `docs/memory-map-600.md` and section 281 |
| bootloader, `0xFE` `+0x0000` | 3880 of 4096 bytes used, the same USB flash programmer as the Harmony One's, twelve commands with an erase bound of `0x001000`; 1152 bytes differ from the 650's | measured, sections 189 and 281 |
| `0xFF` `+0x0000` and `+0xE000` | **empty**, where the Harmony One holds two images; that absence is what placed version block fields 8 and 9 | measured, `docs/memory-map-600.md` |
| external `0x020000` | the safe mode configuration, 7115 bytes, format 1.4, 20 slots; it differs from the 700's in 83 bytes, almost all in the key table | measured, section 24 |

## The settings store

Internal page `0xFF` `+0xEC00`, the architecture's layout. The 600 is the unit on which **saved delays
were found**: settings `0x00` to `0x13` and `0x18` to `0x2B` are two tables of five power on and five
inter device delays, keyed per device, which the configuration copies over its own at start, read in the
600's 0.2 image and measured, section 303. One was cleared over USB, section 305. The 650's and 700's
stores held only setting `0x80`.

## The identity block

Internal `0xFF` `+0xF400`. `docs/memory-map-600.md` counts three GUIDs there; the architecture's reading
is a 16 byte field of `0xEE` and then two GUIDs, sections 226 and 281, the field named the serial and
identifying nothing. The values are one unit's serial and never appear in this repository.

## Data memory

The 0.2 build's addresses, which the 600 and the 650 share for the routines read, are in
`docs/memory-map-600.md`'s data memory table. **Their values were read live on the Harmony 650 only**,
section 283; on a connected 600 the configuration's own variables were not loaded, section 110. What was
read on a connected 600 is the flash id at `0x686` and `0x687`, `0x15` and `0x1C`, and three
uninitialised bytes beside them, section 110.

## Not checked

* External `0x0112C0` to `0x020000` and `0x021BCB` to `0x030000`, `docs/memory-map-600.md`.
* What setting `0x80` in the store means, and the four small records after the identity block.
* The data memory values of a 600 running its configuration off the cable.
