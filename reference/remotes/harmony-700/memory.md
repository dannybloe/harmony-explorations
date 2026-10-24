# Harmony 700: memory

The layout is the architecture's: internal flash of two 64 KiB pages holding the bootloader, safe mode
and the application, and 2 MiB of external SPI flash holding the user configuration from `0x030000`.
That map and its constants are in
[the architecture's memory.md](../../architectures/harmony-600-650-700/memory.md). This page states only
where the 700 differs or has been measured on its own.

## Where the 700 differs

| region | on the 700 | evidence |
|---|---|---|
| external flash | 2 MiB, the same part as the 600 and 650, reporting flash id `15:1C`; the configuration may run from `0x030000` to `0x200000`, 1856 KiB | [^s295], [^s300] |
| external `0x000000` to `0x020000` | **the staging region**: the application an install copies from, Logitech's region 2 for skin 66. Erased past the image staged in it | [^s295], [^s297]; `STAGING_REGION` in `packages/usb/src/rails.ts` |
| external `0x020000` to `0x021BCB` | the safe mode configuration, 7115 bytes, format 1.4, byte for byte the 2.8 package's region 3 | [^s295], [^s297] |
| internal `0xFE` `+0x0000` | the bootloader, 4096 bytes, unchanged by both installs | [^s295], [^s297] |
| internal `0xFE` `+0x1000` | safe mode 2.3, 29888 bytes, verifying | [^s295] |
| internal `0xFE` `+0x9000` | the application 2.8, 76672 bytes, entry `0x1BB38`, running into page `0xFF` to `+0xBB80`, 6336 bytes longer than the 600's and well below the install's limit at `+0xEC00`; before 2.8, 2.5 at 71552 bytes | [^s297], [^s295b] |
| internal `0x10000` to `0x10400` | erased on a remote that arrived in safe mode, which is why its application did not verify | [^s295] |
| internal `0xFF` `+0xF400` | the identity block, the architecture's four 16 byte fields; the values are one remote's serial and never appear in this repository | [^s295] |

## The settings store

Internal page `0xFF` `+0xEC00`, the architecture's layout,
[the architecture's memory.md](../../architectures/harmony-600-650-700/memory.md). On a 700 it holds
**only setting `0x80` records**, so no delay is saved on it[^s303][^s296]. A Harmony Desktop sync on a
running 700 appends two of them, `0xFE` and `0xFF`[^s296]. What writes setting `0x80` is only partly
accounted for on any remote of this architecture[^s296b].

## Data memory, the 2.8 build

The addresses differ from the 0.2 builds'. Read in the firmware:

| what | address | evidence |
|---|---|---|
| the verdict bits | `0x68E` | [^s310] |
| the cache drop's erase flag, and its second flag | `0x380`, `0x1E9` | [^s299] |
| the update status byte, on 2.5 and 2.8 | `0x100` | [^s298] |
| the state variables | `0x900 + n` | [^s384] |
| the counter of time since the configuration was built | `0xF0F` | [^s310] |
| the current mode and the mode switch's argument, where the 2.5 build had `0x6E7` and `0x6EC` | `0xF28`, `0xF2D` | [^s326] |
| the bit gating the trailer checksum | `0x3A9` | [^s354] |
| the infrared toggle word | `0x088` | [^s365] |
| the USB poll's state, which runs the charger test; a host having addressed the remote; the charger flag; the charging flag | `0x3AB`, `0x0B0`, `0x0B1`, `0x0B2` | [^s384] |

**Data memory is read live on a 700**: a read over USB found the clock in state variables 0 to 6 and a
configuration's variable at the value the file starts it at, from `0x900` on build 2.8[^s386]. This said
"**No data memory value has been read live on a 700.**"<!--superseded--> until then.

## Not checked

* The 2.8 build's restore path for saved delays: in the 700's configurations it hangs off start list 2
  where the 600's is on list 1[^s303b], and the 2.8 code that runs it is not read[^unchecked].
* External flash past the configuration on a 700[^unchecked].
* What setting `0x80` means[^s296b].

[^s295]: Measured on a unit. [Section 295](../../../docs/findings.md#s295)
[^s300]: Measured on a unit. [Section 300](../../../docs/findings.md#s300)
[^s297]: Measured on a unit. [Section 297](../../../docs/findings.md#s297)
[^s295b]: Read in the firmware. [Section 295](../../../docs/findings.md#s295)
[^s303]: Measured on a unit. [Section 303](../../../docs/findings.md#s303)
[^s296]: Measured on a unit. [Section 296](../../../docs/findings.md#s296)
[^s296b]: Read in the firmware. [Section 296](../../../docs/findings.md#s296)
[^s310]: Read in the firmware. [Section 310](../../../docs/findings.md#s310)
[^s299]: Read in the firmware. [Section 299](../../../docs/findings.md#s299)
[^s298]: Read in the firmware. [Section 298](../../../docs/findings.md#s298)
[^s384]: Read in the firmware. [Section 384](../../../docs/findings.md#s384)
[^s326]: Read in the firmware. [Section 326](../../../docs/findings.md#s326)
[^s354]: Read in the firmware. [Section 354](../../../docs/findings.md#s354)
[^s365]: Read in the firmware. [Section 365](../../../docs/findings.md#s365)
[^s386]: Measured on a unit. [Section 386](../../../docs/findings.md#s386)
[^s303b]: Measured in configurations. [Section 303](../../../docs/findings.md#s303)
[^unchecked]: Not checked.
