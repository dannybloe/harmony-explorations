# Harmony 650: memory

The layout is the architecture's: internal flash of two 64 KiB pages holding the bootloader, safe mode
and the application, and 2 MiB of external SPI flash holding the user configuration from `0x030000`.
That map, its constants and the per unit maps of the 600 and 700 are in
[the architecture's memory.md](../../architectures/harmony-600-650-700/memory.md). This page states only
where the bench Harmony 650 differs or has been measured on its own.

Everything here was read off the bench unit, read only, on 27 September 2026, section 281, unless a row
says otherwise. The lab holds the reads: both internal pages, the whole external flash and the
configuration, which agree byte for byte over the configuration's range.

## Where the 650 differs from the 600

| region | on the 650 | on the 600 | standing and source |
|---|---|---|---|
| external `0x000000` to `0x020000` | **erased**, apart from 69 bytes: the first 48 a copy of the identity block's first 48, and 21 more between `0x180` and `0x337`, unread | a stored copy of the application | measured, section 281 |
| the application anywhere in external flash | **found nowhere** | at `0x000000` | measured, section 281 |
| internal application, `0xFE` `+0x9000` | 0.2, 70336 bytes, entry `0x1A262` | 0.2, 70336 bytes, entry `0x1A26E` | measured, both verify their own checksum, section 281 |
| internal safe mode, `0xFE` `+0x1000` | 0.2, 24320 bytes | the same size, 924 bytes differ | measured, section 281 |
| bootloader, `0xFE` `+0x0000` | 4096 bytes | 1152 of them differ | measured, section 281 |

**A consequence for the lab**: a whole external flash read of this unit carries its identity, in that
block at zero, so a region read of the 650 never leaves the lab for one more reason than a config does.

## The settings store

Internal page `0xFF` `+0xEC00`, the architecture's layout. On the 650: **three records, all setting
`0x80`**, values `0xF8`, `0xFF` and `0xFE`, and the second block erased, measured, section 282. So **no
delay is saved on this remote** and the configuration's own delays govern, which is the opposite of the
Harmony 600, section 303. What setting `0x80` means is **not checked**.

## The identity block

Internal `0xFF` `+0xF400`: 16 bytes of `0xEE` then two GUIDs, measured, sections 226 and 281. The values
are the unit's serial and live only in the lab's `units/h650.txt`; they are never written here.

## Data memory

The addresses of the 0.2 build, which the 600 and 650 share for the routines read, are in
`docs/memory-map-600.md`'s data memory table. **The values were read live on the 650 only**, over
`READ_MISC` selector 7, section 283: the state variables at `0xE10` with the clock as the first seven,
the reload checksum at `0xED2`, the infrared ring at `0x500` kept across a bare restart, the verdict bits
at `0x68B` and the cache drop flag at `0x725`. The current mode is at `0x0A8` and its argument at
`0x0AD`, section 326.

## The configuration on this unit

| | value | source |
|---|---|---|
| as found | 907660 bytes from `0x030000`, built by Logitech's service the day before it was read | measured, section 281 |
| after the Panasonic sync | 1016225 bytes | measured, section 305 |
| state variables | `narrow` 62 on the as found configuration; Logitech's first eight device compile for this skin holds 122 of the 128 a configuration can have | read from configurations, sections 284 and 331 |
| screen bytes | seven tenths to three quarters fixed for the skin | section 317 |

The current contents are in the lab's `reads/`, newest last.

## Not checked

* The 21 bytes between external `0x180` and `0x337`.
* Why the 650 keeps no application copy in external flash, and whether that matters to a reinstall,
  [firmware.md](firmware.md).
* What setting `0x80` in the store means, and what wrote `0xF8`.
* External flash between the end of the configuration and `0x200000` beyond what the region reads cover.
