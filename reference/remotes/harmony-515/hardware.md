# Harmony 515: hardware

What is inside a Harmony 515. The processor and the flash are the platform's and are stated once in
[the architecture folder](../../architectures/harmony-5xx/README.md).

| | value |
|---|---|
| board | revision 1.0, in the version block, where the Harmony 525 reports 2.5[^t-harmony-515] |
| external flash | id `FF:12`, the same as the 525's[^t-harmony-515] |

## Not checked

* The batteries, the transmitters, the processor part and the flash size.[^unchecked]

[^t-harmony-515]: Measured on a unit. [The test](../../../tests/test_harmony_515.py)
[^unchecked]: Not checked.
