# Harmony Touch: hardware

What is inside, as far as anything here can say, which is little. No Touch has been opened, its firmware
image has not been read, and the only hardware facts off a unit are the fields its identity file states.

| | value | standing and source |
|---|---|---|
| processor | **not checked**. Its firmware is an ARM image with a squashfs root, which says the family, not the part | Logitech's service image, not read, `reference/checksums.md` |
| memory | `/sys/sysinfo` states a `ram_size` field; its value and the flash size are **not checked** | measured, section 200 |
| link | `link_hw usb`, `link_type hid`, `link_packet_length 64`, the report size this project has always used | measured, section 200 |
| `feature` | `Infrared`, and nothing else | measured, section 200 |
| radio | `/rf/deviceinfo` answers with an identity for Logitech's 2.4 GHz link and a list of paired devices, empty on the unit read | measured, section 201. The identity values are a unit's and never appear here |
| cell | "an internal, lithium-ion rechargeable battery that is non-replaceable" | Logitech's manual, "End-of-life Battery Disposal Instructions" |
| charging | a charging dock with a mains adapter; "a full charge takes about 2 hours. A charge lasts about 3 days"; the remote "turns on automatically" when picked up from the dock | Logitech's manual, "Charging your Remote" and the setup guide |
| USB | a micro USB port, which also powers the remote while it updates; through the dock the remote is not detected by a computer | Logitech's manual, "Know your product" and the troubleshooting section |
| infrared | an IR window, used for learning from another remote | Logitech's manual, "Know your product" |

**The two halves of `feature` and the radio file do not contradict each other**: the identity file names
the model's infrared link and the radio file a 2.4 GHz identity with nothing paired, section 201. What
pairs with that radio is **not checked**.

## Not checked

* The processor, the flash and RAM sizes, and the display and touch controllers.
* Infrared range, carrier limits and the number of transmitters: the manual in the lab states none.
* Size and weight.
