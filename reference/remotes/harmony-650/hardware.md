# Harmony 650: hardware

What is inside, as far as anything here can say. No 650 has been opened for this reference, so every
part below is known from what the remote reports over USB, from its firmware, or from Logitech's manual.
The processor and memory are the architecture's and are stated in
[the architecture's README](../../architectures/harmony-600-650-700/README.md); this page states only
what the 650 adds.

## Processor and memory

| | value | evidence |
|---|---|---|
| processor | `PIC18F67J50`, the architecture's part. The device id sits outside what a USB read reaches, so the part is known from the firmware and **not measured** on any unit, [the comparison of architectures](../../architectures/README.md#what-no-read-can-show) | [the architecture's README](../../architectures/harmony-600-650-700/README.md) |
| internal flash | 128 KiB in two pages, both read whole off a 650 | [^s281] |
| external flash | 2 MiB, [the architecture's memory page](../../architectures/harmony-600-650-700/memory.md); the manual's Product Specification says "Memory capacity 2MB, Flash", which agrees | [^x-manual] |
| flash parts the firmware accepts | seven pairs of capacity and manufacturer, the Harmony 700's set; the Harmony 600's image accepts six | [^s108] |

## Power

| | value | evidence |
|---|---|---|
| cells | AA alkaline batteries, "Battery type AA Alkaline"; the manual does not give the count | [^x-manual] |
| charging | none: the manual names batteries and no charger, where the Harmony 700 charges its cells, [the architecture's README](../../architectures/harmony-600-650-700/README.md#how-the-three-differ) | [^x-manual] |
| battery level in the firmware | none found. Four pictures drawn only by programs switching on state variable 17 were once read as a battery gauge; they are the infrared sending indicator, since the variable's writers are on the send path | [^s317], [^s369] |

## Infrared, light and case

| | value | evidence |
|---|---|---|
| infrared transmitters | 2 | [^x-manual] |
| range | up to 50 ft | [^x-manual] |
| learning | yes, "Up to 200 KHz" | [^x-manual] |
| keypad backlight | yes, **yellow**, where the Harmony 600's and 700's are white, [the architecture's README](../../architectures/harmony-600-650-700/README.md#how-the-three-differ) | [^x-manual] |
| size and weight | 8.75 x 2.3 x 1.3 inch, 6 oz with batteries, the same as the Harmony 600 and 700 | [^x-manual] |
| face | the Harmony 600's, key for key, [keys.md](keys.md) | [^unchecked] |

**A light the configuration sets in four levels.** Parameter group 3 of a configuration holds four
levels of a light: 10, 20, 8 and 32 in the 650's configurations, where the Harmony 600's hold 1, 3, 5
and 32[^s392]. The 0.2 firmware drives it as a pulse width output on `CCP3` at `LATG` bit 0, its duty
from 32 less the level[^s392b]. **Which light it is is not established**[^unchecked].

## A sensor for being picked up

**A 650 wakes when it is picked up.** With MyHarmony's tilt sensor setting on, tilting the remote while
its screen is dark lights the screen, as a key press does[^s346]. Logitech's service lists `TiltSensor`
for the 650[^s346b], as MyHarmony does for the 600 and 700[^s292], though **the 650's manual says
nothing about it**[^x-manual].
What part senses it is not checked, nothing having been opened[^unchecked]. This page said "Whether the
650 has the sensor is **not checked**"<!--superseded--> until section 346 answered it.

## Not checked

* The processor part, by any route other than the firmware[^unchecked].
* The hardware version a 650 reports, beyond a single unit[^unchecked].
* The battery voltage the firmware treats as low, if it has one[^unchecked]. The voltage itself can be
  read over USB, [the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md).
* The part behind the tilt sensor, and what the flag instruction `3F F101` does in the firmware; that it
  is what arms the sensor is the reading of two compiles[^s346c].
* The display controller and panel part: nothing names either for this architecture[^unchecked].

[^s281]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 650 user manual](https://www.logitech.com/assets/44635/3/harmony650-user-guide.pdf)
[^s108]: Read in the firmware. [Section 108](../../../docs/findings.md#s108)
[^s317]: Measured in configurations. [Section 317](../../../docs/findings.md#s317)
[^s369]: Read in the firmware. [Section 369](../../../docs/findings.md#s369)
[^unchecked]: Not checked.
[^s392]: Measured in configurations. [Section 392](../../../docs/findings.md#s392)
[^s392b]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^s346]: Measured on a unit. [Section 346](../../../docs/findings.md#s346)
[^s346b]: Stated by Logitech, by their service. [Section 346](../../../docs/findings.md#s346)
[^s292]: Stated by Logitech, by their service. [Section 292](../../../docs/findings.md#s292)
[^s346c]: Measured in configurations. [Section 346](../../../docs/findings.md#s346)
