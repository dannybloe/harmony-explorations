# Harmony 300: memory

Where the 300 keeps what it knows: one configuration file, which holds its devices and the infrared codes
it sends for each. The layout of the remote's storage and of that file is the family's, stated once in
[the family's memory.md](../../architectures/harmony-300-350/memory.md), from the firmware's own file
table. Only its files have been read off a 300, never its memory.

## What is the 300's own

| | value | evidence |
|---|---|---|
| infrared groups | **four in every configuration**, unused ones empty, the model's stated maximum | [^s264] |
| the group index | the device key: TV 0, Cable/Sat 1, DVD 2, VCR/Aux 3 | [^s265] |

## What the 300 showed about the family

The 300's configurations are what settled two facts that hold for both models: raw slot 8 follows the
compiler and not the model, and a configuration from a different generation of the compiler is not a
sample of the same population. Both are stated once in
[the family's memory.md](../../architectures/harmony-300-350/memory.md#the-configuration-container). On a
300 the timers raw slot 8 holds are started by nothing in either configuration measured,
[the six slots](../../architectures/harmony-300-350/memory.md#the-six-slots-the-firmware-was-read-for)[^t-harmony-350-slots-c].

## Not checked

* Anything in the remote's memory beyond the files it serves.

[^s264]: Measured in configurations. [Section 264](../../../docs/findings.md#s264)
[^s265]: Measured in configurations. [Section 265](../../../docs/findings.md#s265)
[^t-harmony-350-slots-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_slots.py)
