# Harmony 700: hardware

What is inside, as far as anything here can say. No 700 has been opened: every part below is known from
what the remote reports over USB, from its firmware, or from Logitech's manual. The processor and memory
are the architecture's and are stated in
[the architecture's README](../../architectures/harmony-600-650-700/README.md); this page states them
again only where the 700 adds something.

## Processor and memory

| | value | standing and source |
|---|---|---|
| processor | `PIC18F67J50`, the architecture's part | read in the firmware. The device id is outside the read window, so the part is **not measured**, `docs/memory-map.md` |
| internal flash | 128 KiB in two pages | measured, both pages read off a unit, section 295 |
| external flash | 2 MiB SPI, EON F16, id `15:1C` | measured, version block, section 295; the 2.8 build's classifier refuses at `0x200000`, read in the firmware, section 88 |
| the package's flash part | the 2.8 package's upgrade header states `0x14:0x1C`, which reads as 1 MiB, and its `Data.xml` states `0x15:0x1C` | read in the package, sections 295 and 297. So the half sized part `docs/memory-map-700.md` allowed for until 9 October 2026 was the package's target and not a measurement |
| "Memory Amount 2MB", "Memory Type Flash" | | Logitech's manual, Product Specification. Agrees with the unit |
| flash parts the firmware accepts | seven pairs of capacity and manufacturer, the 650's set; the 600's image accepts six | read in the firmware, section 108 |
| hardware version | **not recorded** in any document here | **not checked** |

## Power and charging

| | value | standing and source |
|---|---|---|
| cells | "Power Source Rechargeable", "Power Type NiMH AA" | Logitech's manual, Product Specification |
| charging | "insert the USB cable into the top of the remote, plug the other end of the cable into the AC adaptor, and then plug the AC adaptor into a wall outlet and charge" | Logitech's manual page 10, "Charging your remote" |
| replacement cells | "Use only NiMH replacement batteries, size AA R6 with a minimum of 1800 mA" | Logitech's manual page 10 |
| what the firmware does with charging | its mode 0 renders a **charging battery**, where the 600's and 650's mode 0 asks to add an activity | read from configurations, section 311 |
| battery voltage over USB | implemented in the 700's image, `READ_MISC` selector `0x0C` detail 1, in millivolts | read in the firmware, section 212; **never sent to a 700** |

How the 700 senses the charger, and whether the Harmony One's charger input, `PORTB` bit 1, has a
counterpart here, is **not checked**; section 105 read that on the Harmony One only.

## Infrared, light and case

| | value | standing and source |
|---|---|---|
| infrared transmitters | 2 | Logitech's manual |
| range | up to 50 ft | Logitech's manual |
| learning | yes, up to 200 kHz, "Any IR Device" | Logitech's manual. Learning on a 700 is **not checked** |
| keypad backlight | yes, **white** | Logitech's manual. The Harmony 650's says yellow |
| size and weight | 8.75 x 2.3 x 1.3 inch, 6 oz with battery installed | Logitech's manual; the same figures as the 600 and 650 manuals |
| face | the face of the 600 and 650, key for key | a statement from the bench holding all three, [keys.md](keys.md) |

## A sensor for being picked up

"The Harmony 700 senses when you pick it up, and lights up the display and buttons", Logitech's manual
page 10. Logitech's service lists a tilt sensor setting for the 700, default on,
`reference/capabilities.md`. How the 700's compile switches it is read on the Harmony 650, section 346;
on a 700 **not checked**.

## Not checked

* The hardware version a 700 reports.
* The charger input and the charging state in the firmware.
* The battery voltage on a 700, and the voltage its firmware treats as low.
* The display controller and panel part, and whether the 700's screen differs physically from the 650's.
