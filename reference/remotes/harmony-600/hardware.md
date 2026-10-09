# Harmony 600: hardware

What is inside, as far as anything here can say. No 600 has been opened: every part below is known from
what the remote reports over USB, from its firmware, or from Logitech's manual. The processor and memory
are the architecture's and are stated in
[the architecture's README](../../architectures/harmony-600-650-700/README.md); this page states them
again only where the 600 adds something.

## Processor and memory

| | value | standing and source |
|---|---|---|
| processor | `PIC18F67J50`, the architecture's part | read in the firmware. The device id is outside the read window, so the part is **not measured**, `docs/memory-map.md` |
| internal flash | 128 KiB in two pages | measured, both pages read whole off a unit, `docs/memory-map-600.md` |
| external flash | 2 MiB SPI, EON F16, id `15:1C` | measured: a unit answers at `0x1F0000` and refuses at `0x230000`, and the firmware's address classifier refuses at `0x200000`, section 88 |
| "Memory Amount 2MB", "Memory Type Flash" | | Logitech's manual, Product Specification. Agrees with the measurement |
| flash parts the firmware accepts | six pairs of capacity and manufacturer; the 650's and 700's builds accept seven, the 600's drops EON at 1 MiB | read in the firmware, section 108 |
| hardware version | 1.1; the Harmony 650 reports 1.2 | measured, version block, sections 281 and 302 |

## Power

| | value | standing and source |
|---|---|---|
| cells | "Power Source AA batteries" | Logitech's manual, Product Specification. How many cells it takes is **not stated** there |
| charging | none: the manual names batteries and no charger, where the Harmony 700's manual has a charging chapter | Logitech's manual, both |
| battery voltage over USB | implemented in the firmware, `READ_MISC` selector `0x0C` detail 1, in millivolts | read in the firmware on the 600's image, section 212; **never sent to a 600**, [the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md) |

## Infrared, light and case

| | value | standing and source |
|---|---|---|
| infrared transmitters | 2 | Logitech's manual |
| range | up to 50 ft | Logitech's manual |
| learning | yes, up to 200 kHz, "Any IR Device" | Logitech's manual. Learning on a 600 is **not checked** |
| keypad backlight | yes, **white** | Logitech's manual. The Harmony 650's says yellow |
| size and weight | 8.75 x 2.3 x 1.3 inch, 6 oz with battery installed | Logitech's manual; the same figures as the 650 and 700 manuals |
| face | the face of the 650 and 700, key for key | a statement from the bench holding all three, [keys.md](keys.md) |

## A sensor for being picked up

"The Harmony 600 senses when you pick it up, and lights up the display and buttons", Logitech's manual,
"Setting the backlight timing". Logitech's service lists a tilt sensor setting for the 600, default on,
`reference/capabilities.md`, and MyHarmony a `TiltSensor` setting, section 292. What the sensor is, and
whether the 600's firmware reads it the way the 650's compile switches it, is **not checked**; the
compile side is section 346, read on the Harmony 650.

## Not checked

* The processor part by any route other than the firmware.
* How many AA cells the 600 takes, and the voltage its firmware treats as low.
* The battery voltage reading on a 600.
* The display controller and panel part: nothing names either for this architecture.
* What differs between hardware 1.1 and the 650's 1.2 beyond the panel.
