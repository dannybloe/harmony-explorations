# Harmony 650: firmware

What the 650 runs and how it would be recovered. The architecture's part, how an image is laid out, what
safe mode is, the `-safe.bin` naming trap and which routines are read on which build, is in
[the architecture's firmware.md](../../architectures/harmony-600-650-700/firmware.md).

## Versions

Two builds exist for the 650, both in
[the architecture's table of builds](../../architectures/harmony-600-650-700/firmware.md#builds):

* **0.2**, which a 650 read over USB runs: application 70336 bytes, entry `0x1A262`, safe mode 24320
  bytes[^s281].
* **0.4**, the newest Logitech published, in a firmware package of theirs: application 75392 bytes, entry
  `0x1B658`[^s30]. A forum's table names 0.2 as the newest, which is out of date.

**Logitech's software update service does not serve this model**: it answers 404 for skin 72, so the
0.4 package is the only published image[^s295c].

## The 650's 0.2 is not the 600's 0.2

**One program in two builds.** 1395 bytes differ position by position, 67333 of 70336 sit at the same
address, and a run near the top is shifted twelve bytes lower on the 650. So an address read on the 600
does not transfer to the 650 without checking[^s281].

**Why they differ is read, and it is not the panel**: nearly every differing byte is a code address that
moved. Two routines near the top swap places, one of 232 bytes sitting 240 bytes lower on the 650 and
the other, 228 bytes, 232 higher; the 600's build carries 12 bytes the 650's lacks, two routines nothing
calls, so everything from the USB descriptors up sits 12 bytes lower on the 650; the rest are 91 `CALL`
and `GOTO` targets, 21 `MOVLW` literals and seven three byte pointers following that code, and the header
checksum word. **What differs in meaning is the model number the build reports**, 72 on the 650 and 71 on
the 600 in the version reply, and the USB device descriptor's release number, `0x1072` against
`0x1071`[^s392]. The drawing path the panel is fed by is byte for byte the same code on both
builds[^s387]. This page said why the builds differ was not checked and that "the colour panel is the
obvious suspect"<!--superseded--> until section 392 read it.

Which routines are read on the 650's 0.2, and which of them were compared with the 600's, is the
architecture's
[table of routines](../../architectures/harmony-600-650-700/firmware.md#routines-read-and-where).

## Safe mode and recovery

* The 650's 0.2 safe mode image carries part of the reinstall routine the Harmony 700 uses: the status
  normalisation at `0x01A8C`, in a routine at `0x01A80` called once from `0x0107E`. Its selector 6
  handler and its escape handler are **unread**[^s295b].
* The reinstall route, which sets the update status byte and restarts so safe mode copies a staged
  application, **has been run on the Harmony 700 only**,
  [the architecture's firmware.md](../../architectures/harmony-600-650-700/firmware.md#installing-firmware)[^s295].
* **A 650 has no staged application to reinstall**: its external block at zero is erased apart from a
  copy of its identity, [memory.md](memory.md)[^s281]. So the reinstall route would first need an image
  staged, the staging route, which has been run on the Harmony 700 only. This is this reference's reading
  of two measurements and has **not** been tried[^unchecked].
* Entering safe mode on this model has **not** been tried[^unchecked]. On the Harmony 525 it destroys the
  application, [its firmware page](../../architectures/harmony-5xx/firmware.md).

## Not checked

* The 0.4 package's validator and clock routines[^unchecked]. Its walker, toggle update, pixel loop and
  queued program run are located and not compared[^s332][^s365][^s367][^s369].
* Whether the 0.4 build differs from 0.2 in anything a person sees[^unchecked].
* What the 650's safe mode does with a status byte of 2, end to end[^unchecked].
* How a 650 behaves in safe mode, and how it is entered[^unchecked].

[^s281]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^s30]: Read in the firmware. [Section 30](../../../docs/findings.md#s30)
[^s295c]: Stated by Logitech, by their service. [Section 295](../../../docs/findings.md#s295)
[^s392]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^s387]: Read in the firmware. [Section 387](../../../docs/findings.md#s387)
[^s295b]: Read in the firmware. [Section 295](../../../docs/findings.md#s295)
[^s295]: Measured on a unit. [Section 295](../../../docs/findings.md#s295)
[^unchecked]: Not checked.
[^s332]: Read in the firmware. [Section 332](../../../docs/findings.md#s332)
[^s365]: Read in the firmware. [Section 365](../../../docs/findings.md#s365)
[^s367]: Read in the firmware. [Section 367](../../../docs/findings.md#s367)
[^s369]: Read in the firmware. [Section 369](../../../docs/findings.md#s369)
