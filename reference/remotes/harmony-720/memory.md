# Harmony 720: memory

How this platform's flash and data memory are laid out is stated once in
[the architecture's memory page](../../architectures/harmony-880-885/memory.md); this page holds what is the
720's own.

**Its build keeps the key held at data memory `0x296`**, where the 880's and 885's keep it at `0x295`, and
the last key pressed at `0x3A1`, as theirs do,
[the platform's data memory](../../architectures/harmony-880-885/memory.md#data-memory).[^t-885-keys]

## Not checked

* Anything off a unit: the flash part and size, and what lies outside the configuration.[^unchecked]

[^t-885-keys]: Read in the firmware. [The test](../../../tests/test_harmony_885_keys.py)
[^unchecked]: Not checked.
