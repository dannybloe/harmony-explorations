# Harmony 785: hardware

What is inside a Harmony 785 is known only as far as its version block and its flash say. The platform is
described once in [the architecture folder](../../architectures/harmony-880-885/README.md).

| | value |
|---|---|
| flash | device `0x49` from manufacturer `0x01`, the 885's part, read below `0x1FE000` as the platform's is[^t-785-first-read] |
| hardware version | 0.8 and 0.9 on the two remotes read[^t-785-first-read] |

## Not checked

* The processor, the battery, the transmitters and the learning sensor.[^unchecked]

[^t-785-first-read]: Measured on a unit. [The test](../../../tests/harmony_880_885/test_harmony_785_first_read.py)
[^unchecked]: Not checked.
