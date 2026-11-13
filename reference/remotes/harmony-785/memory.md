# Harmony 785: memory

How this platform's flash and data memory are laid out is stated once in
[the architecture's memory page](../../architectures/harmony-880-885/memory.md); this page holds what the 785's
flash was read to hold. The whole flash below `0x1FE000` read twice gives the same bytes.[^t-785-first-read]

| from | what it held on the two remotes read |
|---|---|
| `0x000000` | the bootloader, [firmware.md](firmware.md), with the identity block at `0x000110` |
| `0x010000` | the application, 4.5 |
| `0x020000` | the user configuration, stating architecture 8 and skin 45 in base slot 1, and base slot 2 as `15360, 0x1E0000, 0x1FE000`, as every Harmony 880 and 885 configuration states it |
| `0x1D0000` | the staging region, holding a copy of the running application |
| `0x1E0000` | the log area: entries of eight bytes, `02 00 00 00 00 FF FF 05`, one on one remote and 118 on the other, the rest erased |

What a log entry means is not read here.[^t-785-first-read]

## Not checked

* Data memory: where the 785's build keeps the key held and the clock.[^unchecked]

[^t-785-first-read]: Measured on a unit. [The test](../../../tests/harmony_880_885/test_harmony_785_first_read.py)
[^unchecked]: Not checked.
