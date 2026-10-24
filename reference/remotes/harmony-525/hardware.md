# Harmony 525: hardware

What is inside, as far as anything here can say. A small Microchip processor runs the remote, a 512 KiB
flash chip beside it holds the configuration and two stored copies of the firmware, four AAA cells power
it and two infrared transmitters send its codes. No 525 has been opened: every part below is known from
what the remote reports over USB, from its firmware, from concordance's tables or from Logitech's manual.
What the architecture's models share is [the architecture folder](../../architectures/harmony-5xx/README.md).

## Processor and memory

| | value |
|---|---|
| processor | a `PIC18F4550` family part, **inferred**: every window bound the firmware's address validator applies is a documented size of that part, 32 KiB of program flash, 256 bytes of EEPROM and 2048 bytes of data memory.[^s119] Concordance names the `PIC18LF4550`.[^x-concordance] The device id has not been read[^unchecked] |
| special function registers | the PIC18F4550 map, which disagrees with the map of the Harmony One's and Harmony 600's parts about 65 of 139 shared addresses[^s80] |
| internal program flash | 32 KiB: a 4 KiB bootloader, then the application from `0x1000`[^s76] |
| on chip EEPROM | 256 bytes. Byte 0 tells the bootloader which firmware image to install;[^s119] the unit identity sits from `0x10`[^s268] |
| data memory | 2048 bytes,[^s119] **not readable over USB**, [usb.md](usb.md) |
| external flash | 512 KiB serial NOR, reported as `FF:12`,[^s76] which concordance's chip table names a 25F040 of eight 64 KiB sectors;[^x-concordance] the manual's "Memory Type Flash", "Memory Amount 512 KB" agrees[^x-manual] |
| how the firmware reaches the external flash | a hardware SPI driver, chip select on `LATE` bit 2; a block erase is the SPI opcode `0xD8`, and every byte written is its own transaction[^s267] |
| erase block | 64 KiB: the blocks either side of an erased one read identical before and after[^s269] |

**The external flash is not memory mapped**, so the remote executes nothing out of the block an erase
clears, and a write does not restart it.[^s269] That is the opposite of the Harmony One. The layout of
both memories is [the architecture's memory.md](../../architectures/harmony-5xx/memory.md).

## Power

| | value |
|---|---|
| cells | "4 x AAA batteries", "Alkaline"[^x-manual] |
| charging | none stated[^x-manual] |
| battery reading over USB | **none known**: the later remotes give the battery level through `READ_MISC` selector `0x0C`, [the command reference](../../usb-protocol/commands.md#read_misc-and-live-ram-over-usb), and this firmware's `READ_MISC` serves selector 1 alone, a parameter by index, [the architecture's usb.md](../../architectures/harmony-5xx/usb.md#read_misc-and-why-there-is-no-live-memory-read)[^s90] |

## Light, motion and infrared

| | value |
|---|---|
| keypad backlight | "Backlit keypad Yes", "Backlight Color Blue"[^x-manual] |
| the Glow key | "Press the Glow button to light up or turn off the display backlight"[^x-manual] |
| status light | "the green ring shaped LED that surrounds the Activities button", lit while commands are sent.[^x-manual] **The drawing disagrees**: `h525.ts` describes that bezel as glowing blue on the product, from a photograph. Not settled, [keys.md](keys.md)[^unchecked] |
| motion sensing | shaking or tilting does not light the backlight; after two hours with no motion the remote goes into Deep Sleep, and motion sensing wakes it[^x-manual] |
| infrared transmitters | 2[^x-manual] |
| range | up to 30 ft[^x-manual] |
| transmit carrier | 15.625 kHz to 500 kHz[^x-manual] |
| learning | yes, up to 250 kHz, "Any IR Device";[^x-manual] the firmware implements the capture.[^s123] Learning on a 525 is not checked[^unchecked] |

## Case

| | value |
|---|---|
| size | 1.9 x 8.0 inch[^x-manual] |
| weight | 5.4 oz with batteries[^x-manual] |
| keys | fifty, every one a matrix button, counted on a unit,[^s89b] [keys.md](keys.md) |

## Not checked

* The processor's marking and device id, and the display controller.[^unchecked]
* The colour of the status light around the Activities key.[^unchecked]
* What the motion sensor is.[^unchecked]
* Learning on a 525.[^unchecked]

[^s119]: Read in the firmware. [Section 119](../../../docs/findings.md#s119)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^unchecked]: Not checked.
[^s80]: Read in the firmware. [Section 80](../../../docs/findings.md#s80)
[^s76]: Measured on a unit. [Section 76](../../../docs/findings.md#s76)
[^s268]: Measured on a unit. [Section 268](../../../docs/findings.md#s268)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 525 user manual](https://www.manualslib.com/manual/454951/Logitech-Harmony-525.html)
[^s267]: Read in the firmware. [Section 267](../../../docs/findings.md#s267)
[^s269]: Measured on a unit. [Section 269](../../../docs/findings.md#s269)
[^s90]: Read in the firmware. [Section 90](../../../docs/findings.md#s90)
[^s123]: Read in the firmware. [Section 123](../../../docs/findings.md#s123)
[^s89b]: Measured on a unit. [Section 89](../../../docs/findings.md#s89)
