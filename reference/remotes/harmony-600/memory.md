# Harmony 600: memory

The layout is the architecture's: internal flash of two 64 KiB pages holding the bootloader, safe mode
and the application, and 2 MiB of external SPI flash holding the user configuration from `0x030000`.
That map, its constants and the settings store's layout are in
[the architecture's memory.md](../../architectures/harmony-600-650-700/memory.md). This page states what
is the 600's own: the lengths measured on it and where it differs from the 650 and 700.

## Where the 600 differs

| region | on the 600 | evidence |
|---|---|---|
| external `0x000000` to `0x0112C0` | **a stored copy of the application**, 70336 bytes, the same image the processor runs, and the one a reinstall would copy; the 650 has none and the 700 holds a staged image there | [^s23], [^s281] |
| external `0x020000` to `0x021BCB` | the safe mode configuration, 7115 bytes, format 1.4, 20 slots, erased after it. All 15<!--fact:container_checks--> container checks pass on it and the base it recovers from its own end address is `0x020000`; it differs from the 700's in 83 bytes, almost all in the key table | [^s24] |
| internal `0xFE` `+0x0000` | the bootloader, its last written byte at `+0x0F27`, so 3880 of its 4096 bytes in use; 1152 bytes differ from the 650's | [^t-memory-map-unit], [^s189], [^s281] |
| internal `0xFE` `+0x1000` | safe mode 0.2, 24320 bytes, ending at `+0x6F00`, its own checksum verifying; 924 bytes differ from the 650's. Erased from there to `+0x9000` | [^s23], [^s281] |
| internal `0xFE` `+0x9000` | the application 0.2, 70336 bytes, entry `0x1A26E`, running into page `0xFF` to `+0xA2C0`, its own checksum verifying over all of it. Because it crosses the page boundary, a read of one 64 KiB window returns only 65536 of its bytes and loses the entry point | [^s23] |
| internal `0xFF` `+0x0000` and `+0xE000` | **no image header**: `+0x0000` holds only the application's tail and `+0xE000` nothing, where the Harmony One holds two images; that absence matching an absence is what placed version block fields 8 and 9, which read `0x00` here | [^s23] |
| internal `0xFF` `+0xEC00` | the settings store, below | [^s282] |
| internal `0xFF` `+0xF400` to `+0xF800` | the identity block and four small records, below | [^s23] |
| internal `0xFF` `+0xFFF8` | the configuration words, six bytes | [^s25] |

## The settings store

Internal page `0xFF` `+0xEC00`, the architecture's layout. The 600 is the unit on which **saved delays
were found**: settings `0x00` to `0x13` and `0x18` to `0x2B` are two tables of five power on and five
inter device delays, keyed per device, which the configuration copies over its own at start, read in the
600's 0.2 image and measured, section 303. One was cleared over USB, section 305. The 650's and 700's
stores held only setting `0x80`. A saved inter device delay was still in the store after this project's
configuration writes, and a configuration that does not restore it runs its own value, measured, sections
387 and 391.

## The identity block and the records after it

The identity block at `0xFF` `+0xF400` holds 48 bytes and its fourth field is erased: the `0xEE` filled
field named the serial, then the two GUIDs that identify the remote[^s23][^s226]. The values are one
remote's serial and never appear in this repository.

After it four short runs are written, and Logitech's client has a name for two of them; the other two
lie past the last record it names[^t-memory-map].

| offset | length | what it is |
|---|---|---|
| `+0xF580` | 4 | the client's **battery calibration** record, three bytes of it nonzero[^s150] |
| `+0xF640` | 12 | the client's **manufacturing identifier** record, ten bytes of it nonzero[^s150] |
| `+0xF6C0` | 4 | outside every record the client names: the flag word the firmware's `0xBD` state clears once, which reads `fe ff` here, already cleared[^s304] |
| `+0xF735` | 3 | outside every record the client names, and unread in the firmware |

## Data memory

The 0.2 build's addresses, which the 600 and the 650 share for the routines read, are in
[the architecture's memory.md](../../architectures/harmony-600-650-700/memory.md), "Build 0.2, the Harmony
600 and 650". **They are read live on a connected 600**: the state variables from `0xE10`, with the clock
in variables 0 to 6 ticking between two reads and a variable at the value its configuration starts it
at, sections 303 and 387; the flash id at `0x686` and `0x687`, `0x15` and `0x1C`, section 110; and the
panel's first identity byte at `0x384`, 0, section 387. This said "**Their values were read live on the
Harmony 650 only**"<!--superseded--> and "on a connected 600 the configuration's own variables were not
loaded"<!--superseded-->, section 110, until section 387 found section 110's five zero variables to be of
another kind.

## Not checked

* External `0x0112C0` to `0x020000`, and `0x021BCB` to `0x030000` past the 8192 bytes read at
  `0x020000`[^unchecked].
* What the 83 bytes are that separate the 600's safe mode configuration from the 700's, beyond lying
  almost all in the key table, the expected place for two keypads to differ[^unchecked].
* What setting `0x80` in the store means beyond bit 0, and what the run at `+0xF735` holds[^unchecked].
* The data memory values of a 600 running its configuration off the cable; on the cable they are read,
  section 387.

[^s23]: Measured on a unit. [Section 23](../../../docs/findings.md#s23)
[^s281]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^s24]: Measured on a unit. [Section 24](../../../docs/findings.md#s24)
[^t-memory-map-unit]: Measured on a unit. [The test](../../../tests/test_memory_map.py)
[^s189]: Read in the firmware. [Section 189](../../../docs/findings.md#s189)
[^s282]: Read in the firmware. [Section 282](../../../docs/findings.md#s282)
[^s25]: Read in the firmware. [Section 25](../../../docs/findings.md#s25)
[^s226]: Measured on a unit. [Section 226](../../../docs/findings.md#s226)
[^t-memory-map]: Stated by Logitech, in their client. [The test](../../../tests/test_memory_map.py)
[^s150]: Measured on a unit. [Section 150](../../../docs/findings.md#s150)
[^s304]: Read in the firmware. [Section 304](../../../docs/findings.md#s304)
[^unchecked]: Not checked.
