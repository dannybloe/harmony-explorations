# Harmony 350: behaviour

What the remote does in use. It is told here from Logitech's setup guide and from what its configurations
hold, and one thing was measured on a unit: the wait after a device is switched on.

## Device mode, without a screen

**A device key is device mode.** Press one of the four device keys, briefly for one device or for two
seconds for another, and the remote controls that device; the power key then switches the selected device
on or off[^x-manual]. There is no list to choose from, and the guide says nothing about leaving it other
than pressing Watch TV or another device key.

**A short press changes the device when the key is let go, and a long press when the key has been held
long enough**, which is how the remote tells the two apart: a key held until the firmware's hold time runs
out ends in a held event instead of a release, and a configuration binds the key's second device to that
event[^t-long-press-c][^t-long-press]. That hold is about a second in every configuration read, by the
firmware's count and the tick measured on a unit, where the guide says two[^t-long-press][^t-long-press-u][^x-manual].
**A key with one device selects nothing on a long press**: nothing binds its held event, so the remote
stays in the mode it was in. Both are read in the firmware and the configurations rather than watched on
a unit[^unchecked], [the family's memory.md](../../architectures/harmony-300-350/memory.md#a-device-key-and-its-long-press).

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
* Whether a person meets the long press after one second or two, and that a long press on a key with
  one device leaves the mode as it was. This listed what a long press does on a key with one device,
  until the firmware's hold and the configurations' device keys were read.

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 350 setup guide](https://www.logitech.com/assets/51207/harmony-350-qsg-and-iid.pdf)
[^s259]: Measured in configurations. [Section 259](../../../docs/findings.md#s259)
[^t-delay-heard]: Measured on a unit. [The test](../../../tests/test_harmony_350_delay.py)
[^t-long-press]: Read in the firmware. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-long-press-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-long-press-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_long_press.py)
[^unchecked]: Not checked.
