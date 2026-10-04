# Harmony 650: hardware

What is inside, as far as anything here can say. Nothing has been opened: the case of the bench unit
has not been taken apart, so every part below is known from what the remote reports over USB, from its
firmware, or from Logitech's manual. The processor and memory are the architecture's and are stated in
[the architecture's README](../../architectures/harmony-600-650-700/README.md); this page states them
again only where the 650 adds something.

## Processor and memory

| | value | standing and source |
|---|---|---|
| processor | `PIC18F67J50`, the architecture's part | read in the firmware: 64 pins, no external memory bus, application copied into internal flash. The device id at `0x3FFFFE` is outside the read window, so the part is **not measured** on any unit, `docs/memory-map.md` |
| internal flash | 128 KiB in two pages | measured, the 650's own pages `0xFE` and `0xFF` read whole, section 281 |
| external flash | 2 MiB SPI, EON F16, id `15:1C` | measured, version block, section 281; the address classifier of both the 0.2 build and the 0.4 package refuses at `0x200000`, read in the firmware |
| "Memory capacity 2MB, Flash" | | Logitech's manual, Product Specification. Agrees with the measurement |
| flash parts the firmware accepts | seven pairs of capacity and manufacturer, the 700's set; the 600's image accepts six | read in the firmware, section 108 |
| hardware version | 1.2; the bench Harmony 600 reports 1.1 | measured, version block byte 1, lab `reads/` JSON beside each config read. Section 281 says the two differ without stating either |

## Power

| | value | standing and source |
|---|---|---|
| cells | AA alkaline batteries | Logitech's manual, "Battery type AA Alkaline" |
| how many cells | not stated | **not checked** |
| charging | none: the manual names batteries and no charger, where the Harmony 700's manual has a charging chapter and NiMH cells | Logitech's manual, both |
| battery level in the firmware | four of the configuration's 19 pictures are drawn only by programs that switch on state variable 17, which this project **reads** as a battery gauge | inference, section 317; what variable 17 holds is **not checked** |

## Infrared, light and case

| | value | standing and source |
|---|---|---|
| infrared transmitters | 2 | Logitech's manual |
| range | up to 50 ft | Logitech's manual |
| learning | yes, up to 200 kHz | Logitech's manual. Learning on this unit is **not checked** |
| keypad backlight | yes, **yellow** | Logitech's manual. The Harmony 600's and 700's manuals say white |
| size and weight | 8.75 x 2.3 x 1.3 inch, 6 oz with batteries | Logitech's manual; the same figures as the 600 and 700 manuals |
| face | the Harmony 600's, key for key | Danny's statement, [keys.md](keys.md) |

## A sensor for being picked up

The Harmony 600 and 700 manuals say the remote "senses when you pick it up" and lights up, and
MyHarmony lists a `TiltSensor` setting for both, section 292. **The 650's manual says nothing about
it**, and no saved MyHarmony answer for a 650 exists. Whether the 650 has the sensor is **not
checked**; `todo-compile-650.md` 4.3.3 is the open item.

## Not checked

* The processor part on this unit, by any route other than the firmware.
* How many cells, and the battery voltage the firmware treats as low.
* Whether the 650 has a motion or tilt sensor.
* The display controller and panel part: nothing names either for this architecture.
* What else differs between hardware 1.1 and 1.2, beyond the panel.
