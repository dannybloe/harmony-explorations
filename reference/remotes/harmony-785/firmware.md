# Harmony 785: firmware

**The application is the Harmony 720's 4.5 with ten bytes changed**, on both remotes read: its 64 KiB at
`0x010000` differ from the 720's image, read off a 720 by its owner, in ten bytes, the skin in two places, 45 for 44, and eight
more at `0x01E6B1`, `0x01E6B8`, `0x01E6C7`, `0x01E80C` to `0x01E80E` and `0x01FAD9` to `0x01FADA`, whose
meaning is not read, so whether the two come from one source is not shown. Its version accessor returns version 4.5, software type 0, skin 45, platform 8 and
architecture 8. The product string is `Harmony Remote 0-4.5.0`.[^t-785-first-read] What of the 720's build has been
compared with the 885's is [the platform's firmware page](../../architectures/harmony-880-885/firmware.md#the-harmony-720s-images).

**The bootloader is not the same on every 785.** Of the two read:

| bootloader | version accessor | product string |
|---|---|---|
| a 4.4 build no other image read here carries | 4.4, software type 3, skin 45, platform 0 | `Harmony Remote 3-4.4.2` |
| the Harmony 720's 4.2 build with the skin set to 45, in its version accessor and its USB descriptor | 4.2, software type 3, skin 45, platform 0 | `Harmony Remote 3-4.2.4` |

So a version read off one 785's bootloader says nothing of another's.[^t-785-first-read] The 880's and 885's is
4.0.[^t-885-boot]

**The staging region holds the running application**, its 64 KiB equal to the 64 KiB at `0x010000` but for the
byte at offset 2, on both remotes.[^t-785-first-read]

## Not checked

* The write end, the cache drop and the restart, and the staged install status, in application 4.5; the
  bootloaders' refusal of an erase or a write below `0x010000`; and which bootloader Logitech shipped when.[^unchecked]

[^t-785-first-read]: Measured on a unit. [The test](../../../tests/harmony_880_885/test_harmony_785_first_read.py)
[^t-885-boot]: Read in the firmware. [The test](../../../tests/harmony_880_885/test_harmony_885_bootloader.py)
[^unchecked]: Not checked.
