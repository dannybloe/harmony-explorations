# Harmony 350: memory

The layout is the architecture's, from the firmware's own file table: the configuration is `/cfg/usercfg`
on the external medium at `0x020000`, and the container has 15 pointer slots,
[the architecture's memory.md](../../architectures/harmony-300-350/memory.md). **No memory has been read
off a 350**; only its files.

## What is the 350's own

| | value | standing and source |
|---|---|---|
| infrared groups | **eight in every configuration**, unused ones empty, the model's maximum | measured, section 263 |
| configurations read | a factory one of 121251 bytes, a programmed one of 83840 and one with three devices of 68985 | measured, sections 262 and 263 |
| the first configuration of this architecture read | the factory 350's, by concordance; the slot count of 15 was found on it | measured, section 194 |
| six of its fifteen slots named | out of its own firmware | read in the firmware, section 259 |

## Not checked

* Anything in the remote's memory beyond the files it serves.
