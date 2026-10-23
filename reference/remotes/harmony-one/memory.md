# Harmony One: memory

The long form is `docs/memory-map-one.md`, row by row with a source each, and the addressing rules shared
with the other architectures are `docs/memory-map.md`. This page is the summary a reader needs first, and
where the two disagree, `docs/findings.md` is right.

## External flash, 4 MiB parallel NOR, memory mapped

| address | contents | standing and source |
|---|---|---|
| `0x000000` to `0x000120` | an unidentified table | measured, `docs/memory-map-one.md` |
| `0x002000` to `0x0042C6` | the safe mode configuration, which is also the **status screen library**, 8902 bytes, format 1.6 | measured on two units, byte identical to the 3.4 package's, sections 215 and 244 |
| `0x020000` to `0x02EA92` | the application, 3.4, 60050 bytes, **executed in place** | measured, byte identical to the package, section 3 |
| `0x040000` upward | the user configuration | measured, section 88 |
| `0x3D0000` to `0x3DEA92` | a **second, stored copy of the application**; this is why writes stop at `0x3D0000` | measured on two units, section 88; `WRITABLE_CEILING` in `packages/usb/src/rails.ts` |
| `0x3F0000` to `0x400000` | `00 FF` repeating, last two bytes `0x00`; who writes it is unidentified, and it kills the configuration's log area, which every configuration places at `0x3FFFF0` to `0x400000`, sixteen one byte records | measured on two units, sections 47 and 111; the log area on all 19 distinct compiles, `todo-compile-one.md` 2.2 and 6.4 |

**The space past a configuration's end is not blank**: on one unit 408034 bytes of a previous configuration
sat there, never erased, because flash is only erased where a write needs the room, measured, section 215.
So a region read of a One carries configurations nobody meant to hand over, and never leaves the lab.

**A protocol address's top byte is a page number**, read in the firmware, section 192.

## Internal flash, two 64 KiB pages

| page and offset | contents | standing and source |
|---|---|---|
| `0xFE` `+0x0000` | the bootloader, 4 KiB, no header; also a USB flash programmer of twelve commands that cannot erase below `0x001000` | measured, section 189 |
| `0xFE` `+0x1000` | the safe mode image, 3.4, checksum `0xDB1C` | measured, sections 189 and 190 |
| `0xFF` `+0x0000` | the programmable logic image, 1.6, `0xCB09` | measured, sections 94 and 212 |
| `0xFF` `+0xE000` | the external flash programmer, a callable library, 3.4, `0xD9E9` | measured and read in the firmware, section 191 |
| `0xFF` `+0xF400` | the **identity block**: a field named the serial that holds `0xEE` on every unit, then two GUIDs that do identify one | measured, section 226. The values are a unit's serial and never appear in this repository |
| `0xFF` `+0xF580` | the battery gauge's scale, per unit | measured, section 105 |
| `0xFF` `+0xFFF8` | the processor's configuration words | section 25 |

**The remote states this inventory itself**: in safe mode it lists five images with a checksum and a
version, and four checksums match the images read over USB, seen at the bench, section 190. Two units'
pages differ in 39 bytes, all in the identity block and the two small records after it, measured,
`docs/memory-map-one.md`.

**Two memories answer to the same number**: a table read in the firmware at `0x01F580` reads this internal
page, while `READ_FLASH` at `0x01F580` reads external flash, `docs/memory-map-one.md`.

## Data memory

Read in the firmware and, live, on a unit over `READ_MISC` selector 7, sections 111 and 138: state
variable `n` at `0x108 + n`, the clock the first seven and the firmware's own variables 0 to 17, section
284; the light band at `0x110` and the gauge at `0x111`; the cache drop's descriptors at `0x0EE8`, section
246; the font pointer, the address of the set the next text is drawn in, at `0x2EC` to `0x2EE`, written
by the copy at `0x2B93C` that the font select handler at `0x292AC` calls, in the 3.4 image, section 399. The write path's own variables are in `docs/usb-protocol.md` and are deliberately not repeated
here. At every boot the state variable storage above `narrow + 2 * wide` is painted `0xFE`, section 276.

What a configuration seeds that storage with, measured on all 19 distinct compiles and built so since
`todo-compile-one.md` 6.4 (`docs/config-format.md`, base slot 13): the firmware's variables 13 and 14
start at 1 and 2 with maxima 1 and 4, where the Harmony 600, 650 and 700's start at 0 and 1; every
variable of the configuration's own is one byte, maxima up to 121, and the compiler's `0/65277` at index
`narrow` is the only two byte one, the variable the clock pickers read and write while the time is being set
(section 431, the sixteen English compiles); and the minute, besides moving the hour on, calls a list on every write,
the clock's screen side, which calls two short lists, `todo-compile-one.md` 2.2.

## Not checked

* The table at external `0x000000`, and who writes the `00 FF` block.
* The consumers of the small records at `0xFF` `+0xF5C0` and `+0xF640`.
