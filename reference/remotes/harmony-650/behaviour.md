# Harmony 650: behaviour

What the remote does in use, as a person holding it sees it. The operating concept, activities and
device mode, is `reference/how-a-harmony-works.md`, and this page does not restate it; it says how the 650
does it and what has been seen on the bench unit.

## Device mode, in and out

The 650 plays no click on a key or a screen key: its architecture has no tone instruction, section 74,
where a Harmony One clicks before every command on its touch screen, section 337.

| | how | standing and source |
|---|---|---|
| in | **the centre key below the display**, under the word "Devices" on an activity's screens. There is no Devices key | Logitech's manual pages 3 and 4: "switch to device mode by pressing the center button below Devices"; seen at the bench on composed devices, section 285 |
| choosing a device | the device list, four devices to a page, one beside each corner key, paged with the arrows | Logitech's manual page 4; read from configurations, section 285; seen at the bench, `LG` top right on the second page, section 285. A fifth device opens a second page, as Logitech compiles it, section 312; seen on the idle list and on two activities' own lists, `todo-compile-650.md` 2.3 |
| a device's page | the device's commands four to a page, `LG 1/2` style page counter, its keypad map in force | seen at the bench, section 285. The keypad map is the device's own, held in its screen record, section 271 |
| back in the activity | the activity's keys go where the activity binds them again: Channel up went to the KPN box after a visit to the Denon's pages, on a file holding no keypad map record for the activity | measured with the infrared receiver, one run, section 381. Whether the activity's map stays selected or is selected again is not told apart |
| out | the centre key again, which then writes "Activity" on an activity's own device list and "Activities" on the idle one | Logitech's manual page 4, "press the center button to return to Activities mode"; read from configurations and seen on the 650, sections 290 and 294 |

The words are this model family's and not the product's: the Harmony One says "Current Activity",
`reference/how-a-harmony-works.md`.

**An activity's own device list** puts that activity's devices first and the rest after them, read from
configurations and seen on the 650: LG kijken's list showed LG, Denon, PS3, KPN, then Kodi and the
television, with "Activity" at the bottom, section 294.

## Starting and switching activities

* An activity key starts its activity; More Activities lists them all on the screen, Logitech's manual.
  Pressing the running activity's key again is a distinct case, section 313: no start up screen and no
  power, only the activity's inputs set again. A device whose input sends its code on every setting
  sends it again; one that sends only on a change sends nothing. Seen with the infrared receiver on the
  Plasma (nothing) and on the LG, the Denon and an HDMI switch (their input codes again), sections 313
  and 339.
* A device kept on between activities, a per device setting, stays on when the next activity does not
  use it, and only All Off switches it off; read from configurations and heard with the infrared receiver,
  section 340.
* All Off sends nothing to a device the remote counts as off, so straight after a restart, with every
  device counted as off, it sends nothing at all; seen with the infrared receiver, section 332.
* A start up screen, "Starting" and the name, then the working screen with "Devices" below it; seen for
  a composed activity, all eight predictions held, section 291.
* All Off turns off the devices of the current activity, Logitech's manual. On the bench, the composed
  plasma's power went out from its activity, its device page and All Off, `todo-compile-650.md` and the
  infrared run `reads/20261004T063001Z-...` in the lab.
* Besides its ordinary commands a device holds single shot copies of some of them, power, digits and
  OK in a compile of two devices, and they start with no silence at all. On a Harmony One the same
  copies carry the device's delay between devices as silence in front, half a second or a second; on
  the 650 that wait is a delay step at the front of each send, sections 287, 335 and 337.
* Seen with the infrared receiver on the combined file: in Kijk TV volume and mute went to the Denon,
  channels, digits and OK to the KPN box, and the activity menu paged 1/3, 2/3, 3/3 and wrapped.
  Measured on air, `todo-compile-650.md`.

## After a write, a sync or an unplug

| what happens | standing and source |
|---|---|
| **The introduction tour**, ten screens from `Welcome to your Harmony 650 remote` to `You can now enjoy your entertainment system with one-touch activity control`, to be pressed through before use | seen at the bench after this project's writes, section 286. The manual says it appears "the first time you've updated your remote" |
| with the tour skipped in the configuration, no tour | seen at the bench, section 286 |
| off the cable, the Remote Assistant screen, `If any devices are still On press "Help" now`, also after an ordinary restart | seen at the bench, section 286 |
| a restart over USB: off the bus after about 2 seconds, back after about 8, running its application, and the project owner saw it restart | measured, section 282 |
| **every restart puts the clock back to the configuration's stamp**, a restart with nothing written included | measured in memory, section 283. Not visible, since the screen shows no clock, [display.md](display.md) |
| a restart undoes the running activity's state: an activity started off the cable was gone after a bare restart | seen and measured, section 283 |
| a changed power on delay is in force straight after the write and restart | measured in memory, section 283 |
| once, after a write, the screen stayed black off the cable until the batteries came out | seen once in two writes of the same shape, section 292; unexplained |
| **a configuration with no device and no activity starts**: "USB Connected" on the cable, then the empty Activities screen; Devices and Activities lead to each other, an activity key shows the "add an Activity" screen and Exit returns, All Off shows "Turning system off" and comes back, the screen goes dark and wakes | seen at the bench on a file of this project's, section 374 |
| the status screen library, moved to `0x030000` and written as the configuration, is **accepted** on its three markers, the verdict in memory reading good: off the cable "Go to Website to update settings", on it a plain blue screen once and "USB CONNECTED" without its picture once, and no key changing anything | measured in memory and seen at the bench, sections 353 and 354 |

## Power and held presses

* The Panasonic plasma on the bench needs four frames of its power code to switch on. The 650's
  activity sends seven and switches it on; the device page's ordinary Power On sends three and does not,
  measured with the infrared receiver and seen at the bench, section 306.
* After a one byte edit pointing that screen key at Logitech's held power record, it switched the
  television on, seen at the bench, section 309.
* The keypad's power key did nothing in that television's device mode, because Logitech's compile bound
  its power commands to screen keys only, section 306. See [keys.md](keys.md) on which key that is.
* The 650's seven frame power press puts its frames about 134.6 ms apart, measured with the infrared
  receiver, section 306.
* Logitech gives a power command its family's held block like any other command, so a held power key
  repeats; read from configurations, section 338, not timed on the remote.
* **A toggling code alternates**: the firmware keeps one bit per infrared group, flips it on every send to
  that group, and plays the record's first group, the code as stated, when the bit is set and the second,
  its toggle bit flipped, when clear. The bit is the device's and not the command's. Read in the 650's
  0.2 build, section 365; not checked on the remote.

## Not checked

* What the tilt sensor's flag does in the firmware. That the 650 wakes when tilted is seen at the bench,
  section 346 and [hardware.md](hardware.md); this list said "Whether the 650 wakes when picked
  up"<!--superseded--> until then.
* The infrared status indicator.
* Advanced help, held Help for five seconds, on this model.
* The two row device list, which no person can reach, section 326.
* What starts the tour after a reload, and what decides between showing and skipping it, section 286.
* Why the combined file's first start sent the plasma's power and not its input. The input does go out
  since the composer resets it after power on as Logitech's compile does: both starts sent power and then
  HDMI 1, `todo-compile-650.md` 2.5 and section 332. This list said "Whether a composed device's input
  commands go out"<!--superseded--> until then.
