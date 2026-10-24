# Harmony 600: firmware

The 600 runs firmware **0.2**. It is the same program as the Harmony 650's 0.2, built separately: the code
sits at slightly different addresses and the build reports its own model number, and nothing else
differs in meaning. Logitech names a newer version, 0.3, of which no copy is known to exist.

What the architecture's firmware is, how an image is laid out, what safe mode is, how a remote installs
firmware, and which routines have been read on which build, is
[the architecture's firmware.md](../../architectures/harmony-600-650-700/firmware.md). This page states
what is the 600's own.

## Versions

| version | what | evidence |
|---|---|---|
| **0.2** | the application, 70336 bytes, entry `0x1A26E`, execution base `0x9000`, read whole off a unit and verified by its own header checksum; safe mode 0.2, 24320 bytes | [^s23] |
| 0.2 | the forum table's newest seen, which is out of date | [^x-forum] |
| **0.3** | named for skin 71 by MyHarmony's own version list; the image it names answers 404, as every image on that list does | [^x-versiondb][^unchecked] |

**A newer version exists by Logitech's word and no copy of it is held.** The version list in MyHarmony
names 0.3 for skin 71, the 600 for the Americas, and has no entry for skin 73[^x-versiondb]; that the
image it names answers 404 is in no archive section or test yet[^unchecked]. Logitech's software update
service answers 404 for skin 71[^s295]. [Logitech's update service](../../logitech/update-service.md#myharmonys-own-version-list)
holds the whole list.

## The 600's 0.2 and the 650's 0.2

**One program in two builds**, 1395 bytes differing position by position, so an address read on one does
not transfer to the other without checking[^s281]. Which routines have been found identical on both is
the architecture's table of [routines read and where](../../architectures/harmony-600-650-700/firmware.md#routines-read-and-where).

**What the 1395 bytes are**: nearly all are code addresses that moved[^s392]. Two routines near the top
swap places, one of 232 bytes at `0x19E02` on the 600 and one of 228 at `0x19D12`. The 600's build carries
12 bytes the 650's lacks, two routines returning `0x74E` and `0x74F` that nothing calls, so everything from
the USB descriptors at `0x19EEA` up sits 12 bytes lower on the 650. The rest are references to moved code:
91 `CALL` and `GOTO` targets, 21 `MOVLW` literals and seven three byte pointers.

**What differs in meaning is the model number**: 71 in the version reply at `0x11964` and `0x1071` in the
USB device descriptor, against the 650's 72 and `0x1072`. So whatever draws the Off screen, or skips it,
is the same code on both remotes[^s392], [behaviour.md](behaviour.md).

## No charging events

**The 0.2 build posts no charging events**: none of `0x1E`, `0x1F`, `0x20` to `0x25` or `0x30`, the events
the Harmony 700's 2.8 raises from its charger test, as far as direct posts go. It reads `PORTB` bit 1 as
the cable's gate, as the 700 does. So the "Insert batteries" binding a 600 configuration carries is not
raised that way on this model[^s384].

## Safe mode and recovery

* The bootloader, the safe mode image and how safe mode is entered are the architecture's,
  [its firmware.md](../../architectures/harmony-600-650-700/firmware.md#safe-mode). Entering safe mode by
  keys has not been tried on any unit of this architecture[^unchecked].
* The 600's 0.2 safe mode image carries part of the reinstall routine the Harmony 700 uses, and is
  otherwise unread, [the architecture's firmware.md](../../architectures/harmony-600-650-700/firmware.md#installing-firmware).
* **The 600 keeps a copy of its application** in external flash at `0x000000`, the image a reinstall would
  copy, [memory.md](memory.md). The reinstall route has been run on the Harmony 700 only[^s295b].

## Not checked

* Why the 600's and 650's 0.2 builds were built apart: what differs between them is read, above, and is
  moved addresses, two routines nothing calls and the model number[^s392].
* What the routine swapped near the top of each build is for: the 228 byte one drives a pulse train on
  `LATG` bit 0 and has no direct caller[^s392].
* What the 600's safe mode does with an update status byte of 2, end to end[^unchecked].
* Safe mode entry on a 600, by keys or otherwise[^unchecked].

[^s23]: Measured on a unit. [Section 23](../../../docs/findings.md#s23)
[^x-forum]: Stated by a third party. [The comparison table of harmony-remote-forum.de](https://www.harmony-remote-forum.de/harmony_compare.php)
[^x-versiondb]: Stated by Logitech. [MyHarmony's firmware version list](https://files.myharmony.com/Assets/Firmware/VersionDbDefaults2.xml)
[^unchecked]: Not checked.
[^s295]: Stated by Logitech, by their service. [Section 295](../../../docs/findings.md#s295)
[^s281]: Read in the firmware. [Section 281](../../../docs/findings.md#s281)
[^s392]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^s384]: Read in the firmware. [Section 384](../../../docs/findings.md#s384)
[^s295b]: Measured on a unit. [Section 295](../../../docs/findings.md#s295)
