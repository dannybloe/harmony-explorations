# Harmony 350: behaviour

What the remote does in use. It is told here from Logitech's setup guide and from what its configurations
hold, and one thing was measured on a unit: the wait after a device is switched on.

## Device mode, without a screen

**A device key is device mode.** Press one of the four device keys, briefly for one device or for two
seconds for another, and the remote controls that device; the power key then switches the selected device
on or off[^x-manual]. There is no list to choose from, and the guide says nothing about leaving it other
than pressing Watch TV or another device key. What device mode is on every Harmony is in
[how a Harmony works](../../how-a-harmony-works.md#the-two-things-a-harmony-can-be-doing).

## Watch TV

* Pressing **Watch TV** starts the one activity, switching on the devices it uses; keep the remote pointed
  at the devices until the device keys stop lighting. Pressing it again switches them all off[^x-manual].
* "Use Harmony 350 as your only remote; using other remotes could cause the devices in Watch TV Activity
  to become out of sync"[^x-manual].

## What the configurations say

* How a send is spelled, every send paired with a `0x7C` naming the same device, is the family's,
  [the family's memory.md](../../architectures/harmony-300-350/memory.md#the-configuration-container).
* After the power key switches a device on, the remote waits a time stated per device before that
  device's next command, and the activity keeps its own copy of each wait; both are the family's,
  [the family's memory.md](../../architectures/harmony-300-350/memory.md#a-devices-power-on-delay).
* A short press of a device key acts when the key comes up: the configurations select the device on the
  key's release, and its press only switches one of four outputs and starts two timers, which a Harmony
  300's device key does not. Each key's short press device takes the infrared group of the key's place,
  [the family's memory.md](../../architectures/harmony-300-350/memory.md#which-infrared-group-a-device-takes)[^t-device-groups-c].
  What a two second press does in the configuration is not checked, since none measured has one[^unchecked].
* One configuration compiled for a 350 sends each code three times a press: 106 of its 130 records state
  a count, and every one of them states 3[^s259].

## Measured in use

* **The wait after the power key switches a device on is in tenths of a second.** A wait of 30 held that
  device's next command 3.17 seconds and a wait of 100 held it 10.21 seconds; a command pressed long after
  went at once[^t-delay-heard]. Where the wait is stated is the family's,
  [the family's memory.md](../../architectures/harmony-300-350/memory.md#a-devices-power-on-delay).

## Not checked

* Anything else about the 350 in use. This said anything at all, until the power on delay was measured
  with an infrared receiver.
* What a long press on a device key does when that key holds only one device.

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 350 setup guide](https://www.logitech.com/assets/51207/harmony-350-qsg-and-iid.pdf)
[^s259]: Measured in configurations. [Section 259](../../../docs/findings.md#s259)
[^t-delay-heard]: Measured on a unit. [The test](../../../tests/test_harmony_350_delay.py)
[^t-device-groups-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_device_groups.py)
[^unchecked]: Not checked.
