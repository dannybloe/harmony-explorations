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

This holds for both models, and the 300's configurations are what settled it. Raw slot 6, one entry more
than there are devices, is the family's open question, [the family's memory.md](../../architectures/harmony-300-350/memory.md).

| | value | evidence |
|---|---|---|
| raw slot 8 | twice the device count on a configuration Logitech's current service compiled, and empty on one compiled in 2011, so it follows the compiler and not the model | [^s265] |

**A configuration from a different generation of the compiler is not a sample of the same population**:
raw slot 8's emptiness on the 2011 configuration was first read as a property of the model[^s264], and a
second configuration off the same remote, compiled by the current service, holds eight for four
devices[^s265]. Each configuration states its own build date, so the check is available in every one.

## Not checked

* Anything in the remote's memory beyond the files it serves.
* What raw slot 8 holds.

[^s264]: Measured in configurations. [Section 264](../../../docs/findings.md#s264)
[^s265]: Measured in configurations. [Section 265](../../../docs/findings.md#s265)
