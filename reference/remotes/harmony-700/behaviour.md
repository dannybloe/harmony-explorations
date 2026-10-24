# Harmony 700: behaviour

What the remote does in use, as a person holding it sees it. The operating concept, activities and
device mode, is [how a Harmony works](../../how-a-harmony-works.md), and this page does not restate it.
Most of what has been seen of this architecture in use was seen on the Harmony 650, whose
[behaviour.md](../harmony-650/behaviour.md) carries it; a row here is the 700's own.

## Device mode, in and out

The same as the Harmony 600's: there is no Devices key. **The centre key below the display**, under the
word "Devices", opens the device list, and the centre key again returns to activities: "select devices by
pressing the center button below Devices", manual page 6, and "press the center button to return to
Activities", page 9[^x-manual]. The 700 plays no click: its architecture has no tone instruction[^s74].

## Starting, switching and ending activities

* An activity key, or More Activities and a side key, starts an activity; All Off switches off the devices
  of the current activity, manual pages 5 and 7[^x-manual].
* **A power on delay is heard**: in an activity, raising one device's power on delay by three seconds in
  the configuration moved that device's next command by three seconds on the air, and putting it back moved
  it back, measured with an infrared receiver[^s301].
* **A 700 sends what its configuration says**: with six devices and then seven, every frame an infrared
  receiver could decode was the device and command the file sends at that step, and channels still went to
  the set top box after a visit to another device's pages[^s386].
* **With no device in the configuration** it sends nothing; "USB Connected" shows on the cable, Devices and
  Activities lead to each other, each empty activity key shows "add an Activity on this button" and Exit
  returns, and the screen goes dark about 20 seconds after the last key and wakes on a key[^s383].
* **More Activities with no activity** shows "add Activities" when the activity menu binds it to a list
  entering that screen, as Logitech's one compile with no activity does on the Harmony 650, and does nothing
  when it maps back to the running activity[^s383].

## After a write, a sync or a firmware install

| what happens | evidence |
|---|---|
| a configuration block written back unchanged leaves the remote on the bus with no restart | [^s300] |
| a whole write with the cache drop and the restart: the change is live after the restart | [^s301] |
| on the 2.8 build the cache drop sets **one more flag** than on the 0.2 builds, which makes a restart after it reload every state variable from the configuration even when the configuration validates | [^s299] |
| **a Harmony Desktop sync on a running 700 writes no firmware**: both internal pages and the staging region read identical before and after, and two records are appended to the settings store | [^s296] |
| a Harmony Desktop sync with the remote in safe mode rewrote the configuration and wrote no application into the processor | [^s295] |
| **asked to install, the 700 installs its own firmware**: with the update status byte set to 2 and a restart, the safe mode image copies the application staged in external flash and runs it; [firmware.md](firmware.md) | [^s295], [^s297] |
| after a power on, the application clears the update status byte; after the escape's own restart it leaves it | [^s298] |

## The Off screen

With activities in the configuration, All Off reaches "Turning system off" through a list that enters it
only while a mark variable is 1; on Logitech's compiles that mark starts at 0 and is set to 1 only by the
welcome tour's start list[^s386b]. On a 700, with the mark starting at 0, All Off showed no Off screen and
the mark read 0 over USB; started at 1, the mark read 1 after the write's restart and All Off showed
"Turning system off" for a moment before the menu[^s386]. That the 2.8 build does not queue the tour's
start where the Harmony 650's 0.2 does is a reading of what was seen, not read in either
image[^unchecked].

With no activity in the configuration, the Off screen showed on All Off and on leaving the cable with its
mark at 0[^s383], which is **unexplained**[^s386]; with activities it showed none on leaving the cable, and
why is not traced[^s386].

## A remote stuck in safe mode

A 700 can show the safe mode screen at every start because its application no longer verifies, as when one
1 KiB page of the application has been erased. Logitech's MyHarmony and Harmony Desktop do not repair it;
asking the remote to reinstall its staged copy does[^s295], [firmware.md](firmware.md).

## Not checked

* Whether the 700 wakes when picked up; the manual says it does[^x-manual].
* What the remote does while it charges beyond the screens: [display.md](display.md) and
  [hardware.md](hardware.md) carry when the charging screens show, and that charging is switched on is read
  in the firmware and not measured on the cells[^s384].
* The IR status indicator, the introduction tour and the Remote Assistant on a 700[^unchecked].
* Advanced help's screens on a 700[^unchecked].

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 700 user manual](https://support.myharmony.com/harmony-700-user-manual)
[^s74]: Read in the firmware. [Section 74](../../../docs/findings.md#s74)
[^s301]: Measured on a unit. [Section 301](../../../docs/findings.md#s301)
[^s386]: Measured on a unit. [Section 386](../../../docs/findings.md#s386)
[^s383]: Measured on a unit. [Section 383](../../../docs/findings.md#s383)
[^s300]: Measured on a unit. [Section 300](../../../docs/findings.md#s300)
[^s299]: Read in the firmware. [Section 299](../../../docs/findings.md#s299)
[^s296]: Measured on a unit. [Section 296](../../../docs/findings.md#s296)
[^s295]: Measured on a unit. [Section 295](../../../docs/findings.md#s295)
[^s297]: Measured on a unit. [Section 297](../../../docs/findings.md#s297)
[^s298]: Read in the firmware. [Section 298](../../../docs/findings.md#s298)
[^s386b]: Measured in configurations. [Section 386](../../../docs/findings.md#s386)
[^unchecked]: Not checked.
[^s384]: Read in the firmware. [Section 384](../../../docs/findings.md#s384)
