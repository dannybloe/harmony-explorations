# Harmony 5xx: firmware

What a Harmony 525 runs, where it is stored, and what is known about installing it. Read off one unit and
out of its own images; the other models of this architecture are **not checked**. The rail that matters
most here is at the end: **safe mode is a one way door on this model**.

## Images

| image | where | standing and source |
|---|---|---|
| bootloader | internal `0x0000` to `0x0FFF`, in no external image, so only the device has it | measured, section 76 |
| **application 3.0** | runs from internal `0x1000`; stored at external `0x810000`, `HG` framed at `+4` and `GH` at `0x6FFE`, entry `GOTO 0x07FB4` | measured: internal and external byte identical over 28672 bytes, section 76; `reference/checksums.md` |
| **safe mode image 2.0** | stored at external `0x800000`, loading at `0x1000` too; it reports software type 4 | measured, sections 76 and 118 |

There is **no Logitech package** of this firmware here: the images came off a unit, `reference/checksums.md`,
and Logitech's current software update service serves the file based and Linux generations, section 196.
The model's manual has its owner update firmware through the classic Harmony Remote Software, Logitech's
manual, "Upgrading your Harmony 525 firmware".

The application's USB descriptor block has a second, Microchip stock descriptor left in beside it,
claiming `04D8:000B`, which validates as well as the real one, section 113 and `docs/usb-protocol.md`.

## Routines read on the application image

| routine | section |
|---|---|
| the USB command dispatch, seven commands | 267 |
| the address validator and its windows | 119 |
| the external flash eraser and writer, the SPI driver | 267 |
| `READ_MISC`, whose executor has a body for selector 1 alone | 90 |
| the infrared capture | 123 |
| the keypad scanner | 89 |
| the configuration validator and the status screen choice | 253 |
| the action queue ring | 254 |
| the state variable seeder and which variables the firmware owns | 274, 284 |
| the version accessors | 87, 118 |

**Not read**: the escape command's dispatcher, which is why the restart is refused on this architecture,
section 269; `WRITE_MISC` selector 7, which is why the data memory write is refused, section 269. The
cache drop, `WRITE_MISC` selector 2, is on the invalidate list because it came with the write list's
permission and the list keeps what was permitted, and it has never been sent to a 525,
`packages/usb/src/rails.ts`; no reading of its executor on this image is recorded.

## How the bootloader chooses an image

At every boot it reads EEPROM byte 0 and acts on it, read in the firmware and measured, section 119:

| byte 0 | what the bootloader does |
|---|---|
| 2 | copies the application from external flash into internal flash, marking 4 first and 6 on success |
| 1 or 5 | copies the safe mode image, marking 3 first and 6 on success |
| 3 or 4 | an interrupted install: does it again |
| 6 | nothing; the running application sees it, writes 0 and puts a message on the screen |
| 0 or anything else | nothing: runs what is resident |

**If installing the application fails, it installs safe mode instead**, so a failed copy lands in safe
mode rather than nowhere, section 119.

## Safe mode is a one way door

* **Entered by holding Off while the batteries go in**, a repair shop's procedure followed on a unit,
  section 118.
* **Entering it destroys the application in internal flash.** The part's 32 KiB hold the bootloader and
  one image, so the bootloader copies the safe mode image over the application, measured on a unit by
  reading internal flash before and after, section 118. The stored copy at `0x810000` survives.
* **A power cycle does not leave it**: the safe mode image is what is resident and byte 0 asks for
  nothing, section 119.
* **Leaving it needs the application copied back**, which is byte 0 set to 2 and a restart. That was
  performed once, by hand, from a script in the private lab, and the unit came back with its application
  and its configuration intact, section 119. **This project's write path does not perform it**: the
  EEPROM is outside the writable range, and installing firmware on an irreplaceable unit is not what a
  write path this young should do, the `recovering-a-remote` skill.

**So safe mode must never be entered on this model as an experiment**, `CLAUDE.md`. The Harmony One and
the Harmony 600, 650 and 700 keep their safe mode image resident beside the application and lose nothing
by entering it.

**And the stored copies are what make recovery possible at all.** An erase that took `0x800000` and
`0x810000` would leave a remote with no route back to either image, and the firmware itself does not
refuse one, section 267; [usb.md](usb.md).

## Not checked

* Any firmware for this architecture other than the 525 unit's 3.0 and 2.0.
* Whether the key combination at power on touches EEPROM byte 0, section 119.
* The escape dispatcher, the cache drop and `WRITE_MISC` selector 7 on this image.
* Whether an odd count internal read hangs this model as it hangs a Harmony One; `packages/usb` refuses
  one here too, because nothing says it does not, `docs/memory-map-525.md`.
