# Harmony Touch: behaviour

What the remote does in use, from Logitech's manual, from its firmware and, for one set of documents, from an
infrared receiver. The operating concept, activities and device mode, is [how a Harmony works](../../how-a-harmony-works.md).
**Measured on a unit by the infrared codes it sends**: a sequence's delay step, [the platform's activities and
buttons](../../architectures/harmony-touch/activities-and-buttons.md#sequences)[^t-touch-changed-set]; and every
activity started, switched and stopped, the favourite channels, every key of every activity's map and of every
device's own map in device mode, tapped and held, [the same page](../../architectures/harmony-touch/activities-and-buttons.md#starting-switching-and-stopping)[^t-touch-in-use].
The rest of this page is the manual and the firmware. This said nothing had been, "there is no infrared recording
of it"<!--superseded-->, which stopped being true when the keys were first checked against an infrared receiver;
it then said the delay step was "the one figure of the Touch in use measured with an instrument"<!--superseded-->,
until the whole of one set of documents was. What it does on a USB cable is [usb.md](usb.md).

## Device mode, in and out

| | how | evidence |
|---|---|---|
| in | Home, then the "…" button at the bottom right of the screen for the device list, then a device | [^x-touch-manual], "Using Devices"; the firmware's menu agrees, [^t-touch-keys] |
| on a device | "the complete list of commands for that device", and "the physical buttons on the Harmony Touch will also control the selected device"; measured, every key of the device's own map, tapped and held, sent that map's command to that device | [^x-touch-manual], [^t-touch-in-use] |
| how long | **while that device's command screen is the one showing**: the screen makes its device the current one when it comes up and drops it when it goes, unless a screen of its own took over, and the keys then follow the running activity again | [^t-touch-keys] |
| out | Home, Favorites or the device list, each of which takes the device's screen away; the manual states no way out | [^t-touch-keys], [^x-touch-manual] |

## Activities and Off

An activity is started by tapping it under Home[^x-touch-manual]. **Off turns off every device of the current
activity at once** rather than one device[^x-touch-manual]. **Off ends the running activity as it goes down, and
held for 8 seconds the firmware reads as also restarting the remote**: the screens act on the press and the
kernel's timer runs beside them[^t-touch-keys]. **That reboot is not confirmed**: on a held Off the activity
ended but the remote did not restart by itself, so whether a held Off reboots or powers the remote off is
unsettled[^unchecked]. Picking the remote up from its dock turns it on[^x-touch-manual], since any change of
power source wakes the screen[^t-touch-keys].

**The keys are ignored** while a sync runs, while the remote has not been set up, while the screen saying the
radio link is lost is up and while an activity is starting[^t-touch-keys].

Changes made on the remote travel back to the account at the next sync, [features.md](features.md).

**With no activity running and no device chosen, the keys do nothing**; Home, Favorites and Off are the
exceptions, which the screens handle themselves[^t-touch-activities-firmware].

## Switching from one activity to another

Read in the firmware, and measured on a unit with an infrared receiver for one set of documents of five
activities: every switch and every Off sent its codes in this order[^t-touch-in-use]. This said "not yet
measured with an infrared receiver"<!--superseded--> until then. The full order and its delays are
[the platform's activities and buttons](../../architectures/harmony-touch/activities-and-buttons.md#starting-switching-and-stopping).

* **The old activity's own end steps go first**, before anything else, whether the next activity is another
  one or Off[^t-touch-activities-firmware].
* **The new activity's devices come on before the old ones go off**, and a device both activities use, or one
  kept on between activities, is not switched off at all[^t-touch-activities-firmware].
* **Then the inputs, then the new activity's own start steps, then its channel**[^t-touch-activities-firmware].
  While devices are still waiting out their power on delay, commands for other devices can go ahead, so the
  inputs do not always follow in list order[^t-touch-activities-firmware].
* **Off ends the activity**: its end steps, then every device still on is switched
  off[^t-touch-activities-firmware].

## Commands on the screen

* **A command deleted on the remote is hidden, not removed**: it stays in the button map marked deleted, the
  screens leave it out of the list, and the engine still holds it under its old place in the list. A command added on the remote and then
  deleted is removed outright[^t-touch-activities-firmware].
* **A screen command shows its label**, which can differ from the command it sends; three labels act by
  themselves, `123` for the number pad, `Gesturepad` and `Disconnect Wii`[^t-touch-activities-firmware].
* **A gesture bound to a command sends what device mode sends for the same function**: the gesture screen
  presses the matching button of the device's own map rather than its own entry; one bound to a sequence
  or to a client action, the number pad among them, does not go through device mode[^t-touch-activities-firmware].
* **A sequence runs to its end** once started, however briefly the key is pressed[^t-touch-activities-firmware].
* **Two screen commands can share one place in a list in Logitech's own button maps, and then the first of
  them is not on the screen**[^t-touch-activities].

How long a key must be held for its long press is [keys.md](keys.md#holding-a-key).

## A factory reset

**A Touch can reset itself**: Settings offers a factory reset, a data error screen offers one, and holding
Off and Menu while the remote starts selects one, by the firmware's reading and never tried. A factory reset
deletes every device, activity and setting the remote holds and its link to the account, and keeps the
firmware, so the remote refuses a sync until it is set up again; that Logitech's client does that, by its
own flow, is inferred, [firmware.md](firmware.md#reset-and-restart)[^t-touch-recovery]. The Settings
screen's own text says the reset keeps the account, which disagrees with the firmware's reading and is not
settled[^unchecked]. Logitech's clients bring a Touch back either
with a whole firmware image or with a firmware update followed by the remote's own reset,
[the platform's firmware](../../architectures/harmony-touch/firmware.md#logitechs-recovery-routes). The
remote's own reset and restart files act on a write, not when opened, [firmware.md](firmware.md)[^t-touch-api-names].

> This said Logitech returns a Touch to its factory state "with a whole firmware image fetched over the
> network, not with a command"<!--superseded-->, which is one of their two clients; the other writes the
> remote's own reset file, [the platform's firmware](../../architectures/harmony-touch/firmware.md#logitechs-recovery-routes).

## Not checked

* The way back from device mode and the keys being ignored, tried on a remote rather than read[^unchecked].
* *Corrected:* this listed "the switch order and the long press measured on a remote rather than read in its
  firmware"<!--superseded--> and "anything in use with the infrared receiver"<!--superseded-->. Both are measured
  now for one set of documents, above; when a long press fires after the press is still not, since the receiver
  hears codes and not presses[^unchecked].
* Changes made on the remote when the client syncs the account down without asking for them first, seen on a
  remote[^unchecked]. Read in the firmware, the sync request empties the queue that would carry them up, so they
  never reach the account, [setup](../../architectures/harmony-touch/api/setup.md#setupsync)[^t-touch-api-setup].

[^unchecked]: Not checked.
[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
[^t-touch-activities]: Measured on a unit. [The test](../../../packages/usb/test/touch/touch-activities.test.ts)
[^t-touch-activities-firmware]: Read in the firmware. [The test](../../../tests/harmony_touch/test_harmony_touch_activities.py)
[^t-touch-keys]: Read in the firmware. [The test](../../../tests/harmony_touch/test_harmony_touch_keys.py)
[^t-touch-api-names]: Read in the firmware. [The test](../../../tests/harmony_touch/test_harmony_touch_api_names.py)
[^t-touch-recovery]: Read in the firmware. [The test](../../../tests/harmony_touch/test_harmony_touch_recovery.py)
[^t-touch-api-setup]: Read in the firmware. [The test](../../../tests/harmony_touch/test_harmony_touch_api_setup.py)
[^t-touch-changed-set]: Measured on a unit. [The test](../../../packages/usb/test/touch/touch-changed-set-sync.test.ts)
[^t-touch-in-use]: Measured on a unit. [The test](../../../packages/bench/test/harmony-touch/touch-full-bench-runs.test.ts)
