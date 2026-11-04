# Harmony 885: memory

Where a Harmony 885 keeps its program and its configuration is its platform's, and is stated once in
[the architecture's memory page](../../architectures/harmony-880-885/memory.md): the bootloader at the
bottom of flash, the application above it, the configuration from `0x020000`. This page holds only what
is the model's own, and so far that is very little.

* **One firmware build serves the 880 and the 885**, so the layout of the program is the same on both, and
  so is the safe mode configuration inside it, byte for byte, which the remote runs when its own
  configuration fails the check at start.[^s114][^t-885-start]
* **A configuration can make the remote write its own flash**: an action list can append records to the
  log area, and the remote writes them wherever the configuration's base slot 2 says, checked only against
  the floor at `0x010000`. Two Harmony 880 configurations read do it, from lists some of which are bound
  to a key; no 885 configuration read does.
  Nothing else the remote decides is kept: there is no settings store and no EEPROM in use, so no value
  saved on the remote overrides the configuration, [the architecture's memory page](../../architectures/harmony-880-885/memory.md#what-the-remote-writes-on-its-own).[^t-885-log][^t-885-log-corpus]
* **A configuration states the model twice**: its architecture record reads `08 08 11 0d` on an 885 and
  `08 08 0f 0d` on an 880, and the header of the file it travels in carries the skin as well.[^s182][^s113]

## Not checked

* Anything off a unit: which of the two flash parts the firmware knows is fitted, the serial number at
  `0x000110`, and what a unit holds past its configuration, its log area included.[^unchecked]

[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^s182]: Measured in configurations. [Section 182](../../../docs/findings.md#s182)
[^s113]: Measured in configurations. [Section 113](../../../docs/findings.md#s113)
[^unchecked]: Not checked.
[^t-885-start]: Read in the firmware. [The test](../../../tests/test_harmony_885_start_check.py)
[^t-885-log]: Read in the firmware. [The test](../../../tests/test_harmony_885_log_area.py)
[^t-885-log-corpus]: Measured in configurations. [The test](../../../tests/test_harmony_885_log_area.py)
