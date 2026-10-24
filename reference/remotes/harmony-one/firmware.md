# Harmony One: firmware

What the One runs, what exists of it in the lab, and how it would be recovered. The images themselves,
where each lives, how Logitech's package loads and what safe mode can do are the platform's,
[the platform's firmware page](../../architectures/harmony-one/firmware.md).

## Versions

| version | where | standing and source |
|---|---|---|
| **3.4** | application 60050 bytes at external `0x020000`, entry `0x2EA38`, executed in place; safe mode image, programmable logic 1.6 and the flash programmer library beside it | measured on two units, byte identical to Logitech's package `harmony_one_firmware_3_4.hfw` from the repair site, sections 3 and 88, `docs/checksums.md` |
| 3.4.0 | the forum table's "newest seen" | third party, `reference/capabilities.md` |

The descriptor names `Harmony Remote 0-3.4.0` for the application and `4-3.4.0` in safe mode, the leading
digit being the software type, `reference/usb-protocol/version-block.md`. No other version is known here. Whether Logitech's
software update service serves this model is **not checked**; section 295 reports its 404 for the arch 14
skins only.

## Images in the lab

Never in this repository. Checksums are in `docs/checksums.md`: the package's decoded region, the
application cut from it, the safe mode configuration, and the internal `0xFE` page, read off two units and
byte identical, so any One on 3.4 reproduces it.

## Safe mode and recovery

* **Entered by holding Off while inserting the battery**, announced in about five seconds, seen at the
  bench, section 190. What safe mode then does, and what the bootloader does before it, is
  [the platform's](../../architectures/harmony-one/firmware.md#safe-mode-the-bootloader-and-recovery).
* The `recovering-a-remote` skill is the route to read before any of this.

## Not checked

* Which keys produce the bootloader's two codes.
* Any firmware update path for this model on Logitech's current services.
