# Harmony One: behaviour

What the remote does in use, as a person holding it sees it. The operating concept, activities and
device mode, is [how a Harmony works](../../how-a-harmony-works.md), and this page does not restate it;
it says how the One does it: how device mode is entered and left, the click and the wait before a command
touched on the screen, what happens on the USB cable and after a configuration is written, and where its
clock comes from.

## Device mode, in and out

| | how |
|---|---|
| in | **"Devices"**, the touch key below the screen on the right, which the activity menu labels; Logitech's manual calls it the Device button, "When you press the Device button, the Harmony One's screen displays a list of your devices"[^x-one-manual][^s275] |
| on a device | "the Harmony One controls only that device"[^x-one-manual], every key and the screen, through the device's own screen record[^s271] |
| out | the key below the screen on the left, which the device list labels "Activities"; the right one is **not enabled** there, the configuration giving it no touch rectangle on 29 of 29 device list pages[^s275] |

**Which word the way back carries depends on the screen**: the device list writes "Activities"[^s275]; a
device page and Options write "Activities", or "Current Activity" while an activity runs[^s401][^s411]. That
is read from configurations and not watched on a remote.

## Screen commands click and wait, and a held touch repeats

A command touched on the screen seems to go out a moment later than the same command on a key, and that is
in the configuration rather than in the touch[^s337]:

* **Most screen commands wait before the code starts.** A screen command usually sends a one block copy
  of the code that opens with **the device's delay between devices**, half a second or a second, where a
  key sends the ordinary record, which opens with about 50 ms. On one configuration 148 of 241 screen
  commands do this and 23 of 377 key commands[^s337]. Whether Logitech meant it for aiming is not something
  a file can say.
* **Every screen command plays a click first**, the button sound, 582 Hz for about 26 ms, and no key
  command does: 241 of 241 screen sends and none of 377 key sends on that configuration, and the same on
  three more of Logitech's compiles[^s337b][^s337]. Every row of Logitech's device pages opens with the click,
  3545 of 3545 over nineteen compiles[^s404]. With the button sound off the click is skipped.
* **The click is Logitech's convention and not a requirement**: screen sends written without it still go
  out[^s242], but a touched row then makes no sound at all, which reads as a touch that did not
  register[^s404b].
* **Holding a command on the screen repeats it, as holding a key does**: the touch code sets the same hold
  flag[^s337b], which corrects an earlier reading[^s127].
* **Unconfirmed**: that a touch is posted while the finger is down, how long it settles, and that sliding
  onto another item gives a release and a new press[^s337b]. Whether a long press on the screen would take as
  long as on a key is not established, [how a Harmony works](../../how-a-harmony-works.md).

None of this applies to the Harmony 600, 650 and 700: no touch panel, no click, and their wait between
devices is a separate step[^s337b].

## Activities and sends

* Every send is paired with a `0x7C` naming the same device. A bare send goes out from a key press and
  sends **nothing** from an activity's transition[^s278].
* An activity's power on delay holds back only that device's next command[^s236].
* **An oversized sequence can hang the remote for good**, three times out of three, the battery coming out
  each time[^s238]; [features.md](features.md#sequences).
* What Logitech's compiler wires into every configuration, the lists, timers and value maps that connect
  the firmware's events to the screens, is [the platform's compiler page](../../architectures/harmony-one/compiler.md).

## On the cable

| what happens |
|---|
| **the remote keeps running in USB mode**: the clock ticks and Timer 1 runs; the keypad handler and the light sampler stop. The configuration runs in place, so it is in use on the cable, the opposite of the Harmony 600[^s111] |
| the screen says "USB Connected"[^s155] |
| USB mode is left on the cable's removal when the command state is 0[^s99] |
| twice, after a session holding a deliberate odd count hang, the remote stayed in USB mode off the cable until the battery came out; clean sessions left it normally[^s95][^s99b] |
| an odd count read of internal memory hangs the remote, and it restarts by itself in about 3 seconds with its configuration intact[^s94][^s96] |
| **after sitting idle in USB mode the remote drops its first command, and a retry clears it**; see below[^s155] |

### The first command after idling

A Harmony One left in USB mode, unaddressed, can meet the first command it is sent with silence: no reply
to a version request, or a flash read that returns nothing. A retry answers in full, and the failure is
silence and never a wrong answer[^s155].

**What causes it is idleness, and nothing else the cases share.** The remote's own clock, read after the
retry that worked, was continuous with the boot before, so no restart happened between the failed command
and the good one; nothing had been unplugged; and the remote had sent no command before, so a busy session
is not the trigger. What is left is a long stretch in USB mode with nothing addressed to it[^s155]. Why idleness does it is not read[^unchecked].

## After a write

| what happens |
|---|
| **after the full write sequence the remote restarts itself**, off the bus and back in about 13 seconds, on its ordinary screen, not asking for a sync. The restart is the write's, because the One runs its configuration out of the flash an erase clears[^s247][^s251] |
| **after a write's restart it shows the Remote Assistant, and after it a "Welcome!" screen**, while a state variable of the configuration stands at its starting value 0, which Logitech's compiles give it; started at 3 it goes straight to its ordinary screen[^s403][^s403b] |
| a write without the cache drop leaves the remote keeping a verdict earned against other bytes; with a failed validation the status screen **latches until a power cycle**, a latch this model has and the 600, 650, 700 and 525 do not[^s250][^s252][^s253][^s248] |
| the re-check of the configuration runs on the cable's removal and not while it is in[^s251] |
| after an incomplete write the screen said "USB CONNECTED" on the cable and "Go to Website to update settings" off it[^s242][^s244] |
| safe mode does not stick: a plain power cycle boots normally[^s190] |

The write sequence itself is [the command reference](../../usb-protocol/commands.md) and
[the platform's USB page](../../architectures/harmony-one/usb.md).

## The clock

The clock is the first seven state variables, seeded from the configuration's clock records[^s138]; where
they sit in memory is [the platform's memory page](../../architectures/harmony-one/memory.md#data-memory).
A remote whose battery was taken out read its configuration's stamp plus its uptime[^s111], and once seeded
the clock ticks at real rate on the cable[^s251]. It is reseeded on a cold boot, and a warm start keeps the
running clock, behind a checksum[^s138][^s274]. Whether the restart after a write is warm or cold is not
checked[^unchecked]. The day of the month counts from 0 and the weekday from Sunday[^s322]. What the screen
shows of it is [display.md](display.md#the-clock-and-the-strip-along-the-top).

## Not checked

* The touch timing above[^s337b].
* Why an oversized sequence hangs the remote[^unchecked].
* Why idling in USB mode drops the first command[^unchecked].
* Whether the restart after a write reseeds the clock[^unchecked].

[^x-one-manual]: Stated by Logitech, in the manual. [The Harmony One user guide](https://secure.logitech.com/assets/44645/13/harmonyone-user-guide.pdf)
[^s275]: Measured in configurations. [Section 275](../../../docs/findings.md#s275)
[^s271]: Measured in configurations. [Section 271](../../../docs/findings.md#s271)
[^s401]: Measured in configurations. [Section 401](../../../docs/findings.md#s401)
[^s411]: Measured in configurations. [Section 411](../../../docs/findings.md#s411)
[^s337]: Measured in configurations. [Section 337](../../../docs/findings.md#s337)
[^s337b]: Read in the firmware. [Section 337](../../../docs/findings.md#s337)
[^s404]: Measured in configurations. [Section 404](../../../docs/findings.md#s404)
[^s242]: Measured on a unit. [Section 242](../../../docs/findings.md#s242)
[^s404b]: Measured on a unit. [Section 404](../../../docs/findings.md#s404)
[^s127]: Read in the firmware. [Section 127](../../../docs/findings.md#s127)
[^s278]: Measured on a unit. [Section 278](../../../docs/findings.md#s278)
[^s236]: Measured on a unit. [Section 236](../../../docs/findings.md#s236)
[^s238]: Measured on a unit. [Section 238](../../../docs/findings.md#s238)
[^s111]: Measured on a unit. [Section 111](../../../docs/findings.md#s111)
[^s155]: Measured on a unit. [Section 155](../../../docs/findings.md#s155)
[^s99]: Read in the firmware. [Section 99](../../../docs/findings.md#s99)
[^s95]: Measured on a unit. [Section 95](../../../docs/findings.md#s95)
[^s99b]: Measured on a unit. [Section 99](../../../docs/findings.md#s99)
[^s94]: Measured on a unit. [Section 94](../../../docs/findings.md#s94)
[^s96]: Measured on a unit. [Section 96](../../../docs/findings.md#s96)
[^unchecked]: Not checked.
[^s247]: Measured on a unit. [Section 247](../../../docs/findings.md#s247)
[^s251]: Measured on a unit. [Section 251](../../../docs/findings.md#s251)
[^s403]: Measured in configurations. [Section 403](../../../docs/findings.md#s403)
[^s403b]: Measured on a unit. [Section 403](../../../docs/findings.md#s403)
[^s250]: Read in the firmware. [Section 250](../../../docs/findings.md#s250)
[^s252]: Read in the firmware. [Section 252](../../../docs/findings.md#s252)
[^s253]: Read in the firmware. [Section 253](../../../docs/findings.md#s253)
[^s248]: Measured on a unit. [Section 248](../../../docs/findings.md#s248)
[^s244]: Measured on a unit. [Section 244](../../../docs/findings.md#s244)
[^s190]: Measured on a unit. [Section 190](../../../docs/findings.md#s190)
[^s138]: Read in the firmware. [Section 138](../../../docs/findings.md#s138)
[^s274]: Read in the firmware. [Section 274](../../../docs/findings.md#s274)
[^s322]: Read in the firmware. [Section 322](../../../docs/findings.md#s322)
