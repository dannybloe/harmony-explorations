# Harmony 650: behaviour

What the remote does in use, as a person holding it sees it. The operating concept, activities and
device mode, is [how a Harmony works](../../how-a-harmony-works.md), and this page does not restate it;
it says how the 650 does it.

## Device mode, in and out

The 650 plays no click on a key or a screen key: its architecture has no tone instruction[^s74], where a
Harmony One clicks before every command on its touch screen[^s337].

| | how | evidence |
|---|---|---|
| in | **the centre key below the display**, under the word "Devices" on an activity's screens: "switch to device mode by pressing the center button below Devices". There is no Devices key | [^x-manual]; seen on a 650 [^s285] |
| choosing a device | the device list, four devices to a page, one beside each corner key, paged with the arrows. A fifth device opens a second page, as Logitech compiles it | [^x-manual], [^s285b]; the second page [^s312] |
| a device's page | the device's commands four to a page, with a page counter in the style `LG 1/2`, and the device's own keypad map in force, held in its screen record | seen [^s285]; the map [^s271] |
| back in the activity | the activity's keys go where the activity binds them again: Channel up went to the set top box after a visit to the receiver's pages, on a file holding no keypad map record for the activity. Whether the activity's map stays selected or is selected again is not told apart | [^s381] |
| out | the centre key again, which then reads "Activity" on an activity's own device list and "Activities" on the idle one: "press the center button to return to Activities mode" | [^x-manual]; [^s290], [^s294]; seen [^s294b] |

The words are this model family's and not the product's: the Harmony One says "Current Activity",
[how a Harmony works](../../how-a-harmony-works.md).

**An activity's own device list** puts that activity's devices first and the rest after them; on a 650,
the list of an activity watching the LG television showed LG, Denon, PS3, KPN, then Kodi and a second
television, with "Activity" at the bottom[^s294][^s294b].

## Starting and switching activities

* An activity key starts its activity; More Activities lists them all on the screen[^x-manual].
* **Pressing the running activity's key again** is a distinct case: no start up screen and no power,
  only the activity's inputs set again. A device whose input sends its code on every setting sends it
  again; one that sends only on a change sends nothing. Heard with an infrared receiver on a plasma
  television (nothing) and on an LG television, a Denon receiver and an HDMI switch (their input codes
  again)[^s313][^s339].
* **A device kept on between activities**, a per device setting, stays on when the next activity does not
  use it, and only All Off switches it off[^s340][^s340b].
* **All Off sends nothing to a device the remote counts as off**, so straight after a restart, with every
  device counted as off, it sends nothing at all[^s332].
* **A start up screen**, "Starting" and the name, then the working screen with "Devices" below
  it[^s291].
* **All Off** turns off the devices of the current activity[^x-manual].
* Besides its ordinary commands a device holds single shot copies of some of them, power, digits and OK
  in a compile of two devices, and they start with no silence at all. On a Harmony One the same copies
  carry the device's delay between devices as silence in front, half a second or a second; on the 650
  that wait is a delay step at the front of each send[^s287][^s335][^s337].
* In an activity built on a set top box and a receiver, volume and mute went to the receiver and
  channels, digits and OK to the set top box, as the activity's key map binds them[^s381].

## After a write, a sync or an unplug

| what happens | evidence |
|---|---|
| **The introduction tour**, ten screens from `Welcome to your Harmony 650 remote` to `You can now enjoy your entertainment system with one-touch activity control`, to be pressed through before use; the manual says it appears "the first time you've updated your remote" | [^s286]; [^x-manual] |
| with the tour skipped in the configuration, no tour | [^s286] |
| off the cable, the Remote Assistant screen, `If any devices are still On press "Help" now`, also after an ordinary restart | [^s286] |
| a restart over USB: off the bus after about 2 seconds, back after about 8, running its application | [^s282] |
| **every restart puts the clock back to the configuration's stamp**, a restart with nothing written included. Not visible, since the screen shows no clock, [display.md](display.md) | [^s283] |
| a restart undoes the running activity's state: an activity started off the cable was gone after a bare restart | [^s283] |
| a changed power on delay is in force straight after the write and restart | [^s283] |
| once, after a write, the screen stayed black off the cable until the batteries came out; seen once in two writes of the same shape and unexplained | [^s292] |
| **a configuration with no device and no activity starts**: "USB Connected" on the cable, then the empty Activities screen; Devices and Activities lead to each other, an activity key shows the "add an Activity" screen and Exit returns, All Off shows "Turning system off" and comes back, the screen goes dark and wakes | [^s374] |
| the status screen library, moved to `0x030000` and written as the configuration, is **accepted** on its three markers, the verdict in memory reading good: off the cable "Go to Website to update settings", on it a plain blue screen once and "USB CONNECTED" without its picture once, and no key changing anything | [^s353], [^s354] |

## Power and held presses

* A Panasonic plasma television that needs four frames of its power code to switch on: the 650's
  activity sends seven and switches it on; the device page's ordinary Power On sends three and does
  not[^s306].
* After a one byte edit pointing that screen key at Logitech's held power record, it switched the
  television on[^s309].
* The keypad's power key did nothing in that television's device mode, because Logitech's compile bound
  its power commands to screen keys only[^s306]. See [keys.md](keys.md) on which key that is.
* The 650's seven frame power press puts its frames about 134.6 ms apart[^s306].
* Logitech gives a power command its family's held block like any other command, so a held power key
  repeats; read from configurations and not timed on the remote[^s338].
* **A toggling code alternates**: the firmware keeps one bit per infrared group, flips it on every send to
  that group, and plays the record's first group, the code as stated, when the bit is set and the second,
  its toggle bit flipped, when clear. The bit is the device's and not the command's. Read in the 650's
  0.2 build[^s365] and not checked on the remote[^unchecked].

## Not checked

* What the tilt sensor's flag does in the firmware. That the 650 wakes when tilted is seen, [hardware.md](hardware.md)[^s346].
* Advanced help, held Help for five seconds, on this model[^unchecked].
* The two row device list, which no person can reach[^s326].
* What starts the tour after a reload, and what decides between showing and skipping it[^s286].
* Why a plasma television composed into an activity got its power and not its input on the first start.
  The input does go out since the composer resets it after power on as Logitech's compile does: both
  later starts sent power and then HDMI 1[^s332]. This list said "Whether a composed device's input
  commands go out"<!--superseded--> until then.

[^s74]: Read in the firmware. [Section 74](../../../docs/findings.md#s74)
[^s337]: Measured on a unit. [Section 337](../../../docs/findings.md#s337)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 650 user manual](https://www.logitech.com/assets/44635/3/harmony650-user-guide.pdf)
[^s285]: Measured on a unit. [Section 285](../../../docs/findings.md#s285)
[^s285b]: Measured in configurations. [Section 285](../../../docs/findings.md#s285)
[^s312]: Measured in configurations. [Section 312](../../../docs/findings.md#s312)
[^s271]: Measured in configurations. [Section 271](../../../docs/findings.md#s271)
[^s381]: Measured on a unit. [Section 381](../../../docs/findings.md#s381)
[^s290]: Measured in configurations. [Section 290](../../../docs/findings.md#s290)
[^s294]: Measured in configurations. [Section 294](../../../docs/findings.md#s294)
[^s294b]: Measured on a unit. [Section 294](../../../docs/findings.md#s294)
[^s313]: Measured on a unit. [Section 313](../../../docs/findings.md#s313)
[^s339]: Measured on a unit. [Section 339](../../../docs/findings.md#s339)
[^s340]: Measured in configurations. [Section 340](../../../docs/findings.md#s340)
[^s340b]: Measured on a unit. [Section 340](../../../docs/findings.md#s340)
[^s332]: Measured on a unit. [Section 332](../../../docs/findings.md#s332)
[^s291]: Measured on a unit. [Section 291](../../../docs/findings.md#s291)
[^s287]: Measured in configurations. [Section 287](../../../docs/findings.md#s287)
[^s335]: Measured on a unit. [Section 335](../../../docs/findings.md#s335)
[^s286]: Measured on a unit. [Section 286](../../../docs/findings.md#s286)
[^s282]: Measured on a unit. [Section 282](../../../docs/findings.md#s282)
[^s283]: Measured on a unit. [Section 283](../../../docs/findings.md#s283)
[^s292]: Measured on a unit. [Section 292](../../../docs/findings.md#s292)
[^s374]: Measured on a unit. [Section 374](../../../docs/findings.md#s374)
[^s353]: Measured on a unit. [Section 353](../../../docs/findings.md#s353)
[^s354]: Measured on a unit. [Section 354](../../../docs/findings.md#s354)
[^s306]: Measured on a unit. [Section 306](../../../docs/findings.md#s306)
[^s309]: Measured on a unit. [Section 309](../../../docs/findings.md#s309)
[^s338]: Measured in configurations. [Section 338](../../../docs/findings.md#s338)
[^s365]: Read in the firmware. [Section 365](../../../docs/findings.md#s365)
[^unchecked]: Not checked.
[^s346]: Measured on a unit. [Section 346](../../../docs/findings.md#s346)
[^s326]: Read in the firmware. [Section 326](../../../docs/findings.md#s326)
