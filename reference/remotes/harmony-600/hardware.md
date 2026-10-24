# Harmony 600: hardware

What is inside, as far as anything here can say. No 600 has been opened: every part below is known from
what the remote reports over USB, from its firmware, or from Logitech's manual. It runs on AA batteries
with no charger, sends infrared from two transmitters, and has a white keypad light and a sensor that
wakes it when it is picked up[^x-manual].

The processor, the flash chip and the way the program runs are the architecture's, stated once in
[the architecture's README](../../architectures/harmony-600-650-700/README.md#shared-in-one-table) and
[memory.md](../../architectures/harmony-600-650-700/memory.md). So are the face and the form factor,
which the 600 shares key for key with the 650 and 700. This page states what the 600 adds.

## Processor and memory

| | value | evidence |
|---|---|---|
| processor | `PIC18F67J50`, the architecture's part; its device id is outside the read window, so the part is not measured | [the architecture's README](../../architectures/harmony-600-650-700/README.md#shared-in-one-table), [the comparison of architectures](../../architectures/README.md#what-no-read-can-show) |
| internal flash | 128 KiB in two pages, both read whole off a unit, [memory.md](memory.md) | [^s23] |
| external flash | 2 MiB: a unit answers at `0x1F0000` and refuses at `0x230000`, and the firmware's address classifier refuses at `0x200000`. The manual: "Memory Amount 2MB", "Memory Type Flash" | [^s88], [^s88b], [^x-manual] |
| flash parts the firmware accepts | six pairs of capacity and manufacturer, where the 650's and 700's builds accept seven: the 600's drops EON at 1 MiB | [^s108] |
| hardware version | 1.1; a Harmony 650 reports a different one, whose value is not checked | [^s302], [^s281], [^unchecked] |

## Power

| | value | evidence |
|---|---|---|
| cells | "Power Source AA batteries"; how many it takes the manual does not say | [^x-manual] |
| charging | none: the manual names batteries and no charger, where the Harmony 700's has a charging chapter | [^x-manual] |
| battery voltage over USB | implemented in the 600's image, `READ_MISC` selector `0x0C` detail 1, in millivolts, as on the whole architecture, [its usb.md](../../architectures/harmony-600-650-700/usb.md#commands); not asked of a 600 | [^s212] |

## Infrared, light and case

| | value | evidence |
|---|---|---|
| infrared transmitters | 2, range up to 50 ft | [^x-manual] |
| learning | yes, up to 200 kHz, "Any IR Device"; learning on a 600 is not checked | [^x-manual] |
| keypad backlight | yes, **white**, where the Harmony 650's manual says yellow | [^x-manual] |
| a light the configuration sets in four levels | the parameter block's group 3, which Logitech's 600 compiles state as 1, 3, 5 and 32 where the 650's state 10, 20, 8 and 32 and the 700's 3, 5, 10 and 32; it is the one group in which the 600's and 650's differ. On the 0.2 build it drives `LATG` bit 0 by a PWM on `CCP3`, its duty from 32 less the level, one of the four levels for each of the light states 2 to 5 and level 0 for states 0 and 1. Which light it is is not established | [^s347], [^s392] |
| size and weight | 8.75 by 2.3 by 1.3 inch, 6 oz with battery installed, the same figures as the 650 and 700 manuals give | [^x-manual] |

## A sensor for being picked up

"The Harmony 600 senses when you pick it up, and lights up the display and buttons", in the manual's
"Setting the backlight timing"[^x-manual]. Logitech's service lists a tilt sensor setting for the 600,
default on, and MyHarmony a `TiltSensor` setting[^s292]. What the sensor is, and whether the 600's
firmware reads it the way the 650's compile switches it, is not checked[^unchecked]; the compile side is
read on the Harmony 650[^s346].

## Not checked

* The processor part by any route other than the firmware[^unchecked].
* How many AA cells the 600 takes, and the voltage its firmware treats as low[^unchecked].
* The battery voltage reading on a 600[^unchecked].
* The display controller and panel part: nothing names either for this architecture[^unchecked].
* What differs between hardware 1.1 and the 650's 1.2 beyond the panel[^unchecked].
* Which light the configuration's group 3 sets, and whether the screen is seen by it[^s392].

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 600 user manual](https://support.myharmony.com/harmony-600-user-manual)
[^s23]: Measured on a unit. [Section 23](../../../docs/findings.md#s23)
[^s88]: Measured on a unit. [Section 88](../../../docs/findings.md#s88)
[^s88b]: Read in the firmware. [Section 88](../../../docs/findings.md#s88)
[^s108]: Read in the firmware. [Section 108](../../../docs/findings.md#s108)
[^s302]: Measured on a unit. [Section 302](../../../docs/findings.md#s302)
[^s281]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^s212]: Read in the firmware. [Section 212](../../../docs/findings.md#s212)
[^s347]: Measured in configurations. [Section 347](../../../docs/findings.md#s347)
[^s392]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^s292]: Stated by Logitech, by their service. [Section 292](../../../docs/findings.md#s292)
[^unchecked]: Not checked.
[^s346]: Measured in configurations. [Section 346](../../../docs/findings.md#s346)
