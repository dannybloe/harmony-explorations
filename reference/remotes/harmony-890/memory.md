# Harmony 890: memory

What is known of a Harmony 890's memory is the configuration it holds. How that container is laid out on
this architecture, its slot map and what reads in it, is stated once in
[the architecture's memory page](../../architectures/harmony-890-895/memory.md); this page holds what the
model's configurations measure.

## The configurations' size and shape

| | value |
|---|---|
| container | format `0x1700`, 23 pointer slots, based at flash `0x030000`[^s115] |
| size | 396225 bytes, the container of each of two Harmony 890s, every read of either being that plus whole duplicated 54 byte chunks[^s122] |
| pictures | 26 on a Harmony 890, 57% of the file, and 38 on a Harmony 895, 72%[^s179] |
| infrared records | 300 on a Harmony 890 and none on a Harmony 895, [features.md](features.md)[^s181] |
| what remains unread | 0.7% of the Harmony 890's and 2.8% of the Harmony 895's, with nothing claimed twice[^s185] |

**A read of this remote's configuration has to be checked before it is believed**, since a read can
duplicate chunks of it and still parse: [the architecture's USB page](../../architectures/harmony-890-895/usb.md).

## Not checked

* Anything off a unit: the flash part and size, and what lies outside the configuration.[^unchecked]

[^s115]: Measured in configurations. [Section 115](../../../docs/findings.md#s115)
[^s122]: Measured in configurations. [Section 122](../../../docs/findings.md#s122)
[^s179]: Measured in configurations. [Section 179](../../../docs/findings.md#s179)
[^s181]: Measured in configurations. [Section 181](../../../docs/findings.md#s181)
[^s185]: Measured in configurations. [Section 185](../../../docs/findings.md#s185)
[^unchecked]: Not checked.
