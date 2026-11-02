# Harmony Touch: hardware

What is inside, as far as anything here can say. No Touch has been opened, so the hardware facts are what its
firmware image installs and configures, the fields its identity file states, and the manual. This said the
firmware image had not been read until it was.

| | value | evidence |
|---|---|---|
| processor | TI's DA850, an ARM926EJ-S part of the DaVinci family: the board code the image's kernel carries for the Touch's codename is DA850 code, and the kernel names that core; which variant is **not checked** | [^t-touch-image], [^unchecked] |
| memory | the image's boot loader tells the kernel to use **64 MiB**, and the remote's identity file states `ram_size 64MB`; what is fitted, and the flash size, are **not checked** | [^t-touch-image], [^t-touch-ram], [^unchecked] |
| other parts | an MSP430 microcontroller, a chip Logitech's driver calls CC2544, and a ClearPad touch controller, named by the files and drivers the image programs them with; what each does is **not checked** | [^t-touch-image], [^unchecked] |
| link | `link_hw usb`, `link_type hid`, `link_packet_length 64`, the 64 byte report size every Harmony here uses | [^s200] |
| `feature` | `Infrared`, and nothing else | [^s200] |
| radio | `/rf/deviceinfo` answers with an identity for Logitech's 2.4 GHz link and a list of paired devices. The identity values are a unit's and never appear here | [^s201] |
| cell | "an internal, lithium-ion rechargeable battery that is non-replaceable" | [^x-touch-manual], "End-of-life Battery Disposal Instructions" |
| charging | a charging dock with a mains adapter; "a full charge takes about 2 hours. A charge lasts about 3 days"; the remote "turns on automatically" when picked up from the dock | [^x-touch-manual], "Charging your Remote" and the setup guide |
| USB | a micro USB port, which also powers the remote while it updates; through the dock the remote is not detected by a computer | [^x-touch-manual], "Know your product" and the troubleshooting section |
| infrared | an IR window, used for learning from another remote | [^x-touch-manual], "Know your product" |

**The identity file's `feature` and the radio file do not contradict each other**: one names the model's
infrared link and the other a 2.4 GHz identity, and the remote read had nothing paired to it[^s201]. What
pairs with that radio is **not checked**[^unchecked].

## Not checked

* Which DA850 variant, the memory fitted, the flash size, and the display controller[^unchecked].
* Infrared range, carrier limits and the number of transmitters: the manual states none[^unchecked].
* Size and weight[^unchecked].

[^unchecked]: Not checked.
[^t-touch-image]: Read in the firmware. [The test](../../../tests/test_harmony_touch_image.py)
[^t-touch-ram]: Measured on a unit. [The test](../../../tests/test_harmony_touch_image.py)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s201]: Measured on a unit. [Section 201](../../../docs/findings.md#s201)
[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
