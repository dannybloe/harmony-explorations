# Harmony 650: behaviour

What the remote does in use, as a person holding it sees it. The operating concept, activities and
device mode, is `docs/how-a-harmony-works.md`, and this page does not restate it; it says how the 650
does it and what has been seen on the bench unit.

## Device mode, in and out

The 650 plays no click on a key or a screen key: its architecture has no tone instruction, section 74,
where a Harmony One clicks before every command on its touch screen, section 337.

| | how | standing and source |
|---|---|---|
| in | **the centre key below the display**, under the word "Devices" on an activity's screens. There is no Devices key | Logitech's manual pages 3 and 4: "switch to device mode by pressing the center button below Devices"; seen at the bench on composed devices, section 285 |
| choosing a device | the device list, four devices to a page, one beside each corner key, paged with the arrows | Logitech's manual page 4; read from configurations, section 285; seen at the bench, `LG` top right on the second page, section 285 |
| a device's page | the device's commands four to a page, `LG 1/2` style page counter, its keypad map in force | seen at the bench, section 285 |
| out | the centre key again, which then writes "Activity" on an activity's own device list and "Activities" on the idle one | Logitech's manual page 4, "press the center button to return to Activities mode"; read from configurations and seen on the 650, sections 290 and 294 |

The words are this model family's and not the product's: the Harmony One says "Current Activity",
`docs/how-a-harmony-works.md`.

**An activity's own device list** puts that activity's devices first and the rest after them, read from
configurations and seen on the 650: LG kijken's list showed LG, Denon, PS3, KPN, then Kodi and the
television, with "Activity" at the bottom, section 294.

## Starting and switching activities

* An activity key starts its activity; More Activities lists them all on the screen, Logitech's manual.
  Pressing the running activity's key again is a distinct case, section 313.
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
| a restart over USB: off the bus after about 2 seconds, back after about 8, running its application, and Danny saw it restart | measured, section 282 |
| **every restart puts the clock back to the configuration's stamp**, a restart with nothing written included | measured in memory, section 283. Not visible, since the screen shows no clock, [display.md](display.md) |
| a restart undoes the running activity's state: an activity started off the cable was gone after a bare restart | seen and measured, section 283 |
| a changed power on delay is in force straight after the write and restart | measured in memory, section 283 |
| once, after a write, the screen stayed black off the cable until the batteries came out | seen once in two writes of the same shape, section 292; unexplained |

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

## Not checked

* Whether the 650 wakes when picked up, as the 600 and 700 manuals say those do.
* The infrared status indicator.
* Advanced help, held Help for five seconds, on this model.
* The two row device list, which no person can reach, section 326.
* What starts the tour after a reload, and what decides between showing and skipping it, section 286.
* Whether a composed device's input commands go out: on the combined file the plasma's input was not
  sent, `todo-compile-650.md` 2.5.
