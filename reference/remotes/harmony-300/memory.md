# Harmony 300: memory

The layout is the architecture's, from the firmware's own file table: the configuration is `/cfg/usercfg`
on the external medium at `0x020000`, and the container has 15 pointer slots,
[the architecture's memory.md](../../architectures/harmony-300-350/memory.md). **No memory has been read
off a 300**; only its files.

## What is the 300's own

| | value | standing and source |
|---|---|---|
| infrared groups | **four in every configuration**, unused ones empty, the model's maximum | measured, section 264 |
| the group index | the device key: TV 0, Cable/Sat 1, DVD 2, VCR/Aux 3 | measured, section 265 |
| raw slot 8 | twice the device count on a current compile, and empty on a configuration built in 2011, so it follows the compiler and not the model | measured, section 265, which corrects section 264 |
| configurations read | 41234 bytes as a second hand unit arrived, 97474 after four devices were programmed | measured, sections 264 and 265 |

## Not checked

* Anything in the remote's memory beyond the files it serves.
