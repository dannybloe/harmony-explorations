# Harmony One: hardware

What is inside, as far as anything here can say: a processor, a 4 MiB flash chip, a lithium ion cell with a
battery gauge, a beeper, a light sensor, lights for the keys around the screen, two infrared
transmitters. No One has been opened: every part below is known from what the remote reports over USB,
from its firmware, or from Logitech's manual.

## Processor and memory

The processor, the flash chip and what each holds are the platform's:
[the platform's README](../../architectures/harmony-one/README.md) for the processor and the chip, and
[its memory page](../../architectures/harmony-one/memory.md) for the internal pages, the 64 KiB erase block,
the page register and the small register file at external `0x020020`. Two things not stated there:

| | value |
|---|---|
| what Logitech's manual says | "Memory Amount 4MB", "Memory Type Flash", which agrees with the part[^x-one-manual] |
| Logitech's block table for the part | eight 8 KiB blocks and then sixty three of 64 KiB[^s221] |
| data EEPROM | none on either candidate part[^s189] |

## Power

| | value |
|---|---|
| cell | "Power Source Rechargeable", "Power Type Lithium Ion"[^x-one-manual] |
| charging | a charging station that "plugs into a wall outlet and charges the battery every time you put the remote on it"[^x-one-manual] |
| the battery gauge | millivolts are a converter count times `4 + trim / 65536`, about 4.284 mV a count; the scale is stored per remote in internal flash, [the platform's memory page](../../architectures/harmony-one/memory.md)[^s105][^s105b] |
| the configuration's battery curve | 3000 to 4051 mV, a single lithium cell from empty to full[^s44] |
| low battery | flagged below 3400 mV when the charger is absent[^s105] |
| charger input | `PORTB` bit 1, clear while charging[^s105] |
| battery voltage over USB | `READ_MISC` selector `0x0C` detail 1; Logitech's client offers the reading for this model alone[^s212][^s212b] |

**Mode 0**, the configuration's first screen, reads "The battery level is low!", with "OK"[^s311].

## Sound, light and sensors

| | value |
|---|---|
| a tone generator | a square wave on `LATG` bit 0, driven by action list opcode `0x75`; four tones in the configurations, the commonest 582 Hz for about 26 ms on nearly every button[^s74][^s74b]. That it drives a speaker is inferred |
| clock crystal | 32.768 kHz on Timer 1[^s106][^s111] |
| a light sensor | analogue channel 1 sampled into a four level band; the configuration states its thresholds[^s103][^s111]. What it senses is not checked |
| screen light | set through `CVRCON` in 27 levels, enabled on `LATA` bit 5[^s103] |
| an I2C device at address `0x60` | thirteen channels of three states and two level registers[^s106]; **channels 0 to 3 light the keys beside the screen**, in two pairs, 2 and 0 on every device mode and 3 and 1 on most other screens[^s400]. The part is not named |
| a programmable logic image | 8438 bytes, version 1.6, which Logitech's client calls the CPLD image; where it is stored is [the platform's memory page](../../architectures/harmony-one/memory.md)[^s94][^s212b] |
| keypad backlight | "White or Amber (depending on mode)"[^x-one-manual] |
| picked up | "The Harmony One senses when you pick it up, and lights up the display and buttons"[^x-one-manual] |
| how long the screen stays lit | the 10 second timer of the one pair of timers, 10 and 20 seconds, that queue two lists of the same content in every compile[^s400b]; raised to 60, the screen stayed lit about 60 seconds[^s400] |

## Keys and touch, electrically

* **The keypad shares one sense line**: sixteen keys pressed across the face all pulled `PORTB` bit 5,
  so no key's column can be learned over USB[^s48].
* A touch pulls `PORTB` bit 4 low, latched for the session[^s48]. Touch coordinates are thirteen bits from
  a serial packet[^s45].
* The cable is sensed on `PORTA` bit 4, **clear** meaning a cable[^s251].

## Infrared and case

| | value |
|---|---|
| infrared transmitters | 2[^x-one-manual] |
| range | "Up to 65ft"[^x-one-manual] |
| learning | "Yes (Up to 200 Khz)"[^x-one-manual]. Learning on a One is not checked |
| core clock | 4 MIPS, tied to the infrared carrier arithmetic[^s32][^s74] |
| size and weight | 8.75 x 2.3 x 1.3 inch, 6 oz with the battery installed[^x-one-manual] |

## Not checked

* The processor's marking, and the display controller and panel part[^unchecked].
* What the light sensor senses, which part the I2C device at `0x60` is, and what its channels 4 to 12
  light[^unchecked].
* What the programmable logic image drives[^unchecked].
* How fast the clock drifts; [the platform's memory page](../../architectures/harmony-one/memory.md#not-checked)
  gives the upper bound the firmware allows[^unchecked].
* The consumer of the two words at internal `0xFF` `+0xF5C0`, which Logitech's client labels power
  settings[^s150].

[^x-one-manual]: Stated by Logitech, in the manual. [The Harmony One user guide](https://secure.logitech.com/assets/44645/13/harmonyone-user-guide.pdf)
[^s221]: Stated by Logitech, in their client. [Section 221](../../../docs/findings.md#s221)
[^s189]: Read in the firmware. [Section 189](../../../docs/findings.md#s189)
[^s105]: Read in the firmware. [Section 105](../../../docs/findings.md#s105)
[^s105b]: Measured on a unit. [Section 105](../../../docs/findings.md#s105)
[^s44]: Measured in configurations. [Section 44](../../../docs/findings.md#s44)
[^s212]: Read in the firmware. [Section 212](../../../docs/findings.md#s212)
[^s212b]: Stated by Logitech, in their client. [Section 212](../../../docs/findings.md#s212)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^s74]: Read in the firmware. [Section 74](../../../docs/findings.md#s74)
[^s74b]: Measured in configurations. [Section 74](../../../docs/findings.md#s74)
[^s106]: Read in the firmware. [Section 106](../../../docs/findings.md#s106)
[^s111]: Read in the firmware. [Section 111](../../../docs/findings.md#s111)
[^s103]: Read in the firmware. [Section 103](../../../docs/findings.md#s103)
[^s400]: Measured on a unit. [Section 400](../../../docs/findings.md#s400)
[^s94]: Measured on a unit. [Section 94](../../../docs/findings.md#s94)
[^s400b]: Measured in configurations. [Section 400](../../../docs/findings.md#s400)
[^s48]: Measured on a unit. [Section 48](../../../docs/findings.md#s48)
[^s45]: Read in the firmware. [Section 45](../../../docs/findings.md#s45)
[^s251]: Measured on a unit. [Section 251](../../../docs/findings.md#s251)
[^s32]: Read in the firmware. [Section 32](../../../docs/findings.md#s32)
[^unchecked]: Not checked.
[^s150]: Stated by Logitech, in their client. [Section 150](../../../docs/findings.md#s150)
