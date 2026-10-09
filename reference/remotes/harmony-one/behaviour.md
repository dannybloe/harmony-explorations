# Harmony One: behaviour

What the remote does in use, as a person holding it sees it. The operating concept, activities and
device mode, is `docs/how-a-harmony-works.md`, and this page does not restate it; it says how the One does
it and what has been seen and measured on this model.

## Device mode, in and out

| | how | standing and source |
|---|---|---|
| in | **"Devices"**, the touch key below the screen on the right, which the activity menu labels | Logitech's manual, "When you press the Devices button, the Harmony One's screen displays a list of your devices"; `docs/how-a-harmony-works.md`; section 275 |
| on a device | "the Harmony One controls only that device", every key and the screen | Logitech's manual, "Controlling your devices individually"; the device's own screen record, section 271 |
| out | the key below the screen on the left, which the device list labels "Activities"; the right one is **not enabled** there, the configuration giving it no touch rectangle on 29 of 29 device list pages | read from configurations and an account from the bench, section 275 and `docs/how-a-harmony-works.md` |

`docs/how-a-harmony-works.md` also names the way back "Current Activity", as the One's own wording rather
than the product's. The device list measured in section 275 writes "Activities". Where on the remote each
word appears is **not checked** here.

## Screen commands click and wait, and a held touch repeats

**Section 337**, from a bench observation that a command touched on the screen seems to go out a moment
later than the same command on a key:

* **Most screen commands wait before the code starts.** A screen command usually sends a one block copy
  of the code that opens with **the device's delay between devices**, half a second or a second, where a
  key sends the ordinary record, which opens with about 50 ms. On one configuration 148 of 241 screen
  commands do this and 23 of 377 key commands. Read from configurations, section 337. Whether Logitech
  meant it for aiming is not something a file can say.
* **Every screen command plays a click first**, the button sound, 582 Hz for about 26 ms, and no key
  command does: 241 of 241 screen sends and none of 377 key sends on that configuration, and the same on
  three more of Logitech's compiles. Read in the firmware and configurations, section 337. It is
  Logitech's convention and not a requirement: screen sends this project wrote without it still went out,
  section 242. With the button sound off the click is skipped.
* **Holding a command on the screen repeats it, as holding a key does**: the touch code sets the same
  hold flag, read in the firmware, section 337, which corrects section 127.
* **Unconfirmed** in section 337: that a touch is posted while the finger is down, how long it settles,
  and that sliding onto another item gives a release and a new press. Whether a long press on the screen
  would take as long as on a key is not established, `docs/how-a-harmony-works.md`.

None of this applies to the Harmony 600, 650 and 700: no touch panel, no click, and their wait between
devices is a separate step, section 337.

## Activities and sends

* Every send is paired with a `0x7C` naming the same device. A bare send goes out from a key press and
  sends **nothing** from an activity's transition, measured on a unit, section 278.
* An activity's power on delay holds back only that device's next command, measured on a unit, section 236.
* **An oversized sequence can hang the remote for good**, three times out of three, the batteries coming
  out each time, seen at the bench, section 238; [features.md](features.md).

## On the cable

| what happens | standing and source |
|---|---|
| **the application keeps running in USB mode**: the clock ticks and Timer 1 runs; the keypad handler and the light sampler stop. The configuration runs in place, so it is in use on the cable, the opposite of the Harmony 600 | measured on a unit, section 111 |
| USB mode is left on the cable's removal when the command state is 0 | read in the firmware, section 99 |
| twice, after a session holding a deliberate odd count hang, the remote stayed in USB mode off the cable until the batteries came out; clean sessions left it normally | measured on a unit, sections 95 and 99 |
| an odd count internal read hangs the remote, and it restarts by itself in about 3 seconds with its configuration intact | measured on a unit, sections 94 and 96 |
| after idling in USB mode the remote drops its first command, and a retry clears it | measured on a unit, section 155 |
| a Harmony One occasionally strands after sitting idle on USB, which a battery pull clears and nothing here explains | `CLAUDE.md` |

## After a write

| what happens | standing and source |
|---|---|
| **after the full write sequence the remote restarts itself**, off the bus and back in about 13 seconds, on its ordinary screen, not asking for a sync. The restart is the write's, because the One runs its configuration out of the flash an erase clears | measured on a unit, sections 247 and 251 |
| a write without the cache drop leaves the remote keeping a verdict earned against other bytes; with a failed validation the status screen **latches until a power cycle**, a latch this model has and the 600, 650, 700 and 525 do not | read in the firmware and measured, sections 248, 250, 252 and 253 |
| the re-check of the configuration runs on the cable's removal and not while it is in | measured on a unit, section 251 |
| after an incomplete write the screen said "USB CONNECTED" on the cable and "Go to Website to update settings" off it | seen at the bench, sections 242 and 244 |
| safe mode does not stick: a plain power cycle boots normally | seen at the bench, section 190 |

## The clock

The clock is state variables 0 to 6, at data memory `0x108` to `0x10E`, seeded from the configuration's
clock records, read in the firmware, section 138; a power cycled unit read its configuration's stamp plus
its uptime, measured, section 111, and once seeded it ticks at real rate on the cable, section 251. **Two
statements disagree about when it is reseeded**: `CLAUDE.md` says at every boot, and section 138 reads a
cold boot reseeding it and a warm start keeping the running clock, behind a checksum. Whether the restart
after a write is warm or cold is **not checked**. The day of the month counts from 0 and the weekday from
Sunday, section 322.

## Not checked

* Where "Current Activity" and "Activities" each appear.
* The touch timing of section 337.
* Why an oversized sequence hangs the remote, and why it strands after idling on USB.
* Whether the restart after a write reseeds the clock.
