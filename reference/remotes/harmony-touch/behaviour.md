# Harmony Touch: behaviour

What the remote does in use, from Logitech's manual. The operating concept, activities and device mode, is
[how a Harmony works](../../how-a-harmony-works.md). Nothing about the Touch in use has been measured: there
is no infrared recording of it[^unchecked]. What it does on a USB cable is [usb.md](usb.md).

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

## A factory reset

Logitech returns a Touch to its factory state with a whole firmware image fetched over the network, not with
a command, [the platform's firmware](../../architectures/harmony-touch/firmware.md). The remote's own
reset and restart are paths that act when opened, [firmware.md](firmware.md).

## Not checked

* The way back from device mode[^unchecked].
* Anything in use with the infrared receiver[^unchecked].
* What the remote requests during a sync, which would give its configuration in Logitech's own
  terms[^s203].

[^unchecked]: Not checked.
[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
[^s203]: Stated by Logitech, in their client. [Section 203](../../../docs/findings.md#s203)
