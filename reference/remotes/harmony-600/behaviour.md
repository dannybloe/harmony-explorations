# Harmony 600: behaviour

What the remote does in use, as a person holding it sees it. The operating concept, activities and
device mode, is `reference/how-a-harmony-works.md`, and this page does not restate it; it says how the 600
does it. Most of what has been seen at the bench on this architecture was seen on the Harmony 650, whose
[behaviour.md](../harmony-650/behaviour.md) carries it; a row here is the 600's own or names its source.

## Device mode, in and out

The 600 plays no click on a key or a screen key: its architecture has no tone instruction, section 74.

| | how | standing and source |
|---|---|---|
| in | **the centre key below the display**, under the word "Devices". There is no Devices key: the manual's button table lists every key and none is called Devices | Logitech's manual pages 5 and 6, "you select devices by pressing the center button below Devices"; `reference/how-a-harmony-works.md`, which records that this file's predecessors claimed a Devices key for a day |
| choosing a device | a list of devices, chosen with the arrows and the side keys, four to a page | Logitech's manual page 9; `reference/how-a-harmony-works.md` |
| a device's page | that device's commands on the screen, and its own keypad map | Logitech's manual page 9; the map is the device's own screen record, section 271 |
| out | the centre key again, which then writes "Activity" | Logitech's manual page 9, "press the center button to return to Activities"; `reference/how-a-harmony-works.md` |

The manual: "In some cases, you may want to control a device individually. You can use the device
feature of the Harmony 600 to control devices one-by-one." Logitech's manual page 9.

## Starting, switching and ending activities

* An activity key starts its activity, or More Activities and a side key, and the remote "will take care
  of powering on the needed devices, and powering off the ones not needed". Logitech's manual page 7.
* All Off "turns off all the devices in the current Activity". Logitech's manual page 5.
* A changed variable fires every transition that matches, and a fired write fires its own: the walker
  and both setters are byte for byte the 650's on the 600's 0.2 image, read in the firmware, section 332.
* **Configurations built by this project run as their files predict**: five devices and four activities,
  every infrared frame heard decoding to the device and command the file sends at that step, volume to the
  amplifier and channels to the set top box also after a visit to another device's pages, measured with an
  infrared receiver, section 389; and the delays the file states held, every gap between a device's power
  and its next command measured at least that device's power on delay, section 391.
* **"Turning system off" did not show** on leaving the cable or on All Off, on any run of a file of this
  project's stating model number 73, with the mark it waits for at 1 or at 0, sections 387 and 391; with
  the same file stating 71, the number the remote reports, it showed very briefly after a boot, seen at the
  bench, one sighting with All Off not reported on, section 392. Three readings were left before that
  sighting, the number, a light the 600's configurations set lower than the 650's, and a slower panel, and
  the sighting favours the number without excluding a screen too brief to see, section 392.

## Help

Help resends what the running activity needs and asks "Did that fix the problem?"; held for five seconds
it opens advanced help, where the delay between devices is changed on the remote. Logitech's manual pages
8 and 22. **A delay saved on the remote wins over the configuration's at every start**, measured on a
unit, section 303: a power on delay raised in the configuration was not heard, because the remote held a
saved value for that device and copied it over the configuration's at start. Which action on the remote
saved it is **not established**. The copy is the configuration's own program, so a configuration that does
not carry it runs its own delays: a file of this project's with no restore ran a device's 0.5 s delay
between devices while the remote held 1.5 s saved for a key, and no gap took the saved value, measured,
section 391.

## After a write, a restart or a rejected configuration

| what happens | standing and source |
|---|---|
| a configuration block written back unchanged leaves the remote on the bus with no restart, since this architecture does not run its configuration in place | measured on a unit, section 302 |
| a whole write with the cache drop and the restart lands, and the remote runs it after the restart | measured on a unit, section 303 |
| a configuration that fails validation does **not** latch the status screen until the batteries come out, as a Harmony One's does: the 600 has the same poll, flag and validator and arms without consulting the verdict, so a failed validation re-arms | read in the 600's 0.2 image, section 252; the resting state of a connected 600 measured there. The failing case itself is **not tried** |
| the trailer checksum is checked only while bit 0 of setting `0x80` in the settings store is set, and it was clear on the unit read, so the 600 accepts a configuration on its three markers alone; "Configuration Corrupted" can then come only from the configuration | read in the 0.2 image, the 650's build being the same, section 354; the setting measured, section 282 |
| the write's restart seeds the state variables from the file: a variable read over USB after it holds the value the configuration starts it at, both values tried | measured on a unit, section 387 |
| on the cable the configuration's state variables are **live**: the clock in variables 0 to 6 ticks between two reads, and a variable reads the value its configuration starts it at, from `0xE10` on build 0.2 | measured on a unit, sections 303 and 387. This row said "on the cable, the 600 does not load its configuration"<!--superseded--> on the strength of section 110, whose journal variables read zero; section 387 found those to be five variables of another kind, so section 110 does not say otherwise |

## Not checked

* Whether the 600 wakes when picked up; the manual says it does.
* The IR status indicator, and the introduction tour after a sync, both seen only on the 650.
* Advanced help's screens on a 600, and which of its actions saves a delay.
* What the 600 shows after a configuration fails validation.
* Why "Turning system off" shows with one model number and was not seen with the other, and whether it
  shows on All Off with 71, section 392.
* Whether the remote counts devices at all; it ran six, section 390.
