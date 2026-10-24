# Harmony 700: behaviour

What the remote does in use, as a person holding it sees it. The operating concept, activities and
device mode, is `reference/how-a-harmony-works.md`, and this page does not restate it. Most of what has been
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
* **Configurations built by this project run as their files predict**, measured with an infrared receiver
  on a unit, section 386: six devices and then seven, every frame the receiver could decode being the device
  and command the file sends at that step, channels still going to the set top box after a visit to another
  device's pages. A configuration with no device sends nothing, and on it "USB Connected" shows on the cable,
  Devices and Activities lead to each other, each empty activity key shows "add an Activity on this button"
  and Exit returns, and the screen goes dark about 20 seconds after the last key and wakes on a key, seen at
  the bench, section 383.
* **More Activities on a configuration with no activity** shows "add Activities" when the activity menu binds
  it to a list entering that screen, as Logitech's one compile with no activity does on the Harmony 650, and
  does nothing when it maps back to the running activity, seen at the bench, section 383.

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

## The Off screen

With activities in the configuration, All Off reaches "Turning system off" through a list that enters it
only while a mark variable is 1, read from configurations, Logitech's 700 compile and this project's alike;
on Logitech's compiles that mark starts at 0 and is set to 1 only by the welcome tour's start list. On the 700
a configuration of this project's with the mark starting at 0 showed no Off screen on All Off, and the mark
read 0 over USB; started at 1, the mark read 1 after the write's restart and All Off showed "Turning system
off" for a moment before the menu, seen at the bench and measured, section 386. That the 2.8 build does not
queue the tour's start where the Harmony 650's 0.2 does is a reading of what was seen, **unread** in either
image, section 386. A configuration with no activity showed the Off screen on All Off and on leaving the cable with its mark at
0, section 383, which is **unexplained**, section 386; one with activities showed none on leaving the
cable, section 386, and why is **not traced**.

## A remote stuck in safe mode

A 700 can arrive showing the safe mode screen at every start because its application no longer verifies:
on the unit of section 295, one 1 KiB page of the application was erased. Logitech's MyHarmony and Harmony
Desktop did not repair it; asking the remote to reinstall its staged copy did, section 295 and the
`recovering-a-remote` skill.

## Not checked

* Whether the 700 wakes when picked up; the manual says it does.
* What the remote does while it charges beyond the screens: [hardware.md](hardware.md) and
  [display.md](display.md) carry when the charging screens show, sections 383 and 384, and that charging is
  switched on is read in the firmware and not measured on the cells.
* The IR status indicator, the introduction tour and the Remote Assistant on a 700.
* Advanced help's screens on a 700.
