# Harmony 885: hardware

What is inside a Harmony 885, as far as the firmware, the manual and a survey of its circuit board say.
The processor and the flash are the platform's and are stated once in
[the architecture folder](../../architectures/harmony-880-885/README.md).

| | value |
|---|---|
| keypad | 4 inputs by 16 lines, read by the firmware through one port, with 55 of the 64 crossings holding a key on an 885 and 53 on an 880, [keys.md](keys.md)[^s144][^s177] |
| learning sensor | on the Harmony 880, a separate infrared sensor "at the end opposite to the USB connector", behind a dedicated learning port named on the front panel, so receiving a code does not share the sending path[^s42] |
| USB | the cable a learned signal is uploaded over, [usb.md](usb.md)[^s42] |

## Not checked

* The batteries or cells, the charger, the transmitters and their number, the processor and flash parts.[^unchecked]

[^s144]: Read in the firmware. [Section 144](../../../docs/findings.md#s144)
[^s177]: Measured in configurations. [Section 177](../../../docs/findings.md#s177)
[^s42]: Stated by Logitech, in the manual. [Section 42](../../../docs/findings.md#s42)
[^unchecked]: Not checked.
