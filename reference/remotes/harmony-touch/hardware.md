# Harmony Touch: hardware

What is inside, as far as anything here can say. No Touch has been opened, so the hardware facts are what its
firmware image installs and configures, the fields its identity file states, and the manual. This said the
firmware image had not been read until it was.

| | value | evidence |
|---|---|---|
| processor | TI's DA850, an ARM926EJ-S part of the DaVinci family: the board code the image's kernel carries for the Touch's codename is DA850 code, and the kernel names that core; which variant is **not checked** | [^t-touch-image], [^unchecked] |
| memory | the image's boot loader tells the kernel to use **64 MiB**, and the remote's identity file states `ram_size 64MB`; what is fitted, and the flash size, are **not checked** | [^t-touch-image], [^t-touch-ram], [^unchecked] |
| other parts | an MSP430 microcontroller, a chip Logitech's driver calls CC2544, and a ClearPad touch controller, named by the files and drivers the image programs them with | [^t-touch-image] |
| keys | **the MSP430 reports the 27 keys** to the kernel, one bit each, read by the kernel's MSP430 driver; Home and Favorites are zones of the ClearPad touch sensor, [keys.md](keys.md#the-key-numbers) | [^t-touch-keys] |
| on the board's I2C bus | the kernel declares a TPS6507x power controller at address `0x48`, the ClearPad at `0x20`, the MSP430 at `0x34`, an LIS3DH accelerometer at `0x19`, a DRV2605 haptic driver at `0x5A` and an STC3115 fuel gauge at `0x70`. **A declaration is what the board may carry**: the screens offer the tilt and vibration settings only when the drawing library reports the part, and whether a Touch has either is **not checked** | [^t-touch-keys], [^unchecked] |
| display | an ILI9340 or ILI9341 class controller, by the names the kernel registers and logs it under, on a 240 by 320 panel; which module is fitted is **not checked** | [^t-touch-keys], [^unchecked] |
| backlights | the display's through an AP3156 backlight driver, the keys' through an LED of the TPS6507x, both set by the screens | [^t-touch-keys] |
| power sources | the power controller's driver names five: `battery`, `cradle` (the dock), `wall_adapter`, `usb` and `usb_charge`; what the screens do on each is [display.md](display.md#charging-and-the-battery) | [^t-touch-keys] |
| link | `link_hw usb`, `link_type hid`, `link_packet_length 64`, the 64 byte report size every Harmony here uses | [^s200] |
| `feature` | `Infrared`, and nothing else | [^s200] |
| radio | `/rf/deviceinfo` answers with an identity for Logitech's 2.4 GHz link and a list of paired devices. The identity values are a unit's and never appear here | [^s201] |
| cell | "an internal, lithium-ion rechargeable battery that is non-replaceable" | [^x-touch-manual], "End-of-life Battery Disposal Instructions" |
| charging | a charging dock with a mains adapter; "a full charge takes about 2 hours. A charge lasts about 3 days"; the remote "turns on automatically" when picked up from the dock | [^x-touch-manual], "Charging your Remote" and the setup guide |
| waking | **any change of power source wakes the screen**, so lifting the remote from its dock does, which is the manual's "turns on automatically" | [^t-touch-keys] |
| USB | a micro USB port, which also powers the remote while it updates; through the dock the remote is not detected by a computer | [^x-touch-manual], "Know your product" and the troubleshooting section |
| infrared | an IR window, used for learning from another remote | [^x-touch-manual], "Know your product" |

**The identity file's `feature` and the radio file do not contradict each other**: one names the model's
infrared link and the other a 2.4 GHz identity, and the remote read had nothing paired to it[^s201]. What
pairs with that radio is **not checked**[^unchecked].

## Not checked

* Which DA850 variant, the memory fitted, the flash size, and which display module is fitted[^unchecked].
* What the MSP430, the CC2544 and the TPS6507x do beyond what is named on this page, and whether the
  accelerometer and the haptic driver the board declares are fitted[^unchecked].
* Infrared range, carrier limits and the number of transmitters: the manual states none[^unchecked].
* Size and weight[^unchecked].

[^unchecked]: Not checked.
[^t-touch-keys]: Read in the firmware. [The test](../../../tests/test_harmony_touch_keys.py)
[^t-touch-image]: Read in the firmware. [The test](../../../tests/test_harmony_touch_image.py)
[^t-touch-ram]: Measured on a unit. [The test](../../../tests/test_harmony_touch_image.py)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s201]: Measured on a unit. [Section 201](../../../docs/findings.md#s201)
[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
