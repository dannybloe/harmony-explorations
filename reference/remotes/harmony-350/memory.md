# Harmony 350: memory

Where a 350 keeps things is the architecture's, read from the firmware's own file table: the configuration
is the file `/cfg/usercfg`, and its container has 15 pointer slots. That map, the slot names and the four
bytes a read of the file comes back short are in
[the architecture's memory.md](../../architectures/harmony-300-350/memory.md). Nothing here was read as
memory off a 350, only the files it serves.

## What is the 350's own

| | value |
|---|---|
| infrared groups | **eight in every configuration**, unused ones empty, the model's maximum device count[^s263] |
| the group index | a short press of a device key: `TV/Media` 0, `Cable/PC` 1, `AVR/Game` 2, `DVD/Music` 3, the keys named by the moulding the Harmony 300 shares, [the family's memory.md](../../architectures/harmony-300-350/memory.md#which-infrared-group-a-device-takes)[^t-device-groups-c]; a long press, not checked[^unchecked] |
| configuration size | 68985 to 121251 bytes over the three configurations measured, by what they hold[^s262][^s263] |

## Not checked

* Anything in the remote's memory beyond the files it serves.
* Which infrared group a device on a long press takes: no configuration measured has one[^unchecked].

[^s263]: Measured in configurations. [Section 263](../../../docs/findings.md#s263)
[^s262]: Measured in configurations. [Section 262](../../../docs/findings.md#s262)
[^t-device-groups-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_device_groups.py)
[^unchecked]: Not checked.
