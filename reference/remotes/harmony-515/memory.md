# Harmony 515: memory

Where a Harmony 515 keeps its program and its configuration is its platform's, and is stated once in
[the architecture's memory page](../../architectures/harmony-5xx/memory.md). The application and the safe
mode image read off a unit at the platform's two addresses, `0x810000` and `0x800000`, and its
configuration at `0x820000`.[^t-harmony-515]

* **A configuration states the model**: its architecture record reads `09 09 43 0d`.[^t-harmony-515-c]

## Not checked

* The memory map beyond those three reads, the EEPROM and the unit identity's place.[^unchecked]

[^t-harmony-515]: Measured on a unit. [The test](../../../tests/test_harmony_515.py)
[^t-harmony-515-c]: Measured in configurations. [The test](../../../tests/test_harmony_515.py)
[^unchecked]: Not checked.
