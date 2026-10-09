# Harmony One: firmware

What the One runs, what exists of it in the lab, and how it would be recovered.

## Versions

| version | where | standing and source |
|---|---|---|
| **3.4** | application 60050 bytes at external `0x020000`, entry `0x2EA38`, executed in place; safe mode image, programmable logic 1.6 and the flash programmer library beside it | measured on two units, byte identical to Logitech's package `harmony_one_firmware_3_4.hfw` from the repair site, sections 3 and 88, `reference/checksums.md` |
| 3.4.0 | the forum table's "newest seen" | third party, `reference/capabilities.md` |

The descriptor names `Harmony Remote 0-3.4.0` for the application and `4-3.4.0` in safe mode, the leading
digit being the software type, `docs/usb-protocol.md`. No other version is known here. Whether Logitech's
software update service serves this model is **not checked**; section 295 reports its 404 for the arch 14
skins only.

**Logitech's client names the images by region**: 0 the bootloader, 1 safe mode, 2 normal mode, 3 the
embedded configuration at `0x002000`, 4 the user configuration at `0x040000`, 5 the programmable logic and
11 the flash programmer library, and version block fields 7 to 11 carry their versions, Logitech's
client, section 212.

## Images in the lab

Never in this repository. Checksums are in `reference/checksums.md`: the package's decoded region, the
application cut from it, the safe mode configuration, and the internal `0xFE` page, read off two units and
byte identical, so any One on 3.4 reproduces it.

## Safe mode and recovery

* **Entered by holding Off while inserting the battery**, announced in about five seconds, seen at the
  bench, section 190. Only the software type nibble of the version block changes, and the remote
  enumerates with the same product id, so enumeration cannot tell, section 190.
* **Entering it destroys nothing**: safe mode copies nothing over the application, unlike the Harmony 525's,
  and a plain power cycle boots normally again, sections 189 and 190.
* Safe mode handles six of the application's seven commands and carries its own external flash programmer,
  so it could rewrite a configuration, read in the firmware, sections 191 and 192. **A restore from a dump
  has never been performed.**
* The bootloader enumerates as a Microchip device and writes internal flash only; it compares two key
  codes at start, `0x0E` and `0x1E`, the second running the safe mode image unvalidated, read in the
  firmware, section 189. Nothing has been sent to it.
* **The application cannot erase its own configuration**: its only route to the external eraser is the USB
  `ERASE_FLASH` handler, so an erased block is a host's doing, read in the firmware, section 243.
* The `recovering-a-remote` skill is the route to read before any of this.

## Not checked

* Which keys produce the bootloader's two codes.
* A restore of a One from its dump.
* Any firmware update path for this model on Logitech's current services.
