# Harmony 650: hardware

What is inside, as far as anything here can say. Nothing has been opened: the case of the bench unit
has not been taken apart, so every part below is known from what the remote reports over USB, from its
firmware, or from Logitech's manual. The processor and memory are the architecture's and are stated in
[the architecture's README](../../architectures/harmony-600-650-700/README.md); this page states them
again only where the 650 adds something.

## Processor and memory

| | value | standing and source |
|---|---|---|
| processor | `PIC18F67J50`, the architecture's part | read in the firmware: 64 pins, no external memory bus, application copied into internal flash. The device id at `0x3FFFFE` is outside the read window, so the part is **not measured** on any unit, [the comparison of architectures](../../architectures/README.md#what-no-read-can-show) |
| internal flash | 128 KiB in two pages | measured, the 650's own pages `0xFE` and `0xFF` read whole, section 281 |
| external flash | 2 MiB SPI, EON F16, id `15:1C` | measured, version block, section 281; the address classifier of both the 0.2 build and the 0.4 package refuses at `0x200000`, read in the firmware |
| "Memory capacity 2MB, Flash" | | Logitech's manual, Product Specification. Agrees with the measurement |
| flash parts the firmware accepts | seven pairs of capacity and manufacturer, the 700's set; the 600's image accepts six | read in the firmware, section 108 |
| hardware version | 1.2; the bench Harmony 600 reports 1.1 | measured, version block byte 1, lab `reads/` JSON beside each config read. Section 281 says the two differ without stating either |

## Power

| | value | standing and source |
|---|---|---|
| cells | two AA alkaline batteries, so about 3 V when fresh | Logitech's manual names the type, "Battery type AA Alkaline", and not the count; two is the bench unit |
| how many cells | not stated | **not checked** |
| charging | none: the manual names batteries and no charger, where the Harmony 700's manual has a charging chapter and NiMH cells | Logitech's manual, both |
| battery level in the firmware | none found: the four pictures drawn only by programs switching on state variable 17, once read as a battery gauge (section 317), are the infrared sending indicator | read, section 369: the variable's writers are on the send path, and the icon is seen at the bench while the remote sends |

## Infrared, light and case

| | value | standing and source |
|---|---|---|
| infrared transmitters | 2 | Logitech's manual |
| range | up to 50 ft | Logitech's manual |
| learning | yes, up to 200 kHz | Logitech's manual. Learning on this unit is **not checked** |
| keypad backlight | yes, **yellow** | Logitech's manual. The Harmony 600's and 700's manuals say white |
| size and weight | 8.75 x 2.3 x 1.3 inch, 6 oz with batteries | Logitech's manual; the same figures as the 600 and 700 manuals |
| face | the Harmony 600's, key for key | the project owner's statement, [keys.md](keys.md) |
| a light the configuration sets in four levels, parameter group 3 | the 650's configurations state 10, 20, 8 and 32; the Harmony 600's 1, 3, 5 and 32. The 0.2 build drives it as a PWM on `CCP3` at `LATG` bit 0, its duty from 32 less the level. **Which light it is is not established** | read in the firmware and from configurations, section 392 |

## A sensor for being picked up

The Harmony 600 and 700 manuals say the remote "senses when you pick it up" and lights up, and
MyHarmony lists a `TiltSensor` setting for both, section 292. **The 650's manual says nothing about
it.** **The 650 has one**: with the setting on, tilting the remote while its screen is dark lights the
screen, as a key press does, seen at the bench, section 346; Logitech's service lists `TiltSensor` for
the 650, default on, [features.md](features.md). What part senses it is **not checked**, nothing having
been opened. This page said "no saved MyHarmony answer for a 650 exists"<!--superseded--> and that
"Whether the 650 has the sensor is **not checked**"<!--superseded-->, with `todo-compile-650.md` 4.3.3 as
the open item, until section 346 closed it.

## Not checked

* The processor part on this unit, by any route other than the firmware.
* The battery voltage the firmware treats as low, if it has one. The battery voltage itself can be read
  over USB, in millivolts, `READ_MISC` selector `0x0C` detail 1, section 340.
* The part behind the tilt sensor, and what the flag instruction `3F F101` does in the firmware; that it
  is what arms the sensor is the reading of two compiles, section 346. Whether the 650 has a sensor is
  answered, above.
* The display controller and panel part: nothing names either for this architecture.
* What else differs between hardware 1.1 and 1.2, beyond the panel.
