# Harmony 650: memory

The layout is the architecture's: internal flash of two 64 KiB pages holding the bootloader, safe mode
and the application, and 2 MiB of external SPI flash holding the user configuration from `0x030000`.
That map and its constants are in
[the architecture's memory.md](../../architectures/harmony-600-650-700/memory.md). This page states only
where the Harmony 650 differs, or has been measured on its own. Every row below was read off a 650 over
USB, both internal pages, the whole external flash and the configuration, which agree byte for byte over
the configuration's range[^s281].

## Where the 650 differs from the 600

| region | on the 650 | on the 600 | evidence |
|---|---|---|---|
| external `0x000000` to `0x020000` | **erased**, apart from 69 bytes: the first 48 a copy of the identity block's first 48, and 21 more between `0x180` and `0x337`, unread | a stored copy of the application | [^s281] |
| the application anywhere in external flash | **found nowhere** | at `0x000000` | [^s281] |
| internal application, `0xFE` `+0x9000` | 0.2, 70336 bytes, entry `0x1A262` | 0.2, 70336 bytes, entry `0x1A26E` | [^s281]; both verify their own checksum |
| internal safe mode, `0xFE` `+0x1000` | 0.2, 24320 bytes | the same size, 924 bytes differ | [^s281] |
| bootloader, `0xFE` `+0x0000` | 4096 bytes | 1152 of them differ | [^s281] |

**A consequence**: since the block at external zero copies the identity block's first bytes, a whole
external flash read of a 650 carries the unit's identity[^s281].

## The settings store

Internal page `0xFF` `+0xEC00`, in the architecture's layout,
[its memory page](../../architectures/harmony-600-650-700/memory.md#the-settings-store). A 650 read as
found held **three records, all setting `0x80`**, values `0xF8`, `0xFF` and `0xFE`, with the second block
erased[^s282]. So **no delay was saved on it** and the configuration's own delays governed, which is the
opposite of the Harmony 600 read[^s303]. **Setting `0x80`'s bit 0 decides whether the configuration's
checksum is checked at start**[^s354], and on the 650 it is clear, seen in memory as `0x744` = `0xFE`[^s354b],
so the 650 accepts a configuration on its three markers alone. Its other bits are not
checked[^unchecked].

## The identity block

The architecture's: 16 bytes of `0xEE` then two GUIDs at internal `0xFF` `+0xF400`,
[its memory page](../../architectures/harmony-600-650-700/memory.md#the-identity-block-and-the-records-after-it),
read the same on a 650[^s226][^s281]. The values are one remote's serial and never appear in this
reference.

## Data memory

The 0.2 build's addresses, which the 600 and 650 share for the routines read, are in
[the architecture's memory.md](../../architectures/harmony-600-650-700/memory.md#build-02-the-harmony-600-and-650).
**Most of them were read live on a 650**, over `READ_MISC` selector 7: the state variables at `0xE10`
with the clock as the first seven, the reload checksum, the infrared ring kept across a bare restart, the
verdict bits and the cache drop flag[^s283]. `0x68B` read `0x16` with a good configuration, bit 2 being
its verdict[^s354b].

**After a restart the clock reads the configuration's stamp** plus the seconds since, measured in the
650's state variables[^s283]. The day and the month count from 0 and the weekday from Sunday[^s322].

## A configuration for this skin

| | value | evidence |
|---|---|---|
| size | 907660 bytes as Logitech's service compiled one 650's setup, and 1016225 after a sync adding a television | [^s281], [^s305] |
| state variables | `narrow` 62 on the first; Logitech's eight device compiles for this skin hold up to 122 of the 128 a configuration can have | [^s284], [^s331] |
| screen bytes | seven tenths to three quarters fixed for the skin, the rest the setup's or switched at run time | [^s317] |

## Not checked

* The 21 bytes between external `0x180` and `0x337`[^unchecked].
* Why the 650 keeps no application copy in external flash, and whether that matters to a reinstall,
  [firmware.md](firmware.md)[^unchecked].
* What setting `0x80`'s bits other than bit 0 mean, and what wrote `0xF8`[^unchecked].
* External flash between the end of the configuration and `0x200000`[^unchecked].

[^s281]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^s282]: Measured on a unit. [Section 282](../../../docs/findings.md#s282)
[^s303]: Measured on a unit. [Section 303](../../../docs/findings.md#s303)
[^s354]: Read in the firmware. [Section 354](../../../docs/findings.md#s354)
[^s354b]: Measured on a unit. [Section 354](../../../docs/findings.md#s354)
[^unchecked]: Not checked.
[^s226]: Measured on a unit. [Section 226](../../../docs/findings.md#s226)
[^s283]: Measured on a unit. [Section 283](../../../docs/findings.md#s283)
[^s322]: Read in the firmware. [Section 322](../../../docs/findings.md#s322)
[^s305]: Measured on a unit. [Section 305](../../../docs/findings.md#s305)
[^s284]: Measured in configurations. [Section 284](../../../docs/findings.md#s284)
[^s331]: Measured in configurations. [Section 331](../../../docs/findings.md#s331)
[^s317]: Measured in configurations. [Section 317](../../../docs/findings.md#s317)
