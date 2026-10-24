# Harmony 300: behaviour

What the remote does in use. A device key points the whole keypad at one device, and Watch TV switches
several devices on with one press. What follows is Logitech's setup guide and what the remote's
configurations say; nothing here was watched on a remote in use.

## Device mode, without a screen

"To operate a device just click the device you want to operate and you're in control. To turn a device on
or off, click the device you want to operate and then press the power button." That is Logitech's setup
guide, "Using Your Harmony 300"[^unchecked]. So a device key is device mode, which
[how a Harmony works](../../how-a-harmony-works.md) describes, and each of the four keys holds one device:
the infrared group of the same index in the configuration[^s265], [keys.md](keys.md).

## Watch TV

"Turn your TV and cable/ satellite box on with a single button press", Logitech's setup
guide[^unchecked]. What the configuration holds for that key is [features.md](features.md)'s open
question.

## What the configurations say

How a send is spelled in this family's configurations, every send paired with a `0x7C` naming the same
device, is the family's, [the family's memory.md](../../architectures/harmony-300-350/memory.md#the-configuration-container).

## Not checked

* Anything about the 300 in use, with or without an infrared receiver.
* What Watch TV sends.

[^unchecked]: Not checked.
[^s265]: Measured in configurations. [Section 265](../../../docs/findings.md#s265)
