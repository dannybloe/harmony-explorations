# Harmony Touch: behaviour

What the remote does in use, from Logitech's manual and from its firmware. The operating concept, activities
and device mode, is [how a Harmony works](../../how-a-harmony-works.md). Nothing about the Touch in use has
been measured with an instrument: there is no infrared recording of it[^unchecked]. What it does on a USB cable is [usb.md](usb.md).

## Device mode, in and out

| | how | evidence |
|---|---|---|
| in | Home, then the "…" button at the bottom right of the screen for the device list, then a device | [^x-touch-manual], "Using Devices" |
| on a device | "the complete list of commands for that device", and "the physical buttons on the Harmony Touch will also control the selected device" | [^x-touch-manual] |
| out | **not stated** by the manual | [^unchecked] |

## Activities and Off

An activity is started by tapping it under Home[^x-touch-manual]. **Off turns off every device of the current
activity at once** rather than one device[^x-touch-manual]. Picking the remote up from its dock turns it
on[^x-touch-manual].

Changes made on the remote travel back to the account at the next sync, [features.md](features.md).

**With no activity running and no device chosen, the keys do nothing**; Home, Favorites and Off are the
exceptions, which the screens handle themselves[^t-touch-activities-firmware].

## Switching from one activity to another

Read in the firmware, not yet measured with an infrared receiver; the full order is
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
* **A gesture sends what device mode sends for the same function**: the gesture screen presses the matching
  button of the device's own map rather than its own entry[^t-touch-activities-firmware].
* **A sequence runs to its end** once started, however briefly the key is pressed[^t-touch-activities-firmware].
* **Two screen commands can share one place in a list in Logitech's own button maps, and then the first of
  them is not on the screen**[^t-touch-activities].

How long a key must be held for its long press is [keys.md](keys.md#holding-a-key).

## A factory reset

Logitech returns a Touch to its factory state with a whole firmware image fetched over the network, not with
a command, [the platform's firmware](../../architectures/harmony-touch/firmware.md). The remote's own
reset and restart are paths that act when opened, [firmware.md](firmware.md).

## Not checked

* The way back from device mode[^unchecked].
* The switch order and the long press measured on a remote rather than read in its firmware[^unchecked].
* Anything in use with the infrared receiver[^unchecked].
* What becomes of changes made on the remote when the client syncs the account down without asking for them
  first, [usb.md](../../architectures/harmony-touch/usb.md#provisioning-instead-of-a-compile)[^unchecked].

[^unchecked]: Not checked.
[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
[^t-touch-activities]: Measured on a unit. [The test](../../../packages/usb/test/touch-activities.test.ts)
[^t-touch-activities-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_activities.py)
