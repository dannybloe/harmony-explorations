# Harmony 885: memory

Where a Harmony 885 keeps its program and its configuration is its platform's, and is stated once in
[the architecture's memory page](../../architectures/harmony-880-885/memory.md): the bootloader at the
bottom of flash, the application above it, the configuration from `0x020000`. This page holds only what
is the model's own, and so far that is very little.

* **One firmware build serves the 880 and the 885**, so the layout of the program is the same on both, and
  so is the safe mode configuration inside it, byte for byte.[^s114]
* **A configuration states the model twice**: its architecture record reads `08 08 11 0d` on an 885 and
  `08 08 0f 0d` on an 880, and the header of the file it travels in carries the skin as well.[^s182][^s113]

## Not checked

* Anything off a unit: the flash part and size, the serial number at `0x000110`, and what a unit holds past
  its configuration.[^unchecked]

[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^s182]: Measured in configurations. [Section 182](../../../docs/findings.md#s182)
[^s113]: Measured in configurations. [Section 113](../../../docs/findings.md#s113)
[^unchecked]: Not checked.
