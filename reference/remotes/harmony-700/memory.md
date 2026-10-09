# Harmony 700: memory

The layout is the architecture's: internal flash of two 64 KiB pages holding the bootloader, safe mode
and the application, and 2 MiB of external SPI flash holding the user configuration from `0x030000`.
That map and its constants are in
[the architecture's memory.md](../../architectures/harmony-600-650-700/memory.md). This page states only
where the 700 differs or has been measured on its own.

**`docs/memory-map-700.md` is out of date**: it was written before any 700 was connected and marks most
rows "presumed". The rows below are the measurements that have since replaced them; that document has
not been revisited.

## Where the 700 differs

| region | on the 700 | standing and source |
|---|---|---|
| external `0x000000` to `0x020000` | **the staging region**: the application an install copies from. Logitech's region 2 for skin 66 | measured, sections 295 and 297; `STAGING_REGION` in `packages/usb/src/rails.ts` |
| external `0x020000` | the safe mode configuration, 7115 bytes, byte for byte the 2.8 package's region 3 on a unit | measured, section 295 |
| internal safe mode, `0xFE` `+0x1000` | 2.3, 29888 bytes, verifying | measured, section 295 |
| internal application, `0xFE` `+0x9000` | 2.8, 76672 bytes, entry `0x1BB38`, running into page `0xFF` to `+0xBB80`, since the install of section 297; before it, 2.5 | measured, sections 295 and 297 |
| internal `0x10000` to `0x10400` | erased on a unit that arrived in safe mode, which is why its application did not verify | measured, section 295 |

## The settings store

Internal page `0xFF` `+0xEC00`, the architecture's layout. On a 700 it held **only setting `0x80`
records**, twelve as found, so no delay was saved, section 303; a Harmony Desktop sync appended two more,
`0xFE` and `0xFF`, section 296. What writes setting `0x80` is only partly accounted for on any unit,
section 296.

## Data memory, the 2.8 build

The addresses differ from the 0.2 builds'. Those read: the verdict bits at `0x68E`, the cache drop's
erase flag at `0x380` and its second flag at `0x1E9`, section 299; the update status byte at `0x100`, read
on 2.5 and 2.8, section 298. **No data memory value has been read live on a 700.**

## The identity block

Internal `0xFF` `+0xF400`, measured, section 295. The values are one unit's serial and never appear in this
repository.

## Not checked

* The 2.8 build's clock, its state variable addresses and its restore path for saved delays.
* External flash past the configuration on a 700.
* What setting `0x80` means.
