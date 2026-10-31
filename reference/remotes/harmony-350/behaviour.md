# Harmony 350: behaviour

What the remote does in use. It is told here from Logitech's setup guide and from what its configurations
hold, and some of it was measured on a unit with an infrared receiver: the wait after a device is switched
on, the long press, Watch TV and the favourite channels.

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
**Held long, each of the four keys chose its second device** on a unit holding a configuration with two
devices on every key; how long was not recorded, about two seconds being what was
asked[^t-harmony-350-setup-u]. **A key with one device selects
nothing on a long press**: nothing binds its held event, so the remote stays in the mode it was in. That
is read in the firmware and the configurations rather than watched on a unit[^unchecked],
[the family's memory.md](../../architectures/harmony-300-350/memory.md#a-device-key-and-its-long-press).

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
  A two second press is bound to the key's held event, selecting its second device[^t-long-press-c]. This
  said that was not checked until a configuration with one was read.
* One configuration compiled for a 350 sends each code three times a press: 106 of its 130 records state
  a count, and every one of them states 3[^s259].

## Measured in use

* **The wait after the power key switches a device on is in tenths of a second.** A wait of 30 held that
  device's next command 3.17 seconds and a wait of 100 held it 10.21 seconds; a command pressed long after
  went at once[^t-delay-heard]. Where the wait is stated is the family's,
  [the family's memory.md](../../architectures/harmony-300-350/memory.md#a-devices-power-on-delay).
* **In Watch TV, the wait held back that device alone.** Started from everything off it sent the
  television's power on, the receiver's arriving 0.19 seconds later although the television's wait is ten
  seconds, the set top box's toggle 0.50 seconds after that although the receiver's wait is two, and the
  receiver's input 2.54 seconds after its power code[^t-harmony-350-setup-u]. A key pressed for another
  device inside a wait was not tried[^unchecked].
* **A favourite channel goes out as the device's digits**, and nothing after them, [features.md](features.md#favourite-channels) and [keys.md](keys.md#how-each-code-is-known)[^t-harmony-350-setup-u].

## Not checked

* Anything else about the 350 in use. This said anything at all, until the power on delay was measured
  with an infrared receiver.
* Whether a person meets the long press after one second, and that a long press on a key with one device
  leaves the mode as it was. A long press of about two seconds was watched selecting the second device. This listed what a long press does on a key with one device,
  until the firmware's hold and the configurations' device keys were read.

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 350 setup guide](https://www.logitech.com/assets/51207/harmony-350-qsg-and-iid.pdf)
[^s259]: Measured in configurations. [Section 259](../../../docs/findings.md#s259)
[^t-delay-heard]: Measured on a unit. [The test](../../../tests/test_harmony_350_delay.py)
[^t-device-groups-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_device_groups.py)
[^t-long-press]: Read in the firmware. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-long-press-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-long-press-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-harmony-350-setup-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_keys.py)
[^unchecked]: Not checked.
