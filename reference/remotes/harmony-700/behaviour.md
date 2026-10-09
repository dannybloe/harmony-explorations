# Harmony 700: behaviour

What the remote does in use, as a person holding it sees it. The operating concept, activities and
device mode, is `docs/how-a-harmony-works.md`, and this page does not restate it. Most of what has been
seen at the bench on this architecture was seen on the Harmony 650, whose
[behaviour.md](../harmony-650/behaviour.md) carries it; a row here is the 700's own or names its source.

## Device mode, in and out

The same as the Harmony 600's: no Devices key, **the centre key below the display** under the word
"Devices" opens the device list, and the centre key again returns to activities. Logitech's manual page 6,
"select devices by pressing the center button below Devices", and page 9, "press the center button to
return to Activities". The 700 plays no click: its architecture has no tone instruction, section 74.

## Starting, switching and ending activities

* An activity key, or More Activities and a side key, starts an activity; All Off switches off the devices
  of the current activity. Logitech's manual pages 5 and 7.
* **A power on delay is heard**: in an activity, raising one device's power on delay by three seconds in
  the configuration moved that device's next command by three seconds on the air, and putting it back moved
  it back, measured with an infrared receiver on a unit, section 301.

## After a write, a sync or a firmware install

| what happens | standing and source |
|---|---|
| a configuration block written back unchanged leaves the remote on the bus with no restart | measured on a unit, section 300 |
| a whole write with the cache drop and the restart: the change is live after the restart | measured on a unit, section 301 |
| on the 2.8 build the cache drop sets **one more flag** than on the 0.2 builds, which makes a restart after it reload every state variable from the configuration even when the configuration validates | read in the firmware, section 299 |
| **a Harmony Desktop sync on a running 700 writes no firmware**: both internal pages and the staging region read identical before and after, and two records are appended to the settings store | measured on a unit, section 296 |
| a Harmony Desktop sync with the remote in safe mode rewrote the configuration and wrote no application into the processor | measured on a unit, section 295 |
| **asked to install, the 700 installs its own firmware**: with the update status byte set to 2 and a restart, the safe mode image copies the application staged in external flash and runs it | measured on a unit stuck in safe mode, which came back running, section 295; and taking a unit from 2.5 to 2.8 from a staged image, section 297 |
| after a power on, the application clears the update status byte; after the escape's own restart it leaves it | read in the 2.5 and 2.8 builds, section 298 |

## A remote stuck in safe mode

A 700 can arrive showing the safe mode screen at every start because its application no longer verifies:
on the unit of section 295, one 1 KiB page of the application was erased. Logitech's MyHarmony and Harmony
Desktop did not repair it; asking the remote to reinstall its staged copy did, section 295 and the
`recovering-a-remote` skill.

## Not checked

* Whether the 700 wakes when picked up; the manual says it does.
* What the remote shows and does while it charges.
* The IR status indicator, the introduction tour and the Remote Assistant on a 700.
* Advanced help's screens on a 700.
