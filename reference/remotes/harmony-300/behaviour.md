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
receiver listening, each of the four device keys made the keys after it send that one device's codes, and
the keys a device's map leaves unbound sent nothing[^t-harmony-300-keys-u].

## Watch TV

"Turn your TV and cable/ satellite box on with a single button press", Logitech's setup
guide[^unchecked]. What the configuration holds for that key is [features.md](features.md)'s open
question.

## What the configurations say

How a send is spelled in this family's configurations, every send paired with a `0x7C` naming the same
device, is the family's, [the family's memory.md](../../architectures/harmony-300-350/memory.md#the-configuration-container).
So is the wait after a device is switched on, stated per device, [a device's power on delay](../../architectures/harmony-300-350/memory.md#a-devices-power-on-delay).
A device key selects its device as it goes down, where a Harmony 350's selects as it is let go, so on
the firmware image both run by Logitech's package, holding one longer does nothing more, [a device key and its long press](../../architectures/harmony-300-350/memory.md#a-device-key-and-its-long-press)[^t-long-press-c][^t-long-press].

## Not checked

* The 300 in use beyond its keys pressed one by one in device mode.
* What Watch TV sends.

[^unchecked]: Not checked.
[^t-harmony-300-keys-u]: Measured on a unit. [The test](../../../tests/test_harmony_300_keys.py)
[^s265]: Measured in configurations. [Section 265](../../../docs/findings.md#s265)
[^t-long-press]: Read in the firmware. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-long-press-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_long_press.py)
