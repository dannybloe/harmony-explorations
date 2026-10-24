# Harmony 600: behaviour

What the remote does in use, as a person holding it sees it. The operating concept, activities and
device mode, is [how a Harmony works](../../how-a-harmony-works.md), and this page does not restate it;
it says how the 600 does it. Much of what has been seen on this architecture was seen on the Harmony 650,
whose [behaviour.md](../harmony-650/behaviour.md) carries it; a row here is the 600's own.

The 600 plays no click on a key or a screen key: its architecture has no tone instruction[^s74].

## Device mode, in and out

| | how | evidence |
|---|---|---|
| in | **the centre key below the display**, under the word "Devices". There is no Devices key: the manual's button table lists every key and none is called Devices. The manual: "you select devices by pressing the center button below Devices", pages 5 and 6 | [^x-manual] |
| choosing a device | a list of devices, chosen with the arrows and the side keys, four to a page, page 9 | [^x-manual] |
| a device's page | that device's commands on the screen and its own keypad map, page 9; the keypad map is the device's own screen record | [^x-manual], [^s271] |
| out | the centre key again, which then reads "Activity": "press the center button to return to Activities", page 9 | [^x-manual] |

The manual: "In some cases, you may want to control a device individually. You can use the device
feature of the Harmony 600 to control devices one-by-one."[^x-manual]

## Starting, switching and ending activities

* An activity key starts its activity, or More Activities and a side key, and the remote "will take care
  of powering on the needed devices, and powering off the ones not needed", page 7. All Off "turns off all
  the devices in the current Activity", page 5[^x-manual].
* A changed variable fires every transition that matches it, and a fired write fires its own: the routine
  that walks the transitions and both setters are byte for byte the 650's in the 600's 0.2 image[^s332].
* **A configuration runs as its file predicts.** A configuration of five devices and four activities,
  built by this project, sent every infrared frame as the device and command the file sends at that step,
  volume to the amplifier and channels to the set top box also after a visit to another device's
  pages[^s389]; and the delays the file states held, every gap between a device's power and its next
  command at least that device's power on delay[^s391].
* **"Turning system off"**, the Off screen, did not show on leaving the cable or on All Off, on any run of
  a file of this project's stating model number 73, whether the mark it waits for was at 1 or at
  0[^s387][^s391]. With the same file stating 71, the number the remote reports, it showed very briefly
  after a start, one sighting, with All Off not reported on[^s392]. Three readings were open before that
  sighting, the model number, a light the 600's configurations set lower than the 650's, and a slower
  panel; the sighting favours the number without excluding a screen too brief to see[^s392].

## Help

Help resends what the running activity needs and asks "Did that fix the problem?"; held for five seconds
it opens advanced help, where the delay between devices is changed on the remote, pages 8 and
22[^x-manual].

**A delay saved on the remote wins over the configuration's at every start.** A power on delay raised in
the configuration was not heard, because the remote held a saved value for that device and copied it over
the configuration's at start[^s303]. Which action on the remote saved it is not established[^unchecked].
The copy is the configuration's own program, so a configuration that does not carry it runs its own
delays: a file of this project's with no restore ran its 0.5 s delay between devices while the remote
held a saved inter device delay of 1.5 s, and no gap took the saved value[^s391]. The store itself is
[features.md](features.md) and [memory.md](memory.md).

## After a write, a restart or a rejected configuration

| what happens | evidence |
|---|---|
| a configuration block written back unchanged leaves the remote on the bus with no restart, since this architecture does not run its configuration in place | [^s302] |
| a whole write with the cache drop and the restart lands, and the remote runs it after the restart | [^s303] |
| the write's restart seeds the state variables from the file: a variable read over USB afterwards holds the value the configuration starts it at, both values tried | [^s387] |
| on the cable the configuration's state variables are **live**: the clock in variables 0 to 6 ticks between two reads, and a variable reads the value its configuration starts it at, from `0xE10` on build 0.2 | [^s303], [^s387] |
| a configuration that fails validation does **not** latch the status screen until the batteries come out, as a Harmony One's does: the 600 has the same poll, flag and validator and arms without consulting the verdict, so a failed validation re-arms. The resting state of a connected 600 was measured; the failing case itself is not tried | [^s252], [^s252b] |
| the trailer checksum is checked only while bit 0 of setting `0x80` in the settings store is set, and it was clear on the unit read, so the 600 accepts a configuration on its three markers alone; "Configuration Corrupted" can then come only from the configuration | [^s354], [^s282] |

The state variables were once read as not loaded on the cable, on the strength of five journal variables
that read zero; those are variables of another kind and say nothing about the configuration's[^s387],
[the architecture's usb.md](../../architectures/harmony-600-650-700/usb.md#commands).

## Not checked

* Whether the 600 wakes when picked up; the manual says it does[^unchecked].
* The IR status indicator, and the introduction tour after a sync, both seen only on the 650[^unchecked].
* Advanced help's screens on a 600, and which of its actions saves a delay[^unchecked].
* What the 600 shows after a configuration fails validation[^unchecked].
* Why "Turning system off" shows with one model number and was not seen with the other, and whether it
  shows on All Off with 71[^s392].
* Whether the remote counts devices at all; it ran six[^s390].

[^s74]: Read in the firmware. [Section 74](../../../docs/findings.md#s74)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 600 user manual](https://support.myharmony.com/harmony-600-user-manual)
[^s271]: Read in the firmware. [Section 271](../../../docs/findings.md#s271)
[^s332]: Read in the firmware. [Section 332](../../../docs/findings.md#s332)
[^s389]: Measured on a unit. [Section 389](../../../docs/findings.md#s389)
[^s391]: Measured on a unit. [Section 391](../../../docs/findings.md#s391)
[^s387]: Measured on a unit. [Section 387](../../../docs/findings.md#s387)
[^s392]: Measured on a unit. [Section 392](../../../docs/findings.md#s392)
[^s303]: Measured on a unit. [Section 303](../../../docs/findings.md#s303)
[^unchecked]: Not checked.
[^s302]: Measured on a unit. [Section 302](../../../docs/findings.md#s302)
[^s252]: Read in the firmware. [Section 252](../../../docs/findings.md#s252)
[^s252b]: Measured on a unit. [Section 252](../../../docs/findings.md#s252)
[^s354]: Read in the firmware. [Section 354](../../../docs/findings.md#s354)
[^s282]: Measured on a unit. [Section 282](../../../docs/findings.md#s282)
[^s390]: Measured on a unit. [Section 390](../../../docs/findings.md#s390)
