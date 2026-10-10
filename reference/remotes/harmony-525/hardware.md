# Harmony 525: hardware

What is inside, as far as anything here can say. No 525 has been opened: every part below is known from
what the remote reports over USB, from its firmware, from concordance's tables or from Logitech's manual.
What the architecture's models share is [the architecture folder](../../architectures/harmony-5xx/README.md).

## Processor and memory

| | value | standing and source |
|---|---|---|
| processor | a `PIC18F4550` family part; concordance names the `PIC18LF4550` | **inferred**: every window bound the firmware's address validator applies is a documented size of that part, 32 KiB of program flash, 256 bytes of EEPROM and 2048 bytes of data memory, read in the firmware, section 119; concordance's architecture table, section 267. The device id has not been read |
| special function registers | the PIC18F4550 map, which disagrees with the map of the Harmony One's and Harmony 600's parts about 65 of 139 shared addresses | `CLAUDE.md` pitfalls, section 80 |
| internal program flash | 32 KiB: a 4 KiB bootloader, then the application from `0x1000` | measured, read whole over USB, section 76 |
| on chip EEPROM | 256 bytes. Byte 0 tells the bootloader which firmware image to install; the unit identity sits from `0x10` | read in the firmware and measured, sections 119 and 268 |
| data memory | 2048 bytes | read in the firmware, section 119; **not readable over USB**, [usb.md](usb.md) |
| external flash | 512 KiB serial NOR, reported as `FF:12`, which concordance's chip table names a 25F040 of eight 64 KiB sectors | measured, sections 76 and 268; concordance, section 267 |
| "Memory Type Flash", "Memory Amount 512 KB" | | Logitech's manual, Product Specification. Agrees with the part |
| how the firmware reaches the external flash | a hardware SPI driver, chip select on `LATE` bit 2; a block erase is the SPI opcode `0xD8`, and every byte written is its own transaction | read in the firmware, section 267 |
| erase block | 64 KiB: the blocks either side of an erased one read identical before and after | measured, section 269 |

**The external flash is not memory mapped**, so the remote executes nothing out of the block an erase
clears, and a write does not restart it, measured, section 269. That is the opposite of the Harmony One.

## Power

| | value | standing and source |
|---|---|---|
| cells | "4 x AAA batteries", "Alkaline" | Logitech's manual, Product Specification |
| charging | none stated | Logitech's manual |
| battery reading over USB | **none**: `READ_MISC` answers only selector 1 on this architecture | read in the firmware, section 90 |

## Light, motion and infrared

| | value | standing and source |
|---|---|---|
| keypad backlight | "Backlit keypad Yes", "Backlight Color Blue" | Logitech's manual |
| the Glow key | "Press the Glow button to light up or turn off the display backlight" | Logitech's manual, "Using the Glow Button" |
| status light | "the green ring shaped LED that surrounds the Activities button", lit while commands are sent | Logitech's manual, "What's on the Harmony 525 screen". **The drawing disagrees**: `h525.ts` describes that bezel as glowing blue on the product, from a photograph. Not settled, [keys.md](keys.md) |
| motion sensing | shaking or tilting does not light the backlight; after two hours with no motion the remote goes into Deep Sleep, and motion sensing wakes it | Logitech's manual, the note under "Using the Glow Button" |
| infrared transmitters | 2 | Logitech's manual |
| range | up to 30 ft | Logitech's manual |
| transmit carrier | 15.625 kHz to 500 kHz | Logitech's manual |
| learning | yes, up to 250 kHz, "Any IR Device" | Logitech's manual; the firmware implements the capture, section 123. Learning on a 525 is **not checked** here |

## Case

| | value | standing and source |
|---|---|---|
| size | 1.9 x 8.0 inch | Logitech's manual |
| weight | 5.4 oz with batteries | Logitech's manual |
| keys | fifty, every one a matrix button, counted on a unit | measured, section 89; [keys.md](keys.md) |

## Not checked

* The processor's marking and device id, and the display controller.
* The colour of the status light around the Activities key.
* What the motion sensor is.
* Learning on a 525.
