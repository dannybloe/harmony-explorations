# Harmony Touch: hardware

What is inside, as far as anything here can say, which is little. No Touch has been opened and its firmware
image has not been read, so the only hardware facts off a unit are the fields its identity file states. The
rest is the manual.

| | value | evidence |
|---|---|---|
| processor | **not checked**. Its firmware is a Linux image, which says the family of system, not the part | [^s196], [^unchecked] |
| memory | `/sys/sysinfo` states a `ram_size` field; its value is not recorded here and the flash size is **not checked** | [^s200], [^unchecked] |
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

* The processor, the flash and RAM sizes, and the display and touch controllers[^unchecked].
* Infrared range, carrier limits and the number of transmitters: the manual states none[^unchecked].
* Size and weight[^unchecked].

[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^unchecked]: Not checked.
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s201]: Measured on a unit. [Section 201](../../../docs/findings.md#s201)
[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
