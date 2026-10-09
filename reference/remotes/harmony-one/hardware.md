# Harmony One: hardware

What is inside, as far as anything here can say. No One has been opened: every part below is known from
what the remote reports over USB, from its firmware, or from Logitech's manual. The long form of the
memory is `docs/memory-map-one.md`.

## Processor and memory

| | value | standing and source |
|---|---|---|
| processor | most likely a `PIC18F87J50`: 80 pins and an external memory bus, which a part running its application in place out of external flash needs | **inferred**, section 3 and `docs/memory-map.md`. The device id at `0x3FFFFE` is outside the USB read window, section 22 |
| internal flash | 128 KiB in two 64 KiB pages | measured, section 22 |
| external flash | 4 MiB parallel NOR, Atmel `AT49BV322A`, reported as `1F:C8`, memory mapped and executed in place | measured on two units, section 221; the part named by Logitech's client's constants for that id |
| "Memory Amount 4MB", "Memory Type Flash" | | Logitech's manual, Product Specification. Agrees with the part |
| erase block | 64 KiB: the blocks either side of an erased one read identical before and after | measured, section 222. Logitech's block table for the part is eight 8 KiB blocks and then sixty three of 64 KiB, Logitech's client, section 221 |
| how the firmware reaches flash | through one 64 KiB window: the top address byte, biased by three, goes to a page register at external `0x020025` | read in the firmware, sections 175 and 192 |
| a small register file at external `0x020020` to `0x020025` | the memory mapped keypad at `0x020020` and `0x020021`, an identity byte at `0x020024`, the page register | read in the firmware, section 189 |
| data EEPROM | none on either candidate part | gputils headers, section 189 |

## Power

| | value | standing and source |
|---|---|---|
| cell | "Power Source Rechargeable", "Power Type Lithium Ion" | Logitech's manual, Product Specification |
| charging | a charging station that "plugs into a wall outlet and charges the battery every time you put the remote on it" | Logitech's manual, "Charging your remote" |
| the battery gauge | millivolts are a converter count times `4 + trim / 65536`, about 4.284 mV a count; the scale is stored per unit at internal `0xFF` `+0xF580` | read in the firmware and measured on two units, section 105 |
| the configuration's battery curve | 3000 to 4051 mV, a single lithium cell from empty to full | read from configurations, section 44 |
| low battery | flagged below 3400 mV when the charger is absent | read in the firmware, section 105 |
| charger input | `PORTB` bit 1, clear while charging | read in the firmware, section 105 |
| battery voltage over USB | `READ_MISC` selector `0x0C` detail 1; Logitech's client offers the reading for this model alone | read in the firmware and Logitech's client, section 212 |

**Mode 0**, the configuration's first mode, reads "The battery level is low!", with "OK", read from
configurations, section 311.

## Sound, light and sensors

| | value | standing and source |
|---|---|---|
| a tone generator | a square wave on `LATG` bit 0, driven by action list opcode `0x75`; four tones in the corpus, the commonest 582 Hz for about 26 ms on nearly every button | read in the firmware and configurations, section 74. That it drives a speaker is **inferred** |
| clock crystal | 32.768 kHz on Timer 1 | read in the firmware, sections 106 and 111 |
| a light sensor | analogue channel 1 sampled into a four level band; the configuration states its thresholds | read in the firmware, sections 103 and 111. What it senses is **not checked** |
| screen light | set through `CVRCON` in 27 levels, enabled on `LATA` bit 5 | read in the firmware, section 103 |
| an I2C device at address `0x60` | thirteen channels of three states and two level registers, most plausibly the keypad backlight driver | read in the firmware, section 106; **not named**, deliberately |
| a programmable logic image | 8438 bytes, version 1.6, at internal `0xFF` `+0x0000`; Logitech's client calls it the CPLD image | measured and Logitech's client, sections 94 and 212 |
| keypad backlight | "White or Amber (depending on mode)" | Logitech's manual |
| picked up | "The Harmony One senses when you pick it up, and lights up the display and buttons" | Logitech's manual, "Setting the backlight timing" |

## Keys and touch, electrically

* **The keypad shares one sense line**: sixteen keys pressed across the face all pulled `PORTB` bit 5,
  so no key's column can be learned over USB, measured on a unit, section 48.
* A touch pulls `PORTB` bit 4 low, latched for the session, measured on a unit, section 48. Touch
  coordinates are thirteen bits from a serial packet, read in the firmware, section 45.
* The cable is sensed on `PORTA` bit 4, **clear** meaning a cable, measured, section 251.

## Infrared and case

| | value | standing and source |
|---|---|---|
| infrared transmitters | 2 | Logitech's manual |
| range | up to 65 ft | Logitech's manual |
| learning | yes, up to 200 kHz | Logitech's manual. Learning on a One is **not checked** here |
| core clock | 4 MIPS, tied to the infrared carrier arithmetic | read in the firmware and configurations, sections 32 and 74 |
| size and weight | 8.75 x 2.3 x 1.3 inch, 6 oz with battery installed | Logitech's manual |

## Not checked

* The processor's marking, and the display controller and panel part.
* What the light sensor senses, and what the I2C device at `0x60` is.
* What the programmable logic image drives.
* How fast the clock drifts: it "runs badly wrong after a while", an account from the bench, section 111,
  and its rate was deliberately not measured.
* The consumer of the two words at internal `0xFF` `+0xF5C0`, which Logitech's client labels power
  settings, section 150.
