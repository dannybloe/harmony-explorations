# Harmony 300: behaviour

What the remote does in use. A device key points the whole keypad at one device, and Watch TV switches
several devices on with one press. What follows is Logitech's setup guide and what the remote's
configurations say, and what an infrared receiver heard as every key was pressed.

## Device mode, without a screen

"To operate a device just click the device you want to operate and you're in control. To turn a device on
or off, click the device you want to operate and then press the power button." That is Logitech's setup
guide, "Using Your Harmony 300"[^unchecked]. So a device key is device mode, which
[how a Harmony works](../../how-a-harmony-works.md) describes, and each of the four keys holds one device:
the infrared group of the same index in the configuration[^s265], [keys.md](keys.md). Pressed with a
receiver listening, each of the four device keys made the keys after it send that device's codes, or
another device's where its map sends a key there, as the DVD's map sends volume to the television; in the
television's and the set top box's maps, a key left unbound sent nothing[^t-harmony-300-keys-u].

## Watch TV

"Turn your TV and cable/ satellite box on with a single button press", Logitech's setup
guide[^unchecked]. What the configuration holds for that key is [features.md](features.md)'s open
question.

## What the configurations say

How a send is spelled in this family's configurations, every send paired with a `0x7C` naming the same
device, is the family's, [the family's memory.md](../../architectures/harmony-300-350/memory.md#the-configuration-container).
So is the wait after a device is switched on, stated per device, [a device's power on delay](../../architectures/harmony-300-350/memory.md#a-devices-power-on-delay).
In a configuration Logitech compiled for a 300, a device key selects its device as it goes down, where a
compile for a 350 selects on the release and binds a second device to a long press. That is the configuration's
choice and not the remote's: given a 350's compile the 300's device keys selected a second device on a long press,
[a device key and its long press](../../architectures/harmony-300-350/memory.md#a-device-key-and-its-long-press)[^t-long-press-c][^t-long-press][^t-harmony-300-group-4-send-u].
This said that holding one longer does nothing more<!--superseded--> on the 300, which is a property of
Logitech's compile and not of the remote.

## Not checked

* The 300 in use beyond its keys pressed one by one in device mode.
* What Watch TV sends in a configuration Logitech compiled for a 300. Given a 350's compile it started and stopped its devices as a 350 does, [the family's page](../../architectures/harmony-300-350/README.md#making-a-harmony-300-behave-as-a-harmony-350).

[^unchecked]: Not checked.
[^t-harmony-300-keys-u]: Measured on a unit. [The test](../../../tests/harmony_300_350/test_harmony_300_keys.py)
[^s265]: Measured in configurations. [Section 265](../../../docs/findings.md#s265)
[^t-long-press]: Read in the firmware. [The test](../../../tests/harmony_300_350/test_harmony_350_long_press.py)
[^t-long-press-c]: Measured in configurations. [The test](../../../tests/harmony_300_350/test_harmony_350_long_press.py)
[^t-harmony-300-group-4-send-u]: Measured on a unit. [The test](../../../tests/harmony_300_350/test_harmony_300_group_4_send.py)
