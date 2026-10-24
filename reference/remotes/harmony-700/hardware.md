# Harmony 700: hardware

What is inside, as far as anything here can say: the processor and its memory, the rechargeable cells and
how the remote decides to charge them, the infrared senders and the lights. No 700 has been opened, so
every part below is known from what the remote reports over USB, from its firmware, or from Logitech's
manual. The processor and memory are the architecture's and are stated in
[the architecture's README](../../architectures/harmony-600-650-700/README.md); this page states them
again only where the 700 adds something.

## Processor and memory

| | value | evidence |
|---|---|---|
| processor | `PIC18F67J50`, the architecture's part; the device id is outside the read window, so the part is not measured, [the comparison of architectures](../../architectures/README.md#what-no-read-can-show) | [^s13], [^unchecked] |
| internal flash | 128 KiB in two pages, both read off a 700 | [^s295] |
| external flash | 2 MiB SPI, EON F16, id `15:1C` in the version block; the 2.8 build's classifier refuses at `0x200000` | [^s295], [^s88] |
| the package's flash part | the 2.8 package's upgrade header states `0x14:0x1C`, which reads as 1 MiB, and its `Data.xml` states `0x15:0x1C`; so the half sized part once allowed for was the package's target and not a measurement | [^s295b], [^s297] |
| memory in the manual | "Memory Amount 2MB", "Memory Type Flash", Product Specification; agrees with the remote | [^x-manual] |
| flash parts the firmware accepts | seven pairs of capacity and manufacturer, the 650's set; the 600's image accepts six | [^s108] |
| hardware version | not recorded | [^unchecked] |

## Power and charging

| | value | evidence |
|---|---|---|
| cells | "Power Source Rechargeable", "Power Type NiMH AA", Product Specification | [^x-manual] |
| charging | "insert the USB cable into the top of the remote, plug the other end of the cable into the AC adaptor, and then plug the AC adaptor into a wall outlet and charge", page 10, "Charging your remote" | [^x-manual] |
| replacement cells | "Use only NiMH replacement batteries, size AA R6 with a minimum of 1800 mA", page 10 | [^x-manual] |
| what the configuration does with charging | its modes 0 to 3 render a **charging battery**, where the 600's and 650's mode 0 asks to add an activity; [display.md](display.md) | [^s311], [^s383] |
| which chargers it charges from | one whose USB data lines it reads both high with its transceiver off, after no host has addressed it for about 2 seconds; then it switches charging on and shows the charging screens. On a computer the test never runs, and without a host command the firmware does not switch charging on | [^s384] |
| what was seen | the charging screens on one USB charger and not on a phone charger; neither charger's lines were measured, so which chargers pass, and that it does not charge where the test fails, are inferred from the code | [^s384b], [^unchecked] |
| battery voltage over USB | implemented in the 700's image, `READ_MISC` selector `0x0C` detail 1, in millivolts, [the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md); never asked of a 700 | [^s212], [^unchecked] |

**How the 700 senses the charger**: the data line test, then a pulse pattern on an input whose wiring is
inferred[^s384]. Its cable gate is `PORTB` bit 1, read as the cable's power by inference[^s384], the bit
the Harmony One reads as its charger input[^s105], and the Harmony 650 as its gate too.

## Infrared, light and case

| | value | evidence |
|---|---|---|
| infrared transmitters | 2 | [^x-manual] |
| range | up to 50 ft | [^x-manual] |
| learning | yes, up to 200 kHz, "Any IR Device"; learning on a 700 not checked | [^x-manual], [^unchecked] |
| keypad backlight | yes, **white**, where the Harmony 650's manual says yellow | [^x-manual] |
| a light the configuration sets in four levels | the parameter block's group 3, which Logitech's 700 compiles state as 3, 5, 10 and 32, where the 600's state 1, 3, 5 and 32 and the 650's 10, 20, 8 and 32; the 700's also carry group 6's curve in group 5 | [^s347] |
| how the 2.8 build drives it | `LATG` bit 0 by pulses, cleared at level 0. **Which light it is is not established** | [^s392] |
| size and weight | 8.75 x 2.3 x 1.3 inch, 6 oz with battery installed, the same figures as the 600 and 650 manuals | [^x-manual] |
| face | the face of the 600 and 650, key for key, [keys.md](keys.md) | [^x-manual] |

## A sensor for being picked up

"The Harmony 700 senses when you pick it up, and lights up the display and buttons", manual
page 10[^x-manual]. Logitech's service lists a tilt sensor setting for the 700, on by default,
[features.md](features.md). How the compile switches it is read on the Harmony 650[^s346]; on a 700 not
checked[^unchecked].

## Not checked

* The hardware version a 700 reports[^unchecked].
* What the pins the charger test reads are wired to; their readings are inferred from the code[^s384].
* Which light the configuration's group 3 sets[^s392].
* The battery voltage on a 700, and the voltage its firmware treats as low[^unchecked].
* The display controller and panel part, and whether the 700's screen differs physically from the
  650's[^unchecked].

[^s13]: Read in the firmware. [Section 13](../../../docs/findings.md#s13)
[^unchecked]: Not checked.
[^s295]: Measured on a unit. [Section 295](../../../docs/findings.md#s295)
[^s88]: Read in the firmware. [Section 88](../../../docs/findings.md#s88)
[^s295b]: Read in the firmware. [Section 295](../../../docs/findings.md#s295)
[^s297]: Measured on a unit. [Section 297](../../../docs/findings.md#s297)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 700 user manual](https://support.myharmony.com/harmony-700-user-manual)
[^s108]: Read in the firmware. [Section 108](../../../docs/findings.md#s108)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^s383]: Measured in configurations. [Section 383](../../../docs/findings.md#s383)
[^s384]: Read in the firmware. [Section 384](../../../docs/findings.md#s384)
[^s384b]: Measured on a unit. [Section 384](../../../docs/findings.md#s384)
[^s212]: Read in the firmware. [Section 212](../../../docs/findings.md#s212)
[^s105]: Read in the firmware. [Section 105](../../../docs/findings.md#s105)
[^s347]: Measured in configurations. [Section 347](../../../docs/findings.md#s347)
[^s392]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^s346]: Measured in configurations. [Section 346](../../../docs/findings.md#s346)
